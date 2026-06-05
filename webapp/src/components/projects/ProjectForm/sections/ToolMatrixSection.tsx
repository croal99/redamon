'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, Grid3X3, AlertTriangle, Eye, EyeOff, Loader2, Server } from 'lucide-react'
import type { Project } from '@prisma/client'
import { useProject } from '@/providers/ProjectProvider'
import { Modal } from '@/components/ui/Modal/Modal'
import styles from '../ProjectForm.module.css'

const ALL_PHASES = ['informational', 'exploitation', 'post_exploitation'] as const

interface ManifestToolSpec {
  name: string
  default_phases?: string[] | null
}

interface ManifestServer {
  id: string
  name: string
  description: string
  enabled: boolean
  default_phases: string[]
  tags?: string[]
  tools: ManifestToolSpec[]
}

interface ManifestPayload {
  servers?: ManifestServer[]
  errors?: { server_id: string; code: string; message: string }[]
  warnings?: { server_id: string; code: string; message: string }[]
  system_server_ids?: string[]
}

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

/** Tool → settings field name + human label + signup URL */
const TOOL_KEY_INFO: Record<string, { field: string; label: string; hint: string; url: string }> = {
  tradecraft_lookup: {
    field: '_tradecraft_resources',  // sentinel: not an API key field
    label: '战术资源',
    hint: '在“全局设置 → 战术资源”中配置知识站点 URL。智能体只会看到已启用的资源。',
    url: '/settings?tab=tradecraft',
  },
  web_search: {
    field: 'tavilyApiKey',
    label: 'Tavily',
    hint: '启用 web_search 工具，用于 CVE 研究与漏洞利用检索',
    url: 'https://app.tavily.com/home',
  },
  shodan: {
    field: 'shodanApiKey',
    label: 'Shodan',
    hint: '启用 shodan 工具，用于全网 OSINT（搜索、主机信息、DNS、数量统计）',
    url: 'https://account.shodan.io/',
  },
  google_dork: {
    field: 'serpApiKey',
    label: 'SerpAPI',
    hint: '启用 google_dork 工具进行 Google dork OSINT（site:, inurl:, filetype:）',
    url: 'https://serpapi.com/manage-api-key',
  },
  execute_wpscan: {
    field: 'wpscanApiToken',
    label: 'WPScan',
    hint: '使用 WPScan 数据库的漏洞数据增强 execute_wpscan 结果（免费：每天 25 次请求）',
    url: 'https://wpscan.com/register',
  },
  execute_gau: {
    field: 'urlscanApiKey',
    label: 'URLScan',
    hint: '使用 URLScan 的归档数据增强 execute_gau 结果（有免费额度）',
    url: 'https://urlscan.io/user/signup',
  },
  cve_intel: {
    field: 'pdcpApiKey',
    label: 'PDCP',
    hint: '可选。用于提升 ProjectDiscovery CVE 数据库（vulnx）的匿名限速（10 次/分钟）。',
    url: 'https://cloud.projectdiscovery.io',
  },
}

interface ToolMatrixSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
}

export function ToolMatrixSection({ data, updateField }: ToolMatrixSectionProps) {
  const [isOpen, setIsOpen] = useState(true)
  const { userId } = useProject()
  const [missingKeys, setMissingKeys] = useState<Set<string>>(new Set())
  const [userMcpServers, setUserMcpServers] = useState<ManifestServer[]>([])

  // Source the user MCP list from the DATABASE (the user's saved
  // configuration), not from the agent's runtime manifest. The DB is the
  // source of truth — the agent's registry is downstream and may lag
  // until a chat session triggers a settings reload (e.g., right after
  // an agent restart). Reading from the DB means the matrix always
  // reflects what the user has saved, regardless of agent state.
  useEffect(() => {
    if (!userId) return
    fetch(`/api/users/${userId}/mcp`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { servers?: ManifestServer[] } | null) => {
        if (d?.servers && Array.isArray(d.servers)) {
          setUserMcpServers(d.servers)
        }
      })
      .catch(() => {/* graceful: matrix still works with built-ins */})
  }, [userId])

  // API key modal state
  const [keyModal, setKeyModal] = useState<string | null>(null) // tool id or null
  const [keyValue, setKeyValue] = useState('')
  const [keyVisible, setKeyVisible] = useState(false)
  const [keySaving, setKeySaving] = useState(false)

  // Fetch API key status from global settings
  const fetchKeyStatus = useCallback(() => {
    if (!userId) return
    fetch(`/api/users/${userId}/settings`)
      .then(r => r.ok ? r.json() : null)
      .then(settings => {
        if (!settings) return
        const missing = new Set<string>()
        if (!settings.tavilyApiKey) missing.add('web_search')
        if (!settings.shodanApiKey) missing.add('shodan')
        if (!settings.serpApiKey) missing.add('google_dork')
        if (!settings.wpscanApiToken) missing.add('execute_wpscan')
        if (!settings.urlscanApiKey) missing.add('execute_gau')
        if (!settings.pdcpApiKey) missing.add('cve_intel')
        // tradecraft_lookup: warn when zero enabled resources are configured
        fetch(`/api/users/${userId}/tradecraft-resources`)
          .then(r2 => r2.ok ? r2.json() : [])
          .then((arr: Array<{ enabled?: boolean }>) => {
            const enabledCount = (arr || []).filter(r => r.enabled !== false).length
            const next = new Set(missing)
            if (enabledCount === 0) next.add('tradecraft_lookup')
            setMissingKeys(next)
          })
          .catch(() => setMissingKeys(missing))
      })
      .catch(() => {})
  }, [userId])

  useEffect(() => { fetchKeyStatus() }, [fetchKeyStatus])

  const openKeyModal = (toolId: string) => {
    // Special-case: tradecraft_lookup has no API key. Redirect to the Tradecraft tab.
    if (toolId === 'tradecraft_lookup') {
      window.location.href = '/settings?tab=tradecraft'
      return
    }
    setKeyModal(toolId)
    setKeyValue('')
    setKeyVisible(false)
  }

  const closeKeyModal = () => {
    setKeyModal(null)
    setKeyValue('')
    setKeyVisible(false)
  }

  const saveApiKey = async () => {
    if (!userId || !keyModal || !keyValue.trim()) return
    const info = TOOL_KEY_INFO[keyModal]
    if (!info) return
    setKeySaving(true)
    try {
      const resp = await fetch(`/api/users/${userId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [info.field]: keyValue.trim() }),
      })
      if (resp.ok) {
        closeKeyModal()
        fetchKeyStatus()
      }
    } catch {
      // silent
    } finally {
      setKeySaving(false)
    }
  }

  const modalInfo = keyModal ? TOOL_KEY_INFO[keyModal] : null

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Grid3X3 size={16} />
          工具阶段限制
        </h2>
        <ChevronDown
          size={16}
          className={`${styles.sectionIcon} ${isOpen ? styles.sectionIconOpen : ''}`}
        />
      </div>

      {isOpen && (
        <div className={styles.sectionContent}>
          <p className={styles.sectionDescription}>
            控制智能体在各阶段可使用的工具。勾选每个工具允许使用的阶段。
          </p>
          <div className={styles.toolPhaseGrid}>
            <div className={styles.toolPhaseHeader}>
              <span className={styles.toolPhaseHeaderLabel}>工具</span>
              <span className={styles.toolPhaseHeaderLabel}>信息收集</span>
              <span className={styles.toolPhaseHeaderLabel}>漏洞利用</span>
              <span className={styles.toolPhaseHeaderLabel}>后渗透</span>
            </div>
            {[
              { id: 'query_graph', label: 'query_graph' },
              { id: 'web_search', label: 'web_search' },
              { id: 'cve_intel', label: 'cve_intel' },
              { id: 'shodan', label: 'shodan' },
              { id: 'google_dork', label: 'google_dork' },
              { id: 'execute_curl', label: 'execute_curl' },
              { id: 'execute_naabu', label: 'execute_naabu' },
              { id: 'execute_httpx', label: 'execute_httpx' },
              { id: 'execute_subfinder', label: 'execute_subfinder' },
              { id: 'execute_gau', label: 'execute_gau' },
              { id: 'execute_nmap', label: 'execute_nmap' },
              { id: 'execute_nuclei', label: 'execute_nuclei' },
              { id: 'execute_wpscan', label: 'execute_wpscan' },
              { id: 'execute_jsluice', label: 'execute_jsluice' },
              { id: 'execute_amass', label: 'execute_amass' },
              { id: 'execute_katana', label: 'execute_katana' },
              { id: 'execute_arjun', label: 'execute_arjun' },
              { id: 'execute_ffuf', label: 'execute_ffuf' },
              { id: 'kali_shell', label: 'kali_shell' },
              { id: 'execute_code', label: 'execute_code' },
              { id: 'execute_playwright', label: 'execute_playwright' },
              { id: 'execute_hydra', label: 'execute_hydra' },
              { id: 'metasploit_console', label: 'metasploit_console' },
              { id: 'msf_restart', label: 'msf_restart' },
              { id: 'tradecraft_lookup', label: 'tradecraft_lookup' },
            ].map(tool => {
              const phaseMap = (typeof data.agentToolPhaseMap === 'string'
                ? JSON.parse(data.agentToolPhaseMap)
                : data.agentToolPhaseMap ?? {}) as Record<string, string[]>
              const toolPhases = phaseMap[tool.id] || []

              const togglePhase = (phase: string) => {
                const newMap = { ...phaseMap }
                const current = newMap[tool.id] || []
                if (current.includes(phase)) {
                  newMap[tool.id] = current.filter((p: string) => p !== phase)
                } else {
                  newMap[tool.id] = [...current, phase]
                }
                updateField('agentToolPhaseMap', newMap as typeof data.agentToolPhaseMap)
              }

              const needsKey = missingKeys.has(tool.id) && toolPhases.length > 0
              const keyInfo = TOOL_KEY_INFO[tool.id]

              return (
                <div key={tool.id} className={styles.toolPhaseRow}>
                  <span className={styles.toolPhaseName}>
                    {tool.label}
                    {needsKey && keyInfo && (
                      <span
                        className={styles.apiKeyMissing}
                        title={`设置 ${keyInfo.label} API 密钥`}
                        onClick={(e) => { e.stopPropagation(); openKeyModal(tool.id) }}
                        role="button"
                        tabIndex={0}
                      >
                        <AlertTriangle size={12} />
                        缺少 {keyInfo.label} 密钥 — 点击添加
                      </span>
                    )}
                  </span>
                  {['informational', 'exploitation', 'post_exploitation'].map(phase => (
                    <label key={phase} className={styles.phaseCheck}>
                      <input
                        type="checkbox"
                        checked={toolPhases.includes(phase)}
                        onChange={() => togglePhase(phase)}
                      />
                    </label>
                  ))}
                </div>
              )
            })}
          </div>

          <div style={{ marginTop: 'var(--space-4)' }}>
            <h3 style={{
              fontSize: 'var(--text-md)',
              fontWeight: 600,
              margin: '0 0 var(--space-2) 0',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              color: 'var(--text-primary)',
              borderTop: '1px solid var(--border-default)',
              paddingTop: 'var(--space-3)',
            }}>
              <Server size={14} />
              MCP 工具插件
            </h3>
            <p className={styles.sectionDescription} style={{ marginTop: 0 }}>
              用户安装的 MCP 工具插件 — 可在{' '}
              <a href="/settings?tab=mcp" style={{ color: 'var(--accent-primary)' }}>
                全局设置 → MCP 工具插件
              </a>。
            </p>
          </div>

          {userMcpServers.length === 0 ? (
            <p className={styles.sectionDescription} style={{
              fontStyle: 'italic',
              color: 'var(--text-tertiary)',
              padding: 'var(--space-2) 0',
            }}>
              当前用户尚未配置 MCP 工具插件。
            </p>
          ) : (
            <div>
              {userMcpServers.map(srv => (
                <details key={srv.id} open style={{ marginBottom: 'var(--space-3)' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 600, padding: '4px 0' }}>
                    {srv.name || srv.id}
                    {srv.description && <span style={{ fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 8, fontSize: '12px' }}>— {srv.description}</span>}
                    {!srv.enabled && <span style={{ color: 'var(--text-tertiary)', marginLeft: 8, fontSize: '12px' }}>(已禁用)</span>}
                  </summary>
                  <div className={styles.toolPhaseGrid}>
                    {srv.tools.map(tool => {
                      const phaseMap = (typeof data.agentToolPhaseMap === 'string'
                        ? JSON.parse(data.agentToolPhaseMap)
                        : data.agentToolPhaseMap ?? {}) as Record<string, string[]>
                      const defaultPhases = (tool.default_phases && tool.default_phases.length > 0)
                        ? tool.default_phases
                        : (srv.default_phases && srv.default_phases.length > 0
                          ? srv.default_phases
                          : [...ALL_PHASES])
                      const effectivePhases = phaseMap[tool.name] !== undefined
                        ? phaseMap[tool.name]
                        : defaultPhases
                      const togglePhase = (phase: string) => {
                        const newMap = { ...phaseMap }
                        const current = newMap[tool.name] !== undefined ? newMap[tool.name] : effectivePhases
                        newMap[tool.name] = current.includes(phase)
                          ? current.filter((p: string) => p !== phase)
                          : [...current, phase]
                        updateField('agentToolPhaseMap', newMap as typeof data.agentToolPhaseMap)
                      }
                      return (
                        <div key={tool.name} className={styles.toolPhaseRow}>
                          <span className={styles.toolPhaseName}>{tool.name}</span>
                          {ALL_PHASES.map(phase => (
                            <label key={phase} className={styles.phaseCheck}>
                              <input
                                type="checkbox"
                                checked={effectivePhases.includes(phase)}
                                disabled={!srv.enabled}
                                onChange={() => togglePhase(phase)}
                              />
                            </label>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      )}

      {/* API Key modal */}
      <Modal
        isOpen={!!keyModal}
        onClose={closeKeyModal}
        title={modalInfo ? `${modalInfo.label} API 密钥` : ''}
        size="small"
        footer={
          <>
            <button className="secondaryButton" onClick={closeKeyModal}>取消</button>
            <button
              className="primaryButton"
              disabled={!keyValue.trim() || keySaving}
              onClick={saveApiKey}
            >
              {keySaving ? <Loader2 size={14} className={styles.spinner} /> : null}
              保存
            </button>
          </>
        }
      >
        {modalInfo && (
          <div className="formGroup">
            <label className="formLabel">{modalInfo.label} API 密钥</label>
            <div className={styles.apiKeyInputWrapper}>
              <input
                className="textInput"
                type={keyVisible ? 'text' : 'password'}
                value={keyValue}
                onChange={e => setKeyValue(e.target.value)}
                placeholder={`请输入 ${modalInfo.label} API 密钥`}
                autoFocus
              />
              <button
                className={styles.apiKeyToggle}
                onClick={() => setKeyVisible(v => !v)}
                type="button"
              >
                {keyVisible ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <span className="formHint">
              {modalInfo.hint}
              {' — '}
              <a href={modalInfo.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>
                获取 API Key
              </a>
            </span>
          </div>
        )}
      </Modal>
    </div>
  )
}
