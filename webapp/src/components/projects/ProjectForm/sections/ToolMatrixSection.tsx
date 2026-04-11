'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, Grid3X3, AlertTriangle, Eye, EyeOff, Loader2 } from 'lucide-react'
import type { Project } from '@prisma/client'
import { useProject } from '@/providers/ProjectProvider'
import { Modal } from '@/components/ui/Modal/Modal'
import styles from '../ProjectForm.module.css'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

/** Tool → settings field name + human label + signup URL */
const TOOL_KEY_INFO: Record<string, { field: string; label: string; hint: string; url: string }> = {
  web_search: {
    field: 'tavilyApiKey',
    label: 'Tavily',
    hint: '启用 web_search 工具，用于 CVE 研究与漏洞利用检索',
    url: 'https://app.tavily.com/home',
  },
  shodan: {
    field: 'shodanApiKey',
    label: 'Shodan',
    hint: '启用 shodan 工具，用于全网 OSINT（搜索、主机信息、DNS、统计）',
    url: 'https://account.shodan.io/',
  },
  google_dork: {
    field: 'serpApiKey',
    label: 'SerpAPI',
    hint: '启用 google_dork 工具，用于 Google dork OSINT（site: / inurl: / filetype:）',
    url: 'https://serpapi.com/manage-api-key',
  },
  execute_wpscan: {
    field: 'wpscanApiToken',
    label: 'WPScan',
    hint: '使用 WPScan 数据库的漏洞数据增强 execute_wpscan 结果（免费：25 次/天）',
    url: 'https://wpscan.com/register',
  },
  execute_gau: {
    field: 'urlscanApiKey',
    label: 'URLScan',
    hint: '使用 URLScan 归档数据增强 execute_gau 结果（有免费套餐）',
    url: 'https://urlscan.io/user/signup',
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
        setMissingKeys(missing)
      })
      .catch(() => {})
  }, [userId])

  useEffect(() => { fetchKeyStatus() }, [fetchKeyStatus])

  const openKeyModal = (toolId: string) => {
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
            控制代理在各阶段可使用的工具。勾选每个工具允许使用的阶段。
          </p>
          <div className={styles.toolPhaseGrid}>
            <div className={styles.toolPhaseHeader}>
              <span className={styles.toolPhaseHeaderLabel}>工具</span>
              <span className={styles.toolPhaseHeaderLabel}>信息收集</span>
              <span className={styles.toolPhaseHeaderLabel}>利用</span>
              <span className={styles.toolPhaseHeaderLabel}>后渗透</span>
            </div>
            {[
              { id: 'query_graph', label: 'query_graph' },
              { id: 'web_search', label: 'web_search' },
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
                        title={`设置 ${keyInfo.label} API Key`}
                        onClick={(e) => { e.stopPropagation(); openKeyModal(tool.id) }}
                        role="button"
                        tabIndex={0}
                      >
                        <AlertTriangle size={12} />
                        缺少 {keyInfo.label} Key — 添加
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
        </div>
      )}

      {/* API Key modal */}
      <Modal
        isOpen={!!keyModal}
        onClose={closeKeyModal}
        title={modalInfo ? `${modalInfo.label} API Key` : ''}
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
            <label className="formLabel">{modalInfo.label} API Key</label>
            <div className={styles.apiKeyInputWrapper}>
              <input
                className="textInput"
                type={keyVisible ? 'text' : 'password'}
                value={keyValue}
                onChange={e => setKeyValue(e.target.value)}
                placeholder={`输入 ${modalInfo.label} API Key`}
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
