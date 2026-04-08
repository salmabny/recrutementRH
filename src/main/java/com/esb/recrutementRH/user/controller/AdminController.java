package com.esb.recrutementRH.user.controller;

import com.esb.recrutementRH.candidature.repository.CandidatureRepository;
import com.esb.recrutementRH.job.repository.JobOfferRepository;
import com.esb.recrutementRH.user.model.*;
import com.esb.recrutementRH.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import com.esb.recrutementRH.job.model.JobOffer;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.TextStyle;
import java.util.*;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JobOfferRepository jobOfferRepository;

    @Autowired
    private CandidatureRepository candidatureRepository;

    @Autowired
    private com.esb.recrutementRH.user.service.UserService userService;

    @Autowired
    private com.esb.recrutementRH.user.service.AuthService authService;

    // ── Stats globales (dynamiques)
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getAdminStats() {
        long totalUtilisateurs = userRepository.count();
        long totalRecruteurs = userRepository.countByType(Recruteur.class);
        long totalCandidats = userRepository.countByType(Candidat.class);
        long offresActives = jobOfferRepository.count();
        long candidaturesTraitees = candidatureRepository.count();

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalUtilisateurs", totalUtilisateurs);
        stats.put("totalRecruteurs", totalRecruteurs);
        stats.put("totalCandidats", totalCandidats);
        stats.put("offresActives", offresActives);
        stats.put("candidaturesTraitees", candidaturesTraitees);

        return ResponseEntity.ok(stats);
    }

    // ── Stats mensuelles pour le graphique (6 derniers mois)
    @GetMapping("/stats/monthly")
    public ResponseEntity<List<Map<String, Object>>> getMonthlyStats() {
        List<Map<String, Object>> result = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        List<User> allUsers = userRepository.findAll();
        List<?> allCandidatures = candidatureRepository.findAll();

        for (int i = 5; i >= 0; i--) {
            LocalDateTime start = now.minusMonths(i).withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
            LocalDateTime end = start.plusMonths(1);

            int month = start.getMonthValue();
            int year = start.getYear();

            // Inscriptions totales ce mois
            long inscriptions = allUsers.stream()
                    .filter(u -> u.getDateInscription() != null
                            && u.getDateInscription().getMonthValue() == month
                            && u.getDateInscription().getYear() == year)
                    .count();

            // Recruteurs inscrits ce mois
            long recruteurs = allUsers.stream()
                    .filter(u -> u instanceof Recruteur
                            && u.getDateInscription() != null
                            && u.getDateInscription().getMonthValue() == month
                            && u.getDateInscription().getYear() == year)
                    .count();

            // Candidatures ce mois (utilise datePostulation via reflection-free cast)
            long candidaturesCount = countCandidaturesForMonth(allCandidatures, month, year);

            String moisLabel = start.getMonth()
                    .getDisplayName(TextStyle.SHORT, Locale.FRENCH);
            // Capitalize first letter
            moisLabel = moisLabel.substring(0, 1).toUpperCase() + moisLabel.substring(1);

            Map<String, Object> monthData = new LinkedHashMap<>();
            monthData.put("mois", moisLabel);
            monthData.put("inscriptions", inscriptions);
            monthData.put("recruteurs", recruteurs);
            monthData.put("candidatures", candidaturesCount);

            result.add(monthData);
        }

        return ResponseEntity.ok(result);
    }

    private long countCandidaturesForMonth(List<?> candidatures, int month, int year) {
        return candidatures.stream()
                .filter(c -> {
                    try {
                        java.lang.reflect.Method m = c.getClass().getMethod("getDateCandidature");
                        Object date = m.invoke(c);
                        if (date == null)
                            return false;
                        if (date instanceof LocalDateTime ldt) {
                            return ldt.getMonthValue() == month && ldt.getYear() == year;
                        }
                        if (date instanceof java.time.LocalDate ld) {
                            return ld.getMonthValue() == month && ld.getYear() == year;
                        }
                        return false;
                    } catch (Exception e) {
                        return false;
                    }
                })
                .count();
    }

    @GetMapping("/recruteurs")
    public ResponseEntity<List<User>> getAllRecruteurs() {
        List<User> list = userRepository.findAllByType(Recruteur.class);
        list.forEach(u -> {
            u.setNombreOffres((int) jobOfferRepository.countByRecruiterId(u.getId()));
        });
        return ResponseEntity.ok(list);
    }

    @PostMapping("/recruteurs/create")
    public ResponseEntity<?> createRecruiter(@RequestBody Map<String, String> body) {
        try {
            String nom = body.get("nom");
            String prenom = body.get("prenom");
            String email = body.get("email");
            String entreprise = body.get("entreprise");
            String ville = body.get("ville");

            Map<String, Object> result = authService.createRecruiterByAdmin(nom, prenom, email, entreprise, ville);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/candidats")
    public ResponseEntity<List<User>> getAllCandidats() {
        List<User> list = userRepository.findAllByType(Candidat.class);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        List<User> list = userRepository.findAll();
        list.forEach(u -> {
            if ("RECRUTEUR".equals(u.getRole().name())) {
                u.setNombreOffres((int) jobOfferRepository.countByRecruiterId(u.getId()));
            }
        });
        return ResponseEntity.ok(list);
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        try {
            userService.softDeleteUser(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            System.err.println("[AdminController] Erreur soft delete : " + e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Erreur lors de la suppression : " + e.getMessage()));
        }
    }

    @PutMapping("/users/{id}/suspendre")
    public ResponseEntity<?> suspendreUser(@PathVariable Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        user.setStatus(UserStatus.SUSPENDU);
        userRepository.save(user);
        return ResponseEntity.ok(user);
    }

    @PutMapping("/users/{id}/activer")
    public ResponseEntity<?> activerUser(@PathVariable Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);
        return ResponseEntity.ok(user);
    }

    @PutMapping("/users/{id}/restaurer")
    public ResponseEntity<?> restaurerUser(@PathVariable Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);
        return ResponseEntity.ok(user);
    }

    @GetMapping("/debug/users")
    public ResponseEntity<List<User>> debugUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    // ── Gestion des offres pour l'admin
    @GetMapping("/job-offers")
    public ResponseEntity<List<JobOffer>> getAllJobOffers() {
        return ResponseEntity.ok(jobOfferRepository.findAll());
    }

    @DeleteMapping("/job-offers/{id}")
    public ResponseEntity<?> deleteJobOffer(@PathVariable Long id) {
        return jobOfferRepository.findById(id)
                .map(offer -> {
                    jobOfferRepository.delete(offer);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/email")
    public ResponseEntity<?> sendEmail(@RequestBody Map<String, String> body) {
        try {
            String to = body.get("to");
            String subject = body.get("subject");
            String content = body.get("content");
            ((com.esb.recrutementRH.user.service.EmailService) userService.getEmailService()).sendDirectEmail(to,
                    subject, content);
            return ResponseEntity.ok(Map.of("message", "Email envoyé avec succès"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Erreur lors de l'envoi : " + e.getMessage()));
        }
    }
}
