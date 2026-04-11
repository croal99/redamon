// Node colors by type - semantic color mapping
export const NODE_COLORS: Record<string, string> = {
  // CRITICAL SECURITY (Red family) - Immediate attention needed
  Vulnerability: '#ff4757',
  CVE: '#ff4757',

  // THREAT INTELLIGENCE (Orange family) - Attack context
  MitreData: '#ff6b35',
  Capec: '#ffd700',
  ThreatPulse: '#ff6b35',
  Malware: '#ff4757',

  // DOMAIN HIERARCHY (Blue family) - Recon foundation
  Domain: '#0040aa',
  Subdomain: '#0a84ff',

  // NETWORK LAYER (Cyan/Teal family) - Infrastructure
  IP: '#00d4ff',
  Port: '#00d4ff',
  Service: '#00d4ff',
  Traceroute: '#0040aa',

  // WEB APPLICATION LAYER (Purple family) - Web-specific assets
  BaseURL: '#7c3aed',
  Endpoint: '#0a84ff',
  Parameter: '#7c3aed',
  Secret: '#ff4757',

  // EXPLOITATION RESULTS - Confirmed compromises
  ExploitGvm: '#ff6b35',

  // CONTEXT & METADATA (Neutral family) - Supporting information
  Technology: '#00ff88',
  Certificate: '#ffd700',
  Header: '#64748b',

  // GITHUB INTELLIGENCE (Gray family for hierarchy, distinct muted colors for leaf nodes)
  GithubHunt: '#64748b',
  GithubRepository: '#64748b',
  GithubPath: '#94a3b8',
  GithubSecret: '#7c3aed',
  GithubSensitiveFile: '#00ff88',

  // TRUFFLEHOG INTELLIGENCE (Teal-gray family - distinct from GitHub Hunt)
  TrufflehogScan: '#1a2235',
  TrufflehogRepository: '#64748b',
  TrufflehogFinding: '#ff6b35',

  // JS RECON SCANNER (Fuchsia - distinct from all other node families)
  JsReconFinding: '#7c3aed',

  // EXTERNAL / OUT-OF-SCOPE (informational, not a target)
  ExternalDomain: '#64748b',

  // ATTACK CHAIN (Amber family) — Agent execution history
  AttackChain: '#ff6b35',
  ChainStep: '#ff6b35',
  ChainFinding: '#ff6b35',
  ChainDecision: '#ff6b35',
  ChainFailure: '#ff6b35',

  Default: '#64748b',
}

// Severity-based colors for Vulnerability nodes (pure red tonality)
export const SEVERITY_COLORS_VULN: Record<string, string> = {
  critical: '#ff4757',
  high: '#ff4757',
  medium: '#ff4757',
  low: '#ff4757',
  info: '#ff4757',
  unknown: '#64748b',
}

// Severity-based colors for CVE nodes (red-purple/magenta tonality)
export const SEVERITY_COLORS_CVE: Record<string, string> = {
  critical: '#ff4757',
  high: '#ff4757',
  medium: '#ff4757',
  low: '#ff4757',
  info: '#ff4757',
  unknown: '#ff4757',
}

// Link colors
export const LINK_COLORS = {
  default: '#64748b',
  highlighted: '#00d4ff',
  particle: '#0a84ff',
  chainParticle: '#ff6b35',
  chainLink: '#1a2235',
} as const

// Selection colors
export const SELECTION_COLORS = {
  ring: '#00ff88',
} as const

// Attack chain session colors
export const CHAIN_SESSION_COLORS = {
  inactive: '#64748b',
  inactiveSelected: '#ff6b35',
  inactiveFinding: '#1a2235',
  activeRing: '#ffd700',
} as const

// Goal/outcome finding types — these represent achieved attack objectives
export const GOAL_FINDING_TYPES = new Set([
  'exploit_success',
  'access_gained',
  'privilege_escalation',
  'credential_found',
  'data_exfiltration',
  'lateral_movement',
  'persistence_established',
  'denial_of_service_success',
  'social_engineering_success',
  'remote_code_execution',
  'session_hijacked',
])

// Colors for goal ChainFinding diamonds
export const GOAL_FINDING_COLORS = {
  active: '#00ff88',
  inactive: '#00b36a',
} as const

// Background colors by theme
export const BACKGROUND_COLORS = {
  dark: {
    graph: '#0a0e1a',
    label: '#e2e8f0',
  },
  light: {
    graph: '#ffffff',
    label: '#3f3f46', // gray-700
  },
} as const
