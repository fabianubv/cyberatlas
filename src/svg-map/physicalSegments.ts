import type { Point } from './types'
import type { SvgPhysicalSegment } from './types'

export type RouteWithPoints = {
  sourceId: string
  targetId: string
  points: Point[]
}

const roundCoord = (val: number) => Math.round(val * 100) / 100

/** Splits routes into non-overlapping segments, so each piece of track renders exactly once and knows every route that uses it. */
export function buildPhysicalSegments(routes: RouteWithPoints[]): SvgPhysicalSegment[] {
  const tracks = new Map<
    string,
    {
      vertical: boolean
      fixed: number
      spans: Array<{ lo: number; hi: number; sourceId: string; targetId: string }>
    }
  >()

  for (const { sourceId, targetId, points } of routes) {
    if (!points || points.length < 2) continue

    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i]
      const b = points[i + 1]

      const isVertical = Math.abs(a.x - b.x) < 0.01
      const isHorizontal = Math.abs(a.y - b.y) < 0.01

      if (!isVertical && !isHorizontal) {
        continue
      }

      const vertical = isVertical
      const fixed = roundCoord(vertical ? a.x : a.y)
      const lo = roundCoord(Math.min(vertical ? a.y : a.x, vertical ? b.y : b.x))
      const hi = roundCoord(Math.max(vertical ? a.y : a.x, vertical ? b.y : b.x))

      if (hi - lo < 0.01) continue

      const key = `${vertical ? 'v' : 'h'}:${fixed}`
      let track = tracks.get(key)
      if (!track) {
        track = { vertical, fixed, spans: [] }
        tracks.set(key, track)
      }

      track.spans.push({ lo, hi, sourceId, targetId })
    }
  }

  const segments: SvgPhysicalSegment[] = []

  for (const [key, track] of tracks.entries()) {
    const stopsSet = new Set<number>()
    for (const span of track.spans) {
      stopsSet.add(span.lo)
      stopsSet.add(span.hi)
    }

    const stops = Array.from(stopsSet).sort((a, b) => a - b)

    for (let i = 0; i < stops.length - 1; i++) {
      const lo = stops[i]
      const hi = stops[i + 1]

      if (hi - lo < 0.01) continue

      const ownerEdgesMap = new Map<string, { sourceId: string; targetId: string }>()
      for (const span of track.spans) {
        if (span.lo <= lo + 0.01 && span.hi >= hi - 0.01) {
          const edgeKey = `${span.sourceId}->${span.targetId}`
          if (!ownerEdgesMap.has(edgeKey)) {
            ownerEdgesMap.set(edgeKey, { sourceId: span.sourceId, targetId: span.targetId })
          }
        }
      }

      if (ownerEdgesMap.size === 0) continue

      const x1 = track.vertical ? track.fixed : lo
      const y1 = track.vertical ? lo : track.fixed
      const x2 = track.vertical ? track.fixed : hi
      const y2 = track.vertical ? hi : track.fixed

      const segId = `${key}:${lo}->${hi}`
      const path = `M ${x1} ${y1} L ${x2} ${y2}`

      segments.push({
        id: segId,
        x1,
        y1,
        x2,
        y2,
        path,
        ownerEdges: Array.from(ownerEdgesMap.values()),
      })
    }
  }

  return segments
}
