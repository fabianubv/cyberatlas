import { describe, it, expect } from 'vitest'
import { loadData } from '../data'
import { createSvgMapData } from './svgGeometry'
import { getFitCamera } from './camera'
import { getNodeVisualBody } from './visualBody'
import { getVisualSize } from './nodeDimensions'
import { getNodeRepresentation } from './semanticZoom'
import { getRouteHoverColor, getRouteInteractionColor } from './routeVisuals'
import { getNodeRoleLabel } from './nodeComposition'
import { wrapTitleTextBalanced } from './nodeTypography'

describe('layout del mapa', () => {
  const { graph, rootId, routes } = loadData()
  const data = createSvgMapData(graph, rootId, routes)

  it('coloca los 357 nodos con los roles esperados', () => {
    const count = (role: string) => data.nodes.filter(n => n.role === role).length
    expect(data.nodes).toHaveLength(357)
    expect(count('core')).toBe(1)
    expect(count('domain')).toBe(9)
    expect(count('structural-container')).toBe(53)
    expect(count('structural-knowledge-hub')).toBe(6)
    expect(count('leaf')).toBe(288)
  })

  it('mantiene todos los nodos dentro de los límites del mapa', () => {
    expect(data.bounds.right - data.bounds.left).toBe(8850)
    expect(data.bounds.bottom - data.bounds.top).toBe(4470)
    for (const node of data.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(data.bounds.left)
      expect(node.x + node.width).toBeLessThanOrEqual(data.bounds.right)
      expect(node.y).toBeGreaterThanOrEqual(data.bounds.top)
      expect(node.y + node.height).toBeLessThanOrEqual(data.bounds.bottom)
    }
  })

  it('conecta cada nodo con exactamente una ruta entrante, salvo la raíz', () => {
    const ids = new Set(data.nodes.map(n => n.id))
    const targets = (data.routeDefs).map(r => r.targetId)
    expect(new Set(targets).size).toBe(targets.length)
    expect(targets).toHaveLength(356)
    for (const id of ids) expect(targets.includes(id)).toBe(id !== rootId)
  })

  it('no solapa cajas de nodos', () => {
    const overlaps: string[] = []
    const boxes = data.nodes.map(n => ({ id: n.id, box: getNodeVisualBody(n, 1).bounds }))
    boxes.forEach((a, i) => boxes.slice(i + 1).forEach(b => {
      if (a.box.left < b.box.right && a.box.right > b.box.left && a.box.top < b.box.bottom && a.box.bottom > b.box.top) overlaps.push(`${a.id}/${b.id}`)
    }))
    expect(overlaps).toEqual([])
  })

  it('mantiene constante el tamaño estructural y hace crecer las hojas con el zoom', () => {
    expect(getVisualSize('domain', 0.1)).toEqual(getVisualSize('domain', 3))
    let previous = 0
    for (const zoom of [0.1, 0.22, 0.25, 0.3, 0.35, 1, 3]) {
      const { width } = getVisualSize('leaf', zoom)
      expect(width).toBeGreaterThanOrEqual(previous)
      previous = width
    }
    expect(getVisualSize('leaf', 0.1)).toEqual({ width: 22, height: 22 })
    expect(getVisualSize('leaf', 1)).toEqual({ width: 136, height: 58 })
  })

  it('centra el encuadre inicial con un zoom válido', () => {
    const camera = getFitCamera(data.bounds, 1400, 900)
    expect(camera.zoom).toBeGreaterThan(0)
    expect(camera.zoom).toBeLessThan(1)
    expect(Number.isFinite(camera.x) && Number.isFinite(camera.y)).toBe(true)
  })

  it('energiza toda la ascendencia de cada nodo de una ruta hasta el núcleo', () => {
    const parent = new Map(graph.edges.filter(e => e.type === 'contains').map(e => [e.target, e.source]))
    for (const [routeId, backbone] of Object.entries(data.backbones!)) {
      expect(backbone.activeNodes.size, routeId).toBeGreaterThan(0)
      for (const id of backbone.activeNodes) {
        const up = parent.get(id)
        if (up) {
          expect(backbone.activeNodes.has(up), `${routeId}: ${up}`).toBe(true)
          expect(backbone.activeEdges.has(`${up}->${id}`), `${routeId}: ${up}->${id}`).toBe(true)
        }
      }
    }
  })

  it('representa cada rol según el zoom', () => {
    expect(getNodeRepresentation('core', 0.01)).toBe('card')
    expect(getNodeRepresentation('structural-container', 0.1)).toBe('mark')
    expect(getNodeRepresentation('structural-container', 0.2)).toBe('card')
    expect(getNodeRepresentation('leaf', 0.1)).toBe('mark')
    expect(getNodeRepresentation('leaf', 0.3)).toBe('emerging')
    expect(getNodeRepresentation('leaf', 0.5)).toBe('card')
  })

  it('deriva los colores de interacción del modo activo', () => {
    expect(getRouteHoverColor('explore')).toBe('#FFFFFF')
    expect(getRouteHoverColor('pentesting')).toBe('#FFA3B4')
    expect(getRouteInteractionColor('explore')).toBe('#FFFFFF')
    expect(getRouteInteractionColor('pentesting')).not.toBe('#FFFFFF')
  })

  it('etiqueta los nodos en español', () => {
    expect(getNodeRoleLabel('core', 'core')).toBe('NÚCLEO')
    expect(getNodeRoleLabel('tool', 'leaf')).toBe('HERRAMIENTA')
  })

  it('reparte títulos largos en dos líneas equilibradas', () => {
    expect(wrapTitleTextBalanced('Gestión de identidades y accesos')).toEqual(['Gestión de', 'identidades y accesos'])
    expect(wrapTitleTextBalanced('Redes')).toEqual(['Redes', ''])
  })
})
