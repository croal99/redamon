'use client'

import { useState } from 'react'
import { ChevronDown, Globe } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { Project } from '@prisma/client'
import styles from '../ProjectForm.module.css'
import { NodeInfoTooltip } from '../NodeInfoTooltip'
import { TimeEstimate } from '../TimeEstimate'

type FormData = Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'user'>

interface HttpxSectionProps {
  data: FormData
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void
}

export function HttpxSection({ data, updateField }: HttpxSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <h2 className={styles.sectionTitle}>
          <Globe size={16} />
          httpx HTTP 探测
          <NodeInfoTooltip section="Httpx" />
          <span className={styles.badgeActive}>主动</span>
        </h2>
        <div className={styles.sectionHeaderRight}>
          <div onClick={(e) => e.stopPropagation()}>
            <Toggle
              checked={data.httpxEnabled}
              onChange={(checked) => updateField('httpxEnabled', checked)}
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
            使用 httpx 进行 HTTP 探测与指纹识别。验证存活的 Web 服务，提取服务器头、技术栈、TLS 证书等元数据，并集成 Wappalyzer 做更完整的技术识别。
          </p>
          {data.httpxEnabled && (
          <>
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>线程数</label>
              <input
                type="number"
                className="textInput"
                value={data.httpxThreads}
                onChange={(e) => updateField('httpxThreads', parseInt(e.target.value) || 50)}
                min={1}
                max={200}
              />
              <span className={styles.fieldHint}>HTTP 探测并发线程数</span>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>超时（秒）</label>
              <input
                type="number"
                className="textInput"
                value={data.httpxTimeout}
                onChange={(e) => updateField('httpxTimeout', parseInt(e.target.value) || 10)}
                min={1}
              />
              <span className={styles.fieldHint}>单个 URL 的请求超时时间</span>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>速率限制</label>
              <input
                type="number"
                className="textInput"
                value={data.httpxRateLimit}
                onChange={(e) => updateField('httpxRateLimit', parseInt(e.target.value) || 50)}
                min={1}
              />
              <span className={styles.fieldHint}>请求/秒。较低值（10–50）更不容易触发 WAF 识别</span>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>重试次数</label>
              <input
                type="number"
                className="textInput"
                value={data.httpxRetries}
                onChange={(e) => updateField('httpxRetries', parseInt(e.target.value) || 2)}
                min={0}
                max={10}
              />
              <span className={styles.fieldHint}>请求失败时的重试次数</span>
            </div>
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>重定向</h3>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>跟随重定向</span>
                <p className={styles.toggleDescription}>跟随 301/302/307 直到最终落点</p>
              </div>
              <Toggle
                checked={data.httpxFollowRedirects}
                onChange={(checked) => updateField('httpxFollowRedirects', checked)}
              />
            </div>
            {data.httpxFollowRedirects && (
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>最大重定向次数</label>
                <input
                  type="number"
                  className="textInput"
                  value={data.httpxMaxRedirects}
                  onChange={(e) => updateField('httpxMaxRedirects', parseInt(e.target.value) || 10)}
                  min={1}
                  max={50}
                />
                <span className={styles.fieldHint}>限制重定向链深度，避免陷入循环</span>
              </div>
            )}
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>响应探测项</h3>
            <p className={styles.fieldHint} style={{ marginBottom: '0.5rem' }}>从 HTTP 响应中提取数据用于分析</p>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>状态码</span>
                <p className={styles.toggleDescription}>HTTP 状态（200/404/500 等）</p>
              </div>
              <Toggle
                checked={data.httpxProbeStatusCode}
                onChange={(checked) => updateField('httpxProbeStatusCode', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>内容长度</span>
                <p className={styles.toggleDescription}>响应体大小（字节）</p>
              </div>
              <Toggle
                checked={data.httpxProbeContentLength}
                onChange={(checked) => updateField('httpxProbeContentLength', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>内容类型</span>
                <p className={styles.toggleDescription}>MIME 类型（text/html、application/json 等）</p>
              </div>
              <Toggle
                checked={data.httpxProbeContentType}
                onChange={(checked) => updateField('httpxProbeContentType', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>页面标题</span>
                <p className={styles.toggleDescription}>HTML title 标签内容</p>
              </div>
              <Toggle
                checked={data.httpxProbeTitle}
                onChange={(checked) => updateField('httpxProbeTitle', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>Server 头</span>
                <p className={styles.toggleDescription}>Web 服务器软件（nginx/Apache/IIS 等）</p>
              </div>
              <Toggle
                checked={data.httpxProbeServer}
                onChange={(checked) => updateField('httpxProbeServer', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>响应时间</span>
                <p className={styles.toggleDescription}>服务器响应延迟（毫秒）</p>
              </div>
              <Toggle
                checked={data.httpxProbeResponseTime}
                onChange={(checked) => updateField('httpxProbeResponseTime', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>词数</span>
                <p className={styles.toggleDescription}>响应体中的单词数量</p>
              </div>
              <Toggle
                checked={data.httpxProbeWordCount}
                onChange={(checked) => updateField('httpxProbeWordCount', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>行数</span>
                <p className={styles.toggleDescription}>响应体中的行数</p>
              </div>
              <Toggle
                checked={data.httpxProbeLineCount}
                onChange={(checked) => updateField('httpxProbeLineCount', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>技术识别</span>
                <p className={styles.toggleDescription}>识别框架/CMS/库（基于 Wappalyzer）</p>
                <TimeEstimate estimate="预计额外 +10–30% 耗时" />
              </div>
              <Toggle
                checked={data.httpxProbeTechDetect}
                onChange={(checked) => updateField('httpxProbeTechDetect', checked)}
              />
            </div>
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>网络信息</h3>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>IP 地址</span>
                <p className={styles.toggleDescription}>解析出的 IPv4/IPv6 地址</p>
              </div>
              <Toggle
                checked={data.httpxProbeIp}
                onChange={(checked) => updateField('httpxProbeIp', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>CNAME 记录</span>
                <p className={styles.toggleDescription}>DNS 别名（可用于判断 CDN/托管信息）</p>
              </div>
              <Toggle
                checked={data.httpxProbeCname}
                onChange={(checked) => updateField('httpxProbeCname', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>ASN 信息</span>
                <p className={styles.toggleDescription}>自治系统号与网络归属</p>
              </div>
              <Toggle
                checked={data.httpxProbeAsn}
                onChange={(checked) => updateField('httpxProbeAsn', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>CDN 识别</span>
                <p className={styles.toggleDescription}>识别 CDN 供应商（Cloudflare/Akamai/AWS CloudFront 等）</p>
              </div>
              <Toggle
                checked={data.httpxProbeCdn}
                onChange={(checked) => updateField('httpxProbeCdn', checked)}
              />
            </div>
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>TLS/SSL 信息</h3>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>TLS 信息</span>
                <p className={styles.toggleDescription}>证书签发者、有效期与加密套件等信息</p>
              </div>
              <Toggle
                checked={data.httpxProbeTlsInfo}
                onChange={(checked) => updateField('httpxProbeTlsInfo', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>抓取 TLS 证书</span>
                <p className={styles.toggleDescription}>提取完整证书数据（含 SAN 与证书链）</p>
              </div>
              <Toggle
                checked={data.httpxProbeTlsGrab}
                onChange={(checked) => updateField('httpxProbeTlsGrab', checked)}
              />
            </div>
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>指纹</h3>
            <p className={styles.fieldHint} style={{ marginBottom: '0.5rem' }}>用于匹配相似服务器/服务的唯一标识</p>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>Favicon 哈希</span>
                <p className={styles.toggleDescription}>MMH3 哈希，用于与 Shodan/Censys 相关联</p>
              </div>
              <Toggle
                checked={data.httpxProbeFavicon}
                onChange={(checked) => updateField('httpxProbeFavicon', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>JARM 指纹</span>
                <p className={styles.toggleDescription}>TLS 服务端指纹，可用于 C2/恶意软件识别</p>
                <TimeEstimate estimate="每个 URL 额外 +10–50ms（主机多时会累计）" />
              </div>
              <Toggle
                checked={data.httpxProbeJarm}
                onChange={(checked) => updateField('httpxProbeJarm', checked)}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>响应哈希算法</label>
              <select
                className="select"
                value={data.httpxProbeHash}
                onChange={(e) => updateField('httpxProbeHash', e.target.value)}
              >
                <option value="sha256">SHA-256</option>
                <option value="md5">MD5</option>
                <option value="sha1">SHA-1</option>
                <option value="sha512">SHA-512</option>
              </select>
              <span className={styles.fieldHint}>用于响应体指纹的哈希算法</span>
            </div>
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>响应数据</h3>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>包含响应体</span>
                <p className={styles.toggleDescription}>保存完整 HTML/JSON 响应体。Wappalyzer 需要该项，会增加输出体积</p>
              </div>
              <Toggle
                checked={data.httpxIncludeResponse}
                onChange={(checked) => updateField('httpxIncludeResponse', checked)}
              />
            </div>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>包含响应头</span>
                <p className={styles.toggleDescription}>保存全部响应头，用于安全头分析</p>
              </div>
              <Toggle
                checked={data.httpxIncludeResponseHeaders}
                onChange={(checked) => updateField('httpxIncludeResponseHeaders', checked)}
              />
            </div>
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>自定义路径与请求头</h3>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>额外探测路径</label>
              <textarea
                className="textarea"
                value={(data.httpxPaths ?? []).join('\n')}
                onChange={(e) => updateField('httpxPaths', e.target.value.split('\n').filter(Boolean))}
                placeholder="/robots.txt&#10;/.well-known/security.txt&#10;/sitemap.xml"
                rows={3}
              />
              <span className={styles.fieldHint}>对每个主机额外探测这些路径（除根路径外）</span>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>自定义请求头</label>
              <textarea
                className="textarea"
                value={(data.httpxCustomHeaders ?? []).join('\n')}
                onChange={(e) => updateField('httpxCustomHeaders', e.target.value.split('\n').filter(Boolean))}
                placeholder="User-Agent: CustomAgent/1.0&#10;Authorization: Bearer token"
                rows={3}
              />
              <span className={styles.fieldHint}>更接近浏览器的请求头有助于规避 WAF/反爬识别</span>
            </div>
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>状态码过滤</h3>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>匹配状态码</label>
              <input
                type="text"
                className="textInput"
                value={(data.httpxMatchCodes ?? []).join(', ')}
                onChange={(e) => updateField('httpxMatchCodes', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="200, 301, 302（留空=全部）"
              />
              <span className={styles.fieldHint}>白名单：仅保留返回这些状态码的主机</span>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>过滤状态码</label>
              <input
                type="text"
                className="textInput"
                value={(data.httpxFilterCodes ?? []).join(', ')}
                onChange={(e) => updateField('httpxFilterCodes', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="404, 503"
              />
              <span className={styles.fieldHint}>黑名单：排除返回这些状态码的主机</span>
            </div>
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>Wappalyzer 技术识别</h3>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>启用 Wappalyzer</span>
                <p className={styles.toggleDescription}>从 HTML 中识别 CMS 插件、统计分析、安全工具与框架</p>
                <TimeEstimate estimate="预计额外 +30–50% 耗时" />
              </div>
              <Toggle
                checked={data.wappalyzerEnabled}
                onChange={(checked) => updateField('wappalyzerEnabled', checked)}
              />
            </div>
            {data.wappalyzerEnabled && (
              <>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>最小置信度（%）</label>
                    <input
                      type="number"
                      className="textInput"
                      value={data.wappalyzerMinConfidence}
                      onChange={(e) => updateField('wappalyzerMinConfidence', parseInt(e.target.value) || 50)}
                      min={0}
                      max={100}
                    />
                    <span className={styles.fieldHint}>越低识别越多，但误报也会更多</span>
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>缓存 TTL（小时）</label>
                    <input
                      type="number"
                      className="textInput"
                      value={data.wappalyzerCacheTtlHours}
                      onChange={(e) => updateField('wappalyzerCacheTtlHours', parseInt(e.target.value) || 24)}
                      min={1}
                    />
                    <span className={styles.fieldHint}>技术库缓存时长（0=始终最新）</span>
                  </div>
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>要求 HTML 响应</span>
                    <p className={styles.toggleDescription}>跳过非 HTML 响应，建议开启以提高准确性</p>
                  </div>
                  <Toggle
                    checked={data.wappalyzerRequireHtml}
                    onChange={(checked) => updateField('wappalyzerRequireHtml', checked)}
                  />
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <span className={styles.toggleLabel}>自动更新数据库</span>
                    <p className={styles.toggleDescription}>从 npm 下载最新技术指纹（推荐）</p>
                  </div>
                  <Toggle
                    checked={data.wappalyzerAutoUpdate}
                    onChange={(checked) => updateField('wappalyzerAutoUpdate', checked)}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>NPM 版本</label>
                  <input
                    type="text"
                    className="textInput"
                    value={data.wappalyzerNpmVersion}
                    disabled
                  />
                  <span className={styles.fieldHint}>用于技术库的 Wappalyzer 包版本</span>
                </div>
              </>
            )}
          </div>

          <div className={styles.subSection}>
            <h3 className={styles.subSectionTitle}>Banner 抓取</h3>
            <div className={styles.toggleRow}>
              <div>
                <span className={styles.toggleLabel}>启用 Banner 抓取</span>
                <p className={styles.toggleDescription}>识别非 HTTP 端口的服务版本（SSH/FTP/MySQL/SMTP 等）</p>
              </div>
              <Toggle
                checked={data.bannerGrabEnabled}
                onChange={(checked) => updateField('bannerGrabEnabled', checked)}
              />
            </div>
            {data.bannerGrabEnabled && (
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>超时（秒）</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.bannerGrabTimeout}
                    onChange={(e) => updateField('bannerGrabTimeout', parseInt(e.target.value) || 5)}
                    min={1}
                  />
                  <span className={styles.fieldHint}>单端口连接超时</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>线程数</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.bannerGrabThreads}
                    onChange={(e) => updateField('bannerGrabThreads', parseInt(e.target.value) || 20)}
                    min={1}
                  />
                  <span className={styles.fieldHint}>Banner 抓取并发线程数</span>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Banner 最大长度</label>
                  <input
                    type="number"
                    className="textInput"
                    value={data.bannerGrabMaxLength}
                    onChange={(e) => updateField('bannerGrabMaxLength', parseInt(e.target.value) || 500)}
                    min={100}
                    max={5000}
                  />
                  <span className={styles.fieldHint}>超过该长度的 Banner 会被截断（字符）</span>
                </div>
              </div>
            )}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Docker 镜像</label>
            <input
              type="text"
              className="textInput"
              value={data.httpxDockerImage}
              disabled
            />
          </div>
          </>
          )}
        </div>
      )}
    </div>
  )
}
