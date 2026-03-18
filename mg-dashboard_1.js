
// ══════════════════════════════════════════════════════════════════
// GENERADOR DE INFORME BPC:2026 — IA + Dos versiones
// ══════════════════════════════════════════════════════════════════

async function generarInformeIA(audId){
  const aud = (S.get('auditorias')||[]).find(x=>x.id===audId);
  if(!aud){ toast('❌ Auditoría no encontrada'); return; }
  if(!ANTHROPIC_API_KEY){ toast('❌ Configurá la API key de Claude'); return; }

  const cliente = (S.get('clientes')||[]).find(c=>String(c.id)===String(aud.clienteId))||{};
  const consultor = (S.get('auditores')||[]).find(a=>a.nombre===aud.auditor)||{};

  // Recopilar datos de dominios
  const DOMINIOS = [
    {ref:'A.5', nombre:'Estrategia y Gobernanza'},
    {ref:'A.6', nombre:'Recursos Humanos Comerciales'},
    {ref:'A.7', nombre:'Canales y Procesos de Venta'},
    {ref:'A.8', nombre:'Comunicación y Marca'},
    {ref:'A.9', nombre:'Tecnología y Herramientas'},
    {ref:'A.10', nombre:'Ética y Cumplimiento'},
    {ref:'A.11', nombre:'Datos y Clientes'},
    {ref:'A.12', nombre:'Medición y Mejora Continua'},
  ];

  const dominiosData = DOMINIOS.map((d,i)=>{
    const raw = aud['dom_'+(i+5)] ? JSON.parse(aud['dom_'+(i+5)]) : {};
    return {
      ...d,
      score: Number(raw.score)||0,
      nc_critica: Number(raw.nc_critica)||0,
      nc_mayor: Number(raw.nc_mayor)||0,
      nc_menor: Number(raw.nc_menor)||0,
      hallazgo: raw.hallazgo||''
    };
  });

  const scoreGlobal = Number(aud.resultado)||0;
  const nivel = scoreGlobal>=75?'ALTO':scoreGlobal>=50?'MEDIO':'BAJO';
  const ncCriticas = dominiosData.reduce((s,d)=>s+d.nc_critica,0);
  const ncMayores  = dominiosData.reduce((s,d)=>s+d.nc_mayor,0);
  const ncMenores  = dominiosData.reduce((s,d)=>s+d.nc_menor,0);
  const conformes  = 47 - ncCriticas - ncMayores - ncMenores;
  const fmtD2 = f=>f?f.split('-').reverse().join('/'):'—';

  // Mostrar overlay de carga
  const loadOv = document.createElement('div');
  loadOv.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px';
  loadOv.innerHTML='<div style="font-size:32px">⬡</div>'
    +'<div style="font-family:\'Syne\',sans-serif;font-size:18px;font-weight:700;color:#c8a84a">Generando Informe BPC:2026</div>'
    +'<div id="informe-progress" style="font-size:13px;color:#888">Analizando datos de la auditoría...</div>'
    +'<div style="width:300px;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden"><div id="informe-bar" style="width:0%;height:100%;background:#c8a84a;border-radius:2px;transition:width 0.5s"></div></div>';
  document.body.appendChild(loadOv);

  const setProgress = (pct, txt) => {
    document.getElementById('informe-progress').textContent = txt;
    document.getElementById('informe-bar').style.width = pct+'%';
  };

  try {
    setProgress(15, 'Consultando a Claude API...');

    // Prompt para Claude — genera el contenido narrativo del informe
    const prompt = `Sos el sistema de análisis de MetoGroup Latam S.A. Generás el contenido narrativo de un Informe de Auditoría BPC:2026.

DATOS DE LA AUDITORÍA:
- Organización auditada: ${aud.clienteNombre}
- Rubro: ${cliente.rubro||'No especificado'}
- Auditor líder: ${aud.auditor||'No asignado'}
- Fecha cierre: ${fmtD2(aud.fCierre||aud.fInforme)}
- N° Auditoría: ${aud.nroAuditoria||'MG-BPC-2026-___'}
- Score global: ${scoreGlobal}/100 — Nivel ${nivel}
- NC Críticas: ${ncCriticas} | NC Mayores: ${ncMayores} | NC Menores: ${ncMenores} | Conformes: ${conformes}/47

RESULTADOS POR DOMINIO:
${dominiosData.map(d=>`${d.ref} ${d.nombre}: ${d.score}/100 | C:${d.nc_critica} M:${d.nc_mayor} Mn:${d.nc_menor} | Hallazgo: ${d.hallazgo||'Sin hallazgos registrados'}`).join('\n')}

NOTAS DEL CONSULTOR:
${aud.notas_informe||'Sin notas adicionales'}

Generá el contenido JSON con exactamente esta estructura. Respondé SOLO con el JSON, sin backticks ni texto adicional:
{
  "resumen_ejecutivo": "párrafo de 3-4 oraciones describiendo el estado comercial general de la organización, los hallazgos más relevantes y el potencial de mejora",
  "conclusion_auditor": "párrafo de 4-5 oraciones para la conclusión formal del auditor, profesional y técnico",
  "dominios": [
    {
      "ref": "A.5",
      "descripcion_hallazgo": "descripción técnica del hallazgo o estado conforme del dominio, 2-3 oraciones",
      "accion_correctiva": "acción correctiva específica y accionable, 1-2 oraciones",
      "responsable": "rol o área responsable",
      "plazo": "30 días / 60 días / 90 días"
    }
  ],
  "fortalezas": ["fortaleza 1", "fortaleza 2", "fortaleza 3"],
  "plan_fases": {
    "fase1": ["acción inmediata 1 (0-7 días)", "acción inmediata 2"],
    "fase2": ["acción corto plazo 1 (8-30 días)", "acción corto plazo 2"],
    "fase3": ["acción mediano plazo 1 (31-90 días)", "acción mediano plazo 2"]
  }
}`;

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        model:'claude-sonnet-4-20250514',
        max_tokens:2000,
        messages:[{role:'user', content: prompt}]
      })
    });
    const respData = await resp.json();
    const rawText = respData.content?.[0]?.text||'{}';

    setProgress(50, 'Procesando análisis de la IA...');
    let contenidoIA = {};
    try { contenidoIA = JSON.parse(rawText.replace(/```json|```/g,'').trim()); }
    catch(e){ console.error('Error parseando JSON de IA:', e); }

    setProgress(70, 'Construyendo informe interno...');
    const htmlInterno = construirInformeInterno(aud, cliente, consultor, dominiosData, contenidoIA, scoreGlobal, nivel, ncCriticas, ncMayores, ncMenores, conformes);

    setProgress(85, 'Construyendo informe Premium para el cliente...');
    const htmlCliente = construirInformeCliente(aud, cliente, consultor, dominiosData, contenidoIA, scoreGlobal, nivel, ncCriticas, ncMayores, ncMenores, conformes);

    setProgress(95, 'Guardando informes...');

    // Guardar ambos informes en localStorage
    const informeKey = 'METO_informe_'+audId;
    localStorage.setItem(informeKey, JSON.stringify({
      interno: htmlInterno,
      cliente: htmlCliente,
      generado: new Date().toISOString(),
      score: scoreGlobal
    }));

    // Marcar auditoría como con informe generado
    const auds = S.get('auditorias');
    const ai = auds.findIndex(x=>x.id===audId);
    if(ai>-1){
      auds[ai].informe_generado = true;
      auds[ai].informe_fecha = new Date().toISOString().split('T')[0];
      S.set('auditorias', auds);
    }

    setProgress(100, '¡Informe generado!');
    document.body.removeChild(loadOv);

    // Notificar al consultor
    await notificarFirmaConsultor(audId);

    // Abrir visor de informes
    verInformeGenerado(audId);

  } catch(e){
    document.body.removeChild(loadOv);
    console.error('Error generando informe:', e);
    toast('❌ Error generando informe: '+e.message);
  }
}

// ── Visor de los dos informes con tabs ────────────────────────────
function verInformeGenerado(audId){
  const stored = localStorage.getItem('METO_informe_'+audId);
  if(!stored){ toast('❌ No hay informe generado para esta auditoría'); return; }
  const {interno, cliente} = JSON.parse(stored);

  const ov = document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:99999;display:flex;flex-direction:column;overflow:hidden';
  ov.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:#111;border-bottom:1px solid rgba(200,168,74,0.2);flex-shrink:0">'
    +'<div style="display:flex;gap:8px">'
    +'<button id="tab-interno" onclick="switchInformeTab(\'interno\')" style="padding:7px 16px;border-radius:6px;border:1px solid rgba(200,168,74,0.4);background:rgba(200,168,74,0.15);color:#c8a84a;font-size:12px;font-weight:700;cursor:pointer">📋 Interno MetoGroup</button>'
    +'<button id="tab-cliente" onclick="switchInformeTab(\'cliente\')" style="padding:7px 16px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#888;font-size:12px;cursor:pointer">⬡ Premium Cliente</button>'
    +'</div>'
    +'<div style="display:flex;gap:8px">'
    +'<button onclick="descargarInformePDF('+audId+',\'interno\')" style="padding:7px 14px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:#aaa;font-size:12px;cursor:pointer">⬇ PDF Interno</button>'
    +'<button onclick="descargarInformePDF('+audId+',\'cliente\')" style="padding:7px 14px;border-radius:6px;border:1px solid rgba(200,168,74,0.3);background:rgba(200,168,74,0.1);color:#c8a84a;font-size:12px;cursor:pointer">⬇ PDF Cliente</button>'
    +'<button onclick="firmarInforme('+audId+')" style="padding:7px 14px;border-radius:6px;border:1px solid rgba(34,197,94,0.4);background:rgba(34,197,94,0.1);color:#4ade80;font-size:12px;cursor:pointer">✍ Firmar</button>'
    +'<button onclick="this.closest(\'div[style*=fixed]\').remove()" style="padding:7px 14px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#888;font-size:12px;cursor:pointer">✕ Cerrar</button>'
    +'</div>'
    +'</div>'
    +'<iframe id="informe-iframe" srcdoc="" style="flex:1;border:none;background:#fff"></iframe>';
  document.body.appendChild(ov);
  window._informeData = {interno, cliente, audId};
  switchInformeTab('interno');
}

function switchInformeTab(tab){
  if(!window._informeData) return;
  document.getElementById('informe-iframe').srcdoc = window._informeData[tab];
  ['interno','cliente'].forEach(t=>{
    const btn = document.getElementById('tab-'+t);
    if(!btn) return;
    if(t===tab){
      btn.style.background='rgba(200,168,74,0.15)';
      btn.style.color='#c8a84a';
      btn.style.borderColor='rgba(200,168,74,0.4)';
    } else {
      btn.style.background='transparent';
      btn.style.color='#888';
      btn.style.borderColor='rgba(255,255,255,0.1)';
    }
  });
}

function descargarInformePDF(audId, tipo){
  const stored = localStorage.getItem('METO_informe_'+audId);
  if(!stored) return;
  const {interno, cliente} = JSON.parse(stored);
  const html = tipo==='interno' ? interno : cliente;
  // Abrir en nueva ventana para imprimir como PDF
  const win = window.open('','_blank');
  win.document.write(html);
  win.document.close();
  setTimeout(()=> win.print(), 800);
}

// ── Modal de firma ────────────────────────────────────────────────
function firmarInforme(audId){
  const aud = (S.get('auditorias')||[]).find(x=>x.id===audId);
  if(!aud) return;
  const ov2 = document.createElement('div');
  ov2.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px';
  const yaFirmadoConsultor = aud.firma_consultor_ok;
  const yaFirmadoDueno = aud.firma_dueno_ok;
  ov2.innerHTML='<div style="background:#1a1a1a;border:1px solid rgba(200,168,74,0.3);border-radius:16px;width:500px;max-width:95vw;padding:28px">'
    +'<div style="font-family:\'Syne\',sans-serif;font-size:18px;font-weight:800;color:#c8a84a;margin-bottom:4px">✍ Firma del Informe BPC:2026</div>'
    +'<div style="font-size:12px;color:#666;margin-bottom:24px">'+aud.clienteNombre+' · '+aud.nroAuditoria+'</div>'
    // Firma consultor
    +'<div style="background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.1);border-radius:10px;padding:16px;margin-bottom:12px">'
    +'<div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Auditor Líder</div>'
    +(yaFirmadoConsultor
      ? '<div style="color:#4ade80;font-size:13px">✓ Firmado por '+aud.firma_consultor_nombre+' · '+aud.firma_consultor_fecha+'</div>'
      : '<input id="firma-consultor-nombre" placeholder="Nombre completo del consultor" style="width:100%;background:#111;border:1px solid #333;border-radius:6px;padding:9px 12px;color:#fff;font-size:13px;margin-bottom:8px">'
        +'<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#ccc;cursor:pointer"><input type="checkbox" id="firma-consultor-check"> Certifico que revisé y apruebo el contenido del informe BPC:2026 para '+aud.clienteNombre+'</label>'
        +'<button onclick="ejecutarFirma('+audId+',\'consultor\')" style="margin-top:10px;padding:8px 16px;border-radius:6px;border:1px solid rgba(200,168,74,0.3);background:rgba(200,168,74,0.1);color:#c8a84a;font-size:12px;cursor:pointer">✍ Firmar como Auditor</button>')
    +'</div>'
    // Firma dueño
    +'<div style="background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.1);border-radius:10px;padding:16px;margin-bottom:20px">'
    +'<div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Representante de la Organización</div>'
    +(yaFirmadoDueno
      ? '<div style="color:#4ade80;font-size:13px">✓ Firmado por '+aud.firma_dueno_nombre+' · '+aud.firma_dueno_fecha+'</div>'
      : (!yaFirmadoConsultor
        ? '<div style="font-size:12px;color:#666;font-style:italic">Disponible una vez que el auditor firme</div>'
        : '<input id="firma-dueno-nombre" placeholder="Nombre completo del representante" style="width:100%;background:#111;border:1px solid #333;border-radius:6px;padding:9px 12px;color:#fff;font-size:13px;margin-bottom:8px">'
          +'<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#ccc;cursor:pointer"><input type="checkbox" id="firma-dueno-check"> Confirmo la recepción y conformidad con el Informe de Auditoría BPC:2026</label>'
          +'<button onclick="ejecutarFirma('+audId+',\'dueno\')" style="margin-top:10px;padding:8px 16px;border-radius:6px;border:1px solid rgba(34,197,94,0.3);background:rgba(34,197,94,0.1);color:#4ade80;font-size:12px;cursor:pointer">✍ Firmar como Representante</button>'))
    +'</div>'
    +(yaFirmadoConsultor && yaFirmadoDueno
      ? '<button onclick="agenteEnviarInformeCliente('+audId+');this.closest(\'div[style*=fixed]\').remove()" style="width:100%;padding:12px;border-radius:8px;border:1px solid rgba(200,168,74,0.4);background:linear-gradient(135deg,rgba(200,168,74,0.2),rgba(200,168,74,0.1));color:#c8a84a;font-size:13px;font-weight:700;cursor:pointer">🚀 Informe firmado — Enviar al cliente y agendar reunión</button>'
      : '')
    +'<button onclick="this.closest(\'div[style*=fixed]\').remove()" style="width:100%;margin-top:10px;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:#666;font-size:12px;cursor:pointer">Cerrar</button>'
    +'</div>';
  document.body.appendChild(ov2);
}

function ejecutarFirma(audId, rol){
  const nombreEl = document.getElementById('firma-'+rol+'-nombre');
  const checkEl  = document.getElementById('firma-'+rol+'-check');
  if(!nombreEl?.value.trim()){ toast('⚠️ Ingresá el nombre completo'); return; }
  if(!checkEl?.checked){ toast('⚠️ Aceptá la declaración para firmar'); return; }
  const auds = S.get('auditorias');
  const idx = auds.findIndex(x=>x.id===audId);
  if(idx<0) return;
  auds[idx]['firma_'+rol+'_ok'] = true;
  auds[idx]['firma_'+rol+'_nombre'] = nombreEl.value.trim();
  auds[idx]['firma_'+rol+'_fecha'] = todayStr();
  if(rol==='consultor') auds[idx].informe_firmado = true;
  if(rol==='dueno') auds[idx].firma_completa = true;
  S.set('auditorias', auds);
  toast('✅ Firmado correctamente');
  // Reabrir modal de firma actualizado
  document.querySelector('div[style*="z-index: 100000"], div[style*="z-index:100000"]')?.remove();
  firmarInforme(audId);
  // Si firmó el dueño, notificar a Ariel
  if(rol==='dueno'){
    const aud = auds[idx];
    const ariel = (S.get('usuarios')||[]).find(u=>u.nombre?.toLowerCase().includes('ariel')&&u.rol==='dueno');
    if(ariel?.email){
      const emailCfg = (S.get('email_config')||[])[0]||{};
      if(emailCfg.smtp_user){
        fetch('/.netlify/functions/send-email',{
          method:'POST', headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            from_email:emailCfg.smtp_user, from_password:emailCfg.smtp_pass,
            from_name:AGENTE.EMAIL_AGENTE_NOMBRE||'MetoGroup',
            to:ariel.email,
            subject:'✍ Informe firmado — '+aud.clienteNombre+' — Listo para enviar al cliente',
            html:'<div style="font-family:Arial,sans-serif;padding:24px"><h2 style="color:#c8a84a">Informe BPC:2026 firmado</h2><p>El informe de <strong>'+aud.clienteNombre+'</strong> fue firmado por el auditor y el representante de la organización.</p><p>Score: <strong>'+aud.resultado+'/100</strong></p><p>Ya podés enviarlo al cliente desde el mapa de auditoría.</p></div>',
            text:'Informe BPC:2026 de '+aud.clienteNombre+' firmado y listo para enviar al cliente.'
          })
        }).catch(()=>{});
      }
    }
  }
}

// ── Notificar al consultor para que firme ─────────────────────────
async function notificarFirmaConsultor(audId){
  const aud = (S.get('auditorias')||[]).find(x=>x.id===audId);
  if(!aud) return;
  const consultor = (S.get('auditores')||[]).find(a=>a.nombre===aud.auditor);
  if(!consultor?.email) return;
  const emailCfg = (S.get('email_config')||[])[0]||{};
  if(!emailCfg.smtp_user) return;
  const baseUrl = window.location.origin + window.location.pathname;
  await fetch('/.netlify/functions/send-email',{
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      from_email:emailCfg.smtp_user, from_password:emailCfg.smtp_pass,
      from_name:AGENTE.EMAIL_AGENTE_NOMBRE||'MetoGroup',
      to:consultor.email,
      subject:'📋 Informe BPC:2026 generado — Revisión y firma requerida: '+aud.clienteNombre,
      html:'<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px">'
        +'<div style="font-size:22px;font-weight:700;margin-bottom:4px">MetoGroup</div>'
        +'<div style="font-size:10px;letter-spacing:2px;color:#888;text-transform:uppercase;margin-bottom:24px">Auditoría BPC:2026</div>'
        +'<p>Hola <strong>'+consultor.nombre+'</strong>,</p>'
        +'<p style="color:#444;line-height:1.7">El informe de auditoría BPC:2026 de <strong>'+aud.clienteNombre+'</strong> fue generado por el sistema. Score: <strong>'+aud.resultado+'/100</strong>.</p>'
        +'<p style="color:#444;line-height:1.7">Por favor ingresá al sistema para revisar el informe y firmarlo antes de que sea enviado al cliente.</p>'
        +'<div style="text-align:center;margin:24px 0"><a href="'+baseUrl+'" style="background:#c8a84a;color:#000;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700">Revisar y firmar informe</a></div>'
        +'<p style="font-size:11px;color:#888">'+AGENTE.EMAIL_AGENTE_NOMBRE+'</p>'
        +'</div>',
      text:'Hola '+consultor.nombre+', el informe BPC:2026 de '+aud.clienteNombre+' está listo para tu revisión y firma. Accedé al sistema: '+baseUrl
    })
  }).catch(()=>{});
}

// ── Enviar informe al cliente + agendar reunión ───────────────────
async function agenteAvisarReunionCierre(aud, cliente, emailCfg){
  const fmtFecha = f => { if(!f) return ''; const [y,m,d]=f.split('-'); return d+'/'+m+'/'+y; };
  const contacto = cliente.contacto || cliente.nombre;
  const empresa  = cliente.nombre;
  const fechaInforme = fmtFecha(aud.fInforme);
  const fromName  = AGENTE.EMAIL_AGENTE_NOMBRE || 'Hernán Quiroz';
  const fromEmail = AGENTE.EMAIL_AGENTE || emailCfg.smtp_user;

  const html = '<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:40px 32px;background:#ffffff;color:#1a1a1a">'

    // Header
    +'<div style="border-bottom:2px solid #c8a84a;padding-bottom:16px;margin-bottom:32px">'
    +'<div style="font-family:Arial,sans-serif;font-size:20px;font-weight:700;color:#1a1a1a;letter-spacing:1px">MetoGroup</div>'
    +'<div style="font-family:Arial,sans-serif;font-size:9px;color:#999;letter-spacing:2px;text-transform:uppercase;margin-top:2px">Auditoría BPC:2026</div>'
    +'</div>'

    // Cuerpo
    +'<p style="font-size:15px;line-height:1.8;margin-bottom:20px">'+contacto+', buen día.</p>'

    +'<p style="font-size:15px;line-height:1.9;margin-bottom:18px">'
    +'Quería contarle que el proceso de auditoría BPC:2026 de <strong>'+empresa+'</strong> está llegando a la recta final. '
    +'Para el <strong>'+fechaInforme+'</strong> vamos a tener listo el informe con el BPC Score, el análisis detallado por dimensión y el plan de acción.</p>'

    +'<p style="font-size:15px;line-height:1.9;margin-bottom:18px">'
    +'Me gustaría coordinar una llamada de <strong>30 minutos</strong> con usted para revisar los resultados juntos antes de la entrega formal. '
    +'Es una instancia que aprovechamos para explicar cada punto, responder consultas y definir los próximos pasos en función de lo que encontramos.</p>'

    +'<p style="font-size:15px;line-height:1.9;margin-bottom:28px">'
    +'¿Tiene disponibilidad esa semana? Me adapto a su horario — puede proponerme un par de opciones y lo coordinamos sin problema.</p>'

    // Bloque destacado
    +'<div style="background:#f8f6f0;border-left:3px solid #c8a84a;padding:18px 22px;border-radius:0 6px 6px 0;margin-bottom:28px">'
    +'<div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#92770a;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px">Próximo hito</div>'
    +'<div style="font-size:14px;color:#333"><strong>'+fechaInforme+'</strong> — Entrega del Informe BPC:2026 + BPC Score</div>'
    +'<div style="font-size:13px;color:#777;margin-top:4px">Llamada previa de revisión: a coordinar con usted</div>'
    +'</div>'

    +'<p style="font-size:15px;line-height:1.8;margin-bottom:8px">Quedo a su disposición. Responda este email o escríbame por WhatsApp y lo resolvemos enseguida.</p>'

    // Firma
    +'<div style="border-top:1px solid #eee;padding-top:24px;margin-top:28px">'
    +'<p style="font-size:14px;font-weight:700;margin:0 0 4px">'+fromName+'</p>'
    +'<p style="font-family:Arial,sans-serif;font-size:12px;color:#888;margin:0 0 2px">MetoGroup Latam S.A.</p>'
    +'<a href="mailto:'+fromEmail+'" style="font-family:Arial,sans-serif;font-size:12px;color:#c8a84a;text-decoration:none">'+fromEmail+'</a>'
    +'</div>'
    +'</div>';

  try{
    await fetch('/.netlify/functions/send-email',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        from_email: emailCfg.smtp_user,
        from_password: emailCfg.smtp_pass,
        from_name: fromName,
        to: cliente.email,
        subject: 'Informe BPC:2026 listo el '+fechaInforme+' — Coordinemos una llamada | '+empresa,
        html,
        text: contacto+', el informe BPC:2026 de '+empresa+' estará listo el '+fechaInforme+'. Me gustaría coordinar una llamada de 30 minutos para revisar los resultados juntos. ¿Tiene disponibilidad esa semana? — '+fromName
      })
    });
    console.log('🤖 Agente: Aviso reunión cierre enviado a '+cliente.email);
  }catch(e){
    console.error('Agente: error enviando aviso reunión cierre', e);
  }
}


async function agenteEnviarInformeCliente(audId){
  const aud = (S.get('auditorias')||[]).find(x=>x.id===audId);
  if(!aud){ toast('❌ Auditoría no encontrada'); return; }
  const cliente = (S.get('clientes')||[]).find(c=>String(c.id)===String(aud.clienteId))||{};
  const emailCfg = (S.get('email_config')||[])[0]||{};
  if(!emailCfg.smtp_user){ toast('❌ Configurá el SMTP'); return; }

  const stored = localStorage.getItem('METO_informe_'+audId);
  if(!stored){ toast('❌ Generá el informe primero'); return; }

  const destinatario = cliente.encargado_email || cliente.email;
  const nombreDest   = cliente.encargado_nombre || cliente.contacto || cliente.nombre;
  if(!destinatario){ toast('❌ El cliente no tiene email'); return; }

  const fromName  = AGENTE.EMAIL_AGENTE_NOMBRE || 'MetoGroup';
  const fromEmail = AGENTE.EMAIL_AGENTE || emailCfg.smtp_user;
  const score     = aud.resultado || '—';
  const nivel     = score>=75?'ALTO':score>=50?'MEDIO':'BAJO';
  const fmtD2     = f=>f?f.split('-').reverse().join('/'):'—';

  // Email con informe adjunto (link al sistema)
  const baseUrl = window.location.origin + window.location.pathname;
  const htmlEmail = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#fff">'
    +'<div style="font-size:22px;font-weight:700;margin-bottom:4px;color:#1a1a1a">MetoGroup</div>'
    +'<div style="font-size:10px;letter-spacing:2px;color:#888;text-transform:uppercase;margin-bottom:28px">Auditoría BPC:2026</div>'
    +'<p style="font-size:15px;color:#1a1a1a;margin-bottom:16px">Estimado/a <strong>'+nombreDest+'</strong>,</p>'
    +'<p style="font-size:13px;color:#444;line-height:1.7;margin-bottom:20px">'
    +'Nos complace informarle que la <strong>Auditoría de Buenas Prácticas Comerciales y Éticas BPC:2026</strong> de <strong>'+aud.clienteNombre+'</strong> ha concluido. '
    +'Le adjuntamos el Informe Final de Auditoría, firmado por el Auditor Líder y el Representante de la Organización.</p>'
    +'<div style="background:#fffbea;border:2px solid #c8a84a;border-radius:10px;padding:20px 24px;margin:20px 0;text-align:center">'
    +'<div style="font-size:11px;color:#92770a;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Score Global BPC:2026</div>'
    +'<div style="font-size:48px;font-weight:900;color:#c8a84a;line-height:1">'+score+'</div>'
    +'<div style="font-size:13px;color:#92770a;margin-top:4px">/100 · Nivel '+nivel+'</div>'
    +'</div>'
    +'<p style="font-size:13px;color:#444;line-height:1.7;margin-bottom:8px">'
    +'En los próximos días nos pondremos en contacto para coordinar la <strong>Reunión de Entrega de Informe</strong> con nuestro equipo, '
    +'donde revisaremos en detalle los hallazgos y el Plan de Acción Correctivo.</p>'
    +'<p style="font-size:12px;color:#888;line-height:1.6;margin-bottom:24px">'
    +'N° de Auditoría: '+(aud.nroAuditoria||'MG-BPC-2026-___')+' · Fecha de cierre: '+fmtD2(aud.fCierre||aud.fInforme)+'</p>'
    +'<div style="border-top:1px solid #eee;padding-top:20px;font-size:11px;color:#888;line-height:1.8">'
    +fromName+'<br><a href="mailto:'+fromEmail+'" style="color:#c8a84a">'+fromEmail+'</a><br>MetoGroup Latam S.A.'
    +'</div></div>';

  try {
    await fetch('/.netlify/functions/send-email',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        from_email:emailCfg.smtp_user, from_password:emailCfg.smtp_pass,
        from_name:fromName, to:destinatario,
        subject:'📊 Informe de Auditoría BPC:2026 — Score '+score+'/100 | '+aud.clienteNombre,
        html:htmlEmail,
        text:'Informe de Auditoría BPC:2026 de '+aud.clienteNombre+' listo. Score: '+score+'/100 Nivel '+nivel+'.'
      })
    });

    // Marcar como enviado
    const auds = S.get('auditorias');
    const ai = auds.findIndex(x=>x.id===audId);
    if(ai>-1){ auds[ai].informe_enviado_cliente = true; auds[ai].informe_enviado_fecha = todayStr(); S.set('auditorias', auds); }

    toast('✅ Informe enviado a '+destinatario);

    // Agendar reunión de entrega de informe
    await agendarReunionCierre(audId);

  } catch(e){ toast('❌ Error enviando informe: '+e.message); }
}

// ── Agendar reunión de entrega de informe con Leandro y Ariel ─────────────────
// ── Alerta al admin cuando el agente no puede completar algo ──────
const AGENTE_ALERTA_EMAIL = 'administre@metogroup.ar';


// ═══════════════════════════════════════════════════════════════════
// AGENTE — SISTEMA DE COLA CON APROBACIÓN MANUAL
// 
// El agente NUNCA envía sin aprobación de administración.
// Flujo: agente prepara → guarda pendiente → admin aprueba → se envía.
// ═══════════════════════════════════════════════════════════════════

// Encola una acción pendiente de aprobación. El mail NO se envía todavía.
async function agenteEncolarAccion(accion, datos){
  try{
    const ts = new Date().toISOString();
    const fecha = todayStr();
    const hora = new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
    const id = Date.now();
    const entry = {
      id,
      fecha, hora, ts,
      accion: accion || '',
      destinatario: datos.destinatario || datos.to || '',
      clienteNombre: datos.clienteNombre || datos.cliente || '',
      auditoriaId: datos.auditoriaId || null,
      detalle: datos.detalle || '',
      tipo: datos.tipo || 'email',
      estado: 'pendiente',          // pendiente | aprobado | rechazado
      revisado: false,
      revisado_por: '',
      revisado_fecha: '',
      html_preview: datos.html_preview || '',
      // Payload completo para ejecutar cuando se apruebe
      _payload: datos._payload ? JSON.stringify(datos._payload) : ''
    };
    // Guardar en Supabase
    await sbFetch('agente_log','POST',entry,'').catch(()=>{});
    // Backup localStorage
    try{
      const hist = JSON.parse(localStorage.getItem('METO_agente_log_v2')||'[]');
      hist.unshift(entry);
      localStorage.setItem('METO_agente_log_v2', JSON.stringify(hist.slice(0,100)));
    }catch(e){}
    // Actualizar badge
    _agenteActualizarBadge();
    console.log('🤖 Agente: acción encolada —', accion, '→ esperando aprobación admin');
  }catch(e){
    console.warn('agenteEncolarAccion error:',e);
  }
}

// Actualiza el badge de pendientes en el menú
function _agenteActualizarBadge(){
  try{
    const hist = JSON.parse(localStorage.getItem('METO_agente_log_v2')||'[]');
    const pend = hist.filter(x=>x.estado==='pendiente'||(!x.estado&&!x.revisado)).length;
    const badge = document.getElementById('agente-log-badge');
    if(badge){ badge.textContent=pend||''; badge.style.display=pend>0?'inline-flex':'none'; }
  }catch(e){}
}

// Ejecuta una acción aprobada — hace el fetch real y marca como aprobado
async function agenteEjecutarAccion(logId){
  const emailCfg = (S.get('email_config')||[])[0]||{};
  if(!emailCfg.smtp_user){ toast('❌ Sin configuración de email'); return; }

  // Cargar el entry desde Supabase o localStorage
  let entry = null;
  try{
    const rows = await sbFetch('agente_log','GET',null,'?id=eq.'+logId);
    if(rows&&rows.length) entry = rows[0];
  }catch(e){}
  if(!entry){
    const hist = JSON.parse(localStorage.getItem('METO_agente_log_v2')||'[]');
    entry = hist.find(x=>x.id===logId);
  }
  if(!entry){ toast('❌ Acción no encontrada'); return; }
  if(entry.estado==='aprobado'){ toast('⚠️ Esta acción ya fue enviada'); return; }

  // Recuperar payload
  let payload = null;
  try{ payload = entry._payload ? JSON.parse(entry._payload) : null; }catch(e){}
  if(!payload){ toast('❌ Sin payload para ejecutar'); return; }

  toast('📤 Enviando...');
  try{
    await fetch('/.netlify/functions/send-email',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        from_email: emailCfg.smtp_user,
        from_password: emailCfg.smtp_pass,
        from_name: payload.from_name || AGENTE.EMAIL_AGENTE_NOMBRE || 'Hernan Quiroz',
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text || ''
      })
    });

    // Marcar como aprobado
    const usuario = currentUser?.nombre || 'Administración';
    const fecha = new Date().toISOString();
    await sbFetch('agente_log','PATCH',{estado:'aprobado',revisado:true,revisado_por:usuario,revisado_fecha:fecha},'?id=eq.'+logId).catch(()=>{});
    try{
      const hist = JSON.parse(localStorage.getItem('METO_agente_log_v2')||'[]');
      const idx = hist.findIndex(x=>x.id===logId);
      if(idx>-1){ hist[idx].estado='aprobado'; hist[idx].revisado=true; hist[idx].revisado_por=usuario; }
      localStorage.setItem('METO_agente_log_v2', JSON.stringify(hist));
    }catch(e){}

    // Si es bienvenida, marcar en la auditoría
    if(entry.accion.includes('bienvenida') && entry.auditoriaId){
      const auds = S.get('auditorias');
      const ai = auds.findIndex(x=>x.id===entry.auditoriaId);
      if(ai>-1){ auds[ai].email_inicio_enviado=true; S.set('auditorias',auds); }
    }

    toast('✅ Enviado correctamente');
    _agenteActualizarBadge();
    if(document.getElementById('panel-agente-log')) renderPanelAgenteLog();
  }catch(e){
    toast('❌ Error al enviar: '+e.message);
    console.error('agenteEjecutarAccion error:',e);
  }
}

// Rechazar una acción — no se envía, queda como rechazada
async function agenteRechazarAccion(logId){
  const usuario = currentUser?.nombre || 'Administración';
  const fecha = new Date().toISOString();
  await sbFetch('agente_log','PATCH',{estado:'rechazado',revisado:true,revisado_por:usuario,revisado_fecha:fecha},'?id=eq.'+logId).catch(()=>{});
  try{
    const hist = JSON.parse(localStorage.getItem('METO_agente_log_v2')||'[]');
    const idx = hist.findIndex(x=>x.id===logId);
    if(idx>-1){ hist[idx].estado='rechazado'; hist[idx].revisado=true; }
    localStorage.setItem('METO_agente_log_v2', JSON.stringify(hist));
  }catch(e){}
  toast('🚫 Acción rechazada');
  _agenteActualizarBadge();
  if(document.getElementById('panel-agente-log')) renderPanelAgenteLog();
}

// Aprobar y enviar todas las pendientes de un golpe
async function agenteAprobarTodas(){
  const hist = JSON.parse(localStorage.getItem('METO_agente_log_v2')||'[]');
  const pendientes = hist.filter(x=>x.estado==='pendiente'||(!x.estado&&!x.revisado));
  if(!pendientes.length){ toast('Sin acciones pendientes'); return; }
  toast('📤 Enviando '+pendientes.length+' acción(es)...');
  for(const p of pendientes){
    await agenteEjecutarAccion(p.id);
    await new Promise(r=>setTimeout(r,600)); // pequeña pausa entre mails
  }
  toast('✅ Todas enviadas');
}

// ── Preview y edición del mail antes de enviar ───────────────────────────────
async function agenteVerPreview(logId){
  let entry = null;
  try{
    const rows = await sbFetch('agente_log','GET',null,'?id=eq.'+logId);
    if(rows&&rows.length) entry = rows[0];
  }catch(e){}
  if(!entry){
    const hist = JSON.parse(localStorage.getItem('METO_agente_log_v2')||'[]');
    entry = hist.find(x=>x.id===logId);
  }
  if(!entry){ toast('❌ Acción no encontrada'); return; }

  let payload = null;
  try{ payload = entry._payload ? JSON.parse(entry._payload) : null; }catch(e){}
  if(!payload?.html){ toast('Sin preview disponible'); return; }

  // Detectar si es acción de examen (tiene código en detalle)
  const esExamen = entry.accion && (entry.accion.toLowerCase().includes('cuestionario') || entry.accion.toLowerCase().includes('examen') || entry.accion.toLowerCase().includes('código'));

  let ov = document.getElementById('agente-preview-modal');
  if(ov) ov.remove();
  ov = document.createElement('div');
  ov.id = 'agente-preview-modal';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:10000;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto';
  ov.onclick = e=>{ if(e.target===ov) ov.remove(); };
  document.body.appendChild(ov);

  // Extraer código del examen si aplica
  const codigoMatch = entry.detalle ? entry.detalle.match(/Código:\s*([A-Z0-9\-]+)/) : null;
  const codigoActual = codigoMatch ? codigoMatch[1] : '';

  // Selector de examen si aplica
  const examenesDisponibles = EXAMENES_CATALOG;
  const examenActual = payload.subject ? (
    payload.subject.includes('gerente') || payload.subject.toLowerCase().includes('gerente') ? 'gerente' :
    payload.subject.toLowerCase().includes('dueño') || payload.subject.toLowerCase().includes('dueno') ? 'dueno' :
    'vendedor'
  ) : 'vendedor';

  ov.innerHTML = `
  <div style="width:100%;max-width:880px;margin:0 auto;display:flex;flex-direction:column;gap:16px">

    <!-- HEADER -->
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px 22px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
      <div>
        <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:800">Vista previa — ${entry.accion}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:3px">Para: <strong style="color:var(--text)">${entry.destinatario||'—'}</strong> · ${entry.clienteNombre||'—'}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${entry.estado==='pendiente'||(!entry.estado&&!entry.revisado)?`
        <button onclick="agenteGuardarEdicion(${logId})" style="background:rgba(200,168,74,0.15);border:1px solid rgba(200,168,74,0.4);color:var(--accent);padding:8px 16px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">💾 Guardar cambios</button>
        <button onclick="agenteEjecutarAccion(${logId});document.getElementById('agente-preview-modal').remove()" style="background:var(--accent);border:none;color:#000;padding:8px 18px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">📤 Aprobar y enviar</button>
        `:''}
        <button onclick="document.getElementById('agente-preview-modal').remove()" style="background:none;border:1px solid var(--border);color:var(--muted);padding:8px 14px;border-radius:8px;cursor:pointer;font-size:12px">Cerrar</button>
      </div>
    </div>

    <!-- ASUNTO -->
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px 20px">
      <div style="font-size:10px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">Asunto del mail</div>
      <input id="agente-edit-subject" value="${(payload.subject||'').replace(/"/g,'&quot;')}"
        style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 14px;color:var(--text);font-family:Arial,sans-serif;font-size:14px;outline:none"
        onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'">
    </div>

    ${esExamen?`
    <!-- SELECTOR DE EXAMEN -->
    <div style="background:var(--surface);border:1px solid rgba(200,168,74,0.3);border-radius:12px;padding:16px 20px">
      <div style="font-size:10px;color:var(--accent);letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;font-weight:700">Examen a enviar</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px" id="examen-selector">
        ${examenesDisponibles.map(ex=>`
          <label style="display:flex;align-items:center;gap:10px;background:var(--surface2);border:1px solid ${examenActual===ex.id?'var(--accent)':'var(--border)'};border-radius:8px;padding:10px 14px;cursor:pointer;transition:all 0.15s" onclick="agenteSeleccionarExamen('${ex.id}',${logId})">
            <input type="radio" name="examen-tipo-${logId}" value="${ex.id}" ${examenActual===ex.id?'checked':''} style="accent-color:var(--accent)">
            <span style="font-size:12px;font-weight:600">${ex.label}</span>
          </label>
        `).join('')}
      </div>
      ${codigoActual?`<div style="margin-top:12px;font-size:11px;color:var(--muted)">Código del cuestionario: <strong style="color:var(--text);font-family:monospace">${codigoActual}</strong></div>`:''}
    </div>`:''}

    <!-- EDITOR DEL CUERPO -->
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden">
      <div style="background:var(--surface2);padding:12px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:10px;color:var(--muted);letter-spacing:1px;text-transform:uppercase">Cuerpo del mail</div>
        <div style="display:flex;gap:6px">
          <button onclick="document.getElementById('agente-tab-preview').style.display='block';document.getElementById('agente-tab-editor').style.display='none';this.style.background='var(--accent)';this.style.color='#000';this.previousElementSibling.style.background='transparent';this.previousElementSibling.style.color='var(--muted)'"
            style="background:var(--accent);color:#000;border:none;padding:5px 12px;border-radius:6px;font-size:11px;cursor:pointer;font-weight:700">
            👁 Preview
          </button>
          <button onclick="document.getElementById('agente-tab-editor').style.display='block';document.getElementById('agente-tab-preview').style.display='none';this.style.background='var(--accent)';this.style.color='#000';this.nextElementSibling.style.background='transparent';this.nextElementSibling.style.color='var(--muted)'"
            style="background:transparent;color:var(--muted);border:1px solid var(--border);padding:5px 12px;border-radius:6px;font-size:11px;cursor:pointer">
            ✏️ Editar HTML
          </button>
        </div>
      </div>

      <!-- Tab Preview -->
      <div id="agente-tab-preview" style="background:#f5f5f0;padding:0">
        <iframe id="agente-preview-iframe" style="width:100%;min-height:500px;border:none;display:block" srcdoc=""></iframe>
      </div>

      <!-- Tab Editor -->
      <div id="agente-tab-editor" style="display:none;padding:16px">
        <textarea id="agente-edit-html"
          style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:14px;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.6;min-height:400px;resize:vertical;outline:none"
          onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'"
        >${(payload.html||'').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea>
        <div style="font-size:10px;color:var(--muted);margin-top:6px">Editá el HTML directamente. El preview se actualiza al guardar cambios.</div>
      </div>
    </div>

  </div>`;

  // Cargar preview en iframe
  setTimeout(()=>{
    const iframe = document.getElementById('agente-preview-iframe');
    if(iframe){ iframe.srcdoc = payload.html || ''; }
    // Guardar referencia del payload actual para edición
    ov._logId = logId;
    ov._payload = payload;
    ov._entry = entry;
  }, 50);
}

// Seleccionar examen distinto — actualiza el payload del log en memoria
function agenteSeleccionarExamen(tipoId, logId){
  const examenesMap = Object.fromEntries(EXAMENES_CATALOG.map(e=>[e.id,e]));
  const ex = examenesMap[tipoId];
  if(!ex) return;

  // Actualizar labels visuales
  document.querySelectorAll('#examen-selector label').forEach(l=>{
    const radio = l.querySelector('input[type=radio]');
    l.style.borderColor = radio?.value === tipoId ? 'var(--accent)' : 'var(--border)';
  });

  // Guardar selección en el entry (se aplica al guardar cambios)
  const ov = document.getElementById('agente-preview-modal');
  if(ov) ov._examenTipo = tipoId;

  toast('Examen cambiado a: '+ex.label+' (guardá los cambios para confirmar)');
}

// Guardar ediciones al payload antes de enviar
async function agenteGuardarEdicion(logId){
  const ov = document.getElementById('agente-preview-modal');
  if(!ov) return;

  const newSubject = document.getElementById('agente-edit-subject')?.value || '';
  const newHtmlRaw = document.getElementById('agente-edit-html')?.value || '';
  // Decode HTML entities from editor
  const newHtml = newHtmlRaw.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"');

  // Recuperar entry actual
  let entry = ov._entry;
  let payload = ov._payload ? {...ov._payload} : {};

  // Aplicar cambios
  if(newSubject) payload.subject = newSubject;
  if(newHtml && newHtml.trim().length > 10) payload.html = newHtml;

  // Actualizar examen si fue cambiado
  const examenesMap = Object.fromEntries(EXAMENES_CATALOG.map(e=>[e.id,e]));
  if(ov._examenTipo && examenesMap[ov._examenTipo]){
    const ex = examenesMap[ov._examenTipo];
    // Reemplazar URL del examen en el HTML
    const urlSistema = window.location.origin + window.location.pathname;
    const examenUrl = urlSistema.replace('index.html','') + ex.url;
    // Actualizar href en el HTML
    const oldHrefPattern = /href="[^"]*examen[^"]*"/g;
    payload.html = payload.html.replace(oldHrefPattern, `href="${examenUrl}"`);
    payload.subject = payload.subject || '';
    entry.detalle = (entry.detalle||'').replace(/Examen:[^·]+/, 'Examen: '+ex.label);
  }

  // Guardar en Supabase y localStorage
  const newPayloadStr = JSON.stringify(payload);
  await sbFetch('agente_log','PATCH',{_payload:newPayloadStr, detalle:entry.detalle||''},'?id=eq.'+logId).catch(()=>{});
  try{
    const hist = JSON.parse(localStorage.getItem('METO_agente_log_v2')||'[]');
    const idx = hist.findIndex(x=>x.id===logId);
    if(idx>-1){ hist[idx]._payload = newPayloadStr; hist[idx].detalle = entry.detalle||''; }
    localStorage.setItem('METO_agente_log_v2', JSON.stringify(hist));
  }catch(e){}

  // Actualizar preview
  ov._payload = payload;
  const iframe = document.getElementById('agente-preview-iframe');
  if(iframe) iframe.srcdoc = payload.html;

  toast('✅ Cambios guardados');
}



// ── Preparar contexto completo para crear examen personalizado con Claude ────
function prepararContextoExamenPersonalizado(logId, clienteNombre){
  const analisis = JSON.parse(localStorage.getItem('METO_analisis_perfil_'+logId)||'{}');
  const cli = (S.get('clientes')||[]).find(c=>c.nombre===clienteNombre);
  const diag = cli ? (S.get('portal_diagnostico')||[]).find(d=>String(d.clienteId)===String(cli.id)) : null;
  const perfilResps = diag?.perfilRespuestas || {};
  const bpcScore = diag ? calcBPCScore(diag) : null;

  // Construir el contexto completo
  let contexto = `=== CONTEXTO PARA CREAR EXAMEN PERSONALIZADO ===

CLIENTE: ${clienteNombre}
BPC SCORE: ${bpcScore||'N/D'}/100
FECHA: ${new Date().toLocaleDateString('es-AR')}

=== ANÁLISIS DE CLAUDE ===
${analisis.texto||'Sin análisis previo'}

=== RESPUESTAS DEL PERFIL SITUACIONAL ===`;

  if(typeof PERFIL_BLOQUES !== 'undefined'){
    PERFIL_BLOQUES.forEach(bloque=>{
      contexto += `

${bloque.titulo.toUpperCase()}
`;
      bloque.preguntas.forEach(p=>{
        const resp = perfilResps[p.id];
        const opt = p.opciones.find(o=>o.v===resp);
        contexto += `— ${p.texto}
  → ${opt?opt.l+': '+opt.d:'Sin respuesta'}
`;
      });
    });
  }

  contexto += `

=== INSTRUCCIÓN PARA CLAUDE ===
Con este contexto, necesito que me ayudes a crear un examen personalizado para ${clienteNombre}.
El examen debe:
- Tener el mismo formato que los exámenes BPC:2026 existentes
- Preguntas con escala Nunca/Casi nunca/A veces/Casi siempre/Siempre (o similar)
- Agrupadas en bloques temáticos según lo que detectaste en el análisis
- Cantidad de preguntas similar a los exámenes estándar (40-65 preguntas)
- Foco en las áreas críticas específicas de este cliente

¿Arrancamos?`;

  // Copiar al portapapeles
  if(navigator.clipboard){
    navigator.clipboard.writeText(contexto).then(()=>{
      toast('✅ Contexto copiado al portapapeles — pegalo en Claude');
    }).catch(()=>{
      _mostrarContextoModal(contexto, clienteNombre);
    });
  } else {
    _mostrarContextoModal(contexto, clienteNombre);
  }
}

function _mostrarContextoModal(contexto, clienteNombre){
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:10002;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto';
  ov.onclick = e=>{ if(e.target===ov) ov.remove(); };
  document.body.appendChild(ov);
  ov.innerHTML = `
  <div style="width:100%;max-width:700px;background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden">
    <div style="padding:18px 22px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:15px;font-weight:700">🛠 Contexto para crear examen personalizado</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">Copiá este texto y pegalo en Claude para crear el examen de ${clienteNombre}</div>
      </div>
      <button onclick="this.closest('div[style]').remove()" style="background:none;border:1px solid var(--border);color:var(--muted);padding:6px 12px;border-radius:6px;cursor:pointer">✕</button>
    </div>
    <div style="padding:16px 20px">
      <textarea readonly style="width:100%;height:400px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:14px;color:var(--text);font-family:'DM Mono',monospace;font-size:11px;line-height:1.6;resize:vertical;outline:none;box-sizing:border-box">${contexto.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea>
      <div style="display:flex;gap:10px;margin-top:12px">
        <button onclick="navigator.clipboard.writeText(this.closest('div').previousElementSibling.value).then(()=>toast('✅ Copiado'))" 
          style="flex:1;background:var(--accent);border:none;color:#000;padding:10px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700">
          📋 Copiar todo
        </button>
        <button onclick="window.open('https://claude.ai','_blank')"
          style="background:linear-gradient(135deg,rgba(167,139,250,0.2),rgba(167,139,250,0.1));border:1px solid rgba(167,139,250,0.4);color:#a78bfa;padding:10px 18px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700">
          Abrir Claude ↗
        </button>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:10px;line-height:1.6">
        💡 <strong>Pasos:</strong> Copiá el texto → Abrí Claude → Pegalo → Trabajamos juntos el examen → 
        Una vez listo, subilo al repo como <code style="background:var(--surface2);padding:1px 6px;border-radius:4px">examen-${clienteNombre.toLowerCase().replace(/\s+/g,'-')}.html</code>
      </div>
    </div>
  </div>`;
}

// ── Ficha de perfil situacional para Leandro ────────────────────────────────
async function abrirFichaPerfil(logId){
  // Cargar el log
  let log = null;
  try{
    const rows = await sbFetch('agente_log','GET',null,'?id=eq.'+logId);
    if(rows&&rows.length) log = rows[0];
  }catch(e){}
  if(!log){
    const hist = JSON.parse(localStorage.getItem('METO_agente_log_v2')||'[]');
    log = hist.find(x=>x.id===logId);
  }
  if(!log){ toast('❌ No encontrado'); return; }

  // Cargar diagnóstico del cliente
  const cli = (S.get('clientes')||[]).find(c=>c.nombre===log.clienteNombre);
  const diag = cli ? (S.get('portal_diagnostico')||[]).find(d=>String(d.clienteId)===String(cli.id)) : null;
  const perfilResps = diag?.perfilRespuestas || {};
  const bpcScore = diag ? calcBPCScore(diag) : null;

  // Labels de opciones para mostrar texto legible
  const LABEL_MAP = {};
  if(typeof PERFIL_BLOQUES !== 'undefined'){
    PERFIL_BLOQUES.forEach(b=>b.preguntas.forEach(p=>p.opciones.forEach(o=>{ LABEL_MAP[p.id+'_'+o.v]=o.l; LABEL_MAP[p.id]=p.texto; })));
  }

  document.querySelectorAll('.ficha-perfil-overlay').forEach(e=>e.remove());
  const ov = document.createElement('div');
  ov.className = 'ficha-perfil-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:10001;overflow-y:auto;display:flex;align-items:flex-start;justify-content:center;padding:20px';
  ov.onclick = e=>{ if(e.target===ov) ov.remove(); };
  document.body.appendChild(ov);

  // Calcular recomendación si hay respuestas
  let recomendacion = null;
  if(Object.keys(perfilResps).length > 0 && typeof _perfilRecomendarExamen !== 'undefined'){
    recomendacion = _perfilRecomendarExamen(perfilResps);
  }

  const examenesDisponibles = EXAMENES_CATALOG;

  const recId = recomendacion?.examen?.id || diag?.perfilExamenRecomendado || '';

  ov.innerHTML = `
  <div style="width:100%;max-width:860px;margin:0 auto">
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,rgba(167,139,250,0.08),rgba(167,139,250,0.02));padding:22px 28px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800">📋 Perfil Situacional — ${log.clienteNombre}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:3px">Completado ${log.fecha} · ${Object.keys(perfilResps).length} respuestas del módulo de perfil</div>
        </div>
        <button onclick="this.closest('.ficha-perfil-overlay').remove()" style="background:none;border:1px solid var(--border);color:var(--muted);padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px">Cerrar</button>
      </div>

      <div style="padding:24px 28px;display:flex;flex-direction:column;gap:24px">

        <!-- Score BPC si hay -->
        ${bpcScore !== null ? `
        <div style="background:rgba(200,168,74,0.06);border:1px solid rgba(200,168,74,0.2);border-radius:10px;padding:16px 20px;display:flex;align-items:center;gap:20px">
          <div style="text-align:center;flex-shrink:0">
            <div style="font-family:'Syne',sans-serif;font-size:40px;font-weight:800;color:var(--accent);line-height:1">${bpcScore}</div>
            <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">BPC Score</div>
          </div>
          <div style="height:40px;width:1px;background:var(--border);flex-shrink:0"></div>
          <div style="font-size:13px;color:var(--muted);line-height:1.6">
            Resultado del diagnóstico de ${BPC_DIMENSIONES?.reduce((s,d)=>s+d.preguntas.length,0)||0} preguntas BPC:2026.<br>
            ${getBPCNivel(bpcScore)?.nombre||''} — ${getBPCNivel(bpcScore)?.desc||''}
          </div>
        </div>` : ''}

        <!-- Respuestas del perfil -->
        <div>
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:2px;margin-bottom:14px;font-family:'DM Mono',monospace">── Respuestas del perfil situacional</div>
          ${typeof PERFIL_BLOQUES !== 'undefined' ? PERFIL_BLOQUES.map(bloque=>`
            <div style="margin-bottom:20px">
              <div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:10px;display:flex;align-items:center;gap:8px">
                <span style="font-family:'DM Mono',monospace;font-size:10px;background:rgba(200,168,74,0.1);padding:2px 8px;border-radius:4px">${bloque.numero}</span>
                ${bloque.titulo}
              </div>
              ${bloque.preguntas.map(p=>{
                const resp = perfilResps[p.id];
                const opt = p.opciones.find(o=>o.v===resp);
                return `<div style="display:flex;gap:14px;padding:10px 0;border-bottom:1px solid var(--border)">
                  <div style="flex:1">
                    <div style="font-size:12px;color:var(--muted);margin-bottom:4px">${p.texto}</div>
                    ${resp ? `<div style="font-size:14px;font-weight:600;color:var(--text)">${opt?.l||resp}</div>
                    <div style="font-size:11px;color:var(--muted);font-style:italic;margin-top:2px">${opt?.d||''}</div>` : `<div style="font-size:12px;color:rgba(239,68,68,0.6);font-style:italic">Sin respuesta</div>`}
                  </div>
                </div>`;
              }).join('')}
            </div>
          `).join('') : '<div style="color:var(--muted);font-size:13px">Sin datos de perfil disponibles</div>'}
        </div>

        <!-- Análisis IA -->
        <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:20px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px">
            <div>
              <div style="font-size:14px;font-weight:700">🤖 Análisis con inteligencia artificial</div>
              <div style="font-size:11px;color:var(--muted);margin-top:2px">Claude analiza las respuestas y recomienda el examen más adecuado</div>
            </div>
            <button onclick="analizarPerfilConIA('${logId}','${log.clienteNombre}')" 
              style="background:linear-gradient(135deg,rgba(167,139,250,0.2),rgba(167,139,250,0.1));border:1px solid rgba(167,139,250,0.4);color:#a78bfa;padding:9px 20px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">
              ✨ Analizar ahora
            </button>
          </div>
          <div id="ficha-perfil-ia-${logId}" style="min-height:60px"></div>
        </div>

        <!-- Selector de examen -->
        <div style="background:var(--surface);border:1px solid rgba(200,168,74,0.25);border-radius:12px;padding:20px">
          <div style="font-size:14px;font-weight:700;margin-bottom:6px">📤 Examen a enviar</div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:16px">
            ${recomendacion ? `IA recomienda: <strong style="color:var(--accent)">${recomendacion.examen?.label}</strong>` : 'Seleccioná el examen a enviar a este cliente'}
          </div>
          <div style="display:flex;flex-direction:column;gap:8px" id="ficha-perfil-examen-sel">
            ${examenesDisponibles.map(ex=>`
              <label style="display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid ${recId===ex.id?'var(--accent)':'var(--border)'};border-radius:8px;cursor:pointer;background:${recId===ex.id?'rgba(200,168,74,0.06)':'var(--surface2)'};transition:all 0.15s"
                onclick="this.parentElement.querySelectorAll('label').forEach(l=>l.style.cssText='display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid var(--border);border-radius:8px;cursor:pointer;background:var(--surface2)');this.style.cssText='display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid var(--accent);border-radius:8px;cursor:pointer;background:rgba(200,168,74,0.06)'">
                <input type="radio" name="examen-ficha-perfil" value="${ex.id}" ${recId===ex.id?'checked':''} style="accent-color:var(--accent)">
                <div style="flex:1">
                  <div style="font-size:13px;font-weight:600">${ex.label}</div>
                  <div style="font-size:11px;color:var(--muted);font-family:'DM Mono',monospace">${ex.url}</div>
                </div>
                ${recId===ex.id?'<span style="font-size:10px;background:rgba(200,168,74,0.15);color:var(--accent);padding:2px 8px;border-radius:6px;font-weight:700">Recomendado</span>':''}
              </label>
            `).join('')}
          </div>
          <button onclick="_enviarExamenDesdePerfilFicha('${logId}','${log.clienteNombre}',${cli?cli.id:'null'})"
            style="width:100%;margin-top:16px;background:var(--accent);border:none;color:#000;padding:12px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:700">
            📤 Aprobar y enviar examen
          </button>
        </div>

      </div>
    </div>
  </div>`;
}

// Analizar perfil con Claude
async function analizarPerfilConIA(logId, clienteNombre){
  const el = document.getElementById('ficha-perfil-ia-'+logId);
  if(!el) return;
  el.innerHTML = '<div style="color:var(--muted);font-size:13px;font-style:italic">Analizando con Claude...</div>';

  const cli = (S.get('clientes')||[]).find(c=>c.nombre===clienteNombre);
  const diag = cli ? (S.get('portal_diagnostico')||[]).find(d=>String(d.clienteId)===String(cli.id)) : null;
  const perfilResps = diag?.perfilRespuestas || {};
  const bpcScore = diag ? calcBPCScore(diag) : null;

  // Construir contexto de respuestas
  let contexto = `Cliente: ${clienteNombre}\nBPC Score: ${bpcScore||'N/D'}/100\n\nRespuestas del perfil situacional:\n`;
  if(typeof PERFIL_BLOQUES !== 'undefined'){
    PERFIL_BLOQUES.forEach(bloque=>{
      contexto += `\n${bloque.titulo.toUpperCase()}\n`;
      bloque.preguntas.forEach(p=>{
        const resp = perfilResps[p.id];
        const opt = p.opciones.find(o=>o.v===resp);
        contexto += `— ${p.texto}\n  Respuesta: ${opt?opt.l+' ('+opt.d+')':'Sin respuesta'}\n`;
      });
    });
  }

  const examenesExistentes = getExamenesCatalogText();

  const prompt = `Sos el asesor estratégico de MetoGroup analizando el perfil situacional completo de ${clienteNombre}.

CONTEXTO DEL CLIENTE:
${contexto}

EXÁMENES DISPONIBLES EN EL SISTEMA:
${examenesExistentes}

TU ANÁLISIS DEBE INCLUIR:

1. SITUACIÓN (2-3 líneas directas, sin eufemismos): ¿cuál es la realidad comercial de esta empresa hoy?

2. PUNTOS CRÍTICOS: los 2-3 hallazgos más importantes de las respuestas, con evidencia específica de las respuestas.

3. RECOMENDACIÓN DE EXAMEN: Elegí UNA de estas opciones:
   a) Uno de los 5 exámenes existentes → indicá cuál y por qué en una línea
   b) EXAMEN PERSONALIZADO → si ninguno de los 5 encaja bien con la situación específica, indicá "EXAMEN PERSONALIZADO RECOMENDADO" y explicá en 2-3 líneas QUÉ debería evaluar ese examen especial para esta empresa (en qué áreas, con qué foco, qué aspectos particulares de su situación requieren preguntas que los exámenes estándar no cubren bien).

Sé directo, práctico y preciso. Español formal. Sin frases vacías.`;

  try{
    const apiKey = document.cookie.match(/mg_ak=([^;]+)/)?.[1]||localStorage.getItem('METO_claude_key')||'';
    const decKey = apiKey ? decodeURIComponent(apiKey) : '';
    if(!decKey){ el.innerHTML = '<div style="color:#ef4444;font-size:12px">⚠️ Configurá la API key de Claude en Sistema → Usuarios para usar esta función.</div>'; return; }

    const res = await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':decKey,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:600,messages:[{role:'user',content:prompt}]})
    });
    const data = await res.json();
    const texto = data?.content?.[0]?.text || 'Sin respuesta';
    const esPersonalizado = texto.toUpperCase().includes('EXAMEN PERSONALIZADO RECOMENDADO');

    if(esPersonalizado){
      // Guardar el análisis en localStorage para usarlo luego
      localStorage.setItem('METO_analisis_perfil_'+logId, JSON.stringify({
        clienteNombre, texto, fecha: new Date().toISOString()
      }));

      el.innerHTML = `
        <div style="font-size:13px;line-height:1.7;color:var(--text);white-space:pre-wrap;margin-bottom:16px">${texto}</div>
        <div style="background:linear-gradient(135deg,rgba(167,139,250,0.12),rgba(167,139,250,0.06));border:1px solid rgba(167,139,250,0.4);border-radius:10px;padding:16px 20px">
          <div style="font-size:14px;font-weight:700;color:#a78bfa;margin-bottom:8px">✨ Claude recomienda un examen personalizado</div>
          <div style="font-size:12px;color:var(--muted);line-height:1.6;margin-bottom:14px">
            Ninguno de los 5 exámenes existentes cubre bien la situación de este cliente.<br>
            Podés crear un examen a medida trabajando con Claude — tarda entre 15 y 30 minutos.
          </div>
          <button onclick="prepararContextoExamenPersonalizado('${logId}','${clienteNombre}')"
            style="background:linear-gradient(135deg,rgba(167,139,250,0.25),rgba(167,139,250,0.15));border:1px solid rgba(167,139,250,0.5);color:#a78bfa;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;width:100%">
            🛠 Crear examen personalizado con Claude →
          </button>
        </div>`;
    } else {
      el.innerHTML = `<div style="font-size:13px;line-height:1.7;color:var(--text);white-space:pre-wrap">${texto}</div>`;
    }
  }catch(e){
    el.innerHTML = `<div style="color:#ef4444;font-size:12px">Error: ${e.message}</div>`;
  }
}

// Enviar examen seleccionado desde la ficha de perfil
async function _enviarExamenDesdePerfilFicha(logId, clienteNombre, clienteId){
  const sel = document.querySelector('input[name="examen-ficha-perfil"]:checked');
  if(!sel){ toast('⚠️ Seleccioná un examen primero'); return; }

  const examenesMap = Object.fromEntries(EXAMENES_CATALOG.map(e=>[e.id,e]));
  const examen = examenesMap[sel.value];
  if(!examen){ toast('❌ Examen no encontrado'); return; }

  const cli = clienteId ? (S.get('clientes')||[]).find(c=>c.id===Number(clienteId)||String(c.id)===String(clienteId)) : (S.get('clientes')||[]).find(c=>c.nombre===clienteNombre);
  if(!cli?.email){ toast('⚠️ El cliente no tiene email registrado'); return; }

  const emailCfg = (S.get('email_config')||[])[0]||{};
  if(!emailCfg.smtp_user){ toast('⚠️ Configurá el SMTP primero'); return; }

  const urlSistema = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
  const examenUrl = urlSistema + examen.url;

  const html = emailTemplate({
    nombreAgente: AGENTE.EMAIL_AGENTE_NOMBRE || 'Hernán Quiroz',
    emailAgente: AGENTE.EMAIL_AGENTE || emailCfg.smtp_user,
    saludo: (cli.contacto||cli.nombre).split(' ')[0]+', buen día.',
    ctaUrl: examenUrl,
    ctaLabel: 'Completar ' + examen.label,
    bloques: [
      { tipo:'texto', contenido:'Le escribo porque estamos avanzando con el proceso de Auditoría BPC:2026 en <strong>'+cli.nombre+'</strong>.' },
      { tipo:'texto', contenido:'El siguiente paso es completar el siguiente cuestionario, diseñado específicamente para el rol y momento de la empresa.' },
      { tipo:'destacado', titulo:examen.label, contenido:'Este cuestionario es individual y confidencial. Le llevará entre 20 y 40 minutos completarlo. Puede hacerlo en cualquier momento, desde cualquier dispositivo.' },
      { tipo:'texto', contenido:'Ante cualquier consulta, responda este email. Quedo a disposición.' }
    ]
  });

  await agenteEncolarAccion('Enviar '+examen.label+' a '+cli.nombre, {
    destinatario: cli.email,
    clienteNombre: cli.nombre,
    auditoriaId: null,
    tipo: 'email',
    detalle: 'Examen seleccionado manualmente desde ficha de perfil situacional.',
    html_preview: 'Para: '+cli.email+' · '+examen.label,
    _payload: {
      from_name: AGENTE.EMAIL_AGENTE_NOMBRE || 'Hernán Quiroz',
      to: cli.email,
      subject: examen.label+' — '+cli.nombre,
      html, text: 'Cuestionario '+examen.label+'. Link: '+examenUrl
    }
  });

  // Marcar el log del perfil como resuelto
  await sbFetch('agente_log','PATCH',{estado:'aprobado',revisado:true,revisado_por:currentUser?.nombre||'Admin',revisado_fecha:new Date().toISOString()},'?id=eq.'+logId).catch(()=>{});

  toast('✅ Examen encolado para envío — revisá Acciones del Agente');
  document.querySelector('.ficha-perfil-overlay')?.remove();
  _renderAdminAgenteWidget();
}

// Panel de gestión de acciones del agente
async function renderPanelAgenteLog(){
  let ov = document.getElementById('panel-agente-log');
  if(!ov){
    ov = document.createElement('div');
    ov.id = 'panel-agente-log';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto';
    ov.onclick = e=>{ if(e.target===ov) ov.remove(); };
    document.body.appendChild(ov);
  }

  // Cargar logs desde Supabase con fallback a localStorage
  let logs = [];
  try{
    const sb = await sbFetch('agente_log','GET',null,'?order=ts.desc&limit=150');
    if(sb&&sb.length){ logs=sb; const hist=JSON.parse(localStorage.getItem('METO_agente_log_v2')||'[]'); if(sb.length>hist.length){ localStorage.setItem('METO_agente_log_v2',JSON.stringify(sb.slice(0,100))); } }
    else logs = JSON.parse(localStorage.getItem('METO_agente_log_v2')||'[]');
  }catch(e){ logs = JSON.parse(localStorage.getItem('METO_agente_log_v2')||'[]'); }

  const pendientes = logs.filter(x=>x.estado==='pendiente'||(!x.estado&&!x.revisado));
  const enviados   = logs.filter(x=>x.estado==='aprobado');
  const rechazados = logs.filter(x=>x.estado==='rechazado');

  ov.innerHTML = `<div style="width:100%;max-width:860px;margin:0 auto">
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden">
      <div style="background:var(--surface2);padding:20px 24px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:17px;font-weight:800">🤖 Acciones del Agente</div>
          <div style="font-size:11px;color:var(--muted);margin-top:3px">Hernán Quiroz no envía nada sin tu aprobación. Revisá, aprobá o rechazá cada acción.</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          ${pendientes.length?`<button onclick="agenteAprobarTodas()" style="background:var(--accent);border:none;color:#000;padding:9px 18px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">📤 Enviar todas (${pendientes.length})</button>`:''}
          <button onclick="document.getElementById('panel-agente-log').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:22px;line-height:1">✕</button>
        </div>
      </div>

      ${pendientes.length?`<div style="background:rgba(239,68,68,0.06);border-bottom:1px solid rgba(239,68,68,0.15);padding:10px 24px;font-size:12px;color:#ef4444;font-weight:600">
        ⏳ ${pendientes.length} acción${pendientes.length!==1?'es':''} esperando tu aprobación
      </div>`:''}

      <div style="padding:20px 24px;max-height:72vh;overflow-y:auto">
        ${!logs.length?`<div style="text-align:center;padding:48px;color:var(--muted)">
          <div style="font-size:40px;margin-bottom:12px">🤖</div>
          <div>El agente no generó acciones todavía</div>
        </div>`:''}

        ${logs.map(log=>{
          const isPend = log.estado==='pendiente'||(!log.estado&&!log.revisado);
          const isEnv  = log.estado==='aprobado';
          const isRej  = log.estado==='rechazado';
          const borderColor = isPend?'rgba(200,168,74,0.4)':isEnv?'rgba(78,205,196,0.3)':'rgba(100,100,100,0.2)';
          const badge = isPend
            ?`<span style="font-size:10px;background:rgba(239,68,68,0.15);color:#ef4444;padding:3px 10px;border-radius:10px;font-weight:700">⏳ Pendiente</span>`
            :isEnv
            ?`<span style="font-size:10px;background:rgba(78,205,196,0.1);color:var(--ok);padding:3px 10px;border-radius:10px">✓ Enviado por ${log.revisado_por||'Admin'}</span>`
            :`<span style="font-size:10px;background:rgba(100,100,100,0.1);color:var(--muted);padding:3px 10px;border-radius:10px">🚫 Rechazado</span>`;

          // Parsear payload para saber si hay preview
          let _pl = null;
          try{ _pl = log._payload ? JSON.parse(log._payload) : null; }catch(e){}
          const hasPreview = !!(_pl && (_pl.html || _pl.subject));
          const esExamen = log.accion && (log.accion.toLowerCase().includes('cuestionario') || log.accion.toLowerCase().includes('examen'));

          return `<div style="background:var(--surface2);border:1px solid ${borderColor};border-radius:10px;padding:16px 18px;margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:8px">
              <div style="flex:1">
                <div style="font-size:13px;font-weight:700;margin-bottom:3px">${log.accion}</div>
                <div style="font-size:11px;color:var(--muted)">${log.fecha} ${log.hora}
                  · Para: <strong style="color:var(--text)">${log.destinatario||'—'}</strong>
                  · ${log.clienteNombre||'—'}
                </div>
                ${_pl&&_pl.subject?`<div style="font-size:11px;color:var(--muted);margin-top:3px;font-style:italic">Asunto: ${_pl.subject}</div>`:''}
                ${esExamen&&log.detalle?`<div style="font-size:11px;color:var(--accent);margin-top:3px">${log.detalle.includes('Código')?'🔑 '+log.detalle.match(/Código[^·]*/)?.[0]||'':''}</div>`:''}
              </div>
              ${badge}
            </div>
            ${log.detalle&&!esExamen?`<div style="font-size:12px;color:var(--muted);line-height:1.6;margin-bottom:10px">${log.detalle}</div>`:''}
            <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;align-items:center">
              ${hasPreview?`<button onclick="agenteVerPreview(${log.id})" style="background:var(--surface);border:1px solid var(--border);color:var(--text);padding:7px 16px;border-radius:7px;cursor:pointer;font-size:12px">👁 Ver${esExamen?' examen':' mail'}</button>`:''}
              ${isPend?`
                <button onclick="agenteEjecutarAccion(${log.id})" style="background:var(--accent);border:none;color:#000;padding:7px 18px;border-radius:7px;cursor:pointer;font-size:12px;font-weight:700">📤 Aprobar y enviar</button>
                <button onclick="agenteRechazarAccion(${log.id})" style="background:transparent;border:1px solid var(--border);color:var(--muted);padding:7px 14px;border-radius:7px;cursor:pointer;font-size:12px">🚫 Rechazar</button>
              `:''}
              ${isEnv?`<span style="font-size:11px;color:var(--muted)">Enviado el ${log.revisado_fecha?new Date(log.revisado_fecha).toLocaleDateString('es-AR'):''}</span>`:''}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

// Alias de compatibilidad — agenteRegistrarAccion ahora encola
function agenteRegistrarAccion(accion, datos){ agenteEncolarAccion(accion, datos); }

async function agenteAlerta(contexto, detalle, emailCfg){
  const cfg = emailCfg || (S.get('email_config')||[])[0] || {};
  if(!cfg.smtp_user) return;
  const hoy = new Date().toLocaleString('es-AR');
  const html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:28px;background:#fff;border-left:4px solid #ef4444">'
    +'<div style="font-size:13px;font-weight:700;color:#ef4444;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">⚠️ Alerta del Agente MetoGroup</div>'
    +'<div style="font-size:20px;font-weight:700;color:#1a1a1a;margin-bottom:16px">'+contexto+'</div>'
    +'<div style="background:#fef2f2;border-radius:8px;padding:14px 18px;font-size:13px;color:#1a1a1a;line-height:1.7;margin-bottom:20px">'+detalle+'</div>'
    +'<div style="font-size:11px;color:#888">'+hoy+' · Sistema MetoGroup</div>'
    +'</div>';
  await fetch('/.netlify/functions/send-email',{
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      from_email:cfg.smtp_user, from_password:cfg.smtp_pass,
      from_name:'Agente MetoGroup', to:AGENTE_ALERTA_EMAIL,
      subject:'⚠️ Agente: '+contexto,
      html, text:contexto+'\n\n'+detalle
    })
  }).catch(e=>console.warn('agenteAlerta email error:',e.message));
}

// ── Agendar reunión de entrega de informe vía Calendly ────────────────────────
async function agendarReunionCierre(audId){
  const aud = (S.get('auditorias')||[]).find(x=>x.id===audId);
  if(!aud) return;
  const cliente  = (S.get('clientes')||[]).find(c=>String(c.id)===String(aud.clienteId))||{};
  const emailCfg = (S.get('email_config')||[])[0]||{};
  if(!emailCfg.smtp_user){
    await agenteAlerta('Sin config de email','No se pudo enviar la reunión de entrega de informe para '+aud.clienteNombre+' — falta configuración SMTP.');
    return;
  }

  const destinatario = cliente.encargado_email || cliente.email;
  if(!destinatario){
    await agenteAlerta(
      'Reunión de entrega de informe sin destinatario',
      'Cliente: '+aud.clienteNombre+' (Aud. '+audId+')<br>No hay email del encargado ni del dueño registrado. El email de reunión no fue enviado.',
      emailCfg
    );
    return;
  }

  const usuarios = S.get('usuarios')||[];
  // Buscar usuarios con perfil dueño que tengan Calendly configurado
  const duenos = usuarios.filter(u=>{
    const roles = Array.isArray(u.roles) ? u.roles : (u.rol ? [u.rol] : []);
    return roles.includes('dueno') && u.calendly;
  });

  if(duenos.length === 0){
    await agenteAlerta(
      'Sin links de Calendly en usuarios dueño',
      'No se encontraron usuarios con perfil <strong>Dueño</strong> y Calendly configurado. El email de reunión de entrega de informe para <strong>'+aud.clienteNombre+'</strong> no fue enviado.<br><br>Verificá que Ariel y Leandro Alonso tengan su link de Calendly cargado en su perfil de usuario.',
      emailCfg
    );
    return;
  }

  // Para notificación interna — todos los dueños con email
  const leandro = duenos.find(u=>u.nombre?.toLowerCase().includes('leandro')) || duenos[0];
  const ariel   = duenos.find(u=>u.nombre?.toLowerCase().includes('ariel'))   || duenos[1];

  const fromName  = AGENTE.EMAIL_AGENTE_NOMBRE || 'MetoGroup';
  const fromEmail = AGENTE.EMAIL_AGENTE || emailCfg.smtp_user;
  const nombreContacto = cliente.encargado_nombre || cliente.contacto || cliente.nombre || 'equipo';

  const botonesCalendly = duenos.map(u=>
    '<a href="'+u.calendly+'" style="display:inline-block;padding:12px 24px;background:#1a1a1a;color:#c8a84a;font-weight:700;font-size:13px;border-radius:6px;text-decoration:none;margin:6px 8px 6px 0">📅 Agendar con '+(u.nombre?.split(' ')[0]||'MetoGroup')+'</a>'
  ).join('');

  const htmlReunion = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#fff">'
    +'<div style="font-size:22px;font-weight:700;margin-bottom:4px;color:#1a1a1a">MetoGroup</div>'
    +'<div style="font-size:10px;letter-spacing:2px;color:#888;text-transform:uppercase;margin-bottom:28px">Reunión de Entrega de Informe</div>'
    +'<p style="font-size:15px;color:#1a1a1a;margin-bottom:16px">Estimado/a <strong>'+nombreContacto+'</strong>,</p>'
    +'<p style="font-size:13px;color:#444;line-height:1.7;margin-bottom:20px">'
    +'Ya está disponible su <strong>Informe de Auditoría BPC:2026</strong>. Nos gustaría coordinar una reunión de entrega de informe donde revisaremos los hallazgos, responderemos sus preguntas y pondremos en marcha el Plan de Acción Correctivo.</p>'
    +'<div style="background:#f8f8f8;border-radius:10px;padding:20px 24px;margin-bottom:24px">'
    +'<div style="font-size:13px;font-weight:700;color:#1a1a1a;margin-bottom:6px">📅 Agendá la reunión directamente</div>'
    +'<div style="font-size:12px;color:#666;margin-bottom:14px">Duración estimada: 60-90 minutos · Modalidad: virtual</div>'
    +botonesCalendly
    +'</div>'
    +'<p style="font-size:12px;color:#888;line-height:1.7;margin-bottom:24px">Elegí el horario que mejor te quede. Recibirás la confirmación automáticamente al agendar.</p>'
    +'<div style="border-top:1px solid #eee;padding-top:20px;font-size:11px;color:#888;line-height:1.8">'
    +fromName+'<br><a href="mailto:'+fromEmail+'" style="color:#c8a84a">'+fromEmail+'</a></div></div>';

  await agenteEncolarAccion('Agendar reunión de entrega de informe — '+aud.clienteNombre, {
    destinatario: destinatario,
    clienteNombre: aud.clienteNombre,
    auditoriaId: audId,
    tipo: 'email',
    detalle: 'Invitación a reunión de entrega del informe final BPC:2026.',
    html_preview: 'Para: '+destinatario+' · Asunto: Reunión de entrega — BPC:2026 | '+aud.clienteNombre,
    _payload: {
      from_name: agenteNombre,
      to: destinatario,
      subject: '📅 Reunión de entrega del informe BPC:2026 — '+aud.clienteNombre,
      html: html,
      text: 'Reunión de entrega del informe BPC:2026. Reservá tu turno en el link incluido.'
    }
  });

  // Notificar internamente a todos los dueños con email
  for(const u of duenos.filter(u=>u?.email)){
    await fetch('/.netlify/functions/send-email',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        from_email:emailCfg.smtp_user, from_password:emailCfg.smtp_pass,
        from_name:'Agente MetoGroup', to:u.email,
        subject:'📋 Informe enviado — reunión de entrega de informe pendiente: '+aud.clienteNombre,
        html:'<div style="font-family:Arial,sans-serif;padding:24px;max-width:500px">'
          +'<h2 style="color:#c8a84a;font-size:16px;margin-bottom:12px">Reunión de entrega de informe pendiente</h2>'
          +'<p style="font-size:13px;color:#333;margin-bottom:8px"><strong>Cliente:</strong> '+aud.clienteNombre+'</p>'
          +'<p style="font-size:13px;color:#333;margin-bottom:8px"><strong>Score BPC:2026:</strong> '+(aud.resultado||'—')+'/100</p>'
          +'<p style="font-size:13px;color:#333;margin-bottom:8px"><strong>N° Auditoría:</strong> '+(aud.nroAuditoria||'—')+'</p>'
          +'<p style="font-size:13px;color:#444;margin-top:16px">El informe fue enviado al cliente junto con tu link de Calendly. El cliente agendará directamente cuando esté disponible.</p>'
          +'</div>',
        text:'Informe BPC:2026 enviado a '+aud.clienteNombre+'. Score: '+(aud.resultado||'—')+'/100. El cliente agendará la reunión vía Calendly.'
      })
    }).catch(()=>{});
  }

  const auds = S.get('auditorias');
  const ai = auds.findIndex(x=>x.id===audId);
  if(ai>-1){ auds[ai].reunion_email_enviado = true; S.set('auditorias', auds); }

  toast('📅 Email de reunión enviado al cliente con links de Calendly');
}

function mapaMarcarFirma(audId){
  const items = S.get('auditorias');
  const i = items.findIndex(x=>x.id===audId);
  if(i<0) return;
  items[i].informe_firmado = true;
  S.set('auditorias', items);
  toast('✅ Informe marcado como firmado');
  setTimeout(()=> auditDetail(audId), 200);
}

// ── Constructor: Informe Interno MetoGroup ────────────────────────
function construirInformeInterno(aud, cliente, consultor, dominios, ia, score, nivel, ncC, ncM, ncMn, conf){
  const fmtD2 = f=>f?f.split('-').reverse().join('/'):'—';
  const hoy = new Date().toLocaleDateString('es-AR');
  const nivelColor = nivel==='ALTO'?'#22c55e':nivel==='MEDIO'?'#f59e0b':'#ef4444';

  const DA_CONTROLES = [
    ['A.5.1','Plan estratégico comercial documentado'],['A.5.2','Misión y valores comunicados'],['A.5.3','Estructura organizacional definida'],['A.5.4','Responsable comercial designado'],['A.5.5','Revisión estratégica anual'],['A.5.6','Presupuesto comercial aprobado'],
    ['A.6.1','Perfiles de cargo actualizados'],['A.6.2','Proceso de selección con criterios'],['A.6.3','Programa de inducción para vendedores'],['A.6.4','Plan de capacitación ejecutado'],['A.6.5','Evaluación con indicadores de proceso'],['A.6.6','Compensación variable documentada'],
    ['A.7.1','Proceso de ventas documentado'],['A.7.2','Propuesta de valor conocida'],['A.7.3','Materiales de apoyo actualizados'],['A.7.4','Revisiones de pipeline semanales'],['A.7.5','Canales gestionados formalmente'],['A.7.6','Onboarding de clientes definido'],
    ['A.8.1','Manual de identidad vigente'],['A.8.2','Materiales con identidad consistente'],['A.8.3','Presencia digital activa'],['A.8.4','Aprobación de materiales de comunicación'],['A.8.5','Gestión de reseñas online'],
    ['A.9.1','CRM con adopción ≥90%'],['A.9.2','Pipeline configurado en CRM'],['A.9.3','Integración CRM-comunicación'],['A.9.4','Control de accesos y revocación'],['A.9.5','Backup de datos documentado'],['A.9.6','Política de herramientas digitales'],
    ['A.10.1','Materiales sin promesas sin respaldo'],['A.10.2','Cláusulas de confidencialidad'],['A.10.3','Política de conflictos de interés'],['A.10.4','Gestión de reclamos documentada'],['A.10.5','Código de conducta conocido'],
    ['A.11.1','Base de datos actualizada'],['A.11.2','Política de privacidad vigente'],['A.11.3','Consentimiento de datos documentado'],['A.11.4','NPS medido con periodicidad'],['A.11.5','Seguimiento post-venta documentado'],['A.11.6','Segmentación de cartera actualizada'],
    ['A.12.1','KPIs definidos y medidos'],['A.12.2','Dashboard con actualización semanal'],['A.12.3','Reunión de revisión mensual'],['A.12.4','Benchmarking sectorial reciente'],['A.12.5','Ciclo de mejora continua'],['A.12.6','Objetivos del siguiente período'],['A.12.7','Informe de cierre de ciclo anual'],
  ];

  const ncTotales = {critica:ncC, mayor:ncM, menor:ncMn};
  // Distribuir NCs en controles (simplificado)
  let ncIdx=0, ncMIdx=0, ncMnIdx=0;
  const estadoControl = (ref) => {
    const dom = dominios.find(d=>ref.startsWith(d.ref));
    if(!dom) return 'CONFORME';
    // Asignar estado basado en hallazgos del dominio
    if(dom.nc_critica>0 && ncIdx<dom.nc_critica){ ncIdx++; return 'NC CRÍTICA'; }
    if(dom.nc_mayor>0 && ncMIdx<dom.nc_mayor){ ncMIdx++; return 'NC MAYOR'; }
    if(dom.nc_menor>0 && ncMnIdx<dom.nc_menor){ ncMnIdx++; return 'NC MENOR'; }
    return 'CONFORME';
  };

  return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Informe Interno BPC:2026 — '+aud.clienteNombre+'</title>'
    +'<style>'
    +'*{margin:0;padding:0;box-sizing:border-box}'
    +'body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a1a;background:#fff;line-height:1.5}'
    +'@media print{.no-print{display:none}@page{margin:15mm;size:A4}}'
    +'.page{max-width:800px;margin:0 auto;padding:24px}'
    +'h1{font-size:20px;font-weight:700;margin-bottom:4px}'
    +'h2{font-size:14px;font-weight:700;margin:20px 0 8px;padding-bottom:4px;border-bottom:2px solid #1a1a1a}'
    +'h3{font-size:12px;font-weight:700;margin:12px 0 4px}'
    +'.header{border-bottom:3px solid #1a1a1a;padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-start}'
    +'.badge{display:inline-block;padding:3px 8px;border-radius:3px;font-size:10px;font-weight:700}'
    +'.badge-c{background:#fee2e2;color:#dc2626}'
    +'.badge-m{background:#fef3c7;color:#d97706}'
    +'.badge-mn{background:#f1f5f9;color:#475569}'
    +'.badge-ok{background:#dcfce7;color:#16a34a}'
    +'.score-box{border:2px solid #1a1a1a;padding:12px 20px;text-align:center;margin-bottom:16px}'
    +'.score-num{font-size:48px;font-weight:900;line-height:1}'
    +'table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:11px}'
    +'th{background:#1a1a1a;color:#fff;padding:6px 8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.05em}'
    +'td{padding:5px 8px;border-bottom:1px solid #e5e5e5;vertical-align:top}'
    +'tr:nth-child(even) td{background:#f9f9f9}'
    +'.firma-box{border:1.5px solid #1a1a1a;padding:16px;margin-bottom:12px}'
    +'.firma-line{border-top:1px solid #1a1a1a;margin-top:32px;padding-top:4px;font-size:10px;color:#666}'
    +'</style></head><body><div class="page">'
    // Header
    +'<div class="header"><div>'
    +'<div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#888;margin-bottom:4px">DOCUMENTO TÉCNICO INTERNO · CONFIDENCIAL</div>'
    +'<h1>INFORME DE AUDITORÍA BPC:2026</h1>'
    +'<div style="font-size:12px;color:#555">Versión Interna MetoGroup · Para revisión y firma</div>'
    +'</div>'
    +'<div style="text-align:right">'
    +'<div style="font-size:10px;color:#888">N° Auditoría</div>'
    +'<div style="font-size:14px;font-weight:700">'+(aud.nroAuditoria||'MG-BPC-2026-___')+'</div>'
    +'<div style="font-size:10px;color:#888;margin-top:4px">Generado: '+hoy+'</div>'
    +'</div></div>'
    // Score global
    +'<div class="score-box">'
    +'<div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#888;margin-bottom:4px">Score Global BPC:2026</div>'
    +'<div class="score-num" style="color:'+nivelColor+'">'+score+'</div>'
    +'<div style="font-size:12px;color:'+nivelColor+'">'+nivel+' · /100</div>'
    +'<div style="margin-top:8px;display:flex;justify-content:center;gap:16px">'
    +'<span class="badge badge-c">'+ncC+' NC Críticas</span>'
    +'<span class="badge badge-m">'+ncM+' NC Mayores</span>'
    +'<span class="badge badge-mn">'+ncMn+' NC Menores</span>'
    +'<span class="badge badge-ok">'+conf+' Conformes</span>'
    +'</div></div>'
    // Datos de la auditoría
    +'<h2>01 · Datos de la Auditoría</h2>'
    +'<table><tbody>'
    +'<tr><td style="font-weight:600;width:180px">Organización auditada</td><td>'+aud.clienteNombre+'</td><td style="font-weight:600;width:180px">Rubro</td><td>'+(cliente.rubro||'—')+'</td></tr>'
    +'<tr><td style="font-weight:600">Auditor Líder</td><td>'+(aud.auditor||'—')+'</td><td style="font-weight:600">Email auditor</td><td>'+(consultor.email||'—')+'</td></tr>'
    +'<tr><td style="font-weight:600">N° Auditoría</td><td>'+(aud.nroAuditoria||'—')+'</td><td style="font-weight:600">Tipo</td><td>'+(aud.tipo||'BPCE 72001')+'</td></tr>'
    +'<tr><td style="font-weight:600">Fecha documental</td><td>'+fmtD2(aud.fDoc)+'</td><td style="font-weight:600">Fecha in situ</td><td>'+fmtD2(aud.fInsitu)+'</td></tr>'
    +'<tr><td style="font-weight:600">Fecha cierre</td><td>'+fmtD2(aud.fCierre||aud.fInforme)+'</td><td style="font-weight:600">Revisión técnica</td><td>MetoGroup Latam S.A.</td></tr>'
    +'</tbody></table>'
    // Resumen ejecutivo
    +'<h2>02 · Resumen Ejecutivo</h2>'
    +'<p style="margin-bottom:12px;color:#333">'+(ia.resumen_ejecutivo||'Sin resumen disponible.')+'</p>'
    // Score por dominio
    +'<h2>03 · Score Consolidado por Dominio</h2>'
    +'<table><thead><tr><th>REF</th><th>Dominio</th><th>Score</th><th>Nivel</th><th>C</th><th>M</th><th>Mn</th></tr></thead><tbody>'
    +dominios.map(d=>{
      const niv = d.score>=75?'ALTO':d.score>=50?'MEDIO':'BAJO';
      const nc = d.score>0&&d.nc_critica===0&&d.nc_mayor===0?'badge-ok':'badge-mn';
      return '<tr><td style="font-weight:700">'+d.ref+'</td><td>'+d.nombre+'</td>'
        +'<td style="font-weight:700;color:'+(d.score>=75?'#16a34a':d.score>=50?'#d97706':'#dc2626')+'">'+d.score+'</td>'
        +'<td><span class="badge '+(d.score>=75?'badge-ok':d.score>=50?'badge-m':'badge-c')+'">'+niv+'</span></td>'
        +'<td>'+(d.nc_critica||'—')+'</td><td>'+(d.nc_mayor||'—')+'</td><td>'+(d.nc_menor||'—')+'</td></tr>';
    }).join('')
    +'</tbody></table>'
    // Hallazgos por dominio
    +'<h2>04 · Hallazgos por Dominio</h2>'
    +dominios.map((d,i)=>{
      const iaD = ia.dominios?.[i]||{};
      return '<div style="margin-bottom:16px;padding:12px;border-left:3px solid '+(d.nc_critica>0?'#dc2626':d.nc_mayor>0?'#d97706':d.nc_menor>0?'#94a3b8':'#16a34a')+';background:#fafafa">'
        +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'
        +'<h3 style="margin:0">'+d.ref+' — '+d.nombre+'</h3>'
        +'<span style="font-size:18px;font-weight:900;color:'+(d.score>=75?'#16a34a':d.score>=50?'#d97706':'#dc2626')+'">'+d.score+'</span>'
        +(d.nc_critica>0?'<span class="badge badge-c">'+d.nc_critica+' NC CRÍTICA</span>':'')
        +(d.nc_mayor>0?'<span class="badge badge-m">'+d.nc_mayor+' NC MAYOR</span>':'')
        +(d.nc_menor>0?'<span class="badge badge-mn">'+d.nc_menor+' NC MENOR</span>':'')
        +'</div>'
        +'<div style="font-size:11px;color:#555;margin-bottom:6px"><strong>Hallazgo:</strong> '+(d.hallazgo||iaD.descripcion_hallazgo||'Todos los controles del dominio evaluados como CONFORMES.')+'</div>'
        +(iaD.accion_correctiva?'<div style="font-size:11px;color:#555;margin-bottom:4px"><strong>Acción correctiva:</strong> '+iaD.accion_correctiva+'</div>':'')
        +(iaD.responsable?'<div style="font-size:10px;color:#888"><strong>Responsable:</strong> '+iaD.responsable+' · <strong>Plazo:</strong> '+(iaD.plazo||'—')+'</div>':'')
        +'</div>';
    }).join('')
    // DA-BPC simplificada
    +'<h2>05 · Declaración de Aplicabilidad (DA-BPC:2026)</h2>'
    +'<table><thead><tr><th>REF</th><th>Control</th><th>Estado</th></tr></thead><tbody>'
    +DA_CONTROLES.map(([ref,desc])=>{
      // Reset contadores por dominio
      const domRef = ref.match(/A\.\d+/)?.[0];
      const dom = dominios.find(d=>d.ref===domRef);
      const st = !dom||dom.score===0?'CONFORME':dom.nc_critica>0&&ref.endsWith('.1')?'NC CRÍTICA':dom.nc_mayor>0&&ref.endsWith('.4')?'NC MAYOR':dom.nc_menor>0&&ref.endsWith('.5')?'NC MENOR':'CONFORME';
      const cl = st==='NC CRÍTICA'?'badge-c':st==='NC MAYOR'?'badge-m':st==='NC MENOR'?'badge-mn':'badge-ok';
      return '<tr><td style="font-weight:600;white-space:nowrap">'+ref+'</td><td>'+desc+'</td><td><span class="badge '+cl+'">'+st+'</span></td></tr>';
    }).join('')
    +'</tbody></table>'
    // Plan de mejora
    +'<h2>06 · Plan de Mejora Recomendado</h2>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">'
    +[['FASE 1','0-7 días','Inmediato','#dc2626'],['FASE 2','8-30 días','Corto plazo','#d97706'],['FASE 3','31-90 días','Mediano plazo','#16a34a']].map(([fase,plazo,label,col],i)=>{
      const acciones = ia.plan_fases?.['fase'+(i+1)]||[];
      return '<div style="border:1.5px solid '+col+';padding:10px;border-radius:4px">'
        +'<div style="font-size:10px;font-weight:700;color:'+col+';text-transform:uppercase;margin-bottom:2px">'+fase+' · '+label+'</div>'
        +'<div style="font-size:9px;color:#888;margin-bottom:8px">'+plazo+'</div>'
        +(acciones.length?acciones.map(a=>'<div style="font-size:10px;color:#333;margin-bottom:4px;padding-left:8px;border-left:2px solid '+col+'">'+a+'</div>').join(''):'<div style="font-size:10px;color:#aaa;font-style:italic">Sin acciones definidas</div>')
        +'</div>';
    }).join('')
    +'</div>'
    // Conclusión
    +'<h2>07 · Conclusión del Auditor</h2>'
    +'<p style="margin-bottom:20px;color:#333;font-style:italic;border-left:3px solid #1a1a1a;padding-left:12px">'+(ia.conclusion_auditor||'Sin conclusión disponible.')+'</p>'
    // Notas del consultor
    +(aud.notas_informe?'<div style="background:#fffde7;border:1px solid #fbc02d;border-radius:4px;padding:12px;margin-bottom:20px"><strong>Notas del consultor:</strong> '+aud.notas_informe+'</div>':'')
    // Firmas
    +'<h2>08 · Validación y Firma</h2>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">'
    +'<div class="firma-box">'
    +'<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px">Auditor Líder BPC — MetoGroup</div>'
    +(aud.firma_consultor_ok
      ?'<div style="color:#16a34a;font-size:12px;margin-bottom:8px">✓ Firmado digitalmente</div><div style="font-size:11px"><strong>'+aud.firma_consultor_nombre+'</strong><br>'+aud.firma_consultor_fecha+'</div>'
      :'<div class="firma-line">Firma</div><div style="margin-top:12px;font-size:10px;color:#888">Nombre: ___________________________<br>Fecha: ____________________________</div>')
    +'</div>'
    +'<div class="firma-box">'
    +'<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px">Representante de la Organización</div>'
    +(aud.firma_dueno_ok
      ?'<div style="color:#16a34a;font-size:12px;margin-bottom:8px">✓ Firmado digitalmente</div><div style="font-size:11px"><strong>'+aud.firma_dueno_nombre+'</strong><br>'+aud.firma_dueno_fecha+'</div>'
      :'<div class="firma-line">Firma</div><div style="margin-top:12px;font-size:10px;color:#888">Nombre: ___________________________<br>Cargo: _____________________________<br>Fecha: ____________________________</div>')
    +'</div>'
    +'</div>'
    +'<div style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e5e5;font-size:9px;color:#999;text-align:center">'
    +'MetoGroup Latam S.A. · BPC:2026 · Informe Interno · '+hoy+' · Confidencial — Uso exclusivo del equipo MetoGroup'
    +'</div>'
    +'</div></body></html>';
}

// ── Constructor: Informe Premium para el cliente ──────────────────
function construirInformeCliente(aud, cliente, consultor, dominios, ia, score, nivel, ncC, ncM, ncMn, conf){
  const fmtD2 = f=>f?f.split('-').reverse().join('/'):'—';
  const hoy = new Date().toLocaleDateString('es-AR');
  const nivelColor = nivel==='ALTO'?'#4ade80':nivel==='MEDIO'?'#c8a84a':'#ef4444';
  const scoreAngle = Math.round(score * 2.7); // 0-270 degrees

  return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Informe BPC:2026 — '+aud.clienteNombre+'</title>'
    +'<style>'
    +'*{margin:0;padding:0;box-sizing:border-box}'
    +'@import url(\'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&display=swap\');'
    +'body{font-family:\'Inter\',Arial,sans-serif;background:#0d1117;color:#e2e8f0;line-height:1.6}'
    +':root{--gold:#c8a84a;--gold-light:#e8c97a;--gold-dim:rgba(200,168,74,0.15);--surface:#151b23;--surface2:#1a2130;--border:rgba(200,168,74,0.15);--text:#e2e8f0;--muted:#64748b}'
    +'@media print{body{background:#fff;color:#1a1a1a}.page-break{page-break-before:always}@page{margin:12mm;size:A4}}'
    +'.container{max-width:900px;margin:0 auto;padding:0 24px}'
    // Portada
    +'.cover{background:linear-gradient(135deg,#0d1117 0%,#151b23 50%,#0a0f15 100%);min-height:100vh;display:flex;flex-direction:column;justify-content:space-between;padding:40px;position:relative;overflow:hidden}'
    +'.cover::before{content:\'\';position:absolute;top:-100px;right:-100px;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(200,168,74,0.08) 0%,transparent 70%);pointer-events:none}'
    +'.cover::after{content:\'\';position:absolute;bottom:-80px;left:-80px;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(200,168,74,0.05) 0%,transparent 70%);pointer-events:none}'
    // Score circle
    +'.score-circle{position:relative;width:160px;height:160px}'
    +'.score-circle svg{position:absolute;top:0;left:0;transform:rotate(-135deg)}'
    +'.score-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center}'
    +'.score-num{font-size:42px;font-weight:900;color:var(--gold);line-height:1}'
    // Sections
    +'.section{padding:48px 0;border-bottom:1px solid var(--border)}'
    +'.section-tag{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:8px}'
    +'.section-title{font-size:28px;font-weight:700;color:#fff;margin-bottom:20px;position:relative;padding-bottom:12px}'
    +'.section-title::after{content:\'\';position:absolute;bottom:0;left:0;width:48px;height:2px;background:var(--gold)}'
    // Cards
    +'.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:12px}'
    +'.dom-card{display:grid;grid-template-columns:auto 1fr auto;gap:16px;align-items:start}'
    +'.dom-score{font-size:32px;font-weight:900;line-height:1;min-width:50px;text-align:right}'
    +'.badge-inline{display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase}'
    +'.badge-critica{background:rgba(239,68,68,0.15);color:#f87171;border:1px solid rgba(239,68,68,0.3)}'
    +'.badge-mayor{background:rgba(245,158,11,0.15);color:#fbbf24;border:1px solid rgba(245,158,11,0.3)}'
    +'.badge-menor{background:rgba(100,116,139,0.15);color:#94a3b8;border:1px solid rgba(100,116,139,0.3)}'
    +'.badge-ok{background:rgba(34,197,94,0.12);color:#4ade80;border:1px solid rgba(34,197,94,0.25)}'
    +'.badge-alto{background:rgba(34,197,94,0.12);color:#4ade80;border:1px solid rgba(34,197,94,0.25)}'
    +'.badge-medio{background:rgba(200,168,74,0.12);color:var(--gold);border:1px solid rgba(200,168,74,0.3)}'
    +'.badge-bajo{background:rgba(239,68,68,0.12);color:#f87171;border:1px solid rgba(239,68,68,0.25)}'
    // Stats row
    +'.stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:24px 0}'
    +'.stat-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px;text-align:center}'
    +'.stat-num{font-size:32px;font-weight:900;line-height:1;margin-bottom:4px}'
    +'.stat-lbl{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted)}'
    // Plan
    +'.plan-col{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px}'
    +'.plan-item{font-size:12px;color:#cbd5e1;padding:6px 0 6px 12px;border-left:2px solid var(--gold);margin-bottom:6px}'
    // Table
    +'.table-bpc{width:100%;border-collapse:collapse;font-size:11px}'
    +'.table-bpc th{background:var(--surface2);color:var(--gold);padding:8px 10px;text-align:left;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;border-bottom:1px solid var(--border)}'
    +'.table-bpc td{padding:7px 10px;border-bottom:1px solid rgba(255,255,255,0.04);vertical-align:middle}'
    +'.table-bpc tr:hover td{background:rgba(200,168,74,0.03)}'
    // Firma
    +'.firma-block{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px}'
    +'.firma-line{border-top:1px solid rgba(200,168,74,0.3);margin-top:40px;padding-top:8px;font-size:10px;color:var(--muted)}'
    +'</style></head><body>'

    // ── PORTADA ──────────────────────────────────────────────────
    +'<div class="cover">'
    +'<div style="display:flex;justify-content:space-between;align-items:center">'
    +'<div><span style="color:var(--gold);font-weight:900;font-size:18px">Meto</span><span style="color:#fff;font-size:18px;font-weight:300">Group</span></div>'
    +'<div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--muted)">DOCUMENTO TÉCNICO · CONFIDENCIAL</div>'
    +'</div>'
    +'<div style="flex:1;display:flex;align-items:center;justify-content:space-between;padding:40px 0">'
    +'<div>'
    +'<div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:16px">INFORME DE</div>'
    +'<div style="font-size:64px;font-weight:900;color:#fff;line-height:1;letter-spacing:-2px">AUDITORÍA<br><span style="color:var(--gold)">BPC:2026</span></div>'
    +'<div style="font-size:14px;color:var(--muted);margin-top:12px;font-style:italic">Buenas Prácticas Comerciales y Éticas</div>'
    +'<div style="font-size:11px;color:var(--muted);margin-top:4px">Norma MetoGroup · Primera Edición 2026</div>'
    +'</div>'
    // Score circle SVG
    +'<div class="score-circle" style="width:180px;height:180px">'
    +'<svg viewBox="0 0 180 180" width="180" height="180">'
    +'<circle cx="90" cy="90" r="70" fill="none" stroke="rgba(200,168,74,0.1)" stroke-width="10" stroke-dasharray="440" stroke-dashoffset="0" stroke-linecap="round"/>'
    +'<circle cx="90" cy="90" r="70" fill="none" stroke="'+nivelColor+'" stroke-width="10" stroke-dasharray="440" stroke-dashoffset="'+(440-Math.round(score*440/100))+'" stroke-linecap="round"/>'
    +'</svg>'
    +'<div class="score-center">'
    +'<div class="score-num">'+score+'</div>'
    +'<div style="font-size:11px;color:var(--muted)">/100</div>'
    +'<div style="font-size:12px;font-weight:700;color:'+nivelColor+';margin-top:2px">'+nivel+'</div>'
    +'<div style="font-size:9px;color:var(--muted)">RESULTADO GLOBAL</div>'
    +'</div></div>'
    +'</div>'
    // Stats portada
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px">'
    +'<div><div style="font-size:9px;letter-spacing:2px;color:var(--muted);text-transform:uppercase">AUDITORÍA N.</div><div style="font-size:13px;font-weight:700;color:#fff;margin-top:4px">'+(aud.nroAuditoria||'MG-BPC-2026-___')+'</div></div>'
    +'<div><div style="font-size:9px;letter-spacing:2px;color:var(--muted);text-transform:uppercase">FECHA CIERRE</div><div style="font-size:13px;font-weight:700;color:#fff;margin-top:4px">'+fmtD2(aud.fCierre||aud.fInforme)+'</div></div>'
    +'<div><div style="font-size:9px;letter-spacing:2px;color:var(--muted);text-transform:uppercase">AUDITOR LÍDER</div><div style="font-size:13px;font-weight:700;color:#fff;margin-top:4px">'+(aud.auditor||'—')+'</div></div>'
    +'<div><div style="font-size:9px;letter-spacing:2px;color:var(--muted);text-transform:uppercase">REV. TÉCNICA</div><div style="font-size:13px;font-weight:700;color:var(--gold);margin-top:4px">MetoGroup Latam</div></div>'
    +'</div>'
    // NC bar portada
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1px;border-radius:8px;overflow:hidden">'
    +'<div style="background:rgba(239,68,68,0.2);padding:12px 16px"><div style="font-size:24px;font-weight:900;color:#f87171">'+ncC+'</div><div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#f87171">NC Críticas</div></div>'
    +'<div style="background:rgba(245,158,11,0.2);padding:12px 16px"><div style="font-size:24px;font-weight:900;color:#fbbf24">'+ncM+'</div><div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#fbbf24">NC Mayores</div></div>'
    +'<div style="background:rgba(100,116,139,0.2);padding:12px 16px"><div style="font-size:24px;font-weight:900;color:#94a3b8">'+ncMn+'</div><div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8">NC Menores</div></div>'
    +'<div style="background:rgba(34,197,94,0.15);padding:12px 16px"><div style="font-size:24px;font-weight:900;color:#4ade80">'+conf+'</div><div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#4ade80">Conformes</div></div>'
    +'</div>'
    // Nombre empresa en portada
    +'<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;margin-top:20px">'
    +'<div><div style="font-size:18px;font-weight:700;color:#fff">'+aud.clienteNombre+'</div><div style="font-size:11px;color:var(--muted)">Organización Auditada</div></div>'
    +'<div style="text-align:right"><div style="font-size:11px;color:var(--muted)">47 Controles BPC · 8 Dominios · 5 Fases · Plan PAC 90d</div></div>'
    +'</div>'
    +'<div style="font-size:10px;color:var(--muted);text-align:center;margin-top:16px">MetoGroup Latam S.A. · BPC:2026 · '+new Date().toLocaleDateString('es-AR',{month:'long',year:'numeric'})+' · www.metogroup.com</div>'
    +'</div>'

    // ── CONTENIDO ────────────────────────────────────────────────
    +'<div class="container">'

    // Resumen Ejecutivo
    +'<div class="section page-break">'
    +'<div class="section-tag">01</div>'
    +'<h2 class="section-title">Resumen Ejecutivo</h2>'
    +'<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:24px;margin-bottom:24px;display:grid;grid-template-columns:auto 1fr;gap:24px;align-items:center">'
    +'<div style="text-align:center">'
    +'<div style="font-size:56px;font-weight:900;color:var(--gold);line-height:1">'+score+'</div>'
    +'<div style="font-size:11px;color:var(--muted)">/100</div>'
    +'<div style="margin-top:8px"><span class="badge-inline badge-'+(nivel.toLowerCase())+'">'+nivel+'</span></div>'
    +'<div style="font-size:9px;color:var(--muted);margin-top:6px">Escala BPC:2026: &lt;50 Bajo · 50-74 Medio · ≥75 Alto</div>'
    +'</div>'
    +'<div>'
    +'<p style="font-size:14px;color:#cbd5e1;line-height:1.8;font-style:italic">'+(ia.resumen_ejecutivo||'Resultado de la auditoría BPC:2026.')+'</p>'
    +'</div></div>'
    // Stats row
    +'<div class="stats-row">'
    +'<div class="stat-card"><div class="stat-num" style="color:#f87171">'+ncC+'</div><div style="font-size:9px;color:var(--muted);margin-bottom:4px">30 días</div><div class="stat-lbl">NC Críticas</div></div>'
    +'<div class="stat-card"><div class="stat-num" style="color:#fbbf24">'+ncM+'</div><div style="font-size:9px;color:var(--muted);margin-bottom:4px">60 días</div><div class="stat-lbl">NC Mayores</div></div>'
    +'<div class="stat-card"><div class="stat-num" style="color:#94a3b8">'+ncMn+'</div><div style="font-size:9px;color:var(--muted);margin-bottom:4px">90 días</div><div class="stat-lbl">NC Menores</div></div>'
    +'<div class="stat-card"><div class="stat-num" style="color:#4ade80">'+conf+'</div><div style="font-size:9px;color:var(--muted);margin-bottom:4px">controles OK</div><div class="stat-lbl">Conformes</div></div>'
    +'</div>'
    // Score por dominio
    +'<div style="margin-top:20px">'
    +'<div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--gold);margin-bottom:12px">Score Consolidado por Dominio</div>'
    +'<div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden">'
    +'<table class="table-bpc"><thead><tr><th>REF</th><th>Dominio</th><th>Score</th><th>Nivel</th><th>C</th><th>M</th><th>Mn</th></tr></thead><tbody>'
    +dominios.map(d=>{
      const niv=d.score>=75?'ALTO':d.score>=50?'MEDIO':'BAJO';
      const nc=d.score>0&&d.nc_critica===0&&d.nc_mayor===0;
      return '<tr>'
        +'<td style="font-weight:700;color:var(--gold)">'+d.ref+'</td>'
        +'<td style="color:#cbd5e1">'+d.nombre+'</td>'
        +'<td style="font-size:18px;font-weight:900;color:'+(d.score>=75?'#4ade80':d.score>=50?'var(--gold)':'#f87171')+'">'+d.score+'</td>'
        +'<td><span class="badge-inline badge-'+(niv.toLowerCase())+'">'+niv+'</span></td>'
        +'<td><span style="color:'+(d.nc_critica>0?'#f87171':'var(--muted)')+'">'+d.nc_critica+'</span></td>'
        +'<td><span style="color:'+(d.nc_mayor>0?'#fbbf24':'var(--muted)')+'">'+d.nc_mayor+'</span></td>'
        +'<td><span style="color:'+(d.nc_menor>0?'#94a3b8':'var(--muted)')+'">'+d.nc_menor+'</span></td>'
        +'</tr>';
    }).join('')
    +'</tbody></table></div></div></div>'

    // Hallazgos por dominio
    +'<div class="section page-break">'
    +'<div class="section-tag">02</div>'
    +'<h2 class="section-title">Hallazgos por Dominio</h2>'
    +dominios.map((d,i)=>{
      const iaD = ia.dominios?.[i]||{};
      const niv=d.score>=75?'ALTO':d.score>=50?'MEDIO':'BAJO';
      const bord=d.nc_critica>0?'rgba(239,68,68,0.4)':d.nc_mayor>0?'rgba(245,158,11,0.4)':d.nc_menor>0?'rgba(100,116,139,0.3)':'rgba(34,197,94,0.3)';
      return '<div style="background:var(--surface);border:1px solid var(--border);border-top:3px solid '+bord+';border-radius:12px;padding:20px;margin-bottom:12px">'
        +'<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">'
        +'<div style="font-size:10px;font-weight:700;letter-spacing:2px;color:var(--gold);min-width:32px">'+d.ref+'</div>'
        +'<div style="flex:1"><div style="font-size:15px;font-weight:700;color:#fff">'+d.nombre+'</div></div>'
        +'<div style="font-size:28px;font-weight:900;color:'+(d.score>=75?'#4ade80':d.score>=50?'var(--gold)':'#f87171')+'">'+d.score+'</div>'
        +'<div><span class="badge-inline badge-'+(niv.toLowerCase())+'">'+niv+'</span></div>'
        +(d.nc_critica>0?'<span class="badge-inline badge-critica">'+d.nc_critica+' NC C</span>':'')
        +(d.nc_mayor>0?'<span class="badge-inline badge-mayor">'+d.nc_mayor+' NC M</span>':'')
        +(d.nc_menor>0?'<span class="badge-inline badge-menor">'+d.nc_menor+' NC Mn</span>':'')
        +'</div>'
        +(d.hallazgo||iaD.descripcion_hallazgo
          ?'<div style="font-size:12px;color:#94a3b8;margin-bottom:8px;padding:10px;background:rgba(0,0,0,0.2);border-radius:6px;border-left:2px solid '+bord+'"><strong style="color:#cbd5e1">Hallazgo:</strong> '+(d.hallazgo||iaD.descripcion_hallazgo)+'</div>'
          :'<div style="font-size:12px;color:#4ade80;font-style:italic">✓ Todos los controles del dominio evaluados como CONFORMES.</div>')
        +(iaD.accion_correctiva?'<div style="font-size:12px;color:#94a3b8;margin-bottom:6px"><strong style="color:#cbd5e1">Acción correctiva:</strong> '+iaD.accion_correctiva+'</div>':'')
        +(iaD.responsable?'<div style="font-size:11px;color:var(--muted)">Responsable: <strong>'+iaD.responsable+'</strong> · Plazo: <strong style="color:var(--gold)">'+iaD.plazo+'</strong></div>':'')
        +'</div>';
    }).join('')
    +'</div>'

    // Plan de mejora
    +'<div class="section page-break">'
    +'<div class="section-tag">03</div>'
    +'<h2 class="section-title">Plan de Mejora Recomendado</h2>'
    +(ia.fortalezas?.length?'<div style="margin-bottom:24px"><div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#4ade80;margin-bottom:10px">Fortalezas detectadas</div>'
      +ia.fortalezas.map(f=>'<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="color:#4ade80;font-size:14px">◆</span><span style="font-size:13px;color:#cbd5e1">'+f+'</span></div>').join('')
      +'</div>':'')
    +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">'
    +[['FASE 1','0 — 7 días','Inmediato','#f87171'],['FASE 2','8 — 30 días','Corto plazo','var(--gold)'],['FASE 3','31 — 90 días','Mediano plazo','#4ade80']].map(([fase,plazo,label,col],i)=>{
      const acciones = ia.plan_fases?.['fase'+(i+1)]||[];
      return '<div class="plan-col">'
        +'<div style="font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:'+col+';margin-bottom:2px">'+fase+' · '+label+'</div>'
        +'<div style="font-size:10px;color:var(--muted);margin-bottom:12px">'+plazo+'</div>'
        +(acciones.length?acciones.map(a=>'<div class="plan-item" style="border-left-color:'+col+'">'+a+'</div>').join(''):'<div style="font-size:11px;color:var(--muted);font-style:italic">Sin acciones definidas</div>')
        +'</div>';
    }).join('')
    +'</div></div>'

    // Conclusión y firma
    +'<div class="section page-break">'
    +'<div class="section-tag">04</div>'
    +'<h2 class="section-title">Conclusión del Auditor</h2>'
    +'<div style="background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--gold);border-radius:0 12px 12px 0;padding:20px;margin-bottom:32px">'
    +'<p style="font-size:13px;color:#cbd5e1;line-height:1.9;font-style:italic">'+(ia.conclusion_auditor||'Conclusión de la auditoría BPC:2026.')+'</p>'
    +'</div>'
    // Resultado final
    +'<div style="background:var(--surface);border:2px solid var(--gold);border-radius:12px;padding:20px;margin-bottom:32px;text-align:center">'
    +'<div style="font-size:13px;font-weight:700;color:var(--gold);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">Resultado: '+score+'/100 — Nivel '+nivel+'</div>'
    +'<div style="font-size:12px;color:#94a3b8">NC Críticas: '+ncC+' &nbsp;·&nbsp; NC Mayores: '+ncM+' &nbsp;·&nbsp; NC Menores: '+ncMn+' &nbsp;·&nbsp; Conformes: '+conf+' de 47 controles</div>'
    +'</div>'
    // Firmas
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">'
    +'<div class="firma-block">'
    +'<div style="font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin-bottom:20px">AUDITOR LÍDER BPC — METOGROUP</div>'
    +(aud.firma_consultor_ok
      ?'<div style="color:#4ade80;font-size:12px;margin-bottom:8px">✓ Firmado digitalmente</div><div style="font-size:12px;color:#cbd5e1"><strong>'+aud.firma_consultor_nombre+'</strong><br><span style="color:var(--muted)">'+aud.firma_consultor_fecha+'</span></div>'
      :'<div class="firma-line">Firma</div><div style="margin-top:12px;font-size:10px;color:var(--muted)">Nombre completo: ___________________________<br>N. Certificación MetoGroup: MG-AUD-BPC-____<br>Fecha de emisión: ____________________________</div>')
    +'</div>'
    +'<div class="firma-block">'
    +'<div style="font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin-bottom:20px">REPRESENTANTE DE LA ORGANIZACIÓN</div>'
    +(aud.firma_dueno_ok
      ?'<div style="color:#4ade80;font-size:12px;margin-bottom:8px">✓ Firmado digitalmente</div><div style="font-size:12px;color:#cbd5e1"><strong>'+aud.firma_dueno_nombre+'</strong><br><span style="color:var(--muted)">'+aud.firma_dueno_fecha+'</span></div>'
      :'<div class="firma-line">Firma</div><div style="margin-top:12px;font-size:10px;color:var(--muted)">Nombre completo: ___________________________<br>Cargo: ________________________________________<br>Fecha de recepción: ____________________________</div>')
    +'</div>'
    +'</div>'
    +'<div style="margin-top:16px;font-size:9px;color:var(--muted);text-align:center;font-style:italic">'
    +'Este informe es válido únicamente con la firma del Auditor Líder y el sello de MetoGroup Latam S.A. La vigencia del resultado es de 12 meses desde la fecha de emisión.'
    +'</div>'
    +'</div>'

    +'</div>' // container
    +'<div style="background:#0a0f15;border-top:1px solid var(--border);padding:16px;text-align:center;font-size:10px;color:var(--muted)">'
    +'MetoGroup Latam S.A. · BPC:2026 · <a href="mailto:sofiah@metogroup.com" style="color:var(--gold);text-decoration:none">sofiah@metogroup.com</a> · www.metogroup.com · Insights that Drive Impact'
    +'</div>'
    +'</body></html>';
}

function mapaMarcarCertificado(audId){
  const items = S.get('auditorias');
  const i = items.findIndex(x=>x.id===audId);
  if(i<0) return;
  items[i].certificado = true;
  items[i].estado = 'Completada';
  S.set('auditorias', items);
  toast('🏆 Certificación emitida');
  setTimeout(()=> auditDetail(audId), 200);
}

function mapaMarcarDiagnostico(audId){
  const items = S.get('auditorias');
  const i = items.findIndex(x=>x.id===audId);
  if(i<0) return;
  items[i].diagnostico_ok = true;
  S.set('auditorias', items);
  // Forzar sync inmediato a Supabase
  sbSave('auditorias', items[i]);
  toast('✅ Diagnóstico marcado como completado');
  setTimeout(()=> auditDetail(audId), 200);
}


function openAuditoriaModal(){openModal('modal-auditoria','new');}

function saveAuditoria(){
  const id=document.getElementById('aud-id').value;
  const fInsitu=document.getElementById('aud-f-insitu').value;
  let fExterna=document.getElementById('aud-f-externa').value;
  if(fInsitu&&!fExterna)fExterna=addDays(fInsitu,-15);
  const cSel=document.getElementById('aud-cliente');
  const clienteNombre=cSel.options[cSel.selectedIndex]?.text||'';
  const item={
    id:id?Number(id):S.nextId('auditorias'),
    clienteId:document.getElementById('aud-cliente').value,
    clienteNombre,
    tipo:document.getElementById('aud-tipo').value,
    vendedor:document.getElementById('aud-vendedor').value,
    auditor:document.getElementById('aud-auditor').value,
    monto:document.getElementById('aud-monto').value,
    estado:document.getElementById('aud-estado').value,
    fInicio:document.getElementById('aud-f-inicio').value,
    fDoc:document.getElementById('aud-f-doc').value,
    fExterna,fInsitu,
    fPrep:document.getElementById('aud-f-prep').value,
    fInforme:document.getElementById('aud-f-informe').value,
    fSeguimiento:document.getElementById('aud-f-seguimiento').value,
    notas:document.getElementById('aud-notas').value,
  };
  if(!item.clienteId||clienteNombre==='Seleccionar cliente...'){toast('⚠️ Seleccioná un cliente');return;}
  const items=S.get('auditorias');
  if(id){const i=items.findIndex(x=>x.id===Number(id));if(i>-1)items[i]=item;}else{
    items.push(item);
    // Notify consultant about new audit assignment
    if(item.auditor){enviarNotifConsultor(item.auditor,'📋 Nueva Auditoría Asignada',`${clienteNombre} — ${item.tipo}${item.fInsitu?' · Fecha propuesta: '+fmtD(item.fInsitu):''}. Confirmá tu disponibilidad.`,'nueva_auditoria',{auditoriaId:item.id});}
    // Agente: consultar disponibilidad automáticamente si el consultor tiene email
    const consultorRec = S.get('auditores').find(a=>a.nombre===item.auditor);
    if(item.auditor && consultorRec?.email){
      setTimeout(()=> agenteCoordidarFechas(item.id), 1500);
    }
  }
  S.set('auditorias',items);closeModal('modal-auditoria');renderAuditorias();trackActivity('save:auditoria');toast('✅ Auditoría guardada');
}

function editAuditoria(id){
  const a=S.get('auditorias').find(x=>x.id===id);if(!a)return;
  openModal('modal-auditoria','edit');
  document.getElementById('aud-id').value=id;
  document.getElementById('aud-monto').value=a.monto||'';
  document.getElementById('aud-estado').value=a.estado;
  ['inicio','doc','externa','insitu','prep','informe','seguimiento'].forEach(k=>{
    document.getElementById('aud-f-'+k).value=a['f'+k.charAt(0).toUpperCase()+k.slice(1)]||'';
  });
  document.getElementById('aud-notas').value=a.notas||'';
  populateSel('aud-cliente',S.get('clientes').map(c=>({v:c.id,l:c.nombre})),'Seleccionar cliente...');
  document.getElementById('aud-cliente').value=a.clienteId||'';
  populateSel('aud-vendedor',S.get('vendedores').map(v=>({v:v.nombre,l:v.nombre})),'Sin asignar');
  document.getElementById('aud-vendedor').value=a.vendedor||'';
  populateSel('aud-auditor',S.get('auditores').map(v=>({v:v.nombre,l:v.nombre})),'Sin asignar');
  document.getElementById('aud-auditor').value=a.auditor||'';
  document.getElementById('aud-tipo').value=a.tipo||'';
  document.getElementById('m-aud-title').textContent='Editar Auditoría';
}

document.getElementById('aud-f-insitu').addEventListener('change',function(){
  const fExt=document.getElementById('aud-f-externa');
  if(!fExt.value&&this.value){fExt.value=addDays(this.value,-15);document.getElementById('aud-hint').style.display='block';}
});


// ══════════════════════════════════════════════════════════════════
// COORDINACIÓN DE FECHAS — Agente consulta disponibilidad y coordina
// ══════════════════════════════════════════════════════════════════

async function agenteCoordidarFechas(auditoriaId){
  const aud = S.get('auditorias').find(x=>x.id===auditoriaId);
  if(!aud){ toast('⚠️ Auditoría no encontrada'); return; }

  const emailCfg = (S.get('email_config')||[])[0]||{};
  if(!emailCfg.smtp_user){ toast('❌ Configurá el email SMTP primero'); return; }

  const consultor = S.get('auditores').find(a=>a.nombre===aud.auditor);
  const cliente = S.get('clientes').find(c=>String(c.id)===String(aud.clienteId));

  if(!consultor?.email){ toast('❌ El consultor no tiene email configurado'); return; }
  if(!cliente?.email){ toast('❌ El cliente no tiene email configurado'); return; }

  // Token único para identificar respuestas
  const token = btoa(auditoriaId+'|'+Date.now()).replace(/=/g,'');
  const baseUrl = window.location.origin + window.location.pathname;
  const formUrl = `${baseUrl}?coord_token=${token}&aud=${auditoriaId}&rol=consultor`;

  // Guardar estado de coordinación
  const coords = JSON.parse(localStorage.getItem('METO_coord_fechas')||'[]');
  const coord = {
    token, auditoriaId,
    clienteNombre: aud.clienteNombre,
    consultorNombre: aud.auditor,
    consultorEmail: consultor.email,
    clienteEmail: cliente.email,
    estado: 'consultor_notificado',
    fechasConsultor: null,
    fechaConfirmada: null,
    ts: new Date().toISOString()
  };
  const idx = coords.findIndex(c=>c.auditoriaId===auditoriaId);
  if(idx>-1) coords[idx]=coord; else coords.unshift(coord);
  localStorage.setItem('METO_coord_fechas', JSON.stringify(coords.slice(0,50)));

  // Email al consultor
  const htmlConsultor = `
    <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;padding:32px;background:#fff">
      <div style="font-size:22px;font-weight:700;margin-bottom:4px">MetoGroup</div>
      <div style="font-size:10px;letter-spacing:2px;color:#888;text-transform:uppercase;margin-bottom:24px">Coordinación de Auditoría</div>
      
      <p style="font-size:15px">Hola <strong>${consultor.nombre}</strong>,</p>
      <p style="color:#555;line-height:1.6">Se te asignó una nueva auditoría y necesitamos coordinar las fechas con el cliente.</p>
      
      <div style="background:#f9f6ee;border:1px solid #e8d88a;border-radius:10px;padding:18px 20px;margin:20px 0">
        <div style="font-size:13px;font-weight:700;color:#8a6a1a;margin-bottom:10px">📋 Detalles de la auditoría</div>
        <div style="display:grid;gap:6px">
          <div style="font-size:13px"><strong>Cliente:</strong> ${aud.clienteNombre}</div>
          <div style="font-size:13px"><strong>Tipo:</strong> ${aud.tipo||'BPCE 72001'}</div>
          ${aud.fInsitu?`<div style="font-size:13px"><strong>Fecha propuesta:</strong> ${aud.fInsitu}</div>`:''}
        </div>
      </div>

      <p style="color:#555;line-height:1.6">Por favor indicanos <strong>3 fechas disponibles</strong> para realizar la auditoría (in situ o remota según corresponda).</p>
      
      <div style="text-align:center;margin:28px 0">
        <a href="${formUrl}" style="background:#d4af37;color:#000;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:1px;display:inline-block">
          📅 INDICAR DISPONIBILIDAD
        </a>
      </div>
      
      <p style="color:#888;font-size:12px">También podés responder este email directamente con tus fechas disponibles.<br>
      Formato sugerido: DD/MM/AAAA mañana / DD/MM/AAAA tarde</p>
      
      <p style="color:#888;font-size:12px;margin-top:20px">Equipo MetoGroup<br>${emailCfg.smtp_user}</p>
    </div>`;

  try {
    const resp = await fetch('/.netlify/functions/send-email',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        from_email: emailCfg.smtp_user, from_password: emailCfg.smtp_pass,
        from_name: 'MetoGroup', to: consultor.email,
        subject: `MetoGroup — Disponibilidad para auditoría: ${aud.clienteNombre}`,
        html: htmlConsultor,
        text: `Hola ${consultor.nombre}, se te asignó la auditoría de ${aud.clienteNombre}. Por favor indicá 3 fechas disponibles respondiendo este email o accediendo a: ${formUrl}`
      })
    });
    const data = await resp.json();
    if(data.success){
      toast(`✅ Email enviado a ${consultor.nombre}`);
      // Actualizar notas de la auditoría
      const auds = S.get('auditorias');
      const ai = auds.findIndex(x=>x.id===auditoriaId);
      if(ai>-1){
        auds[ai].notas = (auds[ai].notas||'') + `
[${todayStr()}] Agente: disponibilidad solicitada a ${consultor.nombre}`;
        auds[ai].coord_estado = 'consultor_notificado';
        S.set('auditorias', auds);
      }
    } else {
      toast('❌ Error enviando email: '+(data.detail||data.error||'').substring(0,60));
    }
  } catch(e){ toast('❌ Error: '+e.message); }
}

async function agenteConfirmarFecha(auditoriaId, fechaConfirmada, notificarCliente=true){
  const aud = S.get('auditorias').find(x=>x.id===auditoriaId);
  if(!aud) return;

  const emailCfg = (S.get('email_config')||[])[0]||{};
  const consultor = S.get('auditores').find(a=>a.nombre===aud.auditor);
  const cliente = S.get('clientes').find(c=>String(c.id)===String(aud.clienteId));

  // Actualizar fecha en el sistema
  const auds = S.get('auditorias');
  const ai = auds.findIndex(x=>x.id===auditoriaId);
  if(ai>-1){
    auds[ai].fInsitu = fechaConfirmada;
    auds[ai].coord_estado = 'confirmada';
    auds[ai].notas = (auds[ai].notas||'') + `
[${todayStr()}] Agente: fecha confirmada ${fechaConfirmada}`;
    S.set('auditorias', auds);
    toast(`✅ Fecha ${fechaConfirmada} confirmada en el sistema`);
  }

  if(!notificarCliente || !emailCfg.smtp_user) return;

  const fmtFecha = f => { if(!f) return f; const [y,m,d]=f.split('-'); return d+'/'+m+'/'+y; };
  const fechaFmt = fmtFecha(fechaConfirmada) || fechaConfirmada;

  // Email de confirmación al cliente (dueño)
  if(cliente?.email){
    const htmlCliente = '<div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;padding:32px;background:#fff">'
      +'<div style="font-size:22px;font-weight:700;margin-bottom:4px">MetoGroup</div>'
      +'<div style="font-size:10px;letter-spacing:2px;color:#888;text-transform:uppercase;margin-bottom:24px">Confirmación de Auditoría</div>'
      +'<p style="font-size:15px">Estimado/a <strong>'+(cliente.contacto||cliente.nombre)+'</strong>,</p>'
      +'<p style="color:#555;line-height:1.6">Tenemos el agrado de confirmar la fecha para la realización de la <strong>Auditoría BPC:2026</strong>.</p>'
      +'<div style="background:#f9f6ee;border:2px solid #d4af37;border-radius:10px;padding:20px 24px;margin:20px 0;text-align:center">'
      +'<div style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Fecha confirmada</div>'
      +'<div style="font-size:28px;font-weight:800;color:#8a6a1a">'+fechaFmt+'</div>'
      +(aud.auditor?'<div style="font-size:13px;color:#555;margin-top:8px">Auditor/a: <strong>'+aud.auditor+'</strong></div>':'')
      +'</div>'
      +'<p style="color:#555;line-height:1.6">A partir de aquí, toda la coordinación del proceso irá con su encargado/a designado/a. Usted será contactado/a nuevamente para la <strong>reunión de entrega de informe</strong>.</p>'
      +'<p style="color:#888;font-size:12px;margin-top:24px">'+AGENTE.EMAIL_AGENTE_NOMBRE+'<br>'
      +'<a href="mailto:'+AGENTE.EMAIL_AGENTE+'" style="color:#c8a84a">'+AGENTE.EMAIL_AGENTE+'</a></p>'
      +'</div>';

    await fetch('/.netlify/functions/send-email',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        from_email: emailCfg.smtp_user, from_password: emailCfg.smtp_pass,
        from_name: AGENTE.EMAIL_AGENTE_NOMBRE||'MetoGroup', to: cliente.email,
        subject: 'Fecha confirmada — Auditoría BPC:2026 — '+fechaFmt+' | '+aud.clienteNombre,
        html: htmlCliente,
        text: 'Confirmamos la auditoría BPC:2026 de '+aud.clienteNombre+' para el '+fechaFmt+'. Auditor/a: '+(aud.auditor||'a confirmar')+'.'
      })
    }).catch(()=>{});
    toast('📧 Confirmación enviada a '+cliente.email);
  }

  // Email de confirmación al encargado (con más detalle operativo)
  if(cliente?.encargado_email){
    const htmlEncargado = '<div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;padding:32px;background:#fff">'
      +'<div style="font-size:22px;font-weight:700;margin-bottom:4px">MetoGroup</div>'
      +'<div style="font-size:10px;letter-spacing:2px;color:#888;text-transform:uppercase;margin-bottom:24px">Confirmación de Fechas — '+aud.clienteNombre+'</div>'
      +'<p style="font-size:15px">Hola <strong>'+(cliente.encargado_nombre||'Encargado/a')+'</strong>,</p>'
      +'<p style="color:#555;line-height:1.6">Las fechas de auditoría quedaron confirmadas. A partir de ahora coordinaremos directamente con usted.</p>'
      +'<div style="background:#f9f6ee;border-left:4px solid #d4af37;padding:16px 20px;border-radius:0 8px 8px 0;margin:20px 0">'
      +'<div style="font-size:13px;font-weight:700;color:#8a6a1a;margin-bottom:10px">📅 Fechas confirmadas</div>'
      +(aud.fDoc?'<div style="font-size:13px;margin-bottom:6px"><strong>Auditoría documental:</strong> '+fmtFecha(aud.fDoc)+'</div>':'')
      +(aud.fInsitu?'<div style="font-size:13px;margin-bottom:6px"><strong>Auditoría in situ:</strong> '+fmtFecha(aud.fInsitu)+'</div>':'')
      +(aud.fExterna?'<div style="font-size:13px;margin-bottom:6px"><strong>Aud. comunicaciones:</strong> '+fmtFecha(aud.fExterna)+'</div>':'')
      +(aud.auditor?'<div style="font-size:13px"><strong>Consultor/a asignado/a:</strong> '+aud.auditor+'</div>':'')
      +'</div>'
      +'<p style="color:#555;line-height:1.6">En los próximos días recibirá el <strong>Kit de Documentos Mínimos</strong> con todo lo que necesita preparar antes de la auditoría documental.</p>'
      +'<p style="color:#888;font-size:12px;margin-top:24px">'+AGENTE.EMAIL_AGENTE_NOMBRE+'<br>'
      +'<a href="mailto:'+AGENTE.EMAIL_AGENTE+'" style="color:#c8a84a">'+AGENTE.EMAIL_AGENTE+'</a></p>'
      +'</div>';

    await fetch('/.netlify/functions/send-email',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        from_email: emailCfg.smtp_user, from_password: emailCfg.smtp_pass,
        from_name: AGENTE.EMAIL_AGENTE_NOMBRE||'MetoGroup', to: cliente.encargado_email,
        subject: '📅 Fechas confirmadas — Auditoría BPC:2026 | '+aud.clienteNombre,
        html: htmlEncargado,
        text: 'Fechas confirmadas para '+aud.clienteNombre+'. Doc: '+(fmtFecha(aud.fDoc)||'—')+' | In situ: '+(fmtFecha(aud.fInsitu)||'—')+'.'
      })
    }).catch(()=>{});
  }

    await fetch('/.netlify/functions/send-email',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        from_email: emailCfg.smtp_user, from_password: emailCfg.smtp_pass,
        from_name: AGENTE.EMAIL_AGENTE_NOMBRE||'MetoGroup', to: cliente.encargado_email,
        subject: '📅 Fechas confirmadas — Auditoría BPC:2026 | '+aud.clienteNombre,
        html: htmlEncargado,
        text: 'Fechas confirmadas para '+aud.clienteNombre+'. Doc: '+(fmtFecha(aud.fDoc)||'—')+' | In situ: '+(fmtFecha(aud.fInsitu)||'—')+'.'
      })
    }).catch(()=>{});
  

  // Email de confirmación al consultor
  if(consultor?.email){
    const htmlConsultor = '<div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;padding:32px;background:#fff">'
      +'<div style="font-size:22px;font-weight:700;margin-bottom:4px">MetoGroup</div>'
      +'<div style="font-size:10px;letter-spacing:2px;color:#888;text-transform:uppercase;margin-bottom:24px">Fecha Confirmada</div>'
      +'<p>Hola <strong>'+consultor.nombre+'</strong>,</p>'
      +'<p style="color:#555;line-height:1.6">La fecha de auditoría quedó confirmada:</p>'
      +'<div style="background:#f9f6ee;border-left:4px solid #d4af37;padding:14px 18px;border-radius:0 8px 8px 0;margin:16px 0">'
      +'<div><strong>Cliente:</strong> '+aud.clienteNombre+'</div>'
      +'<div><strong>Fecha:</strong> '+fechaFmt+'</div>'
      +'<div><strong>Tipo:</strong> '+(aud.tipo||'BPC:2026')+'</div>'
      +'</div>'
      +'<p style="color:#888;font-size:12px">'+AGENTE.EMAIL_AGENTE_NOMBRE+'</p>'
      +'</div>';

    await fetch('/.netlify/functions/send-email',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        from_email: emailCfg.smtp_user, from_password: emailCfg.smtp_pass,
        from_name: AGENTE.EMAIL_AGENTE_NOMBRE||'MetoGroup', to: consultor.email,
        subject: 'Fecha confirmada: '+aud.clienteNombre+' — '+fechaFmt,
        html: htmlConsultor,
        text: 'Hola '+consultor.nombre+', la auditoría de '+aud.clienteNombre+' quedó confirmada para el '+fechaFmt+'.'
      })
    }).catch(()=>{});
  }
} // fin agenteConfirmarFecha

// Modal para gestionar coordinación de fechas
function abrirCoordFechas(auditoriaId){
  const aud = S.get('auditorias').find(x=>x.id===auditoriaId);
  if(!aud) return;
  const coords = JSON.parse(localStorage.getItem('METO_coord_fechas')||'[]');
  const coord = coords.find(c=>c.auditoriaId===auditoriaId);
  const consultor = S.get('auditores').find(a=>a.nombre===aud.auditor);
  const cliente = S.get('clientes').find(c=>String(c.id)===String(aud.clienteId));

  const ov = document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  ov.innerHTML=`
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;width:560px;max-width:95vw;max-height:90vh;overflow-y:auto">
      <div style="padding:18px 22px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800">📅 Coordinación de Fechas</div>
        <button onclick="this.closest('div[style*=fixed]').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:18px">✕</button>
      </div>
      <div style="padding:20px 22px">
        <!-- Info auditoría -->
        <div style="background:var(--surface2);border-radius:10px;padding:14px 16px;margin-bottom:18px">
          <div style="font-size:13px;font-weight:700;margin-bottom:8px">${aud.clienteNombre} — ${aud.tipo||'BPCE 72001'}</div>
          <div style="display:flex;gap:16px;flex-wrap:wrap">
            <div style="font-size:12px;color:var(--muted)">Consultor: <span style="color:var(--text)">${aud.auditor||'Sin asignar'}</span></div>
            <div style="font-size:12px;color:var(--muted)">Email consultor: <span style="color:var(--accent)">${consultor?.email||'⚠️ Sin email'}</span></div>
            <div style="font-size:12px;color:var(--muted)">Email cliente: <span style="color:var(--accent)">${cliente?.email||'⚠️ Sin email'}</span></div>
          </div>
        </div>

        <!-- Estado actual -->
        <div style="margin-bottom:18px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);margin-bottom:10px">Estado de coordinación</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${[
              ['1','Consultor notificado', coord?.estado==='consultor_notificado'||coord?.estado==='fechas_recibidas'||coord?.estado==='confirmada'],
              ['2','Fechas recibidas del consultor', coord?.estado==='fechas_recibidas'||coord?.estado==='confirmada'],
              ['3','Fecha confirmada con cliente', coord?.estado==='confirmada'],
            ].map(([n,label,done])=>`
              <div style="display:flex;align-items:center;gap:10px">
                <div style="width:24px;height:24px;border-radius:50%;background:${done?'rgba(200,168,74,0.2)':'var(--surface2)'};border:2px solid ${done?'#c8a84a':'var(--border)'};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:${done?'#c8a84a':'var(--muted)'};flex-shrink:0">${done?'✓':n}</div>
                <div style="font-size:13px;color:${done?'var(--text)':'var(--muted)'}">${label}</div>
              </div>`).join('')}
          </div>
        </div>

        <!-- Fechas propuestas por consultor si hay -->
        ${coord?.fechasConsultor?`
          <div style="background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.2);border-radius:10px;padding:14px 16px;margin-bottom:18px">
            <div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:8px">📅 Fechas propuestas por el consultor:</div>
            ${coord.fechasConsultor.map((f,i)=>`
              <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:${i<coord.fechasConsultor.length-1?'1px solid rgba(212,175,55,0.1)':'none'}">
                <div style="font-size:13px">${f}</div>
                <button onclick="agenteConfirmarFecha(${auditoriaId},'${f}');this.closest('div[style*=fixed]').remove()" style="background:rgba(200,168,74,0.15);color:#c8a84a;border:1px solid rgba(200,168,74,0.3);border-radius:6px;padding:5px 12px;cursor:pointer;font-size:12px;font-weight:700">✅ Confirmar esta</button>
              </div>`).join('')}
          </div>` : ''}

        <!-- Confirmar fecha manualmente -->
        <div style="margin-bottom:18px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);margin-bottom:8px">Confirmar fecha manualmente</div>
          <div style="display:flex;gap:8px">
            <input type="date" id="coord-fecha-manual" style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);font-size:13px;outline:none" min="${todayStr()}">
            <button onclick="const f=document.getElementById('coord-fecha-manual').value;if(!f){toast('⚠️ Seleccioná una fecha');return;}agenteConfirmarFecha(${auditoriaId},f);this.closest('div[style*=fixed]').remove()" style="background:var(--accent);color:#000;border:none;border-radius:8px;padding:9px 16px;cursor:pointer;font-size:13px;font-weight:700">✅ Confirmar</button>
          </div>
        </div>

        <!-- Acciones -->
        <div style="display:flex;flex-direction:column;gap:8px">
          <button onclick="agenteCoordidarFechas(${auditoriaId});this.closest('div[style*=fixed]').remove()" style="background:rgba(212,175,55,0.12);color:var(--accent);border:1px solid rgba(212,175,55,0.3);border-radius:8px;padding:11px;cursor:pointer;font-size:13px;font-weight:600;text-align:left">
            📧 ${coord?.estado?'Re-enviar consulta de disponibilidad':'Consultar disponibilidad al consultor'}
          </button>
        </div>
      </div>
    </div>`;
  ov.onclick = e=>{ if(e.target===ov) ov.remove(); };
  document.body.appendChild(ov);
}

// CALENDAR
let calYear=new Date().getFullYear(),calMonth=new Date().getMonth(),calAuditor='';

function renderCalendar(){
  const el=document.getElementById('calendario-content');if(!el)return;
  const auds=S.get('auditorias').filter(a=>!calAuditor||a.auditor===calAuditor);
  const td=todayStr();
  const MONTHS=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const DOWS=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const evMap={};
  function addEv(date,type,label){if(!date)return;if(!evMap[date])evMap[date]=[];evMap[date].push({type,label});}
  auds.forEach(a=>{
    addEv(a.fInicio,'ev-inicio',`📌 ${a.clienteNombre}`);
    addEv(a.fDoc,'ev-doc',`📂 ${a.clienteNombre}`);
    addEv(a.fExterna,'ev-ext',`🔬 ${a.clienteNombre}`);
    addEv(a.fInsitu,'ev-insitu',`🏢 ${a.clienteNombre}`);
    addEv(a.fPrep,'ev-prep',`📝 ${a.clienteNombre}`);
    addEv(a.fInforme,'ev-informe',`✅ ${a.clienteNombre}`);
    addEv(a.fSeguimiento,'ev-seguimiento',`🔄 ${a.clienteNombre}`);
  });
  const firstDay=new Date(calYear,calMonth,1).getDay();
  const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
  const prevDays=new Date(calYear,calMonth,0).getDate();
  let dHtml='';
  for(let i=firstDay-1;i>=0;i--)dHtml+=`<div class="cal-day other-month"><div class="cal-num">${prevDays-i}</div></div>`;
  for(let d=1;d<=daysInMonth;d++){
    const ds=`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const evs=evMap[ds]||[];
    const evHtml=evs.slice(0,3).map(e=>`<div class="cal-event ${e.type}" title="${e.label}">${e.label}</div>`).join('');
    const more=evs.length>3?`<div style="font-size:9px;color:var(--muted);padding:1px 4px">+${evs.length-3} más</div>`:'';
    dHtml+=`<div class="cal-day${ds===td?' today':''}"><div class="cal-num">${d}</div>${evHtml}${more}</div>`;
  }
  const total=Math.ceil((firstDay+daysInMonth)/7)*7;
  for(let d=1;d<=total-(firstDay+daysInMonth);d++)dHtml+=`<div class="cal-day other-month"><div class="cal-num">${d}</div></div>`;

  el.innerHTML=`<div class="cal-wrap">
    <div class="cal-head">
      <div class="cal-title">${MONTHS[calMonth]} ${calYear}</div>
      <div class="cal-nav">
        <button onclick="calMonth--;if(calMonth<0){calMonth=11;calYear--;}renderCalendar()">‹</button>
        <button class="btn-today" onclick="calMonth=new Date().getMonth();calYear=new Date().getFullYear();renderCalendar()">Hoy</button>
        <button onclick="calMonth++;if(calMonth>11){calMonth=0;calYear++;}renderCalendar()">›</button>
      </div>
    </div>
    <div class="cal-dow-row">${DOWS.map(d=>`<div class="cal-dow">${d}</div>`).join('')}</div>
    <div class="cal-grid">${dHtml}</div>
    <div class="cal-legend">
      <div class="leg-item"><div class="leg-dot" style="background:rgba(200,168,74,0.5)"></div>Inicio</div>
      <div class="leg-item"><div class="leg-dot" style="background:rgba(245,158,11,0.5)"></div>Entrega Doc.</div>
      <div class="leg-item"><div class="leg-dot" style="background:rgba(249,115,22,0.5)"></div>Aud. Externa</div>
      <div class="leg-item"><div class="leg-dot" style="background:rgba(239,68,68,0.5)"></div>Aud. In-Situ</div>
      <div class="leg-item"><div class="leg-dot" style="background:rgba(184,146,46,0.5)"></div>Prep. Informe</div>
      <div class="leg-item"><div class="leg-dot" style="background:rgba(212,175,55,0.5)"></div>Informe Final</div>
      <div class="leg-item"><div class="leg-dot" style="background:rgba(99,102,241,0.5)"></div>Seguimiento</div>
    </div>
  </div>`;
}

// AUDITORES
function renderAuditores(){
  const items=S.get('auditores'),auds=S.get('auditorias');
  const el=document.getElementById('auditores-content');
  const ym=todayStr().substring(0,7);
  if(!items.length){el.innerHTML=`<div class="empty-state"><div class="icon">🧑‍🔬</div><h3>Sin consultores</h3><p>Agregá tu primer consultor/auditor</p></div>`;return;}
  el.innerHTML=`<div class="grid-3">${items.map(v=>{
    const mios=auds.filter(a=>a.auditor===v.nombre);
    const activas=mios.filter(a=>a.estado!=='Completada').length;
    const mesMios=mios.filter(a=>(a.fInicio||'').startsWith(ym)||(a.fInsitu||'').startsWith(ym));
    const hon=mios.length*(Number(v.honorarios)||300);
    let prox=null;
    mios.forEach(a=>{[a.fDoc,a.fExterna,a.fInsitu,a.fPrep,a.fInforme].forEach(f=>{if(f&&(!prox||f<prox)&&f>=todayStr())prox=f;});});
    const empresasMes=mesMios.map(a=>a.clienteNombre).filter(Boolean);
    return`<div class="person-card" data-consultor-id="${v.id}" style="cursor:pointer" title="Click para ver ficha completa">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
        <div class="person-avatar" style="background:linear-gradient(135deg,#9a7830,#d4af37)">${v.nombre.substring(0,2).toUpperCase()}</div>
        <div style="flex:1">
          <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:15px">${v.nombre}</div>
          <div style="font-size:11px;color:var(--muted)">${v.especialidad} · ${badge(v.estado)}</div>
          ${v.titulo?`<div style="font-size:10px;color:var(--accent)">${v.titulo}</div>`:''}
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-secondary btn-sm" onclick="verFichaConsultor(${v.id})">📋</button>
          <button class="btn btn-secondary btn-sm" onclick="editAuditor(${v.id})">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="delItem('auditores',${v.id},renderAuditores)">🗑</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px">
        <div class="v-stat"><div class="v-stat-label">Total Auditorías</div><div class="v-stat-value">${mios.length}</div></div>
        <div class="v-stat"><div class="v-stat-label">Este mes</div><div class="v-stat-value" style="color:var(--accent)">${mesMios.length}</div></div>
        <div class="v-stat"><div class="v-stat-label">Activas</div><div class="v-stat-value" style="color:var(--warn)">${activas}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
        <div class="v-stat"><div class="v-stat-label">Honorarios Acum.</div><div class="v-stat-value" style="color:var(--accent3)">${fmt(hon)}</div></div>
        <div class="v-stat"><div class="v-stat-label">Próx. Fecha</div><div class="v-stat-value" style="font-size:12px;color:var(--warn)">${prox?fmtD(prox):'-'}</div></div>
      </div>
      ${empresasMes.length?`<div style="border-top:1px solid var(--border);padding-top:8px;margin-top:4px"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;margin-bottom:4px">Empresas del mes:</div>${empresasMes.slice(0,4).map(e=>`<span style="font-size:10px;background:var(--surface2);padding:2px 8px;border-radius:6px;margin:2px;display:inline-block">${e}</span>`).join('')}${empresasMes.length>4?`<span style="font-size:10px;color:var(--muted)">+${empresasMes.length-4} más</span>`:''}</div>`:''}
      <div style="margin-top:8px;font-size:11px;color:var(--muted)">📧 ${v.email||'-'} · 📞 ${v.tel||'-'}${v.drive?` · <a href="${v.drive}" target="_blank" style="color:var(--accent)">📂 Drive</a>`:''}</div>
    </div>`;
  }).join('')}</div>`;
}

function verFichaConsultor(id){
  const v=S.get('auditores').find(x=>x.id===id);if(!v)return;
  const auds=S.get('auditorias');const mios=auds.filter(a=>a.auditor===v.nombre);
  const ym=todayStr().substring(0,7);const mesMios=mios.filter(a=>(a.fInicio||'').startsWith(ym)||(a.fInsitu||'').startsWith(ym));
  const hon=mios.length*(Number(v.honorarios)||300);
  let m=document.getElementById('modal-ficha-consultor');
  if(!m){m=document.createElement('div');m.className='modal-overlay';m.id='modal-ficha-consultor';m.innerHTML='<div class="modal modal-lg"></div>';document.body.appendChild(m);}
  m.querySelector('.modal').innerHTML=`
  <div class="modal-head" style="background:linear-gradient(135deg,rgba(5,150,105,0.12),rgba(212,175,55,0.06))">
    <div class="modal-title" style="color:var(--accent3)">📋 Ficha Técnica — ${v.nombre}</div>
    <button class="modal-close" onclick="closeModal('modal-ficha-consultor')">✕</button>
  </div>
  <div class="modal-body">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
      <div style="background:var(--surface2);border-radius:12px;padding:16px">
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-bottom:10px">Datos Personales</div>
        <div style="font-size:13px;margin-bottom:6px">📧 ${v.email||'—'}</div>
        <div style="font-size:13px;margin-bottom:6px">📞 ${v.tel||'—'}</div>
        <div style="font-size:13px;margin-bottom:6px">🆔 ${v.dni||'—'}</div>
        <div style="font-size:13px;margin-bottom:6px">📍 ${v.direccion||'—'}, ${v.pais||'—'}</div>
        ${v.drive?`<div style="font-size:13px"><a href="${v.drive}" target="_blank" style="color:var(--accent)">📂 Carpeta Drive</a></div>`:''}
      </div>
      <div style="background:var(--surface2);border-radius:12px;padding:16px">
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-bottom:10px">Perfil Técnico</div>
        <div style="font-size:13px;margin-bottom:6px">🎓 ${v.titulo||'—'}</div>
        <div style="font-size:13px;margin-bottom:6px">⚡ ${v.especialidad||'General'}</div>
        <div style="font-size:13px;margin-bottom:6px">📜 ${v.certificaciones||'—'}</div>
        <div style="font-size:13px;margin-bottom:6px">💰 Honorarios: ${fmt(v.honorarios||300)} /auditoría</div>
        <div style="font-size:13px">💳 Pago: ${v.formapago||'—'} ${v.cbu?' · CBU: '+v.cbu:''}</div>
      </div>
    </div>
    ${v.bio?`<div style="background:var(--surface2);border-radius:12px;padding:14px;margin-bottom:16px"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-bottom:6px">Bio / Experiencia</div><div style="font-size:13px;line-height:1.5">${v.bio}</div></div>`:''}
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
      ${[['Total','var(--accent)',mios.length],['Este Mes','var(--warn)',mesMios.length],['Activas','#c8a84a',mios.filter(a=>a.estado!=='Completada').length],['Honorarios','var(--accent3)',fmt(hon)]].map(([l,c,v])=>`
      <div style="background:var(--surface2);border-radius:10px;padding:12px;text-align:center"><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:${c}">${v}</div><div style="font-size:10px;color:var(--muted)">${l}</div></div>`).join('')}
    </div>
    <div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-bottom:8px">Empresas Asignadas</div>
    ${mios.length?`<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Tipo</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>
    ${mios.sort((a,b)=>(b.fInicio||'').localeCompare(a.fInicio||'')).map(a=>`<tr><td style="font-weight:600">${a.clienteNombre||'—'}</td><td style="font-size:11px">${a.tipo||'—'}</td><td>${badge(a.estado)}</td><td style="font-size:12px;color:var(--muted)">${fmtD(a.fInicio)}</td></tr>`).join('')}
    </tbody></table></div>`:`<div style="text-align:center;padding:20px;color:var(--muted);font-size:12px">Sin auditorías asignadas</div>`}
  </div>`;
  m.classList.add('open');
}

function saveAuditor(){
  const id=document.getElementById('audr-id').value;
  const item={id:id?Number(id):S.nextId('auditores'),nombre:document.getElementById('audr-nombre').value,dni:document.getElementById('audr-dni')?.value||'',email:document.getElementById('audr-email').value,tel:document.getElementById('audr-tel').value,direccion:document.getElementById('audr-direccion')?.value||'',pais:document.getElementById('audr-pais')?.value||'Argentina',especialidad:document.getElementById('audr-esp').value,titulo:document.getElementById('audr-titulo')?.value||'',certificaciones:document.getElementById('audr-certificaciones')?.value||'',bio:document.getElementById('audr-bio')?.value||'',honorarios:document.getElementById('audr-honorarios').value,formapago:document.getElementById('audr-formapago')?.value||'',cbu:document.getElementById('audr-cbu')?.value||'',estado:document.getElementById('audr-estado')?.value||'Activo',drive:document.getElementById('audr-drive')?.value||'',notas:document.getElementById('audr-notas').value,maxauds:document.getElementById('audr-maxauds')?.value||'4',maximpls:document.getElementById('audr-maximpls')?.value||'2'};
  if(!item.nombre){toast('⚠️ Ingresá el nombre');return;}
  const items=S.get('auditores');
  if(id){const i=items.findIndex(x=>x.id===Number(id));if(i>-1)items[i]=item;}else items.push(item);
  S.set('auditores',items);closeModal('modal-auditor');renderAuditores();trackActivity('save:consultor');toast('✅ Consultor guardado');
}

function editAuditor(id){
  const v=S.get('auditores').find(x=>x.id===id);if(!v)return;
  openModal('modal-auditor','edit');
  document.getElementById('audr-id').value=id;document.getElementById('audr-nombre').value=v.nombre;document.getElementById('audr-email').value=v.email||'';document.getElementById('audr-tel').value=v.tel||'';document.getElementById('audr-esp').value=v.especialidad||'General';document.getElementById('audr-honorarios').value=v.honorarios||300;document.getElementById('audr-estado').value=v.estado;document.getElementById('audr-notas').value=v.notas||'';
  if(document.getElementById('audr-dni'))document.getElementById('audr-dni').value=v.dni||'';
  if(document.getElementById('audr-direccion'))document.getElementById('audr-direccion').value=v.direccion||'';
  if(document.getElementById('audr-pais'))document.getElementById('audr-pais').value=v.pais||'Argentina';
  if(document.getElementById('audr-titulo'))document.getElementById('audr-titulo').value=v.titulo||'';
  if(document.getElementById('audr-certificaciones'))document.getElementById('audr-certificaciones').value=v.certificaciones||'';
  if(document.getElementById('audr-bio'))document.getElementById('audr-bio').value=v.bio||'';
  if(document.getElementById('audr-formapago'))document.getElementById('audr-formapago').value=v.formapago||'Transferencia';
  if(document.getElementById('audr-cbu'))document.getElementById('audr-cbu').value=v.cbu||'';
  if(document.getElementById('audr-drive'))document.getElementById('audr-drive').value=v.drive||'';
  if(document.getElementById('audr-maxauds'))document.getElementById('audr-maxauds').value=v.maxauds||'4';
  if(document.getElementById('audr-maximpls'))document.getElementById('audr-maximpls').value=v.maximpls||'2';
  document.getElementById('m-audr-title').textContent='Editar Consultor';
}


// ════════════════════════════════════════════════════════════════
// FICHA COMPLETA DEL CLIENTE
// ════════════════════════════════════════════════════════════════

async function abrirFichaCliente(clienteId){
  const cli = (S.get('clientes')||[]).find(c=>c.id===clienteId);
  if(!cli){ toast('❌ Cliente no encontrado'); return; }

  // Crear overlay
  document.querySelectorAll('.ficha-cliente-overlay').forEach(e=>e.remove());
  const ov = document.createElement('div');
  ov.className = 'ficha-cliente-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:var(--bg);z-index:2000;overflow-y:auto;';
  document.body.appendChild(ov);

  const _renderFicha = async () => {
    // Cargar datos relacionados
    const auds   = (S.get('auditorias')||[]).filter(a=>String(a.clienteId)===String(clienteId));
    const cobros = (S.get('cobros')||[]).filter(c=>String(c.clienteId)===String(clienteId)||c.cliente===cli.nombre);
    let facturas = [], anotaciones = [], seguimiento = [];
    try{
      const f = await sbFetch('cliente_facturas','GET',null,'?clienteId=eq.'+clienteId+'&order=fecha.desc');
      if(f) facturas = f;
    }catch(e){ facturas = (S.get('cliente_facturas')||[]).filter(x=>String(x.clienteId)===String(clienteId)); }
    try{
      const a = await sbFetch('cliente_anotaciones','GET',null,'?clienteId=eq.'+clienteId+'&order=fecha.desc');
      if(a) anotaciones = a;
    }catch(e){ anotaciones = (S.get('cliente_anotaciones')||[]).filter(x=>String(x.clienteId)===String(clienteId)); }
    try{
      const s = await sbFetch('cliente_seguimiento','GET',null,'?clienteId=eq.'+clienteId+'&order=fechaRecordatorio.asc');
      if(s) seguimiento = s;
    }catch(e){ seguimiento = (S.get('cliente_seguimiento')||[]).filter(x=>String(x.clienteId)===String(clienteId)); }

    const audActiva = auds.find(a=>!['Completada','Cancelada','Informe Entregado'].includes(a.estado));
    const totalCobrado = cobros.filter(c=>c.estado==='Pagado').reduce((s,c)=>s+(Number(c.monto)||0),0);
    const totalPendiente = cobros.filter(c=>c.estado!=='Pagado').reduce((s,c)=>s+(Number(c.monto)||0),0);
    const fmt = n => '$'+Math.round(n).toLocaleString('es-AR');

    const estadoBadge = (e,map) => {
      const d=map[e]||['rgba(100,100,100,0.1)','var(--muted)'];
      return `<span style="background:${d[0]};color:${d[1]};padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600">${e||'—'}</span>`;
    };
    const factEstados = {'Pagada':['rgba(78,205,196,0.12)','var(--ok)'],'Pendiente':['rgba(245,158,11,0.12)','#f59e0b'],'Vencida':['rgba(239,68,68,0.1)','#ef4444'],'Anulada':['rgba(100,100,100,0.1)','var(--muted)']};
    const segPend = seguimiento.filter(s=>!s.completado);

    ov.innerHTML = `
    <div style="max-width:960px;margin:0 auto;padding:28px 24px 80px">

      <!-- HEADER -->
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:32px;padding-bottom:20px;border-bottom:1px solid var(--border)">
        <button onclick="this.closest('.ficha-cliente-overlay').remove()" style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;width:40px;height:40px;cursor:pointer;font-size:18px;color:var(--text);flex-shrink:0">←</button>
        <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,rgba(200,168,74,0.2),rgba(200,168,74,0.08));border:1px solid rgba(200,168,74,0.3);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">🏢</div>
        <div style="flex:1">
          <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800">${cli.nombre}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">${cli.rubro||''} ${cli.cuit?'· CUIT '+cli.cuit:''} ${cli.pais?'· '+cli.pais:''}</div>
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="editCliente(${clienteId});this.closest('.ficha-cliente-overlay').remove()" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 16px;cursor:pointer;color:var(--text);font-size:12px">✏️ Editar datos</button>
        </div>
      </div>

      <!-- KPIs rápidos -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px">
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px 18px">
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Auditoría</div>
          <div style="font-size:13px;font-weight:700;color:${audActiva?'var(--accent)':'var(--muted)'}">${audActiva?audActiva.estado:'Sin auditoría activa'}</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px 18px">
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Cobrado</div>
          <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--ok)">${fmt(totalCobrado)}</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px 18px">
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Pendiente</div>
          <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:${totalPendiente>0?'#f59e0b':'var(--muted)'}">${fmt(totalPendiente)}</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px 18px">
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Seguimientos</div>
          <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:${segPend.length>0?'var(--accent)':'var(--muted)'}">${segPend.length}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">

        <!-- COL IZQUIERDA -->
        <div style="display:flex;flex-direction:column;gap:20px">

          <!-- DATOS GENERALES -->
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px">
            <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:2px;margin-bottom:14px">── Datos generales</div>
            ${[['👤 Contacto',cli.contacto+(cli.cargo?' · '+cli.cargo:'')],['📧 Email',cli.email],['📱 Tel',cli.tel||cli.wa||'—'],['🧑‍💼 Vendedor',cli.vendedor||'—'],['📋 Encargado',cli.encargado_nombre?(cli.encargado_nombre+(cli.encargado_cargo?' · '+cli.encargado_cargo:'')):'—'],['📧 Email encargado',cli.encargado_email||'—']].map(([l,v])=>`
              <div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)">
                <div style="font-size:11px;color:var(--muted);width:120px;flex-shrink:0">${l}</div>
                <div style="font-size:12px;font-weight:500;word-break:break-all">${v||'—'}</div>
              </div>`).join('')}
          </div>

          <!-- CONTRATO -->
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
              <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:2px">── Contrato</div>
              <button onclick="_fichaEditarContrato(${clienteId})" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:12px">✏️ Editar</button>
            </div>
            ${cli.contrato_url ? `
              <div style="display:flex;align-items:center;gap:10px;background:rgba(200,168,74,0.06);border:1px solid rgba(200,168,74,0.2);border-radius:8px;padding:12px 14px">
                <span style="font-size:20px">📄</span>
                <div style="flex:1">
                  <div style="font-size:13px;font-weight:600">${cli.contrato_nombre||'Contrato'}</div>
                  <div style="font-size:10px;color:var(--muted);margin-top:2px">${cli.contrato_url.substring(0,50)}...</div>
                </div>
                <a href="${cli.contrato_url}" target="_blank" style="background:var(--accent);color:#000;padding:6px 14px;border-radius:6px;text-decoration:none;font-size:11px;font-weight:700">↗ Abrir</a>
              </div>` : `
              <div style="text-align:center;padding:20px;color:var(--muted)">
                <div style="font-size:28px;margin-bottom:8px">📄</div>
                <div style="font-size:12px;margin-bottom:12px">Sin contrato cargado</div>
                <button onclick="_fichaEditarContrato(${clienteId})" style="background:var(--accent);border:none;color:#000;padding:7px 16px;border-radius:7px;cursor:pointer;font-size:12px;font-weight:700">+ Cargar link</button>
              </div>`}
          </div>

          <!-- COBROS / CUOTAS -->
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
              <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:2px">── Cobros / cuotas</div>
              <button onclick="showPage('cobros');this.closest('.ficha-cliente-overlay').remove()" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:12px">Ver todos →</button>
            </div>
            ${cobros.length ? cobros.slice(0,5).map(c=>`
              <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
                <div style="flex:1">
                  <div style="font-size:12px;font-weight:600">${c.concepto||c.descripcion||'Cuota'}</div>
                  <div style="font-size:10px;color:var(--muted)">${c.fecha||''} ${c.fechaVto?'· Vto: '+fmtD(c.fechaVto):''}</div>
                </div>
                <div style="font-family:'DM Mono',monospace;font-size:13px;font-weight:700">$${Number(c.monto||0).toLocaleString('es-AR')}</div>
                <span style="font-size:10px;padding:2px 8px;border-radius:10px;font-weight:600;background:${c.estado==='Pagado'?'rgba(78,205,196,0.12)':'rgba(245,158,11,0.12)'};color:${c.estado==='Pagado'?'var(--ok)':'#f59e0b'}">${c.estado||'Pendiente'}</span>
              </div>`).join('') : '<div style="text-align:center;padding:16px;color:var(--muted);font-size:12px">Sin cobros registrados</div>'}
          </div>

        </div>

        <!-- COL DERECHA -->
        <div style="display:flex;flex-direction:column;gap:20px">

          <!-- FACTURAS -->
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
              <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:2px">── Facturas</div>
              <button onclick="_fichaAgregarFactura(${clienteId},()=>_renderFicha())" style="background:var(--accent);border:none;color:#000;padding:5px 12px;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700">+ Nueva</button>
            </div>
            <div id="ficha-facturas-${clienteId}">
            ${facturas.length ? facturas.map(f=>`
              <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
                <div style="flex:1">
                  <div style="font-size:12px;font-weight:600">${f.numero?'#'+f.numero+' — ':''} ${f.concepto||'Factura'}</div>
                  <div style="font-size:10px;color:var(--muted)">${fmtD(f.fecha)||''} ${f.fechaVto?'· Vto: '+fmtD(f.fechaVto):''}</div>
                </div>
                <div style="font-family:'DM Mono',monospace;font-size:13px;font-weight:700">${f.moneda||'$'}${Number(f.monto||0).toLocaleString('es-AR')}</div>
                ${estadoBadge(f.estado||'Pendiente',factEstados)}
                ${f.linkAlegra?`<a href="${f.linkAlegra}" target="_blank" style="color:var(--accent);font-size:11px;text-decoration:none">↗</a>`:''}
                <button onclick="_fichaEliminarFactura(${f.id},${clienteId})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:13px">🗑</button>
              </div>`).join('') : '<div style="text-align:center;padding:16px;color:var(--muted);font-size:12px">Sin facturas cargadas</div>'}
            </div>
          </div>

          <!-- SEGUIMIENTO -->
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
              <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:2px">── Seguimiento</div>
              <button onclick="_fichaAgregarSeguimiento(${clienteId},()=>_renderFicha())" style="background:var(--accent);border:none;color:#000;padding:5px 12px;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700">+ Agregar</button>
            </div>
            ${seguimiento.length ? seguimiento.map(s=>`
              <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);opacity:${s.completado?'0.5':'1'}">
                <input type="checkbox" ${s.completado?'checked':''} onchange="_fichaToggleSeguimiento(${s.id},${clienteId})" style="margin-top:3px;accent-color:var(--accent);flex-shrink:0">
                <div style="flex:1">
                  <div style="font-size:12px;font-weight:600;${s.completado?'text-decoration:line-through':''}">${s.texto}</div>
                  ${s.fechaRecordatorio?`<div style="font-size:10px;color:${s.fechaRecordatorio<todayStr()&&!s.completado?'#ef4444':'var(--muted)'}">📅 ${fmtD(s.fechaRecordatorio)}</div>`:''}
                </div>
                <button onclick="_fichaEliminarSeguimiento(${s.id},${clienteId})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:12px">🗑</button>
              </div>`).join('') : '<div style="text-align:center;padding:16px;color:var(--muted);font-size:12px">Sin seguimientos pendientes</div>'}
          </div>

          <!-- ANOTACIONES -->
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
              <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:2px">── Anotaciones internas</div>
            </div>
            <div style="display:flex;gap:8px;margin-bottom:12px">
              <textarea id="ficha-nota-input-${clienteId}" placeholder="Escribí una anotación..." style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;color:var(--text);font-size:13px;resize:none;height:60px;outline:none;font-family:inherit"></textarea>
              <button onclick="_fichaGuardarAnotacion(${clienteId})" style="background:var(--accent);border:none;color:#000;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;align-self:flex-end">Guardar</button>
            </div>
            <div id="ficha-anotaciones-${clienteId}" style="max-height:280px;overflow-y:auto">
            ${anotaciones.length ? anotaciones.map(a=>`
              <div style="padding:10px 12px;background:var(--surface2);border-radius:8px;margin-bottom:8px">
                <div style="font-size:12px;line-height:1.6;color:var(--text)">${a.texto}</div>
                <div style="font-size:10px;color:var(--muted);margin-top:6px">${a.autor||'Admin'} · ${a.fecha} ${a.hora||''}</div>
              </div>`).join('') : '<div style="text-align:center;padding:16px;color:var(--muted);font-size:12px">Sin anotaciones</div>'}
            </div>
          </div>

        </div>
      </div>
    </div>`;
  };

  await _renderFicha();
}

// ── Helpers de la ficha ────────────────────────────────────────

function _fichaEditarContrato(clienteId){
  const cli = (S.get('clientes')||[]).find(c=>c.id===clienteId);
  if(!cli) return;
  const url = prompt('Link al contrato (Google Drive, Dropbox, DocuSign):', cli.contrato_url||'');
  if(url === null) return;
  const nombre = prompt('Nombre del archivo:', cli.contrato_nombre||'Contrato');
  if(nombre === null) return;
  const items = S.get('clientes')||[];
  const idx = items.findIndex(c=>c.id===clienteId);
  if(idx>-1){ items[idx].contrato_url=url; items[idx].contrato_nombre=nombre||'Contrato'; S.set('clientes',items); }
  sbFetch('clientes','PATCH',{contrato_url:url,contrato_nombre:nombre||'Contrato'},'?id=eq.'+clienteId).catch(()=>{});
  abrirFichaCliente(clienteId);
}

async function _fichaGuardarAnotacion(clienteId){
  const el = document.getElementById('ficha-nota-input-'+clienteId);
  if(!el||!el.value.trim()){ toast('⚠️ Escribí algo primero'); return; }
  const nota = {
    id: Date.now(),
    clienteId,
    texto: el.value.trim(),
    fecha: todayStr(),
    hora: new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}),
    autor: currentUser?.nombre||'Admin'
  };
  // Guardar en Supabase + localStorage
  try{ await sbFetch('cliente_anotaciones','POST',nota,''); }catch(e){}
  const all = S.get('cliente_anotaciones')||[];
  all.unshift(nota);
  S.set('cliente_anotaciones', all);
  el.value = '';
  toast('✅ Anotación guardada');
  abrirFichaCliente(clienteId);
}

function _fichaAgregarFactura(clienteId, cb){
  const html = `<div class="modal-head"><div class="modal-title">💰 Nueva Factura</div><button class="modal-close" onclick="closeModal('modal-ficha-factura')">✕</button></div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group"><label>Número</label><input id="ff-numero" placeholder="0001-00000123"></div>
        <div class="form-group"><label>Concepto</label><input id="ff-concepto" placeholder="Auditoría BPC:2026"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Monto</label><input id="ff-monto" type="number" placeholder="0"></div>
        <div class="form-group"><label>Moneda</label><select id="ff-moneda"><option>ARS $</option><option>USD $</option></select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Fecha emisión</label><input id="ff-fecha" type="date" value="${todayStr()}"></div>
        <div class="form-group"><label>Fecha vencimiento</label><input id="ff-fechavto" type="date"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Estado</label><select id="ff-estado"><option>Pendiente</option><option>Pagada</option><option>Vencida</option><option>Anulada</option></select></div>
        <div class="form-group"><label>Link en Alegra / sistema</label><input id="ff-link" type="url" placeholder="https://app.alegra.com/..."></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal('modal-ficha-factura')">Cancelar</button>
      <button class="btn btn-primary" onclick="_fichaGuardarFactura(${clienteId})">💾 Guardar</button>
    </div>`;
  let m = document.getElementById('modal-ficha-factura');
  if(!m){ m=document.createElement('div'); m.id='modal-ficha-factura'; m.className='modal-overlay'; m.innerHTML='<div class="modal">'+html+'</div>'; document.body.appendChild(m); }
  else { m.querySelector('.modal').innerHTML=html; }
  m.classList.add('open');
}

async function _fichaGuardarFactura(clienteId){
  const f = {
    id: Date.now(),
    clienteId,
    numero:    document.getElementById('ff-numero')?.value||'',
    concepto:  document.getElementById('ff-concepto')?.value||'',
    monto:     Number(document.getElementById('ff-monto')?.value||0),
    moneda:    document.getElementById('ff-moneda')?.value||'ARS $',
    fecha:     document.getElementById('ff-fecha')?.value||todayStr(),
    fechaVto:  document.getElementById('ff-fechavto')?.value||'',
    estado:    document.getElementById('ff-estado')?.value||'Pendiente',
    linkAlegra:document.getElementById('ff-link')?.value||''
  };
  try{ await sbFetch('cliente_facturas','POST',f,''); }catch(e){}
  const all = S.get('cliente_facturas')||[];
  all.unshift(f);
  S.set('cliente_facturas',all);
  closeModal('modal-ficha-factura');
  toast('✅ Factura guardada');
  abrirFichaCliente(clienteId);
}

async function _fichaEliminarFactura(facturaId, clienteId){
  if(!confirm('¿Eliminar esta factura?')) return;
  try{ await sbFetch('cliente_facturas','DELETE',null,'?id=eq.'+facturaId); }catch(e){}
  const all = (S.get('cliente_facturas')||[]).filter(f=>f.id!==facturaId);
  S.set('cliente_facturas',all);
  toast('🗑 Factura eliminada');
  abrirFichaCliente(clienteId);
}

function _fichaAgregarSeguimiento(clienteId, cb){
  const texto = prompt('¿Qué hay que hacer?');
  if(!texto) return;
  const fecha = prompt('Fecha recordatorio (YYYY-MM-DD) — dejá vacío si no tiene:', '');
  const item = { id:Date.now(), clienteId, texto, fechaRecordatorio:fecha||'', completado:false, fecha:todayStr(), autor:currentUser?.nombre||'Admin' };
  sbFetch('cliente_seguimiento','POST',item,'').catch(()=>{});
  const all = S.get('cliente_seguimiento')||[];
  all.unshift(item);
  S.set('cliente_seguimiento',all);
  toast('✅ Seguimiento agregado');
  abrirFichaCliente(clienteId);
}

async function _fichaToggleSeguimiento(segId, clienteId){
  const all = S.get('cliente_seguimiento')||[];
  const idx = all.findIndex(s=>s.id===segId);
  if(idx>-1){ all[idx].completado=!all[idx].completado; S.set('cliente_seguimiento',all); }
  await sbFetch('cliente_seguimiento','PATCH',{completado:all[idx]?.completado},'?id=eq.'+segId).catch(()=>{});
  abrirFichaCliente(clienteId);
}

async function _fichaEliminarSeguimiento(segId, clienteId){
  if(!confirm('¿Eliminar este seguimiento?')) return;
  await sbFetch('cliente_seguimiento','DELETE',null,'?id=eq.'+segId).catch(()=>{});
  S.set('cliente_seguimiento',(S.get('cliente_seguimiento')||[]).filter(s=>s.id!==segId));
  abrirFichaCliente(clienteId);
}

// CLIENTES
function renderClientes(){
  const items=S.get('clientes');const el=document.getElementById('clientes-list');
  if(!items.length){el.innerHTML=`<div class="empty-state"><div class="icon">👥</div><h3>Sin clientes</h3></div>`;return;}
  const propEstadoBadge = s => {
    if(!s) return '<span style="font-size:10px;color:var(--muted)">—</span>';
    const cfg = {
      'Datos solicitados':  ['rgba(245,158,11,0.12)','var(--warn)','rgba(245,158,11,0.3)','📧'],
      'Propuesta generada': ['rgba(212,175,55,0.12)','var(--accent)','rgba(212,175,55,0.3)','📄'],
      'Enviada a firma':    ['rgba(184,146,46,0.12)','#c8a84a','rgba(184,146,46,0.3)','✍️'],
      'Firmada':            ['rgba(200,168,74,0.15)','#b8d080','rgba(200,168,74,0.35)','✅'],
      'Rechazada':          ['rgba(239,68,68,0.1)','var(--danger)','rgba(239,68,68,0.3)','❌'],
    };
    const [bg,col,border,icon] = cfg[s]||['rgba(107,127,163,0.1)','var(--muted)','rgba(107,127,163,0.2)','📋'];
    return `<span style="background:${bg};color:${col};border:1px solid ${border};border-radius:20px;padding:2px 8px;font-size:10px;font-weight:600">${icon} ${s}</span>`;
  };
  el.innerHTML=`<div class="table-wrap"><table>
    <thead><tr><th>Empresa</th><th>CUIT/RFC</th><th>Contacto</th><th>Email</th><th>Vendedor</th><th>Propuesta</th><th></th></tr></thead>
    <tbody>${items.map(c=>`<tr>
      <td><div style="font-weight:500">${c.nombre}</div><div style="font-size:10px;color:var(--muted)">${c.rubro||''}</div></td>
      <td style="color:var(--muted);font-size:12px">${c.cuit||'-'}</td>
      <td><div>${c.contacto||'-'}</div><div style="font-size:10px;color:var(--muted)">${c.cargo||''}</div></td>
      <td style="font-size:12px"><div style="color:var(--accent)">${c.email||'-'}</div>${c.email2?`<div style="color:var(--muted)">${c.email2}</div>`:''}</td>
      <td style="font-size:12px">${c.vendedor?`<span style="color:var(--accent);font-weight:600">🧑‍💼 ${c.vendedor}</span>`:`<span style="color:var(--danger);font-size:11px">⚠️ Sin asignar</span>`}</td>
      <td>${propEstadoBadge(c.prop_estado)}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-sm" onclick="abrirFichaCliente(${c.id})" style="background:rgba(14,165,233,0.12);color:#38bdf8;border:1px solid rgba(14,165,233,0.3)" title="Ver ficha completa">📋</button>
        <button class="btn btn-secondary btn-sm" onclick="editCliente(${c.id})" title="Editar">✏️</button>
        <button class="btn btn-sm" onclick="propuestaFlow(${c.id})" style="background:rgba(212,175,55,0.12);color:var(--accent);border:1px solid rgba(212,175,55,0.3)" title="Gestionar propuesta">📄</button>
        <button class="btn btn-sm" onclick="portalGenerarAcceso(${c.id})" style="background:rgba(184,146,46,0.15);color:#c8a84a;border:1px solid rgba(184,146,46,0.3)" title="Generar link portal BPC">🔗</button>
        <button class="btn btn-danger btn-sm" onclick="eliminarCliente(${c.id})">🗑</button>
      </td>
    </tr>`).join('')}</tbody></table></div>`;
}

function saveCliente(){
  const id=document.getElementById('cli-id').value;
  const item={id:id?Number(id):S.nextId('clientes'),...Object.fromEntries(['nombre','cuit','rubro','pais','direccion','web','contacto','cargo','email','email2','tel','wa','notas','vendedor','comision','monto-prop','moneda-prop','firmante','firmante-cargo','modalidad','prop-estado'].map(f=>[f.replace('-','_'),document.getElementById('cli-'+f)?.value||'']))};
  // Encargado de proceso
  item.encargado_nombre = document.getElementById('cli-encargado-nombre')?.value||'';
  item.encargado_cargo  = document.getElementById('cli-encargado-cargo')?.value||'';
  item.encargado_email  = document.getElementById('cli-encargado-email')?.value||'';
  item.encargado_tel    = document.getElementById('cli-encargado-tel')?.value||'';
  item.contrato_url     = document.getElementById('cli-contrato-url')?.value||'';
  item.contrato_nombre  = document.getElementById('cli-contrato-nombre')?.value||'';
  if(!item.nombre){toast('⚠️ Ingresá el nombre');return;}
  const items=S.get('clientes');
  if(id){const i=items.findIndex(x=>x.id===Number(id));if(i>-1)items[i]=item;}else items.push(item);
  S.set('clientes',items);closeModal('modal-cliente');renderClientes();trackActivity('save:cliente');toast('✅ Cliente guardado');
}

function editCliente(id){
  const c=S.get('clientes').find(x=>x.id===id);if(!c)return;
  openModal('modal-cliente','edit');
  ['id','nombre','cuit','rubro','pais','direccion','web','contacto','cargo','email','email2','tel','wa','notas','comision'].forEach(f=>{const el=document.getElementById('cli-'+f);if(el)el.value=c[f]||'';});
  // Campos propuesta
  const propFields=[['monto-prop','monto_prop'],['moneda-prop','moneda_prop'],['firmante','firmante'],['firmante-cargo','firmante_cargo'],['modalidad','modalidad'],['prop-estado','prop_estado']];
  propFields.forEach(([elId,key])=>{const el=document.getElementById('cli-'+elId);if(el)el.value=c[key]||'';});
  // Campos encargado de proceso
  const encFields=[['encargado-nombre','encargado_nombre'],['encargado-cargo','encargado_cargo'],['encargado-email','encargado_email'],['encargado-tel','encargado_tel']];
  encFields.forEach(([elId,key])=>{const el=document.getElementById('cli-'+elId);if(el)el.value=c[key]||'';});
  // Contrato
  const elCU=document.getElementById('cli-contrato-url'); if(elCU) elCU.value=c.contrato_url||'';
  const elCN=document.getElementById('cli-contrato-nombre'); if(elCN) elCN.value=c.contrato_nombre||'';
  // Populate vendedor dropdown
  populateSel('cli-vendedor',S.get('vendedores').map(v=>({v:v.nombre,l:v.nombre})),'Seleccionar vendedor...');
  document.getElementById('cli-vendedor').value=c.vendedor||'';
  document.getElementById('m-cli-title').textContent='Editar Cliente';
}


// ══════════════════════════════════════════════════════════════════
// PROPUESTA COMERCIAL BPCE 72001 — SISTEMA DE GENERACIÓN Y ENVÍO
// ══════════════════════════════════════════════════════════════════

function propuestaFlow(clienteId){
  const c = S.get('clientes').find(x=>x.id===clienteId);
  if(!c) return;

  // Detectar qué datos faltan
  const faltantes = [];
  if(!c.cuit)           faltantes.push('CUIT / RFC');
  if(!c.firmante)       faltantes.push('Nombre del firmante');
  if(!c.firmante_cargo) faltantes.push('Cargo del firmante');
  if(!c.monto_prop)     faltantes.push('Monto de inversión');
  if(!c.moneda_prop)    faltantes.push('Moneda');
  if(!c.modalidad)      faltantes.push('Modalidad (presencial/remota)');
  if(!c.email)          faltantes.push('Email del cliente');

  // Abrir modal de propuesta
  const ov = document.getElementById('modal-propuesta');
  ov.style.display='flex';
  document.getElementById('prop-cli-id').value = clienteId;

  const estadoDiv = document.getElementById('prop-estado-panel');
  const accionDiv = document.getElementById('prop-accion-panel');

  // Panel de estado
  estadoDiv.innerHTML = `
    <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;margin-bottom:16px">
      📄 Propuesta — ${c.nombre}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      ${[
        ['Empresa',    c.nombre||'—'],
        ['CUIT/RFC',   c.cuit||'<span style="color:var(--danger)">⚠️ Falta</span>'],
        ['Contacto',   c.contacto||'—'],
        ['Email',      c.email||'<span style="color:var(--danger)">⚠️ Falta</span>'],
        ['Firmante',   c.firmante||(c.contacto||'<span style="color:var(--danger)">⚠️ Falta</span>')],
        ['Cargo',      c.firmante_cargo||(c.cargo||'<span style="color:var(--danger)">⚠️ Falta</span>')],
        ['Monto',      c.monto_prop ? (c.moneda_prop||'')+'&nbsp;'+Number(c.monto_prop).toLocaleString('es-AR') : '<span style="color:var(--danger)">⚠️ Falta</span>'],
        ['Modalidad',  c.modalidad||'<span style="color:var(--danger)">⚠️ Falta</span>'],
      ].map(([k,v])=>`
        <div style="background:var(--surface2);border-radius:8px;padding:10px 12px">
          <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">${k}</div>
          <div style="font-size:13px">${v}</div>
        </div>`).join('')}
    </div>
    ${c.prop_estado ? `<div style="margin-bottom:12px">Estado actual: <strong>${c.prop_estado}</strong></div>` : ''}
    ${faltantes.length ? `
      <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:10px;padding:12px 14px;margin-bottom:14px">
        <div style="font-size:12px;font-weight:700;color:var(--warn);margin-bottom:6px">⚠️ Datos incompletos:</div>
        ${faltantes.map(f=>`<div style="font-size:12px;color:var(--muted);padding:2px 0">• ${f}</div>`).join('')}
      </div>` : `
      <div style="background:rgba(200,168,74,0.08);border:1px solid rgba(200,168,74,0.25);border-radius:10px;padding:10px 14px;margin-bottom:14px">
        <div style="font-size:12px;color:#c8a84a;font-weight:600">✅ Todos los datos completos — lista para generar</div>
      </div>`}
  `;

  // Panel de acciones
  accionDiv.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:10px">
      ${faltantes.length ? `
        <button class="btn btn-primary" onclick="propuestaSolicitarDatos(${clienteId})" ${!c.email?'disabled title="Necesitás cargar el email del cliente primero"':''}>
          📧 Solicitar datos faltantes por email
        </button>` : ''}
      <button class="btn btn-primary" onclick="propuestaGenerar(${clienteId})" ${faltantes.length?'style="background:var(--surface3);color:var(--muted)" disabled title="Completá los datos primero"':''}>
        ✨ Generar propuesta con IA
      </button>
      ${c.prop_estado==='Propuesta generada'||c.prop_estado==='Enviada a firma' ? `
        <button class="btn btn-secondary" onclick="propuestaVerPreview(${clienteId})">
          👁 Ver propuesta generada
        </button>` : ''}
      ${c.prop_estado==='Firmada' ? `
        <button class="btn btn-primary" onclick="emailInicioAuditoria(${clienteId});document.getElementById('modal-propuesta').style.display='none'" style="background:rgba(200,168,74,0.2);color:#c8a84a;border:1px solid rgba(200,168,74,0.4)">
          🚀 Enviar email de inicio de auditoría
        </button>` : ''}
      <button class="btn btn-secondary" onclick="editCliente(${clienteId});document.getElementById('modal-propuesta').style.display='none'">
        ✏️ Completar datos manualmente
      </button>
    </div>
  `;
}

async function propuestaSolicitarDatos(clienteId){
  const c = S.get('clientes').find(x=>x.id===clienteId);
  if(!c||!c.email){ toast('❌ El cliente no tiene email'); return; }

  const btn = event.target;
  btn.textContent='⏳ Enviando...'; btn.disabled=true;

  // Email al cliente solicitando datos
  const formUrl = `${window.location.origin}${window.location.pathname}?solicitud_datos=1&cli=${clienteId}&token=${btoa(c.nombre+'|'+Date.now())}`;
  
  const htmlEmail = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;padding:32px">
      <div style="font-family:serif;font-size:24px;font-weight:700;margin-bottom:4px">MetoGroup</div>
      <div style="font-size:11px;color:#888;letter-spacing:2px;text-transform:uppercase;margin-bottom:28px">Sistema de Gestión</div>
      <p style="font-size:15px;color:#333">Estimado/a <strong>${c.contacto||c.nombre}</strong>,</p>
      <p style="color:#555;line-height:1.6">Para avanzar con la propuesta comercial de la <strong>Auditoría BPCE 72001</strong>, necesitamos confirmar algunos datos de su organización.</p>
      <p style="color:#555;line-height:1.6">Por favor, complete el siguiente formulario con la información requerida:</p>
      <div style="text-align:center;margin:28px 0">
        <a href="${formUrl}" style="background:#d4af37;color:#000;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:1px">
          📋 COMPLETAR DATOS
        </a>
      </div>
      <div style="background:#f9f6ee;border-left:3px solid #d4af37;padding:14px 18px;margin:20px 0;border-radius:0 8px 8px 0">
        <div style="font-size:12px;font-weight:700;color:#8a6a1a;margin-bottom:8px">Datos requeridos:</div>
        ${['CUIT / RFC / RUC','Nombre completo del firmante autorizado','Cargo del firmante'].map(d=>`<div style="font-size:13px;color:#555;padding:2px 0">• ${d}</div>`).join('')}
      </div>
      <p style="color:#888;font-size:12px;margin-top:24px">Ante cualquier consulta, no dude en contactarnos.<br>Equipo MetoGroup</p>
    </div>`;

  // Obtener credenciales SMTP
  const emailCfg = (S.get('email_config')||[])[0]||{};
  if(!emailCfg.smtp_user){ toast('❌ Configurá el email en Sistema → Usuarios primero'); btn.textContent='📧 Solicitar datos faltantes por email'; btn.disabled=false; return; }

  try {
    const resp = await fetch('/.netlify/functions/send-email',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        from_email: emailCfg.smtp_user,
        from_password: emailCfg.smtp_pass,
        from_name: 'MetoGroup',
        to: c.email,
        subject: `MetoGroup — Datos para propuesta comercial BPCE 72001`,
        html: htmlEmail,
        text: `Estimado/a ${c.contacto||c.nombre}, necesitamos confirmar algunos datos para avanzar con la propuesta. Acceda a: ${formUrl}`
      })
    });
    const data = await resp.json();
    if(data.success){
      // Actualizar estado del cliente
      const clientes = S.get('clientes');
      const idx = clientes.findIndex(x=>x.id===clienteId);
      if(idx>-1){ clientes[idx].prop_estado='Datos solicitados'; S.set('clientes',clientes); }
      toast('✅ Email enviado a '+c.email);
      propuestaFlow(clienteId); // refrescar
    } else {
      toast('❌ Error: '+(data.detail||data.error||'').substring(0,80));
      btn.textContent='📧 Solicitar datos faltantes por email'; btn.disabled=false;
    }
  } catch(e){
    toast('❌ Error de conexión');
    btn.textContent='📧 Solicitar datos faltantes por email'; btn.disabled=false;
  }
}

async function propuestaGenerar(clienteId){
  const c = S.get('clientes').find(x=>x.id===clienteId);
  if(!c) return;

  const btn = event.target;
  btn.textContent='✨ Generando con IA...'; btn.disabled=true;

  if(!ANTHROPIC_API_KEY){ toast('❌ Configurá la API key de Claude'); btn.textContent='✨ Generar propuesta con IA'; btn.disabled=false; return; }

  const hoy = new Date();
  const fechaEmision = hoy.toLocaleDateString('es-AR',{day:'2-digit',month:'long',year:'numeric'});
  const fechaVencimiento = new Date(hoy.getTime()+7*24*60*60*1000).toLocaleDateString('es-AR',{day:'2-digit',month:'long',year:'numeric'});
  const firmante = c.firmante || c.contacto || '';
  const cargoFirmante = c.firmante_cargo || c.cargo || '';
  const monto = c.monto_prop ? Number(c.monto_prop).toLocaleString('es-AR') : '_______________';
  const moneda = c.moneda_prop || 'ARS';
  const modalidad = c.modalidad || 'a definir';

  const prompt = `Sos el sistema de generación de propuestas de MetoGroup Latam S.A.
Generá una propuesta comercial profesional para la Auditoría BPCE 72001 en HTML puro, con estilos inline.

DATOS DEL CLIENTE:
- Empresa: ${c.nombre}
- CUIT/RFC: ${c.cuit||'A confirmar'}
- Contacto: ${firmante}${cargoFirmante?', '+cargoFirmante:''}
- Email: ${c.email||''}
- País: ${c.pais||'Argentina'}
- Rubro: ${c.rubro||''}
- Modalidad: ${modalidad}

CONDICIONES ECONÓMICAS:
- Monto total: ${moneda} ${monto} (IVA no incluido)
- 50% al firmar la propuesta
- 50% previo al inicio del relevamiento (con al menos 3 días de anticipación)

FECHAS:
- Fecha de emisión: ${fechaEmision}
- Válida hasta: ${fechaVencimiento}
- Plazo de ejecución: 60 a 90 días corridos desde aprobación

INSTRUCCIONES DE FORMATO:
- Diseño premium en blanco y negro, tipografía Arial/sans-serif
- Membrete MetoGroup Latam S.A. en la parte superior
- Incluir todas las secciones: alcance, metodología, entregables, condiciones económicas, términos
- Sección de firma al final con espacio para: MetoGroup (Leandro Alonso, Director) y ${firmante} (${cargoFirmante})
- Lugar y fecha al pie
- HTML completo con estilos inline para impresión/PDF
- NO incluir DOCTYPE ni html/head/body — solo el contenido

Generá la propuesta completa y profesional.`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        model:'claude-sonnet-4-20250514',
        max_tokens:4000,
        messages:[{role:'user',content:prompt}]
      })
    });
    const data = await resp.json();
    const htmlContent = data.content?.[0]?.text||'';
    if(!htmlContent){ toast('❌ Error generando propuesta'); btn.textContent='✨ Generar propuesta con IA'; btn.disabled=false; return; }

    // Guardar propuesta generada en el cliente
    const clientes = S.get('clientes');
    const idx = clientes.findIndex(x=>x.id===clienteId);
    if(idx>-1){
      clientes[idx].prop_estado = 'Propuesta generada';
      clientes[idx].prop_html = htmlContent;
      clientes[idx].prop_fecha = new Date().toISOString().split('T')[0];
      S.set('clientes',clientes);
    }
    toast('✅ Propuesta generada');
    propuestaVerPreview(clienteId);
    propuestaFlow(clienteId);
  } catch(e){
    toast('❌ Error: '+e.message);
    btn.textContent='✨ Generar propuesta con IA'; btn.disabled=false;
  }
}

function propuestaVerPreview(clienteId){
  const c = S.get('clientes').find(x=>x.id===clienteId);
  if(!c||!c.prop_html){ toast('⚠️ Sin propuesta generada'); return; }

  // Abrir en nueva ventana para imprimir/descargar
  const win = window.open('','_blank','width=900,height=800,scrollbars=yes');
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8">
    <title>Propuesta — ${c.nombre}</title>
    <style>
      body{font-family:Arial,sans-serif;margin:0;padding:32px;background:#f5f0e8;}
      @media print{body{background:#fff;padding:0;}}
      .no-print{position:fixed;top:16px;right:16px;display:flex;gap:8px;z-index:999;}
      .no-print button{padding:10px 18px;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:700;}
      .btn-print{background:#d4af37;color:#000;}
      .btn-close{background:#333;color:#fff;}
    </style>
  </head><body>
    <div class="no-print">
      <button class="btn-print" onclick="window.print()">🖨️ Imprimir / PDF</button>
      <button class="btn-close" onclick="window.close()">✕ Cerrar</button>
    </div>
    ${c.prop_html}
  </body></html>`);
  win.document.close();
}



function descargarFicha(key){
  const ficha = FICHAS_ENTREVISTA[key];
  if(!ficha){ toast('❌ Ficha no encontrada'); return; }
  const byteChars = atob(ficha.b64);
  const byteNums = new Array(byteChars.length);
  for(let i=0;i<byteChars.length;i++) byteNums[i]=byteChars.charCodeAt(i);
  const blob = new Blob([new Uint8Array(byteNums)], {type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download=ficha.nombre; a.click();
  URL.revokeObjectURL(url);
  toast('📥 Descargando ' + ficha.nombre);
}

async function emailInicioAuditoria(clienteId){
  const c = S.get('clientes').find(x=>x.id===clienteId);
  if(!c){ toast('❌ Cliente no encontrado'); return; }
  if(!c.email){ toast('❌ El cliente no tiene email configurado'); return; }

  const emailCfg = (S.get('email_config')||[])[0]||{};
  if(!emailCfg.smtp_user){ toast('❌ Configurá el email SMTP primero'); return; }

  const responsable = currentUser?.email_nombre || currentUser?.nombre || 'MetoGroup';
  const emailRemitente = currentUser?.email || emailCfg.smtp_user;

  // Usar la plantilla inicio_auditoria
  const tpl = EMAIL_TEMPLATES.inicio_auditoria;
  const data = {
    contacto: c.contacto || c.nombre,
    empresa: c.nombre,
    vendedor: responsable,
    email: emailRemitente,
  };
  const subject = emailFillTemplate(tpl.subject, data);
  const body = emailFillTemplate(tpl.body, data);

  // Abrir modal de compose con la plantilla precargada
  emailComponer(c.email, { empresa: c.nombre, contacto: c.contacto });
  setTimeout(()=>{
    const subEl = document.getElementById('email-subject');
    const bodyEl = document.getElementById('email-body');
    const tplSel = document.getElementById('email-tpl');
    if(subEl) subEl.value = subject;
    if(bodyEl) bodyEl.innerHTML = body;
    if(tplSel) tplSel.value = 'inicio_auditoria';
    toast('✅ Plantilla de inicio de auditoría cargada — revisá y enviá');
  }, 200);
}

// COTIZACIONES
function renderCotizaciones(){
  const items=S.get('cotizaciones');const el=document.getElementById('cotizaciones-list');
  if(!items.length){el.innerHTML=`<div class="empty-state"><div class="icon">📄</div><h3>Sin cotizaciones</h3></div>`;return;}
  el.innerHTML=`<div class="table-wrap"><table>
    <thead><tr><th>N°</th><th>Cliente</th><th>Servicio</th><th>Monto</th><th>Fecha</th><th>Estado</th><th></th></tr></thead>
    <tbody>${items.map(c=>`<tr><td style="font-weight:600;color:var(--accent)">${c.numero||'-'}</td><td>${c.cliente||'-'}</td><td style="font-size:11px">${c.servicio}</td><td style="color:var(--accent3);font-weight:600">${fmt(c.monto)}</td><td style="color:var(--muted)">${fmtD(c.fecha)}</td><td>${badge(c.estado)}</td><td><button class="btn btn-secondary btn-sm" onclick="editCot(${c.id})">✏️</button> <button class="btn btn-danger btn-sm" onclick="delItem('cotizaciones',${c.id},renderCotizaciones)">🗑</button></td></tr>`).join('')}</tbody></table></div>`;
}

function saveCotizacion(){
  const id=document.getElementById('cot-id').value;
  const item={id:id?Number(id):S.nextId('cotizaciones'),numero:document.getElementById('cot-numero').value,cliente:document.getElementById('cot-cliente').value,servicio:document.getElementById('cot-servicio').value,monto:document.getElementById('cot-monto').value,fecha:document.getElementById('cot-fecha').value,vencimiento:document.getElementById('cot-vencimiento').value,estado:document.getElementById('cot-estado').value,desc:document.getElementById('cot-desc').value};
  if(!item.numero){toast('⚠️ Ingresá el número');return;}
  const items=S.get('cotizaciones');if(id){const i=items.findIndex(x=>x.id===Number(id));if(i>-1)items[i]=item;}else items.push(item);
  S.set('cotizaciones',items);closeModal('modal-cotizacion');renderCotizaciones();trackActivity('save:cotizacion');toast('✅ Cotización guardada');
}

function editCot(id){
  const c=S.get('cotizaciones').find(x=>x.id===id);if(!c)return;
  openModal('modal-cotizacion','edit');
  document.getElementById('cot-id').value=id;document.getElementById('cot-numero').value=c.numero;document.getElementById('cot-monto').value=c.monto;document.getElementById('cot-fecha').value=c.fecha||'';document.getElementById('cot-vencimiento').value=c.vencimiento||'';document.getElementById('cot-estado').value=c.estado;document.getElementById('cot-desc').value=c.desc||'';
  populateSel('cot-cliente',S.get('clientes').map(c=>({v:c.nombre,l:c.nombre})),'Seleccionar...');document.getElementById('cot-cliente').value=c.cliente||'';
  document.getElementById('cot-servicio').value=c.servicio||'';document.getElementById('m-cot-title').textContent='Editar Cotización';
}

// GASTOS
function renderGastos(){
  const items=S.get('gastos');const el=document.getElementById('gastos-list');
  const total=items.reduce((s,g)=>s+(Number(g.monto)||0),0);
  const deudas=items.filter(g=>g.estadoPago==='Pendiente'||g.estadoPago==='Parcial');
  const totalDeuda=deudas.reduce((s,g)=>s+(Number(g.monto)||0),0);
  const totalPagado=items.filter(g=>!g.estadoPago||g.estadoPago==='Pagado').reduce((s,g)=>s+(Number(g.monto)||0),0);
  const hdr=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">
    <div class="stat-card" style="cursor:pointer" onclick="adminDetalle('gastos')"><div class="stat-icon red">💸</div><div class="card-title">Total Gastos</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--danger)">${fmt(total)}</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="adminDetalle('gastos')"><div class="stat-icon green">✅</div><div class="card-title">Pagados</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--accent3)">${fmt(totalPagado)}</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="adminDetalle('deudas')"><div class="stat-icon orange">⏳</div><div class="card-title">Deudas Pendientes</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--danger)">${fmt(totalDeuda)}</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="adminDetalle('gastos')"><div class="stat-icon cyan">📊</div><div class="card-title">Registros</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--accent)">${items.length}</div></div>
  </div>`;
  // Deudas alert
  let deudaAlert='';
  if(deudas.length){
    deudaAlert=`<div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:12px;padding:14px 18px;margin-bottom:16px">
      <div style="font-family:'Syne',sans-serif;font-weight:700;color:var(--danger);margin-bottom:8px">🔴 La empresa debe ${fmt(totalDeuda)} — ${deudas.length} gasto(s) sin pagar</div>
      ${deudas.map(g=>`<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:6px 0;border-bottom:1px solid rgba(239,68,68,0.15)">
        <div><strong>${g.concepto}</strong>${g.acreedor?` → <span style="color:var(--warn)">Debe a: ${g.acreedor}</span>`:''}</div>
        <div style="display:flex;gap:12px;align-items:center"><span style="color:var(--danger);font-weight:700">${fmt(g.monto)}</span>${g.vencimiento?`<span style="font-size:10px;color:var(--muted)">Vence: ${fmtD(g.vencimiento)}</span>`:''}</div>
      </div>`).join('')}
    </div>`;
  }
  if(!items.length){el.innerHTML=hdr+`<div class="empty-state"><div class="icon">💸</div><h3>Sin gastos</h3></div>`;return;}
  el.innerHTML=hdr+deudaAlert+`<div class="table-wrap"><table>
    <thead><tr><th>Concepto</th><th>Categoría</th><th>Medio Pago</th><th>Pagado por</th><th>Fecha</th><th>Monto</th><th>Estado</th><th>Docs</th><th></th></tr></thead>
    <tbody>${items.sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')).map(g=>{
      const st=g.estadoPago||'Pagado';
      const stBadge=st==='Pagado'?'badge-success':st==='Pendiente'?'badge-danger':'badge-warn';
      return`<tr${st==='Pendiente'?' style="background:rgba(239,68,68,0.04)"':''}>
        <td><div style="font-weight:500">${g.concepto}</div>${g.acreedor?`<div style="font-size:10px;color:var(--danger)">Acreedor: ${g.acreedor}</div>`:''}</td>
        <td><span class="badge badge-warn">${g.categoria}</span></td>
        <td style="font-size:12px">${g.medio||'—'}</td>
        <td style="font-size:12px">${g.pagadoPor||g.resp||'—'}</td>
        <td style="color:var(--muted)">${fmtD(g.fecha)}</td>
        <td style="color:var(--danger);font-weight:600">${fmt(g.monto)}</td>
        <td><span class="badge ${stBadge}">${st}</span></td>
        <td>${g.comprobante?`<a href="${g.comprobante}" target="_blank" style="color:var(--accent);font-size:11px">📎 Ver</a>`:'—'}</td>
        <td><button class="btn btn-secondary btn-sm" onclick="editGas(${g.id})">✏️</button> <button class="btn btn-danger btn-sm" onclick="delItem('gastos',${g.id},renderGastos)">🗑</button></td>
      </tr>`;}).join('')}</tbody></table></div>`;
}

function saveGasto(){
  const id=document.getElementById('gas-id').value;
  const item={id:id?Number(id):S.nextId('gastos'),concepto:document.getElementById('gas-concepto').value,categoria:document.getElementById('gas-categoria').value,monto:document.getElementById('gas-monto').value,fecha:document.getElementById('gas-fecha').value,medio:document.getElementById('gas-medio').value,pagadoPor:document.getElementById('gas-pagadopor').value,auditoria:document.getElementById('gas-auditoria').value,estadoPago:document.getElementById('gas-estado-pago').value,acreedor:document.getElementById('gas-acreedor').value,vencimiento:document.getElementById('gas-vencimiento').value,comprobante:document.getElementById('gas-comprobante').value,notas:document.getElementById('gas-notas').value};
  if(!item.concepto){toast('⚠️ Ingresá el concepto');return;}
  const items=S.get('gastos');if(id){const i=items.findIndex(x=>x.id===Number(id));if(i>-1)items[i]=item;}else items.push(item);
  S.set('gastos',items);closeModal('modal-gasto');renderGastos();trackActivity('save:gasto');toast('✅ Gasto registrado');
}

function editGas(id){
  const g=S.get('gastos').find(x=>x.id===id);if(!g)return;
  openModal('modal-gasto','edit');
  document.getElementById('gas-id').value=id;document.getElementById('gas-concepto').value=g.concepto;document.getElementById('gas-categoria').value=g.categoria;document.getElementById('gas-monto').value=g.monto;document.getElementById('gas-fecha').value=g.fecha||'';document.getElementById('gas-notas').value=g.notas||'';
  document.getElementById('gas-medio').value=g.medio||'Transferencia';
  document.getElementById('gas-estado-pago').value=g.estadoPago||'Pagado';
  document.getElementById('gas-acreedor').value=g.acreedor||'';
  document.getElementById('gas-vencimiento').value=g.vencimiento||'';
  document.getElementById('gas-comprobante').value=g.comprobante||'';
  populateAuditoriaSel('gas-auditoria');document.getElementById('gas-auditoria').value=g.auditoria||'';
  // Populate pagado por
  const pagSel=document.getElementById('gas-pagadopor');
  pagSel.innerHTML='<option value="Empresa">Empresa (MetoGroup)</option>';
  S.get('auditores').forEach(a=>{pagSel.innerHTML+=`<option value="${a.nombre}">${a.nombre} (consultor)</option>`;});
  S.get('vendedores').forEach(v=>{pagSel.innerHTML+=`<option value="${v.nombre}">${v.nombre} (vendedor)</option>`;});
  pagSel.value=g.pagadoPor||'Empresa';
  document.getElementById('m-gas-title').textContent='Editar Gasto';
}

// VENDEDORES
function renderVendedores(){
  if(currentUser?.rol==='admin'&&!getUserRoles(currentUser).includes('dueno')){
    const el=document.getElementById('vendedores-list');
    if(el)el.innerHTML='<div class="empty-state"><div class="icon">🔒</div><h3>Acceso restringido</h3><p>Esta sección es solo para la dirección.</p></div>';
    return;
  }
  // Sincronizar usuarios con rol vendedor que no estén en la tabla
  sincVendedoresDesdeUsuarios();
  const items=S.get('vendedores'),auds=S.get('auditorias');
  const el=document.getElementById('vendedores-list');
  const ym=todayStr().substring(0,7);
  const MES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const [y,m]=ym.split('-');
  const mesNom=MES[parseInt(m)-1]+' '+y;
  const premioMes=(S.get('crm_premios')||[]).find(x=>x.ym===ym)||null;
  const allLogs=S.get('crm_logs');

  if(!items.length){
    el.innerHTML=`<div class="empty-state"><div class="icon">🧑‍💼</div><h3>Sin vendedores</h3><p>Agregá vendedores para gestionar sus objetivos</p></div>`;
    return;
  }

  // Banner del premio del mes activo
  const bannerPremio = premioMes
    ? `<div style="background:linear-gradient(135deg,rgba(245,158,11,0.15),rgba(249,115,22,0.08));border:2px solid rgba(245,158,11,0.45);border-radius:14px;padding:16px 22px;margin-bottom:22px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <div style="display:flex;align-items:center;gap:14px">
          <span style="font-size:32px">🏅</span>
          <div>
            <div style="font-size:10px;color:rgba(245,158,11,0.7);text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:3px">Premio del mes activo — ${mesNom}</div>
            <div style="font-family:'Syne',sans-serif;font-size:17px;font-weight:800;color:#fbbf24">${premioMes.nombre}</div>
            ${premioMes.desc?`<div style="font-size:12px;color:#d97706;margin-top:2px">${premioMes.desc}</div>`:''}
          </div>
        </div>
        <button onclick="abrirPremioMes()" style="background:rgba(245,158,11,0.2);border:1px solid rgba(245,158,11,0.4);border-radius:8px;padding:7px 16px;cursor:pointer;color:#f59e0b;font-weight:700;font-size:12px;white-space:nowrap">✏️ Editar premio</button>
      </div>`
    : `<div style="background:var(--surface2);border:2px dashed rgba(245,158,11,0.3);border-radius:14px;padding:14px 22px;margin-bottom:22px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:26px;opacity:0.5">🏅</span>
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--muted)">Sin premio del mes para ${mesNom}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">Publicá un premio y aparecerá automáticamente en el dashboard de cada vendedor y en Rankings</div>
          </div>
        </div>
        <button onclick="abrirPremioMes()" style="background:linear-gradient(135deg,rgba(245,158,11,0.15),rgba(251,191,36,0.1));border:1px solid rgba(245,158,11,0.4);border-radius:8px;padding:8px 18px;cursor:pointer;color:#f59e0b;font-weight:700;font-size:13px;white-space:nowrap">🏅 Publicar premio</button>
      </div>`;

  el.innerHTML = bannerPremio + `<div class="grid-3">${items.map(v=>{
    const obj=S.get('crm_objetivos').find(x=>String(x.vendedorId)===String(v.id)&&x.ym===ym)||null;
    const logs=allLogs.filter(l=>l.vendedor===v.nombre&&l.fecha.startsWith(ym));
    const llamadas=logs.reduce((s,l)=>s+(Number(l.llamadas)||0),0);
    const cerradas=logs.reduce((s,l)=>s+(Number(l.cerradas)||0),0);
    const agendadas=logs.reduce((s,l)=>s+(Number(l.agendadas)||0),0);
    const duenos=logs.reduce((s,l)=>s+(Number(l.duenos)||0),0);

    // Calcular % de cumplimiento de cada objetivo
    function pctBar(real, meta, color){
      if(!meta) return `<div style="font-size:10px;color:var(--muted);text-align:center">—</div>`;
      const pct = Math.min(Math.round(real/meta*100), 100);
      const over = real >= meta;
      const c = pct>=100?'var(--accent3)':pct>=70?color:'var(--danger)';
      return `<div style="display:flex;align-items:center;gap:6px">
        <div style="flex:1;background:var(--surface);border-radius:4px;height:6px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${over?'var(--accent3)':color};border-radius:4px"></div>
        </div>
        <div style="font-size:10px;font-weight:700;color:${c};min-width:36px;text-align:right">${real}/${meta}</div>
      </div>`;
    }

    const tieneObj = !!obj;
    const vAuds=auds.filter(a=>a.tipo==='Auditoría Internacional'&&a.vendedor===v.nombre).length;
    const vIA=auds.filter(a=>a.tipo==='Adaptación IA BPCE'&&a.vendedor===v.nombre).length;
    const vImpl=auds.filter(a=>a.tipo==='Implementación ISO 72001'&&a.vendedor===v.nombre).length;

    return`<div class="person-card" style="display:flex;flex-direction:column;gap:0">
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <div class="person-avatar" style="background:linear-gradient(135deg,var(--accent2),var(--accent));flex-shrink:0">${v.nombre.substring(0,2).toUpperCase()}</div>
        <div style="flex:1;min-width:0">
          <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v.nombre}</div>
          <div>${badge(v.estado)}</div>
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          <button class="btn btn-secondary btn-sm" onclick="editVend(${v.id})" title="Editar">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="delItem('vendedores',${v.id},renderVendedores)" title="Eliminar">🗑</button>
        </div>
      </div>

      <!-- Mini estadísticas de servicios -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:12px">
        <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:8px;padding:7px;text-align:center">
          <div style="font-size:15px;font-weight:800;color:#f59e0b;font-family:'Syne',sans-serif">${vAuds}</div>
          <div style="font-size:9px;color:var(--muted)">Auditorías</div>
        </div>
        <div style="background:rgba(184,146,46,0.08);border:1px solid rgba(184,146,46,0.2);border-radius:8px;padding:7px;text-align:center">
          <div style="font-size:15px;font-weight:800;color:#c8a84a;font-family:'Syne',sans-serif">${vIA}</div>
          <div style="font-size:9px;color:var(--muted)">Adec. IA</div>
        </div>
        <div style="background:rgba(200,168,74,0.08);border:1px solid rgba(200,168,74,0.2);border-radius:8px;padding:7px;text-align:center">
          <div style="font-size:15px;font-weight:800;color:var(--accent3);font-family:'Syne',sans-serif">${vImpl}</div>
          <div style="font-size:9px;color:var(--muted)">ISO 72001</div>
        </div>
      </div>

      <!-- Objetivos del mes -->
      <div style="background:${tieneObj?'rgba(212,175,55,0.04)':'rgba(239,68,68,0.04)'};border:1px solid ${tieneObj?'rgba(212,175,55,0.2)':'rgba(239,68,68,0.2)'};border-radius:10px;padding:12px;margin-bottom:10px;flex:1">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${tieneObj?'10px':'0'}">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${tieneObj?'var(--accent)':'var(--danger)'}">🎯 Objetivos ${mesNom.split(' ')[0]}</div>
          <button onclick="abrirObjetivos(${v.id})" style="background:${tieneObj?'rgba(212,175,55,0.1)':'rgba(239,68,68,0.1)'};border:1px solid ${tieneObj?'rgba(212,175,55,0.3)':'rgba(239,68,68,0.3)'};border-radius:6px;padding:3px 10px;cursor:pointer;color:${tieneObj?'var(--accent)':'var(--danger)'};font-size:10px;font-weight:700">${tieneObj?'✏️ Editar':'+ Fijar'}</button>
        </div>
        ${tieneObj ? `
          <div style="display:flex;flex-direction:column;gap:7px">
            ${obj.llamadas ? `<div><div style="font-size:10px;color:var(--muted);margin-bottom:3px">📞 Llamadas</div>${pctBar(llamadas,obj.llamadas,'var(--accent)')}</div>` : ''}
            ${obj.duenos ? `<div><div style="font-size:10px;color:var(--muted);margin-bottom:3px">👤 Dueños</div>${pctBar(duenos,obj.duenos,'#c8a84a')}</div>` : ''}
            ${obj.agendadas ? `<div><div style="font-size:10px;color:var(--muted);margin-bottom:3px">📅 Entrevistas</div>${pctBar(agendadas,obj.agendadas,'var(--warn)')}</div>` : ''}
            ${obj.cerradas ? `<div><div style="font-size:10px;color:var(--muted);margin-bottom:3px">🏆 Cierres</div>${pctBar(cerradas,obj.cerradas,'var(--accent3)')}</div>` : ''}
            ${!obj.llamadas&&!obj.duenos&&!obj.agendadas&&!obj.cerradas ? '<div style="font-size:11px;color:var(--muted);text-align:center;padding:4px">Sin métricas configuradas</div>' : ''}
          </div>` :
          `<div style="font-size:11px;color:var(--danger);text-align:center;padding:4px 0">Sin objetivos para este mes</div>`
        }
      </div>

      <!-- Botón CRM -->
      <button class="btn btn-secondary" style="width:100%;justify-content:center;font-size:12px" onclick="abrirCRMVendedor(${v.id})">🏆 Ver CRM completo</button>
    </div>`;
  }).join('')}</div>`;
}

function saveVendedor(){
  const id=document.getElementById('vend-id').value;
  const item={id:id?Number(id):S.nextId('vendedores'),nombre:document.getElementById('vend-nombre').value,email:document.getElementById('vend-email').value,tel:document.getElementById('vend-tel').value,sueldo:document.getElementById('vend-sueldo').value,comision:document.getElementById('vend-comision').value,ingreso:document.getElementById('vend-ingreso').value||'',estado:document.getElementById('vend-estado').value};
  if(!item.nombre){toast('⚠️ Ingresá el nombre');return;}
  const items=S.get('vendedores');if(id){const i=items.findIndex(x=>x.id===Number(id));if(i>-1)items[i]=item;}else items.push(item);
  S.set('vendedores',items);closeModal('modal-vendedor');renderVendedores();trackActivity('save:vendedor');toast('✅ Vendedor guardado');
}

function editVend(id){
  const v=S.get('vendedores').find(x=>x.id===id);if(!v)return;
  openModal('modal-vendedor','edit');
  document.getElementById('vend-id').value=id;document.getElementById('vend-nombre').value=v.nombre;document.getElementById('vend-email').value=v.email||'';document.getElementById('vend-tel').value=v.tel||'';document.getElementById('vend-sueldo').value=v.sueldo||0;document.getElementById('vend-comision').value=v.comision||300;document.getElementById('vend-ingreso').value=v.ingreso||'';document.getElementById('vend-estado').value=v.estado;
  document.getElementById('m-vend-title').textContent='Editar Vendedor';
}

// REPORTES
function renderEntrevistas(){
  if(currentUser?.rol==='admin'&&!getUserRoles(currentUser).includes('dueno')){
    const el=document.getElementById('page-content');
    if(el)el.innerHTML='<div class="empty-state"><div class="icon">🔒</div><h3>Acceso restringido</h3><p>Esta sección es solo para la dirección.</p></div>';
    return;
  }
  const el=document.getElementById('page-content');
  if(!el)return;

  const todas=S.get('crm_entrevistas')||[];
  const hoy=todayStr();

  // Tabs
  const tabActivo=el.getAttribute('data-tab')||'pendientes';
  const pendientes=todas.filter(e=>!e.estado&&!e.fechaRealizada||(!e.estado&&e.fechaRealizada));
  const enCurso=todas.filter(e=>e.estado&&e.estado!=='cerrado'&&e.estado!=='perdido'&&e.estado!=='no_apto');
  const cerradas=todas.filter(e=>e.estado==='cerrado');
  const perdidas=todas.filter(e=>e.estado==='perdido'||e.estado==='no_apto');

  // Badge en menú
  const badge=document.getElementById('entrevistas-badge');
  const pend=todas.filter(e=>!e.estado&&!e.fechaRealizada).length;
  if(badge){badge.textContent=pend||'';badge.style.display=pend>0?'inline-flex':'none';}

  const tabBar=`<div style="display:flex;gap:4px;margin-bottom:24px;border-bottom:1px solid var(--border);padding-bottom:0">
    ${[
      ['pendientes',`⏳ Pendientes (${pendientes.length})`],
      ['en_curso',`📞 En seguimiento (${enCurso.length})`],
      ['cerradas',`🏆 Cerradas (${cerradas.length})`],
      ['perdidas',`❌ Perdidas (${perdidas.length})`],
    ].map(([k,lb])=>`<button onclick="document.getElementById('page-content').setAttribute('data-tab','${k}');renderEntrevistas()"
      style="padding:10px 16px;font-size:12px;font-weight:700;font-family:'DM Mono',monospace;border:none;border-bottom:2px solid ${tabActivo===k?'var(--accent)':'transparent'};background:transparent;color:${tabActivo===k?'var(--accent)':'var(--muted)'};cursor:pointer;transition:all 0.15s;border-radius:4px 4px 0 0;margin-bottom:-1px">${lb}</button>`
    ).join('')}
  </div>`;

  const estadoBadge=(e)=>{
    const map={cerrado:['🏆','rgba(200,168,74,0.15)','var(--accent)','Cerrado'],perdido:['❌','rgba(239,68,68,0.1)','#ef4444','Perdido'],no_apto:['🚫','rgba(100,100,100,0.1)','var(--muted)','No apto'],seguimiento:['📞','rgba(59,130,246,0.1)','#60a5fa','Seguimiento'],propuesta:['📄','rgba(16,185,129,0.1)','#34d399','Propuesta'],segunda_entrevista:['🎤','rgba(167,139,250,0.1)','#a78bfa','2da entrevista']};
    const d=map[e.estado]||['🎤','rgba(107,127,163,0.1)','var(--muted)','Sin resultado'];
    return`<span style="font-size:10px;background:${d[1]};color:${d[2]};padding:3px 10px;border-radius:10px;font-weight:700">${d[0]} ${d[3]}</span>`;
  };

  const renderCard=(e)=>{
    const diasDesde=e.fechaAgendada?Math.floor((new Date(hoy)-new Date(e.fechaAgendada))/(86400000)):0;
    const urgente=!e.fechaRealizada&&diasDesde>3;
    return`<div style="background:var(--surface);border:1px solid ${urgente?'rgba(239,68,68,0.3)':'var(--border)'};border-radius:12px;padding:16px 20px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px">
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700;margin-bottom:3px">${e.empresa}</div>
          <div style="font-size:11px;color:var(--muted)">
            Agendada ${fmtD(e.fechaAgendada)} · Vendedor: <strong style="color:var(--text)">${e.vendedor||'—'}</strong>
            ${e.entrevistador?` · Entrevistador: <strong style="color:var(--text)">${e.entrevistador}</strong>`:''}
            ${urgente?` · <span style="color:#ef4444;font-weight:600">hace ${diasDesde}d sin resultado</span>`:''}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          ${estadoBadge(e)}
          ${e.cerradoPor?`<span style="font-size:10px;color:var(--muted)">Cerrado por ${e.cerradoPor}</span>`:''}
        </div>
      </div>
      ${e.resultado?`<div style="font-size:12px;color:var(--muted);line-height:1.6;margin-bottom:8px;padding:10px 12px;background:var(--surface2);border-radius:8px">${e.resultado}</div>`:''}
      ${e.feedbackVendedor?`<div style="font-size:11px;color:var(--ok);margin-bottom:8px">💬 Para ${e.vendedor}: "${e.feedbackVendedor}"</div>`:''}
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="abrirResultadoEntrevista(${e.id})" style="background:var(--accent);border:none;color:#000;padding:7px 16px;border-radius:7px;cursor:pointer;font-size:12px;font-weight:700">${e.fechaRealizada?'✏️ Editar resultado':'+ Cargar resultado'}</button>
        ${e.comisionVendedor&&!e.auditoriaCreada?`<span style="font-size:11px;color:var(--accent);align-self:center">💰 Comisión para ${e.vendedor}</span>`:''}
        ${e.estado==='cerrado'&&!e.auditoriaCreada?`<button onclick="crearAuditoriaDesdeEntrevista(${e.id})" style="background:transparent;border:1px solid rgba(200,168,74,0.4);color:var(--accent);padding:7px 14px;border-radius:7px;cursor:pointer;font-size:12px">+ Crear auditoría</button>`:''}
      </div>
    </div>`;
  };

  const listas={pendientes,en_curso:enCurso,cerradas,perdidas};
  const lista=listas[tabActivo]||pendientes;

  el.innerHTML=`
    <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;margin-bottom:4px">Entrevistas Comerciales</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:20px">${todas.length} entrevistas en total · ${pend} sin resultado</div>
    ${tabBar}
    ${lista.length
      ? lista.sort((a,b)=>b.fechaAgendada?.localeCompare(a.fechaAgendada||'')||0).map(renderCard).join('')
      : `<div style="text-align:center;padding:48px;color:var(--muted)"><div style="font-size:40px;margin-bottom:12px">🎤</div><div>Sin entrevistas en esta categoría</div></div>`
    }`;
}

function crearAuditoriaDesdeEntrevista(entId){
  const ent=(S.get('crm_entrevistas')||[]).find(e=>e.id===entId);
  if(!ent){toast('❌ Entrevista no encontrada');return;}
  const clientes=S.get('clientes')||[];
  let cli=clientes.find(c=>c.nombre===ent.empresa);
  if(!cli){
    cli={id:S.nextId('clientes'),nombre:ent.empresa,contacto:ent.empresa,email:'',tel:'',pais:'Argentina',estado:'Activo',fechaCreacion:todayStr()};
    clientes.push(cli);S.set('clientes',clientes);
  }
  const auds=S.get('auditorias')||[];
  auds.push({id:S.nextId('auditorias'),clienteId:cli.id,clienteNombre:ent.empresa,vendedor:ent.vendedor,cerradoPor:currentUser?.nombre||'',estado:'Iniciada',tipo:'BPC Score',fechaInicio:todayStr(),entrevistaId:entId,diagnostico_ok:false});
  S.set('auditorias',auds);
  // Marcar entrevista como auditoria creada
  const ents=S.get('crm_entrevistas')||[];
  const i=ents.findIndex(e=>e.id===entId);
  if(i>-1){ents[i].auditoriaCreada=true;S.set('crm_entrevistas',ents);}
  toast('✅ Auditoría creada para '+ent.empresa);
  renderEntrevistas();
}

function renderReportes(){
  const auds=S.get('auditorias'),gastos=S.get('gastos'),vendedores=S.get('vendedores'),auditores=S.get('auditores'),cobros=S.get('cobros');
  let ing=0;cobros.forEach(c=>{c.cuotas.forEach(q=>{if(q.estado==='Pagada')ing+=(q.montoCobrado||q.monto);});});
  const gasT=gastos.reduce((s,g)=>s+(Number(g.monto)||0),0);
  const gan=ing-gasT;
  const porTipo={};auds.forEach(a=>{if(!porTipo[a.tipo])porTipo[a.tipo]={n:0,m:0};porTipo[a.tipo].n++;porTipo[a.tipo].m+=(Number(a.monto)||0);});
  const porCat={};gastos.forEach(g=>{if(!porCat[g.categoria])porCat[g.categoria]=0;porCat[g.categoria]+=(Number(g.monto)||0);});
  document.getElementById('reportes-content').innerHTML=`
    <div class="grid-3" style="margin-bottom:20px">
      <div class="stat-card" style="cursor:pointer" onclick="adminDetalle('cobrado')"><div class="stat-icon green">💰</div><div class="card-title">Ingresos</div><div style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:var(--accent3)">${fmt(ing)}</div></div>
      <div class="stat-card" style="cursor:pointer" onclick="adminDetalle('gastos')"><div class="stat-icon red">💸</div><div class="card-title">Gastos</div><div style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:var(--danger)">${fmt(gasT)}</div></div>
      <div class="stat-card" style="cursor:pointer;position:relative;overflow:hidden" onclick="adminBalanceClick()"><div class="stat-icon cyan">📊</div><div class="card-title">Ganancia Neta</div><div style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:${gan>=0?'var(--accent3)':'var(--danger)'}">${fmt(gan)}</div><div class="ganancia-frost" style="position:absolute;inset:0;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);background:rgba(17,24,39,0.7);display:${_adminBalanceUnlocked?'none':'flex'};flex-direction:column;align-items:center;justify-content:center;border-radius:inherit;z-index:2"><div style="font-size:20px;margin-bottom:4px">🔒</div><div style="font-size:10px;color:var(--muted)">PIN requerido</div></div></div>
    </div>
    <div class="grid-2">
      <div class="card"><div class="card-title" style="margin-bottom:14px">Ingresos por Servicio</div>${Object.keys(porTipo).length?Object.entries(porTipo).map(([k,v])=>`<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border)"><div><div style="font-size:13px">${k}</div><div style="font-size:11px;color:var(--muted)">${v.n} auditoría(s)</div></div><div style="color:var(--accent3);font-weight:600">${fmt(v.m)}</div></div>`).join(''):'<div style="color:var(--muted);font-size:12px;text-align:center;padding:20px">Sin datos</div>'}</div>
      <div class="card"><div class="card-title" style="margin-bottom:14px">Gastos por Categoría</div>${Object.keys(porCat).length?Object.entries(porCat).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border)"><div style="font-size:13px">${k}</div><div style="color:var(--danger);font-weight:600">${fmt(v)}</div></div>`).join(''):'<div style="color:var(--muted);font-size:12px;text-align:center;padding:20px">Sin gastos</div>'}</div>
    </div>
    <div class="table-wrap"><div class="table-header"><div class="table-title">Vendedores</div></div>
      ${vendedores.length?`<table><thead><tr><th>Vendedor</th><th>Auditorías</th><th>Sueldo Base</th><th>Comisiones</th><th>Total</th></tr></thead><tbody>${vendedores.map(v=>{const n=auds.filter(a=>a.vendedor===v.nombre).length;const c=n*(Number(v.comision)||300);const s=Number(v.sueldo)||0;return`<tr><td style="font-weight:500">${v.nombre}</td><td>${n}</td><td>${fmt(s)}</td><td style="color:var(--accent3)">${fmt(c)}</td><td style="font-weight:600;color:var(--warn)">${fmt(s+c)}</td></tr>`;}).join('')}</tbody></table>`:'<div style="padding:20px;color:var(--muted);font-size:12px;text-align:center">Sin vendedores</div>'}
    </div>
    <div class="table-wrap"><div class="table-header"><div class="table-title">Auditores</div></div>
      ${auditores.length?`<table><thead><tr><th>Auditor</th><th>Auditorías</th><th>Honorarios</th><th>Activas</th></tr></thead><tbody>${auditores.map(v=>{const mis=auds.filter(a=>a.auditor===v.nombre);const h=mis.length*(Number(v.honorarios)||300);return`<tr><td style="font-weight:500">${v.nombre}</td><td>${mis.length}</td><td style="color:var(--danger)">${fmt(h)}</td><td>${mis.filter(a=>a.estado!=='Completada').length}</td></tr>`;}).join('')}</tbody></table>`:'<div style="padding:20px;color:var(--muted);font-size:12px;text-align:center">Sin auditores</div>'}
    </div>`;
}

// MODAL HELPERS
function populateSel(selId,opts,empty){
  const sel=document.getElementById(selId);if(!sel)return;
  sel.innerHTML=`<option value="">${empty}</option>`+opts.map(o=>`<option value="${o.v}">${o.l}</option>`).join('');
}
function populateAuditoriaSel(selId){
  populateSel(selId,S.get('auditorias').map(a=>({v:a.clienteNombre,l:a.clienteNombre})),'General');
}
function populateRespSel(selId){
  const all=[...S.get('vendedores').map(v=>v.nombre),...S.get('auditores').map(a=>a.nombre)];
  populateSel(selId,all.map(n=>({v:n,l:n})),'N/A');
}

function openModal(id,mode){
  const _om=document.getElementById(id);if(!_om)return;_om.classList.add('open');
  if(mode==='new'){
    const m=document.getElementById(id);
    m.querySelectorAll('input:not([type=hidden]),textarea').forEach(el=>{if(el.type!=='password')el.value='';});
    m.querySelectorAll('select').forEach(el=>el.selectedIndex=0);
    m.querySelectorAll('input[type=date]').forEach(el=>el.value=todayStr());
    m.querySelectorAll('input[type=hidden]').forEach(el=>el.value='');
    if(id==='modal-auditoria'){
      populateSel('aud-cliente',S.get('clientes').map(c=>({v:c.id,l:c.nombre})),'Seleccionar cliente...');
      populateSel('aud-vendedor',S.get('vendedores').map(v=>({v:v.nombre,l:v.nombre})),'Sin asignar');
      populateSel('aud-auditor',S.get('auditores').map(v=>({v:v.nombre,l:v.nombre})),'Sin asignar');
      document.getElementById('aud-hint').style.display='none';
      document.getElementById('m-aud-title').textContent='Nueva Auditoría';
    }
    if(id==='modal-cotizacion'){
      populateSel('cot-cliente',S.get('clientes').map(c=>({v:c.nombre,l:c.nombre})),'Seleccionar...');
      const n=S.get('cotizaciones').length;document.getElementById('cot-numero').value='COT-'+String(n+1).padStart(3,'0');
    }
    if(id==='modal-gasto'){
      populateAuditoriaSel('gas-auditoria');
      const pagSel=document.getElementById('gas-pagadopor');
      pagSel.innerHTML='<option value="Empresa">Empresa (MetoGroup)</option>';
      S.get('auditores').forEach(a=>{pagSel.innerHTML+=`<option value="${a.nombre}">${a.nombre} (consultor)</option>`;});
      S.get('vendedores').forEach(v=>{pagSel.innerHTML+=`<option value="${v.nombre}">${v.nombre} (vendedor)</option>`;});
      document.getElementById('gas-estado-pago').value='Pagado';
      document.getElementById('gas-medio').value='Transferencia';
    }
    if(id==='modal-cobro'){
      const auds=S.get('auditorias');
      document.getElementById('cobro-auditoria').innerHTML='<option value="">Seleccionar...</option>'+auds.map(a=>`<option value="${a.id}">${a.clienteNombre}</option>`).join('');
      document.getElementById('cobro-cuotas-preview').innerHTML='<div style="color:var(--muted);font-size:12px;text-align:center;padding:16px">Completá los datos para ver las cuotas</div>';
      document.getElementById('m-cobro-title').textContent='Nuevo Cobro';
    }
    if(id==='modal-auditor')document.getElementById('audr-honorarios').value='300';
    if(id==='modal-cliente'){
      populateSel('cli-vendedor',S.get('vendedores').map(v=>({v:v.nombre,l:v.nombre})),'Seleccionar vendedor...');
      document.getElementById('m-cli-title').textContent='Nuevo Cliente';
    }
    if(id==='modal-usuario'){
      ['dueno','admin','consultor','vendedor','cliente'].forEach(r=>{const cb=document.getElementById('usu-rol-'+r);if(cb)cb.checked=false;});
      document.getElementById('usu-calendly').value='';
      document.getElementById('usu-calendly2').value='';
      const wrap=document.getElementById('usu-calendly-wrap');
      if(wrap) wrap.style.display='none';
      const cWrap=document.getElementById('usu-consultor-wrap');
      if(cWrap) cWrap.style.display='none';
      if(document.getElementById('usu-consultorId'))document.getElementById('usu-consultorId').value='';
      document.getElementById('m-usu-title').textContent='Nuevo Usuario';
    }
  }
}

function closeModal(id){const _cm=document.getElementById(id);if(_cm)_cm.classList.remove('open');}

document.querySelectorAll('.modal-overlay').forEach(m=>{
  m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open');});
});

function delItem(store,id,cb){
  if(!confirm('¿Confirmar eliminación?'))return;
  S.set(store,S.get(store).filter(x=>x.id!==id));
  // Supabase delete
  sbFetch(store,'DELETE',null,'?id=eq.'+id).catch(()=>{});
  cb?.();toast('🗑 Eliminado');
}

function eliminarCliente(clienteId){
  const cli = (S.get('clientes')||[]).find(c=>c.id===clienteId);
  if(!cli) return;
  const audsVinculadas = (S.get('auditorias')||[]).filter(a=>String(a.clienteId)===String(clienteId));
  const msg = audsVinculadas.length > 0
    ? `¿Eliminar a "${cli.nombre}" y sus ${audsVinculadas.length} auditoría${audsVinculadas.length!==1?'s':''} vinculada${audsVinculadas.length!==1?'s':''}? Esta acción no se puede deshacer.`
    : `¿Eliminar a "${cli.nombre}"? Esta acción no se puede deshacer.`;
  if(!confirm(msg)) return;

  // Eliminar auditorías vinculadas
  if(audsVinculadas.length > 0){
    const auds = (S.get('auditorias')||[]).filter(a=>String(a.clienteId)!==String(clienteId));
    S.set('auditorias', auds);
    audsVinculadas.forEach(a=>{
      sbFetch('auditorias','DELETE',null,'?id=eq.'+a.id).catch(()=>{});
    });
  }

  // Eliminar portal_clientes
  const pc = (S.get('portal_clientes')||[]).filter(p=>String(p.clienteId)!==String(clienteId));
  S.set('portal_clientes', pc);
  sbFetch('portal_clientes','DELETE',null,'?clienteId=eq.'+clienteId).catch(()=>{});

  // Eliminar diagnóstico del portal
  const pd = (S.get('portal_diagnostico')||[]).filter(d=>String(d.clienteId)!==String(clienteId));
  S.set('portal_diagnostico', pd);
  sbFetch('portal_diagnostico','DELETE',null,'?clienteId=eq.'+clienteId).catch(()=>{});

  // Eliminar cobros vinculados al cliente (por nombre — la tabla cobros usa campo 'cliente')
  const cobrosVinculados = (S.get('cobros')||[]).filter(c=>c.cliente===cli.nombre||String(c.clienteId)===String(clienteId));
  const cobros = (S.get('cobros')||[]).filter(c=>c.cliente!==cli.nombre&&String(c.clienteId)!==String(clienteId));
  S.set('cobros', cobros);
  cobrosVinculados.forEach(c=>sbFetch('cobros','DELETE',null,'?id=eq.'+c.id).catch(()=>{}));

  // Eliminar alertas de ventas pendientes vinculadas
  const ventasPend = (S.get('admin_ventas_pendientes')||[]).filter(v=>v.empresa!==cli.nombre&&String(v.clienteId)!==String(clienteId));
  S.set('admin_ventas_pendientes', ventasPend);

  // Limpiar logs CRM que mencionan esta empresa
  const crmLogs = (S.get('crm_logs')||[]).filter(l=>
    !(l.empresasAgendadas||'').includes(cli.nombre) || l.cerradas > 0
  );
  // No borramos los logs de actividad del vendedor — solo las notas de empresa específica
  // Limpiar entrevistas vinculadas
  const crmEnts = (S.get('crm_entrevistas')||[]).filter(e=>e.empresa!==cli.nombre);
  S.set('crm_entrevistas', crmEnts);

  // Eliminar el cliente
  S.set('clientes', (S.get('clientes')||[]).filter(c=>c.id!==clienteId));
  sbFetch('clientes','DELETE',null,'?id=eq.'+clienteId).catch(()=>{});

  toast('🗑 Cliente y datos vinculados eliminados');
  renderClientes();
  // Actualizar dashboard si está activo
  if(document.getElementById('page-dashboard')?.classList.contains('active')) renderDashboard();
}

function exportReport(){
  const auds=S.get('auditorias'),gastos=S.get('gastos');
  let csv='AUDITORÍAS\nEmpresa,Tipo,Vendedor,Auditor,Monto,Estado,F.Inicio,F.Doc,F.Externa,F.InSitu,F.Informe\n';
  csv+=auds.map(a=>`${a.clienteNombre},${a.tipo},${a.vendedor||''},${a.auditor||''},${a.monto},${a.estado},${a.fInicio||''},${a.fDoc||''},${a.fExterna||''},${a.fInsitu||''},${a.fInforme||''}`).join('\n');
  csv+='\n\nGASTOS\nConcepto,Categoría,Monto,Fecha\n';
  csv+=gastos.map(g=>`${g.concepto},${g.categoria},${g.monto},${g.fecha||''}`).join('\n');
  const b=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const l=document.createElement('a');l.href=URL.createObjectURL(b);l.download=`MetoGroup_${new Date().toISOString().split('T')[0]}.csv`;l.click();
  toast('✅ Reporte exportado');
}

function toast(msg){
  const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),2800);
}

// COBROS PAGE

// Helper: add months to a date string
function addMonths(dateStr, months){
  const d = new Date(dateStr+'T12:00:00');
  d.setMonth(d.getMonth()+months);
  return d.toISOString().split('T')[0];
}

// Auto-calc cuotas preview in modal
function calcCuotas(){
  const total = Number(document.getElementById('cobro-monto-total').value)||0;
  const n = Number(document.getElementById('cobro-ncuotas').value)||1;
  const fechaInicio = document.getElementById('cobro-fecha-inicio').value;
  const preview = document.getElementById('cobro-cuotas-preview');
  if(!total||!fechaInicio){ preview.innerHTML='<div style="color:var(--muted);font-size:12px;text-align:center;padding:16px">Completá monto y fecha para ver las cuotas</div>'; return; }
  const montoCuota = Math.round(total/n);
  const resto = total - (montoCuota*(n-1));
  let html='';
  for(let i=0;i<n;i++){
    const fecha = addMonths(fechaInicio, i);
    const monto = i===n-1 ? resto : montoCuota;
    html+=`<div style="display:flex;align-items:center;gap:14px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px 16px">
      <div style="width:28px;height:28px;border-radius:50%;background:rgba(212,175,55,0.15);border:1px solid rgba(212,175,55,0.3);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--accent);flex-shrink:0">${i+1}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600">Cuota ${i+1} de ${n}</div>
        <div style="font-size:11px;color:var(--muted)">Vence: ${fmtD(fecha)}</div>
      </div>
      <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:var(--accent3)">${fmt(monto)}</div>
    </div>`;
  }
  preview.innerHTML=html;
}

function saveCobro(){
  const id = document.getElementById('cobro-id').value;
  const total = Number(document.getElementById('cobro-monto-total').value)||0;
  const n = Number(document.getElementById('cobro-ncuotas').value)||1;
  const fechaInicio = document.getElementById('cobro-fecha-inicio').value;
  const audSel = document.getElementById('cobro-auditoria');
  const audNombre = audSel.options[audSel.selectedIndex]?.text||'';
  if(!total||!fechaInicio){toast('⚠️ Completá monto y fecha');return;}
  const montoCuota = Math.round(total/n);
  const resto = total-(montoCuota*(n-1));
  const cuotas = Array.from({length:n},(_,i)=>({
    numero:i+1,
    monto: i===n-1?resto:montoCuota,
    fechaVto: addMonths(fechaInicio,i),
    estado:'Pendiente',
    fechaPago:null,
    montoCobrado:null,
    notas:''
  }));
  const item={
    id:id?Number(id):S.nextId('cobros'),
    auditoriaId:document.getElementById('cobro-auditoria').value,
    auditoriaNombre:audNombre,
    concepto:document.getElementById('cobro-concepto').value||audNombre,
    montoTotal:total,
    nCuotas:n,
    forma:document.getElementById('cobro-forma').value,
    notas:document.getElementById('cobro-notas').value,
    contrato:document.getElementById('cobro-contrato')?.value||'',
    comprobante:document.getElementById('cobro-comprobante')?.value||'',
    cuotas,
    createdAt:id?undefined:todayStr()
  };
  if(id){
    // On edit keep existing payment status
    const existing = S.get('cobros').find(x=>x.id===Number(id));
    if(existing&&existing.cuotas){
      item.cuotas = cuotas.map((c,i)=>({...c,...( existing.cuotas[i]?{estado:existing.cuotas[i].estado,fechaPago:existing.cuotas[i].fechaPago,montoCobrado:existing.cuotas[i].montoCobrado,notas:existing.cuotas[i].notas}:{})}));
    }
    item.createdAt = existing?.createdAt;
  }
  const items=S.get('cobros');
  if(id){const i=items.findIndex(x=>x.id===Number(id));if(i>-1)items[i]=item;}else items.push(item);
  S.set('cobros',items);
  closeModal('modal-cobro');
  renderCobros();
  updateCobrosAlert();
  trackActivity('save:cobro');toast('✅ Cobro guardado');
}

function renderCobros(){
  const cobros = S.get('cobros');
  const el = document.getElementById('cobros-content');
  const today_ = todayStr();

  // Summary stats
  let totalEsperado=0, totalCobrado=0, totalPendiente=0, totalVencido=0;
  cobros.forEach(c=>{
    c.cuotas.forEach(q=>{
      totalEsperado+=q.monto;
      if(q.estado==='Pagada') totalCobrado+=q.montoCobrado||q.monto;
      else if(q.fechaVto<today_) totalVencido+=q.monto;
      else totalPendiente+=q.monto;
    });
  });

  if(!cobros.length){
    el.innerHTML=`<div class="empty-state"><div class="icon">💳</div><h3>Sin cobros registrados</h3><p>Agregá el primer cobro para empezar a trackear pagos</p></div>`;
    return;
  }

  // Alert banner for overdue
  const vencidas = cobros.flatMap(c=>c.cuotas.filter(q=>q.estado==='Pendiente'&&q.fechaVto<today_).map(q=>({...q,cobro:c})));
  const proximas = cobros.flatMap(c=>c.cuotas.filter(q=>q.estado==='Pendiente'&&q.fechaVto>=today_&&diffDays(q.fechaVto)<=7).map(q=>({...q,cobro:c})));

  let alertHtml='';
  if(vencidas.length){
    alertHtml+=`<div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:12px;padding:14px 18px;margin-bottom:16px">
      <div style="font-family:'Syne',sans-serif;font-weight:700;color:var(--danger);margin-bottom:8px">🔴 ${vencidas.length} cuota(s) VENCIDA(S) sin cobrar</div>
      ${vencidas.map(q=>`<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid rgba(239,68,68,0.2)">
        <span>${q.cobro.concepto} — Cuota ${q.numero}/${q.cobro.nCuotas}</span>
        <span style="color:var(--danger);font-weight:600">${fmt(q.monto)} · venció ${fmtD(q.fechaVto)}</span>
      </div>`).join('')}
    </div>`;
  }
  if(proximas.length){
    alertHtml+=`<div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:14px 18px;margin-bottom:16px">
      <div style="font-family:'Syne',sans-serif;font-weight:700;color:var(--warn);margin-bottom:8px">⚠️ ${proximas.length} cuota(s) vencen en los próximos 7 días</div>
      ${proximas.map(q=>`<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid rgba(245,158,11,0.2)">
        <span>${q.cobro.concepto} — Cuota ${q.numero}/${q.cobro.nCuotas}</span>
        <span style="color:var(--warn);font-weight:600">${fmt(q.monto)} · ${diffDays(q.fechaVto)===0?'¡HOY!':diffDays(q.fechaVto)===1?'Mañana':'En '+diffDays(q.fechaVto)+' días'}</span>
      </div>`).join('')}
    </div>`;
  }

  // Summary cards
  const summaryHtml=`<div class="grid-4" style="margin-bottom:20px">
    <div class="stat-card" style="cursor:pointer" onclick="dtDetalle('cobro_esperado')"><div class="stat-icon cyan">💰</div><div class="card-title">Total Esperado</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--text)">${fmt(totalEsperado)}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">→</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="dtDetalle('cobro_cobrado')"><div class="stat-icon green">✅</div><div class="card-title">Cobrado</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--accent3)">${fmt(totalCobrado)}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">→</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="dtDetalle('cobro_pendiente')"><div class="stat-icon orange">⏳</div><div class="card-title">Pendiente</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--warn)">${fmt(totalPendiente)}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">→</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="dtDetalle('cobro_vencido')"><div class="stat-icon red">🔴</div><div class="card-title">Vencido sin cobrar</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--danger)">${fmt(totalVencido)}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">→</div></div>
  </div>`;

  // Cobros list
  const cobrosHtml = cobros.map(c=>{
    const cobrado = c.cuotas.filter(q=>q.estado==='Pagada').reduce((s,q)=>s+(q.montoCobrado||q.monto),0);
    const pct = Math.round(cobrado/c.montoTotal*100);
    const cuotasHtml = c.cuotas.map((q,idx)=>{
      const isVencida = q.estado==='Pendiente'&&q.fechaVto<today_;
      const isProxima = q.estado==='Pendiente'&&diffDays(q.fechaVto)<=7&&diffDays(q.fechaVto)>=0;
      let estadoStyle='',estadoTxt=q.estado;
      if(q.estado==='Pagada'){estadoStyle='color:var(--accent3)';estadoTxt='✅ Pagada';}
      else if(isVencida){estadoStyle='color:var(--danger)';estadoTxt='🔴 Vencida';}
      else if(isProxima){estadoStyle='color:var(--warn)';estadoTxt='⚠️ Próxima';}
      return`<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="width:26px;height:26px;border-radius:50%;border:2px solid ${q.estado==='Pagada'?'var(--accent3)':isVencida?'var(--danger)':isProxima?'var(--warn)':'var(--border)'};background:${q.estado==='Pagada'?'rgba(200,168,74,0.15)':'var(--surface2)'};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;color:${q.estado==='Pagada'?'var(--accent3)':isVencida?'var(--danger)':'var(--muted)'}">${q.numero}</div>
        <div style="flex:1">
          <div style="font-size:12px;font-weight:600">Cuota ${q.numero} de ${c.nCuotas}</div>
          <div style="font-size:11px;color:var(--muted)">Vto: ${fmtD(q.fechaVto)}${q.fechaPago?` · Pagada: ${fmtD(q.fechaPago)}`:''}</div>
        </div>
        <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:700">${fmt(q.monto)}</div>
        <div style="font-size:11px;${estadoStyle};min-width:80px;text-align:right">${estadoTxt}</div>
        ${q.estado!=='Pagada'?`<button class="btn btn-success btn-sm" onclick="abrirPago(${c.id},${idx})" style="background:rgba(200,168,74,0.15);color:var(--accent3);border:1px solid rgba(200,168,74,0.3);white-space:nowrap">💵 Cobrar</button>`:`<button class="btn btn-secondary btn-sm" onclick="revertirPago(${c.id},${idx})" style="font-size:10px;opacity:0.7" title="Revertir este pago a pendiente">↩ Revertir</button>`}
      </div>`;
    }).join('');

    return`<div class="card" style="margin-bottom:16px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700">${c.concepto}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:3px">💳 ${c.forma} · ${c.nCuotas} cuota(s) · ${c.notas||''}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="text-align:right">
            <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:var(--accent3)">${fmt(cobrado)}<span style="font-size:12px;color:var(--muted);font-weight:400"> / ${fmt(c.montoTotal)}</span></div>
            <div style="font-size:11px;color:var(--muted)">${pct}% cobrado</div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="editCobro(${c.id})">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="delItem('cobros',${c.id},renderCobros)">🗑</button>
        </div>
      </div>
      <div style="height:6px;background:var(--surface2);border-radius:3px;margin-bottom:14px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--accent3),var(--accent));border-radius:3px;transition:width 0.5s"></div>
      </div>
      ${cuotasHtml}
    </div>`;
  }).join('');

  el.innerHTML = alertHtml + summaryHtml + cobrosHtml;
}

function abrirPago(cobroId, cuotaIdx){
  const cobro = S.get('cobros').find(x=>x.id===cobroId);
  if(!cobro)return;
  const cuota = cobro.cuotas[cuotaIdx];
  document.getElementById('pago-cobro-id').value=cobroId;
  document.getElementById('pago-cuota-idx').value=cuotaIdx;
  document.getElementById('pago-fecha').value=todayStr();
  document.getElementById('pago-monto').value=cuota.monto;
  document.getElementById('pago-notas').value='';
  document.getElementById('pago-info').innerHTML=`
    <div style="font-weight:600;margin-bottom:6px">${cobro.concepto}</div>
    <div style="display:flex;gap:16px;font-size:12px;color:var(--muted)">
      <span>Cuota ${cuota.numero} de ${cobro.nCuotas}</span>
      <span>Vto: ${fmtD(cuota.fechaVto)}</span>
      <span style="color:var(--accent3);font-weight:600">${fmt(cuota.monto)}</span>
    </div>`;
  const _mp=document.getElementById('modal-pago');if(_mp)_mp.classList.add('open');
}

function registrarPago(){
  const cobroId = Number(document.getElementById('pago-cobro-id').value);
  const idx = Number(document.getElementById('pago-cuota-idx').value);
  const fecha = document.getElementById('pago-fecha').value;
  const monto = Number(document.getElementById('pago-monto').value);
  const notas = document.getElementById('pago-notas').value;
  if(!fecha||!monto){toast('⚠️ Completá fecha y monto');return;}
  const cobros = S.get('cobros');
  const c = cobros.find(x=>x.id===cobroId);
  if(!c)return;
  c.cuotas[idx]={...c.cuotas[idx],estado:'Pagada',fechaPago:fecha,montoCobrado:monto,notas};
  S.set('cobros',cobros);
  closeModal('modal-pago');
  renderCobros();
  updateCobrosAlert();
  trackActivity('save:pago');toast('✅ Pago registrado');
}

function revertirPago(cobroId, cuotaIdx){
  if(!confirm('¿Revertir este pago? La cuota volverá a estado Pendiente.')) return;
  const cobros = S.get('cobros');
  const c = cobros.find(x=>x.id===cobroId);
  if(!c) return;
  c.cuotas[cuotaIdx] = {
    ...c.cuotas[cuotaIdx],
    estado: 'Pendiente',
    fechaPago: null,
    montoCobrado: null,
    notas: (c.cuotas[cuotaIdx].notas||'') + ' [Revertido ' + todayStr() + ']'
  };
  S.set('cobros', cobros);
  renderCobros();
  updateCobrosAlert();
  toast('↩ Pago revertido — cuota vuelve a Pendiente');
}

function editCobro(id){
  const c=S.get('cobros').find(x=>x.id===id);if(!c)return;
  openModal('modal-cobro','edit');
  document.getElementById('cobro-id').value=id;
  document.getElementById('cobro-monto-total').value=c.montoTotal;
  document.getElementById('cobro-ncuotas').value=c.nCuotas;
  document.getElementById('cobro-fecha-inicio').value=c.cuotas[0]?.fechaVto||todayStr();
  document.getElementById('cobro-forma').value=c.forma;
  document.getElementById('cobro-notas').value=c.notas||'';
  document.getElementById('cobro-concepto').value=c.concepto||'';
  if(document.getElementById('cobro-contrato'))document.getElementById('cobro-contrato').value=c.contrato||'';
  if(document.getElementById('cobro-comprobante'))document.getElementById('cobro-comprobante').value=c.comprobante||'';
  const auds=S.get('auditorias');
  document.getElementById('cobro-auditoria').innerHTML='<option value="">Seleccionar...</option>'+auds.map(a=>`<option value="${a.id}">${a.clienteNombre}</option>`).join('');
  document.getElementById('cobro-auditoria').value=c.auditoriaId||'';
  calcCuotas();
  document.getElementById('m-cobro-title').textContent='Editar Cobro';
}

function updateCobrosAlert(){
  const today_=todayStr();
  const cobros=S.get('cobros');
  const vencidas=cobros.flatMap(c=>c.cuotas.filter(q=>q.estado==='Pendiente'&&q.fechaVto<today_)).length;
  const badge=document.getElementById('cobros-badge');
  if(badge){badge.style.display=vencidas?'inline':'none';badge.textContent=vencidas;}
}
// END COBROS

// ============================================================
// CRM COMERCIAL
// ============================================================
let crmVendedorActivo = '';
let crmTabActivo = 'actividad'; // 'actividad' | 'pipeline' | 'basedatos'
let crmPeriodo = 'mes'; // dia | semana | mes

function openLogModal(vendedorNombre){
  openModal('modal-crm-log','new');
  const vends=S.get('vendedores');
  document.getElementById('log-vendedor').innerHTML='<option value="">Seleccionar...</option>'+vends.map(v=>`<option value="${v.nombre}">${v.nombre}</option>`).join('');
  if(vendedorNombre) document.getElementById('log-vendedor').value=vendedorNombre;
  const entSel=document.getElementById('log-entrevistador');
  if(entSel) entSel.value='';
}

function saveLog(){
  const id=document.getElementById('log-id').value;
  const entrevistador=(document.getElementById('log-entrevistador')?.value)||'';
  const item={
    id:id?Number(id):S.nextId('crm_logs'),
    vendedor:document.getElementById('log-vendedor').value,
    fecha:document.getElementById('log-fecha').value,
    llamadas:Number(document.getElementById('log-llamadas').value)||0,
    duenos:Number(document.getElementById('log-duenos').value)||0,
    agendadas:Number(document.getElementById('log-agendadas').value)||0,
    cerradas:Number(document.getElementById('log-cerradas').value)||0,
    empresasAgendadas:document.getElementById('log-empresas-agendadas').value,
    empresasSeguimiento:document.getElementById('log-empresas-seguimiento').value,
    notas:document.getElementById('log-notas').value,
    entrevistador,
  };
  if(!item.vendedor||!item.fecha){toast('⚠️ Completá vendedor y fecha');return;}
  const items=S.get('crm_logs');
  if(id){const i=items.findIndex(x=>x.id===Number(id));if(i>-1)items[i]=item;}else items.push(item);
  S.set('crm_logs',items);

  // Si hay entrevistador asignado y empresas agendadas → crear entrevistas pendientes
  if(entrevistador&&item.empresasAgendadas){
    const empresas=item.empresasAgendadas.split('\n').map(e=>e.trim()).filter(Boolean);
    const entrevistas=S.get('crm_entrevistas')||[];
    empresas.forEach(empresa=>{
      // Evitar duplicados: misma empresa + entrevistador + fecha
      const dup=entrevistas.find(e=>e.empresa===empresa&&e.entrevistador===entrevistador&&e.fechaAgendada===item.fecha&&!e.fechaRealizada);
      if(!dup){
        entrevistas.push({
          id:S.nextId('crm_entrevistas'),
          empresa,
          vendedor:item.vendedor,
          entrevistador,
          fechaAgendada:item.fecha,
          fechaRealizada:'',
          resultado:'',
          observaciones:'',
          interesado:'',
          proximoPaso:'',
          fechaCreacion:todayStr(),
        });
      }
    });
    S.set('crm_entrevistas',entrevistas);
  }

  closeModal('modal-crm-log');
  _refreshCRMContext();
  trackActivity('save:actividad');toast('✅ Actividad registrada');
}

function saveObjetivo(){
  const vendId=document.getElementById('obj-vendedor-id').value;
  const ym=document.getElementById('obj-mes').value;
  if(!ym){toast('⚠️ Seleccioná el mes');return;}
  const key=`${vendId}_${ym}`;
  const items=S.get('crm_objetivos');
  const existing=items.find(x=>x.key===key)||{};
  const item={
    ...existing,
    key,vendedorId:Number(vendId),ym,
    llamadas:Number(document.getElementById('obj-llamadas').value)||0,
    duenos:Number(document.getElementById('obj-duenos').value)||0,
    agendadas:Number(document.getElementById('obj-agendadas').value)||0,
    cerradas:Number(document.getElementById('obj-cerradas').value)||0,
    referidos:Number(document.getElementById('obj-referidos').value)||0,
  };
  const i=items.findIndex(x=>x.key===key);
  if(i>-1)items[i]=item;else items.push(item);
  S.set('crm_objetivos',items);
  toast('✅ Objetivos guardados para '+ym);
  objRefrescarLista(Number(vendId));
  objLimpiarForm();
  // Refrescar vistas para que se vean los objetivos inmediatamente
  try{renderVendedores();}catch(e){}
  try{renderCRM();}catch(e){}
}

function objLimpiarForm(){
  const sel=document.getElementById('obj-mes');
  const MN=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const hoy=new Date();
  sel.innerHTML='';
  for(let i=-1;i<6;i++){
    const d=new Date(hoy.getFullYear(),hoy.getMonth()+i,1);
    const v=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    const o=document.createElement('option');
    o.value=v;o.textContent=MN[d.getMonth()]+' '+d.getFullYear();
    sel.appendChild(o);
  }
  sel.value=todayStr().substring(0,7);
  ['obj-llamadas','obj-duenos','obj-agendadas','obj-cerradas','obj-referidos'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
}

function objCargarMes(vendId,ym){
  const key=`${vendId}_${ym}`;
  const obj=S.get('crm_objetivos').find(x=>x.key===key);
  const sel=document.getElementById('obj-mes');
  // Asegurar que la opción exista en el select
  if(sel&&!Array.from(sel.options).some(o=>o.value===ym)){
    const MN=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const[y,m]=ym.split('-');
    const o=document.createElement('option');o.value=ym;o.textContent=MN[parseInt(m)-1]+' '+y;
    sel.appendChild(o);
  }
  sel.value=ym;
  if(obj){
    document.getElementById('obj-llamadas').value=obj.llamadas||'';
    document.getElementById('obj-duenos').value=obj.duenos||'';
    document.getElementById('obj-agendadas').value=obj.agendadas||'';
    document.getElementById('obj-cerradas').value=obj.cerradas||'';
    document.getElementById('obj-referidos').value=obj.referidos||'';
  } else {
    ['obj-llamadas','obj-duenos','obj-agendadas','obj-cerradas','obj-referidos'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  }
  // scroll al formulario
  document.getElementById('obj-form-wrap').scrollIntoView({behavior:'smooth',block:'nearest'});
}

function objEliminarMes(vendId,ym){
  if(!confirm(`¿Eliminar objetivos de ${ym}?`))return;
  const items=S.get('crm_objetivos').filter(x=>x.key!==`${vendId}_${ym}`);
  S.set('crm_objetivos',items);
  objRefrescarLista(vendId);
  try{renderVendedores();}catch(e){}
  try{renderCRM();}catch(e){}
  toast('🗑 Objetivos eliminados');
}

function objRefrescarLista(vendId){
  const el=document.getElementById('obj-meses-lista');
  if(!el)return;
  const todos=S.get('crm_objetivos').filter(x=>String(x.vendedorId)===String(vendId)).sort((a,b)=>b.ym.localeCompare(a.ym));
  if(!todos.length){
    el.innerHTML=`<div style="font-size:12px;color:var(--muted);text-align:center;padding:14px;background:var(--surface2);border-radius:10px;margin-bottom:12px">Sin objetivos configurados aún.</div>`;
    return;
  }
  const MES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  el.innerHTML=`
    <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:8px">Meses configurados (${todos.length})</div>
    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px;max-height:220px;overflow-y:auto">
      ${todos.map(o=>{
        const [y,m]=o.ym.split('-');
        const mesNom=MES[parseInt(m)-1];
        return`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;min-width:100px">${mesNom} ${y}</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;flex:1;font-size:11px;color:var(--muted)">
            ${o.llamadas?`<span>📞 ${o.llamadas}</span>`:''}
            ${o.duenos?`<span>👤 ${o.duenos}</span>`:''}
            ${o.agendadas?`<span>📅 ${o.agendadas}</span>`:''}
            ${o.cerradas?`<span>🏆 ${o.cerradas}</span>`:''}
            ${o.referidos?`<span>🤝 ${o.referidos}</span>`:''}
          </div>
          <div style="display:flex;gap:6px">
            <button onclick="objCargarMes(${vendId},'${o.ym}')" style="background:rgba(212,175,55,0.1);border:1px solid rgba(212,175,55,0.25);border-radius:6px;padding:4px 10px;cursor:pointer;color:var(--accent);font-size:11px">✏️ Editar</button>
            <button onclick="objEliminarMes(${vendId},'${o.ym}')" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:6px;padding:4px 10px;cursor:pointer;color:var(--danger);font-size:11px">🗑</button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

function abrirObjetivos(vendId){
  const vend=S.get('vendedores').find(x=>x.id===vendId);
  document.getElementById('obj-vendedor-id').value=vendId;
  document.getElementById('m-obj-title').textContent=`🎯 Objetivos — ${vend?.nombre||''}`;
  objRefrescarLista(vendId);
  objLimpiarForm();
  const _mo=document.getElementById('modal-crm-obj');if(_mo)_mo.classList.add('open');
}

function saveSeguimiento(){
  const id=document.getElementById('seg-id').value;
  const item={
    id:id?Number(id):S.nextId('crm_seguimientos'),
    vendedor:document.getElementById('seg-vendedor').value,
    empresa:document.getElementById('seg-empresa').value,
    contacto:document.getElementById('seg-contacto').value,
    fecha:document.getElementById('seg-fecha').value,
    prioridad:document.getElementById('seg-prioridad').value,
    comision:Number(document.getElementById('seg-comision').value)||0,
    notas:document.getElementById('seg-notas').value,
    hecho:false,
  };
  if(!item.empresa||!item.fecha){toast('⚠️ Completá empresa y fecha');return;}
  const items=S.get('crm_seguimientos');
  if(id){const i=items.findIndex(x=>x.id===Number(id));if(i>-1)items[i]=item;}else items.push(item);
  S.set('crm_seguimientos',items);
  closeModal('modal-crm-seg');
  _refreshCRMContext();
  trackActivity('save:seguimiento');toast('✅ Seguimiento guardado');
}

function marcarSeguimientoHecho(id){
  const items=S.get('crm_seguimientos');
  const i=items.findIndex(x=>x.id===id);
  if(i>-1){items[i].hecho=true;items[i].fechaHecho=todayStr();}
  S.set('crm_seguimientos',items);
  toast('✅ Seguimiento completado');
  // Refresh whatever panel is open
  _refreshCRMContext();
}


function agendarEntrevistaDesdeSegVend(segId){
  const seg = (S.get('crm_seguimientos')||[]).find(x=>x.id===segId);
  if(!seg){ toast('⚠️ Seguimiento no encontrado'); return; }
  const entrevistadores = (S.get('usuarios')||[]).filter(u=>
    u.activo!==false && u.roles && (u.roles.includes('dueno')||u.roles.includes('gerente'))
  );
  const hoy = todayStr();
  const html = `
  <div class="modal-head">
    <div class="modal-title">🎤 Agendar entrevista — ${seg.empresa}</div>
    <button class="modal-close" onclick="closeModal('modal-agendar-ent')">✕</button>
  </div>
  <div class="modal-body">
    <div style="background:rgba(167,139,250,0.08);border:1px solid rgba(167,139,250,0.2);border-radius:8px;padding:12px 14px;font-size:12px;color:#a78bfa;margin-bottom:16px">
      📲 La entrevista quedará asignada al entrevistador seleccionado. Ellos definen el resultado.
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Fecha de la entrevista</label>
        <input type="date" id="aev-fecha" value="${hoy}">
      </div>
      <div class="form-group">
        <label>Entrevistador</label>
        <select id="aev-quien">
          ${entrevistadores.map(u=>`<option value="${u.nombre}">${u.nombre}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Notas para el entrevistador (opcional)</label>
      <input type="text" id="aev-notas" placeholder="Ej: muy interesado en precio, hablar de plazos...">
    </div>
  </div>
  <div class="modal-footer">
    <button class="btn btn-secondary" onclick="closeModal('modal-agendar-ent')">Cancelar</button>
    <button class="btn btn-primary" onclick="_guardarEntrevistaDesdeVend(${segId})">🎤 Agendar</button>
  </div>`;
  showModal('modal-agendar-ent', html);
}

function _guardarEntrevistaDesdeVend(segId){
  const seg = (S.get('crm_seguimientos')||[]).find(x=>x.id===segId);
  if(!seg){ toast('⚠️ No encontrado'); return; }
  const fecha = document.getElementById('aev-fecha').value;
  const quien = document.getElementById('aev-quien').value;
  const notas = document.getElementById('aev-notas').value;
  if(!fecha||!quien){ toast('⚠️ Completá fecha y entrevistador'); return; }
  // Crear entrevista
  const ents = S.get('crm_entrevistas')||[];
  ents.push({
    id: S.nextId('crm_entrevistas'),
    empresa: seg.empresa,
    vendedor: currentUser.nombre,
    entrevistador: quien,
    fechaAgendada: fecha,
    fechaRealizada: '',
    resultado: '',
    observaciones: notas || seg.notas || '',
    interesado: 'Interesado',
    proximoPaso: '',
    fechaCreacion: todayStr(),
    estado: 'pendiente',
    feedbackVendedor: '',
    cerradoPor: '',
    comisionVendedor: false,
    auditoriaCreada: false,
  });
  S.set('crm_entrevistas', ents);
  // Log del vendedor
  const logs = S.get('crm_logs');
  const today_ = todayStr();
  let log = logs.find(l=>l.vendedor===currentUser.nombre&&l.fecha===today_);
  if(!log){log={id:S.nextId('crm_logs'),vendedor:currentUser.nombre,fecha:today_,llamadas:0,duenos:0,agendadas:0,cerradas:0,notas:'',empresasAgendadas:''};logs.push(log);}
  log.agendadas = (log.agendadas||0)+1;
  log.notas = (log.notas?log.notas+'; ':'')+'Entrevista agendada con '+quien+': '+seg.empresa;
  S.set('crm_logs', logs);
  closeModal('modal-agendar-ent');
  toast('🎤 Entrevista agendada con '+quien+' para el '+fmtD(fecha));
  renderMisVentas();
}

function convertirSeguimientoEnVenta(segId){
  const seg=S.get('crm_seguimientos').find(x=>x.id===segId);
  if(!seg){toast('⚠️ Seguimiento no encontrado');return;}
  const clientes=S.get('clientes');
  const vendedores=S.get('vendedores');
  const clienteMatch=clientes.find(c=>c.nombre.toLowerCase().includes(seg.empresa.toLowerCase())||seg.empresa.toLowerCase().includes(c.nombre.toLowerCase()));
  const html=`
  <div class="modal-head" style="background:linear-gradient(135deg,rgba(200,168,74,0.12),rgba(212,175,55,0.06))">
    <div class="modal-title" style="color:var(--accent3)">🏆 Registrar Venta</div>
    <button class="modal-close" onclick="closeModal('modal-seg-venta')">✕</button>
  </div>
  <div class="modal-body">
    <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:10px;padding:12px 16px;margin-bottom:18px;font-size:12px;color:#f59e0b">
      🔔 Se enviará una alerta a <strong>Administración</strong> para completar la ficha del cliente, subir contrato y asignar auditor y fecha de auditoría.
    </div>
    <input type="hidden" id="sv-seg-id" value="${segId}">

    <div class="form-section">🏢 Cliente</div>
    <div style="display:flex;gap:8px;margin-bottom:12px">
      <button id="sv-tab-existente" onclick="svToggleCliente('existente')" class="btn btn-sm" style="${clienteMatch?'background:rgba(212,175,55,0.1);border:1px solid rgba(212,175,55,0.3);color:var(--accent);font-weight:700':'background:var(--surface2);border:1px solid var(--border);color:var(--muted)'}">Existente</button>
      <button id="sv-tab-nuevo" onclick="svToggleCliente('nuevo')" class="btn btn-sm" style="${!clienteMatch?'background:rgba(200,168,74,0.1);border:1px solid rgba(200,168,74,0.3);color:var(--accent3);font-weight:700':'background:var(--surface2);border:1px solid var(--border);color:var(--muted)'}">+ Nuevo</button>
    </div>
    <input type="hidden" id="sv-cliente-modo" value="${clienteMatch?'existente':'nuevo'}">
    <div id="sv-cli-exist" style="${clienteMatch?'':'display:none'}">
      <div class="form-group">
        <select id="sv-cliente">
          <option value="">Seleccionar cliente...</option>
          ${clientes.map(c=>`<option value="${c.id}" ${clienteMatch&&clienteMatch.id===c.id?'selected':''}>${c.nombre}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="sv-cli-nuevo" style="${clienteMatch?'display:none':''}">
      <div class="form-row">
        <div class="form-group"><label>Empresa *</label><input id="sv-cli-nombre" value="${seg.empresa||''}" placeholder="Razón social"></div>
        <div class="form-group"><label>CUIT/RFC</label><input id="sv-cli-cuit" placeholder="XX-XXXXXXXX-X"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Contacto</label><input id="sv-cli-contacto" value="${seg.contacto||''}" placeholder="Nombre"></div>
        <div class="form-group"><label>Email</label><input id="sv-cli-email" type="email" placeholder="email@empresa.com"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Teléfono</label><input id="sv-cli-tel" placeholder="+54 11 XXXX-XXXX"></div>
        <div class="form-group"><label>Rubro</label><input id="sv-cli-rubro" placeholder="Industria..."></div>
      </div>
    </div>

    <div class="form-section">📦 Servicio</div>
    <div class="form-row">
      <div class="form-group">
        <label>Tipo de Servicio *</label>
        <select id="sv-tipo">
          <option value="Auditoría Internacional">🔍 Auditoría Internacional</option>
          <option value="Adaptación IA BPCE">🤖 Adaptación IA BPCE</option>
          <option value="Implementación ISO 72001">⚙️ Implementación ISO 72001</option>
        </select>
      </div>
      <div class="form-group">
        <label>💰 Monto ($)</label>
        <input id="sv-monto" type="number" min="0" placeholder="0" value="${seg.comision||''}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>🧑‍💼 Vendedor</label>
        <select id="sv-vendedor">
          ${vendedores.map(v=>`<option value="${v.nombre}" ${v.nombre===seg.vendedor?'selected':''}>${v.nombre}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>📝 Notas para Administración</label>
      <textarea id="sv-notas" placeholder="Cualquier detalle que admin necesite saber...">${seg.notas||''}</textarea>
    </div>
  </div>
  <div class="modal-footer">
    <button class="btn btn-secondary" onclick="closeModal('modal-seg-venta')">Cancelar</button>
    <button class="btn" onclick="confirmarConversionVenta()" style="background:linear-gradient(135deg,var(--accent3),#34d399);border:none;color:#fff;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;padding:9px 18px;border-radius:8px;cursor:pointer">🏆 Registrar Venta</button>
  </div>`;
  let modal=document.getElementById('modal-seg-venta');
  if(!modal){
    modal=document.createElement('div');
    modal.className='modal-overlay';
    modal.id='modal-seg-venta';
    modal.innerHTML='<div class="modal modal-lg">'+html+'</div>';
    document.body.appendChild(modal);
  } else {
    modal.querySelector('.modal').innerHTML=html;
  }
  modal.classList.add('open');
}

function svToggleCliente(modo){
  document.getElementById('sv-cliente-modo').value=modo;
  document.getElementById('sv-cli-exist').style.display=modo==='existente'?'':'none';
  document.getElementById('sv-cli-nuevo').style.display=modo==='nuevo'?'':'none';
  const bE=document.getElementById('sv-tab-existente'),bN=document.getElementById('sv-tab-nuevo');
  if(modo==='existente'){
    bE.style.cssText='background:rgba(212,175,55,0.1);border:1px solid rgba(212,175,55,0.3);color:var(--accent);font-weight:700;padding:5px 9px;font-size:11px;border-radius:8px;cursor:pointer;font-family:"DM Mono",monospace';
    bN.style.cssText='background:var(--surface2);border:1px solid var(--border);color:var(--muted);padding:5px 9px;font-size:11px;border-radius:8px;cursor:pointer;font-family:"DM Mono",monospace';
  } else {
    bN.style.cssText='background:rgba(200,168,74,0.1);border:1px solid rgba(200,168,74,0.3);color:var(--accent3);font-weight:700;padding:5px 9px;font-size:11px;border-radius:8px;cursor:pointer;font-family:"DM Mono",monospace';
    bE.style.cssText='background:var(--surface2);border:1px solid var(--border);color:var(--muted);padding:5px 9px;font-size:11px;border-radius:8px;cursor:pointer;font-family:"DM Mono",monospace';
  }
}

function confirmarConversionVenta(){
  const segId=Number(document.getElementById('sv-seg-id').value);
  const tipo=document.getElementById('sv-tipo').value;
  const monto=document.getElementById('sv-monto').value;
  const vendNombre=document.getElementById('sv-vendedor').value;
  const today_=todayStr();
  const modo=document.getElementById('sv-cliente-modo').value;
  let empresa='',contacto='',email='',tel='',cuit='',rubro='';

  if(modo==='existente'){
    const clienteSel=document.getElementById('sv-cliente');
    if(!clienteSel.value||clienteSel.selectedIndex===0){toast('⚠️ Seleccioná un cliente');return;}
    empresa=clienteSel.options[clienteSel.selectedIndex]?.text||'';
  } else {
    empresa=(document.getElementById('sv-cli-nombre')?.value||'').trim();
    if(!empresa){toast('⚠️ Ingresá el nombre de la empresa');return;}
    contacto=(document.getElementById('sv-cli-contacto')?.value||'').trim();
    email=(document.getElementById('sv-cli-email')?.value||'').trim();
    tel=(document.getElementById('sv-cli-tel')?.value||'').trim();
    cuit=(document.getElementById('sv-cli-cuit')?.value||'').trim();
    rubro=(document.getElementById('sv-cli-rubro')?.value||'').trim();
  }

  // Crear alerta de venta pendiente para administración
  const alertas=S.get('admin_ventas_pendientes')||[];
  alertas.push({
    id:Date.now(),
    fecha:today_,
    vendedor:vendNombre,
    empresa,contacto,email,tel,cuit,rubro,
    tipo,monto,
    notas:document.getElementById('sv-notas').value||'',
    estado:'pendiente', // pendiente | procesada
    segId,
    clienteExistente:modo==='existente'?document.getElementById('sv-cliente').value:null,
  });
  S.set('admin_ventas_pendientes',alertas);

  // Marcar seguimiento como hecho y cierre
  const segs=S.get('crm_seguimientos');
  const si=segs.findIndex(x=>x.id===segId);
  if(si>-1){segs[si].hecho=true;segs[si].fechaHecho=today_;segs[si].convertidaEnVenta=true;}
  S.set('crm_seguimientos',segs);

  const logs=S.get('crm_logs');
  const existingLog=logs.find(l=>l.vendedor===vendNombre&&l.fecha===today_);
  if(existingLog){
    existingLog.cerradas=(existingLog.cerradas||0)+1;
  } else {
    logs.push({id:S.nextId('crm_logs'),vendedor:vendNombre,fecha:today_,llamadas:0,duenos:0,agendadas:0,cerradas:1,notas:'Venta: '+empresa,empresasAgendadas:''});
  }
  S.set('crm_logs',logs);

  closeModal('modal-seg-venta');
  _refreshCRMContext();
  trackActivity('save:venta');toast('🏆 ¡Venta registrada! Se envió alerta a Administración para procesar');
}

function _refreshCRMContext(){
  renderCRM();
  // If a vendor panel is open, re-render it
  const openPanel=document.querySelector('.crm-full-panel');
  if(openPanel){
    const bodyEl=openPanel.querySelector('[id^="crm-vend-body-"]');
    if(bodyEl){
      const vendId=Number(bodyEl.id.replace('crm-vend-body-',''));
      const vend=S.get('vendedores').find(x=>x.id===vendId);
      if(vend){
        const activeTab=openPanel.querySelector('.crm-tab.active');
        const periodo=activeTab?activeTab.textContent==='Hoy'?'dia':activeTab.textContent==='Semana'?'semana':'mes':'mes';
        renderCRMVendedorPanel(vendId,vend,periodo);
      }
    }
  }
}

function abrirSeguimiento(vendedorNombre, empresaNombre){
  openModal('modal-crm-seg','new');
  document.getElementById('seg-vendedor').value=vendedorNombre||'';
  if(empresaNombre){
    setTimeout(()=>{
      const empInput=document.getElementById('seg-empresa');
      if(empInput){
        empInput.value=empresaNombre;
        // Disparar chequeo de historial
        segCheckHistorial(empresaNombre);
      }
    },150);
  }
}

// Chequeo de historial al tipear empresa en el modal de seguimiento
function segCheckHistorial(val){
  const warn=document.getElementById('seg-historial-warn');
  if(!warn||!val||val.length<3)return warn&&(warn.style.display='none');
  const act=crmUltimaActividadEmpresa(val);
  if(act){
    const dias=Math.floor((new Date()-new Date(act.fecha+'T12:00:00'))/(1000*60*60*24));
    const diasStr=dias===0?'<strong style="color:var(--danger)">HOY</strong>':dias===1?'<strong style="color:var(--danger)">ayer</strong>':`hace <strong>${dias} días</strong>`;
    const urgente=dias<=14;
    warn.style.display='block';
    warn.style.borderColor=urgente?'rgba(239,68,68,0.4)':'rgba(212,175,55,0.3)';
    warn.style.background=urgente?'rgba(239,68,68,0.07)':'rgba(212,175,55,0.05)';
    warn.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
      <div>${urgente?'🔴':'📅'} Último contacto con <strong>${val}</strong>: ${fmtD(act.fecha)} (${diasStr}) — por <strong>${act.vendedor}</strong></div>
      <button onclick="crmHistorialEmpresa('${val.replace(/'/g,"\\'")}');event.stopPropagation()" class="btn btn-secondary btn-sm" style="font-size:10px;flex-shrink:0">🔍 Ver historial</button>
    </div>`;
  } else {
    warn.style.display='none';
  }
}

// Get CRM metrics for a vendedor over a period
function getCRMStats(vendedorNombre, periodo){
  const today_=new Date();
  const logs=S.get('crm_logs').filter(l=>{
    if(l.vendedor!==vendedorNombre)return false;
    const d=new Date(l.fecha+'T12:00:00');
    if(periodo==='dia'){return l.fecha===todayStr();}
    if(periodo==='semana'){const diff=(today_-d)/86400000;return diff>=0&&diff<7;}
    if(periodo==='mes'){return l.fecha.substring(0,7)===todayStr().substring(0,7);}
    return true;
  });
  return {
    llamadas:logs.reduce((s,l)=>s+(l.llamadas||0),0),
    duenos:logs.reduce((s,l)=>s+(l.duenos||0),0),
    agendadas:logs.reduce((s,l)=>s+(l.agendadas||0),0),
    cerradas:logs.reduce((s,l)=>s+(l.cerradas||0),0),
    logs,
  };
}

function convRate(cerradas,llamadas){
  if(!llamadas)return 0;
  return Math.round(cerradas/llamadas*100);
}

function ringHTML(pct,color,label,sublabel){
  const r=36,circ=2*Math.PI*r;
  const dash=Math.min(pct/100,1)*circ;
  return`<div style="display:flex;flex-direction:column;align-items:center;gap:6px">
    <div style="position:relative;width:90px;height:90px">
      <svg width="90" height="90" viewBox="0 0 90 90" style="transform:rotate(-90deg)">
        <circle cx="45" cy="45" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8"/>
        <circle cx="45" cy="45" r="${r}" fill="none" stroke="${color}" stroke-width="8"
          stroke-dasharray="${dash.toFixed(1)} ${circ.toFixed(1)}" stroke-linecap="round"/>
      </svg>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
        <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:${color}">${pct}%</div>
      </div>
    </div>
    <div style="text-align:center"><div style="font-size:11px;font-weight:600">${label}</div><div style="font-size:10px;color:var(--muted)">${sublabel}</div></div>
  </div>`;
}

// ── DRILL-DOWN: Cards clickeables en CRM Supervisor ──
function crmSuperDrill(tipo,ym){
  const allVends=S.get('vendedores').filter(v=>v.activo!==false);
  const allLogs=S.get('crm_logs');
  const field=tipo==='conversion'?null:tipo;
  const rows=allVends.map(v=>{
    const logs=allLogs.filter(l=>l.vendedor===v.nombre&&l.fecha.startsWith(ym));
    const ll=logs.reduce((s,l)=>s+(l.llamadas||0),0);
    const du=logs.reduce((s,l)=>s+(l.duenos||0),0);
    const ag=logs.reduce((s,l)=>s+(l.agendadas||0),0);
    const ci=logs.reduce((s,l)=>s+(l.cerradas||0),0);
    const conv=ll>0?Math.round(ci/ll*100):0;
    const val=tipo==='conversion'?conv:logs.reduce((s,l)=>s+(l[field]||0),0);
    // Detalle diario
    const dias=logs.map(l=>({fecha:l.fecha,val:tipo==='conversion'?((l.llamadas||0)>0?Math.round((l.cerradas||0)/(l.llamadas||0)*100):0):(l[field]||0)}));
    return{nombre:v.nombre,val,dias,ll,du,ag,ci,conv};
  }).sort((a,b)=>b.val-a.val);
  const titulos={llamadas:'📞 Llamadas por Vendedor',duenos:'👤 Dueños por Vendedor',cerradas:'🏆 Cierres por Vendedor',conversion:'📊 Conversión por Vendedor'};
  const sufijo=tipo==='conversion'?'%':'';
  const max=Math.max(...rows.map(r=>r.val),1);
  const html=`<div class="modal-head"><div class="modal-title">${titulos[tipo]||tipo}</div><button class="modal-close" onclick="closeModal('modal-drill')">✕</button></div>
    <div class="modal-body" style="max-height:70vh;overflow-y:auto">
      ${rows.map((r,i)=>{
        const pct=Math.round(r.val/max*100);
        const medal=i===0&&r.val>0?'🥇':i===1&&r.val>0?'🥈':i===2&&r.val>0?'🥉':'#'+(i+1);
        return`<div style="padding:14px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
            <span style="font-size:16px;width:28px;text-align:center">${medal}</span>
            <span style="font-size:14px;font-weight:600;flex:1">${r.nombre}</span>
            <span style="font-family:'DM Mono',monospace;font-size:18px;font-weight:800">${r.val}${sufijo}</span>
          </div>
          <div style="margin-left:40px;height:6px;background:var(--surface2);border-radius:3px;overflow:hidden;margin-bottom:8px">
            <div style="height:100%;width:${pct}%;background:var(--accent);border-radius:3px"></div>
          </div>
          <div style="margin-left:40px;display:flex;gap:14px;font-size:11px;color:var(--muted)">
            <span>📞 ${r.ll}</span><span>👤 ${r.du}</span><span>📅 ${r.ag}</span><span>🏆 ${r.ci}</span><span>📊 ${r.conv}%</span>
          </div>
          ${r.dias.length?`<div style="margin-left:40px;margin-top:6px;display:flex;gap:3px;align-items:end;height:30px">
            ${r.dias.slice(-15).map(d=>{const h=Math.max(2,Math.round(d.val/(Math.max(...r.dias.map(x=>x.val),1))*28));return`<div title="${d.fecha}: ${d.val}${sufijo}" style="width:8px;height:${h}px;background:var(--accent);border-radius:2px;opacity:0.6"></div>`;}).join('')}
          </div>`:''}
        </div>`;
      }).join('')}
    </div>`;
  openGenericModal('modal-drill',html);
}

// ── DRILL-DOWN: Cards clickeables en panel vendedor (vista dueño) ──
function vdOwnerDrill(tipo,nombre,ym){
  const allLogs=S.get('crm_logs').filter(l=>l.vendedor===nombre&&l.fecha.startsWith(ym)).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  if(tipo==='comisiones'){
    const auds=S.get('auditorias').filter(a=>a.vendedor===nombre&&a.estado==='Completada');
    const vend=S.get('vendedores').find(v=>v.nombre===nombre)||{};
    const comUnit=Number(vend.comision)||300;
    const html=`<div class="modal-head"><div class="modal-title">💰 Comisiones — ${nombre}</div><button class="modal-close" onclick="closeModal('modal-drill')">✕</button></div>
      <div class="modal-body" style="max-height:70vh;overflow-y:auto">
        <div style="text-align:center;margin-bottom:20px">
          <div style="font-family:'Syne',sans-serif;font-size:36px;font-weight:800;color:var(--accent3)">${fmt(auds.length*comUnit)}</div>
          <div style="font-size:12px;color:var(--muted)">${auds.length} auditorías completadas × ${fmt(comUnit)} c/u</div>
        </div>
        ${auds.length?auds.map(a=>`<div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between">
          <div><div style="font-size:13px;font-weight:600">${a.clienteNombre||'Cliente'}</div><div style="font-size:11px;color:var(--muted)">${a.tipo||''} · ${a.fInforme||''}</div></div>
          <div style="font-family:'DM Mono',monospace;font-weight:700;color:var(--accent3)">${fmt(comUnit)}</div>
        </div>`).join(''):'<div style="text-align:center;color:var(--muted);padding:20px">Sin auditorías completadas</div>'}
      </div>`;
    openGenericModal('modal-drill',html);return;
  }
  const field=tipo;
  const total=allLogs.reduce((s,l)=>s+(l[field]||0),0);
  const titulos={llamadas:'📞 Llamadas',duenos:'👤 Dueños contactados',agendadas:'📅 Entrevistas agendadas',cerradas:'🏆 Cierres'};
  const maxDay=Math.max(...allLogs.map(l=>l[field]||0),1);
  const html=`<div class="modal-head"><div class="modal-title">${titulos[tipo]||tipo} — ${nombre}</div><button class="modal-close" onclick="closeModal('modal-drill')">✕</button></div>
    <div class="modal-body" style="max-height:70vh;overflow-y:auto">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-family:'Syne',sans-serif;font-size:42px;font-weight:800;color:var(--accent)">${total}</div>
        <div style="font-size:12px;color:var(--muted)">total este mes · ${allLogs.length} días registrados</div>
      </div>
      <div style="display:flex;gap:3px;align-items:end;height:60px;margin-bottom:20px;padding:0 10px">
        ${allLogs.slice().reverse().map(l=>{const v=l[field]||0;const h=Math.max(2,Math.round(v/maxDay*56));return`<div title="${l.fecha}: ${v}" style="flex:1;max-width:20px;height:${h}px;background:var(--accent);border-radius:3px 3px 0 0;opacity:${v>0?0.8:0.2}"></div>`;}).join('')}
      </div>
      ${allLogs.map(l=>{const v=l[field]||0;if(!v)return'';return`<div style="padding:8px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-size:12px;font-weight:600">${fmtD(l.fecha)}</div>${l.notas?`<div style="font-size:10px;color:var(--muted);margin-top:2px">${l.notas.substring(0,60)}</div>`:''}</div>
        <div style="font-family:'DM Mono',monospace;font-size:16px;font-weight:800">${v}</div>
      </div>`;}).join('')}
    </div>`;
  openGenericModal('modal-drill',html);
}

// Helper: abrir modal genérico
function openGenericModal(id,html){
  let m=document.getElementById(id);
  if(!m){m=document.createElement('div');m.id=id;m.className='modal-overlay';m.onclick=e=>{if(e.target===m)m.classList.remove('open');};m.innerHTML='<div class="modal"></div>';document.body.appendChild(m);}
  m.querySelector('.modal').innerHTML=html;
  m.classList.add('open');
}

function abrirCRMVendedor(vendId){
  const vend=S.get('vendedores').find(x=>x.id===vendId);
  if(!vend)return;
  // Remove existing if open
  document.querySelectorAll('.crm-full-panel').forEach(e=>e.remove());
  const isDueno=currentUser?.rol==='dueno'||currentUser?.rol==='admin';
  const ov=document.createElement('div');
  ov.className='modal-overlay open crm-full-panel';
  ov.style.cssText='z-index:2000;align-items:flex-start;padding:0;overflow-y:auto;background:var(--bg);';
  ov.innerHTML=`
  <div style="width:100%;min-height:100vh;max-width:1100px;margin:0 auto;padding:20px 16px 40px;">
    <!-- STICKY HEADER -->
    <div style="position:sticky;top:0;z-index:100;background:var(--bg);padding:14px 0 12px;margin-bottom:20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
      <div style="display:flex;align-items:center;gap:14px">
        <button onclick="this.closest('.crm-full-panel').remove()" style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;width:38px;height:38px;cursor:pointer;font-size:18px;color:var(--text);display:flex;align-items:center;justify-content:center">←</button>
        <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--accent2),var(--accent));display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;color:#fff">${vend.nombre.substring(0,2).toUpperCase()}</div>
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800">${vend.nombre}</div>
          <div style="font-size:11px;color:var(--muted)">Panel CRM Comercial</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${isDueno?`<button class="btn btn-sm" onclick="verDashboardVendedor(${vendId})" style="background:linear-gradient(135deg,rgba(184,146,46,0.2),rgba(212,175,55,0.1));border:1px solid rgba(184,146,46,0.4);color:#c8a84a;font-weight:700">👁️ Ver su Dashboard</button>
        <button class="btn btn-sm" onclick="verBasesDatosVendedor(${vendId},'${vend.nombre}')" style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);color:#f59e0b;font-weight:700">🗄️ Su Base de Datos</button>`:''}
        <button class="btn btn-secondary btn-sm" onclick="abrirObjetivos(${vendId})">🎯 Objetivos</button>
        <button class="btn btn-secondary btn-sm" onclick="abrirNotasVendedor(${vendId},'${vend.nombre}')">📌 Notas</button>
        <button class="btn btn-secondary btn-sm" onclick="abrirSeguimiento('${vend.nombre}')">+ Seguimiento</button>
        <button class="btn btn-primary btn-sm" onclick="openLogModal('${vend.nombre}')">+ Registrar Actividad</button>
      </div>
    </div>
    <div id="crm-vend-body-${vendId}"></div>
  </div>`;
  document.body.appendChild(ov);
  renderCRMVendedorPanel(vendId, vend, 'mes');
}

// Dueño: Ver dashboard del vendedor como si fuera el vendedor
function verDashboardVendedor(vendId){
  const vend=S.get('vendedores').find(x=>x.id===vendId);
  if(!vend)return;
  document.querySelectorAll('.crm-full-panel').forEach(e=>e.remove());
  // Temporarily render the vendedor's personal dashboard
  const ov=document.createElement('div');
  ov.className='modal-overlay open crm-full-panel';
  ov.style.cssText='z-index:2000;align-items:flex-start;padding:0;overflow-y:auto;background:var(--bg);';
  ov.innerHTML=`
  <div style="width:100%;min-height:100vh;max-width:1200px;margin:0 auto;padding:20px 16px 40px;">
    <div style="position:sticky;top:0;z-index:100;background:var(--bg);padding:14px 0 12px;margin-bottom:20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
      <div style="display:flex;align-items:center;gap:14px">
        <button onclick="this.closest('.crm-full-panel').remove()" style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;width:38px;height:38px;cursor:pointer;font-size:18px;color:var(--text);display:flex;align-items:center;justify-content:center">←</button>
        <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--accent2),var(--accent));display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;color:#fff">${vend.nombre.substring(0,2).toUpperCase()}</div>
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800">Dashboard de ${vend.nombre}</div>
          <div style="font-size:11px;color:var(--muted)">Vista completa como vendedor · <span style="color:var(--warn)">solo lectura visual</span></div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" onclick="this.closest('.crm-full-panel').remove();abrirCRMVendedor(${vendId})">📊 Volver al Panel CRM</button>
        <button class="btn btn-secondary btn-sm" onclick="abrirObjetivos(${vendId})">🎯 Objetivos</button>
        <button class="btn btn-primary btn-sm" onclick="openLogModal('${vend.nombre}')">+ Registrar Actividad</button>
      </div>
    </div>
    <div id="vd-dash-preview-${vendId}"></div>
  </div>`;
  document.body.appendChild(ov);
  // Render vendedor dashboard inside the panel
  _renderVendedorDashAsOwner(vendId, vend, ov.querySelector('#vd-dash-preview-'+vendId));
}

function _renderVendedorDashAsOwner(vendId, vend, container){
  if(!container)return;
  const nombre=vend.nombre;
  const today=todayStr();
  const ym=today.substring(0,7);
  const now=new Date();
  const MES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const vendRec=vend;
  const comUnit=Number(vendRec.comision)||300;
  const obj=S.get('crm_objetivos').find(x=>x.ym===ym&&String(x.vendedorId)===String(vendId))||null;
  const allLogs=S.get('crm_logs').filter(l=>l.vendedor===nombre).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const mLogs=allLogs.filter(l=>l.fecha.startsWith(ym));
  const mLL=mLogs.reduce((s,l)=>s+(l.llamadas||0),0);
  const mDU=mLogs.reduce((s,l)=>s+(l.duenos||0),0);
  const mAG=mLogs.reduce((s,l)=>s+(l.agendadas||0),0);
  const mCI=mLogs.reduce((s,l)=>s+(l.cerradas||0),0);
  const misAuds=S.get('auditorias').filter(a=>a.vendedor===nombre);
  const comAcum=misAuds.filter(a=>a.estado==='Completada').length*comUnit;
  const comMes=misAuds.filter(a=>a.estado==='Completada'&&(a.fInforme||'').startsWith(ym)).length*comUnit;
  const enProceso=misAuds.filter(a=>a.estado!=='Completada').length;
  const op=(r,m)=>m>0?Math.min(Math.round(r/m*100),999):null;
  const pLL=op(mLL,obj?.llamadas),pDU=op(mDU,obj?.duenos),pAG=op(mAG,obj?.agendadas),pCI=op(mCI,obj?.cerradas);
  const pArr=[pLL,pDU,pAG,pCI].filter(x=>x!==null);
  const avgP=pArr.length?Math.round(pArr.reduce((s,x)=>s+x,0)/pArr.length):null;
  const pc=p=>p===null?'var(--muted)':p>=100?'var(--accent3)':p>=70?'var(--warn)':'var(--danger)';
  // Oportunidades calientes: entrevistas con resultado positivo agendadas por este vendedor
  const misEntrevistasSup=(S.get('crm_entrevistas')||[]).filter(e=>e.vendedor===nombre&&e.fechaRealizada);
  // Entrevistas con feedback del dueño
  const conFeedback=misEntrevistasSup.filter(e=>e.feedbackVendedor||e.estado);
  const calientesSup=misEntrevistasSup.filter(e=>e.interesado&&!e.interesado.includes('No')&&e.interesado!=='Dudoso');
  const segs=S.get('crm_seguimientos').filter(s=>s.vendedor===nombre&&!s.hecho);
  const segsVenc=segs.filter(s=>s.fecha<today);
  const segsHoy=segs.filter(s=>s.fecha===today);
  const allVends=S.get('vendedores').filter(v=>v.estado!=='Inactivo');
  const rankStats=allVends.map(v=>{
    const vl=S.get('crm_logs').filter(l=>l.vendedor===v.nombre&&l.fecha.startsWith(ym));
    return{nombre:v.nombre,ci:vl.reduce((s,l)=>s+(l.cerradas||0),0),ll:vl.reduce((s,l)=>s+(l.llamadas||0),0)};
  }).sort((a,b)=>b.ci-a.ci);
  const rankPos=rankStats.findIndex(r=>r.nombre===nombre)+1||rankStats.length;
  const rankMedal=rankPos===1?'🥇':rankPos===2?'🥈':rankPos===3?'🥉':'#'+rankPos;
  const dInMes=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  let wdLeft=0;for(let d=now.getDate();d<=dInMes;d++){const dow=new Date(now.getFullYear(),now.getMonth(),d).getDay();if(dow!==0&&dow!==6)wdLeft++;}
  // Base de datos del vendedor
  const bdEmpresas=(S.get('crm_bases_datos')||[]).filter(e=>e.vendedor===nombre);
  const audPorTipo={'Auditoría Internacional':misAuds.filter(a=>a.tipo==='Auditoría Internacional').length,'Adaptación IA BPCE':misAuds.filter(a=>a.tipo==='Adaptación IA BPCE').length,'Implementación ISO 72001':misAuds.filter(a=>a.tipo==='Implementación ISO 72001').length};

  container.innerHTML=`
  <!-- Stats principales -->
  <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:20px">
    <div style="background:rgba(184,146,46,0.1);border:1px solid rgba(184,146,46,0.25);border-radius:12px;padding:14px;text-align:center">
      <div style="font-size:24px;margin-bottom:4px">${rankMedal}</div>
      <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:#c8a84a">${rankPos}°</div>
      <div style="font-size:9px;color:var(--muted);text-transform:uppercase">Ranking</div>
    </div>
    ${[{ic:'📞',v:mLL,lb:'Llamadas',cl:'var(--accent)',k:'llamadas'},{ic:'👤',v:mDU,lb:'Dueños',cl:'#c8a84a',k:'duenos'},{ic:'📅',v:mAG,lb:'Entrevistas',cl:'var(--warn)',k:'agendadas'},{ic:'🏆',v:mCI,lb:'Cierres',cl:'var(--accent3)',k:'cerradas'},{ic:'💰',v:fmt(comAcum),lb:'Comisiones',cl:'var(--accent3)',k:'comisiones'}].map(m=>`
    <div onclick="vdOwnerDrill('${m.k}','${nombre.replace(/'/g,"\\'")}','${ym}')" style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center;cursor:pointer;transition:all 0.15s" onmouseover="this.style.borderColor='${m.cl}';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='var(--border)';this.style.transform=''">
      <div style="font-size:18px;margin-bottom:4px">${m.ic}</div>
      <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:${m.cl}">${m.v}</div>
      <div style="font-size:9px;color:var(--muted);text-transform:uppercase">${m.lb}</div>
    </div>`).join('')}
  </div>

  ${calientesSup.length?`<div style="background:linear-gradient(135deg,rgba(239,68,68,0.08),rgba(245,158,11,0.05));border:1px solid rgba(239,68,68,0.25);border-radius:14px;padding:16px 20px;margin-bottom:20px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <div style="font-size:18px">🔥</div>
      <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:#f87171">Oportunidades calientes — ¡a cerrar!</div>
      <span style="margin-left:auto;background:rgba(239,68,68,0.15);color:#f87171;font-size:10px;font-weight:800;padding:3px 8px;border-radius:6px">${calientesSup.length}</span>
    </div>
    ${calientesSup.map(e=>{
      const iconInt=e.interesado?.includes('muy')||e.interesado?.includes('Muy')?'🔥':'✅';
      return`<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(239,68,68,0.1);cursor:pointer" onclick="crmHistorialEmpresa('${e.empresa.replace(/'/g,"\\'")}')">
        <div style="font-size:20px;flex-shrink:0">${iconInt}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700">${e.empresa}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${e.interesado}${e.entrevistador?' · entrevistó '+e.entrevistador:''}${e.proximoPaso?' · próximo: '+e.proximoPaso:''}</div>
          ${e.resultado?`<div style="font-size:11px;color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">"${e.resultado.substring(0,80)}${e.resultado.length>80?'…':''}"</div>`:''}
        </div>
        <button onclick="event.stopPropagation();abrirSeguimiento('${nombre.replace(/'/g,"\\'")}','${e.empresa.replace(/'/g,"\\'")}');" style="padding:6px 12px;border:1px solid rgba(239,68,68,0.4);border-radius:16px;background:rgba(239,68,68,0.1);color:#f87171;font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0">+ Seguimiento</button>
      </div>`;
    }).join('')}
  </div>`:''}

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
    <!-- Objetivos -->
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px">
      <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;margin-bottom:14px">🎯 Objetivos — ${MES[now.getMonth()]}</div>
      ${obj?`
      <div style="text-align:center;margin-bottom:14px">
        <div style="font-family:'Syne',sans-serif;font-size:42px;font-weight:800;color:${pc(avgP)}">${avgP}%</div>
        <div style="font-size:11px;color:var(--muted)">cumplimiento global</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${[[obj.llamadas,mLL,'📞','Llamadas','var(--accent)'],[obj.duenos,mDU,'👤','Dueños','#c8a84a'],[obj.agendadas,mAG,'📅','Entrevistas','var(--warn)'],[obj.cerradas,mCI,'🏆','Cierres','var(--accent3)']].filter(([m])=>m>0).map(([meta,real,ic,lb,cl])=>{
          const pct=Math.min(Math.round(real/meta*100),100);
          return`<div><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>${ic} ${lb}</span><span style="font-weight:700;color:${pct>=100?'var(--accent3)':cl}">${real}/${meta} (${pct}%)</span></div><div style="height:6px;background:var(--surface2);border-radius:3px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${cl};border-radius:3px"></div></div></div>`;
        }).join('')}
      </div>`:`<div style="text-align:center;padding:20px;color:var(--muted);font-size:12px">Sin objetivos configurados<br><button class="btn btn-primary btn-sm" onclick="abrirObjetivos(${vendId})" style="margin-top:10px">🎯 Fijar Objetivos</button></div>`}
    </div>
    <!-- Seguimientos -->
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700">🔔 Seguimientos (${segs.length})</div>
        ${segsVenc.length?`<span style="background:var(--danger);color:#fff;font-size:9px;padding:2px 8px;border-radius:10px">${segsVenc.length} VENCIDOS</span>`:''}
      </div>
      <div style="max-height:280px;overflow-y:auto;display:flex;flex-direction:column;gap:6px">
        ${segs.length?[...segsVenc,...segsHoy,...segs.filter(s=>s.fecha>today)].slice(0,10).map(s=>{
          const isV=s.fecha<today,isH=s.fecha===today;
          return`<div style="background:var(--surface2);border:1px solid ${isV?'rgba(239,68,68,0.4)':isH?'rgba(245,158,11,0.4)':'var(--border)'};border-radius:8px;padding:8px 12px;display:flex;align-items:center;gap:10px">
            <div style="width:6px;height:6px;border-radius:50%;background:${isV?'var(--danger)':isH?'var(--warn)':'var(--accent3)'};flex-shrink:0"></div>
            <div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600">${s.empresa}</div><div style="font-size:10px;color:var(--muted)">${fmtD(s.fecha)}${s.contacto?' · '+s.contacto:''}</div></div>
            ${isV?'<span style="font-size:9px;color:var(--danger);font-weight:700">VENCIDO</span>':isH?'<span style="font-size:9px;color:var(--warn);font-weight:700">HOY</span>':''}
          </div>`;
        }).join(''):`<div style="text-align:center;padding:20px;color:var(--muted);font-size:12px">✅ Sin seguimientos pendientes</div>`}
      </div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
    <!-- Servicios vendidos -->
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px">
      <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;margin-bottom:14px">📦 Servicios Vendidos</div>
      ${[['Auditoría Internacional','#f59e0b','🔍'],['Adaptación IA BPCE','#c8a84a','🤖'],['Implementación ISO 72001','var(--accent3)','⚙️']].map(([tipo,cl,ic])=>{
        const n=audPorTipo[tipo]||0;
        return`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)"><div style="font-size:12px">${ic} ${tipo}</div><div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:${cl}">${n}</div></div>`;
      }).join('')}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">
        <div style="background:var(--surface2);border-radius:8px;padding:10px;text-align:center"><div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--accent)">${enProceso}</div><div style="font-size:10px;color:var(--muted)">En proceso</div></div>
        <div style="background:var(--surface2);border-radius:8px;padding:10px;text-align:center"><div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--accent3)">${misAuds.filter(a=>a.estado==='Completada').length}</div><div style="font-size:10px;color:var(--muted)">Completadas</div></div>
      </div>
    </div>
    <!-- Base de datos -->
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700">🗄️ Base de Datos</div>
        <button class="btn btn-secondary btn-sm" onclick="verBasesDatosVendedor(${vendId},'${nombre}')">Ver todas →</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">
        ${[['Total','var(--accent)',bdEmpresas.length],['Pendientes','var(--warn)',bdEmpresas.filter(e=>e.estado==='Pendiente').length],['Interesadas','var(--accent3)',bdEmpresas.filter(e=>e.estado==='Interesada').length],['Descartadas','var(--danger)',bdEmpresas.filter(e=>e.estado==='Descartada').length]].map(([lb,cl,n])=>`
        <div style="background:var(--surface2);border-radius:8px;padding:8px;text-align:center"><div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:${cl}">${n}</div><div style="font-size:9px;color:var(--muted)">${lb}</div></div>`).join('')}
      </div>
      <div style="max-height:160px;overflow-y:auto">
        ${bdEmpresas.slice(0,8).map(e=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(212,175,55,0.06);font-size:11px"><span>${e.empresa}</span><span class="badge badge-${e.estado==='Pendiente'?'warn':e.estado==='Contactada'?'purple':e.estado==='Interesada'?'success':'danger'}" style="font-size:9px">${e.estado}</span></div>`).join('')}
        ${bdEmpresas.length>8?`<div style="font-size:10px;color:var(--muted);text-align:center;padding:6px">+${bdEmpresas.length-8} más...</div>`:''}
        ${!bdEmpresas.length?'<div style="text-align:center;padding:16px;color:var(--muted);font-size:11px">Sin empresas cargadas</div>':''}
      </div>
    </div>
  </div>

  <!-- Actividad reciente -->
  <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px">
    <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;margin-bottom:14px">📋 Actividad Reciente (últimos 10 días)</div>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr><th>Fecha</th><th>📞 Llamadas</th><th>👤 Dueños</th><th>📅 Entrevistas</th><th>🏆 Cierres</th><th>Notas</th></tr></thead>
        <tbody>
          ${allLogs.slice(0,10).map(l=>`<tr><td style="font-size:12px">${fmtD(l.fecha)}</td><td style="text-align:center;font-weight:600;color:var(--accent)">${l.llamadas||0}</td><td style="text-align:center;color:#c8a84a">${l.duenos||0}</td><td style="text-align:center;color:var(--warn)">${l.agendadas||0}</td><td style="text-align:center;font-weight:700;color:var(--accent3)">${l.cerradas||0}</td><td style="font-size:11px;color:var(--muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.notas||'-'}</td></tr>`).join('')}
          ${!allLogs.length?'<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--muted)">Sin actividad registrada</td></tr>':''}
        </tbody>
      </table>
    </div>
  </div>`;
}

// Dueño: Ver base de datos de un vendedor específico
function verBasesDatosVendedor(vendId, vendNombre){
  const allEmpresas=(S.get('crm_bases_datos')||[]).filter(e=>e.vendedor===vendNombre);
  document.querySelectorAll('.crm-bd-panel').forEach(e=>e.remove());
  const ov=document.createElement('div');
  ov.className='modal-overlay open crm-bd-panel';
  ov.style.cssText='z-index:2100;align-items:flex-start;padding:0;overflow-y:auto;background:var(--bg);';
  const stats={total:allEmpresas.length,pendiente:allEmpresas.filter(e=>e.estado==='Pendiente').length,contactada:allEmpresas.filter(e=>e.estado==='Contactada').length,interesada:allEmpresas.filter(e=>e.estado==='Interesada').length,descartada:allEmpresas.filter(e=>e.estado==='Descartada').length};
  ov.innerHTML=`
  <div style="width:100%;max-width:1100px;margin:0 auto;padding:20px 16px 40px">
    <div style="position:sticky;top:0;z-index:100;background:var(--bg);padding:14px 0 12px;margin-bottom:20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:14px">
      <button onclick="this.closest('.crm-bd-panel').remove()" style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;width:38px;height:38px;cursor:pointer;font-size:18px;color:var(--text);display:flex;align-items:center;justify-content:center">←</button>
      <div>
        <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800">🗄️ Base de Datos — ${vendNombre}</div>
        <div style="font-size:12px;color:var(--muted)">${stats.total} empresas cargadas</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:18px">
      ${[['Total','var(--accent)',stats.total],['Pendientes','#f59e0b',stats.pendiente],['Contactadas','#c8a84a',stats.contactada],['Interesadas','#c8a84a',stats.interesada],['Descartadas','#ef4444',stats.descartada]].map(([lb,cl,n])=>`
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center">
        <div style="font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:${cl}">${n}</div>
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase">${lb}</div>
      </div>`).join('')}
    </div>
    ${allEmpresas.length?`<div class="table-wrap"><table>
      <thead><tr><th>Empresa</th><th>Rubro</th><th>Contacto</th><th>Teléfono</th><th>Estado</th><th>Contactos</th><th>Último</th><th>Servicio</th></tr></thead>
      <tbody>${allEmpresas.map(e=>{
        const stColor=e.estado==='Pendiente'?'warn':e.estado==='Contactada'?'purple':e.estado==='Interesada'?'success':'danger';
        const hist=e.historial||[];
        const ult=hist.slice(-1)[0];
        return`<tr>
          <td style="font-weight:600">${e.empresa||'-'}</td>
          <td style="font-size:12px;color:var(--muted)">${e.rubro||'-'}</td>
          <td style="font-size:12px">${e.contacto||'-'}${e.email?'<br><span style="font-size:10px;color:var(--accent)">'+e.email+'</span>':''}</td>
          <td style="font-size:12px">${e.telefono||'-'}</td>
          <td><span class="badge badge-${stColor}">${e.estado||'Pendiente'}</span></td>
          <td style="text-align:center;font-weight:700;color:var(--accent)">${hist.length}</td>
          <td style="font-size:11px;color:var(--muted)">${ult?fmtD(ult.fecha)+' · '+ult.resultado:'Nunca'}</td>
          <td style="font-size:11px">${e.servicio||'-'}</td>
        </tr>`;
      }).join('')}</tbody></table></div>`
    :`<div class="empty-state"><div class="icon">🗄️</div><h3>Sin empresas cargadas</h3><p>Este vendedor aún no cargó empresas en su base de datos</p></div>`}
  </div>`;
  document.body.appendChild(ov);
}

function getCRMStatsFecha(vendedorNombre, daysFrom, daysTo){
  const today_=new Date();
  const logs=S.get('crm_logs').filter(l=>{
    if(l.vendedor!==vendedorNombre)return false;
    const d=new Date(l.fecha+'T12:00:00');
    const diff=(today_-d)/86400000;
    return diff>=daysFrom&&diff<daysTo;
  });
  return{
    llamadas:logs.reduce((s,l)=>s+(l.llamadas||0),0),
    cerradas:logs.reduce((s,l)=>s+(l.cerradas||0),0),
  };
}

function renderCRMVendedorPanel(vendId, vend, periodo){
  const body=document.getElementById(`crm-vend-body-${vendId}`);
  if(!body)return;
  // Tabs especiales — renderizado propio
  if(periodo==='notas'){ renderNotasVend(body,vendId,vend); return; }
  const ym=todayStr().substring(0,7);
  const today_=todayStr();
  const allLogs=S.get('crm_logs').filter(l=>l.vendedor===vend.nombre).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const stats=getCRMStats(vend.nombre,periodo);
  const statsD=getCRMStats(vend.nombre,'dia');
  const statsS=getCRMStats(vend.nombre,'semana');
  const statsM=getCRMStats(vend.nombre,'mes');
  const obj=S.get('crm_objetivos').find(x=>String(x.vendedorId)===String(vendId)&&x.ym===ym);
  const todosSegs=S.get('crm_seguimientos').filter(x=>x.vendedor===vend.nombre);
  const segs=todosSegs.filter(x=>!x.hecho);
  const segsHechos=todosSegs.filter(x=>x.hecho);
  const segsVencidas=segs.filter(x=>x.fecha<today_);
  const segsHoy=segs.filter(x=>x.fecha===today_);
  const mananaDate=new Date(today_+'T12:00:00');mananaDate.setDate(mananaDate.getDate()+1);
  const mañanaStr=mananaDate.toISOString().substring(0,10);
  const segsMañana=segs.filter(x=>x.fecha===mañanaStr);
  const segsProximos=segs.filter(x=>x.fecha>today_&&x.fecha!==mañanaStr);
  const auds=S.get('auditorias').filter(a=>a.vendedor===vend.nombre);
  const audPorTipo={
    'Auditoría Internacional':auds.filter(a=>a.tipo==='Auditoría Internacional').length,
    'Adaptación IA BPCE':auds.filter(a=>a.tipo==='Adaptación IA BPCE').length,
    'Implementación ISO 72001':auds.filter(a=>a.tipo==='Implementación ISO 72001').length,
  };
  const audActivas=auds.filter(a=>a.estado!=='Completada').length;
  const audCompletadas=auds.filter(a=>a.estado==='Completada').length;
  const objPcts={
    llamadas:obj&&obj.llamadas?Math.min(Math.round(statsM.llamadas/obj.llamadas*100),999):null,
    duenos:obj&&obj.duenos?Math.min(Math.round(statsM.duenos/obj.duenos*100),999):null,
    agendadas:obj&&obj.agendadas?Math.min(Math.round(statsM.agendadas/obj.agendadas*100),999):null,
    cerradas:obj&&obj.cerradas?Math.min(Math.round(statsM.cerradas/obj.cerradas*100),999):null,
  };
  const pctVals=Object.values(objPcts).filter(x=>x!==null);
  const avgPct=pctVals.length?Math.round(pctVals.reduce((s,x)=>s+x,0)/pctVals.length):null;
  const statsUltSem=getCRMStatsFecha(vend.nombre,7,14);
  const tendLlamadas=statsS.llamadas-statsUltSem.llamadas;
  const tendCierres=statsS.cerradas-statsUltSem.cerradas;
  const empresasAgendadas=[...new Set(allLogs.filter(l=>l.empresasAgendadas).flatMap(l=>l.empresasAgendadas.split('\n').map(e=>e.trim()).filter(Boolean)))];
  const periodTabs=['dia','semana','mes','notas'].map(p=>{const lbl=p==='dia'?'Hoy':p==='semana'?'Semana':p==='mes'?'Mes':'📝 Notas';return`<button class="crm-tab ${p===periodo?'active':''}" onclick="renderCRMVendedorPanel(${vendId},${JSON.stringify(vend)},'${p}')">${lbl}</button>`;}).join('');
  const conv=convRate(stats.cerradas,stats.llamadas);
  const convColor=conv>=20?'var(--accent3)':conv>=10?'var(--warn)':'var(--danger)';

  body.innerHTML=`
    ${segsVencidas.length?`<div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.4);border-radius:12px;padding:14px 18px;margin-bottom:12px;display:flex;align-items:flex-start;gap:12px">
      <div style="font-size:22px;flex-shrink:0">🚨</div>
      <div style="flex:1">
        <div style="color:var(--danger);font-weight:700;font-size:13px;margin-bottom:6px">${segsVencidas.length} seguimiento${segsVencidas.length>1?'s':''} VENCIDO${segsVencidas.length>1?'S':''}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${segsVencidas.map(s=>`<span onclick="crmHistorialEmpresa('${s.empresa.replace(/'/g,"\\'")}')" style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);border-radius:20px;padding:3px 10px;font-size:11px;color:var(--danger);cursor:pointer" title="Ver historial">${s.empresa} · ${fmtD(s.fecha)} 🔍</span>`).join('')}</div>
      </div>
    </div>`:''}
    ${segsHoy.length?`<div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.4);border-radius:12px;padding:14px 18px;margin-bottom:12px;display:flex;align-items:flex-start;gap:12px">
      <div style="font-size:22px;flex-shrink:0">⚠️</div>
      <div style="flex:1">
        <div style="color:var(--warn);font-weight:700;font-size:13px;margin-bottom:6px">${segsHoy.length} seguimiento${segsHoy.length>1?'s':''} para HOY</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${segsHoy.map(s=>`<span onclick="crmHistorialEmpresa('${s.empresa.replace(/'/g,"\\'")}')" style="background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.3);border-radius:20px;padding:3px 10px;font-size:11px;color:var(--warn);cursor:pointer" title="Ver historial">${s.empresa}${s.contacto?' · '+s.contacto:''} 🔍</span>`).join('')}</div>
      </div>
    </div>`:''}
    ${segsMañana.length?`<div style="background:rgba(212,175,55,0.06);border:1px solid rgba(212,175,55,0.2);border-radius:12px;padding:12px 18px;margin-bottom:12px;font-size:12px;color:var(--accent)">
      📅 <strong>${segsMañana.length} para mañana:</strong> ${segsMañana.map(s=>s.empresa).join(' · ')}
    </div>`:''}
    ${statsD.llamadas===0&&new Date().getDay()!==0&&new Date().getDay()!==6?`<div style="background:rgba(184,146,46,0.08);border:1px solid rgba(184,146,46,0.2);border-radius:12px;padding:12px 18px;margin-bottom:12px;font-size:12px;color:#c8a84a;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
      💡 Sin actividad registrada hoy <button class="btn btn-primary btn-sm" onclick="openLogModal('${vend.nombre}')">Registrar ahora</button>
    </div>`:''}
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px">
      <div class="crm-period-tabs">${periodTabs}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" onclick="abrirSeguimiento('${vend.nombre}')">🔔 + Seguimiento</button>
        <button class="btn btn-primary btn-sm" onclick="openLogModal('${vend.nombre}')">📋 + Actividad</button>
      </div>
    </div>
    <div class="grid-5" style="margin-bottom:20px">
      <div class="crm-metric-card c-cyan" style="cursor:pointer" onclick="crmMetricaDrill('llamadas','${vend.nombre}','${periodo}')" title="Ver detalle de llamadas">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">☎️ Llamadas</div>
        <div class="crm-big-num" style="color:var(--accent)">${stats.llamadas}</div>
        <div style="margin-top:6px"><div style="font-size:10px;color:var(--muted)">Hoy <strong style="color:var(--text)">${statsD.llamadas}</strong> · Sem <strong style="color:var(--text)">${statsS.llamadas}</strong></div>
        <div style="font-size:10px;color:${tendLlamadas>=0?'var(--accent3)':'var(--danger)'}">${tendLlamadas>=0?'↑':'↓'} ${Math.abs(tendLlamadas)} vs sem ant</div></div>
        <div style="font-size:9px;color:var(--muted);margin-top:4px">Click para detalle →</div>
      </div>
      <div class="crm-metric-card c-purple" style="cursor:pointer" onclick="crmMetricaDrill('duenos','${vend.nombre}','${periodo}')" title="Ver detalle de dueños contactados">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">👤 Dueños</div>
        <div class="crm-big-num" style="color:#c8a84a">${stats.duenos}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:6px">Hoy <strong style="color:var(--text)">${statsD.duenos}</strong> · Sem <strong style="color:var(--text)">${statsS.duenos}</strong></div>
        <div style="font-size:9px;color:var(--muted);margin-top:4px">Click para detalle →</div>
      </div>
      <div class="crm-metric-card c-orange" style="cursor:pointer" onclick="crmMetricaDrill('agendadas','${vend.nombre}','${periodo}')" title="Ver empresas agendadas">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">📅 Agendadas</div>
        <div class="crm-big-num" style="color:var(--warn)">${stats.agendadas}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:6px">Hoy <strong style="color:var(--text)">${statsD.agendadas}</strong> · Sem <strong style="color:var(--text)">${statsS.agendadas}</strong></div>
        <div style="font-size:9px;color:var(--muted);margin-top:4px">Click para detalle →</div>
      </div>
      <div class="crm-metric-card c-green" style="cursor:pointer" onclick="crmMetricaDrill('cerradas','${vend.nombre}','${periodo}')" title="Ver cierres detallados">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">🏆 Cierres</div>
        <div class="crm-big-num" style="color:var(--accent3)">${stats.cerradas}</div>
        <div style="margin-top:6px"><div style="font-size:10px;color:var(--muted)">Hoy <strong style="color:var(--text)">${statsD.cerradas}</strong> · Sem <strong style="color:var(--text)">${statsS.cerradas}</strong></div>
        <div style="font-size:10px;color:${tendCierres>=0?'var(--accent3)':'var(--danger)'}">${tendCierres>=0?'↑':'↓'} ${Math.abs(tendCierres)} vs sem ant</div></div>
        <div style="font-size:9px;color:var(--muted);margin-top:4px">Click para detalle →</div>
      </div>
      <div class="crm-metric-card" style="border-color:${convColor}40;cursor:pointer" onclick="crmMetricaDrill('conversion','${vend.nombre}','${periodo}')" title="Ver análisis de conversión">
        <div style="position:absolute;top:0;left:0;right:0;height:3px;border-radius:14px 14px 0 0;background:${convColor}"></div>
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">📊 Conversión</div>
        <div class="crm-big-num" style="color:${convColor}">${conv}%</div>
        <div style="font-size:10px;color:var(--muted);margin-top:4px">${stats.cerradas} / ${stats.llamadas}</div>
        <div style="height:4px;background:var(--surface2);border-radius:2px;margin-top:6px;overflow:hidden"><div style="height:100%;width:${Math.min(conv,100)}%;background:${convColor};border-radius:2px"></div></div>
        <div style="font-size:9px;color:var(--muted);margin-top:4px">Click para detalle →</div>
      </div>
    </div>
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:800">🎯 Objetivos — ${new Date().toLocaleString('es-AR',{month:'long'})}</div>
          ${avgPct!==null?`<div style="font-size:11px;color:var(--muted);margin-top:2px">Cumplimiento global: <strong style="color:${avgPct>=100?'var(--accent3)':avgPct>=70?'var(--warn)':'var(--danger)'}">${avgPct}%</strong></div>`:''}
        </div>
        <button class="btn btn-secondary btn-sm" onclick="abrirObjetivos(${vendId})">✏️ Editar</button>
      </div>
      ${obj?`
        <!-- Barra global de cumplimiento -->
        <div style="background:var(--surface2);border-radius:12px;padding:16px;margin-bottom:18px;text-align:center">
          <div style="font-family:'Syne',sans-serif;font-size:48px;font-weight:800;line-height:1;color:${avgPct>=100?'var(--accent3)':avgPct>=80?'var(--warn)':'var(--danger)'}">${avgPct}%</div>
          <div style="font-size:11px;color:var(--muted);margin:4px 0 10px">cumplimiento del mes</div>
          <div style="height:10px;background:var(--surface);border-radius:5px;overflow:hidden">
            <div style="height:100%;width:${Math.min(avgPct,100)}%;background:${avgPct>=100?'linear-gradient(90deg,var(--accent3),#34d399)':avgPct>=80?'linear-gradient(90deg,var(--warn),#fbbf24)':'linear-gradient(90deg,var(--danger),#f87171)'};border-radius:5px;transition:width 0.6s"></div>
          </div>
        </div>
        <!-- Filas por métrica -->
        <div style="display:flex;flex-direction:column;gap:14px">
          ${[[obj.llamadas,statsM.llamadas,'📞','Llamadas','var(--accent)'],[obj.duenos,statsM.duenos,'👤','Dueños','#c8a84a'],[obj.agendadas,statsM.agendadas,'📅','Entrevistas','var(--warn)'],[obj.cerradas,statsM.cerradas,'🏆','Cierres','var(--accent3)']].filter(([meta])=>meta>0).map(([meta,real,ic,label,color])=>{
            const pct=Math.min(Math.round(real/meta*100),100);
            const over=real>=meta;
            const c=pct>=100?'var(--accent3)':pct>=70?color:'var(--danger)';
            return`<div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px">
                <div style="display:flex;align-items:center;gap:8px">
                  <span style="font-size:18px">${ic}</span>
                  <span style="font-size:14px;font-weight:600">${label}</span>
                </div>
                <div style="display:flex;align-items:center;gap:10px">
                  <span style="font-family:'DM Mono',monospace;font-size:16px;font-weight:800;color:${c}">${real}<span style="font-size:12px;color:var(--muted);font-weight:400"> / ${meta}</span></span>
                  <span style="background:${over?'rgba(200,168,74,0.15)':pct>=70?'rgba(245,158,11,0.12)':'rgba(239,68,68,0.1)'};border:1px solid ${over?'rgba(200,168,74,0.3)':pct>=70?'rgba(245,158,11,0.3)':'rgba(239,68,68,0.3)'};border-radius:20px;padding:3px 10px;font-size:12px;font-weight:800;color:${c}">${pct}%</span>
                </div>
              </div>
              <div style="height:8px;background:var(--surface2);border-radius:4px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:${over?'linear-gradient(90deg,var(--accent3),#34d399)':'linear-gradient(90deg,'+color+','+color+'99)'};border-radius:4px;transition:width 0.6s"></div>
              </div>
            </div>`;
          }).join('')}
        </div>`
      :`<div style="text-align:center;padding:28px 0"><div style="font-size:48px;margin-bottom:12px">🎯</div><div style="font-size:13px;color:var(--muted);margin-bottom:16px">Sin objetivos para este mes</div><button class="btn btn-primary" onclick="abrirObjetivos(${vendId})">Fijar Objetivos</button></div>`}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700">🔔 Seguimientos ${segsVencidas.length?`<span style="background:var(--danger);color:#fff;font-size:9px;padding:2px 7px;border-radius:10px;margin-left:6px">${segsVencidas.length} VENCIDOS</span>`:''}${segsHoy.length?`<span style="background:var(--warn);color:#000;font-size:9px;padding:2px 7px;border-radius:10px;margin-left:4px">HOY</span>`:''}</div>
          <button class="btn btn-primary btn-sm" onclick="abrirSeguimiento('${vend.nombre}')">+ Nuevo</button>
        </div>
        <div style="max-height:340px;overflow-y:auto;display:flex;flex-direction:column;gap:6px">
        ${segs.length?[...segsVencidas,...segsHoy,...segsMañana,...segsProximos].map(s=>{
          const isVenc=s.fecha<today_,isHoy=s.fecha===today_,esMan=s.fecha===mañanaStr;
          const bc=isVenc?'rgba(239,68,68,0.5)':isHoy?'rgba(245,158,11,0.5)':esMan?'rgba(212,175,55,0.3)':'var(--border)';
          const dot=isVenc?'var(--danger)':isHoy?'var(--warn)':esMan?'var(--accent)':'var(--accent3)';
          const tag=isVenc?'<span style="background:var(--danger);color:#fff;font-size:8px;padding:1px 6px;border-radius:8px">VENCIDO</span>':isHoy?'<span style="background:var(--warn);color:#000;font-size:8px;padding:1px 6px;border-radius:8px">HOY</span>':esMan?'<span style="background:rgba(212,175,55,0.2);color:var(--accent);font-size:8px;padding:1px 6px;border-radius:8px">MAÑANA</span>':'';
          return`<div style="background:var(--surface2);border:1px solid ${bc};border-radius:10px;padding:11px 13px">
            <div style="display:flex;align-items:flex-start;gap:10px">
              <div style="width:8px;height:8px;border-radius:50%;background:${dot};flex-shrink:0;margin-top:4px"></div>
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px">
                  <div style="font-size:12px;font-weight:700">${s.empresa}</div>${tag}
                  <span style="font-size:9px;color:var(--muted);margin-left:auto">${s.prioridad==='Alta'?'🔴':s.prioridad==='Media'?'🟡':'🟢'} ${s.prioridad}</span>
                </div>
                ${s.contacto?`<div style="font-size:10px;color:var(--accent)">👤 ${s.contacto}</div>`:''}
                <div style="font-size:10px;color:var(--muted);margin-top:2px">📅 ${fmtD(s.fecha)}</div>
                ${s.notas?`<div style="font-size:11px;color:var(--muted);margin-top:4px;line-height:1.4;border-top:1px solid rgba(255,255,255,0.05);padding-top:5px">${s.notas}</div>`:''}
              </div>
              <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
                <button class="btn btn-sm" onclick="crmHistorialEmpresa('${s.empresa.replace(/'/g,"\\'")}')" style="font-size:10px;padding:3px 8px;background:rgba(212,175,55,0.08);color:var(--accent);border:1px solid rgba(212,175,55,0.25)" title="Ver historial completo de ${s.empresa}">🔍</button>
                <button class="btn btn-sm" onclick="convertirSeguimientoEnVenta(${s.id})" style="font-size:10px;padding:3px 8px;background:rgba(200,168,74,0.15);color:var(--accent3);border:1px solid rgba(200,168,74,0.3)">🏆 Venta</button>
                <button class="btn btn-secondary btn-sm" onclick="marcarSeguimientoHecho(${s.id})" style="font-size:10px;padding:3px 8px">✓ Listo</button>
                <button class="btn btn-danger btn-sm" onclick="delItem('crm_seguimientos',${s.id},()=>renderCRMVendedorPanel(${vendId},${JSON.stringify(vend)},'${periodo}'))" style="font-size:10px;padding:3px 8px">🗑</button>
              </div>
            </div>
          </div>`;
        }).join(''):`<div style="text-align:center;padding:28px;color:var(--muted);font-size:12px"><div style="font-size:32px;margin-bottom:8px">✅</div>Sin seguimientos pendientes</div>`}
        </div>
        ${segsHechos.length?`<div style="margin-top:12px;border-top:1px solid var(--border);padding-top:10px">
          <div style="font-size:10px;color:var(--muted);cursor:pointer" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'flex':'none'">✅ ${segsHechos.length} completado(s) ▾</div>
          <div style="display:none;flex-direction:column;gap:4px;margin-top:8px">${segsHechos.slice(0,10).map(s=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:rgba(200,168,74,0.05);border-radius:8px;opacity:0.7"><span>✅</span><div style="flex:1;font-size:11px;color:var(--muted);text-decoration:line-through">${s.empresa}</div><button class="btn btn-danger btn-sm" style="font-size:9px;padding:2px 6px" onclick="delItem('crm_seguimientos',${s.id},()=>renderCRMVendedorPanel(${vendId},${JSON.stringify(vend)},'${periodo}'))">🗑</button></div>`).join('')}</div>
        </div>`:''}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px">
        <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;margin-bottom:14px">📦 Servicios Vendidos</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${[['Auditoría Internacional','#f59e0b','🔍'],['Adaptación IA BPCE','#c8a84a','🤖'],['Implementación ISO 72001','var(--accent3)','⚙️']].map(([tipo,color,icon])=>{const n=audPorTipo[tipo]||0;const maxN=Math.max(...Object.values(audPorTipo),1);return`<div><div style="display:flex;justify-content:space-between;margin-bottom:4px"><div style="font-size:12px">${icon} ${tipo}</div><div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:${color}">${n}</div></div><div style="height:5px;background:var(--surface2);border-radius:3px;overflow:hidden"><div style="height:100%;width:${Math.round(n/maxN*100)}%;background:${color};border-radius:3px"></div></div></div>`;}).join('')}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">
          <div style="background:var(--surface2);border-radius:8px;padding:10px;text-align:center"><div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--accent)">${audActivas}</div><div style="font-size:10px;color:var(--muted)">Activas ahora</div></div>
          <div style="background:var(--surface2);border-radius:8px;padding:10px;text-align:center"><div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--accent3)">${audCompletadas}</div><div style="font-size:10px;color:var(--muted)">Completadas</div></div>
        </div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px">
        <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;margin-bottom:14px">📈 Actividad — Últimas 4 semanas</div>
        ${(()=>{const weeks=[];for(let w=3;w>=0;w--){const d1=new Date();d1.setDate(d1.getDate()-((w+1)*7));const d2=new Date();d2.setDate(d2.getDate()-(w*7));const d1s=d1.toISOString().substring(0,10);const d2s=d2.toISOString().substring(0,10);const wLogs=allLogs.filter(l=>l.fecha>=d1s&&l.fecha<d2s);weeks.push({label:'S'+(4-w),llamadas:wLogs.reduce((s,l)=>s+(l.llamadas||0),0),cerradas:wLogs.reduce((s,l)=>s+(l.cerradas||0),0)});}const maxL=Math.max(...weeks.map(w=>w.llamadas),1);const maxC=Math.max(...weeks.map(w=>w.cerradas),1);return`<div style="display:flex;align-items:flex-end;gap:10px;height:90px;margin-bottom:8px">${weeks.map(w=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%"><div style="flex:1;width:100%;display:flex;align-items:flex-end;gap:3px"><div style="flex:1;background:rgba(212,175,55,0.3);border-radius:3px 3px 0 0;height:${Math.round(w.llamadas/maxL*100)}%;min-height:3px" title="${w.llamadas}"></div><div style="flex:1;background:var(--accent3);border-radius:3px 3px 0 0;height:${Math.round(w.cerradas/maxC*100)}%;min-height:3px" title="${w.cerradas}"></div></div><div style="font-size:9px;color:var(--muted)">${w.label}</div></div>`).join('')}</div><div style="display:flex;gap:14px"><div style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--muted)"><div style="width:10px;height:10px;background:rgba(212,175,55,0.4);border-radius:2px"></div>Llamadas</div><div style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--muted)"><div style="width:10px;height:10px;background:var(--accent3);border-radius:2px"></div>Cierres</div></div>`;})()}
      </div>
    </div>
    ${empresasAgendadas.length?`<div style="background:var(--surface);border:1px solid rgba(212,175,55,0.2);border-radius:14px;padding:16px 18px;margin-bottom:16px"><div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:var(--accent);margin-bottom:4px">🏢 Empresas con Llamada Agendada</div><div style="font-size:10px;color:var(--muted);margin-bottom:10px">Click en una empresa para ver su historial completo en el CRM</div><div style="display:flex;flex-wrap:wrap;gap:8px">${empresasAgendadas.map(e=>`<span onclick="crmHistorialEmpresa('${e.replace(/'/g,"\\'")}')" style="background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.25);border-radius:20px;padding:5px 14px;font-size:12px;color:var(--accent);cursor:pointer;transition:all 0.15s" onmouseover="this.style.background='rgba(212,175,55,0.18)';this.style.transform='translateY(-1px)'" onmouseout="this.style.background='rgba(212,175,55,0.08)';this.style.transform=''">${e} 🔍</span>`).join('')}</div></div>`:''}

    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700">📋 Historial Completo <span style="font-size:11px;color:var(--muted);font-weight:400">(${allLogs.length} registros)</span></div>
        <button class="btn btn-primary btn-sm" onclick="openLogModal('${vend.nombre}')">+ Registrar</button>
      </div>
      ${allLogs.length?`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:550px">
        <thead><tr style="background:var(--surface2)">
          <th style="text-align:left;padding:9px 12px;font-size:10px;text-transform:uppercase;color:var(--muted)">Fecha</th>
          <th style="text-align:center;padding:9px 10px;font-size:10px;color:var(--accent)">☎️</th>
          <th style="text-align:center;padding:9px 10px;font-size:10px;color:#c8a84a">👤</th>
          <th style="text-align:center;padding:9px 10px;font-size:10px;color:var(--warn)">📅</th>
          <th style="text-align:center;padding:9px 10px;font-size:10px;color:var(--accent3)">🏆</th>
          <th style="text-align:center;padding:9px 10px;font-size:10px;color:var(--muted)">Conv%</th>
          <th style="padding:9px 12px;font-size:10px;color:var(--muted)">Empresas / Notas</th>
          <th style="width:40px"></th>
        </tr></thead>
        <tbody>${allLogs.map((l,i)=>{const cv=convRate(l.cerradas,l.llamadas);const emps=[l.empresasAgendadas,l.empresasSeguimiento].filter(Boolean).join('\n').split('\n').map(e=>e.trim()).filter(Boolean);return`<tr style="border-bottom:1px solid rgba(212,175,55,0.09);${i%2===0?'background:rgba(255,255,255,0.01)':''}"><td style="padding:10px 12px;font-size:12px;font-weight:600;white-space:nowrap">${fmtD(l.fecha)}</td><td style="text-align:center;padding:10px;font-size:14px;font-weight:800;color:var(--accent)">${l.llamadas||0}</td><td style="text-align:center;padding:10px;font-size:14px;font-weight:800;color:#c8a84a">${l.duenos||0}</td><td style="text-align:center;padding:10px;font-size:14px;font-weight:800;color:var(--warn)">${l.agendadas||0}</td><td style="text-align:center;padding:10px;font-size:14px;font-weight:800;color:var(--accent3)">${l.cerradas||0}</td><td style="text-align:center;padding:10px"><span style="font-size:12px;font-weight:700;color:${cv>=20?'var(--accent3)':cv>=10?'var(--warn)':'var(--muted)'}">${cv}%</span></td><td style="padding:10px 12px;max-width:200px">${emps.length?`<div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:${l.notas?'4px':'0'}">${emps.slice(0,3).map(e=>`<span onclick="crmHistorialEmpresa('${e.replace(/'/g,"\\'")}')" style="background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.2);border-radius:10px;padding:2px 7px;font-size:10px;color:var(--accent);cursor:pointer" title="Ver historial de ${e}">${e}</span>`).join('')}${emps.length>3?`<span style="font-size:10px;color:var(--muted)">+${emps.length-3}</span>`:''}</div>`:''} ${l.notas?`<div style="font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${l.notas}</div>`:''}</td><td style="padding:10px 8px"><button class="btn btn-danger btn-sm" style="padding:3px 7px" onclick="delItem('crm_logs',${l.id},()=>renderCRMVendedorPanel(${vendId},${JSON.stringify(vend)},'${periodo}'))">🗑</button></td></tr>`;}).join('')}</tbody>
      </table></div>`:`<div style="text-align:center;padding:28px;color:var(--muted);font-size:12px"><div style="font-size:32px;margin-bottom:8px">📋</div>Sin actividades. Empezá registrando hoy.</div>`}
    </div>`;
}

function renderHistorial(){
  const el = document.getElementById('historial-content');
  if(!el) return;
  const auds   = S.get('auditorias');
  const cobros = S.get('cobros');
  const gastos = S.get('gastos');

  // Build list of months (last 12)
  const months = [];
  const now = new Date();
  for(let i=0; i<12; i++){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    months.push(d.toISOString().substring(0,7));
  }

  const monthData = months.map(ym=>{
    // Ingresos: cobros de auditorías pagados ese mes
    const ingAuds = auds
      .filter(a=>a.fechaPago?.substring(0,7)===ym)
      .reduce((s,a)=>s+(Number(a.monto)||0),0);

    // Ingresos: cuotas de cobros pagadas ese mes
    const ingCobros = cobros.flatMap(c=>c.cuotas||[])
      .filter(q=>q.fechaPago?.substring(0,7)===ym && q.estado==='Pagada')
      .reduce((s,q)=>s+(Number(q.montoCobrado||q.monto)||0),0);

    const ingresos = ingAuds + ingCobros;

    // Gastos de ese mes
    const gastosM = gastos
      .filter(g=>g.fecha?.substring(0,7)===ym)
      .reduce((s,g)=>s+(Number(g.monto)||0),0);

    // Cuotas emitidas (esperadas) ese mes
    const cuotasEsperadas = cobros.flatMap(c=>c.cuotas)
      .filter(q=>q.fechaVto?.substring(0,7)===ym)
      .reduce((s,q)=>s+(Number(q.monto)||0),0);

    const cuotasCobradas = cobros.flatMap(c=>c.cuotas)
      .filter(q=>q.fechaVto?.substring(0,7)===ym && q.estado==='Pagada')
      .reduce((s,q)=>s+(Number(q.montoCobrado||q.monto)||0),0);

    const ganancia = ingresos - gastosM;

    // New audits started this month
    const nuevasAuds = auds.filter(a=>a.fInicio?.substring(0,7)===ym).length;
    const audsCompletadas = auds.filter(a=>a.fInforme?.substring(0,7)===ym).length;

    // Gastos breakdown by category
    const porCat = {};
    gastos.filter(g=>g.fecha?.substring(0,7)===ym).forEach(g=>{
      if(!porCat[g.categoria]) porCat[g.categoria]=0;
      porCat[g.categoria]+=(Number(g.monto)||0);
    });

    return { ym, ingresos, gastosM, ganancia, cuotasEsperadas, cuotasCobradas, nuevasAuds, audsCompletadas, porCat };
  });

  // Find max values for sparklines
  const maxIng  = Math.max(...monthData.map(d=>d.ingresos), 1);
  const maxGas  = Math.max(...monthData.map(d=>d.gastosM), 1);
  const maxGan  = Math.max(...monthData.map(d=>Math.abs(d.ganancia)), 1);

  // Summary: best month, total period
  const totalIng   = monthData.reduce((s,d)=>s+d.ingresos,0);
  const totalGas   = monthData.reduce((s,d)=>s+d.gastosM,0);
  const totalGan   = totalIng - totalGas;
  const bestMonth  = [...monthData].sort((a,b)=>b.ganancia-a.ganancia)[0];
  const worstMonth = [...monthData].sort((a,b)=>a.ganancia-b.ganancia)[0];

  // Mini sparkline bar (inline)
  function spark(val, max, color){ return `<div style="display:inline-block;width:${Math.max(4,Math.round(val/max*80))}px;height:8px;background:${color};border-radius:2px;vertical-align:middle"></div>`; }

  // Build acumulado chart (last 6 months reversed for chronological)
  const chartMonths = [...monthData].reverse().slice(-6);
  const chartMaxIng = Math.max(...chartMonths.map(d=>d.ingresos),1);
  const chartMaxGas = Math.max(...chartMonths.map(d=>d.gastosM),1);
  const chartMax = Math.max(chartMaxIng, chartMaxGas, 1);

  const barChartHtml = chartMonths.map(d=>`
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
      <div style="font-size:9px;color:var(--muted);text-align:center">${monthLabel(d.ym).split(' ')[0].substring(0,3)}</div>
      <div style="width:100%;display:flex;align-items:flex-end;gap:2px;height:80px">
        <div style="flex:1;background:rgba(212,175,55,0.5);border-radius:3px 3px 0 0;height:${Math.max(2,Math.round(d.ingresos/chartMax*80))}px;transition:height 0.5s" title="Ingresos: ${fmt(d.ingresos)}"></div>
        <div style="flex:1;background:rgba(239,68,68,0.5);border-radius:3px 3px 0 0;height:${Math.max(2,Math.round(d.gastosM/chartMax*80))}px;transition:height 0.5s" title="Gastos: ${fmt(d.gastosM)}"></div>
      </div>
      <div style="font-size:9px;font-weight:600;color:${d.ganancia>=0?'var(--accent3)':'var(--danger)'}">${d.ganancia>=0?'+':''}${fmt(d.ganancia).replace('$ ','')}</div>
    </div>`).join('');

  // Month rows
  const rowsHtml = monthData.map((d,i)=>{
    const isCurrentMonth = d.ym === todayStr().substring(0,7);
    const catHtml = Object.entries(d.porCat).length
      ? Object.entries(d.porCat).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<span style="background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:2px 7px;font-size:10px;color:var(--muted)">${k}: <b style="color:var(--text)">${fmt(v)}</b></span>`).join(' ')
      : '<span style="color:var(--muted);font-size:11px">Sin gastos</span>';

    return `<div style="background:var(--surface);border:1px solid ${isCurrentMonth?'rgba(212,175,55,0.4)':d.ym===bestMonth?.ym?'rgba(200,168,74,0.3)':'var(--border)'};border-radius:12px;padding:0;overflow:hidden;margin-bottom:12px">
      <!-- Header row -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;cursor:pointer;user-select:none" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
        <div style="display:flex;align-items:center;gap:14px">
          <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;min-width:160px">
            ${isCurrentMonth?'📍 ':''}${monthLabel(d.ym)}
            ${isCurrentMonth?`<span style="font-size:10px;color:var(--accent);font-family:'DM Mono',monospace;font-weight:400;margin-left:6px">MES ACTUAL</span>`:''}
            ${d.ym===bestMonth?.ym&&!isCurrentMonth?`<span style="font-size:10px;color:var(--accent3);font-family:'DM Mono',monospace;font-weight:400;margin-left:6px">⭐ MEJOR MES</span>`:''}
          </div>
          <div style="display:flex;gap:20px;flex-wrap:wrap">
            <div><span style="font-size:10px;color:var(--muted)">Ingresos</span><div style="font-size:14px;font-weight:700;color:var(--accent3)">${fmt(d.ingresos)}</div></div>
            <div><span style="font-size:10px;color:var(--muted)">Gastos</span><div style="font-size:14px;font-weight:700;color:var(--danger)">${fmt(d.gastosM)}</div></div>
            <div><span style="font-size:10px;color:var(--muted)">Ganancia</span><div style="font-size:14px;font-weight:800;color:${d.ganancia>=0?'var(--accent3)':'var(--danger)'}">${fmt(d.ganancia)}</div></div>
          </div>
        </div>
        <div style="font-size:18px;color:var(--muted)">▾</div>
      </div>
      <!-- Progress bar ingreso vs gasto -->
      <div style="height:4px;background:var(--surface2);margin:0 20px 0">
        ${d.ingresos+d.gastosM>0?`<div style="height:100%;width:${Math.round(d.ingresos/(d.ingresos+d.gastosM)*100)}%;background:linear-gradient(90deg,var(--accent3),var(--accent));border-radius:2px"></div>`:''}
      </div>
      <!-- Detail panel (collapsed by default except current month) -->
      <div style="display:${isCurrentMonth?'block':'none'};padding:16px 20px;border-top:1px solid var(--border);margin-top:0">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:14px">
          <div style="background:var(--surface2);border-radius:8px;padding:10px">
            <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Auditorías iniciadas</div>
            <div style="font-size:18px;font-weight:700;margin-top:4px">${d.nuevasAuds}</div>
          </div>
          <div style="background:var(--surface2);border-radius:8px;padding:10px">
            <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Informes entregados</div>
            <div style="font-size:18px;font-weight:700;margin-top:4px;color:var(--accent3)">${d.audsCompletadas}</div>
          </div>
          <div style="background:var(--surface2);border-radius:8px;padding:10px">
            <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Cuotas esperadas</div>
            <div style="font-size:18px;font-weight:700;margin-top:4px;color:var(--accent)">${fmt(d.cuotasEsperadas)}</div>
          </div>
          <div style="background:var(--surface2);border-radius:8px;padding:10px">
            <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Cuotas cobradas</div>
            <div style="font-size:18px;font-weight:700;margin-top:4px;color:var(--accent3)">${fmt(d.cuotasCobradas)}</div>
          </div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Gastos por categoría</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">${catHtml}</div>
        </div>
      </div>
    </div>`;
  }).join('');

  el.innerHTML = `
    <!-- SUMMARY BANNER -->
    <div style="background:linear-gradient(135deg,rgba(212,175,55,0.08),rgba(184,146,46,0.06));border:1px solid rgba(212,175,55,0.2);border-radius:14px;padding:20px 24px;margin-bottom:22px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px">
      <div>
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Período analizado (${months.length} mes${months.length>1?'es':''})</div>
        <div style="font-family:'Syne',sans-serif;font-size:13px;color:var(--muted)">${monthLabel(months[months.length-1])} → ${monthLabel(months[0])}</div>
      </div>
      <div style="display:flex;gap:28px;flex-wrap:wrap">
        <div style="text-align:center"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Total Ingresos</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--accent3)">${fmt(totalIng)}</div></div>
        <div style="text-align:center"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Total Gastos</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--danger)">${fmt(totalGas)}</div></div>
        <div style="text-align:center"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Ganancia Total</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:${totalGan>=0?'var(--accent3)':'var(--danger)'}">${fmt(totalGan)}</div></div>
      </div>
    </div>

    <!-- MINI BAR CHART -->
    <div class="card" style="margin-bottom:22px">
      <div class="card-title" style="margin-bottom:16px">📊 Últimos 6 meses — Ingresos vs Gastos</div>
      <div style="display:flex;gap:8px;align-items:flex-end;padding:4px 0">${barChartHtml}</div>
      <div style="display:flex;gap:16px;margin-top:12px">
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted)"><div style="width:12px;height:8px;background:rgba(212,175,55,0.5);border-radius:2px"></div>Ingresos</div>
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted)"><div style="width:12px;height:8px;background:rgba(239,68,68,0.5);border-radius:2px"></div>Gastos</div>
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted)"><div style="width:12px;height:8px;background:linear-gradient(90deg,var(--accent3),var(--danger));border-radius:2px"></div>Ganancia (número debajo)</div>
      </div>
    </div>

    <!-- BEST / WORST -->
    ${bestMonth||worstMonth?`<div class="grid-2" style="margin-bottom:22px">
      ${bestMonth?`<div style="background:rgba(200,168,74,0.08);border:1px solid rgba(200,168,74,0.25);border-radius:12px;padding:16px 20px"><div style="font-size:11px;color:var(--accent3);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">⭐ Mejor mes</div><div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800">${monthLabel(bestMonth.ym)}</div><div style="font-size:14px;color:var(--accent3);font-weight:700;margin-top:4px">${fmt(bestMonth.ganancia)} ganancia</div></div>`:''}
      ${worstMonth&&worstMonth.ym!==bestMonth?.ym?`<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:12px;padding:16px 20px"><div style="font-size:11px;color:var(--danger);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">📉 Mes más bajo</div><div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800">${monthLabel(worstMonth.ym)}</div><div style="font-size:14px;color:var(--danger);font-weight:700;margin-top:4px">${fmt(worstMonth.ganancia)} ganancia</div></div>`:''}
    </div>`:''}

    <!-- MONTHLY ROWS -->
    <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Detalle por mes <span style="font-size:10px;font-weight:400">(clic para expandir)</span></div>
    ${rowsHtml}`;
}

// ============================================================
// AUTH SYSTEM

// ── mg-crm.js ──
