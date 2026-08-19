import { IconFilePlus, IconFolderPlus } from './Icons'

interface NewItemButtonsProps {
  onNewNote: () => void
  onNewFolder: () => void
}

/**
 * Twee icoon-knoppen naast elkaar onderaan de mappenbalk — nieuwe notitie
 * (primair) en nieuwe map (secundair). Vervangt de eerdere "+ Nieuw"-popup
 * (`NewItemMenu`): op verzoek terug naar losse knoppen na een nieuwe
 * Stitch-terugkoppelronde, ook al gaf Jos eerder aan de popup-versie
 * logisch te vinden — deze keer expliciet gekozen voor de knoppen.
 */
export function NewItemButtons({ onNewNote, onNewFolder }: NewItemButtonsProps) {
  return (
    <div className="lapis-sidebar-new-buttons">
      <button type="button" aria-label="Nieuwe notitie" title="Nieuwe notitie" onClick={onNewNote}>
        <IconFilePlus />
      </button>
      <button type="button" aria-label="Nieuwe map" title="Nieuwe map" onClick={onNewFolder}>
        <IconFolderPlus />
      </button>
    </div>
  )
}
