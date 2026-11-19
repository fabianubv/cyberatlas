import { describe, expect, it } from 'vitest'
import { loadData, validateData } from './data'
import { commonRouteProjection } from './baseRoute'

const { graph, routes, rootId } = loadData()
const assessableIds = new Set(graph.nodes.filter(node => node.assessable).map(node => node.id))

describe('datos del mapa', () => {
  it('carga 357 nodos, 557 relaciones y los nueve dominios', () => {
    expect(graph.nodes).toHaveLength(357)
    expect(graph.edges).toHaveLength(557)
    expect(routes.paths.map(path => path.id)).toEqual(['soc-l1', 'pentesting', 'grc', 'cloud-security', 'ai-security'])
    expect(graph.nodes.filter(node => node.type === 'domain')).toHaveLength(9)
  })

  it('mantiene core, dominios y grupos fuera de evaluación y de las rutas', () => {
    const organizers = graph.nodes.filter(node => ['core', 'domain', 'group'].includes(node.type))
    expect(organizers.every(node => !node.assessable)).toBe(true)
    expect(graph.nodes.filter(node => !['core', 'domain', 'group'].includes(node.type)).every(node => node.assessable)).toBe(true)
    expect(routes.paths.flatMap(path => path.nodes).every(routeNode => assessableIds.has(routeNode.id))).toBe(true)
  })

  it('calcula la vista Base como intersección sin modificar las rutas', () => {
    const before = JSON.stringify(routes.paths)
    const common = commonRouteProjection(routes.paths)
    expect(common.size).toBe(105)
    expect([...common.keys()].every(id => routes.paths.every(path => path.nodes.some(node => node.id === id)))).toBe(true)
    expect(JSON.stringify(routes.paths)).toBe(before)
  })

  it('usa el mínimo de relevancia y protege las invariantes de Base', () => {
    const projection = commonRouteProjection(routes.paths)
    expect(projection.get('dns')?.relevance).toBe(2)
    for (const entry of projection.values()) {
      expect(entry.byPath).toHaveLength(routes.paths.length)
      expect(entry.byPath.every(item => item.relevance > 0)).toBe(true)
      expect(entry.byPath.every(item => entry.relevance <= item.relevance)).toBe(true)
      expect(entry.relevance).toBe(Math.min(...entry.byPath.map(item => item.relevance)))
    }
  })
})

describe('validación de datos', () => {
  it('rechaza organizadores evaluables y rutas que los incluyen', () => {
    const badGraph = structuredClone(graph)
    badGraph.nodes.find(node => node.id === rootId)!.assessable = true
    expect(() => validateData(badGraph, routes)).toThrow('evaluabilidad')
    const badRoutes = structuredClone(routes)
    badRoutes.paths[0].nodes[0].id = 'networking'
    expect(() => validateData(graph, badRoutes)).toThrow('organizador')
  })

  it('rechaza referencias inexistentes y ciclos contains', () => {
    const badRoutes = structuredClone(routes)
    badRoutes.paths[0].nodes[0].id = 'missing'
    expect(() => validateData(graph, badRoutes)).toThrow('inexistentes')
    expect(() => validateData({ ...graph, edges: [...graph.edges, { source: 'dns', target: rootId, type: 'contains' as const }] }, routes)).toThrow('ciclo')
  })
})
