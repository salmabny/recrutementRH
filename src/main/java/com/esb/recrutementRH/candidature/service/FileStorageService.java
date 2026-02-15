package com.esb.recrutementRH.candidature.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

@Service
public class FileStorageService {

    @Value("${file.upload-dir}")
    private String uploadDir;

    public String store(MultipartFile file) throws IOException {

        String originalName = file.getOriginalFilename();
        String extension = originalName.substring(originalName.lastIndexOf("."));

        if (!extension.equalsIgnoreCase(".pdf") &&
            !extension.equalsIgnoreCase(".docx")) {
            throw new RuntimeException("Format de CV non autorisé");
        }

        String fileName = UUID.randomUUID() + extension;
        Path path = Paths.get(uploadDir).resolve(fileName);

        Files.createDirectories(path.getParent());
        Files.copy(file.getInputStream(), path, StandardCopyOption.REPLACE_EXISTING);

        return path.toString();
    }
}
