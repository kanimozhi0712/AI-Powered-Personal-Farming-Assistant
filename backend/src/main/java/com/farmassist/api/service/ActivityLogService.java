package com.farmassist.api.service;

import com.farmassist.api.entity.ActivityLog;
import com.farmassist.api.repository.ActivityLogRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ActivityLogService {
    private final ActivityLogRepository logs;

    public ActivityLogService(ActivityLogRepository logs) {
        this.logs = logs;
    }

    public void record(String actor, String action, String target, String type) {
        ActivityLog log = new ActivityLog();
        log.setActor(actor == null || actor.isBlank() ? "System" : actor);
        log.setAction(action);
        log.setTarget(target);
        log.setType(type);
        logs.save(log);
    }

    public List<ActivityLog> recent() {
        return logs.findTop25ByOrderByCreatedAtDesc();
    }
}
