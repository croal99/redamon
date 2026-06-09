import type { ReconPreset } from '../types'

export const OSINT_INVESTIGATOR: ReconPreset = {
  id: 'osint-investigator',
  name: 'OSINT 调查员',
  icon: '',
  image: '/preset-binoculars.svg',
  shortDescription: '从全部 10 个 OSINT 提供方、归档与公共数据库中获取最大化被动情报，不做主动扫描。',
  fullDescription: `### 流程目标
从所有可用的被动数据源中榨取尽可能多的情报。该预设启用全部 10 个 OSINT 提供方，并把结果上限尽量拉高，同时结合 GAU、ParamSpider 与 Arjun 被动模式，重点是从第三方数据构建完整目标画像，而不是直接寻找可利用漏洞。

### 适用人群
适合 OSINT 分析师、威胁情报团队，以及在行动前构建目标档案的红队。也适合希望从攻击者视角了解自身外部暴露情况、但又不触碰生产系统的安全团队。

### 启用内容
- 全量子域发现（5 个工具均提升到高上限）
- WHOIS 与 DNS 解析
- Puredns 泛解析过滤
- Naabu 被动模式（Shodan InternetDB）
- GAU 全部 4 个提供方，最多 10000 URL
- ParamSpider 历史参数化 URL 提取
- Arjun 被动模式做参数推断
- 全部 10 个 OSINT 提供方：Shodan、URLScan、OTX、Censys、FOFA、Netlas、VirusTotal、ZoomEye、CriminalIP、Uncover
- CVE 查询（每个服务最多 50 条）
- MITRE CWE/CAPEC 增强

### 禁用内容
- httpx：会向目标发请求
- 所有 Web 爬虫（Katana、Hakrawler）
- jsluice 与 JS Recon：需要下载目标文件
- ffuf 与 Kiterunner：属于暴力发现
- 主动端口扫描器（Masscan、Nmap）
- Nuclei：主动漏洞测试
- Banner 抓取
- Wappalyzer
- Security Checks：部分检测会直接接触目标
- Amass 主动模式与爆破
- GAU URL 校验与方法检测：会重新访问目标

### 工作方式
1. 子域发现通过证书透明、DNS 数据库与 OSINT API 枚举资产
2. DNS 解析使用公共解析器把子域映射到 IP
3. Puredns 过滤泛解析
4. Naabu 被动模式查询 Shodan InternetDB 中的历史开放端口
5. GAU 与 ParamSpider 从归档中提取历史 URL 与参数
6. Arjun 被动模式从归档数据中推断参数
7. 10 个 OSINT 提供方为资产补充服务、地理位置、信誉、威胁情报与被动 CVE
8. CVE 查询将识别到的服务版本映射到已知漏洞
9. MITRE 增强按 CWE 与 CAPEC 分类`,
  parameters: {
    // Modules: domain_discovery + port_scan (passive) + resource_enum (GAU/ParamSpider/Arjun passive)
    //        + vuln_scan (needed for CVE lookup + MITRE enrichment -- Nuclei itself is
    //          disabled below so nothing active is sent to the target).
    scanModules: ['domain_discovery', 'port_scan', 'resource_enum', 'vuln_scan'],

    stealthMode: false,
    useTorForRecon: false,

    // --- Subdomain Discovery: all tools, max limits ---
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

    // --- Naabu: passive InternetDB only ---
    naabuEnabled: true,
    naabuPassiveMode: true,
    naabuScanType: 'c',
    naabuRateLimit: 10,
    naabuThreads: 1,

    // --- DISABLE active port scanners ---
    masscanEnabled: false,
    nmapEnabled: false,

    // --- DISABLE httpx ---
    httpxEnabled: false,

    // --- DISABLE Wappalyzer ---
    wappalyzerEnabled: false,

    // --- DISABLE banner grabbing ---
    bannerGrabEnabled: false,

    // --- DISABLE all active crawlers ---
    katanaEnabled: false,
    hakrawlerEnabled: false,
    zapAjaxSpiderEnabled: false,

    // --- GAU: all providers, max results, NO verification (would hit target) ---
    gauEnabled: true,
    gauProviders: ['wayback', 'commoncrawl', 'otx', 'urlscan'],
    gauMaxUrls: 10000,
    gauTimeout: 120,
    gauThreads: 10,
    gauVerbose: false,
    gauVerifyUrls: false,
    gauDetectMethods: false,
    gauFilterDeadEndpoints: false,

    // --- ParamSpider: enabled ---
    paramspiderEnabled: true,
    paramspiderTimeout: 180,

    // --- DISABLE jsluice (downloads from target) ---
    jsluiceEnabled: false,

    // --- DISABLE JS Recon (crawls target) ---
    jsReconEnabled: false,

    // --- DISABLE directory/API fuzzing ---
    ffufEnabled: false,
    kiterunnerEnabled: false,

    // --- Arjun: passive mode only ---
    arjunEnabled: true,
    arjunPassive: true,

    // --- DISABLE Nuclei ---
    nucleiEnabled: false,

    // --- DISABLE security checks ---
    securityCheckEnabled: false,

    // --- VHost & SNI: explicitly disabled — preset's identity is "no active scanning" ---
    vhostSniEnabled: false,

    // --- CVE Lookup: high max ---
    cveLookupEnabled: true,
    cveLookupMaxCves: 50,
    cveLookupMinCvss: 0.0,

    // --- MITRE: full enrichment ---
    mitreEnabled: true,
    mitreAutoUpdateDb: true,
    mitreIncludeCwe: true,
    mitreIncludeCapec: true,
    mitreEnrichRecon: true,

    // --- All 10 OSINT providers at maximum ---
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
