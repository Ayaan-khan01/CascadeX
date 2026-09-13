# CascadeX — Methodology & Algorithms

## 1. Deterministic Cascade Propagation Engine

Cascade propagation follows a deterministic, event-driven cascade simulation across discrete time steps:

1. **Trigger ($t = 0$)**: The initial trigger asset (or set of compound trigger assets) is transitioned to `FAILED` with $0\%$ operational capacity. An initial failure event is recorded.
2. **Direct Dependency Traversal**: The engine inspects outgoing and incoming edges for dependency constraints:
   - `POWER_DEPENDS`: If an electrical substation drops below operational threshold, dependent water pumping stations, hospitals, and transit hubs experience power degradation.
   - `WATER_DEPENDS`: If water supply drops below $50\%$, dependent hospitals lose sterile operational capacity and fire stations face reduced response capabilities.
   - `ACCESS_VIA`: If an access corridor fails or collapses, emergency vehicles and patient ambulances experience route severing.
3. **Traffic Redistribution & Congestion Overload**:
   - For road and bridge failures, shortest paths are recomputed across remaining operational corridors using Dijkstra's algorithm.
   - Displaced vehicle volume is redistributed to alternate routes.
   - Corridors exceeding operational capacity undergo travel delay expansion according to the **BPR (Bureau of Public Roads) volume-delay formulation**:
     $$t = t_0 \cdot \left(1 + \alpha \cdot \left(\frac{V}{C}\right)^\beta\right)$$
     where $\alpha = 0.15$, $\beta = 4.0$, $V$ is current traffic volume, and $C$ is nominal capacity.
   - When $\frac{V}{C} > 1.4$, structural or traffic gridlock causes secondary degradation, transitioning assets to `IMPACTED` or `CRITICAL`.
4. **Iterative Convergence**: Steps 2–3 iterate until no further asset degrades or until maximum cascade depth ($L=10$) is reached.
5. **Deterministic Event Sequence**: Every state change produces a structured event containing timestamp ($t$), asset ID, previous status, new status, cascade level, and causal trigger.

---

## 2. Impact Scoring Formula

The overall incident **Impact Score** ($I \in [0, 100]$) is computed via a multi-attribute weighted formulation:

$$I = \min\left(100, 0.25 \cdot I_{\text{infra}} + 0.25 \cdot I_{\text{service}} + 0.20 \cdot I_{\text{pop}} + 0.15 \cdot I_{\text{emerg}} + 0.15 \cdot I_{\text{hosp}}\right)$$

Where:
- $I_{\text{infra}} = \frac{\sum_{a \in \text{Failed}} 1 + \sum_{a \in \text{Impacted}} 0.5}{N_{\text{total}}} \times 100$
- $I_{\text{service}} = \frac{\text{Unserved utility demand}}{\text{Total utility baseline capacity}} \times 100$
- $I_{\text{pop}} = \frac{\text{Affected population}}{\text{Total metropolitan population}} \times 100$
- $I_{\text{emerg}} = \text{Average response delay penalty across degraded emergency stations}$
- $I_{\text{hosp}} = \text{Percentage loss of total critical hospital bed capacity}$

---

## 3. Criticality & Single Point of Failure (SPOF) Classification

CascadeX enforces rigorous topological and domain criteria for infrastructure classification:

### Criticality Score (0–100)
Calculated via multi-factor normalization:
1. **Betweenness Centrality (20%)**: Normalized shortest-path transit frequency across the transport layer.
2. **Dependency Count (20%)**: Number of immediate and 2nd-order downstream dependent infrastructure assets.
3. **Population Dependency (20%)**: Population in catchment zones relying on the asset.
4. **Simulated Cascade Potential (20%)**: Peak impact score produced if this single asset were to fail in isolation.
5. **Inverse Redundancy (20%)**: Availability and spare capacity of parallel alternatives.

### Rigorous Classification Definitions:
- **Single Point of Failure (SPOF)**:
  - **Bridge / Transport**: A cut-vertex or critical bottleneck whose failure completely isolates a sector or district, with redundancy score $\le 40\%$ and physical condition $\le 70\%$ (e.g., Bridge `B03` Central River Crossing).
  - **Utilities**: A primary substation or water treatment facility with 3 or more sole dependents (no active redundant feed).
- **Low Redundancy**: An asset that has alternate routes or backup feeds, but where alternatives operate near saturation or have high latency.
- **Vulnerable**: High-criticality asset with good redundancy but degraded physical condition or high environmental exposure.

---

## 4. Multi-Objective Knapsack Budget Optimization

When allocating municipal resilience funds ($B \in [\text{₹}20\text{ Cr}, \text{₹}250\text{ Cr}]$), the optimizer solves a constrained knapsack problem:

$$\max \sum_{i \in S} \text{Utility}(i) \quad \text{subject to} \quad \sum_{i \in S} \text{Cost}(i) \le B$$

Where the multi-objective utility of intervention $i$ targeting asset $a$ is defined as:
$$\text{Utility}(i) = w_1 \cdot \Delta \text{Resilience}(i) + w_2 \cdot \frac{\text{PopProtected}(i)}{\text{TotalPop}} \times 100 + w_3 \cdot \text{Criticality}(a) + w_4 \cdot \text{SPOFMitigation}(i)$$

- **Strict Budget Invariant**: Total cost is guaranteed to never exceed $B$.
- **Selection Reasoning**: For each included item, the optimizer outputs explicit engineering justifications (e.g., *"High-ROI bottleneck mitigation protecting 450k population"*).

---

## 5. Dependency-Aware Staged Recovery

Recovery sequencing enforces physical infrastructure restoration hierarchy:

$$\text{Power Substation} \longrightarrow \text{Water Treatment} \longrightarrow \text{Bridge / Road Corridors} \longrightarrow \text{Hospitals} \longrightarrow \text{Emergency Services}$$

1. **Recovery Priority Scoring**:
   $$\text{Priority} = 0.35 \cdot \text{Criticality} + 0.30 \cdot \text{DownstreamDependents} + 0.20 \cdot \text{PopulationProtected} + 0.15 \cdot \left(1 - \frac{\text{RepairTime}}{\text{MaxTime}}\right)$$
2. **Dependency Clearance Gate**: An asset cannot be fully restored until its upstream power, water, and road access dependencies are restored to operational status.
3. **Live Execution (`POST /api/recovery/execute`)**: Step-by-step restoration recalculates the simulation graph at each stage, progressively restoring system health and reducing impact scores.
