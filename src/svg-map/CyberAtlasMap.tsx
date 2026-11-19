import { useRef, memo, useMemo } from 'react'
import type { SvgMapData, SvgRouteId, SvgCamera } from './types'
import { SvgConnectors } from './SvgConnectors'
import { SvgNode } from './SvgNode'
import { useSvgCamera } from './useSvgCamera'
import { computeDynamicConnectors } from './svgGeometry'
import type { DerivedNodeState } from './learningState'

type Props = {
  data: SvgMapData
  routeId: SvgRouteId
  camera: SvgCamera
  onCameraChange: (cam: SvgCamera) => void
  selectedId: string | null
  hoveredId: string | null
  onSelectNode: (id: string | null) => void
  onHoverNode: (id: string | null) => void
  onNodeClick?: (id: string, e: React.MouseEvent<SVGGElement>) => void
  onNodeDoubleClick?: (id: string, e: React.MouseEvent<SVGGElement>) => void
  onGestureStart?: () => void
  derivedStates?: Map<string, DerivedNodeState>
  fontFamily?: string
  onDoubleTap?: () => void
}

export const CyberAtlasMap = memo(function CyberAtlasMap({
  data,
  routeId,
  camera,
  onCameraChange,
  selectedId,
  hoveredId,
  onSelectNode,
  onHoverNode,
  onNodeClick,
  onNodeDoubleClick,
  onGestureStart,
  derivedStates,
  fontFamily,
  onDoubleTap,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  const { onPointerDown, onPointerMove, onPointerUp, onPointerCancel } = useSvgCamera({
    containerRef,
    camera,
    onCameraChange,
    onDoubleTap,
    onGestureStart,
  })

  const { coreNodes, domainNodes, groupNodes, knowledgeNodes } = useMemo(() => {
    const core = []
    const domain = []
    const group = []
    const knowledge = []

    for (const node of data.nodes) {
      if (node.role === 'core') core.push(node)
      else if (node.role === 'domain') domain.push(node)
      else if (
        node.role === 'structural-container' ||
        node.role === 'structural-knowledge-hub'
      ) {
        group.push(node)
      } else {
        knowledge.push(node)
      }
    }

    return {
      coreNodes: core,
      domainNodes: domain,
      groupNodes: group,
      knowledgeNodes: knowledge,
    }
  }, [data.nodes])

  const { connectorPaths, connectors, terminals, physicalSegments } = useMemo(() => {
    if (data.routeDefs && data.routeDefs.length > 0) {
      const dynamic = computeDynamicConnectors(data.routeDefs, data.byId, camera.zoom)
      return {
        connectorPaths: dynamic.paths,
        connectors: dynamic.connectors,
        terminals: dynamic.terminals,
        physicalSegments: dynamic.physicalSegments,
      }
    }
    return {
      connectorPaths: data.connectorPaths,
      connectors: undefined,
      terminals: [],
      physicalSegments: data.physicalSegments,
    }
  }, [data.routeDefs, data.byId, data.connectorPaths, data.physicalSegments, camera.zoom])

  const handleBackgroundClick = () => {
    onSelectNode(null)
  }

  return (
    <div
      ref={containerRef}
      className="cyberatlas-viewport"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClick={handleBackgroundClick}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#0B0F0E',
        cursor: 'grab',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      <svg
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          overflow: 'hidden',
          fontFamily,
        }}
        aria-label="Mapa de CyberAtlas"
      >
        <g transform={`translate(${camera.x}, ${camera.y}) scale(${camera.zoom})`}>
          <SvgConnectors
            paths={connectorPaths}
            connectors={connectors}
            segments={physicalSegments}
            routes={data.routes}
            backbones={data.backbones}
            busJunctions={data.busJunctions}
            terminals={terminals}
            routeId={routeId}
            zoom={camera.zoom}
          />

          <g className="layer-groups">
            {groupNodes.map(node => (
              <SvgNode
                key={node.id}
                node={node}
                zoom={camera.zoom}
                routeId={routeId}
                routes={data.routes}
                backbones={data.backbones}
                derivedState={derivedStates?.get(node.id)}
                isSelected={selectedId === node.id}
                isHovered={hoveredId === node.id}
                onSelect={id => onSelectNode(id === selectedId ? null : id)}
                onHover={onHoverNode}
                onNodeClick={onNodeClick}
                onNodeDoubleClick={onNodeDoubleClick}
              />
            ))}
          </g>

          <g className="layer-domains">
            {domainNodes.map(node => (
              <SvgNode
                key={node.id}
                node={node}
                zoom={camera.zoom}
                routeId={routeId}
                routes={data.routes}
                backbones={data.backbones}
                derivedState={derivedStates?.get(node.id)}
                isSelected={selectedId === node.id}
                isHovered={hoveredId === node.id}
                onSelect={id => onSelectNode(id === selectedId ? null : id)}
                onHover={onHoverNode}
                onNodeClick={onNodeClick}
                onNodeDoubleClick={onNodeDoubleClick}
              />
            ))}
          </g>

          <g className="layer-core">
            {coreNodes.map(node => (
              <SvgNode
                key={node.id}
                node={node}
                zoom={camera.zoom}
                routeId={routeId}
                routes={data.routes}
                backbones={data.backbones}
                derivedState={derivedStates?.get(node.id)}
                isSelected={selectedId === node.id}
                isHovered={hoveredId === node.id}
                onSelect={id => onSelectNode(id === selectedId ? null : id)}
                onHover={onHoverNode}
                onNodeClick={onNodeClick}
                onNodeDoubleClick={onNodeDoubleClick}
              />
            ))}
          </g>

          <g className="layer-knowledge">
            {knowledgeNodes.map(node => (
              <SvgNode
                key={node.id}
                node={node}
                zoom={camera.zoom}
                routeId={routeId}
                routes={data.routes}
                backbones={data.backbones}
                derivedState={derivedStates?.get(node.id)}
                isSelected={selectedId === node.id}
                isHovered={hoveredId === node.id}
                onSelect={id => onSelectNode(id === selectedId ? null : id)}
                onHover={onHoverNode}
                onNodeClick={onNodeClick}
                onNodeDoubleClick={onNodeDoubleClick}
              />
            ))}
          </g>

        </g>
      </svg>
    </div>
  )
})
