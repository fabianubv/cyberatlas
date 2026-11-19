import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import type { loadData } from '../data'
import { createSvgMapData } from './svgGeometry'
import { CyberAtlasMap } from './CyberAtlasMap'
import { getFitCamera, areCamerasEqual, animateCamera } from './camera'
import { getParentNodeId, getNodeFocusCamera, getSmartMobileEntryCamera } from './nodeFocus'
import { ROUTE_THEMES } from './routeVisuals'
import type { SvgRouteId, SvgCamera } from './types'
import {
  computeAllDerivedNodeStates,
  DEFAULT_LEARNING_STATE,
} from './learningState'
import { FONT_FAMILY } from './cardDesignSystem'
import { depthLabels, typeLabels } from '../labels'
import { SourcesPanel } from './SourcesPanel'

type Props = ReturnType<typeof loadData>

interface RouteItem {
  id: SvgRouteId
  code: string
  label: string
  hint: string
}

const ROUTE_ITEMS: RouteItem[] = [
  { id: 'explore', code: 'EXP', label: 'Explorar', hint: 'Mapa completo' },
  { id: 'base', code: 'BASE', label: 'Base', hint: 'Fundamentos troncales' },
  { id: 'soc-l1', code: 'SOC', label: 'SOC L1', hint: 'Operaciones y detección' },
  { id: 'pentesting', code: 'PENT', label: 'Pentesting', hint: 'Seguridad ofensiva' },
  { id: 'grc', code: 'GRC', label: 'GRC', hint: 'Gobernanza y riesgo' },
  { id: 'cloud-security', code: 'CLOUD', label: 'Cloud Security', hint: 'Seguridad en la nube' },
  { id: 'ai-security', code: 'AISEC', label: 'AI Security', hint: 'Seguridad en inteligencia artificial' },
]

export default function SvgApp({ graph, routes, rootId }: Props) {
  const data = createSvgMapData(graph, rootId, routes)

  const [routeId, setRouteId] = useState<SvgRouteId>('explore')
  const [hoveredRoute, setHoveredRoute] = useState<SvgRouteId | null>(null)

  const derivedStates = useMemo(() => {
    return computeAllDerivedNodeStates(
      graph,
      routes,
      routeId,
      DEFAULT_LEARNING_STATE,
      data.structuralRoles || new Map(),
    )
  }, [graph, routes, routeId, data.structuralRoles])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [hoveredFit, setHoveredFit] = useState(false)
  const [hoveredCardsToggle, setHoveredCardsToggle] = useState(false)

  // Lets the user explore the map without the node detail card popping up.
  const [showCards, setShowCards] = useState(() => {
    try {
      return window.localStorage.getItem('cyberatlas:showCards') !== 'off'
    } catch {
      return true
    }
  })
  const toggleCards = useCallback(() => {
    setShowCards(prev => {
      const next = !prev
      try {
        window.localStorage.setItem('cyberatlas:showCards', next ? 'on' : 'off')
      } catch {
        // Storage unavailable: the choice just lasts for this visit.
      }
      return next
    })
  }, [])

  const [camera, setCamera] = useState<SvgCamera>(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1200
    const h = typeof window !== 'undefined' ? window.innerHeight : 800
    // Phones open on the core and domains at a readable zoom, not the full map.
    const isPhone = Math.min(w, h) <= 480
    return isPhone
      ? getSmartMobileEntryCamera(data, w, h)
      : getFitCamera(data.bounds, w, h)
  })

  const cameraRef = useRef(camera)
  useEffect(() => {
    cameraRef.current = camera
  }, [camera])

  const focusStateRef = useRef<{ id: string | null; moved: boolean }>({
    id: null,
    moved: false,
  })
  const cancelAnimationRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    return () => {
      cancelAnimationRef.current?.()
    }
  }, [])

  // A manual gesture cancels any running camera animation.
  const handleGestureStart = useCallback(() => {
    if (cancelAnimationRef.current) {
      cancelAnimationRef.current()
      cancelAnimationRef.current = null
    }
    focusStateRef.current.moved = true
  }, [])

  const smoothAnimateToCamera = useCallback((targetCam: SvgCamera, onComplete?: () => void, duration = 680) => {
    if (cancelAnimationRef.current) {
      cancelAnimationRef.current()
      cancelAnimationRef.current = null
    }
    const w = typeof window !== 'undefined' ? window.innerWidth : 1200
    const h = typeof window !== 'undefined' ? window.innerHeight : 800

    cancelAnimationRef.current = animateCamera(
      cameraRef.current,
      targetCam,
      w,
      h,
      duration,
      nextCam => {
        cameraRef.current = nextCam
        setCamera(nextCam)
      },
      () => {
        cancelAnimationRef.current = null
        onComplete?.()
      },
    )
  }, [])

  useEffect(() => {
    ;(window as unknown as { __setCameraZoom?: (z: number) => void; __setCamera?: (cam: SvgCamera) => void }).__setCameraZoom = (z: number) => {
      setCamera(prev => ({ ...prev, zoom: z }))
    }
    ;(window as unknown as { __setCameraZoom?: (z: number) => void; __setCamera?: (cam: SvgCamera) => void }).__setCamera = (cam: SvgCamera) => {
      setCamera(cam)
    }
  }, [])

  const handleCameraChange = useCallback((next: SvgCamera) => {
    setCamera(prev => {
      if (areCamerasEqual(prev, next)) return prev
      return next
    })
  }, [])

  const handleFit = useCallback(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1200
    const h = typeof window !== 'undefined' ? window.innerHeight : 800
    const fitCam = getFitCamera(data.bounds, w, h)
    focusStateRef.current = { id: data.rootId, moved: false }
    smoothAnimateToCamera(fitCam)
  }, [data.bounds, data.rootId, smoothAnimateToCamera])

  const ascendToParent = useCallback((nodeId: string) => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1200
    const h = typeof window !== 'undefined' ? window.innerHeight : 800
    const parentId = getParentNodeId(nodeId, data)

    if (parentId && parentId !== data.rootId) {
      const targetCam = getNodeFocusCamera(parentId, data, w, h)
      if (targetCam) {
        focusStateRef.current = { id: parentId, moved: false }
        setSelectedId(parentId)
        smoothAnimateToCamera(targetCam)
        return
      }
    }

    const isPhone = Math.min(w, h) <= 480
    const targetCam = isPhone
      ? getSmartMobileEntryCamera(data, w, h)
      : getFitCamera(data.bounds, w, h)
    focusStateRef.current = { id: data.rootId, moved: false }
    setSelectedId(null)
    smoothAnimateToCamera(targetCam)
  }, [data, smoothAnimateToCamera])

  const focusOnNode = useCallback((nodeId: string) => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1200
    const h = typeof window !== 'undefined' ? window.innerHeight : 800

    const targetCam = nodeId === data.rootId
      ? (Math.min(w, h) <= 480 ? getSmartMobileEntryCamera(data, w, h) : getFitCamera(data.bounds, w, h))
      : getNodeFocusCamera(nodeId, data, w, h)

    if (targetCam) {
      focusStateRef.current = { id: nodeId, moved: false }
      setSelectedId(nodeId)
      smoothAnimateToCamera(targetCam)
    }
  }, [data, smoothAnimateToCamera])

  const handleNodeClick = useCallback((nodeId: string) => {
    const currentFocus = focusStateRef.current
    if (currentFocus.id === nodeId && !currentFocus.moved) {
      ascendToParent(nodeId)
    } else {
      focusOnNode(nodeId)
    }
  }, [ascendToParent, focusOnNode])

  const handleNodeDoubleClick = useCallback((nodeId: string) => {
    ascendToParent(nodeId)
  }, [ascendToParent])

  const prevViewportRef = useRef({
    w: typeof window !== 'undefined' ? window.innerWidth : 1200,
    h: typeof window !== 'undefined' ? window.innerHeight : 800,
  })

  useEffect(() => {
    const handleResize = () => {
      const newW = window.innerWidth
      const newH = window.innerHeight
      const prevW = prevViewportRef.current.w
      const prevH = prevViewportRef.current.h

      if (newW === prevW && newH === prevH) return

      setCamera(currentCam => {
        const oldFit = getFitCamera(data.bounds, prevW, prevH)
        const newFit = getFitCamera(data.bounds, newW, newH)

        // Viewing the whole map (within 15% of fit zoom): refit to the new size.
        const isNearFit = Math.abs(currentCam.zoom - oldFit.zoom) / oldFit.zoom < 0.15

        prevViewportRef.current = { w: newW, h: newH }

        if (isNearFit) {
          return newFit
        }

        // Zoomed into an area: keep the world point at the screen center.
        const worldCenterX = (prevW / 2 - currentCam.x) / currentCam.zoom
        const worldCenterY = (prevH / 2 - currentCam.y) / currentCam.zoom

        const nextX = newW / 2 - worldCenterX * currentCam.zoom
        const nextY = newH / 2 - worldCenterY * currentCam.zoom

        return {
          x: nextX,
          y: nextY,
          zoom: currentCam.zoom,
        }
      })
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [data.bounds])

  const selectedNode = useMemo(() => {
    if (!selectedId) return null
    return data.byId.get(selectedId) || null
  }, [selectedId, data.byId])

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSourcesOpen, setIsSourcesOpen] = useState(false)
  const toggleSources = useCallback(() => setIsSourcesOpen(open => !open), [])
  const closeSources = useCallback(() => setIsSourcesOpen(false), [])
  const [isCompactViewport, setIsCompactViewport] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth <= 768 || window.innerHeight <= 520
  })

  useEffect(() => {
    const handleViewportChange = () => {
      setIsCompactViewport(window.innerWidth <= 768 || window.innerHeight <= 520)
    }
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('orientationchange', handleViewportChange)
    return () => {
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('orientationchange', handleViewportChange)
    }
  }, [])

  const activeTheme = ROUTE_THEMES[routeId]
  const activeItem = ROUTE_ITEMS.find(item => item.id === routeId)

  const routeContext = useMemo(() => {
    if (!selectedNode) return null

    if (routeId === 'explore') {
      const parentId = getParentNodeId(selectedNode.id, data)
      const parentNode = parentId ? data.byId.get(parentId) : null
      return {
        badge: 'VISTA GENERAL',
        isMember: true,
        lines: [
          { label: 'NIVEL TÉCNICO', value: depthLabels[selectedNode.depth] || 'General', highlight: false },
          ...(parentNode ? [{ label: 'GRUPO PADRE', value: parentNode.name, highlight: false }] : []),
        ],
      }
    }

    if (routeId === 'base') {
      const isBase = data.routes.base.has(selectedNode.id)
      const baseRelevance = derivedStates.get(selectedNode.id)?.relevance ?? 0
      const baseRelLabels: Record<number, string> = {
        3: 'Pilar fundamental (Nivel 3)',
        2: 'Troncal práctico (Nivel 2)',
        1: 'Contextual / Reconocimiento (Nivel 1)',
      }
      const baseMasteryLabels: Record<number, string> = {
        3: 'Criterio analítico e innegociable',
        2: 'Uso en laboratorio y consola',
        1: 'Comprensión conceptual básica',
      }
      return {
        badge: 'BASE TRONCAL',
        isMember: isBase,
        lines: isBase
          ? [
              { label: 'PRIORIDAD EN BASE', value: baseRelLabels[baseRelevance] || 'Troncal común', highlight: true },
              { label: 'NIVEL RECOMENDADO', value: baseMasteryLabels[baseRelevance] || 'Fundamento transversal', highlight: false },
            ]
          : [
              { label: 'ESTADO', value: 'Fuera de la base común', highlight: false },
              { label: 'ALCANCE', value: 'Especialización avanzada', highlight: false },
            ],
      }
    }

    const pathDef = routes.paths.find(p => p.id === routeId)
    const routeNode = pathDef?.nodes.find(n => n.id === selectedNode.id)
    const routeName = pathDef?.name || routeId.toUpperCase()

    if (routeNode) {
      const isBaseNode = data.routes.base.has(selectedNode.id)
      const relLabels: Record<number, string> = {
        4: 'Pilar crítico',
        3: 'Alta prioridad',
        2: 'Complementaria',
        1: 'Contexto general',
      }
      const masteryLabelsMap: Record<string, string> = {
        master: 'Avanzado (Dominio total)',
        use: 'Práctico (Laboratorio y aplicación)',
        analyze: 'Analítico (Evaluación y auditoría)',
        explain: 'Conceptual (Comprensión teórica)',
        know: 'Básico (Reconocimiento)',
        recognize: 'Básico (Reconocimiento)',
      }
      const priorityText = relLabels[routeNode.relevance] || `Nivel ${routeNode.relevance}`
      return {
        badge: routeName.toUpperCase(),
        isMember: true,
        lines: [
          {
            label: 'PRIORIDAD EN RUTA',
            value: isBaseNode ? `${priorityText} · Troncal común` : priorityText,
            highlight: true,
          },
          { label: 'NIVEL RECOMENDADO', value: masteryLabelsMap[routeNode.expected_mastery] || 'Aplicación práctica', highlight: false },
        ],
      }
    }

    return {
      badge: routeName.toUpperCase(),
      isMember: false,
      lines: [
        { label: 'ESTADO', value: 'Fuera de la ruta activa', highlight: false },
        { label: 'ALCANCE', value: `No prioritario para ${routeName}`, highlight: false },
      ],
    }
  }, [selectedNode, routeId, data, routes, derivedStates])

  return (
    <div
      className="cyberatlas-root"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#0B0F0E',
        fontFamily: FONT_FAMILY,
      }}
    >
      <CyberAtlasMap
        data={data}
        routeId={routeId}
        camera={camera}
        fontFamily={FONT_FAMILY}
        onCameraChange={handleCameraChange}
        onDoubleTap={handleFit}
        selectedId={selectedId}
        hoveredId={hoveredId}
        onSelectNode={id => {
          setSelectedId(id)
          setIsMobileMenuOpen(false)
          setIsSourcesOpen(false)
        }}
        onHoverNode={setHoveredId}
        onNodeClick={id => {
          setIsSourcesOpen(false)
          handleNodeClick(id)
        }}
        onNodeDoubleClick={handleNodeDoubleClick}
        onGestureStart={() => {
          handleGestureStart()
          setIsMobileMenuOpen(false)
          setIsSourcesOpen(false)
        }}
        derivedStates={derivedStates}
      />

      <header
        style={{
          position: 'fixed',
          top: isCompactViewport ? 12 : 20,
          left: isCompactViewport ? 14 : 24,
          zIndex: 100,
          display: 'flex',
          flexDirection: isCompactViewport ? 'row' : 'column',
          alignItems: isCompactViewport ? 'center' : 'flex-start',
          gap: isCompactViewport ? 12 : 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, userSelect: 'none' }}>
          <span
            style={{
              fontSize: isCompactViewport ? 11 : 13,
              fontWeight: 700,
              color: '#E8FFF5',
              letterSpacing: isCompactViewport ? 1.5 : 2.2,
              textTransform: 'uppercase',
            }}
          >
            CYBERATLAS
          </span>
        </div>

        {isCompactViewport ? (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsMobileMenuOpen(prev => !prev)}
              aria-label={`Ruta activa: ${activeItem?.label}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: 'rgba(12, 17, 15, 0.92)',
                backdropFilter: 'blur(12px)',
                padding: '4px 8px',
                borderRadius: 5,
                border: `1px solid ${activeTheme.accent}`,
                color: activeTheme.accent,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 0.8,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.6)',
              }}
            >
              <span>{activeItem?.code}</span>
              <span style={{ fontSize: 8, opacity: 0.8 }}>▼</span>
            </button>

            {isMobileMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  backgroundColor: 'rgba(10, 14, 13, 0.96)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid #24352D',
                  borderRadius: 6,
                  padding: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.8)',
                  zIndex: 110,
                  minWidth: 140,
                }}
              >
                {ROUTE_ITEMS.map(({ id, code, label }) => {
                  const theme = ROUTE_THEMES[id]
                  const isActive = routeId === id

                  return (
                    <button
                      key={id}
                      onClick={() => {
                        setRouteId(id)
                        setIsMobileMenuOpen(false)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        borderRadius: 4,
                        border: 'none',
                        background: isActive ? `${theme.accent}20` : 'transparent',
                        color: isActive ? theme.accent : '#8A9E93',
                        fontSize: 10,
                        fontWeight: isActive ? 700 : 500,
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{code}</span>
                      <span style={{ fontSize: 9, opacity: 0.75 }}>{label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          /* DESKTOP ROUTE BAR */
          <nav
            aria-label="Rutas de aprendizaje"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              backgroundColor: 'rgba(12, 17, 15, 0.85)',
              backdropFilter: 'blur(12px)',
              padding: '3px 4px',
              borderRadius: 6,
              border: '1px solid #1C2B24',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.45)',
            }}
          >
            {ROUTE_ITEMS.map(({ id, code, label, hint }) => {
              const theme = ROUTE_THEMES[id]
              const isActive = routeId === id
              const isHovered = hoveredRoute === id

              return (
                <button
                  key={id}
                  onClick={() => setRouteId(id)}
                  onMouseEnter={() => setHoveredRoute(id)}
                  onMouseLeave={() => setHoveredRoute(null)}
                  title={`${label} — ${hint}`}
                  aria-label={label}
                  style={{
                    position: 'relative',
                    background: isActive
                      ? `${theme.accent}1F`
                      : (isHovered ? 'rgba(255, 255, 255, 0.04)' : 'transparent'),
                    border: `1px solid ${isActive ? theme.accent : (isHovered ? '#2D4439' : 'transparent')}`,
                    color: isActive ? theme.accent : (isHovered ? '#D8EFE4' : '#6F897B'),
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: isActive ? 700 : 500,
                    letterSpacing: 0.8,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {code}
                </button>
              )
            })}
          </nav>
        )}
      </header>

      <div
        style={{
          position: 'fixed',
          bottom: isCompactViewport ? 14 : 24,
          right: isCompactViewport ? 14 : 24,
          zIndex: 100,
          display: 'flex',
          gap: 8,
        }}
      >
        <button
          onClick={toggleCards}
          onMouseEnter={() => setHoveredCardsToggle(true)}
          onMouseLeave={() => setHoveredCardsToggle(false)}
          title={showCards ? 'Ocultar fichas de detalle' : 'Mostrar fichas de detalle'}
          aria-label={showCards ? 'Ocultar fichas de detalle' : 'Mostrar fichas de detalle'}
          aria-pressed={!showCards}
          style={{
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(12, 17, 15, 0.85)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${hoveredCardsToggle ? (routeId === 'explore' ? '#FFFFFF' : ROUTE_THEMES[routeId].accent) : '#203028'}`,
            borderRadius: 6,
            color: hoveredCardsToggle
              ? (routeId === 'explore' ? '#FFFFFF' : ROUTE_THEMES[routeId].accent)
              : (showCards ? '#7E9B8C' : '#4A6155'),
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.5)',
            cursor: 'pointer',
            padding: 0,
            transition: 'all 0.15s ease',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="3" width="12" height="10" rx="1.5" />
            <path d="M4.5 6H9" />
            <path d="M4.5 8.5H11.5" />
            <path d="M4.5 11H8" />
            {!showCards && <path d="M1.5 14.5L14.5 1.5" />}
          </svg>
        </button>
        <button
          onClick={handleFit}
          onMouseEnter={() => setHoveredFit(true)}
          onMouseLeave={() => setHoveredFit(false)}
          title="Ajustar vista completa"
          aria-label="Ajustar vista completa"
          style={{
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(12, 17, 15, 0.85)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${hoveredFit ? (routeId === 'explore' ? '#FFFFFF' : ROUTE_THEMES[routeId].accent) : '#203028'}`,
            borderRadius: 6,
            color: hoveredFit ? (routeId === 'explore' ? '#FFFFFF' : ROUTE_THEMES[routeId].accent) : '#7E9B8C',
            boxShadow: hoveredFit ? `0 0 16px ${routeId === 'explore' ? 'rgba(255, 255, 255, 0.25)' : ROUTE_THEMES[routeId].accent + '40'}` : '0 6px 20px rgba(0, 0, 0, 0.5)',
            cursor: 'pointer',
            padding: 0,
            transition: 'all 0.15s ease',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2.5 6V2.5H6" />
            <path d="M10 2.5H13.5V6" />
            <path d="M2.5 10V13.5H6" />
            <path d="M10 13.5H13.5V10" />
          </svg>
        </button>
      </div>

      <SourcesPanel
        isOpen={isSourcesOpen}
        onToggle={toggleSources}
        onClose={closeSources}
        isCompact={isCompactViewport}
      />

      {showCards && selectedNode && routeContext && (
        <div
          role="region"
          aria-label="Detalles técnicos del nodo"
          style={{
            position: 'fixed',
            bottom: isCompactViewport ? 12 : 24,
            left: isCompactViewport ? 12 : 24,
            right: isCompactViewport ? 12 : 'auto',
            zIndex: 100,
            maxWidth: isCompactViewport ? 420 : 360,
            maxHeight: isCompactViewport ? '50vh' : 'none',
            overflowY: 'auto',
            backgroundColor: 'rgba(10, 14, 13, 0.94)',
            backdropFilter: 'blur(16px)',
            padding: '14px 16px',
            borderRadius: 8,
            border: `1px solid ${routeContext.isMember ? activeTheme.accent : '#24352D'}`,
            boxShadow: `0 12px 40px rgba(0, 0, 0, 0.75), 0 0 20px ${routeContext.isMember ? activeTheme.accent + '15' : 'transparent'}`,
            color: '#E8FFF5',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  fontSize: 9,
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: routeContext.isMember ? activeTheme.accent : '#7B9487',
                  letterSpacing: 1.2,
                }}
              >
                {typeLabels[selectedNode.type]?.toUpperCase() || selectedNode.type.toUpperCase()}
              </span>
              <span style={{ fontSize: 9, color: '#3A4E44' }}>/</span>
              <span
                style={{
                  fontSize: 9,
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  color: '#8A9E93',
                  letterSpacing: 0.8,
                }}
              >
                {routeContext.badge}
              </span>
            </div>
            <button
              onClick={() => setSelectedId(null)}
              aria-label="Cerrar ficha"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#657D71',
                fontSize: 14,
                cursor: 'pointer',
                padding: '2px 4px',
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          <h2
            style={{
              fontSize: 15,
              margin: '0 0 6px 0',
              fontWeight: 600,
              color: '#FFFFFF',
              letterSpacing: -0.2,
              lineHeight: 1.3,
            }}
          >
            {selectedNode.name}
          </h2>

          <p
            style={{
              fontSize: 12,
              lineHeight: 1.5,
              color: '#A9BFB3',
              margin: '0 0 10px 0',
            }}
          >
            {selectedNode.summary || 'Definición en proceso de integración técnica.'}
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              border: `1px solid ${routeContext.isMember ? activeTheme.accent + '33' : '#1E2D26'}`,
              borderRadius: 6,
              padding: '8px 10px',
              fontSize: 10,
            }}
          >
            {routeContext.lines.map((line, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: '#688074', fontFamily: 'monospace', letterSpacing: 0.6 }}>
                  {line.label}
                </span>
                <span
                  style={{
                    color: line.highlight ? activeTheme.accent : '#D8EFE4',
                    fontWeight: line.highlight ? 600 : 400,
                    textAlign: 'right',
                  }}
                >
                  {line.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
