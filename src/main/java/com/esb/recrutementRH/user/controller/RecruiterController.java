package com.esb.recrutementRH.user.controller;

import com.esb.recrutementRH.job.repository.JobOfferRepository;
import com.esb.recrutementRH.candidature.repository.CandidatureRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/recruiter")
@CrossOrigin(origins = "http://localhost:4200")
public class RecruiterController {

    @Autowired
    private JobOfferRepository jobOfferRepository;

    @Autowired
    private CandidatureRepository candidatureRepository;

    @GetMapping("/{id}/stats")
    public ResponseEntity<Map<String, Object>> getStats(@PathVariable Long id) {
        long totalOffres = jobOfferRepository.findByRecruiterId(id).size();
        long candidaturesRecues = candidatureRepository.findByJobOffer_RecruiterId(id).size();

        return ResponseEntity.ok(Map.of(
                "totalOffres", totalOffres,
                "candidaturesRecues", candidaturesRecues,
                "offresActives", totalOffres // Simplification pour le moment
        ));
    }

    @GetMapping("/{id}/candidatures")
    public ResponseEntity<?> getRecentCandidatures(@PathVariable Long id) {
        return ResponseEntity.ok(candidatureRepository.findByJobOffer_RecruiterId(id));
    }

    @GetMapping("/{id}/offres")
    public ResponseEntity<?> getOffresByRecruiter(@PathVariable Long id) {
        return ResponseEntity.ok(jobOfferRepository.findByRecruiterId(id));
    }
}
