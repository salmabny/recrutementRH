package com.esb.recrutementRH.job.repository;

import com.esb.recrutementRH.job.model.JobOfferLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JobOfferLikeRepository extends JpaRepository<JobOfferLike, Long> {

    Optional<JobOfferLike> findByJobOfferIdAndUserId(Long jobOfferId, Long userId);

    @Query("SELECT jol.jobOffer.id FROM JobOfferLike jol WHERE jol.user.id = :userId")
    List<Long> findLikedOfferIdsByUserId(@Param("userId") Long userId);

    void deleteByJobOfferIdAndUserId(Long jobOfferId, Long userId);

    long countByJobOfferId(Long jobOfferId);
}
