# CascadeX — System Architecture

## Overview

CascadeX is an Urban Infrastructure Failure & Resilience Simulator engineered with a **React 19 + TypeScript** frontend and a **FastAPI + NetworkX** Python simulation backend. It models synthetic metropolitan infrastructure interdependencies across transport, utilities, healthcare, and emergency services.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           React 19 + TypeScript Frontend                    │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Global State (simulationResult, baselineMetrics, activeTab, selected) │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │                                       │
│  ┌───────────────┬───────────────────┼───────────────────┬───────────────┐  │
│  │ Command Center│ City Map (Leaflet)│ Topology (Cytoscape│ Timeline     │  │
│  ├───────────────┼───────────────────┼───────────────────┼───────────────┤  │
│  │ Why Failed?   │ Scenario Lab      │ Criticality & SPOF│ Resilience    │  │
│  ├───────────────┴───────────────────┴───────────────────┴───────────────┤  │
│  │ Recovery Planner (Live Step Execution) │ Resilience Audit & Export     │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │ HTTP / JSON (Vite /api Proxy)         │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┼──────────────────────────────────────┐
│                           FastAPI Python Backend                             │
│  ┌───────────────────────────────────┴───────────────────────────────────┐  │
│  │ REST API Endpoints (/api/network, /api/simulation/*, /api/recovery/*)  │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │ Deterministic Simulation Core:                                        │  │
│  │  • Multilayer NetworkX Infrastructure Graph (47 nodes, 83 edges)      │  │
│  │  • Event-Driven Cascade Propagation Engine                             │  │
│  │  • BPR Volume-Delay Traffic Redistribution & Overload Model           │  │
│  │  • Multi-factor Criticality & SPOF Bottleneck Analyzer                │  │
│  │  • Multi-objective Knapsack Budget Optimizer                          │  │
│  │  • Dependency-Aware Critical Path Recovery Planner                     │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │ In-Memory Deterministic Synthetic Metropolitan Data                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Graph Model & Topology

The city network is modeled as a multilayer directed and undirected hybrid graph ($G = (V, E)$) in NetworkX:
- **Vertices ($V$ - 47 Synthetic Assets)**:
  - **Roads** (14 segments): Capacitated corridors with BPR volume-delay parameters.
  - **Bridges** (6 bridges): Critical river crossings and arterial bottlenecks (`B01`–`B06`).
  - **Hospitals** (6 facilities): Emergency healthcare facilities with bed counts and utility dependencies.
  - **Power Stations** (7 substations/grids): Thermal, hydro, solar, and distribution substations (`PS01`–`PS07`).
  - **Water Facilities** (6 treatment plants/reservoirs): Pumping stations and treatment plants (`W01`–`W06`).
  - **Emergency Stations** (8 fire/ambulance stations): Incident response hubs (`ES01`–`ES08`).
- **Edges ($E$ - 83 Interdependencies)**:
  - `ROAD_CONNECTS`: Bidirectional road corridors with capacity and base travel times.
  - `POWER_DEPENDS`: High-priority electrical supply feeds to hospitals, water pumps, and emergency stations.
  - `WATER_DEPENDS`: Essential water feeds required for hospital sterilization and fire service reserves.
  - `SERVES`: Healthcare, emergency, and municipal utility coverage mapped to synthetic neighborhood populations.
  - `ACCESS_VIA`: Designated physical road access routes to hospitals and critical emergency centers.

---

## 2. API Specifications

The FastAPI backend exposes 14 REST endpoints adhering to strict Pydantic schemas:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Backend liveness and node/edge count verification |
| `GET` | `/api/network` | Complete multilayer graph (nodes, edges, initial capacities) |
| `GET` | `/api/assets` | Filterable list of all 47 synthetic assets |
| `GET` | `/api/assets/{asset_id}` | Detailed asset dossier (dependencies, dependents, condition) |
| `GET` | `/api/metrics` | System-wide health, resilience score, and failure totals |
| `GET` | `/api/critical-assets` | Multi-criteria criticality ranking and SPOF classifications |
| `GET` | `/api/scenarios` | Predefined calibrated scenario suite (10 disaster scenarios) |
| `POST` | `/api/simulation/failure` | Trigger single or multi-asset failure cascade |
| `POST` | `/api/simulation/scenario` | Execute a predefined scenario by ID |
| `GET` | `/api/interventions` | Catalog of available resilience upgrades and interventions |
| `POST` | `/api/interventions/evaluate` | Simulate scenario with selected intervention portfolio |
| `POST` | `/api/interventions/optimize` | Multi-objective knapsack budget optimizer for given budget |
| `POST` | `/api/recovery/plan` | Calculate topological recovery sequence and priority schedule |
| `POST` | `/api/recovery/execute` | **Execute live recovery step** or full restore, updating state |
| `GET` | `/api/explain/{asset_id}` | Trace causal propagation chains and root cause for an asset |
| `POST` | `/api/counterfactual` | Counterfactual "what if" causal delta simulation |

---

## 3. Frontend Architecture

The frontend is structured in React 19 + TypeScript:
- **Global State Synchronization**: `App.tsx` maintains the single source of truth (`simulationResult`, `activeScenario`, `baselineMetrics`, `selectedAssetId`). State changes from running a scenario, advancing recovery steps, or resetting propagate instantly across all 10 views.
- **Views & Components**:
  - `CommandCenter.tsx`: Metric cards, active failure alerts, quick scenario triggers, high-criticality asset cards.
  - `MapView.tsx`: Leaflet map with CartoDB Dark Matter tiles, inverted dark filter, custom status pins, popup dossiers, and robust lifecycle cleanup.
  - `NetworkView.tsx`: Cytoscape.js canvas with force-directed, concentric, and breadthfirst hierarchical layouts.
  - `TimelineView.tsx`: Interactive time-scrubber with auto-play, speed controls ($1\times, 2\times, 5\times$), cascade level badges, and event causality logging.
  - `WhyFailedView.tsx`: Causal chain tree inspector with root-cause identification and counterfactual comparison.
  - `ScenarioLab.tsx`: 10 calibrated scenario cards with 1-click execution, trigger summaries, and impact comparisons.
  - `CriticalityMatrix.tsx`: SPOF registry, betweenness centrality rankings, and scatter/matrix views.
  - `InterventionPlanner.tsx`: Mitigation selection, multi-objective Knapsack budget optimizer (₹20 Cr to ₹250 Cr), before-vs-after delta metrics.
  - `RecoveryPlanner.tsx`: Dependency-aware critical path recovery sequencing with live **"Restore Next Priority Asset"** and **"Complete Full Network Recovery"** execution.
  - `ResilienceAudit.tsx`: Executive summary report with printable styling, JSON export, and full audit breakdown.
- **Design System**: Vanilla CSS custom properties (`frontend/src/index.css`) utilizing modern obsidian glassmorphism, responsive CSS grids, status color standards, and glowing accent rings.
