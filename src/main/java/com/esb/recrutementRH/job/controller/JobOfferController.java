package com.esb.recrutementRH.job.controller;

import com.esb.recrutementRH.job.model.JobOffer;
import com.esb.recrutementRH.job.service.JobOfferService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/job-offers")
public class JobOfferController {

    private static final Logger logger = LoggerFactory.getLogger(JobOfferController.class);

    @Autowired
    private JobOfferService jobOfferService;

    // GET all offers
    @GetMapping
    public ResponseEntity<List<JobOffer>> getAllOffers() {
        List<JobOffer> offers = jobOfferService.getAllOffers();
        return ResponseEntity.ok(offers);
    }

    // GET offers by recruiter id
    @GetMapping("/list/{recruiterId}")
    public ResponseEntity<List<JobOffer>> getOffersByRecruiterId(@PathVariable Long recruiterId) {
        List<JobOffer> offers = jobOfferService.getOffersByRecruiterId(recruiterId);
        return ResponseEntity.ok(offers);
    }

    // GET offer by id
    @GetMapping("/{id}")
    public ResponseEntity<?> getOfferById(@PathVariable Long id) {
        try {
            return jobOfferService.getOfferById(id)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            logger.error("Error fetching job offer with id {}: ", id, e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Internal error: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    // POST create offer
    @PostMapping
    public ResponseEntity<JobOffer> createOffer(@RequestBody JobOffer jobOffer) {
        JobOffer savedOffer = jobOfferService.saveJobOffer(jobOffer);
        return ResponseEntity.status(201).body(savedOffer); // renvoie le JSON
    }

    // PUT update offer
    @PutMapping("/{id}")
    public ResponseEntity<JobOffer> updateOffer(@PathVariable Long id, @RequestBody JobOffer jobOffer) {
        return jobOfferService.getOfferById(id)
                .map(existingOffer -> {
                    jobOffer.setId(id);
                    JobOffer updatedOffer = jobOfferService.saveJobOffer(jobOffer);
                    return ResponseEntity.ok(updatedOffer);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // DELETE offer
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteOffer(@PathVariable Long id) {
        try {
            return jobOfferService.getOfferById(id)
                    .map(existingOffer -> {
                        jobOfferService.deleteOffer(id);
                        return ResponseEntity.noContent().build();
                    })
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            logger.error("Error deleting job offer with id {}: ", id, e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Internal error deleting offer: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
}
