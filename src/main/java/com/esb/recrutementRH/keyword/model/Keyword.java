package com.esb.recrutementRH.keyword.model;

import jakarta.persistence.*;

@Entity
public class Keyword {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String value; // Le mot-clé

    @Enumerated(EnumType.STRING)
    private KeywordType type; // COMPETENCE, DIPLOME, EXPERIENCE

    private Integer points; // Points pour le scoring

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }

    public KeywordType getType() { return type; }
    public void setType(KeywordType type) { this.type = type; }

    public Integer getPoints() { return points; }
    public void setPoints(Integer points) { this.points = points; }
}
