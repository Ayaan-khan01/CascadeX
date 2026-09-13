"""CascadeX - Data models for infrastructure assets and simulation."""
from __future__ import annotations
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class AssetType(str, Enum):
    ROAD = "ROAD"
    BRIDGE = "BRIDGE"
    HOSPITAL = "HOSPITAL"
    POWER = "POWER"
    WATER = "WATER"
    EMERGENCY = "EMERGENCY"


class AssetStatus(str, Enum):
    OPERATIONAL = "OPERATIONAL"
    WARNING = "WARNING"
    IMPACTED = "IMPACTED"
    CRITICAL = "CRITICAL"
    FAILED = "FAILED"
    RECOVERING = "RECOVERING"


class RelationshipType(str, Enum):
    TRANSPORT = "TRANSPORT"
    DEPENDENCY = "DEPENDENCY"
    POWER_SUPPLY = "POWER_SUPPLY"
    WATER_SUPPLY = "WATER_SUPPLY"
    EMERGENCY_ACCESS = "EMERGENCY_ACCESS"
    ALTERNATE_ROUTE = "ALTERNATE_ROUTE"


class RedundancyLevel(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class Asset(BaseModel):
    id: str
    name: str
    type: AssetType
    latitude: float
    longitude: float
    capacity: float = 100.0
    current_load: float = 0.0
    operational_capacity: float = 100.0
    condition: float = 100.0
    criticality: float = 0.0
    replacement_cost: float = 0.0  # in crore INR
    repair_time: float = 0.0  # in hours
    dependencies: List[str] = Field(default_factory=list)
    dependent_assets: List[str] = Field(default_factory=list)
    backup_available: bool = False
    backup_capacity: float = 0.0
    population_served: int = 0
    service_radius: float = 0.0  # in km
    status: AssetStatus = AssetStatus.OPERATIONAL
    vulnerability_factors: Dict[str, float] = Field(default_factory=dict)

    # Simulation state
    original_capacity: float = 100.0
    cascade_level: int = -1
    failure_cause: Optional[str] = None
    failure_parent: Optional[str] = None
    failure_reason: Optional[str] = None


class Edge(BaseModel):
    source: str
    target: str
    relationship_type: RelationshipType
    capacity: float = 100.0
    distance: float = 0.0  # km
    dependency_strength: float = 1.0
    travel_time: float = 0.0  # minutes
    status: AssetStatus = AssetStatus.OPERATIONAL
    current_load: float = 0.0
    bidirectional: bool = True


class CascadeEvent(BaseModel):
    timestamp: float  # minutes from start
    asset_id: str
    asset_name: str
    asset_type: AssetType
    event_type: str
    severity: str
    previous_status: AssetStatus
    new_status: AssetStatus
    previous_capacity: float
    new_capacity: float
    cause: str
    parent_event_asset: Optional[str] = None
    cascade_level: int = 0
    details: str = ""


class CausalChainLink(BaseModel):
    asset_id: str
    asset_name: str
    asset_type: AssetType
    event: str
    cascade_level: int
    timestamp: float
    capacity_change: str = ""


class SimulationResult(BaseModel):
    scenario_name: str
    initial_failures: List[str]
    simulation_duration: float
    total_events: int
    events: List[CascadeEvent]
    asset_states: Dict[str, Dict[str, Any]]
    cascade_levels: Dict[int, List[str]]
    metrics: Dict[str, Any]
    critical_assets: List[Dict[str, Any]]
    affected_population: int
    hospital_metrics: Dict[str, Any]
    emergency_metrics: Dict[str, Any]
    causal_chains: Dict[str, List[CausalChainLink]]
    impact_score: float
    timeline: List[Dict[str, Any]]


class Intervention(BaseModel):
    id: str
    name: str
    description: str
    target_asset: str
    intervention_type: str
    cost: float  # crore INR
    implementation_time: float  # hours
    capacity_improvement: float = 0.0
    adds_backup: bool = False
    backup_capacity: float = 0.0
    adds_alternate_route: bool = False
    alternate_route_from: Optional[str] = None
    alternate_route_to: Optional[str] = None


class InterventionResult(BaseModel):
    intervention: Intervention
    before_impact: float
    after_impact: float
    resilience_improvement: float
    population_protected: int
    services_restored: List[str]


class ScenarioComparison(BaseModel):
    scenario_a_name: str
    scenario_b_name: str
    scenario_a: SimulationResult
    scenario_b: SimulationResult
    comparison_metrics: Dict[str, Any]


class EnvironmentalTrigger(BaseModel):
    id: str
    name: str
    trigger_type: str
    severity: float  # 0-1
    affected_asset_types: List[AssetType]
    capacity_reduction: Dict[str, float]
    description: str


class RecoveryPlan(BaseModel):
    recovery_order: List[Dict[str, Any]]
    total_recovery_time: float
    recovery_timeline: List[Dict[str, Any]]
    service_restoration_times: Dict[str, float]
