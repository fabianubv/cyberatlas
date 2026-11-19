import { useEffect, useRef } from 'react'

type Source = { name: string; use: string; url: string }

const SOURCE_GROUPS: { title: string; sources: Source[] }[] = [
  {
    title: 'Marcos y estándares',
    sources: [
      { name: 'NIST NICE Framework', use: 'Roles y competencias', url: 'https://www.nist.gov/itl/applied-cybersecurity/nice/nice-framework-resource-center' },
      { name: 'NIST CSF 2.0', use: 'Gobierno, defensa y respuesta', url: 'https://www.nist.gov/cyberframework' },
      { name: 'CIS Controls v8', use: 'Activos, accesos y registros', url: 'https://www.cisecurity.org/controls' },
      { name: 'ISO/IEC 27001:2022', use: 'Gobernanza y cumplimiento', url: 'https://www.iso.org/standard/27001' },
    ],
  },
  {
    title: 'Certificaciones y formación',
    sources: [
      { name: 'CompTIA Security+', use: 'Fundamentos de seguridad', url: 'https://www.comptia.org/en-us/certifications/security/' },
      { name: 'CompTIA Network+', use: 'Redes', url: 'https://www.comptia.org/en-us/certifications/network/' },
      { name: 'CompTIA Linux+', use: 'Linux', url: 'https://www.comptia.org/en-us/certifications/linux/' },
      { name: 'CompTIA CySA+', use: 'Ruta SOC L1', url: 'https://www.comptia.org/en-us/certifications/cybersecurity-analyst/' },
      { name: 'CompTIA PenTest+', use: 'Ruta Pentesting', url: 'https://www.comptia.org/en-us/certifications/pentest/' },
      { name: 'SANS SEC401', use: 'Pilares de la Base', url: 'https://www.sans.org/cyber-security-courses/security-essentials' },
      { name: 'SANS SEC504', use: 'Ataque, detección y respuesta', url: 'https://www.sans.org/cyber-security-courses/hacker-techniques-incident-handling' },
    ],
  },
  {
    title: 'Amenazas y vulnerabilidades',
    sources: [
      { name: 'MITRE ATT&CK', use: 'Técnicas de atacantes reales', url: 'https://attack.mitre.org/' },
      { name: 'MITRE ATLAS', use: 'Ruta AI Security', url: 'https://atlas.mitre.org/' },
      { name: 'OWASP Top 10', use: 'Vulnerabilidades web', url: 'https://owasp.org/www-project-top-ten/' },
      { name: 'OWASP Top 10 for LLM', use: 'Riesgos de la IA generativa', url: 'https://genai.owasp.org/llm-top-10/' },
    ],
  },
]

type Props = {
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  isCompact: boolean
}

export function SourcesPanel({ isOpen, onToggle, onClose, isCompact }: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      onClose()
      triggerRef.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  const edge = isCompact ? 14 : 24

  return (
    <>
      <button
        ref={triggerRef}
        className="sources-trigger"
        onClick={onToggle}
        title="¿En qué se basa este mapa?"
        aria-label="¿En qué se basa este mapa?"
        aria-expanded={isOpen}
        style={{ bottom: edge + 44, right: edge + 4 }}
      >
        ?
      </button>

      {isOpen && (
        <section
          className="sources-panel"
          role="dialog"
          aria-labelledby="sources-title"
          style={
            isCompact
              ? { left: 12, right: 12, bottom: edge + 80, maxHeight: 'calc(100dvh - 180px)' }
              : { right: edge, bottom: edge + 80, width: 340, maxHeight: 'calc(100dvh - 190px)' }
          }
        >
          <div className="sources-header">
            <h2 id="sources-title">Fundamentos del mapa</h2>
            <button ref={closeRef} onClick={onClose} aria-label="Cerrar fundamentos">
              ✕
            </button>
          </div>
          <p className="sources-intro">CyberAtlas está construido a partir de estas referencias de la industria:</p>

          {SOURCE_GROUPS.map(group => (
            <div key={group.title} className="sources-group">
              <h3>{group.title}</h3>
              <ul>
                {group.sources.map(source => (
                  <li key={source.name}>
                    <a href={source.url} target="_blank" rel="noopener noreferrer">
                      {source.name}
                    </a>
                    <span>{source.use}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <p className="sources-note">Proyecto independiente, sin afiliación con estas organizaciones.</p>
        </section>
      )}
    </>
  )
}
