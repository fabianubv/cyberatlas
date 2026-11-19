import type { LearningPath } from './data'

export interface BaseProjection {
  id: string
  relevance: number
  byPath: { id: string; name: string; relevance: number }[]
}
export function commonRouteProjection(paths: readonly LearningPath[]) {
  const result = new Map<string, BaseProjection>()
  if (!paths.length) return result
  const indexes = paths.map(path => new Map(path.nodes.map(node => [node.id, node.relevance])))
  for (const node of paths[0].nodes) {
    const relevances = indexes.map(index => index.get(node.id) ?? 0)
    if (!relevances.every(relevance => relevance > 0)) continue
    result.set(node.id, {
      id: node.id,
      relevance: Math.min(...relevances),
      byPath: paths.map((path, index) => ({ id: path.id, name: path.name, relevance: relevances[index] })),
    })
  }
  return result
}
