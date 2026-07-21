import APP_CONFIG from "@/config/appConfig";

export interface RecognitionScore {
  id: number;
  totalScore: number;
  qualityScore: number;
  approvalRate: number;
  deploymentSuccessRate: number;
  sprintSuccessRate: number;
  escapedDefectRate: number;
  reopenRate: number;
  currentLevel?: {
    id: number;
    levelNumber: number;
    title: number | string;
    iconName: string;
    colorHex: string;
    minPoints: number;
    maxPoints: number;
  };
  lastRecalculated: string;
}

export interface UserAchievement {
  id: number;
  unlockDate: string;
  unlockReason: string;
  pointsAwarded: number;
  achievement: {
    id: number;
    code: string;
    name: string;
    description: string;
    iconName: string;
    rarity: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";
    pointValue: number;
    category?: {
      id: number;
      code: string;
      name: string;
      iconName: string;
    };
  };
}

export interface AchievementProgress {
  id: number;
  currentValue: number;
  targetValue: number;
  percentComplete: number;
  lastEvaluated: string;
  achievement: {
    id: number;
    code: string;
    name: string;
    description: string;
    iconName: string;
    rarity: string;
    pointValue: number;
  };
}

export interface AchievementCatalogueItem {
  id: number;
  code: string;
  name: string;
  description: string;
  iconName: string;
  rarity: string;
  pointValue: number;
  isMilestone: number;
  category?: {
    id: number;
    code: string;
    name: string;
  };
}

export interface LeaderboardEntry {
  scoreId: number;
  userId: number;
  fullName: string;
  username: string;
  totalScore: number;
  qualityScore: number;
  approvalRate: number;
  deploymentSuccessRate: number;
  sprintSuccessRate: number;
  levelTitle: string;
  levelNumber: number;
  levelIcon: string;
}

export interface AchievementNotification {
  id: number;
  notificationType: string;
  title: string;
  message: string;
  pointsDelta: number;
  isRead: number;
  createdDate: string;
}

const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const recognitionService = {
  async getMyScore(): Promise<RecognitionScore | null> {
    const res = await fetch(`${APP_CONFIG.apiUrl}/api/recognition/my/score`, { headers: getHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    return data.totalScore !== undefined ? data : null;
  },

  async getMyAchievements(page = 0, size = 20): Promise<{ content: UserAchievement[]; totalElements: number }> {
    const res = await fetch(`${APP_CONFIG.apiUrl}/api/recognition/my/achievements?page=${page}&size=${size}`, { headers: getHeaders() });
    if (!res.ok) return { content: [], totalElements: 0 };
    return res.json();
  },

  async getMyProgress(): Promise<AchievementProgress[]> {
    const res = await fetch(`${APP_CONFIG.apiUrl}/api/recognition/my/achievements/progress`, { headers: getHeaders() });
    if (!res.ok) return [];
    return res.json();
  },

  async getCatalogue(page = 0, size = 50, category?: string, rarity?: string): Promise<{ content: AchievementCatalogueItem[] }> {
    let url = `${APP_CONFIG.apiUrl}/api/recognition/achievements?page=${page}&size=${size}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    if (rarity) url += `&rarity=${encodeURIComponent(rarity)}`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) return { content: [] };
    return res.json();
  },

  async getLeaderboard(page = 0, size = 10, period = "ALL_TIME"): Promise<{ content: LeaderboardEntry[] }> {
    const res = await fetch(`${APP_CONFIG.apiUrl}/api/recognition/leaderboard?page=${page}&size=${size}&period=${period}`, { headers: getHeaders() });
    if (!res.ok) return { content: [] };
    return res.json();
  },

  async getTopLeaderboard(limit = 5): Promise<LeaderboardEntry[]> {
    const res = await fetch(`${APP_CONFIG.apiUrl}/api/recognition/leaderboard/top?limit=${limit}`, { headers: getHeaders() });
    if (!res.ok) return [];
    return res.json();
  },

  async getMyNotifications(): Promise<{ content: AchievementNotification[] }> {
    const res = await fetch(`${APP_CONFIG.apiUrl}/api/recognition/my/notifications`, { headers: getHeaders() });
    if (!res.ok) return { content: [] };
    return res.json();
  },

  async getUnreadNotificationCount(): Promise<number> {
    const res = await fetch(`${APP_CONFIG.apiUrl}/api/recognition/my/notifications/unread-count`, { headers: getHeaders() });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.count || 0;
  },

  async markNotificationsRead(): Promise<void> {
    await fetch(`${APP_CONFIG.apiUrl}/api/recognition/my/notifications/mark-read`, {
      method: "POST",
      headers: getHeaders(),
    });
  },

  async grantAdminAchievement(userId: number, achievementCode: string, reason: string): Promise<boolean> {
    const res = await fetch(`${APP_CONFIG.apiUrl}/api/recognition/admin/grant-achievement`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ userId, achievementCode, reason }),
    });
    return res.ok;
  }
};
