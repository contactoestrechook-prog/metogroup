const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { from_email, from_password, from_name, to, cc, bcc, subject, html, text } = JSON.parse(event.body);

    if (!from_email || !from_password || !to || !subject) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Faltan campos requeridos' }) };
    }

    const transporter = nodemailer.createTransport({
      host: 'c2741653.ferozo.com',
      port: 465,
      secure: true,
      auth: { user: from_email, pass: from_password },
      tls: { rejectUnauthorized: false }
    });

    const info = await transporter.sendMail({
      from: from_name ? `"${from_name}" <${from_email}>` : from_email,
      to: Array.isArray(to) ? to.join(', ') : to,
      cc: cc || undefined,
      bcc: bcc || undefined,
      subject: subject,
      text: text || '',
      html: html || ''
    });

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, messageId: info.messageId }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error enviando email', detail: error.message }) };
  }
};
