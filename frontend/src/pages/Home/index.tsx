import React from "react"
import { Link } from "react-router-dom"
import { Crosshair, Radio, FileSearch, ArrowRight, type LucideIcon } from "lucide-react"

type Subsystem = {
  key: "starmap" | "spear" | "insight"
  title: string
  subtitle: string
  positioning: string
  description: string
  to: string
  accent: "cyan" | "blue" | "purple"
  icon: LucideIcon
}

const subsystems: Subsystem[] = [
  {
    key: "starmap",
    title: "智核·星图",
    subtitle: "全域感知阵列",
    positioning: "系统的“数字感官”，网络空间的“超级雷达”。",
    description:
      "不只是传统的资产扫描，而是基于AI的主动探测与智能测绘。它能以远超人类的效率与精度，自动发现、识别、分类并绘制出目标网络的全景动态地图，包括未知资产、隐蔽入口与脆弱关联，为后续行动构建毫米级的数字战场模型。",
    to: "/scan",
    accent: "cyan",
    icon: Crosshair,
  },
  {
    key: "spear",
    title: "智核·锋矢",
    subtitle: "自主渗透单元",
    positioning: "系统的“数字肢体”，AI驱动的攻击执行体。",
    description:
      "超越传统的漏洞利用工具。它是具备攻击链自主编排能力的智能代理。在“星图”提供的战场模型基础上，它能像一名经验丰富的渗透专家，自主决策攻击路径，智能绕过防御，自动化执行从初始突破到横向移动的整个攻击链，实现“一键抵达核心”的精准打击。",
    to: "/c2",
    accent: "blue",
    icon: Radio,
  },
  {
    key: "insight",
    title: "智核·洞鉴",
    subtitle: "深度认知中枢",
    positioning: "系统的“数字大脑”，战场情报与策略引擎。",
    description:
      "超越简单的文件分析。它是一个深度威胁情报挖掘与战术策略生成中心。不仅能够从海量文件、内存和网络流量中，自动化提取凭证、密钥、通信关系等高价值情报，更能通过关联分析与机器学习，洞察对手战术，并实时生成优化的渗透策略与攻击代码，反哺“锋矢”行动，形成“感知-决策-行动”的智能闭环。",
    to: "/document",
    accent: "purple",
    icon: FileSearch,
  },
]

const accentStyles: Record<Subsystem["accent"], { ring: string; glow: string; badge: string; icon: string }> = {
  cyan: {
    ring: "hover:border-cyber-cyan/40",
    glow: "hover:shadow-cyber-cyan",
    badge: "bg-cyber-cyan/10 text-cyber-cyan border-cyber-cyan/30",
    icon: "from-cyber-cyan to-cyber-blue",
  },
  blue: {
    ring: "hover:border-cyber-blue/40",
    glow: "hover:shadow-cyber-blue",
    badge: "bg-cyber-blue/10 text-cyber-blue border-cyber-blue/30",
    icon: "from-cyber-blue to-cyber-blue-dark",
  },
  purple: {
    ring: "hover:border-cyber-purple/40",
    glow: "hover:shadow-[0_0_24px_rgba(124,58,237,0.35)]",
    badge: "bg-cyber-purple/10 text-cyber-purple border-cyber-purple/30",
    icon: "from-cyber-purple to-cyber-blue",
  },
}

const HomePage: React.FC = () => {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-grid-pattern [background-size:48px_48px] opacity-45" />
        <div className="absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-cyber-cyan/12 blur-3xl animate-breathing" />
        <div className="absolute -bottom-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-cyber-blue/12 blur-3xl animate-breathing" />
        <div className="absolute left-0 top-0 h-[120vh] w-full opacity-30">
          <div className="absolute -top-24 left-0 w-full h-24 bg-gradient-to-b from-cyber-cyan/30 via-cyber-cyan/10 to-transparent animate-scan-line" />
        </div>
        <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyber-cyan/40 to-transparent" />
      </div>

      <div className="relative p-6 space-y-6 animate-fade-in">
        <div className="flex items-start justify-between gap-6">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-mono font-bold text-cyber-text">合盛智核</h1>
            <p className="text-cyber-muted text-sm font-mono mt-2 leading-6">
              以“感知-决策-行动”的智能闭环为核心，整合全域测绘、自主渗透与深度洞察三大能力，构建可持续演进的数字战场体系。
            </p>
          </div>
          <div className="hidden xl:block">
            <div className="glass-card px-4 py-3 border-cyber-cyan/20">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-breathing" />
                <span className="text-cyber-green">CORE ONLINE</span>
                <span className="text-cyber-muted mx-2">|</span>
                <span className="text-cyber-muted">AI LINK STABLE</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {subsystems.map((s) => {
            const st = accentStyles[s.accent]
            const Icon = s.icon
            const isExternal = s.to === "/document" || s.to === "/scan"
            const href = s.to === "/scan" ? "/scan" : "/document"
            return (
              (isExternal ? (
                <a
                  key={s.key}
                  href={href}
                  className={`glass-card p-6 transition-all duration-200 border-cyber-border/70 ${st.ring} ${st.glow} hover:bg-white/7 group`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${st.icon} flex items-center justify-center`}>
                          <Icon size={18} className="text-cyber-bg" />
                        </div>
                        <div className="absolute -inset-1 rounded-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-lg text-cyber-text font-bold">{s.title}</span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${st.badge}`}>{s.subtitle}</span>
                        </div>
                        <div className="text-xs font-mono text-cyber-muted mt-1 leading-5">{s.positioning}</div>
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-md bg-white/5 border border-cyber-border flex items-center justify-center text-cyber-muted group-hover:text-cyber-text group-hover:border-white/15 transition-colors">
                      <ArrowRight size={16} />
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-cyber-muted leading-7">{s.description}</div>

                  <div className="mt-5 flex items-center justify-between">
                    <span className="text-xs font-mono text-cyber-muted">目标入口</span>
                    <span className="text-xs font-mono text-cyber-cyan">{s.to}</span>
                  </div>
                </a>
              ) : (
                <Link
                  key={s.key}
                  to={s.to}
                  className={`glass-card p-6 transition-all duration-200 border-cyber-border/70 ${st.ring} ${st.glow} hover:bg-white/7 group`}
                >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${st.icon} flex items-center justify-center`}>
                        <Icon size={18} className="text-cyber-bg" />
                      </div>
                      <div className="absolute -inset-1 rounded-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-lg text-cyber-text font-bold">{s.title}</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${st.badge}`}>{s.subtitle}</span>
                      </div>
                      <div className="text-xs font-mono text-cyber-muted mt-1 leading-5">{s.positioning}</div>
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-md bg-white/5 border border-cyber-border flex items-center justify-center text-cyber-muted group-hover:text-cyber-text group-hover:border-white/15 transition-colors">
                    <ArrowRight size={16} />
                  </div>
                </div>

                <div className="mt-4 text-sm text-cyber-muted leading-7">
                  {s.description}
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <span className="text-xs font-mono text-cyber-muted">目标入口</span>
                  <span className="text-xs font-mono text-cyber-cyan">{s.to}</span>
                </div>
              </Link>
              ))
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default HomePage
