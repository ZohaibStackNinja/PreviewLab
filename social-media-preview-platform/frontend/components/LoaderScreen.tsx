import React from 'react';
import Image from 'next/image';

export function LoaderScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F7F9FA] relative">
      <div className="flex flex-col items-center">
        {/* Logo */}
        <Image
          src="/logo.png"
          alt="Practiscale Preview Lab"
          width={48}
          height={48}
          className="rounded-[10px] object-cover mb-3 shadow-sm border border-gray-100"
          priority
        />

        {/* Brand Name */}
        <h1 className="text-[22px] font-bold text-[#1A1E23] tracking-tight">
          Practiscale Preview Lab
        </h1>

        {/* Progress bar container */}
        <div className="w-40 h-1 bg-gray-200 rounded-full mt-4 overflow-hidden relative">
          {/* Progress bar inner */}
          <div className="h-full bg-[#0abab5] rounded-full absolute top-0 left-0 animate-progress"></div>
          <div className="animate-loader-bar"></div>
        </div>
      </div>

      {/* Footer Text */}
      <div className="absolute bottom-8 text-[11px] text-[#A0AAB4] font-medium tracking-wide">
        Social Media Preview Platform
      </div>
    </div>
  );
}
