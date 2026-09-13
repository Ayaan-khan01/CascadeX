"""Synthetic city generator for CascadeX.

Generates a deterministic, realistic synthetic urban infrastructure network
with roads, bridges, hospitals, power stations, water plants, and emergency stations.
Uses seed=42 for reproducibility.
"""
from __future__ import annotations
import random
from typing import List, Tuple
from app.models.schemas import Asset, AssetType, AssetStatus, Edge, RelationshipType

SEED = 42

# Center of our synthetic city (fictional coordinates near ~19.0°N, 72.8°E — Mumbai-ish area)
CENTER_LAT = 19.076
CENTER_LNG = 72.878


def _jitter(base: float, scale: float = 0.01, rng: random.Random = None) -> float:
    return base + rng.uniform(-scale, scale)


def generate_synthetic_city() -> Tuple[List[Asset], List[Edge]]:
    """Generate the complete synthetic city with all assets and edges."""
    rng = random.Random(SEED)
    assets: List[Asset] = []
    edges: List[Edge] = []

    # ============================================================
    # POWER STATIONS (3) — placed in different zones
    # ============================================================
    power_stations = [
        Asset(
            id="P01", name="Central Power Station", type=AssetType.POWER,
            latitude=CENTER_LAT + 0.025, longitude=CENTER_LNG - 0.015,
            capacity=100, current_load=72, operational_capacity=100,
            condition=90, replacement_cost=500, repair_time=72,
            population_served=450000, service_radius=8.0,
            backup_available=True, backup_capacity=40,
            vulnerability_factors={"flooding": 0.3, "storm": 0.2},
        ),
        Asset(
            id="P02", name="North Power Plant", type=AssetType.POWER,
            latitude=CENTER_LAT + 0.045, longitude=CENTER_LNG + 0.01,
            capacity=80, current_load=55, operational_capacity=100,
            condition=85, replacement_cost=400, repair_time=60,
            population_served=280000, service_radius=6.0,
            backup_available=True, backup_capacity=30,
            vulnerability_factors={"flooding": 0.2, "storm": 0.3},
        ),
        Asset(
            id="P03", name="South Power Grid", type=AssetType.POWER,
            latitude=CENTER_LAT - 0.035, longitude=CENTER_LNG + 0.005,
            capacity=70, current_load=60, operational_capacity=100,
            condition=75, replacement_cost=350, repair_time=48,
            population_served=220000, service_radius=5.0,
            backup_available=False, backup_capacity=0,
            vulnerability_factors={"flooding": 0.4, "extreme_heat": 0.3},
        ),
    ]
    assets.extend(power_stations)

    # ============================================================
    # WATER TREATMENT PLANTS (3)
    # ============================================================
    water_plants = [
        Asset(
            id="W01", name="Main Water Treatment Plant", type=AssetType.WATER,
            latitude=CENTER_LAT + 0.015, longitude=CENTER_LNG + 0.03,
            capacity=100, current_load=68, operational_capacity=100,
            condition=88, replacement_cost=600, repair_time=96,
            population_served=500000, service_radius=10.0,
            backup_available=True, backup_capacity=35,
            dependencies=["P01"],
            vulnerability_factors={"flooding": 0.5, "landslide": 0.2},
        ),
        Asset(
            id="W02", name="East Water Facility", type=AssetType.WATER,
            latitude=CENTER_LAT - 0.01, longitude=CENTER_LNG + 0.04,
            capacity=70, current_load=50, operational_capacity=100,
            condition=80, replacement_cost=350, repair_time=72,
            population_served=300000, service_radius=7.0,
            backup_available=False, backup_capacity=0,
            dependencies=["P03"],
            vulnerability_factors={"flooding": 0.6, "landslide": 0.3},
        ),
        Asset(
            id="W03", name="West Water Station", type=AssetType.WATER,
            latitude=CENTER_LAT + 0.005, longitude=CENTER_LNG - 0.035,
            capacity=60, current_load=40, operational_capacity=100,
            condition=92, replacement_cost=300, repair_time=48,
            population_served=200000, service_radius=5.0,
            backup_available=True, backup_capacity=25,
            dependencies=["P01"],
            vulnerability_factors={"flooding": 0.3},
        ),
    ]
    assets.extend(water_plants)

    # ============================================================
    # HOSPITALS (5)
    # ============================================================
    hospitals = [
        Asset(
            id="H01", name="City General Hospital", type=AssetType.HOSPITAL,
            latitude=CENTER_LAT + 0.008, longitude=CENTER_LNG + 0.005,
            capacity=100, current_load=75, operational_capacity=100,
            condition=85, replacement_cost=800, repair_time=168,
            population_served=350000, service_radius=6.0,
            backup_available=True, backup_capacity=50,
            dependencies=["P01", "W01"],
            vulnerability_factors={"flooding": 0.2},
        ),
        Asset(
            id="H02", name="North District Hospital", type=AssetType.HOSPITAL,
            latitude=CENTER_LAT + 0.04, longitude=CENTER_LNG - 0.005,
            capacity=80, current_load=60, operational_capacity=100,
            condition=78, replacement_cost=600, repair_time=144,
            population_served=250000, service_radius=5.0,
            backup_available=True, backup_capacity=30,
            dependencies=["P02", "W01"],
            vulnerability_factors={"flooding": 0.15},
        ),
        Asset(
            id="H03", name="South Medical Center", type=AssetType.HOSPITAL,
            latitude=CENTER_LAT - 0.03, longitude=CENTER_LNG + 0.015,
            capacity=70, current_load=55, operational_capacity=100,
            condition=90, replacement_cost=500, repair_time=120,
            population_served=200000, service_radius=4.5,
            backup_available=False, backup_capacity=0,
            dependencies=["P03", "W02"],
            vulnerability_factors={"flooding": 0.3, "landslide": 0.2},
        ),
        Asset(
            id="H04", name="East Community Hospital", type=AssetType.HOSPITAL,
            latitude=CENTER_LAT + 0.002, longitude=CENTER_LNG + 0.038,
            capacity=60, current_load=45, operational_capacity=100,
            condition=82, replacement_cost=400, repair_time=96,
            population_served=180000, service_radius=4.0,
            backup_available=False, backup_capacity=0,
            dependencies=["P01", "W02"],
            vulnerability_factors={"flooding": 0.25},
        ),
        Asset(
            id="H05", name="West Emergency Hospital", type=AssetType.HOSPITAL,
            latitude=CENTER_LAT + 0.012, longitude=CENTER_LNG - 0.032,
            capacity=50, current_load=35, operational_capacity=100,
            condition=88, replacement_cost=350, repair_time=72,
            population_served=150000, service_radius=3.5,
            backup_available=True, backup_capacity=40,
            dependencies=["P01", "W03"],
            vulnerability_factors={"flooding": 0.1},
        ),
    ]
    assets.extend(hospitals)

    # ============================================================
    # EMERGENCY / AMBULANCE STATIONS (5)
    # ============================================================
    emergency_stations = [
        Asset(
            id="E01", name="Central Fire & Rescue", type=AssetType.EMERGENCY,
            latitude=CENTER_LAT + 0.005, longitude=CENTER_LNG - 0.002,
            capacity=100, current_load=40, operational_capacity=100,
            condition=92, replacement_cost=200, repair_time=24,
            population_served=300000, service_radius=5.0,
            backup_available=True, backup_capacity=50,
            dependencies=["P01"],
            vulnerability_factors={"flooding": 0.15},
        ),
        Asset(
            id="E02", name="North Ambulance Station", type=AssetType.EMERGENCY,
            latitude=CENTER_LAT + 0.038, longitude=CENTER_LNG + 0.008,
            capacity=80, current_load=35, operational_capacity=100,
            condition=88, replacement_cost=150, repair_time=18,
            population_served=200000, service_radius=4.0,
            backup_available=True, backup_capacity=30,
            dependencies=["P02"],
            vulnerability_factors={"flooding": 0.2},
        ),
        Asset(
            id="E03", name="South Emergency Station", type=AssetType.EMERGENCY,
            latitude=CENTER_LAT - 0.028, longitude=CENTER_LNG + 0.01,
            capacity=70, current_load=30, operational_capacity=100,
            condition=80, replacement_cost=120, repair_time=20,
            population_served=180000, service_radius=3.5,
            backup_available=False, backup_capacity=0,
            dependencies=["P03"],
            vulnerability_factors={"flooding": 0.35, "landslide": 0.25},
        ),
        Asset(
            id="E04", name="East Rescue Unit", type=AssetType.EMERGENCY,
            latitude=CENTER_LAT - 0.005, longitude=CENTER_LNG + 0.035,
            capacity=60, current_load=25, operational_capacity=100,
            condition=85, replacement_cost=100, repair_time=16,
            population_served=150000, service_radius=3.0,
            backup_available=False, backup_capacity=0,
            dependencies=["P01"],
            vulnerability_factors={"flooding": 0.3},
        ),
        Asset(
            id="E05", name="West Paramedic Station", type=AssetType.EMERGENCY,
            latitude=CENTER_LAT + 0.01, longitude=CENTER_LNG - 0.028,
            capacity=60, current_load=20, operational_capacity=100,
            condition=90, replacement_cost=100, repair_time=14,
            population_served=120000, service_radius=3.0,
            backup_available=True, backup_capacity=25,
            dependencies=["P01"],
            vulnerability_factors={"flooding": 0.1},
        ),
    ]
    assets.extend(emergency_stations)

    # ============================================================
    # BRIDGES (6) — critical bottleneck infrastructure
    # ============================================================
    bridges = [
        Asset(
            id="B01", name="Central River Bridge", type=AssetType.BRIDGE,
            latitude=CENTER_LAT + 0.012, longitude=CENTER_LNG + 0.008,
            capacity=100, current_load=78, operational_capacity=100,
            condition=70, replacement_cost=250, repair_time=480,
            population_served=400000, service_radius=3.0,
            backup_available=False, backup_capacity=0,
            vulnerability_factors={"flooding": 0.7, "landslide": 0.3, "storm": 0.4},
        ),
        Asset(
            id="B02", name="North Highway Overpass", type=AssetType.BRIDGE,
            latitude=CENTER_LAT + 0.035, longitude=CENTER_LNG + 0.002,
            capacity=90, current_load=65, operational_capacity=100,
            condition=82, replacement_cost=200, repair_time=360,
            population_served=300000, service_radius=2.5,
            backup_available=False, backup_capacity=0,
            vulnerability_factors={"flooding": 0.4, "storm": 0.3},
        ),
        Asset(
            id="B03", name="East Canal Bridge", type=AssetType.BRIDGE,
            latitude=CENTER_LAT + 0.002, longitude=CENTER_LNG + 0.025,
            capacity=80, current_load=70, operational_capacity=100,
            condition=65, replacement_cost=180, repair_time=420,
            population_served=350000, service_radius=2.0,
            backup_available=False, backup_capacity=0,
            vulnerability_factors={"flooding": 0.8, "landslide": 0.4, "storm": 0.3},
        ),
        Asset(
            id="B04", name="South Valley Bridge", type=AssetType.BRIDGE,
            latitude=CENTER_LAT - 0.022, longitude=CENTER_LNG + 0.012,
            capacity=70, current_load=45, operational_capacity=100,
            condition=88, replacement_cost=150, repair_time=300,
            population_served=200000, service_radius=2.0,
            backup_available=False, backup_capacity=0,
            vulnerability_factors={"flooding": 0.5, "landslide": 0.6},
        ),
        Asset(
            id="B05", name="West Connector Bridge", type=AssetType.BRIDGE,
            latitude=CENTER_LAT + 0.008, longitude=CENTER_LNG - 0.02,
            capacity=85, current_load=50, operational_capacity=100,
            condition=78, replacement_cost=180, repair_time=350,
            population_served=250000, service_radius=2.5,
            backup_available=False, backup_capacity=0,
            vulnerability_factors={"flooding": 0.3, "storm": 0.2},
        ),
        Asset(
            id="B06", name="Industrial Overpass", type=AssetType.BRIDGE,
            latitude=CENTER_LAT - 0.01, longitude=CENTER_LNG - 0.018,
            capacity=75, current_load=40, operational_capacity=100,
            condition=72, replacement_cost=160, repair_time=280,
            population_served=180000, service_radius=2.0,
            backup_available=False, backup_capacity=0,
            vulnerability_factors={"flooding": 0.35, "extreme_heat": 0.2},
        ),
    ]
    assets.extend(bridges)

    # ============================================================
    # ROADS (25) — forming the transport network
    # ============================================================
    road_data = [
        # Major arterials
        ("R01", "Central Main Road", CENTER_LAT + 0.006, CENTER_LNG + 0.003, 100, 82, 95, 300, 12, 500000, 4.0),
        ("R02", "North Highway", CENTER_LAT + 0.032, CENTER_LNG + 0.005, 100, 70, 90, 200, 8, 350000, 5.0),
        ("R03", "South Expressway", CENTER_LAT - 0.025, CENTER_LNG + 0.008, 90, 65, 88, 180, 10, 300000, 4.5),
        ("R04", "East Arterial Road", CENTER_LAT + 0.001, CENTER_LNG + 0.032, 85, 60, 85, 160, 9, 280000, 4.0),
        ("R05", "West Boulevard", CENTER_LAT + 0.007, CENTER_LNG - 0.025, 90, 55, 92, 170, 7, 250000, 3.5),

        # Secondary roads
        ("R06", "Central-North Connector", CENTER_LAT + 0.02, CENTER_LNG + 0.001, 80, 60, 82, 120, 6, 200000, 3.0),
        ("R07", "Central-East Link", CENTER_LAT + 0.005, CENTER_LNG + 0.015, 75, 55, 80, 100, 5, 180000, 2.5),
        ("R08", "Central-South Road", CENTER_LAT - 0.01, CENTER_LNG + 0.006, 80, 58, 85, 110, 7, 220000, 3.0),
        ("R09", "North-East Bypass", CENTER_LAT + 0.03, CENTER_LNG + 0.02, 70, 40, 78, 90, 8, 150000, 3.0),
        ("R10", "South-East Road", CENTER_LAT - 0.018, CENTER_LNG + 0.028, 65, 42, 82, 85, 6, 140000, 2.5),

        # Local roads
        ("R11", "Hospital Row", CENTER_LAT + 0.009, CENTER_LNG + 0.006, 60, 45, 88, 80, 3, 120000, 2.0),
        ("R12", "Industrial Lane", CENTER_LAT - 0.008, CENTER_LNG - 0.012, 70, 50, 75, 90, 5, 100000, 2.0),
        ("R13", "Market Street", CENTER_LAT + 0.003, CENTER_LNG - 0.008, 65, 48, 80, 75, 4, 130000, 2.0),
        ("R14", "River Road North", CENTER_LAT + 0.018, CENTER_LNG + 0.012, 60, 38, 85, 70, 4, 110000, 2.0),
        ("R15", "River Road South", CENTER_LAT - 0.005, CENTER_LNG + 0.018, 60, 42, 82, 70, 5, 100000, 2.0),

        # Peripheral / alternate
        ("R16", "Northern Ring Road", CENTER_LAT + 0.042, CENTER_LNG - 0.008, 75, 35, 90, 130, 10, 200000, 3.5),
        ("R17", "Eastern Ring Road", CENTER_LAT + 0.005, CENTER_LNG + 0.042, 70, 30, 88, 120, 9, 180000, 3.0),
        ("R18", "Southern Ring Road", CENTER_LAT - 0.038, CENTER_LNG + 0.002, 70, 32, 85, 110, 11, 170000, 3.5),
        ("R19", "Western Bypass", CENTER_LAT + 0.002, CENTER_LNG - 0.04, 65, 28, 90, 100, 8, 140000, 3.0),
        ("R20", "Hill Road", CENTER_LAT - 0.015, CENTER_LNG + 0.035, 55, 35, 70, 60, 6, 80000, 2.0),

        # Connector roads
        ("R21", "Power Plant Road", CENTER_LAT + 0.023, CENTER_LNG - 0.012, 60, 30, 85, 70, 3, 60000, 1.5),
        ("R22", "Water Works Road", CENTER_LAT + 0.013, CENTER_LNG + 0.028, 55, 25, 88, 65, 3, 70000, 1.5),
        ("R23", "Emergency Access Road", CENTER_LAT - 0.002, CENTER_LNG - 0.005, 70, 35, 90, 80, 3, 90000, 2.0),
        ("R24", "Old Town Road", CENTER_LAT + 0.015, CENTER_LNG - 0.005, 50, 38, 68, 55, 4, 80000, 1.5),
        ("R25", "Coastal Drive", CENTER_LAT - 0.032, CENTER_LNG + 0.022, 60, 30, 80, 70, 7, 100000, 2.5),
    ]

    for rid, name, lat, lng, cap, load, cond, cost, repair, pop, radius in road_data:
        vf = {"flooding": rng.uniform(0.1, 0.5), "landslide": rng.uniform(0.05, 0.3)}
        assets.append(Asset(
            id=rid, name=name, type=AssetType.ROAD,
            latitude=lat, longitude=lng,
            capacity=cap, current_load=load, operational_capacity=100,
            condition=cond, replacement_cost=cost, repair_time=repair,
            population_served=pop, service_radius=radius,
            backup_available=False, backup_capacity=0,
            vulnerability_factors=vf,
        ))

    # ============================================================
    # TRANSPORT EDGES — Road-to-road and road-to-bridge connections
    # ============================================================
    transport_edges = [
        # Central area network
        ("R01", "B01", 1.5, 3, 100),   # Main road to Central Bridge
        ("B01", "R14", 1.0, 2, 100),   # Central Bridge to River Road North
        ("R01", "R07", 2.0, 4, 90),    # Main road to Central-East Link
        ("R01", "R11", 0.8, 2, 80),    # Main road to Hospital Row
        ("R01", "R13", 1.2, 3, 85),    # Main road to Market Street
        ("R01", "R23", 1.0, 2, 80),    # Main road to Emergency Access
        ("R01", "R06", 2.5, 5, 95),    # Main road to Central-North Connector

        # North connections
        ("R06", "B02", 1.5, 3, 90),    # Connector to North Overpass
        ("B02", "R02", 1.0, 2, 90),    # North Overpass to Highway
        ("R02", "R16", 3.0, 6, 80),    # Highway to Ring Road
        ("R02", "R09", 2.5, 5, 75),    # Highway to NE Bypass
        ("R06", "R24", 1.5, 3, 70),    # Connector to Old Town
        ("R24", "R21", 1.0, 2, 65),    # Old Town to Power Plant Road

        # East connections
        ("R07", "B03", 1.5, 3, 80),    # Central-East to Canal Bridge
        ("B03", "R04", 1.0, 2, 85),    # Canal Bridge to East Arterial
        ("R04", "R17", 3.0, 6, 75),    # East Arterial to Ring Road
        ("R04", "R22", 1.5, 3, 65),    # East Arterial to Water Works
        ("R07", "R15", 1.5, 3, 70),    # Central-East to River Road South
        ("R09", "R22", 2.0, 4, 60),    # NE Bypass to Water Works

        # South connections
        ("R08", "B04", 2.0, 4, 80),    # Central-South to Valley Bridge
        ("B04", "R03", 1.5, 3, 85),    # Valley Bridge to Expressway
        ("R03", "R18", 3.5, 7, 75),    # Expressway to Ring Road
        ("R03", "R25", 2.5, 5, 65),    # Expressway to Coastal Drive
        ("R08", "R12", 1.5, 3, 70),    # Central-South to Industrial Lane
        ("R10", "R20", 2.0, 4, 60),    # SE Road to Hill Road
        ("R15", "R10", 2.0, 4, 65),    # River Road South to SE Road
        ("R10", "R25", 2.5, 5, 55),    # SE Road to Coastal

        # West connections
        ("R13", "B05", 1.5, 3, 85),    # Market to West Bridge
        ("B05", "R05", 1.0, 2, 90),    # West Bridge to Boulevard
        ("R05", "R19", 3.0, 6, 70),    # Boulevard to Western Bypass
        ("R23", "B06", 1.5, 3, 75),    # Emergency Access to Industrial Overpass
        ("B06", "R12", 1.0, 2, 70),    # Industrial Overpass to Industrial Lane

        # Alternate/redundancy routes
        ("R16", "R09", 3.5, 7, 60),    # Northern Ring to NE Bypass (alternate)
        ("R17", "R20", 3.0, 6, 50),    # Eastern Ring to Hill Road (alternate)
        ("R18", "R25", 3.0, 6, 55),    # Southern Ring to Coastal (alternate)
        ("R19", "R12", 2.5, 5, 55),    # Western Bypass to Industrial (alternate)
        ("R14", "R09", 2.0, 4, 65),    # River Road N to NE Bypass

        # Cross connections for redundancy
        ("R11", "R14", 1.0, 2, 60),    # Hospital Row to River Road N
        ("R11", "R07", 0.8, 2, 65),    # Hospital Row to Central-East
        ("R21", "R16", 2.0, 4, 60),    # Power Plant Road to Northern Ring
    ]

    for src, tgt, dist, time, cap in transport_edges:
        edges.append(Edge(
            source=src, target=tgt,
            relationship_type=RelationshipType.TRANSPORT,
            capacity=cap, distance=dist, travel_time=time,
            dependency_strength=0.8, bidirectional=True,
        ))

    # ============================================================
    # EMERGENCY ACCESS EDGES — Emergency stations to hospitals via roads
    # ============================================================
    emergency_access_edges = [
        ("E01", "R01", 0.5, 1),   # Central Fire to Main Road
        ("E01", "R23", 0.3, 1),   # Central Fire to Emergency Access
        ("E02", "R02", 0.8, 2),   # North Ambulance to Highway
        ("E02", "R09", 0.5, 1),   # North Ambulance to NE Bypass
        ("E03", "R03", 0.6, 1),   # South Emergency to Expressway
        ("E03", "R08", 0.8, 2),   # South Emergency to Central-South
        ("E04", "R04", 0.5, 1),   # East Rescue to East Arterial
        ("E04", "R15", 0.6, 1),   # East Rescue to River Road S
        ("E05", "R05", 0.4, 1),   # West Paramedic to Boulevard
        ("E05", "R13", 0.5, 1),   # West Paramedic to Market Street

        # Hospitals accessible from roads
        ("R11", "H01", 0.3, 1),   # Hospital Row to City General
        ("R01", "H01", 0.5, 1),   # Main Road to City General
        ("R06", "H02", 0.8, 2),   # Central-North to North District
        ("R02", "H02", 1.0, 2),   # Highway to North District
        ("R03", "H03", 0.6, 1),   # Expressway to South Medical
        ("R10", "H03", 0.8, 2),   # SE Road to South Medical
        ("R04", "H04", 0.5, 1),   # East Arterial to East Community
        ("R22", "H04", 0.6, 1),   # Water Works Road to East Community
        ("R05", "H05", 0.4, 1),   # Boulevard to West Emergency Hosp
        ("R13", "H05", 0.7, 2),   # Market to West Emergency Hosp
    ]

    for src, tgt, dist, time in emergency_access_edges:
        edges.append(Edge(
            source=src, target=tgt,
            relationship_type=RelationshipType.EMERGENCY_ACCESS,
            capacity=100, distance=dist, travel_time=time,
            dependency_strength=0.9, bidirectional=True,
        ))

    # ============================================================
    # POWER SUPPLY EDGES
    # ============================================================
    power_supply_edges = [
        ("P01", "H01", 0.9),   # Central Power → City General Hospital
        ("P01", "W01", 0.85),  # Central Power → Main Water Plant
        ("P01", "W03", 0.8),   # Central Power → West Water
        ("P01", "E01", 0.7),   # Central Power → Central Fire
        ("P01", "E04", 0.6),   # Central Power → East Rescue
        ("P01", "E05", 0.65),  # Central Power → West Paramedic
        ("P01", "H04", 0.7),   # Central Power → East Community Hospital
        ("P02", "H02", 0.9),   # North Power → North District Hospital
        ("P02", "E02", 0.75),  # North Power → North Ambulance
        ("P03", "H03", 0.9),   # South Power → South Medical
        ("P03", "W02", 0.85),  # South Power → East Water
        ("P03", "E03", 0.7),   # South Power → South Emergency
        ("P01", "H05", 0.65),  # Central Power → West Emergency Hospital
    ]

    for src, tgt, strength in power_supply_edges:
        edges.append(Edge(
            source=src, target=tgt,
            relationship_type=RelationshipType.POWER_SUPPLY,
            capacity=100, distance=0, travel_time=0,
            dependency_strength=strength, bidirectional=False,
        ))

    # ============================================================
    # WATER SUPPLY EDGES
    # ============================================================
    water_supply_edges = [
        ("W01", "H01", 0.85),  # Main Water → City General
        ("W01", "H02", 0.8),   # Main Water → North District
        ("W02", "H03", 0.9),   # East Water → South Medical
        ("W02", "H04", 0.85),  # East Water → East Community
        ("W03", "H05", 0.9),   # West Water → West Emergency
        ("W01", "E01", 0.5),   # Main Water → Central Fire
        ("W01", "E02", 0.45),  # Main Water → North Ambulance
        ("W02", "E03", 0.5),   # East Water → South Emergency
        ("W02", "E04", 0.45),  # East Water → East Rescue
        ("W03", "E05", 0.5),   # West Water → West Paramedic
    ]

    for src, tgt, strength in water_supply_edges:
        edges.append(Edge(
            source=src, target=tgt,
            relationship_type=RelationshipType.WATER_SUPPLY,
            capacity=100, distance=0, travel_time=0,
            dependency_strength=strength, bidirectional=False,
        ))

    # ============================================================
    # Set up dependent_assets based on edges
    # ============================================================
    asset_map = {a.id: a for a in assets}
    for edge in edges:
        if edge.relationship_type in (
            RelationshipType.POWER_SUPPLY,
            RelationshipType.WATER_SUPPLY,
            RelationshipType.DEPENDENCY,
        ):
            if edge.target not in asset_map[edge.source].dependent_assets:
                asset_map[edge.source].dependent_assets.append(edge.target)
            if edge.source not in asset_map[edge.target].dependencies:
                asset_map[edge.target].dependencies.append(edge.source)

    # Set original_capacity
    for a in assets:
        a.original_capacity = a.capacity

    return assets, edges
