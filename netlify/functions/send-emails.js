const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  const headers = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'};
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { from_email, from_password, from_name, to, cc, subject, html, text } = JSON.parse(event.body);
    if (!from_email || !from_password || !to || !subject) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Faltan campos requeridos' }) };

    // Detectar servidor según dominio
    const domain = from_email.split('@')[1]||'';
    let host = 'mail.metogroup.mx';
    let port = 465;
    if(domain.endsWith('.ar') || domain === 'metogroup.com') {
      host = 'c2741653.ferozo.com';
      port = 465;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: true,
      auth: { user: from_email, pass: from_password },
      tls: { rejectUnauthorized: false }
    });

    await transporter.sendMail({
      from: from_name ? `"${from_name}" <${from_email}>` : from_email,
      to,
      cc: cc || undefined,
      subject,
      html: html || undefined,
      text: text || undefined
    });

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error al enviar', detail: error.message }) };
  }
};
