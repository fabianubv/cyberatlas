import {
  circuitPath,
  circuitSegments,
  circuitJunctions,
  circuitCardBoundaryEndpoint,
  simplifyCircuitPoints,
} from './routing'
import { circuitStructuralRoles } from '../circuitStructuralRole'
import { commonRouteProjection } from '../baseRoute'
import type { Point } from './types'
import type { GraphData, PathData } from '../data'
import { getNodeVisualBody } from './visualBody'
import type {
  SvgMapData,
  SvgNodeData,
  SvgRole,
  RouteMemberships,
  BusJunction,
  NodeTerminal,
  TerminalOrientation,
  SvgRouteDefinition,
  SvgDynamicConnector,
  SvgPhysicalSegment,
} from './types'
import { computeRouteBackbones } from './routeBackbone'
import { buildPhysicalSegments, type RouteWithPoints } from './physicalSegments'
import { getStaticLayout } from './staticLayout'
import { getNodeDimensions } from './nodeDimensions'

let memoizedSvgMapData: SvgMapData | null = null
let memoizedGraphRef: GraphData | null = null
let memoizedRootId: string | null = null
let memoizedPathsRef: PathData | undefined = undefined

export function createSvgMapData(
  graph: GraphData,
  rootId: string,
  pathsData?: PathData,
): SvgMapData {
  const cached = memoizedSvgMapData
  if (
    cached &&
    memoizedGraphRef === graph &&
    memoizedRootId === rootId &&
    memoizedPathsRef === pathsData
  ) {
    return cached
  }

  const layout = getStaticLayout()
  const structuralRoles = circuitStructuralRoles(graph)

  const feederOrientations = new Map<string, TerminalOrientation>()
  const feederSigns = new Map<string, number>()

  for (const route of layout.routes) {
    const points = route.points
    const targetId = route.target
    if (points.length >= 2) {
      const pPrev = points[points.length - 2]
      const pLast = points[points.length - 1]

      const dx = pLast.x - pPrev.x
      const dy = pLast.y - pPrev.y

      let orientation: TerminalOrientation
      if (Math.abs(dx) >= Math.abs(dy)) {
        orientation = dx >= 0 ? 'LEFT' : 'RIGHT'
        feederSigns.set(targetId, dx >= 0 ? -1 : 1)
      } else {
        orientation = dy >= 0 ? 'TOP' : 'BOTTOM'
        feederSigns.set(targetId, dy >= 0 ? -1 : 1)
      }
      feederOrientations.set(targetId, orientation)
    }
  }

  const childCounts = new Map<string, number>()
  for (const route of layout.routes) {
    childCounts.set(route.source, (childCounts.get(route.source) || 0) + 1)
  }

  const byId = new Map<string, SvgNodeData>()

  const targetGraphNodes = graph.nodes.filter(node => layout.positions.has(node.id))

  const nodes: SvgNodeData[] = targetGraphNodes.map(node => {
    const pos = layout.positions.get(node.id)!
    const role: SvgRole = structuralRoles.get(node.id) || 'leaf'
    const dim = getNodeDimensions(role)
    const feederSign = feederSigns.get(node.id) || 0
    const feederOrientation = feederOrientations.get(node.id) || 'LEFT'
    const childCount = childCounts.get(node.id) || 0

    const item: SvgNodeData = {
      id: node.id,
      name: node.name,
      type: node.type,
      domain: node.domain,
      depth: node.depth,
      summary: node.summary,
      role,
      x: pos.x,
      y: pos.y,
      width: dim.width,
      height: dim.height,
      centerX: pos.x + dim.width / 2,
      centerY: pos.y + dim.height / 2,
      feederSign,
      feederOrientation,
      childCount,
    }

    byId.set(node.id, item)
    return item
  })

  const baseMembers = new Set<string>()
  const socMembers = new Set<string>()
  const pentestMembers = new Set<string>()
  const grcMembers = new Set<string>()
  const cloudMembers = new Set<string>()
  const aiMembers = new Set<string>()

  if (pathsData?.paths) {
    const baseProj = commonRouteProjection(pathsData.paths)
    for (const id of baseProj.keys()) {
      if (byId.has(id)) {
        baseMembers.add(id)
      }
    }

    for (const p of pathsData.paths) {
      if (p.id === 'soc-l1' || p.id === 'soc') {
        p.nodes.forEach(n => {
          if (byId.has(n.id)) socMembers.add(n.id)
        })
      } else if (p.id === 'pentesting') {
        p.nodes.forEach(n => {
          if (byId.has(n.id)) pentestMembers.add(n.id)
        })
      } else if (p.id === 'grc') {
        p.nodes.forEach(n => {
          if (byId.has(n.id)) grcMembers.add(n.id)
        })
      } else if (p.id === 'cloud-security' || p.id === 'cloud') {
        p.nodes.forEach(n => {
          if (byId.has(n.id)) cloudMembers.add(n.id)
        })
      } else if (p.id === 'ai-security' || p.id === 'ai') {
        p.nodes.forEach(n => {
          if (byId.has(n.id)) aiMembers.add(n.id)
        })
      }
    }
  }

  const routes: RouteMemberships = {
    base: baseMembers,
    soc: socMembers,
    pentesting: pentestMembers,
    grc: grcMembers,
    cloud: cloudMembers,
    ai: aiMembers,
  }

  const routeDefs: SvgRouteDefinition[] = layout.routes.map(route => {
    const sourceRole: SvgRole = structuralRoles.get(route.source) || 'core'
    const targetRole: SvgRole = structuralRoles.get(route.target) || 'leaf'
    const fixedWaypoints = route.points.slice(1, -1)
    return {
      sourceId: route.source,
      targetId: route.target,
      fixedWaypoints,
      sourceRole,
      targetRole,
      side: route.side,
      rawPoints: route.points,
    }
  })

  const cardTerminalKeys = new Set<string>()
  layout.routes.forEach(r => {
    cardTerminalKeys.add(`${r.points[0].x},${r.points[0].y}`)
    cardTerminalKeys.add(`${r.points[r.points.length - 1].x},${r.points[r.points.length - 1].y}`)
  })

  const routesWithPoints = layout.routes.map(r => ({ route: r, points: r.points }))
  const segments = circuitSegments(routesWithPoints)
  const rawJunctions = circuitJunctions(segments)

  const busJunctions: BusJunction[] = rawJunctions
    .filter(j => {
      if (j.degree < 3 || cardTerminalKeys.has(`${j.point.x},${j.point.y}`)) {
        return false
      }
      for (const n of nodes) {
        const dx = Math.abs(j.point.x - n.centerX)
        const dy = Math.abs(j.point.y - n.centerY)
        const halfW = n.width / 2
        const halfH = n.height / 2
        if (dx < halfW + 10 && dy < halfH + 10) {
          return false
        }
      }
      return true
    })
    .map(j => ({
      x: j.point.x,
      y: j.point.y,
      degree: j.degree,
      ownerEdges: j.owners.map(o => `${o.source}->${o.target}`),
    }))

  const connectorPaths: string[] = layout.routes.map(route => circuitPath(route.points))

  const result: SvgMapData = {
    nodes,
    byId,
    bounds: layout.bounds,
    worldWidth: layout.width,
    worldHeight: layout.height,
    connectorPaths,
    routeDefs,
    busJunctions,
    routes,
    backbones: computeRouteBackbones(routes, routeDefs, graph),
    rootId,
    physicalSegments: buildPhysicalSegments(
      layout.routes.map(route => ({
        sourceId: route.source,
        targetId: route.target,
        points: route.points,
      })),
    ),
    pathsData,
    graph,
    structuralRoles,
  }

  memoizedSvgMapData = result
  memoizedGraphRef = graph
  memoizedRootId = rootId
  memoizedPathsRef = pathsData

  return result
}

/** Builds connector paths for a zoom level: internal waypoints stay fixed, and the first and last segments attach to the visible body of each node. */
export function computeDynamicConnectors(
  routeDefs: SvgRouteDefinition[],
  byId: Map<string, SvgNodeData>,
  zoom: number,
): {
  paths: string[]
  connectors: SvgDynamicConnector[]
  terminals: NodeTerminal[]
  physicalSegments: SvgPhysicalSegment[]
} {
  const paths: string[] = []
  const connectors: SvgDynamicConnector[] = []
  const terminals: NodeTerminal[] = []
  const routesWithPoints: RouteWithPoints[] = []

  for (const def of routeDefs) {
    const srcNode = byId.get(def.sourceId)
    const tgtNode = byId.get(def.targetId)
    if (!srcNode || !tgtNode) continue

    const srcBody = getNodeVisualBody(srcNode, zoom)
    const tgtBody = getNodeVisualBody(tgtNode, zoom)

    const rawPoints = def.rawPoints
    if (rawPoints.length < 2) continue

    const srcCenter: Point = { x: srcBody.renderCenterX, y: srcBody.renderCenterY }
    const tgtCenter: Point = { x: tgtBody.renderCenterX, y: tgtBody.renderCenterY }

    const nextSrc = rawPoints[1]
    const nextTgt = rawPoints[rawPoints.length - 2]

    const pStart = circuitCardBoundaryEndpoint(srcCenter, nextSrc, {
      width: srcBody.width,
      height: srcBody.height,
    })

    const pTerm = circuitCardBoundaryEndpoint(tgtCenter, nextTgt, {
      width: tgtBody.width,
      height: tgtBody.height,
    })

    const fullPoints: Point[] = [pStart, ...def.fixedWaypoints, pTerm]
    const simplified = simplifyCircuitPoints(fullPoints)
    const pathString = circuitPath(simplified)
    paths.push(pathString)
    connectors.push({
      path: pathString,
      sourceId: def.sourceId,
      targetId: def.targetId,
    })
    routesWithPoints.push({
      sourceId: def.sourceId,
      targetId: def.targetId,
      points: simplified,
    })

    let srcOrientation: TerminalOrientation = 'RIGHT'
    if (pStart.x > srcCenter.x) srcOrientation = 'RIGHT'
    else if (pStart.x < srcCenter.x) srcOrientation = 'LEFT'
    else if (pStart.y > srcCenter.y) srcOrientation = 'BOTTOM'
    else if (pStart.y < srcCenter.y) srcOrientation = 'TOP'

    let tgtOrientation: TerminalOrientation = 'LEFT'
    if (pTerm.x > tgtCenter.x) tgtOrientation = 'RIGHT'
    else if (pTerm.x < tgtCenter.x) tgtOrientation = 'LEFT'
    else if (pTerm.y > tgtCenter.y) tgtOrientation = 'BOTTOM'
    else if (pTerm.y < tgtCenter.y) tgtOrientation = 'TOP'

    terminals.push({
      x: pTerm.x,
      y: pTerm.y,
      orientation: tgtOrientation,
      nodeId: tgtNode.id,
      role: tgtNode.role,
    })

    terminals.push({
      x: pStart.x,
      y: pStart.y,
      orientation: srcOrientation,
      nodeId: srcNode.id,
      role: srcNode.role,
    })
  }

  const physicalSegments = buildPhysicalSegments(routesWithPoints)

  return { paths, connectors, terminals, physicalSegments }
}
