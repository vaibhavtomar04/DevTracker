package com.devtrack.api.controller;

import com.devtrack.api.model.Sprint;
import com.devtrack.api.model.Task;
import com.devtrack.api.repository.SprintRepository;
import com.devtrack.api.repository.TaskRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sprints")
public class SprintController {

    @Autowired
    private SprintRepository sprintRepository;

    @Autowired
    private TaskRepository taskRepository;

    @GetMapping
    public List<Sprint> getAllSprints() {
        return sprintRepository.findAllByOrderByCreatedDateDesc();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('DEVADMIN', 'TESTADMIN', 'DEVELOPER')")
    public Sprint createSprint(@RequestBody Sprint sprint) {
        if (sprint.getStatus() == null) {
            sprint.setStatus("FUTURE");
        }
        return sprintRepository.save(sprint);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('DEVADMIN', 'TESTADMIN', 'DEVELOPER')")
    public ResponseEntity<Sprint> updateSprint(@PathVariable Long id, @RequestBody Sprint sprintDetails) {
        return sprintRepository.findById(id)
                .map(sprint -> {
                    sprint.setName(sprintDetails.getName());
                    sprint.setGoal(sprintDetails.getGoal());
                    sprint.setStartDate(sprintDetails.getStartDate());
                    sprint.setEndDate(sprintDetails.getEndDate());
                    if (sprintDetails.getStatus() != null) {
                        sprint.setStatus(sprintDetails.getStatus());
                    }
                    return ResponseEntity.ok(sprintRepository.save(sprint));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('DEVADMIN', 'TESTADMIN', 'DEVELOPER')")
    public ResponseEntity<?> deleteSprint(@PathVariable Long id) {
        return sprintRepository.findById(id)
                .map(sprint -> {
                    List<Task> tasks = taskRepository.findBySprintId(id);
                    for (Task task : tasks) {
                        task.setSprintId(null);
                        taskRepository.save(task);
                    }
                    sprintRepository.delete(sprint);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/start")
    @PreAuthorize("hasAnyRole('DEVADMIN', 'TESTADMIN', 'DEVELOPER')")
    public ResponseEntity<?> startSprint(@PathVariable Long id) {
        return sprintRepository.findById(id)
                .map(sprint -> {
                    List<Sprint> sprints = sprintRepository.findAll();
                    for (Sprint s : sprints) {
                        if ("ACTIVE".equals(s.getStatus())) {
                            s.setStatus("COMPLETED");
                            sprintRepository.save(s);
                        }
                    }
                    sprint.setStatus("ACTIVE");
                    return ResponseEntity.ok(sprintRepository.save(sprint));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('DEVADMIN', 'TESTADMIN', 'DEVELOPER')")
    public ResponseEntity<?> completeSprint(@PathVariable Long id) {
        return sprintRepository.findById(id)
                .map(sprint -> {
                    sprint.setStatus("COMPLETED");
                    return ResponseEntity.ok(sprintRepository.save(sprint));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
