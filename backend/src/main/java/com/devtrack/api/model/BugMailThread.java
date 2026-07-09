package com.devtrack.api.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Table(name = "bug_mail_thread")
@Entity
@AllArgsConstructor
@NoArgsConstructor
public class BugMailThread {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private long id;
	
	@Column(name = "bug_id")
	private long bugId;
	
	@Column(name = "message_id")
	private String messageId;
	
	@Column(name = "message_subject")
	private String subject;
	
	@Column(name = "flow_type")
	private String flowType;

	@Column(name = "created_by")
	private String createdBy;
	
	@Column(name = "created_on")
	private LocalDateTime createdOn = LocalDateTime.now();

}
