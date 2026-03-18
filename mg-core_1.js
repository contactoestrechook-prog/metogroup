

// ── mg-core.js ──

// ============================================================
// ⚙️ VARIABLES GLOBALES
// ============================================================
let currentUser = null;

// ============================================================
// ⚙️ CONFIGURACIÓN — Pegá tu API key de Anthropic acá abajo
// ============================================================
let ANTHROPIC_API_KEY = '';

// Capturar errores con línea exacta para debugging
window.addEventListener('error', function(e){
  const msg = e.message + ' | Línea: ' + e.lineno + ' | Función: ' + (e.filename||'').split('/').pop();
  console.error('🔴 ERROR CAPTURADO:', msg);
  // Solo mostrar toast para errores en líneas reales (no errores de red/eval en línea -1 o 1)
  if(typeof toast === 'function' && e.lineno > 1 && e.colno > 0){
    toast('Error JS: ' + e.message.substring(0,60));
  }
});
// Se carga desde Supabase (tabla sueldos_config, key='anthropic_api_key')
async function loadApiKey(){
  // Recuperar de múltiples fuentes — prioridad: localStorage → sessionStorage → cookie → Supabase
  let foundKey = '';

  // 1. localStorage
  foundKey = localStorage.getItem('METO_anthropic_key') || '';

  // 2. sessionStorage como fallback
  if(!foundKey || !foundKey.startsWith('sk-')){
    const bk = sessionStorage.getItem('METO_anthropic_key_bk') || '';
    if(bk.startsWith('sk-')){
      foundKey = bk;
      localStorage.setItem('METO_anthropic_key', bk); // restaurar localStorage
    }
  }

  // 3. Cookie como fallback
  if(!foundKey || !foundKey.startsWith('sk-')){
    try{
      const match = document.cookie.match(/mg_ak=([^;]+)/);
      if(match){
        const ck = decodeURIComponent(match[1]);
        if(ck.startsWith('sk-')){
          foundKey = ck;
          localStorage.setItem('METO_anthropic_key', ck);
          sessionStorage.setItem('METO_anthropic_key_bk', ck);
        }
      }
    }catch(e){}
  }

  if(foundKey && foundKey.startsWith('sk-')){ ANTHROPIC_API_KEY = foundKey; }
  const local = foundKey; // compatibilidad con el código de abajo

  // Cargar config SMTP — intentar varias fuentes
  const existing = S.get('email_config')||[];
  if(!existing.length || !existing[0].smtp_user){
    // Fuente 1: METO_smtp_config (configuración explícita)
    const smtpRaw = localStorage.getItem('METO_smtp_config');
    if(smtpRaw){
      try{
        const smtp = JSON.parse(smtpRaw);
        if(smtp.user && smtp.pass){
          S.set('email_config',[{id:1, smtp_user:smtp.user, smtp_pass:smtp.pass}]);
        }
      }catch(e){}
    }
    // Fuente 2: METO_email_cred_X (credencial del módulo Correos)
    // Buscar credenciales de usuarios dueño/admin
    if(!(S.get('email_config')||[])[0]?.smtp_user){
      const usuarios = S.get('usuarios')||[];
      const admins = usuarios.filter(u=>{
        const r = getUserRoles ? getUserRoles(u) : (Array.isArray(u.roles)?u.roles:[u.rol]);
        return r.includes('dueno')||r.includes('admin');
      });
      for(const u of admins){
        const credRaw = localStorage.getItem('METO_email_cred_'+u.id);
        if(credRaw && u.email){
          let pass = null;
          try{
            if(credRaw.startsWith('URI:')) pass = decodeURIComponent(credRaw.slice(4));
            else if(credRaw.startsWith('RAW:')) pass = decodeURIComponent(credRaw.slice(4));
            else pass = atob(credRaw);
          }catch(e){}
          if(pass && u.email){
            S.set('email_config',[{id:1, smtp_user:u.email, smtp_pass:pass}]);
            break;
          }
        }
      }
    }
  }
  // Siempre intentar Supabase — es la fuente de verdad cross-browser
  try{
    const cfg=await sbFetch('sueldos_config','GET',null,'?key=eq.anthropic_api_key');
    const sbKey = cfg&&cfg.length&&cfg[0]?.data?.key ? cfg[0].data.key : '';
    if(sbKey && sbKey.startsWith('sk-')){
      ANTHROPIC_API_KEY = sbKey;
      // Persistir localmente para el browser actual
      localStorage.setItem('METO_anthropic_key', sbKey);
      sessionStorage.setItem('METO_anthropic_key_bk', sbKey);
      try{
        const exp = new Date(); exp.setFullYear(exp.getFullYear()+1);
        document.cookie = 'mg_ak='+encodeURIComponent(sbKey)+';expires='+exp.toUTCString()+';path=/;SameSite=Strict';
      }catch(e){}
    }
  }catch(e){
    console.warn('loadApiKey Supabase falló, reintentando en 5s...');
    // Retry automático — importante para browsers que cargan antes que Supabase responda
    setTimeout(async()=>{
      try{
        const cfg2 = await sbFetch('sueldos_config','GET',null,'?key=eq.anthropic_api_key');
        const sbKey2 = cfg2&&cfg2.length&&cfg2[0]?.data?.key ? cfg2[0].data.key : '';
        if(sbKey2 && sbKey2.startsWith('sk-')){
          ANTHROPIC_API_KEY = sbKey2;
          localStorage.setItem('METO_anthropic_key', sbKey2);
          sessionStorage.setItem('METO_anthropic_key_bk', sbKey2);
          console.log('✅ API key cargada en retry');
        }
      }catch(e2){ console.warn('loadApiKey retry también falló:', e2.message); }
    }, 5000);
  }
}
async function saveApiKey(k){
  if(!k || !k.startsWith('sk-')) return; // nunca guardar vacío o inválido
  ANTHROPIC_API_KEY = k;
  // 1. localStorage — fuente primaria
  localStorage.setItem('METO_anthropic_key', k);
  // 2. sessionStorage — persiste en la sesión aunque limpien localStorage
  sessionStorage.setItem('METO_anthropic_key_bk', k);
  // 3. Supabase — backup permanente
  try{
    const items = S.get('sueldos_config')||[];
    const i = items.findIndex(x=>x.key==='anthropic_api_key');
    const data = {key:'anthropic_api_key', data:{key:k}};
    if(i>-1){ data.id=items[i].id; items[i]=data; } else { data.id=S.nextId('sueldos_config'); items.push(data); }
    S.set('sueldos_config', items);
  }catch(e){}
  // 4. Cookie como último recurso (365 días)
  try{
    const exp = new Date(); exp.setFullYear(exp.getFullYear()+1);
    document.cookie = 'mg_ak='+encodeURIComponent(k)+';expires='+exp.toUTCString()+';path=/;SameSite=Strict';
  }catch(e){}
}
// ─── SMTP por cuenta ─────────────────────────────────────────────────────────
// Devuelve {smtp_user, smtp_pass, from_name} para un email dado.
// Si no tiene SMTP propio, cae al SMTP global (Hernán Quiroz).
function getSmtpFor(email){
  const configs = S.get('email_config')||[];
  // Buscar config específica para este email
  const specific = configs.find(c=>c.email && c.email.toLowerCase()===(email||'').toLowerCase());
  if(specific?.smtp_user && specific?.smtp_pass){
    return { smtp_user: specific.smtp_user, smtp_pass: specific.smtp_pass, from_name: specific.from_name||email };
  }
  // Fallback: config global (índice 0 sin campo email, o el primero disponible)
  const global = configs.find(c=>c.smtp_user && c.smtp_pass) || {};
  return { smtp_user: global.smtp_user||'', smtp_pass: global.smtp_pass||'', from_name: global.from_name||AGENTE.EMAIL_AGENTE_NOMBRE||'MetoGroup' };
}

function saveSmtpFor(email, smtp_user, smtp_pass, from_name){
  if(!smtp_user||!smtp_pass) return;
  const configs = S.get('email_config')||[];
  const idx = configs.findIndex(c=>c.email && c.email.toLowerCase()===email.toLowerCase());
  const item = { id: idx>-1?configs[idx].id:S.nextId('email_config'), email, smtp_user, smtp_pass, from_name:from_name||email };
  if(idx>-1) configs[idx]=item; else configs.push(item);
  S.set('email_config', configs);
}

// ☝️ Reemplazá PEGAR-TU-KEY-AQUI por tu key real de console.anthropic.com
// Ejemplo: 'sk-ant-api03-xxxxx...'
// ============================================================

// ============================================================
// 🎨 PREFERENCIAS VISUALES POR USUARIO (tema + fuente)
// ============================================================
function _userPrefKey(){ return 'METO_prefs_'+(currentUser?.id||'default'); }

function userSetTheme(theme){
  document.body.classList.remove('theme-light','theme-steel');
  if(theme==='light') document.body.classList.add('theme-light');
  else if(theme==='steel') document.body.classList.add('theme-steel');
  // Guardar preferencia
  const prefs=JSON.parse(localStorage.getItem(_userPrefKey())||'{}');
  prefs.theme=theme;
  localStorage.setItem(_userPrefKey(),JSON.stringify(prefs));
  // Visual feedback botones
  const btnD=document.getElementById('btn-theme-dark');
  const btnS=document.getElementById('btn-theme-steel');
  const btnL=document.getElementById('btn-theme-light');
  if(btnD)btnD.style.borderColor=theme==='dark'?'var(--accent)':'var(--border)';
  if(btnS)btnS.style.borderColor=theme==='steel'?'var(--accent)':'var(--border)';
  if(btnL)btnL.style.borderColor=theme==='light'?'var(--accent)':'var(--border)';
}

let _currentFontScale=1;
function userSetFontSize(dir){
  if(dir===0){_currentFontScale=1;}
  else{_currentFontScale=Math.max(0.8,Math.min(1.4,_currentFontScale+(dir*0.1)));}
  document.documentElement.style.setProperty('--font-scale',_currentFontScale);
  const prefs=JSON.parse(localStorage.getItem(_userPrefKey())||'{}');
  prefs.fontScale=_currentFontScale;
  localStorage.setItem(_userPrefKey(),JSON.stringify(prefs));
}

function userLoadPrefs(){
  const prefs=JSON.parse(localStorage.getItem(_userPrefKey())||'{}');
  if(prefs.theme) userSetTheme(prefs.theme);
  if(prefs.fontScale){_currentFontScale=prefs.fontScale;document.documentElement.style.setProperty('--font-scale',_currentFontScale);}
}

// ============================================================
// STORAGE — Supabase Cloud + Caché Local
// ============================================================
// ============================================================
// STORAGE — Supabase Cloud + Caché Local
// Todas las tablas del negocio persisten en la nube
// Keys dinámicas (chat, prefs) van a localStorage
// ============================================================
const SUPABASE_URL = 'https://smcghyecpzzimadtuern.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtY2doeWVjcHp6aW1hZHR1ZXJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzODYwMTksImV4cCI6MjA4Nzk2MjAxOX0.u9OgCRMPFnuNLq4UinR1idpRykVF_VKPwIvFXgttVOw';

// Mapeo: clave JS → tabla Supabase
const SB_TABLES = {
  usuarios:'usuarios', auditorias:'auditorias', auditores:'auditores',
  clientes:'clientes', vendedores:'vendedores', cotizaciones:'cotizaciones',
  gastos:'gastos', cobros:'cobros', impuestos:'impuestos',
  crm_logs:'crm_logs', crm_seguimientos:'crm_seguimientos',
  crm_objetivos:'crm_objetivos', crm_premios:'crm_premios',
  crm_notas_vend:'crm_notas_vend', crm_referidos:'crm_referidos',
  crm_bases_datos:'crm_bases_datos', crm_obj_dueno:'crm_obj_dueno',
  admin_ventas_pendientes:'admin_ventas_pendientes',
  retiros_socios:'retiros_socios', ahorros:'ahorros', reparto_tc:'reparto_tc',
  rendiciones_gastos:'rendiciones_gastos', entregas_consultor:'entregas_consultor',
  notif_consultor:'notif_consultor', personal_sueldos:'personal_sueldos',
  liquidaciones_sueldos:'liquidaciones_sueldos',
  sueldos_config:'sueldos_config',
  obj_personal:'obj_personal',
  vend_contactos:'vend_contactos',
  portal_clientes:'portal_clientes',
  portal_diagnostico:'portal_diagnostico',
  portal_documentos:'portal_documentos',
  portal_chat:'portal_chat',
  portal_plan_accion:'portal_plan_accion',
  portal_hitos:'portal_hitos',
  bpc_tablero_approvals:'bpc_tablero_approvals',
  admin_empresa_acceso:'admin_empresa_acceso',
  admin_empresa_equipo:'admin_empresa_equipo',
  examen_codigos:'examen_codigos',
  agente_log:'agente_log',
  cliente_facturas:'cliente_facturas',
  cliente_anotaciones:'cliente_anotaciones',
  cliente_seguimiento:'cliente_seguimiento'
};

// Columnas por tabla — campos que Supabase acepta
const SB_COLS = {
  usuarios:['id','nombre','usuario','password','email','tel','rol','roles','activo','consultor_vinculado','calendly','calendly2','consultorId'],
  auditorias:['id','tipo','clienteNombre','clienteId','consultor','auditor','vendedor','estado','monto','fInicio','fDoc','fExterna','fInsitu','fPrep','fInforme','fSeguimiento','fCierre','notas','evidencias','historial','resultado','auditorId','diagnostico_ok','diagnostico_score','diagnostico_fecha','diagnostico_score','informe_diagnostico','informe_diagnostico_fecha','informe_diagnostico_score','score_diagnostico_aporte'],
  auditores:['id','nombre','dni','email','tel','direccion','pais','especialidad','titulo','certificaciones','bio','honorarios','formapago','cbu','estado','drive','notas','maxauds','maximpls','_usuarioId'],
  clientes:['id','nombre','cuit','rubro','pais','direccion','web','contacto','cargo','email','email2','tel','wa','notas','vendedor','comision','encargado_nombre','encargado_cargo','encargado_email','encargado_tel','contrato_url','contrato_nombre'],
  vendedores:['id','nombre','email','tel','sueldo','comision','ingreso','estado','_usuarioId'],
  cotizaciones:['id','numero','cliente','servicio','monto','fecha','vencimiento','estado','desc','detalle','moneda'],
  gastos:['id','concepto','categoria','monto','fecha','estadoPago','proveedor','comprobante','notas','medio','pagadoPor','auditoria','acreedor','vencimiento','recurrente','frecuencia'],
  cobros:['id','cliente','auditoriaId','auditoriaNombre','concepto','servicio','montoTotal','nCuotas','forma','contrato','comprobante','cuotas','notas','audNombre','moneda','fechaCreacion','createdAt'],
  impuestos:['id','tipo','nombre','concepto','monto','periodo','vencimiento','estado','comprobante','notas','fechaPago'],
  crm_logs:['id','vendedor','fecha','llamadas','duenos','agendadas','cerradas','referidos','notas','empresasAgendadas','empresasSeguimiento','entrevistador'],
  crm_seguimientos:['id','vendedor','empresa','contacto','fecha','prioridad','comision','notas','hecho','fechaCreacion','tipo'],
  crm_objetivos:['id','key','vendedorId','ym','llamadas','duenos','agendadas','cerradas','referidos'],
  crm_premios:['id','ym','titulo','nombre','desc','descripcion','criterio','tipo','umbral','premio','premioPct','activo'],
  crm_notas_vend:['id','vendedorId','titulo','texto','fecha','autor','prioridad','leida','fechaLeida','creado'],
  crm_referidos:['id','vendedor','empresa','contacto','tel','email','referidoPor','estado','notas','fecha','comision'],
  crm_entrevistas:['id','empresa','vendedor','entrevistador','fechaAgendada','fechaRealizada','resultado','observaciones','interesado','proximoPaso','fechaCreacion','estado','feedbackVendedor','cerradoPor','comisionVendedor','entrevistaId'],
  crm_bases_datos:['id','empresa','rubro','contacto','telefono','email','estado','servicio','notas','vendedor','fechaCreacion','historial','etapaPipeline','montoEstimado'],
  crm_obj_dueno:['id','ym','auditorias','ia','implementaciones','facturacion','cobros'],
  admin_ventas_pendientes:['id','empresa','vendedor','servicio','monto','fecha','estado','notas','contacto','email','tel','cuit','rubro','tipo','segId','clienteExistente','vendedorId','comision','fechaProcesado'],
  retiros_socios:['id','socio','monto','fecha','concepto','comprobante'],
  ahorros:['id','tipo','monto','fecha','concepto','comprobante'],
  reparto_tc:['id','data'],
  rendiciones_gastos:['id','consultor','fecha','concepto','monto','estado','comprobante','notas','empresa','tipoGasto','medioPago','estadoAprobacion'],
  entregas_consultor:['id','consultor','auditoriaId','cliente','clienteNombre','tipo','fecha','estado','notas','archivo','linkInforme','linkDocs'],
  notif_consultor:['id','consultor','titulo','mensaje','tipo','data','leida','fecha'],
  personal_sueldos:['id','nombre','cargo','cuil','ingreso','sueldoBruto','antiguedadPct','presentismo','sindicato','adicionales','hsExtras','retGanancias','cbu','activo','obraSocial'],
  liquidaciones_sueldos:['id','periodo','fecha','estado','fechaPago','empleados','totalBruto','totalNeto','totalCosto'],
  sueldos_config:['id','key','data'],
  obj_personal:['id','vendedorId','ym','llamadas','duenos','entrevistas','cierres','plata','proposito'],
  vend_contactos:["id","vendedorNombre","nombre","empresa","cargo","tel","wa","notas","estado"],
  portal_clientes:["id","clienteId","magicKey","activo","fechaCreacion","diagnosticoCompleto","score"],
  portal_diagnostico:["id","clienteId","respuestas","completo","fechaInicio","fechaFin","score","informeIA","informeFecha"],
  bpc_tablero_approvals:["clienteId","clienteNombre","score","fechaDiag","aprobado","fechaAprobacion"],
  admin_empresa_acceso:["id","clienteId","magicKey","activo","fechaCreacion","equipoCompleto"],
  admin_empresa_equipo:["id","clienteId","nombre","apellido","puesto","antiguedad","telefono","email","fechaCarga"],
  examen_codigos:["codigo","nombre","empresa","email","activo","usado","tipo","auditoriaId","fechaCreacion"],
  portal_documentos:["id","clienteId","nombre","tipo","etapa","estado","fecha","notas","archivo"],
  portal_chat:["id","clienteId","consultorId","autor","mensaje","fecha","hora"],
  portal_plan_accion:["id","clienteId","ref","hallazgo","tipo","dominio","responsable","plazo","fechaVenc","accion","criterio","prioridad","estado","avance","fechaCierre","verificador","obs"],
  portal_hitos:["id","clienteId","nombre","fecha","hora","estado","tipo","notas"],
  agente_log:["id","fecha","hora","ts","accion","destinatario","clienteNombre","auditoriaId","detalle","tipo","revisado","revisado_por","revisado_fecha","html_preview"],
  cliente_facturas:["id","clienteId","numero","concepto","monto","moneda","fecha","fechaVto","estado","linkAlegra","notas"],
  cliente_anotaciones:["id","clienteId","texto","fecha","hora","autor"],
  cliente_seguimiento:["id","clienteId","texto","fechaRecordatorio","completado","fecha","autor"]
};

const _sbCache = {};
const _sbH = {'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY,'Content-Type':'application/json','Prefer':'return=representation'};

async function sbFetch(table, method, body, query){
  try{
    const opts = {method, headers:{..._sbH}};
    if(body) opts.body = JSON.stringify(body);
    const res = await fetch(SUPABASE_URL+'/rest/v1/'+table+(query||''), opts);
    if(!res.ok){
      const errText = await res.text().catch(()=>'');
      console.error(`❌ sbFetch ${method} ${table}${query||''} → HTTP ${res.status}:`, errText);
      return null;
    }
    const t = await res.text();
    return t ? JSON.parse(t) : [];
  }catch(e){ console.error(`❌ sbFetch ${method} ${table} exception:`, e); return null; }
}

// Normaliza filas que vienen de Supabase (booleans y JSON pueden llegar como strings)
function sbNormalizeRow(k, row){
  if(!row) return row;
  const r = {...row};
  if(k === 'portal_diagnostico'){
    if(typeof r.respuestas === 'string'){ try{ r.respuestas=JSON.parse(r.respuestas); }catch(e){ r.respuestas={}; } }
    if(!r.respuestas || typeof r.respuestas !== 'object') r.respuestas = {};
    if(typeof r.completo === 'string') r.completo = r.completo === 'true';
    if(r.score !== null && r.score !== undefined) r.score = Number(r.score)||0;
  }
  if(k === 'portal_clientes'){
    if(typeof r.diagnosticoCompleto === 'string') r.diagnosticoCompleto = r.diagnosticoCompleto === 'true';
    if(r.score !== null && r.score !== undefined) r.score = Number(r.score)||0;
  }
  if(k === 'auditorias'){
    if(typeof r.diagnostico_ok === 'string') r.diagnostico_ok = r.diagnostico_ok === 'true';
    if(r.diagnostico_score !== null && r.diagnostico_score !== undefined) r.diagnostico_score = Number(r.diagnostico_score)||0;
  }
  return r;
}

async function sbLoadAll(){
  const entries = Object.entries(SB_TABLES);
  const results = await Promise.all(entries.map(([k,t])=>sbFetch(t,'GET',null,'?select=*&order=id.asc&limit=10000')));
  entries.forEach(([k],i)=>{
    const sbData=(Array.isArray(results[i])?results[i]:[]).map(r=>sbNormalizeRow(k,r));
    // Supabase es siempre la fuente de verdad cuando responde
    // localStorage es solo caché offline — NUNCA sobreescribe Supabase
    if(results[i] !== null){
      _sbCache[k] = sbData;
      try{ localStorage.setItem('METO_'+k, JSON.stringify(sbData)); }catch(e){}
    } else {
      // Supabase no respondió → fallback a localStorage
      const raw = localStorage.getItem('METO_'+k);
      if(raw){ try{ _sbCache[k]=JSON.parse(raw).map(r=>sbNormalizeRow(k,r)); }catch(e){ _sbCache[k]=[]; } }
      else _sbCache[k] = [];
      console.warn('⚠️ Usando localStorage para '+k+' (Supabase sin respuesta)');
    }
  });
}


// Limpiar item: solo columnas que la tabla acepta, stringify arrays/objects
function sbClean(table, item){
  const cols = SB_COLS[table];
  if(!cols) return {...item};
  const clean = {};
  cols.forEach(c=>{
    if(item[c] !== undefined){
      let v = item[c];
      if(v !== null && typeof v === 'object') v = JSON.stringify(v);
      clean[c] = v;
    }
  });
  delete clean.created_at;
  return clean;
}

async function sbSave(table, item){
  if(!item) return;
  const clean = sbClean(table, item);
  if(!clean.id){ await sbFetch(table,'POST',clean); return; }
  const patchRes = await sbFetch(table,'PATCH',{...clean},'?id=eq.'+clean.id);
  if(!patchRes || (Array.isArray(patchRes) && patchRes.length===0)){
    await sbFetch(table,'POST',clean);
  }
}

async function sbDel(table, id){
  await sbFetch(table,'DELETE',null,'?id=eq.'+id);
}

// Recargar una tabla específica desde Supabase
async function sbRefresh(...tables){
  for(const k of tables){
    const t = SB_TABLES[k];
    if(!t) continue;
    const data = await sbFetch(t,'GET',null,'?select=*&order=id.asc&limit=10000');
    if(data !== null){
      _sbCache[k] = data.map(r=>sbNormalizeRow(k,r));
      try{ localStorage.setItem('METO_'+k, JSON.stringify(_sbCache[k])); }catch(e){}
    }
  }
}

const S = {
  get(k){
    // Tablas Supabase → desde caché si tiene datos
    if(_sbCache[k] !== undefined && _sbCache[k].length > 0) return JSON.parse(JSON.stringify(_sbCache[k]));
    // Fallback: localStorage (siempre disponible)
    const raw = localStorage.getItem('METO_' + k);
    if(raw !== null){ try{ const parsed=JSON.parse(raw); if(_sbCache[k]!==undefined && parsed.length>0) _sbCache[k]=parsed; return parsed; }catch(e){ return []; } }
    // Si hay cache vacío de Supabase, devolver eso
    if(_sbCache[k] !== undefined) return [];
    return [];
  },

  set(k, v){
    if(SB_TABLES[k]){
      const arr = Array.isArray(v) ? v : [];
      // Auto-asignar id a items que no tengan
      let maxId = Math.max(0,...(_sbCache[k]||[]).map(x=>x.id||0),...arr.map(x=>x.id||0));
      arr.forEach(item=>{ if(!item.id){ maxId++; item.id=maxId; }});

      const oldCache = _sbCache[k] || [];
      const oldIds = new Set(oldCache.map(x=>x.id));
      const newIds = new Set(arr.map(x=>x.id));

      // Borrados → DELETE en Supabase
      for(const oid of oldIds){
        if(!newIds.has(oid)) sbDel(SB_TABLES[k], oid);
      }
      // Nuevos o modificados → SAVE en Supabase
      for(const item of arr){
        const old2 = oldCache.find(x=>x.id===item.id);
        if(!old2 || JSON.stringify(old2)!==JSON.stringify(item)){
          sbSave(SB_TABLES[k], item);
        }
      }
      _sbCache[k] = JSON.parse(JSON.stringify(arr));
      // SIEMPRE guardar en localStorage como backup inmediato
      try{ localStorage.setItem('METO_' + k, JSON.stringify(arr)); }catch(e){}
      // Log de debug para verificar persistencia
      console.log('💾 S.set('+k+'): '+arr.length+' registros guardados');
    } else {
      localStorage.setItem('METO_' + k, JSON.stringify(v));
    }
  },

  nextId(k){
    const a = this.get(k);
    return a.length ? Math.max(...a.map(i => i.id || 0)) + 1 : 1;
  },

  onReady(fn){ fn(); },
  migrateFromLS(){}
};

// ── Helpers: obj_personal → tabla Supabase ──
function getObjPersonal(vendId, ym){
  return (S.get('obj_personal')||[]).find(x=>String(x.vendedorId)===String(vendId)&&x.ym===ym)||null;
}
function setObjPersonal(vendId, ym, obj){
  const all = S.get('obj_personal')||[];
  const i = all.findIndex(x=>String(x.vendedorId)===String(vendId)&&x.ym===ym);
  const item = {vendedorId:Number(vendId), ym, ...obj};
  if(i>-1){ item.id=all[i].id; all[i]=item; } else { item.id=S.nextId('obj_personal'); all.push(item); }
  S.set('obj_personal', all);
}

// ── Helpers: sueldos_config → tabla Supabase ──
function getSueldosConfig(){
  const rows = S.get('sueldos_config')||[];
  const config = {};
  rows.forEach(r=>{ if(r.key) config[r.key] = r.data||{}; });
  return config;
}
function setSueldosConfig(config){
  const arr = Object.entries(config).map(([k,v],i)=>({id:i+1, key:k, data:v}));
  S.set('sueldos_config', arr);
}

// ── Helpers: vend_contactos → tabla Supabase ──
function getVendContactos(nombre){
  return (S.get('vend_contactos')||[]).filter(x=>x.vendedorNombre===nombre);
}
function setVendContactos(nombre, contactos){
  const all = (S.get('vend_contactos')||[]).filter(x=>x.vendedorNombre!==nombre);
  contactos.forEach(c=>{ c.vendedorNombre=nombre; });
  S.set('vend_contactos', all.concat(contactos));
}

const PAGE_TITLES={dashboard:'Dashboard',examenes:'Exámenes BPC',bpc_score:'Portal BPC Score',auditorias:'Auditorías',calendario:'Calendario',auditores:'Contratos / Consultores',clientes:'Clientes',cotizaciones:'Cotizaciones',gastos:'Pagos',cobros:'Facturación',vendedores:'Vendedores',crm:'CRM Comercial',entrevistas:'Entrevistas Comerciales',reportes:'Reportes',historial:'Historial Financiero Mensual',usuarios:'Usuarios',misventas:'Mis Ventas',referidos:'Referidos',agenda:'Agenda Disponible',rankings:'Rankings del Equipo',basesdatos:'Bases de Datos',correos:'Correos',admin:'Tablero de Control',impuestos:'Impuestos',reparto:'Reparto Societario',ahorro:'Ahorro Empresa',sueldos:'Liquidación de Sueldos',dirtec:'Dirección Técnica',dirtec_impl:'Implementaciones Activas',dirtec_capacidad:'Capacidad Operativa',dirtec_rendicion:'Rendición de Gastos',dirtec_honorarios:'Honorarios',dirtec_entregas:'Entregas e Informes',mi_panel:'Mi Panel',mi_rendicion:'Mis Rendiciones',mi_calendario:'Mi Calendario',mi_honorarios:'Mis Honorarios',portal_dashboard:'Mi Proceso',portal_diagnostico:'Diagnóstico BPC:2026',portal_resultados:'Resultados',portal_documentos:'Documentos',portal_chat:'Mi Consultor',portal_pac:'Plan de Acción',portal_calendario:'Calendario',portal_certificado:'Certificado',portal_auditoria:'Tablero de Auditoría BPC 72001',inteligencia:'Inteligencia BPC — Panel Estratégico'};
function getPageTitle(name){ if(name==='crm'&&currentUser?.rol==='vendedor') return 'Mi Dashboard'; return PAGE_TITLES[name]||name; }


// ══════════════════════════════════════════════════════════════════
// AGENTE IA METOGROUP — corre 2x por día mientras el sistema esté abierto
// ══════════════════════════════════════════════════════════════════

const AGENTE = {
  // Horarios de ejecución (horas locales)
  HORARIOS: [9, 18, 22],
  // Email de Ariel para el reporte diario
  EMAIL_ARIEL: '', // se carga desde usuarios del sistema
  // Email del agente (remitente automático)
  EMAIL_AGENTE: 'Hernanquiroz@metogroup.ar',
  EMAIL_AGENTE_NOMBRE: 'Hernán Quiroz | MetoGroup',
  _ultimaEjecucion: {},
  _reporteEnviado: {},
  _intervalo: null,

  init(){
    // Cargar email de Ariel desde usuarios
    const ariel = (S.get('usuarios')||[]).find(u=>
      u.nombre&&u.nombre.toLowerCase().includes('ariel')&&u.rol==='dueno'
    );
    if(ariel?.email) this.EMAIL_ARIEL = ariel.email;

    // Cargar email del agente desde usuarios (busca por email o nombre)
    const agente = (S.get('usuarios')||[]).find(u=>
      u.email && u.email.toLowerCase().includes('hernanquiroz')
    ) || (S.get('usuarios')||[]).find(u=>
      u.nombre && u.nombre.toLowerCase().includes('hernán')
    );
    if(agente?.email){
      this.EMAIL_AGENTE = agente.email;
      this.EMAIL_AGENTE_NOMBRE = agente.email_nombre || agente.nombre || 'Hernán Quiroz | MetoGroup';
    }

    // Verificar cada 5 minutos si toca ejecutar
    this._intervalo = setInterval(()=> this.tick(), 5 * 60 * 1000);
    // Auto-refresh de datos cada 2 minutos si el dashboard está activo
    setInterval(()=>{
      if(document.getElementById('page-dashboard')?.classList.contains('active')){
        sbRefresh('clientes','auditorias','cobros','gastos','crm_logs','admin_ventas_pendientes')
          .then(()=>renderDashboard());
      }
    }, 2 * 60 * 1000);
    // También al iniciar — verificar si hubo ejecución hoy
    setTimeout(()=> this.tick(), 8000);
    console.log('🤖 Agente MetoGroup iniciado. Horarios:', this.HORARIOS.map(h=>h+'hs').join(' y '));
  },

  async tick(){
    const ahora = new Date();
    // No trabajar los domingos
    if(ahora.getDay() === 0) return;
    const hora = ahora.getHours();
    const hoy = todayStr();
    const ym = hoy.substring(0,7);

    // ── Chequear bandeja de Hernán cada tick (cada 5 min) ──
    this._checkBandejaHernan();

    // Verificar si toca ejecutar el agente (±30 min de los horarios)
    for(const h of this.HORARIOS){
      const key = `${hoy}_${h}`;
      if(!this._ultimaEjecucion[key] && Math.abs(hora - h) <= 0){
        this._ultimaEjecucion[key] = true;
        this.ejecutar(h, hoy, ym);
      }
    }

    // Email de avance cada 3 días durante Fase 3 (auditorías activas)
    if(hora === 9){
      const emailCfg = (S.get('email_config')||[])[0]||{};
      if(emailCfg.smtp_user){
        const hoy = todayStr();
        const auds = (S.get('auditorias')||[]).filter(a=>
          a.coord_estado === 'confirmada' &&
          a.estado !== 'Completada' && a.estado !== 'Cancelada' &&
          (a.fDoc || a.fInsitu)
        );
        for(const a of auds.slice(0,3)){
          const cliente = (S.get('clientes')||[]).find(c=>String(c.id)===String(a.clienteId));
          const dest = cliente?.encargado_email || cliente?.email;
          if(!dest) continue;
          // Solo enviar si no se envió en los últimos 3 días
          if(a.ultimo_avance_enviado){
            const diasDesde = (new Date(hoy) - new Date(a.ultimo_avance_enviado)) / (1000*60*60*24);
            if(diasDesde < 3) continue;
          }
          // Solo enviar si hay auditorías activas (fDoc o fInsitu en los próximos 30 días)
          const tieneFechaProxima = [a.fDoc, a.fInsitu, a.fExterna].some(f=>
            f && f >= hoy && (new Date(f)-new Date(hoy))/(1000*60*60*24) <= 30
          );
          if(tieneFechaProxima){
            await agenteEnviarAvanceProceso(a.id);
            await new Promise(r=>setTimeout(r,2000));
          }
        }
      }
    }

    // Chequear auditorías sin encargado designado — pedirlo al dueño
    if(hora === 9){
      const emailCfg = (S.get('email_config')||[])[0]||{};
      if(emailCfg.smtp_user){
        const auds = (S.get('auditorias')||[]).filter(a=>
          a.email_inicio_enviado && !a.encargado_solicitado &&
          a.estado !== 'Completada' && a.estado !== 'Cancelada'
        );
        for(const a of auds.slice(0,3)){
          const cliente = (S.get('clientes')||[]).find(c=>String(c.id)===String(a.clienteId));
          if(cliente?.email && !cliente.encargado_email){
            await agentePedirEncargado(a.id);
            await new Promise(r=>setTimeout(r,2000));
          }
        }
      }
    }

    // Chequear diagnóstico completo → coordinar exámenes D+7
    if(hora === 9){
      const emailCfg = (S.get('email_config')||[])[0]||{};
      if(emailCfg.smtp_user){
        const auds = (S.get('auditorias')||[]).filter(a=>
          a.email_inicio_enviado && !a.examenes_solicitados &&
          a.estado !== 'Completada' && a.estado !== 'Cancelada'
        );
        for(const a of auds.slice(0,3)){
          const portal = (S.get('portal_clientes')||[]).find(p=>String(p.clienteId)===String(a.clienteId));
          const cliente = (S.get('clientes')||[]).find(c=>String(c.id)===String(a.clienteId));
          if(portal?.diagnosticoCompleto && cliente?.encargado_email){
            await agenteCoordinarExamenes(a.id);
            await new Promise(r=>setTimeout(r,2000));
          }
        }
      }
    }

    // Chequear auditorías nuevas sin email de bienvenida enviado
    if(hora === 9){
      const emailCfg = (S.get('email_config')||[])[0]||{};
      if(emailCfg.smtp_user){
        const audsNuevas = (S.get('auditorias')||[]).filter(a=>
          !a.email_inicio_enviado &&
          a.estado !== 'Completada' && a.estado !== 'Cancelada'
        );
        for(const a of audsNuevas.slice(0,3)){
          const cliente = (S.get('clientes')||[]).find(c=>String(c.id)===String(a.clienteId));
          if(cliente?.email){
            await agenteEnviarBienvenidaCliente(a.id);
            await new Promise(r=>setTimeout(r,2000));
          }
        }
      }
    }

    // Chequear auditorías sin coordinación iniciada
    if(hora === 9){
      const auds = S.get('auditorias').filter(a=>
        a.auditor && !a.coord_estado && a.estado !== 'Completada' && a.estado !== 'Cancelada'
      );
      const emailCfg = (S.get('email_config')||[])[0]||{};
      if(auds.length && emailCfg.smtp_user){
        for(const a of auds.slice(0,3)){ // máximo 3 por ejecución
          const consultor = S.get('auditores').find(c=>c.nombre===a.auditor);
          if(consultor?.email){
            await agenteCoordidarFechas(a.id);
            await new Promise(r=>setTimeout(r,2000)); // pausa entre emails
          }
        }
      }
    }

    // Chequear auditorías sin coordinación iniciada (a las 9hs)
    if(hora === 9){
      const auds = S.get('auditorias').filter(a=>
        a.auditor && !a.coord_estado && a.estado !== 'Completada' && a.estado !== 'Cancelada'
      );
      const emailCfg = (S.get('email_config')||[])[0]||{};
      if(auds.length && emailCfg.smtp_user && ANTHROPIC_API_KEY){
        for(const a of auds.slice(0,3)){
          const consultor = S.get('auditores').find(c=>c.nombre===a.auditor);
          if(consultor?.email){
            await agenteCoordidarFechas(a.id);
            await new Promise(r=>setTimeout(r,2000));
          }
        }
      }
    }

    // Reporte diario para Ariel a las 20hs
    const keyReporte = `reporte_${hoy}`;
    if(!this._reporteEnviado[keyReporte] && hora === 20){
      this._reporteEnviado[keyReporte] = true;
      this.enviarReporteDiario(hoy, ym);
    }

    // Chequear auditorías con fInforme en 7 días — avisar al dueño para coordinar reunión de cierre
    if(hora === 9){
      const emailCfg = (S.get('email_config')||[])[0]||{};
      if(emailCfg.smtp_user){
        const auds = (S.get('auditorias')||[]).filter(a=>
          a.fInforme && a.estado !== 'Completada' && a.estado !== 'Cancelada'
        );
        for(const a of auds){
          const diffDias = Math.ceil((new Date(a.fInforme+'T12:00:00') - new Date()) / (1000*60*60*24));
          // Ventana: entre 6 y 8 días antes del informe
          if(diffDias >= 6 && diffDias <= 8){
            const keyAviso = `aviso_cierre_${a.id}_${a.fInforme}`;
            if(!localStorage.getItem(keyAviso)){
              const cliente = (S.get('clientes')||[]).find(c=>c.id==a.clienteId);
              if(cliente?.email){
                await agenteAvisarReunionCierre(a, cliente, emailCfg);
                localStorage.setItem(keyAviso, '1');
                await new Promise(r=>setTimeout(r,2000));
              }
            }
          }
        }
      }
    }

    // Chequear auditorías con fDoc en las próximas 48hs — enviar Kit de Documentos al cliente
    if(hora === 9){
      const emailCfg = (S.get('email_config')||[])[0]||{};
      if(emailCfg.smtp_user){
        const auds = (S.get('auditorias')||[]).filter(a=>
          a.fDoc && a.estado !== 'Completada' && a.estado !== 'Cancelada'
        );
        for(const a of auds){
          const diffMs = new Date(a.fDoc+'T12:00:00') - new Date();
          const diffHs = diffMs / (1000*60*60);
          // Entre 24 y 72 hs (ventana de 48hs con margen)
          if(diffHs > 0 && diffHs <= 72){
            const keyKit = `kit_enviado_${a.id}_${a.fDoc}`;
            if(!localStorage.getItem(keyKit)){
              const cliente = (S.get('clientes')||[]).find(c=>c.id==a.clienteId);
              if(cliente?.email){
                await this.enviarKitDocumental(a, cliente, emailCfg);
                localStorage.setItem(keyKit, '1');
                await new Promise(r=>setTimeout(r,2000));
              }
            }
          }
        }
      }
    }
  }, // fin tick()

  async enviarKitDocumental(aud, cliente, emailCfg){
    // Obtener credenciales del usuario agente
    const agenteUser = (S.get('usuarios')||[]).find(u=>
      u.email && u.email.toLowerCase() === this.EMAIL_AGENTE.toLowerCase()
    );
    const agentePass = agenteUser
      ? localStorage.getItem('METO_email_cred_'+agenteUser.id)
      : null;
    // Fallback a SMTP global si no tiene cred propia
    const _agenteSmtp = getSmtpFor(this.EMAIL_AGENTE || emailCfg.smtp_user);
    const fromEmail = this.EMAIL_AGENTE || _agenteSmtp.smtp_user;
    const fromPass  = agentePass || _agenteSmtp.smtp_pass || emailCfg.smtp_pass;
    const fromName  = this.EMAIL_AGENTE_NOMBRE || _agenteSmtp.from_name;
    const fmtFecha  = f => { if(!f) return ''; const [y,m,d]=f.split('-'); return d+'/'+m+'/'+y; };
    const contacto = cliente.contacto||cliente.nombre;
    const empresa  = cliente.nombre;
    const fecha    = fmtFecha(aud.fDoc);
    const html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#ffffff">'
      +'<div style="font-size:22px;font-weight:700;margin-bottom:4px;color:#1a1a1a">MetoGroup</div>'
      +'<div style="font-size:10px;letter-spacing:2px;color:#888;text-transform:uppercase;margin-bottom:28px">Auditoría BPC:2026</div>'
      +'<p style="font-size:15px;color:#1a1a1a;margin-bottom:8px">Estimado/a <strong>'+contacto+'</strong>,</p>'
      +'<p style="font-size:13px;color:#444;line-height:1.7;margin-bottom:20px">'
      +'Le escribimos para informarle que la <strong>Auditoría Documental</strong> de <strong>'+empresa+'</strong> está programada para el '
      +'<strong>'+fecha+'</strong>. Para aprovechar al máximo el tiempo de auditoría, le pedimos que prepare con anticipación los documentos detallados en el kit.</p>'
      +'<div style="background:#fffbea;border-left:4px solid #c8a84a;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:24px">'
      +'<div style="font-weight:700;font-size:13px;color:#92770a;margin-bottom:6px">📦 Kit de Documentos Mínimos BPC:2026</div>'
      +'<div style="font-size:12px;color:#666;line-height:1.6">El kit incluye la lista completa de documentos requeridos por dimensión (Estrategia, RRHH, Canales, Comunicación, Tecnología, Ética, Datos y Medición).<br>Si tiene dudas, consúltenos antes de la fecha.</div>'
      +'</div>'
      +'<p style="font-size:13px;color:#444;line-height:1.7;margin-bottom:28px">Cuanto más completa sea la documentación el día de la auditoría, más fluida resultará la evaluación. ¡Estamos para ayudarle!</p>'
      +'<div style="border-top:1px solid #eee;padding-top:20px;font-size:11px;color:#888;line-height:1.8">'
      +fromName+'<br>'
      +'<a href="mailto:'+fromEmail+'" style="color:#c8a84a">'+fromEmail+'</a><br>'
      +'Este mensaje fue enviado automáticamente por el sistema de gestión de MetoGroup.'
      +'</div></div>';
    try{
      await fetch('/.netlify/functions/send-email',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          from_email: fromEmail,
          from_password: fromPass,
          from_name: fromName,
          to: cliente.email,
          subject: '📦 Kit de documentos para tu Auditoría BPC — '+fecha+' | '+empresa,
          html, text: 'Auditoría BPC:2026 programada para el '+fecha+'. Por favor prepare los documentos del Kit de Documentos Mínimos antes de esa fecha.'
        })
      });
      console.log(`🤖 Agente: Kit documental enviado a ${cliente.email} para auditoría del ${aud.fDoc}`);
    }catch(e){
      console.error('Agente: error enviando kit documental', e);
    }
  },

  async ejecutar(hora, hoy, ym){
    if(!ANTHROPIC_API_KEY){ console.log('🤖 Agente: sin API key'); return; }

    console.log(`🤖 Agente ejecutando — ${hora}hs`);
    toast(`🤖 Agente IA ejecutándose (${hora}hs)...`);

    // ── Auditoría administrativa nocturna (22hs) ──────────────────────────────
    if(hora === 22){
      await this._auditarAdministracion(hoy, ym);
      return; // El turno de noche solo hace esto
    }

    // Recopilar contexto del sistema
    const vendedores = S.get('vendedores').filter(v=>v.estado!=='Inactivo');
    const clientes = S.get('clientes');
    const seguimientos = S.get('crm_seguimientos').filter(s=>!s.hecho);
    const entrevistas = S.get('crm_entrevistas')||[];
    const logs = S.get('crm_logs');
    const emailCfg = (S.get('email_config')||[])[0]||{};

    // Resumen por vendedor
    const resumenVendedores = vendedores.map(v=>{
      const mLogs = logs.filter(l=>l.vendedor===v.nombre&&l.fecha.startsWith(ym));
      const ll = mLogs.reduce((s,l)=>s+(l.llamadas||0),0);
      const ag = mLogs.reduce((s,l)=>s+(l.agendadas||0),0);
      const ci = mLogs.reduce((s,l)=>s+(l.cerradas||0),0);
      const segsVenc = seguimientos.filter(s=>s.vendedor===v.nombre&&s.fecha<=hoy);
      const segsHoy = seguimientos.filter(s=>s.vendedor===v.nombre&&s.fecha===hoy);
      const obj = S.get('crm_objetivos').find(x=>x.ym===ym&&String(x.vendedorId)===String(v.id));
      // Objetivo empresas cargadas
      let diasHabil=0;
      if(v.ingreso){
        const ing=new Date(v.ingreso+'T12:00:00'), now=new Date();
        const cur=new Date(ing);
        while(cur<=now){const d=cur.getDay();if(d!==0&&d!==6)diasHabil++;cur.setDate(cur.getDate()+1);}
      }
      const objEmpresas = diasHabil<=14 ? diasHabil*30 : 14*30+(diasHabil-14)*50;
      const empresasCargadas = (S.get('vend_contactos')||[]).filter(x=>x.vendedorNombre===v.nombre).length;
      return {
        nombre:v.nombre, llamadas:ll, agendadas:ag, cerradas:ci,
        seguimientosVencidos:segsVenc.length, seguimientosHoy:segsHoy.length,
        objLlamadas:obj?.llamadas||0, objCierres:obj?.cerradas||0,
        empresasCargadas, objEmpresas,
        pctLlamadas:obj?.llamadas>0?Math.round(ll/obj.llamadas*100):null,
        pctCierres:obj?.cerradas>0?Math.round(ci/obj.cerradas*100):null,
      };
    });

    // Clientes con propuesta pendiente
    const propuestasPendientes = clientes.filter(c=>
      !c.prop_estado || c.prop_estado==='' || c.prop_estado==='Datos solicitados'
    ).map(c=>({nombre:c.nombre, email:c.email, estado:c.prop_estado||'Sin iniciar', 
      faltaCuit:!c.cuit, faltaMonto:!c.monto_prop, faltaFirmante:!c.firmante}));

    // Prompt para Claude
    const prompt = `Sos el agente de gestión de MetoGroup Latam S.A.
Es ${hora === 9 ? 'la mañana (9hs)' : 'la tarde (18hs)'} del ${hoy}.

ESTADO DEL EQUIPO COMERCIAL:
${JSON.stringify(resumenVendedores, null, 2)}

PROPUESTAS PENDIENTES (${propuestasPendientes.length} clientes):
${JSON.stringify(propuestasPendientes.slice(0,10), null, 2)}

SEGUIMIENTOS VENCIDOS HOY: ${seguimientos.filter(s=>s.fecha<=hoy).length}

MÉTRICAS DE CIERRE TELEFÓNICO (${ym}):
${resumenVendedores.map(v=>`- ${v.nombre}: ${v.llamadas} llamadas, ${v.cierres} cierres, tasa ${v.llamadas>0?(v.cierres/v.llamadas*100).toFixed(1)+'%':'sin datos'}`).join('\n')}

CALIDAD ENTREVISTAS LEANDRO/ARIEL (${ym}):
${(()=>{
  const mc = calcMetricasCierre(ym);
  return mc.entrevistadores.map(e=>`- ${e.nombre}: ${e.total} entrevistas, ${e.cerradas} ventas, tasa ${e.pctCierre!==null?e.pctCierre.toFixed(1)+'%':'sin datos'}`).join('\n') || 'Sin datos';
})()}

Tu tarea:
1. Analizá el estado de cada vendedor
2. Identificá los 3 problemas más urgentes
3. Si algún vendedor tiene tasa de cierre telefónico < 1%, marcalo como alerta alta
4. Si Leandro o Ariel tiene tasa de cierre en entrevistas < 10%, marcalo como alerta alta
5. Generá acciones concretas y mensajes de alerta si corresponde
6. Respondé en JSON con esta estructura exacta:
{
  "resumen": "texto breve del estado general",
  "alertas": [{"vendedor":"nombre","tipo":"atraso|sin_actividad|seguimiento_vencido","mensaje":"texto corto","urgencia":"alta|media"}],
  "acciones": [{"tipo":"notificar_vendedor|generar_propuesta|recordatorio","detalle":"texto","vendedor":"nombre o null"}],
  "estadoGeneral": "bien|atención|crítico"
}
Respondé SOLO con el JSON, sin texto adicional.`;

    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          model:'claude-sonnet-4-20250514',
          max_tokens:1500,
          messages:[{role:'user',content:prompt}]
        })
      });
      const data = await resp.json();
      const txt = data.content?.[0]?.text||'{}';
      let resultado;
      try{ resultado = JSON.parse(txt.replace(/```json|```/g,'').trim()); }
      catch(e){ console.error('Agente: error parsing JSON',txt); return; }

      console.log('🤖 Agente resultado:', resultado);

      // Guardar resultado en localStorage para mostrar en UI
      const historial = JSON.parse(localStorage.getItem('METO_agente_historial')||'[]');
      historial.unshift({fecha:hoy, hora, resultado, ts:new Date().toISOString()});
      localStorage.setItem('METO_agente_historial', JSON.stringify(historial.slice(0,30)));

      // Mostrar alertas urgentes como toast
      const alertasAltas = (resultado.alertas||[]).filter(a=>a.urgencia==='alta');
      if(alertasAltas.length){
        setTimeout(()=>{
          alertasAltas.slice(0,2).forEach((a,i)=>{
            setTimeout(()=> toast(`🤖 ${a.vendedor}: ${a.mensaje}`), i*3000);
          });
        }, 1000);
      }

      // Enviar alertas por email a vendedores si hay credenciales
      if(emailCfg.smtp_user){
        for(const alerta of (resultado.alertas||[]).filter(a=>a.urgencia==='alta')){
          const vend = vendedores.find(v=>v.nombre===alerta.vendedor);
          if(vend?.email){
            await this._enviarAlertaVendedor(vend, alerta, emailCfg);
          }
        }
      }

      // Mostrar badge en UI
      this._actualizarBadgeAgente(resultado);

      toast(`🤖 Agente completado — ${resultado.estadoGeneral==='bien'?'✅ Todo bien':resultado.estadoGeneral==='atención'?'⚠️ Requiere atención':'🚨 Estado crítico'}`);

    } catch(e){
      console.error('🤖 Agente error:', e);
    }
  },

  async _enviarAlertaVendedor(vend, alerta, emailCfg){
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:28px">
      <div style="font-size:22px;font-weight:700;margin-bottom:4px">MetoGroup</div>
      <div style="font-size:10px;letter-spacing:2px;color:#888;text-transform:uppercase;margin-bottom:24px">Sistema de Gestión</div>
      <div style="background:${alerta.urgencia==='alta'?'#fff3cd':'#f8f9fa'};border-left:4px solid ${alerta.urgencia==='alta'?'#d4af37':'#6c757d'};padding:16px 18px;border-radius:0 8px 8px 0;margin-bottom:16px">
        <div style="font-weight:700;font-size:14px;margin-bottom:6px">${alerta.tipo==='atraso'?'⚠️ Atención requerida':alerta.tipo==='sin_actividad'?'📋 Recordatorio de actividad':'🔔 Seguimiento pendiente'}</div>
        <div style="font-size:13px;color:#555">${alerta.mensaje}</div>
      </div>
      <p style="font-size:12px;color:#888">Este mensaje fue generado automáticamente por el agente de MetoGroup.</p>
    </div>`;
    try{
      await fetch('/.netlify/functions/send-email',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          from_email:emailCfg.smtp_user, from_password:emailCfg.smtp_pass,
          from_name:'MetoGroup Agente', to:vend.email,
          subject:`MetoGroup — ${alerta.tipo==='atraso'?'Atención requerida':'Recordatorio'}: ${alerta.mensaje.substring(0,60)}`,
          html, text:alerta.mensaje
        })
      });
    }catch(e){ console.error('Agente: error enviando email a vendedor',e); }
  },

  async enviarReporteDiario(hoy, ym){
    if(!ANTHROPIC_API_KEY || !this.EMAIL_ARIEL) return;
    const emailCfg = (S.get('email_config')||[])[0]||{};
    if(!emailCfg.smtp_user) return;

    const vendedores = S.get('vendedores').filter(v=>v.estado!=='Inactivo');
    const logs = S.get('crm_logs');

    const resumen = vendedores.map(v=>{
      const tdLog = logs.find(l=>l.vendedor===v.nombre&&l.fecha===hoy);
      const mLogs = logs.filter(l=>l.vendedor===v.nombre&&l.fecha.startsWith(ym));
      const mLL = mLogs.reduce((s,l)=>s+(l.llamadas||0),0);
      const mCI = mLogs.reduce((s,l)=>s+(l.cerradas||0),0);
      const obj = S.get('crm_objetivos').find(x=>x.ym===ym&&String(x.vendedorId)===String(v.id));
      const pct = obj?.cerradas>0?Math.round(mCI/obj.cerradas*100):null;
      return {v, tdLog, mLL, mCI, obj, pct};
    });

    const htmlTabla = resumen.map(({v,tdLog,mLL,mCI,obj,pct})=>`
      <tr style="border-bottom:1px solid #eee">
        <td style="padding:10px 12px;font-weight:600">${v.nombre}</td>
        <td style="padding:10px 12px;text-align:center;color:${tdLog?.llamadas>0?'#333':'#dc3545'}">${tdLog?.llamadas||0}</td>
        <td style="padding:10px 12px;text-align:center">${tdLog?.agendadas||0}</td>
        <td style="padding:10px 12px;text-align:center;font-weight:700;color:#d4af37">${mCI}</td>
        <td style="padding:10px 12px;text-align:center">
          ${pct!==null?`<span style="background:${pct>=100?'#d4edda':pct>=70?'#fff3cd':'#f8d7da'};color:${pct>=100?'#155724':pct>=70?'#856404':'#721c24'};padding:3px 8px;border-radius:12px;font-size:12px;font-weight:700">${pct}%</span>`:'<span style="color:#888;font-size:11px">Sin obj.</span>'}
        </td>
      </tr>`).join('');

    const htmlEmail = `
      <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:32px;background:#fff">
        <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:4px">
          <div style="font-size:24px;font-weight:700">MetoGroup</div>
          <div style="font-size:10px;color:#888;letter-spacing:2px;text-transform:uppercase">Reporte Diario</div>
        </div>
        <div style="color:#888;font-size:12px;margin-bottom:28px">${new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
        
        <div style="background:#f9f6ee;border-left:3px solid #d4af37;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:24px">
          <strong>Reporte automático del equipo comercial</strong> — generado por el agente MetoGroup.
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          <thead>
            <tr style="background:#1a1a1a;color:#f5d060">
              <th style="padding:10px 12px;text-align:left;font-size:11px;letter-spacing:1px;text-transform:uppercase">Vendedor</th>
              <th style="padding:10px 12px;text-align:center;font-size:11px;letter-spacing:1px">Llamadas hoy</th>
              <th style="padding:10px 12px;text-align:center;font-size:11px;letter-spacing:1px">Agendadas hoy</th>
              <th style="padding:10px 12px;text-align:center;font-size:11px;letter-spacing:1px">Cierres mes</th>
              <th style="padding:10px 12px;text-align:center;font-size:11px;letter-spacing:1px">% Objetivo</th>
            </tr>
          </thead>
          <tbody>${htmlTabla}</tbody>
        </table>

        <!-- Métricas de cierre -->
        <div style="margin-bottom:24px">
          <div style="font-size:14px;font-weight:700;margin-bottom:12px;border-bottom:2px solid #d4af37;padding-bottom:6px">📊 Tasas de cierre del mes</div>
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
            <thead>
              <tr style="background:#f5f0e8">
                <th style="padding:8px 12px;text-align:left;font-size:11px;color:#888">Vendedor</th>
                <th style="padding:8px 12px;text-align:center;font-size:11px;color:#888">Llamadas</th>
                <th style="padding:8px 12px;text-align:center;font-size:11px;color:#888">Cierres</th>
                <th style="padding:8px 12px;text-align:center;font-size:11px;color:#888">Tasa cierre</th>
                <th style="padding:8px 12px;text-align:center;font-size:11px;color:#888">Nivel</th>
              </tr>
            </thead>
            <tbody>
              ${(()=>{
                const mc = calcMetricasCierre(ym);
                return mc.vendedores.map(v=>`
                  <tr style="border-bottom:1px solid #eee">
                    <td style="padding:8px 12px;font-weight:600;font-size:13px">${v.nombre}</td>
                    <td style="padding:8px 12px;text-align:center;font-size:13px">${v.llamadas}</td>
                    <td style="padding:8px 12px;text-align:center;font-size:13px;font-weight:700;color:#d4af37">${v.cierres}</td>
                    <td style="padding:8px 12px;text-align:center;font-size:13px;font-weight:700;color:${v.pctCierre===null?'#888':v.pctCierre>=3?'#c8a84a':v.pctCierre>=1.5?'#059669':v.pctCierre>=0.8?'#d97706':'#dc2626'}">${v.pctCierre!==null?v.pctCierre.toFixed(1)+'%':'—'}</td>
                    <td style="padding:8px 12px;text-align:center"><span style="font-size:11px;padding:2px 8px;border-radius:10px;background:${v.nivel==='excelente'?'#fef3c7':v.nivel==='bueno'?'#d1fae5':v.nivel==='regular'?'#fef3c7':'#fee2e2'};color:${v.nivel==='excelente'?'#92400e':v.nivel==='bueno'?'#065f46':v.nivel==='regular'?'#92400e':'#991b1b'}">${nivelLabel(v.nivel)}</span></td>
                  </tr>`).join('');
              })()}
            </tbody>
          </table>
          <div style="font-size:13px;font-weight:700;margin-bottom:8px">🎤 Leandro y Ariel — Calidad en entrevistas</div>
          ${(()=>{
            const mc = calcMetricasCierre(ym);
            if(!mc.entrevistadores.length) return '<p style="color:#888;font-size:12px">Sin datos de entrevistas este mes</p>';
            return mc.entrevistadores.map(e=>`
              <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #eee">
                <div style="font-weight:600;font-size:13px;min-width:100px">${e.nombre}</div>
                <div style="font-size:12px;color:#555">${e.total} entrevistas · ${e.cerradas} ventas · ${e.interesadas} interesados</div>
                <div style="margin-left:auto;font-size:13px;font-weight:700;color:${e.pctCierre===null?'#888':e.pctCierre>=30?'#c8a84a':e.pctCierre>=15?'#059669':e.pctCierre>=8?'#d97706':'#dc2626'}">${e.pctCierre!==null?e.pctCierre.toFixed(0)+'%':'—'}</div>
              </div>`).join('');
          })()}
        </div>

        <div style="background:#f5f5f5;border-radius:8px;padding:16px;font-size:12px;color:#666">
          Este reporte se genera automáticamente todos los días a las 20hs.<br>
          Para ver el detalle completo, ingresá al sistema.
        </div>
      </div>`;

    try{
      await fetch('/.netlify/functions/send-email',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          from_email:emailCfg.smtp_user, from_password:emailCfg.smtp_pass,
          from_name:'MetoGroup Sistema', to:this.EMAIL_ARIEL,
          subject:`📊 Reporte diario vendedores — ${hoy}`,
          html:htmlEmail, text:`Reporte diario MetoGroup ${hoy}`
        })
      });
      console.log('🤖 Reporte diario enviado a', this.EMAIL_ARIEL);
      toast('📊 Reporte diario enviado a Ariel');
    }catch(e){ console.error('Agente: error reporte diario',e); }
  },

  _actualizarBadgeAgente(resultado){
    const badge = document.getElementById('agente-badge');
    if(!badge) return;
    const color = resultado.estadoGeneral==='bien'?'#c8a84a':resultado.estadoGeneral==='atención'?'var(--warn)':'var(--danger)';
    const icon = resultado.estadoGeneral==='bien'?'🤖':resultado.estadoGeneral==='atención'?'⚠️':'🚨';
    badge.style.background = color;
    badge.title = resultado.resumen||'';
    badge.textContent = icon;
    badge.style.display = 'flex';
  },

  // Ejecutar manualmente desde UI
  async _auditarAdministracion(hoy, ym){
    console.log('🤖 Hernán: auditoría administrativa nocturna...');

    const clientes    = S.get('clientes')||[];
    const auds        = S.get('auditorias')||[];
    const cobros      = S.get('cobros')||[];
    const cotizaciones= S.get('cotizaciones')||[];
    const facturas    = S.get('cliente_facturas')||[];
    const seguimientos= S.get('cliente_seguimiento')||[];
    const perfilDiags = S.get('portal_diagnostico')||[];
    const portalClis  = S.get('portal_clientes')||[];
    const today       = hoy;

    const alertas = [];

    // ── 1. CLIENTES CON CAMPOS INCOMPLETOS ───────────────────────────────────
    clientes.forEach(cli => {
      const problemas = [];
      if(!cli.email)                problemas.push('sin email principal');
      if(!cli.tel && !cli.wa)       problemas.push('sin teléfono ni WhatsApp');
      if(!cli.contacto)             problemas.push('sin nombre de contacto');
      if(!cli.encargado_email)      problemas.push('sin email del encargado de proceso');
      if(!cli.encargado_nombre)     problemas.push('sin nombre del encargado de proceso');
      if(!cli.contrato_url)         problemas.push('sin contrato cargado');
      if(!cli.rubro)                problemas.push('sin industria/rubro definido');
      if(problemas.length > 0){
        alertas.push({
          nivel: problemas.length >= 3 ? 'alta' : 'media',
          categoria: 'Ficha de cliente incompleta',
          cliente: cli.nombre,
          detalle: problemas.join(', ') + '.',
          accion: 'Completar ficha del cliente.'
        });
      }
    });

    // ── 2. AUDITORÍAS SIN AVANCE ─────────────────────────────────────────────
    auds.filter(a=>!['Completada','Cancelada','Informe Entregado'].includes(a.estado)).forEach(aud => {
      // Sin diagnóstico después de 5 días
      if(!aud.diagnostico_ok && aud.fechaInicio){
        const diasDesde = Math.floor((new Date(today)-new Date(aud.fechaInicio))/86400000);
        if(diasDesde > 5){
          alertas.push({
            nivel: diasDesde > 10 ? 'alta' : 'media',
            categoria: 'Diagnóstico pendiente',
            cliente: aud.clienteNombre,
            detalle: `Lleva ${diasDesde} días sin completar el diagnóstico inicial.`,
            accion: 'Verificar acceso del cliente al portal y reenviar bienvenida si es necesario.'
          });
        }
      }
      // Sin encargado designado
      const cli = clientes.find(c=>String(c.id)===String(aud.clienteId));
      if(!cli?.encargado_email && aud.diagnostico_ok){
        alertas.push({
          nivel: 'media',
          categoria: 'Sin encargado de proceso',
          cliente: aud.clienteNombre,
          detalle: 'El diagnóstico está completo pero no hay encargado designado para coordinar los exámenes.',
          accion: 'Solicitar encargado al cliente.'
        });
      }
    });

    // ── 3. COBROS VENCIDOS Y PRÓXIMOS A VENCER ───────────────────────────────
    cobros.filter(c=>c.estado!=='Pagado').forEach(c => {
      if(!c.fechaVto) return;
      const dias = Math.floor((new Date(c.fechaVto)-new Date(today))/86400000);
      if(dias < 0){
        alertas.push({
          nivel: 'alta',
          categoria: 'Cobro vencido',
          cliente: c.cliente||c.clienteNombre||'—',
          detalle: `$${Number(c.monto||0).toLocaleString('es-AR')} vencido hace ${Math.abs(dias)} día${Math.abs(dias)!==1?'s':''}.`,
          accion: 'Gestionar el cobro o registrar acuerdo de pago.'
        });
      } else if(dias <= 3){
        alertas.push({
          nivel: 'media',
          categoria: 'Cobro próximo a vencer',
          cliente: c.cliente||c.clienteNombre||'—',
          detalle: `$${Number(c.monto||0).toLocaleString('es-AR')} vence en ${dias} día${dias!==1?'s':''}.`,
          accion: 'Confirmar que el cliente está al tanto.'
        });
      }
    });

    // ── 4. COTIZACIONES SIN SEGUIMIENTO ──────────────────────────────────────
    cotizaciones.filter(c=>c.estado==='Pendiente'||!c.estado).forEach(cot => {
      if(!cot.fecha) return;
      const dias = Math.floor((new Date(today)-new Date(cot.fecha))/86400000);
      if(dias > 7){
        alertas.push({
          nivel: 'media',
          categoria: 'Cotización sin respuesta',
          cliente: cot.cliente||cot.empresa||'—',
          detalle: `Cotización de $${Number(cot.monto||0).toLocaleString('es-AR')} enviada hace ${dias} días sin respuesta registrada.`,
          accion: 'Hacer seguimiento con el cliente.'
        });
      }
    });

    // ── 5. SEGUIMIENTOS VENCIDOS DE CLIENTES ─────────────────────────────────
    seguimientos.filter(s=>!s.completado && s.fechaRecordatorio && s.fechaRecordatorio < today).forEach(s => {
      const cli = clientes.find(c=>String(c.id)===String(s.clienteId));
      alertas.push({
        nivel: 'media',
        categoria: 'Seguimiento vencido',
        cliente: cli?.nombre||'—',
        detalle: `"${s.texto}" — venció el ${s.fechaRecordatorio}.`,
        accion: 'Completar o reprogramar el seguimiento.'
      });
    });

    // ── 6. CLIENTES CON AUDITORÍA COMPLETADA SIN PRÓXIMO PASO ────────────────
    auds.filter(a=>['Completada','Informe Entregado'].includes(a.estado)).forEach(aud => {
      const tieneFactura = facturas.some(f=>String(f.clienteId)===String(aud.clienteId));
      const tieneSeg = seguimientos.some(s=>String(s.clienteId)===String(aud.clienteId)&&!s.completado);
      if(!tieneFactura){
        alertas.push({
          nivel: 'media',
          categoria: 'Auditoría completada sin factura',
          cliente: aud.clienteNombre,
          detalle: 'La auditoría está completada pero no hay facturas registradas en la ficha del cliente.',
          accion: 'Registrar factura en la ficha del cliente.'
        });
      }
    });

    // ── 7. PERFIL SITUACIONAL COMPLETADO SIN EXAMEN ENVIADO ──────────────────
    perfilDiags.filter(d=>d.perfilSituacion&&!d.perfilExamenEnviado).forEach(d => {
      const cli = clientes.find(c=>String(c.id)===String(d.clienteId));
      if(!cli) return;
      const diasDesde = d.fechaFin ? Math.floor((new Date(today)-new Date(d.fechaFin))/86400000) : 0;
      if(diasDesde > 1){
        alertas.push({
          nivel: diasDesde > 3 ? 'alta' : 'media',
          categoria: 'Examen pendiente de envío',
          cliente: cli.nombre,
          detalle: `El módulo de perfil situacional se completó hace ${diasDesde} días pero no se envió ningún examen.`,
          accion: 'Revisar la ficha de perfil y enviar el examen correspondiente.'
        });
      }
    });

    // ── Si no hay alertas → registrar que todo está bien ────────────────────
    if(!alertas.length){
      await agenteEncolarAccion('✅ Auditoría nocturna — todo en orden', {
        destinatario: 'leandro@metogroup.com.ar',
        clienteNombre: 'Sistema',
        tipo: 'reporte',
        detalle: `Revisión administrativa del ${hoy} completada. Sin pendientes detectados.`,
        html_preview: `Auditoría nocturna ${hoy} — sin alertas`
      });
      console.log('🤖 Hernán: auditoría nocturna — sin alertas');
      return;
    }

    // ── Construir reporte de pendientes ──────────────────────────────────────
    const altas   = alertas.filter(a=>a.nivel==='alta');
    const medias  = alertas.filter(a=>a.nivel==='media');

    const emailCfg = (S.get('email_config')||[])[0]||{};
    const agenteNombre = this.EMAIL_AGENTE_NOMBRE || 'Hernán Quiroz';
    const agenteEmail  = this.EMAIL_AGENTE || emailCfg.smtp_user;

    const filaAlerta = (a, color) =>
      `<tr style="border-bottom:1px solid #f0ece4">
        <td style="padding:10px 12px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:${color};white-space:nowrap">${a.categoria}</td>
        <td style="padding:10px 12px;font-family:'Cormorant Garamond',Georgia,serif;font-size:14px;font-weight:600;color:#1a1a1a">${a.cliente}</td>
        <td style="padding:10px 12px;font-family:Arial,sans-serif;font-size:12px;color:#555;line-height:1.5">${a.detalle}</td>
        <td style="padding:10px 12px;font-family:Arial,sans-serif;font-size:11px;color:#888;font-style:italic">${a.accion}</td>
      </tr>`;

    const html = emailTemplate({
      nombreAgente: agenteNombre,
      emailAgente: agenteEmail,
      saludo: 'Leandro, buenas noches.',
      ctaUrl: null, ctaLabel: null,
      bloques: [
        { tipo:'texto', contenido:`Revisión administrativa del <strong>${new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'})}</strong>. Detecté <strong>${alertas.length} pendiente${alertas.length!==1?'s':''}</strong> para tu atención.` },
        { tipo:'destacado', titulo:`${altas.length > 0 ? '⚠️ '+altas.length+' alerta'+( altas.length!==1?'s':'')+' de prioridad alta' : '✅ Sin alertas de prioridad alta'}`, contenido: altas.length > 0 ? altas.map(a=>`<strong>${a.cliente}:</strong> ${a.detalle}`).join('<br>') : 'Todo bajo control en el frente urgente.' },
        { tipo:'texto', contenido:`<table style="width:100%;border-collapse:collapse;background:#fafaf8;border-radius:6px;overflow:hidden;border:1px solid #ede9e0">
          <thead><tr style="background:#f4f0e8">
            <th style="padding:8px 12px;font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#888;text-align:left">Categoría</th>
            <th style="padding:8px 12px;font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#888;text-align:left">Cliente</th>
            <th style="padding:8px 12px;font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#888;text-align:left">Detalle</th>
            <th style="padding:8px 12px;font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#888;text-align:left">Acción</th>
          </tr></thead>
          <tbody>
            ${altas.map(a=>filaAlerta(a,'#ef4444')).join('')}
            ${medias.map(a=>filaAlerta(a,'#f59e0b')).join('')}
          </tbody>
        </table>` },
        { tipo:'texto', contenido:'Podés gestionar cada uno desde el módulo correspondiente. Quedo disponible si necesitás algo.' }
      ]
    });

    // Encolar el reporte para aprobación
    await agenteEncolarAccion(`Reporte nocturno — ${alertas.length} pendiente${alertas.length!==1?'s':''}`, {
      destinatario: agenteEmail || 'leandro@metogroup.com.ar',
      clienteNombre: 'Sistema',
      tipo: 'reporte',
      detalle: `${altas.length} alta${altas.length!==1?'s':''} · ${medias.length} media${medias.length!==1?'s':''}. Categorías: ${[...new Set(alertas.map(a=>a.categoria))].join(', ')}.`,
      html_preview: `Reporte ${hoy} — ${alertas.length} pendientes`,
      _payload: {
        from_name: agenteNombre,
        to: agenteEmail || 'leandro@metogroup.com.ar',
        subject: `📋 Reporte nocturno MetoGroup — ${alertas.length} pendiente${alertas.length!==1?'s':''} · ${new Date().toLocaleDateString('es-AR')}`,
        html,
        text: `Reporte administrativo ${hoy}. ${alertas.length} pendientes detectados: ${alertas.map(a=>a.cliente+': '+a.detalle).join(' | ')}`
      }
    });

    console.log(`🤖 Hernán: auditoría nocturna — ${alertas.length} alertas encola das`);
  },

  async ejecutarAhora(){
    const hoy = todayStr();
    const hora = new Date().getHours();
    await this.ejecutar(hora, hoy, hoy.substring(0,7));
  },

  verHistorial(){
    // Redirigir al nuevo panel unificado de revisión
    renderPanelAgenteLog();
    return;
    const hist = JSON.parse(localStorage.getItem('METO_agente_historial')||'[]');
    if(!hist.length){ toast('Sin historial de ejecuciones'); return; }
    const ov = document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    ov.innerHTML=`<div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;width:700px;max-width:95vw;max-height:85vh;overflow-y:auto;padding:24px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800">🤖 Historial del Agente</div>
        <button onclick="this.closest('div[style*=fixed]').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:18px">✕</button>
      </div>
      ${hist.map(h=>`
        <div style="background:var(--surface2);border-radius:10px;padding:14px 16px;margin-bottom:12px;border:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <div style="font-size:12px;font-weight:700">${h.fecha} — ${h.hora}hs</div>
            <div style="font-size:11px;background:${h.resultado.estadoGeneral==='bien'?'rgba(200,168,74,0.15)':h.resultado.estadoGeneral==='atención'?'rgba(245,158,11,0.15)':'rgba(239,68,68,0.1)'};color:${h.resultado.estadoGeneral==='bien'?'#c8a84a':h.resultado.estadoGeneral==='atención'?'var(--warn)':'var(--danger)'};padding:2px 8px;border-radius:10px">${h.resultado.estadoGeneral}</div>
          </div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:8px">${h.resultado.resumen||''}</div>
          ${(h.resultado.alertas||[]).length?`
            <div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:4px">Alertas:</div>
            ${h.resultado.alertas.map(a=>`<div style="font-size:11px;color:var(--muted);padding:2px 0">• ${a.vendedor}: ${a.mensaje}</div>`).join('')}
          `:''}
        </div>`).join('')}
    </div>`;
    ov.onclick = e=>{ if(e.target===ov) ov.remove(); };
    document.body.appendChild(ov);
  },

  // ── Chequear bandeja de Hernán — detectar respuestas de clientes ──
  async _checkBandejaHernan(){
    const emailCfg = (S.get('email_config')||[])[0]||{};
    if(!emailCfg.smtp_user || !emailCfg.smtp_pass) return;

    // Solo si hay clientes activos con auditoría
    const clientes = S.get('clientes')||[];
    const auds = (S.get('auditorias')||[]).filter(a=>a.estado!=='Completada'&&a.estado!=='Cancelada');
    if(!auds.length) return;

    // Llamar a read-email para chequear INBOX de Hernán
    try{
      const resp = await fetch('/.netlify/functions/read-email',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          email: emailCfg.smtp_user,
          password: emailCfg.smtp_pass,
          action: 'list',
          folder: 'INBOX',
          page: 1,
          limit: 20
        })
      });
      const data = await resp.json();
      if(!data.success || !data.messages?.length) return;

      // Filtrar emails NO vistos que sean de clientes activos
      const emailsClientes = clientes.map(c=>(c.email||'').toLowerCase()).filter(Boolean);
      const yaAlertados = JSON.parse(localStorage.getItem('METO_bandeja_alertados')||'[]');

      const nuevos = data.messages.filter(m=>{
        if(m.seen) return false; // ya leído
        const fromAddr = (m.from?.[0]?.address||'').toLowerCase();
        if(!emailsClientes.includes(fromAddr)) return false; // no es cliente
        const uid = String(m.uid);
        if(yaAlertados.includes(uid)) return false; // ya alertado antes
        return true;
      });

      if(!nuevos.length) return;

      // Guardar UIDs alertados
      const nuevosUIDs = nuevos.map(m=>String(m.uid));
      localStorage.setItem('METO_bandeja_alertados', JSON.stringify([...yaAlertados, ...nuevosUIDs].slice(-200)));

      // Para cada mensaje nuevo, crear alerta interna y enviar email a administre
      for(const m of nuevos){
        const fromAddr = (m.from?.[0]?.address||'').toLowerCase();
        const fromName = m.from?.[0]?.name || fromAddr;
        const clienteMatch = clientes.find(c=>(c.email||'').toLowerCase()===fromAddr);
        const clienteNombre = clienteMatch?.nombre || fromName;
        const asunto = m.subject || '(sin asunto)';
        const fecha = new Date(m.date).toLocaleString('es-AR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});

        // 1. Alerta interna en el sistema
        const alertas = S.get('admin_ventas_pendientes')||[];
        alertas.unshift({
          id: Date.now() + Math.random(),
          tipo: 'respuesta_cliente_email',
          empresa: clienteNombre,
          from: fromAddr,
          asunto,
          fecha,
          estado: 'pendiente',
          uid: m.uid
        });
        S.set('admin_ventas_pendientes', alertas.slice(0, 100));
        updateCobrosAlert();

        // Toast si hay alguien logueado con rol admin/dueno
        const rol = getUserRoles(currentUser||{});
        if(rol.includes('admin')||rol.includes('dueno')){
          toast(`📬 ${clienteNombre} respondió el email de Hernán`);
        }

        // 2. Email de alerta a administre@metogroup.ar
        const htmlAlerta = '<div style="font-family:Arial,sans-serif;max-width:520px;padding:32px;background:#fff;color:#1a1a1a">'
          +'<div style="font-size:11px;letter-spacing:2px;color:#888;text-transform:uppercase;margin-bottom:16px">MetoGroup · Alerta del Agente</div>'
          +'<div style="font-size:20px;font-weight:700;margin-bottom:8px">📬 Respuesta de cliente recibida</div>'
          +'<div style="background:#f8f6f0;border-left:3px solid #c8a84a;padding:14px 18px;border-radius:0 6px 6px 0;margin-bottom:20px">'
          +'<div style="font-size:13px;margin-bottom:4px"><strong>Cliente:</strong> '+clienteNombre+'</div>'
          +'<div style="font-size:13px;margin-bottom:4px"><strong>De:</strong> '+fromAddr+'</div>'
          +'<div style="font-size:13px;margin-bottom:4px"><strong>Asunto:</strong> '+asunto+'</div>'
          +'<div style="font-size:13px"><strong>Recibido:</strong> '+fecha+'</div>'
          +'</div>'
          +'<p style="font-size:13px;color:#555;line-height:1.7">El cliente respondió el email de Hernán Quiroz. Revisá la bandeja de <strong>hernanquiroz@metogroup.ar</strong> para leer el mensaje y responder.</p>'
          +'<div style="border-top:1px solid #eee;padding-top:16px;margin-top:20px;font-size:11px;color:#888">MetoGroup · Agente automático</div>'
          +'</div>';

        try{
          await fetch('/.netlify/functions/send-email',{
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
              from_email: emailCfg.smtp_user,
              from_password: emailCfg.smtp_pass,
              from_name: 'Agente MetoGroup',
              to: 'administre@metogroup.ar',
              subject: '📬 '+clienteNombre+' respondió el email de Hernán — '+fecha,
              html: htmlAlerta,
              text: clienteNombre+' respondió el email de Hernán. Asunto: '+asunto+'. Revisá la bandeja de hernanquiroz@metogroup.ar'
            })
          });
        }catch(e){ console.warn('Agente: error enviando alerta bandeja', e); }
      }
    }catch(e){
      console.warn('Agente: error chequeando bandeja Hernán', e);
    }
  }
};

// Iniciar agente cuando el usuario está logueado


function agenteMenu(){
  const hist = JSON.parse(localStorage.getItem('METO_agente_historial')||'[]');
  const ultima = hist[0];
  const ov = document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;z-index:9998;';
  ov.onclick = ()=>ov.remove();
  const menu = document.createElement('div');
  menu.style.cssText='position:fixed;top:60px;right:20px;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:8px;min-width:240px;z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,0.4)';
  menu.innerHTML=`
    <div style="padding:10px 12px;border-bottom:1px solid var(--border);margin-bottom:4px">
      <div style="font-size:12px;font-weight:700">🤖 Agente MetoGroup</div>
      <div style="font-size:10px;color:var(--muted);margin-top:2px">Corre a las 9hs, 18hs y 20hs</div>
      ${ultima?`<div style="font-size:10px;color:var(--muted);margin-top:2px">Última ejecución: ${ultima.fecha} ${ultima.hora}hs</div>`:'<div style="font-size:10px;color:var(--warn)">Sin ejecuciones hoy</div>'}
    </div>
    <div onclick="AGENTE.ejecutarAhora();this.closest('div[style*=fixed]').remove();this.closest('div[style*=fixed]').previousSibling.remove()" style="padding:9px 12px;cursor:pointer;border-radius:8px;font-size:13px;display:flex;align-items:center;gap:8px" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background=''">
      ▶️ Ejecutar ahora
    </div>
    <div onclick="AGENTE.enviarReporteDiario(todayStr(),todayStr().substring(0,7));this.closest('div[style*=fixed]').remove();this.closest('div[style*=fixed]').previousSibling.remove()" style="padding:9px 12px;cursor:pointer;border-radius:8px;font-size:13px;display:flex;align-items:center;gap:8px" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background=''">
      📊 Enviar reporte a Ariel ahora
    </div>
    <div onclick="AGENTE.verHistorial();this.closest('div[style*=fixed]').remove();this.closest('div[style*=fixed]').previousSibling.remove()" style="padding:9px 12px;cursor:pointer;border-radius:8px;font-size:13px;display:flex;align-items:center;gap:8px" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background=''">
      📋 Ver historial de ejecuciones
    </div>
  `;
  menu.onclick = e=>e.stopPropagation();
  document.body.appendChild(ov);
  document.body.appendChild(menu);
}

// ══════════════════════════════════════════════════════════════════
// MÉTRICAS DE CIERRE — vendedores telefónicos + Leandro/Ariel
// ══════════════════════════════════════════════════════════════════

function calcMetricasCierre(ym){
  ym = ym || todayStr().substring(0,7);
  const logs = S.get('crm_logs');
  const entrevistas = S.get('crm_entrevistas')||[];
  const vendedores = S.get('vendedores').filter(v=>v.estado!=='Inactivo');
  const auditores = S.get('auditores')||[];

  // ── 1. Vendedores telefónicos: Cierres / Llamadas totales ──
  const metVendedores = vendedores.map(v=>{
    const mLogs = logs.filter(l=>l.vendedor===v.nombre&&l.fecha.startsWith(ym));
    const ll = mLogs.reduce((s,l)=>s+(l.llamadas||0),0);
    const ci = mLogs.reduce((s,l)=>s+(l.cerradas||0),0);
    const du = mLogs.reduce((s,l)=>s+(l.duenos||0),0);
    const ag = mLogs.reduce((s,l)=>s+(l.agendadas||0),0);
    const pctCierre = ll>0 ? (ci/ll*100) : null;
    // Benchmark: buen cierre telefónico ≥ 3%, aceptable ≥ 1.5%
    const nivel = pctCierre===null?'sin_datos':pctCierre>=3?'excelente':pctCierre>=1.5?'bueno':pctCierre>=0.8?'regular':'bajo';
    return { nombre:v.nombre, llamadas:ll, cierres:ci, duenos:du, agendadas:ag, pctCierre, nivel, tipo:'vendedor' };
  });

  // ── 2. Leandro y Ariel: calidad de cierre en entrevistas ──
  // "cerrada como venta" = proximoPaso==='Cerrar contrato' O tiene auditoría creada para esa empresa
  const auds = S.get('auditorias');
  const entrevistadores = ['Leandro','Ariel','leandro','ariel'].flatMap(n=>
    auditores.filter(a=>a.nombre.toLowerCase().includes(n.toLowerCase())).map(a=>a.nombre)
  );
  // También buscar en usuarios con rol dueno que se llamen Leandro/Ariel
  const usuariosLA = (S.get('usuarios')||[]).filter(u=>
    ['leandro','ariel'].some(n=>u.nombre?.toLowerCase().includes(n))
  ).map(u=>u.nombre);
  const todosLA = [...new Set([...entrevistadores,...usuariosLA])];

  const metEntrevistadores = todosLA.map(nombre=>{
    const misEnt = entrevistas.filter(e=>{
      const esEntrevistador = e.entrevistador===nombre || e.vendedor===nombre;
      const delMes = (e.fechaRealizada||e.fechaAgendada||'').startsWith(ym);
      return esEntrevistador && e.fechaRealizada && delMes;
    });
    const total = misEnt.length;
    const cerradas = misEnt.filter(e=>
      e.proximoPaso==='Cerrar contrato' ||
      auds.some(a=>a.clienteNombre===e.empresa && a.estado!=='Cancelada')
    ).length;
    const interesadas = misEnt.filter(e=>
      e.interesado && !e.interesado.includes('No') && e.interesado!=='Dudoso'
    ).length;
    const pctCierre = total>0 ? (cerradas/total*100) : null;
    const pctInteres = total>0 ? (interesadas/total*100) : null;
    // Benchmark: cierre entrevista ≥ 30% excelente, ≥ 15% bueno
    const nivel = pctCierre===null?'sin_datos':pctCierre>=30?'excelente':pctCierre>=15?'bueno':pctCierre>=8?'regular':'bajo';
    return { nombre, total, cerradas, interesadas, pctCierre, pctInteres, nivel, tipo:'entrevistador' };
  }).filter(m=>m.nombre); // solo los que existen

  return { vendedores: metVendedores, entrevistadores: metEntrevistadores, ym };
}

function nivelColor(nivel){
  return nivel==='excelente'?'#c8a84a':nivel==='bueno'?'var(--accent3)':nivel==='regular'?'var(--warn)':'var(--danger)';
}
function nivelBg(nivel){
  return nivel==='excelente'?'rgba(200,168,74,0.12)':nivel==='bueno'?'rgba(200,168,74,0.08)':nivel==='regular'?'rgba(245,158,11,0.1)':'rgba(239,68,68,0.08)';
}
function nivelLabel(nivel){
  return nivel==='excelente'?'🏆 Excelente':nivel==='bueno'?'✅ Bueno':nivel==='regular'?'⚠️ Regular':nivel==='bajo'?'🔴 Bajo':'—';
}


// ══════════════════════════════════════════════════════════════════
const FICHAS_ENTREVISTA = {"vendedor_ficha": {"nombre": "Ficha_Entrevista_Vendedor_MetoGroup.docx", "b64": "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"}, "gerente_ficha": {"nombre": "Ficha_Entrevista_Gerente_MetoGroup.docx", "b64": "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"}, "dueno_ficha": {"nombre": "Ficha_Entrevista_Dueno_MetoGroup.docx", "b64": "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"}, "vendedor_preguntas": {"nombre": "Preguntas_Disparadoras_Vendedor_MetoGroup.docx", "b64": "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"}, "gerente_preguntas": {"nombre": "Preguntas_Disparadoras_Gerente_MetoGroup.docx", "b64": "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"}, "dueno_preguntas": {"nombre": "Preguntas_Disparadoras_Dueno_MetoGroup.docx", "b64": "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"},
  "ficha_insitu": {"nombre": "Ficha_Relevamiento_InSitu_BPC2026.xlsx", "b64": "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"}, "checklist_evidencia": {"nombre": "Checklist_Evidencia_BPC2026.docx", "b64": "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"}, "kit_doc_minimos": {"nombre": "Kit_Documentos_Minimos_BPC2026.docx", "b64": "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"}
};

// MÓDULO DE EXÁMENES BPC — Auditoría y Reclutamiento
// ══════════════════════════════════════════════════════════════════

const EXAMEN_URL = 'examen-bpc.html';       // Examen vendedores
const EXAMEN_DUENO_URL = 'examen-dueno.html';    // Diagnóstico dueño
const EXAMEN_GERENTE_URL = 'examen-gerente.html'; // Diagnóstico gerente

// ── Catálogo central de exámenes — agregar acá cada examen nuevo ──────────────
// Este objeto es la única fuente de verdad. Todos los selectores lo leen de acá.
const EXAMENES_CATALOG = [
  { id:'vendedor',        label:'Examen Vendedores BPC:2026',           url:'examen-bpc.html',                desc:'Evaluación del equipo comercial — procesos, metodología y desempeño individual.' },
  { id:'gerente',         label:'Diagnóstico Gerente Comercial',         url:'examen-gerente.html',            desc:'Liderazgo comercial — estrategia, gestión del equipo y resultados.' },
  { id:'dueno',           label:'Diagnóstico Estratégico del Dueño',     url:'examen-dueno.html',              desc:'Dirección comercial — visión, estructura y modelo de gestión.' },
  { id:'dueno_comercial', label:'Diagnóstico Dueño que Vende',           url:'examen-dueno-comercial.html',    desc:'Para el dueño que es el principal vendedor — dependencia y delegación.' },
  { id:'recuperacion',    label:'Diagnóstico de Recuperación Comercial', url:'examen-recuperacion-comercial.html', desc:'Para empresas con resultados en caída — causas y plan de recuperación.' },
  // ── Agregar nuevos exámenes acá ──
  // { id:'nombre_id', label:'Nombre visible', url:'examen-nombre.html', desc:'Descripción breve.' },
];

// Función helper — devuelve el catálogo como texto para usar en prompts de IA
function getExamenesCatalogText(){
  return EXAMENES_CATALOG.map(e=>`— ${e.label}: ${e.desc}`).join('\n');
}

async function loadExamenesResultados(){
  // Cargar resultados desde Supabase
  try{
    const resp = await fetch(SUPABASE_URL+'/rest/v1/examen_resultados?order=fecha.desc&limit=200', {
      headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY}
    });
    if(resp.ok) return await resp.json();
  }catch(e){}
  return [];
}

function renderExamenes(){
  const el = document.getElementById('examenes-content');
  if(!el) return;
  el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted)">⏳ Cargando...</div>`;
  _renderExamenes();
}

async function _renderExamenes(){
  const el = document.getElementById('examenes-content');
  if(!el) return;
  const resultados = await loadExamenesResultados();
  const auds = S.get('auditorias');
  const ym = todayStr().substring(0,7);

  // Separar por tipo
  const deAuditoria = resultados.filter(r=>r.tipo==='auditoria');
  const deReclutamiento = resultados.filter(r=>r.tipo==='reclutamiento'||r.tipo==='standalone'||!r.tipo);

  const nivelColor = n => n==='EXPERTO'?'#c8a84a':n==='COMPETENTE'?'var(--accent3)':n==='EN DESARROLLO'?'var(--warn)':'var(--danger)';
  const nivelBg = n => n==='EXPERTO'?'rgba(200,168,74,0.12)':n==='COMPETENTE'?'rgba(200,168,74,0.08)':n==='EN DESARROLLO'?'rgba(245,158,11,0.1)':'rgba(239,68,68,0.08)';

  const renderResultadoRow = r => `
    <tr>
      <td style="font-weight:600">${r.nombre}</td>
      <td style="color:var(--muted);font-size:12px">${r.empresa||'—'}</td>
      <td style="text-align:center">
        <span style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:${nivelColor(r.nivel)}">${r.score}%</span>
      </td>
      <td><span style="background:${nivelBg(r.nivel)};color:${nivelColor(r.nivel)};border-radius:20px;padding:3px 10px;font-size:10px;font-weight:700">${r.nivel}</span></td>
      <td style="font-size:11px">
        ${r.areas ? (()=>{
          const areas = typeof r.areas === 'string' ? JSON.parse(r.areas) : r.areas;
          return Object.entries(areas).map(([k,v])=>`
            <span style="display:inline-block;margin:1px;font-size:9px;background:var(--surface2);border-radius:4px;padding:2px 5px;color:${v.pct>=70?'var(--accent3)':v.pct>=50?'var(--warn)':'var(--danger)'}">${k}: ${v.pct}%</span>
          `).join('');
        })() : '—'}
      </td>
      <td style="color:var(--muted);font-size:11px">${r.fecha ? new Date(r.fecha).toLocaleDateString('es-AR') : '—'}</td>
      <td><button onclick="verDetalleExamen(${JSON.stringify(r).replace(/"/g,'&quot;')})" class="btn btn-secondary btn-sm">Ver</button></td>
    </tr>`;

  el.innerHTML = `
    <style>
    .exam-tab{padding:8px 16px;border:none;background:transparent;color:var(--muted);cursor:pointer;font-size:12px;font-weight:600;border-bottom:2px solid transparent;transition:all 0.15s;}
    .exam-tab.active{color:var(--accent);border-bottom-color:var(--accent);}
    </style>

    <!-- Tabs -->
    <div style="display:flex;gap:0;border-bottom:1px solid var(--border);margin-bottom:20px">
      <button class="exam-tab active" id="etab-audit" onclick="examTab('audit')">🔍 Auditorías (${deAuditoria.length})</button>
      <button class="exam-tab" id="etab-reclu" onclick="examTab('reclu')">👤 Reclutamiento (${deReclutamiento.length})</button>
      <button class="exam-tab" id="etab-diag" onclick="examTab('diag')">🧭 Diagnósticos (${resultados.filter(r=>r.tipo&&r.tipo.startsWith('diagnostico')).length})</button>
    </div>

    <!-- Panel Auditoría -->
    <div id="epanel-audit">
      <!-- Generar código para auditoría -->
      <div class="card" style="margin-bottom:20px">
        <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;margin-bottom:14px">📋 Generar código para auditoría</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:10px;align-items:end">
          <div>
            <label style="font-size:10px;color:var(--muted);display:block;margin-bottom:4px">Nombre del evaluado</label>
            <input id="exam-nombre-aud" placeholder="Juan García" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-size:13px">
          </div>
          <div>
            <label style="font-size:10px;color:var(--muted);display:block;margin-bottom:4px">Empresa cliente</label>
            <input id="exam-empresa-aud" placeholder="Empresa S.A." style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-size:13px">
          </div>
          <div>
            <label style="font-size:10px;color:var(--muted);display:block;margin-bottom:4px">Auditoría (opcional)</label>
            <select id="exam-aud-id" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-size:13px">
              <option value="">— Sin vincular —</option>
              ${auds.filter(a=>a.estado!=='Completada'&&a.estado!=='Cancelada').map(a=>`<option value="${a.id}">${a.clienteNombre} — ${a.tipo||'BPCE'}</option>`).join('')}
            </select>
          </div>
          <button onclick="examGenerarCodigo('auditoria')" class="btn btn-primary">+ Generar código</button>
        </div>
        <div id="exam-codigo-result-aud" style="margin-top:14px"></div>
      </div>

      <!-- Resultados -->
      <div class="table-wrap">
        <div class="table-header"><div class="table-title">Resultados de auditoría (${deAuditoria.length})</div></div>
        ${deAuditoria.length ? `
          <table><thead><tr>
            <th>Nombre</th><th>Empresa</th><th>Score</th><th>Nivel</th><th>Por área</th><th>Fecha</th><th></th>
          </tr></thead>
          <tbody>${deAuditoria.map(renderResultadoRow).join('')}</tbody></table>
        ` : '<div style="padding:32px;text-align:center;color:var(--muted);font-size:12px">Sin resultados aún</div>'}
      </div>
    </div>

    <!-- Panel Reclutamiento -->
    <div id="epanel-reclu" style="display:none">
      <!-- Generar código para reclutamiento -->
      <div class="card" style="margin-bottom:20px">
        <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;margin-bottom:14px">👤 Generar código para candidato</div>
        <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end">
          <div>
            <label style="font-size:10px;color:var(--muted);display:block;margin-bottom:4px">Nombre del candidato</label>
            <input id="exam-nombre-rec" placeholder="María López" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-size:13px">
          </div>
          <div>
            <label style="font-size:10px;color:var(--muted);display:block;margin-bottom:4px">Puesto / referencia</label>
            <input id="exam-empresa-rec" placeholder="Candidato vendedor zona norte" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-size:13px">
          </div>
          <button onclick="examGenerarCodigo('reclutamiento')" class="btn btn-primary">+ Generar código</button>
        </div>
        <div id="exam-codigo-result-rec" style="margin-top:14px"></div>
      </div>

      <!-- Resultados -->
      <div class="table-wrap">
        <div class="table-header"><div class="table-title">Resultados de candidatos (${deReclutamiento.length})</div></div>
        ${deReclutamiento.length ? `
          <table><thead><tr>
            <th>Nombre</th><th>Referencia</th><th>Score</th><th>Nivel</th><th>Por área</th><th>Fecha</th><th></th>
          </tr></thead>
          <tbody>${deReclutamiento.map(renderResultadoRow).join('')}</tbody></table>
        ` : '<div style="padding:32px;text-align:center;color:var(--muted);font-size:12px">Sin candidatos evaluados aún</div>'}
      </div>
    </div>

    <!-- Panel Diagnósticos -->
    <div id="epanel-diag" style="display:none">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">

        <!-- Dueño -->
        <div class="card">
          <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;margin-bottom:6px">👑 Diagnóstico Dueño/Director</div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:14px">6 dimensiones: delegación, timing, canales, decisiones, rol comercial, finanzas</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
            <div><label style="font-size:10px;color:var(--muted);display:block;margin-bottom:4px">Nombre del evaluado</label>
            <input id="exam-nombre-dueno" placeholder="Nombre del dueño" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-size:12px"></div>
            <div><label style="font-size:10px;color:var(--muted);display:block;margin-bottom:4px">Empresa</label>
            <input id="exam-empresa-dueno" placeholder="Empresa S.A." style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-size:12px"></div>
          </div>
          <button onclick="examGenerarCodigoDiag('dueno')" class="btn btn-primary" style="width:100%">+ Generar código diagnóstico</button>
          <div id="exam-codigo-result-dueno" style="margin-top:12px"></div>
        </div>

        <!-- Gerente -->
        <div class="card">
          <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;margin-bottom:6px">📊 Diagnóstico Gerente Comercial</div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:14px">6 dimensiones: liderazgo, métricas, procesos, coordinación, conflictos, herramientas</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
            <div><label style="font-size:10px;color:var(--muted);display:block;margin-bottom:4px">Nombre del evaluado</label>
            <input id="exam-nombre-gerente" placeholder="Nombre del gerente" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-size:12px"></div>
            <div><label style="font-size:10px;color:var(--muted);display:block;margin-bottom:4px">Empresa</label>
            <input id="exam-empresa-gerente" placeholder="Empresa S.A." style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-size:12px"></div>
          </div>
          <button onclick="examGenerarCodigoDiag('gerente')" class="btn btn-primary" style="width:100%">+ Generar código diagnóstico</button>
          <div id="exam-codigo-result-gerente" style="margin-top:12px"></div>
        </div>
      </div>

      <!-- Resultados diagnósticos -->
      <div class="table-wrap">
        <div class="table-header"><div class="table-title">Resultados de diagnósticos</div></div>
        ${resultados.filter(r=>r.tipo&&r.tipo.startsWith('diagnostico')).length ? `
          <table><thead><tr>
            <th>Nombre</th><th>Empresa</th><th>Tipo</th><th>Respuestas</th><th>Fecha</th><th></th>
          </tr></thead>
          <tbody>${resultados.filter(r=>r.tipo&&r.tipo.startsWith('diagnostico')).map(r=>`
            <tr>
              <td style="font-weight:600">${r.nombre}</td>
              <td style="color:var(--muted);font-size:12px">${r.empresa||'—'}</td>
              <td><span style="background:rgba(212,175,55,0.1);color:var(--accent);border-radius:20px;padding:3px 10px;font-size:10px;font-weight:700">${r.tipo==='diagnostico_dueno'?'👑 Dueño':'📊 Gerente'}</span></td>
              <td style="font-size:12px">${r.correctas||r.total||'—'} / ${r.total||20} completadas</td>
              <td style="color:var(--muted);font-size:11px">${r.fecha?new Date(r.fecha).toLocaleDateString('es-AR'):'—'}</td>
              <td><button onclick="verDetalleExamen(${JSON.stringify(r).replace(/"/g,'&quot;')})" class="btn btn-secondary btn-sm">Ver perfil</button></td>
            </tr>`).join('')}</tbody></table>
        ` : '<div style="padding:32px;text-align:center;color:var(--muted);font-size:12px">Sin diagnósticos realizados aún</div>'}
      </div>
    </div>`;
}

function examGenerarCodigoDiag(tipo){
  const nombre = document.getElementById('exam-nombre-'+tipo).value.trim();
  const empresa = document.getElementById('exam-empresa-'+tipo).value.trim();
  if(!nombre||!empresa){ toast('⚠️ Completá nombre y empresa'); return; }

  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let codigo='';
  for(let i=0;i<6;i++) codigo+=chars[Math.floor(Math.random()*chars.length)];

  const key = 'bpc_exam_codigos';
  const codigos = JSON.parse(localStorage.getItem(key)||'[]');
  codigos.push({id:Date.now(),codigo,nombre,empresa,activo:true,usado:false,tipo:'diagnostico_'+tipo,fechaCreacion:new Date().toLocaleDateString('es-AR')});
  localStorage.setItem(key,JSON.stringify(codigos));

  const examUrl = window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + (tipo==='dueno'?EXAMEN_DUENO_URL:EXAMEN_GERENTE_URL) + '?tipo=diagnostico_'+tipo;
  const msgWA = `Hola ${nombre}! Tu código para el diagnóstico MetoGroup es: *${codigo}*\nIngresá en: ${examUrl}`;

  document.getElementById('exam-codigo-result-'+tipo).innerHTML = `
    <div style="background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.25);border-radius:10px;padding:14px 16px">
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <div>
          <div style="font-size:10px;color:var(--muted);margin-bottom:4px">Código para <strong style="color:var(--text)">${nombre}</strong></div>
          <div style="font-family:'Syne',sans-serif;font-size:28px;font-weight:900;color:var(--accent);letter-spacing:4px">${codigo}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-left:auto">
          <button onclick="navigator.clipboard.writeText('${msgWA}');toast('✅ Copiado')" class="btn btn-secondary btn-sm">📱 WhatsApp</button>
          <a href="${examUrl}" target="_blank" class="btn btn-primary btn-sm">Abrir ↗</a>
        </div>
      </div>
    </div>`;
  toast('✅ Código '+codigo+' generado');
}

function examTab(tab){
  ['audit','reclu','diag'].forEach(t=>{
    document.getElementById('etab-'+t)?.classList.toggle('active', t===tab);
    document.getElementById('epanel-'+t) && (document.getElementById('epanel-'+t).style.display = t===tab?'block':'none');
  });
}

function examGenerarCodigo(tipo){
  const nombre = document.getElementById(tipo==='auditoria'?'exam-nombre-aud':'exam-nombre-rec').value.trim();
  const empresa = document.getElementById(tipo==='auditoria'?'exam-empresa-aud':'exam-empresa-rec').value.trim();
  const audId = tipo==='auditoria' ? document.getElementById('exam-aud-id').value : '';
  if(!nombre||!empresa){ toast('⚠️ Completá nombre y empresa/referencia'); return; }

  // Generar código memorable de 6 chars
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let codigo='';
  for(let i=0;i<6;i++) codigo+=chars[Math.floor(Math.random()*chars.length)];

  // Guardar en localStorage del examen (misma key que usa el examen)
  const key = 'bpc_exam_codigos';
  const codigos = JSON.parse(localStorage.getItem(key)||'[]');
  const newCod = {
    id:Date.now(), codigo, nombre, empresa,
    activo:true, usado:false,
    tipo, auditoriaId: audId||null,
    fechaCreacion:new Date().toLocaleDateString('es-AR')
  };
  codigos.push(newCod);
  localStorage.setItem(key, JSON.stringify(codigos));

  // Construir URL del examen
  const baseUrl = window.location.origin + window.location.pathname.replace('index_8.html','').replace(/\/[^\/]*$/, '/') + EXAMEN_URL;
  const params = new URLSearchParams({tipo, ...(audId?{audId}:{})});
  const examUrl = `${baseUrl}?${params}`;
  const msgWA = `Hola ${nombre}! Tu código para el Examen de Competencias BPC:2026 es: *${codigo}*\nIngresá en: ${examUrl}`;

  const resultDiv = document.getElementById(`exam-codigo-result-${tipo==='auditoria'?'aud':'rec'}`);
  resultDiv.innerHTML = `
    <div style="background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.25);border-radius:10px;padding:14px 16px">
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <div>
          <div style="font-size:10px;color:var(--muted);margin-bottom:4px">Código generado para <strong style="color:var(--text)">${nombre}</strong></div>
          <div style="font-family:'Syne',sans-serif;font-size:28px;font-weight:900;color:var(--accent);letter-spacing:4px">${codigo}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-left:auto">
          <button onclick="navigator.clipboard.writeText('${msgWA}');toast('✅ Copiado para WhatsApp')" class="btn btn-secondary btn-sm">📱 Copiar para WhatsApp</button>
          <button onclick="navigator.clipboard.writeText('${examUrl}');toast('✅ Link copiado')" class="btn btn-secondary btn-sm">🔗 Copiar link</button>
          <a href="${examUrl}" target="_blank" class="btn btn-primary btn-sm">Abrir examen ↗</a>
        </div>
      </div>
    </div>`;

  toast(`✅ Código ${codigo} generado para ${nombre}`);
}

function verDetalleExamen(r){
  if(typeof r === 'string') r = JSON.parse(r);
  const areas = typeof r.areas === 'string' ? JSON.parse(r.areas||'{}') : (r.areas||{});
  const areaNombres = {cierre:'Cierre',objeciones:'Objeciones',etica:'Ética',negociacion:'Negociación',comunicacion:'Comunicación',redes:'Redes'};
  const nivelColor = n => n==='EXPERTO'?'#c8a84a':n==='COMPETENTE'?'var(--accent3)':n==='EN DESARROLLO'?'var(--warn)':'var(--danger)';

  const ov = document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  ov.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;width:580px;max-width:95vw;max-height:90vh;overflow-y:auto">
      <div style="padding:18px 22px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800">📊 Resultado del examen</div>
        <button onclick="this.closest('div[style*=fixed]').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:18px">✕</button>
      </div>
      <div style="padding:22px">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
          <div style="width:70px;height:70px;border-radius:50%;background:rgba(212,175,55,0.1);border:3px solid ${nivelColor(r.nivel)};display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:900;color:${nivelColor(r.nivel)}">${r.score}%</div>
          </div>
          <div>
            <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800">${r.nombre}</div>
            <div style="font-size:12px;color:var(--muted)">${r.empresa||'—'} · ${r.fecha ? new Date(r.fecha).toLocaleDateString('es-AR') : '—'}</div>
            <div style="margin-top:6px;background:rgba(212,175,55,0.1);color:${nivelColor(r.nivel)};border-radius:20px;padding:3px 12px;font-size:11px;font-weight:700;display:inline-block">${r.nivel}</div>
          </div>
        </div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);margin-bottom:10px">Resultado por área</div>
        ${Object.entries(areas).map(([k,v])=>`
          <div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span style="font-size:12px">${areaNombres[k]||k}</span>
              <span style="font-size:12px;font-weight:700;color:${v.pct>=70?'var(--accent3)':v.pct>=50?'var(--warn)':'var(--danger)'}">${v.pct}% (${v.correctas}/${v.total})</span>
            </div>
            <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:99px;overflow:hidden">
              <div style="width:${v.pct}%;height:100%;background:${v.pct>=70?'var(--accent3)':v.pct>=50?'var(--warn)':'var(--danger)'};border-radius:99px"></div>
            </div>
          </div>`).join('')}
        <div style="margin-top:16px;padding:12px;background:var(--surface2);border-radius:8px;font-size:11px;color:var(--muted)">
          Tipo: ${r.tipo||'—'} · Código: ${r.codigo||'—'} · ${r.correctas}/${r.total} respuestas correctas
        </div>
      </div>
    </div>`;
  ov.onclick = e=>{ if(e.target===ov) ov.remove(); };
  document.body.appendChild(ov);
}

// ═══ ACTIVITY TRACKER ═══
function trackActivity(action){
  if(!currentUser)return;
  try{
    const log=JSON.parse(localStorage.getItem('METO_crm_activity_log')||'[]');
    const today=new Date().toISOString().split('T')[0];
    const hour=new Date().getHours();
    log.push({user:currentUser.nombre,action,date:today,hour,ts:Date.now()});
    // Mantener últimos 90 días (max ~5000 entries)
    const cutoff=Date.now()-90*24*60*60*1000;
    const trimmed=log.filter(l=>l.ts>cutoff);
    localStorage.setItem('METO_crm_activity_log',JSON.stringify(trimmed));
  }catch(e){}
}


// ── Generar firma HTML para emails ──
function getEmailFirma(usuario){
  const u = usuario || currentUser;
  if(!u) return '';
  const nombre = u.email_nombre || u.nombre || '';
  const cargo = u.email_cargo || '';
  const tel = u.email_tel || '';
  const extra = u.email_firma_extra || '';
  const logo = u.email_logo || 'https://i.imgur.com/placeholder.png';
  // Solo mostrar logo si hay URL configurada
  const logoHtml = u.email_logo ? `<img src="${u.email_logo}" alt="MetoGroup" style="height:40px;margin-bottom:8px;display:block">` : `<div style="font-family:serif;font-size:18px;font-weight:700;color:#1a1a1a;margin-bottom:4px">MetoGroup</div>`;
  return `<div style="font-family:Arial,sans-serif;border-top:2px solid #d4af37;padding-top:12px;margin-top:20px;color:#555">
    ${logoHtml}
    ${nombre ? `<div style="font-weight:700;font-size:13px;color:#1a1a1a">${nombre}</div>` : ''}
    ${cargo ? `<div style="font-size:12px;color:#888;margin-top:2px">${cargo}</div>` : ''}
    ${tel ? `<div style="font-size:12px;color:#888;margin-top:2px">📞 ${tel}</div>` : ''}
    ${extra ? `<div style="font-size:11px;color:#aaa;margin-top:6px">${extra}</div>` : ''}
  </div>`;
}

// ═══ EMAIL MODULE ═══
// Guardar contraseña de email — usando encodeURIComponent (soporta cualquier carácter)
function emailSavePassword(pass){
  if(!currentUser||!pass)return;
  const key='METO_email_cred_'+currentUser.id;
  localStorage.setItem(key, 'URI:'+encodeURIComponent(pass));
  // También guardar en email_config vinculado al email del usuario
  // para que el módulo de correos lo encuentre correctamente
  if(currentUser.email){
    saveSmtpFor(currentUser.email, currentUser.email, pass, currentUser.nombre||currentUser.email);
  }
  toast('✅ Contraseña de email guardada');
}
function emailGetPassword(){
  if(!currentUser)return null;
  const key='METO_email_cred_'+currentUser.id;
  const raw=localStorage.getItem(key);
  if(!raw)return null;
  try{
    // Formato nuevo: URI:...
    if(raw.startsWith('URI:')) return decodeURIComponent(raw.slice(4));
    // Formato legacy RAW:
    if(raw.startsWith('RAW:')) return decodeURIComponent(raw.slice(4));
    // Formato legacy btoa — intentar decodificar, si falla limpiar
    try{
      const decoded = atob(raw);
      try{ return decodeURIComponent(escape(decoded)); }catch(e2){ return decoded; }
    }catch(e){
      // Dato corrupto — limpiar y pedir de nuevo
      console.warn('Contraseña de email corrupta, limpiando...');
      localStorage.removeItem(key);
      return null;
    }
  }catch(e){
    localStorage.removeItem(key);
    return null;
  }
}

// ═══ CORREOS MODULE — Bandeja de entrada completa ═══
let _correosFolder='INBOX';
let _correosPage=1;
let _correosCache={};

function renderCorreos(){
  const el=document.getElementById('correos-content');
  if(!el)return;
  const userEmail=currentUser?.email||'';
  let pwd;
  try{ pwd=emailGetPassword(); }catch(e){ console.warn('Error leyendo password email:',e); pwd=null; }

  // ── Banner SMTP si no está configurado ──────────────────────────
  // Usar config específica del usuario actual, no la global
  const _ecCfg = userEmail ? getSmtpFor(userEmail) : ((S.get('email_config')||[])[0]||{});
  const _smtpOk = !!(_ecCfg.smtp_user && _ecCfg.smtp_pass);
  const _smtpBanner = !_smtpOk ? `
  <div style="background:rgba(239,68,68,0.1);border:2px solid rgba(239,68,68,0.4);border-radius:14px;padding:20px;margin-bottom:20px">
    <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:800;color:var(--danger);margin-bottom:4px">⚠️ SMTP no configurado — el agente no puede enviar emails</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:16px">Configurá las credenciales de tu email de Donweb para que el agente pueda enviar bienvenidas, alertas y coordinación de auditorías.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
      <div>
        <label style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:4px">📧 Email (usuario SMTP)</label>
        <input id="smtp-banner-user" type="email" placeholder="hernandez@metogroup.ar" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);font-size:13px;box-sizing:border-box">
      </div>
      <div>
        <label style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:4px">🔑 Contraseña SMTP (Donweb)</label>
        <input id="smtp-banner-pass" type="password" placeholder="Tu contraseña de email" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);font-size:13px;box-sizing:border-box">
      </div>
    </div>
    <div style="display:flex;gap:8px;align-items:center">
      <button class="btn btn-primary" onclick="
        const u=document.getElementById('smtp-banner-user').value.trim();
        const p=document.getElementById('smtp-banner-pass').value.trim();
        if(!u||!p){toast('⚠️ Completá email y contraseña');return;}
        // Guardar SMTP vinculado al email del usuario actual
        const _cu = currentUser?.email||u;
        saveSmtpFor(_cu, u, p, currentUser?.nombre||u);
        localStorage.setItem('METO_smtp_config_'+_cu, JSON.stringify({user:u,pass:p}));
        toast('✅ SMTP configurado para '+u);
        renderCorreos();
      ">💾 Guardar configuración SMTP</button>
      <button class="btn btn-secondary btn-sm" onclick="document.getElementById('smtp-banner-pass').type=document.getElementById('smtp-banner-pass').type==='password'?'text':'password'">👁 Ver</button>
    </div>
    <div style="font-size:10px;color:var(--muted);margin-top:10px">💡 En Donweb: Panel de control → Hosting → Cuentas de email → tu cuenta → datos SMTP</div>
  </div>` : `
  <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.25);border-radius:10px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between">
    <div style="font-size:12px;color:var(--accent3)">✅ SMTP configurado — <strong>${_ecCfg.smtp_user}</strong></div>
    <button class="btn btn-secondary btn-sm" onclick="
      if(!confirm('¿Borrar la configuración SMTP de este usuario?'))return;
      const _ue = currentUser?.email||'';
      localStorage.removeItem('METO_smtp_config_'+_ue);
      // Eliminar solo la entrada de este usuario, no toda la config
      const _cfgs = (S.get('email_config')||[]).filter(c=>c.email?.toLowerCase()!==_ue.toLowerCase());
      S.set('email_config', _cfgs);
      renderCorreos();
      toast('🗑 SMTP eliminado para '+_ue);
    ">🗑 Borrar</button>
  </div>`;

  if(!userEmail||!userEmail.includes('@')){
    el.innerHTML = _smtpBanner + `<div style="padding:40px;text-align:center"><div style="font-size:48px;margin-bottom:16px">📧</div><div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700;margin-bottom:8px">Email no configurado</div><div style="color:var(--muted);font-size:13px">Tu usuario no tiene email. Pedile al admin que lo configure en Usuarios.</div></div>`;
    return;
  }
  // ── fin banner SMTP ──────────────────────────────────────────────

  if(!userEmail||!userEmail.includes('@')){
    el.innerHTML=`<div style="padding:40px;text-align:center"><div style="font-size:48px;margin-bottom:16px">📧</div><div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700;margin-bottom:8px">Email no configurado</div><div style="color:var(--muted);font-size:13px">Tu usuario no tiene email. Pedile al admin que lo configure en Usuarios.</div></div>`;
    return;
  }

  if(!pwd){
    el.innerHTML=`<div style="padding:40px;max-width:400px;margin:0 auto;text-align:center">
      <div style="font-size:48px;margin-bottom:16px">🔑</div>
      <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700;margin-bottom:8px">Configurá tu email</div>
      <div style="color:var(--muted);font-size:13px;margin-bottom:20px">Ingresá la contraseña de <strong>${userEmail}</strong> para acceder a tu bandeja. Se guarda solo en tu navegador.</div>
      <div style="display:flex;gap:8px"><input type="password" id="correos-pwd" placeholder="Contraseña de ${userEmail}" style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 14px;color:var(--text);font-size:13px">
      <button onclick="emailSavePassword(document.getElementById('correos-pwd').value);renderCorreos()" class="btn btn-primary">💾 Guardar</button></div>
    </div>`;
    return;
  }

  el.innerHTML=_smtpBanner+`
  <div style="display:grid;grid-template-columns:220px 1fr;gap:0;height:calc(100vh - 120px);background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden">
    <!-- Sidebar carpetas -->
    <div style="background:var(--surface2);border-right:1px solid var(--border);padding:16px 0;overflow-y:auto">
      <div style="padding:0 16px 14px;display:flex;flex-direction:column;gap:6px">
        <button onclick="emailComponer('',{})" class="btn btn-primary" style="width:100%;font-size:13px">✏️ Redactar</button>
      </div>
      <div id="correos-folders" style="padding:0 8px">
        <div style="padding:10px 12px;font-size:12px;color:var(--muted)">Cargando carpetas...</div>
      </div>
      <div style="padding:16px;border-top:1px solid var(--border);margin-top:auto">
        <div style="font-size:10px;color:var(--muted);margin-bottom:4px">📧 ${userEmail}</div>
        <button onclick="localStorage.removeItem('METO_email_cred_'+currentUser.id);renderCorreos()" style="font-size:10px;color:var(--danger);background:none;border:none;cursor:pointer;padding:0">🔑 Cambiar contraseña</button>
      </div>
    </div>
    <!-- Lista de mensajes -->
    <div style="display:flex;flex-direction:column;overflow:hidden">
      <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700" id="correos-folder-title">Bandeja de entrada</div>
        <div style="display:flex;gap:6px;align-items:center">
          <button onclick="_correosPage=Math.max(1,_correosPage-1);correosLoadMessages()" class="btn btn-secondary btn-sm">← Anterior</button>
          <span id="correos-paging" style="font-size:11px;color:var(--muted)"></span>
          <button onclick="_correosPage++;correosLoadMessages()" class="btn btn-secondary btn-sm">Siguiente →</button>
          <button onclick="correosLoadMessages()" class="btn btn-secondary btn-sm" title="Actualizar">🔄</button>
        </div>
      </div>
      <div id="correos-list" style="flex:1;overflow-y:auto;padding:0">
        <div style="padding:40px;text-align:center;color:var(--muted)">⏳ Cargando mensajes...</div>
      </div>
    </div>
  </div>`;

  correosLoadFolders();
  correosLoadMessages();
}

async function correosLoadFolders(){
  let pwd;try{pwd=emailGetPassword();}catch(e){pwd=null;}
  const email=currentUser?.email;
  if(!pwd||!email)return;
  try{
    const resp=await fetch('/.netlify/functions/read-email',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email,password:pwd,action:'folders'})
    });
    const data=await resp.json();
    if(!data.success)throw new Error(data.detail||'Error');
    const el=document.getElementById('correos-folders');
    if(!el)return;
    const icons={'INBOX':'📥','Sent':'📤','Drafts':'📝','Trash':'🗑','Junk':'⚠️','Spam':'⚠️','INBOX.Sent':'📤','INBOX.Drafts':'📝','INBOX.Trash':'🗑','INBOX.Junk':'⚠️'};
    const labels={'INBOX':'Bandeja de entrada','Sent':'Enviados','INBOX.Sent':'Enviados','Drafts':'Borradores','INBOX.Drafts':'Borradores','Trash':'Papelera','INBOX.Trash':'Papelera','Junk':'Spam','INBOX.Junk':'Spam'};
    el.innerHTML=data.folders.map(f=>{
      const ic=icons[f.path]||icons[f.specialUse]||'📁';
      const lb=labels[f.path]||f.name;
      const active=f.path===_correosFolder;
      return`<div onclick="_correosFolder='${f.path}';_correosPage=1;correosLoadMessages();correosHighlightFolder()" 
        data-folder="${f.path}"
        style="padding:9px 14px;border-radius:8px;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:8px;margin-bottom:2px;
        ${active?'background:rgba(212,175,55,0.1);color:var(--accent);font-weight:700':'color:var(--text)'};transition:background 0.1s"
        onmouseover="if(!this.dataset.active)this.style.background='rgba(255,255,255,0.04)'" 
        onmouseout="if(!this.dataset.active)this.style.background=''">${ic} ${lb}</div>`;
    }).join('');
  }catch(e){
    const el=document.getElementById('correos-folders');
    if(el)el.innerHTML=`<div style="padding:10px 12px;font-size:11px;color:var(--danger)">Error: ${e.message}</div>`;
  }
}

function correosHighlightFolder(){
  document.querySelectorAll('#correos-folders > div').forEach(d=>{
    const active=d.dataset.folder===_correosFolder;
    d.dataset.active=active?'1':'';
    d.style.background=active?'rgba(212,175,55,0.1)':'';
    d.style.color=active?'var(--accent)':'var(--text)';
    d.style.fontWeight=active?'700':'400';
  });
  const labels={'INBOX':'Bandeja de entrada','Sent':'Enviados','INBOX.Sent':'Enviados','Drafts':'Borradores','INBOX.Drafts':'Borradores','Trash':'Papelera','INBOX.Trash':'Papelera','Junk':'Spam','INBOX.Junk':'Spam'};
  const t=document.getElementById('correos-folder-title');
  if(t)t.textContent=labels[_correosFolder]||_correosFolder;
}

async function correosLoadMessages(){
  let pwd;try{pwd=emailGetPassword();}catch(e){pwd=null;}
  const email=currentUser?.email;
  const listEl=document.getElementById('correos-list');
  if(!pwd||!email){if(listEl)listEl.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">🔑 Ingresá tu contraseña de email</div>';return;}
  if(listEl)listEl.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">⏳ Cargando...</div>';

  try{
    const resp=await fetch('/.netlify/functions/read-email',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email,password:pwd,action:'list',folder:_correosFolder,page:_correosPage,limit:20})
    });
    const data=await resp.json();
    if(!data.success)throw new Error(data.detail||'Error');

    const pag=document.getElementById('correos-paging');
    if(pag)pag.textContent=`Pág ${data.page}/${data.pages||1} · ${data.total} emails`;

    if(!data.messages.length){
      if(listEl)listEl.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">📭 No hay mensajes</div>';
      return;
    }

    if(listEl)listEl.innerHTML=data.messages.map(m=>{
      const from=m.from[0]||{};
      const fromLabel=from.name||from.address||'Desconocido';
      const date=new Date(m.date);
      const isToday=date.toDateString()===new Date().toDateString();
      const dateStr=isToday?date.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}):date.toLocaleDateString('es-AR',{day:'numeric',month:'short'});
      const bg=m.seen?'':'background:rgba(212,175,55,0.03);';
      return`<div onclick="correosReadMessage(${m.uid},'${_correosFolder}')" style="padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;display:flex;align-items:center;gap:12px;transition:background 0.1s;${bg}">
        <div style="width:36px;height:36px;border-radius:50%;background:${m.seen?'var(--surface2)':'linear-gradient(135deg,var(--accent2),var(--accent))'};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:${m.seen?'var(--muted)':'#fff'};flex-shrink:0">${(fromLabel[0]||'?').toUpperCase()}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <span style="font-size:13px;font-weight:${m.seen?'400':'700'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${fromLabel}</span>
            <span style="font-size:10px;color:var(--muted);flex-shrink:0">${dateStr}</span>
          </div>
          <div style="font-size:12px;${m.seen?'color:var(--muted)':'color:var(--text);font-weight:600'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px">${m.subject}</div>
        </div>
        ${m.flagged?'<span style="color:#f59e0b">⭐</span>':''}
      </div>`;
    }).join('');

  }catch(e){
    if(listEl)listEl.innerHTML=`<div style="padding:40px;text-align:center"><div style="color:var(--danger);font-size:13px;margin-bottom:8px">❌ ${e.message}</div><button onclick="localStorage.removeItem('METO_email_cred_'+currentUser.id);renderCorreos()" class="btn btn-secondary btn-sm">🔑 Reingresar contraseña</button></div>`;
  }
}

async function correosReadMessage(uid,folder){
  let pwd;try{pwd=emailGetPassword();}catch(e){pwd=null;}
  const email=currentUser?.email;
  if(!pwd||!email){toast('❌ Reingresá tu contraseña de email');return;}
  
  // Show loading in modal
  const html=`<div class="modal-head"><div class="modal-title">⏳ Cargando mensaje...</div><button class="modal-close" onclick="closeModal('modal-correo-read')">✕</button></div><div class="modal-body" style="padding:40px;text-align:center"><div style="color:var(--muted)">Descargando email...</div></div>`;
  openGenericModal('modal-correo-read',html);

  try{
    const resp=await fetch('/.netlify/functions/read-email',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email,password:pwd,action:'read',folder,messageId:uid})
    });
    const data=await resp.json();
    if(!data.success)throw new Error(data.detail||'Error');

    const content=data.html||('<pre style="white-space:pre-wrap;font-size:13px">'+((data.text||'').replace(/</g,'&lt;'))+'</pre>');
    
    const readHtml=`<div class="modal-head">
      <div class="modal-title" style="font-size:14px">📧 Email</div>
      <div style="display:flex;gap:6px;align-items:center">
        <button onclick="correosReply(${uid},'${folder}')" class="btn btn-primary btn-sm">↩️ Responder</button>
        <button onclick="correosDelete(${uid},'${folder}')" class="btn btn-danger btn-sm">🗑</button>
        <button class="modal-close" onclick="closeModal('modal-correo-read')">✕</button>
      </div>
    </div>
    <div class="modal-body" style="max-height:75vh;overflow-y:auto">
      <div style="background:var(--surface2);border-radius:8px;padding:16px;overflow:auto;font-size:13px;line-height:1.6">${content}</div>
    </div>`;
    
    const m=document.getElementById('modal-correo-read');
    if(m)m.querySelector('.modal').innerHTML=readHtml;
    
    // Refresh list to update read status
    correosLoadMessages();
    
  }catch(e){
    const m=document.getElementById('modal-correo-read');
    if(m)m.querySelector('.modal').innerHTML=`<div class="modal-head"><div class="modal-title">❌ Error</div><button class="modal-close" onclick="closeModal('modal-correo-read')">✕</button></div><div class="modal-body"><div style="color:var(--danger)">${e.message}</div></div>`;
  }
}

async function correosDelete(uid,folder){
  if(!confirm('¿Eliminar este email?'))return;
  let pwd;try{pwd=emailGetPassword();}catch(e){pwd=null;}
  const email=currentUser?.email;
  if(!pwd||!email){toast('❌ Reingresá tu contraseña de email');return;}
  try{
    await fetch('/.netlify/functions/read-email',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email,password:pwd,action:'delete',folder,messageId:uid})
    });
    closeModal('modal-correo-read');
    correosLoadMessages();
    toast('🗑 Email eliminado');
  }catch(e){toast('❌ Error: '+e.message);}
}

function correosReply(uid,folder){
  closeModal('modal-correo-read');
  // Simple reply - open composer
  emailComponer('','');
}

// Plantillas de email
const EMAIL_TEMPLATES={
  presentacion:{
    subject:'MetoGroup — Servicios de Auditoría y Certificación',
    body:`<p>Estimado/a {contacto},</p>
<p>Mi nombre es {vendedor} de <strong>MetoGroup Latam S.A.</strong>, empresa especializada en auditoría comercial y certificación de buenas prácticas.</p>
<p>Nos comunicamos porque creemos que <strong>{empresa}</strong> podría beneficiarse de nuestros servicios:</p>
<ul>
<li><strong>Auditoría Internacional BPC 72001</strong> — Certificación de Buenas Prácticas Comerciales</li>
<li><strong>Adaptación IA BPCE</strong> — Integración de inteligencia artificial en procesos comerciales</li>
<li><strong>Implementación ISO 72001</strong> — Norma de gestión comercial</li>
</ul>
<p>¿Le interesaría coordinar una breve llamada esta semana para contarle más?</p>
<p>Quedo a disposición.<br>Saludos cordiales,</p>
<p><strong>{vendedor}</strong><br>{email}<br>MetoGroup Latam S.A.</p>`
  },
  seguimiento:{
    subject:'Seguimiento — MetoGroup',
    body:`<p>Estimado/a {contacto},</p>
<p>¿Cómo está? Le escribo para darle seguimiento a nuestra conversación anterior sobre los servicios de MetoGroup para <strong>{empresa}</strong>.</p>
<p>¿Tuvo oportunidad de evaluar la información que le compartimos? Estamos a disposición para responder cualquier consulta o coordinar una reunión.</p>
<p>Saludos cordiales,</p>
<p><strong>{vendedor}</strong><br>{email}<br>MetoGroup Latam S.A.</p>`
  },
  propuesta:{
    subject:'Propuesta Comercial — MetoGroup para {empresa}',
    body:`<p>Estimado/a {contacto},</p>
<p>Es un gusto enviarle la propuesta comercial de MetoGroup para <strong>{empresa}</strong>.</p>
<p>Adjunto encontrará los detalles del servicio, alcance, cronograma y condiciones comerciales.</p>
<p>Quedo a su disposición para resolver cualquier duda. ¿Podemos agendar una llamada para revisarla juntos?</p>
<p>Saludos cordiales,</p>
<p><strong>{vendedor}</strong><br>{email}<br>MetoGroup Latam S.A.</p>`
  },
  recordatorio:{
    subject:'Recordatorio — {empresa}',
    body:`<p>Estimado/a {contacto},</p>
<p>Le envío un breve recordatorio sobre nuestra conversación pendiente. Nos encantaría poder avanzar con la propuesta para <strong>{empresa}</strong>.</p>
<p>¿Le resulta conveniente coordinar una llamada breve esta semana?</p>
<p>Saludos,</p>
<p><strong>{vendedor}</strong><br>{email}<br>MetoGroup Latam S.A.</p>`
  },
  libre:{
    subject:'',
    body:`<p></p><p>Saludos cordiales,</p><p><strong>{vendedor}</strong><br>{email}<br>MetoGroup Latam S.A.</p>`
  },
  inicio_auditoria:{
    subject:'MetoGroup — Inicio de proceso · Auditoría BPCE 72001 · {empresa}',
    body:`<div style="font-family:Arial,sans-serif;max-width:620px">

<p>Estimado/a <strong>{contacto}</strong>,</p>

<p>Con la propuesta firmada, damos inicio formal al proceso de <strong>Auditoría de Buenas Prácticas Comerciales y Éticas — BPCE 72001</strong> para <strong>{empresa}</strong>.</p>

<p>En las próximas horas recibirán por separado la confirmación de fechas coordinada con el consultor asignado.</p>

<hr style="border:none;border-top:1px solid #e0e0e0;margin:24px 0">

<p style="font-weight:700;font-size:15px">Próximos pasos</p>

<table style="width:100%;border-collapse:collapse">
  <tr style="background:#f5f5f5">
    <td style="padding:10px 14px;font-weight:700;width:32px">1</td>
    <td style="padding:10px 14px"><strong>Diagnóstico inicial</strong> — Si aún no lo completaron, pueden acceder al diagnóstico BPC desde el portal que les enviamos.</td>
  </tr>
  <tr>
    <td style="padding:10px 14px;font-weight:700;background:#1a1a1a;color:#d4af37">2</td>
    <td style="padding:10px 14px"><strong>Accesos digitales</strong> — Adjuntamos las instrucciones para compartir el acceso a sus plataformas digitales (sitio web, Instagram, Facebook, TikTok) sin necesidad de entregar contraseñas. Esto nos permite completar la auditoría de presencia digital.</td>
  </tr>
  <tr style="background:#f5f5f5">
    <td style="padding:10px 14px;font-weight:700">3</td>
    <td style="padding:10px 14px"><strong>Exámenes del equipo</strong> — Les enviaremos por separado los códigos de acceso para que los integrantes del equipo comercial y la dirección completen las evaluaciones correspondientes.</td>
  </tr>
  <tr>
    <td style="padding:10px 14px;font-weight:700;background:#1a1a1a;color:#d4af37">4</td>
    <td style="padding:10px 14px"><strong>Documentación</strong> — Próximamente recibirán el listado de documentación a preparar para la fase de relevamiento documental.</td>
  </tr>
</table>

<hr style="border:none;border-top:1px solid #e0e0e0;margin:24px 0">

<div style="background:#f9f6ee;border-left:4px solid #d4af37;padding:14px 18px;border-radius:0 8px 8px 0">
  <p style="margin:0;font-size:13px;color:#555"><strong>Documento adjunto:</strong> Instructivo de accesos digitales — indica paso a paso cómo compartir el acceso de analista a cada plataforma. Es sencillo y no requiere compartir contraseñas.</p>
</div>

<p style="margin-top:24px">Ante cualquier consulta, estamos a disposición.</p>

<p>Saludos cordiales,</p>
<p><strong>{vendedor}</strong><br>
{email}<br>
MetoGroup Latam S.A.<br>
<span style="font-size:12px;color:#888">Auditoría BPCE 72001 · Buenas Prácticas Comerciales y Éticas</span></p>

</div>`
  }
};

function emailFillTemplate(tpl,data){
  let s=tpl;
  Object.keys(data).forEach(k=>{s=s.replace(new RegExp('\\{'+k+'\\}','g'),data[k]||'');});
  return s;
}

// Abrir modal de componer email
function emailComponer(toEmail,empData){
  let pwd;try{pwd=emailGetPassword();}catch(e){pwd=null;}
  const userEmail=currentUser?.email||'';
  const nombre=currentUser?.nombre||'';
  
  if(!userEmail||!userEmail.includes('@')){
    toast('⚠️ Tu usuario no tiene email configurado. Pedile al admin que lo agregue en Usuarios.');
    return;
  }
  
  const tplData={
    vendedor:nombre,
    email:userEmail,
    empresa:empData?.empresa||'',
    contacto:empData?.contacto||'Estimado/a'
  };

  const html=`<div class="modal-head"><div class="modal-title">📧 Enviar Email</div><button class="modal-close" onclick="closeModal('modal-email')">✕</button></div>
  <div class="modal-body" style="max-height:80vh;overflow-y:auto">
    ${!pwd?`<div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:10px;padding:14px;margin-bottom:16px">
      <div style="font-size:12px;font-weight:700;color:var(--warn);margin-bottom:8px">🔑 Configurá tu contraseña de email</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:10px">Necesitás ingresar la contraseña de ${userEmail} (la misma que usás en Donweb). Se guarda solo en tu navegador.</div>
      <div style="display:flex;gap:8px"><input type="password" id="email-pwd-input" placeholder="Contraseña de ${userEmail}" style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-size:12px"><button onclick="emailSavePassword(document.getElementById('email-pwd-input').value);closeModal('modal-email');emailComponer('${(toEmail||'').replace(/'/g,"\\'")}',${JSON.stringify(empData).replace(/'/g,"\\'")})" class="btn btn-primary btn-sm">💾 Guardar</button></div>
    </div>`:''}
    <div class="form-group"><label>De</label><input value="${currentUser?.email_nombre||nombre} &lt;${userEmail}&gt;" disabled style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--muted);font-size:12px;width:100%"></div>
    <div class="form-group"><label>Para</label><input id="email-to" value="${toEmail||''}" placeholder="email@empresa.com" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-size:12px;width:100%"></div>
    <div class="form-group"><label>CC <span style="color:var(--muted);font-weight:400">(opcional)</span></label><input id="email-cc" placeholder="otro@email.com" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-size:12px;width:100%"></div>
    <div class="form-group"><label>Plantilla</label>
      <select id="email-tpl" onchange="emailApplyTemplate()" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-size:12px;width:100%">
        <option value="libre">✏️ Email libre</option>
        <option value="presentacion">📋 Presentación de servicios</option>
        <option value="seguimiento">🔄 Seguimiento</option>
        <option value="propuesta">💼 Envío de propuesta</option>
        <option value="recordatorio">🔔 Recordatorio</option>
        <option value="inicio_auditoria">🚀 Inicio de auditoría BPCE 72001</option>
      </select>
    </div>
    <div class="form-group"><label>Asunto</label><input id="email-subject" value="" placeholder="Asunto del email" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-size:13px;width:100%;font-weight:600"></div>
    <div class="form-group"><label>Mensaje</label>
      <div id="email-body" contenteditable="true" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:14px;color:var(--text);font-size:13px;min-height:200px;max-height:400px;overflow-y:auto;line-height:1.6;outline:none" onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'"></div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px">
      <button onclick="closeModal('modal-email')" class="btn btn-secondary">Cancelar</button>
      <button onclick="emailSend()" class="btn btn-primary" ${!pwd?'disabled style="opacity:0.5"':''}>📤 Enviar email</button>
    </div>
  </div>`;
  
  openGenericModal('modal-email',html);
  
  // Guardar datos de plantilla para uso posterior
  window._emailTplData=tplData;
  
  // Aplicar plantilla libre por defecto
  setTimeout(()=>emailApplyTemplate(),100);
}

function emailApplyTemplate(){
  const tplKey=document.getElementById('email-tpl')?.value||'libre';
  const tpl=EMAIL_TEMPLATES[tplKey];
  if(!tpl)return;
  const data=window._emailTplData||{};
  document.getElementById('email-subject').value=emailFillTemplate(tpl.subject,data);
  document.getElementById('email-body').innerHTML=emailFillTemplate(tpl.body,data);
}

async function emailSend(){
  const to=document.getElementById('email-to')?.value?.trim();
  const cc=document.getElementById('email-cc')?.value?.trim();
  const subject=document.getElementById('email-subject')?.value?.trim();
  const bodyHtml=document.getElementById('email-body')?.innerHTML;
  let pwd;try{pwd=emailGetPassword();}catch(e){pwd=null;}
  const fromEmail=currentUser?.email;
  // Usar nombre configurado en firma o nombre del usuario
  const fromName=currentUser?.email_nombre||currentUser?.nombre;

  if(!to){toast('⚠️ Ingresá el destinatario');return;}
  if(!subject){toast('⚠️ Ingresá el asunto');return;}
  if(!pwd){toast('⚠️ Configurá tu contraseña de email primero');return;}
  if(!fromEmail){toast('⚠️ Tu usuario no tiene email configurado');return;}

  // Agregar firma al cuerpo
  const firma = getEmailFirma(currentUser);
  const bodyConFirma = bodyHtml + (firma ? '<br><br>' + firma : '');

  // Mostrar loading
  const btn=document.querySelector('#modal-email .btn-primary');
  const origText=btn?.textContent;
  if(btn){btn.textContent='⏳ Enviando...';btn.disabled=true;}

  try{
    const resp=await fetch('/.netlify/functions/send-email',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        from_email:fromEmail,
        from_password:pwd,
        from_name:fromName,
        to,
        cc:cc||undefined,
        subject,
        html:bodyConFirma,
        text:bodyConFirma.replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ')
      })
    });
    const data=await resp.json();
    if(data.success){
      toast('✅ Email enviado a '+to);
      trackActivity('email:'+to);
      // Guardar en historial si hay empresa
      emailLogToHistory(to,subject);
      closeModal('modal-email');
    } else {
      toast('❌ Error: '+(data.detail||data.error||'Error desconocido').substring(0,80));
      if(btn){btn.textContent=origText;btn.disabled=false;}
    }
  }catch(err){
    toast('❌ Error de conexión: '+err.message.substring(0,60));
    if(btn){btn.textContent=origText;btn.disabled=false;}
  }
}

function emailLogToHistory(toEmail,subject){
  // Buscar empresa por email en base de datos
  const empresas=S.get('crm_bases_datos')||[];
  const match=empresas.find(e=>e.email&&e.email.toLowerCase()===toEmail.toLowerCase());
  if(match){
    if(!match.historial)match.historial=[];
    match.historial.push({
      fecha:todayStr(),
      hora:new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}),
      tipo:'Email',
      resultado:'Email enviado',
      nota:'Asunto: '+subject
    });
    bdGuardar(empresas);
  }
}

// Envío masivo
function emailMasivo(empresaIds){
  const empresas=S.get('crm_bases_datos')||[];
  const selected=empresas.filter(e=>empresaIds.includes(e.id)&&e.email);
  if(!selected.length){toast('⚠️ Ninguna empresa seleccionada tiene email');return;}
  
  let pwd;try{pwd=emailGetPassword();}catch(e){pwd=null;}
  const userEmail=currentUser?.email||'';
  if(!userEmail.includes('@')){toast('⚠️ Tu usuario no tiene email configurado');return;}
  if(!pwd){
    emailComponer('','');// Abre modal para configurar password
    return;
  }

  const tplData={vendedor:currentUser?.nombre||'',email:userEmail,empresa:'',contacto:''};
  window._emailTplData=tplData;
  window._emailMasivoList=selected;

  const html=`<div class="modal-head"><div class="modal-title">📧 Email Masivo — ${selected.length} destinatarios</div><button class="modal-close" onclick="closeModal('modal-email')">✕</button></div>
  <div class="modal-body" style="max-height:80vh;overflow-y:auto">
    <div style="background:rgba(212,175,55,0.06);border:1px solid rgba(212,175,55,0.2);border-radius:10px;padding:12px;margin-bottom:16px">
      <div style="font-size:11px;color:var(--accent);font-weight:700;margin-bottom:6px">Destinatarios (${selected.length})</div>
      <div style="font-size:11px;color:var(--muted);max-height:60px;overflow-y:auto">${selected.map(e=>'<span style="margin-right:8px">'+e.empresa+' ('+e.email+')</span>').join('')}</div>
    </div>
    <div class="form-group"><label>Plantilla</label>
      <select id="email-tpl" onchange="emailApplyTemplate()" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-size:12px;width:100%">
        <option value="presentacion" selected>📋 Presentación de servicios</option>
        <option value="seguimiento">🔄 Seguimiento</option>
        <option value="recordatorio">🔔 Recordatorio</option>
        <option value="libre">✏️ Email libre</option>
      </select>
    </div>
    <div class="form-group"><label>Asunto</label><input id="email-subject" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-size:13px;width:100%;font-weight:600"></div>
    <div class="form-group"><label>Mensaje <span style="color:var(--muted);font-weight:400">({empresa} y {contacto} se reemplazan por cada destinatario)</span></label>
      <div id="email-body" contenteditable="true" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:14px;color:var(--text);font-size:13px;min-height:200px;max-height:400px;overflow-y:auto;line-height:1.6;outline:none"></div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px">
      <button onclick="closeModal('modal-email')" class="btn btn-secondary">Cancelar</button>
      <button onclick="emailSendMasivo()" class="btn btn-primary">📤 Enviar a ${selected.length} empresas</button>
    </div>
  </div>`;
  openGenericModal('modal-email',html);
  setTimeout(()=>emailApplyTemplate(),100);
}

async function emailSendMasivo(){
  const list=window._emailMasivoList||[];
  const subjectTpl=document.getElementById('email-subject')?.value||'';
  const bodyTpl=document.getElementById('email-body')?.innerHTML||'';
  let pwd;try{pwd=emailGetPassword();}catch(e){pwd=null;}
  const fromEmail=currentUser?.email;
  const fromName=currentUser?.nombre;
  if(!pwd||!fromEmail){toast('⚠️ Falta configurar email');return;}

  const btn=document.querySelector('#modal-email .btn-primary');
  let sent=0,errors=0;

  for(const emp of list){
    if(btn)btn.textContent=`⏳ Enviando ${sent+1}/${list.length}...`;
    const data={vendedor:fromName,email:fromEmail,empresa:emp.empresa,contacto:emp.contacto||'Estimado/a'};
    const subject=emailFillTemplate(subjectTpl,data);
    const html=emailFillTemplate(bodyTpl,data);
    try{
      const resp=await fetch('/.netlify/functions/send-email',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({from_email:fromEmail,from_password:pwd,from_name:fromName,to:emp.email,subject,html,text:html.replace(/<[^>]*>/g,'')})
      });
      const r=await resp.json();
      if(r.success){sent++;emailLogToHistory(emp.email,subject);}
      else errors++;
    }catch(e){errors++;}
    // Pequeña pausa para no saturar el SMTP
    await new Promise(r=>setTimeout(r,1500));
  }
  toast(`📧 ${sent} emails enviados${errors?' · '+errors+' errores':''}`);
  trackActivity('email_masivo:'+sent);
  closeModal('modal-email');
}

// ═══ ZOIPER INTEGRATION ═══
// Click-to-call: limpia el número y abre con protocolo tel:/sip:
function zoiperCall(number){
  if(!number)return;
  const clean=number.replace(/[^\d+]/g,'');
  if(!clean){toast('⚠️ Número inválido');return;}
  
  // Registrar la llamada saliente
  trackActivity('call:'+clean);
  _zoiperPendingCall={number:clean,start:Date.now()};
  
  // Abrir con protocolo tel: (Zoiper lo intercepta si está configurado como handler)
  window.open('tel:'+clean,'_self');
  
  // Mostrar mini panel de llamada activa
  zoiperShowCallPanel(clean);
}

// Panel flotante de llamada activa
function zoiperShowCallPanel(number){
  let panel=document.getElementById('zoiper-call-panel');
  if(panel)panel.remove();
  
  // Buscar empresa por teléfono
  const empresas=S.get('crm_bases_datos')||[];
  const match=empresas.find(e=>(e.telefono||'').replace(/[^\d]/g,'').includes(number.replace(/[^\d]/g,'').slice(-8)));
  const empName=match?match.empresa:'Número desconocido';
  
  panel=document.createElement('div');
  panel.id='zoiper-call-panel';
  panel.innerHTML=`
    <div style="position:fixed;bottom:20px;right:20px;z-index:10000;background:linear-gradient(135deg,#064e3b,#065f46);border:1px solid #c8a84a;border-radius:16px;padding:16px 20px;min-width:280px;box-shadow:0 12px 40px rgba(0,0,0,0.4);animation:calPanelIn 0.3s ease-out">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div style="width:36px;height:36px;border-radius:50%;background:#c8a84a;display:flex;align-items:center;justify-content:center;font-size:16px;animation:calPulse 1.5s infinite">📞</div>
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:#fff">${empName}</div>
          <div style="font-size:11px;color:#a7f3d0">${number}</div>
        </div>
        <div id="zoiper-timer" style="margin-left:auto;font-family:'DM Mono',monospace;font-size:18px;font-weight:700;color:#c8a84a">00:00</div>
      </div>
      <div style="display:flex;gap:6px">
        <button onclick="zoiperEndCall(true)" style="flex:1;padding:8px;border-radius:8px;background:#c8a84a;border:none;color:#fff;cursor:pointer;font-size:11px;font-weight:700">✅ Registrar contacto</button>
        <button onclick="zoiperEndCall(false)" style="padding:8px 12px;border-radius:8px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;cursor:pointer;font-size:11px">✕ Cerrar</button>
      </div>
    </div>`;
  document.body.appendChild(panel);
  
  // Timer
  const startTs=Date.now();
  window._zoiperTimer=setInterval(()=>{
    const el=document.getElementById('zoiper-timer');
    if(!el){clearInterval(window._zoiperTimer);return;}
    const secs=Math.floor((Date.now()-startTs)/1000);
    const m=String(Math.floor(secs/60)).padStart(2,'0');
    const s=String(secs%60).padStart(2,'0');
    el.textContent=m+':'+s;
  },1000);
}

function zoiperEndCall(registrar){
  clearInterval(window._zoiperTimer);
  const panel=document.getElementById('zoiper-call-panel');
  const durSecs=_zoiperPendingCall?Math.floor((Date.now()-_zoiperPendingCall.start)/1000):0;
  
  if(panel)panel.remove();
  
  if(registrar && _zoiperPendingCall){
    // Buscar empresa y abrir registro de contacto
    const empresas=S.get('crm_bases_datos')||[];
    const clean=_zoiperPendingCall.number.replace(/[^\d]/g,'');
    const match=empresas.find(e=>(e.telefono||'').replace(/[^\d]/g,'').includes(clean.slice(-8)));
    if(match){
      bdRegistrarContacto(match.id, durSecs);
    } else {
      toast('📞 Llamada de '+Math.floor(durSecs/60)+'m '+durSecs%60+'s — empresa no encontrada en la base');
    }
  }
  _zoiperPendingCall=null;
}

let _zoiperPendingCall=null;

// Listener para log automático desde Zoiper Event Rules
// Zoiper puede configurarse para abrir: https://tudominio.netlify.app/?zoiper_log=1&number={phone}&duration={duration}
(function(){
  const params=new URLSearchParams(window.location.search);
  if(params.get('zoiper_log')==='1'){
    const number=params.get('number')||'';
    const duration=params.get('duration')||'0';
    // Guardar en localStorage para procesar después del login
    const pending=JSON.parse(localStorage.getItem('METO_zoiper_pending')||'[]');
    pending.push({number,duration:parseInt(duration),ts:Date.now()});
    localStorage.setItem('METO_zoiper_pending',JSON.stringify(pending));
    // Limpiar URL
    window.history.replaceState({},'',window.location.pathname);
  }
})();

// Procesar llamadas pendientes de Zoiper después del login
function zoiperProcessPending(){
  const pending=JSON.parse(localStorage.getItem('METO_zoiper_pending')||'[]');
  if(!pending.length)return;
  localStorage.removeItem('METO_zoiper_pending');
  const empresas=S.get('crm_bases_datos')||[];
  let matched=0;
  pending.forEach(p=>{
    const clean=p.number.replace(/[^\d]/g,'');
    const match=empresas.find(e=>(e.telefono||'').replace(/[^\d]/g,'').includes(clean.slice(-8)));
    if(match){
      const hist=match.historial||[];
      hist.push({fecha:todayStr(),hora:new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}),tipo:'Llamada (Zoiper)',notas:'Duración: '+Math.floor(p.duration/60)+'m '+p.duration%60+'s',duracion:p.duration});
      match.historial=hist;
      matched++;
    }
  });
  if(matched>0){
    bdGuardar(empresas);
    toast('📞 '+matched+' llamada(s) de Zoiper registradas automáticamente');
  }
}

// CSS para animaciones del panel de llamada
(function(){
  const st=document.createElement('style');
  st.textContent=`@keyframes calPanelIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@keyframes calPulse{0%,100%{box-shadow:0 0 0 0 rgba(200,168,74,0.4)}50%{box-shadow:0 0 0 10px rgba(200,168,74,0)}}`;
  document.head.appendChild(st);
})();

function showPage(name){
  // Track usage
  trackActivity('nav:'+name);

  // Para páginas del portal cliente: todas usan el div page-content de portal_dashboard
  const portalPages = ['portal_dashboard','portal_diagnostico','portal_resultados','portal_documentos','portal_chat','portal_pac','portal_calendario','portal_certificado'];
  if(portalPages.includes(name)){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.getElementById('page-portal_dashboard')?.classList.add('active');
    document.querySelectorAll('#nav-main .nav-item').forEach(el=>el.classList.toggle('active',el.getAttribute('onclick')?.includes("'"+name+"'")));
    document.getElementById('pageTitle').textContent=getPageTitle(name);
    renderTopbar(name);
    const fn={portal_dashboard:renderPortalDashboard,portal_diagnostico:renderPortalDiagnostico,portal_resultados:renderPortalResultados,portal_documentos:renderPortalDocumentos,portal_chat:renderPortalChat,portal_pac:renderPortalPAC,portal_calendario:renderPortalCalendario,portal_certificado:renderPortalCertificado};
    fn[name]?.();
    return;
  }
  // If leaving admin module context, restore main nav
  const adminPages=['admin','cobros','gastos','auditores','clientes','cotizaciones','impuestos','reparto','ahorro'];
  const dirtecPages=['dirtec','dirtec_impl','dirtec_capacidad','dirtec_rendicion','dirtec_honorarios','dirtec_entregas'];
  if(_inAdminModule && !adminPages.includes(name)){
    _inAdminModule=false;
    document.getElementById('nav-admin').style.display='none';
    document.getElementById('nav-main').style.display='';
  }
  if(_inDirTecModule && !dirtecPages.includes(name)){
    _inDirTecModule=false;
    document.getElementById('nav-dirtec').style.display='none';
    document.getElementById('nav-main').style.display='';
  }
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+name)?.classList.add('active');
  document.querySelectorAll('#nav-main .nav-item').forEach(el=>el.classList.toggle('active',el.getAttribute('onclick')?.includes("'"+name+"'")));
  document.getElementById('pageTitle').textContent=getPageTitle(name);
  renderTopbar(name);
  // Tablas a refrescar por página antes de renderizar
  const _refreshMap = {
    dashboard:   ['clientes','auditorias','cobros','gastos','crm_logs','crm_seguimientos','crm_entrevistas','vendedores','admin_ventas_pendientes','crm_objetivos'],
    clientes:    ['clientes','auditorias','cobros'],
    auditorias:  ['auditorias','clientes','auditores'],
    cobros:      ['cobros','clientes'],
    gastos:      ['gastos'],
    cotizaciones:['cotizaciones','clientes'],
    vendedores:  ['vendedores','crm_logs','crm_objetivos'],
    crm:         ['crm_logs','crm_seguimientos','vendedores','crm_objetivos','crm_bases_datos'],
    entrevistas: ['crm_entrevistas'],
    admin:       ['admin_ventas_pendientes','clientes','auditorias','cobros','gastos'],
    usuarios:    ['usuarios'],
    sueldos:     ['personal_sueldos','liquidaciones_sueldos'],
    impuestos:   ['impuestos'],
    reportes:    ['crm_logs','vendedores','auditorias','cobros'],
    historial:   ['cobros','gastos'],
    inteligencia:['auditorias','clientes','cobros','crm_logs','vendedores'],
  };
  const tablasARefrescar = _refreshMap[name];
  const _renderFn = {dashboard:renderDashboard,examenes:renderExamenes,bpc_score:renderBPCScore,auditorias:renderAuditorias,calendario:renderCalendar,auditores:renderAuditores,clientes:renderClientes,cotizaciones:renderCotizaciones,gastos:renderGastos,cobros:renderCobros,vendedores:renderVendedores,crm:renderCRM,entrevistas:renderEntrevistas,reportes:renderReportes,historial:renderHistorial,usuarios:renderUsuarios,misventas:renderMisVentas,referidos:renderReferidos,agenda:renderAgenda,rankings:renderRankings,basesdatos:renderBasesDatos,correos:renderCorreos,admin:renderAdmin,impuestos:renderImpuestos,reparto:renderReparto,ahorro:renderAhorro,sueldos:renderSueldos,dirtec:renderDirTec,dirtec_impl:renderDirTecImpl,dirtec_capacidad:renderDirTecCapacidad,dirtec_rendicion:renderDirTecRendicion,dirtec_honorarios:renderDirTecHonorarios,dirtec_entregas:renderDirTecEntregas,mi_panel:renderMiPanel,mi_rendicion:renderMiRendicion,mi_calendario:renderMiCalendario,mi_honorarios:renderMiHonorarios,portal_dashboard:renderPortalDashboard,portal_diagnostico:renderPortalDiagnostico,portal_resultados:renderPortalResultados,portal_documentos:renderPortalDocumentos,portal_chat:renderPortalChat,portal_pac:renderPortalPAC,portal_calendario:renderPortalCalendario,portal_certificado:renderPortalCertificado,portal_auditoria:renderPortalAuditoria,inteligencia:renderInteligenciaBPC};
  if(tablasARefrescar){
    // Renderizar con cache actual primero (rápido), luego actualizar con datos frescos
    _renderFn[name]?.();
    sbRefresh(...tablasARefrescar).then(()=>{ _renderFn[name]?.(); });
  } else {
    _renderFn[name]?.();
  }
}

function renderTopbar(name){
  const el=document.getElementById('topbarActions');
  const m={
    auditorias:`<button class="btn btn-primary" onclick="openModal('modal-auditoria','new')">+ Nueva Auditoría</button>`,
    bpc_score:`<button class="btn btn-primary" onclick="bpcEnviarPortal()">+ Enviar Portal BPC</button>`,
    auditores:`<button class="btn btn-primary" onclick="openModal('modal-auditor','new')">+ Nuevo Consultor</button>`,
    admin:``,
    clientes:`<button class="btn btn-primary" onclick="openModal('modal-cliente','new')">+ Nuevo Cliente</button>`,
    cotizaciones:`<button class="btn btn-primary" onclick="openModal('modal-cotizacion','new')">+ Nueva Cotización</button>`,

    gastos:`<button class="btn btn-primary" onclick="openModal('modal-gasto','new')">+ Nuevo Gasto</button>`,
    cobros:`<button class="btn btn-primary" onclick="openModal('modal-cobro','new')">+ Nuevo Cobro</button>`,
    crm: currentUser?.rol==='vendedor'
      ? `<button class="btn btn-primary" onclick="vdRegistrar()">⚡ Registrar actividad</button>`
      : `<div style="display:flex;gap:8px;align-items:center"><select style="padding:7px 12px;font-size:12px;width:200px" onchange="crmVendedorActivo=this.value;renderCRM()" id="crm-vsel"><option value="">Todos los vendedores</option></select><button class="btn btn-secondary" onclick="abrirPremioMes()" style="background:linear-gradient(135deg,rgba(245,158,11,0.15),rgba(251,191,36,0.1));border-color:rgba(245,158,11,0.4);color:#f59e0b">🏅 Premio del mes</button><button class="btn btn-primary" onclick="openLogModal()">+ Registrar Actividad</button></div>`,
    vendedores:`<div style="display:flex;gap:8px;align-items:center"><button class="btn" onclick="abrirPremioMes()" style="background:linear-gradient(135deg,rgba(245,158,11,0.15),rgba(251,191,36,0.1));border:1px solid rgba(245,158,11,0.4);color:#f59e0b;font-weight:700">🏅 Premio del mes</button><button class="btn btn-primary" onclick="openModal('modal-vendedor','new')">+ Nuevo Vendedor</button></div>`,
    usuarios:`<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
      <div style="display:flex;gap:6px;align-items:center;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:5px 8px">
        <span style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;padding:0 4px">Backup</span>
        <button class="btn btn-secondary btn-sm" onclick="exportBackup()" style="gap:5px;display:flex;align-items:center">⬇ Exportar</button>
        <label class="btn btn-secondary btn-sm" style="cursor:pointer;display:flex;align-items:center;gap:5px">⬆ Importar<input type="file" accept=".json" onchange="importBackup(event)" style="display:none"></label>
      </div>
      <div style="display:flex;gap:6px;align-items:center;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:5px 8px">
        <span style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;padding:0 4px">Sync</span>
        <button class="btn btn-secondary btn-sm" onclick="sincVendedoresDesdeUsuarios();renderUsuarios()" style="display:flex;align-items:center;gap:5px">🔄 Vendedores</button>
        <button class="btn btn-secondary btn-sm" onclick="sincConsultoresDesdeUsuarios();renderUsuarios()" style="display:flex;align-items:center;gap:5px">🔄 Consultores</button>
      </div>
      <button class="btn btn-primary" onclick="openModal('modal-usuario','new')" style="display:flex;align-items:center;gap:6px;padding:9px 18px">+ Nuevo Usuario</button>
    </div>`,
    reportes:`<button class="btn btn-secondary" onclick="exportReport()">⬇ Exportar CSV</button>`,
    calendario:`<div style="display:flex;gap:8px;align-items:center"><label style="font-size:11px;color:var(--muted);text-transform:none;letter-spacing:0;margin:0">Filtrar auditor:</label><select style="width:180px;padding:7px 12px;font-size:12px" onchange="calAuditor=this.value;renderCalendar()" id="cal-sel"><option value="">Todos</option></select></div>`,
  };
  // Para páginas del portal cliente — agregar toggle de tema siempre visible
  const portalPagesTopbar = ['portal_dashboard','portal_diagnostico','portal_resultados','portal_documentos','portal_chat','portal_pac','portal_calendario','portal_certificado'];
  if(portalPagesTopbar.includes(name)){
    const temaActual = document.body.classList.contains('theme-light') ? 'light' : 'dark';
    el.innerHTML = `<div style="display:flex;align-items:center;gap:8px">
      <button onclick="userSetTheme('dark')" title="Modo oscuro" style="width:34px;height:34px;border-radius:10px;background:${temaActual==='dark'?'rgba(200,168,74,0.15)':'var(--surface2)'};border:1px solid ${temaActual==='dark'?'rgba(200,168,74,0.4)':'var(--border)'};cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all 0.2s">🌙</button>
      <button onclick="userSetTheme('light')" title="Modo claro" style="width:34px;height:34px;border-radius:10px;background:${temaActual==='light'?'rgba(200,168,74,0.15)':'var(--surface2)'};border:1px solid ${temaActual==='light'?'rgba(200,168,74,0.4)':'var(--border)'};cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all 0.2s">☀️</button>
      <button onclick="_portalLogout()" title="Cerrar sesión" style="height:34px;padding:0 14px;border-radius:10px;background:var(--surface2);border:1px solid var(--border);cursor:pointer;font-size:11px;color:var(--muted);font-family:'DM Mono',monospace;letter-spacing:0.05em;display:flex;align-items:center;gap:6px;transition:all 0.2s" onmouseover="this.style.borderColor='var(--danger)';this.style.color='var(--danger)'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--muted)'">⏻ Salir</button>
    </div>`;
    return;
  }
  el.innerHTML=m[name]||'';
  if(name==='calendario'){const sel=document.getElementById('cal-sel');if(sel){S.get('auditores').forEach(a=>{const o=document.createElement('option');o.value=a.nombre;o.textContent=a.nombre;sel.appendChild(o);});sel.value=calAuditor;}}
}

// HELPERS
function fmt(n){return '$ '+(Number(n)||0).toLocaleString('es-AR',{minimumFractionDigits:0});}
function fmtD(d){if(!d)return'-';const[y,m,dd]=d.split('-');return`${dd}/${m}/${y}`;}
function todayStr(){return new Date().toISOString().split('T')[0];}

// ═══ CONFIG GLOBAL APP (dueño) ═══
function getAppConfig(){try{return JSON.parse(localStorage.getItem('METO_app_config')||'{}')}catch(e){return{}}}
function setAppConfig(cfg){localStorage.setItem('METO_app_config',JSON.stringify({...getAppConfig(),...cfg}))}
function appCfg(key,def=null){const c=getAppConfig();return c[key]!==undefined?c[key]:def;}

// Última actividad CRM de una empresa (en todos los vendedores)
function crmUltimaActividadEmpresa(nombreEmpresa){
  if(!nombreEmpresa)return null;
  const norm=nombreEmpresa.trim().toLowerCase();
  // Buscar en crm_seguimientos
  const segs=S.get('crm_seguimientos').filter(s=>(s.empresa||'').trim().toLowerCase()===norm);
  // Buscar en crm_logs (empresasAgendadas, empresasSeguimiento)
  const logs=S.get('crm_logs').filter(l=>{
    const ea=(l.empresasAgendadas||'').toLowerCase();
    const es=(l.empresasSeguimiento||'').toLowerCase();
    return ea.includes(norm)||es.includes(norm);
  });
  const fechas=[
    ...segs.map(s=>({fecha:s.fecha,vendedor:s.vendedor,tipo:'seguimiento',detalle:s.notas||''})),
    ...logs.map(l=>({fecha:l.fecha,vendedor:l.vendedor,tipo:'log',detalle:`${l.llamadas||0} llam · ${l.duenos||0} dueños`}))
  ].filter(x=>x.fecha).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  return fechas[0]||null;
}
function addDays(d,n){const dt=new Date(d+'T12:00:00');dt.setDate(dt.getDate()+n);return dt.toISOString().split('T')[0];}
function diffDays(d){if(!d)return null;return Math.ceil((new Date(d+'T12:00:00')-new Date())/86400000);}
function dateValClass(d){const diff=diffDays(d);if(diff===null)return'';if(diff<0)return'dv-overdue';if(diff<=7)return'dv-soon';return'dv-ok';}
function badge(est){
  const m={'Activo':'badge-info','Activa':'badge-info','Nuevo':'badge-orange','Documentación Pendiente':'badge-warn','Auditoría Externa':'badge-orange','Auditoría In-Situ':'badge-danger','Preparando Informe':'badge-purple','Informe Entregado':'badge-info','Completada':'badge-success','En Proceso':'badge-warn','Completado':'badge-success','Pausado':'badge-danger','Pendiente':'badge-warn','Enviada':'badge-info','Aprobada':'badge-success','Rechazada':'badge-danger','Facturada':'badge-purple','Inactivo':'badge-danger','Administrador':'badge-danger','Vendedor':'badge-info','Auditor':'badge-purple','Solo Lectura':'badge-warn'};
  return`<span class="badge ${m[est]||'badge-info'}">${est}</span>`;
}

// DASHBOARD
// DASHBOARD PROFIT LOCK & CARD DETAILS
let _dashProfitUnlocked=false;
let _adminBalanceUnlocked=false;

function _showGananciaPin(callback){
  let m=document.getElementById('modal-pin-dash');
  if(!m){m=document.createElement('div');m.className='modal-overlay';m.id='modal-pin-dash';m.innerHTML='<div class="modal" style="width:340px"></div>';document.body.appendChild(m);}
  m.querySelector('.modal').innerHTML=`
    <div class="modal-head"><div class="modal-title">🔒 Acceso Restringido</div><button class="modal-close" onclick="closeModal('modal-pin-dash')">✕</button></div>
    <div class="modal-body" style="text-align:center;padding:30px 20px">
      <div style="font-size:40px;margin-bottom:12px">🔐</div>
      <div style="font-size:14px;font-weight:600;margin-bottom:4px">Ganancia Neta</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:20px">Ingresá el PIN para ver esta información</div>
      <input id="pin-dash-input" type="password" maxlength="4" placeholder="• • • •" style="text-align:center;font-size:24px;letter-spacing:12px;width:160px;padding:12px;border-radius:12px;border:2px solid var(--border);background:var(--surface2);color:var(--text);font-family:'DM Mono',monospace" onkeydown="if(event.key==='Enter')_checkGananciaPin()">
      <div id="pin-dash-error" style="color:var(--danger);font-size:11px;margin-top:8px;min-height:16px"></div>
    </div>
    <div class="modal-footer" style="justify-content:center"><button class="btn btn-primary" onclick="_checkGananciaPin()">Desbloquear</button></div>`;
  window._gananciaCallback=callback;
  m.classList.add('open');
  setTimeout(()=>document.getElementById('pin-dash-input')?.focus(),100);
}

function _checkGananciaPin(){
  const pin=document.getElementById('pin-dash-input')?.value||'';
  if(pin==='6666'){
    _dashProfitUnlocked=true;_adminBalanceUnlocked=true;
    // Remove ALL frost overlays across all dashboards
    ['dash-profit-frost','admin-balance-frost','admin-kpi-frost'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
    closeModal('modal-pin-dash');
    toast('🔓 Panel Financiero desbloqueado');
    if(window._gananciaCallback){window._gananciaCallback();window._gananciaCallback=null;}
  } else {
    document.getElementById('pin-dash-error').textContent='❌ PIN incorrecto';
    document.getElementById('pin-dash-input').value='';
    document.getElementById('pin-dash-input').focus();
  }
}

function _kpiClick(tipo){
  if(!_adminBalanceUnlocked){_showGananciaPin(()=>adminDetalle(tipo));}
  else adminDetalle(tipo);
}

function dashProfitClick(){
  if(!_dashProfitUnlocked) _showGananciaPin(()=>adminDetalle('balance'));
  else adminDetalle('balance');
}
function adminBalanceClick(){
  if(!_adminBalanceUnlocked) _showGananciaPin(()=>adminDetalle('balance'));
  else adminDetalle('balance');
}

function dashDetalle(tipo){
  const MES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const cobros=S.get('cobros'),gastos=S.get('gastos'),auds=S.get('auditorias'),auditores_=S.get('auditores'),clientes_=S.get('clientes'),vendedores_=S.get('vendedores'),logs=S.get('crm_logs');
  const today_=todayStr(),ym=today_.substring(0,7);
  const logsM=logs.filter(l=>l.fecha.startsWith(ym));
  let titulo='',body='';

  const mkTable=(head,rows)=>`<div class="table-wrap"><table><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;

  if(tipo==='auditorias_vendidas'){
    const items=auds.filter(a=>a.tipo==='Auditoría Internacional');
    titulo='🔍 Auditorías Internacionales Vendidas ('+items.length+')';
    body=mkTable(['Cliente','Vendedor','Auditor','Estado','Monto','Fecha'],items.map(a=>`<tr><td style="font-weight:600">${a.clienteNombre||'—'}</td><td>${a.vendedor||'—'}</td><td>${a.auditor||'—'}</td><td>${badge(a.estado)}</td><td style="color:var(--accent3)">${fmt(a.monto)}</td><td style="font-size:12px;color:var(--muted)">${fmtD(a.fInicio)}</td></tr>`).join(''));
  } else if(tipo==='adecuaciones_ia'){
    const items=auds.filter(a=>a.tipo==='Adaptación IA BPCE');
    titulo='🤖 Adecuaciones IA ('+items.length+')';
    body=mkTable(['Cliente','Vendedor','Auditor','Estado','Monto','Fecha'],items.map(a=>`<tr><td style="font-weight:600">${a.clienteNombre||'—'}</td><td>${a.vendedor||'—'}</td><td>${a.auditor||'—'}</td><td>${badge(a.estado)}</td><td style="color:var(--accent3)">${fmt(a.monto)}</td><td style="font-size:12px;color:var(--muted)">${fmtD(a.fInicio)}</td></tr>`).join(''));
  } else if(tipo==='impl_72001'){
    const items=auds.filter(a=>a.tipo==='Implementación ISO 72001');
    titulo='⚙️ Implementaciones ISO 72001 ('+items.length+')';
    body=mkTable(['Cliente','Vendedor','Auditor','Estado','Monto','Fecha'],items.map(a=>`<tr><td style="font-weight:600">${a.clienteNombre||'—'}</td><td>${a.vendedor||'—'}</td><td>${a.auditor||'—'}</td><td>${badge(a.estado)}</td><td style="color:var(--accent3)">${fmt(a.monto)}</td><td style="font-size:12px;color:var(--muted)">${fmtD(a.fInicio)}</td></tr>`).join(''));
  } else if(tipo==='llamadas'){
    const total=logsM.reduce((s,l)=>s+(l.llamadas||0),0);
    titulo='📞 Llamadas del Mes ('+total+')';
    const byVend={};logsM.forEach(l=>{byVend[l.vendedor]=(byVend[l.vendedor]||0)+(l.llamadas||0);});
    body=`<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px">${Object.entries(byVend).sort((a,b)=>b[1]-a[1]).map(([v,n])=>`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 16px;text-align:center"><div style="font-size:12px;font-weight:600">${v}</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--accent)">${n}</div></div>`).join('')}</div>`+mkTable(['Vendedor','Fecha','Llamadas','Dueños','Agendadas','Cierres'],logsM.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(l=>`<tr><td style="font-weight:600">${l.vendedor}</td><td style="font-size:12px;color:var(--muted)">${fmtD(l.fecha)}</td><td style="color:var(--accent);font-weight:700">${l.llamadas||0}</td><td>${l.duenos||0}</td><td>${l.agendadas||0}</td><td style="color:var(--accent3)">${l.cerradas||0}</td></tr>`).join(''));
  } else if(tipo==='duenos'){
    const total=logsM.reduce((s,l)=>s+(l.duenos||0),0);
    titulo='👤 Dueños Contactados ('+total+')';
    const byVend={};logsM.forEach(l=>{byVend[l.vendedor]=(byVend[l.vendedor]||0)+(l.duenos||0);});
    body=`<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px">${Object.entries(byVend).sort((a,b)=>b[1]-a[1]).map(([v,n])=>`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 16px;text-align:center"><div style="font-size:12px;font-weight:600">${v}</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#c8a84a">${n}</div></div>`).join('')}</div>`;
  } else if(tipo==='cierres'){
    // Filtrar cierres de clientes ya dados de baja
    const _cliActSet = new Set((S.get('clientes')||[]).map(c=>c.nombre.toLowerCase()));
    const _logsValidos = logsM.filter(l=>{
      if(!l.cerradas) return false;
      const m2 = (l.notas||'').match(/^Venta:\s*(.+)$/i);
      return !m2 || _cliActSet.has(m2[1].trim().toLowerCase());
    });
    const total=_logsValidos.reduce((s,l)=>s+(l.cerradas||0),0);
    titulo='🏆 Cierres del Mes ('+total+')';
        const byVend=_byVendFilt; // Filtrar logs de clientes que ya no existen en el sistema
    const _clientesActivos = new Set((S.get('clientes')||[]).map(c=>c.nombre.toLowerCase()));
    const _logsCierresValidos = logsM.filter(l=>{
      if(!l.cerradas) return false;
      // Si la nota dice "Venta: X", verificar que X siga siendo cliente activo
      const notaMatch = (l.notas||'').match(/^Venta:\s*(.+)$/i);
      if(notaMatch){
        const empresa = notaMatch[1].trim().toLowerCase();
        return _clientesActivos.has(empresa);
      }
      return true; // logs sin empresa específica se muestran siempre
    });
    const _byVendFilt={};_logsCierresValidos.forEach(l=>{_byVendFilt[l.vendedor]=(_byVendFilt[l.vendedor]||0)+l.cerradas;});
    body=`<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px">${Object.entries(_byVendFilt).sort((a,b)=>b[1]-a[1]).map(([v,n])=>`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 16px;text-align:center"><div style="font-size:12px;font-weight:600">${v}</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--accent3)">${n}</div></div>`).join('')}</div>`+mkTable(['Vendedor','Fecha','Notas'],_logsCierresValidos.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(l=>`<tr><td style="font-weight:600">${l.vendedor}</td><td style="font-size:12px;color:var(--muted)">${fmtD(l.fecha)}</td><td style="font-size:12px">${l.notas||'—'}</td></tr>`).join(''));
  } else if(tipo==='conversion'){
    titulo='📊 Conversión del Equipo';
    const byVend={};logsM.forEach(l=>{const v=byVend[l.vendedor]=byVend[l.vendedor]||{llam:0,cierres:0};v.llam+=(l.llamadas||0);v.cierres+=(l.cerradas||0);});
    body=mkTable(['Vendedor','Llamadas','Cierres','Conversión'],Object.entries(byVend).sort((a,b)=>((b[1].cierres/Math.max(b[1].llam,1)))-(a[1].cierres/Math.max(a[1].llam,1))).map(([v,d])=>{const pct=d.llam?Math.round(d.cierres/d.llam*100):0;return`<tr><td style="font-weight:600">${v}</td><td>${d.llam}</td><td style="color:var(--accent3);font-weight:700">${d.cierres}</td><td><div style="display:flex;align-items:center;gap:8px"><div style="flex:1;height:6px;background:var(--surface2);border-radius:3px;overflow:hidden"><div style="height:100%;width:${Math.min(pct,100)}%;background:${pct>=10?'var(--accent3)':pct>=5?'var(--warn)':'var(--danger)'};border-radius:3px"></div></div><span style="font-weight:700;color:${pct>=10?'var(--accent3)':'var(--warn)'}">${pct}%</span></div></td></tr>`;}).join(''));
  } else if(tipo==='auds_activas'){
    const items=auds.filter(a=>a.estado!=='Completada');
    titulo='🔍 Auditorías Activas ('+items.length+')';
    body=mkTable(['Cliente','Tipo','Auditor','Estado','Inicio'],items.sort((a,b)=>(b.fInicio||'').localeCompare(a.fInicio||'')).map(a=>`<tr><td style="font-weight:600">${a.clienteNombre||'—'}</td><td style="font-size:12px">${a.tipo||'—'}</td><td>${a.auditor||'—'}</td><td>${badge(a.estado)}</td><td style="font-size:12px;color:var(--muted)">${fmtD(a.fInicio)}</td></tr>`).join(''));
  } else if(tipo==='vencen7'){
    titulo='⏰ Fechas que Vencen en 7 Días';
    const prox=[];
    auds.filter(a=>a.estado!=='Completada').forEach(a=>{
      ['fDoc','fExterna','fInsitu','fPrep','fInforme','fSeguimiento'].forEach(f=>{if(a[f]&&diffDays(a[f])>=0&&diffDays(a[f])<=7)prox.push({cliente:a.clienteNombre,tipo:f.replace('f',''),fecha:a[f],dias:diffDays(a[f])});});
    });
    body=prox.length?mkTable(['Cliente','Tipo Fecha','Fecha','Días'],prox.sort((a,b)=>a.dias-b.dias).map(p=>`<tr><td style="font-weight:600">${p.cliente}</td><td style="font-size:12px">${p.tipo}</td><td style="color:${p.dias<=2?'var(--danger)':'var(--warn)'};font-weight:600">${fmtD(p.fecha)}</td><td style="font-weight:700;color:${p.dias===0?'var(--danger)':'var(--warn)'}">${p.dias===0?'¡HOY!':p.dias+' días'}</td></tr>`).join('')):'<div style="text-align:center;padding:24px;color:var(--accent3)">✅ Sin vencimientos próximos</div>';
  } else if(tipo==='clientes'){
    titulo='👥 Clientes Registrados ('+clientes_.length+')';
    body=mkTable(['Empresa','CUIT','Contacto','Email','País'],clientes_.map(c=>`<tr><td style="font-weight:600">${c.nombre}</td><td style="font-size:12px;color:var(--muted)">${c.cuit||'—'}</td><td>${c.contacto||'—'}</td><td style="font-size:12px;color:var(--accent)">${c.email||'—'}</td><td style="font-size:12px">${c.pais||'—'}</td></tr>`).join(''));
  } else if(tipo==='auditores_activos'){
    const activos=auditores_.filter(a=>a.estado!=='Inactivo');
    titulo='🧑‍🔬 Auditores Activos ('+activos.length+')';
    body=mkTable(['Nombre','Especialidad','Email','Auditorías','Honorarios'],activos.map(a=>{const n=auds.filter(x=>x.auditor===a.nombre).length;return`<tr><td style="font-weight:600">${a.nombre}</td><td style="font-size:12px">${a.especialidad||'—'}</td><td style="font-size:12px;color:var(--accent)">${a.email||'—'}</td><td style="font-weight:700;color:var(--accent)">${n}</td><td style="color:var(--accent3)">${fmt(a.honorarios||300)}</td></tr>`;}).join(''));
  }

  if(!body)return;
  let m=document.getElementById('modal-admin-detalle');
  if(!m){m=document.createElement('div');m.className='modal-overlay';m.id='modal-admin-detalle';m.innerHTML='<div class="modal" style="width:900px;max-width:95vw;max-height:90vh;display:flex;flex-direction:column"></div>';document.body.appendChild(m);}
  m.querySelector('.modal').innerHTML=`
    <div class="modal-head"><div class="modal-title">${titulo}</div><button class="modal-close" onclick="closeModal('modal-admin-detalle')">✕</button></div>
    <div class="modal-body" style="overflow-y:auto;flex:1">${body}</div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal('modal-admin-detalle')">Cerrar</button></div>`;
  m.classList.add('open');
}

// ── DASHBOARD ADMINISTRATIVO ─────────────────────────────────────────────────
function _renderDashboardAdmin(){
  const today_ = todayStr();
  const ym = today_.substring(0,7);
  const hr = new Date().getHours();
  const saludo = hr<12?'Buenos días':hr<18?'Buenas tardes':'Buenas noches';
  const MES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mesNom = MES[parseInt(ym.split('-')[1])-1]+' '+ym.split('-')[0];

  // Datos
  const cobros    = S.get('cobros')||[];
  const gastos    = S.get('gastos')||[];
  const clientes  = S.get('clientes')||[];
  const auds      = S.get('auditorias')||[];
  const cotizaciones = S.get('cotizaciones')||[];
  const sueldos   = S.get('personal_sueldos')||[];

  // Financiero
  const cobradoTotal = cobros.filter(c=>c.estado==='Pagado').reduce((s,c)=>s+(Number(c.monto)||0),0);
  const cobradoMes   = cobros.filter(c=>c.estado==='Pagado'&&(c.fecha||'').startsWith(ym)).reduce((s,c)=>s+(Number(c.monto)||0),0);
  const pendienteCobro = cobros.filter(c=>c.estado!=='Pagado').reduce((s,c)=>s+(Number(c.monto)||0),0);
  const vencido      = cobros.filter(c=>c.estado!=='Pagado'&&c.fechaVto&&c.fechaVto<today_).reduce((s,c)=>s+(Number(c.monto)||0),0);
  const gastosMes    = gastos.filter(g=>(g.fecha||'').startsWith(ym)).reduce((s,g)=>s+(Number(g.monto)||0),0);
  const gastosTotal  = gastos.reduce((s,g)=>s+(Number(g.monto)||0),0);

  // Auditorías
  const audsActivas  = auds.filter(a=>!['Completada','Cancelada','Informe Entregado'].includes(a.estado)&&clientes.find(c=>String(c.id)===String(a.clienteId)));
  const audsComp     = auds.filter(a=>a.estado==='Completada'||(a.estado==='Informe Entregado'));
  const audsMes      = auds.filter(a=>(a.fechaInicio||'').startsWith(ym));

  // Cotizaciones pendientes
  const cotsPend     = cotizaciones.filter(c=>c.estado==='Pendiente'||!c.estado);
  const cotsTotal    = cotizaciones.filter(c=>c.estado==='Aceptada').reduce((s,c)=>s+(Number(c.monto)||0),0);

  // Clientes
  const cliActivos   = clientes.filter(c=>c.estado!=='Inactivo');
  const cliConAud    = clientes.filter(c=>auds.find(a=>String(a.clienteId)===String(c.id)&&audsActivas.find(x=>x.id===a.id))).length;

  // Próximos vencimientos de cobros
  const proxVenc     = cobros.filter(c=>c.estado!=='Pagado'&&c.fechaVto&&c.fechaVto>=today_)
    .sort((a,b)=>a.fechaVto.localeCompare(b.fechaVto)).slice(0,5);

  // KPI card helper
  const kpi = (icon,val,label,color='var(--accent)',sub='') =>
    `<div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px 22px">
      <div style="font-size:26px;margin-bottom:10px">${icon}</div>
      <div style="font-family:'Syne',sans-serif;font-size:36px;font-weight:800;color:${color};line-height:1">${val}</div>
      <div style="font-size:14px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:6px">${label}</div>
      ${sub?`<div style="font-size:14px;color:var(--muted);margin-top:4px">${sub}</div>`:''}
    </div>`;

  const fmt = n => '$'+Math.round(n).toLocaleString('es-AR');

  // Render en page-content si existe, sino en d-bienvenida area
  const mainEl = document.getElementById('page-content') || document.getElementById('d-bienvenida')?.closest('.main-content');

  // Use existing dashboard structure
  const bienvenidaEl = document.getElementById('d-bienvenida');
  const dashContentEl = document.getElementById('dashboard-main-content') || document.getElementById('d-entrevistas-pendientes')?.closest('.dashboard-grid');

  // Set welcome
  if(bienvenidaEl){
    bienvenidaEl.innerHTML = `
    <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid rgba(212,175,55,0.08)">
      <div>
        <div style="font-size:12px;color:rgba(212,175,55,0.5);text-transform:uppercase;letter-spacing:3px;margin-bottom:6px;font-family:'DM Mono',monospace">${new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
        <div style="font-family:'Syne',sans-serif;font-size:34px;font-weight:800;letter-spacing:-0.5px">${saludo}, ${currentUser?.nombre?.split(' ')[0]||''}.</div>
      </div>
    </div>`;
  }

  // Alertas de clientes nuevos (auditorías creadas esta semana)
  const semanaAtras = new Date(); semanaAtras.setDate(semanaAtras.getDate()-7);
  const semStr = semanaAtras.toISOString().split('T')[0];
  const cliNuevos = auds.filter(a=>(a.fechaInicio||'')>=semStr && a.estado==='Nuevo');

  // Build the admin dashboard HTML
  const html = `

  <!-- 1. ALERTAS NUEVOS CLIENTES (si las hay) -->
  ${cliNuevos.length ? `
  <div style="background:rgba(200,168,74,0.08);border:2px solid rgba(200,168,74,0.4);border-radius:14px;padding:20px 22px;margin-bottom:20px;cursor:pointer" onclick="showPage('auditorias')">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
      <div style="width:10px;height:10px;border-radius:50%;background:var(--accent);animation:orbPulse 2s ease-in-out infinite"></div>
      <div style="font-size:17px;font-weight:800;color:var(--accent)">🎉 ${cliNuevos.length} cliente${cliNuevos.length>1?'s nuevos esta semana':' nuevo esta semana'}</div>
      <span style="margin-left:auto;font-size:14px;color:var(--muted)">Ver auditorías →</span>
    </div>
    ${cliNuevos.map(a=>`
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(200,168,74,0.15)">
      <div style="width:36px;height:36px;border-radius:10px;background:rgba(200,168,74,0.12);display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0">🏢</div>
      <div style="flex:1">
        <div style="font-size:17px;font-weight:700">${a.clienteNombre||'—'}</div>
        <div style="font-size:13px;color:var(--muted)">Auditoría iniciada ${fmtD(a.fechaInicio)} · ${a.vendedor?'Vendedor: '+a.vendedor:''}</div>
      </div>
      <span style="font-size:13px;background:rgba(200,168,74,0.15);color:var(--accent);padding:3px 10px;border-radius:10px;font-weight:600">Nuevo</span>
    </div>`).join('')}
  </div>` : ''}

  <!-- 2. HERNÁN QUIROZ — ACCIONES PENDIENTES -->
  <div id="admin-dash-agente" style="background:var(--surface);border:1px solid rgba(200,168,74,0.25);border-radius:14px;padding:20px 22px;margin-bottom:20px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#c8a84a,#8a6e2a);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">✦</div>
        <div>
          <div style="font-size:18px;font-weight:800">Hernán Quiroz</div>
          <div style="font-size:13px;color:var(--muted);margin-top:2px">Acciones preparadas esperando aprobación</div>
        </div>
      </div>
      <button onclick="renderPanelAgenteLog()" style="background:var(--accent);border:none;color:#000;padding:8px 18px;border-radius:8px;cursor:pointer;font-size:15px;font-weight:700">Ver todas →</button>
    </div>
    <div id="admin-dash-agente-lista">Cargando...</div>
  </div>

  <!-- 3. KPIs FINANCIEROS -->
  <div style="margin-bottom:20px">
    <div style="font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:2px;margin-bottom:14px;font-family:'DM Mono',monospace">── Financiero — ${mesNom}</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
      ${kpi('💰',fmt(cobradoMes),'Cobrado este mes','var(--accent)',`<span style="cursor:pointer" onclick="showPage('cobros')">Total: ${fmt(cobradoTotal)} →</span>`)}
      ${kpi('⏳',fmt(pendienteCobro),'Por cobrar',pendienteCobro>0?'#f59e0b':'var(--ok)',vencido>0?`<span style="color:var(--danger);cursor:pointer" onclick="showPage('cobros')">Vencido: ${fmt(vencido)} →</span>`:'')}
      ${kpi('💸',fmt(gastosMes),'Gastos este mes','#ef4444',`<span style="cursor:pointer" onclick="showPage('gastos')">Total: ${fmt(gastosTotal)} →</span>`)}
      ${kpi('📄',cotsPend.length,'Cotizaciones pend.','#a78bfa',`<span style="cursor:pointer" onclick="showPage('cotizaciones')">Ver cotizaciones →</span>`)}
    </div>
  </div>

  <!-- 4. AUDITORÍAS + CLIENTES clickeables -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px 22px;cursor:pointer" onclick="showPage('auditorias')" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
      <div style="font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:2px;margin-bottom:16px;font-family:'DM Mono',monospace">── Auditorías <span style="float:right;font-size:12px;color:var(--accent)">Ver →</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div><div style="font-family:'Syne',sans-serif;font-size:36px;font-weight:800;color:var(--accent)">${audsActivas.length}</div><div style="font-size:14px;color:var(--muted);margin-top:4px">Activas</div></div>
        <div><div style="font-family:'Syne',sans-serif;font-size:36px;font-weight:800;color:var(--ok)">${audsComp.length}</div><div style="font-size:14px;color:var(--muted);margin-top:4px">Completadas</div></div>
        <div><div style="font-family:'Syne',sans-serif;font-size:36px;font-weight:800;color:#60a5fa">${audsMes.length}</div><div style="font-size:14px;color:var(--muted);margin-top:4px">Nuevas este mes</div></div>
        <div><div style="font-family:'Syne',sans-serif;font-size:36px;font-weight:800;color:var(--text)">${auds.length}</div><div style="font-size:14px;color:var(--muted);margin-top:4px">Total histórico</div></div>
      </div>
    </div>

    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px 22px;cursor:pointer" onclick="showPage('clientes')" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
      <div style="font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:2px;margin-bottom:16px;font-family:'DM Mono',monospace">── Clientes <span style="float:right;font-size:12px;color:var(--accent)">Ver →</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div><div style="font-family:'Syne',sans-serif;font-size:36px;font-weight:800;color:var(--accent)">${cliActivos.length}</div><div style="font-size:14px;color:var(--muted);margin-top:4px">Activos</div></div>
        <div><div style="font-family:'Syne',sans-serif;font-size:36px;font-weight:800;color:#60a5fa">${cliConAud}</div><div style="font-size:14px;color:var(--muted);margin-top:4px">Con auditoría activa</div></div>
        <div onclick="event.stopPropagation();showPage('cotizaciones')" style="cursor:pointer"><div style="font-family:'Syne',sans-serif;font-size:36px;font-weight:800;color:#a78bfa">${cotsPend.length}</div><div style="font-size:14px;color:var(--muted);margin-top:4px">Cotizaciones pend.</div></div>
        <div onclick="event.stopPropagation();showPage('sueldos')" style="cursor:pointer"><div style="font-family:'Syne',sans-serif;font-size:36px;font-weight:800;color:#f59e0b">${sueldos.length}</div><div style="font-size:14px;color:var(--muted);margin-top:4px">Empleados</div></div>
      </div>
    </div>
  </div>

  <!-- 5. PRÓXIMOS VENCIMIENTOS clickeables -->
  ${proxVenc.length ? `
  <div style="background:var(--surface);border:1px solid ${vencido>0?'rgba(239,68,68,0.3)':'var(--border)'};border-radius:14px;padding:20px 22px;margin-bottom:20px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;cursor:pointer" onclick="showPage('cobros')">
      <div style="font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:2px;font-family:'DM Mono',monospace">── Próximos vencimientos</div>
      <span style="font-size:14px;color:var(--accent)">Ver facturación →</span>
    </div>
    ${proxVenc.map(c=>{
      const dias = Math.ceil((new Date(c.fechaVto)-new Date(today_))/(86400000));
      const urgente = dias <= 3;
      return `<div style="display:flex;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="showPage('cobros')">
        <div style="width:38px;height:38px;border-radius:8px;background:${urgente?'rgba(239,68,68,0.12)':'rgba(200,168,74,0.08)'};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${urgente?'⚠️':'📅'}</div>
        <div style="flex:1">
          <div style="font-size:17px;font-weight:600">${c.cliente||c.clienteNombre||'—'}</div>
          <div style="font-size:14px;color:var(--muted)">Vence ${fmtD(c.fechaVto)} · <span style="color:${urgente?'var(--danger)':'var(--warn)'}">en ${dias}d</span></div>
        </div>
        <div style="font-family:'DM Mono',monospace;font-size:20px;font-weight:700;color:var(--accent)">${fmt(c.monto)}</div>
      </div>`;
    }).join('')}
  </div>` : ''}

  <!-- 6. ACCESOS RÁPIDOS -->
  <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px 22px">
    <div style="font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:2px;margin-bottom:16px;font-family:'DM Mono',monospace">── Acceso rápido</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
      ${[
        ['💰','Facturación','cobros'],
        ['📋','Clientes','clientes'],
        ['📄','Cotizaciones','cotizaciones'],
        ['🔍','Auditorías','auditorias'],
        ['💸','Pagos','gastos'],
        ['👥','Sueldos','sueldos'],
      ].map(([ic,lb,pg])=>`<button onclick="showPage('${pg}')" style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:14px 10px;cursor:pointer;text-align:center;transition:all 0.15s" onmouseover="this.style.borderColor='var(--accent)';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='var(--border)';this.style.transform=''">
        <div style="font-size:29px;margin-bottom:8px">${ic}</div>
        <div style="font-size:16px;color:var(--text);font-weight:600">${lb}</div>
      </button>`).join('')}
    </div>
  </div>`;

  // Inject into dashboard sections
  const entEl = document.getElementById('d-entrevistas-pendientes');
  if(entEl) entEl.innerHTML = '';

  // Ocultar secciones del dashboard del dueño que no aplican al admin
  ['d-ops','d-comercial','d-financiero','d-consultor','d-rankings',
   'd-comercial-section','d-financiero-section',
   'd-metricas-cierre','d-ranking-mini','d-entrevistas-pendientes'
  ].forEach(id=>{
    const el = document.getElementById(id);
    if(el){ el.innerHTML=''; el.style.display='none'; }
  });

  // Inject admin dashboard into a dedicated slot
  let adminDash = document.getElementById('d-admin-dashboard');
  if(!adminDash){
    adminDash = document.createElement('div');
    adminDash.id = 'd-admin-dashboard';
    const parent = bienvenidaEl?.parentElement;
    if(parent) parent.appendChild(adminDash);
  }
  adminDash.innerHTML = html;

  // Cargar acciones pendientes del agente
  _renderAdminAgenteWidget();
}

async function _renderAdminAgenteWidget(){
  const el = document.getElementById('admin-dash-agente-lista');
  if(!el) return;

  // Cargar desde Supabase o localStorage
  let logs = [];
  try{
    const sb = await sbFetch('agente_log','GET',null,'?estado=eq.pendiente&order=ts.desc&limit=10');
    if(sb && sb.length) logs = sb;
    else {
      const loc = JSON.parse(localStorage.getItem('METO_agente_log_v2')||'[]');
      logs = loc.filter(x => x.estado==='pendiente' || (!x.estado && !x.revisado));
    }
  }catch(e){
    const loc = JSON.parse(localStorage.getItem('METO_agente_log_v2')||'[]');
    logs = loc.filter(x => x.estado==='pendiente' || (!x.estado && !x.revisado));
  }

  // Actualizar badge del menú también
  const badge = document.getElementById('agente-log-badge');
  if(badge){ badge.textContent = logs.length||''; badge.style.display = logs.length>0?'inline-flex':'none'; }

  if(!logs.length){
    el.innerHTML = `<div style="text-align:center;padding:20px;color:var(--muted);font-size:13px">
      <span style="font-size:24px;display:block;margin-bottom:8px">✓</span>
      Sin acciones pendientes — todo al día
    </div>`;
    // Hide the section border if no pending
    const section = document.getElementById('admin-dash-agente');
    if(section) section.style.borderColor = 'var(--border)';
    return;
  }

  el.innerHTML = logs.slice(0,4).map(log => {
    let _pl = null;
    try{ _pl = log._payload ? JSON.parse(log._payload) : null; }catch(e){}
    const esPerfil = log.tipo === 'decision';
    return `<div style="display:flex;align-items:flex-start;gap:12px;padding:11px 0;border-bottom:1px solid var(--border)">
      <div style="width:8px;height:8px;border-radius:50%;background:${esPerfil?'#a78bfa':'#ef4444'};flex-shrink:0;margin-top:5px;box-shadow:0 0 6px ${esPerfil?'rgba(167,139,250,0.5)':'rgba(239,68,68,0.5)'}"></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${log.accion}</div>
        <div style="font-size:11px;color:var(--muted)">Cliente: <strong style="color:var(--text)">${log.clienteNombre||'—'}</strong> · ${log.fecha} ${log.hora}</div>
        ${log.detalle?`<div style="font-size:11px;color:var(--muted);margin-top:2px">${log.detalle.substring(0,80)}${log.detalle.length>80?'…':''}</div>`:''}
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        ${esPerfil
          ? `<button onclick="abrirFichaPerfil(${log.id})" style="background:rgba(167,139,250,0.15);border:1px solid rgba(167,139,250,0.4);color:#a78bfa;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700">📋 Ver perfil</button>`
          : `<button onclick="agenteVerPreview(${log.id})" style="background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:5px 10px;border-radius:6px;cursor:pointer;font-size:11px">👁</button>
             <button onclick="agenteEjecutarAccion(${log.id}).then(()=>_renderAdminAgenteWidget())" style="background:var(--accent);border:none;color:#000;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700">✓</button>`
        }
      </div>
    </div>`;
  }).join('') + (logs.length > 4 ? `<div style="text-align:center;padding:10px;font-size:12px;color:var(--muted)">${logs.length - 4} más → <button onclick="renderPanelAgenteLog()" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:12px">Ver todas</button></div>` : '');
}


// ══════════════════════════════════════════════════════════════════════════════
// FUERZA DE VENTAS — RESUMEN DEL DÍA ANTERIOR
// Se muestra en el dashboard del dueño con info completa vendedor por vendedor

// ── mg-dashboard.js ──

// ══════════════════════════════════════════════════════════════════════════════
function _renderFuerzaVentasAyer(){
  const el = document.getElementById('d-fuerza-ventas-ayer');
  if(!el) return;

  const hoy     = todayStr();
  const ayer    = (() => { const d = new Date(hoy+'T12:00:00'); d.setDate(d.getDate()-1); return d.toISOString().split('T')[0]; })();
  const ym      = hoy.substring(0,7);

  const vendedores  = (S.get('vendedores')||[]).filter(v=>v.estado!=='Inactivo');
  const logs        = S.get('crm_logs')||[];
  const objetivos   = S.get('crm_objetivos')||[];
  const seguimientos= (S.get('crm_seguimientos')||[]);
  const entrevistas = (S.get('crm_entrevistas')||[]);

  // Fecha a mostrar
  const fechaDisplay = new Date(ayer+'T12:00:00').toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'});
  const esHoy = false; // siempre ayer

  // Datos del mes hasta ayer
  const logsAyer = logs.filter(l=>l.fecha===ayer);
  const logsMes  = logs.filter(l=>l.fecha.startsWith(ym)&&l.fecha<=ayer);

  // Si no hay logs de ayer — mostrar mensaje
  if(!logsAyer.length){
    el.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px 22px;margin-bottom:4px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:0">
        <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:2px;font-family:'DM Mono',monospace">── Fuerza de ventas · ${fechaDisplay}</div>
        <span style="margin-left:auto;font-size:11px;color:var(--muted);font-style:italic">Sin actividad registrada</span>
      </div>
    </div>`;
    return;
  }

  // Totales del día
  const totLL = logsAyer.reduce((s,l)=>s+(l.llamadas||0),0);
  const totDU = logsAyer.reduce((s,l)=>s+(l.duenos||0),0);
  const totAG = logsAyer.reduce((s,l)=>s+(l.agendadas||0),0);
  const totCI = logsAyer.reduce((s,l)=>s+(l.cerradas||0),0);

  // Por vendedor
  const porVendedor = vendedores.map(v => {
    const logsDia  = logsAyer.filter(l=>l.vendedor===v.nombre);
    const logsMesV = logsMes.filter(l=>l.vendedor===v.nombre);
    const obj      = objetivos.find(o=>o.ym===ym&&String(o.vendedorId)===String(v.id));

    const ll = logsDia.reduce((s,l)=>s+(l.llamadas||0),0);
    const du = logsDia.reduce((s,l)=>s+(l.duenos||0),0);
    const ag = logsDia.reduce((s,l)=>s+(l.agendadas||0),0);
    const ci = logsDia.reduce((s,l)=>s+(l.cerradas||0),0);
    const notas = logsDia.map(l=>l.notas).filter(Boolean).join(' · ');

    // Acumulado del mes
    const llMes = logsMesV.reduce((s,l)=>s+(l.llamadas||0),0);
    const ciMes = logsMesV.reduce((s,l)=>s+(l.cerradas||0),0);
    const objCierres = obj?.cerradas || 0;
    const pctObj = objCierres > 0 ? Math.min(Math.round(ciMes/objCierres*100),100) : null;

    // Seguimientos del día
    const segsDia = seguimientos.filter(s=>s.vendedor===v.nombre&&s.fecha===ayer);
    const segsHechos = segsDia.filter(s=>s.hecho).length;

    // Entrevistas realizadas ayer
    const entsDia = entrevistas.filter(e=>e.vendedor===v.nombre&&e.fechaAgendada===ayer);

    // Empresas agendadas ayer
    const empresasAgendadas = logsDia.flatMap(l=>(l.empresasAgendadas||'').split('\n').map(e=>e.trim()).filter(Boolean));

    const activo = ll>0||du>0||ag>0||ci>0;

    return { v, ll, du, ag, ci, notas, llMes, ciMes, objCierres, pctObj, segsDia, segsHechos, entsDia, empresasAgendadas, activo };
  }).sort((a,b)=>{
    // Primero activos, luego por cierres desc
    if(a.activo && !b.activo) return -1;
    if(!a.activo && b.activo) return 1;
    return b.ci - a.ci;
  });

  const activos = porVendedor.filter(x=>x.activo);
  const inactivos = porVendedor.filter(x=>!x.activo);

  // Colores por nivel de actividad
  const nivelCol = (ll) => ll >= 30 ? '#4ade80' : ll >= 15 ? '#c8a84a' : ll >= 5 ? '#f59e0b' : '#ef4444';
  const nivelLbl = (ll) => ll >= 30 ? 'Excelente' : ll >= 15 ? 'Bueno' : ll >= 5 ? 'Regular' : 'Bajo';

  const statBox = (val, lbl, color='var(--accent)') =>
    `<div style="text-align:center;padding:10px 8px;background:var(--surface2);border-radius:8px;flex:1">
      <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:${color};line-height:1">${val}</div>
      <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-top:4px">${lbl}</div>
    </div>`;

  const renderVendedor = (x) => {
    const col = nivelCol(x.ll);
    return `
    <div style="background:var(--surface2);border:1px solid ${x.activo?'var(--border)':'rgba(239,68,68,0.15)'};border-radius:10px;padding:16px 18px;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:${x.activo?'12':'0'}px">
        <!-- Avatar -->
        <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--accent2),var(--accent));display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0">
          ${x.v.nombre.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase()}
        </div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700">${x.v.nombre}</div>
          ${x.activo
            ? `<div style="font-size:10px;color:var(--muted);margin-top:1px">${x.llMes} llamadas acumuladas · ${x.ciMes} cierres${x.objCierres?` · objetivo: ${x.objCierres}`:''}</div>`
            : `<div style="font-size:11px;color:rgba(239,68,68,0.7);margin-top:1px;font-style:italic">Sin actividad registrada el ${fechaDisplay}</div>`
          }
        </div>
        ${x.activo
          ? `<div style="font-size:10px;background:${col}22;color:${col};padding:3px 10px;border-radius:10px;font-weight:700;border:1px solid ${col}44">${nivelLbl(x.ll)}</div>`
          : `<div style="font-size:10px;background:rgba(239,68,68,0.08);color:#ef4444;padding:3px 10px;border-radius:10px;font-weight:700">Ausente</div>`
        }
      </div>

      ${x.activo ? `
      <!-- Stats del día -->
      <div style="display:flex;gap:8px;margin-bottom:${x.notas||x.empresasAgendadas.length?'10':'0'}px">
        ${statBox(x.ll,'Llamadas','var(--accent)')}
        ${statBox(x.du,'Dueños','#c8a84a')}
        ${statBox(x.ag,'Agendadas','#60a5fa')}
        ${statBox(x.ci,'Cierres','#4ade80')}
        ${x.segsDia.length ? statBox(x.segsHechos+'/'+x.segsDia.length,'Seguim.',x.segsHechos===x.segsDia.length?'#4ade80':'#f59e0b') : ''}
      </div>

      <!-- Empresas agendadas -->
      ${x.empresasAgendadas.length ? `
      <div style="margin-bottom:8px">
        <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px">Empresas agendadas</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">
          ${x.empresasAgendadas.map(e=>`<span style="font-size:11px;background:rgba(96,165,250,0.1);border:1px solid rgba(96,165,250,0.25);color:#60a5fa;padding:2px 9px;border-radius:10px">${e}</span>`).join('')}
        </div>
      </div>` : ''}

      <!-- Entrevistas -->
      ${x.entsDia.length ? `
      <div style="margin-bottom:8px">
        <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px">Entrevistas agendadas para hoy</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">
          ${x.entsDia.map(e=>`<span style="font-size:11px;background:rgba(167,139,250,0.1);border:1px solid rgba(167,139,250,0.25);color:#a78bfa;padding:2px 9px;border-radius:10px">🎤 ${e.empresa}</span>`).join('')}
        </div>
      </div>` : ''}

      <!-- Notas del día -->
      ${x.notas ? `
      <div style="font-size:11px;color:var(--muted);font-style:italic;background:rgba(255,255,255,0.03);border-radius:6px;padding:8px 10px;border-left:2px solid rgba(212,175,55,0.2)">
        "${x.notas}"
      </div>` : ''}

      <!-- Barra de objetivo del mes -->
      ${x.pctObj !== null ? `
      <div style="margin-top:10px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Objetivo del mes</div>
          <div style="font-size:10px;color:${x.pctObj>=80?'#4ade80':x.pctObj>=50?'#c8a84a':'#f59e0b'};font-weight:700">${x.ciMes}/${x.objCierres} cierres · ${x.pctObj}%</div>
        </div>
        <div style="height:4px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden">
          <div style="width:${x.pctObj}%;height:100%;background:${x.pctObj>=80?'#4ade80':x.pctObj>=50?'#c8a84a':'#f59e0b'};border-radius:2px;transition:width 0.5s"></div>
        </div>
      </div>` : ''}
      ` : ''}
    </div>`;
  };

  el.innerHTML = `
  <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px 22px">

    <!-- Header -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;flex-wrap:wrap">
      <div style="flex:1">
        <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:2px;font-family:'DM Mono',monospace">── Fuerza de ventas</div>
        <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:800;margin-top:3px;text-transform:capitalize">${fechaDisplay}</div>
      </div>
      <div style="display:flex;gap:16px;align-items:center">
        <div style="text-align:center">
          <div style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:var(--accent)">${totLL}</div>
          <div style="font-size:9px;color:var(--muted);text-transform:uppercase">Llamadas</div>
        </div>
        <div style="width:1px;height:32px;background:var(--border)"></div>
        <div style="text-align:center">
          <div style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:#c8a84a">${totDU}</div>
          <div style="font-size:9px;color:var(--muted);text-transform:uppercase">Dueños</div>
        </div>
        <div style="width:1px;height:32px;background:var(--border)"></div>
        <div style="text-align:center">
          <div style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:#60a5fa">${totAG}</div>
          <div style="font-size:9px;color:var(--muted);text-transform:uppercase">Agendadas</div>
        </div>
        <div style="width:1px;height:32px;background:var(--border)"></div>
        <div style="text-align:center">
          <div style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:#4ade80">${totCI}</div>
          <div style="font-size:9px;color:var(--muted);text-transform:uppercase">Cierres</div>
        </div>
      </div>
    </div>

    <div style="height:1px;background:var(--border);margin-bottom:16px"></div>

    <!-- Vendedores activos -->
    ${activos.map(renderVendedor).join('')}

    <!-- Vendedores sin actividad -->
    ${inactivos.length ? `
    <div style="margin-top:${activos.length?'6':'0'}px">
      ${inactivos.map(renderVendedor).join('')}
    </div>` : ''}

  </div>`;
}

function renderDashboard(){
  // No renderizar si el usuario es cliente — usa el portal BPC
  if(typeof currentUser === 'undefined' || !currentUser) return;
  if(getUserRoles(currentUser).includes('cliente')) return;

  // Dashboard administrativo — perfil admin sin rol dueño
  const _roles = getUserRoles(currentUser);
  if(_roles.includes('admin') && !_roles.includes('dueno')){
    _renderDashboardAdmin();
    return;
  }
  const auds=S.get('auditorias'),gastos=S.get('gastos'),clientes=S.get('clientes'),auditores=S.get('auditores'),cobros=S.get('cobros'),vendedores=S.get('vendedores');
  const ym=todayStr().substring(0,7);
  const today_=todayStr();

  // Bienvenida
  const hr=new Date().getHours();
  const saludo=hr<12?'Buenos días':hr<18?'Buenas tardes':'Buenas noches';
  document.getElementById('d-bienvenida').innerHTML=`
    <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid rgba(212,175,55,0.08)">
      <div>
        <div style="font-size:9px;color:rgba(212,175,55,0.5);text-transform:uppercase;letter-spacing:3px;margin-bottom:6px;font-family:'DM Mono',monospace">${new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
        <div style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;letter-spacing:-0.5px">${saludo}, ${currentUser?.nombre?.split(' ')[0]||''}.</div>
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="showPage('admin')" style="padding:8px 16px;border-radius:6px;background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.2);color:var(--accent3);font-size:11px;cursor:pointer;letter-spacing:0.5px;font-weight:600">🏛 Tablero Admin</button>
        <button onclick="showPage('auditorias')" style="padding:8px 16px;border-radius:6px;background:var(--surface2);border:1px solid var(--border);color:var(--muted);font-size:11px;cursor:pointer;letter-spacing:0.5px">Auditorías →</button>
      </div>
    </div>
  `;
  // BPC Tablero Pending Approvals
  const _bpcPend=(S.get('bpc_tablero_approvals')||[]).filter(a=>!a.aprobado);
  const _entPend=(S.get('crm_entrevistas')||[]).filter(e=>!e.estado&&!e.fechaRealizada).length;
  const _entBadge=document.getElementById('entrevistas-badge');
  if(_entBadge){_entBadge.textContent=_entPend||'';_entBadge.style.display=_entPend>0?'inline-flex':'none';}
  // Badge acciones agente pendientes (desde localStorage como caché rápido)
  try{
    const _agLog = JSON.parse(localStorage.getItem('METO_agente_log_v2')||'[]');
    const _agPend = _agLog.filter(x=>!x.revisado).length;
    const _agBadge = document.getElementById('agente-log-badge');
    if(_agBadge) _agBadge.textContent = _agPend > 0 ? _agPend : '';
    if(_agBadge) _agBadge.style.display = _agPend > 0 ? 'inline-flex' : 'none';
  }catch(e){}
  const pendEl=document.getElementById('d-bpc-pending');
  if(pendEl && _bpcPend.length){
    pendEl.innerHTML=`<div style="background:linear-gradient(135deg,rgba(200,168,74,0.08),rgba(6,214,160,0.03));border:1px solid rgba(200,168,74,0.2);border-radius:14px;padding:18px 22px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <div style="font-size:18px">◈</div>
        <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--accent3)">Tableros BPC pendientes de aprobación</div>
        <span style="margin-left:auto;background:rgba(200,168,74,0.15);color:var(--accent3);font-size:10px;font-weight:800;padding:3px 8px;border-radius:6px">${_bpcPend.length}</span>
      </div>
      ${_bpcPend.map(p=>{
        const hrs=Math.round((Date.now()-new Date(p.fechaDiag).getTime())/3600000);
        const urgent=hrs>=48;
        return `<div style="display:flex;align-items:center;gap:14px;padding:12px 0;${_bpcPend.indexOf(p)<_bpcPend.length-1?'border-bottom:1px solid rgba(200,168,74,0.1)':''}">
          <div style="flex:1">
            <div style="font-size:14px;font-weight:600">${p.clienteNombre}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">Score: ${p.score}/100 · Completado hace ${hrs}h${urgent?' <span style=\"color:var(--warn);font-weight:700\">⚠ +48h</span>':''}</div>
          </div>
          <button class="btn btn-sm" onclick="event.stopPropagation();previewBPCApproval('${p.clienteId}')" style="font-size:10px;background:var(--surface);border-color:var(--border)">Ver diagnóstico</button>
          <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();approveBPCTablero('${p.clienteId}')" style="font-size:10px;background:linear-gradient(135deg,rgba(200,168,74,0.2),rgba(6,214,160,0.12));border-color:rgba(200,168,74,0.3);color:var(--accent3)">✓ Aprobar tablero</button>
        </div>`}).join('')}
    </div>`;
  } else if(pendEl){pendEl.innerHTML='';}

  // ── ALERTAS DIAGNÓSTICO COMPLETADO ──
  // Clientes que completaron el diagnóstico pero el mapa aún no lo refleja
  const _diagAlertEl = document.getElementById('d-diag-alerta');
  if(_diagAlertEl){
    const _allAuds = S.get('auditorias')||[];
    const _diagPortals = S.get('portal_diagnostico')||[];
    const _portalClientes = S.get('portal_clientes')||[];

    // Buscar auditorías donde el cliente completó el diag pero diagnostico_ok no está marcado
    const _pendDiag = _allAuds.filter(a => {
      if(a.diagnostico_ok) return false; // ya marcado
      const _dp = _diagPortals.find(d=>String(d.clienteId)===String(a.clienteId));
      const _pc = _portalClientes.find(p=>String(p.clienteId)===String(a.clienteId));
      return (_dp?.completo) || (_pc?.diagnosticoCompleto);
    });

    if(_pendDiag.length){
      _diagAlertEl.innerHTML=`
        <div style="background:linear-gradient(135deg,rgba(6,214,160,0.08),rgba(200,168,74,0.04));border:1px solid rgba(6,214,160,0.3);border-radius:14px;padding:18px 22px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
            <div style="font-size:18px">📋</div>
            <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--accent3)">Diagnósticos completados — pendiente marcar en mapa</div>
            <span style="margin-left:auto;background:rgba(6,214,160,0.15);color:var(--accent3);font-size:10px;font-weight:800;padding:3px 8px;border-radius:6px">${_pendDiag.length}</span>
          </div>
          <div style="font-size:11px;color:var(--muted);margin-bottom:14px">El cliente completó el diagnóstico BPC. Hacé click en "Marcar en mapa" para actualizar el paso.</div>
          ${_pendDiag.map(a=>{
            const _dp2 = _diagPortals.find(d=>String(d.clienteId)===String(a.clienteId));
            const _score2 = _dp2?.score || null;
            const _fecha2 = _dp2?.fechaFin || _dp2?.fechaInicio || '—';
            return `<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid rgba(6,214,160,0.1)">
              <div style="flex:1">
                <div style="font-size:14px;font-weight:600">${a.clienteNombre||'—'}</div>
                <div style="font-size:11px;color:var(--muted);margin-top:2px">
                  ${_score2 !== null ? `Score BPC: <strong style="color:var(--accent)">${_score2}/100</strong> · ` : ''}
                  Completado: ${_fecha2}
                </div>
              </div>
              <button class="btn btn-sm" onclick="auditDetail(${a.id})" style="font-size:11px">Ver mapa</button>
              <button class="btn btn-sm btn-primary" onclick="
                mapaMarcarDiagnostico(${a.id});
                this.textContent='✅ Marcado';
                this.disabled=true;
                this.style.background='rgba(6,214,160,0.15)';
                this.style.borderColor='rgba(6,214,160,0.4)';
                this.style.color='var(--accent3)';
                setTimeout(()=>renderDashboard(),1500);
              " style="font-size:11px">✅ Marcar en mapa</button>
            </div>`;
          }).join('')}
        </div>`;
    } else {
      _diagAlertEl.innerHTML = '';
    }
  }

  // ── FINANCIERO ──
  // Ingresos = cuotas efectivamente cobradas (mismo cálculo que Admin/Reparto)
  let ingresos=0;
  cobros.forEach(c=>{c.cuotas.forEach(q=>{if(q.estado==='Pagada')ingresos+=(q.montoCobrado||q.monto);});});
  const gastosT=gastos.reduce((s,g)=>s+(Number(g.monto)||0),0);
  let pendiente=0;
  cobros.forEach(c=>{c.cuotas.forEach(q=>{if(q.estado==='Pendiente')pendiente+=(Number(q.monto)||0);});});

  // Conteo por tipo de servicio
  const tipoAuditoria=auds.filter(a=>a.tipo==='Auditoría Internacional').length;
  const tipoIA=auds.filter(a=>a.tipo==='Adaptación IA BPCE').length;
  const tipoImpl=auds.filter(a=>a.tipo==='Implementación ISO 72001').length;

  document.getElementById('d-gan').textContent=fmt(ingresos-gastosT);
  document.getElementById('d-ing').textContent=fmt(ingresos);
  document.getElementById('d-gas').textContent=fmt(gastosT);
  document.getElementById('d-pend').textContent=fmt(pendiente);
  // Restore frost state
  const dFrost=document.getElementById('dash-profit-frost');
  if(dFrost)dFrost.style.display=_dashProfitUnlocked?'none':'flex';
  document.getElementById('d-tipo-auditoria').textContent=tipoAuditoria;
  const _el2=document.getElementById('d-tipo-auditoria2');if(_el2)_el2.textContent=tipoAuditoria;
  document.getElementById('d-tipo-ia').textContent=tipoIA;
  document.getElementById('d-tipo-impl').textContent=tipoImpl;

  // ── COMERCIAL ──
  const logs=S.get('crm_logs').filter(l=>l.fecha.substring(0,7)===ym);
  const totalLlamadas=logs.reduce((s,l)=>s+(l.llamadas||0),0);
  const totalDuenos=logs.reduce((s,l)=>s+(l.duenos||0),0);
  const totalCierres=logs.reduce((s,l)=>s+(l.cerradas||0),0);
  const convEquipo=totalLlamadas>0?Math.round(totalCierres/totalLlamadas*100):0;

  document.getElementById('d-llamadas').textContent=totalLlamadas;
  document.getElementById('d-duenos').textContent=totalDuenos;
  document.getElementById('d-cierres').textContent=totalCierres;
  document.getElementById('d-conv').textContent=convEquipo+'%';
  document.getElementById('d-conv').style.color=convEquipo>=20?'var(--accent3)':convEquipo>=10?'var(--warn)':'var(--danger)';

  // Ranking mini (top 3)
  const ranking=vendedores.map(v=>{
    const vLogs=logs.filter(l=>l.vendedor===v.nombre);
    const c=vLogs.reduce((s,l)=>s+(l.cerradas||0),0);
    const ll=vLogs.reduce((s,l)=>s+(l.llamadas||0),0);
    return{nombre:v.nombre,cerradas:c,llamadas:ll};
  }).sort((a,b)=>b.cerradas-a.cerradas).slice(0,5);
  const maxC=Math.max(...ranking.map(r=>r.cerradas),1);
  const medals=['🥇','🥈','🥉'];
  document.getElementById('d-ranking-mini').innerHTML=ranking.length?ranking.map((r,i)=>`
    <div style="display:flex;align-items:center;gap:12px;padding:8px 0;${i<ranking.length-1?'border-bottom:1px solid var(--border)':''}">
      <div style="font-size:18px;width:28px;text-align:center">${medals[i]||'#'+(i+1)}</div>
      <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--accent2),var(--accent));display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0">${r.nombre.substring(0,2).toUpperCase()}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:600">${r.nombre}</div>
        <div style="height:4px;background:var(--surface2);border-radius:2px;margin-top:4px;overflow:hidden"><div style="height:100%;width:${Math.round(r.cerradas/maxC*100)}%;background:linear-gradient(90deg,var(--accent2),var(--accent));border-radius:2px"></div></div>
      </div>
      <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:var(--accent);min-width:30px;text-align:right">${r.cerradas}</div>
      <div style="font-size:10px;color:var(--muted);min-width:40px">cierres</div>
    </div>`).join(''):'<div style="color:var(--muted);font-size:12px;text-align:center;padding:16px">Sin actividad comercial este mes</div>';

  // ── TÉCNICO ──
  const activas=auds.filter(a=>a.estado!=='Completada').length;
  const prox=[];
  auds.forEach(a=>{
    [['📂 Doc',a.fDoc],['🔬 Ext',a.fExterna],['🏢 In-Situ',a.fInsitu],['📝 Prep',a.fPrep],['✅ Informe',a.fInforme]].forEach(([lbl,f])=>{
      if(f){const d=diffDays(f);if(d!==null&&d>=0&&d<=7)prox.push({lbl:`${lbl}: ${a.clienteNombre}`,f,diff:d});}
    });
  });
  document.getElementById('d-auds').textContent=activas;
  document.getElementById('d-venc').textContent=prox.length;
  document.getElementById('d-cli').textContent=clientes.length;
  document.getElementById('d-aud').textContent=auditores.filter(a=>a.estado!=='Inactivo').length;

  const estados=['Nuevo','Documentación Pendiente','Auditoría Externa','Auditoría In-Situ','Preparando Informe','Informe Entregado','Completada'];
  const counts={};estados.forEach(e=>counts[e]=0);auds.forEach(a=>{if(counts[a.estado]!==undefined)counts[a.estado]++;});
  const maxCt=Math.max(...Object.values(counts),1);
  const colors=['var(--accent3)','#34d399','#6ee7b7','#c8a84a','#9a7830','#047857','var(--muted)'];
  document.getElementById('d-pipeline').innerHTML=estados.map((e,i)=>`<div class="bar-row" style="margin-bottom:8px"><div class="bar-label">${e}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(counts[e]/maxCt*100)}%;background:${colors[i]}"></div></div><div class="bar-val">${counts[e]}</div></div>`).join('');

  const pEl=document.getElementById('d-prox');
  pEl.innerHTML=prox.length?prox.sort((a,b)=>a.diff-b.diff).map(f=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><div style="font-size:12px">${f.lbl}</div><div style="font-size:11px;font-weight:700;color:${f.diff===0?'var(--danger)':'var(--warn)'}">${f.diff===0?'¡HOY!':f.diff===1?'Mañana':f.diff+'d'}</div></div>`).join(''):'<div style="color:var(--muted);font-size:12px;text-align:center;padding:20px">Sin vencimientos próximos 🎉</div>';
  renderObjDuenoDashboard();
  renderProyeccionFinanciera();
  _renderFuerzaVentasAyer();

  // ── ENTREVISTAS PENDIENTES (para Leandro, Ariel u otro dueño con entrevistas asignadas) ──
  const entEl=document.getElementById('d-entrevistas-pendientes');
  if(entEl){
    const miNombre=currentUser?.nombre||'';
    const todasEntrevistas=S.get('crm_entrevistas')||[];
    // Entrevistas asignadas a este usuario que no tienen resultado todavía
    const misEntrevistas=todasEntrevistas.filter(e=>e.entrevistador===miNombre&&!e.fechaRealizada);
    // También mostrar si hay entrevistas sin asignar (rol dueño puede verlas todas)
    const sinAsignar=todasEntrevistas.filter(e=>!e.entrevistador&&!e.fechaRealizada);

    if(misEntrevistas.length||sinAsignar.length){
      const today_=todayStr();
      const renderCard=e=>{
        const diasDesde=Math.floor((new Date(today_)-new Date(e.fechaAgendada))/(1000*60*60*24));
        const urgente=diasDesde>3;
        return`<div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid rgba(167,139,250,0.1);cursor:pointer" onclick="abrirResultadoEntrevista(${e.id})">
          <div style="width:36px;height:36px;border-radius:50%;background:${urgente?'rgba(239,68,68,0.15)':'rgba(167,139,250,0.15)'};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${urgente?'⚠️':'🎤'}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:700">${e.empresa}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">Agendada el ${fmtD(e.fechaAgendada)} · por ${e.vendedor}${diasDesde>0?` · <span style="color:${urgente?'var(--danger)':'var(--warn)'}">hace ${diasDesde}d</span>`:' · hoy'}</div>
          </div>
          <button onclick="event.stopPropagation();abrirResultadoEntrevista(${e.id})" style="padding:6px 14px;border:1px solid rgba(167,139,250,0.4);border-radius:20px;background:rgba(167,139,250,0.1);color:#c8a84a;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap">+ Cargar resultado</button>
        </div>`;
      };

      entEl.innerHTML=`<div style="background:linear-gradient(135deg,rgba(167,139,250,0.06),rgba(139,92,246,0.03));border:1px solid rgba(167,139,250,0.2);border-radius:14px;padding:18px 22px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
          <div style="font-size:18px">🎤</div>
          <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:#c8a84a">Entrevistas pendientes de resultado</div>
          <span style="margin-left:auto;background:rgba(167,139,250,0.15);color:#c8a84a;font-size:10px;font-weight:800;padding:3px 8px;border-radius:6px">${misEntrevistas.length+sinAsignar.length}</span>
        </div>
        ${misEntrevistas.length?`
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Asignadas a vos</div>
          ${misEntrevistas.map(renderCard).join('')}`:''}
        ${sinAsignar.length?`
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:${misEntrevistas.length?12:0}px;margin-bottom:6px">Sin entrevistador asignado</div>
          ${sinAsignar.map(e=>`<div style="display:flex;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid rgba(167,139,250,0.08)">
            <div style="width:36px;height:36px;border-radius:50%;background:rgba(107,127,163,0.15);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">❓</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:700">${e.empresa}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:2px">Agendada el ${fmtD(e.fechaAgendada)} · por ${e.vendedor}</div>
            </div>
            <div style="display:flex;gap:6px">
              ${['Leandro','Ariel'].map(n=>`<button onclick="asignarEntrevistador(${e.id},'${n}')" style="padding:5px 10px;border:1px solid rgba(167,139,250,0.3);border-radius:16px;background:transparent;color:#c8a84a;font-size:10px;cursor:pointer">Me la tomo — ${n}</button>`).join('')}
            </div>
          </div>`).join('')}`:''}
      </div>`;
    } else {
      entEl.innerHTML='';
    }
  }

  // ── MÉTRICAS DE CIERRE ──
  const mcEl = document.getElementById('d-metricas-cierre');
  if(mcEl){
    const mc = calcMetricasCierre(ym);
    const renderBarraCierre = (pct, max) => {
      if(pct===null) return '<span style="color:var(--muted);font-size:11px">Sin datos</span>';
      const w = Math.min(Math.round(pct/max*100),100);
      const col = pct>=3?'#c8a84a':pct>=1.5?'var(--accent3)':pct>=0.8?'var(--warn)':'var(--danger)';
      return `<div style="display:flex;align-items:center;gap:8px;flex:1">
        <div style="flex:1;height:6px;background:rgba(255,255,255,0.06);border-radius:99px;overflow:hidden">
          <div style="width:${w}%;height:100%;background:${col};border-radius:99px"></div>
        </div>
        <span style="font-size:12px;font-weight:700;color:${col};min-width:36px">${pct.toFixed(1)}%</span>
      </div>`;
    };
    mcEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <!-- Vendedores telefónicos -->
        <div class="card">
          <div class="vd-sec" style="margin-bottom:14px">📞 Cierre telefónico — ${ym}</div>
          <div style="font-size:10px;color:var(--muted);margin-bottom:10px">Métrica: cierres / llamadas totales · Excelente ≥3% · Bueno ≥1.5%</div>
          ${mc.vendedores.filter(v=>v.llamadas>0).sort((a,b)=>(b.pctCierre||0)-(a.pctCierre||0)).map(v=>`
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
              <div style="width:120px;font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v.nombre.split(' ')[0]}</div>
              ${renderBarraCierre(v.pctCierre, 5)}
              <div style="font-size:10px;background:${nivelBg(v.nivel)};color:${nivelColor(v.nivel)};border-radius:8px;padding:2px 7px;white-space:nowrap">${nivelLabel(v.nivel)}</div>
            </div>`).join('')}
          ${mc.vendedores.filter(v=>v.llamadas===0).length ? `<div style="font-size:11px;color:var(--muted);padding:8px 0">${mc.vendedores.filter(v=>v.llamadas===0).length} vendedor/es sin actividad este mes</div>` : ''}
        </div>
        <!-- Leandro y Ariel — calidad entrevistas -->
        <div class="card">
          <div class="vd-sec" style="margin-bottom:14px">🎤 Calidad de cierre — entrevistas</div>
          <div style="font-size:10px;color:var(--muted);margin-bottom:10px">Métrica: ventas cerradas / entrevistas realizadas · Excelente ≥30% · Bueno ≥15%</div>
          ${mc.entrevistadores.length ? mc.entrevistadores.map(e=>`
            <div style="padding:10px 0;border-bottom:1px solid var(--border)">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
                <div style="font-size:13px;font-weight:700">${e.nombre}</div>
                <div style="font-size:10px;background:${nivelBg(e.nivel)};color:${nivelColor(e.nivel)};border-radius:8px;padding:2px 7px;margin-left:auto">${nivelLabel(e.nivel)}</div>
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                <div style="flex:1;height:6px;background:rgba(255,255,255,0.06);border-radius:99px;overflow:hidden">
                  <div style="width:${e.pctCierre!==null?Math.min(Math.round(e.pctCierre/50*100),100):0}%;height:100%;background:${nivelColor(e.nivel)};border-radius:99px"></div>
                </div>
                <span style="font-size:12px;font-weight:700;color:${nivelColor(e.nivel)};min-width:36px">${e.pctCierre!==null?e.pctCierre.toFixed(0)+'%':'—'}</span>
              </div>
              <div style="display:flex;gap:12px;margin-top:6px">
                <span style="font-size:10px;color:var(--muted)">Total: <b style="color:var(--text)">${e.total}</b></span>
                <span style="font-size:10px;color:var(--muted)">Ventas: <b style="color:#c8a84a">${e.cerradas}</b></span>
                <span style="font-size:10px;color:var(--muted)">Interesados: <b style="color:var(--accent3)">${e.interesadas}</b></span>
              </div>
            </div>`).join('')
          : '<div style="color:var(--muted);font-size:12px;padding:12px 0">Sin entrevistas registradas este mes</div>'}
        </div>
      </div>`;
  }
}

// AUDITORIAS
function renderAuditorias(){
  const items=S.get('auditorias');
  const el=document.getElementById('auditorias-content');
  if(!items.length){el.innerHTML=`<div class="empty-state"><div class="icon">🔍</div><h3>Sin auditorías</h3><p>Creá la primera auditoría</p></div>`;return;}
  el.innerHTML=`<div class="table-wrap">
    <div class="table-header">
      <div class="table-title">Auditorías (${items.length})</div>
      <input placeholder="🔍 Buscar..." style="width:200px;padding:7px 12px;font-size:12px" oninput="filterAuds(this.value)" id="aud-search">
    </div>
    <table><thead><tr><th>Empresa</th><th>Tipo</th><th>Vendedor</th><th>Auditor</th><th>In-Situ</th><th>Informe</th><th>Estado</th><th>Monto</th><th>BPC</th><th></th></tr></thead>
    <tbody id="aud-tbody">${audsRows(items)}</tbody></table></div>`;
}

function audsRows(items){
  return items.map(a=>{
    const d=diffDays(a.fInsitu);
    const ic=d!==null&&d<0?'color:var(--danger)':d!==null&&d<=7?'color:var(--warn)':'';
    return`<tr onclick="auditDetail(${a.id})" style="cursor:pointer">
      <td><div style="font-weight:500">${a.clienteNombre||'-'}</div><div style="font-size:10px;color:var(--muted)">${a.tipo}</div></td>
      <td style="font-size:11px;color:var(--accent)">${a.tipo}</td>
      <td style="font-size:12px">${a.vendedor||'-'}</td>
      <td style="font-size:12px">${a.auditor||'-'}</td>
      <td style="${ic}">${fmtD(a.fInsitu)}</td>
      <td style="color:var(--accent3)">${fmtD(a.fInforme)}</td>
      <td>${badge(a.estado)}</td>
      <td style="color:var(--accent3);font-weight:600">${fmt(a.monto)}</td>
      <td><button class="btn btn-sm" onclick="event.stopPropagation();openBPCAuditTablero(${a.id},'${a.clienteNombre}',${a.clienteId||null})" style="background:rgba(200,168,74,0.1);border-color:rgba(200,168,74,0.2);color:var(--accent3);font-size:10px">⬡</button></td>
      <td style="white-space:nowrap">
        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();editAuditoria(${a.id})">✏️</button>
        <button class="btn btn-sm" onclick="event.stopPropagation();abrirCoordFechas(${a.id})" style="background:rgba(212,175,55,0.12);color:var(--accent);border:1px solid rgba(212,175,55,0.3)" title="Coordinar fechas">📅</button>
        <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();delItem('auditorias',${a.id},renderAuditorias)">🗑</button>
      </td>
    </tr>`;
  }).join('');
}

function filterAuds(q){
  const items=S.get('auditorias').filter(a=>
    [a.clienteNombre,a.tipo,a.auditor,a.vendedor].some(v=>v?.toLowerCase().includes(q.toLowerCase()))
  );
  document.getElementById('aud-tbody').innerHTML=audsRows(items);
}

function auditDetail(audId){
  // Re-fetch frescos desde Supabase para capturar lo que guardó el cliente
  const _refreshAndRender = () => {
    const a = S.get('auditorias').find(x=>x.id===audId);
    if(!a) return;
    _auditDetailRender(audId, a);
  };
  // Refrescar desde Supabase — portal_diagnostico, portal_clientes y auditorias
  Promise.all([
    sbFetch('portal_diagnostico','GET',null,'?select=*'),
    sbFetch('portal_clientes','GET',null,'?select=*'),
    sbFetch('auditorias','GET',null,'?id=eq.'+audId+'&select=*')
  ]).then(([diagRows, pcRows, audRows])=>{
    // portal_diagnostico
    if(Array.isArray(diagRows) && diagRows.length){
      const existing = _sbCache['portal_diagnostico'] || [];
      diagRows.map(r=>sbNormalizeRow('portal_diagnostico',r)).forEach(r=>{ const i=existing.findIndex(x=>x.id===r.id); if(i>-1)existing[i]=r; else existing.push(r); });
      _sbCache['portal_diagnostico'] = existing;
      try{ localStorage.setItem('METO_portal_diagnostico', JSON.stringify(existing)); }catch(e){}
    }
    // portal_clientes
    if(Array.isArray(pcRows) && pcRows.length){
      const existing = _sbCache['portal_clientes'] || [];
      pcRows.map(r=>sbNormalizeRow('portal_clientes',r)).forEach(r=>{ const i=existing.findIndex(x=>x.id===r.id); if(i>-1)existing[i]=r; else existing.push(r); });
      _sbCache['portal_clientes'] = existing;
      try{ localStorage.setItem('METO_portal_clientes', JSON.stringify(existing)); }catch(e){}
    }
    // auditorias
    if(Array.isArray(audRows) && audRows.length){
      const existing = _sbCache['auditorias'] || [];
      const r = sbNormalizeRow('auditorias', audRows[0]);
      const i = existing.findIndex(x=>x.id===r.id);
      if(i>-1) existing[i]=r; else existing.push(r);
      _sbCache['auditorias'] = existing;
      try{ localStorage.setItem('METO_auditorias', JSON.stringify(existing)); }catch(e){}
    }
    _refreshAndRender();
  }).catch(()=> _refreshAndRender());
}

function _auditDetailRender(audId, a){
  if(!a) return;
  const td = todayStr();

  // ── Datos auxiliares ──
  const exResults = JSON.parse(localStorage.getItem('METO_agente_historial')||'[]');
  const examResultados = (() => {
    try { return JSON.parse(localStorage.getItem('bpc_exam_resultados')||'[]'); } catch(e){ return []; }
  })();
  const coordFechas = JSON.parse(localStorage.getItem('METO_coord_fechas')||'[]');
  const coord = coordFechas.find(c=>c.audId===audId);

  // ── Estado de cada paso ──
  // 'done' | 'active' | 'pending' | 'overdue'
  function pasoEstado(fecha, forzado){
    if(forzado==='done') return 'done';
    if(forzado==='active') return 'active';
    if(!fecha) return 'pending';
    if(fecha < td) return 'done';
    if(fecha === td) return 'active';
    if(diffDays(fecha)<=3) return 'overdue';
    return 'pending';
  }

  // Calcular exámenes recibidos para esta auditoría
  const examsDeEstaAud = examResultados.filter(r => r.auditoria_id === audId || r.codigoId?.toString().includes(audId));
  const tieneVendedores = examsDeEstaAud.filter(r=>r.tipo==='auditoria').length > 0;
  const tieneGerente = examsDeEstaAud.filter(r=>r.tipo==='diagnostico_gerente').length > 0;
  const tieneDueno = examsDeEstaAud.filter(r=>r.tipo==='diagnostico_dueno').length > 0;
  const tieneDigital = a.audit_digital_ok;
  const tieneEntrevistas = a.entrevistas_ok;
  // Leer el estado real del diagnóstico portal — si el cliente lo completó
  const portalAcceso = (S.get('portal_clientes')||[]).find(p=>String(p.clienteId)===String(a.clienteId));
  const diagPortal   = (S.get('portal_diagnostico')||[]).find(d=>String(d.clienteId)===String(a.clienteId));
  const tieneDiagnostico = a.diagnostico_ok || (portalAcceso?.diagnosticoCompleto) || (diagPortal?.completo);
  const diagScore = diagPortal?.score || portalAcceso?.score || null;
  const tieneInforme = a.fInforme && a.fInforme <= td;
  const firmadoConsultor = a.informe_firmado;
  const entregado = a.estado === 'Completada';

  // ── Definición de PASOS del mapa ──
  const PASOS = [
    // FASE 0
    { id:'venta',      fase:0, label:'Llamada comercial',    sub:'Vendedor califica y agenda',        estado: pasoEstado(a.fInicio),              actor:'Vendedor',        color:'adm' },
    { id:'entrevista', fase:0, label:'Entrevista de cierre', sub:'Leandro o Ariel cierran',           estado: pasoEstado(a.fInicio),              actor:'Leandro / Ariel', color:'ent' },
    { id:'propuesta',  fase:0, label:'Propuesta enviada',    sub:'IA genera y admin envía',           estado: pasoEstado(a.fInicio),              actor:'Admin + IA',      color:'mail' },
    { id:'firma',      fase:0, label:'Contrato firmado',     sub:'Inicio oficial del proceso',        estado: pasoEstado(a.fInicio, a.fInicio?'done':'pending'), actor:'Cliente', color:'inf' },
    // FASE 1
    { id:'email_inicio', fase:1, label:'Email de inicio',    sub:'Instructivo accesos digitales',     estado: pasoEstado(a.fInicio, a.fInicio?'done':'pending'), actor:'Agente', color:'age' },
    { id:'diagnostico',  fase:1, label:'Diagnóstico BPC',    sub: tieneDiagnostico && diagScore ? 'Score: '+diagScore+'/100 · Aporte: '+Math.round(diagScore*0.2)+'/20 pts' + (a.informe_diagnostico ? ' · Informe ✓' : ' · Informe IA pendiente') : '1ra actividad formal post-firma',   estado: tieneDiagnostico?'done':pasoEstado(null), actor:'Cliente + IA', color:'aud', data: { tipo:'diagnostico', audId } },
    { id:'coord_fechas', fase:1, label:'Coordinación fechas',sub:'Agente coordina con consultor',     estado: coord?.estado==='confirmada'?'done': coord?'active':'pending', actor:'Agente', color:'age', data:{tipo:'fecha', campo:'fInicio', label:'Coordinación de fechas', valor:a.fInicio} },
    { id:'email_fechas', fase:1, label:'Confirmación fechas',sub:'Notifica a cliente y consultor',    estado: coord?.estado==='confirmada'?'done':'pending', actor:'Agente', color:'mail' },
    { id:'codigos',      fase:1, label:'Códigos de examen',  sub:'Vendedores, gerente y dueño',       estado: examsDeEstaAud.length>0?'done':'pending', actor:'Admin', color:'exam', data:{tipo:'codigos', audId} },
    { id:'email_codigos',fase:1, label:'Envío de códigos',   sub:'Links individuales por WhatsApp',   estado: examsDeEstaAud.length>0?'done':'pending', actor:'Agente', color:'mail' },
    { id:'accesos',      fase:1, label:'Accesos digitales',  sub:'Analista en redes y analytics',     estado: tieneDigital?'done':'pending', actor:'Cliente', color:'adm' },
    // FASE 2
    { id:'exam_vend',    fase:2, label:'Examen vendedores',  sub:'25 preg · 6 áreas BPC:2026',       estado: tieneVendedores?'done':'pending', actor:'Vendedores', color:'exam', data:{tipo:'exam', audId, rol:'vendedores', resultados: examsDeEstaAud.filter(r=>r.tipo==='auditoria')} },
    { id:'exam_gerente', fase:2, label:'Examen gerente',     sub:'Diagnóstico gerencial · 20 preg',  estado: tieneGerente?'done':'pending', actor:'Gerente', color:'exam', data:{tipo:'exam', audId, rol:'gerente', resultados: examsDeEstaAud.filter(r=>r.tipo==='diagnostico_gerente')} },
    { id:'exam_dueno',   fase:2, label:'Diagnóstico dueño',  sub:'Delegación, timing, decisiones',   estado: tieneDueno?'done':'pending', actor:'Dueño', color:'exam', data:{tipo:'exam', audId, rol:'dueno', resultados: examsDeEstaAud.filter(r=>r.tipo==='diagnostico_dueno')} },
    { id:'entrevistas',  fase:2, label:'Entrevistas RRHH',   sub:'Leandro/Ariel evalúan equipo',     estado: tieneEntrevistas?'done':pasoEstado(null), actor:'Leandro / Ariel', color:'ent', data:{tipo:'entrevistas', audId} },
    { id:'devolucion',   fase:2, label:'Devolución perfiles',sub:'Reunión con dueño y gerente',      estado: a.devolucion_ok?'done':'pending', actor:'Leandro / Ariel', color:'ent' },
    // FASE 3
    { id:'aud_documental',fase:3, label:'Aud. documental',   sub:'Procesos, CRM, contratos',         estado: pasoEstado(a.fDoc), actor:'Consultor', color:'aud', data:{tipo:'fecha', campo:'fDoc', label:'Fecha aud. documental', valor:a.fDoc} },
    { id:'aud_insitu',    fase:3, label:'Aud. in situ',      sub:'Observación directa del equipo',   estado: pasoEstado(a.fInsitu), actor:'Consultor', color:'aud', data:{tipo:'fecha', campo:'fInsitu', label:'Fecha in situ', valor:a.fInsitu} },
    { id:'aud_comun',     fase:3, label:'Aud. comunicaciones',sub:'ML, WhatsApp, scripts, agencias', estado: pasoEstado(a.fExterna), actor:'Consultor', color:'aud', data:{tipo:'fecha', campo:'fExterna', label:'Fecha comunicaciones', valor:a.fExterna} },
    { id:'aud_digital',   fase:3, label:'Aud. digital',      sub:'Web, IG, FB, TikTok — agente IA', estado: tieneDigital?'done':'pending', actor:'Agente IA', color:'age', data:{tipo:'digital', audId} },
    { id:'email_avance',  fase:3, label:'Emails al cliente', sub:'Agente informa avance del proceso',estado: a.fInicio?'active':'pending', actor:'Agente', color:'mail' },
    { id:'reporte_diario',fase:3, label:'Reporte diario 20hs',sub:'Estado del proceso a Leandro y Ariel',estado: a.fInicio?'active':'pending', actor:'Agente', color:'age' },
    // FASE 4
    { id:'evidencias',   fase:4, label:'Carga evidencias',   sub:'Consultor carga hallazgos',        estado: pasoEstado(a.fPrep), actor:'Consultor', color:'aud', data:{tipo:'notas', campo:'notas', label:'Notas / evidencias', valor:a.notas} },
    { id:'consolida',    fase:4, label:'Consolidación IA',   sub:'Agente cruza todos los datos',     estado: pasoEstado(a.fPrep, a.fPrep&&a.fPrep<=td?'done':'pending'), actor:'Agente', color:'age' },
    { id:'informe_ia',   fase:4, label:'Informe generado',   sub:'IA redacta el informe BPC:2026',   estado: tieneInforme?'done':pasoEstado(a.fInforme), actor:'IA', color:'inf', data:{tipo:'informe', audId} },
    { id:'firma_consul', fase:4, label:'Firma del consultor',sub:'Consultor firma como resp. técnico',estado: firmadoConsultor?'done':'pending', actor:'Consultor', color:'aud', data:{tipo:'firma_consultor', audId} },
    { id:'reunion_cierre',fase:4, label:'Reunión de entrega de informe', sub:'Presentación informe + PAC',       estado: pasoEstado(a.fCierre||a.fSeguimiento), actor:'Leandro / Ariel', color:'ent', data:{tipo:'fecha', campo:'fCierre', label:'Fecha reunión cierre', valor:a.fCierre} },
    { id:'entrega_formal',fase:4, label:'Entrega formal',    sub:'Informe + PAC + DA-BPC al cliente',estado: entregado?'done':'pending', actor:'Leandro / Ariel', color:'mail' },
    { id:'certificacion', fase:4, label:'Certificación',     sub:'BPC:2026 emitida. Ariel firma',    estado: a.certificado?'done':'pending', actor:'Ariel', color:'inf', data:{tipo:'certificado', audId} },
  ];

  const FASES = [
    { num:0, label:'Captación y firma', color:'gold' },
    { num:1, label:'Apertura y diagnóstico', color:'blue' },
    { num:2, label:'Evaluaciones', color:'red' },
    { num:3, label:'Auditorías activas', color:'red' },
    { num:4, label:'Elaboración y entrega', color:'gold' },
  ];

  const COLORES = {
    adm:  { bg:'var(--surface2)', bc:'var(--border)', tc:'var(--text)' },
    mail: { bg:'rgba(245,158,11,0.1)', bc:'rgba(245,158,11,0.35)', tc:'#f59e0b' },
    exam: { bg:'rgba(59,130,246,0.1)', bc:'rgba(59,130,246,0.35)', tc:'#60a5fa' },
    aud:  { bg:'rgba(239,68,68,0.1)', bc:'rgba(239,68,68,0.35)', tc:'#f87171' },
    ent:  { bg:'rgba(34,197,94,0.1)', bc:'rgba(34,197,94,0.35)', tc:'#4ade80' },
    inf:  { bg:'rgba(200,168,74,0.12)', bc:'rgba(200,168,74,0.4)', tc:'#c8a84a' },
    age:  { bg:'rgba(139,92,246,0.1)', bc:'rgba(139,92,246,0.35)', tc:'#a78bfa' },
  };

  function pasoHTML(p){
    const isPending = p.estado === 'pending';
    const isDone    = p.estado === 'done';
    const isActive  = p.estado === 'active';
    const isOverdue = p.estado === 'overdue';
    const clickable = p.data ? `data-audid="${audId}" data-pasoid="${p.id}" data-pasodata="${JSON.stringify(p.data||{}).replace(/"/g,'&quot;')}"` : '';
    const isClickable = !!p.data;
    const fechaRef = (p.data?.tipo==='fecha' && p.data?.valor) ? p.data.valor : null;
    const fechaIsLate = fechaRef && fechaRef < td;
    const fechaIsToday = fechaRef && fechaRef === td;

    // Paleta de estados — relojería
    const stateLine = isDone ? '#4ade80' : isActive ? '#d4af37' : isOverdue ? '#ef4444' : 'rgba(255,255,255,0.1)';
    const stateGlow = isDone ? 'rgba(74,222,128,0.15)' : isActive ? 'rgba(212,175,55,0.15)' : isOverdue ? 'rgba(239,68,68,0.15)' : 'transparent';
    const stateOpacity = (isPending && !isClickable) ? '0.38' : '1';
    const bgCard = isDone ? 'rgba(74,222,128,0.04)' : isActive ? 'rgba(212,175,55,0.06)' : isOverdue ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.02)';
    const iconSymbol = isDone ? '✓' : isActive ? '◆' : isOverdue ? '!' : '○';
    const iconColor = isDone ? '#4ade80' : isActive ? '#d4af37' : isOverdue ? '#ef4444' : 'rgba(255,255,255,0.2)';
    const labelColor = isPending ? 'rgba(255,255,255,0.25)' : isDone ? 'rgba(255,255,255,0.7)' : isActive ? '#f0e6b8' : isOverdue ? '#fca5a5' : 'rgba(255,255,255,0.55)';

    const fechaBadge = fechaRef
      ? `<div style="font-size:8px;letter-spacing:0.08em;color:${fechaIsLate?'#4ade80':fechaIsToday?'#d4af37':'rgba(255,255,255,0.3)'};white-space:nowrap;border:1px solid ${fechaIsLate?'rgba(74,222,128,0.3)':fechaIsToday?'rgba(212,175,55,0.4)':'rgba(255,255,255,0.1)'};border-radius:3px;padding:2px 6px;font-family:'DM Mono',monospace">${fmtD(fechaRef)}</div>`
      : '';

    return `<div ${clickable} style="
      position:relative;
      background:${bgCard};
      border:1px solid ${stateLine};
      border-left:2px solid ${stateLine};
      border-radius:4px;
      padding:10px 12px 8px;
      margin-bottom:6px;
      opacity:${stateOpacity};
      cursor:${isClickable?'pointer':'default'};
      transition:all 0.2s;
      box-shadow:${stateGlow?'inset 0 0 0 1px '+stateGlow+',0 0 12px '+stateGlow:'none'};
      " onmouseover="if(this.style.cursor==='pointer'){this.style.transform='translateX(2px)';this.style.borderColor='rgba(212,175,55,0.6)'}" onmouseout="this.style.transform='';this.style.borderColor='${stateLine}'">      <div style="display:flex;align-items:flex-start;gap:9px">
        <div style="flex-shrink:0;margin-top:1px;font-size:9px;font-weight:700;font-family:'DM Mono',monospace;color:${iconColor};width:14px;text-align:center">${iconSymbol}</div>
        <div style="min-width:0;flex:1">
          <div style="font-size:11px;font-weight:500;color:${labelColor};line-height:1.35;letter-spacing:0.01em">${p.label}</div>
          <div style="font-size:9px;color:rgba(255,255,255,0.25);margin-top:3px;letter-spacing:0.05em">${p.sub}</div>
          ${p.actor ? `<div style="font-size:8px;color:rgba(255,255,255,0.18);margin-top:4px;letter-spacing:0.08em;text-transform:uppercase">${p.actor}</div>` : ''}
        </div>
        ${fechaBadge}
      </div>
    </div>`;
  }

  // Docs sin leer del cliente
  const docsSinLeer = (S.get('portal_documentos_subidos')||[]).filter(d=>d.clienteId==a.clienteId && !d.leido);

  // Calcular progreso global
  const total = PASOS.length;
  const hechos = PASOS.filter(p=>p.estado==='done').length;
  const pct = Math.round(hechos/total*100);

  // Agrupar por fase
  const porFase = FASES.map(f => ({
    ...f,
    pasos: PASOS.filter(p => p.fase === f.num)
  }));

  const faseColorBorder = { gold:'rgba(200,168,74,0.5)', blue:'rgba(59,130,246,0.5)', red:'rgba(239,68,68,0.5)' };
  const faseColorText   = { gold:'#c8a84a', blue:'#60a5fa', red:'#f87171' };

  const faseAccentMap = { gold:'rgba(212,175,55,ALPHA)', blue:'rgba(96,165,250,ALPHA)', red:'rgba(239,68,68,ALPHA)' };
  const faseLineMap   = { gold:'#d4af37', blue:'#60a5fa', red:'#f87171' };

  const fasesHTML = porFase.map((f,fi) => {
    const accentLine = faseLineMap[f.color]||'#d4af37';
    const faseHechos = f.pasos.filter(p=>p.estado==='done').length;
    const fasePct = f.pasos.length ? Math.round(faseHechos/f.pasos.length*100) : 0;
    return `
    <div style="flex:1;min-width:0;padding:0 10px 20px;position:relative;${fi<porFase.length-1?'border-right:1px solid rgba(255,255,255,0.04)':''}">
      <!-- Fase header premium -->
      <div style="padding:12px 6px 14px;margin-bottom:10px;position:relative">
        <div style="font-size:7px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:${accentLine};opacity:0.7;margin-bottom:5px;font-family:'DM Mono',monospace">FASE ${f.num}</div>
        <div style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.75);line-height:1.3;margin-bottom:10px">${f.label}</div>
        <!-- Mini barra de progreso de fase -->
        <div style="height:1px;background:rgba(255,255,255,0.06);border-radius:1px;overflow:hidden">
          <div style="height:100%;width:${fasePct}%;background:${accentLine};transition:width 0.5s;box-shadow:0 0 6px ${accentLine}"></div>
        </div>
        <div style="font-size:8px;color:rgba(255,255,255,0.2);margin-top:4px;font-family:'DM Mono',monospace;letter-spacing:0.05em">${faseHechos}/${f.pasos.length} pasos</div>
        <!-- Línea decorativa superior -->
        <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,${accentLine},transparent);opacity:0.4"></div>
      </div>
      <!-- Pasos -->
      ${f.pasos.map(pasoHTML).join('')}
    </div>`;
  }).join('');

  const ov = document.createElement('div');
  ov.className = 'modal-overlay open';
  ov.style.cssText = 'z-index:9998;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px)';
  ov.innerHTML = `
    <div style="
      max-width:96vw;width:1160px;max-height:94vh;
      display:flex;flex-direction:column;
      background:#0e0f10;
      border:1px solid rgba(212,175,55,0.15);
      border-radius:6px;
      overflow:hidden;
      box-shadow:0 0 0 1px rgba(212,175,55,0.06),0 32px 80px rgba(0,0,0,0.7),0 0 60px rgba(212,175,55,0.04);
      position:relative;
    ">
      <!-- Scanner superior -->
      <div style="height:1px;background:rgba(212,175,55,0.1);position:relative;overflow:hidden;flex-shrink:0">
        <div style="position:absolute;top:-1px;left:-30%;width:30%;height:3px;background:linear-gradient(90deg,transparent,rgba(212,175,55,0.5),rgba(245,215,80,0.7),rgba(212,175,55,0.5),transparent);animation:laserscan 4s cubic-bezier(0.4,0,0.6,1) infinite;filter:blur(0.5px)"></div>
      </div>

      <!-- Header -->
      <div style="padding:16px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(212,175,55,0.08);flex-shrink:0;background:linear-gradient(180deg,rgba(212,175,55,0.03),transparent)">
        <div>
          <div style="font-size:8px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:rgba(212,175,55,0.5);margin-bottom:5px;font-family:'DM Mono',monospace">Mapa de Proceso · BPC:2026</div>
          <div style="font-family:'Instrument Serif',serif;font-size:20px;font-weight:400;color:rgba(255,255,255,0.85);letter-spacing:-0.01em">${a.clienteNombre}</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.3);margin-top:3px;letter-spacing:0.05em">${a.tipo} · Auditor: ${a.auditor||'—'}</div>
        </div>
        <div style="display:flex;align-items:center;gap:20px">
          <!-- Score circular -->
          <div style="text-align:center">
            <div style="font-family:'Instrument Serif',serif;font-size:28px;color:#d4af37;line-height:1">${pct}</div>
            <div style="font-size:7px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.25);font-family:'DM Mono',monospace">% avance</div>
            <div style="width:80px;height:1px;background:rgba(255,255,255,0.06);margin:6px auto 0;position:relative;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:#d4af37;box-shadow:0 0 6px rgba(212,175,55,0.5)"></div>
            </div>
          </div>
          <!-- Badges estado -->
          <div>${badge(a.estado)}</div>
          <button onclick="this.closest('.modal-overlay').remove()" style="
            width:30px;height:30px;border-radius:4px;
            background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
            color:rgba(255,255,255,0.4);cursor:pointer;font-size:14px;
            display:flex;align-items:center;justify-content:center;
            transition:all 0.2s;
          " onmouseover="this.style.borderColor='rgba(212,175,55,0.4)';this.style.color='rgba(212,175,55,0.7)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.08)';this.style.color='rgba(255,255,255,0.4)'">✕</button>
        </div>
      </div>

      <!-- Leyenda minimalista -->
      <div style="display:flex;gap:20px;align-items:center;padding:8px 24px;border-bottom:1px solid rgba(255,255,255,0.04);flex-shrink:0">
        ${[['✓','#4ade80','Completado'],['◆','#d4af37','En curso'],['!','#ef4444','Vencido'],['○','rgba(255,255,255,0.2)','Pendiente']].map(([i,c,l])=>
          `<div style="display:flex;align-items:center;gap:5px">
            <span style="font-size:9px;color:${c};font-family:'DM Mono',monospace;font-weight:700">${i}</span>
            <span style="font-size:9px;color:rgba(255,255,255,0.25);letter-spacing:0.05em">${l}</span>
          </div>`
        ).join('')}
        <div style="margin-left:auto;font-size:8px;color:rgba(255,255,255,0.15);letter-spacing:0.1em">CLIC EN PASOS CON BORDE ACTIVO</div>
      </div>

      <!-- Mapa de fases -->
      <div style="flex:1;overflow-y:auto;overflow-x:auto;padding:20px 16px;
        background:radial-gradient(ellipse 60% 40% at 80% 90%,rgba(212,175,55,0.02),transparent),
                  radial-gradient(ellipse 40% 30% at 15% 10%,rgba(180,140,30,0.015),transparent)">
        <div style="display:flex;gap:0;min-width:840px">
          ${fasesHTML}
        </div>
      </div>

      <!-- Footer -->
      <div style="padding:12px 20px;border-top:1px solid rgba(212,175,55,0.08);display:flex;gap:8px;align-items:center;flex-shrink:0;background:rgba(0,0,0,0.2)">
        <button onclick="this.closest('.modal-overlay').remove()" style="padding:8px 18px;border-radius:4px;background:transparent;border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.35);cursor:pointer;font-size:11px;letter-spacing:0.05em;transition:all 0.2s" onmouseover="this.style.borderColor='rgba(255,255,255,0.2)';this.style.color='rgba(255,255,255,0.6)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.1)';this.style.color='rgba(255,255,255,0.35)'">Cerrar</button>
        <button onclick="abrirPanelDocumentosCliente(${a.clienteId||'null'},'${a.clienteNombre}')" style="padding:8px 18px;border-radius:4px;background:rgba(96,165,250,0.08);border:1px solid rgba(96,165,250,0.2);color:rgba(96,165,250,0.7);cursor:pointer;font-size:11px;letter-spacing:0.05em">
          📎 Documentos ${docsSinLeer.length?`<span style="background:#ef4444;color:white;border-radius:3px;padding:1px 5px;font-size:9px;margin-left:3px">${docsSinLeer.length}</span>`:''}
        </button>
        <button onclick="this.closest('.modal-overlay').remove();openBPCAuditTablero(${a.id},'${a.clienteNombre}',${a.clienteId||'null'})" style="padding:8px 18px;border-radius:4px;background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.2);color:rgba(212,175,55,0.7);cursor:pointer;font-size:11px;letter-spacing:0.05em;transition:all 0.2s" onmouseover="this.style.background='rgba(212,175,55,0.14)'" onmouseout="this.style.background='rgba(212,175,55,0.08)'">⬡ Tablero BPC</button>
        ${(()=>{
          const _equipo = (S.get('admin_empresa_equipo')||[]).filter(e=>String(e.clienteId)===String(a.clienteId));
          const _aprobado = !!a.equipo_aprobado;
          if(!_equipo.length) return '';
          return _aprobado
            ? '<div style="padding:8px 14px;border-radius:4px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);color:rgba(34,197,94,0.7);font-size:11px">✅ Equipo aprobado · '+a.equipo_aprobado_fecha+'</div>'
            : '<button onclick="if(confirm(\'¿Aprobar equipo y enviar mails de presentación a '+_equipo.length+' personas?\'))agenteAprobarEquipoYEnviarPresentacion('+a.id+')" style="padding:8px 18px;border-radius:4px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.3);color:rgba(34,197,94,0.8);cursor:pointer;font-size:11px;letter-spacing:0.05em" onmouseover="this.style.background=\'rgba(34,197,94,0.14)\'" onmouseout="this.style.background=\'rgba(34,197,94,0.08)\'">👥 Aprobar equipo ('+_equipo.length+')</button>';
        })()}
        <button onclick="this.closest('.modal-overlay').remove();editAuditoria(${a.id})" style="margin-left:auto;padding:8px 20px;border-radius:4px;background:#d4af37;border:none;color:#0a0800;cursor:pointer;font-size:11px;font-weight:700;letter-spacing:0.08em;transition:all 0.2s" onmouseover="this.style.background='#f5d060'" onmouseout="this.style.background='#d4af37'">Editar</button>
      </div>
    </div>`;
  ov.addEventListener('click', e=>{ if(e.target===ov) ov.remove(); });
  document.body.appendChild(ov);

  // Event delegation para pasos del mapa — reemplaza onclick inline que Safari bloquea
  ov.addEventListener('click', function(e){
    const paso = e.target.closest('[data-audid]');
    if(!paso) return;
    const _audId = paso.getAttribute('data-audid');
    const _pasoId = paso.getAttribute('data-pasoid');
    const _dataStr = paso.getAttribute('data-pasodata');
    if(!_audId || !_pasoId) return;
    try {
      const _data = JSON.parse(_dataStr || '{}');
      mapaAudPasoClick(_audId, _pasoId, _data);
    } catch(err) {
      console.error('Error parseando data del paso:', err);
    }
  });
}

function _expandirInformeIA(){
  const body = document.getElementById('diag-informe-body');
  if(!body) return;
  const texto = body.innerHTML;
  const ov = document.createElement('div');
  ov.className = 'modal-overlay open';
  ov.style.cssText = 'z-index:10000;background:rgba(0,0,0,0.88);backdrop-filter:blur(8px)';
  ov.innerHTML = `
    <div style="width:min(860px,94vw);max-height:90vh;display:flex;flex-direction:column;background:var(--bg);border:1px solid var(--border);border-radius:10px;overflow:hidden">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <div style="font-size:12px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:0.1em">🤖 Análisis IA — Uso interno MetoGroup</div>
        <div style="display:flex;gap:8px">
          <button onclick="navigator.clipboard.writeText(document.getElementById('diag-informe-expand-body').innerText).then(()=>toast('📋 Copiado'))" class="btn btn-sm" style="font-size:11px;padding:5px 12px">📋 Copiar</button>
          <button onclick="this.closest('.modal-overlay').remove()" class="btn btn-sm" style="font-size:11px;padding:5px 12px">✕ Cerrar</button>
        </div>
      </div>
      <div id="diag-informe-expand-body" style="padding:28px 36px;font-size:14px;line-height:2;overflow-y:auto;color:var(--text);flex:1">${texto}</div>
    </div>`;
  ov.addEventListener('click', e=>{ if(e.target===ov) ov.remove(); });
  document.body.appendChild(ov);
}

function _renderInformeIA(container, texto){
  if(!container || !texto) return;
  container.innerHTML = texto
    .replace(/`/g,'&#96;').replace(/\$/g,'&#36;')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/^---$/gm,'<hr style="border:none;border-top:1px solid var(--border);margin:16px 0">')
    .replace(/^(#{1,3})\s(.+)$/gm,(_,h,t)=>`<div style="font-family:'Syne',sans-serif;font-size:${h.length===1?'15':h.length===2?'13':'12'}px;font-weight:700;color:var(--accent);margin:18px 0 6px;text-transform:uppercase;letter-spacing:0.05em">${t}</div>`)
    .replace(/^[-•]\s(.+)$/gm,'<div style="display:flex;gap:8px;margin:4px 0"><span style="color:var(--accent3);flex-shrink:0">›</span><span>$1</span></div>')
    .replace(/\n/g,'<br>');
}

function mapaAudPasoClick(audId, pasoId, data){
  audId = Number(audId);
  const a = S.get('auditorias').find(x=>x.id===audId);
  if(!a) return;

  const ov = document.createElement('div');
  ov.className = 'modal-overlay open';
  ov.style.cssText = 'z-index:9999';

  let bodyHTML = '';
  const tipo = data.tipo;

  if(tipo === 'fecha'){
    const esAudActiva = ['aud_documental','aud_insitu','aud_comun'].includes(pasoId);
    bodyHTML = `
      <div style="margin-bottom:16px">
        <label style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px">${data.label}</label>
        <input type="date" id="paso-fecha-val" value="${data.valor||''}" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;color:var(--text);font-size:14px">
      </div>
      ${esAudActiva ? '<div style="background:rgba(200,168,74,0.07);border:0.5px solid rgba(200,168,74,0.3);border-radius:10px;padding:12px;margin-top:4px"><div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:8px">&#128203; Documentos para esta auditoría</div><button onclick="descargarFicha(\'ficha_insitu\')" class="btn btn-secondary" style="width:100%;text-align:left;padding:10px 14px">&#128202; Ficha de Relevamiento In Situ BPC:2026 — 47 controles</button>'+(pasoId==='aud_documental'?'<button onclick="descargarFicha(\'checklist_evidencia\')" class="btn btn-secondary" style="width:100%;text-align:left;padding:10px 14px;margin-top:8px">✅ Checklist de Evidencia Requerida BPC:2026</button><button onclick="descargarFicha(\'kit_doc_minimos\')" class="btn btn-secondary" style="width:100%;text-align:left;padding:10px 14px;margin-top:8px">📦 Kit de Documentos Mínimos BPC:2026</button>':'')+'</div>' : ''}
      ${pasoId==='coord_fechas'?'<div style="background:rgba(59,130,246,0.07);border:0.5px solid rgba(59,130,246,0.3);border-radius:10px;padding:12px;margin-top:8px"><div style="font-size:11px;font-weight:700;color:#60a5fa;margin-bottom:8px">&#128203; Documentos para el cliente</div><button onclick="descargarFicha(\'kit_doc_minimos\')" class="btn btn-secondary" style="width:100%;text-align:left;padding:10px 14px">📦 Kit de Documentos Mínimos BPC:2026</button></div>':''}
      `;
  } else if(tipo === 'notas'){
    bodyHTML = `
      <div style="margin-bottom:16px">
        <label style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px">${data.label}</label>
        <textarea id="paso-notas-val" rows="6" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;color:var(--text);font-size:13px;resize:vertical">${data.valor||''}</textarea>
      </div>`;
  } else if(tipo === 'exam'){
    const res = data.resultados || [];
    bodyHTML = res.length ? res.map(r => {
      const areas = typeof r.areas === 'string' ? JSON.parse(r.areas||'{}') : (r.areas||{});
      const areaNom = {cierre:'Cierre',objeciones:'Objeciones',etica:'Ética',negociacion:'Negociación',comunicacion:'Comunicación',redes:'Redes',liderazgo:'Liderazgo',metricas:'Métricas',procesos:'Procesos',coordinacion:'Coordinación',conflictos:'Conflictos',herramientas:'Herramientas',delegacion:'Delegación',timing:'Timing',canales:'Canales',decisiones:'Decisiones',comercial:'Rol Comercial',financiero:'Finanzas'};
      const nc = r.nivel==='EXPERTO'?'#c8a84a':r.nivel==='COMPETENTE'?'var(--accent3)':r.nivel==='EN DESARROLLO'?'var(--warn)':'var(--danger)';
      return `<div style="background:var(--surface2);border:0.5px solid var(--border);border-radius:10px;padding:14px;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
          <div style="width:52px;height:52px;border-radius:50%;border:3px solid ${nc};display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:900;color:${nc}">${r.score}%</div>
          </div>
          <div>
            <div style="font-weight:700;font-size:14px">${r.nombre}</div>
            <div style="font-size:11px;color:var(--muted)">${r.empresa||'—'} · ${r.fecha?new Date(r.fecha).toLocaleDateString('es-AR'):'—'}</div>
            <div style="display:inline-block;background:rgba(200,168,74,0.1);color:${nc};border-radius:20px;padding:2px 10px;font-size:10px;font-weight:700;margin-top:4px">${r.nivel}</div>
          </div>
        </div>
        ${Object.entries(areas).map(([k,v])=>`
          <div style="margin-bottom:7px">
            <div style="display:flex;justify-content:space-between;margin-bottom:3px">
              <span style="font-size:11px;color:var(--text)">${areaNom[k]||k}</span>
              <span style="font-size:11px;font-weight:700;color:${v.pct>=70?'var(--accent3)':v.pct>=50?'var(--warn)':'var(--danger)'}">${v.pct}%</span>
            </div>
            <div style="height:5px;background:rgba(255,255,255,0.07);border-radius:99px;overflow:hidden">
              <div style="width:${v.pct}%;height:100%;background:${v.pct>=70?'var(--accent3)':v.pct>=50?'var(--warn)':'var(--danger)'};border-radius:99px"></div>
            </div>
          </div>`).join('')}
      </div>`;
    }).join('') : `<div style="padding:32px;text-align:center;color:var(--muted);font-size:13px">Sin resultados recibidos aún</div>`;
  } else if(tipo === 'codigos'){
    const cliente = S.get('clientes').find(c=>String(c.id)===String(a.clienteId))||{};
    const equipoGuardado = a.equipo_examenes ? JSON.parse(a.equipo_examenes) : [];
    const filas = equipoGuardado.length > 0 ? equipoGuardado : [
      {nombre:'', email:'', rol:'vendedor'},
      {nombre:'', email:'', rol:'vendedor'},
      {nombre:'', email:'', rol:'gerente'},
      {nombre:'', email:'', rol:'dueno'},
    ];
    const yaEnviados = a.codigos_enviados;
    bodyHTML = '<div>'
      +(yaEnviados ? '<div style="background:rgba(34,197,94,0.1);border:0.5px solid rgba(34,197,94,0.3);border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:var(--accent3)">✅ Códigos ya enviados a: <strong>'+a.codigos_equipo+'</strong></div>' : '')
      +'<div style="font-size:11px;color:var(--muted);margin-bottom:12px">Cargá los datos del equipo. El agente genera los códigos y los envía por email a cada persona.</div>'
      +'<div id="equipo-filas">'
      +filas.map((f,i)=>'<div style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;margin-bottom:8px">'
        +'<input placeholder="Nombre completo" value="'+( f.nombre||'')+'" id="eq-nombre-'+i+'" style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:8px 10px;color:var(--text);font-size:12px">'
        +'<input placeholder="Email" value="'+(f.email||'')+'" id="eq-email-'+i+'" style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:8px 10px;color:var(--text);font-size:12px">'
        +'<select id="eq-rol-'+i+'" style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:8px;color:var(--text);font-size:12px">'
        +'<option value="vendedor"'+(f.rol==='vendedor'?' selected':'')+'>Vendedor</option>'
        +'<option value="gerente"'+(f.rol==='gerente'?' selected':'')+'>Gerente</option>'
        +'<option value="dueno"'+(f.rol==='dueno'?' selected':'')+'>Dueño</option>'
        +'</select>'
        +'</div>').join('')
      +'</div>'
      +'<button onclick="document.getElementById(\'equipo-filas\').insertAdjacentHTML(\'beforeend\',\'<div style=\\\"display:grid;grid-template-columns:1fr 1fr auto;gap:8px;margin-bottom:8px\\\"><input placeholder=\\\"Nombre completo\\\" id=\\\"eq-nombre-\'+(document.querySelectorAll(\'[id^=eq-nombre-]\').length)+\'\\\" style=\\\"background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:8px 10px;color:var(--text);font-size:12px\\\"><input placeholder=\\\"Email\\\" id=\\\"eq-email-\'+(document.querySelectorAll(\'[id^=eq-nombre-]\').length)+\'\\\" style=\\\"background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:8px 10px;color:var(--text);font-size:12px\\\"><select id=\\\"eq-rol-\'+(document.querySelectorAll(\'[id^=eq-nombre-]\').length)+\'\\\" style=\\\"background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:8px;color:var(--text);font-size:12px\\\"><option value=\\\"vendedor\\\">Vendedor</option><option value=\\\"gerente\\\">Gerente</option><option value=\\\"dueno\\\">Dueño</option></select></div>\')" class="btn btn-secondary btn-sm" style="margin-bottom:16px">+ Agregar persona</button>'
      +'</div>';
  
    bodyHTML = `<div style="padding:20px;text-align:center;color:var(--muted)">
      <div style="font-size:32px;margin-bottom:12px">🤖</div>
      <div style="font-size:14px;margin-bottom:8px;color:var(--text)">Auditoría digital pendiente</div>
      <div style="font-size:12px">El agente auditará web, Instagram, Facebook y TikTok una vez que el cliente otorgue los accesos.</div>
      <button onclick="toast('⏳ Ejecutando auditoría digital...');this.closest(\'.modal-overlay\').remove()" class="btn btn-primary" style="margin-top:16px">🤖 Ejecutar ahora</button>
    </div>`;
  } else if(tipo === 'entrevistas'){
    bodyHTML = `
      <!-- Fichas descargables -->
      <div style="margin-bottom:20px">
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);margin-bottom:12px">Fichas de evaluación</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px">
          ${[
            ['vendedor_ficha','👤','Ficha Vendedor','Evaluación de perfil comercial'],
            ['gerente_ficha','📊','Ficha Gerente','Evaluación de perfil de liderazgo'],
            ['dueno_ficha','👑','Ficha Dueño','Evaluación de perfil directivo'],
          ].map(([key,ico,tit,sub])=>`
            <div style="background:var(--surface2);border:0.5px solid var(--border);border-radius:10px;padding:12px;text-align:center;cursor:pointer;transition:all .15s" onclick="descargarFicha('${key}')" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
              <div style="font-size:22px;margin-bottom:6px">${ico}</div>
              <div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:3px">${tit}</div>
              <div style="font-size:10px;color:var(--muted);margin-bottom:8px">${sub}</div>
              <div style="font-size:10px;background:rgba(200,168,74,0.1);color:var(--accent);border-radius:20px;padding:3px 10px;display:inline-block">📥 Descargar</div>
            </div>`).join('')}
        </div>
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);margin-bottom:12px">Preguntas disparadoras</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:20px">
          ${[
            ['vendedor_preguntas','💬','Preguntas Vendedor','12 preguntas · 4 bloques'],
            ['gerente_preguntas','💬','Preguntas Gerente','12 preguntas · 4 bloques'],
            ['dueno_preguntas','💬','Preguntas Dueño','12 preguntas · 4 bloques'],
          ].map(([key,ico,tit,sub])=>`
            <div style="background:var(--surface2);border:0.5px solid var(--border);border-radius:10px;padding:12px;text-align:center;cursor:pointer;transition:all .15s" onclick="descargarFicha('${key}')" onmouseover="this.style.borderColor='rgba(139,92,246,0.5)'" onmouseout="this.style.borderColor='var(--border)'">
              <div style="font-size:22px;margin-bottom:6px">${ico}</div>
              <div style="font-size:12px;font-weight:700;color:#a78bfa;margin-bottom:3px">${tit}</div>
              <div style="font-size:10px;color:var(--muted);margin-bottom:8px">${sub}</div>
              <div style="font-size:10px;background:rgba(139,92,246,0.1);color:#a78bfa;border-radius:20px;padding:3px 10px;display:inline-block">📥 Descargar</div>
            </div>`).join('')}
        </div>
        <div style="border-top:0.5px solid var(--border);padding-top:14px">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);margin-bottom:10px">Notas de las entrevistas realizadas</div>
          <textarea id="paso-notas-val" rows="5" placeholder="Anotá observaciones de las entrevistas individuales..." style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;color:var(--text);font-size:13px;resize:vertical">${a.notas_entrevistas||''}</textarea>
          <div style="display:flex;align-items:center;gap:10px;margin-top:10px">
            <label style="font-size:12px;color:var(--text);display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="checkbox" id="paso-entrevistas-ok" ${a.entrevistas_ok?'checked':''}>
              Todas las entrevistas completadas
            </label>
          </div>
        </div>
      </div>`;
  } else if(tipo === 'firma_consultor'){
    bodyHTML = `
      <div style="text-align:center;padding:20px 0">
        <div style="font-size:40px;margin-bottom:12px">${a.informe_firmado?'✅':'✍️'}</div>
        <div style="font-size:14px;font-weight:600;margin-bottom:8px;color:var(--text)">${a.informe_firmado?'Informe firmado por el consultor':'Pendiente firma del consultor'}</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:20px">Auditor responsable: ${a.auditor||'—'}</div>
        ${!a.informe_firmado?`<button onclick="mapaMarcarFirma(${audId});this.closest('.modal-overlay').remove()" class="btn btn-primary">✍️ Marcar como firmado</button>`:'<div style="color:var(--accent3);font-size:12px">El informe fue firmado por el consultor</div>'}
      </div>`;
  } else if(tipo === 'informe'){
    const yaGenerado = a.informe_generado;
    const score = a.resultado || '';
    const nivel = score >= 75 ? 'ALTO' : score >= 50 ? 'MEDIO' : score > 0 ? 'BAJO' : '';
    bodyHTML = '<div>'
      // Si ya hay informe generado, mostrar preview
      +(yaGenerado ? '<div style="background:rgba(200,168,74,0.08);border:0.5px solid rgba(200,168,74,0.3);border-radius:10px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px">'
        +'<div style="font-size:24px">✅</div>'
        +'<div><div style="font-size:13px;font-weight:700;color:var(--accent)">Informe generado</div>'
        +'<div style="font-size:11px;color:var(--muted)">Score: '+score+'/100 · Nivel '+nivel+'</div></div>'
        +'<button onclick="verInformeGenerado('+audId+')" class="btn btn-secondary btn-sm" style="margin-left:auto">👁 Ver informe</button>'
        +'</div>' : '')
      // Score y datos del consultor
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">'
      +'<div><label style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px">BPC Score final (0-100)</label>'
      +'<input id="paso-score-val" value="'+(a.resultado||'')+'" placeholder="Ej: 67" type="number" min="0" max="100" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;color:var(--text);font-size:14px;font-weight:700"></div>'
      +'<div><label style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px">N° de auditoría</label>'
      +'<input id="paso-nro-auditoria" value="'+(a.nroAuditoria||'')+'" placeholder="MG-BPC-2026-001" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;color:var(--text);font-size:13px"></div>'
      +'</div>'
      // Hallazgos por dominio
      +'<div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Hallazgos por dominio (scores e NC)</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">'
      +['A.5 Estrategia y Gobernanza','A.6 RRHH Comerciales','A.7 Canales y Ventas','A.8 Comunicación','A.9 Tecnología','A.10 Ética','A.11 Datos y Clientes','A.12 Medición'].map((dom,i)=>{
        const key = 'dom_'+(i+5);
        const saved = a[key] ? JSON.parse(a[key]) : {};
        return '<div style="background:var(--surface2);border:0.5px solid var(--border);border-radius:8px;padding:10px">'
          +'<div style="font-size:10px;font-weight:700;color:var(--accent);margin-bottom:6px">'+dom+'</div>'
          +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px">'
          +'<input placeholder="Score" type="number" min="0" max="100" value="'+(saved.score||'')+'" id="dom-score-'+(i+5)+'" style="background:var(--surface);border:0.5px solid var(--border);border-radius:4px;padding:4px 6px;color:var(--text);font-size:11px;text-align:center">'
          +'<input placeholder="C" type="number" min="0" value="'+(saved.nc_critica||'')+'" id="dom-nc-c-'+(i+5)+'" style="background:rgba(239,68,68,0.08);border:0.5px solid rgba(239,68,68,0.2);border-radius:4px;padding:4px 6px;color:var(--danger);font-size:11px;text-align:center">'
          +'<input placeholder="M" type="number" min="0" value="'+(saved.nc_mayor||'')+'" id="dom-nc-m-'+(i+5)+'" style="background:rgba(245,158,11,0.08);border:0.5px solid rgba(245,158,11,0.2);border-radius:4px;padding:4px 6px;color:var(--warn);font-size:11px;text-align:center">'
          +'<input placeholder="Mn" type="number" min="0" value="'+(saved.nc_menor||'')+'" id="dom-nc-mn-'+(i+5)+'" style="background:rgba(100,116,139,0.08);border:0.5px solid rgba(100,116,139,0.2);border-radius:4px;padding:4px 6px;color:var(--muted);font-size:11px;text-align:center">'
          +'</div>'
          +'<input placeholder="Hallazgo principal..." value="'+(saved.hallazgo||'')+'" id="dom-hallazgo-'+(i+5)+'" style="width:100%;margin-top:5px;background:var(--surface);border:0.5px solid var(--border);border-radius:4px;padding:5px 7px;color:var(--text);font-size:11px">'
          +'</div>';
      }).join('')
      +'</div>'
      // Notas del consultor
      +'<div style="margin-bottom:16px"><label style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px">Notas del consultor (contexto para la IA)</label>'
      +'<textarea id="paso-notas-informe" rows="4" placeholder="Observaciones generales, fortalezas detectadas, contexto del sector..." style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;color:var(--text);font-size:12px;resize:vertical">'+(a.notas_informe||'')+'</textarea></div>'
      // Botón generar
      +'<div style="background:rgba(200,168,74,0.05);border:0.5px solid rgba(200,168,74,0.2);border-radius:10px;padding:14px;margin-bottom:4px">'
      +'<div style="font-size:11px;color:var(--muted);margin-bottom:10px">La IA redactará el informe completo BPC:2026 (19 páginas) con todos los hallazgos, DA-BPC, PAC y conclusión del auditor. El proceso tarda ~30 segundos.</div>'
      +'<button id="btn-generar-informe" onclick="generarInformeIA('+audId+');this.closest(\'.modal-overlay\').remove()" class="btn btn-primary" style="width:100%;background:linear-gradient(135deg,rgba(200,168,74,0.2),rgba(200,168,74,0.1));border-color:rgba(200,168,74,0.4);color:var(--accent);font-size:13px;padding:12px">⬡ Generar Informe BPC:2026 con IA</button>'
      +'</div>'
      +'</div>';

  } else if(tipo === 'certificado'){
    bodyHTML = `
      <div style="text-align:center;padding:20px 0">
        <div style="font-size:40px;margin-bottom:12px">${a.certificado?'🏆':'⏳'}</div>
        <div style="font-size:14px;font-weight:600;margin-bottom:8px;color:var(--text)">${a.certificado?'Certificación emitida':'Pendiente certificación'}</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:20px">Se emite cuando el score BPC:2026 lo permite. Ariel firma.</div>
        ${!a.certificado?`<button onclick="mapaMarcarCertificado(${audId});this.closest('.modal-overlay').remove()" class="btn btn-primary">🏆 Marcar certificado emitido</button>`:'<div style="color:var(--accent);font-size:12px">Certificado BPC:2026 emitido</div>'}
      </div>`;
  } else if(tipo === 'diagnostico'){
    // Buscar diagData — primero en caché, asegurando que informeIA esté cargado
    const _allDiags = S.get('portal_diagnostico')||[];
    let diagData = _allDiags.find(d=>String(d.clienteId)===String(a.clienteId));
    // Si no tiene informeIA en caché, hacer fetch fresco de Supabase en background
    if(diagData && !diagData.informeIA){
      sbFetch('portal_diagnostico','GET',null,'?clienteId=eq.'+a.clienteId+'&select=*').then(rows=>{
        if(rows&&rows.length){
          const fresh = sbNormalizeRow('portal_diagnostico', rows[0]);
          const idx = _allDiags.findIndex(d=>d.id===fresh.id);
          if(idx>-1) _allDiags[idx]=fresh; else _allDiags.push(fresh);
          _sbCache['portal_diagnostico'] = _allDiags;
          // Si el modal sigue abierto, inyectar el informe
          const _ib = document.getElementById('diag-informe-body');
          if(_ib && fresh.informeIA){
            const _html = fresh.informeIA
              .replace(/`/g,'&#96;').replace(/\$/g,'&#36;')
              .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
              .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
              .replace(/^---$/gm,'<hr style="border:none;border-top:1px solid var(--border);margin:16px 0">')
              .replace(/^(#{1,3})\s(.+)$/gm,(_,h,t)=>`<div style="font-weight:700;color:var(--accent);margin:14px 0 4px">${t}</div>`)
              .replace(/^[-•]\s(.+)$/gm,'<div style="display:flex;gap:8px;margin:4px 0"><span style="color:var(--accent3)">›</span><span>$1</span></div>')
              .replace(/\n/g,'<br>');
            _ib.innerHTML = _html;
          }
        }
      });
    }
    const informeIA = a.informe_diagnostico || diagData?.informeIA || null;
    const diagScore = a.informe_diagnostico_score || diagData?.score || a.diagnostico_score || null;
    const aporte    = diagScore !== null ? Math.round(diagScore * 0.20) : null;
    const apiKey    = localStorage.getItem('METO_anthropic_key') || ANTHROPIC_API_KEY;
    const nivel     = diagScore !== null ? getBPCNivel(diagScore) : null;
    const scoreColor = diagScore>=75?'var(--accent3)':diagScore>=50?'var(--warn)':diagScore>=25?'#f97316':'var(--danger)';

    // Desglose por dimensión desde las respuestas del diagnóstico
    const respuestas = diagData?.respuestas || {};
    const dimBlocks = BPC_DIMENSIONES.filter(d=>!d.esCanales&&!d.esReflexiva).map(d=>{
      const ds = calcDimScore(diagData, d);
      const pct = d.maxPts ? Math.round(ds/d.maxPts*100) : 0;
      const dColor = pct>=75?'var(--accent3)':pct>=50?'var(--warn)':'var(--danger)';
      return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px">
        <div style="font-size:10px;color:var(--muted);margin-bottom:6px">${d.icon} ${d.nombre}</div>
        <div style="height:4px;background:var(--surface);border-radius:2px;overflow:hidden;margin-bottom:6px">
          <div style="width:${pct}%;height:100%;background:${dColor};border-radius:2px;transition:width 0.6s"></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <span style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:${dColor}">${ds}</span>
          <span style="font-size:9px;color:var(--muted)">/${d.maxPts} pts · ${pct}%</span>
        </div>
      </div>`;
    }).join('');

    // Formatear informe IA
    const informeHTML = informeIA
      ? informeIA
          .replace(/`/g,'&#96;')
          .replace(/\$/g,'&#36;')
          .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
          .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
          .replace(/^---$/gm,'<hr style="border:none;border-top:1px solid var(--border);margin:16px 0">')
          .replace(/^(#{1,3})\s(.+)$/gm,(_,h,t)=>`<div style="font-family:'Syne',sans-serif;font-size:${h.length===1?'15':h.length===2?'13':'12'}px;font-weight:700;color:var(--accent);margin:18px 0 6px;text-transform:uppercase;letter-spacing:0.05em">${t}</div>`)
          .replace(/^[-•]\s(.+)$/gm,'<div style="display:flex;gap:8px;margin:4px 0"><span style="color:var(--accent3);flex-shrink:0">›</span><span>$1</span></div>')
          .replace(/\n/g,'<br>')
      : '';

    bodyHTML = `<div>

      <!-- ═══ HEADER SCORE ═══ -->
      <div style="background:linear-gradient(135deg,rgba(212,175,55,0.08),rgba(200,168,74,0.03));border:1px solid rgba(212,175,55,0.2);border-radius:12px;padding:20px 24px;margin-bottom:16px;display:flex;align-items:center;gap:24px">
        <div style="text-align:center;flex-shrink:0">
          <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4px">BPC Score</div>
          <div style="font-family:'Syne',sans-serif;font-size:52px;font-weight:800;color:${scoreColor};line-height:1">${diagScore!==null?diagScore:'—'}</div>
          <div style="font-size:10px;color:var(--muted)">/100</div>
        </div>
        <div style="flex:1;border-left:1px solid var(--border);padding-left:20px">
          <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700;color:${scoreColor};margin-bottom:4px">${nivel?.nombre||'Sin datos'}</div>
          <div style="font-size:12px;font-style:italic;color:var(--muted);margin-bottom:10px;line-height:1.5">${nivel?.desc||'El cliente aún no completó el diagnóstico.'}</div>
          <div style="display:flex;gap:16px;flex-wrap:wrap">
            <div style="font-size:11px;color:var(--muted)">Estado: <strong style="color:${a.diagnostico_ok?'var(--accent3)':'var(--warn)'}">${a.diagnostico_ok?'✅ Completado':'⏳ Pendiente'}</strong></div>
            ${aporte!==null?`<div style="font-size:11px;color:var(--muted)">Aporte al informe final: <strong style="color:var(--accent)">${aporte}/20 pts (20%)</strong></div>`:''}
            ${diagData?.fechaFin?`<div style="font-size:11px;color:var(--muted)">Completado: ${diagData.fechaFin}</div>`:''}
          </div>
        </div>
        ${!a.diagnostico_ok?`<button onclick="mapaMarcarDiagnostico(${audId});this.closest('.modal-overlay').remove()" class="btn btn-primary" style="flex-shrink:0;align-self:flex-start">✅ Marcar en mapa</button>`:''}
      </div>

      ${diagData ? `
      <!-- ═══ BARRA DE PROGRESO GLOBAL ═══ -->
      <div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-bottom:6px">
          <span>Madurez comercial</span><span>${diagScore}/100</span>
        </div>
        <div style="height:8px;background:var(--surface2);border-radius:4px;overflow:hidden">
          <div style="width:${diagScore||0}%;height:100%;background:linear-gradient(90deg,var(--danger),var(--warn),var(--accent3));border-radius:4px;transition:width 0.8s cubic-bezier(.4,0,.2,1)"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--muted);margin-top:4px">
          <span>Etapa Inicial</span><span>En Desarrollo</span><span>Intermedio</span><span>Avanzado</span><span>Excelencia</span>
        </div>
      </div>

      <!-- ═══ DIMENSIONES ═══ -->
      <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px">Desglose por dimensión</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px">${dimBlocks}</div>

      <!-- ═══ CANALES ═══ -->
      ${(respuestas['D7Q1']||respuestas['D7Q2'])?`
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px 16px;margin-bottom:16px;display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div>
          <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">📉 Canal subaprovechado</div>
          <div style="font-size:13px;color:var(--text);font-weight:500">${respuestas['D7Q1']||'—'}</div>
        </div>
        <div>
          <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">📈 Canal más potenciado</div>
          <div style="font-size:13px;color:var(--text);font-weight:500">${respuestas['D7Q2']||'—'}</div>
        </div>
      </div>`:''}
      ` : `
      <div style="text-align:center;padding:24px;background:var(--surface2);border-radius:8px;border:1px dashed var(--border);margin-bottom:16px">
        <div style="font-size:28px;margin-bottom:8px;opacity:0.4">📋</div>
        <div style="font-size:12px;color:var(--muted)">El cliente todavía no completó el diagnóstico.</div>
      </div>`}

      <!-- ═══ INFORME IA ═══ -->
      <div style="border:1px solid rgba(212,175,55,0.2);border-radius:10px;overflow:hidden">
        <div style="background:linear-gradient(135deg,rgba(212,175,55,0.08),transparent);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:0.1em">🤖 Análisis IA — Uso interno MetoGroup</div>
            <div id="diag-informe-fecha" style="font-size:10px;color:var(--muted);margin-top:2px">${a.informe_diagnostico_fecha?'Generado: '+a.informe_diagnostico_fecha:''}</div>
          </div>
          <div style="display:flex;gap:8px">
            <button onclick="navigator.clipboard.writeText(document.getElementById('diag-informe-body').innerText).then(()=>toast('📋 Copiado'))" class="btn btn-sm" style="font-size:10px;padding:4px 10px">📋 Copiar</button>
            <button onclick="_expandirInformeIA()" class="btn btn-sm" style="font-size:10px;padding:4px 10px">⛶ Expandir</button>
            ${apiKey?`<button onclick="(async()=>{const d=(S.get('portal_diagnostico')||[]).find(x=>String(x.clienteId)===String(${a.clienteId}));if(!d){toast('❌ Sin datos');return;}toast('🤖 Regenerando...');await generarInformeDiagnosticoIA(d,${audId});this.closest('.modal-overlay').remove();setTimeout(()=>auditDetail(${audId}),300);})()" class="btn btn-sm" style="font-size:10px;padding:4px 10px">🔄 Regenerar</button>`:''}
          </div>
        </div>
        <div id="diag-informe-body" style="padding:18px 20px;font-size:12px;line-height:1.85;max-height:420px;overflow-y:auto;color:var(--text)">
          <div id="diag-informe-loading" style="text-align:center;padding:20px;color:var(--muted);font-size:12px">
            ${a.diagnostico_ok ? '⏳ Cargando análisis...' : '📋 Disponible cuando el cliente complete el diagnóstico.'}
          </div>
        </div>
        ${a.diagnostico_ok && apiKey && !informeIA ? `<div style="padding:12px 16px;border-top:1px solid var(--border)"><button id="btn-generar-informe-diag" onclick="(async()=>{const d=(S.get('portal_diagnostico')||[]).find(x=>String(x.clienteId)===String(${a.clienteId}));if(!d){toast('❌ Sin datos del diagnóstico');return;}toast('🤖 Generando análisis...');document.getElementById('btn-generar-informe-diag').disabled=true;await generarInformeDiagnosticoIA(d,${audId});this.closest('.modal-overlay').remove();setTimeout(()=>auditDetail(${audId}),300);})()" class="btn btn-primary" style="font-size:12px;width:100%">🤖 Generar análisis IA ahora</button></div>` : ''}
      </div>

    </div>`;
  }

  const titulos = {
    fecha: data.label, notas:'Evidencias y notas', exam:'Resultados de exámenes',
    digital:'Auditoría digital', entrevistas:'Entrevistas RRHH',
    firma_consultor:'Firma del consultor', informe:'Informe BPC:2026',
    certificado:'Certificación BPC:2026', diagnostico:'Diagnóstico BPC inicial',
  };

  const tieneGuardar = ['fecha','notas','entrevistas','informe','codigos'].includes(tipo);
  const btnGuardar = tipo === 'codigos'
    ? `<button class="btn btn-primary" onclick="mapaGuardarPaso(${audId},'${pasoId}','${tipo}',${JSON.stringify(data||{}).replace(/'/g,'&#39;')});this.closest('.modal-overlay').remove()">🚀 Guardar y enviar códigos</button>`
    : tieneGuardar ? `<button class="btn btn-primary" onclick="mapaGuardarPaso(${audId},'${pasoId}','${tipo}',${JSON.stringify(data||{}).replace(/'/g,'&#39;')});this.closest('.modal-overlay').remove()">💾 Guardar</button>` : '';

  // Construir modal en partes para evitar que Safari falle con template literals grandes
  const _modalDiv = document.createElement('div');
  _modalDiv.className = 'modal';
  _modalDiv.style.cssText = 'max-width:580px;width:100%';

  const _head = document.createElement('div');
  _head.className = 'modal-head';
  _head.innerHTML = '<div class="modal-title">' + (titulos[tipo]||pasoId) + '</div><button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">✕</button>';

  const _body = document.createElement('div');
  _body.className = 'modal-body';
  _body.style.cssText = 'max-height:60vh;overflow-y:auto';
  _body.innerHTML = bodyHTML;

  const _footer = document.createElement('div');
  _footer.className = 'modal-footer';
  _footer.innerHTML = '<button class="btn btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">Cerrar</button>' + btnGuardar;

  _modalDiv.appendChild(_head);
  _modalDiv.appendChild(_body);
  _modalDiv.appendChild(_footer);
  ov.appendChild(_modalDiv);

  ov.addEventListener('click', e=>{ if(e.target===ov) ov.remove(); });
  document.body.appendChild(ov);

  // Cargar informe IA desde Supabase y mostrarlo en el modal
  if(tipo === 'diagnostico'){
    const _informeBody = ov.querySelector('#diag-informe-body');
    const _loading = ov.querySelector('#diag-informe-loading');
    if(_informeBody){
      // Primero intentar desde caché
      const _audCached = S.get('auditorias').find(x=>x.id===Number(audId));
      const _diagCached = (S.get('portal_diagnostico')||[]).find(d=>String(d.clienteId)===String(_audCached?.clienteId));
      const _informeCache = _audCached?.informe_diagnostico || _diagCached?.informeIA || null;
      if(_informeCache){
        _renderInformeIA(_informeBody, _informeCache);
        if(_loading) _loading.remove();
      } else {
        // Buscar en Supabase
        sbFetch('auditorias','GET',null,'?id=eq.'+audId+'&select=informe_diagnostico,informe_diagnostico_fecha').then(rows=>{
          const _txt = rows?.[0]?.informe_diagnostico;
          const _fecha = rows?.[0]?.informe_diagnostico_fecha;
          if(_txt && _informeBody.isConnected){
            _renderInformeIA(_informeBody, _txt);
            if(_loading) _loading.remove();
            const _fechaEl = ov.querySelector('#diag-informe-fecha');
            if(_fechaEl && _fecha) _fechaEl.textContent = 'Generado: '+_fecha;
            // Guardar en caché
            if(_audCached){ _audCached.informe_diagnostico=_txt; _sbCache['auditorias']=S.get('auditorias'); }
          } else if(_informeBody.isConnected && _loading){
            _loading.textContent = _audCached?.diagnostico_ok ? '📋 Sin análisis todavía. Generalo con el botón.' : '📋 Disponible cuando el cliente complete el diagnóstico.';
          }
        }).catch(()=>{});
      }
    }
  }
}

function mapaGuardarPaso(audId, pasoId, tipo, data){
  const items = S.get('auditorias');
  const i = items.findIndex(x=>x.id===audId);
  if(i<0) return;
  const a = {...items[i]};
  if(tipo==='fecha'){
    const val = document.getElementById('paso-fecha-val')?.value;
    if(val) a[data.campo] = val;
  } else if(tipo==='notas'){
    const val = document.getElementById('paso-notas-val')?.value;
    a.notas = val;
  } else if(tipo==='entrevistas'){
    a.notas_entrevistas = document.getElementById('paso-notas-val')?.value||'';
    a.entrevistas_ok = document.getElementById('paso-entrevistas-ok')?.checked;
  } else if(tipo==='codigos'){
    // Recopilar equipo del formulario
    const filas = document.querySelectorAll('[id^="eq-nombre-"]');
    const equipo = [];
    filas.forEach((el,i)=>{
      const nombre = el.value.trim();
      const email  = document.getElementById('eq-email-'+i)?.value.trim();
      const rol    = document.getElementById('eq-rol-'+i)?.value;
      if(nombre && email) equipo.push({nombre, email, rol});
    });
    if(!equipo.length){ toast('⚠️ Cargá al menos una persona'); return; }
    a.equipo_examenes = JSON.stringify(equipo);
    items[i] = a;
    S.set('auditorias', items);
    // Enviar códigos
    agenteEnviarCodigosExamen(audId, equipo);
    toast('🚀 Generando y enviando códigos...');
    setTimeout(()=> auditDetail(audId), 3000);
    return;
  } else if(tipo==='informe'){
    const scoreVal = document.getElementById('paso-score-val')?.value;
    if(scoreVal) a.resultado = scoreVal;
    a.nroAuditoria = document.getElementById('paso-nro-auditoria')?.value||'';
    a.notas_informe = document.getElementById('paso-notas-informe')?.value||'';
    for(let di=5; di<=12; di++){
      const domData = {
        score: document.getElementById('dom-score-'+di)?.value||'',
        nc_critica: document.getElementById('dom-nc-c-'+di)?.value||'0',
        nc_mayor: document.getElementById('dom-nc-m-'+di)?.value||'0',
        nc_menor: document.getElementById('dom-nc-mn-'+di)?.value||'0',
        hallazgo: document.getElementById('dom-hallazgo-'+di)?.value||''
      };
      if(domData.score || domData.hallazgo) a['dom_'+di] = JSON.stringify(domData);
    }
  }
  items[i] = a;
  S.set('auditorias', items);
  toast('✅ Guardado');
  // Reabrir el mapa actualizado
  setTimeout(()=> auditDetail(audId), 200);
}
