export type Point = { x: number; y: number }
export type Bounds = { left: number; right: number; top: number; bottom: number }

import type { KnowledgeNode } from '../data'
import type { CircuitStructuralRole } from '../circuitStructuralRole'

export type SvgRouteId = 'explore' | 'base' | 'soc-l1' | 'pentesting' | 'grc' | 'cloud-security' | 'ai-security'

export type SvgRole = CircuitStructuralRole

export type NodeRepresentation = 'mark' | 'emerging' | 'card'

export type SvgCamera = {
  x: number
  y: number
  zoom: number
}

export type TerminalOrientation = 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT'

export type NodeTerminal = {
  x: number
  y: number
  orientation: TerminalOrientation
  nodeId: string
  role: SvgRole
}

export type SvgDynamicConnector = {
  path: string
  sourceId: string
  targetId: string
}

export type SvgPhysicalSegment = {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  path: string
  ownerEdges: Array<{ sourceId: string; targetId: string }>
}

export type BusJunction = {
  x: number
  y: number
  degree: number
  ownerEdges?: string[]
}

export type SvgNodeData = {
  id: string
  name: string
  type: KnowledgeNode['type']
  domain: string | null
  depth: KnowledgeNode['depth']
  summary: string
  role: SvgRole
  x: number
  y: number
  width: number
  height: number
  centerX: number
  centerY: number
  feederSign: number
  feederOrientation: TerminalOrientation
  childCount?: number
}

export type RouteMemberships = {
  base: Set<string>
  soc: Set<string>
  pentesting: Set<string>
  grc: Set<string>
  cloud: Set<string>
  ai: Set<string>
}

export type SvgRouteDefinition = {
  sourceId: string
  targetId: string
  fixedWaypoints: { x: number; y: number }[]
  sourceRole: SvgRole
  targetRole: SvgRole
  side: 'north' | 'south' | 'east' | 'west'
  rawPoints: { x: number; y: number }[]
}

export type SvgMapData = {
  nodes: SvgNodeData[]
  byId: Map<string, SvgNodeData>
  bounds: { left: number; right: number; top: number; bottom: number }
  worldWidth: number
  worldHeight: number
  connectorPaths: string[]
  routeDefs: SvgRouteDefinition[]
  busJunctions: BusJunction[]
  routes: RouteMemberships
  backbones?: import('./routeBackbone').RouteBackbones
  rootId: string
  physicalSegments?: SvgPhysicalSegment[]
  pathsData?: import('../data').PathData
  graph?: import('../data').GraphData
  structuralRoles?: ReadonlyMap<string, SvgRole>
}

