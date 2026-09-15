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
            <span>"WHY DID THIS FAIL?" — DETERMINISTIC CAUSALITY ENGINE</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Trace propagation paths from root initiation down to downstream infrastructure degradation.
          </p>
        </div>

        {/* Asset Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', color: '#000000' }}>Inspect Asset:</span>
          <select
            value={currentAssetId}
            onChange={(e) => {
              setTargetAssetId(e.target.value);
              onSelectAsset(e.target.value);
              setCounterfactualResult(null);
            }}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.78rem',
              fontWeight: 700,
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
              background: '#ffffff',
              border: '2px solid #000000',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.75rem',
              boxShadow: '4px 4px 0px #000000',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#000000', textTransform: 'uppercase' }}>
                  {currentAssetState.name}
                </h3>
                <span className="mono" style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 800 }}>
                  [{currentAssetId}]
                </span>
                <span className="badge badge-critical">{currentAssetState.status}</span>
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                <strong style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.74rem' }}>Direct Cause:</strong> {currentAssetState.failure_reason || currentAssetState.failure_cause || 'Cascade stress overload'}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.08em' }}>Remaining Capacity</div>
              <div className="mono font-extrabold" style={{ fontSize: '1.8rem', color: '#ff0000', fontWeight: 900 }}>
                {currentAssetState.operational_capacity.toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Causal Chain Breadcrumb Timeline */}
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <GitBranch size={16} color="var(--text-primary)" /> Propagation Path from Root Trigger:
            </h4>

            {currentChain.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {currentChain.map((link, index) => {
                  const isRoot = index === 0;

                  return (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        background: 'var(--bg-card)',
                        border: `1.5px solid ${isRoot ? '#ff0000' : 'var(--border-bold)'}`,
                        boxShadow: `3px 3px 0px ${isRoot ? '#ff0000' : 'var(--border-bold)'}`,
                        padding: '0.85rem 1.15rem',
                      }}
                    >
                      <span
                        style={{
                          width: '28px',
                          height: '28px',
                          background: isRoot ? '#ff0000' : 'var(--border-bold)',
                          color: isRoot ? '#ffffff' : 'var(--bg-main)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 900,
                          flexShrink: 0,
                        }}
                      >
                        0{index + 1}
                      </span>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 900, fontSize: '0.92rem', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                            {link.asset_name}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                            ({link.asset_type})
                          </span>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              padding: '0.15rem 0.45rem',
                              background: 'var(--border-bold)',
                              color: 'var(--bg-main)',
                              marginLeft: 'auto',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                            }}
                          >
                            Level {link.cascade_level} • +{link.timestamp}m
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          {link.event} {link.capacity_change ? `(${link.capacity_change})` : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '1rem', background: '#fafafa', border: '1px solid #000000', fontSize: '0.82rem', color: '#52525b' }}>
                This asset was an initial root failure or experienced direct manual failure.
              </div>
            )}
          </div>

          {/* Counterfactual "What-If" Exploration */}
          <div
            style={{
              background: '#ffffff',
              border: '2px solid #000000',
              padding: '1.5rem',
              boxShadow: '4px 4px 0px #000000',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
              <Zap size={18} color="#000000" />
              <h4 style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                Counterfactual "What-If" Analysis: {currentAssetState.name}
              </h4>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Test how a targeted hardening intervention on this specific node would have altered the cascade outcome across the synthetic metropolitan grid.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-primary)', display: 'block', marginBottom: '0.35rem' }}>
                  What-If Modification:
                </label>
                <select
                  value={whatIfMod}
                  onChange={(e) => setWhatIfMod(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                  }}
                >
                  <option value="add_backup">Add Auxiliary Power / Redundant Bypass</option>
                  <option value="increase_capacity">Expand Capacity (+50%)</option>
                  <option value="improve_condition">Improve Structural Condition (+30%)</option>
                  <option value="reduce_vulnerability">Reduce Environmental Vulnerability (-50%)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-primary)', display: 'block', marginBottom: '0.35rem' }}>
                  Magnitude: {whatIfVal}%
                </label>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={whatIfVal}
                  onChange={(e) => setWhatIfVal(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--border-bold)' }}
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
                  marginTop: '1.25rem',
                  padding: '1.25rem',
                  background: 'var(--bg-surface)',
                  border: '1.5px solid var(--border-bold)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  <ShieldCheck size={18} color="var(--text-primary)" />
                  <span style={{ fontWeight: 900, fontSize: '0.95rem', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                    Resilience Improvement Detected
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 800 }}>Baseline Impact</div>
                    <div className="mono" style={{ fontSize: '1.4rem', color: '#ff0000', fontWeight: 900 }}>
                      {counterfactualResult.baseline_impact}/100
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 800 }}>Counterfactual Impact</div>
                    <div className="mono" style={{ fontSize: '1.4rem', color: 'var(--text-primary)', fontWeight: 900 }}>
                      {counterfactualResult.counterfactual_impact}/100
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 800 }}>Resilience Gain</div>
                    <div className="mono" style={{ fontSize: '1.4rem', color: 'var(--text-primary)', fontWeight: 900 }}>
                      +{counterfactualResult.improvement_pct}%
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em' }}>
          Select an impacted asset from the dropdown or map to trace its causal chain.
        </div>
      )}
    </div>
  );
};
