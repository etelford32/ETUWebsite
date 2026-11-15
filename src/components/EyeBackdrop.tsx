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
          // Phones show the art at 150vw, but at 3x pixel density that asks
          // for the 1920px file on a 400px screen. Claiming 90vw lands them
          // on the 1080-1200px one: still ~2 image pixels per CSS pixel
          // under the shade, at about 60% of the bytes.
          sizes="(min-width: 1024px) 100vw, (min-width: 640px) 124vw, 90vw"
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
