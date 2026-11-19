import type { UserLearningState } from './learningState'

export const DEMO_LEARNING_STATE: UserLearningState = {
  masteryByNodeId: {
    // Identity & Access
    'active-directory': 'use',
    authentication: 'analyze',
    authorization: 'explain',
    kerberos: 'recognize',

    // Computing
    cpu: 'analyze',
    ram: 'use',
    binary: 'explain',
    hardware: 'recognize',

    // Operating Systems
    'linux-basics': 'analyze',
    'process-management': 'use',
    'file-permissions': 'explain',

    // Networking
    'ip-addressing': 'analyze',
    'tcp-udp': 'use',
    'dns-basics': 'explain',
    'ports-services': 'recognize',

    // Security Foundations
    confidentiality: 'analyze',
    integrity: 'analyze',
    availability: 'use',
    'cia-triad': 'analyze',

    // Web
    'http-basics': 'use',
    'tls-ssl': 'explain',
    'cookies-sessions': 'recognize',

    // GRC
    'risk-assessment': 'explain',
    'compliance-frameworks': 'recognize',
  },
}
