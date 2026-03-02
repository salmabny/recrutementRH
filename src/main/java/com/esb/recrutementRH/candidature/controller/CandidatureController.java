package com.esb.recrutementRH.candidature.controller;

import com.esb.recrutementRH.candidature.model.CV;
import com.esb.recrutementRH.candidature.model.Candidature;
import com.esb.recrutementRH.candidature.model.CandidatureStatus;
import com.esb.recrutementRH.candidature.repository.CvRepository;
import com.esb.recrutementRH.candidature.repository.CandidatureRepository;
import com.esb.recrutementRH.candidature.service.CandidatureService;
import com.esb.recrutementRH.candidature.service.FileStorageService;
import com.esb.recrutementRH.candidature.service.CvAnalysisService;
import com.esb.recrutementRH.job.repository.JobOfferRepository;
import com.esb.recrutementRH.user.model.Candidat;
import com.esb.recrutementRH.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.HashMap;
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
    private JobOfferRepository jobOfferRepository;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private CvAnalysisService cvAnalysisService;

    @Autowired
    private Environment env;

    @PostMapping("/postuler")
    public ResponseEntity<?> postuler(
            @RequestParam("jobOfferId") String jobOfferId,
            @RequestParam("candidatId") String candidatId,
            @RequestParam("cv") MultipartFile cvFile) {

        try {
            Long finalJobOfferId = Long.parseLong(jobOfferId);
            Long finalCandidatId = Long.parseLong(candidatId);

            logger.info("New Candidature Request: Offer={}, Candidate={}", finalJobOfferId, finalCandidatId);

            Candidat candidat = (Candidat) userRepository.findById(finalCandidatId)
                    .orElseThrow(() -> new RuntimeException("Candidat non trouvé (" + finalCandidatId + ")"));

            var jobOffer = jobOfferRepository.findById(finalJobOfferId)
                    .orElseThrow(() -> new RuntimeException("Offre non trouvée (" + finalJobOfferId + ")"));

            if (candidatureRepository.existsByJobOfferIdAndCandidatId(finalJobOfferId, finalCandidatId)) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "ALREADY_APPLIED");
                error.put("message", "Tu as déjà postulé pour cette offre");
                return ResponseEntity.status(409).body(error);
            }

            if (cvFile.isEmpty())
                return ResponseEntity.status(400).body("Fichier CV vide");

            if (!cvFile.getContentType().equals("application/pdf"))
                return ResponseEntity.status(400).body("Seul le format PDF est accepté");

            String uploadDir = env.getProperty("file.upload-dir", "uploads/cv");
            String path = fileStorageService.store(uploadDir, cvFile, ".pdf");

            CV cv = new CV();
            cv.setFileName(cvFile.getOriginalFilename());
            cv.setFileType(cvFile.getContentType());
            cv.setFilePath(path);
            cv.setFileSize(cvFile.getSize());
            cv.setUploadDate(LocalDate.now());

            cvRepository.save(cv);

            Candidature saved = candidatureService.postuler(finalJobOfferId, candidat, cv);

            Map<String, Object> successResponse = new HashMap<>();
            successResponse.put("id", saved.getId());
            successResponse.put("status", saved.getStatus().name());
            successResponse.put("message", "Application submitted successfully");

            return ResponseEntity.status(201).body(successResponse);

        } catch (Throwable t) {
            logger.error("CRITICAL ERROR during application processing: ", t);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Internal error: " + t.getMessage());
            error.put("type", t.getClass().getSimpleName());
            return ResponseEntity.status(500).body(error);
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
            cv.setFilePath(fileName);
            cv.setFileType(file.getContentType());
            cv.setFileSize(file.getSize());
            cv.setUploadDate(LocalDate.now());

            logger.info("Saving CV metadata...");
            cvRepository.save(cv);

            candidat.setCv(cv);

            try {
                logger.info("Attempting CV analysis via Python service...");
                cvAnalysisService.analyzeProfile(candidat, cv);
            } catch (Exception analysisEx) {
                logger.warn("CV Analysis failed but upload will proceed: {}", analysisEx.getMessage());
                // Non-blocking: we continue even if analysis fails
            }

            logger.info("Saving updated candidate profile with CV...");
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
