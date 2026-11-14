"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EtuTitle from "@/components/EtuTitle";
import WishlistButton from "@/components/WishlistButton";
import DemoSignupButton from "@/components/DemoSignupButton";
import DemoSign from "@/components/DemoSign";
import EyeBackdrop from "@/components/EyeBackdrop";
import { initPerformanceOptimizations } from "@/lib/performance";
import { DEMO_DATE_SHORT, DEMO_PATH } from "@/lib/campaign";
import { useDemoLive } from "@/lib/useDemoLive";

// Hero title emphasis: UNIVERSE leads, EXPLORE a step up, THE and 2175 recede
const TITLE_SCALE = { Explore: 1.12, the: 0.62, Universe: 1.55, "2175": 0.72 };
// Stacked phone title: one word per line, so the small words can be a bit bigger
const TITLE_SCALE_STACKED = { Explore: 1.12, the: 0.7, Universe: 1.55, "2175": 0.8 };

const PILLARS = [
  {
    title: "A New Galaxy Every Run",
    color: "text-cyan-300",
    bar: "bg-cyan-400",
    lead: "Spiral arms, nebulae, pulsars and thousands of worlds.",
    body: "Generated fresh every run across sixteen regions, from fungal jungles to the frozen Outer Rim.",
  },
  {
    title: "Real Cosmic Danger",
    color: "text-amber-300",
    bar: "bg-amber-400",
    lead: "Slingshot around black holes. Outrun solar storms.",
    body: "Flares and coronal mass ejections follow real observations, and no two black holes are alike.",
  },
  {
    title: "Quests and a Buried Mystery",
    color: "text-purple-300",
    bar: "bg-purple-400",
    lead: "Wake ancient stations and earn the trust of strange allies.",
    body: "Follow the Khepri Signal with Cyl to learn why her people, the Lumari, were erased.",
  },
  {
    title: "Bosses Built to Be Broken",
    color: "text-rose-300",
    bar: "bg-rose-400",
    lead: "Strip MEGABOT's armour plate by plate.",
    body: "Escape the Null Architect's prison rooms. MEGABOT remembers what you did to his empire.",
  },
  {
    title: "Bring a Squad",
    color: "text-emerald-300",
    bar: "bg-emerald-400",
    lead: "Co-op Survival for up to four pilots.",
    body: "Fill the empty seats with AI wingmates: Vega flies escort, Orion hunts and Lyra patches you up.",
  },
  {
    title: "Build Your Ship",
    color: "text-sky-300",
    bar: "bg-sky-400",
    lead: "Twenty-nine abilities and three doctrines.",
    body: "Quantum Lattice, Plasma Furnace or Event Horizon reshape your lasers, missiles, mines, shields and thrusters together.",
  },
];

// The galaxy in four numbers.
const NUMBERS = [
  { value: "16", label: "themed regions" },
  { value: "3,600+", label: "planets and moons" },
  { value: "29", label: "ship abilities" },
  { value: "1\u20134", label: "pilots, solo or co-op" },
];

// What is in the playtest build today, each told through a piece of key art.
const SHOWCASE = [
  {
    eyebrow: "Megastructure boss",
    title: "Tear Down the Solar Shade",
    image: "/art/solar-shade-scene.jpg",
    alt: "A vast dark triangular sail of hexagonal plate stretched between three stations in front of a blazing star, a small fighter flying beneath it",
    position: "center",
    href: "/evil-robots#solar-shade",
    cta: "See the Solar Shade",
    accent: "text-orange-300",
    body: [
      "The machines hang a sail across a star, wide enough to put it out. Their waves and their bosses come through the gate at its heart.",
      "Break the three Control Nodes, tear the sail and let the light back in.",
    ],
  },
  {
    eyebrow: "The final boss",
    title: "Run From the Crimson Eye",
    image: "/art/megabot-crimson-eye.jpg",
    alt: "MEGABOT's Crimson Eye: a bladed iris the size of a station burning red in a wall of dark armour plate, a tiny fighter fleeing across the lower corner",
    position: "50% 40%",
    href: "/megabot",
    cta: "Meet MEGABOT",
    accent: "text-rose-300",
    body: [
      "Every few minutes the Empire sends something bigger. Then MEGABOT comes in person: twenty-five ships tall, fifteen plates of armour, one eye.",
      "Missiles shatter the plates. Lasers burn what is underneath. When the Eye opens, move.",
    ],
  },
  {
    eyebrow: "Factions and trade",
    title: "Every Alliance Has a Price",
    image: "/art/space-dwarves-crystal-mine-scene.jpg",
    alt: "A braided, armoured Space Dwarf looks out over a glowing blue crystal mine as a mining barge hauls a load overhead",
    position: "50% 30%",
    href: "/factions/space-dwarves",
    cta: "Meet the Space Dwarves",
    accent: "text-amber-300",
    body: [
      "Dwarven clans mine the crystal seams of Yllar and answer to King Arkanvil Starhammer. Earn the guild's trust and they trade, mend and fight beside you.",
      "Threaten the guild and the whole roster comes for your hull at once.",
    ],
  },
  {
    eyebrow: "The fungal swarm",
    title: "The Hive Is Awake",
    image: "/art/mycelari-swarm-scene.jpg",
    alt: "A colossal fungal queen with a glowing orange mushroom crown rises over a spore-lit world as a white fighter burns past on cyan engines",
    position: "50% 35%",
    href: "/factions/mycelari",
    cta: "Meet the Mycelari",
    accent: "text-purple-300",
    body: [
      "The Bloom Queen seeds the field with her own children and reaps what grows. The Fungal Lord sleeps until you come too close.",
      "Fight them together and they share one life between them.",
    ],
  },
];

// The poster wall: full key art with its own lettering, each linking deeper.
const POSTERS = [
  {
    src: "/art/fleeing-the-colossal-megabot.jpg",
    alt: "Poster: a lone white fighter banks away from the colossal MEGABOT in front of a burning star. ETU, Explore the Universe 2175. Wishlist on Steam.",
    href: "/megabot",
    label: "MEGABOT",
  },
  {
    src: "/art/mycelari-swarm.jpg",
    alt: "Poster: a fungal queen rises over a spore-lit world as a fighter burns past. Explore the Universe 2175. The hive is awake. Wishlist on Steam.",
    href: "/factions/mycelari",
    label: "Mycelari",
  },
  {
    src: "/art/space-dwarves-crystal-mine.jpg",
    alt: "Poster: an armoured Space Dwarf overlooks a glowing crystal mine. Explore the Universe 2175. Every alliance has a price. Wishlist on Steam.",
    href: "/factions/space-dwarves",
    label: "Space Dwarves",
  },
  {
    src: "/art/xj9-second-in-command.jpg",
    alt: "Poster: XJ9, a horned chrome war machine with a glowing sword, stands in orbit over a blue planet. XJ9, Megabot's Second in Command. Explore the Universe 2175.",
    href: "/evil-robots#xj9",
    label: "XJ9",
  },
];

const FACTIONS = [
  {
    href: "/factions/megabot",
    image: "/art/megabot-crimson-eye.jpg",
    position: "50% 35%",
    name: "Machine Empire",
    kind: "Evil Robots",
    blurb: "MEGABOT, his legion and a sail big enough to shade a star.",
  },
  {
    href: "/factions/mycelari",
    image: "/art/mycelari-swarm-scene.jpg",
    position: "50% 30%",
    name: "Mycelari",
    kind: "Fungal Swarm",
    blurb: "One mind in a million bodies. Their armour grows back.",
  },
  {
    href: "/factions/space-dwarves",
    image: "/art/space-dwarves-crystal-mine-scene.jpg",
    position: "40% 30%",
    name: "Space Dwarves",
    kind: "Crystal Masons",
    blurb: "Miners, masons and a king who has never paid full price.",
  },
  {
    href: "/factions/wild",
    image: "/Wild_Race.jpg",
    position: "50% 28%",
    name: "Wild Clans",
    kind: "The Woak",
    blurb: "Mecha-bears, bee swarms and walking trees. Truce before teeth.",
  },
  {
    href: "/factions/lumari",
    image: "/cyl/cyl-key-art.webp",
    position: "18% 50%",
    name: "Lumari",
    kind: "Crystal Intelligences",
    blurb: "Erased by MEGABOT. Cyl is what is left, and she flies with you.",
  },
  {
    href: "/factions/terran-federation",
    image: "/emblems/terran-federation.webp",
    position: "center",
    name: "Terran Federation",
    kind: "Humanity",
    blurb: "\u201cAlliances are how humanity survived.\u201d",
  },
];

export default function HomePage() {
  const demoLive = useDemoLive();

  useEffect(() => {
    initPerformanceOptimizations();

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

  return (
    <>
      <Header />

      {/* HERO — brand, then the demo-day funnel (Sign up › Wishlist), then the pitch */}
      <section
        id="home"
        className="relative min-h-[92svh] flex items-center overflow-hidden"
      >
        {/* MEGABOT's Evil Eye: the key art, alive behind the title */}
        <EyeBackdrop />

        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 lg:px-6 pt-8 pb-12 md:pt-14 md:pb-16 text-center">
          {/* The gap under this line is left open for the Eye to look out
              over the title. The line crosses the brightest part of the art,
              so it carries its own dark backing. */}
          <div className="reveal mb-[19vw] sm:mb-[14vw] lg:mb-[5.8vw]">
            <p className="inline-block px-4 py-1.5 rounded-2xl sm:rounded-full bg-slate-950/60 backdrop-blur-sm uppercase font-semibold tracking-[0.18em] text-sm md:text-lg text-white">
              Elliot Telford of Telford Projects Presents
            </p>
          </div>

          {/* Phones get a stacked title so each line can run much larger */}
          <h1>
            <EtuTitle
              as="span"
              text={["Explore", "the", "Universe", "2175"]}
              wordScale={TITLE_SCALE_STACKED}
              ruled={[3]}
              fit
              className="block sm:hidden -mx-2 text-[4.5rem]"
            />
            <EtuTitle
              as="span"
              text={["Explore the", "Universe", "2175"]}
              wordScale={TITLE_SCALE}
              ruled={[2]}
              fit
              className="hidden sm:block mx-auto sm:text-7xl md:text-8xl lg:text-[8rem] xl:text-[8.75rem]"
            />
          </h1>

          {/* What the game is, in one line, before anything asks for a click */}
          <p
            className="reveal mt-3 md:mt-4 text-xl md:text-2xl font-bold text-white leading-snug text-balance"
            style={{ textShadow: "0 2px 4px rgba(0,0,0,.95), 0 0 18px rgba(0,0,0,.9)" }}
          >
            An open-galaxy space adventure.{" "}
            <br className="lg:hidden" />
            Fly solo or in four-pilot co-op.
          </p>

          {/* Demo day comes straight after, so the launch board and its
              buttons share the first screen with the Eye: board, then
              Sign up › Wishlist */}
          <div className="reveal mt-5 md:mt-6 flex justify-center">
            <DemoSign />
          </div>

          <div className="reveal mt-5 md:mt-6 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5">
            <DemoSignupButton
              placement="home-hero"
              className="btn-3d btn-3d-demo w-full sm:w-auto text-lg md:text-xl md:px-9 md:py-4 whitespace-nowrap"
            />

            <WishlistButton
              placement="home-hero"
              className="btn-3d btn-3d-steam group w-full sm:w-auto text-lg md:text-xl md:px-9 md:py-4 whitespace-nowrap"
            >
              <SteamIcon className="w-7 h-7 transition-transform group-hover:scale-110" />
              <span>Wishlist on Steam</span>
            </WishlistButton>
          </div>

          <p
            className="reveal mt-5 mx-auto max-w-2xl text-lg md:text-xl text-slate-100 text-balance"
            style={{ textShadow: "0 2px 8px rgba(0,0,0,.85)" }}
          >
            {demoLive
              ? "The demo is live. Create your commander account to claim your callsign."
              : "Create your commander account, wishlist on Steam, and be ready when the demo lands."}{" "}
            <Link
              href={DEMO_PATH}
              className="block sm:inline py-2.5 sm:py-0 font-semibold text-cyan-300 underline decoration-cyan-400/50 underline-offset-4 hover:text-cyan-200 hover:decoration-cyan-200 transition-colors whitespace-nowrap"
            >
              How demo day works →
            </Link>
          </p>

          <div className="hero-rule reveal mt-9 md:mt-12" aria-hidden="true" />

          {/* The pitch: short sentences, one idea each */}
          <p
            className="reveal mt-7 md:mt-9 mx-auto max-w-4xl text-xl md:text-[1.7rem] font-bold text-white leading-snug text-balance"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,.9)" }}
          >
            Explore a new galaxy full of quests, alien bosses and shifting
            alliances. A war rages around its{" "}
            <span className="hero-key hero-key--amber">Black Holes</span>, over
            stars and planets and the resources they hold. Conquer it, or{" "}
            <span className="hero-key">save the galaxy</span>.
          </p>

          <p
            className="reveal mt-5 md:mt-6 mx-auto max-w-3xl text-lg md:text-xl text-slate-100 leading-relaxed text-balance"
            style={{ textShadow: "0 2px 8px rgba(0,0,0,.85)" }}
          >
            Chart everything from{" "}
            <span className="hero-key hero-key--amber">SuperMassive Black Holes</span>{" "}
            to tiny moons. Superboost around stars. Uncover lost civilizations
            with <span className="hero-key">Cyl</span>, a crystal companion who
            learns who you are. Together, with allies, you&apos;ll fight{" "}
            <span className="hero-key hero-key--rose">Megabot</span>, a machine
            overlord that copies itself, upgrades itself and adapts to how you
            play.
          </p>

          <p className="reveal mt-8 text-base md:text-lg font-medium text-slate-300">
            Windows · macOS · Linux · Early Access 2027
          </p>
        </div>
      </section>

      {/* What makes 2175 different */}
      <section
        id="features"
        className="py-16 md:py-24 bg-gradient-to-b from-deep-900 via-indigo-950/20 to-deep-900"
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <header className="reveal text-center max-w-3xl mx-auto mb-10 md:mb-14">
            <h2 className="font-display text-4xl md:text-6xl font-bold text-white leading-tight text-balance">
              What Awaits Out There
            </h2>
          </header>

          <dl className="reveal grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10 md:mb-14">
            {NUMBERS.map((n) => (
              <div
                key={n.label}
                className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10 px-4 py-6 text-center"
              >
                <dd className="font-display text-4xl md:text-5xl font-bold text-white">{n.value}</dd>
                <dt className="mt-2 text-base md:text-lg text-slate-200">{n.label}</dt>
              </div>
            ))}
          </dl>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {PILLARS.map((p) => (
              <article
                key={p.title}
                className="reveal p-7 md:p-9 rounded-2xl bg-white/[0.04] ring-1 ring-white/10"
              >
                <span className={`block h-1 w-12 rounded-full mb-6 ${p.bar}`} aria-hidden="true" />
                <h3 className={`text-2xl md:text-3xl font-bold leading-tight text-balance ${p.color}`}>
                  {p.title}
                </h3>
                <p className="mt-3 text-lg md:text-xl text-slate-100 leading-relaxed">
                  <span className="font-semibold text-white">{p.lead}</span>{" "}
                  {p.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Official trailer — second on the page: the fastest way to see what
          the game is */}
      <section id="trailer" className="reveal py-16 md:py-24 bg-deep-900">
        <div className="max-w-6xl mx-auto px-4 lg:px-6">
          <header className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="font-display text-4xl md:text-6xl font-bold text-white leading-tight text-balance">
              Watch the Trailer
            </h2>
            <p className="mt-4 text-lg md:text-2xl text-slate-100 leading-relaxed">
              Black holes, solar storms, boss fights and the galaxy in motion.
            </p>
          </header>

          <div className="relative aspect-video rounded-2xl overflow-hidden ring-2 ring-indigo-500/30 shadow-[0_0_60px_rgba(99,102,241,0.3)]">
            <video
              controls
              poster="/art/fleeing-the-colossal-megabot-scene.jpg"
              className="w-full h-full object-cover bg-black"
              preload="metadata"
            >
              <source src="/ETU_Cinematic_Trailer_4K.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>

          <div className="mt-10 flex justify-center">
            <WishlistButton placement="home-features" className="btn-3d btn-3d-steam group text-lg">
              <SteamIcon className="w-6 h-6 transition-transform group-hover:scale-110" />
              <span>Wishlist on Steam</span>
            </WishlistButton>
          </div>
        </div>
      </section>

      {/* In the playtest now — the current build, told through key art */}
      <section id="now-playing" className="py-16 md:py-24 bg-deep-900">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <header className="reveal text-center max-w-3xl mx-auto mb-10 md:mb-16">
            <p className="uppercase font-semibold tracking-[0.18em] text-sm md:text-base text-emerald-300">
              In the free playtest now
            </p>
            <h2 className="mt-3 font-display text-4xl md:text-6xl font-bold text-white leading-tight text-balance">
              The War So Far
            </h2>
          </header>

          <div className="space-y-12 md:space-y-20">
            {SHOWCASE.map((item, i) => (
              <article
                key={item.title}
                className="reveal grid lg:grid-cols-2 gap-6 lg:gap-12 items-center"
              >
                <Link
                  href={item.href}
                  className={`group relative block aspect-[16/10] rounded-2xl overflow-hidden ring-1 ring-white/10 hover:ring-cyan-400/40 transition ${
                    i % 2 === 1 ? "lg:order-2" : ""
                  }`}
                >
                  <Image
                    src={item.image}
                    alt={item.alt}
                    fill
                    className="object-cover group-hover:scale-[1.03] transition-transform duration-700"
                    style={{ objectPosition: item.position }}
                    sizes="(max-width: 1024px) 100vw, 640px"
                  />
                </Link>
                <div>
                  <p className={`uppercase font-semibold tracking-wider text-sm md:text-base ${item.accent}`}>
                    {item.eyebrow}
                  </p>
                  <h3 className="mt-2 font-display text-3xl md:text-5xl font-bold text-white leading-tight text-balance">
                    {item.title}
                  </h3>
                  {item.body.map((para) => (
                    <p key={para} className="mt-4 text-lg md:text-xl text-slate-100 leading-relaxed">
                      {para}
                    </p>
                  ))}
                  <Link
                    href={item.href}
                    className="mt-4 inline-flex items-center gap-2 py-2.5 text-lg font-semibold text-cyan-300 hover:text-cyan-200 transition-colors"
                  >
                    {item.cta} <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Poster wall — the key art with its own lettering */}
      <section
        id="key-art"
        className="py-16 md:py-24 bg-gradient-to-b from-deep-900 via-indigo-950/20 to-deep-900"
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <header className="reveal text-center max-w-3xl mx-auto mb-10 md:mb-14">
            <h2 className="font-display text-4xl md:text-6xl font-bold text-white leading-tight text-balance">
              Dispatches From 2175
            </h2>
            <p className="mt-4 text-lg md:text-2xl text-slate-100 leading-relaxed">
              New key art from the front. Pick one to read the dossier.
            </p>
          </header>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {POSTERS.map((p) => (
              <Link
                key={p.src}
                href={p.href}
                aria-label={`${p.label}: read the dossier`}
                className="reveal group block rounded-xl md:rounded-2xl overflow-hidden ring-1 ring-white/10 hover:ring-cyan-400/50 hover:-translate-y-1 transition duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
              >
                <Image
                  src={p.src}
                  alt={p.alt}
                  width={1122}
                  height={1402}
                  className="w-full h-auto"
                  sizes="(max-width: 1024px) 50vw, 300px"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Factions */}
      <section
        id="factions"
        className="py-16 md:py-24 bg-gradient-to-b from-deep-900 to-deep-800"
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <header className="reveal text-center max-w-3xl mx-auto mb-10 md:mb-14">
            <h2 className="font-display text-4xl md:text-6xl font-bold text-white leading-tight text-balance">
              The Factions
            </h2>
            <p className="mt-4 text-lg md:text-2xl text-slate-100 leading-relaxed">
              Befriend them, trade with them or fight them. Sealing an alliance with one
              angers its enemies.
            </p>
          </header>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FACTIONS.map((f) => (
              <Link
                key={f.href}
                href={f.href}
                className="reveal group rounded-2xl overflow-hidden bg-white/5 ring-1 ring-white/10 hover:ring-cyan-400/40 transition"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src={f.image}
                    alt={`${f.name}, ${f.kind}`}
                    width={640}
                    height={400}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    style={{ objectPosition: f.position }}
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-white">
                    {f.name}
                  </h3>
                  <p className="mt-0.5 uppercase font-semibold tracking-wider text-sm md:text-base text-cyan-300">
                    {f.kind}
                  </p>
                  <p className="mt-2 text-lg text-slate-100 leading-relaxed">
                    {f.blurb}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <div className="reveal mt-10 flex justify-center">
            <Link href="/factions" className="btn-ghost btn-ghost--lg">
              See every faction <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA — same order as the hero: Sign up › Wishlist › Play.
          The lower half of the hero art closes the page: the fighter still
          running, the launch board over it. */}
      <section
        id="download"
        className="relative py-16 md:py-24 bg-deep-900 border-t border-amber-400/25 overflow-hidden"
      >
        <Image
          src="/art/megabot-evil-eye.jpg"
          alt=""
          fill
          className="object-cover"
          style={{ objectPosition: "50% 74%" }}
          sizes="100vw"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, #070b1f 0, rgba(4,6,20,.62) 24%, rgba(4,6,20,.66) 62%, #040614 100%)",
          }}
          aria-hidden="true"
        />

        <div className="relative max-w-6xl mx-auto px-4 lg:px-6">
          <header className="reveal text-center max-w-3xl mx-auto mb-10 md:mb-14">
            <h2 className="font-display text-4xl md:text-6xl font-bold text-white leading-tight text-balance">
              Join the Mission
            </h2>
            <p className="mt-4 text-lg md:text-2xl text-slate-100 leading-relaxed">
              {demoLive
                ? "The free demo is live on Steam."
                : "Three steps and you are ready for demo day."}
            </p>
          </header>

          <div className="reveal -mt-2 md:-mt-4 mb-10 md:mb-14 flex justify-center">
            <DemoSign />
          </div>

          <ol className="grid md:grid-cols-3 gap-6 lg:gap-8">
            <CtaCard
              step="Step 1"
              title="Create Your Account"
              body="Free, and it takes a minute. Claim your callsign, your commander profile and your place on the leaderboard."
              featured={!demoLive}
            >
              <DemoSignupButton
                placement="home-cta-signup"
                signupOnly
                className={
                  demoLive
                    ? CTA_GHOST_CLASS
                    : "btn-3d btn-3d-demo w-full whitespace-nowrap !px-5 text-base md:text-lg"
                }
              >
                {demoLive ? "Create Account" : "Sign up for demo day"}
              </DemoSignupButton>
            </CtaCard>
            <CtaCard
              step="Step 2"
              title="Wishlist on Steam"
              body="The best way to support the game. Steam tells you when Early Access launches."
            >
              <WishlistButton placement="home-cta-wishlist" className={CTA_GHOST_CLASS}>
                <SteamIcon className="w-6 h-6" />
                Wishlist Now
              </WishlistButton>
            </CtaCard>
            <CtaCard
              step="Step 3"
              title={demoLive ? "Play the Free Demo" : `Play on ${DEMO_DATE_SHORT}`}
              body={
                demoLive
                  ? "The demo is out now on Steam. Download it and fly."
                  : "The free demo lands on Steam on Thanksgiving Day. Your checklist keeps the countdown."
              }
              featured={demoLive}
            >
              {demoLive ? (
                <WishlistButton
                  placement="home-cta-demo"
                  intent="demo"
                  className="btn-3d btn-3d-demo w-full whitespace-nowrap !px-5 text-base md:text-lg"
                >
                  Play the free demo
                </WishlistButton>
              ) : (
                <Link href={DEMO_PATH} className={CTA_GHOST_CLASS}>
                  See the Checklist
                </Link>
              )}
            </CtaCard>
          </ol>
        </div>
      </section>

      <Footer />
    </>
  );
}

const CTA_GHOST_CLASS =
  "btn-ghost btn-ghost--lg w-full justify-center whitespace-nowrap !px-5 !text-base";

function CtaCard({
  step,
  title,
  body,
  featured = false,
  children,
}: {
  step: string;
  title: string;
  body: string;
  /** The step to take right now: highlighted in demo-day amber. */
  featured?: boolean;
  /** The card's button. */
  children: React.ReactNode;
}) {
  return (
    <li
      className={`reveal flex flex-col p-7 md:p-9 rounded-2xl bg-slate-950/75 backdrop-blur-md ${
        featured
          ? "bg-gradient-to-b from-amber-500/20 to-amber-500/5 ring-2 ring-amber-400/60 shadow-[0_0_60px_rgba(251,191,36,0.22)]"
          : "ring-1 ring-white/10"
      }`}
    >
      <span className={`text-base md:text-lg font-bold ${featured ? "text-amber-300" : "text-cyan-300"}`}>
        {step}
      </span>
      <h3 className="mt-1 text-2xl md:text-3xl font-bold text-white leading-tight">
        {title}
      </h3>
      <p className="mt-3 mb-7 flex-1 text-lg text-slate-100 leading-relaxed">
        {body}
      </p>
      {children}
    </li>
  );
}

function SteamIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" />
    </svg>
  );
}
