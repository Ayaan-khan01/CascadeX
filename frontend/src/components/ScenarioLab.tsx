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
            <span>🧪 Predefined Scenario Stress Lab</span>
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
          gap: '1.25rem',
          marginTop: '1rem',
        }}
      >
        {filteredScenarios.map((scenario) => {
          const isActive = activeScenarioId === scenario.id;
          const failList = scenario.failed_assets || [];
          const hasEnv = scenario.environmental_factors && Object.keys(scenario.environmental_factors).length > 0;

          return (
            <div
              key={scenario.id}
              style={{
                background: isActive
                  ? 'linear-gradient(145deg, rgba(2, 132, 199, 0.15), rgba(15, 23, 42, 0.95))'
                  : 'rgba(15, 23, 42, 0.7)',
                border: isActive ? '1.5px solid #38bdf8' : '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.25s ease',
                boxShadow: isActive ? 'var(--shadow-glow-cyan)' : 'none',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    {getCategoryIcon(scenario.category)}
                    <span className="mono" style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 700 }}>
                      {scenario.id}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>• {scenario.category}</span>
                  </div>
                  {getSeverityBadge((scenario as any).severity)}
                </div>

                <h3 style={{ fontSize: '1.05rem', color: '#f8fafc', marginBottom: '0.5rem' }}>
                  {scenario.name}
                </h3>

                <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '1rem' }}>
                  {scenario.description}
                </p>

                {/* Scenario details pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem' }}>
                  {failList.length > 0 && (
                    <div style={{ fontSize: '0.72rem', background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      Primary Trigger: <strong>{failList.join(', ')}</strong>
                    </div>
                  )}
                  {hasEnv && (
                    <div style={{ fontSize: '0.72rem', background: 'rgba(6, 182, 212, 0.15)', color: '#67e8f9', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      Env Shock: {Object.entries(scenario.environmental_factors!).map(([k, v]) => `${k} (${(v * 100).toFixed(0)}%)`).join(', ')}
                    </div>
                  )}
                </div>
              </div>

              <button
                className={`btn ${isActive ? 'btn-danger' : 'btn-primary'}`}
                style={{ width: '100%' }}
                disabled={isLoading}
                onClick={() => onRunScenario(scenario.id)}
              >
                {isLoading && isActive ? (
                  <span>Simulating Cascade...</span>
                ) : (
                  <>
                    <Play size={14} />
                    <span>{isActive ? 'Re-run Scenario' : 'Execute Scenario Simulation'}</span>
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
