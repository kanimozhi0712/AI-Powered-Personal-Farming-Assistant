package com.farmassist.api.service;

import java.time.Instant;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class EmailOtpService {
    private final Map<String, OtpEntry> otps = new ConcurrentHashMap<>();
    private final Random random = new Random();

    public String createOtp(String email, String purpose) {
        String otp = String.format("%06d", random.nextInt(1_000_000));
        otps.put(key(email, purpose), new OtpEntry(otp, Instant.now().plusSeconds(10 * 60)));
        return otp;
    }

    public boolean verify(String email, String purpose, String otp) {
        OtpEntry entry = otps.get(key(email, purpose));
        return entry != null && entry.expiresAt().isAfter(Instant.now()) && entry.otp().equals(otp);
    }

    public void consume(String email, String purpose) {
        otps.remove(key(email, purpose));
    }

    private String key(String email, String purpose) {
        return email.toLowerCase() + ":" + purpose;
    }

    private record OtpEntry(String otp, Instant expiresAt) {}
}
