'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabaseClient';

export default function RealSignupStats() {
  const [signupCount, setSignupCount] = useState<number>(0);
  const [recentSignups, setRecentSignups] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Fetch total signup count
    async function fetchSignupCount() {
      try {
        // Get total count of profiles
        const { count: totalCount, error: totalError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (totalError) {
          console.error('Error fetching total count:', totalError);
          return;
        }

        setSignupCount(totalCount || 0);

        // Get count of signups in last 24 hours
        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);

        const { count: recentCount, error: recentError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', yesterday.toISOString());

        if (recentError) {
          console.error('Error fetching recent count:', recentError);
          return;
        }

        setRecentSignups(recentCount || 0);
        setLoading(false);
      } catch (error) {
        console.error('Error in fetchSignupCount:', error);
        setLoading(false);
      }
    }

    fetchSignupCount();

    // Set up real-time subscription to profiles table
    const channel = supabase
      .channel('signup-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          // When a new signup happens, refresh the count
          fetchSignupCount();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (loading) {
    return (
      <div className="inline-flex items-center gap-4 px-6 py-3 rounded-xl bg-white/5 ring-1 ring-white/10 backdrop-blur-sm">
        <div className="text-center">
          <div className="text-2xl font-bold text-cyan-300 animate-pulse">...</div>
          <div className="text-xs text-slate-400">Commanders Signed Up</div>
        </div>
        <div className="h-8 w-px bg-white/20"></div>
        <div className="text-center">
          <div className="text-lg font-semibold text-green-400 animate-pulse">+...</div>
          <div className="text-xs text-slate-400">in last 24 hours</div>
        </div>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-4 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 ring-2 ring-cyan-500/30 hover:ring-cyan-400/50 backdrop-blur-sm transition-all group shadow-[0_0_20px_rgba(34,211,238,0.2)]">
      <div className="text-center">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300 bg-clip-text text-transparent tabular-nums group-hover:scale-105 transition-transform drop-shadow-[0_2px_8px_rgba(34,211,238,0.6)]">
            {signupCount.toLocaleString()}
          </span>
          <span className="text-xl animate-bounce">🚀</span>
        </div>
        <div className="text-xs text-cyan-300 font-semibold uppercase tracking-wider">
          Commanders Signed Up
        </div>
      </div>
      <div className="h-10 w-px bg-gradient-to-b from-transparent via-cyan-400/50 to-transparent"></div>
      <div className="text-center">
        <div className="flex items-center gap-1">
          <span className="text-xl font-bold text-green-400 tabular-nums drop-shadow-[0_2px_8px_rgba(34,197,94,0.6)]">
            +{recentSignups}
          </span>
          <span className="text-sm">📈</span>
        </div>
        <div className="text-xs text-green-300 font-semibold uppercase tracking-wider">
          in last 24 hours
        </div>
      </div>
    </div>
  );
}
