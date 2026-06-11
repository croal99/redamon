import type { ReconPreset } from '../types'

export const CLOUD_EXPOSURE: ReconPreset = {
  id: 'cloud-exposure',
  name: '云与外网暴露',
  icon: '',
  image: '/preset-cloud-lock.svg',
  shortDescription: '聚焦云环境安全评估。启用 OSINT、ASN/CDN/TLS 探针、云配置安全检查，以及带云模板的 Nuclei。',
  fullDescription: `### 流程目标
识别外部攻击面中的云暴露服务、错误配置与影子基础设施。该预设组合了全部 OSINT 数据源、带 ASN/CDN 检测的 httpx、针对云常见端口的扫描、云与配置错误相关的 Nuclei 模板，以及完整的基础设施暴露检查。

### 适用人群
适合云安全工程师、针对云托管组织的红队，以及审计外部云资产暴露面的安全团队。尤其适用于怀疑目标存在 Kubernetes 控制面、开放数据库、未保护管理面板或遗留开发实例等云侧问题的场景。

### 启用内容
- 全量子域发现（全部工具，10000 上限）以寻找云托管主机名
- Naabu 对云常见端口做 SYN 扫描（K8s API、数据库、管理面板、Docker 等）
- Nmap 进行服务版本识别与 NSE 脚本探测
- httpx 开启全部探针，包括 ASN、CDN、TLS、JARM、favicon 哈希等
- Wappalyzer 识别云平台与技术栈
- Banner 抓取非 HTTP 云服务
- Nuclei 扫描 critical/high/medium，并使用 Interactsh 做 OOB 检测
- CVE 查询与 MITRE CWE/CAPEC 增强
- 全部 10 个 OSINT 提供方
- 全部 28 项安全检查，重点覆盖 Kubernetes API、数据库、管理端口与 Redis 无认证

### 禁用内容
- Web 爬虫（Katana、Hakrawler）：目标不是页面内容，而是云基础设施
- 目录爆破与 API 路由发现（ffuf、Kiterunner）：Web 层工具，此处不重点使用
- 参数发现（Arjun、ParamSpider）：不针对 Web 参数测试
- GAU：历史 URL 对实时云暴露帮助较小
- jsluice、JS Recon：JS 分析与云基础设施关联不大
- Masscan：改用更聚焦云端口的 Naabu

### 工作方式
1. 子域发现枚举所有可能的云托管主机名
2. Naabu 扫描与云相关的常见端口
3. Nmap 对已发现端口补充版本与脚本信息
4. httpx 对 Web 端点做 ASN/CDN/TLS 指纹识别，判断云供应商线索
5. 全部 OSINT 提供方查询外部数据库，补充云暴露资产与历史信息
6. Nuclei 对已发现服务执行云/配置错误模板并进行 OOB 检测
7. CVE 查询将服务版本映射到已知漏洞
8. MITRE 增强将发现归类到 CWE 与 CAPEC
9. Security Checks 标记 Kubernetes API、开放数据库、管理面板与云配置错误`,
  parameters: {
    // Modules: domain_discovery + port_scan + http_probe + vuln_scan
    // No resource_enum, no js_recon
    scanModules: ['domain_discovery', 'port_scan', 'http_probe', 'vuln_scan'],

    stealthMode: false,
    useTorForRecon: false,

    // --- Subdomain Discovery: all tools, high limits ---
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
    amassActive: false,
    amassBrute: false,
    amassMaxResults: 10000,
    amassTimeout: 15,
    purednsEnabled: true,
    useBruteforceForSubdomains: false,

    whoisEnabled: true,
    dnsEnabled: true,

    // --- Naabu: SYN scan, cloud-common ports ---
    naabuEnabled: true,
    naabuPassiveMode: false,
    naabuScanType: 's',
    naabuCustomPorts: '22,80,443,2376,3389,5432,6379,8080,8443,9200,9300,27017,5601,8888,10250,6443',
    naabuRateLimit: 500,
    naabuThreads: 25,
    naabuTimeout: 10000,
    naabuRetries: 2,
    naabuVerifyPorts: true,
    naabuSkipHostDiscovery: true,

    // --- Masscan: disabled ---
    masscanEnabled: false,

    // --- Nmap: version detection + NSE scripts ---
    nmapEnabled: true,
    nmapVersionDetection: true,
    nmapScriptScan: true,
    nmapTimingTemplate: 'T3',
    nmapTimeout: 600,
    nmapHostTimeout: 300,

    // --- httpx: all probes including ASN, CDN, TLS ---
    httpxEnabled: true,
    httpxThreads: 50,
    httpxTimeout: 15,
    httpxRetries: 2,
    httpxRateLimit: 75,
    httpxFollowRedirects: true,
    httpxMaxRedirects: 10,
    httpxProbeStatusCode: true,
    httpxProbeContentLength: true,
    httpxProbeContentType: true,
    httpxProbeTitle: true,
    httpxProbeServer: true,
    httpxProbeResponseTime: true,
    httpxProbeWordCount: true,
    httpxProbeLineCount: true,
    httpxProbeTechDetect: true,
    httpxProbeIp: true,
    httpxProbeCname: true,
    httpxProbeTlsInfo: true,
    httpxProbeTlsGrab: true,
    httpxProbeFavicon: true,
    httpxProbeJarm: true,
    httpxProbeHash: 'sha256',
    httpxProbeAsn: true,
    httpxProbeCdn: true,
    httpxIncludeResponse: false,
    httpxIncludeResponseHeaders: true,

    // --- Wappalyzer: enabled ---
    wappalyzerEnabled: true,
    wappalyzerMinConfidence: 30,
    wappalyzerAutoUpdate: true,

    // --- Banner Grabbing: enabled ---
    bannerGrabEnabled: true,
    bannerGrabTimeout: 10,
    bannerGrabThreads: 20,
    bannerGrabMaxLength: 1000,

    // --- DISABLE web crawlers ---
    katanaEnabled: false,
    hakrawlerEnabled: false,
    zapAjaxSpiderEnabled: false,

    // --- DISABLE archive/passive URL discovery ---
    gauEnabled: false,
    paramspiderEnabled: false,

    // --- DISABLE JS analysis ---
    jsluiceEnabled: false,
    jsReconEnabled: false,

    aiSurfaceReconEnabled: false,
    // --- DISABLE directory/API fuzzing ---
    ffufEnabled: false,
    kiterunnerEnabled: false,

    // --- DISABLE parameter discovery ---
    arjunEnabled: false,

    // --- VHost & SNI: critical for k8s ingress / Cloudflare / NGINX vhost discovery ---
    vhostSniEnabled: true,
    vhostSniTestL7: true,
    vhostSniTestL4: true,                    // Catches k8s ingress / CDN routing -- core to cloud-exposure preset
    vhostSniUseDefaultWordlist: true,
    vhostSniUseGraphCandidates: true,
    vhostSniInjectDiscovered: true,

    // --- Nuclei: cloud/misconfig focus ---
    nucleiEnabled: true,
    nucleiSeverity: ['critical', 'high', 'medium'],
    nucleiTags: ['cloud', 'kubernetes', 'k8s', 'aws', 'gcp', 'azure', 'docker', 'misconfig', 'exposure'],
    nucleiRateLimit: 100,
    nucleiBulkSize: 25,
    nucleiConcurrency: 25,
    nucleiTimeout: 10,
    nucleiRetries: 2,
    nucleiDastMode: false,
    nucleiHeadless: false,
    nucleiAutoUpdateTemplates: true,
    nucleiSystemResolvers: true,
    nucleiFollowRedirects: true,
    nucleiMaxRedirects: 10,
    nucleiScanAllIps: false,
    nucleiInteractsh: true,

    // --- CVE Lookup ---
    cveLookupEnabled: true,
    cveLookupMaxCves: 30,
    cveLookupMinCvss: 0.0,

    // --- MITRE ---
    mitreEnabled: true,
    mitreAutoUpdateDb: true,
    mitreIncludeCwe: true,
    mitreIncludeCapec: true,
    mitreEnrichRecon: true,

    // --- Security Checks: ALL enabled ---
    securityCheckEnabled: true,
    securityCheckDirectIpHttp: true,
    securityCheckDirectIpHttps: true,
    securityCheckIpApiExposed: true,
    securityCheckWafBypass: true,
    securityCheckTlsExpiringSoon: true,
    securityCheckTlsExpiryDays: 30,
    securityCheckMissingReferrerPolicy: true,
    securityCheckMissingPermissionsPolicy: true,
    securityCheckMissingCoop: true,
    securityCheckMissingCorp: true,
    securityCheckMissingCoep: true,
    securityCheckCacheControlMissing: true,
    securityCheckLoginNoHttps: true,
    securityCheckSessionNoSecure: true,
    securityCheckSessionNoHttponly: true,
    securityCheckBasicAuthNoTls: true,
    securityCheckSpfMissing: true,
    securityCheckDmarcMissing: true,
    securityCheckDnssecMissing: true,
    securityCheckZoneTransfer: true,
    securityCheckAdminPortExposed: true,
    securityCheckDatabaseExposed: true,
    securityCheckRedisNoAuth: true,
    securityCheckKubernetesApiExposed: true,
    securityCheckSmtpOpenRelay: true,
    securityCheckCspUnsafeInline: true,
    securityCheckInsecureFormAction: true,
    securityCheckNoRateLimiting: true,
    securityCheckTimeout: 15,
    securityCheckMaxWorkers: 15,

    // --- OSINT: ALL providers enabled ---
    osintEnrichmentEnabled: true,
    shodanEnabled: true,
    shodanHostLookup: true,
    shodanReverseDns: true,
    shodanDomainDns: false,
    shodanPassiveCves: true,

    censysEnabled: true,

    urlscanEnabled: true,
    urlscanMaxResults: 5000,

    otxEnabled: true,

    fofaEnabled: true,
    fofaMaxResults: 3000,

    netlasEnabled: true,

    virusTotalEnabled: true,

    zoomEyeEnabled: true,
    zoomEyeMaxResults: 3000,

    criminalIpEnabled: true,

    uncoverEnabled: true,
    uncoverMaxResults: 500,

    // --- GraphQL: explicit OFF so switching from a GraphQL-enabled preset resets cleanly ---
    graphqlSecurityEnabled: false,
    graphqlCopEnabled: false,
  },
}
