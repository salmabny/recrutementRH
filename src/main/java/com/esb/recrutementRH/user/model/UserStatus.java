package com.esb.recrutementRH.user.model;

public enum UserStatus {
    PENDING_VERIFICATION, // For Candidates (Email)
    PENDING_ADMIN_VALIDATION, // For Recruiters (Admin)
    ACTIVE,
    REJECTED,
    SUSPENDU,
    DELETED
}
