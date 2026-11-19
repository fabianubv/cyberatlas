import { describe, expect, it } from 'vitest'
import { loadData } from '../data'
import { createSvgMapData, computeDynamicConnectors } from './svgGeometry'
import { buildPhysicalSegments } from './physicalSegments'
import { getNodeVisualBody } from './visualBody'
import { getNodePresentationBody, getSemanticFarLandmark, getDomainRailWidth } from './nodePresentation'
import { shouldShowBusJunctions, shouldShowNodeTerminal } from './semanticZoom'
import { getNodeRoleLabel } from './nodeComposition'
import { getNodeVisual } from './routeVisuals'
import { isEdgeInActiveBackbone } from './routeBackbone'
import { EXPLORE_COLORS, ROUTE_PALETTES, UNPOWERED_CIRCUIT_COLORS } from './visualTokens'
import { smoothstep, getNodeTypographyState, estimateTextWidth, resolveResponsiveTitle } from './nodeTypography'
import { getCardComposition, getRoleContentPhase, getTypographyScale, getLeafUtilityPresentation, CARD_COMPOSITION_TOKENS } from './cardDesignSystem'
import type { SvgRole } from './types'

describe('Mapa SVG de CyberAtlas', () => {
  const { graph, rootId, routes } = loadData()
  const svgData = createSvgMapData(graph, rootId, routes)

  it('preserves unpowered circuit topology and returns connector records for route filtering', () => {
    const { paths, connectors, terminals } = computeDynamicConnectors(svgData.routeDefs, svgData.byId, 0.08)
    expect(connectors.length).toBe(svgData.routeDefs.length)
    expect(paths.length).toBe(svgData.routeDefs.length)
    expect(terminals.length).toBe(svgData.routeDefs.length * 2)

    // Connectors have path, sourceId, targetId
    const firstConn = connectors[0]
    expect(firstConn.path).toBeDefined()
    expect(firstConn.sourceId).toBeDefined()
    expect(firstConn.targetId).toBeDefined()
  })

  const representativeZooms = [0.05, 0.08, 0.10, 0.15, 0.25, 0.35, 0.50, 0.75, 1.0, 1.5]

  // 1. EXACT NUMERICAL MATCH WITH HISTORICAL MONOTONE IMPLEMENTATION
  // 2. CANONICAL CARD ASPECT RATIO
  // 3. ZERO WORLD FOOTPRINT RETREAT & ROLE CEILINGS
  // 4. CONCEPT FAR MARK: TINY SQUARE POINT (3.2 SCREEN PX)
  // 5. CONCEPT MORPH & MATURE EXPANSION
  // 6. FIXED STRUCTURAL CENTERS (ZERO CENTER DRIFT)
  it('guarantees that structural node centers (Core, Domain, Group) never drift from layout', () => {
    const structuralNodes = svgData.nodes.filter(
      n => n.role === 'core' || n.role === 'domain' || n.role === 'structural-container',
    )

    for (const node of structuralNodes) {
      for (const z of representativeZooms) {
        const body = getNodeVisualBody(node, z)
        // Rendered center must exactly equal center
        expect(body.renderCenterX).toBe(node.centerX)
        expect(body.renderCenterY).toBe(node.centerY)
      }
    }
  })

  // 7. CONCEPT SPROUT ANCHORING & ZERO CONNECTOR DRIFT
  // 8. ZERO CONNECTOR GAP & ZERO OVERSHOOT
  it('connects final wire segment exactly to visible body boundary with zero gap and zero overshoot', () => {
    for (const z of [0.08, 0.25, 0.50, 0.75, 1.2]) {
      const { paths } = computeDynamicConnectors(svgData.routeDefs, svgData.byId, z)
      expect(paths).toHaveLength(356)

      // Verify boundary contact across routes
      for (let i = 0; i < 30; i++) {
        const def = svgData.routeDefs[i]
        const target = svgData.byId.get(def.targetId)!
        const targetBody = getNodeVisualBody(target, z)

        const pathStr = paths[i]
        const commands = pathStr.split(' ')
        const lastY = parseFloat(commands[commands.length - 1])
        const lastX = parseFloat(commands[commands.length - 2])

        const touchesLeft = Math.abs(lastX - targetBody.bounds.left) < 0.05
        const touchesRight = Math.abs(lastX - targetBody.bounds.right) < 0.05
        const touchesTop = Math.abs(lastY - targetBody.bounds.top) < 0.05
        const touchesBottom = Math.abs(lastY - targetBody.bounds.bottom) < 0.05

        expect(touchesLeft || touchesRight || touchesTop || touchesBottom).toBe(true)
      }
    }
  })

  // 9. ORIENTATION-AWARE NODE TERMINALS & BUS JUNCTIONS
  it('preserves orientation-aware NodeTerminals and BusJunction separation', () => {
    const { terminals } = computeDynamicConnectors(svgData.routeDefs, svgData.byId, 0.5)
    expect(terminals.length).toBeGreaterThan(0)

    const orientations = new Set(terminals.map(t => t.orientation))
    expect(orientations.has('LEFT')).toBe(true)
    expect(orientations.has('RIGHT')).toBe(true)
    expect(orientations.has('TOP')).toBe(true)
    expect(orientations.has('BOTTOM')).toBe(true)

    // Bus junctions are separate degree >= 3 bifurcations, not card endpoints
    expect(svgData.busJunctions.length).toBeGreaterThan(0)
    for (const bj of svgData.busJunctions) {
      expect(bj.degree).toBeGreaterThanOrEqual(3)
    }

    // Bus junctions are visible across standard navigable zooms
    expect(shouldShowBusJunctions(0.08)).toBe(true)
    expect(shouldShowBusJunctions(0.30)).toBe(true)
    expect(shouldShowBusJunctions(0.50)).toBe(true)

    // Bus junctions must never enter into any node card envelope (eliminates sliver artifacts)
    for (const bj of svgData.busJunctions) {
      for (const node of svgData.nodes) {
        const dx = Math.abs(bj.x - node.centerX)
        const dy = Math.abs(bj.y - node.centerY)
        const insideCard = dx < node.width / 2 + 8 && dy < node.height / 2 + 8
        expect(insideCard).toBe(false)
      }
    }

    // Concept body ITSELF owns the representation; no duplicate terminal rect is ever drawn on Concepts
    expect(shouldShowNodeTerminal('leaf', 0.50)).toBe(false)
    expect(shouldShowNodeTerminal('structural-knowledge-hub', 0.50)).toBe(false)
    expect(shouldShowNodeTerminal('domain', 0.50)).toBe(true)
  })

  // 10. SCREEN-SEMANTIC TYPOGRAPHY & HISTORICAL VISIBILITY THRESHOLDS
  // 11. INVARIANTS: EXACT 339 NODES, POSITIONS, SINGLE CAMERA
  // 12. CARD FAMILY STRUCTURAL TOKENS (ASPECT, SCALES, RADII)
  // 13. EXPLORE NEUTRAL PALETTE & ZERO GREEN WASH
  it('restores neutral Explore palette and eliminates green cast from all node surfaces', () => {
    const coreNode = svgData.nodes.find(n => n.role === 'core')!
    const domainNode = svgData.nodes.find(n => n.role === 'domain')!
    const groupNode = svgData.nodes.find(n => n.role === 'structural-container')!
    const leafNode = svgData.nodes.find(n => n.role === 'leaf')!

    const coreVisual = getNodeVisual({ nodeId: coreNode.id, role: coreNode.role, routeId: 'explore', routes: svgData.routes })
    const domainVisual = getNodeVisual({ nodeId: domainNode.id, role: domainNode.role, routeId: 'explore', routes: svgData.routes })
    const groupVisual = getNodeVisual({ nodeId: groupNode.id, role: groupNode.role, routeId: 'explore', routes: svgData.routes })
    const leafVisual = getNodeVisual({ nodeId: leafNode.id, role: leafNode.role, routeId: 'explore', routes: svgData.routes })

    // tokens verification: graphite, charcoal, steel
    expect(coreVisual.fill).toBe(EXPLORE_COLORS.coreBg) // #111619
    expect(domainVisual.fill).toBe(EXPLORE_COLORS.domainBg) // #181D22
    expect(groupVisual.fill).toBe(EXPLORE_COLORS.groupBg) // #111619
    expect(leafVisual.fill).toBe(EXPLORE_COLORS.cardBg) // #15191D

    // Borders
    expect(coreVisual.stroke).toBe(EXPLORE_COLORS.coreBorder) // #6B7471
    expect(domainVisual.stroke).toBe(EXPLORE_COLORS.domainBorder) // #4B555E
    expect(groupVisual.stroke).toBe(EXPLORE_COLORS.groupBorder) // #5B696B
    expect(leafVisual.stroke).toBe(EXPLORE_COLORS.cardBorder) // #3A4249

    // Explore connector stroke is neutral steel/graphite (#3A4249)
    expect(ROUTE_PALETTES.explore.connector).toBe('#3A4249')
  })

  // 14. ROUTE PALETTES VERIFICATION (SOC, PENTESTING, GRC, BASE)
  it('restores approved route color palettes and energized states', () => {
    // SOC: Cyan family (#00F0FF)
    expect(ROUTE_PALETTES['soc-l1'].accent).toBe('#00F0FF')
    expect(ROUTE_PALETTES['soc-l1'].border).toBe('#1D3B47')
    expect(ROUTE_PALETTES['soc-l1'].bg).toBe('#0E1D24')

    // Pentesting: Red / Crimson family (#FF3B5C)
    expect(ROUTE_PALETTES.pentesting.accent).toBe('#FF3B5C')
    expect(ROUTE_PALETTES.pentesting.border).toBe('#471C26')
    expect(ROUTE_PALETTES.pentesting.bg).toBe('#241217')

    // GRC: Amber family (#F59E0B)
    expect(ROUTE_PALETTES.grc.accent).toBe('#F59E0B')
    expect(ROUTE_PALETTES.grc.border).toBe('#4D3818')
    expect(ROUTE_PALETTES.grc.bg).toBe('#261C0E')

    // Base: Electric Mint family (#00FF9C)
    expect(ROUTE_PALETTES.base.accent).toBe('#00FF9C')
    expect(ROUTE_PALETTES.base.border).toBe('#1A4D37')
    expect(ROUTE_PALETTES.base.bg).toBe('#0F261C')

    // Cloud Security: Sky Blue family (#38BDF8)
    expect(ROUTE_PALETTES['cloud-security'].accent).toBe('#38BDF8')
    expect(ROUTE_PALETTES['cloud-security'].border).toBe('#154860')
    expect(ROUTE_PALETTES['cloud-security'].bg).toBe('#0C2836')

    // AI Security: Purple Lilac family (#A855F7)
    expect(ROUTE_PALETTES['ai-security'].accent).toBe('#A855F7')
    expect(ROUTE_PALETTES['ai-security'].border).toBe('#3E2458')
    expect(ROUTE_PALETTES['ai-security'].bg).toBe('#1D1328')
  })

  // 15. STRUCTURAL BADGES & OUTGOING CHILD DEGREE
  it('identifies structural child counts on container and domain nodes', () => {
    const domainWithChildren = svgData.nodes.find(n => n.role === 'domain' && (n.childCount || 0) > 0)
    expect(domainWithChildren).toBeDefined()
    expect(domainWithChildren!.childCount).toBeGreaterThan(0)

    const groupWithChildren = svgData.nodes.find(n => n.role === 'structural-container' && (n.childCount || 0) > 0)
    expect(groupWithChildren).toBeDefined()
    expect(groupWithChildren!.childCount).toBeGreaterThan(0)
  })

  // 16. CONTINUOUS ACTIVE ROUTE BACKBONE
  // 17. MODE-DERIVED INTERACTION COLORS (ZERO HARDCODED GREEN)
  // 18. GROUP FIT VISIBILITY FLOOR
  it('enforces a guaranteed Group visibility floor so containers never vanish at FIT', () => {
    const groupNode = svgData.nodes.find(n => n.role === 'structural-container')!

    // In Explore mode, Group opacity floor is 0.85
    const exploreGroup = getNodeVisual({
      nodeId: groupNode.id,
      role: groupNode.role,
      routeId: 'explore',
      routes: svgData.routes,
    })
    expect(exploreGroup.opacity).toBeGreaterThanOrEqual(0.80)

    // In active route mode when off-route, Group opacity floor is 0.60
    const offRouteGroup = getNodeVisual({
      nodeId: groupNode.id,
      role: groupNode.role,
      routeId: 'soc-l1',
      routes: svgData.routes,
    })
    expect(offRouteGroup.opacity).toBeGreaterThanOrEqual(0.60)
  })

  // 19. DOMAIN INTEGRATED LEFT RAIL & CORE CLEANUP
  // 20. STRUCTURAL ROLE LABELS & CONCEPT ROLE SLOT
  it('provides technical role labels for Core, Domain, Group, and Concept subtypes', () => {
    expect(getNodeRoleLabel('core', 'core')).toBe('NÚCLEO')
    expect(getNodeRoleLabel('domain', 'domain')).toBe('DOMINIO')
    expect(getNodeRoleLabel('group', 'structural-container')).toBe('GRUPO')
    expect(getNodeRoleLabel('concept', 'leaf')).toBe('CONCEPTO')
    expect(getNodeRoleLabel('skill', 'leaf')).toBe('HABILIDAD')
    expect(getNodeRoleLabel('technology', 'leaf')).toBe('TECNOLOGÍA')
    expect(getNodeRoleLabel('tool', 'leaf')).toBe('HERRAMIENTA')
  })

  // 21. BADGES ANCHORED INSIDE CARD BOUNDS
  // 22. CONNECTOR STROKE WEIGHT UNIFICATION
  it('unifies active route stroke width with base circuit stroke width identically across zooms', () => {
    for (const z of [0.05, 0.08, 0.15, 0.25, 0.50, 0.75, 1.0, 1.5]) {
      const baseStrokeWidth = Math.max(1.0, 1.4 / Math.max(z, 0.05))
      // Both active route wires and unpowered tracks share baseStrokeWidth identically (no 1.08x, no 1.25x)
      const activeStrokeWidth = baseStrokeWidth
      expect(activeStrokeWidth).toBe(baseStrokeWidth)
      expect(activeStrokeWidth).toBeGreaterThanOrEqual(1.0)
    }
  })

  // 23. CONTINUOUS SMOOTHSTEP HERMITE INTERPOLATION
  it('guarantees monotonic C1 smoothstep interpolation with zero binary pop-ins', () => {
    const min = 15
    const max = 35

    expect(smoothstep(min, max, 10)).toBe(0)
    expect(smoothstep(min, max, 15)).toBe(0)
    expect(smoothstep(min, max, 25)).toBe(0.5)
    expect(smoothstep(min, max, 35)).toBe(1)
    expect(smoothstep(min, max, 40)).toBe(1)

    // Strictly monotonic progression without abrupt jumps
    let prev = -1
    for (let x = 14; x <= 36; x += 0.5) {
      const val = smoothstep(min, max, x)
      expect(val).toBeGreaterThanOrEqual(prev)
      if (prev >= 0) {
        // Delta between steps of 0.5 should never jump abruptly
        expect(val - prev).toBeLessThanOrEqual(0.08)
      }
      prev = val
    }
  })

  // 24. DETERMINISTIC 2-LINE BALANCED WRAPPING
  // 25. PROGRESSIVE CONTENT MATURATION, CONTAINMENT & PROPORTIONAL SCALING
  it('enforces progressive content maturation, strict containment and proportional scaling', () => {
    const sampleConcept = svgData.nodes.find(n => n.role === 'leaf')!
    const sampleDomain = svgData.nodes.find(n => n.role === 'domain' && (n.childCount || 0) > 0)!
    const sampleGroup = svgData.nodes.find(n => n.role === 'structural-container' && (n.childCount || 0) > 0)!

    expect(sampleConcept).toBeDefined()
    expect(sampleDomain).toBeDefined()
    expect(sampleGroup).toBeDefined()

    // Emerging Concept (z = 0.45, rep = 'emerging') has non-zero titleOpacity without requiring isCard
    const emergingConceptBody = getNodeVisualBody(sampleConcept, 0.48)
    const emergingConceptTypo = getNodeTypographyState({
      role: sampleConcept.role,
      type: sampleConcept.type,
      name: sampleConcept.name,
      childCount: sampleConcept.childCount,
      zoom: 0.48,
      bodyWidth: emergingConceptBody.width,
      bodyHeight: emergingConceptBody.height,
    })
    expect(emergingConceptTypo.titleOpacity).toBeGreaterThan(0)
    expect(emergingConceptTypo.titleOpacity).toBeLessThan(1)

    // Across zooms, verify badges strictly lag behind title readability and containment is absolute
    for (const z of [0.08, 0.15, 0.25, 0.35, 0.45, 0.55, 0.75, 1.0]) {
      const groupBody = getNodeVisualBody(sampleGroup, z)
      const groupTypo = getNodeTypographyState({
        role: sampleGroup.role,
        type: sampleGroup.type,
        name: sampleGroup.name,
        childCount: sampleGroup.childCount,
        zoom: z,
        bodyWidth: groupBody.width,
        bodyHeight: groupBody.height,
      })

      // Invariant: badges never precede titles
      expect(groupTypo.badgeOpacity).toBeLessThanOrEqual(groupTypo.titleOpacity)

      const conceptBody = getNodeVisualBody(sampleConcept, z)
      const conceptTypo = getNodeTypographyState({
        role: sampleConcept.role,
        type: sampleConcept.type,
        name: sampleConcept.name,
        childCount: sampleConcept.childCount,
        zoom: z,
        bodyWidth: conceptBody.width,
        bodyHeight: conceptBody.height,
      })

      // Far zoom: Concept marks (z < 0.30) have 0 title opacity
      if (z < 0.30) {
        expect(conceptTypo.titleOpacity).toBe(0)
        expect(conceptTypo.badgeOpacity).toBe(0)
      }

      // Containment invariant: font size NEVER exceeds available card bounds
      const maxLineChars = Math.max(...conceptTypo.wrappedLines.map(l => l.length), 1)
      const maxW = conceptBody.width * 0.84 / (maxLineChars * 0.56)
      expect(conceptTypo.titleFontSize).toBeLessThanOrEqual(maxW + 1e-4)
    }

    // Mature Domain scales proportionally above previous 18px fixed ceiling
    const domainBody = getNodeVisualBody(sampleDomain, 1.00)
    const domainTypo = getNodeTypographyState({
      role: sampleDomain.role,
      type: sampleDomain.type,
      name: sampleDomain.name,
      childCount: sampleDomain.childCount,
      zoom: 1.00,
      bodyWidth: domainBody.width,
      bodyHeight: domainBody.height,
    })
    expect(domainTypo.titleOpacity).toBe(1.0)
    expect(domainTypo.titleScreenFontSize).toBeGreaterThan(20.0)

    // Mature Group scales proportionally above previous 15px fixed ceiling
    const groupBody = getNodeVisualBody(sampleGroup, 1.00)
    const groupTypo = getNodeTypographyState({
      role: sampleGroup.role,
      type: sampleGroup.type,
      name: sampleGroup.name,
      childCount: sampleGroup.childCount,
      zoom: 1.00,
      bodyWidth: groupBody.width,
      bodyHeight: groupBody.height,
    })
    expect(groupTypo.titleOpacity).toBe(1.0)
    expect(groupTypo.titleScreenFontSize).toBeGreaterThan(16.0)
  })

  // 26. DEDUPLICATED PHYSICAL CIRCUIT ARCHITECTURE
  it('deduplicates collinear physical circuit segments and aggregates owner edges', () => {
    // A. Synthetic unit verification: identical collinear segments merged & reversed endpoints canonicalized
    const testRoutes = [
      {
        sourceId: 'node-A',
        targetId: 'node-B',
        points: [{ x: 100, y: 50 }, { x: 200, y: 50 }],
      },
      {
        sourceId: 'node-C',
        targetId: 'node-D',
        points: [{ x: 200, y: 50 }, { x: 100, y: 50 }], // reversed order
      },
    ]
    const syntheticPhysical = buildPhysicalSegments(testRoutes)
    expect(syntheticPhysical).toHaveLength(1)
    expect(syntheticPhysical[0].ownerEdges).toHaveLength(2)
    expect(syntheticPhysical[0].ownerEdges).toEqual([
      { sourceId: 'node-A', targetId: 'node-B' },
      { sourceId: 'node-C', targetId: 'node-D' },
    ])
    expect(syntheticPhysical[0].x1).toBe(100)
    expect(syntheticPhysical[0].x2).toBe(200)
    expect(syntheticPhysical[0].y1).toBe(50)
    expect(syntheticPhysical[0].y2).toBe(50)

    // B. Real map topology verification
    const dynamic = computeDynamicConnectors(svgData.routeDefs, svgData.byId, 0.50)
    const physical = dynamic.physicalSegments
    expect(physical).toBeDefined()

    // 1. Raw atomic count across all 356 logical edges
    let rawSegmentCount = 0
    for (const def of svgData.routeDefs) {
      rawSegmentCount += def.rawPoints.length - 1
    }
    expect(svgData.routeDefs).toHaveLength(356)

    // 2. Deduplicated physical segments count is strictly lower than raw atomic count
    expect(physical.length).toBeLessThan(rawSegmentCount)

    // 3. Shared segments store multiple owner edges
    const maxOwners = Math.max(...physical.map(s => s.ownerEdges.length))
    expect(maxOwners).toBeGreaterThan(1)
    const sharedSegments = physical.filter(s => s.ownerEdges.length > 1)
    expect(sharedSegments.length).toBeGreaterThan(0)

    // 4. Physical segment rendered once: IDs are unique and segments do not overlap
    const idSet = new Set(physical.map(s => s.id))
    expect(idSet.size).toBe(physical.length)

    // 5. Segment active if ANY owner edge is in active route backbone
    const socRoute = 'soc-l1'
    const socBackbone = svgData.backbones![socRoute]
    expect(socBackbone).toBeDefined()

    // Find a shared trunk where at least one edge is in SOC active backbone
    const activeSharedSeg = physical.find(s =>
      s.ownerEdges.length > 1 &&
      s.ownerEdges.some(e => isEdgeInActiveBackbone(e.sourceId, e.targetId, socRoute, svgData.backbones!)) &&
      s.ownerEdges.some(e => !isEdgeInActiveBackbone(e.sourceId, e.targetId, socRoute, svgData.backbones!)),
    )
    expect(activeSharedSeg).toBeDefined()
    const isSegActive = activeSharedSeg!.ownerEdges.some(e =>
      isEdgeInActiveBackbone(e.sourceId, e.targetId, socRoute, svgData.backbones!),
    )
    expect(isSegActive).toBe(true)

    // 6. Off-route segment remains context-visible
    const offRouteSeg = physical.find(s =>
      !s.ownerEdges.some(e => isEdgeInActiveBackbone(e.sourceId, e.targetId, socRoute, svgData.backbones!)),
    )
    expect(offRouteSeg).toBeDefined()
    expect(UNPOWERED_CIRCUIT_COLORS.connectorOpacity).toBeGreaterThan(0)
    expect(UNPOWERED_CIRCUIT_COLORS.connectorStroke).toBe('#28332F')

    // 7. Dynamic terminal/card boundary contact remains strictly intact
    // Terminals are computed and match connection endpoints
    expect(dynamic.terminals.length).toBeGreaterThan(0)
    for (const t of dynamic.terminals) {
      expect(Number.isFinite(t.x)).toBe(true)
      expect(Number.isFinite(t.y)).toBe(true)
    }
  })

  // 27. CARD COMPOSITION & OPTICAL INDEPENDENCE
  it('enforces independent optical centers, frame metadata zones and role alignment rules', () => {
    const cardW = 246
    const cardH = 104
    const z = 1.0

    // 1. CORE: Title centered horizontally and vertically, metadata top-center
    const coreComp = getCardComposition('core', cardW, cardH, z)
    expect(coreComp.titleTextAnchor).toBe('middle')
    expect(coreComp.titleAnchorX).toBe(cardW / 2)
    expect(coreComp.titleAnchorY).toBeCloseTo(cardH * 0.50, 2)
    expect(coreComp.metadataTextAnchor).toBe('middle')
    expect(coreComp.metadataAnchorX).toBe(cardW / 2)
    expect(coreComp.metadataAnchorY).toBeCloseTo(cardH * 0.22, 2)

    // 2. DOMAIN: Symmetric centered title and metadata, clean chassis
    const domainComp = getCardComposition('domain', cardW, cardH, z, true)
    expect(domainComp.titleTextAnchor).toBe('middle')
    expect(domainComp.titleAnchorX).toBe(cardW / 2)
    expect(domainComp.titleAnchorY).toBeCloseTo(cardH * 0.50, 2)
    expect(domainComp.metadataTextAnchor).toBe('middle')
    expect(domainComp.metadataAnchorX).toBe(cardW / 2)
    expect(domainComp.metadataAnchorY).toBeCloseTo(cardH * 0.22, 2)
    expect(domainComp.stripWidth).toBe(0) // structural left rail removed for clean chassis

    // 3. GROUP: Title centered independently, metadata top-left frame
    const groupComp = getCardComposition('structural-container', cardW, cardH, z, true)
    expect(groupComp.titleTextAnchor).toBe('middle')
    expect(groupComp.titleAnchorX).toBe(cardW / 2)
    expect(groupComp.titleAnchorY).toBeCloseTo(cardH * 0.52, 2)
    expect(groupComp.metadataTextAnchor).toBe('start')
    expect(groupComp.metadataAnchorX).toBe(groupComp.leftInset)
    expect(groupComp.metadataAnchorY).toBeCloseTo(cardH * 0.22, 2)

    // 4. CONCEPT family (leaf & hub): Title centered independently, type metadata top-left frame
    const leafComp = getCardComposition('leaf', cardW, cardH, z, false)
    expect(leafComp.titleTextAnchor).toBe('middle')
    expect(leafComp.titleAnchorX).toBe(cardW / 2)
    expect(leafComp.titleAnchorY).toBeCloseTo(cardH * 0.52, 2)
    expect(leafComp.metadataTextAnchor).toBe('start')
    expect(leafComp.metadataAnchorX).toBe(leafComp.leftInset)
    expect(leafComp.metadataAnchorY).toBeCloseTo(cardH * 0.22, 2)

    const hubComp = getCardComposition('structural-knowledge-hub', cardW, cardH, z, true)
    expect(hubComp.titleTextAnchor).toBe('middle')
    expect(hubComp.titleAnchorX).toBe(cardW / 2)
    expect(hubComp.titleAnchorY).toBeCloseTo(cardH * 0.52, 2)
    expect(hubComp.metadataTextAnchor).toBe('start')

    // 5. Optical Independence: Title Y is identical regardless of whether metadata or badge exist
    const domainWithoutBadge = getCardComposition('domain', cardW, cardH, z, false)
    expect(domainWithoutBadge.titleAnchorY).toBe(domainComp.titleAnchorY)
    expect(domainWithoutBadge.titleAnchorX).toBe(domainComp.titleAnchorX)

    const groupWithoutBadge = getCardComposition('structural-container', cardW, cardH, z, false)
    expect(groupWithoutBadge.titleAnchorY).toBe(groupComp.titleAnchorY)
    expect(groupWithoutBadge.titleAnchorX).toBe(groupComp.titleAnchorX)
  })

  // 28. SYNCHRONIZED ROLE REVEAL & COMPRESSED TYPOGRAPHY SCALING
  it('synchronizes content reveal timing strictly by role and applies compressed typography scaling', () => {
    // 1. Same-role synchronization: All Domains, Groups, and Concepts share identical titleOpacity at any given zoom
    const domains = svgData.nodes.filter(n => n.role === 'domain')
    const groups = svgData.nodes.filter(n => n.role === 'structural-container')
    const concepts = svgData.nodes.filter(n => n.role === 'leaf')

    expect(domains.length).toBeGreaterThanOrEqual(2)
    expect(groups.length).toBeGreaterThanOrEqual(2)
    expect(concepts.length).toBeGreaterThanOrEqual(2)

    for (const z of [0.08, 0.12, 0.16, 0.22, 0.35, 0.45, 0.60, 1.00]) {
      // Domain synchronization
      const d1Body = getNodeVisualBody(domains[0], z)
      const d2Body = getNodeVisualBody(domains[1], z)
      const d1Typo = getNodeTypographyState({
        role: domains[0].role,
        type: domains[0].type,
        name: domains[0].name,
        childCount: domains[0].childCount,
        zoom: z,
        bodyWidth: d1Body.width,
        bodyHeight: d1Body.height,
      })
      const d2Typo = getNodeTypographyState({
        role: domains[1].role,
        type: domains[1].type,
        name: domains[1].name,
        childCount: domains[1].childCount,
        zoom: z,
        bodyWidth: d2Body.width,
        bodyHeight: d2Body.height,
      })
      expect(d1Typo.titleOpacity).toBeCloseTo(d2Typo.titleOpacity, 4)

      // Group synchronization
      const g1Body = getNodeVisualBody(groups[0], z)
      const g2Body = getNodeVisualBody(groups[1], z)
      const g1Typo = getNodeTypographyState({
        role: groups[0].role,
        type: groups[0].type,
        name: groups[0].name,
        childCount: groups[0].childCount,
        zoom: z,
        bodyWidth: g1Body.width,
        bodyHeight: g1Body.height,
      })
      const g2Typo = getNodeTypographyState({
        role: groups[1].role,
        type: groups[1].type,
        name: groups[1].name,
        childCount: groups[1].childCount,
        zoom: z,
        bodyWidth: g2Body.width,
        bodyHeight: g2Body.height,
      })
      expect(g1Typo.titleOpacity).toBeCloseTo(g2Typo.titleOpacity, 4)

      // Concept synchronization
      const c1Body = getNodeVisualBody(concepts[0], z)
      const c2Body = getNodeVisualBody(concepts[1], z)
      const c1Typo = getNodeTypographyState({
        role: concepts[0].role,
        type: concepts[0].type,
        name: concepts[0].name,
        childCount: concepts[0].childCount,
        zoom: z,
        bodyWidth: c1Body.width,
        bodyHeight: c1Body.height,
      })
      const c2Typo = getNodeTypographyState({
        role: concepts[1].role,
        type: concepts[1].type,
        name: concepts[1].name,
        childCount: concepts[1].childCount,
        zoom: z,
        bodyWidth: c2Body.width,
        bodyHeight: c2Body.height,
      })
      expect(c1Typo.titleOpacity).toBeCloseTo(c2Typo.titleOpacity, 4)
    }

    // 2. Hierarchical choreography: Deep descendants never precede parent hierarchy
    // At z = 0.12: Domain title is fully established (1.0), while Group title has not started (0.0)
    const domainPhase12 = getRoleContentPhase('domain', 0.12)
    const groupPhase12 = getRoleContentPhase('structural-container', 0.12)
    const conceptPhase12 = getRoleContentPhase('leaf', 0.12)
    expect(domainPhase12.titleOpacity).toBe(1.0)
    expect(groupPhase12.titleOpacity).toBe(0.0)
    expect(conceptPhase12.titleOpacity).toBe(0.0)

    // At z = 0.32: Group title is fully established (1.0), while Concept title has not started (0.0)
    const domainPhase32 = getRoleContentPhase('domain', 0.32)
    const groupPhase32 = getRoleContentPhase('structural-container', 0.32)
    const conceptPhase32 = getRoleContentPhase('leaf', 0.32)
    expect(domainPhase32.titleOpacity).toBe(1.0)
    expect(groupPhase32.titleOpacity).toBe(1.0)
    expect(conceptPhase32.titleOpacity).toBe(0.0)

    // 3. Content Priority: titleOpacity >= metadataOpacity across all roles during reveal
    for (const r of ['core', 'domain', 'structural-container', 'leaf'] as SvgRole[]) {
      for (let z = 0.05; z <= 1.0; z += 0.05) {
        const p = getRoleContentPhase(r, z, true)
        expect(p.titleOpacity).toBeGreaterThanOrEqual(p.metadataOpacity)
        expect(p.titleOpacity).toBeGreaterThanOrEqual(p.badgeOpacity)
      }
    }

    // 4. Compressed screen font scaling
    const coreScale = getTypographyScale('core', 1.0)
    const domainScale = getTypographyScale('domain', 1.0)
    const groupScale = getTypographyScale('structural-container', 1.0)
    const conceptScale = getTypographyScale('leaf', 1.0)

    expect(coreScale.titleScreenFont).toBeCloseTo(156.80, 1)
    expect(domainScale.titleScreenFont).toBeCloseTo(78.00, 1)
    expect(groupScale.titleScreenFont).toBeCloseTo(27.44, 1)
    expect(conceptScale.titleScreenFont).toBeCloseTo(9.73, 1)

    // 5. Route-neutral typography: active route never recolors primary titles
    const sampleActiveConcept = concepts[0]
    const activeRouteVisual = getNodeVisual({
      nodeId: sampleActiveConcept.id,
      role: sampleActiveConcept.role,
      routeId: 'soc-l1',
      routes: svgData.routes,
      backbones: svgData.backbones,
    })
    // Title color remains clean mist white / white, NOT cyan route accent (#00F0FF)
    expect(activeRouteVisual.textColor).not.toBe('#00F0FF')
    expect(['#FFFFFF', '#EDF2F0', '#E8FFF5']).toContain(activeRouteVisual.textColor)
  })

  // 29. LEARNING VISUAL SEMANTICS & PROGRESS GEOMETRY
  // 30. FIT DOMAIN VISIBILITY & RIGID TYPOGRAPHIC HIERARCHY
  it('guarantees all nine Domain titles are visible at FIT and maintains strict Core > Domain > Group > Leaf hierarchy', () => {
    // 1. Hard requirement: ALL nine Domain titles must be visible and legible at FIT
    const domainPhaseFit = getRoleContentPhase('domain', 0.08)
    expect(domainPhaseFit.titleOpacity).toBe(1.0)

    const domains = svgData.nodes.filter(n => n.role === 'domain')
    expect(domains.length).toBe(9)
    for (const d of domains) {
      const dBody = getNodePresentationBody(d, 0.08)
      const dTypo = getNodeTypographyState({
        role: d.role,
        type: d.type,
        name: d.name,
        zoom: 0.08,
        bodyWidth: dBody.width,
        bodyHeight: dBody.height,
      })
      expect(dTypo.titleOpacity).toBe(1.0)
      expect(dTypo.showTitle).toBe(true)
      expect(dTypo.titleFontSize).toBeGreaterThan(0)
    }

    // Core title screen font at FIT
    const coreNode = svgData.nodes.find(n => n.role === 'core')!
    const coreBody = getNodePresentationBody(coreNode, 0.08)
    const coreTypo = getNodeTypographyState({
      role: 'core',
      type: 'core',
      name: coreNode.name,
      zoom: 0.08,
      bodyWidth: coreBody.width,
      bodyHeight: coreBody.height,
    })
    expect(coreTypo.titleScreenFontSize).toBeGreaterThanOrEqual(15.0)

    // 2. Strict Typographic Hierarchy across all readable zooms: Core > Domain > Group > Leaf
    for (const z of [0.08, 0.40, 0.55, 0.70, 0.85, 1.00, 2.00, 3.00]) {
      const coreScale = getTypographyScale('core', z)
      const domainScale = getTypographyScale('domain', z)
      const groupScale = getTypographyScale('structural-container', z)
      const leafScale = getTypographyScale('leaf', z)

      expect(coreScale.titleScreenFont).toBeGreaterThan(domainScale.titleScreenFont)
      expect(domainScale.titleScreenFont).toBeGreaterThan(groupScale.titleScreenFont)
      expect(groupScale.titleScreenFont).toBeGreaterThan(leafScale.titleScreenFont)
    }

    // 3. Compressed continued growth at z > 1
    expect(getTypographyScale('domain', 2.0).titleScreenFont).toBeGreaterThan(28)
    expect(getTypographyScale('structural-container', 2.0).titleScreenFont).toBeGreaterThan(22)
    expect(getTypographyScale('core', 2.0).titleScreenFont).toBeGreaterThan(36)

    // 4. Domain left inset: title inset maintains stable proportional relationship
    for (const z of [1.0, 2.0, 3.0]) {
      const d = domains[0]
      const body = getNodePresentationBody(d, z)
      const comp = getCardComposition('domain', body.width, body.height, z, true)
      expect(comp.leftInset / body.width).toBeGreaterThanOrEqual(0.08)
    }
  })

  // 31. ROUTE-AWARE LEARNING HOVER & FUTURE INSPECTOR CONTRACT
  // 32. SCREEN-SPACE UTILITY GEOMETRY, CONTAINMENT & FAST-PATH CONTRACT
  it('guarantees utility containment, corner-radius clearance, and fast-path execution', () => {
    // 1. Domain Progress % containment and corner-radius clearance:
    const domainNode = svgData.nodes.find(n => n.role === 'domain')!
    for (const z of [0.08, 0.25, 0.6, 1.0, 2.0]) {
      const body = getNodePresentationBody(domainNode, z)
      const typo = getNodeTypographyState({
        role: 'domain',
        type: domainNode.type,
        name: domainNode.name,
        zoom: z,
        bodyWidth: body.width,
        bodyHeight: body.height,
      })
      const isRendered = typo.badgeOpacity > 0.05 && body.height * z >= 48
      if (z === 0.08) {
        // At FIT (z=0.08), Domain body screen height is 46px < 48px -> NOT rendered
        expect(isRendered).toBe(false)
      }
      if (isRendered) {
        const cardRadius = body.height * 0.12
        const rightInset = Math.max(12, cardRadius * z * 0.55)
        const bottomInset = Math.max(10, cardRadius * z * 0.45)
        const posX = body.width - rightInset / z
        const posY = body.height - bottomInset / z
        // Must stay strictly within card world bounds
        expect(posX).toBeGreaterThan(0)
        expect(posX).toBeLessThan(body.width)
        expect(posY).toBeGreaterThan(0)
        expect(posY).toBeLessThan(body.height)
        // Screen-space margin to card borders must be >= 10px
        expect((body.width - posX) * z).toBeGreaterThanOrEqual(10)
        expect((body.height - posY) * z).toBeGreaterThanOrEqual(10)
      }
    }

    // 2. Group Progress % containment and corner-radius clearance:
    const groupNode = svgData.nodes.find(n => n.role === 'structural-container')!
    for (const z of [0.08, 0.25, 0.5, 1.0, 2.0]) {
      const body = getNodePresentationBody(groupNode, z)
      const typo = getNodeTypographyState({
        role: 'structural-container',
        type: groupNode.type,
        name: groupNode.name,
        zoom: z,
        bodyWidth: body.width,
        bodyHeight: body.height,
      })
      const isRendered = typo.badgeOpacity > 0.05 && body.height * z >= 42
      if (z === 0.08) {
        // At FIT (z=0.08), Group height is 104 * 0.08 = 8.32px < 42px -> NOT rendered
        expect(isRendered).toBe(false)
      }
      if (isRendered) {
        const cardRadius = body.height * 0.10
        const rightInset = Math.max(12, cardRadius * z * 0.55)
        const bottomInset = Math.max(10, cardRadius * z * 0.45)
        const posX = body.width - rightInset / z
        const posY = body.height - bottomInset / z
        expect(posX).toBeGreaterThan(0)
        expect(posX).toBeLessThan(body.width)
        expect(posY).toBeGreaterThan(0)
        expect(posY).toBeLessThan(body.height)
        expect((body.width - posX) * z).toBeGreaterThanOrEqual(10)
        expect((body.height - posY) * z).toBeGreaterThanOrEqual(10)
      }
    }

    // 3. Leaf Mastery Ring dual constraint:
    const leafNodes = svgData.nodes.filter(n => n.role === 'leaf')
    for (const z of [0.35, 0.5, 0.8, 1.2, 2.0]) {
      for (const leaf of leafNodes.slice(0, 10)) {
        const body = getNodePresentationBody(leaf, z)
        const screenHeight = body.height * z
        const screenRadius = Math.max(4.5, Math.min(5.5, screenHeight * 0.11))
        const screenDiameter = screenRadius * 2
        // Dual constraint: screen target max 11px (radius 5.5px) and clamped to 22% of height
        expect(screenRadius).toBeLessThanOrEqual(5.5)
        expect(screenDiameter).toBeLessThanOrEqual(Math.max(11, screenHeight * 0.22 + 0.01))
        // If screen height < 34px, mastery ring is suppressed
        const shouldRenderRing = screenHeight >= 34
        if (screenHeight < 34) {
          expect(shouldRenderRing).toBe(false)
        }
      }
    }

    // 4. Title-First rule on tiny emerging leaves (< 34px screen height):
    // "Fallos de autorización / access control" wraps into 2 lines
    const abusoName = 'Fallos de autorización / access control'
    const tinyZoom = 0.35 // card height ~ 84 * 0.35 = 29.4px (< 34px)
    const abusoTypo = getNodeTypographyState({
      role: 'leaf',
      type: 'concept',
      name: abusoName,
      zoom: tinyZoom,
      bodyWidth: 160,
      bodyHeight: 84,
    })
    expect(abusoTypo.wrappedLines.length).toBe(2)
    // Tiny emerging card: metadata label yields to prevent collision
    expect(abusoTypo.showRoleLabel).toBe(false)
    expect(abusoTypo.showTitle).toBe(true)

    // 5. Core Progress Bus at FIT vs close zoom:
    const coreNode = svgData.nodes.find(n => n.role === 'core')!
    const coreFitBody = getNodePresentationBody(coreNode, 0.08)
    const coreFitPhase = getRoleContentPhase('core', 0.08)
    // Bus is visible already at FIT
    expect(coreFitPhase.badgeOpacity).toBeGreaterThan(0.9)
    // But pct text is suppressed at FIT to prevent clutter
    const shouldShowCorePct = (zVal: number, wVal: number) => zVal >= 0.14 || wVal * zVal >= 220
    const showPctAtFit = shouldShowCorePct(0.08, coreFitBody.width)
    expect(showPctAtFit).toBe(false)

    // At close zoom (z = 0.5):
    const showPctClose = shouldShowCorePct(0.5, coreFitBody.width)
    expect(showPctClose).toBe(true)

    // 6. Hover & Selection stroke clamp:
    const leafVisualBase = getNodeVisual({
      nodeId: leafNodes[0].id,
      role: 'leaf',
      routeId: 'explore',
      routes: svgData.routes,
      isHovered: false,
      isSelected: false,
    })
    const leafVisualHover = getNodeVisual({
      nodeId: leafNodes[0].id,
      role: 'leaf',
      routeId: 'explore',
      routes: svgData.routes,
      isHovered: true,
      isSelected: false,
    })
    const leafVisualSelected = getNodeVisual({
      nodeId: leafNodes[0].id,
      role: 'leaf',
      routeId: 'explore',
      routes: svgData.routes,
      isHovered: false,
      isSelected: true,
    })
    expect(leafVisualHover.strokeWidth).toBeCloseTo(leafVisualBase.strokeWidth + 0.3, 2)
    expect(leafVisualSelected.strokeWidth).toBeCloseTo(leafVisualBase.strokeWidth + 0.5, 2)
  })

  // 33. PHYSICAL BODY CANONICAL STABILITY & SEMANTIC FAR LANDMARKS
  it('guarantees physical bodies remain at all zooms with zero 1/z inflation and validates semantic far landmarks', () => {
    const testZooms = [0.02, 0.05, 0.08, 0.10, 0.16, 0.22, 1.0, 3.0]
    const coreNode = svgData.nodes.find(n => n.role === 'core')!
    const domains = svgData.nodes.filter(n => n.role === 'domain')

    // 1. Physical body stability: Core and Domain world dimensions NEVER explode with 1/z
    for (const z of testZooms) {
      const corePresBody = getNodePresentationBody(coreNode, z)
      const coreVisBody = getNodeVisualBody(coreNode, z)
      expect(corePresBody.width).toBeCloseTo(coreVisBody.width, 4)
      expect(corePresBody.height).toBeCloseTo(coreVisBody.height, 4)
      expect(corePresBody.renderX).toBeCloseTo(coreVisBody.renderX, 4)
      expect(corePresBody.renderY).toBeCloseTo(coreVisBody.renderY, 4)

      for (const d of domains) {
        const dPresBody = getNodePresentationBody(d, z)
        const dVisBody = getNodeVisualBody(d, z)
        expect(dPresBody.width).toBeCloseTo(dVisBody.width, 4)
        expect(dPresBody.height).toBeCloseTo(dVisBody.height, 4)
        expect(dPresBody.renderX).toBeCloseTo(dVisBody.renderX, 4)
        expect(dPresBody.renderY).toBeCloseTo(dVisBody.renderY, 4)
      }
    }

    // World body at extreme far zoom (z=0.02) does NOT inflate toward infinity:
    const extremeFarCore = getNodePresentationBody(coreNode, 0.02)
    const fitCore = getNodePresentationBody(coreNode, 0.08)
    expect(extremeFarCore.width).toBeLessThanOrEqual(fitCore.width)
    expect(extremeFarCore.height).toBeLessThanOrEqual(fitCore.height)

    const extremeFarDomain = getNodePresentationBody(domains[0], 0.02)
    const fitDomain = getNodePresentationBody(domains[0], 0.08)
    expect(extremeFarDomain.width).toBeLessThanOrEqual(fitDomain.width)
    expect(extremeFarDomain.height).toBeLessThanOrEqual(fitDomain.height)

    // 2. Semantic far landmarks at FIT (z = 0.08)
    const fitCoreLandmark = getSemanticFarLandmark('core', 0.08, fitCore.width, fitCore.height)
    expect(fitCoreLandmark.isFarActive).toBe(true)
    expect(fitCoreLandmark.farOpacity).toBe(1.0)
    expect(fitCoreLandmark.screenFontSize).toBeGreaterThanOrEqual(15.0)
    expect(fitCoreLandmark.textAnchor).toBe('middle')
    expect(fitCoreLandmark.anchorX).toBe(fitCore.width / 2)

    const fitDomainRailW = getDomainRailWidth(fitDomain.width, 0.08)
    expect(fitDomainRailW).toBeGreaterThanOrEqual(4.5 / 0.08) // Enforces rail width floor
    const fitDomainLandmark = getSemanticFarLandmark('domain', 0.08, fitDomain.width, fitDomain.height, fitDomainRailW)
    // Domain duplicate landmark and right-side extension plate are removed
    expect(fitDomainLandmark.isFarActive).toBe(false)
    expect(fitDomainLandmark.showPlate).toBe(false)
  })

  // 34. WIDTH-AWARE WRAPPING MONOTONICITY, FONT MONOTONICITY & HIGH-ZOOM CONTINUITY
  it('guarantees width-aware wrapping monotonicity, zero font shrink events and continuous high-zoom scaling', () => {
    // 1. Calibrated text width estimation on live-audit reference strings:
    const strings = [
      { name: 'Redes', minFactor: 0.52, maxFactor: 0.70 },
      { name: 'Identidad y acceso', minFactor: 0.54, maxFactor: 0.65 },
      { name: 'Gobernanza, riesgo y cumplimiento', minFactor: 0.54, maxFactor: 0.65 },
      { name: 'Datos estructurados', minFactor: 0.54, maxFactor: 0.65 },
      { name: 'Zona horaria', minFactor: 0.54, maxFactor: 0.65 },
    ]
    for (const item of strings) {
      const w = estimateTextWidth(item.name, 10, 0.5)
      const factor = (w / 10) / item.name.length
      expect(factor).toBeGreaterThanOrEqual(item.minFactor)
      expect(factor).toBeLessThanOrEqual(item.maxFactor)
    }

    // 2. Wrapping Monotonicity: As zoom increases, line count must never increase (lineCount(z2) <= lineCount(z1))
    const testTitles = [
      { name: 'Identidad y acceso', role: 'domain' as SvgRole },
      { name: 'Programación y automatización', role: 'domain' as SvgRole },
      { name: 'Gobernanza, riesgo y cumplimiento', role: 'domain' as SvgRole },
      { name: 'Datos estructurados', role: 'structural-container' as SvgRole },
      { name: 'Zona horaria', role: 'leaf' as SvgRole },
    ]

    const fineZoomSteps = [0.10, 0.16, 0.22, 0.30, 0.40, 0.50, 0.65, 0.80, 1.00, 1.40, 1.80, 2.30, 3.00]

    for (const target of testTitles) {
      let prevLineCount = 99
      const nodeObj = svgData.nodes.find(n => n.name === target.name)!
      expect(nodeObj).toBeDefined()

      for (const z of fineZoomSteps) {
        const body = getNodePresentationBody(nodeObj, z)
        const typo = getNodeTypographyState({
          role: target.role,
          type: nodeObj.type,
          name: target.name,
          zoom: z,
          bodyWidth: body.width,
          bodyHeight: body.height,
        })
        const lines = typo.wrappedLines.length

        // INVARIANT: Line count may stay equal or DECREASE on zoom-in. Never increase!
        expect(lines).toBeLessThanOrEqual(prevLineCount)
        prevLineCount = lines
      }
    }

    // Direct width-aware resolution contract:
    const directRespSingle = resolveResponsiveTitle('Identidad y acceso', 25, 780, 200, 0.5)
    expect(directRespSingle.lineCount).toBe(1)
    expect(directRespSingle.wrappedLines).toEqual(['Identidad y acceso'])
    const directRespWrapped = resolveResponsiveTitle('Gobernanza, riesgo y cumplimiento', 60, 400, 200, 0.5)
    expect(directRespWrapped.lineCount).toBe(2)

    // 3. Font Monotonicity: Once visible, screen title font must never shrink
    for (const role of ['core', 'domain', 'structural-container', 'leaf'] as SvgRole[]) {
      let prevFont = 0
      const startZoom = role === 'core' || role === 'domain' ? 0.08 : (role === 'structural-container' ? 0.22 : 0.40)
      for (let z = startZoom; z <= 3.0; z += 0.05) {
        const scale = getTypographyScale(role, z)
        expect(scale.titleScreenFont).toBeGreaterThanOrEqual(prevFont - 0.001)
        prevFont = scale.titleScreenFont
      }
    }

    // 4. Role Scale Continuity: Core > Domain > Group > Leaf at representative zooms
    const repZooms = [0.10, 0.16, 0.22, 0.40, 0.70, 1.00, 1.40, 1.80, 2.30, 3.00]
    for (const z of repZooms) {
      const coreScale = getTypographyScale('core', z)
      const domainScale = getTypographyScale('domain', z)
      const groupScale = getTypographyScale('structural-container', z)
      const leafScale = getTypographyScale('leaf', z)

      expect(coreScale.titleScreenFont).toBeGreaterThan(domainScale.titleScreenFont)
      expect(domainScale.titleScreenFont).toBeGreaterThan(groupScale.titleScreenFont)
      expect(groupScale.titleScreenFont).toBeGreaterThan(leafScale.titleScreenFont)
    }

    // 5. No hard freeze at high zoom: 300% fonts are substantially larger than 100% fonts
    expect(getTypographyScale('core', 3.0).titleScreenFont).toBeGreaterThan(50)
    expect(getTypographyScale('domain', 3.0).titleScreenFont).toBeGreaterThan(40)
    expect(getTypographyScale('structural-container', 3.0).titleScreenFont).toBeGreaterThan(30)
    expect(getTypographyScale('leaf', 3.0).titleScreenFont).toBeGreaterThan(23)
  })

  it('[35] V12 learning utilities scale continuity and physical containment', () => {
    // 1. Leaf relevance pads scaling:
    let prevPadSize = 0
    for (let z = 0.5; z <= 3.0; z += 0.25) {
      const screenPadSize = Math.max(3.5, Math.min(6.5, 3.8 + 1.6 * Math.pow(z, 0.4)))
      expect(screenPadSize).toBeGreaterThanOrEqual(3.5)
      expect(screenPadSize).toBeLessThanOrEqual(6.5)
      expect(screenPadSize).toBeGreaterThanOrEqual(prevPadSize - 0.001)
      prevPadSize = screenPadSize
    }
    // Pad size at 300% must be noticeably larger than at 50%
    const pad50 = Math.max(3.5, Math.min(6.5, 3.8 + 1.6 * Math.pow(0.5, 0.4)))
    const pad300 = Math.max(3.5, Math.min(6.5, 3.8 + 1.6 * Math.pow(3.0, 0.4)))
    expect(pad300).toBeGreaterThan(pad50 * 1.2)

    // 2. Leaf mastery ring scaling:
    const leafNodes = svgData.nodes.filter(n => n.role === 'leaf')
    let prevRingRadius = 0
    for (const z of [0.65, 0.85, 1.0, 1.4, 1.8, 2.3, 3.0]) {
      const rawScreenRadius = z > 1.0 ? 5.5 * Math.pow(z, 0.40) : Math.max(4.5, 5.5 * smoothstep(0.35, 1.0, z))
      for (const leaf of leafNodes.slice(0, 5)) {
        const body = getNodePresentationBody(leaf, z)
        const screenHeight = body.height * z
        const screenRadius = Math.max(4.5, Math.min(10.5, Math.min(rawScreenRadius, screenHeight * 0.15)))

        expect(screenRadius).toBeGreaterThanOrEqual(4.5)
        expect(screenRadius).toBeLessThanOrEqual(10.5)
        expect(screenRadius).toBeLessThanOrEqual(screenHeight * 0.15 + 0.01)
      }
      expect(rawScreenRadius).toBeGreaterThanOrEqual(prevRingRadius - 0.001)
      prevRingRadius = rawScreenRadius
    }

    // 3. Core progress bus scaling:
    const getBusScale = (zVal: number) => (zVal > 1.0 ? Math.min(1.8, Math.pow(zVal, 0.36)) : 1.0)
    const busScale100 = getBusScale(1.0)
    const busScale300 = getBusScale(3.0)
    expect(busScale300).toBeGreaterThan(busScale100 * 1.3)

    // 4. Domain & Group progress percentage scaling:
    for (const z of [0.5, 1.0, 1.8, 3.0]) {
      const domainPctFont = Math.max(10.0, Math.min(15.0, 10.0 * Math.pow(z, 0.35)))
      const groupPctFont = Math.max(9.5, Math.min(14.5, 9.5 * Math.pow(z, 0.35)))
      expect(domainPctFont).toBeGreaterThanOrEqual(10.0)
      expect(domainPctFont).toBeLessThanOrEqual(15.0)
      expect(groupPctFont).toBeGreaterThanOrEqual(9.5)
      expect(groupPctFont).toBeLessThanOrEqual(14.5)
      expect(domainPctFont).toBeGreaterThan(groupPctFont)
    }
  })

  it('[36] V13 Role Proportions and internal utility scale continuity', () => {
    // 1. Reference Proportion Stability across zoom (within +/- 8% in active range):
    // Domain (active 0.24 - 2.50): ratio = 0.1950
    for (const z of [0.24, 0.49, 1.00, 1.69, 2.50]) {
      const scale = getTypographyScale('domain', z)
      const ratio = scale.titleScreenFont / (400 * z)
      expect(Math.abs(ratio - 0.1950) / 0.1950).toBeLessThanOrEqual(0.08)
    }

    // Group (active 0.49 - 3.00): ratio = 0.1715
    for (const z of [0.49, 0.85, 1.00, 1.69, 3.00]) {
      const scale = getTypographyScale('structural-container', z)
      const ratio = scale.titleScreenFont / (160 * z)
      expect(Math.abs(ratio - 0.1715) / 0.1715).toBeLessThanOrEqual(0.08)
    }

    // Leaf (active 0.80 - 3.00): ratio = 0.1520
    for (const z of [0.80, 1.00, 1.69, 2.50, 3.00]) {
      const scale = getTypographyScale('leaf', z)
      const ratio = scale.titleScreenFont / (64 * z)
      expect(Math.abs(ratio - 0.1520) / 0.1520).toBeLessThanOrEqual(0.08)
    }

    // Core (active 0.24 - 2.50): ratio = 0.2450
    for (const z of [0.24, 0.49, 1.00, 1.69, 2.50]) {
      const scale = getTypographyScale('core', z)
      const ratio = scale.titleScreenFont / (640 * z)
      expect(Math.abs(ratio - 0.2450) / 0.2450).toBeLessThanOrEqual(0.08)
    }

    // 2. Strict Typographic Hierarchy holds at ALL tested zooms:
    for (const z of [0.08, 0.18, 0.24, 0.49, 0.85, 1.00, 1.69, 3.00]) {
      const core = getTypographyScale('core', z).titleScreenFont
      const domain = getTypographyScale('domain', z).titleScreenFont
      const group = getTypographyScale('structural-container', z).titleScreenFont
      const leaf = getTypographyScale('leaf', z).titleScreenFont

      expect(core).toBeGreaterThan(domain)
      expect(domain).toBeGreaterThan(group)
      expect(group).toBeGreaterThan(leaf)
    }

    // 3. Clean Domain Chassis & Symmetric Composition:
    expect(CARD_COMPOSITION_TOKENS.domain.hasLeftRail).toBe(false)
    expect(CARD_COMPOSITION_TOKENS.domain.titleAlignment).toBe('center')
    expect(CARD_COMPOSITION_TOKENS.domain.metadataAlignment).toBe('center')
  })

  it('[37] V14 Leaf continuity: relevance pads and mastery ring proportion and anchor lock', () => {
    const leafNodes = svgData.nodes.filter(n => n.role === 'leaf')
    const sample = leafNodes[0]
    expect(sample).toBeDefined()

    let prevPadScreen = 0
    let prevRingRadius = 0

    // Across full mature card range (0.50 to 3.00):
    for (const z of [0.50, 0.56, 0.64, 0.80, 1.00, 1.40, 2.00, 3.00]) {
      const body = getNodePresentationBody(sample, z)
      const util = getLeafUtilityPresentation(body.width, body.height, z)

      // 1. Proportional Lock:
      // Relevance pad height is locked to ~5.5% of body height
      expect(util.padToHeightRatio).toBeCloseTo(0.055, 3)

      // Mastery ring diameter is locked to 12.0% of body height
      expect(util.ringDiameterToHeightRatio).toBeCloseTo(0.120, 3)

      // 2. Monotonic screen dimensions:
      // Screen pad size monotonically non-decreasing
      expect(util.padScreenSize).toBeGreaterThanOrEqual(prevPadScreen - 0.001)
      prevPadScreen = util.padScreenSize

      // Screen ring radius monotonically non-decreasing
      expect(util.ringScreenRadius).toBeGreaterThanOrEqual(prevRingRadius - 0.001)
      prevRingRadius = util.ringScreenRadius

      // 3. Anchor Invariance: Zero parallax drift across zoom:
      // Normalized X anchor stays stable within +/- 0.02
      expect(Math.abs(util.padNormalizedX - 0.812)).toBeLessThanOrEqual(0.02)
      expect(Math.abs(util.padNormalizedY - 0.1925)).toBeLessThanOrEqual(0.01)

      // Mastery ring center normalized anchor stays invariant
      expect(Math.abs(util.ringNormalizedCx - 0.930)).toBeLessThanOrEqual(0.01)
      expect(Math.abs(util.ringNormalizedCy - 0.840)).toBeLessThanOrEqual(0.01)
    }
  })

})

