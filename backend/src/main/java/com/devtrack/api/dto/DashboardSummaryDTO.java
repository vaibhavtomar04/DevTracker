package com.devtrack.api.dto;

import java.util.List;

public class DashboardSummaryDTO {
    private StatsSummary stats;
    private UserSummary user;
    private ActiveSprintSummary activeSprint;
    private long unreadNotificationCount;
    private List<RecentCrSummary> recentCrs;
    private List<PendingTaskSummary> pendingTasks;
    /** Server-resolved scope: ALL (admin) or MINE (developer/tester). Never trust from client. */
    private String scope;

    public DashboardSummaryDTO() {}

    public DashboardSummaryDTO(StatsSummary stats, UserSummary user, ActiveSprintSummary activeSprint,
                               long unreadNotificationCount, List<RecentCrSummary> recentCrs,
                               List<PendingTaskSummary> pendingTasks, String scope) {
        this.stats = stats;
        this.user = user;
        this.activeSprint = activeSprint;
        this.unreadNotificationCount = unreadNotificationCount;
        this.recentCrs = recentCrs;
        this.pendingTasks = pendingTasks;
        this.scope = scope;
    }

    public StatsSummary getStats() { return stats; }
    public void setStats(StatsSummary stats) { this.stats = stats; }

    public UserSummary getUser() { return user; }
    public void setUser(UserSummary user) { this.user = user; }

    public ActiveSprintSummary getActiveSprint() { return activeSprint; }
    public void setActiveSprint(ActiveSprintSummary activeSprint) { this.activeSprint = activeSprint; }

    public long getUnreadNotificationCount() { return unreadNotificationCount; }
    public void setUnreadNotificationCount(long unreadNotificationCount) { this.unreadNotificationCount = unreadNotificationCount; }

    public List<RecentCrSummary> getRecentCrs() { return recentCrs; }
    public void setRecentCrs(List<RecentCrSummary> recentCrs) { this.recentCrs = recentCrs; }

    public List<PendingTaskSummary> getPendingTasks() { return pendingTasks; }
    public void setPendingTasks(List<PendingTaskSummary> pendingTasks) { this.pendingTasks = pendingTasks; }

    public String getScope() { return scope; }
    public void setScope(String scope) { this.scope = scope; }

    public static class StatsSummary {
        private long totalCrs;
        private long pendingApprovals;
        private long activeBugs;
        private long completedUat;

        public StatsSummary() {}
        public StatsSummary(long totalCrs, long pendingApprovals, long activeBugs, long completedUat) {
            this.totalCrs = totalCrs;
            this.pendingApprovals = pendingApprovals;
            this.activeBugs = activeBugs;
            this.completedUat = completedUat;
        }

        public long getTotalCrs() { return totalCrs; }
        public void setTotalCrs(long totalCrs) { this.totalCrs = totalCrs; }

        public long getPendingApprovals() { return pendingApprovals; }
        public void setPendingApprovals(long pendingApprovals) { this.pendingApprovals = pendingApprovals; }

        public long getActiveBugs() { return activeBugs; }
        public void setActiveBugs(long activeBugs) { this.activeBugs = activeBugs; }

        public long getCompletedUat() { return completedUat; }
        public void setCompletedUat(long completedUat) { this.completedUat = completedUat; }
    }

    public static class UserSummary {
        private Long id;
        private String username;
        private String fullName;
        private String email;
        private List<String> roles;

        public UserSummary() {}
        public UserSummary(Long id, String username, String fullName, String email, List<String> roles) {
            this.id = id;
            this.username = username;
            this.fullName = fullName;
            this.email = email;
            this.roles = roles;
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }

        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public List<String> getRoles() { return roles; }
        public void setRoles(List<String> roles) { this.roles = roles; }
    }

    public static class ActiveSprintSummary {
        private Long id;
        private String name;
        private String goal;
        private String startDate;
        private String endDate;
        private String status;
        private int totalTasks;
        private int completedTasks;

        public ActiveSprintSummary() {}
        public ActiveSprintSummary(Long id, String name, String goal, String startDate, String endDate,
                                   String status, int totalTasks, int completedTasks) {
            this.id = id;
            this.name = name;
            this.goal = goal;
            this.startDate = startDate;
            this.endDate = endDate;
            this.status = status;
            this.totalTasks = totalTasks;
            this.completedTasks = completedTasks;
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getGoal() { return goal; }
        public void setGoal(String goal) { this.goal = goal; }

        public String getStartDate() { return startDate; }
        public void setStartDate(String startDate) { this.startDate = startDate; }

        public String getEndDate() { return endDate; }
        public void setEndDate(String endDate) { this.endDate = endDate; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public int getTotalTasks() { return totalTasks; }
        public void setTotalTasks(int totalTasks) { this.totalTasks = totalTasks; }

        public int getCompletedTasks() { return completedTasks; }
        public void setCompletedTasks(int completedTasks) { this.completedTasks = completedTasks; }
    }

    public static class RecentCrSummary {
        private Long id;
        private String jtrackId;
        private String title;
        private String priority;
        private String status;
        private String updatedDate;
        private String assignedDeveloperName;

        public RecentCrSummary() {}
        public RecentCrSummary(Long id, String jtrackId, String title, String priority, String status,
                               String updatedDate, String assignedDeveloperName) {
            this.id = id;
            this.jtrackId = jtrackId;
            this.title = title;
            this.priority = priority;
            this.status = status;
            this.updatedDate = updatedDate;
            this.assignedDeveloperName = assignedDeveloperName;
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getJtrackId() { return jtrackId; }
        public void setJtrackId(String jtrackId) { this.jtrackId = jtrackId; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getPriority() { return priority; }
        public void setPriority(String priority) { this.priority = priority; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public String getUpdatedDate() { return updatedDate; }
        public void setUpdatedDate(String updatedDate) { this.updatedDate = updatedDate; }

        public String getAssignedDeveloperName() { return assignedDeveloperName; }
        public void setAssignedDeveloperName(String assignedDeveloperName) { this.assignedDeveloperName = assignedDeveloperName; }
    }

    public static class PendingTaskSummary {
        private Long id;
        private String jtrackId;
        private String title;
        private String priority;
        private String status;
        private String dueDate;

        public PendingTaskSummary() {}
        public PendingTaskSummary(Long id, String jtrackId, String title, String priority, String status, String dueDate) {
            this.id = id;
            this.jtrackId = jtrackId;
            this.title = title;
            this.priority = priority;
            this.status = status;
            this.dueDate = dueDate;
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getJtrackId() { return jtrackId; }
        public void setJtrackId(String jtrackId) { this.jtrackId = jtrackId; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getPriority() { return priority; }
        public void setPriority(String priority) { this.priority = priority; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public String getDueDate() { return dueDate; }
        public void setDueDate(String dueDate) { this.dueDate = dueDate; }
    }
}
