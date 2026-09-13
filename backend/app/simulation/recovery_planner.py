"""Recovery simulation and prioritization.

Models the repair/recovery process after cascade failure and recommends
optimal repair order based on criticality, population impact, and
cascade suppression potential.
"""
from __future__ import annotations
from typing import Dict, List, Any, Optional, Set
from app.models.schemas import (
    Asset, AssetType, AssetStatus, Edge, RelationshipType,
    CascadeEvent, SimulationResult
)
from app.graph.infrastructure_graph import InfrastructureGraph


class RecoveryPlanner:
    """Plans and simulates infrastructure recovery."""

    def __init__(self, infra_graph: InfrastructureGraph):
        self.graph = infra_graph

    def plan_recovery(
        self,
        simulation_result: dict,
        recovery_speed: float = 1.0,  # multiplier
    ) -> Dict[str, Any]:
        """Generate an optimal recovery plan from simulation results.

        Args:
            simulation_result: The result from a cascade simulation
            recovery_speed: Speed multiplier (1.0 = normal, 2.0 = fast, 0.5 = slow)
        """
        asset_states = simulation_result.get("asset_states", {})

        # Find all affected assets
        affected = []
        for aid, state in asset_states.items():
            if state.get("status") in ("FAILED", "CRITICAL", "IMPACTED", "WARNING"):
                asset = self.graph.assets.get(aid)
                if asset:
                    # Repair cost derived from replacement cost
                    repair_cost = round(max(asset.replacement_cost * 0.12, 2.5), 1)
                    affected.append({
                        "id": aid,
                        "asset_id": aid,
                        "name": state.get("name", asset.name),
                        "asset_name": state.get("name", asset.name),
                        "type": state.get("type", asset.type.value),
                        "asset_type": state.get("type", asset.type.value),
                        "status": state.get("status"),
                        "current_capacity": state.get("operational_capacity", 0.0),
                        "repair_time": max(round(asset.repair_time / max(recovery_speed, 0.1), 1), 1.0),
                        "cost": repair_cost,
                        "criticality": asset.criticality,
                        "population_served": asset.population_served,
                        "cascade_level": state.get("cascade_level", 0),
                    })

        if not affected:
            return {
                "message": "All infrastructure assets are fully operational. No repairs needed.",
                "recovery_order": [],
                "total_recovery_time": 0.0,
                "total_cost": 0.0,
                "recovery_timeline": [],
                "service_restoration": {},
                "recovery_speed": recovery_speed,
                "affected_count": 0,
            }

        # Score each asset for recovery priority
        for item in affected:
            # Power & water utilities prioritized first (lifeline dependencies)
            type_weight = {
                "POWER": 35,     # Power first — hospitals, water, transport need power
                "WATER": 30,     # Water next
                "BRIDGE": 25,    # Bridge bottlenecks next
                "ROAD": 18,
                "EMERGENCY": 22, # Emergency stations
                "HOSPITAL": 20,  # Hospitals
            }
            type_score = type_weight.get(item["asset_type"], 10)

            # Cascade suppression: root cause failures (level 0) receive major bonus
            cascade_score = max(0, 30 - item["cascade_level"] * 10)

            # Population factor
            max_pop = max(a["population_served"] for a in affected) if affected else 1
            pop_score = (item["population_served"] / max(max_pop, 1)) * 20

            item["recovery_priority"] = round(
                item["criticality"] * 0.35 +
                type_score +
                cascade_score +
                pop_score, 1
            )
            item["priority_score"] = item["recovery_priority"]

            # Reasons for priority
            reasons = []
            if item["asset_type"] in ("POWER", "WATER"):
                reasons.append(f"Essential lifeline utility — supplies multiple acute services")
            if item["cascade_level"] == 0:
                reasons.append("Root trigger of failure cascade")
            if item["criticality"] > 70:
                reasons.append(f"High network criticality ({item['criticality']:.1f})")
            if item["population_served"] > 200000:
                reasons.append(f"Protects {item['population_served']:,} citizens")
            if item["asset_type"] == "BRIDGE":
                reasons.append("Metropolitan transport bottleneck")
            if item["asset_type"] == "EMERGENCY":
                reasons.append("Emergency rescue & response lifeline")
            item["priority_reason"] = "; ".join(reasons) if reasons else "Standard restoration sequence"

        # Topological sort order: utilities and lower cascade levels first
        recovery_order = sorted(affected, key=lambda x: x["recovery_priority"], reverse=True)

        # Build chronological timeline with dependency tracking
        current_time = 0.0
        timeline = []
        cumulative_cost = 0.0
        restored_so_far = set()

        for i, item in enumerate(recovery_order):
            start_time = current_time
            end_time = round(current_time + item["repair_time"], 1)
            cumulative_cost += item["cost"]

            # Find which dependent assets are cleared/unblocked by repairing this asset
            cleared = []
            aid = item["asset_id"]
            if aid in self.graph.assets:
                for dep_id in self.graph.assets[aid].dependent_assets:
                    dep_state = asset_states.get(dep_id)
                    if dep_state and dep_state.get("status") in ("FAILED", "CRITICAL", "IMPACTED"):
                        dep_name = dep_state.get("name", dep_id)
                        cleared.append(f"{dep_name} ({dep_id})")

            item["order"] = i + 1
            item["start_time"] = round(start_time, 1)
            item["end_time"] = round(end_time, 1)
            item["dependencies_cleared"] = cleared[:3]
            item["population_restored"] = item["population_served"]

            timeline.append({
                "order": i + 1,
                "asset_id": item["asset_id"],
                "asset_name": item["asset_name"],
                "asset_type": item["asset_type"],
                "start_time": round(start_time, 1),
                "end_time": round(end_time, 1),
                "repair_duration": round(item["repair_time"], 1),
                "recovery_priority": item["recovery_priority"],
                "priority_score": item["recovery_priority"],
                "priority_reason": item["priority_reason"],
                "status_before": item["status"],
                "capacity_before": item["current_capacity"],
                "cost": item["cost"],
                "dependencies_cleared": cleared[:3],
            })

            restored_so_far.add(aid)

            # Sequential repair with 25% parallel overlap between independent sectors
            if i > 0 and item["asset_type"] != recovery_order[i-1]["asset_type"]:
                current_time = round(start_time + item["repair_time"] * 0.75, 1)
            else:
                current_time = end_time

        total_time = max(t["end_time"] for t in timeline) if timeline else 0.0
        total_cost = round(sum(item["cost"] for item in recovery_order), 1)

        # Service restoration milestones
        service_restoration = {}
        for entry in timeline:
            atype = entry["asset_type"]
            if atype == "POWER" and "power" not in service_restoration:
                service_restoration["power"] = entry["end_time"]
            elif atype == "WATER" and "water" not in service_restoration:
                service_restoration["water"] = entry["end_time"]
            elif atype == "EMERGENCY" and "emergency" not in service_restoration:
                service_restoration["emergency"] = entry["end_time"]
            elif atype == "HOSPITAL" and "hospital" not in service_restoration:
                service_restoration["hospital"] = entry["end_time"]

        service_restoration["full_recovery"] = total_time

        return {
            "recovery_order": recovery_order,
            "total_recovery_time": round(total_time, 1),
            "total_cost": total_cost,
            "recovery_timeline": timeline,
            "service_restoration": service_restoration,
            "recovery_speed": recovery_speed,
            "affected_count": len(affected),
        }

    def execute_recovery_step(
        self,
        simulation_result: dict,
        step_number: Optional[int] = None,
        asset_ids: Optional[List[str]] = None,
        restore_all: bool = False,
        recovery_speed: float = 1.0,
    ) -> Dict[str, Any]:
        """Execute recovery action and update simulation state.

        Respects dependency hierarchy: if an asset's power/water suppliers
        are still down, the asset cannot fully recover to 100% capacity.
        """
        import copy
        result_copy = copy.deepcopy(simulation_result)
        asset_states = result_copy.get("asset_states", {})

        # Compute optimal recovery plan
        plan = self.plan_recovery(simulation_result, recovery_speed)
        order = plan.get("recovery_order", [])

        if not order:
            return {
                "message": "No repairs required. Infrastructure is fully operational.",
                "restored_asset_ids": [],
                "simulation_result": result_copy,
                "is_fully_restored": True,
            }

        # Determine which assets to restore in this step
        targets_to_restore: List[Dict[str, Any]] = []
        if restore_all:
            targets_to_restore = order
        elif asset_ids:
            target_set = set(asset_ids)
            targets_to_restore = [item for item in order if item["asset_id"] in target_set]
        elif step_number is not None:
            # Restore the specified step index (1-indexed)
            if 1 <= step_number <= len(order):
                targets_to_restore = [order[step_number - 1]]
            else:
                targets_to_restore = [order[0]]
        else:
            # Default: restore the next single highest-priority asset
            targets_to_restore = [order[0]]

        restored_ids = []
        restored_names = []

        for target in targets_to_restore:
            aid = target["asset_id"]
            if aid not in asset_states:
                continue

            orig_asset = self.graph.assets.get(aid)
            if not orig_asset:
                continue

            # Dependency verification: check if essential utility suppliers are operational
            has_power_dep = False
            power_available = True
            for edge in self.graph.edges:
                if edge.target == aid and edge.relationship_type == RelationshipType.POWER_SUPPLY:
                    has_power_dep = True
                    supplier_state = asset_states.get(edge.source, {})
                    if supplier_state.get("status") in ("FAILED", "CRITICAL"):
                        power_available = False

            has_water_dep = False
            water_available = True
            for edge in self.graph.edges:
                if edge.target == aid and edge.relationship_type == RelationshipType.WATER_SUPPLY:
                    has_water_dep = True
                    supplier_state = asset_states.get(edge.source, {})
                    if supplier_state.get("status") in ("FAILED", "CRITICAL"):
                        water_available = False

            # Determine restored capacity
            if (has_power_dep and not power_available) or (has_water_dep and not water_available):
                # Partial restoration due to upstream utility bottleneck
                backup_cap = orig_asset.backup_capacity if orig_asset.backup_available else 35.0
                restored_cap = max(backup_cap, 40.0)
                restored_status = AssetStatus.WARNING.value
                reason = "Partially restored (awaiting upstream utility supplier recovery)"
            else:
                restored_cap = 100.0
                restored_status = AssetStatus.OPERATIONAL.value
                reason = None

            # Update asset state in simulation result
            asset_states[aid]["operational_capacity"] = restored_cap
            asset_states[aid]["status"] = restored_status
            asset_states[aid]["failure_cause"] = None
            asset_states[aid]["failure_reason"] = reason

            restored_ids.append(aid)
            restored_names.append(asset_states[aid].get("name", aid))

        # Re-evaluate dependent assets that may now regain capacity
        for aid, state in asset_states.items():
            if state.get("status") in ("WARNING", "IMPACTED"):
                orig_asset = self.graph.assets.get(aid)
                if not orig_asset:
                    continue
                # Check if all suppliers are now operational
                suppliers_ok = True
                for edge in self.graph.edges:
                    if edge.target == aid and edge.relationship_type in (
                        RelationshipType.POWER_SUPPLY, RelationshipType.WATER_SUPPLY
                    ):
                        sup_state = asset_states.get(edge.source, {})
                        if sup_state.get("status") in ("FAILED", "CRITICAL"):
                            suppliers_ok = False
                if suppliers_ok and state.get("operational_capacity", 0) < 100:
                    state["operational_capacity"] = 100.0
                    state["status"] = AssetStatus.OPERATIONAL.value
                    state["failure_reason"] = None

        # Re-calculate overall metrics
        total_assets = len(asset_states)
        failed_count = sum(1 for a in asset_states.values() if a.get("status") == "FAILED")
        critical_count = sum(1 for a in asset_states.values() if a.get("status") == "CRITICAL")
        impacted_count = sum(1 for a in asset_states.values() if a.get("status") == "IMPACTED")
        warning_count = sum(1 for a in asset_states.values() if a.get("status") == "WARNING")
        operational_count = sum(1 for a in asset_states.values() if a.get("status") == "OPERATIONAL")

        hospitals = [a for a in asset_states.values() if a.get("type") == "HOSPITAL"]
        emergencies = [a for a in asset_states.values() if a.get("type") == "EMERGENCY"]
        power_stations = [a for a in asset_states.values() if a.get("type") == "POWER"]
        water_plants = [a for a in asset_states.values() if a.get("type") == "WATER"]

        total_pop = sum(self.graph.assets[aid].population_served for aid in asset_states if aid in self.graph.assets)
        affected_pop = sum(
            self.graph.assets[aid].population_served
            for aid, state in asset_states.items()
            if aid in self.graph.assets and state.get("status") in ("FAILED", "CRITICAL", "IMPACTED")
        )
        affected_pop = min(affected_pop, total_pop)

        # Recomputed Impact Score matching CascadeEngine
        degraded_count = critical_count + impacted_count + warning_count
        infra_score = min(((failed_count * 2 + degraded_count) / max(total_assets, 1)) * 100, 100)

        service_types = {"HOSPITAL", "EMERGENCY", "POWER", "WATER"}
        service_assets = [a for a in asset_states.values() if a.get("type") in service_types]
        service_score = (100.0 - (sum(a.get("operational_capacity", 100) for a in service_assets) / len(service_assets))) if service_assets else 0.0

        pop_score = (affected_pop / max(total_pop, 1)) * 100.0
        emergency_score = (100.0 - (sum(e.get("operational_capacity", 100) for e in emergencies) / len(emergencies))) if emergencies else 0.0
        hospital_score = (100.0 - (sum(h.get("operational_capacity", 100) for h in hospitals) / len(hospitals))) if hospitals else 0.0

        new_impact = round(
            infra_score * 0.25 +
            service_score * 0.25 +
            pop_score * 0.20 +
            emergency_score * 0.15 +
            hospital_score * 0.15, 1
        )
        new_impact = max(0.0, min(new_impact, 100.0))


        # Update metrics in result_copy
        result_copy["impact_score"] = new_impact
        result_copy["affected_population"] = affected_pop
        result_copy["metrics"] = {
            "total_assets": total_assets,
            "failed_count": failed_count,
            "critical_count": critical_count,
            "impacted_count": impacted_count,
            "warning_count": warning_count,
            "operational_count": operational_count,
            "cascade_depth": result_copy.get("metrics", {}).get("cascade_depth", 0),
            "avg_operational_capacity": round(
                sum(a.get("operational_capacity", 100) for a in asset_states.values()) / max(total_assets, 1), 1
            ),
        }
        hosp_cap = round(100.0 - hospital_score, 1)
        emg_cap = round(100.0 - emergency_score, 1)

        result_copy["hospital_metrics"] = {
            "total": len(hospitals),
            "operational": sum(1 for h in hospitals if h.get("status") == "OPERATIONAL"),
            "affected": sum(1 for h in hospitals if h.get("status") != "OPERATIONAL"),
            "capacity_remaining": hosp_cap,
        }
        result_copy["emergency_metrics"] = {
            "total": len(emergencies),
            "operational": sum(1 for e in emergencies if e.get("status") == "OPERATIONAL"),
            "affected": sum(1 for e in emergencies if e.get("status") != "OPERATIONAL"),
            "capacity_remaining": emg_cap,
        }

        # Append recovery restoration event to timeline
        timeline_events = result_copy.get("timeline", [])
        last_time = max([e.get("timestamp", 0) for e in timeline_events], default=0) + 10.0
        for aid in restored_ids:
            state = asset_states[aid]
            timeline_events.append({
                "timestamp": last_time,
                "asset_id": aid,
                "asset_name": state.get("name", aid),
                "event_type": "RECOVERED",
                "severity": "low",
                "cascade_level": 0,
                "details": f"Work completed by emergency crews. Restored to {state.get('operational_capacity', 100):.0f}% capacity.",
                "new_status": state.get("status"),
                "new_capacity": state.get("operational_capacity", 100),
            })
        result_copy["timeline"] = timeline_events

        is_fully_restored = (failed_count == 0 and critical_count == 0 and impacted_count == 0)

        # Generate fresh next-step plan
        next_plan = self.plan_recovery(result_copy, recovery_speed)

        return {
            "message": f"Successfully restored {len(restored_ids)} asset(s): {', '.join(restored_names)}",
            "restored_asset_ids": restored_ids,
            "restored_asset_names": restored_names,
            "simulation_result": result_copy,
            "is_fully_restored": is_fully_restored,
            "remaining_affected_count": next_plan.get("affected_count", 0),
            "next_recovery_plan": next_plan,
        }
