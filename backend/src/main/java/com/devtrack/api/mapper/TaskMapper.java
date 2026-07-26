package com.devtrack.api.mapper;

import com.devtrack.api.dto.TaskListDto;
import com.devtrack.api.model.Task;

public final class TaskMapper {

    private TaskMapper() {}

    public static TaskListDto toListDto(Task t) {
        if (t == null) return null;
        TaskListDto d = new TaskListDto();

        d.setId(t.getId());
        d.setJtrackId(t.getJtrackId());
        d.setTitle(t.getTitle());
        d.setDescription(t.getDescription());
        d.setProject(t.getProject());
        d.setSprintId(t.getSprintId());
        d.setBranchName(t.getBranchName());
        d.setBranchCreationDate(t.getBranchCreationDate());
        d.setBranchMergeDate(t.getBranchMergeDate());
        d.setLabels(t.getLabels());
        d.setModule(t.getModule());
        d.setDueDate(t.getDueDate());
        d.setBrdDocumentId(t.getBrdDocumentId());

        d.setStatus(t.getStatus());
        d.setPriority(t.getPriority());
        d.setEfforts(t.getEfforts());
        d.setPds(t.getPds());
        d.setGitLinks(t.getGitLinks());
        d.setCodeReviewComments(t.getCodeReviewComments());
        d.setRemarks(t.getRemarks());

        d.setDeploymentNote(t.getDeploymentNote());
        d.setServerPath(t.getServerPath());
        d.setItemsToDeploy(t.getItemsToDeploy());

        d.setChangesRequested(t.isChangesRequested());
        d.setRollbackCount(t.getRollbackCount());
        d.setUnitTestDocUrl(t.getUnitTestDocUrl());
        d.setUnitTestDocName(t.getUnitTestDocName());
        d.setQualityRisk(t.isQualityRisk());

        d.setTestingDuration(t.getTestingDuration());
        d.setTestingComments(t.getTestingComments());
        d.setTotalBugsRaised(t.getTotalBugsRaised());
        d.setTotalRetests(t.getTotalRetests());
        d.setReassignmentReason(t.getReassignmentReason());
        d.setInPool(t.isInPool());

        // Milestone / timeline dates
        d.setDevStartDate(t.getDevStartDate());
        d.setSitDate(t.getSitDate());
        d.setSitCompletedDate(t.getSitCompletedDate());
        d.setCodeReviewDate(t.getCodeReviewDate());
        d.setTestingStartedDate(t.getTestingStartedDate());
        d.setTestingCompletedDate(t.getTestingCompletedDate());
        d.setUatDate(t.getUatDate());
        d.setUatCompletedDate(t.getUatCompletedDate());
        d.setPreprodDate(t.getPreprodDate());
        d.setProductionDate(t.getProductionDate());
        d.setExpectedSitDeploymentDate(t.getExpectedSitDeploymentDate());
        d.setExpectedUatDeploymentDate(t.getExpectedUatDeploymentDate());
        d.setReassignmentDate(t.getReassignmentDate());
        d.setInPoolDate(t.getInPoolDate());
        d.setCreatedDate(t.getCreatedDate());
        d.setUpdatedDate(t.getUpdatedDate());

        // Relations
        d.setType(t.getType());
        d.setAssignedDeveloper(t.getAssignedDeveloper());
        d.setCreatedBy(t.getCreatedBy());
        d.setWorkflow(t.getWorkflow());
        d.setTester(t.getTester());
        d.setApprover(t.getApprover());
        d.setDeploymentOwner(t.getDeploymentOwner());
        d.setReassignedBy(t.getReassignedBy());
        d.setPreviousTester(t.getPreviousTester());
        d.setDevelopers(t.getDevelopers());
        d.setSprintTasks(t.getSprintTasks());

        return d;
    }
}