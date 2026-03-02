package com.esb.recrutementRH.user.dto;

import com.esb.recrutementRH.user.model.Role;
import com.esb.recrutementRH.user.model.UserStatus;

public class LoginResponse {
    private String token;
    private String type = "Bearer";
    private Long id;
    private String prenom;
    private String nom;
    private String email;
    private Role role;
    private UserStatus status;

    public LoginResponse() {
    }

    public LoginResponse(String token, Long id, String prenom, String nom, String email, Role role,
            UserStatus status) {
        this.token = token;
        this.id = id;
        this.prenom = prenom;
        this.nom = nom;
        this.email = email;
        this.role = role;
        this.status = status;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getPrenom() {
        return prenom;
    }

    public void setPrenom(String prenom) {
        this.prenom = prenom;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public UserStatus getStatus() {
        return status;
    }

    public void setStatus(UserStatus status) {
        this.status = status;
    }
}
