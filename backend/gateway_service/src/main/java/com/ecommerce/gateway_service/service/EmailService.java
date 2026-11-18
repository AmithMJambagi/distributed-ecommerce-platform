package com.ecommerce.gateway_service.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EmailService {

	private final JavaMailSender mailSender;

	@Value("${spring.mail.username}")
	private String fromEmail;

	public EmailService(JavaMailSender mailSender) {
		this.mailSender = mailSender;
	}

	/**
	 * Sends the 6-digit OTP email to the user.
	 */
	public void sendOtpEmail(String toEmail, String otp) {
		try {
			SimpleMailMessage message = new SimpleMailMessage();
			message.setFrom(fromEmail);
			message.setTo(toEmail);
			message.setSubject("Your Login Verification Code for Ecommerce Application is: " + otp);
			message.setText("Hello,\n\n" + "Your one-time login verification code is:\n\n" + "    " + otp + "\n\n"
					+ "This code is valid for 5 minutes. If you did not request this code, please ignore this email.\n\n"
					+ "Best regards,\n" + "E-Commerce Platform Team");

			mailSender.send(message);
			log.info(">> [EMAIL DISPATCHED] OTP email successfully sent to {}", toEmail);

		} catch (Exception e) {
			log.error(">> [EMAIL ERROR] Failed to send OTP email to {}: {}", toEmail, e.getMessage());

		}
	}
}
