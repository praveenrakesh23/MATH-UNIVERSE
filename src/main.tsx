import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Bookmark, Brain, Check, ChevronDown, Clock3, Crosshair, Info, Lightbulb, Menu, PenLine, Rocket, Settings, Sparkles } from 'lucide-react';
import './style.css';
import { DerivativeOfSineProofPage } from './proofs/derivative-of-sine/DerivativeOfSineProofPage';
import { runTests } from './proofs/derivative-of-sine/derivative-of-sine.test';
import { DivisibilityEqualGroupingProofPage } from './proofs/divisibility-equal-grouping/DivisibilityEqualGroupingProofPage';
import { runDivisibilityTests } from './proofs/divisibility-equal-grouping/divisibility-equal-grouping.test';

runTests();
runDivisibilityTests();

function MathLogo() {
  return <div className="logo-mark" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M32 5 C40 22 42 24 59 32 C42 40 40 42 32 59 C24 42 22 40 5 32 C22 24 24 22 32 5Z" fill="none" stroke="currentColor" strokeWidth="4" /><circle cx="32" cy="32" r="6" fill="currentColor" /><path d="M32 8v48M8 32h48M17 17l30 30M47 17 17 47" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg></div>;
}

function Sidebar() {
  const items = [['Explore', Brain, true], ['Proofs', Lightbulb, false], ['Practice', PenLine, false], ['Saved', Bookmark, false]] as const;
  return <aside className="sidebar"><div className="brand"><MathLogo /><b>MATHS<br />UNIVERSE</b></div><nav>{items.map(([label, Icon, active]) => <button className={active ? 'nav-item active' : 'nav-item'} key={label}><Icon size={28} /><span>{label}</span></button>)}</nav><button className="nav-item settings"><Settings size={26} /><span>Settings</span></button></aside>;
}


function DigitTile({ digit, tone, selected, onClick }: { digit: number; tone: string; selected?: boolean; onClick?: () => void }) {
  return <button className={`digit-tile ${tone} ${selected ? 'selected' : ''}`} onClick={onClick} aria-label={`digit ${digit}`}>{digit}</button>;
}

function ElevenChip({ digit, tone }: { digit: number; tone: string }) {
  return <span className={`eleven-chip ${tone}`}>{digit}</span>;
}

function DivisibilityByEleven() {
  const digits = [7, 3, 8, 6, 2, 4, 1];
  const [selected, setSelected] = useState(6);
  const [answer, setAnswer] = useState<'yes' | 'no' | ''>('');
  const [challenge, setChallenge] = useState('');
  const groupA = digits.filter((_, i) => (digits.length - 1 - i) % 2 === 0);
  const groupB = digits.filter((_, i) => (digits.length - 1 - i) % 2 === 1);
  const sumA = groupA.reduce((s, n) => s + n, 0);
  const sumB = groupB.reduce((s, n) => s + n, 0);
  const alt = sumA - sumB;
  const number = Number(digits.join(''));
  const mod = ((alt % 11) + 11) % 11;
  return <main className="app-shell eleven"><Sidebar /><section className="content eleven-content"><header className="topbar eleven-top"><div><div className="crumb">Visual Proofs <span>/</span> Number Theory</div><h1>Divisibility by 11</h1><p>Because powers of 10 alternate between 1 and -1 modulo 11,<br />the alternating digit sum has the same remainder as the original number.</p></div><div className="eleven-mission panel"><Rocket size={39} /><div><b>Mission</b><span>Test divisibility by 11 using alternating<br />digit sums.</span></div></div><div className="actions"><button>Intermediate</button><button><Clock3 size={22} />10 min</button></div></header><div className="eleven-grid"><section className="eleven-lab panel"><div className="build-card"><h2><b>1</b>Build a number</h2><div className="number-strip">{digits.map((d, i) => <DigitTile key={i} digit={d} tone={['violet','blue','teal','gold','orange','red','violet'][i]} selected={selected === i} onClick={() => setSelected(i)} />)}</div><p>Your number (millions to ones)</p><div className="drag-digits"><span>Drag digit counters</span><div>{[0,1,2,3,4,5,6,7,8,9].map(n => <DigitTile key={n} digit={n} tone={['violet','violet','blue','teal','gold','orange','red','violet','blue','green'][n]} onClick={() => setSelected(Math.min(n, digits.length - 1))} />)}</div><small>Quick examples <button>121</button><button>572</button><button>1331</button><button>24640</button><button>987654</button></small></div></div><div className="sort-card"><h2><b>2</b>Sort into alternating groups <span>(from right)</span><Info size={15} /></h2><div className="sort-body"><div className="sign-group plus-sign"><h3>Group A<br /><span>(+ signs)</span></h3><div>{groupA.map((d, i) => <ElevenChip key={i} digit={d} tone={['violet','blue','blue','violet'][i]} />)}</div><footer><i>Sum<sub>A</sub></i> = {sumA}</footer></div><div className="sign-group minus-sign"><h3>Group B<br /><span>(- signs)</span></h3><div>{groupB.map((d, i) => <ElevenChip key={i} digit={d} tone={['gold','red','blue'][i]} />)}</div><footer><i>Sum<sub>B</sub></i> = {sumB}</footer></div><div className="alt-sum"><h3>Alternating sum</h3><p><i>Sum<sub>A</sub> - Sum<sub>B</sub></i></p><strong>{sumA} - {sumB}</strong><b>= {alt}</b><hr /><span>Same remainder<br />mod 11</span><em>{mod} ≡ {number % 11} (mod 11)</em><small><Check size={16} />Match!</small></div></div></div><div className="power-card"><h2><b>3</b>Why powers of 10 alternate modulo 11</h2><table><tbody><tr><th>k</th>{[0,1,2,3,4,5,6,7].map(n => <td key={n}>{n}</td>)}</tr><tr><th>10<sup>k</sup> mod 11</th>{[1,10,1,10,1,10,1,10].map((n,i)=><td key={i}>{n}</td>)}</tr><tr><th>=</th>{[1,-1,1,-1,1,-1,1,-1].map((n,i)=><td className={n>0?'pos':'neg'} key={i}>{n}</td>)}</tr></tbody></table><div>Since 10 ≡ -1 (mod 11),<br />powers alternate:<br /><b>1, -1, 1, -1, ...</b></div></div></section><ElevenRail answer={answer} setAnswer={setAnswer} /><section className="eleven-proof panel"><h2>One-line proof (visual)</h2><div className="eleven-flow"><div>N = Σ d<sub>i</sub> 10<sup>i</sup><span>Write the number</span></div><b>→</b><div>10<sup>i</sup> = (-1)<sup>i</sup><span>(mod 11)<br />Replace powers</span></div><b>→</b><div>N = Σ d<sub>i</sub>(-1)<sup>i</sup><span>(mod 11)<br />Distribute</span></div><b>→</b><div>N ≡ (Sum<sub>A</sub> - Sum<sub>B</sub>)<span>(mod 11)<br />Group + and -</span></div></div></section><section className="eleven-challenge panel"><h2><Crosshair size={34} />Your challenge</h2><p>Try these numbers. Which are divisible by 11?</p><div className="challenge-buttons">{['121','572','1331','10101','24640'].map(n => <button key={n} className={challenge === n ? 'picked' : ''} onClick={() => setChallenge(n)}>{n}</button>)}<button className="check11">Check</button></div><small><b>Tip:</b> A number is divisible by 11 iff the alternating sum ≡ 0 (mod 11).</small></section></div></section></main>;
}

function ElevenRail({ answer, setAnswer }: { answer: string; setAnswer: (v: 'yes' | 'no') => void }) {
  return <aside className="eleven-rail"><section className="why panel"><h2><Sparkles size={21} />Why it works</h2><div className="eleven-reason"><b>1</b><span>Powers of 10 alternate.<br /><i>10<sup>k</sup> ≡ 1, -1, 1, -1, ...</i> (mod 11)</span><div className="alternators">{[1,-1,1,-1,1,-1].map((n,i)=><React.Fragment key={i}><ElevenChip digit={Math.abs(n)} tone={n>0?'violet':'teal'} />{i<5 && <em>-</em>}</React.Fragment>)}</div></div><div className="eleven-reason"><b>2</b><span>Weight digits by ± 1.<br />Digits in A get +, in B get -.</span><div className="sign-line">{['a','b','c','d','e'].map((l,i)=><React.Fragment key={l}><i>{l}</i><ElevenChip digit={i%2?1:1} tone={i%2?'teal':'violet'} />{i<4 && <em>-</em>}</React.Fragment>)}</div></div><div className="eleven-reason"><b>3</b><span>Remainders match.<br />The alternating sum has the same remainder as the number.</span><div className="balance"><button>Number<br />mod 11</button><strong>=</strong><button>Alternating sum<br />mod 11</button></div></div></section><section className="eleven-predict panel"><h2>Make a prediction</h2><p>Will your number be divisible by 11?</p><div><button className={answer === 'yes' ? 'chosen' : ''} onClick={() => setAnswer('yes')}>Yes</button><button className={answer === 'no' ? 'chosen no' : ''} onClick={() => setAnswer('no')}>No</button></div><label>Why?<ChevronDown size={16} /></label></section><section className="eleven-result panel"><button>Reveal result</button><p>5728641 ≡ 5 <span>(mod 11)</span></p><small>☹ Not divisible by 11.</small></section></aside>;
}

function MissingPage({ n }: { n: number }) {
  return <main className="missing"><Menu /><h1>Visual Proof Page {n}</h1><p>Reference image {n} was not available in this workspace. Upload it to reconstruct this page with the same strict one-to-one mapping.</p><a href="/visual-proofs/1">Open Page 1</a></main>;
}

function App() {
  const path = location.pathname;
  if (path === '/visual-proofs/calculus/derivative-of-sine') {
    return <DerivativeOfSineProofPage />;
  }
  if (path === '/visual-proofs/number-theory/divisibility-equal-grouping') {
    return <DivisibilityEqualGroupingProofPage />;
  }
  if (path === '/visual-proofs/number-theory/divisibility-by-11') {
    return <DivisibilityByEleven />;
  }
  const match = path.match(/visual-proofs\/(\d+)/);
  const page = match ? Number(match[1]) : 1;
  if (page === 1) return <DerivativeOfSineProofPage />;
  if (page === 2) return <DivisibilityEqualGroupingProofPage />;
  if (page === 195) return <DivisibilityByEleven />;
  return <MissingPage n={page} />;
}

createRoot(document.getElementById('app')!).render(<App />);
