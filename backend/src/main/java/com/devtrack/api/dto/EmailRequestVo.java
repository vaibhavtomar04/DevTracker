 package com.devtrack.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class EmailRequestVo {

	private String requestId;
	private String to;
	private String cc;
	private String bcc;
	private String sender;
	private String subject;
	private String body;
	private String replyTo;
	private String originalMessageId;
	private String attachmentData;
	private String attachmentName;
	
}

