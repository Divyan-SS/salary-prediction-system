import os
import json
import logging
import threading
from datetime import datetime
from typing import Optional, List, Dict

logger = logging.getLogger(__name__)

# =========================================================
# ⚙️ CONDITIONAL REDIS IMPORT
# =========================================================
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

# =========================================================
# 📝 ABSTRACT STATE STORE INTERFACE
# =========================================================
class StateStore:
    def set(self, prediction_id: str, payload: dict, ttl_seconds: int) -> bool:
        raise NotImplementedError

    def get(self, prediction_id: str) -> Optional[dict]:
        raise NotImplementedError

    def upsert_feedback(self, prediction_id: str, feedback_data: dict) -> Optional[dict]:
        raise NotImplementedError

    def delete(self, prediction_id: str) -> bool:
        raise NotImplementedError

    def scan_expired(self) -> List[tuple[str, dict]]:
        raise NotImplementedError

    def check_feedback_exists(self, prediction_id: str) -> bool:
        payload = self.get(prediction_id)
        if not payload:
            return False
        return bool(payload.get("submitted", False))

# =========================================================
# 🧠 IN-MEMORY STATE STORE (DEFAULT)
# =========================================================
class InMemoryStateStore(StateStore):
    def __init__(self):
        self._store: Dict[str, dict] = {}
        self._lock = threading.Lock()
        logger.info("Initialized InMemoryStateStore (thread-safe, single-instance).")

    def set(self, prediction_id: str, payload: dict, ttl_seconds: int) -> bool:
        with self._lock:
            expiry = datetime.utcnow().timestamp() + ttl_seconds
            self._store[prediction_id] = {
                "payload": payload,
                "expiry": expiry
            }
            return True

    def get(self, prediction_id: str) -> Optional[dict]:
        with self._lock:
            entry = self._store.get(prediction_id)
            if not entry:
                return None
            if datetime.utcnow().timestamp() > entry["expiry"]:
                # Lazy delete
                del self._store[prediction_id]
                return None
            return entry["payload"]

    def upsert_feedback(self, prediction_id: str, feedback_data: dict) -> Optional[dict]:
        with self._lock:
            entry = self._store.get(prediction_id)
            if not entry:
                return None
            
            # Check if expired
            if datetime.utcnow().timestamp() > entry["expiry"]:
                del self._store[prediction_id]
                return None

            payload = entry["payload"]
            payload["submitted"] = True
            payload["feedback_data"] = feedback_data
            
            # Keep resolved entry in cache for 1 hour to prevent duplicates and allow edits
            entry["expiry"] = datetime.utcnow().timestamp() + 3600
            return payload

    def delete(self, prediction_id: str) -> bool:
        with self._lock:
            if prediction_id in self._store:
                del self._store[prediction_id]
                return True
            return False

    def scan_expired(self) -> List[tuple[str, dict]]:
        now = datetime.utcnow().timestamp()
        expired = []
        with self._lock:
            for prediction_id, entry in list(self._store.items()):
                if now >= entry["expiry"]:
                    payload = entry["payload"]
                    if not payload.get("submitted", False):
                        expired.append((prediction_id, payload))
                    del self._store[prediction_id]
        return expired

# =========================================================
# ⚡ REDIS STATE STORE (SCALING MODE)
# =========================================================
class RedisStateStore(StateStore):
    def __init__(self, redis_url: str):
        if not REDIS_AVAILABLE:
            raise RuntimeError("Redis library is not installed but REDIS_URL was provided.")
        self._redis = redis.Redis.from_url(redis_url, decode_responses=True)
        logger.info("Initialized RedisStateStore (process-safe, horizontally scalable).")

    def set(self, prediction_id: str, payload: dict, ttl_seconds: int) -> bool:
        try:
            self._redis.setex(prediction_id, ttl_seconds, json.dumps(payload))
            return True
        except Exception as e:
            logger.error(f"Redis set failed for {prediction_id}: {str(e)}")
            return False

    def get(self, prediction_id: str) -> Optional[dict]:
        try:
            val = self._redis.get(prediction_id)
            return json.loads(val) if val else None
        except Exception as e:
            logger.error(f"Redis get failed for {prediction_id}: {str(e)}")
            return None

    def upsert_feedback(self, prediction_id: str, feedback_data: dict) -> Optional[dict]:
        """
        Atomic check-and-set upsert using a Redis WATCH transaction.
        """
        try:
            pipe = self._redis.pipeline()
            pipe.watch(prediction_id)
            val = pipe.get(prediction_id)
            if not val:
                pipe.unwatch()
                return None
            
            payload = json.loads(val)
            payload["submitted"] = True
            payload["feedback_data"] = feedback_data
            
            # Execute transaction
            pipe.multi()
            # Set key with 1 hour (3600s) TTL to allow future edits
            pipe.setex(prediction_id, 3600, json.dumps(payload))
            pipe.execute()
            return payload
        except redis.WatchError:
            # Transaction failed due to concurrent modification (race condition)
            logger.warning(f"WatchError: concurrent modification attempt detected for {prediction_id}.")
            return None
        except Exception as e:
            logger.error(f"Redis upsert_feedback failed for {prediction_id}: {str(e)}")
            return None

    def delete(self, prediction_id: str) -> bool:
        try:
            return bool(self._redis.delete(prediction_id))
        except Exception as e:
            logger.error(f"Redis delete failed for {prediction_id}: {str(e)}")
            return False

    def scan_expired(self) -> List[tuple[str, dict]]:
        # Redis handles TTL expirations natively, so scanning is not performed
        return []

# =========================================================
# 🔌 STATE STORE DYNAMIC RESOLUTION
# =========================================================
REDIS_URL = os.getenv("REDIS_URL")

if REDIS_URL:
    if REDIS_AVAILABLE:
        try:
            state_store: StateStore = RedisStateStore(REDIS_URL)
        except Exception as e:
            logger.error(f"Failed to connect to Redis using REDIS_URL. Falling back to InMemory. Error: {str(e)}")
            state_store = InMemoryStateStore()
    else:
        logger.warning("REDIS_URL env variable is set but 'redis' library is missing. Falling back to InMemoryStateStore.")
        state_store = InMemoryStateStore()
else:
    state_store = InMemoryStateStore()
