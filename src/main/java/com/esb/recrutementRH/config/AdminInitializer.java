package com.esb.recrutementRH.config;

import com.esb.recrutementRH.user.model.Admin;
import com.esb.recrutementRH.user.model.UserStatus;
import com.esb.recrutementRH.user.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AdminInitializer {

    @Bean
    CommandLineRunner initAdmin(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            String adminEmail = "admin@smarthiring.com";

            if (!userRepository.existsByEmail(adminEmail)) {
                Admin admin = new Admin();
                admin.setNom("System");
                admin.setPrenom("Admin");
                admin.setEmail(adminEmail);
                admin.setMotDePasse(passwordEncoder.encode("Admin123!"));
                admin.setStatus(UserStatus.ACTIVE);

                userRepository.save(admin);
                System.out.println("[AdminInitializer] Administrateur par défaut créé : " + adminEmail);
            } else {
                System.out.println("[AdminInitializer] L'administrateur existe déjà.");
            }
        };
    }
}
