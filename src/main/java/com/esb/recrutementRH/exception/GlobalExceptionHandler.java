package com.esb.recrutementRH.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleAllExceptions(Exception ex) {
        logger.error("Unhandled Exception: ", ex);

        Map<String, String> response = new HashMap<>();
        response.put("error", "Global Error: " + ex.getClass().getSimpleName());
        response.put("message", ex.getMessage());

        return ResponseEntity.status(500).body(response);
    }
}
