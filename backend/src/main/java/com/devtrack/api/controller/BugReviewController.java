package com.devtrack.api.controller;

import com.devtrack.api.dto.BugReviewProposedDto;
import com.devtrack.api.dto.BugRejectionDto;
import com.devtrack.api.dto.BugReviewResponseDto;
import com.devtrack.api.model.BugReview;
import com.devtrack.api.model.BugRejection;
import com.devtrack.api.model.Bug;
import com.devtrack.api.model.User;
import com.devtrack.api.repository.UserRepository;
import com.devtrack.api.repository.BugRejectionRepository;
import com.devtrack.api.repository.BugReviewRepository;
import com.devtrack.api.services.BugValidationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bug-reviews")
@Slf4j
@CrossOrigin(origins = "*")
public class BugReviewController {

    @Autowired
    private BugValidationService bugValidationService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BugReviewRepository bugReviewRepository;

    @Autowired
    private BugRejectionRepository bugRejectionRepository;

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Logged in user not found."));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('TESTER', 'TESTADMIN', 'ADMIN')")
    public ResponseEntity<?> proposeBugReview(@RequestBody BugReviewProposedDto dto) {
        try {
            User tester = getCurrentUser();
            BugReview review = bugValidationService.proposeBugReview(dto, tester);
            return ResponseEntity.ok(review);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/accept")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'DEVADMIN', 'TESTADMIN', 'ADMIN')")
    public ResponseEntity<?> acceptReview(@PathVariable Long id) {
        try {
            User actor = getCurrentUser();
            Bug bug = bugValidationService.acceptReview(id, actor, null);
            return ResponseEntity.ok(bug);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'DEVADMIN', 'TESTADMIN', 'ADMIN')")
    public ResponseEntity<?> rejectReview(@PathVariable Long id, @RequestBody BugRejectionDto dto) {
        try {
            User developer = getCurrentUser();
            BugReview review = bugValidationService.rejectReview(id, dto, developer);
            return ResponseEntity.ok(review);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/tester-accept")
    @PreAuthorize("hasAnyRole('TESTER', 'TESTADMIN', 'ADMIN')")
    public ResponseEntity<?> testerAcceptExplanation(@PathVariable Long id) {
        try {
            User tester = getCurrentUser();
            BugReview review = bugValidationService.testerAcceptExplanation(id, tester);
            return ResponseEntity.ok(review);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/raise-again")
    @PreAuthorize("hasAnyRole('TESTER', 'TESTADMIN', 'ADMIN')")
    public ResponseEntity<?> testerRaiseAgain(@PathVariable Long id) {
        try {
            User tester = getCurrentUser();
            BugReview review = bugValidationService.testerRaiseAgain(id, tester);
            return ResponseEntity.ok(review);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/challenge")
    @PreAuthorize("hasAnyRole('TESTER', 'TESTADMIN', 'ADMIN')")
    public ResponseEntity<?> testerChallenge(@PathVariable Long id) {
        try {
            User tester = getCurrentUser();
            BugReview review = bugValidationService.testerChallenge(id, tester);
            return ResponseEntity.ok(review);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/admin-accept")
    @PreAuthorize("hasAnyRole('DEVADMIN', 'TESTADMIN', 'ADMIN')")
    public ResponseEntity<?> adminAcceptRejection(@PathVariable Long id) {
        try {
            User admin = getCurrentUser();
            BugReview review = bugValidationService.adminAcceptRejection(id, admin);
            return ResponseEntity.ok(review);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/admin-force")
    @PreAuthorize("hasAnyRole('DEVADMIN', 'TESTADMIN', 'ADMIN')")
    public ResponseEntity<?> adminForceAccept(@PathVariable Long id) {
        try {
            User admin = getCurrentUser();
            Bug bug = bugValidationService.adminForceAccept(id, admin);
            return ResponseEntity.ok(bug);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getReviewById(@PathVariable Long id) {
        return bugReviewRepository.findById(id)
                .map(review -> {
                    List<BugRejection> rejections = bugRejectionRepository.findByBugReviewId(id);
                    return ResponseEntity.ok(new BugReviewResponseDto(review, rejections));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/cr/{crId}")
    public ResponseEntity<?> getReviewsByCrId(@PathVariable Long crId) {
        List<BugReview> reviews = bugReviewRepository.findByCrId(crId);
        return ResponseEntity.ok(reviews);
    }

    @GetMapping
    public ResponseEntity<?> getAllBugReviews() {
        return ResponseEntity.ok(bugReviewRepository.findAll());
    }
}
