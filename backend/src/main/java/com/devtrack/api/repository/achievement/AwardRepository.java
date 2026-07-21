package com.devtrack.api.repository.achievement;

import com.devtrack.api.model.achievement.Award;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface AwardRepository extends JpaRepository<Award, Long> {

    Optional<Award> findByCode(String code);

    List<Award> findByAwardTypeAndActiveFlagOrderByNameAsc(String awardType, int activeFlag);

    List<Award> findByActiveFlagOrderByAwardTypeAscNameAsc(int activeFlag);
}
