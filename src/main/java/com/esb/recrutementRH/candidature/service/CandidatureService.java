package com.esb.recrutementRH.candidature.service;

import com.esb.recrutementRH.candidature.model.*;
import com.esb.recrutementRH.candidature.repository.*;
import com.esb.recrutementRH.job.repository.JobOfferRepository;
import com.esb.recrutementRH.user.model.Role;
import com.esb.recrutementRH.user.model.User;
import com.esb.recrutementRH.user.repository.UserRepository;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class CandidatureService {

    private final CandidatureRepository candidatureRepository;
    private final CvRepository cvRepository;
    private final JobOfferRepository jobOfferRepository;
    private final UserRepository userRepository;
    private final CvAnalysisService cvAnalysisService;

    public CandidatureService(CandidatureRepository candidatureRepository,
            CvRepository cvRepository,
            JobOfferRepository jobOfferRepository,
            UserRepository userRepository,
            CvAnalysisService cvAnalysisService) {
        this.candidatureRepository = candidatureRepository;
        this.cvRepository = cvRepository;
        this.jobOfferRepository = jobOfferRepository;
        this.userRepository = userRepository;
        this.cvAnalysisService = cvAnalysisService;
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

        // Analyse du CV via le microservice Python
        cvAnalysisService.analyzeCandidature(candidature);

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
        return candidatureRepository.save(candidature);
    }
}
