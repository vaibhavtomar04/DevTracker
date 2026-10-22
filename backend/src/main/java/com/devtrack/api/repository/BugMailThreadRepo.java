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

	@org.springframework.data.jpa.repository.Modifying
	@org.springframework.data.jpa.repository.Query("DELETE FROM BugMailThread b WHERE b.bugId = :bugId AND b.flowType = :flowType")
	void deleteByBugIdAndFlowType(@org.springframework.data.repository.query.Param("bugId") long bugId, @org.springframework.data.repository.query.Param("flowType") String flowType);

	@org.springframework.data.jpa.repository.Modifying
	@org.springframework.data.jpa.repository.Query("DELETE FROM BugMailThread b WHERE b.bugId = :bugId")
	void deleteByBugId(@org.springframework.data.repository.query.Param("bugId") long bugId);
}
