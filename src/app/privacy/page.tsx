export default function PrivacyPolicyPage() {
  const sections = [
    {
      title: "1. Information We Collect",
      content: [
        {
          subtitle: "Personal Information",
          text: "When you create an account or use our services, we may collect personal information including your name, email address, username, and profile information.",
        },
        {
          subtitle: "Gameplay Data",
          text: "We collect information about your gameplay, including game progress, achievements, statistics, ship designs, faction membership, scores, and in-game activities.",
        },
        {
          subtitle: "Technical Information",
          text: "We automatically collect technical information such as IP address, device type, browser information, operating system, and game client version for security and optimization purposes.",
        },
        {
          subtitle: "Communication Data",
          text: "We may collect information from your interactions with customer support, forum posts, bug reports, and feedback submissions.",
        },
      ],
    },
    {
      title: "2. How We Use Your Information",
      content: [
        {
          subtitle: "Service Delivery",
          text: "We use your information to provide, maintain, and improve our game services, including account management, matchmaking, leaderboards, and feature development.",
        },
        {
          subtitle: "Communication",
          text: "We may use your contact information to send you important updates, security alerts, and optional marketing communications (which you can opt out of at any time).",
        },
        {
          subtitle: "Analytics and Improvement",
          text: "We analyze gameplay data to understand how players interact with our game, identify issues, balance gameplay, and develop new features.",
        },
        {
          subtitle: "Security and Fraud Prevention",
          text: "We use information to detect and prevent cheating, abuse, security breaches, and other harmful activities.",
        },
      ],
    },
    {
      title: "3. Data Sharing and Disclosure",
      content: [
        {
          subtitle: "Public Information",
          text: "Certain information such as your username, avatar, game statistics, and leaderboard rankings may be visible to other players.",
        },
        {
          subtitle: "Service Providers",
          text: "We may share data with trusted third-party service providers who help us operate our services, such as hosting providers, analytics services, and payment processors.",
        },
        {
          subtitle: "Legal Requirements",
          text: "We may disclose information if required by law, legal process, or government request, or to protect our rights, users' safety, or prevent fraud.",
        },
        {
          subtitle: "Business Transfers",
          text: "In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.",
        },
      ],
    },
    {
      title: "4. Data Storage and Security",
      content: [
        {
          subtitle: "Security Measures",
          text: "We implement industry-standard security measures to protect your information, including encryption, secure servers, and access controls.",
        },
        {
          subtitle: "Data Retention",
          text: "We retain your personal information for as long as your account is active or as needed to provide services. Gameplay data may be retained for analytics and historical purposes.",
        },
        {
          subtitle: "Data Location",
          text: "Your data may be stored and processed in servers located in various countries. By using our services, you consent to this transfer.",
        },
      ],
    },
    {
      title: "5. Cookies and Tracking Technologies",
      content: [
        {
          subtitle: "Cookies",
          text: "We use cookies and similar technologies to maintain your session, remember your preferences, and analyze site usage. You can control cookies through your browser settings.",
        },
        {
          subtitle: "Analytics",
          text: "We use third-party analytics services (such as Google Analytics) to understand how users interact with our website and game.",
        },
        {
          subtitle: "Advertising",
          text: "We may use cookies for targeted advertising. You can opt out of personalized ads through your browser or device settings.",
        },
      ],
    },
    {
      title: "6. Your Rights and Choices",
      content: [
        {
          subtitle: "Access and Correction",
          text: "You have the right to access, update, or correct your personal information through your account settings.",
        },
        {
          subtitle: "Data Deletion",
          text: "You can request deletion of your account and associated data by contacting us at privacy@exploretheuniverse2175.com. Some data may be retained for legal or legitimate business purposes.",
        },
        {
          subtitle: "Opt-Out",
          text: "You can opt out of marketing communications at any time by clicking the unsubscribe link in emails or adjusting your account settings.",
        },
        {
          subtitle: "Do Not Track",
          text: "We currently do not respond to Do Not Track signals, but you can control cookies through your browser settings.",
        },
      ],
    },
    {
      title: "7. Children's Privacy",
      content: [
        {
          subtitle: "Age Restrictions",
          text: "Our services are not intended for children under 13. We do not knowingly collect personal information from children under 13.",
        },
        {
          subtitle: "Parental Consent",
          text: "If you are a parent or guardian and believe your child has provided us with personal information, please contact us to request deletion.",
        },
      ],
    },
    {
      title: "8. International Users",
      content: [
        {
          subtitle: "GDPR Compliance",
          text: "For users in the European Economic Area, we comply with GDPR requirements. You have rights to access, rectification, erasure, restriction, data portability, and objection.",
        },
        {
          subtitle: "CCPA Compliance",
          text: "For California residents, we comply with the California Consumer Privacy Act. You have rights to know what data we collect, delete your data, and opt out of data sales (we do not sell personal data).",
        },
      ],
    },
    {
      title: "9. Third-Party Services",
      content: [
        {
          subtitle: "External Links",
          text: "Our website may contain links to third-party websites. We are not responsible for their privacy practices. Please review their privacy policies.",
        },
        {
          subtitle: "Social Media",
          text: "If you connect your account to social media platforms, we may collect information according to your social media privacy settings.",
        },
      ],
    },
    {
      title: "10. Changes to This Privacy Policy",
      content: [
        {
          subtitle: "Updates",
          text: "We may update this Privacy Policy from time to time. We will notify you of significant changes via email or in-game notification.",
        },
        {
          subtitle: "Effective Date",
          text: "This Privacy Policy is effective as of January 16, 2026. Continued use of our services after changes constitutes acceptance of the updated policy.",
        },
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-indigo-950/20 to-gray-950">
      <div className="max-w-5xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-indigo-500/20 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl border border-indigo-500/30">
            🔒
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Privacy Policy
            </span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-2">
            Your privacy is important to us. This policy explains how we
            collect, use, and protect your personal information.
          </p>
          <p className="text-sm text-slate-500">
            Last Updated: January 16, 2026
          </p>
        </div>

        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-8 mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">
            Introduction
          </h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            Welcome to Explore the Universe 2175 ("ETU 2175", "we", "us", or
            "our"). This Privacy Policy explains how Telford Projects collects,
            uses, discloses, and safeguards your information when you use our
            website, game, and related services (collectively, the "Services").
          </p>
          <p className="text-slate-300 leading-relaxed">
            By accessing or using our Services, you agree to this Privacy
            Policy. If you do not agree with this policy, please do not use our
            Services.
          </p>
        </div>

        <div className="space-y-8 mb-12">
          {sections.map((section, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-slate-900/50 to-indigo-900/20 border border-slate-700/50 rounded-xl p-8"
            >
              <h2 className="text-2xl font-bold text-white mb-6">
                {section.title}
              </h2>
              <div className="space-y-6">
                {section.content.map((item, i) => (
                  <div key={i}>
                    <h3 className="text-lg font-semibold text-indigo-400 mb-2">
                      {item.subtitle}
                    </h3>
                    <p className="text-slate-300 leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Contact Us</h2>
          <p className="text-slate-300 leading-relaxed mb-6">
            If you have any questions, concerns, or requests regarding this
            Privacy Policy or our data practices, please contact us:
          </p>
          <div className="space-y-3 text-slate-300">
            <div className="flex items-start gap-3">
              <span className="text-cyan-400">📧</span>
              <div>
                <p className="font-medium text-white">Email</p>
                <a
                  href="mailto:privacy@exploretheuniverse2175.com"
                  className="text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  privacy@exploretheuniverse2175.com
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-cyan-400">🏢</span>
              <div>
                <p className="font-medium text-white">Company</p>
                <p className="text-slate-300">Telford Projects</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-cyan-400">⏱️</span>
              <div>
                <p className="font-medium text-white">Response Time</p>
                <p className="text-slate-300">
                  We aim to respond to all privacy inquiries within 30 days
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-8 text-center">
          <h3 className="text-xl font-bold text-white mb-3">
            Your Data, Your Control
          </h3>
          <p className="text-slate-300 mb-6">
            You have full control over your personal data. Access your account
            settings to manage your privacy preferences.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all">
              Manage Privacy Settings
            </button>
            <button className="bg-slate-800/50 border border-slate-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-700/50 transition-all">
              Download My Data
            </button>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-700/50 text-center">
          <p className="text-slate-500 text-sm">
            © 2026 Telford Projects. All rights reserved. | Explore the Universe
            2175
          </p>
        </div>
      </div>
    </main>
  );
}
