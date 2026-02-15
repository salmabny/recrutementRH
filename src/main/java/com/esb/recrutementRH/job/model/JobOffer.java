package com.esb.recrutementRH.job.model;

import com.esb.recrutementRH.candidature.model.Candidature;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "job_offer", schema = "recruitment")
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class JobOffer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title; // Intitulé du poste
    private String description; // Description
    private String location; // Localisation

    @ElementCollection(fetch = FetchType.EAGER)
    private Set<String> requiredSkills = new HashSet<>(); // Compétences demandées

    private String educationLevel; // Niveau d’études requis
    private Integer experienceYears; // Années d’expérience requises

    @ElementCollection(fetch = FetchType.EAGER)
    private Set<String> experienceFields = new HashSet<>(); // Domaines d’expérience

    private LocalDate publicationDate = LocalDate.now();
    private Long recruiterId; // Id du recruteur

    @OneToMany(mappedBy = "jobOffer", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<Candidature> candidatures = new ArrayList<>();

    // ===== Getters & Setters =====
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public Set<String> getRequiredSkills() {
        return requiredSkills;
    }

    public void setRequiredSkills(Set<String> requiredSkills) {
        this.requiredSkills = requiredSkills;
    }

    public String getEducationLevel() {
        return educationLevel;
    }

    public void setEducationLevel(String educationLevel) {
        this.educationLevel = educationLevel;
    }

    public Integer getExperienceYears() {
        return experienceYears;
    }

    public void setExperienceYears(Integer experienceYears) {
        this.experienceYears = experienceYears;
    }

    public Set<String> getExperienceFields() {
        return experienceFields;
    }

    public void setExperienceFields(Set<String> experienceFields) {
        this.experienceFields = experienceFields;
    }

    public LocalDate getPublicationDate() {
        return publicationDate;
    }

    public void setPublicationDate(LocalDate publicationDate) {
        this.publicationDate = publicationDate;
    }

    public Long getRecruiterId() {
        return recruiterId;
    }

    public void setRecruiterId(Long recruiterId) {
        this.recruiterId = recruiterId;
    }

    public List<Candidature> getCandidatures() {
        return candidatures;
    }

    public void setCandidatures(List<Candidature> candidatures) {
        this.candidatures = candidatures;
    }
}
