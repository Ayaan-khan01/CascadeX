import React from 'react';
import { SimulationResult, Asset, SystemMetrics } from '../types';
import { Printer, Download, ShieldCheck, AlertOctagon, FileText, CheckCircle } from 'lucide-react';

interface ExecutiveReportProps {
  simulationResult: SimulationResult | null;
  assets: Asset[];
  metrics: SystemMetrics | null;
}

export const ExecutiveReport: React.FC<ExecutiveReportProps> = ({
  simulationResult,
  assets,
  metrics,
}) => {
  const spofAssets = assets.filter((a) => a.is_spof);
  const criticalAssets = assets.filter((a) => a.criticality >= 70);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      system_metrics: metrics,
      simulation_results: simulationResult,
      spof_inventory: spofAssets.map((a) => ({ id: a.id, name: a.name, type: a.type, criticality: a.criticality })),
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cascadex_resilience_audit_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div className="panel-header" style={{ borderBottom: '2px solid var(--border-glow)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileText size={22} color="#38bdf8" />
            <h2 style={{ fontSize: '1.35rem', color: '#fff' }}>
              Municipal Infrastructure Resilience Audit Report
            </h2>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Synthetic Metropolitan Area Infrastructure Stress Test & Cascading Vulnerability Assessment
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleDownloadJSON}>
            <Download size={14} /> Export JSON
          </button>
          <button className="btn btn-primary btn-sm" onClick={handlePrint}>
            <Printer size={14} /> Print Audit
          </button>
        </div>
      </div>

      {/* Audit Executive Summary */}
      <div style={{ padding: '1rem 0' }}>
        <h3 style={{ fontSize: '1.05rem', color: '#38bdf8', marginBottom: '0.75rem' }}>
          1. Executive Summary & Core Findings
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          This automated resilience audit synthesizes multi-layer graph topology analyses across 
          transport, electrical power distribution, hydraulic water supply, and acute emergency care facilities.
          The evaluation reveals critical interdependencies where failure at single transport or utility junctions
          propagates across organizational boundaries, inducing secondary road overloads and tertiary hospital isolation.
        </p>

        {/* Resilience KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="kpi-card red">
            <div className="kpi-label">Single Points of Failure</div>
            <div className="kpi-value">{spofAssets.length} Assets</div>
            <div className="kpi-subtext">Zero-redundancy bridge & power corridors</div>
          </div>

          <div className="kpi-card amber">
            <div className="kpi-label">High-Criticality Assets</div>
            <div className="kpi-value">{criticalAssets.length} Assets</div>
            <div className="kpi-subtext">Criticality rating &ge; 70.0 / 100</div>
          </div>

          <div className="kpi-card cyan">
            <div className="kpi-label">Simulation Status</div>
            <div className="kpi-value">
              {simulationResult ? `${simulationResult.impact_score.toFixed(0)}/100` : 'Baseline'}
            </div>
            <div className="kpi-subtext">
              {simulationResult ? `${simulationResult.scenario_name}` : 'All assets operational'}
            </div>
          </div>

          <div className="kpi-card purple">
            <div className="kpi-label">Population Impact</div>
            <div className="kpi-value">
              {simulationResult ? `${(simulationResult.affected_population / 1000000).toFixed(2)}M` : '0'}
            </div>
            <div className="kpi-subtext">Citizens facing service disruptions</div>
          </div>
        </div>

        {/* SPOF Inventory Section */}
        <h3 style={{ fontSize: '1.05rem', color: '#ef4444', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <AlertOctagon size={18} /> 2. Single Point of Failure (SPOF) Vulnerability Register
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
          Any unscheduled downtime in the following assets guarantees immediate network disconnect or direct secondary service degradation:
        </p>

        <table className="data-table" style={{ marginBottom: '1.75rem' }}>
          <thead>
            <tr>
              <th>Asset ID</th>
              <th>Asset Name</th>
              <th>Type</th>
              <th>Criticality</th>
              <th>Condition</th>
              <th>Population Served</th>
              <th>Vulnerability Rationale</th>
            </tr>
          </thead>
          <tbody>
            {spofAssets.slice(0, 8).map((a) => (
              <tr key={a.id}>
                <td className="mono font-bold" style={{ color: '#ef4444' }}>{a.id}</td>
                <td style={{ fontWeight: 600 }}>{a.name}</td>
                <td>{a.type}</td>
                <td className="mono font-bold" style={{ color: '#fbbf24' }}>{a.criticality.toFixed(1)}</td>
                <td className="mono">{a.condition.toFixed(0)}%</td>
                <td className="mono">{a.population_served.toLocaleString()}</td>
                <td style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                  Critical arterial crossing with no alternate bypass route within 5km radius.
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Recommended Strategic Mitigations */}
        <h3 style={{ fontSize: '1.05rem', color: '#10b981', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <ShieldCheck size={18} /> 3. High-Priority Capital Interventions (ROI Ranked)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'rgba(2, 6, 23, 0.6)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '1rem' }}>
            <h4 style={{ color: '#34d399', fontSize: '0.95rem', marginBottom: '0.35rem' }}>
              1. East Canal Bridge (B03) Seismic & Foundation Reinforcement
            </h4>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
              Investment: ₹45 Cr • Est. Implementation: 90 Days • Eliminates highest-scoring metropolitan SPOF.
            </p>
            <span className="badge badge-operational">Resilience ROI: +42% Gain</span>
          </div>

          <div style={{ background: 'rgba(2, 6, 23, 0.6)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '1rem' }}>
            <h4 style={{ color: '#34d399', fontSize: '0.95rem', marginBottom: '0.35rem' }}>
              2. Hospital Complex Auxiliary Island Microgrid
            </h4>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
              Investment: ₹25 Cr • Autonomous solar + battery storage prevents ICU power interruptions.
            </p>
            <span className="badge badge-operational">Resilience ROI: +31% Gain</span>
          </div>

          <div style={{ background: 'rgba(2, 6, 23, 0.6)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '1rem' }}>
            <h4 style={{ color: '#34d399', fontSize: '0.95rem', marginBottom: '0.35rem' }}>
              3. River Bypass Arterial Road Link
            </h4>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
              Investment: ₹80 Cr • Absorbs redistributed traffic up to 150,000 PCU during bridge maintenance.
            </p>
            <span className="badge badge-operational">Resilience ROI: +28% Gain</span>
          </div>
        </div>
      </div>
    </div>
  );
};
