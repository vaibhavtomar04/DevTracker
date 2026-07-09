package com.devtrack.api.services;

import com.devtrack.api.dto.TestedCrDto;
import com.devtrack.api.model.*;
import com.devtrack.api.repository.SprintRepository;
import com.devtrack.api.repository.TaskRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TesterWorkspaceService {

    private final TaskRepository taskRepository;
    private final SprintRepository sprintRepository;

    /**
     * Scoped search, filter, sort and paginate through CRs successfully tested by current user.
     */
    public Page<TestedCrDto> getTestedCrs(
            User currentUser,
            int page,
            int size,
            String sort,
            String search,
            String project,
            Long sprintId,
            String priority,
            String status,
            LocalDateTime startDate,
            LocalDateTime endDate
    ) {
        boolean isAdmin = currentUser.getRoles().contains(Role.DEVADMIN) || currentUser.getRoles().contains(Role.TESTADMIN);

        Specification<Task> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Scoped criteria: testingCompletedDate is NOT NULL (marks it as tested)
            predicates.add(cb.isNotNull(root.get("testingCompletedDate")));

            // Regular testers can only view their own tested CRs
            if (!isAdmin) {
                predicates.add(cb.equal(root.get("tester"), currentUser));
            }

            // 2. Full-text search matching jtrackId, title, or description
            if (search != null && !search.trim().isEmpty()) {
                String likePattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("jtrackId")), likePattern),
                        cb.like(cb.lower(root.get("title")), likePattern),
                        cb.like(cb.lower(root.get("description")), likePattern)
                ));
            }

            // 3. Exact field filters
            if (project != null && !project.trim().isEmpty()) {
                predicates.add(cb.equal(cb.lower(root.get("project")), project.trim().toLowerCase()));
            }
            if (sprintId != null) {
                predicates.add(cb.equal(root.get("sprintId"), sprintId));
            }
            if (priority != null && !priority.trim().isEmpty()) {
                predicates.add(cb.equal(cb.lower(root.get("priority")), priority.trim().toLowerCase()));
            }
            if (status != null && !status.trim().isEmpty()) {
                predicates.add(cb.equal(cb.lower(root.get("status")), status.trim().toLowerCase()));
            }
            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("testingCompletedDate"), startDate));
            }
            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("testingCompletedDate"), endDate));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        // Parse sorting string (e.g. "jtrackId,desc" or "testingCompletedDate,asc")
        Sort sortObj = Sort.unsorted();
        if (sort != null && !sort.trim().isEmpty()) {
            String[] parts = sort.split(",");
            String field = parts[0];
            String dir = parts.length > 1 ? parts[1] : "asc";
            sortObj = Sort.by(dir.equalsIgnoreCase("desc") ? Sort.Direction.DESC : Sort.Direction.ASC, field);
        } else {
            sortObj = Sort.by(Sort.Direction.DESC, "testingCompletedDate");
        }

        Pageable pageable = PageRequest.of(page, size, sortObj);
        Page<Task> taskPage = taskRepository.findAll(spec, pageable);

        // Fetch Sprint name mappings in a batch to avoid N+1 queries
        List<Long> sprintIds = taskPage.getContent().stream()
                .map(Task::getSprintId)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
        Map<Long, String> sprintNames = new HashMap<>();
        if (!sprintIds.isEmpty()) {
            List<Sprint> sprints = sprintRepository.findAllById(sprintIds);
            for (Sprint s : sprints) {
                sprintNames.put(s.getId(), s.getName());
            }
        }

        return taskPage.map(task -> {
            List<String> devs = task.getDevelopers().stream()
                    .map(td -> td.getDeveloper() != null ? td.getDeveloper().getFullName() : "Unknown")
                    .collect(Collectors.toList());

            String prodStatus = task.getProductionDate() != null ? "DEPLOYED" : "PENDING";

            return TestedCrDto.builder()
                    .id(task.getId())
                    .jtrackId(task.getJtrackId())
                    .title(task.getTitle())
                    .project(task.getProject() != null ? task.getProject() : "N/A")
                    .sprintId(task.getSprintId())
                    .sprintName(task.getSprintId() != null ? sprintNames.getOrDefault(task.getSprintId(), "Sprint " + task.getSprintId()) : "Ad-hoc")
                    .priority(task.getPriority())
                    .developers(devs)
                    .testingStartedDate(task.getTestingStartedDate())
                    .testingCompletedDate(task.getTestingCompletedDate())
                    .testingDuration(task.getTestingDuration() != null ? task.getTestingDuration() : "N/A")
                    .totalBugsRaised(task.getTotalBugsRaised() != null ? task.getTotalBugsRaised() : 0)
                    .totalRetests(task.getTotalRetests() != null ? task.getTotalRetests() : 0)
                    .productionStatus(prodStatus)
                    .finalStatus(task.getStatus())
                    .devStartDate(task.getDevStartDate())
                    .sitDate(task.getSitDate())
                    .uatDate(task.getUatDate())
                    .productionDate(task.getProductionDate())
                    .isQualityRisk(task.isQualityRisk())
                    .build();
        });
    }
}
