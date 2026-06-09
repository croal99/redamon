import type { ReconPreset } from '../types'

export const FULL_PASSIVE_SCAN: ReconPreset = {
  id: 'full-passive-scan',
  name: '全流程 - 仅被动扫描',
  icon: '',
  image: '/preset-spy.svg',
  shortDescription: '不向目标发送任何数据包。仅从第三方来源、归档与被动数据库中提取最大情报。',
  fullDescription: `### 流程目标
在不向目标发送任何一个数据包的前提下，尽可能多地收集目标情报。该预设中的所有工具只查询第三方 API、公共数据库、证书透明日志和 Web 归档，不会直接接触目标。

### 适用人群
适合前期准备阶段的红队、OSINT 分析师，或任何在授权尚未到位前需要先了解攻击面的人员。也适合希望在不惊动目标 SOC 或 WAF 的情况下评估外部暴露面的场景。

### 启用内容
- 全量子域发现：crt.sh、HackerTarget、Knockpy、Subfinder、Amass（仅被动模式）
- WHOIS 与 DNS 解析（使用公共解析器）
- Puredns 泛解析过滤
- Naabu 被动模式（查询 Shodan InternetDB）
- GAU 使用全部 4 个提供方，最多 10000 URL
- ParamSpider 从 Wayback CDX 提取历史参数化 URL
- Arjun 被动模式，无需向目标发请求
- 全部 10 个 OSINT 提供方
- 若被动来源识别出服务版本，则启用 CVE 查询与 MITRE 增强

### 禁用内容
- httpx：会主动向目标发 HTTP 请求
- 所有 Web 爬虫（Katana、Hakrawler）
- jsluice 与 JS Recon：需要从目标下载文件
- ffuf 与 Kiterunner：会对目标做爆破
- Arjun 主动模式
- Nuclei：属于主动漏洞测试
- Masscan 与 Nmap：会向目标发包
- Banner 抓取：会直接连接目标服务
- Wappalyzer：依赖目标 HTTP 响应
- Security Checks：部分检测会直接触达目标
- Amass 主动模式与爆破
- Stealth Mode：没有必要，因为完全不接触目标

### 工作方式
1. 子域发现通过证书透明、DNS 数据库与 OSINT API 枚举已知子域
2. DNS 解析使用公共解析器将子域映射到 IP
3. Puredns 过滤泛解析域名
4. Naabu 被动模式查询 Shodan InternetDB 中已知开放端口
5. GAU 与 ParamSpider 从 Wayback、CommonCrawl、OTX、URLScan 拉取历史 URL 与参数
6. Arjun 被动模式从历史数据中推断参数
7. 10 个 OSINT 提供方为资产补充地理位置、服务、Banner、威胁情报与被动 CVE
8. CVE 查询与 MITRE 增强将识别出的服务版本映射到已知漏洞与攻击模式`,
  parameters: {
    // Modules: domain_discovery + port_scan (passive) + resource_enum (GAU/ParamSpider only)
    //        + vuln_scan (needed for CVE lookup + MITRE enrichment -- Nuclei itself is
    //          disabled below so nothing active is sent to the target).
    // No http_probe (sends requests), no js_recon (downloads files).
    scanModules: ['domain_discovery', 'port_scan', 'resource_enum', 'vuln_scan'],

    // Stealth OFF (not needed -- nothing active), Tor OFF
    stealthMode: false,
    useTorForRecon: false,

    // --- Subdomain Discovery: all tools enabled, Amass PASSIVE only ---
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

    // --- WHOIS & DNS: enabled ---
    whoisEnabled: true,
    dnsEnabled: true,

    // --- Port Scanning: Naabu PASSIVE ONLY (InternetDB) ---
    naabuEnabled: true,
    naabuPassiveMode: true,
    naabuScanType: 'c',
    naabuRateLimit: 10,
    naabuThreads: 1,

    // --- DISABLE all active port scanners ---
    masscanEnabled: false,
    nmapEnabled: false,

    // --- DISABLE httpx (sends HTTP requests to target) ---
    httpxEnabled: false,

    // --- DISABLE Wappalyzer (needs HTTP responses) ---
    wappalyzerEnabled: false,

    // --- DISABLE banner grabbing (connects to target services) ---
    bannerGrabEnabled: false,

    // --- DISABLE all active crawlers ---
    katanaEnabled: false,
    hakrawlerEnabled: false,
    zapAjaxSpiderEnabled: false,

    // --- DISABLE jsluice (downloads JS files from target) ---
    jsluiceEnabled: false,

    // --- DISABLE JS Recon (crawls and downloads from target) ---
    jsReconEnabled: false,

    // --- DISABLE directory fuzzing ---
    ffufEnabled: false,

    // --- DISABLE API discovery ---
    kiterunnerEnabled: false,

    // --- Arjun: passive mode only (no requests to target) ---
    arjunEnabled: true,
    arjunPassive: true,

    // --- ENABLE GAU: passive archive URL discovery, all providers, high limits ---
    gauEnabled: true,
    gauProviders: ['wayback', 'commoncrawl', 'otx', 'urlscan'],
    gauMaxUrls: 10000,
    gauTimeout: 120,
    gauThreads: 10,
    gauVerbose: false,
    gauVerifyUrls: false,
    gauDetectMethods: false,
    gauFilterDeadEndpoints: false,

    // --- ENABLE ParamSpider: passive Wayback parameter mining ---
    paramspiderEnabled: true,
    paramspiderTimeout: 180,

    // --- DISABLE all vulnerability scanning ---
    nucleiEnabled: false,
    securityCheckEnabled: false,

    // --- VHost & SNI: explicitly disabled — preset's identity is "no packets to target" ---
    vhostSniEnabled: false,

    // --- ENABLE CVE lookup (queries NVD/Vulners APIs, not the target) ---
    cveLookupEnabled: true,
    cveLookupMaxCves: 50,
    cveLookupMinCvss: 0.0,

    // --- ENABLE MITRE enrichment (offline database, no network) ---
    mitreEnabled: true,
    mitreAutoUpdateDb: true,
    mitreIncludeCwe: true,
    mitreIncludeCapec: true,
    mitreEnrichRecon: true,

    // --- ENABLE all OSINT providers at maximum ---
    osintEnrichmentEnabled: true,

    shodanEnabled: true,
    shodanHostLookup: true,
    shodanReverseDns: true,
    shodanDomainDns: true,
    shodanPassiveCves: true,

    urlscanEnabled: true,
    urlscanMaxResults: 10000,

    otxEnabled: true,

    censysEnabled: true,

    fofaEnabled: true,
    fofaMaxResults: 5000,

    netlasEnabled: true,

    virusTotalEnabled: true,

    zoomEyeEnabled: true,
    zoomEyeMaxResults: 5000,

    criminalIpEnabled: true,

    uncoverEnabled: true,
    uncoverMaxResults: 1000,

    // --- GraphQL: explicit OFF so switching from a GraphQL-enabled preset resets cleanly ---
    graphqlSecurityEnabled: false,
    graphqlCopEnabled: false,
  },
}
