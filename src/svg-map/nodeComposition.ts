import type { KnowledgeNode } from '../data'
import type { SvgRole } from './types'

/** Spanish role label shown on a card. */
export function getNodeRoleLabel(type: KnowledgeNode['type'], role: SvgRole): string {
  if (role === 'core') return 'NÚCLEO'
  if (role === 'domain') return 'DOMINIO'
  if (role === 'structural-container') return 'GRUPO'

  switch (type) {
    case 'skill':
      return 'HABILIDAD'
    case 'technology':
      return 'TECNOLOGÍA'
    case 'tool':
      return 'HERRAMIENTA'
    case 'concept':
    default:
      return 'CONCEPTO'
  }
}
