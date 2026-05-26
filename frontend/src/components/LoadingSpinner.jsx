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

        /* Safe fallback for touch environments to restore native device layouts */
        @media (max-width: 1023px), (pointer: coarse) {
          *, html, body, div {
            cursor: auto !important;
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

      <div className="flex flex-col items-center justify-center my-8 sm:my-12 p-4 sm:p-6 text-white select-none w-full">
        {/* Diagnostic Core Assembly */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
          
          {/* Outer Processing Ring */}
          <div className="absolute inset-0 border-2 border-dashed border-sky-500/30 rounded-full animate-rotate-slow"></div>
          
          {/* Inner Processing Ring */}
          <div className="absolute inset-1.5 sm:inset-2 border-t-2 border-l-2 border-indigo-400/50 rounded-full animate-rotate-reverse"></div>
          
          {/* Holographic Pulse Core */}
          <div className="absolute w-5 h-5 sm:w-6 sm:h-6 bg-sky-400 rounded-full shadow-[0_0_12px_#38bdf8] sm:shadow-[0_0_15px_#38bdf8] animate-pulse-core"></div>
        </div>

        {/* Loading Text */}
        <p
          className="mt-6 sm:mt-8 text-[10px] sm:text-xs font-bold tracking-[0.2em] text-sky-400 uppercase opacity-80 text-center px-4 leading-normal"
          style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}
        >
          Analyzing Data...
        </p>
      </div>
    </>
  );
}