'use client'

import { useState } from 'react'
import { ChevronDown, Layers } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface ScanModulesSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
}

const SCAN_MODULE_OPTIONS = [
  { id: 'domain_discovery', label: '发现与情报', description: '子域名枚举、Shodan、URLScan', indent: 0 },
  { id: 'port_scan', label: '端口扫描', description: 'Naabu + Masscan 端口扫描器', indent: 1 },
  { id: 'http_probe', label: 'HTTP 探测', description: 'httpx HTTP 分析', indent: 2 },
  { id: 'resource_enum', label: '资源枚举', description: 'Katana、GAU、Kiterunner', indent: 3 },
  { id: 'vuln_scan', label: '漏洞扫描', description: 'Nuclei 漏洞扫描器', indent: 3 },
]

// Module dependency tree: child → parent
const MODULE_DEPENDENCIES: Record<string, string | null> = {
  domain_discovery: null,
  port_scan: 'domain_discovery',
  http_probe: 'port_scan',
  resource_enum: 'http_probe',
  vuln_scan: 'http_probe',
}

// Get all modules that depend on a given module (direct + transitive)
function getDependentModules(moduleId: string): string[] {
  const dependents: string[] = []
  for (const [id, parent] of Object.entries(MODULE_DEPENDENCIES)) {
    if (parent === moduleId) {
      dependents.push(id, ...getDependentModules(id))
    }
  }
  return dependents
}

// Check if a module's parent chain is all enabled
function isParentEnabled(moduleId: string, enabledModules: string[]): boolean {
  const parent = MODULE_DEPENDENCIES[moduleId]
  if (parent === null) return true
  if (!enabledModules.includes(parent)) return false
  return isParentEnabled(parent, enabledModules)
}

export function ScanModulesSection({ data, updateField }: ScanModulesSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  const toggleModule = (moduleId: string) => {
    const current = data.scanModules
    if (current.includes(moduleId)) {
      // Disabling: also disable all dependent modules
      const dependents = getDependentModules(moduleId)
      const toRemove = new Set([moduleId, ...dependents])
      updateField('scanModules', current.filter(m => !toRemove.has(m)))
    } else {
      // Enabling: also enable all parent modules in the chain
      const toAdd = [moduleId]
      let parent = MODULE_DEPENDENCIES[moduleId]
      while (parent !== null) {
        if (!current.includes(parent)) {
          toAdd.push(parent)
        }
        parent = MODULE_DEPENDENCIES[parent]
      }
      updateField('scanModules', [...current, ...toAdd])
    }
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Layers size={16} />
          扫描模块
        </h2>
        <ChevronDown
          size={16}
          className={`${styles.sectionIcon} ${isOpen ? styles.sectionIconOpen : ''}`}
        />
      </div>

      {isOpen && (
        <div className={styles.sectionContent}>
          <p className={styles.sectionDescription}>
            通过启用或禁用模块来控制侦察流程。每个模块都依赖上游模块的输出，从域名发现到漏洞检测逐层构建完整的攻击面视图。
          </p>
          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>已启用模块</h3>
            <p className={styles.fieldHint} style={{ marginBottom: '0.75rem' }}>
              模块存在依赖关系：禁用父模块会同时禁用所有子模块
            </p>
            {SCAN_MODULE_OPTIONS.map(module => {
              const isEnabled = data.scanModules.includes(module.id)
              const parentEnabled = isParentEnabled(module.id, data.scanModules)
              const isDisabledByParent = !parentEnabled && !isEnabled

              return (
                <div
                  key={module.id}
                  className={styles.toggleRow}
                  style={{
                    paddingLeft: `${module.indent * 1.25}rem`,
                    opacity: isDisabledByParent ? 0.5 : 1,
                  }}
                >
                  <div>
                    <span className={styles.toggleLabel}>
                      {module.indent > 0 && '└ '}
                      {module.label}
                    </span>
                    <p className={styles.toggleDescription}>
                      {module.description}
                      {isDisabledByParent && '（需要启用父模块）'}
                    </p>
                  </div>
                  <Toggle
                    checked={isEnabled}
                    onChange={() => toggleModule(module.id)}
                  />
                </div>
              )
            })}
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>通用选项</h3>
            <div className={styles.toggleRow} style={{ opacity: 0.7 }}>
              <div>
                <span className={styles.toggleLabel}>更新图数据库</span>
                <p className={styles.toggleDescription}>
                  将扫描结果写入 Neo4j 图数据库（始终开启）
                </p>
              </div>
              <Toggle
                checked={true}
                onChange={() => {}}
                disabled
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>侦察流量走 Tor</span>
                <p className={styles.toggleDescription}>
                  将侦察请求通过 Tor 网络进行转发
                </p>
              </div>
              <Toggle
                checked={data.useTorForRecon}
                onChange={(checked) => updateField('useTorForRecon', checked)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
