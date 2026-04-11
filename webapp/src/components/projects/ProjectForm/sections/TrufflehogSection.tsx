'use client'

import { useState } from 'react'
import { ChevronDown, Search, AlertTriangle } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import Link from 'next/link'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface TrufflehogSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  hasGithubToken?: boolean
}

export function TrufflehogSection({ data, updateField, hasGithubToken = false }: TrufflehogSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  const hasConfig =
    ((data as any).trufflehogGithubOrg ?? '').length > 0 ||
    ((data as any).trufflehogGithubRepos ?? '').length > 0

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Search size={16} />
          TruffleHog 泄露密钥扫描
          <span className={styles.badgePassive}>被动</span>
        </h2>
        <ChevronDown
          size={16}
          className={`${styles.sectionIcon} ${isOpen ? styles.sectionIconOpen : ''}`}
        />
      </div>

      {isOpen && (
        <div className={styles.sectionContent}>
          <p className={styles.sectionDescription}>
            使用 700+ 探测器进行深度密钥扫描，并可选对真实 API 做有效性校验。
          </p>

          {!hasGithubToken && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '8px',
              marginBottom: '12px',
            }}>
              <AlertTriangle size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                需要 GitHub Access Token。{' '}
                <Link href="/settings" style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>
                  请在全局设置中配置
                </Link>
              </span>
            </div>
          )}

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>GitHub 组织</label>
            <input
              type="text"
              className="textInput"
              value={(data as any).trufflehogGithubOrg ?? ''}
              onChange={(e) => updateField('trufflehogGithubOrg' as any, e.target.value)}
              placeholder="organization-name"
              disabled={!hasGithubToken}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>GitHub 仓库</label>
            <input
              type="text"
              className="textInput"
              value={(data as any).trufflehogGithubRepos ?? ''}
              onChange={(e) => updateField('trufflehogGithubRepos' as any, e.target.value)}
              placeholder="org/repo1, org/repo2"
              disabled={!hasGithubToken}
            />
            <span className={styles.fieldHint}>
              逗号分隔。支持完整 URL 或 org/repo 格式。
            </span>
          </div>

          {hasConfig && hasGithubToken && (
            <>
              <div className={styles.toggleRow}>
                <div>
                  <span className={styles.toggleLabel}>仅输出已验证密钥</span>
                  <p className={styles.toggleDescription}>只输出经真实 API 校验为有效的密钥</p>
                </div>
                <Toggle
                  checked={(data as any).trufflehogOnlyVerified ?? false}
                  onChange={(checked) => updateField('trufflehogOnlyVerified' as any, checked)}
                />
              </div>

              <div className={styles.toggleRow}>
                <div>
                  <span className={styles.toggleLabel}>跳过校验</span>
                  <p className={styles.toggleDescription}>跳过 API 校验以加快扫描速度</p>
                </div>
                <Toggle
                  checked={(data as any).trufflehogNoVerification ?? false}
                  onChange={(checked) => updateField('trufflehogNoVerification' as any, checked)}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>并发</label>
                <input
                  type="number"
                  className="textInput"
                  value={(data as any).trufflehogConcurrency ?? 8}
                  onChange={(e) => updateField('trufflehogConcurrency' as any, parseInt(e.target.value) || 8)}
                  min={1}
                  max={32}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>包含探测器</label>
                <input
                  type="text"
                  className="textInput"
                  value={(data as any).trufflehogIncludeDetectors ?? ''}
                  onChange={(e) => updateField('trufflehogIncludeDetectors' as any, e.target.value)}
                  placeholder="AWS,GitHub,Slack"
                />
                <span className={styles.fieldHint}>
                  逗号分隔，例如 AWS,GitHub,Slack。留空表示全部。
                </span>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>排除探测器</label>
                <input
                  type="text"
                  className="textInput"
                  value={(data as any).trufflehogExcludeDetectors ?? ''}
                  onChange={(e) => updateField('trufflehogExcludeDetectors' as any, e.target.value)}
                  placeholder="DetectorName1,DetectorName2"
                />
                <span className={styles.fieldHint}>
                  逗号分隔要跳过的探测器
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
