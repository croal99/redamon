'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronDown, Shield, Search, Loader2, X } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface CypherFixSettingsSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
}

interface ModelOption {
  id: string
  name: string
  context_length: number | null
  description: string
}

function formatContextLength(ctx: number | null): string {
  if (!ctx) return ''
  if (ctx >= 1_000_000) return `${(ctx / 1_000_000).toFixed(1)}M`
  if (ctx >= 1_000) return `${Math.round(ctx / 1_000)}K`
  return String(ctx)
}

function getDisplayName(modelId: string, allModels: Record<string, ModelOption[]>): string {
  for (const models of Object.values(allModels)) {
    const found = models.find(m => m.id === modelId)
    if (found) return found.name
  }
  return modelId
}

export function CypherFixSettingsSection({ data, updateField }: CypherFixSettingsSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  // Model selector state
  const [allModels, setAllModels] = useState<Record<string, ModelOption[]>>({})
  const [modelsLoading, setModelsLoading] = useState(true)
  const [modelsError, setModelsError] = useState(false)
  const [search, setSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch models on mount
  useEffect(() => {
    fetch('/api/models')
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch')
        return r.json()
      })
      .then(data => {
        if (data && typeof data === 'object' && !data.error) {
          setAllModels(data)
        } else {
          setModelsError(true)
        }
      })
      .catch(() => setModelsError(true))
      .finally(() => setModelsLoading(false))
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectModel = useCallback((id: string) => {
    updateField('cypherfixLlmModel', id)
    setDropdownOpen(false)
    setSearch('')
  }, [updateField])

  const clearModel = useCallback(() => {
    updateField('cypherfixLlmModel', '')
    setDropdownOpen(false)
    setSearch('')
  }, [updateField])

  // Filter models by search
  const filteredModels: Record<string, ModelOption[]> = {}
  const lowerSearch = search.toLowerCase()
  for (const [provider, models] of Object.entries(allModels)) {
    const filtered = models.filter(m =>
      m.id.toLowerCase().includes(lowerSearch) ||
      m.name.toLowerCase().includes(lowerSearch) ||
      m.description.toLowerCase().includes(lowerSearch)
    )
    if (filtered.length > 0) filteredModels[provider] = filtered
  }

  const hasOverride = !!data.cypherfixLlmModel

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Shield size={16} />
          CypherFix 设置
        </h2>
        <ChevronDown
          size={16}
          className={`${styles.sectionIcon} ${isOpen ? styles.sectionIconOpen : ''}`}
        />
      </div>

      {isOpen && (
        <div className={styles.sectionContent}>
          <p className={styles.sectionDescription}>
            配置自动化代码修复。CypherFix 会分析你的 Neo4j 图谱中的漏洞，
            并通过向 GitHub 仓库发起 Pull Request 的方式生成修复补丁。
          </p>

          {/* GitHub Token */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>GitHub 令牌（CypherFix）</label>
            <input
              type="password"
              className="textInput"
              value={data.cypherfixGithubToken}
              onChange={(e) => updateField('cypherfixGithubToken', e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
            />
            <span className={styles.fieldHint}>
              需要带 <code>repo</code> 权限的 Personal Access Token。用于克隆仓库、推送分支与创建 PR。
            </span>
          </div>

          {/* Default Repository */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>默认仓库</label>
            <input
              type="text"
              className="textInput"
              value={data.cypherfixDefaultRepo}
              onChange={(e) => updateField('cypherfixDefaultRepo', e.target.value)}
              placeholder="owner/repo"
            />
            <span className={styles.fieldHint}>
              要修复的 GitHub 仓库（owner/repo 格式）。可在每次修复任务中单独覆盖。
            </span>
          </div>

          {/* Default Branch */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>默认分支</label>
            <input
              type="text"
              className="textInput"
              value={data.cypherfixDefaultBranch}
              onChange={(e) => updateField('cypherfixDefaultBranch', e.target.value)}
              placeholder="main"
            />
            <span className={styles.fieldHint}>
              创建修复分支时所基于的分支（默认：main）。
            </span>
          </div>

          {/* Branch Prefix */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>分支前缀</label>
            <input
              type="text"
              className="textInput"
              value={data.cypherfixBranchPrefix}
              onChange={(e) => updateField('cypherfixBranchPrefix', e.target.value)}
              placeholder="cypherfix/"
            />
            <span className={styles.fieldHint}>
              修复分支名称前缀（例如：cypherfix/rem-abc123）。
            </span>
          </div>

          {/* Require Approval */}
          <div className={styles.toggleRow}>
            <div>
              <span className={styles.toggleLabel}>需要确认</span>
              <p className={styles.toggleDescription}>
                每次应用代码修改前暂停并等待用户确认。生产仓库建议开启。
              </p>
            </div>
            <Toggle
              checked={data.cypherfixRequireApproval}
              onChange={(checked) => updateField('cypherfixRequireApproval', checked)}
            />
          </div>

          {/* LLM Model Override — searchable dropdown */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>LLM 模型覆盖</label>
            <div className={styles.modelSelector} ref={dropdownRef}>
              <div
                className={`${styles.modelSelectorInput} ${dropdownOpen ? styles.modelSelectorInputFocused : ''}`}
                onClick={() => {
                  setDropdownOpen(true)
                  setTimeout(() => inputRef.current?.focus(), 0)
                }}
              >
                {dropdownOpen ? (
                  <input
                    ref={inputRef}
                    className={styles.modelSearchInput}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="搜索模型..."
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setDropdownOpen(false)
                        setSearch('')
                      }
                    }}
                  />
                ) : (
                  <span className={styles.modelSelectedText} style={!hasOverride ? { opacity: 0.5 } : undefined}>
                    {modelsLoading
                      ? '正在加载模型...'
                      : hasOverride
                        ? getDisplayName(data.cypherfixLlmModel, allModels)
                        : `使用代理行为（Agent Behaviour）模型（${getDisplayName(data.agentOpenaiModel, allModels)}）`
                    }
                  </span>
                )}
                {modelsLoading ? (
                  <Loader2 size={12} className={styles.modelSelectorSpinner} />
                ) : hasOverride && !dropdownOpen ? (
                  <X
                    size={12}
                    className={styles.modelSelectorIcon}
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      clearModel()
                    }}
                  />
                ) : (
                  <Search size={12} className={styles.modelSelectorIcon} />
                )}
              </div>

              {dropdownOpen && (
                <div className={styles.modelDropdown}>
                  {/* Use default option */}
                  <div
                    className={`${styles.modelOption} ${!hasOverride ? styles.modelOptionSelected : ''}`}
                    onClick={clearModel}
                  >
                    <div className={styles.modelOptionMain}>
                      <span className={styles.modelOptionName} style={{ fontStyle: 'italic' }}>
                        使用代理行为（Agent Behaviour）模型（{getDisplayName(data.agentOpenaiModel, allModels)}）
                      </span>
                    </div>
                  </div>

                  {modelsError ? (
                    <div className={styles.modelDropdownEmpty}>
                      <span>模型加载失败。可手动输入模型 ID：</span>
                      <input
                        className="textInput"
                        type="text"
                        value={data.cypherfixLlmModel}
                        onChange={(e) => updateField('cypherfixLlmModel', e.target.value)}
                        placeholder="e.g. claude-opus-4-6, gpt-5.2, openrouter/meta-llama/llama-4-maverick"
                        style={{ marginTop: 'var(--space-1)' }}
                      />
                    </div>
                  ) : Object.keys(filteredModels).length === 0 ? (
                    <div className={styles.modelDropdownEmpty}>
                      {search ? `没有匹配 "${search}" 的模型` : '未配置任何提供方'}
                    </div>
                  ) : (
                    Object.entries(filteredModels).map(([provider, models]) => (
                      <div key={provider} className={styles.modelGroup}>
                        <div className={styles.modelGroupHeader}>{provider}</div>
                        {models.map(model => (
                          <div
                            key={model.id}
                            className={`${styles.modelOption} ${model.id === data.cypherfixLlmModel ? styles.modelOptionSelected : ''}`}
                            onClick={() => selectModel(model.id)}
                          >
                            <div className={styles.modelOptionMain}>
                              <span className={styles.modelOptionName}>{model.name}</span>
                              {model.context_length && (
                                <span className={styles.modelOptionCtx}>{formatContextLength(model.context_length)}</span>
                              )}
                            </div>
                            {model.description && (
                              <span className={styles.modelOptionDesc}>{model.description}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <span className={styles.fieldHint}>
              覆盖 CypherFix 代理使用的 LLM 模型。留空则使用“代理行为（Agent Behaviour）”中选择的模型。
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
