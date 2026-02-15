package com.esb.recrutementRH.job.service;

import com.esb.recrutementRH.job.model.JobOffer;
import com.esb.recrutementRH.job.repository.JobOfferRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

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
