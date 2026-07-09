package com.devtrack.api.controller;

import com.devtrack.api.model.ReportJob;
import com.devtrack.api.model.User;
import com.devtrack.api.repository.ReportJobRepository;
import com.devtrack.api.repository.UserRepository;
import com.devtrack.api.services.AsyncReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.URI;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Tag(name = "Reports", description = "Asynchronous report generation and export APIs")
@CrossOrigin(origins = "*")
public class ReportJobController {

    private final AsyncReportService asyncReportService;
    private final ReportJobRepository reportJobRepository;
    private final UserRepository userRepository;

    @PostMapping("/export")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Request asynchronous report generation", description = "Returns HTTP 202 Accepted with job status Location header.")
    public ResponseEntity<Map<String, Object>> requestReport(@RequestParam(defaultValue = "TASKS") String type) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username).orElseThrow();

        ReportJob job = asyncReportService.createJob(currentUser, type);
        asyncReportService.processReportJob(job.getJobId()); // Fires asynchronously via ThreadPoolTaskExecutor

        URI statusUri = URI.create("/api/reports/jobs/" + job.getJobId());
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .location(statusUri)
                .body(Map.of(
                        "jobId", job.getJobId(),
                        "status", job.getStatus(),
                        "statusUrl", statusUri.toString(),
                        "message", "Report generation initiated asynchronously."
                ));
    }

    @GetMapping("/jobs/{jobId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Poll report job status", description = "Returns job status state machine state (QUEUED, RUNNING, READY, FAILED).")
    public ResponseEntity<ReportJob> getJobStatus(@PathVariable String jobId) {
        ReportJob job = reportJobRepository.findByJobId(jobId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report job not found: " + jobId));
        return ResponseEntity.ok(job);
    }

    @GetMapping("/download/{token}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Download completed report file", description = "Streams raw Excel file using signed, time-limited download token.")
    public void downloadReport(@PathVariable String token, HttpServletResponse response) throws IOException {
        ReportJob job = reportJobRepository.findByDownloadToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invalid or expired download token."));

        if (job.getStatus() != ReportJob.Status.READY || job.getFilePath() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Report is not ready for download.");
        }

        File file = new File(job.getFilePath());
        if (!file.exists()) {
            throw new ResponseStatusException(HttpStatus.GONE, "Report file has expired or been purged.");
        }

        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + job.getFileName() + "\"");
        response.setContentLengthLong(file.length());

        try (FileInputStream in = new FileInputStream(file); OutputStream out = response.getOutputStream()) {
            in.transferTo(out);
            out.flush();
        }
    }
}
