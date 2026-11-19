import type { SvgRole, NodeRepresentation } from './types'

/** Whether a node renders as a mark, an emerging body or a full card at a given zoom. */
export function getNodeRepresentation(
  role: SvgRole,
  zoom: number,
): NodeRepresentation {
  if (role === 'core' || role === 'domain') {
    return 'card'
  }

  if (role === 'structural-container' || role === 'structural-knowledge-hub') {
    return zoom < 0.16 ? 'mark' : 'card'
  }

  if (zoom < 0.22) {
    return 'mark'
  }
  if (zoom < 0.35) {
    return 'emerging'
  }
  return 'card'
}

/** Concepts own their representation, so only structural nodes get separate terminal pads. */
export function shouldShowNodeTerminal(role: SvgRole, zoom: number): boolean {
  if (role === 'leaf' || role === 'structural-knowledge-hub') {
    return false
  }
  if (role === 'structural-container') {
    return zoom >= 0.65
  }
  if (role === 'domain') {
    return zoom >= 0.40
  }
  if (role === 'core') {
    return zoom >= 0.35
  }
  return false
}

export function shouldShowBusJunctions(zoom: number): boolean {
  return zoom >= 0.04
}

