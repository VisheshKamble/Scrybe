import { motion } from 'framer-motion'
import { Eye, FileText, MessageSquareText, Rows3, Sparkles } from 'lucide-react'
import Reveal from './Reveal.jsx'

const STEPS = [
  {
    icon: FileText,
    label: 'Transcript agent',
    body: 'Pulls captions when they exist; falls back to Whisper when they don\u2019t.',
    model: 'whisper-large-v3-turbo',
  },
  {
    icon: Eye,
    label: 'Visual agent',
    body: 'Samples keyframes and reads them with a vision model \u2014 slides, code, charts.',
    model: 'qwen/qwen3.6-27b',
  },
  {
    icon: Rows3,
    label: 'Segmentation agent',
    body: 'Finds real topic boundaries and builds a navigable chapter list.',
    model: 'openai/gpt-oss-20b',
  },
  {
    icon: Sparkles,
    label: 'Synthesis agent',
    body: 'Fact-checks claims via live web search, then streams the written report.',
    model: 'groq/compound',
  },
]

const QA_STEP = {
  icon: MessageSquareText,
  label: 'QA agent',
  body: 'Stays ready after the report lands \u2014 answers questions, timestamp-cited, via FAISS.',
  model: 'openai/gpt-oss-120b',
}

export default function Pipeline() {
  return (
    <section id="pipeline" className="py-24 md:py-32 border-t border-lp-line bg-lp-bg">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal className="max-w-xl mb-16">
          <p className="font-mono text-[10px] tracking-[0.14em] text-lp-violet mb-3">PIPELINE</p>
          <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-[-0.025em] text-lp-ink leading-[1.05] [text-wrap:balance]">
            Four agents in sequence. One always on call.
          </h2>
          <p className="text-lp-muted text-[15.5px] leading-relaxed mt-4">
            Every video runs the same LangGraph pipeline, in order. The transcript and visual
            agents don&apos;t depend on each other &mdash; they just run sequentially for now.
          </p>
        </Reveal>

        {/* sequential steps */}
        <div className="relative">
          <div className="hidden md:block absolute left-0 right-0 top-6 h-px bg-lp-line overflow-hidden">
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: 'left' }}
              className="h-full w-full bg-gradient-to-r from-lp-violet to-lp-violet2"
            />
          </div>

          <div className="grid md:grid-cols-4 gap-8 md:gap-6">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <Reveal key={step.label} delay={i * 0.08} className="relative">
                  <div className="flex md:flex-col items-start md:items-start gap-4 md:gap-0">
                    <div className="w-12 h-12 rounded-full bg-lp-card border border-lp-line flex items-center justify-center shrink-0 md:mb-5 relative z-10">
                      <Icon size={18} className="text-lp-violet" strokeWidth={2} />
                    </div>
                    <div>
                      <p className="font-mono text-[10px] tracking-[0.1em] text-lp-faint mb-1">
                        STEP {i + 1}
                      </p>
                      <h3 className="text-[15.5px] font-semibold text-lp-ink mb-1.5">{step.label}</h3>
                      <p className="text-[13.5px] text-lp-muted leading-relaxed mb-2.5">{step.body}</p>
                      <span className="inline-block font-mono text-[10.5px] text-lp-violet bg-lp-violetsoft rounded-full px-2 py-1">
                        {step.model}
                      </span>
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>

        {/* on-demand QA agent, deliberately set apart from the sequential flow */}
        <Reveal delay={0.15} className="mt-10">
          <div className="flex items-start gap-4 rounded-2xl border border-dashed border-lp-violet/40 bg-lp-violetsoft/40 p-6">
            <div className="w-12 h-12 rounded-full bg-lp-card border border-lp-line flex items-center justify-center shrink-0">
              <QA_STEP.icon size={18} className="text-lp-violet" strokeWidth={2} />
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-[0.1em] text-lp-faint mb-1">ON DEMAND, NOT SEQUENTIAL</p>
              <h3 className="text-[15.5px] font-semibold text-lp-ink mb-1.5">{QA_STEP.label}</h3>
              <p className="text-[13.5px] text-lp-muted leading-relaxed mb-2.5 max-w-lg">{QA_STEP.body}</p>
              <span className="inline-block font-mono text-[10.5px] text-lp-violet bg-white rounded-full px-2 py-1">
                {QA_STEP.model}
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
