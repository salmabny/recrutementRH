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
    public ResponseEntity<?> createOffer(@RequestBody JobOffer jobOffer) {
        try {
            logger.info("Creating job offer: {}", jobOffer.getTitle());
            JobOffer savedOffer = jobOfferService.saveJobOffer(jobOffer);
            return ResponseEntity.status(201).body(savedOffer);
        } catch (Exception e) {
            logger.error("Error creating job offer: ", e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Internal error creating offer: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    // PUT update offer — delegates to @Transactional service method
    @PutMapping("/{id}")
    public ResponseEntity<?> updateOffer(@PathVariable Long id, @RequestBody JobOffer incoming) {
        try {
            return jobOfferService.updateJobOffer(id, incoming)
                    .map(updated -> ResponseEntity.ok((Object) updated))
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            logger.error("Error updating job offer {}: ", id, e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Error updating offer: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
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

    @PostMapping("/upload-image")
    public ResponseEntity<?> uploadImage(@RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        try {
            // Reusing the storage logic or similar
            String originalFileName = org.springframework.util.StringUtils.cleanPath(file.getOriginalFilename());
            String extension = originalFileName.substring(originalFileName.lastIndexOf(".")).toLowerCase();
            String newFileName = java.util.UUID.randomUUID().toString() + extension;

            java.nio.file.Path path = java.nio.file.Paths.get("uploads/images").resolve(newFileName);
            java.nio.file.Files.createDirectories(path.getParent());
            java.nio.file.Files.copy(file.getInputStream(), path, java.nio.file.StandardCopyOption.REPLACE_EXISTING);

            String backendHostPrefix = "http://localhost:8081"; // Define your backend host prefix
            String fileUrl = backendHostPrefix + "/api/job-offers/images/" + newFileName;
            return ResponseEntity.ok(Map.of("imageUrl", fileUrl));
        } catch (Exception e) {
            logger.error("Error uploading image: ", e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to upload image: " + e.getMessage()));
        }
    }

    @GetMapping("/images/{filename:.+}")
    public ResponseEntity<org.springframework.core.io.Resource> serveImage(@PathVariable String filename) {
        try {
            java.nio.file.Path file = java.nio.file.Paths.get("uploads/images").resolve(filename);
            org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(file.toUri());

            if (resource.exists() && resource.isReadable()) {
                String contentType = "image/jpeg";
                if (filename.toLowerCase().endsWith(".png"))
                    contentType = "image/png";
                else if (filename.toLowerCase().endsWith(".gif"))
                    contentType = "image/gif";

                return ResponseEntity.ok()
                        .contentType(org.springframework.http.MediaType.parseMediaType(contentType))
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }
}
