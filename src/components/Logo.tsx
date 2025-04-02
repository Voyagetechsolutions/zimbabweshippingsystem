
import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <img src="/lovable-uploads/12c9c9ec-cde2-4bbb-b612-4413526287bf.png" alt="Zimbabwe Shipping" className="h-12 w-auto mr-2" />
      <div>
        <h1 className="text-xl font-bold text-zim-black">Zimbabwe Shipping</h1>
        <p className="text-xs text-zim-black/70">UK to Zimbabwe Express</p>
      </div>
    </div>
  );
};

export default Logo;
