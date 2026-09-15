import React, { useState, useEffect } from 'react';
import { SimulationResult, CascadeEvent, AssetStatus } from '../types';
import { Play, Pause, RotateCcw, FastForward, Filter, Clock, AlertCircle } from 'lucide-react';

interface CascadeTimelineProps {
  simulationResult: SimulationResult | null;
  onSelectAsset?: (id: string) => void;
  currentStepIndex: number;
  onStepChange: (index: number) => void;
}

export const CascadeTimeline: React.FC<CascadeTimelineProps> = ({
  simulationResult,
  onSelectAsset,
  currentStepIndex,
  onStepChange,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1000); // ms per step
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const events = simulationResult?.events || [];
  const maxSteps = events.length;

  // Auto playback
  useEffect(() => {
    let timer: any = null;
    if (isPlaying) {
      timer = setInterval(() => {
        onStepChange(
          currentStepIndex < maxSteps - 1 ? currentStepIndex + 1 : 0
        );
      }, playSpeed);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, currentStepIndex, maxSteps, playSpeed, onStepChange]);

  if (!simulationResult || events.length === 0) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <Clock size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
        <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>No Active Cascade Simulation</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Select an infrastructure asset from the map/network, or pick a scenario from the Scenario Lab to launch a cascade simulation.
        </p>
      </div>
    );
  }

  const filteredEvents = events.filter(
    (e) => severityFilter === 'ALL' || e.severity === severityFilter
  );

  const getStatusBadge = (status: AssetStatus) => {
    switch (status) {
      case 'OPERATIONAL': return <span className="badge badge-operational">OPERATIONAL</span>;
      case 'WARNING': return <span className="badge badge-warning">WARNING</span>;
      case 'IMPACTED': return <span className="badge badge-impacted">IMPACTED</span>;
      case 'CRITICAL': return <span className="badge badge-critical">CRITICAL</span>;
      case 'FAILED': return <span className="badge badge-failed">FAILED</span>;
      case 'RECOVERING': return <span className="badge badge-recovering">RECOVERING</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 0: return '#ef4444';
      case 1: return '#f97316';
      case 2: return '#f59e0b';
      default: return '#38bdf8';
    }
  };

  const currentEvent = events[currentStepIndex] || events[0];

  return (
    <div className="glass-panel">
      <div className="panel-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div className="panel-title">
            <span>CASCADE TIMELINE & PROPAGATION STEPPER</span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
            Scenario: {simulationResult.scenario_name} // {simulationResult.total_events} Propagation Events across {simulationResult.metrics.cascade_depth + 1} Cascade Levels
          </p>
        </div>

        {/* Playback Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${isPlaying ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? 'Pause' : 'Play Cascade'}</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setIsPlaying(false);
              onStepChange(0);
            }}
            title="Reset to t=0"
          >
            <RotateCcw size={14} /> Reset
          </button>

          <select
            value={playSpeed}
            onChange={(e) => setPlaySpeed(Number(e.target.value))}
            style={{
              padding: '0.35rem 0.5rem',
              fontSize: '0.74rem',
              fontWeight: 700,
            }}
          >
            <option value={1500}>0.5x Speed</option>
            <option value={1000}>1x Speed</option>
            <option value={500}>2x Speed</option>
            <option value={200}>5x Speed</option>
          </select>
        </div>
      </div>

      {/* Scrubber Slider */}
      <div className="timeline-scrubber">
        <span className="mono" style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-primary)', minWidth: '80px' }}>
          t = {currentEvent ? `${currentEvent.timestamp}m` : '0m'}
        </span>
        <input
          type="range"
          className="timeline-range"
          min={0}
          max={maxSteps - 1}
          value={currentStepIndex}
          onChange={(e) => {
            setIsPlaying(false);
            onStepChange(Number(e.target.value));
          }}
        />
        <span className="mono" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
          STEP {currentStepIndex + 1} OF {maxSteps}
        </span>
      </div>

      {/* Active Step Highlight Card - With Giant Step Index (Reference 01 / 02 Style) */}
      {currentEvent && (
        <div
          style={{
            position: 'relative',
            background: 'var(--bg-card)',
            border: '2px solid var(--border-bold)',
            padding: '1.5rem',
            marginBottom: '1.75rem',
            boxShadow: 'var(--shadow-brutalist)',
            overflow: 'hidden',
          }}
        >
          {/* Giant Step Number in Corner (matching reference image) */}
          <span
            style={{
              position: 'absolute',
              top: '-0.75rem',
              right: '1rem',
              fontFamily: 'var(--font-display)',
              fontSize: '5rem',
              fontWeight: 900,
              lineHeight: 1,
              color: 'var(--text-light-numeral)',
              zIndex: 0,
              userSelect: 'none',
              letterSpacing: '-0.05em',
            }}
          >
            {currentStepIndex < 9 ? `0${currentStepIndex + 1}` : currentStepIndex + 1}
          </span>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span
                  style={{
                    background: 'var(--border-bold)',
                    color: 'var(--bg-main)',
                    fontWeight: 900,
                    fontSize: '0.72rem',
                    padding: '0.25rem 0.6rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  CASCADE LEVEL {currentEvent.cascade_level}
                </span>
                <span className="mono" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  TIMESTAMP: +{currentEvent.timestamp} MIN
                </span>
              </div>
              {getStatusBadge(currentEvent.new_status)}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                {currentEvent.asset_name}{' '}
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                  ({currentEvent.asset_id} // {currentEvent.asset_type})
                </span>
              </h3>
              <span className="mono" style={{ fontSize: '0.95rem', fontWeight: 900, color: '#ff0000' }}>
                Capacity: {currentEvent.previous_capacity.toFixed(0)}% → {currentEvent.new_capacity.toFixed(0)}%
              </span>
            </div>

            <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginTop: '0.5rem', lineHeight: 1.5, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '0.65rem 0.85rem' }}>
              <strong style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.75rem' }}>Causal Trigger:</strong> {currentEvent.cause}
            </div>
            {currentEvent.details && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                {currentEvent.details}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Events Stream Table */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h4 style={{ fontSize: '0.88rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-primary)' }}>
          Full Propagation Sequence ({filteredEvents.length})
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={14} color="var(--text-primary)" />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.74rem',
              fontWeight: 700,
            }}
          >
            <option value="ALL">All Severities</option>
            <option value="critical">Critical Only</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div style={{ maxHeight: '380px', overflowY: 'auto', border: '1.5px solid var(--border-bold)' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Lvl</th>
              <th>Asset</th>
              <th>Type</th>
              <th>Transition</th>
              <th>Capacity</th>
              <th>Causal Trigger</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map((evt, idx) => {
              const isCurrent = events.indexOf(evt) === currentStepIndex;
              return (
                <tr
                  key={idx}
                  onClick={() => {
                    onStepChange(events.indexOf(evt));
                    if (onSelectAsset) onSelectAsset(evt.asset_id);
                  }}
                  style={{
                    cursor: 'pointer',
                    background: isCurrent ? '#f4f4f5' : undefined,
                    borderLeft: isCurrent ? '4px solid #000000' : '4px solid transparent',
                  }}
                >
                  <td className="mono" style={{ fontWeight: 800, color: 'var(--text-primary)' }}>+{evt.timestamp}m</td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        padding: '0.15rem 0.4rem',
                        background: 'var(--border-bold)',
                        color: 'var(--bg-main)',
                      }}
                    >
                      L{evt.cascade_level}
                    </span>
                  </td>
                  <td style={{ fontWeight: 800 }}>{evt.asset_name}</td>
                  <td style={{ color: '#71717a', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>{evt.asset_type}</td>
                  <td>{getStatusBadge(evt.new_status)}</td>
                  <td className="mono" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                    {evt.previous_capacity.toFixed(0)}% → {evt.new_capacity.toFixed(0)}%
                  </td>
                  <td style={{ fontSize: '0.78rem', color: '#27272a', maxWidth: '320px' }}>
                    {evt.cause}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
