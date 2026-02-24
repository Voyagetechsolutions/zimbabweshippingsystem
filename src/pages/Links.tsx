
import React from 'react';
import { Helmet } from 'react-helmet';
import { MessageCircle, Instagram, Facebook, Globe } from 'lucide-react';

const links = [
  {
    label: 'WhatsApp',
    href: 'https://wa.me/447584100552',
    icon: MessageCircle,
    gradient: 'from-green-500 to-green-700',
    hoverGlow: 'hover:shadow-green-500/40',
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/zimbabwe_shipping_services/',
    icon: Instagram,
    gradient: 'from-pink-500 via-purple-500 to-orange-400',
    hoverGlow: 'hover:shadow-pink-500/40',
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=61565306426707',
    icon: Facebook,
    gradient: 'from-blue-600 to-blue-800',
    hoverGlow: 'hover:shadow-blue-500/40',
  },
  {
    label: 'Website',
    href: 'https://zimbabweshipping.com/',
    icon: Globe,
    gradient: 'from-emerald-600 to-teal-700',
    hoverGlow: 'hover:shadow-emerald-500/40',
  },
];

const Links = () => {
  return (
    <>
      <Helmet>
        <title>Zimbabwe Shipping | Connect With Us</title>
        <meta
          name="description"
          content="Connect with Zimbabwe Shipping on WhatsApp, Instagram, Facebook and our website. Your trusted shipping partner from the UK to Zimbabwe."
        />
      </Helmet>

      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#0b3d2e] via-[#062a1e] to-black">
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-green-500/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-red-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        {/* Faded logo background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img
            src="/lovable-uploads/f662f2d7-317f-42a5-afdc-43dfa2d4e82c.png"
            alt=""
            className="w-[500px] h-[500px] object-contain opacity-[0.15]"
            aria-hidden="true"
          />
        </div>

        {/* Main content */}
        <div className="relative z-10 w-full max-w-md mx-auto px-4 py-12">
          <div className="backdrop-blur-sm bg-white/[0.03] border border-white/[0.06] rounded-3xl p-8 shadow-2xl">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <img
                src="/lovable-uploads/f662f2d7-317f-42a5-afdc-43dfa2d4e82c.png"
                alt="Zimbabwe Shipping"
                className="w-28 h-28 object-contain drop-shadow-2xl"
              />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-white text-center mb-2">
              Zimbabwe Shipping
            </h1>

            {/* Tagline */}
            <p className="text-sm text-gray-300 text-center mb-2 leading-relaxed">
              Your trusted shipping partner from the UK to Zimbabwe.
            </p>
            <p className="text-sm text-gray-400 text-center mb-8">
              Fast, secure, and reliable shipping services.
            </p>

            {/* Zimbabwe flag colour divider */}
            <div className="flex justify-center mb-8">
              <div className="h-1 w-12 bg-[#319a41] rounded-full mx-0.5" />
              <div className="h-1 w-12 bg-[#ffd200] rounded-full mx-0.5" />
              <div className="h-1 w-12 bg-[#de2010] rounded-full mx-0.5" />
              <div className="h-1 w-12 bg-black rounded-full mx-0.5 border border-white/20" />
            </div>

            {/* Heading */}
            <h2 className="text-lg font-semibold text-white text-center mb-5">
              Connect With Us
            </h2>

            {/* Links */}
            <div className="space-y-3">
              {links.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group flex items-center gap-3 w-full px-5 py-3.5 rounded-xl bg-gradient-to-r ${link.gradient} text-white font-medium text-base shadow-lg ${link.hoverGlow} hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0 opacity-90 group-hover:opacity-100 transition-opacity" />
                    <span className="flex-1 text-center">{link.label}</span>
                  </a>
                );
              })}
            </div>

            {/* Copyright */}
            <p className="text-xs text-gray-500 text-center mt-8">
              &copy; {new Date().getFullYear()} Zimbabwe Shipping. All rights reserved.
            </p>
            <p className="text-[10px] text-gray-600 text-center mt-2">
              Powered by Voyage Technology and Solutions
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Links;
