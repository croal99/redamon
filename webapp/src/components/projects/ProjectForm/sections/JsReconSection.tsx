'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, Search, Upload, Trash2, Loader2, FileText, HelpCircle, Play } from 'lucide-react'
import { Toggle, Modal, WikiInfoButton } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface UploadedFile {
  name: string
  size: number
  uploaded_at: string
}

interface CustomFileState {
  [key: string]: { name: string; size: number; uploaded_at: string } | null
}

const CUSTOM_FILE_TYPES: {
  key: string
  label: string
  accept: string
  hint: string
  guide: { title: string; description: string; format: string; example: string; howItWorks: string }
  validate: (content: string, filename: string) => string | null
}[] = [
  {
    key: 'patterns',
    label: '自定义敏感信息规则',
    accept: '.json,.txt',
    hint: 'JSON 数组或 TXT（每行：name|regex|severity|confidence）',
    guide: {
      title: '自定义敏感信息规则',
      description: '添加自定义正则规则，用于检测内置规则未覆盖的公司特定敏感信息、内部 API Key 格式或自定义 Token。这些规则为“追加模式”：与默认规则一起运行，不会替代默认规则。',
      format: 'JSON（.json）或纯文本（.txt）',
      example: `JSON format:
[
  {
    "name": "MyCompany API Key",
    "regex": "MYCO-[a-f0-9]{32}",
    "severity": "critical",
    "confidence": "high"
  },
  {
    "name": "Internal Service Token",
    "regex": "svc_tok_[A-Za-z0-9]{40}",
    "severity": "high",
    "confidence": "medium"
  }
]

TXT format (one pattern per line):
MyCompany API Key|MYCO-[a-f0-9]{32}|critical|high
Internal Token|svc_tok_[A-Za-z0-9]{40}|high|medium
# Lines starting with # are comments

Fields: name | regex | severity | confidence
- severity: critical, high, medium, low, info
- confidence: high, medium, low
- severity and confidence are optional (default: medium)`,
      howItWorks: '每条规则都会以 Python 正则（re 模块）编译，并对下载的每个 JS 文件逐行匹配。命中后会创建一条结果，并记录 severity 与 confidence。输出中会对匹配文本做脱敏（仅显示前 6 + 后 4 个字符）。误报较高的规则建议将 confidence 设为 "low"。注意：规则运行在 Python（re 模块）中而非 JavaScript。避免使用 JS 专有语法（如 (?<name>...) 命名分组），请改用 (?P<name>...) 或普通捕获分组。',
    },
    validate: (content: string, filename: string) => {
      if (filename.endsWith('.json')) {
        try {
          const parsed = JSON.parse(content)
          if (!Array.isArray(parsed)) return 'JSON 必须是规则对象数组'
          for (let i = 0; i < parsed.length; i++) {
            const p = parsed[i]
            if (!p.name || typeof p.name !== 'string') return `第 ${i + 1} 条规则：缺少 "name"（字符串）`
            if (!p.regex || typeof p.regex !== 'string') return `第 ${i + 1} 条规则：缺少 "regex"（字符串）`
            try { new RegExp(p.regex) } catch { return `第 ${i + 1} 条规则：正则无效 "${p.regex}"` }
            if (p.severity && !['critical', 'high', 'medium', 'low', 'info'].includes(p.severity))
              return `第 ${i + 1} 条规则：severity 无效 "${p.severity}"（必须为 critical/high/medium/low/info）`
            if (p.confidence && !['high', 'medium', 'low'].includes(p.confidence))
              return `第 ${i + 1} 条规则：confidence 无效 "${p.confidence}"（必须为 high/medium/low）`
          }
          if (parsed.length === 0) return 'JSON 数组为空——请至少添加一条规则'
        } catch { return 'JSON 语法错误' }
      } else {
        const lines = content.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'))
        if (lines.length === 0) return '文件为空——请至少添加一行规则'
        for (let i = 0; i < lines.length; i++) {
          const parts = lines[i].split('|')
          if (parts.length < 2) return `第 ${i + 1} 行：期望 "name|regex" 格式，实际为 "${lines[i].trim().substring(0, 40)}"`
          try { new RegExp(parts[1].trim()) } catch { return `第 ${i + 1} 行：正则无效 "${parts[1].trim()}"` }
        }
      }
      return null
    },
  },
  {
    key: 'sourcemap-paths',
    label: 'Source Map 探测路径',
    accept: '.txt',
    hint: '用于探测 .map 文件的额外路径（每行一个）',
    guide: {
      title: '自定义 Source Map 探测路径',
      description: '在寻找 .map Source Map 文件时，添加额外的 URL 路径模板进行探测。扫描器已内置 8 个默认路径（例如 {url}.map、{base}/static/js/{filename}.map）。可在此添加与你的目标应用相关的特殊路径。',
      format: '纯文本（.txt），每行一个路径模板',
      example: `{base}/assets/maps/{filename}.map
{base}/sourcemaps/{filename}.map
{base}/build/static/js/{filename}.map
{base}/_assets/{filename}.map
# Lines starting with # are comments

Available variables:
- {url}      = full JS file URL (e.g., https://example.com/js/app.js)
- {base}     = scheme + host (e.g., https://example.com)
- {filename} = JS filename (e.g., app.js)`,
      howItWorks: '对每个下载的 JS 文件，扫描器会先检查 sourceMappingURL 注释与 SourceMap HTTP 头。如果都未发现，则按模板替换 {url}/{base}/{filename} 并发起 HTTP GET 探测。若返回有效的 Source Map JSON（包含 "version" 与 "sources" 字段），扫描器会解析并提取原始源码文件名，同时扫描 sourcesContent 中可能内嵌的敏感信息。',
    },
    validate: (content: string) => {
      const lines = content.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'))
      if (lines.length === 0) return '文件为空——请至少添加一个路径模板'
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line.includes('{') && !line.includes('/')) return `第 ${i + 1} 行：期望 URL 路径模板，实际为 "${line.substring(0, 40)}"`
      }
      return null
    },
  },
  {
    key: 'packages',
    label: '内部包名',
    accept: '.txt',
    hint: '要检查的已知内部 npm 包名（每行一个）',
    guide: {
      title: '内部包名列表',
      description: '列出目标组织使用的已知内部/私有 npm 包名。无论是否在 JS 代码中通过 import/require 出现，这些包名都会始终对公共 npm registry 进行检查。当 JS 被高度压缩导致 import 名被移除时尤其有用。',
      format: '纯文本（.txt），每行一个带 scope 的包名',
      example: `@mycompany/auth-sdk
@mycompany/api-client
@mycompany/shared-utils
@internal/config
@targetcorp/payment-lib
# Lines starting with # are comments

Note: packages must use the @scope/name format.
Well-known public scopes (@types, @babel, @angular, @vue, etc.) are automatically skipped.`,
      howItWorks: '对每个包名，扫描器会请求 https://registry.npmjs.org/{package}。若 registry 返回 404（包不存在），将标记为“严重”的依赖混淆风险：攻击者可能在公共 npm 注册该包名，从而在目标执行 npm install 时触发任意代码执行。若包在 npm 上确实存在但仍被标为“内部包”，则标记为“高”风险（需要核验归属/所有权）。',
    },
    validate: (content: string) => {
      const lines = content.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'))
      if (lines.length === 0) return '文件为空——请至少添加一个包名'
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line.startsWith('@') || !line.includes('/'))
          return `第 ${i + 1} 行：期望 @scope/package 格式，实际为 "${line}"。包必须带 scope（例如 @myorg/mylib）。`
      }
      return null
    },
  },
  {
    key: 'endpoint-keywords',
    label: '端点关键词',
    accept: '.txt',
    hint: '要在 JS 中额外搜索的关键词（每行一个）',
    guide: {
      title: '自定义端点关键词',
      description: '添加额外关键词，用于在 JavaScript 内容中搜索。当关键词出现在 JS 代码的引号字符串中时，会将其所在的 URL/路径提取为已发现端点。可用于目标特有、内置规则可能遗漏的 API 路径。',
      format: '纯文本（.txt），每行一个关键词',
      example: `/internal-api/v2/
/backoffice/
mycompany-service
admin-panel
graphql-gateway
/legacy/api/
# Lines starting with # are comments

Tips:
- Use path fragments like /internal-api/ for precision
- Use service names like mycompany-service for broader matching
- Avoid very short keywords (< 4 chars) to reduce false positives`,
      howItWorks: '对每个关键词，扫描器会使用不区分大小写的正则在所有 JS 文件内容中搜索。命中后会提取其所在的引号字符串（包含关键词的 URL/路径）。每个发现的 URL 会按类别（admin/debug/auth/api 等）分类并分配严重度。结果会显示在 JS Recon 面板的 Endpoints 标签页中。',
    },
    validate: (content: string) => {
      const lines = content.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'))
      if (lines.length === 0) return '文件为空——请至少添加一个关键词'
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().length < 2) return `第 ${i + 1} 行：关键词过短（至少 2 个字符）`
      }
      return null
    },
  },
  {
    key: 'frameworks',
    label: '框架特征',
    accept: '.json',
    hint: 'JSON 数组：{name, patterns[], version_regex}',
    guide: {
      title: '自定义框架特征',
      description: '为自定义或内部 JavaScript 框架添加检测特征（不在内置 12 个框架：React/Next.js/Vue/Nuxt/Angular/jQuery/Svelte/Ember/Backbone/Lodash/Moment.js/Bootstrap 之内）。每个特征包含用于识别框架的正则 patterns，并可选提供 version_regex 用于提取版本号。',
      format: 'JSON（.json）数组',
      example: `[
  {
    "name": "MyCompanyFramework",
    "patterns": [
      "MyFramework\\.init",
      "__MY_FRAMEWORK__",
      "myfw-version"
    ],
    "version_regex": "MyFramework\\.version\\s*=\\s*[\"']([0-9.]+)[\"']"
  },
  {
    "name": "InternalRouter",
    "patterns": [
      "InternalRouter\\.navigate",
      "__INTERNAL_ROUTER__"
    ],
    "version_regex": null
  }
]

Fields:
- name: display name for the framework
- patterns: array of regex strings -- if ANY matches, framework is detected
- version_regex: regex with capture group 1 for version (null if not needed)

JSON escaping rules:
- Literal dot in regex: \\. (one backslash + dot in JSON)
- Whitespace \\s: \\s (one backslash + s in JSON)
- Quote in regex: use [\"'] or ['"']
The example above is ready to copy-paste into a .json file.`,
      howItWorks: '每个特征的 patterns 会以 Python 正则（re 模块）编译并在 JS 内容中搜索。任意一个 pattern 命中即判定框架存在。若提供 version_regex，则从第 1 个捕获组提取版本号。检测结果会显示在 JS Recon 面板的 Security Patterns 中；版本信息可用于更精准的 CVE 关联。注意：请使用 Python 正则语法，避免使用 JS 专有特性（如 (?<name>...) 命名分组）。',
    },
    validate: (content: string) => {
      try {
        const parsed = JSON.parse(content)
        if (!Array.isArray(parsed)) return 'JSON 必须是框架特征对象数组'
        for (let i = 0; i < parsed.length; i++) {
          const fw = parsed[i]
          if (!fw.name || typeof fw.name !== 'string') return `第 ${i + 1} 条特征：缺少 "name"（字符串）`
          if (!Array.isArray(fw.patterns) || fw.patterns.length === 0) return `第 ${i + 1} 条特征："patterns" 必须为非空的正则字符串数组`
          for (let j = 0; j < fw.patterns.length; j++) {
            if (typeof fw.patterns[j] !== 'string') return `第 ${i + 1} 条特征，第 ${j + 1} 个 pattern：必须为字符串`
            try { new RegExp(fw.patterns[j]) } catch { return `第 ${i + 1} 条特征，第 ${j + 1} 个 pattern：正则无效 "${fw.patterns[j]}"` }
          }
          if (fw.version_regex !== null && fw.version_regex !== undefined) {
            if (typeof fw.version_regex !== 'string') return `第 ${i + 1} 条特征："version_regex" 必须为字符串或 null`
            try { new RegExp(fw.version_regex) } catch { return `第 ${i + 1} 条特征：version_regex 无效 "${fw.version_regex}"` }
          }
        }
        if (parsed.length === 0) return 'JSON 数组为空——请至少添加一条框架特征'
      } catch { return 'JSON 语法错误' }
      return null
    },
  },
]

interface JsReconSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  projectId?: string
  mode?: 'create' | 'edit'
  onRun?: () => void
}

export function JsReconSection({ data, updateField, projectId, mode, onRun }: JsReconSectionProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [showCustomFiles, setShowCustomFiles] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [customFiles, setCustomFiles] = useState<CustomFileState>({})
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [guideModal, setGuideModal] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const jsFileRef = useRef<HTMLInputElement>(null)
  const customFileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const isEditMode = mode === 'edit' && projectId
  const canUpload = !!projectId  // uploads work in both create and edit mode when projectId exists

  const fetchUploadedFiles = useCallback(async () => {
    if (!canUpload) return
    try {
      const res = await fetch(`/api/js-recon/${projectId}/upload`)
      if (res.ok) {
        const data = await res.json()
        setUploadedFiles(data.files || [])
      }
    } catch { /* ignore */ }
  }, [canUpload, projectId])

  const fetchCustomFiles = useCallback(async () => {
    if (!canUpload) return
    try {
      const res = await fetch(`/api/js-recon/${projectId}/custom-files`)
      if (res.ok) {
        const data = await res.json()
        setCustomFiles(data.files || {})
      }
    } catch { /* ignore */ }
  }, [canUpload, projectId])

  useEffect(() => {
    if (canUpload && isOpen) {
      fetchUploadedFiles()
      fetchCustomFiles()
    }
  }, [canUpload, isOpen, fetchUploadedFiles, fetchCustomFiles])

  const handleJsFileUpload = async (file: File) => {
    if (!canUpload) return
    setIsUploading(true)
    setUploadError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/js-recon/${projectId}/upload`, { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json()
        setUploadError(data.error || '上传失败')
        return
      }
      await fetchUploadedFiles()
    } catch {
      setUploadError('上传失败')
    } finally {
      setIsUploading(false)
      if (jsFileRef.current) jsFileRef.current.value = ''
    }
  }

  const handleJsFileDelete = async (filename: string) => {
    if (!canUpload) return
    try {
      await fetch(`/api/js-recon/${projectId}/upload?name=${encodeURIComponent(filename)}`, { method: 'DELETE' })
      await fetchUploadedFiles()
    } catch { /* ignore */ }
  }

  const handleCustomFileUpload = async (fileType: string, file: File) => {
    if (!canUpload) return

    // Client-side validation before upload
    const fileTypeConfig = CUSTOM_FILE_TYPES.find(t => t.key === fileType)
    if (fileTypeConfig) {
      try {
        const content = await file.text()
        const error = fileTypeConfig.validate(content, file.name)
        if (error) {
          setValidationError(`${fileTypeConfig.label}: ${error}`)
          const ref = customFileRefs.current[fileType]
          if (ref) ref.value = ''
          return
        }
      } catch {
        setValidationError(`${fileTypeConfig.label}：无法读取文件`)
        const ref = customFileRefs.current[fileType]
        if (ref) ref.value = ''
        return
      }
    }

    setIsUploading(true)
    setUploadError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', fileType)
      const res = await fetch(`/api/js-recon/${projectId}/custom-files`, { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json()
        setUploadError(data.error || '上传失败')
        return
      }
      await fetchCustomFiles()
    } catch {
      setUploadError('上传失败')
    } finally {
      setIsUploading(false)
      const ref = customFileRefs.current[fileType]
      if (ref) ref.value = ''
    }
  }

  const handleCustomFileDelete = async (fileType: string) => {
    if (!canUpload) return
    try {
      await fetch(`/api/js-recon/${projectId}/custom-files?type=${fileType}`, { method: 'DELETE' })
      await fetchCustomFiles()
    } catch { /* ignore */ }
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Search size={16} />
          JS Recon 扫描器
          <NodeInfoTooltip section="JsRecon" />
          <WikiInfoButton target="JsRecon" />
          <span className={styles.badgeActive}>已启用</span>
        </h2>
        <div className={styles.sectionHeaderRight}>
          {onRun && (data as any).jsReconEnabled && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRun() }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '3px 8px', borderRadius: '4px',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                color: '#22c55e', cursor: 'pointer', fontSize: '11px', fontWeight: 500,
              }}
              title="运行 JS Recon 扫描器"
            >
              <Play size={10} /> 运行局部侦察
            </button>
          )}
          <div onClick={(e) => e.stopPropagation()}>
            <Toggle
              checked={(data as any).jsReconEnabled ?? false}
              onChange={(checked) => updateField('jsReconEnabled' as any, checked)}
            />
          </div>
          <ChevronDown
            size={16}
            className={`${styles.sectionIcon} ${isOpen ? styles.sectionIconOpen : ''}`}
          />
        </div>
      </div>

      {isOpen && (
        <div className={styles.sectionContent}>
          <p className={styles.sectionDescription}>
            深度 JavaScript 侦察（超越 jsluice）。使用 90+ 正则规则扫描 JS 中的敏感信息，
            对发现的 API Key 进行在线校验，检测依赖混淆漏洞，
            发现暴露的 Source Map，提取隐藏的 API 端点（REST/GraphQL/WebSocket），
            进行带版本的框架指纹识别，并识别 DOM 型 XSS sink。
          </p>

          {(data as any).jsReconEnabled && (
            <>
              {/* Analysis Scope */}
              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>分析范围</h3>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>最大 JS 文件数</label>
                    <input
                      type="number"
                      className="textInput"
                      value={(data as any).jsReconMaxFiles ?? 10000}
                      onChange={(e) => updateField('jsReconMaxFiles' as any, parseInt(e.target.value) || 10000)}
                      min={10}
                      max={10000}
                    />
                    <span className={styles.fieldHint}>最多下载并分析的 JS 文件数量</span>
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>超时（秒）</label>
                    <input
                      type="number"
                      className="textInput"
                      value={(data as any).jsReconTimeout ?? 900}
                      onChange={(e) => updateField('jsReconTimeout' as any, parseInt(e.target.value) || 900)}
                      min={60}
                    />
                    <span className={styles.fieldHint}>整体扫描超时</span>
                  </div>
                </div>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>并发数</label>
                    <input
                      type="number"
                      className="textInput"
                      value={(data as any).jsReconConcurrency ?? 10}
                      onChange={(e) => updateField('jsReconConcurrency' as any, parseInt(e.target.value) || 10)}
                      min={1}
                      max={30}
                    />
                    <span className={styles.fieldHint}>并行文件处理线程数</span>
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>最低置信度</label>
                    <select
                      className="textInput"
                      value={(data as any).jsReconMinConfidence ?? 'low'}
                      onChange={(e) => updateField('jsReconMinConfidence' as any, e.target.value)}
                    >
                      <option value="low">低（显示所有结果）</option>
                      <option value="medium">中（减少噪声）</option>
                      <option value="high">高（最低误报）</option>
                    </select>
                    <span className={styles.fieldHint}>按置信度过滤结果</span>
                  </div>
                </div>
              </div>

              {/* JS File Sources */}
              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>JS 文件来源</h3>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>包含 Webpack Chunk</span>
                    <p className={styles.toggleDescription}>分析 Katana 可能排除的 .chunk.js 与 .bundle.js 文件，其中常包含应用代码与内嵌敏感信息。</p>
                  </div>
                  <Toggle
                    checked={(data as any).jsReconIncludeChunks ?? true}
                    onChange={(checked) => updateField('jsReconIncludeChunks' as any, checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>包含框架 JS</span>
                    <p className={styles.toggleDescription}>抓取 Katana 可能排除的 Next.js（/_next/static/chunks/）与 Nuxt.js（/_nuxt/）bundle，常包含 API Key 与 Firebase 配置。</p>
                  </div>
                  <Toggle
                    checked={(data as any).jsReconIncludeFrameworkJs ?? true}
                    onChange={(checked) => updateField('jsReconIncludeFrameworkJs' as any, checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>包含历史 JS</span>
                    <p className={styles.toggleDescription}>分析来自 Wayback Machine/GAU 的历史 JS 文件。旧版本通常包含已从生产移除的硬编码 Key。需要启用 GAU。</p>
                  </div>
                  <Toggle
                    checked={(data as any).jsReconIncludeArchivedJs ?? true}
                    onChange={(checked) => updateField('jsReconIncludeArchivedJs' as any, checked)}
                  />
                </div>
              </div>

              {/* Detection Modules */}
              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>检测模块</h3>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>敏感信息检测（正则）</span>
                    <p className={styles.toggleDescription}>90+ 规则覆盖 AWS Key、Stripe、Firebase、GitHub Token、数据库 URI、JWT 等</p>
                  </div>
                  <Toggle
                    checked={(data as any).jsReconRegexPatterns ?? true}
                    onChange={(checked) => updateField('jsReconRegexPatterns' as any, checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>Source Map 分析</span>
                    <p className={styles.toggleDescription}>发现暴露的 .map 文件（可能泄露未压缩源码）并扫描其中的敏感信息</p>
                  </div>
                  <Toggle
                    checked={(data as any).jsReconSourceMaps ?? true}
                    onChange={(checked) => updateField('jsReconSourceMaps' as any, checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>依赖混淆</span>
                    <p className={styles.toggleDescription}>检查带 scope 的 npm 包（@org/pkg）是否存在于公共 registry。缺失 = 严重 RCE 风险</p>
                  </div>
                  <Toggle
                    checked={(data as any).jsReconDependencyCheck ?? true}
                    onChange={(checked) => updateField('jsReconDependencyCheck' as any, checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>端点提取</span>
                    <p className={styles.toggleDescription}>提取 REST/GraphQL/WebSocket 端点、admin/debug 路由与 API 文档路径</p>
                  </div>
                  <Toggle
                    checked={(data as any).jsReconExtractEndpoints ?? true}
                    onChange={(checked) => updateField('jsReconExtractEndpoints' as any, checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>DOM Sink 检测</span>
                    <p className={styles.toggleDescription}>发现 innerHTML/eval()/document.write/原型污染等 XSS/注入向量</p>
                  </div>
                  <Toggle
                    checked={(data as any).jsReconDomSinks ?? true}
                    onChange={(checked) => updateField('jsReconDomSinks' as any, checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>框架指纹识别</span>
                    <p className={styles.toggleDescription}>检测 React/Next.js/Vue/Angular/jQuery 等 12 种框架，并提取版本用于 CVE 定向</p>
                  </div>
                  <Toggle
                    checked={(data as any).jsReconFrameworkDetect ?? true}
                    onChange={(checked) => updateField('jsReconFrameworkDetect' as any, checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>开发者注释</span>
                    <p className={styles.toggleDescription}>提取 TODO/FIXME/HACK 标记，以及包含 password/secret/token 等关键词的注释</p>
                  </div>
                  <Toggle
                    checked={(data as any).jsReconDevComments ?? true}
                    onChange={(checked) => updateField('jsReconDevComments' as any, checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>AI SDK 检测</span>
                    <p className={styles.toggleDescription}>
                      对抗式 AI 第 6 阶段：扫描所有采集到的 JS bundle，检测 AI/LLM SDK 引用（OpenAI/Anthropic/Gemini/LangChain/LlamaIndex/Vercel AI SDK/MCP/向量数据库等）、硬编码的 Provider Key（sk-/sk-ant-/hf_/lsv2_/gsk_/r8_/…）、OpenAI/Anthropic 的 dangerouslyAllowBrowser 选项，以及 httpx Wappalyzer 无法覆盖的异步 chunk 中的 AI 前端产品标记。输出 finding_type 为 ai-sdk-* 的 JsReconFinding 节点，并为匹配的 Secret 节点补充 ai_provider。纯正则，无额外流量。
                    </p>
                  </div>
                  <Toggle
                    checked={(data as any).jsReconAiSdkDetectionEnabled ?? true}
                    onChange={(checked) => updateField('jsReconAiSdkDetectionEnabled' as any, checked)}
                  />
                </div>
              </div>

              {/* Key Validation */}
              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>Key 校验</h3>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>校验发现的 Key</span>
                    <p className={styles.toggleDescription}>发起在线 API 调用以验证发现的 Key 是否有效（AWS STS、GitHub /user、Stripe /v1/account 等）。会向第三方服务产生外部流量。</p>
                  </div>
                  <Toggle
                    checked={(data as any).jsReconValidateKeys ?? true}
                    onChange={(checked) => updateField('jsReconValidateKeys' as any, checked)}
                  />
                </div>
                {(data as any).jsReconValidateKeys && (
                  <div className={styles.fieldRow}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>校验超时（秒）</label>
                      <input
                        type="number"
                        className="textInput"
                        value={(data as any).jsReconValidationTimeout ?? 5}
                        onChange={(e) => updateField('jsReconValidationTimeout' as any, parseInt(e.target.value) || 5)}
                        min={1}
                        max={30}
                      />
                      <span className={styles.fieldHint}>单服务 API 调用超时时间</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Extension Files */}
              {canUpload && (
                <div className={styles.subSection}>
                  <div
                    className={styles.subSectionTitleCollapsible}
                    onClick={() => setShowCustomFiles(!showCustomFiles)}
                  >
                    自定义扩展文件
                    <ChevronDown
                      size={14}
                      className={`${styles.sectionIcon} ${showCustomFiles ? styles.sectionIconOpen : ''}`}
                    />
                  </div>
                  {showCustomFiles && (
                    <>
                      <p className={styles.sectionDescription} style={{ marginTop: '8px' }}>
                        上传自定义文件以扩展内置检测规则。这些规则为追加模式，不会替代默认规则。
                        点击每个类型旁的 <HelpCircle size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> 图标查看格式说明与示例。
                      </p>

                      {uploadError && (
                        <p style={{ color: 'var(--error)', fontSize: 'var(--text-xs)', marginBottom: '8px' }}>{uploadError}</p>
                      )}

                      {CUSTOM_FILE_TYPES.map(({ key, label, accept, hint, guide }) => (
                        <div key={key} className={styles.fieldGroup} style={{ marginBottom: '12px' }}>
                          <label className={styles.fieldLabel} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {label}
                            <button
                              type="button"
                              onClick={() => setGuideModal(key)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0, display: 'flex' }}
                              title={`${label} 格式说明`}
                            >
                              <HelpCircle size={13} />
                            </button>
                          </label>
                          <span className={styles.fieldHint}>{hint}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <input
                              ref={(el) => { customFileRefs.current[key] = el }}
                              type="file"
                              accept={accept}
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleCustomFileUpload(key, file)
                              }}
                            />
                            <button
                              type="button"
                              className="secondaryButton"
                              onClick={() => customFileRefs.current[key]?.click()}
                              disabled={isUploading}
                              style={{ fontSize: 'var(--text-xs)', padding: '4px 10px' }}
                            >
                              {isUploading ? <Loader2 size={12} className={styles.spin} /> : <Upload size={12} />}
                              {' '}上传
                            </button>
                            {customFiles[key] && (
                              <>
                                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                                  <FileText size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                  {customFiles[key]!.name} ({(customFiles[key]!.size / 1024).toFixed(1)} KB)
                                </span>
                                <button
                                  type="button"
                                  className="secondaryButton"
                                  onClick={() => handleCustomFileDelete(key)}
                                  style={{ fontSize: 'var(--text-xs)', padding: '4px 6px', color: 'var(--error)' }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* Manual JS File Upload */}
              {canUpload && (
                <div className={styles.subSection}>
                  <h3 className={styles.subSectionTitle}>手动上传 JS 文件</h3>
                  <p className={styles.sectionDescription}>
                    无需爬取即可上传 JS 文件进行分析（来自 Burp Suite、移动端 APK、DevTools 或需要登录的区域）。
                  </p>
                  <input
                    ref={jsFileRef}
                    type="file"
                    accept=".js,.mjs,.map,.json"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const files = e.target.files
                      if (files) {
                        Array.from(files).forEach(f => handleJsFileUpload(f))
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="secondaryButton"
                    onClick={() => jsFileRef.current?.click()}
                    disabled={isUploading}
                    style={{ marginBottom: '8px' }}
                  >
                    {isUploading ? <Loader2 size={13} className={styles.spin} /> : <Upload size={13} />}
                    {isUploading ? ' 正在上传...' : ' 上传 JS 文件'}
                  </button>

                  {uploadedFiles.length > 0 && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      <p style={{ marginBottom: '4px' }}>{uploadedFiles.length} 个文件已上传（总计 {(uploadedFiles.reduce((sum, f) => sum + f.size, 0) / 1024).toFixed(0)} KB）</p>
                      {uploadedFiles.map(f => (
                        <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0' }}>
                          <FileText size={11} />
                          <span>{f.name} ({(f.size / 1024).toFixed(1)} KB)</span>
                          <button
                            type="button"
                            onClick={() => handleJsFileDelete(f.name)}
                            style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '2px' }}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </>
          )}
        </div>
      )}
      {/* Help Guide Modal */}
      {guideModal && (() => {
        const fileType = CUSTOM_FILE_TYPES.find(t => t.key === guideModal)
        if (!fileType) return null
        const { guide } = fileType
        return (
          <Modal isOpen={true} onClose={() => setGuideModal(null)} title={guide.title} size="large">
            <div style={{ fontSize: 'var(--text-sm)', lineHeight: '1.6', color: 'var(--text-primary)' }}>
              <p style={{ marginBottom: '16px' }}>{guide.description}</p>

              <h4 style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: 'var(--text-xs)', letterSpacing: '0.05em' }}>格式</h4>
              <p style={{ marginBottom: '16px' }}>{guide.format}</p>

              <h4 style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: 'var(--text-xs)', letterSpacing: '0.05em' }}>示例</h4>
              <pre style={{
                background: 'var(--bg-secondary, #1a1a2e)',
                padding: '12px 16px',
                borderRadius: '6px',
                fontSize: 'var(--text-xs)',
                overflow: 'auto',
                marginBottom: '16px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                border: '1px solid var(--border-primary, #2a2a4a)',
              }}>
                {guide.example}
              </pre>

              <h4 style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: 'var(--text-xs)', letterSpacing: '0.05em' }}>工作原理</h4>
              <p>{guide.howItWorks}</p>
            </div>
          </Modal>
        )
      })()}

      {/* Validation Error Modal */}
      <Modal
        isOpen={validationError !== null}
        onClose={() => setValidationError(null)}
        title="上传校验失败"
        size="default"
        footer={
          <button
            type="button"
            className="secondaryButton"
            onClick={() => setValidationError(null)}
            style={{ marginLeft: 'auto' }}
          >
            确定
          </button>
        }
      >
        <div style={{ fontSize: 'var(--text-sm)', lineHeight: '1.6' }}>
          <p style={{ color: 'var(--error)', marginBottom: '12px', fontWeight: 500 }}>
            文件未上传：格式不符合预期。
          </p>
          <pre style={{
            background: 'var(--bg-secondary, #1a1a2e)',
            padding: '12px 16px',
            borderRadius: '6px',
            fontSize: 'var(--text-xs)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            border: '1px solid var(--error, #ef4444)',
          }}>
            {validationError}
          </pre>
          <p style={{ marginTop: '12px', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
            点击上传项旁的 <HelpCircle size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> 图标查看格式说明与示例。
          </p>
        </div>
      </Modal>
    </div>
  )
}
