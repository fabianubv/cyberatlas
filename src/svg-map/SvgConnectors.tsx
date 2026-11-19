import { memo } from 'react'
import type {
  SvgRouteId,
  BusJunction,
  NodeTerminal,
  SvgDynamicConnector,
  SvgPhysicalSegment,
  RouteMemberships,
} from './types'
import type { RouteBackbones } from './routeBackbone'
import { ROUTE_THEMES, isNodeInRoute } from './routeVisuals'
import { isEdgeInActiveBackbone } from './routeBackbone'
import { shouldShowBusJunctions, shouldShowNodeTerminal } from './semanticZoom'
import { EXPLORE_COLORS, UNPOWERED_CIRCUIT_COLORS } from './visualTokens'

const DOMAIN_IDS = new Set([
  'computing',
  'operating-systems',
  'networking',
  'web',
  'programming',
  'security-foundations',
  'identity-access',
  'data-analysis',
  'grc-domain',
])

type Props = {
  paths: string[]
  connectors?: SvgDynamicConnector[]
  segments?: SvgPhysicalSegment[]
  routes?: RouteMemberships
  backbones?: RouteBackbones
  busJunctions?: BusJunction[]
  terminals?: NodeTerminal[]
  routeId: SvgRouteId
  zoom: number
}

export const SvgConnectors = memo(function SvgConnectors({
  paths,
  connectors,
  segments,
  routes,
  backbones,
  busJunctions,
  terminals,
  routeId,
  zoom,
}: Props) {
  const theme = ROUTE_THEMES[routeId]
  const z = Math.max(zoom, 0.001)

  const baseStrokeWidth = Math.max(1.0, 1.4 / Math.max(z, 0.05))
  const showJunctions = shouldShowBusJunctions(z)

  return (
    <g className="cyber-connectors" pointerEvents="none">
      {segments && segments.length > 0
        ? segments.map((seg, index) => {
            const inActiveRoute =
              routeId !== 'explore' &&
              (backbones
                ? seg.ownerEdges.some(e => isEdgeInActiveBackbone(e.sourceId, e.targetId, routeId, backbones))
                : (routes ? seg.ownerEdges.some(e => isNodeInRoute(e.targetId, routeId, routes) && (isNodeInRoute(e.sourceId, routeId, routes) || e.sourceId === 'cybersecurity')) : true))

            const isCoreToDomain = seg.ownerEdges.some(e => e.sourceId === 'cybersecurity')
            const isDomainToGroup =
              !isCoreToDomain && seg.ownerEdges.some(e => DOMAIN_IDS.has(e.sourceId))
            const isGroupToLeaf = !isCoreToDomain && !isDomainToGroup

            let width: number
            let stroke: string
            let strokeOpacity: number

            if (isCoreToDomain) {
              // Tier 1: core to domain
              width = baseStrokeWidth * 2.0
              stroke = inActiveRoute ? theme.accent : EXPLORE_COLORS.connectorHighway
              strokeOpacity = inActiveRoute ? 0.98 : 0.95
            } else if (isDomainToGroup) {
              // Tier 2: domain to group
              width = baseStrokeWidth * 1.15
              stroke = inActiveRoute ? theme.accent : EXPLORE_COLORS.connectorBus
              strokeOpacity = inActiveRoute ? 0.92 : 0.78
            } else {
              // Tier 3: group to concept
              width = Math.max(0.6, baseStrokeWidth * 0.20)
              stroke = inActiveRoute ? theme.accent : EXPLORE_COLORS.connectorHairline
              strokeOpacity = inActiveRoute ? 0.60 : 0.40
            }

            if (routeId !== 'explore' && !inActiveRoute) {
              stroke = UNPOWERED_CIRCUIT_COLORS.connectorStroke
              strokeOpacity = isGroupToLeaf ? 0.15 : 0.35
            }

            return (
              <path
                key={seg.id || index}
                d={seg.path}
                stroke={stroke}
                strokeOpacity={strokeOpacity}
                strokeWidth={width}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            )
          })
        : connectors && connectors.length > 0
        ? connectors.map((c, index) => {
            const inActiveRoute =
              routeId !== 'explore' &&
              (backbones
                ? isEdgeInActiveBackbone(c.sourceId, c.targetId, routeId, backbones)
                : (routes ? isNodeInRoute(c.targetId, routeId, routes) && (isNodeInRoute(c.sourceId, routeId, routes) || c.sourceId === 'cybersecurity') : true))

            const isCoreToDomain = c.sourceId === 'cybersecurity'
            const isDomainToGroup = !isCoreToDomain && DOMAIN_IDS.has(c.sourceId)
            const isGroupToLeaf = !isCoreToDomain && !isDomainToGroup

            let width: number
            let stroke: string
            let strokeOpacity: number

            if (isCoreToDomain) {
              width = baseStrokeWidth * 2.0
              stroke = inActiveRoute ? theme.accent : EXPLORE_COLORS.connectorHighway
              strokeOpacity = inActiveRoute ? 0.98 : 0.95
            } else if (isDomainToGroup) {
              width = baseStrokeWidth * 1.15
              stroke = inActiveRoute ? theme.accent : EXPLORE_COLORS.connectorBus
              strokeOpacity = inActiveRoute ? 0.92 : 0.78
            } else {
              width = Math.max(0.6, baseStrokeWidth * 0.20)
              stroke = inActiveRoute ? theme.accent : EXPLORE_COLORS.connectorHairline
              strokeOpacity = inActiveRoute ? 0.60 : 0.40
            }

            if (routeId !== 'explore' && !inActiveRoute) {
              stroke = UNPOWERED_CIRCUIT_COLORS.connectorStroke
              strokeOpacity = isGroupToLeaf ? 0.15 : 0.35
            }

            return (
              <path
                key={index}
                d={c.path}
                stroke={stroke}
                strokeOpacity={strokeOpacity}
                strokeWidth={width}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            )
          })
        : paths.map((d, index) => (
            <path
              key={index}
              d={d}
              stroke={theme.connectorStroke}
              strokeWidth={baseStrokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}

      {showJunctions &&
        busJunctions?.map((j, index) => {
          const r = 1.3 / z
          let fill = '#8C9DA8'
          let stroke = '#1A202C'
          let opacity = 0.75

          if (routeId !== 'explore') {
            const isJunctionActive =
              j.ownerEdges && backbones
                ? j.ownerEdges.some(edge => backbones[routeId]?.activeEdges.has(edge))
                : false

            if (isJunctionActive) {
              fill = theme.accent
              stroke = '#0B0F0E'
              opacity = 0.90
            } else {
              fill = UNPOWERED_CIRCUIT_COLORS.connectorStroke
              stroke = '#15191D'
              opacity = 0.48
            }
          }

          return (
            <circle
              key={`bj-${index}`}
              cx={j.x}
              cy={j.y}
              r={r}
              fill={fill}
              stroke={stroke}
              strokeWidth={0.4 / z}
              opacity={opacity}
            />
          )
        })}

      {terminals?.map((t, index) => {
        if (!shouldShowNodeTerminal(t.role, z)) return null
        const size = 5 / z
        const isTermInRoute =
          routeId === 'explore' ||
          (routes ? isNodeInRoute(t.nodeId, routeId, routes) : true)

        const termFill = isTermInRoute
          ? routeId === 'explore'
            ? '#15191D'
            : theme.dimBg
          : UNPOWERED_CIRCUIT_COLORS.cardFill

        const termStroke = isTermInRoute
          ? routeId === 'explore'
            ? EXPLORE_COLORS.connectorBus
            : theme.accent
          : UNPOWERED_CIRCUIT_COLORS.connectorStroke

        const termOpacity = isTermInRoute
          ? 1.0
          : UNPOWERED_CIRCUIT_COLORS.connectorOpacity

        return (
          <rect
            key={`t-${index}`}
            x={t.x - size / 2}
            y={t.y - size / 2}
            width={size}
            height={size}
            rx={0.8 / z}
            fill={termFill}
            stroke={termStroke}
            strokeWidth={1 / z}
            opacity={termOpacity}
          />
        )
      })}
    </g>
  )
})
