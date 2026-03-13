const { ImapFlow } = require('imapflow');

exports.handler = async (event) => {
  const headers = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'};
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { email, password, action, folder, page, messageId, limit } = JSON.parse(event.body);
    if (!email || !password) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Faltan credenciales' }) };

    // Detectar servidor según dominio
    const domain = email.split('@')[1]||'';
    let host = 'mail.metogroup.mx';
    if(domain.endsWith('.ar') || domain === 'metogroup.com') host = 'c2741653.ferozo.com';

    const client = new ImapFlow({ host, port: 993, secure: true, auth: { user: email, pass: password }, tls: { rejectUnauthorized: false }, logger: false });
    await client.connect();

    if (action === 'folders') {
      const list = await client.list();
      const folders = list.map(mb => ({ name: mb.name, path: mb.path, specialUse: mb.specialUse || null }));
      await client.logout();
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, folders }) };
    }

    if (action === 'list') {
      const mb = folder || 'INBOX';
      const perPage = limit || 20;
      const pg = page || 1;
      const lock = await client.getMailboxLock(mb);
      try {
        const total = client.mailbox.exists;
        if (total === 0) { lock.release(); await client.logout(); return { statusCode: 200, headers, body: JSON.stringify({ success: true, messages: [], total: 0, page: pg, pages: 0 }) }; }
        const end = total;
        const start = Math.max(1, total - (pg * perPage) + 1);
        const messages = [];
        for await (const msg of client.fetch(`${start}:${end}`, { envelope: true, flags: true, uid: true })) {
          messages.push({ uid: msg.uid, seq: msg.seq, date: msg.envelope.date, subject: msg.envelope.subject || '(Sin asunto)', from: msg.envelope.from ? msg.envelope.from.map(f => ({ name: f.name, address: f.mailbox + '@' + f.host })) : [], to: msg.envelope.to ? msg.envelope.to.map(t => ({ name: t.name, address: t.mailbox + '@' + t.host })) : [], seen: msg.flags.has('\\Seen'), flagged: msg.flags.has('\\Flagged') });
        }
        messages.sort((a, b) => new Date(b.date) - new Date(a.date));
        const sliced = messages.slice((pg-1)*perPage, pg*perPage);
        lock.release(); await client.logout();
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, messages: sliced, total, page: pg, pages: Math.ceil(total / perPage) }) };
      } catch (e) { lock.release(); throw e; }
    }

    if (action === 'read') {
      const mb = folder || 'INBOX';
      const lock = await client.getMailboxLock(mb);
      try {
        const uid = parseInt(messageId);
        const source = await client.download(uid.toString(), undefined, { uid: true });
        const chunks = [];
        for await (const chunk of source.content) chunks.push(chunk);
        const raw = Buffer.concat(chunks).toString();
        let body = '', textBody = '';
        const htmlMatch = raw.match(/Content-Type:\s*text\/html[\s\S]*?\r\n\r\n([\s\S]*?)(?:\r\n--|\r\n\.\r\n|$)/i);
        const textMatch = raw.match(/Content-Type:\s*text\/plain[\s\S]*?\r\n\r\n([\s\S]*?)(?:\r\n--|\r\n\.\r\n|$)/i);
        if (htmlMatch) body = htmlMatch[1];
        if (textMatch) textBody = textMatch[1];
        if (!body && !textBody) { const idx = raw.indexOf('\r\n\r\n'); if (idx > 0) textBody = raw.substring(idx + 4, Math.min(idx + 10004, raw.length)); }
        await client.messageFlagsAdd(uid.toString(), ['\\Seen'], { uid: true });
        lock.release(); await client.logout();
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, html: body, text: textBody }) };
      } catch (e) { lock.release(); throw e; }
    }

    if (action === 'delete') {
      const mb = folder || 'INBOX';
      const lock = await client.getMailboxLock(mb);
      try {
        const uid = parseInt(messageId);
        await client.messageFlagsAdd(uid.toString(), ['\\Deleted'], { uid: true });
        await client.messageDelete(uid.toString(), { uid: true });
        lock.release(); await client.logout();
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      } catch (e) { lock.release(); throw e; }
    }

    await client.logout();
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Acción no válida' }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error de correo', detail: error.message }) };
  }
};
