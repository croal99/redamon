'use client'

import { useState } from 'react'
import { ChevronDown, ShieldCheck } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface SecurityChecksSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
}

export function SecurityChecksSection({ data, updateField }: SecurityChecksSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <ShieldCheck size={16} />
          安全检查
          <NodeInfoTooltip section="SecurityChecks" />
          <span className={styles.badgeActive}>主动</span>
        </h2>
        <div className={styles.sectionHeaderRight}>
          <div onClick={(e) => e.stopPropagation()}>
            <Toggle
              checked={data.securityCheckEnabled}
              onChange={(checked) => updateField('securityCheckEnabled', checked)}
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
            对已发现结果运行自定义安全校验检查。包含安全头分析、SSL/TLS 配置审查等自动化评估，用于验证并补充漏洞上下文。
          </p>

          {data.securityCheckEnabled && (
            <>
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>超时（秒）</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.securityCheckTimeout}
                    onChange={(e) => updateField('securityCheckTimeout', parseInt(e.target.value) || 10)}
                    min={1}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>最大并发</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.securityCheckMaxWorkers}
                    onChange={(e) => updateField('securityCheckMaxWorkers', parseInt(e.target.value) || 10)}
                    min={1}
                    max={50}
                  />
                </div>
              </div>

              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>直接 IP 访问</h3>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>检查直连 IP（HTTP）</span>
                  <Toggle
                    checked={data.securityCheckDirectIpHttp}
                    onChange={(checked) => updateField('securityCheckDirectIpHttp', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>检查直连 IP（HTTPS）</span>
                  <Toggle
                    checked={data.securityCheckDirectIpHttps}
                    onChange={(checked) => updateField('securityCheckDirectIpHttps', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>检查 IP API 暴露</span>
                  <Toggle
                    checked={data.securityCheckIpApiExposed}
                    onChange={(checked) => updateField('securityCheckIpApiExposed', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>检查 WAF 绕过</span>
                  <Toggle
                    checked={data.securityCheckWafBypass}
                    onChange={(checked) => updateField('securityCheckWafBypass', checked)}
                  />
                </div>
              </div>

              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>TLS/SSL</h3>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>检查 TLS 即将过期</span>
                  <Toggle
                    checked={data.securityCheckTlsExpiringSoon}
                    onChange={(checked) => updateField('securityCheckTlsExpiringSoon', checked)}
                  />
                </div>
                {data.securityCheckTlsExpiringSoon && (
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>过期预警天数</label>
                    <input
                      type="number"
                      className="textInput"
                      value={data.securityCheckTlsExpiryDays}
                      onChange={(e) => updateField('securityCheckTlsExpiryDays', parseInt(e.target.value) || 30)}
                      min={1}
                      max={365}
                    />
                  </div>
                )}
              </div>

              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>安全响应头</h3>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>缺少 Referrer-Policy</span>
                  <Toggle
                    checked={data.securityCheckMissingReferrerPolicy}
                    onChange={(checked) => updateField('securityCheckMissingReferrerPolicy', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>缺少 Permissions-Policy</span>
                  <Toggle
                    checked={data.securityCheckMissingPermissionsPolicy}
                    onChange={(checked) => updateField('securityCheckMissingPermissionsPolicy', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>缺少 COOP</span>
                  <Toggle
                    checked={data.securityCheckMissingCoop}
                    onChange={(checked) => updateField('securityCheckMissingCoop', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>缺少 CORP</span>
                  <Toggle
                    checked={data.securityCheckMissingCorp}
                    onChange={(checked) => updateField('securityCheckMissingCorp', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>缺少 COEP</span>
                  <Toggle
                    checked={data.securityCheckMissingCoep}
                    onChange={(checked) => updateField('securityCheckMissingCoep', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>缺少 Cache-Control</span>
                  <Toggle
                    checked={data.securityCheckCacheControlMissing}
                    onChange={(checked) => updateField('securityCheckCacheControlMissing', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>CSP 启用 unsafe-inline</span>
                  <Toggle
                    checked={data.securityCheckCspUnsafeInline}
                    onChange={(checked) => updateField('securityCheckCspUnsafeInline', checked)}
                  />
                </div>
              </div>

              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>认证</h3>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>登录未使用 HTTPS</span>
                  <Toggle
                    checked={data.securityCheckLoginNoHttps}
                    onChange={(checked) => updateField('securityCheckLoginNoHttps', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>Session Cookie 未设置 Secure</span>
                  <Toggle
                    checked={data.securityCheckSessionNoSecure}
                    onChange={(checked) => updateField('securityCheckSessionNoSecure', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>Session Cookie 未设置 HttpOnly</span>
                  <Toggle
                    checked={data.securityCheckSessionNoHttponly}
                    onChange={(checked) => updateField('securityCheckSessionNoHttponly', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>Basic Auth 未使用 TLS</span>
                  <Toggle
                    checked={data.securityCheckBasicAuthNoTls}
                    onChange={(checked) => updateField('securityCheckBasicAuthNoTls', checked)}
                  />
                </div>
              </div>

              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>DNS 安全</h3>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>缺少 SPF 记录</span>
                  <Toggle
                    checked={data.securityCheckSpfMissing}
                    onChange={(checked) => updateField('securityCheckSpfMissing', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>缺少 DMARC 记录</span>
                  <Toggle
                    checked={data.securityCheckDmarcMissing}
                    onChange={(checked) => updateField('securityCheckDmarcMissing', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>缺少 DNSSEC</span>
                  <Toggle
                    checked={data.securityCheckDnssecMissing}
                    onChange={(checked) => updateField('securityCheckDnssecMissing', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>开启区域传送（Zone Transfer）</span>
                  <Toggle
                    checked={data.securityCheckZoneTransfer}
                    onChange={(checked) => updateField('securityCheckZoneTransfer', checked)}
                  />
                </div>
              </div>

              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>服务暴露</h3>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>管理端口暴露</span>
                  <Toggle
                    checked={data.securityCheckAdminPortExposed}
                    onChange={(checked) => updateField('securityCheckAdminPortExposed', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>数据库暴露</span>
                  <Toggle
                    checked={data.securityCheckDatabaseExposed}
                    onChange={(checked) => updateField('securityCheckDatabaseExposed', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>Redis 未鉴权</span>
                  <Toggle
                    checked={data.securityCheckRedisNoAuth}
                    onChange={(checked) => updateField('securityCheckRedisNoAuth', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>Kubernetes API 暴露</span>
                  <Toggle
                    checked={data.securityCheckKubernetesApiExposed}
                    onChange={(checked) => updateField('securityCheckKubernetesApiExposed', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>SMTP 开放中继</span>
                  <Toggle
                    checked={data.securityCheckSmtpOpenRelay}
                    onChange={(checked) => updateField('securityCheckSmtpOpenRelay', checked)}
                  />
                </div>
              </div>

              <div className={styles.subSection}>
                <h3 className={styles.subSectionTitle}>应用</h3>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>不安全的 Form Action</span>
                  <Toggle
                    checked={data.securityCheckInsecureFormAction}
                    onChange={(checked) => updateField('securityCheckInsecureFormAction', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>缺少限速</span>
                  <Toggle
                    checked={data.securityCheckNoRateLimiting}
                    onChange={(checked) => updateField('securityCheckNoRateLimiting', checked)}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
