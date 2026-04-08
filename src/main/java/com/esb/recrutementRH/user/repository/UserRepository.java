package com.esb.recrutementRH.user.repository;

import com.esb.recrutementRH.user.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
        Optional<User> findByEmail(String email);

        boolean existsByEmail(String email);

        @org.springframework.data.jpa.repository.Query("SELECT COUNT(u) FROM User u WHERE TYPE(u) = :type")
        long countByType(Class<? extends User> type);

        @org.springframework.data.jpa.repository.Query("SELECT COUNT(u) FROM User u WHERE TYPE(u) = :type AND u.status = :status")
        long countByTypeAndStatus(Class<? extends User> type, com.esb.recrutementRH.user.model.UserStatus status);

        @org.springframework.data.jpa.repository.Query("SELECT u FROM User u WHERE TYPE(u) = :type")
        java.util.List<User> findAllByType(Class<? extends User> type);

        @org.springframework.data.jpa.repository.Query("SELECT u FROM User u WHERE TYPE(u) = :type AND u.status = :status")
        java.util.List<User> findAllByTypeAndStatus(Class<? extends User> type,
                        com.esb.recrutementRH.user.model.UserStatus status);

        @Modifying
        @Query("UPDATE User u SET u.status = :status WHERE u.id = :id")
        void updateStatus(Long id, com.esb.recrutementRH.user.model.UserStatus status);
}
