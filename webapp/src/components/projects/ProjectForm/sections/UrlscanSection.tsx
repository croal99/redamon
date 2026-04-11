'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, Globe, Info } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { Project } from '@prisma/client'
import { useProject } from '@/providers/ProjectProvider'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface UrlscanSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
}

export function UrlscanSection({ data, updateField }: UrlscanSectionProps) {
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
          URLScan.io 情报增强
          <NodeInfoTooltip section="Urlscan" />
          <span className={styles.badgePassive}>被动</span>
        </h2>
        <div className={styles.sectionHeaderRight}>
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
            使用 URLScan.io 历史扫描数据进行被动 OSINT 情报增强，发现额外的子域名、IP、ASN 信息、域名年龄、
            TLS 证书、服务器技术栈与截图——全程不直接触达目标。执行顺序位于域名发现之后、端口扫描之前。
          </p>

          <div className={styles.shodanWarning} style={{ borderColor: 'var(--color-info, #3b82f6)' }}>
            <Info size={14} />
            {hasApiKey
              ? '已配置 URLScan API Key——将启用更高的速率限制。'
              : '无需 API Key 也可使用（仅公共结果）。如需更高速率限制，请在全局设置中配置 Key。'}
          </div>

          {data.urlscanEnabled && (
            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>最大结果数</label>
                <input
                  type="number"
                  className="textInput"
                  value={data.urlscanMaxResults}
                  onChange={(e) => updateField('urlscanMaxResults', parseInt(e.target.value) || 5000)}
                  min={1}
                  max={10000}
                />
                <span className={styles.fieldHint}>从 URLScan API 拉取的扫描结果上限</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
