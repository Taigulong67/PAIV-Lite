'use client'

import { useEffect, useMemo, useState } from 'react'
import { extractProfile } from '../lib/profile'
import { buildPrompt } from '../lib/actions'

type Line = { id: string; text: string }

type Signals = {
  structure: number
  clarity: number
  control: number
  iteration: number
  warmth: number
}

type Phase = 'idle' | 'thinking' | 'revealing' | 'settling' | 'ready' | 'copied'

function clamp(n: number, min = 10, max = 100) {
  return Math.max(min, Math.min(max, n))
}

function inferReflection(source: string, task: string): { lines: Line[]; signals: Signals } {
  const text = `${source}
${task}`
  const questionCount = (text.match(/\?/g) || []).length
  const headingCount = (text.match(/##|###|1\.|2\.|3\./g) || []).length
  const listCount = (text.match(/[-•]/g) || []).length

  const hasEmotion = /💭|💔|🎭|🌊|✨|真实|无力|疲惫|情感|resonates|feels/i.test(text)
  const hasNarrative = /故事|写作|叙事|人物|情感弧线|scene|story|narrative/i.test(text)
  const hasStructure = /结构|分层|框架|阶段|步骤|时间切片|structure|layer|step|phase|roadmap/i.test(text)
  const hasIteration = /修改|微调|调整|优化|refine|adjust|iterate|improve/i.test(text)
  const hasDecision = /结论|判断|推荐|建议|方案|decision|recommend|path/i.test(text)
  const hasClarity = /清晰|明确|clarity|clear|precise/i.test(text)

  const structure = clamp(30 + headingCount * 10 + (hasStructure ? 25 : 0) + Math.min(listCount, 10) * 2)
  const clarity = clamp(35 + (hasClarity ? 25 : 0) + (hasStructure ? 15 : 0) + (hasDecision ? 10 : 0))
  const control = clamp(30 + (hasDecision ? 20 : 0) + (hasIteration ? 18 : 0) + (questionCount <= 3 ? 8 : 0))
  const iteration = clamp(25 + (hasIteration ? 35 : 0) + (hasStructure ? 10 : 0))
  const warmth = clamp(20 + (hasEmotion ? 35 : 0) + (hasNarrative ? 20 : 0))

  const candidateLines: string[] = []

  if (hasStructure) {
    candidateLines.push("You don't rush to answers.")
    candidateLines.push("You'd rather build them, layer by layer.")
  }

  if (hasClarity || hasStructure) {
    candidateLines.push("You try to keep things clear, even when they're not.")
  }

  if (hasIteration) {
    candidateLines.push("When something feels slightly off, you adjust it instead of throwing it away.")
  }

  if (hasEmotion || hasNarrative) {
    candidateLines.push('There is usually a human feeling underneath the structure you build.')
  }

  if (hasDecision && !candidateLines.find(v => v.includes('clear next step'))) {
    candidateLines.push('Once the shape becomes clear, you want a path you can actually use.')
  }

  if (candidateLines.length < 3) {
    candidateLines.push(
      'You tend to make sense of things by giving them shape.',
      'You prefer clarity that can still hold a little warmth.',
      'You usually move forward by refining, not by restarting.'
    )
  }

  const lines = candidateLines.slice(0, 4).map((text, index) => ({ id: `line-${index + 1}`, text }))

  return {
    lines,
    signals: { structure, clarity, control, iteration, warmth }
  }
}

export default function Home() {
  const [identitySource, setIdentitySource] = useState('')
  const task = 'Help me improve this product with practical next steps.'
  const [output, setOutput] = useState('')
  const [status, setStatus] = useState('Ready')
  const [copied, setCopied] = useState(false)
  const [openedGemini, setOpenedGemini] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [visibleLineCount, setVisibleLineCount] = useState(0)
  const [litHints, setLitHints] = useState(0)
  const [showPrompt, setShowPrompt] = useState(false)

  const reflection = useMemo(() => inferReflection(identitySource, task), [identitySource])

  useEffect(() => {
    if (!generated) {
      setPhase('idle')
      setVisibleLineCount(0)
      setLitHints(0)
      setStatus('Ready')
      return
    }

    setPhase('thinking')
    setVisibleLineCount(0)
    setLitHints(0)

    const timeouts: number[] = []
    timeouts.push(window.setTimeout(() => setPhase('revealing'), 2600))

    reflection.lines.forEach((_, index) => {
      timeouts.push(
        window.setTimeout(() => {
          setVisibleLineCount(index + 1)
          setLitHints(Math.min(index + 1, 5))
        }, 3800 + index * 1900)
      )
    })

    timeouts.push(window.setTimeout(() => setLitHints(5), 11800))

    timeouts.push(window.setTimeout(() => setPhase('settling'), 13200))
    timeouts.push(window.setTimeout(() => setPhase('ready'), 14600))

    return () => timeouts.forEach(window.clearTimeout)
  }, [generated, reflection])

  const handleGenerate = () => {
    const profile = extractProfile(identitySource)
    const prompt = buildPrompt(profile, task)
    setOutput(prompt)
    setStatus('Thinking')
    setCopied(false)
    setOpenedGemini(false)
    setShowPrompt(false)
    setGenerated(true)
  }

  const handleClear = () => {
    setIdentitySource('')
    setOutput('')
    setStatus('Ready')
    setCopied(false)
    setOpenedGemini(false)
    setGenerated(false)
    setShowPrompt(false)
    setPhase('idle')
    setVisibleLineCount(0)
    setLitHints(0)
  }

  const handleCopy = async () => {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      setPhase('copied')
    } catch (e) {
      console.error(e)
    }
  }

  const handleOpenGemini = async () => {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
    } catch (e) {
      console.error(e)
    }
    setOpenedGemini(true)
    const url = `https://gemini.google.com/app?prompt=${encodeURIComponent(output)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const inputPanelStyle: React.CSSProperties = {
    ...styles.panelTopLeft
  }

  const inputBodyStyle: React.CSSProperties = {
    opacity:
      phase === 'idle'
        ? 1
        : phase === 'thinking'
          ? 0.96
          : phase === 'revealing'
            ? 0.62
            : phase === 'settling'
              ? 0.34
              : phase === 'ready' || phase === 'copied'
                ? 0.16
                : 1,
    filter:
      phase === 'idle'
        ? 'blur(0px)'
        : phase === 'thinking'
          ? 'blur(0px)'
          : phase === 'revealing'
            ? 'blur(1.25px)'
            : phase === 'settling'
              ? 'blur(2.5px)'
              : 'blur(3.5px)',
    transition: 'opacity 2200ms ease, filter 2800ms ease'
  }

  const copyStyle: React.CSSProperties = {
    ...primaryButton,
    opacity: phase === 'ready' ? 0.94 : phase === 'copied' ? 0.32 : 0.2,
    transition: 'opacity 1800ms ease, transform 180ms ease, background 180ms ease'
  }

  const geminiStyle: React.CSSProperties = {
    ...ghostButton,
    opacity: phase === 'copied' ? 1 : phase === 'ready' ? 0.18 : 0.12,
    transition: 'opacity 2200ms ease, transform 180ms ease, background 180ms ease'
  }

  const signalLabels = ['Structure', 'Clarity', 'Control', 'Iteration', 'Warmth'] as const

  return (
    <main style={styles.page}>
      <div style={styles.canvas}>
        <header style={styles.header}>
          <div>
            <div style={styles.kicker}>PAIV Lite v2.8.7</div>
            <div style={styles.headerLine}>
              <h1 style={styles.title}>Make AI work like you.</h1>
              <p style={styles.subtitle}>Paste your conversation. Generate your AI. Use it anywhere.</p>
            </div>
          </div>
          <div style={styles.statusPill}>{status}</div>
        </header>

        <section style={styles.grid}>
          <div style={inputPanelStyle}>
            <div style={styles.panelHeaderRow}>
              <div style={inputBodyStyle}>
                <div style={styles.panelEyebrow}>Input</div>
                <div style={styles.panelTitle}>Paste text that reflects how you think and work.</div>
              </div>
              <div style={styles.inlineActions}>
                <button onClick={handleGenerate} style={{ ...primaryButton, opacity: phase === 'ready' || phase === 'copied' ? 0.55 : phase === 'revealing' || phase === 'settling' ? 0.68 : 1 }}>Generate</button>
                <button onClick={handleClear} style={{ ...secondaryButton, opacity: phase === 'ready' || phase === 'copied' ? 0.35 : 0.82 }}>Clear</button>
              </div>
            </div>

            <div style={{ ...styles.textStack, ...inputBodyStyle }}>
              <textarea
                className='highlighted-textarea'
                value={identitySource}
                onChange={e => setIdentitySource(e.target.value)}
                placeholder="Paste your conversation here..."
                style={styles.mainTextarea}
              />
            </div>
          </div>

          <div style={styles.panelTopRight}>
            <div style={styles.panelEyebrow}>Your AI</div>

            <div style={styles.reflectionWrap}>
              {reflection.lines.map((line, index) => {
                const visible = generated && index < visibleLineCount
                return (
                  <div
                    key={line.id}
                    style={{
                      ...styles.reflectionLine,
                      opacity: visible ? 1 : 0,
                      transform: visible ? 'translateY(0)' : 'translateY(10px)'
                    }}
                  >
                    {line.text}
                  </div>
                )
              })}
              {!generated && (
                <div style={styles.ghostText}>Your reflection will appear here, one thought at a time.</div>
              )}
            </div>
          </div>

          <div style={styles.panelBottomLeft}>
            <div style={styles.signalHeading}>Soft Behavior Hints</div>
            <div style={styles.signalList}>
              <Signal label="Structure" value={reflection.signals.structure} lit={litHints >= 1} />
              <Signal label="Clarity" value={reflection.signals.clarity} lit={litHints >= 2} />
              <Signal label="Control" value={reflection.signals.control} lit={litHints >= 3} />
              <Signal label="Iteration" value={reflection.signals.iteration} lit={litHints >= 4} />
              <Signal label="Warmth" value={reflection.signals.warmth} lit={litHints >= 5} />
            </div>
          </div>

          <div style={styles.panelBottomRight}>
            <div>
              <div style={styles.panelEyebrow}>Take it with you</div>
              <div style={{ ...styles.panelTitle, opacity: phase === 'ready' || phase === 'copied' ? 0.82 : 0.28, transition: 'opacity 1800ms ease' }}>Copy the generated prompt into Gemini, Claude, or a new ChatGPT chat.</div>
            </div>

            <div style={styles.promptShell}>
              <button
                type="button"
                onClick={() => output && setShowPrompt(v => !v)}
                style={{ ...styles.promptToggle, opacity: output ? (showPrompt ? 0.72 : 0.56) : 0.16, cursor: output ? 'pointer' : 'default' }}
              >
                Persona Prompt
                <span style={styles.promptToggleHint}>{showPrompt ? ' (hide)' : ' (click to expand)'}</span>
              </button>

              {showPrompt && (
                <div
                  style={{
                    ...styles.promptPreview,
                    maxHeight: 420,
                    opacity: 1,
                    padding: 14,
                    marginTop: 8,
                    borderColor: 'rgba(255,255,255,0.06)',
                    overflow: 'auto'
                  }}
                >
                  {output ? output : ''}
                </div>
              )}
            </div>

            <div style={styles.bottomActions}>
              <button onClick={handleCopy} style={copyStyle}>{copied ? "Copied" : "Copy"}</button>
              <button onClick={handleOpenGemini} style={geminiStyle}>Open Gemini</button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function Signal({ label, value, lit }: { label: string; value: number; lit: boolean }) {
  return (
    <div style={{ ...styles.signalRow, opacity: lit ? 0.82 : 0.16, transform: lit ? 'translateY(0px)' : 'translateY(4px)', transition: 'opacity 1000ms ease, transform 1000ms ease' }}>
      <div style={styles.signalLabel}>{label}</div>
      <div style={styles.signalTrack}>
        <div style={{ ...styles.signalBar, width: lit ? `${value}%` : '0%' }} />
      </div>
    </div>
  )
}

const primaryButton: React.CSSProperties = {
  height: 40,
  padding: '0 16px',
  borderRadius: 999,
  border: 'none',
  background: 'rgba(226,232,240,0.14)',
  color: '#f8fafc',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'opacity 180ms ease, transform 180ms ease, background 180ms ease'
}

const secondaryButton: React.CSSProperties = {
  height: 40,
  padding: '0 14px',
  borderRadius: 999,
  border: '1px solid rgba(226,232,240,0.12)',
  background: 'transparent',
  color: '#cbd5e1',
  fontWeight: 500,
  cursor: 'pointer'
}

const ghostButton: React.CSSProperties = {
  ...secondaryButton,
  color: '#e2e8f0'
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    height: '100vh',
    overflow: 'hidden',
    background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)',
    color: '#e5e7eb',
    fontFamily: 'Arial, sans-serif'
  },
  canvas: {
    width: '100%',
    height: '100%',
    maxWidth: 1440,
    margin: '0 auto',
    padding: '18px 22px 20px',
    boxSizing: 'border-box',
    display: 'grid',
    gridTemplateRows: 'auto 1fr',
    gap: 14
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20
  },
  headerLine: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 12,
    flexWrap: 'wrap'
  },
  kicker: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 4
  },
  title: {
    margin: 0,
    fontSize: 24,
    lineHeight: 1.08,
    color: '#f8fafc',
    fontWeight: 500
  },
  subtitle: {
    margin: 0,
    color: 'rgba(148,163,184,0.72)',
    fontSize: 14
  },
  statusPill: {
    alignSelf: 'center',
    padding: '8px 14px',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#cbd5e1',
    fontSize: 14,
    whiteSpace: 'nowrap'
  },
  grid: {
    minHeight: 0,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gridTemplateRows: '65fr 35fr',
    gap: 16
  },
  panelTopLeft: {
    minHeight: 0,
    padding: '18px 18px 10px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 28,
    backdropFilter: 'blur(8px)',
    display: 'grid',
    gridTemplateRows: 'auto 1fr',
    gap: 10,
    overflow: 'hidden'
  },
  panelTopRight: {
    minHeight: 0,
    padding: '18px 22px',
    background: 'rgba(255,255,255,0.025)',
    borderRadius: 28,
    display: 'grid',
    gridTemplateRows: 'auto auto 1fr',
    gap: 10,
    overflow: 'hidden'
  },
  panelBottomLeft: {
    minHeight: 0,
    padding: '14px 18px 14px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: 28,
    overflow: 'hidden',
    display: 'grid',
    alignContent: 'start'
  },
  panelBottomRight: {
    minHeight: 0,
    padding: '14px 18px 16px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: 28,
    display: 'grid',
    gridTemplateRows: 'auto 1fr auto',
    gap: 12,
    overflow: 'hidden'
  },
  panelHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12
  },
  panelEyebrow: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 6
  },
  panelTitle: {
    color: '#e5e7eb',
    fontSize: 14,
    lineHeight: 1.45
  },
  inlineActions: {
    display: 'flex',
    gap: 10,
    flexShrink: 0
  },
  textStack: {
    minHeight: 0,
    display: 'grid',
    gridTemplateRows: '1fr',
    gap: 12
  },
  mainTextarea: {
    width: '100%',
    minHeight: 0,
    height: '100%',
    resize: 'none',
    borderRadius: 22,
    padding: 16,
    boxSizing: 'border-box',
    background: 'rgba(15,23,42,0.72)',
    color: '#e5e7eb',
    border: '1px solid rgba(255,255,255,0.08)',
    outline: 'none',
    fontSize: 14,
    lineHeight: 1.6
  },
  reflectionWrap: {
    minHeight: 0,
    display: 'grid',
    alignContent: 'start',
    gap: 14,
    paddingTop: 8,
    overflow: 'hidden'
  },
  reflectionLine: {
    fontSize: 15,
    lineHeight: 1.5,
    color: '#f8fafc',
    maxWidth: '92%',
    transition: 'opacity 900ms ease, transform 900ms ease'
  },
  ghostText: {
    color: 'rgba(226,232,240,0.28)',
    fontSize: 15,
    lineHeight: 1.55,
    maxWidth: '85%'
  },
  signalHeading: {
    color: 'rgba(226,232,240,0.62)',
    fontSize: 13,
    letterSpacing: 0.2,
    marginBottom: 10
  },
  signalList: {
    marginTop: 0,
    display: 'grid',
    gap: 8
  },
  signalRow: {
    display: 'grid',
    gridTemplateColumns: '88px 1fr',
    gap: 12,
    alignItems: 'center'
  },
  signalLabel: {
    color: '#cbd5e1',
    fontSize: 13
  },
  signalTrack: {
    height: 4,
    borderRadius: 999,
    background: 'rgba(255,255,255,0.04)',
    overflow: 'hidden'
  },
  signalBar: {
    height: '100%',
    borderRadius: 999,
    background: 'linear-gradient(90deg, rgba(148,163,184,0.18), rgba(226,232,240,0.30))',
    transition: 'width 1200ms ease'
  },
  promptShell: {
    minHeight: 0,
    display: 'grid',
    alignContent: 'start'
  },
  promptToggle: {
    padding: 0,
    border: 'none',
    background: 'transparent',
    color: '#cbd5e1',
    textAlign: 'left',
    fontSize: 12.5,
    transition: 'opacity 260ms ease'
  },
  promptToggleHint: {
    color: 'rgba(148,163,184,0.72)'
  },
  promptPreview: {
    minHeight: 0,
    borderRadius: 18,
    padding: 14,
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(255,255,255,0.06)',
    color: '#cbd5e1',
    overflow: 'hidden',
    whiteSpace: 'pre-wrap',
    fontSize: 12.5,
    lineHeight: 1.5,
    transition: 'max-height 700ms ease, opacity 500ms ease, padding 500ms ease, margin-top 500ms ease, border-color 500ms ease'
  },
  bottomActions: {
    display: 'flex',
    gap: 10,
    alignItems: 'center'
  }
}
