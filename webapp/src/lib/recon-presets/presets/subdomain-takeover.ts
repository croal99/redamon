import type { ReconPreset } from '../types'

export const SUBDOMAIN_TAKEOVER: ReconPreset = {
  id: 'subdomain-takeover',
  name: '子域接管猎手',
  icon: '',
  image: '/preset-capture.svg',
  shortDescription: '高强度接管狩猎。最广子域发现范围，联动 Subjack、Nuclei takeover 模板与 BadDNS，并降低置信阈值以暴露更多人工复核候选。',
  fullDescription: `### 流程目标
尽可能发现每一个子域，并从中榨出所有潜在接管结果。这是用于子域接管狩猎的一站式预设：最大化发现广度 + 最大化检测深度 + 尽量低的置信阈值。

### 适用人群
- 追踪 CNAME、NS、陈旧 A、SPF/MX 等多种接管路径的漏洞赏金猎人
- 在并购、组织调整、云迁移等场景中做 DNS 卫生审计的团队
- 需要审计大型域名资产的资产盘点团队

### 启用内容 - 发现层
- 全部 5 个子域工具都拉到高上限，配合主动 Amass 与爆破，尽量提升覆盖率
- Puredns 做解析与泛解析过滤
- 启用子域爆破字典（jhaddix-all.txt）
- WHOIS 与 DNS 查询补充归属与记录上下文
- GAU 从 Wayback、CommonCrawl、OTX、URLScan 中挖掘历史 URL，补抓历史存在但当前 DNS 中已不明显的子域

### 启用内容 - 接管检测层
- httpx 启用 CNAME、状态码、标题、IP、技术识别、TLS 信息，用于喂给接管检测流程
- BadDNS（隔离 sidecar）启用 cname、ns、mx、txt、spf、dmarc、wildcard 模块
- Subjack 开启全部可选检查：CNAME、NS、陈旧 A、SPF include、MX、强制 HTTPS 等
- Nuclei 接管模板（http/takeovers/ 与 dns/），覆盖 4 个严重级别
- 置信阈值降到 40，暴露更多 likely / manual_review 候选
- 自动发布人工复核结果，让低置信度接管候选也能进入主表
- 提高 takeover 流程限速，加快扫描完成时间

### 禁用内容
- 完整 Nuclei 漏洞扫描：接管模块本身已运行专用 takeover 模板，无需重复
- 端口扫描（Naabu、Nmap、Masscan）：与接管无关
- Web 爬虫、目录爆破、参数发现（Katana、Hakrawler、ffuf、Kiterunner、Arjun、ParamSpider）
- JS 分析（jsluice、JS Recon）
- Wappalyzer、Banner 抓取与较重的 httpx 探针
- CVE 查询与 MITRE 增强：重点只放在接管
- Security Checks：避免混入无关 Header/TLS/WAF 噪音
- 全部 OSINT 增强：信噪比不高且容易重复工作
- GraphQL：完全无关

### 分层扫描如何工作
1. 子域发现阶段通过 5 个被动来源 + Amass 主动模式 + 爆破 + Puredns + GAU 历史数据尽可能扩展目标集合
2. DNS 解析构建完整的子域到 IP 映射
3. httpx 找出存活 URL
4. 第 6 组 A 阶段并行运行 Subjack 与 Nuclei 接管模板
   - Subjack 根据内置指纹库检查 CNAME/NS/MX 链
   - Nuclei 仅对 http/takeovers/ 与 dns/ 模板做定向扫描
5. 去重逻辑按 (hostname, provider, method) 合并结果；双工具共同确认会提升 confirmation_count 与 confidence
6. 阈值 40 下，结果会被分为 confirmed、likely、manual_review
7. 自动发布会把 manual_review 从 info 提升为 medium，确保显示在结果表中
8. 每条发现最终都会写入图谱，作为与子域关联的 Vulnerability 节点

### 注意事项
- stale A 检测会探测云 IP 范围，可能带来一些误报，因此人工复核非常重要
- 当发现范围很广时，下游 Nuclei takeover 流程可能需要 30 分钟以上
- 由于自动发布已开启，低置信度结果也会进入主结果列表，建议先按 verdict 过滤 confirmed，再看 likely 与 manual_review`,
  parameters: {
    // Pipeline modules: discovery + http_probe + resource_enum (for GAU only) + vuln_scan.
    // resource_enum is present so GAU runs; all other resource_enum tools are
    // explicitly disabled below.
    scanModules: ['domain_discovery', 'http_probe', 'resource_enum', 'vuln_scan'],

    stealthMode: false,
    useTorForRecon: false,

    // ============================================================
    // DISCOVERY LAYER -- maximum breadth
    // ============================================================
    subdomainDiscoveryEnabled: true,
    crtshEnabled: true,
    crtshMaxResults: 10000,
    hackerTargetEnabled: true,
    hackerTargetMaxResults: 10000,
    knockpyReconEnabled: true,
    knockpyReconMaxResults: 10000,
    subfinderEnabled: true,
    subfinderMaxResults: 10000,
    amassEnabled: true,
    amassActive: true,           // Active queries on top of passive sources
    amassBrute: true,            // Brute-force subdomain wordlist
    amassMaxResults: 10000,
    amassTimeout: 15,
    purednsEnabled: true,        // Wildcard filtering
    useBruteforceForSubdomains: true,

    whoisEnabled: true,
    dnsEnabled: true,

    // --- GAU: historical URL mining adds subdomains not in live DNS ---
    gauEnabled: true,
    gauProviders: ['wayback', 'commoncrawl', 'otx', 'urlscan'],
    gauMaxUrls: 5000,
    gauVerifyUrls: false,

    // ============================================================
    // HTTP PROBE -- required inputs for Nuclei takeover pass
    // ============================================================
    httpxEnabled: true,
    httpxFollowRedirects: true,
    httpxProbeStatusCode: true,
    httpxProbeTitle: true,
    httpxProbeIp: true,
    httpxProbeCname: true,        // Critical for dangling-CNAME detection
    httpxProbeTechDetect: true,
    httpxProbeTlsInfo: true,
    // Heavy probes off
    httpxProbeJarm: false,
    httpxProbeFavicon: false,
    httpxProbeAsn: false,
    httpxProbeCdn: false,
    httpxIncludeResponse: false,
    httpxIncludeResponseHeaders: false,
    httpxProbeWordCount: false,
    httpxProbeLineCount: false,
    httpxProbeTlsGrab: false,

    wappalyzerEnabled: false,
    bannerGrabEnabled: false,

    // ============================================================
    // OFF: port scanning, crawlers, fuzzers, parameter discovery, JS analysis
    // ============================================================
    naabuEnabled: false,
    nmapEnabled: false,
    masscanEnabled: false,
    katanaEnabled: false,
    hakrawlerEnabled: false,
    zapAjaxSpiderEnabled: false,
    paramspiderEnabled: false,
    jsluiceEnabled: false,
    jsReconEnabled: false,
    aiSurfaceReconEnabled: false,
    ffufEnabled: false,
    kiterunnerEnabled: false,
    arjunEnabled: false,

    // ============================================================
    // NUCLEI full scanner: DISABLED
    // The dedicated takeover module below runs its own Nuclei pass with
    // http/takeovers/ + dns/ templates. Running the full scanner in addition
    // would duplicate takeover template execution without new coverage.
    // ============================================================
    nucleiEnabled: false,

    // ============================================================
    // TAKEOVER DETECTION LAYER -- every layer, every check, lowest threshold
    // ============================================================
    subdomainTakeoverEnabled: true,
    subjackEnabled: true,
    subjackSsl: true,
    subjackAll: true,             // Probe every URL, not just identified CNAMEs
    subjackCheckNs: true,         // NS takeovers (expired nameservers / dangling cloud DNS)
    subjackCheckAr: true,         // Stale A records (dead cloud IPs -- manual-review candidates)
    subjackCheckMail: true,       // SPF include + MX takeovers (email-vector attacks)
    subjackThreads: 20,           // Aggressive -- DNS is cheap
    subjackTimeout: 30,
    subjackRunTimeout: 1800,      // 30 min hard cap
    nucleiTakeoversEnabled: true,
    nucleiTakeoverRunTimeout: 2400,            // 40 min hard cap
    takeoverSeverity: ['critical', 'high', 'medium', 'low'],
    takeoverConfidenceThreshold: 40,           // Lower than default 60 -- surface more candidates
    takeoverRateLimit: 100,                    // Higher than default 50 -- faster Nuclei pass
    takeoverManualReviewAutoPublish: true,     // Elevate manual_review findings to severity: medium

    // VHost & SNI -- discovers hidden vhosts behind shared IPs (admin / staging /
    // internal panels not listed in DNS). Conceptually adjacent to subdomain
    // takeover hunting — both expose hidden infrastructure.
    vhostSniEnabled: true,
    vhostSniTestL7: true,
    vhostSniTestL4: true,
    vhostSniUseDefaultWordlist: true,
    vhostSniUseGraphCandidates: true,
    vhostSniInjectDiscovered: true,
    vhostSniConcurrency: 30,            // Aggressive on a takeover-hunting preset

    // BadDNS AGPL-3.0 sidecar -- deep DNS coverage across all high-value modules.
    // Runs in its own Docker image (redamon-baddns:latest); no license contagion
    // since RedAmon never imports baddns and communicates over stdout only.
    // MTA-STS is intentionally omitted (upstream CLI validator rejects it).
    baddnsEnabled: true,
    baddnsModules: ['cname', 'ns', 'mx', 'txt', 'spf', 'dmarc', 'wildcard'],
    baddnsRunTimeout: 1800,

    // ============================================================
    // OFF: CVE / MITRE / SecurityChecks / OSINT / GraphQL
    // ============================================================
    cveLookupEnabled: false,
    mitreEnabled: false,
    securityCheckEnabled: false,
    osintEnrichmentEnabled: false,
    shodanEnabled: false,
    censysEnabled: false,
    urlscanEnabled: false,
    otxEnabled: false,
    fofaEnabled: false,
    netlasEnabled: false,
    virusTotalEnabled: false,
    zoomEyeEnabled: false,
    criminalIpEnabled: false,
    uncoverEnabled: false,
    graphqlSecurityEnabled: false,
    graphqlCopEnabled: false,
  },
}
