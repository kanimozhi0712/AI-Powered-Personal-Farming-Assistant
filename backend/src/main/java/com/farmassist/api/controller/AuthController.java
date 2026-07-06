package com.farmassist.api.controller;

import com.farmassist.api.dto.AuthDtos.*;
import com.farmassist.api.service.AuthService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public UserResponse me(Principal principal) {
        return toUserResponse(authService.currentUser(principal.getName()));
    }

    @PostMapping("/forgot-password")
    public Map<String, String> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        String devOtp = authService.requestPasswordOtp(request);
        return Map.of("message", "OTP generated for password reset", "email", request.email(), "devOtp", devOtp);
    }

    @PostMapping("/verify-otp")
    public Map<String, String> verifyOtp(@Valid @RequestBody OtpVerifyRequest request) {
        authService.verifyPasswordOtp(request);
        return Map.of("message", "OTP verified", "email", request.email());
    }

    @PostMapping("/reset-password")
    public Map<String, String> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return Map.of("message", "Password reset request accepted", "email", request.email());
    }

    @PostMapping("/google")
    public AuthResponse googleLogin(@Valid @RequestBody GoogleLoginRequest request) {
        return authService.googleLogin(request);
    }

    private UserResponse toUserResponse(com.farmassist.api.entity.User user) {
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
