'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ChevronDown, Bug, KeyRound, Mail, Swords, Loader2, Settings, Zap, Database } from 'lucide-react'
import type { Project } from '@prisma/client'
import { useProject } from '@/providers/ProjectProvider'
import { Toggle } from '@/components/ui/Toggle/Toggle'
import { HydraSection } from './BruteForceSection'
import { PhishingSection } from './PhishingSection'
import { DosSection } from './DosSection'
import { SqliSection } from './SqliSection'
import styles from '../ProjectForm.module.css'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface AttackSkillsSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
}

interface BuiltInSkillDef {
  id: string
  name: string
  description: string
  icon: React.ReactNode
}

interface UserSkillDef {
  id: string
  name: string
  description?: string | null
  createdAt: string
}

const BUILT_IN_SKILLS: BuiltInSkillDef[] = [
  {
    id: 'cve_exploit',
    name: 'CVE 利用（MSF）',
    description: '使用 Metasploit Framework 模块对目标服务的已知 CVE 进行利用测试',
    icon: <Bug size={16} />,
  },
  {
    id: 'sql_injection',
    name: 'SQL 注入',
    description: '使用 SQLMap 进行注入测试，支持 WAF 绕过、盲注与 OOB DNS 外带等场景',
    icon: <Database size={16} />,
  },
  {
    id: 'brute_force_credential_guess',
    name: '凭据测试',
    description: '使用 Hydra 对登录服务进行口令策略与弱口令测试（仅限已授权场景）',
    icon: <KeyRound size={16} />,
  },
  {
    id: 'phishing_social_engineering',
    name: '社会工程模拟',
    description: '用于已授权的安全意识测试：生成 payload、制作文档并通过邮件投递',
    icon: <Mail size={16} />,
  },
  {
    id: 'denial_of_service',
    name: '可用性测试',
    description: '通过洪泛、资源耗尽与崩溃向量评估服务韧性（仅限已授权场景）',
    icon: <Zap size={16} />,
  },
]

type AttackSkillConfig = {
  builtIn: Record<string, boolean>
  user: Record<string, boolean>
}

const DEFAULT_CONFIG: AttackSkillConfig = {
  builtIn: {
    cve_exploit: true,
    sql_injection: true,
    brute_force_credential_guess: false,
    phishing_social_engineering: false,
    denial_of_service: false,
  },
  user: {},
}

function getConfig(data: FormData): AttackSkillConfig {
  const raw = data.attackSkillConfig as unknown
  if (raw && typeof raw === 'object' && 'builtIn' in (raw as Record<string, unknown>)) {
    return raw as AttackSkillConfig
  }
  return DEFAULT_CONFIG
}

export function AttackSkillsSection({ data, updateField }: AttackSkillsSectionProps) {
  const { userId } = useProject()
  const [builtInOpen, setBuiltInOpen] = useState(true)
  const [userOpen, setUserOpen] = useState(true)
  const [userSkills, setUserSkills] = useState<UserSkillDef[]>([])
  const [loading, setLoading] = useState(true)

  const config = getConfig(data)

  // Fetch available user skills
  const fetchUserSkills = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    try {
      const resp = await fetch(`/api/users/${userId}/attack-skills`)
      if (resp.ok) setUserSkills(await resp.json())
    } catch (err) {
      console.error('Failed to fetch user attack skills:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { fetchUserSkills() }, [fetchUserSkills])

  const isBuiltInEnabled = (skillId: string) => {
    return config.builtIn[skillId] !== false
  }

  const isUserEnabled = (skillId: string) => {
    return config.user[skillId] !== false
  }

  const toggleBuiltIn = (skillId: string, enabled: boolean) => {
    const newConfig: AttackSkillConfig = {
      ...config,
      builtIn: { ...config.builtIn, [skillId]: enabled },
    }
    // Sync hydraEnabled with brute force master toggle
    if (skillId === 'brute_force_credential_guess') {
      updateField('hydraEnabled', enabled)
    }
    updateField('attackSkillConfig', newConfig as unknown as FormData['attackSkillConfig'])
  }

  const toggleUser = (skillId: string, enabled: boolean) => {
    const newConfig: AttackSkillConfig = {
      ...config,
      user: { ...config.user, [skillId]: enabled },
    }
    updateField('attackSkillConfig', newConfig as unknown as FormData['attackSkillConfig'])
  }

  return (
    <>
      {/* Built-in Agent Skills */}
      <div className={styles.section}>
        <div className={styles.sectionHeader} onClick={() => setBuiltInOpen(!builtInOpen)}>
          <h2 className={styles.sectionTitle}>
            <Bug size={16} />
            内置代理技能
            <span className={styles.badgeActive}>主动</span>
          </h2>
          <ChevronDown
            size={16}
            className={`${styles.sectionIcon} ${builtInOpen ? styles.sectionIconOpen : ''}`}
          />
        </div>

        {builtInOpen && (
          <div className={styles.sectionContent}>
            <p className={styles.sectionDescription}>
              核心代理技能（含专用工作流）。关闭某个技能后，代理将不会把请求归类到该技能，也不会使用其对应提示词与流程。
            </p>

            {BUILT_IN_SKILLS.map(skill => {
              const enabled = isBuiltInEnabled(skill.id)
              return (
                <div
                  key={skill.id}
                  style={{
                    marginBottom: 'var(--space-4)',
                    opacity: enabled ? 1 : 0.5,
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    marginBottom: enabled ? 'var(--space-3)' : 0,
                    padding: 'var(--space-3)',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-default)',
                  }}>
                    <Toggle
                      checked={enabled}
                      onChange={(v) => toggleBuiltIn(skill.id, v)}
                      size="large"
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-1-5)',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 'var(--font-semibold)',
                        color: 'var(--text-primary)',
                      }}>
                        {skill.icon}
                        {skill.name}
                        <span className={styles.badgeActive}>主动</span>
                      </div>
                      <div style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--text-tertiary)',
                        marginTop: '2px',
                      }}>
                        {skill.description}
                      </div>
                    </div>
                  </div>

                  {/* Sub-settings rendered when skill is ON */}
                  {enabled && skill.id === 'brute_force_credential_guess' && (
                    <HydraSection data={data} updateField={updateField} />
                  )}
                  {enabled && skill.id === 'phishing_social_engineering' && (
                    <PhishingSection data={data} updateField={updateField} />
                  )}
                  {enabled && skill.id === 'denial_of_service' && (
                    <DosSection data={data} updateField={updateField} />
                  )}
                  {enabled && skill.id === 'sql_injection' && (
                    <SqliSection data={data} updateField={updateField} />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* User Agent Skills */}
      <div className={styles.section}>
        <div className={styles.sectionHeader} onClick={() => setUserOpen(!userOpen)}>
          <h2 className={styles.sectionTitle}>
            <Swords size={16} />
            用户代理技能
          </h2>
          <ChevronDown
            size={16}
            className={`${styles.sectionIcon} ${userOpen ? styles.sectionIconOpen : ''}`}
          />
        </div>

        {userOpen && (
          <div className={styles.sectionContent}>
            <p className={styles.sectionDescription}>
              从“全局设置”上传的自定义代理技能。启用后，代理可将请求归类到该技能并执行其工作流。
            </p>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-tertiary)' }}>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> 加载中...
              </div>
            ) : userSkills.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: 'var(--space-6) var(--space-4)',
                color: 'var(--text-tertiary)',
                fontSize: 'var(--text-sm)',
              }}>
                <p style={{ marginBottom: 'var(--space-3)' }}>
                  暂无已上传的用户技能。请在“全局设置”中上传 <code>.md</code> 技能文件以创建自定义攻击工作流。
                </p>
                <Link
                  href="/settings"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 'var(--space-1-5)',
                    padding: 'var(--space-2) var(--space-3)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--font-medium)',
                    color: 'var(--text-primary)',
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-default)',
                    textDecoration: 'none',
                    transition: 'var(--transition-all)',
                  }}
                >
                  <Settings size={13} />
                  前往全局设置
                </Link>
              </div>
            ) : (
              userSkills.map(skill => {
                const enabled = isUserEnabled(skill.id)
                return (
                  <div
                    key={skill.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-3)',
                      marginBottom: 'var(--space-2)',
                      padding: 'var(--space-3)',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-default)',
                      opacity: enabled ? 1 : 0.5,
                      transition: 'opacity 0.2s ease',
                    }}
                  >
                    <Toggle
                      checked={enabled}
                      onChange={(v) => toggleUser(skill.id, v)}
                      size="large"
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-1-5)',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 'var(--font-semibold)',
                        color: 'var(--text-primary)',
                      }}>
                        <Swords size={14} />
                        {skill.name}
                      </div>
                      <div style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--text-tertiary)',
                        marginTop: '2px',
                      }}>
                        上传于 {new Date(skill.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </>
  )
}
