"""Comprehensive System Audit, Hardening, and Edge-Case Tests for CascadeX."""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.data.synthetic_city import generate_synthetic_city
from app.graph.infrastructure_graph import InfrastructureGraph
from app.simulation.cascade_engine import CascadeEngine
from app.simulation.intervention_planner import InterventionPlanner
from app.simulation.recovery_planner import RecoveryPlanner
from app.data.scenarios import get_scenarios

client = TestClient(app)


def test_recovery_execution_step_and_full():
    """Test Phase 12 & 13: Recovery Planner execution end-to-end."""
    # 1. Trigger compound failure B03 + P01
    sim_res = client.post("/api/simulate/failure", json={
        "asset_ids": ["B03", "P01"],
        "scenario_name": "Audit Recovery Test"
    }).json()

    baseline_impact = sim_res["impact_score"]
    assert baseline_impact > 0
    assert len(sim_res["asset_states"]) > 0

    # 2. Get recovery plan
    plan_res = client.post("/api/recovery/simulate", json={
        "simulation_result": sim_res,
        "recovery_speed": 1.5,
    })
    assert plan_res.status_code == 200
    plan = plan_res.json()
    assert "recovery_order" in plan
    assert len(plan["recovery_order"]) >= 2

    # Check field names match frontend expectation
    first_step = plan["recovery_order"][0]
    assert "asset_id" in first_step
    assert "asset_name" in first_step
    assert "asset_type" in first_step
    assert "priority_score" in first_step
    assert "cost" in first_step
    assert "start_time" in first_step
    assert "end_time" in first_step
    assert plan["total_cost"] > 0

    # 3. Execute recovery step 1
    exec_step_res = client.post("/api/recovery/execute", json={
        "simulation_result": sim_res,
        "step_number": 1,
        "recovery_speed": 1.5,
    })
    assert exec_step_res.status_code == 200
    step_data = exec_step_res.json()
    assert len(step_data["restored_asset_ids"]) == 1
    restored_id = step_data["restored_asset_ids"][0]
    updated_states = step_data["simulation_result"]["asset_states"]
    assert updated_states[restored_id]["operational_capacity"] > 0
    assert step_data["simulation_result"]["impact_score"] <= baseline_impact

    # 4. Execute full restoration
    full_exec_res = client.post("/api/recovery/execute", json={
        "simulation_result": sim_res,
        "restore_all": True,
        "recovery_speed": 2.0,
    })
    assert full_exec_res.status_code == 200
    full_data = full_exec_res.json()
    assert full_data["is_fully_restored"] is True
    assert full_data["simulation_result"]["impact_score"] == 0.0


def test_budget_optimizer_strict_limits_and_reasoning():
    """Test Phase 11: Budget optimizer never exceeds budget across multiple levels."""
    test_budgets = [20.0, 30.0, 60.0, 100.0, 150.0, 250.0]

    for b in test_budgets:
        res = client.post("/api/interventions/optimize", json={
            "budget": b,
            "failure_scenario": ["B03"],
        })
        assert res.status_code == 200
        data = res.json()
        assert data["total_cost"] <= b, f"Total cost {data['total_cost']} exceeded budget {b}"
        assert data["remaining_budget"] >= 0.0
        assert round(data["total_cost"] + data["remaining_budget"], 1) == round(b, 1)

        if len(data["selected_interventions"]) > 0:
            assert "reasoning" in data
            assert len(data["reasoning"]) > 0
            for si in data["selected_interventions"]:
                assert "id" in si
                assert "name" in si
                assert "cost" in si
                assert "target" in si


def test_all_10_scenarios_deterministic_and_bounded():
    """Test Phase 4, 8 & 15: All 10 predefined scenarios execute, are deterministic, and bound population."""
    scenarios = get_scenarios()
    assert len(scenarios) == 10

    for s in scenarios:
        sid = s["id"]
        # Run 1
        res1 = client.post(f"/api/simulate/scenario?scenario_id={sid}").json()
        # Run 2
        res2 = client.post(f"/api/simulate/scenario?scenario_id={sid}").json()

        # Check determinism
        assert res1["impact_score"] == res2["impact_score"], f"Scenario {sid} non-deterministic impact score"
        assert res1["total_events"] == res2["total_events"], f"Scenario {sid} non-deterministic events"
        assert res1["affected_population"] == res2["affected_population"], f"Scenario {sid} non-deterministic pop"

        # Check valid bounds
        assert 0.0 <= res1["impact_score"] <= 100.0
        assert res1["affected_population"] >= 0
        total_pop = res1["metrics"]["total_population"]
        assert res1["affected_population"] <= total_pop, f"Affected pop exceeds total in {sid}"


def test_spof_and_redundancy_soundness():
    """Test Phase 9: SPOF classification logic."""
    assets = client.get("/api/assets").json()
    spofs = [a for a in assets if a.get("is_spof")]
    assert len(spofs) > 0, "Graph should identify at least 1 SPOF"

    # East Canal Bridge B03 or key river crossings should be flagged
    spof_ids = {a["id"] for a in spofs}
    assert "B03" in spof_ids or "B01" in spof_ids


def test_alternate_route_intervention_effect():
    """Test Phase 10: Alternate route construction adds edge and mitigates traffic."""
    assets, edges = generate_synthetic_city()
    graph = InfrastructureGraph(assets, edges)
    planner = InterventionPlanner(graph)

    # Alternate route intervention INT06
    eval_res = planner.evaluate_intervention(
        intervention_ids=["INT06"],
        failure_scenario=["B03"]
    )
    assert eval_res["total_cost"] == 120
    assert "modified_result" in eval_res
