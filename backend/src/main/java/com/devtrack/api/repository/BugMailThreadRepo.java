package com.devtrack.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.devtrack.api.model.BugMailThread;

import jakarta.transaction.Transactional;
import java.util.List;


@Repository
@Transactional
public interface BugMailThreadRepo extends JpaRepository<BugMailThread, Long>{

	List<BugMailThread> findByBugId(long bugId);
	
	List<BugMailThread> findByBugIdAndFlowType(long bugId, String flowType);
	
}
