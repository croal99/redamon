'use client'

import { useState, useCallback } from 'react'
import { Download, Copy, Check, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react'
import { Modal } from '@/components/ui/Modal/Modal'
import { useVersionCheck } from '@/hooks/useVersionCheck'
import type { ChangelogEntry } from '@/lib/parseChangelog'
import styles from './UpdateNotification.module.css'

function ChangelogDisplay({ changelog }: { changelog: ChangelogEntry[] }) {
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(
    new Set(changelog.length > 0 ? [changelog[0].version] : [])
  )

  const toggleVersion = (version: string) => {
    setExpandedVersions(prev => {
      const next = new Set(prev)
      if (next.has(version)) next.delete(version)
      else next.add(version)
      return next
    })
  }

  if (changelog.length === 0) return null

  return (
    <div className={styles.changelog}>
      <h3 className={styles.changelogTitle}>更新内容</h3>
      <div className={styles.changelogList}>
        {changelog.map(entry => {
          const isExpanded = expandedVersions.has(entry.version)
          return (
            <div key={entry.version} className={styles.changelogEntry}>
              <button
                type="button"
                className={styles.changelogVersionHeader}
                onClick={() => toggleVersion(entry.version)}
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className={styles.changelogVersion}>v{entry.version}</span>
                <span className={styles.changelogDate}>{entry.date}</span>
              </button>
              {isExpanded && (
                <div className={styles.changelogSections}>
                  {entry.sections.map(section => (
                    <div key={section.title} className={styles.changelogSection}>
                      <h4 className={styles.sectionTitle}>{section.title}</h4>
                      <ul className={styles.sectionItems}>
                        {section.items.map((item, i) => (
                          <li key={i} className={styles.sectionItem}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [command])

  return (
    <div className={styles.commandBlock}>
      <code className={styles.commandText}>{command}</code>
      <button
        type="button"
        className={styles.copyButton}
        onClick={handleCopy}
        title="复制命令"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  )
}

export function UpdateNotification() {
  const {
    currentVersion,
    latestVersion,
    changelog,
    updateAvailable,
    isDismissed,
    dismissUpdate,
  } = useVersionCheck()

  const showModal = updateAvailable && !isDismissed

  if (!showModal) return null

  return (
    <Modal
      isOpen
      onClose={dismissUpdate}
      title="发现新版本"
      size="large"
      footer={
        <div className={styles.footer}>
          <a
            href="https://github.com/samugit83/redamon/blob/master/CHANGELOG.md"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.releasesLink}
          >
            <ExternalLink size={14} />
            更新日志
          </a>
          <button type="button" className={styles.laterButton} onClick={dismissUpdate}>
            稍后
          </button>
        </div>
      }
    >
      <div className={styles.content}>
        <div className={styles.versionInfo}>
          <Download size={20} className={styles.downloadIcon} />
          <div>
            <p className={styles.versionText}>
              RedAmon <strong>v{latestVersion}</strong> 已发布。
              您当前运行的是 <strong>v{currentVersion}</strong>。
            </p>
          </div>
        </div>

        <ChangelogDisplay changelog={changelog} />

        <div className={styles.updateSection}>
          <p className={styles.updateLabel}>在终端中运行以下命令进行更新：</p>
          <CopyCommand command="./redamon.sh update" />
        </div>
      </div>
    </Modal>
  )
}
