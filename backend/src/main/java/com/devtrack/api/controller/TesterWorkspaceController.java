package com.devtrack.api.controller;

import com.devtrack.api.dto.TestedCrDto;
import com.devtrack.api.model.ReportJob;
import com.devtrack.api.model.User;
import com.devtrack.api.repository.UserRepository;
import com.devtrack.api.services.AsyncReportService;
import com.devtrack.api.services.TesterWorkspaceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/tester-workspace")
@RequiredArgsConstructor
@Tag(name = "Tester Workspace", description = "Tester Workspace and Tested CRs APIs")
@CrossOrigin(origins = "*")
public class TesterWorkspaceController {

    private final TesterWorkspaceService testerWorkspaceService;
    private final AsyncReportService asyncReportService;
    private final UserRepository userRepository;

    @GetMapping("/tested-crs")
    @PreAuthorize("hasAnyRole('TESTER', 'TESTADMIN', 'DEVADMIN')")
    @Operation(summary = "Get tested CRs list", description = "Returns page of CRs tested by the logged-in tester (scoped server-side).")
    public ResponseEntity<Page<TestedCrDto>> getTestedCrs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(defaultValue = "testingCompletedDate,desc") String sort,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String project,
            @RequestParam(required = false) Long sprintId,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate
    ) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username).orElseThrow();

        Page<TestedCrDto> result = testerWorkspaceService.getTestedCrs(
                currentUser, page, size, sort, search, project, sprintId, priority, status, startDate, endDate
        );
        return ResponseEntity.ok(result);
    }

    @PostMapping("/tested-crs/export")
    @PreAuthorize("hasAnyRole('TESTER', 'TESTADMIN', 'DEVADMIN')")
    @Operation(summary = "Export tested CRs to Excel", description = "Initiates async Excel generation, returning HTTP 202 and Job ID.")
    public ResponseEntity<Map<String, Object>> exportTestedCrs(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String project,
            @RequestParam(required = false) Long sprintId,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate
    ) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username).orElseThrow();

        ReportJob job = asyncReportService.createJob(currentUser, "TESTED_CRS");
        asyncReportService.processTestedCrsReportJob(
                job.getJobId(), currentUser, search, project, sprintId, priority, status, startDate, endDate
        );

        URI statusUri = URI.create("/api/reports/jobs/" + job.getJobId());
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .location(statusUri)
                .body(Map.of(
                        "jobId", job.getJobId(),
                        "status", job.getStatus(),
                        "statusUrl", statusUri.toString(),
                        "message", "Async export initiated."
                ));
    }
}
