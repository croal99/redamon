import type { ReconPreset } from '../types'

export const SECRET_HUNTER: ReconPreset = {
  id: 'secret-hunter',
  name: '密钥与凭据猎手',
  icon: '',
  image: '/preset-key.svg',
  shortDescription: '不只看 JS，还要到处找密钥。深度 JS 分析、GAU 历史文件、带敏感扩展的 ffuf，以及 Nuclei 的 token/config 暴露模板。',
  fullDescription: `### 流程目标
在目标所有可达表面上搜寻密钥、凭据与敏感配置文件。该预设结合深度 JavaScript 分析、针对敏感扩展的目录爆破、历史 URL 挖掘，以及用于检测暴露 Token 与配置文件的 Nuclei 模板。

### 适用人群
适合希望尽可能发现 API Key、数据库凭据与暴露配置文件的漏洞赏金猎人和红队人员，尤其适用于 Web 面较大、怀疑存在历史泄露或前端泄密的目标。

### 启用内容
- JS Recon 全功能启用，最大文件数 2000，并开启 Key 校验
- jsluice 最多分析 1000 个文件，提取密钥与 URL
- GAU 从 Wayback、CommonCrawl 及其他归档拉取历史文件
- ffuf 针对 .env、.config、.yml、.yaml、.json、.bak、.old、.sql、.log、.key、.pem 等敏感扩展
- Katana 深度 3，并开启 JS 爬取
- Hakrawler 补充爬取覆盖
- Nuclei 使用 exposure、token、secret、config 标签模板

### 禁用内容
- 端口扫描（Naabu、Nmap、Masscan）：不需要，httpx 足够处理常见 Web 端口
- 参数发现（Arjun、ParamSpider）：与密钥狩猎关联不大
- Kiterunner：由更针对敏感扩展的 ffuf 替代
- Banner 抓取与 Wappalyzer：对凭据发现价值有限
- OSINT 增强：关闭以聚焦技术性密钥提取
- CVE 查询、MITRE 与 Security Checks：关闭以减少噪音

### 工作方式
1. 子域发现枚举全部子域
2. httpx 识别在线 Web 服务与技术栈
3. Katana、Hakrawler 与 GAU 联合深爬并补足历史 URL
4. ffuf 针对敏感文件扩展名做模糊测试
5. jsluice 从 JS 文件中提取密钥与 URL
6. JS Recon 深入分析 Source Map、Key 校验、正则模式、DOM Sink 等
7. Nuclei 使用暴露类模板，补捉 Token、Secret 与配置文件问题`,
  parameters: {
    // Pipeline modules
    scanModules: ['domain_discovery', 'http_probe', 'resource_enum', 'vuln_scan', 'js_recon'],

    // Stealth
    stealthMode: false,
    useTorForRecon: false,

    // WHOIS & DNS
    whoisEnabled: true,
    dnsEnabled: true,

    // Port scanning: ALL disabled
    naabuEnabled: false,
    nmapEnabled: false,
    masscanEnabled: false,

    // httpx
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
    httpxProbeTechDetect: true,
    httpxProbeIp: true,
    httpxProbeWordCount: false,
    httpxProbeLineCount: false,
    httpxProbeCname: false,
    httpxProbeTlsInfo: false,
    httpxProbeTlsGrab: false,
    httpxProbeFavicon: false,
    httpxProbeJarm: false,
    httpxProbeAsn: false,
    httpxProbeCdn: false,
    httpxIncludeResponse: false,
    httpxIncludeResponseHeaders: false,

    // Wappalyzer: disabled
    wappalyzerEnabled: false,

    // Banner grabbing: disabled
    bannerGrabEnabled: false,

    // --- VHost & SNI: admin/internal panels behind hidden vhosts often leak secrets ---
    vhostSniEnabled: true,
    vhostSniTestL7: true,
    vhostSniTestL4: true,
    vhostSniUseDefaultWordlist: true,
    vhostSniUseGraphCandidates: true,
    vhostSniInjectDiscovered: true,     // newly discovered URLs feed Katana/Hakrawler for secret discovery

    // Katana
    katanaEnabled: true,
    katanaDepth: 3,
    katanaMaxUrls: 1500,
    katanaRateLimit: 75,
    katanaTimeout: 3600,
    katanaJsCrawl: true,

    // Hakrawler
    hakrawlerEnabled: true,
    zapAjaxSpiderEnabled: false,
    hakrawlerDepth: 3,
    hakrawlerThreads: 5,
    hakrawlerTimeout: 45,
    hakrawlerMaxUrls: 800,
    hakrawlerIncludeSubs: true,
    hakrawlerInsecure: true,

    // GAU
    gauEnabled: true,
    gauProviders: ['wayback', 'commoncrawl', 'otx', 'urlscan'],
    gauMaxUrls: 5000,
    gauTimeout: 90,
    gauThreads: 5,
    gauVerifyUrls: true,
    gauDetectMethods: false,
    gauFilterDeadEndpoints: true,

    // ParamSpider: disabled
    paramspiderEnabled: false,

    // jsluice
    jsluiceEnabled: true,
    jsluiceMaxFiles: 1000,
    jsluiceExtractSecrets: true,
    jsluiceExtractUrls: true,
    jsluiceConcurrency: 10,

    // JS Recon (fully enabled)
    jsReconEnabled: true,
    jsReconMaxFiles: 2000,
    jsReconTimeout: 3600,
    jsReconConcurrency: 15,
    jsReconValidateKeys: true,
    jsReconValidationTimeout: 10,
    jsReconExtractEndpoints: true,
    jsReconRegexPatterns: true,
    jsReconSourceMaps: true,
    jsReconDependencyCheck: true,
    jsReconDomSinks: true,
    jsReconFrameworkDetect: true,
    jsReconDevComments: true,
    jsReconIncludeChunks: true,
    jsReconIncludeFrameworkJs: true,
    jsReconIncludeArchivedJs: true,
    jsReconMinConfidence: 'low',
    jsReconStandaloneCrawlDepth: 3,

    // ffuf
    ffufEnabled: true,
    ffufThreads: 40,
    ffufRate: 0,
    ffufTimeout: 10,
    ffufMaxTime: 900,
    ffufExtensions: ['.env', '.config', '.yml', '.yaml', '.json', '.bak', '.old', '.sql', '.log', '.key', '.pem'],
    ffufRecursion: false,
    ffufAutoCalibrate: true,
    ffufFollowRedirects: false,
    ffufSmartFuzz: true,

    // Kiterunner: disabled
    kiterunnerEnabled: false,

    // Arjun: disabled
    arjunEnabled: false,

    // Nuclei
    nucleiEnabled: true,
    nucleiSeverity: ['critical', 'high', 'medium', 'low'],
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
    nucleiInteractsh: false,
    nucleiTags: ['exposure', 'token', 'secret', 'config'],

    // CVE lookup: disabled
    cveLookupEnabled: false,

    // MITRE: disabled
    mitreEnabled: false,

    // Security checks: disabled
    securityCheckEnabled: false,

    // OSINT: all disabled
    osintEnrichmentEnabled: false,

    // --- GraphQL: explicit OFF so switching from a GraphQL-enabled preset resets cleanly ---
    graphqlSecurityEnabled: false,
    graphqlCopEnabled: false,
  },
}
