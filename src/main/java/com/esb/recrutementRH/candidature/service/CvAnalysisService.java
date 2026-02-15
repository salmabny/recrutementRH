package com.esb.recrutementRH.candidature.service;

import com.esb.recrutementRH.candidature.model.Candidature;
import com.esb.recrutementRH.job.model.JobOffer;
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

        String cvFilePathRaw = (candidature.getCv() != null) ? candidature.getCv().getFilePath() : null;
        String cvFilePath = null;
        if (cvFilePathRaw != null) {
            try {
                cvFilePath = java.nio.file.Paths.get(cvFilePathRaw).toAbsolutePath().toString();
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

                // Formattage du résultat d'analyse
                StringBuilder formattedResult = new StringBuilder();

                // 1. Détail par critère (AVANT le score total)
                if (result.containsKey("skill_breakdown")) {
                    Map<String, Object> breakdown = (Map<String, Object>) result.get("skill_breakdown");
                    if (breakdown != null && !breakdown.isEmpty()) {
                        formattedResult.append("Compatibilité par critère :\n");
                        breakdown.forEach((skill, score) -> {
                            double s = Double.valueOf(score.toString());
                            formattedResult.append("- ").append(skill).append(" : ").append(Math.round(s * 100))
                                    .append("%\n");
                        });
                        formattedResult.append("\n");
                    }
                }

                // 2. Score Total
                formattedResult.append("SCORE TOTAL : ").append(result.getOrDefault("score_percent", "0"))
                        .append("%\n\n");

                formattedResult.append("Compétences : ")
                        .append(result.getOrDefault("competences", "Pas de competences detectees")).append("\n");
                formattedResult.append("Diplômes : ")
                        .append(result.getOrDefault("diplomes", "Pas de diplomes detectes")).append("\n");
                formattedResult.append("Expériences : ")
                        .append(result.getOrDefault("experiences", "Pas d'experiences detectees")).append("\n");

                candidature.setAnalysisResult(formattedResult.toString());
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
}
