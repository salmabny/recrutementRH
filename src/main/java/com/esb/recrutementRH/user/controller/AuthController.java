package com.esb.recrutementRH.user.controller;

import com.esb.recrutementRH.user.dto.LoginDto;
import com.esb.recrutementRH.user.dto.RegistrationDto;
import com.esb.recrutementRH.user.dto.VerificationDto;
import com.esb.recrutementRH.user.model.Recruteur;
import com.esb.recrutementRH.user.model.User;
import com.esb.recrutementRH.user.model.UserStatus;
import com.esb.recrutementRH.user.repository.UserRepository;
import com.esb.recrutementRH.user.service.AuthService;
import com.esb.recrutementRH.config.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
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
    private PasswordEncoder passwordEncoder;

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

    @PostMapping("/register-recruiter")
    public ResponseEntity<?> registerRecruiter(
            @RequestParam("nom") String nom,
            @RequestParam("prenom") String prenom,
            @RequestParam("email") String email,
            @RequestParam("password") String password,
            @RequestParam(value = "entreprise", required = false) String entreprise,
            @RequestParam(value = "ville", required = false) String ville,
            @RequestParam(value = "document", required = false) org.springframework.web.multipart.MultipartFile document) {
        try {
            Map<String, Object> result = authService.registerRecruiter(nom, prenom, email, password, entreprise, ville,
                    document);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            System.err.println("[AuthController] Recruiter registration failed: " + e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
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

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtUtils jwtUtils;

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
            if (user.getStatus() == UserStatus.REJECTED) {
                return ResponseEntity.status(403).body("Votre compte a été rejeté");
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

            return ResponseEntity.ok(response);
        } catch (org.springframework.security.core.AuthenticationException e) {
            return ResponseEntity.status(401).body("Email ou mot de passe incorrect");
        } catch (Exception e) {
            System.err.println("[AuthController] Error during login: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Erreur interne du serveur : " + e.getMessage());
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
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
