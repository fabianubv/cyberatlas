import type { SvgRole, SvgRouteId, RouteMemberships } from './types'
import type { RouteBackbones } from './routeBackbone'
import {
  EXPLORE_COLORS,
  ROUTE_PALETTES,
  BORDER_WIDTHS,
  UNPOWERED_CIRCUIT_COLORS,
} from './visualTokens'

export type RouteTheme = {
  id: SvgRouteId
  name: string
  accent: string
  dimBg: string
  connectorStroke: string
  description: string
}

export const ROUTE_THEMES: Record<SvgRouteId, RouteTheme> = {
  explore: {
    id: 'explore',
    name: ROUTE_PALETTES.explore.name,
    accent: ROUTE_PALETTES.explore.accent,
    dimBg: ROUTE_PALETTES.explore.bg,
    connectorStroke: ROUTE_PALETTES.explore.connector,
    description: ROUTE_PALETTES.explore.description,
  },
  base: {
    id: 'base',
    name: ROUTE_PALETTES.base.name,
    accent: ROUTE_PALETTES.base.accent,
    dimBg: ROUTE_PALETTES.base.bg,
    connectorStroke: ROUTE_PALETTES.base.connector,
    description: ROUTE_PALETTES.base.description,
  },
  'soc-l1': {
    id: 'soc-l1',
    name: ROUTE_PALETTES['soc-l1'].name,
    accent: ROUTE_PALETTES['soc-l1'].accent,
    dimBg: ROUTE_PALETTES['soc-l1'].bg,
    connectorStroke: ROUTE_PALETTES['soc-l1'].connector,
    description: ROUTE_PALETTES['soc-l1'].description,
  },
  pentesting: {
    id: 'pentesting',
    name: ROUTE_PALETTES.pentesting.name,
    accent: ROUTE_PALETTES.pentesting.accent,
    dimBg: ROUTE_PALETTES.pentesting.bg,
    connectorStroke: ROUTE_PALETTES.pentesting.connector,
    description: ROUTE_PALETTES.pentesting.description,
  },
  grc: {
    id: 'grc',
    name: ROUTE_PALETTES.grc.name,
    accent: ROUTE_PALETTES.grc.accent,
    dimBg: ROUTE_PALETTES.grc.bg,
    connectorStroke: ROUTE_PALETTES.grc.connector,
    description: ROUTE_PALETTES.grc.description,
  },
  'cloud-security': {
    id: 'cloud-security',
    name: ROUTE_PALETTES['cloud-security'].name,
    accent: ROUTE_PALETTES['cloud-security'].accent,
    dimBg: ROUTE_PALETTES['cloud-security'].bg,
    connectorStroke: ROUTE_PALETTES['cloud-security'].connector,
    description: ROUTE_PALETTES['cloud-security'].description,
  },
  'ai-security': {
    id: 'ai-security',
    name: ROUTE_PALETTES['ai-security'].name,
    accent: ROUTE_PALETTES['ai-security'].accent,
    dimBg: ROUTE_PALETTES['ai-security'].bg,
    connectorStroke: ROUTE_PALETTES['ai-security'].connector,
    description: ROUTE_PALETTES['ai-security'].description,
  },
}

/** Selection color: white in Explore, the route accent otherwise. */
export function getRouteInteractionColor(routeId: SvgRouteId): string {
  if (routeId === 'explore') return '#FFFFFF'
  return ROUTE_THEMES[routeId].accent
}

/** Hover color: a lighter version of the route accent, white in Explore. */
export function getRouteHoverColor(routeId: SvgRouteId): string {
  switch (routeId) {
    case 'explore':
      return '#FFFFFF'
    case 'base':
      return '#7AFFE0'
    case 'soc-l1':
      return '#8AFAFF'
    case 'pentesting':
      return '#FFA3B4'
    case 'grc':
      return '#FFD085'
    case 'cloud-security':
      return '#BAE6FD'
    case 'ai-security':
      return '#D8B4FE'
    default:
      return '#FFFFFF'
  }
}

export function isNodeInRoute(
  nodeId: string,
  routeId: SvgRouteId,
  routes: RouteMemberships,
  backbones?: RouteBackbones,
): boolean {
  if (routeId === 'explore') return true
  if (backbones && backbones[routeId]) {
    return backbones[routeId].activeNodes.has(nodeId)
  }
  if (routeId === 'base') return routes.base.has(nodeId)
  if (routeId === 'soc-l1') return routes.soc.has(nodeId)
  if (routeId === 'pentesting') return routes.pentesting.has(nodeId)
  if (routeId === 'grc') return routes.grc.has(nodeId)
  if (routeId === 'cloud-security') return routes.cloud.has(nodeId)
  if (routeId === 'ai-security') return routes.ai.has(nodeId)
  return true
}

export type SvgNodeVisual = {
  fill: string
  stroke: string
  strokeWidth: number
  opacity: number
  textColor: string
  accentColor: string
}

export function getNodeVisual({
  nodeId,
  role,
  routeId,
  routes,
  backbones,
  isSelected,
  isHovered,
}: {
  nodeId: string
  role: SvgRole
  routeId: SvgRouteId
  routes: RouteMemberships
  backbones?: RouteBackbones
  isSelected?: boolean
  isHovered?: boolean
}): SvgNodeVisual {
  const inRoute = isNodeInRoute(nodeId, routeId, routes, backbones)
  const isOrganizing = role === 'core' || role === 'domain'
  const isGroup =
    role === 'structural-container' || role === 'structural-knowledge-hub'
  const theme = ROUTE_THEMES[routeId]
  const interactionColor = getRouteInteractionColor(routeId)

  let opacity = 1.0
  if (routeId !== 'explore' && !inRoute) {
    if (isOrganizing) {
      opacity = 0.95
    } else if (isGroup) {
      opacity = 0.65
    } else {
      opacity = UNPOWERED_CIRCUIT_COLORS.cardOpacity
    }
  } else if (routeId === 'explore') {
    if (isGroup) {
      opacity = 0.90
    }
  }

  let fill: string
  let stroke: string
  let strokeWidth = BORDER_WIDTHS[role] || 1.0
  let textColor: string

  if (role === 'core') {
    fill = EXPLORE_COLORS.coreBg
    stroke = isSelected
      ? interactionColor
      : inRoute && routeId !== 'explore'
      ? theme.accent
      : EXPLORE_COLORS.coreBorder
    strokeWidth = inRoute && routeId !== 'explore' ? 2.0 : BORDER_WIDTHS.core || 1.5
    textColor = '#FFFFFF'
  } else if (role === 'domain') {
    fill = EXPLORE_COLORS.domainBg
    stroke = isSelected
      ? interactionColor
      : inRoute && routeId !== 'explore'
      ? theme.accent
      : EXPLORE_COLORS.domainBorder
    strokeWidth = inRoute && routeId !== 'explore' ? 1.8 : BORDER_WIDTHS.domain || 1.2
    textColor = EXPLORE_COLORS.textPrimary
  } else if (isGroup) {
    fill = role === 'structural-knowledge-hub' ? '#151C21' : EXPLORE_COLORS.groupBg
    stroke = isSelected
      ? interactionColor
      : inRoute && routeId !== 'explore'
      ? theme.accent
      : role === 'structural-knowledge-hub'
      ? '#6B7A7D'
      : EXPLORE_COLORS.groupBorder
    strokeWidth = inRoute && routeId !== 'explore' ? 1.4 : BORDER_WIDTHS['structural-container'] || 1.0
    textColor = role === 'structural-knowledge-hub' ? EXPLORE_COLORS.textPrimary : EXPLORE_COLORS.textSecondary
  } else {
    const isOff = !inRoute && routeId !== 'explore'
    fill = isOff ? UNPOWERED_CIRCUIT_COLORS.cardFill : EXPLORE_COLORS.cardBg
    stroke = isSelected ? interactionColor : (isOff ? UNPOWERED_CIRCUIT_COLORS.cardBorder : EXPLORE_COLORS.cardBorder)
    textColor = isOff ? EXPLORE_COLORS.textMuted : EXPLORE_COLORS.textPrimary
  }

  if (inRoute && routeId !== 'explore') {
    if (!isOrganizing && !isGroup) {
      fill = theme.dimBg
      stroke = theme.accent
      strokeWidth = 1.5
      textColor = '#FFFFFF'
    }
  }

  if (isHovered) {
    const hoverColor = getRouteHoverColor(routeId)
    stroke = hoverColor
    strokeWidth = (BORDER_WIDTHS[role] || 1.0) + 0.3
    if (!inRoute && routeId !== 'explore') {
      opacity = 0.85
    } else {
      opacity = 1.0
    }
  }

  if (isSelected) {
    stroke = interactionColor
    strokeWidth = (BORDER_WIDTHS[role] || 1.0) + 0.5
    opacity = 1.0
  }

  return {
    fill,
    stroke,
    strokeWidth,
    opacity,
    textColor,
    accentColor: theme.accent,
  }
}
