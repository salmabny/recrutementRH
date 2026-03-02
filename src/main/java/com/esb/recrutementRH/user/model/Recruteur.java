package com.esb.recrutementRH.user.model;

import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "recruiters", schema = "recruitment")
@DiscriminatorValue("RECRUTEUR")
public class Recruteur extends User {

    private String entreprise;
    private String companyDomain;
    private String adminDocPath;

    @Override
    public Role getRole() {
        return Role.RECRUTEUR;
    }

    // Getters & Setters
    public String getEntreprise() {
        return entreprise;
    }

    public void setEntreprise(String entreprise) {
        this.entreprise = entreprise;
    }

    public String getCompanyDomain() {
        return companyDomain;
    }

    public void setCompanyDomain(String companyDomain) {
        this.companyDomain = companyDomain;
    }

    public String getAdminDocPath() {
        return adminDocPath;
    }

    public void setAdminDocPath(String adminDocPath) {
        this.adminDocPath = adminDocPath;
    }
}
