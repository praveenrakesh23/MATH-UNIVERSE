import React, { useReducer, useRef, useEffect, useState, useMemo } from 'react';
import { 
  Brain, Bookmark, Lightbulb, PenLine, Settings, Crosshair, Sparkles, 
  ChevronRight, Play, Pause, RotateCcw, Check, Eye,
  Trophy, HelpCircle, Undo2, Redo2, Grid, Clock, GitCommit 
} from 'lucide-react';
import { LIMITS, HINTS } from './divisibility-equal-groupingConfig';
import type { ProofState } from './divisibility-equal-groupingConfig';
import { generateGroupsSnapTargets, divide } from './divisibility-equal-groupingMath';
import { divisibilityReducer, initDivisibilityState } from './divisibility-equal-groupingReducer';
import { checkCompletion } from './divisibility-equal-groupingCompletion';
import './divisibility-equal-grouping.css';

export function DivisibilityEqualGroupingProofPage() {
  const [state, dispatch] = useReducer(divisibilityReducer, undefined, initDivisibilityState);
  
  // Track selected counter for keyboard interaction
  const [selectedCounterId, setSelectedCounterId] = useState<number | null>(null);

  // SVG dimensions
  const W = 900;
  const H = 420;

  const svgRef = useRef<SVGSVGElement>(null);

  // Compute leftover column start X position
  const divInfo = useMemo(() => {
    return divide(state.a, state.b);
  }, [state.a, state.b]);

  const leftoverStartX = 80 + divInfo.q * 145;

  // Drag state
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Generate snap targets for groups mode
  const snapTargets = useMemo(() => {
    return generateGroupsSnapTargets(state.a, state.b);
  }, [state.a, state.b]);

  // Play animation step timer
  useEffect(() => {
    let timer: any = null;
    if (state.isPlaying) {
      timer = setInterval(() => {
        dispatch({ type: 'TICK_ANIMATION' });
      }, 350 / state.animationSpeed);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [state.isPlaying, state.animationSpeed]);

  // Verify completion status
  const completion = useMemo(() => {
    return checkCompletion(state);
  }, [state]);

  // Pointer interaction coordinates conversion
  const handlePointerDown = (id: number, e: React.PointerEvent) => {
    if (state.mode !== 'groups') return; // Only draggable in groups mode
    e.stopPropagation();
    const counter = state.counters.find(c => c.id === id);
    if (!counter) return;

    if (svgRef.current) {
      svgRef.current.setPointerCapture(e.pointerId);
    }
    setDraggingId(id);
    setSelectedCounterId(id);

    // Compute pointer offset relative to counter center
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const svgX = ((e.clientX - rect.left) / rect.width) * W;
      const svgY = ((e.clientY - rect.top) / rect.height) * H;
      dragOffset.current = {
        x: svgX - counter.x,
        y: svgY - counter.y,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingId === null || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const svgY = ((e.clientY - rect.top) / rect.height) * H;

    let nextX = svgX - dragOffset.current.x;
    let nextY = svgY - dragOffset.current.y;

    // Constrain inside SVG canvas boundaries
    nextX = Math.max(20, Math.min(W - 20, nextX));
    nextY = Math.max(20, Math.min(H - 20, nextY));

    // Dynamic magnetic snap preview during drag
    let bestSnap = null;
    let minDistance = Infinity;

    for (const snap of snapTargets) {
      const dist = Math.sqrt((nextX - snap.x) ** 2 + (nextY - snap.y) ** 2);
      if (dist < minDistance) {
        minDistance = dist;
        bestSnap = snap;
      }
    }

    // Snapping effect in the magnet attraction range
    if (bestSnap && minDistance <= LIMITS.snapThreshold) {
      // Check if slot is occupied
      const isOccupied = state.counters.some(
        c => c.id !== draggingId && 
             c.targetType === bestSnap.type && 
             c.targetGroupId === bestSnap.groupId && 
             c.targetSlotId === bestSnap.slotId
      );
      
      if (!isOccupied) {
        nextX = bestSnap.x;
        nextY = bestSnap.y;
      }
    }

    dispatch({ type: 'DRAG_COUNTER', payload: { id: draggingId, x: nextX, y: nextY } });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingId === null) return;
    const counter = state.counters.find(c => c.id === draggingId);
    if (svgRef.current) {
      svgRef.current.releasePointerCapture(e.pointerId);
    }
    setDraggingId(null);

    if (!counter) return;

    // Locate the closest matching snap target on release
    let closestSnap = null;
    let minDistance = Infinity;

    for (const snap of snapTargets) {
      const dist = Math.sqrt((counter.x - snap.x) ** 2 + (counter.y - snap.y) ** 2);
      if (dist < minDistance) {
        minDistance = dist;
        closestSnap = snap;
      }
    }

    // Dock if target is within commit threshold and unoccupied
    if (closestSnap && minDistance <= LIMITS.snapThreshold) {
      const isOccupied = state.counters.some(
        c => c.id !== counter.id && 
             c.targetType === closestSnap.type && 
             c.targetGroupId === closestSnap.groupId && 
             c.targetSlotId === closestSnap.slotId
      );

      if (!isOccupied) {
        dispatch({
          type: 'DOCK_COUNTER',
          payload: {
            id: counter.id,
            targetType: closestSnap.type,
            targetGroupId: closestSnap.groupId,
            targetSlotId: closestSnap.slotId,
            x: closestSnap.x,
            y: closestSnap.y,
          },
        });
        return;
      }
    }

    // Reset back to previous docked slot or initial coordinate
    const prevSnap = snapTargets.find(
      s => s.type === counter.targetType && 
           s.groupId === counter.targetGroupId && 
           s.slotId === counter.targetSlotId
    );

    dispatch({
      type: 'DRAG_COUNTER',
      payload: {
        id: counter.id,
        x: prevSnap?.x ?? 50,
        y: prevSnap?.y ?? 80,
      },
    });
  };

  // Keyboard controls
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (selectedCounterId === null || state.mode !== 'groups') return;
    
    let stepX = 0;
    let stepY = 0;
    const stepSize = e.shiftKey ? 30 : 10;

    if (e.key === 'ArrowLeft') stepX = -stepSize;
    else if (e.key === 'ArrowRight') stepX = stepSize;
    else if (e.key === 'ArrowUp') stepY = -stepSize;
    else if (e.key === 'ArrowDown') stepY = stepSize;
    else if (e.key === 'Escape') {
      setSelectedCounterId(null);
      return;
    } else {
      return;
    }

    e.preventDefault();
    const counter = state.counters.find(c => c.id === selectedCounterId);
    if (!counter) return;

    const newX = Math.max(20, Math.min(W - 20, counter.x + stepX));
    const newY = Math.max(20, Math.min(H - 20, counter.y + stepY));

    dispatch({ type: 'DRAG_COUNTER', payload: { id: selectedCounterId, x: newX, y: newY } });

    // Instantly try docking on keyboard steps
    let closestSnap = null;
    let minDistance = Infinity;

    for (const snap of snapTargets) {
      const dist = Math.sqrt((newX - snap.x) ** 2 + (newY - snap.y) ** 2);
      if (dist < minDistance) {
        minDistance = dist;
        closestSnap = snap;
      }
    }

    if (closestSnap && minDistance <= LIMITS.snapThreshold) {
      const isOccupied = state.counters.some(
        c => c.id !== selectedCounterId && 
             c.targetType === closestSnap.type && 
             c.targetGroupId === closestSnap.groupId && 
             c.targetSlotId === closestSnap.slotId
      );

      if (!isOccupied) {
        dispatch({
          type: 'DOCK_COUNTER',
          payload: {
            id: selectedCounterId,
            targetType: closestSnap.type,
            targetGroupId: closestSnap.groupId,
            targetSlotId: closestSnap.slotId,
            x: closestSnap.x,
            y: closestSnap.y,
          },
        });
      }
    }
  };

  return (
    <div className="div-page-container">
      {/* Sidebar navigation */}
      <aside className="sidebar">
        <div className="brand">
          <div className="logo-mark" aria-hidden="true">
            <svg viewBox="0 0 64 64" style={{ width: '48px', height: '48px' }}>
              <path d="M32 5 C40 22 42 24 59 32 C42 40 40 42 32 59 C24 42 22 40 5 32 C22 24 24 22 32 5Z" fill="none" stroke="currentColor" strokeWidth="4" />
              <circle cx="32" cy="32" r="6" fill="currentColor" />
              <path d="M32 8v48M8 32h48M17 17l30 30M47 17 17 47" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
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
      <section className="div-content">
        {/* Header section */}
        <header className="topbar vp2-top">
          <div>
            <div className="crumb">Visual Proofs <span>/</span> Number Theory</div>
            <h1>Divisibility as Equal Grouping</h1>
            <p>Group to see a = bq + r. Divisible means r = 0.</p>
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

        {/* State Progression Tablist */}
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

        {/* Mission / Mode Strip */}
        <div className="vp2-mission">
          <div className="target" aria-hidden="true">
            <Crosshair size={36} />
          </div>
          <span>
            <b>Mission:</b> Use grouping to understand divisibility and read<br />
            the quotient (<i>q</i>) and remainder (<i>r</i>).
          </span>

          {/* Alternative representation modes tabs */}
          <div className="mode-tabs" role="tablist" aria-label="Visual Mode">
            <button 
              role="tab"
              aria-selected={state.mode === 'groups'}
              className={state.mode === 'groups' ? 'active' : ''} 
              onClick={() => dispatch({ type: 'CHANGE_MODE', payload: 'groups' })}
            >
              <Grid size={18} /> Groups
            </button>
            <button 
              role="tab"
              aria-selected={state.mode === 'array'}
              className={state.mode === 'array' ? 'active' : ''} 
              onClick={() => dispatch({ type: 'CHANGE_MODE', payload: 'array' })}
            >
              <Grid size={18} /> Array
            </button>
            <button 
              role="tab"
              aria-selected={state.mode === 'clock'}
              className={state.mode === 'clock' ? 'active' : ''} 
              onClick={() => dispatch({ type: 'CHANGE_MODE', payload: 'clock' })}
            >
              <Clock size={18} /> Clock
            </button>
            <button 
              role="tab"
              aria-selected={state.mode === 'factors'}
              className={state.mode === 'factors' ? 'active' : ''} 
              onClick={() => dispatch({ type: 'CHANGE_MODE', payload: 'factors' })}
            >
              <GitCommit size={18} /> Factors
            </button>
          </div>
        </div>

        {/* Central Workspace layout */}
        <div className="vp2-workspace">
          {/* Main Discrete Canvas */}
          <section className="group-lab panel">
            <div className="equation">
              <span><i>a</i> = {state.a}</span>
              <b>÷</b>
              <span><i>b</i> = {state.b}</span>
              <em>Fill groups of {state.b}</em>
            </div>

            {/* Inputs to adjust A & B (active in 'transfer' challenge state) */}
            {state.proofState === 'transfer' && (
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', margin: '8px 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  Dividend (a):
                  <input 
                    type="range" min={LIMITS.minA} max={LIMITS.maxA} value={state.a} 
                    onChange={e => dispatch({ type: 'SET_A', payload: Number(e.target.value) })}
                    style={{ accentColor: '#5b2cff' }}
                  />
                  <b>{state.a}</b>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  Divisor (b):
                  <input 
                    type="range" min={LIMITS.minB} max={LIMITS.maxB} value={state.b} 
                    onChange={e => dispatch({ type: 'SET_B', payload: Number(e.target.value) })}
                    style={{ accentColor: '#5b2cff' }}
                  />
                  <b>{state.b}</b>
                </label>
              </div>
            )}

            {/* Drag & Drop Canvas */}
            <div style={{ position: 'relative', width: '100%', height: '330px', border: '1px solid #e0dff2', borderRadius: '15px', background: '#faf9ff', overflow: 'hidden' }}>
              <svg 
                ref={svgRef}
                width="100%" 
                height="100%" 
                viewBox={`0 0 ${W} ${H}`}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onKeyDown={handleKeyDown}
                tabIndex={0}
                style={{ outline: 'none' }}
              >
                {/* 1. Tray boundaries in groups mode */}
                {state.mode === 'groups' && (
                  <g>
                    {/* Dashed outer boundary for starting tray */}
                    <rect x="30" y="30" width="840" height="150" rx="18" fill="rgba(255,255,255,0.5)" stroke="#dedcf0" strokeWidth="1" strokeDasharray="5 5" />
                    <text x="45" y="52" fill="#5360a6" fontSize="12" fontWeight="bold">Counters Tray (Unassigned Items)</text>
                    
                    {/* Unassigned slots outlines */}
                    {snapTargets.filter(s => s.type === 'tray').map((s, idx) => (
                      <circle key={`tray-slot-${idx}`} cx={s.x} cy={s.y} r="22" fill="none" stroke="#dddcef" strokeWidth="1" strokeDasharray="3 3" />
                    ))}
                    
                    {/* Group Boxes Outlines */}
                    {Array.from({ length: divInfo.q }).map((_, gIdx) => {
                      const groupSpacingX = 145;
                      const groupStartX = 80;
                      const cardX = groupStartX + gIdx * groupSpacingX;
                      return (
                        <g key={`g-card-${gIdx}`}>
                          {/* Card background */}
                          <rect x={cardX} y="220" width="135" height="162" rx="14" fill="rgba(255, 255, 255, 0.75)" stroke="#dedcf0" strokeWidth="1.2" />
                          {/* Ribbon for divisor value */}
                          <path d={`M ${cardX + 12} 212 L ${cardX + 36} 212 L ${cardX + 36} 242 L ${cardX + 24} 235 L ${cardX + 12} 242 Z`} fill="#5840d8" />
                          <text x={cardX + 24} y={230} fill="white" fontSize="12" fontWeight="bold" textAnchor="middle">{state.b}</text>
                          {/* Card sub-label */}
                          <text x={cardX + 67} y="370" fill="#202b87" fontSize="13" textAnchor="middle" fontWeight="600">{gIdx + 1} group{gIdx > 0 ? 's' : ''}</text>
                          {/* Slot dot grids */}
                          {snapTargets.filter(s => s.type === 'group' && s.groupId === gIdx).map((s, sIdx) => (
                            <circle key={`group-${gIdx}-slot-${sIdx}`} cx={s.x} cy={s.y} r="22" fill="none" stroke="#cdc9ec" strokeWidth="1" strokeDasharray="3 2" />
                          ))}
                        </g>
                      );
                    })}

                    {/* Leftovers Box Outlines */}
                    <g>
                      <rect x={leftoverStartX} y="220" width="135" height="162" rx="14" fill="rgba(244, 243, 255, 0.4)" stroke="#a9afe2" strokeWidth="2" strokeDasharray="6 6" />
                      <text x={leftoverStartX + 67} y="370" fill="#f25a68" fontSize="13" textAnchor="middle" fontWeight="bold">Leftovers</text>
                      {/* Leftover dot slots */}
                      {snapTargets.filter(s => s.type === 'leftovers').map((s, sIdx) => (
                        <circle key={`leftover-slot-${sIdx}`} cx={s.x} cy={s.y} r="22" fill="none" stroke="#cfc8f0" strokeWidth="1" strokeDasharray="3 2" />
                      ))}
                      {/* Floating hand icon */}
                      <text x={leftoverStartX + 110} y="340" fontSize="40" style={{ transform: 'rotate(-12deg)', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}>☝</text>
                    </g>
                  </g>
                )}

                {/* Alternate layout frames */}
                {state.mode === 'array' && (
                  <g>
                    {/* Horizontal dividing bars showing rows (groups) */}
                    {Array.from({ length: divInfo.q }).map((_, rIdx) => (
                      <rect 
                        key={`array-row-${rIdx}`}
                        x={W / 2 - (state.b * 48) / 2 - 10}
                        y={H / 2 - 80 + rIdx * 48 - 4}
                        width={state.b * 48 + 20}
                        height="40"
                        rx="6"
                        fill="none"
                        stroke="#8e83ff"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                    ))}
                  </g>
                )}

                {/* Draw all countable counter circles */}
                {state.counters.map(c => (
                  <g 
                    key={`counter-dot-${c.id}`}
                    onPointerDown={(e) => handlePointerDown(c.id, e)}
                    style={{ outline: 'none' }}
                  >
                    {/* Shadow layer */}
                    <circle cx={c.x} cy={c.y + 2} r="20" fill="rgba(0,0,0,0.1)" />
                    {/* Core background ball */}
                    <circle 
                      cx={c.x} 
                      cy={c.y} 
                      r="20" 
                      fill={c.color} 
                      stroke="#fff" 
                      strokeWidth="2" 
                      style={{ 
                        cursor: state.mode === 'groups' ? (draggingId === c.id ? 'grabbing' : 'grab') : 'default',
                        filter: selectedCounterId === c.id ? 'drop-shadow(0 0 8px #7b50ff)' : 'none'
                      }}
                    />
                    {/* Number label inside dot */}
                    <text 
                      x={c.x} 
                      y={c.y + 5} 
                      fill={parseInt(c.color.replace('#',''), 16) > 0xcccccc ? '#000' : '#fff'}
                      fontSize="14" 
                      fontWeight="bold" 
                      textAnchor="middle"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {c.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            {/* Playback step controls row */}
            <div className="animation-playback-row" style={{ marginTop: '10px' }}>
              <div className="playback-controls-group">
                <button 
                  className="playback-btn" 
                  onClick={() => dispatch({ type: 'RESET' })}
                  aria-label="Reset tray"
                >
                  <RotateCcw size={16} />
                </button>
                <button 
                  className="playback-btn" 
                  onClick={() => dispatch({ type: 'TOGGLE_PLAY' })}
                  aria-label={state.isPlaying ? 'Pause auto-grouping' : 'Play auto-grouping'}
                >
                  {state.isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button 
                  className="playback-btn" 
                  onClick={() => dispatch({ type: 'AUTO_GROUP_STEP' })}
                  disabled={!state.counters.some(c => c.targetType === 'tray')}
                  aria-label="Step forward"
                >
                  Step
                </button>
              </div>

              {/* Progress feedback */}
              <span style={{ fontSize: '13.5px', color: '#162279', fontWeight: 600 }}>
                Grouped: {state.counters.filter(c => c.targetType !== 'tray').length} / {state.a}
              </span>

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

            {/* Division equation result summary */}
            <div className="result-row">
              <div>
                <i>q</i> (quotient) = <b>{divInfo.q}</b> groups
              </div>
              <strong>→</strong>
              <div>
                <i>a</i> = <i>bq</i> + <i>r</i><br />
                <b>{state.a}</b> = {state.b} × {divInfo.q} + <b>{divInfo.r}</b>
              </div>
            </div>
          </section>

          {/* Right Rail Panel */}
          <aside className="div-rail">
            {/* Why it works */}
            <section className="why panel">
              <h2><Sparkles size={20} />Why it works</h2>
              <div className="div-reason">
                <b>1</b>
                <span>Make groups of b items.</span>
                <div className="mini-dots green" style={{ border: 'none', minHeight: 'auto', padding: '6px' }}>
                  {Array.from({ length: 6 }).map((_, i) => <i key={i} />)}
                </div>
              </div>
              <div className="div-reason">
                <b>2</b>
                <span>Count full groups = q.</span>
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '6px' }}>
                  <Check size={16} stroke="#059c51" strokeWidth={3} />
                  <Check size={16} stroke="#059c51" strokeWidth={3} />
                  <Check size={16} stroke="#059c51" strokeWidth={3} />
                </div>
              </div>
              <div className="div-reason">
                <b>3</b>
                <span>Leftovers = r.</span>
                <div className="mini-dots gold" style={{ border: 'none', minHeight: 'auto', padding: '6px' }}>
                  {Array.from({ length: 3 }).map((_, i) => <i key={i} />)}
                </div>
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

            {/* Prediction Card */}
            <section className="div-pred panel">
              <h2><Lightbulb size={20} />Prediction</h2>
              <p>If <i>a</i> = 35 and <i>b</i> = 7</p>
              <div className="spin-row">
                <label>
                  q = 
                  <input 
                    type="number" 
                    value={state.predictionQ} 
                    onChange={e => dispatch({ type: 'SET_PREDICTION', payload: { q: e.target.value, r: state.predictionR } })} 
                  />
                </label>
                <label>
                  r = 
                  <input 
                    type="number" 
                    value={state.predictionR} 
                    onChange={e => dispatch({ type: 'SET_PREDICTION', payload: { q: state.predictionQ, r: e.target.value } })} 
                  />
                </label>
                <button onClick={() => dispatch({ type: 'CHECK_PREDICTION' })}>Check</button>
              </div>
              {state.predictionChecked && (
                <small style={{ display: 'block', marginTop: '6px', color: state.predictionCorrect ? '#059c51' : '#d22d2d' }}>
                  {state.predictionCorrect ? 'Correct! 35 = 7 × 5 + 0.' : 'Incorrect. Hint: q = 5, r = 0.'}
                </small>
              )}
            </section>

            {/* Reveal card once Prediction passes */}
            {state.predictionChecked && state.predictionCorrect && (
              <section className="div-reveal panel">
                <h2><Eye size={20} />Reveal</h2>
                <p>35 = 7 × 5 + 0</p>
                <span><Check size={18} /> Remainder is zero.</span>
                <small>35 is divisible by 7</small>
              </section>
            )}

            {/* Misconception Checkpoint */}
            <section className="misconception-card">
              <h2 style={{ margin: '0', fontSize: '16px', color: '#f06b13', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Brain size={18} />
                Misconception Checkpoint
              </h2>
              <p style={{ margin: '6px 0 10px', fontSize: '13px', color: '#555' }}>
                What constraint must quotient q and remainder r satisfy?
              </p>
              <div className="misconception-options">
                <button 
                  className={`misconception-option ${state.misconceptionSelected === 'r_gt_b' ? 'selected' : ''}`}
                  onClick={() => dispatch({ type: 'SET_MISCONCEPTION', payload: 'r_gt_b' })}
                >
                  <span className="radio-circle" />
                  <span>Remainder can be greater than b.</span>
                </button>
                <button 
                  className={`misconception-option ${state.misconceptionSelected === 'correct' ? 'selected' : ''}`}
                  onClick={() => dispatch({ type: 'SET_MISCONCEPTION', payload: 'correct' })}
                >
                  <span className="radio-circle" />
                  <span>r must satisfy 0 ≤ r &lt; b.</span>
                </button>
                <button 
                  className={`misconception-option ${state.misconceptionSelected === 'always_divisible' ? 'selected' : ''}`}
                  onClick={() => dispatch({ type: 'SET_MISCONCEPTION', payload: 'always_divisible' })}
                >
                  <span className="radio-circle" />
                  <span>All numbers are always divisible.</span>
                </button>
              </div>
              <button 
                className="hint" 
                style={{ width: '100%', marginTop: '6px' }}
                onClick={() => dispatch({ type: 'CHECK_MISCONCEPTION' })}
              >
                Validate Theorem Rule
              </button>
              {state.misconceptionChecked && state.misconceptionFeedback && (
                <div className={`misconception-feedback-box ${state.misconceptionSelected === 'correct' ? 'correct' : 'incorrect'}`}>
                  {state.misconceptionFeedback}
                </div>
              )}
            </section>

            {/* Completion Hero Panel */}
            {completion.isComplete && (
              <div className="completion-banner-hero">
                <h2>
                  <Trophy size={24} />
                  Proof Complete!
                </h2>
                <p>
                  You proved Divisibility as Equal Grouping by partitioning all elements into complete blocks of divisor items and validating leftover remainders.
                </p>
                <div className="completion-checklist">
                  <div className="completion-item done">
                    <Check size={14} /> Grouping partitions completed
                  </div>
                  <div className="completion-item done">
                    <Check size={14} /> Quotient and remainder identified
                  </div>
                  <div className="completion-item done">
                    <Check size={14} /> Validated division theorem boundaries
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* Bottom panels: One-line proof flow & Challenge */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 316px', gap: '18px', alignItems: 'start' }}>
          {/* One-line proof flow */}
          <section className="vp2-proof panel">
            <h2><PenLine size={20} />One-line proof</h2>
            <div className="vp2-proof-flow">
              <div className="mini-proof-part">
                <div className="mini-dots green">
                  {Array.from({ length: 12 }).map((_, i) => <i key={i} />)}
                </div>
                <span>a items</span>
              </div>
              <b>→</b>
              <div className="mini-proof-part">
                <div className="mini-groups">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i}>
                      <i /><i />
                    </div>
                  ))}
                </div>
                <span>q full groups of b</span>
              </div>
              <b>→</b>
              <div className="mini-proof-part">
                <div className="mini-dots gold">
                  {Array.from({ length: 2 }).map((_, i) => <i key={i} />)}
                </div>
                <span>r leftovers (0 ≤ r &lt; b)</span>
              </div>
              <b>→</b>
              <div className="formula-box">a = bq + r</div>
            </div>
          </section>

          {/* Challenge Panel */}
          <section className="vp2-challenge panel">
            <div>
              <h2><Trophy size={20} />Challenge</h2>
              <p>Group to find q and r.</p>
              <div className="challenge-eq">a = 47&nbsp;&nbsp;&nbsp; b = 6</div>
              <div style={{ display: 'flex', gap: '6px', flexDirection: 'column', margin: '8px 0' }}>
                <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  q = 
                  <input 
                    type="number" style={{ width: '50px', marginLeft: '4px', border: '1px solid #c0c0e5', borderRadius: '4px' }}
                    value={state.challengeQ} 
                    onChange={e => dispatch({ type: 'SET_CHALLENGE', payload: { q: e.target.value, r: state.challengeR } })}
                  />
                </label>
                <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  r = 
                  <input 
                    type="number" style={{ width: '50px', marginLeft: '5px', border: '1px solid #c0c0e5', borderRadius: '4px' }}
                    value={state.challengeR} 
                    onChange={e => dispatch({ type: 'SET_CHALLENGE', payload: { q: state.challengeQ, r: e.target.value } })}
                  />
                </label>
              </div>
              <button onClick={() => dispatch({ type: 'CHECK_CHALLENGE' })}>Start challenge</button>
              {state.challengeChecked && (
                <small style={{ display: 'block', marginTop: '6px', color: state.challengeCorrect ? '#059c51' : '#d22d2d' }}>
                  {state.challengeCorrect ? 'Correct! 47 = 6 × 7 + 5.' : 'Incorrect. Try q = 7, r = 5.'}
                </small>
              )}
            </div>
            <div className="tip">
              <h2>Tip</h2>
              <p>Drag counters into groups!</p>
              <div className="mini-dots pale">
                {Array.from({ length: 4 }).map((_, i) => <i key={i} />)}
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
