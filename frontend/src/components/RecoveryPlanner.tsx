import React, { useState, useEffect } from 'react';
import { SimulationResult, RecoveryPlan } from '../types';
import { simulateRecovery, executeRecovery } from '../api';
import { RefreshCw, Clock, DollarSign, Users, CheckCircle2, ArrowRight, Play, Wrench, ShieldCheck } from 'lucide-react';

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
      <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <RefreshCw size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
        <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>No Active Damage to Recover</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          All municipal infrastructure is operating at baseline. Simulate an infrastructure failure first to compute an optimal critical path recovery schedule.
        </p>
      </div>
    );
  }

  const speedOptions = [
    { label: 'Normal (1.0x)', val: 1.0 },
    { label: 'Accelerated (1.5x)', val: 1.5 },
    { label: 'Emergency Mobilization (2.0x)', val: 2.0 },
  ];

  const remainingCount = recoveryPlan?.recovery_order?.length || 0;
  const isFullyOperational = remainingCount === 0;

  return (
    <div className="glass-panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">
            <span>🔄 Post-Disaster Recovery & Restoration Sequencing</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Topologically ordered critical path restoration schedule prioritizing single points of failure and essential lifelines.
          </p>
        </div>

        {/* Speed Controls */}
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Crew Deployment:</span>
          {speedOptions.map((opt) => (
            <button
              key={opt.val}
              className={`btn btn-sm ${recoverySpeed === opt.val ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setRecoverySpeed(opt.val);
                fetchPlan(opt.val);
              }}
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
          background: 'rgba(2, 6, 23, 0.65)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '10px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status: </span>
          {isFullyOperational ? (
            <span style={{ color: '#10b981', fontWeight: 700 }}>✓ All Infrastructure Fully Restored</span>
          ) : (
            <strong style={{ color: '#f87171' }}>{remainingCount} Assets Awaiting Repair</strong>
          )}
          {simulationResult && (
            <span style={{ marginLeft: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Current Impact Score: <strong className="mono" style={{ color: '#38bdf8' }}>{simulationResult.impact_score.toFixed(1)}/100</strong>
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button
            className="btn btn-primary btn-sm"
            disabled={isExecuting || isFullyOperational}
            onClick={() => handleRestoreStep()}
          >
            <Wrench size={14} />
            <span>Restore Next Priority Asset</span>
          </button>
          <button
            className="btn btn-secondary btn-sm"
            disabled={isExecuting || isFullyOperational}
            onClick={handleRestoreAll}
          >
            <ShieldCheck size={14} />
            <span>Complete Full Network Recovery</span>
          </button>
        </div>
      </div>

      {/* Status Feedback Banner */}
      {recoveryStatusMsg && (
        <div className="alert-banner success" style={{ marginBottom: '1.25rem' }}>
          <CheckCircle2 size={18} />
          <span>{recoveryStatusMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: '#38bdf8' }}>
          Calculating critical path restoration dependencies...
        </div>
      ) : recoveryPlan ? (
        <div>
          {/* Recovery Overview KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="kpi-card cyan">
              <div className="kpi-label">
                <Clock size={14} /> Total Recovery Time
              </div>
              <div className="kpi-value">{recoveryPlan.total_recovery_time.toFixed(1)} hrs</div>
              <div className="kpi-subtext">~{(recoveryPlan.total_recovery_time / 24).toFixed(1)} days to complete</div>
            </div>

            <div className="kpi-card amber">
              <div className="kpi-label">
                <DollarSign size={14} /> Estimated Repair Cost
              </div>
              <div className="kpi-value">₹{recoveryPlan.total_cost.toFixed(1)} Cr</div>
              <div className="kpi-subtext">Cumulative emergency municipal expenditure</div>
            </div>

            <div className="kpi-card green">
              <div className="kpi-label">
                <Users size={14} /> Population Served
              </div>
              <div className="kpi-value">{simulationResult.affected_population.toLocaleString()}</div>
              <div className="kpi-subtext">Citizens restored upon plan completion</div>
            </div>

            <div className="kpi-card purple">
              <div className="kpi-label">
                <CheckCircle2 size={14} /> Restoration Stages
              </div>
              <div className="kpi-value">{recoveryPlan.recovery_order.length} Assets</div>
              <div className="kpi-subtext">Topologically sequenced without bottlenecks</div>
            </div>
          </div>

          {/* Sequential Restoration Schedule */}
          <h4 style={{ fontSize: '0.95rem', color: '#f8fafc', marginBottom: '0.75rem' }}>
            Sequential Asset Restoration Schedule
          </h4>

          {recoveryPlan.recovery_order.length > 0 ? (
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Seq #</th>
                    <th>Asset Name</th>
                    <th>Layer</th>
                    <th>Priority Score</th>
                    <th>Duration</th>
                    <th>Schedule Window</th>
                    <th>Repair Cost</th>
                    <th>Dependencies Cleared</th>
                    <th>Action</th>
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
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: '#0284c7',
                              color: '#fff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                            }}
                          >
                            {step.order}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          {aname}{' '}
                          <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            [{aid}]
                          </span>
                        </td>
                        <td>
                          <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#cbd5e1' }}>
                            {atype}
                          </span>
                        </td>
                        <td className="mono font-semibold" style={{ color: '#fbbf24' }}>
                          {typeof pscore === 'number' ? pscore.toFixed(1) : pscore}
                        </td>
                        <td className="mono">{step.repair_time} hrs</td>
                        <td className="mono" style={{ color: '#38bdf8' }}>
                          {step.start_time ?? 0}h → {step.end_time ?? step.repair_time}h
                        </td>
                        <td className="mono" style={{ color: '#34d399' }}>₹{costVal.toFixed(1)} Cr</td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {step.dependencies_cleared && step.dependencies_cleared.length > 0
                            ? step.dependencies_cleared.join(', ')
                            : 'None (Root)'}
                        </td>
                        <td>
                          <button
                            className="btn btn-secondary btn-sm"
                            disabled={isExecuting}
                            onClick={() => handleRestoreStep(step.order, aid)}
                            title={`Restore ${aname}`}
                          >
                            <Wrench size={12} /> Repair
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399' }}>
              ✓ All infrastructure assets have been repaired and returned to operational status.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
