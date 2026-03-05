# Dashboard Stats Integration Guide

## Overview

The dashboard displays real user statistics that are stored in localStorage.
When problems are solved or simulations are completed, the stats should be
updated using the utility functions in `src/utils/dashboardStats.ts`.

## How Stats Work

1. **Storage**: All stats are stored in `localStorage` under the key `userStats`
2. **Display**: The dashboard reads from localStorage and shows "--" if no data
   exists
3. **Updates**: Stats are updated when:
   - A DSA problem is solved
   - A simulation is completed
   - User ranking changes

## Utility Functions

### Update Problem Solved

```typescript
import { updateProblemSolved } from "@/utils/dashboardStats";

// Call this when a user solves a DSA problem
updateProblemSolved("Arrays", "Frontend");
// Parameters:
// - topic: "Arrays" | "Strings" | "Trees" | "Graphs"
// - arena: "Frontend" | "Backend" | "DSA" (optional, defaults to "DSA")
```

### Update Simulation Completed

```typescript
import { updateSimulationCompleted } from "@/utils/dashboardStats";

// Call this when a user completes a simulation
updateSimulationCompleted();
```

### Set Global Rank

```typescript
import { setGlobalRank } from "@/utils/dashboardStats";

// Call this when fetching leaderboard data
setGlobalRank(247); // User's rank from leaderboard
```

### Get Current Stats

```typescript
import { getUserStats } from "@/utils/dashboardStats";

const stats = getUserStats();
console.log(stats.totalProblems); // 0 if no stats stored
```

## Integration Points

### DSA Arena Page

When a user successfully submits a solution in `/dashboard/dsa-arena`:

```typescript
// After successful submission
updateProblemSolved("Arrays"); // Update with actual topic
```

### Simulations Page

When a user completes a simulation in `/dashboard/simulations`:

```typescript
// After simulation completed
updateSimulationCompleted();
```

### Leaderboard Page

When the leaderboard loads and fetches user ranking:

```typescript
// After fetching from API
setGlobalRank(response.userRank);
```

## Chart Toggles

The dashboard has two chart views:

1. **Arena View**: Shows distribution across Frontend, Backend, Simulations,
   DevOps
2. **DSA Topics View**: Shows distribution across Arrays, Strings, Trees, Graphs

Both charts update automatically based on the data stored in stats.

## Stats Shown as "--"

All stats show "--" if the value is 0 (no data):

- **Problems Solved**: Shows "--" if totalProblems = 0
- **Simulations Done**: Shows "--" if totalSimulations = 0
- **Day Streak**: Shows "--" if currentStreak = 0
- **Global Ranking**: Shows "--" if globalRank = null

## Real Data Requirements

Update these stats from API as they become available:

- `globalRank`: From leaderboard API
- `successRate`: From submissions API
- `currentStreak`: Calculate from submission history API
- `weeklyActivity`: Track from daily submissions

## localStorage Format

```json
{
  "totalProblems": 5,
  "totalSimulations": 2,
  "successRate": 85,
  "currentStreak": 3,
  "globalRank": 247,
  "weeklyActivity": [
    { "day": "Mon", "problems": 2 },
    { "day": "Tue", "problems": 1 },
    ...
  ],
  "arenaDistribution": [
    { "name": "Frontend", "value": 3, "color": "#000000" },
    { "name": "Backend", "value": 2, "color": "#4B5563" },
    { "name": "Simulations", "value": 0, "color": "#6B7280" },
    { "name": "DevOps", "value": 0, "color": "#9CA3AF" }
  ],
  "dsaTopicsDistribution": [
    { "name": "Arrays", "value": 3, "color": "#000000" },
    { "name": "Strings", "value": 1, "color": "#4B5563" },
    { "name": "Trees", "value": 1, "color": "#6B7280" },
    { "name": "Graphs", "value": 0, "color": "#9CA3AF" }
  ]
}
```

## Updating Dashboard in Real-Time

The dashboard component checks for stats in the `useEffect` hook when the page
loads. To make it re-fetch stats after updates:

1. After calling `updateProblemSolved()` or `updateSimulationCompleted()`, the
   dashboard will automatically show the updated stats on page refresh
2. For real-time updates, you could dispatch an event or use a state management
   solution

Example with event:

```typescript
// After updating stats
updateProblemSolved("Arrays");
window.dispatchEvent(new Event("statsUpdated"));

// In dashboard component, add to useEffect dependencies
```
