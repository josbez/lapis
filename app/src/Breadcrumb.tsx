interface BreadcrumbProps {
  /**
   * Het vault-relatieve pad van de open notitie, bijv. "Dagboek/2026-08-14.md".
   * `null` bij een nieuwe notitie die nog geen bestand is: de regel blijft
   * leeg maar even hoog, zodat de tekst niet verspringt na het opslaan.
   */
  relPath: string | null
}

/**
 * Broodkruimel boven de editor (W10) — toont het pad zoals het op schijf
 * staat, in mapnamen en de bestandsnaam zelf. Geen los "vault"- of
 * "project"-label ervoor: dat zou iets suggereren dat niet in de boom
 * bestaat (07 §4.3, geen aannames over mapstructuur).
 */
export function Breadcrumb({ relPath }: BreadcrumbProps) {
  if (relPath === null) {
    return <div className="lapis-breadcrumb" aria-hidden="true" />
  }
  const segments = relPath.split('/')
  const last = segments.length - 1

  return (
    <nav className="lapis-breadcrumb" aria-label="Pad">
      {segments.map((segment, i) =>
        i === last ? (
          <span key={i} className="lapis-breadcrumb-current">
            {segment}
          </span>
        ) : (
          <span key={i}>
            <span>{segment}</span>
            <span className="lapis-breadcrumb-sep"> › </span>
          </span>
        ),
      )}
    </nav>
  )
}
