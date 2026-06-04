'use client'

import { useState } from 'react'
import { ChevronDown, Brain, Play } from 'lucide-react'
import { Toggle, WikiInfoButton } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface ResourceEnumAiSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
  onRun?: () => void
}

export function ResourceEnumAiSection({ data, updateField, onRun }: ResourceEnumAiSectionProps) {
  const [isOpen, setIsOpen] = useState(true)
  const masterOn = data.resourceEnumAiClassifierEnabled ?? true

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Brain size={16} />
          端点 AI 分类器
          <NodeInfoTooltip section="EndpointAiClassifier" />
          <WikiInfoButton target="Adversarial-AI-Recon" />
          <span className={styles.badgePassive}>被动</span>
        </h2>
        <div className={styles.sectionHeaderRight}>
          {onRun && masterOn && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRun() }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '3px 8px', borderRadius: '4px',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                color: '#22c55e', cursor: 'pointer', fontSize: '11px', fontWeight: 500,
              }}
              title="运行端点 AI 分类器"
            >
              <Play size={10} /> 运行部分侦察
            </button>
          )}
          <div onClick={(e) => e.stopPropagation()}>
            <Toggle
              checked={masterOn}
              onChange={(checked) => updateField('resourceEnumAiClassifierEnabled', checked)}
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
            基于 AI 形态特征目录，对 Katana / Hakrawler / GAU / FFuf / ParamSpider / Arjun / Kiterunner / jsluice 发现的每个 Endpoint 与 Parameter 进行分类。对 chat / completion / embedding / tool-call / SSE / MCP / GraphQL 端点打标签，标记 RAG 摄入路径，并识别可能携带提示词注入向量的参数。仅对图中已有数据做正则匹配，不会向目标发送额外流量。
          </p>

          {masterOn && (
            <div className={styles.subSection}>
              <h3 className={styles.subSectionTitle}>AI 攻击面分类器</h3>
              <p className={styles.fieldHint} style={{ marginBottom: '0.5rem' }}>
                所有子分类器默认开启。上方主开关控制整个流程；当某类标注在特定目标上噪声过高时，可单独关闭对应子分类器。
              </p>

              <div className={styles.toggleRow}>
                <div>
                  <span className={styles.toggleLabel}>AI 路径分类器</span>
                  <p className={styles.toggleDescription}>
                    将 URL path 与 LLM / completion / embedding / tool-call / SSE / MCP / GraphQL 目录匹配（OpenAI /v1/chat/completions、Anthropic /v1/messages、Ollama /api/chat、Gemini :generateContent、Cohere /v2/chat、MCP /mcp、LangServe /stream 等），并写入 Endpoint.ai_interface_type。
                  </p>
                </div>
                <Toggle
                  checked={data.resourceEnumAiPathClassifierEnabled ?? true}
                  onChange={(checked) => updateField('resourceEnumAiPathClassifierEnabled', checked)}
                />
              </div>

              <div className={styles.toggleRow}>
                <div>
                  <span className={styles.toggleLabel}>AI RAG 路径标记</span>
                  <p className={styles.toggleDescription}>
                    标记看起来像 RAG 摄入或检索的端点（OpenAI Vector Stores、Pinecone /vectors/upsert、Weaviate /v1/objects、Qdrant /collections/.../points）。对歧义路径（/upload、/search、/query）仅在父 Host 已被 AI 标记时才触发，避免把电商搜索栏这类通用路径误报为 RAG。
                  </p>
                </div>
                <Toggle
                  checked={data.resourceEnumAiRagPathFlagEnabled ?? true}
                  onChange={(checked) => updateField('resourceEnumAiRagPathFlagEnabled', checked)}
                />
              </div>

              <div className={styles.toggleRow}>
                <div>
                  <span className={styles.toggleLabel}>AI 可注入参数标记</span>
                  <p className={styles.toggleDescription}>
                    当父 Endpoint 已被 AI 分类时，标记名称命中常见提示词注入字段（prompt、messages、system、contents、inputs、arguments 等）的 Parameter 节点，并设置 Parameter.is_ai_prompt_injectable=true。
                  </p>
                </div>
                <Toggle
                  checked={data.resourceEnumAiParamInjectableFlagEnabled ?? true}
                  onChange={(checked) => updateField('resourceEnumAiParamInjectableFlagEnabled', checked)}
                />
              </div>

              <div className={styles.toggleRow}>
                <div>
                  <span className={styles.toggleLabel}>AI 工具参数路径解析</span>
                  <p className={styles.toggleDescription}>
                    遍历已发现的 OpenAPI / ai-plugin.json / MCP tools/list 文档（未来由 ai_surface_recon 模块写入图中）并将每个 tool argument 绑定到对应的 JSON Pointer 位置。中心探测模块上线前该选项不会产生实际行为；此处预留开关用于保持契约稳定。
                  </p>
                </div>
                <Toggle
                  checked={data.resourceEnumAiToolArgPathEnabled ?? true}
                  onChange={(checked) => updateField('resourceEnumAiToolArgPathEnabled', checked)}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
