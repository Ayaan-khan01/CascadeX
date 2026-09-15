import React, { useState, useEffect } from 'react';
import {
  Asset,
  NetworkData,
  SystemMetrics,
  Scenario,
  SimulationResult,
} from './types';
import {
  fetchAssets,
  fetchNetwork,
  fetchMetrics,
  fetchScenarios,
  simulateFailure,
  simulateScenario,
} from './api';

import { MapView } from './components/MapView';
import { NetworkView } from './components/NetworkView';
import { ScenarioLab } from './components/ScenarioLab';
import { CascadeTimeline } from './components/CascadeTimeline';
import { ExplainabilityPanel } from './components/ExplainabilityPanel';
import { InterventionPlanner } from './components/InterventionPlanner';
import { RecoveryPlanner } from './components/RecoveryPlanner';
import { CriticalityRanking } from './components/CriticalityRanking';
import { ExecutiveReport } from './components/ExecutiveReport';

import {
  Activity,
  Layers,
  MapPin,
  Clock,
  HelpCircle,
  FlaskConical,
  Shield,
  RefreshCw,
  FileText,
  AlertTriangle,
  RotateCcw,
  Play,
  HeartPulse,
  Flame,
  Zap,
  Sun,
  Moon,
} from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Theme state with localStorage persistence
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('cascadex_theme');
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cascadex_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Initial load
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [assetsData, netData, metricsData, scenariosData] = await Promise.all([
        fetchAssets(),
        fetchNetwork(),
        fetchMetrics(),
        fetchScenarios(),
      ]);
      setAssets(assetsData);
      setNetworkData(netData);
      setMetrics(metricsData);
      setScenarios(scenariosData);
      if (assetsData.length > 0 && !selectedAssetId) {
        // default select East Canal Bridge B03 (a major SPOF) or first asset
        const spof = assetsData.find((a) => a.id === 'B03') || assetsData[0];
        setSelectedAssetId(spof.id);
      }
    } catch (err: any) {
      console.error('Error loading initial data:', err);
      setStatusMessage('Failed to connect to CascadeX backend. Ensure backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Trigger asset failure simulation
  const handleSimulateAssetFailure = async (assetId: string) => {
    setIsSimulating(true);
    setActiveScenarioId(null);
    try {
      const asset = assets.find((a) => a.id === assetId);
      const res = await simulateFailure({
        assetIds: [assetId],
        scenarioName: `${asset?.name || assetId} Failure`,
      });
      setSimulationResult(res);
      setCurrentStepIndex(res.events.length - 1);
      setSelectedAssetId(assetId);
      setActiveTab('timeline'); // switch to timeline to visualize cascade
    } catch (err: any) {
      console.error('Simulation error:', err);
      setStatusMessage(`Simulation error: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  // Run predefined scenario
  const handleRunScenario = async (scenarioId: string) => {
    setIsSimulating(true);
    setActiveScenarioId(scenarioId);
    try {
      const res = await simulateScenario(scenarioId);
      setSimulationResult(res);
      setCurrentStepIndex(res.events.length - 1);
      if (res.initial_failures && res.initial_failures.length > 0) {
        setSelectedAssetId(res.initial_failures[0]);
      }
      setActiveTab('timeline');
    } catch (err: any) {
      console.error('Scenario simulation error:', err);
      setStatusMessage(`Scenario error: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  // Reset simulation back to operational baseline
  const handleResetSystem = () => {
    setSimulationResult(null);
    setActiveScenarioId(null);
    setCurrentStepIndex(0);
    loadInitialData();
  };

  // Compute live system status
  const isCascadeActive = simulationResult !== null && simulationResult.impact_score > 0;
  const systemHealth = simulationResult
    ? Math.max(0, 100 - simulationResult.impact_score).toFixed(0)
    : '100';

  const assetStates = simulationResult ? simulationResult.asset_states : undefined;

  return (
    <div className="app-container">
      {/* Top Minimalist Header */}
      <header className="header">
        <div className="logo-section">
          <div className="logo-badge">
            <Flame size={15} />
            <span>CX</span>
          </div>
          <div>
            <div className="brand-title">CascadeX // Engine</div>
            <div className="brand-subtitle">Urban Infrastructure Failure & Resilience Simulator</div>
          </div>
        </div>

        {/* Navigation Tabs - Tracked Minimalist */}
        <nav className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <Activity size={14} /> Command
          </button>
          <button
            className={`nav-tab ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => setActiveTab('map')}
          >
            <MapPin size={14} /> City Map
          </button>
          <button
            className={`nav-tab ${activeTab === 'network' ? 'active' : ''}`}
            onClick={() => setActiveTab('network')}
          >
            <Layers size={14} /> Topology
          </button>
          <button
            className={`nav-tab ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            <Clock size={14} /> Timeline
          </button>
          <button
            className={`nav-tab ${activeTab === 'explain' ? 'active' : ''}`}
            onClick={() => setActiveTab('explain')}
          >
            <HelpCircle size={14} /> Why Failed
          </button>
          <button
            className={`nav-tab ${activeTab === 'scenarios' ? 'active' : ''}`}
            onClick={() => setActiveTab('scenarios')}
          >
            <FlaskConical size={14} /> Scenarios
          </button>
          <button
            className={`nav-tab ${activeTab === 'criticality' ? 'active' : ''}`}
            onClick={() => setActiveTab('criticality')}
          >
            <AlertTriangle size={14} /> Criticality
          </button>
          <button
            className={`nav-tab ${activeTab === 'interventions' ? 'active' : ''}`}
            onClick={() => setActiveTab('interventions')}
          >
            <Shield size={14} /> Resilience
          </button>
          <button
            className={`nav-tab ${activeTab === 'recovery' ? 'active' : ''}`}
            onClick={() => setActiveTab('recovery')}
          >
            <RefreshCw size={14} /> Recovery
          </button>
          <button
            className={`nav-tab ${activeTab === 'report' ? 'active' : ''}`}
            onClick={() => setActiveTab('report')}
          >
            <FileText size={14} /> Audit
          </button>
        </nav>

        {/* Header Right Actions */}
        <div className="header-actions">
          <button
            className="header-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            <span>{theme === 'light' ? 'DARK MODE' : 'LIGHT MODE'}</span>
          </button>

          <button
            className="header-btn"
            onClick={handleResetSystem}
            title="Reset system to 100% operational baseline"
          >
            <RotateCcw size={14} />
            <span>RESET</span>
          </button>
        </div>
      </header>

      {/* Main Body Content */}
      <main className="main-content">
        {/* Hero Statement Section on Command Center */}
        {activeTab === 'dashboard' && (
          <div className="hero-statement-section">
            <div className="hero-giant-title">
              <div>FAILURE</div>
              <div>IS <span className="text-stroke">SYSTEMIC</span></div>
            </div>
            <div className="hero-description-row">
              <p className="hero-subtext">
                Multi-layer deterministic failure simulation across interdependent power grids, water treatment facilities, transit links, and emergency hospitals.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => handleSimulateAssetFailure('B03')}
                >
                  Simulate Bridge B03 [SPOF] →
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setActiveTab('scenarios')}
                >
                  Explore 10 Scenarios
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Cascade Alert Banner if simulation is active */}
        {simulationResult && (
          <div className="alert-banner danger">
            <AlertTriangle size={22} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 900, marginBottom: '0.2rem' }}>
                Active Cascade: {simulationResult.scenario_name}
              </div>
              <span style={{ fontSize: '0.84rem' }}>
                Impact Score: <strong>{simulationResult.impact_score.toFixed(1)}/100</strong> •{' '}
                {simulationResult.affected_population.toLocaleString()} citizens affected •{' '}
                {simulationResult.hospital_metrics.affected} hospitals compromised •{' '}
                {simulationResult.emergency_metrics.affected} emergency stations delayed.
              </span>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveTab('timeline')}
              style={{ flexShrink: 0 }}
            >
              Inspect Timeline →
            </button>
          </div>
        )}

        {/* Global KPI Metrics Row - With Giant Background Numerals */}
        <div className="kpi-grid">
          <div className={`kpi-card ${Number(systemHealth) < 70 ? 'red' : ''}`}>
            <span className="kpi-bg-number">01</span>
            <div className="kpi-content">
              <div className="kpi-label">
                <HeartPulse size={13} /> System Health
              </div>
              <div className="kpi-value">{systemHealth}%</div>
              <div className="kpi-subtext">
                {isCascadeActive ? 'Compromised by cascade' : 'Operational baseline'}
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <span className="kpi-bg-number">02</span>
            <div className="kpi-content">
              <div className="kpi-label">
                <Layers size={13} /> Monitored Assets
              </div>
              <div className="kpi-value">{assets.length}</div>
              <div className="kpi-subtext">
                {networkData?.edges.length || 0} Interdependent connections
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <span className="kpi-bg-number">03</span>
            <div className="kpi-content">
              <div className="kpi-label">
                <AlertTriangle size={13} /> Critical SPOFs
              </div>
              <div className="kpi-value">
                {assets.filter((a) => a.is_spof).length}
              </div>
              <div className="kpi-subtext">Zero-redundancy choke points</div>
            </div>
          </div>

          <div className="kpi-card">
            <span className="kpi-bg-number">04</span>
            <div className="kpi-content">
              <div className="kpi-label">
                <Zap size={13} /> Population Served
              </div>
              <div className="kpi-value">
                {metrics ? `${(metrics.total_population_served / 1000000).toFixed(1)}M` : '3.8M'}
              </div>
              <div className="kpi-subtext">Synthetic metropolitan area</div>
            </div>
          </div>

          <div className={`kpi-card ${simulationResult && simulationResult.impact_score > 0 ? 'red' : ''}`}>
            <span className="kpi-bg-number">05</span>
            <div className="kpi-content">
              <div className="kpi-label">
                <Flame size={13} /> Impact Score
              </div>
              <div className="kpi-value">
                {simulationResult ? simulationResult.impact_score.toFixed(1) : '0.0'}
              </div>
              <div className="kpi-subtext">
                {simulationResult ? `${simulationResult.total_events} events generated` : 'No cascade active'}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Views */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-grid">
            {/* Left: Quick Interactive Map */}
            <div className="dashboard-left-col">
              <MapView
                assets={assets}
                edges={networkData ? (networkData.edges as any) : []}
                selectedAssetId={selectedAssetId}
                onSelectAsset={setSelectedAssetId}
                onSimulateFailure={handleSimulateAssetFailure}
                assetStates={assetStates}
                theme={theme}
              />
            </div>

            {/* Right: Quick Action Hub */}
            <div className="dashboard-right-col">
              {/* Quick Failure Launcher */}
              <div className="glass-panel">
                <div className="panel-title" style={{ marginBottom: '0.85rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 900, letterSpacing: '0.04em' }}>01 // INFRASTRUCTURE STRESS TEST</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Trigger failure on any critical infrastructure node to witness live cascade propagation.
                </p>

                <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <select
                    value={selectedAssetId || ''}
                    onChange={(e) => setSelectedAssetId(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: '180px',
                    }}
                  >
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.type} • Crit: {a.criticality.toFixed(1)} {a.is_spof ? '• SPOF' : ''})
                      </option>
                    ))}
                  </select>

                  <button
                    className="btn btn-danger"
                    disabled={isSimulating || !selectedAssetId}
                    onClick={() => selectedAssetId && handleSimulateAssetFailure(selectedAssetId)}
                    style={{ whiteSpace: 'nowrap', fontWeight: 800 }}
                  >
                    <Play size={13} /> SIMULATE FAILURE
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleSimulateAssetFailure('B03')}
                    style={{ fontWeight: 800, fontSize: '0.72rem' }}
                  >
                    BRIDGE B03
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleSimulateAssetFailure('P01')}
                    style={{ fontWeight: 800, fontSize: '0.72rem' }}
                  >
                    POWER P01
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleRunScenario('SC06')}
                    style={{ fontWeight: 800, fontSize: '0.72rem' }}
                  >
                    COMPOUND B03 + P01
                  </button>
                </div>
              </div>

              {/* Asset Distribution */}
              <div className="glass-panel">
                <div className="panel-title" style={{ marginBottom: '0.85rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 900, letterSpacing: '0.04em' }}>02 // ASSET INVENTORY BREAKDOWN</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.75rem' }}>
                  {metrics?.by_type && Object.entries(metrics.by_type).map(([key, count]) => (
                    <div key={key} style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', padding: '0.75rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>{key}</div>
                      <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 900, color: '#000000' }}>{count}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Scenario Lab Preview */}
              <div className="glass-panel">
                <div className="panel-header" style={{ marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span className="panel-title" style={{ fontSize: '0.9rem', fontWeight: 900, letterSpacing: '0.04em' }}>03 // RECOMMENDED FAILURE SCENARIOS</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('scenarios')} style={{ fontWeight: 800 }}>
                    VIEW ALL 10 →
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {scenarios.slice(0, 3).map((s, idx) => (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#f8fafc',
                        border: '1px solid var(--border-subtle)',
                        padding: '0.75rem 0.85rem',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.1rem', color: '#a1a1aa' }}>
                          0{idx + 1}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#000000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{s.category}</div>
                        </div>
                      </div>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleRunScenario(s.id)}
                        style={{ flexShrink: 0 }}
                      >
                        Run
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <MapView
            assets={assets}
            edges={networkData ? (networkData.edges as any) : []}
            selectedAssetId={selectedAssetId}
            onSelectAsset={setSelectedAssetId}
            onSimulateFailure={handleSimulateAssetFailure}
            assetStates={assetStates}
            wrapperHeight="720px"
            theme={theme}
          />
        )}

        {activeTab === 'network' && (
          <NetworkView
            networkData={networkData}
            selectedAssetId={selectedAssetId}
            onSelectAsset={setSelectedAssetId}
            onSimulateFailure={handleSimulateAssetFailure}
            assetStates={assetStates}
            theme={theme}
          />
        )}

        {activeTab === 'timeline' && (
          <CascadeTimeline
            simulationResult={simulationResult}
            onSelectAsset={setSelectedAssetId}
            currentStepIndex={currentStepIndex}
            onStepChange={setCurrentStepIndex}
          />
        )}

        {activeTab === 'explain' && (
          <ExplainabilityPanel
            simulationResult={simulationResult}
            selectedAssetId={selectedAssetId}
            onSelectAsset={setSelectedAssetId}
          />
        )}

        {activeTab === 'scenarios' && (
          <ScenarioLab
            scenarios={scenarios}
            onRunScenario={handleRunScenario}
            isLoading={isSimulating}
            activeScenarioId={activeScenarioId}
          />
        )}

        {activeTab === 'criticality' && (
          <CriticalityRanking
            assets={assets}
            onSelectAsset={setSelectedAssetId}
            onSimulateFailure={handleSimulateAssetFailure}
          />
        )}

        {activeTab === 'interventions' && (
          <InterventionPlanner
            simulationResult={simulationResult}
          />
        )}

        {activeTab === 'recovery' && (
          <RecoveryPlanner
            simulationResult={simulationResult}
            onUpdateSimulationResult={setSimulationResult}
          />
        )}

        {activeTab === 'report' && (
          <ExecutiveReport
            simulationResult={simulationResult}
            assets={assets}
            metrics={metrics}
          />
        )}
      </main>
    </div>
  );
};

export default App;
