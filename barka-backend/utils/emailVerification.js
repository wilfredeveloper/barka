const crypto = require('crypto');
const nodemailer = require('nodemailer');

/**
 * Generate a secure email verification token
 */
exports.generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Generate a secure password reset token
 */
exports.generatePasswordResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Create email transporter based on environment
 */
const createTransporter = () => {
  // Use configured email settings from .env
  if (process.env.EMAIL_HOST && process.env.EMAIL_USERNAME && process.env.EMAIL_PASSWORD) {
    console.log('Using configured email settings:', {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      user: process.env.EMAIL_USERNAME
    });

    return nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  } else if (process.env.NODE_ENV === 'production') {
    // Fallback production email configuration
    return nodemailer.createTransporter({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  } else {
    // Development: Use Ethereal Email for testing
    console.log('Using Ethereal email for development');
    return nodemailer.createTransporter({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: process.env.ETHEREAL_EMAIL || 'ethereal.user@ethereal.email',
        pass: process.env.ETHEREAL_PASSWORD || 'ethereal.pass',
      },
    });
  }
};

/**
 * Send email verification email
 */
exports.sendVerificationEmail = async (user, verificationToken) => {
  try {
    const transporter = createTransporter();
    
    const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USERNAME || process.env.FROM_EMAIL || 'noreply@barka.com',
      to: user.email,
      subject: 'Verify Your Barka Account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Verify Your Account</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #000; color: #fff; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .button { display: inline-block; background: #22c55e; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Barka!</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.firstName},</h2>
              <p>Thank you for signing up for Barka! To complete your registration and set up your organization, please verify your email address.</p>
              
              <p><strong>Next Steps:</strong></p>
              <ol>
                <li>Click the verification button below</li>
                <li>Complete your organization setup</li>
                <li>Start managing your projects and team</li>
              </ol>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email & Setup Organization</a>
              </div>
              
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
              
              <p><strong>Security Note:</strong> This link will expire in 24 hours for your security.</p>
            </div>
            <div class="footer">
              <p>If you didn't create this account, please ignore this email.</p>
              <p>&copy; 2024 Barka. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Verification email sent:', info.messageId);
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

/**
 * Send organization setup completion email
 */
exports.sendOrganizationSetupCompleteEmail = async (user, organization) => {
  try {
    const transporter = createTransporter();
    
    const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard`;
    
    const mailOptions = {
      from: process.env.EMAIL_USERNAME || process.env.FROM_EMAIL || 'noreply@barka.com',
      to: user.email,
      subject: 'Organization Setup Complete - Welcome to Barka!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Setup Complete</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #22c55e; color: #fff; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .button { display: inline-block; background: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Setup Complete!</h1>
            </div>
            <div class="content">
              <h2>Congratulations, ${user.firstName}!</h2>
              <p>Your organization "<strong>${organization.name}</strong>" has been successfully created and your account is now fully set up.</p>
              
              <p><strong>What's Next:</strong></p>
              <ul>
                <li>Access your dashboard to start creating projects</li>
                <li>Invite team members to join your organization</li>
                <li>Set up your first client projects</li>
                <li>Explore Barka's AI-powered features</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
              </div>
              
              <p>Need help getting started? Check out our <a href="${process.env.FRONTEND_URL}/docs">documentation</a> or contact our support team.</p>
            </div>
            <div class="footer">
              <p>Welcome to the Barka community!</p>
              <p>&copy; 2024 Barka. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Setup complete email sent:', info.messageId);
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending setup complete email:', error);
    // Don't throw error for this email as it's not critical
    return { success: false, error: error.message };
  }
};

/**
 * Send password reset email
 */
exports.sendPasswordResetEmail = async (user, resetToken) => {
  try {
    const transporter = createTransporter();
    
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USERNAME || process.env.FROM_EMAIL || 'noreply@barka.com',
      to: user.email,
      subject: 'Reset Your Barka Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Reset Your Password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ef4444; color: #fff; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .button { display: inline-block; background: #ef4444; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.firstName},</h2>
              <p>We received a request to reset your password for your Barka account.</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666;">${resetUrl}</p>
              
              <p><strong>Security Notes:</strong></p>
              <ul>
                <li>This link will expire in 1 hour for your security</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Your password will remain unchanged until you create a new one</li>
              </ul>
            </div>
            <div class="footer">
              <p>If you have any concerns, please contact our support team.</p>
              <p>&copy; 2024 Barka. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Password reset email sent:', info.messageId);
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};
