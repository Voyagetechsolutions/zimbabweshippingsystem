import React, { useEffect, useState } from 'react';
import { MessageSquare, Sparkles, X } from 'lucide-react';

const ZimmyAnnouncement: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = window.setTimeout(() => setVisible(true), 700);
    const hideWhenChatOpens = () => setVisible(false);

    window.addEventListener('zimmy:opened', hideWhenChatOpens);

    return () => {
      window.clearTimeout(showTimer);
      window.removeEventListener('zimmy:opened', hideWhenChatOpens);
    };
  }, []);

  if (!visible) return null;

  const openZimmy = () => {
    setVisible(false);
    window.dispatchEvent(new Event('zimmy:open'));
  };

  return (
    <aside
      role="region"
      aria-labelledby="zimmy-announcement-title"
      className="fixed bottom-24 left-4 right-4 z-[70] overflow-hidden rounded-2xl border border-zim-green/30 bg-background shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 sm:left-auto sm:right-6 sm:w-[420px]"
    >
      <div className="flex h-1">
        <div className="w-1/3 bg-zim-green" />
        <div className="w-1/3 bg-zim-yellow" />
        <div className="w-1/3 bg-zim-red" />
      </div>

      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Dismiss Zimmy announcement"
        className="absolute right-3 top-4 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="p-5 pr-11">
        <div className="flex items-start gap-4">
          <div className="relative flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-zim-green text-white shadow-lg shadow-zim-green/20">
            <MessageSquare className="h-6 w-6" />
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-zim-yellow text-ink">
              <Sparkles className="h-3 w-3" />
            </span>
          </div>

          <div>
            <span className="inline-flex rounded-full bg-zim-green/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zim-green">
              New AI assistant
            </span>
            <h2 id="zimmy-announcement-title" className="mt-1.5 font-display text-xl font-bold text-foreground">
              Meet Zimmy
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Get instant help with prices, collections, bookings and shipment tracking — any time of day.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openZimmy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-zim-green px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-zim-green-dark focus:outline-none focus:ring-2 focus:ring-zim-green/40 focus:ring-offset-2"
        >
          <MessageSquare className="h-4 w-4" />
          Chat with Zimmy
        </button>
      </div>
    </aside>
  );
};

export default ZimmyAnnouncement;
