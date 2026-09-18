"""CascadeX — FastAPI Backend Application.

Main entry point. Initializes the synthetic city, builds the infrastructure graph,
and exposes REST API endpoints for the frontend.
"""
from __future__ import annotations
from typing import Dict, List, Optional, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.data.synthetic_city import generate_synthetic_city
from app.data.scenarios import get_scenarios, get_scenario_by_id
from app.graph.infrastructure_graph import InfrastructureGraph
from app.simulation.cascade_engine import CascadeEngine
from app.simulation.intervention_planner import InterventionPlanner
from app.simulation.recovery_planner import RecoveryPlanner
from app.models.schemas import AssetType, AssetStatus


# ============================================================
# Initialize application
# ============================================================
app = FastAPI(
    title="CascadeX API",
    description="Urban Infrastructure Failure & Resilience Simulator",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Generate synthetic city and build graph on startup
assets, edges = generate_synthetic_city()
infra_graph = InfrastructureGraph(assets, edges)
intervention_planner = InterventionPlanner(infra_graph)
recovery_planner = RecoveryPlanner(infra_graph)


# ============================================================
# Request/Response Models
# ============================================================
class FailureRequest(BaseModel):
    asset_ids: List[str]
    degradation_levels: Optional[Dict[str, float]] = None
    scenario_name: str = "Custom Scenario"
    environmental_factors: Optional[Dict[str, float]] = None


class InterventionRequest(BaseModel):
    intervention_ids: List[str]
    failure_scenario: List[str]
    degradation_levels: Optional[Dict[str, float]] = None


class BudgetRequest(BaseModel):
    budget: float
    failure_scenario: List[str]
    degradation_levels: Optional[Dict[str, float]] = None


class RecoveryRequest(BaseModel):
    simulation_result: Dict[str, Any]
    recovery_speed: float = 1.0


class RecoveryExecutionRequest(BaseModel):
    simulation_result: Dict[str, Any]
    step_number: Optional[int] = None
    asset_ids: Optional[List[str]] = None
    restore_all: bool = False
    recovery_speed: float = 1.0



class CounterfactualRequest(BaseModel):
    asset_id: str
    modification: str  # "add_backup", "increase_capacity", "add_route"
    modification_value: float = 50.0
    failure_scenario: List[str]
    degradation_levels: Optional[Dict[str, float]] = None


# ============================================================
# API Endpoints
# ============================================================

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "assets": len(infra_graph.assets), "edges": len(infra_graph.edges)}


@app.get("/api/assets")
def get_all_assets():
    """Get all infrastructure assets."""
    result = []
    for aid, asset in infra_graph.assets.items():
        result.append({
            "id": asset.id,
            "name": asset.name,
            "type": asset.type.value,
            "latitude": asset.latitude,
            "longitude": asset.longitude,
            "capacity": asset.capacity,
            "current_load": asset.current_load,
            "operational_capacity": asset.operational_capacity,
            "condition": asset.condition,
            "criticality": asset.criticality,
            "replacement_cost": asset.replacement_cost,
            "repair_time": asset.repair_time,
            "dependencies": asset.dependencies,
            "dependent_assets": asset.dependent_assets,
            "backup_available": asset.backup_available,
            "backup_capacity": asset.backup_capacity,
            "population_served": asset.population_served,
            "service_radius": asset.service_radius,
            "status": asset.status.value,
            "vulnerability_factors": asset.vulnerability_factors,
            "redundancy": infra_graph.get_redundancy_level(aid),
            "is_spof": infra_graph.is_single_point_of_failure(aid),
        })
    return result


@app.get("/api/assets/{asset_id}")
def get_asset(asset_id: str):
    """Get a specific asset by ID."""
    asset = infra_graph.assets.get(asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset {asset_id} not found")

    return {
        "id": asset.id,
        "name": asset.name,
        "type": asset.type.value,
        "latitude": asset.latitude,
        "longitude": asset.longitude,
        "capacity": asset.capacity,
        "current_load": asset.current_load,
        "operational_capacity": asset.operational_capacity,
        "condition": asset.condition,
        "criticality": asset.criticality,
        "replacement_cost": asset.replacement_cost,
        "repair_time": asset.repair_time,
        "dependencies": asset.dependencies,
        "dependent_assets": asset.dependent_assets,
        "backup_available": asset.backup_available,
        "backup_capacity": asset.backup_capacity,
        "population_served": asset.population_served,
        "service_radius": asset.service_radius,
        "status": asset.status.value,
        "vulnerability_factors": asset.vulnerability_factors,
        "redundancy": infra_graph.get_redundancy_level(asset_id),
        "is_spof": infra_graph.is_single_point_of_failure(asset_id),
    }


@app.get("/api/network")
def get_network():
    """Get the full network graph data for visualization."""
    return infra_graph.get_network_data()


@app.get("/api/metrics")
def get_system_metrics():
    """Get current system-wide metrics."""
    assets_list = list(infra_graph.assets.values())
    hospitals = [a for a in assets_list if a.type == AssetType.HOSPITAL]
    emergencies = [a for a in assets_list if a.type == AssetType.EMERGENCY]
    power = [a for a in assets_list if a.type == AssetType.POWER]
    water = [a for a in assets_list if a.type == AssetType.WATER]
    roads = [a for a in assets_list if a.type == AssetType.ROAD]
    bridges = [a for a in assets_list if a.type == AssetType.BRIDGE]

    total_pop = sum(a.population_served for a in assets_list)

    return {
        "total_assets": len(assets_list),
        "by_type": {
            "roads": len(roads),
            "bridges": len(bridges),
            "hospitals": len(hospitals),
            "power": len(power),
            "water": len(water),
            "emergency": len(emergencies),
        },
        "total_population_served": total_pop,
        "system_health": 100.0,
        "avg_criticality": round(sum(a.criticality for a in assets_list) / len(assets_list), 1),
        "hospital_capacity": round(sum(h.operational_capacity for h in hospitals) / max(len(hospitals), 1), 1),
        "emergency_capacity": round(sum(e.operational_capacity for e in emergencies) / max(len(emergencies), 1), 1),
        "power_capacity": round(sum(p.operational_capacity for p in power) / max(len(power), 1), 1),
        "water_capacity": round(sum(w.operational_capacity for w in water) / max(len(water), 1), 1),
    }


@app.get("/api/critical-assets")
def get_critical_assets():
    """Get assets ranked by criticality score."""
    ranked = sorted(
        [
            {
                "id": a.id,
                "name": a.name,
                "type": a.type.value,
                "criticality": a.criticality,
                "population_served": a.population_served,
                "is_spof": infra_graph.is_single_point_of_failure(a.id),
                "redundancy": infra_graph.get_redundancy_level(a.id),
                "condition": a.condition,
                "backup_available": a.backup_available,
            }
            for a in infra_graph.assets.values()
        ],
        key=lambda x: x["criticality"],
        reverse=True,
    )
    return ranked


@app.get("/api/scenarios")
def list_scenarios():
    """Get all predefined scenarios."""
    return get_scenarios()


@app.get("/api/scenarios/{scenario_id}")
def get_scenario(scenario_id: str):
    """Get a specific scenario."""
    scenario = get_scenario_by_id(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario {scenario_id} not found")
    return scenario


@app.post("/api/simulate/failure")
def simulate_failure(request: FailureRequest):
    """Simulate failure of one or more assets."""
    # Validate assets exist
    for aid in request.asset_ids:
        if aid not in infra_graph.assets:
            raise HTTPException(status_code=404, detail=f"Asset {aid} not found")

    engine = CascadeEngine(infra_graph)
    result = engine.simulate_failure(
        failed_asset_ids=request.asset_ids,
        degradation_levels=request.degradation_levels,
        scenario_name=request.scenario_name,
        environmental_factors=request.environmental_factors,
    )

    return result.model_dump()


@app.post("/api/simulate/scenario")
def simulate_scenario(scenario_id: str):
    """Run a predefined scenario."""
    scenario = get_scenario_by_id(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario {scenario_id} not found")

    engine = CascadeEngine(infra_graph)
    result = engine.simulate_failure(
        failed_asset_ids=scenario["failed_assets"],
        degradation_levels=scenario.get("degradation_levels"),
        scenario_name=scenario["name"],
        environmental_factors=scenario.get("environmental_factors"),
    )

    return result.model_dump()


@app.get("/api/interventions")
def get_interventions():
    """Get available interventions."""
    return intervention_planner.get_available_interventions()


@app.post("/api/interventions/evaluate")
def evaluate_interventions(request: InterventionRequest):
    """Evaluate selected interventions against a failure scenario."""
    result = intervention_planner.evaluate_intervention(
        intervention_ids=request.intervention_ids,
        failure_scenario=request.failure_scenario,
        degradation_levels=request.degradation_levels,
    )

    # Convert SimulationResult objects to dicts
    if "baseline_result" in result and hasattr(result["baseline_result"], "model_dump"):
        result["baseline_result"] = result["baseline_result"].model_dump()
    if "modified_result" in result and hasattr(result["modified_result"], "model_dump"):
        result["modified_result"] = result["modified_result"].model_dump()

    return result


@app.post("/api/interventions/optimize")
def optimize_budget(request: BudgetRequest):
    """Find optimal interventions within budget."""
    result = intervention_planner.optimize_budget(
        budget=request.budget,
        failure_scenario=request.failure_scenario,
        degradation_levels=request.degradation_levels,
    )

    # Convert SimulationResult objects
    if "baseline_result" in result and hasattr(result["baseline_result"], "model_dump"):
        result["baseline_result"] = result["baseline_result"].model_dump()
    if "optimized_result" in result and result.get("optimized_result") and hasattr(result["optimized_result"], "model_dump"):
        result["optimized_result"] = result["optimized_result"].model_dump()

    return result


@app.post("/api/recovery/simulate")
def simulate_recovery(request: RecoveryRequest):
    """Simulate recovery process."""
    return recovery_planner.plan_recovery(
        simulation_result=request.simulation_result,
        recovery_speed=request.recovery_speed,
    )


@app.post("/api/recovery/execute")
def execute_recovery(request: RecoveryExecutionRequest):
    """Execute recovery step and update simulation state."""
    return recovery_planner.execute_recovery_step(
        simulation_result=request.simulation_result,
        step_number=request.step_number,
        asset_ids=request.asset_ids,
        restore_all=request.restore_all,
        recovery_speed=request.recovery_speed,
    )



@app.post("/api/counterfactual")
def run_counterfactual(request: CounterfactualRequest):
    """Run counterfactual analysis (what-if)."""
    asset = infra_graph.assets.get(request.asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset {request.asset_id} not found")

    # Baseline simulation
    engine = CascadeEngine(infra_graph)
    baseline = engine.simulate_failure(
        request.failure_scenario,
        request.degradation_levels,
        "Baseline"
    )

    # Create modified graph
    import copy
    new_assets = [a.model_copy(deep=True) for a in infra_graph.assets.values()]
    new_edges = [e.model_copy(deep=True) for e in infra_graph.edges]

    asset_map = {a.id: a for a in new_assets}
    target = asset_map[request.asset_id]

    if request.modification == "add_backup":
        target.backup_available = True
        target.backup_capacity = request.modification_value
    elif request.modification == "increase_capacity":
        target.capacity += request.modification_value
    elif request.modification == "improve_condition":
        target.condition = min(target.condition + request.modification_value, 100)
    elif request.modification == "reduce_vulnerability":
        for k in target.vulnerability_factors:
            target.vulnerability_factors[k] *= (1 - request.modification_value / 100)

    modified_graph = InfrastructureGraph(new_assets, new_edges)
    modified_engine = CascadeEngine(modified_graph)
    counterfactual = modified_engine.simulate_failure(
        request.failure_scenario,
        request.degradation_levels,
        "Counterfactual"
    )

    improvement = baseline.impact_score - counterfactual.impact_score

    return {
        "asset_id": request.asset_id,
        "asset_name": asset.name,
        "modification": request.modification,
        "modification_value": request.modification_value,
        "baseline_impact": baseline.impact_score,
        "counterfactual_impact": counterfactual.impact_score,
        "improvement": round(improvement, 1),
        "improvement_pct": round((improvement / max(baseline.impact_score, 0.1)) * 100, 1),
        "baseline_result": baseline.model_dump(),
        "counterfactual_result": counterfactual.model_dump(),
    }


@app.post("/api/explain")
def explain_cascade(request: FailureRequest):
    """Generate deterministic explanation for a cascade scenario."""
    engine = CascadeEngine(infra_graph)
    result = engine.simulate_failure(
        failed_asset_ids=request.asset_ids,
        degradation_levels=request.degradation_levels,
        scenario_name=request.scenario_name,
        environmental_factors=request.environmental_factors,
    )

    # Build explanation from simulation events
    explanations = []

    # Opening
    failed_names = [infra_graph.assets[aid].name for aid in request.asset_ids if aid in infra_graph.assets]
    explanations.append(
        f"## Cascade Analysis: {', '.join(failed_names)}\n\n"
        f"The failure of {', '.join(failed_names)} triggered a cascade affecting "
        f"{result.metrics['failed_count'] + result.metrics['critical_count'] + result.metrics['impacted_count']} "
        f"infrastructure assets and {result.affected_population:,} people."
    )

    # By cascade level
    for level, asset_ids in sorted(result.cascade_levels.items()):
        if level == 0:
            explanations.append(f"\n### Level 0 — Initial Failure")
        elif level == 1:
            explanations.append(f"\n### Level {level} — Direct Impact")
        elif level == 2:
            explanations.append(f"\n### Level {level} — Secondary Effects")
        else:
            explanations.append(f"\n### Level {level} — Tertiary/System-wide Effects")

        for aid in asset_ids:
            state = result.asset_states.get(aid, {})
            reason = state.get("failure_reason", "")
            explanations.append(f"- **{state.get('name', aid)}** ({state.get('type', '')}): {reason}")

    # Impact summary
    explanations.append(f"\n### Impact Summary")
    explanations.append(f"- **Impact Score**: {result.impact_score}/100")
    explanations.append(f"- **Population Affected**: {result.affected_population:,}")
    explanations.append(f"- **Hospitals Affected**: {result.hospital_metrics['affected']}/{result.hospital_metrics['total']}")
    explanations.append(f"- **Emergency Services Affected**: {result.emergency_metrics['affected']}/{result.emergency_metrics['total']}")
    explanations.append(f"- **Cascade Depth**: {result.metrics.get('cascade_depth', 0)} levels")

    return {
        "explanation": "\n".join(explanations),
        "simulation_result": result.model_dump(),
    }


# ============================================================
# Static Files & SPA Routing (For Render Deployment)
# ============================================================
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "dist")

if os.path.isdir(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")
    
    @app.get("/{catchall:path}")
    def serve_react_app(catchall: str):
        # Don't serve index.html for missing /api routes
        if catchall.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
            
        file_path = os.path.join(frontend_dist, catchall)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
            
        # SPA Fallback
        return FileResponse(os.path.join(frontend_dist, "index.html"))
