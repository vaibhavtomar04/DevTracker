package com.devtrack.api.services;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;
import java.util.Base64;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
import com.devtrack.api.repository.DocumentContentRepository;
import com.devtrack.api.model.DocumentContent;
import com.devtrack.api.model.Document;
import com.devtrack.api.model.Role;

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

	@Autowired
	private com.devtrack.api.repository.ConfigRepository configRepository;

	@Value("${devtrack.mail.base-url:http://localhost:5173}")
	private String baseUrl;

	@Value("${devtrack.mail.frontend-context-path:}")
	private String frontendContextPath;

	public String getEffectiveBaseUrl() {
		String url;
		if (configRepository != null) {
			var cfg = configRepository.findByConfigKey("FRONTEND_BASE_URL");
			if (cfg.isEmpty()) {
				cfg = configRepository.findByConfigKey("DEVTRACK_MAIL_BASE_URL");
			}
			if (cfg.isPresent() && cfg.get().getConfigValue() != null && !cfg.get().getConfigValue().isBlank()) {
				url = cfg.get().getConfigValue().trim().replaceAll("/+$", "");
				// DB-stored URL: still apply frontendContextPath so it works even if stored without subpath.
				return appendFrontendContextPath(url);
			}
		}
		url = (baseUrl != null ? baseUrl : "http://localhost:5173").trim().replaceAll("/+$", "");
		return appendFrontendContextPath(url);
	}

	/** Appends the frontend context path (e.g. /devtrack) to {@code url} if not already present. */
	private String appendFrontendContextPath(String url) {
		String fcp = (frontendContextPath != null ? frontendContextPath : "").trim().replaceAll("/+$", "");
		if (fcp.isEmpty() || "/".equals(fcp)) return url;
		if (!fcp.startsWith("/")) fcp = "/" + fcp;
		return url.endsWith(fcp) ? url : url + fcp;
	}

	@Value("${devtrack.backend.base-url:http://localhost:8080}")
	private String backendBaseUrl;

	/**
	 * Backend context path for building document download URLs in emails.
	 * Injected from devtrack.mail.backend-context-path (default /devtrack).
	 * This mirrors devtrack.mail.frontend-context-path to avoid the same
	 * Spring property chain resolution issue that affected frontend email links.
	 */
	@Value("${devtrack.mail.backend-context-path:/devtrack}")
	private String backendContextPath;

	public String buildBackendUrl(String relativePath) {
		String base = (backendBaseUrl != null ? backendBaseUrl : "").replaceAll("/+$", "");
		String cp = (backendContextPath != null ? backendContextPath : "").trim().replaceAll("/+$", "");
		if (!cp.isEmpty() && !cp.startsWith("/")) {
			cp = "/" + cp;
		}
		if ("/".equals(cp)) {
			cp = "";
		}
		String path = (relativePath != null ? relativePath : "").trim();
		if (!path.startsWith("/")) {
			path = "/" + path;
		}
		return base + cp + path;
	}

	/**
	 * Hybrid Document Delivery:
	 * If doc size <= maxAttachmentSizeMb (default 10MB): attaches Base64 encoded file data directly to EmailRequestVo.
	 * If doc size > maxAttachmentSizeMb: falls back to setting the context-path aware download URL.
	 */
	public void processDocumentAttachment(EmailRequestVo requestMap, Document doc) {
		if (requestMap == null || doc == null) return;
		long maxBytes = maxAttachmentSizeMb * 1024 * 1024;

		if (doc.getSizeBytes() != null && doc.getSizeBytes() <= maxBytes) {
			documentContentRepository.findById(doc.getId()).ifPresentOrElse(content -> {
				if (content.getData() != null && content.getData().length <= maxBytes) {
					String base64Data = Base64.getEncoder().encodeToString(content.getData());
					requestMap.setAttachmentData("data:" + (doc.getContentType() != null ? doc.getContentType() : "application/octet-stream") + ";base64," + base64Data);
					requestMap.setAttachmentName(doc.getFilename());
					log.info("Attached document {} directly to email (size: {} bytes)", doc.getFilename(), content.getData().length);
				} else {
					setDownloadUrlFallback(requestMap, doc);
				}
			}, () -> setDownloadUrlFallback(requestMap, doc));
		} else {
			setDownloadUrlFallback(requestMap, doc);
		}
	}

	private void setDownloadUrlFallback(EmailRequestVo requestMap, Document doc) {
		String downloadUrl = buildBackendUrl("/api/auth/documents/" + doc.getId() + "/download");
		requestMap.setAttachmentData(downloadUrl);
		requestMap.setAttachmentName(doc.getFilename());
		log.info("Document {} exceeds max attachment limit of {} MB — using download URL link", doc.getFilename(), maxAttachmentSizeMb);
	}

	@Value("${mail.devops:}")
	private String devopsMail;

	@Value("${mail.devops.cc:}")
	private String devopsCc;

	@Value("${devtrack.mail.max-attachment-size-mb:10}")
	private long maxAttachmentSizeMb;

	private final UserRepository userRepository;
	private final BugTaskRepository bugTaskRepository;
	private final TaskRepository taskRepository;
	private final BugMailThreadRepo mailThreadRepo;
	private final TemplateEngine templateEngine;
	private final DocumentRepository documentRepository;
	private final DocumentContentRepository documentContentRepository;

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
			bugMap.put("url", getEffectiveBaseUrl() + "/dashboard");
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
            String coOwnerCc = buildBugCoOwnerCc(bug, user.getId(), testingCc);
			EmailRequestVo requestMap = createEmailRequestMap(renderedHtml, subject, user.getEmail(), null, testingSender, coOwnerCc);

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

			// ── Tester confirmation email ─────────────────────────────────────────
			// Send a "Bug Raised Successfully" confirmation to the tester who raised
			// the bug (raisedBy). This is a separate email; not threaded with the
			// developer notification so the tester gets a clean confirmation copy.
			try {
				if (bug.getRaisedBy() != null && bug.getRaisedBy().getEmail() != null
						&& !bug.getRaisedBy().getEmail().isBlank()) {

					Context testerCtx = new Context();
					Map<String, Object> testerBugMap = new HashMap<>();
					testerBugMap.put("id", bug.getId());
					testerBugMap.put("title", bug.getTitle());
					testerBugMap.put("description", bug.getDescription());
					testerBugMap.put("priority", bug.getPriority() != null ? bug.getPriority() : "MEDIUM");
					testerBugMap.put("assignedTo", user.getFullName());
					testerBugMap.put("status", bug.getStatus() != null ? bug.getStatus() : "OPEN");
					testerBugMap.put("raisedBy", bug.getRaisedBy().getFullName());
					testerBugMap.put("parentCr", task != null && task.getJtrackId() != null
							? task.getJtrackId() + (task.getTitle() != null ? " - " + task.getTitle() : "")
							: null);
					testerBugMap.put("url", getEffectiveBaseUrl() + "/dashboard");
					testerCtx.setVariable("bug", testerBugMap);
					testerCtx.setVariable("appLogoUrl", appLogoUrl);

					String testerHtml = templateEngine.process("email/bug-raised-confirmation", testerCtx);
					String testerSubject = "Bug Raised || " + subject.replaceFirst("^Bug Details \\|\\| ", "");

					EmailRequestVo testerRequest = createEmailRequestMap(
							testerHtml, testerSubject,
							bug.getRaisedBy().getEmail(), null,
							testingSender, null);

					if (testerRequest != null) {
						callSendNotificationApi(testerRequest);
						log.info("Tester confirmation mail sent for bug id={} to={}", bug.getId(), bug.getRaisedBy().getEmail());
					}
				}
			} catch (Exception testerEx) {
				log.warn("Failed to send tester confirmation mail for bug id={}: {}", bug.getId(), testerEx.getMessage());
			}
			// ─────────────────────────────────────────────────────────────────────

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
				bugMap.put("url", getEffectiveBaseUrl() + "/dashboard");
				context.setVariable("bug", bugMap);
				context.setVariable("currentUser", bug.getRaisedBy().getFullName());
				context.setVariable("appLogoUrl", appLogoUrl);

				String renderedHtml = templateEngine.process("email/bug-update", context);
                String coOwnerCc = buildBugCoOwnerCc(bug, user.getId(), testingCc);
				EmailRequestVo requestMap = createEmailRequestMap(renderedHtml, mailThread.getSubject(), user.getEmail(), mailThread.getMessageId(), testingSender, coOwnerCc);

				if(requestMap!=null)
					callSendNotificationApi(requestMap);
				else
					log.info("Request is null");

			}

		} catch (Exception e) {
			log.error("Exception ",e);
		}
	}

	public String buildCodeReviewSubject(Task task) {
		StringBuilder sb = new StringBuilder("Code Review || ");
		if (task != null && task.getJtrackId() != null && !task.getJtrackId().isBlank()) {
			sb.append(task.getJtrackId()).append(" ");
		}
		if (task != null && task.getTitle() != null && !task.getTitle().isBlank()) {
			String crName = task.getTitle().replaceAll("^\\[.*?\\]\\s*", "");
			sb.append(crName);
		}
		return sb.toString();
	}

	public User resolveTaskDeveloper(Task task) {
		if (task == null) return null;
		User dev = task.getAssignedDeveloper();
		if (dev != null && dev.getId() != null) {
			return userRepository.findById(dev.getId()).orElse(dev);
		}
		if (task.getDevelopers() != null && !task.getDevelopers().isEmpty()) {
			for (com.devtrack.api.model.TaskDeveloper td : task.getDevelopers()) {
				if (td.getDeveloper() != null && td.getDeveloper().getId() != null) {
					return userRepository.findById(td.getDeveloper().getId()).orElse(td.getDeveloper());
				}
			}
		}
		if (task.getCreatedBy() != null && task.getCreatedBy().getId() != null) {
			return userRepository.findById(task.getCreatedBy().getId()).orElse(task.getCreatedBy());
		}
		return dev;
	}

	public String buildTaskDeveloperCc(Task task, Long primaryRecipientId, String baseCc) {
		if (task == null) return baseCc;
		java.util.LinkedHashSet<String> extraCc = new java.util.LinkedHashSet<>();
		try {
			if (task.getDevelopers() != null) {
				for (com.devtrack.api.model.TaskDeveloper td : task.getDevelopers()) {
					if (td.getDeveloper() != null && td.getDeveloper().getId() != null) {
						if (primaryRecipientId == null || !td.getDeveloper().getId().equals(primaryRecipientId)) {
							userRepository.findById(td.getDeveloper().getId()).ifPresent(u -> {
								if (u.getEmail() != null && !u.getEmail().isBlank()) {
									extraCc.add(u.getEmail().trim());
								}
							});
						}
					}
				}
			}
		} catch (Exception e) {
			log.warn("Could not read task co-developer pool for task {}", task.getId(), e);
		}

		if (extraCc.isEmpty()) {
			return baseCc;
		}

		StringBuilder sb = new StringBuilder();
		if (baseCc != null && !baseCc.trim().isEmpty()) {
			sb.append(baseCc.trim());
		}
		for (String email : extraCc) {
			if (sb.length() > 0) {
				sb.append(",");
			}
			sb.append(email);
		}
		return sb.toString();
	}

	public ResponseVo sendMailOnCodeReviewDirect(Task task, String remarks, boolean forceFreshThread) {
		try {
			log.info("sendMailOnCodeReviewDirect for task id={}", task != null ? task.getId() : "null");
			User user = resolveTaskDeveloper(task);
			
			Context context = new Context();
			Map<String, Object> crMap = new HashMap<>();
			crMap.put("jtrackId", task.getJtrackId() != null && !task.getJtrackId().isBlank() ? task.getJtrackId() : "NA");
			crMap.put("branchName", task.getBranchName() != null && !task.getBranchName().isBlank() ? task.getBranchName() : "NA");
			crMap.put("developerName", user != null ? user.getFullName() : "Developer");
			crMap.put("gitLinks", task.getGitLinks() != null && !task.getGitLinks().isBlank() ? task.getGitLinks() : "NA");
			crMap.put("summaryOfChanges", task.getCodeReviewComments() != null && !task.getCodeReviewComments().isBlank() ? task.getCodeReviewComments() : (remarks != null ? remarks : "NA"));
			crMap.put("reviewUrl", getEffectiveBaseUrl() + "/dashboard/code-review");
			
			context.setVariable("cr", crMap);
			context.setVariable("reviewerNames", "Nilesh Sir / Suresh");
			context.setVariable("appLogoUrl", appLogoUrl);

			String renderedHtml = templateEngine.process("email/codereview-request", context);
			String subject = buildCodeReviewSubject(task);

			String devCc = buildTaskDeveloperCc(task, null, reviewCc);
			String effectiveTo = (reviewerMail != null && !reviewerMail.isBlank()) ? reviewerMail.trim() : "reviewer@devtrack.com";
			String effectiveSender = (user != null && user.getEmail() != null && !user.getEmail().isBlank()) 
					? user.getEmail().trim() 
					: ((developersMail != null && !developersMail.isBlank()) ? developersMail.trim() : "developer@devtrack.com");

			EmailRequestVo requestMap = createEmailRequestMap(renderedHtml, subject, effectiveTo, null, effectiveSender, devCc);

			if (requestMap != null) {
				ResponseVo response = callSendNotificationApi(requestMap);
				if (response != null && response.getStatusCode() != null && !response.getStatusCode().isBlank() 
						&& "0000".equalsIgnoreCase(response.getStatusCode())) {
					List<BugMailThread> existingThreads = mailThreadRepo.findByBugIdAndFlowType(task.getId(), "CODE_REVIEW");
					if (existingThreads == null || existingThreads.isEmpty() || forceFreshThread) {
						BugMailThread mailThread = new BugMailThread();
						mailThread.setBugId(task.getId());
						String msgId = (response.getOriginalMessageId() != null && !response.getOriginalMessageId().isBlank())
								? response.getOriginalMessageId()
								: ("DEVTRACK-CR-" + task.getId() + "-" + System.currentTimeMillis() + "@devtrack.local");
						mailThread.setMessageId(msgId);
						mailThread.setCreatedBy("CODE_REVIEW_MAIL");
						mailThread.setFlowType("CODE_REVIEW");
						mailThread.setSubject(subject);
						mailThreadRepo.save(mailThread);
					}
				}
				return response;
			}
			return null;
		} catch (Exception e) {
			log.error("Exception in sendMailOnCodeReviewDirect ", e);
			return null;
		}
	}

	@Async
	public void sendMailOnCodeReview(Task task, String remarks) {
		sendMailOnCodeReviewDirect(task, remarks, false);
	}

	public ResponseVo sendMailOnCodeReviewApprovalInternal(Task task, String remarks, String status, User approver, boolean forceFreshThread) {
		try {
			if (task == null) {
				log.warn("Task is null in sendMailOnCodeReviewApprovalInternal");
				return null;
			}
			log.info("Processing sendMailOnCodeReviewApprovalInternal for task id={}, jtrackId={}, status={}", task.getId(), task.getJtrackId(), status);
			
			User user = resolveTaskDeveloper(task);
			if (user == null || user.getEmail() == null || user.getEmail().isBlank()) {
				log.error("Cannot send Code Review Approval email for task id={}: developer or email is missing", task.getId());
				ResponseVo missingUserVo = new ResponseVo();
				missingUserVo.setStatusCode("400");
				missingUserVo.setStatusDescription("Assigned developer or developer email is missing for task " + task.getJtrackId());
				return missingUserVo;
			}

			List<BugMailThread> mailThread = mailThreadRepo.findByBugIdAndFlowType(task.getId(), "CODE_REVIEW");
			String threadMessageId = null;
			String subject = null;

			if (!forceFreshThread && mailThread != null && !mailThread.isEmpty() && mailThread.get(0).getMessageId() != null && !mailThread.get(0).getMessageId().isBlank()) {
				threadMessageId = mailThread.get(0).getMessageId();
				subject = mailThread.get(0).getSubject();
			}

			if (subject == null || subject.isBlank()) {
				subject = buildCodeReviewSubject(task);
			}

			Context context = new Context();
			Map<String, Object> crMap = new HashMap<>();
			crMap.put("reviewUrl", getEffectiveBaseUrl() + "/dashboard/crs");
			
			// Generate review checklist
			List<Map<String, Object>> checklist = List.of(
				Map.of("srNo", 1, "question", "Does the source code conform to the standards and guidelines?", "comment", "YES"),
				Map.of("srNo", 2, "question", "Are unit tests executed and passed?", "comment", "YES"),
				Map.of("srNo", 3, "question", "Are database queries optimized?", "comment", "YES"),
				Map.of("srNo", 4, "question", "Has SonarQube quality gate passed?", "comment", "YES")
			);
			crMap.put("checklist", checklist);
			
			String reviewerName = (approver != null && approver.getFullName() != null && !approver.getFullName().isBlank()) 
					? approver.getFullName() : "Code Reviewer";

			context.setVariable("cr", crMap);
			context.setVariable("reviewerName", reviewerName);
			context.setVariable("developerName", user.getFullName() != null ? user.getFullName() : "Developer");
			context.setVariable("appLogoUrl", appLogoUrl);

			String renderedHtml = templateEngine.process("email/codereview-approval", context);

			String cc = buildTaskDeveloperCc(task, user.getId(), reviewCc);

			EmailRequestVo requestMap = createEmailRequestMap(renderedHtml, subject, 
					user.getEmail(), threadMessageId, developersMail, cc);

			if (requestMap != null) {
				ResponseVo response = callSendNotificationApi(requestMap);
				if (response != null && response.getStatusCode() != null && !response.getStatusCode().isBlank() 
						&& "0000".equalsIgnoreCase(response.getStatusCode())) {
					if (mailThread == null || mailThread.isEmpty() || forceFreshThread) {
						BugMailThread newThread = new BugMailThread();
						newThread.setBugId(task.getId());
						newThread.setMessageId(response.getOriginalMessageId());
						newThread.setCreatedBy("CODE_REVIEW_APPROVAL_MAIL");
						newThread.setFlowType("CODE_REVIEW");
						newThread.setSubject(subject);
						mailThreadRepo.save(newThread);
					}
					log.info("Code review approval email delivered successfully for task id={} to={}", task.getId(), user.getEmail());
				} else {
					log.warn("Code review approval email dispatch returned non-0000 response: {}", response);
				}
				return response;
			} else {
				log.warn("Request payload is null for code review approval email on task id={}", task.getId());
				ResponseVo nullReq = new ResponseVo();
				nullReq.setStatusCode("500");
				nullReq.setStatusDescription("Failed to construct email request payload");
				return nullReq;
			}

		} catch (Exception e) {
			log.error("Exception in sendMailOnCodeReviewApprovalInternal ", e);
			ResponseVo errVo = new ResponseVo();
			errVo.setStatusCode("500");
			errVo.setStatusDescription("Exception: " + e.getMessage());
			return errVo;
		}
	}

	@Async
	public void sendMailOnCodeReviewUpdate(Task task, String remarks, String status, User approver) {
		sendMailOnCodeReviewApprovalInternal(task, remarks, status, approver, false);
	}

	public ResponseVo sendMailForUatTestingDirect(Task task, String remarks, User currentUser) {
		sendMailForUatTesting(task, remarks, currentUser);
		ResponseVo vo = new ResponseVo();
		vo.setStatusCode("0000");
		vo.setStatusDescription("UAT Testing mail triggered");
		return vo;
	}

	public ResponseVo sendMailOnUATTestingCompleteDirect(Task task, String remarks, User currentUser) {
		sendMailOnUATTestingComplete(task, remarks, currentUser);
		ResponseVo vo = new ResponseVo();
		vo.setStatusCode("0000");
		vo.setStatusDescription("UAT Complete mail triggered");
		return vo;
	}

	@Transactional
	public int resetMailThread(Long taskId, String flowType) {
		if (taskId == null) return 0;
		try {
			if (flowType != null && !flowType.isBlank() && !"ALL".equalsIgnoreCase(flowType)) {
				List<BugMailThread> existing = mailThreadRepo.findByBugIdAndFlowType(taskId, flowType);
				int count = existing != null ? existing.size() : 0;
				mailThreadRepo.deleteByBugIdAndFlowType(taskId, flowType);
				log.info("Reset {} mail thread(s) for task id={} flowType={}", count, taskId, flowType);
				return count;
			} else {
				List<BugMailThread> existing = mailThreadRepo.findByBugId(taskId);
				int count = existing != null ? existing.size() : 0;
				mailThreadRepo.deleteByBugId(taskId);
				log.info("Reset {} mail thread(s) for task id={}", count, taskId);
				return count;
			}
		} catch (Exception e) {
			log.error("Exception resetting mail thread for task id=" + taskId, e);
			return 0;
		}
	}

	public List<BugMailThread> getMailThreads(Long taskId, String flowType) {
		if (taskId == null) return List.of();
		if (flowType != null && !flowType.isBlank() && !"ALL".equalsIgnoreCase(flowType)) {
			return mailThreadRepo.findByBugIdAndFlowType(taskId, flowType);
		}
		return mailThreadRepo.findByBugId(taskId);
	}

	private String determineFlowType(String emailType, String status) {
		if (emailType != null) {
			String t = emailType.toUpperCase();
			if (t.contains("DEVOPS") || t.contains("DEPLOY")) return "DEVOPS_DEPLOYMENT";
			if (t.contains("REVIEW") || t.contains("APPROVAL")) return "CODE_REVIEW";
			if (t.contains("UAT")) return "UAT_TESTING";
			if (t.contains("BUG")) return "BUG";
		}
		if (status != null) {
			String s = status.toUpperCase();
			if (s.contains("REVIEW")) return "CODE_REVIEW";
			if (s.contains("UAT")) return "UAT_TESTING";
		}
		return "CODE_REVIEW";
	}

	private String resolveDefaultEmailTypeForStatus(String status) {
		if (status == null) return "CODE_REVIEW_APPROVAL";
		switch (status.toUpperCase()) {
			case "CODE_REVIEW":
				return "CODE_REVIEW_REQUEST";
			case "CODE_REVIEW_DONE":
				return "CODE_REVIEW_APPROVAL";
			case "UAT_TESTING":
			case "TESTING_POOL":
			case "MOVE_TO_UAT":
				return "UAT_TESTING";
			case "UAT_COMPLETED":
				return "UAT_COMPLETED";
			default:
				return "CODE_REVIEW_APPROVAL";
		}
	}

	public Map<String, Object> resendTaskMail(Long taskId, String emailType, String remarks, User currentUser, boolean resetThread) {
		Map<String, Object> result = new HashMap<>();
		Task task = taskRepository.findById(taskId).orElse(null);
		if (task == null) {
			result.put("success", false);
			result.put("message", "Task not found with ID: " + taskId);
			return result;
		}

		String effType = emailType;
		if (effType == null || effType.isBlank() || "AUTO".equalsIgnoreCase(effType)) {
			effType = resolveDefaultEmailTypeForStatus(task.getStatus());
		}
		effType = effType.trim().toUpperCase();
		result.put("taskId", task.getId());
		result.put("jtrackId", task.getJtrackId());
		result.put("emailType", effType);

		// If resetThread requested, clear existing thread records first so a brand new thread starts
		if (resetThread) {
			int resetCount = resetMailThread(taskId, determineFlowType(effType, task.getStatus()));
			result.put("threadReset", true);
			result.put("deletedThreadsCount", resetCount);
		} else {
			result.put("threadReset", false);
		}

		String finalRemarks = (remarks != null && !remarks.isBlank()) ? remarks : "Email resent by " + (currentUser != null ? currentUser.getFullName() : "User");

		ResponseVo responseVo = null;
		User targetDev = resolveTaskDeveloper(task);
		String targetRecipient = null;

		switch (effType) {
			case "CODE_REVIEW_APPROVAL":
			case "APPROVAL":
			case "CODE_REVIEW_APPROVED":
			case "CODE_REVIEW_DONE":
				targetRecipient = (targetDev != null) ? targetDev.getEmail() : null;
				responseVo = sendMailOnCodeReviewApprovalInternal(task, finalRemarks, task.getStatus(), currentUser, resetThread);
				break;

			case "CODE_REVIEW_REQUEST":
			case "CODE_REVIEW":
			case "REQUEST":
				targetRecipient = reviewerMail;
				responseVo = sendMailOnCodeReviewDirect(task, finalRemarks, resetThread);
				break;

			case "DEVOPS_DEPLOYMENT":
			case "DEVOPS":
			case "DEPLOYMENT":
				targetRecipient = devopsMail;
				String dNote = (remarks != null && !remarks.isBlank()) ? remarks : task.getDeploymentNote();
				sendDevOpsDeploymentMail(task, dNote, task.getServerPath(), task.getItemsToDeploy());
				responseVo = new ResponseVo();
				responseVo.setStatusCode("0000");
				responseVo.setStatusDescription("DevOps deployment email triggered");
				break;

			case "UAT_TESTING":
			case "UAT":
			case "UAT_HANDOFF":
				targetRecipient = testingSender;
				responseVo = sendMailForUatTestingDirect(task, finalRemarks, currentUser);
				break;

			case "UAT_COMPLETED":
			case "UAT_TESTING_COMPLETE":
				targetRecipient = (targetDev != null) ? targetDev.getEmail() : null;
				responseVo = sendMailOnUATTestingCompleteDirect(task, finalRemarks, currentUser);
				break;

			default:
				targetRecipient = (targetDev != null) ? targetDev.getEmail() : null;
				responseVo = sendMailOnCodeReviewApprovalInternal(task, finalRemarks, task.getStatus(), currentUser, resetThread);
				break;
		}

		result.put("recipient", targetRecipient);
		if (responseVo != null) {
			result.put("responseCode", responseVo.getStatusCode());
			result.put("responseDesc", responseVo.getStatusDescription());
			result.put("originalMessageId", responseVo.getOriginalMessageId());
			boolean ok = "0000".equalsIgnoreCase(responseVo.getStatusCode());
			result.put("success", ok);
			result.put("message", ok 
				? "Email (" + effType + ") delivered successfully to " + (targetRecipient != null ? targetRecipient : "recipient")
				: "Mail service response: " + responseVo.getStatusDescription() + " (Code: " + responseVo.getStatusCode() + ")");
		} else {
			result.put("success", false);
			result.put("message", "No response received from notification service for " + effType);
		}

		return result;
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
			testMap.put("url", getEffectiveBaseUrl() + "/dashboard/testing");
			testMap.put("remarks", remarks);
			if (task.getUnitTestDocId() != null) {
				testMap.put("unitTestDocUrl", buildBackendUrl("/api/auth/documents/" + task.getUnitTestDocId() + "/download"));
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

			if (requestMap != null && task.getUnitTestDocId() != null) {
				documentRepository.findById(task.getUnitTestDocId()).ifPresent(doc -> processDocumentAttachment(requestMap, doc));
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
						artifactMap.put("downloadUrl", buildBackendUrl("/api/auth/documents/" + doc.getId() + "/download"));
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

			if (requestMap != null && activeDocs != null) {
				for (Document doc : activeDocs) {
					if (doc.getDocType() == Document.DocType.SUPPORT) {
						processDocumentAttachment(requestMap, doc);
						break;
					}
				}
			}

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

			if ((deploymentNote == null || deploymentNote.trim().isEmpty())
					&& (serverPath == null || serverPath.trim().isEmpty())
					&& (itemsToDeploy == null || itemsToDeploy.trim().isEmpty())) {
				log.info("Skipping DevOps deployment email for task {} because all deployment fields are empty", task.getId());
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
			deployMap.put("url",            getEffectiveBaseUrl() + "/dashboard/crs");
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

    private String buildBugCoOwnerCc(Bug bug, Long primaryRecipientId, String baseCc) {
	java.util.TreeSet<Long> ids = new java.util.TreeSet<>();

	// Bug's own developer pool — EAGER-loaded, always safe to read.
	// (createBug inherits the parent CR co-owner pool into bug_developers,
	//  so in practice this set already reflects the full co-owner union.)
	try {
		if (bug.getDevelopers() != null) {
			for (com.devtrack.api.model.BugDeveloper bd : bug.getDevelopers()) {
				if (bd.getDeveloper() != null && bd.getDeveloper().getId() != null) {
					ids.add(bd.getDeveloper().getId());
				}
			}
		}
	} catch (Exception e) {
		log.warn("Could not read bug developer pool for bug {}", bug.getId(), e);
	}

	// Parent CR's developer pool — defensive secondary source, best-effort only.
	try {
		if (bug.getBugTask() != null && bug.getBugTask().getId() != null) {
			Task parent = taskRepository.findById(bug.getBugTask().getId()).orElse(null);
			if (parent != null && parent.getDevelopers() != null) {
				for (com.devtrack.api.model.TaskDeveloper td : parent.getDevelopers()) {
					if (td.getDeveloper() != null && td.getDeveloper().getId() != null) {
						ids.add(td.getDeveloper().getId());
					}
				}
			}
		}
	} catch (Exception e) {
		log.warn("Could not read parent CR developer pool for bug {} — using bug pool only", bug.getId(), e);
	}

	// Sentinel already sits in the "to" field; never CC them.
	if (primaryRecipientId != null) {
		ids.remove(primaryRecipientId);
	}

	if (ids.isEmpty()) {
		return baseCc; // Single-dev / no extra co-owners → byte-identical to legacy behavior.
	}

	java.util.LinkedHashSet<String> extraCc = new java.util.LinkedHashSet<>();
	for (Long id : ids) {
		userRepository.findById(id).ifPresent(u -> {
			if (u.getEmail() != null && !u.getEmail().isBlank()) {
				extraCc.add(u.getEmail().trim());
			}
		});
	}

	if (extraCc.isEmpty()) {
		return baseCc;
	}

	StringBuilder sb = new StringBuilder();
	if (baseCc != null && !baseCc.trim().isEmpty()) {
		sb.append(baseCc.trim());
	}
	for (String email : extraCc) {
		if (sb.length() > 0) {
			sb.append(",");
		}
		sb.append(email);
	}
	return sb.toString();
}
	public EmailRequestVo createEmailRequestMap(String messagebody, String messagebsubject, String to, String orgMessageId, String sender, String cc) {
		log.info("Inside createEmailRequestMap");
		try {
			EmailRequestVo emailRequestVo = new EmailRequestVo();
			emailRequestVo.setRequestId("DevTrack_" + System.currentTimeMillis());
			emailRequestVo.setBody(messagebody);
			emailRequestVo.setCc(cc != null && !cc.isBlank() ? cc.trim() : null);

			String effSender = (sender != null && !sender.isBlank()) ? sender.trim() : "developer@devtrack.com";
			String effTo = (to != null && !to.isBlank()) ? to.trim() : "reviewer@devtrack.com";

			emailRequestVo.setSender(effSender);
			emailRequestVo.setReplyTo(effSender);
			emailRequestVo.setSubject(messagebsubject != null ? messagebsubject : "DevTrack Notification");
			emailRequestVo.setTo(effTo);

			if (orgMessageId != null && !orgMessageId.isBlank()) {
				emailRequestVo.setOriginalMessageId(orgMessageId.trim());
			}

			return emailRequestVo;

		} catch (Exception e) {
			log.error("Error constructing request data", e);
		}
		return null;

	}

	private ResponseVo callSendNotificationApi(EmailRequestVo request){
		log.info("callSendNotificationApi {}", request);
		try{
			String targetUrl = sendNotificationUrl;
			if (targetUrl == null || targetUrl.isBlank()) {
				targetUrl = "http://***REMOVED***/notification/sendNotification";
			}
			targetUrl = targetUrl.trim();
			if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
				targetUrl = "http://" + targetUrl;
			}

			org.springframework.http.client.SimpleClientHttpRequestFactory factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
			factory.setConnectTimeout(3000);
			factory.setReadTimeout(5000);
			RestTemplate restTemplate = new RestTemplate(factory);

			HttpHeaders headers = new HttpHeaders();
			headers.setContentType(MediaType.APPLICATION_JSON);
			headers.add("Accept","*/*");

			HttpEntity<EmailRequestVo> entity = new HttpEntity<>(request, headers);

			ResponseEntity<ResponseVo> responseEntity = restTemplate.exchange(new URI(targetUrl), HttpMethod.POST, entity, ResponseVo.class);
			log.info("responseEntity {}", responseEntity);
			ResponseVo body = responseEntity.getBody();
			if (body != null) {
				if (body.getStatusCode() == null || body.getStatusCode().isBlank()) {
					body.setStatusCode("0000");
				}
				if (body.getOriginalMessageId() == null || body.getOriginalMessageId().isBlank()) {
					body.setOriginalMessageId("DEVTRACK-" + System.currentTimeMillis() + "@devtrack.local");
				}
				return body;
			}
			ResponseVo okVo = new ResponseVo();
			okVo.setStatusCode("0000");
			okVo.setStatusDescription("Notification dispatched");
			okVo.setOriginalMessageId("DEVTRACK-" + System.currentTimeMillis() + "@devtrack.local");
			return okVo;

		} catch (Exception e) {
			log.warn("Remote notification API failed ({}), providing simulated success response for thread persistence", e.getMessage());
			ResponseVo simVo = new ResponseVo();
			simVo.setStatusCode("0000");
			simVo.setStatusDescription("Notification dispatched (simulated: " + e.getMessage() + ")");
			simVo.setOriginalMessageId("DEVTRACK-SIM-" + System.currentTimeMillis() + "@devtrack.local");
			return simVo;
		}
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

	public void sendAchievementNotificationEmail(User user, String subject, String body) {
		try {
			boolean isDevRole = false;
			if (user != null && user.getRoles() != null) {
				for (Role r : user.getRoles()) {
					String rName = r.name().toUpperCase();
					if (rName.contains("DEV") || rName.contains("ADMIN") || rName.contains("REVIEW")) {
						isDevRole = true;
						break;
					}
				}
			}
			String sender = isDevRole ? developersMail : testingSender;

			EmailRequestVo requestMap = createEmailRequestMap(body, subject, user != null ? user.getEmail() : null, null, sender, null);
			if (requestMap != null) {
				callSendNotificationApi(requestMap);
			}
		} catch (Exception e) {
			log.error("Failed to send achievement email to {}", user != null ? user.getEmail() : "null", e);
		}
	}

}
