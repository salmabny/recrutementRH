package com.esb.recrutementRH.candidature.repository;

import com.esb.recrutementRH.candidature.model.Candidature;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CandidatureRepository extends JpaRepository<Candidature, Long> {

    // Récupérer toutes les candidatures d'un recruteur
    @EntityGraph(attributePaths = { "candidat", "cv" })
    List<Candidature> findByJobOffer_RecruiterId(Long recruiterId);
}
