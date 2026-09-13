import React, { useState, useEffect } from 'react';
import { Intervention, InterventionEvaluation, SimulationResult, BudgetOptimizationResult } from '../types';
import { fetchInterventions, evaluateInterventions, optimizeBudget } from '../api';
import { Shield, DollarSign, CheckCircle2, TrendingDown, Users, Activity, Sparkles } from 'lucide-react';

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
    <div className="glass-panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">
            <span>🛡️ Resilience Investment & Intervention Planner</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Evaluate capital upgrades, backup redundancy, and algorithmic budget allocation against active failure scenarios.
          </p>
        </div>

        {/* Subtabs */}
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            className={`btn btn-sm ${activeTab === 'portfolio' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('portfolio')}
          >
            Manual Portfolio Planner
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'optimizer' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('optimizer')}
          >
            Algorithmic Budget Optimizer
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
              background: 'rgba(2, 6, 23, 0.6)',
              padding: '0.85rem 1.25rem',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Selected: </span>
              <strong style={{ color: '#fff' }}>{selectedIds.length} Interventions</strong>
              <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>•</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Investment: </span>
              <strong className="mono" style={{ color: '#38bdf8' }}>₹{totalSelectedCost.toFixed(1)} Cr</strong>
            </div>

            <button
              className="btn btn-primary"
              disabled={isEvaluating || selectedIds.length === 0}
              onClick={handleEvaluate}
            >
              {isEvaluating ? (
                <span>Simulating Resilience...</span>
              ) : (
                <>
                  <Activity size={15} />
                  <span>Evaluate Resilience Impact</span>
                </>
              )}
            </button>
          </div>

          {/* Before vs After Impact Comparison */}
          {evaluation && (
            <div
              style={{
                background: 'linear-gradient(145deg, rgba(2, 6, 23, 0.9), rgba(15, 23, 42, 0.95))',
                border: '1.5px solid #10b981',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1.5rem',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={20} color="#10b981" />
                  <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>Resilience Evaluation Results</h3>
                </div>
                <span className="badge badge-operational">
                  +{evaluation.improvement_pct.toFixed(1)}% Resilience Improvement
                </span>
              </div>

              {/* Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.85rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Baseline Impact (Without Mitigation)</div>
                  <div className="mono" style={{ fontSize: '1.6rem', color: '#ef4444', fontWeight: 800 }}>
                    {evaluation.baseline_impact}/100
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#fca5a5' }}>
                    {evaluation.baseline_result.affected_population.toLocaleString()} citizens affected
                  </div>
                </div>

                <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '0.85rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Mitigated Impact (With Interventions)</div>
                  <div className="mono" style={{ fontSize: '1.6rem', color: '#38bdf8', fontWeight: 800 }}>
                    {evaluation.modified_impact}/100
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#7dd3fc' }}>
                    {evaluation.modified_result.affected_population.toLocaleString()} citizens affected
                  </div>
                </div>

                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.85rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Population Protected</div>
                  <div className="mono" style={{ fontSize: '1.6rem', color: '#10b981', fontWeight: 800 }}>
                    {evaluation.population_protected.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6ee7b7' }}>
                    Resilience Gain: -{evaluation.improvement.toFixed(1)} impact points
                  </div>
                </div>

                <div style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '0.85rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Critical Services Preserved</div>
                  <div className="mono" style={{ fontSize: '1.6rem', color: '#c084fc', fontWeight: 800 }}>
                    {evaluation.modified_result.hospital_metrics.operational} / {evaluation.modified_result.hospital_metrics.total}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#d8b4fe' }}>
                    Hospitals maintained 100% operational
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Interventions Card Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {interventions.map((item) => {
              const isSelected = selectedIds.includes(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  style={{
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(2, 132, 199, 0.2), rgba(15, 23, 42, 0.9))'
                      : 'rgba(15, 23, 42, 0.65)',
                    border: isSelected ? '1.5px solid #38bdf8' : '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '1rem 1.15rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        style={{ accentColor: '#38bdf8', cursor: 'pointer' }}
                      />
                      <span className="mono" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {item.id}
                      </span>
                    </div>
                    <span className="mono font-bold" style={{ fontSize: '0.95rem', color: '#38bdf8' }}>
                      ₹{item.cost} Cr
                    </span>
                  </div>

                  <h4 style={{ fontSize: '0.95rem', color: '#fff', marginBottom: '0.35rem' }}>
                    {item.name}
                  </h4>

                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4, marginBottom: '0.75rem' }}>
                    {item.description}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', fontSize: '0.72rem' }}>
                    <span style={{ background: '#1e293b', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#cbd5e1' }}>
                      Target: {item.target_asset_name || item.target_asset}
                    </span>
                    {item.capacity_improvement > 0 && (
                      <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                        +{item.capacity_improvement}% Cap
                      </span>
                    )}
                    {item.adds_backup && (
                      <span style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                        Backup Redundancy
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
              background: 'linear-gradient(135deg, rgba(2, 6, 23, 0.9), rgba(15, 23, 42, 0.95))',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Sparkles size={20} color="#38bdf8" />
              <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>
                Algorithmic Knapsack Budget Allocation
              </h3>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              The optimizer solves an infrastructure knapsack problem to identify the highest ROI intervention combination strictly adhering to your municipal fiscal budget limit.
            </p>

            {/* Budget Presets & Slider */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 600 }}>
                  Municipal Resilience Budget Cap:
                </label>
                <span className="mono" style={{ fontSize: '1.2rem', color: '#38bdf8', fontWeight: 800 }}>
                  ₹{budget} Crore
                </span>
              </div>

              <input
                type="range"
                min={20}
                max={400}
                step={10}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#38bdf8', marginBottom: '0.85rem' }}
              />

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[30, 60, 100, 150, 250].map((b) => (
                  <button
                    key={b}
                    className={`btn btn-sm ${budget === b ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setBudget(b)}
                  >
                    ₹{b} Cr
                  </button>
                ))}
              </div>
            </div>

            <button
              className="btn btn-primary"
              disabled={isOptimizing}
              onClick={handleOptimizeBudget}
            >
              {isOptimizing ? <span>Optimizing Portfolio...</span> : <span>Compute Optimal Intervention Mix</span>}
            </button>
          </div>

          {/* Optimizer Results */}
          {budgetResult && (
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '12px',
                padding: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '1rem', color: '#34d399' }}>
                  ✓ Optimal Investment Portfolio ({budgetResult.selected_interventions.length} Projects Selected)
                </h4>
                <div style={{ fontSize: '0.85rem' }}>
                  <span>Total Capital: </span>
                  <strong className="mono" style={{ color: '#38bdf8' }}>₹{budgetResult.total_cost} Cr</strong>
                  <span style={{ color: 'var(--text-muted)' }}> (Remaining: ₹{budget - budgetResult.total_cost} Cr)</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ background: 'rgba(2, 6, 23, 0.6)', padding: '0.85rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Baseline Cascade Impact</div>
                  <div className="mono" style={{ fontSize: '1.4rem', color: '#ef4444', fontWeight: 800 }}>
                    {budgetResult.baseline_impact}/100
                  </div>
                </div>

                <div style={{ background: 'rgba(2, 6, 23, 0.6)', padding: '0.85rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Optimized Cascade Impact</div>
                  <div className="mono" style={{ fontSize: '1.4rem', color: '#38bdf8', fontWeight: 800 }}>
                    {budgetResult.optimized_impact}/100
                  </div>
                </div>

                <div style={{ background: 'rgba(2, 6, 23, 0.6)', padding: '0.85rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Net Resilience Gain</div>
                  <div className="mono" style={{ fontSize: '1.4rem', color: '#10b981', fontWeight: 800 }}>
                    +{budgetResult.improvement_pct}%
                  </div>
                </div>

                <div style={{ background: 'rgba(2, 6, 23, 0.6)', padding: '0.85rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Citizens Protected</div>
                  <div className="mono" style={{ fontSize: '1.4rem', color: '#c084fc', fontWeight: 800 }}>
                    {budgetResult.population_protected.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Selected Interventions Table */}
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Project ID</th>
                    <th>Intervention Name</th>
                    <th>Target Asset</th>
                    <th>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetResult.selected_interventions.map((si) => (
                    <tr key={si.id}>
                      <td className="mono" style={{ color: '#38bdf8' }}>{si.id}</td>
                      <td style={{ fontWeight: 600 }}>{si.name}</td>
                      <td>{si.target_name || si.target}</td>
                      <td className="mono" style={{ color: '#10b981', fontWeight: 700 }}>₹{si.cost} Cr</td>
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
