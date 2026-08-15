/**
 * W10 — een klein eigen setje lijniconen (geen icoonbibliotheek als
 * afhankelijkheid; dit zijn er negen, dat weegt niet op tegen een hele
 * package erbij). Alle iconen delen dezelfde vorm-taal uit het ontwerp:
 * `currentColor`, 1.5px lijndikte, ronde uiteinden — "scherpe, geometrische
 * lijnen" (Shapes/Folders in het design-tokenbestand).
 *
 * Elk icoon hier staat altijd naast een zichtbaar tekstlabel (toolbar,
 * contextmenu) — nooit los, dat was precies de correctie uit de
 * Stitch-briefing (§10/§11): geen kale, ongelabelde symbolen.
 */

interface IconProps {
  size?: number
}

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function IconSidebar({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} aria-hidden="true">
      <rect x="2.5" y="3.5" width="15" height="13" rx="1.5" />
      <line x1="8" y1="3.5" x2="8" y2="16.5" />
    </svg>
  )
}

export function IconRefresh({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} aria-hidden="true">
      <path d="M16 10a6 6 0 1 1-1.76-4.24" />
      <path d="M16 3.5v3.5h-3.5" />
    </svg>
  )
}

export function IconFilePlus({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} aria-hidden="true">
      <path d="M6 2.5h5.5L15 6v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Z" />
      <path d="M11.5 2.5V6H15" />
      <line x1="10" y1="10.5" x2="10" y2="14.5" />
      <line x1="8" y1="12.5" x2="12" y2="12.5" />
    </svg>
  )
}

export function IconFolderPlus({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} aria-hidden="true">
      <path d="M2.5 5a1 1 0 0 1 1-1h3.6l1.4 1.6H16a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5Z" />
      <line x1="9.5" y1="9.5" x2="9.5" y2="12.5" />
      <line x1="8" y1="11" x2="11" y2="11" />
    </svg>
  )
}

export function IconSettings({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} aria-hidden="true">
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 3v2M10 15v2M17 10h-2M5 10H3M14.9 5.1l-1.4 1.4M6.5 13.5l-1.4 1.4M14.9 14.9l-1.4-1.4M6.5 6.5 5.1 5.1" />
    </svg>
  )
}

export function IconChevron({ size = 12, open }: IconProps & { open: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      {...base}
      aria-hidden="true"
      style={{ transform: open ? 'rotate(90deg)' : undefined, transition: 'transform 0.1s ease' }}
    >
      <path d="M7 4l6 6-6 6" />
    </svg>
  )
}

export function IconFile({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} aria-hidden="true">
      <path d="M6 2.5h5.5L15 6v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Z" />
      <path d="M11.5 2.5V6H15" />
    </svg>
  )
}

export function IconFolder({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} aria-hidden="true">
      <path d="M2.5 5a1 1 0 0 1 1-1h3.6l1.4 1.6H16a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5Z" />
    </svg>
  )
}
