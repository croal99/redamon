'use client'

import React from 'react'
import { Wrench, Swords, Check, Settings, Lightbulb } from 'lucide-react'
import { StealthIcon } from '@/components/icons/StealthIcon'
import { Tooltip } from '@/components/ui/Tooltip/Tooltip'
import { PHASE_CONFIG, getAttackPathConfig, formatModelDisplay } from './phaseConfig'
import type { Phase } from './types'
import styles from './AIAssistantDrawer.module.css'

interface SkillData {
  builtIn: Array<{ id: string; name: string }>
  user: Array<{ id: string; name: string }>
  config: { builtIn: Record<string, boolean>; user: Record<string, boolean> }
}

interface PhaseIndicatorBarProps {
  currentPhase: Phase
  toolPhaseMap?: Record<string, string[]>
  attackPathType: string
  skillData: SkillData | null
  iterationCount: number
  stealthMode: boolean
  onToggleStealth?: (v: boolean) => void
  deepThinkEnabled: boolean
  onToggleDeepThink?: (v: boolean) => void
  settingsDropdownRef: React.RefObject<HTMLDivElement | null>
  showSettingsDropdown: boolean
  setShowSettingsDropdown: React.Dispatch<React.SetStateAction<boolean>>
  setSettingsModal: (v: 'agent' | 'toolmatrix' | 'attack' | null) => void
  modelName?: string
  setShowModelModal: (v: boolean) => void
}

export function PhaseIndicatorBar({
  currentPhase,
  toolPhaseMap,
  attackPathType,
  skillData,
  iterationCount,
  stealthMode,
  onToggleStealth,
  deepThinkEnabled,
  onToggleDeepThink,
  settingsDropdownRef,
  showSettingsDropdown,
  setShowSettingsDropdown,
  setSettingsModal,
  modelName,
  setShowModelModal,
}: PhaseIndicatorBarProps) {
  const PhaseIcon = PHASE_CONFIG[currentPhase].icon

  return (
    <div className={styles.phaseIndicator}>
      <div
        className={styles.phaseBadge}
        style={{
          backgroundColor: PHASE_CONFIG[currentPhase].bgColor,
          borderColor: PHASE_CONFIG[currentPhase].color,
        }}
      >
        <PhaseIcon size={14} style={{ color: PHASE_CONFIG[currentPhase].color }} />
        <span style={{ color: PHASE_CONFIG[currentPhase].color }}>
          {PHASE_CONFIG[currentPhase].label}
        </span>
      </div>

      {toolPhaseMap && (() => {
        const phaseTools = Object.entries(toolPhaseMap)
          .filter(([, phases]) => phases.includes(currentPhase))
          .map(([name]) => name)
        return phaseTools.length > 0 ? (
          <Tooltip
            position="bottom"
            content={
              <div className={styles.phaseToolsTooltip}>
                <div className={styles.phaseToolsHeader}>阶段工具</div>
                {phaseTools.map(t => (
                  <div key={t} className={styles.phaseToolsItem}>{t}</div>
                ))}
              </div>
            }
          >
            <Wrench size={13} className={styles.phaseToolsIcon} />
          </Tooltip>
        ) : null
      })()}

      {attackPathType && (currentPhase === 'informational' || currentPhase === 'exploitation' || currentPhase === 'post_exploitation') && (
        <Tooltip
          position="bottom"
          content={
            <div className={styles.skillTooltip}>
              <div className={styles.skillTooltipHeader}>
                <Swords size={11} />
                代理技能
              </div>
              {skillData && (
                <>
                  <div className={styles.skillTooltipGroup}>
                    <div className={styles.skillTooltipGroupLabel}>内置</div>
                    {skillData.builtIn.map(s => {
                      const enabled = skillData.config.builtIn[s.id] !== false
                      const isActive = attackPathType === s.id
                      return (
                        <div key={s.id} className={`${styles.skillTooltipItem} ${!enabled ? styles.skillTooltipItemDisabled : ''} ${isActive ? styles.skillTooltipItemActive : ''}`}>
                          <span className={styles.skillTooltipName}>{s.name}</span>
                          {isActive && <Check size={11} className={styles.skillTooltipCheck} />}
                          {!enabled && <span className={styles.skillTooltipOff}>关闭</span>}
                        </div>
                      )
                    })}
                  </div>
                  {skillData.user.length > 0 && (
                    <div className={styles.skillTooltipGroup}>
                      <div className={styles.skillTooltipGroupLabel}>用户技能</div>
                      {skillData.user.map(s => {
                        const enabled = skillData.config.user[s.id] !== false
                        const isActive = attackPathType === `user_skill:${s.id}`
                        return (
                          <div key={s.id} className={`${styles.skillTooltipItem} ${!enabled ? styles.skillTooltipItemDisabled : ''} ${isActive ? styles.skillTooltipItemActive : ''}`}>
                            <span className={styles.skillTooltipName}>{s.name}</span>
                            {isActive && <Check size={11} className={styles.skillTooltipCheck} />}
                            {!enabled && <span className={styles.skillTooltipOff}>关闭</span>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          }
        >
          <div
            className={styles.phaseBadge}
            style={{
              backgroundColor: getAttackPathConfig(attackPathType).bgColor,
              borderColor: getAttackPathConfig(attackPathType).color,
            }}
          >
            <span style={{ color: getAttackPathConfig(attackPathType).color }}>
              {getAttackPathConfig(attackPathType).shortLabel}
            </span>
          </div>
        </Tooltip>
      )}

      {iterationCount > 0 && (
        <span className={styles.iterationCount}>步骤 {iterationCount}</span>
      )}

      {onToggleStealth ? (
        <button
          className={`${styles.stealthToggle} ${stealthMode ? styles.stealthToggleActive : ''}`}
          onClick={() => onToggleStealth(!stealthMode)}
          title={stealthMode
            ? '隐身模式：开启（点击关闭）'
            : '隐身模式：关闭（点击启用仅被动/低噪技术）'
          }
        >
          <StealthIcon size={11} />
        </button>
      ) : stealthMode ? (
        <span className={styles.stealthBadge} title="隐身模式：仅被动/低噪技术">
          <StealthIcon size={11} />
        </span>
      ) : null}

      {onToggleDeepThink ? (
        <button
          className={`${styles.deepThinkToggle} ${deepThinkEnabled ? styles.deepThinkToggleActive : ''}`}
          onClick={() => onToggleDeepThink(!deepThinkEnabled)}
          title={deepThinkEnabled
            ? '深度思考：开启（在关键决策点先进行策略推理再行动，点击关闭）'
            : '深度思考：关闭（点击开启。在开始/阶段切换/失败循环等关键点增加一次策略推理调用）'
          }
        >
          <Lightbulb size={11} />
        </button>
      ) : deepThinkEnabled ? (
        <span className={styles.deepThinkBadge} title="深度思考：在关键决策点进行策略推理">
          <Lightbulb size={11} />
        </span>
      ) : null}

      <div className={styles.settingsWrapper} ref={settingsDropdownRef}>
        <button
          className={styles.settingsButton}
          onClick={() => setShowSettingsDropdown(prev => !prev)}
          title="代理设置"
        >
          <Settings size={12} />
        </button>
        {showSettingsDropdown && (
          <div className={styles.settingsDropdown}>
            <button
              className={styles.settingsDropdownItem}
              onClick={() => { setSettingsModal('agent'); setShowSettingsDropdown(false) }}
            >
              代理行为
            </button>
            <button
              className={styles.settingsDropdownItem}
              onClick={() => { setSettingsModal('toolmatrix'); setShowSettingsDropdown(false) }}
            >
              工具矩阵
            </button>
            <button
              className={styles.settingsDropdownItem}
              onClick={() => { setSettingsModal('attack'); setShowSettingsDropdown(false) }}
            >
              代理技能
            </button>
          </div>
        )}
      </div>

      {modelName && (
        <button className={styles.modelBadge} onClick={() => setShowModelModal(true)}>
          {formatModelDisplay(modelName)}
        </button>
      )}
    </div>
  )
}
