package com.devtrack.api.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import jakarta.mail.internet.MimeMessage;

/**
 * Listens for EmailEvents and dispatches messages asynchronously ONLY AFTER
 * database transactions commit successfully.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class EmailEventListener {

    private final JavaMailSender mailSender;

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleEmailEvent(EmailEvent event) {
        try {
            log.info("Async dispatching email to {} | Subject: {}", event.getRecipient(), event.getSubject());
            String body = event.getBody();
            if (body != null && (body.trim().startsWith("<!DOCTYPE html>") || body.trim().startsWith("<html"))) {
                MimeMessage mimeMessage = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
                helper.setTo(event.getRecipient());
                helper.setSubject(event.getSubject());
                helper.setText(body, true);
                mailSender.send(mimeMessage);
            } else {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setTo(event.getRecipient());
                message.setSubject(event.getSubject());
                message.setText(body != null ? body : "");
                mailSender.send(message);
            }
            log.info("Email successfully sent to {}", event.getRecipient());
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", event.getRecipient(), e.getMessage());
        }
    }
}
