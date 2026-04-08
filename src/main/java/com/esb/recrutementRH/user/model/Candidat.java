package com.esb.recrutementRH.user.model;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "candidates", schema = "recruitment")
@DiscriminatorValue("CANDIDAT")
public class Candidat extends User {

    private String verificationCode;
    private String resetCode;

    private String posteRecherche;
    private String niveauEtudes;
    private Integer anneesExperience;
    private Boolean ouvertAuxOffres;

    @ElementCollection
    @CollectionTable(name = "candidate_competences", joinColumns = @JoinColumn(name = "candidate_id"), schema = "recruitment")
    @Column(name = "competence")
    private java.util.List<String> competences = new java.util.ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "candidate_outils", joinColumns = @JoinColumn(name = "candidate_id"), schema = "recruitment")
    @Column(name = "outil")
    private java.util.List<String> outils = new java.util.ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "candidate_soft_skills", joinColumns = @JoinColumn(name = "candidate_id"), schema = "recruitment")
    @Column(name = "soft_skill")
    private java.util.List<String> softSkills = new java.util.ArrayList<>();

    @OneToMany(mappedBy = "candidat", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<Experience> experiences = new java.util.ArrayList<>();

    @OneToMany(mappedBy = "candidat", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<Formation> formations = new java.util.ArrayList<>();

    @OneToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JoinColumn(name = "cv_id")
    private com.esb.recrutementRH.candidature.model.CV cv;

    // Profile Analysis Scores (Independent of specific applications)
    private Double profileScore;
    private Double profileSkillsScore;
    private Double profileEducationScore;
    private Double profileExperienceScore;
    @Column(columnDefinition = "TEXT")
    private String profileAnalysisResult;

    @ElementCollection
    @CollectionTable(name = "candidate_job_scores", joinColumns = @JoinColumn(name = "candidate_id"), schema = "recruitment")
    @MapKeyColumn(name = "job_offer_id")
    @Column(name = "score")
    private Map<Long, Double> jobScores = new HashMap<>();

    @Override
    public Role getRole() {
        return Role.CANDIDAT;
    }

    // Getters & Setters
    public String getVerificationCode() {
        return verificationCode;
    }

    public void setVerificationCode(String verificationCode) {
        this.verificationCode = verificationCode;
    }

    public String getResetCode() {
        return resetCode;
    }

    public void setResetCode(String resetCode) {
        this.resetCode = resetCode;
    }

    public String getPosteRecherche() {
        return posteRecherche;
    }

    public void setPosteRecherche(String posteRecherche) {
        this.posteRecherche = posteRecherche;
    }

    public String getNiveauEtudes() {
        return niveauEtudes;
    }

    public void setNiveauEtudes(String niveauEtudes) {
        this.niveauEtudes = niveauEtudes;
    }

    public Integer getAnneesExperience() {
        return anneesExperience;
    }

    public void setAnneesExperience(Integer anneesExperience) {
        this.anneesExperience = anneesExperience;
    }

    public Boolean getOuvertAuxOffres() {
        return ouvertAuxOffres;
    }

    public void setOuvertAuxOffres(Boolean ouvertAuxOffres) {
        this.ouvertAuxOffres = ouvertAuxOffres;
    }

    public java.util.List<String> getCompetences() {
        return competences;
    }

    public void setCompetences(java.util.List<String> competences) {
        this.competences = competences;
    }

    public java.util.List<String> getOutils() {
        return outils;
    }

    public void setOutils(java.util.List<String> outils) {
        this.outils = outils;
    }

    public java.util.List<String> getSoftSkills() {
        return softSkills;
    }

    public void setSoftSkills(java.util.List<String> softSkills) {
        this.softSkills = softSkills;
    }

    public java.util.List<Experience> getExperiences() {
        return experiences;
    }

    public void setExperiences(java.util.List<Experience> experiences) {
        this.experiences = experiences;
    }

    public java.util.List<Formation> getFormations() {
        return formations;
    }

    public void setFormations(java.util.List<Formation> formations) {
        this.formations = formations;
    }

    public Double getProfileScore() {
        return profileScore;
    }

    public void setProfileScore(Double profileScore) {
        this.profileScore = profileScore;
    }

    public Double getProfileSkillsScore() {
        return profileSkillsScore;
    }

    public void setProfileSkillsScore(Double profileSkillsScore) {
        this.profileSkillsScore = profileSkillsScore;
    }

    public Double getProfileEducationScore() {
        return profileEducationScore;
    }

    public void setProfileEducationScore(Double profileEducationScore) {
        this.profileEducationScore = profileEducationScore;
    }

    public Double getProfileExperienceScore() {
        return profileExperienceScore;
    }

    public void setProfileExperienceScore(Double profileExperienceScore) {
        this.profileExperienceScore = profileExperienceScore;
    }

    public String getProfileAnalysisResult() {
        return profileAnalysisResult;
    }

    public void setProfileAnalysisResult(String profileAnalysisResult) {
        this.profileAnalysisResult = profileAnalysisResult;
    }

    public com.esb.recrutementRH.candidature.model.CV getCv() {
        return cv;
    }

    public void setCv(com.esb.recrutementRH.candidature.model.CV cv) {
        this.cv = cv;
    }

    public Map<Long, Double> getJobScores() {
        return jobScores;
    }

    public void setJobScores(Map<Long, Double> jobScores) {
        this.jobScores = jobScores;
    }

    public void updateJobScore(Long jobOfferId, Double score) {
        this.jobScores.put(jobOfferId, score);
    }
}
