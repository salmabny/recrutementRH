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

    // Récupérer toutes les candidatures d'un candidat
    @EntityGraph(attributePaths = { "jobOffer", "cv" })
    List<Candidature> findByCandidat_Id(Long candidatId);

    // Vérifier si un candidat a déjà postulé à une offre
    boolean existsByJobOfferIdAndCandidatId(Long jobOfferId, Long candidatId);

    // Récupérer toutes les candidatures pour une offre
    List<Candidature> findByJobOfferId(Long jobOfferId);
}
