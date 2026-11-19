import { useRef, useEffect, useCallback, type PointerEvent } from 'react'
import type { SvgCamera } from './types'
import { computeWheelZoom, CAMERA_LIMITS } from './camera'

export interface UseSvgCameraOptions {
  containerRef: React.RefObject<HTMLDivElement | null>
  camera: SvgCamera
  onCameraChange: (cam: SvgCamera) => void
  onDoubleTap?: () => void
  onGestureStart?: () => void
}

export function useSvgCamera({
  containerRef,
  camera,
  onCameraChange,
  onDoubleTap,
  onGestureStart,
}: UseSvgCameraOptions) {
  const activePointers = useRef<Map<number, { clientX: number; clientY: number }>>(new Map())
  const isDragging = useRef(false)
  const isPinching = useRef(false)

  const startPointer = useRef({ x: 0, y: 0 })
  const startCamera = useRef<SvgCamera>(camera)

  const pinchStartDistance = useRef(0)
  const pinchStartMidpoint = useRef({ x: 0, y: 0 })
  const pinchStartCamera = useRef<SvgCamera>(camera)

  const lastTapTime = useRef(0)
  const lastTapPos = useRef({ x: 0, y: 0 })
  const pointerDownTime = useRef(0)
  const pointerDownPos = useRef({ x: 0, y: 0 })

  const cameraRef = useRef<SvgCamera>(camera)

  useEffect(() => {
    cameraRef.current = camera
  }, [camera])

  const pointerDownOnNode = useRef(false)
  const gestureStarted = useRef(false)

  const onPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    // Only accept left click for mouse; accept all touch/pen pointers
    if (e.pointerType === 'mouse' && e.button !== 0) return

    activePointers.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY })

    const isNode = Boolean((e.target as Element)?.closest?.('.cyber-node'))
    pointerDownOnNode.current = isNode
    gestureStarted.current = false

    // Only capture pointer on background container if NOT interacting with a clickable node
    if (!isNode) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // ignore
      }
    }

    if (activePointers.current.size === 1) {
      isDragging.current = true
      isPinching.current = false
      startPointer.current = { x: e.clientX, y: e.clientY }
      startCamera.current = { ...cameraRef.current }

      pointerDownTime.current = Date.now()
      pointerDownPos.current = { x: e.clientX, y: e.clientY }
    } else if (activePointers.current.size >= 2) {
      const pointers = Array.from(activePointers.current.values())
      const p1 = pointers[0]
      const p2 = pointers[1]

      const dist = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY)
      const mid = {
        x: (p1.clientX + p2.clientX) / 2,
        y: (p1.clientY + p2.clientY) / 2,
      }

      isDragging.current = false
      isPinching.current = true
      pinchStartDistance.current = Math.max(10, dist)
      pinchStartMidpoint.current = mid
      pinchStartCamera.current = { ...cameraRef.current }

      if (!gestureStarted.current) {
        gestureStarted.current = true
        onGestureStart?.()
      }
    }
  }, [onGestureStart])

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!activePointers.current.has(e.pointerId)) return

      activePointers.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY })

      if (isPinching.current && activePointers.current.size >= 2) {
        const pointers = Array.from(activePointers.current.values())
        const p1 = pointers[0]
        const p2 = pointers[1]

        const currentDistance = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY)
        const currentMidpoint = {
          x: (p1.clientX + p2.clientX) / 2,
          y: (p1.clientY + p2.clientY) / 2,
        }

        const scaleRatio = currentDistance / pinchStartDistance.current
        const minZoom = CAMERA_LIMITS.minZoom
        const maxZoom = CAMERA_LIMITS.maxZoom
        const newZoom = Math.min(maxZoom, Math.max(minZoom, pinchStartCamera.current.zoom * scaleRatio))

        const worldX = (pinchStartMidpoint.current.x - pinchStartCamera.current.x) / pinchStartCamera.current.zoom
        const worldY = (pinchStartMidpoint.current.y - pinchStartCamera.current.y) / pinchStartCamera.current.zoom

        const newX = currentMidpoint.x - worldX * newZoom
        const newY = currentMidpoint.y - worldY * newZoom

        onCameraChange({
          x: newX,
          y: newY,
          zoom: newZoom,
        })
      } else if (isDragging.current && activePointers.current.size === 1) {
        const dx = e.clientX - startPointer.current.x
        const dy = e.clientY - startPointer.current.y
        if (Math.hypot(dx, dy) < 4) return

        if (!gestureStarted.current) {
          gestureStarted.current = true
          onGestureStart?.()
        }

        onCameraChange({
          x: startCamera.current.x + dx,
          y: startCamera.current.y + dy,
          zoom: startCamera.current.zoom,
        })
      }
    },
    [onCameraChange, onGestureStart],
  )

  const handlePointerEnd = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const hadPointer = activePointers.current.has(e.pointerId)
      activePointers.current.delete(e.pointerId)

      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // ignore
      }

      if (!hadPointer) return

      if (
        onDoubleTap &&
        e.pointerType === 'touch' &&
        !pointerDownOnNode.current &&
        activePointers.current.size === 0 &&
        !isPinching.current
      ) {
        const tapDuration = Date.now() - pointerDownTime.current
        const tapMoveDist = Math.hypot(
          e.clientX - pointerDownPos.current.x,
          e.clientY - pointerDownPos.current.y,
        )

        if (tapDuration < 280 && tapMoveDist < 12) {
          const now = Date.now()
          const timeSinceLastTap = now - lastTapTime.current
          const distFromLastTap = Math.hypot(
            e.clientX - lastTapPos.current.x,
            e.clientY - lastTapPos.current.y,
          )

          if (timeSinceLastTap < 320 && distFromLastTap < 30) {
            onDoubleTap()
            lastTapTime.current = 0
          } else {
            lastTapTime.current = now
            lastTapPos.current = { x: e.clientX, y: e.clientY }
          }
        }
      }

      if (activePointers.current.size === 1) {
        // One finger lifted during a pinch: the other one continues as a drag.
        const remaining = Array.from(activePointers.current.values())[0]
        startPointer.current = { x: remaining.clientX, y: remaining.clientY }
        startCamera.current = { ...cameraRef.current }
        isDragging.current = true
        isPinching.current = false
      } else if (activePointers.current.size === 0) {
        isDragging.current = false
        isPinching.current = false
      }
    },
    [onDoubleTap],
  )

  // Non-passive native listener: needed to prevent the window from scrolling on wheel.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      onGestureStart?.()
      const rect = container.getBoundingClientRect()
      const pointerX = e.clientX - rect.left
      const pointerY = e.clientY - rect.top

      const next = computeWheelZoom(cameraRef.current, pointerX, pointerY, e.deltaY)
      onCameraChange(next)
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [containerRef, onCameraChange, onGestureStart])

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: handlePointerEnd,
    onPointerCancel: handlePointerEnd,
  }
}
