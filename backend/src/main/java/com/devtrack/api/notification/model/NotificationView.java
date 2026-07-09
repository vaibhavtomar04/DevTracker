package com.devtrack.api.notification.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationView {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BrandInfo {
        private String appName;
        private String tagline;
        private String logoUrl;
        private String supportEmail;
        private String supportUrl;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BannerInfo {
        private String title;
        private String color;  // Emerald (#1FAE7A), Copper (#C2703D), Teal (#2FA4A0), Amber (#E0A52E), Crimson (#D4503E)
        private String iconUrl;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CardRow {
        private String label;
        private String value;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TimelineStep {
        private String label;
        private boolean completed;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttachmentSummary {
        private String name;
        private String size;
    }

    private String subject;
    private String preheader;
    private String locale;
    private BrandInfo brand;
    private BannerInfo banner;
    private String fullName;
    private List<CardRow> cardRows;
    private String bodyText;
    private List<TimelineStep> timeline;
    private List<AttachmentSummary> attachments;
    private String actionButtonText;
    private String actionUrl;
    private List<CardRow> additionalInfo;
    private boolean showSecurityNotice;
    private String currentYear;
    private String applicationVersion;
    private String environment;
}
