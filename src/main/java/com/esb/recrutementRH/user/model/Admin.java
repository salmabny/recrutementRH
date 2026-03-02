package com.esb.recrutementRH.user.model;

import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "admins", schema = "recruitment")
@DiscriminatorValue("ADMIN")
public class Admin extends User {

    @Override
    public Role getRole() {
        return Role.ADMIN;
    }
}
