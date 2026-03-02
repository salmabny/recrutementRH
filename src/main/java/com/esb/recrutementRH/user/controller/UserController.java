package com.esb.recrutementRH.user.controller;

import com.esb.recrutementRH.user.model.User;
import com.esb.recrutementRH.user.model.Candidat;
import com.esb.recrutementRH.user.model.Recruteur;
import com.esb.recrutementRH.user.dto.RecruteurUpdateDto;
import com.esb.recrutementRH.user.service.UserService;
import com.esb.recrutementRH.candidature.service.FileStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private Environment env;

    @PostMapping("/{id}/upload-photo")
    public ResponseEntity<User> uploadPhoto(@PathVariable Long id, @RequestParam("photo") MultipartFile file)
            throws IOException {
        String imageDir = env.getProperty("file.upload-dir-images");
        String fileName = fileStorageService.store(imageDir, file, ".jpg", ".jpeg", ".png");
        User user = userService.getUserById(id).orElseThrow(() -> new RuntimeException("User not found"));
        user.setPhotoUrl(fileName);
        return ResponseEntity.ok(userService.saveUser(user));
    }

    @PostMapping
    public ResponseEntity<User> createUser(@RequestBody User user) {
        return ResponseEntity.status(201).body(userService.saveUser(user));
    }

    @GetMapping
    public List<User> getAllUsers() {
        return userService.getAllUsers();
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        return userService.getUserById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @RequestBody Candidat user) {
        return ResponseEntity.ok(userService.updateCandidate(id, user));
    }

    @PutMapping("/{id}/recruteur")
    public ResponseEntity<Void> updateRecruiter(@PathVariable Long id, @RequestBody RecruteurUpdateDto dto) {
        userService.updateRecruiter(id, dto);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
