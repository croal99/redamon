'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import {
  ShieldAlert, ExternalLink, Star, Github,
  Rocket, UserPlus, FolderPlus,
  Bot, Play, BookOpen,
} from 'lucide-react'
import {
  DISCLAIMER_VERSION,
  DISCLAIMER_STORAGE_KEY,
  DISCLAIMER_GITHUB_URL,
  REDAMON_GITHUB_URL,
  WIKI_URL,
} from '@/lib/disclaimerVersion'
import styles from './DisclaimerGate.module.css'

interface DisclaimerGateProps {
  children: React.ReactNode
}

interface StoredAcceptance {
  version: string
  acceptedAt: string
}

const CHECKBOXES = [
  {
    id: 'authorization',
    // EN: I confirm I have explicit written authorization to test target systems and understand unauthorized access is illegal under CFAA, Computer Misuse Act, and equivalent laws.
    label:
      '我确认已获得对目标系统进行测试的明确书面授权，并理解未经授权的访问在 CFAA、《计算机滥用法》及同等法律下属于违法行为。',
  },
  {
    id: 'liability',
    // EN: I acknowledge this software is provided "AS IS" with no warranty. Authors and contributors bear no liability for any damages, data loss, or legal consequences.
    label:
      '我知悉本软件按"原样"提供，不作任何担保。作者和贡献者对任何损害、数据丢失或法律后果不承担任何责任。',
  },
  {
    id: 'data-privacy',
    // EN: I understand that reconnaissance data, credentials, and vulnerability details are transmitted to external LLM providers (OpenAI, Anthropic, etc.) and third-party services with no privacy guarantee.
    label:
      '我理解侦察数据、凭据和漏洞详情将传输给外部 LLM 提供商（OpenAI、Anthropic 等）及第三方服务，且无隐私保证。',
  },
  {
    id: 'data-persistence',
    // EN: I understand all data is stored indefinitely in Neo4j/PostgreSQL with no automatic deletion. I am responsible for cleanup after engagements.
    label:
      '我理解所有数据将无限期存储在 Neo4j/PostgreSQL 中，不会自动删除。我负责在项目结束后进行清理。',
  },
  {
    id: 'ai-agent',
    // EN: I understand the AI agent operates autonomously and may take unexpected actions including scope drift, service degradation, or unintended exploitation. Approval gates are best-effort safeguards.
    label:
      '我理解 AI 智能体自主运行，可能采取意外操作，包括范围漂移、服务降级或非预期的漏洞利用。审批关卡仅为尽力而为的安全措施。',
  },
  {
    id: 'third-party',
    // EN: I understand I must comply with licenses of all bundled tools (AGPL-3.0, GPL, MIT, etc.) and applicable regulations including export controls.
    label:
      '我理解我必须遵守所有捆绑工具的许可证（AGPL-3.0、GPL、MIT 等）以及包括出口管制在内的适用法规。',
  },
] as const

export function DisclaimerGate({ children }: DisclaimerGateProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAccepted, setIsAccepted] = useState(false)
  const [step, setStep] = useState<'welcome' | 'disclaimer' | 'guide'>('welcome')
  const [checked, setChecked] = useState<boolean[]>(
    () => new Array(CHECKBOXES.length).fill(false)
  )

  useEffect(() => {
    try {
      const stored = localStorage.getItem(DISCLAIMER_STORAGE_KEY)
      if (stored) {
        const parsed: StoredAcceptance = JSON.parse(stored)
        if (parsed.version === DISCLAIMER_VERSION) {
          setIsAccepted(true)
        }
      }
    } catch {
      // localStorage unavailable or corrupted — show the gate
    }
    setIsLoading(false)
  }, [])

  const handleToggle = useCallback((index: number) => {
    setChecked((prev) => {
      const next = [...prev]
      next[index] = !next[index]
      return next
    })
  }, [])

  const handleAccept = useCallback(() => {
    try {
      const value: StoredAcceptance = {
        version: DISCLAIMER_VERSION,
        acceptedAt: new Date().toISOString(),
      }
      localStorage.setItem(DISCLAIMER_STORAGE_KEY, JSON.stringify(value))
    } catch {
      // localStorage unavailable — acceptance lasts this session only
    }
    setIsAccepted(true)
  }, [])

  const allChecked = checked.every(Boolean)

  if (isLoading) {
    return null
  }

  if (isAccepted) {
    return <>{children}</>
  }

  if (step === 'welcome') {
    return (
      <div className={styles.overlay}>
        <div className={styles.card}>
          <Image src="/logo.png" alt="" aria-hidden width={520} height={520} className={styles.eyeBg} />
          <div className={styles.welcomeHeader}>
            <Image src="/logo.png" alt="RedAmon" width={36} height={36} style={{ objectFit: 'contain' }} />
            <h1 className={styles.welcomeTitle}>
              欢迎使用 <span className={styles.logoAccent}>Red</span>Amon
            </h1>
          </div>

          <div className={styles.body}>
            <p className={styles.welcomeThank}>
              感谢您下载并安装 <strong>RedAmon</strong>！
            </p>

            <p className={styles.welcomeDesc}>
              <strong>RedAmon</strong> 是一个开源的 AI 驱动渗透测试平台，集成了自主侦察、
              基于图谱的攻击面映射和智能体，帮助安全专业人员从初始足迹收集到完整项目报告，
              更快更智能地完成工作。
            </p>

            <div className={styles.missionBox}>
              <p className={styles.missionText}>
                我们的承诺是让 RedAmon 始终保持最新，并使其成为
                全球<strong>排名第一的开源渗透测试平台</strong>。为此，我们需要社区的帮助。
              </p>
              <p className={styles.missionText}>
                我们不求资金，只求一个 ⭐ GitHub Star 来帮助我们成长、获得关注并吸引贡献者。如果您愿意更进一步，欢迎提交 Pull Request 或直接联系维护者。<br />每一份贡献都很重要。
              </p>
              <p className={styles.footerSignature}>
                祝狩猎愉快！<br />Samuele &amp; Ritesh
              </p>
            </div>

            <a
              href={REDAMON_GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.starLink}
            >
              <Github size={20} />
              <Star size={18} className={styles.starIcon} />
              <span>在 GitHub 上为 RedAmon 点 Star</span>
              <ExternalLink size={13} className={styles.starExternal} />
            </a>
          </div>

          <div className={styles.footer}>
            <p className={styles.footerQuote}>
              &ldquo;开源是人类最伟大的协作实验。&rdquo;
            </p>
            <button
              className={styles.acceptButton}
              onClick={() => setStep('disclaimer')}
            >
              好的，继续
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'guide') {
    return (
      <div className={styles.overlay}>
        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <Rocket size={20} className={styles.headerIcon} />
              <h1 className={styles.title}>入门指南 — 您的第一步</h1>
            </div>
          </div>

          <div className={styles.body}>
            <div className={styles.guideGroups}>
              {/* Setup group */}
              <div className={styles.guideGroup}>
                <p className={styles.guideGroupLabel}>设置</p>
                <div className={styles.guideSteps}>
                  <div className={styles.guideStep}>
                    <div className={styles.guideStepLeft}>
                      <span className={styles.guideStepNum}>1</span>
                      <UserPlus size={18} className={styles.guideStepIcon} />
                    </div>
                    <div>
                      <p className={styles.guideStepTitle}>创建用户</p>
                      <p className={styles.guideStepDesc}>前往用户面板创建您的个人资料。每个用户可以管理多个独立的项目。</p>
                    </div>
                  </div>
                  <div className={styles.guideStep}>
                    <div className={styles.guideStepLeft}>
                      <span className={styles.guideStepNum}>2</span>
                      <FolderPlus size={18} className={styles.guideStepIcon} />
                    </div>
                    <div>
                      <p className={styles.guideStepTitle}>创建项目</p>
                      <p className={styles.guideStepDesc}>设置一个项目来分组管理单个项目的所有侦察数据、设置和智能体会话。</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Run group */}
              <div className={styles.guideGroup}>
                <p className={styles.guideGroupLabel}>运行</p>
                <div className={styles.guideSteps}>
                  <div className={styles.guideStep}>
                    <div className={styles.guideStepLeft}>
                      <span className={styles.guideStepNum}>3</span>
                      <Play size={18} className={styles.guideStepIcon} />
                    </div>
                    <div>
                      <p className={styles.guideStepTitle}>启动侦察流水线</p>
                      <p className={styles.guideStepDesc}>在<strong>红区</strong>中点击<strong>启动侦察</strong>。等待流水线完全完成后再启动 AI 智能体。</p>
                    </div>
                  </div>
                  <div className={styles.guideStep}>
                    <div className={styles.guideStepLeft}>
                      <span className={styles.guideStepNum}>4</span>
                      <Bot size={18} className={styles.guideStepIcon} />
                    </div>
                    <div>
                      <p className={styles.guideStepTitle}>启动 AI 智能体</p>
                      <p className={styles.guideStepDesc}>侦察完成后，切换到<strong>智能体 AI</strong>以查询发现、规划攻击路径和生成报告。</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.footer}>
            <a
              href={WIKI_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.fullDisclaimerLink}
            >
              <BookOpen size={14} />
              阅读完整手册
              <ExternalLink size={12} />
            </a>
            <button className={styles.acceptButton} onClick={handleAccept}>
              开始使用 →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <ShieldAlert size={22} className={styles.headerIcon} />
            <h1 className={styles.title}>法律声明与使用条款</h1>
          </div>
        </div>

        <div className={styles.body}>
          <p className={styles.intro}>
            <strong>RedAmon</strong> 是一个 AI 驱动的渗透测试
            平台，仅限用于<strong>授权安全测试</strong>、
            <strong>教育目的</strong>和<strong>研究</strong>。
            在使用本工具之前，您必须阅读并接受以下条款。
          </p>

          <div className={styles.linkWrapper}>
            <a
              href={DISCLAIMER_GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.fullDisclaimerLink}
            >
              阅读完整法律声明
              <ExternalLink size={13} />
            </a>
          </div>

          <div className={styles.checkboxList}>
            {CHECKBOXES.map((item, index) => (
              <label key={item.id} className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={checked[index]}
                  onChange={() => handleToggle(index)}
                  className={styles.checkbox}
                />
                <span className={styles.checkboxLabel}>{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.footer}>
          <button
            className={styles.acceptButton}
            disabled={!allChecked}
            onClick={() => setStep('guide')}
          >
            我接受所有条款
          </button>
        </div>
      </div>
    </div>
  )
}
