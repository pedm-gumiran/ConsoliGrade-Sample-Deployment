import React from 'react';

export default function Button({
  disabled,
  label,
  type = 'button',
  onClick,
  className = '',
  icon = null,
  title,
  isLoading = false,
  loadingText = 'Loading...',
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={`btn font-semibold py-3 px-5 rounded-xl shadow-md transition text-sm md:text-md flex items-center justify-center gap-2
        ${
          disabled || isLoading
            ? 'opacity-70 cursor-not-allowed pointer-events-none'
            : ''
        }
        ${className}`}
      title={title}
    >
      {/* Show spinner if loading */}
      {isLoading && (
        <span
          className="inline-block h-4 w-4 rounded-full border-2 border-white/60 border-t-white animate-spin"
          aria-hidden="true"
        />
      )}

      {/* Optional icon (only show when not loading) */}
      {!isLoading && icon && <span className="flex items-center">{icon}</span>}

      {/*  Change text depending on loading state */}
      <span>{isLoading ? loadingText : label}</span>
    </button>
  );
}
