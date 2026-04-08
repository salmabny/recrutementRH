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
        // ... (existing code)
    }

    public void sendTemporaryPasswordEmail(String toEmail, String firstName, String password) {
        String htmlContent = "<html><body style='font-family: Arial, sans-serif; background-color: #f4f7fe; padding: 20px;'>"
                + "<div style='max-width: 600px; margin: auto; background: white; padding: 40px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);'>"
                + "<h2 style='color: #4361ee; text-align: center; margin-bottom: 30px;'>Bienvenue sur SmartHiring !</h2>"
                + "<p style='font-size: 16px; color: #444;'>Bonjour <strong>" + firstName + "</strong>,</p>"
                + "<p style='font-size: 16px; color: #444; line-height: 1.6;'>Un compte <strong>Recruteur</strong> a été créé pour vous par l'administrateur.</p>"
                + "<div style='background: #f8fafc; border: 1px dashed #cbd5e1; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;'>"
                + "<p style='margin: 0 0 10px 0; color: #64748b; font-size: 14px;'>Voici vos identifiants temporaires :</p>"
                + "<p style='margin: 5px 0; font-size: 16px;'><strong>Email :</strong> " + toEmail + "</p>"
                + "<p style='margin: 5px 0; font-size: 18px; color: #4361ee;'><strong>Mot de passe :</strong> <span style='background:#eef2ff; padding:2px 8px; border-radius:4px;'>"
                + password + "</span></p>"
                + "</div>"
                + "<p style='font-size: 15px; color: #e53e3e; font-weight: bold; text-align: center;'>⚠️ Par sécurité, vous devrez obligatoirement changer ce mot de passe lors de votre première connexion.</p>"
                + "<div style='text-align: center; margin-top: 35px;'>"
                + "<a href='http://localhost:4200/login' style='background-color: #4361ee; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;'>Se connecter pour la première fois</a>"
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
            helper.setSubject("Création de votre compte Recruteur - SmartHiring");
            helper.setText(htmlContent, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("[EmailService] Échec envoi email identifiants : " + e.getMessage());
        }
    }

    public void sendSupportEmail(String fromEmail, String messageContent) {
        try {
            jakarta.mail.internet.MimeMessage message = mailSender.createMimeMessage();
            org.springframework.mail.javamail.MimeMessageHelper helper = new org.springframework.mail.javamail.MimeMessageHelper(
                    message, true, "UTF-8");

            helper.setTo("sou93237@gmail.com"); // Admin email provided by user
            helper.setSubject("Demande de support - Utilisateur SmartHiring");

            String htmlContent = "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eef0f8; border-radius: 12px;'>"
                    +
                    "<h2 style='color: #4361ee; text-align: center;'>Demande de Support</h2>" +
                    "<p>Un utilisateur restreint tente de vous contacter :</p>" +
                    "<div style='background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;'>" +
                    "<p><strong>Email de l'utilisateur :</strong> " + fromEmail + "</p>" +
                    "<p><strong>Message :</strong></p>" +
                    "<p style='white-space: pre-wrap;'>" + messageContent + "</p>" +
                    "</div>" +
                    "<hr style='border: 0; border-top: 1px solid #eef0f8; margin: 20px 0;'>" +
                    "<p style='text-align: center; color: #8990a8; font-size: 12px;'>SmartHiring - Administration System</p>"
                    +
                    "</div>";

            helper.setText(htmlContent, true);
            mailSender.send(message);
        } catch (Exception e) {
            throw new RuntimeException("Échec de l'envoi de l'email de support", e);
        }
    }

    public void sendCandidatureStatusUpdateEmail(String toEmail, String firstName, String jobTitle, String newStatus) {
        String statusLabel = switch (newStatus) {
            case "SOUMISE" -> "Soumise";
            case "EN_COURS" -> "En cours d'examen";
            case "ACCEPTEE" -> "Acceptée";
            case "REFUSEE" -> "Refusée";
            default -> newStatus;
        };

        String statusColor = switch (newStatus) {
            case "ACCEPTEE" -> "#10b981"; // Green
            case "REFUSEE" -> "#ef4444"; // Red
            case "EN_COURS" -> "#f59e0b"; // Orange
            default -> "#4361ee"; // Blue
        };

        String htmlContent = "<html><body style='font-family: Arial, sans-serif; background-color: #f4f7fe; padding: 20px;'>"
                + "<div style='max-width: 600px; margin: auto; background: white; padding: 40px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);'>"
                + "<h2 style='color: #4361ee; text-align: center; margin-bottom: 30px;'>Mise à jour de votre candidature</h2>"
                + "<p style='font-size: 16px; color: #444;'>Bonjour <strong>" + firstName + "</strong>,</p>"
                + "<p style='font-size: 16px; color: #444; line-height: 1.6;'>Il y a du nouveau concernant votre candidature pour le poste : <strong>"
                + jobTitle + "</strong>.</p>"
                + "<div style='background: #f8fafc; border-left: 4px solid " + statusColor
                + "; padding: 20px; margin: 25px 0; border-radius: 4px;'>"
                + "<p style='margin: 0; color: #64748b; font-size: 14px;'>Nouveau statut :</p>"
                + "<p style='margin: 5px 0 0 0; font-size: 20px; font-weight: bold; color: " + statusColor + ";'>"
                + statusLabel + "</p>"
                + "</div>"
                + "<p style='font-size: 16px; color: #444;'>Vous pouvez suivre l'évolution de vos candidatures directement sur votre tableau de bord.</p>"
                + "<div style='text-align: center; margin-top: 35px;'>"
                + "<a href='http://localhost:4200/candidat/mes-candidatures' style='background-color: #4361ee; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;'>Voir mes candidatures</a>"
                + "</div>"
                + "<hr style='margin-top: 40px; border: 0; border-top: 1px solid #eee;'>"
                + "<p style='font-size: 12px; color: #888; text-align: center;'>Cet email est envoyé automatiquement, merci de ne pas y répondre.<br>© 2026 SmartHiring</p>"
                + "</div>"
                + "</body></html>";

        try {
            jakarta.mail.internet.MimeMessage message = mailSender.createMimeMessage();
            org.springframework.mail.javamail.MimeMessageHelper helper = new org.springframework.mail.javamail.MimeMessageHelper(
                    message, true, "UTF-8");
            helper.setTo(toEmail);
            helper.setSubject("Mise à jour de votre candidature - SmartHiring");
            helper.setText(htmlContent, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("[EmailService] Échec envoi email mise à jour candidature : " + e.getMessage());
        }
    }

    public void sendDirectEmail(String to, String subject, String content) {
        try {
            jakarta.mail.internet.MimeMessage message = mailSender.createMimeMessage();
            org.springframework.mail.javamail.MimeMessageHelper helper = new org.springframework.mail.javamail.MimeMessageHelper(
                    message, true, "UTF-8");
            helper.setTo(to);
            helper.setSubject(subject);

            String htmlContent = "<html><body style='font-family: Arial, sans-serif; background-color: #f4f7fe; padding: 20px;'>"
                    + "<div style='max-width: 600px; margin: auto; background: white; padding: 40px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);'>"
                    + "<h2 style='color: #4361ee; text-align: center; margin-bottom: 30px;'>Message de l'Administration SmartHiring</h2>"
                    + "<div style='background: #f8fafc; border: 1px solid #eef2f6; padding: 25px; border-radius: 12px; line-height: 1.6; color: #334155;'>"
                    + content.replace("\n", "<br>")
                    + "</div>"
                    + "<hr style='margin-top: 40px; border: 0; border-top: 1px solid #eee;'>"
                    + "<p style='font-size: 12px; color: #888; text-align: center;'>Cet email vous a été envoyé par l'administration de SmartHiring.<br>© 2026 SmartHiring</p>"
                    + "</div>"
                    + "</body></html>";

            helper.setText(htmlContent, true);
            mailSender.send(message);
        } catch (Exception e) {
            throw new RuntimeException("Échec de l'envoi de l'email direct", e);
        }
    }
}
