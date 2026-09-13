# CascadeX — Complete Hackathon Demo Walkthrough Guide

This guide provides a comprehensive step-by-step presentation script designed for hackathon judges, technical evaluators, and stakeholders.

---

## 3-Minute Fast-Track Presentation Script

### Act 1: The Baseline Metropolitan Network (0:00 – 0:45)
1. **Command Center**:
   - Point out the unified metrics header: 47 Synthetic Infrastructure Assets, 83 Interdependencies, System Health at 100%, Impact Score at 0.
   - Highlight the banner: *"Synthetic metropolitan infrastructure model — basemap used for visualization only."*
2. **City Map**:
   - Switch to the **City Map** tab.
   - Click on **Bridge B03** (Central River Crossing) or **Substation PS01** (Central Thermal Substation).
   - Show the interactive dossier popup displaying coordinates, operational capacity, and dependency counts.
   - Toggle map view modes (Street vs. Dark Command mode).
3. **Topology Graph**:
   - Switch to the **Topology Graph** tab.
   - Point out the multilayer architecture (roads, bridges, power, water, hospitals, emergency stations).
   - Switch layouts from **Force-Directed** to **Concentric** and **Hierarchical** to show structural hubs.

---

### Act 2: Catastrophic Cascade & Root Cause Diagnostics (0:45 – 1:45)
4. **Scenario Lab**:
   - Switch to **Scenario Lab**.
   - Select **Scenario SC06: Compound Infrastructure Failure** (Bridge B03 collapse + PS01 Substation trip).
   - Click **Run Scenario**. Note how the simulation runs deterministically in milliseconds.
5. **Cascade Timeline**:
   - Switch to **Cascade Timeline**.
   - Note the timeline metrics: 18+ cascading events across 4 cascade levels, Impact Score jumping to ~72, affected population climbing to 1.1M+.
   - Hit **Play** (or scrub the timeline slider from $t=0$ to $t=20$m).
   - Point out the progression: $t=0$ initial triggers $\to t=5$m power outage drops water pump W01 $\to t=10$m traffic overloads alternate bridges $\to t=15$m hospitals lose water sterilizers $\to t=20$m emergency response times surge.
6. **"Why Did It Fail?" Causal Inspector**:
   - Switch to the **"Why Did It Fail?"** tab.
   - Select an affected asset like **Hospital H01** or **Fire Station ES02**.
   - Walk through the interactive causal tree:
     $$\text{Bridge B03 Collapse} \longrightarrow \text{Arterial Gridlock} \longrightarrow \text{Substation PS01 Failure} \longrightarrow \text{Pumping Station W01 Trip} \longrightarrow \text{Hospital H01 Critical Degradation}$$
   - Highlight: *"This isn't an LLM hallucinating reasons — it's an exact trace of the graph dependency traversal and BPR delay models."*

---

### Act 3: Strategic Planning & Algorithmic Resilience (1:45 – 2:30)
7. **Criticality & SPOF**:
   - Switch to **Criticality & SPOF**.
   - Show the Single Point of Failure (SPOF) register isolating Bridge B03 and Substation PS01.
   - Explain the distinction between True SPOFs, Low Redundancy assets, and Vulnerable nodes.
8. **Resilience Planner & Budget Optimizer**:
   - Switch to **Resilience Planner**.
   - Select the **₹60 Cr** budget tier.
   - Click **Run Budget Optimizer**.
   - Watch the multi-objective Knapsack algorithm instantly select the highest-ROI mitigations (e.g. Bridge B03 Reinforcement, Hospital H01 Microgrid, Backup Water Storage).
   - Compare the **Before vs. After** scenario delta: Impact drops from 72 to ~34, saving 600k+ citizens from severe disruption within budget.

---

### Act 4: Live Staged Recovery & Executive Audit (2:30 – 3:00)
9. **Recovery Planner (Live Execution)**:
   - Switch to **Recovery Planner**.
   - Highlight the dependency-aware critical path sequence:
     $$\text{Restore PS01 (Power)} \longrightarrow \text{Restore W01 (Water)} \longrightarrow \text{Clear Corridors} \longrightarrow \text{Restore Hospitals}$$
   - Click **"Restore Next Priority Asset"**.
   - Watch the live system health immediately increment, and see the restored asset badge turn green across the app.
   - Click **"Complete Full Network Recovery"** to restore full metropolitan operational health.
10. **Resilience Audit & Reset**:
    - Switch to **Resilience Audit**.
    - Point out the comprehensive executive report, SPOF registry, and mitigation recommendations reflecting the exact active scenario state.
    - Click **"Export Audit JSON"** or show the clean printable layout.
    - Click **"Reset Simulation"** in the top navigation bar.
    - Verify that the entire system seamlessly returns to pristine baseline state (100% health, 0 impact) with zero page reloads.

---

## Complete 26-Step Comprehensive Verification Checklist

| Step | Action | Expected Behavior | Status |
|---|---|---|---|
| 1 | Open Command Center | Baseline metrics show 47 assets, 83 edges, 100% health | ✅ Verified |
| 2 | Check Synthetic Disclaimer | Banner visible across header and views | ✅ Verified |
| 3 | Open City Map | Leaflet renders with dark tiles and custom status pins | ✅ Verified |
| 4 | Click Asset on Map | Popup dossier displays capacity, type, and connections | ✅ Verified |
| 5 | Open Topology Graph | Cytoscape network renders with 47 nodes and color codes | ✅ Verified |
| 6 | Change Graph Layout | Toggles smoothly between Force, Concentric, Breadthfirst | ✅ Verified |
| 7 | Open Scenario Lab | 10 calibrated scenario cards rendered with trigger badges | ✅ Verified |
| 8 | Run Compound Failure (SC06) | Simulation completes deterministically; KPIs update | ✅ Verified |
| 9 | Open Cascade Timeline | Timeline scrubber shows cascading events across levels | ✅ Verified |
| 10 | Play Timeline Animation | Events advance with timestamped causal descriptions | ✅ Verified |
| 11 | Open "Why Did It Fail?" | Root cause and downstream impact tree displayed | ✅ Verified |
| 12 | Select Failed Asset | Displays exact dependency path from trigger to failure | ✅ Verified |
| 13 | Open Criticality & SPOF | Matrix shows betweenness, criticality ranking, and SPOFs | ✅ Verified |
| 14 | Inspect SPOF Register | Flags Bridge B03 / PS01 with sound topological reasoning | ✅ Verified |
| 15 | Open Resilience Planner | Intervention portfolio catalog rendered with costs | ✅ Verified |
| 16 | Select Custom Interventions | Before-vs-after delta comparison updates interactively | ✅ Verified |
| 17 | Select Budget Tier (₹60 Cr) | Sets knapsack budget constraint | ✅ Verified |
| 18 | Run Budget Optimizer | Algorithmic selection never exceeds ₹60 Cr budget | ✅ Verified |
| 19 | Open Recovery Planner | Generates critical path repair sequence by priority | ✅ Verified |
| 20 | Click "Restore Next Asset" | Backend executes recovery step; health improves | ✅ Verified |
| 21 | Click "Complete Recovery" | All failed assets restored; system returns to 100% health | ✅ Verified |
| 22 | Open Resilience Audit | Executive audit dynamically reflects active scenario | ✅ Verified |
| 23 | Click "Export Audit JSON" | Triggers clean JSON file download of audit dossier | ✅ Verified |
| 24 | Navigate Back to Map | Leaflet renders properly without blank panels or errors | ✅ Verified |
| 25 | Click "Reset Simulation" | Clears active scenario; restores baseline state | ✅ Verified |
| 26 | Verify State Consistency | All 10 views agree on status, impact, and event count | ✅ Verified |
