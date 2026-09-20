import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SITE_URL } from "@/lib/siteUrl";

const STEAM_URL =
  "https://store.steampowered.com/app/4094340/Explore_the_Universe_2175";

export const metadata: Metadata = {
  title: "How Cyl Works — Companion AI | Explore the Universe 2175",
  description:
    "A devlog on Cyl, the Lumari crystal consciousness who flies beside you: how her combat targeting, predictive aim, support doctrine, expressions and survey scan are built — with the measurements behind each one.",
  alternates: { canonical: "./" },
  openGraph: {
    title: "How Cyl Works — Companion AI | Explore the Universe 2175",
    description:
      "How Cyl's targeting, support doctrine, expressions and survey scan are built — and how their behavior changes the experience of flying with her.",
    url: `${SITE_URL}/cyl`,
    siteName: "Explore the Universe 2175",
    images: [{ url: `${SITE_URL}/cyl/cyl-expressions.png`, width: 960, height: 774 }],
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "How Cyl Works — Companion AI | Explore the Universe 2175",
    description:
      "How Cyl's targeting, support doctrine, expressions and survey scan are built.",
    images: [`${SITE_URL}/cyl/cyl-expressions.png`],
  },
};

/* ---------------------------------------------------------------- data --- */

// The assist ladder Cyl walks to decide what she is shooting at, in priority
// order (CYLAIM-01).
const ASSIST_LADDER = [
  {
    rung: "1",
    signal: "Explicit focus target",
    detail: "A focus set by the game, while its freshness window holds.",
  },
  {
    rung: "1b",
    signal: "Your weapon lock",
    detail:
      "The target you clicked. Resolved through the same ladder her targeting profile publishes, so there is only ever one answer to “what did the player lock”.",
  },
  {
    rung: "2",
    signal: "Whatever last hit the ship",
    detail: "The damage engine stamps the attacker; she reads it inside its window.",
  },
  {
    rung: "3",
    signal: "The direction the last hit came from",
    detail: "A ±35° cone sweep of everything near her.",
  },
  {
    rung: "4",
    signal: "The direction you last fired",
    detail: "The same sweep, against your own firing line.",
  },
];

// Closest approach between her real launched bolt and the real target, walked
// forward together at 1ms. A hit allows about 24.5px.
const LEAD_EVIDENCE = [
  { situation: "Crossing at 260 px/s, at full range", before: "45.6 px", after: "0.1 px", hit: true },
  { situation: "Crossing at 400 px/s, at full range", before: "67.8 px", after: "0.3 px", hit: true },
  { situation: "Crossing at 260 px/s, at half range", before: "27.4 px", after: "0.4 px", hit: true },
  { situation: "Closing at 300 px/s", before: "0.8 px", after: "0.5 px", hit: true },
  { situation: "Fleeing at 300 px/s", before: "1.1 px", after: "0.3 px", hit: true },
  { situation: "Stationary", before: "0.4 px", after: "0.4 px", hit: true },
  { situation: "Outrunning the bolt at 1400 px/s", before: "157.6 px", after: "157.6 px", hit: false },
];

// The four support lanes, and the condition each one waits for (CYLSUP-01).
const SUPPORT_LANES = [
  {
    ability: "Healing Field",
    kind: "Sustain",
    fires: "Hull at or under 55% — or under 78% with the shield under 25%.",
    cost: "32 of the ship's energy. She will not reach for it without 1.6× that in headroom.",
    accent: "emerald",
  },
  {
    ability: "Crystal Ascension",
    kind: "Emergency",
    fires: "Hull at or under 30% — or under 45% with the shield under 10%.",
    cost: "Half her energy, and a 45-second cooldown. It sits strictly below the heal.",
    accent: "purple",
  },
  {
    ability: "Energy Nova",
    kind: "Crowd control",
    fires: "Three or more hostiles inside the blast's real radius, and the ship taking damage.",
    cost: "Every point of her energy. It stands down on a frame the ultimate fired.",
    accent: "cyan",
  },
  {
    ability: "Taunt / Distract",
    kind: "Peel",
    fires: "The ship is pressed and something live just hit it.",
    cost: "Distract instead of Taunt once two or more hostiles crowd the ship.",
    accent: "amber",
  },
];

// Her face, first match wins (CYL3D-03 / etu.cyl.expression).
const EXPRESSION_LADDER = [
  { face: "Dead", trigger: "She is gone" },
  { face: "Wince", trigger: "A hit landed in the last 0.45 s" },
  { face: "Hurt", trigger: "Hull at or under 25%" },
  { face: "Scared", trigger: "Fleeing" },
  { face: "Worried", trigger: "Hull at or under 50%" },
  { face: "Delighted", trigger: "A discovery in the last 2.5 s" },
  { face: "Determined", trigger: "Fighting" },
  { face: "Curious", trigger: "Scanning" },
  { face: "Tired", trigger: "Energy at or under 15%" },
  { face: "Content", trigger: "Latched to the ship, safe" },
  { face: "Happy", trigger: "Otherwise — her mood only shades the smile" },
];

const ACCENTS: Record<string, { border: string; text: string; bg: string }> = {
  emerald: { border: "border-emerald-500/30", text: "text-emerald-300", bg: "bg-emerald-500/5" },
  purple: { border: "border-purple-500/30", text: "text-purple-300", bg: "bg-purple-500/5" },
  cyan: { border: "border-cyan-500/30", text: "text-cyan-300", bg: "bg-cyan-500/5" },
  amber: { border: "border-amber-500/30", text: "text-amber-300", bg: "bg-amber-500/5" },
};

/* ---------------------------------------------------------- components --- */

function SectionHeading({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="eyebrow mb-2">{eyebrow}</div>
      <h2 className="font-display text-3xl md:text-4xl font-bold etu-headline-grad">
        {children}
      </h2>
    </div>
  );
}

function Figure({
  src,
  alt,
  width,
  height,
  caption,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption: React.ReactNode;
}) {
  return (
    <figure className="my-8">
      <div className="rounded-xl overflow-hidden border border-cyan-500/20 bg-black/60 shadow-[0_0_40px_rgba(34,211,238,0.08)]">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="w-full h-auto"
          sizes="(max-width: 768px) 100vw, 800px"
        />
      </div>
      <figcaption className="mt-3 text-sm text-slate-400 leading-relaxed">{caption}</figcaption>
    </figure>
  );
}

function Readout({ lines }: { lines: string[] }) {
  return (
    <pre className="my-6 overflow-x-auto rounded-xl border border-cyan-500/20 bg-slate-950/80 p-4 text-[12px] md:text-[13px] leading-relaxed text-cyan-200/90 font-mono">
      {lines.join("\n")}
    </pre>
  );
}

/* ---------------------------------------------------------------- page --- */

export default function CylPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-deep-900 text-slate-100">
        {/* ------------------------------------------------------- hero --- */}
        <section className="relative overflow-hidden border-b border-cyan-500/10">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/25 via-slate-950 to-deep-900" />
          <div className="absolute inset-0 opacity-30 etu-starfield" />

          <div className="relative z-10 max-w-4xl mx-auto px-4 lg:px-6 pt-14 pb-12">
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <Link
                href="/devlog"
                className="eyebrow text-slate-400 hover:text-cyan-300 transition-colors"
              >
                &larr; Elliot&rsquo;s Devlog
              </Link>
              <span className="etu-pill etu-pill--purple">Companion AI</span>
              <span className="etu-pill etu-pill--cyan">
                <span className="ping" />
                Development build
              </span>
            </div>

            <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight etu-devlog-grad">
              How Cyl Works
            </h1>
            <p className="mt-4 text-xl md:text-2xl text-slate-200">
              Companion AI in <em>Explore the Universe 2175</em>
            </p>

            <div className="mt-6 space-y-4 text-lg text-slate-300 leading-relaxed">
              <p>
                Cyl is your companion in <em>Explore the Universe 2175</em>: a Lumari crystal
                consciousness traveling inside a drone body. She explores alongside you, assists in
                combat, and has her own history with Megabot.
              </p>
              <p>
                Making that relationship work requires several systems to agree about what is
                happening. Her targeting needs to recognize the enemy you are fighting. Her support
                abilities need to respond to danger. Her expressions need to communicate what she is
                experiencing.
              </p>
              <p>
                This devlog looks at how those systems are developing&mdash;and how their behavior
                changes the experience of flying with her.
              </p>
            </div>

            <Figure
              src="/cyl/cyl-docked.png"
              alt="Cyl latched to the player's ship at three zoom levels, her dome lit and her thrusters folded in"
              width={1260}
              height={438}
              caption={
                <>
                  Cyl latched to the ship at three zoom levels. Attached, she recharges her shield
                  and regenerates hull at 1/s&mdash;and her face goes to <em>content</em>.
                </>
              }
            />
          </div>
        </section>

        {/* ----------------------------------------------- build status --- */}
        <section className="max-w-4xl mx-auto px-4 lg:px-6 py-14">
          <SectionHeading eyebrow="Build status">What you are looking at</SectionHeading>

          <p className="text-slate-300 leading-relaxed">
            Everything below is measured against the current internal build&mdash;
            <strong className="text-slate-100"> development epoch 763</strong>, the frozen image the
            engine&rsquo;s test lane verifies (801 test modules, 13,180 test methods). Cyl&rsquo;s
            combat and support AI landed at epochs 667&ndash;671; her low-health behavior at
            694&ndash;697; her sphere body, survey hologram and face at epochs 760, 761 and 762,
            all on September 19, 2026.
          </p>

          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="etu-glass p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="etu-pill etu-pill--green">In the build</span>
              </div>
              <ul className="space-y-3 text-slate-300 text-sm leading-relaxed">
                <li>
                  <strong className="text-emerald-300">Companion targeting.</strong> She reads your
                  weapon lock, your recent attackers, and your firing direction.
                </li>
                <li>
                  <strong className="text-emerald-300">Predictive aim.</strong> Her bolts lead a
                  moving target instead of chasing where it was.
                </li>
                <li>
                  <strong className="text-emerald-300">Autonomous support.</strong> Healing Field,
                  Crystal Ascension, Energy Nova and the Taunt/Distract peel, each on its own
                  trigger.
                </li>
                <li>
                  <strong className="text-emerald-300">Expressions.</strong> Eleven faces resolved
                  from her live state, every frame.
                </li>
                <li>
                  <strong className="text-emerald-300">Survey hologram.</strong> The scan effect,
                  beam contact and readout cards.
                </li>
                <li>
                  <strong className="text-emerald-300">Low-health warning.</strong> The red aura,
                  the dialogue asking you to attach her, and regeneration while latched.
                </li>
              </ul>
            </div>

            <div className="etu-glass p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="etu-pill etu-pill--amber">
                  <span className="ping" />
                  Still in development
                </span>
              </div>
              <ul className="space-y-3 text-slate-300 text-sm leading-relaxed">
                <li>
                  <strong className="text-amber-300">Dialogue and personality.</strong> The
                  conversation layer that reads the same state her face does. On the{" "}
                  <Link href="/roadmap" className="text-cyan-400 hover:text-cyan-300 underline">
                    Milestone 1 roadmap
                  </Link>
                  .
                </li>
                <li>
                  <strong className="text-amber-300">Her scan-orbit heading.</strong> The formula
                  that turns her on an orbit is the mirror of the one that turns her on a course, so
                  she flies sideways on the horizontal legs of a scan.
                </li>
                <li>
                  <strong className="text-amber-300">The Predictive Lead upgrade.</strong> The node
                  promises leading vectors; leading is now baseline, and the node grants projectile
                  speed. That claim needs rewriting or the node needs a mechanic.
                </li>
                <li>
                  <strong className="text-amber-300">Where the Healing Field lands.</strong> It is
                  cast at the ship&rsquo;s position and the ship flies on.
                </li>
                <li>
                  <strong className="text-amber-300">True AI conversation.</strong> The long-term
                  goal: Cyl talking to you through a language model, not a dialogue tree.
                </li>
              </ul>
            </div>
          </div>

          <p className="mt-6 text-sm text-slate-400 leading-relaxed">
            Playtest builds are cut from this line.{" "}
            <Link href="/alpha-testing" className="text-cyan-400 hover:text-cyan-300 underline">
              Closed alpha applications
            </Link>{" "}
            are open, and the Steam playtest is live.
          </p>
        </section>

        {/* -------------------------------------------------- targeting --- */}
        <section className="max-w-4xl mx-auto px-4 lg:px-6 py-14 border-t border-slate-800/60">
          <SectionHeading eyebrow="Combat targeting">
            Shooting what you are actually fighting
          </SectionHeading>

          <div className="space-y-4 text-slate-300 leading-relaxed">
            <p>One of the clearest examples is combat targeting.</p>
            <p>
              For Cyl to help in a fight, she needs to understand where the player&rsquo;s attention
              is directed. The companion targeting work connects her decisions to the player&rsquo;s
              weapon lock, recent attackers, and firing direction. Those signals give her a way to
              support what you are doing.
            </p>
            <p>
              Each possible target still needs to pass basic checks. Is it hostile? Is it alive? Can
              she reach it? If your selected target is outside her range, the decision process needs
              to continue so she can respond to another immediate threat.
            </p>
          </div>

          <div className="mt-8 overflow-x-auto rounded-xl border border-cyan-500/20 bg-slate-950/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cyan-500/20 text-left">
                  <th className="px-4 py-3 eyebrow">Priority</th>
                  <th className="px-4 py-3 eyebrow">Signal</th>
                  <th className="px-4 py-3 eyebrow">What it is</th>
                </tr>
              </thead>
              <tbody>
                {ASSIST_LADDER.map((rung) => (
                  <tr key={rung.rung} className="border-b border-slate-800/60 last:border-0">
                    <td className="px-4 py-3 font-mono text-cyan-300 align-top">{rung.rung}</td>
                    <td className="px-4 py-3 text-slate-100 align-top whitespace-nowrap">
                      {rung.signal}
                    </td>
                    <td className="px-4 py-3 text-slate-400 align-top">{rung.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-slate-300 leading-relaxed">
            The important part is that the ladder <em>walks</em>. An earlier shape committed to the
            highest rung that had anything in it&mdash;and if that candidate turned out to be dead,
            friendly or out of reach, she fired at nothing and silently skipped every lane below.
            A lock beyond her 220px reach is common, so committing to it would have suppressed
            return fire against whatever was actually chewing on the ship.
          </p>

          <Readout
            lines={[
              "player locked=boss, no assist hint     ->  Cyl shot 'boss'      via assist:player_lock",
              "player locked=boss, explicit focus set ->  Cyl shot 'trash'     via assist:focus_target",
              "lock 4000px away + a live attacker     ->  Cyl shot 'attacker'  via assist:last_attacker",
              "lock is dead + a live attacker         ->  Cyl shot 'attacker'  via assist:last_attacker",
              "friendly station locked + a raider     ->  Cyl shot 'raider'    via direct_select",
              "no lock, no attacker                   ->  Cyl shot the nearest via direct_select",
            ]}
          />

          <p className="text-slate-300 leading-relaxed">
            That fifth line is the one worth pausing on. You can lock a friendly station&mdash;the
            game lets you&mdash;and handing that lock straight to her trigger would be a way to have
            Cyl open fire on an ally. The hostility check surviving inside the walk is what stops it.
          </p>
        </section>

        {/* ------------------------------------------------------ leading --- */}
        <section className="max-w-4xl mx-auto px-4 lg:px-6 py-14 border-t border-slate-800/60">
          <SectionHeading eyebrow="Predictive aim">Hitting something that moves</SectionHeading>

          <div className="space-y-4 text-slate-300 leading-relaxed">
            <p>Then comes the problem of hitting something that moves.</p>
            <p>
              Her projectiles take time to travel. Aiming at an enemy&rsquo;s current position can
              send a shot through space that the enemy has already left. Predictive aiming uses the
              target&rsquo;s velocity and the projectile&rsquo;s speed to estimate an interception
              point.
            </p>
            <p>
              The numbers make it concrete. Over her 220px reach, at roughly 1,115 px/s, a bolt is
              in flight for up to 180ms. A target crossing at 260 px/s covers 47px in that
              time&mdash;and a hit allows about 24.5px. She could not hit a crossing target at any
              range, and a crossing target is most of what you need shot.
            </p>
          </div>

          <div className="mt-8 overflow-x-auto rounded-xl border border-cyan-500/20 bg-slate-950/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cyan-500/20 text-left">
                  <th className="px-4 py-3 eyebrow">Situation</th>
                  <th className="px-4 py-3 eyebrow">Miss, before</th>
                  <th className="px-4 py-3 eyebrow">Miss, after</th>
                </tr>
              </thead>
              <tbody>
                {LEAD_EVIDENCE.map((row) => (
                  <tr key={row.situation} className="border-b border-slate-800/60 last:border-0">
                    <td className="px-4 py-3 text-slate-200">{row.situation}</td>
                    <td className="px-4 py-3 font-mono text-slate-400">{row.before}</td>
                    <td
                      className={`px-4 py-3 font-mono ${
                        row.hit ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {row.after}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Closest approach between the bolt she really launches and the target, walked forward
            together a millisecond at a time. Under about 24.5px is a hit.
          </p>

          <div className="mt-8 space-y-4 text-slate-300 leading-relaxed">
            <p>
              That calculation has limits. A target can change direction after the shot leaves, and
              some situations have no usable interception solution. The system needs a sensible
              fallback as well as a good prediction.
            </p>
            <p>
              The last row above is that fallback, not a defect: nothing intercepts a target moving
              faster than the projectile chasing it. When the solve fails&mdash;no velocity to read,
              no positive root, a target with no motion at all&mdash;the aim degrades to the raw
              target position, which is exactly the straight shot she used to take. A lead solved
              against the wrong speed would be worse than no lead at all: it is a confident aim at
              the wrong place.
            </p>
            <p>
              For the player, all of that should produce a simple result: Cyl is paying attention to
              the fight you are actually in.
            </p>
          </div>
        </section>

        {/* -------------------------------------------------- support AI --- */}
        <section className="max-w-4xl mx-auto px-4 lg:px-6 py-14 border-t border-slate-800/60">
          <SectionHeading eyebrow="Support doctrine">
            Deciding when an ability is worth spending
          </SectionHeading>

          <div className="space-y-4 text-slate-300 leading-relaxed">
            <p>
              Her defensive behavior presents a different problem: deciding when an ability is worth
              spending.
            </p>
            <p>
              The support logic considers the ship&rsquo;s hull, shields, nearby threats, available
              abilities, energy, and cooldowns. Healing, emergency protection, and crowd control
              serve different situations. Their priorities have to reflect that.
            </p>
          </div>

          <div className="mt-8 grid gap-4">
            {SUPPORT_LANES.map((lane) => {
              const a = ACCENTS[lane.accent];
              return (
                <div key={lane.ability} className={`rounded-xl border ${a.border} ${a.bg} p-5`}>
                  <div className="flex flex-wrap items-baseline gap-3 mb-2">
                    <h3 className={`font-display text-lg font-bold ${a.text}`}>{lane.ability}</h3>
                    <span className="eyebrow">{lane.kind}</span>
                  </div>
                  <p className="text-slate-200 text-sm leading-relaxed">{lane.fires}</p>
                  <p className="text-slate-400 text-sm leading-relaxed mt-2">{lane.cost}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 space-y-4 text-slate-300 leading-relaxed">
            <p>
              For example, the Energy Nova decision considers enemies within the blast&rsquo;s
              actual reach&mdash;the radius it will have at her <em>current</em> energy, not a
              nominal figure, because it spends every point she has and a blast landing short of the
              hostiles that provoked it would spend all of it for nothing. It also checks whether the
              ship is under pressure. A nearby group of enemies does not automatically justify
              spending the energy.
            </p>
            <p>
              Resources matter across both characters. Healing Field uses the ship&rsquo;s energy, so
              automatic assistance needs to preserve enough reserve for the player to keep
              acting&mdash;she will not reach for it without 1.6&times; its cost in headroom.
              Assistance that leaves you unable to boost or shoot is not assistance. Other abilities
              compete for Cyl&rsquo;s energy: the nova and the ultimate draw on the same pool, so the
              nova stands down on a frame the ultimate fired.
            </p>
            <p>
              These decisions make progression meaningful: every lane is gated by the
              ability&rsquo;s own unlock, so a Cyl who has not earned Healing Field sits at 20% hull
              and reports that she cannot help. Unlocking an ability expands what her support system
              can do.
            </p>
          </div>
        </section>

        {/* --------------------------------------------- worked example --- */}
        <section className="max-w-4xl mx-auto px-4 lg:px-6 py-14 border-t border-slate-800/60">
          <SectionHeading eyebrow="Ten seconds">What that looks like in a fight</SectionHeading>

          <p className="text-slate-300 leading-relaxed">
            Here is ten real seconds at 60fps, driven through the live scheduler and the live
            ship-side field tick. You are at 80 hull of 200&mdash;40%&mdash;with your shield down to
            20%, and Cyl has Healing Field, Crystal Ascension and Energy Nova all unlocked.
          </p>

          <Readout
            lines={[
              "casts over 600 frames: {'healing_field': 1}",
              "heal reasons: ship_hurt=1, retry_backoff=90, field_cooldown=5, ship_stable=504",
              "",
              "hull         80.0 -> 160.0  (+80.0 of 200)",
              "ship energy   158 -> 126    (the field's 32, and nothing else)",
              "cyl energy    100 -> 100    (she spent none of her own)",
            ]}
          />

          <div className="space-y-4 text-slate-300 leading-relaxed">
            <p>
              One cast. The hull comes back up by the field&rsquo;s documented 40% of maximum. You
              pay 32 energy out of 158, which still leaves you able to boost out of trouble. And
              Crystal Ascension never fires&mdash;not because it is blocked, but because at 40% hull
              the heal was enough. That ordering is the doctrine working: healing is the first
              response, the ultimate is the emergency.
            </p>
            <p>
              The other 504 frames she reports <span className="font-mono text-cyan-300">ship_stable</span>
              , which is the part I care about most. Assistance that fires constantly is noise, and
              noise is indistinguishable from a companion who is not paying attention.
            </p>
          </div>

          <div className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
            <div className="eyebrow mb-3 text-amber-300">Still weighing</div>
            <p className="text-slate-300 text-sm leading-relaxed">
              The Healing Field is placed at the ship&rsquo;s position at the moment she casts
              it&mdash;and then the field stays put while you fly on. In a fight where you are
              kiting, that heal is behind you almost immediately. There is a &ldquo;get
              inside&rdquo; nudge for exactly this, but nudging the player toward a decision the
              companion made is a different feeling than being helped. The open question is whether
              she should lead the cast the way her weapon leads a shot, predicting where you will be
              rather than where you were&mdash;or whether a field you have to fly back into is the
              honest cost of a free heal. I have not decided.
            </p>
          </div>
        </section>

        {/* ------------------------------------------------- expressions --- */}
        <section className="max-w-4xl mx-auto px-4 lg:px-6 py-14 border-t border-slate-800/60">
          <SectionHeading eyebrow="Expression">Her behavior also needs to be visible</SectionHeading>

          <div className="space-y-4 text-slate-300 leading-relaxed">
            <p>
              Cyl&rsquo;s developing expression system uses a priority order. Recent damage can
              trigger a wince; low health can produce a worried or hurt expression. Scanning and
              discovery have their own responses. Her underlying mood influences her default
              expression, while immediate events can override it.
            </p>
          </div>

          <Figure
            src="/cyl/cyl-expression-ladder.png"
            alt="Twelve panels of Cyl reacting: idle, gloomy mood, warm mood, docked, hull 40%, hull 15%, scanning, just hit, a discovery, low energy, fleeing and fighting"
            width={1200}
            height={954}
            caption={
              <>
                The ladder, panel by panel: idle and docked, hull at 40% and at 15% inside the
                low-health aura, scanning, freshly hit, delighted by a discovery, out of energy,
                fleeing, and fighting. Each panel is her real state driven into the real renderer.
              </>
            }
          />

          <Figure
            src="/cyl/cyl-expressions.png"
            alt="Eleven of Cyl's expressions rendered at 80px: happy, content, delighted, curious, determined, scared, worried, hurt, wince, tired and dead"
            width={960}
            height={774}
            caption={
              <>
                The same eleven faces up close, at an 80px hull radius. Her visor is her mouth and
                her lens is her eye&mdash;the mouth is a bowed polyline or a ring in her neon, the
                lids are caps of the lens in the socket color.
              </>
            }
          />

          <div className="mt-2 overflow-x-auto rounded-xl border border-cyan-500/20 bg-slate-950/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cyan-500/20 text-left">
                  <th className="px-4 py-3 eyebrow">Face</th>
                  <th className="px-4 py-3 eyebrow">First match wins</th>
                </tr>
              </thead>
              <tbody>
                {EXPRESSION_LADDER.map((row) => (
                  <tr key={row.face} className="border-b border-slate-800/60 last:border-0">
                    <td className="px-4 py-3 text-slate-100 whitespace-nowrap">{row.face}</td>
                    <td className="px-4 py-3 text-slate-400">{row.trigger}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 space-y-4 text-slate-300 leading-relaxed">
            <p>
              This creates a direct connection between simulation and character animation. You can
              look at her and get information about how she is doing.
            </p>
            <p>
              Arriving at that face took a correction first. Her visor used to be painted into her
              cached sprite&mdash;a bar with two slashes angled down&mdash;so she wore one frown at
              every size, whatever was happening to her, while the emotion vector her personality
              matrix has kept all along never reached her face. She is an optimist, and she was
              scowling at everybody.
            </p>
            <p>
              So the face is resolved from her live state instead, and her mood only shades the
              default smile within a floor and ceiling. A gloomy mood can narrow the smile; it can
              never turn it into a frown. Only her body can do that&mdash;damage, low hull, fear.
              Visually she is a sphere with a glass dome over a galaxy, a violet eye, brass and cyan,
              and the whole face costs about a twelfth of her draw: 14&micro;s of 174 at 24px, 34&micro;s
              of 478 at 80px, and 1.4&micro;s to decide which face it is.
            </p>
          </div>
        </section>

        {/* ---------------------------------------------------- scanning --- */}
        <section className="max-w-4xl mx-auto px-4 lg:px-6 py-14 border-t border-slate-800/60">
          <SectionHeading eyebrow="Scanning">The survey hologram</SectionHeading>

          <p className="text-slate-300 leading-relaxed">
            Scanning has received similar attention. The survey effect connects her lens to a target
            and surrounds the object with progress indicators and projected readouts: a dashed outer
            ring and a counter-turning inner one, a radar sweep with a fading trail, corner brackets
            standing off the reticle, motes riding it, two readout cards typing themselves in, and at
            the contact point the beam painting an arc of the target&rsquo;s own surface as she
            covers it.
          </p>

          <Figure
            src="/cyl/cyl-survey-hologram.png"
            alt="Cyl's survey hologram at two zoom levels and three points of a scan: beam, sweep, progress arc and readout cards"
            width={1920}
            height={756}
            caption={
              <>
                Two zoom levels by three points of one scan, photographed from the real renderer. The
                arc that fills is the surface she has actually covered on her orbit.
              </>
            }
          />

          <p className="text-slate-300 leading-relaxed">
            Its level of detail changes with the visible size of her body, keeping distant scans
            simpler&mdash;the same ladder her sprite rides. Her lens draws a pupil only from 8px and
            a highlight only from 16px; below that she is a lit dot with an antenna, and nothing is
            spent on detail nobody can see.
          </p>

          <Figure
            src="/cyl/cyl-lod-ladder.png"
            alt="Cyl rendered at hull radii from 6 to 80 pixels, showing detail arriving as she gets closer"
            width={1300}
            height={556}
            caption={
              <>
                Cyl from r=6 to r=80. Detail arrives as she does.
              </>
            }
          />

          <p className="text-slate-300 leading-relaxed">
            There is an engineering consideration behind that presentation, too. The scan effect used
            to allocate, clear and blit an alpha layer the size of the whole screen, every frame, for
            a drawing that covered a tenth of it. Now the layer is the size of what is actually
            drawn, clipped to the view. That reduces unnecessary rendering work while allowing a more
            detailed effect&mdash;and it means a bigger monitor no longer costs more to scan on. Six
            times the pixels must not cost twice the time; the test that says so runs on every
            change.
          </p>
        </section>

        {/* --------------------------------------------------- what next --- */}
        <section className="max-w-4xl mx-auto px-4 lg:px-6 py-14 border-t border-slate-800/60">
          <SectionHeading eyebrow="What comes next">Where Cyl goes from here</SectionHeading>

          <p className="text-slate-300 leading-relaxed">
            These are the kinds of changes that make Cyl interesting to develop. Target selection,
            resource management, animation, and conversation all contribute to the same character. A
            mistake in any one of them can change how dependable&mdash;or how present&mdash;she
            feels.
          </p>

          <div className="mt-8 grid gap-5">
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-6">
              <div className="eyebrow mb-3 text-cyan-300">Next up</div>
              <h3 className="font-display text-lg font-bold text-slate-100 mb-2">
                Her dialogue and personality system
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                She has a face that reads her state and a mouth that already moves. What she does not
                have yet is much to say with it. The dialogue work connects the same signals&mdash;
                damage, discovery, low health, a fight going badly&mdash;to what she actually tells
                you, so the line you hear and the expression you see come from one place rather than
                two. Longer term, that layer is where a language model replaces the dialogue tree
                entirely.
              </p>
            </div>

            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-6">
              <div className="eyebrow mb-3 text-rose-300">Unresolved</div>
              <h3 className="font-display text-lg font-bold text-slate-100 mb-2">
                She flies sideways on a scan orbit
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Cyl has two pieces of code that decide which way she is facing: one turns her along
                her course, one turns her on a scan orbit&mdash;and the second is the mirror of the
                first. While she was a flat, symmetric disc, nobody could tell. A sphere with a dome,
                an eye and a weapon pod on one flank tells you immediately: on the horizontal legs of
                an orbit she is facing the wrong way. Fixing it means touching heading code that
                several other systems read, which is why it is still open rather than patched.
              </p>
            </div>

            <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-6">
              <div className="eyebrow mb-3 text-purple-300">For playtesters</div>
              <h3 className="font-display text-lg font-bold text-slate-100 mb-2">
                Watch what she shoots when you change your mind
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Lock a target, then let something else start hitting you&mdash;or lock something far
                outside her range and see whether she still defends you. That is the ladder walking,
                and it is the single behavior most likely to feel wrong before it feels right. Tell
                me when she shoots something you did not expect.{" "}
                <Link href="/feedback" className="text-cyan-400 hover:text-cyan-300 underline">
                  Feedback goes here
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- CTA --- */}
        <section className="max-w-4xl mx-auto px-4 lg:px-6 py-16 border-t border-slate-800/60">
          <p className="text-xl text-slate-200 leading-relaxed">
            As you explore, I want Cyl&rsquo;s actions to give you reasons to notice her, understand
            her, and eventually trust her.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href={STEAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
            >
              Wishlist on Steam
            </a>
            <Link href="/devlog" className="btn-ghost">
              More devlogs
            </Link>
            <Link href="/alpha-testing" className="btn-ghost">
              Join the closed alpha
            </Link>
          </div>

          <p className="mt-6 text-sm text-slate-400">
            <a
              href={STEAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 underline"
            >
              Wishlist Explore the Universe 2175 on Steam
            </a>{" "}
            and follow development as Cyl and the galaxy around her continue to grow.
          </p>
        </section>
      </main>

      <Footer />
    </>
  );
}
