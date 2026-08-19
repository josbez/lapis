/**
 * W10 — dunne wrapper rond `lucide-react` (na Stitch-terugkoppeling: "andere
 * iconenset", een echte icoonbibliotheek in plaats van het eigen lijntjesset
 * van hiervoor). Lucide's outline-stijl (1.5px lijndikte, ronde uiteinden)
 * is precies wat het Stitch-ontwerp zelf gebruikt.
 *
 * De namen en props (`size`, en `open` voor de chevron) blijven ongewijzigd
 * zodat de call-sites (App.tsx, Tree.tsx, NewItemMenu.tsx) niet hoefden te
 * veranderen — alleen de implementatie hierachter.
 */

import {
  ChevronRight,
  CornerDownLeft,
  File,
  FilePlus,
  Folder,
  FolderInput,
  FolderPlus,
  PanelLeft,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Star,
  StarOff,
  Trash2,
} from 'lucide-react'

interface IconProps {
  size?: number
}

export function IconSidebar({ size = 16 }: IconProps) {
  return <PanelLeft size={size} strokeWidth={1.5} aria-hidden="true" />
}

export function IconRefresh({ size = 16 }: IconProps) {
  return <RefreshCw size={size} strokeWidth={1.5} aria-hidden="true" />
}

export function IconFilePlus({ size = 16 }: IconProps) {
  return <FilePlus size={size} strokeWidth={1.5} aria-hidden="true" />
}

export function IconFolderPlus({ size = 16 }: IconProps) {
  return <FolderPlus size={size} strokeWidth={1.5} aria-hidden="true" />
}

export function IconSettings({ size = 16 }: IconProps) {
  return <Settings size={size} strokeWidth={1.5} aria-hidden="true" />
}

export function IconChevron({ size = 12, open }: IconProps & { open: boolean }) {
  return (
    <ChevronRight
      size={size}
      strokeWidth={1.5}
      aria-hidden="true"
      style={{ transform: open ? 'rotate(90deg)' : undefined, transition: 'transform 0.1s ease' }}
    />
  )
}

export function IconFile({ size = 14 }: IconProps) {
  return <File size={size} strokeWidth={1.5} aria-hidden="true" />
}

export function IconFolder({ size = 14 }: IconProps) {
  return <Folder size={size} strokeWidth={1.5} aria-hidden="true" />
}

export function IconPlus({ size = 16 }: IconProps) {
  return <Plus size={size} strokeWidth={1.5} aria-hidden="true" />
}

export function IconPencil({ size = 16 }: IconProps) {
  return <Pencil size={size} strokeWidth={1.5} aria-hidden="true" />
}

export function IconMove({ size = 16 }: IconProps) {
  return <FolderInput size={size} strokeWidth={1.5} aria-hidden="true" />
}

export function IconTrash({ size = 16 }: IconProps) {
  return <Trash2 size={size} strokeWidth={1.5} aria-hidden="true" />
}

export function IconStar({ size = 16 }: IconProps) {
  return <Star size={size} strokeWidth={1.5} aria-hidden="true" />
}

export function IconStarOff({ size = 16 }: IconProps) {
  return <StarOff size={size} strokeWidth={1.5} aria-hidden="true" />
}

export function IconSearch({ size = 16 }: IconProps) {
  return <Search size={size} strokeWidth={1.5} aria-hidden="true" />
}

export function IconEnter({ size = 14 }: IconProps) {
  return <CornerDownLeft size={size} strokeWidth={1.5} aria-hidden="true" />
}
