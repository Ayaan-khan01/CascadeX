# CascadeX

## Overview

Urban infrastructure systems—power grids, water networks, transportation corridors, hospitals, and emergency services—are functionally interdependent. In dense metropolitan environments, an isolated failure such as a substation trip or bridge collapse rarely stays confined to its source domain. Instead, disruptions propagate across physical and service dependencies: loss of electricity shuts down water treatment pumps, water shortages degrade hospital sterilization and emergency cooling, and arterial road closures divert traffic onto secondary corridors, causing gridlock that delays ambulances and fire response teams.

CascadeX is a deterministic simulation and decision-support tool built to model, visualize, and analyze these cascading failure dynamics across interconnected infrastructure networks. The platform models physical assets as nodes and their interdependencies as typed edges in a multilayer graph. Using discrete time-step propagation, the simulation engine calculates how initial physical damage or service outages cause secondary capacity degradation, traffic redistribution, and population-level service disruption.

The platform provides municipal planners, infrastructure operators, and emergency coordinators with an analytical environment to identify single points of failure, trace causal failure chains, stress-test networks against standardized failure scenarios, evaluate capital intervention portfolios under strict budget constraints, and sequence dependency-aware recovery operations. All infrastructure assets, coordinates, and network connections in the current version are synthetic demonstration data.

---

## Key Features

- **Multilayer Infrastructure Graph**: Models 47 municipal assets across six infrastructure sectors connected by 83 directed and undirected dependency edges.
- **Deterministic Cascade Simulation**: Propagates failures in discrete 5-minute time steps with fully reproducible outputs for identical initial conditions.
- **BPR Traffic Redistribution**: Recomputes shortest transit paths and models congestion-induced travel delays using the Bureau of Public Roads (BPR) volume-delay formulation.
- **Cross-Sector Service Degradation**: Models electrical and water supply dependencies feeding into hospital operation thresholds and emergency response readiness.
- **Explainable Causal Failure Chains**: Tracks and logs the exact root causes, intermediate triggers, and downstream consequences for every degraded asset.
- **Criticality & SPOF Analysis**: Ranks assets using betweenness centrality, dependency degree, population served, and cut-vertex isolation to flag Single Points of Failure (SPOFs).
- **10 Calibrated Stress Scenarios**: Offers one-click execution of preconfigured disaster scenarios including structural failures, utility disruptions, weather shocks, and compound failures.
- **Budget-Constrained Intervention Optimizer**: Uses a multi-objective knapsack algorithm to select optimal mitigation investments within fixed capital ceilings (₹20 Cr to ₹250 Cr).
- **Dependency-Aware Staged Recovery**: Schedules post-disaster repair operations based on physical restoration order (Power → Water → Transport → Healthcare/Emergency) with live step-by-step state execution.
- **Executive Audit & Export**: Compiles simulation metrics, impact breakdowns, and intervention plans into a printable audit summary with JSON export.

---

## How It Works

```
┌──────────────────────────────┐
│  Synthetic Municipal Model   │ 47 assets (roads, bridges, utilities, hospitals, emergency)
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│ Multilayer NetworkX Graph    │ 83 typed dependency & transport edges; precomputed centrality
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│ Failure Scenario Trigger     │ Single-point, compound, or environmental shock applied at t=0
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│ Deterministic Cascade Engine │ Discrete time-step loop (t = 0 to 120 min, step = 5 min):
│                              │  • Power/water lifeline dependency propagation
│                              │  • Shortest-path recalculation & BPR traffic delay redistribution
│                              │  • Capacity degradation crossing state thresholds (Warning/Critical/Failed)
│                              │  • Hospital accessibility & emergency response delay calculation
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│ Metrics & Causal Logging     │ Impact score (0-100), affected population, and causal link trees
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│ Planning & Restoration       │ Knapsack budget optimization & staged critical-path recovery
└──────────────────────────────┘
```

1. **Model Loading**: The backend initializes 47 synthetic infrastructure assets with baseline capacities, physical conditions, replacement costs, and population catchments.
2. **Graph Construction**: NetworkX constructs a multilayer graph with typed relationships (`TRANSPORT`, `POWER_SUPPLY`, `WATER_SUPPLY`, `EMERGENCY_ACCESS`, and `DEPENDENCY`).
3. **Trigger Execution**: A user selects an asset failure or runs one of 10 predefined scenarios (e.g., Scenario SC06: Central River Bridge collapse + Central Power Station trip).
4. **Cascade Propagation**:
   - Assets losing essential power or water degrade operational capacity.
   - Closed road/bridge corridors displace vehicle volume onto alternate paths via Dijkstra's algorithm.
   - Travel times on alternate corridors expand according to the BPR volume-delay formula ($t = t_0 [1 + 0.15 (V/C)^4]$); corridors with $V/C > 1.4$ suffer congestion degradation.
   - Hospital accessibility and emergency station response times drop as connecting routes congest.
   - Capacity transitions across discrete thresholds (`OPERATIONAL` > 80%, `WARNING` 60–80%, `IMPACTED` 40–60%, `CRITICAL` 20–40%, `FAILED` 0–20%) generate structured `CascadeEvent` logs.
5. **Impact Scoring**: The system calculates a weighted multi-attribute Impact Score ($0–100$):
   $$\text{Impact Score} = 0.25 \cdot I_{\text{infra}} + 0.25 \cdot I_{\text{service}} + 0.20 \cdot I_{\text{pop}} + 0.15 \cdot I_{\text{emerg}} + 0.15 \cdot I_{\text{hosp}}$$
6. **Decision Support**:
   - Users evaluate capital mitigations or let the budget optimizer select interventions under a strict budget constraint.
   - Users generate a staged recovery schedule and execute repair steps in physical dependency order to return the network to operational baseline.

---

## Technical Implementation

### Backend
- **Framework**: Python 3.9 + FastAPI REST API.
- **Graph Processing**: NetworkX (`MultiDiGraph`) for topological representation, shortest-path calculation, betweenness centrality, and articulation point/cut-vertex analysis.
- **Numerical Processing**: NumPy and SciPy for matrix calculations and metric normalization.
- **Validation**: Pydantic v2 schemas enforcing request/response structures.

### Frontend
- **Framework**: React 19 + TypeScript + Vite 8.
- **State Management**: Centralized React state in `App.tsx` coordinating metrics across all 10 views without external state library overhead.
- **Geographic Map**: Leaflet (`react-leaflet` pattern) rendering CartoDB Dark Matter tiles, custom SVG status pins, and asset dossiers with lifecycle cleanup.
- **Network Graph**: Cytoscape.js rendering force-directed, concentric, and hierarchical graph layouts with interactive node-neighborhood highlighting.
- **Styling**: Vanilla CSS custom properties (`frontend/src/index.css`) implementing an obsidian glassmorphism design system.

### Core Modules
- `backend/app/graph/infrastructure_graph.py`: Graph construction, pathfinding, dependency queries, and Single Point of Failure (SPOF) classification.
- `backend/app/simulation/cascade_engine.py`: Time-stepped cascade propagation, BPR traffic redistribution, threshold transitions, and causal chain logging.
- `backend/app/simulation/intervention_planner.py`: Mitigation portfolio evaluation and multi-objective knapsack budget optimizer.
- `backend/app/simulation/recovery_planner.py`: Dependency-aware critical-path recovery scheduler and live restoration state executor.
- `backend/app/data/synthetic_city.py`: Deterministic generator (seed 42) for 47 assets and 83 edges.
- `backend/app/data/scenarios.py`: 10 predefined failure archetypes.

### REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Backend status, asset count, and edge count |
| `GET` | `/api/network` | Complete graph topology (nodes, edges, initial capacities) |
| `GET` | `/api/assets` | Full list of assets with operational metrics |
| `GET` | `/api/assets/{id}` | Detailed asset dossier (dependencies, condition, status) |
| `GET` | `/api/metrics` | System-wide health, resilience score, and failure totals |
| `GET` | `/api/critical-assets` | Multi-factor criticality ranking and SPOF flags |
| `GET` | `/api/scenarios` | Predefined scenario suite |
| `POST` | `/api/simulate/failure` | Trigger custom asset failure cascade |
| `POST` | `/api/simulate/scenario` | Execute a predefined scenario by ID |
| `GET` | `/api/interventions` | Catalog of available resilience upgrades |
| `POST` | `/api/interventions/evaluate` | Simulate scenario with selected interventions applied |
| `POST` | `/api/interventions/optimize` | Multi-objective knapsack budget optimizer |
| `POST` | `/api/recovery/simulate` | Generate staged recovery plan for active failure |
| `POST` | `/api/recovery/execute` | Execute recovery step or full restore on simulation state |
| `POST` | `/api/explain` | Generate causal chain narrative from cascade events |
| `POST` | `/api/counterfactual` | Counterfactual what-if comparison for specific assets |

---

## Project Structure

```
CascadeX/
├── backend/
│   ├── app/
│   │   ├── data/
│   │   │   ├── scenarios.py            # 10 predefined disaster scenarios
│   │   │   └── synthetic_city.py       # Deterministic 47-asset city generator
│   │   ├── graph/
│   │   │   └── infrastructure_graph.py # NetworkX multilayer graph & SPOF logic
│   │   ├── models/
│   │   │   └── schemas.py              # Pydantic data models & enums
│   │   ├── simulation/
│   │   │   ├── cascade_engine.py       # Time-stepped cascade propagation & BPR
│   │   │   ├── intervention_planner.py # Knapsack optimizer & mitigations
│   │   │   └── recovery_planner.py     # Staged recovery scheduler & executor
│   │   └── main.py                     # FastAPI REST API routes
│   ├── tests/
│   │   ├── test_api.py                 # 13 REST API endpoint tests
│   │   ├── test_audit_hardening.py     # 5 hardening tests (knapsack, recovery, SPOFs)
│   │   └── test_simulation.py          # 8 core simulation & graph tests
│   └── requirements.txt                # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CascadeTimeline.tsx     # Interactive time scrubber & event log
│   │   │   ├── CriticalityRanking.tsx  # SPOF registry & criticality matrix
│   │   │   ├── ExecutiveReport.tsx     # Resilience audit & JSON export
│   │   │   ├── ExplainabilityPanel.tsx # "Why Did It Fail?" causal tree
│   │   │   ├── InterventionPlanner.tsx # Mitigation portfolio & budget optimizer
│   │   │   ├── MapView.tsx             # Leaflet geographic map & status pins
│   │   │   ├── NetworkView.tsx         # Cytoscape.js multilayer graph
│   │   │   ├── RecoveryPlanner.tsx     # Staged recovery & step execution
│   │   │   └── ScenarioLab.tsx         # Predefined scenario launcher
│   │   ├── api.ts                      # Frontend HTTP client
│   │   ├── App.tsx                     # Global simulation state & Command Center
│   │   ├── index.css                   # Obsidian glassmorphism design system
│   │   ├── main.tsx                    # React entry point
│   │   └── types.ts                    # TypeScript interface definitions
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts                  # Vite config with /api reverse proxy
├── docs/
│   ├── ARCHITECTURE.md                 # System architecture specification
│   ├── ASSUMPTIONS.md                  # Synthetic data assumptions & disclaimers
│   ├── DEMO_GUIDE.md                   # Hackathon demo script & verification list
│   ├── METHODOLOGY.md                  # Formulas, algorithms, and scoring logic
│   └── PROJECT_PLAN.md                 # Development plan & phase status
├── run.sh                              # Unified single-command launcher
└── README.md
```

---

## Running Locally

### Prerequisites
- **Python**: 3.9+ with `pip`
- **Node.js**: 18+ with `npm`

### 1. Unified Launch (Recommended)
Run both backend and frontend concurrently with the launcher script:
```bash
chmod +x run.sh
./run.sh
```
- Web Application: [http://localhost:5173](http://localhost:5173)
- Interactive API Docs (Swagger): [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 2. Manual Launch
To run backend and frontend in separate terminals:

```bash
# Terminal 1 — Backend
cd backend
python3 -m pip install -r requirements.txt
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

---

## Testing

The project includes an automated test suite executed with `pytest`:

```bash
# Run all backend tests
python3 -m pytest backend/tests/ -v
```

### Test Coverage
- **`backend/tests/test_api.py` (13 tests)**: Verifies REST endpoints, schemas, status codes, and error responses for assets, network, metrics, simulation, scenarios, interventions, and explanations.
- **`backend/tests/test_simulation.py` (8 tests)**: Verifies synthetic city generation, graph model initialization, bridge failure cascades, power failure cascades, intervention evaluation, budget optimization, and recovery planning.
- **`backend/tests/test_audit_hardening.py` (5 tests)**: Verifies live step-by-step and full recovery execution (`POST /api/recovery/execute`), strict knapsack budget limits across multiple funding tiers, deterministic execution across all 10 scenarios, SPOF classification soundness, and alternate route intervention mechanics.

**Current Test Results**: 26 passed in ~14 seconds (100% pass rate).

### Frontend Production Build
To verify TypeScript compilation and production asset bundling:
```bash
cd frontend
npm run build
```
**Current Build Result**: Compiles cleanly (`tsc -b && vite build`) with zero TypeScript errors in ~150ms.

---

## Current Data Model

### Synthetic Elements
All infrastructure data in CascadeX is synthetic:
- **Asset Metadata**: Names, coordinates (placed in a fictional bounding box near ~19.07°N, 72.87°E), nominal capacities, replacement costs (in INR Crore), and physical conditions are synthetic models.
- **Network Interconnections**: The 83 edges representing road connections, power transmission lines, and water distribution pipes are synthetic topologies designed to model cascade patterns.
- **Catchment Populations**: Population numbers assigned to assets are synthetic values calibrated for consistent impact calculations.
- **Geographic Basemap**: The CartoDB Dark Matter / OpenStreetMap basemap provides a realistic geographical canvas for visualization, but does not represent real infrastructure in Mumbai or any real municipality.

### Calculated & Derived Elements
All operational metrics and downstream values are computed by the deterministic simulation engine:
- **Operational Capacities**: Dynamically updated based on physical damage, dependency loss, or traffic overload.
- **Congestion Delays**: Computed dynamically using the BPR formulation based on current volume vs. nominal capacity.
- **Causal Propagation Paths**: Graph dependency traversals generated event-by-event during simulation execution.
- **Impact Scores**: Multi-attribute weighted calculation derived from current asset states.
- **Affected Population**: Aggregate de-duplicated catchment counts affected by active service outages.
- **SPOF Designations**: Topologically derived cut-vertices and sole utility supplier evaluations.
- **Knapsack Selections**: Dynamically solved intervention portfolios constrained by the selected budget.
- **Recovery Priorities**: Calculated based on criticality, downstream dependents, and repair durations.

---

## Limitations

- **Synthetic Network Topology**: The network does not reflect real-world municipal utility schematics, electrical bus configurations, or actual water distribution pipe diameters.
- **Simplified Traffic Dynamics**: The traffic redistribution model uses shortest-path static user equilibrium approximations (BPR) rather than dynamic mesoscopic or microscopic agent-based traffic simulation (e.g., SUMO or MATSim).
- **Fixed Time Steps**: Propagation occurs in discrete 5-minute intervals. In real systems, electrical grid trips occur in milliseconds, while structural bridge failures and road closures may unfold over hours or days.
- **Linear Recovery Sequencing**: Recovery durations are estimated in hours and modeled as sequential restorations. Real-world disaster recovery involves parallel contracting, logistics constraints, material shortages, and temporary bypasses.
- **Static Catchment Zones**: Population figures are assigned static catchment areas rather than time-of-day dynamic commuter densities.

---

## Future Scope

- **Real GIS / OpenStreetMap Ingestion**: Import real-world road networks and facility locations directly from OpenStreetMap and municipal GIS shapefiles.
- **Domain-Specific Engineering Solvers**: Integrate power flow solvers (e.g., PyPSA or Pandapower) and hydraulic network solvers (e.g., EPANET / WNTR) to replace threshold-based dependency heuristics.
- **Dynamic Commuter Mobility**: Incorporate origin-destination travel demand matrices and census commuting data to model time-of-day population exposure.
- **Probabilistic Hazard Modeling**: Support Monte Carlo hazard sampling to evaluate structural failure probabilities across uncertain hazard intensities.
- **Real-Time Sensor Integration**: Provide Webhook or MQTT ingestion pipelines for physical SCADA telemetry or smart city sensor feeds.

---


