// netlify/functions/signnow.js
// Función Netlify para integración con SignNow API

const SIGNNOW_API = 'https://api.signnow.com';
const SIGNNOW_API_KEY = '776b4ece72fcff7b42d4524e23accc4ea20d1f8710761b99da8b8155a20da94d';
const SIGNNOW_EMAIL = 'administracion@metogroup.ar';
const LEANDRO_EMAIL = 'leandroalonso@metogroup.mx';
const LEANDRO_NOMBRE = 'Leandro Alonso';

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

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { action, ...data } = body;

  try {
    // ── Autenticar con SignNow ──
    const authRes = await fetch(`${SIGNNOW_API}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(SIGNNOW_API_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials&scope=*'
    });

    if (!authRes.ok) {
      const err = await authRes.text();
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Auth failed: ' + err }) };
    }

    const authData = await authRes.json();
    const token = authData.access_token;

    if (action === 'send_contract') {
      return await sendContract(token, data, headers);
    } else if (action === 'check_status') {
      return await checkStatus(token, data, headers);
    } else {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action: ' + action }) };
    }

  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};

// ── Enviar contrato para firma ──
async function sendContract(token, data, headers) {
  const {
    templateId,
    clienteNombre,
    clienteEmail,
    clienteEmpresa,
    clienteCuit,
    montoTotal,
    formaPago,
    nCuotas,
    fechaContrato,
    auditoriaId
  } = data;

  // 1. Crear documento desde template
  const createRes = await fetch(`${SIGNNOW_API}/template/${templateId}/multifill`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      document_name: `Contrato BPC:2026 — ${clienteEmpresa || clienteNombre}`,
      documents: [{
        roles: [
          {
            unique_id: 'cliente',
            name: 'Cliente',
            prefill_signature_name: clienteNombre,
            email: clienteEmail
          },
          {
            unique_id: 'metogroup',
            name: 'MetoGroup',
            prefill_signature_name: LEANDRO_NOMBRE,
            email: LEANDRO_EMAIL
          }
        ],
        fields: [
          { external_id: 'cliente_nombre',  prefilled_text: clienteNombre || '' },
          { external_id: 'cliente_empresa', prefilled_text: clienteEmpresa || clienteNombre || '' },
          { external_id: 'cliente_email',   prefilled_text: clienteEmail || '' },
          { external_id: 'cliente_cuit',    prefilled_text: clienteCuit || '' },
          { external_id: 'monto_total',     prefilled_text: '$ ' + Number(montoTotal).toLocaleString('es-AR') || '' },
          { external_id: 'forma_pago',      prefilled_text: formaPago || '' },
          { external_id: 'n_cuotas',        prefilled_text: String(nCuotas || 1) },
          { external_id: 'fecha_contrato',  prefilled_text: fechaContrato || new Date().toLocaleDateString('es-AR') },
        ]
      }]
    })
  });

  const createData = await createRes.json();
  if (!createRes.ok) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Create doc failed', detail: createData }) };
  }

  const docId = createData.documents?.[0]?.id || createData.id;
  if (!docId) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'No document ID returned', detail: createData }) };
  }

  // 2. Enviar invitaciones de firma
  const inviteRes = await fetch(`${SIGNNOW_API}/document/${docId}/invite`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: SIGNNOW_EMAIL,
      to: [
        {
          email: clienteEmail,
          role: 'Cliente',
          role_id: '',
          order: 1,
          subject: `Contrato de Auditoría BPC:2026 — ${clienteEmpresa || clienteNombre}`,
          message: `Estimado/a ${clienteNombre},\n\nAdjunto encontrará el contrato de Auditoría BPC:2026 para su revisión y firma. Por favor, fírmelo digitalmente desde el enlace.\n\nQuedo a disposición para cualquier consulta.\n\nHernán Quiroz — MetoGroup`
        },
        {
          email: LEANDRO_EMAIL,
          role: 'MetoGroup',
          role_id: '',
          order: 2,
          subject: `[Firma requerida] Contrato BPC:2026 — ${clienteEmpresa || clienteNombre}`,
          message: `Contrato de auditoría BPC:2026 para ${clienteEmpresa || clienteNombre} listo para tu firma.`
        }
      ]
    })
  });

  const inviteData = await inviteRes.json();
  if (!inviteRes.ok) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Invite failed', detail: inviteData }) };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      documentId: docId,
      status: 'pending',
      message: `Contrato enviado a ${clienteEmail} y ${LEANDRO_EMAIL}`,
      signnowUrl: `https://app.signnow.com/webapp/document/${docId}`
    })
  };
}

// ── Verificar estado del contrato ──
async function checkStatus(token, data, headers) {
  const { documentId } = data;

  const res = await fetch(`${SIGNNOW_API}/document/${documentId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const doc = await res.json();
  if (!res.ok) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Status check failed', detail: doc }) };
  }

  const signatures = doc.signatures || [];
  const totalSigners = 2;
  const signed = signatures.filter(s => s.created).length;
  const fullySignedAt = signed === totalSigners ? doc.updated : null;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      documentId,
      status: signed === totalSigners ? 'completed' : signed > 0 ? 'partial' : 'pending',
      signed,
      totalSigners,
      fullySignedAt,
      documentName: doc.document_name,
      signnowUrl: `https://app.signnow.com/webapp/document/${documentId}`
    })
  };
}
