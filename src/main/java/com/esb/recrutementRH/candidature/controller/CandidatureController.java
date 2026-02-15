package com.esb.recrutementRH.candidature.controller;

import com.esb.recrutementRH.candidature.model.*;
import com.esb.recrutementRH.candidature.repository.CandidatureRepository;
import com.esb.recrutementRH.candidature.repository.CvRepository;
import com.esb.recrutementRH.candidature.service.CandidatureService;
import com.esb.recrutementRH.candidature.service.FileStorageService;
import com.esb.recrutementRH.job.repository.JobOfferRepository;
import com.esb.recrutementRH.user.model.Role;
import com.esb.recrutementRH.user.model.User;
import com.esb.recrutementRH.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.multipart.MultipartHttpServletRequest;
import java.util.Enumeration;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/candidatures")
public class CandidatureController {

    private static final Logger logger = LoggerFactory.getLogger(CandidatureController.class);

    private final CandidatureService candidatureService;
    private final FileStorageService fileStorageService;
    private final CvRepository cvRepository;
    private final CandidatureRepository candidatureRepository;
    private final UserRepository userRepository;
    private final JobOfferRepository jobOfferRepository;

    @Autowired
    public CandidatureController(
            CandidatureService candidatureService,
            FileStorageService fileStorageService,
            CvRepository cvRepository,
            CandidatureRepository candidatureRepository,
            UserRepository userRepository,
            JobOfferRepository jobOfferRepository) {
        this.candidatureService = candidatureService;
        this.fileStorageService = fileStorageService;
        this.cvRepository = cvRepository;
        this.candidatureRepository = candidatureRepository;
        this.userRepository = userRepository;
        this.jobOfferRepository = jobOfferRepository;
    }

    // ✅ Postuler à une offre
    @PostMapping("/postuler")
    public ResponseEntity<?> postuler(
            @RequestParam(required = false) Long jobOfferId,
            @RequestParam(required = false) Long candidatId,
            @RequestParam(required = false) MultipartFile cvFile,
            HttpServletRequest request) {

        logger.info("New application request received on /postuler");
        logger.info("Content-Type: {}", request.getContentType());

        // Log all standard parameters
        Enumeration<String> parameterNames = request.getParameterNames();
        while (parameterNames.hasMoreElements()) {
            String paramName = parameterNames.nextElement();
            logger.info("Standard Param: {} = {}", paramName, request.getParameter(paramName));
        }

        // Diagnostic for multipart
        if (request instanceof MultipartHttpServletRequest) {
            MultipartHttpServletRequest multi = (MultipartHttpServletRequest) request;
            multi.getFileMap()
                    .forEach((name, file) -> logger.info("Multipart File: {} ({} bytes)", name, file.getSize()));
            multi.getParameterMap().forEach((name, vals) -> logger.info("Multipart Param: {} = {}", name, vals[0]));
        }

        logger.info("- @RequestParam jobOfferId: {}", jobOfferId);
        logger.info("- @RequestParam candidatId: {}", candidatId);
        logger.info("- cvFile present: {}", (cvFile != null && !cvFile.isEmpty()));

        Long resolvedJobOfferId = jobOfferId;
        Long resolvedCandidatId = candidatId;

        // Proactive check for aliases if null
        if (resolvedJobOfferId == null) {
            String[] aliases = { "job_offer_id", "job_id", "jobId", "idOffre", "offreId", "id_offre" };
            for (String alias : aliases) {
                String val = request.getParameter(alias);
                if (val != null) {
                    try {
                        resolvedJobOfferId = Long.parseLong(val);
                        break;
                    } catch (Exception e) {
                    }
                }
            }
        }
        if (resolvedCandidatId == null) {
            String[] aliases = { "candidate_id", "candidateId", "id_candidat", "idCandidat" };
            for (String alias : aliases) {
                String val = request.getParameter(alias);
                if (val != null) {
                    try {
                        resolvedCandidatId = Long.parseLong(val);
                        break;
                    } catch (Exception e) {
                    }
                }
            }
        }

        final Long finalJobOfferId = resolvedJobOfferId;
        final Long finalCandidatId = resolvedCandidatId;

        if (finalJobOfferId == null || finalCandidatId == null || cvFile == null || cvFile.isEmpty()) {
            String missing = "";
            if (finalJobOfferId == null)
                missing += "jobOfferId ";
            if (finalCandidatId == null)
                missing += "candidatId ";
            if (cvFile == null || cvFile.isEmpty())
                missing += "cvFile ";

            logger.warn("Missing parameters: {}", missing);
            return ResponseEntity.status(400).body("Missing required parameters: " + missing.trim());
        }

        try {
            // 1️⃣ Vérifier candidat
            User candidat = userRepository.findById(finalCandidatId)
                    .orElseThrow(() -> new RuntimeException("Candidat non trouvé (" + finalCandidatId + ")"));

            // 2️⃣ Vérifier offre
            var jobOffer = jobOfferRepository.findById(finalJobOfferId)
                    .orElseThrow(() -> new RuntimeException("Offre non trouvée (" + finalJobOfferId + ")"));

            // 3️⃣ Vérifier fichier CV
            if (cvFile.isEmpty())
                return ResponseEntity.status(400).body("Fichier CV vide");

            if (!cvFile.getContentType().equals("application/pdf"))
                return ResponseEntity.status(400).body("Seul le format PDF est accepté");

            // 4️⃣ Stockage du CV
            String path = fileStorageService.store(cvFile);

            CV cv = new CV();
            cv.setFileName(cvFile.getOriginalFilename());
            cv.setFileType(cvFile.getContentType());
            cv.setFilePath(path);
            cv.setFileSize(cvFile.getSize());
            cv.setUploadDate(LocalDate.now());

            cvRepository.save(cv);

            // 5️⃣ Création candidature
            Candidature saved = candidatureService.postuler(finalJobOfferId, candidat, cv);

            logger.info("Application successful! Saved Id: {}", saved.getId());

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

    // ✅ Liste des candidatures pour un recruteur
    @GetMapping("/recruteur/{recruteurId}")
    public List<Candidature> getCandidaturesByRecruteur(@PathVariable Long recruteurId) {
        return candidatureRepository.findByJobOffer_RecruiterId(recruteurId);
    }
}
