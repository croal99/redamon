import type { ReconPreset } from '../types'

export const SECRET_MINER: ReconPreset = {
  id: 'secret-miner',
  name: 'JS 密钥挖掘',
  icon: 'FileCode2',
  image: '/preset-file-js.svg',
  shortDescription: '深度 JavaScript 分析流水线。最大化发现 JS 文件，并提取密钥、端点与 Source Map。',
  fullDescription: `### 流程目标
高度聚焦 JavaScript 侦察。该预设用最小但足够的流水线先发现子域、探测 HTTP，再高强度爬取 JS 文件并做深度分析。

### 适用人群
适合面向现代 Web 应用的漏洞赏金猎人和渗透测试人员，尤其是 React、Angular、Vue 等前端框架占主要业务逻辑的目标。

### 启用内容
- JS Recon 模块全量开启，所有分析能力拉满
- Katana 深度 3，并开启 JS 爬取，用于发现动态加载脚本
- Hakrawler 深度 3，补充爬取覆盖
- GAU 启用，用于从 Wayback 等归档拉取历史 JS 文件
- jsluice 最多处理 500 个文件，完整提取密钥与 URL
- JS Recon 最大文件数提升到 1000

### 禁用内容
- 端口扫描（Naabu、Nmap、Masscan）：不需要，httpx 会回退到常见 Web 端口
- 目录爆破（ffuf、Kiterunner）：对这个场景噪音过大
- 参数发现（Arjun、ParamSpider）：与 JS 狩猎关系不大
- 漏洞扫描（Nuclei）：从模块层移除
- Security Checks 与 MITRE：关闭以减少噪音
- OSINT 增强：关闭以加快聚焦扫描

### 工作方式
1. 子域发现找出全部子域
2. HTTP 探测识别在线 Web 服务
3. Katana、Hakrawler 与 GAU 主动/被动结合，尽可能发现 JS 文件
4. jsluice 从已发现 JS 文件中提取密钥与 URL
5. JS Recon 深入分析 Source Map、依赖混淆、DOM Sink、框架识别、正则模式与 Key 校验`,
  parameters: {
    // Pipeline modules: skip port_scan and vuln_scan
    scanModules: ['domain_discovery', 'http_probe', 'resource_enum', 'js_recon'],

    // JS Recon (the main feature - default is false)
    jsReconEnabled: true,
    jsReconMaxFiles: 1000,
    jsReconTimeout: 1800,
    jsReconConcurrency: 10,
    jsReconValidateKeys: true,
    jsReconValidationTimeout: 5,
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

    // Katana: deeper crawl for JS discovery
    katanaEnabled: true,
    katanaDepth: 3,
    katanaMaxUrls: 1000,
    katanaJsCrawl: true,

    // Hakrawler: complementary crawler
    hakrawlerEnabled: true,
    hakrawlerDepth: 3,
    hakrawlerIncludeSubs: true,

    // ZAP Ajax Spider: disabled. JS Recon + jsluice cover JS file analysis;
    // browser-driven crawling adds runtime cost without contributing to secret mining.
    zapAjaxSpiderEnabled: false,

    // GAU: historical JS from Wayback (default is false)
    gauEnabled: true,

    // jsluice: increase limits for heavy JS analysis
    jsluiceEnabled: true,
    jsluiceMaxFiles: 500,
    jsluiceExtractSecrets: true,
    jsluiceExtractUrls: true,

    // Disable port scanning tools
    naabuEnabled: false,
    nmapEnabled: false,
    masscanEnabled: false,

    // Disable irrelevant resource enum tools
    ffufEnabled: false,
    kiterunnerEnabled: false,
    arjunEnabled: false,
    paramspiderEnabled: false,

    // --- GraphQL Security: JS-heavy crawl frequently surfaces /graphql endpoints in
    //     compiled SPA bundles (Apollo/urql/Relay configs). Enable introspection to
    //     extract the schema -- schemas commonly contain sensitive field names
    //     (password, apiKey, etc.) which is the preset's core mission. ---
    graphqlSecurityEnabled: true,
    graphqlIntrospectionTest: true,
    graphqlCopEnabled: true,
    // Info-leak + CSRF checks only (field suggestions, tracing, unhandled errors are
    // all secret-leaking). DoS probes off -- not the preset's focus.
    graphqlCopTestAliasOverloading: false,
    graphqlCopTestBatchQuery: false,
    graphqlCopTestDirectiveOverloading: false,
    graphqlCopTestCircularIntrospection: false,

    // Disable security/vuln modules via master switches
    cveLookupEnabled: false,
    securityCheckEnabled: false,
    nucleiEnabled: false,
    mitreEnabled: false,
    osintEnrichmentEnabled: false,
  },
}
