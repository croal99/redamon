'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { Loader2, Sparkles, RefreshCw, Play } from 'lucide-react'
import { GraphCanvas } from '../GraphCanvas'
import { useDimensions } from '../../hooks'
import { useGraphViews } from '../../hooks/useGraphViews'
import type { GraphData, GraphNode } from '../../types'
import styles from './GraphViews.module.css'

interface GraphViewsProps {
  projectId: string
  userId: string
  modelConfigured: boolean
  is3D: boolean
  showLabels: boolean
  isDark: boolean
  onFilterCreated?: () => void
}

const EXAMPLE_QUERIES = [
  'All subdomains that resolve to at least 4 IPs',
  'IPs with critical vulnerabilities and their open ports',
  'Technologies with known CVEs and the affected subdomains',
  'All endpoints with injectable parameters',
  'Attack chains that reached exploitation phase',
  'Subdomains with open port 443 and their technologies',
  'All services running on non-standard ports (not 80 or 443)',
]

export function GraphViews({
  projectId,
  userId,
  modelConfigured,
  is3D,
  showLabels,
  isDark,
  onFilterCreated,
}: GraphViewsProps) {
  const {
    createView,
    generateCypher,
    executeCypher,
  } = useGraphViews(projectId)

  const [nlQuery, setNlQuery] = useState('')
  const [viewName, setViewName] = useState('')
  const [generatedCypher, setGeneratedCypher] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<GraphData | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)

  const canvasRef = useRef<HTMLDivElement>(null)
  const dimensions = useDimensions(canvasRef)

  const handleGenerate = useCallback(async () => {
    if (!nlQuery.trim()) return
    setGenerating(true)
    setPreviewError(null)
    setGeneratedCypher(null)
    setPreviewData(null)

    const result = await generateCypher(nlQuery.trim(), userId)

    if ('error' in result) {
      setPreviewError(result.error)
      setGenerating(false)
      return
    }

    setGeneratedCypher(result.cypher)
    setViewName(nlQuery.trim().slice(0, 60))

    // Execute the generated cypher for preview
    setPreviewLoading(true)
    const execResult = await executeCypher(result.cypher)
    setGenerating(false)
    setPreviewLoading(false)

    if ('error' in execResult) {
      setPreviewError(execResult.error)
      setPreviewData(null)
    } else {
      setPreviewData({
        nodes: execResult.nodes || [],
        links: execResult.links || [],
        projectId,
      })
    }
  }, [nlQuery, userId, projectId, generateCypher, executeCypher])

  const handleRegenerate = useCallback(async () => {
    setGeneratedCypher(null)
    setPreviewData(null)
    setPreviewError(null)
    await handleGenerate()
  }, [handleGenerate])

  const handleSave = useCallback(async () => {
    if (!generatedCypher || !viewName.trim()) return
    setSaving(true)
    const result = await createView(viewName.trim(), nlQuery.trim(), generatedCypher)
    setSaving(false)
    if (result) {
      // Reset form after successful save
      setNlQuery('')
      setViewName('')
      setGeneratedCypher(null)
      setPreviewData(null)
      setPreviewError(null)
      setSelectedNode(null)
      onFilterCreated?.()
    }
  }, [generatedCypher, viewName, nlQuery, createView, onFilterCreated])

  const handleDiscard = useCallback(() => {
    setNlQuery('')
    setViewName('')
    setGeneratedCypher(null)
    setPreviewData(null)
    setPreviewError(null)
    setSelectedNode(null)
  }, [])

  const handleExampleClick = useCallback((example: string) => {
    setNlQuery(example)
  }, [])

  const nodeCount = useMemo(() => previewData?.nodes.length ?? 0, [previewData])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>Create Data Filter</h2>
          <span className={styles.subtitle}>
            Describe a subgraph in natural language to create a data filter for Graph Map, Data Table, and AI agent
          </span>
        </div>
      </div>

      {!modelConfigured && (
        <div className={styles.noLlmBanner}>
          <Sparkles size={14} />
          <span>Configure an AI model in project settings to create data filters with natural language.</span>
        </div>
      )}

      <div className={styles.createForm}>
        <label className={styles.label}>Describe the subgraph you want to filter</label>
        <textarea
          className={styles.textarea}
          placeholder="e.g., All IPs with critical vulnerabilities and their open ports"
          value={nlQuery}
          onChange={e => setNlQuery(e.target.value)}
          rows={3}
          disabled={generating || !modelConfigured}
        />

        <div className={styles.examples}>
          <span className={styles.examplesLabel}>Examples:</span>
          <div className={styles.exampleChips}>
            {EXAMPLE_QUERIES.map((ex, i) => (
              <button
                key={i}
                className={styles.chip}
                onClick={() => handleExampleClick(ex)}
                disabled={generating}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.generateRow}>
          <button
            className={styles.generateBtn}
            onClick={handleGenerate}
            disabled={!nlQuery.trim() || generating || !modelConfigured}
          >
            {generating ? (
              <>
                <Loader2 size={14} className={styles.spin} />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Generate Cypher</span>
              </>
            )}
          </button>
        </div>

        {previewError && (
          <div className={styles.errorBanner}>
            <span>{previewError}</span>
            <button className={styles.retryBtn} onClick={handleRegenerate}>
              <RefreshCw size={12} />
              Retry
            </button>
          </div>
        )}

        {generatedCypher && (
          <>
            <div className={styles.cypherBlock}>
              <label className={styles.label}>Generated Cypher</label>
              <pre className={styles.cypherCode}>{generatedCypher}</pre>
            </div>

            <div className={styles.previewSection}>
              <div className={styles.previewHeader}>
                <span className={styles.label}>
                  Preview {nodeCount > 0 && `(${nodeCount} nodes)`}
                </span>
                <button className={styles.retryBtn} onClick={handleRegenerate}>
                  <RefreshCw size={12} />
                  Regenerate
                </button>
              </div>
              <div ref={canvasRef} className={styles.previewCanvas}>
                <GraphCanvas
                  data={previewData ?? undefined}
                  isLoading={previewLoading}
                  error={previewError ? new Error(previewError) : null}
                  projectId={projectId}
                  is3D={is3D}
                  width={dimensions.width}
                  height={dimensions.height}
                  showLabels={showLabels}
                  selectedNode={selectedNode}
                  onNodeClick={setSelectedNode}
                  isDark={isDark}
                />
              </div>
            </div>

            <div className={styles.saveRow}>
              <input
                className={styles.nameInput}
                placeholder="Filter name"
                value={viewName}
                onChange={e => setViewName(e.target.value)}
              />
              <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={!viewName.trim() || saving}
              >
                {saving ? (
                  <Loader2 size={14} className={styles.spin} />
                ) : (
                  <Play size={14} />
                )}
                <span>{saving ? 'Saving...' : 'Save Filter'}</span>
              </button>
              <button className={styles.discardBtn} onClick={handleDiscard}>
                Discard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
