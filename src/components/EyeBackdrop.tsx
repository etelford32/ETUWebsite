import Image from 'next/image'

/**
 * The home hero's backdrop: MEGABOT's Evil Eye key art with the Eye pulsing
 * and the fleeing fighter's engines flickering. Fills its positioned parent.
 * The glow layers are registered to the painting by `.eye-stage` in
 * globals.css, which also places the art per screen size.
 */
export default function EyeBackdrop() {
  return (
    <div className="eye-stage" aria-hidden="true">
      <div className="eye-stage__plate">
        <Image
          src="/art/megabot-evil-eye-hero.jpg"
          alt=""
          width={2244}
          height={2804}
          priority
          quality={80}
          sizes="(min-width: 1024px) 100vw, (min-width: 640px) 124vw, 150vw"
        />
        <span className="eye-stage__bloom" />
        <span className="eye-stage__streak" />
        <span className="eye-stage__core" />
        <span className="eye-stage__engines" />
      </div>
      <div className="eye-stage__shade" />
    </div>
  )
}
