'use client';

import { useState, useEffect } from 'react';

/* MIGRATION STUB - needs API route migration */
const supabase: any = {
  from: () => ({
    select: () => ({ 
      eq: () => Promise.resolve({ data: [], error: null }),
      single: () => Promise.resolve({ data: null, error: null }),
      order: () => ({ limit: () => Promise.resolve({ data: [] }) })
    }),
    insert: () => Promise.resolve({ error: { message: 'Not migrated' } }),
    update: () => ({ eq: () => Promise.resolve({ error: { message: 'Not migrated' } }) })
  }),
  removeChannel: () => {},
  channel: () => ({ on: () => ({ subscribe: () => {} }) })
};


interface FOMOCounterProps {
  maxFounderSkins?: number; // Maximum number of founder skins available
  showProgressBar?: boolean;
}

export default function FOMOCounter({
  maxFounderSkins = 500,
  showProgressBar = true
}: FOMOCounterProps) {
  const [signupCount, setSignupCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch total signup count
    async function fetchSignupCount() {
      try {
        // Get total count of profiles
        const { count: totalCount, error: totalError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (totalError) {
          console.error('Error fetching signup count:', totalError);
          // Set a default value on error
          setSignupCount(0);
          setLoading(false);
          return;
        }

        setSignupCount(totalCount || 0);
        setLoading(false);
      } catch (error) {
        console.error('Error in fetchSignupCount:', error);
        setSignupCount(0);
        setLoading(false);
      }
    }

    fetchSignupCount();

    // Set up real-time subscription to profiles table
    const channel = supabase
      .channel('fomo-counter-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          // When a new signup happens, increment the count
          setSignupCount(prev => prev + 1);
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const remaining = Math.max(maxFounderSkins - signupCount, 0);
  const percentageClaimed = Math.min((signupCount / maxFounderSkins) * 100, 100);
  const isAlmostGone = percentageClaimed >= 80;
  const isHalfGone = percentageClaimed >= 50;

  if (loading) {
    return (
      <div className="w-full max-w-xl mx-auto">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-500/10 border-2 border-amber-500/30 p-6 backdrop-blur-sm">
          <div className="animate-pulse">
            <div className="h-6 bg-white/10 rounded w-3/4 mb-3"></div>
            <div className="h-4 bg-white/10 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${
        isAlmostGone
          ? 'from-red-500/20 via-orange-500/15 to-amber-500/10 border-red-500/50'
          : isHalfGone
          ? 'from-amber-500/15 via-orange-500/10 to-red-500/5 border-amber-500/40'
          : 'from-amber-500/10 via-orange-500/5 to-red-500/5 border-amber-500/30'
      } border-2 p-6 backdrop-blur-sm transition-all duration-500 group hover:scale-[1.02] shadow-[0_0_30px_rgba(245,158,11,0.2)]`}>

        {/* Animated background glow */}
        <div className="absolute inset-0 opacity-30 group-hover:opacity-40 transition-opacity">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-500 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Main Message */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {isAlmostGone && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
              <h3 className={`text-lg md:text-xl font-bold ${
                isAlmostGone
                  ? 'text-red-300 animate-pulse'
                  : isHalfGone
                  ? 'text-amber-300'
                  : 'text-amber-200'
              }`}>
                {isAlmostGone ? '🔥 ALMOST GONE!' : '⚠️ LIMITED FOUNDER REWARDS'}
              </h3>
            </div>
          </div>

          {/* Counter */}
          <div className="mb-4">
            <div className="flex items-baseline gap-2 mb-1">
              <span className={`text-3xl md:text-4xl font-black tabular-nums ${
                isAlmostGone
                  ? 'text-red-400 drop-shadow-[0_2px_10px_rgba(248,113,113,0.8)]'
                  : 'text-amber-400 drop-shadow-[0_2px_10px_rgba(251,191,36,0.6)]'
              }`}>
                {remaining.toLocaleString()}
              </span>
              <span className="text-lg text-slate-300">
                / {maxFounderSkins.toLocaleString()} Founder Skins Left
              </span>
            </div>
            <p className="text-sm text-slate-400">
              <strong className="text-cyan-400 tabular-nums">{signupCount.toLocaleString()}</strong> commanders already claimed their spot
              {isAlmostGone && <span className="text-red-400 font-semibold ml-1">- Hurry!</span>}
            </p>
          </div>

          {/* Progress Bar */}
          {showProgressBar && (
            <div className="mb-4">
              <div className="relative h-3 bg-black/30 rounded-full overflow-hidden ring-1 ring-white/10">
                <div
                  className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out ${
                    isAlmostGone
                      ? 'bg-gradient-to-r from-red-500 via-orange-500 to-amber-500'
                      : 'bg-gradient-to-r from-amber-500 via-orange-400 to-amber-300'
                  }`}
                  style={{ width: `${percentageClaimed}%` }}
                >
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                </div>
              </div>
              <div className="flex justify-between mt-1 text-xs text-slate-500">
                <span>0</span>
                <span className="font-semibold text-amber-400">{percentageClaimed.toFixed(1)}% Claimed</span>
                <span>{maxFounderSkins}</span>
              </div>
            </div>
          )}

          {/* Benefit Reminder */}
          <div className="flex items-center gap-2 text-xs text-slate-300 bg-black/20 rounded-lg p-3 border border-white/5">
            <span className="text-lg">🎁</span>
            <span>
              <strong className="text-amber-300">Early signups get:</strong> Exclusive ship skin, credits recognition & beta priority
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
