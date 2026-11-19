import { describe, expect, it } from 'vitest'
import { loadData, type KnowledgeNode } from './data'
import { circuitStructuralRoles, type CircuitStructuralGraph, type CircuitStructuralRole } from './circuitStructuralRole'

type NodeType = KnowledgeNode['type']
const graph = (
  nodes: readonly [id: string, type: NodeType][],
  contains: readonly [source: string, target: string][],
): CircuitStructuralGraph => ({
  nodes: nodes.map(([id, type]) => ({ id, type })),
  edges: contains.map(([source, target]) => ({ source, target, type: 'contains' })),
})
const rolesOf = (input: CircuitStructuralGraph) => Object.fromEntries(circuitStructuralRoles(input))

describe('Circuit structural presentation roles', () => {
  it('classifies Group → leaf by structural responsibility', () => {
    expect(rolesOf(graph(
      [['group', 'group'], ['leaf', 'concept']],
      [['group', 'leaf']],
    ))).toEqual({ group: 'structural-container', leaf: 'leaf' })
  })

  it('classifies Group → technology → leaves without treating every technology as a hub', () => {
    expect(rolesOf(graph(
      [['group', 'group'], ['technology', 'technology'], ['a', 'concept'], ['b', 'technology']],
      [['group', 'technology'], ['technology', 'a'], ['technology', 'b']],
    ))).toEqual({
      group: 'structural-container',
      technology: 'structural-knowledge-hub',
      a: 'leaf',
      b: 'leaf',
    })
  })

  it('classifies Group → concept → Group → leaves at every structural level', () => {
    expect(rolesOf(graph(
      [['outer', 'group'], ['concept', 'concept'], ['inner', 'group'], ['a', 'skill'], ['b', 'tool']],
      [['outer', 'concept'], ['concept', 'inner'], ['inner', 'a'], ['inner', 'b']],
    ))).toEqual({
      outer: 'structural-container',
      concept: 'structural-knowledge-hub',
      inner: 'structural-container',
      a: 'leaf',
      b: 'leaf',
    })
  })

  it('classifies a hub with several descendants from direct contains topology', () => {
    expect(rolesOf(graph(
      [['hub', 'skill'], ['a', 'concept'], ['b', 'technology'], ['c', 'tool']],
      [['hub', 'a'], ['hub', 'b'], ['hub', 'c']],
    ))).toEqual({ hub: 'structural-knowledge-hub', a: 'leaf', b: 'leaf', c: 'leaf' })
  })

  it('classifies childless nodes as leaves, including a non-structural Group', () => {
    expect(rolesOf(graph(
      [['concept', 'concept'], ['technology', 'technology'], ['empty-group', 'group']],
      [],
    ))).toEqual({ concept: 'leaf', technology: 'leaf', 'empty-group': 'leaf' })
  })

  it('derives the same hub role for identical topology across canonical knowledge types', () => {
    const knowledgeTypes: NodeType[] = ['concept', 'technology', 'skill', 'tool']
    for (const type of knowledgeTypes) {
      expect(rolesOf(graph(
        [['parent', type], ['child', 'concept']],
        [['parent', 'child']],
      ))).toEqual({ parent: 'structural-knowledge-hub', child: 'leaf' })
    }
  })

  it('classifies the complete canonical graph and its known structural organizers', () => {
    const { graph: canonical } = loadData()
    const roles = circuitStructuralRoles(canonical)
    const counts = [...roles.values()].reduce<Record<CircuitStructuralRole, number>>((result, role) => {
      result[role]++
      return result
    }, { core: 0, domain: 0, 'structural-container': 0, 'structural-knowledge-hub': 0, leaf: 0 })
    const names = ['Linux', 'Windows', 'HTTP', 'Autenticación', 'Active Directory', 'Python']

    expect(roles.size).toBe(357)
    expect(canonical.edges.filter(edge => edge.type === 'contains')).toHaveLength(356)
    expect(counts).toEqual({
      core: 1,
      domain: 9,
      'structural-container': 53,
      'structural-knowledge-hub': 6,
      leaf: 288,
    })
    for (const name of names) {
      const node = canonical.nodes.find(candidate => candidate.name === name)
      expect(node, name).toBeDefined()
      expect(roles.get(node!.id), name).toBe('structural-knowledge-hub')
    }

    const hubs = canonical.nodes
      .filter(node => roles.get(node.id) === 'structural-knowledge-hub')
      .map(node => ({ id: node.id, name: node.name, type: node.type }))
    console.info('CIRCUIT STRUCTURAL ROLES', JSON.stringify({ counts, hubs }))
  })
})
