package com.esb.recrutementRH.user.service;

import com.esb.recrutementRH.user.dto.RegistrationDto;
import com.esb.recrutementRH.user.model.Candidat;
import com.esb.recrutementRH.user.model.Recruteur;
import com.esb.recrutementRH.user.model.Role;
import com.esb.recrutementRH.user.model.User;
import com.esb.recrutementRH.user.model.UserStatus;
import com.esb.recrutementRH.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Random;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailService emailService;

    public Map<String, Object> register(RegistrationDto dto) {
        if (userRepository.existsByEmail(dto.getEmail())) {
            throw new RuntimeException("L'email est déjà utilisé");
        }

        User user;
        Map<String, Object> response = new HashMap<>();

        if (dto.getRole() == Role.CANDIDAT) {
            Candidat candidat = new Candidat();
            candidat.setNom(dto.getNom());
            candidat.setPrenom(dto.getPrenom());
            candidat.setEmail(dto.getEmail());
            if (dto.getPassword() == null) {
                throw new RuntimeException("Le mot de passe ne peut pas être vide");
            }
            candidat.setMotDePasse(passwordEncoder.encode(dto.getPassword()));

            String code = generateVerificationCode();
            candidat.setVerificationCode(code);
            candidat.setStatus(UserStatus.PENDING_VERIFICATION);

            User saved = userRepository.save(candidat);

            System.out.println("=================================================");
            System.out.println("CODE DE VERIFICATION POUR " + saved.getEmail() + " : " + code);
            System.out.println("=================================================");

            boolean emailSent = false;
            try {
                emailService.sendVerificationCode(saved.getEmail(), code);
                emailSent = true;
            } catch (Exception e) {
                System.err.println("[EmailService] Échec envoi email : " + e.getMessage());
            }

            response.put("id", saved.getId());
            response.put("email", saved.getEmail());
            response.put("prenom", saved.getPrenom());
            response.put("nom", saved.getNom());
            response.put("role", saved.getRole());
            response.put("status", saved.getStatus());
            response.put("emailSent", emailSent);
            return response;

        } else if (dto.getRole() == Role.RECRUTEUR) {
            throw new RuntimeException(
                    "L'inscription directe pour les recruteurs est désactivée. Veuillez contacter l'administrateur.");
        } else {
            throw new RuntimeException("Rôle non supporté pour l'inscription");
        }
    }

    public Map<String, Object> createRecruiterByAdmin(String nom, String prenom, String email, String entreprise,
            String ville) {
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Cet e-mail est déjà utilisé");
        }

        String tempPassword = generateRandomPassword();
        Recruteur recruteur = new Recruteur();
        recruteur.setNom(nom);
        recruteur.setPrenom(prenom);
        recruteur.setEmail(email);
        recruteur.setEntreprise(entreprise);
        recruteur.setVille(ville);
        recruteur.setMotDePasse(passwordEncoder.encode(tempPassword));
        recruteur.setStatus(UserStatus.ACTIVE);
        recruteur.setMustChangePassword(true);

        String domain = email.substring(email.indexOf("@") + 1);
        recruteur.setCompanyDomain(domain);

        User saved = userRepository.save(recruteur);

        emailService.sendTemporaryPasswordEmail(email, prenom, tempPassword);

        Map<String, Object> response = new HashMap<>();
        response.put("id", saved.getId());
        response.put("email", saved.getEmail());
        response.put("status", saved.getStatus());
        return response;
    }

    private String generateRandomPassword() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
        StringBuilder sb = new StringBuilder();
        Random random = new Random();
        for (int i = 0; i < 10; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }

    public boolean verifyCandidate(String email, String code) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        if (user instanceof Candidat candidat) {
            String vCode = candidat.getVerificationCode();
            if (vCode != null && vCode.equals(code)) {
                candidat.setStatus(UserStatus.ACTIVE);
                candidat.setVerificationCode(null);
                userRepository.save(candidat);
                return true;
            }
        }
        return false;
    }

    public Map<String, Object> resendVerificationCode(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        if (!(user instanceof Candidat candidat)) {
            throw new RuntimeException("Seuls les candidats ont un code de vérification");
        }

        if (candidat.getStatus() != UserStatus.PENDING_VERIFICATION) {
            throw new RuntimeException("Ce compte n'est pas en attente de vérification");
        }

        String code = generateVerificationCode();
        candidat.setVerificationCode(code);
        userRepository.save(candidat);

        Map<String, Object> response = new HashMap<>();
        boolean emailSent = false;
        try {
            emailService.sendVerificationCode(email, code);
            emailSent = true;
        } catch (Exception e) {
            System.err.println("[EmailService] Échec renvoi email : " + e.getMessage());
        }
        response.put("emailSent", emailSent);
        return response;
    }

    public Map<String, Object> forgotPassword(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec cet e-mail"));

        if (!(user instanceof Candidat candidat)) {
            throw new RuntimeException("La réinitialisation par code est réservée aux candidats");
        }

        String code = generateVerificationCode();
        candidat.setResetCode(code);
        userRepository.save(candidat);

        Map<String, Object> response = new HashMap<>();
        boolean emailSent = false;
        try {
            emailService.sendResetPasswordCode(email, code);
            emailSent = true;
        } catch (Exception e) {
            System.err.println("[EmailService] Échec envoi code reset : " + e.getMessage());
        }
        response.put("emailSent", emailSent);
        return response;
    }

    public void resetPassword(String email, String code, String newPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        if (!(user instanceof Candidat candidat)) {
            throw new RuntimeException("Opération non autorisée pour ce type d'utilisateur");
        }

        if (candidat.getResetCode() == null || !candidat.getResetCode().equals(code)) {
            throw new RuntimeException("Code de réinitialisation invalide");
        }

        if (newPassword == null) {
            throw new RuntimeException("Le nouveau mot de passe est obligatoire");
        }
        candidat.setMotDePasse(passwordEncoder.encode(newPassword));
        candidat.setResetCode(null);
        userRepository.save(candidat);
    }

    public User loginWithGoogle(Map<String, String> data) {
        String email = data.get("email");
        System.out.println("[AuthService] Google Login for: " + email);
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            String roleStr = data.get("role");
            if (roleStr != null && roleStr.equalsIgnoreCase("RECRUTEUR")) {
                Recruteur recruteur = new Recruteur();
                recruteur.setEmail(email);
                recruteur.setPrenom(data.get("prenom"));
                recruteur.setNom(data.get("nom"));
                recruteur.setStatus(UserStatus.PENDING_ADMIN_VALIDATION);
                user = recruteur;
            } else {
                Candidat candidat = new Candidat();
                candidat.setEmail(email);
                candidat.setPrenom(data.get("prenom"));
                candidat.setNom(data.get("nom"));
                candidat.setStatus(UserStatus.ACTIVE);
                user = candidat;
            }
            userRepository.save(user);
        }

        return user;
    }

    public void changePassword(String email, String oldPassword, String newPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        if (!passwordEncoder.matches(oldPassword, user.getMotDePasse())) {
            throw new RuntimeException("L'ancien mot de passe est incorrect");
        }

        if (newPassword == null || newPassword.trim().isEmpty()) {
            throw new RuntimeException("Le nouveau mot de passe est obligatoire");
        }

        user.setMotDePasse(passwordEncoder.encode(newPassword));
        user.setMustChangePassword(false);
        userRepository.save(user);
    }

    private String generateVerificationCode() {
        return String.format("%06d", new Random().nextInt(999999));
    }
}
