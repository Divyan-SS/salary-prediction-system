// frontend/src/pages/FeedbackPage.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { submitFeedback, getFeedbackStatus } from "../services/api";
import toast from "react-hot-toast";

export default function FeedbackPage() {
  const navigate = useNavigate();
  const [prediction, setPrediction] = useState(null);
  const [isLiked, setIsLiked] = useState(null);
  const [dislikeReason, setDislikeReason] = useState("");
  const [textExplanation, setTextExplanation] = useState("");
  const [improvementSuggestion, setImprovementSuggestion] = useState("");
  
  const [submitted, setSubmitted] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Google Sign-In States
  const [googleIdToken, setGoogleIdToken] = useState(() => sessionStorage.getItem("google_id_token") || "");
  const [googleUser, setGoogleUser] = useState(() => {
    const stored = sessionStorage.getItem("google_user");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return null;
      }
    }
    return null;
  });


  // Dynamic Google Sign-In script injection and initialization
  useEffect(() => {
    // 1. Load recent prediction context
    const cachedPrediction = sessionStorage.getItem("recent_prediction");
    let predObj = null;
    if (cachedPrediction) {
      try {
        predObj = JSON.parse(cachedPrediction);
        setPrediction(predObj);
      } catch (e) {
        console.error("Failed to parse recent prediction:", e);
      }
    }

    // 2. Fetch feedback status from backend
    if (predObj && predObj.prediction_id) {
      setLoading(true);
      getFeedbackStatus(predObj.prediction_id)
        .then((res) => {
          if (res.data.submitted) {
            setSubmitted(true);
          }
        })
        .catch((err) => {
          console.error("Failed to check status:", err);
          if (err.response?.status === 404) {
            setError("Session expired. Please make a new prediction.");
          }
        })
        .finally(() => {
          setLoading(false);
        });
    }

    // 3. Inject Google Identity Services client script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: "915588928767-4eo0tmb54oh7h85uu2but1u9fktfmiqq.apps.googleusercontent.com",
          callback: handleCredentialResponse
        });
        
        // Render Google Sign-in button if container exists
        const btnContainer = document.getElementById("google-signin-btn");
        if (btnContainer) {
          window.google.accounts.id.renderButton(btnContainer, {
            theme: "outline",
            size: "large",
            text: "continue_with"
          });
        }
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [submitted]); // Re-initialize button if submitted state changes and returns to form

  // Re-render Google button if googleUser state changes (but token isn't verified yet)
  useEffect(() => {
    if (!googleUser && !submitted && !justSubmitted && window.google) {
      const btnContainer = document.getElementById("google-signin-btn");
      if (btnContainer) {
        window.google.accounts.id.renderButton(btnContainer, {
          theme: "outline",
          size: "large",
          text: "continue_with"
        });
      }
    }
  }, [googleUser, submitted, justSubmitted]);

  // Decode JWT ID Token client-side to display display name & email
  const handleCredentialResponse = (response) => {
    const token = response.credential;
    setGoogleIdToken(token);
    sessionStorage.setItem("google_id_token", token);

    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      const decoded = JSON.parse(jsonPayload);
      const userObj = {
        name: decoded.name,
        email: decoded.email
      };
      setGoogleUser(userObj);
      sessionStorage.setItem("google_user", JSON.stringify(userObj));
      toast.success("Authenticated with Google successfully!");
    } catch (e) {
      console.error("Google ID Token decoding error:", e);
      toast.error("Failed to read user authentication details.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (isLiked === null) {
      setError("Please select 👍 (Looks Right) or 👎 (Seems Wrong).");
      return;
    }

    if (!googleIdToken) {
      setError("Please sign in with Google to submit feedback.");
      const btnElement = document.getElementById("google-signin-btn");
      if (btnElement) {
        btnElement.scrollIntoView({ behavior: "smooth", block: "center" });
        btnElement.classList.add("ring-2", "ring-amber-500", "ring-offset-2", "ring-offset-[#070B19]", "rounded-lg", "transition-all");
        setTimeout(() => {
          btnElement.classList.remove("ring-2", "ring-amber-500", "ring-offset-2", "ring-offset-[#070B19]", "rounded-lg", "transition-all");
        }, 3000);
      }
      return;
    }

    setLoading(true);

    try {
      let payload;
      if (prediction) {
        payload = {
          prediction_id: prediction.prediction_id || null,
          country: prediction.country || "United States",
          education: prediction.education || "Postgraduate",
          experience: prediction.experience !== undefined ? prediction.experience : 5.0,
          predicted_salary_usd: prediction.predicted_salary_usd || prediction.predicted_salary || 0.0,
          is_liked: isLiked,
          dislike_reason: null,
          text_explanation: textExplanation.trim() || null,
          improvement_suggestion: improvementSuggestion.trim() || null,
          google_id_token: googleIdToken
        };
      } else {
        // General App Feedback Fallback
        payload = {
          prediction_id: "general-app-feedback",
          country: "General",
          education: "General",
          experience: 0.0,
          predicted_salary_usd: 0.0,
          is_liked: isLiked,
          dislike_reason: null,
          text_explanation: textExplanation.trim() || null,
          improvement_suggestion: improvementSuggestion.trim() || null,
          google_id_token: googleIdToken
        };
      }

      await submitFeedback(payload);
      
      setSubmitted(true);
      setJustSubmitted(true);
      toast.success("Thank you for your feedback!");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to submit feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency) => {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: currency }).format(amount);
    } catch (e) {
      return `${currency} ${amount.toLocaleString()}`;
    }
  };

  return (
    <div className="min-h-screen bg-[#070B19] text-white py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex flex-col justify-center items-center">
      {/* Background Orbs */}
      <div className="absolute w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] opacity-20 bg-sky-500 rounded-full blur-[100px] -top-20 -left-20 pointer-events-none" />
      <div className="absolute w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] opacity-10 bg-indigo-500 rounded-full blur-[120px] -bottom-20 -right-20 pointer-events-none" />

      <div className="w-full max-w-2xl z-10 space-y-8 animate-fade-slide">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-sky-400 to-indigo-500 bg-clip-text text-transparent" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            User Feedback
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Your thoughts help us refine our salary estimator and make predictions better for everyone.
          </p>
        </div>

        {error && error.includes("Session expired") ? (
          <div className="bg-zinc-900/60 border border-red-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl backdrop-blur-xl animate-fade-slide">
            <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Session Expired
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Please make a new prediction to submit feedback.
              </p>
            </div>
            <div className="flex justify-center">
              <Link
                to="/"
                className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold px-6 py-3 rounded-2xl transition-all shadow-md select-none text-xs sm:text-sm flex items-center justify-center active:scale-[0.99]"
              >
                Make Another Prediction
              </Link>
            </div>
          </div>
        ) : justSubmitted ? (
          <div className="bg-zinc-900/60 border border-emerald-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl backdrop-blur-xl animate-fade-slide">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Feedback Submitted Successfully!
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Thank you for helping us improve our prediction models. We appreciate your time!
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => setJustSubmitted(false)}
                className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold px-6 py-3 rounded-2xl transition-all shadow-md select-none text-xs sm:text-sm active:scale-[0.99]"
              >
                View Status
              </button>
              <Link
                to="/"
                className="bg-zinc-800 hover:bg-zinc-700 text-slate-300 font-bold px-6 py-3 rounded-2xl transition-all select-none text-xs sm:text-sm flex items-center justify-center border border-zinc-700/60 active:scale-[0.99]"
              >
                Make Another Prediction
              </Link>
            </div>
          </div>
        ) : submitted ? (
          <div className="bg-zinc-900/60 border border-indigo-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl backdrop-blur-xl animate-fade-slide">
            <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/10">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                You have already submitted feedback for this prediction.
              </h2>
              <p className="text-xs sm:text-sm text-sky-300 bg-sky-500/10 border border-sky-500/20 rounded-xl p-3 inline-block font-medium">
                💡 To submit feedback on a new result, please run another salary prediction calculation.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/"
                className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold px-6 py-3 rounded-2xl transition-all shadow-md select-none text-xs sm:text-sm flex items-center justify-center active:scale-[0.99]"
              >
                Make Another Prediction
              </Link>
              <Link
                to="/"
                className="bg-zinc-800 hover:bg-zinc-700 text-slate-300 font-bold px-6 py-3 rounded-2xl transition-all select-none text-xs sm:text-sm flex items-center justify-center border border-zinc-700/60 active:scale-[0.99]"
              >
                Back Home
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900/45 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl">
            
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* 1. Rate the Application / Result */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">Rate the Application / Result</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setIsLiked(true); setError(""); }}
                    className={`flex-1 py-3 sm:py-3.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all flex items-center justify-center gap-2 select-none active:scale-[0.99] ${
                      isLiked === true 
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/5' 
                        : 'bg-zinc-950/40 border-zinc-800/80 text-slate-400 hover:bg-zinc-800/20'
                    }`}
                  >
                    👍 Yes, Looks Right
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsLiked(false); setError(""); }}
                    className={`flex-1 py-3 sm:py-3.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all flex items-center justify-center gap-2 select-none active:scale-[0.99] ${
                      isLiked === false 
                        ? 'bg-red-500/20 border-red-500 text-red-400 shadow-lg shadow-red-500/5' 
                        : 'bg-zinc-950/40 border-zinc-800/80 text-slate-400 hover:bg-zinc-800/20'
                    }`}
                  >
                    👎 No, Seems Wrong
                  </button>
                </div>
              </div>

              {/* 2. Active Prediction Context */}
              {prediction ? (
                <div className="bg-zinc-950/40 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2.5">
                    <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">Active Prediction Context</span>
                    <span className="text-[10px] text-slate-500 font-mono">ID: {prediction.prediction_id ? `${prediction.prediction_id.slice(0, 8)}...` : "N/A"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Country</span>
                      <span className="font-semibold text-white">{prediction.country}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Education</span>
                      <span className="font-semibold text-white">{prediction.education}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Experience</span>
                      <span className="font-semibold text-white">{prediction.experience} Years</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Predicted Salary</span>
                      <span className="font-semibold text-emerald-400 font-mono">
                        {formatCurrency(prediction.predicted_salary, prediction.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-950/30 border border-dashed border-zinc-800 rounded-2xl p-4 text-center">
                  <p className="text-xs text-slate-400">
                    No recent prediction session found. You are submitting **General App Feedback**.
                  </p>
                  <Link to="/" className="text-xs text-sky-400 hover:text-sky-300 font-semibold underline mt-1.5 inline-block">
                    Run a salary prediction first →
                  </Link>
                </div>
              )}

              {/* Explanations & Suggestions */}
              {isLiked !== null && (
                <div className="space-y-4 animate-fade-slide">
                  {/* 3. Explain Details (Optional) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">Explain details (Optional)</label>
                    <textarea
                      value={textExplanation}
                      onChange={(e) => setTextExplanation(e.target.value)}
                      rows={3}
                      placeholder={isLiked ? "Tell us what you liked about the estimate or share any comments..." : "Help us understand what looked incorrect..."}
                      className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500 transition"
                    />
                  </div>

                  {/* 4. Improvement Suggestions (Optional) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">Improvement suggestions (Optional)</label>
                    <textarea
                      value={improvementSuggestion}
                      onChange={(e) => setImprovementSuggestion(e.target.value)}
                      rows={3}
                      placeholder="Share your suggestions to improve predictions or overall experience"
                      className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500 transition"
                    />
                  </div>
                </div>
              )}

              {/* Google Sign-In & verified user metadata card */}
              <div className="border-t border-zinc-800/80 pt-4 space-y-4 animate-fade-slide">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">Verified Identity</label>
                </div>
                
                {googleUser ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4 text-left space-y-1.5 animate-fade-slide">
                    <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Identity Details</div>
                    <div className="text-xs sm:text-sm text-slate-300">Name: <span className="font-semibold text-white">{googleUser.name}</span></div>
                    <div className="text-xs sm:text-sm text-slate-300">Email: <span className="font-semibold text-white">{googleUser.email}</span></div>
                    <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-1.5 select-none">
                      ✓ Verified by Google
                    </div>
                  </div>
                ) : (
                  <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-5 text-center space-y-4">
                    <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 leading-relaxed max-w-sm mx-auto font-bold">
                      ⚠️ Google Sign-In is required to verify your email address for communication and feedback records only. We do not store passwords or Google credentials.
                    </p>
                    <div className="flex justify-center" id="google-signin-btn"></div>
                  </div>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading || isLiked === null}
                className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold py-3 sm:py-3.5 text-xs sm:text-sm rounded-xl transition-all shadow-md disabled:opacity-40 select-none active:scale-[0.99]"
              >
                {loading ? "Submitting Feedback..." : "Submit Feedback"}
              </button>

              {error && !error.includes("Session expired") && (
                <div className="text-red-400 text-xs bg-red-950/30 border border-red-900/40 rounded-xl p-3 animate-fade-slide">
                  ⚠️ {error}
                </div>
              )}
            </form>
          </div>
        )}
      </div>

      {/* Footer Details */}
      <div className="mt-8 text-center text-[10px] text-slate-500 z-10">
        Salary Prediction Feedback Engine v1.1.0 • Secure HTTPS API Delivery
      </div>
    </div>
  );
}
