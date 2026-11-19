import type { SvgNodeData, SvgRole } from './types'
import { getNodeVisualBody, type VisualBody } from './visualBody'

function smoothstep(min: number, max: number, x: number): number {
  if (x <= min) return 0
  if (x >= max) return 1
  const t = (x - min) / (max - min)
  return t * t * (3 - 2 * t)
}

export function getNodePresentationBody(node: SvgNodeData, zoom: number): VisualBody {
  return getNodeVisualBody(node, zoom)
}

/** Far-zoom landmark state. Purely visual: it does not affect node size or connectors. */
export type SemanticFarLandmark = {
  isFarActive: boolean
  farOpacity: number
  normalOpacity: number
  screenFontSize: number
  worldFontSize: number
  anchorX: number
  anchorY: number
  textAnchor: 'start' | 'middle'
  showPlate: boolean
  plateWidth: number
  plateHeight: number
  plateX: number
  plateY: number
}

/** Domain rail width: about 4.5% of the card, with a 4.5px minimum on screen. */
export function getDomainRailWidth(bodyWidth: number, zoom: number): number {
  const z = Math.max(zoom, 0.001)
  const worldWidth = bodyWidth * 0.045
  const minWorldW = 4.5 / z
  return Math.max(minWorldW, worldWidth)
}

/** Far-zoom landmark for the core. Domains use a single continuous title to avoid ghosting. */
export function getSemanticFarLandmark(
  role: SvgRole,
  zoom: number,
  bodyWidth: number,
  bodyHeight: number,
  _stripWidth = 0,
): SemanticFarLandmark {
  void _stripWidth
  const z = Math.max(zoom, 0.001)
  if (role !== 'core') {
    return {
      isFarActive: false,
      farOpacity: 0,
      normalOpacity: 1,
      screenFontSize: 0,
      worldFontSize: 0,
      anchorX: 0,
      anchorY: 0,
      textAnchor: 'middle',
      showPlate: false,
      plateWidth: 0,
      plateHeight: 0,
      plateX: 0,
      plateY: 0,
    }
  }

  const farFadeIn = smoothstep(0.02, 0.06, z)
  const blendT = smoothstep(0.12, 0.22, z)
  const farOpacity = farFadeIn * (1 - blendT)
  const normalOpacity = blendT
  const isFarActive = farOpacity > 0.01

  const screenFontSize = 16.5
  return {
    isFarActive,
    farOpacity,
    normalOpacity,
    screenFontSize,
    worldFontSize: screenFontSize / z,
    anchorX: bodyWidth / 2,
    anchorY: bodyHeight * 0.52,
    textAnchor: 'middle',
    showPlate: false,
    plateWidth: bodyWidth,
    plateHeight: bodyHeight,
    plateX: 0,
    plateY: 0,
  }
}

