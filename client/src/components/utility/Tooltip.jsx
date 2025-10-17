import React from 'react';

export default function Tooltip({ children, text, show }) {
  // Disable tooltip on mobile screens (width < 768px)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const shouldShow = show && !isMobile;

  return (
    <div className="relative flex items-center">
      {children}
      {shouldShow && (
        <div className="absolute left-full ml-3 flex items-center z-[100]">
          {/* Arrow */}
          <div className="w-0 h-0 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-gray-800"></div>
          {/* Tooltip box */}
          <div className="px-2 py-1 bg-gray-800 text-white text-xs rounded shadow whitespace-nowrap animate-fade-in ">
            {text}
          </div>
        </div>
      )}
    </div>
  );
}
