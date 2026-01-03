'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Image from 'next/image';

export default function PressKitPage() {
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    const fullUrl = `${window.location.origin}${text}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(label);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Media assets organized by category
  const videos = [
    {
      title: 'Official Cinematic Trailer #1 (4K)',
      filename: '/ETU_Cinematic_Trailer_4K.mp4',
      size: '13 MB',
      description: 'Main cinematic trailer showcasing gameplay and story'
    },
    {
      title: 'ETU Gameplay Video 1',
      filename: '/ETU1.mp4',
      size: '8.3 MB',
      description: 'Gameplay footage and mechanics'
    },
    {
      title: 'ETU Logo Animation',
      filename: '/ETU_Logo2.mp4',
      size: '6.2 MB',
      description: 'Animated logo reveal'
    },
    {
      title: 'Quasar Footage',
      filename: '/Quasar1.mp4',
      size: '4.4 MB',
      description: 'Space environment showcase'
    },
    {
      title: 'Universe Exploration',
      filename: '/u3172841634__--ar_11_--video_1_--end_httpss.mj.runAlLxrf1zR6w_fc74704f-b0b3-4d69-a6e6-d2da06d47faa_0.mp4',
      size: '5.9 MB',
      description: 'Cinematic universe exploration footage'
    }
  ];

  const logos = [
    { title: 'ETU Logo (Primary)', filename: '/logo2.png', size: '1.6 MB' },
    { title: 'ETU Logo (Alt)', filename: '/logo3.png', size: '556 KB' },
    { title: 'ETU Logo (JPEG)', filename: '/ETU_LOGO.jpg', size: '155 KB' }
  ];

  const promotionalImages = [
    { title: 'ETU Christmas Special', filename: '/ETU_XMAS.png', size: '2.7 MB', description: 'Holiday promotional banner' },
    { title: 'ETU Epic Cover 7', filename: '/etu_epic7.png', size: '1.7 MB', description: 'Epic Games Store promotional' },
    { title: 'Explore Epic Cover 5', filename: '/Explore_Epic5.png', size: '2.6 MB', description: 'Alternative promotional banner' },
    { title: 'Official Cover 6', filename: '/ETC_Offish_cover6.png', size: '2.6 MB', description: 'Official game cover art' },
    { title: 'ETU Gameplay Screenshot', filename: '/etugp1.jpg', size: '1.2 MB', description: 'In-game screenshot' },
    { title: 'Megabot Showcase', filename: '/Megabot1.png', size: '2.4 MB', description: 'Megabot faction showcase' }
  ];

  const factionImages = [
    { title: 'Crystal Intelligences', filename: '/Crystal_Race.jpg', size: '386 KB', faction: 'CYL' },
    { title: 'Mycelari Hero 1', filename: '/Mycelari_Hero1.jpg', size: '490 KB', faction: 'Mycelari' },
    { title: 'Mycelari Hero 2', filename: '/Mycelari_Hero2.jpg', size: '570 KB', faction: 'Mycelari' },
    { title: 'Wild Faction', filename: '/Wild_Race.jpg', size: '498 KB', faction: 'Wild' },
    { title: 'Evil Robot Hero', filename: '/eveil_robot_hero1.jpg', size: '322 KB', faction: 'Megabot' },
    { title: 'Future Cylinder', filename: '/FutureCyl.jpg', size: '464 KB', faction: 'CYL' }
  ];

  const systemImages = [
    { title: 'AI Systems', filename: '/ai_systems.jpg', size: '372 KB', description: 'Adaptive AI showcase' },
    { title: 'Physics Systems', filename: '/physics.jpg', size: '457 KB', description: 'Realistic physics mechanics' },
    { title: 'Upgrade Systems', filename: '/upgrade.jpg', size: '441 KB', description: 'Ship upgrade interface' }
  ];

  return (
    <>
      <Header />

      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-b from-deep-900 via-indigo-950/30 to-deep-900 border-b border-cyan-500/20 overflow-hidden">
        {/* Background effect */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-96 h-96 bg-cyan-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 lg:px-6">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/20 border border-cyan-400/40 backdrop-blur-sm mb-6">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-semibold text-cyan-300 uppercase tracking-wider">
                Press Kit
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-[0_4px_20px_rgba(59,130,246,0.8)]">
                Explore the Universe 2175
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-slate-200 mb-4 font-semibold">
              Media Resources & Brand Assets
            </p>

            <p className="text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed mb-8">
              Welcome to the official press kit for Explore the Universe 2175. Download high-quality logos, screenshots, videos, and promotional materials for coverage and reviews.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://store.steampowered.com/app/4094340/Explore_the_Universe_2175"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-semibold shadow-lg transition-all"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" />
                </svg>
                View on Steam
              </a>
              <a
                href="https://elliottelford.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-white/20 hover:bg-white/5 font-semibold transition-all"
              >
                Developer Website
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Game Overview */}
      <section className="py-16 bg-gradient-to-b from-deep-900 to-deep-800">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Game Overview
          </h2>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="p-6 rounded-xl bg-white/5 ring-1 ring-white/10">
                <h3 className="text-xl font-semibold text-cyan-300 mb-2">Title</h3>
                <p className="text-slate-200">Explore the Universe 2175</p>
              </div>

              <div className="p-6 rounded-xl bg-white/5 ring-1 ring-white/10">
                <h3 className="text-xl font-semibold text-cyan-300 mb-2">Developer</h3>
                <p className="text-slate-200">Elliot Telford / Telford Projects</p>
              </div>

              <div className="p-6 rounded-xl bg-white/5 ring-1 ring-white/10">
                <h3 className="text-xl font-semibold text-cyan-300 mb-2">Release Date</h3>
                <p className="text-slate-200">Demo: December 25, 2025</p>
                <p className="text-slate-200">Early Access: February 2, 2026</p>
              </div>

              <div className="p-6 rounded-xl bg-white/5 ring-1 ring-white/10">
                <h3 className="text-xl font-semibold text-cyan-300 mb-2">Platforms</h3>
                <p className="text-slate-200">Windows, macOS, Linux (Steam)</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-6 rounded-xl bg-white/5 ring-1 ring-white/10">
                <h3 className="text-xl font-semibold text-cyan-300 mb-3">Genre</h3>
                <p className="text-slate-200">Space RPG, Simulation, Action</p>
              </div>

              <div className="p-6 rounded-xl bg-white/5 ring-1 ring-white/10">
                <h3 className="text-xl font-semibold text-cyan-300 mb-3">Description</h3>
                <p className="text-slate-200 leading-relaxed">
                  The First Space RPG Where Your Enemy Learns From You. Battle MEGABOT, an evolving AI boss that adapts to your tactics. Master realistic Newtonian physics, level your ship through deep RPG progression, and survive a procedurally generated galaxy that remembers every choice you make.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-white/5 ring-1 ring-white/10">
                <h3 className="text-xl font-semibold text-cyan-300 mb-3">Key Features</h3>
                <ul className="text-slate-200 space-y-1 list-disc list-inside">
                  <li>Adaptive AI boss that evolves with each encounter</li>
                  <li>NASA-grade orbital mechanics and physics</li>
                  <li>Deep RPG progression with skill trees</li>
                  <li>Four unique playable factions</li>
                  <li>Online leaderboards and competitions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Videos */}
      <section className="py-16 bg-gradient-to-b from-deep-800 to-deep-900 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <h2 className="text-4xl font-bold mb-8 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Videos & Trailers
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {videos.map((video, idx) => (
              <div key={idx} className="p-6 rounded-xl bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-cyan-300">{video.title}</h3>
                    <p className="text-sm text-slate-400 mt-1">{video.description}</p>
                    <p className="text-xs text-slate-500 mt-1">Size: {video.size}</p>
                  </div>
                  <svg className="w-12 h-12 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>

                <div className="flex gap-2">
                  <a
                    href={video.filename}
                    download
                    className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-center font-semibold text-sm transition-all"
                  >
                    Download
                  </a>
                  <button
                    onClick={() => copyToClipboard(video.filename, video.title)}
                    className="px-4 py-2 rounded-lg border border-white/20 hover:bg-white/5 font-semibold text-sm transition-all"
                  >
                    {copiedLink === video.title ? '✓ Copied!' : 'Copy URL'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Logos */}
      <section className="py-16 bg-gradient-to-b from-deep-900 to-deep-800">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <h2 className="text-4xl font-bold mb-8 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Logos & Branding
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {logos.map((logo, idx) => (
              <div key={idx} className="p-6 rounded-xl bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition-all">
                <div className="aspect-square bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                  <Image
                    src={logo.filename}
                    alt={logo.title}
                    width={400}
                    height={400}
                    className="w-full h-full object-contain p-4"
                  />
                </div>
                <h3 className="text-lg font-semibold text-cyan-300 mb-2">{logo.title}</h3>
                <p className="text-xs text-slate-500 mb-4">Size: {logo.size}</p>
                <div className="flex gap-2">
                  <a
                    href={logo.filename}
                    download
                    className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-center font-semibold text-sm transition-all"
                  >
                    Download
                  </a>
                  <button
                    onClick={() => copyToClipboard(logo.filename, logo.title)}
                    className="px-4 py-2 rounded-lg border border-white/20 hover:bg-white/5 font-semibold text-sm transition-all"
                  >
                    {copiedLink === logo.title ? '✓' : 'URL'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Promotional Images */}
      <section className="py-16 bg-gradient-to-b from-deep-800 to-deep-900 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <h2 className="text-4xl font-bold mb-8 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Promotional Images & Key Art
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {promotionalImages.map((img, idx) => (
              <div key={idx} className="p-6 rounded-xl bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition-all">
                <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg mb-4 overflow-hidden">
                  <Image
                    src={img.filename}
                    alt={img.title}
                    width={800}
                    height={450}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-lg font-semibold text-cyan-300 mb-1">{img.title}</h3>
                <p className="text-sm text-slate-400 mb-2">{img.description}</p>
                <p className="text-xs text-slate-500 mb-4">Size: {img.size}</p>
                <div className="flex gap-2">
                  <a
                    href={img.filename}
                    download
                    className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-center font-semibold text-sm transition-all"
                  >
                    Download
                  </a>
                  <button
                    onClick={() => copyToClipboard(img.filename, img.title)}
                    className="px-4 py-2 rounded-lg border border-white/20 hover:bg-white/5 font-semibold text-sm transition-all"
                  >
                    {copiedLink === img.title ? '✓' : 'URL'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Faction Images */}
      <section className="py-16 bg-gradient-to-b from-deep-900 to-deep-800">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <h2 className="text-4xl font-bold mb-8 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Faction Artwork
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {factionImages.map((img, idx) => (
              <div key={idx} className="p-6 rounded-xl bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition-all">
                <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg mb-4 overflow-hidden">
                  <Image
                    src={img.filename}
                    alt={img.title}
                    width={600}
                    height={400}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-cyan-300">{img.title}</h3>
                  <span className="px-2 py-1 rounded text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                    {img.faction}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">Size: {img.size}</p>
                <div className="flex gap-2">
                  <a
                    href={img.filename}
                    download
                    className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-center font-semibold text-sm transition-all"
                  >
                    Download
                  </a>
                  <button
                    onClick={() => copyToClipboard(img.filename, img.title)}
                    className="px-4 py-2 rounded-lg border border-white/20 hover:bg-white/5 font-semibold text-sm transition-all"
                  >
                    {copiedLink === img.title ? '✓' : 'URL'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* System Screenshots */}
      <section className="py-16 bg-gradient-to-b from-deep-800 to-deep-900 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <h2 className="text-4xl font-bold mb-8 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Game Systems & Features
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {systemImages.map((img, idx) => (
              <div key={idx} className="p-6 rounded-xl bg-white/5 ring-1 ring-white/10 hover:ring-white/20 transition-all">
                <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg mb-4 overflow-hidden">
                  <Image
                    src={img.filename}
                    alt={img.title}
                    width={600}
                    height={400}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-lg font-semibold text-cyan-300 mb-1">{img.title}</h3>
                <p className="text-sm text-slate-400 mb-2">{img.description}</p>
                <p className="text-xs text-slate-500 mb-4">Size: {img.size}</p>
                <div className="flex gap-2">
                  <a
                    href={img.filename}
                    download
                    className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-center font-semibold text-sm transition-all"
                  >
                    Download
                  </a>
                  <button
                    onClick={() => copyToClipboard(img.filename, img.title)}
                    className="px-4 py-2 rounded-lg border border-white/20 hover:bg-white/5 font-semibold text-sm transition-all"
                  >
                    {copiedLink === img.title ? '✓' : 'URL'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact & Additional Info */}
      <section className="py-16 bg-gradient-to-b from-deep-900 to-deep-800">
        <div className="max-w-4xl mx-auto px-4 lg:px-6 text-center">
          <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Media Contact
          </h2>

          <div className="p-8 rounded-xl bg-white/5 ring-1 ring-white/10">
            <p className="text-xl text-slate-200 mb-4">
              For press inquiries, review copies, or additional assets:
            </p>
            <div className="space-y-2 text-lg text-slate-300">
              <p>
                <strong className="text-cyan-300">Developer:</strong> Elliot Telford
              </p>
              <p>
                <strong className="text-cyan-300">Website:</strong>{' '}
                <a href="https://elliottelford.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                  elliottelford.com
                </a>
              </p>
              <p>
                <strong className="text-cyan-300">Steam:</strong>{' '}
                <a
                  href="https://store.steampowered.com/app/4094340/Explore_the_Universe_2175"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Explore the Universe 2175
                </a>
              </p>
            </div>

            <div className="mt-8 pt-8 border-t border-white/10">
              <p className="text-sm text-slate-400">
                All assets are free to use for editorial coverage. Please credit &quot;Elliott Telford / Telford Projects&quot; when using these materials.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
