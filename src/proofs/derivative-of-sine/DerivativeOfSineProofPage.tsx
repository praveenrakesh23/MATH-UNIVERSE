import React, { useReducer, useRef, useEffect, useState, useMemo } from 'react';
import { 
  Brain, Bookmark, Lightbulb, PenLine, Settings, Crosshair, Sparkles, 
  ChevronRight, ChevronLeft, Play, Pause, RotateCcw, Plus, Minus, Search, 
  Check, Trophy, HelpCircle, Undo2, Redo2 
} from 'lucide-react';
import { LIMITS, SNAP_POINTS, HINTS } from './derivative-of-sineConfig';
import type { ProofState } from './derivative-of-sineConfig';
import { calculateProofData, getSnapInfo } from './derivative-of-sineMath';
import { proofReducer, INITIAL_STATE } from './derivative-of-sineReducer';
import { checkCompletion } from './derivative-of-sineCompletion';
import './derivative-of-sine.css';

function MathLogo() {
  return (
    <div className="logo-mark" aria-hidden="true">
      <svg viewBox="0 0 64 64" style={{ width: '48px', height: '48px' }}>
        <path d="M32 5 C40 22 42 24 59 32 C42 40 40 42 32 59 C24 42 22 40 5 32 C22 24 24 22 32 5Z" fill="none" stroke="currentColor" strokeWidth="4" />
        <circle cx="32" cy="32" r="6" fill="currentColor" />
        <path d="M32 8v48M8 32h48M17 17l30 30M47 17 17 47" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function DerivativeOfSineProofPage() {
  const [state, dispatch] = useReducer(proofReducer, INITIAL_STATE);
  
  // Track critical snapped points visited by the user
  const [snappedPointsVisited, setSnappedPointsVisited] = useState<Set<number>>(new Set());
  
  // Ref for the interactive graph SVG
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartOffset = useRef(0); // offset between pointer down X and point P's X
  
  // Snapped target label / feedback state for display
  const [snapFeedback, setSnapFeedback] = useState<{ label: string; band: string } | null>(null);

  // SVG Dimension mappings
  const W = 900;
  const H = 380;
  const left = 75;
  const right = 825;
  const midY = 190;
  const scaleX = (right - left) / (4 * Math.PI); // approx 59.7 pixels per radian
  const scaleY = 110; // pixels per unit

  // Coordinates converters
  const px = (v: number) => left + (v + 2 * Math.PI) * scaleX;
  const py = (v: number) => midY - v * scaleY;

  // Calculate coordinates & mathematical states
  const mathData = useMemo(() => {
    return calculateProofData(state.x, state.dx);
  }, [state.x, state.dx]);

  // Handle snapping bands & logic
  const snapInfo = useMemo(() => {
    return getSnapInfo(state.x, scaleX, state.zoom);
  }, [state.x, state.zoom, scaleX]);

  // Keep track of snap points visited
  useEffect(() => {
    if (snapInfo.isSnapped && snapInfo.band === 'commit') {
      setSnappedPointsVisited(prev => {
        const next = new Set(prev);
        next.add(snapInfo.snappedValue);
        return next;
      });
      setSnapFeedback({ label: snapInfo.targetLabel || '', band: snapInfo.band });
    } else if (snapInfo.band === 'attract' || snapInfo.band === 'discover') {
      setSnapFeedback({ label: snapInfo.targetLabel || '', band: snapInfo.band });
    } else {
      setSnapFeedback(null);
    }
  }, [snapInfo]);

  // Run animation timer
  useEffect(() => {
    let intervalId: any = null;
    if (state.isPlaying) {
      intervalId = setInterval(() => {
        dispatch({ type: 'TICK_ANIMATION' });
      }, 50);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [state.isPlaying, state.animationSpeed]);

  // Evaluate completion conditions
  const completion = useMemo(() => {
    return checkCompletion(state, snappedPointsVisited);
  }, [state, snappedPointsVisited]);

  // SVG Paths
  const sinPath = useMemo(() => {
    const points: string[] = [];
    const steps = 300;
    for (let i = 0; i <= steps; i++) {
      const valX = LIMITS.xMin + (i / steps) * (LIMITS.xMax - LIMITS.xMin);
      const valY = Math.sin(valX);
      points.push(`${i === 0 ? 'M' : 'L'} ${px(valX).toFixed(1)} ${py(valY).toFixed(1)}`);
    }
    return points.join(' ');
  }, []);

  const cosPath = useMemo(() => {
    const points: string[] = [];
    const steps = 300;
    for (let i = 0; i <= steps; i++) {
      const valX = LIMITS.xMin + (i / steps) * (LIMITS.xMax - LIMITS.xMin);
      const valY = Math.cos(valX);
      points.push(`${i === 0 ? 'M' : 'L'} ${px(valX).toFixed(1)} ${py(valY).toFixed(1)}`);
    }
    return points.join(' ');
  }, []);

  // Tangent line endpoints
  const tangentPoints = useMemo(() => {
    const span = 1.6; // in radians
    const xStart = state.x - span;
    const xEnd = state.x + span;
    const yStart = mathData.sinX - mathData.tangentSlope * span;
    const yEnd = mathData.sinX + mathData.tangentSlope * span;
    return {
      x1: px(xStart),
      y1: py(yStart),
      x2: px(xEnd),
      y2: py(yEnd)
    };
  }, [state.x, mathData]);

  // Secant line endpoints
  const secantPoints = useMemo(() => {
    const xStart = state.x - 0.2;
    const xEnd = state.x + state.dx + 0.4;
    const yStart = mathData.sinX - mathData.secantSlope * 0.2;
    const yEnd = mathData.sinXPlusDx + mathData.secantSlope * 0.4;
    return {
      x1: px(xStart),
      y1: py(yStart),
      x2: px(xEnd),
      y2: py(yEnd)
    };
  }, [state.x, state.dx, mathData]);

  // Drag interaction math coordinate conversions
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const targetElement = e.target as SVGElement;
    const handleElement = targetElement.closest('.interactive-drag-handle');
    if (!handleElement) return;

    setIsDragging(true);
    svgRef.current.setPointerCapture(e.pointerId);

    // Compute pointer down X coordinate inside SVG
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const mathX = (svgX - left) / scaleX - 2 * Math.PI;

    // Calculate grab offset
    dragStartOffset.current = mathX - state.x;
    e.stopPropagation();
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    
    // Convert back to radians math-x
    let nextX = (svgX - left) / scaleX - 2 * Math.PI - dragStartOffset.current;
    
    // Apply snapping attractor feedback
    const testSnap = getSnapInfo(nextX, scaleX, state.zoom);
    if (testSnap.isSnapped && testSnap.band === 'commit') {
      nextX = testSnap.snappedValue;
    } else if (testSnap.band === 'attract') {
      // Pull slightly towards snap point
      const weight = 0.6;
      nextX = nextX * (1 - weight) + testSnap.snappedValue * weight;
    }

    dispatch({ type: 'SET_X', payload: nextX, commit: false });
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    if (svgRef.current) {
      svgRef.current.releasePointerCapture(e.pointerId);
    }
    // Commit the final position to history
    dispatch({ type: 'SET_X', payload: state.x, commit: true });
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    let increment = 0;
    if (e.key === 'ArrowLeft') {
      increment = e.shiftKey ? -0.1 : -0.02;
    } else if (e.key === 'ArrowRight') {
      increment = e.shiftKey ? 0.1 : 0.02;
    } else if (e.key === 'Escape') {
      setIsDragging(false);
      dispatch({ type: 'RESET' });
      return;
    } else {
      return;
    }
    
    e.preventDefault();
    dispatch({ type: 'SET_X', payload: state.x + increment, commit: true });
  };

  // Jump to snap points
  const snapToNext = (direction: number) => {
    let targetIdx = 0;
    // Find closest snap index
    let minDiff = Infinity;
    SNAP_POINTS.forEach((pt, idx) => {
      const diff = Math.abs(state.x - pt.value);
      if (diff < minDiff) {
        minDiff = diff;
        targetIdx = idx;
      }
    });

    let nextIdx = targetIdx + direction;
    if (nextIdx < 0) nextIdx = SNAP_POINTS.length - 1;
    if (nextIdx >= SNAP_POINTS.length) nextIdx = 0;

    dispatch({ type: 'SET_X', payload: SNAP_POINTS[nextIdx].value, commit: true });
  };

  return (
    <div className="proof-page-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand">
          <MathLogo />
          <b>MATHS<br />UNIVERSE</b>
        </div>
        <nav>
          <button className="nav-item active" aria-label="Explore mode">
            <Brain size={28} />
            <span>Explore</span>
          </button>
          <button className="nav-item" aria-label="Visual Proofs library">
            <Lightbulb size={28} />
            <span>Proofs</span>
          </button>
          <button className="nav-item" aria-label="Practice challenges">
            <PenLine size={28} />
            <span>Practice</span>
          </button>
          <button className="nav-item" aria-label="Saved proofs">
            <Bookmark size={28} />
            <span>Saved</span>
          </button>
        </nav>
        <button className="nav-item settings" aria-label="Settings">
          <Settings size={26} />
          <span>Settings</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <section className="proof-content">
        {/* Topbar Info & Meta */}
        <header className="topbar">
          <div>
            <div className="crumb">Visual Proofs <span>/</span> Calculus</div>
            <h1>Derivative of sin x</h1>
            <p>Compare the tangent slope of sine with the cosine value.</p>
          </div>
          <div className="goal">
            <b>Goal:</b> Prove <span className="formula">d/dx [ sin x ] = cos x</span>
          </div>
          <div className="actions">
            <button className="level-btn">Intermediate <ChevronRight size={18} /></button>
            <button className="time-btn" aria-label="Estimated time 10 minutes">
              <span className="formula" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                10 min
              </span>
            </button>
          </div>
        </header>

        {/* Learning Progression State Wizard Bar */}
        <div className="state-wizard-strip" role="tablist" aria-label="Proof steps">
          {(['inspect', 'manipulate', 'preserve', 'connect', 'conclude', 'transfer'] as ProofState[]).map((st, i) => (
            <React.Fragment key={st}>
              <button 
                role="tab"
                aria-selected={state.proofState === st}
                className={`wizard-step-btn ${state.proofState === st ? 'active' : ''} ${
                  i < ['inspect', 'manipulate', 'preserve', 'connect', 'conclude', 'transfer'].indexOf(state.proofState) ? 'completed' : ''
                }`}
                onClick={() => dispatch({ type: 'SET_STATE', payload: st })}
              >
                {i + 1}. {st.charAt(0).toUpperCase() + st.slice(1)}
              </button>
              {i < 5 && <span className="wizard-separator" aria-hidden="true">/</span>}
            </React.Fragment>
          ))}
          
          {/* Undo Redo buttons */}
          <div className="undo-redo-toolbar">
            <button 
              className="toolbar-btn" 
              onClick={() => dispatch({ type: 'UNDO' })} 
              disabled={state.historyIndex <= 0}
              aria-label="Undo"
            >
              <Undo2 size={16} />
            </button>
            <button 
              className="toolbar-btn" 
              onClick={() => dispatch({ type: 'REDO' })} 
              disabled={state.historyIndex >= state.history.length - 1}
              aria-label="Redo"
            >
              <Redo2 size={16} />
            </button>
          </div>
        </div>

        {/* Mission Bar */}
        <div className="mission">
          <div className="target" aria-hidden="true">
            <Crosshair size={36} />
          </div>
          <div>
            <b>Mission:</b> Compare the tangent slope of sine with the cosine value. Move point P, watch the finite secant approximation, and see it converge to the limiting tangent.
          </div>
          <div className="xp">
            <Sparkles />
            <div>
              <span>+125 XP</span><br />
              <small>Visual Explorer</small>
            </div>
          </div>
        </div>

        {/* Central Workspace Layout */}
        <div className="workspace">
          {/* Left Columns - Graph Lab & Trackers */}
          <section className="lab panel">
            <div className="lab-head">
              <h2>Graph Lab</h2>
              <div className="toggles">
                <button 
                  className={`toggle ${state.showTangent ? 'active' : ''}`} 
                  onClick={() => dispatch({ type: 'TOGGLE_VISIBILITY', payload: 'tangent' })}
                  style={{ '--tone': '#5b2cff' } as React.CSSProperties}
                >
                  <span className={`box ${state.showTangent ? 'on' : ''}`}>
                    {state.showTangent && <Check size={13} />}
                  </span>
                  Tangent
                </button>
                <button 
                  className={`toggle ${state.showSecant ? 'active' : ''}`} 
                  onClick={() => dispatch({ type: 'TOGGLE_VISIBILITY', payload: 'secant' })}
                  style={{ '--tone': '#f06b13' } as React.CSSProperties}
                >
                  <span className={`box ${state.showSecant ? 'on' : ''}`}>
                    {state.showSecant && <Check size={13} />}
                  </span>
                  Secant
                </button>
                <button 
                  className={`toggle ${state.showCos ? 'active' : ''}`} 
                  onClick={() => dispatch({ type: 'TOGGLE_VISIBILITY', payload: 'cos' })}
                  style={{ '--tone': '#059c51' } as React.CSSProperties}
                >
                  <span className={`box ${state.showCos ? 'on' : ''}`}>
                    {state.showCos && <Check size={13} />}
                  </span>
                  Cos x
                </button>
              </div>
            </div>

            <div className="lab-body">
              {/* Left Controls Inside Lab */}
              <aside className="control-panel">
                {/* Drag Point card */}
                <div className="control-card">
                  <span>Drag point P</span>
                  <div className="xread">
                    <i>x</i> = {state.x.toFixed(2)} <small>rad</small>
                  </div>
                  <input 
                    type="range" 
                    min={LIMITS.xMin} 
                    max={LIMITS.xMax - state.dx} 
                    step="0.01" 
                    value={state.x} 
                    onChange={e => dispatch({ type: 'SET_X', payload: Number(e.target.value), commit: true })}
                    aria-label="Move x-value on sine curve" 
                  />
                  <div className="steps">
                    <button onClick={() => snapToNext(-1)} aria-label="Previous critical x-value">
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={() => dispatch({ type: 'RESET' })}>Reset</button>
                    <button onClick={() => snapToNext(1)} aria-label="Next critical x-value">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Zoom controls */}
                <div className="zoom">
                  <span>Zoom</span>
                  <button onClick={() => dispatch({ type: 'SET_ZOOM', payload: state.zoom + 0.1 })} aria-label="Zoom in">
                    <Plus size={16} />
                  </button>
                  <button onClick={() => dispatch({ type: 'SET_ZOOM', payload: 1.0 })} aria-label="Reset zoom">
                    <Search size={16} />
                  </button>
                  <button onClick={() => dispatch({ type: 'SET_ZOOM', payload: state.zoom - 0.1 })} aria-label="Zoom out">
                    <Minus size={16} />
                  </button>
                </div>

                {/* Delta x controller */}
                <div className="zoom" style={{ height: 'auto', flexDirection: 'column', alignItems: 'stretch', gap: '4px', padding: '8px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span>Secant width (Δx)</span>
                    <b>{state.dx.toFixed(2)}</b>
                  </div>
                  <input 
                    type="range" 
                    min={LIMITS.minDx} 
                    max={LIMITS.maxDx} 
                    step="0.01" 
                    value={state.dx}
                    onChange={e => dispatch({ type: 'SET_DX', payload: Number(e.target.value) })}
                    aria-label="Modify delta x size"
                  />
                </div>

                {/* Live Values Table */}
                <div className="values">
                  <b>Live values</b>
                  <p>
                    <i style={{ background: '#5b2cff' }} />
                    sin x <span>{mathData.sinX.toFixed(4)}</span>
                  </p>
                  <p>
                    <i style={{ background: '#059c51' }} />
                    cos x (slope) <span>{mathData.cosX.toFixed(4)}</span>
                  </p>
                  <p>
                    <i style={{ background: '#5b2cff' }} />
                    Tangent slope <span>{mathData.tangentSlope.toFixed(4)}</span>
                  </p>
                  <p>
                    <i style={{ background: '#f06b13' }} />
                    Secant slope <span>{mathData.secantSlope.toFixed(4)}</span>
                  </p>
                  <p>
                    <span style={{ color: '#097d40', fontStyle: 'italic', fontWeight: 600 }}>Δx (secant)</span>
                    <span>{state.dx.toFixed(4)}</span>
                  </p>
                </div>
              </aside>

              {/* Main SVG Graph */}
              <div 
                className="graph-card" 
                style={{ 
                  transform: `scale(${state.zoom})`, 
                  transformOrigin: 'top center',
                  zIndex: isDragging ? 5 : 1
                }}
              >
                {/* Snapping Feedback overlay */}
                {snapFeedback && (
                  <div className={`snap-feedback-banner ${snapFeedback.band}`}>
                    <Sparkles size={14} />
                    <span>
                      {snapFeedback.band === 'commit' && `Snapped to ${snapFeedback.label}!`}
                      {snapFeedback.band === 'attract' && `Magnetizing near ${snapFeedback.label}`}
                      {snapFeedback.band === 'discover' && `Discoverable point: ${snapFeedback.label}`}
                    </span>
                  </div>
                )}

                <svg 
                  ref={svgRef}
                  className="graph-svg" 
                  viewBox={`0 0 ${W} ${H}`}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onKeyDown={handleKeyDown}
                  tabIndex={0}
                  role="img" 
                  aria-label="Interactive graph of sine and cosine curves. Point P can be dragged to trace the tangent."
                >
                  <defs>
                    <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
                      <path d="M0 0 8 4 0 8Z" fill="#111a3f" />
                    </marker>
                    <marker id="arrow-orange" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
                      <path d="M0 0 8 4 0 8Z" fill="#f06b13" />
                    </marker>
                  </defs>
                  
                  {/* Grid Lines */}
                  <g opacity="0.15">
                    {/* Horizontal grid lines */}
                    {[-1, -0.5, 0.5, 1].map(v => (
                      <line key={v} x1={left} x2={right} y1={py(v)} y2={py(v)} stroke="#111a3f" strokeWidth="1" />
                    ))}
                    {/* Vertical grid lines */}
                    {SNAP_POINTS.map(pt => (
                      <line key={pt.value} x1={px(pt.value)} x2={px(pt.value)} y1="20" y2="350" stroke="#111a3f" strokeWidth="1" />
                    ))}
                  </g>

                  {/* Axes */}
                  <line x1={left - 15} x2={right + 25} y1={midY} y2={midY} stroke="#111a3f" strokeWidth="1.4" markerEnd="url(#arrow)" />
                  <line x1={px(0)} x2={px(0)} y1="18" y2="355" stroke="#111a3f" strokeWidth="1.4" markerEnd="url(#arrow)" />
                  
                  {/* Axes Labels */}
                  <text x={right + 32} y={midY + 5} fontWeight="700">x</text>
                  <text x={px(0) - 18} y="22" fontWeight="700">y</text>
                  
                  {/* Tick Marks & Math Labels */}
                  {SNAP_POINTS.map(pt => (
                    <g key={pt.value}>
                      <line x1={px(pt.value)} x2={px(pt.value)} y1={midY - 5} y2={midY + 5} stroke="#111a3f" strokeWidth="1.2" />
                      {pt.value !== 0 && (
                        <text x={px(pt.value)} y={midY + 22} fontSize="12" textAnchor="middle" fill="#232967">{pt.label}</text>
                      )}
                    </g>
                  ))}
                  <text x={px(0) - 14} y={midY + 16} fontSize="12" fill="#232967">0</text>

                  {[-1, -0.5, 0.5, 1].map(v => (
                    <g key={v}>
                      <line x1={px(0) - 5} x2={px(0) + 5} y1={py(v)} y2={py(v)} stroke="#111a3f" strokeWidth="1.2" />
                      <text x={px(0) - 24} y={py(v) + 5} fontSize="12" textAnchor="end" fill="#232967">{v}</text>
                    </g>
                  ))}

                  {/* Dynamic Snapping Ghosts */}
                  {SNAP_POINTS.map(pt => {
                    const diff = Math.abs(state.x - pt.value);
                    const diffPx = diff * scaleX * state.zoom;
                    let ghostBand: 'discover' | 'attract' | 'commit' | 'none' = 'none';
                    if (diffPx <= 6) ghostBand = 'commit';
                    else if (diffPx <= 20) ghostBand = 'attract';
                    else if (diffPx <= 45) ghostBand = 'discover';

                    if (ghostBand === 'none') return null;

                    return (
                      <circle 
                        key={`ghost-${pt.value}`}
                        cx={px(pt.value)} 
                        cy={py(Math.sin(pt.value))} 
                        r="14" 
                        fill="none" 
                        strokeWidth="2" 
                        className={`snap-target-ghost ${ghostBand}`}
                      />
                    );
                  })}

                  {/* Curves */}
                  {state.showCos && (
                    <path d={cosPath} fill="none" stroke="#059c51" strokeWidth="1.7" strokeDasharray="6 6" opacity="0.62" />
                  )}
                  <path d={sinPath} fill="none" stroke="#5b2cff" strokeWidth="2.2" />

                  {/* Projections & Tangent Lines */}
                  {state.showTangent && (
                    <line 
                      x1={tangentPoints.x1} 
                      y1={tangentPoints.y1} 
                      x2={tangentPoints.x2} 
                      y2={tangentPoints.y2} 
                      stroke="#5b2cff" 
                      strokeWidth="2.5" 
                    />
                  )}

                  {state.showSecant && (
                    <g>
                      {/* Secant line */}
                      <line 
                        x1={secantPoints.x1} 
                        y1={secantPoints.y1} 
                        x2={secantPoints.x2} 
                        y2={secantPoints.y2} 
                        stroke="#f06b13" 
                        strokeWidth="1.8" 
                        strokeDasharray="7 6" 
                      />
                      
                      {/* Secant point Q */}
                      <circle cx={px(mathData.xPlusDx)} cy={py(mathData.sinXPlusDx)} r="8" fill="#ffd9c8" stroke="#f06b13" strokeWidth="2.5" />
                      
                      {/* Vertical line from Q to X axis */}
                      <line x1={px(mathData.xPlusDx)} x2={px(mathData.xPlusDx)} y1={py(mathData.sinXPlusDx)} y2={midY} stroke="#f06b13" strokeWidth="1" strokeDasharray="4 4" />
                      
                      {/* Delta x dimension indicator on X axis */}
                      <line x1={px(state.x)} x2={px(mathData.xPlusDx)} y1={midY + 30} y2={midY + 30} stroke="#f06b13" strokeWidth="1.5" markerEnd="url(#arrow-orange)" />
                      <line x1={px(state.x)} x2={px(state.x)} y1={midY + 25} y2={midY + 35} stroke="#f06b13" strokeWidth="1" />
                      <line x1={px(mathData.xPlusDx)} x2={px(mathData.xPlusDx)} y1={midY + 25} y2={midY + 35} stroke="#f06b13" strokeWidth="1" />
                      <text x={(px(state.x) + px(mathData.xPlusDx)) / 2} y={midY + 46} fill="#f06b13" fontSize="13" textAnchor="middle" fontWeight="bold">Δx</text>
                      
                      {/* Label for Q coordinates */}
                      <text x={px(mathData.xPlusDx) + 10} y={py(mathData.sinXPlusDx) - 10} fill="#f06b13" fontSize="14" fontWeight="600">Q</text>
                      <text x={px(mathData.xPlusDx)} y={midY + 16} fill="#f06b13" fontSize="11" textAnchor="middle">x + Δx</text>
                    </g>
                  )}

                  {/* Vertical line from P to X axis */}
                  <line x1={px(state.x)} x2={px(state.x)} y1={py(mathData.sinX)} y2={midY} stroke="#5b2cff" strokeWidth="1" strokeDasharray="4 4" />
                  <text x={px(state.x)} y={midY + 16} fill="#5b2cff" fontSize="11" textAnchor="middle">x</text>

                  {/* Tangent slope label next to P */}
                  <text x={px(state.x) + 12} y={py(mathData.sinX) - 24} fill="#5b2cff" fontSize="16" fontWeight="bold">P</text>
                  
                  {/* Floating Curves Labels */}
                  <text x={px(1.8)} y={py(Math.sin(1.8)) - 25} fill="#5b2cff" fontSize="15" fontWeight="600">y = sin x</text>
                  {state.showCos && (
                    <text x={px(-2.2)} y={py(Math.cos(-2.2)) + 25} fill="#059c51" fontSize="15" fontWeight="600">y = cos x</text>
                  )}
                  
                  {/* Drag Point P (touch hit size 44x44 CSS px) */}
                  <g 
                    className="interactive-drag-handle" 
                    role="slider"
                    aria-valuenow={state.x}
                    aria-valuemin={LIMITS.xMin}
                    aria-valuemax={LIMITS.xMax}
                    aria-label="Interactive point P on sine wave"
                  >
                    {/* Large invisible circle for touch target */}
                    <circle cx={px(state.x)} cy={py(mathData.sinX)} r="22" fill="transparent" style={{ cursor: isDragging ? 'grabbing' : 'grab' }} />
                    {/* Visible styling */}
                    <circle cx={px(state.x)} cy={py(mathData.sinX)} r="11" fill="white" stroke="#5b2cff" strokeWidth="3" style={{ cursor: isDragging ? 'grabbing' : 'grab' }} />
                    <circle cx={px(state.x)} cy={py(mathData.sinX)} r="7" fill="#7b50ff" style={{ cursor: isDragging ? 'grabbing' : 'grab' }} />
                  </g>
                </svg>

                {/* Floating Box: Secant formula */}
                {state.showSecant && (
                  <div className="secant-box">
                    <b>Secant slope</b>
                    <span>(sin(x + Δx) - sin x) / Δx</span>
                  </div>
                )}
              </div>

              {/* Animation Timeline scrub under SVG */}
              <div className="animation-playback-row">
                <div className="playback-controls-group">
                  <button 
                    className="playback-btn"
                    onClick={() => snapToNext(-1)}
                    aria-label="Previous step"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button 
                    className="playback-btn" 
                    onClick={() => dispatch({ type: 'TOGGLE_PLAY' })}
                    aria-label={state.isPlaying ? 'Pause animation' : 'Play animation'}
                  >
                    {state.isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <button 
                    className="playback-btn"
                    onClick={() => dispatch({ type: 'RESET' })}
                    aria-label="Reset animation"
                  >
                    <RotateCcw size={16} />
                  </button>
                  <button 
                    className="playback-btn"
                    onClick={() => snapToNext(1)}
                    aria-label="Next step"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                
                <input 
                  type="range" 
                  min={LIMITS.xMin} 
                  max={LIMITS.xMax - state.dx} 
                  step="0.05"
                  value={state.x}
                  onChange={e => dispatch({ type: 'SET_X', payload: Number(e.target.value), commit: true })}
                  className="scrub-timeline-slider"
                  aria-label="Scrub animation timeline"
                />

                <select 
                  className="playback-speed-select"
                  value={state.animationSpeed}
                  onChange={e => dispatch({ type: 'SET_ANIMATION_SPEED', payload: Number(e.target.value) })}
                  aria-label="Animation speed"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1.0}>1.0x</option>
                  <option value={1.5}>1.5x</option>
                </select>
              </div>
            </div>

            {/* Track slope sign changes slider */}
            <div className="sign-track">
              <h3>Track slope sign</h3>
              <div className="track" style={{ height: '32px' }}>
                <div className="zone plus" style={{ fontSize: '13px', fontWeight: 600 }}>cos x &gt; 0 (+)</div>
                <div className="zone zero" style={{ fontSize: '13px', fontWeight: 600 }}>0</div>
                <div className="zone minus" style={{ fontSize: '13px', fontWeight: 600 }}>cos x &lt; 0 (-)</div>
                <div className="zone zero" style={{ fontSize: '13px', fontWeight: 600 }}>0</div>
                <div className="zone plus" style={{ fontSize: '13px', fontWeight: 600 }}>(+)</div>
                
                {/* Thumb mapping x value onto track */}
                <span 
                  className="knob" 
                  style={{ 
                    left: `${((state.x - LIMITS.xMin) / (LIMITS.xMax - LIMITS.xMin)) * 100}%`,
                    top: '8px'
                  }} 
                  aria-hidden="true"
                />
              </div>
              <div className="track-labels" style={{ marginLeft: '0', display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '10px' }}>
                <span>-2π</span>
                <span>-3π/2</span>
                <span>-π</span>
                <span>-π/2</span>
                <span>0</span>
                <span>π/2</span>
                <span>π</span>
                <span>3π/2</span>
                <span>2π</span>
              </div>
            </div>
          </section>

          {/* Right Rail - Why it works, predictions, misconceptions & completion */}
          <aside className="right-rail">
            {/* Why it works sequence */}
            <section className="why panel">
              <h2><Sparkles size={20} />Why it works</h2>
              
              <div className="reason">
                <b>1</b>
                <span>Tangent is the limit of secants as width shrinks.</span>
                <svg viewBox="0 0 290 60" aria-hidden="true">
                  <path d="M10 45 C70 5 150 5 210 45" fill="none" stroke="#5b2cff" strokeWidth="2" />
                  <line x1="30" y1="36" x2="160" y2="19" stroke="#f06b13" strokeDasharray="3 3" />
                  <line x1="30" y1="36" x2="110" y2="17" stroke="#f06b13" strokeDasharray="1 1" />
                  <circle cx="50" cy="27" r="4" fill="#5b2cff" />
                  <circle cx="130" cy="25" r="4" fill="#f06b13" />
                </svg>
              </div>

              <div className="reason">
                <b>2</b>
                <span>At x, the slope of the tangent equals cos x.</span>
                <svg viewBox="0 0 290 60" aria-hidden="true">
                  <path d="M10 45 C70 5 150 5 210 45" fill="none" stroke="#5b2cff" strokeWidth="2" />
                  <line x1="50" y1="20" x2="170" y2="10" stroke="#059c51" strokeWidth="2" />
                  <circle cx="110" cy="15" r="4" fill="#5b2cff" />
                </svg>
              </div>

              <div className="reason">
                <b>3</b>
                <span>Therefore, d/dx [ sin x ] = cos x.</span>
                <svg viewBox="0 0 290 60" aria-hidden="true">
                  <text x="50" y="35" fill="#059c51" fontSize="18" fontFamily="Georgia, serif">d/dx [ sin x ] = cos x</text>
                </svg>
              </div>
            </section>

            {/* Hint System */}
            <div className="coach-overlay-card">
              <div className="coach-header">
                <h3>
                  <HelpCircle size={16} />
                  Hint {state.hintLevel} of 5
                </h3>
                <div className="coach-step-indicators">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button 
                      key={n} 
                      className={`coach-dot ${state.hintLevel === n ? 'active' : ''}`}
                      onClick={() => dispatch({ type: 'SET_HINT', payload: n })}
                      aria-label={`Show hint level ${n}`}
                    />
                  ))}
                </div>
              </div>
              <div className="coach-body">
                <strong>{HINTS[state.hintLevel].title}</strong>
                <p style={{ margin: '4px 0 0' }}>{HINTS[state.hintLevel].text}</p>
              </div>
              <div className="coach-footer">
                <button 
                  className="coach-nav-btn" 
                  onClick={() => dispatch({ type: 'SET_HINT', payload: Math.max(1, state.hintLevel - 1) })}
                  disabled={state.hintLevel === 1}
                >
                  Previous
                </button>
                <button 
                  className="coach-nav-btn" 
                  onClick={() => dispatch({ type: 'SET_HINT', payload: Math.min(5, state.hintLevel + 1) })}
                  disabled={state.hintLevel === 5}
                >
                  Next Hint
                </button>
              </div>
            </div>

            {/* Prediction */}
            <section className="prediction panel">
              <h2>Make a prediction</h2>
              <p>What is the slope of sin x at x = π/3?</p>
              <div className="answer">
                <input 
                  type="text"
                  value={state.prediction} 
                  onChange={e => dispatch({ type: 'SET_PREDICTION', payload: e.target.value })} 
                  placeholder="e.g. 0.5" 
                  aria-label="Your slope prediction at pi/3"
                />
                <button onClick={() => dispatch({ type: 'CHECK_PREDICTION' })}>Check</button>
              </div>
              {state.predictionChecked && (
                <small style={{ display: 'block', marginTop: '6px', color: state.predictionCorrect ? '#078a4b' : '#d22d2d' }}>
                  {state.predictionCorrect 
                    ? 'Correct! cos(π/3) = 0.5. The tangent slope matches the cosine value.' 
                    : 'Try again: what is cos(π/3)? Hint: 1/2.'}
                </small>
              )}
            </section>

            {/* Misconception Checkpoint */}
            <section className="misconception-card">
              <h2 style={{ margin: '0', fontSize: '16px', color: '#f06b13', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Brain size={18} />
                Misconception Checkpoint
              </h2>
              <p style={{ margin: '6px 0 10px', fontSize: '13px', color: '#555' }}>
                What statement best describes the slope of y = sin x?
              </p>
              <div className="misconception-options">
                <button 
                  className={`misconception-option ${state.misconceptionSelected === 'cos' ? 'selected' : ''}`}
                  onClick={() => dispatch({ type: 'SET_MISCONCEPTION', payload: 'cos' })}
                >
                  <span className="radio-circle" />
                  <span>The tangent slope matches cos(x) exactly.</span>
                </button>
                <button 
                  className={`misconception-option ${state.misconceptionSelected === 'minus_cos' ? 'selected' : ''}`}
                  onClick={() => dispatch({ type: 'SET_MISCONCEPTION', payload: 'minus_cos' })}
                >
                  <span className="radio-circle" />
                  <span>The tangent slope is -cos(x).</span>
                </button>
                <button 
                  className={`misconception-option ${state.misconceptionSelected === 'sine_value' ? 'selected' : ''}`}
                  onClick={() => dispatch({ type: 'SET_MISCONCEPTION', payload: 'sine_value' })}
                >
                  <span className="radio-circle" />
                  <span>The tangent slope matches the value sin(x).</span>
                </button>
              </div>
              <button 
                className="hint" 
                style={{ width: '100%', marginTop: '6px' }}
                onClick={() => dispatch({ type: 'CHECK_MISCONCEPTION' })}
              >
                Validate Claim
              </button>
              {state.misconceptionChecked && state.misconceptionFeedback && (
                <div className={`misconception-feedback-box ${state.misconceptionSelected === 'cos' ? 'correct' : 'incorrect'}`}>
                  {state.misconceptionFeedback}
                </div>
              )}
            </section>

            {/* Completion Banner */}
            {completion.isComplete && (
              <div className="completion-banner-hero">
                <h2>
                  <Trophy size={24} />
                  Proof Complete!
                </h2>
                <p>
                  You proved the Derivative of sin x by comparing the tangent slope directly to the cosine function and checking boundary sign changes.
                </p>
                <div className="completion-checklist">
                  <div className="completion-item done">
                    <Check size={14} /> Visualize derivative of sine
                  </div>
                  <div className="completion-item done">
                    <Check size={14} /> Compare slope with cosine
                  </div>
                  <div className="completion-item done">
                    <Check size={14} /> Track slope sign changes
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* Bottom Columns: One-line proof & Challenge */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 370px', gap: '26px', alignItems: 'start' }}>
          {/* One line proof */}
          <section className="proof-strip panel" style={{ width: '100%', margin: '0', height: 'auto' }}>
            <h2><Sparkles size={20} />One-line visual proof</h2>
            <div className="proof-cards">
              <div className="mini-card">
                <span>1. Secant slope<br />(sin(x + Δx) - sin x) / Δx</span>
              </div>
              <b className="arrow">→</b>
              <div className="mini-card">
                <span>2. Use identity<br />= 2 cos(x + Δx/2) sin(Δx/2) / Δx</span>
              </div>
              <b className="arrow">→</b>
              <div className="mini-card">
                <span>3. Take limit Δx → 0<br />→ cos x</span>
              </div>
              <b className="arrow">→</b>
              <div className="mini-card" style={{ border: '2px solid #52c770' }}>
                <Check className="ok" />
                <span>4. Therefore<br />d/dx [sin x] = cos x</span>
              </div>
            </div>
          </section>

          {/* Transfer Challenge */}
          <section className="challenge panel" style={{ minHeight: 'auto' }}>
            <h2>
              <Trophy size={20} />
              Challenge: Exact & Fast
            </h2>
            <p>Find the derivative function d/dx [sin(5x)].</p>
            <div className="answer">
              <input 
                type="text" 
                value={state.challengeInput}
                onChange={e => dispatch({ type: 'SET_CHALLENGE', payload: e.target.value })}
                placeholder="e.g. 5cos(5x)" 
                aria-label="Derivative function of sin(5x)"
              />
              <button onClick={() => dispatch({ type: 'CHECK_CHALLENGE' })}>Submit</button>
            </div>
            {state.challengeChecked && (
              <small style={{ display: 'block', marginTop: '8px', color: state.challengeCorrect ? '#078a4b' : '#d22d2d' }}>
                {state.challengeCorrect 
                  ? 'Correct! Chain rule gives: 5 cos(5x).' 
                  : 'Incorrect. Remember the Chain Rule: d/dx [sin(u)] = cos(u) * du/dx.'}
              </small>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
