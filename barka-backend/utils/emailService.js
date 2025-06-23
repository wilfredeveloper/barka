const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');

/**
 * Email service for sending emails
 */
class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Register handlebars helpers
    handlebars.registerHelper('formatDate', function(date) {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    });
  }

  /**
   * Load and compile an email template
   * @param {string} templateName - Name of the template file (without extension)
   * @param {Object} data - Data to be passed to the template
   * @returns {string} - Compiled HTML
   */
  async compileTemplate(templateName, data) {
    try {
      const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.hbs`);
      
      // Check if template exists, if not use a default template
      let templateContent;
      if (fs.existsSync(templatePath)) {
        templateContent = fs.readFileSync(templatePath, 'utf8');
      } else {
        // Use default template if specific template doesn't exist
        templateContent = this.getDefaultTemplate(templateName);
      }
      
      const template = handlebars.compile(templateContent);
      return template(data);
    } catch (error) {
      console.error('Error compiling email template:', error);
      // Fallback to a very simple template
      return `<h1>${data.subject || 'Barka Notification'}</h1><p>${data.message || ''}</p>`;
    }
  }

  /**
   * Get default template for different email types
   * @param {string} templateName - Name of the template
   * @returns {string} - Default template HTML
   */
  getDefaultTemplate(templateName) {
    switch (templateName) {
      case 'welcome':
        return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Barka</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header { 
              background-color: #ff6b00; 
              padding: 20px;
              text-align: center;
              color: white;
              border-radius: 5px 5px 0 0;
            }
            .content { 
              padding: 20px;
              background-color: #f9f9f9;
              border: 1px solid #ddd;
            }
            .footer { 
              text-align: center;
              padding: 10px;
              font-size: 12px;
              color: #666;
            }
            .button {
              display: inline-block;
              background-color: #ff6b00;
              color: white;
              text-decoration: none;
              padding: 10px 20px;
              border-radius: 5px;
              margin: 20px 0;
            }
            .credentials {
              background-color: #f0f0f0;
              padding: 15px;
              border-radius: 5px;
              margin: 15px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Welcome to Barka</h1>
          </div>
          <div class="content">
            <p>Hello {{firstName}},</p>
            <p>Welcome to Barka! You've been added as a client by {{organizationName}}.</p>
            <p>Barka is an AI-powered onboarding assistant that will help gather your project requirements and guide you through the onboarding process.</p>
            
            <div class="credentials">
              <p><strong>Your login credentials:</strong></p>
              <p>Email: {{email}}</p>
              <p>Password: {{password}}</p>
              <p><em>Please change your password after your first login for security reasons.</em></p>
            </div>
            
            <p>Click the button below to log in and start your onboarding process:</p>
            <a href="{{loginUrl}}" class="button">Log In to Barka</a>
            
            <p>If you have any questions, please contact your project manager at {{organizationName}}.</p>
          </div>
          <div class="footer">
            <p>&copy; {{currentYear}} Barka. All rights reserved.</p>
          </div>
        </body>
        </html>
        `;
      
      default:
        return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>{{subject}}</title>
        </head>
        <body>
          <h1>{{subject}}</h1>
          <p>{{message}}</p>
        </body>
        </html>
        `;
    }
  }

  /**
   * Send an email
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.html - Email HTML content
   * @param {string} options.text - Email text content (fallback)
   * @returns {Promise} - Nodemailer send result
   */
  async sendEmail(options) {
    try {
      const mailOptions = {
        from: `"Barka" <${process.env.EMAIL_USERNAME}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || 'Please view this email in a modern email client that supports HTML.',
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Send welcome email to a new client
   * @param {Object} client - Client data
   * @param {string} client.email - Client email
   * @param {string} client.firstName - Client first name
   * @param {string} client.lastName - Client last name
   * @param {string} client.password - Client temporary password
   * @param {Object} organization - Organization data
   * @returns {Promise} - Email send result
   */
  async sendClientWelcomeEmail(client, organization) {
    try {
      const baseUrl = process.env.FRONTEND_URL;
      const loginUrl = `${baseUrl}/auth/login`;
      
      const templateData = {
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        password: client.password,
        organizationName: organization.name,
        loginUrl,
        currentYear: new Date().getFullYear()
      };

      const html = await this.compileTemplate('welcome', templateData);
      
      return this.sendEmail({
        to: client.email,
        subject: 'Welcome to Barka - Your Onboarding Assistant',
        html
      });
    } catch (error) {
      console.error('Error sending welcome email:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();
