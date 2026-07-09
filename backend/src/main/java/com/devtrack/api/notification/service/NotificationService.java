package com.devtrack.api.notification.service;

import com.devtrack.api.model.User;
import com.devtrack.api.notification.model.*;
import com.devtrack.api.notification.repository.EmailAuditLogRepository;
import com.devtrack.api.notification.repository.UserNotificationPreferencesRepository;
import com.devtrack.api.repository.UserRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Central Notification Service executing recipient resolution, preference filtering,
 * Thymeleaf rendering, email dispatch, retry handling, and audit logging.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRecipientResolver recipientResolver;
    private final NotificationViewBuilder viewBuilder;
    private final UserNotificationPreferencesRepository preferencesRepository;
    private final EmailAuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final TemplateEngine templateEngine;
    private final JavaMailSender mailSender;

    @Async("taskExecutor")
    public void sendNotification(
            NotificationType notificationType,
            List<String> overrideTo,
            List<String> overrideCc,
            List<String> overrideBcc,
            Map<String, Object> templateData,
            NotificationPriority priorityOverride
    ) {
        try {
            NotificationPriority priority = priorityOverride != null ? priorityOverride : notificationType.getDefaultPriority();
            Map<String, Object> data = templateData != null ? new HashMap<>(templateData) : new HashMap<>();

            // 1. Resolve recipients if not overridden
            NotificationRecipientResolver.RecipientTarget target = recipientResolver.resolveRecipients(notificationType, data);
            List<String> toList = (overrideTo != null && !overrideTo.isEmpty()) ? overrideTo : target.to;
            List<String> ccList = (overrideCc != null && !overrideCc.isEmpty()) ? overrideCc : target.cc;

            if (toList.isEmpty()) {
                log.info("No recipients resolved for notificationType={}. Skipping dispatch.", notificationType);
                return;
            }

            // 2. Filter by user preferences (unless global/security mandatory)
            if (!notificationType.isGlobalPreference()) {
                toList = filterByPreferences(toList, notificationType);
            }

            if (toList.isEmpty()) {
                log.info("All recipients opted out for notificationType={}. Skipping dispatch.", notificationType);
                return;
            }

            // 3. Build normalized view model
            NotificationView view = viewBuilder.buildView(notificationType, priority, data, "en");

            // 4. Render master Thymeleaf template
            Context context = new Context();
            context.setVariable("view", view);
            context.setVariable("subject", view.getSubject());
            context.setVariable("preheader", view.getPreheader());
            context.setVariable("brand", view.getBrand());
            context.setVariable("banner", view.getBanner());
            context.setVariable("fullName", view.getFullName());
            context.setVariable("cardRows", view.getCardRows());
            context.setVariable("bodyText", view.getBodyText());
            context.setVariable("timeline", view.getTimeline());
            context.setVariable("attachments", view.getAttachments());
            context.setVariable("actionButtonText", view.getActionButtonText());
            context.setVariable("actionUrl", view.getActionUrl());
            context.setVariable("additionalInfo", view.getAdditionalInfo());
            context.setVariable("showSecurityNotice", view.isShowSecurityNotice());
            context.setVariable("currentYear", view.getCurrentYear());
            context.setVariable("applicationVersion", view.getApplicationVersion());
            context.setVariable("environment", view.getEnvironment());

            String htmlContent = templateEngine.process("email/master-email", context);

            // 5. Dispatch email with retry loop
            dispatchWithRetry(notificationType, toList, ccList, view.getSubject(), htmlContent);

        } catch (Exception e) {
            log.error("Unhandled error in NotificationService: {}", e.getMessage(), e);
        }
    }

    private List<String> filterByPreferences(List<String> emails, NotificationType type) {
        List<String> allowed = new ArrayList<>();
        for (String email : emails) {
            Optional<User> uOpt = userRepository.findByEmail(email);
            if (uOpt.isPresent()) {
                Optional<UserNotificationPreferences> prefOpt = preferencesRepository.findByUserId(uOpt.get().getId());
                if (prefOpt.isPresent()) {
                    UserNotificationPreferences pref = prefOpt.get();
                    if (type.name().startsWith("SPRINT") && !pref.isSprintNotifications()) continue;
                    if (type.name().startsWith("BUG") && !pref.isBugNotifications()) continue;
                    if (type.name().startsWith("DEPLOYMENT") && !pref.isDeploymentNotifications()) continue;
                    if (type.name().contains("SUMMARY") && !pref.isSummaryNotifications()) continue;
                }
            }
            allowed.add(email);
        }
        return allowed;
    }

    private void dispatchWithRetry(NotificationType type, List<String> to, List<String> cc, String subject, String htmlContent) {
        int maxRetries = 3;
        int attempts = 0;
        boolean sent = false;
        String lastError = null;
        String messageId = null;

        while (attempts < maxRetries && !sent) {
            attempts++;
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                helper.setFrom("noreply@devtrack.com", "DevTrack 2.0");
                helper.setTo(to.toArray(new String[0]));
                if (cc != null && !cc.isEmpty()) helper.setCc(cc.toArray(new String[0]));
                helper.setSubject(subject);
                helper.setText(htmlContent, true);

                mailSender.send(message);
                sent = true;
                messageId = message.getMessageID() != null ? message.getMessageID() : UUID.randomUUID().toString();
                log.info("Email successfully sent to {} | Subject: {}", to, subject);
            } catch (Exception e) {
                lastError = e.getMessage();
                log.warn("Attempt {}/{} failed sending email to {}: {}", attempts, maxRetries, to, e.getMessage());
                try { Thread.sleep(1000L * attempts); } catch (InterruptedException ignored) {}
            }
        }

        // 6. Audit Logging
        EmailAuditLog audit = EmailAuditLog.builder()
                .notificationType(type.name())
                .recipientTo(String.join(",", to))
                .recipientCc(cc != null ? String.join(",", cc) : "")
                .subject(subject)
                .status(sent ? "SENT" : "FAILED")
                .smtpMessageId(messageId)
                .retryCount(attempts - 1)
                .failureReason(sent ? null : lastError)
                .createdAt(LocalDateTime.now())
                .build();
        auditLogRepository.save(audit);
    }
}
