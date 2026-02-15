package com.esb.recrutementRH.keyword.service;

import com.esb.recrutementRH.keyword.model.Keyword;
import com.esb.recrutementRH.keyword.repository.KeywordRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class KeywordService {

    private final KeywordRepository keywordRepository;

    public KeywordService(KeywordRepository keywordRepository) {
        this.keywordRepository = keywordRepository;
    }

    public Keyword addKeyword(Keyword keyword) {
        return keywordRepository.save(keyword);
    }

    public List<Keyword> getAllKeywords() {
        return keywordRepository.findAll();
    }

    public List<Keyword> getKeywordsByType(String type) {
        return keywordRepository.findByType(type);
    }

    public void deleteKeyword(Long id) {
        keywordRepository.deleteById(id);
    }
}
