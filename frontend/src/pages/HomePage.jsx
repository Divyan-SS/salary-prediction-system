// frontend/src/pages/HomePage.jsx
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
  const fadeInUpVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.25, 1, 0.5, 1] } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

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
        
        .glow-line::after {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          width: 2px;
          background: linear-gradient(to bottom, #38bdf8, #8b5cf6, transparent);
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-b from-[#03060f] via-[#050b1a] to-[#070e24] flex flex-col items-center justify-start font-sans overflow-x-hidden relative select-none">
        <NeuralCanvas />

        {/* ─── SECTION 1: HERO & CORE NAVIGATION APPS ─── */}
        <section className="min-h-screen w-full max-w-[936px] mx-auto px-4 sm:p-6 md:p-12 flex flex-col justify-center relative z-10">
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

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-50 animate-bounce">
            <span className="text-xs uppercase text-slate-400 tracking-widest font-medium">Scroll to Architecture Portfolio</span>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </section>

        {/* ─── SECTION 2: SYSTEM ARCHITECTURE GRAPHICS ─── */}
        <section className="w-full max-w-[1100px] mx-auto py-24 px-6 relative z-10 border-t border-white/5">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-150px" }} variants={fadeInUpVariants}
            className="text-center mb-16"
          >
            <h2 className="text-sm font-bold tracking-widest text-sky-400 uppercase mb-2">01 // Engineering</h2>
            <h3 className="text-3xl sm:text-5xl font-bold text-white tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              System Topologies & Architecture
            </h3>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Visual Pipeline Representation */}
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}
              className="lg:col-span-5 flex flex-col gap-4"
            >
              <motion.div variants={fadeInUpVariants} className="glass-panel p-5 rounded-2xl relative glow-line pl-6">
                <span className="text-xs text-sky-400 font-mono block mb-1">01 / FRONTEND LAYER</span>
                <h4 className="text-white font-semibold mb-1">React Client Interface</h4>
                <p className="text-xs text-slate-400">SPA engineered via Vite build optimization. Dynamic multi-view state mappings processed via React Router Context.</p>
              </motion.div>

              <motion.div variants={fadeInUpVariants} className="glass-panel p-5 rounded-2xl relative glow-line pl-6">
                <span className="text-xs text-purple-400 font-mono block mb-1">02 / ENDPOINT TRANSPORT proxy</span>
                <h4 className="text-white font-semibold mb-1">Axios Interceptors & Proxies</h4>
                <p className="text-xs text-slate-400">Decoupled routing abstraction layers bypass explicit CORS verification via automated local port matching maps.</p>
              </motion.div>

              <motion.div variants={fadeInUpVariants} className="glass-panel p-5 rounded-2xl relative glow-line pl-6">
                <span className="text-xs text-emerald-400 font-mono block mb-1">03 / BACKEND PROCESSING GATEWAY</span>
                <h4 className="text-white font-semibold mb-1">FastAPI REST Context Engine</h4>
                <p className="text-xs text-slate-400">Asynchronous processing loops handling machine learning feature parsing pipelines and background CSV operations.</p>
              </motion.div>
            </motion.div>

            {/* Micro-Documentation Detail Sheet */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
              className="lg:col-span-7 glass-panel p-8 rounded-[32px] border border-white/10 bg-slate-950/40 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 font-mono text-[80px] text-white/5 font-bold leading-none select-none">
                STACK
              </div>
              <h4 className="text-xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>Technical Stack Configurations</h4>
              <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                The application coordinates cross-platform systems configured using distributed infrastructure containers orchestrated by <strong>Docker Compose</strong>.
              </p>
              
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                  <h5 className="font-semibold text-sky-400 mb-2 uppercase">Backend Environment</h5>
                  <p className="space-y-1 text-slate-400 font-mono">
                    • Python 3.10-slim<br />
                    • Pandas & NumPy<br />
                    • Scikit-Learn Ecosystem<br />
                    • Joblib Object Bundling
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                  <h5 className="font-semibold text-emerald-400 mb-2 uppercase">Frontend Environment</h5>
                  <p className="space-y-1 text-slate-400 font-mono">
                    • React Core Components<br />
                    • Recharts Composition<br />
                    • Tailwind Engine Utilities<br />
                    • Axios HTTP Transports
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ─── SECTION 3: WORKFLOW PIPELINE INTERACTION ─── */}
        <section className="w-full max-w-[936px] mx-auto py-24 px-4 relative z-10">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-150px" }} variants={fadeInUpVariants}
            className="text-center mb-16"
          >
            <h2 className="text-sm font-bold tracking-widest text-purple-400 uppercase mb-2">02 // Data Lifecycle</h2>
            <h3 className="text-3xl sm:text-5xl font-bold text-white tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Data Pipeline & Workflows
            </h3>
          </motion.div>

          <div className="space-y-8 relative">
            <div className="absolute left-4 sm:left-1/2 top-4 bottom-4 w-px bg-white/10 -translate-x-1/2 hidden sm:block" />

            {/* Workflow Step 1 */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
              className="flex flex-col sm:flex-row items-stretch gap-6 relative"
            >
              <div className="sm:w-1/2 text-left sm:text-right sm:pr-8 flex flex-col justify-center">
                <h4 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "var(--font-display)" }}>Single-Instance Prediction Routine</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Pydantic data schemas enforce continuous constraints on user inputs. Raw configurations route into active Scikit-Learn categorical arrays, parsing categorical objects into structural mathematical evaluation matrix states.
                </p>
              </div>
              <div className="absolute left-4 sm:left-1/2 w-8 h-8 rounded-full bg-slate-900 border-2 border-sky-400 flex items-center justify-center text-xs font-bold text-sky-400 font-mono z-20 -translate-x-1/2 hidden sm:flex">1</div>
              <div className="sm:w-1/2 bg-white/5 p-6 rounded-2xl border border-white/5 flex flex-col justify-center">
                <span className="font-mono text-xs text-sky-400 block mb-1">DATA FLOW CHAIN:</span>
                <code className="text-xs text-slate-300 font-mono">Payload Ingestion ➔ clean_experience() ➔ Encoders ➔ .predict() Inference ➔ Forex Mutation Conversion</code>
              </div>
            </motion.div>

            {/* Workflow Step 2 */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
              className="flex flex-col sm:flex-row-reverse items-stretch gap-6 relative"
            >
              <div className="sm:w-1/2 text-left sm:pl-8 flex flex-col justify-center">
                <h4 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "var(--font-display)" }}>Batch CSV Ingestion Engine</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Multipart forms ingest multi-row spreadsheet values directly into transient runtime memory arrays, running strict index matches across static layout definitions: <code className="bg-white/10 px-1 rounded text-white">['Country','EdLevel','YearsCodePro']</code>.
                </p>
              </div>
              <div className="absolute left-4 sm:left-1/2 w-8 h-8 rounded-full bg-slate-900 border-2 border-purple-400 flex items-center justify-center text-xs font-bold text-purple-400 font-mono z-20 -translate-x-1/2 hidden sm:flex">2</div>
              <div className="sm:w-1/2 bg-white/5 p-6 rounded-2xl border border-white/5 flex flex-col justify-center">
                <span className="font-mono text-xs text-purple-400 block mb-1">EXCEPTION MANAGEMENT ROUTINE:</span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Rows containing formatting exceptions decouple instantly, isolated from valid rows via dedicated structural arrays to prevent processing drops.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ─── SECTION 4: USER EXECUTION MATRIX MANUAL ─── */}
        <section className="w-full max-w-[1100px] mx-auto py-24 px-6 relative z-10 border-t border-white/5">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUpVariants}
            className="text-center mb-16"
          >
            <h2 className="text-sm font-bold tracking-widest text-emerald-400 uppercase mb-2">03 // Run Operations</h2>
            <h3 className="text-3xl sm:text-5xl font-bold text-white tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Deployment Specification & Execution
            </h3>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Table Matrix Component */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
              className="lg:col-span-7 overflow-x-auto glass-panel rounded-2xl border border-white/5"
            >
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-white/5 text-slate-300 font-semibold border-b border-white/5 font-mono">
                    <th className="p-4">INTERFACE ROUTE</th>
                    <th className="p-4">INTERACTION PROCESS</th>
                    <th className="p-4">SYSTEM RESPONSE EFFECT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-400">
                  <tr>
                    <td className="p-4 font-mono font-bold text-white">/individual</td>
                    <td className="p-4">Select location targets, academic tier values, and tenure variables.</td>
                    <td className="p-4 text-xs text-sky-400">Renders live localized financial value estimates.</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-mono font-bold text-white">/batch</td>
                    <td className="p-4">Download context framework template, fill cells, drop file onto interface target.</td>
                    <td className="p-4 text-xs text-purple-400">Generates instant validation result rows or tracking flags.</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-mono font-bold text-white">/explore</td>
                    <td className="p-4">Toggle sidebar data parameters across country lists.</td>
                    <td className="p-4 text-xs text-emerald-400">Reconstructs dynamic data matrices inside Recharts loops.</td>
                  </tr>
                </tbody>
              </table>
            </motion.div>

            {/* Run Code Compilation Panel */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-5 flex flex-col gap-4 font-mono text-xs text-slate-300 w-full"
            >
              <div className="glass-panel p-5 rounded-xl border border-white/5">
                <span className="text-sky-400 block mb-2 font-bold">// INITIALIZE FASTAPI CONTAINER BACKEND</span>
                <pre className="bg-black/30 p-3 rounded-lg text-slate-400 leading-normal select-text">
cd backend{"\n"}
python -m venv venv{"\n"}
source venv/bin/activate{"\n"}
pip install -r requirements.txt{"\n"}
uvicorn app.main:app --reload
                </pre>
              </div>

              <div className="glass-panel p-5 rounded-xl border border-white/5">
                <span className="text-emerald-400 block mb-2 font-bold">// INITIALIZE VITE CLIENT APPLICATION FRONTEND</span>
                <pre className="bg-black/30 p-3 rounded-lg text-slate-400 leading-normal select-text">
cd frontend{"\n"}
npm install{"\n"}
npm run dev
                </pre>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ─── SECTION 5: FINAL SYSTEM CTA PANEL ─── */}
        <section className="w-full max-w-[936px] mx-auto py-24 text-center relative z-10 border-t border-white/5">
          <div className="relative flex flex-col justify-start items-start w-full max-w-2xl group mx-auto">
            <div className="absolute w-full h-full opacity-25 rounded-[40px] pointer-events-none" style={{ background: 'linear-gradient(137deg, #2563eb 0%, #8b5cf6 50%, #ec4899 100%)', filter: 'blur(55px)' }} />
            <div className="self-stretch rounded-[40px] z-10 overflow-hidden glass-panel">
              <div className="w-full h-full p-6 sm:p-8 md:p-10 flex flex-col items-center justify-center backdrop-blur-md">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-3" style={{ fontFamily: "var(--font-display)" }}>Ready to see your worth?</h2>
                <p className="text-slate-300 mb-6 text-xs sm:text-sm">Launch a localized prediction metric or perform batch file mapping evaluation runs immediately.</p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link to="/individual" className="px-5 sm:px-6 py-2.5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg transition">Individual Predictor</Link>
                  <Link to="/batch" className="px-5 sm:px-6 py-2.5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg transition">Batch Processor</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}