// BatchPredictPage.jsx
import { useEffect, useRef } from 'react';
import CsvUploader from '../components/CsvUploader';

// ─── Zoom-Adaptive Deep Navy Neural Matrix Background ────────
function NeuralCanvas() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, tx: 0, ty: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId;
    let particles = [];
    let speedLines = [];
    let scrollY = window.scrollY;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    resize();

    const handleMouseMove = (e) => {
      mouseRef.current.tx = e.clientX;
      mouseRef.current.ty = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const handleScroll = () => {
      scrollY = window.scrollY;
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("scroll", handleScroll);

    const N = Math.min(65, Math.floor(window.innerWidth / 20));
    for (let i = 0; i < N; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.24,
        vy: (Math.random() - 0.5) * 0.24,
        r: Math.random() * 1.4 + 0.8,
        life: Math.random() * Math.PI * 2,
        speed: 0.003 + Math.random() * 0.004,
        depth: Math.random() * 0.7 + 0.3,
      });
    }

    const lineCount = window.innerWidth < 768 ? 5 : 12;
    for (let i = 0; i < lineCount; i++) {
      speedLines.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        length: Math.random() * 80 + 40,
        speed: Math.random() * 0.4 + 0.15,
        alpha: Math.random() * 0.2 + 0.05,
      });
    }

    const CONNECT_DIST = window.innerWidth < 768 ? 120 : 170;
    const PRIMARY_HSL = "199, 100%, 65%"; 
    const ACCENT_HSL = "260, 90%, 70%";   

    const draw = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      const mouse = mouseRef.current;
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      for (let sl of speedLines) {
        sl.y -= sl.speed;
        if (sl.y < -sl.length) {
          sl.y = window.innerHeight + sl.length;
          sl.x = Math.random() * window.innerWidth;
        }
        ctx.strokeStyle = `hsla(199, 100%, 75%, ${sl.alpha})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(sl.x, sl.y);
        ctx.lineTo(sl.x, sl.y + sl.length);
        ctx.stroke();
      }

      for (let p of particles) {
        p.life += p.speed;

        let forceX = 0;
        let forceY = 0;
        if (mouse.active) {
          const dxMouse = mouse.x - p.x;
          const dyMouse = mouse.y - p.y;
          const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
          if (distMouse > 0 && distMouse < 250) {
            const pull = (1 - distMouse / 250) * 8 * p.depth;
            forceX = (dxMouse / distMouse) * pull;
            forceY = (dyMouse / distMouse) * pull;
          }
        }

        const parallaxX = (mouse.x - window.innerWidth / 2) * 0.012 * p.depth + forceX;
        const parallaxY = (mouse.y - window.innerHeight / 2) * 0.012 * p.depth - (scrollY * 0.06 * p.depth) + forceY;

        const currentX = p.x + parallaxX;
        const currentY = p.y + parallaxY;

        p.x += p.vx + Math.sin(p.life * 0.4) * 0.05;
        p.y += p.vy + Math.cos(p.life * 0.3) * 0.05;

        if (p.x < -40) p.x = window.innerWidth + 40;
        if (p.x > window.innerWidth + 40) p.x = -40;
        if (p.y < -40) p.y = window.innerHeight + 40;
        if (p.y > window.innerHeight + 40) p.y = -40;

        const edgeFadeX = Math.min(currentX, window.innerWidth - currentX) / 100;
        const edgeFadeY = Math.min(currentY, window.innerHeight - currentY) / 100;
        const boundaryAlpha = Math.max(0, Math.min(1, Math.min(edgeFadeX, edgeFadeY)));

        p.computedX = currentX;
        p.computedY = currentY;
        p.alphaFactor = boundaryAlpha;
      }

      for (let i = 0; i < particles.length; i++) {
        const pi = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const pj = particles[j];
          
          const dx = pi.computedX - pj.computedX;
          const dy = pi.computedY - pj.computedY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONNECT_DIST) {
            const proximityAlpha = 1 - dist / CONNECT_DIST;
            const combinedAlpha = proximityAlpha * 0.22 * pi.alphaFactor * pj.alphaFactor;
            
            if (combinedAlpha > 0) {
              const useAccent = (i + j) % 6 === 0;
              const hsl = useAccent ? ACCENT_HSL : PRIMARY_HSL;

              ctx.strokeStyle = `hsla(${hsl}, ${combinedAlpha})`;
              ctx.lineWidth = proximityAlpha * 0.65;
              ctx.beginPath();
              ctx.moveTo(pi.computedX, pi.computedY);
              ctx.lineTo(pj.computedX, pj.computedY);
              ctx.stroke();
            }
          }
        }
      }

      for (let p of particles) {
        if (p.alphaFactor <= 0) continue;

        const pulse = 0.75 + 0.25 * Math.sin(p.life * 1.6);
        const finalAlpha = p.alphaFactor * pulse;

        ctx.beginPath();
        ctx.arc(p.computedX, p.computedY, p.r * 2.8 * p.depth, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(199, 100%, 65%, ${0.14 * finalAlpha})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.computedX, p.computedY, p.r * p.depth, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(199, 100%, 85%, ${0.7 * finalAlpha})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", zIndex: 0, pointerEvents: "none" }}
    />
  );
}

export default function BatchPredictPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap');

        @keyframes float-in {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-float { animation: float-in 0.7s cubic-bezier(0.2, 0.9, 0.4, 1.1) both; }
        .animate-float-delay { animation: float-in 0.7s cubic-bezier(0.2, 0.9, 0.4, 1.1) 0.15s both; }
        .animate-float-delay-2 { animation: float-in 0.7s cubic-bezier(0.2, 0.9, 0.4, 1.1) 0.3s both; }

        .glass-panel {
          background: rgba(10, 15, 30, 0.45);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-b from-[#03060f] via-[#050b1a] to-[#070e24] flex flex-col items-center justify-center p-4 sm:p-6 md:p-12 font-sans overflow-x-hidden relative">
        <NeuralCanvas />

        <main className="w-full max-w-4xl mx-auto py-6 relative z-10">
          <div className="text-center mb-12">
            <h1 className="animate-float text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">Batch Salary Prediction</h1>
            <p className="animate-float-delay text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
              Upload a CSV file and get instant salary predictions for your entire team.
            </p>
          </div>

          <div className="relative flex flex-col w-full group mx-auto animate-float-delay-2">
            <div className="self-stretch rounded-[40px] z-10 overflow-hidden" style={{ border: '8px solid transparent', background: 'linear-gradient(rgba(11,18,36,0.5), rgba(11,18,36,0.5)) padding-box, linear-gradient(137deg, #10b981 0%, #7DD3FC 50%, #06B6D4 100%) border-box' }}>
              <div className="p-6 md:p-8 backdrop-blur-md">
                <CsvUploader />
              </div>
            </div>
          </div>

          <div className="animate-float-delay-2 mt-12 text-center">
            <div className="inline-flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm font-medium">
              <span className="flex items-center gap-1.5 bg-white/5 border border-white/5 backdrop-blur-sm px-4 py-2 rounded-full text-gray-300">Template: country, education, experience</span>
              <span className="text-zinc-800">•</span>
              <span className="flex items-center gap-1.5 bg-white/5 border border-white/5 backdrop-blur-sm px-4 py-2 rounded-full text-gray-300">Process up to 1000 rows</span>
              <span className="text-zinc-800">•</span>
              <span className="flex items-center gap-1.5 bg-white/5 border border-white/5 backdrop-blur-sm px-4 py-2 rounded-full text-gray-300">Download results as CSV</span>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}