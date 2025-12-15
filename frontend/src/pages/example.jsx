import React, { useState } from 'react';
import { emailSent } from '../services/emailService.js';

function EmailForm() {
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    text: '',
  });

  const handleChange = (e) => {
    setEmailData({ ...emailData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await emailSent(emailData);
      alert(response.message || 'Email sent successfully');
    } catch (error) {
      console.error(error);
      alert('Failed to send email');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" name="to" placeholder="Recipient Email" onChange={handleChange} required />
      <input type="text" name="subject" placeholder="Subject" onChange={handleChange} required />
      <textarea name="text" placeholder="Message" onChange={handleChange} required />
      <button type="submit">Send Email</button>
    </form>
  );
}

export default EmailForm;
