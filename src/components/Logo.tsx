
import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

const Logo: React.FC<LogoProps> = ({ className, size = 'medium' }) => {
  const sizeClasses = {
    small: 'h-8',
    medium: 'h-12',
    large: 'h-16'
  };
  
  const heightClass = sizeClasses[size] || sizeClasses.medium;
  
  return (
    <div className={`flex items-center ${className}`}>
      <img src="/lovable-uploads/12c9c9ec-cde2-4bbb-b612-4413526287bf.png" alt="Zimbabwe Shipping" className={`${heightClass} w-auto mr-2`} />
      <div>
        <h1 className="text-xl font-bold text-zim-black">Zimbabwe Shipping</h1>
        <p className="text-xs text-zim-black/70">UK to Zimbabwe Express</p>
      </div>
    </div>
  );
};

export default Logo;
