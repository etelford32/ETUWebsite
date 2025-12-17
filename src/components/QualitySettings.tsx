"use client";

import { useState, useEffect } from "react";

export type QualityLevel = "low" | "medium" | "high";

interface QualitySettingsProps {
  onChange: (quality: QualityLevel) => void;
  defaultQuality?: QualityLevel;
}

export default function QualitySettings({ onChange, defaultQuality }: QualitySettingsProps) {
  const [quality, setQuality] = useState<QualityLevel>(defaultQuality || "medium");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Load saved quality from localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("etu-animation-quality") as QualityLevel | null;
      if (saved && ["low", "medium", "high"].includes(saved)) {
        setQuality(saved);
        onChange(saved);
      }
    }
  }, [onChange]);

  const handleQualityChange = (newQuality: QualityLevel) => {
    setQuality(newQuality);
    onChange(newQuality);
    setIsOpen(false);

    // Save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("etu-animation-quality", newQuality);
    }
  };

  const getQualityIcon = (level: QualityLevel) => {
    switch (level) {
      case "low":
        return "⚡";
      case "medium":
        return "⭐";
      case "high":
        return "✨";
    }
  };

  const getQualityLabel = (level: QualityLevel) => {
    switch (level) {
      case "low":
        return "Low (Fast)";
      case "medium":
        return "Medium (Balanced)";
      case "high":
        return "High (Quality)";
    }
  };

  const getQualityDescription = (level: QualityLevel) => {
    switch (level) {
      case "low":
        return "150 particles, minimal effects";
      case "medium":
        return "300 particles, balanced";
      case "high":
        return "10,000 particles, full effects";
    }
  };

  return (
    <div className="absolute bottom-6 right-6 z-20">
      <div className="relative">
        {/* Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/40 backdrop-blur-md border border-purple-500/30 text-sm text-white/90 hover:text-white hover:border-purple-400/50 hover:bg-black/50 transition-all shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]"
          aria-label="Animation Quality Settings"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <span className="hidden sm:inline">Animation Quality: <strong>{quality.charAt(0).toUpperCase() + quality.slice(1)}</strong></span>
          <span className="sm:hidden">{getQualityIcon(quality)}</span>
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute bottom-full mb-2 right-0 w-72 rounded-xl bg-black/90 backdrop-blur-xl border border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.3)] overflow-hidden animate-fadeIn">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Animation Quality
              </h3>

              <div className="space-y-2">
                {(["high", "medium", "low"] as QualityLevel[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => handleQualityChange(level)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                      quality === level
                        ? "bg-purple-600/30 border border-purple-400/50 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                        : "bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm flex items-center gap-2">
                        <span className="text-lg">{getQualityIcon(level)}</span>
                        {getQualityLabel(level)}
                      </span>
                      {quality === level && (
                        <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <p className="text-xs text-white/60">{getQualityDescription(level)}</p>
                  </button>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-white/10">
                <p className="text-xs text-white/50 leading-relaxed">
                  Lower quality improves performance on slower devices. Settings are saved automatically.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
