package com.esb.recrutementRH.candidature.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

@Service
public class FileStorageService {

    public String store(String baseDir, MultipartFile file, String... allowedExtensions) throws IOException {

        String originalName = file.getOriginalFilename();
        if (originalName == null)
            throw new RuntimeException("Nom de fichier invalide");

        String extension = originalName.substring(originalName.lastIndexOf(".")).toLowerCase();

        boolean allowed = false;
        if (allowedExtensions.length == 0) {
            allowed = true; // No restrictions
        } else {
            for (String ext : allowedExtensions) {
                if (extension.equalsIgnoreCase(ext)) {
                    allowed = true;
                    break;
                }
            }
        }

        if (!allowed) {
            throw new RuntimeException("Format de fichier non autorisé : " + extension);
        }

        String fileName = UUID.randomUUID() + extension;
        Path path = Paths.get(baseDir).resolve(fileName);

        Files.createDirectories(path.getParent());
        Files.copy(file.getInputStream(), path, StandardCopyOption.REPLACE_EXISTING);

        return fileName; // Return just the filename for better URL mapping
    }
}
