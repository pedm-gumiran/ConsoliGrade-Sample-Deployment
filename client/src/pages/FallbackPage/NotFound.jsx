import React from 'react';
import { Link } from 'react-router-dom';

import Button from '../../components/Buttons/Btn_NF';
import { IoMdArrowRoundBack } from 'react-icons/io';

export default function NotFound() {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen font-sans p-4 text-center ">
      <div className="flex flex-col justify-center items-center">
        <h1 className="text-[100px] text-red-600 underline sm:text-[200px] ">
          404
        </h1>
        <h2 className="text-[25px]  font-bold lg:text-[40px]">
          Oooops! The page you are looking for is not found{' '}
        </h2>
      </div>
      <Link to={'/'}>
        <Button
          className={' text-white font-bold bg-primary  '}
          label={'Go Back'}
          icon={<IoMdArrowRoundBack size={20} />}
        />
      </Link>
    </div>
  );
}
