import type { GraphData, PathData } from '../data'
import { commonRouteProjection } from '../baseRoute'
import type { SvgRole, SvgRouteId } from './types'

export type Mastery = 'unknown' | 'recognize' | 'explain' | 'use' | 'analyze'

export type UserLearningState = {
  masteryByNodeId: Record<string, Mastery>
}

export const DEFAULT_LEARNING_STATE: UserLearningState = {
  masteryByNodeId: {},
}

export const MASTERY_SCORES: Record<Mastery, number> = {
  unknown: 0.0,
  recognize: 0.25,
  explain: 0.5,
  use: 0.75,
  analyze: 1.0,
}

export const MASTERY_LABELS: Record<Mastery, string> = {
  unknown: 'Sin empezar',
  recognize: 'Reconocer',
  explain: 'Explicar',
  use: 'Usar',
  analyze: 'Analizar',
}

export const RELEVANCE_LABELS: Record<number, string> = {
  0: 'Sin ruta',
  1: 'Contextual',
  2: 'Media',
  3: 'Alta',
  4: 'Muy alta',
}

export type DerivedNodeState = {
  nodeId: string
  role: SvgRole
  mastery: Mastery
  masteryScore: number
  masteryLabel: string
  relevance: number
  relevanceLabel: string
  progress: number
  progressPercent: number
  progressScope: number
  hasRouteMembership: boolean
}

/** Mastery for a node, `unknown` when not set. */
export function getNodeMastery(nodeId: string, state?: UserLearningState): Mastery {
  if (!state || !state.masteryByNodeId) return 'unknown'
  return state.masteryByNodeId[nodeId] || 'unknown'
}

export function getMasteryScore(mastery: Mastery): number {
  return MASTERY_SCORES[mastery] ?? 0.0
}

export function getRouteRelevanceMap(
  routeId: SvgRouteId,
  pathsData?: PathData,
): Map<string, number> {
  const map = new Map<string, number>()
  if (routeId === 'explore' || !pathsData?.paths) return map

  if (routeId === 'base') {
    const baseProj = commonRouteProjection(pathsData.paths)
    for (const [id, proj] of baseProj.entries()) {
      map.set(id, proj.relevance)
    }
    return map
  }

  const path = pathsData.paths.find(
    p => p.id === routeId || (routeId === 'soc-l1' && (p.id === 'soc-l1' || p.id === 'soc')),
  )
  if (path) {
    for (const n of path.nodes) {
      map.set(n.id, n.relevance)
    }
  }

  return map
}

let cachedGraph: GraphData | null = null
let cachedDescendants: Map<string, string[]> | null = null

/** Assessable descendant IDs per structural node. Structural nodes themselves add no weight. */
export function indexAssessableDescendants(graph: GraphData): Map<string, string[]> {
  if (cachedGraph === graph && cachedDescendants) {
    return cachedDescendants
  }

  const byId = new Map(graph.nodes.map(n => [n.id, n]))
  const childrenMap = new Map<string, string[]>()

  for (const edge of graph.edges) {
    if (edge.type === 'contains') {
      const existing = childrenMap.get(edge.source)
      if (existing) {
        existing.push(edge.target)
      } else {
        childrenMap.set(edge.source, [edge.target])
      }
    }
  }

  const descendantsMap = new Map<string, string[]>()

  function collect(nodeId: string): string[] {
    const cached = descendantsMap.get(nodeId)
    if (cached) return cached

    const result: string[] = []
    const children = childrenMap.get(nodeId) || []

    for (const childId of children) {
      const child = byId.get(childId)
      if (child) {
        if (child.assessable) {
          result.push(childId)
        }
        const sub = collect(childId)
        for (const s of sub) {
          result.push(s)
        }
      }
    }

    descendantsMap.set(nodeId, result)
    return result
  }

  for (const node of graph.nodes) {
    collect(node.id)
  }

  cachedGraph = graph
  cachedDescendants = descendantsMap
  return descendantsMap
}

/** Derived state of a node: its own score for knowledge nodes, the mean of its assessable descendants for structural nodes. Relevance does not affect the score. */
export function resolveDerivedNodeState({
  nodeId,
  role,
  routeId,
  graph,
  pathsData,
  state,
  descendantsMap,
  routeMap,
}: {
  nodeId: string
  role: SvgRole
  routeId: SvgRouteId
  graph: GraphData
  pathsData?: PathData
  state: UserLearningState
  descendantsMap?: Map<string, string[]>
  routeMap?: Map<string, number>
}): DerivedNodeState {
  const dMap = descendantsMap || indexAssessableDescendants(graph)
  const rMap = routeMap || getRouteRelevanceMap(routeId, pathsData)

  const isStructural = role === 'core' || role === 'domain' || role === 'structural-container'
  const mastery = getNodeMastery(nodeId, state)
  const masteryScore = getMasteryScore(mastery)
  const masteryLabel = MASTERY_LABELS[mastery]

  const relevance = rMap.get(nodeId) ?? 0
  const relevanceLabel = RELEVANCE_LABELS[relevance]
  const hasRouteMembership = routeId === 'explore' ? true : relevance > 0

  if (!isStructural) {
    return {
      nodeId,
      role,
      mastery,
      masteryScore,
      masteryLabel,
      relevance,
      relevanceLabel,
      progress: masteryScore,
      progressPercent: Math.round(masteryScore * 100),
      progressScope: 1,
      hasRouteMembership,
    }
  }

  const allDescendants = dMap.get(nodeId) || []
  let scopedDescendants: string[]

  if (routeId === 'explore') {
    scopedDescendants = allDescendants
  } else {
    scopedDescendants = allDescendants.filter(id => rMap.has(id))
  }

  const count = scopedDescendants.length
  if (count === 0) {
    return {
      nodeId,
      role,
      mastery: 'unknown',
      masteryScore: 0,
      masteryLabel: MASTERY_LABELS.unknown,
      relevance,
      relevanceLabel,
      progress: 0,
      progressPercent: 0,
      progressScope: 0,
      hasRouteMembership: routeId === 'explore' || allDescendants.some(id => rMap.has(id)),
    }
  }

  let totalScore = 0
  for (const descId of scopedDescendants) {
    const descMastery = getNodeMastery(descId, state)
    totalScore += getMasteryScore(descMastery)
  }

  const rawProgress = totalScore / count
  const progressPercent = Math.round(rawProgress * 100)

  return {
    nodeId,
    role,
    mastery: 'unknown',
    masteryScore: 0,
    masteryLabel: MASTERY_LABELS.unknown,
    relevance,
    relevanceLabel,
    progress: rawProgress,
    progressPercent,
    progressScope: count,
    hasRouteMembership: routeId === 'explore' || count > 0,
  }
}

/** Computes the derived state of every node in one pass. */
export function computeAllDerivedNodeStates(
  graph: GraphData,
  pathsData: PathData | undefined,
  routeId: SvgRouteId,
  state: UserLearningState,
  structuralRoles?: ReadonlyMap<string, SvgRole>,
): Map<string, DerivedNodeState> {
  const descendantsMap = indexAssessableDescendants(graph)
  const routeMap = getRouteRelevanceMap(routeId, pathsData)
  const result = new Map<string, DerivedNodeState>()

  for (const node of graph.nodes) {
    const role: SvgRole = structuralRoles?.get(node.id) || (node.assessable ? 'leaf' : 'structural-container')
    const derived = resolveDerivedNodeState({
      nodeId: node.id,
      role,
      routeId,
      graph,
      pathsData,
      state,
      descendantsMap,
      routeMap,
    })
    result.set(node.id, derived)
  }

  return result
}

