"use client";

import { useState } from "react";

interface CameraControlsProps {
  megabotRef: React.RefObject<any>;
}

export default function CameraControls({ megabotRef }: CameraControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const call = (method: string) => {
    const scene = megabotRef.current;
    if (scene && typeof scene[method] === "function") {
      scene[method]();
    }
  };

  return (
    <div className="absolute bottom-6 left-6 z-20">
      <div className="relative">
        {/* Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/40 backdrop-blur-md border border-cyan-500/30 text-sm text-white/90 hover:text-white hover:border-cyan-400/50 hover:bg-black/50 transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)]"
          aria-label="Camera Controls"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span className="hidden sm:inline">Camera</span>
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Controls Panel */}
        {isOpen && (
          <div className="absolute bottom-full mb-2 left-0 w-56 rounded-xl bg-black/90 backdrop-blur-xl border border-cyan-500/30 shadow-[0_0_40px_rgba(34,211,238,0.3)] overflow-hidden animate-fadeIn">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Camera Controls
              </h3>

              {/* Zoom */}
              <div className="mb-3">
                <label className="text-xs text-white/50 uppercase tracking-wider mb-1 block">Zoom</label>
                <div className="flex gap-1">
                  <ControlButton label="+" onClick={() => call("cameraZoomIn")} />
                  <ControlButton label="-" onClick={() => call("cameraZoomOut")} />
                </div>
              </div>

              {/* Rotate */}
              <div className="mb-3">
                <label className="text-xs text-white/50 uppercase tracking-wider mb-1 block">Rotate</label>
                <div className="flex gap-1">
                  <ControlButton label="&#8592;" title="Left" onClick={() => call("cameraRotateLeft")} />
                  <ControlButton label="&#8594;" title="Right" onClick={() => call("cameraRotateRight")} />
                </div>
              </div>

              {/* Tilt */}
              <div className="mb-3">
                <label className="text-xs text-white/50 uppercase tracking-wider mb-1 block">Tilt</label>
                <div className="flex gap-1">
                  <ControlButton label="&#8593;" title="Up" onClick={() => call("cameraTiltUp")} />
                  <ControlButton label="&#8595;" title="Down" onClick={() => call("cameraTiltDown")} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-1">
                <ControlButton label="Reset" wide onClick={() => call("cameraReset")} />
                <ControlButton label="Focus" wide onClick={() => call("cameraFocus")} />
              </div>

              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-xs text-white/50 leading-relaxed">
                  Right-drag to orbit. Middle-drag to pan. Scroll to zoom. R to reset. F to focus.
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

function ControlButton({ label, title, wide, onClick }: { label: string; title?: string; wide?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={title || label}
      className={`${wide ? "flex-1" : "w-10"} h-9 rounded-lg bg-white/5 border border-white/10 text-white/80 text-sm font-medium hover:bg-cyan-500/20 hover:border-cyan-400/40 hover:text-white active:bg-cyan-500/30 transition-all`}
    >
      {label}
    </button>
  );
}
