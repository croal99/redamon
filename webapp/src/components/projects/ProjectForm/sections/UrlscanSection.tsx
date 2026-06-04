'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, Globe, Info, Play } from 'lucide-react'
import { Toggle, WikiInfoButton } from '@/components/ui'
import type { Project } from '@prisma/client'
import { useProject } from '@/providers/ProjectProvider'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface UrlscanSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  onRun?: () => void
}

export function UrlscanSection({ data, updateField, onRun }: UrlscanSectionProps) {
  const [isOpen, setIsOpen] = useState(true)
  const { userId } = useProject()
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null)

  const checkApiKey = useCallback(() => {
    if (!userId) return
    fetch(`/api/users/${userId}/settings`)
      .then(r => r.ok ? r.json() : null)
      .then(settings => {
        if (settings) {
          setHasApiKey(!!settings.urlscanApiKey)
        }
      })
      .catch(() => setHasApiKey(false))
  }, [userId])

  useEffect(() => { checkApiKey() }, [checkApiKey])

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Globe size={16} />
          URLScan.io 增强
          <NodeInfoTooltip section="Urlscan" />
          <WikiInfoButton target="Urlscan" />
          <span className={styles.badgePassive}>被动</span>
        </h2>
        <div className={styles.sectionHeaderRight}>
          {onRun && data.urlscanEnabled && (
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
              title="运行 URLScan"
            >
              <Play size={10} /> 运行部分侦察
            </button>
          )}
          <div onClick={(e) => e.stopPropagation()}>
            <Toggle
              checked={data.urlscanEnabled}
              onChange={(checked) => updateField('urlscanEnabled', checked)}
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
            使用 URLScan.io 的历史扫描数据进行被动 OSINT 增强。可发现更多子域名、IP、ASN 信息、域名年龄、
            TLS 证书、服务端技术栈与截图等内容——全程不直接触碰目标。运行在域名发现之后、端口扫描之前。
          </p>

          <div className={styles.shodanWarning} style={{ borderColor: 'var(--color-info, #3b82f6)' }}>
            <Info size={14} />
            {hasApiKey
              ? '已配置 URLScan API key —— 可使用更高的速率限制。'
              : '无需 API key 也可使用（仅公共结果）。如需更高速率限制，请在全局设置中添加 key。'}
          </div>

          {data.urlscanEnabled && (
            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>最大结果数</label>
                <input
                  type="number"
                  className="textInput"
                  value={data.urlscanMaxResults}
                  onChange={(e) => updateField('urlscanMaxResults', parseInt(e.target.value) || 50000)}
                  min={1}
                  max={50000}
                />
                <span className={styles.fieldHint}>从 URLScan API 拉取的最大扫描结果数量</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
