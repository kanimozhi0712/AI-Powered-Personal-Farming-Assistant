package com.farmassist.api.config;

import com.farmassist.api.entity.Role;
import com.farmassist.api.entity.User;
import com.farmassist.api.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataInitializer {
    @Bean
    CommandLineRunner seedDemoUsers(UserRepository users, PasswordEncoder passwordEncoder) {
        return args -> {
            seed(users, passwordEncoder, "farmer@example.com", "Demo Farmer", Role.FARMER, "Karnataka", "Mysuru");
            seed(users, passwordEncoder, "expert@example.com", "Demo Expert", Role.EXPERT, "Punjab", "Ludhiana");
            seed(users, passwordEncoder, "admin@example.com", "Demo Admin", Role.ADMIN, "Maharashtra", "Pune");
        };
    }

    private void seed(UserRepository users, PasswordEncoder encoder, String email, String name, Role role, String state, String district) {
        if (users.existsByEmail(email)) {
            return;
        }
        User user = new User();
        user.setEmail(email);
        user.setFullName(name);
        user.setRole(role);
        user.setStateName(state);
        user.setDistrict(district);
        user.setPhone("9999999999");
        user.setPasswordHash(encoder.encode("password123"));
        users.save(user);
    }
}
