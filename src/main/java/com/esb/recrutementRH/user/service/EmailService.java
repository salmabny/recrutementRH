package com.esb.recrutementRH.user.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    public void sendVerificationCode(String to, String code) {
        try {
            jakarta.mail.internet.MimeMessage message = mailSender.createMimeMessage();
            org.springframework.mail.javamail.MimeMessageHelper helper = new org.springframework.mail.javamail.MimeMessageHelper(
                    message, true, "UTF-8");

            helper.setTo(to);
            helper.setSubject("Vérifiez votre compte - SmartHiring");

            String htmlContent = "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eef0f8; border-radius: 12px;'>"
                    +
                    "<h2 style='color: #4361ee; text-align: center;'>Bienvenue sur SmartHiring !</h2>" +
                    "<p>Merci de vous être inscrit. Pour finaliser la création de votre compte, veuillez utiliser le code de vérification ci-dessous :</p>"
                    +
                    "<div style='background-color: #f4f7ff; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0;'>"
                    +
                    "<span style='font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4361ee;'>" + code
                    + "</span>" +
                    "</div>" +
                    "<p style='color: #8990a8; font-size: 13px;'>Ce code expirera bientôt. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.</p>"
                    +
                    "<hr style='border: 0; border-top: 1px solid #eef0f8; margin: 20px 0;'>" +
                    "<p style='text-align: center; color: #8990a8; font-size: 12px;'>© 2026 SmartHiring - La plateforme de recrutement intelligente</p>"
                    +
                    "</div>";

            helper.setText(htmlContent, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("[EmailService] ERREUR CRITIQUE lors de l'envoi : " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Échec de l'envoi de l'email de vérification", e);
        }
    }

    public void sendResetPasswordCode(String to, String code) {
        try {
            jakarta.mail.internet.MimeMessage message = mailSender.createMimeMessage();
            org.springframework.mail.javamail.MimeMessageHelper helper = new org.springframework.mail.javamail.MimeMessageHelper(
                    message, true, "UTF-8");

            helper.setTo(to);
            helper.setSubject("Réinitialisation de votre mot de passe - SmartHiring");

            String htmlContent = "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eef0f8; border-radius: 12px;'>"
                    +
                    "<h2 style='color: #4361ee; text-align: center;'>Réinitialisation de mot de passe</h2>" +
                    "<p>Nous avons reçu une demande de réinitialisation de votre mot de passe. Utilisez le code confidentiel suivant :</p>"
                    +
                    "<div style='background-color: #f4f7ff; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0;'>"
                    +
                    "<span style='font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4361ee;'>" + code
                    + "</span>" +
                    "</div>" +
                    "<p>Si vous n'avez pas demandé ce changement, veuillez ignorer ce message ou contacter notre support.</p>"
                    +
                    "<hr style='border: 0; border-top: 1px solid #eef0f8; margin: 20px 0;'>" +
                    "<p style='text-align: center; color: #8990a8; font-size: 12px;'>© 2026 SmartHiring - La plateforme de recrutement intelligente</p>"
                    +
                    "</div>";

            helper.setText(htmlContent, true);
            mailSender.send(message);
        } catch (Exception e) {
            throw new RuntimeException("Échec de l'envoi de l'email de réinitialisation", e);
        }
    }

    public void sendAccountApprovalEmail(String toEmail, String firstName) {
        String htmlContent = "<html><body style='font-family: Arial, sans-serif; background-color: #f4f7fe; padding: 20px;'>"
                + "<div style='max-width: 600px; margin: auto; background: white; padding: 40px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);'>"
                + "<h2 style='color: #4361ee; text-align: center; margin-bottom: 30px;'>Profil Approuvé !</h2>"
                + "<p style='font-size: 16px; color: #444;'>Bonjour <strong>" + firstName + "</strong>,</p>"
                + "<p style='font-size: 16px; color: #444; line-height: 1.6;'>Nous avons le plaisir de vous informer que votre profil <strong>Recruteur</strong> a été validé par notre équipe administrative.</p>"
                + "<div style='background: #eef2ff; border-left: 4px solid #4361ee; padding: 15px; margin: 25px 0;'>"
                + "<p style='margin: 0; color: #4361ee; font-weight: bold;'>Votre compte est maintenant actif.</p>"
                + "</div>"
                + "<p style='font-size: 16px; color: #444;'>Vous pouvez dès à présent vous connecter pour publier vos offres et gérer vos recrutements.</p>"
                + "<div style='text-align: center; margin-top: 35px;'>"
                + "<a href='http://localhost:4200/login' style='background-color: #4361ee; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;'>Se connecter maintenant</a>"
                + "</div>"
                + "<hr style='margin-top: 40px; border: 0; border-top: 1px solid #eee;'>"
                + "<p style='font-size: 12px; color: #888; text-align: center;'>L'équipe SmartHiring</p>"
                + "</div>"
                + "</body></html>";

        try {
            jakarta.mail.internet.MimeMessage message = mailSender.createMimeMessage();
            org.springframework.mail.javamail.MimeMessageHelper helper = new org.springframework.mail.javamail.MimeMessageHelper(
                    message, true, "UTF-8");
            helper.setTo(toEmail);
            helper.setSubject("Bienvenue sur SmartHiring - Votre compte a été validé !");
            helper.setText(htmlContent, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("[EmailService] Échec envoi email d'approbation : " + e.getMessage());
        }
    }

    public void sendAccountRejectionEmail(String toEmail, String firstName) {
        String htmlContent = "<html><body style='font-family: Arial, sans-serif; background-color: #f4f7fe; padding: 20px;'>"
                + "<div style='max-width: 600px; margin: auto; background: white; padding: 40px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);'>"
                + "<h2 style='color: #e53e3e; text-align: center; margin-bottom: 30px;'>Mise à jour de votre compte</h2>"
                + "<p style='font-size: 16px; color: #444;'>Bonjour <strong>" + firstName + "</strong>,</p>"
                + "<p style='font-size: 16px; color: #444; line-height: 1.6;'>Nous avons terminé l'examen de votre profil <strong>Recruteur</strong> sur SmartHiring.</p>"
                + "<div style='background: #fff5f5; border-left: 4px solid #e53e3e; padding: 15px; margin: 25px 0;'>"
                + "<p style='margin: 0; color: #e53e3e; font-weight: bold;'>Malheureusement, votre demande n'a pas été retenue pour le moment.</p>"
                + "</div>"
                + "<p style='font-size: 16px; color: #444;'>Cela peut être dû à un manque d'informations professionnelles ou à un document administratif non valide.</p>"
                + "<p style='font-size: 16px; color: #444;'>Vous pouvez nous contacter ou essayer de vous réinscrire avec des informations complètes.</p>"
                + "<hr style='margin-top: 40px; border: 0; border-top: 1px solid #eee;'>"
                + "<p style='font-size: 12px; color: #888; text-align: center;'>L'équipe SmartHiring</p>"
                + "</div>"
                + "</body></html>";

        try {
            jakarta.mail.internet.MimeMessage message = mailSender.createMimeMessage();
            org.springframework.mail.javamail.MimeMessageHelper helper = new org.springframework.mail.javamail.MimeMessageHelper(
                    message, true, "UTF-8");
            helper.setTo(toEmail);
            helper.setSubject("Information concernant votre compte SmartHiring");
            helper.setText(htmlContent, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("[EmailService] Échec envoi email de rejet : " + e.getMessage());
        }
    }
}
