"""Predefined scenarios for CascadeX Scenario Lab."""
from __future__ import annotations
from typing import Dict, List, Any, Optional


PREDEFINED_SCENARIOS = [
    {
        "id": "SC01",
        "name": "Critical Bridge Failure",
        "description": "East Canal Bridge (B03) collapses — a high-traffic bridge with poor condition, triggering traffic redistribution and emergency access disruption.",
        "category": "Infrastructure",
        "severity": "High",
        "failed_assets": ["B03"],
        "degradation_levels": {},
        "environmental_factors": {},
        "icon": "construction",
    },
    {
        "id": "SC02",
        "name": "Central Power Station Failure",
        "description": "Central Power Station (P01) goes offline, affecting hospitals, water treatment, and emergency stations across the city center.",
        "category": "Utility",
        "severity": "Critical",
        "failed_assets": ["P01"],
        "degradation_levels": {},
        "environmental_factors": {},
        "icon": "zap-off",
    },
    {
        "id": "SC03",
        "name": "Water Treatment Disruption",
        "description": "Main Water Treatment Plant (W01) fails, cutting water supply to hospitals and emergency stations.",
        "category": "Utility",
        "severity": "High",
        "failed_assets": ["W01"],
        "degradation_levels": {},
        "environmental_factors": {},
        "icon": "droplets",
    },
    {
        "id": "SC04",
        "name": "Major Road Collapse",
        "description": "Central Main Road (R01) — the city's primary arterial — becomes impassable, forcing traffic onto secondary routes.",
        "category": "Infrastructure",
        "severity": "High",
        "failed_assets": ["R01"],
        "degradation_levels": {},
        "environmental_factors": {},
        "icon": "road",
    },
    {
        "id": "SC05",
        "name": "Hospital Isolation",
        "description": "South Medical Center (H03) loses both power and road access simultaneously.",
        "category": "Service",
        "severity": "Critical",
        "failed_assets": ["P03", "R03"],
        "degradation_levels": {},
        "environmental_factors": {},
        "icon": "hospital",
    },
    {
        "id": "SC06",
        "name": "Compound Infrastructure Failure",
        "description": "East Canal Bridge (B03) and Central Power Station (P01) fail simultaneously — testing system resilience under compound stress.",
        "category": "Compound",
        "severity": "Critical",
        "failed_assets": ["B03", "P01"],
        "degradation_levels": {},
        "environmental_factors": {},
        "icon": "alert-triangle",
    },
    {
        "id": "SC07",
        "name": "Heavy Rainfall",
        "description": "Severe rainfall event degrades flood-vulnerable infrastructure across the city.",
        "category": "Environmental",
        "severity": "High",
        "failed_assets": [],
        "degradation_levels": {},
        "environmental_factors": {"flooding": 0.6},
        "icon": "cloud-rain",
    },
    {
        "id": "SC08",
        "name": "Flash Flooding",
        "description": "Major flooding event causes severe damage to bridges, roads, and water systems.",
        "category": "Environmental",
        "severity": "Critical",
        "failed_assets": ["B03"],
        "degradation_levels": {"B03": 0},
        "environmental_factors": {"flooding": 0.8},
        "icon": "waves",
    },
    {
        "id": "SC09",
        "name": "Landslide Event",
        "description": "Landslide impacts vulnerable hill and valley infrastructure, blocking key routes.",
        "category": "Environmental",
        "severity": "High",
        "failed_assets": ["R20"],
        "degradation_levels": {},
        "environmental_factors": {"landslide": 0.7},
        "icon": "mountain",
    },
    {
        "id": "SC10",
        "name": "Multi-System Cascade",
        "description": "Worst case: Central Bridge, South Power Grid, and East Water Facility all fail — maximum cascade potential.",
        "category": "Compound",
        "severity": "Catastrophic",
        "failed_assets": ["B01", "P03", "W02"],
        "degradation_levels": {},
        "environmental_factors": {},
        "icon": "skull",
    },
]


def get_scenarios() -> List[Dict[str, Any]]:
    """Return all predefined scenarios."""
    return PREDEFINED_SCENARIOS


def get_scenario_by_id(scenario_id: str) -> Optional[Dict[str, Any]]:
    """Get a specific scenario by ID."""
    for s in PREDEFINED_SCENARIOS:
        if s["id"] == scenario_id:
            return s
    return None
