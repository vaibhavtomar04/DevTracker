package com.devtrack.api.controller;

import com.devtrack.api.model.TaskType;
import com.devtrack.api.repository.TaskTypeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/task-types")
public class TaskTypeController {

    @Autowired
    private TaskTypeRepository taskTypeRepository;

    @GetMapping
    public List<TaskType> getAllTaskTypes() {
        return taskTypeRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<TaskType> createTaskType(@RequestBody TaskType taskType) {
        return ResponseEntity.ok(taskTypeRepository.save(taskType));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTaskType(@PathVariable Long id) {
        taskTypeRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
