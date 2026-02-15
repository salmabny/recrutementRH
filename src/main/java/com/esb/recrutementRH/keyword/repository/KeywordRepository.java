package com.esb.recrutementRH.keyword.repository;

import com.esb.recrutementRH.keyword.model.Keyword;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface KeywordRepository extends JpaRepository<Keyword, Long> {
    List<Keyword> findByType(String type);
    List<Keyword> findByValueContainingIgnoreCase(String value);
}
