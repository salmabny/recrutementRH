package com.esb.recrutementRH.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.File;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Autowired
    private Environment env;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String uploadDirImages = env.getProperty("file.upload-dir-images", "uploads/images");
        File dir = new File(uploadDirImages);
        if (!dir.isAbsolute()) {
            dir = new File(System.getProperty("user.dir"), uploadDirImages);
        }

        // Ensure the directory exists
        if (!dir.exists()) {
            dir.mkdirs();
        }

        String path = dir.toURI().toString();

        registry.addResourceHandler("/uploads/images/**")
                .addResourceLocations(path);

        String uploadDirCv = env.getProperty("file.upload-dir", "uploads/cv");
        File dirCv = new File(uploadDirCv);
        if (!dirCv.isAbsolute()) {
            dirCv = new File(System.getProperty("user.dir"), uploadDirCv);
        }
        if (!dirCv.exists()) {
            dirCv.mkdirs();
        }
        registry.addResourceHandler("/uploads/cv/**")
                .addResourceLocations(dirCv.toURI().toString());
    }
}
