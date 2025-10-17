import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { IoCloseCircle } from 'react-icons/io5';

export default function Input_Password({
  label,
  onChange,
  value,
  name,
  required,
  placeholder,
  className,
  password_className,
  disabled,
}) {
  const [showPassword, setShowPassword] = useState(false);

  const handleClear = () => {
    const event = {
      target: { name, value: '' },
    };
    onChange(event);
  };

  return (
    <div>
      <label>
        <span
          className={`block text-gray-600   mb-1 font-semibold ${className}`}
        >
          {label}
        </span>
      </label>
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          className={`w-full rounded-xl border border-gray-500 px-4 py-3 text-gray-700 text-base focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition ${password_className}`}
          required={required}
          onChange={onChange}
          value={value}
          name={name}
          placeholder={placeholder}
          disabled={disabled}
        />

        {/* Toggle show/hide password */}
        <span
          className="absolute top-1/2 right-10 transform -translate-y-1/2 cursor-pointer z-10"
          onClick={() => setShowPassword(!showPassword)}
          title={showPassword ? 'Hide Password' : 'Show Password'}
        >
          {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
        </span>

        {/* Clear input button */}
        {value && (
          <span
            className="absolute top-1/2 right-3 transform -translate-y-1/2 cursor-pointer z-10 text-gray-400 hover:text-gray-600"
            onClick={handleClear}
            title="Clear"
          >
            <IoCloseCircle size={20} />
          </span>
        )}
      </div>
    </div>
  );
}
