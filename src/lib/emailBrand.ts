import { SITE_URL } from '@/lib/siteUrl'

/**
 * ETU logo for transactional emails. Always the canonical production host:
 * mail clients fetch images long after send, so preview/localhost URLs
 * would break.
 */
export const EMAIL_LOGO_URL = `${SITE_URL}/brand/etu-logo-email.png`

export function emailLogoImg(size = 96, align: 'center' | 'left' = 'center'): string {
  const margin = align === 'center' ? '0 auto 12px' : '0 0 12px'
  return `<img src="${EMAIL_LOGO_URL}" width="${size}" height="${size}" alt="Explore the Universe 2175" style="display:block;margin:${margin};width:${size}px;height:${size}px;border:0;outline:none;text-decoration:none;border-radius:50%;" />`
}
