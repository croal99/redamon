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
    label:
      '我确认已获得对目标系统进行测试的明确书面授权，并理解未经授权的访问在相关法律（CFAA、《计算机滥用法》等）下属于违法行为。',
  },
  {
    id: 'liability',
    label:
      '我知悉本软件按“现状”提供且不附带任何担保。作者与贡献者对任何损害、数据丢失或法律后果不承担责任。',
  },
  {
    id: 'data-privacy',
    label:
      '我理解侦察数据、凭据与漏洞细节可能会发送给外部 LLM 提供商（OpenAI、Anthropic 等）及第三方服务，且不保证隐私。',
  },
  {
    id: 'data-persistence',
    label:
      '我理解所有数据将长期存储在 Neo4j/PostgreSQL 中且不会自动删除。活动结束后的清理由我负责。',
  },
  {
    id: 'ai-agent',
    label:
      '我理解 AI 代理可自主运行，可能出现不可预期行为，包括范围漂移、服务降级或非预期利用。审批闸门仅为尽力而为的防护措施。',
  },
  {
    id: 'third-party',
    label:
      '我理解我必须遵守随附工具的各项许可证（AGPL-3.0、GPL、MIT 等）以及适用法规（包括出口管制）。',
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

  // 已同意，直接渲染子组件
  console.log('isAccepted', isAccepted)
  return <>{children}</>
  if (isAccepted) {
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
              感谢你下载并安装 <strong>RedAmon</strong>！
            </p>

            <p className={styles.welcomeDesc}>
              <strong>RedAmon</strong> 是一款开源的 AI 渗透测试平台，融合了自动化侦察、基于图谱的攻击面映射与智能代理能力，帮助安全人员从资产摸排到最终交付报告更快、更高效地完成工作。
            </p>

            <div className={styles.missionBox}>
              <p className={styles.missionText}>
                我们致力于保持 RedAmon 持续更新，并把它打造为全球<strong>第一的开源渗透测试平台</strong>。要实现这一目标，需要社区的支持。
              </p>
              <p className={styles.missionText}>
                我们不向你索取金钱，只希望你能在 GitHub 上点一个 ⭐，帮助我们成长、提升可见度并吸引贡献者。如果你愿意进一步参与，欢迎提交 PR 或直接联系维护者。<br />每一份贡献都很重要。
              </p>
              <p className={styles.footerSignature}>
                祝狩猎顺利！<br />Samuele &amp; Ritesh
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
              <span>在 GitHub 上为 RedAmon 点赞（Star）</span>
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
              <h1 className={styles.title}>快速开始 — 第一步</h1>
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
                      <p className={styles.guideStepDesc}>在项目页的用户区域创建你的档案。每个用户可以管理多个相互独立的项目。</p>
                    </div>
                  </div>
                  <div className={styles.guideStep}>
                    <div className={styles.guideStepLeft}>
                      <span className={styles.guideStepNum}>2</span>
                      <FolderPlus size={18} className={styles.guideStepIcon} />
                    </div>
                    <div>
                      <p className={styles.guideStepTitle}>创建项目</p>
                      <p className={styles.guideStepDesc}>创建项目用于聚合一次任务的侦察数据、配置与代理会话，便于统一管理与复盘。</p>
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
                      <p className={styles.guideStepDesc}>在<strong>红区</strong>点击<strong>开始侦察</strong>。在启动 AI 代理前，请等待流水线完整执行结束。</p>
                    </div>
                  </div>
                  <div className={styles.guideStep}>
                    <div className={styles.guideStepLeft}>
                      <span className={styles.guideStepNum}>4</span>
                      <Bot size={18} className={styles.guideStepIcon} />
                    </div>
                    <div>
                      <p className={styles.guideStepTitle}>启动 AI 代理</p>
                      <p className={styles.guideStepDesc}>侦察完成后，切换到<strong>Agent AI</strong>以分析发现、规划攻击路径并生成报告。</p>
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
              在 Wiki 阅读完整使用手册
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
            <h1 className={styles.title}>法律免责声明与使用条款</h1>
          </div>
        </div>

        <div className={styles.body}>
          <p className={styles.intro}>
            <strong>RedAmon</strong> 是一款 AI 驱动的渗透测试平台，仅用于<strong>经授权的安全测试</strong>、<strong>教学用途</strong>与<strong>研究</strong>。在使用本工具前，你必须阅读并接受以下条款。
          </p>

          <div className={styles.linkWrapper}>
            <a
              href={DISCLAIMER_GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.fullDisclaimerLink}
            >
              阅读完整法律免责声明
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
            我已阅读并接受全部条款
          </button>
        </div>
      </div>
    </div>
  )
}
