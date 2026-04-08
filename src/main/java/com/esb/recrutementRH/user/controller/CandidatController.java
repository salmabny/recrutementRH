package com.esb.recrutementRH.user.controller;

import com.esb.recrutementRH.user.model.Candidat;
import com.esb.recrutementRH.job.model.JobOffer;
import com.esb.recrutementRH.user.repository.UserRepository;
import com.esb.recrutementRH.job.repository.JobOfferRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/candidats")
public class CandidatController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JobOfferRepository jobOfferRepository;

    @GetMapping("/{candidatId}/score/{offreId}")
    @jakarta.transaction.Transactional
    public ResponseEntity<?> getCompatibilityScore(@PathVariable Long candidatId, @PathVariable Long offreId) {
        Candidat candidat = (Candidat) userRepository.findById(candidatId).orElse(null);
        JobOffer offer = jobOfferRepository.findById(offreId).orElse(null);

        if (candidat == null || offer == null) {
            return ResponseEntity.notFound().build();
        }

        System.out.println("[CandidatController] Calculating score for Candidate: " + candidatId + ", Offer: " + offreId
                + ", CV: " + (candidat.getCv() != null ? candidat.getCv().getFileName() : "NONE"));
        int score = calculateScore(candidat, offer);
        Map<String, Object> details = new HashMap<>();

        // Simuler des détails pour le dashboard
        details.put("skillsScore", score * 0.5);
        details.put("experienceScore", score * 0.3);
        details.put("educationScore", score * 0.2);

        Map<String, Object> result = new HashMap<>();
        result.put("score", score);
        result.put("details", details);

        return ResponseEntity.ok(result);
    }

    @GetMapping("/{candidatId}/offres-scores")
    @jakarta.transaction.Transactional
    public ResponseEntity<?> getAllCompatibilityScores(@PathVariable Long candidatId) {
        Candidat candidat = (Candidat) userRepository.findById(candidatId).orElse(null);
        if (candidat == null) {
            return ResponseEntity.notFound().build();
        }

        List<JobOffer> offers = jobOfferRepository.findAll();
        Map<Long, Integer> resultScores = new HashMap<>();

        // 1. Get cached scores from candidat (rounded to int)
        Map<Long, Double> cached = candidat.getJobScores();

        for (JobOffer offer : offers) {
            if (cached.containsKey(offer.getId())) {
                resultScores.put(offer.getId(), (int) Math.round(cached.get(offer.getId())));
            } else {
                // Fallback to legacy fast logic if not cached yet
                resultScores.put(offer.getId(), calculateScore(candidat, offer));
            }
        }

        return ResponseEntity.ok(resultScores);
    }

    private int calculateScore(Candidat candidat, JobOffer offer) {
        if (candidat.getCv() == null) {
            return -1; // Indicateur "Pas de CV"
        }

        List<String> requiredSkills = new ArrayList<>(offer.getRequiredSkills());
        int matchedSkills = 0;

        String fullCvText = (candidat.getCv() != null && candidat.getCv().getRawText() != null)
                ? candidat.getCv().getRawText().toLowerCase()
                : "";

        if (!requiredSkills.isEmpty()) {
            for (String req : requiredSkills) {
                if (req == null || req.isBlank())
                    continue;

                // Split composite skills like "Java / Spring" or "React or Angular"
                String[] alternatives = req.toLowerCase().split("\\s+ou\\s+|\\s+/\\s+|\\s+or\\s+");
                boolean foundAlternative = false;

                for (String alt : alternatives) {
                    String altClean = alt.trim();
                    if (altClean.isEmpty())
                        continue;

                    // 1. Check in full text (regex)
                    if (!fullCvText.isEmpty()) {
                        java.util.regex.Pattern p = java.util.regex.Pattern
                                .compile("\\b" + java.util.regex.Pattern.quote(altClean) + "\\b");
                        if (p.matcher(fullCvText).find()) {
                            foundAlternative = true;
                            break;
                        }
                    }

                    // 2. Check in categorized skills
                    if (!foundAlternative && candidat.getCompetences() != null) {
                        for (String cand : candidat.getCompetences()) {
                            String candClean = cand.trim().toLowerCase();
                            if (candClean.equals(altClean) || candClean.contains(altClean)) {
                                foundAlternative = true;
                                break;
                            }
                        }
                    }
                    if (foundAlternative)
                        break;
                }

                if (foundAlternative)
                    matchedSkills++;
            }
        }

        // 50% Skills
        double skillsRatio = requiredSkills.isEmpty() ? 1.0 : (double) matchedSkills / requiredSkills.size();

        // --- SYNCHRONIZED RELEVANCE GUARD ---
        // Match Python service threshold (0.15)
        double relevanceMultiplier = (skillsRatio < 0.15) ? 0.3 : 1.0;

        if (offer.getTitle() != null) {
            String title = offer.getTitle().toLowerCase();
            String[] techDomain = { "dev", "développeur", "informatique", "software", "ingénieur", "technologie", "it",
                    "code", "full stack", "backend", "frontend", "informaticien" };
            String[] financeDomain = { "comptable", "finance", "audit", "gestion", "comptabilité", "fiscalité",
                    "banque", "comptabilité", "compta" };

            boolean jobIsTech = java.util.Arrays.stream(techDomain).anyMatch(title::contains);
            boolean jobIsFin = java.util.Arrays.stream(financeDomain).anyMatch(title::contains);

            if (jobIsTech) {
                boolean cvIsTech = !fullCvText.isEmpty()
                        && java.util.Arrays.stream(techDomain).anyMatch(fullCvText::contains);
                if (!cvIsTech)
                    relevanceMultiplier *= 0.4;
            } else if (jobIsFin) {
                boolean cvIsFin = !fullCvText.isEmpty()
                        && java.util.Arrays.stream(financeDomain).anyMatch(fullCvText::contains);
                if (!cvIsFin)
                    relevanceMultiplier *= 0.4;
            }
        }

        double skillsScore = skillsRatio * 50;

        // 25% Experience
        int reqExp = offer.getExperienceYears() != null ? offer.getExperienceYears() : 0;
        if (reqExp == 0 && offer.getDescription() != null) {
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("(\\d+)\\s*ans?\\s*exp")
                    .matcher(offer.getDescription().toLowerCase());
            if (m.find())
                reqExp = Integer.parseInt(m.group(1));
        }

        int candExp = candidat.getAnneesExperience() != null ? candidat.getAnneesExperience() : 0;
        double expRatio;
        if (reqExp > 0) {
            expRatio = (candExp >= reqExp ? 1.0 : (double) candExp / reqExp);
        } else {
            // Check textual similarity for experience if no years specified
            double textSim = calculateTextRelevance(fullCvText, offer.getTitle() + " " + offer.getDescription());
            expRatio = 0.4 + (textSim * 0.4); // Max 0.8 if no structured requirement
        }
        double expScore = expRatio * 25;
        expScore *= relevanceMultiplier;

        // 25% Education
        int reqEdu = detectLevel(offer.getEducationLevel());
        if (reqEdu <= 0 && offer.getDescription() != null) {
            String desc = offer.getDescription().toLowerCase();
            if (desc.contains("bac+8") || desc.contains("doctorat"))
                reqEdu = 8;
            else if (desc.contains("bac+5") || desc.contains("master") || desc.contains("ingénieur"))
                reqEdu = 5;
            else if (desc.contains("bac+3") || desc.contains("licence"))
                reqEdu = 3;
        }

        int candEdu = detectLevel(candidat.getNiveauEtudes());
        double eduRatio;
        if (reqEdu > 0) {
            eduRatio = (candEdu >= reqEdu ? 1.0 : (candEdu >= 0 ? (double) candEdu / reqEdu : 0));
        } else {
            eduRatio = 0.6; // Default to 0.6 if absolutely no education hint
        }
        double eduScore = eduRatio * 25;
        eduScore *= relevanceMultiplier;

        int score = (int) Math.round(skillsScore + expScore + eduScore);

        // --- ADDED: RECENCY PENALTY ---
        double recencyMultiplier = calculateRecencyMultiplier(candidat);
        score = (int) Math.round(score * recencyMultiplier);

        return Math.min(score, 100);
    }

    private double calculateTextRelevance(String cvText, String jobText) {
        if (cvText == null || jobText == null || cvText.isEmpty() || jobText.isEmpty())
            return 0.0;
        cvText = cvText.toLowerCase();
        jobText = jobText.toLowerCase();

        String[] keywords = { "dev", "développeur", "backend", "frontend", "fullstack", "java", "python", "javascript",
                "react", "node", "sql", "git", "cloud", "aws", "docker", "spring" };
        int matches = 0;
        int totalFoundInJob = 0;

        for (String kw : keywords) {
            if (jobText.contains(kw)) {
                totalFoundInJob++;
                if (cvText.contains(kw)) {
                    matches++;
                }
            }
        }

        return totalFoundInJob == 0 ? 0.0 : (double) matches / totalFoundInJob;
    }

    private double calculateRecencyMultiplier(Candidat candidat) {
        int currentYear = java.time.LocalDate.now().getYear();
        int lastActivityYear = -1;

        // Check experiences
        if (candidat.getExperiences() != null) {
            for (com.esb.recrutementRH.user.model.Experience exp : candidat.getExperiences()) {
                if (exp.isEnCours()) {
                    return 1.0; // Currently active
                }
                if (exp.getDateFin() != null) {
                    lastActivityYear = Math.max(lastActivityYear, exp.getDateFin().getYear());
                }
            }
        }

        // Check formations
        if (candidat.getFormations() != null) {
            for (com.esb.recrutementRH.user.model.Formation form : candidat.getFormations()) {
                if (form.getAnneeFin() != null) {
                    lastActivityYear = Math.max(lastActivityYear, form.getAnneeFin());
                }
            }
        }

        if (lastActivityYear == -1)
            return 1.0; // No data, no penalty

        int diff = currentYear - lastActivityYear;
        if (diff < 3)
            return 1.0;
        if (diff <= 5)
            return 0.8; // Slight reduction
        return 0.5; // Strong reduction (> 5 years)
    }

    private int detectLevel(String levelStr) {
        if (levelStr == null)
            return -1;
        String s = levelStr.toLowerCase();

        if (s.contains("bac+8") || s.contains("doctorat") || s.contains("phd"))
            return 8;

        if (s.contains("bac+5") || s.contains("master") || s.contains("ingénieur") ||
                s.contains("m2") || s.contains("msc") || s.contains("dea"))
            return 5;

        if (s.contains("bac+4") || s.contains("maîtrise") || s.contains("m1"))
            return 4;

        if (s.contains("bac+3") || s.contains("licence") || s.contains("bachelor") || s.contains("l3"))
            return 3;

        if (s.contains("bac+2") || s.contains("bts") || s.contains("dut") || s.contains("deug"))
            return 2;

        if (s.contains("bac"))
            return 0;

        return -1;
    }
}
