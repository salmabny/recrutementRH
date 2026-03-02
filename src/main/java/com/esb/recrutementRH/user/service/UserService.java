package com.esb.recrutementRH.user.service;

import com.esb.recrutementRH.user.model.User;
import com.esb.recrutementRH.user.model.Candidat;
import com.esb.recrutementRH.user.model.Recruteur;
import com.esb.recrutementRH.user.dto.RecruteurUpdateDto;
import com.esb.recrutementRH.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    public User saveUser(User user) {
        return userRepository.save(user);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public Optional<User> getUserById(Long id) {
        return userRepository.findById(id);
    }

    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }

    public User updateCandidate(Long id, Candidat updatedCandidat) {
        return userRepository.findById(id).map(user -> {
            if (user instanceof Candidat) {
                Candidat existing = (Candidat) user;

                if (updatedCandidat.getNom() != null)
                    existing.setNom(updatedCandidat.getNom());
                if (updatedCandidat.getPrenom() != null)
                    existing.setPrenom(updatedCandidat.getPrenom());
                if (updatedCandidat.getEmail() != null)
                    existing.setEmail(updatedCandidat.getEmail());
                if (updatedCandidat.getTelephone() != null)
                    existing.setTelephone(updatedCandidat.getTelephone());
                if (updatedCandidat.getVille() != null)
                    existing.setVille(updatedCandidat.getVille());
                if (updatedCandidat.getPosteRecherche() != null)
                    existing.setPosteRecherche(updatedCandidat.getPosteRecherche());
                if (updatedCandidat.getNiveauEtudes() != null)
                    existing.setNiveauEtudes(updatedCandidat.getNiveauEtudes());
                if (updatedCandidat.getAnneesExperience() != null)
                    existing.setAnneesExperience(updatedCandidat.getAnneesExperience());
                if (updatedCandidat.getOuvertAuxOffres() != null)
                    existing.setOuvertAuxOffres(updatedCandidat.getOuvertAuxOffres());

                // Only update collections if they are provided in the request
                if (updatedCandidat.getCompetences() != null && !updatedCandidat.getCompetences().isEmpty()) {
                    existing.setCompetences(updatedCandidat.getCompetences());
                }
                if (updatedCandidat.getOutils() != null && !updatedCandidat.getOutils().isEmpty()) {
                    existing.setOutils(updatedCandidat.getOutils());
                }
                if (updatedCandidat.getSoftSkills() != null && !updatedCandidat.getSoftSkills().isEmpty()) {
                    existing.setSoftSkills(updatedCandidat.getSoftSkills());
                }

                return userRepository.save(existing);
            }
            return user;
        }).orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User updateRecruiter(Long id, RecruteurUpdateDto dto) {
        return userRepository.findById(id).map(user -> {
            if (user instanceof Recruteur existing) {
                // Update common User fields via base class
                if (dto.getNom() != null)
                    existing.setNom(dto.getNom());
                if (dto.getPrenom() != null)
                    existing.setPrenom(dto.getPrenom());
                if (dto.getEmail() != null)
                    existing.setEmail(dto.getEmail());
                if (dto.getTelephone() != null)
                    existing.setTelephone(dto.getTelephone());
                if (dto.getVille() != null)
                    existing.setVille(dto.getVille());
                // Recruteur-specific fields
                if (dto.getEntreprise() != null)
                    existing.setEntreprise(dto.getEntreprise());
                if (dto.getCompanyDomain() != null)
                    existing.setCompanyDomain(dto.getCompanyDomain());
                return userRepository.save(existing);
            }
            return user;
        }).orElseThrow(() -> new RuntimeException("User not found"));
    }
}
