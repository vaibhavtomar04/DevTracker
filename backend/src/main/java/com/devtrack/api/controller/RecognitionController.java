package com.devtrack.api.controller;

import com.devtrack.api.model.User;
import com.devtrack.api.model.achievement.*;
import com.devtrack.api.repository.UserRepository;
import com.devtrack.api.repository.achievement.*;
import com.devtrack.api.services.achievement.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST API for the Achievements & Recognition module.
 *
 * <p><b>Security model:</b>
 * <ul>
 *   <li>All read endpoints are authenticated (any role).</li>
 *   <li>Admin-only endpoints require DEVADMIN or TESTADMIN.</li>
 *   <li>Score/achievement data is READ-ONLY for the authenticated user — the
 *       engine alone mutates it (spec §3).</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/recognition")
@Slf4j
@RequiredArgsConstructor
public class RecognitionController {

    private final RecognitionScoreRepository         scoreRepo;
    private final UserAchievementRepository          userAchievementRepo;
    private final AchievementProgressRepository      progressRepo;
    private final AchievementNotificationRepository  notifRepo;
    private final AchievementRepository              achievementRepo;
    private final AchievementCategoryRepository      categoryRepo;
    private final AchievementEvaluationService       evaluationService;
    private final AchievementNotificationService     notifService;
    private final RecognitionScoreService            scoreService;
    private final RecognitionAuditService            auditService;
    private final UserRepository                     userRepo;

    // ─────────────────────────────────────────────────────────────────────
    // Score & Profile
    // ─────────────────────────────────────────────────────────────────────

    /** GET /api/recognition/my/score — caller's recognition score + level */
    @GetMapping("/my/score")
    public ResponseEntity<?> myScore() {
        Long uid = currentUserId();
        java.util.Optional<com.devtrack.api.model.achievement.RecognitionScore> scoreOpt = scoreRepo.findByUserId(uid);
        if (scoreOpt.isPresent()) {
            return ResponseEntity.ok(scoreOpt.get());
        }
        return ResponseEntity.ok(java.util.Map.of(
                "message", "No recognition data yet — start completing CRs!",
                "totalScore", 0));
    }

    /** GET /api/recognition/users/{id}/score — any user's score (view only) */
    @GetMapping("/users/{id}/score")
    public ResponseEntity<?> userScore(@PathVariable Long id) {
        java.util.Optional<com.devtrack.api.model.achievement.RecognitionScore> scoreOpt = scoreRepo.findByUserId(id);
        if (scoreOpt.isPresent()) {
            return ResponseEntity.ok(scoreOpt.get());
        }
        return ResponseEntity.ok(java.util.Map.of("totalScore", 0));
    }

    // ─────────────────────────────────────────────────────────────────────
    // Achievements
    // ─────────────────────────────────────────────────────────────────────

    /** GET /api/recognition/my/achievements — caller's unlocked achievements */
    @GetMapping("/my/achievements")
    public ResponseEntity<Page<UserAchievement>> myAchievements(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("unlockDate").descending());
        return ResponseEntity.ok(
                userAchievementRepo.findByUserIdAndActiveFlag(currentUserId(), 1, pageable));
    }

    /** GET /api/recognition/my/achievements/progress — achievement progress list */
    @GetMapping("/my/achievements/progress")
    public ResponseEntity<List<AchievementProgress>> myProgress() {
        return ResponseEntity.ok(
                progressRepo.findByUserId(currentUserId()));
    }

    /** GET /api/recognition/users/{id}/achievements — any user's achievements */
    @GetMapping("/users/{id}/achievements")
    public ResponseEntity<Page<UserAchievement>> userAchievements(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("unlockDate").descending());
        return ResponseEntity.ok(
                userAchievementRepo.findByUserIdAndActiveFlag(id, 1, pageable));
    }

    /** GET /api/recognition/achievements — catalogue of all achievements */
    @GetMapping("/achievements")
    public ResponseEntity<Page<Achievement>> catalogue(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String rarity) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("category", "pointValue").descending());
        if (category != null && rarity != null) {
            return ResponseEntity.ok(achievementRepo.findByCategoryCodeAndRarityAndActiveFlag(category, rarity, 1, pageable));
        }
        if (category != null) {
            return ResponseEntity.ok(achievementRepo.findByCategoryCodeAndActiveFlag(category, 1, pageable));
        }
        if (rarity != null) {
            return ResponseEntity.ok(achievementRepo.findByRarityAndActiveFlag(rarity, 1, pageable));
        }
        return ResponseEntity.ok(achievementRepo.findByActiveFlag(1, pageable));
    }

    /** GET /api/recognition/categories — achievement categories */
    @GetMapping("/categories")
    public ResponseEntity<List<AchievementCategory>> categories() {
        return ResponseEntity.ok(categoryRepo.findByActiveFlagOrderByDisplayOrderAsc(1));
    }

    // ─────────────────────────────────────────────────────────────────────
    // Notifications
    // ─────────────────────────────────────────────────────────────────────

    /** GET /api/recognition/my/notifications */
    @GetMapping("/my/notifications")
    public ResponseEntity<Page<AchievementNotification>> myNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdDate").descending());
        return ResponseEntity.ok(
                notifRepo.findByUserIdAndActiveFlag(currentUserId(), 1, pageable));
    }

    /** GET /api/recognition/my/notifications/unread-count */
    @GetMapping("/my/notifications/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount() {
        return ResponseEntity.ok(Map.of("count", notifService.unreadCount(currentUserId())));
    }

    /** POST /api/recognition/my/notifications/mark-read */
    @PostMapping("/my/notifications/mark-read")
    public ResponseEntity<Void> markAllRead() {
        notifService.markAllRead(currentUserId());
        return ResponseEntity.ok().build();
    }

    // ─────────────────────────────────────────────────────────────────────
    // Admin endpoints
    // ─────────────────────────────────────────────────────────────────────

    /**
     * POST /api/recognition/admin/grant-achievement
     * Body: { userId, achievementCode, reason }
     *
     * Used for admin-verified achievements (mentoring, certifications, etc.)
     */
    @PostMapping("/admin/grant-achievement")
    @PreAuthorize("hasAnyRole('DEVADMIN', 'TESTADMIN')")
    public ResponseEntity<Map<String, Object>> adminGrant(@RequestBody Map<String, Object> payload) {
        Long userId = Long.valueOf(payload.get("userId").toString());
        String code   = payload.get("achievementCode").toString();
        String reason = payload.getOrDefault("reason", "Admin-granted achievement").toString();
        String actor  = SecurityContextHolder.getContext().getAuthentication().getName();

        evaluationService.grantAdminAchievement(userId, code, reason, actor);
        scoreService.applyDeltaAndRecalculate(userId, actor);
        auditService.logManualAction("GRANT_ACHIEVEMENT", userId, "Code: " + code + ", Reason: " + reason, actor);

        return ResponseEntity.ok(Map.of(
                "message", "Achievement granted successfully",
                "userId", userId,
                "code", code));
    }

    /**
     * POST /api/recognition/admin/recalculate/{userId}?suppressEmail=true
     * Forces a full score recalculation for a user (admin only).
     * Use after data migrations or manual corrections.
     * Pass suppressEmail=true to prevent triggering notification emails on unlock.
     */
    @PostMapping("/admin/recalculate/{userId}")
    @PreAuthorize("hasAnyRole('DEVADMIN', 'TESTADMIN')")
    public ResponseEntity<Map<String, Object>> adminRecalculate(
            @PathVariable Long userId,
            @RequestParam(required = false, defaultValue = "false") boolean suppressEmail) {
        String actor = SecurityContextHolder.getContext().getAuthentication().getName();
        scoreService.applyDeltaAndRecalculate(userId, actor, suppressEmail);
        evaluationService.evaluateForUser(userId, actor, suppressEmail);
        auditService.logManualAction("RECALCULATE_SCORE", userId, "Full recalculation triggered (suppressEmail=" + suppressEmail + ")", actor);
        return ResponseEntity.ok(Map.of(
                "message", "Recalculation triggered",
                "userId", userId,
                "suppressEmail", suppressEmail));
    }

    /**
     * GET /api/recognition/admin/equity-audit
     * Evaluates Gini coefficient and rank concentration to detect privilege skew or bias.
     */
    @GetMapping("/admin/equity-audit")
    @PreAuthorize("hasAnyRole('DEVADMIN', 'TESTADMIN')")
    public ResponseEntity<Map<String, Object>> getEquityAudit() {
        return ResponseEntity.ok(auditService.analyzeEquityAndBias());
    }

    // ─────────────────────────────────────────────────────────────────────

    private Long currentUserId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepo.findByUsername(username).orElseThrow();
        return user.getId();
    }
}
