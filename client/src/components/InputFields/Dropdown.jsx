import React, { useState } from 'react';
import { HiChevronDown, HiChevronUp } from 'react-icons/hi';

export default function Dropdown({
  value,
  onChange,
  name,
  className = '',
  options = [],
  placeholder,
  label,
  disabled,
  required,
  loading = false, // 👈 add loading prop
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative w-full">
      {label && (
        <label className="label text-lg text-gray-600 font-semibold">
          <span className="label-text">{label}</span>
        </label>
      )}
      <div className="relative">
        <select
          name={name}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onClick={() => setIsFocused(true)}
          disabled={disabled || loading} // disable when loading
          required={required}
          className={`appearance-none text-sm input border border-gray-500  bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition w-full h-12 rounded-xl px-4 py-3 ${className} cursor-pointer`}
        >
          {loading ? (
            <option value="" disabled>
              Loading...
            </option>
          ) : (
            <>
              <option value="" disabled>
                {placeholder}
              </option>
              {options.map((opt) =>
                typeof opt === 'string' ? (
                  <option key={opt} value={opt} className="text-xs">
                    {opt}
                  </option>
                ) : (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ),
              )}
            </>
          )}
        </select>

        {/* Icon that changes on focus */}
        <span className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-xl text-gray-600 transition-transform duration-500 z-10">
          {isFocused ? <HiChevronUp /> : <HiChevronDown />}
        </span>
      </div>
    </div>
  );
}
