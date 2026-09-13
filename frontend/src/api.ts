import {
  Asset,
  NetworkData,
  SystemMetrics,
  Scenario,
  SimulationResult,
  Intervention,
  InterventionEvaluation,
  BudgetOptimizationResult,
  RecoveryPlan,
} from './types';

const API_BASE = '/api';

export async function fetchHealth(): Promise<{ status: string; assets: number; edges: number }> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchAssets(): Promise<Asset[]> {
  const res = await fetch(`${API_BASE}/assets`);
  if (!res.ok) throw new Error(`Failed to fetch assets: ${res.statusText}`);
  return res.json();
}

export async function fetchAsset(id: string): Promise<Asset> {
  const res = await fetch(`${API_BASE}/assets/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch asset ${id}: ${res.statusText}`);
  return res.json();
}

export async function fetchNetwork(): Promise<NetworkData> {
  const res = await fetch(`${API_BASE}/network`);
  if (!res.ok) throw new Error(`Failed to fetch network: ${res.statusText}`);
  return res.json();
}

export async function fetchMetrics(): Promise<SystemMetrics> {
  const res = await fetch(`${API_BASE}/metrics`);
  if (!res.ok) throw new Error(`Failed to fetch metrics: ${res.statusText}`);
  return res.json();
}

export async function fetchCriticalAssets(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/critical-assets`);
  if (!res.ok) throw new Error(`Failed to fetch critical assets: ${res.statusText}`);
  return res.json();
}

export async function fetchScenarios(): Promise<Scenario[]> {
  const res = await fetch(`${API_BASE}/scenarios`);
  if (!res.ok) throw new Error(`Failed to fetch scenarios: ${res.statusText}`);
  return res.json();
}

export async function fetchScenario(id: string): Promise<Scenario> {
  const res = await fetch(`${API_BASE}/scenarios/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch scenario ${id}: ${res.statusText}`);
  return res.json();
}

export async function simulateFailure(params: {
  assetIds: string[];
  degradationLevels?: Record<string, number>;
  scenarioName?: string;
  environmentalFactors?: Record<string, number>;
}): Promise<SimulationResult> {
  const res = await fetch(`${API_BASE}/simulate/failure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      asset_ids: params.assetIds,
      degradation_levels: params.degradationLevels || null,
      scenario_name: params.scenarioName || 'Custom Simulation',
      environmental_factors: params.environmentalFactors || null,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Simulation failed');
  }
  return res.json();
}

export async function simulateScenario(scenarioId: string): Promise<SimulationResult> {
  const res = await fetch(`${API_BASE}/simulate/scenario?scenario_id=${encodeURIComponent(scenarioId)}`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Scenario simulation failed');
  }
  return res.json();
}

export async function fetchInterventions(): Promise<Intervention[]> {
  const res = await fetch(`${API_BASE}/interventions`);
  if (!res.ok) throw new Error(`Failed to fetch interventions: ${res.statusText}`);
  return res.json();
}

export async function evaluateInterventions(params: {
  interventionIds: string[];
  failureScenario: string[];
  degradationLevels?: Record<string, number>;
}): Promise<InterventionEvaluation> {
  const res = await fetch(`${API_BASE}/interventions/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intervention_ids: params.interventionIds,
      failure_scenario: params.failureScenario,
      degradation_levels: params.degradationLevels || null,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Evaluation failed');
  }
  return res.json();
}

export async function optimizeBudget(params: {
  budget: number;
  failureScenario: string[];
  degradationLevels?: Record<string, number>;
}): Promise<BudgetOptimizationResult> {
  const res = await fetch(`${API_BASE}/interventions/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      budget: params.budget,
      failure_scenario: params.failureScenario,
      degradation_levels: params.degradationLevels || null,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Budget optimization failed');
  }
  return res.json();
}

export async function simulateRecovery(params: {
  simulationResult: SimulationResult;
  recoverySpeed?: number;
}): Promise<RecoveryPlan> {
  const res = await fetch(`${API_BASE}/recovery/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      simulation_result: params.simulationResult,
      recovery_speed: params.recoverySpeed ?? 1.0,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Recovery simulation failed');
  }
  return res.json();
}

export async function executeRecovery(params: {
  simulationResult: SimulationResult;
  stepNumber?: number;
  assetIds?: string[];
  restoreAll?: boolean;
  recoverySpeed?: number;
}): Promise<{
  message: string;
  restored_asset_ids: string[];
  restored_asset_names: string[];
  simulation_result: SimulationResult;
  is_fully_restored: boolean;
  remaining_affected_count: number;
  next_recovery_plan: RecoveryPlan;
}> {
  const res = await fetch(`${API_BASE}/recovery/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      simulation_result: params.simulationResult,
      step_number: params.stepNumber,
      asset_ids: params.assetIds,
      restore_all: params.restoreAll ?? false,
      recovery_speed: params.recoverySpeed ?? 1.0,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Recovery execution failed');
  }
  return res.json();
}


export async function explainCascade(params: {
  assetIds: string[];
  scenarioName?: string;
  degradationLevels?: Record<string, number>;
}): Promise<{ explanation: string; simulation_result: SimulationResult }> {
  const res = await fetch(`${API_BASE}/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      asset_ids: params.assetIds,
      scenario_name: params.scenarioName || 'Explain Simulation',
      degradation_levels: params.degradationLevels || null,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Explanation failed');
  }
  return res.json();
}

export async function runCounterfactual(params: {
  assetId: string;
  modification: string;
  modificationValue?: number;
  failureScenario: string[];
  degradationLevels?: Record<string, number>;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/counterfactual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      asset_id: params.assetId,
      modification: params.modification,
      modification_value: params.modificationValue ?? 50.0,
      failure_scenario: params.failureScenario,
      degradation_levels: params.degradationLevels || null,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Counterfactual analysis failed');
  }
  return res.json();
}

