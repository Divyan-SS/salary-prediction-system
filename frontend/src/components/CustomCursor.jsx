// frontend/src/components/CustomCursor.jsx
import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export default function CustomCursor() {
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  const springConfig = { damping: 24, stiffness: 280, mass: 0.35 };
  const trailingX = useSpring(mouseX, springConfig);
  const trailingY = useSpring(mouseY, springConfig);

  useEffect(() => {
    // Robust detection for interactive elements across the entire dashboard
    const isInteractive = (target) => {
      if (!target) return false;
      return (
        target.tagName === 'A' ||
        target.tagName === 'BUTTON' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'LABEL' ||
        target.closest('a') ||
        target.closest('button') ||
        target.closest('select') ||
        target.closest('input') ||
        target.closest('label') ||
        target.closest('[role="button"]') ||
        target.getAttribute?.('role') === 'button'
      );
    };

    const moveCursor = (e) => {
      // Reveal the cursor cleanly once actual fine pointer movement begins
      if (!isVisible) setIsVisible(true);
      
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      setIsHovered(!!isInteractive(e.target));
    };

    const handleMouseLeaveWindow = () => {
      setIsVisible(false);
    };

    const handleMouseEnterWindow = () => {
      setIsVisible(true);
    };

    // Initialize triggers only when a valid system pointer device is tracked
    window.addEventListener('mousemove', moveCursor);
    document.addEventListener('mouseleave', handleMouseLeaveWindow);
    document.addEventListener('mouseenter', handleMouseEnterWindow);

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      document.removeEventListener('mouseleave', handleMouseLeaveWindow);
      document.removeEventListener('mouseenter', handleMouseEnterWindow);
    };
  }, [mouseX, mouseY, isVisible]);

  // Ensure absolutely no markup rendering footprint occurs on non-desktop touch screens
  if (!isVisible) {
    return (
      <style>{`
        @media (max-width: 1023px), (pointer: coarse) {
          *, html, body, a, button, select, input, label {
            cursor: auto !important;
          }
          .recharts-wrapper, .recharts-surface, .recharts-wrapper *, .recharts-tooltip-wrapper, .recharts-active-dot {
            cursor: auto !important;
          }
        }
      `}</style>
    );
  }

  return (
    <div className="hidden lg:block pointer-events-none fixed inset-0 z-[9999]">
      <style>{`
        /* CRITICAL CSS FIX: Override native cursors for global custom cursor support only on fine hover viewports */
        @media (hover:hover) and (pointer:fine) {
          *, html, body, a, button, select, input, label {
            cursor: none !important;
          }
          
          /* Override Recharts inline pointer/crosshair styles globally */
          .recharts-wrapper,
          .recharts-surface,
          .recharts-wrapper *,
          .recharts-tooltip-wrapper,
          .recharts-active-dot {
            cursor: none !important;
          }
        }

        /* Safe fallback for touch screens to completely restore input fields controls natively */
        @media (max-width: 1023px), (pointer: coarse) {
          *, html, body, a, button, select, input, label {
            cursor: auto !important;
          }
          .recharts-wrapper, .recharts-surface, .recharts-wrapper *, .recharts-tooltip-wrapper, .recharts-active-dot {
            cursor: auto !important;
          }
        }

        .neon-cursor-glow {
          filter: drop-shadow(0px 0px 3px rgba(0, 162, 255, 0.9)) 
                  drop-shadow(0px 0px 10px rgba(0, 85, 255, 0.8))
                  drop-shadow(0px 0px 20px rgba(0, 85, 255, 0.4));
        }
      `}</style>

      {/* Trailing Aura */}
      <motion.div 
        className="w-12 h-12 bg-sky-500/10 rounded-full fixed top-0 left-0 -translate-x-1/2 -translate-y-1/2 filter blur-md"
        style={{ x: trailingX, y: trailingY }}
      />
      
      {/* Container for the cursor states to prevent overlap layout shifts */}
      <div className="fixed top-0 left-0 z-[10000]">
        
        {/* Arrow Cursor Variant */}
        <motion.div 
          className="fixed neon-cursor-glow"
          style={{ x: mouseX, y: mouseY, xPercent: -10, yPercent: -10 }}
          animate={{
            opacity: isHovered ? 0 : 1,
            scale: isHovered ? 0 : 1
          }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <svg width="34" height="34" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 3L27 15L15.5 16.5L13 27L5 3Z" fill="#ffffff" stroke="#00bcff" strokeWidth="2.5" strokeLinejoin="round"/>
          </svg>
        </motion.div>

        {/* Hand Cursor Variant */}
        <motion.div 
          className="fixed neon-cursor-glow"
          style={{ x: mouseX, y: mouseY, xPercent: -35, yPercent: -10 }}
          animate={{
            opacity: isHovered ? 1 : 0,
            scale: isHovered ? 1 : 0
          }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <svg width="34" height="34" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 27V14.5C11 13.4 11.9 12.5 13 12.5C14.1 12.5 15 13.4 15 14.5V12.5C15 11.4 15.9 10.5 17 10.5C18.1 10.5 19 11.4 19 12.5V11.5C19 10.4 19.9 9.5 21 9.5C22.1 9.5 23 10.4 23 11.5V13C23 11.9 23.9 11 25 11C26.1 11 27 11.9 27 13V20C27 23.9 23.9 27 20 27H11Z" fill="#ffffff" stroke="#00bcff" strokeWidth="2.5" strokeLinejoin="round"/>
            <path d="M11 16V6.5C11 4.6 12.6 3 14.5 3C16.4 3 18 4.6 18 6.5V12.5" stroke="#00bcff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
        
      </div>
    </div>
  );
}