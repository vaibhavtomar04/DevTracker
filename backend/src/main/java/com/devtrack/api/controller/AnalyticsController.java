package com.devtrack.api.controller;

import com.devtrack.api.services.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@CrossOrigin(origins = "*")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboardData(
            @RequestParam(defaultValue = "30d") String range,
            @RequestParam(defaultValue = "all") String scope,
            @RequestParam(required = false) String sprintId,
            @RequestParam(required = false) Long userId) {
        return ResponseEntity.ok(analyticsService.getDashboardData(range, scope, sprintId, userId));
    }

    @GetMapping("/deadlines")
    public ResponseEntity<Map<String, Object>> getDeadlineAnalytics(
            @RequestParam(defaultValue = "30d") String range,
            @RequestParam(defaultValue = "all") String scope,
            @RequestParam(required = false) String sprintId,
            @RequestParam(required = false) Long userId) {
        return ResponseEntity.ok(analyticsService.getDeadlineAnalytics(range, scope, sprintId, userId));
    }

     @GetMapping("/overview")
    public ResponseEntity<Map<String, Object>> getDashboardOverview(
            @RequestParam(defaultValue = "30d") String range,
            @RequestParam(defaultValue = "all") String scope,
            @RequestParam(required = false) String sprintId,
            @RequestParam(required = false) Long userId) {
        Map<String, Object> overview = new java.util.HashMap<>(
                analyticsService.getDashboardData(range, scope, sprintId, userId));
        overview.put("deadlines",
                analyticsService.getDeadlineAnalytics(range, scope, sprintId, userId));
        return ResponseEntity.ok(overview);
    }

    @GetMapping("/kpi")
    public ResponseEntity<Map<String, Object>> getKpiAnalytics(
            @RequestParam(defaultValue = "30d") String range,
            @RequestParam(defaultValue = "all") String scope,
            @RequestParam(required = false) String sprintId,
            @RequestParam(required = false) Long userId) {
        return ResponseEntity.ok(analyticsService.getKpiAnalytics(range, scope, sprintId, userId));
    }

    @GetMapping("/flow")
    public ResponseEntity<Map<String, Object>> getFlowAnalytics(
            @RequestParam(defaultValue = "30d") String range,
            @RequestParam(defaultValue = "all") String scope,
            @RequestParam(required = false) String sprintId,
            @RequestParam(required = false) Long userId) {
        return ResponseEntity.ok(analyticsService.getFlowAnalytics(range, scope, sprintId, userId));
    }

    @GetMapping("/flow/stage-durations")
    public ResponseEntity<Map<String, Object>> getStageDurations(
            @RequestParam(defaultValue = "30d") String range,
            @RequestParam(defaultValue = "all") String scope,
            @RequestParam(required = false) String sprintId,
            @RequestParam(required = false) Long userId) {
        return ResponseEntity.ok(analyticsService.getStageDurations(range, scope, sprintId, userId));
    }

    @GetMapping("/flow/cfd")
    public ResponseEntity<List<Map<String, Object>>> getCumulativeFlowDiagram(
            @RequestParam(defaultValue = "30d") String range,
            @RequestParam(defaultValue = "all") String scope,
            @RequestParam(required = false) String sprintId,
            @RequestParam(required = false) Long userId) {
        return ResponseEntity.ok(analyticsService.getCumulativeFlowDiagram(range, scope, sprintId, userId));
    }

    @GetMapping("/quality")
    public ResponseEntity<Map<String, Object>> getQualityAnalytics(
            @RequestParam(defaultValue = "30d") String range,
            @RequestParam(defaultValue = "all") String scope,
            @RequestParam(required = false) String sprintId,
            @RequestParam(required = false) Long userId) {
        return ResponseEntity.ok(analyticsService.getQualityAnalytics(range, scope, sprintId, userId));
    }

    @GetMapping("/workload")
    public ResponseEntity<Map<String, Object>> getWorkloadAnalytics(
            @RequestParam(defaultValue = "30d") String range,
            @RequestParam(defaultValue = "all") String scope,
            @RequestParam(required = false) String sprintId,
            @RequestParam(required = false) Long userId) {
        return ResponseEntity.ok(analyticsService.getWorkloadAnalytics(range, scope, sprintId, userId));
    }

    @GetMapping("/delivery")
    public ResponseEntity<Map<String, Object>> getDeliveryAnalytics(
            @RequestParam(defaultValue = "30d") String range,
            @RequestParam(defaultValue = "all") String scope,
            @RequestParam(required = false) String sprintId,
            @RequestParam(required = false) Long userId) {
        return ResponseEntity.ok(analyticsService.getDeliveryAnalytics(range, scope, sprintId, userId));
    }

    @GetMapping("/recognition")
    public ResponseEntity<Map<String, Object>> getRecognitionAnalytics(
            @RequestParam(defaultValue = "30d") String range,
            @RequestParam(defaultValue = "all") String scope,
            @RequestParam(required = false) String sprintId,
            @RequestParam(required = false) Long userId) {
        return ResponseEntity.ok(analyticsService.getRecognitionAnalytics(range, scope, sprintId, userId));
    }

    @GetMapping("/audit")
    public ResponseEntity<Map<String, Object>> getAuditAnalytics(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size,
            @RequestParam(defaultValue = "30d") String range,
            @RequestParam(defaultValue = "all") String scope,
            @RequestParam(required = false) String sprintId,
            @RequestParam(required = false) Long userId) {
        return ResponseEntity.ok(analyticsService.getAuditAnalytics(page, size, range, scope, sprintId, userId));
    }
}
