"""CascadeX Cascade Simulation Engine.

Implements deterministic cascade propagation with:
- Traffic redistribution using BPR volume-delay model
- Service dependency propagation (power, water)
- Emergency response time calculation
- Hospital accessibility tracking
- Causal chain recording
- Time-stepped simulation with events
"""
from __future__ import annotations
import copy
from typing import Dict, List, Optional, Set, Tuple, Any
from app.models.schemas import (
    Asset, AssetType, AssetStatus, Edge, RelationshipType,
    CascadeEvent, CausalChainLink, SimulationResult
)
from app.graph.infrastructure_graph import InfrastructureGraph


# BPR volume-delay parameters
BPR_ALPHA = 0.15
BPR_BETA = 4.0

# Time step for simulation (minutes)
TIME_STEP = 5
MAX_SIMULATION_TIME = 120  # max minutes
MAX_CASCADE_DEPTH = 10

# Capacity thresholds for state transitions
THRESHOLDS = {
    "WARNING": 80,
    "IMPACTED": 60,
    "CRITICAL": 40,
    "FAILED": 5,
}


def _get_status_from_capacity(operational_pct: float) -> AssetStatus:
    """Determine asset status from operational capacity percentage."""
    if operational_pct <= THRESHOLDS["FAILED"]:
        return AssetStatus.FAILED
    elif operational_pct <= THRESHOLDS["CRITICAL"]:
        return AssetStatus.CRITICAL
    elif operational_pct <= THRESHOLDS["IMPACTED"]:
        return AssetStatus.IMPACTED
    elif operational_pct <= THRESHOLDS["WARNING"]:
        return AssetStatus.WARNING
    return AssetStatus.OPERATIONAL


def _bpr_delay_factor(utilization: float) -> float:
    """BPR volume-delay function: factor by which travel time increases."""
    if utilization <= 0:
        return 1.0
    return 1.0 + BPR_ALPHA * (utilization ** BPR_BETA)


class CascadeEngine:
    """Core cascade simulation engine."""

    def __init__(self, infra_graph: InfrastructureGraph):
        self.original_graph = infra_graph
        # We'll work on copies during simulation
        self.assets: Dict[str, Asset] = {}
        self.events: List[CascadeEvent] = []
        self.causal_chains: Dict[str, List[CausalChainLink]] = {}
        self.cascade_levels: Dict[int, List[str]] = {}
        self.current_time: float = 0
        self.failed_assets: Set[str] = set()
        self.degraded_assets: Set[str] = set()

    def _reset(self):
        """Reset simulation state with fresh copies of assets."""
        self.assets = {}
        for aid, asset in self.original_graph.assets.items():
            a = asset.model_copy(deep=True)
            a.cascade_level = -1
            a.failure_cause = None
            a.failure_parent = None
            a.failure_reason = None
            a.status = AssetStatus.OPERATIONAL
            a.operational_capacity = 100.0
            self.assets[aid] = a
        self.events = []
        self.causal_chains = {}
        self.cascade_levels = {}
        self.current_time = 0
        self.failed_assets = set()
        self.degraded_assets = set()

    def simulate_failure(
        self,
        failed_asset_ids: List[str],
        degradation_levels: Optional[Dict[str, float]] = None,
        scenario_name: str = "Custom Scenario",
        environmental_factors: Optional[Dict[str, float]] = None,
    ) -> SimulationResult:
        """Run a complete cascade simulation.

        Args:
            failed_asset_ids: List of asset IDs to fail
            degradation_levels: Optional dict of asset_id -> remaining capacity %
            scenario_name: Name for this scenario
            environmental_factors: Optional environmental stress factors
        """
        self._reset()

        # Apply environmental factors first
        if environmental_factors:
            self._apply_environmental_factors(environmental_factors)

        # Initialize failures at t=0
        for aid in failed_asset_ids:
            if aid not in self.assets:
                continue
            remaining = 0.0
            if degradation_levels and aid in degradation_levels:
                remaining = degradation_levels[aid]
            self._fail_asset(aid, remaining, cascade_level=0,
                           cause="Initial failure",
                           parent=None,
                           reason=f"Manual failure initiated on {self.assets[aid].name}")

        # Propagation loop
        depth = 0
        while depth < MAX_CASCADE_DEPTH and self.current_time < MAX_SIMULATION_TIME:
            self.current_time += TIME_STEP
            depth += 1

            changes = 0

            # 1. Traffic redistribution
            changes += self._redistribute_traffic(depth)

            # 2. Service dependency propagation
            changes += self._propagate_dependencies(depth)

            # 3. Emergency response recalculation
            changes += self._update_emergency_response(depth)

            # 4. Hospital accessibility
            changes += self._update_hospital_accessibility(depth)

            # 5. Overload detection
            changes += self._detect_overloads(depth)

            if changes == 0:
                break

        # Build results
        return self._build_results(scenario_name, failed_asset_ids)

    def _apply_environmental_factors(self, factors: Dict[str, float]):
        """Apply environmental stress to vulnerable assets."""
        for aid, asset in self.assets.items():
            for factor_type, severity in factors.items():
                vulnerability = asset.vulnerability_factors.get(factor_type, 0)
                if vulnerability > 0:
                    capacity_reduction = vulnerability * severity * 100
                    new_cap = max(asset.operational_capacity - capacity_reduction, 0)
                    if new_cap < asset.operational_capacity:
                        old_cap = asset.operational_capacity
                        asset.operational_capacity = new_cap
                        new_status = _get_status_from_capacity(new_cap)
                        if new_status != asset.status:
                            self._record_event(
                                aid, "ENVIRONMENTAL_STRESS", "warning",
                                asset.status, new_status, old_cap, new_cap,
                                f"Environmental factor: {factor_type} (severity {severity:.0%})",
                                cascade_level=0,
                                details=f"{factor_type} reduced capacity by {capacity_reduction:.1f}%"
                            )
                            asset.status = new_status
                            if new_status in (AssetStatus.FAILED, AssetStatus.CRITICAL):
                                self.degraded_assets.add(aid)

    def _fail_asset(self, asset_id: str, remaining_capacity: float,
                    cascade_level: int, cause: str, parent: Optional[str],
                    reason: str):
        """Fail or degrade an asset and record the event."""
        asset = self.assets[asset_id]
        old_status = asset.status
        old_capacity = asset.operational_capacity

        asset.operational_capacity = remaining_capacity
        asset.status = _get_status_from_capacity(remaining_capacity)
        asset.cascade_level = cascade_level
        asset.failure_cause = cause
        asset.failure_parent = parent
        asset.failure_reason = reason

        if remaining_capacity <= THRESHOLDS["FAILED"]:
            self.failed_assets.add(asset_id)
            severity = "critical"
            event_type = "FAILED"
        elif remaining_capacity <= THRESHOLDS["CRITICAL"]:
            self.degraded_assets.add(asset_id)
            severity = "high"
            event_type = "CRITICAL"
        elif remaining_capacity <= THRESHOLDS["IMPACTED"]:
            self.degraded_assets.add(asset_id)
            severity = "medium"
            event_type = "IMPACTED"
        else:
            self.degraded_assets.add(asset_id)
            severity = "low"
            event_type = "DEGRADED"

        self._record_event(
            asset_id, event_type, severity,
            old_status, asset.status,
            old_capacity, remaining_capacity,
            cause, parent, cascade_level, reason
        )

        # Record cascade level
        if cascade_level not in self.cascade_levels:
            self.cascade_levels[cascade_level] = []
        if asset_id not in self.cascade_levels[cascade_level]:
            self.cascade_levels[cascade_level].append(asset_id)

        # Build causal chain
        self._build_causal_chain(asset_id, cascade_level, cause, old_capacity, remaining_capacity)

    def _record_event(self, asset_id: str, event_type: str, severity: str,
                      old_status: AssetStatus, new_status: AssetStatus,
                      old_cap: float, new_cap: float, cause: str,
                      parent: str = None, cascade_level: int = 0,
                      details: str = ""):
        asset = self.assets[asset_id]
        self.events.append(CascadeEvent(
            timestamp=self.current_time,
            asset_id=asset_id,
            asset_name=asset.name,
            asset_type=asset.type,
            event_type=event_type,
            severity=severity,
            previous_status=old_status,
            new_status=new_status,
            previous_capacity=old_cap,
            new_capacity=new_cap,
            cause=cause,
            parent_event_asset=parent,
            cascade_level=cascade_level,
            details=details or cause,
        ))

    def _build_causal_chain(self, asset_id: str, cascade_level: int,
                           event: str, old_cap: float, new_cap: float):
        """Build/extend causal chain for an asset."""
        asset = self.assets[asset_id]
        link = CausalChainLink(
            asset_id=asset_id,
            asset_name=asset.name,
            asset_type=asset.type,
            event=event,
            cascade_level=cascade_level,
            timestamp=self.current_time,
            capacity_change=f"{old_cap:.0f}% → {new_cap:.0f}%",
        )

        if asset_id not in self.causal_chains:
            self.causal_chains[asset_id] = []

        # If there's a parent, include parent's chain
        if asset.failure_parent and asset.failure_parent in self.causal_chains:
            if len(self.causal_chains[asset_id]) == 0:
                # Copy parent chain as prefix
                self.causal_chains[asset_id] = list(self.causal_chains[asset.failure_parent])

        self.causal_chains[asset_id].append(link)

    def _redistribute_traffic(self, depth: int) -> int:
        """Redistribute traffic when transport assets fail."""
        changes = 0
        failed_transport = {
            aid for aid in self.failed_assets
            if self.assets[aid].type in (AssetType.ROAD, AssetType.BRIDGE)
        }

        if not failed_transport:
            return 0

        # For each failed transport asset, redistribute its load to alternates
        for failed_id in failed_transport:
            failed_asset = self.assets[failed_id]
            if failed_asset.current_load <= 0:
                continue

            # Find neighboring transport nodes that are still operational
            neighbors = []
            for edge in self.original_graph.edges:
                if edge.relationship_type not in (RelationshipType.TRANSPORT, RelationshipType.EMERGENCY_ACCESS):
                    continue
                peer = None
                if edge.source == failed_id:
                    peer = edge.target
                elif edge.target == failed_id and edge.bidirectional:
                    peer = edge.source
                if peer and peer not in self.failed_assets:
                    if self.assets[peer].type in (AssetType.ROAD, AssetType.BRIDGE):
                        neighbors.append(peer)

            if not neighbors:
                continue

            # Distribute load among neighbors weighted by their remaining capacity
            total_remaining_cap = sum(
                max(self.assets[n].capacity - self.assets[n].current_load, 1)
                for n in neighbors
            )

            redistributed_load = failed_asset.current_load * 0.7  # 70% finds alternate routes
            failed_asset.current_load = 0  # failed asset no longer carries traffic

            for neighbor_id in neighbors:
                neighbor = self.assets[neighbor_id]
                remaining_cap = max(neighbor.capacity - neighbor.current_load, 1)
                share = (remaining_cap / total_remaining_cap) * redistributed_load
                old_load = neighbor.current_load
                neighbor.current_load = min(neighbor.current_load + share, neighbor.capacity * 1.5)

                # Check if this causes overload
                utilization = neighbor.current_load / max(neighbor.capacity, 1)
                if utilization > 0.9 and old_load / max(neighbor.capacity, 1) <= 0.9:
                    new_cap = max(100 - (utilization - 0.9) * 200, 20)
                    if new_cap < neighbor.operational_capacity:
                        old_op_cap = neighbor.operational_capacity
                        old_status = neighbor.status
                        neighbor.operational_capacity = new_cap
                        neighbor.status = _get_status_from_capacity(new_cap)
                        neighbor.cascade_level = depth
                        neighbor.failure_parent = failed_id
                        neighbor.failure_cause = "Traffic overload from redistribution"
                        neighbor.failure_reason = (
                            f"Traffic from {failed_asset.name} redistributed; "
                            f"utilization increased to {utilization:.0%}"
                        )
                        self.degraded_assets.add(neighbor_id)

                        self._record_event(
                            neighbor_id, "TRAFFIC_OVERLOAD", "medium",
                            old_status, neighbor.status,
                            old_op_cap, new_cap,
                            f"Traffic redistribution from {failed_asset.name}",
                            failed_id, depth,
                            f"Load increased from {old_load:.0f} to {neighbor.current_load:.0f} "
                            f"(capacity: {neighbor.capacity:.0f})"
                        )
                        self._build_causal_chain(
                            neighbor_id, depth,
                            f"Traffic overload from {failed_asset.name}",
                            old_op_cap, new_cap
                        )

                        if depth not in self.cascade_levels:
                            self.cascade_levels[depth] = []
                        if neighbor_id not in self.cascade_levels[depth]:
                            self.cascade_levels[depth].append(neighbor_id)

                        changes += 1

        return changes

    def _propagate_dependencies(self, depth: int) -> int:
        """Propagate failures through power/water dependency edges."""
        changes = 0
        affected = self.failed_assets | self.degraded_assets

        for aid in list(affected):
            asset = self.assets[aid]

            # Only propagate from power/water assets
            if asset.type not in (AssetType.POWER, AssetType.WATER):
                continue

            # Find dependent assets via edges
            for edge in self.original_graph.edges:
                if edge.source != aid:
                    continue
                if edge.relationship_type not in (
                    RelationshipType.POWER_SUPPLY,
                    RelationshipType.WATER_SUPPLY,
                ):
                    continue

                target = self.assets.get(edge.target)
                if not target:
                    continue

                # Calculate impact based on supplier's remaining capacity and dependency strength
                supplier_capacity = asset.operational_capacity / 100.0
                dep_strength = edge.dependency_strength

                # How much capacity the target loses due to this supplier's degradation
                capacity_loss = (1 - supplier_capacity) * dep_strength * 100

                # Check backup
                if target.backup_available:
                    backup_coverage = min(target.backup_capacity, capacity_loss)
                    capacity_loss = max(capacity_loss - backup_coverage, 0)

                if capacity_loss <= 5:
                    continue

                new_cap = max(target.operational_capacity - capacity_loss, 0)
                if new_cap >= target.operational_capacity - 2:
                    continue

                old_cap = target.operational_capacity
                old_status = target.status
                new_status = _get_status_from_capacity(new_cap)

                if new_status == old_status and abs(new_cap - old_cap) < 5:
                    continue

                target.operational_capacity = new_cap
                target.status = new_status
                target.cascade_level = depth
                target.failure_parent = aid

                supply_type = "Power" if edge.relationship_type == RelationshipType.POWER_SUPPLY else "Water"
                target.failure_cause = f"{supply_type} supply degradation"
                target.failure_reason = (
                    f"{asset.name} operating at {asset.operational_capacity:.0f}% capacity; "
                    f"{supply_type.lower()} supply to {target.name} reduced"
                )

                self.degraded_assets.add(edge.target)

                backup_msg = ""
                if target.backup_available:
                    backup_msg = f" (backup absorbed {min(target.backup_capacity, capacity_loss):.0f}%)"

                self._record_event(
                    edge.target, f"{supply_type.upper()}_SUPPLY_DEGRADED", "high",
                    old_status, new_status, old_cap, new_cap,
                    f"{supply_type} supply from {asset.name} degraded",
                    aid, depth,
                    f"{supply_type} supply reduced due to {asset.name} at "
                    f"{asset.operational_capacity:.0f}% capacity{backup_msg}"
                )
                self._build_causal_chain(
                    edge.target, depth,
                    f"{supply_type} supply degradation from {asset.name}",
                    old_cap, new_cap
                )

                if depth not in self.cascade_levels:
                    self.cascade_levels[depth] = []
                if edge.target not in self.cascade_levels[depth]:
                    self.cascade_levels[depth].append(edge.target)

                changes += 1

        return changes

    def _update_emergency_response(self, depth: int) -> int:
        """Update emergency station response based on road conditions."""
        changes = 0
        failed_transport = {
            aid for aid in self.failed_assets | self.degraded_assets
            if self.assets[aid].type in (AssetType.ROAD, AssetType.BRIDGE)
        }

        if not failed_transport:
            return 0

        for aid, asset in self.assets.items():
            if asset.type != AssetType.EMERGENCY:
                continue
            if asset.status == AssetStatus.FAILED:
                continue

            # Check if any connected roads are degraded
            connected_roads = []
            for edge in self.original_graph.edges:
                if edge.relationship_type != RelationshipType.EMERGENCY_ACCESS:
                    continue
                peer = None
                if edge.source == aid:
                    peer = edge.target
                elif edge.target == aid:
                    peer = edge.source
                if peer and self.assets[peer].type in (AssetType.ROAD, AssetType.BRIDGE):
                    connected_roads.append(peer)

            if not connected_roads:
                continue

            # Calculate average road condition
            total_road_capacity = 0
            for rid in connected_roads:
                total_road_capacity += self.assets[rid].operational_capacity
            avg_road_cap = total_road_capacity / len(connected_roads)

            # Emergency capacity degrades with road conditions
            road_impact = max(0, (100 - avg_road_cap) * 0.5)
            new_cap = max(asset.operational_capacity - road_impact, 10)

            if new_cap >= asset.operational_capacity - 3:
                continue

            # Only record if this is a meaningful new change
            if asset.cascade_level >= 0 and abs(new_cap - asset.operational_capacity) < 5:
                continue

            old_cap = asset.operational_capacity
            old_status = asset.status
            asset.operational_capacity = new_cap
            asset.status = _get_status_from_capacity(new_cap)

            if asset.status != old_status:
                worst_road = min(connected_roads, key=lambda r: self.assets[r].operational_capacity)
                asset.cascade_level = depth
                asset.failure_parent = worst_road
                asset.failure_cause = "Road network degradation"
                asset.failure_reason = (
                    f"Connected roads degraded (avg {avg_road_cap:.0f}% capacity); "
                    f"emergency response times increased"
                )

                self.degraded_assets.add(aid)

                self._record_event(
                    aid, "RESPONSE_TIME_INCREASED", "high",
                    old_status, asset.status, old_cap, new_cap,
                    f"Road network degradation affecting response times",
                    worst_road, depth,
                    f"Average connected road capacity: {avg_road_cap:.0f}%"
                )
                self._build_causal_chain(
                    aid, depth,
                    f"Emergency response degraded due to road conditions",
                    old_cap, new_cap
                )

                if depth not in self.cascade_levels:
                    self.cascade_levels[depth] = []
                if aid not in self.cascade_levels[depth]:
                    self.cascade_levels[depth].append(aid)

                changes += 1

        return changes

    def _update_hospital_accessibility(self, depth: int) -> int:
        """Update hospital accessibility based on road and emergency conditions."""
        changes = 0

        for aid, asset in self.assets.items():
            if asset.type != AssetType.HOSPITAL:
                continue
            if asset.status == AssetStatus.FAILED:
                continue

            # Check road accessibility
            connected_roads = []
            for edge in self.original_graph.edges:
                if edge.relationship_type != RelationshipType.EMERGENCY_ACCESS:
                    continue
                peer = None
                if edge.source == aid:
                    peer = edge.target
                elif edge.target == aid:
                    peer = edge.source
                if peer and self.assets[peer].type in (AssetType.ROAD, AssetType.BRIDGE):
                    connected_roads.append(peer)

            if connected_roads:
                best_road_cap = max(self.assets[r].operational_capacity for r in connected_roads)
                accessibility_factor = best_road_cap / 100.0
            else:
                accessibility_factor = 0.3  # Very limited if no roads

            # Combined hospital capacity = min(current, road accessibility impact)
            road_impact = max(0, (1 - accessibility_factor) * 30)
            new_cap = max(asset.operational_capacity - road_impact, 0)

            if new_cap >= asset.operational_capacity - 3:
                continue

            if asset.cascade_level >= 0 and abs(new_cap - asset.operational_capacity) < 5:
                continue

            old_cap = asset.operational_capacity
            old_status = asset.status
            asset.operational_capacity = new_cap
            asset.status = _get_status_from_capacity(new_cap)

            if asset.status != old_status:
                worst_road = min(connected_roads, key=lambda r: self.assets[r].operational_capacity) if connected_roads else None
                asset.cascade_level = depth
                asset.failure_parent = worst_road
                asset.failure_cause = "Accessibility degradation"
                asset.failure_reason = (
                    f"Road access to {asset.name} degraded; "
                    f"best road at {best_road_cap:.0f}% capacity"
                )

                self.degraded_assets.add(aid)

                self._record_event(
                    aid, "ACCESSIBILITY_DEGRADED", "high",
                    old_status, asset.status, old_cap, new_cap,
                    f"Road accessibility degradation",
                    worst_road, depth,
                    f"Best access road at {best_road_cap:.0f}% capacity"
                )
                self._build_causal_chain(
                    aid, depth,
                    f"Hospital accessibility degraded due to road conditions",
                    old_cap, new_cap
                )

                if depth not in self.cascade_levels:
                    self.cascade_levels[depth] = []
                if aid not in self.cascade_levels[depth]:
                    self.cascade_levels[depth].append(aid)

                changes += 1

        return changes

    def _detect_overloads(self, depth: int) -> int:
        """Detect and process any newly overloaded assets."""
        changes = 0

        for aid, asset in self.assets.items():
            if asset.type not in (AssetType.ROAD, AssetType.BRIDGE):
                continue
            if aid in self.failed_assets:
                continue

            utilization = asset.current_load / max(asset.capacity, 1)

            # Progressive degradation based on utilization
            if utilization > 1.2 and asset.operational_capacity > THRESHOLDS["CRITICAL"]:
                new_cap = max(THRESHOLDS["CRITICAL"] - 5, 0)
            elif utilization > 1.0 and asset.operational_capacity > THRESHOLDS["IMPACTED"]:
                new_cap = THRESHOLDS["IMPACTED"] - 5
            elif utilization > 0.95 and asset.operational_capacity > THRESHOLDS["WARNING"]:
                new_cap = THRESHOLDS["WARNING"] - 5
            else:
                continue

            if new_cap >= asset.operational_capacity:
                continue

            old_cap = asset.operational_capacity
            old_status = asset.status
            asset.operational_capacity = new_cap
            asset.status = _get_status_from_capacity(new_cap)
            asset.cascade_level = depth

            if asset.status != old_status:
                self.degraded_assets.add(aid)

                self._record_event(
                    aid, "CAPACITY_OVERLOAD", "high",
                    old_status, asset.status, old_cap, new_cap,
                    f"Capacity overload (utilization: {utilization:.0%})",
                    None, depth,
                    f"Load {asset.current_load:.0f} exceeds capacity {asset.capacity:.0f}"
                )
                self._build_causal_chain(
                    aid, depth,
                    f"Overloaded at {utilization:.0%} utilization",
                    old_cap, new_cap
                )

                if depth not in self.cascade_levels:
                    self.cascade_levels[depth] = []
                if aid not in self.cascade_levels[depth]:
                    self.cascade_levels[depth].append(aid)

                changes += 1

                # If it failed completely, it triggers further redistribution next round
                if new_cap <= THRESHOLDS["FAILED"]:
                    self.failed_assets.add(aid)

        return changes

    def _calculate_impact_score(self) -> float:
        """Calculate overall impact score (0-100)."""
        total_assets = len(self.assets)
        if total_assets == 0:
            return 0

        # 1. Infrastructure failure rate (25%)
        failed_count = len(self.failed_assets)
        degraded_count = len(self.degraded_assets)
        infra_score = min(
            ((failed_count * 2 + degraded_count) / total_assets) * 100, 100
        )

        # 2. Service disruption (25%)
        service_types = {AssetType.HOSPITAL, AssetType.EMERGENCY, AssetType.POWER, AssetType.WATER}
        service_assets = [a for a in self.assets.values() if a.type in service_types]
        if service_assets:
            avg_service_cap = sum(a.operational_capacity for a in service_assets) / len(service_assets)
            service_score = 100 - avg_service_cap
        else:
            service_score = 0

        # 3. Population affected (20%)
        total_pop = sum(a.population_served for a in self.assets.values())
        affected_pop = sum(
            a.population_served for a in self.assets.values()
            if a.status in (AssetStatus.FAILED, AssetStatus.CRITICAL, AssetStatus.IMPACTED)
        )
        pop_score = (affected_pop / max(total_pop, 1)) * 100

        # 4. Emergency response (15%)
        emergencies = [a for a in self.assets.values() if a.type == AssetType.EMERGENCY]
        if emergencies:
            avg_emergency = sum(a.operational_capacity for a in emergencies) / len(emergencies)
            emergency_score = 100 - avg_emergency
        else:
            emergency_score = 0

        # 5. Hospital accessibility (15%)
        hospitals = [a for a in self.assets.values() if a.type == AssetType.HOSPITAL]
        if hospitals:
            avg_hospital = sum(a.operational_capacity for a in hospitals) / len(hospitals)
            hospital_score = 100 - avg_hospital
        else:
            hospital_score = 0

        impact = (
            infra_score * 0.25 +
            service_score * 0.25 +
            pop_score * 0.20 +
            emergency_score * 0.15 +
            hospital_score * 0.15
        )

        return round(min(max(impact, 0), 100), 1)

    def _calculate_metrics(self) -> Dict[str, Any]:
        """Calculate comprehensive simulation metrics."""
        total_assets = len(self.assets)
        failed = [a for a in self.assets.values() if a.status == AssetStatus.FAILED]
        critical = [a for a in self.assets.values() if a.status == AssetStatus.CRITICAL]
        impacted = [a for a in self.assets.values() if a.status == AssetStatus.IMPACTED]
        warning = [a for a in self.assets.values() if a.status == AssetStatus.WARNING]
        operational = [a for a in self.assets.values() if a.status == AssetStatus.OPERATIONAL]

        total_pop = sum(a.population_served for a in self.assets.values())
        affected_pop = sum(
            a.population_served for a in self.assets.values()
            if a.status in (AssetStatus.FAILED, AssetStatus.CRITICAL, AssetStatus.IMPACTED)
        )

        hospitals = [a for a in self.assets.values() if a.type == AssetType.HOSPITAL]
        emergencies = [a for a in self.assets.values() if a.type == AssetType.EMERGENCY]
        power_stations = [a for a in self.assets.values() if a.type == AssetType.POWER]
        water_plants = [a for a in self.assets.values() if a.type == AssetType.WATER]

        return {
            "total_assets": total_assets,
            "failed_count": len(failed),
            "critical_count": len(critical),
            "impacted_count": len(impacted),
            "warning_count": len(warning),
            "operational_count": len(operational),
            "total_population": total_pop,
            "affected_population": affected_pop,
            "population_pct_affected": round(affected_pop / max(total_pop, 1) * 100, 1),
            "cascade_depth": max(self.cascade_levels.keys()) if self.cascade_levels else 0,
            "total_events": len(self.events),
            "avg_hospital_capacity": round(
                sum(h.operational_capacity for h in hospitals) / max(len(hospitals), 1), 1
            ),
            "avg_emergency_capacity": round(
                sum(e.operational_capacity for e in emergencies) / max(len(emergencies), 1), 1
            ),
            "avg_power_capacity": round(
                sum(p.operational_capacity for p in power_stations) / max(len(power_stations), 1), 1
            ),
            "avg_water_capacity": round(
                sum(w.operational_capacity for w in water_plants) / max(len(water_plants), 1), 1
            ),
            "hospitals_affected": len([h for h in hospitals if h.status != AssetStatus.OPERATIONAL]),
            "emergencies_affected": len([e for e in emergencies if e.status != AssetStatus.OPERATIONAL]),
            "power_affected": len([p for p in power_stations if p.status != AssetStatus.OPERATIONAL]),
            "water_affected": len([w for w in water_plants if w.status != AssetStatus.OPERATIONAL]),
            "status_breakdown": {
                "OPERATIONAL": len(operational),
                "WARNING": len(warning),
                "IMPACTED": len(impacted),
                "CRITICAL": len(critical),
                "FAILED": len(failed),
            },
        }

    def _build_results(self, scenario_name: str, initial_failures: List[str]) -> SimulationResult:
        """Build the complete simulation result."""
        asset_states = {}
        for aid, asset in self.assets.items():
            asset_states[aid] = {
                "id": aid,
                "name": asset.name,
                "type": asset.type.value,
                "status": asset.status.value,
                "operational_capacity": asset.operational_capacity,
                "current_load": asset.current_load,
                "cascade_level": asset.cascade_level,
                "failure_cause": asset.failure_cause,
                "failure_parent": asset.failure_parent,
                "failure_reason": asset.failure_reason,
                "population_served": asset.population_served,
                "criticality": asset.criticality,
            }

        # Build timeline
        timeline = []
        for event in sorted(self.events, key=lambda e: e.timestamp):
            timeline.append({
                "timestamp": event.timestamp,
                "asset_id": event.asset_id,
                "asset_name": event.asset_name,
                "event_type": event.event_type,
                "severity": event.severity,
                "cascade_level": event.cascade_level,
                "details": event.details,
                "new_status": event.new_status.value,
                "new_capacity": event.new_capacity,
            })

        metrics = self._calculate_metrics()
        impact_score = self._calculate_impact_score()

        # Critical assets (ranked by criticality)
        critical_assets = sorted(
            [
                {
                    "id": a.id,
                    "name": a.name,
                    "type": a.type.value,
                    "criticality": a.criticality,
                    "status": a.status.value,
                    "operational_capacity": a.operational_capacity,
                    "population_served": a.population_served,
                    "is_spof": self.original_graph.is_single_point_of_failure(a.id),
                    "redundancy": self.original_graph.get_redundancy_level(a.id),
                }
                for a in self.assets.values()
            ],
            key=lambda x: x["criticality"],
            reverse=True,
        )

        affected_pop = sum(
            a.population_served for a in self.assets.values()
            if a.status in (AssetStatus.FAILED, AssetStatus.CRITICAL, AssetStatus.IMPACTED)
        )

        hospitals = [a for a in self.assets.values() if a.type == AssetType.HOSPITAL]
        emergencies = [a for a in self.assets.values() if a.type == AssetType.EMERGENCY]

        hospital_metrics = {
            "total": len(hospitals),
            "affected": len([h for h in hospitals if h.status != AssetStatus.OPERATIONAL]),
            "avg_capacity": round(sum(h.operational_capacity for h in hospitals) / max(len(hospitals), 1), 1),
            "details": [
                {
                    "id": h.id,
                    "name": h.name,
                    "status": h.status.value,
                    "operational_capacity": h.operational_capacity,
                    "population_served": h.population_served,
                }
                for h in hospitals
            ],
        }

        emergency_metrics = {
            "total": len(emergencies),
            "affected": len([e for e in emergencies if e.status != AssetStatus.OPERATIONAL]),
            "avg_capacity": round(sum(e.operational_capacity for e in emergencies) / max(len(emergencies), 1), 1),
            "details": [
                {
                    "id": e.id,
                    "name": e.name,
                    "status": e.status.value,
                    "operational_capacity": e.operational_capacity,
                }
                for e in emergencies
            ],
        }

        # Serialize causal chains
        causal_chains_serialized = {}
        for aid, chain in self.causal_chains.items():
            causal_chains_serialized[aid] = chain

        return SimulationResult(
            scenario_name=scenario_name,
            initial_failures=initial_failures,
            simulation_duration=self.current_time,
            total_events=len(self.events),
            events=self.events,
            asset_states=asset_states,
            cascade_levels={k: v for k, v in sorted(self.cascade_levels.items())},
            metrics=metrics,
            critical_assets=critical_assets,
            affected_population=affected_pop,
            hospital_metrics=hospital_metrics,
            emergency_metrics=emergency_metrics,
            causal_chains=causal_chains_serialized,
            impact_score=impact_score,
            timeline=timeline,
        )
