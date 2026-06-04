'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ChevronDown, Bug, KeyRound, Mail, Swords, Loader2, Settings, Zap, Database, Code2, Globe, Terminal, FolderTree, Download } from 'lucide-react'
import type { Project } from '@prisma/client'
import { useProject } from '@/providers/ProjectProvider'
import { Toggle } from '@/components/ui/Toggle/Toggle'
import { useAlertModal } from '@/components/ui/AlertModal'
import { WikiInfoButton } from '@/components/ui/WikiInfoButton'
import { HydraSection } from './BruteForceSection'
import { PhishingSection } from './PhishingSection'
import { DosSection } from './DosSection'
import { SqliSection } from './SqliSection'
import { SsrfSection } from './SsrfSection'
import { RceSection } from './RceSection'
import { PathTraversalSection } from './PathTraversalSection'
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
    name: 'CVE (MSF)',
    description: '使用 Metasploit Framework 模块针对目标服务利用已知 CVE',
    icon: <Bug size={16} />,
  },
  {
    id: 'sql_injection',
    name: 'SQL 注入',
    description: '使用 SQLMap 进行 SQL 注入测试，包含 WAF 绕过、盲注与 OOB DNS 外带',
    icon: <Database size={16} />,
  },
  {
    id: 'xss',
    name: '跨站脚本（XSS）',
    description: '使用 dalfox、kxss、Playwright 进行反射型/存储型/DOM 型/盲 XSS 测试，并提供 CSP 绕过指导',
    icon: <Code2 size={16} />,
  },
  {
    id: 'ssrf',
    name: '服务端请求伪造（SSRF）',
    description: 'SSRF 检测、内网探测、云元数据跳板、协议走私、DNS Rebinding，以及 Redis/FastCGI/Docker 的 RCE 链',
    icon: <Globe size={16} />,
  },
  {
    id: 'rce',
    name: '远程代码执行（RCE）',
    description: '覆盖 6 类 RCE/命令注入：Shell 元字符注入（commix）、SSTI（sstimap）、Java/PHP/Python 反序列化（ysoserial）、eval/OGNL/SpEL、媒体处理链 RCE，以及 SSRF→RCE 链',
    icon: <Terminal size={16} />,
  },
  {
    id: 'path_traversal',
    name: '路径穿越 / LFI / RFI',
    description: '通过路径穿越、LFI、RFI 进行任意文件读取；PHP wrapper 链（php://filter、data://、expect://）、日志投毒，以及 Zip Slip 解压测试',
    icon: <FolderTree size={16} />,
  },
  {
    id: 'brute_force_credential_guess',
    name: '口令测试',
    description: '使用 Hydra 针对登录服务进行口令策略验证',
    icon: <KeyRound size={16} />,
  },
  {
    id: 'phishing_social_engineering',
    name: '社工演练',
    description: '用于已授权的安全意识测试：生成 Payload、制作文档与邮件投递',
    icon: <Mail size={16} />,
  },
  {
    id: 'denial_of_service',
    name: '可用性测试（DoS）',
    description: '通过洪泛、资源耗尽与崩溃向量评估服务韧性',
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
    xss: true,
    ssrf: true,
    rce: true,
    path_traversal: true,
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
  const { alertError, alert: showAlert } = useAlertModal()
  const [builtInOpen, setBuiltInOpen] = useState(true)
  const [userOpen, setUserOpen] = useState(true)
  const [userSkills, setUserSkills] = useState<UserSkillDef[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)

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
    if (skillId in config.builtIn) {
      return config.builtIn[skillId] !== false
    }
    // Key missing from saved config: fall back to the shipped default so the
    // UI matches what the Python agent does (get_enabled_builtin_skills is a
    // strict has-key check; missing key = disabled). Without this fallback,
    // legacy projects show new skills as ON in the UI while the agent treats
    // them as OFF, and toggling does not persist until the user explicitly
    // clicks. Default-OFF skills like ssrf are the obvious victim.
    return DEFAULT_CONFIG.builtIn[skillId] ?? false
  }

  const isUserEnabled = (skillId: string) => {
    return config.user[skillId] === true
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

  const downloadSkill = useCallback(async (skillId: string, skillName: string) => {
    if (!userId) return
    try {
      const resp = await fetch(`/api/users/${userId}/attack-skills/${skillId}`)
      if (!resp.ok) return
      const skill = await resp.json()
      const blob = new Blob([skill.content], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${skillName}.md`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download skill:', err)
    }
  }, [userId])

  const importCommunityAgentSkills = useCallback(async () => {
    if (!userId || importing) return
    setImporting(true)
    try {
      const previousIds = new Set(userSkills.map(s => s.id))

      const resp = await fetch(`/api/users/${userId}/attack-skills/import-community`, { method: 'POST' })
      const result = await resp.json()
      if (!resp.ok) {
        alertError(result.error || 'Failed to import community skills')
        return
      }

      const refreshResp = await fetch(`/api/users/${userId}/attack-skills`)
      if (!refreshResp.ok) {
        showAlert(result.message || `Imported ${result.imported ?? 0} community skill(s).`)
        return
      }
      const fresh: UserSkillDef[] = await refreshResp.json()
      setUserSkills(fresh)

      // Enable newly imported skills in THIS project's config (existing ones untouched).
      const newlyImported = fresh.filter(s => !previousIds.has(s.id))
      if (newlyImported.length > 0) {
        const updatedUser = { ...config.user }
        for (const s of newlyImported) updatedUser[s.id] = true
        const newConfig: AttackSkillConfig = { ...config, user: updatedUser }
        updateField('attackSkillConfig', newConfig as unknown as FormData['attackSkillConfig'])
      }

      showAlert(
        `已导入 ${result.imported ?? 0} 个社区技能` +
        (result.skipped ? `，跳过 ${result.skipped} 个重复项` : '') +
        '。新技能已为当前项目启用。'
      )
    } catch (err) {
      console.error('Failed to import community skills:', err)
      alertError('导入社区技能失败')
    } finally {
      setImporting(false)
    }
  }, [userId, importing, userSkills, config, updateField, alertError, showAlert])

  return (
    <>
      {/* Built-in Agent Skills */}
      <div className={styles.section}>
        <div className={styles.sectionHeader} onClick={() => setBuiltInOpen(!builtInOpen)}>
          <h2 className={styles.sectionTitle}>
            <Bug size={16} />
            内置智能体技能
            <WikiInfoButton target="AttackSkills" />
            <span className={styles.badgeActive}>已启用</span>
          </h2>
          <ChevronDown
            size={16}
            className={`${styles.sectionIcon} ${builtInOpen ? styles.sectionIconOpen : ''}`}
          />
        </div>

        {builtInOpen && (
          <div className={styles.sectionContent}>
            <p className={styles.sectionDescription}>
              具有专用工作流的核心智能体技能。关闭某个技能可阻止智能体将请求归类到该技能类型并使用其提示词。
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
                        <span className={styles.badgeActive}>已启用</span>
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
                  {enabled && skill.id === 'ssrf' && (
                    <SsrfSection data={data} updateField={updateField} />
                  )}
                  {enabled && skill.id === 'rce' && (
                    <RceSection data={data} updateField={updateField} />
                  )}
                  {enabled && skill.id === 'path_traversal' && (
                    <PathTraversalSection data={data} updateField={updateField} />
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
            用户智能体技能
            <WikiInfoButton target="https://github.com/samugit83/redamon/wiki/Agent-Skills#community-skills" title="打开社区智能体技能 Wiki 章节" />
          </h2>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <button
              type="button"
              className="secondaryButton"
              onClick={(e) => { e.stopPropagation(); importCommunityAgentSkills() }}
              disabled={importing || !userId}
              title="将全部社区攻击技能导入到你的技能库，并为本项目启用"
            >
              {importing
                ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                : <Download size={14} />}
              从社区导入
            </button>
            <ChevronDown
              size={16}
              className={`${styles.sectionIcon} ${userOpen ? styles.sectionIconOpen : ''}`}
            />
          </div>
        </div>

        {userOpen && (
          <div className={styles.sectionContent}>
            <p className={styles.sectionDescription}>
              从“全局设置”上传的自定义智能体技能。启用某个技能后，智能体可以将请求归类到该技能并使用其工作流。
              新项目默认不启用新导入的技能；可使用上方的“从社区导入”快捷操作批量导入模板并自动为本项目启用。
            </p>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-tertiary)' }}>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> 加载中…
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
                    <div style={{ flex: 1, minWidth: 0 }}>
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
                        {skill.description || (
                          <span style={{ opacity: 0.5, fontStyle: 'italic' }}>暂无描述</span>
                        )}
                      </div>
                      <div style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--text-tertiary)',
                        marginTop: '2px',
                      }}>
                        上传于 {new Date(skill.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="iconButton"
                      title="下载 .md"
                      onClick={() => downloadSkill(skill.id, skill.name)}
                    >
                      <Download size={14} />
                    </button>
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
