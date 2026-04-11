'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, Search, Upload, Trash2, Loader2, FileText, HelpCircle } from 'lucide-react'
import { Toggle, Modal } from '@/components/ui'
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
      description: '添加自定义正则规则，用于识别公司特有的敏感信息、内部 API Key 格式或自定义 Token（内置约 100 条规则未覆盖的部分）。这些规则为叠加模式：会与默认规则一起运行，不会替换默认规则。',
      format: 'JSON（.json）或纯文本（.txt）',
      example: `JSON 格式：
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

TXT 格式（每行一个规则）：
MyCompany API Key|MYCO-[a-f0-9]{32}|critical|high
Internal Token|svc_tok_[A-Za-z0-9]{40}|high|medium
# 以 # 开头的行会被视为注释

字段：name | regex | severity | confidence
- severity：critical, high, medium, low, info
- confidence：high, medium, low
- severity 与 confidence 可选（默认：medium）`,
      howItWorks: '每条规则会被编译为 Python 正则（re 模块），并逐行应用到每个下载的 JS 文件内容中。一旦命中，将生成一条发现记录，并使用指定的 severity 与 confidence。命中的文本会在输出中脱敏（仅显示前 6 位 + 后 4 位）。误报较高的规则建议将 confidence 设为 "low"。注意：规则在 Python 中运行（re 模块），不是 JavaScript；请避免仅 JS 支持的语法（如 (?<name>...) 命名分组），改用 (?P<name>...) 或普通捕获分组。',
    },
    validate: (content: string, filename: string) => {
      if (filename.endsWith('.json')) {
        try {
          const parsed = JSON.parse(content)
          if (!Array.isArray(parsed)) return 'JSON 必须是规则对象数组'
          for (let i = 0; i < parsed.length; i++) {
            const p = parsed[i]
            if (!p.name || typeof p.name !== 'string') return `规则 ${i + 1}：缺少 "name"（字符串）`
            if (!p.regex || typeof p.regex !== 'string') return `规则 ${i + 1}：缺少 "regex"（字符串）`
            try { new RegExp(p.regex) } catch { return `规则 ${i + 1}：regex 无效 "${p.regex}"` }
            if (p.severity && !['critical', 'high', 'medium', 'low', 'info'].includes(p.severity))
              return `规则 ${i + 1}：severity 无效 "${p.severity}"（必须为 critical/high/medium/low/info）`
            if (p.confidence && !['high', 'medium', 'low'].includes(p.confidence))
              return `规则 ${i + 1}：confidence 无效 "${p.confidence}"（必须为 high/medium/low）`
          }
          if (parsed.length === 0) return 'JSON 数组为空——请至少添加一条规则'
        } catch { return 'JSON 语法无效' }
      } else {
        const lines = content.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'))
        if (lines.length === 0) return '文件为空——请至少添加一行规则'
        for (let i = 0; i < lines.length; i++) {
          const parts = lines[i].split('|')
          if (parts.length < 2) return `第 ${i + 1} 行：应为 "name|regex" 格式，实际为 "${lines[i].trim().substring(0, 40)}"`
          try { new RegExp(parts[1].trim()) } catch { return `第 ${i + 1} 行：regex 无效 "${parts[1].trim()}"` }
        }
      }
      return null
    },
  },
  {
    key: 'sourcemap-paths',
    label: 'Source Map 路径',
    accept: '.txt',
    hint: '用于探测 .map 文件的额外路径（每行一个）',
    guide: {
      title: '自定义 Source Map 探测路径',
      description: '添加用于探测 .map Source Map 文件的额外 URL 路径模板。扫描器默认会尝试 8 条路径（如 {url}.map、{base}/static/js/{filename}.map）。可在此补充目标应用特有的路径规则。',
      format: '纯文本（.txt），每行一个路径模板',
      example: `{base}/assets/maps/{filename}.map
{base}/sourcemaps/{filename}.map
{base}/build/static/js/{filename}.map
{base}/_assets/{filename}.map
# 以 # 开头的行会被视为注释

可用变量：
- {url}      = 完整 JS 文件 URL（例如：https://example.com/js/app.js）
- {base}     = 协议 + 主机（例如：https://example.com）
- {filename} = JS 文件名（例如：app.js）`,
      howItWorks: '对每个下载的 JS 文件，扫描器会先检查 sourceMappingURL 注释与 SourceMap HTTP 头。若都不存在，则会将 {url}/{base}/{filename} 替换为真实值并逐条发起 HTTP GET 探测。如果返回有效的 source map JSON（包含 "version" 与 "sources" 字段），扫描器会解析它，提取原始源码文件名，并扫描 sourcesContent 中可能内嵌的敏感信息。',
    },
    validate: (content: string) => {
      const lines = content.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'))
      if (lines.length === 0) return '文件为空——请至少添加一个路径模板'
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line.includes('{') && !line.includes('/')) return `第 ${i + 1} 行：应为 URL 路径模板，实际为 "${line.substring(0, 40)}"`
      }
      return null
    },
  },
  {
    key: 'packages',
    label: '内部包名',
    accept: '.txt',
    hint: '需要检查的内部 npm 包名（每行一个）',
    guide: {
      title: '内部包名列表',
      description: '列出目标组织使用的已知内部/私有 npm 包名。无论这些包名是否能从 JS 代码的 import/require 中解析出来，都会强制对公网 npm Registry 进行检查（适用于压缩代码丢失 import 名称的情况）。',
      format: '纯文本（.txt），每行一个带 scope 的包名',
      example: `@mycompany/auth-sdk
@mycompany/api-client
@mycompany/shared-utils
@internal/config
@targetcorp/payment-lib
# 以 # 开头的行会被视为注释

注意：包名必须为 @scope/name 格式。
常见公共 scope（@types/@babel/@angular/@vue 等）会自动跳过。`,
      howItWorks: '对每个包名，扫描器会请求 https://registry.npmjs.org/{package}。若返回 404（包不存在），会标记为严重（CRITICAL）的依赖混淆漏洞：攻击者可在公共 npm 注册该包名，在目标执行 npm install 时获得代码执行。若包在 npm 上确实存在，但你将其标为“内部包”，则会标记为高危（HIGH）并建议核验归属权。',
    },
    validate: (content: string) => {
      const lines = content.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'))
      if (lines.length === 0) return '文件为空——请至少添加一个包名'
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line.startsWith('@') || !line.includes('/'))
          return `第 ${i + 1} 行：应为 @scope/package 格式，实际为 "${line}"。包必须带 scope（例如：@myorg/mylib）。`
      }
      return null
    },
  },
  {
    key: 'endpoint-keywords',
    label: '端点关键词',
    accept: '.txt',
    hint: '在 JS 中额外搜索的关键词（每行一个）',
    guide: {
      title: '自定义端点关键词',
      description: '添加用于在 JavaScript 内容中额外搜索的关键词。当关键词出现在 JS 代码的引号字符串内时，会提取其所在的 URL/路径作为发现的端点。适用于补充内置规则可能漏掉的目标特定 API 路径。',
      format: '纯文本（.txt），每行一个关键词',
      example: `/internal-api/v2/
/backoffice/
mycompany-service
admin-panel
graphql-gateway
/legacy/api/
# 以 # 开头的行会被视为注释

提示：
- 使用 /internal-api/ 等路径片段以提高精度
- 使用 mycompany-service 等服务名以获得更宽泛匹配
- 避免过短关键词（< 4 字符）以减少误报`,
      howItWorks: '对每个关键词，扫描器会用不区分大小写的正则在所有 JS 文件内容中搜索。命中后会提取其所在的引号字符串（包含该关键词的 URL/路径）。每个发现的 URL 会按类别（admin/debug/auth/api 等）进行分类并赋予严重级别。结果会显示在 JS Recon 面板的 Endpoints 标签页。',
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
    label: '框架指纹',
    accept: '.json',
    hint: 'JSON 数组：{name, patterns[], version_regex}',
    guide: {
      title: '自定义框架指纹',
      description: '为自定义/内部 JavaScript 框架添加识别指纹（内置 12 种：React/Next.js/Vue/Nuxt/Angular/jQuery/Svelte/Ember/Backbone/Lodash/Moment.js/Bootstrap）。每条指纹包含用于识别框架的正则 patterns，并可选提供用于提取版本号的 version_regex。',
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

字段：
- name：框架显示名称
- patterns：regex 字符串数组——只要任意一个命中即判定框架存在
- version_regex：用于提取版本的 regex（捕获组 1），不需要则为 null

JSON 转义规则：
- 正则中的字面量点：\\.（JSON 中一个反斜杠 + 点）
- 空白 \\s：\\s（JSON 中一个反斜杠 + s）
- 正则中的引号：使用 [\"'] 或 ['"]
以上示例可直接复制粘贴到 .json 文件中。`,
      howItWorks: '每条指纹的 patterns 会被编译为 Python 正则（re 模块）并在 JS 文件内容中搜索。只要任意 pattern 命中，即判定该框架存在；若提供 version_regex，则会从捕获组 1 提取版本号。识别出的框架会显示在 JS Recon 面板的 Security Patterns 中；版本信息可用于更精准的 CVE 关联。注意：请使用 Python 正则语法，避免仅 JS 支持的特性（如 (?<name>...) 命名分组）。',
    },
    validate: (content: string) => {
      try {
        const parsed = JSON.parse(content)
        if (!Array.isArray(parsed)) return 'JSON 必须是框架指纹对象数组'
        for (let i = 0; i < parsed.length; i++) {
          const fw = parsed[i]
          if (!fw.name || typeof fw.name !== 'string') return `指纹 ${i + 1}：缺少 "name"（字符串）`
          if (!Array.isArray(fw.patterns) || fw.patterns.length === 0) return `指纹 ${i + 1}："patterns" 必须为非空 regex 字符串数组`
          for (let j = 0; j < fw.patterns.length; j++) {
            if (typeof fw.patterns[j] !== 'string') return `指纹 ${i + 1}，pattern ${j + 1}：必须为字符串`
            try { new RegExp(fw.patterns[j]) } catch { return `指纹 ${i + 1}，pattern ${j + 1}：regex 无效 "${fw.patterns[j]}"` }
          }
          if (fw.version_regex !== null && fw.version_regex !== undefined) {
            if (typeof fw.version_regex !== 'string') return `指纹 ${i + 1}："version_regex" 必须为字符串或 null`
            try { new RegExp(fw.version_regex) } catch { return `指纹 ${i + 1}：version_regex 无效 "${fw.version_regex}"` }
          }
        }
        if (parsed.length === 0) return 'JSON 数组为空——请至少添加一个框架指纹'
      } catch { return 'JSON 语法无效' }
      return null
    },
  },
]


interface JsReconSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  projectId?: string
  mode?: 'create' | 'edit'
}

export function JsReconSection({ data, updateField, projectId, mode }: JsReconSectionProps) {
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
          JS Recon 扫描
          <NodeInfoTooltip section="JsRecon" />
          <span className={styles.badgeActive}>主动</span>
        </h2>
        <div className={styles.sectionHeaderRight}>
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
            超越 jsluice 的深度 JavaScript 侦察：使用 90+ 正则规则扫描 JS 中的敏感信息，
            对发现的 API Key 进行在线校验，检测依赖混淆漏洞，发现暴露的 source map，
            提取隐藏 API 端点（REST/GraphQL/WebSocket），识别框架及版本，并定位 DOM 型 XSS sink。
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
                      value={(data as any).jsReconMaxFiles ?? 500}
                      onChange={(e) => updateField('jsReconMaxFiles' as any, parseInt(e.target.value) || 500)}
                      min={10}
                      max={5000}
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
                    <label className={styles.fieldLabel}>并发</label>
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
                      <option value="low">低（显示全部）</option>
                      <option value="medium">中（降低噪声）</option>
                      <option value="high">高（最少误报）</option>
                    </select>
                    <span className={styles.fieldHint}>按置信度过滤发现结果</span>
                  </div>
                </div>
              </div>

              {/* JS File Sources */}
              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>JS 文件来源</h3>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>包含 Webpack Chunks</span>
                    <p className={styles.toggleDescription}>分析 Katana 排除的 .chunk.js/.bundle.js 文件，这些常包含应用代码与内嵌敏感信息。</p>
                  </div>
                  <Toggle
                    checked={(data as any).jsReconIncludeChunks ?? true}
                    onChange={(checked) => updateField('jsReconIncludeChunks' as any, checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>包含框架 JS</span>
                    <p className={styles.toggleDescription}>抓取 Katana 排除的 Next.js（/_next/static/chunks/）与 Nuxt.js（/_nuxt/）bundle，常包含 API Key 与 Firebase 配置。</p>
                  </div>
                  <Toggle
                    checked={(data as any).jsReconIncludeFrameworkJs ?? true}
                    onChange={(checked) => updateField('jsReconIncludeFrameworkJs' as any, checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>包含归档 JS</span>
                    <p className={styles.toggleDescription}>分析来自 Wayback Machine/GAU 的历史 JS 文件。旧版本常包含已从生产移除的硬编码 Key。需要启用 GAU。</p>
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
                    <span className={styles.toggleLabel}>敏感信息检测（Regex）</span>
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
                    <p className={styles.toggleDescription}>发现暴露的 .map 文件（可能泄露未压缩源码），并扫描其中的敏感信息</p>
                  </div>
                  <Toggle
                    checked={(data as any).jsReconSourceMaps ?? true}
                    onChange={(checked) => updateField('jsReconSourceMaps' as any, checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>Dependency Confusion</span>
                    <p className={styles.toggleDescription}>检查带 scope 的 npm 包（@org/pkg）是否存在于公共仓库；缺失即为严重 RCE 向量</p>
                  </div>
                  <Toggle
                    checked={(data as any).jsReconDependencyCheck ?? true}
                    onChange={(checked) => updateField('jsReconDependencyCheck' as any, checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>端点提取</span>
                    <p className={styles.toggleDescription}>提取 REST/GraphQL/WebSocket 端点、管理/调试路由与 API 文档路径</p>
                  </div>
                  <Toggle
                    checked={(data as any).jsReconExtractEndpoints ?? true}
                    onChange={(checked) => updateField('jsReconExtractEndpoints' as any, checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>DOM Sink 检测</span>
                    <p className={styles.toggleDescription}>定位 innerHTML/eval()/document.write、原型污染等 XSS/注入向量</p>
                  </div>
                  <Toggle
                    checked={(data as any).jsReconDomSinks ?? true}
                    onChange={(checked) => updateField('jsReconDomSinks' as any, checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>框架指纹识别</span>
                    <p className={styles.toggleDescription}>识别 React/Next.js/Vue/Angular/jQuery 等 12 种框架并提取版本，用于 CVE 精准关联</p>
                  </div>
                  <Toggle
                    checked={(data as any).jsReconFrameworkDetect ?? true}
                    onChange={(checked) => updateField('jsReconFrameworkDetect' as any, checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>开发者注释</span>
                    <p className={styles.toggleDescription}>提取 TODO/FIXME/HACK 标记以及包含 password/secret/token 等关键词的注释</p>
                  </div>
                  <Toggle
                    checked={(data as any).jsReconDevComments ?? true}
                    onChange={(checked) => updateField('jsReconDevComments' as any, checked)}
                  />
                </div>
              </div>

              {/* Key Validation */}
              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>密钥校验</h3>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>校验已发现 Key</span>
                    <p className={styles.toggleDescription}>发起真实 API 调用验证 Key 是否有效（AWS STS、GitHub /user、Stripe /v1/account 等），会产生对第三方服务的出站流量。</p>
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
                      <span className={styles.fieldHint}>每个服务的 API 调用超时</span>
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
                        上传自定义文件以扩展内置检测能力（叠加模式，不会替换默认规则）。
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
                    无需爬取即可上传 JS 文件进行分析（来源如 Burp Suite、移动端 APK、DevTools 或需登录的页面）。
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
                    {isUploading ? ' 上传中…' : ' 上传 JS 文件'}
                  </button>

                  {uploadedFiles.length > 0 && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      <p style={{ marginBottom: '4px' }}>已上传 {uploadedFiles.length} 个文件（总计 {(uploadedFiles.reduce((sum, f) => sum + f.size, 0) / 1024).toFixed(0)} KB）</p>
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
            文件未上传：格式与要求不匹配。
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
            点击上传旁的 <HelpCircle size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> 图标查看格式说明与示例。
          </p>
        </div>
      </Modal>
    </div>
  )
}
