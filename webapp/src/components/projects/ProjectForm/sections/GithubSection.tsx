'use client'

import { useState } from 'react'
import { ChevronDown, Github, AlertTriangle } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'
import { TimeEstimate } from '../TimeEstimate'
import Link from 'next/link'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface GithubSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  hasGithubToken?: boolean
}

export function GithubSection({ data, updateField, hasGithubToken = false }: GithubSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Github size={16} />
          GitHub 泄露密钥搜寻
          <NodeInfoTooltip section="Github" />
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
            在 GitHub 仓库中搜索与目标域名相关的泄露密钥、API Key 与凭据，识别可能导致未授权访问系统与服务的敏感信息泄露。
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
            <label className={styles.fieldLabel}>目标组织</label>
            <input
              type="text"
              className="textInput"
              value={data.githubTargetOrg}
              onChange={(e) => updateField('githubTargetOrg', e.target.value)}
              placeholder="organization-name"
              disabled={!hasGithubToken}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>目标仓库</label>
            <input
              type="text"
              className="textInput"
              value={data.githubTargetRepos}
              onChange={(e) => updateField('githubTargetRepos', e.target.value)}
              placeholder="repo1, repo2, repo3"
              disabled={!hasGithubToken}
            />
            <span className={styles.fieldHint}>
              逗号分隔。留空表示扫描所有仓库。
            </span>
          </div>

          {hasGithubToken && (
            <>
              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>扫描选项</h3>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>扫描成员仓库</span>
                    <p className={styles.toggleDescription}>包含组织成员的个人仓库</p>
                  </div>
                  <Toggle
                    checked={data.githubScanMembers}
                    onChange={(checked) => updateField('githubScanMembers', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>扫描 Gists</span>
                    <p className={styles.toggleDescription}>在 gists 中搜索泄露密钥</p>
                  </div>
                  <Toggle
                    checked={data.githubScanGists}
                    onChange={(checked) => updateField('githubScanGists', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>扫描提交历史</span>
                    <p className={styles.toggleDescription}>在 commit 历史中搜索泄露密钥</p>
                    <TimeEstimate estimate="开销最大的一项：关闭可节省 50%+ 时间" />
                  </div>
                  <Toggle
                    checked={data.githubScanCommits}
                    onChange={(checked) => updateField('githubScanCommits', checked)}
                  />
                </div>
              </div>

              {data.githubScanCommits && (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>最多扫描提交数</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.githubMaxCommits}
                    onChange={(e) => updateField('githubMaxCommits', parseInt(e.target.value) || 100)}
                    min={1}
                    max={1000}
                  />
                  <span className={styles.fieldHint}>每个仓库最多扫描的 commit 数</span>
                  <TimeEstimate estimate="近似线性增长：100=默认，1000≈慢 10 倍" />
                </div>
              )}

              <div className={styles.toggleRow}>
                <div>
                  <span className={styles.toggleLabel}>输出 JSON</span>
                  <p className={styles.toggleDescription}>将结果保存为 JSON 格式</p>
                </div>
                <Toggle
                  checked={data.githubOutputJson}
                  onChange={(checked) => updateField('githubOutputJson', checked)}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
