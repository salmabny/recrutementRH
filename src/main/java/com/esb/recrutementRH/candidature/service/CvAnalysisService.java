package com.esb.recrutementRH.candidature.service;

import com.esb.recrutementRH.candidature.model.Candidature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
public class CvAnalysisService {

    private static final Logger logger = LoggerFactory.getLogger(CvAnalysisService.class);
    private final String PYTHON_API_URL = "http://localhost:5000/analyze";

    public void analyzeCandidature(Candidature candidature) {
        if (candidature.getCv() == null || candidature.getJobOffer() == null) {
            return;
        }

        String cvFilePathRaw = (candidature.getCv() != null) ? candidature.getCv().getFileUrl() : null;
        String cvFilePath = null;
        if (cvFilePathRaw != null) {
            try {
                // If the path is just a filename, we need to prepend the upload directory
                java.nio.file.Path p = java.nio.file.Paths.get(cvFilePathRaw);
                if (!p.isAbsolute()) {
                    p = java.nio.file.Paths.get("uploads/cv").resolve(cvFilePathRaw);
                }
                cvFilePath = p.toAbsolutePath().toString();
            } catch (Exception e) {
                cvFilePath = cvFilePathRaw;
            }
        }

        StringBuilder jobDescBuilder = new StringBuilder();
        if (candidature.getJobOffer().getTitle() != null) {
            jobDescBuilder.append(candidature.getJobOffer().getTitle()).append(" ");
        }
        if (candidature.getJobOffer().getDescription() != null) {
            jobDescBuilder.append(candidature.getJobOffer().getDescription());
        }

        if (candidature.getJobOffer().getRequiredSkills() != null) {
            jobDescBuilder.append(" ").append(String.join(" ", candidature.getJobOffer().getRequiredSkills()));
        }

        String jobDescription = jobDescBuilder.toString().trim();

        System.out.println("Initiating CV Analysis...");
        System.out.println("- CV File Path: " + cvFilePath);
        System.out.println("- Job Description Length: " + jobDescription.length());

        try {
            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(5000);
            factory.setReadTimeout(15000); // 15 seconds for analysis

            RestTemplate restTemplate = new RestTemplate(factory);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("file_path", cvFilePath);
            requestBody.put("job_description", jobDescription);
            requestBody.put("required_skills", candidature.getJobOffer().getRequiredSkills());
            requestBody.put("education_level", candidature.getJobOffer().getEducationLevel());
            requestBody.put("experience_years", candidature.getJobOffer().getExperienceYears());

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            logger.info("Sending request to Python API: {} with file: {}", PYTHON_API_URL, cvFilePath);
            ResponseEntity<Map> response = restTemplate.postForEntity(PYTHON_API_URL, request, Map.class);

            if (response.getBody() != null) {
                Map<String, Object> result = response.getBody();
                logger.info("Analysis received from Python: {}", result);

                if (result.containsKey("error")) {
                    logger.warn("Python API returned internal error: {}", result.get("error"));
                    candidature.setScore(0.0);
                    candidature.setAnalysisResult("Analyse partielle : " + result.get("error"));
                    return;
                }

                // Extraction du score en %
                if (result.containsKey("score_percent")) {
                    candidature.setScore(Double.valueOf(result.get("score_percent").toString()));
                }

                if (result.containsKey("full_text") && candidature.getCv() != null) {
                    candidature.getCv().setRawText(result.get("full_text").toString());
                }

                // Extraction des scores détaillés (points)
                if (result.containsKey("skills_points")) {
                    candidature.setSkillsScore(Double.valueOf(result.get("skills_points").toString()));
                }
                if (result.containsKey("education_points")) {
                    candidature.setEducationScore(Double.valueOf(result.get("education_points").toString()));
                }
                if (result.containsKey("experience_points")) {
                    candidature.setExperienceScore(Double.valueOf(result.get("experience_points").toString()));
                }

                // Sauvegarde des compétences catégorisées
                if (result.containsKey("categorizedSkills")) {
                    try {
                        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                        String json = mapper.writeValueAsString(result.get("categorizedSkills"));
                        candidature.setCategorizedSkills(json);
                    } catch (Exception e) {
                        logger.error("Error serializing categorizedSkills", e);
                    }
                }

                // Utilisation du rapport textuel déjà formaté par Python (Match % + Points)
                if (result.containsKey("analysisResult")) {
                    candidature.setAnalysisResult(result.get("analysisResult").toString());
                } else {
                    // Fallback si le champ est absent
                    candidature.setAnalysisResult(
                            "Analyse terminée. Score : " + result.getOrDefault("score_percent", "0") + "%");
                }
            } else {
                logger.warn("Python API returned empty body");
                candidature.setAnalysisResult("Erreur : Réponse vide du service d'analyse");
            }

        } catch (org.springframework.web.client.HttpClientErrorException
                | org.springframework.web.client.HttpServerErrorException e) {
            logger.error("HTTP Error from Python API: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            candidature.setAnalysisResult("Erreur service analyse (HTTP " + e.getStatusCode() + ")");
        } catch (org.springframework.web.client.ResourceAccessException e) {
            logger.error("Could not connect to Python API: {}", e.getMessage());
            candidature.setAnalysisResult("Erreur : Service d'analyse indisponible");
        } catch (Exception e) {
            logger.error("Unexpected error during CV Analysis", e);
            candidature.setAnalysisResult("Erreur inattendue : " + e.getMessage());
        }
    }

    public void analyzeProfile(com.esb.recrutementRH.user.model.Candidat candidat,
            com.esb.recrutementRH.candidature.model.CV cv) {
        if (cv == null)
            return;

        String cvFilePath = null;
        try {
            java.nio.file.Path p = java.nio.file.Paths.get(cv.getFileUrl());
            if (!p.isAbsolute()) {
                p = java.nio.file.Paths.get("uploads/cv").resolve(cv.getFileUrl());
            }
            cvFilePath = p.toAbsolutePath().toString();
        } catch (Exception e) {
            cvFilePath = cv.getFileUrl();
        }

        // Generic baseline for a technical profile
        String genericJobDescription = "Profil technique, développeur informatique, compétences en programmation, outils de développement, expérience professionnelle et formation académique.";

        try {
            RestTemplate restTemplate = new RestTemplate();
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("file_path", cvFilePath);
            requestBody.put("job_description", genericJobDescription);
            requestBody.put("required_skills", java.util.List.of("Java", "Python", "JavaScript", "SQL", "Git"));

            org.springframework.http.HttpEntity<Map<String, Object>> request = new org.springframework.http.HttpEntity<>(
                    requestBody, headers);
            org.springframework.http.ResponseEntity<Map> response = restTemplate.postForEntity(PYTHON_API_URL, request,
                    Map.class);

            if (response.getBody() != null) {
                Map<String, Object> result = response.getBody();

                if (result.containsKey("score_percent")) {
                    candidat.setProfileScore(Double.valueOf(result.get("score_percent").toString()));
                }
                if (result.containsKey("skills_points")) {
                    candidat.setProfileSkillsScore(Double.valueOf(result.get("skills_points").toString()));
                }
                if (result.containsKey("education_points")) {
                    candidat.setProfileEducationScore(Double.valueOf(result.get("education_points").toString()));
                }
                if (result.containsKey("experience_points")) {
                    candidat.setProfileExperienceScore(Double.valueOf(result.get("experience_points").toString()));
                }

                if (result.containsKey("full_text")) {
                    cv.setRawText(result.get("full_text").toString());
                }

                // --- Extraction of raw data for profile persistence ---
                if (result.containsKey("detected_experience")) {
                    try {
                        candidat.setAnneesExperience(Integer.valueOf(result.get("detected_experience").toString()));
                    } catch (Exception e) {
                        logger.warn("Could not parse detected_experience: {}", result.get("detected_experience"));
                    }
                }

                if (result.containsKey("detected_edu_level")) {
                    try {
                        int level = Integer.parseInt(result.get("detected_edu_level").toString());
                        if (level >= 0) {
                            candidat.setNiveauEtudes("Bac+" + level);
                        } else if (level == 0) {
                            candidat.setNiveauEtudes("Bac");
                        }
                    } catch (Exception e) {
                        logger.warn("Could not parse detected_edu_level");
                    }
                }

                if (result.containsKey("categorizedSkills")) {
                    try {
                        Map<String, Object> cats = (Map<String, Object>) result.get("categorizedSkills");
                        if (cats.containsKey("Compétences")) {
                            java.util.List<String> skills = (java.util.List<String>) cats.get("Compétences");
                            if (skills != null && !skills.isEmpty()) {
                                candidat.setCompetences(new java.util.ArrayList<>(skills));
                            }
                        }
                    } catch (Exception e) {
                        logger.warn("Could not parse categorizedSkills for profile");
                    }
                }

                // Utilisation du rapport textuel déjà formaté (Match % + Points)
                if (result.containsKey("analysisResult")) {
                    candidat.setProfileAnalysisResult(result.get("analysisResult").toString());
                } else {
                    StringBuilder summary = new StringBuilder("Synthèse du profil :\n");
                    summary.append("Score Global : ").append(result.getOrDefault("score_percent", "0")).append("%\n");
                    candidat.setProfileAnalysisResult(summary.toString());
                }
            }
        } catch (Exception e) {
            logger.error("Error during profile analysis: ", e);
            candidat.setProfileAnalysisResult("Erreur lors de l'analyse du profil : " + e.getMessage());
        }
    }

    public Double calculateSpecificScore(com.esb.recrutementRH.user.model.Candidat candidat,
            com.esb.recrutementRH.job.model.JobOffer jobOffer) {
        if (candidat.getCv() == null || jobOffer == null)
            return null;

        String cvFilePathRaw = candidat.getCv().getFileUrl();
        String cvFilePath = null;
        if (cvFilePathRaw != null) {
            try {
                java.nio.file.Path p = java.nio.file.Paths.get(cvFilePathRaw);
                if (!p.isAbsolute()) {
                    p = java.nio.file.Paths.get("uploads/cv").resolve(cvFilePathRaw);
                }
                cvFilePath = p.toAbsolutePath().toString();
            } catch (Exception e) {
                cvFilePath = cvFilePathRaw;
            }
        }

        StringBuilder jobDescBuilder = new StringBuilder();
        if (jobOffer.getTitle() != null)
            jobDescBuilder.append(jobOffer.getTitle()).append(" ");
        if (jobOffer.getDescription() != null)
            jobDescBuilder.append(jobOffer.getDescription());
        if (jobOffer.getRequiredSkills() != null) {
            jobDescBuilder.append(" ").append(String.join(" ", jobOffer.getRequiredSkills()));
        }

        String jobDescription = jobDescBuilder.toString().trim();

        try {
            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(2000); // Faster for bulk
            factory.setReadTimeout(5000);

            RestTemplate restTemplate = new RestTemplate(factory);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("file_path", cvFilePath);
            requestBody.put("job_description", jobDescription);
            requestBody.put("required_skills", jobOffer.getRequiredSkills());
            requestBody.put("education_level", jobOffer.getEducationLevel());
            requestBody.put("experience_years", jobOffer.getExperienceYears());

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            @SuppressWarnings("unchecked")
            ResponseEntity<Map<String, Object>> response = (ResponseEntity<Map<String, Object>>) (ResponseEntity<?>) restTemplate
                    .postForEntity(PYTHON_API_URL, request, Map.class);

            if (response.getBody() != null && response.getBody().containsKey("score_percent")) {
                return Double.valueOf(response.getBody().get("score_percent").toString());
            }
        } catch (Exception e) {
            logger.error("Error calculating bulk score: {}", e.getMessage());
        }
        return null;
    }

    @jakarta.transaction.Transactional
    public void recalculateAllDashboardScores(com.esb.recrutementRH.user.model.Candidat candidat,
            java.util.List<com.esb.recrutementRH.job.model.JobOffer> offers) {
        if (candidat.getCv() == null)
            return;

        logger.info("Bulk recalculating scores for candidate {} ({} offers)", candidat.getId(), offers.size());
        candidat.getJobScores().clear(); // Fresh calculation

        // Limit to most recent 20 for performance in this demo
        int count = 0;
        for (com.esb.recrutementRH.job.model.JobOffer offer : offers) {
            if (count++ >= 20)
                break;
            Double score = calculateSpecificScore(candidat, offer);
            if (score != null) {
                candidat.updateJobScore(offer.getId(), score);
            }
        }
    }
}
