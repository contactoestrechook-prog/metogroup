

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║         SISTEMA DE APROBACIÓN DEL CONSULTOR — REGLA PERMANENTE           ║
// ╠═══════════════════════════════════════════════════════════════════════════╣
// ║                                                                           ║
// ║  El proceso del cliente NO se completa automáticamente.                   ║
// ║  Requiere aprobación explícita del CONSULTOR ASIGNADO o ADMIN.            ║
// ║                                                                           ║
// ║  Flujo de aprobación:                                                     ║
// ║  1. Cliente finaliza acción (diagnóstico, documentos, etc.)               ║
// ║  2. Sistema registra en portal_hitos + alerta al equipo                   ║
// ║  3. Cliente ve pantalla "Tu tablero se está preparando"                   ║
// ║  4. Consultor/Admin revisa via previewBPCApproval()                       ║
// ║  5. Consultor aprueba via approveBPCTablero()                             ║
// ║  6. Sistema actualiza: bpc_tablero_approvals + auditoría + mapa           ║
// ║  7. Cliente accede al tablero completo de auditoría                       ║
// ║  8. Alerta de confirmación al cliente (email futuro)                      ║
// ║                                                                           ║
// ║  NUNCA aprobar sin revisar el diagnóstico completo primero.               ║
// ║  NUNCA marcar auditoría como completada sin aprobación del consultor.     ║
// ║                                                                           ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

// ═══ BPC TABLERO APPROVAL SYSTEM ═══
function approveBPCTablero(clienteId){
  const approvals = S.get('bpc_tablero_approvals')||[];
  const ap = approvals.find(a=>String(a.clienteId)===String(clienteId));
  if(!ap){ toast('⚠️ No se encontró el registro de aprobación'); return; }

  // Marcar aprobación
  ap.aprobado = true;
  ap.fechaAprobacion = new Date().toISOString();
  ap.aprobadoPor = currentUser?.nombre||'Admin';
  S.set('bpc_tablero_approvals', approvals);

  // ── Actualizar la auditoría vinculada ──
  const auds = S.get('auditorias')||[];
  const aud = auds.find(a=>String(a.clienteId)===String(clienteId));
  if(aud){
    aud.diagnostico_ok = true;
    aud.diagnostico_aprobado = true;
    aud.diagnostico_aprobado_por = currentUser?.nombre||'Admin';
    aud.diagnostico_aprobado_fecha = new Date().toISOString().split('T')[0];
    // Avanzar estado de la auditoría
    if(aud.estado === 'Pendiente' || aud.estado === 'Iniciada'){
      aud.estado = 'En proceso';
    }
    S.set('auditorias', auds);
  }

  // ── Registrar hito en el historial del cliente ──
  const hitos = S.get('portal_hitos')||[];
  hitos.unshift({
    id: Date.now(),
    clienteId,
    nombre: 'Tablero de auditoría activado',
    fecha: new Date().toISOString().split('T')[0],
    hora: new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}),
    estado: 'completado',
    tipo: 'aprobacion_consultor',
    notas: 'Aprobado por '+ap.aprobadoPor+'. El cliente ya puede acceder al tablero completo.',
  });
  S.set('portal_hitos', hitos.slice(0,200));

  // ── Alerta de confirmación al equipo ──
  agenteAlerta(
    '✅ Tablero activado — '+ap.clienteNombre,
    `El tablero de auditoría BPC:2026 fue aprobado y activado para ${ap.clienteNombre}.\n\nAprobado por: ${ap.aprobadoPor}\nScore diagnóstico: ${ap.score}/100\nFecha aprobación: ${new Date().toLocaleDateString('es-AR')}\n\nEl cliente ya puede acceder al tablero completo de auditoría.`
    + 'Próximo paso: coordinar fechas de auditoría in-situ con el consultor asignado.'
  );

  toast('✅ Tablero activado para '+ap.clienteNombre+'. El cliente ya tiene acceso.');

  // Re-renderizar según contexto
  if(typeof renderDashboard === 'function') renderDashboard();
  if(typeof renderBPCScore === 'function' && document.getElementById('page-bpc_score')?.classList.contains('active')) renderBPCScore();
}

function previewBPCApproval(clienteId){
  const diag=(S.get('portal_diagnostico')||[]).find(d=>String(d.clienteId)===String(clienteId));
  const cli=S.get('clientes').find(c=>String(c.id)===String(clienteId));
  if(!diag){toast('⚠️ Diagnóstico no encontrado');return;}
  const score=calcBPCScore(diag);
  const nivel=getBPCNivel(score);
  
  let m=document.getElementById('bpc-approval-modal');
  if(!m){m=document.createElement('div');m.className='modal-overlay';m.id='bpc-approval-modal';m.innerHTML='<div class="modal" style="width:600px;max-width:95vw;max-height:85vh;overflow-y:auto"></div>';document.body.appendChild(m)}
  
  m.querySelector('.modal').innerHTML=`
    <div class="modal-head">
      <div class="modal-title">Diagnóstico — ${cli?.nombre||'Cliente'}</div>
      <button class="modal-close" onclick="closeModal('bpc-approval-modal')">✕</button>
    </div>
    <div class="modal-body">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:28px;margin-bottom:4px">${nivel.icon}</div>
        <div style="font-family:'Syne',sans-serif;font-size:36px;font-weight:800;color:${nivel.color}">${score}/100</div>
        <div style="font-size:13px;color:${nivel.color};font-weight:700">${nivel.nombre}</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:20px">
        ${BPC_DIMENSIONES.map(dim=>{
          const ds=calcDimScore(diag,dim);
          const pct=dim.maxPts>0?Math.round(ds/dim.maxPts*100):0;
          return '<div style="background:var(--surface2);border-radius:10px;padding:12px;text-align:center"><div style="font-size:14px;margin-bottom:4px">'+dim.icon+'</div><div style="font-size:9px;color:var(--muted);margin-bottom:2px">'+dim.nombre+'</div><div style="font-family:\'Syne\',sans-serif;font-size:16px;font-weight:800;color:'+dim.color+'">'+ds+'/'+dim.maxPts+'</div><div style="height:3px;background:var(--surface3);border-radius:2px;margin-top:6px"><div style="height:100%;width:'+pct+'%;background:'+dim.color+';border-radius:2px;opacity:0.6"></div></div></div>'}).join('')}
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;padding-top:14px;border-top:1px solid var(--border)">
        <button class="btn btn-secondary" onclick="closeModal('bpc-approval-modal')">Cerrar</button>
        <button class="btn btn-primary" onclick="closeModal('bpc-approval-modal');approveBPCTablero('${clienteId}')" style="background:linear-gradient(135deg,rgba(200,168,74,0.2),rgba(6,214,160,0.12));border-color:rgba(200,168,74,0.3);color:var(--accent3)">✓ Aprobar y activar tablero</button>
      </div>
    </div>`;
  m.classList.add('open');
}

// ═══════════════════════════════════════════════════════════
// TABLERO DE AUDITORÍA BPC 72001 — Módulo integrado
// ═══════════════════════════════════════════════════════════


// ═══ BRIDGE: Open BPC Tablero from Auditorias ═══
function openBPCAuditTablero(audId, clienteName, clienteId){
  // Store context so renderPortalAuditoria knows which client
  window._bpcAuditContext = {audId, clienteName, clienteId};
  showPage('portal_auditoria');
}
function renderPortalAuditoria(){
  const el=document.getElementById('portal-auditoria-content');
  if(!el)return;
  
  const userRole = currentUser ? getPrimaryRole(currentUser) : 'client';
  const isAdmin = ['dueno','admin'].includes(userRole);
  const isAuditor = userRole === 'consultor';
  const isClient = userRole === 'cliente';
  const canEdit = isAdmin || isAuditor;
  
  let clientName = 'Cliente';
  let clienteId = null;
  
  if(isClient && currentUser){
    const cli = S.get('clientes').find(c=>c.id===currentUser.clienteId);
    clientName = cli?.nombre || currentUser.nombre || 'Cliente';
    clienteId = currentUser.clienteId;
  } else if(window._bpcAuditContext){
    clientName = window._bpcAuditContext.clienteName || 'Cliente';
    clienteId = window._bpcAuditContext.clienteId;
  } else {
    const auds = S.get('auditorias');
    if(auds.length){
      el.innerHTML = '<div style="max-width:600px;margin:40px auto"><div style="font-family:\'Syne\',sans-serif;font-size:22px;font-weight:800;margin-bottom:20px">Seleccione una auditoría</div>' +
        auds.map(a=>'<div onclick="openBPCAuditTablero('+a.id+',\''+((a.clienteNombre||'').replace(/'/g,"\\'"))+'\','+a.clienteId+')" style="padding:16px;background:var(--surface);border:1px solid var(--border);border-radius:10px;margin-bottom:8px;cursor:pointer;transition:border-color 0.15s" onmouseover="this.style.borderColor=\'var(--accent3)\'" onmouseout="this.style.borderColor=\'var(--border)\'"><div style="font-weight:600">'+a.clienteNombre+'</div><div style="font-size:11px;color:var(--muted);margin-top:2px">'+a.tipo+' · '+(a.auditor||'Sin auditor')+' · '+badge(a.estado)+'</div></div>').join('') +
        '</div>';
      return;
    }
  }

  // Get auditor name
  let consultorName = 'Consultor asignado';
  if(window._bpcAuditContext?.audId){
    const aud = S.get('auditorias').find(a=>a.id==window._bpcAuditContext.audId);
    if(aud?.consultor) consultorName = aud.consultor;
    if(aud?.auditor) consultorName = aud.auditor;
  } else if(isClient){
    const aud = S.get('auditorias').find(a=>a.clienteId===clienteId);
    if(aud?.consultor) consultorName = aud.consultor;
    if(aud?.auditor) consultorName = aud.auditor;
  }

  const storageKey = 'bpc_audit_' + (clienteId || currentUser?.clienteId || 'demo');
  let auditData = null;
  try { auditData = JSON.parse(localStorage.getItem(storageKey)); } catch(e){}

  // ── Construir datos reales desde Supabase/caché ──
  const _ctxAudId = window._bpcAuditContext?.audId || null;
  const _aud = _ctxAudId
    ? (S.get('auditorias')||[]).find(a=>a.id===Number(_ctxAudId))
    : (S.get('auditorias')||[]).find(a=>String(a.clienteId)===String(clienteId));
  const _diag = (S.get('portal_diagnostico')||[]).find(d=>String(d.clienteId)===String(clienteId));
  const _portalAcc = (S.get('portal_clientes')||[]).find(p=>String(p.clienteId)===String(clienteId));
  const _adminAcc = (S.get('admin_empresa_acceso')||[]).find(a=>String(a.clienteId)===String(clienteId));
  const _exams = JSON.parse(localStorage.getItem('METO_agente_historial')||'[]')
    .filter(r=>String(r.auditoriaId)===String(_aud?.id));

  const _fmtDate = f => { if(!f) return ''; try{ const d=new Date(f+'T12:00:00'); return d.getDate()+' '+['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][d.getMonth()]+' '+d.getFullYear(); }catch(e){return f;} };
  const _fmtDay  = f => { if(!f) return ''; try{ return String(new Date(f+'T12:00:00').getDate()); }catch(e){return '';} };
  const _fmtMon  = f => { if(!f) return ''; try{ return ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'][new Date(f+'T12:00:00').getMonth()]; }catch(e){return '';} };

  // Progreso por etapa real (0-100)
  const _diagPct    = (_diag?.completo || _aud?.diagnostico_ok) ? 100 : 0;
  const _equipoPct  = _adminAcc?.equipoCompleto ? 100 : 0;
  const _examPct    = _exams.length > 0 ? Math.min(100, Math.round(_exams.length / 4 * 100)) : 0;
  const _docPct     = _aud?.fDoc ? 100 : 0;
  const _insituPct  = _aud?.fInsitu ? 100 : 0;
  const _informePct = (_aud?.resultado && _aud?.fInforme) ? 100 : 0;

  // Cronograma desde fechas reales
  const _schedule = [];
  if(_aud?.fDoc)        _schedule.push({day:_fmtDay(_aud.fDoc),       month:_fmtMon(_aud.fDoc),       title:'Auditoría documental',    time:''});
  if(_aud?.fInsitu)     _schedule.push({day:_fmtDay(_aud.fInsitu),    month:_fmtMon(_aud.fInsitu),    title:'Auditoría in situ',       time:''});
  if(_aud?.fExterna)    _schedule.push({day:_fmtDay(_aud.fExterna),   month:_fmtMon(_aud.fExterna),   title:'Auditoría comunicaciones', time:''});
  if(_aud?.fPrep)       _schedule.push({day:_fmtDay(_aud.fPrep),      month:_fmtMon(_aud.fPrep),      title:'Preparación informe',     time:''});
  if(_aud?.fInforme)    _schedule.push({day:_fmtDay(_aud.fInforme),   month:_fmtMon(_aud.fInforme),   title:'Entrega de informe',      time:''});
  if(_aud?.fSeguimiento)_schedule.push({day:_fmtDay(_aud.fSeguimiento),month:_fmtMon(_aud.fSeguimiento),title:'Seguimiento',           time:''});

  if(!auditData){
    auditData = {
      dims:[
        {progress:_diagPct,   checks:[_diagPct===100?1:0,0,0,0,0,0,0,0], observations:[], chatMsgs:[], schedule:_schedule.slice(0,1)},
        {progress:_equipoPct, checks:[_equipoPct===100?1:0,0,0,0,0,0],   observations:[], chatMsgs:[], schedule:_schedule.slice(1,2)},
        {progress:_examPct,   checks:_exams.slice(0,7).map(()=>1),        observations:[], chatMsgs:[], schedule:_schedule.slice(0,1)},
        {progress:_diagPct>0?Math.round(_diagPct*0.3):0, checks:[_diagPct>0?1:0,0,0,0,0,0], observations:[], chatMsgs:[], schedule:_schedule.slice(0,1)},
        {progress:_docPct,    checks:[_docPct===100?1:0,0,0,0,0,0],      observations:[], chatMsgs:[], schedule:_schedule.slice(0,2)},
        {progress:_informePct,checks:[_informePct===100?1:0,0,0,0,0,0],  observations:[], chatMsgs:[], schedule:_schedule.slice(-2)}
      ],
      finalized:!!_aud?.resultado,
      score:_aud?.resultado||null,
      level:null,
      startDate:_aud?.fInicio ? _fmtDate(_aud.fInicio) : todayStr()
    };
    // Persist for session
    try{ localStorage.setItem(storageKey, JSON.stringify(auditData)); }catch(e){}
  } else {
    // Update with fresh real data
    auditData.dims[0].progress = _diagPct;
    auditData.dims[1].progress = _equipoPct;
    auditData.dims[2].progress = _examPct;
    auditData.dims[4].progress = _docPct;
    if(_schedule.length) {
      auditData.dims.forEach((d,i)=>{ if(!d.schedule.length && _schedule[i]) d.schedule=[_schedule[i]]; });
    }
    try{ localStorage.setItem(storageKey, JSON.stringify(auditData)); }catch(e){}
  }

  const DIMS_META=[
    {name:'Liderazgo y Estrategia',short:'LIDERAZGO',
      checklist:['Plan estratégico comercial','Acta revisión anual','Organigrama comercial','Presupuesto aprobado','Misión y valores','Matriz de KPIs','Seguimiento mensual','Mandato del responsable'],
      what:'Evalúa cómo la dirección integra la función comercial en la planificación estratégica.',
      why:'Sin liderazgo comprometido, los procesos de venta operan de forma reactiva. Es la base de las demás dimensiones.'},
    {name:'Capital Humano',short:'RRHH',
      checklist:['Perfiles de cargo','Proceso de selección','Programa de inducción','Plan capacitación','Evaluación desempeño','Esquema incentivos'],
      what:'Analiza cómo la empresa selecciona, forma, evalúa y retiene a su equipo comercial.',
      why:'Un vendedor sin formación adecuada genera promesas incumplibles y daño reputacional.'},
    {name:'Procesos de Venta',short:'VENTAS',
      checklist:['Proceso documentado','Propuesta de valor','Materiales de venta','Pipeline semanal','Onboarding clientes','Gestión reclamos','Post-venta'],
      what:'Examina si el proceso de venta está documentado de principio a fin.',
      why:'Un proceso sin documentar depende de la memoria individual y se pierde con la rotación.'},
    {name:'Marketing Digital',short:'MARKETING',
      checklist:['Manual identidad','Calendario editorial','Aprobación contenido','Protocolo crisis','Captación leads','Métricas digital'],
      what:'Revisa la presencia digital como canal comercial.',
      why:'El 80% investiga online antes de contactar. La presencia digital ES la primera impresión.'},
    {name:'Tecnología y CRM',short:'TECH',
      checklist:['CRM implementado','Pipeline en CRM','Integración email','Herramientas cotización','Política herramientas','Reportes CRM'],
      what:'Evalúa herramientas tecnológicas que soportan la gestión comercial.',
      why:'Gestionar clientes en Excel impide escalar.'},
    {name:'Ética y Gobernanza',short:'ÉTICA',
      checklist:['Código conducta','Auditoría materiales','Evaluación anual','Canal denuncias','Privacidad datos','Revisión legal'],
      what:'Verifica que las prácticas comerciales sean éticas y legales.',
      why:'Una venta con promesas falsas es una demanda esperando a ocurrir.'}
  ];

  function totalP(){return Math.round(auditData.dims.reduce((a,d)=>a+d.progress,0)/auditData.dims.length)}
  function saveAudit(){localStorage.setItem(storageKey,JSON.stringify(auditData))}

  let _calCurrentDim=-1;

  // ═══ INJECT CALIBRE STYLES ═══
  if(!document.getElementById('calibre-styles')){
    const sty=document.createElement('style');sty.id='calibre-styles';
    sty.textContent=`
    .cal-wrap{display:grid;grid-template-columns:1fr 440px;height:100%;overflow:hidden;font-family:'Manrope',system-ui,sans-serif}
    .cal-movement{position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;
      background:radial-gradient(ellipse at 48% 45%,#ede8da,#e4dece 30%,#d8d0be 55%,#ccc4b0 80%,#c0b8a4 100%)}
    .cal-movement::before{content:'';position:absolute;inset:-50%;
      background:conic-gradient(from 0deg,rgba(255,255,255,0) 0deg,rgba(255,255,255,0.08) 2deg,rgba(255,255,255,0) 4deg,rgba(255,255,255,0) 30deg,rgba(255,255,255,0.08) 32deg,rgba(255,255,255,0) 34deg,rgba(255,255,255,0) 60deg,rgba(255,255,255,0.08) 62deg,rgba(255,255,255,0) 64deg,rgba(255,255,255,0) 90deg,rgba(255,255,255,0.08) 92deg,rgba(255,255,255,0) 94deg,rgba(255,255,255,0) 120deg,rgba(255,255,255,0.08) 122deg,rgba(255,255,255,0) 124deg,rgba(255,255,255,0) 150deg,rgba(255,255,255,0.08) 152deg,rgba(255,255,255,0) 154deg,rgba(255,255,255,0) 180deg,rgba(255,255,255,0.08) 182deg,rgba(255,255,255,0) 184deg,rgba(255,255,255,0) 210deg,rgba(255,255,255,0.08) 212deg,rgba(255,255,255,0) 214deg,rgba(255,255,255,0) 240deg,rgba(255,255,255,0.08) 242deg,rgba(255,255,255,0) 244deg,rgba(255,255,255,0) 270deg,rgba(255,255,255,0.08) 272deg,rgba(255,255,255,0) 274deg,rgba(255,255,255,0) 300deg,rgba(255,255,255,0.08) 302deg,rgba(255,255,255,0) 304deg,rgba(255,255,255,0) 330deg,rgba(255,255,255,0.08) 332deg,rgba(255,255,255,0) 334deg,rgba(255,255,255,0) 360deg);pointer-events:none;z-index:1}
    .cal-movement::after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 30%,rgba(178,168,136,0.35) 65%,rgba(160,150,120,0.65) 100%);pointer-events:none;z-index:3}
    .cal-dial{position:relative;z-index:2}
    .cal-margin{position:absolute;z-index:4;font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;font-weight:400;color:rgba(90,80,60,0.6);letter-spacing:0.03em}
    .cal-margin-bl{bottom:24px;left:28px}
    .cal-margin-br{bottom:24px;right:28px}
    .cal-zoom{position:absolute;inset:0;z-index:100;display:none;background:#f7f3ea;overflow:hidden}
    .cal-zoom.active{display:flex;animation:calZoomIn 0.7s cubic-bezier(0.16,1,0.3,1)}
    @keyframes calZoomIn{0%{transform:scale(0.4);opacity:0;filter:blur(6px)}100%{transform:scale(1);opacity:1;filter:blur(0)}}
    .cal-zoom-content{display:grid;grid-template-columns:1fr 1fr;width:100%;height:100%}
    .cal-zoom-left{display:flex;flex-direction:column;padding:36px 44px;overflow-y:auto;border-right:1px solid rgba(140,115,55,0.15)}
    .cal-zoom-right{display:flex;flex-direction:column;padding:36px 44px;overflow-y:auto;background:#faf8f2}
    .cal-zoom-left::-webkit-scrollbar,.cal-zoom-right::-webkit-scrollbar{width:2px}
    .cal-zoom-left::-webkit-scrollbar-thumb,.cal-zoom-right::-webkit-scrollbar-thumb{background:rgba(140,115,55,0.15)}
    .cal-zback{display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8a7030;cursor:pointer;padding:6px 0;margin-bottom:16px;border:none;background:none}
    .cal-zback:hover{color:#6a5820}
    .cal-znum{font-family:'Cormorant Garamond',serif;font-size:100px;font-weight:300;color:rgba(140,115,55,0.07);line-height:1;margin-bottom:-34px}
    .cal-zname{font-family:'Cormorant Garamond',serif;font-size:34px;font-weight:400;color:#18120a;position:relative;z-index:1}
    .cal-zbar{height:3px;background:#e8e3d8;margin:20px 0;border-radius:2px;overflow:hidden}
    .cal-zbar-fill{height:100%;background:linear-gradient(90deg,#8a7030,#b89838);border-radius:2px;transition:width 1.2s cubic-bezier(0.16,1,0.3,1)}
    .cal-zstats{display:flex;gap:32px;margin-bottom:28px}
    .cal-zstat-val{font-family:'Cormorant Garamond',serif;font-size:34px;font-weight:300;color:#8a7030}
    .cal-zstat-lbl{font-size:9px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8a8068;margin-top:2px}
    .cal-zsec{margin-bottom:28px}
    .cal-zsec-title{font-size:10px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#8a7030;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid rgba(140,115,55,0.15)}
    .cal-zcheck{display:flex;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid rgba(140,115,55,0.05)}
    .cal-zcheck-box{width:18px;height:18px;border-radius:4px;border:2px solid #e8e3d8;display:flex;align-items:center;justify-content:center;font-size:10px;color:#8a7030;flex-shrink:0;cursor:pointer;transition:all 0.2s}
    .cal-zcheck-box.done{background:rgba(140,115,55,0.1);border-color:#8a7030}
    .cal-zcheck-box:hover{border-color:#8a7030}
    .cal-zcheck-text{font-size:13px;color:#322816}.cal-zcheck-text.done{color:#8a8068;text-decoration:line-through;text-decoration-color:#e8e3d8}
    .cal-zobs{padding:16px 18px;border-left:3px solid;border-radius:0 10px 10px 0;margin-bottom:10px;background:#f4f0e8}
    .cal-zobs.warn{border-color:#b89838}.cal-zobs.danger{border-color:#b83848}
    .cal-zobs-head{display:flex;justify-content:space-between;margin-bottom:6px}
    .cal-zobs-date{font-size:10px;color:#8a8068}
    .cal-zobs-tag{font-size:9px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;padding:3px 10px;border-radius:4px}
    .cal-zobs.warn .cal-zobs-tag{color:#8a7030;background:rgba(140,115,55,0.08)}
    .cal-zobs.danger .cal-zobs-tag{color:#b83848;background:rgba(184,56,72,0.06)}
    .cal-zobs-text{font-size:13px;color:#5a5038;line-height:1.8}
    .cal-zev{display:flex;gap:16px;align-items:center;padding:12px 0;border-bottom:1px solid rgba(140,115,55,0.05)}
    .cal-zev-day{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:300;min-width:32px;text-align:center}
    .cal-zev-mo{font-size:8px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#8a8068;min-width:32px;text-align:center}
    .cal-zev-info{font-size:13px;color:#5a5038;line-height:1.5}.cal-zev-info strong{color:#18120a;font-weight:700}
    .cal-zaccord{padding:16px 20px;border-radius:10px;background:#faf8f2;border:1px solid rgba(140,115,55,0.15);margin-bottom:10px;cursor:pointer;transition:border-color 0.2s}
    .cal-zaccord:hover{border-color:#8a7030}
    .cal-zaccord-q{font-family:'Cormorant Garamond',serif;font-size:17px;color:#322816}
    .cal-zaccord-a{font-size:13px;color:#5a5038;line-height:1.8;margin-top:12px;display:none}
    .cal-zaccord.open .cal-zaccord-a{display:block}
    .cal-zmech{border-radius:10px;background:#f4f0e8;border:1px solid rgba(140,115,55,0.15);overflow:hidden;margin-top:8px}
    .cal-panel{border-left:1px solid rgba(140,115,55,0.15);background:#faf8f2;display:flex;flex-direction:column;overflow:hidden}
    .cal-panel-hdr{padding:28px 32px 20px;border-bottom:1px solid rgba(140,115,55,0.15);flex-shrink:0}
    .cal-panel-brand{font-size:10px;font-weight:800;letter-spacing:0.35em;text-transform:uppercase;color:#8a7030;margin-bottom:2px}
    .cal-panel-model{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:300;color:#18120a;letter-spacing:0.02em}
    .cal-panel-ref{font-size:9px;font-weight:600;letter-spacing:0.15em;color:#8a8068;margin-top:4px;text-transform:uppercase}
    .cal-comp-list{flex:1;overflow-y:auto;padding:4px 0}
    .cal-comp-list::-webkit-scrollbar{width:2px}.cal-comp-list::-webkit-scrollbar-thumb{background:rgba(140,115,55,0.1)}
    .cal-comp{padding:20px 32px;border-bottom:1px solid rgba(140,115,55,0.06);cursor:pointer;transition:all 0.25s;position:relative}
    .cal-comp::before{content:'';position:absolute;left:0;top:0;bottom:0;width:0;background:#8a7030;transition:width 0.3s;opacity:0.5}
    .cal-comp:hover::before{width:3px}
    .cal-comp:hover{background:rgba(140,115,55,0.03)}
    .cal-comp-top{display:flex;align-items:center;gap:14px}
    .cal-jewel{width:10px;height:10px;border-radius:50%;flex-shrink:0;background:radial-gradient(circle at 35% 35%,#d04858,#b83848,#8a2838);box-shadow:0 0 3px #b83848,0 0 8px rgba(184,56,72,0.15);animation:calJewel 4s ease-in-out infinite}
    .cal-jewel.off{background:#e8e3d8;box-shadow:none;animation:none}
    @keyframes calJewel{0%,100%{box-shadow:0 0 3px #b83848,0 0 8px rgba(184,56,72,0.15)}50%{box-shadow:0 0 6px #b83848,0 0 16px rgba(184,56,72,0.3)}}
    .cal-comp-name{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:400;color:#322816;flex:1}
    .cal-comp-pct{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:300;color:#8a7030}
    .cal-comp-pct span{font-size:12px;color:#8a8068}
    .cal-comp-gauge{height:2.5px;background:#e8e3d8;border-radius:2px;margin-top:10px;overflow:hidden}
    .cal-comp-gauge-fill{height:100%;border-radius:2px;background:linear-gradient(90deg,#8a7030,#b89838);transition:width 2s cubic-bezier(0.16,1,0.3,1)}
    .cal-comp-meta{display:flex;gap:16px;margin-top:8px;font-size:10px;color:#5a5038;font-weight:500}
    .cal-comp-meta .cdanger{color:#b83848;font-weight:700}
    .cal-comp-meta .cwarn{color:#8a7030;font-weight:700}
    .cal-psec{padding:18px 32px;border-top:1px solid rgba(140,115,55,0.15);flex-shrink:0}
    .cal-psec-lbl{font-size:8px;font-weight:800;letter-spacing:0.25em;text-transform:uppercase;color:#8a8068;margin-bottom:10px}
    .cal-pev{display:flex;gap:14px;align-items:center;padding:7px 0}
    .cal-pev-day{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:300;min-width:28px;text-align:center;color:#18120a}
    .cal-pev-mo{font-size:8px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#8a8068}
    .cal-pev-info{font-size:12px;color:#322816;font-weight:500}
    @media(max-width:900px){.cal-wrap{grid-template-columns:1fr}.cal-panel{display:none}.cal-zoom-content{grid-template-columns:1fr}.cal-zoom-right{display:none}}
    `;
    document.head.appendChild(sty);
  }

  // ═══ RENDER ═══
  function render(){
    const events=[];
    auditData.dims.forEach((d,i)=>(d.schedule||[]).forEach(s=>events.push(s)));

    el.innerHTML=`
    <div class="cal-wrap">
      <div class="cal-movement">
        <div class="cal-margin cal-margin-bl">${consultorName}</div>
        <div class="cal-margin cal-margin-br">${auditData.startDate||'01 Marzo 2026'}</div>
        <div class="cal-dial"><canvas id="cal-cvs"></canvas></div>
        <div class="cal-zoom" id="cal-zoom"><div class="cal-zoom-content" id="cal-zoom-content"></div></div>
      </div>
      <div class="cal-panel">
        <div class="cal-panel-hdr">
          <div class="cal-panel-brand">MetoGroup</div>
          <div class="cal-panel-model">Calibre BPC</div>
          <div class="cal-panel-ref">Ref. 72001 · Buenas Prácticas Comerciales</div>
        </div>
        <div class="cal-comp-list">${auditData.dims.map((d,i)=>{
          const m=DIMS_META[i];const done=d.checks.filter(Boolean).length;
          const hasDanger=d.observations?.some(o=>o.sev==='danger');
          const hasWarn=d.observations?.some(o=>o.sev==='warn');
          return`<div class="cal-comp" onclick="window._calOpenDim(${i})">
            <div class="cal-comp-top">
              <div class="cal-jewel${d.progress>0?'':' off'}"></div>
              <div class="cal-comp-name">${m.name}</div>
              <div class="cal-comp-pct">${d.progress}<span>%</span></div>
            </div>
            <div class="cal-comp-gauge"><div class="cal-comp-gauge-fill" style="width:0" data-w="${d.progress}%"></div></div>
            <div class="cal-comp-meta">
              <span>${done}/${m.checklist.length} evidencia</span>
              ${hasDanger?`<span class="cdanger">${(d.observations||[]).filter(o=>o.sev==='danger').length} no conformidad</span>`:''}
              ${hasWarn&&!hasDanger?`<span class="cwarn">${(d.observations||[]).length} obs.</span>`:''}
            </div>
          </div>`}).join('')}</div>
        <div class="cal-psec">
          <div class="cal-psec-lbl">Score de madurez</div>
          <div style="font-family:'Cormorant Garamond',serif;font-size:14px;color:#8a8068;font-style:italic">Disponible al finalizar la auditoría</div>
        </div>
        <div class="cal-psec">
          <div class="cal-psec-lbl">Próximas fechas</div>
          ${events.slice(0,3).map(ev=>`<div class="cal-pev">
            <div><div class="cal-pev-day">${ev.day}</div><div class="cal-pev-mo">${ev.month}</div></div>
            <div class="cal-pev-info">${ev.title}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>`;

    setTimeout(()=>{
      document.querySelectorAll('.cal-comp-gauge-fill[data-w]').forEach(e=>{e.style.width=e.dataset.w});
      initCalibreCanvas();
    },100);
  }

  // ═══ CANVAS ═══
  function initCalibreCanvas(){
    const cvs=document.getElementById('cal-cvs');if(!cvs)return;
    const ctx=cvs.getContext('2d');
    let W,H,cx,cy,Rc;
    function size(){
      const p=cvs.parentElement.parentElement;
      const sz=Math.min(p.offsetWidth,p.offsetHeight)*0.86;
      W=H=Math.round(sz*2);cx=W/2;cy=H/2;Rc=W*0.42;
      cvs.width=W;cvs.height=H;cvs.style.width=sz+'px';cvs.style.height=sz+'px';
    }
    size();
    let st=null;
    function draw(ts){
      if(!st)st=ts;const t=(ts-st)/1000;
      if(!document.getElementById('cal-cvs'))return;
      ctx.clearRect(0,0,W,H);
      const tp=totalP();const s=W/800;

      // CASE BODY
      const caseR=Rc*1.16;
      ctx.beginPath();ctx.arc(cx+s*4,cy+s*6,caseR+s*4,0,Math.PI*2);ctx.fillStyle='rgba(0,0,0,0.08)';ctx.fill();
      ctx.beginPath();ctx.arc(cx+s*2,cy+s*3,caseR+s*2,0,Math.PI*2);ctx.fillStyle='rgba(0,0,0,0.05)';ctx.fill();
      const caseGrad=ctx.createRadialGradient(cx-Rc*0.3,cy-Rc*0.3,Rc*0.5,cx,cy,caseR+s*6);
      caseGrad.addColorStop(0,'rgba(220,190,120,0.2)');caseGrad.addColorStop(0.5,'rgba(180,148,80,0.15)');caseGrad.addColorStop(1,'rgba(140,110,50,0.1)');
      ctx.beginPath();ctx.arc(cx,cy,caseR+s*4,0,Math.PI*2);ctx.fillStyle=caseGrad;ctx.fill();
      ctx.strokeStyle='rgba(140,115,55,0.18)';ctx.lineWidth=s*2;ctx.stroke();
      ctx.beginPath();ctx.arc(cx,cy,caseR+s*2,0,Math.PI*2);ctx.strokeStyle='rgba(255,240,180,0.06)';ctx.lineWidth=s*1;ctx.stroke();

      // FLUTED BEZEL
      const bR=Rc*1.06;const bezelInner=bR-s*8;
      const bezelGrad=ctx.createRadialGradient(cx-Rc*0.2,cy-Rc*0.2,Rc*0.8,cx,cy,bR+s*4);
      bezelGrad.addColorStop(0,'rgba(200,170,90,0.1)');bezelGrad.addColorStop(1,'rgba(140,110,50,0.06)');
      ctx.beginPath();ctx.arc(cx,cy,bR+s*3,0,Math.PI*2);ctx.arc(cx,cy,bezelInner,0,Math.PI*2,true);ctx.fillStyle=bezelGrad;ctx.fill();
      for(let i=0;i<120;i++){
        const a=Math.PI*2/120*i;const nextA=Math.PI*2/120*(i+0.5);
        const lightDot=Math.cos(a)*(-0.6)+Math.sin(a)*(-0.6);const lf=(lightDot+1)/2;
        ctx.beginPath();ctx.moveTo(cx+bezelInner*Math.cos(a),cy+bezelInner*Math.sin(a));ctx.lineTo(cx+(bR+s*2)*Math.cos(a),cy+(bR+s*2)*Math.sin(a));
        ctx.strokeStyle=`rgba(240,220,160,${0.02+lf*0.1})`;ctx.lineWidth=s*1.2;ctx.stroke();
        ctx.beginPath();ctx.moveTo(cx+bezelInner*Math.cos(nextA),cy+bezelInner*Math.sin(nextA));ctx.lineTo(cx+(bR+s*2)*Math.cos(nextA),cy+(bR+s*2)*Math.sin(nextA));
        ctx.strokeStyle=`rgba(80,60,20,${0.02+(1-lf)*0.06})`;ctx.lineWidth=s*0.8;ctx.stroke();
      }
      ctx.beginPath();ctx.arc(cx,cy,bR+s*3,0,Math.PI*2);ctx.strokeStyle='rgba(140,115,55,0.2)';ctx.lineWidth=s*1.5;ctx.stroke();
      ctx.beginPath();ctx.arc(cx,cy,bezelInner,0,Math.PI*2);ctx.strokeStyle='rgba(80,60,20,0.12)';ctx.lineWidth=s*1;ctx.stroke();
      ctx.beginPath();ctx.arc(cx,cy,bezelInner,Math.PI*0.8,Math.PI*1.8);ctx.strokeStyle='rgba(240,220,160,0.06)';ctx.lineWidth=s*1;ctx.stroke();
      ctx.beginPath();ctx.arc(cx,cy,Rc*1.0,0,Math.PI*2);ctx.strokeStyle='rgba(80,60,20,0.08)';ctx.lineWidth=s*3;ctx.stroke();

      // CHAPTER RING
      ctx.beginPath();ctx.arc(cx,cy,Rc*0.96,0,Math.PI*2);ctx.strokeStyle='rgba(80,60,20,0.05)';ctx.lineWidth=s*1;ctx.stroke();

      // HOUR MARKERS
      for(let i=0;i<12;i++){
        const a=Math.PI*2/12*i-Math.PI/2;const main=i%2===0;
        const r1=Rc*(main?0.84:0.87);const r2=Rc*0.94;const w=main?s*4:s*1.5;
        ctx.beginPath();ctx.moveTo(cx+r1*Math.cos(a)+s,cy+r1*Math.sin(a)+s);ctx.lineTo(cx+r2*Math.cos(a)+s,cy+r2*Math.sin(a)+s);
        ctx.strokeStyle='rgba(0,0,0,0.06)';ctx.lineWidth=w+s;ctx.lineCap='round';ctx.stroke();
        ctx.beginPath();ctx.moveTo(cx+r1*Math.cos(a),cy+r1*Math.sin(a));ctx.lineTo(cx+r2*Math.cos(a),cy+r2*Math.sin(a));
        ctx.strokeStyle=main?'rgba(140,115,55,0.6)':'rgba(140,115,55,0.25)';ctx.lineWidth=w;ctx.lineCap='round';ctx.stroke();
        ctx.beginPath();ctx.moveTo(cx+r1*Math.cos(a)-s*0.4,cy+r1*Math.sin(a)-s*0.4);ctx.lineTo(cx+r2*Math.cos(a)-s*0.4,cy+r2*Math.sin(a)-s*0.4);
        ctx.strokeStyle='rgba(255,240,200,0.18)';ctx.lineWidth=s*0.8;ctx.stroke();
      }

      // EMPRESA at 6
      const empY=cy+Rc*0.46;
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font=`800 ${s*9}px Manrope,sans-serif`;
      ctx.fillStyle='rgba(0,0,0,0.1)';ctx.fillText(clientName.toUpperCase(),cx+s*0.5,empY+s*0.8);
      ctx.fillStyle='rgba(48,36,10,0.5)';ctx.fillText(clientName.toUpperCase(),cx,empY);
      ctx.fillStyle='rgba(235,215,150,0.12)';ctx.fillText(clientName.toUpperCase(),cx-s*0.2,empY-s*0.3);

      // DIMENSION ARCS
      auditData.dims.forEach((d,i)=>{
        const m=DIMS_META[i];
        const sa=Math.PI*2/6*i-Math.PI/2+0.07;const ea=Math.PI*2/6*(i+1)-Math.PI/2-0.07;
        const pct=d.progress/100;
        ctx.beginPath();ctx.arc(cx,cy,Rc*0.76,sa,ea);ctx.strokeStyle='rgba(140,115,55,0.06)';ctx.lineWidth=s*8;ctx.lineCap='butt';ctx.stroke();
        if(pct>0){
          const pa=sa+(ea-sa)*pct;
          ctx.beginPath();ctx.arc(cx,cy,Rc*0.76,sa,pa);ctx.strokeStyle='rgba(140,115,55,0.1)';ctx.lineWidth=s*16;ctx.lineCap='round';ctx.stroke();
          ctx.beginPath();ctx.arc(cx,cy,Rc*0.76,sa,pa);ctx.strokeStyle='rgba(140,115,55,0.35)';ctx.lineWidth=s*8;ctx.lineCap='round';ctx.stroke();
          ctx.beginPath();ctx.arc(cx,cy,Rc*0.76,pa-0.04,pa);ctx.strokeStyle='rgba(212,180,64,0.55)';ctx.lineWidth=s*8;ctx.lineCap='round';ctx.stroke();
        }
        // JEWEL
        const na=Math.PI*2/6*i-Math.PI/2;const nx=cx+Rc*0.76*Math.cos(na),ny=cy+Rc*0.76*Math.sin(na);
        if(d.progress>0){
          const glow=0.12+Math.sin(t*1.2+i*1.5)*0.06;
          ctx.beginPath();ctx.arc(nx,ny,s*14,0,Math.PI*2);ctx.fillStyle=`rgba(178,52,68,${0.04+glow*0.3})`;ctx.fill();
          ctx.beginPath();ctx.arc(nx,ny,s*10,0,Math.PI*2);ctx.strokeStyle=`rgba(140,115,55,${0.2+glow})`;ctx.lineWidth=s*1.2;ctx.stroke();
          const jg=ctx.createRadialGradient(nx-s*2,ny-s*2,0,nx,ny,s*7);
          jg.addColorStop(0,'rgba(220,90,100,0.9)');jg.addColorStop(0.5,'rgba(178,52,68,0.75)');jg.addColorStop(1,'rgba(140,40,52,0.5)');
          ctx.beginPath();ctx.arc(nx,ny,s*7,0,Math.PI*2);ctx.fillStyle=jg;ctx.fill();
          ctx.beginPath();ctx.arc(nx-s*1.5,ny-s*2,s*2,0,Math.PI*2);ctx.fillStyle='rgba(255,200,210,0.35)';ctx.fill();
        }else{
          ctx.beginPath();ctx.arc(nx,ny,s*5,0,Math.PI*2);ctx.fillStyle='rgba(200,192,176,0.2)';ctx.fill();
        }
        // LABEL
        const midA=sa+(ea-sa)/2;const lx=cx+Rc*0.6*Math.cos(midA),ly=cy+Rc*0.6*Math.sin(midA);
        ctx.save();ctx.translate(lx,ly);
        let rot=midA+Math.PI/2;if(rot>Math.PI/2&&rot<Math.PI*1.5)rot+=Math.PI;
        ctx.rotate(rot);ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.font=`800 ${s*11}px Manrope,sans-serif`;
        ctx.fillStyle='rgba(0,0,0,0.18)';ctx.fillText(m.short,s*0.8,s*1.2);
        ctx.fillStyle=d.progress>0?'rgba(48,36,10,0.85)':'rgba(100,88,60,0.22)';ctx.fillText(m.short,0,0);
        ctx.fillStyle=d.progress>0?'rgba(240,218,150,0.22)':'rgba(200,190,160,0.04)';ctx.fillText(m.short,-s*0.3,-s*0.5);
        ctx.restore();
      });

      // GEARS
      [{x:0.38,y:-0.36,r:16,teeth:8,sp:0.2,a:0.035},{x:-0.36,y:0.34,r:13,teeth:6,sp:-0.3,a:0.03},{x:0.35,y:0.38,r:10,teeth:8,sp:0.4,a:0.02}].forEach(g=>{
        const gx=cx+Rc*g.x,gy=cy+Rc*g.y;
        ctx.save();ctx.translate(gx,gy);ctx.rotate(t*g.sp);ctx.beginPath();
        for(let k=0;k<g.teeth;k++){const a1=Math.PI*2/g.teeth*k,a2=a1+Math.PI*2/g.teeth*0.35,a3=a2+Math.PI*2/g.teeth*0.15,a4=a3+Math.PI*2/g.teeth*0.35;ctx.lineTo(s*g.r*Math.cos(a1),s*g.r*Math.sin(a1));ctx.lineTo(s*(g.r+3)*Math.cos(a2),s*(g.r+3)*Math.sin(a2));ctx.lineTo(s*(g.r+3)*Math.cos(a3),s*(g.r+3)*Math.sin(a3));ctx.lineTo(s*g.r*Math.cos(a4),s*g.r*Math.sin(a4));}
        ctx.closePath();ctx.strokeStyle=`rgba(140,115,55,${g.a})`;ctx.lineWidth=s*0.7;ctx.stroke();
        ctx.beginPath();ctx.arc(0,0,s*g.r*0.3,0,Math.PI*2);ctx.strokeStyle=`rgba(140,115,55,${g.a*0.7})`;ctx.stroke();ctx.restore();
      });

      // CENTER
      ctx.beginPath();ctx.arc(cx+s*1,cy+s*2,Rc*0.25,0,Math.PI*2);ctx.fillStyle='rgba(0,0,0,0.06)';ctx.fill();
      ctx.beginPath();ctx.arc(cx,cy,Rc*0.26,0,Math.PI*2);ctx.strokeStyle='rgba(60,48,20,0.15)';ctx.lineWidth=s*3;ctx.stroke();
      const cg=ctx.createRadialGradient(cx-Rc*0.05,cy-Rc*0.05,0,cx,cy,Rc*0.24);
      cg.addColorStop(0,'rgba(48,40,28,0.94)');cg.addColorStop(0.6,'rgba(38,32,20,0.92)');cg.addColorStop(1,'rgba(30,26,16,0.88)');
      ctx.beginPath();ctx.arc(cx,cy,Rc*0.24,0,Math.PI*2);ctx.fillStyle=cg;ctx.fill();
      ctx.strokeStyle='rgba(180,140,50,0.25)';ctx.lineWidth=s*2;ctx.stroke();
      ctx.beginPath();ctx.arc(cx,cy,Rc*0.24,Math.PI*1.1,Math.PI*1.9);ctx.strokeStyle='rgba(240,220,160,0.08)';ctx.lineWidth=s*1;ctx.stroke();
      ctx.beginPath();ctx.arc(cx,cy,Rc*0.19,0,Math.PI*2);ctx.strokeStyle='rgba(140,115,55,0.06)';ctx.lineWidth=s*2;ctx.stroke();
      if(tp>0){ctx.beginPath();ctx.arc(cx,cy,Rc*0.19,-Math.PI/2,-Math.PI/2+Math.PI*2*(tp/100));ctx.strokeStyle='rgba(212,180,64,0.5)';ctx.lineWidth=s*2.5;ctx.lineCap='round';ctx.stroke();}
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font=`300 ${s*56}px 'Cormorant Garamond',serif`;ctx.fillStyle='rgba(234,228,214,0.95)';ctx.fillText(tp+'%',cx,cy-s*5);
      ctx.font=`700 ${s*8}px Manrope,sans-serif`;ctx.fillStyle='rgba(212,180,64,0.5)';ctx.fillText('AVANCE',cx,cy+s*28);

      // AUDIT HAND
      const baseSweep=(t*0.004167)%1;
      const handAngle=baseSweep*Math.PI*2-Math.PI/2;const handLen=Rc*0.72;const tailLen=Rc*0.12;
      ctx.save();ctx.translate(cx+s*1.5,cy+s*2);ctx.rotate(handAngle);
      ctx.beginPath();ctx.moveTo(0,-s*3);ctx.lineTo(handLen*0.4,-s*2.5);ctx.lineTo(handLen,0);ctx.lineTo(handLen*0.4,s*2.5);ctx.lineTo(0,s*3);ctx.lineTo(-tailLen,s*1.5);ctx.lineTo(-tailLen,-s*1.5);ctx.closePath();
      ctx.fillStyle='rgba(0,0,0,0.06)';ctx.fill();ctx.restore();
      ctx.save();ctx.translate(cx,cy);ctx.rotate(handAngle);
      ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(handLen*0.15,-s*3.5);ctx.lineTo(handLen*0.5,-s*2);ctx.lineTo(handLen*0.95,-s*0.5);ctx.lineTo(handLen,0);ctx.closePath();
      const tG=ctx.createLinearGradient(0,0,handLen,0);tG.addColorStop(0,'rgba(220,190,110,0.7)');tG.addColorStop(0.4,'rgba(200,170,90,0.6)');tG.addColorStop(1,'rgba(212,180,64,0.65)');ctx.fillStyle=tG;ctx.fill();
      ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(handLen*0.15,s*3.5);ctx.lineTo(handLen*0.5,s*2);ctx.lineTo(handLen*0.95,s*0.5);ctx.lineTo(handLen,0);ctx.closePath();
      const bG=ctx.createLinearGradient(0,0,handLen,0);bG.addColorStop(0,'rgba(160,130,60,0.6)');bG.addColorStop(1,'rgba(160,130,50,0.5)');ctx.fillStyle=bG;ctx.fill();
      ctx.beginPath();ctx.moveTo(s*4,0);ctx.lineTo(handLen-s*2,0);ctx.strokeStyle='rgba(255,240,180,0.15)';ctx.lineWidth=s*0.5;ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,-s*2.5);ctx.lineTo(-tailLen,-s*1.5);ctx.lineTo(-tailLen,s*1.5);ctx.lineTo(0,s*2.5);ctx.closePath();ctx.fillStyle='rgba(160,130,60,0.45)';ctx.fill();
      ctx.restore();
      // Pivot
      ctx.beginPath();ctx.arc(cx+s*0.5,cy+s*1,s*7,0,Math.PI*2);ctx.fillStyle='rgba(0,0,0,0.06)';ctx.fill();
      ctx.beginPath();ctx.arc(cx,cy,s*7,0,Math.PI*2);
      const pG=ctx.createRadialGradient(cx-s*2,cy-s*2,0,cx,cy,s*7);pG.addColorStop(0,'rgba(220,190,110,0.8)');pG.addColorStop(1,'rgba(140,110,50,0.6)');ctx.fillStyle=pG;ctx.fill();
      ctx.beginPath();ctx.arc(cx,cy,s*2.5,0,Math.PI*2);ctx.fillStyle='rgba(255,245,200,0.5)';ctx.fill();

      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);

    // Click on nodes
    cvs.addEventListener('click',e=>{
      const r=cvs.getBoundingClientRect();const sx=W/r.width,sy=H/r.height;
      const mx=(e.clientX-r.left)*sx,my=(e.clientY-r.top)*sy;
      for(let i=0;i<6;i++){
        const a=Math.PI*2/6*i-Math.PI/2;
        const nx=cx+Rc*0.76*Math.cos(a),ny=cy+Rc*0.76*Math.sin(a);
        if(Math.sqrt((mx-nx)**2+(my-ny)**2)<Rc*0.08){window._calOpenDim(i);return}
        const sa=Math.PI*2/6*i-Math.PI/2+0.07,ea=Math.PI*2/6*(i+1)-Math.PI/2-0.07;
        const midA=sa+(ea-sa)/2;const lx=cx+Rc*0.6*Math.cos(midA),ly=cy+Rc*0.6*Math.sin(midA);
        if(Math.sqrt((mx-lx)**2+(my-ly)**2)<Rc*0.1){window._calOpenDim(i);return}
      }
    });
    cvs.style.cursor='pointer';
    window.addEventListener('resize',size);
  }

  // ═══ ZOOM INTO DIMENSION ═══
  window._calOpenDim=function(i){
    _calCurrentDim=i;
    const d=auditData.dims[i];const m=DIMS_META[i];const done=d.checks.filter(Boolean).length;
    const ov=document.getElementById('cal-zoom');const ct=document.getElementById('cal-zoom-content');
    ov.classList.add('active');ov.style.animation='calZoomIn 0.7s cubic-bezier(0.16,1,0.3,1)';
    ct.innerHTML=`
      <div class="cal-zoom-left">
        <button class="cal-zback" onclick="window._calZoomOut()">← Volver al calibre</button>
        <div class="cal-znum">0${i+1}</div>
        <div class="cal-zname">${m.name}</div>
        <div class="cal-zbar"><div class="cal-zbar-fill" style="width:0" id="cal-zbar"></div></div>
        <div class="cal-zstats">
          <div><div class="cal-zstat-val">${d.progress}%</div><div class="cal-zstat-lbl">Avance</div></div>
          <div><div class="cal-zstat-val">${done}/${m.checklist.length}</div><div class="cal-zstat-lbl">Evidencia</div></div>
          <div><div class="cal-zstat-val">${(d.observations||[]).length}</div><div class="cal-zstat-lbl">Observaciones</div></div>
        </div>
        <div class="cal-zaccord" onclick="this.classList.toggle('open')"><div class="cal-zaccord-q">¿Qué evaluamos?</div><div class="cal-zaccord-a">${m.what}</div></div>
        <div class="cal-zaccord" onclick="this.classList.toggle('open')"><div class="cal-zaccord-q">¿Por qué importa?</div><div class="cal-zaccord-a">${m.why}</div></div>
        <div class="cal-zsec" style="margin-top:8px">
          <div class="cal-zsec-title">Checklist de evidencia</div>
          ${m.checklist.map((item,j)=>`<div class="cal-zcheck">
            <div class="cal-zcheck-box${d.checks[j]?' done':''}" ${canEdit?`onclick="window._calTogCheck(${i},${j})"`:''} style="${canEdit?'cursor:pointer':''}">${d.checks[j]?'✓':''}</div>
            <div class="cal-zcheck-text${d.checks[j]?' done':''}">${item}</div>
          </div>`).join('')}
        </div>
      </div>
      <div class="cal-zoom-right">
        <div class="cal-zsec">
          <div class="cal-zsec-title">Observaciones del auditor${canEdit?' <button onclick="window._calAddObs('+i+')" style="float:right;font-size:9px;background:rgba(140,115,55,0.08);border:1px solid rgba(140,115,55,0.15);border-radius:4px;padding:3px 10px;cursor:pointer;color:#8a7030;font-weight:700">+ Nueva</button>':''}</div>
          ${(d.observations||[]).length?(d.observations||[]).map(o=>`<div class="cal-zobs ${o.sev}">
            <div class="cal-zobs-head"><span class="cal-zobs-date">${o.date}</span><span class="cal-zobs-tag">${o.tag}</span></div>
            <div class="cal-zobs-text">${o.text}</div>
          </div>`).join(''):'<div style="font-size:13px;color:#8a8068;font-style:italic;padding:16px 0">Sin observaciones en esta dimensión.</div>'}
        </div>
        <div class="cal-zsec">
          <div class="cal-zsec-title">Agenda</div>
          ${(d.schedule||[]).length?(d.schedule||[]).map(sc=>`<div class="cal-zev">
            <div><div class="cal-zev-day">${sc.day}</div><div class="cal-zev-mo">${sc.month}</div></div>
            <div class="cal-zev-info"><strong>${sc.title}</strong><br>${sc.time}</div>
          </div>`).join(''):'<div style="font-size:13px;color:#8a8068;font-style:italic;padding:16px 0">Sin eventos agendados.</div>'}
        </div>
        <div class="cal-zsec">
          <div class="cal-zsec-title">Mecanismo interno</div>
          <div class="cal-zmech"><canvas id="cal-zcvs" width="500" height="320" style="width:100%;display:block"></canvas></div>
        </div>
      </div>`;
    setTimeout(()=>{document.getElementById('cal-zbar').style.width=d.progress+'%';_calDrawMech(i)},100);
  };

  window._calZoomOut=function(){
    const ov=document.getElementById('cal-zoom');
    ov.style.transition='opacity 0.3s,transform 0.3s';ov.style.opacity='0';ov.style.transform='scale(0.92)';
    setTimeout(()=>{ov.classList.remove('active');ov.style='';_calCurrentDim=-1},300);
  };

  window._calTogCheck=function(di,ci){
    auditData.dims[di].checks[ci]=auditData.dims[di].checks[ci]?0:1;
    const done=auditData.dims[di].checks.filter(Boolean).length;
    const total=DIMS_META[di].checklist.length;
    auditData.dims[di].progress=Math.round(done/total*100);
    saveAudit();render();
  };

  window._calAddObs=function(di){
    const text=prompt('Texto de la observación:');if(!text)return;
    const tag=prompt('Tipo: Conforme, Observación, Hallazgo, No Conformidad','Observación');if(!tag)return;
    const sevMap={'Conforme':'ok','Observación':'warn','Hallazgo':'warn','No Conformidad':'danger'};
    if(!auditData.dims[di].observations)auditData.dims[di].observations=[];
    auditData.dims[di].observations.push({date:new Date().toLocaleDateString('es-AR',{day:'2-digit',month:'short',year:'numeric'}),text,tag,sev:sevMap[tag]||'warn'});
    saveAudit();window._calOpenDim(di);
  };

  function _calDrawMech(di){
    const c=document.getElementById('cal-zcvs');if(!c)return;
    const x=c.getContext('2d');const W2=500,H2=320;let t0=null;
    function anim(ts){
      if(!t0)t0=ts;if(_calCurrentDim!==di)return;
      const t=(ts-t0)/1000;x.clearRect(0,0,W2,H2);
      const d=auditData.dims[di];const m=DIMS_META[di];const n=m.checklist.length;const cols=Math.ceil(n/4);
      m.checklist.forEach((item,j)=>{
        const col=j%cols;const row=Math.floor(j/cols);
        const gx=60+col*(W2-80)/cols;const gy=50+row*65;
        const done=d.checks[j];const r=16;const speed=done?0.3+j*0.08:0.04;
        x.save();x.translate(gx,gy);x.rotate(t*speed*(j%2?1:-1));x.beginPath();
        for(let k=0;k<8;k++){const a1=Math.PI*2/8*k,a2=a1+Math.PI*2/8*0.35,a3=a2+Math.PI*2/8*0.15,a4=a3+Math.PI*2/8*0.35;x.lineTo(r*Math.cos(a1),r*Math.sin(a1));x.lineTo((r+3)*Math.cos(a2),(r+3)*Math.sin(a2));x.lineTo((r+3)*Math.cos(a3),(r+3)*Math.sin(a3));x.lineTo(r*Math.cos(a4),r*Math.sin(a4));}
        x.closePath();x.strokeStyle=done?'rgba(140,115,55,0.35)':'rgba(180,170,150,0.12)';x.lineWidth=1;x.stroke();
        if(done){x.fillStyle='rgba(140,115,55,0.04)';x.fill()}
        x.beginPath();x.arc(0,0,3.5,0,Math.PI*2);x.fillStyle=done?'rgba(178,52,68,0.6)':'rgba(180,170,150,0.15)';x.fill();
        x.restore();
        x.font="600 9px Manrope,sans-serif";x.textAlign='left';x.textBaseline='middle';
        x.fillStyle=done?'rgba(58,48,24,0.7)':'rgba(180,170,150,0.35)';
        x.fillText(item.length>22?item.substring(0,22)+'…':item,gx+24,gy);
      });
      requestAnimationFrame(anim);
    }
    requestAnimationFrame(anim);
  }

  render();
}

function mclShow(){
  if(typeof currentUser === 'undefined' || !currentUser) return;
  const isClient=getUserRoles(currentUser).includes('cliente');
  const orb=document.getElementById('mcl-orb');
  const panel=document.getElementById('mcl-panel');
  if(orb) orb.style.display=isClient?'flex':'none';
  if(!isClient&&panel){panel.classList.remove('open');_mclOpen=false;}
}

function mclToggle(){
  const _orbEl=document.getElementById('mcl-orb');
  const _panEl=document.getElementById('mcl-panel');
  if(!_orbEl||!_panEl) return;
  _mclOpen=!_mclOpen;
  _panEl.classList.toggle('open',_mclOpen);
  _orbEl.style.display=_mclOpen?'none':'flex';
  if(_mclOpen&&!_mclInit){mclInitChat();_mclInit=true}
}

function mclInitChat(){
  const chat=document.getElementById('mcl-chat'); if(!chat) return;
  const nombre=currentUser?.nombre?.split(' ')[0]||'';
  const diag=getPortalDiagnostico();
  const hasDiag=diag&&diag.completo;
  
  let welcome='Bienvenido/a'+( nombre?', '+nombre:''  )+'. Soy <strong>MetoAssist</strong>, el asistente de proceso de MetoGroup. Lo acompa\u00f1o durante cada etapa de la auditor\u00eda BPCE 72001.';
  if(!hasDiag){
    welcome+='<br><br>Veo que todavía no completaste el diagnóstico inicial. Es el primer paso — te voy a guiar para que entiendas cada pregunta.';
  } else {
    welcome+='<br><br>Tu diagnóstico ya está completado. Puedo ayudarte a entender las observaciones del auditor, preparar la documentación que te piden, o explicarte cualquier parte del proceso.';
  }
  
  chat.innerHTML=`<div class="mcl-msg"><div class="mcl-bubble">${welcome}</div></div>`;
  
  // Context-aware chips
  const chips=document.getElementById('mcl-chips'); if(!chips) return;
  const aud=S.get('auditorias').find(a=>a.clienteId===currentUser?.clienteId);
  const etapa=aud?.estado||'inicio';
  const chipList=!hasDiag?[
    ['¿Qué es BPCE 72001?','Explicame qué es la norma BPCE 72001 y para qué sirve la auditoría'],
    ['¿Cómo es todo el proceso?','Contame todas las etapas de la auditoría de principio a fin'],
    ['¿Qué evalúa el diagnóstico?','¿Qué tipo de preguntas tiene el diagnóstico inicial y para qué sirve?'],
    ['¿Es confidencial?','¿Mis respuestas son confidenciales? ¿Quién las ve?'],
    ['¿Cuánto dura todo?','¿Cuánto tiempo lleva todo el proceso de auditoría?'],
  ]:etapa==='En Proceso'?[
    ['¿Qué documentos me faltan?','¿Qué documentos y capturas me están pidiendo y cómo los consigo?'],
    ['Acceso a Analytics','Explicame paso a paso cómo dar acceso de Visualizador a Google Analytics'],
    ['Acceso a Meta','¿Cómo agrego a MetoGroup como Analista en Meta Business Suite?'],
    ['Captura de ML','¿Qué tiene que mostrar la captura de mi panel de Mercado Libre?'],
    ['¿Qué viene después?','¿Cuáles son los próximos pasos en mi proceso ahora?'],
    ['Tengo una NC','El auditor marcó una No Conformidad. ¿Es grave? ¿Qué significa?'],
  ]:[
    ['¿Qué viene después?','¿Cuáles son los próximos pasos en mi proceso de auditoría?'],
    ['Tengo una NC','El auditor marcó una No Conformidad. ¿Qué significa exactamente?'],
    ['¿Qué es el PAC?','Explicame qué es el Plan de Acción Correctivo y cómo lo completo'],
    ['Mi BPC Score','¿Cómo se calcula mi score y qué significa mi nivel de madurez?'],
    ['¿Cuándo el informe?','¿En qué plazo llega el informe final y qué va a tener?'],
    ['¿Qué es la certificación?','¿Cuándo y cómo se emite el certificado BPC:2026?'],
  ];
  chips.innerHTML=chipList.map(([label,msg])=>`<div class="mcl-chip" onclick="mclSendChip('${msg.replace(/'/g,"\\'")}')">${label}</div>`).join('');
}

function mclSendChip(msg){
  document.getElementById('mcl-input').value=msg;
  mclSend();
}

function mclGetContext(){
  const cli=S.get('clientes').find(c=>c.id===currentUser?.clienteId);
  const aud=S.get('auditorias').find(a=>a.clienteId===currentUser?.clienteId);
  const diag=getPortalDiagnostico();
  const score=diag?calcBPCScore(diag):null;
  const nivel=score!==null?getBPCNivel(score):null;
  const docs=(S.get('portal_documentos')||[]).filter(d=>d.clienteId===currentUser?.clienteId);
  const pac=(S.get('portal_plan_accion')||[]).filter(p=>p.clienteId===currentUser?.clienteId);
  
  // Get audit tablero data if exists
  const storageKey='bpc_audit_'+(currentUser?.clienteId||'demo');
  let auditData=null;
  try{auditData=JSON.parse(localStorage.getItem(storageKey))}catch(e){}
  
  const docsSubidos=(S.get('portal_documentos_subidos')||[]).filter(d=>d.clienteId==currentUser?.clienteId);

  let ctx=`Usted es MetoAssist, el asistente de proceso de MetoGroup. Acompaña al cliente durante todo el proceso de auditoría BPCE 72001, desde la firma del contrato hasta la recepción del informe final.

IDENTIDAD Y ROL:
Su función es guiar el proceso, no implementar la norma. Su trabajo consiste en que el cliente comprenda qué está ocurriendo en cada etapa, qué debe hacer a continuación, cómo hacerlo de forma operativa (subir una captura, configurar un acceso, completar un formulario), y qué significa cada documento o comunicación que recibe. Se expresa en lenguaje claro y profesional, sin tecnicismos innecesarios.

━━━ LO QUE HACE ━━━

PROCESO: Explica cada etapa del proceso, qué viene a continuación, por qué existe y cuánto tiempo demanda.
DOCUMENTOS: Explica qué es cada documento que recibe el cliente (informe, PAC, DA-BPC, NC), qué significa y qué acción debe tomar.
HALLAZGOS: Explica qué es una NC Crítica, NC Mayor, NC Menor, una Observación y un Conforme. Con precisión, sin dramatizar ni minimizar.
SCORE: Interpreta el BPC Score del cliente, explica qué significa su nivel de madurez y cómo se calcula.
ACCESOS DIGITALES: Explica paso a paso cómo otorgar acceso a Google Analytics, Meta Business Suite, Search Console y TikTok. Guía cada paso técnico con claridad.
CAPTURAS: Explica con precisión cómo obtener cada captura de pantalla solicitada: dónde ingresar, qué seleccionar, qué debe mostrar la imagen.
DOCUMENTOS A SUBIR: Explica para qué sirve cada documento que se solicita, cómo obtenerlo y cómo cargarlo en el portal.
EXÁMENES: Si el cliente debe realizar un examen o diagnóstico, explica el propósito y el funcionamiento, sin anticipar resultados.
TERMINOLOGÍA: Define cualquier término técnico en lenguaje accesible. No asume que el cliente conoce la norma ni sus procedimientos.
CONTENCIÓN: Si el cliente manifiesta sentirse abrumado, lo orienta con calma. El proceso está diseñado para ser abordable.

━━━ LO QUE NUNCA HACE ━━━

NO implementa la norma: Si el cliente consulta sobre cómo armar su proceso de ventas, redactar su política comercial, qué CRM utilizar o cómo mejorar sus tiempos de respuesta — eso corresponde al consultor asignado, no a MetoAssist.

NO provee plantillas ni modelos de documentos: No redacta políticas, procesos, manuales, códigos de conducta, guiones de venta ni planes estratégicos. Puede explicar qué debe contener cada uno, pero no los produce.

NO anticipa el resultado de la auditoría: No indica si la empresa estará bien o mal, ni cuántas no conformidades podría tener.

NO toma posición: Si el cliente expresa disconformidad con el auditor o con el proceso, escucha, explica el procedimiento correspondiente y sugiere los canales formales disponibles.

NO utiliza lenguaje informal: Evita lunfardos, expresiones coloquiales ni vocabulario inapropiado para una comunicación profesional e institucional.

FRASES PARA CUANDO EL CLIENTE PIDE IMPLEMENTACIÓN:
— "Ese punto corresponde abordarlo con el consultor asignado, quien cuenta con la metodología para adaptarlo a las características específicas de su organización."
— "Mi función es orientarlo durante el proceso de auditoría. La etapa de implementación de mejoras es el paso siguiente y se trabaja en conjunto con el equipo de MetoGroup."
— "Puedo explicarle qué se está evaluando y por qué es relevante, pero el diseño de las soluciones es parte del trabajo que el equipo de MetoGroup realiza con cada cliente."

━━━ PROCESO COMPLETO BPCE 72001 ━━━

FASE 0 — Captación y firma (ya completada si ves este mensaje)
El cliente firmó el contrato. Esto es lo que habilitó el proceso.

FASE 1 — Apertura y diagnóstico
1. El cliente recibe el email de inicio con el instructivo de accesos digitales.
2. Se completa el diagnóstico BPC inicial desde el portal (primera actividad formal del proceso).
3. Se coordinan las fechas de auditoría con el consultor asignado.
4. El cliente recibe los códigos de examen para el equipo comercial, la gerencia y la dirección.
5. Se configuran los accesos a las plataformas digitales (Analytics, Meta, etc.).

FASE 2 — Evaluaciones (en paralelo)
- Los vendedores, el gerente y el director/dueño realizan sus evaluaciones individuales con código de acceso único.
- Leandro o Ariel llevan a cabo entrevistas individuales con el equipo.
- Los resultados se envían directamente a MetoGroup — el evaluado no tiene acceso a su propio score.

FASE 3 — Auditorías activas (en paralelo)
- Auditoría documental: el consultor revisa documentos, procesos y herramientas
- Auditoría in situ: visita presencial o por Meet, observación directa del equipo
- Auditoría de comunicaciones: tiempos de respuesta, scripts, ML, publicidad, agencias
- Auditoría digital: el sistema analiza automáticamente web, Instagram, Facebook, TikTok

FASE 4 — Elaboración y entrega
- El consultor carga los hallazgos, la IA genera el informe
- El consultor revisa y firma como responsable técnico
- Leandro o Ariel hacen la reunión de entrega de informe y presentan el informe
- Se acuerda el Plan de Acción Correctiva (PAC)
- Si el score lo permite, se emite la Certificación BPC:2026

━━━ DOCUMENTOS QUE EL CLIENTE TIENE QUE SUBIR ━━━

ACCESOS DIGITALES (Fase 1):
— Google Analytics 4: ir a analytics.google.com → Administrador → Acceso a la propiedad → Agregar usuario → auditor@metogroup.mx → rol Visualizador
— Google Search Console: ir a search.google.com/search-console → Configuración → Usuarios y permisos → Agregar usuario → auditor@metogroup.mx
— Meta Business Suite (Instagram y Facebook): ir a business.facebook.com → Configuración → Personas → Agregar → auditor@metogroup.mx → rol Analista
— TikTok: si tienen cuenta Business, agregar en Business Center. Si no, subir capturas de TikTok Analytics

CAPTURAS QUE SE PIDEN (Fase 3):
— Instagram Insights: abrir la app → perfil → Insights → tomar captura de los últimos 30 días (alcance, engagement, seguidores)
— Facebook: Meta Business Suite → Insights → captura del resumen mensual
— TikTok Analytics: app → perfil → herramientas para creadores → Analytics → captura del panel principal
— Mercado Libre: entrar al panel del vendedor → captura de reputación, % ventas completadas, % reclamos
— Meta Ads: Ads Manager → captura del resumen de campañas con inversión, alcance y ROAS
— WhatsApp Business: captura del historial reciente mostrando tiempos de respuesta

━━━ CONTEXTO DE ESTE CLIENTE ━━━
CLIENTE: ${cli?.nombre||currentUser?.nombre||'Cliente'}
EMPRESA: ${cli?.nombre||'N/A'}
AUDITORÍA: ${aud?aud.tipo+' · Estado: '+aud.estado:'Sin auditoría asignada'}
${aud?.auditor?'AUDITOR ASIGNADO: '+aud.auditor:''}
${aud?.fInsitu?'FECHA IN SITU: '+aud.fInsitu:''}
DIAGNÓSTICO: ${diag&&diag.completo?'Completado · Score: '+score+'/100 · Nivel: '+(nivel?.nombre||''):'Pendiente — primer paso a completar'}
DOCUMENTOS SUBIDOS AL PORTAL: ${docsSubidos.length} (${docsSubidos.filter(d=>d.leido).length} revisados por MetoGroup)
PLAN CORRECTIVO: ${pac.length} acciones (${pac.filter(p=>p.estado==='CERRADO').length} cerradas)

━━━ CLASIFICACIÓN DE HALLAZGOS ━━━
NC CRÍTICA: riesgo inmediato para el negocio. Plazo: 30 días. No es una catástrofe — es una prioridad urgente.
NC MAYOR: problema sistemático en un proceso. Plazo: 60 días. Requiere cambio estructural.
NC MENOR: detalle puntual sin impacto sistémico. Plazo: 90 días. Se corrige en la siguiente revisión.
OBSERVACIÓN: no es incumplimiento, pero conviene atenderlo. Sin plazo obligatorio.
CONFORME: el criterio se cumple. Nada que hacer.

━━━ NIVELES DE MADUREZ BPC:2026 ━━━
0-25: Inicial — sin procesos formales. Es el punto de partida más común.
26-50: En desarrollo — hay prácticas pero informales.
51-70: Definido — procesos documentados con implementación parcial.
71-85: Avanzado — buena implementación con oportunidades de mejora.
86-100: Optimizado — excelencia comercial demostrable y sostenida.`;

  if(auditData){
    const dims=['Liderazgo y Estrategia','Capital Humano','Procesos de Venta','Marketing Digital','Tecnología y CRM','Ética y Gobernanza'];
    ctx+='\nTABLERO DE AUDITORÍA:';
    auditData.dims.forEach((d,i)=>{
      ctx+='\n'+dims[i]+': '+d.progress+'% avance, '+d.checks.filter(Boolean).length+' checks, '+d.observations.length+' observaciones';
      if(d.observations.length){
        ctx+=' ['+d.observations.map(o=>o.tag+': '+o.text.substring(0,80)).join(' | ')+']';
      }
    });
    if(auditData.finalized) ctx+='\nAUDITORÍA FINALIZADA: Score '+auditData.score+' - '+auditData.level;
  }

  ctx+=`

NIVELES DE MADUREZ BPC 72001:
- 0-20: Inicial — la empresa no tiene procesos comerciales formales
- 21-40: En desarrollo — hay algunas prácticas pero informales y sin documentar
- 41-60: Definido — procesos documentados pero implementación parcial
- 61-80: Avanzado — buena implementación con oportunidades de mejora
- 81-100: Optimizado — excelencia comercial con mejora continua

TIPOS DE OBSERVACIÓN:
- Conforme: el requisito se cumple correctamente. No requiere acción.
- Observación: sugerencia de mejora, no es obligatoria pero se recomienda.
- Hallazgo: brecha detectada entre lo que dice la norma y lo que hace la empresa. Requiere plan de acción.
- No Conformidad: incumplimiento claro de un requisito. Requiere acción correctiva obligatoria con plazo. NO significa que reprobó — significa que hay trabajo por hacer.

EL PROCESO COMPLETO:
1. Diagnóstico inicial (cuestionario de 35 preguntas) → genera Score de Madurez
2. MetoGroup prepara el Tablero de Auditoría personalizado (48h)
3. Auditoría documental: el auditor revisa evidencia, checklists, documentos
4. Auditoría in-situ: el auditor visita la empresa, entrevista al equipo
5. Informe de auditoría: documento con todas las observaciones y score final
6. Plan de Acción Correctivo: la empresa trabaja en las no conformidades
7. Seguimiento: verificación de que se implementaron las correcciones
8. Certificación: si todo se cumple, se emite el certificado BPC 72001

REGLAS DE COMUNICACIÓN:
- Utilice español formal y profesional. Evite lunfardos, expresiones coloquiales y contracciones informales.
- Sin asteriscos, sin markdown, sin listas con viñetas — texto corrido y natural.
- Respuestas claras y concisas: 3 a 5 oraciones normalmente, hasta 8 si el tema lo requiere.
- Nunca invente datos sobre el cliente que no estén en el contexto disponible.
- Si no cuenta con información suficiente para responder, indique que consultará con el equipo.
- Mantenga un tono cálido pero institucional — el cliente puede estar confundido o preocupado.
- Siempre cierre con una orientación clara: "Si tiene alguna otra consulta...", "El consultor asignado estará en contacto...", etc.`;
  
  return ctx;
}

async function mclSend(){
  const input=document.getElementById('mcl-input');
  const msg=input.value.trim();
  if(!msg)return;
  input.value='';input.style.height='38px';
  
  const chat=document.getElementById('mcl-chat');
  chat.innerHTML+=`<div class="mcl-msg user"><div class="mcl-bubble">${msg.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</div></div>`;
  
  // Hide chips after first message
  document.getElementById('mcl-chips').style.display='none';
  
  // Typing indicator
  const typId='mcl-typ-'+Date.now();
  chat.innerHTML+=`<div id="${typId}" class="mcl-msg"><div class="mcl-bubble"><div class="mcl-typing"><div class="mcl-dot"></div><div class="mcl-dot"></div><div class="mcl-dot"></div></div></div></div>`;
  chat.scrollTop=chat.scrollHeight;
  
  _mclHist.push({role:'user',content:msg});
  
  // Get API key from usuarios store
  const apiKey=(S.get('usuarios').find(u=>u.apiKey)||{}).apiKey||'';
  if(!apiKey){
    document.getElementById(typId)?.remove();
    chat.innerHTML+=`<div class="mcl-msg"><div class="mcl-bubble">No puedo conectarme en este momento. Tu consulta fue registrada y el equipo de MetoGroup te va a responder a la brevedad.</div></div>`;
    chat.scrollTop=chat.scrollHeight;
    return;
  }
  
  try{
    const sysPrompt=mclGetContext();
    let apiMsgs=[..._mclHist];
    if(apiMsgs.length>20){
      apiMsgs=[{role:'user',content:'Resumen: el cliente viene preguntando sobre su auditoría BPC'},{role:'assistant',content:'Entendido, sigo ayudando.'},...apiMsgs.slice(-16)];
    }
    
    const resp=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:600,system:sysPrompt,messages:apiMsgs})
    });
    const data=await resp.json();
    const reply=data.content?.[0]?.text||'Disculpá, hubo un problema. Intentá de nuevo.';
    
    document.getElementById(typId)?.remove();
    _mclHist.push({role:'assistant',content:reply});
    
    // Format: bold between ** **
    const formatted=reply.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
    chat.innerHTML+=`<div class="mcl-msg"><div class="mcl-bubble">${formatted}</div></div>`;
    chat.scrollTop=chat.scrollHeight;
    
    const _sub=document.getElementById('mcl-sub');if(_sub)_sub.textContent='Asistente de auditoría · '+_mclHist.filter(m=>m.role==='user').length+' consultas';
  }catch(e){
    document.getElementById(typId)?.remove();
    chat.innerHTML+=`<div class="mcl-msg"><div class="mcl-bubble">No pude conectarme al servidor. Verificá tu conexión e intentá de nuevo.</div></div>`;
    chat.scrollTop=chat.scrollHeight;
  }
}


// Initial check — solo correr si ya hay sesión
setTimeout(()=>{ if(typeof currentUser !== 'undefined' && currentUser) mclShow(); }, 500);

// ═══════════════════════════════════════════════════════════
// PORTAL BPC SCORE — Gestión de envíos y diagnósticos
// ═══════════════════════════════════════════════════════════

const BPC_ENVIOS_KEY = 'bpc_envios';
const BPC_ALERTAS_KEY = 'bpc_alertas_admin';

function getBPCEnvios(){ return JSON.parse(localStorage.getItem(BPC_ENVIOS_KEY)||'[]'); }
function setBPCEnvios(arr){ localStorage.setItem(BPC_ENVIOS_KEY, JSON.stringify(arr)); }
function getBPCAlertasAdmin(){ return JSON.parse(localStorage.getItem(BPC_ALERTAS_KEY)||'[]'); }
function setBPCAlertasAdmin(arr){ localStorage.setItem(BPC_ALERTAS_KEY, JSON.stringify(arr)); }

function updateBPCBadge(){
  const alertas = getBPCAlertasAdmin().filter(a=>!a.leida);
  const badge = document.getElementById('bpc-badge');
  if(!badge) return;
  badge.style.display = alertas.length ? 'inline-block' : 'none';
  badge.textContent = alertas.length;
}


// ═══════════════════════════════════════════════════════════════════════════
// INTELIGENCIA BPC — Panel Estratégico para Dueños
// ═══════════════════════════════════════════════════════════════════════════

function renderInteligenciaBPC(){
  const el = document.getElementById('page-inteligencia');
  if(!el) return;
  if(!document.getElementById('_intel_css')){
    const st = document.createElement('style');
    st.id = '_intel_css';
    st.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=Space+Mono:wght@400;700&display=swap');
      #page-inteligencia{background:#070708;min-height:100vh;padding:0;font-family:'Cormorant Garamond',Georgia,serif;color:rgba(255,255,255,0.85);}
      .intel-topbar{position:sticky;top:0;z-index:100;background:rgba(7,7,8,0.95);backdrop-filter:blur(16px);border-bottom:1px solid rgba(212,175,55,0.1);padding:16px 32px;display:flex;align-items:center;gap:20px;}
      .intel-topbar-title{font-family:'Space Mono',monospace;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(212,175,55,0.6);flex:1;}
      .intel-topbar-stat{font-family:'Space Mono',monospace;font-size:9px;letter-spacing:0.1em;color:rgba(255,255,255,0.25);}
      .intel-topbar-stat strong{color:#d4af37;font-weight:700;}
      .intel-filters{padding:20px 32px;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;gap:10px;flex-wrap:wrap;align-items:center;}
      .intel-filter-label{font-family:'Space Mono',monospace;font-size:8px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.25);margin-right:4px;}
      .intel-filter-btn{all:unset;box-sizing:border-box;padding:6px 14px;border:1px solid rgba(255,255,255,0.08);border-radius:2px;font-family:'Space Mono',monospace;font-size:9px;letter-spacing:0.1em;color:rgba(255,255,255,0.4);cursor:pointer;transition:all 0.15s;white-space:nowrap;}
      .intel-filter-btn:hover{border-color:rgba(212,175,55,0.3);color:rgba(212,175,55,0.8);}
      .intel-filter-btn.active{border-color:#d4af37;color:#d4af37;background:rgba(212,175,55,0.07);}
      .intel-filter-select{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:2px;padding:6px 10px;font-family:'Space Mono',monospace;font-size:9px;letter-spacing:0.08em;color:rgba(255,255,255,0.5);cursor:pointer;outline:none;transition:border-color 0.15s;}
      .intel-filter-select:focus{border-color:rgba(212,175,55,0.4);}
      .intel-filter-select option{background:#0e0e0c;}
      .intel-ai-btn{all:unset;box-sizing:border-box;margin-left:auto;display:inline-flex;align-items:center;gap:8px;padding:8px 20px;background:linear-gradient(135deg,#1a1400,#2a2000);border:1px solid rgba(212,175,55,0.35);border-radius:2px;font-family:'Space Mono',monospace;font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#d4af37;cursor:pointer;transition:all 0.2s;white-space:nowrap;}
      .intel-ai-btn:hover{background:rgba(212,175,55,0.12);box-shadow:0 0 20px rgba(212,175,55,0.1);}
      .intel-ai-btn.loading{opacity:0.6;pointer-events:none;}
      .intel-body{padding:28px 32px;display:flex;flex-direction:column;gap:28px;}
      .intel-kpi-strip{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.05);border-radius:4px;overflow:hidden;}
      .intel-kpi{background:#0c0c0d;padding:20px 22px;display:flex;flex-direction:column;gap:6px;transition:background 0.15s;}
      .intel-kpi:hover{background:#101011;}
      .intel-kpi-label{font-family:'Space Mono',monospace;font-size:7px;letter-spacing:0.25em;text-transform:uppercase;color:rgba(255,255,255,0.25);}
      .intel-kpi-value{font-size:clamp(28px,3vw,40px);font-weight:300;line-height:1;letter-spacing:-0.02em;color:rgba(255,255,255,0.9);}
      .intel-kpi-value.gold{color:#d4af37;} .intel-kpi-value.green{color:#4ade80;} .intel-kpi-value.warn{color:#f59e0b;} .intel-kpi-value.red{color:#f87171;}
      .intel-kpi-sub{font-family:'Space Mono',monospace;font-size:8px;color:rgba(255,255,255,0.2);letter-spacing:0.05em;}
      .intel-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
      .intel-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
      @media(max-width:900px){.intel-grid-2,.intel-grid-3{grid-template-columns:1fr;}}
      .intel-card{background:#0c0c0d;border:1px solid rgba(255,255,255,0.05);border-radius:4px;padding:22px 24px;position:relative;overflow:hidden;}
      .intel-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(212,175,55,0.15),transparent);}
      .intel-card-title{font-family:'Space Mono',monospace;font-size:8px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.3);margin-bottom:18px;}
      .intel-bar-row{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
      .intel-bar-label{font-size:12px;font-weight:300;color:rgba(255,255,255,0.6);min-width:180px;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-style:italic;}
      .intel-bar-track{flex:1;height:5px;background:rgba(255,255,255,0.05);border-radius:99px;overflow:hidden;}
      .intel-bar-fill{height:100%;border-radius:99px;transition:width 0.8s cubic-bezier(0.16,1,0.3,1);}
      .intel-bar-val{font-family:'Space Mono',monospace;font-size:10px;font-weight:700;color:rgba(255,255,255,0.5);min-width:40px;text-align:right;}
      .intel-radar-wrap{display:flex;justify-content:center;align-items:center;padding:10px 0;}
      .intel-table{width:100%;border-collapse:collapse;}
      .intel-table th{font-family:'Space Mono',monospace;font-size:7px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.25);padding:8px 12px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.05);}
      .intel-table td{font-size:13px;font-weight:300;font-style:italic;color:rgba(255,255,255,0.65);padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.03);}
      .intel-table tr:hover td{background:rgba(255,255,255,0.02);}
      .intel-table .td-score{font-family:'Space Mono',monospace;font-style:normal;font-weight:700;font-size:14px;}
      .intel-table .td-badge{display:inline-block;padding:2px 8px;border-radius:2px;font-family:'Space Mono',monospace;font-size:7px;font-weight:700;font-style:normal;letter-spacing:0.1em;text-transform:uppercase;}
      .intel-quote-card{background:rgba(212,175,55,0.03);border:1px solid rgba(212,175,55,0.1);border-radius:3px;padding:16px 18px;margin-bottom:10px;position:relative;}
      .intel-quote-card::before{content:'"';position:absolute;top:8px;left:12px;font-family:'Cormorant Garamond',serif;font-size:40px;line-height:1;color:rgba(212,175,55,0.15);pointer-events:none;}
      .intel-quote-text{font-size:14px;font-weight:300;font-style:italic;line-height:1.7;color:rgba(255,255,255,0.55);padding-left:20px;}
      .intel-quote-meta{margin-top:8px;padding-left:20px;font-family:'Space Mono',monospace;font-size:8px;letter-spacing:0.1em;color:rgba(255,255,255,0.2);}
      .intel-ai-box{background:linear-gradient(135deg,rgba(212,175,55,0.04),rgba(212,175,55,0.01));border:1px solid rgba(212,175,55,0.18);border-radius:4px;padding:22px 24px;position:relative;}
      .intel-ai-box::before{content:'✦';position:absolute;top:18px;right:20px;font-size:14px;color:rgba(212,175,55,0.3);}
      .intel-ai-box-label{font-family:'Space Mono',monospace;font-size:7px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(212,175,55,0.45);margin-bottom:14px;display:flex;align-items:center;gap:8px;}
      .intel-ai-box-label .dot{width:5px;height:5px;border-radius:50%;background:#d4af37;animation:glow-pulse 2s infinite;}
      .intel-ai-text{font-size:15px;font-weight:300;font-style:italic;line-height:1.8;color:rgba(255,255,255,0.6);white-space:pre-wrap;}
      .intel-compare-row{display:flex;align-items:center;gap:12px;margin-bottom:12px;padding:12px 14px;background:rgba(255,255,255,0.02);border-radius:3px;border-left:2px solid transparent;transition:all 0.15s;}
      .intel-compare-row:hover{background:rgba(255,255,255,0.035);}
      .intel-compare-empresa{flex:1;font-size:13px;font-style:italic;color:rgba(255,255,255,0.6);}
      .intel-compare-score{font-family:'Space Mono',monospace;font-size:12px;font-weight:700;min-width:36px;text-align:center;}
      .intel-compare-delta{font-family:'Space Mono',monospace;font-size:9px;font-weight:700;min-width:42px;text-align:right;}
      .intel-empty{text-align:center;padding:48px 24px;color:rgba(255,255,255,0.2);}
      .intel-empty-icon{font-size:32px;margin-bottom:12px;}
      .intel-empty-text{font-size:14px;font-style:italic;}
      @keyframes spin{to{transform:rotate(360deg);}}
    `;
    document.head.appendChild(st);
  }
  el.innerHTML = '<div id="intel-root"><div style="padding:48px;text-align:center;color:rgba(255,255,255,0.3)"><div style="font-size:24px;margin-bottom:8px">⬡</div>Cargando inteligencia...</div></div>';
  setTimeout(_intelRender, 10);
}

const _intelState = {
  pais:'todos', rubro:'todos', completados:'todos',
  tiene_crm:'todos', periodo:'todos'
};

function _intelSetFilter(k,v){ _intelState[k]=v; }
function _intelResetFilters(){
  ['pais','rubro','completados','tiene_crm','periodo'].forEach(k=>_intelState[k]='todos');
}

function _intelRender(){
  const root = document.getElementById('intel-root');
  if(!root) return;
  const allDiags    = S.get('portal_diagnostico')||[];
  const allClientes = S.get('clientes')||[];
  const allAuds     = S.get('auditorias')||[];
  const enriched = allDiags.map(d=>{
    const cli = allClientes.find(c=>String(c.id)===String(d.clienteId))||{};
    const aud = allAuds.find(a=>String(a.clienteId)===String(d.clienteId))||{};
    return {...d, _cli:cli, _aud:aud, _score:calcBPCScore(d)};
  });
  const filtered = _intelApplyFilters(enriched);
  const paises = [...new Set(enriched.map(d=>d._cli.pais).filter(Boolean))].sort();
  const rubros = [...new Set(enriched.map(d=>d._cli.rubro).filter(Boolean))].sort();
  root.innerHTML = _intelBuildHTML(filtered, enriched, paises, rubros);
  setTimeout(()=>{ _intelDrawRadar(filtered); _intelDrawTrend(filtered); _intelAnimateBars(); }, 60);
}

function _intelApplyFilters(data){
  return data.filter(d=>{
    if(_intelState.pais!=='todos' && d._cli.pais!==_intelState.pais) return false;
    if(_intelState.rubro!=='todos' && d._cli.rubro!==_intelState.rubro) return false;
    if(_intelState.completados==='completos' && !d.completo) return false;
    if(_intelState.completados==='pendientes' && d.completo) return false;
    if(_intelState.tiene_crm==='si' && !(d.respuestas?.D5Q1>=3)) return false;
    if(_intelState.tiene_crm==='no' && (d.respuestas?.D5Q1>=3)) return false;
    if(_intelState.periodo!=='todos' && d.fechaInicio){
      const dias = {'30d':30,'90d':90,'6m':180,'1a':365}[_intelState.periodo]||9999;
      if((new Date()-new Date(d.fechaInicio))/(1000*60*60*24) > dias) return false;
    }
    return true;
  });
}

function _intelBuildHTML(filtered, all, paises, rubros){
  const total     = filtered.length;
  const completos = filtered.filter(d=>d.completo);
  const scores    = completos.map(d=>d._score).filter(n=>n!==null);
  const avgScore  = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : null;
  const nivel     = avgScore!==null ? getBPCNivel(avgScore) : null;
  const minScore  = scores.length ? Math.min(...scores) : null;
  const maxScore  = scores.length ? Math.max(...scores) : null;
  const tasaComplecion = total>0 ? Math.round(completos.length/total*100) : 0;

  const dims = BPC_DIMENSIONES.filter(d=>!d.esCanales&&!d.esReflexiva);
  const dimAvgs = dims.map(dim=>{
    const vals = completos.map(d=>calcDimScore(d,dim)).filter(v=>v>0);
    const avg  = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
    const pct  = dim.maxPts>0 ? Math.round(avg/dim.maxPts*100) : 0;
    return {...dim, avgScore:Math.round(avg), avgPct:pct, n:vals.length};
  }).sort((a,b)=>a.avgPct-b.avgPct);

  // Por rubro
  const byRubro = {};
  completos.forEach(d=>{ const r=d._cli.rubro||'Sin clasificar'; if(!byRubro[r])byRubro[r]=[]; if(d._score!==null)byRubro[r].push(d._score); });
  const rubroStats = Object.entries(byRubro).map(([r,sc])=>({rubro:r,avg:Math.round(sc.reduce((a,b)=>a+b,0)/sc.length),n:sc.length})).sort((a,b)=>b.avg-a.avg);

  // Por país
  const byPais = {};
  completos.forEach(d=>{ const p=d._cli.pais||'Sin definir'; if(!byPais[p])byPais[p]=[]; if(d._score!==null)byPais[p].push(d._score); });
  const paisStats = Object.entries(byPais).map(([p,sc])=>({pais:p,avg:Math.round(sc.reduce((a,b)=>a+b,0)/sc.length),n:sc.length})).sort((a,b)=>b.avg-a.avg);

  // Autopercepción
  const comparacion = completos.filter(d=>d.introScore&&d.cierreScore).map(d=>({empresa:d._cli.nombre||'Cliente',intro:d.introScore,cierre:d.cierreScore,delta:d.cierreScore-d.introScore,scoreBPC:d._score})).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,8);

  // Respuestas reflexivas
  const reflexivas = completos.map(d=>({texto:d.respuestas?.D8Q3||d.respuestas?.D8Q1||'',empresa:d._cli.nombre||'',rubro:d._cli.rubro||''})).filter(r=>r.texto&&r.texto.length>20).slice(0,6);

  // Canales
  const canalesBajos={}, canalesAltos={};
  completos.forEach(d=>{ const b=d.respuestas?.D7Q1,a=d.respuestas?.D7Q2; if(b)canalesBajos[b]=(canalesBajos[b]||0)+1; if(a)canalesAltos[a]=(canalesAltos[a]||0)+1; });
  const topBajos = Object.entries(canalesBajos).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const topAltos = Object.entries(canalesAltos).sort((a,b)=>b[1]-a[1]).slice(0,5);

  // Niveles
  const nivelCount = {};
  BPC_NIVELES.forEach(n=>nivelCount[n.nombre]=0);
  completos.forEach(d=>{ const n=getBPCNivel(d._score); if(n)nivelCount[n.nombre]=(nivelCount[n.nombre]||0)+1; });

  const sc = avgScore;
  const scoreClass = sc>=75?'green':sc>=50?'gold':sc>=30?'warn':'red';

  // Hay filtros activos?
  const filtrosActivos = Object.entries(_intelState).some(([k,v])=>v!=='todos');

  return `
    <div class="intel-topbar">
      <div class="intel-topbar-title">🧠 Inteligencia BPC — Panel Estratégico</div>
      <div class="intel-topbar-stat">Mostrando <strong>${total}</strong> de ${all.length} diagnósticos</div>
      <div class="intel-topbar-stat" style="margin-left:8px">${completos.length} completos · ${total-completos.length} en curso</div>
    </div>

    <div class="intel-filters">
      <span class="intel-filter-label">Filtros</span>
      <select class="intel-filter-select" onchange="_intelSetFilter('pais',this.value);_intelRender()">
        <option value="todos">Todos los países</option>
        ${paises.map(p=>`<option value="${p}" ${_intelState.pais===p?'selected':''}>${p}</option>`).join('')}
      </select>
      <select class="intel-filter-select" onchange="_intelSetFilter('rubro',this.value);_intelRender()">
        <option value="todos">Todos los rubros</option>
        ${rubros.map(r=>`<option value="${r}" ${_intelState.rubro===r?'selected':''}>${r}</option>`).join('')}
      </select>
      <select class="intel-filter-select" onchange="_intelSetFilter('completados',this.value);_intelRender()">
        <option value="todos">Todos los estados</option>
        <option value="completos" ${_intelState.completados==='completos'?'selected':''}>Solo completos</option>
        <option value="pendientes" ${_intelState.completados==='pendientes'?'selected':''}>En curso</option>
      </select>
      <select class="intel-filter-select" onchange="_intelSetFilter('tiene_crm',this.value);_intelRender()">
        <option value="todos">CRM: todos</option>
        <option value="si" ${_intelState.tiene_crm==='si'?'selected':''}>Con CRM adoptado</option>
        <option value="no" ${_intelState.tiene_crm==='no'?'selected':''}>Sin CRM</option>
      </select>
      <select class="intel-filter-select" onchange="_intelSetFilter('periodo',this.value);_intelRender()">
        <option value="todos">Todo el tiempo</option>
        <option value="30d" ${_intelState.periodo==='30d'?'selected':''}>Últimos 30 días</option>
        <option value="90d" ${_intelState.periodo==='90d'?'selected':''}>Últimos 90 días</option>
        <option value="6m" ${_intelState.periodo==='6m'?'selected':''}>Últimos 6 meses</option>
        <option value="1a" ${_intelState.periodo==='1a'?'selected':''}>Último año</option>
      </select>
      ${filtrosActivos?`<button class="intel-filter-btn" onclick="_intelResetFilters();_intelRender()" style="border-color:rgba(239,68,68,0.4);color:rgba(239,68,68,0.7)">✕ Limpiar</button>`:''}
      <button class="intel-ai-btn" id="intel-ai-btn" onclick="_intelGenAI(${total},${avgScore||0},${completos.length})">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>
        Generar análisis IA
      </button>
    </div>

    <div class="intel-body">

      <div id="intel-ai-box-wrap" style="display:none">
        <div class="intel-ai-box">
          <div class="intel-ai-box-label"><div class="dot"></div>Análisis estratégico — generado por IA con datos reales</div>
          <div class="intel-ai-text" id="intel-ai-text"></div>
        </div>
      </div>

      <div class="intel-kpi-strip">
        <div class="intel-kpi"><div class="intel-kpi-label">Score promedio</div><div class="intel-kpi-value ${scoreClass}">${avgScore!==null?avgScore:'—'}</div><div class="intel-kpi-sub">${nivel?nivel.nombre:'Sin datos suficientes'}</div></div>
        <div class="intel-kpi"><div class="intel-kpi-label">Diagnósticos</div><div class="intel-kpi-value">${total}</div><div class="intel-kpi-sub">${completos.length} completos · ${tasaComplecion}% tasa de finalización</div></div>
        <div class="intel-kpi"><div class="intel-kpi-label">Score mínimo</div><div class="intel-kpi-value red">${minScore!==null?minScore:'—'}</div><div class="intel-kpi-sub">Caso más crítico del mercado</div></div>
        <div class="intel-kpi"><div class="intel-kpi-label">Score máximo</div><div class="intel-kpi-value green">${maxScore!==null?maxScore:'—'}</div><div class="intel-kpi-sub">Mejor desempeño registrado</div></div>
        <div class="intel-kpi"><div class="intel-kpi-label">Dim. más débil</div><div class="intel-kpi-value warn" style="font-size:clamp(13px,1.8vw,18px);padding-top:8px">${dimAvgs[0]?.nombre||'—'}</div><div class="intel-kpi-sub">${dimAvgs[0]?dimAvgs[0].avgPct+'% promedio en el mercado':''}</div></div>
        <div class="intel-kpi"><div class="intel-kpi-label">Mercados activos</div><div class="intel-kpi-value">${Object.keys(byPais).length}</div><div class="intel-kpi-sub">${Object.keys(byPais).slice(0,3).join(' · ')||'—'}</div></div>
      </div>

      <div class="intel-grid-2">
        <div class="intel-card">
          <div class="intel-card-title">Dimensiones BPC — ranking de madurez (menor a mayor)</div>
          ${dimAvgs.length===0?`<div class="intel-empty"><div class="intel-empty-icon">📊</div><div class="intel-empty-text">Sin datos</div></div>`:
          dimAvgs.map(d=>`
            <div class="intel-bar-row">
              <div class="intel-bar-label" title="${d.nombre}">${d.icon} ${d.nombre}</div>
              <div class="intel-bar-track"><div class="intel-bar-fill" data-pct="${d.avgPct}" style="width:0%;background:${d.avgPct>=70?'#4ade80':d.avgPct>=50?'#d4af37':d.avgPct>=30?'#f59e0b':'#f87171'}"></div></div>
              <div class="intel-bar-val" style="color:${d.avgPct>=70?'#4ade80':d.avgPct>=50?'#d4af37':d.avgPct>=30?'#f59e0b':'#f87171'}">${d.avgPct}%</div>
            </div>`).join('')}
        </div>
        <div class="intel-card">
          <div class="intel-card-title">Radar de madurez comercial — promedio del mercado</div>
          <div class="intel-radar-wrap"><canvas id="intel-radar-canvas" width="280" height="280"></canvas></div>
          <div style="display:flex;justify-content:center;gap:16px;margin-top:8px;flex-wrap:wrap">
            <div style="display:flex;align-items:center;gap:6px;font-family:'Space Mono',monospace;font-size:8px;color:rgba(255,255,255,0.3)"><div style="width:12px;height:1px;background:#d4af37"></div>Promedio actual</div>
            <div style="display:flex;align-items:center;gap:6px;font-family:'Space Mono',monospace;font-size:8px;color:rgba(255,255,255,0.2)"><div style="width:12px;height:1px;background:rgba(255,255,255,0.15)"></div>Objetivo 100%</div>
          </div>
        </div>
      </div>

      <div class="intel-grid-2">
        <div class="intel-card">
          <div class="intel-card-title">Distribución por nivel BPC</div>
          ${BPC_NIVELES.map(n=>{
            const count = completos.filter(d=>getBPCNivel(d._score)?.nombre===n.nombre).length;
            const pct = completos.length>0?Math.round(count/completos.length*100):0;
            return `<div class="intel-bar-row" style="margin-bottom:14px">
              <div class="intel-bar-label" style="color:${n.color};font-style:normal;font-weight:400">${n.icon} ${n.nombre}</div>
              <div class="intel-bar-track"><div class="intel-bar-fill" data-pct="${pct}" style="width:0%;background:${n.color}80"></div></div>
              <div style="display:flex;gap:8px;align-items:center">
                <div class="intel-bar-val" style="color:${n.color}">${count}</div>
                <div style="font-family:'Space Mono',monospace;font-size:8px;color:rgba(255,255,255,0.2)">${pct}%</div>
              </div>
            </div>`;
          }).join('')}
        </div>
        <div class="intel-card">
          <div class="intel-card-title">Tendencia histórica de scores</div>
          <div><canvas id="intel-trend-canvas" width="380" height="200"></canvas></div>
          ${completos.length<3?`<div style="text-align:center;font-family:'Space Mono',monospace;font-size:8px;color:rgba(255,255,255,0.2);margin-top:8px">Se necesitan al menos 3 diagnósticos completos para graficar tendencia</div>`:''}
        </div>
      </div>

      <div class="intel-grid-2">
        <div class="intel-card">
          <div class="intel-card-title">Score promedio por industria / rubro</div>
          ${rubroStats.length===0?`<div class="intel-empty"><div class="intel-empty-icon">🏢</div><div class="intel-empty-text">Sin datos de rubro clasificados</div></div>`:
          `<table class="intel-table"><thead><tr><th>Rubro</th><th>N°</th><th>Score prom.</th><th>Nivel</th></tr></thead><tbody>
          ${rubroStats.map(r=>{ const niv=getBPCNivel(r.avg); const col=r.avg>=75?'#4ade80':r.avg>=50?'#d4af37':r.avg>=30?'#f59e0b':'#f87171'; return `<tr>
            <td>${r.rubro}</td>
            <td><span style="font-family:'Space Mono',monospace;font-size:10px;color:rgba(255,255,255,0.3)">${r.n}</span></td>
            <td class="td-score" style="color:${col}">${r.avg}</td>
            <td><span class="td-badge" style="background:${col}15;color:${col};border:1px solid ${col}30">${niv?.nombre||'—'}</span></td>
          </tr>`; }).join('')}
          </tbody></table>`}
        </div>
        <div class="intel-card">
          <div class="intel-card-title">Score promedio por país / mercado</div>
          ${paisStats.length===0?`<div class="intel-empty"><div class="intel-empty-icon">🌎</div><div class="intel-empty-text">Sin datos de país registrados</div></div>`:
          paisStats.map(p=>{ const col=p.avg>=75?'#4ade80':p.avg>=50?'#d4af37':p.avg>=30?'#f59e0b':'#f87171'; return `
            <div class="intel-bar-row" style="margin-bottom:14px">
              <div class="intel-bar-label" style="font-style:normal">🌍 ${p.pais}</div>
              <div class="intel-bar-track"><div class="intel-bar-fill" data-pct="${p.avg}" style="width:0%;background:${col}"></div></div>
              <div style="display:flex;align-items:center;gap:8px">
                <div class="intel-bar-val" style="color:${col}">${p.avg}</div>
                <div style="font-family:'Space Mono',monospace;font-size:8px;color:rgba(255,255,255,0.2)">(${p.n})</div>
              </div>
            </div>`; }).join('')}
        </div>
      </div>

      <div class="intel-card">
        <div class="intel-card-title">Brecha de conciencia — autopercepción inicial vs score BPC real</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:28px">
          <div>
            <div style="font-family:'Space Mono',monospace;font-size:8px;letter-spacing:0.15em;color:rgba(255,255,255,0.2);margin-bottom:14px;text-transform:uppercase">Por empresa (mayor brecha primero)</div>
            ${comparacion.length===0?`<div class="intel-empty"><div class="intel-empty-text">Sin datos de intro/cierre score todavía</div></div>`:
            comparacion.map(c=>{ const col=c.delta>0?'#4ade80':c.delta<0?'#f87171':'rgba(255,255,255,0.3)'; const sc=c.scoreBPC>=75?'#4ade80':c.scoreBPC>=50?'#d4af37':c.scoreBPC>=30?'#f59e0b':'#f87171'; return `
              <div class="intel-compare-row" style="border-left-color:${col}40">
                <div class="intel-compare-empresa">${c.empresa}</div>
                <div class="intel-compare-score" style="color:rgba(255,255,255,0.3);font-size:10px">${c.intro}→${c.cierre}<span style="font-size:7px;color:rgba(255,255,255,0.15)">/10</span></div>
                <div style="font-family:'Space Mono',monospace;font-size:9px;color:rgba(255,255,255,0.2)">·</div>
                <div class="intel-compare-score" style="color:${sc}">BPC ${c.scoreBPC}</div>
                <div class="intel-compare-delta" style="color:${col}">${c.delta>0?'+':''}${c.delta}</div>
              </div>`; }).join('')}
          </div>
          <div>
            <div style="font-family:'Space Mono',monospace;font-size:8px;letter-spacing:0.15em;color:rgba(255,255,255,0.2);margin-bottom:14px;text-transform:uppercase">Insight del patrón</div>
            ${comparacion.length>0?`<div style="font-size:14px;font-style:italic;font-weight:300;line-height:1.85;color:rgba(255,255,255,0.45)">
              ${(()=>{
                const ai = Math.round(comparacion.reduce((a,b)=>a+b.intro,0)/comparacion.length*10)/10;
                const ac = Math.round(comparacion.reduce((a,b)=>a+b.cierre,0)/comparacion.length*10)/10;
                const ab = Math.round(comparacion.reduce((a,b)=>a+b.scoreBPC,0)/comparacion.length);
                const brecha = ai*10-ab;
                return 'Los responsables se autoevalúan en <strong style="color:#d4af37">'+ai+'/10</strong> antes del diagnóstico.<br><br>Score BPC real promedio: <strong style="color:#d4af37">'+ab+'/100</strong>.<br><br>'+(brecha>10?'Sobreestiman el orden de su sistema. El diagnóstico genera conciencia — ese es tu diferenciador de venta.':brecha<-10?'Son más autocríticos que el resultado real. Alta motivación de mejora.':'Autopercepción coherente con el diagnóstico.');
              })()}
            </div>`:`<div class="intel-empty"><div class="intel-empty-text">Datos insuficientes</div></div>`}
          </div>
        </div>
      </div>

      <div class="intel-grid-2">
        <div class="intel-card">
          <div class="intel-card-title">Canales más sub-potenciados — oportunidades de mejora</div>
          ${topBajos.length===0?`<div class="intel-empty"><div class="intel-empty-text">Sin datos de canales aún</div></div>`:
          topBajos.map(([canal,n])=>{ const pct=completos.length>0?Math.round(n/completos.length*100):0; return `
            <div class="intel-bar-row">
              <div class="intel-bar-label">${canal}</div>
              <div class="intel-bar-track"><div class="intel-bar-fill" data-pct="${pct}" style="width:0%;background:#f87171"></div></div>
              <div style="display:flex;gap:8px;align-items:center"><div class="intel-bar-val" style="color:#f87171">${n}</div><div style="font-family:'Space Mono',monospace;font-size:8px;color:rgba(255,255,255,0.2)">${pct}%</div></div>
            </div>`; }).join('')}
          <div style="margin-top:12px;font-family:'Space Mono',monospace;font-size:8px;color:rgba(255,255,255,0.2)">Canal que los clientes NO están potenciando suficientemente</div>
        </div>
        <div class="intel-card">
          <div class="intel-card-title">Canales más potenciados — fortalezas del mercado</div>
          ${topAltos.length===0?`<div class="intel-empty"><div class="intel-empty-text">Sin datos de canales aún</div></div>`:
          topAltos.map(([canal,n])=>{ const pct=completos.length>0?Math.round(n/completos.length*100):0; return `
            <div class="intel-bar-row">
              <div class="intel-bar-label">${canal}</div>
              <div class="intel-bar-track"><div class="intel-bar-fill" data-pct="${pct}" style="width:0%;background:#4ade80"></div></div>
              <div style="display:flex;gap:8px;align-items:center"><div class="intel-bar-val" style="color:#4ade80">${n}</div><div style="font-family:'Space Mono',monospace;font-size:8px;color:rgba(255,255,255,0.2)">${pct}%</div></div>
            </div>`; }).join('')}
          <div style="margin-top:12px;font-family:'Space Mono',monospace;font-size:8px;color:rgba(255,255,255,0.2)">Canal que los clientes SÍ están usando bien actualmente</div>
        </div>
      </div>

      <div class="intel-card">
        <div class="intel-card-title">Voces del mercado — oportunidades perdidas (respuestas literales de clientes)</div>
        ${reflexivas.length===0?`<div class="intel-empty"><div class="intel-empty-icon">💬</div><div class="intel-empty-text">Las respuestas abiertas de los clientes aparecerán acá cuando completen el diagnóstico</div></div>`:
        `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${reflexivas.map(r=>`<div class="intel-quote-card">
            <div class="intel-quote-text">${r.texto.substring(0,200)}${r.texto.length>200?'…':''}</div>
            <div class="intel-quote-meta">${r.empresa}${r.rubro?' · '+r.rubro:''}</div>
          </div>`).join('')}
        </div>`}
      </div>

      <div class="intel-card">
        <div class="intel-card-title">Registro completo de diagnósticos — ${total} resultados con filtros aplicados</div>
        ${filtered.length===0?`<div class="intel-empty"><div class="intel-empty-icon">🔍</div><div class="intel-empty-text">Ningún diagnóstico coincide con los filtros actuales</div></div>`:
        `<div style="overflow-x:auto"><table class="intel-table">
          <thead><tr><th>Empresa</th><th>País</th><th>Rubro</th><th>Estado</th><th>Auto ini.</th><th>Auto fin.</th><th>BPC Score</th><th>Nivel</th><th>Fecha inicio</th></tr></thead>
          <tbody>${filtered.map(d=>{
            const niv=d.completo&&d._score!==null?getBPCNivel(d._score):null;
            const col=d._score>=75?'#4ade80':d._score>=50?'#d4af37':d._score>=30?'#f59e0b':'#f87171';
            return `<tr>
              <td style="font-weight:400;color:rgba(255,255,255,0.8)">${d._cli.nombre||'—'}</td>
              <td>${d._cli.pais||'—'}</td>
              <td>${d._cli.rubro||'—'}</td>
              <td><span class="td-badge" style="${d.completo?'background:rgba(74,222,128,0.1);color:#4ade80;border:1px solid rgba(74,222,128,0.2)':'background:rgba(245,158,11,0.1);color:#f59e0b;border:1px solid rgba(245,158,11,0.2)'}">${d.completo?'Completo':'En curso'}</span></td>
              <td style="font-family:'Space Mono',monospace;font-size:11px;color:rgba(255,255,255,0.4)">${d.introScore||'—'}</td>
              <td style="font-family:'Space Mono',monospace;font-size:11px;color:rgba(255,255,255,0.4)">${d.cierreScore||'—'}</td>
              <td class="td-score" style="color:${d.completo&&d._score!==null?col:'rgba(255,255,255,0.2)'}">${d.completo&&d._score!==null?d._score:'—'}</td>
              <td>${niv?`<span class="td-badge" style="background:${niv.color}15;color:${niv.color};border:1px solid ${niv.color}25">${niv.nombre}</span>`:'—'}</td>
              <td style="font-family:'Space Mono',monospace;font-size:9px;color:rgba(255,255,255,0.25)">${d.fechaInicio?d.fechaInicio.substring(0,10):'—'}</td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>`}
      </div>

    </div>`;
}

function _intelDrawRadar(filtered){
  const canvas = document.getElementById('intel-radar-canvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const W=canvas.width, H=canvas.height, cx=W/2, cy=H/2, r=Math.min(W,H)/2-32;
  const dims = BPC_DIMENSIONES.filter(d=>!d.esCanales&&!d.esReflexiva);
  const n = dims.length;
  const completos = filtered.filter(d=>d.completo);
  ctx.clearRect(0,0,W,H);
  // Polígonos de fondo
  [0.2,0.4,0.6,0.8,1.0].forEach(lv=>{
    ctx.beginPath();
    dims.forEach((d,i)=>{ const a=(i/n)*Math.PI*2-Math.PI/2; const x=cx+Math.cos(a)*r*lv,y=cy+Math.sin(a)*r*lv; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
    ctx.closePath();
    ctx.strokeStyle=`rgba(255,255,255,${lv===1?0.08:0.04})`; ctx.lineWidth=1; ctx.stroke();
  });
  // Ejes + labels
  dims.forEach((d,i)=>{
    const a=(i/n)*Math.PI*2-Math.PI/2;
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);
    ctx.strokeStyle='rgba(255,255,255,0.05)'; ctx.lineWidth=1; ctx.stroke();
    ctx.font='10px sans-serif'; ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(d.icon, cx+Math.cos(a)*(r+18), cy+Math.sin(a)*(r+18));
  });
  if(!completos.length) return;
  const avgs = dims.map(dim=>{ const vals=completos.map(d=>calcDimScore(d,dim)); const avg=vals.reduce((a,b)=>a+b,0)/vals.length; return dim.maxPts>0?avg/dim.maxPts:0; });
  ctx.beginPath();
  dims.forEach((d,i)=>{ const a=(i/n)*Math.PI*2-Math.PI/2; const x=cx+Math.cos(a)*r*avgs[i],y=cy+Math.sin(a)*r*avgs[i]; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
  ctx.closePath(); ctx.fillStyle='rgba(212,175,55,0.12)'; ctx.fill(); ctx.strokeStyle='#d4af37'; ctx.lineWidth=1.5; ctx.stroke();
  dims.forEach((d,i)=>{ const a=(i/n)*Math.PI*2-Math.PI/2; const x=cx+Math.cos(a)*r*avgs[i],y=cy+Math.sin(a)*r*avgs[i]; ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fillStyle='#d4af37'; ctx.fill(); });
}

function _intelDrawTrend(filtered){
  const canvas = document.getElementById('intel-trend-canvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const W=canvas.width, H=canvas.height;
  const pad={t:16,r:16,b:32,l:36};
  const completos = filtered.filter(d=>d.completo&&d.fechaInicio&&d._score!==null).sort((a,b)=>new Date(a.fechaInicio)-new Date(b.fechaInicio));
  ctx.clearRect(0,0,W,H);
  if(completos.length<2){ ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.font='9px Space Mono,monospace'; ctx.textAlign='center'; ctx.fillText('Datos insuficientes para tendencia', W/2, H/2); return; }
  const scores=completos.map(d=>d._score);
  const minS=Math.max(0,Math.min(...scores)-8), maxS=Math.min(100,Math.max(...scores)+8);
  const pW=W-pad.l-pad.r, pH=H-pad.t-pad.b;
  const toX=i=>pad.l+(i/(completos.length-1))*pW;
  const toY=s=>pad.t+(1-(s-minS)/(maxS-minS))*pH;
  // Grid
  [0,25,50,75,100].forEach(v=>{ if(v<minS-5||v>maxS+5)return; const y=toY(v); ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(W-pad.r,y); ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1; ctx.stroke(); ctx.fillStyle='rgba(255,255,255,0.18)'; ctx.font='8px Space Mono,monospace'; ctx.textAlign='right'; ctx.fillText(v,pad.l-4,y+3); });
  // Área
  ctx.beginPath(); ctx.moveTo(toX(0),toY(scores[0]));
  scores.forEach((s,i)=>{ if(i>0) ctx.lineTo(toX(i),toY(s)); });
  ctx.lineTo(toX(scores.length-1),H-pad.b); ctx.lineTo(toX(0),H-pad.b); ctx.closePath(); ctx.fillStyle='rgba(212,175,55,0.07)'; ctx.fill();
  // Línea
  ctx.beginPath(); ctx.moveTo(toX(0),toY(scores[0]));
  scores.forEach((s,i)=>{ if(i>0) ctx.lineTo(toX(i),toY(s)); });
  ctx.strokeStyle='#d4af37'; ctx.lineWidth=2; ctx.lineJoin='round'; ctx.stroke();
  // Puntos
  completos.forEach((d,i)=>{ const x=toX(i),y=toY(d._score); ctx.beginPath(); ctx.arc(x,y,3.5,0,Math.PI*2); ctx.fillStyle='#d4af37'; ctx.fill(); if(i===0||i===completos.length-1||completos.length<=8){ ctx.fillStyle='rgba(255,255,255,0.2)'; ctx.font='7px Space Mono,monospace'; ctx.textAlign='center'; ctx.fillText(d.fechaInicio.substring(5,10),x,H-pad.b+14); } });
}

function _intelAnimateBars(){
  document.querySelectorAll('.intel-bar-fill[data-pct]').forEach((el,i)=>{
    const pct=parseFloat(el.getAttribute('data-pct'));
    setTimeout(()=>{ el.style.width=pct+'%'; }, 60+i*25);
  });
}

async function _intelGenAI(total, avgScore, completos){
  const btn=document.getElementById('intel-ai-btn');
  const box=document.getElementById('intel-ai-box-wrap');
  const txt=document.getElementById('intel-ai-text');
  if(!btn||!box||!txt) return;
  if(!ANTHROPIC_API_KEY){ toast('⚠️ Configurá la API key de Anthropic en Usuarios'); return; }
  btn.classList.add('loading');
  btn.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> Analizando datos...';
  box.style.display='block'; txt.innerHTML='<span style="color:rgba(255,255,255,0.3)">Procesando datos del mercado...</span>';
  const allDiags=S.get('portal_diagnostico')||[];
  const allClientes=S.get('clientes')||[];
  const enriched=allDiags.filter(d=>d.completo).map(d=>{ const cli=allClientes.find(c=>String(c.id)===String(d.clienteId))||{}; return {score:calcBPCScore(d),rubro:cli.rubro,pais:cli.pais,introScore:d.introScore,cierreScore:d.cierreScore,opPerdida:d.respuestas?.D8Q3||d.respuestas?.D8Q1||'',capacitacion:d.respuestas?.D8Q2||'',canalBajo:d.respuestas?.D7Q1||'',canalAlto:d.respuestas?.D7Q2||'',automatizacion:d.respuestas?.D8Q5||''}; });
  const dims=BPC_DIMENSIONES.filter(d=>!d.esCanales&&!d.esReflexiva);
  const dimAvgs=dims.map(dim=>{ const vals=enriched.map(d=>{ const sc=allDiags.find(x=>calcBPCScore(x)===d.score); return sc?calcDimScore(sc,dim):0; }).filter(v=>v>0); return {nombre:dim.nombre,avg:vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):0}; }).sort((a,b)=>a.avg-b.avg);
  const oportunidades=enriched.filter(d=>d.opPerdida.length>15).slice(0,3).map(d=>d.opPerdida.substring(0,120));
  const automatizacion=enriched.filter(d=>d.automatizacion.length>15).slice(0,2).map(d=>d.automatizacion.substring(0,100));
  const prompt=`Sos analista estratégico de MetoGroup, consultora de auditorías BPC:2026 en LATAM.

Analizá estos datos reales de ${completos} diagnósticos completados y generá un análisis ejecutivo para Leandro, el dueño.

DATOS:
- Score BPC promedio: ${avgScore}/100
- Total diagnósticos: ${total} (${completos} completos)
- Dimensiones más débiles: ${dimAvgs.slice(0,3).map(d=>d.nombre+'('+d.avg+'pts)').join(', ')}
- Dimensiones más fuertes: ${dimAvgs.slice(-2).map(d=>d.nombre+'('+d.avg+'pts)').join(', ')}
- Oportunidades perdidas mencionadas: ${oportunidades.join(' | ')||'No registradas aún'}
- Apertura a automatización: ${automatizacion.join(' | ')||'No registrada aún'}

Respondé con un análisis de 3 secciones, máximo 220 palabras total:
1. QUÉ DICE EL MERCADO: patrón más importante de los datos
2. DÓNDE ESTÁ LA OPORTUNIDAD: qué servicio o ángulo de venta reforzar
3. ACCIÓN CONCRETA PARA LEANDRO: una recomendación específica

Tono: ejecutivo, directo, sin rodeos. Hablá en plural (MetoGroup).`;
  try{
    const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:500,messages:[{role:'user',content:prompt}]})});
    const data=await res.json();
    txt.style.fontFamily="'Cormorant Garamond',Georgia,serif";
    txt.textContent=data?.content?.[0]?.text||'No se pudo generar el análisis.';
  }catch(e){ txt.textContent='Error al conectar con la API. Verificá tu conexión y la API key.'; }
  btn.classList.remove('loading');
  btn.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg> Regenerar análisis';
}

function renderBPCScore(){
  const el = document.getElementById('bpc-score-content');
  if(!el) return;
  const envios = getBPCEnvios();
  const alertas = getBPCAlertasAdmin();
  const clientes = S.get('clientes');

  const unread = alertas.filter(a=>!a.leida);
  if(unread.length){ unread.forEach(a=>a.leida=true); setBPCAlertasAdmin(alertas); updateBPCBadge(); }

  const estadoBadge = e => {
    const map = {
      pendiente:'background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.3)',
      enviado:'background:rgba(212,175,55,0.1);color:var(--accent);border:1px solid rgba(212,175,55,0.25)',
      completado:'background:rgba(200,168,74,0.12);color:var(--accent3);border:1px solid rgba(200,168,74,0.3)',
    };
    const lbl = {pendiente:'Pendiente',enviado:'Enviado',completado:'✅ Completado'};
    return `<span style="font-size:9px;font-weight:700;letter-spacing:0.08em;padding:3px 10px;border-radius:20px;${map[e]||map.pendiente}">${lbl[e]||e}</span>`;
  };

  const rows = envios.length ? envios.map((env)=>{
    const diagKey = 'bpc_diag_envio_'+env.token;
    let diagData = null;
    try{ diagData = JSON.parse(localStorage.getItem(diagKey)); }catch(e){}
    const score = diagData ? calcBPCScoreFromDiag(diagData) : null;
    const tieneInforme = diagData?.informeIA;
    return `<tr>
      <td><div style="font-weight:600">${env.empresa||env.email}</div><div style="font-size:10px;color:var(--muted)">${env.email}</div></td>
      <td style="font-size:11px">${env.fechaEnvio||'-'}</td>
      <td>${estadoBadge(env.estado)}</td>
      <td style="font-size:11px;color:var(--muted)">${env.fechaCompletado||'—'}</td>
      <td>${score!==null?`<span style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:${score>=61?'var(--accent3)':score>=41?'var(--warn)':'var(--danger)'}">${score}</span><span style="font-size:9px;color:var(--muted)">/100</span>`:'—'}</td>
      <td style="white-space:nowrap;display:flex;gap:6px;align-items:center">
        ${env.estado==='completado'
          ?`<button class="btn btn-sm" onclick="bpcVerDiagnostico('${env.token}')" style="background:rgba(200,168,74,0.1);border-color:rgba(200,168,74,0.25);color:var(--accent3)">📊 Ver</button>
            <button class="btn btn-sm" onclick="bpcGenerarInformeIA('${env.token}')" style="background:rgba(212,175,55,0.08);border-color:rgba(212,175,55,0.25);color:var(--accent);font-size:10px">${tieneInforme?'📄 Informe':'🤖 Generar informe'}</button>`
          :`<button class="btn btn-sm" onclick="bpcReenviar('${env.token}')" style="font-size:11px">📋 Copiar enlace</button>`}
        <button class="btn btn-sm btn-danger" onclick="bpcEliminarEnvio('${env.token}')">🗑</button>
      </td>
    </tr>`;
  }).join('') : `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--muted)">No hay envíos registrados. Usá "+ Enviar Portal BPC" para comenzar.</td></tr>`;

  const alertasRecientes = alertas.slice().reverse().slice(0,5);
  const alertasPanel = alertasRecientes.length ? `
    <div style="margin-bottom:20px">
      <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;margin-bottom:10px;color:var(--accent3)">🔔 Actividad Reciente</div>
      ${alertasRecientes.map(a=>`
        <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;background:var(--surface);border:1px solid var(--border);border-left:3px solid ${a.tipo==='completado'?'var(--accent3)':'var(--accent)'};border-radius:10px;margin-bottom:8px">
          <div style="font-size:18px">${a.tipo==='completado'?'✅':'📤'}</div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600">${a.titulo}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">${a.mensaje}</div>
            <div style="font-size:10px;color:var(--muted);margin-top:4px">${a.fecha}</div>
          </div>
          ${a.token&&a.tipo==='completado'?`<button class="btn btn-sm" onclick="bpcVerDiagnostico('${a.token}')" style="font-size:11px">Ver</button>`:''}
        </div>`).join('')}
    </div>` : '';

  el.innerHTML = `
    <div style="padding:20px">
      ${alertasPanel}
      <div class="table-wrap">
        <div class="table-header">
          <div class="table-title">Portales BPC Score Enviados (${envios.length})</div>
          <input placeholder="🔍 Buscar..." style="width:180px;padding:7px 12px;font-size:12px" oninput="bpcFilterTable(this.value)" id="bpc-search">
        </div>
        <table><thead><tr><th>Cliente / Email</th><th>Fecha envío</th><th>Estado</th><th>Completado</th><th>Score</th><th></th></tr></thead>
        <tbody id="bpc-tbody">${rows}</tbody></table>
      </div>
    </div>`;
}

function bpcFilterTable(q){
  const ql = q.toLowerCase();
  document.querySelectorAll('#bpc-tbody tr').forEach(tr=>{
    tr.style.display = tr.textContent.toLowerCase().includes(ql) ? '' : 'none';
  });
}

// ═══ MODAL ENVÍO ═══
function bpcEnviarPortal(){
  const clientes = S.get('clientes');
  const ov = document.createElement('div');
  ov.className='modal-overlay open'; ov.id='bpc-envio-ov';
  ov.innerHTML=`
    <div class="modal modal-lg">
      <div class="modal-head">
        <div><div class="modal-title">Enviar Portal BPC Score</div><div style="font-size:11px;color:var(--muted);margin-top:3px">Generá un enlace único para que el cliente complete el diagnóstico</div></div>
        <button class="modal-close" onclick="document.getElementById('bpc-envio-ov').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-section" style="margin-top:0">📋 Destinatario</div>
        <div style="display:flex;gap:10px;margin-bottom:18px">
          <button id="bpc-tab-cli" class="btn btn-primary" onclick="bpcToggleTab('cli')" style="flex:1">Cliente registrado</button>
          <button id="bpc-tab-mail" class="btn btn-secondary" onclick="bpcToggleTab('mail')" style="flex:1">Email libre</button>
        </div>
        <div id="bpc-panel-cli">
          <div class="form-group"><label>Cliente</label>
            <select id="bpc-cli-sel" onchange="bpcAutoFillEmpresa()" style="width:100%;padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px">
              <option value="">Seleccionar cliente...</option>
              ${clientes.map(c=>`<option value="${c.id}" data-nombre="${(c.nombre||'').replace(/"/g,'&quot;')}" data-email="${c.email||''}">${c.nombre}${c.email?' — '+c.email:''}</option>`).join('')}
            </select>
          </div>
        </div>
        <div id="bpc-panel-mail" style="display:none">
          <div class="form-group"><label>Nombre de la empresa</label><input id="bpc-mail-empresa" type="text" placeholder="Ej: Industrias García S.A." style="width:100%"></div>
          <div class="form-group"><label>Email</label><input id="bpc-mail-email" type="email" placeholder="contacto@empresa.com" style="width:100%"></div>
        </div>
        <div class="form-section">⚙️ Portal</div>
        <div class="form-group"><label>Nombre a mostrar en el portal (opcional — completa automáticamente)</label><input id="bpc-empresa-display" type="text" placeholder="Nombre de la empresa en el portal"></div>
        <div class="form-group"><label>Nota interna (referencia)</label><input id="bpc-nota" type="text" placeholder="Ej: Prospecto ingresado por Juan García el 15/03" style="width:100%"></div>
        <div style="background:rgba(200,168,74,0.05);border:1px solid rgba(200,168,74,0.2);border-radius:10px;padding:14px 18px;margin-top:8px;font-size:12px;color:var(--muted);line-height:1.8">
          <strong style="color:var(--accent3)">ℹ️ ¿Cómo funciona?</strong><br>
          Se genera un <strong style="color:var(--text)">enlace único</strong> que carga el portal BPC Score con los datos del cliente pre-configurados. El cliente completa las preguntas y al finalizar ambos reciben una <strong style="color:var(--text)">alerta automática</strong> con el diagnóstico.
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="document.getElementById('bpc-envio-ov').remove()">Cancelar</button>
        <button class="btn btn-primary" onclick="bpcConfirmarEnvio()">Generar enlace →</button>
      </div>
    </div>`;
  ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
  document.body.appendChild(ov);
}

function bpcAutoFillEmpresa(){
  const sel = document.getElementById('bpc-cli-sel');
  const opt = sel.options[sel.selectedIndex];
  const nombre = opt?.getAttribute('data-nombre')||'';
  const disp = document.getElementById('bpc-empresa-display');
  if(disp && nombre) disp.value = nombre;
}

function bpcToggleTab(tab){
  document.getElementById('bpc-panel-cli').style.display=tab==='cli'?'':'none';
  document.getElementById('bpc-panel-mail').style.display=tab==='mail'?'':'none';
  document.getElementById('bpc-tab-cli').className=tab==='cli'?'btn btn-primary':'btn btn-secondary';
  document.getElementById('bpc-tab-mail').className=tab==='mail'?'btn btn-primary':'btn btn-secondary';
}

function bpcConfirmarEnvio(){
  const useCli = document.getElementById('bpc-panel-cli').style.display!=='none';
  let clienteId=null, email='', empresa='';
  if(useCli){
    clienteId = document.getElementById('bpc-cli-sel').value;
    if(!clienteId){toast('⚠️ Seleccioná un cliente');return;}
    const cli = S.get('clientes').find(c=>c.id==clienteId);
    email = cli?.email||''; empresa = cli?.nombre||'';
  } else {
    email = document.getElementById('bpc-mail-email').value.trim();
    empresa = document.getElementById('bpc-mail-empresa').value.trim();
    if(!email){toast('⚠️ Ingresá un email');return;}
    if(!empresa){toast('⚠️ Ingresá el nombre de la empresa');return;}
  }
  const displayEmpresa = document.getElementById('bpc-empresa-display').value.trim()||empresa;
  const nota = document.getElementById('bpc-nota').value.trim();
  const token = 'bpc_'+Date.now()+'_'+Math.random().toString(36).substr(2,8);
  const fechaEnvio = todayStr();

  const envios = getBPCEnvios();
  envios.push({token,clienteId,email,empresa:displayEmpresa,fechaEnvio,estado:'enviado',fechaCompletado:null,nota});
  setBPCEnvios(envios);

  const alertas = getBPCAlertasAdmin();
  alertas.push({id:Date.now(),tipo:'enviado',leida:false,titulo:`Portal enviado a ${displayEmpresa}`,mensaje:`Email: ${email}${nota?' · '+nota:''}`,fecha:fechaEnvio,token});
  setBPCAlertasAdmin(alertas);

  const link = window.location.href.split('?')[0]+'?bpc_token='+token;
  document.getElementById('bpc-envio-ov').remove();

  const ov2 = document.createElement('div');
  ov2.className='modal-overlay open';
  ov2.innerHTML=`
    <div class="modal">
      <div class="modal-head"><div class="modal-title">✅ Envío registrado</div><button class="modal-close" onclick="this.closest('.modal-overlay').remove();renderBPCScore()">✕</button></div>
      <div class="modal-body">
        <div style="text-align:center;margin-bottom:20px">
          <div style="font-size:44px;margin-bottom:10px">🔗</div>
          <div style="font-size:16px;font-weight:600">${displayEmpresa}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:4px">${email}</div>
        </div>
        <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:16px">
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Enlace del portal</div>
          <div style="font-size:11px;color:var(--accent);word-break:break-all;font-family:'DM Mono',monospace;line-height:1.6">${link}</div>
        </div>
        <div style="display:flex;gap:10px;margin-bottom:16px">
          <button class="btn btn-primary" onclick="navigator.clipboard.writeText('${link}').then(()=>toast('📋 Enlace copiado'))" style="flex:1">📋 Copiar enlace</button>
          <button class="btn btn-secondary" onclick="bpcAbrirPortalEmbed('${token}')" style="flex:1">👁 Vista previa</button>
        </div>
        <div style="font-size:11px;color:var(--muted);text-align:center">Cuando el cliente complete el diagnóstico, recibirás una alerta en <strong>Portal BPC Score</strong></div>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove();renderBPCScore()">Cerrar</button></div>
    </div>`;
  ov2.addEventListener('click',e=>{if(e.target===ov2){ov2.remove();renderBPCScore();}});
  document.body.appendChild(ov2);
  updateBPCBadge();
}

// ═══ VISTA PREVIA EMBED ═══
function bpcAbrirPortalEmbed(token){
  const envios = getBPCEnvios();
  const env = envios.find(e=>e.token===token);
  const ov = document.createElement('div');
  ov.className='modal-overlay open'; ov.style.padding='0';
  ov.innerHTML=`
    <div style="background:#1a1d24;border-radius:12px;width:92vw;max-width:960px;height:88vh;display:flex;flex-direction:column;overflow:hidden">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid rgba(255,255,255,0.08);flex-shrink:0">
        <div style="font-size:13px;font-weight:600;color:#f0f1f4">Vista previa — ${env?.empresa||'Portal BPC'}</div>
        <div style="display:flex;gap:8px">
          <button onclick="navigator.clipboard.writeText(window.location.href.split('?')[0]+'?bpc_token=${token}').then(()=>toast('📋 Copiado'))" class="btn btn-sm">📋 Copiar enlace</button>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        </div>
      </div>
      <div id="bpc-embed-container-${token}" style="flex:1;overflow:hidden"></div>
    </div>`;
  ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
  document.body.appendChild(ov);
  // Renderizar portal BPC inline
  bpcRenderPortalInline('bpc-embed-container-'+token, token, env?.empresa||'');
}

function bpcRenderPortalInline(containerId, token, empresa){
  const container = document.getElementById(containerId);
  if(!container) return;
  // Renderizar el portal BPC embebido directamente
  container.innerHTML = '<div style="width:100%;height:100%;overflow:auto;background:#141618"></div>';
  const inner = container.firstChild;
  // Clonar el portal embebido al container
  const portalEl = document.getElementById('__bpc_portal__');
  if(portalEl){
    const clone = portalEl.cloneNode(true);
    clone.style.display='block';
    clone.style.position='relative';
    clone.style.height='100%';
    clone.id='__bpc_portal_preview__';
    inner.appendChild(clone);
    // Inicializar solo la UI visual (sin callbacks de completado)
    window.__BPC_TOKEN__ = token;
    window.__BPC_EMPRESA__ = empresa;
    if(typeof showWelcome === 'function') {
      setTimeout(()=>{ try{ showWelcome(); }catch(e){} }, 100);
    }
  } else {
    inner.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:300px;color:#9a9da6;font-size:13px">Vista previa no disponible</div>';
  }
}

// ═══ VER DIAGNÓSTICO COMPLETADO ═══
// ═══════════════════════════════════════════════════════════
// SCORING PONDERADO BPC — Compromiso dirección tiene más peso
// ═══════════════════════════════════════════════════════════

// Mapa de preguntas a dimensiones con pesos individuales
// ALTA PRIORIDAD: compromiso dirección (Q20-Q26) y seguimiento leads/vendedores (Q30,Q33,Q37-Q40)
const BPC_Q_META = {
  // LIDERAZGO Y ESTRATEGIA (peso dimensión: 25%) — máxima prioridad
  Q20:{dim:'liderazgo',peso:3.5,txt:'Importancia de ventas en decisiones estratégicas'},
  Q21:{dim:'liderazgo',peso:3.5,txt:'Participación activa de dirección en seguimiento comercial'},
  Q22:{dim:'liderazgo',peso:2.5,txt:'Plan estratégico comercial documentado con KPIs'},
  Q23:{dim:'liderazgo',peso:2.0,txt:'Estructura comercial con roles y responsabilidades claras'},
  Q24:{dim:'liderazgo',peso:2.0,txt:'Revisión estratégica anual con acta'},
  Q25:{dim:'liderazgo',peso:2.0,txt:'Presupuesto comercial aprobado y monitoreado'},
  Q26:{dim:'liderazgo',peso:1.5,txt:'Misión, visión y valores comerciales documentados'},
  // SEGUIMIENTO DE LEADS Y VENDEDORES (peso dimensión: 25%) — alta prioridad
  Q30:{dim:'procesos',peso:3.5,txt:'Revisiones de pipeline con frecuencia semanal'},
  Q33:{dim:'procesos',peso:3.0,txt:'Seguimiento post-venta con responsable y métricas'},
  Q37:{dim:'procesos',peso:2.5,txt:'Plan de capacitación comercial anual'},
  Q38:{dim:'procesos',peso:2.5,txt:'Formación en técnicas de negociación y objeciones'},
  Q39:{dim:'procesos',peso:2.5,txt:'Sistema de incentivos documentado y transparente'},
  Q40:{dim:'procesos',peso:2.5,txt:'Evaluación de desempeño con indicadores cualitativos'},
  // RESTO PROCESOS (peso normal)
  Q27:{dim:'procesos',peso:1.5,txt:'Proceso de ventas documentado'},
  Q28:{dim:'procesos',peso:1.5,txt:'Propuesta de valor documentada'},
  Q29:{dim:'procesos',peso:1.0,txt:'Materiales de apoyo vigentes'},
  Q31:{dim:'procesos',peso:1.5,txt:'Onboarding documentado para clientes nuevos'},
  Q32:{dim:'procesos',peso:1.5,txt:'Gestión de reclamos con registro y trazabilidad'},
  Q34:{dim:'procesos',peso:1.0,txt:'Proceso formal de contratación de vendedores'},
  Q35:{dim:'procesos',peso:1.0,txt:'Perfiles de cargo actualizados'},
  Q36:{dim:'procesos',peso:1.5,txt:'Programa de inducción para vendedores nuevos'},
  // CANALES Y PRESENCIA DIGITAL (peso: 15%)
  Q09:{dim:'marketing',peso:1.5,txt:'Sitio web actualizado con contenido relevante'},
  Q10:{dim:'marketing',peso:1.5,txt:'Estrategia documentada de generación de leads'},
  Q11:{dim:'marketing',peso:1.0,txt:'Manual de identidad visual vigente'},
  Q12:{dim:'marketing',peso:1.0,txt:'Proceso de aprobación de comunicación comercial'},
  Q13:{dim:'marketing',peso:1.5,txt:'Gestión de reputación online con protocolo'},
  // CRM Y TECNOLOGÍA (peso: 15%)
  Q15:{dim:'tech',peso:1.5,txt:'Pipeline configurado en CRM con etapas'},
  Q16:{dim:'tech',peso:1.5,txt:'CRM integrado con email y herramientas'},
  Q17:{dim:'tech',peso:1.0,txt:'Herramientas digitales para cotizar y firmar'},
  Q18:{dim:'tech',peso:2.0,txt:'Datos del CRM usados para decisiones comerciales'},
  Q19:{dim:'tech',peso:1.0,txt:'Política documentada de herramientas digitales'},
  // ÉTICA Y GOBERNANZA (peso: 10%)
  Q41:{dim:'etica',peso:1.5,txt:'Código de conducta comercial documentado'},
  Q42:{dim:'etica',peso:1.5,txt:'Materiales libres de promesas no respaldadas'},
  Q43:{dim:'etica',peso:1.0,txt:'Evaluación interna de prácticas comerciales anual'},
  Q44:{dim:'etica',peso:1.0,txt:'Canal de denuncia para prácticas indebidas'},
  Q45:{dim:'etica',peso:1.5,txt:'Políticas de privacidad y protección de datos'},
  Q46:{dim:'etica',peso:1.5,txt:'Contratos revisados por área legal'},
};

const BPC_DIMS_CONFIG = {
  liderazgo: {nombre:'Liderazgo y Estrategia', peso:0.25, color:'#f59e0b', icon:'👑'},
  procesos:  {nombre:'Procesos y Seguimiento Comercial', peso:0.25, color:'#d4af37', icon:'🔄'},
  marketing: {nombre:'Canales y Presencia Digital', peso:0.15, color:'#c8a84a', icon:'📢'},
  tech:      {nombre:'Tecnología y CRM', peso:0.15, color:'#c8a84a', icon:'⚙️'},
  etica:     {nombre:'Ética y Gobernanza', peso:0.10, color:'#f97316', icon:'⚖️'},
};

// Score ponderado real (reemplaza calcBPCScoreFromDiag)
function calcBPCScoreFromDiag(diagData){
  const R = diagData.respuestas||{};

  // Calcular score por dimensión
  const dimScores = {};
  const dimWeights = {};
  Object.entries(BPC_Q_META).forEach(([qid,meta])=>{
    const val = R[qid];
    if(typeof val !== 'number') return;
    const norm = (val-1)/4; // 0-1
    if(!dimScores[meta.dim]){ dimScores[meta.dim]=0; dimWeights[meta.dim]=0; }
    dimScores[meta.dim]  += norm * meta.peso;
    dimWeights[meta.dim] += meta.peso;
  });

  // Bonus por variables binarias (CRM, web)
  let binBonus = 0;
  if(R.tieneWeb==='yes') binBonus += 0.03;
  if(R.webComercial==='yes') binBonus += 0.02;
  if(R.tieneCRM==='yes'){
    binBonus += 0.04;
    if(R.crmAdopt==='Más del 90%') binBonus+=0.02;
    else if(R.crmAdopt==='Entre 75% y 90%') binBonus+=0.015;
    else if(R.crmAdopt==='Entre 50% y 75%') binBonus+=0.01;
  }

  // Score total ponderado por dimensión
  let totalScore = 0;
  let totalWeight = 0;
  Object.entries(BPC_DIMS_CONFIG).forEach(([dimKey,cfg])=>{
    const raw = dimScores[dimKey]||0;
    const wt  = dimWeights[dimKey]||1;
    const dimNorm = wt>0 ? raw/wt : 0;
    totalScore  += dimNorm * cfg.peso;
    totalWeight += cfg.peso;
  });

  const base = totalWeight>0 ? totalScore/totalWeight : 0;
  return Math.min(100, Math.max(0, Math.round((base + binBonus)*100)));
}

// Score desglosado por dimensión
function calcBPCDimScores(diagData){
  const R = diagData.respuestas||{};
  const result = {};
  Object.entries(BPC_DIMS_CONFIG).forEach(([dimKey,cfg])=>{
    const qs = Object.entries(BPC_Q_META).filter(([,m])=>m.dim===dimKey);
    let scored=0, totalW=0, items=[];
    qs.forEach(([qid,meta])=>{
      const val = R[qid];
      if(typeof val==='number'){
        const norm=(val-1)/4;
        scored += norm*meta.peso;
        totalW += meta.peso;
        items.push({qid,val,peso:meta.peso,txt:meta.txt,norm});
      }
    });
    const dimScore = totalW>0 ? Math.round((scored/totalW)*100) : null;
    result[dimKey] = {score:dimScore, cfg, items, totalW, scored};
  });
  return result;
}

// ═══ GENERAR INFORME IA ═══
async function bpcGenerarInformeIA(token){
  const diagKey='bpc_diag_envio_'+token;
  let diagData=null;
  try{diagData=JSON.parse(localStorage.getItem(diagKey));}catch(e){}
  const env=getBPCEnvios().find(e=>e.token===token);
  if(!diagData){toast('⚠️ Sin datos de diagnóstico');return;}

  const apiKey=(S.get('usuarios').find(u=>u.apiKey)||{}).apiKey||'';
  if(!apiKey){toast('⚠️ Configurá la API Key de Claude en Usuarios');return;}

  const R=diagData.respuestas||{};
  const vendors=diagData.vendors||[];
  const channels=diagData.channels||[];
  const score=calcBPCScoreFromDiag(diagData);
  const dimScores=calcBPCDimScores(diagData);
  const ESC=['','Nunca','Casi nunca','A veces','Casi siempre','Siempre'];

  // Construir contexto detallado para la IA
  const dimResumen = Object.entries(dimScores).map(([k,d])=>{
    const cfg=BPC_DIMS_CONFIG[k];
    const itemsStr=d.items.map(i=>`    - ${i.txt}: ${i.val}/5 (${ESC[i.val]||''}) [peso ${i.peso}]`).join('\n');
    return `${cfg.icon} ${cfg.nombre} — Score: ${d.score!==null?d.score+'/100':'sin datos'} (peso en total: ${cfg.peso*100}%)\n${itemsStr||'    Sin respuestas registradas'}`;
  }).join('\n\n');

  const perfilStr = [
    `Empresa: ${env?.empresa||'—'}`,
    `Empleados totales: ${R.empleados??'—'}`,
    `Vendedores: ${R.vendedores??'—'}`,
    `Gerente comercial: ${R.tieneGerente==='yes'?'Sí':'No'}`,
    `Equipo marketing: ${R.tieneMarketing==='yes'?`Sí (${R.mktPeople||'?'} personas)`:'No'}`,
    `CRM implementado: ${R.tieneCRM==='yes'?`Sí — ${R.crmBrand||''}  Adopción: ${R.crmAdopt||'?'}  Frecuencia actualización: ${R.crmFreq||'?'}`:'No'}`,
    `Sitio web: ${R.tieneWeb==='yes'?`Sí${R.webComercial==='yes'?' (con finalidad comercial)':''} — ${R.webUrl||''}`:'No'}`,
    `Canales de venta activos: ${channels.join(', ')||'—'}`,
    `Vendedores registrados: ${vendors.map(v=>v.nombre+' '+v.apellido).join(', ')||'—'}`,
  ].join('\n');

  const prompt=`Sos un auditor senior especializado en Buenas Prácticas Comerciales (BPC 72001) de MetoGroup LATAM. Analizás diagnósticos de madurez comercial de PyMEs latinoamericanas.

Acabás de recibir el diagnóstico completo de la empresa "${env?.empresa||'Cliente'}". Tu tarea es generar un informe interno de auditoría EXCLUSIVO PARA MetoGroup — no lo va a leer el cliente.

═══ DATOS DEL DIAGNÓSTICO ═══

PERFIL DE LA EMPRESA:
${perfilStr}

SCORE TOTAL BPC: ${score}/100

DESGLOSE POR DIMENSIÓN (con ponderación):
${dimResumen}

═══ INSTRUCCIONES DEL INFORME ═══

Generá un informe interno estructurado con estas secciones EXACTAS, usando el formato indicado:

**SCORE FINAL: ${score}/100**
**NIVEL:** [Inicial/En desarrollo/Definido/Avanzado/Optimizado según el score]
**DIAGNÓSTICO:** [1 oración contundente sobre el estado general de la empresa]

---

**1. EVALUACIÓN EJECUTIVA**
[3-4 párrafos. Explicá el score ponderado: por qué el compromiso de la dirección y el seguimiento de leads pesan más. Describí el estado real de madurez comercial de esta empresa específica basándote en sus respuestas concretas.]

---

**2. FORTALEZAS DETECTADAS**
[Lista de 3-5 fortalezas reales identificadas en las respuestas. Cada una con: título en negrita + 1 oración de evidencia específica de las respuestas.]

---

**3. BRECHAS CRÍTICAS**
[Lista de 4-6 brechas ordenadas de mayor a menor impacto. Priorizá las que afectan compromiso de dirección y seguimiento. Cada una: título en negrita + descripción de la brecha + impacto concreto en el negocio.]

---

**4. ANÁLISIS POR DIMENSIÓN**
[Para cada dimensión con datos, 2-3 líneas: score obtenido, qué revela, qué está en juego.]

---

**5. RECOMENDACIONES PARA MetoGroup**
[Lista de 5-7 acciones concretas que el equipo de MetoGroup debería proponer al cliente en la reunión de entrega de informe. Específicas, accionables, ordenadas por prioridad.]

---

**6. ESTRATEGIA DE CIERRE COMERCIAL**
[Para uso interno del equipo de ventas de MetoGroup. 3-5 puntos sobre cómo presentar la propuesta de implementación a ESTE cliente específico, qué dolores mencionar, qué argumentos usar, qué objeciones anticipar.]

---

**7. PRÓXIMOS PASOS SUGERIDOS**
[Timeline de 3 meses: qué proponer en semana 1, mes 1, mes 2-3. Concreto para este cliente.]

TONO: Técnico-profesional, directo, sin eufemismos. Es un documento interno de trabajo.
EXTENSIÓN: Sustancial pero sin relleno. Cada línea debe aportar valor real al equipo.
IDIOMA: Español rioplatense (vos, tenés, etc.).`;

  // Abrir modal con loading
  const modalId='bpc-informe-modal-'+Date.now();
  const ov=document.createElement('div');
  ov.className='modal-overlay open';
  ov.id=modalId;
  ov.innerHTML=`
    <div class="modal modal-lg" style="max-width:860px;height:88vh;display:flex;flex-direction:column">
      <div class="modal-head" style="flex-shrink:0">
        <div>
          <div class="modal-title">🤖 Informe IA — ${env?.empresa||'Cliente'}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">Score: ${score}/100 · Uso interno MetoGroup · ${env?.fechaCompletado||todayStr()}</div>
        </div>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div id="${modalId}-body" class="modal-body" style="flex:1;overflow-y:auto;font-size:13px;line-height:1.8">
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:200px;gap:16px">
          <div style="display:flex;gap:6px">
            <div style="width:8px;height:8px;border-radius:50%;background:var(--accent);animation:bpc-dot 1.2s ease-in-out infinite"></div>
            <div style="width:8px;height:8px;border-radius:50%;background:var(--accent);animation:bpc-dot 1.2s ease-in-out 0.2s infinite"></div>
            <div style="width:8px;height:8px;border-radius:50%;background:var(--accent);animation:bpc-dot 1.2s ease-in-out 0.4s infinite"></div>
          </div>
          <div style="font-size:12px;color:var(--muted)">Analizando ${Object.keys(R).length} respuestas con IA...</div>
        </div>
        <style>@keyframes bpc-dot{0%,80%,100%{opacity:0.2;transform:scale(0.8)}40%{opacity:1;transform:scale(1)}}</style>
      </div>
      <div class="modal-footer" style="flex-shrink:0">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cerrar</button>
        <button id="${modalId}-copy" class="btn" style="display:none;background:rgba(212,175,55,0.08);border-color:rgba(212,175,55,0.25);color:var(--accent)" onclick="bpcCopiarInforme('${modalId}')">📋 Copiar informe</button>
        <button id="${modalId}-save" class="btn btn-primary" style="display:none" onclick="bpcGuardarInforme('${token}','${modalId}')">💾 Guardar en diagnóstico</button>
      </div>
    </div>`;
  ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
  document.body.appendChild(ov);

  // Llamar a la API
  try{
    const resp=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:3000,messages:[{role:'user',content:prompt}]})
    });
    const data=await resp.json();
    const texto=data.content?.[0]?.text||'Error al generar el informe.';

    // Guardar informe en localStorage
    window._bpcInformeActual=texto;
    const diagKey2='bpc_diag_envio_'+token;
    let dd=null;
    try{dd=JSON.parse(localStorage.getItem(diagKey2));}catch(e){}
    if(dd){dd.informeIA=texto;dd.informeFecha=todayStr();localStorage.setItem(diagKey2,JSON.stringify(dd));}

    // Renderizar informe con formato
    const bodyEl=document.getElementById(modalId+'-body');
    if(bodyEl){
      const html=texto
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
        .replace(/^---$/gm,'<hr style="border:none;border-top:1px solid var(--border);margin:18px 0">')
        .replace(/^(#{1,3})\s(.+)$/gm,(_,h,t)=>`<div style="font-family:'Syne',sans-serif;font-size:${h.length===1?'17':h.length===2?'15':'13'}px;font-weight:700;color:var(--accent);margin:20px 0 8px;text-transform:uppercase;letter-spacing:0.05em">${t}</div>`)
        .replace(/^[-•]\s(.+)$/gm,'<div style="display:flex;gap:8px;margin:4px 0"><span style="color:var(--accent3);flex-shrink:0">›</span><span>$1</span></div>')
        .replace(/\n/g,'<br>');

      // Header visual con score
      const scoreColor=score>=61?'var(--accent3)':score>=41?'var(--warn)':'var(--danger)';
      const dimBlocks=Object.entries(calcBPCDimScores({respuestas:R})).map(([k,d])=>{
        if(d.score===null)return'';
        const c=d.cfg;
        return`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 14px;min-width:140px">
          <div style="font-size:10px;color:var(--muted);margin-bottom:4px">${c.icon} ${c.nombre}</div>
          <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:${d.score>=61?'var(--accent3)':d.score>=41?'var(--warn)':'var(--danger)'}">${d.score}</div>
          <div style="font-size:9px;color:var(--muted)">/100 · peso ${c.peso*100}%</div>
          <div style="margin-top:6px;height:3px;background:var(--surface);border-radius:2px;overflow:hidden">
            <div style="width:${d.score}%;height:100%;background:${d.score>=61?'var(--accent3)':d.score>=41?'var(--warn)':'var(--danger)'};border-radius:2px"></div>
          </div>
        </div>`;
      }).join('');

      bodyEl.innerHTML=`
        <div style="background:linear-gradient(135deg,rgba(212,175,55,0.06),rgba(200,168,74,0.04));border:1px solid var(--border);border-radius:12px;padding:20px 24px;margin-bottom:24px">
          <div style="display:flex;align-items:center;gap:24px;margin-bottom:16px">
            <div style="text-align:center">
              <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Score BPC Total</div>
              <div style="font-family:'Syne',sans-serif;font-size:56px;font-weight:800;color:${scoreColor};line-height:1">${score}</div>
              <div style="font-size:11px;color:var(--muted)">/100</div>
            </div>
            <div style="flex:1">
              <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Desglose por dimensión</div>
              <div style="display:flex;flex-wrap:wrap;gap:8px">${dimBlocks}</div>
            </div>
          </div>
          <div style="font-size:10px;color:var(--muted);border-top:1px solid var(--border);padding-top:10px;margin-top:4px">
            🔒 Documento interno MetoGroup — No compartir con el cliente · Generado ${todayStr()} · ${env?.empresa||'—'} · ${env?.email||'—'}
          </div>
        </div>
        <div>${html}</div>`;

      document.getElementById(modalId+'-copy').style.display='';
      document.getElementById(modalId+'-save').style.display='';
    }
  }catch(err){
    const bodyEl=document.getElementById(modalId+'-body');
    if(bodyEl) bodyEl.innerHTML=`<div style="color:var(--danger);padding:20px">Error al conectar con la IA: ${err.message}</div>`;
  }
}

function bpcCopiarInforme(modalId){
  const body=document.getElementById(modalId+'-body');
  if(!body)return;
  const texto=body.innerText;
  navigator.clipboard.writeText(texto).then(()=>toast('📋 Informe copiado al portapapeles'));
}

function bpcGuardarInforme(token,modalId){
  toast('💾 Informe guardado en el diagnóstico');
  document.getElementById(modalId)?.remove();
}

// ═══ VER DIAGNÓSTICO COMPLETO (vista MetoGroup) ═══
function bpcVerDiagnostico(token){
  const diagKey='bpc_diag_envio_'+token;
  let diagData=null;
  try{diagData=JSON.parse(localStorage.getItem(diagKey));}catch(e){}
  const env=getBPCEnvios().find(e=>e.token===token);
  if(!diagData){toast('⚠️ No hay diagnóstico disponible');return;}

  const R=diagData.respuestas||{};
  const vendors=diagData.vendors||[];
  const channels=diagData.channels||[];
  const score=calcBPCScoreFromDiag(diagData);
  const nivel=getBPCNivel(score);
  const dimScores=calcBPCDimScores(diagData);
  const ESC_LBL=['','Nunca','Casi nunca','A veces','Casi siempre','Siempre'];
  const tieneInforme=!!diagData.informeIA;

  const scoreColor=score>=61?'var(--accent3)':score>=41?'var(--warn)':'var(--danger)';

  // Barras por dimensión
  const dimBars=Object.entries(dimScores).map(([k,d])=>{
    if(d.score===null)return'';
    const c=d.cfg;
    const col=d.score>=61?'var(--accent3)':d.score>=41?'var(--warn)':'var(--danger)';
    return`<div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-size:12px">${c.icon} ${c.nombre}</span>
        <span style="font-family:'Syne',sans-serif;font-size:15px;font-weight:700;color:${col}">${d.score}<span style="font-size:9px;color:var(--muted)">/100</span></span>
      </div>
      <div style="height:6px;background:var(--surface2);border-radius:3px;overflow:hidden">
        <div style="width:${d.score}%;height:100%;background:${col};border-radius:3px;transition:width 0.8s cubic-bezier(0.16,1,0.3,1)"></div>
      </div>
      <div style="font-size:10px;color:var(--muted);margin-top:2px">Peso en scoring: ${c.peso*100}%</div>
    </div>`;
  }).join('');

  // Preguntas de alta prioridad
  const altaPrio=['Q20','Q21','Q22','Q30','Q33','Q37','Q38','Q39','Q40'];
  const altaPrioRows=altaPrio.map(qid=>{
    const meta=BPC_Q_META[qid]; if(!meta)return'';
    const val=R[qid];
    if(typeof val!=='number')return'';
    const col=val>=4?'var(--accent3)':val>=3?'var(--warn)':'var(--danger)';
    return`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px">
      <span style="color:var(--muted);min-width:32px;font-family:'DM Mono',monospace;font-size:10px">${qid}</span>
      <div style="flex:1;line-height:1.4">${meta.txt}</div>
      <div style="min-width:80px;text-align:right">
        <div style="height:4px;background:var(--surface2);border-radius:2px;overflow:hidden;margin-bottom:3px">
          <div style="width:${val*20}%;height:100%;background:${col};border-radius:2px"></div>
        </div>
        <span style="font-weight:700;color:${col}">${val}/5</span>
        <span style="color:var(--muted);font-size:10px"> ${ESC_LBL[val]||''}</span>
      </div>
    </div>`;
  }).join('');

  const ov=document.createElement('div');
  ov.className='modal-overlay open';
  ov.innerHTML=`
    <div class="modal modal-lg" style="max-width:800px;height:90vh;display:flex;flex-direction:column">
      <div class="modal-head" style="flex-shrink:0">
        <div>
          <div class="modal-title">📊 ${env?.empresa||'Cliente'}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">Diagnóstico BPC · ${env?.fechaCompletado||'—'} · ${env?.email||''}</div>
        </div>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body" style="flex:1;overflow-y:auto">

        <!-- Score header -->
        <div style="display:flex;align-items:center;gap:20px;background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:18px 22px;margin-bottom:20px">
          <div style="text-align:center;flex-shrink:0">
            <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Score BPC</div>
            <div style="font-family:'Syne',sans-serif;font-size:52px;font-weight:800;color:${scoreColor};line-height:1">${score}</div>
            <div style="font-size:10px;color:var(--muted)">/100 · ${nivel?.nombre||'—'}</div>
          </div>
          <div style="flex:1">${dimBars}</div>
        </div>

        <!-- Alta prioridad -->
        <div class="form-section" style="margin-top:0;color:var(--danger)">⚡ Indicadores de Alta Prioridad — Compromiso Dirección y Seguimiento</div>
        <div style="margin-bottom:20px">${altaPrioRows||'<div style="color:var(--muted);font-size:12px">Sin datos</div>'}</div>

        <!-- Perfil -->
        <div class="form-section">🏢 Perfil</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:18px;font-size:13px">
          <div><span style="color:var(--muted)">Empleados:</span> <strong>${R.empleados??'—'}</strong></div>
          <div><span style="color:var(--muted)">Vendedores:</span> <strong>${R.vendedores??'—'}</strong></div>
          <div><span style="color:var(--muted)">Gerente comercial:</span> <strong>${R.tieneGerente==='yes'?'Sí':'No'}</strong></div>
          <div><span style="color:var(--muted)">Marketing:</span> <strong>${R.tieneMarketing==='yes'?`Sí (${R.mktPeople||'?'} pers.)`:'No'}</strong></div>
          <div><span style="color:var(--muted)">Web:</span> <strong>${R.tieneWeb==='yes'?`Sí${R.webComercial==='yes'?' (comercial)':''}`:'No'}</strong></div>
          ${R.webUrl?`<div><span style="color:var(--muted)">URL:</span> <strong style="color:var(--accent)">${R.webUrl}</strong></div>`:''}
          <div><span style="color:var(--muted)">CRM:</span> <strong>${R.tieneCRM==='yes'?(R.crmBrand||'Sí'):'No'}</strong></div>
          ${R.crmAdopt?`<div><span style="color:var(--muted)">Adopción:</span> <strong>${R.crmAdopt}</strong></div>`:''}
        </div>

        ${channels.length?`
          <div class="form-section">📢 Canales (${channels.length})</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:18px">
            ${channels.map(c=>`<span style="font-size:11px;padding:4px 12px;background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.2);border-radius:20px;color:var(--accent)">${c}</span>`).join('')}
          </div>`:''}

        ${vendors.length?`
          <div class="form-section">👥 Equipo (${vendors.length})</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px;margin-bottom:18px">
            ${vendors.map(v=>`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;font-size:12px"><div style="font-weight:600">${v.nombre} ${v.apellido}</div><div style="color:var(--muted)">${v.mail||'—'}</div></div>`).join('')}
          </div>`:''}

        ${tieneInforme?`
          <div class="form-section" style="color:var(--accent3)">✅ Informe IA ya generado — ${diagData.informeFecha||'—'}</div>
          <div style="background:rgba(200,168,74,0.05);border:1px solid rgba(200,168,74,0.2);border-radius:10px;padding:14px;font-size:12px;color:var(--muted);margin-bottom:16px">
            El informe fue generado y guardado. Hacé clic en "Ver Informe IA" para abrirlo.
          </div>`:''}

      </div>
      <div class="modal-footer" style="flex-shrink:0">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cerrar</button>
        ${tieneInforme?`<button class="btn" onclick="this.closest('.modal-overlay').remove();bpcAbrirInformeGuardado('${token}')" style="background:rgba(200,168,74,0.1);border-color:rgba(200,168,74,0.3);color:var(--accent3)">📄 Ver Informe IA</button>`:''}
        <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove();bpcGenerarInformeIA('${token}')">🤖 ${tieneInforme?'Regenerar':'Generar'} Informe IA</button>
      </div>
    </div>`;
  ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
  document.body.appendChild(ov);
}

function bpcAbrirInformeGuardado(token){
  const diagKey='bpc_diag_envio_'+token;
  let diagData=null;
  try{diagData=JSON.parse(localStorage.getItem(diagKey));}catch(e){}
  if(!diagData?.informeIA){bpcGenerarInformeIA(token);return;}
  const env=getBPCEnvios().find(e=>e.token===token);
  const score=calcBPCScoreFromDiag(diagData);
  const scoreColor=score>=61?'var(--accent3)':score>=41?'var(--warn)':'var(--danger)';

  const html=diagData.informeIA
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/^---$/gm,'<hr style="border:none;border-top:1px solid var(--border);margin:18px 0">')
    .replace(/^(#{1,3})\s(.+)$/gm,(_,h,t)=>`<div style="font-family:\'Syne\',sans-serif;font-size:${h.length===1?'17':h.length===2?'15':'13'}px;font-weight:700;color:var(--accent);margin:20px 0 8px;text-transform:uppercase;letter-spacing:0.05em">${t}</div>`)
    .replace(/^[-•]\s(.+)$/gm,'<div style="display:flex;gap:8px;margin:4px 0"><span style="color:var(--accent3);flex-shrink:0">›</span><span>$1</span></div>')
    .replace(/\n/g,'<br>');

  const ov=document.createElement('div');
  ov.className='modal-overlay open';
  ov.innerHTML=`
    <div class="modal modal-lg" style="max-width:860px;height:88vh;display:flex;flex-direction:column">
      <div class="modal-head" style="flex-shrink:0">
        <div>
          <div class="modal-title">📄 Informe IA — ${env?.empresa||'Cliente'}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">Score: ${score}/100 · Generado ${diagData.informeFecha||'—'} · Uso interno</div>
        </div>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body" style="flex:1;overflow-y:auto;font-size:13px;line-height:1.8">
        <div style="background:linear-gradient(135deg,rgba(212,175,55,0.06),rgba(200,168,74,0.04));border:1px solid var(--border);border-radius:12px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:16px">
          <div style="font-family:'Syne',sans-serif;font-size:48px;font-weight:800;color:${scoreColor};line-height:1">${score}</div>
          <div>
            <div style="font-weight:600;font-size:15px">${env?.empresa||'—'}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">🔒 Documento interno MetoGroup · ${diagData.informeFecha||todayStr()}</div>
          </div>
        </div>
        <div>${html}</div>
      </div>
      <div class="modal-footer" style="flex-shrink:0">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cerrar</button>
        <button class="btn" onclick="navigator.clipboard.writeText(document.querySelector('.modal-body div:last-child').innerText).then(()=>toast('📋 Copiado'))" style="background:rgba(212,175,55,0.08);border-color:rgba(212,175,55,0.25);color:var(--accent)">📋 Copiar</button>
        <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove();bpcGenerarInformeIA('${token}')">🔄 Regenerar</button>
      </div>
    </div>`;
  ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
  document.body.appendChild(ov);

// ═══ EXPORTAR JSON ═══
function bpcExportarDiagnostico(token){
  const diagKey='bpc_diag_envio_'+token;
  let diagData=null;
  try{diagData=JSON.parse(localStorage.getItem(diagKey));}catch(e){}
  const env=getBPCEnvios().find(e=>e.token===token);
  if(!diagData)return;
  const score=calcBPCScoreFromDiag(diagData);
  const out={empresa:env?.empresa,email:env?.email,fechaCompletado:env?.fechaCompletado,score,nivel:getBPCNivel(score)?.nombre,...diagData};
  const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`diagnostico-bpc-${(env?.empresa||token).replace(/\s+/g,'-')}.json`;
  a.click();
}

// ═══ REENVIAR / ELIMINAR ═══
function bpcReenviar(token){
  const link=window.location.href.split('?')[0]+'?bpc_token='+token;
  navigator.clipboard.writeText(link).then(()=>toast('📋 Enlace copiado al portapapeles'));
}

function bpcEliminarEnvio(token){
  if(!confirm('¿Eliminar este envío del registro?'))return;
  setBPCEnvios(getBPCEnvios().filter(e=>e.token!==token));
  renderBPCScore();
  toast('🗑 Envío eliminado');
}

// ═══ REGISTRAR COMPLETADO (llamado por postMessage o directamente) ═══
function bpcRegistrarCompletado(token, diagData){
  const envios=getBPCEnvios();
  const env=envios.find(e=>e.token===token);
  if(!env||env.estado==='completado')return;
  env.estado='completado';
  env.fechaCompletado=todayStr();
  setBPCEnvios(envios);

  localStorage.setItem('bpc_diag_envio_'+token, JSON.stringify({
    respuestas:diagData.R||{},
    vendors:diagData.vendors||[],
    managers:diagData.managers||[],
    channels:diagData.channels||[],
    channelDetails:diagData.channelDetails||{},
    completadoEn:new Date().toISOString()
  }));

  const score=calcBPCScoreFromDiag({respuestas:diagData.R||{}});
  const nivel=getBPCNivel(score);
  const scoreColor=score>=61?'#c8a84a':score>=41?'#f59e0b':'#ef4444';

  const alertas=getBPCAlertasAdmin();
  alertas.push({
    id:Date.now(),tipo:'completado',leida:false,
    titulo:`✅ Diagnóstico completado — ${env.empresa}`,
    mensaje:`Score BPC: ${score}/100 · Nivel: ${nivel?.nombre||'—'} · ${env.email} · Informe IA generándose...`,
    fecha:todayStr(),token,score
  });
  setBPCAlertasAdmin(alertas);
  updateBPCBadge();

  // ── UNIFICACIÓN: sincronizar al nuevo sistema Supabase ──
  // Si el envío tiene clienteId vinculado, guardar en portal_diagnostico y actualizar auditoría
  const clienteId = env.clienteId ? Number(env.clienteId) : null;
  if(clienteId){
    const fechaHoy = todayStr();
    // 1. portal_diagnostico
    const diagObj = {
      clienteId, completo:true, score,
      fechaFin: fechaHoy, fechaInicio: env.fechaEnvio||fechaHoy,
      respuestas: diagData.R||{}
    };
    const pdCache = _sbCache['portal_diagnostico']||[];
    const pdIdx = pdCache.findIndex(d=>String(d.clienteId)===String(clienteId));
    const pdId = pdIdx>-1 ? pdCache[pdIdx].id : (Math.max(0,...pdCache.map(x=>x.id||0))+1);
    diagObj.id = pdId;
    if(pdIdx>-1) pdCache[pdIdx]=diagObj; else pdCache.push(diagObj);
    _sbCache['portal_diagnostico'] = pdCache;
    try{ localStorage.setItem('METO_portal_diagnostico', JSON.stringify(pdCache)); }catch(e){}
    sbFetch('portal_diagnostico','PATCH',{completo:true,score,fechaFin:fechaHoy,respuestas:JSON.stringify(diagData.R||{})},'?clienteId=eq.'+clienteId)
      .then(r=>{ if(!r||!r.length) sbFetch('portal_diagnostico','POST',{id:pdId,clienteId,completo:true,score,fechaFin:fechaHoy,fechaInicio:env.fechaEnvio||fechaHoy,respuestas:JSON.stringify(diagData.R||{})},''); })
      .catch(e=>console.error('bpcRegistrarCompletado portal_diagnostico:', e));

    // 2. portal_clientes — marcar diagnosticoCompleto
    const pcCache = _sbCache['portal_clientes']||[];
    const pcAcc = pcCache.find(p=>String(p.clienteId)===String(clienteId));
    if(pcAcc){
      pcAcc.diagnosticoCompleto=true; pcAcc.score=score;
      _sbCache['portal_clientes']=pcCache;
      try{ localStorage.setItem('METO_portal_clientes', JSON.stringify(pcCache)); }catch(e){}
      sbFetch('portal_clientes','PATCH',{diagnosticoCompleto:true,score},'?clienteId=eq.'+clienteId).catch(()=>{});
    }

    // 3. auditorias — marcar diagnostico_ok
    const audCache = _sbCache['auditorias']||[];
    const aud = audCache.find(a=>String(a.clienteId)===String(clienteId));
    if(aud){
      aud.diagnostico_ok=true; aud.diagnostico_score=score; aud.diagnostico_fecha=fechaHoy;
      if(aud.estado==='Pendiente'||aud.estado==='Iniciada') aud.estado='En proceso';
      const audIdx=audCache.findIndex(a=>a.id===aud.id);
      if(audIdx>-1) audCache[audIdx]=aud;
      _sbCache['auditorias']=audCache;
      try{ localStorage.setItem('METO_auditorias', JSON.stringify(audCache)); }catch(e){}
      sbFetch('auditorias','PATCH',{diagnostico_ok:true,diagnostico_score:score,diagnostico_fecha:fechaHoy,estado:aud.estado},'?id=eq.'+aud.id)
        .then(r=>{ console.log('✅ bpcRegistrarCompletado — auditoría actualizada:', r); })
        .catch(e=>console.error('bpcRegistrarCompletado auditorias PATCH:', e));
    } else {
      sbFetch('auditorias','GET',null,'?clienteId=eq.'+clienteId+'&select=id,estado').then(rows=>{
        if(rows&&rows.length) sbFetch('auditorias','PATCH',{diagnostico_ok:true,diagnostico_score:score,diagnostico_fecha:fechaHoy},'?id=eq.'+rows[0].id);
      });
    }

    // 4. bpc_tablero_approvals — registrar para aprobación admin
    const appr = _sbCache['bpc_tablero_approvals']||[];
    if(!appr.find(a=>String(a.clienteId)===String(clienteId))){
      const cli=(S.get('clientes')||[]).find(c=>String(c.id)===String(clienteId));
      appr.push({clienteId,clienteNombre:cli?.nombre||env.empresa,score,fechaDiag:new Date().toISOString(),aprobado:false,fechaAprobacion:null});
      _sbCache['bpc_tablero_approvals']=appr;
      try{ localStorage.setItem('METO_bpc_tablero_approvals', JSON.stringify(appr)); }catch(e){}
    }
  }

  // Toast con score coloreado
  toast(`🔔 ${env.empresa} completó el diagnóstico — Score: ${score}/100`);

  // Refrescar página si está activa
  const pg=document.getElementById('bpc-score-content');
  if(pg&&pg.closest('.page')&&pg.closest('.page').classList.contains('active'))renderBPCScore();

  // ── Disparar informe IA automáticamente ──
  // Esperar 1 segundo para que el toast se vea, luego generar
  setTimeout(()=>{
    bpcGenerarInformeIA(token);
  }, 1200);
}

// ═══ ESCUCHAR MENSAJES DEL PORTAL EMBEBIDO ═══
window.addEventListener('message',function(evt){
  if(!evt.data||evt.data.type!=='bpc_completado')return;
  bpcRegistrarCompletado(evt.data.token, evt.data.diagData||{});
});

// ═══ CRM PRO — Funciones de seguimiento avanzado ═══

// Chequeo de duplicados en tiempo real al tipear en el log de actividad
function logCheckEmpresasDup(val, warnId){
  const warn=document.getElementById(warnId);
  if(!warn)return;
  const empresas=val.split('\n').map(e=>e.trim()).filter(Boolean);
  if(!empresas.length){warn.style.display='none';return;}
  const alertas=[];
  empresas.forEach(emp=>{
    const act=crmUltimaActividadEmpresa(emp);
    if(act){
      const dias=Math.floor((new Date()-new Date(act.fecha+'T12:00:00'))/(1000*60*60*24));
      const diasStr=dias===0?'<strong style="color:var(--danger)">hoy</strong>':dias===1?'<strong style="color:var(--danger)">ayer</strong>':`<strong>hace ${dias} días</strong>`;
      const urgente=dias<=7;
      alertas.push(`${urgente?'🔴':'🟡'} <strong>${emp}</strong> — último contacto: ${fmtD(act.fecha)} (${diasStr}) por <strong>${act.vendedor}</strong>`);
    }
  });
  if(alertas.length){
    warn.style.display='block';
    warn.innerHTML='<div style="font-size:11px;font-weight:700;margin-bottom:6px;color:var(--warn)">⚠️ Historial de contacto detectado:</div>'+alertas.join('<br>');
  } else {
    warn.style.display='none';
  }
}

// Modal de historial completo de una empresa en el CRM
function crmHistorialEmpresa(nombreEmpresa){
  if(!nombreEmpresa)return;
  const norm=nombreEmpresa.trim().toLowerCase();

  // Recopilar todas las actividades de esa empresa
  const segs=S.get('crm_seguimientos').filter(s=>(s.empresa||'').trim().toLowerCase()===norm);
  const logs=S.get('crm_logs').filter(l=>{
    const ea=(l.empresasAgendadas||'').toLowerCase();
    const es=(l.empresasSeguimiento||'').toLowerCase();
    return ea.includes(norm)||es.includes(norm);
  });
  const bases=S.get('crm_bases_datos').filter(b=>(b.empresa||'').toLowerCase()===norm);
  const auds=S.get('auditorias').filter(a=>(a.clienteNombre||'').toLowerCase()===norm);

  // Construir timeline
  const timeline=[
    ...segs.map(s=>({
      fecha:s.fecha, tipo:'seguimiento', vendedor:s.vendedor,
      icon:s.hecho?'✅':'🔔', color:s.hecho?'var(--accent3)':'var(--warn)',
      texto:`Seguimiento${s.contacto?' con '+s.contacto:''}${s.notas?' — '+s.notas:''}`,
      estado:s.hecho?'Completado':'Pendiente'
    })),
    ...logs.map(l=>({
      fecha:l.fecha, tipo:'log', vendedor:l.vendedor,
      icon:'📞', color:'var(--accent)',
      texto:`Log actividad: ${l.llamadas||0} llamadas · ${l.duenos||0} dueños · ${l.agendadas||0} agendadas`,
      estado:''
    })),
    ...auds.map(a=>({
      fecha:a.fInicio||a.fechaCreacion||'', tipo:'auditoria', vendedor:a.vendedor||a.auditor||'',
      icon:'🏆', color:'#f59e0b',
      texto:`${a.tipo} — ${a.estado}${a.monto?' · '+fmt(a.monto):''}`,
      estado:a.estado
    }))
  ].filter(x=>x.fecha).sort((a,b)=>b.fecha.localeCompare(a.fecha));

  const baseDatos=bases[0];
  const ultimaAct=timeline[0];
  const diasDesde=ultimaAct?Math.floor((new Date()-new Date(ultimaAct.fecha+'T12:00:00'))/(1000*60*60*24)):null;

  const ov=document.createElement('div');
  ov.className='modal-overlay open';
  ov.innerHTML=`
    <div class="modal modal-lg" style="max-width:720px;height:85vh;display:flex;flex-direction:column">
      <div class="modal-head" style="flex-shrink:0">
        <div>
          <div class="modal-title">🏢 ${nombreEmpresa}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">Historial completo en el CRM · ${timeline.length} actividades registradas</div>
        </div>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body" style="flex:1;overflow-y:auto">

        <!-- Resumen top -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:20px">
          <div style="background:var(--surface2);border-radius:10px;padding:12px;text-align:center">
            <div style="font-size:22px;font-weight:800;color:${diasDesde===null?'var(--muted)':diasDesde<=7?'var(--danger)':diasDesde<=30?'var(--warn)':'var(--accent3)'}">${diasDesde===null?'—':diasDesde}</div>
            <div style="font-size:10px;color:var(--muted)">Días sin contacto</div>
          </div>
          <div style="background:var(--surface2);border-radius:10px;padding:12px;text-align:center">
            <div style="font-size:22px;font-weight:800;color:var(--accent)">${logs.length}</div>
            <div style="font-size:10px;color:var(--muted)">Logs de actividad</div>
          </div>
          <div style="background:var(--surface2);border-radius:10px;padding:12px;text-align:center">
            <div style="font-size:22px;font-weight:800;color:var(--warn)">${segs.length}</div>
            <div style="font-size:10px;color:var(--muted)">Seguimientos</div>
          </div>
          <div style="background:var(--surface2);border-radius:10px;padding:12px;text-align:center">
            <div style="font-size:22px;font-weight:800;color:#f59e0b">${auds.length}</div>
            <div style="font-size:10px;color:var(--muted)">Auditorías</div>
          </div>
        </div>

        ${baseDatos?`
          <div style="background:rgba(212,175,55,0.05);border:1px solid rgba(212,175,55,0.2);border-radius:12px;padding:14px 18px;margin-bottom:18px;font-size:12px">
            <div style="font-size:11px;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">📋 Ficha de la empresa</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
              <div><span style="color:var(--muted)">Rubro:</span> ${baseDatos.rubro||'—'}</div>
              <div><span style="color:var(--muted)">Ciudad:</span> ${baseDatos.ciudad||'—'}</div>
              <div><span style="color:var(--muted)">Contacto:</span> ${baseDatos.contacto||'—'}</div>
              <div><span style="color:var(--muted)">Tel:</span> ${baseDatos.telefono||'—'}</div>
              <div><span style="color:var(--muted)">Email:</span> ${baseDatos.email||'—'}</div>
              <div><span style="color:var(--muted)">Estado BD:</span> ${baseDatos.estado||'—'}</div>
              <div><span style="color:var(--muted)">Vendedor:</span> <strong>${baseDatos.vendedor||'—'}</strong></div>
              <div><span style="color:var(--muted)">Cargada:</span> ${fmtD(baseDatos.fechaCreacion)||'—'}</div>
            </div>
            ${baseDatos.notas?`<div style="margin-top:8px;border-top:1px solid rgba(255,255,255,0.05);padding-top:8px;color:var(--muted)">${baseDatos.notas}</div>`:''}
          </div>`:''}

        <!-- Timeline -->
        <div style="font-family:'Syne',sans-serif;font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Timeline de actividad</div>
        ${timeline.length?`
          <div style="position:relative;padding-left:24px">
            <div style="position:absolute;left:7px;top:0;bottom:0;width:2px;background:var(--border);border-radius:1px"></div>
            ${timeline.map(t=>`
              <div style="position:relative;margin-bottom:14px">
                <div style="position:absolute;left:-21px;top:3px;width:14px;height:14px;border-radius:50%;background:${t.color};display:flex;align-items:center;justify-content:center;font-size:8px;border:2px solid var(--surface)">${t.icon}</div>
                <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 14px">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
                    <div style="font-size:11px;font-weight:700;color:${t.color}">${t.tipo==='seguimiento'?'Seguimiento':t.tipo==='log'?'Actividad':'Auditoría'}</div>
                    <div style="font-size:10px;color:var(--muted)">${fmtD(t.fecha)} · <strong>${t.vendedor}</strong></div>
                  </div>
                  <div style="font-size:12px;color:var(--text)">${t.texto}</div>
                  ${t.estado?`<div style="margin-top:4px"><span style="font-size:9px;padding:1px 8px;border-radius:8px;background:rgba(255,255,255,0.06);color:var(--muted)">${t.estado}</span></div>`:''}
                </div>
              </div>`).join('')}
          </div>`:`<div style="text-align:center;padding:32px;color:var(--muted);font-size:12px">Sin actividad registrada para esta empresa</div>`}
      </div>
      <div class="modal-footer" style="flex-shrink:0">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cerrar</button>
        <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove();abrirSeguimiento('','${nombreEmpresa.replace(/'/g,"\\'")}')">🔔 + Seguimiento</button>
      </div>
    </div>`;
  ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
  document.body.appendChild(ov);
}

// Abrir seguimiento con empresa pre-cargada
function abrirSeguimientoEmpresa(vendedor, empresa){
  abrirSeguimiento(vendedor);
  setTimeout(()=>{
    const empInput=document.getElementById('seg-empresa');
    if(empInput){ empInput.value=empresa; }
  },200);
}

// dtDetalle extendido para consultor (honorarios, rendiciones)
const _dtDetalleOrig=typeof dtDetalle==='function'?dtDetalle:null;
function dtDetalle(tipo){
  // Nuevos tipos de consultor
  if(tipo==='hon_mes_consultor'||tipo==='rend_mes_consultor'||tipo==='total_cobrar_consultor'||tipo==='acumulado_consultor'){
    const me=currentUser;
    const auditor=S.get('auditores').find(a=>a._usuarioId===me?.id||a.nombre===me?.nombre)||{};
    const honUnit=Number(auditor.honorarios)||300;
    const auds=S.get('auditorias').filter(a=>a.auditor===me.nombre);
    const ym=todayStr().substring(0,7);
    const rendiciones=S.get('rendiciones_gastos').filter(r=>r.auditorNombre===me.nombre||r.auditor===me.nombre||r.autorId===me.id);
    const completadas=auds.filter(a=>a.estado==='Completada');
    const mesMios=completadas.filter(a=>(a.fInforme||a.fInsitu||'').startsWith(ym));
    const rendMes=rendiciones.filter(r=>r.fecha?.startsWith(ym)&&r.estadoAprobacion==='Aprobado');
    let titulo='',body='';
    if(tipo==='hon_mes_consultor'){titulo='💰 Honorarios del Mes';body=`<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Tipo</th><th>Fecha</th><th>Honorario</th></tr></thead><tbody>${mesMios.map(a=>`<tr><td>${a.clienteNombre}</td><td>${a.tipo}</td><td>${fmtD(a.fInforme||a.fInsitu)}</td><td style="color:var(--accent3);font-weight:700">${fmt(honUnit)}</td></tr>`).join('')||'<tr><td colspan="4" style="text-align:center;color:var(--muted)">Sin completadas este mes</td></tr>'}</tbody></table></div>`;}
    else if(tipo==='rend_mes_consultor'){titulo='🧾 Rendiciones del Mes';body=`<div class="table-wrap"><table><thead><tr><th>Concepto</th><th>Fecha</th><th>Monto</th><th>Estado</th></tr></thead><tbody>${rendMes.map(r=>`<tr><td>${r.concepto||r.descripcion||'—'}</td><td>${fmtD(r.fecha)}</td><td style="color:var(--warn);font-weight:700">${fmt(r.monto)}</td><td>${badge(r.estadoAprobacion||'Pendiente')}</td></tr>`).join('')||'<tr><td colspan="4" style="text-align:center;color:var(--muted)">Sin rendiciones aprobadas este mes</td></tr>'}</tbody></table></div>`;}
    else if(tipo==='total_cobrar_consultor'){titulo='📊 Total a Cobrar — Desglose';const honM=mesMios.length*honUnit;const rendM=rendMes.reduce((s,r)=>s+(Number(r.monto)||0),0);body=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px"><div style="background:var(--surface2);border-radius:12px;padding:20px;text-align:center"><div style="font-size:11px;color:var(--muted)">Honorarios</div><div style="font-family:'Syne',sans-serif;font-size:32px;font-weight:800;color:var(--accent3)">${fmt(honM)}</div></div><div style="background:var(--surface2);border-radius:12px;padding:20px;text-align:center"><div style="font-size:11px;color:var(--muted)">Rendiciones</div><div style="font-family:'Syne',sans-serif;font-size:32px;font-weight:800;color:var(--warn)">${fmt(rendM)}</div></div></div>`;}
    else if(tipo==='acumulado_consultor'){titulo='💎 Acumulado Total';const honT=completadas.length*honUnit;const rendT=rendiciones.filter(r=>r.estadoAprobacion==='Aprobado').reduce((s,r)=>s+(Number(r.monto)||0),0);body=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px"><div style="background:var(--surface2);border-radius:12px;padding:20px;text-align:center"><div style="font-size:11px;color:var(--muted)">Honorarios acumulados</div><div style="font-family:'Syne',sans-serif;font-size:32px;font-weight:800;color:var(--accent3)">${fmt(honT)}</div><div style="font-size:10px;color:var(--muted)">${completadas.length} auditorías × ${fmt(honUnit)}</div></div><div style="background:var(--surface2);border-radius:12px;padding:20px;text-align:center"><div style="font-size:11px;color:var(--muted)">Rendiciones aprobadas</div><div style="font-family:'Syne',sans-serif;font-size:32px;font-weight:800;color:var(--warn)">${fmt(rendT)}</div></div></div>`;}
    let m=document.getElementById('modal-admin-detalle');
    if(!m){m=document.createElement('div');m.className='modal-overlay';m.id='modal-admin-detalle';m.innerHTML='<div class="modal" style="width:900px;max-width:95vw;max-height:90vh;display:flex;flex-direction:column"></div>';document.body.appendChild(m);}
    m.querySelector('.modal').innerHTML=`<div class="modal-head"><div class="modal-title">${titulo}</div><button class="modal-close" onclick="closeModal('modal-admin-detalle')">✕</button></div><div class="modal-body" style="overflow-y:auto;flex:1">${body}</div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal('modal-admin-detalle')">Cerrar</button></div>`;
    m.classList.add('open');
    return;
  }
  // Tipos de sueldos
  if(tipo==='nomina'||tipo==='bruto'||tipo==='neto'||tipo==='costo'){
    const nomina=S.get('personal_sueldos')||[];
    const activos=nomina.filter(e=>e.activo!==false);
    const MKT={nomina:'🧑‍💼 Nómina Activa',bruto:'💵 Total Bruto',neto:'💰 Neto Estimado',costo:'🏢 Costo Empresa'};
    let body='';
    if(tipo==='nomina'){body=`<div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Tipo</th><th>Sueldo Bruto</th><th>Neto Est.</th></tr></thead><tbody>${activos.map(e=>`<tr><td style="font-weight:600">${e.nombre}</td><td><span style="font-size:10px;padding:2px 8px;border-radius:8px;background:var(--surface2)">${e._tipo||'—'}</span></td><td style="color:var(--accent3)">${fmt(e.sueldo||0)}</td><td style="color:#c8a84a">${fmt((e.sueldo||0)*0.83)}</td></tr>`).join('')}</tbody></table></div>`;}
    else if(tipo==='bruto'){const tot=activos.reduce((s,e)=>s+(Number(e.sueldo)||0),0);body=`<div style="text-align:center;padding:24px"><div style="font-family:'Syne',sans-serif;font-size:48px;font-weight:800;color:var(--accent3)">${fmt(tot)}</div><div style="color:var(--muted);margin-top:8px">Suma de sueldos brutos de ${activos.length} empleados activos</div></div>`;}
    else if(tipo==='neto'){const tot=activos.reduce((s,e)=>s+(Number(e.sueldo)||0)*0.83,0);body=`<div style="text-align:center;padding:24px"><div style="font-family:'Syne',sans-serif;font-size:48px;font-weight:800;color:#c8a84a">${fmt(tot)}</div><div style="color:var(--muted);margin-top:8px">Estimado neto (83% del bruto)</div></div>`;}
    else if(tipo==='costo'){const tot=activos.reduce((s,e)=>s+(Number(e.sueldo)||0)*1.32,0);body=`<div style="text-align:center;padding:24px"><div style="font-family:'Syne',sans-serif;font-size:48px;font-weight:800;color:var(--danger)">${fmt(tot)}</div><div style="color:var(--muted);margin-top:8px">Costo empresa estimado (132% del bruto)</div></div>`;}
    let m=document.getElementById('modal-admin-detalle');
    if(!m){m=document.createElement('div');m.className='modal-overlay';m.id='modal-admin-detalle';m.innerHTML='<div class="modal" style="width:900px;max-width:95vw;max-height:90vh;display:flex;flex-direction:column"></div>';document.body.appendChild(m);}
    m.querySelector('.modal').innerHTML=`<div class="modal-head"><div class="modal-title">${MKT[tipo]}</div><button class="modal-close" onclick="closeModal('modal-admin-detalle')">✕</button></div><div class="modal-body" style="overflow-y:auto;flex:1">${body}</div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal('modal-admin-detalle')">Cerrar</button></div>`;
    m.classList.add('open');
    return;
  }
  // Fallback: llamar función original
  if(_dtDetalleOrig) _dtDetalleOrig(tipo);
}

// sueldosDetalle — alias para compatibilidad con el onclick de las tarjetas
function sueldosDetalle(tipo){ dtDetalle(tipo); }

// Hacer clickeables las person-cards de consultores (renderAuditores)
// Las cards ya tienen botones; el onclick sobre la card entera abre la ficha
document.addEventListener('click',function(e){
  const pc=e.target.closest('.person-card[data-consultor-id]');
  if(pc&&!e.target.closest('button')&&!e.target.closest('a')){
    const id=Number(pc.dataset.consultorId);
    if(id) verFichaConsultor(id);
  }
});

// ═══ BADGE AL INICIAR ═══
setTimeout(updateBPCBadge, 1200);

} // auto-close
