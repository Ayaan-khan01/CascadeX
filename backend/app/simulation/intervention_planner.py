"""Intervention evaluation and budget optimization.

Supports:
- Single intervention evaluation (before/after comparison)
- Budget-constrained optimization using knapsack approach
- Counterfactual analysis
"""
from __future__ import annotations
from typing import Dict, List, Optional, Any
from itertools import combinations
from app.models.schemas import (
    Asset, AssetType, AssetStatus, Edge, RelationshipType,
    Intervention, InterventionResult, SimulationResult
)
from app.graph.infrastructure_graph import InfrastructureGraph
from app.simulation.cascade_engine import CascadeEngine


# Predefined intervention templates
INTERVENTION_TEMPLATES = [
    Intervention(
        id="INT01", name="Bridge Reinforcement",
        description="Structural reinforcement to increase bridge resilience",
        target_asset="B03", intervention_type="reinforce",
        cost=50, implementation_time=720,
        capacity_improvement=30,
    ),
    Intervention(
        id="INT02", name="Backup Power Generator",
        description="Install backup diesel generator for critical facility",
        target_asset="H03", intervention_type="backup_power",
        cost=15, implementation_time=168,
        adds_backup=True, backup_capacity=60,
    ),
    Intervention(
        id="INT03", name="Road Capacity Upgrade",
        description="Widen road and improve surface to increase capacity",
        target_asset="R07", intervention_type="upgrade",
        cost=30, implementation_time=2160,
        capacity_improvement=40,
    ),
    Intervention(
        id="INT04", name="Water Redundancy Pipeline",
        description="Add redundant water supply pipeline",
        target_asset="W02", intervention_type="redundancy",
        cost=80, implementation_time=4320,
        adds_backup=True, backup_capacity=50,
    ),
    Intervention(
        id="INT05", name="Emergency Station Upgrade",
        description="Expand emergency station capacity and add backup systems",
        target_asset="E03", intervention_type="upgrade",
        cost=25, implementation_time=720,
        capacity_improvement=30, adds_backup=True, backup_capacity=40,
    ),
    Intervention(
        id="INT06", name="Alternate Route Construction",
        description="Build alternate road bypassing critical bridge",
        target_asset="R08", intervention_type="alternate_route",
        cost=120, implementation_time=8640,
        adds_alternate_route=True,
        alternate_route_from="R08", alternate_route_to="R03",
        capacity_improvement=0,
    ),
    Intervention(
        id="INT07", name="Bridge B01 Reinforcement",
        description="Reinforce Central River Bridge against flooding",
        target_asset="B01", intervention_type="reinforce",
        cost=60, implementation_time=960,
        capacity_improvement=25,
    ),
    Intervention(
        id="INT08", name="Hospital H01 Backup Water",
        description="Independent water supply for City General Hospital",
        target_asset="H01", intervention_type="backup_water",
        cost=20, implementation_time=480,
        adds_backup=True, backup_capacity=45,
    ),
    Intervention(
        id="INT09", name="Power Grid Hardening",
        description="Harden South Power Grid against environmental threats",
        target_asset="P03", intervention_type="harden",
        cost=90, implementation_time=2880,
        capacity_improvement=20, adds_backup=True, backup_capacity=35,
    ),
    Intervention(
        id="INT10", name="Road R01 Express Upgrade",
        description="Upgrade Central Main Road to express capacity",
        target_asset="R01", intervention_type="upgrade",
        cost=45, implementation_time=4320,
        capacity_improvement=35,
    ),
]


class InterventionPlanner:
    """Evaluates interventions and optimizes budget allocation."""

    def __init__(self, infra_graph: InfrastructureGraph):
        self.graph = infra_graph
        self.interventions = list(INTERVENTION_TEMPLATES)

    def get_available_interventions(self) -> List[Dict[str, Any]]:
        """Get list of available interventions with details."""
        return [
            {
                "id": i.id,
                "name": i.name,
                "description": i.description,
                "target_asset": i.target_asset,
                "target_asset_name": self.graph.assets.get(i.target_asset, None)
                    and self.graph.assets[i.target_asset].name or i.target_asset,
                "intervention_type": i.intervention_type,
                "cost": i.cost,
                "implementation_time": i.implementation_time,
                "capacity_improvement": i.capacity_improvement,
                "adds_backup": i.adds_backup,
                "backup_capacity": i.backup_capacity,
            }
            for i in self.interventions
        ]

    def evaluate_intervention(
        self,
        intervention_ids: List[str],
        failure_scenario: List[str],
        degradation_levels: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        """Evaluate one or more interventions against a failure scenario.

        Returns before/after comparison.
        """
        # Run baseline simulation
        baseline_engine = CascadeEngine(self.graph)
        baseline_result = baseline_engine.simulate_failure(
            failure_scenario, degradation_levels, "Baseline"
        )

        # Apply interventions to a modified graph
        selected = [i for i in self.interventions if i.id in intervention_ids]
        if not selected:
            return {
                "error": "No valid interventions selected",
                "baseline": baseline_result,
            }

        # Create modified graph with interventions applied
        modified_graph = self._apply_interventions(selected)

        # Run simulation on modified graph
        modified_engine = CascadeEngine(modified_graph)
        modified_result = modified_engine.simulate_failure(
            failure_scenario, degradation_levels, "With Interventions"
        )

        total_cost = sum(i.cost for i in selected)
        improvement = baseline_result.impact_score - modified_result.impact_score
        improvement_pct = (improvement / max(baseline_result.impact_score, 0.1)) * 100

        pop_protected = baseline_result.affected_population - modified_result.affected_population

        return {
            "interventions_applied": [
                {"id": i.id, "name": i.name, "cost": i.cost, "target": i.target_asset}
                for i in selected
            ],
            "total_cost": total_cost,
            "baseline_impact": baseline_result.impact_score,
            "modified_impact": modified_result.impact_score,
            "improvement": round(improvement, 1),
            "improvement_pct": round(improvement_pct, 1),
            "population_protected": max(pop_protected, 0),
            "baseline_result": baseline_result,
            "modified_result": modified_result,
        }

    def optimize_budget(
        self,
        budget: float,
        failure_scenario: List[str],
        degradation_levels: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        """Find optimal combination of interventions within budget.

        Solves a multi-objective knapsack optimization problem:
        1. Maximizes direct cascade impact reduction
        2. Maximizes population protection & capacity hardening
        3. Strictly adheres to budget <= limit
        """
        from itertools import combinations

        # Run baseline
        baseline_engine = CascadeEngine(self.graph)
        baseline_result = baseline_engine.simulate_failure(
            failure_scenario, degradation_levels, "Baseline"
        )

        affordable = [i for i in self.interventions if i.cost <= budget]
        if not affordable:
            return {
                "budget": budget,
                "message": f"No interventions available under ₹{budget} Cr.",
                "baseline_impact": baseline_result.impact_score,
                "selected_interventions": [],
                "total_cost": 0.0,
                "remaining_budget": budget,
                "improvement": 0.0,
                "improvement_pct": 0.0,
                "population_protected": 0,
                "reasoning": "Budget is too low to fund any capital interventions.",
            }

        best_combo: List[Intervention] = []
        best_score = -1.0
        best_improvement = 0.0
        best_result = baseline_result

        # Test combinations up to budget
        # Sort affordable by cost-effectiveness to prune efficiently
        for r in range(1, min(len(affordable) + 1, 6)):
            for combo in combinations(affordable, r):
                total_cost = sum(i.cost for i in combo)
                if total_cost > budget:
                    continue

                # Apply and simulate
                modified_graph = self._apply_interventions(list(combo))
                engine = CascadeEngine(modified_graph)
                result = engine.simulate_failure(
                    failure_scenario, degradation_levels, "Optimized"
                )

                impact_reduction = max(baseline_result.impact_score - result.impact_score, 0.0)
                pop_diff = max(baseline_result.affected_population - result.affected_population, 0)

                # Multi-objective knapsack score:
                # Direct impact reduction (heavy weight) + secondary population protected + capacity/backup bonus
                capacity_bonus = sum(i.capacity_improvement + (i.backup_capacity if i.adds_backup else 0) for i in combo)
                score = (impact_reduction * 1000.0) + (pop_diff * 0.01) + (capacity_bonus * 2.0) - (total_cost * 0.1)

                if score > best_score:
                    best_score = score
                    best_improvement = impact_reduction
                    best_combo = list(combo)
                    best_result = result

        if not best_combo:
            # Fallback to single cheapest affordable
            cheapest = min(affordable, key=lambda x: x.cost)
            best_combo = [cheapest]
            modified_graph = self._apply_interventions(best_combo)
            engine = CascadeEngine(modified_graph)
            best_result = engine.simulate_failure(failure_scenario, degradation_levels, "Optimized")
            best_improvement = max(baseline_result.impact_score - best_result.impact_score, 0.0)

        total_cost = sum(i.cost for i in best_combo)
        pop_protected = max(baseline_result.affected_population - best_result.affected_population, 0)
        improvement_pct = (best_improvement / max(baseline_result.impact_score, 0.1)) * 100 if best_improvement > 0 else 0.0

        # Build human-readable reasoning
        reasons = []
        for i in best_combo:
            tname = self.graph.assets.get(i.target_asset)
            target_label = tname.name if tname else i.target_asset
            if i.target_asset in failure_scenario:
                reasons.append(f"{i.name}: Directly hardens failure corridor {target_label} (+{i.capacity_improvement}% cap)")
            elif i.adds_backup:
                reasons.append(f"{i.name}: Provides independent backup lifeline for {target_label}")
            else:
                reasons.append(f"{i.name}: Absorbs spillover stress and reinforces {target_label}")

        reasoning_text = "; ".join(reasons)

        return {
            "budget": budget,
            "selected_interventions": [
                {
                    "id": i.id,
                    "name": i.name,
                    "cost": i.cost,
                    "target": i.target_asset,
                    "target_name": self.graph.assets.get(i.target_asset, None)
                        and self.graph.assets[i.target_asset].name or i.target_asset,
                    "description": i.description,
                }
                for i in best_combo
            ],
            "total_cost": total_cost,
            "remaining_budget": round(budget - total_cost, 1),
            "baseline_impact": baseline_result.impact_score,
            "optimized_impact": best_result.impact_score,
            "improvement": round(best_improvement, 1),
            "improvement_pct": round(improvement_pct, 1),
            "population_protected": pop_protected,
            "reasoning": reasoning_text,
            "baseline_result": baseline_result,
            "optimized_result": best_result,
        }

    def _apply_interventions(self, interventions: List[Intervention]) -> InfrastructureGraph:
        """Create a modified graph with interventions applied."""
        new_assets = []
        for asset in self.graph.assets.values():
            a = asset.model_copy(deep=True)
            new_assets.append(a)

        new_edges = [e.model_copy(deep=True) for e in self.graph.edges]
        asset_map = {a.id: a for a in new_assets}

        for intervention in interventions:
            target = asset_map.get(intervention.target_asset)
            if target:
                if intervention.capacity_improvement > 0:
                    target.capacity = min(target.capacity + intervention.capacity_improvement, 200)
                    target.condition = min(target.condition + intervention.capacity_improvement * 0.5, 100)

                if intervention.adds_backup:
                    target.backup_available = True
                    target.backup_capacity = max(target.backup_capacity, intervention.backup_capacity)

                # Reduce vulnerability to environmental hazards
                for k in target.vulnerability_factors:
                    target.vulnerability_factors[k] *= 0.4

            # Handle alternate route construction
            if intervention.adds_alternate_route and intervention.alternate_route_from and intervention.alternate_route_to:
                new_edges.append(Edge(
                    source=intervention.alternate_route_from,
                    target=intervention.alternate_route_to,
                    relationship_type=RelationshipType.TRANSPORT,
                    capacity=90.0,
                    distance=3.0,
                    travel_time=4.5,
                    dependency_strength=1.0,
                    status=AssetStatus.OPERATIONAL,
                    current_load=0.0,
                    bidirectional=True,
                ))

        return InfrastructureGraph(new_assets, new_edges)

