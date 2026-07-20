package com.devtrack.api.notification.service;

import com.devtrack.api.model.Role;
import com.devtrack.api.model.Task;
import com.devtrack.api.model.User;
import com.devtrack.api.notification.model.NotificationType;
import com.devtrack.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Automatically resolves target TO and CC recipient email lists based on the NotificationType
 * and supplied domain objects (User, Task, Bug).
 */
@Service
@RequiredArgsConstructor
public class NotificationRecipientResolver {

    private final UserRepository userRepository;

    public static class RecipientTarget {
        public List<String> to = new ArrayList<>();
        public List<String> cc = new ArrayList<>();
    }

    public RecipientTarget resolveRecipients(NotificationType type, Map<String, Object> data) {
        RecipientTarget target = new RecipientTarget();

        List<User> admins = userRepository.findAll().stream()
                .filter(u -> u.getRoles().contains(Role.DEVADMIN) || u.getRoles().contains(Role.TESTADMIN))
                .filter(u -> u.getEmail() != null && !u.getEmail().isBlank())
                .collect(Collectors.toList());

        List<String> adminEmails = admins.stream().map(User::getEmail).collect(Collectors.toList());

        switch (type) {
            case WELCOME:
            case TEMPORARY_PASSWORD:
            case PASSWORD_RESET:
            case PASSWORD_CHANGED:
            case FORCE_PASSWORD_CHANGE:
            case ACCOUNT_LOCKED:
            case ACCOUNT_ACTIVATED:
                String targetEmail = (String) data.get("email");
                if (targetEmail != null) target.to.add(targetEmail);
                break;

            case CR_ASSIGNED:
            case CR_APPROVED:
                Task task = (Task) data.get("task");
                if (task != null && task.getAssignedDeveloper() != null && task.getAssignedDeveloper().getEmail() != null) {
                    target.to.add(task.getAssignedDeveloper().getEmail());
                }
                target.cc.addAll(adminEmails);
                break;

            case BUG_RAISED:
                Task bugCr = (Task) data.get("crTask");
                if (bugCr != null && bugCr.getAssignedDeveloper() != null && bugCr.getAssignedDeveloper().getEmail() != null) {
                    target.to.add(bugCr.getAssignedDeveloper().getEmail());
                }
                target.cc.addAll(adminEmails);
                break;

            case BUG_FIXED:
                User tester = (User) data.get("tester");
                Task fixedCr = (Task) data.get("crTask");
                if (tester != null && tester.getEmail() != null) target.to.add(tester.getEmail());
                if (fixedCr != null && fixedCr.getAssignedDeveloper() != null && fixedCr.getAssignedDeveloper().getEmail() != null) {
                    target.cc.add(fixedCr.getAssignedDeveloper().getEmail());
                }
                target.cc.addAll(adminEmails);
                break;

            case DEPLOYMENT_COMPLETED:
            case DEPLOYMENT_STARTED:
            case ROLLBACK_COMPLETED:
            case MILESTONE_DEADLINE_ALERT:
                Task depTask = (Task) data.get("task");
                if (depTask != null && depTask.getAssignedDeveloper() != null && depTask.getAssignedDeveloper().getEmail() != null) {
                    target.to.add(depTask.getAssignedDeveloper().getEmail());
                }
                target.to.addAll(adminEmails);
                break;

            case SPRINT_STARTED:
            case SPRINT_COMPLETED:
                List<String> allStaff = userRepository.findAll().stream()
                        .filter(u -> u.getEmail() != null && !u.getEmail().isBlank())
                        .map(User::getEmail)
                        .collect(Collectors.toList());
                target.to.addAll(allStaff);
                target.cc.addAll(adminEmails);
                break;

            default:
                String fallbackEmail = (String) data.get("email");
                if (fallbackEmail != null) target.to.add(fallbackEmail);
                break;
        }

        // Deduplicate
        target.to = target.to.stream().distinct().collect(Collectors.toList());
        target.cc = target.cc.stream().distinct().filter(c -> !target.to.contains(c)).collect(Collectors.toList());

        return target;
    }
}
