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

  let host = process.env.SMTP_HOST || 'smtp.gmail.com';
  let port = parseInt(process.env.SMTP_PORT || '587');
  let user = process.env.SMTP_USER;
  let pass = process.env.SMTP_PASS;
  let from = process.env.SMTP_FROM || `"Tech Manthan 6.0" <noreply@techmanthan.org>`;

  // Try to load credentials from Firestore REST API
  try {
    const url = 'https://firestore.googleapis.com/v1/projects/techmanthana/databases/(default)/documents/settings/emailConfig';
    const dbRes = await fetch(url);
    if (dbRes.ok) {
      const dbData = await dbRes.json();
      if (dbData.fields) {
        const fields = dbData.fields;
        if (fields.user && fields.user.stringValue) user = fields.user.stringValue;
        if (fields.pass && fields.pass.stringValue) pass = fields.pass.stringValue;
        if (fields.host && fields.host.stringValue) host = fields.host.stringValue;
        if (fields.port) {
          port = parseInt(fields.port.integerValue || fields.port.stringValue || '587');
        }
        if (fields.from && fields.from.stringValue) from = fields.from.stringValue;
        console.log('Using SMTP configuration from Firestore database.');
      }
    } else {
      console.log('No SMTP configuration found in Firestore settings/emailConfig, falling back to environment variables.');
    }
  } catch (dbError) {
    console.error('Error fetching email configuration from Firestore REST API:', dbError);
  }

  if (!user || !pass) {
    console.warn('SMTP credentials not configured. Logging email to console.');
    console.log('TO:', to || 'BCC list');
    console.log('BCC:', bcc);
    console.log('SUBJECT:', subject);
    return res.status(200).json({ 
      success: true, 
      warning: 'SMTP credentials not configured in Firestore settings/emailConfig or environment variables. Email logged to server console.',
      loggedEmail: { to, bcc, subject } 
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
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
