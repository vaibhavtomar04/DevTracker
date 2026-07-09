package com.devtrack.api.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Entity
@Table(name = "test_cases")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class TestCase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "test_case_task_id")
    private Long testCaseTaskId; // maps to tasks.id (CR ID) or test_case_tasks.id in database

    private String title;

    @Column(length = 1000)
    private String description;

    @Column(length = 2000)
    private String steps;

    @Column(name = "expected_result", length = 1000)
    private String expectedResult;

    @Column(name = "created_by_id")
    private Long createdById;

    @Column(name = "created_date")
    private LocalDate createdDate;

    private String status = "PENDING"; // PASS, FAIL, PENDING

    @PrePersist
    protected void onCreate() {
        createdDate = LocalDate.now();
        if (status == null) {
            status = "PENDING";
        }
    }
}
