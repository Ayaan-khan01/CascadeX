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
      <div className="panel-header">
        <div>
          <div className="panel-title">
            <span>⏱️ Cascade Timeline & Propagation Stepper</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Scenario: {simulationResult.scenario_name}
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            {simulationResult.total_events} Propagation Events across {simulationResult.metrics.cascade_depth + 1} Cascade Levels
          </p>
        </div>

        {/* Playback Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
            <RotateCcw size={14} />
          </button>

          <select
            value={playSpeed}
            onChange={(e) => setPlaySpeed(Number(e.target.value))}
            style={{
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '0.3rem 0.5rem',
              fontSize: '0.75rem',
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
        <span className="mono" style={{ fontSize: '0.85rem', color: '#38bdf8', minWidth: '70px' }}>
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
        <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Step {currentStepIndex + 1} of {maxSteps}
        </span>
      </div>

      {/* Active Step Highlight Card */}
      {currentEvent && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(2, 6, 23, 0.95))',
            border: `1.5px solid ${getLevelColor(currentEvent.cascade_level)}`,
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem',
            boxShadow: `0 0 16px ${getLevelColor(currentEvent.cascade_level)}33`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span
                style={{
                  background: getLevelColor(currentEvent.cascade_level),
                  color: '#000',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '6px',
                }}
              >
                LEVEL {currentEvent.cascade_level}
              </span>
              <span className="mono" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                t = {currentEvent.timestamp} minutes
              </span>
            </div>
            {getStatusBadge(currentEvent.new_status)}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h3 style={{ fontSize: '1.15rem', color: '#fff' }}>
              {currentEvent.asset_name}{' '}
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>
                ({currentEvent.asset_id} • {currentEvent.asset_type})
              </span>
            </h3>
            <span className="mono" style={{ fontSize: '0.85rem', color: '#f87171' }}>
              Capacity: {currentEvent.previous_capacity.toFixed(0)}% → {currentEvent.new_capacity.toFixed(0)}%
            </span>
          </div>

          <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '0.5rem', lineHeight: 1.5 }}>
            <strong>Causal Trigger:</strong> {currentEvent.cause}
          </div>
          {currentEvent.details && (
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              {currentEvent.details}
            </div>
          )}
        </div>
      )}

      {/* Events Stream Table */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Full Event Propagation Sequence</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={14} color="#94a3b8" />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
            }}
          >
            <option value="ALL">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Lvl</th>
              <th>Asset</th>
              <th>Type</th>
              <th>Status Transition</th>
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
                    background: isCurrent ? 'rgba(56, 189, 248, 0.12)' : undefined,
                    borderLeft: isCurrent ? '3px solid #38bdf8' : '3px solid transparent',
                  }}
                >
                  <td className="mono" style={{ color: '#38bdf8' }}>+{evt.timestamp}m</td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.4rem',
                        borderRadius: '4px',
                        background: `${getLevelColor(evt.cascade_level)}22`,
                        color: getLevelColor(evt.cascade_level),
                      }}
                    >
                      L{evt.cascade_level}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{evt.asset_name}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{evt.asset_type}</td>
                  <td>{getStatusBadge(evt.new_status)}</td>
                  <td className="mono" style={{ fontSize: '0.78rem' }}>
                    {evt.previous_capacity.toFixed(0)}% → {evt.new_capacity.toFixed(0)}%
                  </td>
                  <td style={{ fontSize: '0.76rem', color: '#cbd5e1', maxWidth: '300px' }}>
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
