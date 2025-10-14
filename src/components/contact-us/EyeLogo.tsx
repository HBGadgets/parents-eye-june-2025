'use client';
import React from 'react';

const EyeLogo = () => (
  <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0">
    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-200 via-orange-200 to-yellow-300 animate-pulse"></div>
    <div className="absolute inset-1 rounded-full bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200"></div>
    <div className="absolute inset-2 rounded-full bg-gradient-to-br from-green-200 via-cyan-200 to-blue-200"></div>
    <div className="absolute inset-3 rounded-full bg-black"></div>
    <div className="absolute inset-4 rounded-full bg-gradient-to-br from-yellow-100 to-orange-200"></div>
  </div>
);

export default EyeLogo;
