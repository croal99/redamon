'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Loader2, AlertTriangle, CheckCircle2, XCircle, Server, Terminal, Globe, Zap, Eye, EyeOff } from 'lucide-react'
import {
  mcpServerSchema,
  PHASES,
  TRANSPORTS,
  BUILTIN_RESERVED_TOOL_NAMES,
  SYSTEM_SERVER_IDS,
  type MCPServer,
  type ToolSpec,
  type Transport,
  type Phase,
} from '@/lib/mcp/schema'
import { MCP_PRESETS, PRESET_CATEGORY_LABELS, type McpPreset } from '@/lib/mcp/presets'
import { useAlertModal } from '@/components/ui'
import styles from './McpServersTab.module.css'

interface Props {
  userId: string
}

interface TestResult {
  ok: boolean
  elapsed_ms: number
  discovered_tools: { name: string; description: string; input_schema: unknown }[]
  error: string | null
  warnings: { server_id: string; code: string; message: string }[]
}

/**
 * Render an MCP-server-provided JSON Schema as an LLM-friendly args
 * summary. Surfaces the full strategic info a model needs to call the
 * tool correctly: type · required-or-optional · enum constraints · default
 * value · min/max bounds · format hints · per-property description.
 *
 * Handles the common JSON-Schema shapes: primitive types, type unions,
 * enums, arrays (incl. arrays of objects), `oneOf` / `anyOf`, `const`.
 * Falls back to a placeholder when the schema is missing.
 *
 * Output format (one line per property when descriptions are present,
 * single comma-separated line when they aren't):
 *
 *   "q": <string>                  // Search query (GitHub syntax)
 *   "page": <number, optional, default 1, min 1>
 *   "perPage": <number, optional, default 30, max 100>  // Results per page
 *   "order": <"asc"|"desc", optional>  // Sort direction
 */
function argsFormatFromSchema(schema: unknown): string {
  if (!schema || typeof schema !== 'object') return '"...": "..."'
  const obj = schema as Record<string, unknown>
  const props = obj.properties as Record<string, Record<string, unknown>> | undefined
  if (!props || Object.keys(props).length === 0) return '"...": "..."'
  const required = new Set<string>(Array.isArray(obj.required) ? (obj.required as string[]) : [])

  const fmtType = (v: Record<string, unknown>): string => {
    if (Array.isArray(v.enum) && v.enum.length > 0) {
      const opts = (v.enum as unknown[]).slice(0, 4).map(e => JSON.stringify(e))
      return opts.join('|') + (v.enum.length > 4 ? '|...' : '')
    }
    if ('const' in v) return JSON.stringify((v as Record<string, unknown>).const)
    for (const key of ['oneOf', 'anyOf'] as const) {
      const branches = (v as Record<string, unknown>)[key]
      if (Array.isArray(branches) && branches.length > 0) {
        const sigs = branches.slice(0, 3).map(b => fmtType(b as Record<string, unknown>))
        return sigs.join('|') + (branches.length > 3 ? '|...' : '')
      }
    }
    const t = v.type
    if (typeof t === 'string') {
      if (t === 'array' && v.items && typeof v.items === 'object') {
        return `array<${fmtType(v.items as Record<string, unknown>)}>`
      }
      if (t === 'object') return 'object'
      return t
    }
    if (Array.isArray(t)) return (t as string[]).join('|')
    return 'any'
  }

  /** Collect numeric/string/format constraints into a comma-suffix list. */
  const fmtConstraints = (v: Record<string, unknown>): string[] => {
    const out: string[] = []
    if ('default' in v) out.push(`default ${JSON.stringify((v as Record<string, unknown>).default)}`)
    if (typeof v.minimum === 'number') out.push(`min ${v.minimum}`)
    if (typeof v.maximum === 'number') out.push(`max ${v.maximum}`)
    if (typeof v.minLength === 'number') out.push(`minLen ${v.minLength}`)
    if (typeof v.maxLength === 'number') out.push(`maxLen ${v.maxLength}`)
    if (typeof v.minItems === 'number') out.push(`minItems ${v.minItems}`)
    if (typeof v.maxItems === 'number') out.push(`maxItems ${v.maxItems}`)
    if (typeof v.format === 'string') out.push(`format=${v.format}`)
    if (typeof v.pattern === 'string') out.push('regex-constrained')
    return out
  }

  const fmtDescription = (v: Record<string, unknown>): string => {
    const d = v.description
    if (typeof d !== 'string') return ''
    const trimmed = d.trim().replace(/\s+/g, ' ')
    if (!trimmed) return ''
    return trimmed.length > 140 ? trimmed.slice(0, 140) + '…' : trimmed
  }

  const entries = Object.entries(props)
  const hasAnyDescription = entries.some(([, v]) => fmtDescription(v) !== '')

  const fmtSig = (k: string, v: Record<string, unknown>): string => {
    const type = fmtType(v)
    const tag = required.has(k) ? type : `${type}, optional`
    const constraints = fmtConstraints(v)
    const constraintStr = constraints.length ? `, ${constraints.join(', ')}` : ''
    return `"${k}": <${tag}${constraintStr}>`
  }

  if (hasAnyDescription) {
    // Multi-line layout: signature on the left, description after `//`.
    const lines = entries.slice(0, 12).map(([k, v]) => {
      const sig = fmtSig(k, v)
      const desc = fmtDescription(v)
      return desc ? `${sig}  // ${desc}` : sig
    })
    if (entries.length > 12) lines.push('// ... ' + (entries.length - 12) + ' more property/properties')
    return lines.join('\n')
  }
  // Compact one-liner when the schema has no per-property descriptions.
  const parts = entries.slice(0, 8).map(([k, v]) => fmtSig(k, v))
  if (entries.length > 8) parts.push('...')
  return parts.join(', ')
}

function emptyTool(): ToolSpec {
  return {
    name: '',
    purpose: '',
    when_to_use: '',
    args_format: '',
    description: '',
    default_phases: undefined,
  }
}

function emptyServer(): MCPServer {
  return {
    id: '',
    name: '',
    description: '',
    enabled: true,
    transport: 'streamable_http',
    default_phases: [...PHASES],
    tags: [],
    url: '',
    headers: {},
    auth: undefined,
    connect_timeout: 60,
    read_timeout: 600,
    command: '',
    args: [],
    env: {},
    cwd: '',
    encoding: 'utf-8',
    tools: [],
  }
}

function transportIcon(t: Transport) {
  if (t === 'stdio') return <Terminal size={14} />
  return <Globe size={14} />
}

export default function McpServersTab({ userId }: Props) {
  const [servers, setServers] = useState<MCPServer[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<MCPServer | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [topLevelError, setTopLevelError] = useState<string | null>(null)
  const [tokenVisible, setTokenVisible] = useState(false)
  const { dangerConfirm, alertError } = useAlertModal()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/users/${userId}/mcp`)
      if (r.ok) {
        const data = await r.json()
        console.log('load mcp servers', data)
        setServers(Array.isArray(data.servers) ? data.servers : [])
      }
    } catch (e) {
      console.error('load mcp servers', e)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (userId) load()
  }, [userId, load])

  const startNew = () => {
    setEditing(emptyServer())
    setIsNew(true)
    setErrors({})
    setTestResult(null)
    setTopLevelError(null)
  }

  const startFromPreset = (preset: McpPreset) => {
    // Deep-clone the template and append a numeric suffix to id if it would
    // collide with an existing server (so picking the same preset twice
    // produces "github" then "github-2", not a save error).
    const taken = new Set(servers.map(s => s.id))
    let id = preset.template.id
    if (taken.has(id)) {
      let n = 2
      while (taken.has(`${id}-${n}`)) n++
      id = `${id}-${n}`
    }
    const cloned: MCPServer = JSON.parse(JSON.stringify(preset.template))
    cloned.id = id
    setEditing(cloned)
    setIsNew(true)
    setErrors({})
    setTestResult(null)
    setTopLevelError(null)
  }

  const startEdit = (srv: MCPServer) => {
    setEditing({ ...srv })
    setIsNew(false)
    setErrors({})
    setTestResult(null)
    setTopLevelError(null)
  }

  const cancel = () => {
    setEditing(null)
    setErrors({})
    setTestResult(null)
    setTopLevelError(null)
  }

  const validate = (srv: MCPServer): Record<string, string> => {
    const parsed = mcpServerSchema.safeParse(srv)
    const out: Record<string, string> = {}
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        out[issue.path.join('.')] = issue.message
      }
    }
    return out
  }

  const onTest = async () => {
    if (!editing) return
    setTesting(true)
    setTestResult(null)
    try {
      // Test is for connection check + tool discovery, NOT strict validation.
      // Strip incomplete tool rows so the user can click Test before they've
      // filled in the four strategic fields (purpose / when_to_use /
      // args_format / description). Strict validation runs on Save.
      const draft = {
        ...editing,
        tools: editing.tools.filter(t =>
          t.name && t.purpose && t.when_to_use && t.args_format && t.description,
        ),
      }
      const r = await fetch('/api/mcp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server: draft, userId }),
      })
      const data = await r.json()
      setTestResult(data as TestResult)
    } catch (e) {
      setTestResult({
        ok: false,
        elapsed_ms: 0,
        discovered_tools: [],
        error: e instanceof Error ? e.message : 'unknown error',
        warnings: [],
      })
    } finally {
      setTesting(false)
    }
  }

  const onSave = async () => {
    if (!editing) return
    const localErrors = validate(editing)
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors)
      return
    }
    setSaving(true)
    setTopLevelError(null)
    try {
      const url = isNew
        ? `/api/users/${userId}/mcp`
        : `/api/users/${userId}/mcp/${encodeURIComponent(editing.id)}`
      const r = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      })
      const data = await r.json()
      if (!r.ok) {
        setTopLevelError(data.error || `request failed (${r.status})`)
        if (Array.isArray(data.issues)) {
          const issueMap: Record<string, string> = {}
          for (const i of data.issues) {
            issueMap[(i.path || []).join('.')] = i.message
          }
          setErrors(issueMap)
        }
        return
      }
      await load()
      setEditing(null)
      setErrors({})
      setTestResult(null)
    } catch (e) {
      setTopLevelError(e instanceof Error ? e.message : 'unknown error')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (serverId: string) => {
    const confirmed = await dangerConfirm(
      `删除 MCP 工具插件「${serverId}」？此操作不可撤销。`,
      '删除 MCP 工具插件',
    )
    if (!confirmed) return
    try {
      const r = await fetch(`/api/users/${userId}/mcp/${encodeURIComponent(serverId)}`, {
        method: 'DELETE',
      })
      if (r.ok) {
        await load()
      } else {
        const data = await r.json().catch(() => ({}))
        await alertError(data.error || `删除失败（${r.status}）`, '删除 MCP 工具插件')
      }
    } catch (e) {
      await alertError(e instanceof Error ? e.message : '删除失败', '删除 MCP 工具插件')
    }
  }

  const onToggleEnabled = async (srv: MCPServer) => {
    const updated = { ...srv, enabled: !srv.enabled }
    try {
      const r = await fetch(`/api/users/${userId}/mcp/${encodeURIComponent(srv.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      if (r.ok) await load()
    } catch (e) {
      console.error('toggle enabled', e)
    }
  }

  const updateField = <K extends keyof MCPServer>(key: K, value: MCPServer[K]) => {
    if (!editing) return
    setEditing({ ...editing, [key]: value })
  }

  const updateTool = (idx: number, partial: Partial<ToolSpec>) => {
    if (!editing) return
    const tools = editing.tools.map((t, i) => (i === idx ? { ...t, ...partial } : t))
    setEditing({ ...editing, tools })
  }

  const addTool = () => {
    if (!editing) return
    setEditing({ ...editing, tools: [...editing.tools, emptyTool()] })
  }

  const removeTool = (idx: number) => {
    if (!editing) return
    setEditing({ ...editing, tools: editing.tools.filter((_, i) => i !== idx) })
  }

  const buildToolFromDiscovery = (
    name: string,
    description: string,
    inputSchema: unknown,
  ): ToolSpec => {
    const desc = description || '(filled from MCP server — please refine)'
    return {
      name,
      description: desc,
      // First line of the MCP description is usually a one-line summary —
      // good enough as a default purpose. User can refine.
      purpose: desc.split('\n')[0].slice(0, 120) || name,
      // when_to_use is the only field the user genuinely has to think
      // about (it's the LLM's tool-selection signal). Seed it with the
      // description so save isn't blocked, but flag for refinement.
      when_to_use: desc.split('\n')[0].slice(0, 200) || `Use ${name} when relevant.`,
      args_format: argsFormatFromSchema(inputSchema),
    }
  }

  const importDiscoveredTool = (
    name: string,
    description: string,
    inputSchema: unknown,
  ) => {
    if (BUILTIN_RESERVED_TOOL_NAMES.has(name)) return
    setEditing(prev => {
      if (!prev) return prev
      if (prev.tools.some(t => t.name === name)) return prev
      return {
        ...prev,
        tools: [...prev.tools, buildToolFromDiscovery(name, description, inputSchema)],
      }
    })
  }

  const importAllDiscoveredTools = (
    discovered: Array<{ name: string; description: string; input_schema: unknown }>,
  ) => {
    setEditing(prev => {
      if (!prev) return prev
      const existing = new Set(prev.tools.map(t => t.name))
      const additions: ToolSpec[] = []
      for (const d of discovered) {
        if (existing.has(d.name)) continue
        if (BUILTIN_RESERVED_TOOL_NAMES.has(d.name)) continue
        additions.push(buildToolFromDiscovery(d.name, d.description, d.input_schema))
        existing.add(d.name)
      }
      return additions.length === 0 ? prev : { ...prev, tools: [...prev.tools, ...additions] }
    })
  }

  // ===== List View =====
  if (!editing) {
    return (
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>
              <Server size={18} /> MCP 工具插件
            </h2>
            <p className={styles.sectionDescription}>
              将 Model Context Protocol（MCP）服务器接入智能体，以扩展其工具能力。
              新工具会自动出现在每个项目的工具矩阵中，默认启用全部三个阶段。
            </p>
          </div>
          <button className={styles.primaryBtn} onClick={startNew}>
            <Plus size={14} /> 添加 MCP
          </button>
        </div>

        {loading && <p className={styles.muted}><Loader2 className={styles.spin} size={14} /> 加载中…</p>}

        {/* Quick-Add presets — 10 publicly-available MCPs vetted for pentest workflow */}
        {!loading && (
          <div className={styles.presetsBlock}>
            <div className={styles.presetsHeader}>
              <strong>快速添加</strong>
              <span className={styles.muted} style={{ fontSize: '11px', marginLeft: 'var(--space-2)' }}>
                点击预设 → 自动填充表单（如需 API Key 请粘贴后保存）
              </span>
            </div>
            <div className={styles.presetsGrid}>
              {MCP_PRESETS.map(preset => {
                const alreadyAdded = servers.some(s => s.id === preset.template.id)
                return (
                  <button
                    key={preset.key}
                    className={styles.presetCard}
                    onClick={() => startFromPreset(preset)}
                    title={preset.whyForRedamon}
                  >
                    <div className={styles.presetCardTop}>
                      <span className={styles.presetCardLabel}>{preset.label}</span>
                      <span className={styles.presetCategoryTag}>{PRESET_CATEGORY_LABELS[preset.category]}</span>
                    </div>
                    <div className={styles.presetCardBlurb}>{preset.blurb}</div>
                    <div className={styles.presetCardFooter}>
                      <span className={styles.presetTransportTag}>{preset.template.transport}</span>
                      {preset.authRequired && (
                        <span className={styles.presetAuthTag}>需认证</span>
                      )}
                      {alreadyAdded && (
                        <span className={styles.presetAddedTag}>已添加</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {!loading && servers.length === 0 && (
          <p className={styles.muted}>尚未保存任何 MCP 工具插件 — 可从上方“快速添加”选择一个，或点击“添加 MCP”手动配置。</p>
        )}

        {!loading && servers.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>名称</th>
                <th>传输方式</th>
                <th>工具数</th>
                <th>启用</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {servers.map(srv => (
                <tr key={srv.id}>
                  <td>
                    <div className={styles.cellTitle}>{srv.name || srv.id}</div>
                    <div className={styles.cellSub}>{srv.id}{srv.description ? ` — ${srv.description}` : ''}</div>
                  </td>
                  <td>
                    <span className={styles.transportPill}>
                      {transportIcon(srv.transport)} {srv.transport}
                    </span>
                  </td>
                  <td>{srv.tools.length}</td>
                  <td>
                    <label className={styles.switch}>
                      <input
                        type="checkbox"
                        checked={srv.enabled}
                        onChange={() => onToggleEnabled(srv)}
                      />
                      <span></span>
                    </label>
                  </td>
                  <td>
                    <button className={styles.iconBtn} onClick={() => startEdit(srv)} title="编辑">
                      <Pencil size={14} />
                    </button>
                    <button className={styles.iconBtn} onClick={() => onDelete(srv.id)} title="删除">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    )
  }

  // ===== Edit / Add View =====
  const isHttp = editing.transport === 'sse' || editing.transport === 'streamable_http'
  const errOf = (k: string) => errors[k]
  const idLocked = !isNew  // never let users change a server id once saved

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <Server size={18} /> {isNew ? '添加 MCP' : `编辑 MCP 工具插件：${editing.id}`}
        </h2>
        <div className={styles.headerActions}>
          <button className={styles.discoverBtn} onClick={onTest} disabled={testing}>
            {testing
              ? <><Loader2 className={styles.spin} size={14} /> 正在发现…</>
              : <><Zap size={14} /> 发现并添加新工具</>}
          </button>
          <button className={styles.secondaryBtn} onClick={cancel} disabled={saving}>取消</button>
          <button className={styles.primaryBtn} onClick={onSave} disabled={saving}>
            {saving ? <><Loader2 className={styles.spin} size={14} /> 保存中…</> : '保存'}
          </button>
        </div>
      </div>

      {topLevelError && (
        <div className={styles.errorBanner}>
          <AlertTriangle size={14} /> {topLevelError}
        </div>
      )}

      {testResult && (
        <div className={testResult.ok ? styles.testOk : styles.testFail}>
          {testResult.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          {testResult.ok
            ? <span><strong>成功</strong> — 已发现 {testResult.discovered_tools.length} 个工具（耗时 {testResult.elapsed_ms}ms）。</span>
            : <span><strong>失败</strong> — {testResult.error}</span>}
          {testResult.warnings.length > 0 && (
            <ul className={styles.warnList}>
              {testResult.warnings.map((w, i) => (
                <li key={i}><AlertTriangle size={12} /> [{w.code}] {w.message}</li>
              ))}
            </ul>
          )}
          {testResult.ok && testResult.discovered_tools.length > 0 && (
            <div className={styles.discoveredToolsBlock}>
              <div className={styles.discoveredHeader}>
                <strong>已发现的工具（{testResult.discovered_tools.length}）</strong>
                <button
                  className={styles.primaryBtn}
                  onClick={() => importAllDiscoveredTools(testResult.discovered_tools)}
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                >
                  <Plus size={12} /> 全部添加
                </button>
              </div>
              <div className={styles.discoveredTableWrap}>
                <table className={styles.discoveredTable}>
                  <thead>
                    <tr>
                      <th>工具</th>
                      <th>描述</th>
                      <th style={{ width: '160px', textAlign: 'right' }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testResult.discovered_tools.map(t => {
                      const alreadyAdded = editing.tools.some(x => x.name === t.name)
                      const reserved = BUILTIN_RESERVED_TOOL_NAMES.has(t.name)
                      const desc = t.description || '（暂无描述）'
                      return (
                        <tr key={t.name}>
                          <td><code>{t.name}</code></td>
                          <td className={styles.discoveredDescCell}>
                            {desc.length > 160 ? desc.slice(0, 160) + '…' : desc}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {!alreadyAdded && !reserved && (
                              <button
                                className={styles.secondaryBtn}
                                onClick={() => importDiscoveredTool(t.name, t.description, t.input_schema)}
                                style={{ padding: '3px 8px', fontSize: '11px' }}
                              >
                                <Plus size={11} /> 添加
                              </button>
                            )}
                            {alreadyAdded && <span className={styles.tag}>已添加</span>}
                            {reserved && <span className={styles.tagWarn}>保留</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>ID</span>
          <input
            type="text"
            value={editing.id}
            onChange={e => updateField('id', e.target.value)}
            disabled={idLocked}
            placeholder="my-mcp"
          />
          {errOf('id') && <span className={styles.fieldErr}>{errOf('id')}</span>}
          {idLocked && <span className={styles.muted}>创建后不可修改 id</span>}
        </label>

        <label className={styles.field}>
          <span>名称</span>
          <input
            type="text"
            value={editing.name}
            onChange={e => updateField('name', e.target.value)}
            placeholder="我的 MCP 工具插件"
          />
          {errOf('name') && <span className={styles.fieldErr}>{errOf('name')}</span>}
        </label>

        <label className={`${styles.field} ${styles.fieldWide}`}>
          <span>描述</span>
          <input
            type="text"
            value={editing.description}
            onChange={e => updateField('description', e.target.value)}
            placeholder="显示在项目工具矩阵中的简短说明"
          />
        </label>

        <label className={styles.field}>
          <span>传输方式</span>
          <select value={editing.transport} onChange={e => updateField('transport', e.target.value as Transport)}>
            {TRANSPORTS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <label className={styles.field}>
          <span>启用</span>
          <select value={editing.enabled ? '1' : '0'} onChange={e => updateField('enabled', e.target.value === '1')}>
            <option value="1">是</option>
            <option value="0">否</option>
          </select>
        </label>

        <label className={`${styles.field} ${styles.fieldWide}`}>
          <span>默认阶段（适用于未单独覆盖的工具）</span>
          <div className={styles.phasesRow}>
            {PHASES.map(p => (
              <label key={p} className={styles.checkInline}>
                <input
                  type="checkbox"
                  checked={editing.default_phases.includes(p)}
                  onChange={e => updateField('default_phases',
                    e.target.checked
                      ? [...editing.default_phases, p]
                      : editing.default_phases.filter(x => x !== p) as Phase[],
                  )}
                />
                {p}
              </label>
            ))}
          </div>
        </label>

        <label className={`${styles.field} ${styles.fieldWide}`}>
          <span>标签（逗号分隔，可选）</span>
          <input
            type="text"
            value={(editing.tags || []).join(', ')}
            onChange={e => updateField('tags',
              e.target.value.split(',').map(s => s.trim()).filter(s => s !== ''),
            )}
            placeholder="osint, recon, threat-intel"
          />
          <span className={styles.muted} style={{ fontSize: '11px' }}>
            仅用于显示的标签，不影响功能。
          </span>
        </label>

        {isHttp && (
          <>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>URL</span>
              <input
                type="text"
                value={editing.url || ''}
                onChange={e => updateField('url', e.target.value)}
                placeholder="http://my-mcp:8080/mcp or https://api.example.com/mcp/sse"
              />
              {errOf('url') && <span className={styles.fieldErr}>{errOf('url')}</span>}
            </label>
            <label className={styles.field}>
              <span>连接超时（秒）</span>
              <input
                type="number"
                value={editing.connect_timeout}
                onChange={e => updateField('connect_timeout', parseInt(e.target.value, 10) || 60)}
              />
            </label>
            <label className={styles.field}>
              <span>读取超时（秒）</span>
              <input
                type="number"
                value={editing.read_timeout}
                onChange={e => updateField('read_timeout', parseInt(e.target.value, 10) || 600)}
              />
            </label>
            <div className={`${styles.field} ${styles.fieldWide}`}>
              <span>认证（Bearer Token，可选）</span>
              <div className={styles.tokenInputRow}>
                <input
                  type={tokenVisible ? 'text' : 'password'}
                  value={editing.auth?.token || ''}
                  onChange={e => updateField('auth', e.target.value
                    ? { type: 'bearer', token: e.target.value }
                    : undefined)}
                  placeholder="在此粘贴 Token（例如 ghp_...）— 将保存到数据库，显示时会遮蔽"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => setTokenVisible(v => !v)}
                  title={tokenVisible ? '隐藏 Token' : '显示 Token'}
                >
                  {tokenVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <span className={styles.muted} style={{ fontSize: '11px' }}>
                每次 MCP 请求都会携带 <code>Authorization: Bearer …</code>。
              </span>
            </div>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>自定义 Header（每行一个：<code>Header-Name: value</code>）</span>
              <textarea
                rows={3}
                value={Object.entries(editing.headers || {}).map(([k, v]) => `${k}: ${v}`).join('\n')}
                onChange={e => {
                  const next: Record<string, string> = {}
                  for (const line of e.target.value.split('\n')) {
                    const trimmed = line.trim()
                    if (!trimmed) continue
                    const colonIdx = trimmed.indexOf(':')
                    if (colonIdx <= 0) continue
                    const k = trimmed.slice(0, colonIdx).trim()
                    const v = trimmed.slice(colonIdx + 1).trim()
                    if (k) next[k] = v
                  }
                  updateField('headers', next)
                }}
                placeholder="X-Organization-ID: abc-123&#10;X-Custom-Tenant: my-team"
              />
              <span className={styles.muted} style={{ fontSize: '11px' }}>
                每次 MCP 请求都会原样携带这些 Header（与 Bearer Token 一起）。用于多租户 API（例如 Censys 需要 <code>X-Organization-ID</code>）。
              </span>
            </label>
          </>
        )}

        {!isHttp && (
          <>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>命令</span>
              <input
                type="text"
                value={editing.command || ''}
                onChange={e => updateField('command', e.target.value)}
                placeholder="uvx, npx, python, ..."
              />
              {errOf('command') && <span className={styles.fieldErr}>{errOf('command')}</span>}
            </label>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>参数（每行一个）</span>
              <textarea
                rows={3}
                value={(editing.args || []).join('\n')}
                onChange={e => updateField('args', e.target.value.split('\n').map(s => s).filter(s => s !== ''))}
                placeholder="mcp-server-time&#10;--local-timezone=UTC"
              />
            </label>
            <label className={styles.field}>
              <span>工作目录（cwd）</span>
              <input
                type="text"
                value={editing.cwd || ''}
                onChange={e => updateField('cwd', e.target.value)}
                placeholder="/tmp（可选）"
              />
            </label>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>环境变量（每行一个：<code>KEY=VALUE</code>）</span>
              <textarea
                rows={4}
                value={Object.entries(editing.env || {}).map(([k, v]) => `${k}=${v}`).join('\n')}
                onChange={e => {
                  const next: Record<string, string> = {}
                  for (const line of e.target.value.split('\n')) {
                    const trimmed = line.trim()
                    if (!trimmed || trimmed.startsWith('#')) continue
                    const eqIdx = trimmed.indexOf('=')
                    if (eqIdx <= 0) continue
                    const k = trimmed.slice(0, eqIdx).trim()
                    const v = trimmed.slice(eqIdx + 1)
                    if (k) next[k] = v
                  }
                  updateField('env', next)
                }}
                placeholder="SHODAN_API_KEY=kQDRu5etVi2vSb1LjopLSlIKDMRDFtkR&#10;ANOTHER_VAR=optional-second-line"
                autoComplete="off"
                spellCheck={false}
              />
              <span className={styles.muted} style={{ fontSize: '11px' }}>
                作为环境变量传递给启动的进程。用于从环境变量读取 API Key 的 stdio MCP（如 Shodan、VirusTotal、Snyk 等）。以明文存储在数据库中。
              </span>
            </label>
          </>
        )}
      </div>

      <h3 className={styles.subTitle}>
        工具 <span className={styles.muted}>（{editing.tools.length}）</span>
        <button
          className={styles.secondaryBtn}
          onClick={addTool}
          style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: '12px' }}
        >
          <Plus size={12} /> 手动添加工具
        </button>
      </h3>
      <p className={styles.sectionDescription}>
        每个工具都需要填写全部四个“策略字段”。可使用 <strong>发现并添加新工具</strong> 从服务器导入工具，或手动添加。
      </p>

      {editing.tools.length === 0 && (
        <p className={styles.muted}>暂无工具。点击页面顶部的“发现并添加新工具”，或点击上方“手动添加工具”。</p>
      )}

      {editing.tools.map((t, i) => (
        <div key={i} className={styles.toolBlock}>
          <div className={styles.toolHeader}>
            <strong>工具 #{i + 1}</strong>
            <button className={styles.iconBtn} onClick={() => removeTool(i)} title="移除工具">
              <Trash2 size={14} />
            </button>
          </div>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>
                name
                <span className={styles.injectedBadge} title="会注入到 LLM 系统提示词的 tool_name 枚举（每次迭代）">
                  → 注入到 LLM 提示词
                </span>
              </span>
              <input
                type="text"
                value={t.name}
                onChange={e => updateTool(i, { name: e.target.value })}
                placeholder="my_tool_name"
              />
              {errOf(`tools.${i}.name`) && <span className={styles.fieldErr}>{errOf(`tools.${i}.name`)}</span>}
            </label>
            <label className={styles.field}>
              <span>
                purpose
                <span className={styles.injectedBadge} title="会注入到系统提示词的工具可用性表格（每次迭代）">
                  → 注入到 LLM 提示词
                </span>
              </span>
              <input
                type="text"
                value={t.purpose}
                onChange={e => updateTool(i, { purpose: e.target.value })}
                placeholder="一句话摘要"
              />
              {errOf(`tools.${i}.purpose`) && <span className={styles.fieldErr}>{errOf(`tools.${i}.purpose`)}</span>}
            </label>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>
                when_to_use
                <span className={styles.injectedBadge} title="会注入到系统提示词的工具可用性表格（每次迭代）。这是工具选择的关键策略信号。">
                  → 注入到 LLM 提示词
                </span>
              </span>
              <input
                type="text"
                value={t.when_to_use}
                onChange={e => updateTool(i, { when_to_use: e.target.value })}
                placeholder="策略说明：智能体应在何时选择该工具？"
              />
              {errOf(`tools.${i}.when_to_use`) && <span className={styles.fieldErr}>{errOf(`tools.${i}.when_to_use`)}</span>}
            </label>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>
                args_format
                <span className={styles.injectedBadge} title="会原样注入到系统提示词的 `### Tool Arguments:` 段落（每次迭代）。LLM 会模仿该模式生成 tool_args JSON。">
                  → 注入到 LLM 提示词
                </span>
              </span>
              <textarea
                rows={4}
                value={t.args_format}
                onChange={e => updateTool(i, { args_format: e.target.value })}
                placeholder='&quot;target_url&quot;: &lt;string&gt;  // The URL to scan'
              />
              {errOf(`tools.${i}.args_format`) && <span className={styles.fieldErr}>{errOf(`tools.${i}.args_format`)}</span>}
            </label>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>
                description
                <span className={styles.injectedBadge} title="会以多行完整说明注入到系统提示词：在该工具 `default_phases` 允许的每个阶段都会注入。阶段勾选控制的是该阶段是否存在该工具（注册表层面），而不是控制显示哪些字段。只要该阶段允许该工具，LLM 就会看到全部字段（name、purpose、when_to_use、args_format、description）。">
                  → 注入到 LLM 提示词
                </span>
              </span>
              <textarea
                rows={4}
                value={t.description}
                onChange={e => updateTool(i, { description: e.target.value })}
                placeholder="在系统提示词中展示的详细说明…"
              />
              {errOf(`tools.${i}.description`) && <span className={styles.fieldErr}>{errOf(`tools.${i}.description`)}</span>}
            </label>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>该工具的 default_phases（可选，覆盖服务器默认值）</span>
              <div className={styles.phasesRow}>
                {PHASES.map(p => (
                  <label key={p} className={styles.checkInline}>
                    <input
                      type="checkbox"
                      checked={(t.default_phases ?? editing.default_phases).includes(p)}
                      onChange={e => {
                        const current = t.default_phases ?? editing.default_phases
                        const next = e.target.checked
                          ? [...current, p]
                          : current.filter(x => x !== p) as Phase[]
                        updateTool(i, { default_phases: next })
                      }}
                    />
                    {p}
                  </label>
                ))}
              </div>
            </label>
          </div>
        </div>
      ))}
    </div>
  )
}

// Suppress unused-import warning for SYSTEM_SERVER_IDS (used by zod schema)
void SYSTEM_SERVER_IDS
