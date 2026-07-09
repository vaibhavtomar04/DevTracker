package com.devtrack.api.controller;

import com.devtrack.api.model.TestCase;
import com.devtrack.api.repository.TestCaseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/test-cases")
public class TestCaseController {

    @Autowired
    private TestCaseRepository testCaseRepository;

    @GetMapping
    public List<TestCase> getAllTestCases() {
        return testCaseRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<TestCase> createTestCase(@RequestBody TestCase testCase) {
        TestCase saved = testCaseRepository.save(testCase);
        return new ResponseEntity<>(saved, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TestCase> updateTestCase(@PathVariable Long id, @RequestBody TestCase testCaseDetails) {
        return testCaseRepository.findById(id)
                .map(tc -> {
                    if (testCaseDetails.getStatus() != null) {
                        tc.setStatus(testCaseDetails.getStatus());
                    }
                    if (testCaseDetails.getTitle() != null) {
                        tc.setTitle(testCaseDetails.getTitle());
                    }
                    if (testCaseDetails.getDescription() != null) {
                        tc.setDescription(testCaseDetails.getDescription());
                    }
                    if (testCaseDetails.getSteps() != null) {
                        tc.setSteps(testCaseDetails.getSteps());
                    }
                    if (testCaseDetails.getExpectedResult() != null) {
                        tc.setExpectedResult(testCaseDetails.getExpectedResult());
                    }
                    TestCase updated = testCaseRepository.save(tc);
                    return ResponseEntity.ok(updated);
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
