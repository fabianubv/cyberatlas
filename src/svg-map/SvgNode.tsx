import { memo } from 'react'
import type { SvgNodeData, SvgRouteId, RouteMemberships } from './types'
import type { RouteBackbones } from './routeBackbone'
import { getNodePresentationBody } from './nodePresentation'
import {
  getNodeRepresentation,
} from './semanticZoom'
import { getNodeVisual, ROUTE_THEMES, isNodeInRoute, getRouteHoverColor } from './routeVisuals'
import {
  CORNER_RADIUS_RATIO,
} from './visualTokens'
import { getNodeTypographyState } from './nodeTypography'
import { getLeafUtilityPresentation } from './cardDesignSystem'
import type { DerivedNodeState } from './learningState'

type Props = {
  node: SvgNodeData
  zoom: number
  routeId: SvgRouteId
  routes: RouteMemberships
  backbones?: RouteBackbones
  derivedState?: DerivedNodeState
  isSelected: boolean
  isHovered: boolean
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
  onNodeClick?: (id: string, e: React.MouseEvent<SVGGElement>) => void
  onNodeDoubleClick?: (id: string, e: React.MouseEvent<SVGGElement>) => void
}

export const SvgNode = memo(function SvgNode({
  node,
  zoom,
  routeId,
  routes,
  backbones,
  derivedState,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  onNodeClick,
  onNodeDoubleClick,
}: Props) {
  const visualBody = getNodePresentationBody(node, zoom)
  const rep = getNodeRepresentation(node.role, zoom)
  const z = Math.max(zoom, 0.001)
  const theme = ROUTE_THEMES[routeId]

  const handleClick = (e: React.MouseEvent<SVGGElement>) => {
    e.stopPropagation()
    if (onNodeClick) {
      onNodeClick(node.id, e)
    } else {
      onSelect(node.id)
    }
  }

  const handleDoubleClick = (e: React.MouseEvent<SVGGElement>) => {
    e.stopPropagation()
    onNodeDoubleClick?.(node.id, e)
  }

  const handlePointerEnter = () => onHover(node.id)
  const handlePointerLeave = () => onHover(null)

  if (node.role === 'leaf' && rep === 'mark') {
    const starSize = 11
    const coreSize = 5
    const cx = visualBody.renderCenterX
    const cy = visualBody.renderCenterY
    const inActiveRoute =
      routeId === 'explore' ||
      (routes ? isNodeInRoute(node.id, routeId, routes, backbones) : true)

    const accentColor = inActiveRoute
      ? routeId === 'explore'
        ? '#CBD5E1'
        : theme.accent
      : '#252D32'

    const diodeColor = isHovered
      ? '#FFFFFF'
      : inActiveRoute
      ? routeId === 'explore'
        ? '#F8FAFC'
        : routeId === 'pentesting'
        ? '#FFA3B4'
        : routeId === 'grc'
        ? '#FFD085'
        : routeId === 'soc-l1'
        ? '#8AFAFF'
        : routeId === 'cloud-security'
        ? '#BAE6FD'
        : routeId === 'ai-security'
        ? '#D8B4FE'
        : '#7AFFE0'
      : '#2B343B'

    const starOpacity = inActiveRoute ? (isHovered ? 1.0 : 0.98) : 0.28
    const hitPadding = 8 / z

    return (
      <g
        className="cyber-node cyber-concept cyber-concept-mark cyber-concept-star"
        transform={`translate(${cx}, ${cy})`}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        style={{ cursor: 'pointer', pointerEvents: 'all' }}
        opacity={starOpacity}
      >
        <rect
          x={-Math.max(starSize / 2 + hitPadding, 12)}
          y={-Math.max(starSize / 2 + hitPadding, 12)}
          width={Math.max(starSize + 2 * hitPadding, 24)}
          height={Math.max(starSize + 2 * hitPadding, 24)}
          fill="rgba(0, 0, 0, 0.001)"
          pointerEvents="all"
        />

        <rect
          x={-starSize / 2}
          y={-starSize / 2}
          width={starSize}
          height={starSize}
          rx={1.5}
          ry={1.5}
          fill={
            isHovered
              ? 'rgba(255, 255, 255, 0.25)'
              : inActiveRoute
              ? routeId === 'explore'
                ? '#151C22'
                : theme.dimBg || '#16221D'
              : '#11161B'
          }
          stroke={isHovered ? (routeId === 'explore' ? '#FFFFFF' : getRouteHoverColor(routeId)) : accentColor}
          strokeWidth={inActiveRoute ? 1.2 : 0.6}
        />

        <rect
          x={-coreSize / 2}
          y={-coreSize / 2}
          width={coreSize}
          height={coreSize}
          rx={0.8}
          ry={0.8}
          fill={diodeColor}
          opacity={inActiveRoute ? 1.0 : 0.5}
        />
      </g>
    )
  }

  const visual = getNodeVisual({
    nodeId: node.id,
    role: node.role,
    routeId,
    routes,
    backbones,
    isSelected,
    isHovered,
  })

  const cardRadius = visualBody.height * CORNER_RADIUS_RATIO

  const typo = getNodeTypographyState({
    role: node.role,
    type: node.type,
    name: node.name,
    childCount: node.childCount,
    zoom,
    bodyWidth: visualBody.width,
    bodyHeight: visualBody.height,
  })

  const isLeafRole = node.role === 'leaf' || node.role === 'structural-knowledge-hub'
  if (isLeafRole) {
    const isHub = node.role === 'structural-knowledge-hub'
    const isEmerging = rep === 'emerging'
    const isMark = rep === 'mark'

    const bodyFill = visual.fill
    const bodyStroke = visual.stroke
    const bodyStrokeWidth = visual.strokeWidth
    const bodyOpacity = visual.opacity
    const cornerRadius = isEmerging ? Math.min(cardRadius, 3 / z) : cardRadius

    const hitPadding = 8 / z

    return (
      <g
        className={`cyber-node cyber-concept ${isEmerging ? 'cyber-concept-emerging' : 'cyber-concept-card'}`}
        transform={`translate(${visualBody.renderX}, ${visualBody.renderY})`}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        style={{ cursor: 'pointer', pointerEvents: 'all' }}
        opacity={bodyOpacity}
      >
        <rect
          x={-hitPadding}
          y={-hitPadding}
          width={visualBody.width + 2 * hitPadding}
          height={visualBody.height + 2 * hitPadding}
          fill="rgba(0, 0, 0, 0.001)"
          pointerEvents="all"
        />

        <rect
          width={visualBody.width}
          height={visualBody.height}
          rx={cornerRadius}
          ry={cornerRadius}
          fill={bodyFill}
          stroke={bodyStroke}
          strokeWidth={bodyStrokeWidth}
        />

        {isHub && (
          <line
            x1={4 / z}
            y1={visualBody.height * 0.18}
            x2={4 / z}
            y2={visualBody.height * 0.82}
            stroke={visual.stroke}
            strokeWidth={1.5 / z}
          />
        )}

        {typo.showRoleLabel && !isMark && (
          <text
            x={typo.roleAnchorX}
            y={typo.roleAnchorY}
            textAnchor={typo.roleTextAnchor}
            dominantBaseline="central"
            fill="#6B7A7D"
            fontSize={typo.roleFontSize}
            fontWeight={typo.roleWeight}
            letterSpacing={typo.roleLetterSpacing}
            opacity={typo.roleOpacity}
          >
            {typo.roleLabel}
          </text>
        )}

        {routeId !== 'explore' && !isMark && typo.showRoleLabel && (() => {
          const rel = derivedState?.relevance ?? 0
          if (rel <= 0) return null
          const util = getLeafUtilityPresentation(visualBody.width, visualBody.height, z)

          return (
            <g className="cyber-relevance-pads" opacity={typo.roleOpacity}>
              {[0, 1, 2, 3].map(i => {
                const isActive = i < rel
                return (
                  <rect
                    key={i}
                    x={util.padStartX + i * (util.padWorldSize + util.padGapWorld)}
                    y={util.padStartY}
                    width={util.padWorldSize}
                    height={util.padWorldSize}
                    rx={util.padRx}
                    ry={util.padRx}
                    fill={isActive ? visual.stroke : '#1A2822'}
                    fillOpacity={isActive ? 1.0 : 0.6}
                  />
                )
              })}
            </g>
          )
        })()}

        {typo.showTitle && !isMark && (
          <text
            x={typo.titleAnchorX}
            y={typo.titleAnchorY}
            textAnchor={typo.titleTextAnchor}
            dominantBaseline="central"
            fill={visual.textColor}
            fontSize={typo.titleFontSize}
            fontWeight={typo.titleWeight}
            opacity={typo.titleOpacity}
          >
            {typo.wrappedLines.length === 1 ? (
              typo.wrappedLines[0]
            ) : (
              typo.wrappedLines.map((line, idx) => (
                <tspan
                  key={idx}
                  x={typo.titleAnchorX}
                  dy={idx === 0 ? `-${(typo.wrappedLines.length - 1) * 0.55}em` : '1.12em'}
                >
                  {line}
                </tspan>
              ))
            )}
          </text>
        )}

      </g>
    )
  }

  if (node.role === 'core') {
    return (
      <g
        className="cyber-node cyber-core"
        transform={`translate(${visualBody.renderX}, ${visualBody.renderY})`}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        style={{ cursor: 'pointer', pointerEvents: 'all' }}
        opacity={visual.opacity}
      >
        <rect
          width={visualBody.width}
          height={visualBody.height}
          rx={cardRadius}
          ry={cardRadius}
          fill={visual.fill}
          stroke={visual.stroke}
          strokeWidth={visual.strokeWidth}
          pointerEvents="all"
        />

        {typo.showTitle && (
          <text
            x={typo.titleAnchorX}
            y={typo.titleAnchorY}
            textAnchor={typo.titleTextAnchor}
            dominantBaseline="central"
            fill="#FFFFFF"
            fontSize={typo.titleFontSize}
            fontWeight={typo.titleWeight}
            letterSpacing={1.2}
            opacity={typo.titleOpacity}
            pointerEvents="none"
          >
            {node.name}
          </text>
        )}
      </g>
    )
  }

  if (node.role === 'domain') {
    return (
      <g
        className="cyber-node cyber-domain"
        transform={`translate(${visualBody.renderX}, ${visualBody.renderY})`}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        style={{ cursor: 'pointer', pointerEvents: 'all' }}
        opacity={visual.opacity}
      >
        <rect
          width={visualBody.width}
          height={visualBody.height}
          rx={cardRadius}
          ry={cardRadius}
          fill={visual.fill}
          stroke={visual.stroke}
          strokeWidth={visual.strokeWidth}
          pointerEvents="all"
        />

        {typo.showTitle && (
          <text
            x={typo.titleAnchorX}
            y={typo.titleAnchorY}
            textAnchor={typo.titleTextAnchor}
            dominantBaseline="central"
            fill={visual.textColor}
            fontSize={typo.titleFontSize}
            fontWeight={typo.titleWeight}
            letterSpacing={0.5}
            opacity={typo.titleOpacity}
            pointerEvents="none"
          >
            {typo.wrappedLines.length === 1 ? (
              typo.wrappedLines[0]
            ) : (
              typo.wrappedLines.map((line, idx) => (
                <tspan
                  key={idx}
                  x={typo.titleAnchorX}
                  dy={idx === 0 ? '-0.50em' : '1.16em'}
                >
                  {line}
                </tspan>
              ))
            )}
          </text>
        )}
      </g>
    )
  }

  if (
    node.role === 'structural-container' ||
    node.role === 'structural-knowledge-hub'
  ) {
    const isHub = node.role === 'structural-knowledge-hub'
    const groupBorderWidth = Math.max(visual.strokeWidth, 1.2 / z)

    return (
      <g
        className={`cyber-node cyber-group${isHub ? ' cyber-structural-hub' : ''}`}
        transform={`translate(${visualBody.renderX}, ${visualBody.renderY})`}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        style={{ cursor: 'pointer', pointerEvents: 'all' }}
        opacity={visual.opacity}
      >
        <rect
          width={visualBody.width}
          height={visualBody.height}
          rx={cardRadius}
          ry={cardRadius}
          fill={visual.fill}
          stroke={visual.stroke}
          strokeWidth={groupBorderWidth}
          strokeDasharray={isHub ? undefined : `${6 / z} ${3.5 / z}`}
          pointerEvents="all"
        />

        {isHub && (
          <line
            x1={Math.max(6 / z, visualBody.width * 0.028)}
            y1={visualBody.height * 0.18}
            x2={Math.max(6 / z, visualBody.width * 0.028)}
            y2={visualBody.height * 0.82}
            stroke={visual.stroke}
            strokeWidth={Math.max(2 / z, visualBody.width * 0.008)}
          />
        )}

        {typo.showRoleLabel && (
          <text
            x={typo.roleAnchorX}
            y={typo.roleAnchorY}
            textAnchor={typo.roleTextAnchor}
            dominantBaseline="central"
            fill="#6B7A7D"
            fontSize={typo.roleFontSize}
            fontWeight={typo.roleWeight}
            letterSpacing={typo.roleLetterSpacing}
            opacity={typo.roleOpacity}
          >
            {isHub ? `HUB · ${typo.roleLabel}` : 'GRUPO'}
          </text>
        )}

        {typo.showTitle && (
          <text
            x={typo.titleAnchorX}
            y={typo.titleAnchorY}
            textAnchor={typo.titleTextAnchor}
            dominantBaseline="central"
            fill={visual.textColor}
            fontSize={typo.titleFontSize}
            fontWeight={typo.titleWeight}
            opacity={typo.titleOpacity}
          >
            {typo.wrappedLines.length === 1 ? (
              typo.wrappedLines[0]
            ) : (
              typo.wrappedLines.map((line, idx) => (
                <tspan
                  key={idx}
                  x={typo.titleAnchorX}
                  dy={idx === 0 ? `-${(typo.wrappedLines.length - 1) * 0.55}em` : '1.12em'}
                >
                  {line}
                </tspan>
              ))
            )}
          </text>
        )}

      </g>
    )
  }

  return null
})
