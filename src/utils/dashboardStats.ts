/**
 * Dashboard Stats Utility
 * Manages user statistics for the dashboard
 * Data is stored in localStorage and should be synced with backend API when available
 */

interface UserStats {
  totalProblems: number;
  totalSimulations: number;
  successRate: number;
  currentStreak: number;
  globalRank: number | null;
  weeklyActivity: { day: string; problems: number }[];
  arenaDistribution: { name: string; value: number; color: string }[];
  dsaTopicsDistribution: { name: string; value: number; color: string }[];
}

const STATS_KEY = "userStats";

/**
 * Get current user stats from localStorage
 */
export function getUserStats(): UserStats | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(STATS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse user stats", e);
      return null;
    }
  }
  return null;
}

/**
 * Save user stats to localStorage
 */
export function saveUserStats(stats: UserStats): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

/**
 * Update stats when a DSA problem is solved
 * @param topic - The topic of the problem (e.g., "Arrays", "Strings", "Trees", "Graphs")
 * @param arena - The arena/category (e.g., "Frontend", "Backend")
 */
export function updateProblemSolved(
  topic: string,
  arena: string = "DSA",
): void {
  if (typeof window === "undefined") return;

  let stats = getUserStats();

  if (!stats) {
    stats = getDefaultStats();
  }

  // Increment total problems
  stats.totalProblems += 1;

  // Update topic distribution
  const topicIndex = stats.dsaTopicsDistribution.findIndex(
    (t) => t.name === topic,
  );
  if (topicIndex !== -1) {
    stats.dsaTopicsDistribution[topicIndex].value += 1;
  }

  // Update arena distribution
  const arenaIndex = stats.arenaDistribution.findIndex((a) => a.name === arena);
  if (arenaIndex !== -1) {
    stats.arenaDistribution[arenaIndex].value += 1;
  }

  // Update weekly activity
  const today = getDayOfWeek();
  const weekIndex = stats.weeklyActivity.findIndex((w) => w.day === today);
  if (weekIndex !== -1) {
    stats.weeklyActivity[weekIndex].problems += 1;
  }

  // Update streak
  updateStreak(stats);

  saveUserStats(stats);
}

/**
 * Update stats when a simulation is completed
 */
export function updateSimulationCompleted(): void {
  if (typeof window === "undefined") return;

  let stats = getUserStats();

  if (!stats) {
    stats = getDefaultStats();
  }

  stats.totalSimulations += 1;

  // Update arena distribution for simulations
  const simIndex = stats.arenaDistribution.findIndex(
    (a) => a.name === "Simulations",
  );
  if (simIndex !== -1) {
    stats.arenaDistribution[simIndex].value += 1;
  }

  updateStreak(stats);
  saveUserStats(stats);
}

/**
 * Get default stats object
 */
function getDefaultStats(): UserStats {
  return {
    totalProblems: 0,
    totalSimulations: 0,
    successRate: 0,
    currentStreak: 0,
    globalRank: null,
    weeklyActivity: [
      { day: "Mon", problems: 0 },
      { day: "Tue", problems: 0 },
      { day: "Wed", problems: 0 },
      { day: "Thu", problems: 0 },
      { day: "Fri", problems: 0 },
      { day: "Sat", problems: 0 },
      { day: "Sun", problems: 0 },
    ],
    arenaDistribution: [
      { name: "Frontend", value: 0, color: "#000000" },
      { name: "Backend", value: 0, color: "#4B5563" },
      { name: "Simulations", value: 0, color: "#6B7280" },
      { name: "DevOps", value: 0, color: "#9CA3AF" },
    ],
    dsaTopicsDistribution: [
      { name: "Arrays", value: 0, color: "#000000" },
      { name: "Strings", value: 0, color: "#4B5563" },
      { name: "Trees", value: 0, color: "#6B7280" },
      { name: "Graphs", value: 0, color: "#9CA3AF" },
    ],
  };
}

/**
 * Get current day of week as short name
 */
function getDayOfWeek(): string {
  const dayIndex = new Date().getDay();

  // Map Sunday=0 to the expected format where Mon is first
  const dayMap: Record<number, string> = {
    0: "Sun",
    1: "Mon",
    2: "Tue",
    3: "Wed",
    4: "Thu",
    5: "Fri",
    6: "Sat",
  };

  return dayMap[dayIndex];
}

/**
 * Update user streak based on activity
 */
function updateStreak(stats: UserStats): void {
  const today = getDayOfWeek();
  const todayActivity = stats.weeklyActivity.find((w) => w.day === today);

  if (todayActivity && todayActivity.problems > 0) {
    // If user solved a problem today, increment streak
    // Note: In production, this should be calculated from backend based on consecutive days
    stats.currentStreak = Math.max(1, stats.currentStreak);
  }
}

/**
 * Reset weekly activity (call this on sunday night or manually)
 */
export function resetWeeklyActivity(): void {
  if (typeof window === "undefined") return;

  let stats = getUserStats();

  if (!stats) {
    stats = getDefaultStats();
  }

  stats.weeklyActivity = [
    { day: "Mon", problems: 0 },
    { day: "Tue", problems: 0 },
    { day: "Wed", problems: 0 },
    { day: "Thu", problems: 0 },
    { day: "Fri", problems: 0 },
    { day: "Sat", problems: 0 },
    { day: "Sun", problems: 0 },
  ];

  saveUserStats(stats);
}

/**
 * Set global rank from leaderboard
 */
export function setGlobalRank(rank: number): void {
  if (typeof window === "undefined") return;

  let stats = getUserStats();

  if (!stats) {
    stats = getDefaultStats();
  }

  stats.globalRank = rank;

  saveUserStats(stats);
}
