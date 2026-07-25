package com.devtrack.api.controller;

import com.devtrack.api.services.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/api/analytics")
@CrossOrigin(origins = "*")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboardData() {
        return ResponseEntity.ok(analyticsService.getDashboardData());
    }

    @GetMapping("/deadlines")
    public ResponseEntity<Map<String, Object>> getDeadlineAnalytics() {
        return ResponseEntity.ok(analyticsService.getDeadlineAnalytics());
    }

    @GetMapping("/flow")
    public ResponseEntity<Map<String, Object>> getFlowAnalytics() {
        return ResponseEntity.ok(analyticsService.getFlowAnalytics());
    }

    @GetMapping("/quality")
    public ResponseEntity<Map<String, Object>> getQualityAnalytics() {
        return ResponseEntity.ok(analyticsService.getQualityAnalytics());
    }

    @GetMapping("/workload")
    public ResponseEntity<Map<String, Object>> getWorkloadAnalytics() {
        return ResponseEntity.ok(analyticsService.getWorkloadAnalytics());
    }

    @GetMapping("/delivery")
    public ResponseEntity<Map<String, Object>> getDeliveryAnalytics() {
        return ResponseEntity.ok(analyticsService.getDeliveryAnalytics());
    }

    @GetMapping("/recognition")
    public ResponseEntity<Map<String, Object>> getRecognitionAnalytics() {
        return ResponseEntity.ok(analyticsService.getRecognitionAnalytics());
    }

    @GetMapping("/audit")
    public ResponseEntity<Map<String, Object>> getAuditAnalytics(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(analyticsService.getAuditAnalytics(page, size));
    }
}
