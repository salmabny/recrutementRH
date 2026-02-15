package com.esb.recrutementRH.keyword.controller;

import com.esb.recrutementRH.keyword.model.Keyword;
import com.esb.recrutementRH.keyword.service.KeywordService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/keywords")
public class KeywordController {

    private final KeywordService keywordService;

    public KeywordController(KeywordService keywordService) {
        this.keywordService = keywordService;
    }

    // ✅ Ajouter un mot-clé
    @PostMapping
    public Keyword addKeyword(@RequestBody Keyword keyword) {
        return keywordService.addKeyword(keyword);
    }

    // ✅ Lister tous les mots-clés
    @GetMapping
    public List<Keyword> getAllKeywords() {
        return keywordService.getAllKeywords();
    }

    // ✅ Lister les mots-clés par type
    @GetMapping("/type/{type}")
    public List<Keyword> getKeywordsByType(@PathVariable String type) {
        return keywordService.getKeywordsByType(type);
    }

    // ✅ Supprimer un mot-clé
    @DeleteMapping("/{id}")
    public String deleteKeyword(@PathVariable Long id) {
        keywordService.deleteKeyword(id);
        return "Mot-clé supprimé avec succès";
    }
}
