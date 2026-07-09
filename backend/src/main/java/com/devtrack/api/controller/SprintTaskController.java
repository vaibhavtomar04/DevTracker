package com.devtrack.api.controller;

import com.devtrack.api.dto.SprintTaskDto;
import com.devtrack.api.services.SprintTaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*", maxAge = 3600)
public class SprintTaskController {

    @Autowired
    private SprintTaskService sprintTaskService;

    @GetMapping("/sprint-tasks")
    public ResponseEntity<List<SprintTaskDto>> getAllSprintTasks(
            @RequestParam(required = false) Long sprintId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority) {
        return ResponseEntity.ok(sprintTaskService.getAllSprintTasks(sprintId, status, priority));
    }

    @GetMapping("/sprint-tasks/{id}")
    public ResponseEntity<SprintTaskDto> getSprintTaskById(@PathVariable Long id) {
        return ResponseEntity.ok(sprintTaskService.getSprintTaskById(id));
    }

    @PostMapping("/sprint-tasks")
    public ResponseEntity<SprintTaskDto> createSprintTask(@RequestBody SprintTaskDto dto) {
        return ResponseEntity.ok(sprintTaskService.createSprintTask(dto));
    }

    @PutMapping("/sprint-tasks/{id}")
    public ResponseEntity<SprintTaskDto> updateSprintTask(@PathVariable Long id, @RequestBody SprintTaskDto dto) {
        return ResponseEntity.ok(sprintTaskService.updateSprintTask(id, dto));
    }

    @PostMapping("/sprint-tasks/{id}/complete")
    public ResponseEntity<SprintTaskDto> completeSprintTask(@PathVariable Long id) {
        return ResponseEntity.ok(sprintTaskService.completeSprintTask(id));
    }

    // Dependencies
    @GetMapping("/sprint-tasks/{id}/dependencies")
    public ResponseEntity<List<SprintTaskDto>> getPrerequisiteTasks(@PathVariable Long id) {
        return ResponseEntity.ok(sprintTaskService.getPrerequisiteTasks(id));
    }

    @PostMapping("/sprint-tasks/{id}/dependencies")
    public ResponseEntity<?> addDependency(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload) {
        Long dependsOnTaskId = Long.valueOf(payload.get("dependsOnTaskId").toString());
        String type = (String) payload.get("dependencyType");
        sprintTaskService.addDependency(id, dependsOnTaskId, type);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/sprint-tasks/{id}/dependencies")
    public ResponseEntity<?> deleteDependency(
            @PathVariable Long id,
            @RequestParam Long dependsOnTaskId) {
        sprintTaskService.deleteDependency(id, dependsOnTaskId);
        return ResponseEntity.ok().build();
    }

    // Graph
    @GetMapping("/sprints/{id}/task-dependency-graph")
    public ResponseEntity<Map<String, Object>> getSprintDependencyGraph(@PathVariable Long id) {
        return ResponseEntity.ok(sprintTaskService.getSprintDependencyGraph(id));
    }

    // CR task links
    @PostMapping("/crs/{id}/link-sprint-tasks")
    public ResponseEntity<?> linkSprintTasksToCR(
            @PathVariable Long id,
            @RequestBody List<Long> sprintTaskIds) {
        sprintTaskService.linkSprintTasksToCR(id, sprintTaskIds);
        return ResponseEntity.ok().build();
    }
}
