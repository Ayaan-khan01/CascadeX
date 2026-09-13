import React, { useEffect, useState } from 'react';
import { SimulationResult } from '../types';
import { runCounterfactual } from '../api';
import { HelpCircle, GitBranch, RefreshCw, Zap, ShieldCheck } from 'lucide-react';

interface ExplainabilityPanelProps {
  simulationResult: SimulationResult | null;
  selectedAssetId: string | null;
  onSelectAsset: (id: string) => void;
}

export const ExplainabilityPanel: React.FC<ExplainabilityPanelProps> = ({
  simulationResult,
  selectedAssetId,
  onSelectAsset,
}) => {
  const [targetAssetId, setTargetAssetId] = useState<string>(selectedAssetId || '');
  const [whatIfMod, setWhatIfMod] = useState<string>('add_backup');
  const [whatIfVal, setWhatIfVal] = useState<number>(50);
  const [counterfactualResult, setCounterfactualResult] = useState<any | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  // Keep the inspector aligned with selections made on the map, graph, or
  // timeline.  Without this, the panel could show a stale causal chain.
  useEffect(() => {
    if (selectedAssetId) {
      setTargetAssetId(selectedAssetId);
      setCounterfactualResult(null);
    }
  }, [selectedAssetId]);

  if (!simulationResult) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <HelpCircle size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
        <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>No Active Cascade to Explain</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Run a cascade simulation first to generate deterministic causal chains and root-cause explanations.
        </p>
      </div>
    );
  }

  // Get list of impacted assets that have causal chains
  const impactedAssetIds = Object.keys(simulationResult.causal_chains);
  const currentAssetId = targetAssetId || (impactedAssetIds.length > 0 ? impactedAssetIds[0] : '');
  const currentChain = simulationResult.causal_chains[currentAssetId] || [];
  const currentAssetState = simulationResult.asset_states[currentAssetId];

  const handleRunCounterfactual = async () => {
    if (!currentAssetId) return;
    setIsEvaluating(true);
    try {
      const res = await runCounterfactual({
        assetId: currentAssetId,
        modification: whatIfMod,
        modificationValue: whatIfVal,
        failureScenario: simulationResult.initial_failures,
      });
      setCounterfactualResult(res);
    } catch (err) {
      console.error('Counterfactual failed:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="glass-panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">
            <span>🔍 "Why Did This Fail?" — Deterministic Causality Engine</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Trace propagation paths from root initiation down to downstream infrastructure degradation.
          </p>
        </div>

        {/* Asset Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Inspect Asset:</span>
          <select
            value={currentAssetId}
            onChange={(e) => {
              setTargetAssetId(e.target.value);
              onSelectAsset(e.target.value);
              setCounterfactualResult(null);
            }}
            style={{
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '0.35rem 0.75rem',
              fontSize: '0.8rem',
              minWidth: '220px',
            }}
          >
            {impactedAssetIds.length === 0 ? (
              <option value="">No impacted assets found</option>
            ) : (
              impactedAssetIds.map((aid) => {
                const state = simulationResult.asset_states[aid];
                return (
                  <option key={aid} value={aid}>
                    {state?.name || aid} ({state?.status || 'IMPACTED'})
                  </option>
                );
              })
            )}
          </select>
        </div>
      </div>

      {currentAssetId && currentAssetState ? (
        <div>
          {/* Asset Summary Banner */}
          <div
            style={{
              background: 'rgba(2, 6, 23, 0.6)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '1rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>{currentAssetState.name}</h3>
                <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  [{currentAssetId}]
                </span>
                <span className="badge badge-critical">{currentAssetState.status}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '0.25rem' }}>
                <strong>Direct Cause:</strong> {currentAssetState.failure_reason || currentAssetState.failure_cause || 'Cascade overload'}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Remaining Capacity</div>
              <div className="mono font-extrabold" style={{ fontSize: '1.4rem', color: '#ef4444' }}>
                {currentAssetState.operational_capacity.toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Causal Chain Breadcrumb Timeline */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <GitBranch size={16} color="#38bdf8" /> Propagation Path from Root Trigger:
            </h4>

            {currentChain.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {currentChain.map((link, index) => {
                  const isRoot = index === 0;
                  const isLeaf = index === currentChain.length - 1;

                  return (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.85rem',
                        background: isRoot
                          ? 'rgba(239, 68, 68, 0.15)'
                          : isLeaf
                          ? 'rgba(245, 158, 11, 0.15)'
                          : 'rgba(15, 23, 42, 0.7)',
                        border: `1px solid ${isRoot ? '#ef4444' : isLeaf ? '#f59e0b' : 'var(--border-subtle)'}`,
                        borderRadius: '8px',
                        padding: '0.75rem 1rem',
                      }}
                    >
                      <span
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: isRoot ? '#ef4444' : '#1e293b',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        {index + 1}
                      </span>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f8fafc' }}>
                            {link.asset_name}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            ({link.asset_type})
                          </span>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              background: '#334155',
                              color: '#94a3b8',
                              marginLeft: 'auto',
                            }}
                          >
                            Level {link.cascade_level} • +{link.timestamp}m
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                          {link.event} {link.capacity_change ? `(${link.capacity_change})` : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '1rem', background: 'rgba(2, 6, 23, 0.4)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                This asset was an initial root failure or experienced direct manual failure.
              </div>
            )}
          </div>

          {/* Counterfactual "What-If" Exploration */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(2, 6, 23, 0.8), rgba(15, 23, 42, 0.9))',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '10px',
              padding: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
              <Zap size={18} color="#38bdf8" />
              <h4 style={{ fontSize: '0.95rem', color: '#f8fafc' }}>
                Counterfactual "What-If" Analysis for {currentAssetState.name}
              </h4>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Test how a targeted hardening intervention on this specific asset would have changed the entire cascade outcome.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  What-If Modification:
                </label>
                <select
                  value={whatIfMod}
                  onChange={(e) => setWhatIfMod(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1e293b',
                    color: '#f8fafc',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    padding: '0.45rem',
                    fontSize: '0.8rem',
                  }}
                >
                  <option value="add_backup">Add Backup Auxiliary Power / Bypass</option>
                  <option value="increase_capacity">Expand Capacity (+50%)</option>
                  <option value="improve_condition">Improve Structural Condition (+30%)</option>
                  <option value="reduce_vulnerability">Reduce Environmental Vulnerability (-50%)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  Modification Magnitude: {whatIfVal}
                </label>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={whatIfVal}
                  onChange={(e) => setWhatIfVal(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#38bdf8' }}
                />
              </div>

              <button
                className="btn btn-primary"
                disabled={isEvaluating}
                onClick={handleRunCounterfactual}
              >
                {isEvaluating ? (
                  <span>Evaluating...</span>
                ) : (
                  <>
                    <RefreshCw size={14} />
                    <span>Run Counterfactual</span>
                  </>
                )}
              </button>
            </div>

            {/* Counterfactual Results Display */}
            {counterfactualResult && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                  <ShieldCheck size={18} color="#10b981" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#34d399' }}>
                    Resilience Improvement Detected!
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Baseline Impact</div>
                    <div className="mono" style={{ fontSize: '1.2rem', color: '#ef4444', fontWeight: 800 }}>
                      {counterfactualResult.baseline_impact}/100
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Counterfactual Impact</div>
                    <div className="mono" style={{ fontSize: '1.2rem', color: '#38bdf8', fontWeight: 800 }}>
                      {counterfactualResult.counterfactual_impact}/100
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Resilience Gain</div>
                    <div className="mono" style={{ fontSize: '1.2rem', color: '#10b981', fontWeight: 800 }}>
                      +{counterfactualResult.improvement_pct}%
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          Please select an impacted asset to trace its failure cause.
        </div>
      )}
    </div>
  );
};
