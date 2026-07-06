package com.farmassist.api.repository;

import com.farmassist.api.entity.ActivityLog;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    List<ActivityLog> findTop25ByOrderByCreatedAtDesc();
}
