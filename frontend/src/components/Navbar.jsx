// Navbar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap');

        .animate-slide-down {
          animation: slide-down 0.5s cubic-bezier(0.2, 0.9, 0.4, 1.1) both;
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .glass-nav {
          background: rgba(10, 15, 30, 0.7);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
      `}</style>

      <nav className="sticky top-0 z-50 glass-nav animate-slide-down w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between py-3 sm:py-4 gap-3 sm:gap-4">
            
            {/* Logo */}
            <Link to="/" className="group flex items-center gap-2 transition-all duration-300 hover:scale-105 select-none shrink-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-lg sm:text-xl font-bold text-white tracking-tight" style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}>
                Salary Predictor
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 w-full sm:w-auto">
              {[
                { path: '/', label: 'Home' },
                { path: '/individual', label: 'Individual' },
                { path: '/batch', label: 'Batch' },
                { path: '/explore', label: 'Explore' }
              ].map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ${
                    isActive(item.path)
                      ? 'bg-sky-500/20 text-sky-400 shadow-md ring-1 ring-sky-500/30'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white backdrop-blur-sm'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}