'use client'

import { useRouter } from 'next/navigation'
import { Cpu, Bot, Sparkles, ArrowRight } from 'lucide-react'
import { ModelPicker } from '@/components/shared/ModelPicker'
import { bothModelsSelected } from './projectLlmGate.logic'
import styles from './ProjectForm.module.css'

/**
 * Blocking modal shown when a user tries to create a project without any
 * LLM provider configured. Both the agent and the AI recon pipeline need one,
 * so creation cannot continue until a provider is added in Global Settings.
 */
export function ProviderRequiredModal({ onCancel }: { onCancel: () => void }) {
  const router = useRouter()
  return (
    <div className={styles.guardrailOverlay}>
      <div className={styles.gateModal}>
        <div className={styles.gateIconWrapper}>
          <Cpu size={28} />
        </div>
        <h2 className={styles.gateTitle}>请先配置 LLM 提供商</h2>
        <p className={styles.gateMessage}>
          在创建项目之前，星图至少需要配置一个 LLM 提供商（如 DeepSeek、Anthropic、OpenAI
          等）。自主代理和 AI 侦察流水线都依赖它运行。
        </p>
        <div className={styles.gateActions}>
          <button type="button" className="secondaryButton" onClick={onCancel}>
            返回项目列表
          </button>
          <button
            type="button"
            className="primaryButton"
            onClick={() => router.push('/settings')}
          >
            去配置提供商
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

interface ModelSelectionModalProps {
  userId?: string | null
  agentModel: string
  aiPipelineModel: string
  onChangeAgent: (id: string) => void
  onChangeAiPipeline: (id: string) => void
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Forced model-selection modal shown on save when either the agent model or the
 * AI pipeline model is unset. Both must be picked before the project is saved.
 * The chosen models are remembered as per-user defaults for the next project.
 */
export function ModelSelectionModal({
  userId,
  agentModel,
  aiPipelineModel,
  onChangeAgent,
  onChangeAiPipeline,
  onConfirm,
  onCancel,
}: ModelSelectionModalProps) {
  const ready = bothModelsSelected(agentModel, aiPipelineModel)
  return (
    <div className={styles.guardrailOverlay}>
      <div className={styles.gateModalWide}>
        <div className={styles.gateIconWrapper}>
          <Sparkles size={28} />
        </div>
        <h2 className={styles.gateTitle}>选择 AI 模型</h2>
        <p className={styles.gateMessage}>
          请选择 星图 在此项目中使用的模型。我们会记住你的选择，作为下一个项目的默认配置。
        </p>

        <div className={styles.gateField}>
          <label className={styles.gateLabel}>
            <Bot size={14} /> 代理模型
          </label>
          <span className={styles.gateHint}>
            用于自主代理功能（聊天、图谱自然语言转 Cypher 查询）。
          </span>
          <ModelPicker
            userId={userId}
            value={agentModel}
            onChange={onChangeAgent}
            placeholder="搜索代理模型..."
          />
        </div>

        <div className={styles.gateField}>
          <label className={styles.gateLabel}>
            <Cpu size={14} /> AI 侦察流水线模型
          </label>
          <span className={styles.gateHint}>
            用于侦察 AI Hook：Nuclei 标签级联、误报过滤、WAF 与接管分类器、FFuf 扩展。
          </span>
          <ModelPicker
            userId={userId}
            value={aiPipelineModel}
            onChange={onChangeAiPipeline}
            placeholder="搜索流水线模型..."
          />
        </div>

        <div className={styles.gateActions}>
          <button type="button" className="secondaryButton" onClick={onCancel}>
            取消
          </button>
          <button
            type="button"
            className="primaryButton"
            disabled={!ready}
            onClick={onConfirm}
            title={ready ? '使用所选模型保存项目' : '请选择两个模型后继续'}
          >
            保存项目
          </button>
        </div>
      </div>
    </div>
  )
}
