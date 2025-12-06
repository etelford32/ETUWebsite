"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getFaction, getAllFactionSlugs } from "@/data/factions";

export default function FactionPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const faction = getFaction(slug);

  useEffect(() => {
    // Section reveal animation
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("show");
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

    return () => io.disconnect();
  }, []);

  if (!faction) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Faction Not Found</h1>
            <p className="text-slate-300 mb-8">
              The faction you're looking for doesn't exist in our galaxy.
            </p>
            <Link
              href="/#factions"
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-500 hover:to-indigo-500"
            >
              Back to Factions
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="min-h-screen">
        {/* Hero Section */}
        <section
          className="relative h-[60vh] min-h-[500px] flex items-end overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${faction.color.primary}22 0%, ${faction.color.secondary}11 100%)`,
          }}
        >
          {/* Background Image */}
          <div className="absolute inset-0 opacity-30">
            <Image
              src={faction.heroImage}
              alt={faction.name}
              fill
              className="object-cover"
              priority
            />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to top, rgba(4,6,20,1) 0%, rgba(4,6,20,0.7) 50%, rgba(4,6,20,0.3) 100%)`,
              }}
            />
          </div>

          {/* Hero Content */}
          <div className="relative z-10 w-full max-w-7xl mx-auto px-4 lg:px-6 pb-12">
            <div className="reveal">
              <div
                className="inline-block px-4 py-1.5 rounded-full border mb-4"
                style={{
                  borderColor: faction.color.primary + "66",
                  background: faction.color.primary + "22",
                }}
              >
                <span className="text-sm font-semibold">Playable Faction</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold mb-4">
                {faction.name}
              </h1>
              <p className="text-xl md:text-2xl text-slate-200 max-w-2xl">
                {faction.tagline}
              </p>
            </div>
          </div>
        </section>

        {/* Overview Section */}
        <section className="py-16 bg-gradient-to-b from-deep-900 to-deep-800">
          <div className="max-w-7xl mx-auto px-4 lg:px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Description */}
              <div className="reveal">
                <h2 className="text-3xl font-bold mb-6">Overview</h2>
                <p className="text-lg text-slate-300 leading-relaxed mb-6">
                  {faction.description}
                </p>
                <div
                  className="p-6 rounded-xl border"
                  style={{
                    borderColor: faction.color.primary + "33",
                    background: faction.color.primary + "11",
                  }}
                >
                  <h3 className="font-semibold text-lg mb-3">Playstyle</h3>
                  <p className="text-slate-300">{faction.playstyle}</p>
                </div>
              </div>

              {/* Abilities */}
              <div className="reveal">
                <h2 className="text-3xl font-bold mb-6">Key Abilities</h2>
                <div className="space-y-4">
                  {faction.abilities.map((ability, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-4 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: faction.color.primary + "33",
                          color: faction.color.accent,
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold">{ability}</h4>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Strengths & Weaknesses */}
        <section className="py-16 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 lg:px-6">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Strengths */}
              <div className="reveal">
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: faction.color.primary + "33" }}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold">Strengths</h2>
                </div>
                <ul className="space-y-3">
                  {faction.strengths.map((strength, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-slate-300"
                    >
                      <span
                        className="text-xl mt-0.5"
                        style={{ color: faction.color.primary }}
                      >
                        ✦
                      </span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses */}
              <div className="reveal">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500/20">
                    <svg
                      className="w-5 h-5 text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold">Weaknesses</h2>
                </div>
                <ul className="space-y-3">
                  {faction.weaknesses.map((weakness, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-slate-300"
                    >
                      <span className="text-xl mt-0.5 text-red-400">✦</span>
                      <span>{weakness}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Units Section */}
        {faction.units && faction.units.length > 0 && (
          <section className="py-16 bg-gradient-to-b from-deep-800 to-deep-900">
            <div className="max-w-7xl mx-auto px-4 lg:px-6">
              <div className="reveal mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Faction Units
                </h2>
                <p className="text-slate-300">
                  Key vessels and units available to {faction.name.split("•")[0].trim()} commanders.
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {faction.units.map((unit, idx) => (
                  <div
                    key={idx}
                    className="reveal p-6 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition"
                  >
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                      style={{
                        background: faction.color.primary + "22",
                        border: `2px solid ${faction.color.primary}44`,
                      }}
                    >
                      <span
                        className="text-2xl font-bold"
                        style={{ color: faction.color.primary }}
                      >
                        {idx + 1}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{unit.name}</h3>
                    <p className="text-sm text-slate-300">{unit.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Lore Section */}
        <section className="py-16 border-t border-white/10">
          <div className="max-w-4xl mx-auto px-4 lg:px-6">
            <div className="reveal">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Origin & Lore
              </h2>
              <div
                className="p-8 rounded-2xl border-l-4"
                style={{
                  borderLeftColor: faction.color.primary,
                  background: faction.color.primary + "11",
                }}
              >
                <p className="text-lg text-slate-200 leading-relaxed italic">
                  {faction.lore}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-b from-deep-900 to-deep-800/40">
          <div className="max-w-4xl mx-auto px-4 lg:px-6 text-center">
            <div className="reveal">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Command {faction.name.split("•")[0].trim()}?
              </h2>
              <p className="text-lg text-slate-300 mb-8">
                Download the game and lead your faction to victory across the galaxy.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/#download"
                  className="px-8 py-4 rounded-lg font-semibold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-[0_0_30px_rgba(59,130,246,0.5)] hover:shadow-[0_0_40px_rgba(59,130,246,0.7)] transition-all duration-300 hover:scale-105"
                >
                  Download Now
                </Link>
                <Link
                  href="/#factions"
                  className="px-8 py-4 rounded-lg font-semibold text-lg bg-white/5 hover:bg-white/10 border border-white/20 hover:border-white/30 transition-all"
                >
                  View All Factions
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
