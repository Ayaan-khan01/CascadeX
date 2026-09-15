import React, { useState, useEffect } from 'react';
import { Intervention, InterventionEvaluation, SimulationResult, BudgetOptimizationResult } from '../types';
import { fetchInterventions, evaluateInterventions, optimizeBudget } from '../api';
import { Activity, Sparkles, Check } from 'lucide-react';

interface InterventionPlannerProps {
  simulationResult: SimulationResult | null;
}

export const InterventionPlanner: React.FC<InterventionPlannerProps> = ({
  simulationResult,
}) => {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [evaluation, setEvaluation] = useState<InterventionEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  // Budget Optimization State
  const [budget, setBudget] = useState<number>(100);
  const [budgetResult, setBudgetResult] = useState<BudgetOptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'portfolio' | 'optimizer'>('portfolio');

  useEffect(() => {
    fetchInterventions()
      .then((data) => {
        setInterventions(data);
        if (data.length > 0 && selectedIds.length === 0) {
          // Pre-select first 2 for quick evaluation demo
          setSelectedIds([data[0].id, data[1]?.id].filter(Boolean));
        }
      })
      .catch((err) => console.error('Failed to load interventions:', err));
  }, []);

  const failureScenario = simulationResult?.initial_failures || ['B03'];

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleEvaluate = async () => {
    if (selectedIds.length === 0) return;
    setIsEvaluating(true);
    try {
      const res = await evaluateInterventions({
        interventionIds: selectedIds,
        failureScenario,
      });
      setEvaluation(res);
    } catch (err) {
      console.error('Failed to evaluate interventions:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleOptimizeBudget = async () => {
    setIsOptimizing(true);
    try {
      const res = await optimizeBudget({
        budget,
        failureScenario,
      });
      setBudgetResult(res);
    } catch (err) {
      console.error('Budget optimization failed:', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  const totalSelectedCost = interventions
    .filter((i) => selectedIds.includes(i.id))
    .reduce((sum, i) => sum + i.cost, 0);

  return (
    <div className="card" style={{ padding: '1.75rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '2px solid var(--border-bold)',
          paddingBottom: '1.25rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.72rem', letterSpacing: '0.18em', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            CIVIC DEFENSE & REDUNDANCY
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.03em', margin: 0, color: 'var(--text-primary)' }}>
            INTERVENTION PLANNER
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem', maxWidth: '650px' }}>
            Simulate capital hardening, backup redundancy, and algorithmic knapsack budget allocation against cascading disruptions.
          </p>
        </div>

        {/* Subtabs */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn btn-sm ${activeTab === 'portfolio' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('portfolio')}
            style={{ fontWeight: 800, letterSpacing: '0.08em' }}
          >
            01 PORTFOLIO PLANNER
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'optimizer' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('optimizer')}
            style={{ fontWeight: 800, letterSpacing: '0.08em' }}
          >
            02 KNAPSACK OPTIMIZER
          </button>
        </div>
      </div>

      {activeTab === 'portfolio' ? (
        <div>
          {/* Top Actions Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-surface)',
              padding: '1rem 1.25rem',
              border: '1.5px solid var(--border-bold)',
              boxShadow: 'var(--shadow-brutalist)',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', display: 'block' }}>
                  SELECTED ASSETS
                </span>
                <strong style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                  {selectedIds.length} OF {interventions.length} PROJECTS
                </strong>
              </div>
              <div style={{ width: '1px', height: '32px', background: 'var(--border-subtle)' }} />
              <div>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', display: 'block' }}>
                  TOTAL CAPITAL REQUIRED
                </span>
                <strong className="mono" style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                  ₹{totalSelectedCost.toFixed(1)} CR
                </strong>
              </div>
            </div>

            <button
              className="btn btn-primary"
              disabled={isEvaluating || selectedIds.length === 0}
              onClick={handleEvaluate}
              style={{ padding: '0.75rem 1.5rem', fontSize: '0.85rem' }}
            >
              {isEvaluating ? (
                <span>SIMULATING RESILIENCE...</span>
              ) : (
                <>
                  <Activity size={16} />
                  <span>EVALUATE RESILIENCE IMPACT</span>
                </>
              )}
            </button>
          </div>

          {/* Before vs After Impact Comparison */}
          {evaluation && (
            <div
              style={{
                background: 'var(--bg-card)',
                border: '2px solid var(--border-bold)',
                padding: '1.5rem',
                marginBottom: '2rem',
                boxShadow: 'var(--shadow-brutalist)',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ width: '12px', height: '12px', background: 'var(--border-bold)' }} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)' }}>
                    RESILIENCE EVALUATION AUDIT
                  </h3>
                </div>
                <div className="badge badge-operational">
                  +{evaluation.improvement_pct.toFixed(1)}% RESILIENCE IMPROVEMENT
                </div>
              </div>

              {/* Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {/* Baseline Impact */}
                <div style={{ background: 'rgba(255, 0, 0, 0.08)', border: '1.5px solid #FF0000', padding: '1.2rem', position: 'relative' }}>
                  <span style={{ position: 'absolute', top: '0.5rem', right: '0.75rem', fontSize: '1.5rem', fontWeight: 900, color: 'rgba(255, 0, 0, 0.25)' }}>
                    01
                  </span>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FF0000', fontWeight: 800 }}>
                    BASELINE IMPACT (UNMITIGATED)
                  </div>
                  <div className="mono" style={{ fontSize: '2.5rem', color: '#FF0000', fontWeight: 900, lineHeight: 1.1, margin: '0.35rem 0' }}>
                    {evaluation.baseline_impact}
                    <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/100</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#FF0000', fontWeight: 600 }}>
                    {evaluation.baseline_result.affected_population.toLocaleString()} citizens disrupted
                  </div>
                </div>

                {/* Mitigated Impact */}
                <div style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border-bold)', padding: '1.2rem', position: 'relative' }}>
                  <span className="kpi-bg-number" style={{ fontSize: '3rem', top: '-0.2rem', right: '0.5rem' }}>
                    02
                  </span>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', fontWeight: 800 }}>
                    MITIGATED IMPACT (HARDENED)
                  </div>
                  <div className="mono" style={{ fontSize: '2.5rem', color: 'var(--text-primary)', fontWeight: 900, lineHeight: 1.1, margin: '0.35rem 0' }}>
                    {evaluation.modified_impact}
                    <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/100</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {evaluation.modified_result.affected_population.toLocaleString()} citizens disrupted
                  </div>
                </div>

                {/* Population Protected */}
                <div style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border-bold)', padding: '1.2rem', position: 'relative' }}>
                  <span className="kpi-bg-number" style={{ fontSize: '3rem', top: '-0.2rem', right: '0.5rem' }}>
                    03
                  </span>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', fontWeight: 800 }}>
                    POPULATION PROTECTED
                  </div>
                  <div className="mono" style={{ fontSize: '2.5rem', color: 'var(--text-primary)', fontWeight: 900, lineHeight: 1.1, margin: '0.35rem 0' }}>
                    {evaluation.population_protected.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Reduction: -{evaluation.improvement.toFixed(1)} impact points
                  </div>
                </div>

                {/* Critical Services Preserved */}
                <div style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border-bold)', padding: '1.2rem', position: 'relative' }}>
                  <span className="kpi-bg-number" style={{ fontSize: '3rem', top: '-0.2rem', right: '0.5rem' }}>
                    04
                  </span>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', fontWeight: 800 }}>
                    HOSPITALS PRESERVED
                  </div>
                  <div className="mono" style={{ fontSize: '2.5rem', color: 'var(--text-primary)', fontWeight: 900, lineHeight: 1.1, margin: '0.35rem 0' }}>
                    {evaluation.modified_result.hospital_metrics.operational}
                    <span style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>/{evaluation.modified_result.hospital_metrics.total}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    100% ICU & emergency power maintained
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Interventions Card Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {interventions.map((item, idx) => {
              const isSelected = selectedIds.includes(item.id);
              const cardNum = String(idx + 1).padStart(2, '0');

              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  style={{
                    background: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-card)',
                    border: isSelected ? '2px solid var(--border-bold)' : '1.5px solid var(--border-bold)',
                    padding: '1.25rem',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    boxShadow: isSelected ? 'var(--shadow-brutalist)' : 'none',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Giant Index Number in Background */}
                  <span
                    style={{
                      position: 'absolute',
                      top: '0.2rem',
                      right: '0.75rem',
                      fontSize: '3rem',
                      fontWeight: 900,
                      color: isSelected ? 'var(--border-subtle)' : 'var(--text-light-numeral)',
                      lineHeight: 1,
                      pointerEvents: 'none',
                      fontFamily: 'Space Grotesk, sans-serif',
                    }}
                  >
                    {cardNum}
                  </span>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          border: '2px solid var(--border-bold)',
                          background: isSelected ? 'var(--border-bold)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--bg-card)',
                        }}
                      >
                        {isSelected && <Check size={14} strokeWidth={3} />}
                      </div>
                      <span className="mono" style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {item.id}
                      </span>
                    </div>
                    <span className="mono font-bold" style={{ fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                      ₹{item.cost} CR
                    </span>
                  </div>

                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem', position: 'relative' }}>
                    {item.name}
                  </h4>

                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem', position: 'relative' }}>
                    {item.description}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', fontSize: '0.72rem', position: 'relative' }}>
                    <span style={{ border: '1px solid var(--border-bold)', padding: '0.2rem 0.55rem', fontWeight: 700, background: 'var(--bg-surface)' }}>
                      TARGET: {item.target_asset_name || item.target_asset}
                    </span>
                    {item.capacity_improvement > 0 && (
                      <span className="badge badge-operational">
                        +{item.capacity_improvement}% CAP
                      </span>
                    )}
                    {item.adds_backup && (
                      <span className="badge badge-operational">
                        BACKUP REDUNDANCY
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Algorithmic Budget Optimizer */
        <div>
          <div
            style={{
              background: 'var(--bg-card)',
              border: '2px solid var(--border-bold)',
              padding: '1.75rem',
              marginBottom: '2rem',
              boxShadow: 'var(--shadow-brutalist)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <Sparkles size={22} color="var(--text-primary)" />
              <h3 style={{ fontSize: '1.35rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)' }}>
                ALGORITHMIC KNAPSACK BUDGET ALLOCATION
              </h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.75rem', maxWidth: '750px' }}>
              Solves a combinatorial 0/1 knapsack optimization across all candidate hardening actions to maximize network resilience while strictly adhering to municipal fiscal limits.
            </p>

            {/* Budget Presets & Slider */}
            <div style={{ marginBottom: '1.75rem', background: 'var(--bg-surface)', border: '1.5px solid var(--border-bold)', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <label style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, color: 'var(--text-primary)' }}>
                  MUNICIPAL RESILIENCE BUDGET CAP
                </label>
                <span className="mono" style={{ fontSize: '1.8rem', color: 'var(--text-primary)', fontWeight: 900 }}>
                  ₹{budget} CRORE
                </span>
              </div>

              <input
                type="range"
                min={20}
                max={400}
                step={10}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: 'var(--border-bold)',
                  marginBottom: '1.25rem',
                  cursor: 'pointer',
                  height: '6px',
                }}
              />

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[30, 60, 100, 150, 250].map((b) => (
                  <button
                    key={b}
                    className={`btn btn-sm ${budget === b ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setBudget(b)}
                    style={{ fontWeight: 800, letterSpacing: '0.05em' }}
                  >
                    ₹{b} CR
                  </button>
                ))}
              </div>
            </div>

            <button
              className="btn btn-primary"
              disabled={isOptimizing}
              onClick={handleOptimizeBudget}
              style={{ padding: '0.85rem 1.75rem', fontSize: '0.9rem' }}
            >
              {isOptimizing ? <span>COMPUTING OPTIMAL MIX...</span> : <span>COMPUTE OPTIMAL INTERVENTION MIX</span>}
            </button>
          </div>

          {/* Optimizer Results */}
          {budgetResult && (
            <div
              style={{
                background: 'var(--bg-card)',
                border: '2px solid var(--border-bold)',
                padding: '1.5rem',
                boxShadow: 'var(--shadow-brutalist)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', margin: 0, color: 'var(--text-primary)' }}>
                  OPTIMAL INVESTMENT PORTFOLIO ({budgetResult.selected_interventions.length} PROJECTS)
                </h4>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  <span>TOTAL EXPENDITURE: </span>
                  <span className="mono" style={{ fontSize: '1.1rem', textDecoration: 'underline' }}>
                    ₹{budgetResult.total_cost} CR
                  </span>
                  <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                    (REMAINING: ₹{budget - budgetResult.total_cost} CR)
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
                <div style={{ background: 'rgba(255, 0, 0, 0.08)', border: '1.5px solid #FF0000', padding: '1rem' }}>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FF0000', fontWeight: 800 }}>
                    BASELINE IMPACT
                  </div>
                  <div className="mono" style={{ fontSize: '2.2rem', color: '#FF0000', fontWeight: 900 }}>
                    {budgetResult.baseline_impact}/100
                  </div>
                </div>

                <div style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border-bold)', padding: '1rem' }}>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', fontWeight: 800 }}>
                    OPTIMIZED IMPACT
                  </div>
                  <div className="mono" style={{ fontSize: '2.2rem', color: 'var(--text-primary)', fontWeight: 900 }}>
                    {budgetResult.optimized_impact}/100
                  </div>
                </div>

                <div style={{ background: 'var(--border-bold)', color: 'var(--bg-main)', padding: '1rem' }}>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--bg-surface)', fontWeight: 800 }}>
                    NET RESILIENCE GAIN
                  </div>
                  <div className="mono" style={{ fontSize: '2.2rem', fontWeight: 900 }}>
                    +{budgetResult.improvement_pct}%
                  </div>
                </div>

                <div style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--border-bold)', padding: '1rem' }}>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', fontWeight: 800 }}>
                    CITIZENS PROTECTED
                  </div>
                  <div className="mono" style={{ fontSize: '2.2rem', color: 'var(--text-primary)', fontWeight: 900 }}>
                    {budgetResult.population_protected.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Selected Interventions Table */}
              <table className="data-table">
                <thead>
                  <tr>
                    <th>PROJECT ID</th>
                    <th>INTERVENTION NAME</th>
                    <th>TARGET ASSET</th>
                    <th style={{ textAlign: 'right' }}>COST</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetResult.selected_interventions.map((si) => (
                    <tr key={si.id}>
                      <td className="mono font-bold">{si.id}</td>
                      <td style={{ fontWeight: 700 }}>{si.name}</td>
                      <td>{si.target_name || si.target}</td>
                      <td className="mono font-bold" style={{ textAlign: 'right' }}>₹{si.cost} CR</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
