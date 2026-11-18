import nodemailer from 'nodemailer';
import { config } from '../../config/index.js';
import { db } from '../../db/db.js';
import crypto from 'crypto';

export interface EmailRecipientInfo {
  email: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: config.smtpHost || 'smtp.mailtrap.io',
        port: config.smtpPort || 587,
        auth: {
          user: config.smtpUser || '',
          pass: config.smtpPass || '',
        },
      });
    }
    return this.transporter;
  }

  /**
   * Dispatch email via configured provider
   */
  private static async send(params: {
    to: string;
    subject: string;
    html: string;
    templateType: string;
  }): Promise<boolean> {
    const { to, subject, html, templateType } = params;
    const notificationId = crypto.randomUUID();

    try {
      if (config.emailProvider === 'resend' && config.emailApiKey) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.emailApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: config.emailFrom,
            to,
            subject,
            html,
          }),
        });
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Resend email error (${response.status}): ${errText}`);
        }
      } else if (config.emailProvider === 'sendgrid' && config.emailApiKey) {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.emailApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: config.emailFrom.split('<').pop()?.replace('>', '') || 'transfers@lexusmail.com' },
            subject,
            content: [{ type: 'text/html', value: html }],
          }),
        });
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`SendGrid email error (${response.status}): ${errText}`);
        }
      } else if (config.emailProvider === 'smtp' && config.smtpHost) {
        const transporter = this.getTransporter();
        await transporter.sendMail({
          from: config.emailFrom,
          to,
          subject,
          html,
        });
      } else {
        // Fallback / Development logger
        console.log(`\n================== [LexusMail Email (${templateType})] ==================`);
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`(Email sent via Dev Logger - configure EMAIL_PROVIDER for production delivery)`);
        console.log('========================================================================\n');
      }

      // Record in email_notifications table
      await db.execute(
        `INSERT INTO email_notifications (id, recipient_email, subject, template_type, status, sent_at)
         VALUES ($1, $2, $3, $4, 'sent', CURRENT_TIMESTAMP)`,
        [notificationId, to, subject, templateType]
      );
      return true;
    } catch (err: any) {
      console.error(`[EmailService] Failed to send email to ${to}:`, err.message);
      await db.execute(
        `INSERT INTO email_notifications (id, recipient_email, subject, template_type, status, error_message)
         VALUES ($1, $2, $3, $4, 'failed', $5)`,
        [notificationId, to, subject, templateType, err.message]
      );
      return false;
    }
  }

  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Recipient Transfer Notification
   */
  static async sendRecipientTransferNotification(params: {
    recipientEmail: string;
    senderEmail: string;
    title?: string;
    message?: string;
    fileCount: number;
    totalSizeBytes: number;
    downloadUrl: string;
    expiresAt: Date;
    hasPassword: boolean;
  }): Promise<void> {
    const {
      recipientEmail,
      senderEmail,
      title,
      message,
      fileCount,
      totalSizeBytes,
      downloadUrl,
      expiresAt,
      hasPassword,
    } = params;

    const subject = `${senderEmail} sent you ${fileCount} file${fileCount > 1 ? 's' : ''} (${this.formatBytes(totalSizeBytes)}) via LexusMail`;
    const expiryFormatted = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(expiresAt);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 40px 20px; }
          .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15,23,42,0.05); }
          .header { background: linear-gradient(135deg, #026fc7 0%, #0358a1 100%); padding: 32px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
          .header p { margin: 8px 0 0; font-size: 14px; opacity: 0.9; }
          .body { padding: 32px; }
          .badge-row { display: flex; gap: 12px; margin-bottom: 24px; }
          .badge { background: #f0f7ff; color: #026fc7; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 600; display: inline-block; }
          .message-box { background: #f8fafc; border-left: 4px solid #026fc7; padding: 16px; margin: 20px 0; border-radius: 4px; font-style: italic; color: #334155; }
          .cta-wrap { text-align: center; margin: 36px 0; }
          .cta-btn { background: #026fc7; color: #ffffff !important; text-decoration: none; padding: 16px 36px; border-radius: 10px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(2, 111, 199, 0.35); }
          .details-table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 14px; }
          .details-table td { padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
          .details-table td:first-child { color: #64748b; width: 35%; }
          .details-table td:last-child { font-weight: 500; text-align: right; }
          .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>LexusMail</h1>
            <p>Secure Large File Transfer Platform</p>
          </div>
          <div class="body">
            <h2 style="font-size: 20px; margin-top: 0;">Files Ready for Download</h2>
            <p><strong>${senderEmail}</strong> has shared a file transfer package with you.</p>

            ${title ? `<p><strong>Transfer Title:</strong> ${title}</p>` : ''}
            ${message ? `<div class="message-box">"${message}"</div>` : ''}

            <table class="details-table">
              <tr>
                <td>Files Included</td>
                <td>${fileCount} file${fileCount > 1 ? 's' : ''}</td>
              </tr>
              <tr>
                <td>Total Size</td>
                <td>${this.formatBytes(totalSizeBytes)}</td>
              </tr>
              <tr>
                <td>Expires On</td>
                <td>${expiryFormatted}</td>
              </tr>
              ${hasPassword ? '<tr><td>Security</td><td style="color: #026fc7;">🔒 Password Protected</td></tr>' : ''}
            </table>

            <div class="cta-wrap">
              <a href="${downloadUrl}" class="cta-btn" target="_blank">Download Files</a>
            </div>

            <p style="font-size: 13px; color: #64748b; text-align: center;">
              Or copy this direct link: <br>
              <a href="${downloadUrl}" style="color: #026fc7; word-break: break-all;">${downloadUrl}</a>
            </p>
          </div>
          <div class="footer">
            Sent securely via LexusMail Cloud Infrastructure. Transfers are automatically deleted after expiration.
          </div>
        </div>
      </body>
      </html>
    `;

    await this.send({
      to: recipientEmail,
      subject,
      html,
      templateType: 'recipient_notification',
    });
  }

  /**
   * Sender Confirmation Notification
   */
  static async sendSenderConfirmation(params: {
    senderEmail: string;
    title?: string;
    fileCount: number;
    totalSizeBytes: number;
    downloadUrl: string;
    expiresAt: Date;
    recipients: string[];
  }): Promise<void> {
    const { senderEmail, title, fileCount, totalSizeBytes, downloadUrl, expiresAt, recipients } = params;
    const subject = `Your transfer of ${fileCount} file${fileCount > 1 ? 's' : ''} is ready on LexusMail`;
    const expiryFormatted = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(expiresAt);

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #0f172a; padding: 40px 20px; }
        .box { max-width: 580px; margin: 0 auto; background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; }
        .cta { background: #026fc7; color: #fff !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600; margin: 20px 0; }
      </style>
      </head>
      <body>
        <div class="box">
          <h2 style="color: #026fc7; margin-top: 0;">Transfer Successfully Uploaded!</h2>
          <p>Your files have been safely stored in cloud storage and are available for download.</p>
          ${title ? `<p><strong>Title:</strong> ${title}</p>` : ''}
          <p><strong>Total Size:</strong> ${this.formatBytes(totalSizeBytes)} (${fileCount} files)</p>
          <p><strong>Expires On:</strong> ${expiryFormatted}</p>
          ${recipients.length > 0 ? `<p><strong>Recipients Notified:</strong> ${recipients.join(', ')}</p>` : ''}
          <p>Your shareable link:</p>
          <a href="${downloadUrl}" class="cta" target="_blank">View / Download Transfer</a>
          <p style="font-size: 13px; color: #64748b;">${downloadUrl}</p>
        </div>
      </body>
      </html>
    `;

    await this.send({
      to: senderEmail,
      subject,
      html,
      templateType: 'sender_confirmation',
    });
  }

  /**
   * Download activity notification to sender
   */
  static async sendDownloadNotification(params: {
    senderEmail: string;
    transferTitle?: string;
    downloadedFile?: string;
    ipAddress?: string;
  }): Promise<void> {
    const { senderEmail, transferTitle, downloadedFile } = params;
    const subject = `Your files were downloaded from LexusMail`;

    const html = `
      <div style="font-family: sans-serif; padding: 24px; color: #0f172a;">
        <h3 style="color: #026fc7;">Files Downloaded</h3>
        <p>A recipient just downloaded files from your transfer: <strong>${transferTitle || 'Untitled Transfer'}</strong>.</p>
        ${downloadedFile ? `<p>File: <em>${downloadedFile}</em></p>` : '<p>Complete archive downloaded as ZIP.</p>'}
        <p style="font-size: 12px; color: #64748b;">LexusMail Delivery Tracking</p>
      </div>
    `;

    await this.send({
      to: senderEmail,
      subject,
      html,
      templateType: 'download_alert',
    });
  }

  /**
   * Password reset email
   */
  static async sendPasswordReset(params: {
    email: string;
    name: string;
    resetToken: string;
  }): Promise<void> {
    const resetUrl = `${config.appUrl}/reset-password?token=${params.resetToken}`;
    const subject = `Reset your LexusMail account password`;

    const html = `
      <div style="font-family: sans-serif; padding: 32px; background: #fff; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #026fc7;">Password Reset Request</h2>
        <p>Hello ${params.name},</p>
        <p>We received a request to reset your password. Click the button below to choose a new password:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}" style="background: #026fc7; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">Reset Password</a>
        </div>
        <p style="font-size: 12px; color: #64748b;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `;

    await this.send({
      to: params.email,
      subject,
      html,
      templateType: 'password_reset',
    });
  }
}
