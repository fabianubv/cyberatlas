/** Design tokens for the map: corner radius, borders and palettes. */

import type { SvgRole, SvgRouteId } from './types'

/** Corner radius as a fraction of card height. */
export const CORNER_RADIUS_RATIO = 10 / 104

/** Border widths in screen pixels */
export const BORDER_WIDTHS: Record<SvgRole, number> = {
  core: 2.0,
  domain: 1.6,
  'structural-container': 1.2,
  'structural-knowledge-hub': 1.0,
  leaf: 1.0,
}

/** Explore palette: neutral blacks and graphite, with no green cast. */
export const EXPLORE_COLORS = {
  coreBlack: '#0B0F0E',
  cardBg: '#15191D',
  cardBorder: '#3A4249',
  groupBg: '#13191C',
  groupBorder: '#627278',
  domainBg: '#181D22',
  domainBorder: '#4B555E',
  domainRail: '#70827F',
  coreBg: '#111619',
  coreBorder: '#6B7471',
  connectorStroke: '#3A4249',
  connectorHighway: '#E2E8F0',
  connectorBus: '#94A3B8',
  connectorHairline: '#4A5568',
  handleColor: '#77807D',
  farMarkFill: '#707E7A',
  farMarkStroke: '#3A4441',
  textPrimary: '#EDF2F0',
  textSecondary: '#CAD5D1',
  textMuted: '#929CA5',
  accent: '#FFFFFF',
} as const

export type RoutePalette = {
  accent: string
  bg: string
  border: string
  connector: string
  name: string
  description: string
}

/** Route color themes. */
export const ROUTE_PALETTES: Record<SvgRouteId, RoutePalette> = {
  explore: {
    name: 'Explorar',
    accent: '#FFFFFF',
    bg: EXPLORE_COLORS.cardBg,
    border: EXPLORE_COLORS.cardBorder,
    connector: EXPLORE_COLORS.connectorStroke,
    description: 'Vista completa del universo de ciberseguridad.',
  },
  base: {
    name: 'Base',
    accent: '#00FF9C',
    bg: '#0F261C',
    border: '#1A4D37',
    connector: '#1A4D37',
    description: 'Conocimientos comunes presentes en todas las rutas.',
  },
  'soc-l1': {
    name: 'SOC L1',
    accent: '#00F0FF',
    bg: '#0E1D24',
    border: '#1D3B47',
    connector: '#1D3B47',
    description: 'Fundamentos para analista de operaciones y SOC L1.',
  },
  pentesting: {
    name: 'Pentesting',
    accent: '#FF3B5C',
    bg: '#241217',
    border: '#471C26',
    connector: '#471C26',
    description: 'Capacidades ofensivas y evaluación de vulnerabilidades.',
  },
  grc: {
    name: 'GRC',
    accent: '#F59E0B',
    bg: '#261C0E',
    border: '#4D3818',
    connector: '#4D3818',
    description: 'Gobernanza, gestión de riesgos y cumplimiento normativo.',
  },
  'cloud-security': {
    name: 'Cloud Security',
    accent: '#38BDF8',
    bg: '#0C2836',
    border: '#154860',
    connector: '#154860',
    description: 'Fundamentos, arquitectura y controles de seguridad en la nube.',
  },
  'ai-security': {
    name: 'AI Security',
    accent: '#A855F7',
    bg: '#1D1328',
    border: '#3E2458',
    connector: '#3E2458',
    description: 'Seguridad en modelos, agentes, inferencia y gobernanza de inteligencia artificial.',
  },
}

/** Off-route parts stay visible as powered-off hardware, so the topology never looks broken. */
export const UNPOWERED_CIRCUIT_COLORS = {
  connectorStroke: '#28332F',
  connectorOpacity: 0.55,
  farMarkFill: '#34423E',
  farMarkStroke: '#4C5E58',
  farMarkOpacity: 0.85,
  cardFill: '#15191D',
  cardBorder: '#2F3835',
  cardOpacity: 0.45,
} as const

