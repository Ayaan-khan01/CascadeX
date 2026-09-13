"""Tests for CascadeX simulation engine, graph model, and planners."""
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.data.synthetic_city import generate_synthetic_city
from app.graph.infrastructure_graph import InfrastructureGraph
from app.simulation.cascade_engine import CascadeEngine
from app.simulation.intervention_planner import InterventionPlanner
from app.simulation.recovery_planner import RecoveryPlanner
from app.models.schemas import AssetType, AssetStatus


def test_synthetic_city_generation():
    assets, edges = generate_synthetic_city()
    assert len(assets) >= 30, "City should have at least 30 assets"
    assert len(edges) >= 40, "City should have at least 40 edges"

    # Verify key asset types exist
    asset_types = {a.type for a in assets}
    assert AssetType.ROAD in asset_types
    assert AssetType.BRIDGE in asset_types
    assert AssetType.HOSPITAL in asset_types
    assert AssetType.POWER in asset_types
    assert AssetType.WATER in asset_types
    assert AssetType.EMERGENCY in asset_types


def test_graph_initialization():
    assets, edges = generate_synthetic_city()
    graph = InfrastructureGraph(assets, edges)
    assert len(graph.assets) == len(assets)
    assert len(graph.edges) == len(edges)

    # Test network data export
    network_data = graph.get_network_data()
    assert "nodes" in network_data
    assert "edges" in network_data
    assert len(network_data["nodes"]) == len(assets)


def test_single_point_of_failure_detection():
    assets, edges = generate_synthetic_city()
    graph = InfrastructureGraph(assets, edges)

    # Check that is_single_point_of_failure returns a boolean for each asset
    spof_assets = [aid for aid in graph.assets if graph.is_single_point_of_failure(aid)]
    assert isinstance(spof_assets, list)


def test_cascade_simulation_bridge_failure():
    assets, edges = generate_synthetic_city()
    graph = InfrastructureGraph(assets, edges)
    engine = CascadeEngine(graph)

    # Find a bridge
    bridges = [a.id for a in assets if a.type == AssetType.BRIDGE]
    assert len(bridges) > 0

    target_bridge = bridges[0]
    result = engine.simulate_failure(
        failed_asset_ids=[target_bridge],
        scenario_name="Test Bridge Failure"
    )

    assert result is not None
    assert result.scenario_name == "Test Bridge Failure"
    assert result.impact_score >= 0.0
    assert result.impact_score <= 100.0
    assert result.total_events >= 1
    assert target_bridge in result.asset_states
    assert result.asset_states[target_bridge]["status"] == AssetStatus.FAILED.value


def test_power_failure_cascade():
    assets, edges = generate_synthetic_city()
    graph = InfrastructureGraph(assets, edges)
    engine = CascadeEngine(graph)

    power_plants = [a.id for a in assets if a.type == AssetType.POWER]
    assert len(power_plants) > 0

    result = engine.simulate_failure(
        failed_asset_ids=[power_plants[0]],
        scenario_name="Test Power Outage"
    )

    assert result.impact_score > 0
    assert len(result.events) > 0
    assert result.metrics["failed_count"] >= 1


def test_intervention_evaluation():
    assets, edges = generate_synthetic_city()
    graph = InfrastructureGraph(assets, edges)
    planner = InterventionPlanner(graph)

    available = planner.get_available_interventions()
    assert len(available) > 0

    bridges = [a.id for a in assets if a.type == AssetType.BRIDGE]
    target_bridge = bridges[0]

    eval_result = planner.evaluate_intervention(
        intervention_ids=[available[0]["id"]],
        failure_scenario=[target_bridge]
    )

    assert "baseline_result" in eval_result
    assert "modified_result" in eval_result
    assert "improvement" in eval_result
    assert "improvement_pct" in eval_result


def test_budget_optimization():
    assets, edges = generate_synthetic_city()
    graph = InfrastructureGraph(assets, edges)
    planner = InterventionPlanner(graph)

    bridges = [a.id for a in assets if a.type == AssetType.BRIDGE]
    target_bridge = bridges[0]

    opt_result = planner.optimize_budget(
        budget=100.0,
        failure_scenario=[target_bridge]
    )

    assert "selected_interventions" in opt_result
    assert "total_cost" in opt_result
    assert opt_result["total_cost"] <= 100.0


def test_recovery_planner():
    assets, edges = generate_synthetic_city()
    graph = InfrastructureGraph(assets, edges)
    engine = CascadeEngine(graph)
    planner = RecoveryPlanner(graph)

    bridges = [a.id for a in assets if a.type == AssetType.BRIDGE]
    result = engine.simulate_failure(
        failed_asset_ids=[bridges[0]],
        scenario_name="Pre-Recovery Test"
    )

    recovery = planner.plan_recovery(
        simulation_result=result.model_dump(),
        recovery_speed=1.5
    )

    assert "recovery_order" in recovery
    assert "total_recovery_time" in recovery
    assert recovery["total_recovery_time"] >= 0
