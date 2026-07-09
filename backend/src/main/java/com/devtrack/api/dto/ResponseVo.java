package com.devtrack.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResponseVo {

	private String statusCode;
	private String statusType;
	private String statusDescription;
	private String requestId;
	private String data;
	private String originalMessageId;
	
}
