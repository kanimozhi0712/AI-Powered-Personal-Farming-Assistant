package com.farmassist.api.dto;

import com.farmassist.api.entity.Role;
import java.util.List;
import java.util.Map;

public class AdminDtos {
    public record AdminUserRequest(String fullName, String email, String password, Role role, String phone,
                                   String stateName, String district, Boolean enabled) {}

    public record AdminSummary(long users, long records, long crops, long diseases, long schemes,
                               long knowledge, long weather, long market) {}

    public record AdminAnalytics(AdminSummary summary, Map<String, Long> recordsByModule,
                                 List<ActivityItem> activities, List<ReportItem> reports) {}

    public record ActivityItem(String time, String actor, String action, String target) {}

    public record ReportItem(String title, String module, long count, String status) {}
}
