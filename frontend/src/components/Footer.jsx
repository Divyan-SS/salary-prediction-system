// Footer.jsx
import React from 'react';

export default function Footer() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap');

        @keyframes float-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-float-footer {
          animation: float-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
        }

        .footer-glass {
          background: rgba(10, 15, 30, 0.45);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
      `}</style>

      {/* Footer styled to match the cyber-navy gradient and glassmorphism UI */}
      <footer className="mt-16 footer-glass rounded-t-[40px] animate-float-footer text-slate-300 relative z-10 w-full">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
            
            {/* Left side - Copyright */}
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium" style={{ fontFamily: "var(--font-body, 'Manrope', sans-serif)" }}>
                © 2026 Salary Prediction System
              </span>
            </div>

            {/* Center - Attribution */}
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="font-medium" style={{ fontFamily: "var(--font-body, 'Manrope', sans-serif)" }}>
                Powered by Stack Overflow Developer Survey 2020
              </span>
            </div>

            {/* Right side - Links */}
            <div className="flex items-center gap-4" style={{ fontFamily: "var(--font-body, 'Manrope', sans-serif)" }}>
              <a
                href="#"
                className="text-xs text-slate-300 hover:text-sky-400 transition-colors duration-300 font-bold uppercase tracking-wider"
                onClick={(e) => e.preventDefault()}
              >
                Privacy
              </a>
              <span className="text-zinc-700 text-xs">•</span>
              <a
                href="#"
                className="text-xs text-slate-300 hover:text-sky-400 transition-colors duration-300 font-bold uppercase tracking-wider"
                onClick={(e) => e.preventDefault()}
              >
                Terms
              </a>
            </div>
            
          </div>
        </div>
      </footer>
    </>
  );
}