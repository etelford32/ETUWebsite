"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DemoSign from "@/components/DemoSign";
import DemoSignupButton from "@/components/DemoSignupButton";
import WishlistButton from "@/components/WishlistButton";
import { SteamIcon } from "@/components/SteamIcon";
import { isSyntheticSteamEmail } from "@/lib/steamIdentity";
import { useDemoLive } from "@/lib/useDemoLive";
import {
  DEMO_DATE_LABEL,
  DEMO_DATE_SHORT,
  DEMO_PATH,
  DEMO_STEAM_SIGNIN_URL,
} from "@/lib/campaign";

/** Remembers that this browser opened the store page from the checklist. */
const WISHLIST_OPENED_KEY = "etu_demo_wishlist_opened";

type Account = { name: string; email: string | null };

const WHILE_YOU_WAIT = [
  {
    href: "/megabot",
    image: "/art/megabot-crimson-eye.jpg",
    position: "50% 35%",
    title: "Meet MEGABOT",
    blurb: "Twenty-five ships tall, fifteen plates of armour, one eye.",
  },
  {
    href: "/factions",
    image: "/art/space-dwarves-crystal-mine-scene.jpg",
    position: "40% 30%",
    title: "Pick Your Allies",
    blurb: "Six factions. Sealing an alliance with one angers its enemies.",
  },
  {
    href: "/bosses",
    image: "/art/solar-shade-scene.jpg",
    position: "center",
    title: "Study the Bosses",
    blurb: "Learn what is coming through the gate before it arrives.",
  },
];

export default function DemoDayClient() {
  const live = useDemoLive();
  // undefined while the session is loading, null when signed out.
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [emailOptIn, setEmailOptIn] = useState<boolean | null>(null);
  const [savingOptIn, setSavingOptIn] = useState(false);
  const [optInError, setOptInError] = useState(false);
  const [wishlistOpened, setWishlistOpened] = useState(false);

  useEffect(() => {
    try {
      setWishlistOpened(localStorage.getItem(WISHLIST_OPENED_KEY) === "1");
    } catch {
      // Storage blocked; the step simply stays unticked.
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (cancelled) return;
        if (!data?.authenticated) {
          setAccount(null);
          return;
        }
        const rawEmail: string | null = data.user?.email ?? null;
        // Steam-created accounts carry a synthetic address that is never mailed.
        const email = isSyntheticSteamEmail(rawEmail) ? null : rawEmail;
        setAccount({
          name: data.user?.displayName || email?.split("@")[0] || "Commander",
          email,
        });

        const profileRes = await fetch("/api/profile");
        if (!profileRes.ok || cancelled) return;
        const { profile } = await profileRes.json();
        if (!cancelled) setEmailOptIn(profile?.newsletter !== false);
      } catch {
        if (!cancelled) setAccount(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function markWishlistOpened() {
    setWishlistOpened(true);
    try {
      localStorage.setItem(WISHLIST_OPENED_KEY, "1");
    } catch {
      // Storage blocked; nothing to remember.
    }
  }

  async function saveOptIn(next: boolean) {
    const previous = emailOptIn;
    setEmailOptIn(next);
    setSavingOptIn(true);
    setOptInError(false);
    try {
      const csrfRes = await fetch("/api/csrf-token");
      const csrf = csrfRes.ok ? await csrfRes.json() : {};
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrf.csrfToken ?? "" },
        body: JSON.stringify({ newsletter: next }),
      });
      if (!res.ok) throw new Error("save failed");
    } catch {
      setEmailOptIn(previous);
      setOptInError(true);
    } finally {
      setSavingOptIn(false);
    }
  }

  const signedIn = !!account;

  return (
    <>
      <Header />

      {/* Hero: the date and the countdown */}
      <section className="relative overflow-hidden">
        <Image
          src="/art/fleeing-the-colossal-megabot-scene.jpg"
          alt=""
          fill
          priority
          className="object-cover"
          style={{ objectPosition: "50% 35%" }}
          sizes="100vw"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 75% 60% at 50% 45%, rgba(4,6,20,.6), rgba(4,6,20,.25) 80%), linear-gradient(180deg, rgba(4,6,20,.45), rgba(4,6,20,.6) 55%, #040614)",
          }}
        />
        <div className="relative max-w-5xl mx-auto px-4 lg:px-6 pt-14 pb-12 md:pt-20 md:pb-16 text-center">
          <p
            className="uppercase font-bold tracking-[0.22em] text-sm md:text-lg text-amber-300"
            style={{ textShadow: "0 2px 8px rgba(0,0,0,.9)" }}
          >
            Explore the Universe 2175
          </p>
          <h1
            className={`mt-3 font-display text-6xl md:text-8xl font-black uppercase tracking-wide leading-none text-balance demo-gold ${
              live ? "demo-gold--live" : ""
            }`}
          >
            {live ? "The Demo Is Live" : "Demo Day"}
          </h1>
          <p
            className="mt-5 mx-auto max-w-3xl text-xl md:text-2xl text-slate-100 leading-relaxed text-balance"
            style={{ textShadow: "0 2px 8px rgba(0,0,0,.85)" }}
          >
            {live
              ? "The free demo of Explore the Universe 2175 is out now on Steam."
              : `The free demo of Explore the Universe 2175 lands on Steam on ${DEMO_DATE_LABEL}.`}
          </p>
          <div className="mt-8 md:mt-10 flex justify-center">
            <DemoSign />
          </div>
          {live && (
            <div className="mt-8 flex justify-center">
              <WishlistButton
                placement="demo-page-hero"
                intent="demo"
                className="btn-3d btn-3d-demo text-lg md:text-xl md:px-9 md:py-4"
              >
                <SteamIcon className="w-7 h-7" />
                <span>Play the free demo</span>
              </WishlistButton>
            </div>
          )}
        </div>
      </section>

      {/* The checklist */}
      <section className="py-12 md:py-20 bg-deep-900">
        <div className="max-w-6xl mx-auto px-4 lg:px-6">
          <header className="text-center max-w-3xl mx-auto mb-10 md:mb-14">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white leading-tight text-balance">
              {live ? "Three Steps to the Cockpit" : "Three Steps and You Are Ready"}
            </h2>
            <p className="mt-4 text-lg md:text-xl text-slate-200 leading-relaxed">
              {live
                ? "Create your account, wishlist the game, then download the demo."
                : "Do them in order. The first two take about a minute each."}
            </p>
          </header>

          <ol className="grid lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Step 1 — account */}
            <StepCard
              number={1}
              title="Create Your Commander Account"
              done={signedIn}
              doneLabel="Signed in"
              current={!signedIn}
            >
              {account === undefined ? (
                <p className="text-lg text-slate-300">Checking your account…</p>
              ) : signedIn ? (
                <>
                  <p className="text-lg text-slate-100 leading-relaxed">
                    Welcome aboard, <span className="font-semibold text-white">{account.name}</span>.
                    Your callsign and commander profile are waiting on your dashboard.
                  </p>
                  <Link href="/dashboard" className="btn-ghost btn-ghost--lg w-full mt-auto">
                    Open my dashboard
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-lg text-slate-100 leading-relaxed">
                    Free, and it takes a minute. Claim your callsign, your commander profile and
                    your place on the leaderboard.
                  </p>
                  <div className="mt-auto space-y-3">
                    <DemoSignupButton
                      placement="demo-page-step1"
                      signupOnly
                      className="btn-3d btn-3d-demo w-full text-base md:text-lg"
                    >
                      Sign up free
                    </DemoSignupButton>
                    <a href={DEMO_STEAM_SIGNIN_URL} className="btn-ghost btn-ghost--lg w-full">
                      <SteamIcon className="w-5 h-5" />
                      Sign in with Steam
                    </a>
                    <p className="text-center text-base text-slate-300">
                      Have an account?{" "}
                      <Link
                        href={`/login?redirect=${encodeURIComponent(DEMO_PATH)}`}
                        className="font-semibold text-cyan-300 hover:text-cyan-200 underline underline-offset-4"
                      >
                        Sign in
                      </Link>
                    </p>
                  </div>
                </>
              )}
            </StepCard>

            {/* Step 2 — wishlist */}
            <StepCard
              number={2}
              title="Wishlist on Steam"
              done={wishlistOpened}
              doneLabel="Steam opened"
              current={signedIn && !wishlistOpened}
            >
              <p className="text-lg text-slate-100 leading-relaxed">
                The best way to support the game. Steam tells you when Early Access launches.
                {!live &&
                  " While you are on the store page, request playtest access: sign-ups are open now."}
              </p>
              {wishlistOpened && (
                <p className="text-base text-emerald-200 leading-relaxed">
                  The store page opened in a new tab. Press &ldquo;Add to your wishlist&rdquo; there
                  and this step is done.
                </p>
              )}
              <WishlistButton
                placement="demo-page-step2"
                onOpen={markWishlistOpened}
                className={`mt-auto w-full ${
                  signedIn && !wishlistOpened
                    ? "btn-3d btn-3d-steam text-base md:text-lg"
                    : "btn-ghost btn-ghost--lg"
                }`}
              >
                <SteamIcon className="w-6 h-6" />
                <span>{wishlistOpened ? "Open the store page again" : "Wishlist on Steam"}</span>
              </WishlistButton>
            </StepCard>

            {/* Step 3 — play */}
            <StepCard
              number={3}
              title={live ? "Play the Free Demo" : `Play on ${DEMO_DATE_SHORT}`}
              done={false}
              doneLabel=""
              current={live}
            >
              <p className="text-lg text-slate-100 leading-relaxed">
                {live
                  ? "The demo is out now. Download it from the Steam store page and fly."
                  : "The free demo arrives on Steam on Thanksgiving Day. Come back here for the countdown."}
              </p>

              {live ? (
                <WishlistButton
                  placement="demo-page-step3"
                  intent="demo"
                  className="btn-3d btn-3d-demo mt-auto w-full text-base md:text-lg"
                >
                  <SteamIcon className="w-6 h-6" />
                  <span>Play the free demo</span>
                </WishlistButton>
              ) : signedIn && account.email && emailOptIn !== null ? (
                <div className="mt-auto">
                  <label className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.04] ring-1 ring-white/10 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 shrink-0 accent-amber-400"
                      checked={emailOptIn}
                      disabled={savingOptIn}
                      onChange={(e) => void saveOptIn(e.target.checked)}
                    />
                    <span className="text-base text-slate-100 leading-relaxed">
                      Email me when the demo goes live
                      <span className="block text-sm text-slate-400 break-all">{account.email}</span>
                    </span>
                  </label>
                  {optInError && (
                    <p className="mt-2 text-sm text-rose-300" role="alert">
                      That did not save. Please try again.
                    </p>
                  )}
                </div>
              ) : signedIn && !account.email ? (
                <p className="mt-auto text-base text-slate-300 leading-relaxed">
                  You signed in with Steam, so there is no email address on your account. Your Steam
                  wishlist is your reminder.
                </p>
              ) : !signedIn && account !== undefined ? (
                <p className="mt-auto text-base text-slate-300 leading-relaxed">
                  Finish step 1 and you can ask for an email the moment the demo goes live.
                </p>
              ) : null}
            </StepCard>
          </ol>
        </div>
      </section>

      {/* While you wait */}
      <section className="py-12 md:py-20 bg-gradient-to-b from-deep-900 to-deep-800 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 lg:px-6">
          <h2 className="text-center font-display text-3xl md:text-4xl font-bold text-white">
            {live ? "Know Your Enemy" : "While You Wait"}
          </h2>
          <div className="mt-8 md:mt-10 grid sm:grid-cols-3 gap-6">
            {WHILE_YOU_WAIT.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-2xl overflow-hidden bg-white/5 ring-1 ring-white/10 hover:ring-cyan-400/40 transition"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    style={{ objectPosition: item.position }}
                    sizes="(max-width: 640px) 100vw, 380px"
                  />
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-bold text-white">
                    {item.title} <span aria-hidden="true">→</span>
                  </h3>
                  <p className="mt-1 text-base text-slate-200 leading-relaxed">{item.blurb}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

function StepCard({
  number,
  title,
  done,
  doneLabel,
  current,
  children,
}: {
  number: number;
  title: string;
  done: boolean;
  doneLabel: string;
  /** The step to take right now: highlighted in demo-day amber. */
  current: boolean;
  children: React.ReactNode;
}) {
  const frame = done
    ? "bg-emerald-500/[0.07] ring-1 ring-emerald-400/40"
    : current
      ? "bg-gradient-to-b from-amber-500/15 to-amber-500/5 ring-2 ring-amber-400/50 shadow-[0_0_50px_rgba(251,191,36,0.12)]"
      : "bg-white/[0.04] ring-1 ring-white/10";

  return (
    <li className={`flex flex-col gap-4 p-7 md:p-8 rounded-2xl ${frame}`}>
      <div className="flex items-center justify-between gap-3">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-full text-xl font-bold ${
            done
              ? "bg-emerald-500 text-emerald-950"
              : current
                ? "bg-amber-400 text-amber-950"
                : "bg-white/10 text-slate-200"
          }`}
          aria-hidden="true"
        >
          {done ? "✓" : number}
        </span>
        {done && (
          <span className="uppercase font-semibold tracking-wider text-sm text-emerald-300">
            {doneLabel}
          </span>
        )}
      </div>
      <h3 className="text-2xl md:text-[1.7rem] font-bold text-white leading-tight">
        <span className="sr-only">Step {number}: </span>
        {title}
      </h3>
      {children}
    </li>
  );
}
