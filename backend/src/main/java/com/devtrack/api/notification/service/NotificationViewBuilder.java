package com.devtrack.api.notification.service;

import com.devtrack.api.model.Task;
import com.devtrack.api.model.User;
import com.devtrack.api.notification.model.NotificationPriority;
import com.devtrack.api.notification.model.NotificationType;
import com.devtrack.api.notification.model.NotificationView;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Year;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Builds a normalized, data-driven NotificationView model consumed by the master Thymeleaf template.
 */
@Service
public class NotificationViewBuilder {

    @Value("${devtrack.mail.app-name:DevTrack 2.0}")
    private String appName;

    @Value("${devtrack.mail.tagline:Enterprise Engineering Workflow Platform}")
    private String tagline;

    @Value("${devtrack.mail.logo-url:https://raw.githubusercontent.com/devtrack/assets/main/logo.png}")
    private String logoUrl;

    @Value("${devtrack.mail.support-email:support@devtrack.com}")
    private String supportEmail;

    @Value("${devtrack.mail.support-url:https://devtrack.com/support}")
    private String supportUrl;

    @Value("${devtrack.mail.base-url:http://localhost:8080}")
    private String baseUrl;

    public NotificationView buildView(NotificationType type, NotificationPriority priority, Map<String, Object> data, String locale) {
        // 1. Subject formatting: [DevTrack][<PRIORITY>] <Title>
        String subject;
        if (priority.isShowInSubject()) {
            subject = String.format("[DevTrack][%s] %s", priority.getLabel(), type.getTitle());
        } else {
            subject = String.format("[DevTrack] %s", type.getTitle());
        }

        // 2. Banner Intent colors (Emerald, Copper, Teal, Amber, Crimson)
        String bannerColor = switch (type.getDefaultIntent()) {
            case "SUCCESS" -> "#1FAE7A";
            case "APPROVAL" -> "#C2703D";
            case "WARNING" -> "#E0A52E";
            case "FAILURE" -> "#D4503E";
            default -> "#2FA4A0"; // INFORMATION
        };

        // 3. Brand Info
        NotificationView.BrandInfo brand = NotificationView.BrandInfo.builder()
                .appName(appName)
                .tagline(tagline)
                .logoUrl(logoUrl)
                .supportEmail(supportEmail)
                .supportUrl(supportUrl)
                .build();

        // 4. Banner Info
        NotificationView.BannerInfo banner = NotificationView.BannerInfo.builder()
                .title(type.getTitle())
                .color(bannerColor)
                .iconUrl("https://raw.githubusercontent.com/devtrack/assets/main/icons/bell.png")
                .build();

        // 5. Dynamic Info Card Rows
        List<NotificationView.CardRow> cardRows = new ArrayList<>();
        if (data.containsKey("username")) cardRows.add(new NotificationView.CardRow("Username", (String) data.get("username")));
        if (data.containsKey("temporaryPassword")) cardRows.add(new NotificationView.CardRow("Temporary Password", (String) data.get("temporaryPassword")));
        if (data.containsKey("expiryTime")) cardRows.add(new NotificationView.CardRow("Expires In", (String) data.get("expiryTime")));

        Task task = (Task) data.get("task");
        if (task != null) {
            cardRows.add(new NotificationView.CardRow("CR Number", task.getJtrackId()));
            cardRows.add(new NotificationView.CardRow("Title", task.getTitle()));
            cardRows.add(new NotificationView.CardRow("Priority", task.getPriority()));
            cardRows.add(new NotificationView.CardRow("Status", task.getStatus()));
            if (task.getAssignedDeveloper() != null) cardRows.add(new NotificationView.CardRow("Assigned Dev", task.getAssignedDeveloper().getFullName()));
        }

        // 6. Timeline steps (optional)
        List<NotificationView.TimelineStep> timeline = null;
        if (task != null) {
            timeline = List.of(
                    NotificationView.TimelineStep.builder().label("Created").completed(true).build(),
                    NotificationView.TimelineStep.builder().label("Development").completed(task.getDevStartDate() != null).build(),
                    NotificationView.TimelineStep.builder().label("SIT").completed(task.getSitDate() != null).build(),
                    NotificationView.TimelineStep.builder().label("Testing").completed(task.getUatDate() != null).build(),
                    NotificationView.TimelineStep.builder().label("Production").completed(task.getProductionDate() != null).build()
            );
        }

        // 7. Additional Info (comments/remarks)
        List<NotificationView.CardRow> additionalInfo = null;
        if (data.containsKey("remarks")) {
            additionalInfo = List.of(new NotificationView.CardRow("Remarks", (String) data.get("remarks")));
        }

        // 8. Action URL
        String actionUrl = baseUrl;
        if (task != null) actionUrl += "/dashboard/crs";

        String fullName = (String) data.getOrDefault("fullName", "DevTrack Engineer");

        return NotificationView.builder()
                .subject(subject)
                .preheader(type.getTitle() + " update for your workspace.")
                .locale(locale != null ? locale : "en")
                .brand(brand)
                .banner(banner)
                .fullName(fullName)
                .cardRows(cardRows)
                .bodyText((String) data.get("bodyText"))
                .timeline(timeline)
                .actionButtonText("View in DevTrack")
                .actionUrl(actionUrl)
                .additionalInfo(additionalInfo)
                .showSecurityNotice(type.isSecurityRelated())
                .currentYear(String.valueOf(Year.now().getValue()))
                .applicationVersion("2.0.0")
                .environment("PRODUCTION")
                .build();
    }
}
