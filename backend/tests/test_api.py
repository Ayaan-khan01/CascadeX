"""Integration tests for CascadeX FastAPI REST endpoints."""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["assets"] > 0
    assert data["edges"] > 0


def test_assets_endpoint():
    response = client.get("/api/assets")
    assert response.status_code == 200
    assets = response.json()
    assert isinstance(assets, list)
    assert len(assets) > 0

    first_asset = assets[0]
    assert "id" in first_asset
    assert "name" in first_asset
    assert "type" in first_asset
    assert "criticality" in first_asset
    assert "latitude" in first_asset
    assert "longitude" in first_asset


def test_get_single_asset():
    response = client.get("/api/assets")
    first_id = response.json()[0]["id"]

    res = client.get(f"/api/assets/{first_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == first_id


def test_network_endpoint():
    response = client.get("/api/network")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "edges" in data
    assert len(data["nodes"]) > 0


def test_metrics_endpoint():
    response = client.get("/api/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "total_assets" in data
    assert "by_type" in data
    assert "total_population_served" in data
    assert "system_health" in data


def test_critical_assets_endpoint():
    response = client.get("/api/critical-assets")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    # Check descending order by criticality
    for i in range(len(data) - 1):
        assert data[i]["criticality"] >= data[i + 1]["criticality"]


def test_scenarios_endpoints():
    response = client.get("/api/scenarios")
    assert response.status_code == 200
    scenarios = response.json()
    assert isinstance(scenarios, list)
    assert len(scenarios) >= 5

    first_scenario = scenarios[0]
    sid = first_scenario["id"]

    res = client.get(f"/api/scenarios/{sid}")
    assert res.status_code == 200
    assert res.json()["id"] == sid


def test_simulate_failure_endpoint():
    # Fetch an asset ID
    assets = client.get("/api/assets").json()
    test_id = assets[0]["id"]

    payload = {
        "asset_ids": [test_id],
        "scenario_name": "API Test Failure",
    }
    response = client.post("/api/simulate/failure", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "impact_score" in data
    assert "events" in data
    assert "asset_states" in data
    assert data["scenario_name"] == "API Test Failure"


def test_simulate_scenario_endpoint():
    scenarios = client.get("/api/scenarios").json()
    sid = scenarios[0]["id"]

    response = client.post(f"/api/simulate/scenario?scenario_id={sid}")
    assert response.status_code == 200
    data = response.json()
    assert "impact_score" in data
    assert "timeline" in data


def test_interventions_endpoints():
    response = client.get("/api/interventions")
    assert response.status_code == 200
    interventions = response.json()
    assert len(interventions) > 0

    iid = interventions[0]["id"]
    assets = client.get("/api/assets").json()

    eval_payload = {
        "intervention_ids": [iid],
        "failure_scenario": [assets[0]["id"]]
    }
    eval_res = client.post("/api/interventions/evaluate", json=eval_payload)
    assert eval_res.status_code == 200
    assert "improvement" in eval_res.json()

    budget_payload = {
        "budget": 50.0,
        "failure_scenario": [assets[0]["id"]]
    }
    opt_res = client.post("/api/interventions/optimize", json=budget_payload)
    assert opt_res.status_code == 200
    assert "selected_interventions" in opt_res.json()


def test_recovery_endpoint():
    assets = client.get("/api/assets").json()
    payload = {"asset_ids": [assets[0]["id"]], "scenario_name": "Recovery Test"}
    sim_data = client.post("/api/simulate/failure", json=payload).json()

    rec_res = client.post("/api/recovery/simulate", json={"simulation_result": sim_data, "recovery_speed": 1.2})
    assert rec_res.status_code == 200
    rec_data = rec_res.json()
    assert "recovery_order" in rec_data
    assert "total_recovery_time" in rec_data


def test_counterfactual_endpoint():
    assets = client.get("/api/assets").json()
    target = assets[0]["id"]
    cf_res = client.post("/api/counterfactual", json={
        "asset_id": target,
        "modification": "increase_capacity",
        "modification_value": 50.0,
        "failure_scenario": [target]
    })
    assert cf_res.status_code == 200
    cf_data = cf_res.json()
    assert "baseline_impact" in cf_data
    assert "counterfactual_impact" in cf_data


def test_explain_endpoint():
    assets = client.get("/api/assets").json()
    target = assets[0]["id"]
    exp_res = client.post("/api/explain", json={
        "asset_ids": [target],
        "scenario_name": "Explain Test"
    })
    assert exp_res.status_code == 200
    exp_data = exp_res.json()
    assert "explanation" in exp_data
    assert len(exp_data["explanation"]) > 0
