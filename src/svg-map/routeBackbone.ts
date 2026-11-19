import type { GraphData } from '../data'
import type {
  SvgRouteId,
  RouteMemberships,
  SvgRouteDefinition,
} from './types'

export type RouteBackbone = {
  activeNodes: Set<string>
  activeEdges: Set<string> // Format: `${sourceId}->${targetId}`
  activeAncestors: Set<string>
}

export type RouteBackbones = {
  base: RouteBackbone
  'soc-l1': RouteBackbone
  pentesting: RouteBackbone
  grc: RouteBackbone
  'cloud-security': RouteBackbone
  'ai-security': RouteBackbone
}

/** Parent lookup from `contains` edges, falling back to route definitions when no graph is given. */
export function buildParentMap(
  routeDefs: SvgRouteDefinition[],
  graph?: GraphData,
): Map<string, string> {
  const parentMap = new Map<string, string>()
  if (graph) {
    for (const edge of graph.edges) {
      if (edge.type === 'contains') {
        parentMap.set(edge.target, edge.source)
      }
    }
  }
  for (const def of routeDefs) {
    if (!parentMap.has(def.targetId)) {
      parentMap.set(def.targetId, def.sourceId)
    }
  }
  return parentMap
}

/** Energizes the full ancestry of every node in the active route, so each one stays visibly connected back to the core. */
export function computeRouteBackbones(
  routes: RouteMemberships,
  routeDefs: SvgRouteDefinition[],
  graph?: GraphData,
): RouteBackbones {
  const parentMap = buildParentMap(routeDefs, graph)

  function buildBackboneForSet(memberSet: Set<string>): RouteBackbone {
    const activeNodes = new Set<string>()
    const activeEdges = new Set<string>()
    const activeAncestors = new Set<string>()

    for (const nodeId of memberSet) {
      activeNodes.add(nodeId)

      let current = nodeId
      while (parentMap.has(current)) {
        const parent = parentMap.get(current)!
        activeAncestors.add(parent)
        activeNodes.add(parent)
        activeEdges.add(`${parent}->${current}`)
        current = parent
      }
    }

    return { activeNodes, activeEdges, activeAncestors }
  }

  return {
    base: buildBackboneForSet(routes.base),
    'soc-l1': buildBackboneForSet(routes.soc),
    pentesting: buildBackboneForSet(routes.pentesting),
    grc: buildBackboneForSet(routes.grc),
    'cloud-security': buildBackboneForSet(routes.cloud),
    'ai-security': buildBackboneForSet(routes.ai),
  }
}

export function isEdgeInActiveBackbone(
  sourceId: string,
  targetId: string,
  routeId: SvgRouteId,
  backbones?: RouteBackbones,
): boolean {
  if (routeId === 'explore' || !backbones) return false
  const backbone = backbones[routeId]
  return backbone ? backbone.activeEdges.has(`${sourceId}->${targetId}`) : false
}
