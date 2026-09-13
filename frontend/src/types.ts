export type AssetType = 'ROAD' | 'BRIDGE' | 'HOSPITAL' | 'POWER' | 'WATER' | 'EMERGENCY';

export type AssetStatus = 'OPERATIONAL' | 'WARNING' | 'IMPACTED' | 'CRITICAL' | 'FAILED' | 'RECOVERING';

export type RelationshipType = 'TRANSPORT' | 'DEPENDENCY' | 'POWER_SUPPLY' | 'WATER_SUPPLY' | 'EMERGENCY_ACCESS' | 'ALTERNATE_ROUTE';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  latitude: floatNumber;
  longitude: floatNumber;
  capacity: number;
  current_load: number;
  operational_capacity: number;
  condition: number;
  criticality: number;
  replacement_cost: number; // in crore INR
  repair_time: number; // in hours
  dependencies: string[];
  dependent_assets: string[];
  backup_available: boolean;
  backup_capacity: number;
  population_served: number;
  service_radius: number;
  status: AssetStatus;
  vulnerability_factors: Record<string, number>;
  redundancy?: 'HIGH' | 'MEDIUM' | 'LOW';
  is_spof?: boolean;
  // Simulation overrides
  cascade_level?: number;
  failure_cause?: string | null;
  failure_reason?: string | null;
}

type floatNumber = number;

export interface Edge {
  source: string;
  target: string;
  relationship_type: RelationshipType;
  capacity: number;
  distance: number;
  travel_time: number;
  status?: AssetStatus;
  current_load?: number;
  bidirectional?: boolean;
}

export interface NetworkData {
  nodes: {
    id: string;
    name: string;
    type: AssetType;
    status: AssetStatus;
    criticality: number;
    capacity: number;
    load: number;
    operational_capacity: number;
    is_spof: boolean;
    latitude: number;
    longitude: number;
  }[];
  edges: {
    source: string;
    target: string;
    type: RelationshipType;
    capacity: number;
    load: number;
    status: AssetStatus;
  }[];
}

export interface CascadeEvent {
  timestamp: number; // minutes from start
  asset_id: string;
  asset_name: string;
  asset_type: AssetType;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  previous_status: AssetStatus;
  new_status: AssetStatus;
  previous_capacity: number;
  new_capacity: number;
  cause: string;
  parent_event_asset?: string | null;
  cascade_level: number;
  details: string;
}

export interface CausalChainLink {
  asset_id: string;
  asset_name: string;
  asset_type: AssetType;
  event: string;
  cascade_level: number;
  timestamp: number;
  capacity_change?: string;
}

export interface SimulationResult {
  scenario_name: string;
  initial_failures: string[];
  simulation_duration: number;
  total_events: number;
  events: CascadeEvent[];
  asset_states: Record<string, {
    id: string;
    name: string;
    type: AssetType;
    status: AssetStatus;
    operational_capacity: number;
    current_load: number;
    cascade_level: number;
    failure_cause: string | null;
    failure_reason: string | null;
    criticality: number;
  }>;
  cascade_levels: Record<string | number, string[]>;
  metrics: {
    operational_count: number;
    warning_count: number;
    impacted_count: number;
    critical_count: number;
    failed_count: number;
    avg_operational_capacity: number;
    cascade_depth: number;
    total_assets: number;
  };
  critical_assets: {
    id: string;
    name: string;
    type: AssetType;
    criticality: number;
    status: AssetStatus;
    cascade_level: number;
  }[];
  affected_population: number;
  hospital_metrics: {
    total: number;
    operational: number;
    affected: number;
    capacity_remaining: number;
  };
  emergency_metrics: {
    total: number;
    operational: number;
    affected: number;
    capacity_remaining: number;
  };
  causal_chains: Record<string, CausalChainLink[]>;
  impact_score: number;
  timeline: {
    timestamp: number;
    asset_id: string;
    asset_name: string;
    event_type: string;
    severity: string;
    cascade_level: number;
    details: string;
    new_status: AssetStatus;
    new_capacity: number;
  }[];
}

export interface Scenario {
  id: string;
  name: string;
  category: string;
  description: string;
  failed_assets: string[];
  degradation_levels?: Record<string, number>;
  environmental_factors?: Record<string, number>;
  expected_impact?: string;
  cascade_level_expected?: number;
}

export interface Intervention {
  id: string;
  name: string;
  description: string;
  target_asset: string;
  target_asset_name?: string;
  intervention_type: string;
  cost: number; // crore INR
  implementation_time: number; // hours
  capacity_improvement: number;
  adds_backup: boolean;
  backup_capacity: number;
}

export interface InterventionEvaluation {
  interventions_applied: {
    id: string;
    name: string;
    cost: number;
    target: string;
  }[];
  total_cost: number;
  baseline_impact: number;
  modified_impact: number;
  improvement: number;
  improvement_pct: number;
  population_protected: number;
  baseline_result: SimulationResult;
  modified_result: SimulationResult;
}

export interface BudgetOptimizationResult {
  budget: number;
  total_cost: number;
  selected_interventions: {
    id: string;
    name: string;
    cost: number;
    target: string;
    target_name?: string;
  }[];
  baseline_impact: number;
  optimized_impact: number;
  improvement: number;
  improvement_pct: number;
  population_protected: number;
  baseline_result: SimulationResult;
  optimized_result?: SimulationResult;
}

export interface RecoveryPlan {
  recovery_order: {
    order: number;
    asset_id: string;
    asset_name: string;
    asset_type: AssetType;
    repair_time: number;
    cost: number;
    priority_score: number;
    population_restored: number;
    dependencies_cleared: string[];
    start_time: number;
    end_time: number;
  }[];
  total_recovery_time: number;
  total_cost: number;
  recovery_timeline: {
    time: number;
    event: string;
    asset_name: string;
    system_capacity_pct: number;
  }[];
  service_restoration_times: Record<string, number>;
}

export interface SystemMetrics {
  total_assets: number;
  by_type: Record<string, number>;
  total_population_served: number;
  system_health: number;
  avg_criticality: number;
  hospital_capacity: number;
  emergency_capacity: number;
  power_capacity: number;
  water_capacity: number;
}
