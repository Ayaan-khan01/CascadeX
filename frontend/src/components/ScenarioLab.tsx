import React, { useState } from 'react';
import { Scenario } from '../types';
import { Play, Zap, AlertTriangle, CloudRain, Shield, Activity } from 'lucide-react';

interface ScenarioLabProps {
  scenarios: Scenario[];
  onRunScenario: (scenarioId: string) => void;
  isLoading: boolean;
  activeScenarioId?: string | null;
}

export const ScenarioLab: React.FC<ScenarioLabProps> = ({
  scenarios,
  onRunScenario,
  isLoading,
  activeScenarioId,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = ['ALL', 'Infrastructure', 'Utility', 'Service', 'Compound', 'Environmental'];

  const filteredScenarios = scenarios.filter(
    (s) => selectedCategory === 'ALL' || s.category === selectedCategory
  );

  const getSeverityBadge = (severity: string = 'High') => {
    switch (severity.toLowerCase()) {
      case 'catastrophic':
        return <span className="badge badge-failed">Catastrophic</span>;
      case 'critical':
        return <span className="badge badge-critical">Critical</span>;
      case 'high':
        return <span className="badge badge-impacted">High</span>;
      default:
        return <span className="badge badge-warning">Moderate</span>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Infrastructure':
        return <Shield size={16} color="#38bdf8" />;
      case 'Utility':
        return <Zap size={16} color="#a855f7" />;
      case 'Compound':
        return <AlertTriangle size={16} color="#ef4444" />;
      case 'Environmental':
        return <CloudRain size={16} color="#06b6d4" />;
      default:
        return <Activity size={16} color="#10b981" />;
    }
  };

  return (
    <div className="glass-panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">
            <span>PREDEFINED SCENARIO STRESS LAB</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              10 Calibrated Failure Archetypes & Stress Tests
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Simulate standard infrastructure contingencies, compound shocks, and extreme environmental hazard triggers.
          </p>
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Scenario Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.5rem',
          marginTop: '1.25rem',
        }}
      >
        {filteredScenarios.map((scenario, idx) => {
          const isActive = activeScenarioId === scenario.id;
          const failList = scenario.failed_assets || [];
          const hasEnv = scenario.environmental_factors && Object.keys(scenario.environmental_factors).length > 0;
          const numStr = idx < 9 ? `0${idx + 1}` : `${idx + 1}`;

          return (
            <div
              key={scenario.id}
              style={{
                position: 'relative',
                background: 'var(--bg-card)',
                border: isActive ? '2px solid #ff0000' : '1.5px solid var(--border-bold)',
                borderRadius: 0,
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? '5px 5px 0px #ff0000' : 'var(--shadow-brutalist)',
                overflow: 'hidden',
              }}
            >
              {/* Giant Index Number in Corner */}
              <span
                style={{
                  position: 'absolute',
                  top: '-0.5rem',
                  right: '0.75rem',
                  fontFamily: 'var(--font-display)',
                  fontSize: '4.5rem',
                  fontWeight: 900,
                  lineHeight: 1,
                  color: 'var(--text-light-numeral)',
                  zIndex: 0,
                  userSelect: 'none',
                  letterSpacing: '-0.05em',
                }}
              >
                {numStr}
              </span>

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span className="mono" style={{ fontSize: '0.74rem', color: 'var(--text-primary)', fontWeight: 900 }}>
                      {scenario.id}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>// {scenario.category}</span>
                  </div>
                  {getSeverityBadge((scenario as any).severity)}
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                  {scenario.name}
                </h3>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  {scenario.description}
                </p>

                {/* Scenario details pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.5rem' }}>
                  {failList.length > 0 && (
                    <div style={{ fontSize: '0.7rem', background: 'var(--border-bold)', color: 'var(--bg-main)', padding: '0.2rem 0.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Primary Trigger: <strong>{failList.join(', ')}</strong>
                    </div>
                  )}
                  {hasEnv && (
                    <div style={{ fontSize: '0.7rem', background: 'var(--bg-surface)', border: '1px solid var(--border-bold)', color: 'var(--text-primary)', padding: '0.2rem 0.5rem', fontWeight: 700, textTransform: 'uppercase' }}>
                      Env Shock: {Object.entries(scenario.environmental_factors!).map(([k, v]) => `${k} (${(v * 100).toFixed(0)}%)`).join(', ')}
                    </div>
                  )}
                </div>
              </div>

              <button
                className={`btn ${isActive ? 'btn-danger' : 'btn-primary'}`}
                style={{ width: '100%', position: 'relative', zIndex: 1 }}
                disabled={isLoading}
                onClick={() => onRunScenario(scenario.id)}
              >
                {isLoading && isActive ? (
                  <span>Simulating Cascade...</span>
                ) : (
                  <>
                    <Play size={13} />
                    <span>{isActive ? 'Re-run Scenario' : 'Execute Scenario'}</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
