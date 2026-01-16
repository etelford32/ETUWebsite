export default function HealthWarningPage() {
  const warnings = [
    {
      icon: "⚡",
      title: "Photosensitive Seizure Warning",
      color: "red",
      content: [
        "A very small percentage of people may experience a seizure when exposed to certain visual images, including flashing lights or patterns that may appear in video games.",
        "Even people who have no history of seizures or epilepsy may have an undiagnosed condition that can cause these 'photosensitive epileptic seizures' while watching video games.",
        "These seizures may have a variety of symptoms, including lightheadedness, altered vision, eye or face twitching, jerking or shaking of arms or legs, disorientation, confusion, or momentary loss of awareness.",
        "Seizures may also cause loss of consciousness or convulsions that can lead to injury from falling down or striking nearby objects.",
      ],
      action: "Immediately stop playing and consult a doctor if you experience any of these symptoms. Parents should watch for or ask their children about the above symptoms.",
    },
    {
      icon: "👁️",
      title: "Eye Strain and Visual Fatigue",
      color: "yellow",
      content: [
        "Extended gameplay may cause eye strain, blurred vision, or dry eyes.",
        "The game features bright visual effects, rapid camera movements, and detailed 3D environments.",
        "Prolonged screen time without breaks can lead to digital eye strain and headaches.",
      ],
      action: "Take regular breaks every 30-60 minutes. Follow the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds.",
    },
    {
      icon: "🎮",
      title: "Motion Sickness",
      color: "orange",
      content: [
        "Some players may experience motion sickness, dizziness, or nausea while playing.",
        "The game features fast-paced space combat, rapid camera movements, and 3D navigation.",
        "Symptoms may include sweating, nausea, eye strain, or vertigo.",
      ],
      action: "If you feel unwell, stop playing immediately and rest. Adjust graphics settings, reduce camera sensitivity, or enable motion sickness reduction options in the game settings.",
    },
    {
      icon: "⏰",
      title: "Excessive Gaming",
      color: "blue",
      content: [
        "Extended gaming sessions can lead to physical and mental health issues.",
        "Prolonged sitting can cause musculoskeletal problems, poor posture, and reduced physical fitness.",
        "Excessive gaming may interfere with sleep, work, relationships, and other important activities.",
      ],
      action: "Maintain a balanced lifestyle. Take regular breaks, stay hydrated, exercise regularly, and ensure adequate sleep. If gaming interferes with daily life, consider seeking professional help.",
    },
    {
      icon: "🔊",
      title: "Hearing Damage",
      color: "purple",
      content: [
        "Playing at high volumes, especially with headphones, can cause permanent hearing damage.",
        "The game features intense audio effects, explosions, and immersive soundscapes.",
        "Prolonged exposure to loud sounds can lead to tinnitus or hearing loss.",
      ],
      action: "Keep volume at safe levels (below 60% of maximum). Take listening breaks every hour. If you experience ringing in your ears or muffled hearing, reduce volume immediately.",
    },
    {
      icon: "🤝",
      title: "Repetitive Strain Injury",
      color: "green",
      content: [
        "Repetitive actions can cause injury to hands, wrists, arms, shoulders, or neck.",
        "Symptoms include pain, tingling, numbness, or weakness in affected areas.",
        "Poor posture and ergonomics can exacerbate these issues.",
      ],
      action: "Use proper ergonomic setup. Take frequent breaks to stretch. If you experience persistent pain or discomfort, consult a healthcare professional.",
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: { [key: string]: { bg: string; border: string; accent: string } } = {
      red: { bg: "from-red-500/10 to-red-600/10", border: "border-red-500/30", accent: "text-red-400" },
      yellow: { bg: "from-yellow-500/10 to-yellow-600/10", border: "border-yellow-500/30", accent: "text-yellow-400" },
      orange: { bg: "from-orange-500/10 to-orange-600/10", border: "border-orange-500/30", accent: "text-orange-400" },
      blue: { bg: "from-blue-500/10 to-blue-600/10", border: "border-blue-500/30", accent: "text-blue-400" },
      purple: { bg: "from-purple-500/10 to-purple-600/10", border: "border-purple-500/30", accent: "text-purple-400" },
      green: { bg: "from-green-500/10 to-green-600/10", border: "border-green-500/30", accent: "text-green-400" },
    };
    return colors[color] || colors.blue;
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-red-950/20 to-gray-950">
      <div className="max-w-5xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-red-500/20 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl border-2 border-red-500/30 animate-pulse">
            ⚠️
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
              Health & Safety
            </span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Your health and well-being are important. Please read these warnings
            carefully before playing Explore the Universe 2175.
          </p>
        </div>

        <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-2xl p-8 mb-12">
          <div className="flex items-start gap-4">
            <div className="text-4xl flex-shrink-0">🚨</div>
            <div>
              <h2 className="text-2xl font-bold text-red-400 mb-3">
                Important Notice
              </h2>
              <p className="text-slate-300 mb-4 leading-relaxed">
                Before you play, please take a moment to read all health and
                safety warnings. Some people are susceptible to epileptic
                seizures or loss of consciousness when exposed to certain
                flashing lights or light patterns in everyday life. Such people
                may have a seizure while watching certain monitor images or
                playing certain video games.
              </p>
              <p className="text-slate-300 leading-relaxed">
                <strong className="text-white">
                  This may happen even if the person has no history of medical
                  problems or has never had any epileptic seizures.
                </strong>
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6 mb-12">
          {warnings.map((warning, index) => {
            const colors = getColorClasses(warning.color);
            return (
              <div
                key={index}
                className={`bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-xl p-8`}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="text-4xl flex-shrink-0">{warning.icon}</div>
                  <h2 className={`text-2xl font-bold ${colors.accent}`}>
                    {warning.title}
                  </h2>
                </div>
                <div className="space-y-3 mb-6">
                  {warning.content.map((paragraph, i) => (
                    <p key={i} className="text-slate-300 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                  <p className="text-white font-medium mb-1">
                    ✓ What you should do:
                  </p>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {warning.action}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">
            General Safety Guidelines
          </h2>
          <ul className="space-y-3 text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-cyan-400 mt-1">•</span>
              <span>
                Play in a well-lit room and maintain a safe distance from the
                screen
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-400 mt-1">•</span>
              <span>
                Take 15-minute breaks every hour of gameplay
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-400 mt-1">•</span>
              <span>
                Ensure proper posture and ergonomic setup
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-400 mt-1">•</span>
              <span>
                Stay hydrated and maintain healthy eating habits
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-400 mt-1">•</span>
              <span>
                Balance gaming with physical activity and social interaction
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-400 mt-1">•</span>
              <span>
                If you feel any discomfort, stop playing immediately
              </span>
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">
            Parents and Guardians
          </h2>
          <p className="text-slate-300 mb-4 leading-relaxed">
            It is your responsibility to monitor your children's gaming habits
            and ensure they follow these safety guidelines. Watch for symptoms
            such as:
          </p>
          <ul className="grid md:grid-cols-2 gap-3 text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-purple-400">⚠</span>
              <span>Dizziness or lightheadedness</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-purple-400">⚠</span>
              <span>Eye or muscle twitching</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-purple-400">⚠</span>
              <span>Altered vision or confusion</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-purple-400">⚠</span>
              <span>Involuntary movements</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-purple-400">⚠</span>
              <span>Loss of awareness</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-purple-400">⚠</span>
              <span>Disorientation</span>
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-slate-900/50 to-blue-900/20 border border-slate-700/50 rounded-xl p-8 text-center">
          <h3 className="text-xl font-bold text-white mb-3">
            Need Medical Advice?
          </h3>
          <p className="text-slate-300 mb-6">
            If you have any concerns about your health while playing, please
            consult a healthcare professional immediately.
          </p>
          <p className="text-slate-500 text-sm">
            By playing Explore the Universe 2175, you acknowledge that you have
            read and understood these health warnings.
          </p>
        </div>
      </div>
    </main>
  );
}
