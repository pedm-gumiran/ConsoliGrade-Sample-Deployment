import React from 'react';
import { FaSearch } from 'react-icons/fa';
import { IoCloseCircle } from 'react-icons/io5';

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  disabled,
  id,
  name = 'search', // default name
}) {
  const handleClear = () => {
    onChange({ target: { name, value: '' } });
  };

  return (
    <div className="relative flex items-center mb-4 w-full md:w-1/2 z-0">
      {/* Search icon inside container */}
      <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 " />

      {/* Input field */}
      <input
        type="text"
        id={id}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full pl-10 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-primary/70 rounded-xl border border-gray-400 z-0 text-xs sm:text-sm md:text-md"
      />

      {/* Clear button (right side) */}
      {value && !disabled && (
        <span
          className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-600"
          onClick={handleClear}
          title="Clear"
        >
          <IoCloseCircle size={20} />
        </span>
      )}
    </div>
  );
}
