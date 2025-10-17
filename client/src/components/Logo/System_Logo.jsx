import React from 'react';
import Logo from '/CG_Logo.svg';

export default function System_Logo({ size = 40 }) {
  return (
    <img
      src={Logo}
      alt="System Logo"
      style={{ width: size, height: size }}
      className="rounded-full border border-white shadow-md object-cover"
    />
  );
}
