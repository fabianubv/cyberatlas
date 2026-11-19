import { z } from 'zod'
import rawMap from './data/map.json'
import rawPaths from './data/routes.json'

// Stops Zod from probing `new Function`, which the site's CSP blocks and reports.
z.config({ jitless: true })

export const depthSchema = z.enum(['foundation', 'intermediate', 'advanced', 'specialist'])
export const masterySchema = z.enum(['unknown', 'recognize', 'explain', 'use', 'analyze'])
const nodeTypeSchema = z.enum(['core', 'domain', 'group', 'concept', 'technology', 'skill', 'tool'])
const edgeTypeSchema = z.enum(['contains', 'requires', 'related_to', 'implements'])
const colorSchema = z.string().regex(/^#[0-9a-f]{6}([0-9a-f]{2})?$/i)

const nodeSchema = z.object({
  id: z.string().min(1), name: z.string().min(1), type: nodeTypeSchema,
  domain: z.string().nullable(), depth: depthSchema, assessable: z.boolean(),
  summary: z.string(), why_it_matters: z.string(), outcomes: z.array(z.string()), status: z.string().min(1),
})
const paletteSchema = z.object({
  core_black: colorSchema, graphite: colorSchema, mist: colorSchema,
  electric_mint: colorSchema, signal_green: colorSchema, deep_cyber_green: colorSchema,
})
const mapSchema = z.object({
  version: z.string(), project: z.string(), base_palette: paletteSchema,
  node_types: z.array(nodeTypeSchema), edge_types: z.array(edgeTypeSchema),
  depth_levels: z.array(depthSchema), mastery_levels: z.array(masterySchema),
  principles: z.array(z.string()), nodes: z.array(nodeSchema).min(1),
  edges: z.array(z.object({ source: z.string(), target: z.string(), type: edgeTypeSchema })),
})
const accentSchema = z.object({
  family: z.string().min(1), base: colorSchema, bright: colorSchema,
  soft: colorSchema, critical_glow: colorSchema,
})
const routeNodeSchema = z.object({
  id: z.string(), relevance: z.number().int().min(1).max(4), required_depth: depthSchema,
  expected_mastery: masterySchema.exclude(['unknown']),
})
const pathsSchema = z.object({
  version: z.string(), status: z.string(),
  principles: z.object({
    relevance: z.record(z.string(), z.string()), depth: z.array(depthSchema),
    expected_mastery: z.array(masterySchema.exclude(['unknown'])), note: z.string(),
  }),
  paths: z.array(z.object({
    id: z.string().min(1), name: z.string(), description: z.string(), accent: accentSchema,
    nodes: z.array(routeNodeSchema),
  })),
})

export type KnowledgeNode = z.infer<typeof nodeSchema>
export type GraphData = z.infer<typeof mapSchema>
export type PathData = z.infer<typeof pathsSchema>
export type LearningPath = PathData['paths'][number]
export type Mastery = z.infer<typeof masterySchema>

export function validateData(mapInput: unknown, pathsInput: unknown) {
  const graph = mapSchema.parse(mapInput)
  const routes = pathsSchema.parse(pathsInput)
  const ids = new Set(graph.nodes.map(node => node.id))
  const byId = new Map(graph.nodes.map(node => [node.id, node]))
  if (ids.size !== graph.nodes.length) throw new Error('Hay IDs de nodo duplicados.')
  const parents = new Map<string, string>()
  const relations = new Set<string>()
  for (const edge of graph.edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) throw new Error('Una relación apunta a un nodo inexistente.')
    const key = `${edge.type}:${edge.source}:${edge.target}`
    if (relations.has(key)) throw new Error('Hay relaciones duplicadas.')
    relations.add(key)
    if (edge.type === 'contains') {
      if (parents.has(edge.target)) throw new Error('Un nodo tiene más de un padre contains.')
      parents.set(edge.target, edge.source)
    }
  }
  for (const node of graph.nodes) {
    if (node.domain !== null && byId.get(node.domain)?.type !== 'domain') throw new Error('Dominio inexistente.')
    const organizer = node.type === 'core' || node.type === 'domain' || node.type === 'group'
    if (node.assessable === organizer) throw new Error('La evaluabilidad no coincide con el tipo de nodo.')
    const seen = new Set<string>()
    let current: string | undefined = node.id
    while (current) {
      if (seen.has(current)) throw new Error('La jerarquía contains tiene un ciclo.')
      seen.add(current)
      current = parents.get(current)
    }
  }
  const roots = graph.nodes.filter(node => !parents.has(node.id))
  if (roots.length !== 1 || roots[0].type !== 'core') throw new Error('El mapa debe tener una única raíz core.')
  const pathIds = new Set<string>()
  for (const path of routes.paths) {
    if (pathIds.has(path.id) || path.id === 'explore') throw new Error('ID de ruta duplicado o reservado.')
    pathIds.add(path.id)
    const members = new Set<string>()
    for (const routeNode of path.nodes) {
      const node = byId.get(routeNode.id)
      if (!node || members.has(routeNode.id)) throw new Error('Una ruta contiene nodos inexistentes o duplicados.')
      if (!node.assessable) throw new Error('Una ruta contiene un nodo organizador no evaluable.')
      members.add(routeNode.id)
    }
  }
  return { graph, routes, rootId: roots[0].id }
}

export function loadData() { return validateData(rawMap, rawPaths) }
