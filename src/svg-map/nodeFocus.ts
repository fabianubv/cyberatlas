import type { SvgMapData, SvgCamera } from './types'
import { CAMERA_LIMITS, getFitCamera, getResponsivePadding } from './camera'

const DOMAIN_IDS = new Set([
  'computing',
  'operating-systems',
  'networking',
  'web',
  'programming',
  'security-foundations',
  'identity-access',
  'data-analysis',
  'grc-domain',
])

/** Parent of a node, following `contains` edges. */
export function getParentNodeId(
  nodeId: string,
  data: SvgMapData,
): string | null {
  if (nodeId === data.rootId) return null

  if (data.graph?.edges) {
    for (const edge of data.graph.edges) {
      if (edge.type === 'contains' && edge.target === nodeId) {
        return edge.source
      }
    }
  }

  if (DOMAIN_IDS.has(nodeId)) {
    return data.rootId
  }

  return data.rootId
}

/** Bounding box of a node and its whole subtree. */
export function getSubtreeBounds(
  nodeId: string,
  data: SvgMapData,
): { left: number; right: number; top: number; bottom: number } | null {
  const rootNode = data.byId.get(nodeId)
  if (!rootNode) return null

  if (nodeId === data.rootId) {
    return data.bounds
  }

  const subtreeIds = new Set<string>([nodeId])
  if (data.graph?.edges) {
    const queue = [nodeId]
    while (queue.length > 0) {
      const current = queue.shift()!
      for (const e of data.graph.edges) {
        if (e.type === 'contains' && e.source === current) {
          if (!subtreeIds.has(e.target)) {
            subtreeIds.add(e.target)
            queue.push(e.target)
          }
        }
      }
    }
  }

  let minX = rootNode.x
  let maxX = rootNode.x + rootNode.width
  let minY = rootNode.y
  let maxY = rootNode.y + rootNode.height

  for (const id of subtreeIds) {
    const n = data.byId.get(id)
    if (!n) continue
    minX = Math.min(minX, n.x)
    maxX = Math.max(maxX, n.x + n.width)
    minY = Math.min(minY, n.y)
    maxY = Math.max(maxY, n.y + n.height)
  }

  return { left: minX, right: maxX, top: minY, bottom: maxY }
}

/** Camera target when focusing a node. Each level zooms deeper: core 0.09-0.16, domain 0.20-0.35, group 0.50-0.72, concept at reading zoom. */
export function getNodeFocusCamera(
  nodeId: string,
  data: SvgMapData,
  viewportWidth: number,
  viewportHeight: number,
): SvgCamera | null {
  const node = data.byId.get(nodeId)
  if (!node) return null

  const isPhone = Math.min(viewportWidth, viewportHeight) <= 480

  if (nodeId === data.rootId || node.role === 'core') {
    return isPhone
      ? getSmartMobileEntryCamera(data, viewportWidth, viewportHeight)
      : getFitCamera(data.bounds, viewportWidth, viewportHeight)
  }

  const bounds = getSubtreeBounds(nodeId, data)
  if (!bounds) return null

  const padding = getResponsivePadding(viewportWidth, viewportHeight)
  const fitCam = getFitCamera(bounds, viewportWidth, viewportHeight, padding)

  const worldCenterX = (bounds.left + bounds.right) / 2
  const worldCenterY = (bounds.top + bounds.bottom) / 2

  let targetZoom: number

  if (node.role === 'domain') {
    targetZoom = Math.max(0.20, Math.min(isPhone ? 0.28 : 0.35, fitCam.zoom))
  } else if (
    node.role === 'structural-container' ||
    node.role === 'structural-knowledge-hub'
  ) {
    targetZoom = Math.max(0.65, Math.min(isPhone ? 0.85 : 0.95, fitCam.zoom))
  } else {
    targetZoom = isPhone ? 3.0 : CAMERA_LIMITS.maxZoom
  }

  const x = viewportWidth / 2 - worldCenterX * targetZoom
  const y = viewportHeight / 2 - worldCenterY * targetZoom

  return { x, y, zoom: targetZoom }
}

/** Entry camera for phones: frames the core and the nine domains at a readable zoom. */
export function getSmartMobileEntryCamera(
  data: SvgMapData,
  viewportWidth: number,
  viewportHeight: number,
): SvgCamera {
  const coreNode = data.byId.get(data.rootId)
  if (!coreNode) {
    return getFitCamera(data.bounds, viewportWidth, viewportHeight, 16)
  }

  let minX = coreNode.x
  let maxX = coreNode.x + coreNode.width
  let minY = coreNode.y
  let maxY = coreNode.y + coreNode.height

  for (const domId of DOMAIN_IDS) {
    const dom = data.byId.get(domId)
    if (!dom) continue
    minX = Math.min(minX, dom.x)
    maxX = Math.max(maxX, dom.x + dom.width)
    minY = Math.min(minY, dom.y)
    maxY = Math.max(maxY, dom.y + dom.height)
  }

  const padding = 16
  const fitCam = getFitCamera({ left: minX, right: maxX, top: minY, bottom: maxY }, viewportWidth, viewportHeight, padding)

  const zoom = Math.max(0.12, Math.min(0.20, fitCam.zoom))

  const worldCenterX = (minX + maxX) / 2
  const worldCenterY = (minY + maxY) / 2

  const x = viewportWidth / 2 - worldCenterX * zoom
  const y = viewportHeight / 2 - worldCenterY * zoom

  return { x, y, zoom }
}

