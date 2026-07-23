package com.devtrack.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSummaryDTO {
    private StatsSummary stats;
    private UserSummary user;
    private ActiveSprintSummary activeSprint;
    private long unreadNotificationCount;
    private List<RecentCrSummary> recentCrs;
    private List<PendingTaskSummary> pendingTasks;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StatsSummary {
        private long totalCrs;
        private long pendingApprovals;
        private long activeBugs;
        private long completedUat;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserSummary {
        private Long id;
        private String username;
        private String fullName;
        private String email;
        private List<String> roles;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ActiveSprintSummary {
        private Long id;
        private String name;
        private String goal;
        private String startDate;
        private String endDate;
        private String status;
        private int totalTasks;
        private int completedTasks;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentCrSummary {
        private Long id;
        private String jtrackId;
        private String title;
        private String priority;
        private String status;
        private String updatedDate;
        private String assignedDeveloperName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PendingTaskSummary {
        private Long id;
        private String jtrackId;
        private String title;
        private String priority;
        private String status;
        private String dueDate;
    }
}
