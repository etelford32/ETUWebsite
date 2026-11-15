"use client"

import { useState } from 'react'
import Image from 'next/image'

interface TrailerPlayerProps {
  /** The video file (path under /public). */
  src: string
  /** Still shown until the visitor presses play (path under /public). */
  poster: string
  posterAlt: string
  /** Accessible name for the play button. */
  label?: string
  className?: string
}

/**
 * A video that costs nothing until it is played. A `<video>` fetches its
 * poster eagerly and at full size, and `preload="metadata"` opens a
 * connection to the file, both on page load even when the player is far
 * below the fold. This shows a lazy, resized still with a play button and
 * only mounts the `<video>` on click, where it starts straight away.
 */
export default function TrailerPlayer({
  src,
  poster,
  posterAlt,
  label = 'Play the trailer',
  className = '',
}: TrailerPlayerProps) {
  const [playing, setPlaying] = useState(false)

  return (
    <div className={`relative bg-black ${className}`}>
      {/* Stays underneath the video, so there is no black flash while the
          first frame arrives. */}
      <Image
        src={poster}
        alt={playing ? '' : posterAlt}
        fill
        className="object-cover"
        sizes="(max-width: 1152px) 100vw, 1104px"
      />

      {playing ? (
        <video
          controls
          autoPlay
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={src} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={label}
          className="group absolute inset-0 flex items-center justify-center bg-slate-950/20 hover:bg-slate-950/5 transition-colors focus-visible:outline focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-cyan-300"
        >
          <span className="flex items-center justify-center w-20 h-20 md:w-28 md:h-28 rounded-full bg-slate-950/70 ring-2 ring-white/80 backdrop-blur-sm shadow-[0_0_50px_rgba(99,102,241,0.55)] transition-transform duration-300 group-hover:scale-110 group-active:scale-95">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="w-9 h-9 md:w-12 md:h-12 ml-1 text-white">
              <path d="M8 5.14v13.72a1 1 0 0 0 1.53.85l10.9-6.86a1 1 0 0 0 0-1.7L9.53 4.29A1 1 0 0 0 8 5.14z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  )
}
