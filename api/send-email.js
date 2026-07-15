const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse body safely
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  const { to, bcc, subject, html } = body;

  if ((!to && !bcc) || !subject || !html) {
    return res.status(400).json({ error: 'Missing required parameters: to or bcc, subject, html' });
  }

  // Read SMTP settings from environment variables with fallbacks
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER || 'techmanthan6.0@gmail.com';
  const pass = process.env.SMTP_PASS; 
  const from = process.env.SMTP_FROM || '"Tech Manthan 6.0" <techmanthan6.0@gmail.com>';

  if (!pass) {
    console.error('SMTP App Password (SMTP_PASS) not configured in Vercel environment variables.');
    return res.status(500).json({ 
      error: 'SMTP_PASS environment variable is not configured on Vercel. Please set it in your Vercel Project Settings.' 
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: false, // 587 uses TLS/STARTTLS
      auth: { user, pass }
    });

    const info = await transporter.sendMail({
      from,
      to: to || from,
      bcc,
      subject,
      html
    });

    console.log('Email sent successfully: %s', info.messageId);
    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
};
