import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { SectionHead } from '../ui.jsx'

function CodeBlock({ code, label }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard blocked: nothing to do */
    }
  }
  return (
    <div className="rounded-2xl bg-night border-2 border-ink shadow-pop overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-night-line">
        <span className="font-mono text-[11.5px] text-night-mute">{label}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-semibold text-night-mute hover:text-white hover:bg-night-3 transition-colors"
        >
          {copied ? <Check size={13} className="text-[#5EE0A8]" strokeWidth={3} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto font-mono text-[12.5px] leading-[1.75] text-night-text">
        <code>{code}</code>
      </pre>
    </div>
  )
}

const STEPS = [
  {
    title: 'Start it',
    body: 'Add your Groq key and bring the stack up. Docker Compose starts Redis, the API, the worker and the frontend.',
    label: 'terminal',
    code: `git clone https://github.com/<you>/Scrybe.git && cd Scrybe
cp backend/.env.example backend/.env   # set GROQ_API_KEY
docker compose up --build              # app :5173 · API docs :8000/docs`,
  },
  {
    title: 'Send it a video',
    body: 'One POST returns a job id. Poll the status until it reads done, and you get the video id back.',
    label: 'terminal',
    code: `curl -X POST localhost:8000/api/videos \\
  -H 'Content-Type: application/json' \\
  -d '{"youtube_url": "https://youtu.be/jNQXAC9IVRw"}'
# { "job_id": "…" }

curl localhost:8000/api/videos/<job_id>/status
# { "status": "done", "video_id": "…" }`,
  },
  {
    title: 'Read the report, ask questions',
    body: 'The report is plain JSON: a summary, chapters and checked claims. Questions come back with the second they were found at.',
    label: 'terminal',
    code: `curl localhost:8000/api/videos/<video_id>/report
# { summary, chapters[], claims[] }

curl -X POST localhost:8000/api/qa \\
  -H 'Content-Type: application/json' \\
  -d '{"video_id": "<video_id>", "question": "What is the main claim?"}'
# { "answer": "…", "timestamp_seconds": 314 }`,
  },
]

const ROUTES = [
  ['POST', '/api/videos', 'Submit a link, get a job id'],
  ['GET', '/api/stream/{video_id}', 'Summary as it’s written (SSE)'],
  ['POST', '/api/compare', 'Two or more links, one write-up'],
  ['GET', '/api/export/{video_id}/pdf', 'The report as PDF (or /markdown)'],
]

export default function RunIt() {
  return (
    <section id="run" className="relative py-20 md:py-28 bg-violet-soft">
      <div className="max-w-6xl mx-auto px-5 sm:px-6">
        <SectionHead title="Three steps to your own copy.">
          Scrybe is a project you can run, read and change. The app you’re looking at is one client
          of a small HTTP API.
        </SectionHead>

        <ol className="mt-12 space-y-10">
          {STEPS.map((s, i) => (
            <li key={s.title} className="grid lg:grid-cols-[0.8fr_1.2fr] gap-5 lg:gap-12 items-start">
              <div className="flex gap-4">
                <span className={`w-10 h-10 rounded-xl ${s.tone} border-2 border-ink font-mono text-[15px] font-bold flex items-center justify-center shrink-0 rotate-[-4deg]`}>{i + 1}</span>
                <div>
                  <h3 className="text-[21px] font-extrabold tracking-[-0.025em] text-ink mb-1.5">{s.title}</h3>
                  <p className="text-[15px] leading-[1.6] text-mute max-w-sm">{s.body}</p>
                </div>
              </div>
              <CodeBlock code={s.code} label={s.label} />
            </li>
          ))}
        </ol>

        <div className="mt-14 rounded-2xl border-2 border-ink bg-white shadow-pop overflow-hidden">
          <div className="px-5 py-3.5 border-b-2 border-ink bg-mark">
            <h3 className="text-[15px] font-extrabold tracking-[-0.01em] text-ink">The routes you’ll use most</h3>
          </div>
          <table className="w-full text-left text-[13.5px]">
            <thead className="sr-only">
              <tr><th>Method</th><th>Path</th><th>What it does</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ROUTES.map(([m, p, d]) => (
                <tr key={p} className="align-top">
                  <td className="pl-5 pr-3 py-3 w-[72px]">
                    <span className={`font-mono text-[11px] font-bold rounded-md px-1.5 py-0.5 ${m === 'POST' ? 'bg-blue-soft text-blue' : 'bg-ok-soft text-ok'}`}>{m}</span>
                  </td>
                  <td className="px-3 py-3 font-mono text-[12.5px] text-ink whitespace-nowrap">{p}</td>
                  <td className="px-3 pr-5 py-3 text-mute hidden sm:table-cell">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
