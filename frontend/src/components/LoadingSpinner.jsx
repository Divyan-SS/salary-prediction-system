import React from 'react';

export default function LoadingSpinner() {
  return (
    <>
      <style>{`
        /* CRITICAL CSS FIX: Override native cursor while loading */
        @media (hover:hover) and (pointer:fine) {
          *, html, body, div {
            cursor: none !important;
          }
        }

        @keyframes rotate-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes rotate-reverse {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes pulse-core {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.1); }
        }

        .animate-rotate-slow { animation: rotate-slow 4s linear infinite; }
        .animate-rotate-reverse { animation: rotate-reverse 3s linear infinite; }
        .animate-pulse-core { animation: pulse-core 2s ease-in-out infinite; }
      `}</style>

      <div className="flex flex-col items-center justify-center my-12 p-6 text-white select-none">
        {/* Diagnostic Core Assembly */}
        <div className="relative w-20 h-20 flex items-center justify-center">
          
          {/* Outer Processing Ring */}
          <div className="absolute inset-0 border-2 border-dashed border-sky-500/30 rounded-full animate-rotate-slow"></div>
          
          {/* Inner Processing Ring */}
          <div className="absolute inset-2 border-t-2 border-l-2 border-indigo-400/50 rounded-full animate-rotate-reverse"></div>
          
          {/* Holographic Pulse Core */}
          <div className="absolute w-6 h-6 bg-sky-400 rounded-full shadow-[0_0_15px_#38bdf8] animate-pulse-core"></div>
        </div>

        {/* Loading Text */}
        <p
          className="mt-8 text-xs font-bold tracking-[0.2em] text-sky-400 uppercase opacity-80"
          style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
        >
          Analyzing Data...
        </p>
      </div>
    </>
  );
}