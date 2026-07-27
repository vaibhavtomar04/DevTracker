package com.devtrack.api.mapper;

import com.devtrack.api.dto.*;
import com.devtrack.api.model.Task;

import java.util.stream.Collectors;

public final class TaskMapper {

    private TaskMapper() {}

    public static TaskListDto toListDto(Task t) {
        if (t == null) return null;
        TaskListDto d = new TaskListDto();
        d.setId(t.getId()); d.setJtrackId(t.getJtrackId()); d.setTitle(t.getTitle());
        d.setDescription(t.getDescription()); d.setProject(t.getProject()); d.setSprintId(t.getSprintId());
        d.setBranchName(t.getBranchName()); d.setModule(t.getModule()); d.setStatus(t.getStatus());
        d.setPriority(t.getPriority()); d.setEfforts(t.getEfforts()); d.setGitLinks(t.getGitLinks());
        d.setBrdDocumentId(t.getBrdDocumentId()); d.setChangesRequested(t.isChangesRequested());
        d.setQualityRisk(t.isQualityRisk()); d.setInPool(t.isInPool());
        d.setTotalBugsRaised(t.getTotalBugsRaised()); d.setTotalRetests(t.getTotalRetests());
        d.setUnitTestDocId(t.getUnitTestDocId()); d.setUnitTestDocName(t.getUnitTestDocName());
        d.setDevStartDate(t.getDevStartDate()); d.setSitDate(t.getSitDate());
        d.setSitCompletedDate(t.getSitCompletedDate()); d.setCodeReviewDate(t.getCodeReviewDate());
        d.setUatDate(t.getUatDate()); d.setProductionDate(t.getProductionDate());
        d.setExpectedSitDeploymentDate(t.getExpectedSitDeploymentDate());
        d.setExpectedUatDeploymentDate(t.getExpectedUatDeploymentDate()); d.setCreatedDate(t.getCreatedDate());
        d.setType(TaskTypeSlimDto.from(t.getType()));
        d.setAssignedDeveloper(UserSlimDto.from(t.getAssignedDeveloper()));
        d.setCreatedBy(UserSlimDto.from(t.getCreatedBy())); d.setTester(UserSlimDto.from(t.getTester()));
        d.setWorkflow(WorkflowSlimDto.from(t.getWorkflow()));
        if (t.getDevelopers()!=null) d.setDevelopers(t.getDevelopers().stream().map(TaskDeveloperSlimDto::from).collect(Collectors.toList()));
        if (t.getSprintTasks()!=null) d.setSprintTasks(t.getSprintTasks().stream().map(SprintTaskSlimDto::from).collect(Collectors.toList()));
        return d;
    }

    public static TaskDetailDto toDetailDto(Task t) {
        if (t == null) return null;
        TaskDetailDto d = new TaskDetailDto();
        // core (same as list)…
        d.setId(t.getId()); d.setJtrackId(t.getJtrackId()); d.setTitle(t.getTitle());
        d.setDescription(t.getDescription()); d.setProject(t.getProject()); d.setSprintId(t.getSprintId());
        d.setBranchName(t.getBranchName()); d.setModule(t.getModule()); d.setStatus(t.getStatus());
        d.setPriority(t.getPriority()); d.setEfforts(t.getEfforts()); d.setGitLinks(t.getGitLinks());
        d.setBrdDocumentId(t.getBrdDocumentId()); d.setChangesRequested(t.isChangesRequested());
        d.setQualityRisk(t.isQualityRisk()); d.setInPool(t.isInPool());
        d.setTotalBugsRaised(t.getTotalBugsRaised()); d.setTotalRetests(t.getTotalRetests());
        d.setUnitTestDocId(t.getUnitTestDocId()); d.setUnitTestDocName(t.getUnitTestDocName());
        // detail-only scalars
        d.setLabels(t.getLabels()); d.setPds(t.getPds()); d.setCodeReviewComments(t.getCodeReviewComments());
        d.setRemarks(t.getRemarks()); d.setDeploymentNote(t.getDeploymentNote()); d.setServerPath(t.getServerPath());
        d.setItemsToDeploy(t.getItemsToDeploy()); d.setRollbackCount(t.getRollbackCount());
        d.setTestingDuration(t.getTestingDuration()); d.setTestingComments(t.getTestingComments());
        d.setReassignmentReason(t.getReassignmentReason());
        // detail dates
        d.setBranchCreationDate(t.getBranchCreationDate()); d.setBranchMergeDate(t.getBranchMergeDate());
        d.setDueDate(t.getDueDate()); d.setTestingStartedDate(t.getTestingStartedDate());
        d.setTestingCompletedDate(t.getTestingCompletedDate()); d.setUatCompletedDate(t.getUatCompletedDate());
        d.setPreprodDate(t.getPreprodDate()); d.setReassignmentDate(t.getReassignmentDate());
        d.setInPoolDate(t.getInPoolDate()); d.setUpdatedDate(t.getUpdatedDate());
        // shared dates
        d.setDevStartDate(t.getDevStartDate()); d.setSitDate(t.getSitDate());
        d.setSitCompletedDate(t.getSitCompletedDate()); d.setCodeReviewDate(t.getCodeReviewDate());
        d.setUatDate(t.getUatDate()); d.setProductionDate(t.getProductionDate());
        d.setExpectedSitDeploymentDate(t.getExpectedSitDeploymentDate());
        d.setExpectedUatDeploymentDate(t.getExpectedUatDeploymentDate()); d.setCreatedDate(t.getCreatedDate());
        // relations
        d.setType(TaskTypeSlimDto.from(t.getType()));
        d.setAssignedDeveloper(UserSlimDto.from(t.getAssignedDeveloper()));
        d.setCreatedBy(UserSlimDto.from(t.getCreatedBy())); d.setTester(UserSlimDto.from(t.getTester()));
        d.setApprover(UserSlimDto.from(t.getApprover())); d.setDeploymentOwner(UserSlimDto.from(t.getDeploymentOwner()));
        d.setReassignedBy(UserSlimDto.from(t.getReassignedBy())); d.setPreviousTester(UserSlimDto.from(t.getPreviousTester()));
        d.setWorkflow(WorkflowDetailDto.from(t.getWorkflow()));
        if (t.getDevelopers()!=null) d.setDevelopers(t.getDevelopers().stream().map(TaskDeveloperSlimDto::from).collect(Collectors.toList()));
        if (t.getSprintTasks()!=null) d.setSprintTasks(t.getSprintTasks().stream().map(SprintTaskSlimDto::from).collect(Collectors.toList()));
        return d;
    }
}