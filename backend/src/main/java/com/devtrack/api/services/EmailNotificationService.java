package com.devtrack.api.services;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.annotation.RequestScope;

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

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
@RequestScope
public class EmailNotificationService {

	@Value("${send.notification.url}")
	private String sendNotificationUrl;

	@Value("${testing.mail.sender}")
	private String testingSender;

	@Value("${bug.mail.body}")
	private String bugMailBody;

	@Value("${mail.updatebug.body}")
	private String updateBugBody;

	@Value("${codereview.mail.body}")
	private String codereviewBody;

	@Value("${codereview.approval.mail.body}")
	private String codereviewApprovalBody;

	@Value("${uat.testing.mail.body}")
	private String uatTestingMailBody;

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

	private final UserRepository userRepository;
	private final BugTaskRepository bugTaskRepository;
	private final TaskRepository taskRepository;
	private final BugMailThreadRepo mailThreadRepo;

	@Async
	public void sendNotificationOnCreation(Bug bug) {
		try {
			log.info("bug details {}",bug);
			User user = userRepository.findById(bug.getAssignedDeveloper().getId()).get();
			Task task = null;
			if(bug.getBugTask()!=null)
				task = taskRepository.findById(bug.getBugTask().getId()).get();

			bugMailBody = bugMailBody.replace("ASSIGNED_TO", user.getFullName()).replaceAll("BUG_ID", bug.getId().toString())
					.replace("BUG_TITLE", bug.getTitle()).replace("BUG_DESC", bug.getDescription())
					.replace("BUG_PRIORITY", bug.getPriority()).replace("CURRENT_USER", bug.getRaisedBy().getFullName())
					.replace("BUG_STATUS", bug.getStatus());

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

			EmailRequestVo requestMap = createEmailRequestMap(bugMailBody, subject, user.getEmail(), null, testingSender, testingCc);

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
				updateBugBody=updateBugBody.replace("BUG_STATUS", bug.getStatus())
						.replace("UPDATE_REMARKS", remarks)
						.replace("CURRENT_USER", bug.getRaisedBy().getFullName())
						.replace("BUG_DESC", bug.getDescription())
						.replace("ASSIGNED_TO", user.getFullName())
						.replaceAll("BUG_ID", bug.getId().toString())
						.replace("BUG_TITLE", bug.getTitle())
						.replace("BUG_PRIORITY", bug.getPriority())
						.replace("RAISED_BY", bug.getRaisedBy().getFullName());

				EmailRequestVo requestMap = createEmailRequestMap(updateBugBody, mailThread.getSubject(), testingSender, mailThread.getMessageId(), developersMail, testingCc);

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
			String formattedLink="";
			if(task.getGitLinks()!=null && !task.getGitLinks().isBlank()) {
				String[] gitlinks = task.getGitLinks().split(",");
				formattedLink = "<ul>";
				for(int i=0;i<gitlinks.length;i++) {
					formattedLink = formattedLink+"<li><a href="+gitlinks[i]+">GitLink_"+(i+1)+"</a></li>";
				}
				formattedLink=formattedLink+"</ul>";
			}
			codereviewBody = codereviewBody.replace("JTRACK_ID", (task.getJtrackId()!=null && !task.getJtrackId().isBlank())?task.getJtrackId():"NA")
					.replace("BRANCH_NAME", (task.getBranchName()!=null && !task.getBranchName().isBlank())?task.getBranchName():"NA")
					.replace("DEVELOPER_NAME", user.getFullName())
					.replace("SUMMARY_CHANGES", remarks)
					.replace("GIT_LINKS", formattedLink!=null && !formattedLink.isBlank()?formattedLink:"NA");

			String subject = "Code Review || ";

			if(task!=null && task.getJtrackId()!=null && !task.getJtrackId().isBlank()) {
				subject = subject+task.getJtrackId()+"_";
			}
			if(task!=null && task.getTitle()!=null && !task.getTitle().isBlank()) {
				subject = subject+task.getTitle();
			}

			EmailRequestVo requestMap = createEmailRequestMap(codereviewBody, subject, reviewerMail, null, developersMail, reviewCc);

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
				codereviewApprovalBody=codereviewApprovalBody.replace("DEVELOPER_NAME", user.getFullName())
						.replace("REVIEWER_NAME", approver.getFullName());

				EmailRequestVo requestMap = createEmailRequestMap(codereviewApprovalBody, mailThread.get(0).getSubject(), 
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

			uatTestingMailBody=uatTestingMailBody.replace("DEVELOPER", currentUser.getFullName())
					.replace("REMARKS", remarks);

			String subject = "UAT Testing || ";
			if(task!=null && task.getJtrackId()!=null && !task.getJtrackId().isBlank()) {
				subject = subject+task.getJtrackId()+"_";
			}
			if(task!=null && task.getTitle()!=null && !task.getTitle().isBlank()) {
				subject = subject+task.getTitle();
			}

			EmailRequestVo requestMap = createEmailRequestMap(uatTestingMailBody, subject, testingSender, null, developersMail, testingCc);

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
			List<BugMailThread> mailThread = mailThreadRepo.findByBugIdAndFlowType(task.getId(),"UAT_TESTING");
			User developer = userRepository.findById(task.getAssignedDeveloper().getId()).get();

			uatTestCompleteMailBody = uatTestCompleteMailBody.replace("JTRACK_ID", task.getJtrackId()!=null && !task.getJtrackId().isBlank()?task.getJtrackId():task.getType().getName())
					.replace("CR_DETAILS", task.getBranchName()!=null && !task.getBranchName().isBlank()?task.getBranchName():task.getTitle())
					.replace("UAT_DATE", LocalDate.now().toString())
					.replaceAll("TESTER", tester.getFullName())
					.replace("REMARKS", remarks)
					.replace("DEVELOPER", developer.getFullName());

			String subject = "";
			String originalMessageId=null;

			if(mailThread!=null && !mailThread.isEmpty()) {
				subject = mailThread.get(0).getSubject();
				originalMessageId = mailThread.get(0).getMessageId();
			}else {
				subject = "UAT Testing || ";
				if(task!=null && task.getJtrackId()!=null && !task.getJtrackId().isBlank()) {
					subject = subject+task.getJtrackId()+"_";
				}
				if(task!=null && task.getBranchName()!=null && !task.getBranchName().isBlank() 
						&& !"NA".equalsIgnoreCase(task.getBranchName())) {
					subject = subject+task.getBranchName();
				}
				else if (task!=null && task.getTitle()!=null && !task.getTitle().isBlank()) {
					subject = subject+task.getTitle();
				}
			}

			EmailRequestVo requestMap = createEmailRequestMap(uatTestCompleteMailBody, subject, developer.getEmail(), originalMessageId, testingSender, testingCc);

			if(requestMap!=null)
				callSendNotificationApi(requestMap);
			else
				log.info("Request is null");

		} catch (Exception e) {
			log.error("Exception ",e);
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

}
