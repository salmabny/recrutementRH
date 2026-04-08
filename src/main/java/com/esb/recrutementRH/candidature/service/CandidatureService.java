package com.esb.recrutementRH.candidature.service;

import com.esb.recrutementRH.candidature.model.*;
import com.esb.recrutementRH.candidature.repository.*;
import com.esb.recrutementRH.job.repository.JobOfferRepository;
import com.esb.recrutementRH.user.model.Role;
import com.esb.recrutementRH.user.model.User;
import com.esb.recrutementRH.user.repository.UserRepository;

import com.esb.recrutementRH.user.service.EmailService;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class CandidatureService {

    private final CandidatureRepository candidatureRepository;
    private final JobOfferRepository jobOfferRepository;
    private final UserRepository userRepository;
    private final CvAnalysisService cvAnalysisService;
    private final EmailService emailService;

    public CandidatureService(CandidatureRepository candidatureRepository,
            JobOfferRepository jobOfferRepository,
            UserRepository userRepository,
            CvAnalysisService cvAnalysisService,
            EmailService emailService) {
        this.candidatureRepository = candidatureRepository;
        this.jobOfferRepository = jobOfferRepository;
        this.userRepository = userRepository;
        this.cvAnalysisService = cvAnalysisService;
        this.emailService = emailService;
    }

    public Candidature postuler(Long jobOfferId, User candidat, CV cv) {

        // Fetch real user from DB
        User realCandidat = userRepository.findById(candidat.getId())
                .orElseThrow(() -> new RuntimeException("Candidat non trouvé"));

        if (!realCandidat.getRole().equals(Role.CANDIDAT)) {
            // throw new RuntimeException("Seul un candidat peut postuler");
        }

        Candidature candidature = new Candidature();
        candidature.setDateCandidature(LocalDateTime.now());
        candidature.setLastStatusUpdate(LocalDateTime.now());
        candidature.setStatus(CandidatureStatus.SOUMISE);
        candidature.setJobOffer(jobOfferRepository.findById(jobOfferId).orElseThrow());
        candidature.setCandidat(realCandidat); // Use fetched user
        candidature.setCv(cv);

        // Analyse du CV via le microservice Python (optionnel/non-bloquant)
        try {
            cvAnalysisService.analyzeCandidature(candidature);
        } catch (Exception e) {
            System.err.println("[CandidatureService] Erreur analyse CV : " + e.getMessage());
            candidature.setAnalysisResult("Analyse indisponible momentanément.");
        }

        return candidatureRepository.save(candidature);
    }

    public java.util.List<Candidature> getCandidaturesByRecruiter(Long recruiterId) {
        return candidatureRepository.findByJobOffer_RecruiterId(recruiterId);
    }

    public Candidature updateStatus(Long id, CandidatureStatus status) {
        Candidature candidature = candidatureRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Candidature non trouvée"));
        candidature.setStatus(status);
        candidature.setLastStatusUpdate(LocalDateTime.now());
        Candidature saved = candidatureRepository.save(candidature);

        // Envoyer une notification par email au candidat
        try {
            if (candidature.getCandidat() != null && candidature.getJobOffer() != null) {
                emailService.sendCandidatureStatusUpdateEmail(
                        candidature.getCandidat().getEmail(),
                        candidature.getCandidat().getPrenom(),
                        candidature.getJobOffer().getTitle(),
                        status.name());
            }
        } catch (Exception e) {
            System.err.println(
                    "[CandidatureService] Erreur lors de l'envoi de l'email de notification : " + e.getMessage());
        }

        return saved;
    }
}
