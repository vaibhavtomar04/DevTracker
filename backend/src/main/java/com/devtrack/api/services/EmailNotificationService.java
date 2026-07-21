package com.devtrack.api.services;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import com.devtrack.api.dto.EmailRequestVo;
import com.devtrack.api.dto.ResponseVo;
import com.devtrack.api.model.Bug;
import com.devtrack.api.model.BugMailThread;
import com.devtrack.api.model.BugTask;
import com.devtrack.api.model.Task;
import com.devtrack.api.model.User;
import com.devtrack.api.repository.BugMailThreadRepo;
import com.devtrack.api.repository.BugTaskRepository;
import com.devtrack.api.repository.TaskRepository;
import com.devtrack.api.repository.UserRepository;
import com.devtrack.api.repository.DocumentRepository;
import com.devtrack.api.model.Document;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class EmailNotificationService {

	@Value("${send.notification.url}")
	private String sendNotificationUrl;

	@Value("${testing.mail.sender}")
	private String testingSender;

	@Value("${uat.testComplete.mail.body}")
	private String uatTestCompleteMailBody;

	@Value("${mail.developers}")
	private String developersMail;

	@Value("${mail.reviewer}")
	private String reviewerMail;

	@Value("${testing.mail.cc}")
	private String testingCc;

	@Value("${review.mail.cc}")
	private String reviewCc;

	@Value("${devtrack.mail.logo-url:https://raw.githubusercontent.com/devtrack/assets/main/logo.png}")
	private String appLogoUrl;

	@Value("${devtrack.mail.base-url:http://localhost:5173}")
	private String baseUrl;

	@Value("${devtrack.backend.base-url:http://localhost:8080}")
	private String backendBaseUrl;

	@Value("${mail.devops:}")
	private String devopsMail;

	@Value("${mail.devops.cc:}")
	private String devopsCc;

	private final UserRepository userRepository;
	private final BugTaskRepository bugTaskRepository;
	private final TaskRepository taskRepository;
	private final BugMailThreadRepo mailThreadRepo;
	private final TemplateEngine templateEngine;
	private final DocumentRepository documentRepository;

	@Async
	public void sendNotificationOnCreation(Bug bug) {
		try {
			log.info("bug details {}",bug);
			User user = userRepository.findById(bug.getAssignedDeveloper().getId()).get();
			Task task = null;
			if(bug.getBugTask()!=null)
				task = taskRepository.findById(bug.getBugTask().getId()).get();

			Context context = new Context();
			Map<String, Object> bugMap = new HashMap<>();
			bugMap.put("id", bug.getId());
			bugMap.put("title", bug.getTitle());
			bugMap.put("description", bug.getDescription());
			bugMap.put("environment",  "PRODUCTION");
			bugMap.put("priority", bug.getPriority() != null ? bug.getPriority() : "MEDIUM");
			bugMap.put("assignedTo", user.getFullName());
			bugMap.put("url", baseUrl + "/dashboard");
			context.setVariable("bug", bugMap);
			context.setVariable("currentUser", bug.getRaisedBy().getFullName());
			context.setVariable("appLogoUrl", appLogoUrl);

			String renderedHtml = templateEngine.process("email/bug-notification", context);

			String subject = "Bug Details || ";

			if(task!=null && task.getJtrackId()!=null && !task.getJtrackId().isBlank()) {
				subject = subject+task.getJtrackId()+"_";
			}else {
				subject = subject+bug.getJtrackId()+"_";
			}

			if(task!=null && task.getTitle()!=null && !task.getTitle().isBlank()) {
				subject = subject+task.getTitle();
			}else {
				subject = subject+bug.getTitle();
			}

			EmailRequestVo requestMap = createEmailRequestMap(renderedHtml, subject, user.getEmail(), null, testingSender, testingCc);

			if(requestMap!=null) {
				ResponseVo response = callSendNotificationApi(requestMap);
				if(response!=null && response.getStatusCode()!=null && !response.getStatusCode().isBlank() 
						&& "0000".equalsIgnoreCase(response.getStatusCode())) {
					BugMailThread mailThread = new BugMailThread();
					mailThread.setBugId(bug.getId());
					mailThread.setMessageId(response.getOriginalMessageId());
					mailThread.setCreatedBy("BUG_MAIL");
					mailThread.setFlowType("BUG");
					mailThread.setSubject(subject);
					mailThreadRepo.save(mailThread);
				}
			}
			else
				log.info("Request is null");

		} catch (Exception e) {
			log.error("Exception in sendNotification ",e);
		}
	}


	@Async
	public void sendMailOnBugUpdate(Bug bug, String remarks) {
		try {
			log.info("bug details sendMailOnBugUpdate {}",bug);
			List<BugMailThread> mailThreads = mailThreadRepo.findByBugIdAndFlowType(bug.getId(),"BUG");
			BugMailThread mailThread = (mailThreads != null && !mailThreads.isEmpty()) ? mailThreads.get(0) : null;
			if(mailThread==null || mailThread.getMessageId()==null) {
				sendNotificationOnCreation(bug);
			}else {

				User user = userRepository.findById(bug.getAssignedDeveloper().getId()).get();

				Context context = new Context();
				Map<String, Object> bugMap = new HashMap<>();
				bugMap.put("id", bug.getId());
				bugMap.put("title", bug.getTitle());
				bugMap.put("description", bug.getDescription());
				bugMap.put("environment", "PRODUCTION");
				bugMap.put("status", bug.getStatus());
				bugMap.put("priority", bug.getPriority() != null ? bug.getPriority() : "MEDIUM");
				bugMap.put("assignedTo", user.getFullName());
				bugMap.put("raisedBy", bug.getRaisedBy().getFullName());
				bugMap.put("updateRemarks", remarks);
				bugMap.put("url", baseUrl + "/dashboard");
				context.setVariable("bug", bugMap);
				context.setVariable("currentUser", bug.getRaisedBy().getFullName());
				context.setVariable("appLogoUrl", appLogoUrl);

				String renderedHtml = templateEngine.process("email/bug-update", context);

				EmailRequestVo requestMap = createEmailRequestMap(renderedHtml, mailThread.getSubject(), testingSender, mailThread.getMessageId(), developersMail, testingCc);

				if(requestMap!=null)
					callSendNotificationApi(requestMap);
				else
					log.info("Request is null");

			}

		} catch (Exception e) {
			log.error("Exception ",e);
		}
	}

	@Async
	public void sendMailOnCodeReview(Task task, String remarks) {
		try {
			log.info("bug sendMailOnCodeReview ");
			User user = userRepository.findById(task.getAssignedDeveloper().getId()).get();
			
			Context context = new Context();
			Map<String, Object> crMap = new HashMap<>();
			crMap.put("jtrackId", task.getJtrackId() != null && !task.getJtrackId().isBlank() ? task.getJtrackId() : "NA");
			crMap.put("branchName", task.getBranchName() != null && !task.getBranchName().isBlank() ? task.getBranchName() : "NA");
			crMap.put("developerName", user.getFullName());
			crMap.put("gitLinks", task.getGitLinks() != null && !task.getGitLinks().isBlank() ? task.getGitLinks() : "NA");
			crMap.put("summaryOfChanges", task.getCodeReviewComments() != null && !task.getCodeReviewComments().isBlank() ? task.getCodeReviewComments() : (remarks != null ? remarks : "NA"));
			crMap.put("reviewUrl", baseUrl + "/dashboard/code-review");
			
			context.setVariable("cr", crMap);
			context.setVariable("reviewerNames", "Nilesh Sir / Suresh");
			context.setVariable("appLogoUrl", appLogoUrl);

			String renderedHtml = templateEngine.process("email/codereview-request", context);

			String subject = "Code Review || ";

			if(task!=null && task.getJtrackId()!=null && !task.getJtrackId().isBlank()) {
				subject = subject+task.getJtrackId()+" ";
			}
			if(task!=null && task.getTitle()!=null && !task.getTitle().isBlank()) {
				String crName = task.getTitle().replaceAll("^\\[.*?\\]\\s*", "");
				subject = subject+crName;
			}

			EmailRequestVo requestMap = createEmailRequestMap(renderedHtml, subject, reviewerMail, null, developersMail, reviewCc);

			if(requestMap!=null) {
				ResponseVo response = callSendNotificationApi(requestMap);
				if(response!=null && response.getStatusCode()!=null && !response.getStatusCode().isBlank() 
						&& "0000".equalsIgnoreCase(response.getStatusCode())) {
					BugMailThread mailThread = new BugMailThread();
					mailThread.setBugId(task.getId());
					mailThread.setMessageId(response.getOriginalMessageId());
					mailThread.setCreatedBy("CODE_REVIEW_MAIL");
					mailThread.setFlowType("CODE_REVIEW");
					mailThread.setSubject(subject);
					mailThreadRepo.save(mailThread);
				}
			}
			else
				log.info("Request is null");

		} catch (Exception e) {
			log.error("Exception in sendNotification ",e);
		}
	}

	@Async
	public void sendMailOnCodeReviewUpdate(Task task, String remarks, String status, User approver) {
		try {
			log.info("bug details sendMailOnCodeReviewUpdate");
			List<BugMailThread> mailThread = mailThreadRepo.findByBugIdAndFlowType(task.getId(), "CODE_REVIEW");
			if(mailThread==null || mailThread.isEmpty() || mailThread.get(0).getMessageId()==null) {
				sendMailOnCodeReview(task, remarks);
			}else {
				User user = userRepository.findById(task.getAssignedDeveloper().getId()).get();
				
				Context context = new Context();
				Map<String, Object> crMap = new HashMap<>();
				crMap.put("reviewUrl", baseUrl + "/dashboard/crs");
				
				// Generate review checklist
				List<Map<String, Object>> checklist = List.of(
					Map.of("srNo", 1, "question", "Does the source code conform to the standards and guidelines?", "comment", "YES"),
					Map.of("srNo", 2, "question", "Are unit tests executed and passed?", "comment", "YES"),
					Map.of("srNo", 3, "question", "Are database queries optimized?", "comment", "YES"),
					Map.of("srNo", 4, "question", "Has SonarQube quality gate passed?", "comment", "YES")
				);
				crMap.put("checklist", checklist);
				
				context.setVariable("cr", crMap);
				context.setVariable("reviewerName", approver.getFullName());
				context.setVariable("developerName", user.getFullName());
				context.setVariable("appLogoUrl", appLogoUrl);

				String renderedHtml = templateEngine.process("email/codereview-approval", context);

				EmailRequestVo requestMap = createEmailRequestMap(renderedHtml, mailThread.get(0).getSubject(), 
						user.getEmail(), mailThread.get(0).getMessageId(), developersMail, reviewCc);

				if(requestMap!=null)
					callSendNotificationApi(requestMap);
				else
					log.info("Request is null");

			}

		} catch (Exception e) {
			log.error("Exception ",e);
		}
	}

	@Async
	public void sendMailForUatTesting(Task task, String remarks, User currentUser) {
		log.info("Inside sendMailForUatTesting");
		try {
			User developer = task.getAssignedDeveloper();
			String devName = developer != null ? developer.getFullName() : "Developer";
			
			Context context = new Context();
			Map<String, Object> testMap = new HashMap<>();
			testMap.put("environment",  "UAT");
			testMap.put("jtrackId", task.getJtrackId());
			testMap.put("title", task.getTitle());
			testMap.put("branchName", task.getBranchName() != null ? task.getBranchName() : "NA");
			testMap.put("buildVersion", "v2.0.0");
			testMap.put("modulesAffected", task.getModule() != null ? task.getModule() : "All Modules");
			testMap.put("deployedOn", task.getUatDate() != null ? task.getUatDate().toString() : LocalDate.now().toString());
			testMap.put("developer", devName);
			testMap.put("url", baseUrl + "/dashboard/testing");
			testMap.put("remarks", remarks);
			if (task.getUnitTestDocUrl() != null) {
				testMap.put("unitTestDocUrl", backendBaseUrl + "/api/tasks/" + task.getId() + "/download-unit-test-doc");
			} else {
				testMap.put("unitTestDocUrl", null);
			}
			testMap.put("unitTestDocName", task.getUnitTestDocName() != null ? task.getUnitTestDocName() : "unit-test-document");
			
			context.setVariable("test", testMap);
			context.setVariable("appLogoUrl", appLogoUrl);

			String renderedHtml = templateEngine.process("email/uat-testing", context);

			String subject = "UAT-Testing || ";
			if (task != null && task.getJtrackId() != null && !task.getJtrackId().isBlank()) {
				subject = subject + task.getJtrackId() + " ";
			}
			if (task != null && task.getTitle() != null && !task.getTitle().isBlank()) {
				subject = subject + task.getTitle();
			}

			EmailRequestVo requestMap = createEmailRequestMap(renderedHtml, subject, testingSender, null, developersMail, testingCc);

			if (requestMap != null && task.getUnitTestDocUrl() != null) {
				requestMap.setAttachmentData(task.getUnitTestDocUrl());
				requestMap.setAttachmentName(task.getUnitTestDocName() != null ? task.getUnitTestDocName() : "unit-test-document");
			}

			if(requestMap!=null) {
				ResponseVo response = callSendNotificationApi(requestMap);
				if(response!=null && response.getStatusCode()!=null && !response.getStatusCode().isBlank() 
						&& "0000".equalsIgnoreCase(response.getStatusCode())) {
					BugMailThread mailThread = new BugMailThread();
					mailThread.setBugId(task.getId());
					mailThread.setMessageId(response.getOriginalMessageId());
					mailThread.setCreatedBy("UAT_TESTING_MAIL");
					mailThread.setFlowType("UAT_TESTING");
					mailThread.setSubject(subject);
					mailThreadRepo.save(mailThread);
				}
			}
			else
				log.info("Request is null");

		} catch (Exception e) {
			log.error("Exception ",e);
		}

	}

	@Async
	public void sendMailOnUATTestingComplete(Task task, String remarks, User tester) {
		try {
			log.info("Inside sendMailOnUATTestingComplete");
			List<BugMailThread> mailThread = mailThreadRepo.findByBugIdAndFlowType(task.getId(), "UAT_TESTING");
			User developer = userRepository.findById(task.getAssignedDeveloper().getId()).get();

			// Retrieve all active documents for this CR
			List<Document> activeDocs = documentRepository.findAllByCrIdActive(task.getId());
			
			// Filter for only SUPPORT type documents (testing artifacts)
			List<Map<String, String>> artifacts = new ArrayList<>();
			if (activeDocs != null) {
				for (Document doc : activeDocs) {
					if (doc.getDocType() == Document.DocType.SUPPORT) {
						Map<String, String> artifactMap = new HashMap<>();
						artifactMap.put("filename", doc.getFilename());
						artifactMap.put("downloadUrl", backendBaseUrl + "/api/auth/documents/" + doc.getId() + "/download");
						artifacts.add(artifactMap);
					}
				}
			}

			// Render the new HTML template
			Context context = new Context();
			context.setVariable("task", task);
			context.setVariable("developerName", developer.getFullName());
			context.setVariable("testerName", tester.getFullName());
			context.setVariable("dateOfTesting", LocalDate.now().toString());
			context.setVariable("remarks", remarks != null ? remarks : "");
			context.setVariable("artifacts", artifacts);

			String renderedHtml = templateEngine.process("email/uat-testing-complete", context);

			String subject = "";
			String originalMessageId = null;

			if (mailThread != null && !mailThread.isEmpty()) {
				subject = mailThread.get(0).getSubject();
				originalMessageId = mailThread.get(0).getMessageId();
			} else {
				subject = "UAT-Testing || ";
				if (task != null && task.getJtrackId() != null && !task.getJtrackId().isBlank()) {
					subject = subject + task.getJtrackId() + " ";
				}
				if (task != null && task.getTitle() != null && !task.getTitle().isBlank()) {
					subject = subject + task.getTitle();
				}
			}

			EmailRequestVo requestMap = createEmailRequestMap(renderedHtml, subject, developer.getEmail(), originalMessageId, testingSender, testingCc);

			if (requestMap != null) {
				ResponseVo response = callSendNotificationApi(requestMap);
				if (response != null && response.getStatusCode() != null && !response.getStatusCode().isBlank() 
						&& "0000".equalsIgnoreCase(response.getStatusCode()) && (mailThread == null || mailThread.isEmpty())) {
					BugMailThread newThread = new BugMailThread();
					newThread.setBugId(task.getId());
					newThread.setMessageId(response.getOriginalMessageId());
					newThread.setCreatedBy("UAT_TEST_COMPLETE_MAIL");
					newThread.setFlowType("UAT_TESTING");
					newThread.setSubject(subject);
					mailThreadRepo.save(newThread);
				}
			} else {
				log.info("Request is null");
			}

		} catch (Exception e) {
			log.error("Exception ", e);
		}
	}


	@Async
	public void sendDevOpsDeploymentMail(Task task, String deploymentNote, String serverPath, String itemsToDeploy) {
		log.info("Inside sendDevOpsDeploymentMail for task {}", task.getId());
		try {
			if (devopsMail == null || devopsMail.trim().isEmpty()) {
				log.info("mail.devops is not configured — skipping DevOps deployment email");
				return;
			}

			User developer = task.getAssignedDeveloper();
			String devName = developer != null ? developer.getFullName() : "Developer";

			// Derive CR type label from task type
			String crType = "CR";
			if (task.getType() != null && task.getType().getName() != null) {
				crType = task.getType().getName();
			}

			// Strip prefix tags like [FIX] or [ENH] from title for the clean CR name
			String crName = task.getTitle() != null
					? task.getTitle().replaceAll("^\\[.*?\\]\\s*", "").trim()
					: "—";

			Context context = new Context();
			Map<String, Object> deployMap = new HashMap<>();
			deployMap.put("jtrackId",       task.getJtrackId() != null ? task.getJtrackId() : "NA");
			deployMap.put("crType",         crType);
			deployMap.put("crName",         crName);
			deployMap.put("developerName",  devName);
			deployMap.put("description",    task.getDescription() != null ? task.getDescription() : "—");
			deployMap.put("deploymentNote", deploymentNote != null && !deploymentNote.isBlank() ? deploymentNote : "—");
			deployMap.put("serverPath",     serverPath != null && !serverPath.isBlank() ? serverPath : "—");
			deployMap.put("itemsToDeploy",  itemsToDeploy != null && !itemsToDeploy.isBlank() ? itemsToDeploy : "—");
			deployMap.put("url",            baseUrl + "/dashboard/crs");
			context.setVariable("deploy", deployMap);
			context.setVariable("appLogoUrl", appLogoUrl);

			String renderedHtml = templateEngine.process("email/uat-deployment", context);

			// Subject: UAT Deployment || CR Name
			String subject = "UAT Deployment || " + crName;

			// Build CC: use dedicated mail.devops.cc if configured, otherwise fall back to reviewCc
			String effectiveCc = (devopsCc != null && !devopsCc.trim().isEmpty()) ? devopsCc : reviewCc;

			EmailRequestVo requestMap = createEmailRequestMap(renderedHtml, subject, devopsMail, null, testingSender, effectiveCc);

			if (requestMap != null) {
				callSendNotificationApi(requestMap);
			} else {
				log.info("DevOps deployment email request is null");
			}

		} catch (Exception e) {
			log.error("Exception in sendDevOpsDeploymentMail", e);
		}
	}

	public EmailRequestVo createEmailRequestMap(String messagebody, String messagebsubject, String to, String orgMessageId, String sender, String cc) {
		log.info("Inside createEmailRequestMap");
		try {
			EmailRequestVo emailRequestVo = new EmailRequestVo();
			emailRequestVo.setRequestId("DevTrack_"+System.currentTimeMillis());
			emailRequestVo.setBody(messagebody);
			emailRequestVo.setCc(cc);
			emailRequestVo.setSender(sender);
			emailRequestVo.setReplyTo(sender);
			emailRequestVo.setSubject(messagebsubject);
			emailRequestVo.setTo(to);

			if(orgMessageId!=null && !orgMessageId.isBlank()) {
				emailRequestVo.setOriginalMessageId(orgMessageId);
			}

			return emailRequestVo;

		} catch (Exception e) {
			log.error("Error constructing request data", e);
		}
		return null;

	}

	private ResponseVo callSendNotificationApi(EmailRequestVo request){
		log.info("callSendNotificationApi {}",request);
		try{
			RestTemplate restTemplate = new RestTemplate();

			HttpHeaders headers = new HttpHeaders();
			headers.setContentType(MediaType.APPLICATION_JSON);
			headers.add("Accept","*/*");

			HttpEntity<EmailRequestVo> entity = new HttpEntity<>(request, headers);

			ResponseEntity<ResponseVo> responseEntity = restTemplate.exchange(new URI(sendNotificationUrl), HttpMethod.POST, entity, ResponseVo.class);
			log.info("responseEntity {}",responseEntity);
			return responseEntity.getBody();

		}catch(Exception e){
			log.error("Exception ",e);
		}

		return null;
	}

	public void sendEmail(String to, String subject, String body) {
		try {
			EmailRequestVo requestMap = createEmailRequestMap(body, subject, to, null, testingSender, null);
			if (requestMap != null) {
				callSendNotificationApi(requestMap);
			}
		} catch (Exception e) {
			log.error("Failed to send email to {}", to, e);
		}
	}

}
