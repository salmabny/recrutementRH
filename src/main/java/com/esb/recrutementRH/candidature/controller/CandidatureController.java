package com.esb.recrutementRH.candidature.controller;

import com.esb.recrutementRH.candidature.model.CV;
import com.esb.recrutementRH.candidature.model.Candidature;
import com.esb.recrutementRH.candidature.model.CandidatureStatus;
import com.esb.recrutementRH.candidature.repository.CvRepository;
import com.esb.recrutementRH.candidature.repository.CandidatureRepository;
import com.esb.recrutementRH.candidature.service.CandidatureService;
import com.esb.recrutementRH.candidature.service.FileStorageService;
import com.esb.recrutementRH.candidature.service.CvAnalysisService;
import com.esb.recrutementRH.user.model.Candidat;
import com.esb.recrutementRH.user.model.User;
import com.esb.recrutementRH.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/candidatures")
public class CandidatureController {

    private static final Logger logger = LoggerFactory.getLogger(CandidatureController.class);

    @Autowired
    private CandidatureService candidatureService;

    @Autowired
    private CandidatureRepository candidatureRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CvRepository cvRepository;

    @Autowired
    private com.esb.recrutementRH.job.repository.JobOfferRepository jobOfferRepository;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private CvAnalysisService cvAnalysisService;

    @Autowired
    private Environment env;

    @PostMapping("/postuler")
    @jakarta.transaction.Transactional
    public ResponseEntity<?> postuler(
            @RequestParam("jobOfferId") String jobOfferId,
            @RequestParam("candidatId") String candidatId,
            @RequestParam(value = "cvFile", required = false) MultipartFile cvFile,
            @RequestParam(value = "lettre", required = false) String lettre) {
        try {
            logger.info(">>> POSTULER V2 START <<<");
            Long finalJobOfferId = Long.parseLong(jobOfferId);
            Long finalCandidatId = Long.parseLong(candidatId);

            String authEmail = "Anonymous";
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) {
                authEmail = auth.getName();
            }

            logger.info("Application Request: JobOffer={}, Candidate={}, AuthenticatedUser={}",
                    finalJobOfferId, finalCandidatId, authEmail);

            User genericUser = userRepository.findById(finalCandidatId).orElse(null);

            // Failsafe: If ID in request is wrong, try to use the authenticated user
            if (genericUser == null && !authEmail.equals("Anonymous")) {
                logger.warn("ID {} not found, trying to recover from authenticated session: {}", finalCandidatId,
                        authEmail);
                genericUser = userRepository.findByEmail(authEmail).orElse(null);
                if (genericUser != null) {
                    logger.info("Session recovery SUCCESS. Using User ID {} for application.", genericUser.getId());
                }
            }

            if (genericUser == null) {
                logger.error("!!! USER NOT FOUND !!! Request ID: {}, AuthEmail: {}", finalCandidatId, authEmail);
                return ResponseEntity.status(404)
                        .body(Map.of("error", "USER_NOT_FOUND", "message", "Utilisateur non trouvé"));
            }

            if (!(genericUser instanceof Candidat)) {
                logger.error("!!! TYPE MISMATCH !!! User {} is a {}, not a Candidat.", genericUser.getId(),
                        genericUser.getClass().getSimpleName());
                return ResponseEntity.status(403)
                        .body(Map.of("error", "INVALID_USER_TYPE", "message", "L'utilisateur n'est pas un candidat"));
            }

            Candidat candidat = (Candidat) genericUser;
            Long actualCandidatId = candidat.getId();

            if (candidatureRepository.existsByJobOfferIdAndCandidatId(finalJobOfferId, actualCandidatId)) {
                return ResponseEntity.status(409)
                        .body(Map.of("error", "ALREADY_APPLIED", "message", "Tu as déjà postulé pour cette offre"));
            }

            CV cv = null;
            if (cvFile != null && !cvFile.isEmpty()) {
                String uploadDir = env.getProperty("file.upload-dir", "uploads/cv");
                String path = fileStorageService.store(uploadDir, cvFile, ".pdf");

                cv = new CV();
                cv.setFileName(cvFile.getOriginalFilename());
                cv.setFileType(cvFile.getContentType());
                cv.setFileUrl(path);
                cv.setFileSize(cvFile.getSize());
                cv.setUploadDate(LocalDate.now());
                cvRepository.save(cv);
            } else {
                // FALLBACK: Use profile CV (Clone metadata to avoid unique constraint or
                // session issues)
                CV profileCv = candidat.getCv();
                if (profileCv != null) {
                    logger.info("Reusing profile CV: {}", profileCv.getFileName());
                    cv = new CV();
                    cv.setFileName(profileCv.getFileName());
                    cv.setFileType(profileCv.getFileType());
                    cv.setFileUrl(profileCv.getFileUrl());
                    cv.setFileSize(profileCv.getFileSize());
                    cv.setUploadDate(LocalDate.now()); // Re-upload date for this specific application
                    cvRepository.save(cv);
                } else {
                    logger.warn("Candidat has no profile CV and no file uploaded.");
                }
            }

            if (cv == null) {
                return ResponseEntity.status(400)
                        .body(Map.of("error", "CV_REQUIRED", "message", "Veuillez déposer un CV"));
            }

            Candidature saved = candidatureService.postuler(finalJobOfferId, candidat, cv);
            logger.info("Application successful for Candidate {} on Offer {}", finalCandidatId, finalJobOfferId);

            return ResponseEntity.status(201).body(Map.of(
                    "id", saved.getId(),
                    "status", saved.getStatus().name(),
                    "message", "Application submitted successfully"));

        } catch (Exception e) {
            logger.error("Error processing application: {}", e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "INTERNAL_ERROR", "message", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<List<Candidature>> getAll() {
        return ResponseEntity.ok(candidatureRepository.findAll());
    }

    @GetMapping("/offre/{offerId}")
    public ResponseEntity<List<Candidature>> getByOffer(@PathVariable Long offerId) {
        return ResponseEntity.ok(candidatureRepository.findByJobOfferId(offerId));
    }

    @GetMapping("/candidat/{candidatId}")
    public ResponseEntity<List<Candidature>> getByCandidat(@PathVariable Long candidatId) {
        return ResponseEntity.ok(candidatureRepository.findByCandidat_Id(candidatId));
    }

    @GetMapping("/recruteur/{recruiterId}")
    public ResponseEntity<List<Candidature>> getByRecruiter(@PathVariable Long recruiterId) {
        return ResponseEntity.ok(candidatureRepository.findByJobOffer_RecruiterId(recruiterId));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Candidature> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String statusStr = body.get("status");
        CandidatureStatus status = CandidatureStatus.valueOf(statusStr);
        return ResponseEntity.ok(candidatureService.updateStatus(id, status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Candidature> getById(@PathVariable Long id) {
        return candidatureRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // --- Profile Analysis Endpoints ---

    @PostMapping("/analyze-profile/{id}")
    public ResponseEntity<?> analyzeProfile(@PathVariable Long id, @RequestParam("cvFile") MultipartFile file) {
        try {
            logger.info("Starting profile analysis for ID: {}", id);
            Candidat candidat = (Candidat) userRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Candidat non trouvé avec l'id: " + id));

            String uploadDir = env.getProperty("file.upload-dir", "uploads/cv");
            logger.info("Storing file in: {}", uploadDir);
            String fileName = fileStorageService.store(uploadDir, file, ".pdf");
            logger.info("File stored as: {}", fileName);

            CV cv = new CV();
            cv.setFileName(file.getOriginalFilename());
            cv.setFileUrl(fileName);
            cv.setFileType(file.getContentType());
            cv.setFileSize(file.getSize());
            cv.setUploadDate(LocalDate.now());

            logger.info("Saving CV metadata...");
            cvRepository.save(cv);

            candidat.setCv(cv);

            try {
                logger.info("Attempting CV analysis via Python service...");
                cvAnalysisService.analyzeProfile(candidat, cv);

                // --- NEW: Trigger bulk recalculation for dashboard ---
                logger.info("Triggering bulk dashboard score recalculation...");
                java.util.List<com.esb.recrutementRH.job.model.JobOffer> allOffers = (java.util.List<com.esb.recrutementRH.job.model.JobOffer>) jobOfferRepository
                        .findAll();
                cvAnalysisService.recalculateAllDashboardScores(candidat, allOffers);

            } catch (Exception analysisEx) {
                logger.warn("CV Analysis or bulk scan failed but upload will proceed: {}", analysisEx.getMessage());
            }

            logger.info("Saving updated candidate profile and CV...");
            cvRepository.save(cv);
            userRepository.save(candidat);

            return ResponseEntity.ok(candidat);
        } catch (Throwable t) {
            logger.error("CRITICAL ERROR in analyzeProfile: ", t);
            String message = t.getMessage();
            if (message == null)
                message = t.getClass().getSimpleName();
            return ResponseEntity.status(500).body("Error: " + message);
        }
    }

    @GetMapping("/reanalyze-profile/{id}")
    public ResponseEntity<?> reanalyzeProfile(@PathVariable Long id) {
        try {
            Candidat candidat = (Candidat) userRepository.findById(id).orElseThrow();
            if (candidat.getCv() != null) {
                cvAnalysisService.analyzeProfile(candidat, candidat.getCv());
                userRepository.save(candidat);
            }
            return ResponseEntity.ok(candidat);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }
}
