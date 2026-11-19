import type { SvgCamera } from './types'

export const CAMERA_LIMITS = {
  minZoom: 0.005,
  maxZoom: 5.0,
  defaultPadding: 60,
} as const

/** Padding around the map: 16px on phones, 30px on tablets, 38px on desktop. */
export function getResponsivePadding(viewportWidth: number, viewportHeight: number): number {
  const minDim = Math.min(viewportWidth, viewportHeight)
  if (minDim <= 480) return 16
  if (minDim <= 1024) return 30
  return 38
}

/** Camera that fits a bounding box in the viewport. */
export function getFitCamera(
  bounds: { left: number; right: number; top: number; bottom: number },
  viewportWidth: number,
  viewportHeight: number,
  padding?: number,
): SvgCamera {
  const pad = padding !== undefined ? padding : getResponsivePadding(viewportWidth, viewportHeight)
  const worldW = bounds.right - bounds.left
  const worldH = bounds.bottom - bounds.top
  const availW = Math.max(100, viewportWidth - pad * 2)
  const availH = Math.max(100, viewportHeight - pad * 2)

  const zoom = Math.min(availW / worldW, availH / worldH)
  const worldCenterX = (bounds.left + bounds.right) / 2
  const worldCenterY = (bounds.top + bounds.bottom) / 2

  const x = viewportWidth / 2 - worldCenterX * zoom
  const y = viewportHeight / 2 - worldCenterY * zoom

  return { x, y, zoom }
}

/** Animates the camera by interpolating the world point at the screen center and the zoom logarithmically, which avoids off-center jumps. */
export function animateCamera(
  from: SvgCamera,
  to: SvgCamera,
  viewportWidth = 1200,
  viewportHeight = 800,
  duration = 680,
  onUpdate: (cam: SvgCamera) => void = () => {},
  onComplete?: () => void,
): () => void {
  const startTime = performance.now()
  let animId = 0

  const startZoom = Math.max(0.0001, from.zoom)
  const endZoom = Math.max(0.0001, to.zoom)

  // World coordinates at screen center
  const startWorldX = (viewportWidth / 2 - from.x) / startZoom
  const startWorldY = (viewportHeight / 2 - from.y) / startZoom

  const endWorldX = (viewportWidth / 2 - to.x) / endZoom
  const endWorldY = (viewportHeight / 2 - to.y) / endZoom

  const startLogZoom = Math.log(startZoom)
  const endLogZoom = Math.log(endZoom)

  const step = (now: number) => {
    const elapsed = now - startTime
    const progress = Math.min(1, elapsed / duration)
    // Sinusoidal ease-in-out
    const ease = (1 - Math.cos(Math.PI * progress)) / 2

    const curWorldX = startWorldX + (endWorldX - startWorldX) * ease
    const curWorldY = startWorldY + (endWorldY - startWorldY) * ease
    const curZoom = Math.exp(startLogZoom + (endLogZoom - startLogZoom) * ease)

    const curX = viewportWidth / 2 - curWorldX * curZoom
    const curY = viewportHeight / 2 - curWorldY * curZoom

    onUpdate({ x: curX, y: curY, zoom: curZoom })

    if (progress < 1) {
      animId = requestAnimationFrame(step)
    } else {
      onComplete?.()
    }
  }

  animId = requestAnimationFrame(step)
  return () => cancelAnimationFrame(animId)
}

/** Wheel zoom that keeps the world point under the cursor in place. */
export function computeWheelZoom(
  current: SvgCamera,
  pointerX: number,
  pointerY: number,
  deltaY: number,
  minZoom = CAMERA_LIMITS.minZoom,
  maxZoom = CAMERA_LIMITS.maxZoom,
): SvgCamera {
  const zoomFactor = deltaY < 0 ? 1.15 : 1 / 1.15
  const newZoom = Math.min(maxZoom, Math.max(minZoom, current.zoom * zoomFactor))

  const worldX = (pointerX - current.x) / current.zoom
  const worldY = (pointerY - current.y) / current.zoom

  const newX = pointerX - worldX * newZoom
  const newY = pointerY - worldY * newZoom

  return { x: newX, y: newY, zoom: newZoom }
}

/** Epsilon comparison to avoid redundant re-renders. */
export function areCamerasEqual(
  camA: SvgCamera,
  camB: SvgCamera,
  epsilon = 0.001,
): boolean {
  return (
    Math.abs(camA.x - camB.x) < epsilon &&
    Math.abs(camA.y - camB.y) < epsilon &&
    Math.abs(camA.zoom - camB.zoom) < epsilon * 0.01
  )
}
