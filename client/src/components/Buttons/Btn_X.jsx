import React from 'react';
import { IoClose } from 'react-icons/io5';

export default function Btn_X({onClick,className}) {
  return (
    <button onClick={onClick} className={`text-gray-500 hover:text-gray-800  hover:cursor-pointer ${className}`}>
      <IoClose size={24} />
    </button>
  );
}
