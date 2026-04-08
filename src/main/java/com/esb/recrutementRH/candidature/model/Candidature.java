package com.esb.recrutementRH.candidature.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.esb.recrutementRH.job.model.JobOffer;
import com.esb.recrutementRH.user.model.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class Candidature {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDateTime dateCandidature;

    @Enumerated(EnumType.STRING)
    private CandidatureStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_offer_id")
    private JobOffer jobOffer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidat_id")
    private User candidat;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cv_id")
    private CV cv;

    private Double score;

    private Double skillsScore;
    private Double educationScore;
    private Double experienceScore;

    @Column(columnDefinition = "TEXT")
    private String analysisResult;

    @Column(columnDefinition = "TEXT")
    private String categorizedSkills;

    private LocalDateTime lastStatusUpdate;

    // ===== Getters & Setters =====

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public LocalDateTime getDateCandidature() {
        return dateCandidature;
    }

    public void setDateCandidature(LocalDateTime dateCandidature) {
        this.dateCandidature = dateCandidature;
    }

    public CandidatureStatus getStatus() {
        return status;
    }

    public void setStatus(CandidatureStatus status) {
        this.status = status;
    }

    public JobOffer getJobOffer() {
        return jobOffer;
    }

    public void setJobOffer(JobOffer jobOffer) {
        this.jobOffer = jobOffer;
    }

    public User getCandidat() {
        return candidat;
    }

    public void setCandidat(User candidat) {
        this.candidat = candidat;
    }

    public CV getCv() {
        return cv;
    }

    public void setCv(CV cv) {
        this.cv = cv;
    }

    public Double getScore() {
        return score;
    }

    public void setScore(Double score) {
        this.score = score;
    }

    public Double getSkillsScore() {
        return skillsScore;
    }

    public void setSkillsScore(Double skillsScore) {
        this.skillsScore = skillsScore;
    }

    public Double getEducationScore() {
        return educationScore;
    }

    public void setEducationScore(Double educationScore) {
        this.educationScore = educationScore;
    }

    public Double getExperienceScore() {
        return experienceScore;
    }

    public void setExperienceScore(Double experienceScore) {
        this.experienceScore = experienceScore;
    }

    public String getAnalysisResult() {
        return analysisResult;
    }

    public void setAnalysisResult(String analysisResult) {
        this.analysisResult = analysisResult;
    }

    public LocalDateTime getLastStatusUpdate() {
        return lastStatusUpdate;
    }

    public void setLastStatusUpdate(LocalDateTime lastStatusUpdate) {
        this.lastStatusUpdate = lastStatusUpdate;
    }

    public String getCategorizedSkills() {
        return categorizedSkills;
    }

    public void setCategorizedSkills(String categorizedSkills) {
        this.categorizedSkills = categorizedSkills;
    }
}
