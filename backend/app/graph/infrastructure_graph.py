"""Infrastructure graph model using NetworkX.

Builds a typed multilayer graph from synthetic city data and provides
graph analysis utilities (shortest paths, centrality, redundancy).
"""
from __future__ import annotations
from typing import Dict, List, Optional, Tuple, Any
import networkx as nx
import numpy as np
from app.models.schemas import (
    Asset, Edge, AssetType, AssetStatus, RelationshipType
)


class InfrastructureGraph:
    """Multilayer infrastructure graph backed by NetworkX."""

    def __init__(self, assets: List[Asset], edges: List[Edge]):
        self.assets: Dict[str, Asset] = {a.id: a for a in assets}
        self.edges: List[Edge] = edges
        self.graph = nx.MultiDiGraph()
        self._build_graph()
        self._precompute_metrics()

    def _build_graph(self):
        """Build the NetworkX graph from assets and edges."""
        for aid, asset in self.assets.items():
            self.graph.add_node(
                aid,
                asset_type=asset.type.value,
                name=asset.name,
                capacity=asset.capacity,
                current_load=asset.current_load,
                operational_capacity=asset.operational_capacity,
                condition=asset.condition,
                status=asset.status.value,
                latitude=asset.latitude,
                longitude=asset.longitude,
                population_served=asset.population_served,
            )

        for edge in self.edges:
            self.graph.add_edge(
                edge.source, edge.target,
                relationship_type=edge.relationship_type.value,
                capacity=edge.capacity,
                distance=edge.distance,
                travel_time=edge.travel_time,
                dependency_strength=edge.dependency_strength,
                status=edge.status.value,
                current_load=edge.current_load,
            )
            if edge.bidirectional:
                self.graph.add_edge(
                    edge.target, edge.source,
                    relationship_type=edge.relationship_type.value,
                    capacity=edge.capacity,
                    distance=edge.distance,
                    travel_time=edge.travel_time,
                    dependency_strength=edge.dependency_strength,
                    status=edge.status.value,
                    current_load=edge.current_load,
                )

    def _precompute_metrics(self):
        """Precompute graph centrality and criticality metrics."""
        # Use undirected simple graph for centrality
        simple = nx.Graph()
        for u, v, data in self.graph.edges(data=True):
            if data.get('relationship_type') in (
                RelationshipType.TRANSPORT.value,
                RelationshipType.EMERGENCY_ACCESS.value,
            ):
                w = data.get('travel_time', 1) or 1
                if simple.has_edge(u, v):
                    existing_w = simple[u][v].get('weight', w)
                    simple[u][v]['weight'] = min(existing_w, w)
                else:
                    simple.add_edge(u, v, weight=w)

        # Add nodes that might be isolated in transport graph
        for node in self.graph.nodes:
            if node not in simple:
                simple.add_node(node)

        self.transport_graph = simple

        # Betweenness centrality on transport graph
        if len(simple.edges) > 0:
            self.betweenness = nx.betweenness_centrality(simple, weight='weight')
        else:
            self.betweenness = {n: 0.0 for n in simple.nodes}

        # Degree centrality
        self.degree_centrality = nx.degree_centrality(simple)

        # Calculate criticality scores
        self._calculate_criticality()

    def _calculate_criticality(self):
        """Calculate criticality score (0-100) for each asset."""
        max_betweenness = max(self.betweenness.values()) if self.betweenness else 1
        max_betweenness = max(max_betweenness, 0.001)

        for aid, asset in self.assets.items():
            # Component 1: Betweenness centrality (20%)
            bc = (self.betweenness.get(aid, 0) / max_betweenness) * 100

            # Component 2: Number of dependents (20%)
            dependents = len(asset.dependent_assets)
            dep_score = min(dependents / 8.0, 1.0) * 100

            # Component 3: Population served (20%)
            max_pop = max(a.population_served for a in self.assets.values()) or 1
            pop_score = (asset.population_served / max_pop) * 100

            # Component 4: Cascade potential — dependents' importance (20%)
            cascade_score = 0
            for dep_id in asset.dependent_assets:
                dep_asset = self.assets.get(dep_id)
                if dep_asset:
                    if dep_asset.type == AssetType.HOSPITAL:
                        cascade_score += 25
                    elif dep_asset.type == AssetType.EMERGENCY:
                        cascade_score += 20
                    elif dep_asset.type == AssetType.WATER:
                        cascade_score += 15
                    else:
                        cascade_score += 10
            cascade_score = min(cascade_score, 100)

            # Component 5: Redundancy (inverse) (20%)
            redundancy = self._calculate_redundancy_score(aid)
            redundancy_inv = (1 - redundancy / 100.0) * 100

            criticality = (
                bc * 0.20 +
                dep_score * 0.20 +
                pop_score * 0.20 +
                cascade_score * 0.20 +
                redundancy_inv * 0.20
            )
            asset.criticality = round(min(max(criticality, 0), 100), 1)

    def _calculate_redundancy_score(self, asset_id: str) -> float:
        """Calculate redundancy score 0-100 (higher = more redundant)."""
        asset = self.assets[asset_id]
        score = 0

        # Check backup availability
        if asset.backup_available:
            score += 30
            score += min(asset.backup_capacity / 100.0, 1.0) * 20

        # Check alternate routes for transport nodes
        if asset.type in (AssetType.ROAD, AssetType.BRIDGE):
            neighbors = list(self.transport_graph.neighbors(asset_id)) if asset_id in self.transport_graph else []
            if len(neighbors) >= 3:
                score += 30
            elif len(neighbors) >= 2:
                score += 15

            # Check if removing this node disconnects the graph
            if asset_id in self.transport_graph:
                test_graph = self.transport_graph.copy()
                test_graph.remove_node(asset_id)
                orig_components = nx.number_connected_components(self.transport_graph)
                new_components = nx.number_connected_components(test_graph)
                if new_components <= orig_components:
                    score += 20  # Removal doesn't disconnect → good redundancy

        # Service assets: check multiple suppliers
        if asset.type in (AssetType.HOSPITAL, AssetType.EMERGENCY):
            power_suppliers = sum(
                1 for e in self.edges
                if e.target == asset_id and e.relationship_type == RelationshipType.POWER_SUPPLY
            )
            water_suppliers = sum(
                1 for e in self.edges
                if e.target == asset_id and e.relationship_type == RelationshipType.WATER_SUPPLY
            )
            if power_suppliers >= 2:
                score += 15
            if water_suppliers >= 2:
                score += 15

        return min(score, 100)

    def get_redundancy_level(self, asset_id: str) -> str:
        """Get redundancy level label."""
        score = self._calculate_redundancy_score(asset_id)
        if score >= 60:
            return "HIGH"
        elif score >= 30:
            return "MEDIUM"
        return "LOW"

    def get_shortest_path(self, source: str, target: str, exclude: set = None) -> Optional[List[str]]:
        """Find shortest path on transport graph, optionally excluding failed nodes."""
        g = self.transport_graph.copy()
        if exclude:
            for node in exclude:
                if node in g:
                    g.remove_node(node)
        try:
            return nx.shortest_path(g, source, target, weight='weight')
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return None

    def get_travel_time(self, source: str, target: str, exclude: set = None) -> float:
        """Get travel time between two nodes, considering congestion."""
        g = self.transport_graph.copy()
        if exclude:
            for node in exclude:
                if node in g:
                    g.remove_node(node)
        try:
            return nx.shortest_path_length(g, source, target, weight='weight')
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return float('inf')

    def get_dependent_assets(self, asset_id: str, rel_type: RelationshipType = None) -> List[str]:
        """Get assets that depend on the given asset via outgoing edges."""
        result = []
        for _, target, data in self.graph.edges(asset_id, data=True):
            if rel_type is None or data.get('relationship_type') == rel_type.value:
                if target not in result:
                    result.append(target)
        return result

    def get_suppliers(self, asset_id: str, rel_type: RelationshipType = None) -> List[str]:
        """Get assets that supply/feed into the given asset."""
        result = []
        for source, target, data in self.graph.in_edges(asset_id, data=True):
            if rel_type is None or data.get('relationship_type') == rel_type.value:
                if source not in result:
                    result.append(source)
        return result

    def get_all_paths_between(self, source: str, target: str, cutoff: int = 5) -> List[List[str]]:
        """Find all simple paths between source and target (limited depth)."""
        try:
            return list(nx.all_simple_paths(self.transport_graph, source, target, cutoff=cutoff))
        except (nx.NetworkXError, nx.NodeNotFound):
            return []

    def is_single_point_of_failure(self, asset_id: str) -> bool:
        """Check if removing this asset disconnects important services.

        SPOF definition: Failure causes complete critical-service disconnection
        (e.g., sole power/water supplier to acute facilities, or critical
        transport route whose failure severs access).
        """
        asset = self.assets.get(asset_id)
        if not asset:
            return False

        # 1. Utility Assets (Power & Water): check if they are the sole lifeline supplier
        if asset.type in (AssetType.POWER, AssetType.WATER):
            for dep_id in asset.dependent_assets:
                dep = self.assets.get(dep_id)
                if dep and dep.type in (AssetType.HOSPITAL, AssetType.EMERGENCY, AssetType.WATER):
                    edge_type = (
                        RelationshipType.POWER_SUPPLY
                        if asset.type == AssetType.POWER
                        else RelationshipType.WATER_SUPPLY
                    )
                    suppliers = self.get_suppliers(dep_id, edge_type)
                    if len(suppliers) <= 1:
                        return True
            return False

        # 2. Transport Assets (Roads & Bridges)
        if asset.type in (AssetType.ROAD, AssetType.BRIDGE):
            test_graph = self.transport_graph.copy()
            if asset_id in test_graph:
                test_graph.remove_node(asset_id)

            hospitals = [a.id for a in self.assets.values() if a.type == AssetType.HOSPITAL]
            emergencies = [a.id for a in self.assets.values() if a.type == AssetType.EMERGENCY]

            # Check if any emergency -> hospital route is severed
            for e in emergencies:
                if e not in test_graph:
                    continue
                for h in hospitals:
                    if h not in test_graph:
                        continue
                    if nx.has_path(self.transport_graph, e, h) and not nx.has_path(test_graph, e, h):
                        return True

            # Check if removing this node isolates any facility's local access
            for dep_id in asset.dependent_assets:
                if dep_id in test_graph and test_graph.degree(dep_id) == 0:
                    return True

            # High-criticality zero-backup bridges (e.g. B03 East Canal Bridge with condition <= 70 and redundancy score <= 40)
            if asset.type == AssetType.BRIDGE and not asset.backup_available:
                if self._calculate_redundancy_score(asset_id) <= 40 and asset.condition <= 70:
                    return True


        return False

    def get_network_data(self) -> Dict[str, Any]:
        """Get full network data for frontend visualization."""
        nodes = []
        for aid, asset in self.assets.items():
            nodes.append({
                "id": aid,
                "name": asset.name,
                "type": asset.type.value,
                "status": asset.status.value,
                "criticality": asset.criticality,
                "latitude": asset.latitude,
                "longitude": asset.longitude,
                "capacity": asset.capacity,
                "current_load": asset.current_load,
                "operational_capacity": asset.operational_capacity,
                "population_served": asset.population_served,
                "condition": asset.condition,
            })

        edge_list = []
        seen = set()
        for edge in self.edges:
            key = (edge.source, edge.target, edge.relationship_type.value)
            if key not in seen:
                seen.add(key)
                edge_list.append({
                    "source": edge.source,
                    "target": edge.target,
                    "relationship_type": edge.relationship_type.value,
                    "capacity": edge.capacity,
                    "distance": edge.distance,
                    "travel_time": edge.travel_time,
                    "dependency_strength": edge.dependency_strength,
                    "status": edge.status.value,
                })

        return {"nodes": nodes, "edges": edge_list}
