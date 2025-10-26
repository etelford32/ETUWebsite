"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type Mode = "signup" | "signin" | "magic";

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
      {children}
    </div>
  );
}

export default function Page() {
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${location.origin}/auth/callback` },
        });
        if (error) throw error;
        setMsg("Check your email to confirm your account.");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${location.origin}/auth/callback` },
        });
        if (error) throw error;
        setMsg("Magic link sent. Check your inbox.");
      }
    } catch (err: any) {
      setMsg(err?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const oauth = async (provider: "google" | "github") => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  };

  return (
    <main className="relative min-h-[85vh] grid place-items-center px-6">
      {/* Cosmic backdrop to match ETU */}
      <div className="absolute inset-0 bg-etu-cosmic-gradient" />
      <div className="absolute inset-0 etu-starfield" />

      <div className="relative z-10 w-full flex flex-col items-center text-white text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight drop-shadow-[0_0_20px_rgba(124,58,237,0.45)]">
          Explore the Universe <span className="text-etu-accent">2175</span>
        </h1>
        <p className="opacity-90 mt-2 max-w-xl">
          Create an account or sign in to continue your journey.
        </p>

        <Card>
          {/* Mode switcher */}
          <div className="grid grid-cols-3 gap-2 text-sm">
            {(["signup","signin","magic"] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`py-2 rounded transition ${
                  mode === m ? "bg-etu-accent" : "bg-white/10 hover:bg-white/15"
                }`}
              >
                {m === "signup" ? "Sign up" : m === "signin" ? "Sign in" : "Magic link"}
              </button>
            ))}
          </div>

          {/* Auth form */}
          <form onSubmit={onSubmit} className="mt-4 space-y-3 text-left">
            <input
              className="w-full rounded px-3 py-2 bg-black/50 border border-white/20 placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-etu-accent"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {mode !== "magic" && (
              <input
                className="w-full rounded px-3 py-2 bg-black/50 border border-white/20 placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-etu-accent"
                type="password"
                required
                placeholder={mode === "signup" ? "Create a password" : "Your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
            <button
              disabled={busy}
              className="w-full rounded py-2 bg-etu-accent font-semibold shadow-[0_0_20px_rgba(124,58,237,0.6)] hover:scale-[1.01] transition disabled:opacity-60"
            >
              {busy
                ? "Working…"
                : mode === "signup"
                ? "Create account"
                : mode === "signin"
                ? "Sign in"
                : "Send magic link"}
            </button>
          </form>

          {/* OAuth */}
          <div className="my-4 text-center text-sm opacity-70">or</div>
          <div className="grid gap-2">
            <button onClick={() => oauth("google")} className="w-full border border-white/15 rounded py-2 bg-white/10 hover:bg-white/15">
              Continue with Google
            </button>
            <button onClick={() => oauth("github")} className="w-full border border-white/15 rounded py-2 bg-white/10 hover:bg-white/15">
              Continue with GitHub
            </button>
          </div>

          {msg && <p className="mt-4 text-sm text-etu-accent">{msg}</p>}

          <div className="mt-4 flex items-center justify-between text-xs opacity-80">
            <a
              className="underline"
              href="https://exploretheuniverse2175.com"
              target="_blank"
              rel="noreferrer"
            >
              Back to Main Site
            </a>
            <Link href="/login" className="underline">Old login</Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
