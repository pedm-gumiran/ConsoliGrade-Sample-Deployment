import React from 'react';

export default function Role_CheckBox({ label, id, name, checked, onChange }) {
  return (
    <div className="flex items-center">
      <input
        type="checkbox"
        id={id}
        name={name}
        checked={checked}
        onChange={onChange}
        className="form-checkbox h-5 w-5 cursor-pointer text-green-600 border-gray-300 rounded-md"
      />
      <label htmlFor={id} className="ml-2 text-gray-600">
        {label}
      </label>
    </div>
  );
}
