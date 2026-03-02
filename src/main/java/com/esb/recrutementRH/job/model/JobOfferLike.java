package com.esb.recrutementRH.job.model;

import com.esb.recrutementRH.user.model.User;
import jakarta.persistence.*;

@Entity
@Table(name = "job_offer_likes", schema = "recruitment", uniqueConstraints = @UniqueConstraint(columnNames = {
        "job_offer_id", "user_id" }))
public class JobOfferLike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_offer_id")
    private JobOffer jobOffer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    public JobOfferLike() {
    }

    public JobOfferLike(JobOffer jobOffer, User user) {
        this.jobOffer = jobOffer;
        this.user = user;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public JobOffer getJobOffer() {
        return jobOffer;
    }

    public void setJobOffer(JobOffer jobOffer) {
        this.jobOffer = jobOffer;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }
}
