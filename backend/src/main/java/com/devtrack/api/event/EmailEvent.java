package com.devtrack.api.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * Event wrapper for transactional emails.
 * Published during business operations; processed asynchronously AFTER_COMMIT.
 */
@Getter
public class EmailEvent extends ApplicationEvent {

    private final String recipient;
    private final String subject;
    private final String body;

    public EmailEvent(Object source, String recipient, String subject, String body) {
        super(source);
        this.recipient = recipient;
        this.subject = subject;
        this.body = body;
    }
}
