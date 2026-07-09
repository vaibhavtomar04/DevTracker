# Chapter 18: Analytics

This document presents the analytics dashboard, mathematical score formulas, velocity calculations, and performance metrics utilized in DevTrack 2.0.

---

## 18.1 Developer Engineering Score Formula
To evaluate developer efficiency, quality, and velocity, the system aggregates productivity metrics into a standardized **Engineering Score (ES)**.

$$ES = (E_d \times 10) - (B_{low} \times 1) - (B_{med} \times 2) - (B_{high} \times 5) - (B_{crit} \times 10) - (R \times 3)$$

Where:
- $E_d$: Total efforts (in days) of all closed CRs.
- $B_{low}, B_{med}, B_{high}, B_{crit}$: Number of bugs raised of corresponding severities on the developer's tasks.
- $R$: Number of re-opened/retested tasks (defect bounces).

### Business Meaning
A developer who delivers massive efforts with zero bug leakage receives a high positive score. Defective deliverables with multiple bug cycles significantly penalize the score, highlighting quality focus.

---

## 18.2 System Analytics Metrics

### 1. Sprint Velocity
- **Calculation**: Total effort days completed during a single sprint window divided by scheduled days.
- **Formula**:
  $$\text{Velocity} = \sum (\text{Efforts of tasks in 'CLOSED' / 'TESTING_COMPLETED' status})$$

### 2. Defect Density
- **Calculation**: Number of bugs found per Change Request.
- **Formula**:
  $$\text{Defect Density} = \frac{\text{Total Bugs}}{\text{Total CRs}}$$

### 3. Testing Quality Metric (Avg Testing Duration)
- **Calculation**: Evaluates average duration a tester spends on checking a CR in progress.
- **Formula**:
  $$\text{Avg Testing Duration} = \frac{\sum (\text{testingCompletedDate} - \text{testingStartedDate})}{\text{Count of Completed Tasks}}$$
- **Visuals**: Represented on the Analytics Dashboard using Chart.js bar and line charts showing sprint-by-sprint trends.
