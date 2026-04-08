package com.esb.recrutementRH.user.controller;

import com.esb.recrutementRH.user.dto.LoginDto;
import com.esb.recrutementRH.user.dto.PasswordChangeDto;
import com.esb.recrutementRH.user.dto.RegistrationDto;
import com.esb.recrutementRH.user.dto.VerificationDto;
import java.security.Principal;
import com.esb.recrutementRH.user.model.Recruteur;
import com.esb.recrutementRH.user.model.User;
import com.esb.recrutementRH.user.model.UserStatus;
import com.esb.recrutementRH.user.repository.UserRepository;
import com.esb.recrutementRH.user.service.AuthService;
import com.esb.recrutementRH.user.service.EmailService;
import com.esb.recrutementRH.config.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtUtils jwtUtils;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegistrationDto dto) {
        try {
            Map<String, Object> result = authService.register(dto);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            System.err.println("[AuthController] Registration failed: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verify(@RequestBody VerificationDto dto) {
        boolean verified = authService.verifyCandidate(dto.getEmail(), dto.getCode());
        if (verified) {
            return ResponseEntity.ok("Compte vérifié avec succès");
        }
        return ResponseEntity.badRequest().body("Code de vérification invalide");
    }

    @PostMapping("/resend-code")
    public ResponseEntity<?> resendCode(@RequestBody java.util.Map<String, String> body) {
        try {
            String email = body.get("email");
            java.util.Map<String, Object> result = authService.resendVerificationCode(email);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginDto dto) {
        System.out.println("\n>>> [AuthController] LOGIN ATTEMPT: " + dto.getEmail() + " <<<");
        try {
            org.springframework.security.core.Authentication authentication = authenticationManager.authenticate(
                    new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(dto.getEmail(),
                            dto.getPassword()));

            org.springframework.security.core.context.SecurityContextHolder.getContext()
                    .setAuthentication(authentication);
            String jwt = jwtUtils.generateJwtToken(authentication);

            User user = userRepository.findByEmail(dto.getEmail()).get();

            if (user.getStatus() == UserStatus.PENDING_VERIFICATION) {
                return ResponseEntity.badRequest().body("Veuillez vérifier votre email");
            }
            if (user.getStatus() == UserStatus.PENDING_ADMIN_VALIDATION) {
                return ResponseEntity.badRequest().body("Votre compte est en cours de validation par l'admin");
            }
            if (user.getStatus() == UserStatus.SUSPENDU) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "Votre compte est suspendu. Veuillez contacter l'administrateur."));
            }
            if (user.getStatus() == UserStatus.DELETED) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "Ce compte a été supprimé."));
            }
            if (user.getStatus() == UserStatus.REJECTED) {
                return ResponseEntity.status(403)
                        .body("Votre compte a été refusé ou supprimé. Veuillez contacter l'administration.");
            }

            Map<String, Object> response = new HashMap<>();
            response.put("token", jwt);
            response.put("id", user.getId());
            response.put("prenom", user.getPrenom());
            response.put("nom", user.getNom());
            response.put("email", user.getEmail());
            response.put("role", user.getRole());
            response.put("status", user.getStatus());

            if (user instanceof Recruteur recruteur) {
                response.put("entreprise", recruteur.getEntreprise());
                response.put("ville", recruteur.getVille());
            }
            response.put("dateInscription", user.getDateInscription());
            response.put("mustChangePassword", user.getMustChangePassword());

            return ResponseEntity.ok(response);
        } catch (org.springframework.security.core.AuthenticationException e) {
            return ResponseEntity.status(401).body("Email ou mot de passe incorrect");
        } catch (Exception e) {
            System.err.println("[AuthController] Error during login: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500)
                    .body("Erreur interne du serveur : " + (e.getMessage() != null ? e.getMessage() : "Inconnue"));
        }
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> data) {
        try {
            User user = authService.loginWithGoogle(data);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            Map<String, Object> result = authService.forgotPassword(email);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            String code = body.get("code");
            String newPassword = body.get("password");
            authService.resetPassword(email, code, newPassword);
            return ResponseEntity.ok("Mot de passe réinitialisé avec succès");
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("message", e.getMessage() != null ? e.getMessage() : "Une erreur est survenue");
            return ResponseEntity.badRequest().body(err);
        }
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody PasswordChangeDto dto, Principal principal) {
        try {
            if (principal == null) {
                return ResponseEntity.status(401).body(Map.of("message", "Non authentifié"));
            }
            authService.changePassword(principal.getName(), dto.getOldPassword(), dto.getNewPassword());
            return ResponseEntity.ok(Map.of("message", "Mot de passe modifié avec succès"));
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("message", e.getMessage() != null ? e.getMessage()
                    : "L'ancien mot de passe est incorrect ou une erreur est survenue");
            return ResponseEntity.badRequest().body(err);
        }
    }

    @PostMapping("/contact-admin")
    public ResponseEntity<?> contactAdmin(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            String message = body.get("message");
            emailService.sendSupportEmail(email, message);
            return ResponseEntity.ok(Map.of("message", "Votre message a été envoyé avec succès"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
