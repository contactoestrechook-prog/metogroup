
// ============================================================

// Role permissions: which pages each role can access
const ROLE_PAGES = {
  dueno:    ['dashboard','bpc_score','examenes','inteligencia','auditorias','calendario','auditores','clientes','cotizaciones','cobros','gastos','vendedores','crm','entrevistas','reportes','historial','rankings','basesdatos','agenda','misventas','referidos','sueldos','usuarios','admin','impuestos','reparto','ahorro','dirtec','dirtec_impl','dirtec_capacidad','dirtec_rendicion','dirtec_honorarios','dirtec_entregas','portal_auditoria','correos','mi_panel','mi_rendicion','mi_calendario','mi_honorarios'],
  admin:    ['dashboard','bpc_score','auditorias','calendario','auditores','clientes','cotizaciones','cobros','gastos','vendedores','crm','reportes','historial','admin','impuestos','dirtec','dirtec_impl','dirtec_rendicion','dirtec_entregas','portal_auditoria','correos'],
  consultor:['mi_panel','mi_rendicion','mi_calendario','mi_honorarios','portal_auditoria','correos'],
  vendedor: ['crm','misventas','referidos','agenda','rankings','basesdatos','correos'],
};

const ROLE_LABELS = {
  dueno:'Dueño',admin:'Administrativo',consultor:'Consultor',vendedor:'Vendedor',cliente:'Cliente'
};

// Prioridad de roles para determinar home y label principal
const ROLE_PRIORITY = ['dueno','admin','consultor','vendedor','cliente'];

const ROLE_HOME = {
  dueno:'dashboard', admin:'dashboard', consultor:'mi_panel', vendedor:'crm', cliente:'portal_dashboard'
};

// Helper: obtener array de roles del usuario actual
function getUserRoles(user){
  const u = user || currentUser;
  if(!u) return [];
  if(Array.isArray(u.roles) && u.roles.length) return u.roles;
  if(u.rol) return [u.rol]; // compatibilidad con usuarios antiguos
  return [];
}

// Helper: rol principal (mayor prioridad) del usuario
function getPrimaryRole(user){
  const roles = getUserRoles(user);
  for(const r of ROLE_PRIORITY){ if(roles.includes(r)) return r; }
  return roles[0] || 'vendedor';
}

// Helper: páginas permitidas (unión de todos los roles)
function getAllowedPages(user){
  const roles = getUserRoles(user);
  const pages = new Set();
  roles.forEach(r => (ROLE_PAGES[r]||[]).forEach(p => pages.add(p)));
  return [...pages];
}

function getUsers(){
  const defaults = [
    {id:1, nombre:'Administrador', usuario:'admin', password:'admin123', rol:'dueno', roles:['dueno'], email:'admin@metogroup.com', activo:true}
  ];
  const stored = S.get('usuarios');
  const users = stored.length ? stored : defaults;
  // Normalizar roles: PostgreSQL TEXT[] → JS array
  users.forEach(u=>{
    if(typeof u.roles === 'string'){
      try{ u.roles = JSON.parse(u.roles); }catch(e){ u.roles = u.roles.replace(/[{}]/g,'').split(',').map(s=>s.trim()).filter(Boolean); }
    }
    if(!Array.isArray(u.roles)) u.roles = u.rol ? [u.rol] : ['vendedor'];
    if(!u.rol) u.rol = u.roles[0] || 'vendedor';
    if(u.activo===undefined||u.activo===null) u.activo = true;
  });
  return users;
}

function addRipple(e){
  const btn=e.currentTarget;
  const r=document.createElement('span');
  r.className='ripple';
  const rect=btn.getBoundingClientRect();
  r.style.left=(e.clientX-rect.left)+'px';
  r.style.top=(e.clientY-rect.top)+'px';
  btn.appendChild(r);
  setTimeout(()=>r.remove(),500);
}

async function doLogin(){
  const u = document.getElementById('l-user').value.trim().toLowerCase();
  const p = document.getElementById('l-pass').value;
  // Recargar usuarios frescos de Supabase
  const freshUsers = await sbFetch('usuarios', 'GET', null, '?order=id.asc&limit=10000');
  if(freshUsers) _sbCache['usuarios'] = freshUsers;
  const users = getUsers();
  let user = users.find(x => (x.usuario?.toLowerCase()===u || x.email?.toLowerCase()===u) && x.password===p && x.activo!==false);
  if(!user){
    const err = document.getElementById('login-error');
    err.style.display='block';
    err.textContent='Usuario o contraseña incorrectos';
    document.getElementById('l-pass').value='';
    document.getElementById('l-pass').focus();
    return;
  }
  if(!Array.isArray(user.roles)||!user.roles.length){
    user.roles = user.rol ? [user.rol] : ['vendedor'];
  }
  user.rol = getPrimaryRole(user);
  currentUser = user;
  sessionStorage.setItem('mg_session', JSON.stringify({id:user.id, nombre:user.nombre, rol:user.rol, roles:user.roles, usuario:user.usuario, email:user.email||'', consultorId:user.consultorId||''}));
  await sbLoadAll();
  await loadApiKey();
  bootApp();
}

function doLogout(){
  currentUser = null;
  sessionStorage.removeItem('mg_session');
  document.body.classList.remove('theme-light','theme-steel');
  document.documentElement.style.setProperty('--font-scale',1.25);
  _currentFontScale=1;
  const _orb=document.getElementById('metoasist-orb');if(_orb)_orb.style.display='none';
  const _map=document.getElementById('metoasist-panel');if(_map)_map.classList.remove('open');
  document.getElementById('main-app').style.display = 'none';
  document.getElementById('hamburger').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('l-user').value = '';
  document.getElementById('l-pass').value = '';
  document.getElementById('login-error').style.display = 'none';
}

function bootApp(){
  trackActivity('login');
  const primaryRol = getPrimaryRole(currentUser);

  // Para clientes: ir directo al portal sin tocar el layout del sistema
  if(primaryRol === 'cliente'){
    document.body.classList.add('portal-mode');
    document.getElementById('login-screen').style.display = 'none';
    loadApiKey().then(()=>_lanzarPortalCliente());
    return;
  }

  // Para admin empresa: portal verde de carga de equipo
  if(primaryRol === 'admin_empresa'){
    document.body.classList.add('portal-mode');
    document.getElementById('login-screen').style.display = 'none';
    _lanzarPortalAdminEmpresa();
    return;
  }

  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('main-app').style.display = 'flex';
  document.getElementById('hamburger').style.display = '';
  userLoadPrefs();

  const initials = currentUser.nombre.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
  document.getElementById('sb-avatar').textContent = initials;
  document.getElementById('sb-name').textContent = currentUser.nombre;
  const rolesLabel = getUserRoles(currentUser).map(r=>ROLE_LABELS[r]||r).join(' · ');
  document.getElementById('sb-role').textContent = rolesLabel || primaryRol;

  applyRoleNav();

  if(getUserRoles(currentUser).includes('vendedor')){
    crmVendedorActivo = currentUser.nombre;
  }

  const home = ROLE_HOME[primaryRol] || 'dashboard';
  showPage(home);
  updateCobrosAlert();
  checkRecordatoriosVend();
  madInit();
  sueldosAutoLiquidar();
  zoiperProcessPending();
  const _rolesInt = ['admin','dueno','consultor','vendedor','contador'];
  if(_rolesInt.some(r => getUserRoles(currentUser).includes(r))){
    if(!AGENTE._intervalo) AGENTE.init();
  }
}

function applyRoleNav(){
  const userRoles = getUserRoles(currentUser);
  // Admin puro: mostrar nav-admin directamente al iniciar
  if(userRoles.includes('admin') && !userRoles.includes('dueno')){
    document.getElementById('nav-main').style.display='none';
    document.getElementById('nav-admin').style.display='';
    _inAdminModule = true;
  }
  document.querySelectorAll('.nav-item[data-roles]').forEach(el=>{
    const navRoles = el.getAttribute('data-roles').split(',');
    const visible = navRoles.some(r => userRoles.includes(r));
    el.classList.toggle('nav-hidden', !visible);
  });
  document.querySelectorAll('.nav-section').forEach(sec=>{
    const items = sec.querySelectorAll('.nav-item[data-roles]');
    const allHidden = items.length > 0 && Array.from(items).every(el=>el.classList.contains('nav-hidden'));
    sec.style.display = allHidden ? 'none' : '';
  });
}

// BACKUP / RESTORE
const BACKUP_KEYS=['auditorias','auditores','clientes','cotizaciones','gastos','cobros','vendedores','usuarios','crm_logs','crm_seguimientos','crm_objetivos','crm_premios','crm_notas_vend','crm_referidos','crm_bases_datos','crm_obj_dueno','impuestos','admin_ventas_pendientes','retiros_socios','ahorros','reparto_tc','rendiciones_gastos','entregas_consultor','notif_consultor','personal_sueldos','liquidaciones_sueldos','sueldos_config','portal_clientes','portal_diagnostico','portal_documentos','portal_chat','portal_plan_accion','portal_hitos','bpc_tablero_approvals'];

function exportBackup(){
  const data={version:1,fecha:new Date().toISOString(),datos:{}};
  BACKUP_KEYS.forEach(k=>data.datos[k]=S.get(k));
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  const d=new Date();
  a.download=`metogroup-backup-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('✅ Backup exportado correctamente');
}

function importBackup(event){
  const file=event.target.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const data=JSON.parse(e.target.result);
      if(!data.datos){toast('⚠️ Archivo de backup inválido');return;}
      if(!confirm(`¿Restaurar backup del ${new Date(data.fecha).toLocaleString('es-AR')}?\n\nEsto REEMPLAZARÁ todos los datos actuales.`))return;
      BACKUP_KEYS.forEach(k=>{if(data.datos[k]!==undefined)S.set(k,data.datos[k]);});
      toast('✅ Backup restaurado. Recargando...');
      setTimeout(()=>location.reload(),1200);
    }catch(err){toast('⚠️ Error al leer el archivo');}
  };
  reader.readAsText(file);
  event.target.value='';
}

// SIDEBAR MOBILE
function toggleSidebar(){
  const sb=document.querySelector('.sidebar');
  const ov=document.getElementById('sidebar-overlay');
  const hb=document.getElementById('hamburger');
  const open=sb.classList.toggle('open');
  ov.classList.toggle('open',open);
  hb.textContent=open?'✕':'☰';
}
function closeSidebarMobile(){
  if(window.innerWidth>700)return;
  const sb=document.querySelector('.sidebar');
  if(sb&&sb.classList.contains('open'))toggleSidebar();
}

// SIDEBAR MOBILE
function canAccess(page){
  if(!currentUser) return false;
  return getAllowedPages(currentUser).includes(page);
}

const _origShowPage = showPage;
showPage = function(name){
  if(currentUser && !canAccess(name) && !name.startsWith('portal_')){
    toast('⛔ Sin acceso a esta sección');
    return;
  }
  closeSidebarMobile();
  _origShowPage(name);
  if(typeof mclShow==='function')setTimeout(mclShow,100);
};

// Save/edit users: ensure password field is included
function saveUsuario(){
  const id=document.getElementById('usu-id').value;
  const roles=['dueno','admin','consultor','vendedor','cliente'].filter(r=>document.getElementById('usu-rol-'+r)?.checked);
  if(!roles.length){toast('⚠️ Seleccioná al menos un rol');return;}
  const primaryRol=ROLE_PRIORITY.find(r=>roles.includes(r))||roles[0];
  const item={
    id:id?Number(id):S.nextId('usuarios'),
    nombre:document.getElementById('usu-nombre').value.trim(),
    usuario:document.getElementById('usu-usuario').value.trim(),
    email:document.getElementById('usu-email').value.trim(),
    password:document.getElementById('usu-password').value,
    rol:primaryRol,
    roles:roles,
    activo:document.getElementById('usu-activo').value==='true',
    calendly:document.getElementById('usu-calendly').value.trim()||'',
    calendly2:document.getElementById('usu-calendly2').value.trim()||'',
    consultorId:document.getElementById('usu-consultorId')?.value||'',
    email_nombre:document.getElementById('usu-email-nombre').value.trim()||'',
    email_cargo:document.getElementById('usu-email-cargo').value.trim()||'',
    email_tel:document.getElementById('usu-email-tel').value.trim()||'',
    email_logo:document.getElementById('usu-email-logo').value.trim()||'',
    email_firma_extra:document.getElementById('usu-email-firma-extra').value.trim()||''
  };
  // Auto-vincular consultor si no se eligió manualmente
  if(item.roles.includes('consultor')&&!item.consultorId&&item.nombre){
    const auditores=S.get('auditores');
    const match=auditores.find(a=>a.nombre.toLowerCase().trim()===item.nombre.toLowerCase().trim())||auditores.find(a=>a.email&&item.email&&a.email.toLowerCase()===item.email.toLowerCase());
    if(match)item.consultorId=String(match.id);
  }
  if(!item.nombre||!item.usuario||!item.password){toast('⚠️ Completá nombre, usuario y contraseña');return;}
  let items=S.get('usuarios');
  if(!items.length){items=[{id:1,nombre:'Administrador',usuario:'admin',password:'admin123',rol:'dueno',roles:['dueno'],email:'admin@metogroup.com',activo:true}];}
  if(id){
    const i=items.findIndex(x=>x.id===Number(id));
    if(i>-1){
      if(!item.password) item.password = items[i].password;
      items[i]=item;
    }
  } else items.push(item);
  S.set('usuarios',items);

  // ── Sincronización automática: si tiene rol vendedor, crear/actualizar en tabla vendedores
  if(roles.includes('vendedor')&&item.activo!==false){
    const vends=S.get('vendedores');
    const vIdx=vends.findIndex(v=>v.nombre===item.nombre||v._usuarioId===item.id);
    if(vIdx>-1){
      // Actualizar nombre y email si cambiaron
      vends[vIdx].nombre=item.nombre;
      vends[vIdx].email=item.email||vends[vIdx].email||'';
      vends[vIdx]._usuarioId=item.id;
    } else {
      // Crear nuevo vendedor automáticamente
      vends.push({
        id:S.nextId('vendedores'),
        nombre:item.nombre,
        email:item.email||'',
        tel:'',
        sueldo:0,
        comision:300,
        ingreso:'',
        estado:'Activo',
        _usuarioId:item.id
      });
      toast('✅ Usuario guardado y agregado al equipo de vendedores automáticamente');
      S.set('vendedores',vends);
      closeModal('modal-usuario');
      renderUsuarios();
      return;
    }
    S.set('vendedores',vends);
  }

  // ── Sincronización automática: si tiene rol consultor, crear/actualizar en tabla auditores
  if(roles.includes('consultor')&&item.activo!==false){
    const auditores=S.get('auditores');
    const aIdx=auditores.findIndex(a=>a.nombre.toLowerCase().trim()===item.nombre.toLowerCase().trim()||a._usuarioId===item.id);
    if(aIdx>-1){
      // Actualizar nombre y email si cambiaron
      auditores[aIdx].nombre=item.nombre;
      auditores[aIdx].email=item.email||auditores[aIdx].email||'';
      auditores[aIdx]._usuarioId=item.id;
      if(!auditores[aIdx].estado||auditores[aIdx].estado==='undefined')auditores[aIdx].estado='Activo';
      // Auto-vincular si no estaba
      if(!item.consultorId)item.consultorId=String(auditores[aIdx].id);
    } else {
      // Crear nuevo consultor automáticamente
      const newAuditor={
        id:S.nextId('auditores'),
        nombre:item.nombre,
        email:item.email||'',
        tel:'',
        direccion:'',
        pais:'Argentina',
        especialidad:'General',
        titulo:'',
        certificaciones:'',
        bio:'',
        honorarios:'300',
        formapago:'Transferencia',
        cbu:'',
        estado:'Activo',
        drive:'',
        notas:'Creado automáticamente desde Usuarios',
        maxauds:'4',
        maximpls:'2',
        dni:'',
        _usuarioId:item.id
      };
      auditores.push(newAuditor);
      item.consultorId=String(newAuditor.id);
      toast('✅ Usuario guardado y agregado como consultor automáticamente');
      S.set('auditores',auditores);
      // Update the user with the consultorId link
      let items2=S.get('usuarios');
      const ui=items2.findIndex(x=>x.id===item.id);
      if(ui>-1){items2[ui].consultorId=item.consultorId;S.set('usuarios',items2);}
      closeModal('modal-usuario');
      renderUsuarios();
      return;
    }
    S.set('auditores',auditores);
    // Update consultorId link if found
    if(item.consultorId){
      let items2=S.get('usuarios');
      const ui=items2.findIndex(x=>x.id===item.id);
      if(ui>-1&&!items2[ui].consultorId){items2[ui].consultorId=item.consultorId;S.set('usuarios',items2);}
    }
  }

  closeModal('modal-usuario');
  renderUsuarios();
  trackActivity('save:usuario');toast('✅ Usuario guardado');
}

// Sincronizar todos los usuarios vendedor existentes que no estén en la tabla vendedores
function sincVendedoresDesdeUsuarios(){
  const usuarios=S.get('usuarios');
  const vends=S.get('vendedores');
  let nuevos=0;
  usuarios.forEach(u=>{
    const roles=Array.isArray(u.roles)&&u.roles.length?u.roles:(u.rol?[u.rol]:[]);
    if(!roles.includes('vendedor')) return;
    if(u.activo===false) return;
    const existe=vends.find(v=>v.nombre===u.nombre||v._usuarioId===u.id);
    if(!existe){
      vends.push({
        id:S.nextId('vendedores'),
        nombre:u.nombre,
        email:u.email||'',
        tel:'',sueldo:0,comision:300,ingreso:'',estado:'Activo',
        _usuarioId:u.id
      });
      nuevos++;
    } else {
      // Asegurar que tenga _usuarioId
      const i=vends.indexOf(existe);
      vends[i]._usuarioId=u.id;
    }
  });
  if(nuevos>0){
    S.set('vendedores',vends);
    toast(`✅ ${nuevos} vendedor(es) sincronizado(s) desde usuarios`);
  }
  return nuevos;
}

function sincConsultoresDesdeUsuarios(){
  const usuarios=S.get('usuarios');
  const auditores=S.get('auditores');
  let nuevos=0;
  usuarios.forEach(u=>{
    const roles=Array.isArray(u.roles)&&u.roles.length?u.roles:(u.rol?[u.rol]:[]);
    if(!roles.includes('consultor'))return;
    if(u.activo===false)return;
    const existe=auditores.find(a=>a.nombre.toLowerCase().trim()===u.nombre.toLowerCase().trim()||a._usuarioId===u.id);
    if(!existe){
      const newA={id:S.nextId('auditores'),nombre:u.nombre,email:u.email||'',tel:'',direccion:'',pais:'Argentina',especialidad:'General',titulo:'',certificaciones:'',bio:'',honorarios:'300',formapago:'Transferencia',cbu:'',estado:'Activo',drive:'',notas:'Sincronizado desde Usuarios',maxauds:'4',maximpls:'2',dni:'',_usuarioId:u.id};
      auditores.push(newA);
      // Auto-vincular
      u.consultorId=String(newA.id);
      nuevos++;
    } else {
      existe._usuarioId=u.id;
      if(!existe.estado||existe.estado==='undefined')existe.estado='Activo';
      if(!u.consultorId)u.consultorId=String(existe.id);
    }
  });
  if(nuevos>0){
    S.set('auditores',auditores);
    S.set('usuarios',usuarios);
    toast(`✅ ${nuevos} consultor(es) sincronizado(s) desde usuarios`);
  } else {
    toast('ℹ️ Todos los consultores ya están sincronizados');
  }
  return nuevos;
}

function renderUsuarios(){
  if(!ANTHROPIC_API_KEY) ANTHROPIC_API_KEY = localStorage.getItem('METO_anthropic_key')||'';
  const items=getUsers();
  const el=document.getElementById('usuarios-list');
  const ROLE_ICONS={dueno:'👑',admin:'🖥️',consultor:'🔬',vendedor:'🏆',cliente:'🏢'};
  const keyMask=ANTHROPIC_API_KEY?('sk-ant-...'+ANTHROPIC_API_KEY.slice(-6)):'❌ No configurada';
  el.innerHTML=`
    <div style="background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.2);border-radius:12px;padding:14px 18px;margin-bottom:20px;font-size:12px;color:var(--muted)">
      👑 <strong style="color:var(--text)">Dueño</strong> — Acceso total &nbsp;·&nbsp;
      🖥️ <strong style="color:var(--text)">Administrativo</strong> — Facturación, números, consultores, calendario &nbsp;·&nbsp;
      🔬 <strong style="color:var(--text)">Consultor</strong> — Sus empresas y calendario &nbsp;·&nbsp;
      🏆 <strong style="color:var(--text)">Vendedor</strong> — Su CRM y ranking
    </div>
    ${currentUser.rol==='dueno'?`
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700">🤖 MetoAsist — API Key</div>
        <span style="font-size:11px;color:${ANTHROPIC_API_KEY?'var(--accent3)':'var(--danger)'}">${keyMask}</span>
      </div>
      <div style="display:flex;gap:8px">
        <input id="cfg-apikey" type="password" placeholder="Pegar API key de Anthropic (sk-ant-api03-...)" style="flex:1;font-size:12px" value="${ANTHROPIC_API_KEY||''}">
        <button class="btn btn-primary btn-sm" onclick="
          const k=document.getElementById('cfg-apikey').value.trim();
          if(!k){toast('⚠️ La API key no puede estar vacía');return;}
          if(!k.startsWith('sk-')){toast('⚠️ La key debe empezar con sk-');return;}
          saveApiKey(k);renderUsuarios();toast('✅ API Key guardada — respaldada en 4 lugares');
        ">💾 Guardar</button>
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('cfg-apikey').type=document.getElementById('cfg-apikey').type==='password'?'text':'password'">👁</button>
      </div>
      <div style="font-size:10px;color:var(--muted);margin-top:6px">La key se guarda en Supabase, no en el código. Obtenela en <a href='https://platform.claude.com/settings/keys' target='_blank' style='color:var(--accent)'>platform.claude.com</a></div>
    </div>
    ${(()=>{
      const ec = JSON.parse(localStorage.getItem('METO_smtp_config')||'{}');
      const ok = ec.user && ec.pass;
      return `
    <div style="background:var(--surface);border:1px solid ${ok?'rgba(200,168,74,0.25)':'rgba(239,68,68,0.25)'};border-radius:12px;padding:16px;margin-bottom:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700">📧 SMTP del Agente — Hernán Quiroz</div>
        <span style="font-size:11px;color:${ok?'var(--accent3)':'var(--danger)'}">${ok?'✅ Configurado — '+ec.user:'❌ Sin configurar'}</span>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:12px">Todos los mails automáticos del agente salen desde esta cuenta. Los mails manuales de cada usuario usan su propia bandeja en Correos.</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div>
          <label style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:4px">Email del agente</label>
          <input id="cfg-smtp-user" type="email" placeholder="Hernanquiroz@metogroup.ar" value="${ec.user||''}" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-size:13px;box-sizing:border-box">
        </div>
        <div>
          <label style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:4px">Contraseña SMTP</label>
          <input id="cfg-smtp-pass" type="password" placeholder="Contraseña del email" value="${ec.pass||''}" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-size:13px;box-sizing:border-box">
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn btn-primary btn-sm" onclick="
          const u=document.getElementById('cfg-smtp-user').value.trim();
          const p=document.getElementById('cfg-smtp-pass').value.trim();
          if(!u||!p){toast('⚠️ Completá email y contraseña');return;}
          localStorage.setItem('METO_smtp_config',JSON.stringify({user:u,pass:p}));
          const all=S.get('email_config')||[];
          const cfg={id:all[0]?.id||1,smtp_user:u,smtp_pass:p};
          S.set('email_config',[cfg]);
          renderUsuarios();
          toast('✅ SMTP del agente configurado');
        ">💾 Guardar</button>
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('cfg-smtp-pass').type=document.getElementById('cfg-smtp-pass').type==='password'?'text':'password'">👁</button>
        ${ok?`<button class="btn btn-sm" style="background:rgba(239,68,68,0.1);color:var(--danger);border:1px solid rgba(239,68,68,0.3)" onclick="localStorage.removeItem('METO_smtp_config');S.set('email_config',[]);renderUsuarios();toast('🗑 Configuración eliminada')">🗑 Borrar</button>`:''}
      </div>
      <div style="font-size:10px;color:var(--muted);margin-top:8px">Usá las credenciales SMTP de Donweb para Hernanquiroz@metogroup.ar</div>
    </div>`;
    })()}
    <div style="background:var(--surface);border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:16px;margin-bottom:20px">
      <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;margin-bottom:12px">🏆 Control de Rankings — Visibilidad para Vendedores</div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div>
          <div style="font-size:13px;font-weight:600">Estado actual: <span style="color:${appCfg('rankingActivo',true)?'var(--accent3)':'var(--danger)'}">${appCfg('rankingActivo',true)?'✅ Activo — Vendedores pueden ver el ranking':'❌ Desactivado — Vendedores ven el mensaje personalizado'}</span></div>
          <div style="font-size:11px;color:var(--muted);margin-top:3px">Vos siempre podés ver el ranking independientemente de este setting.</div>
        </div>
        <button class="btn ${appCfg('rankingActivo',true)?'btn-danger':'btn-primary'} btn-sm" onclick="setAppConfig({rankingActivo:${!appCfg('rankingActivo',true)}});renderUsuarios();try{renderRankings()}catch(e){};toast('${appCfg('rankingActivo',true)?'🔒 Ranking ocultado para vendedores':'✅ Ranking activado para vendedores'}')">
          ${appCfg('rankingActivo',true)?'🔒 Desactivar ranking':'🔓 Activar ranking'}
        </button>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <input id="cfg-ranking-msg" type="text" placeholder="Mensaje que verán los vendedores cuando el ranking esté desactivado..." value="${(appCfg('rankingMensaje','El ranking está temporalmente desactivado. ¡Seguí trabajando fuerte! 💪')||'').replace(/"/g,'&quot;')}" style="flex:1;font-size:12px">
        <button class="btn btn-secondary btn-sm" onclick="setAppConfig({rankingMensaje:document.getElementById('cfg-ranking-msg').value.trim()||'El ranking está temporalmente desactivado. ¡Seguí trabajando fuerte! 💪'});toast('💾 Mensaje guardado')">💾 Guardar mensaje</button>
      </div>
    </div>`:''}`+`
    <div class="grid-3">${items.map(u=>`
      <div class="card" style="border-color:${u.id===currentUser?.id?'rgba(212,175,55,0.4)':'var(--border)'}">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
          <div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,var(--accent2),var(--accent));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#fff;flex-shrink:0">${u.nombre.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase()}</div>
          <div style="flex:1;min-width:0">
            <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${u.nombre}</div>
            <div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px">
              ${(Array.isArray(u.roles)&&u.roles.length?u.roles:[u.rol||'vendedor']).map(r=>`<span class="role-badge role-${r}">${ROLE_ICONS[r]||''} ${ROLE_LABELS[r]||r}</span>`).join('')}
            </div>
          </div>
          <div style="display:flex;gap:5px">
            <button class="btn btn-secondary btn-sm" onclick="editUsuario(${u.id})">✏️</button>
            ${u.id!==currentUser?.id?`<button class="btn btn-danger btn-sm" onclick="delItem('usuarios',${u.id},renderUsuarios)">🗑</button>`:''}
          </div>
        </div>
        <div style="display:grid;gap:6px;font-size:11px">
          <div style="display:flex;gap:8px;color:var(--muted)"><span>👤</span><span>${u.usuario}</span></div>
          <div style="display:flex;gap:8px;color:var(--muted)"><span>📧</span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${u.email||'-'}</span></div>
          <div style="display:flex;gap:8px;align-items:center"><span style="font-size:10px;color:var(--muted)">Estado:</span><span style="color:${u.activo!==false?'var(--accent3)':'var(--danger)'}">${u.activo!==false?'● Activo':'● Inactivo'}</span>${u.id===currentUser?.id?`<span style="margin-left:auto;font-size:10px;color:var(--accent)">(vos)</span>`:''}</div>
          ${u.rol==='vendedor'?`<div style="display:flex;gap:8px;align-items:center;margin-top:2px"><span>🗓</span><span style="font-size:10px;color:${u.calendly?'var(--accent3)':'var(--muted)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${u.calendly?(u.calendly2?'2 Calendly configurados':'1 Calendly configurado'):'Sin Calendly'}</span></div>`:''}
        </div>
      </div>`).join('')}</div>`;
}

function editUsuario(id){
  const u=getUsers().find(x=>x.id===id);if(!u)return;
  openModal('modal-usuario','edit');
  document.getElementById('usu-id').value=id;
  document.getElementById('usu-nombre').value=u.nombre;
  document.getElementById('usu-usuario').value=u.usuario||'';
  document.getElementById('usu-email').value=u.email||'';
  document.getElementById('usu-password').value=u.password||'';
  // Cargar roles (compatibilidad con usuarios de rol único)
  const roles=Array.isArray(u.roles)&&u.roles.length?u.roles:(u.rol?[u.rol]:[]);
  ['dueno','admin','consultor','vendedor','cliente'].forEach(r=>{
    const cb=document.getElementById('usu-rol-'+r);
    if(cb) cb.checked=roles.includes(r);
  });
  document.getElementById('usu-activo').value=u.activo!==false?'true':'false';
  document.getElementById('usu-calendly').value=u.calendly||'';
  document.getElementById('usu-calendly2').value=u.calendly2||'';
  usu_updateCalendlyVis();
  // Set consultorId after dropdown is populated by usu_updateCalendlyVis
  if(u.consultorId&&document.getElementById('usu-consultorId')){document.getElementById('usu-consultorId').value=u.consultorId;}
  // Firma de email
  document.getElementById('usu-email-nombre').value=u.email_nombre||'';
  document.getElementById('usu-email-cargo').value=u.email_cargo||'';
  document.getElementById('usu-email-tel').value=u.email_tel||'';
  document.getElementById('usu-email-logo').value=u.email_logo||'';
  document.getElementById('usu-email-firma-extra').value=u.email_firma_extra||'';
  document.getElementById('m-usu-title').textContent='Editar Usuario';
}

function usu_updateCalendlyVis(){
  const esVendedor=document.getElementById('usu-rol-vendedor')?.checked;
  const esConsultor=document.getElementById('usu-rol-consultor')?.checked;
  const wrap=document.getElementById('usu-calendly-wrap');
  if(wrap) wrap.style.display=esVendedor?'block':'none';
  const cWrap=document.getElementById('usu-consultor-wrap');
  if(cWrap){
    cWrap.style.display=esConsultor?'block':'none';
    if(esConsultor){
      const sel=document.getElementById('usu-consultorId');
      const current=sel.value;
      const auditores=S.get('auditores');
      sel.innerHTML='<option value="">— Sin vincular —</option>'+auditores.map(a=>`<option value="${a.id}">${a.nombre} (${a.especialidad})</option>`).join('');
      if(current)sel.value=current;
    }
  }
}

// ── PREMIO DEL MES (global, todos los vendedores lo ven) ─────
function abrirPremioMes(){
  const ym=todayStr().substring(0,7);
  const pm=S.get('crm_premios')||[];
  const actual=pm.find(x=>x.ym===ym)||null;
  document.getElementById('pm-mes').value=actual?.ym||ym;
  document.getElementById('pm-nombre').value=actual?.nombre||'';
  document.getElementById('pm-desc').value=actual?.desc||'';
  document.getElementById('pm-tipo').value=actual?.tipo||'pct';
  document.getElementById('pm-pct').value=actual?.premioPct||100;
  document.getElementById('pm-modal-title').textContent='🏅 Premio del mes — general para el equipo';
  const _mpm=document.getElementById('modal-premio-mes');if(_mpm)_mpm.classList.add('open');
}

function abrirPremioVendedor(vendId){
  abrirPremioMes();
  // Solo cambia el título para contexto visual, el premio sigue siendo general
  const vend=S.get('vendedores').find(x=>x.id===vendId);
  if(vend) document.getElementById('pm-modal-title').textContent='🏅 Premio del mes (visible para todos)';
}

function savePremioMes(){
  const ym=document.getElementById('pm-mes').value;
  const nombre=document.getElementById('pm-nombre').value.trim();
  if(!ym||!nombre){toast('⚠️ Completá el mes y el nombre del premio');return;}
  const pm=S.get('crm_premios')||[];
  const idx=pm.findIndex(x=>x.ym===ym);
  const item={
    id: idx>-1 ? pm[idx].id : S.nextId('crm_premios'),
    ym,
    nombre,
    desc:document.getElementById('pm-desc').value,
    tipo:document.getElementById('pm-tipo').value,
    premioPct:Number(document.getElementById('pm-pct').value)||100
  };
  if(idx>-1)pm[idx]=item;else pm.push(item);
  S.set('crm_premios',pm);
  closeModal('modal-premio-mes');
  toast('🏅 Premio publicado — aparece en el dashboard de todos los vendedores');
}


function eliminarPremioMes(){
  const ym=document.getElementById('pm-mes').value;
  if(!confirm('¿Quitar el premio de '+ym+'?'))return;
  const pm=(S.get('crm_premios')||[]).filter(x=>x.ym!==ym);
  S.set('crm_premios',pm);
  closeModal('modal-premio-mes');
  toast('Premio eliminado');
}

// ── CRM COMERCIAL — renderCRM (router por rol) ─────────────
function renderCRM(){
  if(currentUser?.rol==='admin'&&!getUserRoles(currentUser).includes('dueno')){
    const el=document.getElementById('crm-content');
    if(el)el.innerHTML='<div class="empty-state"><div class="icon">🔒</div><h3>Acceso restringido</h3><p>Esta sección es solo para la dirección.</p></div>';
    return;
  }
  if(currentUser?.rol==='vendedor'){
    _renderVendedorDash();
  } else {
    _renderCRMSupervisor();
  }
}

// ── CRM SUPERVISOR ──────────────────────────────────────────
function _renderCRMSupervisor(){
  const el=document.getElementById('crm-content');
  if(!el)return;
  const sel=document.getElementById('crm-vsel');
  if(sel){
    const vends=S.get('vendedores');
    sel.innerHTML='<option value="">Todos los vendedores</option>'+vends.map(v=>`<option value="${v.nombre}"${crmVendedorActivo===v.nombre?' selected':''}>${v.nombre}</option>`).join('');
  }
  const allVends=S.get('vendedores');
  if(!allVends.length){el.innerHTML=`<div class="empty-state"><div class="icon">🏆</div><h3>Sin vendedores</h3><p>Agregá vendedores desde la sección Vendedores</p></div>`;return;}

  // Tabs
  const tabs=[['actividad','📊 Actividad'],['pipeline','🎯 Pipeline'],['seguimientos','📋 Seguimientos']];
  const tabBar=`<div style="display:flex;gap:4px;margin-bottom:22px;border-bottom:1px solid rgba(212,175,55,0.09);padding-bottom:0">
    ${tabs.map(([k,lb])=>`<button onclick="crmTabActivo='${k}';_renderCRMSupervisor()" style="padding:10px 18px;font-size:12px;font-weight:700;font-family:'DM Mono',monospace;border:none;border-bottom:2px solid ${crmTabActivo===k?'var(--accent)':'transparent'};background:transparent;color:${crmTabActivo===k?'var(--accent)':'var(--muted)'};cursor:pointer;transition:all 0.15s;border-radius:4px 4px 0 0;margin-bottom:-1px">${lb}</button>`).join('')}
  </div>`;

  if(crmTabActivo==='pipeline'){
    el.innerHTML=tabBar+_renderPipelineKanban(allVends);
    _initPipelineDragDrop();
    return;
  }
  if(crmTabActivo==='seguimientos'){
    el.innerHTML=tabBar+_renderCRMSeguimientosSupervisor(allVends);
    return;
  }

  // Tab actividad (original)
  const ym=todayStr().substring(0,7);
  const filtVends=crmVendedorActivo?allVends.filter(v=>v.nombre===crmVendedorActivo):allVends;
  const stats=filtVends.map(v=>{
    const logs=S.get('crm_logs').filter(l=>l.vendedor===v.nombre&&l.fecha.startsWith(ym));
    const obj=S.get('crm_objetivos').find(x=>x.ym===ym&&String(x.vendedorId)===String(v.id));
    const ll=logs.reduce((s,l)=>s+(l.llamadas||0),0);
    const du=logs.reduce((s,l)=>s+(l.duenos||0),0);
    const ag=logs.reduce((s,l)=>s+(l.agendadas||0),0);
    const ci=logs.reduce((s,l)=>s+(l.cerradas||0),0);
    return{v,obj,ll,du,ag,ci};
  }).sort((a,b)=>b.ci-a.ci);
  const tLL=stats.reduce((s,x)=>s+x.ll,0),tDU=stats.reduce((s,x)=>s+x.du,0),tCI=stats.reduce((s,x)=>s+x.ci,0);
  const tConv=tLL>0?Math.round(tCI/tLL*100):0;
  const maxCI=Math.max(...stats.map(x=>x.ci),1);
  const medals=['🥇','🥈','🥉'];
  const mNames=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  el.innerHTML=tabBar+`
  <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;margin-bottom:4px">CRM Comercial — ${mNames[parseInt(ym.split('-')[1])-1]} ${ym.split('-')[0]}</div>
  <div style="font-size:12px;color:var(--muted);margin-bottom:18px">${filtVends.length} vendedor${filtVends.length!==1?'es':''} · mes actual</div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px">
    ${[['📞',tLL,'Llamadas','var(--accent)','llamadas'],['👤',tDU,'Dueños','#c8a84a','duenos'],['🏆',tCI,'Cierres','var(--accent3)','cerradas'],['📊',tConv+'%','Conversión',tConv>=20?'var(--accent3)':tConv>=10?'var(--warn)':'var(--danger)','conversion']].map(([ic,v,lb,cl,k])=>`
    <div onclick="crmSuperDrill('${k}','${ym}')" style="background:rgba(255,255,255,0.04);border-radius:12px;padding:14px 16px;cursor:pointer;transition:all 0.15s;border:1px solid transparent" onmouseover="this.style.borderColor='${cl}';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='transparent';this.style.transform=''">
      <div style="font-size:20px;margin-bottom:6px">${ic}</div>
      <div style="font-family:'Syne',sans-serif;font-size:30px;font-weight:800;color:${cl};line-height:1">${v}</div>
      <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:4px">${lb}</div>
    </div>`).join('')}
  </div>
  <div class="grid-2">
    <div class="card">
      <div class="card-title" style="margin-bottom:16px;color:var(--accent)">🏆 Ranking del mes</div>
      ${stats.map((x,i)=>{
        const pct=Math.round(x.ci/maxCI*100);
        const objP=x.obj?.cerradas?Math.min(Math.round(x.ci/x.obj.cerradas*100),100):null;
        return`<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid rgba(212,175,55,0.08);cursor:pointer" onclick="abrirCRMVendedor(${x.v.id})">
          <div style="width:28px;text-align:center;font-size:${i<3?'18':'13'}px">${medals[i]||'#'+(i+1)}</div>
          <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--accent2),var(--accent));display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:#fff;flex-shrink:0">${x.v.nombre.substring(0,2).toUpperCase()}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600">${x.v.nombre}</div>
            <div style="height:5px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;margin-top:5px"><div style="height:100%;width:${pct}%;background:var(--accent3);border-radius:3px"></div></div>
            ${objP!==null?`<div style="font-size:10px;color:var(--muted);margin-top:2px">Objetivo: ${objP}%</div>`:''}
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--accent3)">${x.ci}</div>
            <div style="font-size:10px;color:var(--muted)">cierres</div>
          </div>
        </div>`;
      }).join('')}
    </div>
    <div style="display:flex;flex-direction:column;gap:12px">
      ${stats.map(x=>{
        const obj=x.obj;
        const avgP=obj?Math.round([obj.llamadas?x.ll/obj.llamadas:null,obj.duenos?x.du/obj.duenos:null,obj.agendadas?x.ag/obj.agendadas:null,obj.cerradas?x.ci/obj.cerradas:null].filter(p=>p!==null).reduce((s,p,_,a)=>s+p/a.length,0)*100):null;
        const segsV=S.get('crm_seguimientos').filter(s=>s.vendedor===x.v.nombre&&!s.hecho&&s.fecha<todayStr()).length;
        return`<div class="person-card" style="cursor:pointer" onclick="abrirCRMVendedor(${x.v.id})">
          <div style="display:flex;align-items:center;gap:12px">
            <div class="person-avatar" style="background:linear-gradient(135deg,var(--accent2),var(--accent))">${x.v.nombre.substring(0,2).toUpperCase()}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:14px">${x.v.nombre}</div>
              <div style="font-size:11px;color:var(--muted)">${x.v.email||'Sin email'}</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              ${segsV?`<span style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);border-radius:20px;padding:3px 9px;font-size:10px;color:var(--danger)">🔴 ${segsV} venc.</span>`:''}
              ${avgP!==null?`<span style="background:${avgP>=100?'rgba(200,168,74,0.15)':avgP>=70?'rgba(245,158,11,0.12)':'rgba(239,68,68,0.1)'};border:1px solid ${avgP>=100?'rgba(200,168,74,0.3)':avgP>=70?'rgba(245,158,11,0.3)':'rgba(239,68,68,0.3)'};border-radius:20px;padding:3px 9px;font-size:11px;font-weight:700;color:${avgP>=100?'var(--accent3)':avgP>=70?'var(--warn)':'var(--danger)'}">${avgP}%</span>`:''}
              <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();abrirObjetivos(${x.v.id})">🎯 Obj</button>
              <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();openLogModal('${x.v.nombre}')">+ Log</button>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px">
            ${[['📞',x.ll,'Llamadas','var(--accent)'],['👤',x.du,'Dueños','#c8a84a'],['📅',x.ag,'Agendadas','var(--warn)'],['🏆',x.ci,'Cierres','var(--accent3)']].map(([ic,v,lb,cl])=>`
            <div class="v-stat"><div class="v-stat-label">${ic} ${lb}</div><div class="v-stat-value" style="color:${cl}">${v}</div></div>`).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

// ── PIPELINE KANBAN ──────────────────────────────────────────
const PIPELINE_ETAPAS=[
  {key:'prospecto',  label:'Prospecto',    icon:'🔍', color:'#c8a84a', bg:'rgba(167,139,250,0.08)', bd:'rgba(167,139,250,0.25)'},
  {key:'contactado', label:'Contactado',   icon:'📞', color:'var(--accent)', bg:'rgba(212,175,55,0.08)', bd:'rgba(212,175,55,0.25)'},
  {key:'propuesta',  label:'Propuesta',    icon:'📄', color:'var(--warn)', bg:'rgba(245,158,11,0.08)', bd:'rgba(245,158,11,0.25)'},
  {key:'negociacion',label:'Negociación',  icon:'🤝', color:'#f472b6', bg:'rgba(244,114,182,0.08)', bd:'rgba(244,114,182,0.25)'},
  {key:'cierre',     label:'Cierre',       icon:'🏆', color:'var(--accent3)', bg:'rgba(200,168,74,0.08)', bd:'rgba(200,168,74,0.25)'},
];

function _getPipelineEmpresas(){
  // Usa crm_bases_datos. Si no tienen etapaPipeline, se infiere del campo 'estado'
  const empresas=S.get('crm_bases_datos')||[];
  return empresas.map(e=>{
    let etapa=e.etapaPipeline||'';
    if(!etapa){
      const est=(e.estado||'').toLowerCase();
      if(est==='activo'||est==='cliente')etapa='cierre';
      else if(est==='no interesado'||est==='perdido')etapa=''; // excluir
      else if(est==='prospecto')etapa='prospecto';
      else if(est==='contactado')etapa='contactado';
      else etapa='prospecto';
    }
    return {...e, etapaPipeline:etapa};
  }).filter(e=>e.etapaPipeline&&e.etapaPipeline!=='excluir');
}

function _renderPipelineKanban(allVends){
  const today=todayStr();
  const filtVendNombre=crmVendedorActivo;
  let empresas=_getPipelineEmpresas();
  if(filtVendNombre) empresas=empresas.filter(e=>e.vendedor===filtVendNombre);

  // KPIs del pipeline
  const total=empresas.length;
  const montoTotal=empresas.reduce((s,e)=>s+(Number(e.montoEstimado)||0),0);
  const enCierre=empresas.filter(e=>e.etapaPipeline==='cierre').length;
  const enNeg=empresas.filter(e=>e.etapaPipeline==='negociacion').length;

  const kpis=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
    ${[
      ['🏢',total,'Empresas en pipeline','#c8a84a'],
      ['🤝',enNeg,'En negociación','#f472b6'],
      ['🏆',enCierre,'Cerradas','var(--accent3)'],
      ['💰',fmt(montoTotal),'Monto potencial','var(--accent)'],
    ].map(([ic,v,lb,cl])=>`<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:12px 14px">
      <div style="font-size:18px;margin-bottom:4px">${ic}</div>
      <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:${cl}">${v}</div>
      <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px">${lb}</div>
    </div>`).join('')}
  </div>`;

  // Kanban columns
  const cols=PIPELINE_ETAPAS.map(etapa=>{
    const cards=empresas.filter(e=>e.etapaPipeline===etapa.key);
    const colMonto=cards.reduce((s,e)=>s+(Number(e.montoEstimado)||0),0);

    const cardHtml=cards.map(e=>{
      const ultima=crmUltimaActividadEmpresa(e.empresa);
      let diasSinContacto=null;
      if(ultima?.fecha){
        const diff=Math.floor((new Date(today)-new Date(ultima.fecha))/(1000*60*60*24));
        diasSinContacto=diff;
      }
      const alertColor=diasSinContacto===null?'var(--muted)':diasSinContacto>14?'var(--danger)':diasSinContacto>7?'var(--warn)':'var(--accent3)';
      const montoEst=Number(e.montoEstimado)||0;

      return`<div class="pipeline-card" draggable="true"
        data-id="${e.id}" data-etapa="${etapa.key}"
        onclick="pipelineAbrirEmpresa(${e.id})"
        style="background:var(--surface);border:1px solid ${etapa.bd};border-radius:10px;padding:12px;margin-bottom:8px;cursor:pointer;transition:all 0.15s;position:relative"
        onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 16px rgba(0,0,0,0.3)'"
        onmouseout="this.style.transform='';this.style.boxShadow=''">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px">
          <div style="font-size:12px;font-weight:700;color:var(--text);line-height:1.3;flex:1">${e.empresa}</div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0">
            ${montoEst?`<div style="font-size:10px;font-weight:700;color:${etapa.color}">${fmt(montoEst)}</div>`:''}
            <button onclick="event.stopPropagation();pipelineMoverEtapa(${e.id})" style="font-size:9px;padding:2px 6px;background:${etapa.bg};border:1px solid ${etapa.bd};border-radius:6px;color:${etapa.color};cursor:pointer;font-family:'DM Mono',monospace">Mover ›</button>
          </div>
        </div>
        ${e.rubro?`<div style="font-size:10px;color:var(--muted);margin-bottom:4px">${e.rubro}${e.ciudad?` · ${e.ciudad}`:''}</div>`:''}
        ${e.vendedor?`<div style="font-size:10px;color:var(--muted);margin-bottom:6px">👤 ${e.vendedor}</div>`:''}
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:10px;color:${alertColor};font-weight:${diasSinContacto!==null&&diasSinContacto>7?700:400}">
            ${diasSinContacto===null?'⚪ Sin contacto registrado':`${diasSinContacto>14?'🔴':diasSinContacto>7?'🟡':'🟢'} ${diasSinContacto}d sin contacto`}
          </div>
          <button onclick="event.stopPropagation();crmHistorialEmpresa('${e.empresa.replace(/'/g,"\\'")}');event.stopPropagation()" style="font-size:9px;padding:2px 5px;background:transparent;border:none;color:var(--muted);cursor:pointer" title="Ver historial">🔍</button>
        </div>
      </div>`;
    }).join('');

    return`<div class="pipeline-col" data-etapa="${etapa.key}"
      style="flex:1;min-width:180px;max-width:260px"
      ondragover="event.preventDefault();this.style.background='${etapa.bg.replace('0.08','0.18')}'"
      ondragleave="this.style.background=''"
      ondrop="pipelineDrop(event,'${etapa.key}');this.style.background=''">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid ${etapa.color}">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:14px">${etapa.icon}</span>
          <span style="font-family:'Syne',sans-serif;font-size:12px;font-weight:800;color:${etapa.color}">${etapa.label}</span>
          <span style="background:${etapa.bg};border:1px solid ${etapa.bd};border-radius:10px;padding:1px 7px;font-size:10px;font-weight:700;color:${etapa.color}">${cards.length}</span>
        </div>
        ${colMonto?`<div style="font-size:9px;color:${etapa.color};font-weight:700">${fmt(colMonto)}</div>`:''}
      </div>
      <div class="pipeline-cards-container" data-etapa="${etapa.key}" style="min-height:80px">
        ${cardHtml}
        ${!cards.length?`<div style="text-align:center;padding:20px 8px;color:var(--muted);font-size:11px;border:1px dashed rgba(255,255,255,0.06);border-radius:8px">Sin empresas<br>Arrastrá aquí</div>`:''}
      </div>
      <button onclick="pipelineAgregarEmpresa('${etapa.key}')" style="width:100%;margin-top:8px;padding:7px;border:1px dashed ${etapa.bd};border-radius:8px;background:transparent;color:${etapa.color};font-size:11px;cursor:pointer;transition:all 0.15s" onmouseover="this.style.background='${etapa.bg}'" onmouseout="this.style.background='transparent'">+ Agregar empresa</button>
    </div>`;
  }).join('');

  return`
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
    <div>
      <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800">🎯 Pipeline Comercial</div>
      <div style="font-size:11px;color:var(--muted)">Seguimiento de empresas por etapa de venta${filtVendNombre?' · '+filtVendNombre:''}</div>
    </div>
    <button onclick="pipelineAgregarEmpresa('')" class="btn btn-primary" style="font-size:12px">+ Nueva empresa al pipeline</button>
  </div>
  ${kpis}
  <div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:12px">
    ${cols}
  </div>`;
}

function _renderCRMSeguimientosSupervisor(allVends){
  const today=todayStr();
  const filtVendNombre=crmVendedorActivo;
  let segs=S.get('crm_seguimientos').filter(s=>!s.hecho);
  if(filtVendNombre) segs=segs.filter(s=>s.vendedor===filtVendNombre);
  segs.sort((a,b)=>a.fecha.localeCompare(b.fecha));

  const vencidos=segs.filter(s=>s.fecha<today);
  const hoy=segs.filter(s=>s.fecha===today);
  const proximos=segs.filter(s=>s.fecha>today);

  const renderSeg=(lista,titulo,color)=>{
    if(!lista.length)return'';
    return`<div style="margin-bottom:20px">
      <div style="font-size:11px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">${titulo} (${lista.length})</div>
      ${lista.map(s=>`<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--surface);border:1px solid rgba(212,175,55,0.08);border-left:3px solid ${color};border-radius:8px;margin-bottom:6px">
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:700;cursor:pointer;color:var(--accent)" onclick="crmHistorialEmpresa('${s.empresa.replace(/'/g,"\\'")}')">🏢 ${s.empresa}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${s.vendedor} · ${fmtD(s.fecha)}${s.contacto?' · '+s.contacto:''}</div>
          ${s.notas?`<div style="font-size:11px;color:var(--muted);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.notas}</div>`:''}
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button onclick="abrirSeguimiento('${s.vendedor}','${s.empresa.replace(/'/g,"\\'")}');" class="btn btn-secondary btn-sm" style="font-size:10px">+ Seg</button>
          <button onclick="if(confirm('¿Marcar como hecho?')){markSegHecho(${s.id})}" class="btn btn-sm" style="font-size:10px;background:rgba(200,168,74,0.15);border-color:rgba(200,168,74,0.3);color:var(--accent3)">✓ Hecho</button>
        </div>
      </div>`).join('')}
    </div>`;
  };

  const total=segs.length;
  return`
  <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;margin-bottom:4px">📋 Seguimientos Pendientes</div>
  <div style="font-size:11px;color:var(--muted);margin-bottom:18px">${total} seguimiento${total!==1?'s':''} pendiente${total!==1?'s':''}${filtVendNombre?' · '+filtVendNombre:' · todos los vendedores'}</div>
  ${!total?`<div class="empty-state"><div class="icon">✅</div><h3>Todo al día</h3><p>No hay seguimientos pendientes</p></div>`:''}
  ${renderSeg(vencidos,'⚠️ Vencidos','var(--danger)')}
  ${renderSeg(hoy,'📅 Para hoy','var(--warn)')}
  ${renderSeg(proximos,'📆 Próximos','var(--accent)')}`;
}

function _initPipelineDragDrop(){
  // Drag & drop nativo para las cards
  document.querySelectorAll('.pipeline-card').forEach(card=>{
    card.addEventListener('dragstart',e=>{
      e.dataTransfer.setData('pipeline-id',card.dataset.id);
      e.dataTransfer.setData('pipeline-etapa',card.dataset.etapa);
      card.style.opacity='0.5';
    });
    card.addEventListener('dragend',e=>{
      card.style.opacity='';
    });
  });
}

function pipelineDrop(event, nuevaEtapa){
  const id=event.dataTransfer.getData('pipeline-id');
  const etapaOrig=event.dataTransfer.getData('pipeline-etapa');
  if(!id||etapaOrig===nuevaEtapa)return;
  const empresas=S.get('crm_bases_datos')||[];
  const idx=empresas.findIndex(e=>String(e.id)===String(id));
  if(idx===-1)return;
  empresas[idx].etapaPipeline=nuevaEtapa;
  // Registrar en historial
  const histEntry={fecha:todayStr(),tipo:'pipeline',detalle:`Movida a etapa: ${PIPELINE_ETAPAS.find(e=>e.key===nuevaEtapa)?.label||nuevaEtapa}`,usuario:currentUser?.nombre||'Sistema'};
  try{empresas[idx].historial=JSON.parse(empresas[idx].historial||'[]');empresas[idx].historial.push(histEntry);empresas[idx].historial=JSON.stringify(empresas[idx].historial);}catch(e){empresas[idx].historial=JSON.stringify([histEntry]);}
  S.set('crm_bases_datos',empresas);
  _renderCRMSupervisor();
}

function pipelineMoverEtapa(id){
  const empresas=S.get('crm_bases_datos')||[];
  const emp=empresas.find(e=>String(e.id)===String(id));
  if(!emp)return;
  const etapaActual=emp.etapaPipeline||'prospecto';
  const idx=PIPELINE_ETAPAS.findIndex(e=>e.key===etapaActual);
  // Modal simple de selección
  const ops=PIPELINE_ETAPAS.map(e=>`<button onclick="pipelineSetEtapa(${id},'${e.key}');document.getElementById('modal-pipeline-mover').remove()" style="padding:10px 16px;border:1px solid ${e.bd||'var(--border)'};border-radius:8px;background:${e.bg||'transparent'};color:${e.color};font-size:12px;font-weight:700;cursor:pointer;text-align:left;display:flex;align-items:center;gap:8px">${e.icon} ${e.label}${e.key===etapaActual?' ✓':''}</button>`).join('');
  const div=document.createElement('div');
  div.id='modal-pipeline-mover';
  div.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999';
  div.innerHTML=`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:16px;padding:24px;min-width:260px;max-width:340px">
    <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:800;margin-bottom:4px">Mover empresa</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:16px">${emp.empresa}</div>
    <div style="display:flex;flex-direction:column;gap:8px">${ops}</div>
    <button onclick="document.getElementById('modal-pipeline-mover').remove()" style="margin-top:14px;width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;background:transparent;color:var(--muted);cursor:pointer;font-size:12px">Cancelar</button>
  </div>`;
  document.body.appendChild(div);
  div.onclick=e=>{if(e.target===div)div.remove();};
}

function pipelineSetEtapa(id, nuevaEtapa){
  const empresas=S.get('crm_bases_datos')||[];
  const idx=empresas.findIndex(e=>String(e.id)===String(id));
  if(idx===-1)return;
  const etapaLabel=PIPELINE_ETAPAS.find(e=>e.key===nuevaEtapa)?.label||nuevaEtapa;
  empresas[idx].etapaPipeline=nuevaEtapa;
  const histEntry={fecha:todayStr(),tipo:'pipeline',detalle:`Etapa actualizada a: ${etapaLabel}`,usuario:currentUser?.nombre||'Sistema'};
  try{let h=JSON.parse(empresas[idx].historial||'[]');h.push(histEntry);empresas[idx].historial=JSON.stringify(h);}catch(e){empresas[idx].historial=JSON.stringify([histEntry]);}
  S.set('crm_bases_datos',empresas);
  _renderCRMSupervisor();
}

function pipelineAbrirEmpresa(id){
  const emp=(S.get('crm_bases_datos')||[]).find(e=>String(e.id)===String(id));
  if(!emp)return;
  // Abre modal de edición de empresa en base de datos + sección pipeline
  pipelineModalDetalle(emp);
}

function pipelineModalDetalle(emp){
  const etapaActual=PIPELINE_ETAPAS.find(e=>e.key===emp.etapaPipeline)||PIPELINE_ETAPAS[0];
  const ultima=crmUltimaActividadEmpresa(emp.empresa);
  let histHtml='<div style="color:var(--muted);font-size:11px;text-align:center;padding:12px">Sin actividad registrada</div>';
  try{
    const hist=JSON.parse(emp.historial||'[]');
    if(hist.length){histHtml=hist.slice(-8).reverse().map(h=>`<div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid rgba(212,175,55,0.07)">
      <div style="font-size:10px;color:var(--muted);white-space:nowrap;min-width:72px">${fmtD(h.fecha)}</div>
      <div style="font-size:11px;flex:1">${h.detalle||h.tipo||'—'}</div>
    </div>`).join('');}
  }catch(e){}

  const div=document.createElement('div');
  div.id='modal-pipeline-detalle';
  div.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px';
  div.innerHTML=`<div style="background:var(--surface2);border:1px solid ${etapaActual.bd};border-radius:18px;padding:0;width:100%;max-width:520px;max-height:90vh;overflow:auto">
    <div style="background:${etapaActual.bg};padding:20px 24px;border-radius:18px 18px 0 0;border-bottom:1px solid ${etapaActual.bd}">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800">${emp.empresa}</div>
          <div style="font-size:11px;color:${etapaActual.color};font-weight:700;margin-top:2px">${etapaActual.icon} ${etapaActual.label}</div>
        </div>
        <button onclick="document.getElementById('modal-pipeline-detalle').remove()" style="background:transparent;border:none;color:var(--muted);font-size:20px;cursor:pointer">×</button>
      </div>
    </div>
    <div style="padding:20px 24px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px">
        ${[
          ['Rubro',emp.rubro||'—'],
          ['Ciudad',emp.ciudad||'—'],
          ['Contacto',emp.contacto||'—'],
          ['Teléfono',emp.telefono||'—'],
          ['Email',emp.email||'—'],
          ['Vendedor',emp.vendedor||'—'],
        ].map(([k,v])=>`<div style="background:var(--surface);border-radius:8px;padding:10px 12px"><div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px">${k}</div><div style="font-size:12px;font-weight:600;margin-top:2px">${v}</div></div>`).join('')}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px">
        <div style="background:var(--surface);border-radius:8px;padding:10px 12px">
          <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px">Monto estimado</div>
          <div style="font-size:14px;font-weight:800;color:${etapaActual.color};margin-top:2px">${emp.montoEstimado?fmt(emp.montoEstimado):'Sin definir'}</div>
        </div>
        <div style="background:var(--surface);border-radius:8px;padding:10px 12px">
          <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px">Último contacto</div>
          <div style="font-size:12px;font-weight:600;margin-top:2px;color:${ultima?'var(--text)':'var(--muted)'}">${ultima?fmtD(ultima.fecha)+' · '+ultima.vendedor:'—'}</div>
        </div>
      </div>

      <div style="margin-bottom:14px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Monto estimado (editar)</div>
        <div style="display:flex;gap:8px">
          <input id="pip-monto-${emp.id}" type="number" value="${emp.montoEstimado||''}" placeholder="0" style="flex:1;padding:8px 12px;font-size:12px;border-radius:8px;border:1px solid var(--border);background:var(--surface)">
          <button onclick="pipelineSetMonto(${emp.id},document.getElementById('pip-monto-${emp.id}').value)" class="btn btn-primary btn-sm">Guardar</button>
        </div>
      </div>

      <div style="margin-bottom:16px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Etapa</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${PIPELINE_ETAPAS.map(e=>`<button onclick="pipelineSetEtapa(${emp.id},'${e.key}')" style="padding:6px 12px;border:1px solid ${e.key===emp.etapaPipeline?e.color:e.bd||'var(--border)'};border-radius:20px;background:${e.key===emp.etapaPipeline?e.bg:'transparent'};color:${e.key===emp.etapaPipeline?e.color:'var(--muted)'};font-size:11px;font-weight:${e.key===emp.etapaPipeline?700:400};cursor:pointer">${e.icon} ${e.label}</button>`).join('')}
        </div>
      </div>

      <div>
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Actividad reciente</div>
        ${histHtml}
      </div>

      <div style="display:flex;gap:8px;margin-top:18px;flex-wrap:wrap">
        <button onclick="crmHistorialEmpresa('${emp.empresa.replace(/'/g,"\\'")}');document.getElementById('modal-pipeline-detalle').remove()" class="btn btn-secondary btn-sm">🔍 Historial completo</button>
        <button onclick="abrirSeguimiento('${(emp.vendedor||'').replace(/'/g,"\\'")}','${emp.empresa.replace(/'/g,"\\'")}');document.getElementById('modal-pipeline-detalle').remove()" class="btn btn-secondary btn-sm">📅 + Seguimiento</button>
        <button onclick="document.getElementById('modal-pipeline-detalle').remove()" class="btn btn-secondary btn-sm" style="margin-left:auto">Cerrar</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(div);
  div.onclick=e=>{if(e.target===div)div.remove();};
}

function pipelineSetMonto(id, monto){
  const empresas=S.get('crm_bases_datos')||[];
  const idx=empresas.findIndex(e=>String(e.id)===String(id));
  if(idx===-1)return;
  empresas[idx].montoEstimado=Number(monto)||0;
  S.set('crm_bases_datos',empresas);
  // Re-abrir modal con datos actualizados
  const emp=empresas[idx];
  const el=document.getElementById('modal-pipeline-detalle');
  if(el)el.remove();
  pipelineModalDetalle(emp);
}

function pipelineAgregarEmpresa(etapaDefault){
  // Abre modal de base de datos con etapa pre-seleccionada
  // Reutiliza el modal existente de bdAgregar si existe, sino abre el modal base de datos
  if(typeof bdAgregarModal==='function'){
    bdAgregarModal(etapaDefault);
  } else {
    // Fallback: muestra un selector simple de empresas existentes para asignar al pipeline
    const empresas=(S.get('crm_bases_datos')||[]).filter(e=>!e.etapaPipeline||e.etapaPipeline==='');
    if(!empresas.length){
      alert('Todas las empresas ya están en el pipeline. Agregá nuevas empresas desde la sección Bases de Datos.');
      return;
    }
    const div=document.createElement('div');
    div.id='modal-pip-agregar';
    div.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px';
    const etapa=etapaDefault||'prospecto';
    div.innerHTML=`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:16px;padding:24px;width:100%;max-width:420px;max-height:80vh;display:flex;flex-direction:column">
      <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:800;margin-bottom:4px">Agregar empresa al pipeline</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:14px">Etapa: ${PIPELINE_ETAPAS.find(e=>e.key===etapa)?.label||etapa}</div>
      <input id="pip-busq" oninput="pipFiltrarEmpresasModal(this.value)" placeholder="🔍 Buscar empresa..." style="padding:8px 12px;font-size:12px;margin-bottom:10px;border-radius:8px;border:1px solid var(--border);background:var(--surface)">
      <div id="pip-lista" style="overflow:auto;flex:1;display:flex;flex-direction:column;gap:4px">
        ${empresas.map(e=>`<div onclick="pipelineSetEtapaAndClose(${e.id},'${etapa}')" style="padding:10px 12px;border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12px;transition:all 0.1s" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">${e.empresa}${e.rubro?` <span style="color:var(--muted)">· ${e.rubro}</span>`:''}</div>`).join('')}
      </div>
      <button onclick="document.getElementById('modal-pip-agregar').remove()" style="margin-top:14px;padding:8px;border:1px solid var(--border);border-radius:8px;background:transparent;color:var(--muted);cursor:pointer;font-size:12px">Cancelar</button>
    </div>`;
    document.body.appendChild(div);
    div.onclick=e=>{if(e.target===div)div.remove();};
  }
}

function pipelineSetEtapaAndClose(id, etapa){
  pipelineSetEtapa(id, etapa);
  const el=document.getElementById('modal-pip-agregar');
  if(el)el.remove();
}

function pipFiltrarEmpresasModal(q){
  const lista=document.getElementById('pip-lista');
  if(!lista)return;
  q=q.toLowerCase();
  lista.querySelectorAll('div').forEach(d=>{
    d.style.display=d.textContent.toLowerCase().includes(q)?'':'none';
  });
}

function markSegHecho(id){
  const segs=S.get('crm_seguimientos')||[];
  const idx=segs.findIndex(s=>s.id===id);
  if(idx===-1)return;
  segs[idx].hecho=true;
  segs[idx].fechaHecho=todayStr();
  S.set('crm_seguimientos',segs);
  _renderCRMSupervisor();
}

// ── ENTREVISTAS ──────────────────────────────────────────────
function entEstadoChange(val){
  const panel = document.getElementById('ent-panel-cierre');
  if(panel) panel.style.display = val === 'cerrado' ? 'block' : 'none';
}

function abrirResultadoEntrevista(id){
  const entrevistas=S.get('crm_entrevistas')||[];
  const e=entrevistas.find(x=>x.id===id);
  if(!e)return;
  document.getElementById('ent-id').value=id;
  document.getElementById('ent-empresa-label').textContent=e.empresa;
  document.getElementById('ent-meta-label').textContent=`Agendada el ${fmtD(e.fechaAgendada)} · por ${e.vendedor}${e.entrevistador?' · '+e.entrevistador:''}`;
  document.getElementById('ent-fecha-realizada').value=e.fechaRealizada||todayStr();
  document.getElementById('ent-interesado').value=e.interesado||'';
  document.getElementById('ent-resultado').value=e.resultado||'';
  document.getElementById('ent-estado').value=e.estado||'';
  document.getElementById('ent-feedback-vendedor').value=e.feedbackVendedor||'';
  document.getElementById('ent-observaciones').value=e.observaciones||'';
  entEstadoChange(e.estado||'');
  openModal('modal-entrevista-resultado','edit');
}

function saveEntrevistaResultado(){
  const id=Number(document.getElementById('ent-id').value);
  const fechaRealizada=document.getElementById('ent-fecha-realizada').value;
  const interesado=document.getElementById('ent-interesado').value;
  const resultado=document.getElementById('ent-resultado').value;
  const estado=document.getElementById('ent-estado').value;
  const feedbackVendedor=document.getElementById('ent-feedback-vendedor').value;
  const observaciones=document.getElementById('ent-observaciones').value;
  const crearAuditoria=estado==='cerrado'&&document.getElementById('ent-crear-auditoria')?.checked;

  if(!fechaRealizada){toast('⚠️ Ingresá la fecha en que se realizó');return;}

  const entrevistas=S.get('crm_entrevistas')||[];
  const idx=entrevistas.findIndex(e=>e.id===id);
  if(idx===-1)return;

  const ent=entrevistas[idx];
  entrevistas[idx]={
    ...ent,
    fechaRealizada, interesado, resultado, observaciones,
    estado, feedbackVendedor,
    cerradoPor: estado==='cerrado' ? (currentUser?.nombre||'') : ent.cerradoPor||'',
    comisionVendedor: estado==='cerrado'
  };
  S.set('crm_entrevistas',entrevistas);

  // Si se cerró → crear auditoría automáticamente
  if(crearAuditoria && ent.vendedor && ent.empresa){
    const clientes=S.get('clientes')||[];
    const auds=S.get('auditorias')||[];
    // Buscar o crear cliente
    let cli=clientes.find(c=>c.nombre===ent.empresa||c.contacto===ent.empresa);
    if(!cli){
      cli={
        id:S.nextId('clientes'),
        nombre:ent.empresa,
        contacto:ent.empresa,
        email:'',tel:'',
        pais:'Argentina',estado:'Activo',
        fechaCreacion:todayStr()
      };
      clientes.push(cli);
      S.set('clientes',clientes);
    }
    // Crear auditoría con doble atribución
    const nuevaAud={
      id:S.nextId('auditorias'),
      clienteId:cli.id,
      clienteNombre:ent.empresa,
      vendedor:ent.vendedor,           // quien consiguió el contacto
      cerradoPor:currentUser?.nombre||'', // quien cerró
      estado:'Iniciada',
      tipo:'BPC Score',
      fechaInicio:todayStr(),
      entrevistaId:id,
      diagnostico_ok:false
    };
    auds.push(nuevaAud);
    S.set('auditorias',auds);
    toast('🏆 ¡Venta cerrada! Auditoría creada para '+ent.empresa);
  } else {
    toast('✅ Resultado guardado');
  }

  // Actualizar pipeline
  if(ent.empresa){
    const empresas=S.get('crm_bases_datos')||[];
    const eIdx=empresas.findIndex(e=>e.empresa===ent.empresa);
    if(eIdx>-1){
      const etapaMap={cerrado:'cerrado',perdido:'perdido',no_apto:'descartado',propuesta:'propuesta',seguimiento:'contactado'};
      const nuevaEtapa=etapaMap[estado]||empresas[eIdx].etapaPipeline;
      if(nuevaEtapa!==empresas[eIdx].etapaPipeline){
        empresas[eIdx].etapaPipeline=nuevaEtapa;
        try{let h=JSON.parse(empresas[eIdx].historial||'[]');h.push({fecha:todayStr(),tipo:'pipeline',detalle:`Entrevista → ${estado}`,usuario:currentUser?.nombre||''});empresas[eIdx].historial=JSON.stringify(h);}catch(ex){}
        S.set('crm_bases_datos',empresas);
      }
    }
  }

  closeModal('modal-entrevista-resultado');
  renderDashboard();
}

function asignarEntrevistador(id, nombre){
  const entrevistas=S.get('crm_entrevistas')||[];
  const idx=entrevistas.findIndex(e=>e.id===id);
  if(idx===-1)return;
  entrevistas[idx].entrevistador=nombre;
  S.set('crm_entrevistas',entrevistas);
  toast(`✅ Entrevista asignada a ${nombre}`);
  renderDashboard();
}

// ── VENDEDOR DASHBOARD PERSONAL ──────────────────────────────
function _renderVendedorDash(){
  const el=document.getElementById('crm-content');
  if(!el)return;

  const nombre=currentUser.nombre;
  const today=todayStr();
  const ym=today.substring(0,7);
  const now=new Date();
  const MES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const DIAS=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

  // Datos del vendedor
  const vendRec=S.get('vendedores').find(v=>v.nombre===nombre)||{};
  const vendId=vendRec.id||null;
  const comUnit=Number(vendRec.comision)||300;

  // Objetivos del mes
  const obj=S.get('crm_objetivos').find(x=>x.ym===ym&&String(x.vendedorId)===String(vendId))||null;

  // Logs
  const allLogs=S.get('crm_logs').filter(l=>l.vendedor===nombre).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const mLogs=allLogs.filter(l=>l.fecha.startsWith(ym));
  const tdLog=allLogs.find(l=>l.fecha===today)||null;

  // Stats mes
  const mLL=mLogs.reduce((s,l)=>s+(l.llamadas||0),0);
  const mDU=mLogs.reduce((s,l)=>s+(l.duenos||0),0);
  const mAG=mLogs.reduce((s,l)=>s+(l.agendadas||0),0);
  const mCI=mLogs.reduce((s,l)=>s+(l.cerradas||0),0);

  // Comisiones
  const misAuds=S.get('auditorias').filter(a=>a.vendedor===nombre);
  const comAcum=misAuds.filter(a=>a.estado==='Completada').length*comUnit;
  const comMes=misAuds.filter(a=>a.estado==='Completada'&&(a.fInforme||'').startsWith(ym)).length*comUnit;
  const enProceso=misAuds.filter(a=>a.estado!=='Completada').length;

  // Oportunidades calientes: entrevistas con resultado positivo agendadas por este vendedor
  const misEntrevistasVend=(S.get('crm_entrevistas')||[]).filter(e=>e.vendedor===nombre&&e.fechaRealizada);
  const calientesVend=misEntrevistasVend.filter(e=>e.interesado&&!e.interesado.includes('No')&&e.interesado!=='Dudoso');

  // Días lab restantes
  const dInMes=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  let wdLeft=0;
  for(let d=now.getDate();d<=dInMes;d++){const dow=new Date(now.getFullYear(),now.getMonth(),d).getDay();if(dow!==0&&dow!==6)wdLeft++;}

  // % objetivos
  const op=(r,m)=>m>0?Math.min(Math.round(r/m*100),999):null;
  const pLL=op(mLL,obj?.llamadas),pDU=op(mDU,obj?.duenos),pAG=op(mAG,obj?.agendadas),pCI=op(mCI,obj?.cerradas);
  const pArr=[pLL,pDU,pAG,pCI].filter(x=>x!==null);
  const avgP=pArr.length?Math.round(pArr.reduce((s,x)=>s+x,0)/pArr.length):null;

  const pc=p=>p===null?'var(--muted)':p>=100?'var(--accent3)':p>=70?'var(--warn)':'var(--danger)';
  const pbc=p=>p===null?'rgba(107,127,163,0.15)':p>=100?'rgba(200,168,74,0.15)':p>=70?'rgba(245,158,11,0.12)':'rgba(239,68,68,0.1)';
  const pbrc=p=>p===null?'rgba(107,127,163,0.25)':p>=100?'rgba(200,168,74,0.3)':p>=70?'rgba(245,158,11,0.3)':'rgba(239,68,68,0.3)';

  // Ring SVG
  const ring=(p,color,sz=72)=>{const r=sz/2-6,c=sz/2,ci=2*Math.PI*r,dash=Math.min((p||0)/100,1)*ci;
    return`<svg width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}" style="transform:rotate(-90deg)"><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="6"/><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${color}" stroke-width="6" stroke-dasharray="${dash.toFixed(1)} ${ci.toFixed(1)}" stroke-linecap="round"/></svg>`;};

  // Motivación
  // Métricas de cierre personal del vendedor
  const miMetrica = calcMetricasCierre(ym).vendedores.find(v=>v.nombre===nombre);
  let motiv='💡 Tu supervisor aún no configuró tus objetivos este mes.';
  if(avgP!==null){
    if(avgP>=100)motiv='🔥 ¡OBJETIVO CUMPLIDO! Sos una máquina.';
    else if(avgP>=80)motiv=`💪 Muy cerca. ${100-avgP}% más y llegás. ¡Dale!`;
    else if(avgP>=50)motiv=`📈 Buen ritmo. Quedan ${wdLeft} días laborales. ¡Vamos!`;
    else motiv=`🎯 ${wdLeft} días para dar vuelta el mes. Cada llamada cuenta.`;
  }

  // Semana actual
  const wStart=new Date(now);wStart.setDate(now.getDate()-((now.getDay()+6)%7));
  const weekDays=Array.from({length:7},(_,i)=>{const d=new Date(wStart);d.setDate(wStart.getDate()+i);return d.toISOString().split('T')[0];});

  // Seguimientos
  const segs=S.get('crm_seguimientos').filter(s=>s.vendedor===nombre&&!s.hecho);
  const segsUrg=[...segs.filter(s=>s.fecha<today),...segs.filter(s=>s.fecha===today)];

  // Contactos personales
  const allCts=getVendContactos(nombre);

  // Ranking del mes (por cierres)
  const allVends=S.get('vendedores').filter(v=>v.estado!=='Inactivo');
  const rankStats=allVends.map(v=>{
    const vl=S.get('crm_logs').filter(l=>l.vendedor===v.nombre&&l.fecha.startsWith(ym));
    const vLL=vl.reduce((s,l)=>s+(l.llamadas||0),0);
    const vCI=vl.reduce((s,l)=>s+(l.cerradas||0),0);
    return{nombre:v.nombre,ci:vCI,ll:vLL,conv:vLL>0?Math.round(vCI/vLL*100):0};
  }).sort((a,b)=>b.ci-a.ci);
  const rankPos=rankStats.findIndex(r=>r.nombre===nombre)+1||rankStats.length;
  const rankMedal=rankPos===1?'🥇':rankPos===2?'🥈':rankPos===3?'🥉':`#${rankPos}`;
  const rankTotal=rankStats.length;

  // Ranking por conversión
  const rankConv=[...rankStats].sort((a,b)=>b.conv-a.conv);
  const rankConvPos=rankConv.findIndex(r=>r.nombre===nombre)+1||rankConv.length;
  const rankLlamPos=[...rankStats].sort((a,b)=>b.ll-a.ll).findIndex(r=>r.nombre===nombre)+1||rankStats.length;

  // Premio del mes (global — publicado por supervisor)
  const premioMes=(S.get('crm_premios')||[]).find(x=>x.ym===ym)||null;

  // Posición del vendedor según el criterio del premio
  let premioPos=null,premioLabel='',premioTotal=rankTotal;
  if(premioMes){
    if(premioMes.tipo==='conv'){
      const rConv=[...rankStats].sort((a,b)=>b.conv-a.conv);
      premioPos=rConv.findIndex(r=>r.nombre===nombre)+1;
      premioLabel=`Conversión actual: ${rankStats.find(r=>r.nombre===nombre)?.conv||0}% · Vas ${premioPos}° de ${rankTotal}`;
    } else if(premioMes.tipo==='cierres'){
      premioPos=rankPos;
      premioLabel=`Cierres este mes: ${mCI} · Vas ${rankPos}° de ${rankTotal}`;
    } else if(premioMes.tipo==='llamadas'){
      const rLl=[...rankStats].sort((a,b)=>b.ll-a.ll);
      premioPos=rLl.findIndex(r=>r.nombre===nombre)+1;
      premioLabel=`Llamadas este mes: ${mLL} · Vas ${premioPos}° de ${rankTotal}`;
    } else if(premioMes.tipo==='pct'){
      const rPct=allVends.map(v=>{
        const vobj=S.get('crm_objetivos').find(x=>x.ym===ym&&String(x.vendedorId)===String(v.id))||null;
        const vl=S.get('crm_logs').filter(l=>l.vendedor===v.nombre&&l.fecha.startsWith(ym));
        if(!vobj)return{nombre:v.nombre,p:0};
        const ps=[vobj.llamadas,vobj.duenos,vobj.agendadas,vobj.cerradas].map((m,i)=>{
          const r=[vl.reduce((s,l)=>s+(l.llamadas||0),0),vl.reduce((s,l)=>s+(l.duenos||0),0),vl.reduce((s,l)=>s+(l.agendadas||0),0),vl.reduce((s,l)=>s+(l.cerradas||0),0)][i];
          return m>0?r/m:null;
        }).filter(x=>x!==null);
        return{nombre:v.nombre,p:ps.length?Math.round(ps.reduce((s,x)=>s+x,0)/ps.length*100):0};
      }).sort((a,b)=>b.p-a.p);
      premioPos=rPct.findIndex(r=>r.nombre===nombre)+1;
      premioLabel=`% objetivo: ${avgP||0}% · Vas ${premioPos}° de ${rankTotal}`;
    } else {
      premioLabel='Criterio libre — a definir por el supervisor';
    }
  }

  // ── OBJETIVO DE CARGA DE EMPRESAS ──────────────────────────────────
  // Fase 1: primeros 14 días hábiles desde ingreso → 30 empresas/día hábil
  // Fase 2: resto → 50 empresas/día hábil
  // Comparamos contra empresas cargadas en vend_contactos
  const calcObjetivoEmpresas = ()=>{
    if(!vendRec.ingreso) return null;
    const ingreso = new Date(vendRec.ingreso+'T12:00:00');
    // Contar días hábiles transcurridos desde ingreso hasta hoy inclusive
    const isHabil = d => { const dow=d.getDay(); return dow!==0&&dow!==6; };
    let diasHabilesDesdeIngreso=0, diasHabilFase1=0, diasHabilFase2=0;
    const cursor = new Date(ingreso);
    while(cursor <= now){
      if(isHabil(cursor)){
        diasHabilesDesdeIngreso++;
        if(diasHabilesDesdeIngreso<=14) diasHabilFase1++;
        else diasHabilFase2++;
      }
      cursor.setDate(cursor.getDate()+1);
    }
    // Objetivo acumulado hasta hoy
    const objAcum = (diasHabilFase1*30) + (diasHabilFase2*50);
    // Fase actual
    const enFase1 = diasHabilesDesdeIngreso<=14;
    const objDiario = enFase1 ? 30 : 50;
    // Empresas reales cargadas por este vendedor (todas, sin filtro de fecha)
    const empresasCargadas = allCts.length;
    // Delta
    const delta = empresasCargadas - objAcum;
    const pct = objAcum>0 ? Math.min(Math.round(empresasCargadas/objAcum*100),999) : 100;
    // Días hábiles de atraso/adelanto en términos de empresas
    const diasDelta = objDiario>0 ? Math.abs(Math.round(delta/objDiario*10)/10) : 0;
    return { objAcum, empresasCargadas, delta, pct, enFase1, objDiario, diasHabilesDesdeIngreso, diasDelta };
  };
  const oe = calcObjetivoEmpresas();
  // ────────────────────────────────────────────────────────────────────

  // Antigüedad
  let antiguedadStr='';
  if(vendRec.ingreso){
    const ingDate=new Date(vendRec.ingreso+'T12:00:00');
    const meses=Math.floor((now-ingDate)/(1000*60*60*24*30.44));
    if(meses<1) antiguedadStr='Menos de 1 mes';
    else if(meses===1) antiguedadStr='1 mes';
    else if(meses<12) antiguedadStr=`${meses} meses`;
    else{const a=Math.floor(meses/12),m=meses%12;antiguedadStr=`${a} año${a>1?'s':''}${m>0?' '+m+' mes'+(m>1?'es':''):''}`;};
  }

  // Mes completo — todos los días hábiles del mes
  const dInMes2=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  const mesDias=[];
  for(let d=1;d<=dInMes2;d++){
    const ds=`${ym}-${String(d).padStart(2,'0')}`;
    const dow=new Date(now.getFullYear(),now.getMonth(),d).getDay();
    if(dow===0||dow===6) continue;
    const lg=allLogs.find(l=>l.fecha===ds)||null;
    mesDias.push({ds,d,lg,isFuture:ds>today});
  }
  const mesLL=mesDias.reduce((s,x)=>s+(x.lg?.llamadas||0),0);
  const mesDU=mesDias.reduce((s,x)=>s+(x.lg?.duenos||0),0);
  const mesAG=mesDias.reduce((s,x)=>s+(x.lg?.agendadas||0),0);
  const mesCI=mesDias.reduce((s,x)=>s+(x.lg?.cerradas||0),0);
  const diasCargados=mesDias.filter(x=>x.lg&&!x.isFuture).length;
  const diasPasados=mesDias.filter(x=>!x.isFuture).length;
  const diasFuturos=mesDias.filter(x=>x.isFuture).length;
  const spark=Array.from({length:6},(_,i)=>{
    const d1=new Date(now);d1.setDate(d1.getDate()-(5-i)*7);
    const d2=new Date(d1);d2.setDate(d1.getDate()+7);
    const s1=d1.toISOString().split('T')[0],s2=d2.toISOString().split('T')[0];
    const wl=allLogs.filter(l=>l.fecha>=s1&&l.fecha<s2);
    return{ll:wl.reduce((s,l)=>s+(l.llamadas||0),0),ci:wl.reduce((s,l)=>s+(l.cerradas||0),0)};
  });
  const maxSpLL=Math.max(...spark.map(w=>w.ll),1);
  const maxSpCI=Math.max(...spark.map(w=>w.ci),1);

  const hr=now.getHours();
  const saludo=hr<12?'¡Buenos días':hr<19?'¡Buenas tardes':'¡Buenas noches';

  el.innerHTML=`
<style>
.vd-sec{font-family:'Syne',sans-serif;font-size:11px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;color:var(--muted);margin-bottom:12px;display:flex;align-items:center;gap:10px;}
.vd-sec::after{content:'';flex:1;height:1px;background:var(--border);}
.vd-card2{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px 20px;}
.vd-wday{background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:10px 8px;min-height:90px;cursor:pointer;transition:all 0.15s;}
.vd-wday:hover:not(.vd-wknd){border-color:rgba(212,175,55,0.4);background:rgba(212,175,55,0.04);transform:translateY(-2px);}
.vd-today-card{border-color:rgba(212,175,55,0.5)!important;background:rgba(212,175,55,0.06)!important;}
.vd-wknd{cursor:default!important;opacity:0.4;}
.vd-mini-stat{display:flex;align-items:center;gap:4px;font-size:10px;color:var(--muted);margin-top:3px;}
.vd-mini-stat b{color:var(--text);}
.vd-cbtn{width:42px;height:42px;border-radius:50%;border:2px solid;cursor:pointer;font-size:22px;display:flex;align-items:center;justify-content:center;background:transparent;transition:all 0.12s;}
.vd-cbtn:active{transform:scale(0.88);}
.vd-ctrow{display:flex;align-items:center;gap:11px;padding:11px 16px;border-bottom:1px solid rgba(212,175,55,0.08);transition:background 0.13s;}
.vd-ctrow:hover{background:rgba(255,255,255,0.02);}
.vd-ctrow:last-child{border-bottom:none;}
.vd-seg{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;margin-bottom:7px;}
@keyframes vdup{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
.vda{animation:vdup 0.4s ease both;}
</style>

<!-- ① BANNER -->
<div class="vda" style="background:linear-gradient(135deg,rgba(200,168,74,0.1),rgba(212,175,55,0.07),rgba(184,146,46,0.07));border:1px solid rgba(200,168,74,0.22);border-radius:18px;padding:22px 26px;margin-bottom:22px;position:relative;overflow:hidden">
  <div style="position:absolute;top:-60px;right:-60px;width:220px;height:220px;background:radial-gradient(circle,rgba(212,175,55,0.08),transparent 70%);border-radius:50%;pointer-events:none"></div>
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px">
    <div>
      <div style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800">${saludo}, ${nombre.split(' ')[0]}! 👋</div>
      <div style="font-size:12px;color:var(--muted);margin-top:2px">${now.toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">
        <div style="background:rgba(184,146,46,0.12);border:1px solid rgba(184,146,46,0.3);border-radius:8px;padding:6px 13px;font-size:12px;font-weight:700;color:#c8a84a;display:inline-flex;align-items:center;gap:5px">${rankMedal} ${rankPos}° de ${rankTotal} este mes</div>
        ${antiguedadStr?`<div style="background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.2);border-radius:8px;padding:6px 13px;font-size:12px;color:var(--accent);display:inline-flex;align-items:center;gap:5px">🗓 ${antiguedadStr} en MetoGroup</div>`:''}
      </div>
      <div style="margin-top:10px;background:rgba(212,175,55,0.09);border:1px solid rgba(212,175,55,0.2);border-radius:9px;padding:8px 14px;font-size:12px;color:var(--accent);display:inline-block">${motiv}</div>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <div style="background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.2);border-radius:12px;padding:14px 18px;text-align:center">
        <div style="font-family:'Syne',sans-serif;font-size:30px;font-weight:800;color:var(--accent);line-height:1">${wdLeft}</div>
        <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:4px">días lab.<br>restantes</div>
      </div>
      ${avgP!==null?`<div style="background:${pbc(avgP)};border:1px solid ${pbrc(avgP)};border-radius:12px;padding:14px 18px;text-align:center">
        <div style="font-family:'Syne',sans-serif;font-size:30px;font-weight:800;color:${pc(avgP)};line-height:1">${avgP}%</div>
        <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:4px">objetivo<br>del mes</div>
      </div>`:''}
      <div style="background:rgba(200,168,74,0.08);border:1px solid rgba(200,168,74,0.2);border-radius:12px;padding:14px 18px;text-align:center">
        <div style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:var(--accent3);line-height:1">${fmt(comAcum)}</div>
        <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:4px">comisiones<br>acumuladas</div>
      </div>
    </div>
  </div>
</div>

<!-- AVISOS DEL SUPERVISOR -->
${vdRenderAvisos()}

<!-- ② OBJETIVO DE CARGA DE EMPRESAS -->
${oe ? (()=>{
  const { objAcum, empresasCargadas, delta, pct, enFase1, objDiario, diasHabilesDesdeIngreso, diasDelta } = oe;
  const adelantado = delta >= 0;
  // Colores semáforo
  const color = pct>=100 ? '#c8a84a' : pct>=70 ? 'var(--warn)' : 'var(--danger)';
  const bgColor = pct>=100 ? 'rgba(200,168,74,0.08)' : pct>=70 ? 'rgba(245,158,11,0.07)' : 'rgba(239,68,68,0.07)';
  const borderColor = pct>=100 ? 'rgba(200,168,74,0.25)' : pct>=70 ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.25)';
  const semaforo = pct>=100 ? '🟢' : pct>=70 ? '🟡' : '🔴';
  const fase = enFase1 ? `Fase 1 — día hábil ${diasHabilesDesdeIngreso} de 14 · objetivo ${objDiario}/día` : `Fase 2 — día hábil ${diasHabilesDesdeIngreso} · objetivo ${objDiario}/día`;
  const estadoTexto = adelantado
    ? `<span style="color:#c8a84a;font-weight:700">▲ ${delta} empresas adelante</span> <span style="color:var(--muted);font-size:11px">(≈ ${diasDelta} día${diasDelta!==1?'s':''} de ventaja)</span>`
    : delta===0
    ? `<span style="color:var(--warn);font-weight:700">⚡ Exactamente en objetivo</span>`
    : `<span style="color:var(--danger);font-weight:700">▼ ${Math.abs(delta)} empresas de atraso</span> <span style="color:var(--muted);font-size:11px">(≈ ${diasDelta} día${diasDelta!==1?'s':''} de trabajo)</span>`;
  // Barra de progreso
  const barW = Math.min(pct,100);
  return `
<div class="vda" style="background:${bgColor};border:1px solid ${borderColor};border-radius:14px;padding:18px 22px;margin-bottom:22px;">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px">
    <div style="display:flex;align-items:center;gap:10px">
      <span style="font-size:20px">${semaforo}</span>
      <div>
        <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px">Objetivo de Carga de Empresas</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">${fase}</div>
      </div>
    </div>
    <div style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:${color}">${pct}%</div>
  </div>
  <!-- Barra -->
  <div style="height:8px;background:rgba(255,255,255,0.06);border-radius:99px;overflow:hidden;margin-bottom:14px">
    <div style="height:100%;width:${barW}%;background:linear-gradient(90deg,${color},${color === '#c8a84a' ? '#f5d060' : color});border-radius:99px;transition:width 0.6s cubic-bezier(0.22,1,0.36,1)"></div>
  </div>
  <!-- Stats -->
  <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:center;justify-content:space-between">
    <div style="display:flex;gap:20px;flex-wrap:wrap">
      <div style="text-align:center">
        <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:${color}">${empresasCargadas}</div>
        <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">cargadas</div>
      </div>
      <div style="text-align:center">
        <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--muted)">${objAcum}</div>
        <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">objetivo hoy</div>
      </div>
      <div style="text-align:center">
        <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--muted)">${objDiario}</div>
        <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">por día</div>
      </div>
    </div>
    <div style="font-size:13px">${estadoTexto}</div>
  </div>
</div>`; })()
: ''}

<!-- ③ TASA DE CIERRE PERSONAL -->
${miMetrica && miMetrica.llamadas > 0 ? `
<div class="vda" style="margin-bottom:22px;background:${nivelBg(miMetrica.nivel)};border:1px solid ${nivelColor(miMetrica.nivel).replace('var(--','rgba(').replace(')','0.3)')};border-radius:14px;padding:16px 20px">
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
    <div>
      <div style="font-family:'Syne',sans-serif;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);margin-bottom:4px">📞 Tu tasa de cierre — ${ym}</div>
      <div style="display:flex;align-items:baseline;gap:8px">
        <div style="font-family:'Syne',sans-serif;font-size:32px;font-weight:800;color:${nivelColor(miMetrica.nivel)}">${miMetrica.pctCierre!==null?miMetrica.pctCierre.toFixed(1)+'%':'—'}</div>
        <div style="font-size:12px;color:var(--muted)">${miMetrica.cierres} cierres / ${miMetrica.llamadas} llamadas</div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
      <div style="background:${nivelBg(miMetrica.nivel)};color:${nivelColor(miMetrica.nivel)};border:1px solid ${nivelColor(miMetrica.nivel)};border-radius:20px;padding:4px 12px;font-size:11px;font-weight:700">${nivelLabel(miMetrica.nivel)}</div>
      <div style="font-size:10px;color:var(--muted)">Benchmark: ≥3% excelente · ≥1.5% bueno</div>
    </div>
  </div>
  <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:99px;overflow:hidden;margin-top:12px">
    <div style="width:${Math.min(miMetrica.pctCierre!==null?miMetrica.pctCierre/5*100:0,100)}%;height:100%;background:${nivelColor(miMetrica.nivel)};border-radius:99px;transition:width 0.6s"></div>
  </div>
</div>` : ''}

<!-- ④ CONTADORES HOY -->
<div class="vd-sec vda" style="animation-delay:0.05s">⚡ Actividad de hoy — ${fmtD(today)}</div>
<div class="vda" style="animation-delay:0.08s;background:var(--surface);border:1px solid rgba(212,175,55,0.18);border-radius:16px;padding:20px;margin-bottom:22px">
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:16px">
    ${[{k:'llamadas',ic:'📞',lb:'Llamadas',cl:'var(--accent)'},{k:'duenos',ic:'👤',lb:'Dueños atendidos',cl:'#c8a84a'},{k:'agendadas',ic:'📅',lb:'Entrevistas',cl:'var(--warn)'}].map(m=>`
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
      <div style="font-size:26px;margin-bottom:6px">${m.ic}</div>
      <div id="vdcnt_${m.k}" style="font-family:'Syne',sans-serif;font-size:48px;font-weight:800;color:${m.cl};line-height:1;transition:transform 0.15s">${tdLog?.[m.k]||0}</div>
      <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin:7px 0 14px">${m.lb}</div>
      <div style="display:flex;justify-content:center;gap:10px">
        <button class="vd-cbtn" style="border-color:rgba(239,68,68,0.5);color:var(--danger)" onclick="vdCount('${m.k}',-1)">−</button>
        <button class="vd-cbtn" style="border-color:${m.cl};color:${m.cl}" onclick="vdCount('${m.k}',1)">+</button>
      </div>
    </div>`).join('')}
  </div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
    <input id="vd_notas_hoy" placeholder="Notas del día..." value="${(tdLog?.notas||'').replace(/"/g,'&quot;')}"
      style="flex:1;min-width:180px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 13px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none"
      onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'">
    <button onclick="vdSaveHoy()" style="background:linear-gradient(135deg,var(--accent2),var(--accent));border:none;border-radius:10px;padding:10px 20px;color:#fff;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;cursor:pointer">💾 Guardar</button>
  </div>
  ${(tdLog?.cerradas||0)>0?`<div style="margin-top:12px;background:rgba(200,168,74,0.1);border:1px solid rgba(200,168,74,0.25);border-radius:10px;padding:10px 16px;font-size:13px;color:var(--accent3)">🏆 ${tdLog.cerradas} cierre${tdLog.cerradas>1?'s':''} registrado${tdLog.cerradas>1?'s':''} hoy. ¡Excelente!</div>`:''}
</div>

<!-- ③ CALENDARIO SEMANAL -->
<div class="vd-sec vda" style="animation-delay:0.1s">📅 Esta semana</div>
<div class="vda" style="animation-delay:0.12s;display:grid;grid-template-columns:repeat(7,1fr);gap:7px;margin-bottom:22px">
  ${weekDays.map(ds=>{
    const d=new Date(ds+'T12:00:00'),dow=d.getDay(),isWknd=dow===0||dow===6,isTd=ds===today;
    const lg=allLogs.find(l=>l.fecha===ds);
    const hasSeg=segs.find(s=>s.fecha===ds);
    return`<div class="vd-wday${isTd?' vd-today-card':''}${isWknd?' vd-wknd':''}" onclick="${isWknd?'':("vdOpenDay('"+ds+"')")}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px">
        <span style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--muted)">${DIAS[dow]}</span>
        <div style="width:24px;height:24px;border-radius:50%;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;${isTd?'background:var(--accent);color:var(--bg)':''}">${d.getDate()}</div>
      </div>
      ${isWknd?`<div style="font-size:11px;color:var(--muted);text-align:center;padding-top:4px">🌿</div>`:
      lg?`<div class="vd-mini-stat">📞 <b>${lg.llamadas||0}</b></div>
          <div class="vd-mini-stat">👤 <b>${lg.duenos||0}</b></div>
          <div class="vd-mini-stat">📅 <b>${lg.agendadas||0}</b></div>
          ${lg.cerradas?`<div style="background:rgba(200,168,74,0.15);border-radius:5px;padding:2px 5px;font-size:10px;color:var(--accent3);font-weight:700;margin-top:4px;display:inline-block">🏆${lg.cerradas}</div>`:''}
          <div style="font-size:9px;color:var(--accent3);margin-top:4px">✓ cargado</div>`:
      ds<=today?`<div style="font-size:9px;color:var(--accent);text-align:center;padding-top:10px">+ cargar</div>`:
      hasSeg?`<div style="font-size:9px;color:var(--warn);text-align:center;padding-top:10px">🔔 seg.</div>`:
      `<div style="font-size:9px;color:var(--muted);text-align:center;padding-top:10px">—</div>`}
    </div>`;
  }).join('')}
</div>

<!-- ④ OBJETIVOS DEL MES -->
<div class="vd-sec vda" style="animation-delay:0.14s">🎯 Objetivos — ${MES[now.getMonth()]}</div>
${obj?`<div class="vda" style="animation-delay:0.16s;display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px">
  ${[{ic:'📞',lb:'Llamadas',r:mLL,m:obj.llamadas,p:pLL,cl:'var(--accent)'},{ic:'👤',lb:'Dueños',r:mDU,m:obj.duenos,p:pDU,cl:'#c8a84a'},{ic:'📅',lb:'Entrevistas',r:mAG,m:obj.agendadas,p:pAG,cl:'var(--warn)'},{ic:'🏆',lb:'Cierres',r:mCI,m:obj.cerradas,p:pCI,cl:'var(--accent3)'}].map(x=>`
  <div class="vd-card2" style="position:relative;overflow:hidden">
    <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${x.cl}"></div>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:4px">
      <div>
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">${x.ic} ${x.lb}</div>
        <div style="font-family:'Syne',sans-serif;font-size:40px;font-weight:800;color:${x.cl};line-height:1">${x.r}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:3px">meta: ${x.m||0}</div>
      </div>
      <div style="position:relative;flex-shrink:0">
        ${ring(x.p,x.cl)}
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
          <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:${pc(x.p)}">${x.p!==null?x.p+'%':'?'}</div>
        </div>
      </div>
    </div>
    <div style="height:5px;background:var(--surface2);border-radius:3px;overflow:hidden;margin-top:12px">
      <div style="height:100%;width:${Math.min(x.p||0,100)}%;background:${x.cl};border-radius:3px;transition:width 1s ease"></div>
    </div>
    <div style="font-size:10px;margin-top:6px;color:${x.p!==null&&x.p>=100?'var(--accent3)':'var(--muted)'}">
      ${x.p!==null&&x.p>=100?'✅ ¡Cumplido!':x.p!==null?`Faltan ${Math.max(0,(x.m||0)-x.r)}`:'—'}
    </div>
  </div>`).join('')}
</div>`:`<div class="vda" style="animation-delay:0.16s;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.2);border-radius:14px;padding:24px;text-align:center;margin-bottom:22px">
  <div style="font-size:32px;margin-bottom:8px">🎯</div>
  <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--warn)">Sin objetivos configurados este mes</div>
  <div style="font-size:12px;color:var(--muted);margin-top:5px">Tu supervisor puede configurarlos desde el CRM</div>
</div>`}

<!-- ⑤ DOS COLUMNAS: Comisiones + Gráfico -->
${calientesVend.length?`<div class="vda" style="animation-delay:0.16s;margin-bottom:18px">
  <div style="background:linear-gradient(135deg,rgba(239,68,68,0.09),rgba(245,158,11,0.05));border:1px solid rgba(239,68,68,0.3);border-radius:16px;padding:18px 22px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
      <div style="font-size:20px">🔥</div>
      <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:800;color:#f87171">¡Oportunidades calientes para cerrar!</div>
      <span style="margin-left:auto;background:rgba(239,68,68,0.15);color:#f87171;font-size:11px;font-weight:800;padding:3px 10px;border-radius:10px">${calientesVend.length} empresa${calientesVend.length!==1?'s':''}</span>
    </div>
    <div style="font-size:11px;color:var(--muted);margin-bottom:14px">Leandro o Ariel ya hicieron la entrevista — están interesados. ¡Es tu momento para cerrar!</div>
    ${calientesVend.map(e=>{
      const iconInt=e.interesado?.toLowerCase().includes('muy')?'🔥':'✅';
      return`<div style="display:flex;align-items:center;gap:14px;padding:12px 14px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:12px;margin-bottom:8px">
        <div style="font-size:22px;flex-shrink:0">${iconInt}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:800;color:var(--text)">${e.empresa}</div>
          <div style="font-size:11px;color:#f87171;font-weight:600;margin-top:2px">${e.interesado}</div>
          ${e.proximoPaso?`<div style="font-size:11px;color:var(--muted);margin-top:2px">→ ${e.proximoPaso}</div>`:''}
          ${e.resultado?`<div style="font-size:11px;color:var(--muted);margin-top:3px;font-style:italic">"${e.resultado.substring(0,100)}${e.resultado.length>100?'…':''}"</div>`:''}
          <div style="font-size:10px;color:var(--muted);margin-top:3px">Entrevistó: ${e.entrevistador||'—'} · ${fmtD(e.fechaRealizada)}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
          <button onclick="abrirSeguimiento('${nombre.replace(/'/g,"\\'")}','${e.empresa.replace(/'/g,"\\'")}');" style="padding:7px 14px;border:1px solid rgba(239,68,68,0.5);border-radius:20px;background:rgba(239,68,68,0.15);color:#f87171;font-size:11px;font-weight:700;cursor:pointer">📅 Agendar</button>
          <button onclick="crmHistorialEmpresa('${e.empresa.replace(/'/g,"\\'")}');" style="padding:5px 14px;border:1px solid rgba(255,255,255,0.1);border-radius:20px;background:transparent;color:var(--muted);font-size:10px;cursor:pointer">🔍 Historial</button>
        </div>
      </div>`;
    }).join('')}
  </div>
</div>`:''}
<div class="vda" style="animation-delay:0.18s;display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:22px">
  <div class="vd-card2">
    <div class="vd-sec" style="margin-bottom:14px">💰 Mis comisiones</div>
    ${[
      {bg:'rgba(200,168,74,0.08)',bc:'rgba(200,168,74,0.2)',val:fmt(comAcum),cl:'var(--accent3)',lb:'Acumuladas total',sub:`${misAuds.filter(a=>a.estado==='Completada').length} cierres · ${fmt(comUnit)} c/u`,fn:'acum'},
      {bg:'rgba(212,175,55,0.07)',bc:'rgba(212,175,55,0.18)',val:fmt(comMes),cl:'var(--accent)',lb:`Este mes (${MES[now.getMonth()]})`,sub:`${misAuds.filter(a=>a.estado==='Completada'&&(a.fInforme||'').startsWith(ym)).length} cierres confirmados`,fn:'mes'},
      {bg:'rgba(184,146,46,0.08)',bc:'rgba(184,146,46,0.2)',val:enProceso,cl:'#c8a84a',lb:'Auditorías activas',sub:`potencial: ${fmt(enProceso*comUnit)}`,fn:'activas'},
    ].map(c=>`<div onclick="vdDetalleComisiones('${c.fn}')" style="background:${c.bg};border:1px solid ${c.bc};border-radius:11px;padding:14px 16px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;transition:all 0.15s" onmouseover="this.style.transform='translateY(-2px)';this.style.filter='brightness(1.15)'" onmouseout="this.style.transform='';this.style.filter=''">
      <div>
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">${c.lb}</div>
        <div style="font-family:'Syne',sans-serif;font-size:${typeof c.val==='number'?'28':'22'}px;font-weight:800;color:${c.cl}">${c.val}</div>
      </div>
      <div style="text-align:right"><div style="font-size:11px;color:var(--muted);margin-bottom:4px">${c.sub}</div><div style="font-size:10px;color:rgba(255,255,255,0.2)">Ver detalle →</div></div>
    </div>`).join('')}
    ${premioMes?`
    <!-- RECUADRO DORADO DEL PREMIO (anuncio global del equipo) -->
    <div style="
      position:relative;overflow:hidden;
      background:linear-gradient(135deg,rgba(245,158,11,0.14),rgba(251,191,36,0.08),rgba(249,115,22,0.06));
      border:2px solid rgba(245,158,11,0.55);
      border-radius:14px;padding:18px 20px;margin-top:4px;
      box-shadow:0 0 32px rgba(245,158,11,0.12),inset 0 0 60px rgba(245,158,11,0.03);
    ">
      <div style="position:absolute;top:-40px;right:-40px;width:160px;height:160px;background:radial-gradient(circle,rgba(251,191,36,0.15),transparent 70%);border-radius:50%;pointer-events:none"></div>
      <div style="position:absolute;bottom:-30px;left:-30px;width:120px;height:120px;background:radial-gradient(circle,rgba(249,115,22,0.08),transparent 70%);border-radius:50%;pointer-events:none"></div>

      <!-- Header del premio -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:2px;color:rgba(245,158,11,0.7);font-weight:700">🏅 Premio del mes — ${['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][parseInt(premioMes.ym.split('-')[1])-1]} ${premioMes.ym.split('-')[0]}</div>
      </div>

      <!-- Premio principal -->
      <div style="display:flex;align-items:flex-start;gap:14px">
        <div style="font-size:42px;flex-shrink:0;filter:drop-shadow(0 0 10px rgba(245,158,11,0.5));line-height:1">🏆</div>
        <div style="flex:1;min-width:0">
          <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:#fbbf24;line-height:1.1;margin-bottom:5px">${premioMes.nombre}</div>
          ${premioMes.desc?`<div style="font-size:13px;color:#d97706;margin-bottom:10px">${premioMes.desc}</div>`:''}

          <!-- Criterio y posición actual -->
          <div style="background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.25);border-radius:9px;padding:9px 13px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
            <div style="font-size:11px;color:rgba(245,158,11,0.85)">${premioLabel}</div>
            ${premioPos===1?`<span style="background:rgba(245,158,11,0.25);border:1px solid rgba(245,158,11,0.5);border-radius:20px;padding:3px 12px;font-size:11px;font-weight:800;color:#fbbf24">🥇 ¡Vas 1°!</span>`:
            premioPos===2?`<span style="background:rgba(192,192,192,0.15);border:1px solid rgba(192,192,192,0.3);border-radius:20px;padding:3px 12px;font-size:11px;font-weight:800;color:#d1d5db">🥈 Vas 2°</span>`:
            premioPos===3?`<span style="background:rgba(180,83,9,0.15);border:1px solid rgba(180,83,9,0.3);border-radius:20px;padding:3px 12px;font-size:11px;font-weight:800;color:#d97706">🥉 Vas 3°</span>`:
            premioPos?`<span style="background:rgba(107,127,163,0.15);border:1px solid rgba(107,127,163,0.25);border-radius:20px;padding:3px 12px;font-size:11px;color:var(--muted)">Posición ${premioPos}°</span>`:''}
          </div>
        </div>
      </div>
    </div>
    `:''}
  </div>

  <div class="vd-card2">
    <div class="vd-sec" style="margin-bottom:14px">📊 Últimas 6 semanas</div>
    <div style="display:flex;align-items:flex-end;gap:6px;height:100px;margin-bottom:10px">
      ${spark.map((w,i)=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;height:100%">
        <div style="flex:1;width:100%;display:flex;align-items:flex-end;gap:2px">
          <div style="flex:1;background:rgba(212,175,55,0.3);border-radius:3px 3px 0 0;height:${Math.max(Math.round(w.ll/maxSpLL*100),3)}%;min-height:3px" title="${w.ll} llamadas"></div>
          <div style="flex:1;background:var(--accent3);border-radius:3px 3px 0 0;height:${w.ci>0?Math.max(Math.round(w.ci/maxSpCI*100),6):0}%;min-height:${w.ci>0?3:0}px" title="${w.ci} cierres"></div>
        </div>
        <div style="font-size:9px;color:var(--muted)">S${i+1}</div>
      </div>`).join('')}
    </div>
    <div style="display:flex;gap:14px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--muted)"><div style="width:10px;height:7px;background:rgba(212,175,55,0.35);border-radius:2px"></div>Llamadas</div>
      <div style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--muted)"><div style="width:10px;height:7px;background:var(--accent3);border-radius:2px"></div>Cierres</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;border-top:1px solid var(--border);padding-top:12px">
      ${[['📞',mLL,'Llamadas','var(--accent)'],['👤',mDU,'Dueños','#c8a84a'],['📅',mAG,'Entrev.','var(--warn)'],['🏆',mCI,'Cierres','var(--accent3)']].map(([ic,v,lb,cl])=>`
      <div style="text-align:center"><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:${cl}">${v}</div><div style="font-size:9px;color:var(--muted)">${ic} ${lb}</div></div>`).join('')}
    </div>
  </div>
</div>

<!-- ⑥ SEGUIMIENTOS URGENTES -->
${segsUrg.length?`
<div class="vd-sec vda" style="animation-delay:0.2s">🔔 Seguimientos urgentes</div>
<div class="vda" style="animation-delay:0.22s;margin-bottom:22px">
  ${segsUrg.map(s=>`<div class="vd-seg" style="background:${s.fecha<today?'rgba(239,68,68,0.07)':'rgba(245,158,11,0.07)'};border:1px solid ${s.fecha<today?'rgba(239,68,68,0.25)':'rgba(245,158,11,0.25)'}">
    <div style="font-size:18px">${s.prioridad==='Alta'?'🔴':s.prioridad==='Media'?'🟡':'🟢'}</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:13px;font-weight:600">${s.empresa}</div>
      <div style="font-size:11px;color:var(--muted)">${s.contacto||''} · ${fmtD(s.fecha)} ${s.fecha<today?'<span style="color:var(--danger);font-weight:700">· VENCIDO</span>':''}</div>
      ${s.notas?`<div style="font-size:11px;color:var(--muted);margin-top:2px">${s.notas}</div>`:''}
    </div>
    <button onclick="vdHecho(${s.id})" style="background:rgba(200,168,74,0.15);border:1px solid rgba(200,168,74,0.3);border-radius:8px;padding:6px 12px;cursor:pointer;color:var(--accent3);font-size:12px;font-family:'DM Mono',monospace;white-space:nowrap">✅ Hecho</button>
  </div>`).join('')}
</div>`:''}

<!-- ⑦ MIS CONTACTOS -->
<div class="vd-sec vda" style="animation-delay:0.24s">👥 Mis contactos</div>
<div class="vda" style="animation-delay:0.26s;background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:22px">
  <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
    <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700">${allCts.length} contacto${allCts.length!==1?'s':''}</div>
    <button onclick="vdOpenCt()" style="background:var(--accent);border:none;border-radius:8px;padding:7px 14px;color:var(--bg);font-family:'Syne',sans-serif;font-weight:700;font-size:12px;cursor:pointer">+ Agregar</button>
  </div>
  ${allCts.length?allCts.slice(0,6).map(c=>`<div class="vd-ctrow">
    <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--accent2),var(--accent));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#fff;flex-shrink:0">${(c.nombre||'?')[0].toUpperCase()}</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.nombre}</div>
      <div style="font-size:11px;color:var(--muted)">${[c.empresa,c.cargo].filter(Boolean).join(' · ')}</div>
    </div>
    <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
      ${c.tel?`<a href="tel:${c.tel}" style="background:rgba(200,168,74,0.12);border:1px solid rgba(200,168,74,0.25);border-radius:6px;padding:5px 9px;font-size:11px;color:var(--accent3);text-decoration:none">📞</a>`:''}
      ${c.wa?`<a href="https://wa.me/${c.wa.replace(/\D/g,'')}" target="_blank" style="background:rgba(200,168,74,0.12);border:1px solid rgba(200,168,74,0.25);border-radius:6px;padding:5px 9px;font-size:11px;color:var(--accent3);text-decoration:none">💬</a>`:''}
      <span class="badge ${c.estado==='Activo'?'badge-success':c.estado==='Prospecto'?'badge-warn':'badge-info'}">${c.estado||'Lead'}</span>
      <button onclick="vdEditCt(${c.id})" style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:5px 8px;cursor:pointer;color:var(--muted);font-size:11px">✏️</button>
      <button onclick="vdDelCt(${c.id})" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:6px;padding:5px 8px;cursor:pointer;color:var(--danger);font-size:11px">🗑</button>
    </div>
  </div>`).join(''):`<div style="padding:28px;text-align:center;color:var(--muted)"><div style="font-size:36px;margin-bottom:8px">👥</div><div>Sin contactos aún. ¡Agregá tu primer lead!</div></div>`}
</div>

<!-- ⑧ MIS OBJETIVOS PERSONALES -->
${(()=>{
  const opObj=getObjPersonal(vendId,ym);
  const campos=[
    {k:'llamadas',ic:'📞',label:'Llamadas',color:'var(--accent)',tipo:'num'},
    {k:'duenos',ic:'👤',label:'Dueños',color:'#c8a84a',tipo:'num'},
    {k:'entrevistas',ic:'📅',label:'Entrevistas',color:'var(--warn)',tipo:'num'},
    {k:'cierres',ic:'🏆',label:'Cierres',color:'var(--accent3)',tipo:'num'},
    {k:'plata',ic:'💰',label:'Plata a ganar',color:'#34d399',tipo:'money'},
    {k:'proposito',ic:'🌟',label:'Propósito del mes',color:'#e879f9',tipo:'text'},
  ];
  const reales={llamadas:mesLL,duenos:mesDU,entrevistas:mesAG,cierres:mesCI};
  const hayObjetivos=opObj&&campos.some(c=>opObj[c.k]);

  const filaObj=(c)=>{
    if(!opObj||!opObj[c.k]) return '';
    if(c.tipo==='text') return `
      <div style="background:rgba(232,121,249,0.06);border:1px solid rgba(232,121,249,0.2);border-radius:10px;padding:14px 16px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:20px">${c.ic}</span>
          <span style="font-size:13px;font-weight:700;color:#e879f9">${c.label}</span>
        </div>
        <div style="font-size:14px;color:var(--text);font-style:italic;line-height:1.5">"${opObj[c.k]}"</div>
      </div>`;
    if(c.tipo==='money'){
      const v=Number(opObj[c.k])||0;
      return `<div style="background:rgba(52,211,153,0.06);border:1px solid rgba(52,211,153,0.2);border-radius:10px;padding:14px 16px;text-align:center">
        <div style="font-size:20px;margin-bottom:4px">${c.ic}</div>
        <div style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:#34d399">$${v.toLocaleString('es-AR')}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:3px">${c.label}</div>
      </div>`;
    }
    const meta=Number(opObj[c.k])||0;
    const real=reales[c.k]||0;
    const pct=meta>0?Math.min(Math.round(real/meta*100),100):0;
    const over=real>=meta;
    const col=pct>=100?'var(--accent3)':pct>=70?c.color:'var(--danger)';
    return `<div style="background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:10px;padding:14px 16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:20px">${c.ic}</span>
          <span style="font-size:13px;font-weight:600">${c.label}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-family:'DM Mono',monospace;font-size:16px;font-weight:800;color:${col}">${real}<span style="font-size:11px;color:var(--muted);font-weight:400"> / ${meta}</span></span>
          <span style="background:${over?'rgba(200,168,74,0.15)':pct>=70?'rgba(245,158,11,0.12)':'rgba(239,68,68,0.1)'};border:1px solid ${over?'rgba(200,168,74,0.3)':pct>=70?'rgba(245,158,11,0.3)':'rgba(239,68,68,0.3)'};border-radius:20px;padding:3px 10px;font-size:12px;font-weight:800;color:${col}">${pct}%</span>
        </div>
      </div>
      <div style="height:8px;background:var(--surface2);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${over?'linear-gradient(90deg,var(--accent3),#34d399)':'linear-gradient(90deg,'+c.color+','+c.color+'99)'};border-radius:4px;transition:width 0.6s"></div>
      </div>
    </div>`;
  };

  return `
<div class="vda" style="animation-delay:0.27s;margin-bottom:22px">
  <div style="background:var(--surface);border:1px solid rgba(232,121,249,0.25);border-radius:16px;overflow:hidden">
    <div style="background:linear-gradient(135deg,rgba(232,121,249,0.1),rgba(184,146,46,0.08));padding:16px 20px;border-bottom:1px solid rgba(232,121,249,0.2);display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:800;color:#e879f9">🌟 Mis objetivos personales — ${MES[now.getMonth()]} ${now.getFullYear()}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">Más allá de MetoGroup — lo que vos querés lograr este mes</div>
      </div>
      <button onclick="vdAbrirObjPersonal(${vendId},'${ym}')" style="background:rgba(232,121,249,0.15);border:1px solid rgba(232,121,249,0.35);border-radius:8px;padding:8px 16px;cursor:pointer;color:#e879f9;font-weight:700;font-size:12px;white-space:nowrap">${hayObjetivos?'✏️ Editar':'+ Definir'}</button>
    </div>
    <div style="padding:18px 20px">
      ${hayObjetivos ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          ${campos.filter(c=>c.tipo!=='text'&&opObj[c.k]).map(filaObj).join('')}
        </div>
        ${opObj.proposito?filaObj(campos.find(c=>c.k==='proposito')):''}
      ` : `
        <div style="text-align:center;padding:28px 0">
          <div style="font-size:48px;margin-bottom:12px">🌟</div>
          <div style="font-size:14px;font-weight:600;margin-bottom:6px">¿Qué querés lograr este mes?</div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:20px;max-width:280px;margin-left:auto;margin-right:auto">Definí tus metas personales: cuánto querés ganar, cuántas llamadas hacer, cuál es tu propósito</div>
          <button onclick="vdAbrirObjPersonal(${vendId},'${ym}')" style="background:linear-gradient(135deg,rgba(232,121,249,0.2),rgba(184,146,46,0.15));border:1px solid rgba(232,121,249,0.4);border-radius:10px;padding:12px 28px;cursor:pointer;color:#e879f9;font-family:'Syne',sans-serif;font-weight:800;font-size:14px">🌟 Definir mis objetivos</button>
        </div>
      `}
    </div>
  </div>
</div>`;
})()}

<!-- ⑨ MI MES COMPLETO -->
<div class="vd-sec vda" style="animation-delay:0.28s">📆 Mi mes completo — ${MES[now.getMonth()]} ${now.getFullYear()}</div>
<div class="vda" style="animation-delay:0.3s;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:18px 20px;margin-bottom:22px">
  <!-- Totales del mes -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--border)">
    ${[['📞',mesLL,'Llamadas','var(--accent)',obj?.llamadas||null],['👤',mesDU,'Dueños','#c8a84a',obj?.duenos||null],['📅',mesAG,'Entrevistas','var(--warn)',obj?.agendadas||null],['🏆',mesCI,'Cierres','var(--accent3)',obj?.cerradas||null]].map(([ic,v,lb,cl,meta])=>`
    <div style="text-align:center;background:rgba(255,255,255,0.02);border-radius:10px;padding:12px 8px">
      <div style="font-size:18px;margin-bottom:4px">${ic}</div>
      <div style="font-family:'Syne',sans-serif;font-size:32px;font-weight:800;color:${cl};line-height:1">${v}</div>
      <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:4px">${lb}</div>
      ${meta?`<div style="font-size:10px;margin-top:5px;color:${v>=meta?'var(--accent3)':'var(--muted)'}">meta: ${meta} ${v>=meta?'✅':''}</div>`:''}
    </div>`).join('')}
  </div>
  <!-- Progress info -->
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:16px;font-size:12px;color:var(--muted)">
    <div>📋 <b style="color:var(--text)">${diasCargados}</b> de <b style="color:var(--text)">${diasPasados}</b> días cargados · <b style="color:var(--accent)">${diasFuturos}</b> días laborales restantes</div>
    ${diasPasados>0&&diasCargados<diasPasados?`<div style="color:var(--warn)">⚠️ Tenés <b>${diasPasados-diasCargados}</b> día${diasPasados-diasCargados>1?'s':''} sin cargar</div>`:''}
    ${mesCI>0&&mesLL>0?`<div style="color:var(--accent3)">📊 Conversión: <b>${Math.round(mesCI/mesLL*100)}%</b></div>`:''}
  </div>
  <!-- Tabla día por día -->
  <div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;min-width:480px">
      <thead><tr style="background:var(--surface2)">
        <th style="text-align:left;padding:8px 12px;font-size:10px;text-transform:uppercase;color:var(--muted);letter-spacing:1px">Fecha</th>
        <th style="text-align:center;padding:8px;font-size:11px;color:var(--accent)">📞</th>
        <th style="text-align:center;padding:8px;font-size:11px;color:#c8a84a">👤</th>
        <th style="text-align:center;padding:8px;font-size:11px;color:var(--warn)">📅</th>
        <th style="text-align:center;padding:8px;font-size:11px;color:var(--accent3)">🏆</th>
        <th style="padding:8px 12px;font-size:10px;color:var(--muted)">Notas / Empresas</th>
        <th style="padding:8px"></th>
      </tr></thead>
      <tbody>
        ${mesDias.map((x,i)=>{
          const dow2=new Date(x.ds+'T12:00:00').toLocaleDateString('es-AR',{weekday:'short'});
          const isTd2=x.ds===today;
          const sinCargar=!x.isFuture&&!x.lg;
          return`<tr style="border-bottom:1px solid rgba(212,175,55,0.07);${isTd2?'background:rgba(212,175,55,0.04);':''}${i%2===0&&!isTd2?'':''}${sinCargar?'opacity:0.6':''}">
            <td style="padding:8px 12px;font-size:12px;font-weight:600;white-space:nowrap">
              <span style="color:var(--muted);font-size:10px;margin-right:6px">${dow2}</span>${fmtD(x.ds)}${isTd2?` <span style="background:var(--accent);color:var(--bg);border-radius:4px;padding:1px 5px;font-size:9px;font-weight:800">HOY</span>`:''}
            </td>
            <td style="text-align:center;padding:8px;font-size:13px;font-weight:800;color:${x.lg?.llamadas?'var(--accent)':'var(--muted)'}">${x.lg?.llamadas||'—'}</td>
            <td style="text-align:center;padding:8px;font-size:13px;font-weight:800;color:${x.lg?.duenos?'#c8a84a':'var(--muted)'}">${x.lg?.duenos||'—'}</td>
            <td style="text-align:center;padding:8px;font-size:13px;font-weight:800;color:${x.lg?.agendadas?'var(--warn)':'var(--muted)'}">${x.lg?.agendadas||'—'}</td>
            <td style="text-align:center;padding:8px;font-size:13px;font-weight:800;color:${x.lg?.cerradas?'var(--accent3)':'var(--muted)'}">${x.lg?.cerradas||'—'}${x.lg?.cerradas?` <span style="font-size:10px">🏆</span>`:''}</td>
            <td style="padding:8px 12px;font-size:11px;color:var(--muted);max-width:200px">
              ${x.lg?.empresasAgendadas?`<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--accent);font-size:10px">🏢 ${x.lg.empresasAgendadas.split('\n').filter(Boolean).join(', ')}</div>`:''}
              ${x.lg?.notas?`<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${x.lg.notas}</div>`:''}
              ${sinCargar&&!x.isFuture?`<span style="color:var(--warn);font-size:10px">sin cargar</span>`:''}
            </td>
            <td style="padding:8px">
              ${!x.isFuture?`<button onclick="vdOpenDay('${x.ds}')" style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:4px 8px;cursor:pointer;color:var(--muted);font-size:10px">${x.lg?'✏️':'+'}</button>`:''}
            </td>
          </tr>`;
        }).join('')}
        <!-- Fila total -->
        <tr style="background:rgba(212,175,55,0.05);border-top:2px solid rgba(212,175,55,0.2);font-weight:800">
          <td style="padding:10px 12px;font-size:12px;color:var(--accent)">TOTAL</td>
          <td style="text-align:center;padding:10px;font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:var(--accent)">${mesLL}</td>
          <td style="text-align:center;padding:10px;font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:#c8a84a">${mesDU}</td>
          <td style="text-align:center;padding:10px;font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:var(--warn)">${mesAG}</td>
          <td style="text-align:center;padding:10px;font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:var(--accent3)">${mesCI}</td>
          <td colspan="2" style="padding:10px 12px;font-size:11px;color:var(--muted)">${mesCI>0&&mesLL>0?`Conversión: ${Math.round(mesCI/mesLL*100)}%`:''}</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<!-- ⑨ MIS RECORDATORIOS -->
${(()=>{
  const misNotas=_getNotasVend(vendId).sort((a,b)=>(a.fecha||'9999').localeCompare(b.fecha||'9999'));
  const mnVenc=misNotas.filter(n=>!n.leida&&n.fecha&&n.fecha<today);
  const mnHoy=misNotas.filter(n=>!n.leida&&n.fecha===today);
  const mnProx=misNotas.filter(n=>!n.leida&&(!n.fecha||n.fecha>today));
  const mnLeidas=misNotas.filter(n=>n.leida);
  const hayAlgo=mnVenc.length||mnHoy.length||mnProx.length;
  const cardHtml=(n,colorBg,colorBorder,ic)=>`
  <div style="background:${colorBg};border:1px solid ${colorBorder};border-radius:12px;padding:13px 16px;display:flex;gap:12px;align-items:flex-start;margin-bottom:8px">
    <div style="font-size:18px;flex-shrink:0;margin-top:1px">${ic}</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:13px;font-weight:600;margin-bottom:3px">${n.titulo||'(sin título)'}</div>
      ${n.texto?`<div style="font-size:12px;color:var(--muted);margin-bottom:5px;white-space:pre-wrap">${n.texto}</div>`:''}
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        ${n.fecha?`<span style="font-size:10px;color:var(--muted)">📅 ${fmtD(n.fecha)}</span>`:''}
        ${n.prioridad&&n.prioridad!=='Normal'?`<span style="font-size:10px;font-weight:700;color:${n.prioridad==='Alta'?'var(--danger)':'var(--warn)'}">${n.prioridad==='Alta'?'🔴 Alta':'🟡 Media'}</span>`:''}
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0">
      <button onclick="vndMiNota_marcar(${vendId},${n.id})" style="background:rgba(200,168,74,0.12);border:1px solid rgba(200,168,74,0.3);border-radius:7px;padding:5px 10px;cursor:pointer;color:var(--accent3);font-size:11px">✅ Listo</button>
      <button onclick="vndMiNota_del(${vendId},${n.id})" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:7px;padding:5px 10px;cursor:pointer;color:var(--danger);font-size:11px">🗑</button>
    </div>
  </div>`;
  return`
<div class="vd-sec vda" style="animation-delay:0.29s;margin-top:4px">📝 Mis recordatorios</div>
<div class="vda" style="animation-delay:0.31s;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px 20px;margin-bottom:22px">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
    <div style="font-size:12px;color:var(--muted)">${hayAlgo?(mnVenc.length?`<span style="color:var(--danger);font-weight:700">🚨 ${mnVenc.length} vencido${mnVenc.length>1?'s':''}</span> &nbsp;`:'')+(mnHoy.length?`<span style="color:var(--warn);font-weight:700">⚡ ${mnHoy.length} para hoy</span> &nbsp;`:'')+(mnProx.length?`${mnProx.length} próximo${mnProx.length>1?'s':''}`:''):'Sin recordatorios activos 🎉'}</div>
    <button onclick="vndAbrirMiNota(${vendId})" style="background:linear-gradient(135deg,var(--accent2),var(--accent));border:none;border-radius:9px;padding:8px 16px;color:#fff;font-family:'Syne',sans-serif;font-weight:700;font-size:12px;cursor:pointer">+ Nuevo recordatorio</button>
  </div>
  ${mnVenc.length?`<div style="margin-bottom:10px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--danger);font-weight:700;margin-bottom:7px">🚨 Vencidos</div>${mnVenc.map(n=>cardHtml(n,'rgba(239,68,68,0.07)','rgba(239,68,68,0.3)','🚨')).join('')}</div>`:''}
  ${mnHoy.length?`<div style="margin-bottom:10px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--warn);font-weight:700;margin-bottom:7px">⚡ Para hoy</div>${mnHoy.map(n=>cardHtml(n,'rgba(245,158,11,0.07)','rgba(245,158,11,0.3)','⚡')).join('')}</div>`:''}
  ${mnProx.length?`<div style="margin-bottom:10px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--muted);font-weight:700;margin-bottom:7px">📌 Próximos</div>${mnProx.map(n=>cardHtml(n,'var(--surface)','var(--border)','📌')).join('')}</div>`:''}
  ${!hayAlgo?`<div style="text-align:center;padding:28px 20px;color:var(--muted)"><div style="font-size:38px;margin-bottom:10px">📝</div><div style="font-size:13px">Sin recordatorios activos. ¡Agregá uno!</div></div>`:''}
  ${mnLeidas.length?`<details style="margin-top:6px"><summary style="font-size:11px;color:var(--muted);cursor:pointer;padding:6px 0">Ver ${mnLeidas.length} completado${mnLeidas.length>1?'s':''}</summary><div style="margin-top:7px;opacity:0.5">${mnLeidas.slice(0,5).map(n=>cardHtml(n,'var(--surface2)','var(--border)','✅')).join('')}</div></details>`:''}
</div>
<!-- Modal nueva nota vendedor propio -->
<div id="vnd-mi-modal-${vendId}" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);z-index:10001;align-items:center;justify-content:center" onclick="if(this===event.target)this.style.display='none'">
  <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;width:470px;max-width:95vw;box-shadow:0 30px 80px rgba(0,0,0,0.6)">
    <div style="padding:15px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
      <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:15px">📝 Nuevo recordatorio</div>
      <button onclick="document.getElementById('vnd-mi-modal-${vendId}').style.display='none'" style="width:28px;height:28px;border-radius:6px;background:var(--surface2);border:none;cursor:pointer;color:var(--muted)">✕</button>
    </div>
    <div style="padding:18px 20px;display:flex;flex-direction:column;gap:12px">
      <div><label style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:5px">Título *</label>
        <input id="vnd-mi-titulo-${vendId}" placeholder="Ej: Llamar a Empresa ABC..." style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none"></div>
      <div><label style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:5px">Detalle</label>
        <textarea id="vnd-mi-texto-${vendId}" placeholder="Contexto, instrucciones..." style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none;resize:vertical;min-height:60px"></textarea></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div><label style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:5px">📅 Recordar el</label>
          <input id="vnd-mi-fecha-${vendId}" type="date" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none"></div>
        <div><label style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:5px">Prioridad</label>
          <select id="vnd-mi-prio-${vendId}" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none">
            <option value="Normal">Normal</option><option value="Media">Media</option><option value="Alta">Alta</option>
          </select></div>
      </div>
    </div>
    <div style="padding:13px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px">
      <button onclick="document.getElementById('vnd-mi-modal-${vendId}').style.display='none'" style="padding:9px 16px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);color:var(--text);font-size:12px;cursor:pointer">Cancelar</button>
      <button onclick="vndGuardarMiNota(${vendId})" style="padding:9px 18px;border-radius:8px;background:linear-gradient(135deg,var(--accent2),var(--accent));border:none;color:#fff;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;cursor:pointer">💾 Guardar</button>
    </div>
  </div>
</div>`;
})()}

<!-- ⑩ HISTORIAL RECIENTE -->
<div class="vd-sec vda" style="animation-delay:0.32s">📋 Historial reciente</div>
  ${allLogs.length?`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:500px">
    <thead><tr style="background:var(--surface2)">
      <th style="text-align:left;padding:10px 14px;font-size:10px;text-transform:uppercase;color:var(--muted);letter-spacing:1px">Fecha</th>
      <th style="text-align:center;padding:10px;font-size:11px;color:var(--accent)">📞</th>
      <th style="text-align:center;padding:10px;font-size:11px;color:#c8a84a">👤</th>
      <th style="text-align:center;padding:10px;font-size:11px;color:var(--warn)">📅</th>
      <th style="text-align:center;padding:10px;font-size:11px;color:var(--accent3)">🏆</th>
      <th style="text-align:center;padding:10px;font-size:10px;color:var(--muted)">Conv%</th>
      <th style="padding:10px 14px;font-size:10px;color:var(--muted)">Notas</th>
      <th style="padding:10px 8px"></th>
    </tr></thead>
    <tbody>${allLogs.slice(0,14).map((l,i)=>{
      const cv=l.llamadas>0?Math.round((l.cerradas||0)/l.llamadas*100):0;
      return`<tr style="border-bottom:1px solid rgba(212,175,55,0.08);${i%2===0?'':'background:rgba(255,255,255,0.01)'}">
        <td style="padding:10px 14px;font-size:12px;font-weight:600;white-space:nowrap">${fmtD(l.fecha)}</td>
        <td style="text-align:center;padding:10px;font-size:14px;font-weight:800;color:var(--accent)">${l.llamadas||0}</td>
        <td style="text-align:center;padding:10px;font-size:14px;font-weight:800;color:#c8a84a">${l.duenos||0}</td>
        <td style="text-align:center;padding:10px;font-size:14px;font-weight:800;color:var(--warn)">${l.agendadas||0}</td>
        <td style="text-align:center;padding:10px;font-size:14px;font-weight:800;color:var(--accent3)">${l.cerradas||0}</td>
        <td style="text-align:center;padding:10px"><span style="font-size:11px;font-weight:700;color:${cv>=20?'var(--accent3)':cv>=10?'var(--warn)':'var(--muted)'}">${cv}%</span></td>
        <td style="padding:10px 14px;font-size:11px;color:var(--muted);max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${l.notas||'—'}</td>
        <td style="padding:10px 8px"><button onclick="vdOpenDay('${l.fecha}')" style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:4px 8px;cursor:pointer;color:var(--muted);font-size:10px">✏️</button></td>
      </tr>`;}).join('')}
    </tbody>
  </table></div>`:`<div style="padding:30px;text-align:center;color:var(--muted)"><div style="font-size:36px;margin-bottom:8px">📋</div><div>Sin actividades. ¡Empezá a registrar!</div></div>`}
</div>

<!-- MODAL DÍA -->
<div id="vd_modal_day" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);z-index:9999;align-items:center;justify-content:center" onclick="if(this===event.target)vdCloseDay()">
  <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;width:540px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.6)">
    <div style="padding:16px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--surface);z-index:1">
      <div id="vd_day_title" style="font-family:'Syne',sans-serif;font-weight:700;font-size:16px">📋 Registrar Actividad</div>
      <button onclick="vdCloseDay()" style="width:30px;height:30px;border-radius:7px;background:var(--surface2);border:none;cursor:pointer;color:var(--muted);font-size:14px">✕</button>
    </div>
    <div style="padding:20px 22px">
      <input type="hidden" id="vd_day_date">
      <div style="background:var(--surface2);border-radius:10px;padding:14px;margin-bottom:14px">
        <div style="font-size:10px;color:var(--accent);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Métricas</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div><label style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:5px">☎️ Llamadas</label><input id="vd_d_ll" type="number" min="0" placeholder="0" style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none"></div>
          <div><label style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:5px">👤 Dueños</label><input id="vd_d_du" type="number" min="0" placeholder="0" style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none"></div>
          <div><label style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:5px">📅 Entrevistas</label><input id="vd_d_ag" type="number" min="0" placeholder="0" style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none"></div>
          <div><label style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:5px">🏆 Cierres</label><input id="vd_d_ci" type="number" min="0" placeholder="0" style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none"></div>
        </div>
      </div>
      <div style="margin-bottom:12px"><label style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:5px">🏢 Empresas</label>
        <textarea id="vd_d_emp" placeholder="Empresa ABC&#10;Empresa XYZ..." style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none;resize:vertical;min-height:60px"></textarea></div>
      <div><label style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:5px">📝 Notas</label>
        <textarea id="vd_d_no" placeholder="Observaciones..." style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none;resize:vertical;min-height:55px"></textarea></div>
    </div>
    <div style="padding:14px 22px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:10px">
      <button onclick="vdCloseDay()" style="padding:9px 16px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);color:var(--text);font-family:'DM Mono',monospace;font-size:12px;cursor:pointer">Cancelar</button>
      <button onclick="vdSaveDay()" style="padding:9px 18px;border-radius:8px;background:linear-gradient(135deg,var(--accent2),var(--accent));border:none;color:#fff;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;cursor:pointer">💾 Guardar</button>
    </div>
  </div>
</div>

<!-- MODAL CONTACTO -->
<div id="vd_modal_ct" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);z-index:9999;align-items:center;justify-content:center" onclick="if(this===event.target)vdCloseCt()">
  <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;width:520px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.6)">
    <div style="padding:16px 22px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--surface);z-index:1">
      <div id="vd_ct_title" style="font-family:'Syne',sans-serif;font-weight:700;font-size:16px">👤 Nuevo Contacto</div>
      <button onclick="vdCloseCt()" style="width:30px;height:30px;border-radius:7px;background:var(--surface2);border:none;cursor:pointer;color:var(--muted);font-size:14px">✕</button>
    </div>
    <div style="padding:20px 22px">
      <input type="hidden" id="vd_ct_id">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div><label style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:5px">Nombre *</label><input id="vd_ct_nombre" placeholder="Juan García" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none"></div>
        <div><label style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:5px">Empresa</label><input id="vd_ct_empresa" placeholder="Empresa S.A." style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div><label style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:5px">Cargo</label><input id="vd_ct_cargo" placeholder="CEO, Dueño..." style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none"></div>
        <div><label style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:5px">Estado</label>
          <select id="vd_ct_estado" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none">
            <option>Lead</option><option>Prospecto</option><option>Activo</option><option>No interesado</option>
          </select></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div><label style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:5px">Teléfono</label><input id="vd_ct_tel" placeholder="+54 11..." style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none"></div>
        <div><label style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:5px">WhatsApp</label><input id="vd_ct_wa" placeholder="+54 9 11..." style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none"></div>
      </div>
      <div><label style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:5px">Notas</label>
        <textarea id="vd_ct_notas" placeholder="Intereses, contexto..." style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none;resize:vertical;min-height:60px"></textarea></div>
    </div>
    <div style="padding:14px 22px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:10px">
      <button onclick="vdCloseCt()" style="padding:9px 16px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);color:var(--text);font-family:'DM Mono',monospace;font-size:12px;cursor:pointer">Cancelar</button>
      <button onclick="vdSaveCt()" style="padding:9px 18px;border-radius:8px;background:linear-gradient(135deg,var(--accent2),var(--accent));border:none;color:#fff;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;cursor:pointer">💾 Guardar</button>
    </div>
  </div>
</div>
  `;
}

// ── VENDEDOR FUNCIONES ───────────────────────────────────────
function vdRegistrar(){ vdOpenDay(todayStr()); }

function vdCount(key,delta){
  const today=todayStr(),logs=S.get('crm_logs');
  let log=logs.find(l=>l.vendedor===currentUser.nombre&&l.fecha===today);
  if(!log){log={id:S.nextId('crm_logs'),vendedor:currentUser.nombre,fecha:today,llamadas:0,duenos:0,agendadas:0,cerradas:0,notas:'',empresasAgendadas:'',empresasSeguimiento:''};logs.push(log);}
  log[key]=Math.max(0,(log[key]||0)+delta);
  S.set('crm_logs',logs);
  const el=document.getElementById('vdcnt_'+key);
  if(el){el.textContent=log[key];el.style.transform='scale(1.3)';setTimeout(()=>el.style.transform='scale(1)',150);}
}

function vdSaveHoy(){
  const today=todayStr(),logs=S.get('crm_logs');
  let log=logs.find(l=>l.vendedor===currentUser.nombre&&l.fecha===today);
  if(!log){log={id:S.nextId('crm_logs'),vendedor:currentUser.nombre,fecha:today,llamadas:0,duenos:0,agendadas:0,cerradas:0,notas:'',empresasAgendadas:'',empresasSeguimiento:''};logs.push(log);}
  log.notas=document.getElementById('vd_notas_hoy')?.value||'';
  S.set('crm_logs',logs);
  toast('✅ Actividad guardada');
}

function vdAbrirObjPersonal(vendId, ym){
  const opObj=getObjPersonal(vendId,ym)||{};
  // Crear modal dinámico
  document.getElementById('modal-obj-personal')?.remove();
  const MES2=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const [y,m]=ym.split('-');
  const mesNom2=MES2[parseInt(m)-1]+' '+y;
  const mo=document.createElement('div');
  mo.className='modal-overlay open';
  mo.id='modal-obj-personal';
  mo.innerHTML=`
  <div class="modal" style="max-width:520px">
    <div class="modal-head" style="background:linear-gradient(135deg,rgba(232,121,249,0.12),rgba(184,146,46,0.08));border-bottom-color:rgba(232,121,249,0.25)">
      <div class="modal-title" style="color:#e879f9">🌟 Mis objetivos personales — ${mesNom2}</div>
      <button class="modal-close" onclick="document.getElementById('modal-obj-personal').remove()">✕</button>
    </div>
    <div class="modal-body">
      <div style="background:rgba(232,121,249,0.06);border:1px solid rgba(232,121,249,0.2);border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:var(--muted)">
        Solo vos podés ver y editar estos objetivos. Son tus metas personales, más allá de lo que pide MetoGroup.
      </div>
      <div style="background:var(--surface2);border-radius:12px;padding:14px;margin-bottom:14px">
        <div style="font-size:10px;color:#e879f9;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;font-weight:700">📊 Métricas</div>
        <div class="form-row">
          <div class="form-group"><label>📞 Llamadas que quiero hacer</label><input id="op-llamadas" type="number" min="0" placeholder="0" value="${opObj.llamadas||''}"></div>
          <div class="form-group"><label>👤 Dueños que quiero contactar</label><input id="op-duenos" type="number" min="0" placeholder="0" value="${opObj.duenos||''}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>📅 Entrevistas que quiero lograr</label><input id="op-entrevistas" type="number" min="0" placeholder="0" value="${opObj.entrevistas||''}"></div>
          <div class="form-group"><label>🏆 Cierres que quiero hacer</label><input id="op-cierres" type="number" min="0" placeholder="0" value="${opObj.cierres||''}"></div>
        </div>
      </div>
      <div class="form-group" style="margin-bottom:14px">
        <label>💰 Plata que quiero ganar este mes</label>
        <input id="op-plata" type="number" min="0" placeholder="Ej: 500000" value="${opObj.plata||''}">
        <div style="font-size:10px;color:var(--muted);margin-top:4px">En pesos, sin puntos ni comas</div>
      </div>
      <div class="form-group">
        <label>🌟 Propósito del mes — ¿por qué lo hacés?</label>
        <textarea id="op-proposito" placeholder="Ej: Para pagarme las vacaciones en Brasil. Para darle algo especial a mi familia. Para demostrarme que puedo..." style="min-height:80px;resize:vertical">${opObj.proposito||''}</textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="document.getElementById('modal-obj-personal').remove()">Cancelar</button>
      <button class="btn" onclick="vdGuardarObjPersonal(${vendId},'${ym}')" style="background:linear-gradient(135deg,rgba(232,121,249,0.8),rgba(184,146,46,0.8));border:none;color:#fff;font-family:'Syne',sans-serif;font-weight:800;font-size:13px;padding:10px 22px;border-radius:8px;cursor:pointer">🌟 Guardar mis objetivos</button>
    </div>
  </div>`;
  document.body.appendChild(mo);
}

function vdGuardarObjPersonal(vendId, ym){
  const obj={
    llamadas:Number(document.getElementById('op-llamadas').value)||0,
    duenos:Number(document.getElementById('op-duenos').value)||0,
    entrevistas:Number(document.getElementById('op-entrevistas').value)||0,
    cierres:Number(document.getElementById('op-cierres').value)||0,
    plata:Number(document.getElementById('op-plata').value)||0,
    proposito:document.getElementById('op-proposito').value.trim(),
  };
  setObjPersonal(vendId, ym, obj);
  document.getElementById('modal-obj-personal')?.remove();
  renderCRM();
  toast('🌟 Objetivos personales guardados');
}

function vdOpenDay(ds){
  const log=S.get('crm_logs').find(l=>l.vendedor===currentUser.nombre&&l.fecha===ds)||{};
  const d=new Date(ds+'T12:00:00');
  const DIAS2=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  document.getElementById('vd_day_date').value=ds;
  document.getElementById('vd_day_title').textContent='📋 '+DIAS2[d.getDay()]+' '+fmtD(ds);
  document.getElementById('vd_d_ll').value=log.llamadas||0;
  document.getElementById('vd_d_du').value=log.duenos||0;
  document.getElementById('vd_d_ag').value=log.agendadas||0;
  document.getElementById('vd_d_ci').value=log.cerradas||0;
  document.getElementById('vd_d_no').value=log.notas||'';
  document.getElementById('vd_d_emp').value=log.empresasAgendadas||'';
  const m=document.getElementById('vd_modal_day');
  m.style.display='flex';
}
function vdCloseDay(){document.getElementById('vd_modal_day').style.display='none';}
function vdSaveDay(){
  const ds=document.getElementById('vd_day_date').value;if(!ds)return;
  const logs=S.get('crm_logs');
  let log=logs.find(l=>l.vendedor===currentUser.nombre&&l.fecha===ds);
  if(!log){log={id:S.nextId('crm_logs'),vendedor:currentUser.nombre,fecha:ds,llamadas:0,duenos:0,agendadas:0,cerradas:0,notas:'',empresasAgendadas:'',empresasSeguimiento:''};logs.push(log);}
  log.llamadas=Number(document.getElementById('vd_d_ll').value)||0;
  log.duenos=Number(document.getElementById('vd_d_du').value)||0;
  log.agendadas=Number(document.getElementById('vd_d_ag').value)||0;
  log.cerradas=Number(document.getElementById('vd_d_ci').value)||0;
  log.notas=document.getElementById('vd_d_no').value||'';
  log.empresasAgendadas=document.getElementById('vd_d_emp').value||'';
  S.set('crm_logs',logs);
  vdCloseDay();
  renderCRM();
  // Mostrar resumen de conversión si hay datos útiles
  if(log.llamadas>0){
    setTimeout(()=>vdShowConvResumen(ds,log),200);
  } else {
    toast('✅ Actividad guardada');
  }
}

// ── RESUMEN DE CONVERSIÓN POST-GUARDADO ───────────────────────
function vdShowConvResumen(ds, log){
  const nombre=currentUser.nombre;
  const now=new Date();

  // Ratios del día
  const r1=log.llamadas>0?Math.round(log.duenos/log.llamadas*100):0;   // llamadas → dueños
  const r2=log.duenos>0?Math.round(log.agendadas/log.duenos*100):0;    // dueños → entrevistas
  const r3=log.agendadas>0?Math.round(log.cerradas/log.agendadas*100):0; // entrevistas → cierres

  // Calcular stats de semanas anteriores (por semana ISO)
  const allLogs=S.get('crm_logs').filter(l=>l.vendedor===nombre&&l.fecha<=ds).sort((a,b)=>a.fecha.localeCompare(b.fecha));

  function weekKey(dateStr){
    const d=new Date(dateStr+'T12:00:00');
    const day=d.getDay()||7;
    d.setDate(d.getDate()+4-day);
    const y=d.getFullYear();
    const wn=Math.ceil(((d-new Date(y,0,1))/86400000+1)/7);
    return `${y}-W${String(wn).padStart(2,'0')}`;
  }

  // Agrupar logs por semana
  const byWeek={};
  allLogs.forEach(l=>{
    const wk=weekKey(l.fecha);
    if(!byWeek[wk]) byWeek[wk]={ll:0,du:0,ag:0,ci:0};
    byWeek[wk].ll+=l.llamadas||0;
    byWeek[wk].du+=l.duenos||0;
    byWeek[wk].ag+=l.agendadas||0;
    byWeek[wk].ci+=l.cerradas||0;
  });

  const thisWeek=weekKey(ds);
  const sortedWeeks=Object.keys(byWeek).sort();
  const weeksBefore=sortedWeeks.filter(w=>w<thisWeek);
  const lastWeek=weeksBefore[weeksBefore.length-1]||null;
  const prevWeek=weeksBefore[weeksBefore.length-2]||null;

  const wStats=byWeek[thisWeek]||{ll:0,du:0,ag:0,ci:0};
  const lStats=lastWeek?byWeek[lastWeek]:{ll:0,du:0,ag:0,ci:0};
  const pStats=prevWeek?byWeek[prevWeek]:{ll:0,du:0,ag:0,ci:0};

  const wR1=wStats.ll>0?Math.round(wStats.du/wStats.ll*100):0;
  const wR2=wStats.du>0?Math.round(wStats.ag/wStats.du*100):0;
  const lR1=lStats.ll>0?Math.round(lStats.du/lStats.ll*100):0;
  const lR2=lStats.du>0?Math.round(lStats.ag/lStats.du*100):0;
  const pR1=pStats.ll>0?Math.round(pStats.du/pStats.ll*100):0;
  const pR2=pStats.du>0?Math.round(pStats.ag/pStats.du*100):0;

  // Meta: +3% por semana sobre el promedio anterior
  const metaR1=lastWeek?Math.min(Math.round(lR1*1.03),100):null;
  const metaR2=lastWeek?Math.min(Math.round(lR2*1.03),100):null;

  const arrow=(curr,prev)=>{
    if(!prev) return '';
    const d=curr-prev;
    if(d>0) return `<span style="color:var(--accent3);font-size:11px;font-weight:700">▲ +${d}%</span>`;
    if(d<0) return `<span style="color:var(--danger);font-size:11px;font-weight:700">▼ ${d}%</span>`;
    return `<span style="color:var(--muted);font-size:11px">= igual</span>`;
  };

  const bar=(pct,color,meta)=>{
    const w=Math.min(pct,100);
    const mw=meta?Math.min(meta,100):null;
    return `<div style="position:relative;height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:visible;margin-top:6px">
      <div style="height:100%;width:${w}%;background:${color};border-radius:4px;transition:width 0.8s ease"></div>
      ${mw!==null?`<div style="position:absolute;top:-3px;left:${mw}%;width:2px;height:14px;background:rgba(255,255,255,0.5);border-radius:1px" title="Meta semana: ${meta}%"></div>`:''}
    </div>`;
  };

  const sparkRow=(vals,color)=>{
    const max=Math.max(...vals,1);
    return vals.map((v,i)=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
      <div style="width:100%;background:${color};border-radius:3px 3px 0 0;height:${Math.max(Math.round(v/max*40),v>0?4:0)}px;min-height:${v>0?3:0}px;transition:height 0.5s ease"></div>
      <div style="font-size:9px;color:var(--muted)">${['S-4','S-3','S-2','S-1','Esta'][i]||''}</div>
    </div>`).join('');
  };

  // Últimas 5 semanas para sparklines
  const last5=sortedWeeks.slice(-5);
  while(last5.length<5) last5.unshift(null);
  const spark1=last5.map(w=>w&&byWeek[w]?byWeek[w].ll>0?Math.round(byWeek[w].du/byWeek[w].ll*100):0:0);
  const spark2=last5.map(w=>w&&byWeek[w]?byWeek[w].du>0?Math.round(byWeek[w].ag/byWeek[w].du*100):0:0);

  // Crear modal de resumen
  const existing=document.getElementById('vd-conv-modal');
  if(existing)existing.remove();

  const el=document.createElement('div');
  el.id='vd-conv-modal';
  el.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.8);backdrop-filter:blur(5px);z-index:10000;display:flex;align-items:center;justify-content:center;animation:vdup 0.25s ease';
  el.onclick=function(e){if(e.target===this)this.remove();};

  el.innerHTML=`
  <div style="background:var(--surface);border:1px solid var(--border);border-radius:18px;width:560px;max-width:95vw;max-height:92vh;overflow-y:auto;box-shadow:0 30px 100px rgba(0,0,0,0.7)">

    <!-- HEADER -->
    <div style="padding:18px 22px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-family:'Syne',sans-serif;font-size:17px;font-weight:800">📊 Resumen del día</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">${fmtD(ds)} · ${log.llamadas} llamadas realizadas</div>
      </div>
      <button onclick="document.getElementById('vd-conv-modal').remove()" style="width:32px;height:32px;border-radius:8px;background:var(--surface2);border:none;cursor:pointer;color:var(--muted);font-size:14px;display:flex;align-items:center;justify-content:center">✕</button>
    </div>

    <div style="padding:20px 22px">

      <!-- RATIOS DEL DÍA -->
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--muted);font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:10px">Conversiones de hoy <div style="flex:1;height:1px;background:var(--border)"></div></div>

      <!-- Funnel visual -->
      <div style="display:flex;align-items:stretch;gap:0;margin-bottom:20px;background:var(--surface2);border-radius:12px;overflow:hidden">
        ${[
          {ic:'📞',lb:'Llamadas',v:log.llamadas,cl:'var(--accent)',bg:'rgba(212,175,55,0.08)'},
          {ic:'👤',lb:'Dueños',v:log.duenos,cl:'#c8a84a',bg:'rgba(184,146,46,0.08)',r:r1,rLb:'tasa de contacto'},
          {ic:'📅',lb:'Entrevistas',v:log.agendadas,cl:'var(--warn)',bg:'rgba(245,158,11,0.08)',r:r2,rLb:'tasa de agendado'},
          {ic:'🏆',lb:'Cierres',v:log.cerradas,cl:'var(--accent3)',bg:'rgba(200,168,74,0.08)',r:r3,rLb:'tasa de cierre'},
        ].map((s,i)=>`
        ${i>0?`<div style="display:flex;align-items:center;padding:0 4px;background:var(--surface2)">
          <div style="text-align:center">
            <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:${s.r>=30?'var(--accent3)':s.r>=15?'var(--warn)':'var(--danger)'}">${s.r}%</div>
            <div style="font-size:9px;color:var(--muted);white-space:nowrap">→</div>
          </div>
        </div>`:''}
        <div style="flex:1;background:${s.bg};padding:14px 12px;text-align:center">
          <div style="font-size:20px;margin-bottom:4px">${s.ic}</div>
          <div style="font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:${s.cl};line-height:1">${s.v}</div>
          <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:3px">${s.lb}</div>
        </div>`).join('')}
      </div>

      <!-- CONVERSIÓN SEMANAL ACUMULADA -->
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--muted);font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:10px">Esta semana acumulado <div style="flex:1;height:1px;background:var(--border)"></div></div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">

        <!-- Llamadas → Dueños -->
        <div style="background:var(--surface2);border-radius:12px;padding:14px">
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">📞 → 👤 Tasa de contacto</div>
          <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px">
            <div style="font-family:'Syne',sans-serif;font-size:32px;font-weight:800;color:#c8a84a;line-height:1">${wR1}%</div>
            ${arrow(wR1,lR1)}
          </div>
          ${bar(wR1,'#c8a84a',metaR1)}
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-top:6px">
            <span>${wStats.du} de ${wStats.ll} llamadas</span>
            ${metaR1!==null?`<span style="color:rgba(255,255,255,0.35)">meta: ${metaR1}%</span>`:''}
          </div>
          <!-- Sparkline semanas -->
          <div style="display:flex;align-items:flex-end;gap:3px;height:44px;margin-top:10px;border-top:1px solid rgba(255,255,255,0.05);padding-top:8px">
            ${sparkRow(spark1,'rgba(184,146,46,0.5)')}
          </div>
        </div>

        <!-- Dueños → Entrevistas -->
        <div style="background:var(--surface2);border-radius:12px;padding:14px">
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">👤 → 📅 Tasa de agendado</div>
          <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px">
            <div style="font-family:'Syne',sans-serif;font-size:32px;font-weight:800;color:var(--warn);line-height:1">${wR2}%</div>
            ${arrow(wR2,lR2)}
          </div>
          ${bar(wR2,'var(--warn)',metaR2)}
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-top:6px">
            <span>${wStats.ag} de ${wStats.du} dueños</span>
            ${metaR2!==null?`<span style="color:rgba(255,255,255,0.35)">meta: ${metaR2}%</span>`:''}
          </div>
          <!-- Sparkline semanas -->
          <div style="display:flex;align-items:flex-end;gap:3px;height:44px;margin-top:10px;border-top:1px solid rgba(255,255,255,0.05);padding-top:8px">
            ${sparkRow(spark2,'rgba(245,158,11,0.5)')}
          </div>
        </div>
      </div>

      <!-- TENDENCIA MEJORA CONTINUA -->
      ${lastWeek?`
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--muted);font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:10px">📈 Mejora continua (+3% semanal) <div style="flex:1;height:1px;background:var(--border)"></div></div>
      <div style="background:rgba(200,168,74,0.06);border:1px solid rgba(200,168,74,0.2);border-radius:12px;padding:14px 16px;margin-bottom:16px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <div style="font-size:11px;color:var(--muted);margin-bottom:6px">Tasa de contacto</div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              ${[prevWeek&&pR1>0?`<div style="text-align:center"><div style="font-size:9px;color:var(--muted)">S-2</div><div style="font-weight:700;color:var(--muted)">${pR1}%</div></div>`:'']
              .filter(Boolean).join('')}
              <div style="text-align:center"><div style="font-size:9px;color:var(--muted)">S-1</div><div style="font-weight:700;color:var(--text)">${lR1}%</div></div>
              <div style="font-size:12px;color:var(--muted)">→</div>
              <div style="text-align:center">
                <div style="font-size:9px;color:var(--muted)">Esta</div>
                <div style="font-weight:800;color:${wR1>=metaR1?'var(--accent3)':'var(--warn)'}">${wR1}%</div>
              </div>
              <div style="font-size:12px;color:var(--muted)">→</div>
              <div style="text-align:center">
                <div style="font-size:9px;color:var(--accent)">Meta próx.</div>
                <div style="font-weight:800;color:var(--accent)">${Math.min(Math.round(wR1*1.03),100)}%</div>
              </div>
            </div>
            <div style="margin-top:8px;font-size:11px;color:${wR1>=metaR1?'var(--accent3)':wR1>=(metaR1-3)?'var(--warn)':'var(--danger)'}">
              ${wR1>=metaR1?'✅ Superaste la meta semanal':wR1>=(metaR1-3)?`⚡ Casi — te faltan ${metaR1-wR1}% para la meta`:`↗ Meta: ${metaR1}% · Diferencia: ${metaR1-wR1}%`}
            </div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--muted);margin-bottom:6px">Tasa de agendado</div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              ${[prevWeek&&pR2>0?`<div style="text-align:center"><div style="font-size:9px;color:var(--muted)">S-2</div><div style="font-weight:700;color:var(--muted)">${pR2}%</div></div>`:'']
              .filter(Boolean).join('')}
              <div style="text-align:center"><div style="font-size:9px;color:var(--muted)">S-1</div><div style="font-weight:700;color:var(--text)">${lR2}%</div></div>
              <div style="font-size:12px;color:var(--muted)">→</div>
              <div style="text-align:center">
                <div style="font-size:9px;color:var(--muted)">Esta</div>
                <div style="font-weight:800;color:${wR2>=metaR2?'var(--accent3)':'var(--warn)'}">${wR2}%</div>
              </div>
              <div style="font-size:12px;color:var(--muted)">→</div>
              <div style="text-align:center">
                <div style="font-size:9px;color:var(--accent)">Meta próx.</div>
                <div style="font-weight:800;color:var(--accent)">${Math.min(Math.round(wR2*1.03),100)}%</div>
              </div>
            </div>
            <div style="margin-top:8px;font-size:11px;color:${wR2>=metaR2?'var(--accent3)':wR2>=(metaR2-3)?'var(--warn)':'var(--danger)'}">
              ${wR2>=metaR2?'✅ Superaste la meta semanal':wR2>=(metaR2-3)?`⚡ Casi — te faltan ${metaR2-wR2}% para la meta`:`↗ Meta: ${metaR2}% · Diferencia: ${metaR2-wR2}%`}
            </div>
          </div>
        </div>
      </div>`:`
      <div style="background:rgba(212,175,55,0.05);border:1px solid rgba(212,175,55,0.15);border-radius:12px;padding:14px 16px;margin-bottom:16px;font-size:12px;color:var(--muted);text-align:center">
        📊 Cargá actividad la semana que viene para ver tu evolución y metas de mejora continua
      </div>`}

      <!-- MENSAJE MOTIVACIONAL DEL DÍA -->
      <div style="background:${r1>=30&&r2>=30?'rgba(200,168,74,0.1)':r1>=15||r2>=15?'rgba(245,158,11,0.08)':'rgba(239,68,68,0.07)'};border:1px solid ${r1>=30&&r2>=30?'rgba(200,168,74,0.25)':r1>=15||r2>=15?'rgba(245,158,11,0.25)':'rgba(239,68,68,0.2)'};border-radius:10px;padding:12px 16px;font-size:13px;font-weight:600;color:${r1>=30&&r2>=30?'var(--accent3)':r1>=15||r2>=15?'var(--warn)':'var(--text)'}">
        ${r1>=40&&r2>=40?'🔥 Día explosivo. Tus dos conversiones están al tope. ¡Así se hace!':
          r1>=30&&r2>=30?'💪 Muy buen día. Estás convirtiendo bien en toda la cadena.':
          r1>=20&&r2>=20?'📈 Día sólido. Fijate si podés mejorar el agendado la semana que viene.':
          r1>=15?'🎯 Buen volumen. El foco ahora: convertir más dueños en entrevistas.':
          r1>0?'💡 Día de aprendizaje. Cada llamada es datos. Seguí cargando.':
          '📋 Actividad registrada. Completá las métricas para ver tus ratios.'}
      </div>

    </div>

    <div style="padding:14px 22px;border-top:1px solid var(--border);text-align:center">
      <button onclick="document.getElementById('vd-conv-modal').remove()" style="background:linear-gradient(135deg,var(--accent2),var(--accent));border:none;border-radius:10px;padding:10px 28px;color:#fff;font-family:'Syne',sans-serif;font-weight:700;font-size:14px;cursor:pointer">✓ Entendido</button>
    </div>
  </div>`;

  document.body.appendChild(el);
}

function vdHecho(id){
  const items=S.get('crm_seguimientos');
  const i=items.findIndex(x=>x.id===id);
  if(i>-1){items[i].hecho=true;items[i].fechaHecho=todayStr();}
  S.set('crm_seguimientos',items);
  toast('✅ Seguimiento completado');
  renderCRM();
}

function _vdCtKey(){return 'vdct_'+currentUser.nombre.replace(/\W/g,'_');}
function vdOpenCt(){
  document.getElementById('vd_ct_id').value='';
  ['nombre','empresa','cargo','tel','wa','notas'].forEach(f=>{const el=document.getElementById('vd_ct_'+f);if(el)el.value='';});
  const est=document.getElementById('vd_ct_estado');if(est)est.value='Lead';
  document.getElementById('vd_ct_title').textContent='👤 Nuevo Contacto';
  document.getElementById('vd_modal_ct').style.display='flex';
}
function vdEditCt(id){
  const c=(getVendContactos(currentUser.nombre)).find(x=>x.id===id);if(!c)return;
  document.getElementById('vd_ct_id').value=id;
  ['nombre','empresa','cargo','tel','wa','notas'].forEach(f=>{const el=document.getElementById('vd_ct_'+f);if(el)el.value=c[f]||'';});
  const est=document.getElementById('vd_ct_estado');if(est)est.value=c.estado||'Lead';
  document.getElementById('vd_ct_title').textContent='✏️ Editar Contacto';
  document.getElementById('vd_modal_ct').style.display='flex';
}
function vdCloseCt(){document.getElementById('vd_modal_ct').style.display='none';}
function vdSaveCt(){
  const id=document.getElementById('vd_ct_id').value;
  const cts=getVendContactos(currentUser.nombre);
  const item={
    id:id?Number(id):S.nextId('vend_contactos'),
    nombre:document.getElementById('vd_ct_nombre').value,
    empresa:document.getElementById('vd_ct_empresa').value,
    cargo:document.getElementById('vd_ct_cargo').value,
    estado:document.getElementById('vd_ct_estado').value,
    tel:document.getElementById('vd_ct_tel').value,
    wa:document.getElementById('vd_ct_wa').value,
    notas:document.getElementById('vd_ct_notas').value,
  };
  if(!item.nombre){toast('⚠️ Ingresá el nombre');return;}
  if(id){const i=cts.findIndex(x=>x.id===Number(id));if(i>-1)cts[i]=item;else cts.push(item);}else cts.push(item);
  setVendContactos(currentUser.nombre,cts);
  vdCloseCt();
  trackActivity('save:contacto');toast('✅ Contacto guardado');
  renderCRM();
}
function vdDelCt(id){
  if(!confirm('¿Eliminar contacto?'))return;
  setVendContactos(currentUser.nombre,(getVendContactos(currentUser.nombre)).filter(c=>c.id!==id));
  renderCRM();
}

// ── NOTAS / AVISOS DEL VENDEDOR ─────────────────────────────
function _notaKey(vendId){ return 'crm_notas_vend'; }
function _getNotasVend(vendId){ return (S.get('crm_notas_vend')||[]).filter(n=>String(n.vendedorId)===String(vendId)); }
function _setNotasVend(vendId, notasVend){
  // Merge: keep other vendors' notes, replace this vendor's
  const all = (S.get('crm_notas_vend')||[]).filter(n=>String(n.vendedorId)!==String(vendId));
  notasVend.forEach(n=>{ n.vendedorId=Number(vendId); });
  S.set('crm_notas_vend', all.concat(notasVend));
}

// ── DESGLOSE DE COMISIONES (click en tarjeta del vendedor) ───
function vdDetalleComisiones(tipo){
  const nombre=currentUser.nombre;
  const vendRec=S.get('vendedores').find(v=>v.nombre===nombre)||{};
  const comUnit=Number(vendRec.comision)||300;
  const ym=todayStr().substring(0,7);
  const MES_NOM=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mesNom=MES_NOM[parseInt(ym.split('-')[1])-1];
  const misAuds=S.get('auditorias').filter(a=>a.vendedor===nombre);

  let titulo, audsDetalle, esMoneda=true;
  if(tipo==='acum'){
    titulo='Comisiones acumuladas — historial completo';
    audsDetalle=misAuds.filter(a=>a.estado==='Completada');
  } else if(tipo==='mes'){
    titulo='Comisiones de '+mesNom+' — cierres confirmados';
    audsDetalle=misAuds.filter(a=>a.estado==='Completada'&&(a.fInforme||'').startsWith(ym));
  } else {
    titulo='Auditorías activas — potencial de comisión';
    audsDetalle=misAuds.filter(a=>a.estado!=='Completada');
    esMoneda=false;
  }

  const total=audsDetalle.length*comUnit;
  const colorCl=tipo==='acum'?'var(--accent3)':tipo==='mes'?'var(--accent)':'#c8a84a';
  const bgC=tipo==='acum'?'rgba(200,168,74,0.08)':tipo==='mes'?'rgba(212,175,55,0.07)':'rgba(184,146,46,0.08)';
  const bdC=tipo==='acum'?'rgba(200,168,74,0.25)':tipo==='mes'?'rgba(212,175,55,0.2)':'rgba(184,146,46,0.25)';

  const existing=document.getElementById('vd-com-detalle');
  if(existing)existing.remove();
  const el=document.createElement('div');
  el.id='vd-com-detalle';
  el.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.82);backdrop-filter:blur(5px);z-index:10000;display:flex;align-items:center;justify-content:center;animation:vdup 0.2s ease';
  el.onclick=e=>{if(e.target===el)el.remove();};

  el.innerHTML=`
  <div style="background:var(--surface);border:1px solid var(--border);border-radius:18px;width:580px;max-width:95vw;max-height:88vh;overflow-y:auto;box-shadow:0 30px 80px rgba(0,0,0,0.7)">
    <div style="padding:18px 22px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--surface);z-index:1;border-radius:18px 18px 0 0">
      <div>
        <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800">💰 ${titulo}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">${fmt(comUnit)} por auditoría · ${audsDetalle.length} registros</div>
      </div>
      <button onclick="document.getElementById('vd-com-detalle').remove()" style="width:30px;height:30px;border-radius:7px;background:var(--surface2);border:none;cursor:pointer;color:var(--muted);font-size:14px;display:flex;align-items:center;justify-content:center">✕</button>
    </div>
    <div style="padding:18px 22px">
      <!-- Total -->
      <div style="background:${bgC};border:1px solid ${bdC};border-radius:14px;padding:18px 22px;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);margin-bottom:4px">${tipo==='activas'?'Potencial total':tipo==='acum'?'Total acumulado':'Total del mes'}</div>
          <div style="font-family:'Syne',sans-serif;font-size:38px;font-weight:800;color:${colorCl};line-height:1">${tipo==='activas'?audsDetalle.length+' en proceso':fmt(total)}</div>
          ${tipo==='activas'?`<div style="font-size:12px;color:var(--muted);margin-top:5px">Valor potencial: ${fmt(total)}</div>`:''}
        </div>
        <div style="font-size:52px;opacity:0.5">${tipo==='acum'?'🏆':tipo==='mes'?'📅':'⏳'}</div>
      </div>
      <!-- Lista -->
      ${audsDetalle.length?`
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);font-weight:700;margin-bottom:10px">Desglose — ${audsDetalle.length} auditoría${audsDetalle.length!==1?'s':''}</div>
      <div style="display:flex;flex-direction:column;gap:7px">
        ${audsDetalle.map(a=>`
        <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:12px">
          <div style="width:36px;height:36px;border-radius:8px;background:${bgC};border:1px solid ${bdC};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${a.tipo==='Auditoría Internacional'?'🔍':a.tipo==='Adaptación IA BPCE'?'🤖':'⚙️'}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.empresa||'Sin empresa'}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">${a.tipo||'Auditoría'}</div>
            <div style="font-size:10px;color:var(--muted);margin-top:1px">${tipo==='activas'?'Estado: '+a.estado:a.fInforme?'Entregada: '+fmtD(a.fInforme):a.fInicio?'Inicio: '+fmtD(a.fInicio):'Sin fecha'}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-family:'Syne',sans-serif;font-size:17px;font-weight:800;color:${colorCl}">${fmt(comUnit)}</div>
            <div style="font-size:9px;color:var(--muted)">${tipo==='activas'?'potencial':'ganada'}</div>
          </div>
        </div>`).join('')}
      </div>
      ${tipo!=='activas'?`
      <div style="margin-top:14px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:10px;padding:13px 16px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:13px;font-weight:700">TOTAL COMISIONES</span>
        <span style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:${colorCl}">${fmt(total)}</span>
      </div>`:''}`:`
      <div style="text-align:center;padding:40px 20px;color:var(--muted)">
        <div style="font-size:40px;margin-bottom:10px">${tipo==='activas'?'⏳':'🏆'}</div>
        <div style="font-size:14px">${tipo==='activas'?'Sin auditorías activas por ahora':'Sin cierres registrados aún'}</div>
      </div>`}
    </div>
  </div>`;
  document.body.appendChild(el);
}

function abrirNotasVendedor(vendId, vendNombre){
  let m=document.getElementById('modal-notas-vend');
  if(!m){m=document.createElement('div');m.className='modal-overlay';m.id='modal-notas-vend';m.innerHTML='<div class="modal modal-lg" style="max-height:90vh;display:flex;flex-direction:column"></div>';document.body.appendChild(m);}
  const modal=m.querySelector('.modal');
  modal.innerHTML=`<div class="modal-head"><div class="modal-title">📌 Notas — ${vendNombre}</div><button class="modal-close" onclick="closeModal('modal-notas-vend')">✕</button></div><div class="modal-body" id="notas-vend-body" style="overflow-y:auto;flex:1"></div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal('modal-notas-vend')">Cerrar</button></div>`;
  renderNotasVend(document.getElementById('notas-vend-body'), vendId, vendNombre);
  m.classList.add('open');
}

function renderNotasVend(body, vendId, vend){
  const notas=_getNotasVend(vendId).sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const today=todayStr();
  const vencidas=notas.filter(n=>!n.leida&&n.fecha&&n.fecha<today);
  const hoy=notas.filter(n=>!n.leida&&n.fecha===today);
  const proximas=notas.filter(n=>!n.leida&&(!n.fecha||n.fecha>today));
  const leidas=notas.filter(n=>n.leida);

  const notaCard=(n,colorBg,colorBorder,icon)=>`
  <div style="background:${colorBg};border:1px solid ${colorBorder};border-radius:12px;padding:14px 16px;display:flex;gap:12px;align-items:flex-start">
    <div style="font-size:20px;flex-shrink:0;margin-top:1px">${icon}</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:13px;font-weight:600;margin-bottom:3px">${n.titulo||'(sin título)'}</div>
      ${n.texto?`<div style="font-size:12px;color:var(--muted);margin-bottom:6px;white-space:pre-wrap">${n.texto}</div>`:''}
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        ${n.fecha?`<span style="font-size:10px;color:var(--muted)">📅 ${fmtD(n.fecha)}</span>`:''}
        ${n.prioridad?`<span style="font-size:10px;font-weight:700;color:${n.prioridad==='Alta'?'var(--danger)':n.prioridad==='Media'?'var(--warn)':'var(--muted)'}">${n.prioridad==='Alta'?'🔴':n.prioridad==='Media'?'🟡':'🟢'} ${n.prioridad}</span>`:''}
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
      ${!n.leida?`<button onclick="vndMarcarLeida(${vendId},${n.id})" style="background:rgba(200,168,74,0.12);border:1px solid rgba(200,168,74,0.3);border-radius:7px;padding:5px 10px;cursor:pointer;color:var(--accent3);font-size:11px;white-space:nowrap">✅ Listo</button>`:''}
      <button onclick="vndDelNota(${vendId},${n.id})" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:7px;padding:5px 10px;cursor:pointer;color:var(--danger);font-size:11px">🗑</button>
    </div>
  </div>`;

  body.innerHTML=`
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:10px">
    <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800">📝 Notas y Recordatorios — ${vend.nombre.split(' ')[0]}</div>
    <button onclick="vndAbrirNuevaNota(${vendId},'${vend.nombre}')" style="background:linear-gradient(135deg,var(--accent2),var(--accent));border:none;border-radius:10px;padding:9px 18px;color:#fff;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;cursor:pointer">+ Nueva nota</button>
  </div>

  ${vencidas.length?`
  <div style="margin-bottom:16px">
    <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--danger);font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:8px">🚨 Vencidas <div style="flex:1;height:1px;background:rgba(239,68,68,0.2)"></div></div>
    <div style="display:flex;flex-direction:column;gap:8px">${vencidas.map(n=>notaCard(n,'rgba(239,68,68,0.07)','rgba(239,68,68,0.3)','🚨')).join('')}</div>
  </div>`:''}

  ${hoy.length?`
  <div style="margin-bottom:16px">
    <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--warn);font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:8px">⚡ Para hoy <div style="flex:1;height:1px;background:rgba(245,158,11,0.2)"></div></div>
    <div style="display:flex;flex-direction:column;gap:8px">${hoy.map(n=>notaCard(n,'rgba(245,158,11,0.07)','rgba(245,158,11,0.3)','⚡')).join('')}</div>
  </div>`:''}

  ${proximas.length?`
  <div style="margin-bottom:16px">
    <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--muted);font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:8px">📌 Próximas <div style="flex:1;height:1px;background:var(--border)"></div></div>
    <div style="display:flex;flex-direction:column;gap:8px">${proximas.map(n=>notaCard(n,'var(--surface)','var(--border)','📌')).join('')}</div>
  </div>`:''}

  ${!vencidas.length&&!hoy.length&&!proximas.length?`
  <div style="text-align:center;padding:50px 20px;color:var(--muted)">
    <div style="font-size:48px;margin-bottom:12px">📝</div>
    <div style="font-size:14px;font-weight:600;margin-bottom:6px">Sin notas activas</div>
    <div style="font-size:12px">Agregá recordatorios, tareas o avisos para ${vend.nombre.split(' ')[0]}</div>
  </div>`:''}

  ${leidas.length?`
  <details style="margin-top:8px">
    <summary style="font-size:11px;color:var(--muted);cursor:pointer;padding:8px 0">Ver ${leidas.length} nota${leidas.length>1?'s':''} completada${leidas.length>1?'s':''}</summary>
    <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;opacity:0.5">${leidas.slice(0,8).map(n=>notaCard(n,'var(--surface2)','var(--border)','✅')).join('')}</div>
  </details>`:''}

  <!-- Modal nueva nota inline -->
  <div id="vnd-modal-nota-${vendId}" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);z-index:10001;align-items:center;justify-content:center" onclick="if(this===event.target)this.style.display='none'">
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;width:480px;max-width:95vw;box-shadow:0 30px 80px rgba(0,0,0,0.6)">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:15px">📝 Nueva nota para ${vend.nombre.split(' ')[0]}</div>
        <button onclick="document.getElementById('vnd-modal-nota-${vendId}').style.display='none'" style="width:28px;height:28px;border-radius:6px;background:var(--surface2);border:none;cursor:pointer;color:var(--muted)">✕</button>
      </div>
      <div style="padding:18px 20px;display:flex;flex-direction:column;gap:12px">
        <div><label style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:5px">Título *</label>
          <input id="vnd-nt-titulo-${vendId}" placeholder="Ej: Llamar a Empresa ABC, Revisar propuesta..." style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none"></div>
        <div><label style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:5px">Detalle</label>
          <textarea id="vnd-nt-texto-${vendId}" placeholder="Contexto, instrucciones, recordatorio..." style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none;resize:vertical;min-height:65px"></textarea></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div><label style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:5px">📅 Recordar el</label>
            <input id="vnd-nt-fecha-${vendId}" type="date" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none"></div>
          <div><label style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:5px">Prioridad</label>
            <select id="vnd-nt-prio-${vendId}" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none">
              <option value="Normal">Normal</option><option value="Media">Media</option><option value="Alta">Alta</option>
            </select></div>
        </div>
      </div>
      <div style="padding:14px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px">
        <button onclick="document.getElementById('vnd-modal-nota-${vendId}').style.display='none'" style="padding:9px 16px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);color:var(--text);font-size:12px;cursor:pointer">Cancelar</button>
        <button onclick="vndGuardarNota(${vendId})" style="padding:9px 18px;border-radius:8px;background:linear-gradient(135deg,var(--accent2),var(--accent));border:none;color:#fff;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;cursor:pointer">💾 Guardar</button>
      </div>
    </div>
  </div>`;
}

function vndAbrirNuevaNota(vendId, vendNombre){
  const m=document.getElementById('vnd-modal-nota-'+vendId);
  if(!m)return;
  document.getElementById('vnd-nt-titulo-'+vendId).value='';
  document.getElementById('vnd-nt-texto-'+vendId).value='';
  document.getElementById('vnd-nt-fecha-'+vendId).value='';
  document.getElementById('vnd-nt-prio-'+vendId).value='Normal';
  m.style.display='flex';
}

function vndGuardarNota(vendId){
  const titulo=document.getElementById('vnd-nt-titulo-'+vendId).value.trim();
  if(!titulo){toast('⚠️ Ingresá un título');return;}
  const notas=_getNotasVend(vendId);
  const item={
    id:S.nextId('crm_notas_vend'),vendedorId:Number(vendId),
    titulo,
    texto:document.getElementById('vnd-nt-texto-'+vendId).value,
    fecha:document.getElementById('vnd-nt-fecha-'+vendId).value||'',
    prioridad:document.getElementById('vnd-nt-prio-'+vendId).value,
    leida:false,
    creado:todayStr()
  };
  notas.push(item);
  _setNotasVend(vendId,notas);
  document.getElementById('vnd-modal-nota-'+vendId).style.display='none';
  toast('📝 Nota guardada');
  const vend=S.get('vendedores').find(x=>x.id===vendId);
  if(vend) renderNotasVend(document.getElementById('crm-vend-body-'+vendId),vendId,vend);
}

function vndMarcarLeida(vendId, notaId){
  const notas=_getNotasVend(vendId);
  const i=notas.findIndex(n=>n.id===notaId);
  if(i>-1){notas[i].leida=true;notas[i].fechaLeida=todayStr();}
  _setNotasVend(vendId,notas);
  const vend=S.get('vendedores').find(x=>x.id===vendId);
  if(vend) renderNotasVend(document.getElementById('crm-vend-body-'+vendId),vendId,vend);
}

function vndDelNota(vendId, notaId){
  if(!confirm('¿Eliminar esta nota?'))return;
  _setNotasVend(vendId,_getNotasVend(vendId).filter(n=>n.id!==notaId));
  const vend=S.get('vendedores').find(x=>x.id===vendId);
  if(vend) renderNotasVend(document.getElementById('crm-vend-body-'+vendId),vendId,vend);
}

function checkRecordatoriosVend(){
  if(!currentUser||currentUser.rol!=='vendedor') return;
  const vendRec=S.get('vendedores').find(v=>v.nombre===currentUser.nombre);
  if(!vendRec) return;
  const today=todayStr();
  const notas=_getNotasVend(vendRec.id);
  const urgentes=notas.filter(n=>!n.leida&&n.fecha&&n.fecha<=today);
  // Badge en sidebar
  const badge=document.getElementById('vnd-badge');
  if(badge){
    badge.style.display=urgentes.length?'':'none';
    badge.textContent=urgentes.length;
  }
  if(urgentes.length){
    setTimeout(()=>{
      const el=document.createElement('div');
      el.style.cssText='position:fixed;top:20px;right:20px;z-index:9998;background:linear-gradient(135deg,rgba(239,68,68,0.97),rgba(220,38,38,0.92));border:1px solid rgba(239,68,68,0.5);border-radius:14px;padding:14px 18px;max-width:320px;box-shadow:0 8px 32px rgba(239,68,68,0.3);cursor:pointer;animation:vdup 0.4s ease';
      el.innerHTML=`<div style="display:flex;align-items:center;gap:10px"><div style="font-size:22px">🔔</div><div style="flex:1"><div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:#fff">${urgentes.length} recordatorio${urgentes.length>1?'s':''} pendiente${urgentes.length>1?'s':''}</div><div style="font-size:11px;color:rgba(255,255,255,0.85);margin-top:2px">${urgentes[0].titulo}</div></div><button onclick="this.closest('[style]').remove()" style="background:rgba(255,255,255,0.15);border:none;border-radius:6px;width:24px;height:24px;cursor:pointer;color:#fff;font-size:12px;display:flex;align-items:center;justify-content:center">✕</button></div>`;
      el.onclick=(e)=>{if(e.target.tagName==='BUTTON')return;el.remove();showPage('crm');};
      document.body.appendChild(el);
      setTimeout(()=>{if(el.parentNode)el.remove();},7000);
    },1500);
  }
}

// ── METOASIST — Chat IA del vendedor con memoria persistente ──
function maContexto(vend, vendId){
  const today=todayStr();
  const ym=today.substring(0,7);
  const MES_NOM=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mesNom=MES_NOM[parseInt(ym.split('-')[1])-1];
  const allLogs=S.get('crm_logs').filter(l=>l.vendedor===vend.nombre);
  const mLogs=allLogs.filter(l=>l.fecha.startsWith(ym));
  const mLL=mLogs.reduce((s,l)=>s+(l.llamadas||0),0);
  const mDU=mLogs.reduce((s,l)=>s+(l.duenos||0),0);
  const mAG=mLogs.reduce((s,l)=>s+(l.agendadas||0),0);
  const mCI=mLogs.reduce((s,l)=>s+(l.cerradas||0),0);
  const sLogs=allLogs.filter(l=>{const d=new Date(l.fecha+'T12:00:00');const df=(new Date()-d)/86400000;return df<7;});
  const sLL=sLogs.reduce((s,l)=>s+(l.llamadas||0),0);
  const sCI=sLogs.reduce((s,l)=>s+(l.cerradas||0),0);
  const tasaCont=mLL>0?Math.round(mDU/mLL*100):0;
  const tasaAg=mDU>0?Math.round(mAG/mDU*100):0;
  const tasaConv=mLL>0?Math.round(mCI/mLL*100):0;
  const diasLogs=[...new Set(mLogs.map(l=>l.fecha))].length;
  const obj=S.get('crm_objetivos').find(x=>x.ym===ym&&String(x.vendedorId)===String(vendId))||null;
  const pCI=obj?.cerradas?Math.min(Math.round(mCI/obj.cerradas*100),999):null;
  const misAuds=S.get('auditorias').filter(a=>a.vendedor===vend.nombre);
  const audActivas=misAuds.filter(a=>a.estado!=='Completada').length;
  const audComp=misAuds.filter(a=>a.estado==='Completada').length;
  const segs=S.get('crm_seguimientos').filter(s=>s.vendedor===vend.nombre&&!s.hecho);
  const segsVenc=segs.filter(s=>s.fecha<today).length;
  const premioMes=(S.get('crm_premios')||[]).find(x=>x.ym===ym)||null;
  const allVends=S.get('vendedores').filter(v=>v.estado!=='Inactivo');
  const ranking=allVends.map(v=>{
    const vl=S.get('crm_logs').filter(l=>l.vendedor===v.nombre&&l.fecha.startsWith(ym));
    return{nombre:v.nombre,ci:vl.reduce((s,l)=>s+(l.cerradas||0),0)};
  }).sort((a,b)=>b.ci-a.ci);
  const rankPos=ranking.findIndex(r=>r.nombre===vend.nombre)+1;
  const notas=_getNotasVend(vendId);
  const notasActivas=notas.filter(n=>!n.leida);

  return `Usted es MetoAsist, el asistente comercial institucional de MetoGroup. Su función es brindar orientación, análisis y apoyo a ${vend.nombre} en base a sus datos reales de desempeño. Responde siempre en español formal, con trato de usted. Es preciso, concreto y profesional. Nunca utiliza jerga coloquial ni expresiones informales. Cuando el dato lo justifica, señala los problemas con claridad. Cuando el desempeño es positivo, lo reconoce sin exageración. Recuerda todo el historial de la conversación.

=== PERFIL — ${vend.nombre.toUpperCase()} ===
Comisión por cierre: $${vend.comision||300} | Antigüedad: ${vend.ingreso?`desde ${fmtD(vend.ingreso)}`:'no registrada'}
Posición en el equipo (${mesNom}): ${rankPos}° de ${allVends.length}

=== MÉTRICAS ${mesNom.toUpperCase()} ===
Llamadas: ${mLL} | Dueños contactados: ${mDU} | Entrevistas agendadas: ${mAG} | Cierres: ${mCI}
Tasa de contacto: ${tasaCont}% | Tasa de agendamiento: ${tasaAg}% | Conversión total: ${tasaConv}%
Días con actividad registrada: ${diasLogs} | Auditorías activas: ${audActivas} | Completadas: ${audComp}
${obj?`Objetivo de cierres: ${obj.cerradas} — avance actual: ${pCI}%`:'Sin objetivos configurados para este período'}

=== SEMANA ACTUAL ===
Llamadas: ${sLL} | Cierres: ${sCI}

=== SEGUIMIENTOS ===
Pendientes: ${segs.length} | Vencidos sin gestión: ${segsVenc}

${premioMes?`=== INCENTIVO DEL MES ===\n${premioMes.nombre} — ${premioMes.desc}\n`:''}
${notasActivas.length?`=== COMUNICACIONES PENDIENTES ===\n${notasActivas.slice(0,3).map(n=>n.titulo+(n.fecha?' ('+fmtD(n.fecha)+')':'')).join(' | ')}\n`:''}
INSTRUCCIONES: Español formal, trato de usted. Sin asteriscos ni markdown. Respuestas concisas — máximo 4 oraciones salvo análisis extenso solicitado. Ante preguntas breves, responda brevemente. Cite siempre los datos reales del perfil. Nunca invente información.`;
}

function maMsgHTML(m, vend){
  if(m.role==='user'){
    const initials=vend.nombre.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
    return`<div class="ma-msg ma-user" style="flex-direction:row-reverse">
      <div class="ma-avatar ma-user-av">${initials}</div>
      <div class="ma-bubble">${m.content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'<br>')}</div>
    </div>`;
  }
  // Format assistant: bold, line breaks
  const formatted=m.content
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/\n/g,'<br>');
  return`<div class="ma-msg ma-asist">
    <div class="ma-avatar ma-asist-av">🤖</div>
    <div class="ma-bubble">${formatted}</div>
  </div>`;
}

function renderMetoAsist(body, vendId, vend){
  const histKey='metoasist_hist_'+vendId;
  const hist=S.get(histKey)||[];
  const initials=vend.nombre.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();

  body.innerHTML=`
  <style>
    .ma-msg{display:flex;gap:10px;align-items:flex-start;animation:vdup 0.3s ease}
    .ma-bubble{border-radius:14px;padding:12px 16px;font-size:13px;line-height:1.65;max-width:83%;word-break:break-word}
    .ma-user .ma-bubble{background:linear-gradient(135deg,var(--accent2),var(--accent));color:#fff;margin-left:auto;border-bottom-right-radius:4px}
    .ma-asist .ma-bubble{background:var(--surface2);border:1px solid var(--border);color:var(--text);border-bottom-left-radius:4px}
    .ma-avatar{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;font-weight:800}
    .ma-asist-av{background:linear-gradient(135deg,#b8922e,#c8a84a);font-size:16px}
    .ma-user-av{background:linear-gradient(135deg,var(--accent2),var(--accent));font-size:11px;color:#fff}
    .ma-typing{display:flex;gap:5px;align-items:center;padding:4px 2px}
    .ma-dot{width:7px;height:7px;border-radius:50%;background:var(--muted);animation:maDot 1.2s infinite}
    .ma-dot:nth-child(2){animation-delay:0.2s}.ma-dot:nth-child(3){animation-delay:0.4s}
    @keyframes maDot{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}
    .ma-chip{background:rgba(184,146,46,0.1);border:1px solid rgba(184,146,46,0.25);border-radius:20px;padding:6px 14px;font-size:11px;color:#c8a84a;cursor:pointer;transition:all 0.15s;white-space:nowrap;font-family:'DM Mono',monospace}
    .ma-chip:hover{background:rgba(184,146,46,0.2);transform:translateY(-1px)}
  
/* ═══ METOASSIST CLIENT ═══ */
#mcl-orb{position:fixed;bottom:24px;right:24px;z-index:1100;width:52px;height:52px;border-radius:16px;cursor:pointer;display:none;align-items:center;justify-content:center;transition:all 0.3s cubic-bezier(.4,0,.2,1);background:linear-gradient(135deg,rgba(200,168,74,0.2),rgba(6,214,160,0.15));border:1px solid rgba(200,168,74,0.3);box-shadow:0 4px 20px rgba(6,214,160,0.15),0 0 0 0 rgba(6,214,160,0.1);backdrop-filter:blur(12px)}
#mcl-orb:hover{transform:translateY(-2px);box-shadow:0 6px 28px rgba(6,214,160,0.25),0 0 0 6px rgba(6,214,160,0.06)}
#mcl-orb .orb-icon{font-size:22px;color:var(--accent3)}
#mcl-orb .orb-pulse{position:absolute;inset:-4px;border-radius:20px;border:1.5px solid rgba(6,214,160,0.3);animation:mclPulse 3s ease-in-out infinite}
@keyframes mclPulse{0%,100%{opacity:0.3;transform:scale(1)}50%{opacity:0.6;transform:scale(1.06)}}
#mcl-panel{position:fixed;bottom:24px;right:24px;z-index:1101;width:380px;height:560px;max-height:80vh;display:none;flex-direction:column;border-radius:20px;overflow:hidden;background:#ffffff;border:1.5px solid #e5e7eb;box-shadow:0 8px 40px rgba(0,0,0,0.12)}
#mcl-panel.open{display:flex}
.mcl-header{padding:16px 18px;display:flex;align-items:center;gap:12px;border-bottom:1.5px solid #e5e7eb;background:#f9f9f9}
.mcl-logo{width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,rgba(200,168,74,0.2),rgba(6,214,160,0.1));display:flex;align-items:center;justify-content:center;font-size:16px;color:var(--accent3);flex-shrink:0}
.mcl-title{font-family:'Syne',sans-serif;font-size:14px;font-weight:700}
.mcl-sub{font-size:10px;color:var(--muted);margin-top:1px}
.mcl-close{background:none;border:none;color:var(--muted);font-size:18px;cursor:pointer;padding:4px;margin-left:auto;transition:color 0.15s}
.mcl-close:hover{color:var(--text)}
.mcl-chat{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}
.mcl-chat::-webkit-scrollbar{width:3px}.mcl-chat::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
.mcl-msg{display:flex;gap:8px;align-items:flex-end}
.mcl-msg.user{flex-direction:row-reverse}
.mcl-msg.user .mcl-bubble{background:linear-gradient(135deg,rgba(200,168,74,0.12),rgba(6,214,160,0.06));border:1px solid rgba(200,168,74,0.2);border-bottom-right-radius:4px;margin-left:24px}
.mcl-bubble{border-radius:14px;padding:11px 15px;font-size:13px;line-height:1.65;max-width:85%;word-break:break-word;background:var(--surface2);border:1px solid var(--border);color:var(--text);border-bottom-left-radius:4px}
.mcl-bubble strong{color:var(--accent3);font-weight:700}
.mcl-chips{padding:4px 14px 0;display:flex;gap:6px;flex-wrap:wrap}
.mcl-chip{font-size:10px;padding:5px 10px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);color:var(--muted);cursor:pointer;transition:all 0.15s;white-space:nowrap}
.mcl-chip:hover{border-color:rgba(200,168,74,0.3);color:var(--accent3)}
.mcl-input-area{padding:10px 14px;border-top:1.5px solid #e5e7eb;background:#fff;display:flex;gap:8px;align-items:flex-end}
.mcl-input{flex:1;background:#f5f5f5;border:1.5px solid #e5e7eb;border-radius:10px;padding:9px 14px;color:#111;font-size:13px;resize:none;outline:none;font-family:'DM Mono',monospace;min-height:38px;max-height:100px;transition:border-color 0.2s}
.mcl-input:focus{border-color:rgba(200,168,74,0.3)}
.mcl-input::placeholder{color:var(--muted)}
.mcl-send{width:34px;height:34px;border-radius:8px;background:linear-gradient(135deg,rgba(200,168,74,0.2),rgba(6,214,160,0.12));border:1px solid rgba(200,168,74,0.25);color:var(--accent3);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all 0.15s;flex-shrink:0}
.mcl-send:hover{background:linear-gradient(135deg,rgba(200,168,74,0.3),rgba(6,214,160,0.2))}
.mcl-typing{display:flex;gap:4px;padding:4px 0}.mcl-dot{width:5px;height:5px;border-radius:50%;background:var(--muted);animation:mclTyp 1.4s ease-in-out infinite}.mcl-dot:nth-child(2){animation-delay:0.2s}.mcl-dot:nth-child(3){animation-delay:0.4s}
@keyframes mclTyp{0%,100%{opacity:0.3}50%{opacity:1}}
@media(max-width:640px){#mcl-panel{width:calc(100vw - 16px);right:8px;bottom:8px;height:75vh}}

</style>

  <!-- Header -->
  <div style="background:linear-gradient(135deg,rgba(184,146,46,0.1),rgba(167,139,250,0.05));border:1px solid rgba(184,146,46,0.2);border-radius:16px;padding:16px 20px;margin-bottom:16px;display:flex;align-items:center;gap:14px">
    <div style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#b8922e,#c8a84a);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;box-shadow:0 4px 16px rgba(184,146,46,0.4)">🤖</div>
    <div style="flex:1">
      <div style="font-family:'Syne',sans-serif;font-size:17px;font-weight:800;color:#c8a84a">MetoAsist</div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px">Coach de ventas personal · ${hist.length>0?hist.length+' mensajes en memoria':'Conversación nueva'}</div>
    </div>
    ${hist.length?`<button onclick="maLimpiarChat(${vendId})" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:6px 12px;cursor:pointer;color:var(--danger);font-size:11px">🗑 Borrar historial</button>`:''}
  </div>

  <!-- Chat -->
  <div id="ma-chat-${vendId}" style="min-height:300px;max-height:460px;overflow-y:auto;display:flex;flex-direction:column;gap:12px;margin-bottom:14px;padding:2px;scroll-behavior:smooth">
    ${hist.length
      ? hist.map(m=>maMsgHTML(m,vend)).join('')
      : `<div class="ma-msg ma-asist">
          <div class="ma-avatar ma-asist-av">🤖</div>
          <div class="ma-bubble">
            ¡Hola ${vend.nombre.split(' ')[0]}! Soy MetoAsist, tu coach de ventas.<br><br>
            Leí todos tus números y tengo tu historial completo. Puedo ayudarte con técnicas de cierre, manejo de objeciones, análisis de tus métricas, o lo que necesites.<br><br>
            ¿Arrancamos? 💪
          </div>
        </div>`
    }
  </div>

  <!-- Quick chips -->
  <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px">
    ${[
      ['📊 Analizá mis métricas','Analizá mis métricas de este mes y decime qué tengo que mejorar puntualmente'],
      ['💬 Técnica de cierre','Enseñame una técnica de cierre efectiva para dueños de empresa que dudan'],
      ['📞 Manejo de objeciones','Cómo manejo la objeción "no me interesa" al teléfono con un dueño'],
      ['🔥 Motivame','¿Cómo vengo este mes? Necesito un empujón'],
      ['🎯 Plan para hoy','Haceme un plan de acción concreto para hoy basado en mis números'],
      ['📋 Script de llamada','Escribime un script de apertura de llamada en frío para dueños de empresa']
    ].map(([lb,msg])=>`<div class="ma-chip" onclick="maEnviar(${vendId},this,${JSON.stringify(msg)})">${lb}</div>`).join('')}
  </div>

  <!-- Input -->
  <div style="display:flex;gap:8px;align-items:flex-end">
    <textarea id="ma-input-${vendId}" placeholder="Preguntale cualquier cosa a MetoAsist..." rows="1"
      onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();maEnviar(${vendId})}"
      oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,120)+'px'"
      style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:11px 14px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none;resize:none;min-height:46px;line-height:1.5;transition:border-color 0.2s;overflow-y:hidden"
      onfocus="this.style.borderColor='#c8a84a'" onblur="this.style.borderColor='var(--border)'"></textarea>
    <button onclick="maEnviar(${vendId})" style="background:linear-gradient(135deg,#b8922e,#c8a84a);border:none;border-radius:12px;width:46px;height:46px;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 12px rgba(184,146,46,0.4);transition:all 0.15s" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform=''">➤</button>
  </div>`;

  // Scroll al final
  const chatEl=document.getElementById('ma-chat-'+vendId);
  if(chatEl) setTimeout(()=>chatEl.scrollTop=chatEl.scrollHeight,100);
}

async function maEnviar(vendId, chipEl, chipMsg){
  const vend=S.get('vendedores').find(x=>x.id===vendId);
  if(!vend)return;
  const inputEl=document.getElementById('ma-input-'+vendId);
  const chatEl=document.getElementById('ma-chat-'+vendId);
  if(!inputEl||!chatEl)return;

  const texto=(chipMsg||inputEl.value).trim();
  if(!texto)return;
  if(chipEl){chipEl.style.opacity='0.5';chipEl.style.pointerEvents='none';}
  inputEl.value='';
  inputEl.style.height='46px';

  // Cargar historial persistente
  const histKey='metoasist_hist_'+vendId;
  const hist=S.get(histKey)||[];

  // Agregar mensaje del usuario
  hist.push({role:'user',content:texto});
  S.set(histKey,hist);

  chatEl.insertAdjacentHTML('beforeend',maMsgHTML({role:'user',content:texto},vend));

  // Typing indicator
  const typingId='ma-typing-'+Date.now();
  chatEl.insertAdjacentHTML('beforeend',`<div id="${typingId}" class="ma-msg ma-asist"><div class="ma-avatar ma-asist-av">🤖</div><div class="ma-bubble"><div class="ma-typing"><div class="ma-dot"></div><div class="ma-dot"></div><div class="ma-dot"></div></div></div></div>`);
  chatEl.scrollTop=chatEl.scrollHeight;

  try{
    // Contexto dinámico con los datos actuales (siempre frescos)
    const sistema=maContexto(vend,vendId);

    // Enviar TODO el historial a la API — memoria completa
    // Para no exceder tokens, si hay más de 60 mensajes enviamos los últimos 60 + resumen
    let apiMessages=hist.map(m=>({role:m.role,content:m.content}));
    if(apiMessages.length>60){
      // Insertar resumen al principio
      const resumen=`(Contexto: llevamos ${apiMessages.length} mensajes. Los anteriores al mensaje 1 de este bloque son parte del historial completo que recordás.)`;
      apiMessages=[{role:'user',content:resumen},{role:'assistant',content:'Entendido, sigo recordando todo.'},...apiMessages.slice(-60)];
    }

    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_API_KEY,'anthropic-dangerous-direct-browser-access':'true','anthropic-version':'2023-06-01'},
      body:JSON.stringify({
        model:'claude-sonnet-4-20250514',
        max_tokens:600,
        system:sistema,
        messages:apiMessages
      })
    });
    const data=await res.json();
    const reply=data?.content?.[0]?.text||'No pude conectarme ahora. Intentá de nuevo en un momento.';

    document.getElementById(typingId)?.remove();

    // Guardar respuesta — SIN LIMITE ARTIFICIAL (memoria total)
    hist.push({role:'assistant',content:reply});
    S.set(histKey,hist);

    // Actualizar contador en header
    const headerSub=document.querySelector(`#ma-chat-${vendId}`)?.closest('[style*="flex-direction:column"]')?.previousElementSibling?.querySelector('div:nth-child(2) div:nth-child(2)');
    if(headerSub) headerSub.textContent=`Coach de ventas personal · ${hist.length} mensajes en memoria`;

    chatEl.insertAdjacentHTML('beforeend',maMsgHTML({role:'assistant',content:reply},vend));
    chatEl.scrollTop=chatEl.scrollHeight;

  }catch(e){
    document.getElementById(typingId)?.remove();
    const errMsg='Parece que no hay conexión ahora mismo. Revisá tu internet e intentá de nuevo.';
    hist.push({role:'assistant',content:errMsg});
    S.set(histKey,hist);
    chatEl.insertAdjacentHTML('beforeend',maMsgHTML({role:'assistant',content:errMsg},vend));
    chatEl.scrollTop=chatEl.scrollHeight;
  }
  if(chipEl){chipEl.style.opacity='1';chipEl.style.pointerEvents='';}
}

function maLimpiarChat(vendId){
  const n=S.get('metoasist_hist_'+vendId)?.length||0;
  if(!confirm(`¿Borrar los ${n} mensajes del historial de MetoAsist? Esta acción no se puede deshacer.`))return;
  S.set('metoasist_hist_'+vendId,[]);
  const vend=S.get('vendedores').find(x=>x.id===vendId);
  if(vend) renderMetoAsist(document.getElementById('crm-vend-body-'+vendId),vendId,vend);
  toast('🗑 Historial borrado');
}




// ── RECORDATORIOS DEL PROPIO VENDEDOR (en su dashboard) ──────
function vndAbrirMiNota(vendId){
  const m=document.getElementById('vnd-mi-modal-'+vendId);
  if(!m){toast('⚠️ Error al abrir el formulario');return;}
  const ti=document.getElementById('vnd-mi-titulo-'+vendId);
  const tx=document.getElementById('vnd-mi-texto-'+vendId);
  const fe=document.getElementById('vnd-mi-fecha-'+vendId);
  const pr=document.getElementById('vnd-mi-prio-'+vendId);
  if(ti)ti.value='';if(tx)tx.value='';if(fe)fe.value='';if(pr)pr.value='Normal';
  m.style.display='flex';
}

function vndGuardarMiNota(vendId){
  const titulo=(document.getElementById('vnd-mi-titulo-'+vendId)?.value||'').trim();
  if(!titulo){toast('⚠️ Ingresá un título');return;}
  const notas=_getNotasVend(vendId);
  const item={
    id:S.nextId('crm_notas_vend'),vendedorId:Number(vendId),
    titulo,
    texto:document.getElementById('vnd-mi-texto-'+vendId)?.value||'',
    fecha:document.getElementById('vnd-mi-fecha-'+vendId)?.value||'',
    prioridad:document.getElementById('vnd-mi-prio-'+vendId)?.value||'Normal',
    leida:false,
    creado:todayStr()
  };
  notas.push(item);
  _setNotasVend(vendId,notas);
  const m=document.getElementById('vnd-mi-modal-'+vendId);
  if(m)m.style.display='none';
  toast('📝 Recordatorio guardado');
  // Actualizar badge y re-renderizar
  checkRecordatoriosVend();
  renderCRM();
}

function vndMiNota_marcar(vendId, notaId){
  const notas=_getNotasVend(vendId);
  const i=notas.findIndex(n=>n.id===notaId);
  if(i>-1){notas[i].leida=true;notas[i].fechaLeida=todayStr();}
  _setNotasVend(vendId,notas);
  toast('✅ Recordatorio completado');
  checkRecordatoriosVend();
  renderCRM();
}

function vndMiNota_del(vendId, notaId){
  if(!confirm('¿Eliminar este recordatorio?'))return;
  _setNotasVend(vendId,_getNotasVend(vendId).filter(n=>n.id!==notaId));
  renderCRM();
}

// ============================================================
// MIS VENTAS
// ============================================================
function renderMisVentas(){
  const el=document.getElementById('misventas-content');
  if(!el)return;
  const nombre=currentUser.nombre;
  const today=todayStr();
  const ym=today.substring(0,7);
  const now=new Date();
  const MES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const vendRec=S.get('vendedores').find(v=>v.nombre===nombre)||{};
  const vendId=vendRec.id||null;
  const comUnit=Number(vendRec.comision)||300;
  const obj=S.get('crm_objetivos').find(x=>x.ym===ym&&String(x.vendedorId)===String(vendId))||null;
  const allSegs=S.get('crm_seguimientos').filter(s=>s.vendedor===nombre);
  const segsActivos=allSegs.filter(s=>!s.hecho);
  const segsCerrados=allSegs.filter(s=>s.hecho);
  const alta=segsActivos.filter(s=>s.prioridad==='Alta');
  const media=segsActivos.filter(s=>s.prioridad==='Media');
  const baja=segsActivos.filter(s=>s.prioridad==='Baja'||!s.prioridad);
  const misAuds=S.get('auditorias').filter(a=>a.vendedor===nombre);
  const ventasMes=misAuds.filter(a=>a.estado==='Completada'&&(a.fInforme||'').startsWith(ym)).length;
  const ventasTotal=misAuds.filter(a=>a.estado==='Completada').length;
  const comAcum=ventasTotal*comUnit;
  const comMes=ventasMes*comUnit;
  const mLogs=S.get('crm_logs').filter(l=>l.vendedor===nombre&&l.fecha.startsWith(ym));
  const entrevistas=mLogs.reduce((s,l)=>s+(l.agendadas||0),0);
  const objVentas=obj?.cerradas||0;
  const objEntrevistas=obj?.agendadas||0;
  // Premios históricos
  const crm_premios=S.get('crm_premios')||[];
  const premiosGanados=crm_premios.filter(p=>{
    if(!p.ym||!p.premioPct) return false;
    const oP=S.get('crm_objetivos').find(x=>x.ym===p.ym&&String(x.vendedorId)===String(vendId));
    if(!oP) return false;
    const logsP=S.get('crm_logs').filter(l=>l.vendedor===nombre&&l.fecha.startsWith(p.ym));
    const pCI=logsP.reduce((s,l)=>s+(l.cerradas||0),0);
    const pcts=[oP.llamadas?Math.min(Math.round(logsP.reduce((s,l)=>s+(l.llamadas||0),0)/oP.llamadas*100),999):null,oP.cerradas?Math.min(Math.round(pCI/oP.cerradas*100),999):null].filter(x=>x!==null);
    if(!pcts.length) return false;
    const avg=Math.round(pcts.reduce((s,x)=>s+x,0)/pcts.length);
    return avg>=(p.premioPct||100);
  });

  const fila=(s)=>{
    const ic=s.prioridad==='Alta'?'🔴':s.prioridad==='Media'?'🟡':'🟢';
    const venc=s.fecha&&s.fecha<today;
    return`<tr style="border-bottom:1px solid rgba(212,175,55,0.08);${venc?'background:rgba(239,68,68,0.04)':''}">
      <td style="padding:10px 12px;font-size:13px;font-weight:600">${s.empresa||'—'}</td>
      <td style="padding:10px 8px;font-size:12px;color:var(--muted)">${s.contacto||'—'}</td>
      <td style="padding:10px 8px;text-align:center">${ic} ${s.prioridad||'Baja'}</td>
      <td style="padding:10px 8px;text-align:center;font-size:12px;color:${venc?'var(--danger)':'var(--muted)'};font-weight:${venc?700:400}">${s.fecha?fmtD(s.fecha):'—'}${venc?' ⚠️':''}</td>
      <td style="padding:10px 8px;text-align:right;font-family:'DM Mono',monospace;color:var(--accent3)">${s.comision?'$'+s.comision.toLocaleString('es-AR'):'—'}</td>
      <td style="padding:10px 8px;text-align:center">
        <button onclick="convertirSeguimientoEnVenta(${s.id})" style="background:linear-gradient(135deg,rgba(200,168,74,0.15),rgba(212,175,55,0.08));border:1px solid rgba(200,168,74,0.35);border-radius:6px;padding:4px 9px;cursor:pointer;color:var(--accent3);font-size:11px;font-weight:700">🏆 Venta</button>
        <button onclick="marcarSeguimientoHecho(${s.id})" style="background:rgba(200,168,74,0.12);border:1px solid rgba(200,168,74,0.3);border-radius:6px;padding:4px 9px;cursor:pointer;color:var(--accent3);font-size:11px">✅</button>
        <button onclick="delItem('crm_seguimientos',${s.id},renderMisVentas)" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:6px;padding:4px 9px;cursor:pointer;color:var(--danger);font-size:11px">🗑</button>
      </td>
    </tr>`;
  };

  // IDs únicos para panels expandibles
  const uid='mv'+Date.now();

  // Función para renderizar el detalle de un grupo como mini-tabla
  const detalleGrupo=(items,color,icono)=>`
    <div style="padding:0 0 8px 0">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:rgba(0,0,0,0.15)">
          <th style="text-align:left;padding:8px 14px;font-size:10px;text-transform:uppercase;color:var(--muted);letter-spacing:1px">Empresa</th>
          <th style="text-align:left;padding:8px 8px;font-size:10px;text-transform:uppercase;color:var(--muted);letter-spacing:1px">Contacto</th>
          <th style="text-align:center;padding:8px;font-size:10px;text-transform:uppercase;color:var(--muted);letter-spacing:1px">Seguimiento</th>
          <th style="text-align:right;padding:8px 14px;font-size:10px;text-transform:uppercase;color:var(--muted);letter-spacing:1px">Comisión</th>
          <th style="padding:8px 10px"></th>
        </tr></thead>
        <tbody>
          ${items.sort((a,b)=>(a.fecha||'9999').localeCompare(b.fecha||'9999')).map(s=>{
            const venc=s.fecha&&s.fecha<today;
            return`<tr style="border-bottom:1px solid rgba(212,175,55,0.07);${venc?'background:rgba(239,68,68,0.04)':''}">
              <td style="padding:10px 14px;font-size:13px;font-weight:600">${s.empresa||'—'}</td>
              <td style="padding:10px 8px;font-size:12px;color:var(--muted)">${s.contacto||'—'}</td>
              <td style="padding:10px 8px;text-align:center;font-size:12px;color:${venc?'var(--danger)':'var(--muted)'};font-weight:${venc?700:400}">${s.fecha?fmtD(s.fecha):'—'}${venc?' ⚠️':''}</td>
              <td style="padding:10px 14px;text-align:right;font-family:'DM Mono',monospace;color:var(--accent3)">${s.comision?'$'+s.comision.toLocaleString('es-AR'):'—'}</td>
              <td style="padding:10px 10px;text-align:center;white-space:nowrap">
                <button onclick="agendarEntrevistaDesdeSegVend(${s.id})" title="Agendar entrevista" style="background:linear-gradient(135deg,rgba(200,168,74,0.15),rgba(212,175,55,0.08));border:1px solid rgba(200,168,74,0.35);border-radius:6px;padding:4px 8px;cursor:pointer;color:var(--accent3);font-size:11px;font-weight:700">🏆</button>
                <button onclick="marcarSeguimientoHecho(${s.id})" title="Marcar cerrado" style="background:rgba(200,168,74,0.12);border:1px solid rgba(200,168,74,0.3);border-radius:6px;padding:4px 8px;cursor:pointer;color:var(--accent3);font-size:11px">✅</button>
                <button onclick="delItem('crm_seguimientos',${s.id},renderMisVentas)" title="Eliminar" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:6px;padding:4px 8px;cursor:pointer;color:var(--danger);font-size:11px;margin-left:4px">🗑</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;

  // Bloque colapsable clickeable para cada grupo
  const bloqueGrupo=(id, titulo, color, bg, items, icono)=>{
    if(!items.length) return`
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px 20px;opacity:0.5;display:flex;align-items:center;gap:12px">
        <span style="font-size:20px">${icono}</span>
        <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--muted)">${titulo}</div>
        <div style="margin-left:auto;font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--muted)">0</div>
      </div>`;
    return`
      <div style="background:var(--surface);border:1px solid ${color}44;border-radius:14px;overflow:hidden">
        <div onclick="mvToggle('${id}')" style="padding:16px 20px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:background 0.15s;user-select:none" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
          <div style="width:38px;height:38px;border-radius:10px;background:${bg};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${icono}</div>
          <div style="flex:1">
            <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:800;color:${color}">${titulo}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:1px">${items.length} empresa${items.length!==1?'s':''} · Comisión potencial: <b style="color:var(--accent3)">$${items.reduce((s,x)=>s+(x.comision||0),0).toLocaleString('es-AR')}</b></div>
          </div>
          <div style="font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:${color}">${items.length}</div>
          <div id="${id}-arr" style="font-size:16px;color:var(--muted);transition:transform 0.2s;margin-left:6px">▼</div>
        </div>
        <div id="${id}-panel" style="display:none;border-top:1px solid ${color}33">
          ${detalleGrupo(items,color,icono)}
        </div>
      </div>`;
  };

  // Bloque ventas del mes (auditorías completadas)
  const misAudsDelMes=misAuds.filter(a=>a.estado==='Completada'&&(a.fInforme||'').startsWith(ym));
  const bloqueVentas=()=>{
    if(!ventasMes) return`
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px 20px;opacity:0.5;display:flex;align-items:center;gap:12px">
        <span style="font-size:20px">🏆</span>
        <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--muted)">Ventas del mes</div>
        <div style="margin-left:auto;font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--muted)">0</div>
      </div>`;
    return`
      <div style="background:var(--surface);border:1px solid rgba(200,168,74,0.3);border-radius:14px;overflow:hidden">
        <div onclick="mvToggle('${uid}-ventas')" style="padding:16px 20px;display:flex;align-items:center;gap:12px;cursor:pointer;user-select:none" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
          <div style="width:38px;height:38px;border-radius:10px;background:rgba(200,168,74,0.15);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🏆</div>
          <div style="flex:1">
            <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:800;color:var(--accent3)">Ventas del mes</div>
            <div style="font-size:11px;color:var(--muted);margin-top:1px">${ventasMes} auditoría${ventasMes!==1?'s':''} completada${ventasMes!==1?'s':''} · Comisión: <b style="color:var(--accent3)">$${comMes.toLocaleString('es-AR')}</b></div>
          </div>
          <div style="font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:var(--accent3)">${ventasMes}</div>
          <div id="${uid}-ventas-arr" style="font-size:16px;color:var(--muted);transition:transform 0.2s;margin-left:6px">▼</div>
        </div>
        <div id="${uid}-ventas-panel" style="display:none;border-top:1px solid rgba(200,168,74,0.2)">
          <table style="width:100%;border-collapse:collapse">
            <thead><tr style="background:rgba(0,0,0,0.15)">
              <th style="text-align:left;padding:8px 14px;font-size:10px;text-transform:uppercase;color:var(--muted);letter-spacing:1px">Cliente</th>
              <th style="text-align:left;padding:8px;font-size:10px;text-transform:uppercase;color:var(--muted);letter-spacing:1px">Tipo</th>
              <th style="text-align:center;padding:8px;font-size:10px;text-transform:uppercase;color:var(--muted);letter-spacing:1px">F. Informe</th>
              <th style="text-align:right;padding:8px 14px;font-size:10px;text-transform:uppercase;color:var(--muted);letter-spacing:1px">Monto</th>
            </tr></thead>
            <tbody>
              ${misAudsDelMes.map(a=>`<tr style="border-bottom:1px solid rgba(212,175,55,0.07)">
                <td style="padding:10px 14px;font-size:13px;font-weight:600">${a.clienteNombre||'—'}</td>
                <td style="padding:10px 8px;font-size:12px;color:var(--muted)">${a.tipo||'—'}</td>
                <td style="padding:10px 8px;text-align:center;font-size:12px;color:var(--muted)">${a.fInforme?fmtD(a.fInforme):'—'}</td>
                <td style="padding:10px 14px;text-align:right;font-family:'DM Mono',monospace;color:var(--accent3)">${a.monto?'$'+Number(a.monto).toLocaleString('es-AR'):'—'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  };

  // canvas IDs únicos
  const cid1='mv-c1-'+Date.now(), cid2='mv-c2-'+Date.now();

  el.innerHTML=`
  <div style="padding:20px 24px;max-width:1100px;margin:0 auto">

    <!-- KPIs -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:24px">
      ${[
        {ic:'📋',v:segsActivos.length,lb:'Entrevistas activas',cl:'var(--accent)'},
        {ic:'🔴',v:alta.length,lb:'Prob. Alta',cl:'var(--danger)'},
        {ic:'🟡',v:media.length,lb:'Prob. Media',cl:'var(--warn)'},
        {ic:'🟢',v:baja.length,lb:'Prob. Baja',cl:'var(--accent3)'},
        {ic:'🏆',v:ventasMes,lb:'Ventas este mes',cl:'var(--accent3)'},
        {ic:'💰',v:'$'+comMes.toLocaleString('es-AR'),lb:'Comisión del mes',cl:'#c8a84a'},
      ].map(k=>`<div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px;text-align:center">
        <div style="font-size:20px;margin-bottom:4px">${k.ic}</div>
        <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:${k.cl};line-height:1">${k.v}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:4px;text-transform:uppercase;letter-spacing:1px">${k.lb}</div>
      </div>`).join('')}
    </div>

    <!-- Gráficos -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px">
        <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;margin-bottom:14px">🎯 Por probabilidad de cierre</div>
        <canvas id="${cid1}" width="200" height="200" style="display:block;margin:0 auto"></canvas>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;justify-content:center">
          <span style="font-size:11px;color:var(--muted)">🔴 Alta: <b style="color:var(--text)">${alta.length}</b></span>
          <span style="font-size:11px;color:var(--muted)">🟡 Media: <b style="color:var(--text)">${media.length}</b></span>
          <span style="font-size:11px;color:var(--muted)">🟢 Baja: <b style="color:var(--text)">${baja.length}</b></span>
        </div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px">
        <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;margin-bottom:14px">🏆 Ventas vs Objetivo (mes)</div>
        <canvas id="${cid2}" width="200" height="200" style="display:block;margin:0 auto"></canvas>
        <div style="display:flex;gap:12px;margin-top:12px;justify-content:center">
          <span style="font-size:11px;color:var(--muted)">Logradas: <b style="color:var(--accent3)">${ventasMes}</b></span>
          <span style="font-size:11px;color:var(--muted)">Objetivo: <b style="color:var(--text)">${objVentas||'—'}</b></span>
        </div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px">
        <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;margin-bottom:12px">📅 Entrevistas este mes</div>
        <div style="text-align:center;margin-bottom:12px">
          <div style="font-family:'Syne',sans-serif;font-size:40px;font-weight:800;color:var(--warn);line-height:1">${entrevistas}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:4px">de ${objEntrevistas||'—'} objetivo</div>
          ${objEntrevistas>0?`<div style="margin-top:8px;background:var(--surface2);border-radius:8px;height:8px;overflow:hidden"><div style="height:100%;width:${Math.min(Math.round(entrevistas/objEntrevistas*100),100)}%;background:linear-gradient(90deg,var(--accent2),var(--warn));border-radius:8px;transition:width 0.5s"></div></div>`:''}
        </div>
        <div style="border-top:1px solid var(--border);padding-top:12px">
          <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:8px">🏅 PREMIOS ACUMULADOS</div>
          ${premiosGanados.length?premiosGanados.slice(0,3).map(p=>`<div style="background:linear-gradient(135deg,rgba(245,158,11,0.1),rgba(249,115,22,0.05));border:1px solid rgba(245,158,11,0.3);border-radius:8px;padding:7px 10px;margin-bottom:5px;font-size:11px"><span style="font-weight:700;color:#f59e0b">🏅 ${p.premioNombre||'Premio'}</span> <span style="color:var(--muted)">${p.ym}</span></div>`).join(''):'<div style="font-size:11px;color:var(--muted);text-align:center;padding:8px">Sin premios aún. ¡A por ellos!</div>'}
          ${premiosGanados.length>3?`<div style="font-size:10px;color:var(--muted);text-align:center">+${premiosGanados.length-3} más</div>`:''}
          <div style="margin-top:8px;padding:8px 10px;background:rgba(212,175,55,0.05);border-radius:8px;font-size:11px;color:var(--muted)">Comisiones acumuladas: <b style="color:var(--accent3)">${'$'+comAcum.toLocaleString('es-AR')}</b></div>
        </div>
      </div>
    </div>

    <!-- Bloques colapsables por probabilidad + ventas -->
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px">
      <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:800">📋 Pipeline de entrevistas — pulsá para ver el detalle</div>
      <button onclick="openSegModal()" style="background:var(--accent);border:none;border-radius:8px;padding:8px 16px;color:var(--bg);font-family:'Syne',sans-serif;font-weight:700;font-size:12px;cursor:pointer">+ Nueva entrevista</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px">
      ${bloqueGrupo(uid+'-alta','Probabilidad Alta','var(--danger)','rgba(239,68,68,0.12)',alta,'🔴')}
      ${bloqueGrupo(uid+'-media','Probabilidad Media','var(--warn)','rgba(245,158,11,0.12)',media,'🟡')}
      ${bloqueGrupo(uid+'-baja','Probabilidad Baja','var(--accent3)','rgba(200,168,74,0.12)',baja,'🟢')}
      ${bloqueVentas()}
    </div>

    <!-- Cerradas/Ganadas -->
    ${segsCerrados.length?`<details style="background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden">
      <summary style="padding:14px 20px;cursor:pointer;font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:var(--muted)">✅ Entrevistas cerradas (${segsCerrados.length})</summary>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:var(--surface2)">
            <th style="text-align:left;padding:8px 12px;font-size:10px;color:var(--muted)">Empresa</th>
            <th style="text-align:left;padding:8px;font-size:10px;color:var(--muted)">Contacto</th>
            <th style="text-align:center;padding:8px;font-size:10px;color:var(--muted)">Prob.</th>
            <th style="text-align:center;padding:8px;font-size:10px;color:var(--muted)">Cerrado</th>
            <th style="text-align:right;padding:8px;font-size:10px;color:var(--muted)">Comisión</th>
          </tr></thead>
          <tbody>
            ${segsCerrados.slice(0,20).map(s=>`<tr style="border-bottom:1px solid rgba(212,175,55,0.07);opacity:0.7">
              <td style="padding:8px 12px;font-size:12px;text-decoration:line-through;color:var(--muted)">${s.empresa||'—'}</td>
              <td style="padding:8px;font-size:11px;color:var(--muted)">${s.contacto||'—'}</td>
              <td style="padding:8px;text-align:center;font-size:11px">${s.prioridad==='Alta'?'🔴':s.prioridad==='Media'?'🟡':'🟢'}</td>
              <td style="padding:8px;text-align:center;font-size:11px;color:var(--muted)">${s.fechaHecho?fmtD(s.fechaHecho):'—'}</td>
              <td style="padding:8px;text-align:right;font-size:11px;color:var(--accent3)">${s.comision?'$'+s.comision.toLocaleString('es-AR'):'—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </details>`:''}
  </div>`;

  // Dibujar gráfico torta probabilidades
  setTimeout(()=>{
    const c1=document.getElementById(cid1);
    if(c1&&(alta.length+media.length+baja.length)>0){
      const ctx=c1.getContext('2d');
      const data=[alta.length,media.length,baja.length];
      const colors=['rgba(239,68,68,0.85)','rgba(245,158,11,0.85)','rgba(200,168,74,0.85)'];
      const total=data.reduce((a,b)=>a+b,0);
      let start=-Math.PI/2;
      ctx.clearRect(0,0,200,200);
      data.forEach((v,i)=>{
        if(!v)return;
        const slice=(v/total)*Math.PI*2;
        ctx.beginPath();ctx.moveTo(100,100);
        ctx.arc(100,100,80,start,start+slice);
        ctx.closePath();ctx.fillStyle=colors[i];ctx.fill();
        // label
        const mid=start+slice/2;
        const tx=100+55*Math.cos(mid),ty=100+55*Math.sin(mid);
        ctx.fillStyle='#fff';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(v,tx,ty);
        start+=slice;
      });
      ctx.beginPath();ctx.arc(100,100,38,0,Math.PI*2);ctx.fillStyle='var(--surface)';
      try{ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--surface').trim()||'#131c2e';}catch(e){ctx.fillStyle='#131c2e';}
      ctx.fill();
    } else if(c1){
      const ctx=c1.getContext('2d');
      ctx.fillStyle='rgba(255,255,255,0.05)';ctx.beginPath();ctx.arc(100,100,80,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='12px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('Sin datos',100,100);
    }
    // Torta ventas vs objetivo
    const c2=document.getElementById(cid2);
    if(c2){
      const ctx=c2.getContext('2d');
      const logradas=Math.min(ventasMes,objVentas||ventasMes||1);
      const faltantes=Math.max((objVentas||0)-ventasMes,0);
      const excedente=objVentas>0&&ventasMes>objVentas?ventasMes-objVentas:0;
      ctx.clearRect(0,0,200,200);
      if(objVentas>0){
        const data2=excedente>0?[ventasMes,0]:[logradas,faltantes];
        const clrs=excedente>0?['rgba(200,168,74,0.9)','rgba(212,175,55,0.07)']:['rgba(200,168,74,0.85)','rgba(239,68,68,0.4)'];
        let s2=-Math.PI/2;
        const total2=data2.reduce((a,b)=>a+b,0)||1;
        data2.forEach((v,i)=>{
          const sl=(v/total2)*Math.PI*2;
          ctx.beginPath();ctx.moveTo(100,100);ctx.arc(100,100,80,s2,s2+sl);ctx.closePath();ctx.fillStyle=clrs[i];ctx.fill();
          s2+=sl;
        });
        ctx.beginPath();ctx.arc(100,100,38,0,Math.PI*2);
        try{ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--surface').trim()||'#131c2e';}catch(e){ctx.fillStyle='#131c2e';}
        ctx.fill();
        const pct=Math.round(ventasMes/(objVentas)*100);
        ctx.fillStyle=pct>=100?'rgba(200,168,74,1)':'rgba(255,255,255,0.9)';
        ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(pct+'%',100,100);
      } else {
        ctx.fillStyle='rgba(255,255,255,0.05)';ctx.beginPath();ctx.arc(100,100,80,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(200,168,74,0.85)';ctx.beginPath();ctx.arc(100,100,80,-Math.PI/2,-Math.PI/2+Math.min(ventasMes/5,1)*Math.PI*2);ctx.lineTo(100,100);ctx.closePath();ctx.fill();
        try{ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--surface').trim()||'#131c2e';}catch(e){ctx.fillStyle='#131c2e';}
        ctx.beginPath();ctx.arc(100,100,38,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(255,255,255,0.7)';ctx.font='11px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(ventasMes+' ventas',100,100);
      }
    }
  },50);
}

function openSegModal(vendedorNombre){
  openModal('modal-crm-seg','new');
  document.getElementById('seg-vendedor').value=vendedorNombre||currentUser?.nombre||'';
  document.getElementById('seg-fecha').value=todayStr();
  document.getElementById('seg-comision').value='';
}

function mvToggle(id){
  const panel=document.getElementById(id+'-panel');
  const arr=document.getElementById(id+'-arr');
  if(!panel)return;
  const abierto=panel.style.display!=='none';
  panel.style.display=abierto?'none':'block';
  if(arr)arr.style.transform=abierto?'':'rotate(180deg)';
}

// ============================================================
// REFERIDOS
// ============================================================
function renderReferidos(){
  const el=document.getElementById('referidos-content');
  if(!el)return;
  const nombre=currentUser.nombre;
  const today=todayStr();
  const ym=today.substring(0,7);
  const MES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mesNom=MES[parseInt(ym.split('-')[1])-1];
  const vendRec=S.get('vendedores').find(v=>v.nombre===nombre)||{};
  const vendId=vendRec.id||null;
  const obj=S.get('crm_objetivos').find(x=>x.ym===ym&&String(x.vendedorId)===String(vendId))||null;
  const objRef=obj?.referidos||0;

  const todos=S.get('crm_referidos').filter(r=>r.vendedor===nombre);
  const delMes=todos.filter(r=>r.fecha&&r.fecha.startsWith(ym));
  const totalMes=delMes.length;
  const convertidos=delMes.filter(r=>r.estado==='Convertido').length;
  const perdidos=delMes.filter(r=>r.estado==='Perdido').length;
  const pendientes=delMes.filter(r=>r.estado!=='Convertido'&&r.estado!=='Perdido').length;
  const tasaConv=totalMes>0?Math.round(convertidos/totalMes*100):0;

  // Por fuente (quién aportó)
  const fuentes={};
  todos.forEach(r=>{const f=r.aportadoPor||'Sin especificar';if(!fuentes[f])fuentes[f]={total:0,conv:0};fuentes[f].total++;if(r.estado==='Convertido')fuentes[f].conv++;});
  const fuentesArr=Object.entries(fuentes).sort((a,b)=>b[1].total-a[1].total);

  const estadoStyle=s=>({
    Pendiente:{bg:'rgba(99,102,241,0.1)',bd:'rgba(99,102,241,0.3)',cl:'#a5b4fc',ic:'⏳'},
    Contactado:{bg:'rgba(212,175,55,0.08)',bd:'rgba(212,175,55,0.2)',cl:'var(--accent)',ic:'📞'},
    Entrevista:{bg:'rgba(245,158,11,0.08)',bd:'rgba(245,158,11,0.2)',cl:'var(--warn)',ic:'📅'},
    Convertido:{bg:'rgba(200,168,74,0.1)',bd:'rgba(200,168,74,0.3)',cl:'var(--accent3)',ic:'✅'},
    Perdido:{bg:'rgba(239,68,68,0.07)',bd:'rgba(239,68,68,0.2)',cl:'var(--danger)',ic:'❌'},
  }[s]||{bg:'rgba(255,255,255,0.03)',bd:'var(--border)',cl:'var(--muted)',ic:'•'});

  const cid='ref-c-'+Date.now();

  el.innerHTML=`
  <div style="padding:20px 24px;max-width:1100px;margin:0 auto">

    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:24px">
      <div>
        <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800">🤝 Referidos — ${mesNom} ${ym.split('-')[0]}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:2px">Clientes o prospectos aportados por terceros</div>
      </div>
      <button onclick="abrirRefModal()" style="background:var(--accent);border:none;border-radius:10px;padding:9px 18px;color:var(--bg);font-family:'Syne',sans-serif;font-weight:700;font-size:13px;cursor:pointer">+ Nuevo referido</button>
    </div>

    <!-- KPIs -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:24px">
      ${[
        {ic:'🎯',v:objRef||'—',lb:'Objetivo del mes',cl:'var(--accent)'},
        {ic:'📥',v:totalMes,lb:'Referidos recibidos',cl:'var(--text)'},
        {ic:'⏳',v:pendientes,lb:'En proceso',cl:'#a5b4fc'},
        {ic:'✅',v:convertidos,lb:'Convertidos',cl:'var(--accent3)'},
        {ic:'📊',v:tasaConv+'%',lb:'Tasa de conversión',cl:tasaConv>=30?'var(--accent3)':tasaConv>=15?'var(--warn)':'var(--danger)'},
        {ic:'❌',v:perdidos,lb:'Perdidos',cl:'var(--danger)'},
      ].map(k=>`<div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px;text-align:center">
        <div style="font-size:20px;margin-bottom:4px">${k.ic}</div>
        <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:${k.cl};line-height:1">${k.v}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:4px;text-transform:uppercase;letter-spacing:1px">${k.lb}</div>
      </div>`).join('')}
    </div>

    ${objRef>0?`<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:14px">
      <div style="flex:1">
        <div style="font-size:12px;color:var(--muted);margin-bottom:6px">Progreso del objetivo (${totalMes} / ${objRef})</div>
        <div style="background:var(--surface2);border-radius:8px;height:10px;overflow:hidden"><div style="height:100%;width:${Math.min(Math.round(totalMes/objRef*100),100)}%;background:linear-gradient(90deg,var(--accent2),var(--accent));border-radius:8px;transition:width 0.6s"></div></div>
      </div>
      <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:${totalMes>=objRef?'var(--accent3)':'var(--accent)'}">${Math.round(totalMes/objRef*100)}%</div>
    </div>`:''}

    <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:24px">
      <!-- Tabla fuentes -->
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden">
        <div style="padding:14px 18px;border-bottom:1px solid var(--border);font-family:'Syne',sans-serif;font-size:13px;font-weight:700">👤 Por fuente (quién aportó)</div>
        ${fuentesArr.length?`<table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:var(--surface2)">
            <th style="text-align:left;padding:8px 14px;font-size:10px;color:var(--muted)">Fuente</th>
            <th style="text-align:center;padding:8px;font-size:10px;color:var(--muted)">Total</th>
            <th style="text-align:center;padding:8px;font-size:10px;color:var(--muted)">Convertidos</th>
            <th style="text-align:center;padding:8px;font-size:10px;color:var(--muted)">Tasa</th>
          </tr></thead>
          <tbody>
            ${fuentesArr.map(([f,d])=>{const t=d.total>0?Math.round(d.conv/d.total*100):0;return`<tr style="border-bottom:1px solid rgba(212,175,55,0.07)">
              <td style="padding:10px 14px;font-size:13px;font-weight:600">${f}</td>
              <td style="padding:10px;text-align:center;font-size:13px;font-weight:700;color:var(--accent)">${d.total}</td>
              <td style="padding:10px;text-align:center;font-size:13px;font-weight:700;color:var(--accent3)">${d.conv}</td>
              <td style="padding:10px;text-align:center"><span style="font-size:12px;font-weight:700;color:${t>=30?'var(--accent3)':t>=15?'var(--warn)':'var(--muted)'}">${t}%</span></td>
            </tr>`;}).join('')}
          </tbody>
        </table>`:`<div style="padding:28px;text-align:center;color:var(--muted);font-size:12px">Sin referidos aún</div>`}
      </div>
      <!-- Mini gráfico torta estado -->
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px">
        <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;margin-bottom:14px">📊 Estado del pipeline</div>
        <canvas id="${cid}" width="160" height="160" style="display:block;margin:0 auto"></canvas>
        <div style="display:flex;flex-direction:column;gap:5px;margin-top:12px">
          ${[['⏳','Pendiente/Contactado',pendientes,'#a5b4fc'],['✅','Convertidos',convertidos,'rgba(200,168,74,0.9)'],['❌','Perdidos',perdidos,'rgba(239,68,68,0.7)']].map(([ic,lb,v,cl])=>`<div style="display:flex;align-items:center;gap:8px;font-size:11px"><div style="width:10px;height:10px;border-radius:50%;background:${cl};flex-shrink:0"></div><div style="flex:1;color:var(--muted)">${lb}</div><b style="color:var(--text)">${v}</b></div>`).join('')}
        </div>
      </div>
    </div>

    <!-- Lista de referidos -->
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden">
      <div style="padding:14px 18px;border-bottom:1px solid var(--border);font-family:'Syne',sans-serif;font-size:13px;font-weight:700">📋 Todos los referidos (${todos.length})</div>
      ${todos.length?`<div style="display:flex;flex-direction:column">
        ${todos.sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')).map(r=>{const es=estadoStyle(r.estado);return`<div style="padding:14px 18px;border-bottom:1px solid rgba(212,175,55,0.07);display:flex;align-items:center;gap:14px;flex-wrap:wrap">
          <div style="background:${es.bg};border:1px solid ${es.bd};border-radius:8px;padding:3px 9px;font-size:11px;font-weight:700;color:${es.cl};white-space:nowrap">${es.ic} ${r.estado||'Pendiente'}</div>
          <div style="flex:1;min-width:140px">
            <div style="font-size:13px;font-weight:600">${r.empresa||'—'}</div>
            <div style="font-size:11px;color:var(--muted)">${r.contacto||''}</div>
          </div>
          <div style="font-size:11px;color:var(--muted)">👤 <b style="color:var(--text)">${r.aportadoPor||'—'}</b></div>
          <div style="font-size:11px;color:var(--muted)">${r.fecha?fmtD(r.fecha):''}</div>
          ${r.comision?`<div style="font-size:12px;font-weight:700;color:var(--accent3)">${'$'+r.comision.toLocaleString('es-AR')}</div>`:''}
          <div style="display:flex;gap:6px">
            <select onchange="cambiarEstadoRef(${r.id},this.value)" style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:4px 8px;color:var(--text);font-size:11px;cursor:pointer">
              ${['Pendiente','Contactado','Entrevista','Convertido','Perdido'].map(st=>`<option value="${st}" ${r.estado===st?'selected':''}>${st}</option>`).join('')}
            </select>
            <button onclick="editarRef(${r.id})" style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:4px 8px;cursor:pointer;color:var(--muted);font-size:11px">✏️</button>
            <button onclick="delItem('crm_referidos',${r.id},renderReferidos)" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:6px;padding:4px 8px;cursor:pointer;color:var(--danger);font-size:11px">🗑</button>
          </div>
        </div>`;}).join('')}
      </div>`:`<div style="padding:40px;text-align:center;color:var(--muted)"><div style="font-size:40px;margin-bottom:10px">🤝</div><div>Sin referidos registrados.<br>¡Agregá el primero!</div></div>`}
    </div>
  </div>`;

  // Canvas estado
  setTimeout(()=>{
    const c=document.getElementById(cid);
    if(!c)return;
    const ctx=c.getContext('2d');
    const data=[pendientes,convertidos,perdidos];
    const colors=['rgba(165,180,252,0.85)','rgba(200,168,74,0.85)','rgba(239,68,68,0.7)'];
    const total=data.reduce((a,b)=>a+b,0);
    if(!total){ctx.fillStyle='rgba(255,255,255,0.05)';ctx.beginPath();ctx.arc(80,80,65,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='11px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('Sin datos',80,80);return;}
    let s=-Math.PI/2;
    data.forEach((v,i)=>{
      if(!v)return;
      const sl=(v/total)*Math.PI*2;
      ctx.beginPath();ctx.moveTo(80,80);ctx.arc(80,80,65,s,s+sl);ctx.closePath();ctx.fillStyle=colors[i];ctx.fill();
      if(v/total>0.1){const m=s+sl/2;ctx.fillStyle='#fff';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(v,80+42*Math.cos(m),80+42*Math.sin(m));}
      s+=sl;
    });
    ctx.beginPath();ctx.arc(80,80,30,0,Math.PI*2);
    try{ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--surface').trim()||'#131c2e';}catch(e){ctx.fillStyle='#131c2e';}
    ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.7)';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(tasaConv+'%',80,80);
  },50);
}

function abrirRefModal(id){
  openModal('modal-referido','new');
  document.getElementById('ref-id').value='';
  document.getElementById('ref-empresa').value='';
  document.getElementById('ref-contacto').value='';
  document.getElementById('ref-aportado').value='';
  document.getElementById('ref-fecha').value=todayStr();
  document.getElementById('ref-estado').value='Pendiente';
  document.getElementById('ref-comision').value='';
  document.getElementById('ref-notas').value='';
  if(id){
    const r=S.get('crm_referidos').find(x=>x.id===id);
    if(r){
      document.getElementById('ref-id').value=r.id;
      document.getElementById('ref-empresa').value=r.empresa||'';
      document.getElementById('ref-contacto').value=r.contacto||'';
      document.getElementById('ref-aportado').value=r.aportadoPor||'';
      document.getElementById('ref-fecha').value=r.fecha||'';
      document.getElementById('ref-estado').value=r.estado||'Pendiente';
      document.getElementById('ref-comision').value=r.comision||'';
      document.getElementById('ref-notas').value=r.notas||'';
    }
  }
}
function editarRef(id){abrirRefModal(id);}

function saveReferido(){
  const id=document.getElementById('ref-id').value;
  const item={
    id:id?Number(id):S.nextId('crm_referidos'),
    vendedor:currentUser.nombre,
    empresa:document.getElementById('ref-empresa').value,
    contacto:document.getElementById('ref-contacto').value,
    aportadoPor:document.getElementById('ref-aportado').value,
    fecha:document.getElementById('ref-fecha').value,
    estado:document.getElementById('ref-estado').value,
    comision:Number(document.getElementById('ref-comision').value)||0,
    notas:document.getElementById('ref-notas').value,
  };
  if(!item.empresa){toast('⚠️ Completá el nombre de empresa');return;}
  const items=S.get('crm_referidos');
  if(id){const i=items.findIndex(x=>x.id===Number(id));if(i>-1)items[i]=item;}else items.push(item);
  S.set('crm_referidos',items);
  closeModal('modal-referido');
  renderReferidos();
  toast('✅ Referido guardado');
}

function cambiarEstadoRef(id,estado){
  const items=S.get('crm_referidos');
  const i=items.findIndex(x=>x.id===id);
  if(i>-1){items[i].estado=estado;if(estado==='Convertido')items[i].fechaConversion=todayStr();}
  S.set('crm_referidos',items);
  renderReferidos();
  toast('✅ Estado actualizado');
}

// ============================================================
// RANKINGS DEL EQUIPO
// ============================================================
function renderRankings(){
  const el=document.getElementById('rankings-content');
  if(!el)return;

  // ── Guard: ranking desactivado por el dueño ──
  const rankingOn=appCfg('rankingActivo',true);
  const esDueno=currentUser?.rol==='dueno';
  if(!rankingOn && !esDueno){
    const msg=appCfg('rankingMensaje','El ranking está temporalmente desactivado. ¡Seguí trabajando fuerte! 💪');
    el.innerHTML=`
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:340px;gap:20px;text-align:center">
        <div style="font-size:64px">🏆</div>
        <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--text)">${msg}</div>
        <div style="font-size:13px;color:var(--muted)">Tu supervisor ha desactivado la vista de rankings temporalmente.</div>
      </div>`;
    return;
  }

  const today=todayStr();
  const ym=today.substring(0,7);
  const now=new Date();
  const MES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mesNom=MES[parseInt(ym.split('-')[1])-1];

  // Selector de mes
  const selMes=el.getAttribute('data-mes')||ym;

  const vendedores=S.get('vendedores').filter(v=>v.activo!==false);
  const allLogs=S.get('crm_logs');
  const allSegs=S.get('crm_seguimientos');
  const allRefs=S.get('crm_referidos');
  const allAuds=S.get('auditorias');
  const allObjs=S.get('crm_objetivos');
  const allPremios=S.get('crm_premios')||[];

  // Calcular stats de cada vendedor para el mes seleccionado
  const stats=vendedores.map(v=>{
    const logs=allLogs.filter(l=>l.vendedor===v.nombre&&l.fecha.startsWith(selMes));
    const llamadas=logs.reduce((s,l)=>s+(l.llamadas||0),0);
    const duenos=logs.reduce((s,l)=>s+(l.duenos||0),0);
    const entrevistas=logs.reduce((s,l)=>s+(l.agendadas||0),0);
    const ventas=logs.reduce((s,l)=>s+(l.cerradas||0),0);
    const refs=allRefs.filter(r=>r.vendedor===v.nombre&&r.fecha&&r.fecha.startsWith(selMes));
    const refsTotal=refs.length;
    const refsConv=refs.filter(r=>r.estado==='Convertido').length;
    const comUnit=Number(v.comision)||300;
    const audsComp=allAuds.filter(a=>a.vendedor===v.nombre&&a.estado==='Completada'&&(a.fInforme||'').startsWith(selMes)).length;
    const comisiones=audsComp*comUnit;
    // Premios históricos del vendedor
    const vendId=v.id;
    const premiosGanados=allPremios.filter(p=>{
      const oP=allObjs.find(x=>x.ym===p.ym&&String(x.vendedorId)===String(vendId));
      if(!oP||!oP.premioPct) return false;
      const logsP=allLogs.filter(l=>l.vendedor===v.nombre&&l.fecha.startsWith(p.ym));
      const pCI=logsP.reduce((s,l)=>s+(l.cerradas||0),0);
      const pLL=logsP.reduce((s,l)=>s+(l.llamadas||0),0);
      const pcts=[oP.llamadas?Math.min(Math.round(pLL/oP.llamadas*100),999):null,oP.cerradas?Math.min(Math.round(pCI/oP.cerradas*100),999):null].filter(x=>x!==null);
      if(!pcts.length)return false;
      return Math.round(pcts.reduce((s,x)=>s+x,0)/pcts.length)>=(oP.premioPct||100);
    }).length;
    return {v,llamadas,duenos,entrevistas,ventas,refsTotal,refsConv,comisiones,premiosGanados};
  });

  const yo=currentUser.nombre;

  // Helper para armar tabla de ranking
  const tablaRanking=(titulo,icono,color,items,campo,fmt,desc)=>{
    const sorted=[...items].sort((a,b)=>b[campo]-a[campo]);
    const max=sorted[0]?.[campo]||1;
    return`<div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">
        <span style="font-size:22px">${icono}</span>
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:800">${titulo}</div>
          <div style="font-size:10px;color:var(--muted)">${desc}</div>
        </div>
      </div>
      <div style="padding:0">
        ${sorted.map((s,i)=>{
          const esYo=s.v.nombre===yo;
          const val=s[campo];
          const pct=max>0?Math.round(val/max*100):0;
          const medal=i===0&&val>0?'🥇':i===1&&val>0?'🥈':i===2&&val>0?'🥉':'';
          return`<div style="padding:12px 20px;border-bottom:1px solid rgba(212,175,55,0.07);${esYo?'background:rgba(212,175,55,0.04);':''}${i===0&&val>0?'background:rgba(245,158,11,0.04);':''}">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
              <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:var(--muted);width:20px;text-align:center">${medal||'#'+(i+1)}</div>
              <div style="flex:1;font-size:13px;font-weight:${esYo?700:500};color:${esYo?'var(--accent)':'var(--text)'}">${s.v.nombre}${esYo?' <span style="font-size:10px;color:var(--accent);font-weight:700">(vos)</span>':''}</div>
              <div style="font-family:'DM Mono',monospace;font-size:14px;font-weight:800;color:${i===0&&val>0?'#f59e0b':color}">${fmt(val)}</div>
            </div>
            <div style="margin-left:32px;background:var(--surface2);border-radius:4px;height:5px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:${i===0&&val>0?'linear-gradient(90deg,#d97706,#f59e0b)':'linear-gradient(90deg,'+color+','+color+'88)'};border-radius:4px;transition:width 0.6s"></div>
            </div>
          </div>`;
        }).join('')}
        ${sorted.every(s=>s[campo]===0)?`<div style="padding:24px;text-align:center;color:var(--muted);font-size:12px">Sin datos para este mes aún</div>`:''}
      </div>
    </div>`;
  };

  // Calcular ranking histórico de premios (todos los meses)
  const rankPremios=[...stats].sort((a,b)=>b.premiosGanados-a.premiosGanados);

  // Opciones de mes (últimos 6 meses)
  const mesesOpts=Array.from({length:6},(_,i)=>{
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0');
    const ym2=`${y}-${m}`;
    const mn=MES[d.getMonth()];
    return`<option value="${ym2}" ${ym2===selMes?'selected':''}>${mn} ${y}</option>`;
  }).join('');

  el.innerHTML=`
  <div style="padding:20px 24px;max-width:1100px;margin:0 auto">

    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:24px">
      <div>
        <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800">🏆 Rankings del equipo</div>
        <div style="font-size:12px;color:var(--muted);margin-top:2px">Comparativa de rendimiento — todos los vendedores</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <label style="font-size:11px;color:var(--muted)">Período:</label>
        <select onchange="document.getElementById('rankings-content').setAttribute('data-mes',this.value);renderRankings()"
          style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 14px;color:var(--text);font-size:13px;cursor:pointer">
          ${mesesOpts}
        </select>
      </div>
    </div>

    <!-- Tu posición resumen -->
    ${(()=>{
      const tuStats=stats.find(s=>s.v.nombre===yo);
      if(!tuStats)return'';
      const pos=(campo)=>{const s=[...stats].sort((a,b)=>b[campo]-a[campo]);const i=s.findIndex(x=>x.v.nombre===yo);return i+1;};
      return`<div style="background:linear-gradient(135deg,rgba(212,175,55,0.08),rgba(184,146,46,0.08));border:1px solid rgba(212,175,55,0.2);border-radius:16px;padding:18px 22px;margin-bottom:24px">
        <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;margin-bottom:14px;color:var(--accent)">📍 Tu posición este mes — ${mesNom}</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px">
          ${[
            {lb:'Llamadas',pos:pos('llamadas'),val:tuStats.llamadas,ic:'📞'},
            {lb:'Entrevistas',pos:pos('entrevistas'),val:tuStats.entrevistas,ic:'📅'},
            {lb:'Ventas',pos:pos('ventas'),val:tuStats.ventas,ic:'🏆'},
            {lb:'Referidos',pos:pos('refsTotal'),val:tuStats.refsTotal,ic:'🤝'},
            {lb:'Comisiones',pos:pos('comisiones'),val:'$'+tuStats.comisiones.toLocaleString('es-AR'),ic:'💰'},
          ].map(k=>`<div style="background:rgba(0,0,0,0.2);border-radius:10px;padding:12px;text-align:center">
            <div style="font-size:18px;margin-bottom:4px">${k.ic}</div>
            <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--accent);line-height:1">${k.pos === 1 ? '🥇' : k.pos === 2 ? '🥈' : k.pos === 3 ? '🥉' : '#'+k.pos}</div>
            <div style="font-size:10px;color:var(--muted);margin-top:2px">${k.lb}</div>
            <div style="font-size:11px;color:var(--text);margin-top:1px;font-weight:600">${k.val}</div>
          </div>`).join('')}
        </div>
      </div>`;
    })()}

    <!-- Grid de rankings -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      ${tablaRanking('Llamadas realizadas','📞','var(--accent)',stats,'llamadas',v=>v.toLocaleString('es-AR'),'Total de llamadas en el período')}
      ${tablaRanking('Entrevistas concretadas','📅','var(--warn)',stats,'entrevistas',v=>v.toLocaleString('es-AR'),'Reuniones agendadas y realizadas')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      ${tablaRanking('Ventas cerradas','🏆','var(--accent3)',stats,'ventas',v=>v.toLocaleString('es-AR'),'Auditorías vendidas y completadas')}
      ${tablaRanking('Referidos aportados','🤝','#c8a84a',stats,'refsTotal',v=>v.toLocaleString('es-AR'),'Prospectos referidos en el período')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      ${tablaRanking('Comisiones generadas','💰','var(--accent3)',stats,'comisiones',v=>'$'+v.toLocaleString('es-AR'),'Comisiones por auditorías completadas')}
      ${tablaRanking('Dueños contactados','👤','#c8a84a',stats,'duenos',v=>v.toLocaleString('es-AR'),'Tomadores de decisión contactados')}
    </div>

    <!-- Ranking histórico de premios -->
    <div style="background:linear-gradient(135deg,rgba(245,158,11,0.08),rgba(249,115,22,0.05));border:1px solid rgba(245,158,11,0.25);border-radius:16px;overflow:hidden">
      <div style="padding:16px 20px;border-bottom:1px solid rgba(245,158,11,0.2);display:flex;align-items:center;gap:10px">
        <span style="font-size:22px">🏅</span>
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:800">Premios ganados — histórico</div>
          <div style="font-size:10px;color:var(--muted)">Premios acumulados de todos los meses</div>
        </div>
      </div>
      <div style="padding:0">
        ${rankPremios.map((s,i)=>{
          const esYo=s.v.nombre===yo;
          const medal=i===0&&s.premiosGanados>0?'🥇':i===1&&s.premiosGanados>0?'🥈':i===2&&s.premiosGanados>0?'🥉':'';
          return`<div style="padding:14px 20px;border-bottom:1px solid rgba(245,158,11,0.1);display:flex;align-items:center;gap:14px;${esYo?'background:rgba(212,175,55,0.04)':''}">
            <div style="font-size:20px;width:28px;text-align:center">${medal||'#'+(i+1)}</div>
            <div style="flex:1;font-size:13px;font-weight:${esYo?700:500};color:${esYo?'var(--accent)':'var(--text)'}">${s.v.nombre}${esYo?' <span style="font-size:10px;font-weight:700;color:var(--accent)">(vos)</span>':''}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${Array.from({length:s.premiosGanados},(_,k)=>`<span style="font-size:18px" title="Premio ${k+1}">🏅</span>`).join('')}
              ${s.premiosGanados===0?`<span style="font-size:11px;color:var(--muted)">Sin premios aún</span>`:''}
            </div>
            <div style="font-family:'DM Mono',monospace;font-size:15px;font-weight:800;color:#f59e0b;min-width:30px;text-align:right">${s.premiosGanados}</div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- Ranking de Uso del Sistema -->
    ${(()=>{
      const allUsers=getUsers().filter(u=>u.activo!==false);
      const usageStats=allUsers.map(u=>{
        const uName=u.nombre;
        const uLogs=(S.get('crm_activity_log')||[]).filter(l=>l.user===uName);
        const uLogsMes=uLogs.filter(l=>l.date&&l.date.startsWith(selMes));
        const uLogsHist=uLogs;
        // Contar por tipo de acción este mes
        const sesiones=uLogsMes.filter(l=>l.action==='login').length;
        const acciones=uLogsMes.length;
        const diasActivos=new Set(uLogsMes.map(l=>l.date)).size;
        // Calcular racha (días consecutivos con actividad)
        const allDates=[...new Set(uLogsHist.map(l=>l.date))].sort().reverse();
        let racha=0;
        if(allDates.length){
          const hoy=new Date(today);
          for(let d=0;d<60;d++){
            const check=new Date(hoy);check.setDate(check.getDate()-d);
            const ds=check.toISOString().split('T')[0];
            if(allDates.includes(ds))racha++;
            else if(d>0)break;
          }
        }
        const primaryRole=getPrimaryRole(u);
        const roleLabel=ROLE_LABELS[primaryRole]||primaryRole;
        return {u,uName,sesiones,acciones,diasActivos,racha,roleLabel};
      }).sort((a,b)=>b.acciones-a.acciones);
      const maxAcc=usageStats[0]?.acciones||1;

      return`<div style="background:linear-gradient(135deg,rgba(200,168,74,0.08),rgba(6,214,160,0.05));border:1px solid rgba(200,168,74,0.25);border-radius:16px;overflow:hidden;margin-top:16px">
        <div style="padding:16px 20px;border-bottom:1px solid rgba(200,168,74,0.2);display:flex;align-items:center;gap:10px">
          <span style="font-size:22px">⚡</span>
          <div>
            <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:800">Uso del Sistema</div>
            <div style="font-size:10px;color:var(--muted)">Quién más usa MetoGroup — ${mesNom}</div>
          </div>
        </div>
        <div style="padding:0">
          ${usageStats.map((s,i)=>{
            const esYo=s.uName===yo;
            const pct=maxAcc>0?Math.round(s.acciones/maxAcc*100):0;
            const medal=i===0&&s.acciones>0?'🥇':i===1&&s.acciones>0?'🥈':i===2&&s.acciones>0?'🥉':'';
            const rachaEmoji=s.racha>=7?'🔥':s.racha>=3?'⚡':'';
            return`<div style="padding:14px 20px;border-bottom:1px solid rgba(200,168,74,0.1);${esYo?'background:rgba(212,175,55,0.04);':''}${i===0&&s.acciones>0?'background:rgba(200,168,74,0.04);':''}">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
                <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:var(--muted);width:24px;text-align:center">${medal||'#'+(i+1)}</div>
                <div style="flex:1">
                  <span style="font-size:13px;font-weight:${esYo?700:500};color:${esYo?'var(--accent)':'var(--text)'}">${s.uName}</span>${esYo?' <span style="font-size:10px;color:var(--accent);font-weight:700">(vos)</span>':''}
                  <span style="font-size:10px;color:var(--muted);margin-left:6px">${s.roleLabel}</span>
                </div>
                <div style="display:flex;align-items:center;gap:12px">
                  ${s.racha>0?`<span style="font-size:10px;color:#f59e0b;font-weight:700" title="Racha: ${s.racha} días consecutivos">${rachaEmoji} ${s.racha}d</span>`:''}
                  <div style="text-align:right">
                    <div style="font-family:'DM Mono',monospace;font-size:14px;font-weight:800;color:${i===0&&s.acciones>0?'#c8a84a':'var(--text)'}">${s.acciones}</div>
                    <div style="font-size:9px;color:var(--muted)">acciones</div>
                  </div>
                </div>
              </div>
              <div style="margin-left:36px;display:flex;gap:16px;align-items:center">
                <div style="flex:1;background:var(--surface2);border-radius:4px;height:5px;overflow:hidden">
                  <div style="height:100%;width:${pct}%;background:${i===0&&s.acciones>0?'linear-gradient(90deg,#9a7830,#c8a84a)':'linear-gradient(90deg,#c8a84a,#c8a84a88)'};border-radius:4px;transition:width 0.6s"></div>
                </div>
                <div style="display:flex;gap:10px;font-size:10px;color:var(--muted);white-space:nowrap">
                  <span title="Sesiones">🔑 ${s.sesiones}</span>
                  <span title="Días activos">📅 ${s.diasActivos}d</span>
                </div>
              </div>
            </div>`;
          }).join('')}
          ${usageStats.every(s=>s.acciones===0)?`<div style="padding:24px;text-align:center;color:var(--muted);font-size:12px">Sin datos de uso este mes aún</div>`:''}
        </div>
      </div>`;
    })()}

  </div>`;
}

// ============================================================
// AGENDA DISPONIBLE (Calendly — widget oficial + fallback)
// ============================================================
let _agendaTab=1;

function renderAgenda(){
  const el=document.getElementById('agenda-content');
  if(!el)return;
  const usuarioData=getUsers().find(u=>u.id===currentUser.id)||{};
  const nombre=currentUser.nombre;
  const sk1='calendly_link_'+nombre.replace(/\s+/g,'_');
  const sk2='calendly_link2_'+nombre.replace(/\s+/g,'_');
  const link1=usuarioData.calendly||localStorage.getItem(sk1)||'';
  const link2=usuarioData.calendly2||localStorage.getItem(sk2)||'';
  const links=[link1,link2].filter(Boolean);
  const tab=Math.min(_agendaTab,links.length||1);
  const linkActivo=links[tab-1]||'';
  const hayDos=link1&&link2;

  const tabBtn=(n,lbl,activo)=>`<button onclick="_agendaTab=${n};renderAgenda()" style="padding:8px 20px;border-radius:8px;border:1px solid ${activo?'var(--accent)':'var(--border)'};background:${activo?'rgba(212,175,55,0.12)':'transparent'};color:${activo?'var(--accent)':'var(--muted)'};font-family:'Syne',sans-serif;font-size:13px;font-weight:700;cursor:pointer">${lbl}</button>`;

  el.innerHTML=`
  <div style="padding:20px 24px;max-width:1100px;margin:0 auto;display:flex;flex-direction:column;gap:14px">

    <!-- Header -->
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
      <div style="font-size:26px">🗓</div>
      <div style="flex:1;min-width:180px">
        <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:800">Agenda Disponible</div>
        <div style="font-size:11px;color:var(--muted);margin-top:1px">Compartí tu link para que los clientes agenden reuniones.</div>
      </div>
      ${linkActivo?`
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:5px 10px;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${linkActivo}</div>
        <button onclick="copiarLinkCalendly()" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:7px 14px;cursor:pointer;color:var(--text);font-size:12px;font-family:'Syne',sans-serif;font-weight:600">📋 Copiar</button>
        <a href="${linkActivo}" target="_blank" style="background:linear-gradient(135deg,var(--accent2),var(--accent));border:none;border-radius:8px;padding:7px 14px;color:#fff;font-size:12px;font-family:'Syne',sans-serif;font-weight:700;text-decoration:none">↗ Abrir Calendly</a>
      </div>`:''}
    </div>

    ${hayDos?`<div style="display:flex;gap:8px">${tabBtn(1,'🗓 Agenda 1',tab===1)}${tabBtn(2,'🗓 Agenda 2',tab===2)}</div>`:''}

    ${linkActivo?`
    <!-- Widget oficial Calendly -->
    <div style="background:#fff;border-radius:14px;overflow:hidden;position:relative;min-height:660px">
      <div id="cly-loading" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:#fff;z-index:1">
        <div style="font-size:36px">🗓</div>
        <div style="font-family:sans-serif;font-size:14px;color:#666">Cargando tu agenda...</div>
        <div style="font-size:11px;color:#999;max-width:300px;text-align:center">Si no carga, usá el botón <b>↗ Abrir Calendly</b> de arriba para verla en tu navegador.</div>
      </div>
      <div class="calendly-inline-widget"
        data-url="${linkActivo}?hide_gdpr_banner=1&background_color=ffffff&text_color=1a1a2e&primary_color=7c3aed"
        style="min-width:320px;height:660px;position:relative;z-index:2">
      </div>
    </div>

    <!-- Panel de compartir siempre visible -->
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px 24px">
      <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;margin-bottom:14px;color:var(--muted)">📤 Compartir tu link de agenda</div>
      <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center">
        <div style="flex:1;min-width:200px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px 16px;font-family:'DM Mono',monospace;font-size:12px;color:var(--accent);word-break:break-all">${linkActivo}</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button onclick="copiarLinkCalendly()" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 18px;cursor:pointer;color:var(--text);font-size:12px;font-family:'Syne',sans-serif;font-weight:600;white-space:nowrap">📋 Copiar link</button>
          <a href="${linkActivo}" target="_blank" style="background:linear-gradient(135deg,var(--accent2),var(--accent));border:none;border-radius:8px;padding:9px 18px;color:#fff;font-size:12px;font-family:'Syne',sans-serif;font-weight:700;text-decoration:none;text-align:center;white-space:nowrap">↗ Abrir en nueva pestaña</a>
        </div>
      </div>
      <div style="margin-top:12px;font-size:11px;color:var(--muted);background:rgba(212,175,55,0.05);border-radius:8px;padding:10px 14px;border:1px solid rgba(212,175,55,0.1)">
        💡 <b style="color:var(--text)">Tip:</b> Copiá este link y pegalo en WhatsApp, email o tu firma para que los clientes agenden directamente con vos.
      </div>
    </div>`

    :`<!-- Sin link configurado -->
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:400px;gap:16px;padding:40px;text-align:center">
      <div style="font-size:52px">🗓</div>
      <div style="font-family:'Syne',sans-serif;font-size:17px;font-weight:700">Sin agenda configurada</div>
      <div style="font-size:13px;max-width:340px;line-height:1.7;color:var(--muted)">El administrador carga tu link de Calendly en<br><b style="color:var(--accent)">Sistema → Usuarios → Editar</b>.<br><br>O podés cargarlo vos acá:</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;max-width:480px;width:100%">
        <input id="calendly-manual-input" type="url" placeholder="https://calendly.com/tu-nombre"
          style="flex:1;min-width:240px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 14px;color:var(--text);font-family:'DM Mono',monospace;font-size:12px;outline:none"
          onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'"
          onkeydown="if(event.key==='Enter')guardarLinkCalendlyManual(1)">
        <button onclick="guardarLinkCalendlyManual(1)" style="background:linear-gradient(135deg,var(--accent2),var(--accent));border:none;border-radius:8px;padding:10px 20px;color:#fff;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;cursor:pointer">Cargar →</button>
      </div>
      <div style="font-size:11px;color:var(--muted)">¿No tenés cuenta? <a href="https://calendly.com/signup" target="_blank" style="color:var(--accent);text-decoration:none">Creá tu cuenta gratis →</a></div>
    </div>`}

  </div>`;

  if(linkActivo){
    // Cargar script oficial de Calendly
    const cargarWidget=()=>{
      if(window.Calendly){
        // initInlineWidgets fue deprecada — el widget se auto-inicializa
        // al detectar .calendly-inline-widget en el DOM
        // Solo llamamos si el método existe (versiones viejas del script)
        if(typeof window.Calendly.initInlineWidgets === 'function'){
          window.Calendly.initInlineWidgets();
        }
        setTimeout(()=>{const l=document.getElementById('cly-loading');if(l)l.style.display='none';},2500);
      }
    };
    if(!document.getElementById('calendly-script')){
      const s=document.createElement('script');
      s.id='calendly-script';
      s.src='https://assets.calendly.com/assets/external/widget.js';
      s.async=true;
      s.onload=()=>{
        // Dar tiempo al script para inicializarse completamente
        setTimeout(cargarWidget, 300);
      };
      s.onerror=()=>{const l=document.getElementById('cly-loading');if(l)l.style.display='none';};
      document.head.appendChild(s);
    } else {
      // Script ya cargado — reinicializar para el nuevo widget
      setTimeout(cargarWidget, 100);
    }
  }
}

function guardarLinkCalendlyManual(tab){
  const input=document.getElementById('calendly-manual-input');
  if(!input)return;
  const url=input.value.trim();
  if(!url){toast('⚠️ Pegá tu link primero');return;}
  if(!url.includes('calendly.com')&&!url.includes('cal.com')){toast('⚠️ Debe ser un link de Calendly');return;}
  const nombre=currentUser.nombre;
  const sk=(tab===2?'calendly_link2_':'calendly_link_')+nombre.replace(/\s+/g,'_');
  localStorage.setItem(sk,url);
  _agendaTab=tab;
  toast('✅ Agenda cargada');
  renderAgenda();
}

function copiarLinkCalendly(){
  const usuarioData=getUsers().find(u=>u.id===currentUser.id)||{};
  const nombre=currentUser.nombre;
  const link=(_agendaTab===2?(usuarioData.calendly2||localStorage.getItem('calendly_link2_'+nombre.replace(/\s+/g,'_'))):(usuarioData.calendly||localStorage.getItem('calendly_link_'+nombre.replace(/\s+/g,'_'))))||'';
  if(!link){toast('⚠️ No hay link configurado');return;}
  navigator.clipboard.writeText(link).then(()=>toast('📋 Link copiado')).catch(()=>{
    const ta=document.createElement('textarea');ta.value=link;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);
    toast('📋 Link copiado');
  });
}

// Avisos del supervisor para el vendedor logueado
function vdRenderAvisos(){
  if(!currentUser||currentUser.rol!=='vendedor') return '';
  const vendRec=S.get('vendedores').find(v=>v.nombre===currentUser.nombre);
  if(!vendRec) return '';
  const today=todayStr();
  const notas=_getNotasVend(vendRec.id)
    .filter(n=>!n.leida)
    .sort((a,b)=>(a.fecha||'9999').localeCompare(b.fecha||'9999'));
  if(!notas.length) return '';

  const ic=n=>n.fecha&&n.fecha<today?'🚨':n.fecha===today?'⚡':'📌';
  const bg=n=>n.fecha&&n.fecha<today?'rgba(239,68,68,0.07)':n.fecha===today?'rgba(245,158,11,0.07)':'rgba(212,175,55,0.04)';
  const bd=n=>n.fecha&&n.fecha<today?'rgba(239,68,68,0.25)':n.fecha===today?'rgba(245,158,11,0.25)':'rgba(212,175,55,0.15)';

  return`<div class="vd-sec vda" style="animation-delay:0.02s">📌 Avisos del supervisor</div>
<div class="vda" style="animation-delay:0.04s;display:flex;flex-direction:column;gap:10px;margin-bottom:22px">
  ${notas.map(n=>`<div style="background:${bg(n)};border:1px solid ${bd(n)};border-radius:12px;padding:14px 16px;display:flex;gap:12px;align-items:flex-start">
    <div style="font-size:20px;flex-shrink:0">${ic(n)}</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:13px;font-weight:600;margin-bottom:3px">${n.titulo||'(sin título)'}</div>
      ${n.texto?`<div style="font-size:12px;color:var(--muted);white-space:pre-wrap;margin-bottom:6px">${n.texto}</div>`:''}
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        ${n.fecha?`<span style="font-size:10px;color:var(--muted)">📅 ${fmtD(n.fecha)}</span>`:''}
        ${n.prioridad?`<span style="font-size:10px;font-weight:700;color:${n.prioridad==='Alta'?'var(--danger)':n.prioridad==='Media'?'var(--warn)':'var(--muted)'}">${n.prioridad==='Alta'?'🔴':n.prioridad==='Media'?'🟡':'🟢'} ${n.prioridad}</span>`:''}
      </div>
    </div>
    <button onclick="vndMarcarLeida(${vendRec.id},${n.id})" style="background:rgba(200,168,74,0.12);border:1px solid rgba(200,168,74,0.3);border-radius:7px;padding:5px 10px;cursor:pointer;color:var(--accent3);font-size:11px;white-space:nowrap;flex-shrink:0">✅ Visto</button>
  </div>`).join('')}
</div>`;
}

// INIT
(async function(){
  const _initParams = new URLSearchParams(window.location.search);
  const _hasBpcToken = !!_initParams.get('bpc_token');

  // Mostrar pantalla de carga — si hay bpc_token no mostrar login
  if(_hasBpcToken){
    document.getElementById('login-screen').style.display='none';
  } else {
    document.getElementById('login-screen').style.display='flex';
  }
  document.getElementById('main-app').style.display='none';

  // Si hay magic link en la URL, limpiar sesión ANTES de cargar
  if(_initParams.get('mk')){
    sessionStorage.removeItem('mg_session');
  }

  // Si hay bpc_token, esperar a que la validación async lo maneje y no continuar el init
  if(_hasBpcToken) return;

  // Cargar datos de Supabase
  try{
    await sbLoadAll();
  }catch(e){
    console.error('Error cargando Supabase:', e);
  }

  // Check magic link DESPUÉS de cargar Supabase — necesita portal_clientes cargado
  if(checkMagicLogin()){
    bootApp();
    return;
  }

  const sess = sessionStorage.getItem('mg_session');
  if(sess){
    try{
      const sd = JSON.parse(sess);
      // ── Sesión de cliente portal (rol='cliente' o id empieza con 'cli_') ──
      if(sd.rol === 'cliente' || String(sd.id||'').startsWith('cli_') || sd.rol === 'admin_empresa' || String(sd.id||'').startsWith('adm_')){
        const portalAccesos = S.get('portal_clientes')||[];
        const acceso = portalAccesos.find(p=>String(p.clienteId)===String(sd.clienteId) && p.activo);
        const clientes = S.get('clientes')||[];
        const cliente = clientes.find(c=>String(c.id)===String(sd.clienteId));
        if(acceso && cliente){
          currentUser = {id:'cli_'+acceso.clienteId, nombre:cliente.nombre, rol:'cliente', roles:['cliente'], clienteId:acceso.clienteId, portalId:acceso.id};
          sessionStorage.setItem('mg_session', JSON.stringify(currentUser));
          bootApp();
          return;
        }
        sessionStorage.removeItem('mg_session');
      } else {
        // ── Sesión de usuario interno ──
        const users = getUsers();
        const user = users.find(x=>x.id===sd.id && x.activo!==false);
        if(user){
          if(!Array.isArray(user.roles)||!user.roles.length){
            user.roles = user.rol ? [user.rol] : ['vendedor'];
          }
          user.rol = getPrimaryRole(user);
          currentUser = user;
          bootApp();
          return;
        }
      }
    }catch(e){}
  }

  document.getElementById('login-screen').style.display='flex';
  document.getElementById('main-app').style.display='none';
})();
// ============================================================
// BASES DE DATOS — Vendedor carga empresas para llamar
// ============================================================
function renderBasesDatos(){
  const el=document.getElementById('basesdatos-content');
  if(!el)return;
  const nombre=currentUser.nombre;
  const allEmpresas=(S.get('crm_bases_datos')||[]).filter(e=>e.vendedor===nombre);
  const busq=el.getAttribute('data-busq')||'';
  const filtro=el.getAttribute('data-filtro')||'todas';
  const orden=el.getAttribute('data-orden')||'reciente';
  let lista=[...allEmpresas];
  if(busq){
    const q=busq.toLowerCase();
    lista=lista.filter(e=>[e.empresa,e.rubro,e.contacto,e.telefono,e.email,e.ciudad,e.notas].some(v=>v&&v.toLowerCase().includes(q)));
  }
  if(filtro!=='todas')lista=lista.filter(e=>e.estado===filtro);
  // Ordenar
  if(orden==='llamadas') lista.sort((a,b)=>((b.historial||[]).length)-((a.historial||[]).length));
  else if(orden==='ultima') lista.sort((a,b)=>{
    const la=(a.historial||[]).slice(-1)[0]?.fecha||'0';
    const lb=(b.historial||[]).slice(-1)[0]?.fecha||'0';
    return lb.localeCompare(la);
  });
  else if(orden==='az') lista.sort((a,b)=>(a.empresa||'').localeCompare(b.empresa||''));
  else lista.sort((a,b)=>(b.id||0)-(a.id||0));

  const stats={total:allEmpresas.length,Pendiente:0,Contactada:0,Interesada:0,Descartada:0};
  allEmpresas.forEach(e=>{ if(stats[e.estado]!==undefined) stats[e.estado]++; });
  const totalLlamadas=allEmpresas.reduce((s,e)=>s+((e.historial||[]).length),0);

  const filtroBtn=(f,lb,cl)=>{
    const cnt=f==='todas'?stats.total:(stats[f]||0);
    const act=filtro===f;
    return`<button onclick="document.getElementById('basesdatos-content').setAttribute('data-filtro','${f}');renderBasesDatos()" style="padding:6px 12px;border-radius:8px;border:1px solid ${act?cl:'var(--border)'};background:${act?cl+'18':'transparent'};color:${act?cl:'var(--muted)'};font-size:11px;cursor:pointer;font-family:'DM Mono',monospace">${lb} <b style="color:${cl}">${cnt}</b></button>`;
  };
  const ordenBtn=(o,lb)=>{
    const act=orden===o;
    return`<button onclick="document.getElementById('basesdatos-content').setAttribute('data-orden','${o}');renderBasesDatos()" style="padding:4px 10px;border-radius:6px;border:1px solid ${act?'var(--accent)':'var(--border)'};background:${act?'rgba(212,175,55,0.1)':'transparent'};color:${act?'var(--accent)':'var(--muted)'};font-size:10px;cursor:pointer">${lb}</button>`;
  };

  el.innerHTML=`
  <div style="padding:20px 24px;max-width:1200px;margin:0 auto">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px">
      <div>
        <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800">🗄️ Base de Datos de Empresas</div>
        <div style="font-size:12px;color:var(--muted);margin-top:2px">${stats.total} empresas · ${totalLlamadas} contactos realizados</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" onclick="bdEmailMasivoFiltrado()" style="background:linear-gradient(135deg,#b8922e,#c8a84a);border:none;color:#fff">📧 Email masivo</button>
        <button class="btn btn-secondary" onclick="bdImportarArchivo()">📥 Importar archivo</button>
        <button class="btn btn-primary" onclick="bdAbrirModal()">+ Nueva Empresa</button>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px">
      <div style="background:rgba(212,175,55,0.06);border:1px solid rgba(212,175,55,0.15);border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:22px;font-weight:800;color:var(--accent)">${stats.total}</div>
        <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Total</div>
      </div>
      <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:22px;font-weight:800;color:#f59e0b">${stats.Pendiente}</div>
        <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Pendientes</div>
      </div>
      <div style="background:rgba(167,139,250,0.06);border:1px solid rgba(167,139,250,0.15);border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:22px;font-weight:800;color:#c8a84a">${stats.Contactada}</div>
        <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Contactadas</div>
      </div>
      <div style="background:rgba(200,168,74,0.06);border:1px solid rgba(200,168,74,0.15);border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:22px;font-weight:800;color:#c8a84a">${stats.Interesada}</div>
        <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Interesadas</div>
      </div>
      <div style="background:rgba(212,175,55,0.04);border:1px solid rgba(212,175,55,0.12);border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:22px;font-weight:800;color:var(--accent)">${totalLlamadas}</div>
        <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Contactos</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
      <input placeholder="🔍 Buscar..." value="${busq}" oninput="document.getElementById('basesdatos-content').setAttribute('data-busq',this.value);renderBasesDatos()" style="flex:1;min-width:180px;padding:8px 12px;font-size:12px">
      ${filtroBtn('todas','Todas','var(--accent)')}
      ${filtroBtn('Pendiente','Pendientes','#f59e0b')}
      ${filtroBtn('Contactada','Contactadas','#c8a84a')}
      ${filtroBtn('Interesada','Interesadas','#c8a84a')}
      ${filtroBtn('Descartada','Descartadas','#ef4444')}
    </div>
    <div style="display:flex;gap:6px;margin-bottom:16px;align-items:center">
      <span style="font-size:10px;color:var(--muted)">Ordenar:</span>
      ${ordenBtn('reciente','Más reciente')}
      ${ordenBtn('ultima','Último contacto')}
      ${ordenBtn('llamadas','Más llamadas')}
      ${ordenBtn('az','A-Z')}
    </div>
    ${lista.length?lista.map(e=>{
      const hist=e.historial||[];
      const nLlamadas=hist.length;
      const ultimaLlamada=hist.slice(-1)[0];
      const stColor=e.estado==='Pendiente'?'#f59e0b':e.estado==='Contactada'?'#c8a84a':e.estado==='Interesada'?'#c8a84a':'#ef4444';
      const diasSinContacto=ultimaLlamada?diffDays(ultimaLlamada.fecha):null;
      const diasLabel=diasSinContacto!==null?(diasSinContacto===0?'Hoy':diasSinContacto===1?'Ayer':diasSinContacto+' días'):'Nunca';
      const urgencia=diasSinContacto===null||diasSinContacto>7?'rgba(239,68,68,0.1)':diasSinContacto>3?'rgba(245,158,11,0.08)':'transparent';
      return`<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:10px;border-left:3px solid ${stColor}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
              <span style="font-family:'Syne',sans-serif;font-size:15px;font-weight:700">${e.empresa||'Sin nombre'}</span>
              <span style="font-size:10px;padding:2px 8px;border-radius:10px;background:${stColor}22;color:${stColor};font-weight:600">${e.estado||'Pendiente'}</span>
              ${e.servicio?`<span style="font-size:9px;padding:2px 7px;border-radius:8px;background:rgba(212,175,55,0.1);color:var(--accent)">${e.servicio}</span>`:''}
            </div>
            <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:11px;color:var(--muted)">
              ${e.contacto?`<span>👤 ${e.contacto}</span>`:''}
              ${e.telefono?`<span style="cursor:pointer" onclick="event.stopPropagation();zoiperCall('${(e.telefono||'').replace(/'/g,'')}')" title="Click para llamar con Zoiper">📞 <u>${e.telefono}</u></span>`:''}
              ${e.email?`<span>📧 ${e.email}</span>`:''}
              ${e.rubro?`<span>🏷️ ${e.rubro}</span>`:''}
              ${e.ciudad?`<span>📍 ${e.ciudad}</span>`:''}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            ${e.telefono?`<button onclick="event.stopPropagation();zoiperCall('${(e.telefono||'').replace(/'/g,'')}')" style="padding:8px 12px;border-radius:8px;background:linear-gradient(135deg,#9a7830,#c8a84a);border:none;color:#fff;cursor:pointer;font-size:12px;font-weight:700;display:flex;align-items:center;gap:4px" title="Llamar con Zoiper">📞 Llamar</button>`:''}
            <div style="text-align:center;padding:6px 12px;border-radius:8px;background:rgba(212,175,55,0.06);border:1px solid rgba(212,175,55,0.12)">
              <div style="font-size:18px;font-weight:800;color:var(--accent)">${nLlamadas}</div>
              <div style="font-size:8px;color:var(--muted);text-transform:uppercase">contactos</div>
            </div>
            <div style="text-align:center;padding:6px 12px;border-radius:8px;background:${urgencia}">
              <div style="font-size:11px;font-weight:700;color:${diasSinContacto===null||diasSinContacto>7?'var(--danger)':diasSinContacto>3?'var(--warn)':'var(--accent3)'}">${diasLabel}</div>
              <div style="font-size:8px;color:var(--muted)">últ. contacto</div>
            </div>
            <div style="display:flex;gap:4px">
              <button onclick="bdRegistrarContacto(${e.id})" style="padding:6px 10px;border-radius:8px;background:linear-gradient(135deg,var(--accent2),var(--accent));border:none;color:#fff;cursor:pointer;font-size:11px;font-weight:600" title="Registrar contacto">📞+</button>
              ${e.email?`<button onclick="emailComponer('${(e.email||'').replace(/'/g,"\\'")}',${JSON.stringify({empresa:e.empresa,contacto:e.contacto}).replace(/"/g,'&quot;')})" style="padding:6px 10px;border-radius:8px;background:linear-gradient(135deg,#b8922e,#c8a84a);border:none;color:#fff;cursor:pointer;font-size:11px;font-weight:600" title="Enviar email">📧</button>`:''}
              <button class="btn btn-secondary btn-sm" onclick="bdEditarEmpresa(${e.id})">✏️</button>
              <button class="btn btn-danger btn-sm" onclick="bdEliminarEmpresa(${e.id})">🗑</button>
            </div>
          </div>
        </div>
        ${nLlamadas>0?`<div style="margin-top:10px;border-top:1px solid var(--border);padding-top:10px">
          <div style="font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;margin-bottom:6px">Historial de contactos</div>
          <div style="display:flex;flex-direction:column;gap:4px;max-height:120px;overflow-y:auto">
            ${hist.slice().reverse().slice(0,5).map(h=>`<div style="display:flex;gap:10px;align-items:flex-start;padding:5px 8px;border-radius:6px;background:rgba(212,175,55,0.03);font-size:11px">
              <span style="color:var(--accent);font-weight:600;white-space:nowrap">${fmtD(h.fecha)}</span>
              <span style="color:${h.tipo==='Llamada'?'#c8a84a':h.tipo==='Reunión'?'#c8a84a':h.tipo==='WhatsApp'?'#22c55e':'var(--muted)'}">● ${h.tipo||'Llamada'}</span>
              <span style="color:var(--text);flex:1">${h.resultado||''}</span>
              ${h.nota?`<span style="color:var(--muted);font-style:italic;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(h.nota||'').replace(/"/g,'&quot;')}">${h.nota}</span>`:''}
            </div>`).join('')}
            ${nLlamadas>5?`<div style="font-size:10px;color:var(--muted);text-align:center;padding:4px">... y ${nLlamadas-5} contactos más</div>`:''}
          </div>
        </div>`:''}
        ${e.notas?`<div style="margin-top:8px;font-size:11px;color:var(--muted);font-style:italic">📝 ${e.notas}</div>`:''}
      </div>`;
    }).join('')
    :`<div class="empty-state"><div class="icon">🗄️</div><h3>${busq||filtro!=='todas'?'Sin resultados':'Sin empresas cargadas'}</h3><p>${busq||filtro!=='todas'?'Probá con otros filtros':'Cargá empresas para empezar a llamar'}</p></div>`}
  </div>`;
}

function bdRegistrarContacto(empId, zoiperDur){
  const empresas=S.get('crm_bases_datos')||[];
  const e=empresas.find(x=>x.id===empId);
  if(!e) return;
  const durLabel=zoiperDur?` (${Math.floor(zoiperDur/60)}m ${zoiperDur%60}s)`:'';
  const html=`
  <div class="modal-head">
    <div class="modal-title">📞 Registrar Contacto — ${e.empresa}${durLabel}</div>
    <button class="modal-close" onclick="closeModal('modal-bd-contacto')">✕</button>
  </div>
  <div class="modal-body">
    <input type="hidden" id="bdc-emp-id" value="${empId}">
    <input type="hidden" id="bdc-duracion" value="${zoiperDur||0}">
    <div class="form-row">
      <div class="form-group"><label>📅 Fecha</label><input type="date" id="bdc-fecha" value="${todayStr()}"></div>
      <div class="form-group"><label>📱 Tipo de contacto</label>
        <select id="bdc-tipo">
          <option value="Llamada">📞 Llamada</option>
          <option value="WhatsApp">💬 WhatsApp</option>
          <option value="Email">📧 Email</option>
          <option value="Reunión">🤝 Reunión</option>
          <option value="Visita">🏢 Visita</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label>📊 Resultado</label>
      <select id="bdc-resultado">
        <option value="No atendió">No atendió</option>
        <option value="Hablé con recepción">Hablé con recepción</option>
        <option value="Hablé con decisor">Hablé con decisor</option>
        <option value="Interesado - pide info">Interesado - pide info</option>
        <option value="Interesado - agendó reunión">Interesado - agendó reunión</option>
        <option value="No le interesa ahora">No le interesa ahora</option>
        <option value="No le interesa nunca">No le interesa nunca</option>
        <option value="Número equivocado">Número equivocado</option>
        <option value="Otro">Otro</option>
      </select>
    </div>
    <div class="form-group"><label>📝 Notas del contacto</label><textarea id="bdc-nota" rows="3" placeholder="¿Qué hablaron? ¿Qué quedó pendiente?"></textarea></div>
    <div class="form-row">
      <div class="form-group"><label>🔄 Actualizar estado</label>
        <select id="bdc-estado">
          <option value="">— No cambiar —</option>
          <option value="Contactada">Contactada</option>
          <option value="Interesada">Interesada</option>
          <option value="Descartada">Descartada</option>
        </select>
      </div>
      <div class="form-group"><label>📌 Acción siguiente</label>
        <select id="bdc-accion" onchange="document.getElementById('bdc-seg-fields').style.display=this.value==='seguimiento'?'block':'none';document.getElementById('bdc-venta-fields').style.display=this.value==='venta'?'block':'none';document.getElementById('bdc-entrevista-fields').style.display=this.value==='entrevista'?'block':'none'">
          <option value="">— Ninguna —</option>
          <option value="seguimiento">📅 Crear seguimiento (re-llamar)</option>
          <option value="entrevista">🎤 Agendar entrevista comercial</option>
        </select>
      </div>
    </div>
    <div id="bdc-seg-fields" style="display:none;background:rgba(212,175,55,0.05);border:1px solid rgba(212,175,55,0.15);border-radius:10px;padding:14px;margin-top:8px">
      <div style="font-size:11px;font-weight:600;color:var(--accent);margin-bottom:8px">📅 Datos del seguimiento</div>
      <div class="form-row">
        <div class="form-group"><label>Fecha de re-contacto</label><input type="date" id="bdc-seg-fecha"></div>
        <div class="form-group"><label>Prioridad</label>
          <select id="bdc-seg-prio"><option value="Media">Media</option><option value="Alta">Alta</option><option value="Baja">Baja</option></select>
        </div>
      </div>
    </div>
    <div id="bdc-venta-fields" style="display:none"></div>
    <div id="bdc-entrevista-fields" style="display:none;background:rgba(167,139,250,0.06);border:1px solid rgba(167,139,250,0.2);border-radius:10px;padding:14px;margin-top:8px">
      <div style="font-size:11px;font-weight:600;color:#a78bfa;margin-bottom:10px">🎤 Datos de la entrevista</div>
      <div style="background:rgba(167,139,250,0.08);border:1px solid rgba(167,139,250,0.2);border-radius:8px;padding:10px;font-size:11px;color:#a78bfa;margin-bottom:12px">
        📲 Se va a crear la entrevista y asignar al entrevistador seleccionado automáticamente
      </div>
      <div class="form-row">
        <div class="form-group"><label>Fecha de la entrevista</label><input type="date" id="bdc-ent-fecha"></div>
        <div class="form-group"><label>Entrevistador</label>
          <select id="bdc-ent-quien">
            ${(S.get('usuarios')||[]).filter(u=>u.roles&&(u.roles.includes('dueno')||u.roles.includes('gerente'))&&u.activo!==false).map(u=>`<option value="${u.nombre}">${u.nombre}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group"><label>Notas para el entrevistador (opcional)</label>
        <input type="text" id="bdc-ent-notas" placeholder="Ej: muy interesado, preguntó por precio, hablar de los plazos">
      </div>
      <div id="bdc-venta-cuit" style="display:none"></div>
      <div id="bdc-venta-rubro" style="display:none"></div>
      </div>
    </div>
    </div>
  </div>
  <div class="modal-footer">
    <button class="btn btn-secondary" onclick="closeModal('modal-bd-contacto')">Cancelar</button>
    <button class="btn btn-primary" onclick="bdGuardarContacto()">💾 Guardar Contacto</button>
  </div>`;
  let modal=document.getElementById('modal-bd-contacto');
  if(!modal){
    modal=document.createElement('div');
    modal.className='modal-overlay';
    modal.id='modal-bd-contacto';
    modal.innerHTML='<div class="modal modal-lg">'+html+'</div>';
    document.body.appendChild(modal);
  } else {
    modal.querySelector('.modal').innerHTML=html;
  }
  modal.classList.add('open');
}

function bdGuardarContacto(){
  const empId=Number(document.getElementById('bdc-emp-id').value);
  const items=S.get('crm_bases_datos')||[];
  const i=items.findIndex(x=>x.id===empId);
  if(i<0) return;
  const emp=items[i];
  if(!emp.historial) emp.historial=[];
  const resultado=document.getElementById('bdc-resultado').value;
  const nota=(document.getElementById('bdc-nota').value||'').trim();
  emp.historial.push({
    fecha:document.getElementById('bdc-fecha').value||todayStr(),
    tipo:document.getElementById('bdc-tipo').value,
    resultado,
    nota,
    hora:new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}),
    duracion:Number(document.getElementById('bdc-duracion')?.value)||0
  });
  const nuevoEstado=document.getElementById('bdc-estado').value;
  if(nuevoEstado) emp.estado=nuevoEstado;
  bdGuardar(items);

  // Acción siguiente
  const accion=document.getElementById('bdc-accion').value;
  if(accion==='seguimiento'){
    const fechaSeg=document.getElementById('bdc-seg-fecha').value;
    if(fechaSeg){
      const segs=S.get('crm_seguimientos');
      segs.push({
        id:S.nextId('crm_seguimientos'),
        vendedor:currentUser.nombre,
        empresa:emp.empresa,
        contacto:emp.contacto||'',
        fecha:fechaSeg,
        prioridad:document.getElementById('bdc-seg-prio').value||'Media',
        comision:0,
        notas:'Re-contacto: '+resultado+(nota?' — '+nota:''),
        hecho:false
      });
      S.set('crm_seguimientos',segs);
      toast('✅ Contacto + seguimiento creado para '+fmtD(fechaSeg));
    } else {
      toast('✅ Contacto registrado');
    }
  } else if(accion==='entrevista'){
    // Agendar entrevista — el vendedor NO registra venta, solo agenda
    const fechaEnt = document.getElementById('bdc-ent-fecha').value;
    const quienEnt = document.getElementById('bdc-ent-quien').value;
    const notasEnt = document.getElementById('bdc-ent-notas').value;
    if(!fechaEnt || !quienEnt){
      toast('⚠️ Completá la fecha y el entrevistador'); return;
    }
    // Crear entrevista en crm_entrevistas asignada al entrevistador
    const ents = S.get('crm_entrevistas')||[];
    ents.push({
      id: S.nextId('crm_entrevistas'),
      empresa: emp.empresa,
      vendedor: currentUser.nombre,
      entrevistador: quienEnt,
      fechaAgendada: fechaEnt,
      fechaRealizada: '',
      resultado: '',
      observaciones: notasEnt || nota || '',
      interesado: resultado,
      proximoPaso: '',
      fechaCreacion: todayStr(),
      estado: 'pendiente',
      feedbackVendedor: '',
      cerradoPor: '',
      comisionVendedor: false,
      auditoriaCreada: false,
    });
    S.set('crm_entrevistas', ents);
    // Registrar en logs del vendedor como empresa agendada
    const logs = S.get('crm_logs');
    const today_ = todayStr();
    let log = logs.find(l=>l.vendedor===currentUser.nombre&&l.fecha===today_);
    if(!log){log={id:S.nextId('crm_logs'),vendedor:currentUser.nombre,fecha:today_,llamadas:0,duenos:0,agendadas:0,cerradas:0,notas:'',empresasAgendadas:''};logs.push(log);}
    log.agendadas = (log.agendadas||0)+1;
    log.notas = (log.notas?log.notas+'; ':'')+'Entrevista agendada con '+quienEnt+': '+emp.empresa+' el '+fmtD(fechaEnt);
    S.set('crm_logs', logs);
    // Actualizar estado empresa
    items[i].estado = 'Interesada';
    bdGuardar(items);
    toast('🎤 Entrevista agendada con '+quienEnt+' para el '+fmtD(fechaEnt));
  } else {
    toast('✅ Contacto registrado');
  }

  closeModal('modal-bd-contacto');
  renderBasesDatos();
  try{renderCRM();}catch(e){}
}

function bdAbrirModal(editId){
  const empresas=S.get('crm_bases_datos')||[];
  const e=editId?empresas.find(x=>x.id===editId):null;
  const html=`
  <div class="modal-head">
    <div class="modal-title">${e?'✏️ Editar Empresa':'🗄️ Nueva Empresa'}</div>
    <button class="modal-close" onclick="closeModal('modal-bd-empresa')">✕</button>
  </div>
  <div class="modal-body">
    <input type="hidden" id="bd-edit-id" value="${editId||''}">
    <div class="form-row">
      <div class="form-group"><label>🏢 Empresa *</label><input id="bd-empresa" value="${e?.empresa||''}" placeholder="Nombre de la empresa" oninput="bdCheckDuplicado()"></div>
      <div class="form-group"><label>🏷️ Rubro</label><input id="bd-rubro" value="${e?.rubro||''}" placeholder="Ej: Tecnología, Salud..."></div>
    </div>
    <div id="bd-dup-warn" style="display:none;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:10px 14px;font-size:12px;color:var(--danger);margin-bottom:14px">⚠️ Esta empresa ya está cargada</div>
    <div class="form-row">
      <div class="form-group"><label>👤 Contacto</label><input id="bd-contacto" value="${e?.contacto||''}" placeholder="Nombre del contacto"></div>
      <div class="form-group"><label>📞 Teléfono</label><input id="bd-telefono" value="${e?.telefono||''}" placeholder="Teléfono"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>📧 Email</label><input id="bd-email" value="${e?.email||''}" placeholder="email@empresa.com"></div>
      <div class="form-group"><label>📍 Ciudad</label><input id="bd-ciudad" value="${e?.ciudad||''}" placeholder="Ciudad"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>📊 Estado</label>
        <select id="bd-estado">
          <option value="Pendiente" ${e?.estado==='Pendiente'||!e?'selected':''}>Pendiente</option>
          <option value="Contactada" ${e?.estado==='Contactada'?'selected':''}>Contactada</option>
          <option value="Interesada" ${e?.estado==='Interesada'?'selected':''}>Interesada</option>
          <option value="Descartada" ${e?.estado==='Descartada'?'selected':''}>Descartada</option>
        </select>
      </div>
      <div class="form-group"><label>🏷️ Servicio de Interés</label>
        <select id="bd-servicio">
          <option value="" ${!e?.servicio?'selected':''}>Sin definir</option>
          <option value="Auditoría Internacional" ${e?.servicio==='Auditoría Internacional'?'selected':''}>Auditoría Internacional</option>
          <option value="Adaptación IA BPCE" ${e?.servicio==='Adaptación IA BPCE'?'selected':''}>Adaptación IA BPCE</option>
          <option value="Implementación ISO 72001" ${e?.servicio==='Implementación ISO 72001'?'selected':''}>Implementación ISO 72001</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label>📝 Notas</label><textarea id="bd-notas" placeholder="Notas sobre la empresa...">${e?.notas||''}</textarea></div>
  </div>
  <div class="modal-footer">
    <button class="btn btn-secondary" onclick="closeModal('modal-bd-empresa')">Cancelar</button>
    <button class="btn btn-primary" onclick="bdGuardarEmpresa()">💾 Guardar</button>
  </div>`;
  let modal=document.getElementById('modal-bd-empresa');
  if(!modal){
    modal=document.createElement('div');
    modal.className='modal-overlay';
    modal.id='modal-bd-empresa';
    modal.innerHTML='<div class="modal modal-lg">'+html+'</div>';
    document.body.appendChild(modal);
  } else {
    modal.querySelector('.modal').innerHTML=html;
  }
  modal.classList.add('open');
}

function bdCheckDuplicado(){
  const nombre=currentUser.nombre;
  const val=(document.getElementById('bd-empresa')?.value||'').trim().toLowerCase();
  const editId=document.getElementById('bd-edit-id')?.value;
  const warn=document.getElementById('bd-dup-warn');
  if(!warn||!val)return warn&&(warn.style.display='none');
  const empresas=S.get('crm_bases_datos')||[];
  const dup=empresas.find(e=>(e.empresa||'').toLowerCase()===val&&(!editId||e.id!==Number(editId)));

  // También buscar en crm_seguimientos y crm_logs de TODOS los vendedores
  const ultimaAct=crmUltimaActividadEmpresa(val);
  const diasDesde=ultimaAct?Math.floor((new Date()-new Date(ultimaAct.fecha+'T12:00:00'))/(1000*60*60*24)):null;

  if(dup||ultimaAct){
    warn.style.display='block';
    let html='';
    if(dup){
      if(dup.vendedor===nombre){
        html=`<strong>⚠️ Ya tenés esta empresa en tu base de datos.</strong>`;
      } else {
        html=`<strong>⚠️ Esta empresa ya la tiene <span style="color:#f59e0b">${dup.vendedor}</span></strong> en su base (cargada el ${fmtD(dup.fechaCreacion)||'—'}).`;
      }
    }
    if(ultimaAct){
      const hace=diasDesde===0?'<span style="color:var(--danger)">hoy mismo</span>':diasDesde===1?'<span style="color:var(--danger)">ayer</span>':`hace <strong>${diasDesde} días</strong>`;
      html+=`${dup?'<br>':''}<span style="color:var(--accent)">📅 Último contacto: ${fmtD(ultimaAct.fecha)} (${hace})</span> — por <strong>${ultimaAct.vendedor}</strong> [${ultimaAct.tipo==='seguimiento'?'seguimiento':'log actividad'}${ultimaAct.detalle?': '+ultimaAct.detalle:''}]`;
    }
    warn.innerHTML=html;
    warn.style.borderColor=diasDesde!==null&&diasDesde<=7?'rgba(239,68,68,0.5)':'rgba(245,158,11,0.3)';
    warn.style.background=diasDesde!==null&&diasDesde<=7?'rgba(239,68,68,0.08)':'rgba(245,158,11,0.07)';
  } else {
    warn.style.display='none';
  }
}

function bdGuardarEmpresa(){
  const empresa=(document.getElementById('bd-empresa')?.value||'').trim();
  if(!empresa){toast('⚠️ Ingresá el nombre de la empresa');return;}
  const editId=document.getElementById('bd-edit-id')?.value;
  const items=S.get('crm_bases_datos')||[];
  const data={
    empresa,
    rubro:(document.getElementById('bd-rubro')?.value||'').trim(),
    contacto:(document.getElementById('bd-contacto')?.value||'').trim(),
    telefono:(document.getElementById('bd-telefono')?.value||'').trim(),
    email:(document.getElementById('bd-email')?.value||'').trim(),
    ciudad:(document.getElementById('bd-ciudad')?.value||'').trim(),
    estado:document.getElementById('bd-estado')?.value||'Pendiente',
    servicio:document.getElementById('bd-servicio')?.value||'',
    notas:(document.getElementById('bd-notas')?.value||'').trim(),
    vendedor:currentUser.nombre,
  };
  if(editId){
    const i=items.findIndex(x=>x.id===Number(editId));
    if(i>-1){items[i]={...items[i],...data};}
  } else {
    data.id=Date.now();
    data.fechaCreacion=todayStr();
    items.push(data);
  }
  bdGuardar(items);
  closeModal('modal-bd-empresa');
  renderBasesDatos();
  toast(editId?'✅ Empresa actualizada':'✅ Empresa agregada');
}

function bdEditarEmpresa(id){ bdAbrirModal(id); }

function bdEliminarEmpresa(id){
  if(!confirm('¿Eliminar esta empresa de tu base de datos?'))return;
  const items=(S.get('crm_bases_datos')||[]).filter(x=>x.id!==id);
  bdGuardar(items);
  renderBasesDatos();
  toast('🗑 Empresa eliminada');
}

function bdImportarArchivo(){
  const input=document.createElement('input');
  input.type='file';input.accept='*/*';
  input.onchange=async function(ev){
    const file=ev.target.files[0];if(!file)return;
    const ext=file.name.split('.').pop().toLowerCase();

    // Show processing overlay
    const ov=document.createElement('div');
    ov.className='modal-overlay';
    ov.innerHTML=`<div style="background:var(--surface);border-radius:16px;padding:40px 48px;max-width:480px;text-align:center;border:1px solid var(--border);box-shadow:0 20px 60px rgba(0,0,0,0.3)">
      <div style="font-size:36px;margin-bottom:16px" id="bd-imp-icon">📄</div>
      <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700;margin-bottom:8px" id="bd-imp-title">Procesando archivo</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:20px" id="bd-imp-sub">${file.name} (${(file.size/1024).toFixed(0)} KB)</div>
      <div style="height:3px;background:var(--border);border-radius:2px;overflow:hidden"><div id="bd-imp-bar" style="height:100%;width:10%;background:var(--accent);border-radius:2px;transition:width 0.5s"></div></div>
      <div style="font-size:11px;color:var(--muted);margin-top:12px" id="bd-imp-status">Leyendo archivo...</div>
    </div>`;
    document.body.appendChild(ov);
    const $=id=>document.getElementById(id);
    const setS=(icon,title,status,pct)=>{if(icon)$('bd-imp-icon').textContent=icon;if(title)$('bd-imp-title').textContent=title;if(status)$('bd-imp-status').textContent=status;if(pct)$('bd-imp-bar').style.width=pct+'%';};

    try{
      let textContent='';

      // ── STEP 1: Read file content based on type ──
      if(['csv','txt','tsv','json','html','htm','rtf'].includes(ext)){
        textContent=await file.text();
        setS(null,null,'Archivo leído',30);
      } else if(['xlsx','xls','ods'].includes(ext)){
        setS(null,null,'Procesando planilla...',20);
        const buf=await file.arrayBuffer();
        if(!window.XLSX){
          const sc=document.createElement('script');
          sc.src='https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
          document.head.appendChild(sc);
          await new Promise((ok,no)=>{sc.onload=ok;sc.onerror=no;});
        }
        const wb=XLSX.read(buf,{type:'array'});
        const rows=[];
        wb.SheetNames.forEach(name=>{
          const ws=wb.Sheets[name];
          rows.push(XLSX.utils.sheet_to_csv(ws,{FS:'|'}));
        });
        textContent=rows.join('\n');
        setS(null,null,'Planilla convertida',40);
      } else if(['doc','docx'].includes(ext)){
        setS(null,null,'Procesando Word...',20);
        const buf=await file.arrayBuffer();
        if(!window.mammoth){
          const sc=document.createElement('script');
          sc.src='https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
          document.head.appendChild(sc);
          await new Promise((ok,no)=>{sc.onload=ok;sc.onerror=no;});
        }
        textContent=(await mammoth.extractRawText({arrayBuffer:buf})).value;
        setS(null,null,'Documento leído',40);
      } else if(ext==='pdf'){
        setS(null,null,'Procesando PDF...',20);
        if(!window.pdfjsLib){
          const sc=document.createElement('script');
          sc.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          document.head.appendChild(sc);
          await new Promise((ok,no)=>{sc.onload=ok;sc.onerror=no;});
          pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
        const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;
        const pages=[];
        for(let p=1;p<=Math.min(pdf.numPages,30);p++){
          const tc=await(await pdf.getPage(p)).getTextContent();
          pages.push(tc.items.map(i=>i.str).join(' '));
        }
        textContent=pages.join('\n');
        setS(null,null,'PDF leído',40);
      } else {
        textContent=await file.text();
        setS(null,null,'Archivo leído',30);
      }

      if(!textContent||!textContent.trim()){ov.remove();toast('⚠️ No se pudo extraer texto del archivo');return;}

      // ── STEP 2: Smart parse — try to detect structure locally ──
      setS(null,null,'Analizando estructura...',50);
      let localResult=null;
      try{ localResult=bdSmartParse(textContent); }catch(parseErr){ alert('Error en parser: '+parseErr.message); }

      if(localResult && localResult.length>0){
        setS('✅','Importación exitosa',localResult.length+' empresas detectadas',100);
        let r={added:0,dups:0};
        try{ r=bdInsertItems(localResult); }catch(insErr){ console.error('Insert error:',insErr); }
        trackActivity('bd:importar:'+r.added);
        setTimeout(()=>{ov.remove();renderBasesDatos();toast('📥 '+r.added+' empresas importadas'+(r.dups?' · '+r.dups+' duplicadas':''));},600);
        return;
      }

      // ── STEP 3: AI fallback for unstructured or unrecognizable content ──
      if(!ANTHROPIC_API_KEY){
        ov.remove();
        toast('⚠️ No se pudo parsear automáticamente. Configurá la API key en Admin para usar IA.');
        return;
      }
      setS('🤖','Analizando con IA','Extrayendo datos con inteligencia artificial...',60);
      const truncated=textContent.length>12000?textContent.substring(0,12000)+'...[truncado]':textContent;
      const resp=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{'Content-Type':'application/json','anthropic-dangerous-direct-browser-access':'true'},
        body:JSON.stringify({
          model:'claude-sonnet-4-5-20250929',max_tokens:4000,
          system:'Sos un extractor de datos. Tu tarea: del contenido dado, extraer TODAS las empresas/negocios/contactos. Respond SOLO con JSON array. Campos: empresa, contacto, telefono, email, rubro, ciudad, notas (string vacio si no hay dato). NO inventes. Si no hay empresas devuelve [].',
          messages:[{role:'user',content:'Archivo: '+file.name+'\n\n'+truncated}]
        })
      });
      if(!resp.ok) throw new Error('API: '+resp.status);
      setS(null,null,'Procesando respuesta IA...',85);
      const aiData=await resp.json();
      const aiText=(aiData.content||[]).map(c=>c.text||'').join('');
      let parsed=[];
      try{parsed=JSON.parse(aiText.replace(/```json\s*/g,'').replace(/```\s*/g,'').trim());}
      catch(e){const m=aiText.match(/\[[\s\S]*\]/);if(m)parsed=JSON.parse(m[0]);}
      if(!Array.isArray(parsed)||!parsed.length){
        setS('🤷','Sin resultados','No se encontraron empresas',100);
        setTimeout(()=>ov.remove(),2000);return;
      }
      const norm=parsed.map(r=>({
        empresa:String(r.empresa||r.nombre||r.company||'').trim(),
        contacto:String(r.contacto||r.contact||'').trim(),
        telefono:String(r.telefono||r.tel||r.phone||'').trim(),
        email:String(r.email||r.mail||'').trim(),
        rubro:String(r.rubro||r.sector||'').trim(),
        ciudad:String(r.ciudad||r.city||'').trim(),
        notas:String(r.notas||r.notes||'').trim()
      })).filter(r=>r.empresa);
      setS('✅','IA completó análisis',norm.length+' empresas',100);
      const r2=bdInsertItems(norm);
      setTimeout(()=>{ov.remove();renderBasesDatos();toast('📥 '+r2.added+' empresas importadas'+(r2.dups?' · '+r2.dups+' duplicadas':''));},800);
    }catch(err){
      console.error('Import error:',err);ov.remove();
      toast('❌ Error: '+(err.message||'').substring(0,80));
    }
  };
  input.click();
}

// Email masivo: enviar a todas las empresas filtradas actualmente
function bdEmailMasivoFiltrado(){
  const nombre=currentUser.nombre;
  const allEmps=(S.get('crm_bases_datos')||[]).filter(e=>e.vendedor===nombre&&e.email);
  if(!allEmps.length){toast('⚠️ No hay empresas con email en tu base');return;}
  const el=document.getElementById('basesdatos-content');
  const filtro=el?.getAttribute('data-filtro')||'todas';
  const busq=el?.getAttribute('data-busq')||'';
  let lista=[...allEmps];
  if(filtro!=='todas')lista=lista.filter(e=>e.estado===filtro);
  if(busq){const q=busq.toLowerCase();lista=lista.filter(e=>[e.empresa,e.rubro,e.contacto,e.email,e.ciudad].some(v=>v&&v.toLowerCase().includes(q)));}
  if(!lista.length){toast('⚠️ No hay empresas con email en el filtro actual');return;}
  emailMasivo(lista.map(e=>e.id));
}

// ═══ SMART PARSER — works with ANY structured data ═══
// Helper: guardar bases de datos de forma indestructible
function bdGuardar(items){
  trackActivity('bd:guardar');
  try{localStorage.setItem('METO_crm_bases_datos',JSON.stringify(items));}catch(e){}
  try{S.set('crm_bases_datos',items);}catch(e){}
}
function bdSmartParse(text){
  // Use PapaParse if available, otherwise load it
  if(window.Papa){
    return _bdParseWithPapa(text);
  }
  // Fallback: simple but robust parsing
  return _bdParseSimple(text);
}

function _bdParseWithPapa(text){
  const result=Papa.parse(text,{header:false,skipEmptyLines:true,dynamicTyping:false});
  if(!result.data||result.data.length<2)return null;
  return _bdDetectColumns(result.data);
}

function _bdParseSimple(text){
  const lines=text.split('\n').map(l=>l.trim().replace(/\r/g,'')).filter(Boolean);
  if(lines.length<2)return null;
  // Detect separator
  const seps=[',',';','\t','|'];
  let bestSep=',',bestScore=0;
  for(const s of seps){
    const counts=lines.slice(0,5).map(l=>l.split(s).length);
    const avg=counts.reduce((a,b)=>a+b,0)/counts.length;
    if(avg>bestScore&&avg>1){bestScore=avg;bestSep=s;}
  }
  // Simple split (good enough for most files)
  const rows=lines.map(l=>l.split(bestSep).map(c=>c.trim().replace(/^"+|"+$/g,'')));
  return _bdDetectColumns(rows);
}

function _bdDetectColumns(rows){
  if(!rows||rows.length<2)return null;
  const numCols=Math.max(...rows.slice(0,10).map(r=>r.length));
  
  // Score columns by DATA content (ignore headers)
  const sample=rows.slice(1,Math.min(20,rows.length));
  const scores={};
  for(let c=0;c<numCols;c++){
    const vals=sample.map(r=>(r[c]||'').trim()).filter(v=>v&&v!=='·'&&v!=='-');
    if(!vals.length){scores[c]={url:0,phone:0,email:0,empresa:0,rubro:0,addr:0};continue;}
    const n=vals.length;
    scores[c]={
      url:vals.filter(v=>/^https?:\/\//.test(v)).length/n,
      phone:vals.filter(v=>/\+?\d[\d\s\-()]{7,}/.test(v)&&!/^https?/.test(v)).length/n,
      email:vals.filter(v=>/@/.test(v)&&!v.startsWith('http')).length/n,
      rating:vals.filter(v=>/^\d[.,]\d$/.test(v)||/^[1-5]$/.test(v)).length/n,
      rubro:vals.filter(v=>/tienda|fábrica|fabrica|taller|restaurante|consultora|empresa|servicio|comercio|salon|hotel|agencia/i.test(v)).length/n,
      addr:vals.filter(v=>/\d/.test(v)&&v.length>8&&v.length<100&&!/^https?/.test(v)&&!/^\+?\d[\d\s\-()]+$/.test(v)).length/n,
      empresa:vals.filter(v=>v.length>=3&&v.length<=100&&!/^https?/.test(v)&&!/^\+?\d[\d\s\-()]+$/.test(v)&&!/^[\d.,\-]+$/.test(v)&&!/@/.test(v)).length/n,
    };
  }

  // Assign columns greedily
  const used=new Set();
  const pick=(type,min)=>{let best=-1,bestV=0;for(let c=0;c<numCols;c++){if(used.has(c))continue;if((scores[c]?.[type]||0)>bestV){bestV=scores[c][type];best=c;}}if(best>=0&&bestV>=min){used.add(best);return best;}return -1;};
  
  const iUrl1=pick('url',0.5);
  const iUrl2=pick('url',0.5);
  const iEmail=pick('email',0.3);
  const iPhone=pick('phone',0.4);
  const iRating=pick('rating',0.3);
  const iRubro=pick('rubro',0.3);
  const iAddr=pick('addr',0.15);
  // Empresa = best remaining empresa-like column
  const iEmp=pick('empresa',0.3);
  
  if(iEmp<0)return null;

  // Detect if row 0 is headers or data
  const r0=(rows[0][iEmp]||'').trim();
  const isHeader=r0.length<30&&!/^https?:/.test(rows[0][0]||'')&&rows[0].some(h=>/^[a-z\s]{2,}$/i.test((h||'').trim()));
  const start=isHeader?1:0;

  const results=[];
  for(let i=start;i<rows.length;i++){
    const r=rows[i];
    const emp=(r[iEmp]||'').trim();
    if(!emp||emp.length<2||/^[·\-\s]+$/.test(emp))continue;
    results.push({
      empresa:emp,
      contacto:'',
      telefono:iPhone>=0?(r[iPhone]||'').trim():'',
      email:iEmail>=0?(r[iEmail]||'').trim():'',
      rubro:iRubro>=0?(r[iRubro]||'').trim().replace(/^·\s*/,''):'',
      ciudad:iAddr>=0?(r[iAddr]||'').trim().replace(/^·\s*/,''):'',
      notas:''
    });
  }
  return results.length>0?results:null;
}

// ═══ INSERT ITEMS into crm_bases_datos ═══
function bdInsertItems(items){
  // Leer existentes de TODAS las fuentes posibles
  let existing=[];
  try{
    const fromCache=S.get('crm_bases_datos');
    if(fromCache&&fromCache.length) existing=fromCache;
  }catch(e){}
  if(!existing.length){
    try{
      const raw=localStorage.getItem('METO_crm_bases_datos');
      if(raw) existing=JSON.parse(raw)||[];
    }catch(e){}
  }
  const nombre=currentUser?.nombre||'Vendedor';
  let added=0,dups=0;
  items.forEach((r,i)=>{
    const emp=(r.empresa||'').trim();
    if(!emp)return;
    if(existing.find(x=>(x.empresa||'').toLowerCase()===emp.toLowerCase())){dups++;return;}
    existing.push({
      id:Date.now()+i+Math.floor(Math.random()*1000),
      empresa:emp,
      rubro:r.rubro||'',
      contacto:r.contacto||'',
      telefono:r.telefono||'',
      email:r.email||'',
      ciudad:r.ciudad||'',
      notas:r.notas||'',
      estado:'Pendiente',
      servicio:'',
      vendedor:nombre,
      fechaCreacion:todayStr(),
    });
    added++;
  });
  bdGuardar(existing);
  return {added,dups};
}

// ============================================================
// OBJETIVOS MENSUALES DEL DUEÑO (ventas, facturación, cobros)
// ============================================================
function getObjDueno(){
  return S.get('crm_obj_dueno')||[];
}
function setObjDueno(items){
  S.set('crm_obj_dueno',items);
}

function renderObjDuenoDashboard(){
  const ym=todayStr().substring(0,7);
  const MES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mesNom=MES[parseInt(ym.split('-')[1])-1]+' '+ym.split('-')[0];
  let obj=getObjDueno().find(x=>x.ym===ym)||null;
  const auds=S.get('auditorias');
  const cobros=S.get('cobros');
  const vendedores=S.get('vendedores')||[];

  // Si no hay obj del dueño, autocalcular desde objetivos de vendedores
  if(!obj){
    const objVends=S.get('crm_objetivos').filter(x=>x.ym===ym);
    if(objVends.length>0){
      const totalCierres=objVends.reduce((s,o)=>s+(Number(o.cerradas)||0),0);
      if(totalCierres>0){
        obj={ym,auditorias:totalCierres,ia:0,implementaciones:0,facturacion:0,cobros:0,_auto:true};
      }
    }
  }

  // Reales del mes
  const audsDelMes=auds.filter(a=>(a.fInicio||'').startsWith(ym));
  const rAudit=audsDelMes.filter(a=>a.tipo==='Auditoría Internacional').length;
  const rIA=audsDelMes.filter(a=>a.tipo==='Adaptación IA BPCE').length;
  const rImpl=audsDelMes.filter(a=>a.tipo==='Implementación ISO 72001').length;
  
  // También contar cierres de vendedores del mes
  const logsDelMes=S.get('crm_logs').filter(l=>(l.fecha||'').startsWith(ym));
  const cierresVend=logsDelMes.reduce((s,l)=>s+(Number(l.cerradas)||0),0);

  // Facturación
  const audsComp=auds.filter(a=>['Completada','Informe Entregado'].includes(a.estado)&&((a.fInforme||a.fInicio||'').startsWith(ym)));
  const rFacturacion=audsComp.reduce((s,a)=>s+(Number(a.monto)||0),0);

  // Cobros
  let rCobros=0;
  cobros.forEach(c=>{(c.cuotas||[]).forEach(q=>{if(q.estado==='Pagado'&&(q.fechaPago||'').startsWith(ym))rCobros+=(Number(q.monto)||0);});});

  const el=document.getElementById('d-obj-dueno');
  if(!el)return;

  if(!obj){
    el.innerHTML=`
    <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.2);border-radius:14px;padding:20px;text-align:center">
      <div style="font-size:32px;margin-bottom:8px">🎯</div>
      <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--warn)">Sin objetivos para ${mesNom}</div>
      <div style="font-size:12px;color:var(--muted);margin-top:4px;margin-bottom:14px">Configurá objetivos por vendedor o definí metas globales</div>
      <div style="display:flex;gap:8px;justify-content:center">
        <button class="btn btn-primary" onclick="abrirObjDueno()">🎯 Objetivos Globales</button>
      </div>
    </div>`;
    return;
  }

  const metrics=[
    {ic:'🔍',lb:'Auditorías',real:rAudit,meta:obj.auditorias||0,cl:'#f59e0b'},
    {ic:'🤖',lb:'Adecuaciones IA',real:rIA,meta:obj.ia||0,cl:'#c8a84a'},
    {ic:'⚙️',lb:'Implementaciones',real:rImpl,meta:obj.implementaciones||0,cl:'var(--accent3)'},
    {ic:'💰',lb:'Facturación',real:rFacturacion,meta:obj.facturacion||0,cl:'var(--accent)',isMoney:true},
    {ic:'💳',lb:'Cobros',real:rCobros,meta:obj.cobros||0,cl:'#c8a84a',isMoney:true},
  ].filter(m=>m.meta>0);
  
  // Si es autocalculado desde vendedores, agregar métrica de cierres
  if(obj._auto){
    const objVends=S.get('crm_objetivos').filter(x=>x.ym===ym);
    const totalObjCierres=objVends.reduce((s,o)=>s+(Number(o.cerradas)||0),0);
    metrics.unshift({ic:'🏆',lb:'Cierres Ventas',real:cierresVend,meta:totalObjCierres,cl:'var(--accent3)'});
    // Agregar llamadas y agendadas
    const totalObjLlam=objVends.reduce((s,o)=>s+(Number(o.llamadas)||0),0);
    const totalObjAgend=objVends.reduce((s,o)=>s+(Number(o.agendadas)||0),0);
    const totalRealLlam=logsDelMes.reduce((s,l)=>s+(Number(l.llamadas)||0),0);
    const totalRealAgend=logsDelMes.reduce((s,l)=>s+(Number(l.agendadas)||0),0);
    if(totalObjLlam>0) metrics.splice(1,0,{ic:'📞',lb:'Llamadas',real:totalRealLlam,meta:totalObjLlam,cl:'var(--accent)'});
    if(totalObjAgend>0) metrics.splice(2,0,{ic:'📅',lb:'Agendadas',real:totalRealAgend,meta:totalObjAgend,cl:'#c8a84a'});
  }

  if(!metrics.length){
    el.innerHTML=`<div style="text-align:center;padding:16px;color:var(--muted);font-size:12px">Objetivos sin metas definidas. <button class="btn btn-secondary btn-sm" onclick="abrirObjDueno()">Editar</button></div>`;
    return;
  }

  const pcts=metrics.map(m=>m.meta>0?Math.min(Math.round(m.real/m.meta*100),999):0);
  const avgPct=pcts.length?Math.round(pcts.reduce((s,x)=>s+x,0)/pcts.length):0;
  const avgColor=avgPct>=100?'var(--accent3)':avgPct>=70?'var(--warn)':'var(--danger)';

  el.innerHTML=`
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
    <div style="display:flex;align-items:center;gap:12px">
      <div style="font-family:'Syne',sans-serif;font-size:36px;font-weight:800;color:${avgColor}">${avgPct}%</div>
      <div>
        <div style="font-size:12px;color:var(--muted)">Cumplimiento global${obj._auto?' <span style=\"font-size:9px;color:var(--accent);\">(auto desde vendedores)</span>':''}</div>
        <div style="font-size:11px;color:${avgColor}">${avgPct>=100?'✅ ¡Objetivo cumplido!':avgPct>=70?'📈 Buen ritmo':'🎯 A mejorar'}</div>
      </div>
    </div>
    <button class="btn btn-secondary btn-sm" onclick="abrirObjDueno()">✏️ Editar Objetivos</button>
  </div>
  <div style="height:8px;background:var(--surface2);border-radius:4px;overflow:hidden;margin-bottom:18px">
    <div style="height:100%;width:${Math.min(avgPct,100)}%;background:${avgPct>=100?'linear-gradient(90deg,var(--accent3),#34d399)':avgPct>=70?'linear-gradient(90deg,var(--warn),#fbbf24)':'linear-gradient(90deg,var(--danger),#f87171)'};border-radius:4px;transition:width 0.6s"></div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(${Math.min(metrics.length,5)},1fr);gap:10px">
    ${metrics.map(m=>{
      const pct=m.meta>0?Math.min(Math.round(m.real/m.meta*100),999):0;
      const pc=pct>=100?'var(--accent3)':pct>=70?m.cl:'var(--danger)';
      const valR=m.isMoney?fmt(m.real):m.real;
      const valM=m.isMoney?fmt(m.meta):m.meta;
      return`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:14px;position:relative;overflow:hidden">
        <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${m.cl}"></div>
        <div style="font-size:18px;margin-bottom:6px">${m.ic}</div>
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">${m.lb}</div>
        <div style="font-family:'Syne',sans-serif;font-size:${m.isMoney?'18':'24'}px;font-weight:800;color:${pc};line-height:1">${valR}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:2px">meta: ${valM}</div>
        <div style="height:5px;background:var(--surface);border-radius:3px;overflow:hidden;margin-top:8px">
          <div style="height:100%;width:${Math.min(pct,100)}%;background:${pc};border-radius:3px;transition:width 0.6s"></div>
        </div>
        <div style="text-align:right;font-size:11px;font-weight:700;color:${pc};margin-top:4px">${pct}%</div>
      </div>`;
    }).join('')}
  </div>`;
}

// ── PROYECCIÓN FINANCIERA POR OBJETIVOS DE VENDEDORES ──
function renderProyeccionFinanciera(){
  const el=document.getElementById('d-proy-financiera');if(!el)return;
  const hoy=new Date();
  const ym=todayStr().substring(0,7);
  const MES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const vendedores=S.get('vendedores').filter(v=>v.estado!=='Inactivo');
  const objetivos=S.get('crm_objetivos');
  const PRECIO_USD=2000;

  // Obtener tipo de cambio guardado o default
  const tcGuardado=Number(localStorage.getItem('METO_tc_oficial'))||0;
  const TC=tcGuardado||1200; // default si no hay

  // Calcular cierres objetivo por vendedor para este mes y el siguiente
  const mesActual=ym;
  const dSig=new Date(hoy.getFullYear(),hoy.getMonth()+1,1);
  const mesSiguiente=dSig.getFullYear()+'-'+String(dSig.getMonth()+1).padStart(2,'0');
  const dAnt=new Date(hoy.getFullYear(),hoy.getMonth()-1,1);
  const mesAnterior=dAnt.getFullYear()+'-'+String(dAnt.getMonth()+1).padStart(2,'0');

  // Objetivos de cierres por mes
  let cierresActual=0, cierresSiguiente=0, cierresAnterior=0;
  const detalleVend=[];

  vendedores.forEach(v=>{
    const objAct=objetivos.find(x=>String(x.vendedorId)===String(v.id)&&x.ym===mesActual);
    const objSig=objetivos.find(x=>String(x.vendedorId)===String(v.id)&&x.ym===mesSiguiente);
    const objAnt=objetivos.find(x=>String(x.vendedorId)===String(v.id)&&x.ym===mesAnterior);
    const ca=Number(objAct?.cerradas)||0;
    const cs=Number(objSig?.cerradas)||0;
    const can=Number(objAnt?.cerradas)||0;
    cierresActual+=ca;
    cierresSiguiente+=cs;
    cierresAnterior+=can;
    if(ca>0) detalleVend.push({nombre:v.nombre,cierres:ca});
  });

  // Si no hay objetivos cargados, no mostrar
  if(cierresActual===0&&cierresAnterior===0&&cierresSiguiente===0){
    el.innerHTML='';
    return;
  }

  // LÓGICA DE FACTURACIÓN:
  // Cada cierre = USD 2000 × TC = valor total en ARS
  // Auditoría Internacional: 50% se cobra en el mes del cierre, 50% al mes siguiente
  // 
  // Facturación MES ACTUAL = 
  //   50% de los cierres del MES ACTUAL (primera cuota) +
  //   50% de los cierres del MES ANTERIOR (segunda cuota que viene del mes pasado)
  //
  // Facturación MES SIGUIENTE =
  //   50% de los cierres del MES SIGUIENTE (primera cuota) +
  //   50% de los cierres del MES ACTUAL (segunda cuota)

  const valorPorCierre=PRECIO_USD*TC;
  const cuota=valorPorCierre/2;

  const facActual=(cierresActual*cuota)+(cierresAnterior*cuota);
  const facSiguiente=(cierresSiguiente*cuota)+(cierresActual*cuota);

  // Desglose mes actual
  const primeraCuotaAct=cierresActual*cuota;   // 50% de ventas nuevas este mes
  const segundaCuotaAct=cierresAnterior*cuota;  // 50% restante del mes anterior

  const mesActNom=MES[hoy.getMonth()];
  const mesSigNom=MES[dSig.getMonth()];
  const mesAntNom=MES[dAnt.getMonth()];

  el.innerHTML=`
  <div style="background:linear-gradient(135deg,rgba(212,175,55,0.06),rgba(200,168,74,0.04));border:1px solid rgba(212,175,55,0.15);border-radius:14px;padding:20px 22px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-size:22px">📊</div>
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:1px">Proyección de Facturación</div>
          <div style="font-size:10px;color:var(--muted)">Basada en objetivos de cierres × USD ${PRECIO_USD.toLocaleString()} × TC $${TC.toLocaleString()}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <span style="font-size:10px;color:var(--muted)">TC Oficial:</span>
        <input id="proy-tc" type="number" value="${TC}" style="width:80px;padding:4px 8px;font-size:12px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:'DM Mono',monospace" onchange="localStorage.setItem('METO_tc_oficial',this.value);renderProyeccionFinanciera()">
      </div>
    </div>

    <!-- Proyección 2 meses -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
      <!-- MES ACTUAL -->
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;position:relative;overflow:hidden">
        <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--accent),var(--accent3))"></div>
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">📅 ${mesActNom} (actual)</div>
        <div style="font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:var(--accent3)">${fmt(facActual)}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:8px;display:flex;flex-direction:column;gap:3px">
          <div style="display:flex;justify-content:space-between"><span>1° cuota × ${cierresActual} cierres</span><span style="font-weight:600;color:var(--accent)">${fmt(primeraCuotaAct)}</span></div>
          <div style="display:flex;justify-content:space-between"><span>2° cuota × ${cierresAnterior} de ${mesAntNom}</span><span style="font-weight:600;color:var(--accent3)">${fmt(segundaCuotaAct)}</span></div>
        </div>
        <div style="font-size:10px;color:var(--muted);margin-top:6px;padding-top:6px;border-top:1px solid var(--border)">= ${cierresActual+cierresAnterior} cuotas a cobrar</div>
      </div>

      <!-- MES SIGUIENTE -->
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;position:relative;overflow:hidden;opacity:0.85">
        <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--accent2),var(--accent))"></div>
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">📅 ${mesSigNom} (próximo)</div>
        <div style="font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:#c8a84a">${fmt(facSiguiente)}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:8px;display:flex;flex-direction:column;gap:3px">
          <div style="display:flex;justify-content:space-between"><span>1° cuota × ${cierresSiguiente} cierres</span><span style="font-weight:600;color:#c8a84a">${fmt(cierresSiguiente*cuota)}</span></div>
          <div style="display:flex;justify-content:space-between"><span>2° cuota × ${cierresActual} de ${mesActNom}</span><span style="font-weight:600;color:var(--accent)">${fmt(cierresActual*cuota)}</span></div>
        </div>
        <div style="font-size:10px;color:var(--muted);margin-top:6px;padding-top:6px;border-top:1px solid var(--border)">= ${cierresSiguiente+cierresActual} cuotas a cobrar</div>
      </div>
    </div>

    <!-- Detalle por vendedor -->
    ${detalleVend.length?`
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 14px">
      <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Desglose ${mesActNom} por vendedor</div>
      ${detalleVend.sort((a,b)=>b.cierres-a.cierres).map(v=>{
        const facV=v.cierres*cuota;
        return`<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,var(--accent2),var(--accent));display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff">${v.nombre.substring(0,2).toUpperCase()}</div>
            <span style="font-size:12px;font-weight:600">${v.nombre}</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:11px;color:var(--muted)">${v.cierres} cierre${v.cierres>1?'s':''}</span>
            <span style="font-family:'DM Mono',monospace;font-size:12px;font-weight:700;color:var(--accent)">${fmt(facV)}</span>
          </div>
        </div>`;
      }).join('')}
      <div style="display:flex;justify-content:space-between;padding:8px 0 0 0;margin-top:4px;font-weight:700;font-size:12px">
        <span>Total 1° cuota ${mesActNom}</span>
        <span style="color:var(--accent);font-family:'DM Mono',monospace">${fmt(primeraCuotaAct)}</span>
      </div>
    </div>`:''}

    <div style="font-size:10px;color:var(--muted);margin-top:10px;text-align:center;font-style:italic">
      💡 Auditoría Internacional: USD ${PRECIO_USD.toLocaleString()} en 2 pagos iguales — 50% al cierre, 50% al mes siguiente
    </div>
  </div>`;
}

function abrirObjDueno(){
  const ym=todayStr().substring(0,7);
  const obj=getObjDueno().find(x=>x.ym===ym)||{};
  const html=`
  <div class="modal-head">
    <div class="modal-title">🎯 Objetivos Mensuales del Negocio</div>
    <button class="modal-close" onclick="closeModal('modal-obj-dueno')">✕</button>
  </div>
  <div class="modal-body">
    <div class="form-group"><label>📅 Mes</label><input id="od-mes" type="month" value="${ym}"></div>
    <div class="form-section">📦 Objetivos de Ventas (cantidad de servicios)</div>
    <div class="form-row-3">
      <div class="form-group"><label>🔍 Auditorías Internacionales</label><input id="od-auds" type="number" min="0" placeholder="0" value="${obj.auditorias||''}"></div>
      <div class="form-group"><label>🤖 Adecuaciones IA BPCE</label><input id="od-ia" type="number" min="0" placeholder="0" value="${obj.ia||''}"></div>
      <div class="form-group"><label>⚙️ Implementaciones ISO 72001</label><input id="od-impl" type="number" min="0" placeholder="0" value="${obj.implementaciones||''}"></div>
    </div>
    <div class="form-section">💰 Objetivos Financieros (montos en $)</div>
    <div class="form-row">
      <div class="form-group"><label>💰 Facturación del mes</label><input id="od-fact" type="number" min="0" placeholder="0" value="${obj.facturacion||''}"></div>
      <div class="form-group"><label>💳 Cobros del mes</label><input id="od-cobros" type="number" min="0" placeholder="0" value="${obj.cobros||''}"></div>
    </div>
  </div>
  <div class="modal-footer">
    <button class="btn btn-danger btn-sm" onclick="eliminarObjDueno()" style="margin-right:auto">🗑 Eliminar</button>
    <button class="btn btn-secondary" onclick="closeModal('modal-obj-dueno')">Cancelar</button>
    <button class="btn btn-primary" onclick="guardarObjDueno()">💾 Guardar</button>
  </div>`;
  let modal=document.getElementById('modal-obj-dueno');
  if(!modal){
    modal=document.createElement('div');
    modal.className='modal-overlay';
    modal.id='modal-obj-dueno';
    modal.innerHTML='<div class="modal modal-lg">'+html+'</div>';
    document.body.appendChild(modal);
  } else {
    modal.querySelector('.modal').innerHTML=html;
  }
  modal.classList.add('open');
  // Listener para cambio de mes
  document.getElementById('od-mes').addEventListener('change',function(){
    const ym2=this.value;
    const o2=getObjDueno().find(x=>x.ym===ym2)||{};
    document.getElementById('od-auds').value=o2.auditorias||'';
    document.getElementById('od-ia').value=o2.ia||'';
    document.getElementById('od-impl').value=o2.implementaciones||'';
    document.getElementById('od-fact').value=o2.facturacion||'';
    document.getElementById('od-cobros').value=o2.cobros||'';
  });
}

function guardarObjDueno(){
  const ym=document.getElementById('od-mes')?.value;
  if(!ym){toast('⚠️ Seleccioná un mes');return;}
  const items=getObjDueno();
  const i=items.findIndex(x=>x.ym===ym);
  const data={
    id: i>-1 ? items[i].id : S.nextId('crm_obj_dueno'),
    ym,
    auditorias:Number(document.getElementById('od-auds')?.value)||0,
    ia:Number(document.getElementById('od-ia')?.value)||0,
    implementaciones:Number(document.getElementById('od-impl')?.value)||0,
    facturacion:Number(document.getElementById('od-fact')?.value)||0,
    cobros:Number(document.getElementById('od-cobros')?.value)||0,
  };
  if(i>-1)items[i]=data;else items.push(data);
  setObjDueno(items);
  closeModal('modal-obj-dueno');
  renderDashboard();
  toast('✅ Objetivos del negocio guardados');
}

function eliminarObjDueno(){
  const ym=document.getElementById('od-mes')?.value;
  if(!ym)return;
  if(!confirm(`¿Eliminar objetivos de ${ym}?`))return;
  setObjDueno(getObjDueno().filter(x=>x.ym!==ym));
  closeModal('modal-obj-dueno');
  renderDashboard();
  toast('🗑 Objetivos eliminados');
}

// =====================================================
// =====================================================
// MÓDULO ADMINISTRACIÓN - Navegación
// =====================================================
let _inAdminModule=false;

function enterAdminModule(){
  _inAdminModule=true;
  document.getElementById('nav-main').style.display='none';
  document.getElementById('nav-admin').style.display='';
  showAdminPage('admin');
}

function exitAdminModule(){
  _inAdminModule=false;
  document.getElementById('nav-admin').style.display='none';
  document.getElementById('nav-main').style.display='';
  showPage('dashboard');
  applyRoleNav();
}

function showAdminPage(name){
  // Use the normal showPage but keep admin nav active
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+name)?.classList.add('active');
  document.getElementById('pageTitle').textContent=PAGE_TITLES[name]||name;
  renderTopbar(name);
  // Highlight active nav in admin sidebar
  document.querySelectorAll('#nav-admin .nav-item').forEach(el=>{
    el.classList.toggle('active',el.getAttribute('onclick')?.includes("'"+name+"'"));
  });
  const fn={admin:renderAdmin,cobros:renderCobros,gastos:renderGastos,auditores:renderAuditores,clientes:renderClientes,cotizaciones:renderCotizaciones,impuestos:renderImpuestos,reparto:renderReparto,ahorro:renderAhorro,sueldos:renderSueldos};
  fn[name]?.();
}

function impDetalle(tipo){
  const impuestos=S.get('impuestos')||[];const today_=todayStr();
  let titulo='',items=[];
  if(tipo==='total'){titulo='🏦 Todos los Impuestos ('+impuestos.length+')';items=impuestos;}
  else if(tipo==='pagados'){titulo='✅ Impuestos Pagados';items=impuestos.filter(i=>i.estado==='Pagado');}
  else if(tipo==='pendientes'){titulo='⏳ Impuestos Pendientes';items=impuestos.filter(i=>i.estado!=='Pagado');}
  else if(tipo==='vencidos'){titulo='🔴 Impuestos Vencidos';items=impuestos.filter(i=>i.estado!=='Pagado'&&i.vencimiento&&i.vencimiento<today_);}
  const total=items.reduce((s,i)=>s+(Number(i.monto)||0),0);
  // Group by tipo
  const porTipo={};items.forEach(i=>{const t=i.tipo||'Otro';porTipo[t]=(porTipo[t]||0)+(Number(i.monto)||0);});
  const body=`<div style="margin-bottom:14px;font-size:13px">Total: <strong style="color:var(--danger)">${fmt(total)}</strong> en <strong>${items.length}</strong> registros</div>
  <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">${Object.entries(porTipo).sort((a,b)=>b[1]-a[1]).map(([t,m])=>`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 14px"><strong>${t}</strong><br><span style="color:var(--danger);font-weight:700">${fmt(m)}</span></div>`).join('')}</div>
  ${items.length?`<div class="table-wrap"><table><thead><tr><th>Concepto</th><th>Tipo</th><th>Período</th><th>Vencimiento</th><th>Estado</th><th style="text-align:right">Monto</th></tr></thead><tbody>
  ${items.sort((a,b)=>(b.vencimiento||'').localeCompare(a.vencimiento||'')).map(i=>{const venc=i.estado!=='Pagado'&&i.vencimiento&&i.vencimiento<today_;return`<tr${venc?' style="background:rgba(239,68,68,0.04)"':''}>
    <td style="font-weight:600">${i.concepto||'—'}</td><td style="font-size:12px">${i.tipo||'—'}</td><td style="font-size:12px;color:var(--muted)">${i.periodo||'—'}</td>
    <td style="font-size:12px;color:${venc?'var(--danger)':'var(--muted)'}">${i.vencimiento?fmtD(i.vencimiento):'—'}${venc?' ⚠️':''}</td>
    <td><span class="badge badge-${i.estado==='Pagado'?'success':'danger'}">${i.estado||'Pendiente'}</span></td>
    <td style="text-align:right;font-weight:700;color:var(--danger)">${fmt(i.monto)}</td></tr>`;}).join('')}</tbody></table></div>`:'<div style="text-align:center;padding:24px;color:var(--muted)">Sin registros</div>'}`;
  let m=document.getElementById('modal-admin-detalle');
  if(!m){m=document.createElement('div');m.className='modal-overlay';m.id='modal-admin-detalle';m.innerHTML='<div class="modal" style="width:900px;max-width:95vw;max-height:90vh;display:flex;flex-direction:column"></div>';document.body.appendChild(m);}
  m.querySelector('.modal').innerHTML=`<div class="modal-head"><div class="modal-title">${titulo}</div><button class="modal-close" onclick="closeModal('modal-admin-detalle')">✕</button></div><div class="modal-body" style="overflow-y:auto;flex:1">${body}</div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal('modal-admin-detalle')">Cerrar</button></div>`;
  m.classList.add('open');
}

// IMPUESTOS
function renderImpuestos(){
  const el=document.getElementById('impuestos-content');if(!el)return;
  const impuestos=S.get('impuestos')||[];
  const today_=todayStr();
  const totalPagado=impuestos.filter(i=>i.estado==='Pagado').reduce((s,i)=>s+(Number(i.monto)||0),0);
  const totalPendiente=impuestos.filter(i=>i.estado!=='Pagado').reduce((s,i)=>s+(Number(i.monto)||0),0);
  const vencidos=impuestos.filter(i=>i.estado!=='Pagado'&&i.vencimiento&&i.vencimiento<today_);

  el.innerHTML=`
  <div style="display:flex;justify-content:flex-end;margin-bottom:16px"><button class="btn btn-primary" onclick="abrirModalImpuesto()">+ Nuevo Impuesto</button></div>
  <div class="grid-4" style="margin-bottom:20px">
    <div class="stat-card" style="cursor:pointer" onclick="impDetalle('total')"><div class="stat-icon cyan">🏦</div><div class="card-title">Total Registrado</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--accent)">${fmt(totalPagado+totalPendiente)}</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="impDetalle('pagados')"><div class="stat-icon green">✅</div><div class="card-title">Pagados</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--accent3)">${fmt(totalPagado)}</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="impDetalle('pendientes')"><div class="stat-icon orange">⏳</div><div class="card-title">Pendientes</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--warn)">${fmt(totalPendiente)}</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="impDetalle('vencidos')"><div class="stat-icon red">🔴</div><div class="card-title">Vencidos</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--danger)">${vencidos.length}</div></div>
  </div>
  ${vencidos.length?`<div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:12px;padding:14px 18px;margin-bottom:16px">
    <div style="font-family:'Syne',sans-serif;font-weight:700;color:var(--danger);margin-bottom:8px">🔴 ${vencidos.length} impuesto(s) VENCIDO(S)</div>
    ${vencidos.map(i=>`<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid rgba(239,68,68,0.15)"><span>${i.concepto} — ${i.tipo}</span><span style="color:var(--danger);font-weight:600">${fmt(i.monto)} · venció ${fmtD(i.vencimiento)}</span></div>`).join('')}
  </div>`:''}
  ${impuestos.length?`<div class="table-wrap"><table>
    <thead><tr><th>Concepto</th><th>Tipo</th><th>Período</th><th>Vencimiento</th><th>Monto</th><th>Estado</th><th>Comprobante</th><th></th></tr></thead>
    <tbody>${impuestos.sort((a,b)=>(b.vencimiento||'').localeCompare(a.vencimiento||'')).map(i=>{
      const isVenc=i.estado!=='Pagado'&&i.vencimiento&&i.vencimiento<today_;
      return`<tr${isVenc?' style="background:rgba(239,68,68,0.04)"':''}>
        <td style="font-weight:600">${i.concepto||'—'}</td>
        <td><span class="badge badge-purple">${i.tipo||'—'}</span></td>
        <td style="font-size:12px;color:var(--muted)">${i.periodo||'—'}</td>
        <td style="font-size:12px;color:${isVenc?'var(--danger)':'var(--muted)'};font-weight:${isVenc?700:400}">${i.vencimiento?fmtD(i.vencimiento):'—'}${isVenc?' ⚠️':''}</td>
        <td style="font-weight:600;color:var(--danger)">${fmt(i.monto)}</td>
        <td><span class="badge badge-${i.estado==='Pagado'?'success':'danger'}">${i.estado||'Pendiente'}</span></td>
        <td>${i.comprobante?`<a href="${i.comprobante}" target="_blank" style="color:var(--accent);font-size:11px">📎 Ver</a>`:'—'}</td>
        <td>
          ${i.estado!=='Pagado'?`<button class="btn btn-success btn-sm" onclick="marcarImpuestoPagado(${i.id})" style="background:rgba(200,168,74,0.15);color:var(--accent3);border:1px solid rgba(200,168,74,0.3);font-size:10px">✅ Pagar</button> `:''}
          <button class="btn btn-secondary btn-sm" onclick="editarImpuesto(${i.id})">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="delItem('impuestos',${i.id},renderImpuestos)">🗑</button>
        </td>
      </tr>`;}).join('')}</tbody></table></div>`
  :`<div class="empty-state"><div class="icon">🏦</div><h3>Sin impuestos registrados</h3><p>Registrá impuestos, tasas y obligaciones fiscales</p></div>`}`;
}

function abrirModalImpuesto(id){
  const imp=id?S.get('impuestos').find(x=>x.id===id):null;
  let m=document.getElementById('modal-impuesto');
  if(!m){m=document.createElement('div');m.className='modal-overlay';m.id='modal-impuesto';m.innerHTML='<div class="modal"></div>';document.body.appendChild(m);}
  m.querySelector('.modal').innerHTML=`
  <div class="modal-head"><div class="modal-title">${imp?'Editar':'Nuevo'} Impuesto</div><button class="modal-close" onclick="closeModal('modal-impuesto')">✕</button></div>
  <div class="modal-body">
    <input type="hidden" id="imp-id" value="${imp?imp.id:''}">
    <div class="form-row">
      <div class="form-group"><label>Concepto *</label><input id="imp-concepto" value="${imp?.concepto||''}" placeholder="IVA, IIBB, Monotributo..."></div>
      <div class="form-group"><label>Tipo</label>
        <select id="imp-tipo"><option value="IVA">IVA</option><option value="IIBB">Ingresos Brutos</option><option value="Ganancias">Ganancias</option><option value="Monotributo">Monotributo</option><option value="Tasa municipal">Tasa municipal</option><option value="Seguridad Social">Seguridad Social</option><option value="Otro">Otro</option></select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Monto ($)</label><input id="imp-monto" type="number" value="${imp?.monto||''}" placeholder="0"></div>
      <div class="form-group"><label>Período</label><input id="imp-periodo" value="${imp?.periodo||''}" placeholder="Ej: Febrero 2026, 1er Trim 2026"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Fecha Vencimiento</label><input id="imp-vencimiento" type="date" value="${imp?.vencimiento||''}"></div>
      <div class="form-group"><label>Estado</label><select id="imp-estado"><option value="Pendiente">Pendiente</option><option value="Pagado">Pagado</option></select></div>
    </div>
    <div class="form-group"><label>📎 Comprobante (link Drive)</label><input id="imp-comprobante" value="${imp?.comprobante||''}" placeholder="https://drive.google.com/..." type="url"></div>
    <div class="form-group"><label>Notas</label><textarea id="imp-notas" placeholder="Observaciones...">${imp?.notas||''}</textarea></div>
  </div>
  <div class="modal-footer">
    <button class="btn btn-secondary" onclick="closeModal('modal-impuesto')">Cancelar</button>
    <button class="btn btn-primary" onclick="saveImpuesto()">💾 Guardar</button>
  </div>`;
  if(imp){document.getElementById('imp-tipo').value=imp.tipo||'Otro';document.getElementById('imp-estado').value=imp.estado||'Pendiente';}
  m.classList.add('open');
}
function editarImpuesto(id){abrirModalImpuesto(id);}
function saveImpuesto(){
  const id=document.getElementById('imp-id').value;
  const item={id:id?Number(id):S.nextId('impuestos'),concepto:document.getElementById('imp-concepto').value,tipo:document.getElementById('imp-tipo').value,monto:document.getElementById('imp-monto').value,periodo:document.getElementById('imp-periodo').value,vencimiento:document.getElementById('imp-vencimiento').value,estado:document.getElementById('imp-estado').value,comprobante:document.getElementById('imp-comprobante').value,notas:document.getElementById('imp-notas').value};
  if(!item.concepto){toast('⚠️ Ingresá el concepto');return;}
  const items=S.get('impuestos')||[];
  if(id){const i=items.findIndex(x=>x.id===Number(id));if(i>-1)items[i]=item;}else items.push(item);
  S.set('impuestos',items);closeModal('modal-impuesto');renderImpuestos();toast('✅ Impuesto guardado');
}
function marcarImpuestoPagado(id){
  const items=S.get('impuestos')||[];const i=items.findIndex(x=>x.id===id);
  if(i>-1){items[i].estado='Pagado';items[i].fechaPago=todayStr();}
  S.set('impuestos',items);renderImpuestos();toast('✅ Impuesto marcado como pagado');
}

// =====================================================
// REPARTO SOCIETARIO (PIN: 3105)
// =====================================================
let _repartoUnlocked=false;

function renderReparto(){
  const el=document.getElementById('reparto-content');if(!el)return;
  if(!_repartoUnlocked){
    el.innerHTML=`<div style="display:flex;align-items:center;justify-content:center;min-height:60vh">
      <div style="text-align:center;max-width:380px">
        <div style="font-size:56px;margin-bottom:16px">🔐</div>
        <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;margin-bottom:6px">Reparto Societario</div>
        <div style="font-size:13px;color:var(--muted);margin-bottom:24px">Acceso restringido — Ingresá el PIN para ver esta sección</div>
        <input id="pin-reparto" type="password" maxlength="4" placeholder="• • • •" style="text-align:center;font-size:28px;letter-spacing:14px;width:180px;padding:14px;border-radius:14px;border:2px solid var(--border);background:var(--surface2);color:var(--text);font-family:'DM Mono',monospace;display:block;margin:0 auto 12px" onkeydown="if(event.key==='Enter')unlockReparto()">
        <div id="pin-reparto-err" style="color:var(--danger);font-size:11px;min-height:18px;margin-bottom:12px"></div>
        <button class="btn btn-primary" onclick="unlockReparto()">Desbloquear</button>
      </div></div>`;
    setTimeout(()=>document.getElementById('pin-reparto')?.focus(),100);
    return;
  }
  _renderRepartoContent(el);
}

function editarTC(){
  let m=document.getElementById('modal-tc');
  if(!m){m=document.createElement('div');m.className='modal-overlay';m.id='modal-tc';m.innerHTML='<div class="modal" style="width:380px"></div>';document.body.appendChild(m);}
  const tcActual=S.get('reparto_tc')||1450;
  m.querySelector('.modal').innerHTML=`
    <div class="modal-head"><div class="modal-title">💱 Tipo de Cambio</div><button class="modal-close" onclick="closeModal('modal-tc')">✕</button></div>
    <div class="modal-body" style="text-align:center;padding:24px 20px">
      <div style="font-size:12px;color:var(--muted);margin-bottom:16px">Umbral fijo: <strong>USD 30.000</strong><br>Modificá el tipo de cambio para recalcular el umbral en pesos</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:8px">1 USD =</div>
      <input id="tc-valor" type="number" value="${tcActual}" style="text-align:center;font-size:28px;font-family:'Syne',sans-serif;font-weight:800;width:200px;padding:12px;border-radius:12px;border:2px solid var(--border);background:var(--surface2);color:var(--accent)">
      <div style="font-size:12px;color:var(--muted);margin-top:8px">ARS</div>
      <div style="margin-top:14px;font-size:13px;color:#c8a84a;font-weight:600" id="tc-preview">Umbral: $${(30000*tcActual).toLocaleString('es-AR')}</div>
    </div>
    <div class="modal-footer" style="justify-content:center"><button class="btn btn-primary" onclick="saveTC()">💾 Guardar</button></div>`;
  m.classList.add('open');
  document.getElementById('tc-valor').addEventListener('input',e=>{
    const v=Number(e.target.value)||0;
    document.getElementById('tc-preview').textContent='Umbral: $'+(30000*v).toLocaleString('es-AR');
  });
}

function saveTC(){
  const v=Number(document.getElementById('tc-valor').value);
  if(!v||v<1){toast('⚠️ Ingresá un valor válido');return;}
  S.set('reparto_tc',v);
  closeModal('modal-tc');renderReparto();toast('✅ Tipo de cambio actualizado: $'+v.toLocaleString('es-AR'));
}

function unlockReparto(){
  if((document.getElementById('pin-reparto')?.value||'')==='3105'){
    _repartoUnlocked=true;renderReparto();toast('🔓 Reparto Societario desbloqueado');
  } else {
    document.getElementById('pin-reparto-err').textContent='❌ PIN incorrecto';
    document.getElementById('pin-reparto').value='';document.getElementById('pin-reparto').focus();
  }
}

function _renderRepartoContent(el){
  const cobros=S.get('cobros'),gastos=S.get('gastos');
  let totalCobrado=0;cobros.forEach(c=>c.cuotas.forEach(q=>{if(q.estado==='Pagada')totalCobrado+=q.montoCobrado||q.monto;}));
  const totalGastos=gastos.reduce((s,g)=>s+(Number(g.monto)||0),0);
  const gananciaNeta=totalCobrado-totalGastos;

  // Tipo de cambio editable - guardado en localStorage
  const tcGuardado=S.get('reparto_tc');
  const TC=tcGuardado?Number(tcGuardado):1450;
  const USD_UMBRAL=30000;
  const UMBRAL=USD_UMBRAL*TC;
  const ahorroPct=0.10;
  const ahorroMonto=Math.max(gananciaNeta*ahorroPct,0);
  const distributable=Math.max(gananciaNeta-ahorroMonto,0);

  let leandro=0,ariel=0;
  if(distributable<=UMBRAL){
    leandro=distributable*0.5;
    ariel=distributable*0.5;
  } else {
    const base=UMBRAL*0.5;
    const excedente=distributable-UMBRAL;
    leandro=base+(excedente*0.625);
    ariel=base+(excedente*0.375);
  }

  // Historical retiros
  const retiros=S.get('retiros_socios')||[];
  const retirosLeandro=retiros.filter(r=>r.socio==='Leandro');
  const retirosAriel=retiros.filter(r=>r.socio==='Ariel');
  const retiradoL=retirosLeandro.reduce((s,r)=>s+(Number(r.monto)||0),0);
  const retiradoA=retirosAriel.reduce((s,r)=>s+(Number(r.monto)||0),0);
  const saldoL=leandro-retiradoL;
  const saldoA=ariel-retiradoA;

  el.innerHTML=`
  <!-- Tipo de cambio -->
  <div style="display:flex;align-items:center;justify-content:space-between;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 18px;margin-bottom:16px">
    <div style="display:flex;align-items:center;gap:12px">
      <span style="font-size:11px;color:var(--muted)">💱 Tipo de cambio:</span>
      <span style="font-family:'Syne',sans-serif;font-weight:800;color:var(--accent)">1 USD = $${TC.toLocaleString('es-AR')}</span>
      <span style="font-size:11px;color:var(--muted)">·</span>
      <span style="font-size:11px;color:var(--muted)">Umbral: <strong style="color:var(--accent3)">USD ${USD_UMBRAL.toLocaleString('en-US')}</strong> = <strong style="color:#c8a84a">${fmt(UMBRAL)}</strong></span>
    </div>
    <button class="btn btn-secondary btn-sm" onclick="editarTC()" style="font-size:11px">✏️ Cambiar TC</button>
  </div>

  <!-- Ganancia y cálculo -->
  <div style="background:linear-gradient(135deg,rgba(184,146,46,0.08),rgba(167,139,250,0.04));border:1px solid rgba(184,146,46,0.2);border-radius:14px;padding:20px;margin-bottom:20px">
    <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:#c8a84a;margin-bottom:14px">📊 Cálculo de Reparto</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:16px">
      <div style="text-align:center;padding:14px;background:var(--surface);border-radius:10px;border:1px solid var(--border)"><div style="font-size:11px;color:var(--muted)">Ganancia Neta</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:${gananciaNeta>=0?'var(--accent3)':'var(--danger)'}">${fmt(gananciaNeta)}</div></div>
      <div style="text-align:center;padding:14px;background:var(--surface);border-radius:10px;border:1px solid var(--border)"><div style="font-size:11px;color:var(--muted)">10% Ahorro Empresa</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--accent)">${fmt(ahorroMonto)}</div></div>
      <div style="text-align:center;padding:14px;background:var(--surface);border-radius:10px;border:1px solid var(--border)"><div style="font-size:11px;color:var(--muted)">Distribuible</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#c8a84a">${fmt(distributable)}</div></div>
    </div>
    <div style="font-size:11px;color:var(--muted);background:var(--surface2);border-radius:8px;padding:10px 14px">
      📐 <strong>Regla:</strong> Hasta USD ${USD_UMBRAL.toLocaleString('en-US')} (${fmt(UMBRAL)}) → 50/50. Excedente → Leandro 62.5% / Ariel 37.5%.
      ${distributable>UMBRAL?` <span style="color:var(--warn);font-weight:600">⚡ Excedente activo: ${fmt(distributable-UMBRAL)}</span>`:''}
    </div>
  </div>

  <!-- Socios -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
    <div class="card" style="border-color:rgba(212,175,55,0.2)">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#d4af37);display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;font-weight:800">L</div>
        <div><div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800">Leandro</div><div style="font-size:11px;color:var(--muted)">${distributable<=UMBRAL?'50%':'62.5% excedente + 50% base'}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">
        <div style="text-align:center;padding:10px;background:var(--surface2);border-radius:8px"><div style="font-size:10px;color:var(--muted)">Le corresponde</div><div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:var(--accent)">${fmt(leandro)}</div></div>
        <div style="text-align:center;padding:10px;background:var(--surface2);border-radius:8px"><div style="font-size:10px;color:var(--muted)">Retirado</div><div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:var(--warn)">${fmt(retiradoL)}</div></div>
        <div style="text-align:center;padding:10px;background:${saldoL>=0?'rgba(200,168,74,0.08)':'rgba(239,68,68,0.08)'};border-radius:8px;border:1px solid ${saldoL>=0?'rgba(200,168,74,0.2)':'rgba(239,68,68,0.2)'}"><div style="font-size:10px;color:var(--muted)">Saldo</div><div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:${saldoL>=0?'var(--accent3)':'var(--danger)'}">${fmt(saldoL)}</div></div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="registrarRetiro('Leandro')" style="width:100%">💸 Registrar Retiro</button>
      ${retirosLeandro.length?`<div style="margin-top:12px;max-height:140px;overflow-y:auto">${retirosLeandro.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(r=>`<div style="display:flex;justify-content:space-between;font-size:11px;padding:5px 0;border-bottom:1px solid var(--border)"><span>${fmtD(r.fecha)}${r.concepto?' — '+r.concepto:''}</span><span style="font-weight:700;color:var(--warn)">${fmt(r.monto)}</span></div>`).join('')}</div>`:''}
    </div>

    <div class="card" style="border-color:rgba(200,168,74,0.2)">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--accent3),#9a7830);display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;font-weight:800">A</div>
        <div><div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800">Ariel</div><div style="font-size:11px;color:var(--muted)">${distributable<=UMBRAL?'50%':'37.5% excedente + 50% base'}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">
        <div style="text-align:center;padding:10px;background:var(--surface2);border-radius:8px"><div style="font-size:10px;color:var(--muted)">Le corresponde</div><div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:var(--accent3)">${fmt(ariel)}</div></div>
        <div style="text-align:center;padding:10px;background:var(--surface2);border-radius:8px"><div style="font-size:10px;color:var(--muted)">Retirado</div><div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:var(--warn)">${fmt(retiradoA)}</div></div>
        <div style="text-align:center;padding:10px;background:${saldoA>=0?'rgba(200,168,74,0.08)':'rgba(239,68,68,0.08)'};border-radius:8px;border:1px solid ${saldoA>=0?'rgba(200,168,74,0.2)':'rgba(239,68,68,0.2)'}"><div style="font-size:10px;color:var(--muted)">Saldo</div><div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:${saldoA>=0?'var(--accent3)':'var(--danger)'}">${fmt(saldoA)}</div></div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="registrarRetiro('Ariel')" style="width:100%;background:var(--accent3)">💸 Registrar Retiro</button>
      ${retirosAriel.length?`<div style="margin-top:12px;max-height:140px;overflow-y:auto">${retirosAriel.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(r=>`<div style="display:flex;justify-content:space-between;font-size:11px;padding:5px 0;border-bottom:1px solid var(--border)"><span>${fmtD(r.fecha)}${r.concepto?' — '+r.concepto:''}</span><span style="font-weight:700;color:var(--warn)">${fmt(r.monto)}</span></div>`).join('')}</div>`:''}
    </div>
  </div>

  <!-- Historial completo -->
  <div class="card">
    <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;margin-bottom:14px">📋 Historial de Retiros</div>
    ${retiros.length?`<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Socio</th><th>Concepto</th><th>Comprobante</th><th style="text-align:right">Monto</th><th></th></tr></thead><tbody>
    ${retiros.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(r=>`<tr>
      <td style="font-size:12px;color:var(--muted)">${fmtD(r.fecha)}</td>
      <td style="font-weight:600">${r.socio}</td>
      <td style="font-size:12px">${r.concepto||'—'}</td>
      <td>${r.comprobante?`<a href="${r.comprobante}" target="_blank" style="color:var(--accent);font-size:11px">📎 Ver</a>`:'—'}</td>
      <td style="text-align:right;font-weight:700;color:var(--warn)">${fmt(r.monto)}</td>
      <td><button class="btn btn-danger btn-sm" onclick="delRetiro(${r.id})">🗑</button></td>
    </tr>`).join('')}</tbody></table></div>`
    :'<div style="text-align:center;padding:24px;color:var(--muted)">Sin retiros registrados</div>'}
  </div>`;
}

function registrarRetiro(socio){
  let m=document.getElementById('modal-retiro');
  if(!m){m=document.createElement('div');m.className='modal-overlay';m.id='modal-retiro';m.innerHTML='<div class="modal"></div>';document.body.appendChild(m);}
  m.querySelector('.modal').innerHTML=`
    <div class="modal-head"><div class="modal-title">💸 Retiro — ${socio}</div><button class="modal-close" onclick="closeModal('modal-retiro')">✕</button></div>
    <div class="modal-body">
      <input type="hidden" id="ret-socio" value="${socio}">
      <div class="form-row">
        <div class="form-group"><label>Monto ($)</label><input id="ret-monto" type="number" placeholder="0"></div>
        <div class="form-group"><label>Fecha</label><input id="ret-fecha" type="date" value="${todayStr()}"></div>
      </div>
      <div class="form-group"><label>Concepto</label><input id="ret-concepto" placeholder="Retiro mensual, anticipo..."></div>
      <div class="form-group"><label>📎 Comprobante (link Drive)</label><input id="ret-comprobante" placeholder="https://drive.google.com/..." type="url"></div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal('modal-retiro')">Cancelar</button><button class="btn btn-primary" onclick="saveRetiro()">💾 Guardar</button></div>`;
  m.classList.add('open');
}

function saveRetiro(){
  const monto=Number(document.getElementById('ret-monto').value);
  if(!monto){toast('⚠️ Ingresá el monto');return;}
  const retiros=S.get('retiros_socios')||[];
  retiros.push({id:Date.now(),socio:document.getElementById('ret-socio').value,monto,fecha:document.getElementById('ret-fecha').value,concepto:document.getElementById('ret-concepto').value,comprobante:document.getElementById('ret-comprobante').value});
  S.set('retiros_socios',retiros);closeModal('modal-retiro');renderReparto();toast('✅ Retiro registrado');
}

function delRetiro(id){
  if(!confirm('¿Eliminar este retiro?'))return;
  const retiros=(S.get('retiros_socios')||[]).filter(r=>r.id!==id);
  S.set('retiros_socios',retiros);renderReparto();toast('🗑 Retiro eliminado');
}

// =====================================================
// AHORRO EMPRESA (PIN: 3105)
// =====================================================
let _ahorroUnlocked=false;

function renderAhorro(){
  const el=document.getElementById('ahorro-content');if(!el)return;
  if(!_ahorroUnlocked){
    el.innerHTML=`<div style="display:flex;align-items:center;justify-content:center;min-height:60vh">
      <div style="text-align:center;max-width:380px">
        <div style="font-size:56px;margin-bottom:16px">🏧</div>
        <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;margin-bottom:6px">Ahorro Empresa</div>
        <div style="font-size:13px;color:var(--muted);margin-bottom:24px">Acceso restringido — Ingresá el PIN</div>
        <input id="pin-ahorro" type="password" maxlength="4" placeholder="• • • •" style="text-align:center;font-size:28px;letter-spacing:14px;width:180px;padding:14px;border-radius:14px;border:2px solid var(--border);background:var(--surface2);color:var(--text);font-family:'DM Mono',monospace;display:block;margin:0 auto 12px" onkeydown="if(event.key==='Enter')unlockAhorro()">
        <div id="pin-ahorro-err" style="color:var(--danger);font-size:11px;min-height:18px;margin-bottom:12px"></div>
        <button class="btn btn-primary" onclick="unlockAhorro()">Desbloquear</button>
      </div></div>`;
    setTimeout(()=>document.getElementById('pin-ahorro')?.focus(),100);
    return;
  }
  _renderAhorroContent(el);
}

function unlockAhorro(){
  if((document.getElementById('pin-ahorro')?.value||'')==='3105'){
    _ahorroUnlocked=true;renderAhorro();toast('🔓 Ahorro desbloqueado');
  } else {
    document.getElementById('pin-ahorro-err').textContent='❌ PIN incorrecto';
    document.getElementById('pin-ahorro').value='';document.getElementById('pin-ahorro').focus();
  }
}

function _renderAhorroContent(el){
  const cobros=S.get('cobros'),gastos=S.get('gastos');
  let totalCobrado=0;cobros.forEach(c=>c.cuotas.forEach(q=>{if(q.estado==='Pagada')totalCobrado+=q.montoCobrado||q.monto;}));
  const totalGastos=gastos.reduce((s,g)=>s+(Number(g.monto)||0),0);
  const gananciaNeta=totalCobrado-totalGastos;
  const ahorroAutoCalc=Math.max(gananciaNeta*0.10,0);

  const movimientos=S.get('ahorros')||[];
  const totalDepositos=movimientos.filter(m=>m.tipo==='deposito').reduce((s,m)=>s+(Number(m.monto)||0),0);
  const totalRetiros=movimientos.filter(m=>m.tipo==='retiro').reduce((s,m)=>s+(Number(m.monto)||0),0);
  const saldoAhorro=totalDepositos-totalRetiros;

  el.innerHTML=`
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">
    <div class="stat-card" style="cursor:pointer" onclick="ahorroDetalle('objetivo')"><div class="stat-icon green">💰</div><div class="card-title">10% Ganancia Neta</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--accent3)">${fmt(ahorroAutoCalc)}</div><div style="font-size:10px;color:var(--muted)">Calculado automático →</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="ahorroDetalle('depositos')"><div class="stat-icon cyan">⬆️</div><div class="card-title">Depósitos</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--accent)">${fmt(totalDepositos)}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">→</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="ahorroDetalle('retiros')"><div class="stat-icon orange">⬇️</div><div class="card-title">Retiros Ahorro</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--warn)">${fmt(totalRetiros)}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">→</div></div>
    <div class="stat-card" style="cursor:pointer;border-color:rgba(200,168,74,0.3)" onclick="ahorroDetalle('saldo')"><div class="stat-icon green">🏧</div><div class="card-title">Saldo Actual</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--accent3)">${fmt(saldoAhorro)}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">→</div></div>
  </div>

  ${saldoAhorro<ahorroAutoCalc?`<div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:14px 18px;margin-bottom:16px">
    <div style="font-family:'Syne',sans-serif;font-weight:700;color:var(--warn)">⚠️ Faltan ${fmt(ahorroAutoCalc-saldoAhorro)} para alcanzar el 10% de ahorro objetivo</div>
  </div>`:''}

  <div style="display:flex;gap:8px;margin-bottom:16px">
    <button class="btn btn-primary" onclick="registrarMovAhorro('deposito')">⬆️ Depositar</button>
    <button class="btn btn-secondary" onclick="registrarMovAhorro('retiro')">⬇️ Retirar</button>
  </div>

  <div class="card">
    <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;margin-bottom:14px">📋 Movimientos del Ahorro</div>
    ${movimientos.length?`<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Concepto</th><th>Comprobante</th><th style="text-align:right">Monto</th><th></th></tr></thead><tbody>
    ${movimientos.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(m=>`<tr>
      <td style="font-size:12px;color:var(--muted)">${fmtD(m.fecha)}</td>
      <td><span class="badge badge-${m.tipo==='deposito'?'success':'warn'}">${m.tipo==='deposito'?'⬆️ Depósito':'⬇️ Retiro'}</span></td>
      <td style="font-size:12px">${m.concepto||'—'}</td>
      <td>${m.comprobante?`<a href="${m.comprobante}" target="_blank" style="color:var(--accent);font-size:11px">📎 Ver</a>`:'—'}</td>
      <td style="text-align:right;font-weight:700;color:${m.tipo==='deposito'?'var(--accent3)':'var(--warn)'}">${m.tipo==='deposito'?'+':'−'}${fmt(m.monto)}</td>
      <td><button class="btn btn-danger btn-sm" onclick="delMovAhorro(${m.id})">🗑</button></td>
    </tr>`).join('')}</tbody></table></div>`
    :'<div style="text-align:center;padding:24px;color:var(--muted)">Sin movimientos</div>'}
  </div>`;
}

function registrarMovAhorro(tipo){
  let m=document.getElementById('modal-ahorro');
  if(!m){m=document.createElement('div');m.className='modal-overlay';m.id='modal-ahorro';m.innerHTML='<div class="modal"></div>';document.body.appendChild(m);}
  m.querySelector('.modal').innerHTML=`
    <div class="modal-head"><div class="modal-title">${tipo==='deposito'?'⬆️ Depósito':'⬇️ Retiro'} de Ahorro</div><button class="modal-close" onclick="closeModal('modal-ahorro')">✕</button></div>
    <div class="modal-body">
      <input type="hidden" id="ah-tipo" value="${tipo}">
      <div class="form-row">
        <div class="form-group"><label>Monto ($)</label><input id="ah-monto" type="number" placeholder="0"></div>
        <div class="form-group"><label>Fecha</label><input id="ah-fecha" type="date" value="${todayStr()}"></div>
      </div>
      <div class="form-group"><label>Concepto</label><input id="ah-concepto" placeholder="10% mensual, reserva..."></div>
      <div class="form-group"><label>📎 Comprobante</label><input id="ah-comprobante" placeholder="https://drive.google.com/..." type="url"></div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal('modal-ahorro')">Cancelar</button><button class="btn btn-primary" onclick="saveMovAhorro()">💾 Guardar</button></div>`;
  m.classList.add('open');
}

function saveMovAhorro(){
  const monto=Number(document.getElementById('ah-monto').value);
  if(!monto){toast('⚠️ Ingresá el monto');return;}
  const movs=S.get('ahorros')||[];
  movs.push({id:Date.now(),tipo:document.getElementById('ah-tipo').value,monto,fecha:document.getElementById('ah-fecha').value,concepto:document.getElementById('ah-concepto').value,comprobante:document.getElementById('ah-comprobante').value});
  S.set('ahorros',movs);closeModal('modal-ahorro');renderAhorro();toast('✅ Movimiento registrado');
}

function delMovAhorro(id){
  if(!confirm('¿Eliminar este movimiento?'))return;
  const movs=(S.get('ahorros')||[]).filter(m=>m.id!==id);
  S.set('ahorros',movs);renderAhorro();toast('🗑 Movimiento eliminado');
}

function ahorroDetalle(tipo){
  const movimientos=S.get('ahorros')||[];
  const cobros=S.get('cobros'),gastos=S.get('gastos');
  let totalCobrado=0;cobros.forEach(c=>c.cuotas.forEach(q=>{if(q.estado==='Pagada')totalCobrado+=q.montoCobrado||q.monto;}));
  const totalGastos=gastos.reduce((s,g)=>s+(Number(g.monto)||0),0);
  const gananciaNeta=totalCobrado-totalGastos;
  const objetivo=Math.max(gananciaNeta*0.10,0);
  const deps=movimientos.filter(m=>m.tipo==='deposito');
  const rets=movimientos.filter(m=>m.tipo==='retiro');
  const totalDep=deps.reduce((s,m)=>s+(Number(m.monto)||0),0);
  const totalRet=rets.reduce((s,m)=>s+(Number(m.monto)||0),0);
  const saldo=totalDep-totalRet;
  let titulo='',body='';
  const mkTbl=(items,color)=>items.length?`<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Comprobante</th><th style="text-align:right">Monto</th></tr></thead><tbody>${items.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(m=>`<tr><td style="font-size:11px">${fmtD(m.fecha)}</td><td style="font-size:12px">${m.concepto||'—'}</td><td>${m.comprobante?`<a href="${m.comprobante}" target="_blank" style="color:var(--accent);font-size:11px">📎</a>`:'—'}</td><td style="text-align:right;font-weight:700;color:${color}">${fmt(m.monto)}</td></tr>`).join('')}</tbody></table></div>`:'Sin movimientos';
  if(tipo==='objetivo'){titulo='💰 10% Ganancia Neta — Objetivo';body=`<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:16px"><div style="text-align:center;padding:14px;background:var(--surface2);border-radius:10px"><div style="font-size:11px;color:var(--muted)">Ganancia Neta</div><div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--accent3)">${fmt(gananciaNeta)}</div></div><div style="text-align:center;padding:14px;background:var(--surface2);border-radius:10px"><div style="font-size:11px;color:var(--muted)">10% Objetivo</div><div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--accent)">${fmt(objetivo)}</div></div><div style="text-align:center;padding:14px;background:${saldo>=objetivo?'rgba(200,168,74,0.08)':'rgba(239,68,68,0.08)'};border-radius:10px"><div style="font-size:11px;color:var(--muted)">Saldo Actual</div><div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:${saldo>=objetivo?'var(--accent3)':'var(--danger)'}">${fmt(saldo)}</div></div></div>${saldo<objetivo?`<div style="color:var(--warn);font-weight:600;font-size:13px">⚠️ Faltan ${fmt(objetivo-saldo)} para alcanzar el objetivo</div>`:`<div style="color:var(--accent3);font-weight:600;font-size:13px">✅ Objetivo alcanzado (+${fmt(saldo-objetivo)} excedente)</div>`}`;}
  else if(tipo==='depositos'){titulo='⬆️ Depósitos';body=`<div style="margin-bottom:10px">Total depositado: <strong style="color:var(--accent)">${fmt(totalDep)}</strong> en <strong>${deps.length}</strong> movimientos</div>`+mkTbl(deps,'var(--accent3)');}
  else if(tipo==='retiros'){titulo='⬇️ Retiros de Ahorro';body=`<div style="margin-bottom:10px">Total retirado: <strong style="color:var(--warn)">${fmt(totalRet)}</strong></div>`+mkTbl(rets,'var(--warn)');}
  else if(tipo==='saldo'){titulo='🏧 Saldo Actual';body=`<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px"><div style="text-align:center;padding:14px;background:rgba(212,175,55,0.08);border-radius:10px"><div style="font-size:11px;color:var(--muted)">Depósitos</div><div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--accent)">${fmt(totalDep)}</div></div><div style="text-align:center;padding:14px;background:rgba(245,158,11,0.08);border-radius:10px"><div style="font-size:11px;color:var(--muted)">Retiros</div><div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--warn)">${fmt(totalRet)}</div></div><div style="text-align:center;padding:14px;background:rgba(200,168,74,0.08);border-radius:10px"><div style="font-size:11px;color:var(--muted)">Saldo</div><div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--accent3)">${fmt(saldo)}</div></div></div>`;}
  let m=document.getElementById('modal-admin-detalle');
  if(!m){m=document.createElement('div');m.className='modal-overlay';m.id='modal-admin-detalle';m.innerHTML='<div class="modal" style="width:900px;max-width:96vw;max-height:90vh;display:flex;flex-direction:column"></div>';document.body.appendChild(m);}
  m.querySelector('.modal').innerHTML=`<div class="modal-head"><div class="modal-title">${titulo}</div><button class="modal-close" onclick="closeModal('modal-admin-detalle')">✕</button></div><div class="modal-body" style="overflow-y:auto;flex:1">${body}</div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal('modal-admin-detalle')">Cerrar</button></div>`;
  m.classList.add('open');
}

// =====================================================
// PORTAL DEL CONSULTOR (mi_panel, mi_rendicion, mi_calendario, mi_honorarios)
// =====================================================

function _getMyConsultor(){
  const auditores=S.get('auditores');
  if(!currentUser)return null;
  // 1. Get fresh user data from store (has consultorId)
  const freshUser=getUsers().find(u=>u.id===currentUser.id);
  const cId=freshUser?.consultorId||currentUser.consultorId;
  if(cId){
    const linked=auditores.find(a=>a.id===Number(cId));
    if(linked)return linked;
  }
  // 2. Fallback: match by exact nombre
  const byName=auditores.find(a=>a.nombre===currentUser.nombre)||(freshUser?auditores.find(a=>a.nombre===freshUser.nombre):null);
  if(byName)return byName;
  // 3. Fallback: match by email
  const email=freshUser?.email||currentUser.email;
  if(email){const byEmail=auditores.find(a=>a.email&&a.email.toLowerCase()===email.toLowerCase());if(byEmail)return byEmail;}
  // 4. Fallback: partial name match (first+last name)
  const nombre=(freshUser?.nombre||currentUser.nombre||'').toLowerCase().trim();
  if(nombre){const byPartial=auditores.find(a=>a.nombre.toLowerCase().trim()===nombre);if(byPartial)return byPartial;}
  return null;
}

// === MI PANEL (Dashboard personal) ===
function renderMiPanel(){
  const el=document.getElementById('mi-panel-content');if(!el)return;
  const me=_getMyConsultor();
  const auds=S.get('auditorias'),entregas=S.get('entregas_consultor')||[],rendiciones=S.get('rendiciones_gastos')||[];
  const notifs=S.get('notif_consultor')||[];
  const today_=todayStr(),ym=today_.substring(0,7);

  if(!me){
    const auditores=S.get('auditores');
    el.innerHTML=`<div class="empty-state"><div class="icon">⚠️</div><h3>Perfil no vinculado</h3><p>Tu usuario no está asociado a ningún consultor.<br>Pedile al administrador que vincule tu usuario desde <strong>Usuarios → Editar → Vincular con Consultor</strong>.</p><div style="margin-top:12px;font-size:11px;color:var(--muted)">Consultores cargados: ${auditores.map(a=>a.nombre).join(', ')||'ninguno'}<br>Tu usuario: ${currentUser?.nombre||'—'} (${currentUser?.email||'—'})</div></div>`;return;
  }

  const mios=auds.filter(a=>a.auditor===me.nombre);
  const activas=mios.filter(a=>a.estado!=='Completada');
  const completadas=mios.filter(a=>a.estado==='Completada');
  const mesMios=mios.filter(a=>(a.fInsitu||'').startsWith(ym));
  // Adeudados: fInsitu pasada sin entrega
  const adeudados=mios.filter(a=>a.estado!=='Completada'&&a.fInsitu&&a.fInsitu<=today_&&!entregas.find(e=>e.auditoriaId===a.id&&e.tipo==='informe'));
  // Próximas: fInsitu futura
  const proximas=mios.filter(a=>a.fInsitu&&a.fInsitu>today_&&a.estado!=='Completada').sort((a,b)=>a.fInsitu.localeCompare(b.fInsitu));
  // Honorarios
  const honUnit=Number(me.honorarios)||300;
  const honMes=mios.filter(a=>a.estado==='Completada'&&(a.fInforme||a.fInsitu||'').startsWith(ym)).length*honUnit;
  const honTotal=completadas.length*honUnit;
  // Mis notificaciones no leídas
  const misNotifs=(notifs||[]).filter(n=>n.consultor===me.nombre&&!n.leida);

  const hr=new Date().getHours();
  const saludo=hr<12?'Buenos días':hr<18?'Buenas tardes':'Buenas noches';

  el.innerHTML=`
  <div id="mi-recursos-insitu"></div>
  <div style="margin-bottom:20px">
    <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800">${saludo}, ${me.nombre.split(' ')[0]}! 👋</div>
    <div style="font-size:12px;color:var(--muted);margin-top:2px">${new Date().toLocaleDateString('es-AR',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
  </div>

  ${misNotifs.length?`<div style="background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.2);border-radius:12px;padding:14px;margin-bottom:16px">
    <div style="font-family:'Syne',sans-serif;font-weight:700;color:var(--accent);margin-bottom:8px">🔔 Notificaciones (${misNotifs.length})</div>
    ${misNotifs.map(n=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(212,175,55,0.1)">
      <div style="font-size:12px"><strong>${n.titulo}</strong><div style="color:var(--muted);font-size:11px">${n.mensaje} · ${fmtD(n.fecha)}</div></div>
      <div style="display:flex;gap:6px">
        ${n.tipo==='nueva_auditoria'?`<button class="btn btn-primary btn-sm" onclick="confirmarAuditoriaConsultor(${n.id})" style="font-size:10px">✅ Confirmar</button><button class="btn btn-secondary btn-sm" onclick="rechazarAuditoriaConsultor(${n.id})" style="font-size:10px">❌</button>`:''}
        <button class="btn btn-secondary btn-sm" onclick="marcarLeidaNotif(${n.id})" style="font-size:10px">👁</button>
      </div>
    </div>`).join('')}
  </div>`:''}

  <div class="grid-4" style="margin-bottom:20px">
    <div class="stat-card" style="cursor:pointer;border-color:${adeudados.length?'rgba(239,68,68,0.4)':'rgba(200,168,74,0.2)'}${adeudados.length?';animation:pulse 2s infinite':''}" onclick="miDetalle('adeudados')"><div class="stat-icon ${adeudados.length?'red':'green'}">${adeudados.length?'🚨':'✅'}</div><div class="card-title">Informes Adeudados</div><div style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:${adeudados.length?'var(--danger)':'var(--accent3)'}">${adeudados.length}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">→</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="miDetalle('activas')"><div class="stat-icon cyan">🔍</div><div class="card-title">En Proceso</div><div style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:var(--accent)">${activas.length}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">→</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="miDetalle('completadas')"><div class="stat-icon green">✅</div><div class="card-title">Completadas</div><div style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:var(--accent3)">${completadas.length}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">→</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="showPage('mi_honorarios')"><div class="stat-icon orange">💰</div><div class="card-title">Honorarios Mes</div><div style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:var(--warn)">${fmt(honMes)}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">→</div></div>
  </div>

  ${adeudados.length?`<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);border-radius:12px;padding:14px;margin-bottom:16px;animation:pulse 2s infinite">
    <div style="font-weight:700;color:var(--danger);margin-bottom:8px">📤 ENTREGAS PENDIENTES — 7 días máx. desde la visita</div>
    ${adeudados.map(a=>{const dias=Math.abs(diffDays(a.fInsitu));return`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(239,68,68,0.15)"><div><strong>${a.clienteNombre}</strong><span style="font-size:11px;color:var(--muted)"> · ${a.tipo} · In situ: ${fmtD(a.fInsitu)}</span></div><div style="display:flex;align-items:center;gap:10px"><span style="color:${dias>7?'var(--danger)':'var(--warn)'};font-weight:700">${dias} días${dias>7?' ⚠️ VENCIDO':''}</span><button class="btn btn-primary btn-sm" onclick="registrarEntregaConsultor(${a.id},'${me.nombre}')">📤 Entregar</button><button class="btn btn-secondary btn-sm" onclick="abrirPanelDocumentosCliente(${a.clienteId},'${a.clienteNombre}')" title="Ver documentos enviados por el cliente" style="font-size:10px">📎 Docs</button></div></div>`;}).join('')}
  </div>`:''}

  ${proximas.length?`<div class="card" style="margin-bottom:16px"><div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;margin-bottom:12px">📅 Próximas Auditorías</div>
    ${proximas.slice(0,5).map(a=>{const dias=diffDays(a.fInsitu);return`<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)"><div><strong>${a.clienteNombre}</strong><div style="font-size:11px;color:var(--muted)">${a.tipo}</div></div><div style="text-align:right"><div style="font-weight:700;color:var(--accent)">${fmtD(a.fInsitu)}</div><div style="font-size:11px;color:var(--warn)">en ${dias} días</div></div></div>`;}).join('')}
  </div>`:''}

  <div class="card">
    <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;margin-bottom:12px">📊 Resumen Mensual (${new Date().toLocaleDateString('es-AR',{month:'long'})})</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
      <div class="v-stat"><div class="v-stat-label">Auditorías Mes</div><div class="v-stat-value">${mesMios.length}</div></div>
      <div class="v-stat"><div class="v-stat-label">Cap. Auds</div><div class="v-stat-value">${mesMios.filter(a=>a.tipo!=='Implementación ISO 72001').length}/${me.maxauds||4}</div></div>
      <div class="v-stat"><div class="v-stat-label">Honorarios Acum.</div><div class="v-stat-value" style="color:var(--accent3)">${fmt(honTotal)}</div></div>
    </div>
  </div>`;

  // Recursos de auditoría in situ
  const elResursos = document.getElementById('mi-recursos-insitu');
  if(elResursos) {
    elResursos.innerHTML = `
      <div class="card" style="margin-bottom:16px">
        <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;margin-bottom:12px;color:var(--accent)">📋 Documentos de Auditoría In Situ</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div style="background:var(--surface2);border:0.5px solid rgba(200,168,74,0.3);border-radius:10px;padding:12px;cursor:pointer;transition:all .15s"
               onclick="descargarFicha('ficha_insitu')"
               onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='rgba(200,168,74,0.3)'">
            <div style="font-size:22px;margin-bottom:6px">📊</div>
            <div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:3px">Ficha de Relevamiento In Situ</div>
            <div style="font-size:10px;color:var(--muted);margin-bottom:8px">47 controles BPC:2026 · 4 hojas · Excel</div>
            <div style="font-size:10px;background:rgba(200,168,74,0.1);color:var(--accent);border-radius:20px;padding:3px 10px;display:inline-block">📥 Descargar</div>
          </div>
          <div style="background:var(--surface2);border:0.5px solid rgba(139,92,246,0.3);border-radius:10px;padding:12px;cursor:pointer;transition:all .15s"
               onclick="descargarFicha('ficha_insitu')"
               onmouseover="this.style.borderColor='rgba(139,92,246,0.7)'" onmouseout="this.style.borderColor='rgba(139,92,246,0.3)'">
            <div style="font-size:22px;margin-bottom:6px">🗒️</div>
            <div style="font-size:12px;font-weight:700;color:#a78bfa;margin-bottom:3px">Checklist por Criterio</div>
            <div style="font-size:10px;color:var(--muted);margin-bottom:8px">216 criterios individuales · SÍ/PARCIAL/NO/N/A</div>
            <div style="font-size:10px;background:rgba(139,92,246,0.1);color:#a78bfa;border-radius:20px;padding:3px 10px;display:inline-block">📥 Misma planilla</div>
          </div>
        </div>
      </div>`;
  }
}

function miDetalle(tipo){
  const me=_getMyConsultor();if(!me)return;
  const auds=S.get('auditorias'),entregas=S.get('entregas_consultor')||[];
  const today_=todayStr();
  const mios=auds.filter(a=>a.auditor===me.nombre);
  let titulo='',body='';
  if(tipo==='adeudados'){
    titulo='📤 Informes Adeudados';
    const items=mios.filter(a=>a.estado!=='Completada'&&a.fInsitu&&a.fInsitu<=today_&&!entregas.find(e=>e.auditoriaId===a.id&&e.tipo==='informe'));
    body=items.length?`<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Tipo</th><th>In Situ</th><th>Días</th><th></th></tr></thead><tbody>${items.map(a=>{const d=Math.abs(diffDays(a.fInsitu));return`<tr><td style="font-weight:600">${a.clienteNombre}</td><td style="font-size:11px">${a.tipo}</td><td>${fmtD(a.fInsitu)}</td><td style="color:${d>7?'var(--danger)':'var(--warn)'};font-weight:700">${d}d ${d>7?'⚠️':''}</td><td><button class="btn btn-primary btn-sm" onclick="registrarEntregaConsultor(${a.id},'${me.nombre}');closeModal('modal-admin-detalle')">📤 Entregar</button></td></tr>`;}).join('')}</tbody></table></div>`:'✅ Todo entregado';
  } else if(tipo==='activas'){
    titulo='🔍 Auditorías en Proceso';
    const items=mios.filter(a=>a.estado!=='Completada');
    body=items.length?`<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Tipo</th><th>Estado</th><th>In Situ</th></tr></thead><tbody>${items.map(a=>`<tr><td style="font-weight:600">${a.clienteNombre||'—'}</td><td style="font-size:11px">${a.tipo}</td><td>${badge(a.estado)}</td><td>${a.fInsitu?fmtD(a.fInsitu):'—'}</td></tr>`).join('')}</tbody></table></div>`:'Sin activas';
  } else if(tipo==='completadas'){
    titulo='✅ Completadas';
    const items=mios.filter(a=>a.estado==='Completada');
    body=items.length?`<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Tipo</th><th>Fecha</th><th>Honorario</th></tr></thead><tbody>${items.map(a=>`<tr><td style="font-weight:600">${a.clienteNombre||'—'}</td><td style="font-size:11px">${a.tipo}</td><td>${fmtD(a.fInforme||a.fInsitu)}</td><td style="color:var(--accent3);font-weight:700">${fmt(me.honorarios||300)}</td></tr>`).join('')}</tbody></table></div>`:'Sin completadas';
  }
  let m=document.getElementById('modal-admin-detalle');
  if(!m){m=document.createElement('div');m.className='modal-overlay';m.id='modal-admin-detalle';m.innerHTML='<div class="modal" style="width:900px;max-width:96vw;max-height:90vh;display:flex;flex-direction:column"></div>';document.body.appendChild(m);}
  m.querySelector('.modal').innerHTML=`<div class="modal-head"><div class="modal-title">${titulo}</div><button class="modal-close" onclick="closeModal('modal-admin-detalle')">✕</button></div><div class="modal-body" style="overflow-y:auto;flex:1">${body}</div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal('modal-admin-detalle')">Cerrar</button></div>`;
  m.classList.add('open');
}

// === MI RENDICIÓN ===
function renderMiRendicion(){
  const el=document.getElementById('mi-rendicion-content');if(!el)return;
  const me=_getMyConsultor();if(!me){el.innerHTML=`<div class="empty-state"><div class="icon">⚠️</div><h3>Perfil no vinculado</h3><p style="font-size:12px">Administración debe vincular tu usuario con tu ficha de consultor.<br><strong>Usuarios → Editar → Vincular con Consultor</strong></p></div>`;return;}
  const rendiciones=(S.get('rendiciones_gastos')||[]).filter(r=>r.consultor===me.nombre);
  const auds=S.get('auditorias');
  const total=rendiciones.reduce((s,r)=>s+(Number(r.monto)||0),0);
  const pendientes=rendiciones.filter(r=>r.estadoAprobacion!=='Aprobado');
  const aprobadas=rendiciones.filter(r=>r.estadoAprobacion==='Aprobado');

  el.innerHTML=`
  <div style="display:flex;justify-content:flex-end;margin-bottom:16px"><button class="btn btn-primary" onclick="nuevaRendicionConsultor()">+ Nueva Rendición</button></div>
  <div class="grid-3" style="margin-bottom:20px">
    <div class="stat-card" style="cursor:pointer" onclick="miRendDetalle('total')"><div class="stat-icon red">🧾</div><div class="card-title">Total Rendido</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--danger)">${fmt(total)}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">→</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="miRendDetalle('pend')"><div class="stat-icon orange">⏳</div><div class="card-title">Pendientes</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--warn)">${pendientes.length}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">→</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="miRendDetalle('aprob')"><div class="stat-icon green">✅</div><div class="card-title">Aprobadas</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--accent3)">${aprobadas.length}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">→</div></div>
  </div>
  ${rendiciones.length?`<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Empresa</th><th>Concepto</th><th>Tipo</th><th>Medio</th><th>Comprobante</th><th>Estado</th><th style="text-align:right">Monto</th></tr></thead><tbody>
  ${rendiciones.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(r=>`<tr>
    <td style="font-size:11px;color:var(--muted)">${fmtD(r.fecha)}</td>
    <td style="font-size:12px">${r.empresa||'—'}</td>
    <td style="font-size:12px;font-weight:600">${r.concepto}</td>
    <td style="font-size:11px">${r.tipoGasto||'—'}</td>
    <td style="font-size:11px">${r.medioPago||'—'}</td>
    <td>${r.comprobante?`<a href="${r.comprobante}" target="_blank" style="color:var(--accent);font-size:11px">📎</a>`:'—'}</td>
    <td>${r.estadoAprobacion==='Aprobado'?'<span class="badge badge-success">✅ Aprobado</span>':'<span class="badge badge-warn">⏳ Pendiente</span>'}</td>
    <td style="text-align:right;font-weight:700;color:var(--danger)">${fmt(r.monto)}</td>
  </tr>`).join('')}</tbody></table></div>`
  :'<div class="empty-state"><div class="icon">🧾</div><h3>Sin rendiciones</h3><p>Registrá tus gastos de trabajo</p></div>'}`;
}

function nuevaRendicionConsultor(){
  const me=_getMyConsultor();if(!me)return;
  const auds=S.get('auditorias').filter(a=>a.auditor===me.nombre);
  let m=document.getElementById('modal-rendicion');
  if(!m){m=document.createElement('div');m.className='modal-overlay';m.id='modal-rendicion';m.innerHTML='<div class="modal modal-lg"></div>';document.body.appendChild(m);}
  m.querySelector('.modal').innerHTML=`
    <div class="modal-head"><div class="modal-title">🧾 Nueva Rendición de Gastos</div><button class="modal-close" onclick="closeModal('modal-rendicion')">✕</button></div>
    <div class="modal-body">
      <input type="hidden" id="rend-consultor" value="${me.nombre}">
      <div class="form-row">
        <div class="form-group"><label>Empresa visitada *</label><select id="rend-empresa"><option value="">Seleccionar...</option>${[...new Set(auds.map(a=>a.clienteNombre).filter(Boolean))].map(n=>`<option>${n}</option>`).join('')}</select></div>
        <div class="form-group"><label>Tipo de Gasto *</label><select id="rend-tipo"><option>Transporte</option><option>Alojamiento</option><option>Comida</option><option>Viáticos</option><option>Material de trabajo</option><option>Peaje</option><option>Combustible</option><option>Otro</option></select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Medio de Pago</label><select id="rend-medio"><option>Efectivo</option><option>Tarjeta débito</option><option>Tarjeta crédito</option><option>Transferencia</option><option>Otro</option></select></div>
        <div class="form-group"><label>Monto ($) *</label><input id="rend-monto" type="number" placeholder="0"></div>
      </div>
      <div class="form-group"><label>Concepto / Descripción *</label><input id="rend-concepto" placeholder="Uber, hotel, comida, peaje..."></div>
      <div class="form-row">
        <div class="form-group"><label>Fecha</label><input id="rend-fecha" type="date" value="${todayStr()}"></div>
        <div class="form-group"><label>📎 Comprobante (link Drive) *</label><input id="rend-comprobante" placeholder="https://drive.google.com/..." type="url"></div>
      </div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal('modal-rendicion')">Cancelar</button><button class="btn btn-primary" onclick="saveRendicion();setTimeout(renderMiRendicion,100)">📤 Enviar a Administración</button></div>`;
  m.classList.add('open');
}

function miRendDetalle(tipo){
  const me=_getMyConsultor();if(!me)return;
  const rends=(S.get('rendiciones_gastos')||[]).filter(r=>r.consultor===me.nombre);
  let titulo='',items=[];
  if(tipo==='total'){titulo='🧾 Todas mis Rendiciones';items=rends;}
  else if(tipo==='pend'){titulo='⏳ Pendientes de Aprobación';items=rends.filter(r=>r.estadoAprobacion!=='Aprobado');}
  else if(tipo==='aprob'){titulo='✅ Aprobadas';items=rends.filter(r=>r.estadoAprobacion==='Aprobado');}
  const body=items.length?`<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Empresa</th><th>Concepto</th><th>Tipo</th><th style="text-align:right">Monto</th></tr></thead><tbody>${items.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(r=>`<tr><td style="font-size:11px">${fmtD(r.fecha)}</td><td>${r.empresa||'—'}</td><td style="font-weight:600">${r.concepto}</td><td style="font-size:11px">${r.tipoGasto}</td><td style="text-align:right;color:var(--danger);font-weight:700">${fmt(r.monto)}</td></tr>`).join('')}</tbody></table></div>`:'Sin datos';
  let m=document.getElementById('modal-admin-detalle');
  if(!m){m=document.createElement('div');m.className='modal-overlay';m.id='modal-admin-detalle';m.innerHTML='<div class="modal" style="width:900px;max-width:96vw;max-height:90vh;display:flex;flex-direction:column"></div>';document.body.appendChild(m);}
  m.querySelector('.modal').innerHTML=`<div class="modal-head"><div class="modal-title">${titulo}</div><button class="modal-close" onclick="closeModal('modal-admin-detalle')">✕</button></div><div class="modal-body" style="overflow-y:auto;flex:1">${body}</div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal('modal-admin-detalle')">Cerrar</button></div>`;
  m.classList.add('open');
}

// === MI CALENDARIO ===
let miCalYear=new Date().getFullYear(),miCalMonth=new Date().getMonth();
function renderMiCalendario(){
  const el=document.getElementById('mi-calendario-content');if(!el)return;
  const me=_getMyConsultor();if(!me){el.innerHTML=`<div class="empty-state"><div class="icon">⚠️</div><h3>Perfil no vinculado</h3><p style="font-size:12px">Administración debe vincular tu usuario con tu ficha de consultor.<br><strong>Usuarios → Editar → Vincular con Consultor</strong></p></div>`;return;}
  const auds=S.get('auditorias').filter(a=>a.auditor===me.nombre);
  const entregas=S.get('entregas_consultor')||[];
  const today_=todayStr();
  const MONTHS=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const DOWS=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

  // Build event map
  const evMap={};
  function addEv(date,type,label,audId){if(!date)return;if(!evMap[date])evMap[date]=[];evMap[date].push({type,label,audId});}
  auds.forEach(a=>{
    addEv(a.fInicio,'ev-inicio',`📌 ${a.clienteNombre}`,a.id);
    addEv(a.fDoc,'ev-doc',`📂 ${a.clienteNombre}`,a.id);
    addEv(a.fExterna,'ev-ext',`🔬 ${a.clienteNombre}`,a.id);
    addEv(a.fInsitu,'ev-insitu',`🏢 ${a.clienteNombre}`,a.id);
    addEv(a.fPrep,'ev-prep',`📝 ${a.clienteNombre}`,a.id);
    addEv(a.fInforme,'ev-informe',`✅ ${a.clienteNombre}`,a.id);
    addEv(a.fSeguimiento,'ev-seguimiento',`🔄 ${a.clienteNombre}`,a.id);
  });

  // Adeudados para alerta
  const adeudados=auds.filter(a=>a.estado!=='Completada'&&a.fInsitu&&a.fInsitu<=today_&&!entregas.find(e=>e.auditoriaId===a.id&&e.tipo==='informe'));
  const proximas=auds.filter(a=>a.fInsitu&&a.fInsitu>today_&&a.estado!=='Completada').sort((a,b)=>a.fInsitu.localeCompare(b.fInsitu));

  const firstDay=new Date(miCalYear,miCalMonth,1).getDay();
  const daysInMonth=new Date(miCalYear,miCalMonth+1,0).getDate();
  const prevDays=new Date(miCalYear,miCalMonth,0).getDate();
  let dHtml='';
  for(let i=firstDay-1;i>=0;i--)dHtml+=`<div class="cal-day other-month"><div class="cal-num">${prevDays-i}</div></div>`;
  for(let d=1;d<=daysInMonth;d++){
    const ds=`${miCalYear}-${String(miCalMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const evs=evMap[ds]||[];
    const evHtml=evs.slice(0,3).map(e=>`<div class="cal-event ${e.type}" title="${e.label}">${e.label}</div>`).join('');
    const more=evs.length>3?`<div style="font-size:9px;color:var(--muted)">+${evs.length-3}</div>`:'';
    dHtml+=`<div class="cal-day${ds===today_?' today':''}">${evs.length?`<div class="cal-num" style="background:${evs.some(e=>e.type==='ev-insitu')?'rgba(239,68,68,0.2)':'rgba(212,175,55,0.15)'};border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center">${d}</div>`:`<div class="cal-num">${d}</div>`}${evHtml}${more}</div>`;
  }
  const total=Math.ceil((firstDay+daysInMonth)/7)*7;
  for(let d=1;d<=total-(firstDay+daysInMonth);d++)dHtml+=`<div class="cal-day other-month"><div class="cal-num">${d}</div></div>`;

  el.innerHTML=`
  ${adeudados.length?`<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);border-radius:12px;padding:12px 16px;margin-bottom:14px;animation:pulse 2s infinite">
    <div style="font-weight:700;color:var(--danger);margin-bottom:6px">📤 ${adeudados.length} informe(s) pendiente(s)</div>
    ${adeudados.slice(0,3).map(a=>`<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0"><span><strong>${a.clienteNombre}</strong> · In situ: ${fmtD(a.fInsitu)}</span><button class="btn btn-primary btn-sm" onclick="registrarEntregaConsultor(${a.id},'${me.nombre}')" style="font-size:10px">📤 Entregar</button></div>`).join('')}
  </div>`:''}
  ${proximas.length?`<div style="background:rgba(212,175,55,0.06);border:1px solid rgba(212,175,55,0.2);border-radius:12px;padding:12px 16px;margin-bottom:14px">
    <div style="font-weight:700;color:var(--accent);margin-bottom:6px">📅 Próximas auditorías</div>
    ${proximas.slice(0,4).map(a=>`<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0"><span><strong>${a.clienteNombre}</strong> · ${a.tipo}</span><span style="color:var(--warn);font-weight:600">${fmtD(a.fInsitu)} (en ${diffDays(a.fInsitu)}d)</span></div>`).join('')}
  </div>`:''}
  <div class="cal-wrap">
    <div class="cal-head">
      <div class="cal-title">${MONTHS[miCalMonth]} ${miCalYear}</div>
      <div class="cal-nav">
        <button onclick="miCalMonth--;if(miCalMonth<0){miCalMonth=11;miCalYear--;}renderMiCalendario()">‹</button>
        <button class="btn-today" onclick="miCalMonth=new Date().getMonth();miCalYear=new Date().getFullYear();renderMiCalendario()">Hoy</button>
        <button onclick="miCalMonth++;if(miCalMonth>11){miCalMonth=0;miCalYear++;}renderMiCalendario()">›</button>
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
  </div>

  <div style="margin-top:20px;font-family:'Syne',sans-serif;font-size:14px;font-weight:700;margin-bottom:12px">📋 Listado del Mes</div>
  ${(()=>{
    const ym=miCalYear+'-'+String(miCalMonth+1).padStart(2,'0');
    const mesAuds=auds.filter(a=>(a.fInsitu||a.fInicio||'').startsWith(ym)).sort((a,b)=>(a.fInsitu||'').localeCompare(b.fInsitu||''));
    return mesAuds.length?`<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Tipo</th><th>Estado</th><th>Informe</th></tr></thead><tbody>${mesAuds.map(a=>{
      const ent=entregas.find(e=>e.auditoriaId===a.id&&e.tipo==='informe');
      const venc=a.fInsitu&&a.fInsitu<=today_&&!ent&&a.estado!=='Completada';
      return`<tr style="${venc?'background:rgba(239,68,68,0.04)':''}"><td style="font-weight:700;color:${venc?'var(--danger)':'var(--accent)'}">${fmtD(a.fInsitu||a.fInicio)}</td><td style="font-weight:600">${a.clienteNombre||'—'}</td><td style="font-size:11px">${a.tipo}</td><td>${badge(a.estado)}</td><td>${ent?'<span class="badge badge-success">✅</span>':venc?`<button class="btn btn-primary btn-sm" onclick="registrarEntregaConsultor(${a.id},'${me.nombre}')" style="font-size:10px;animation:pulse 2s infinite">📤 Entregar</button>`:'<span style="font-size:11px;color:var(--muted)">—</span>'}</td></tr>`}).join('')}</tbody></table></div>`:'<div style="color:var(--muted);text-align:center;padding:16px;font-size:12px">Sin auditorías este mes</div>';
  })()}`;}


// === MIS HONORARIOS ===
function renderMiHonorarios(){
  const el=document.getElementById('mi-honorarios-content');if(!el)return;
  const me=_getMyConsultor();if(!me){el.innerHTML=`<div class="empty-state"><div class="icon">⚠️</div><h3>Perfil no vinculado</h3><p style="font-size:12px">Administración debe vincular tu usuario con tu ficha de consultor.<br><strong>Usuarios → Editar → Vincular con Consultor</strong></p></div>`;return;}
  const auds=S.get('auditorias').filter(a=>a.auditor===me.nombre);
  const rendiciones=(S.get('rendiciones_gastos')||[]).filter(r=>r.consultor===me.nombre);
  const ym=todayStr().substring(0,7);
  const honUnit=Number(me.honorarios)||300;
  const completadas=auds.filter(a=>a.estado==='Completada');
  const mesComp=completadas.filter(a=>(a.fInforme||a.fInsitu||'').startsWith(ym));
  const honTotal=completadas.length*honUnit;
  const honMes=mesComp.length*honUnit;
  const rendAprobMes=rendiciones.filter(r=>r.fecha.startsWith(ym)&&r.estadoAprobacion==='Aprobado').reduce((s,r)=>s+(Number(r.monto)||0),0);
  const rendTotalAprob=rendiciones.filter(r=>r.estadoAprobacion==='Aprobado').reduce((s,r)=>s+(Number(r.monto)||0),0);

  el.innerHTML=`
  <div class="grid-4" style="margin-bottom:20px">
    <div class="stat-card" style="cursor:pointer" onclick="dtDetalle('hon_mes_consultor')" title="Ver detalle"><div class="stat-icon green">💰</div><div class="card-title">Honorarios Mes</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--accent3)">${fmt(honMes)}</div><div style="font-size:10px;color:var(--muted)">${mesComp.length} × ${fmt(honUnit)} →</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="dtDetalle('rend_mes_consultor')" title="Ver detalle"><div class="stat-icon orange">🧾</div><div class="card-title">Rendiciones Mes</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--warn)">${fmt(rendAprobMes)}</div><div style="font-size:10px;color:var(--muted)">Aprobadas →</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="dtDetalle('total_cobrar_consultor')" title="Ver detalle"><div class="stat-icon cyan">📊</div><div class="card-title">Total a Cobrar (Mes)</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--accent)">${fmt(honMes+rendAprobMes)}</div><div style="font-size:10px;color:var(--muted)">→</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="dtDetalle('acumulado_consultor')" title="Ver detalle"><div class="stat-icon green">💎</div><div class="card-title">Acumulado Total</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--accent3)">${fmt(honTotal+rendTotalAprob)}</div><div style="font-size:10px;color:var(--muted)">→</div></div>
  </div>

  <div class="card" style="margin-bottom:16px">
    <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;margin-bottom:12px">📋 Auditorías Completadas — Base de Honorarios</div>
    <div style="background:var(--surface2);border-radius:8px;padding:10px 14px;font-size:12px;margin-bottom:12px">Valor por auditoría: <strong style="color:var(--accent3)">${fmt(honUnit)}</strong> · Forma: <strong>${me.formapago||'—'}</strong> ${me.cbu?'· CBU: '+me.cbu:''}</div>
    ${completadas.length?`<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Tipo</th><th>Fecha</th><th style="text-align:right">Honorario</th></tr></thead><tbody>
    ${completadas.sort((a,b)=>(b.fInforme||b.fInsitu||'').localeCompare(a.fInforme||a.fInsitu||'')).map(a=>`<tr><td style="font-weight:600">${a.clienteNombre||'—'}</td><td style="font-size:11px">${a.tipo}</td><td style="font-size:12px;color:var(--muted)">${fmtD(a.fInforme||a.fInsitu)}</td><td style="text-align:right;color:var(--accent3);font-weight:700">${fmt(honUnit)}</td></tr>`).join('')}
    <tr style="border-top:2px solid var(--border)"><td colspan="3" style="font-weight:800">Total</td><td style="text-align:right;font-weight:800;color:var(--accent3)">${fmt(honTotal)}</td></tr>
    </tbody></table></div>`:'<div style="color:var(--muted);text-align:center;padding:20px">Sin auditorías completadas</div>'}
  </div>`;
}

// Notificaciones para consultores
function enviarNotifConsultor(consultorNombre,titulo,mensaje,tipo,data){
  const notifs=S.get('notif_consultor')||[];
  notifs.push({id:Date.now(),consultor:consultorNombre,titulo,mensaje,tipo,data:data||{},fecha:todayStr(),leida:false});
  S.set('notif_consultor',notifs);
}

function marcarLeidaNotif(id){
  const notifs=S.get('notif_consultor')||[];
  const n=notifs.find(x=>x.id===id);if(n)n.leida=true;
  S.set('notif_consultor',notifs);renderMiPanel();
}

function confirmarAuditoriaConsultor(notifId){
  const notifs=S.get('notif_consultor')||[];
  const n=notifs.find(x=>x.id===notifId);
  if(n){n.leida=true;n.respuesta='confirmada';}
  S.set('notif_consultor',notifs);
  toast('✅ Auditoría confirmada — agregada a tu calendario');
  renderMiPanel();
}

function rechazarAuditoriaConsultor(notifId){
  if(!confirm('¿Rechazar esta auditoría?'))return;
  const notifs=S.get('notif_consultor')||[];
  const n=notifs.find(x=>x.id===notifId);
  if(n){n.leida=true;n.respuesta='rechazada';}
  S.set('notif_consultor',notifs);
  toast('❌ Auditoría rechazada — se notificará a Administración');
  renderMiPanel();
}

// =====================================================
// DIRECCIÓN TÉCNICA MODULE

// ── mg-portal.js ──

// =====================================================
let _inDirTecModule=false;
function enterDirTecModule(){
  _inAdminModule=false;document.getElementById('nav-admin').style.display='none';
  _inDirTecModule=true;
  document.getElementById('nav-main').style.display='none';
  document.getElementById('nav-dirtec').style.display='';
  showDirTecPage('dirtec');
}
function exitDirTecModule(){
  _inDirTecModule=false;
  document.getElementById('nav-dirtec').style.display='none';
  document.getElementById('nav-main').style.display='';
  showPage('dashboard');
}
function showDirTecPage(name){
  _inDirTecModule=true;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const pg=document.getElementById('page-'+name);if(pg)pg.classList.add('active');
  document.getElementById('pageTitle').textContent=PAGE_TITLES[name]||name;
  document.querySelectorAll('#nav-dirtec .nav-item').forEach(el=>{
    el.classList.toggle('active',el.getAttribute('onclick')?.includes("'"+name+"'"));
  });
  const fn={dirtec:renderDirTec,dirtec_impl:renderDirTecImpl,dirtec_capacidad:renderDirTecCapacidad,dirtec_rendicion:renderDirTecRendicion,dirtec_honorarios:renderDirTecHonorarios,dirtec_entregas:renderDirTecEntregas};
  if(fn[name])fn[name]();
}

// Detail modals for all DirTec + other sections
function dtDetalle(tipo){
  const auds=S.get('auditorias'),entregas=S.get('entregas_consultor')||[],rendiciones=S.get('rendiciones_gastos')||[];
  const consultores=S.get('auditores').filter(a=>a.estado!=='Inactivo');
  const cobros=S.get('cobros');const today_=todayStr();const ym=today_.substring(0,7);
  let titulo='',body='';
  const MES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  if(tipo==='consultores_activos'){
    titulo='🧑‍🔬 Consultores Activos';
    body=consultores.map(c=>{const m=auds.filter(a=>a.auditor===c.nombre&&a.estado!=='Completada').length;return`<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)"><div style="display:flex;align-items:center;gap:10px"><div class="person-avatar" style="background:linear-gradient(135deg,#9a7830,#d4af37);width:32px;height:32px;font-size:12px">${c.nombre.substring(0,2).toUpperCase()}</div><div><strong>${c.nombre}</strong><div style="font-size:11px;color:var(--muted)">${c.especialidad} · Cap: ${c.maxauds||4} auds / ${c.maximpls||2} impls</div></div></div><div style="text-align:right"><span class="badge badge-${m?'warn':'success'}">${m} activas</span></div></div>`;}).join('')||'Sin consultores';
  }
  else if(tipo==='auds_activas_dt'){
    titulo='🔍 Auditorías Activas';
    const items=auds.filter(a=>a.estado!=='Completada');
    body=items.length?`<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Consultor</th><th>Tipo</th><th>Estado</th><th>In Situ</th></tr></thead><tbody>${items.map(a=>`<tr><td style="font-weight:600">${a.clienteNombre||'—'}</td><td>${a.auditor||'—'}</td><td style="font-size:11px">${a.tipo}</td><td>${badge(a.estado)}</td><td style="font-size:12px">${a.fInsitu?fmtD(a.fInsitu):'—'}</td></tr>`).join('')}</tbody></table></div>`:'Sin auditorías activas';
  }
  else if(tipo==='insitu_mes'){
    titulo='📅 In Situ este Mes';
    const items=auds.filter(a=>(a.fInsitu||'').startsWith(ym));
    body=items.length?`<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Consultor</th><th>Tipo</th><th>Estado</th></tr></thead><tbody>${items.sort((a,b)=>(a.fInsitu||'').localeCompare(b.fInsitu||'')).map(a=>`<tr><td style="font-weight:600">${fmtD(a.fInsitu)}</td><td>${a.clienteNombre||'—'}</td><td>${a.auditor||'—'}</td><td style="font-size:11px">${a.tipo}</td><td>${badge(a.estado)}</td></tr>`).join('')}</tbody></table></div>`:'Sin visitas este mes';
  }
  else if(tipo==='informes_adeudados'){
    titulo='📤 Informes Adeudados';
    const items=auds.filter(a=>{if(a.estado==='Completada'||!a.fInsitu||a.fInsitu>today_)return false;return!entregas.find(e=>e.auditoriaId===a.id&&e.tipo==='informe');});
    body=items.length?`<div class="table-wrap"><table><thead><tr><th>Consultor</th><th>Cliente</th><th>In Situ</th><th>Días</th><th>Estado</th></tr></thead><tbody>${items.sort((a,b)=>(a.fInsitu||'').localeCompare(b.fInsitu||'')).map(a=>{const d=Math.abs(diffDays(a.fInsitu));return`<tr style="background:${d>7?'rgba(239,68,68,0.04)':''}"><td style="font-weight:600">${a.auditor||'—'}</td><td>${a.clienteNombre||'—'}</td><td>${fmtD(a.fInsitu)}</td><td style="font-weight:700;color:${d>7?'var(--danger)':'var(--warn)'}">${d}d</td><td><span class="badge badge-${d>7?'danger':'warn'}">${d>7?'VENCIDO':'Pendiente'}</span></td></tr>`;}).join('')}</tbody></table></div>`:'✅ Todos al día';
  }
  else if(tipo==='total_rendido'){
    titulo='🧾 Total Rendido';
    const byConsultor={};rendiciones.forEach(r=>{byConsultor[r.consultor]=(byConsultor[r.consultor]||0)+(Number(r.monto)||0);});
    body=`<div style="margin-bottom:14px">${Object.entries(byConsultor).sort((a,b)=>b[1]-a[1]).map(([c,m])=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><strong>${c}</strong><span style="color:var(--danger);font-weight:700">${fmt(m)}</span></div>`).join('')}</div>`;
  }
  else if(tipo==='rendiciones_count'){
    titulo='📋 Todas las Rendiciones';
    body=rendiciones.length?`<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Consultor</th><th>Concepto</th><th>Tipo</th><th style="text-align:right">Monto</th></tr></thead><tbody>${rendiciones.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(r=>`<tr><td style="font-size:11px">${fmtD(r.fecha)}</td><td style="font-weight:600">${r.consultor}</td><td style="font-size:12px">${r.concepto}</td><td style="font-size:11px">${r.tipoGasto||'—'}</td><td style="text-align:right;color:var(--danger);font-weight:700">${fmt(r.monto)}</td></tr>`).join('')}</tbody></table></div>`:'Sin rendiciones';
  }
  else if(tipo==='pend_aprobacion'){
    titulo='⏳ Pendientes de Aprobación';
    const pend=rendiciones.filter(r=>r.estadoAprobacion!=='Aprobado');
    body=pend.length?`<div class="table-wrap"><table><thead><tr><th>Consultor</th><th>Concepto</th><th>Monto</th><th></th></tr></thead><tbody>${pend.map(r=>`<tr><td style="font-weight:600">${r.consultor}</td><td>${r.concepto}</td><td style="color:var(--danger);font-weight:700">${fmt(r.monto)}</td><td><button class="btn btn-primary btn-sm" onclick="aprobarRendicion(${r.id});closeModal('modal-admin-detalle');setTimeout(renderDirTecRendicion,100)">✅ Aprobar</button></td></tr>`).join('')}</tbody></table></div>`:'Sin pendientes';
  }
  else if(tipo==='aprobadas'){
    titulo='✅ Rendiciones Aprobadas';
    const apr=rendiciones.filter(r=>r.estadoAprobacion==='Aprobado');
    body=apr.length?`<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Consultor</th><th>Concepto</th><th style="text-align:right">Monto</th></tr></thead><tbody>${apr.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(r=>`<tr><td style="font-size:11px">${fmtD(r.fecha)}</td><td style="font-weight:600">${r.consultor}</td><td style="font-size:12px">${r.concepto}</td><td style="text-align:right;color:var(--accent3);font-weight:700">${fmt(r.monto)}</td></tr>`).join('')}</tbody></table></div>`:'Sin aprobadas';
  }
  else if(tipo==='hon_mes'){
    titulo='💰 Honorarios del Mes';
    body=consultores.map(c=>{const comp=auds.filter(a=>a.auditor===c.nombre&&a.estado==='Completada'&&(a.fInforme||a.fInsitu||'').startsWith(ym));const h=comp.length*(Number(c.honorarios)||300);return comp.length?`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><div><strong>${c.nombre}</strong><span style="font-size:11px;color:var(--muted)"> · ${comp.length} completada(s) × ${fmt(c.honorarios||300)}</span></div><span style="color:var(--accent3);font-weight:700">${fmt(h)}</span></div>`:''}).filter(Boolean).join('')||'Sin honorarios este mes';
  }
  else if(tipo==='rend_mes'){
    titulo='🧾 Rendiciones Aprobadas del Mes';
    const mesRend=rendiciones.filter(r=>r.fecha.startsWith(ym)&&r.estadoAprobacion==='Aprobado');
    body=mesRend.length?`<div class="table-wrap"><table><thead><tr><th>Consultor</th><th>Concepto</th><th>Tipo</th><th style="text-align:right">Monto</th></tr></thead><tbody>${mesRend.map(r=>`<tr><td style="font-weight:600">${r.consultor}</td><td style="font-size:12px">${r.concepto}</td><td style="font-size:11px">${r.tipoGasto||'—'}</td><td style="text-align:right;color:var(--warn);font-weight:700">${fmt(r.monto)}</td></tr>`).join('')}</tbody></table></div>`:'Sin rendiciones aprobadas este mes';
  }
  else if(tipo==='total_pagar'){
    titulo='📊 Total a Pagar (Mes)';
    body=consultores.map(c=>{const comp=auds.filter(a=>a.auditor===c.nombre&&a.estado==='Completada'&&(a.fInforme||a.fInsitu||'').startsWith(ym));const hon=comp.length*(Number(c.honorarios)||300);const rend=rendiciones.filter(r=>r.consultor===c.nombre&&r.fecha.startsWith(ym)&&r.estadoAprobacion==='Aprobado').reduce((s,r)=>s+(Number(r.monto)||0),0);const t=hon+rend;return t?`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><strong>${c.nombre}</strong><div><span style="color:var(--accent3)">${fmt(hon)} hon</span> + <span style="color:var(--warn)">${fmt(rend)} rend</span> = <strong style="color:var(--accent)">${fmt(t)}</strong></div></div>`:''}).filter(Boolean).join('')||'Sin pagos este mes';
  }
  else if(tipo==='vencidos_7d'){
    titulo='⏰ Vencidos +7 días';
    const items=auds.filter(a=>{if(a.estado==='Completada'||!a.fInsitu||a.fInsitu>today_)return false;if(diffDays(a.fInsitu)>=-7)return false;return!entregas.find(e=>e.auditoriaId===a.id&&e.tipo==='informe');});
    body=items.length?items.map(a=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><div><strong>${a.auditor||'—'}</strong> → ${a.clienteNombre}</div><span style="color:var(--danger);font-weight:700">${Math.abs(diffDays(a.fInsitu))} días</span></div>`).join(''):'✅ Ninguno vencido';
  }
  else if(tipo==='entregas_hist'){
    titulo='📤 Entregas Realizadas';
    body=entregas.length?`<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Consultor</th><th>Cliente</th><th>Informe</th></tr></thead><tbody>${entregas.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(e=>`<tr><td style="font-size:11px">${fmtD(e.fecha)}</td><td style="font-weight:600">${e.consultor}</td><td>${e.clienteNombre||'—'}</td><td>${e.linkInforme?`<a href="${e.linkInforme}" target="_blank" style="color:var(--accent)">📄 Ver</a>`:'—'}</td></tr>`).join('')}</tbody></table></div>`:'Sin entregas';
  }
  else if(tipo==='cobro_esperado'){
    titulo='💰 Total Esperado (Facturación)';
    let totalE=0;cobros.forEach(c=>c.cuotas.forEach(q=>totalE+=q.monto));
    body=`<div style="font-size:14px;margin-bottom:14px">Total contratos: <strong style="color:var(--accent)">${fmt(totalE)}</strong></div><div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Cuotas</th><th>Total</th></tr></thead><tbody>${cobros.map(c=>{const t=c.cuotas.reduce((s,q)=>s+q.monto,0);return`<tr><td style="font-weight:600">${c.concepto||c.auditoriaNombre}</td><td>${c.nCuotas}</td><td style="color:var(--accent);font-weight:700">${fmt(t)}</td></tr>`;}).join('')}</tbody></table></div>`;
  }
  else if(tipo==='cobro_cobrado'){
    titulo='✅ Cobrado';let items=[];cobros.forEach(c=>c.cuotas.forEach(q=>{if(q.estado==='Pagada')items.push({cliente:c.concepto||c.auditoriaNombre,monto:q.montoCobrado||q.monto,fecha:q.fechaPago});}));
    const t=items.reduce((s,i)=>s+(Number(i.monto)||0),0);
    body=`<div style="margin-bottom:10px">Total: <strong style="color:var(--accent3)">${fmt(t)}</strong></div>`+(items.length?`<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Fecha</th><th style="text-align:right">Monto</th></tr></thead><tbody>${items.sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')).map(i=>`<tr><td style="font-weight:600">${i.cliente}</td><td style="font-size:12px">${fmtD(i.fecha)}</td><td style="text-align:right;color:var(--accent3);font-weight:700">${fmt(i.monto)}</td></tr>`).join('')}</tbody></table></div>`:'Sin cobros');
  }
  else if(tipo==='cobro_pendiente'){
    titulo='⏳ Pendiente de Cobro';let items=[];cobros.forEach(c=>c.cuotas.forEach(q=>{if(q.estado==='Pendiente')items.push({cliente:c.concepto||c.auditoriaNombre,monto:q.monto,vto:q.fechaVto});}));
    body=items.length?`<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Vencimiento</th><th style="text-align:right">Monto</th></tr></thead><tbody>${items.sort((a,b)=>(a.vto||'').localeCompare(b.vto||'')).map(i=>`<tr><td style="font-weight:600">${i.cliente}</td><td style="font-size:12px;color:${i.vto<today_?'var(--danger)':'var(--muted)'}">${fmtD(i.vto)} ${i.vto<today_?'⚠️':''}</td><td style="text-align:right;color:var(--warn);font-weight:700">${fmt(i.monto)}</td></tr>`).join('')}</tbody></table></div>`:'Sin pendientes';
  }
  else if(tipo==='cobro_vencido'){
    titulo='🔴 Vencido sin Cobrar';let items=[];cobros.forEach(c=>c.cuotas.forEach(q=>{if(q.estado!=='Pagada'&&q.fechaVto<today_)items.push({cliente:c.concepto||c.auditoriaNombre,monto:q.monto,vto:q.fechaVto});}));
    body=items.length?`<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Vencimiento</th><th>Días</th><th style="text-align:right">Monto</th></tr></thead><tbody>${items.sort((a,b)=>(a.vto||'').localeCompare(b.vto||'')).map(i=>`<tr><td style="font-weight:600">${i.cliente}</td><td style="font-size:12px;color:var(--danger)">${fmtD(i.vto)}</td><td style="color:var(--danger);font-weight:700">${Math.abs(diffDays(i.vto))}d</td><td style="text-align:right;color:var(--danger);font-weight:700">${fmt(i.monto)}</td></tr>`).join('')}</tbody></table></div>`:'✅ Sin vencidos';
  }
  else{titulo='Detalle';body='Sin datos';}

  let m=document.getElementById('modal-admin-detalle');
  if(!m){m=document.createElement('div');m.className='modal-overlay';m.id='modal-admin-detalle';m.innerHTML='<div class="modal" style="width:900px;max-width:96vw;max-height:90vh;display:flex;flex-direction:column"></div>';document.body.appendChild(m);}
  m.querySelector('.modal').innerHTML=`<div class="modal-head"><div class="modal-title">${titulo}</div><button class="modal-close" onclick="closeModal('modal-admin-detalle')">✕</button></div><div class="modal-body" style="overflow-y:auto;flex:1">${body}</div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal('modal-admin-detalle')">Cerrar</button></div>`;
  m.classList.add('open');
}

// === PANEL GENERAL (Global + Individual) ===
function renderDirTec(){
  const el=document.getElementById('dirtec-content');if(!el)return;
  const consultores=S.get('auditores').filter(a=>a.estado!=='Inactivo');
  const auds=S.get('auditorias');const today_=todayStr();const ym=today_.substring(0,7);
  const entregas=S.get('entregas_consultor')||[];

  // Global stats
  const totalActivas=auds.filter(a=>a.estado!=='Completada').length;
  const totalMes=auds.filter(a=>(a.fInsitu||'').startsWith(ym)).length;
  // Informes adeudados: auditoría con fInsitu pasada (>0 dias) y sin entrega de informe
  const informesAdeudados=auds.filter(a=>{
    if(a.estado==='Completada')return false;
    if(!a.fInsitu||a.fInsitu>today_)return false;
    const entrega=entregas.find(e=>e.auditoriaId===a.id&&e.tipo==='informe');
    return !entrega;
  });
  const vencidos7d=informesAdeudados.filter(a=>diffDays(a.fInsitu)<-7);

  el.innerHTML=`
  <div class="grid-4" style="margin-bottom:20px">
    <div class="stat-card" style="cursor:pointer" onclick="dtDetalle('consultores_activos')"><div class="stat-icon green">🧑‍🔬</div><div class="card-title">Consultores Activos</div><div style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:var(--accent3)">${consultores.length}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">Click para ver detalle →</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="dtDetalle('auds_activas_dt')"><div class="stat-icon cyan">🔍</div><div class="card-title">Auditorías Activas</div><div style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:var(--accent)">${totalActivas}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">Click para ver detalle →</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="dtDetalle('insitu_mes')"><div class="stat-icon orange">📅</div><div class="card-title">In Situ este Mes</div><div style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:var(--warn)">${totalMes}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">Click para ver detalle →</div></div>
    <div class="stat-card" style="cursor:pointer;border-color:${vencidos7d.length?'rgba(239,68,68,0.3)':'rgba(200,168,74,0.2)'}" onclick="dtDetalle('informes_adeudados')"><div class="stat-icon ${vencidos7d.length?'red':'green'}">📤</div><div class="card-title">Informes Adeudados</div><div style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:${informesAdeudados.length?'var(--danger)':'var(--accent3)'}">${informesAdeudados.length}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">Click para ver detalle →</div></div>
  </div>

  ${vencidos7d.length?`<div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:12px;padding:14px 18px;margin-bottom:16px;animation:pulse 2s infinite">
    <div style="font-family:'Syne',sans-serif;font-weight:700;color:var(--danger);margin-bottom:6px">🚨 ${vencidos7d.length} informe(s) vencido(s) (+7 días)</div>
    ${vencidos7d.slice(0,5).map(a=>`<div style="font-size:12px;padding:4px 0;border-bottom:1px solid rgba(239,68,68,0.15)"><strong>${a.auditor||'—'}</strong> → ${a.clienteNombre} · In situ: ${fmtD(a.fInsitu)} <span style="color:var(--danger);font-weight:700">(${Math.abs(diffDays(a.fInsitu))} días)</span></div>`).join('')}
  </div>`:''}

  <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;margin-bottom:14px">👥 Panel Individual por Consultor</div>
  <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px">
    ${consultores.map(c=>`<button class="btn btn-secondary btn-sm" onclick="verPanelConsultor(${c.id})" style="font-size:12px">${c.nombre}</button>`).join('')}
  </div>

  <div class="grid-2">
  ${consultores.map(c=>{
    const mios=auds.filter(a=>a.auditor===c.nombre);
    const activas=mios.filter(a=>a.estado!=='Completada');
    const mesMios=mios.filter(a=>(a.fInsitu||'').startsWith(ym));
    const adeudados=mios.filter(a=>a.estado!=='Completada'&&a.fInsitu&&a.fInsitu<=today_&&!entregas.find(e=>e.auditoriaId===a.id&&e.tipo==='informe'));
    const maxA=Number(c.maxauds)||4;
    const maxI=Number(c.maximpls)||2;
    const usedA=mesMios.filter(a=>a.tipo!=='Implementación ISO 72001').length;
    const usedI=mesMios.filter(a=>a.tipo==='Implementación ISO 72001').length;
    return`<div class="card" style="cursor:pointer;border-color:${adeudados.length?'rgba(239,68,68,0.3)':'rgba(200,168,74,0.15)'}" onclick="verPanelConsultor(${c.id})">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <div class="person-avatar" style="background:linear-gradient(135deg,#9a7830,#d4af37);width:40px;height:40px;font-size:14px">${c.nombre.substring(0,2).toUpperCase()}</div>
        <div style="flex:1"><div style="font-weight:700">${c.nombre}</div><div style="font-size:11px;color:var(--muted)">${c.especialidad}</div></div>
        ${adeudados.length?`<span class="badge badge-danger">📤 ${adeudados.length} adeudado(s)</span>`:`<span class="badge badge-success">✅ Al día</span>`}
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
        <div class="v-stat"><div class="v-stat-label">Activas</div><div class="v-stat-value">${activas.length}</div></div>
        <div class="v-stat"><div class="v-stat-label">Mes</div><div class="v-stat-value" style="color:var(--accent)">${mesMios.length}</div></div>
        <div class="v-stat"><div class="v-stat-label">Cap. Auds</div><div class="v-stat-value" style="color:${usedA>=maxA?'var(--danger)':'var(--accent3)'}">${usedA}/${maxA}</div></div>
        <div class="v-stat"><div class="v-stat-label">Cap. Impl</div><div class="v-stat-value" style="color:${usedI>=maxI?'var(--danger)':'var(--accent3)'}">${usedI}/${maxI}</div></div>
      </div>
    </div>`;
  }).join('')}
  </div>`;
}

// Panel individual consultor (modal completo)
function verPanelConsultor(id){
  const c=S.get('auditores').find(x=>x.id===id);if(!c)return;
  const auds=S.get('auditorias'),entregas=S.get('entregas_consultor')||[],rendiciones=S.get('rendiciones_gastos')||[];
  const today_=todayStr(),ym=today_.substring(0,7);
  const mios=auds.filter(a=>a.auditor===c.nombre);
  const activas=mios.filter(a=>a.estado!=='Completada');
  const completadas=mios.filter(a=>a.estado==='Completada');
  const mesMios=mios.filter(a=>(a.fInsitu||'').startsWith(ym));
  const hon=completadas.length*(Number(c.honorarios)||300);
  const adeudados=mios.filter(a=>a.estado!=='Completada'&&a.fInsitu&&a.fInsitu<=today_&&!entregas.find(e=>e.auditoriaId===a.id&&e.tipo==='informe'));
  const misRendiciones=rendiciones.filter(r=>r.consultor===c.nombre);
  const misEntregas=entregas.filter(e=>e.consultor===c.nombre);

  let m=document.getElementById('modal-panel-consultor');
  if(!m){m=document.createElement('div');m.className='modal-overlay';m.id='modal-panel-consultor';m.innerHTML='<div class="modal" style="width:960px;max-width:96vw;max-height:92vh;display:flex;flex-direction:column"></div>';document.body.appendChild(m);}
  m.querySelector('.modal').innerHTML=`
  <div class="modal-head" style="background:linear-gradient(135deg,rgba(5,150,105,0.1),rgba(212,175,55,0.05))">
    <div class="modal-title" style="color:var(--accent3)">🧑‍🔬 ${c.nombre} — Panel Individual</div>
    <button class="modal-close" onclick="closeModal('modal-panel-consultor')">✕</button>
  </div>
  <div class="modal-body" style="overflow-y:auto;flex:1">
    <!-- KPIs -->
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px">
      <div style="text-align:center;padding:12px;background:var(--surface2);border-radius:10px"><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--accent)">${activas.length}</div><div style="font-size:10px;color:var(--muted)">Activas</div></div>
      <div style="text-align:center;padding:12px;background:var(--surface2);border-radius:10px"><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--accent3)">${completadas.length}</div><div style="font-size:10px;color:var(--muted)">Completadas</div></div>
      <div style="text-align:center;padding:12px;background:var(--surface2);border-radius:10px"><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--warn)">${mesMios.length}</div><div style="font-size:10px;color:var(--muted)">Este Mes</div></div>
      <div style="text-align:center;padding:12px;background:var(--surface2);border-radius:10px"><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--accent3)">${fmt(hon)}</div><div style="font-size:10px;color:var(--muted)">Honorarios Acum.</div></div>
      <div style="text-align:center;padding:12px;background:${adeudados.length?'rgba(239,68,68,0.08)':'rgba(200,168,74,0.08)'};border-radius:10px;border:1px solid ${adeudados.length?'rgba(239,68,68,0.2)':'rgba(200,168,74,0.2)'}"><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:${adeudados.length?'var(--danger)':'var(--accent3)'}">${adeudados.length}</div><div style="font-size:10px;color:var(--muted)">Informes Adeudados</div></div>
    </div>

    ${adeudados.length?`<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:12px;margin-bottom:16px">
      <div style="font-size:12px;font-weight:700;color:var(--danger);margin-bottom:6px">⚠️ Informes pendientes de entrega (7 días máx.)</div>
      ${adeudados.map(a=>{const dias=Math.abs(diffDays(a.fInsitu));return`<div style="display:flex;justify-content:space-between;font-size:11px;padding:4px 0;border-bottom:1px solid rgba(239,68,68,0.1)"><span><strong>${a.clienteNombre}</strong> · In situ: ${fmtD(a.fInsitu)}</span><span style="color:${dias>7?'var(--danger)':'var(--warn)'}"> ${dias} días · <a href="#" onclick="event.preventDefault();registrarEntregaConsultor(${a.id},'${c.nombre}')" style="color:var(--accent)">📤 Entregar</a></span></div>`;}).join('')}
    </div>`:''}

    <!-- Auditorías activas -->
    <div style="font-size:12px;font-weight:700;margin-bottom:8px">🔍 Auditorías en Proceso</div>
    ${activas.length?`<div class="table-wrap" style="margin-bottom:16px"><table><thead><tr><th>Cliente</th><th>Tipo</th><th>Estado</th><th>In Situ</th><th>Informe</th></tr></thead><tbody>
    ${activas.map(a=>{const entrega=entregas.find(e=>e.auditoriaId===a.id&&e.tipo==='informe');return`<tr><td style="font-weight:600">${a.clienteNombre||'—'}</td><td style="font-size:11px">${a.tipo}</td><td>${badge(a.estado)}</td><td style="font-size:12px">${a.fInsitu?fmtD(a.fInsitu):'—'}</td><td>${entrega?`<span class="badge badge-success">✅ ${fmtD(entrega.fecha)}</span>`:(a.fInsitu&&a.fInsitu<=today_?`<button class="btn btn-primary btn-sm" onclick="registrarEntregaConsultor(${a.id},'${c.nombre}')" style="font-size:10px">📤 Entregar</button>`:'<span style="font-size:11px;color:var(--muted)">Pendiente</span>')}</td></tr>`;}).join('')}
    </tbody></table></div>`:'<div style="color:var(--muted);font-size:12px;margin-bottom:16px">Sin auditorías activas</div>'}

    <!-- Completadas -->
    <div style="font-size:12px;font-weight:700;margin-bottom:8px">✅ Auditorías Completadas (${completadas.length})</div>
    ${completadas.length?`<div class="table-wrap" style="margin-bottom:16px"><table><thead><tr><th>Cliente</th><th>Tipo</th><th>Fecha</th><th>Honorario</th></tr></thead><tbody>
    ${completadas.slice(0,10).map(a=>`<tr><td style="font-weight:600">${a.clienteNombre||'—'}</td><td style="font-size:11px">${a.tipo}</td><td style="font-size:12px;color:var(--muted)">${fmtD(a.fInforme||a.fInsitu)}</td><td style="color:var(--accent3);font-weight:600">${fmt(c.honorarios||300)}</td></tr>`).join('')}
    </tbody></table></div>`:''}

    <!-- Rendiciones -->
    <div style="font-size:12px;font-weight:700;margin-bottom:8px">🧾 Últimas Rendiciones de Gastos</div>
    ${misRendiciones.length?`<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Tipo</th><th>Medio</th><th>Monto</th></tr></thead><tbody>
    ${misRendiciones.sort((a,b)=>b.fecha.localeCompare(a.fecha)).slice(0,8).map(r=>`<tr><td style="font-size:11px;color:var(--muted)">${fmtD(r.fecha)}</td><td style="font-weight:600;font-size:12px">${r.concepto}</td><td style="font-size:11px">${r.tipoGasto||'—'}</td><td style="font-size:11px">${r.medioPago||'—'}</td><td style="color:var(--danger);font-weight:600">${fmt(r.monto)}</td></tr>`).join('')}
    </tbody></table></div>`:'<div style="color:var(--muted);font-size:12px">Sin rendiciones</div>'}
  </div>
  <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal('modal-panel-consultor')">Cerrar</button></div>`;
  m.classList.add('open');
}

// === IMPLEMENTACIONES ACTIVAS ===
const IMPL_LIMIT=10;
const IMPL_DURATION_MONTHS=4;

function _implEndDate(startDate){
  if(!startDate)return null;
  const d=new Date(startDate+'T00:00:00');
  d.setMonth(d.getMonth()+IMPL_DURATION_MONTHS);
  return d.toISOString().split('T')[0];
}

function renderDirTecImpl(){
  const el=document.getElementById('dirtec-impl-content');if(!el)return;
  const auds=S.get('auditorias');
  const consultores=S.get('auditores').filter(a=>a.estado!=='Inactivo');
  const today_=todayStr(),ym=today_.substring(0,7);

  const allImpl=auds.filter(a=>a.tipo==='Implementación ISO 72001');
  // Active = not Completada AND (no start date OR end date hasn't passed)
  const activas=allImpl.filter(a=>{
    if(a.estado==='Completada')return false;
    const end=_implEndDate(a.fInicio);
    if(end && end<today_)return false; // duration expired
    return true;
  });
  const completadas=allImpl.filter(a=>a.estado==='Completada' || (a.fInicio && _implEndDate(a.fInicio)<today_ && a.estado!=='Completada'));
  const count=activas.length;
  const isFull=count>=IMPL_LIMIT;
  const pct=Math.min(count/IMPL_LIMIT,1);

  // SVG gauge
  const gW=280,gH=160,r=110,strokeW=18;
  const startAngle=Math.PI,endAngle=2*Math.PI;
  const sweepAngle=(endAngle-startAngle)*pct;
  const x1=gW/2+r*Math.cos(startAngle),y1=gH-10+r*Math.sin(startAngle);
  const x2=gW/2+r*Math.cos(startAngle+sweepAngle),y2=gH-10+r*Math.sin(startAngle+sweepAngle);
  const largeArc=sweepAngle>Math.PI?1:0;
  const gaugeCol=isFull?'#ef4444':count>=7?'#f59e0b':count>=4?'#d4af37':'#c8a84a';
  const bgX2=gW/2+r*Math.cos(endAngle),bgY2=gH-10+r*Math.sin(endAngle);

  // 6-month capacity forecast: when do current impls end?
  const forecast=[];
  for(let i=0;i<6;i++){
    const d=new Date(new Date().getFullYear(),new Date().getMonth()+i,1);
    const mym=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    const mEnd=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(new Date(d.getFullYear(),d.getMonth()+1,0).getDate()).padStart(2,'0');
    // Impls active during this month
    const activeThisMonth=allImpl.filter(a=>{
      if(a.estado==='Completada')return false;
      const start=a.fInicio||today_;
      const end=_implEndDate(start);
      return start<=mEnd && end>=mym+'-01';
    });
    // Impls ending this month
    const endingThisMonth=allImpl.filter(a=>{
      if(a.estado==='Completada')return false;
      const end=_implEndDate(a.fInicio);
      return end && end.startsWith(mym);
    });
    const slotsLibres=IMPL_LIMIT-activeThisMonth.length;
    forecast.push({mym,activeCount:activeThisMonth.length,ending:endingThisMonth.length,slotsLibres,active:activeThisMonth,endingList:endingThisMonth});
  }
  const MESA=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  // By consultant
  const byConsultor={};
  activas.forEach(a=>{if(a.auditor){if(!byConsultor[a.auditor])byConsultor[a.auditor]=[];byConsultor[a.auditor].push(a);}});

  el.innerHTML=`
  ${isFull?`<div style="background:rgba(239,68,68,0.12);border:2px solid rgba(239,68,68,0.5);border-radius:14px;padding:18px;margin-bottom:20px;text-align:center;animation:pulse 1.5s infinite"><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--danger)">🚨 CAPACIDAD MÁXIMA ALCANZADA</div><div style="font-size:13px;color:var(--danger);margin-top:4px">${count}/${IMPL_LIMIT} empresas en implementación — No se pueden tomar nuevas</div><div style="font-size:11px;color:var(--danger);margin-top:6px">Próxima liberación: ${forecast.find(f=>f.ending>0)?MESA[parseInt(forecast.find(f=>f.ending>0).mym.split('-')[1])-1]+' ('+forecast.find(f=>f.ending>0).ending+' finalizan)':'Sin finalizaciones próximas'}</div></div>`
  :count>=7?`<div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:14px;padding:14px;margin-bottom:20px;text-align:center;animation:pulse 2s infinite"><div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:var(--warn)">⚠️ ${count}/${IMPL_LIMIT} empresas — Quedan ${IMPL_LIMIT-count} lugares</div></div>`:''}

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
    <!-- Gauge -->
    <div class="card" style="text-align:center;border-color:${isFull?'rgba(239,68,68,0.4)':'rgba(212,175,55,0.2)'};${isFull?'animation:pulse 1.5s infinite':''}">
      <svg width="${gW}" height="${gH}" viewBox="0 0 ${gW} ${gH}" style="margin:0 auto;display:block">
        <path d="M ${x1} ${y1} A ${r} ${r} 0 1 1 ${bgX2} ${bgY2}" fill="none" stroke="var(--border)" stroke-width="${strokeW}" stroke-linecap="round" opacity="0.3"/>
        <path d="M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}" fill="none" stroke="${gaugeCol}" stroke-width="${strokeW}" stroke-linecap="round" style="transition:all 0.8s ease;${isFull?'filter:drop-shadow(0 0 8px rgba(239,68,68,0.5))':''}"/>
        <text x="${gW/2}" y="${gH-35}" text-anchor="middle" style="font-family:'Syne',sans-serif;font-size:42px;font-weight:900;fill:${gaugeCol}">${count}</text>
        <text x="${gW/2}" y="${gH-12}" text-anchor="middle" style="font-size:13px;fill:var(--muted)">de ${IMPL_LIMIT} máximo</text>
        <text x="30" y="${gH}" text-anchor="middle" style="font-size:10px;fill:var(--muted)">0</text>
        <text x="${gW-30}" y="${gH}" text-anchor="middle" style="font-size:10px;fill:var(--muted)">${IMPL_LIMIT}</text>
      </svg>
      <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:${gaugeCol};margin-top:4px">${isFull?'⛔ FULL — TODO ROJO':count>=7?'⚠️ Casi al límite':count>=4?'⚡ En buen ritmo':'✅ Disponibilidad amplia'}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:4px">Duración: ${IMPL_DURATION_MONTHS} meses por implementación</div>
    </div>

    <!-- Summary KPIs -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="stat-card" style="cursor:pointer;${!isFull&&count>0?'animation:pulse 2s infinite':''};border-color:${isFull?'rgba(239,68,68,0.4)':count?'rgba(245,158,11,0.3)':'rgba(200,168,74,0.2)'}" onclick="implDetalle('activas')">
        <div style="font-size:28px;margin-bottom:2px">⚙️</div>
        <div style="font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:${isFull?'var(--danger)':'var(--warn)'}">${count}</div>
        <div style="font-size:10px;color:var(--muted)">Empresas Activas →</div>
      </div>
      <div class="stat-card" style="cursor:pointer" onclick="implDetalle('completadas')">
        <div style="font-size:28px;margin-bottom:2px">✅</div>
        <div style="font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:var(--accent3)">${completadas.length}</div>
        <div style="font-size:10px;color:var(--muted)">Finalizadas →</div>
      </div>
      <div class="stat-card" style="cursor:pointer" onclick="implDetalle('slots')">
        <div style="font-size:28px;margin-bottom:2px">🟢</div>
        <div style="font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:${isFull?'var(--danger)':'var(--accent3)'}">${IMPL_LIMIT-count}</div>
        <div style="font-size:10px;color:var(--muted)">Lugares Libres →</div>
      </div>
      <div class="stat-card" style="cursor:pointer" onclick="implDetalle('prox_fin')">
        <div style="font-size:28px;margin-bottom:2px">📅</div>
        <div style="font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:var(--accent)">${forecast[0]?.ending||0}</div>
        <div style="font-size:10px;color:var(--muted)">Finalizan este Mes →</div>
      </div>
    </div>
  </div>

  <!-- 6-Month Capacity Forecast -->
  <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:700;margin-bottom:14px">📊 Previsión de Capacidad — Próximos 6 Meses</div>
  <div class="card" style="margin-bottom:20px;overflow-x:auto">
    <!-- Bar chart visualization -->
    <div style="display:flex;gap:2px;align-items:flex-end;height:140px;margin-bottom:12px;padding:0 8px">
    ${forecast.map((f,i)=>{
      const h=f.activeCount/IMPL_LIMIT*100;
      const col=f.activeCount>=IMPL_LIMIT?'#ef4444':f.activeCount>=7?'#f59e0b':f.activeCount>=4?'#d4af37':'#c8a84a';
      const [fy,fm]=f.mym.split('-');
      return`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
        <div style="font-size:10px;font-weight:700;color:${col}">${f.activeCount}</div>
        <div style="width:100%;position:relative;height:100px;background:var(--surface2);border-radius:6px 6px 0 0;overflow:hidden">
          <div style="position:absolute;bottom:0;width:100%;height:${h}%;background:${col};border-radius:6px 6px 0 0;transition:height 0.5s;${f.activeCount>=IMPL_LIMIT?'animation:pulse 1.5s infinite':''}"></div>
          <div style="position:absolute;top:0;width:100%;border-bottom:2px dashed rgba(239,68,68,0.3);height:${100-((IMPL_LIMIT-IMPL_LIMIT)/IMPL_LIMIT*100)}%"></div>
        </div>
        <div style="font-size:10px;font-weight:600;${i===0?'color:var(--accent)':''}">${MESA[parseInt(fm)-1]}</div>
        ${f.ending?`<div style="font-size:9px;color:var(--accent3);font-weight:700">↓${f.ending} fin</div>`:''}
        ${f.slotsLibres>0&&f.slotsLibres!==(IMPL_LIMIT-count)?`<div style="font-size:9px;color:var(--accent3)">+${f.slotsLibres-(IMPL_LIMIT-count)} nuevos</div>`:''}
      </div>`;
    }).join('')}
    </div>
    <div style="border-top:1px dashed rgba(239,68,68,0.3);position:relative;margin:0 8px"><span style="position:absolute;right:0;top:-14px;font-size:9px;color:var(--danger)">Límite: ${IMPL_LIMIT}</span></div>

    <!-- Table forecast -->
    <div class="table-wrap" style="margin-top:16px"><table><thead><tr><th>Mes</th><th style="text-align:center">Activas</th><th style="text-align:center">Finalizan</th><th style="text-align:center">Slots Libres</th><th>Estado</th></tr></thead><tbody>
    ${forecast.map((f,i)=>{
      const [fy,fm]=f.mym.split('-');
      const col=f.activeCount>=IMPL_LIMIT?'var(--danger)':f.activeCount>=7?'var(--warn)':'var(--accent3)';
      return`<tr style="${i===0?'background:rgba(212,175,55,0.03)':''}">
        <td style="font-weight:700;${i===0?'color:var(--accent)':''}">${MESA[parseInt(fm)-1]} ${fy}${i===0?' (actual)':''}</td>
        <td style="text-align:center"><span style="display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:20px;background:${f.activeCount>=IMPL_LIMIT?'rgba(239,68,68,0.1)':f.activeCount>=7?'rgba(245,158,11,0.1)':'rgba(200,168,74,0.1)'};color:${col};font-weight:700;font-size:13px">${f.activeCount}/${IMPL_LIMIT}</span></td>
        <td style="text-align:center;color:${f.ending?'var(--accent3)':'var(--muted)'};font-weight:${f.ending?'700':'400'}">${f.ending||'—'}</td>
        <td style="text-align:center;font-weight:700;color:${f.slotsLibres?'var(--accent3)':'var(--danger)'}">${f.slotsLibres}</td>
        <td>${f.activeCount>=IMPL_LIMIT?'<span class="badge badge-danger">⛔ FULL</span>':f.activeCount>=7?'<span class="badge badge-warn">⚠️ Casi lleno</span>':f.slotsLibres>=5?'<span class="badge badge-success">✅ Disponible</span>':'<span class="badge badge-info">Moderado</span>'}
        ${f.ending?` · <span style="font-size:10px;color:var(--accent3)">Se liberan ${f.ending} lugar(es)</span>`:''}</td>
      </tr>`;
    }).join('')}
    </tbody></table></div>
  </div>

  <!-- 10 Slot visual -->
  <div class="card" style="margin-bottom:20px;border-color:${isFull?'rgba(239,68,68,0.4)':'rgba(212,175,55,0.15)'}">
    <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;margin-bottom:12px">${isFull?'🔴':'⚙️'} Empresas en Implementación (${count}/${IMPL_LIMIT})</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
    ${Array.from({length:IMPL_LIMIT},(_,i)=>{
      const impl=activas[i];
      const filled=i<count;
      const col=isFull?'rgba(239,68,68,0.85)':filled?gaugeCol:'var(--border)';
      const endDate=filled?_implEndDate(impl.fInicio):null;
      const monthsLeft=endDate?Math.max(0,Math.ceil((new Date(endDate)-new Date())/(30*24*60*60*1000))):0;
      return`<div style="flex:1;min-width:85px;border:2px solid ${col};border-radius:10px;padding:8px;text-align:center;background:${filled?(isFull?'rgba(239,68,68,0.06)':'rgba(212,175,55,0.04)'):'var(--surface2)'};${isFull&&filled?'animation:pulse 1.5s infinite':''}">
        <div style="font-size:${filled?'11':'20'}px;${filled?'font-weight:600':'color:var(--border)'}">${filled?impl.clienteNombre||'Impl '+(i+1):'—'}</div>
        ${filled?`<div style="font-size:9px;color:var(--muted)">${impl.auditor||'—'}</div>
        <div style="margin-top:3px">${badge(impl.estado)}</div>
        <div style="margin-top:4px;height:4px;background:var(--surface2);border-radius:2px;overflow:hidden"><div style="width:${impl.fInicio?Math.min(100,((IMPL_DURATION_MONTHS-monthsLeft)/IMPL_DURATION_MONTHS)*100):25}%;height:100%;background:${monthsLeft<=1?'#c8a84a':'#d4af37'};border-radius:2px"></div></div>
        <div style="font-size:8px;color:${monthsLeft<=1?'var(--accent3)':'var(--muted)'};margin-top:2px">${endDate?'Fin: '+fmtD(endDate)+(monthsLeft<=1?' 🏁':''):'Sin fecha'}</div>`
        :`<div style="font-size:9px;color:var(--border)">Libre</div>`}
      </div>`;
    }).join('')}
    </div>
    <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted)">
      <span>Disponibles: <strong style="color:${isFull?'var(--danger)':'var(--accent3)'}">${IMPL_LIMIT-count}</strong></span>
      <span>Ocupación: <strong style="color:${gaugeCol}">${Math.round(pct*100)}%</strong></span>
      <span>Duración: <strong>${IMPL_DURATION_MONTHS} meses</strong> c/u</span>
    </div>
  </div>

  <!-- By Consultant -->
  <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;margin-bottom:12px">🧑‍🔬 Carga por Consultor</div>
  <div class="grid-3" style="margin-bottom:20px">
  ${consultores.map(c=>{
    const mis=byConsultor[c.nombre]||[];
    const maxI=Number(c.maximpls)||2;
    const pctC=maxI?mis.length/maxI:0;
    const colC=pctC>=1?'#ef4444':pctC>=0.6?'#f59e0b':'#c8a84a';
    return`<div class="card" style="cursor:pointer;border-color:${pctC>=1?'rgba(239,68,68,0.3)':'rgba(200,168,74,0.15)'}" onclick="implDetalle('consultor_${c.id}')">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div class="person-avatar" style="background:linear-gradient(135deg,${colC},#d4af37);width:36px;height:36px;font-size:12px">${c.nombre.substring(0,2).toUpperCase()}</div>
        <div style="flex:1"><div style="font-weight:700;font-size:13px">${c.nombre}</div><div style="font-size:10px;color:var(--muted)">${mis.length}/${maxI} impls</div></div>
        ${pctC>=1?'<span class="badge badge-danger">FULL</span>':''}
      </div>
      <div style="height:8px;background:var(--surface2);border-radius:4px;overflow:hidden;margin-bottom:6px"><div style="height:100%;width:${Math.min(pctC*100,100)}%;background:${colC};border-radius:4px;transition:width 0.5s"></div></div>
      ${mis.length?mis.slice(0,3).map(a=>{const end=_implEndDate(a.fInicio);return`<div style="font-size:10px;padding:3px 0;border-bottom:1px solid var(--border)">${a.clienteNombre}${end?' · Fin: '+fmtD(end):''}</div>`;}).join('')+'<div style="font-size:10px;color:var(--muted);margin-top:2px">→ Ver detalle</div>':'<div style="font-size:10px;color:var(--muted);text-align:center;padding:8px">Sin implementaciones</div>'}
    </div>`;
  }).join('')}
  </div>

  <!-- Full Table -->
  <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;margin-bottom:12px">📋 Todas las Implementaciones</div>
  <div class="table-wrap"><table><thead><tr><th>#</th><th>Cliente</th><th>Consultor</th><th>Estado</th><th>Inicio</th><th>Fin Estimado</th><th>Restante</th><th>Progreso</th></tr></thead><tbody>
  ${allImpl.sort((a,b)=>{
    const aActive=a.estado!=='Completada'&&(!a.fInicio||_implEndDate(a.fInicio)>=today_);
    const bActive=b.estado!=='Completada'&&(!b.fInicio||_implEndDate(b.fInicio)>=today_);
    if(aActive!==bActive)return bActive-aActive;
    return(a.fInicio||'').localeCompare(b.fInicio||'');
  }).map((a,i)=>{
    const end=_implEndDate(a.fInicio);
    const isActive=a.estado!=='Completada'&&(!end||end>=today_);
    const monthsLeft=end?Math.max(0,Math.ceil((new Date(end)-new Date())/(30*24*60*60*1000))):IMPL_DURATION_MONTHS;
    const progPct=a.fInicio?Math.min(100,Math.round(((IMPL_DURATION_MONTHS-monthsLeft)/IMPL_DURATION_MONTHS)*100)):0;
    const progCol=!isActive?'#c8a84a':isFull?'#ef4444':'#d4af37';
    return`<tr style="${isActive&&isFull?'background:rgba(239,68,68,0.04)':''}${!isActive?'opacity:0.6':''}">
      <td style="font-weight:700;color:var(--muted)">${i+1}</td>
      <td style="font-weight:600">${a.clienteNombre||'—'}</td>
      <td style="font-size:12px">${a.auditor||'—'}</td>
      <td>${isActive?badge(a.estado):'<span class="badge badge-success">Finalizada</span>'}</td>
      <td style="font-size:11px;color:var(--muted)">${a.fInicio?fmtD(a.fInicio):'—'}</td>
      <td style="font-size:11px;color:${end&&monthsLeft<=1?'var(--accent3)':'var(--muted)'};font-weight:${end&&monthsLeft<=1?'700':'400'}">${end?fmtD(end)+(monthsLeft<=1?' 🏁':''):'—'}</td>
      <td style="font-size:11px;text-align:center;color:${isActive?(monthsLeft<=1?'var(--accent3)':'var(--warn)'):'var(--muted)'};font-weight:700">${isActive?monthsLeft+'m':'—'}</td>
      <td><div style="display:flex;align-items:center;gap:6px"><div style="width:60px;height:6px;background:var(--surface2);border-radius:3px;overflow:hidden"><div style="width:${isActive?progPct:100}%;height:100%;background:${progCol};border-radius:3px"></div></div><span style="font-size:10px;color:${progCol};font-weight:700">${isActive?progPct:100}%</span></div></td>
    </tr>`;
  }).join('')}
  </tbody></table></div>`;
}

function implDetalle(tipo){
  const auds=S.get('auditorias');const today_=todayStr();
  const allImpl=auds.filter(a=>a.tipo==='Implementación ISO 72001');
  const activas=allImpl.filter(a=>{if(a.estado==='Completada')return false;const end=_implEndDate(a.fInicio);return !end||end>=today_;});
  let titulo='',items=[],extraHTML='';
  if(tipo==='activas'){titulo='⚙️ Empresas en Implementación Activa';items=activas;}
  else if(tipo==='completadas'){titulo='✅ Finalizadas';items=allImpl.filter(a=>a.estado==='Completada'||(a.fInicio&&_implEndDate(a.fInicio)<today_&&a.estado!=='Completada'));}
  else if(tipo==='slots'){
    titulo='🟢 Lugares Disponibles';
    extraHTML=`<div style="text-align:center;padding:20px"><div style="font-size:48px;margin-bottom:8px">${IMPL_LIMIT-activas.length>0?'🟢':'🔴'}</div><div style="font-family:'Syne',sans-serif;font-size:32px;font-weight:800;color:${activas.length>=IMPL_LIMIT?'var(--danger)':'var(--accent3)'}">${IMPL_LIMIT-activas.length}</div><div style="color:var(--muted)">de ${IMPL_LIMIT} lugares disponibles</div></div>`;
    items=[];
  }
  else if(tipo==='prox_fin'){
    titulo='📅 Próximas Finalizaciones';
    items=activas.filter(a=>a.fInicio).sort((a,b)=>(_implEndDate(a.fInicio)||'').localeCompare(_implEndDate(b.fInicio)||''));
  }
  else if(tipo.startsWith('consultor_')){
    const cId=Number(tipo.split('_')[1]);
    const c=S.get('auditores').find(a=>a.id===cId);
    titulo=`🧑‍🔬 ${c?c.nombre:'Consultor'} — Implementaciones`;
    items=activas.filter(a=>a.auditor===(c?c.nombre:''));
  }
  const body=extraHTML||(items.length?`<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Consultor</th><th>Estado</th><th>Inicio</th><th>Fin Estimado</th><th>Restante</th></tr></thead><tbody>${items.map(a=>{const end=_implEndDate(a.fInicio);const ml=end?Math.max(0,Math.ceil((new Date(end)-new Date())/(30*24*60*60*1000))):4;return`<tr><td style="font-weight:600">${a.clienteNombre||'—'}</td><td>${a.auditor||'—'}</td><td>${badge(a.estado)}</td><td style="font-size:11px">${a.fInicio?fmtD(a.fInicio):'—'}</td><td style="font-size:11px">${end?fmtD(end):'—'}</td><td style="font-weight:700;color:${ml<=1?'var(--accent3)':'var(--warn)'}">${ml}m${ml<=1?' 🏁':''}</td></tr>`;}).join('')}</tbody></table></div>`:`<div style="text-align:center;color:var(--muted);padding:20px">Sin datos</div>`);
  let m=document.getElementById('modal-admin-detalle');
  if(!m){m=document.createElement('div');m.className='modal-overlay';m.id='modal-admin-detalle';m.innerHTML='<div class="modal" style="width:900px;max-width:96vw;max-height:90vh;display:flex;flex-direction:column"></div>';document.body.appendChild(m);}
  m.querySelector('.modal').innerHTML=`<div class="modal-head"><div class="modal-title">${titulo}</div><button class="modal-close" onclick="closeModal('modal-admin-detalle')">✕</button></div><div class="modal-body" style="overflow-y:auto;flex:1">${body}</div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal('modal-admin-detalle')">Cerrar</button></div>`;
  m.classList.add('open');
}

// === CAPACIDAD OPERATIVA ===
function renderDirTecCapacidad(){
  const el=document.getElementById('dirtec-capacidad-content');if(!el)return;
  const consultores=S.get('auditores').filter(a=>a.estado!=='Inactivo');
  const auds=S.get('auditorias');const now=new Date();const MES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const MESA=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const objDueno=S.get('crm_obj_dueno')||[];

  const meses=[];
  for(let i=0;i<4;i++){
    const d=new Date(now.getFullYear(),now.getMonth()+i,1);
    const mym=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    const obj=objDueno.find(x=>x.ym===mym);
    const objAuds=obj?Number(obj.auditorias)||0:0;
    const objImpls=obj?Number(obj.implementaciones)||0:0;
    let capAuds=0,capImpls=0,usedAuds=0,usedImpls=0;
    consultores.forEach(c=>{
      capAuds+=Number(c.maxauds)||4;capImpls+=Number(c.maximpls)||2;
      const mesMios=auds.filter(a=>a.auditor===c.nombre&&(a.fInsitu||'').startsWith(mym));
      usedAuds+=mesMios.filter(a=>a.tipo!=='Implementación ISO 72001').length;
      usedImpls+=mesMios.filter(a=>a.tipo==='Implementación ISO 72001').length;
    });
    meses.push({mym,label:MESA[d.getMonth()]+' '+d.getFullYear(),fullLabel:MES[d.getMonth()],capAuds,capImpls,usedAuds,usedImpls,objAuds,objImpls,freeAuds:Math.max(capAuds-usedAuds,0),freeImpls:Math.max(capImpls-usedImpls,0),necesitaAuds:Math.max(objAuds-capAuds,0),necesitaImpls:Math.max(objImpls-capImpls,0)});
  }

  // SVG donut helper
  function donut(used,cap,color,label,size){
    size=size||90;const r=size/2-8,circ=2*Math.PI*r;
    const pct=cap?Math.min(used/cap,1):0;const strokeW=8;
    return`<div style="text-align:center"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--border)" stroke-width="${strokeW}" opacity="0.3"/><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="${strokeW}" stroke-dasharray="${circ*pct} ${circ*(1-pct)}" stroke-dashoffset="${circ*0.25}" stroke-linecap="round" style="transition:stroke-dasharray 0.8s ease"/><text x="${size/2}" y="${size/2-4}" text-anchor="middle" style="font-family:'Syne',sans-serif;font-size:${size>80?16:13}px;font-weight:800;fill:${color}">${used}/${cap}</text><text x="${size/2}" y="${size/2+12}" text-anchor="middle" style="font-size:9px;fill:var(--muted)">${Math.round(pct*100)}%</text></svg><div style="font-size:10px;color:var(--muted);margin-top:2px">${label}</div></div>`;
  }

  // Bar chart helper
  function bar(value,max,color,height){
    height=height||120;const pct=max?Math.min(value/max,1)*100:0;
    return`<div style="width:32px;display:flex;flex-direction:column;align-items:center;gap:4px"><div style="font-size:10px;font-weight:700;color:${color}">${value}</div><div style="width:24px;height:${height}px;background:var(--surface2);border-radius:12px;position:relative;overflow:hidden"><div style="position:absolute;bottom:0;width:100%;height:${pct}%;background:${color};border-radius:12px;transition:height 0.8s ease"></div></div></div>`;
  }

  // Global totals for current month
  const cur=meses[0];
  const totalCapAuds=cur.capAuds,totalCapImpls=cur.capImpls;
  const totalUsedAuds=cur.usedAuds,totalUsedImpls=cur.usedImpls;
  const globalPctA=totalCapAuds?Math.round(totalUsedAuds/totalCapAuds*100):0;
  const globalPctI=totalCapImpls?Math.round(totalUsedImpls/totalCapImpls*100):0;
  const alertNeeded=meses.some(m=>m.necesitaAuds||m.necesitaImpls);

  el.innerHTML=`
  <!-- Global KPIs -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:16px;margin-bottom:24px">
    <div class="stat-card" style="cursor:pointer;text-align:center" onclick="dtDetalle('consultores_activos')">
      <div style="font-size:42px;margin-bottom:4px">🧑‍🔬</div>
      <div style="font-family:'Syne',sans-serif;font-size:32px;font-weight:800;color:var(--accent3)">${consultores.length}</div>
      <div style="font-size:11px;color:var(--muted)">Consultores Activos</div>
    </div>
    <div class="stat-card" style="text-align:center;cursor:pointer" onclick="dtDetalle('auds_activas_dt')" title="Ver detalle auditorías">
      ${donut(totalUsedAuds,totalCapAuds,globalPctA>85?'#ef4444':globalPctA>60?'#f59e0b':'#c8a84a','Auditorías',100)}
    </div>
    <div class="stat-card" style="text-align:center;cursor:pointer" onclick="dtDetalle('auds_activas_dt')" title="Ver detalle implementaciones">
      ${donut(totalUsedImpls,totalCapImpls,globalPctI>85?'#ef4444':globalPctI>60?'#f59e0b':'#c8a84a','Implementaciones',100)}
    </div>
    <div class="stat-card" style="text-align:center;border-color:${alertNeeded?'rgba(239,68,68,0.3)':'rgba(200,168,74,0.2)'};cursor:pointer" onclick="dtDetalle('informes_adeudados')" title="Ver informes adeudados">
      <div style="font-size:42px;margin-bottom:4px">${alertNeeded?'🚨':'✅'}</div>
      <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:${alertNeeded?'var(--danger)':'var(--accent3)'}">${alertNeeded?'Necesitás más':'Suficiente'}</div>
      <div style="font-size:11px;color:var(--muted)">Capacidad próx. meses →</div>
    </div>
  </div>

  <!-- 4-Month Projection Cards with Donuts -->
  <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:700;margin-bottom:14px">📊 Proyección a 4 Meses</div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px">
  ${meses.map((m,i)=>{
    const pctA=m.capAuds?Math.round(m.usedAuds/m.capAuds*100):0;
    const pctI=m.capImpls?Math.round(m.usedImpls/m.capImpls*100):0;
    const isAlert=m.necesitaAuds||m.necesitaImpls;
    const borderCol=isAlert?'rgba(239,68,68,0.4)':pctA>70?'rgba(245,158,11,0.3)':'rgba(200,168,74,0.25)';
    const bgGrad=isAlert?'linear-gradient(135deg,rgba(239,68,68,0.04),rgba(239,68,68,0.01))':i===0?'linear-gradient(135deg,rgba(212,175,55,0.04),rgba(200,168,74,0.02))':'none';
    return`<div class="card" style="border-color:${borderCol};background:${bgGrad};text-align:center;padding:16px 12px;position:relative">
      ${i===0?'<div style="position:absolute;top:8px;right:8px"><span class="badge badge-success" style="font-size:9px">ACTUAL</span></div>':''}
      <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:800;margin-bottom:12px;color:${isAlert?'var(--danger)':'var(--text)'}">${m.label}</div>
      <div style="display:flex;justify-content:center;gap:16px;margin-bottom:12px">
        ${donut(m.usedAuds,m.capAuds,pctA>85?'#ef4444':pctA>60?'#f59e0b':'#d4af37','Auditorías',80)}
        ${donut(m.usedImpls,m.capImpls,pctI>85?'#ef4444':pctI>60?'#f59e0b':'#c8a84a','Implementac.',80)}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
        <div style="background:var(--surface2);border-radius:6px;padding:6px"><div style="font-size:9px;color:var(--muted)">Libre Auds</div><div style="font-weight:800;color:${m.freeAuds?'var(--accent3)':'var(--danger)'}">${m.freeAuds}</div></div>
        <div style="background:var(--surface2);border-radius:6px;padding:6px"><div style="font-size:9px;color:var(--muted)">Libre Impls</div><div style="font-weight:800;color:${m.freeImpls?'var(--accent3)':'var(--danger)'}">${m.freeImpls}</div></div>
      </div>
      ${m.objAuds||m.objImpls?`<div style="border-top:1px dashed var(--border);padding-top:6px;font-size:10px;color:var(--warn)">🎯 Obj: ${m.objAuds} auds · ${m.objImpls} impls</div>`:''}
      ${isAlert?`<div style="background:rgba(239,68,68,0.1);border-radius:6px;padding:6px;margin-top:6px;font-size:10px;font-weight:700;color:var(--danger)">⚠️ +${m.necesitaAuds||0} auds · +${m.necesitaImpls||0} impls</div>`:''}
    </div>`;
  }).join('')}
  </div>

  <!-- Consultant Capacity Bar Chart -->
  <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:700;margin-bottom:14px">🧑‍🔬 Carga por Consultor — ${meses[0].fullLabel}</div>
  <div class="card" style="margin-bottom:20px;overflow-x:auto">
    <div style="display:flex;gap:20px;align-items:flex-end;min-width:${consultores.length*120}px;padding:10px 0">
    ${consultores.map(c=>{
      const ym=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
      const mesMios=auds.filter(a=>a.auditor===c.nombre&&(a.fInsitu||'').startsWith(ym));
      const usedA=mesMios.filter(a=>a.tipo!=='Implementación ISO 72001').length;
      const usedI=mesMios.filter(a=>a.tipo==='Implementación ISO 72001').length;
      const maxA=Number(c.maxauds)||4,maxI=Number(c.maximpls)||2;
      const pctA=maxA?Math.round(usedA/maxA*100):0;
      const pctI=maxI?Math.round(usedI/maxI*100):0;
      const colA=pctA>85?'#ef4444':pctA>60?'#f59e0b':'#d4af37';
      const colI=pctI>85?'#ef4444':pctI>60?'#f59e0b':'#c8a84a';
      return`<div style="flex:1;min-width:100px;text-align:center">
        <div style="display:flex;justify-content:center;gap:8px;margin-bottom:8px">
          ${bar(usedA,maxA,colA,90)}
          ${bar(usedI,maxI,colI,90)}
        </div>
        <div style="font-size:9px;display:flex;justify-content:center;gap:10px;margin-bottom:6px"><span style="color:${colA}">● Auds</span><span style="color:${colI}">● Impl</span></div>
        <div class="person-avatar" style="background:linear-gradient(135deg,${colA},${colI});width:32px;height:32px;font-size:11px;margin:0 auto 4px">${c.nombre.substring(0,2).toUpperCase()}</div>
        <div style="font-size:11px;font-weight:700">${c.nombre.split(' ')[0]}</div>
        <div style="font-size:9px;color:var(--muted)">${usedA}/${maxA} · ${usedI}/${maxI}</div>
        ${(usedA>=maxA||usedI>=maxI)?'<div style="font-size:9px;color:var(--danger);font-weight:700;margin-top:2px">FULL</div>':''}
      </div>`;
    }).join('')}
    </div>
    <div style="border-top:1px solid var(--border);padding-top:10px;margin-top:10px;display:flex;gap:20px;justify-content:center;font-size:10px;color:var(--muted)">
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#c8a84a;margin-right:4px"></span>&lt;60% — Disponible</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#f59e0b;margin-right:4px"></span>60-85% — Cargado</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ef4444;margin-right:4px"></span>&gt;85% — Saturado</span>
    </div>
  </div>

  <!-- Detailed Table -->
  <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:700;margin-bottom:12px">📋 Detalle Completo</div>
  <div class="table-wrap"><table><thead><tr><th>Consultor</th><th>Especialidad</th><th style="text-align:center">Auds</th><th style="text-align:center">Impls</th><th style="text-align:center">Carga</th><th>Disponibilidad</th></tr></thead><tbody>
  ${consultores.map(c=>{
    const ym=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
    const mesMios=auds.filter(a=>a.auditor===c.nombre&&(a.fInsitu||'').startsWith(ym));
    const usedA=mesMios.filter(a=>a.tipo!=='Implementación ISO 72001').length;
    const usedI=mesMios.filter(a=>a.tipo==='Implementación ISO 72001').length;
    const maxA=Number(c.maxauds)||4,maxI=Number(c.maximpls)||2;
    const pctTotal=((maxA+maxI)?Math.round((usedA+usedI)/(maxA+maxI)*100):0);
    const col=pctTotal>85?'#ef4444':pctTotal>60?'#f59e0b':'#c8a84a';
    const dispA=maxA-usedA,dispI=maxI-usedI;
    return`<tr>
      <td><div style="display:flex;align-items:center;gap:8px"><div class="person-avatar" style="background:linear-gradient(135deg,#9a7830,#d4af37);width:28px;height:28px;font-size:10px">${c.nombre.substring(0,2).toUpperCase()}</div><strong>${c.nombre}</strong></div></td>
      <td style="font-size:12px">${c.especialidad}</td>
      <td style="text-align:center"><div style="display:flex;align-items:center;gap:6px;justify-content:center"><div style="width:50px;height:6px;background:var(--surface2);border-radius:3px;overflow:hidden"><div style="width:${maxA?usedA/maxA*100:0}%;height:100%;background:${maxA&&usedA/maxA>0.85?'#ef4444':usedA/maxA>0.6?'#f59e0b':'#d4af37'};border-radius:3px"></div></div><span style="font-size:11px;font-weight:700">${usedA}/${maxA}</span></div></td>
      <td style="text-align:center"><div style="display:flex;align-items:center;gap:6px;justify-content:center"><div style="width:50px;height:6px;background:var(--surface2);border-radius:3px;overflow:hidden"><div style="width:${maxI?usedI/maxI*100:0}%;height:100%;background:${maxI&&usedI/maxI>0.85?'#ef4444':usedI/maxI>0.6?'#f59e0b':'#c8a84a'};border-radius:3px"></div></div><span style="font-size:11px;font-weight:700">${usedI}/${maxI}</span></div></td>
      <td style="text-align:center"><div style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;background:${col}22;color:${col};font-weight:700;font-size:12px">${pctTotal}%</div></td>
      <td style="text-align:center;color:${(dispA<=0&&dispI<=0)?'var(--danger)':'var(--accent3)'};font-weight:700;font-size:12px">${dispA>0?dispA+' auds':'—'} · ${dispI>0?dispI+' impls':'—'}</td>
    </tr>`;
  }).join('')}
  </tbody></table></div>`;
}

// === RENDICIÓN DE GASTOS ===
function renderDirTecRendicion(){
  const el=document.getElementById('dirtec-rendicion-content');if(!el)return;
  const rendiciones=S.get('rendiciones_gastos')||[];
  const consultores=S.get('auditores').filter(a=>a.estado!=='Inactivo');
  const total=rendiciones.reduce((s,r)=>s+(Number(r.monto)||0),0);
  const pendientes=rendiciones.filter(r=>r.estadoAprobacion!=='Aprobado');

  el.innerHTML=`
  <div style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:16px"><button class="btn btn-primary" onclick="nuevaRendicion()">+ Nueva Rendición</button></div>
  <div class="grid-4" style="margin-bottom:20px">
    <div class="stat-card" style="cursor:pointer" onclick="dtDetalle('total_rendido')"><div class="stat-icon red">🧾</div><div class="card-title">Total Rendido</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--danger)">${fmt(total)}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">→</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="dtDetalle('rendiciones_count')"><div class="stat-icon cyan">📋</div><div class="card-title">Rendiciones</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--accent)">${rendiciones.length}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">→</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="dtDetalle('pend_aprobacion')"><div class="stat-icon orange">⏳</div><div class="card-title">Pendientes Aprobación</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--warn)">${pendientes.length}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">→</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="dtDetalle('aprobadas')"><div class="stat-icon green">✅</div><div class="card-title">Aprobadas</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--accent3)">${rendiciones.length-pendientes.length}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">→</div></div>
  </div>
  ${rendiciones.length?`<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Consultor</th><th>Cliente/Empresa</th><th>Concepto</th><th>Tipo Gasto</th><th>Medio</th><th>Comprobante</th><th>Estado</th><th style="text-align:right">Monto</th><th></th></tr></thead><tbody>
  ${rendiciones.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(r=>`<tr>
    <td style="font-size:11px;color:var(--muted)">${fmtD(r.fecha)}</td>
    <td style="font-weight:600;font-size:12px">${r.consultor}</td>
    <td style="font-size:12px">${r.empresa||'—'}</td>
    <td style="font-size:12px">${r.concepto}</td>
    <td style="font-size:11px">${r.tipoGasto||'—'}</td>
    <td style="font-size:11px">${r.medioPago||'—'}</td>
    <td>${r.comprobante?`<a href="${r.comprobante}" target="_blank" style="color:var(--accent);font-size:11px">📎 Ver</a>`:'—'}</td>
    <td>${r.estadoAprobacion==='Aprobado'?'<span class="badge badge-success">Aprobado</span>':`<span class="badge badge-warn">Pendiente</span> <button class="btn btn-primary btn-sm" onclick="aprobarRendicion(${r.id})" style="font-size:9px;padding:2px 6px">✅</button>`}</td>
    <td style="text-align:right;font-weight:700;color:var(--danger)">${fmt(r.monto)}</td>
    <td><button class="btn btn-danger btn-sm" onclick="delRendicion(${r.id})">🗑</button></td>
  </tr>`).join('')}</tbody></table></div>`
  :'<div class="empty-state"><div class="icon">🧾</div><h3>Sin rendiciones</h3></div>'}`;
}

function nuevaRendicion(){
  const consultores=S.get('auditores').filter(a=>a.estado!=='Inactivo');
  const auds=S.get('auditorias');
  let m=document.getElementById('modal-rendicion');
  if(!m){m=document.createElement('div');m.className='modal-overlay';m.id='modal-rendicion';m.innerHTML='<div class="modal modal-lg"></div>';document.body.appendChild(m);}
  m.querySelector('.modal').innerHTML=`
    <div class="modal-head"><div class="modal-title">🧾 Nueva Rendición de Gastos</div><button class="modal-close" onclick="closeModal('modal-rendicion')">✕</button></div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group"><label>Consultor *</label><select id="rend-consultor"><option value="">Seleccionar...</option>${consultores.map(c=>`<option value="${c.nombre}">${c.nombre}</option>`).join('')}</select></div>
        <div class="form-group"><label>Empresa visitada</label><select id="rend-empresa"><option value="">Seleccionar...</option>${[...new Set(auds.map(a=>a.clienteNombre).filter(Boolean))].map(n=>`<option>${n}</option>`).join('')}</select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Tipo de Gasto *</label><select id="rend-tipo"><option>Transporte</option><option>Alojamiento</option><option>Comida</option><option>Viáticos</option><option>Material de trabajo</option><option>Peaje</option><option>Combustible</option><option>Otro</option></select></div>
        <div class="form-group"><label>Medio de Pago</label><select id="rend-medio"><option>Efectivo</option><option>Tarjeta débito</option><option>Tarjeta crédito</option><option>Transferencia</option><option>Otro</option></select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Concepto / Descripción *</label><input id="rend-concepto" placeholder="Uber a empresa, hotel 1 noche..."></div>
        <div class="form-group"><label>Monto ($) *</label><input id="rend-monto" type="number" placeholder="0"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Fecha</label><input id="rend-fecha" type="date" value="${todayStr()}"></div>
        <div class="form-group"><label>📎 Comprobante (link Drive) *</label><input id="rend-comprobante" placeholder="https://drive.google.com/..." type="url"></div>
      </div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal('modal-rendicion')">Cancelar</button><button class="btn btn-primary" onclick="saveRendicion()">💾 Guardar</button></div>`;
  m.classList.add('open');
}

function saveRendicion(){
  const concepto=document.getElementById('rend-concepto').value;
  const monto=Number(document.getElementById('rend-monto').value);
  const consultor=document.getElementById('rend-consultor').value;
  if(!concepto||!monto||!consultor){toast('⚠️ Completá los campos obligatorios');return;}
  const rends=S.get('rendiciones_gastos')||[];
  rends.push({id:Date.now(),consultor,empresa:document.getElementById('rend-empresa').value,concepto,monto,tipoGasto:document.getElementById('rend-tipo').value,medioPago:document.getElementById('rend-medio').value,fecha:document.getElementById('rend-fecha').value,comprobante:document.getElementById('rend-comprobante').value,estadoAprobacion:'Pendiente'});
  S.set('rendiciones_gastos',rends);closeModal('modal-rendicion');renderDirTecRendicion();toast('✅ Rendición registrada');
}
function aprobarRendicion(id){const rends=S.get('rendiciones_gastos')||[];const r=rends.find(x=>x.id===id);if(r){r.estadoAprobacion='Aprobado';r.fechaAprobacion=todayStr();}S.set('rendiciones_gastos',rends);renderDirTecRendicion();toast('✅ Rendición aprobada');}
function delRendicion(id){if(!confirm('¿Eliminar?'))return;S.set('rendiciones_gastos',(S.get('rendiciones_gastos')||[]).filter(r=>r.id!==id));renderDirTecRendicion();toast('🗑 Eliminada');}

// === HONORARIOS ===
function renderDirTecHonorarios(){
  const el=document.getElementById('dirtec-honorarios-content');if(!el)return;
  const consultores=S.get('auditores').filter(a=>a.estado!=='Inactivo');
  const auds=S.get('auditorias');const ym=todayStr().substring(0,7);
  const rendiciones=S.get('rendiciones_gastos')||[];

  const data=consultores.map(c=>{
    const mios=auds.filter(a=>a.auditor===c.nombre);
    const completadas=mios.filter(a=>a.estado==='Completada');
    const mesMios=mios.filter(a=>(a.fInsitu||'').startsWith(ym));
    const mesCompletadas=completadas.filter(a=>(a.fInforme||a.fInsitu||'').startsWith(ym));
    const honUnit=Number(c.honorarios)||300;
    const honTotal=completadas.length*honUnit;
    const honMes=mesCompletadas.length*honUnit;
    const rendMes=rendiciones.filter(r=>r.consultor===c.nombre&&r.fecha.startsWith(ym)&&r.estadoAprobacion==='Aprobado').reduce((s,r)=>s+(Number(r.monto)||0),0);
    return{...c,completadas:completadas.length,mesCompletadas:mesCompletadas.length,activas:mios.filter(a=>a.estado!=='Completada').length,honUnit,honTotal,honMes,rendMes,totalMes:honMes+rendMes,detalle:mios};
  });
  const totalHonMes=data.reduce((s,d)=>s+d.honMes,0);
  const totalRendMes=data.reduce((s,d)=>s+d.rendMes,0);

  el.innerHTML=`
  <div class="grid-4" style="margin-bottom:20px">
    <div class="stat-card" style="cursor:pointer" onclick="dtDetalle('hon_mes')"><div class="stat-icon green">💰</div><div class="card-title">Honorarios del Mes</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--accent3)">${fmt(totalHonMes)}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">→</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="dtDetalle('rend_mes')"><div class="stat-icon orange">🧾</div><div class="card-title">Rendiciones del Mes</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--warn)">${fmt(totalRendMes)}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">→</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="dtDetalle('total_pagar')"><div class="stat-icon cyan">📊</div><div class="card-title">Total a Pagar</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--accent)">${fmt(totalHonMes+totalRendMes)}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">→</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="dtDetalle('consultores_activos')"><div class="stat-icon green">🧑‍🔬</div><div class="card-title">Consultores</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--accent3)">${data.length}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">→</div></div>
  </div>
  ${data.map(d=>`<div class="card" style="margin-bottom:14px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:10px">
        <div class="person-avatar" style="background:linear-gradient(135deg,#9a7830,#d4af37);width:36px;height:36px;font-size:13px">${d.nombre.substring(0,2).toUpperCase()}</div>
        <div><div style="font-weight:700">${d.nombre}</div><div style="font-size:11px;color:var(--muted)">${d.especialidad} · ${fmt(d.honUnit)}/auditoría</div></div>
      </div>
      <div style="text-align:right"><div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--accent3)">${fmt(d.totalMes)}</div><div style="font-size:10px;color:var(--muted)">Total mes</div></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">
      <div class="v-stat"><div class="v-stat-label">Completadas Total</div><div class="v-stat-value">${d.completadas}</div></div>
      <div class="v-stat"><div class="v-stat-label">Completadas Mes</div><div class="v-stat-value" style="color:var(--accent)">${d.mesCompletadas}</div></div>
      <div class="v-stat"><div class="v-stat-label">Honorarios Mes</div><div class="v-stat-value" style="color:var(--accent3)">${fmt(d.honMes)}</div></div>
      <div class="v-stat"><div class="v-stat-label">Rendiciones Mes</div><div class="v-stat-value" style="color:var(--warn)">${fmt(d.rendMes)}</div></div>
      <div class="v-stat"><div class="v-stat-label">Activas</div><div class="v-stat-value" style="color:var(--warn)">${d.activas}</div></div>
    </div>
  </div>`).join('')}`;
}

// === ENTREGAS E INFORMES ===
function renderDirTecEntregas(){
  const el=document.getElementById('dirtec-entregas-content');if(!el)return;
  const auds=S.get('auditorias');const today_=todayStr();
  const entregas=S.get('entregas_consultor')||[];
  const consultores=S.get('auditores').filter(a=>a.estado!=='Inactivo');

  // Adeudados: in situ pasada, sin entrega de informe, no completada
  const adeudados=auds.filter(a=>{
    if(a.estado==='Completada')return false;
    if(!a.fInsitu||a.fInsitu>today_)return false;
    return !entregas.find(e=>e.auditoriaId===a.id&&e.tipo==='informe');
  }).sort((a,b)=>(a.fInsitu||'').localeCompare(b.fInsitu||''));
  const vencidos=adeudados.filter(a=>diffDays(a.fInsitu)<-7);

  el.innerHTML=`
  <div class="grid-4" style="margin-bottom:20px">
    <div class="stat-card" style="cursor:pointer" onclick="dtDetalle('informes_adeudados')"><div class="stat-icon red">🚨</div><div class="card-title">Informes Adeudados</div><div style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:var(--danger)">${adeudados.length}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">→</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="dtDetalle('vencidos_7d')"><div class="stat-icon orange">⏰</div><div class="card-title">Vencidos (+7 días)</div><div style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:${vencidos.length?'var(--danger)':'var(--accent3)'}">${vencidos.length}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">→</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="dtDetalle('entregas_hist')"><div class="stat-icon green">📤</div><div class="card-title">Entregas Realizadas</div><div style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:var(--accent3)">${entregas.length}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">→</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="dtDetalle('auds_activas_dt')"><div class="stat-icon cyan">🔍</div><div class="card-title">Auditorías Totales</div><div style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:var(--accent)">${auds.length}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">→</div></div>
  </div>

  ${adeudados.length?`<div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--danger);margin-bottom:12px">⚠️ Pendientes de Entrega</div>
  <div class="table-wrap" style="margin-bottom:20px"><table><thead><tr><th>Consultor</th><th>Cliente</th><th>Tipo</th><th>In Situ</th><th>Días</th><th>Estado</th><th></th></tr></thead><tbody>
  ${adeudados.map(a=>{const dias=Math.abs(diffDays(a.fInsitu));return`<tr style="background:${dias>7?'rgba(239,68,68,0.04)':''}">
    <td style="font-weight:600">${a.auditor||'—'}</td>
    <td>${a.clienteNombre||'—'}</td>
    <td style="font-size:11px">${a.tipo}</td>
    <td style="font-size:12px">${fmtD(a.fInsitu)}</td>
    <td style="font-weight:700;color:${dias>7?'var(--danger)':'var(--warn)'}">${dias} días ${dias>7?'⚠️':''}</td>
    <td><span class="badge badge-${dias>7?'danger':'warn'}">${dias>7?'VENCIDO':'Pendiente'}</span></td>
    <td><button class="btn btn-primary btn-sm" onclick="registrarEntregaConsultor(${a.id},'${a.auditor||''}')">📤 Entregar</button></td>
  </tr>`;}).join('')}</tbody></table></div>`:'<div style="background:rgba(200,168,74,0.08);border:1px solid rgba(200,168,74,0.2);border-radius:12px;padding:16px;margin-bottom:20px;text-align:center;color:var(--accent3);font-weight:600">✅ Todos los informes están al día</div>'}

  <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;margin-bottom:12px">📤 Historial de Entregas</div>
  ${entregas.length?`<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Consultor</th><th>Cliente</th><th>Tipo</th><th>Informe</th><th>Documentos</th></tr></thead><tbody>
  ${entregas.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(e=>`<tr>
    <td style="font-size:12px;color:var(--muted)">${fmtD(e.fecha)}</td>
    <td style="font-weight:600">${e.consultor}</td>
    <td>${e.clienteNombre||'—'}</td>
    <td style="font-size:11px">${e.tipo}</td>
    <td>${e.linkInforme?`<a href="${e.linkInforme}" target="_blank" style="color:var(--accent)">📄 Ver informe</a>`:'—'}</td>
    <td>${e.linkDocs?`<a href="${e.linkDocs}" target="_blank" style="color:var(--accent)">📂 Ver docs</a>`:'—'}</td>
  </tr>`).join('')}</tbody></table></div>`
  :'<div style="color:var(--muted);font-size:12px;text-align:center;padding:20px">Sin entregas registradas</div>'}`;
}

function registrarEntregaConsultor(audId,consultor){
  const aud=S.get('auditorias').find(a=>a.id===audId);if(!aud)return;
  let m=document.getElementById('modal-entrega');
  if(!m){m=document.createElement('div');m.className='modal-overlay';m.id='modal-entrega';m.innerHTML='<div class="modal"></div>';document.body.appendChild(m);}
  m.querySelector('.modal').innerHTML=`
    <div class="modal-head"><div class="modal-title">📤 Entrega de Informe — ${aud.clienteNombre}</div><button class="modal-close" onclick="closeModal('modal-entrega')">✕</button></div>
    <div class="modal-body">
      <input type="hidden" id="ent-audid" value="${audId}">
      <input type="hidden" id="ent-consultor" value="${consultor}">
      <input type="hidden" id="ent-cliente" value="${aud.clienteNombre||''}">
      <div style="background:var(--surface2);border-radius:10px;padding:12px;margin-bottom:14px;font-size:12px">
        <strong>${aud.clienteNombre}</strong> · ${aud.tipo} · In situ: ${fmtD(aud.fInsitu)}<br>
        <span style="color:var(--warn)">Plazo: 7 días desde la visita</span>
      </div>
      <div class="form-row">
        <div class="form-group"><label>📄 Link Informe (Drive) *</label><input id="ent-informe" placeholder="https://drive.google.com/..." type="url"></div>
        <div class="form-group"><label>📂 Link Documentación</label><input id="ent-docs" placeholder="https://drive.google.com/..." type="url"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Fecha entrega</label><input id="ent-fecha" type="date" value="${todayStr()}"></div>
        <div class="form-group"><label>Notas</label><input id="ent-notas" placeholder="Observaciones..."></div>
      </div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal('modal-entrega')">Cancelar</button><button class="btn btn-primary" onclick="saveEntrega()">📤 Registrar Entrega</button></div>`;
  m.classList.add('open');
}

function saveEntrega(){
  const linkInforme=document.getElementById('ent-informe').value;
  if(!linkInforme){toast('⚠️ Ingresá el link del informe');return;}
  const entregas=S.get('entregas_consultor')||[];
  entregas.push({id:Date.now(),auditoriaId:Number(document.getElementById('ent-audid').value),consultor:document.getElementById('ent-consultor').value,clienteNombre:document.getElementById('ent-cliente').value,tipo:'informe',linkInforme,linkDocs:document.getElementById('ent-docs').value,fecha:document.getElementById('ent-fecha').value,notas:document.getElementById('ent-notas').value});
  S.set('entregas_consultor',entregas);closeModal('modal-entrega');
  // Refresh whatever page we're on
  if(_inDirTecModule)renderDirTecEntregas();
  else{try{renderDirTec();}catch(e){}}
  toast('✅ Informe entregado — enviado a Administración');
}

// PANEL DE ADMINISTRACIÓN
// =====================================================
function procesarVentaAdmin(alertaId){
  const alertas=S.get('admin_ventas_pendientes')||[];
  const v=alertas.find(x=>String(x.id)===String(alertaId));if(!v)return;
  const auditores=S.get('auditores').filter(a=>a.estado!=='Inactivo');
  const vendedores=S.get('vendedores')||[];
  const clienteExist=v.clienteExistente?S.get('clientes').find(c=>c.id===Number(v.clienteExistente)):null;

  let m=document.getElementById('modal-procesar-venta');
  if(!m){m=document.createElement('div');m.className='modal-overlay';m.id='modal-procesar-venta';m.innerHTML='<div class="modal modal-lg"></div>';document.body.appendChild(m);}
  m.querySelector('.modal').innerHTML=`
  <div class="modal-head" style="background:linear-gradient(135deg,rgba(245,158,11,0.12),rgba(200,168,74,0.06))">
    <div class="modal-title" style="color:#f59e0b">⚡ Procesar Venta — ${v.empresa}</div>
    <button class="modal-close" onclick="closeModal('modal-procesar-venta')">✕</button>
  </div>
  <div class="modal-body">
    <input type="hidden" id="pv-alerta-id" value="${alertaId}">
    <div style="background:rgba(212,175,55,0.06);border:1px solid rgba(212,175,55,0.15);border-radius:10px;padding:12px 16px;margin-bottom:18px;font-size:12px;display:flex;gap:16px;flex-wrap:wrap">
      <span>👤 Vendedor: <strong style="color:var(--accent)">${v.vendedor}</strong></span>
      <span>📦 Servicio: <strong>${v.tipo}</strong></span>
      <span>💰 Monto: <strong style="color:var(--accent3)">${fmt(v.monto)}</strong></span>
      <span>📅 Fecha venta: <strong>${fmtD(v.fecha)}</strong></span>
    </div>

    <div class="form-section">🏢 Ficha del Cliente</div>
    <div class="form-row">
      <div class="form-group"><label>Empresa / Razón Social *</label><input id="pv-nombre" value="${clienteExist?.nombre||v.empresa||''}" placeholder="Razón social"></div>
      <div class="form-group"><label>CUIT / RFC</label><input id="pv-cuit" value="${clienteExist?.cuit||v.cuit||''}" placeholder="XX-XXXXXXXX-X"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Contacto</label><input id="pv-contacto" value="${clienteExist?.contacto||v.contacto||''}" placeholder="Nombre contacto"></div>
      <div class="form-group"><label>Cargo</label><input id="pv-cargo" value="${clienteExist?.cargo||''}" placeholder="Gerente, Director..."></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Email</label><input id="pv-email" type="email" value="${clienteExist?.email||v.email||''}" placeholder="email@empresa.com"></div>
      <div class="form-group"><label>Email 2</label><input id="pv-email2" value="${clienteExist?.email2||''}" placeholder="Alternativo"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Teléfono</label><input id="pv-tel" value="${clienteExist?.tel||v.tel||''}" placeholder="+54 11 XXXX-XXXX"></div>
      <div class="form-group"><label>WhatsApp</label><input id="pv-wa" value="${clienteExist?.wa||v.tel||''}" placeholder="+54 11 XXXX-XXXX"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Rubro / Industria</label><input id="pv-rubro" value="${clienteExist?.rubro||v.rubro||''}" placeholder="Alimentos, Manufactura..."></div>
      <div class="form-group"><label>País</label><select id="pv-pais"><option>Argentina</option><option>México</option><option>Chile</option><option>Uruguay</option><option>Colombia</option><option>Perú</option><option>España</option><option>Otro</option></select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Dirección</label><input id="pv-direccion" value="${clienteExist?.direccion||''}" placeholder="Ciudad, Provincia"></div>
      <div class="form-group"><label>Web</label><input id="pv-web" value="${clienteExist?.web||''}" placeholder="www.empresa.com"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>🧑‍💼 Vendedor Asignado *</label><select id="pv-vendedor-asignado"><option value="">Seleccionar...</option>${vendedores.map(v=>`<option value="${v.nombre}" ${v.nombre===v.vendedor?'selected':''}>${v.nombre}</option>`).join('')}</select></div>
      <div class="form-group"><label>💰 Comisión por esta venta ($)</label><input id="pv-comision-venta" type="number" placeholder="Usa la del vendedor si vacío"></div>
    </div>

    <div class="form-section">📄 Contrato & Documentación</div>
    <div class="form-row">
      <div class="form-group"><label>📎 Link Contrato (Google Drive) *</label><input id="pv-contrato" placeholder="https://drive.google.com/..." type="url"></div>
      <div class="form-group"><label>Forma de Pago</label>
        <select id="pv-forma"><option value="Transferencia">Transferencia</option><option value="Tarjeta">Tarjeta</option><option value="Cheque">Cheque</option><option value="Efectivo">Efectivo</option><option value="Crypto">Crypto</option><option value="PayPal">PayPal</option></select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Monto Total Contrato ($)</label><input id="pv-monto" type="number" value="${v.monto||''}" placeholder="0"></div>
      <div class="form-group"><label>Cuotas</label>
        <select id="pv-cuotas"><option value="1">1 pago (contado)</option><option value="2">2 cuotas</option><option value="3">3 cuotas</option><option value="4">4 cuotas</option><option value="5">5 cuotas</option><option value="6">6 cuotas</option></select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Fecha primera cuota</label><input id="pv-fecha-cuota" type="date" value="${todayStr()}"></div>
    </div>

    <div class="form-section">🔍 Asignación de Auditoría</div>
    <div class="form-row">
      <div class="form-group"><label>Tipo de Servicio</label>
        <select id="pv-tipo"><option value="Auditoría Internacional">Auditoría Internacional</option><option value="Adaptación IA BPCE">Adaptación IA BPCE</option><option value="Implementación ISO 72001">Implementación ISO 72001</option></select>
      </div>
      <div class="form-group"><label>Auditor / Consultor Asignado</label>
        <select id="pv-auditor"><option value="">Sin asignar aún</option>${auditores.map(a=>`<option value="${a.nombre}">${a.nombre} — ${a.especialidad}</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>📅 Fecha de Auditoría (in situ)</label><input id="pv-fauditoria" type="date"></div>
      <div class="form-group"><label>📅 Fecha Inicio Proceso</label><input id="pv-finicio" type="date" value="${todayStr()}"></div>
    </div>
    <div class="form-group"><label>Notas internas</label><textarea id="pv-notas" placeholder="Observaciones para administración...">${v.notas||''}</textarea></div>
  </div>
  <div class="modal-footer">
    <button class="btn btn-secondary" onclick="closeModal('modal-procesar-venta')">Cancelar</button>
    <button onclick="confirmarProcesoVenta()" class="btn" style="background:linear-gradient(135deg,var(--accent3),#34d399);border:none;color:#fff;font-weight:700;font-size:13px;padding:9px 22px;border-radius:8px;cursor:pointer">✅ Procesar y Crear Todo</button>
  </div>`;
  document.getElementById('pv-tipo').value=v.tipo||'Auditoría Internacional';
  if(clienteExist?.pais)document.getElementById('pv-pais').value=clienteExist.pais;
  document.getElementById('pv-vendedor-asignado').value=v.vendedor||'';
  m.classList.add('open');
}

function confirmarProcesoVenta(){
  const alertaId=Number(document.getElementById('pv-alerta-id').value);
  const nombre=(document.getElementById('pv-nombre').value||'').trim();
  if(!nombre){toast('⚠️ Ingresá el nombre de la empresa');return;}
  const today_=todayStr();
  const vendedorAsignado=document.getElementById('pv-vendedor-asignado').value||'';
  const comisionVenta=document.getElementById('pv-comision-venta').value||'';

  // 1. Crear o actualizar CLIENTE
  const clientes=S.get('clientes');
  const dup=clientes.find(c=>c.nombre.toLowerCase()===nombre.toLowerCase());
  let clienteId,clienteNombre=nombre;
  if(dup){
    clienteId=dup.id;
    ['cuit','contacto','cargo','email','email2','tel','wa','rubro','direccion','web'].forEach(f=>{
      const val=document.getElementById('pv-'+f)?.value||'';
      if(val)dup[f]=val;
    });
    dup.pais=document.getElementById('pv-pais').value;
    dup.vendedor=vendedorAsignado;
    if(comisionVenta)dup.comision=comisionVenta;
    S.set('clientes',clientes);
  } else {
    const newCli={id:S.nextId('clientes'),nombre,cuit:document.getElementById('pv-cuit').value,rubro:document.getElementById('pv-rubro').value,pais:document.getElementById('pv-pais').value,direccion:document.getElementById('pv-direccion').value,web:document.getElementById('pv-web').value,contacto:document.getElementById('pv-contacto').value,cargo:document.getElementById('pv-cargo').value,email:document.getElementById('pv-email').value,email2:document.getElementById('pv-email2').value,tel:document.getElementById('pv-tel').value,wa:document.getElementById('pv-wa').value,notas:'Procesado desde venta — '+todayStr(),vendedor:vendedorAsignado,comision:comisionVenta};
    clientes.push(newCli);S.set('clientes',clientes);clienteId=newCli.id;
  }

  // 2. Crear COTIZACIÓN
  const cots=S.get('cotizaciones');
  const cotNum='COT-'+String(cots.length+1).padStart(3,'0');
  const monto=document.getElementById('pv-monto').value;
  const tipo=document.getElementById('pv-tipo').value;
  cots.push({id:S.nextId('cotizaciones'),numero:cotNum,cliente:clienteNombre,servicio:tipo,monto,fecha:today_,vencimiento:'',estado:'Aprobada',desc:'Procesada desde venta'});
  S.set('cotizaciones',cots);

  // 3. Crear COBRO con cuotas
  const nCuotas=Number(document.getElementById('pv-cuotas').value)||1;
  const fechaCuota=document.getElementById('pv-fecha-cuota').value||today_;
  const montoCuota=Math.round(Number(monto)/nCuotas);
  const resto=Number(monto)-(montoCuota*(nCuotas-1));
  const cuotas=Array.from({length:nCuotas},(_,i)=>({numero:i+1,monto:i===nCuotas-1?resto:montoCuota,fechaVto:addMonths(fechaCuota,i),estado:'Pendiente',fechaPago:null,montoCobrado:null,notas:''}));
  const cobros=S.get('cobros');
  cobros.push({id:S.nextId('cobros'),auditoriaId:'',auditoriaNombre:clienteNombre,concepto:clienteNombre+' — '+tipo,montoTotal:Number(monto),nCuotas,forma:document.getElementById('pv-forma').value,notas:'',contrato:document.getElementById('pv-contrato').value,comprobante:'',cuotas,createdAt:today_});
  S.set('cobros',cobros);

  // 4. Crear AUDITORÍA (vendedor from assignment)
  const alertas=S.get('admin_ventas_pendientes')||[];
  const alerta=alertas.find(x=>String(x.id)===String(alertaId));
  const vendedor=vendedorAsignado||alerta?.vendedor||'';
  const aud={id:S.nextId('auditorias'),clienteId,clienteNombre,tipo,vendedor,auditor:document.getElementById('pv-auditor').value,monto,estado:'Nuevo',fInicio:document.getElementById('pv-finicio').value||today_,fDoc:'',fExterna:'',fInsitu:document.getElementById('pv-fauditoria').value||'',fPrep:'',fInforme:'',fSeguimiento:'',notas:document.getElementById('pv-notas').value};
  const auds=S.get('auditorias');auds.push(aud);S.set('auditorias',auds);

  // 5. Marcar alerta como procesada
  const ai=alertas.findIndex(x=>String(x.id)===String(alertaId));
  if(ai>-1){alertas[ai].estado='procesada';alertas[ai].fechaProcesada=today_;}
  S.set('admin_ventas_pendientes',alertas);

  closeModal('modal-procesar-venta');
  renderAdmin();
  // Notify consultant about new audit
  if(aud.auditor){
    enviarNotifConsultor(aud.auditor,'📋 Nueva Auditoría Asignada',`${clienteNombre} — ${tipo}${aud.fInsitu?' · Fecha: '+fmtD(aud.fInsitu):''}. Confirmá tu disponibilidad.`,'nueva_auditoria',{auditoriaId:aud.id});
  }
  toast('✅ Venta procesada: cliente + cotización '+cotNum+' + cobro + auditoría creados');
}

function descartarVentaAdmin(alertaId){
  if(!confirm('¿Descartar esta venta pendiente? No se crearán registros.'))return;
  const alertas=S.get('admin_ventas_pendientes')||[];
  const ai=alertas.findIndex(x=>String(x.id)===String(alertaId));
  if(ai>-1){alertas[ai].estado='descartada';}
  S.set('admin_ventas_pendientes',alertas);
  renderAdmin();
  toast('🗑 Venta descartada');
}
function adminDetalle(tipo,extra){
  const MES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const cobros=S.get('cobros'),gastos=S.get('gastos'),auds=S.get('auditorias'),auditores=S.get('auditores'),vendedores=S.get('vendedores');
  const today_=todayStr(),ym=today_.substring(0,7);
  let titulo='',body='';

  if(tipo==='cobrado'){
    titulo='💰 Detalle de Cobros Realizados';
    let items=[];
    cobros.forEach(c=>c.cuotas.forEach(q=>{if(q.estado==='Pagada')items.push({cliente:c.concepto||c.auditoriaNombre,cuota:q.numero+'/'+c.nCuotas,fecha:q.fechaPago||'—',monto:q.montoCobrado||q.monto,forma:c.forma});}));
    items.sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
    const total=items.reduce((s,i)=>s+(Number(i.monto)||0),0);
    body=`<div style="margin-bottom:14px;font-size:13px">Total cobrado: <strong style="color:var(--accent3)">${fmt(total)}</strong> en <strong>${items.length}</strong> pagos recibidos</div>
    ${items.length?`<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Cuota</th><th>Fecha Pago</th><th>Forma</th><th style="text-align:right">Monto</th></tr></thead><tbody>
    ${items.map(i=>`<tr><td style="font-weight:600">${i.cliente}</td><td style="font-size:12px">${i.cuota}</td><td style="font-size:12px;color:var(--muted)">${fmtD(i.fecha)}</td><td style="font-size:12px">${i.forma||'—'}</td><td style="text-align:right;font-weight:700;color:var(--accent3)">${fmt(i.monto)}</td></tr>`).join('')}
    </tbody></table></div>`:'<div style="color:var(--muted);text-align:center;padding:20px">Sin cobros realizados</div>'}`;
  }

  else if(tipo==='gastos'){
    titulo='💸 Detalle de Gastos';
    const items=gastos.sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
    const total=items.reduce((s,g)=>s+(Number(g.monto)||0),0);
    // Group by category
    const cats={};items.forEach(g=>{const c=g.categoria||'Otro';cats[c]=(cats[c]||0)+(Number(g.monto)||0);});
    body=`<div style="margin-bottom:14px;font-size:13px">Total gastado: <strong style="color:var(--danger)">${fmt(total)}</strong> en <strong>${items.length}</strong> registros</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">${Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([c,m])=>`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:12px"><strong>${c}</strong><br><span style="color:var(--danger);font-weight:700">${fmt(m)}</span> <span style="color:var(--muted);font-size:10px">(${Math.round(m/total*100)}%)</span></div>`).join('')}</div>
    ${items.length?`<div class="table-wrap"><table><thead><tr><th>Concepto</th><th>Categoría</th><th>Medio</th><th>Pagó</th><th>Fecha</th><th>Estado</th><th style="text-align:right">Monto</th></tr></thead><tbody>
    ${items.map(g=>{const st=g.estadoPago||'Pagado';return`<tr${st==='Pendiente'?' style="background:rgba(239,68,68,0.04)"':''}>
      <td style="font-weight:600">${g.concepto}${g.acreedor?'<div style="font-size:10px;color:var(--danger)">→ '+g.acreedor+'</div>':''}</td>
      <td style="font-size:12px">${g.categoria||'—'}</td><td style="font-size:12px">${g.medio||'—'}</td><td style="font-size:12px">${g.pagadoPor||'—'}</td>
      <td style="font-size:12px;color:var(--muted)">${fmtD(g.fecha)}</td><td><span class="badge badge-${st==='Pagado'?'success':'danger'}">${st}</span></td>
      <td style="text-align:right;font-weight:700;color:var(--danger)">${fmt(g.monto)}</td></tr>`;}).join('')}
    </tbody></table></div>`:''}`;
  }

  else if(tipo==='balance'){
    titulo='📊 Detalle del Balance';
    let totalCob=0;cobros.forEach(c=>c.cuotas.forEach(q=>{if(q.estado==='Pagada')totalCob+=q.montoCobrado||q.monto;}));
    const totalGas=gastos.reduce((s,g)=>s+(Number(g.monto)||0),0);
    const bal=totalCob-totalGas;
    // Monthly breakdown
    const meses={};
    cobros.forEach(c=>c.cuotas.forEach(q=>{if(q.estado==='Pagada'){const m=(q.fechaPago||'').substring(0,7);if(m){meses[m]=meses[m]||{cobrado:0,gastado:0};meses[m].cobrado+=q.montoCobrado||q.monto;}}}));
    gastos.forEach(g=>{const m=(g.fecha||'').substring(0,7);if(m){meses[m]=meses[m]||{cobrado:0,gastado:0};meses[m].gastado+=Number(g.monto)||0;}});
    const mesArr=Object.entries(meses).sort((a,b)=>b[0].localeCompare(a[0]));
    body=`<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:20px">
      <div style="background:rgba(200,168,74,0.08);border:1px solid rgba(200,168,74,0.2);border-radius:12px;padding:16px;text-align:center"><div style="font-size:11px;color:var(--muted)">Total Cobrado</div><div style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:var(--accent3)">${fmt(totalCob)}</div></div>
      <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:16px;text-align:center"><div style="font-size:11px;color:var(--muted)">Total Gastado</div><div style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:var(--danger)">${fmt(totalGas)}</div></div>
      <div style="background:${bal>=0?'rgba(200,168,74,0.08)':'rgba(239,68,68,0.08)'};border:1px solid ${bal>=0?'rgba(200,168,74,0.2)':'rgba(239,68,68,0.2)'};border-radius:12px;padding:16px;text-align:center"><div style="font-size:11px;color:var(--muted)">Balance</div><div style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:${bal>=0?'var(--accent3)':'var(--danger)'}">${fmt(bal)}</div></div>
    </div>
    <div style="font-size:13px;font-weight:700;margin-bottom:10px">Desglose Mensual</div>
    ${mesArr.length?`<div class="table-wrap"><table><thead><tr><th>Mes</th><th style="text-align:right;color:var(--accent3)">Cobrado</th><th style="text-align:right;color:var(--danger)">Gastado</th><th style="text-align:right">Balance</th></tr></thead><tbody>
    ${mesArr.map(([m,d])=>{const b=d.cobrado-d.gastado;const [y,mo]=m.split('-');return`<tr><td style="font-weight:600">${MES[parseInt(mo)-1]} ${y}</td><td style="text-align:right;color:var(--accent3)">${fmt(d.cobrado)}</td><td style="text-align:right;color:var(--danger)">${fmt(d.gastado)}</td><td style="text-align:right;font-weight:700;color:${b>=0?'var(--accent3)':'var(--danger)'}">${fmt(b)}</td></tr>`;}).join('')}
    </tbody></table></div>`:'<div style="color:var(--muted);text-align:center;padding:20px">Sin movimientos</div>'}`;
  }

  else if(tipo==='deudas'){
    titulo='⚠️ Detalle de Deudas Pendientes';
    const deudas=gastos.filter(g=>g.estadoPago==='Pendiente'||g.estadoPago==='Parcial');
    const total=deudas.reduce((s,g)=>s+(Number(g.monto)||0),0);
    // Group by acreedor
    const acreedores={};deudas.forEach(g=>{const a=g.acreedor||'Sin especificar';acreedores[a]=(acreedores[a]||0)+(Number(g.monto)||0);});
    body=`<div style="margin-bottom:14px;font-size:13px">Deuda total: <strong style="color:var(--danger)">${fmt(total)}</strong> en <strong>${deudas.length}</strong> gastos pendientes</div>
    ${Object.keys(acreedores).length?`<div style="font-size:12px;font-weight:700;margin-bottom:8px">Por acreedor:</div><div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">${Object.entries(acreedores).sort((a,b)=>b[1]-a[1]).map(([a,m])=>`<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:8px 14px"><div style="font-size:12px;font-weight:600">${a}</div><div style="color:var(--danger);font-weight:700">${fmt(m)}</div></div>`).join('')}</div>`:''}
    ${deudas.length?`<div class="table-wrap"><table><thead><tr><th>Concepto</th><th>Acreedor</th><th>Categoría</th><th>Vencimiento</th><th style="text-align:right">Monto</th></tr></thead><tbody>
    ${deudas.sort((a,b)=>(a.vencimiento||'z').localeCompare(b.vencimiento||'z')).map(g=>{const venc=g.vencimiento&&g.vencimiento<today_;return`<tr${venc?' style="background:rgba(239,68,68,0.06)"':''}>
      <td style="font-weight:600">${g.concepto}</td><td style="font-size:12px;color:var(--warn)">${g.acreedor||'—'}</td><td style="font-size:12px">${g.categoria||'—'}</td>
      <td style="font-size:12px;color:${venc?'var(--danger)':'var(--muted)'};font-weight:${venc?700:400}">${g.vencimiento?fmtD(g.vencimiento):'—'}${venc?' ⚠️ VENCIDO':''}</td>
      <td style="text-align:right;font-weight:700;color:var(--danger)">${fmt(g.monto)}</td></tr>`;}).join('')}
    </tbody></table></div>`:'<div style="text-align:center;padding:24px;color:var(--accent3);font-size:14px">✅ Sin deudas pendientes</div>'}`;
  }

  else if(tipo==='facmes'){
    const mym=extra;const [y,mo]=mym.split('-');
    titulo='📅 Facturación '+MES[parseInt(mo)-1]+' '+y+' — Detalle';
    const cuotasMes=[];
    cobros.forEach(c=>c.cuotas.forEach(q=>{if(q.estado!=='Pagada'&&q.fechaVto.startsWith(mym))cuotasMes.push({cliente:c.concepto||c.auditoriaNombre,cuota:q.numero+'/'+c.nCuotas,fechaVto:q.fechaVto,monto:q.monto,forma:c.forma,contrato:c.contrato});}));
    const totalAseg=cuotasMes.reduce((s,q)=>s+(Number(q.monto)||0),0);
    const objDueno=(S.get('crm_obj_dueno')||[]).find(x=>x.ym===mym);
    const objFac=objDueno?Number(objDueno.facturacion)||0:0;
    body=`<div style="display:grid;grid-template-columns:1fr 1fr ${objFac?'1fr':''}; gap:14px;margin-bottom:20px">
      <div style="background:rgba(200,168,74,0.08);border:1px solid rgba(200,168,74,0.2);border-radius:12px;padding:16px;text-align:center"><div style="font-size:11px;color:var(--muted)">Asegurada (cuotas)</div><div style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:var(--accent3)">${fmt(totalAseg)}</div></div>
      <div style="background:rgba(184,146,46,0.08);border:1px solid rgba(184,146,46,0.2);border-radius:12px;padding:16px;text-align:center"><div style="font-size:11px;color:var(--muted)">Cuotas pendientes</div><div style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:#c8a84a">${cuotasMes.length}</div></div>
      ${objFac?`<div style="background:${totalAseg>=objFac?'rgba(200,168,74,0.08)':'rgba(239,68,68,0.08)'};border:1px solid ${totalAseg>=objFac?'rgba(200,168,74,0.2)':'rgba(239,68,68,0.2)'};border-radius:12px;padding:16px;text-align:center"><div style="font-size:11px;color:var(--muted)">vs Objetivo</div><div style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:${totalAseg>=objFac?'var(--accent3)':'var(--danger)'}">${Math.round(totalAseg/objFac*100)}%</div></div>`:''}
    </div>
    ${cuotasMes.length?`<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Cuota</th><th>Vencimiento</th><th>Forma Pago</th><th>Contrato</th><th style="text-align:right">Monto</th></tr></thead><tbody>
    ${cuotasMes.sort((a,b)=>a.fechaVto.localeCompare(b.fechaVto)).map(q=>`<tr><td style="font-weight:600">${q.cliente}</td><td style="font-size:12px">${q.cuota}</td><td style="font-size:12px;color:var(--muted)">${fmtD(q.fechaVto)}</td><td style="font-size:12px">${q.forma||'—'}</td><td>${q.contrato?`<a href="${q.contrato}" target="_blank" style="color:var(--accent);font-size:11px">📄 Ver</a>`:'—'}</td><td style="text-align:right;font-weight:700;color:var(--accent3)">${fmt(q.monto)}</td></tr>`).join('')}
    <tr style="border-top:2px solid var(--border)"><td colspan="5" style="font-weight:700">Total</td><td style="text-align:right;font-weight:800;color:var(--accent3)">${fmt(totalAseg)}</td></tr>
    </tbody></table></div>`:'<div style="color:var(--muted);text-align:center;padding:20px">Sin cuotas esperadas para este mes</div>'}`;
  }

  else if(tipo==='comisiones'){
    titulo='💵 Detalle de Comisiones del Mes';
    const comData=vendedores.filter(v=>v.estado!=='Inactivo').map(v=>{
      const ventas=auds.filter(a=>a.vendedor===v.nombre&&a.estado==='Completada'&&(a.fInforme||'').startsWith(ym));
      const comUnit=Number(v.comision)||300;
      return{nombre:v.nombre,ventas,cant:ventas.length,comUnit,total:ventas.length*comUnit};
    }).filter(v=>v.cant>0);
    const totalCom=comData.reduce((s,v)=>s+v.total,0);
    body=`<div style="margin-bottom:14px;font-size:13px">Total comisiones: <strong style="color:var(--warn)">${fmt(totalCom)}</strong> · Período de pago: <strong>1 al 10 de cada mes</strong></div>
    ${comData.map(v=>`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div style="font-weight:700;font-size:14px">${v.nombre}</div><div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--accent3)">${fmt(v.total)}</div></div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:8px">${v.cant} venta(s) × ${fmt(v.comUnit)} por venta</div>
      ${v.ventas.length?`<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Servicio</th><th>Monto Auditoría</th><th>Fecha</th></tr></thead><tbody>
      ${v.ventas.map(a=>`<tr><td style="font-weight:600">${a.clienteNombre||'—'}</td><td style="font-size:12px">${a.tipo||'—'}</td><td style="font-size:12px;color:var(--accent3)">${fmt(a.monto)}</td><td style="font-size:12px;color:var(--muted)">${fmtD(a.fInforme)}</td></tr>`).join('')}
      </tbody></table></div>`:''}
    </div>`).join('')}
    ${!comData.length?'<div style="text-align:center;padding:24px;color:var(--muted)">Sin comisiones pendientes este mes</div>':''}`;
  }

  else if(tipo==='consultores'){
    titulo='🧑‍🔬 Detalle de Consultores Activos';
    const activos=auditores.filter(a=>a.estado!=='Inactivo');
    const audMes=auds.filter(a=>(a.fInicio||'').startsWith(ym)||(a.fInsitu||'').startsWith(ym));
    body=activos.map(v=>{
      const mios=audMes.filter(a=>a.auditor===v.nombre);
      const totalMios=auds.filter(a=>a.auditor===v.nombre);
      const hon=mios.length*(Number(v.honorarios)||300);
      return`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div><span style="font-weight:700;font-size:14px">${v.nombre}</span><span style="font-size:11px;color:var(--muted);margin-left:8px">${v.especialidad}${v.titulo?' · '+v.titulo:''}</span></div>
          <div style="display:flex;gap:12px;font-size:13px"><span>Este mes: <strong style="color:var(--accent)">${mios.length}</strong></span><span>Total: <strong>${totalMios.length}</strong></span><span>Honorarios: <strong style="color:var(--accent3)">${fmt(hon)}</strong></span></div>
        </div>
        ${mios.length?`<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Servicio</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>
        ${mios.map(a=>`<tr><td style="font-weight:600">${a.clienteNombre||'—'}</td><td style="font-size:12px">${a.tipo||'—'}</td><td>${badge(a.estado)}</td><td style="font-size:12px;color:var(--muted)">${fmtD(a.fInsitu||a.fInicio)}</td></tr>`).join('')}
        </tbody></table></div>`:`<div style="font-size:12px;color:var(--muted);padding:8px 0">Sin auditorías asignadas este mes</div>`}
      </div>`;
    }).join('')||'<div style="text-align:center;padding:24px;color:var(--muted)">Sin consultores activos</div>';
  }

  else if(tipo==='contratos'){
    titulo='📄 Detalle de Contratos & Cobros';
    body=cobros.length?`<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Monto Total</th><th>Cuotas</th><th>Cobrado</th><th>Pendiente</th><th>Forma</th><th>Contrato</th><th>Comprobante</th></tr></thead><tbody>
    ${cobros.map(c=>{const cob=c.cuotas.filter(q=>q.estado==='Pagada').reduce((s,q)=>s+(q.montoCobrado||q.monto),0);const pend=c.montoTotal-cob;
      return`<tr><td style="font-weight:600">${c.concepto||c.auditoriaNombre||'—'}</td><td style="font-family:'DM Mono',monospace">${fmt(c.montoTotal)}</td><td style="font-size:12px">${c.cuotas.filter(q=>q.estado==='Pagada').length}/${c.nCuotas}</td><td style="color:var(--accent3);font-weight:700">${fmt(cob)}</td><td style="color:${pend>0?'var(--warn)':'var(--accent3)'};font-weight:700">${fmt(pend)}</td><td style="font-size:12px">${c.forma||'—'}</td>
      <td>${c.contrato?`<a href="${c.contrato}" target="_blank" style="color:var(--accent)">📄 Ver</a>`:'—'}</td><td>${c.comprobante?`<a href="${c.comprobante}" target="_blank" style="color:var(--accent3)">📎 Ver</a>`:'—'}</td></tr>`;}).join('')}
    </tbody></table></div>`:'<div style="text-align:center;padding:24px;color:var(--muted)">Sin contratos registrados</div>';
  }

  // Show modal
  let m=document.getElementById('modal-admin-detalle');
  if(!m){m=document.createElement('div');m.className='modal-overlay';m.id='modal-admin-detalle';m.innerHTML='<div class="modal" style="width:900px;max-width:95vw;max-height:90vh;display:flex;flex-direction:column"></div>';document.body.appendChild(m);}
  m.querySelector('.modal').innerHTML=`
    <div class="modal-head"><div class="modal-title">${titulo}</div><button class="modal-close" onclick="closeModal('modal-admin-detalle')">✕</button></div>
    <div class="modal-body" style="overflow-y:auto;flex:1">${body}</div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal('modal-admin-detalle')">Cerrar</button></div>`;
  m.classList.add('open');
}

function renderAdmin(){
  // Admin puro (sin rol dueño) → redirigir a su dashboard propio
  const _ar = getUserRoles(currentUser);
  if(_ar.includes('admin') && !_ar.includes('dueno')){
    // Asegurarse que esté en el módulo admin para ver el nav correcto
    _inAdminModule=true;
    document.getElementById('nav-main').style.display='none';
    document.getElementById('nav-admin').style.display='';
    // Mostrar el dashboard admin en el contenido principal
    _renderDashboardAdmin();
    return;
  }
  const el=document.getElementById('admin-content');if(!el)return;
  const today_=todayStr();const ym=today_.substring(0,7);
  const now=new Date();
  const MES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  // Data
  const cobros=S.get('cobros'),gastos=S.get('gastos'),auds=S.get('auditorias'),auditores=S.get('auditores'),vendedores=S.get('vendedores');
  const objDueno=(S.get('crm_obj_dueno')||[]).find(x=>x.ym===ym);

  // Cobros totals
  let totalCobrado=0,totalPendiente=0,totalVencido=0;
  cobros.forEach(c=>c.cuotas.forEach(q=>{
    if(q.estado==='Pagada')totalCobrado+=q.montoCobrado||q.monto;
    else if(q.fechaVto<today_)totalVencido+=q.monto;
    else totalPendiente+=q.monto;
  }));
  const totalGastos=gastos.reduce((s,g)=>s+(Number(g.monto)||0),0);
  const totalDeudas=gastos.filter(g=>g.estadoPago==='Pendiente'||g.estadoPago==='Parcial').reduce((s,g)=>s+(Number(g.monto)||0),0);
  const balance=totalCobrado-totalGastos;

  // Facturación próximos 4 meses - dividida en asegurada (cuotas) y objetivo
  const objFac=objDueno?Number(objDueno.facturacion)||0:0;
  const facMeses=[];
  for(let i=0;i<4;i++){
    const d=new Date(now.getFullYear(),now.getMonth()+i,1);
    const mym=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    let asegurada=0;
    cobros.forEach(c=>c.cuotas.forEach(q=>{if(q.estado!=='Pagada'&&q.fechaVto.startsWith(mym))asegurada+=q.monto;}));
    const objetivo=Math.max(objFac-asegurada,0);
    facMeses.push({ym:mym,mes:MES[d.getMonth()]+' '+d.getFullYear(),asegurada,objetivo,total:asegurada+objetivo});
  }
  const maxFac=Math.max(...facMeses.map(m=>m.total),objFac,1);

  // Comisiones vendedores (pagables del 1 al 10)
  // Uses: auditoría.vendedor OR client.vendedor assignment
  // Comision: client.comision > vendedor.comision > 300 default
  const esRangoPago=now.getDate()<=10;
  const allClientes=S.get('clientes');
  const comData=vendedores.filter(v=>v.estado!=='Inactivo').map(v=>{
    const ventasMes=auds.filter(a=>{
      if(a.estado!=='Completada')return false;
      if(!(a.fInforme||'').startsWith(ym))return false;
      // Check if vendedor matches directly or via client assignment
      if(a.vendedor===v.nombre)return true;
      const cli=allClientes.find(c=>c.nombre===a.clienteNombre||c.id===a.clienteId);
      return cli&&cli.vendedor===v.nombre;
    });
    const comUnit=Number(v.comision)||300;
    let totalCom=0;
    ventasMes.forEach(a=>{
      const cli=allClientes.find(c=>c.nombre===a.clienteNombre||c.id===a.clienteId);
      const cliCom=cli&&cli.comision?Number(cli.comision):0;
      totalCom+=(cliCom||comUnit);
    });
    return{nombre:v.nombre,ventas:ventasMes.length,comision:totalCom,comUnit,detalle:ventasMes};
  }).filter(v=>v.ventas>0);
  const totalCom=comData.reduce((s,v)=>s+v.comision,0);

  // Consultores resumen
  const consultoresActivos=auditores.filter(a=>a.estado!=='Inactivo');
  const audMes=auds.filter(a=>(a.fInicio||'').startsWith(ym)||(a.fInsitu||'').startsWith(ym));

  // Ventas pendientes de procesar
  const todasAlertas = (S.get('admin_ventas_pendientes')||[]).filter(v=>v.estado==='pendiente');
  const ventasPend = todasAlertas.filter(v=>v.tipo !== 'respuesta_cliente_email');
  const emailsClientes = todasAlertas.filter(v=>v.tipo === 'respuesta_cliente_email');

  el.innerHTML=`
  ${ventasPend.length?`
  <!-- ALERTAS DE VENTAS NUEVAS -->
  <div style="background:linear-gradient(135deg,rgba(245,158,11,0.1),rgba(251,191,36,0.05));border:2px solid rgba(245,158,11,0.4);border-radius:14px;padding:20px;margin-bottom:20px;animation:pulse 2s infinite">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:#f59e0b">🔔 ${ventasPend.length} Venta(s) Nueva(s) — Pendiente(s) de Procesar</div>
      <span class="badge badge-warn" style="font-size:11px;padding:4px 12px">Acción requerida</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${ventasPend.map(v=>`
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:14px">
        <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#fbbf24);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">🏆</div>
        <div style="flex:1;min-width:0">
          <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:14px">${v.empresa}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">
            👤 Vendedor: <span style="color:var(--accent)">${v.vendedor}</span> · 
            📦 ${v.tipo} · 
            💰 <span style="color:var(--accent3);font-weight:700">${fmt(v.monto)}</span> · 
            📅 ${fmtD(v.fecha)}
          </div>
          ${v.contacto||v.email||v.tel?`<div style="font-size:10px;color:var(--muted);margin-top:2px">${v.contacto?'👤 '+v.contacto:''}${v.email?' · ✉️ '+v.email:''}${v.tel?' · 📞 '+v.tel:''}</div>`:''}
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button onclick="procesarVentaAdmin(${v.id})" class="btn" style="background:linear-gradient(135deg,var(--accent3),#34d399);border:none;color:#fff;font-weight:700;font-size:12px;padding:8px 16px;border-radius:8px;cursor:pointer">⚡ Procesar</button>
          <button onclick="descartarVentaAdmin(${v.id})" class="btn btn-secondary btn-sm" title="Descartar">✕</button>
        </div>
      </div>`).join('')}
    </div>
  </div>`:''}
  ${emailsClientes.length?`
  <!-- ALERTAS DE RESPUESTAS DE CLIENTES -->
  <div style="background:linear-gradient(135deg,rgba(96,165,250,0.08),rgba(59,130,246,0.04));border:2px solid rgba(96,165,250,0.35);border-radius:14px;padding:20px;margin-bottom:20px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:#60a5fa">📬 ${emailsClientes.length} Cliente(s) respondieron el email de Hernán</div>
      <span style="background:rgba(96,165,250,0.15);color:#60a5fa;border:1px solid rgba(96,165,250,0.3);border-radius:10px;padding:3px 12px;font-size:11px;font-weight:700">Revisar bandeja</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${emailsClientes.map(v=>`
      <div style="background:var(--surface);border:1px solid rgba(96,165,250,0.2);border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:12px">
        <div style="width:38px;height:38px;border-radius:50%;background:rgba(96,165,250,0.15);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">📧</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:13px">${v.empresa}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">
            De: <span style="color:#60a5fa">${v.from||'—'}</span> · 
            Asunto: <em>${v.asunto||'—'}</em> · 
            ${v.fecha||''}
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button onclick="showPage('correos')" class="btn" style="background:rgba(96,165,250,0.1);border:1px solid rgba(96,165,250,0.3);color:#60a5fa;font-size:11px;padding:7px 14px">📬 Ver bandeja</button>
          <button onclick="const a=S.get('admin_ventas_pendientes')||[];const i=a.findIndex(x=>String(x.id)===String(${v.id}));if(i>-1){a[i].estado='procesada';S.set('admin_ventas_pendientes',a);updateCobrosAlert();renderAdmin()}" class="btn btn-secondary btn-sm" title="Marcar como visto">✓</button>
        </div>
      </div>`).join('')}
    </div>
    <div style="font-size:11px;color:var(--muted);margin-top:12px">💡 Revisá la bandeja de <strong>hernanquiroz@metogroup.ar</strong> y respondé personalmente. También se envió un aviso a administre@metogroup.ar.</div>
  </div>`:''}
  <!-- KPI Cards - Bloqueado con PIN -->
  <div style="position:relative;margin-bottom:20px">
    <div class="grid-4" id="admin-kpi-grid">
      <div class="stat-card" style="cursor:pointer" onclick="_kpiClick('cobrado')"><div class="stat-icon green">💰</div><div class="card-title">Cobrado (total)</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--accent3)">${fmt(totalCobrado)}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">Click para ver detalle →</div></div>
      <div class="stat-card" style="cursor:pointer" onclick="_kpiClick('gastos')"><div class="stat-icon red">💸</div><div class="card-title">Gastos (total)</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--danger)">${fmt(totalGastos)}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">Click para ver detalle →</div></div>
      <div class="stat-card" style="cursor:pointer" onclick="_kpiClick('balance')"><div class="stat-icon ${balance>=0?'green':'red'}">📊</div><div class="card-title">Ganancia Neta</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:${balance>=0?'var(--accent3)':'var(--danger)'}">${fmt(balance)}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">Click para ver detalle →</div></div>
      <div class="stat-card" style="cursor:pointer" onclick="_kpiClick('deudas')"><div class="stat-icon orange">⚠️</div><div class="card-title">Deudas pendientes</div><div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:${totalDeudas>0?'var(--danger)':'var(--accent3)'}">${fmt(totalDeudas)}</div><div style="font-size:10px;color:var(--muted);margin-top:4px">Click para ver detalle →</div></div>
    </div>
    <div id="admin-kpi-frost" style="position:absolute;inset:0;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);background:rgba(17,24,39,0.7);border-radius:14px;display:${_adminBalanceUnlocked?'none':'flex'};align-items:center;justify-content:center;gap:16px;z-index:3;cursor:pointer" onclick="_showGananciaPin()">
      <div style="font-size:36px">🔒</div>
      <div><div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:var(--text)">Panel Financiero — Acceso Restringido</div><div style="font-size:12px;color:var(--muted);margin-top:4px">Click para ingresar PIN de acceso</div></div>
    </div>
  </div>

  ${totalVencido>0?`<div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:12px;padding:14px 18px;margin-bottom:16px">
    <div style="font-family:'Syne',sans-serif;font-weight:700;color:var(--danger)">🔴 ${fmt(totalVencido)} en cobros vencidos sin cobrar</div>
  </div>`:''}

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
    <!-- Facturación próximos 4 meses -->
    <div class="card">
      <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;margin-bottom:4px">📅 Facturación Próximos 4 Meses</div>
      <div style="display:flex;gap:14px;font-size:10px;margin-bottom:16px;color:var(--muted)">
        <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:3px;background:var(--accent3)"></span> Asegurada (cuotas)</span>
        ${objFac?`<span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:3px;background:rgba(184,146,46,0.6)"></span> Falta p/ objetivo</span>
        <span style="margin-left:auto;color:var(--accent3);font-weight:700">Obj: ${fmt(objFac)}</span>`:''}
      </div>
      <div style="display:flex;flex-direction:column;gap:14px">
        ${facMeses.map((m,i)=>{
          const pctAseg=Math.round(m.asegurada/maxFac*100);
          const pctObj=objFac?Math.round(m.objetivo/maxFac*100):0;
          const esActual=i===0;
          const cumple=objFac&&m.asegurada>=objFac;
          return`<div style="cursor:pointer;padding:6px;border-radius:8px;transition:background 0.15s" onclick="adminDetalle('facmes','${m.ym}')" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
            <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:12px;margin-bottom:5px">
              <span${esActual?' style="font-weight:700;color:var(--accent)"':''}>${m.mes}${esActual?' ← actual':''}</span>
              <div style="display:flex;gap:8px;align-items:baseline">
                <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--accent3);font-weight:700">${fmt(m.asegurada)}</span>
                ${objFac&&m.objetivo>0?`<span style="font-family:'DM Mono',monospace;font-size:10px;color:#c8a84a">+${fmt(m.objetivo)}</span>`:''}
                ${cumple?`<span style="font-size:10px">✅</span>`:''}
              </div>
            </div>
            <div style="height:10px;background:var(--surface2);border-radius:5px;overflow:hidden;display:flex">
              <div style="height:100%;width:${pctAseg}%;background:linear-gradient(90deg,#9a7830,#c8a84a);border-radius:5px 0 0 5px;flex-shrink:0"></div>
              ${pctObj>0?`<div style="height:100%;width:${pctObj}%;background:linear-gradient(90deg,rgba(184,146,46,0.4),rgba(184,146,46,0.6));flex-shrink:0;border-radius:0 5px 5px 0"></div>`:''}
            </div>
            ${objFac?`<div style="display:flex;justify-content:space-between;font-size:9px;color:var(--muted);margin-top:2px">
              <span>${m.asegurada>0?Math.round(m.asegurada/objFac*100)+'% asegurado':'Sin cuotas'}</span>
              <span>${cumple?'Objetivo alcanzado 🎯':'Faltan '+fmt(m.objetivo)}</span>
            </div>`:''}</div>`;
        }).join('')}
      </div>
    </div>
    </div>

    <!-- Comisiones de venta -->
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;cursor:pointer" onclick="adminDetalle('comisiones')">💵 Comisiones del Mes <span style="font-size:10px;color:var(--muted);font-weight:400">→ detalle</span></div>
        ${esRangoPago?`<span class="badge badge-success" style="font-size:10px">📅 Período de pago (1-10)</span>`:`<span class="badge badge-warn" style="font-size:10px">Próx. pago: 1/${MES[now.getMonth()]}</span>`}
      </div>
      ${comData.length?`
      <div style="display:flex;flex-direction:column;gap:8px">
        ${comData.map(v=>`<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--surface2);border-radius:10px;border:1px solid var(--border)">
          <div style="flex:1"><div style="font-size:13px;font-weight:600">${v.nombre}</div><div style="font-size:10px;color:var(--muted)">${v.ventas} venta(s) → ${fmt(v.comision)}</div></div>
          <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:var(--accent3)">${fmt(v.comision)}</div>
        </div>`).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
        <span style="font-size:12px;font-weight:700">Total a pagar</span>
        <span style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--warn)">${fmt(totalCom)}</span>
      </div>`:`<div style="text-align:center;padding:24px;color:var(--muted);font-size:12px">Sin comisiones pendientes este mes</div>`}
    </div>
  </div>

  ${(()=>{
    const _equiposPend = (S.get('auditorias')||[]).filter(a=>{
      const eq = (S.get('admin_empresa_equipo')||[]).filter(e=>String(e.clienteId)===String(a.clienteId));
      return eq.length > 0 && !a.equipo_aprobado && a.estado !== 'Completada' && a.estado !== 'Cancelada';
    });
    if(!_equiposPend.length) return '';
    return `<div class="card" style="border:2px solid rgba(34,197,94,0.3);background:rgba(34,197,94,0.04);margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <div style="width:36px;height:36px;border-radius:50%;background:rgba(34,197,94,0.15);display:flex;align-items:center;justify-content:center;font-size:18px">👥</div>
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--accent3)">Equipos pendientes de aprobación</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${_equiposPend.length} empresa${_equiposPend.length!==1?'s':''} cargaron su equipo — aprobá para que el agente envíe los mails</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${_equiposPend.map(a=>{
          const eq = (S.get('admin_empresa_equipo')||[]).filter(e=>String(e.clienteId)===String(a.clienteId));
          return `<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--surface);border:1px solid var(--border);border-radius:10px">
            <div style="flex:1">
              <div style="font-size:13px;font-weight:600">${a.clienteNombre}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:2px">${eq.length} persona${eq.length!==1?'s':''}: ${eq.map(e=>e.nombre+' '+e.apellido+' ('+e.puesto+')').join(', ')}</div>
            </div>
            <button onclick="if(confirm('¿Aprobar equipo de ${a.clienteNombre} y enviar mails de presentación a ${eq.length} personas?'))agenteAprobarEquipoYEnviarPresentacion(${a.id}).then(()=>renderAdmin())"
              style="padding:9px 18px;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.35);border-radius:8px;color:rgba(34,197,94,0.9);cursor:pointer;font-size:12px;font-weight:700;white-space:nowrap;transition:all 0.2s"
              onmouseover="this.style.background='rgba(34,197,94,0.2)'" onmouseout="this.style.background='rgba(34,197,94,0.12)'">
              ✅ Aprobar y enviar mails
            </button>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  })()}

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
    <!-- Consultores resumen -->
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;cursor:pointer" onclick="adminDetalle('consultores')">🧑‍🔬 Consultores (${consultoresActivos.length}) <span style="font-size:10px;color:var(--muted);font-weight:400">→ detalle</span></div>
        <button class="btn btn-secondary btn-sm" onclick="showPage('auditores')">Ver fichas →</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;max-height:280px;overflow-y:auto">
        ${consultoresActivos.map(v=>{
          const mios=audMes.filter(a=>a.auditor===v.nombre);
          const hon=mios.length*(Number(v.honorarios)||300);
          return`<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface2);border-radius:10px;border:1px solid var(--border);cursor:pointer" onclick="verFichaConsultor(${v.id})">
            <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#9a7830,#d4af37);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:#fff;flex-shrink:0">${v.nombre.substring(0,2).toUpperCase()}</div>
            <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600">${v.nombre}</div><div style="font-size:10px;color:var(--muted)">${v.especialidad}${v.titulo?' · '+v.titulo:''}</div></div>
            <div style="text-align:right"><div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:var(--accent)">${mios.length}</div><div style="font-size:9px;color:var(--muted)">este mes</div></div>
            <div style="text-align:right"><div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--accent3)">${fmt(hon)}</div><div style="font-size:9px;color:var(--muted)">honor.</div></div>
          </div>`;
        }).join('')}
        ${!consultoresActivos.length?`<div style="text-align:center;padding:20px;color:var(--muted)">Sin consultores activos</div>`:''}
      </div>
    </div>

    <!-- Accesos rápidos -->
    <div class="card">
      <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;margin-bottom:16px">⚡ Acciones Rápidas</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <button onclick="openModal('modal-cobro','new')" style="background:rgba(200,168,74,0.1);border:1px solid rgba(200,168,74,0.3);border-radius:12px;padding:18px;cursor:pointer;text-align:left">
          <div style="font-size:24px;margin-bottom:6px">💳</div>
          <div style="font-size:13px;font-weight:700;color:var(--accent3)">Nuevo Cobro</div>
          <div style="font-size:10px;color:var(--muted)">Registrar contrato y cuotas</div>
        </button>
        <button onclick="openModal('modal-gasto','new')" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:18px;cursor:pointer;text-align:left">
          <div style="font-size:24px;margin-bottom:6px">💸</div>
          <div style="font-size:13px;font-weight:700;color:var(--danger)">Nuevo Gasto</div>
          <div style="font-size:10px;color:var(--muted)">Registrar con medio de pago</div>
        </button>
        <button onclick="openModal('modal-auditor','new')" style="background:rgba(5,150,105,0.1);border:1px solid rgba(5,150,105,0.25);border-radius:12px;padding:18px;cursor:pointer;text-align:left">
          <div style="font-size:24px;margin-bottom:6px">🧑‍🔬</div>
          <div style="font-size:13px;font-weight:700;color:#c8a84a">Nuevo Consultor</div>
          <div style="font-size:10px;color:var(--muted)">Ficha técnica completa</div>
        </button>
        <button onclick="showPage('reportes')" style="background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.2);border-radius:12px;padding:18px;cursor:pointer;text-align:left">
          <div style="font-size:24px;margin-bottom:6px">📈</div>
          <div style="font-size:13px;font-weight:700;color:var(--accent)">Ver Reportes</div>
          <div style="font-size:10px;color:var(--muted)">Análisis financiero completo</div>
        </button>
      </div>

      <!-- Deudas de la empresa -->
      ${totalDeudas>0?`<div style="margin-top:16px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:14px">
        <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:var(--danger);margin-bottom:10px">🔴 Deudas de la Empresa</div>
        ${gastos.filter(g=>g.estadoPago==='Pendiente'||g.estadoPago==='Parcial').slice(0,5).map(g=>`
        <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(239,68,68,0.1);font-size:12px">
          <div>${g.concepto}${g.acreedor?` <span style="color:var(--warn)">→ ${g.acreedor}</span>`:''}</div>
          <div style="color:var(--danger);font-weight:700">${fmt(g.monto)}${g.vencimiento?` <span style="font-size:10px;color:var(--muted)">vence ${fmtD(g.vencimiento)}</span>`:''}</div>
        </div>`).join('')}
      </div>`:''}
    </div>
  </div>

  <!-- Cobros con documentación -->
  <div class="card" style="margin-bottom:20px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;cursor:pointer" onclick="adminDetalle('contratos')">📄 Contratos & Documentación <span style="font-size:10px;color:var(--muted);font-weight:400">→ detalle</span></div>
      <button class="btn btn-secondary btn-sm" onclick="showPage('cobros')">Ver todos los cobros →</button>
    </div>
    ${cobros.length?`<div class="table-wrap"><table>
      <thead><tr><th>Cliente</th><th>Monto</th><th>Forma Pago</th><th>Progreso</th><th>Contrato</th><th>Comprobante</th></tr></thead>
      <tbody>${cobros.slice(0,8).map(c=>{
        const cobrado=c.cuotas.filter(q=>q.estado==='Pagada').reduce((s,q)=>s+(q.montoCobrado||q.monto),0);
        const pct=Math.round(cobrado/c.montoTotal*100);
        return`<tr>
          <td style="font-weight:600">${c.concepto||c.auditoriaNombre||'—'}</td>
          <td style="font-family:'DM Mono',monospace;color:var(--accent3)">${fmt(c.montoTotal)}</td>
          <td style="font-size:12px">${c.forma||'—'}</td>
          <td><div style="display:flex;align-items:center;gap:8px"><div style="flex:1;height:6px;background:var(--surface2);border-radius:3px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${pct>=100?'var(--accent3)':'var(--accent)'};border-radius:3px"></div></div><span style="font-size:11px;font-weight:600">${pct}%</span></div></td>
          <td>${c.contrato?`<a href="${c.contrato}" target="_blank" style="color:var(--accent);font-size:11px">📄 Ver</a>`:'<span style="color:var(--muted);font-size:11px">—</span>'}</td>
          <td>${c.comprobante?`<a href="${c.comprobante}" target="_blank" style="color:var(--accent3);font-size:11px">📎 Ver</a>`:'<span style="color:var(--muted);font-size:11px">—</span>'}</td>
        </tr>`;
      }).join('')}</tbody></table></div>`
    :`<div style="text-align:center;padding:24px;color:var(--muted)">Sin cobros registrados</div>`}
  </div>`;
}
// ══════════════════════════════════════════════════════════════
// ── METOASIST DUEÑO — Orbe Dorado con Briefing y Memoria ──