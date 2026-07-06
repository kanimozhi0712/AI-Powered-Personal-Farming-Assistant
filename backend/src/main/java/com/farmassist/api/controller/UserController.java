package com.farmassist.api.controller;

import com.farmassist.api.entity.User;
import com.farmassist.api.dto.AuthDtos.UserResponse;
import com.farmassist.api.repository.UserRepository;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserRepository users;

    public UserController(UserRepository users) {
        this.users = users;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<UserResponse> list() {
        return users.findAll().stream().map(this::toResponse).toList();
    }

    @GetMapping("/{id}")
    public UserResponse get(@PathVariable Long id) {
        return toResponse(users.findById(id).orElseThrow(() -> new IllegalArgumentException("User not found")));
    }

    @PutMapping("/{id}")
    public UserResponse update(@PathVariable Long id, @Valid @RequestBody User request) {
        User user = users.findById(id).orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setFullName(request.getFullName());
        user.setPhone(request.getPhone());
        user.setStateName(request.getStateName());
        user.setDistrict(request.getDistrict());
        user.setProfileImageUrl(request.getProfileImageUrl());
        return toResponse(users.save(user));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable Long id) {
        users.deleteById(id);
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole(),
                user.getPhone(),
                user.getStateName(),
                user.getDistrict(),
                user.getProfileImageUrl(),
                user.isEnabled()
        );
    }
}
