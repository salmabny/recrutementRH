package com.esb.recrutementRH.keyword.service;

import com.esb.recrutementRH.keyword.model.Keyword;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ExtractionService {

    // Méthode pour extraire les mots clés depuis un texte
    public List<String> extractKeywordsFromText(String text, List<Keyword> keywords) {
        if (text == null) return Collections.emptyList();

        String normalized = text.toLowerCase();
        List<String> matched = new ArrayList<>();

        for (Keyword k : keywords) {
            if (normalized.contains(k.getValue().toLowerCase())) {
                matched.add(k.getValue());
            }
        }
        return matched;
    }

    // Exemple : extraction depuis CV et offre
    public List<String> extractKeywordsFromCV(String cvText, List<Keyword> keywords) {
        return extractKeywordsFromText(cvText, keywords);
    }

    public List<String> extractKeywordsFromJobOffer(String offerText, List<Keyword> keywords) {
        return extractKeywordsFromText(offerText, keywords);
    }
}
