# RedAmon — Dockerfile 分层策略与构建韧性

本文档记录 RedAmon 各容器 Dockerfile 的分层与防失败模式，供维护者参考并指导后续修改。

> **法律声明**：本工具仅用于授权安全测试。详见 [DISCLAIMER.md](../DISCLAIMER.md)。

---

## 目录

1. [为什么要拆分层](#1-为什么要拆分层)
2. [retry 重试脚本](#2-retry-重试脚本)
3. [各容器说明](#3-各容器说明)
   - [recon (recon/Dockerfile)](#31-recon-recondockerfile)
   - [kali-sandbox (mcp/kali-sandbox/Dockerfile)](#32-kali-sandbox-mcpkali-sandboxdockerfile)
   - [recon-orchestrator (recon_orchestrator/Dockerfile)](#33-recon-orchestrator-recon_orchestratordockerfile)
   - [agent (agentic/Dockerfile)](#34-agent-agenticdockerfile)
4. [Recon 容器生命周期与 INTERNAL_API_KEY 传递链路](#4-recon-容器生命周期与-internal_api_key-传递链路)
   - [4.1 整体架构](#41-整体架构)
   - [4.2 INTERNAL_API_KEY 传递链路](#42-internal_api_key-传递链路)
   - [4.3 关键安全设计：`changeme` 被硬性拒绝](#43-关键安全设计changeme-被硬性拒绝)
   - [4.4 常见 401 错误排查](#44-常见-401-错误排查)
   - [4.5 ContainerManager 启动 recon 容器的完整流程](#45-containermanager-启动-recon-容器的完整流程)
   - [4.6 Recon 容器内部执行流程](#46-recon-容器内部执行流程)
   - [4.7 Docker-in-Docker 兄弟容器模式](#47-docker-in-docker-兄弟容器模式)
   - [4.8 首次部署的正确步骤](#48-首次部署的正确步骤)
5. [通用准则](#5-通用准则)

---

## 1. 为什么要拆分层

安全工具容器体积大（2–5 GB），依赖滚动更新仓库（Kali、Docker CE）和 GitHub Release 资源，网络波动是构建失败的首要原因。Docker 层缓存意味着：

- 如果一个包含 30 个包的 `RUN apt-get install` 在第 29 个包失败，**所有**包下次构建都要重新下载。
- 将大型/易失败的包拆到独立的 `RUN` 层，仅失败层需要重试，之前已缓存的层不受影响。

### 拆分策略

| 层级 | 内容 | 原因 |
|------|------|------|
| 重型/易失败 | `metasploit-framework`、`build-essential`、`docker-ce-cli`、`docker.io` | 下载量最大，最易失败；独立出来后失败不会导致其他层缓存失效 |
| 小型/稳定 | `curl`、`git`、`nmap`、`python3` 等 | 很少失败；合并为一层以减少层数 |
| 仅运行时 | `nuclei -update-templates`、数据库初始化 | 由 entrypoint 在容器启动时处理，不应放在构建阶段 |

---

## 2. retry 重试脚本

所有 Dockerfile 都定义了一个小型 Shell 辅助脚本，为任意命令提供指数退避重试：

```sh
#!/bin/sh
max=5; n=0; until "$@"; do
  n=$((n+1)); [ $n -ge $max ] && exit 1
  echo "Retry $n/$max ..."; sleep $((n*5))
done
```

**放置规则**：`retry` 脚本**必须定义在任何可能需要它的 `RUN` 步骤之前**（如 `go install`、`git clone`、`curl`）。在 kali-sandbox 的 Dockerfile 中，它紧跟在 CA 证书引导之后、第一个 `apt-get install` 层之前安装。

---

## 3. 各容器说明

### 3.1 recon (`recon/Dockerfile`)

**构建模式**：多阶段构建（Go/Alpine 构建器 → Python/Debian 运行时镜像）。

**分层结构**（主阶段）：

| 层 | 包 | 体积 |
|----|-----|------|
| 层 1 | `docker-ce-cli`（需要 Docker APT 源） | ~80 MB |
| 层 2 | `tor`、`proxychains4`、`dnsutils`、`curl`、`wget` 等 | ~60 MB |
| 层 3 | `build-essential`、`nmap`（重型，最易失败） | ~250 MB |

每个构建器阶段也各自定义了 `retry` 脚本，用于 `go install` / `apk add` 调用。

**关键设计决策**：
- 每个 `RUN apt-get install` 层都重复 `apt-get update`，因为 Kali 滚动更新仓库包版本变动频繁，之前层缓存中的索引很快就会过期，导致 `.deb` 下载 404。
- 关键步骤不使用 `|| true`——构建时的失败应当直接暴露，而非被静默吞掉。

---

### 3.2 kali-sandbox (`mcp/kali-sandbox/Dockerfile`)

**构建模式**：单阶段，Kali-rolling 基础镜像。

**分层结构**：

| 层 | 内容 | 体积 | 原因 |
|----|------|------|------|
| CA 引导 | `ca-certificates`、源列表设置 | ~5 MB | 必须在其他步骤之前成功 |
| `retry` 脚本 | Shell 辅助脚本 | <1 KB | 必须在所有后续层之前可用 |
| metasploit-framework | `metasploit-framework`（通过 `apt`） | ~800 MB | 最大的单一包，最易失败——独立出来便于重试 |
| 核心工具 | `curl`、`git`、`nmap`、`hashcat`、`python3` 等 | ~400 MB | 较小，很少单独失败 |
| Go 工具 | `naabu`、`nuclei`、`httpx`、`ffuf` 等（`go install`） | ~300 MB | 每个工具独立 `RUN`，配合 `retry` |
| Python 工具 | `impacket`、`bloodhound`、`jwt_tool` 等（`pip`） | ~200 MB | 按依赖隔离需求分组 |
| 后渗透工具 | `linpeas`、`winPEAS`、`pspy64` 等（`curl`） | ~30 MB | 小型下载，`retry` 保护 |

**关键设计决策**：

1. **`metasploit-framework` 独立成层** — 约 800 MB，是最大的包。下载失败时不再导致其他工具的缓存层失效。

2. **`nuclei -update-templates` 从构建阶段移除** — Nuclei 模板约 300 MB，之前在构建时烘焙进镜像层，但 entrypoint 脚本在每次容器启动时都会执行 `nuclei -update-templates`（由 `NUCLEI_AUTO_UPDATE` 环境变量控制，默认 `true`）。构建时的模板在运行时立即被覆盖，纯属浪费——增加约 300 MB 镜像体积并拖慢构建，且无任何收益。运行时更新是异步执行的（通过 `deferred_init &`），不阻塞 MCP 服务就绪检查。

3. **`msfdb init` 保留在构建阶段** — PostgreSQL 容器在 kali-sandbox 之前构建（`docker compose up -d postgres ... kali-sandbox`），数据库在构建时可用。`|| true` 用于容错，确保即使数据库暂时不可达也不会中断构建。

---

### 3.3 recon-orchestrator (`recon_orchestrator/Dockerfile`)

**构建模式**：单阶段，Python 3.11-slim 基础镜像。

**分层结构**：

| 层 | 内容 | 体积 | 原因 |
|----|------|------|------|
| `retry` 脚本 | Shell 辅助脚本 | <1 KB | 必须在所有网络操作之前可用 |
| docker.io | `docker.io`（通过 `apt`） | ~80 MB | 重型包，Docker CLI 依赖 Debian 源，下载易超时——独立成层 |
| curl | `curl`（通过 `apt`） | ~2 MB | 小型包，用于健康检查，极少失败 |
| Python 依赖 | `fastapi`、`uvicorn`、`docker` 等（`pip`） | ~50 MB | `requirements.txt` 单独 COPY 以利用 Docker 层缓存 |

**关键设计决策**：

1. **`docker.io` 独立成层** — 原 Dockerfile 将 `docker.io` 和 `curl` 合并在同一个 `apt-get install` 中。`docker.io` 约 80 MB，在 Debian 滚动源中下载频繁超时；一旦超时，`curl` 的下载也跟着作废。拆分后 `curl` 层可被缓存复用，只需重试 `docker.io` 层。

2. **新增 `retry` 脚本** — 原 Dockerfile 没有任何重试保护。添加后为后续可能的网络操作（如 `git clone`、`curl`）提供保障。

3. **添加 `--no-install-recommends`** — 减少不必要的推荐包安装，缩小镜像体积。

---

### 3.4 agent (`agentic/Dockerfile`)

**构建模式**：单阶段，Python 3.11-slim 基础镜像，安装多语言运行时（Node.js、Go、Ruby、Java、PHP、.NET）。

**分层结构**：

| 层 | 内容 | 体积 | 重试保护 |
|----|------|------|----------|
| `retry` 脚本 | Shell 辅助脚本 | <1 KB | — |
| 系统依赖（轻量） | `curl`、`git`、`ripgrep`、`jq`、`make`、`unzip`、`wget`、`file`、`ca-certificates`、`gnupg` | ~100 MB | `retry sh -c` 包裹整条命令 |
| 系统依赖（编译器+SSH） | `gcc`、`g++`、`openssh-client` | ~150 MB | `retry sh -c` 包裹整条命令 |
| Node.js 20 | nodesource 安装 + `yarn`/`pnpm` | ~120 MB | `retry sh -c` 包裹整条命令 |
| Go 1.22 | `go.dev` 下载 tarball | ~300 MB | `retry curl` |
| Ruby + Bundler | `ruby`、`ruby-dev` + `gem install bundler` | ~60 MB | `retry sh -c` 包裹整条命令 |
| Java 17 + Maven | `default-jdk-headless`、`maven` | ~400 MB | `retry sh -c` 包裹整条命令 |
| PHP + Composer | `php-cli` 等扩展 + Composer 安装 | ~50 MB | `retry sh -c` 包裹整条命令 |
| .NET 8 SDK | `libicu-dev` + dotnet-install 脚本 | ~500 MB | `retry sh -c` 包裹整条命令 |
| Python 依赖 | `pip install -r requirements.txt` | ~200 MB | 无（PyPI 较稳定） |
| KB 依赖（可选） | `torch`、`sentence-transformers`、`faiss-cpu` | ~4.4 GB | 无（可通过 `SKIP_KB=true` 跳过） |

**关键设计决策**：

1. **`retry` 脚本提前到所有 `apt-get` 之前** — 原 Dockerfile 将 `retry` 放在巨型系统依赖层之后，导致最易失败的网络操作没有重试保护。现在 `retry` 在最前面定义，所有后续层均可使用。

2. **系统依赖层拆分为轻量层和编译器层** — `gcc`/`g++`（~150 MB）和 `openssh-client` 在 Debian 滚动源中较重且偶尔超时，独立成层后失败只需重试编译器层，轻量工具层可被 Docker 缓存复用。

3. **多语言运行时层用 `retry sh -c` 整体包裹** — 每个运行时安装（Ruby、Java、PHP、.NET）涉及 `apt-get` + 可选的 `curl`/脚本安装（如 Composer、dotnet-install），任一步骤失败都应整层重试。`retry sh -c` 确保 `apt-get` 下载超时或脚本下载中断时，整个安装链从 `apt-get update` 开始重新执行。

4. **Node.js 安装用 `retry sh -c` 包裹** — nodesource 安装涉及 `curl` 下载 setup 脚本、`bash` 执行、`apt-get install nodejs`、`npm install -g` 四个步骤，原方案仅 `curl` 有重试，后续步骤失败则整层作废。包裹后任何步骤失败都会从头重试。

---

## 4. Recon 容器生命周期与 INTERNAL_API_KEY 传递链路

### 4.1 整体架构

RedAmon 的 recon 扫描采用 **Docker-in-Docker (DinD) 兄弟容器** 模式。`recon-orchestrator` 是长期运行的服务，它通过 Docker SDK 动态启动一次性扫描容器，扫描完毕后容器自动销毁。

```
┌─────────────────────────────────────────────────────────────────────┐
│                        用户 (浏览器)                                │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ 点击"开始扫描"
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  webapp (:3000)                                                     │
│  Next.js 前端 + API Routes                                          │
│  环境变量: INTERNAL_API_KEY=${INTERNAL_API_KEY:-changeme}           │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ POST /recon/start {project_id, user_id}
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  recon-orchestrator (:8010)                                         │
│  FastAPI 服务，ContainerManager 管理 Docker 容器生命周期             │
│  挂载: /var/run/docker.sock (读写)                                  │
│  环境变量: INTERNAL_API_KEY=${INTERNAL_API_KEY:-changeme}           │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ container_manager.py → containers.run()
                           │ 注入环境变量 + 挂载 docker.sock
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  recon 容器 (一次性, network_mode=host, privileged)                  │
│  镜像: redamon-recon:latest                                         │
│  ENTRYPOINT: /app/entrypoint.sh                                     │
│  CMD: python /app/recon/main.py                                     │
│  环境变量: INTERNAL_API_KEY (从 orchestrator 透传)                   │
│  挂载: /var/run/docker.sock (读写)                                  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ entrypoint.sh → docker pull / docker run
                           │ main.py → GET /api/projects/{id}
                           │ Header: X-Internal-Key: {INTERNAL_API_KEY}
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  webapp API 认证校验                                                 │
│  middleware.ts L47:                                                  │
│    if (key && expected && expected !== 'changeme' && key === expected)│
│      → 放行                                                         │
│    else                                                              │
│      → 401 Unauthorized                                             │
│  session.ts L47:                                                     │
│    if (!key || !expected || expected === 'changeme') return false    │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 INTERNAL_API_KEY 传递链路

`INTERNAL_API_KEY` 是服务间内部通信的认证密钥，从 `.env` → `docker-compose.yml` → `recon-orchestrator` → `recon 容器` → `webapp API` 逐层传递：

```
.env
  └── INTERNAL_API_KEY=changeme123123  (用户自定义值)
        │
        ▼
docker-compose.yml
  ├── webapp:        INTERNAL_API_KEY: ${INTERNAL_API_KEY:-changeme}
  ├── recon-orchestrator: INTERNAL_API_KEY: ${INTERNAL_API_KEY:-changeme}
  ├── agent:         INTERNAL_API_KEY: ${INTERNAL_API_KEY:-changeme}
  └── kali-sandbox:  INTERNAL_API_KEY: ${INTERNAL_API_KEY:-changeme}
        │
        ▼
recon-orchestrator 容器 (os.environ.get("INTERNAL_API_KEY") → "changeme123123")
        │
        ▼ container_manager.py L233
        │ "INTERNAL_API_KEY": os.environ.get("INTERNAL_API_KEY", "")
        │
        ▼ containers.run() 注入到新创建的 recon 容器
        │
recon 容器 (os.environ.get("INTERNAL_API_KEY") → "changeme123123")
        │
        ▼ project_settings.py L738
        │ headers = {"X-Internal-Key": "changeme123123"}
        │
        ▼ GET /api/projects/{id}
        │
webapp middleware.ts L47 校验:
  expected = "changeme123123"  →  expected !== 'changeme' ✓
  internalKey === expected     →  放行 ✓
```

### 4.3 关键安全设计：`changeme` 被硬性拒绝

webapp 的 `middleware.ts` 和 `session.ts` 中有一个重要的安全检查：

```typescript
// middleware.ts L47
if (internalKey && expectedKey && expectedKey !== 'changeme' && internalKey === expectedKey) {
  return NextResponse.next()
}

// session.ts L47
if (!key || !expected || expected === 'changeme') return false
return key === expected
```

**如果 `INTERNAL_API_KEY` 的值为默认值 `changeme`，webapp 会直接拒绝所有内部 API 请求，返回 401。** 这是为了防止用户忘记修改默认密钥就上线。

### 4.4 常见 401 错误排查

如果 recon 容器日志出现如下错误：

```
Failed to fetch project settings: 401 Client Error: Unauthorized for url: http://localhost:3000/api/projects/xxx
```

排查步骤：

| 检查项 | 命令 / 位置 | 预期结果 |
|--------|-------------|----------|
| `.env` 是否设置 `INTERNAL_API_KEY` | `grep INTERNAL_API_KEY .env` | 有值且不为 `changeme` |
| webapp 容器的环境变量 | `docker exec redamon-webapp env \| grep INTERNAL_API_KEY` | 与 `.env` 一致 |
| orchestrator 容器的环境变量 | `docker exec redamon-recon-orchestrator env \| grep INTERNAL_API_KEY` | 与 `.env` 一致 |
| recon 容器的环境变量 | `docker exec <recon-container> env \| grep INTERNAL_API_KEY` | 与 `.env` 一致 |

**修复方法**：在 `.env` 中设置一个非 `changeme` 的密钥：

```bash
# 生成随机密钥
INTERNAL_API_KEY=redamon_internal_$(openssl rand -hex 16)

# 或者设置固定强密钥
INTERNAL_API_KEY=your_secure_key_here
```

然后重启相关服务：

```bash
docker compose up -d --force-recreate webapp recon-orchestrator
```

### 4.5 ContainerManager 启动 recon 容器的完整流程

`recon_orchestrator/container_manager.py` 中的 `start_recon()` 方法（L164-266）：

1. **状态检查**：确认该 project 没有正在运行/暂停的 recon，也没有 partial recon 在运行
2. **清理旧容器**：如果存在同名旧容器，强制删除
3. **确保镜像存在**：`self.client.images.get("redamon-recon:latest")`，不存在则触发构建
4. **创建并启动容器**：`self.client.containers.run()`，关键参数如下：

| 参数 | 值 | 说明 |
|------|-----|------|
| `image` | `redamon-recon:latest` | 之前 `--profile tools build` 构建的镜像 |
| `network_mode` | `host` | 直接使用宿主机网络，可访问 localhost:3000 |
| `privileged` | `True` | 需要 Docker socket 权限启动兄弟容器 |
| `command` | `python /app/recon/main.py` | 覆盖 Dockerfile 中的 CMD |

**注入的环境变量**：

| 变量 | 来源 | 用途 |
|------|------|------|
| `PROJECT_ID` | API 请求参数 | 项目标识 |
| `USER_ID` | API 请求参数 | 用户标识 |
| `WEBAPP_API_URL` | API 请求参数 | 回调 webapp 获取设置 |
| `INTERNAL_API_KEY` | `os.environ.get("INTERNAL_API_KEY", "")` | 服务间认证 |
| `NEO4J_URI/USER/PASSWORD` | orchestrator 环境变量 | 图数据库连接 |
| `HOST_RECON_OUTPUT_PATH` | `{recon_path}/output` | 兄弟容器挂载用宿主路径 |
| `AGENT_API_URL` | orchestrator 环境变量 | AI 代理回调 |

**挂载的卷**：

| 宿主路径 | 容器路径 | 权限 | 用途 |
|----------|----------|------|------|
| `/var/run/docker.sock` | `/var/run/docker.sock` | rw | Docker-in-Docker 兄弟容器 |
| `{recon_path}` | `/app/recon` | rw | 源码挂载（开发免重建） |
| `../graph_db` | `/app/graph_db` | ro | Neo4j 图数据库模块 |
| `/tmp/redamon` | `/tmp/redamon` | rw | 临时文件共享 |
| `nuclei-templates` | `/opt/nuclei-templates-official` | ro | Nuclei 模板 |

### 4.6 Recon 容器内部执行流程

recon 容器启动后的执行顺序：

```
1. ENTRYPOINT: /app/entrypoint.sh
   ├── 检查 Docker daemon 连通性
   ├── 下载 DNS 解析器列表
   └── 检查/拉取 ProjectDiscovery 工具镜像
       ├── projectdiscovery/naabu:latest    (端口扫描)
       ├── projectdiscovery/httpx:latest    (HTTP 探测)
       ├── projectdiscovery/katana:latest   (爬虫)
       ├── projectdiscovery/nuclei:latest   (漏洞扫描)
       ├── projectdiscovery/subfinder:latest(子域名发现)
       ├── sxcurity/gau:latest             (URL 收集)
       ├── caffix/amass:latest             (子域名枚举)
       ├── frost19k/puredns:latest         (DNS 暴力破解)
       ├── jauderho/hakrawler:latest       (端点爬取)
       ├── projectdiscovery/uncover:latest (搜索引擎聚合)
       ├── dolevf/graphql-cop:1.14         (GraphQL 审计)
       └── ghcr.io/zaproxy/zaproxy:stable  (DAST 扫描)
       注意: 已缓存的镜像会跳过 (docker images -q 检测)

2. CMD: python /app/recon/main.py
   ├── get_settings() → GET /api/projects/{id}
   │   └── Header: X-Internal-Key: {INTERNAL_API_KEY}  ← 此处 401 即密钥问题
   ├── 6 阶段扫描流水线:
   │   Phase 1: Domain Discovery (WHOIS + 子域名)
   │   Phase 2: Port Scanning (naabu 兄弟容器)
   │   Phase 3: HTTP Probing (httpx 兄弟容器)
   │   Phase 4: Resource Enumeration (katana + gau 兄弟容器)
   │   Phase 5: Vulnerability Scanning (nuclei 兄弟容器)
   │   Phase 6: CVE & MITRE Enrichment
   └── 容器退出，orchestrator 自动清理
```

### 4.7 Docker-in-Docker 兄弟容器模式

recon 容器通过挂载 `/var/run/docker.sock` 实现 Docker-in-Docker **兄弟容器**模式（非嵌套虚拟化）：

```
┌─ 宿主机 Docker Daemon ─────────────────────────────────────────┐
│                                                                  │
│  ┌─ recon 容器 ───────────────────────────────────────────────┐ │
│  │  挂载: /var/run/docker.sock → 可操作宿主机 Docker          │ │
│  │                                                              │ │
│  │  执行: docker run projectdiscovery/naabu ...               │ │
│  │         ↓                                                    │ │
│  └──────────┼──────────────────────────────────────────────────┘ │
│             │ docker run 实际由宿主机 Docker Daemon 执行         │
│             ▼                                                    │
│  ┌─ naabu 兄弟容器 ──────────────────────────────────────────┐ │
│  │  与 recon 容器同级，共享宿主机网络栈                        │ │
│  │  扫描结果通过共享卷写回宿主机                               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

关键设计点：
- recon 容器使用 `network_mode: host` 和 `privileged: true`，确保可通过 Docker socket 启动兄弟容器
- `HOST_RECON_OUTPUT_PATH` 环境变量指定宿主机上的输出路径，兄弟容器的 volume mount 使用该路径
- 兄弟容器（naabu、httpx、nuclei 等）由 recon 的 Python 代码按需 `docker run`，扫描完毕自动退出
- orchestrator 的 `stop_recon()` 会清理残留的兄弟容器（`_cleanup_sub_containers()`）

### 4.8 首次部署的正确步骤

```bash
# 1. 配置 .env — 必须设置非 'changeme' 的 INTERNAL_API_KEY
echo "INTERNAL_API_KEY=redamon_internal_$(openssl rand -hex 16)" >> .env

# 2. 构建 tools profile 镜像 (仅打包代码，不下载工具镜像)
docker compose --profile tools build

# 3. (可选) 预拉取工具镜像，避免首次运行时等待
for img in \
  projectdiscovery/naabu:latest \
  projectdiscovery/httpx:latest \
  projectdiscovery/katana:latest \
  projectdiscovery/nuclei:latest \
  projectdiscovery/subfinder:latest \
  sxcurity/gau:latest \
  caffix/amass:latest \
  frost19k/puredns:latest \
  jauderho/hakrawler:latest \
  projectdiscovery/uncover:latest \
  "dolevf/graphql-cop:1.14" \
  ghcr.io/zaproxy/zaproxy:stable; do
  docker pull "$img"
done

# 4. 启动主栈 (recon-orchestrator 管理 recon 容器生命周期)
docker compose up -d

# 5. 验证 INTERNAL_API_KEY 一致性
docker exec redamon-webapp env | grep INTERNAL_API_KEY
docker exec redamon-recon-orchestrator env | grep INTERNAL_API_KEY
```

---

## 5. 通用准则

修改任何 Dockerfile 时请遵循以下规则：

1. **`retry` 脚本必须在可能失败的网络操作之前定义** — 不要放在大型 `apt-get` 之后。
2. **重型包（>100 MB）独立成层** — 失败时只需重试这一层。
3. **每个 `apt-get install` 层内重复 `apt-get update`** — Kali 滚动仓库索引几分钟就会过期。
4. **构建时避免只对运行时有用的更新操作** — 如模板更新、数据库填充等，交给 entrypoint 处理。
5. **不要对关键步骤使用 `|| true`** — 构建失败应尽早暴露。
6. **`rm -rf /var/lib/apt/lists/*`** — 每个 `apt-get install` 层末尾清理索引，减小镜像体积。
