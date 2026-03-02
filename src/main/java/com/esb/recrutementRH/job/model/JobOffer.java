package com.esb.recrutementRH.job.model;

import com.esb.recrutementRH.candidature.model.Candidature;
import com.esb.recrutementRH.job.model.JobOfferLike;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
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

    public JobOffer() {
    }

    @Column(columnDefinition = "TEXT")
    private String title; // Intitulé du poste

    @Column(columnDefinition = "TEXT")
    private String description; // Description

    @Column(columnDefinition = "TEXT")
    private String location; // Localisation

    @ElementCollection(fetch = FetchType.EAGER)
    private Set<String> requiredSkills = new HashSet<>(); // Compétences demandées

    private String educationLevel; // Niveau d’études requis
    private Integer experienceYears; // Années d’expérience requises

    @ElementCollection(fetch = FetchType.EAGER)
    private Set<String> experienceFields = new HashSet<>(); // Domaines d’expérience

    @Enumerated(EnumType.STRING)
    private JobStatus status = JobStatus.PUBLIEE; // Statut par défaut

    private LocalDate publicationDate = LocalDate.now();
    private LocalDate expirationDate;
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "recruiter_id", insertable = false, updatable = false)
    private com.esb.recrutementRH.user.model.Recruteur recruteur;

    @Column(name = "recruiter_id")
    private Long recruiterId; // Id du recruteur

    @Column(columnDefinition = "TEXT")
    private String imageUrl; // URL de l'image de l'offre

    @OneToMany(mappedBy = "jobOffer", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<Candidature> candidatures = new ArrayList<>();

    @OneToMany(mappedBy = "jobOffer", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<JobOfferLike> likes = new ArrayList<>();

    // ===== Getters & Setters =====
    public com.esb.recrutementRH.user.model.Recruteur getRecruteur() {
        return recruteur;
    }

    public void setRecruteur(com.esb.recrutementRH.user.model.Recruteur recruteur) {
        this.recruteur = recruteur;
    }

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

    public LocalDate getExpirationDate() {
        return expirationDate;
    }

    public void setExpirationDate(LocalDate expirationDate) {
        this.expirationDate = expirationDate;
    }

    public List<Candidature> getCandidatures() {
        return candidatures;
    }

    public void setCandidatures(List<Candidature> candidatures) {
        this.candidatures = candidatures;
    }

    public JobStatus getStatus() {
        return status;
    }

    public void setStatus(JobStatus status) {
        this.status = status;
    }

    public List<JobOfferLike> getLikes() {
        return likes;
    }

    public void setLikes(List<JobOfferLike> likes) {
        this.likes = likes;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    @JsonProperty("nombreCandidatures")
    public int getNombreCandidatures() {
        return candidatures != null ? candidatures.size() : 0;
    }

    @PrePersist
    public void prePersist() {
        if (publicationDate == null)
            publicationDate = LocalDate.now();
        if (expirationDate == null) {
            expirationDate = publicationDate.plusDays(30);
        }
    }
}
