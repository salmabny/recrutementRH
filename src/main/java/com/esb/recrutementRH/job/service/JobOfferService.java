package com.esb.recrutementRH.job.service;

import com.esb.recrutementRH.job.model.JobOffer;
import com.esb.recrutementRH.job.repository.JobOfferRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class JobOfferService {

    @Autowired
    private JobOfferRepository jobOfferRepository;

    // Créer / Mettre à jour une offre
    public JobOffer saveJobOffer(JobOffer jobOffer) {
        return jobOfferRepository.save(jobOffer);
    }

    // Mettre à jour une offre existante (préserve candidatures, likes, etc.)
    @Transactional
    public Optional<JobOffer> updateJobOffer(Long id, JobOffer incoming) {
        return jobOfferRepository.findById(id).map(existing -> {
            existing.setTitle(incoming.getTitle());
            existing.setDescription(incoming.getDescription());
            existing.setLocation(incoming.getLocation());
            existing.setEducationLevel(incoming.getEducationLevel());
            existing.setExperienceYears(incoming.getExperienceYears());
            existing.setImageUrl(incoming.getImageUrl());
            existing.setCategory(incoming.getCategory());

            if (incoming.getStatus() != null) {
                existing.setStatus(incoming.getStatus());
            }

            if (incoming.getRequiredSkills() != null) {
                existing.getRequiredSkills().clear();
                existing.getRequiredSkills().addAll(incoming.getRequiredSkills());
            }
            if (incoming.getExperienceFields() != null) {
                existing.getExperienceFields().clear();
                existing.getExperienceFields().addAll(incoming.getExperienceFields());
            }

            // No need to call save — entity is managed within @Transactional
            return existing;
        });
    }

    // Obtenir toutes les offres
    public List<JobOffer> getAllOffers() {
        return jobOfferRepository.findAll();
    }

    // Obtenir une offre par ID
    public Optional<JobOffer> getOfferById(Long id) {
        return jobOfferRepository.findById(id);
    }

    // Obtenir les offres d’un recruteur
    public List<JobOffer> getOffersByRecruiterId(Long recruiterId) {
        return jobOfferRepository.findByRecruiterId(recruiterId);
    }

    // Supprimer une offre
    public void deleteOffer(Long id) {
        jobOfferRepository.deleteById(id);
    }
}
