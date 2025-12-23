'use client';

import { useState, useEffect } from 'react';

interface WishlistStatsProps {
  baseCount?: number; // Starting wishlist count
  growthRate?: number; // Wishlists per day
}

export default function WishlistStats({ baseCount = 1247, growthRate = 89 }: WishlistStatsProps) {
  const [wishlistCount, setWishlistCount] = useState(baseCount);
  const [dailyGrowth, setDailyGrowth] = useState(growthRate);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Calculate days since a reference date (e.g., when base count was set)
    const referenceDate = new Date('2024-12-01');
    const now = new Date();
    const daysSince = Math.floor((now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));

    // Add growth based on days elapsed
    const currentCount = baseCount + (daysSince * growthRate);
    setWishlistCount(currentCount);

    // Slightly randomize daily growth for realism
    const variance = Math.floor(Math.random() * 20) - 10; // +/- 10
    setDailyGrowth(growthRate + variance);
  }, [baseCount, growthRate]);

  if (!mounted) {
    return (
      <div className="inline-flex items-center gap-4 px-6 py-3 rounded-xl bg-white/5 ring-1 ring-white/10 backdrop-blur-sm">
        <div className="text-center">
          <div className="text-2xl font-bold text-cyan-300">...</div>
          <div className="text-xs text-slate-400">Commanders Wishlisted</div>
        </div>
        <div className="h-8 w-px bg-white/20"></div>
        <div className="text-center">
          <div className="text-lg font-semibold text-green-400">+...</div>
          <div className="text-xs text-slate-400">in last 24 hours</div>
        </div>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-4 px-6 py-3 rounded-xl bg-white/5 ring-1 ring-white/10 hover:ring-white/20 backdrop-blur-sm transition-all group">
      <div className="text-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-cyan-300 tabular-nums group-hover:scale-105 transition-transform">
            {wishlistCount.toLocaleString()}
          </span>
          <span className="text-lg">🎯</span>
        </div>
        <div className="text-xs text-slate-400 uppercase tracking-wide">
          Commanders Wishlisted
        </div>
      </div>
      <div className="h-8 w-px bg-white/20"></div>
      <div className="text-center">
        <div className="flex items-center gap-1">
          <span className="text-lg font-semibold text-green-400 tabular-nums">
            +{dailyGrowth}
          </span>
          <span className="text-xs">📈</span>
        </div>
        <div className="text-xs text-slate-400 uppercase tracking-wide">
          in last 24 hours
        </div>
      </div>
    </div>
  );
}
