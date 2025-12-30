"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AudioPage() {
  const [selectedTrack, setSelectedTrack] = useState(0);

  // Placeholder track list - you can replace with actual tracks
  const tracks = [
    {
      title: "Warp Drive Initiation",
      duration: "3:45",
      description: "The journey begins as you fire up your ship's faster-than-light engines",
    },
    {
      title: "Nebula Drift",
      duration: "4:20",
      description: "Floating through cosmic clouds of gas and stardust",
    },
    {
      title: "Combat Encounter",
      duration: "2:58",
      description: "Intense battle music when hostile forces appear",
    },
    {
      title: "Station Approach",
      duration: "3:32",
      description: "Docking at massive space stations orbiting distant worlds",
    },
    {
      title: "Exploration Theme",
      duration: "5:15",
      description: "Discovering uncharted systems and alien artifacts",
    },
    {
      title: "The Void Beyond",
      duration: "6:40",
      description: "Deep space ambient for those long journeys between stars",
    },
  ];

  const samplePacks = [
    {
      name: "ETU 2175 - Ship Sounds",
      description: "Engine hums, weapon fire, shield impacts, and thruster effects",
      files: "42 files",
      size: "156 MB",
      format: "WAV 48kHz 24-bit",
    },
    {
      name: "ETU 2175 - Ambient Space",
      description: "Background loops, station atmospheres, and cosmic ambience",
      files: "28 files",
      size: "203 MB",
      format: "WAV 48kHz 24-bit",
    },
    {
      name: "ETU 2175 - UI & Interface",
      description: "Button clicks, menu sounds, alerts, and notification effects",
      files: "65 files",
      size: "87 MB",
      format: "WAV 48kHz 24-bit",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950">
      <Header />

      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative max-w-6xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 backdrop-blur-sm mb-6">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
              Original Soundtrack by E.T.
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(34,211,238,0.5)]">
            Sonic Arsenal
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-4 max-w-3xl mx-auto">
            Experience the immersive soundscape of ETU 2175
          </p>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            From epic space battles to serene cosmic exploration, every sound is crafted
            to transport you to the year 2175
          </p>

          {/* Social Links */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <a
              href="https://soundcloud.com/elliottelford"
              target="_blank"
              rel="noopener noreferrer"
              className="group px-6 py-3 rounded-lg border border-orange-500/30 hover:border-orange-400/50 bg-orange-500/10 hover:bg-orange-500/20 transition-all duration-300 flex items-center gap-2"
            >
              <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 17.939h-1v-8.068c.308-.231.639-.429 1-.566v8.634zm3 0h1v-9.224c-.229.265-.443.548-.621.857l-.379-.184v8.551zm-2 0h1v-8.848c-.508-.079-.623-.05-1-.01v8.858zm-4 0h1v-7.02c-.312.458-.555.971-.692 1.535l-.308-.182v5.667zm-3-5.25c-.606.547-1 1.354-1 2.268 0 .914.394 1.721 1 2.268v-4.536zm18.879-.671c-.204-2.837-2.404-5.079-5.117-5.079-1.022 0-1.964.328-2.762.877v10.123h9.089c1.607 0 2.911-1.393 2.911-3.106 0-2.233-2.168-3.772-4.121-2.815zm-16.879-.027c-.302-.024-.526-.03-1 .122v5.689h1v-5.811z"/>
              </svg>
              <span className="text-orange-300 font-medium">Also on SoundCloud</span>
            </a>
          </div>
        </div>
      </section>

      {/* Intergalactic Radio Feature */}
      <section className="relative py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-slate-900/80 to-indigo-900/80 backdrop-blur-xl p-8 md:p-12">
            {/* Glow effect */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-400 to-transparent"></div>

            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 mb-4">
                  <span className="text-xs font-bold text-cyan-300">FEATURE HIGHLIGHT</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
                  Intergalactic Radio
                </h2>
                <p className="text-lg text-slate-300 mb-6">
                  Take control of your sonic experience! ETU 2175 features a fully customizable
                  in-game radio system that lets you play your own music while exploring the cosmos.
                </p>
                <ul className="space-y-3 text-slate-300">
                  <li className="flex items-start gap-3">
                    <div className="mt-1 w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span>Import your favorite tracks directly into the game</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span>Create custom playlists for different gameplay moods</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span>Seamlessly switch between original OST and your custom tracks</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span>In-cockpit controls with futuristic holographic interface</span>
                  </li>
                </ul>
              </div>

              <div className="relative">
                {/* Screenshot placeholder - Replace with actual screenshot */}
                <div className="relative rounded-xl overflow-hidden border-2 border-cyan-500/30 shadow-[0_0_50px_rgba(34,211,238,0.3)]">
                  <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                    {/* Placeholder - replace with actual image */}
                    <div className="text-center p-8">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-cyan-500/20 flex items-center justify-center">
                        <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                      </div>
                      <p className="text-slate-400">
                        Screenshot coming soon!
                        <br />
                        <span className="text-sm">Add your Intergalactic Radio screenshot here</span>
                      </p>
                    </div>
                  </div>
                  {/* Animated scan line */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scan"></div>
                </div>
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-cyan-500 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OST Player Section */}
      <section className="relative py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Original Soundtrack
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Stream the complete ETU 2175 soundtrack. Each track is crafted to enhance
              your journey through the stars.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Track List */}
            <div className="md:col-span-2 space-y-3">
              {tracks.map((track, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedTrack(index)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-300 group ${
                    selectedTrack === index
                      ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-400/50 shadow-[0_0_30px_rgba(34,211,238,0.3)]"
                      : "bg-slate-900/50 border-slate-700/50 hover:border-cyan-500/30 hover:bg-slate-900/80"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Play button */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                      selectedTrack === index
                        ? "bg-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.6)]"
                        : "bg-slate-800 group-hover:bg-cyan-500/20"
                    }`}>
                      <svg className={`w-5 h-5 ${selectedTrack === index ? "text-white" : "text-cyan-400"}`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>

                    {/* Track info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between mb-1">
                        <h3 className={`text-lg font-semibold truncate ${
                          selectedTrack === index ? "text-cyan-300" : "text-slate-200 group-hover:text-cyan-300"
                        } transition-colors duration-300`}>
                          {track.title}
                        </h3>
                        <span className="text-sm text-slate-400 ml-2">{track.duration}</span>
                      </div>
                      <p className="text-sm text-slate-400 line-clamp-1">
                        {track.description}
                      </p>
                    </div>
                  </div>

                  {/* Waveform visualization (decorative) */}
                  {selectedTrack === index && (
                    <div className="flex items-center gap-1 mt-3 h-8">
                      {[...Array(40)].map((_, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-gradient-to-t from-cyan-500 to-blue-500 rounded-full animate-pulse"
                          style={{
                            height: `${Math.random() * 100}%`,
                            animationDelay: `${i * 0.05}s`,
                          }}
                        ></div>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Now Playing Card */}
            <div className="md:col-span-1">
              <div className="sticky top-24 p-6 rounded-xl border border-cyan-500/30 bg-gradient-to-br from-slate-900 to-indigo-900/50 backdrop-blur-sm">
                <div className="text-xs font-bold text-cyan-400 mb-3 tracking-wider">NOW PLAYING</div>

                {/* Album Art Placeholder */}
                <div className="relative aspect-square rounded-lg overflow-hidden mb-4 bg-gradient-to-br from-cyan-900/50 to-purple-900/50 border border-cyan-500/30">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-20 h-20 text-cyan-400/30" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  </div>
                  {/* Animated border */}
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scan"></div>
                </div>

                <h3 className="text-xl font-bold text-cyan-300 mb-2">
                  {tracks[selectedTrack].title}
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  {tracks[selectedTrack].description}
                </p>

                {/* Playback controls placeholder */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>0:00</span>
                    <span>{tracks[selectedTrack].duration}</span>
                  </div>
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full w-1/3 bg-gradient-to-r from-cyan-500 to-blue-500 animate-pulse"></div>
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <button className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors">
                      <svg className="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                      </svg>
                    </button>
                    <button className="w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                    <button className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors">
                      <svg className="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 18h2V6h-2zM6 18l8.5-6L6 6z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Note about embedding */}
                <div className="mt-6 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <p className="text-xs text-slate-400">
                    💡 <strong className="text-cyan-400">Note:</strong> Replace this with an embedded
                    SoundCloud player or audio element to enable playback
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sample Packs Section */}
      <section className="relative py-16 px-4 mb-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Free Sample Packs
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Download high-quality sound effects from ETU 2175 for your own projects.
              All samples are royalty-free for personal and commercial use.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {samplePacks.map((pack, index) => (
              <div
                key={index}
                className="group relative overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-br from-slate-900 to-purple-900/30 p-6 hover:border-purple-400/50 transition-all duration-300 hover:shadow-[0_0_40px_rgba(168,85,247,0.3)]"
              >
                {/* Glow effect */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                <div className="mb-4">
                  <div className="w-16 h-16 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors">
                    <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-purple-300 mb-2">{pack.name}</h3>
                  <p className="text-sm text-slate-400 mb-4">{pack.description}</p>
                </div>

                <div className="space-y-2 text-sm text-slate-400 mb-6">
                  <div className="flex justify-between">
                    <span>Files:</span>
                    <span className="text-purple-300 font-medium">{pack.files}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Size:</span>
                    <span className="text-purple-300 font-medium">{pack.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Format:</span>
                    <span className="text-purple-300 font-medium">{pack.format}</span>
                  </div>
                </div>

                <button className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 font-semibold text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] transition-all duration-300 flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Pack
                </button>
              </div>
            ))}
          </div>

          {/* License info */}
          <div className="mt-8 p-6 rounded-xl border border-slate-700/50 bg-slate-900/50">
            <h3 className="text-lg font-bold text-slate-200 mb-2">📋 License Information</h3>
            <p className="text-sm text-slate-400">
              All sample packs are provided royalty-free for personal and commercial use. Attribution
              is appreciated but not required. You may not resell or redistribute these samples as-is.
              For custom sound design work, contact <a href="mailto:contact@example.com" className="text-cyan-400 hover:text-cyan-300">E.T.</a>
            </p>
          </div>
        </div>
      </section>

      <Footer />

      {/* Custom animations */}
      <style jsx>{`
        @keyframes scan {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(500px);
          }
        }
        .animate-scan {
          animation: scan 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
