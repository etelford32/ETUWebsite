import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SITE_URL } from "@/lib/siteUrl";

export const metadata: Metadata = {
  title: "Terms of Use | Explore the Universe 2175",
  description:
    "The terms that govern your use of the Explore the Universe 2175 website, game, playtests, accounts, forums and related services.",
  alternates: { canonical: "./" },
  openGraph: {
    title: "Terms of Use | Explore the Universe 2175",
    description:
      "The terms that govern your use of the Explore the Universe 2175 website, game and related services.",
    url: `${SITE_URL}/terms`,
    siteName: "Explore the Universe 2175",
    type: "website",
  },
};

const EFFECTIVE_DATE = "October 11, 2026";

const sections = [
  {
    title: "1. Acceptance of These Terms",
    content: [
      {
        subtitle: "Agreement",
        text: "By accessing or using the Explore the Universe 2175 website, game, playtests, accounts, forums, leaderboards, and related services (collectively, the \"Services\"), you agree to be bound by these Terms of Use. If you do not agree, do not use the Services.",
      },
      {
        subtitle: "Additional Terms",
        text: "Some parts of the Services may be subject to additional terms, such as those of the platform you play on (for example, the Steam Subscriber Agreement). Where those terms apply, they work alongside these Terms. Our Privacy Policy also forms part of these Terms.",
      },
    ],
  },
  {
    title: "2. Eligibility",
    content: [
      {
        subtitle: "Minimum Age",
        text: "You must be at least 13 years old to create an account or use the Services. If you are under the age of majority where you live, you may use the Services only with the involvement and consent of a parent or legal guardian, who agrees to these Terms on your behalf.",
      },
      {
        subtitle: "Compliance with Law",
        text: "You may not use the Services if you are barred from doing so under applicable law.",
      },
    ],
  },
  {
    title: "3. Your Account",
    content: [
      {
        subtitle: "Account Security",
        text: "You are responsible for keeping your login credentials confidential and for all activity that occurs under your account. Notify us promptly at etelford32@gmail.com if you suspect unauthorized access.",
      },
      {
        subtitle: "Accurate Information",
        text: "You agree to provide accurate information when creating an account and to keep it up to date. Usernames must not impersonate others or be offensive.",
      },
      {
        subtitle: "One Pilot, One Account",
        text: "Accounts are personal to you. You may not sell, transfer, or share your account, or use another player's account without permission.",
      },
    ],
  },
  {
    title: "4. License to Use the Services",
    content: [
      {
        subtitle: "Limited License",
        text: "Subject to these Terms, we grant you a limited, personal, non-exclusive, non-transferable, revocable license to access and use the Services for your own non-commercial entertainment.",
      },
      {
        subtitle: "Restrictions",
        text: "Except as permitted by law, you may not copy, modify, distribute, sell, rent, reverse engineer, decompile, or create derivative works from the game or Services, or attempt to extract source code, assets, or AI models.",
      },
      {
        subtitle: "Ownership",
        text: "The Services and all related content — including the game, characters (such as Cyl), factions, artwork, music, code, and trademarks — are owned by Telford Projects LLC or its licensors and are protected by intellectual property laws. All rights not expressly granted are reserved.",
      },
    ],
  },
  {
    title: "5. Playtests, Alpha & Early Access",
    content: [
      {
        subtitle: "Work in Progress",
        text: "Playtest, alpha, and early access builds are unfinished. They may contain bugs, crash, change significantly, or be withdrawn at any time. Progress, ship designs, scores, and other data may be reset or lost.",
      },
      {
        subtitle: "Confidentiality",
        text: "If a particular playtest is designated as confidential, you agree not to share footage, screenshots, or details from it until we lift that restriction.",
      },
    ],
  },
  {
    title: "6. Code of Conduct",
    content: [
      {
        subtitle: "Fair Play",
        text: "Do not cheat, exploit bugs for advantage, use bots, hacks, or unauthorized third-party software, or manipulate leaderboards, stats, or matchmaking. Please report exploits to us instead.",
      },
      {
        subtitle: "Respect Other Players",
        text: "Do not harass, threaten, bully, or discriminate against others, and do not post hateful, sexually explicit, violent, or illegal content in forums, profiles, feedback, or any other part of the Services.",
      },
      {
        subtitle: "Protect the Services",
        text: "Do not interfere with or disrupt the Services, probe or attack our infrastructure, scrape data at scale, bypass security or rate limits, or send spam or malware.",
      },
    ],
  },
  {
    title: "7. User Content & Feedback",
    content: [
      {
        subtitle: "Your Content",
        text: "You retain ownership of content you submit, such as forum posts, profile information, ship designs, and bug reports (\"User Content\"). You are responsible for your User Content and confirm you have the rights to share it.",
      },
      {
        subtitle: "License to Us",
        text: "You grant Telford Projects LLC a worldwide, non-exclusive, royalty-free license to host, store, reproduce, display, and distribute your User Content as needed to operate, promote, and improve the Services.",
      },
      {
        subtitle: "Feedback & Suggestions",
        text: "If you send us ideas, suggestions, or feedback about the game, we may use them freely without any obligation or compensation to you.",
      },
      {
        subtitle: "Moderation",
        text: "We may review, remove, or refuse any User Content at our discretion, including content that we believe violates these Terms.",
      },
    ],
  },
  {
    title: "8. Adaptive AI & Gameplay Data",
    content: [
      {
        subtitle: "Learning Systems",
        text: "ETU 2175 uses machine learning and adaptive AI that respond to how you play. Gameplay data may be used to personalize your experience, balance the game, and train or improve these systems, as described in our Privacy Policy.",
      },
      {
        subtitle: "AI Output",
        text: "In-game AI behavior and dialogue are generated for entertainment and may be unpredictable. They are fiction and should not be relied on as advice of any kind.",
      },
    ],
  },
  {
    title: "9. Purchases & Virtual Items",
    content: [
      {
        subtitle: "Third-Party Storefronts",
        text: "Purchases of the game made through third-party platforms such as Steam are governed by that platform's terms, including its refund policy.",
      },
      {
        subtitle: "Virtual Items",
        text: "Any in-game currency, items, ranks, or unlocks have no real-world monetary value, cannot be exchanged for cash, and are licensed to you rather than sold. We may modify or remove them as part of game development.",
      },
    ],
  },
  {
    title: "10. Suspension & Termination",
    content: [
      {
        subtitle: "Our Rights",
        text: "We may suspend or terminate your access to all or part of the Services, remove leaderboard entries, or delete accounts if we reasonably believe you have violated these Terms or put other players or the Services at risk.",
      },
      {
        subtitle: "Your Rights",
        text: "You may stop using the Services and request deletion of your account at any time by contacting etelford32@gmail.com.",
      },
    ],
  },
  {
    title: "11. Third-Party Links & Services",
    content: [
      {
        subtitle: "External Sites",
        text: "The Services may link to or integrate with third-party websites and services (such as Steam, Discord, or social media). We are not responsible for their content, policies, or practices.",
      },
    ],
  },
  {
    title: "12. Disclaimers",
    content: [
      {
        subtitle: "As Is",
        text: "The Services are provided \"as is\" and \"as available\" without warranties of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not guarantee the Services will be uninterrupted, error-free, or secure.",
      },
      {
        subtitle: "Health",
        text: (
          <>
            Some people may experience seizures or discomfort when exposed to
            flashing lights or patterns. Please read our{" "}
            <Link href="/health-warning" className="text-cyan-400 hover:underline">
              health warning
            </Link>{" "}
            before playing and stop immediately if you feel unwell.
          </>
        ),
      },
    ],
  },
  {
    title: "13. Limitation of Liability",
    content: [
      {
        subtitle: "Limits",
        text: "To the maximum extent permitted by law, Telford Projects LLC and its team will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for any loss of data, profits, or goodwill, arising from your use of the Services. Our total liability for any claim will not exceed the greater of the amount you paid us in the 12 months before the claim or US $20.",
      },
      {
        subtitle: "Where Limits Don't Apply",
        text: "Some jurisdictions do not allow certain warranty exclusions or liability limits, so some of the above may not apply to you. Nothing in these Terms limits rights you have under applicable consumer protection law.",
      },
    ],
  },
  {
    title: "14. Indemnification",
    content: [
      {
        subtitle: "Your Responsibility",
        text: "You agree to indemnify and hold harmless Telford Projects LLC from claims, damages, and expenses (including reasonable legal fees) arising from your User Content, your misuse of the Services, or your violation of these Terms or the rights of others.",
      },
    ],
  },
  {
    title: "15. Governing Law & Disputes",
    content: [
      {
        subtitle: "Informal Resolution First",
        text: "If you have a concern, please contact us first — most issues can be resolved quickly and informally.",
      },
      {
        subtitle: "Governing Law",
        text: "These Terms are governed by the laws of the State of California and applicable federal laws of the United States of America, without regard to conflict-of-law rules, except where the law of your country of residence requires otherwise.",
      },
      {
        subtitle: "Where Disputes Are Heard",
        text: "Any lawsuit arising out of or relating to these Terms or the Services must be brought exclusively in the state or federal courts located in California, and you and Telford Projects LLC consent to the personal jurisdiction of those courts. Either party may still bring an individual claim in small claims court, and nothing here removes any right you have under applicable law to bring a claim in the courts where you live.",
      },
    ],
  },
  {
    title: "16. Changes to These Terms",
    content: [
      {
        subtitle: "Updates",
        text: "We may update these Terms as the game and Services evolve. When we make material changes, we will update the date below and may notify you by email or in-game message.",
      },
      {
        subtitle: "Effective Date",
        text: `These Terms are effective as of ${EFFECTIVE_DATE}. Continued use of the Services after changes take effect means you accept the updated Terms.`,
      },
    ],
  },
];

export default function TermsOfUsePage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/20 to-gray-950">
        <div className="max-w-5xl mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-indigo-500/20 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl border border-indigo-500/30">
              📜
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Terms of Use
              </span>
            </h1>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-2">
              The rules of the galaxy. These terms explain what you can expect
              from us, and what we expect from every pilot.
            </p>
            <p className="text-sm text-slate-500">
              Last Updated: {EFFECTIVE_DATE}
            </p>
          </div>

          <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-8 mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Introduction</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              Welcome to Explore the Universe 2175 (&quot;ETU 2175&quot;,
              &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), developed by
              Telford Projects LLC. These Terms of Use govern your access to and use
              of exploretheuniverse2175.com, the game, and related services.
            </p>
            <p className="text-slate-300 leading-relaxed">
              Please read them carefully, along with our{" "}
              <Link href="/privacy" className="text-cyan-400 hover:underline">
                Privacy Policy
              </Link>
              , which explains how we handle your data.
            </p>
          </div>

          <div className="space-y-8 mb-12">
            {sections.map((section) => (
              <section
                key={section.title}
                className="bg-gradient-to-br from-slate-900/50 to-indigo-900/20 border border-slate-700/50 rounded-xl p-8"
              >
                <h2 className="text-2xl font-bold text-white mb-6">
                  {section.title}
                </h2>
                <div className="space-y-6">
                  {section.content.map((item) => (
                    <div key={item.subtitle}>
                      <h3 className="text-lg font-semibold text-indigo-400 mb-2">
                        {item.subtitle}
                      </h3>
                      <p className="text-slate-300 leading-relaxed">
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">Contact Us</h2>
            <p className="text-slate-300 leading-relaxed mb-6">
              Questions about these Terms? Reach out and we&apos;ll get back to
              you.
            </p>
            <div className="space-y-3 text-slate-300">
              <div className="flex items-start gap-3">
                <span className="text-cyan-400">📧</span>
                <div>
                  <p className="font-medium text-white">Email</p>
                  <a
                    href="mailto:etelford32@gmail.com"
                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    etelford32@gmail.com
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-cyan-400">🏢</span>
                <div>
                  <p className="font-medium text-white">Company</p>
                  <p className="text-slate-300">Telford Projects LLC</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
