# CascadeX — Assumptions, Disclaimers & Synthetic Data Notice

## ⚠️ Important Synthetic Data Notice

CascadeX is an educational and decision-support simulation platform built using **entirely synthetic metropolitan data**.

- **Synthetic Infrastructure Network**: All 47 assets (roads, bridges, power substations, water plants, hospitals, and emergency stations) and their 83 interdependencies are synthetic models designed for stress-testing cascade propagation dynamics.
- **Geographic Basemap Disclaimer**: The Leaflet map uses OpenStreetMap and CartoDB Dark Matter basemap tiles strictly as a geographic canvas for visual demonstration. **The simulated assets, nodes, corridors, and failure points do NOT represent real-world municipal infrastructure in Mumbai, Bengaluru, Delhi, or any other city.**
- **Synthetic Population & Costs**: Population counts (catchment sizes) and intervention budgets (denominated in illustrative ₹ Crore) are synthetic parameters calibrated for algorithmic knapsack optimization and demonstration consistency.

---

## 1. Domain Modeling Assumptions

1. **Deterministic Execution**:
   - The simulation engine is purely deterministic. Given identical initial triggers and intervention portfolios, the cascade algorithm produces identical, reproducible event sequences and metrics.
2. **Discrete Time Propagation**:
   - Time advances in discrete minute intervals ($t = 0, 5, 10, 15, \dots$). In real disaster situations, cascading effects may occur with continuous, variable velocity.
3. **Volume-Delay Formulation**:
   - Traffic redistribution follows the standard Bureau of Public Roads (BPR) formulation. While realistic for arterial capacity modeling, it does not incorporate micro-transit signals or dynamic driver route choices.
4. **Binary & Threshold Utility Degradation**:
   - Facility dependencies (e.g. electrical feeds to water treatment pumps) operate based on continuous capacity thresholds. When backup generators or redundant feeds are absent, dependency failure triggers deterministic degradation.
5. **Staged Recovery Sequencing**:
   - Recovery follows physical dependency precedence ($Power \to Water \to Transport \to Services$). Real-world recovery may involve temporary emergency bypasses (e.g. mobile diesel generators or temporary pontoon bridges).

---

## 2. Intended Scope & Boundaries

### What CascadeX Is:
- ✅ A state-of-the-art hackathon demonstration of cascading failure analysis and multi-layer network resilience.
- ✅ An interactive decision-support prototype for urban infrastructure planners to evaluate mitigation investments.
- ✅ An explainable, causal-chain-driven simulator providing transparent "Why did it fail?" diagnostics.
- ✅ A testbed for multi-objective budget optimization and dependency-aware disaster recovery planning.

### What CascadeX Is Not:
- ❌ A certified civil or structural engineering design tool.
- ❌ A predictive real-time emergency dispatch system.
- ❌ A real municipal infrastructure vulnerability assessment or municipal audit.
