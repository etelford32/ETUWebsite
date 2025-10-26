"use client";
import { useState } from "react";
import Link from "next/link";

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`mx-auto max-w-6xl px-4 ${className}`}>{children}</section>;
}

export default function Landing() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed");
      setMsg("Subscribed! See you in the alpha.");
      setEmail("");
    } catch (err: any) {
      setMsg(err?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative overflow-clip">
      {/* Cosmic backdrop */}
      <div className="absolute inset-0 bg-etu-cosmic-gradient pointer-events-none" />
      <div className="absolute inset-0 etu-starfield pointer-events-none" />

      {/* HERO */}
      <Section className="relative pt-24 pb-16 text-center text-white">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight drop-shadow-[0_0_20px_rgba(124,58,237,0.4)]">
          Explore the Universe <span className="text-etu-accent">2175</span>
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg opacity-90">
          AI empires. Terraforming feedback loops. Real astrophysics. One living cosmos.
        </p>

        <form onSubmit={subscribe} className="mt-8 w-full max-w-md mx-auto flex gap-2">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 rounded px-3 py-2 bg-black/50 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-etu-accent"
          />
          <button
            disabled={busy}
            className="rounded px-5 py-2 bg-etu-accent text-white font-semibold shadow-[0_0_20px_rgba(124,58,237,0.6)] hover:scale-[1.02] transition"
          >
            {busy ? "Joining…" : "Join the Alpha"}
          </button>
        </form>
        {msg && <p className="mt-3 text-sm text-etu-accent">{msg}</p>}

        <div className="mt-6 flex gap-5 justify-center text-sm">
          <Link href="/login" className="underline">Sign in</Link>
          <Link href="/dashboard" className="underline">Dashboard</Link>
        </div>

        {/* Hero visual */}
        <div className="mt-10 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          <div className="relative aspect-video bg-black">
            {/* Replace with <iframe> YouTube when ready */}
            <img
              src="/images/etu_hero.jpg"
              alt="ETU-2175 cinematic still"
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        </div>
        <p className="text-xs opacity-70 mt-2">Trailer “Rise of Megabot” — coming soon</p>
      </Section>

      {/* FEATURES */}
      <Section className="relative py-14 text-white">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: "AI Empires", desc: "Mycelari spores, Crystal Mason fleets, Megabot’s hegemony. They learn and expand." },
            { title: "Astrophysics-Driven", desc: "Atmospheres, magnetospheres, orbital mechanics informed by modern research." },
            { title: "Procedural Worlds", desc: "Ocean worlds, rogue giants, ring cities — billions of seeds to explore." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl p-5 bg-white/5 border border-white/10 backdrop-blur-sm">
              <h3 className="text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 opacity-90">{f.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* FACTIONS */}
      <Section className="relative py-4 text-white">
        <h2 className="text-2xl font-bold mb-6 text-center">Factions</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { name: "Megabot", blurb: "Planet-scale AI war machine. Modular limbs, laser arrays, missile fingers.", img: "/images/factions/megabot.jpg" },
            { name: "Mycelari", blurb: "Fungal intelligence. The Bloom Queen harvests entire worlds.", img: "/images/factions/mycelari.jpg" },
            { name: "Crystal Mason’s Federation", blurb: "Space dwarves mining gas giants with crystal-fusion tech.", img: "/images/factions/cmf.jpg" },
          ].map((c) => (
            <div key={c.name} className="rounded-2xl overflow-hidden bg-white/5 border border-white/10">
              <div className="h-44 bg-center bg-cover" style={{ backgroundImage: `url(${c.img})` }} />
              <div className="p-5">
                <h3 className="text-lg font-semibold">{c.name}</h3>
                <p className="opacity-90 mt-1">{c.blurb}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* FOOT CTA */}
      <Section className="relative py-12 text-center text-white">
        <p className="opacity-90">Be among the first to terraform and conquer.</p>
        <form onSubmit={subscribe} className="mt-4 w-full max-w-md mx-auto flex gap-2">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 rounded px-3 py-2 bg-black/50 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-etu-accent"
          />
          <button disabled={busy} className="rounded px-5 py-2 bg-etu-accent text-white font-semibold shadow-[0_0_20px_rgba(124,58,237,0.6)]">
            {busy ? "Joining…" : "Join the Alpha"}
          </button>
        </form>
        {msg && <p className="mt-3 text-sm text-etu-accent">{msg}</p>}
      </Section>
    </main>
  );
}
