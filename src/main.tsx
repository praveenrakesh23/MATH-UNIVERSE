import React, { useMemo, useState } from 'react';
import type { PointerEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { Bookmark, Brain, Check, ChevronDown, Clock3, Crosshair, Lightbulb, Menu, Minus, PenLine, Play, Plus, Search, Settings, Sparkles, Trophy } from 'lucide-react';
import './style.css';

const purple = '#5b2cff';
const green = '#059c51';
const blue = '#1f6edb';
const orange = '#f06b13';

function fmtPi(value: number) {
  if (Math.abs(value) < 0.03) return '0';
  const hits = [[-2 * Math.PI, '-2π'], [-Math.PI, '-π'], [-Math.PI / 2, '-π / 2'], [Math.PI / 2, 'π / 2'], [Math.PI, 'π'], [1.5 * Math.PI, '3π / 2'], [2 * Math.PI, '2π']] as const;
  return hits.find(([n]) => Math.abs(value - n) < 0.04)?.[1] ?? value.toFixed(2);
}

function MathLogo() {
  return <div className="logo-mark" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M32 5 C40 22 42 24 59 32 C42 40 40 42 32 59 C24 42 22 40 5 32 C22 24 24 22 32 5Z" fill="none" stroke="currentColor" strokeWidth="4" /><circle cx="32" cy="32" r="6" fill="currentColor" /><path d="M32 8v48M8 32h48M17 17l30 30M47 17 17 47" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg></div>;
}

function Sidebar() {
  const items = [['Explore', Brain, true], ['Proofs', Lightbulb, false], ['Practice', PenLine, false], ['Saved', Bookmark, false]] as const;
  return <aside className="sidebar"><div className="brand"><MathLogo /><b>MATHS<br />UNIVERSE</b></div><nav>{items.map(([label, Icon, active]) => <button className={active ? 'nav-item active' : 'nav-item'} key={label}><Icon size={28} /><span>{label}</span></button>)}</nav><button className="nav-item settings"><Settings size={26} /><span>Settings</span></button></aside>;
}

function Toggle({ label, active, tone, onClick }: { label: string; active: boolean; tone?: string; onClick: () => void }) {
  return <button className="toggle" onClick={onClick} style={{ '--tone': tone ?? purple } as React.CSSProperties}><span className={active ? 'box on' : 'box'}>{active && <Check size={13} />}</span>{label}</button>;
}

function Graph({ x, dx, setX, showTangent, showSecant, showCos }: { x: number; dx: number; setX: (n: number) => void; showTangent: boolean; showSecant: boolean; showCos: boolean }) {
  const W = 900, H = 380, left = 40, right = 855, midY = 212, scaleX = (right - left) / (4 * Math.PI), scaleY = 128;
  const px = (v: number) => left + (v + 2 * Math.PI) * scaleX;
  const py = (v: number) => midY - v * scaleY;
  const sinPath = useMemo(() => Array.from({ length: 230 }, (_, i) => { const t = -2 * Math.PI + (i / 229) * 4 * Math.PI; return `${i ? 'L' : 'M'} ${px(t).toFixed(2)} ${py(Math.sin(t)).toFixed(2)}`; }).join(' '), []);
  const cosPath = useMemo(() => Array.from({ length: 230 }, (_, i) => { const t = -2 * Math.PI + (i / 229) * 4 * Math.PI; return `${i ? 'L' : 'M'} ${px(t).toFixed(2)} ${py(Math.cos(t)).toFixed(2)}`; }).join(' '), []);
  const y = Math.sin(x), y2 = Math.sin(x + dx), slope = Math.cos(x), secant = (y2 - y) / dx;
  const tangentLine = (m: number, xc: number, yc: number, span: number) => `${px(xc - span)},${py(yc - m * span)} ${px(xc + span)},${py(yc + m * span)}`;
  const move = (event: PointerEvent<SVGSVGElement>) => {
    if (!(event.target as Element).closest('.drag-point')) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const next = ((event.clientX - rect.left) / rect.width * W - left) / scaleX - 2 * Math.PI;
    setX(Math.max(-2 * Math.PI, Math.min(2 * Math.PI - dx, next)));
  };
  return <svg className="graph-svg" viewBox={`0 0 ${W} ${H}`} onPointerDown={move} onPointerMove={(e) => e.buttons && move(e)} role="img" aria-label="Interactive graph of sine and cosine with tangent and secant">
    <defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 8 4 0 8Z" fill="#111a3f" /></marker></defs>
    <line x1={left} x2={right + 25} y1={midY} y2={midY} stroke="#111a3f" strokeWidth="1.4" markerEnd="url(#arrow)" /><line x1={px(0)} x2={px(0)} y1="18" y2="360" stroke="#111a3f" strokeWidth="1.4" markerEnd="url(#arrow)" />
    {[-2 * Math.PI, -Math.PI, 0, 2 * Math.PI].map(t => <g key={t}><line x1={px(t)} x2={px(t)} y1={midY - 6} y2={midY + 6} stroke="#111a3f" /><text x={px(t) - 12} y={midY + 28}>{fmtPi(t)}</text></g>)}
    {[-1, -0.5, 0.5, 1].map(t => <g key={t}><line x1={px(0) - 5} x2={px(0) + 5} y1={py(t)} y2={py(t)} stroke="#111a3f" /><text x={px(0) - 32} y={py(t) + 5}>{t}</text></g>)}
    <text x={px(0) - 20} y={midY + 28}>0</text><text x={right + 35} y={midY + 26}>x</text><text x={px(0) - 18} y="28">y</text>
    {showCos && <path d={cosPath} fill="none" stroke={green} strokeWidth="1.7" strokeDasharray="6 6" opacity=".62" />}<path d={sinPath} fill="none" stroke={purple} strokeWidth="2.2" />
    {showTangent && <polyline points={tangentLine(slope, x, y, 1.7)} fill="none" stroke={purple} strokeWidth="2" />}{showSecant && <polyline points={tangentLine(secant, x, y, 1.6)} fill="none" stroke={orange} strokeWidth="1.8" strokeDasharray="7 6" />}
    <line x1={px(x)} x2={px(x)} y1={py(y)} y2={335} stroke={purple} strokeDasharray="5 5" />{showSecant && <line x1={px(x + dx)} x2={px(x + dx)} y1={py(y2)} y2={335} stroke={orange} strokeDasharray="5 5" />} {showSecant && <line x1={px(x)} x2={px(x + dx)} y1={334} y2={334} stroke={orange} markerEnd="url(#arrow)" />}
    <path d={`M ${px(x) - 42} ${py(y) - 50} Q ${px(x) - 10} ${py(y) - 42} ${px(x) - 18} ${py(y) - 8}`} fill="none" stroke={purple} strokeWidth="1.7" strokeDasharray="6 6" markerEnd="url(#arrow)" />
    <g className="drag-point"><circle cx={px(x)} cy={py(y)} r="11" fill="#fff" stroke={purple} strokeWidth="3" /><circle cx={px(x)} cy={py(y)} r="7" fill="#7b50ff" /></g>{showSecant && <circle cx={px(x + dx)} cy={py(y2)} r="8" fill="#ffd9c8" stroke={orange} strokeWidth="2.5" />}
    <text x={px(x) + 2} y={py(y) - 24} fill={purple} className="big-label">P</text><text x={px(x + dx) + 8} y={py(y2) - 18} fill={orange} className="big-label">Q</text><text x={px(x) - 7} y="316" fill={purple}>x</text><text x={px(x + dx) - 20} y="316" fill={orange}>x + Δx</text><text x={(px(x) + px(x + dx)) / 2 - 10} y="363" fill={orange} className="big-label">Δx</text>
    <text x="542" y="196" fill={purple} className="curve-label">y = sin x</text><text x="133" y="292" fill={green} className="curve-label">y = cos x</text><text x="565" y="60" fill={green} className="slope-label">Tangent slope = cos x</text>
  </svg>;
}

function ProofOne() {
  const [x, setX] = useState(1.2), [dx] = useState(0.05), [showTangent, setShowTangent] = useState(true), [showSecant, setShowSecant] = useState(true), [showCos, setShowCos] = useState(true), [pred, setPred] = useState(''), [checked, setChecked] = useState(false);
  const sin = Math.sin(x), cos = Math.cos(x), sec = (Math.sin(x + dx) - sin) / dx;
  return <main className="app-shell"><Sidebar /><section className="content"><header className="topbar"><div><div className="crumb">Visual Proofs <span>/</span> Calculus</div><h1>Derivative of sin x</h1><p>The slope of sin x at x is cos x.</p></div><div className="goal"><b>Goal:</b> Prove <span className="formula">d/dx [ sin x ] = cos x</span></div><div className="actions"><button>Intermediate <ChevronDown size={18} /></button><button><Clock3 size={24} />10 min</button></div></header><div className="mission"><div className="target"><Crosshair size={36} /></div><b>Mission:</b> Connect the graph of <i>y</i> = sin <i>x</i> to its slope. Move a point on the curve and watch the tangent slope match cos <i>x</i> in real time. See the secant converge to the tangent.<div className="xp"><Sparkles />+125 XP<br /><small>Visual Explorer</small></div></div><div className="workspace"><section className="lab panel"><div className="lab-head"><h2>Graph Lab</h2><div className="toggles"><Toggle label="Tangent" active={showTangent} onClick={() => setShowTangent(!showTangent)} /><Toggle label="Secant" active={showSecant} onClick={() => setShowSecant(!showSecant)} /><Toggle label="Cos x" tone={green} active={showCos} onClick={() => setShowCos(!showCos)} /><Toggle label="Shaded area" active={false} onClick={() => {}} /><Toggle label="Partitions" active={false} onClick={() => {}} /></div></div><div className="lab-body"><aside className="control-panel"><div className="control-card"><span>Drag point P</span><div className="xread"><i>x</i> = {x.toFixed(2)} <small>rad</small></div><input type="range" min={-2 * Math.PI} max={2 * Math.PI - dx} step="0.01" value={x} onChange={e => setX(Number(e.target.value))} /><div className="steps"><button><Play size={14} /></button><button>Step</button><button><Play size={14} /></button></div></div><div className="zoom"><span>Zoom</span><button><Plus /></button><button><Search /></button><button><Minus /></button></div><div className="values"><b>Live values</b><p><i style={{ background: purple }} />sin x <span>{sin.toFixed(4)}</span></p><p><i style={{ background: green }} />cos x (slope) <span>{cos.toFixed(4)}</span></p><p><i style={{ background: blue }} />Tangent slope <span>{cos.toFixed(4)}</span></p><p><i style={{ background: orange }} />Secant slope <span>{sec.toFixed(4)}</span></p><p>Δx (secant) <span>{dx.toFixed(4)}</span></p></div></aside><div className="graph-card"><Graph x={x} dx={dx} setX={setX} showTangent={showTangent} showSecant={showSecant} showCos={showCos} /><div className="secant-box"><b>Secant slope</b><span>(sin(x + Δx) - sin x) / Δx</span></div></div></div><div className="sign-track"><h3>Track slope sign</h3><div className="track"><div className="zone plus">cos x</div><div className="zone zero">0</div><div className="zone minus">-</div><div className="zone zero">0</div><div className="zone plus">+</div><span className="knob" style={{ left: `${((x + 2 * Math.PI) / (4 * Math.PI)) * 100}%` }} /></div><div className="track-labels"><span>-π / 2</span><span>0</span><span>π / 2</span><span>π</span><span>3π / 2</span></div></div></section><RightRail pred={pred} setPred={setPred} checked={checked} setChecked={setChecked} /></div><section className="proof-strip panel"><h2><Sparkles size={20} />One-line visual proof</h2><div className="proof-cards">{['1. Secant slope\\n(sin(x + Δx) - sin x) / Δx', '2. Use identity\\n= 2 cos(x + Δx/2) sin(Δx/2)', '3. Take limit  Δx → 0\\n→ cos x', '4. Therefore\\nd/dx [sin x] = cos x'].map((t, i) => <React.Fragment key={t}><div className="mini-card">{i === 3 && <Check className="ok" />}<span>{t}</span></div>{i < 3 && <b className="arrow">→</b>}</React.Fragment>)}</div></section></section></main>;
}

function RightRail({ pred, setPred, checked, setChecked }: { pred: string; setPred: (s: string) => void; checked: boolean; setChecked: (b: boolean) => void }) {
  return <aside className="right-rail"><section className="why panel"><h2><Sparkles size={20} />Why it works</h2>{[1, 2, 3].map(i => <div className="reason" key={i}><b>{i}</b><span>{i === 1 ? 'Tangent is the limit of secants.' : i === 2 ? 'At x, the slope of the tangent equals cos x.' : 'Therefore, d/dx [ sin x ] = cos x.'}</span><svg viewBox="0 0 290 78"><path d="M20 58 C90 0 168 0 260 58" fill="none" stroke={purple} strokeWidth="2" /><path d="M75 26 C145 47 200 42 270 34" fill="none" stroke={i === 2 ? green : orange} strokeDasharray="6 5" /><line x1="105" y1="52" x2="230" y2="22" stroke={purple} /><circle cx="144" cy="35" r="7" fill="#7350f3" stroke="#4215ff" />{i === 1 && <circle cx="170" cy="37" r="7" fill="#ffc9b0" stroke={orange} />}</svg></div>)}</section><section className="prediction panel"><h2>Make a prediction <ChevronDown size={18} /></h2><p>What is the slope of sin x at x = π/3?</p><div className="answer"><input value={pred} onChange={e => setPred(e.target.value)} placeholder="Your prediction" /><button onClick={() => setChecked(true)}>Check</button></div>{checked && <small>{Math.abs(Number(pred) - 0.5) < 0.02 ? 'Correct: cos(π/3) = 0.5' : 'Try 0.5: cos(π/3) = 1/2.'}</small>}<label>Reveal</label><div className="reveal"><span>d/dx [sin x] = cos x</span><b><Check size={18} />Proved!</b></div></section><section className="challenge panel"><h2><Trophy size={20} />Challenge: Exact & Fast</h2><p>Find d/dx [sin(5x)].</p><div className="answer"><input placeholder="Your answer" /><button>Submit</button></div><button className="hint">Show hint</button></section></aside>;
}

function MissingPage({ n }: { n: number }) {
  return <main className="missing"><Menu /><h1>Visual Proof Page {n}</h1><p>Reference image {n} was not available in this workspace. Upload it to reconstruct this page with the same strict one-to-one mapping.</p><a href="/visual-proofs/1">Open Page 1</a></main>;
}

function App() {
  const match = location.pathname.match(/visual-proofs\/(\d+)/);
  const page = match ? Number(match[1]) : 1;
  return page === 1 ? <ProofOne /> : <MissingPage n={page} />;
}

createRoot(document.getElementById('app')!).render(<App />);
