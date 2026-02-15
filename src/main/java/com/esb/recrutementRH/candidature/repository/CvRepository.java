package com.esb.recrutementRH.candidature.repository;

import com.esb.recrutementRH.candidature.model.CV;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CvRepository extends JpaRepository<CV, Long> {
}
