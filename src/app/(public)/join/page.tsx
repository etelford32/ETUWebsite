"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Mode = "signup" | "signin" | "magic";

export default function JoinPage() {
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
          options: { emailRedirectTo: `${location.origin}/auth/callback` }
        });
        if (error) throw error;
        setMsg("Check your email to confirm your account.");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
      } else {
        // magic link
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${location.origin}/auth/callback` }
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
      options: { redirectTo: `${location.origin}/auth/callback` }
    });
  };

  return (
    <main className="min-h-[75vh] grid place-items-center p-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
        <h1 className="text-2xl font-semibold">Join Explore the Universe 2175</h1>
        <p className="opacity-80 text-sm mt-1">Create an account, or sign in.</p>

        {/* Mode switcher */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <button
            className={`py-2 rounded ${mode==="signup" ? "bg-etu-accent" : "bg-white/10"}`}
            onClick={()=>setMode("signup")}
          >Sign up</button>
          <button
            className={`py-2 rounded ${mode==="signin" ? "bg-etu-accent" : "bg-white/10"}`}
            onClick={()=>setMode("signin")}
          >Sign in</button>
          <button
            className={`py-2 rounded ${mode==="magic" ? "bg-etu-accent" : "bg-white/10"}`}
            onClick={()=>setMode("magic")}
          >Magic link</button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <input
            className="w-full rounded px-3 py-2 bg-black/50 border border-white/20 placeholder-white/50"
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={e=>setEmail(e.target.value)}
          />
          {mode !== "magic" && (
            <input
              className="w-full rounded px-3 py-2 bg-black/50 border border-white/20 placeholder-white/50"
              type="password"
              placeholder={mode==="signup" ? "Create a password" : "Your password"}
              value={password}
              onChange={e=>setPassword(e.target.value)}
              required
            />
          )}
          <button
            disabled={busy}
            className="w-full rounded py-2 bg-etu-accent font-semibold shadow-[0_0_20px_rgba(124,58,237,0.6)]"
          >
            {busy ? "Working…" :
              mode==="signup" ? "Create account" :
              mode==="signin" ? "Sign in" : "Send magic link"}
          </button>
        </form>

        {/* OAuth */}
        <div className="my-4 text-center text-sm opacity-70">or</div>
        <div className="grid gap-2">
          <button onClick={()=>oauth("google")} className="w-full border rounded py-2 bg-white/10">
            Continue with Google
          </button>
          <button onClick={()=>oauth("github")} className="w-full border rounded py-2 bg-white/10">
            Continue with GitHub
          </button>
        </div>

        {msg && <p className="mt-4 text-sm text-etu-accent">{msg}</p>}

        <p className="text-xs opacity-70 mt-4">
          By continuing, you agree to our Terms & Privacy.
        </p>
      </div>
    </main>
  );
}
