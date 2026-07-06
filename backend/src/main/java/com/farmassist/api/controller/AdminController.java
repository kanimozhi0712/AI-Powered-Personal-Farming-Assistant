package com.farmassist.api.controller;

import com.farmassist.api.dto.AdminDtos.*;
import com.farmassist.api.dto.AuthDtos.UserResponse;
import com.farmassist.api.dto.RecordDtos.RecordRequest;
import com.farmassist.api.entity.ActivityLog;
import com.farmassist.api.entity.ManagedRecord;
import com.farmassist.api.entity.Role;
import com.farmassist.api.entity.User;
import com.farmassist.api.repository.ManagedRecordRepository;
import com.farmassist.api.repository.UserRepository;
import com.farmassist.api.service.ActivityLogService;
import com.farmassist.api.service.ManagedRecordService;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final UserRepository users;
    private final ManagedRecordRepository records;
    private final ManagedRecordService recordService;
    private final PasswordEncoder passwordEncoder;
    private final ActivityLogService activityLogService;

    public AdminController(UserRepository users, ManagedRecordRepository records,
                           ManagedRecordService recordService, PasswordEncoder passwordEncoder,
                           ActivityLogService activityLogService) {
        this.users = users;
        this.records = records;
        this.recordService = recordService;
        this.passwordEncoder = passwordEncoder;
        this.activityLogService = activityLogService;
    }

    @GetMapping("/users")
    public List<UserResponse> users(@RequestParam(defaultValue = "") String search) {
        return users.findAll().stream()
                .filter(user -> matches(search, user.getFullName(), user.getEmail(), user.getPhone(), user.getStateName(), user.getDistrict(), user.getRole().name()))
                .sorted(Comparator.comparing(User::getCreatedAt).reversed())
                .map(this::toUserResponse)
                .toList();
    }

    @PostMapping("/users")
    public UserResponse createUser(@RequestBody AdminUserRequest request) {
        if (users.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already exists");
        }
        User user = new User();
        copyUser(request, user);
        user.setPasswordHash(passwordEncoder.encode(request.password() == null || request.password().isBlank() ? "password123" : request.password()));
        User saved = users.save(user);
        activityLogService.record("Admin", "Created user", saved.getEmail(), "USER");
        return toUserResponse(saved);
    }

    @PutMapping("/users/{id}")
    public UserResponse updateUser(@PathVariable Long id, @RequestBody AdminUserRequest request) {
        User user = users.findById(id).orElseThrow(() -> new IllegalArgumentException("User not found"));
        copyUser(request, user);
        if (request.password() != null && !request.password().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.password()));
        }
        User saved = users.save(user);
        activityLogService.record("Admin", "Updated user", saved.getEmail(), "USER");
        return toUserResponse(saved);
    }

    @DeleteMapping("/users/{id}")
    public void deleteUser(@PathVariable Long id) {
        users.findById(id).ifPresent(user -> activityLogService.record("Admin", "Deleted user", user.getEmail(), "USER"));
        users.deleteById(id);
    }

    @GetMapping("/records/{module}")
    public List<ManagedRecord> records(@PathVariable String module, @RequestParam(defaultValue = "") String search) {
        return recordService.list(module).stream()
                .filter(record -> matches(search, record.getTitle(), record.getContent(), record.getMetadataJson()))
                .toList();
    }

    @PostMapping("/records/{module}")
    public ManagedRecord createRecord(@PathVariable String module, @RequestBody RecordRequest request) {
        ManagedRecord saved = recordService.create(module, request);
        activityLogService.record("Admin", "Created record", module + ": " + saved.getTitle(), "RECORD");
        return saved;
    }

    @PutMapping("/records/{module}/{id}")
    public ManagedRecord updateRecord(@PathVariable String module, @PathVariable Long id, @RequestBody RecordRequest request) {
        ManagedRecord saved = recordService.update(id, request);
        activityLogService.record("Admin", "Updated record", module + ": " + saved.getTitle(), "RECORD");
        return saved;
    }

    @DeleteMapping("/records/{module}/{id}")
    public void deleteRecord(@PathVariable String module, @PathVariable Long id) {
        records.findById(id).ifPresent(record -> activityLogService.record("Admin", "Deleted record", module + ": " + record.getTitle(), "RECORD"));
        recordService.delete(id);
    }

    @GetMapping("/analytics")
    public AdminAnalytics analytics() {
        Map<String, Long> byModule = records.findAll().stream()
                .collect(java.util.stream.Collectors.groupingBy(ManagedRecord::getModule, java.util.stream.Collectors.counting()));
        AdminSummary summary = summary(byModule);
        List<ActivityItem> activities = recentActivities();
        List<ReportItem> reports = List.of(
                new ReportItem("User Reports", "users", users.count(), "Ready"),
                new ReportItem("Crop Reports", "crop-recommendations", byModule.getOrDefault("crop-recommendations", 0L), "Ready"),
                new ReportItem("Disease Reports", "disease-reports", byModule.getOrDefault("disease-reports", 0L), "Ready"),
                new ReportItem("Weather Reports", "weather-history", byModule.getOrDefault("weather-history", 0L), "Ready"),
                new ReportItem("Market Reports", "market-prices", byModule.getOrDefault("market-prices", 0L), "Ready")
        );
        return new AdminAnalytics(summary, byModule, activities, reports);
    }

    private AdminSummary summary(Map<String, Long> byModule) {
        return new AdminSummary(
                users.count(),
                records.count(),
                byModule.getOrDefault("crop-recommendations", 0L),
                byModule.getOrDefault("disease-reports", 0L),
                byModule.getOrDefault("government-schemes", 0L),
                byModule.getOrDefault("knowledge-base", 0L),
                byModule.getOrDefault("weather-history", 0L),
                byModule.getOrDefault("market-prices", 0L)
        );
    }

    private List<ActivityItem> recentActivities() {
        Stream<ActivityItem> loggedActivities = activityLogService.recent().stream()
                .map(this::toActivityItem);
        ActivityItem system = new ActivityItem(Instant.now().toString(), "System", "System monitoring", "API running");
        return Stream.concat(Stream.of(system), loggedActivities).limit(25).toList();
    }

    private ActivityItem toActivityItem(ActivityLog log) {
        return new ActivityItem(log.getCreatedAt().toString(), log.getActor(), log.getAction(), log.getTarget());
    }

    private void copyUser(AdminUserRequest request, User user) {
        user.setFullName(request.fullName());
        user.setEmail(request.email());
        user.setRole(request.role() == null ? Role.FARMER : request.role());
        user.setPhone(request.phone());
        user.setStateName(request.stateName());
        user.setDistrict(request.district());
        user.setEnabled(request.enabled() == null || request.enabled());
    }

    private boolean matches(String search, String... values) {
        if (search == null || search.isBlank()) {
            return true;
        }
        String needle = search.toLowerCase();
        return Stream.of(values).filter(value -> value != null).anyMatch(value -> value.toLowerCase().contains(needle));
    }

    private UserResponse toUserResponse(User user) {
        return new UserResponse(user.getId(), user.getFullName(), user.getEmail(), user.getRole(),
                user.getPhone(), user.getStateName(), user.getDistrict(), user.getProfileImageUrl(), user.isEnabled());
    }
}
