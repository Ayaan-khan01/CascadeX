import React, { useState, useEffect } from 'react';
import { SimulationResult, RecoveryPlan } from '../types';
import { simulateRecovery, executeRecovery } from '../api';
import { RefreshCw, CheckCircle2, Wrench, ShieldCheck } from 'lucide-react';

interface RecoveryPlannerProps {
  simulationResult: SimulationResult | null;
  onUpdateSimulationResult?: (result: SimulationResult) => void;
}

export const RecoveryPlanner: React.FC<RecoveryPlannerProps> = ({
  simulationResult,
  onUpdateSimulationResult,
}) => {
  const [recoveryPlan, setRecoveryPlan] = useState<RecoveryPlan | null>(null);
  const [recoverySpeed, setRecoverySpeed] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [recoveryStatusMsg, setRecoveryStatusMsg] = useState<string | null>(null);

  const fetchPlan = async (speed: number) => {
    if (!simulationResult) return;
    setIsLoading(true);
    try {
      const plan = await simulateRecovery({
        simulationResult,
        recoverySpeed: speed,
      });
      setRecoveryPlan(plan);
    } catch (err) {
      console.error('Failed to simulate recovery:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (simulationResult) {
      fetchPlan(recoverySpeed);
    }
  }, [simulationResult]);

  // Execute recovery for a single asset or next priority
  const handleRestoreStep = async (stepNumber?: number, assetId?: string) => {
    if (!simulationResult) return;
    setIsExecuting(true);
    try {
      const res = await executeRecovery({
        simulationResult,
        stepNumber,
        assetIds: assetId ? [assetId] : undefined,
        recoverySpeed,
      });
      setRecoveryStatusMsg(res.message);
      if (onUpdateSimulationResult) {
        onUpdateSimulationResult(res.simulation_result);
      }
      setRecoveryPlan(res.next_recovery_plan);
    } catch (err: any) {
      console.error('Recovery execution failed:', err);
      setRecoveryStatusMsg(`Recovery action error: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // Execute full restoration of all assets
  const handleRestoreAll = async () => {
    if (!simulationResult) return;
    setIsExecuting(true);
    try {
      const res = await executeRecovery({
        simulationResult,
        restoreAll: true,
        recoverySpeed,
      });
      setRecoveryStatusMsg(res.message);
      if (onUpdateSimulationResult) {
        onUpdateSimulationResult(res.simulation_result);
      }
      setRecoveryPlan(res.next_recovery_plan);
    } catch (err: any) {
      console.error('Full recovery execution failed:', err);
      setRecoveryStatusMsg(`Full recovery error: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  if (!simulationResult) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <RefreshCw size={44} style={{ color: 'var(--text-primary)', margin: '0 auto 1.25rem', strokeWidth: 1.5 }} />
        <h3 style={{ fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
          NO ACTIVE DISRUPTIONS TO RESTORE
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '550px', margin: '0 auto' }}>
          All municipal infrastructure is currently operating at nominal baseline. Launch an incident or stress scenario from the Command panel to compute an optimal critical-path restoration sequence.
        </p>
      </div>
    );
  }

  const speedOptions = [
    { label: 'NORMAL (1.0X)', val: 1.0 },
    { label: 'ACCELERATED (1.5X)', val: 1.5 },
    { label: 'EMERGENCY MOBILIZATION (2.0X)', val: 2.0 },
  ];

  const remainingCount = recoveryPlan?.recovery_order?.length || 0;
  const isFullyOperational = remainingCount === 0;

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
            CRITICAL PATH SCHEDULING
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.03em', margin: 0, color: 'var(--text-primary)' }}>
            RECOVERY & RESTORATION SEQUENCER
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem', maxWidth: '650px' }}>
            Topologically ordered critical path restoration schedule resolving upstream dependencies, SPOFs, and vital lifelines.
          </p>
        </div>

        {/* Speed Controls */}
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>
            CREW SPEED:
          </span>
          {speedOptions.map((opt) => (
            <button
              key={opt.val}
              className={`btn btn-sm ${recoverySpeed === opt.val ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setRecoverySpeed(opt.val);
                fetchPlan(opt.val);
              }}
              style={{ fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.05em' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action Execution Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-surface)',
          border: '1.5px solid var(--border-bold)',
          boxShadow: 'var(--shadow-brutalist)',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', display: 'block' }}>
              REPAIR STATUS
            </span>
            {isFullyOperational ? (
              <span style={{ color: 'var(--text-primary)', fontWeight: 900, fontSize: '1.05rem' }}>
                ALL INFRASTRUCTURE FULLY RESTORED
              </span>
            ) : (
              <span style={{ color: '#FF0000', fontWeight: 900, fontSize: '1rem' }}>
                {remainingCount} ASSETS AWAITING RECONSTRUCTION
              </span>
            )}
          </div>

          {simulationResult && (
            <>
              <div style={{ width: '1px', height: '30px', background: 'var(--border-subtle)' }} />
              <div>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', display: 'block' }}>
                  CURRENT DAMAGE IMPACT
                </span>
                <span className="mono" style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                  {simulationResult.impact_score.toFixed(1)} / 100
                </span>
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button
            className="btn btn-primary btn-sm"
            disabled={isExecuting || isFullyOperational}
            onClick={() => handleRestoreStep()}
            style={{ fontWeight: 800, padding: '0.6rem 1.2rem' }}
          >
            <Wrench size={14} />
            <span>RESTORE NEXT PRIORITY ASSET</span>
          </button>
          <button
            className="btn btn-secondary btn-sm"
            disabled={isExecuting || isFullyOperational}
            onClick={handleRestoreAll}
            style={{ fontWeight: 800, padding: '0.6rem 1.2rem' }}
          >
            <ShieldCheck size={14} />
            <span>RESTORE ALL ASSETS</span>
          </button>
        </div>
      </div>

      {/* Status Feedback Banner */}
      {recoveryStatusMsg && (
        <div
          style={{
            background: 'var(--border-bold)',
            color: 'var(--bg-main)',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.85rem',
            fontWeight: 800,
            letterSpacing: '0.05em',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{recoveryStatusMsg.toUpperCase()}</span>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-primary)', fontWeight: 800, letterSpacing: '0.1em' }}>
          COMPUTING TOPOLOGICAL RESTORATION PATH...
        </div>
      ) : recoveryPlan ? (
        <div>
          {/* Recovery Overview KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            <div className="kpi-card" style={{ position: 'relative' }}>
              <span className="kpi-bg-number">01</span>
              <div className="kpi-label">TOTAL DOWNTIME</div>
              <div className="kpi-value">{recoveryPlan.total_recovery_time.toFixed(1)} HRS</div>
              <div className="kpi-subtext">~{(recoveryPlan.total_recovery_time / 24).toFixed(1)} days to complete</div>
            </div>

            <div className="kpi-card" style={{ position: 'relative' }}>
              <span className="kpi-bg-number">02</span>
              <div className="kpi-label">ESTIMATED REPAIR BUDGET</div>
              <div className="kpi-value">₹{recoveryPlan.total_cost.toFixed(1)} CR</div>
              <div className="kpi-subtext">Cumulative emergency municipal allocation</div>
            </div>

            <div className="kpi-card" style={{ position: 'relative' }}>
              <span className="kpi-bg-number">03</span>
              <div className="kpi-label">POPULATION RESTORED</div>
              <div className="kpi-value">{simulationResult.affected_population.toLocaleString()}</div>
              <div className="kpi-subtext">Citizens restored upon completion</div>
            </div>

            <div className="kpi-card" style={{ position: 'relative' }}>
              <span className="kpi-bg-number">04</span>
              <div className="kpi-label">STAGES IN QUEUE</div>
              <div className="kpi-value">{recoveryPlan.recovery_order.length} ASSETS</div>
              <div className="kpi-subtext">Sequenced without upstream deadlocks</div>
            </div>
          </div>

          {/* Sequential Restoration Schedule */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)' }}>
              SEQUENTIAL ASSET RESTORATION SCHEDULE
            </h4>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>
              PRIORITY ORDERED
            </span>
          </div>

          {recoveryPlan.recovery_order.length > 0 ? (
            <div style={{ overflowX: 'auto', border: '1.5px solid var(--border-bold)', boxShadow: 'var(--shadow-brutalist)' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>SEQ</th>
                    <th>ASSET NAME</th>
                    <th>INFRA LAYER</th>
                    <th>PRIORITY SCORE</th>
                    <th>DURATION</th>
                    <th>WINDOW</th>
                    <th>REPAIR COST</th>
                    <th>DEPENDENCIES</th>
                    <th style={{ textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {recoveryPlan.recovery_order.map((step) => {
                    const aid = step.asset_id || (step as any).id;
                    const aname = step.asset_name || (step as any).name;
                    const atype = step.asset_type || (step as any).type;
                    const pscore = step.priority_score ?? (step as any).priority ?? 0;
                    const costVal = step.cost ?? 5.0;

                    return (
                      <tr key={aid}>
                        <td>
                          <span
                            style={{
                              width: '26px',
                              height: '26px',
                              background: 'var(--border-bold)',
                              color: 'var(--bg-main)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 900,
                              fontSize: '0.78rem',
                            }}
                          >
                            {step.order}
                          </span>
                        </td>
                        <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                          {aname}{' '}
                          <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            [{aid}]
                          </span>
                        </td>
                        <td>
                          <span style={{ border: '1px solid var(--border-bold)', padding: '0.15rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
                            {atype}
                          </span>
                        </td>
                        <td className="mono font-bold" style={{ color: 'var(--text-primary)' }}>
                          {typeof pscore === 'number' ? pscore.toFixed(1) : pscore}
                        </td>
                        <td className="mono">{step.repair_time}h</td>
                        <td className="mono" style={{ fontWeight: 700 }}>
                          {step.start_time ?? 0}h → {step.end_time ?? step.repair_time}h
                        </td>
                        <td className="mono font-bold">₹{costVal.toFixed(1)} CR</td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {step.dependencies_cleared && step.dependencies_cleared.length > 0
                            ? step.dependencies_cleared.join(', ')
                            : 'ROOT (INDEPENDENT)'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            disabled={isExecuting}
                            onClick={() => handleRestoreStep(step.order, aid)}
                            style={{ fontWeight: 800, fontSize: '0.72rem', padding: '0.35rem 0.75rem' }}
                          >
                            REPAIR
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '2.5rem', textAlign: 'center', background: 'var(--bg-surface)', border: '1.5px solid var(--border-bold)', fontWeight: 800, letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
              ALL INFRASTRUCTURE ASSETS HAVE BEEN REPAIRED AND RETURNED TO NOMINAL CAPACITY.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
