package com.farmassist.api.dto;

import com.farmassist.api.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class AuthDtos {
    public record RegisterRequest(
            @NotBlank String fullName,
            @Email @NotBlank String email,
            @NotBlank String password,
            @NotNull Role role,
            String phone,
            String stateName,
            String district
    ) {}

    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password, boolean rememberMe) {}

    public record AuthResponse(String token, Long userId, String fullName, String email, Role role) {}

    public record UserResponse(Long id, String fullName, String email, Role role, String phone,
                               String stateName, String district, String profileImageUrl, boolean enabled) {}

    public record ForgotPasswordRequest(@Email @NotBlank String email) {}

    public record OtpVerifyRequest(@Email @NotBlank String email, @NotBlank String otp) {}

    public record ResetPasswordRequest(@Email @NotBlank String email, @NotBlank String otp, @NotBlank String newPassword) {}

    public record GoogleLoginRequest(@NotBlank String idToken, String email, String fullName) {}
}
