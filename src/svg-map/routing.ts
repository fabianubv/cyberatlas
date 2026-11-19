import type { Point } from './types'

export type Side = 'north' | 'east' | 'south' | 'west'
export type CircuitRoute = { source: string; target: string; depth: number; side: Side; points: Point[] }

export const circuitPath = (ps: Point[]) => ps.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ')

/** Point where a route touches a card. Only this end moves with zoom; tracks and junctions stay fixed. */
export function circuitCardBoundaryEndpoint(center: Point, interior: Point, ink: { width: number; height: number }): Point {
  if (interior.x !== center.x) return { x: center.x + Math.sign(interior.x - center.x) * ink.width / 2, y: center.y }
  return { x: center.x, y: center.y + Math.sign(interior.y - center.y) * ink.height / 2 }
}

/** Splits collinear overlaps into tracks that know their routes, so each segment is painted once. */
export function circuitSegments(routes: { route: CircuitRoute; points: Point[] }[]) {
  const tracks = new Map<string, { vertical: boolean; fixed: number; spans: { lo: number; hi: number; route: CircuitRoute }[] }>()
  routes.forEach(({ route, points }) => points.slice(1).forEach((b, i) => {
    const a = points[i], vertical = a.x === b.x, fixed = vertical ? a.x : a.y, lo = Math.min(vertical ? a.y : a.x, vertical ? b.y : b.x), hi = Math.max(vertical ? a.y : a.x, vertical ? b.y : b.x)
    if (lo === hi) return
    const key = `${vertical ? 'v' : 'h'}:${fixed}`
    if (!tracks.has(key)) tracks.set(key, { vertical, fixed, spans: [] })
    tracks.get(key)!.spans.push({ lo, hi, route })
  }))
  return [...tracks.values()].flatMap(t => {
    const stops = [...new Set(t.spans.flatMap(s => [s.lo, s.hi]))].sort((a, b) => a - b)
    return stops.slice(1).flatMap((hi, i) => {
      const lo = stops[i], owners = t.spans.filter(s => s.lo <= lo && s.hi >= hi).map(s => s.route)
      if (!owners.length) return []
      return [{ a: t.vertical ? { x: t.fixed, y: lo } : { x: lo, y: t.fixed }, b: t.vertical ? { x: t.fixed, y: hi } : { x: hi, y: t.fixed }, owners }]
    })
  })
}

/** Remove zero-length and forward-collinear waypoints without changing the wire. */
export function simplifyCircuitPoints(points: Point[]): Point[] {
  const result: Point[] = []
  for (const p of points) {
    const b = result.at(-1), a = result.at(-2)
    if (b && b.x === p.x && b.y === p.y) continue
    if (a && b && (a.x === b.x && b.x === p.x && (b.y - a.y) * (p.y - b.y) >= 0 || a.y === b.y && b.y === p.y && (b.x - a.x) * (p.x - b.x) >= 0)) result.pop()
    result.push(p)
  }
  return result
}

/** Real junctions only: points with three or four rays. Corners and card terminals are not branches. */
export function circuitJunctions(segments: ReturnType<typeof circuitSegments>) {
  const candidates = new Map<string, Point>()
  segments.forEach(s => [s.a, s.b].forEach(p => candidates.set(`${p.x},${p.y}`, p)))
  return [...candidates.values()].flatMap(p => {
    const rays = new Set<string>(), owners = new Map<string, CircuitRoute>()
    segments.forEach(s => {
      if (s.a.x === s.b.x && p.x === s.a.x && p.y >= Math.min(s.a.y, s.b.y) && p.y <= Math.max(s.a.y, s.b.y)) {
        if (Math.min(s.a.y, s.b.y) < p.y) rays.add('N')
        if (Math.max(s.a.y, s.b.y) > p.y) rays.add('S')
        s.owners.forEach(r => owners.set(r.target, r))
      } else if (s.a.y === s.b.y && p.y === s.a.y && p.x >= Math.min(s.a.x, s.b.x) && p.x <= Math.max(s.a.x, s.b.x)) {
        if (Math.min(s.a.x, s.b.x) < p.x) rays.add('W')
        if (Math.max(s.a.x, s.b.x) > p.x) rays.add('E')
        s.owners.forEach(r => owners.set(r.target, r))
      }
    })
    return rays.size >= 3 ? [{ point: p, degree: rays.size, owners: [...owners.values()] }] : []
  })
}
