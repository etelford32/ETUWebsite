"use client"

import { useEffect } from 'react'

/**
 * Fades `.reveal` elements in as they scroll into view. Drop one into any
 * server-rendered page that uses the class; it renders nothing itself.
 */
export default function RevealObserver() {
  useEffect(() => {
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('show')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12 }
    )
    document.querySelectorAll('.reveal').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  return null
}
