package com.esb.recrutementRH.job.repository;

import com.esb.recrutementRH.job.model.JobOffer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.repository.query.Param;
import java.util.List;

@Repository
public interface JobOfferRepository extends JpaRepository<JobOffer, Long> {

    List<JobOffer> findByRecruiterId(Long recruiterId); // Offres d’un recruteur

    long countByRecruiterId(@Param("recruiterId") Long recruiterId);
}
