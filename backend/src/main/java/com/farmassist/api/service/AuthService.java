package com.farmassist.api.service;

import com.farmassist.api.dto.AuthDtos.*;
import com.farmassist.api.entity.User;
import com.farmassist.api.repository.UserRepository;
import com.farmassist.api.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailOtpService emailOtpService;
    private final ActivityLogService activityLogService;

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService,
                       EmailOtpService emailOtpService, ActivityLogService activityLogService) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.emailOtpService = emailOtpService;
        this.activityLogService = activityLogService;
    }

    public AuthResponse register(RegisterRequest request) {
        if (users.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email is already registered");
        }
        User user = new User();
        user.setFullName(request.fullName());
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(request.role());
        user.setPhone(request.phone());
        user.setStateName(request.stateName());
        user.setDistrict(request.district());
        users.save(user);
        activityLogService.record(user.getEmail(), "User registered", user.getRole().name(), "USER");
        return toAuth(user);
    }

    public AuthResponse login(LoginRequest request) {
        User user = users.findByEmail(request.email()).orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid credentials");
        }
        activityLogService.record(user.getEmail(), "Login", user.getRole().name(), "LOGIN");
        return toAuth(user);
    }

    public User currentUser(String email) {
        return users.findByEmail(email).orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    public String requestPasswordOtp(ForgotPasswordRequest request) {
        return emailOtpService.createOtp(request.email(), "PASSWORD_RESET");
    }

    public void verifyPasswordOtp(OtpVerifyRequest request) {
        if (!emailOtpService.verify(request.email(), "PASSWORD_RESET", request.otp())) {
            throw new IllegalArgumentException("Invalid or expired OTP");
        }
    }

    public void resetPassword(ResetPasswordRequest request) {
        verifyPasswordOtp(new OtpVerifyRequest(request.email(), request.otp()));
        User user = users.findByEmail(request.email()).orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        users.save(user);
        emailOtpService.consume(request.email(), "PASSWORD_RESET");
    }

    public AuthResponse googleLogin(GoogleLoginRequest request) {
        if (request.email() == null || request.email().isBlank()) {
            throw new IllegalArgumentException("Google email is required after token verification");
        }
        User user = users.findByEmail(request.email()).orElseGet(() -> {
            User created = new User();
            created.setEmail(request.email());
            created.setFullName(request.fullName() == null || request.fullName().isBlank() ? "Google User" : request.fullName());
            created.setPasswordHash(passwordEncoder.encode("GOOGLE_OAUTH_USER"));
            User saved = users.save(created);
            activityLogService.record(saved.getEmail(), "Google user registered", saved.getRole().name(), "USER");
            return saved;
        });
        activityLogService.record(user.getEmail(), "Google login", user.getRole().name(), "LOGIN");
        return toAuth(user);
    }

    private AuthResponse toAuth(User user) {
        return new AuthResponse(jwtService.generate(user), user.getId(), user.getFullName(), user.getEmail(), user.getRole());
    }
}
