// HomePage.jsx
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

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

// ─── Main Content Component ──────────────────────────────────────────────────
export default function HomePage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap');

        :root {
          --font-display: 'Space Grotesk', sans-serif;
          --font-body: 'Manrope', sans-serif;
        }

        @keyframes float-in {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-float {
          animation: float-in 0.7s cubic-bezier(0.2, 0.9, 0.4, 1.1) both;
        }
        .animate-float-delay {
          animation: float-in 0.7s 0.15s both;
        }
        .animate-float-delay-2 {
          animation: float-in 0.7s 0.3s both;
        }

        .glass-panel {
          background: rgba(10, 15, 30, 0.45);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
        }

        .card-hover {
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        @media (pointer: fine) {
          .card-hover:hover {
            transform: translateY(-6px) scale(1.015);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85);
          }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-b from-[#03060f] via-[#050b1a] to-[#070e24] flex flex-col items-center justify-center p-4 sm:p-6 md:p-12 font-sans overflow-x-hidden relative">
        <NeuralCanvas />

        <main className="w-full max-w-[936px] mx-auto py-12 md:py-20 relative z-10">
          
          <div className="text-center max-w-3xl mx-auto">
            <div className="animate-float inline-flex items-center gap-2 bg-sky-500/10 backdrop-blur-md rounded-full px-5 py-2 border border-sky-500/20 shadow-sm mb-6">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-400"></span>
              </span>
              <span className="text-sm font-semibold text-sky-400 tracking-wide">
                Predict. Analyze. Grow.
              </span>
            </div>
            
            <h1 className="animate-float text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-5" style={{ fontFamily: "var(--font-display)", lineHeight: 1.2 }}>
              Salary intelligence at your fingertips
            </h1>
            
            <p className="animate-float-delay text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Get individual estimates, process bulk records, or explore market trends – all powered by real salary data.
            </p>
          </div>

          <div className="mt-12 sm:mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-3 lg:gap-3 w-full">
            
            <Link to="/individual" className="block w-full max-w-[280px] md:max-w-[300px] mx-auto">
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }} className="relative flex flex-col justify-start items-start w-full group">
                <div className="absolute w-full h-[260px] md:h-[300px] opacity-35 rounded-[40px] pointer-events-none" style={{ background: 'linear-gradient(137deg, #FF3D77 0%, #FFB1CE 45%, #FF9D3C 100%)', filter: 'blur(45px)' }} />
                <div className="self-stretch h-[260px] md:h-[300px] rounded-[40px] z-10 overflow-hidden card-hover" style={{ border: '8px solid transparent', background: 'linear-gradient(rgba(11,18,36,0.5), rgba(11,18,36,0.5)) padding-box, linear-gradient(137deg, #FF3D77 0%, #FFB1CE 45%, #FF9D3C 100%) border-box' }}>
                  <div className="w-full h-full p-6 flex flex-col justify-center gap-4 items-center text-center backdrop-blur-md">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-md">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-xl mb-2 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Individual</h3>
                      <p className="text-slate-300 text-[13px] leading-[1.5] font-normal px-1">Enter your profile – country, education, experience – and get a personalized salary forecast.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Link>

            <Link to="/batch" className="block w-full max-w-[280px] md:max-w-[300px] mx-auto">
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }} className="relative flex flex-col justify-start items-start w-full group">
                <div className="absolute w-full h-[260px] md:h-[300px] opacity-35 rounded-[40px] pointer-events-none" style={{ background: 'linear-gradient(137deg, #FFFFFF 0%, #7DD3FC 45%, #06B6D4 100%)', filter: 'blur(45px)' }} />
                <div className="self-stretch h-[260px] md:h-[300px] rounded-[40px] z-10 overflow-hidden card-hover" style={{ border: '8px solid transparent', background: 'linear-gradient(rgba(11,18,36,0.5), rgba(11,18,36,0.5)) padding-box, linear-gradient(137deg, #FFFFFF 0%, #7DD3FC 45%, #06B6D4 100%) border-box' }}>
                  <div className="w-full h-full p-6 flex flex-col justify-center gap-4 items-center text-center backdrop-blur-md">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h8M12 8v8" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-xl mb-2 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Batch</h3>
                      <p className="text-slate-300 text-[13px] leading-[1.5] font-normal px-1">Upload a CSV file and predict salaries for hundreds of rows at once. Fast and reliable.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Link>

            <Link to="/explore" className="block w-full max-w-[280px] md:max-w-[300px] mx-auto">
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }} className="relative flex flex-col justify-start items-start w-full group">
                <div className="absolute w-full h-[260px] md:h-[300px] opacity-35 rounded-[40px] pointer-events-none" style={{ background: 'linear-gradient(137deg, #4361EE 0%, #E0AEFF 45%, #F72585 100%)', filter: 'blur(45px)' }} />
                <div className="self-stretch h-[260px] md:h-[300px] rounded-[40px] z-10 overflow-hidden card-hover" style={{ border: '8px solid transparent', background: 'linear-gradient(rgba(11,18,36,0.5), rgba(11,18,36,0.5)) padding-box, linear-gradient(137deg, #4361EE 0%, #E0AEFF 45%, #F72585 100%) border-box' }}>
                  <div className="w-full h-full p-6 flex flex-col justify-center gap-4 items-center text-center backdrop-blur-md">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-xl mb-2 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Explore</h3>
                      <p className="text-gray-300 text-[13px] leading-[1.5] font-normal px-1">Dive into interactive charts, filter by country, education, experience – find insights.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Link>

          </div>

          <div className="mt-16 sm:mt-24 text-center">
            <div className="relative flex flex-col justify-start items-start w-full max-w-2xl group mx-auto">
              <div className="absolute w-full h-full opacity-25 rounded-[40px] pointer-events-none" style={{ background: 'linear-gradient(137deg, #2563eb 0%, #8b5cf6 50%, #ec4899 100%)', filter: 'blur(55px)' }} />
              <div className="self-stretch rounded-[40px] z-10 overflow-hidden glass-panel">
                <div className="w-full h-full p-6 sm:p-8 md:p-10 flex flex-col items-center justify-center backdrop-blur-md">
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-3" style={{ fontFamily: "var(--font-display)" }}>Ready to see your worth?</h2>
                  <p className="text-slate-300 mb-6 text-xs sm:text-sm">Start with a single prediction or upload your team data configuration.</p>
                  <div className="flex flex-wrap justify-center gap-4">
                    <Link to="/individual" className="px-5 sm:px-6 py-2.5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg transition">Individual</Link>
                    <Link to="/batch" className="px-5 sm:px-6 py-2.5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg transition">Batch</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}