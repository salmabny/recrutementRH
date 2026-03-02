package com.esb.recrutementRH.user.controller;

import com.esb.recrutementRH.candidature.repository.CandidatureRepository;
import com.esb.recrutementRH.job.repository.JobOfferRepository;
import com.esb.recrutementRH.user.model.*;
import com.esb.recrutementRH.user.repository.UserRepository;
import com.esb.recrutementRH.user.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import com.esb.recrutementRH.job.model.JobOffer;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.Month;
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
    private EmailService emailService;

    // ── Stats globales (dynamiques)
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getAdminStats() {
        long totalUtilisateurs = userRepository.count();
        long totalRecruteurs = userRepository.countByType(Recruteur.class);
        long totalCandidats = userRepository.countByType(Candidat.class);
        long recruteursEnAttente = userRepository.countByTypeAndStatus(Recruteur.class,
                UserStatus.PENDING_ADMIN_VALIDATION);
        long offresActives = jobOfferRepository.count();
        long candidaturesTraitees = candidatureRepository.count();

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalUtilisateurs", totalUtilisateurs);
        stats.put("totalRecruteurs", totalRecruteurs);
        stats.put("totalCandidats", totalCandidats);
        stats.put("recruteursEnAttente", recruteursEnAttente);
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

    @SuppressWarnings("unchecked")
    private long countCandidaturesForMonth(List<?> candidatures, int month, int year) {
        return candidatures.stream()
                .filter(c -> {
                    try {
                        java.lang.reflect.Method m = c.getClass().getMethod("getDatePostulation");
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

    @GetMapping("/recruteurs/en-attente")
    public ResponseEntity<List<User>> getPendingRecruiters() {
        List<User> list = userRepository.findAllByTypeAndStatus(Recruteur.class, UserStatus.PENDING_ADMIN_VALIDATION);
        list.forEach(u -> {
            u.setNombreOffres((int) jobOfferRepository.countByRecruiterId(u.getId()));
        });
        return ResponseEntity.ok(list);
    }

    @PutMapping("/recruteurs/{id}/valider")
    public ResponseEntity<?> validerRecruteur(@PathVariable Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);
        try {
            emailService.sendAccountApprovalEmail(user.getEmail(), user.getPrenom());
        } catch (Exception e) {
            System.err.println("[AdminController] Erreur notification email : " + e.getMessage());
        }
        return ResponseEntity.ok(user);
    }

    @PutMapping("/recruteurs/{id}/refuser")
    public ResponseEntity<?> refuserRecruteur(@PathVariable Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        user.setStatus(UserStatus.REJECTED);
        userRepository.save(user);
        try {
            emailService.sendAccountRejectionEmail(user.getEmail(), user.getPrenom());
        } catch (Exception e) {
            System.err.println("[AdminController] Erreur notification email rejet : " + e.getMessage());
        }
        return ResponseEntity.ok().build();
    }

    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        List<User> list = userRepository.findAll();
        list.forEach(u -> {
            // Check if it's a recruiter using role since it's more robust than instanceof
            // on Proxies
            if ("RECRUTEUR".equals(u.getRole().name())) {
                u.setNombreOffres((int) jobOfferRepository.countByRecruiterId(u.getId()));
            }
        });
        return ResponseEntity.ok(list);
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        userRepository.deleteById(id);
        return ResponseEntity.ok().build();
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

    @Value("${file.upload-dir}")
    private String uploadDir;

    @GetMapping("/document/{id}")
    public ResponseEntity<org.springframework.core.io.Resource> getDocument(@PathVariable Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        String path = null;
        if (user instanceof Recruteur r) {
            path = r.getAdminDocPath();
        }

        if (path == null) {
            return ResponseEntity.notFound().build();
        }

        try {
            java.nio.file.Path filePath = java.nio.file.Paths.get(uploadDir).resolve(path);
            org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(
                    filePath.toUri());

            if (resource.exists()) {
                String contentType = "application/octet-stream";
                if (path.toLowerCase().endsWith(".pdf"))
                    contentType = "application/pdf";
                else if (path.toLowerCase().endsWith(".jpg")
                        || path.toLowerCase().endsWith(".jpeg"))
                    contentType = "image/jpeg";
                else if (path.toLowerCase().endsWith(".png"))
                    contentType = "image/png";

                return ResponseEntity.ok()
                        .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, contentType)
                        .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                                "inline; filename=\"" + path + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
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
}
