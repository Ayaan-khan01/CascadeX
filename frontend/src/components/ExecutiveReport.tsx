import React from 'react';
import { SimulationResult, Asset, SystemMetrics } from '../types';
import { Printer, Download, AlertOctagon, FileText } from 'lucide-react';

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
    <div className="card" style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '3px solid var(--border-bold)',
          paddingBottom: '1.5rem',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.72rem', letterSpacing: '0.2em', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            METROPOLITAN AUDIT REGISTER // CLASSIFIED CONFIDENTIAL
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.03em', margin: 0, color: 'var(--text-primary)' }}>
            RESILIENCE AUDIT REPORT
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            Synthetic Metropolitan Area Infrastructure Stress Test & Cascading Vulnerability Assessment
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleDownloadJSON} style={{ fontWeight: 800 }}>
            <Download size={14} /> EXPORT JSON
          </button>
          <button className="btn btn-primary btn-sm" onClick={handlePrint} style={{ fontWeight: 800 }}>
            <Printer size={14} /> PRINT AUDIT
          </button>
        </div>
      </div>

      {/* Section 01: Executive Summary */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)' }}>01 //</span>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)' }}>
            EXECUTIVE SUMMARY & SYSTEMIC FINDINGS
          </h3>
        </div>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.75rem', maxWidth: '850px' }}>
          This automated municipal resilience audit synthesizes multi-layer graph topology analyses across 
          arterial transport networks, high-voltage electrical grid substations, hydraulic water distribution pipelines, and acute healthcare care facilities.
          The findings establish that failure at unhardened transport or utility bottlenecks propagates cross-sector, inducing secondary road gridlock and tertiary hospital power starvation.
        </p>

        {/* Resilience KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          <div className="kpi-card" style={{ border: spofAssets.length > 0 ? '2px solid #FF0000' : '1.5px solid var(--border-bold)' }}>
            <span className="kpi-bg-number" style={{ color: spofAssets.length > 0 ? 'rgba(255,0,0,0.15)' : 'var(--text-light-numeral)' }}>01</span>
            <div className="kpi-label" style={{ color: spofAssets.length > 0 ? '#FF0000' : 'var(--text-secondary)' }}>
              SINGLE POINTS OF FAILURE
            </div>
            <div className="kpi-value" style={{ color: spofAssets.length > 0 ? '#FF0000' : 'var(--text-primary)' }}>
              {spofAssets.length} ASSETS
            </div>
            <div className="kpi-subtext">Zero-redundancy bridges & key substations</div>
          </div>

          <div className="kpi-card">
            <span className="kpi-bg-number">02</span>
            <div className="kpi-label">HIGH-CRITICALITY ASSETS</div>
            <div className="kpi-value">{criticalAssets.length} ASSETS</div>
            <div className="kpi-subtext">Criticality score &ge; 70.0 / 100</div>
          </div>

          <div className="kpi-card">
            <span className="kpi-bg-number">03</span>
            <div className="kpi-label">STRESS TEST STATUS</div>
            <div className="kpi-value">
              {simulationResult ? `${simulationResult.impact_score.toFixed(0)}/100` : 'NOMINAL'}
            </div>
            <div className="kpi-subtext">
              {simulationResult ? simulationResult.scenario_name.toUpperCase() : 'All assets operational'}
            </div>
          </div>

          <div className="kpi-card">
            <span className="kpi-bg-number">04</span>
            <div className="kpi-label">DISRUPTED POPULATION</div>
            <div className="kpi-value">
              {simulationResult ? `${(simulationResult.affected_population / 1000000).toFixed(2)}M` : '0.00M'}
            </div>
            <div className="kpi-subtext">Metropolitan residents impacted</div>
          </div>
        </div>
      </div>

      {/* Section 02: SPOF Vulnerability Register */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#FF0000' }}>02 //</span>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)' }}>
            SINGLE POINT OF FAILURE (SPOF) VULNERABILITY REGISTER
          </h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Immediate disconnection or secondary infrastructure degradation occurs if any of the following unmitigated nodes experience failure:
        </p>

        <div style={{ overflowX: 'auto', border: '1.5px solid var(--border-bold)', boxShadow: 'var(--shadow-brutalist)', marginBottom: '2rem' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ASSET ID</th>
                <th>ASSET NAME</th>
                <th>TYPE</th>
                <th>CRITICALITY</th>
                <th>CONDITION</th>
                <th>POPULATION SERVED</th>
                <th>VULNERABILITY RATIONALE</th>
              </tr>
            </thead>
            <tbody>
              {spofAssets.slice(0, 8).map((a) => (
                <tr key={a.id}>
                  <td className="mono font-bold" style={{ color: '#FF0000' }}>{a.id}</td>
                  <td style={{ fontWeight: 800 }}>{a.name}</td>
                  <td>
                    <span style={{ border: '1px solid var(--border-bold)', padding: '0.15rem 0.45rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
                      {a.type}
                    </span>
                  </td>
                  <td className="mono font-bold">{a.criticality.toFixed(1)}</td>
                  <td className="mono">{a.condition.toFixed(0)}%</td>
                  <td className="mono">{a.population_served.toLocaleString()}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Critical bottleneck with zero topological bypass capacity within 5km radius.
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 03: Recommended Strategic Mitigations */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)' }}>03 //</span>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)' }}>
            STRATEGIC CAPITAL INTERVENTIONS (ROI RANKED)
          </h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          <div
            className="card"
            style={{
              padding: '1.5rem',
              boxShadow: 'var(--shadow-brutalist)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <span className="kpi-bg-number">01</span>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.5rem', position: 'relative', color: 'var(--text-primary)' }}>
              EAST CANAL BRIDGE (B03) REINFORCEMENT
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem', position: 'relative' }}>
              Capital: ₹45 CR • Deployment: 90 Days • Eliminates the most catastrophic single point of failure in the metropolitan corridor.
            </p>
            <span className="badge badge-operational" style={{ position: 'relative' }}>
              RESILIENCE ROI: +42% GAIN
            </span>
          </div>

          <div
            className="card"
            style={{
              padding: '1.5rem',
              boxShadow: 'var(--shadow-brutalist)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <span className="kpi-bg-number">02</span>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.5rem', position: 'relative', color: 'var(--text-primary)' }}>
              HOSPITAL COMPLEX DEDICATED MICROGRID
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem', position: 'relative' }}>
              Capital: ₹25 CR • Autonomous battery + solar isolation guarantees 100% ICU uptime during substation collapse.
            </p>
            <span className="badge badge-operational" style={{ position: 'relative' }}>
              RESILIENCE ROI: +31% GAIN
            </span>
          </div>

          <div
            className="card"
            style={{
              padding: '1.5rem',
              boxShadow: 'var(--shadow-brutalist)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <span className="kpi-bg-number">03</span>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.5rem', position: 'relative', color: 'var(--text-primary)' }}>
              RIVER BYPASS ARTERIAL ROAD EXPANSION
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem', position: 'relative' }}>
              Capital: ₹80 CR • Absorbs redirected traffic up to 150,000 PCU during emergency river corridor closures.
            </p>
            <span className="badge badge-operational" style={{ position: 'relative' }}>
              RESILIENCE ROI: +28% GAIN
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
