package com.devtrack.api.services;

import com.devtrack.api.dto.SprintTaskDto;
import com.devtrack.api.model.*;
import com.devtrack.api.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class SprintTaskService {

    @Autowired
    private SprintTaskRepository sprintTaskRepository;

    @Autowired
    private SprintTaskDependencyRepository dependencyRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private UserRepository userRepository;

    public List<SprintTaskDto> getAllSprintTasks(Long sprintId, String status, String priority) {
        List<SprintTask> tasks = sprintTaskRepository.findAll();
        return tasks.stream()
                .filter(t -> sprintId == null || sprintId.equals(t.getSprintId()))
                .filter(t -> status == null || status.equalsIgnoreCase(t.getStatus()))
                .filter(t -> priority == null || priority.equalsIgnoreCase(t.getPriority()))
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public SprintTaskDto getSprintTaskById(Long id) {
        SprintTask task = sprintTaskRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sprint Task not found"));
        return convertToDto(task);
    }

    public SprintTaskDto createSprintTask(SprintTaskDto dto) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username).orElseThrow();
        
        boolean isAdmin = currentUser.getRoles().contains(Role.DEVADMIN) || 
                          currentUser.getRoles().contains(Role.TESTADMIN);

        SprintTask task = new SprintTask();
        task.setTitle(dto.getTitle());
        task.setDescription(dto.getDescription());
        task.setSprintId(dto.getSprintId());
        task.setStoryPoints(dto.getStoryPoints() != null ? dto.getStoryPoints() : 0);
        task.setEstimatedHours(dto.getEstimatedHours() != null ? dto.getEstimatedHours() : 0);
        task.setPriority(dto.getPriority() != null ? dto.getPriority() : "Medium");
        task.setDueDate(dto.getDueDate());
        task.setStatus(dto.getStatus() != null ? dto.getStatus() : "OPEN");
        task.setCompletionRule(dto.getCompletionRule() != null ? dto.getCompletionRule() : "KEEP_OPEN");
        task.setCreatedBy(currentUser.getUsername());
        task.setModifiedBy(currentUser.getUsername());

        // Enforce Assignment Rule
        if (isAdmin) {
            if (dto.getAssignedDeveloperId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assigned Developer is mandatory for Admin creation");
            }
            User dev = userRepository.findById(dto.getAssignedDeveloperId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assigned Developer not found"));
            task.setAssignedDeveloper(dev);
        } else {
            // Auto-assign to developer creator
            task.setAssignedDeveloper(currentUser);
        }

        // Generate Task Code
        long count = sprintTaskRepository.count();
        String taskCode = "STK-" + (count + 101);
        while (sprintTaskRepository.findByTaskCode(taskCode).isPresent()) {
            count++;
            taskCode = "STK-" + (count + 101);
        }
        task.setTaskCode(taskCode);

        SprintTask saved = sprintTaskRepository.save(task);

        // Link CRs if provided
        if (dto.getLinkedCrIds() != null && !dto.getLinkedCrIds().isEmpty()) {
            for (Long crId : dto.getLinkedCrIds()) {
                Task cr = taskRepository.findById(crId).orElse(null);
                if (cr != null) {
                    cr.getSprintTasks().add(saved);
                    taskRepository.save(cr);
                }
            }
        }

        return convertToDto(saved);
    }

    public SprintTaskDto updateSprintTask(Long id, SprintTaskDto dto) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        SprintTask task = sprintTaskRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sprint Task not found"));

        task.setTitle(dto.getTitle());
        task.setDescription(dto.getDescription());
        task.setSprintId(dto.getSprintId());
        task.setStoryPoints(dto.getStoryPoints());
        task.setEstimatedHours(dto.getEstimatedHours());
        task.setPriority(dto.getPriority());
        task.setDueDate(dto.getDueDate());
        task.setStatus(dto.getStatus());
        task.setCompletionRule(dto.getCompletionRule());
        task.setModifiedBy(username);

        if (dto.getAssignedDeveloperId() != null) {
            User dev = userRepository.findById(dto.getAssignedDeveloperId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Developer not found"));
            task.setAssignedDeveloper(dev);
        }

        // Update CR links
        if (dto.getLinkedCrIds() != null) {
            // Unlink all currently linked CRs
            List<Task> currentCrs = new ArrayList<>(task.getLinkedCrs());
            for (Task cr : currentCrs) {
                cr.getSprintTasks().remove(task);
                taskRepository.save(cr);
            }
            task.getLinkedCrs().clear();

            // Link new CRs
            for (Long crId : dto.getLinkedCrIds()) {
                Task cr = taskRepository.findById(crId).orElse(null);
                if (cr != null) {
                    cr.getSprintTasks().add(task);
                    taskRepository.save(cr);
                    task.getLinkedCrs().add(cr);
                }
            }
        }

        SprintTask saved = sprintTaskRepository.save(task);
        return convertToDto(saved);
    }

    public SprintTaskDto completeSprintTask(Long id) {
        SprintTask task = sprintTaskRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sprint Task not found"));

        // Enforce Dependency Guard: all prerequisite tasks must be completed
        List<SprintTaskDependency> deps = dependencyRepository.findByTaskId(id);
        for (SprintTaskDependency dep : deps) {
            SprintTask depTask = sprintTaskRepository.findById(dep.getDependsOnTaskId()).orElse(null);
            if (depTask != null && !"COMPLETED".equals(depTask.getStatus())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, 
                        "Cannot complete task because prerequisite task '" + depTask.getTaskCode() + "' is not completed.");
            }
        }

        task.setStatus("COMPLETED");
        task.setModifiedBy(SecurityContextHolder.getContext().getAuthentication().getName());
        SprintTask saved = sprintTaskRepository.save(task);
        return convertToDto(saved);
    }

    // Dependencies
    public List<SprintTaskDto> getPrerequisiteTasks(Long taskId) {
        List<SprintTaskDependency> deps = dependencyRepository.findByTaskId(taskId);
        return deps.stream()
                .map(dep -> sprintTaskRepository.findById(dep.getDependsOnTaskId()).orElse(null))
                .filter(Objects::nonNull)
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public void addDependency(Long taskId, Long dependsOnTaskId, String type) {
        if (taskId.equals(dependsOnTaskId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Self-dependencies are not allowed.");
        }

        // Circular Dependency Cycle Guard using DFS
        if (isReachable(dependsOnTaskId, taskId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Circular dependency cycle detected.");
        }

        Optional<SprintTaskDependency> existing = dependencyRepository.findByTaskIdAndDependsOnTaskId(taskId, dependsOnTaskId);
        if (existing.isPresent()) {
            return;
        }

        SprintTaskDependency dep = new SprintTaskDependency();
        dep.setTaskId(taskId);
        dep.setDependsOnTaskId(dependsOnTaskId);
        dep.setDependencyType(type != null ? type : "BLOCKED_BY");
        dep.setCreatedBy(SecurityContextHolder.getContext().getAuthentication().getName());
        dep.setModifiedBy(SecurityContextHolder.getContext().getAuthentication().getName());
        dependencyRepository.save(dep);
    }

    public void deleteDependency(Long taskId, Long dependsOnTaskId) {
        dependencyRepository.deleteByTaskIdAndDependsOnTaskId(taskId, dependsOnTaskId);
    }

    private boolean isReachable(Long startId, Long targetId) {
        if (startId.equals(targetId)) {
            return true;
        }
        List<SprintTaskDependency> deps = dependencyRepository.findByTaskId(startId);
        for (SprintTaskDependency dep : deps) {
            if (isReachable(dep.getDependsOnTaskId(), targetId)) {
                return true;
            }
        }
        return false;
    }

    // Dependency Graph Query
    public Map<String, Object> getSprintDependencyGraph(Long sprintId) {
        List<SprintTask> tasks = sprintTaskRepository.findAll().stream()
                .filter(t -> sprintId.equals(t.getSprintId()))
                .collect(Collectors.toList());

        List<Long> taskIds = tasks.stream().map(SprintTask::getId).collect(Collectors.toList());

        List<SprintTaskDependency> deps = dependencyRepository.findAll().stream()
                .filter(d -> taskIds.contains(d.getTaskId()) && taskIds.contains(d.getDependsOnTaskId()))
                .collect(Collectors.toList());

        List<Map<String, Object>> nodes = tasks.stream().map(t -> {
            Map<String, Object> node = new HashMap<>();
            node.put("id", t.getId());
            node.put("taskCode", t.getTaskCode());
            node.put("title", t.getTitle());
            node.put("status", t.getStatus());
            node.put("priority", t.getPriority());
            node.put("storyPoints", t.getStoryPoints());
            node.put("assignee", t.getAssignedDeveloper() != null ? t.getAssignedDeveloper().getFullName() : "Unassigned");
            return node;
        }).collect(Collectors.toList());

        List<Map<String, Object>> edges = deps.stream().map(d -> {
            Map<String, Object> edge = new HashMap<>();
            edge.put("id", d.getId());
            edge.put("from", d.getDependsOnTaskId()); // prerequisite task
            edge.put("to", d.getTaskId());            // blocked task
            edge.put("type", d.getDependencyType());
            return edge;
        }).collect(Collectors.toList());

        Map<String, Object> graph = new HashMap<>();
        graph.put("nodes", nodes);
        graph.put("edges", edges);
        return graph;
    }

    // CR Task Link Endpoints
    public void linkSprintTasksToCR(Long crId, List<Long> sprintTaskIds) {
        Task cr = taskRepository.findById(crId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CR Task not found"));

        // Clear existing sprint tasks
        List<SprintTask> currentSprintTasks = new ArrayList<>(cr.getSprintTasks());
        for (SprintTask st : currentSprintTasks) {
            st.getLinkedCrs().remove(cr);
            sprintTaskRepository.save(st);
        }
        cr.getSprintTasks().clear();

        // Add new links
        for (Long stId : sprintTaskIds) {
            SprintTask st = sprintTaskRepository.findById(stId).orElse(null);
            if (st != null) {
                cr.getSprintTasks().add(st);
                st.getLinkedCrs().add(cr);
                sprintTaskRepository.save(st);
            }
        }
        taskRepository.save(cr);
    }

    private SprintTaskDto convertToDto(SprintTask task) {
        SprintTaskDto dto = new SprintTaskDto();
        dto.setId(task.getId());
        dto.setTaskCode(task.getTaskCode());
        dto.setTitle(task.getTitle());
        dto.setDescription(task.getDescription());
        dto.setSprintId(task.getSprintId());
        dto.setStoryPoints(task.getStoryPoints());
        dto.setEstimatedHours(task.getEstimatedHours());
        dto.setPriority(task.getPriority());
        dto.setDueDate(task.getDueDate());
        dto.setStatus(task.getStatus());
        dto.setCompletionRule(task.getCompletionRule());
        dto.setCreatedBy(task.getCreatedBy());
        dto.setCreatedDate(task.getCreatedDate());
        dto.setModifiedBy(task.getModifiedBy());
        dto.setModifiedDate(task.getModifiedDate());

        if (task.getAssignedDeveloper() != null) {
            dto.setAssignedDeveloperId(task.getAssignedDeveloper().getId());
            dto.setAssignedDeveloperName(task.getAssignedDeveloper().getFullName());
        }

        if (task.getLinkedCrs() != null) {
            dto.setLinkedCrIds(task.getLinkedCrs().stream().map(Task::getId).collect(Collectors.toList()));
            dto.setLinkedCrs(task.getLinkedCrs().stream().map(cr -> 
                new SprintTaskDto.CrSummaryDto(cr.getId(), cr.getJtrackId(), cr.getTitle(), cr.getStatus(), cr.getPriority())
            ).collect(Collectors.toList()));
        }

        return dto;
    }
}
