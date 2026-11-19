import type { GraphData, KnowledgeNode } from './data'

export type CircuitStructuralRole =
  | 'core'
  | 'domain'
  | 'structural-container'
  | 'structural-knowledge-hub'
  | 'leaf'

type StructuralNode = Pick<KnowledgeNode, 'id' | 'type'>
type StructuralEdge = Pick<GraphData['edges'][number], 'source' | 'target' | 'type'>
export type CircuitStructuralGraph = {
  nodes: readonly StructuralNode[]
  edges: readonly StructuralEdge[]
}

/** Derives each node role from its type and the `contains` hierarchy, without modifying the node. */
export function circuitStructuralRoles(graph: CircuitStructuralGraph): ReadonlyMap<string, CircuitStructuralRole> {
  const structuralParents = new Set(
    graph.edges.filter(edge => edge.type === 'contains').map(edge => edge.source),
  )

  return new Map(graph.nodes.map(node => {
    const hasStructuralChildren = structuralParents.has(node.id)
    const isSovereignHub = node.id === 'python'
    const role: CircuitStructuralRole = node.type === 'core'
      ? 'core'
      : node.type === 'domain'
        ? 'domain'
        : (!hasStructuralChildren && !isSovereignHub)
          ? 'leaf'
          : node.type === 'group'
            ? 'structural-container'
            : 'structural-knowledge-hub'
    return [node.id, role]
  }))
}
