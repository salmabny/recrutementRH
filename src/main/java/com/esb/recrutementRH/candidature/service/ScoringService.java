package com.esb.recrutementRH.candidature.service;

import com.esb.recrutementRH.candidature.model.Candidature;
import org.springframework.stereotype.Service;
import java.io.BufferedReader;
import java.io.InputStreamReader;

@Service
public class ScoringService {

    // Appelle le script Python pour calculer le score
    public int calculateScore(String cvPath, String offerText) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(
            "python", "src/main/python/scoring.py", cvPath, offerText
        );
        Process process = pb.start();

        BufferedReader reader = new BufferedReader(
            new InputStreamReader(process.getInputStream())
        );

        String line = reader.readLine(); // récupère le score depuis Python
        process.waitFor();

        return Integer.parseInt(line);
    }

    // Met à jour la candidature avec le score
    public void updateCandidatureScore(Candidature candidature, Double score) {
        candidature.setScore(score);
    }
}
