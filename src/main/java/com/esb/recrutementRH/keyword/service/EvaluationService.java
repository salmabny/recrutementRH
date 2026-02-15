package com.esb.recrutementRH.keyword.service;

import com.esb.recrutementRH.keyword.model.Keyword;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class EvaluationService {

    // Calcule le score d'un CV par rapport à une offre
    public int calculateScore(List<String> cvKeywords, List<String> offerKeywords, List<Keyword> keywordMasterList) {
        // Filtrer les mots-clés communs entre CV et offre
        List<String> common = cvKeywords.stream()
                .filter(offerKeywords::contains)
                .collect(Collectors.toList());

        // Somme des points pour chaque mot-clé correspondant
        int score = 0;
        Map<String, Integer> pointsMap = keywordMasterList.stream()
                .collect(Collectors.toMap(Keyword::getValue, Keyword::getPoints));

        for (String k : common) {
            score += pointsMap.getOrDefault(k, 0);
        }
        return score;
    }
}
