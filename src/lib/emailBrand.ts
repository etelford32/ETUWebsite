import { SITE_URL } from '@/lib/siteUrl'

/**
 * ETU logo for transactional emails. Always the canonical production host:
 * mail clients fetch images long after send, so preview/localhost URLs
 * would break.
 */
export const EMAIL_LOGO_URL = `${SITE_URL}/brand/etu-logo-email.png`

// Source image is 480×216 (wordmark on black); keep the same aspect ratio.
const EMAIL_LOGO_ASPECT = 216 / 480

export function emailLogoImg(width = 200, align: 'center' | 'left' = 'center'): string {
  const height = Math.round(width * EMAIL_LOGO_ASPECT)
  const margin = align === 'center' ? '0 auto 12px' : '0 0 12px'
  return `<img src="${EMAIL_LOGO_URL}" width="${width}" height="${height}" alt="Explore the Universe 2175" style="display:block;margin:${margin};width:${width}px;height:${height}px;border:0;outline:none;text-decoration:none;border-radius:8px;background:#000;" />`
}
