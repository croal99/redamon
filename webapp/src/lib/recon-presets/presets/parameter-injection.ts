import type { ReconPreset } from '../types'

export const PARAMETER_INJECTION: ReconPreset = {
  id: 'parameter-injection',
  name: '参数与注入面',
  icon: '',
  image: '/preset-terminal.svg',
  shortDescription: '尽可能发现参数以服务注入测试。Arjun 全方法、ParamSpider、带校验的 GAU、Katana paramsOnly，以及带注入标签的 Nuclei DAST。',
  fullDescription: `### 流程目标
找出目标上所有可达参数与输入向量，并进一步测试注入风险。该预设把多个参数提取工具串起来：Arjun 对全部 HTTP 方法爆破隐藏参数，ParamSpider 从归档中挖掘历史参数名，GAU 抓取带查询串的历史 URL，Katana 则在 paramsOnly 模式下仅输出包含参数的 URL。随后由 Nuclei 以 DAST 模式运行 SQLi、XSS、SSRF、LFI、RFI、SSTI 等注入模板。

### 适用人群
适合聚焦注入类漏洞的渗透测试人员与漏洞赏金猎人，尤其适用于参数面庞大、隐藏参数多、流程复杂的旧系统、CMS、多步骤表单或其他存在大量未文档化输入点的应用。

### 启用内容
- 全量子域发现，用于尽可能扩大可测试参数面
- httpx 标准探测与技术识别
- Katana paramsOnly 模式，仅输出带查询参数的 URL
- GAU 启用 URL 校验与方法检测，拉取有效历史参数化 URL
- ParamSpider 做被动参数挖掘
- Arjun 覆盖 5 种 HTTP 方法，最多 200 个端点，chunk size 1000
- jsluice 从 JavaScript 文件提取带参数的 URL
- Nuclei 以 DAST 模式运行 sqli、xss、ssrf、lfi、rfi、ssti、injection 标签模板

### 禁用内容
- 端口扫描（Naabu、Masscan、Nmap）：参数测试针对 HTTP 端点而非端口
- Hakrawler：Katana 的 paramsOnly 更聚焦参数提取
- ffuf、Kiterunner：目录/API 爆破不是主要目标
- JS Recon：深度 JS 分析不是必须，URL 提取由 jsluice 负责
- Banner 抓取、Wappalyzer：与参数导向测试关系不大
- 全部 OSINT 增强：与注入测试关联低
- Security Checks：Header 分析优先级低于输入验证问题
- CVE 查询与 MITRE 增强：漏洞识别主要由 Nuclei 完成

### 工作方式
1. 子域发现阶段尽可能扩大参数覆盖面
2. httpx 识别在线主机
3. Katana 在 paramsOnly 模式下输出所有带查询参数的 URL
4. GAU 从归档中拉取参数化 URL，并做在线校验
5. ParamSpider 挖掘更多历史参数名
6. Arjun 对所有发现的端点和 HTTP 方法爆破隐藏参数
7. jsluice 从 JavaScript 中提取参数化 URL
8. Nuclei 以 DAST 模式执行注入定向模板与 OOB 检测`,
  parameters: {
    // Modules: domain discovery + http probe + resource enum + vuln scan
    scanModules: ['domain_discovery', 'http_probe', 'resource_enum', 'vuln_scan'],

    stealthMode: false,
    useTorForRecon: false,

    // --- Subdomain Discovery: all tools, default limits ---
    subdomainDiscoveryEnabled: true,
    crtshEnabled: true,
    hackerTargetEnabled: true,
    knockpyReconEnabled: true,
    subfinderEnabled: true,
    amassEnabled: true,
    amassActive: false,
    amassBrute: false,
    purednsEnabled: true,
    useBruteforceForSubdomains: false,

    whoisEnabled: true,
    dnsEnabled: true,

    // --- DISABLE port scanning ---
    naabuEnabled: false,
    masscanEnabled: false,
    nmapEnabled: false,

    // --- httpx: standard probing with tech detect ---
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
    httpxProbeWordCount: false,
    httpxProbeLineCount: false,
    httpxProbeTechDetect: true,
    httpxProbeIp: true,
    httpxProbeCname: false,
    httpxProbeTlsInfo: false,
    httpxProbeTlsGrab: false,
    httpxProbeFavicon: false,
    httpxProbeJarm: false,
    httpxProbeAsn: false,
    httpxProbeCdn: false,
    httpxIncludeResponse: false,
    httpxIncludeResponseHeaders: false,

    // --- DISABLE Wappalyzer ---
    wappalyzerEnabled: false,

    // --- DISABLE banner grabbing ---
    bannerGrabEnabled: false,

    // --- VHost & SNI: more endpoints to discover = more parameters to fuzz ---
    vhostSniEnabled: true,
    vhostSniTestL7: true,
    vhostSniTestL4: true,
    vhostSniUseDefaultWordlist: true,
    vhostSniUseGraphCandidates: true,
    vhostSniInjectDiscovered: true,     // new URLs feed Katana/ParamSpider/Arjun

    // --- Katana: paramsOnly mode for parameterized URL extraction ---
    katanaEnabled: true,
    katanaDepth: 2,
    katanaMaxUrls: 500,
    katanaRateLimit: 50,
    katanaTimeout: 1800,
    katanaJsCrawl: true,
    katanaParamsOnly: true,

    // --- DISABLE Hakrawler ---
    hakrawlerEnabled: false,
    zapAjaxSpiderEnabled: false,

    // --- GAU: enabled with URL verification and method detection ---
    gauEnabled: true,
    gauProviders: ['wayback', 'commoncrawl', 'otx', 'urlscan'],
    gauMaxUrls: 5000,
    gauTimeout: 90,
    gauThreads: 5,
    gauVerifyUrls: true,
    gauDetectMethods: true,
    gauFilterDeadEndpoints: true,

    // --- ParamSpider: enabled ---
    paramspiderEnabled: true,
    paramspiderTimeout: 180,

    // --- jsluice: extract parameterized URLs from JS ---
    jsluiceEnabled: true,
    jsluiceMaxFiles: 100,
    jsluiceExtractSecrets: false,
    jsluiceExtractUrls: true,
    jsluiceConcurrency: 5,

    // --- DISABLE JS Recon ---
    jsReconEnabled: false,

    aiSurfaceReconEnabled: false,
    // --- DISABLE ffuf ---
    ffufEnabled: false,

    // --- DISABLE Kiterunner ---
    kiterunnerEnabled: false,

    // --- Arjun: all methods, high endpoint limit, large chunk size ---
    arjunEnabled: true,
    arjunThreads: 5,
    arjunTimeout: 20,
    arjunScanTimeout: 1200,
    arjunMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    arjunMaxEndpoints: 200,
    arjunChunkSize: 1000,
    arjunPassive: false,

    // --- Nuclei: DAST mode with injection-specific tags ---
    nucleiEnabled: true,
    nucleiSeverity: ['critical', 'high', 'medium', 'low'],
    nucleiRateLimit: 100,
    nucleiBulkSize: 25,
    nucleiConcurrency: 25,
    nucleiTimeout: 10,
    nucleiRetries: 2,
    nucleiDastMode: true,
    nucleiAutoUpdateTemplates: true,
    nucleiHeadless: false,
    nucleiSystemResolvers: true,
    nucleiFollowRedirects: true,
    nucleiMaxRedirects: 10,
    nucleiScanAllIps: false,
    nucleiInteractsh: true,
    nucleiTags: ['sqli', 'xss', 'ssrf', 'lfi', 'rfi', 'ssti', 'injection'],

    // --- GraphQL Security: parameter/mutation testing fits this preset ---
    graphqlSecurityEnabled: true,
    graphqlCopEnabled: true,

    // --- DISABLE CVE lookup & MITRE ---
    cveLookupEnabled: false,
    mitreEnabled: false,

    // --- DISABLE security checks ---
    securityCheckEnabled: false,

    // --- DISABLE all OSINT ---
    osintEnrichmentEnabled: false,
    shodanEnabled: false,
    urlscanEnabled: false,
    otxEnabled: false,
    censysEnabled: false,
    fofaEnabled: false,
    netlasEnabled: false,
    virusTotalEnabled: false,
    zoomEyeEnabled: false,
    criminalIpEnabled: false,
    uncoverEnabled: false,
  },
}
