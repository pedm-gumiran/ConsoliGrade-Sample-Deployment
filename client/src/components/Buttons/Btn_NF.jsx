import React from 'react';
import { Link } from 'react-router-dom';

export default function Button({
  label,
  icon,
  onClick,
  className = '',
  to,
  state,
  type = 'button',
}) {
  const design = `flex justify-center items-center p-3 px-5 rounded-lg shadow-md gap-2
     btn btn-primary transition duration-200
     ${className}`;

  if (to) {
    return (
      <Link to={to} state={state} className={design}>
        {icon && <span className="text-lg">{icon}</span>}
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={design}>
      {icon && <span className="text-lg">{icon}</span>}
      <span>{label}</span>
    </button>
  );
}
