import layoutJson from '../data/layout.json'
import type { Bounds, Point } from './types'
import type { CircuitRoute, Side } from './routing'

export interface StaticLayoutNode {
  id: string
  x: number
  y: number
  width: number
  height: number
  centerX: number
  centerY: number
  role: string
  side: Side
  depth: number
}

export interface StaticLayoutRoute {
  source: string
  target: string
  depth: number
  side: Side
  points: Point[]
}

export interface StaticLayoutData {
  version: string
  name: string
  bounds: Bounds
  width: number
  height: number
  nodeCount: number
  routeCount: number
  nodes: StaticLayoutNode[]
  routes: StaticLayoutRoute[]
}

export type MapLayout = {
  positions: Map<string, Point>
  routes: CircuitRoute[]
  bounds: Bounds
  width: number
  height: number
}

let memoizedLayout: MapLayout | null = null

export function getStaticLayout(): MapLayout {
  if (memoizedLayout) {
    return memoizedLayout
  }

  const raw = layoutJson as unknown as StaticLayoutData
  const positions = new Map<string, Point>()

  for (const n of raw.nodes) {
    positions.set(n.id, { x: n.x, y: n.y })
  }

  const routes: CircuitRoute[] = raw.routes.map(r => ({
    source: r.source,
    target: r.target,
    depth: r.depth,
    side: r.side,
    points: r.points,
  }))

  memoizedLayout = { positions, routes, bounds: raw.bounds, width: raw.width, height: raw.height }

  return memoizedLayout
}
