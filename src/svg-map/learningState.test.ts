import { DEMO_LEARNING_STATE } from './learningState.fixture'
import { describe, it, expect } from 'vitest'
import rawMap from '../data/map.json'
import rawPaths from '../data/routes.json'
import { validateData } from '../data'
import { MASTERY_LABELS, getNodeMastery, getMasteryScore, resolveDerivedNodeState, computeAllDerivedNodeStates, indexAssessableDescendants, type UserLearningState } from './learningState'
import { createSvgMapData } from './svgGeometry'

describe('Estado de aprendizaje y relevancia', () => {
  const { graph, routes, rootId } = validateData(rawMap, rawPaths)
  const mapData = createSvgMapData(graph, rootId, routes)

  it('maps canonical mastery levels strictly to aggregation scores', () => {
    expect(getMasteryScore('unknown')).toBe(0.0)
    expect(getMasteryScore('recognize')).toBe(0.25)
    expect(getMasteryScore('explain')).toBe(0.50)
    expect(getMasteryScore('use')).toBe(0.75)
    expect(getMasteryScore('analyze')).toBe(1.00)
    expect(MASTERY_LABELS.unknown).toBe('Sin empezar')
  })

  it('defaults unrecorded nodes strictly to unknown with zero persistent score', () => {
    const emptyState: UserLearningState = { masteryByNodeId: {} }
    expect(getNodeMastery('active-directory', emptyState)).toBe('unknown')
    expect(getMasteryScore(getNodeMastery('active-directory', emptyState))).toBe(0.0)
  })

  it('aggregates progress upward where only assessable descendants count', () => {
    const descendants = indexAssessableDescendants(graph)
    const cpuDescendants = descendants.get('cpu') || []
    // Knowledge leaf node itself has 0 descendants in 'contains' hierarchy
    expect(cpuDescendants.length).toBe(0)

    // Structural container (Group) has assessable descendants
    const groupDescendants = descendants.get('identity-directories') || []
    expect(groupDescendants.length).toBeGreaterThan(0)

    // All descendants must be assessable nodes; structural nodes add 0 weight
    const byId = new Map(graph.nodes.map(n => [n.id, n]))
    for (const dId of groupDescendants) {
      const node = byId.get(dId)
      expect(node?.assessable).toBe(true)
      expect(node?.type).not.toBe('core')
      expect(node?.type).not.toBe('domain')
      expect(node?.type).not.toBe('group')
    }
  })

  it('demonstrates upward progress propagation when a single concept mastery changes', () => {
    const state0: UserLearningState = { masteryByNodeId: {} }
    const descendants = indexAssessableDescendants(graph)

    const coreDerived0 = resolveDerivedNodeState({
      nodeId: rootId,
      role: 'core',
      routeId: 'explore',
      graph,
      pathsData: routes,
      state: state0,
      descendantsMap: descendants,
    })
    expect(coreDerived0.progress).toBe(0)
    expect(coreDerived0.progressPercent).toBe(0)

    // Mark 'active-directory' as 'analyze' (1.00)
    const state1: UserLearningState = {
      masteryByNodeId: {
        'active-directory': 'analyze',
      },
    }

    const coreDerived1 = resolveDerivedNodeState({
      nodeId: rootId,
      role: 'core',
      routeId: 'explore',
      graph,
      pathsData: routes,
      state: state1,
      descendantsMap: descendants,
    })

    // Total assessable nodes under root is 294. Progress is exactly 1.00 / 294
    expect(coreDerived1.progress).toBeGreaterThan(0)
    expect(coreDerived1.progress).toBe(1.0 / 294)

    // Identity & Access domain progress
    const domainDerived1 = resolveDerivedNodeState({
      nodeId: 'identity-access',
      role: 'domain',
      routeId: 'explore',
      graph,
      pathsData: routes,
      state: state1,
      descendantsMap: descendants,
    })
    // 32 assessable descendants under identity-access
    expect(domainDerived1.progress).toBe(1.0 / 32)
  })

  it('scopes progress by active route and never multiplies mastery by relevance', () => {
    // Single concept active-directory (relevance 4 in pentesting) with mastery 'use' (0.75)
    const state: UserLearningState = {
      masteryByNodeId: {
        'active-directory': 'use',
      },
    }

    const descendants = indexAssessableDescendants(graph)

    const exploreDomain = resolveDerivedNodeState({
      nodeId: 'identity-access',
      role: 'domain',
      routeId: 'explore',
      graph,
      pathsData: routes,
      state,
      descendantsMap: descendants,
    })

    const pentestDomain = resolveDerivedNodeState({
      nodeId: 'identity-access',
      role: 'domain',
      routeId: 'pentesting',
      graph,
      pathsData: routes,
      state,
      descendantsMap: descendants,
    })

    // Explore evaluates all 32 descendants
    expect(exploreDomain.progressScope).toBe(32)
    expect(exploreDomain.progress).toBe(0.75 / 32)

    // Pentesting evaluates only descendants belonging to Pentesting route
    expect(pentestDomain.progressScope).toBeLessThanOrEqual(32)
    // Relevance 4 does NOT multiply the 0.75 score
    expect(pentestDomain.progress).toBe(0.75 / pentestDomain.progressScope)

    // Concept itself maintains identical personal mastery across routes
    const exploreConcept = resolveDerivedNodeState({
      nodeId: 'active-directory',
      role: 'leaf',
      routeId: 'explore',
      graph,
      pathsData: routes,
      state,
    })
    const pentestConcept = resolveDerivedNodeState({
      nodeId: 'active-directory',
      role: 'leaf',
      routeId: 'pentesting',
      graph,
      pathsData: routes,
      state,
    })
    expect(exploreConcept.mastery).toBe('use')
    expect(pentestConcept.mastery).toBe('use')
    expect(exploreConcept.masteryScore).toBe(0.75)
    expect(pentestConcept.masteryScore).toBe(0.75)
  })

  it('precomputes all derived node states deterministically for demo fixture', () => {
    const roles = mapData.structuralRoles || new Map()
    const derivedMap = computeAllDerivedNodeStates(
      graph,
      routes,
      'pentesting',
      DEMO_LEARNING_STATE,
      roles,
    )

    expect(derivedMap.size).toBe(graph.nodes.length)

    const adDerived = derivedMap.get('active-directory')!
    expect(adDerived.mastery).toBe('use')
    expect(adDerived.masteryScore).toBe(0.75)
    expect(adDerived.relevance).toBe(4)
    expect(adDerived.relevanceLabel).toBe('Muy alta')

    const coreDerived = derivedMap.get(rootId)!
    expect(coreDerived.progress).toBeGreaterThan(0)
    expect(coreDerived.progressScope).toBeGreaterThan(0)
  })
})
