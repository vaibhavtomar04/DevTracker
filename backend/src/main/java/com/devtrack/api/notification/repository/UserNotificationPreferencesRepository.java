package com.devtrack.api.notification.repository;

import com.devtrack.api.notification.model.UserNotificationPreferences;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserNotificationPreferencesRepository extends JpaRepository<UserNotificationPreferences, Long> {
    Optional<UserNotificationPreferences> findByUserId(Long userId);
}
