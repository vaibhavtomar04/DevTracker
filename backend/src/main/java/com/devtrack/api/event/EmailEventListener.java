package com.devtrack.api.event;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.client.RestTemplate;

import com.devtrack.api.dto.EmailRequestVo;
import com.devtrack.api.dto.ResponseVo;

import java.net.URI;

/**
 * Listens for EmailEvents and dispatches messages asynchronously ONLY AFTER
 * database transactions commit successfully using the external email notification API.
 */
@Component
@Slf4j
public class EmailEventListener {

    @Value("${send.notification.url}")
    private String sendNotificationUrl;

    @Value("${testing.mail.sender}")
    private String testingSender;

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleEmailEvent(EmailEvent event) {
        try {
            log.info("Async dispatching email to {} | Subject: {}", event.getRecipient(), event.getSubject());
            
            EmailRequestVo emailRequestVo = new EmailRequestVo();
            emailRequestVo.setRequestId("DevTrack_" + System.currentTimeMillis());
            emailRequestVo.setTo(event.getRecipient());
            emailRequestVo.setSender(testingSender);
            emailRequestVo.setReplyTo(testingSender);
            emailRequestVo.setSubject(event.getSubject());
            emailRequestVo.setBody(event.getBody() != null ? event.getBody() : "");

            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.add("Accept", "*/*");

            HttpEntity<EmailRequestVo> entity = new HttpEntity<>(emailRequestVo, headers);
            ResponseEntity<ResponseVo> responseEntity = restTemplate.exchange(
                new URI(sendNotificationUrl),
                HttpMethod.POST,
                entity,
                ResponseVo.class
            );

            ResponseVo response = responseEntity.getBody();
            if (response != null && "0000".equalsIgnoreCase(response.getStatusCode())) {
                log.info("Email successfully sent to {} | MessageId: {}", event.getRecipient(), response.getOriginalMessageId());
            } else {
                log.warn("API returned response: {}", response);
            }
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", event.getRecipient(), e.getMessage());
        }
    }
}
