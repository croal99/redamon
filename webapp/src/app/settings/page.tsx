'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, Pencil, Trash2, Loader2, Eye, EyeOff, Upload, Download, Swords, RotateCw, Copy, Check, ExternalLink, ChevronDown, ChevronRight, Info, BookOpen } from 'lucide-react'
import { useProject } from '@/providers/ProjectProvider'
import { useVersionCheck } from '@/hooks/useVersionCheck'
import { LlmProviderForm } from '@/components/settings/LlmProviderForm'
import type { ProviderData } from '@/components/settings/LlmProviderForm'
import { PROVIDER_TYPES } from '@/lib/llmProviderPresets'
import { Modal } from '@/components/ui/Modal/Modal'
import { useAlertModal, useToast } from '@/components/ui'
import styles from '@/components/settings/Settings.module.css'
import { buildTemplate, templateToJson, validateAndParse, isValidationError } from '@/lib/apiKeysTemplate'
import type { ParsedImport } from '@/lib/apiKeysTemplate'

interface UserSettings {
  githubAccessToken: string
  tavilyApiKey: string
  shodanApiKey: string
  serpApiKey: string
  nvdApiKey: string
  vulnersApiKey: string
  urlscanApiKey: string
  censysApiToken: string
  censysOrgId: string
  fofaApiKey: string
  otxApiKey: string
  netlasApiKey: string
  virusTotalApiKey: string
  zoomEyeApiKey: string
  criminalIpApiKey: string
  quakeApiKey: string
  hunterApiKey: string
  publicWwwApiKey: string
  hunterHowApiKey: string
  googleApiKey: string
  googleApiCx: string
  onypheApiKey: string
  driftnetApiKey: string
  wpscanApiToken: string
  ngrokAuthtoken: string
  chiselServerUrl: string
  chiselAuth: string
}

const EMPTY_SETTINGS: UserSettings = {
  githubAccessToken: '',
  tavilyApiKey: '',
  shodanApiKey: '',
  serpApiKey: '',
  nvdApiKey: '',
  vulnersApiKey: '',
  urlscanApiKey: '',
  censysApiToken: '',
  censysOrgId: '',
  fofaApiKey: '',
  otxApiKey: '',
  netlasApiKey: '',
  virusTotalApiKey: '',
  zoomEyeApiKey: '',
  criminalIpApiKey: '',
  quakeApiKey: '',
  hunterApiKey: '',
  publicWwwApiKey: '',
  hunterHowApiKey: '',
  googleApiKey: '',
  googleApiCx: '',
  onypheApiKey: '',
  driftnetApiKey: '',
  wpscanApiToken: '',
  ngrokAuthtoken: '',
  chiselServerUrl: '',
  chiselAuth: '',
}

interface RotationInfo {
  extraKeyCount: number
  rotateEveryN: number
}

/** Maps settings field name → rotation tool name */
const TOOL_NAME_MAP: Record<string, string> = {
  tavilyApiKey: 'tavily',
  shodanApiKey: 'shodan',
  serpApiKey: 'serp',
  nvdApiKey: 'nvd',
  vulnersApiKey: 'vulners',
  urlscanApiKey: 'urlscan',
  fofaApiKey: 'fofa',
  otxApiKey: 'otx',
  netlasApiKey: 'netlas',
  virusTotalApiKey: 'virustotal',
  zoomEyeApiKey: 'zoomeye',
  criminalIpApiKey: 'criminalip',
  quakeApiKey: 'quake',
  hunterApiKey: 'hunter',
  publicWwwApiKey: 'publicwww',
  hunterHowApiKey: 'hunterhow',
  onypheApiKey: 'onyphe',
  driftnetApiKey: 'driftnet',
  wpscanApiToken: 'wpscan',
}

function getProviderIcon(providerType: string): string {
  return PROVIDER_TYPES.find(p => p.id === providerType)?.icon || '⚙️'
}

function getProviderLabel(providerType: string): string {
  return PROVIDER_TYPES.find(p => p.id === providerType)?.name || providerType
}

export default function SettingsPage() {
  const { userId } = useProject()
  const { alertError, alert: showAlert, confirm: showConfirm } = useAlertModal()
  const toast = useToast()

  // LLM Providers
  const [providers, setProviders] = useState<ProviderData[]>([])
  const [providersLoading, setProvidersLoading] = useState(true)
  const [showProviderForm, setShowProviderForm] = useState(false)
  const [editingProvider, setEditingProvider] = useState<ProviderData | null>(null)

  // User Settings
  const [settings, setSettings] = useState<UserSettings>(EMPTY_SETTINGS)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsDirty, setSettingsDirty] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({})

  // Key Rotation
  const [rotationConfigs, setRotationConfigs] = useState<Record<string, RotationInfo>>({})
  const [rotationModal, setRotationModal] = useState<string | null>(null) // toolName or null
  const [rotationDraft, setRotationDraft] = useState({ extraKeys: '', rotateEveryN: 10 })
  const [rotationDraftDirty, setRotationDraftDirty] = useState(false) // true = user typed new keys

  // API Keys Import
  const [pendingImport, setPendingImport] = useState<ParsedImport | null>(null)
  const importFileRef = useRef<HTMLInputElement>(null)

  // Attack Skills
  const [attackSkills, setAttackSkills] = useState<{ id: string; name: string; description?: string | null; createdAt: string }[]>([])
  const [skillsLoading, setSkillsLoading] = useState(true)
  const [skillNameModal, setSkillNameModal] = useState(false)
  const [pendingSkillContent, setPendingSkillContent] = useState('')
  const [pendingSkillName, setPendingSkillName] = useState('')
  const [pendingSkillDescription, setPendingSkillDescription] = useState('')
  const [skillUploading, setSkillUploading] = useState(false)
  // Edit description modal
  const [editDescModal, setEditDescModal] = useState(false)
  const [editingSkillId, setEditingSkillId] = useState('')
  const [editingSkillDescription, setEditingSkillDescription] = useState('')
  const [editDescSaving, setEditDescSaving] = useState(false)
  // Import from Community (Agent Skills)
  const [importingAgentSkills, setImportingAgentSkills] = useState(false)

  // Chat Skills
  const [chatSkills, setChatSkills] = useState<{ id: string; name: string; description?: string | null; category?: string | null; createdAt: string }[]>([])
  const [chatSkillsLoading, setChatSkillsLoading] = useState(true)
  const [chatSkillNameModal, setChatSkillNameModal] = useState(false)
  const [pendingChatSkillContent, setPendingChatSkillContent] = useState('')
  const [pendingChatSkillName, setPendingChatSkillName] = useState('')
  const [pendingChatSkillDescription, setPendingChatSkillDescription] = useState('')
  const [pendingChatSkillCategory, setPendingChatSkillCategory] = useState('general')
  const [chatSkillUploading, setChatSkillUploading] = useState(false)
  // Chat skill edit description modal
  const [editChatDescModal, setEditChatDescModal] = useState(false)
  const [editingChatSkillId, setEditingChatSkillId] = useState('')
  const [editingChatSkillDescription, setEditingChatSkillDescription] = useState('')
  const [editChatDescSaving, setEditChatDescSaving] = useState(false)
  // Import from Community (Chat Skills)
  const [importingChatSkills, setImportingChatSkills] = useState(false)
  // Fetch attack skills
  const fetchSkills = useCallback(async () => {
    if (!userId) return
    try {
      const resp = await fetch(`/api/users/${userId}/attack-skills`)
      if (resp.ok) setAttackSkills(await resp.json())
    } catch (err) {
      console.error('Failed to fetch attack skills:', err)
    } finally {
      setSkillsLoading(false)
    }
  }, [userId])

  // Upload skill from .md file — read file then open name modal
  const handleSkillUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    const reader = new FileReader()
    reader.onload = () => {
      setPendingSkillContent(reader.result as string)
      setPendingSkillName(file.name.replace(/\.md$/i, ''))
      setSkillNameModal(true)
    }
    reader.readAsText(file)
    e.target.value = '' // Reset input
  }, [userId])

  // Confirm skill upload from modal
  const confirmSkillUpload = useCallback(async () => {
    if (!userId || !pendingSkillName.trim()) return
    setSkillUploading(true)
    try {
      const resp = await fetch(`/api/users/${userId}/attack-skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pendingSkillName.trim(), description: pendingSkillDescription.trim() || null, content: pendingSkillContent }),
      })
      if (resp.ok) {
        fetchSkills()
        setSkillNameModal(false)
        setPendingSkillContent('')
        setPendingSkillName('')
        setPendingSkillDescription('')
        toast.success('攻击技能已上传')
      } else {
        const err = await resp.json()
        alertError(err.error || '上传技能失败')
      }
    } catch (err) {
      console.error('Failed to upload skill:', err)
      toast.error('上传技能失败')
    } finally {
      setSkillUploading(false)
    }
  }, [userId, pendingSkillName, pendingSkillDescription, pendingSkillContent, fetchSkills])

  // Download skill as .md
  const downloadSkill = useCallback(async (skillId: string, skillName: string) => {
    if (!userId) return
    try {
      const resp = await fetch(`/api/users/${userId}/attack-skills/${skillId}`)
      if (resp.ok) {
        const skill = await resp.json()
        const blob = new Blob([skill.content], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${skillName}.md`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Failed to download skill:', err)
    }
  }, [userId])

  // Delete skill
  const deleteSkill = useCallback(async (skillId: string) => {
    if (!userId || !(await showConfirm('确定要删除该技能吗？它将从所有项目中移除。'))) return
    try {
      await fetch(`/api/users/${userId}/attack-skills/${skillId}`, { method: 'DELETE' })
      fetchSkills()
      toast.success('攻击技能已删除')
    } catch (err) {
      console.error('Failed to delete skill:', err)
      toast.error('删除技能失败')
    }
  }, [userId, fetchSkills])

  // Open edit description modal
  const openEditDescription = useCallback(async (skillId: string) => {
    if (!userId) return
    try {
      const resp = await fetch(`/api/users/${userId}/attack-skills/${skillId}`)
      if (resp.ok) {
        const skill = await resp.json()
        setEditingSkillId(skillId)
        setEditingSkillDescription(skill.description || '')
        setEditDescModal(true)
      }
    } catch (err) {
      console.error('Failed to fetch skill:', err)
    }
  }, [userId])

  // Save edited description
  const saveEditDescription = useCallback(async () => {
    if (!userId || !editingSkillId) return
    setEditDescSaving(true)
    try {
      const resp = await fetch(`/api/users/${userId}/attack-skills/${editingSkillId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: editingSkillDescription.trim() || null }),
      })
      if (resp.ok) {
        fetchSkills()
        setEditDescModal(false)
        setEditingSkillId('')
        setEditingSkillDescription('')
        toast.success('技能描述已更新')
      } else {
        const err = await resp.json()
        alertError(err.error || '更新描述失败')
      }
    } catch (err) {
      console.error('Failed to update skill description:', err)
      toast.error('更新描述失败')
    } finally {
      setEditDescSaving(false)
    }
  }, [userId, editingSkillId, editingSkillDescription, fetchSkills])

  // Import community agent skills
  const importCommunityAgentSkills = useCallback(async () => {
    if (!userId) return
    setImportingAgentSkills(true)
    try {
      const resp = await fetch(`/api/users/${userId}/attack-skills/import-community`, { method: 'POST' })
      const data = await resp.json()
      if (resp.ok) {
        fetchSkills()
        showAlert(data.message || `已导入 ${data.imported ?? 0} 个社区技能。`)
      } else {
        alertError(data.error || '导入社区技能失败')
      }
    } catch (err) {
      console.error('Failed to import community skills:', err)
    } finally {
      setImportingAgentSkills(false)
    }
  }, [userId, fetchSkills])

  // Fetch chat skills
  const fetchChatSkills = useCallback(async () => {
    if (!userId) return
    try {
      const resp = await fetch(`/api/users/${userId}/chat-skills`)
      if (resp.ok) setChatSkills(await resp.json())
    } catch (err) {
      console.error('Failed to fetch chat skills:', err)
    } finally {
      setChatSkillsLoading(false)
    }
  }, [userId])

  // Upload chat skill from .md file
  const handleChatSkillUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    const reader = new FileReader()
    reader.onload = () => {
      setPendingChatSkillContent(reader.result as string)
      setPendingChatSkillName(file.name.replace(/\.md$/i, ''))
      setPendingChatSkillCategory('general')
      setChatSkillNameModal(true)
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [userId])

  // Confirm chat skill upload
  const confirmChatSkillUpload = useCallback(async () => {
    if (!userId || !pendingChatSkillName.trim()) return
    setChatSkillUploading(true)
    try {
      const resp = await fetch(`/api/users/${userId}/chat-skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pendingChatSkillName.trim(),
          description: pendingChatSkillDescription.trim() || null,
          category: pendingChatSkillCategory,
          content: pendingChatSkillContent,
        }),
      })
      if (resp.ok) {
        fetchChatSkills()
        setChatSkillNameModal(false)
        setPendingChatSkillContent('')
        setPendingChatSkillName('')
        setPendingChatSkillDescription('')
        setPendingChatSkillCategory('general')
        toast.success('聊天技能已上传')
      } else {
        const err = await resp.json()
        alertError(err.error || '上传聊天技能失败')
      }
    } catch (err) {
      console.error('Failed to upload chat skill:', err)
      toast.error('上传聊天技能失败')
    } finally {
      setChatSkillUploading(false)
    }
  }, [userId, pendingChatSkillName, pendingChatSkillDescription, pendingChatSkillCategory, pendingChatSkillContent, fetchChatSkills])

  // Download chat skill as .md
  const downloadChatSkill = useCallback(async (skillId: string, skillName: string) => {
    if (!userId) return
    try {
      const resp = await fetch(`/api/users/${userId}/chat-skills/${skillId}`)
      if (resp.ok) {
        const skill = await resp.json()
        const blob = new Blob([skill.content], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${skillName}.md`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Failed to download chat skill:', err)
    }
  }, [userId])

  // Delete chat skill
  const deleteChatSkill = useCallback(async (skillId: string) => {
    if (!userId || !(await showConfirm('确定要删除该聊天技能吗？'))) return
    try {
      await fetch(`/api/users/${userId}/chat-skills/${skillId}`, { method: 'DELETE' })
      fetchChatSkills()
      toast.success('聊天技能已删除')
    } catch (err) {
      console.error('Failed to delete chat skill:', err)
      toast.error('删除聊天技能失败')
    }
  }, [userId, fetchChatSkills])

  // Open chat skill edit description modal
  const openEditChatDescription = useCallback(async (skillId: string) => {
    if (!userId) return
    try {
      const resp = await fetch(`/api/users/${userId}/chat-skills/${skillId}`)
      if (resp.ok) {
        const skill = await resp.json()
        setEditingChatSkillId(skillId)
        setEditingChatSkillDescription(skill.description || '')
        setEditChatDescModal(true)
      }
    } catch (err) {
      console.error('Failed to fetch chat skill:', err)
    }
  }, [userId])

  // Save edited chat skill description
  const saveEditChatDescription = useCallback(async () => {
    if (!userId || !editingChatSkillId) return
    setEditChatDescSaving(true)
    try {
      const resp = await fetch(`/api/users/${userId}/chat-skills/${editingChatSkillId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: editingChatSkillDescription.trim() || null }),
      })
      if (resp.ok) {
        fetchChatSkills()
        setEditChatDescModal(false)
        setEditingChatSkillId('')
        setEditingChatSkillDescription('')
        toast.success('聊天技能描述已更新')
      } else {
        const err = await resp.json()
        alertError(err.error || '更新描述失败')
      }
    } catch (err) {
      console.error('Failed to update chat skill description:', err)
      toast.error('更新描述失败')
    } finally {
      setEditChatDescSaving(false)
    }
  }, [userId, editingChatSkillId, editingChatSkillDescription, fetchChatSkills])

  // Import community chat skills
  const importCommunityChatSkills = useCallback(async () => {
    if (!userId) return
    setImportingChatSkills(true)
    try {
      const resp = await fetch(`/api/users/${userId}/chat-skills/import-community`, { method: 'POST' })
      const data = await resp.json()
      if (resp.ok) {
        fetchChatSkills()
        showAlert(data.message || `已导入 ${data.imported ?? 0} 个社区聊天技能。`)
      } else {
        alertError(data.error || '导入社区聊天技能失败')
      }
    } catch (err) {
      console.error('Failed to import community chat skills:', err)
    } finally {
      setImportingChatSkills(false)
    }
  }, [userId, fetchChatSkills])

  // Fetch providers
  const fetchProviders = useCallback(async () => {
    if (!userId) return
    try {
      const resp = await fetch(`/api/users/${userId}/llm-providers`)
      if (resp.ok) setProviders(await resp.json())
    } catch (err) {
      console.error('Failed to fetch providers:', err)
    } finally {
      setProvidersLoading(false)
    }
  }, [userId])

  // Fetch user settings
  const fetchSettings = useCallback(async () => {
    if (!userId) return
    try {
      const resp = await fetch(`/api/users/${userId}/settings`)
      if (resp.ok) {
        const data = await resp.json()
        setSettings({
          githubAccessToken: data.githubAccessToken || '',
          tavilyApiKey: data.tavilyApiKey || '',
          shodanApiKey: data.shodanApiKey || '',
          serpApiKey: data.serpApiKey || '',
          nvdApiKey: data.nvdApiKey || '',
          vulnersApiKey: data.vulnersApiKey || '',
          urlscanApiKey: data.urlscanApiKey || '',
          censysApiToken: data.censysApiToken || '',
          censysOrgId: data.censysOrgId || '',
          fofaApiKey: data.fofaApiKey || '',
          otxApiKey: data.otxApiKey || '',
          netlasApiKey: data.netlasApiKey || '',
          virusTotalApiKey: data.virusTotalApiKey || '',
          zoomEyeApiKey: data.zoomEyeApiKey || '',
          criminalIpApiKey: data.criminalIpApiKey || '',
          quakeApiKey: data.quakeApiKey || '',
          hunterApiKey: data.hunterApiKey || '',
          publicWwwApiKey: data.publicWwwApiKey || '',
          hunterHowApiKey: data.hunterHowApiKey || '',
          googleApiKey: data.googleApiKey || '',
          googleApiCx: data.googleApiCx || '',
          onypheApiKey: data.onypheApiKey || '',
          driftnetApiKey: data.driftnetApiKey || '',
          wpscanApiToken: data.wpscanApiToken || '',
          ngrokAuthtoken: data.ngrokAuthtoken || '',
          chiselServerUrl: data.chiselServerUrl || '',
          chiselAuth: data.chiselAuth || '',
        })
        if (data.rotationConfigs) {
          setRotationConfigs(data.rotationConfigs)
        }
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err)
    } finally {
      setSettingsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchProviders()
    fetchSettings()
    fetchSkills()
    fetchChatSkills()
  }, [fetchProviders, fetchSettings, fetchSkills, fetchChatSkills])

  // Delete provider
  const deleteProvider = useCallback(async (providerId: string) => {
    if (!userId || !(await showConfirm('确定要删除该提供商吗？其模型将不可再用。'))) return
    try {
      await fetch(`/api/users/${userId}/llm-providers/${providerId}`, { method: 'DELETE' })
      fetchProviders()
      toast.success('提供商已删除')
    } catch (err) {
      console.error('Failed to delete provider:', err)
      toast.error('删除提供商失败')
    }
  }, [userId, fetchProviders])

  // Save user settings
  const saveSettings = useCallback(async () => {
    if (!userId) return
    setSettingsSaving(true)
    try {
      // Build rotation configs payload from pending state
      const rotPayload: Record<string, { extraKeys: string; rotateEveryN: number }> = {}
      for (const [, toolName] of Object.entries(TOOL_NAME_MAP)) {
        const info = rotationConfigs[toolName]
        if (info && (info as RotationInfo & { _extraKeys?: string })._extraKeys !== undefined) {
          // New keys were set via the modal — send them
          rotPayload[toolName] = {
            extraKeys: (info as RotationInfo & { _extraKeys?: string })._extraKeys!,
            rotateEveryN: info.rotateEveryN,
          }
        } else if (info && info.extraKeyCount > 0) {
          // Existing keys not modified — send masked marker to preserve
          rotPayload[toolName] = {
            extraKeys: '••••',
            rotateEveryN: info.rotateEveryN,
          }
        }
      }

      const resp = await fetch(`/api/users/${userId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, rotationConfigs: rotPayload }),
      })
      if (resp.ok) {
        const data = await resp.json()
        setSettings({
          githubAccessToken: data.githubAccessToken || '',
          tavilyApiKey: data.tavilyApiKey || '',
          shodanApiKey: data.shodanApiKey || '',
          serpApiKey: data.serpApiKey || '',
          nvdApiKey: data.nvdApiKey || '',
          vulnersApiKey: data.vulnersApiKey || '',
          urlscanApiKey: data.urlscanApiKey || '',
          censysApiToken: data.censysApiToken || '',
          censysOrgId: data.censysOrgId || '',
          fofaApiKey: data.fofaApiKey || '',
          otxApiKey: data.otxApiKey || '',
          netlasApiKey: data.netlasApiKey || '',
          virusTotalApiKey: data.virusTotalApiKey || '',
          zoomEyeApiKey: data.zoomEyeApiKey || '',
          criminalIpApiKey: data.criminalIpApiKey || '',
          quakeApiKey: data.quakeApiKey || '',
          hunterApiKey: data.hunterApiKey || '',
          publicWwwApiKey: data.publicWwwApiKey || '',
          hunterHowApiKey: data.hunterHowApiKey || '',
          googleApiKey: data.googleApiKey || '',
          googleApiCx: data.googleApiCx || '',
          onypheApiKey: data.onypheApiKey || '',
          driftnetApiKey: data.driftnetApiKey || '',
          wpscanApiToken: data.wpscanApiToken || '',
          ngrokAuthtoken: data.ngrokAuthtoken || '',
          chiselServerUrl: data.chiselServerUrl || '',
          chiselAuth: data.chiselAuth || '',
        })
        if (data.rotationConfigs) {
          setRotationConfigs(data.rotationConfigs)
        }
        setSettingsDirty(false)
        toast.success('设置已保存')
      }
    } catch (err) {
      console.error('Failed to save settings:', err)
      toast.error('保存设置失败')
    } finally {
      setSettingsSaving(false)
    }
  }, [userId, settings, rotationConfigs])

  const updateSetting = useCallback(<K extends keyof UserSettings>(field: K, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }))
    setSettingsDirty(true)
  }, [])

  const toggleFieldVisibility = useCallback((field: string) => {
    setVisibleFields(prev => ({ ...prev, [field]: !prev[field] }))
  }, [])

  const openRotationModal = useCallback((settingsField: string) => {
    const toolName = TOOL_NAME_MAP[settingsField]
    if (!toolName) return
    const existing = rotationConfigs[toolName]
    setRotationModal(toolName)
    setRotationDraft({
      extraKeys: '',
      rotateEveryN: existing?.rotateEveryN ?? 10,
    })
    setRotationDraftDirty(false)
  }, [rotationConfigs])

  const closeRotationModal = useCallback(() => {
    setRotationModal(null)
    setRotationDraft({ extraKeys: '', rotateEveryN: 10 })
    setRotationDraftDirty(false)
  }, [])

  const saveRotationDraft = useCallback(() => {
    if (!rotationModal) return
    const existing = rotationConfigs[rotationModal]
    if (rotationDraftDirty) {
      // User typed new keys — send them (may be empty to clear)
      const keys = rotationDraft.extraKeys.split('\n').filter(k => k.trim())
      setRotationConfigs(prev => ({
        ...prev,
        [rotationModal]: {
          extraKeyCount: keys.length,
          rotateEveryN: Math.max(1, rotationDraft.rotateEveryN),
          _extraKeys: rotationDraft.extraKeys,
        } as RotationInfo & { _extraKeys: string },
      }))
    } else {
      // Only rotateEveryN changed — preserve existing keys
      setRotationConfigs(prev => ({
        ...prev,
        [rotationModal]: {
          extraKeyCount: existing?.extraKeyCount ?? 0,
          rotateEveryN: Math.max(1, rotationDraft.rotateEveryN),
        },
      }))
    }
    setSettingsDirty(true)
    closeRotationModal()
  }, [rotationModal, rotationDraft, rotationDraftDirty, rotationConfigs, closeRotationModal])

  const clearRotationConfig = useCallback(() => {
    if (!rotationModal) return
    setRotationConfigs(prev => ({
      ...prev,
      [rotationModal]: {
        extraKeyCount: 0,
        rotateEveryN: 10,
        _extraKeys: '',
      } as RotationInfo & { _extraKeys: string },
    }))
    setSettingsDirty(true)
    closeRotationModal()
  }, [rotationModal, closeRotationModal])

  // --- API Keys Import / Export ---------------------------------------------------

  const downloadKeysTemplate = useCallback(() => {
    const keyFields: Record<string, string> = {}
    const tunnelFields: Record<string, string> = {}
    for (const [k, v] of Object.entries(settings)) {
      if (['ngrokAuthtoken', 'chiselServerUrl', 'chiselAuth'].includes(k)) {
        tunnelFields[k] = v
      } else {
        keyFields[k] = v
      }
    }
    const template = buildTemplate(keyFields, tunnelFields)
    const json = templateToJson(template)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'redamon-api-keys-template.json'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('模板已下载')
  }, [settings])

  const handleKeysFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (importFileRef.current) importFileRef.current.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const raw = reader.result as string
      const result = validateAndParse(raw, file.size)
      if (isValidationError(result)) {
        toast.error(result.message)
        return
      }
      if (result.keyCount === 0 && result.rotationCount === 0 && result.tunnelingCount === 0) {
        toast.error('无可导入的密钥——所有值为空或已被掩码。')
        return
      }
      setPendingImport(result)
    }
    reader.onerror = () => toast.error('读取文件失败。')
    reader.readAsText(file)
  }, [])

  const confirmImport = useCallback(() => {
    if (!pendingImport) return
    setSettings(prev => ({ ...prev, ...pendingImport.keys, ...pendingImport.tunneling }))
    for (const [tool, cfg] of Object.entries(pendingImport.rotation)) {
      setRotationConfigs(prev => ({
        ...prev,
        [tool]: {
          extraKeyCount: cfg.extraKeys.length,
          rotateEveryN: cfg.rotateEveryN,
          _extraKeys: cfg.extraKeys.join('\n'),
        } as RotationInfo & { _extraKeys: string },
      }))
    }
    setSettingsDirty(true)
    setPendingImport(null)
    toast.success('密钥已导入——点击“保存设置”以持久化。')
  }, [pendingImport])

  const searchParams = useSearchParams()
  const validTabs = ['providers', 'skills', 'chat-skills', 'keys', 'system']
  const initialTab = searchParams.get('tab') || 'providers'
  const [activeTab, setActiveTab] = useState(validTabs.includes(initialTab) ? initialTab : 'providers')

  if (!userId) {
    return (
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>全局设置 <span style={{ fontSize: '0.55em', fontWeight: 400, opacity: 0.5 }}>(按用户)</span></h1>
        <div className={styles.emptyState}>请选择用户后再配置设置。</div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>全局设置 <span style={{ fontSize: '0.55em', fontWeight: 400, opacity: 0.5 }}>(按用户)</span></h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 var(--space-4)' }}>
        当前用户的个性化配置。这些设置会应用到该用户的所有项目。
      </p>

      <div className={styles.tabBar}>
        <button className={`${styles.tab} ${activeTab === 'providers' ? styles.tabActive : ''}`} onClick={() => setActiveTab('providers')}>
          LLM 提供商
        </button>
        <button className={`${styles.tab} ${activeTab === 'skills' ? styles.tabActive : ''}`} onClick={() => setActiveTab('skills')}>
          <Swords size={14} /> 代理技能
        </button>
        <button className={`${styles.tab} ${activeTab === 'chat-skills' ? styles.tabActive : ''}`} onClick={() => setActiveTab('chat-skills')}>
          <BookOpen size={14} /> 聊天技能
        </button>
        <button className={`${styles.tab} ${activeTab === 'keys' ? styles.tabActive : ''}`} onClick={() => setActiveTab('keys')}>
          API 密钥与隧道
        </button>
        <button className={`${styles.tab} ${activeTab === 'system' ? styles.tabActive : ''}`} onClick={() => setActiveTab('system')}>
          <Info size={14} /> 系统
        </button>
      </div>

      {/* Tab: LLM Providers */}
      {activeTab === 'providers' && <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>LLM 提供方</h2>
          {!showProviderForm && !editingProvider && (
            <button className="primaryButton" onClick={() => setShowProviderForm(true)}>
              <Plus size={14} /> 添加提供方
            </button>
          )}
        </div>
        <p className={styles.sectionHint}>
          所有提供方的模型都会出现在每个项目的 LLM 选择器中。基于 API Key 的提供方会自动发现可用模型。
        </p>

        {/* Provider form */}
        {(showProviderForm || editingProvider) && (
          <LlmProviderForm
            userId={userId}
            provider={editingProvider}
            onSave={() => {
              setShowProviderForm(false)
              setEditingProvider(null)
              fetchProviders()
            }}
            onCancel={() => {
              setShowProviderForm(false)
              setEditingProvider(null)
            }}
          />
        )}

        {/* Provider list */}
        {!showProviderForm && !editingProvider && (
          providersLoading ? (
            <div className={styles.emptyState}><Loader2 size={16} className={styles.spin} /> 加载中...</div>
          ) : providers.length === 0 ? (
            <div className={styles.emptyState}>尚未配置任何提供方。请先添加一个以开始使用。</div>
          ) : (
            <div className={styles.providerList}>
              {providers.map((p: ProviderData) => (
                <div key={p.id} className={styles.providerCard}>
                  <span className={styles.providerIcon}>{getProviderIcon(p.providerType)}</span>
                  <div className={styles.providerInfo}>
                    <div className={styles.providerName}>{p.name}</div>
                    <div className={styles.providerMeta}>
                      {getProviderLabel(p.providerType)}
                      {p.providerType === 'openai_compatible' && p.modelIdentifier && ` — ${p.modelIdentifier}`}
                    </div>
                  </div>
                  <div className={styles.providerActions}>
                    <button className="iconButton" title="编辑" onClick={() => setEditingProvider(p)}>
                      <Pencil size={14} />
                    </button>
                    <button className="iconButton" title="删除" onClick={() => deleteProvider(p.id!)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>}

      {/* Tab: Agent Skills */}
      {activeTab === 'skills' && <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}><Swords size={16} /> 代理技能</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="secondaryButton"
              onClick={importCommunityAgentSkills}
              disabled={importingAgentSkills}
            >
              {importingAgentSkills ? <Loader2 size={14} className={styles.spin} /> : <Download size={14} />}
              从社区导入
            </button>
            <label className="primaryButton" style={{ cursor: 'pointer' }}>
              <Upload size={14} /> 上传技能
              <input
                type="file"
                accept=".md"
                style={{ display: 'none' }}
                onChange={handleSkillUpload}
              />
            </label>
          </div>
        </div>
        <p className={styles.sectionHint}>
          上传用于定义自定义攻击工作流的 .md 文件。技能会在所有项目设置中以开关形式提供。
          {' '}你也可以浏览 <a href="https://github.com/samugit83/redamon/wiki/Agent-Skills#community-skills" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>社区技能</a> 获取可直接使用的模板。
        </p>

        {skillsLoading ? (
          <div className={styles.emptyState}><Loader2 size={16} className={styles.spin} /> 加载中...</div>
        ) : attackSkills.length === 0 ? (
          <div className={styles.emptyState}>暂无自定义技能。上传一个 .md 文件即可开始。</div>
        ) : (
          <div className={styles.providerList}>
            {attackSkills.map(skill => (
              <div key={skill.id} className={styles.providerCard}>
                <span className={styles.providerIcon}><Swords size={16} /></span>
                <div className={styles.providerInfo}>
                  <div className={styles.providerName}>{skill.name}</div>
                  <div className={styles.providerMeta}>
                    {skill.description || <span style={{ opacity: 0.5, fontStyle: 'italic' }}>暂无描述</span>}
                  </div>
                  <div className={styles.providerMeta}>
                    上传于 {new Date(skill.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className={styles.providerActions}>
                  <button className="iconButton" title="编辑描述" onClick={() => openEditDescription(skill.id)}>
                    <Pencil size={14} />
                  </button>
                  <button className="iconButton" title="下载" onClick={() => downloadSkill(skill.id, skill.name)}>
                    <Download size={14} />
                  </button>
                  <button className="iconButton" title="删除" onClick={() => deleteSkill(skill.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>}

      {/* Tab: Chat Skills */}
      {activeTab === 'chat-skills' && <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}><BookOpen size={16} /> 聊天技能</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="secondaryButton"
              onClick={importCommunityChatSkills}
              disabled={importingChatSkills}
            >
              {importingChatSkills ? <Loader2 size={14} className={styles.spin} /> : <Download size={14} />}
              从社区导入
            </button>
            <label className="primaryButton" style={{ cursor: 'pointer' }}>
              <Upload size={14} /> 上传技能（.md）
              <input
                type="file"
                accept=".md"
                style={{ display: 'none' }}
                onChange={handleChatSkillUpload}
              />
            </label>
          </div>
        </div>
        <p className={styles.sectionHint}>
          上传并管理可按需注入到 AI 聊天中的参考技能。不同于“代理技能”（用于驱动攻击分类与分阶段工作流），聊天技能更像战术参考文档，可在聊天中通过 <code>/skill &lt;name&gt;</code> 动态注入到代理上下文。
        </p>

        {chatSkillsLoading ? (
          <div className={styles.emptyState}><Loader2 size={16} className={styles.spin} /> 加载中...</div>
        ) : chatSkills.length === 0 ? (
          <div className={styles.emptyState}>暂无聊天技能。你可以从社区导入现成的参考技能，或上传自己的 .md 文件。</div>
        ) : (
          <div className={styles.providerList}>
            {chatSkills.map(skill => (
              <div key={skill.id} className={styles.providerCard}>
                <span className={styles.providerIcon}><BookOpen size={16} /></span>
                <div className={styles.providerInfo}>
                  <div className={styles.providerName}>
                    {skill.name}
                    {skill.category && (
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '10px',
                        fontWeight: 500,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                      }}>
                        {skill.category}
                      </span>
                    )}
                  </div>
                  <div className={styles.providerMeta}>
                    {skill.description || <span style={{ opacity: 0.5, fontStyle: 'italic' }}>暂无描述</span>}
                  </div>
                  <div className={styles.providerMeta}>
                    上传于 {new Date(skill.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className={styles.providerActions}>
                  <button className="iconButton" title="编辑描述" onClick={() => openEditChatDescription(skill.id)}>
                    <Pencil size={14} />
                  </button>
                  <button className="iconButton" title="下载" onClick={() => downloadChatSkill(skill.id, skill.name)}>
                    <Download size={14} />
                  </button>
                  <button className="iconButton" title="删除" onClick={() => deleteChatSkill(skill.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>}

      {/* Tab: API Keys & Tunneling */}
      {activeTab === 'keys' && <><div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>API 密钥</h2>
          <div className={styles.sectionHeaderActions}>
            <button className={styles.sectionHeaderBtn} onClick={downloadKeysTemplate} title="下载 JSON 模板，在本地离线填写 API 密钥">
              <Download size={13} /> 下载模板
            </button>
            <button className={styles.sectionHeaderBtn} onClick={() => importFileRef.current?.click()} title="从 JSON 模板文件导入 API 密钥">
              <Upload size={13} /> 导入密钥
            </button>
            <input
              ref={importFileRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleKeysFileSelect}
            />
          </div>
        </div>
        {settingsLoading ? (
          <div className={styles.emptyState}><Loader2 size={16} className={styles.spin} /> 加载中...</div>
        ) : (
          <div className={styles.settingsGrid}>
            <SecretField
              label="GitHub Access Token"
              hint="GitHub Secret Hunt 与 TruffleHog 扫描需要该 Token。私有仓库请使用 repo 权限；或使用细粒度 Token 仅授权特定仓库"
              signupUrl="https://github.com/settings/tokens"
              badges={['GitHub Secret Hunt', 'TruffleHog']}
              value={settings.githubAccessToken}
              visible={!!visibleFields.githubAccessToken}
              onToggle={() => toggleFieldVisibility('githubAccessToken')}
              onChange={v => updateSetting('githubAccessToken', v)}
            />
            <SecretField
              label="Tavily API Key"
              hint="启用 web_search 工具，用于 CVE 研究与漏洞利用检索"
              signupUrl="https://app.tavily.com/home"
              badges={['AI Agent']}
              value={settings.tavilyApiKey}
              visible={!!visibleFields.tavilyApiKey}
              onToggle={() => toggleFieldVisibility('tavilyApiKey')}
              onChange={v => updateSetting('tavilyApiKey', v)}
              onConfigureRotation={() => openRotationModal('tavilyApiKey')}
              rotationInfo={rotationConfigs.tavily || null}
            />
            <SecretField
              label="Shodan API Key"
              hint="启用 shodan 工具，用于全网 OSINT（搜索、主机信息、DNS、统计）"
              signupUrl="https://account.shodan.io/"
              badges={['AI Agent', 'Recon Pipeline', 'Standalone + Uncover']}
              value={settings.shodanApiKey}
              visible={!!visibleFields.shodanApiKey}
              onToggle={() => toggleFieldVisibility('shodanApiKey')}
              onChange={v => updateSetting('shodanApiKey', v)}
              onConfigureRotation={() => openRotationModal('shodanApiKey')}
              rotationInfo={rotationConfigs.shodan || null}
            />
            <SecretField
              label="SerpAPI Key"
              hint="启用 google_dork 工具，用于 Google dork OSINT（site: / inurl: / filetype:）。免费：250 次搜索/月"
              signupUrl="https://serpapi.com/manage-api-key"
              badges={['AI Agent']}
              value={settings.serpApiKey}
              visible={!!visibleFields.serpApiKey}
              onToggle={() => toggleFieldVisibility('serpApiKey')}
              onChange={v => updateSetting('serpApiKey', v)}
              onConfigureRotation={() => openRotationModal('serpApiKey')}
              rotationInfo={rotationConfigs.serp || null}
            />
            <SecretField
              label="WPScan API Token"
              hint="使用 WPScan 数据库漏洞数据增强 execute_wpscan 结果。免费：25 次/天"
              signupUrl="https://wpscan.com/register"
              badges={['AI Agent']}
              value={settings.wpscanApiToken}
              visible={!!visibleFields.wpscanApiToken}
              onToggle={() => toggleFieldVisibility('wpscanApiToken')}
              onChange={v => updateSetting('wpscanApiToken', v)}
              onConfigureRotation={() => openRotationModal('wpscanApiToken')}
              rotationInfo={rotationConfigs.wpscan || null}
            />
            <SecretField
              label="NVD API Key"
              hint="NIST NVD API Key：将 CVE 查询限速从 5 次/30 秒提升到 120 次/30 秒"
              signupUrl="https://nvd.nist.gov/developers/request-an-api-key"
              badges={['Recon Pipeline']}
              value={settings.nvdApiKey}
              visible={!!visibleFields.nvdApiKey}
              onToggle={() => toggleFieldVisibility('nvdApiKey')}
              onChange={v => updateSetting('nvdApiKey', v)}
              onConfigureRotation={() => openRotationModal('nvdApiKey')}
              rotationInfo={rotationConfigs.nvd || null}
            />
            <SecretField
              label="Vulners API Key"
              hint="Vulners CVE 数据库：NVD 的替代方案，包含更丰富的漏洞利用数据"
              signupUrl="https://vulners.com/#register"
              badges={['Recon Pipeline']}
              value={settings.vulnersApiKey}
              visible={!!visibleFields.vulnersApiKey}
              onToggle={() => toggleFieldVisibility('vulnersApiKey')}
              onChange={v => updateSetting('vulnersApiKey', v)}
              onConfigureRotation={() => openRotationModal('vulnersApiKey')}
              rotationInfo={rotationConfigs.vulners || null}
            />
            <SecretField
              label="URLScan API Key"
              hint="可选：用于 URLScan.io OSINT 增强以获得更高限速；不填也可用（仅公共结果）"
              signupUrl="https://urlscan.io/user/signup"
              badges={['Recon Pipeline']}
              value={settings.urlscanApiKey}
              visible={!!visibleFields.urlscanApiKey}
              onToggle={() => toggleFieldVisibility('urlscanApiKey')}
              onChange={v => updateSetting('urlscanApiKey', v)}
              onConfigureRotation={() => openRotationModal('urlscanApiKey')}
              rotationInfo={rotationConfigs.urlscan || null}
            />

            <SecretField
              label="Censys API Token"
              hint="Censys Platform 的 Personal Access Token：供侦察流水线与 Uncover 引擎使用"
              signupUrl="https://accounts.censys.io/settings/personal-access-tokens"
              badges={['Recon Pipeline', 'Standalone + Uncover']}
              value={settings.censysApiToken}
              visible={!!visibleFields.censysApiToken}
              onToggle={() => toggleFieldVisibility('censysApiToken')}
              onChange={v => updateSetting('censysApiToken', v)}
            />
            <SecretField
              label="Censys Organization ID"
              hint="Censys Organization ID：与上述 API Token 配套使用，可在 Censys 账号页面找到"
              signupUrl="https://accounts.censys.io/settings/personal-access-tokens"
              badges={['Recon Pipeline', 'Standalone + Uncover']}
              value={settings.censysOrgId}
              visible={!!visibleFields.censysOrgId}
              onToggle={() => toggleFieldVisibility('censysOrgId')}
              onChange={v => updateSetting('censysOrgId', v)}
            />
            <SecretField
              label="Censys Personal API Token"
              hint="来自 Censys 账号的 Personal Access Token：替代 API ID + Secret；当两者同时设置时优先生效"
              signupUrl="https://accounts.censys.io/settings/personal-access-tokens"
              badges={['Recon Pipeline']}
              value={settings.censysApiToken}
              visible={!!visibleFields.censysApiToken}
              onToggle={() => toggleFieldVisibility('censysApiToken')}
              onChange={v => updateSetting('censysApiToken', v)}
            />
            <SecretField
              label="FOFA API Key"
              hint="FOFA 空间测绘：按 banner/证书/域名发现资产。Key 格式：email:key"
              signupUrl="https://en.fofa.info/"
              badges={['Recon Pipeline', 'Standalone + Uncover']}
              value={settings.fofaApiKey}
              visible={!!visibleFields.fofaApiKey}
              onToggle={() => toggleFieldVisibility('fofaApiKey')}
              onChange={v => updateSetting('fofaApiKey', v)}
              onConfigureRotation={() => openRotationModal('fofaApiKey')}
              rotationInfo={rotationConfigs.fofa || null}
            />
            <SecretField
              label="AlienVault OTX Key"
              hint="Open Threat Exchange：威胁情报 pulses、恶意指标、被动 DNS、信誉评分"
              signupUrl="https://otx.alienvault.com/settings"
              badges={['Recon Pipeline']}
              value={settings.otxApiKey}
              visible={!!visibleFields.otxApiKey}
              onToggle={() => toggleFieldVisibility('otxApiKey')}
              onChange={v => updateSetting('otxApiKey', v)}
              onConfigureRotation={() => openRotationModal('otxApiKey')}
              rotationInfo={rotationConfigs.otx || null}
            />
            <SecretField
              label="Netlas API Key"
              hint="Netlas.io：全网扫描数据（banner/证书/WHOIS 等）"
              signupUrl="https://app.netlas.io/profile/"
              badges={['Recon Pipeline', 'Standalone + Uncover']}
              value={settings.netlasApiKey}
              visible={!!visibleFields.netlasApiKey}
              onToggle={() => toggleFieldVisibility('netlasApiKey')}
              onChange={v => updateSetting('netlasApiKey', v)}
              onConfigureRotation={() => openRotationModal('netlasApiKey')}
              rotationInfo={rotationConfigs.netlas || null}
            />
            <SecretField
              label="VirusTotal API Key"
              hint="多引擎信誉查询（IP/域名）。免费：4 次/分钟，500 次/天"
              signupUrl="https://www.virustotal.com/gui/my-apikey"
              badges={['Recon Pipeline']}
              value={settings.virusTotalApiKey}
              visible={!!visibleFields.virusTotalApiKey}
              onToggle={() => toggleFieldVisibility('virusTotalApiKey')}
              onChange={v => updateSetting('virusTotalApiKey', v)}
              onConfigureRotation={() => openRotationModal('virusTotalApiKey')}
              rotationInfo={rotationConfigs.virustotal || null}
            />
            <SecretField
              label="ZoomEye API Key"
              hint="ZoomEye 空间测绘：按端口/banner/地理信息发现主机与设备"
              signupUrl="https://www.zoomeye.ai/profile"
              badges={['Recon Pipeline', 'Standalone + Uncover']}
              value={settings.zoomEyeApiKey}
              visible={!!visibleFields.zoomEyeApiKey}
              onToggle={() => toggleFieldVisibility('zoomEyeApiKey')}
              onChange={v => updateSetting('zoomEyeApiKey', v)}
              onConfigureRotation={() => openRotationModal('zoomEyeApiKey')}
              rotationInfo={rotationConfigs.zoomeye || null}
            />
            <SecretField
              label="Criminal IP API Key"
              hint="AI 威胁情报：IP/域名风险评分、漏洞检测、代理/VPN/Tor 识别"
              signupUrl="https://search.criminalip.io/mypage/information"
              badges={['Recon Pipeline', 'Standalone + Uncover']}
              value={settings.criminalIpApiKey}
              visible={!!visibleFields.criminalIpApiKey}
              onToggle={() => toggleFieldVisibility('criminalIpApiKey')}
              onChange={v => updateSetting('criminalIpApiKey', v)}
              onConfigureRotation={() => openRotationModal('criminalIpApiKey')}
              rotationInfo={rotationConfigs.criminalip || null}
            />

            {/* Uncover group */}
            <div style={{ borderTop: '1px solid var(--border-secondary)', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Uncover（多引擎搜索）
              </p>
            </div>
            <SecretField
              label="Quake API Key"
              hint="360 Quake 空间测绘：按服务/证书/banner 发现资产"
              signupUrl="https://quake.360.net/quake/#/index"
              badges={['Uncover', 'Recon Pipeline']}
              value={settings.quakeApiKey}
              visible={!!visibleFields.quakeApiKey}
              onToggle={() => toggleFieldVisibility('quakeApiKey')}
              onChange={v => updateSetting('quakeApiKey', v)}
              onConfigureRotation={() => openRotationModal('quakeApiKey')}
              rotationInfo={rotationConfigs.quake || null}
            />
            <SecretField
              label="Hunter API Key"
              hint="奇安信 Hunter 空间测绘：中文威胁情报平台"
              signupUrl="https://hunter.qianxin.com/"
              badges={['Uncover', 'Recon Pipeline']}
              value={settings.hunterApiKey}
              visible={!!visibleFields.hunterApiKey}
              onToggle={() => toggleFieldVisibility('hunterApiKey')}
              onChange={v => updateSetting('hunterApiKey', v)}
              onConfigureRotation={() => openRotationModal('hunterApiKey')}
              rotationInfo={rotationConfigs.hunter || null}
            />
            <SecretField
              label="PublicWWW API Key"
              hint="源码搜索引擎：查找使用特定技术/脚本/代码片段的网站"
              signupUrl="https://publicwww.com/profile/signup.html"
              badges={['Uncover', 'Recon Pipeline']}
              value={settings.publicWwwApiKey}
              visible={!!visibleFields.publicWwwApiKey}
              onToggle={() => toggleFieldVisibility('publicWwwApiKey')}
              onChange={v => updateSetting('publicWwwApiKey', v)}
              onConfigureRotation={() => openRotationModal('publicWwwApiKey')}
              rotationInfo={rotationConfigs.publicwww || null}
            />
            <SecretField
              label="HunterHow API Key"
              hint="hunter.how 互联网搜索：资产发现与侦察"
              signupUrl="https://hunter.how/"
              badges={['Uncover', 'Recon Pipeline']}
              value={settings.hunterHowApiKey}
              visible={!!visibleFields.hunterHowApiKey}
              onToggle={() => toggleFieldVisibility('hunterHowApiKey')}
              onChange={v => updateSetting('hunterHowApiKey', v)}
              onConfigureRotation={() => openRotationModal('hunterHowApiKey')}
              rotationInfo={rotationConfigs.hunterhow || null}
            />
            <SecretField
              label="Google Custom Search API Key"
              hint="Google Custom Search JSON API：供 Uncover 的 Google 引擎使用（不同于 SerpAPI）"
              signupUrl="https://developers.google.com/custom-search/v1/introduction"
              badges={['Uncover', 'Recon Pipeline']}
              value={settings.googleApiKey}
              visible={!!visibleFields.googleApiKey}
              onToggle={() => toggleFieldVisibility('googleApiKey')}
              onChange={v => updateSetting('googleApiKey', v)}
            />
            <SecretField
              label="Google Custom Search CX"
              hint="Programmable Search Engine ID：与上方 Google API Key 配套使用"
              signupUrl="https://programmablesearchengine.google.com/controlpanel/create"
              badges={['Uncover', 'Recon Pipeline']}
              value={settings.googleApiCx}
              visible={!!visibleFields.googleApiCx}
              onToggle={() => toggleFieldVisibility('googleApiCx')}
              onChange={v => updateSetting('googleApiCx', v)}
            />
            <SecretField
              label="Onyphe API Key"
              hint="Onyphe：网络防御搜索引擎，用于暴露资产、威胁检测与攻击面管理"
              signupUrl="https://search.onyphe.io/signup"
              badges={['Uncover', 'Recon Pipeline']}
              value={settings.onypheApiKey}
              visible={!!visibleFields.onypheApiKey}
              onToggle={() => toggleFieldVisibility('onypheApiKey')}
              onChange={v => updateSetting('onypheApiKey', v)}
              onConfigureRotation={() => openRotationModal('onypheApiKey')}
              rotationInfo={rotationConfigs.onyphe || null}
            />
            <SecretField
              label="Driftnet API Key"
              hint="Driftnet：高速全网端口与服务发现"
              signupUrl="https://driftnet.io/auth?state=signup"
              badges={['Uncover', 'Recon Pipeline']}
              value={settings.driftnetApiKey}
              visible={!!visibleFields.driftnetApiKey}
              onToggle={() => toggleFieldVisibility('driftnetApiKey')}
              onChange={v => updateSetting('driftnetApiKey', v)}
              onConfigureRotation={() => openRotationModal('driftnetApiKey')}
              rotationInfo={rotationConfigs.driftnet || null}
            />
          </div>
        )}
      </div>

      {/* Tunneling sub-section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>隧道</h2>
        </div>
        <p className={styles.sectionHint}>
          配置反弹 shell 隧道。可选 ngrok（免费、单端口）或 chisel（多端口、需要 VPS）。修改会立即生效。
        </p>
        {settingsLoading ? (
          <div className={styles.emptyState}><Loader2 size={16} className={styles.spin} /> 加载中...</div>
        ) : (
          <div className={styles.settingsGrid}>
            <SecretField
              label="ngrok Auth Token"
              hint="启用 ngrok TCP 隧道用于 4444 端口反弹 shell。仅支持 stageless payload。"
              signupUrl="https://dashboard.ngrok.com/get-started/your-authtoken"
              value={settings.ngrokAuthtoken}
              visible={!!visibleFields.ngrokAuthtoken}
              onToggle={() => toggleFieldVisibility('ngrokAuthtoken')}
              onChange={v => updateSetting('ngrokAuthtoken', v)}
            />
            <div className="formGroup">
              <label className="formLabel">Chisel 服务器 URL</label>
              <input
                className="textInput"
                type="text"
                value={settings.chiselServerUrl}
                onChange={e => updateSetting('chiselServerUrl', e.target.value)}
                placeholder="例如：http://your-vps.com:9090"
              />
              <span className="formHint">
                你的 VPS 上运行的 chisel server 地址。在 VPS 上执行：<code>chisel server -p 9090 --reverse</code>。会转发 4444（handler）+ 8080（web delivery）。
              </span>
            </div>
            <SecretField
              label="Chisel Auth"
              hint="chisel server 的鉴权信息 user:pass（可选，仅当你的 chisel server 启用鉴权时需要）"
              value={settings.chiselAuth}
              visible={!!visibleFields.chiselAuth}
              onToggle={() => toggleFieldVisibility('chiselAuth')}
              onChange={v => updateSetting('chiselAuth', v)}
            />
          </div>
        )}
        {settingsDirty && !settingsSaving && (
          <div className={styles.formActions} style={{ justifyContent: 'flex-end', marginTop: '12px' }}>
            <button className="primaryButton" onClick={saveSettings} disabled={settingsSaving}>
              保存设置
            </button>
          </div>
        )}
      </div></>}

      {/* Tab: System */}
      {activeTab === 'system' && <SystemSection />}

      {/* Skill upload modal */}
      <Modal
        isOpen={skillNameModal}
        onClose={() => { setSkillNameModal(false); setPendingSkillContent(''); setPendingSkillName(''); setPendingSkillDescription('') }}
        title="上传代理技能"
        size="small"
        footer={
          <>
            <button
              className="secondaryButton"
              onClick={() => { setSkillNameModal(false); setPendingSkillContent(''); setPendingSkillName(''); setPendingSkillDescription('') }}
            >
              取消
            </button>
            <button
              className="primaryButton"
              disabled={!pendingSkillName.trim() || skillUploading}
              onClick={confirmSkillUpload}
            >
              {skillUploading ? <Loader2 size={14} className={styles.spin} /> : <Upload size={14} />}
              上传
            </button>
          </>
        }
      >
        <div className="formGroup">
          <label className="formLabel">技能名称</label>
          <input
            className="textInput"
            type="text"
            value={pendingSkillName}
            onChange={(e) => setPendingSkillName(e.target.value)}
            placeholder="例如：SQL 注入工作流"
            autoFocus
          />
          <span className="formHint">
            该名称会显示在项目设置与分类标签中。
          </span>
        </div>
        <div className="formGroup" style={{ marginTop: '12px' }}>
          <label className="formLabel">描述</label>
          <textarea
            className="textInput"
            rows={3}
            value={pendingSkillDescription}
            onChange={(e) => setPendingSkillDescription(e.target.value)}
            placeholder="例如：使用 sqlmap 对 Web 应用参数进行 SQL 注入测试"
            maxLength={500}
          />
          <span className="formHint">
            用于帮助代理判断何时使用该技能。若不填写，会改用 markdown 前 500 个字符；更好的描述可提升分类准确性。
          </span>
        </div>
      </Modal>

      {/* Edit description modal */}
      <Modal
        isOpen={editDescModal}
        onClose={() => { setEditDescModal(false); setEditingSkillId(''); setEditingSkillDescription('') }}
        title="编辑技能描述"
        size="small"
        footer={
          <>
            <button
              className="secondaryButton"
              onClick={() => { setEditDescModal(false); setEditingSkillId(''); setEditingSkillDescription('') }}
            >
              取消
            </button>
            <button
              className="primaryButton"
              disabled={editDescSaving}
              onClick={saveEditDescription}
            >
              {editDescSaving ? <Loader2 size={14} className={styles.spin} /> : <Pencil size={14} />}
              保存
            </button>
          </>
        }
      >
        <div className="formGroup">
          <label className="formLabel">描述</label>
          <textarea
            className="textInput"
            rows={3}
            value={editingSkillDescription}
            onChange={(e) => setEditingSkillDescription(e.target.value)}
            placeholder="例如：使用 sqlmap 对 Web 应用参数进行 SQL 注入测试"
            maxLength={500}
            autoFocus
          />
          <span className="formHint">
            用于帮助代理判断何时使用该技能。若不填写，会改用 markdown 前 500 个字符；更好的描述可提升分类准确性。
          </span>
        </div>
      </Modal>

      {/* Chat Skill upload modal */}
      <Modal
        isOpen={chatSkillNameModal}
        onClose={() => { setChatSkillNameModal(false); setPendingChatSkillContent(''); setPendingChatSkillName(''); setPendingChatSkillDescription(''); setPendingChatSkillCategory('general') }}
        title="上传聊天技能"
        size="small"
        footer={
          <>
            <button
              className="secondaryButton"
              onClick={() => { setChatSkillNameModal(false); setPendingChatSkillContent(''); setPendingChatSkillName(''); setPendingChatSkillDescription(''); setPendingChatSkillCategory('general') }}
            >
              取消
            </button>
            <button
              className="primaryButton"
              disabled={!pendingChatSkillName.trim() || chatSkillUploading}
              onClick={confirmChatSkillUpload}
            >
              {chatSkillUploading ? <Loader2 size={14} className={styles.spin} /> : <Upload size={14} />}
              上传
            </button>
          </>
        }
      >
        <div className="formGroup">
          <label className="formLabel">技能名称</label>
          <input
            className="textInput"
            type="text"
            value={pendingChatSkillName}
            onChange={(e) => setPendingChatSkillName(e.target.value)}
            placeholder="例如：OWASP Top 10 速查"
            autoFocus
          />
        </div>
        <div className="formGroup" style={{ marginTop: '12px' }}>
          <label className="formLabel">描述</label>
          <textarea
            className="textInput"
            rows={3}
            value={pendingChatSkillDescription}
            onChange={(e) => setPendingChatSkillDescription(e.target.value)}
            placeholder="例如：OWASP Top 10 漏洞分类速查"
            maxLength={500}
          />
          <span className="formHint">
            可选：用于帮助你记住该技能包含哪些内容。
          </span>
        </div>
        <div className="formGroup" style={{ marginTop: '12px' }}>
          <label className="formLabel">分类</label>
          <select
            className="textInput"
            value={pendingChatSkillCategory}
            onChange={(e) => setPendingChatSkillCategory(e.target.value)}
          >
            <option value="general">通用（general）</option>
            <option value="vulnerabilities">漏洞（vulnerabilities）</option>
            <option value="tooling">工具（tooling）</option>
            <option value="scan_modes">扫描模式（scan_modes）</option>
            <option value="frameworks">框架（frameworks）</option>
            <option value="technologies">技术栈（technologies）</option>
            <option value="protocols">协议（protocols）</option>
            <option value="coordination">协作（coordination）</option>
            <option value="cloud">云（cloud）</option>
            <option value="mobile">移动端（mobile）</option>
            <option value="api_security">API 安全（api_security）</option>
            <option value="wireless">无线（wireless）</option>
            <option value="network">网络（network）</option>
            <option value="active_directory">AD（active_directory）</option>
            <option value="social_engineering">社会工程（social_engineering）</option>
            <option value="reporting">报告（reporting）</option>
          </select>
          <span className="formHint">
            为该技能设置分类，便于浏览与管理。
          </span>
        </div>
      </Modal>

      {/* Chat Skill edit description modal */}
      <Modal
        isOpen={editChatDescModal}
        onClose={() => { setEditChatDescModal(false); setEditingChatSkillId(''); setEditingChatSkillDescription('') }}
        title="编辑聊天技能描述"
        size="small"
        footer={
          <>
            <button
              className="secondaryButton"
              onClick={() => { setEditChatDescModal(false); setEditingChatSkillId(''); setEditingChatSkillDescription('') }}
            >
              取消
            </button>
            <button
              className="primaryButton"
              disabled={editChatDescSaving}
              onClick={saveEditChatDescription}
            >
              {editChatDescSaving ? <Loader2 size={14} className={styles.spin} /> : <Pencil size={14} />}
              保存
            </button>
          </>
        }
      >
        <div className="formGroup">
          <label className="formLabel">描述</label>
          <textarea
            className="textInput"
            rows={3}
            value={editingChatSkillDescription}
            onChange={(e) => setEditingChatSkillDescription(e.target.value)}
            placeholder="例如：OWASP Top 10 漏洞分类速查"
            maxLength={500}
            autoFocus
          />
          <span className="formHint">
            可选：用于帮助你记住该技能包含哪些内容。
          </span>
        </div>
      </Modal>

      {/* Key Rotation Modal */}
      <Modal
        isOpen={!!rotationModal}
        onClose={closeRotationModal}
        title={`密钥轮换 — ${rotationModal || ''}`}
        size="small"
        footer={
          <>
            {rotationConfigs[rotationModal || '']?.extraKeyCount > 0 && !rotationDraftDirty && (
              <button className="secondaryButton" onClick={clearRotationConfig} style={{ marginRight: 'auto' }}>
                清空额外密钥
              </button>
            )}
            <button className="secondaryButton" onClick={closeRotationModal}>取消</button>
            <button
              className="primaryButton"
              onClick={saveRotationDraft}
              disabled={!rotationDraftDirty && rotationDraft.rotateEveryN === (rotationConfigs[rotationModal || '']?.rotateEveryN ?? 10)}
            >
              保存
            </button>
          </>
        }
      >
        <div className="formGroup">
          <label className="formLabel">额外 API Key</label>
          {rotationConfigs[rotationModal || '']?.extraKeyCount > 0 && !rotationDraftDirty ? (
            <>
              <div style={{
                padding: '10px 12px',
                background: 'var(--accent-secondary-subtle)',
                borderRadius: '6px',
                fontSize: '12px',
                color: 'var(--accent-secondary)',
                marginBottom: '8px',
              }}>
                已配置 {rotationConfigs[rotationModal || '']?.extraKeyCount} 个额外密钥。可在下方粘贴新密钥以替换。
              </div>
              <textarea
                className="textInput"
                rows={5}
                value={rotationDraft.extraKeys}
                onChange={e => {
                  setRotationDraft(prev => ({ ...prev, extraKeys: e.target.value }))
                  setRotationDraftDirty(true)
                }}
                placeholder="在此粘贴 API Key，每行一个..."
                style={{ fontFamily: 'monospace', fontSize: '12px' }}
              />
            </>
          ) : (
            <textarea
              className="textInput"
              rows={5}
              value={rotationDraft.extraKeys}
              onChange={e => {
                setRotationDraft(prev => ({ ...prev, extraKeys: e.target.value }))
                setRotationDraftDirty(true)
              }}
              placeholder="在此粘贴 API Key，每行一个..."
              style={{ fontFamily: 'monospace', fontSize: '12px' }}
              autoFocus
            />
          )}
          <span className="formHint">
            这些密钥与主密钥共同组成轮换池，所有密钥权重相同。
          </span>
        </div>
        <div className="formGroup" style={{ marginTop: '12px' }}>
          <label className="formLabel">每 N 次调用轮换</label>
          <input
            className="textInput"
            type="number"
            min={1}
            value={rotationDraft.rotateEveryN}
            onChange={e => setRotationDraft(prev => ({ ...prev, rotateEveryN: parseInt(e.target.value, 10) || 10 }))}
            style={{ width: '120px' }}
          />
          <span className="formHint">
            每调用这么多次 API 后切换到池中的下一把密钥（默认：10）。
          </span>
        </div>
      </Modal>

      {/* Import Keys Confirmation Modal */}
      <Modal
        isOpen={!!pendingImport}
        onClose={() => setPendingImport(null)}
        title="导入 API 密钥"
        size="small"
        footer={
          <>
            <button className="secondaryButton" onClick={() => setPendingImport(null)}>取消</button>
            <button className="primaryButton" onClick={confirmImport}>
              <Upload size={14} /> 导入
            </button>
          </>
        }
      >
        {pendingImport && (
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <p style={{ marginBottom: '12px' }}>以下内容将被导入到表单中：</p>
            <ul style={{ margin: 0, paddingLeft: '18px' }}>
              {pendingImport.keyCount > 0 && <li><strong>{pendingImport.keyCount}</strong> 个 API Key</li>}
              {pendingImport.rotationCount > 0 && <li><strong>{pendingImport.rotationCount}</strong> 个轮换配置</li>}
              {pendingImport.tunnelingCount > 0 && <li><strong>{pendingImport.tunnelingCount}</strong> 个隧道字段</li>}
            </ul>
            <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
              空值与已掩码的值会被跳过。导入后需要点击 <strong>保存设置</strong> 才会持久化。
            </p>
          </div>
        )}
      </Modal>

    </div>
  )
}

// ---------------------------------------------------------------------------
// System Section (version info + update check)
// ---------------------------------------------------------------------------

function SystemSection() {
  const { currentVersion, latestVersion, changelog, updateAvailable, loading } = useVersionCheck()

  const [copied, setCopied] = useState(false)
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set())

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText('./redamon.sh update').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [])

  const toggleVersion = (version: string) => {
    setExpandedVersions(prev => {
      const next = new Set(prev)
      if (next.has(version)) next.delete(version)
      else next.add(version)
      return next
    })
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}><Info size={16} /> 系统</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Version info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            当前版本：<strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>v{currentVersion}</strong>
          </span>

          {latestVersion && !updateAvailable && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
              background: 'var(--status-success-bg)', color: 'var(--status-success-text)',
            }}>
              已是最新
            </span>
          )}

          {updateAvailable && latestVersion && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
              background: 'var(--status-warning-bg)', color: 'var(--status-warning-text)',
            }}>
              可更新至 v{latestVersion}
            </span>
          )}

          {loading && (
            <Loader2 size={12} className={styles.spin} style={{ marginLeft: 'auto' }} />
          )}
        </div>

        {/* Update available: show command + changelog */}
        {updateAvailable && (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 12px', background: 'var(--bg-primary)',
              border: '1px solid var(--border-default)', borderRadius: '6px',
              fontFamily: 'var(--font-mono)',
            }}>
              <code style={{ flex: 1, fontSize: '13px', color: 'var(--color-success)' }}>
                ./redamon.sh update
              </code>
              <button
                onClick={handleCopy}
                title="复制命令"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '4px', background: 'none', border: '1px solid var(--border-default)',
                  borderRadius: '4px', color: 'var(--text-tertiary)', cursor: 'pointer',
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>

            {/* Changelog */}
            {changelog && changelog.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  v{currentVersion} 以来的更新：
                </span>
                <div style={{
                  maxHeight: '250px', overflowY: 'auto',
                  border: '1px solid var(--border-default)', borderRadius: '6px',
                  background: 'var(--bg-primary)',
                }}>
                  {changelog.map((entry: { version: string; date: string; sections: { title: string; items: string[] }[] }) => {
                    const isExpanded = expandedVersions.has(entry.version)
                    return (
                      <div key={entry.version} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <button
                          type="button"
                          onClick={() => toggleVersion(entry.version)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            width: '100%', padding: '6px 10px', background: 'none',
                            border: 'none', cursor: 'pointer', fontSize: '12px',
                            color: 'var(--text-primary)', textAlign: 'left',
                          }}
                        >
                          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          <strong style={{ fontFamily: 'var(--font-mono)' }}>v{entry.version}</strong>
                          <span style={{ color: 'var(--text-tertiary)', fontSize: '11px', marginLeft: 'auto' }}>{entry.date}</span>
                        </button>
                        {isExpanded && (
                          <div style={{ padding: '0 10px 8px 28px' }}>
                            {entry.sections.map((section: { title: string; items: string[] }) => (
                              <div key={section.title} style={{ marginTop: '4px' }}>
                                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  {section.title}
                                </div>
                                <ul style={{ margin: '2px 0 0', paddingLeft: '16px', listStyle: 'disc' }}>
                                  {section.items.map((item: string, i: number) => (
                                    <li key={i} style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{item}</li>
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
            )}
          </>
        )}

        {/* Links */}
        <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
          <a
            href="https://github.com/samugit83/redamon/blob/master/CHANGELOG.md"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-tertiary)', textDecoration: 'none' }}
          >
            <ExternalLink size={11} /> 更新日志
          </a>
        </div>
      </div>
    </div>
  )
}

// Badge color mapping
const BADGE_STYLES: Record<string, React.CSSProperties> = {
  'AI Agent': {
    display: 'inline-block',
    fontSize: '10px',
    fontWeight: 600,
    padding: '1px 6px',
    borderRadius: '4px',
    background: 'var(--status-info-bg)',
    color: 'var(--status-info-text)',
    marginLeft: '6px',
    verticalAlign: 'middle',
    letterSpacing: '0.02em',
  },
  'Recon Pipeline': {
    display: 'inline-block',
    fontSize: '10px',
    fontWeight: 600,
    padding: '1px 6px',
    borderRadius: '4px',
    background: 'var(--status-success-bg)',
    color: 'var(--status-success-text)',
    marginLeft: '6px',
    verticalAlign: 'middle',
    letterSpacing: '0.02em',
  },
  'GitHub Secret Hunt': {
    display: 'inline-block',
    fontSize: '10px',
    fontWeight: 600,
    padding: '1px 6px',
    borderRadius: '4px',
    background: 'rgba(139, 92, 246, 0.12)',
    color: '#8b5cf6',
    marginLeft: '6px',
    verticalAlign: 'middle',
    letterSpacing: '0.02em',
  },
  'TruffleHog': {
    display: 'inline-block',
    fontSize: '10px',
    fontWeight: 600,
    padding: '1px 6px',
    borderRadius: '4px',
    background: 'rgba(139, 92, 246, 0.12)',
    color: '#8b5cf6',
    marginLeft: '6px',
    verticalAlign: 'middle',
    letterSpacing: '0.02em',
  },
}

const BADGE_LABELS: Record<string, string> = {
  'AI Agent': 'AI 代理',
  'Recon Pipeline': '侦察流水线',
  'Standalone + Uncover': '独立 + Uncover',
  'Uncover': 'Uncover',
  'GitHub Secret Hunt': 'GitHub 密钥搜寻',
  'TruffleHog': 'TruffleHog',
}

// Reusable secret field component
function SecretField({
  label,
  hint,
  signupUrl,
  badges,
  value,
  visible,
  onToggle,
  onChange,
  onConfigureRotation,
  rotationInfo,
}: {
  label: string
  hint: string
  signupUrl?: string
  badges?: string[]
  value: string
  visible: boolean
  onToggle: () => void
  onChange: (v: string) => void
  onConfigureRotation?: () => void
  rotationInfo?: RotationInfo | null
}) {
  const mainKeyCount = value && !value.startsWith('••••') ? 1 : value ? 1 : 0
  const totalKeys = mainKeyCount + (rotationInfo?.extraKeyCount || 0)

  return (
    <div className="formGroup">
      <label className="formLabel">
        {label}
        {badges?.map(badge => (
          <span key={badge} style={BADGE_STYLES[badge] || BADGE_STYLES['AI Agent']}>
            {BADGE_LABELS[badge] ?? badge}
          </span>
        ))}
      </label>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div className={styles.secretInputWrapper} style={{ flex: 1 }}>
          <input
            className="textInput"
            type={visible ? 'text' : 'password'}
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            placeholder={`输入 ${label}`}
          />
          <button className={styles.secretToggle} onClick={onToggle} type="button">
            {visible ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {onConfigureRotation && (
          <button
            onClick={onConfigureRotation}
            type="button"
            title="配置密钥轮换"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 500,
              color: rotationInfo && rotationInfo.extraKeyCount > 0 ? 'var(--accent-secondary)' : 'var(--text-secondary)',
              background: rotationInfo && rotationInfo.extraKeyCount > 0 ? 'var(--accent-secondary-subtle)' : 'var(--bg-tertiary)',
              border: '1px solid var(--border-default)',
              borderRadius: '6px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <RotateCw size={12} />
            密钥轮换
          </button>
        )}
      </div>
      <span className="formHint">
        {hint}
        {signupUrl && (
          <>
            {' — '}
            <a href={signupUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>
              获取 API Key
            </a>
          </>
        )}
      </span>
      {rotationInfo && rotationInfo.extraKeyCount > 0 && (
        <span style={{
          display: 'inline-block',
          fontSize: '10px',
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: '4px',
          background: 'var(--accent-secondary-subtle)',
          color: 'var(--accent-secondary)',
          marginTop: '4px',
          letterSpacing: '0.02em',
        }}>
          共 {totalKeys} 把密钥，每 {rotationInfo.rotateEveryN} 次调用轮换
        </span>
      )}
    </div>
  )
}
