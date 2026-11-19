import type { SvgNodeData } from './types'
import { getVisualSize } from './nodeDimensions'

export type VisualBody = {
  width: number
  height: number
  renderX: number
  renderY: number
  renderCenterX: number
  renderCenterY: number
  bounds: { left: number; right: number; top: number; bottom: number }
}

/** Rendered body of a node at the current zoom. Nodes always stay centered on their layout position. */
export function getNodeVisualBody(node: SvgNodeData, zoom: number): VisualBody {
  const size = getVisualSize(node.role, zoom)
  const renderX = node.centerX - size.width / 2
  const renderY = node.centerY - size.height / 2
  return {
    width: size.width,
    height: size.height,
    renderX,
    renderY,
    renderCenterX: node.centerX,
    renderCenterY: node.centerY,
    bounds: {
      left: renderX,
      right: renderX + size.width,
      top: renderY,
      bottom: renderY + size.height,
    },
  }
}
