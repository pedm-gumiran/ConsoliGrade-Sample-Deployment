import React from 'react';
import System_Logo from '../Logo/System_Logo';

export default function BrandingAside() {
  return (
    <aside className="md:w-1/2 bg-primary flex flex-col items-center justify-center p-8 sm:p-10 md:p-12 text-white">
      <header className="flex items-center space-x-3 mb-6">
        <System_Logo />
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
          <span className="text-white">Consoli</span>
          <span className="text-yellow-300">Grade</span>
        </h1>
      </header>
      <p className="text-center max-w-md text-sm md:text-base leading-relaxed">
        A modern
        <span className="font-semibold mr-1 ml-1">
          Grade Consolidation System
        </span>
        for Ineangan Elementary School.
      </p>
    </aside>
  );
}
