
import React from 'react';
import { Phone } from 'lucide-react';

const WhatsAppButton: React.FC = () => {
  const openWhatsApp = () => {
    window.open('https://wa.me/447584100552', '_blank');
  };

  return (
    <button
      onClick={openWhatsApp}
      className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-green-500 rounded-full shadow-lg flex items-center justify-center hover:bg-green-600 transition-all hover:scale-110 focus:outline-none"
      aria-label="Contact on WhatsApp"
    >
      <Phone className="h-8 w-8 text-white" />
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
    </button>
  );
};

export default WhatsAppButton;
