const nodemailer = require('nodemailer');

// Email sending endpoint
const EmailForm = async (req, res) => {
    const { to, subject, text, html } = req.body;
  
    // Check if credentials exist
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Email credentials missing in environment variables');
      return res.status(500).json({ message: 'Server configuration error: Missing email credentials' });
    }

    try {
      // Configure transporter with Gmail SMTP server
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
  
      // Define email options
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        text: text || '',
        html: html || '',
      };
  
      // Send email
      const info = await transporter.sendMail(mailOptions);
      res.status(200).json({ message: 'Email sent successfully', info });
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ message: 'Failed to send email', error: error.message });
    }
}

module.exports = { EmailForm };
