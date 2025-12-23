'use client';

import { useState, useEffect } from 'react';

export default function ExitIntentPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    // Check if user has already seen the popup in this session
    const sessionShown = sessionStorage.getItem('exit-intent-shown');
    if (sessionShown) {
      setHasShown(true);
      return;
    }

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger if mouse leaves from the top of the viewport
      if (e.clientY <= 0 && !hasShown) {
        setIsVisible(true);
        setHasShown(true);
        sessionStorage.setItem('exit-intent-shown', 'true');
      }
    };

    // Add a small delay before activating exit intent
    const timer = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
    }, 3000); // Wait 3 seconds before activating

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [hasShown]);

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleWishlist = () => {
    window.open('https://store.steampowered.com/app/4094340/Explore_the_Universe_2175', '_blank');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in duration-300"
        onClick={handleClose}
      ></div>

      {/* Popup */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative max-w-2xl w-full bg-gradient-to-br from-deep-800 via-indigo-950 to-deep-900 rounded-2xl shadow-2xl ring-2 ring-cyan-500/50 pointer-events-auto animate-in zoom-in duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors group"
            aria-label="Close popup"
          >
            <svg
              className="w-5 h-5 text-slate-300 group-hover:text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Content */}
          <div className="p-8 md:p-12 text-center">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 ring-2 ring-cyan-400/40 flex items-center justify-center">
                <span className="text-5xl">🎮</span>
              </div>
            </div>

            {/* Headline */}
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Wait! Get the FREE demo in 3 days
              </span>
            </h2>

            {/* Description */}
            <p className="text-lg md:text-xl text-slate-200 mb-2">
              Don&apos;t miss the <strong className="text-amber-300">Christmas Demo Event</strong> on December 25th
            </p>

            <p className="text-base text-slate-300 mb-8">
              Join <strong className="text-cyan-400">1,200+</strong> commanders who won&apos;t miss launch
            </p>

            {/* Benefits */}
            <div className="grid md:grid-cols-3 gap-4 mb-8 text-sm">
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="text-2xl mb-1">🎁</div>
                <p className="text-slate-300">Founder Ship Skin</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="text-2xl mb-1">📜</div>
                <p className="text-slate-300">Credits Recognition</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="text-2xl mb-1">🚀</div>
                <p className="text-slate-300">Beta Priority Access</p>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={handleWishlist}
              className="steam-btn group inline-flex items-center gap-3 px-8 py-5 rounded-xl font-bold text-xl shadow-2xl hover:scale-105 transition-all mb-4"
            >
              <svg
                className="w-6 h-6 transition-transform group-hover:scale-110"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" />
              </svg>
              <span>One-Click Steam Wishlist</span>
            </button>

            <p className="text-xs text-slate-400">
              It&apos;s 100% free • Get instant notification on launch day
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
