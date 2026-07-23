package com.devtrack.api.repository;

import com.devtrack.api.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserId(Long userId);
    void deleteByUserId(Long userId);

    boolean existsByUserIdAndTitleAndDesc(Long userId, String title, String desc);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(n) FROM Notification n WHERE n.userId = :userId AND n.unread = true")
    long countUnreadByUserId(@org.springframework.data.repository.query.Param("userId") Long userId);

    @org.springframework.data.jpa.repository.Query("SELECT n FROM Notification n WHERE n.userId = :userId AND " +
           "(n.snoozedUntil IS NULL OR n.snoozedUntil <= :now) " +
           "ORDER BY n.isPinned DESC, n.id DESC")
    List<Notification> findActiveNotifications(@org.springframework.data.repository.query.Param("userId") Long userId, 
                                               @org.springframework.data.repository.query.Param("now") java.time.LocalDateTime now);
}
