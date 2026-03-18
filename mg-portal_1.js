
// ══════════════════════════════════════════════════════════════

function madGetContext(){
  const today=todayStr(), ym=today.substring(0,7);
  const MES_NOM=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mesNom=MES_NOM[parseInt(ym.split('-')[1])-1];
  const auds=S.get('auditorias'), clientes=S.get('clientes'), auditores=S.get('auditores');
  const cobros=S.get('cobros'), gastos=S.get('gastos'), vendedores=S.get('vendedores');
  const logs=S.get('crm_logs'), segs=S.get('crm_seguimientos')||[];
  const cots=S.get('cotizaciones')||[];
  const bdEmpresas=S.get('crm_bases_datos')||[];
  const objVends=S.get('crm_objetivos')||[];
  const objDueno=S.get('crm_obj_dueno')||[];
  const ventasPend=(S.get('admin_ventas_pendientes')||[]).filter(v=>v.estado==='pendiente');
  const referidos=S.get('crm_referidos')||[];
  const sueldos=S.get('personal_sueldos')||[];

  let ingresado=0,pendiente=0,vencido=0;
  const cuotasVenc=[],cuotasVencidas=[];
  cobros.forEach(c=>{(c.cuotas||[]).forEach((q,i)=>{
    if(q.estado==='Pagado'||q.estado==='Pagada') ingresado+=(Number(q.montoCobrado)||Number(q.monto)||0);
    if(q.estado==='Pendiente'){
      pendiente+=(Number(q.monto)||0);
      const fv=q.fechaVto||q.fecha;
      if(fv){const d=diffDays(fv);
        if(d!==null&&d>=0&&d<=14) cuotasVenc.push({cliente:c.concepto||c.auditoriaNombre||'',cuota:i+1,dias:d,monto:q.monto});
        if(d!==null&&d<0){vencido+=(Number(q.monto)||0);cuotasVencidas.push({cliente:c.concepto||c.auditoriaNombre||'',cuota:i+1,dias:Math.abs(d),monto:q.monto});}
      }
    }
  });});
  cuotasVenc.sort((a,b)=>a.dias-b.dias);
  const gastosT=gastos.reduce((s,g)=>s+(Number(g.monto)||0),0);
  const gastosMes=gastos.filter(g=>(g.fecha||'').startsWith(ym)).reduce((s,g)=>s+(Number(g.monto)||0),0);
  const ingresadoMes=cobros.reduce((s,c)=>{(c.cuotas||[]).forEach(q=>{if((q.estado==='Pagado'||q.estado==='Pagada')&&(q.fechaPago||'').startsWith(ym))s+=(Number(q.montoCobrado)||Number(q.monto)||0);});return s;},0);
  const ganancia=ingresado-gastosT;

  const mLogs=logs.filter(l=>l.fecha?.startsWith(ym));
  const totalLL=mLogs.reduce((s,l)=>s+(l.llamadas||0),0);
  const totalDU=mLogs.reduce((s,l)=>s+(l.duenos||0),0);
  const totalAG=mLogs.reduce((s,l)=>s+(l.agendadas||0),0);
  const totalCI=mLogs.reduce((s,l)=>s+(l.cerradas||0),0);
  const convEq=totalLL>0?Math.round(totalCI/totalLL*100):0;

  const ranking=vendedores.filter(v=>v.estado!=='Inactivo').map(v=>{
    const vl=mLogs.filter(l=>l.vendedor===v.nombre);
    const obj=objVends.find(o=>o.ym===ym&&String(o.vendedorId)===String(v.id));
    const bdEmp=bdEmpresas.filter(e=>e.vendedor===v.nombre);
    const segV=segs.filter(s=>s.vendedor===v.nombre&&!s.hecho);
    return{nombre:v.nombre,ci:vl.reduce((s,l)=>s+(l.cerradas||0),0),ll:vl.reduce((s,l)=>s+(l.llamadas||0),0),ag:vl.reduce((s,l)=>s+(l.agendadas||0),0),objCierres:obj?.cerradas||0,objLlam:obj?.llamadas||0,empresas:bdEmp.length,interesadas:bdEmp.filter(e=>e.estado==='Interesada').length,segPend:segV.length};
  }).sort((a,b)=>b.ci-a.ci);

  const audsActivas=auds.filter(a=>!['Completada','Informe Entregado'].includes(a.estado));
  const audsComp=auds.filter(a=>['Completada','Informe Entregado'].includes(a.estado));
  const audsMes=auds.filter(a=>(a.fInicio||'').startsWith(ym));
  const vencimientos=[];
  auds.forEach(a=>{
    [['Doc',a.fDoc],['Externa',a.fExterna],['InSitu',a.fInsitu],['Prep',a.fPrep],['Informe',a.fInforme],['Seguim',a.fSeguimiento]].forEach(([lbl,f])=>{
      if(f){const d=diffDays(f);if(d!==null&&d>=0&&d<=14) vencimientos.push({lbl,cliente:a.clienteNombre||'',dias:d});}
    });
  });
  vencimientos.sort((a,b)=>a.dias-b.dias);

  const segsVenc=segs.filter(s=>!s.hecho&&s.fecha<today);
  const segsPend=segs.filter(s=>!s.hecho);
  const segsHoy=segs.filter(s=>!s.hecho&&s.fecha===today);
  const consActivos=auditores.filter(a=>a.estado!=='Inactivo');
  const consDetalle=consActivos.map(c=>{const misA=auds.filter(a=>a.auditor===c.nombre);return`${c.nombre}(${c.especialidad||''}): ${misA.filter(a=>!['Completada','Informe Entregado'].includes(a.estado)).length}act/${misA.filter(a=>['Completada','Informe Entregado'].includes(a.estado)).length}comp`;});
  const cotsPend=cots.filter(c=>c.estado==='Pendiente'||c.estado==='Enviada');
  const objD=objDueno.find(x=>x.ym===ym);
  const bdStats={total:bdEmpresas.length,pend:bdEmpresas.filter(e=>e.estado==='Pendiente').length,contact:bdEmpresas.filter(e=>e.estado==='Contactada').length,inter:bdEmpresas.filter(e=>e.estado==='Interesada').length};
  const totalContactos=bdEmpresas.reduce((s,e)=>s+((e.historial||[]).length),0);

  return `Usted es MetoAsist, el asesor estratégico de dirección de MetoGroup — empresa de consultoría en estándares comerciales internacionales (BPC:2026, ISO 72001, adecuaciones IA). Tiene acceso completo a todos los datos del sistema. Su rol es el de un socio de dirección: analiza, detecta problemas, propone con criterio. El trato es de igual a igual — profesional, directo, sin condescendencia ni motivación vacía. Cuando hay un problema, lo dice. Cuando hay una oportunidad, la señala con precisión. Responde siempre en español formal.

FECHA: ${today} | MES: ${mesNom} | DIRECCIÓN: ${currentUser?.nombre||''}

FINANCIERO: Cobrado total $${ingresado.toLocaleString('es-AR')} | Mes $${ingresadoMes.toLocaleString('es-AR')} | Gastos total $${gastosT.toLocaleString('es-AR')} | Gastos mes $${gastosMes.toLocaleString('es-AR')} | Ganancia $${ganancia.toLocaleString('es-AR')} | Pendiente $${pendiente.toLocaleString('es-AR')}${vencido>0?' | VENCIDO $'+vencido.toLocaleString('es-AR'):''}
${cuotasVenc.length?'Vencimientos próximos: '+cuotasVenc.slice(0,5).map(c=>c.cliente+' $'+c.monto+' en '+c.dias+'d').join('; '):''}
${cotsPend.length?'Cotizaciones pendientes: '+cotsPend.slice(0,3).map(c=>c.cliente+' $'+c.monto).join(', '):''}

COMERCIAL ${mesNom}: Llamadas ${totalLL} | Dueños contactados ${totalDU} | Entrevistas agendadas ${totalAG} | Cierres ${totalCI} | Conversión ${convEq}%
${ventasPend.length?'VENTAS POR PROCESAR: '+ventasPend.map(v=>v.empresa+' $'+v.monto).join(', '):''}

EQUIPO COMERCIAL:
${ranking.map((r,i)=>(i+1)+'. '+r.nombre+': '+r.ci+'/'+r.objCierres+' cierres, '+r.ll+'/'+r.objLlam+' llamadas, '+r.ag+' entrevistas agendadas, '+r.empresas+' empresas ('+r.interesadas+' interesadas), '+r.segPend+' seguimientos pendientes').join('\n')}

BASE DE DATOS: ${bdStats.total} empresas | ${bdStats.pend} pendientes | ${bdStats.contact} contactadas | ${bdStats.inter} interesadas | ${totalContactos} contactos realizados

AUDITORÍAS: ${audsActivas.length} activas | ${audsComp.length} completadas | ${audsMes.length} nuevas este mes | Total histórico: ${auds.length}
${vencimientos.length?'Vencimientos: '+vencimientos.slice(0,8).map(v=>v.lbl+' '+v.cliente+' '+v.dias+'d').join('; '):''}
Estados: ${['Nuevo','Documentación Pendiente','Auditoría Externa','Auditoría In-Situ','Preparando Informe'].map(e=>e+':'+auds.filter(a=>a.estado===e).length).join(' | ')}

CONSULTORES: ${consDetalle.join(' | ')||'Sin consultores activos'}

SEGUIMIENTOS: ${segsPend.length} pendientes | ${segsHoy.length} para hoy | ${segsVenc.length} vencidos
${segsVenc.length?'Vencidos: '+segsVenc.slice(0,5).map(s=>s.empresa+'('+s.vendedor+')').join(', '):''}

CLIENTES: ${clientes.length} total | ${clientes.filter(c=>auds.find(a=>a.clienteId===c.id&&!['Completada','Informe Entregado'].includes(a.estado))).length} con auditoría activa
${objD?'OBJETIVOS DIRECCIÓN: Auditorías:'+objD.auditorias+' IA:'+objD.ia+' Implementaciones:'+objD.implementaciones+' Facturación:$'+objD.facturacion+' Cobros:$'+objD.cobros:''}
${sueldos.length?'NÓMINA: '+sueldos.length+' empleados':''}

INSTRUCCIONES: Español formal, tono de par estratégico. Sin asteriscos ni markdown. Directo y preciso — máximo 8 oraciones salvo análisis extenso solicitado. Cite siempre los datos reales del contexto. Si hay un problema relevante, señálelo sin rodeos. Nunca invente ni extrapole datos que no figuren en el contexto.`;
}
function madGetBriefingPrompt(){
  const ctx=madGetContext();
  return{
    system:ctx,
    messages:[{role:'user',content:`Necesito el briefing ejecutivo del día. Cuatro puntos: 1) Situación financiera en una línea, 2) Alertas urgentes — vencimientos, seguimientos, cuotas, 3) Rendimiento comercial del equipo, 4) Una recomendación estratégica concreta. Texto corrido, sin listas, sin asteriscos, máximo 8 oraciones.`}]
  };
}

function madMsgHTML(m){
  if(m.role==='user'){
    const initials=(currentUser?.nombre||'D').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
    return`<div class="ma-d-msg ma-d-user">
      <div class="ma-d-avatar" style="background:linear-gradient(135deg,var(--accent2),var(--accent));font-size:10px;color:#fff">${initials}</div>
      <div class="ma-d-bubble">${m.content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'<br>')}</div>
    </div>`;
  }
  const formatted=m.content
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/\n/g,'<br>');
  return`<div class="ma-d-msg ma-d-asist">
    <div class="ma-d-avatar">✦</div>
    <div class="ma-d-bubble">${formatted}</div>
  </div>`;
}

function madTogglePanel(){
  const panel=document.getElementById('metoasist-panel');
  const isOpen=panel.classList.contains('open');
  if(isOpen){
    panel.classList.remove('open');
  }else{
    panel.classList.add('open');
    madRenderChat();
    const chatEl=document.getElementById('mad-chat');
    setTimeout(()=>chatEl.scrollTop=chatEl.scrollHeight,100);
  }
}

function madRenderChat(){
  const hist=S.get('metoasist_dueno_hist')||[];
  const chatEl=document.getElementById('mad-chat');
  const subEl=document.getElementById('mad-sub');
  const chipsEl=document.getElementById('mad-chips');

  subEl.textContent=`Asistente ejecutivo · ${hist.length>0?hist.length+' mensajes en memoria':'Conversación nueva'}`;

  if(hist.length){
    chatEl.innerHTML=hist.map(m=>madMsgHTML(m)).join('');
  }else{
    const hr=new Date().getHours();
    const saludo=hr<12?'Buenos días':hr<18?'Buenas tardes':'Buenas noches';
    chatEl.innerHTML=`<div class="ma-d-msg ma-d-asist">
      <div class="ma-d-avatar">✦</div>
      <div class="ma-d-bubble">${saludo}, ${currentUser?.nombre?.split(' ')[0]||''}. Soy tu asistente ejecutivo. Tengo acceso a todos los datos de MetoGroup en tiempo real.<br><br>Podés preguntarme sobre finanzas, auditorías, rendimiento del equipo, o cualquier aspecto del negocio. ¿En qué te ayudo?</div>
    </div>`;
  }

  chipsEl.innerHTML=[
    ['📊 Briefing del día','Dame el briefing ejecutivo completo del día'],
    ['💰 Estado financiero','¿Cómo estamos financieramente? Ingresado, gastos, ganancia, pendiente de cobro'],
    ['🔍 Auditorías críticas','¿Qué auditorías tienen vencimientos próximos o están atrasadas?'],
    ['🏆 Rendimiento equipo','¿Cómo viene el rendimiento comercial del equipo este mes?'],
    ['⚠️ Alertas urgentes','¿Hay algo urgente que necesite mi atención hoy?'],
    ['🧠 Recomendación','Basándote en todos los datos, ¿qué me recomendás hacer esta semana?']
  ].map(([lb,msg])=>`<div class="ma-d-chip" onclick="madEnviar(this,${JSON.stringify(msg).replace(/"/g,'&quot;')})">${lb}</div>`).join('');
}

async function madEnviar(chipEl, chipMsg){
  const inputEl=document.getElementById('mad-input');
  const chatEl=document.getElementById('mad-chat');
  if(!inputEl||!chatEl)return;

  const texto=(chipMsg||inputEl.value).trim();
  if(!texto)return;
  
  if(!ANTHROPIC_API_KEY){
    const chatEl2=document.getElementById('mad-chat');
    chatEl2.innerHTML+=`<div class="ma-d-msg asist"><div class="ma-d-bubble">⚠️ API Key no configurada. Andá a <strong>Sistema → Usuarios</strong> y pegá tu key de Anthropic en la sección "MetoAsist — API Key".</div></div>`;
    chatEl2.scrollTop=chatEl2.scrollHeight;
    return;
  }
  
  if(chipEl){chipEl.style.opacity='0.5';chipEl.style.pointerEvents='none';}
  inputEl.value='';
  inputEl.style.height='44px';

  const histKey='metoasist_dueno_hist';
  const hist=S.get(histKey)||[];

  hist.push({role:'user',content:texto});
  S.set(histKey,hist);

  chatEl.insertAdjacentHTML('beforeend',madMsgHTML({role:'user',content:texto}));

  const typingId='mad-typing-'+Date.now();
  chatEl.insertAdjacentHTML('beforeend',`<div id="${typingId}" class="ma-d-msg ma-d-asist"><div class="ma-d-avatar">✦</div><div class="ma-d-bubble"><div class="ma-d-typing"><div class="ma-d-dot"></div><div class="ma-d-dot"></div><div class="ma-d-dot"></div></div></div></div>`);
  chatEl.scrollTop=chatEl.scrollHeight;

  try{
    const sistema=madGetContext();
    let apiMessages=hist.map(m=>({role:m.role,content:m.content}));
    if(apiMessages.length>60){
      const resumen=`(Contexto: llevamos ${apiMessages.length} mensajes. Recordás todo el historial completo.)`;
      apiMessages=[{role:'user',content:resumen},{role:'assistant',content:'Entendido, sigo con contexto completo.'},...apiMessages.slice(-60)];
    }

    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_API_KEY,'anthropic-dangerous-direct-browser-access':'true','anthropic-version':'2023-06-01'},
      body:JSON.stringify({
        model:'claude-sonnet-4-20250514',
        max_tokens:800,
        system:sistema,
        messages:apiMessages
      })
    });
    const data=await res.json();
    const reply=data?.content?.[0]?.text||'No pude conectarme. Intentá de nuevo en un momento.';

    document.getElementById(typingId)?.remove();

    hist.push({role:'assistant',content:reply});
    S.set(histKey,hist);

    document.getElementById('mad-sub').textContent=`Asistente ejecutivo · ${hist.length} mensajes en memoria`;
    chatEl.insertAdjacentHTML('beforeend',madMsgHTML({role:'assistant',content:reply}));
    chatEl.scrollTop=chatEl.scrollHeight;

  }catch(e){
    document.getElementById(typingId)?.remove();
    const errMsg='Sin conexión ahora mismo. Revisá tu internet e intentá de nuevo.';
    hist.push({role:'assistant',content:errMsg});
    S.set(histKey,hist);
    chatEl.insertAdjacentHTML('beforeend',madMsgHTML({role:'assistant',content:errMsg}));
    chatEl.scrollTop=chatEl.scrollHeight;
  }
  if(chipEl){chipEl.style.opacity='1';chipEl.style.pointerEvents='';}
}

function madLimpiarChat(){
  const n=S.get('metoasist_dueno_hist')?.length||0;
  if(!confirm(`¿Borrar los ${n} mensajes del historial de MetoAsist? Esta acción no se puede deshacer.`))return;
  S.set('metoasist_dueno_hist',[]);
  madRenderChat();
  toast('🗑 Historial de MetoAsist borrado');
}

// ── SPLASH / BRIEFING AL INGRESAR ──
async function madShowSplash(){
  const splash=document.getElementById('metoasist-splash');
  const hr=new Date().getHours();
  const saludo=hr<12?'Buenos días':hr<18?'Buenas tardes':'Buenas noches';
  document.getElementById('mad-splash-greeting').textContent=`${saludo}, ${currentUser?.nombre?.split(' ')[0]||''}`;
  document.getElementById('mad-splash-date').textContent=new Date().toLocaleDateString('es-AR',{weekday:'long',year:'numeric',month:'long',day:'numeric'}).toUpperCase();
  document.getElementById('mad-splash-brief').innerHTML='<div class="ma-d-typing" style="justify-content:center;padding:20px"><div class="ma-d-dot"></div><div class="ma-d-dot"></div><div class="ma-d-dot"></div></div><div style="text-align:center;font-size:12px;color:var(--muted);margin-top:8px">Analizando datos del sistema...</div>';
  splash.classList.add('open');

  try{
    const {system,messages}=madGetBriefingPrompt();
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_API_KEY,'anthropic-dangerous-direct-browser-access':'true','anthropic-version':'2023-06-01'},
      body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:600,system,messages})
    });
    const data=await res.json();
    const brief=data?.content?.[0]?.text||'No pude generar el briefing. Podés consultarme después desde el orbe dorado.';
    document.getElementById('mad-splash-brief').textContent=brief;

    // Guardar briefing como primer mensaje del día en el historial
    const histKey='metoasist_dueno_hist';
    const hist=S.get(histKey)||[];
    const todayTag=`[Briefing ${todayStr()}]`;
    // Solo agregar si no existe briefing de hoy
    if(!hist.some(m=>m.content?.includes(todayTag))){
      hist.push({role:'user',content:`${todayTag} Dame el briefing ejecutivo del día.`});
      hist.push({role:'assistant',content:brief});
      S.set(histKey,hist);
    }
  }catch(e){
    document.getElementById('mad-splash-brief').textContent='No pude conectarme para generar el briefing. Revisá tu conexión e intentá desde el orbe dorado.';
  }
}

function madCloseSplash(){
  const _mas=document.getElementById('metoasist-splash');if(_mas)_mas.classList.remove('open');
}

// ── INIT: Se activa en bootApp si el usuario es dueño ──
function madInit(){
  const roles=getUserRoles(currentUser);
  if(!roles.includes('dueno'))return;
  // Mostrar el orbe
  const _orb2=document.getElementById('metoasist-orb');if(_orb2)_orb2.style.display='flex';
  // Check si hay alertas urgentes para badge
  const auds=S.get('auditorias');
  const segs=S.get('crm_seguimientos')||[];
  const today=todayStr();
  let urgentes=0;
  auds.forEach(a=>{
    [a.fDoc,a.fExterna,a.fInsitu,a.fPrep,a.fInforme].forEach(f=>{
      if(f){const d=diffDays(f);if(d!==null&&d>=0&&d<=2)urgentes++;}
    });
  });
  urgentes+=segs.filter(s=>!s.hecho&&s.fecha<today).length;
  const badge=document.getElementById('mad-badge');
  if(urgentes>0){badge.style.display='flex';badge.textContent=urgentes>9?'9+':urgentes;}

  // Mostrar splash/briefing al ingresar
  // Solo mostrar si no se mostró hoy ya
  const lastBriefing=sessionStorage.getItem('mad_splash_shown');
  if(!lastBriefing||lastBriefing!==todayStr()){
    sessionStorage.setItem('mad_splash_shown',todayStr());
    setTimeout(()=>madShowSplash(),600);
  }
}


// ══════════════════════════════════════════════════════════════
// ── MÓDULO LIQUIDACIÓN DE SUELDOS ──
// ══════════════════════════════════════════════════════════════

const CARGAS_SOC={
  jubilacion_emp:0.11, osocial_emp:0.03, sindicato_emp:0.02,
  jubilacion_pat:0.16, osocial_pat:0.06, art_pat:0.03,
};

// Unifica vendedores + consultores + personal extra en una sola nómina
function sueldosGetNomina(){
  const vendedores=S.get('vendedores').filter(v=>v.estado!=='Inactivo');
  const consultores=S.get('auditores').filter(a=>a.estado!=='Inactivo');
  const extras=S.get('personal_sueldos')||[];
  const config=getSueldosConfig();

  const nomina=[];

  vendedores.forEach(v=>{
    const cfg=config['v_'+v.id]||{};
    nomina.push({
      _key:'v_'+v.id, _tipo:'Vendedor', _src:v,
      id:v.id, nombre:v.nombre, cargo:cfg.cargo||'Vendedor',
      cuil:cfg.cuil||'', ingreso:v.ingreso||'',
      sueldoBruto:Number(cfg.sueldoBruto||v.sueldo)||0,
      antiguedadPct:Number(cfg.antiguedadPct)||0,
      presentismo:cfg.presentismo!==false,
      sindicato:cfg.sindicato!==undefined?cfg.sindicato:true,
      adicionales:Number(cfg.adicionales)||0,
      hsExtras:Number(cfg.hsExtras)||0,
      retGanancias:Number(cfg.retGanancias)||0,
      cbu:cfg.cbu||'', activo:cfg.activo!==false,
      comision:Number(v.comision)||0
    });
  });

  consultores.forEach(c=>{
    const cfg=config['c_'+c.id]||{};
    nomina.push({
      _key:'c_'+c.id, _tipo:'Consultor', _src:c,
      id:c.id, nombre:c.nombre, cargo:cfg.cargo||c.especialidad||'Consultor',
      cuil:cfg.cuil||c.dni||'', ingreso:cfg.ingreso||'',
      sueldoBruto:Number(cfg.sueldoBruto||c.honorarios)||0,
      antiguedadPct:Number(cfg.antiguedadPct)||0,
      presentismo:cfg.presentismo!==false,
      sindicato:cfg.sindicato!==undefined?cfg.sindicato:true,
      adicionales:Number(cfg.adicionales)||0,
      hsExtras:Number(cfg.hsExtras)||0,
      retGanancias:Number(cfg.retGanancias)||0,
      cbu:cfg.cbu||c.cbu||'', activo:cfg.activo!==false
    });
  });

  extras.forEach(e=>{
    nomina.push({
      _key:'e_'+e.id, _tipo:'Otro', _src:e,
      ...e, activo:e.activo!==false
    });
  });

  return nomina;
}

function sueldosGetLiquidaciones(){return S.get('liquidaciones_sueldos')||[];}

function sueldosUltimoDiaHabil(year,month){
  let d=new Date(year,month+1,0);
  while(d.getDay()===0||d.getDay()===6) d.setDate(d.getDate()-1);
  return d;
}

function sueldosEsUltimoDiaHabil(){
  const hoy=new Date();
  const ultimo=sueldosUltimoDiaHabil(hoy.getFullYear(),hoy.getMonth());
  return hoy.toISOString().split('T')[0]===ultimo.toISOString().split('T')[0];
}

function sueldosCalcular(emp){
  const bruto=Number(emp.sueldoBruto)||0;
  const presentismo=emp.presentismo!==false?Math.round(bruto*0.0833):0;
  const antiguedad=Math.round(bruto*(Number(emp.antiguedadPct)||0)/100);
  const hsExtras=Number(emp.hsExtras)||0;
  const valorHE=bruto>0?Math.round(bruto/200*1.5):0;
  const totalHE=hsExtras*valorHE;
  const adicionales=Number(emp.adicionales)||0;
  const totalHaberes=bruto+presentismo+antiguedad+totalHE+adicionales;
  const jubEmp=Math.round(totalHaberes*CARGAS_SOC.jubilacion_emp);
  const osEmp=Math.round(totalHaberes*CARGAS_SOC.osocial_emp);
  const sindEmp=emp.sindicato!==false?Math.round(totalHaberes*CARGAS_SOC.sindicato_emp):0;
  const ganancias=Number(emp.retGanancias)||0;
  const totalDeducciones=jubEmp+osEmp+sindEmp+ganancias;
  const neto=totalHaberes-totalDeducciones;
  const jubPat=Math.round(totalHaberes*CARGAS_SOC.jubilacion_pat);
  const osPat=Math.round(totalHaberes*CARGAS_SOC.osocial_pat);
  const artPat=Math.round(totalHaberes*CARGAS_SOC.art_pat);
  const totalPatronal=jubPat+osPat+artPat;
  const costoTotal=totalHaberes+totalPatronal;
  return{bruto,presentismo,antiguedad,totalHE,hsExtras,valorHE,adicionales,totalHaberes,jubEmp,osEmp,sindEmp,ganancias,totalDeducciones,neto,jubPat,osPat,artPat,totalPatronal,costoTotal};
}

function sueldosAutoLiquidar(){
  const hoy=new Date();
  const ym=hoy.getFullYear()+'-'+String(hoy.getMonth()+1).padStart(2,'0');
  const liquidaciones=sueldosGetLiquidaciones();
  if(liquidaciones.some(l=>l.periodo===ym))return;
  if(!sueldosEsUltimoDiaHabil())return;
  const nomina=sueldosGetNomina().filter(e=>e.activo!==false&&e.sueldoBruto>0);
  if(!nomina.length)return;
  const nuevaLiq={
    id:Date.now(),periodo:ym,fecha:todayStr(),estado:'Generada',
    empleados:nomina.map(emp=>{
      const calc=sueldosCalcular(emp);
      return{key:emp._key,tipo:emp._tipo,nombre:emp.nombre,cargo:emp.cargo,...calc};
    })
  };
  liquidaciones.push(nuevaLiq);
  S.set('liquidaciones_sueldos',liquidaciones);
  toast('💰 Liquidación de sueldos generada automáticamente para '+ym);
}

function sueldosLiquidarManual(ym){
  if(!ym)return;
  const liquidaciones=sueldosGetLiquidaciones();
  if(liquidaciones.some(l=>l.periodo===ym)){toast('⚠️ Ya existe liquidación para ese período');return;}
  const nomina=sueldosGetNomina().filter(e=>e.activo!==false&&e.sueldoBruto>0);
  if(!nomina.length){toast('⚠️ No hay personal con sueldo configurado');return;}
  const nuevaLiq={
    id:Date.now(),periodo:ym,fecha:todayStr(),estado:'Generada',
    empleados:nomina.map(emp=>{
      const calc=sueldosCalcular(emp);
      return{key:emp._key,tipo:emp._tipo,nombre:emp.nombre,cargo:emp.cargo,...calc};
    })
  };
  liquidaciones.push(nuevaLiq);
  S.set('liquidaciones_sueldos',liquidaciones);
  toast('✅ Liquidación generada para '+ym);
  renderSueldos();
}

function sueldosPagarLiq(liqId){
  const lqs=sueldosGetLiquidaciones();const l=lqs.find(x=>x.id===liqId);
  if(l){l.estado='Pagada';l.fechaPago=todayStr();S.set('liquidaciones_sueldos',lqs);}
  toast('✅ Liquidación pagada');renderSueldos();
}
function sueldosDelLiq(liqId){
  if(!confirm('¿Eliminar esta liquidación?'))return;
  S.set('liquidaciones_sueldos',sueldosGetLiquidaciones().filter(l=>l.id!==liqId));
  toast('🗑 Eliminada');renderSueldos();
}

// Configurar datos salariales de un vendedor/consultor existente
function sueldosConfigEmp(key){
  const nomina=sueldosGetNomina();
  const emp=nomina.find(e=>e._key===key);
  if(!emp)return;
  openModal('modal-sueldo-emp','edit');
  document.getElementById('se-modal-title').textContent='Configurar sueldo — '+emp.nombre;
  document.getElementById('se-key').value=key;
  document.getElementById('se-is-extra').value='0';
  document.getElementById('se-nombre').value=emp.nombre;
  document.getElementById('se-nombre').readOnly=true;
  document.getElementById('se-cargo').value=emp.cargo||'';
  document.getElementById('se-cuil').value=emp.cuil||'';
  document.getElementById('se-ingreso').value=emp.ingreso||'';
  document.getElementById('se-bruto').value=emp.sueldoBruto||'';
  document.getElementById('se-antiguedad').value=emp.antiguedadPct||0;
  document.getElementById('se-presentismo').checked=emp.presentismo!==false;
  document.getElementById('se-sindicato').checked=emp.sindicato!==false;
  document.getElementById('se-adicionales').value=emp.adicionales||0;
  document.getElementById('se-hsextras').value=emp.hsExtras||0;
  document.getElementById('se-ganancias').value=emp.retGanancias||0;
  document.getElementById('se-cbu').value=emp.cbu||'';
}

// Guardar config salarial
function sueldosGuardarEmpleado(){
  const key=document.getElementById('se-key').value;
  const isExtra=document.getElementById('se-is-extra').value==='1';

  const datos={
    cargo:document.getElementById('se-cargo').value.trim(),
    cuil:document.getElementById('se-cuil').value.trim(),
    ingreso:document.getElementById('se-ingreso').value,
    sueldoBruto:Number(document.getElementById('se-bruto').value)||0,
    antiguedadPct:Number(document.getElementById('se-antiguedad').value)||0,
    presentismo:document.getElementById('se-presentismo').checked,
    sindicato:document.getElementById('se-sindicato').checked,
    adicionales:Number(document.getElementById('se-adicionales').value)||0,
    hsExtras:Number(document.getElementById('se-hsextras').value)||0,
    retGanancias:Number(document.getElementById('se-ganancias').value)||0,
    cbu:document.getElementById('se-cbu').value.trim(),
    activo:true
  };

  if(!datos.sueldoBruto){toast('⚠️ Ingresá el sueldo bruto');return;}

  if(isExtra){
    // Personal extra (no vendedor ni consultor)
    const extras=S.get('personal_sueldos')||[];
    const nombre=document.getElementById('se-nombre').value.trim();
    if(!nombre){toast('⚠️ Ingresá el nombre');return;}
    if(key){
      const idx=extras.findIndex(e=>e.id===Number(key));
      if(idx>-1) extras[idx]={...extras[idx],...datos,nombre};
      else{datos.id=Date.now();datos.nombre=nombre;extras.push(datos);}
    }else{
      datos.id=Date.now();datos.nombre=nombre;extras.push(datos);
    }
    S.set('personal_sueldos',extras);
  }else{
    // Vendedor o consultor — guardar en config
    const config=getSueldosConfig();
    config[key]=datos;
    setSueldosConfig(config);
  }
  closeModal('modal-sueldo-emp');
  toast('✅ Sueldo configurado');
  renderSueldos();
}

function sueldosNewExtra(){
  openModal('modal-sueldo-emp','new');
  document.getElementById('se-modal-title').textContent='Nuevo Personal (Otro)';
  document.getElementById('se-key').value='';
  document.getElementById('se-is-extra').value='1';
  document.getElementById('se-nombre').value='';
  document.getElementById('se-nombre').readOnly=false;
  ['se-cargo','se-cuil','se-ingreso','se-cbu'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('se-bruto').value='';
  document.getElementById('se-antiguedad').value='0';
  document.getElementById('se-adicionales').value='0';
  document.getElementById('se-hsextras').value='0';
  document.getElementById('se-ganancias').value='0';
  document.getElementById('se-presentismo').checked=true;
  document.getElementById('se-sindicato').checked=true;
}

function sueldosToggleEmp(key){
  if(key.startsWith('e_')){
    const extras=S.get('personal_sueldos')||[];
    const e=extras.find(x=>'e_'+x.id===key);if(e){e.activo=!e.activo;S.set('personal_sueldos',extras);}
  }else{
    const config=getSueldosConfig();
    config[key]=config[key]||{};
    config[key].activo=config[key].activo===false?true:false;
    setSueldosConfig(config);
  }
  renderSueldos();
}

function sueldosDelExtra(id){
  if(!confirm('¿Eliminar?'))return;
  S.set('personal_sueldos',(S.get('personal_sueldos')||[]).filter(e=>e.id!==id));
  toast('🗑 Eliminado');renderSueldos();
}

function sueldosVerDetalle(liqId){
  const liq=sueldosGetLiquidaciones().find(l=>l.id===liqId);if(!liq)return;
  const MES_NOM=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const[y,m]=liq.periodo.split('-');const mesNom=MES_NOM[parseInt(m)-1]+' '+y;
  const totalNeto=liq.empleados.reduce((s,e)=>s+e.neto,0);
  const totalCosto=liq.empleados.reduce((s,e)=>s+e.costoTotal,0);
  const totalPatronal=liq.empleados.reduce((s,e)=>s+e.totalPatronal,0);
  const tipoColor={Vendedor:'var(--accent3)',Consultor:'#c8a84a',Otro:'var(--accent)'};
  const html=`<div style="max-height:70vh;overflow-y:auto;padding:4px">
    <div style="display:flex;gap:12px;margin-bottom:18px">
      <div style="flex:1;background:rgba(200,168,74,0.08);border:1px solid rgba(200,168,74,0.2);border-radius:12px;padding:14px;text-align:center">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Total Neto</div>
        <div style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:var(--accent3)">${fmt(totalNeto)}</div>
      </div>
      <div style="flex:1;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:12px;padding:14px;text-align:center">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Cargas Patronales</div>
        <div style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:var(--warn)">${fmt(totalPatronal)}</div>
      </div>
      <div style="flex:1;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:14px;text-align:center">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Costo Total Empresa</div>
        <div style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:var(--danger)">${fmt(totalCosto)}</div>
      </div>
    </div>
    ${liq.empleados.map(e=>`
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div>
          <div style="display:flex;align-items:center;gap:8px"><span style="font-family:'Syne',sans-serif;font-weight:700;font-size:15px">${e.nombre}</span><span class="badge" style="background:rgba(255,255,255,0.05);border:1px solid ${tipoColor[e.tipo]||'var(--muted)'};color:${tipoColor[e.tipo]||'var(--muted)'};font-size:9px">${e.tipo}</span></div>
          <div style="font-size:11px;color:var(--muted)">${e.cargo||'—'}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase">Neto</div>
          <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--accent3)">${fmt(e.neto)}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <div style="font-size:10px;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;border-bottom:1px solid var(--border);padding-bottom:4px">Haberes</div>
          <div style="font-size:12px;display:flex;flex-direction:column;gap:3px">
            <div style="display:flex;justify-content:space-between"><span>Básico</span><span style="font-weight:600">${fmt(e.bruto)}</span></div>
            ${e.presentismo?`<div style="display:flex;justify-content:space-between"><span>Presentismo</span><span>${fmt(e.presentismo)}</span></div>`:''}
            ${e.antiguedad?`<div style="display:flex;justify-content:space-between"><span>Antigüedad</span><span>${fmt(e.antiguedad)}</span></div>`:''}
            ${e.totalHE?`<div style="display:flex;justify-content:space-between"><span>Hs extras (${e.hsExtras})</span><span>${fmt(e.totalHE)}</span></div>`:''}
            ${e.adicionales?`<div style="display:flex;justify-content:space-between"><span>Adicionales</span><span>${fmt(e.adicionales)}</span></div>`:''}
            <div style="display:flex;justify-content:space-between;border-top:1px solid var(--border);padding-top:4px;margin-top:4px;font-weight:700;color:var(--accent)"><span>Total</span><span>${fmt(e.totalHaberes)}</span></div>
          </div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--danger);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;border-bottom:1px solid var(--border);padding-bottom:4px">Deducciones</div>
          <div style="font-size:12px;display:flex;flex-direction:column;gap:3px">
            <div style="display:flex;justify-content:space-between"><span>Jubilación 11%</span><span>- ${fmt(e.jubEmp)}</span></div>
            <div style="display:flex;justify-content:space-between"><span>Obra social 3%</span><span>- ${fmt(e.osEmp)}</span></div>
            ${e.sindEmp?`<div style="display:flex;justify-content:space-between"><span>Sindicato 2%</span><span>- ${fmt(e.sindEmp)}</span></div>`:''}
            ${e.ganancias?`<div style="display:flex;justify-content:space-between"><span>Ganancias</span><span>- ${fmt(e.ganancias)}</span></div>`:''}
            <div style="display:flex;justify-content:space-between;border-top:1px solid var(--border);padding-top:4px;margin-top:4px;font-weight:700;color:var(--danger)"><span>Total</span><span>- ${fmt(e.totalDeducciones)}</span></div>
          </div>
        </div>
      </div>
      <div style="margin-top:10px;font-size:11px;color:var(--muted)">Patronal: Jub ${fmt(e.jubPat)} + OS ${fmt(e.osPat)} + ART ${fmt(e.artPat)} = <b style="color:var(--warn)">${fmt(e.totalPatronal)}</b> · Costo empresa: <b style="color:var(--danger)">${fmt(e.costoTotal)}</b></div>
    </div>`).join('')}
  </div>`;
  const overlay=document.createElement('div');
  overlay.className='modal-overlay open';
  overlay.onclick=e=>{if(e.target===overlay)overlay.remove();};
  overlay.innerHTML=`<div class="modal modal-lg" style="width:800px"><div class="modal-head"><div class="modal-title">📄 Recibos — ${mesNom}</div><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button></div><div class="modal-body">${html}</div><div class="modal-footer"><span class="badge ${liq.estado==='Pagada'?'badge-success':'badge-warn'}">${liq.estado}</span>${liq.estado!=='Pagada'?`<button class="btn btn-primary" onclick="sueldosPagarLiq(${liq.id});this.closest('.modal-overlay').remove()">✅ Marcar Pagada</button>`:''}<button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cerrar</button></div></div>`;
  document.body.appendChild(overlay);
}

function renderSueldos(){
  const el=document.getElementById('sueldos-content');if(!el)return;
  const nomina=sueldosGetNomina();
  const activos=nomina.filter(e=>e.activo!==false);
  const conSueldo=activos.filter(e=>e.sueldoBruto>0);
  const sinSueldo=activos.filter(e=>!e.sueldoBruto);
  const liquidaciones=sueldosGetLiquidaciones().sort((a,b)=>b.periodo.localeCompare(a.periodo));
  const hoy=new Date();
  const ym=hoy.getFullYear()+'-'+String(hoy.getMonth()+1).padStart(2,'0');
  const MES_NOM=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const ultimoDH=sueldosUltimoDiaHabil(hoy.getFullYear(),hoy.getMonth());
  const diasParaLiq=Math.max(0,Math.ceil((ultimoDH-hoy)/86400000));
  const liqMesActual=liquidaciones.find(l=>l.periodo===ym);
  const totalEstNeto=conSueldo.reduce((s,e)=>s+sueldosCalcular(e).neto,0);
  const totalEstCosto=conSueldo.reduce((s,e)=>s+sueldosCalcular(e).costoTotal,0);
  const totalBruto=conSueldo.reduce((s,e)=>s+(e.sueldoBruto||0),0);
  const tipoColor={Vendedor:'var(--accent3)',Consultor:'#c8a84a',Otro:'var(--accent)'};
  const tipoBg={Vendedor:'rgba(200,168,74,0.1)',Consultor:'rgba(184,146,46,0.1)',Otro:'rgba(212,175,55,0.1)'};
  const tipoBorder={Vendedor:'rgba(200,168,74,0.3)',Consultor:'rgba(184,146,46,0.3)',Otro:'rgba(212,175,55,0.3)'};

  sueldosAutoLiquidar();

  el.innerHTML=`
  <!-- AUTO-LIQ BANNER -->
  <div style="background:linear-gradient(135deg,rgba(255,195,0,0.08),rgba(255,170,0,0.03));border:1px solid rgba(255,195,0,0.25);border-radius:14px;padding:18px 22px;margin-bottom:20px;display:flex;align-items:center;gap:16px">
    <div style="font-size:28px">⏰</div>
    <div style="flex:1">
      <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:#ffc300">Liquidación automática</div>
      <div style="font-size:12px;color:var(--muted);margin-top:3px">
        ${liqMesActual
          ?`Liquidación de este mes: <b style="color:${liqMesActual.estado==='Pagada'?'var(--accent3)':'var(--warn)'}">${liqMesActual.estado}</b> (${fmtD(liqMesActual.fecha)})`
          :diasParaLiq<=0
            ?'<b style="color:var(--accent3)">¡Hoy es el último día hábil!</b> Se genera automáticamente'
            :`Próxima: <b style="color:var(--accent)">${diasParaLiq} día${diasParaLiq>1?'s':''}</b> (${fmtD(ultimoDH.toISOString().split('T')[0])})`
        }
      </div>
    </div>
    ${!liqMesActual?`<button class="btn btn-primary" onclick="sueldosLiquidarManual('${ym}')">⚡ Liquidar ahora</button>`:''}
  </div>

  <!-- KPIs -->
  <div class="grid-4" style="margin-bottom:20px">
    <div class="stat-card" style="cursor:pointer" onclick="sueldosDetalle('nomina')" title="Ver nómina"><div class="stat-icon cyan">🧑‍💼</div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Nómina activa</div><div style="font-family:'Syne',sans-serif;font-size:32px;font-weight:800;color:var(--accent)">${conSueldo.length}</div><div style="font-size:10px;color:var(--muted);margin-top:2px">${nomina.filter(e=>e._tipo==='Vendedor'&&e.activo!==false).length} vend · ${nomina.filter(e=>e._tipo==='Consultor'&&e.activo!==false).length} cons · ${nomina.filter(e=>e._tipo==='Otro'&&e.activo!==false).length} otros →</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="sueldosDetalle('bruto')" title="Ver detalle"><div class="stat-icon green">💵</div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Total bruto</div><div style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:var(--accent3)">${fmt(totalBruto)}</div><div style="font-size:10px;color:var(--muted)">→</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="sueldosDetalle('neto')" title="Ver detalle"><div class="stat-icon purple">💰</div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Neto estimado</div><div style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:#c8a84a">${fmt(totalEstNeto)}</div><div style="font-size:10px;color:var(--muted)">→</div></div>
    <div class="stat-card" style="cursor:pointer" onclick="sueldosDetalle('costo')" title="Ver detalle"><div class="stat-icon red">🏢</div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Costo empresa</div><div style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:var(--danger)">${fmt(totalEstCosto)}</div><div style="font-size:10px;color:var(--muted)">→</div></div>
  </div>

  ${sinSueldo.length?`
  <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.2);border-radius:12px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:12px">
    <span style="font-size:20px">⚠️</span>
    <div style="flex:1;font-size:12px;color:var(--warn)"><b>${sinSueldo.length} persona${sinSueldo.length>1?'s':''}</b> sin sueldo configurado: ${sinSueldo.map(e=>e.nombre).join(', ')}. <span style="color:var(--muted)">Hacé click en ✏️ para configurar.</span></div>
  </div>`:''}

  <!-- NÓMINA -->
  <div class="table-wrap">
    <div class="table-header">
      <div class="table-title">🧑‍💼 Nómina Completa (${nomina.length})</div>
      <button class="btn btn-primary" onclick="sueldosNewExtra()">+ Personal adicional</button>
    </div>
    ${nomina.length?`<table>
      <thead><tr><th>Nombre</th><th>Tipo</th><th>Cargo</th><th>Bruto</th><th>Neto est.</th><th>Costo emp.</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>${nomina.map(e=>{
        const calc=sueldosCalcular(e);
        const activo=e.activo!==false;
        return`<tr style="${!activo?'opacity:0.4':''}${!e.sueldoBruto?';background:rgba(245,158,11,0.04)':''}">
          <td style="font-weight:600">${e.nombre}</td>
          <td><span class="badge" style="background:${tipoBg[e._tipo]};border:1px solid ${tipoBorder[e._tipo]};color:${tipoColor[e._tipo]};font-size:9px">${e._tipo}</span></td>
          <td style="font-size:12px">${e.cargo||'—'}</td>
          <td style="font-family:'DM Mono',monospace;color:${e.sueldoBruto?'var(--accent)':'var(--warn)'}">${e.sueldoBruto?fmt(e.sueldoBruto):'⚠️ Sin config'}</td>
          <td style="font-family:'DM Mono',monospace;color:var(--accent3)">${e.sueldoBruto?fmt(calc.neto):'—'}</td>
          <td style="font-family:'DM Mono',monospace;color:var(--danger)">${e.sueldoBruto?fmt(calc.costoTotal):'—'}</td>
          <td>${activo?'<span class="badge badge-success">Activo</span>':'<span class="badge badge-danger">Excluido</span>'}</td>
          <td style="white-space:nowrap">
            <button class="btn btn-secondary btn-sm" onclick="sueldosConfigEmp('${e._key}')">✏️</button>
            <button class="btn btn-sm" style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);color:var(--warn)" onclick="sueldosToggleEmp('${e._key}')" title="${activo?'Excluir de liquidación':'Incluir en liquidación'}">${activo?'⏸':'▶'}</button>
            ${e._tipo==='Otro'?`<button class="btn btn-danger btn-sm" onclick="sueldosDelExtra(${e._src.id})">🗑</button>`:''}
          </td>
        </tr>`;}).join('')}</tbody>
    </table>`:'<div class="empty-state"><div class="icon">🧑‍💼</div><h3>Sin personal</h3><p>Registrá vendedores o consultores primero</p></div>'}
  </div>

  <!-- HISTORIAL -->
  <div class="table-wrap" style="margin-top:20px">
    <div class="table-header">
      <div class="table-title">📋 Liquidaciones</div>
      <div style="display:flex;gap:8px;align-items:center">
        <select id="sueldo-liq-per" style="padding:6px 10px;font-size:12px;width:150px">
          ${Array.from({length:6},(_,i)=>{
            const d=new Date(hoy.getFullYear(),hoy.getMonth()-i,1);
            const v=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
            return liquidaciones.some(l=>l.periodo===v)?'':`<option value="${v}">${MES_NOM[d.getMonth()]} ${d.getFullYear()}</option>`;
          }).filter(Boolean).join('')||'<option value="">Todo liquidado</option>'}
        </select>
        <button class="btn btn-secondary" onclick="const v=document.getElementById('sueldo-liq-per').value;if(v)sueldosLiquidarManual(v)">+ Liquidar período</button>
      </div>
    </div>
    ${liquidaciones.length?`<table>
      <thead><tr><th>Período</th><th>Fecha</th><th>Personal</th><th>Total Neto</th><th>Costo Empresa</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>${liquidaciones.map(l=>{
        const tN=l.empleados.reduce((s,e)=>s+e.neto,0);
        const tC=l.empleados.reduce((s,e)=>s+e.costoTotal,0);
        const[y,m]=l.periodo.split('-');
        return`<tr>
          <td style="font-weight:700">${MES_NOM[parseInt(m)-1]} ${y}</td>
          <td>${fmtD(l.fecha)}</td>
          <td>${l.empleados.length}</td>
          <td style="font-family:'DM Mono',monospace;color:var(--accent3);font-weight:700">${fmt(tN)}</td>
          <td style="font-family:'DM Mono',monospace;color:var(--danger)">${fmt(tC)}</td>
          <td><span class="badge ${l.estado==='Pagada'?'badge-success':'badge-warn'}">${l.estado}</span></td>
          <td style="white-space:nowrap">
            <button class="btn btn-secondary btn-sm" onclick="sueldosVerDetalle(${l.id})">📄 Recibos</button>
            ${l.estado!=='Pagada'?`<button class="btn btn-sm" style="background:rgba(200,168,74,0.1);border:1px solid rgba(200,168,74,0.3);color:var(--accent3)" onclick="sueldosPagarLiq(${l.id})">💳 Pagar</button>`:''}
            <button class="btn btn-danger btn-sm" onclick="sueldosDelLiq(${l.id})">🗑</button>
          </td>
        </tr>`;}).join('')}</tbody>
    </table>`:'<div class="empty-state"><div class="icon">📋</div><h3>Sin liquidaciones</h3><p>Se generan automáticamente el último día hábil o podés liquidar manualmente</p></div>'}
  </div>`;
}

// ══════════════════════════════════════════════════════════════
// PWA — Service Worker
if("serviceWorker" in navigator){navigator.serviceWorker.register("sw.js").catch(()=>{});}
// ══════════════════════════════════════════════════════════════
// PORTAL DEL CLIENTE BPC:2026
// ══════════════════════════════════════════════════════════════

// --- Cuestionario BPC:2026 — 6 dimensiones, 30 preguntas, 100 pts ---
const BPC_DIMENSIONES = [
  {
    id:'D1', nombre:'Liderazgo y Estructura Comercial', maxPts:25, icon:'🏛️', color:'#f59e0b',
    preguntas:[
      {id:'D1Q1', texto:'¿Existe un plan estratégico comercial documentado con objetivos anuales y KPIs medibles?', ref:'A.5.1'},
      {id:'D1Q2', texto:'¿La estructura organizacional de la función comercial está definida con roles y responsabilidades claras?', ref:'A.5.3'},
      {id:'D1Q3', texto:'¿Existe un responsable formal de la gestión comercial con mandato documentado?', ref:'A.5.4'},
      {id:'D1Q4', texto:'¿El proceso de ventas está documentado con etapas, criterios de avance y responsables?', ref:'A.7.1'},
      {id:'D1Q5', texto:'¿Se realizan revisiones de pipeline documentadas con frecuencia mínima semanal?', ref:'A.7.4'},
      {id:'D1Q6', texto:'¿Los canales de venta están identificados, gestionados y con métricas por canal?', ref:'A.7.5'}
    ]
  },
  {
    id:'D2', nombre:'Compromiso de la Dirección', maxPts:22, icon:'🎯', color:'#c8a84a',
    preguntas:[
      {id:'D2Q1', texto:'¿La misión, visión y valores comerciales están documentados y comunicados al equipo?', ref:'A.5.2'},
      {id:'D2Q2', texto:'¿Se realiza una revisión estratégica anual documentada con acta y acuerdos formalizados?', ref:'A.5.5'},
      {id:'D2Q3', texto:'¿El presupuesto comercial está aprobado, monitoreado y con varianza documentada?', ref:'A.5.6'},
      {id:'D2Q4', texto:'¿Existe un código de conducta comercial documentado y conocido por el 100% del equipo?', ref:'A.10.5'},
      {id:'D2Q5', texto:'¿Los materiales comerciales están libres de promesas no respaldadas contractualmente?', ref:'A.10.1'}
    ]
  },
  {
    id:'D3', nombre:'Capital Humano y Capacitación', maxPts:18, icon:'👥', color:'#c8a84a',
    preguntas:[
      {id:'D3Q1', texto:'¿Los perfiles de cargo del equipo comercial están actualizados y formalmente aprobados?', ref:'A.6.1'},
      {id:'D3Q2', texto:'¿Existe un proceso de selección con criterios técnicos y conductuales definidos?', ref:'A.6.2'},
      {id:'D3Q3', texto:'¿Hay un programa de inducción para vendedores nuevos con verificación de comprensión?', ref:'A.6.3'},
      {id:'D3Q4', texto:'¿Se ejecuta un plan de capacitación comercial anual con tasa >= 80%?', ref:'A.6.4'},
      {id:'D3Q5', texto:'¿La evaluación de desempeño incluye indicadores cualitativos de proceso comercial?', ref:'A.6.5'}
    ]
  },
  {
    id:'D4', nombre:'Procesos y Sistemas de Ventas', maxPts:17, icon:'⚙️', color:'#c8a84a',
    preguntas:[
      {id:'D4Q1', texto:'¿La propuesta de valor está documentada, diferenciada y conocida por el equipo?', ref:'A.7.2'},
      {id:'D4Q2', texto:'¿Los materiales de apoyo a la venta están vigentes y coherentes con la propuesta de valor?', ref:'A.7.3'},
      {id:'D4Q3', texto:'¿Existe un proceso documentado de onboarding de clientes nuevos?', ref:'A.7.6'},
      {id:'D4Q4', texto:'¿Hay un proceso de gestión de reclamos con registro, trazabilidad y tiempos de respuesta?', ref:'A.10.4'},
      {id:'D4Q5', texto:'¿Existe un proceso de seguimiento post-venta documentado con responsable y métricas?', ref:'A.11.5'}
    ]
  },
  {
    id:'D5', nombre:'Tecnología e Innovación', maxPts:10, icon:'💻', color:'#8b5cf6',
    preguntas:[
      {id:'D5Q1', texto:'¿Cuentan con un CRM implementado con tasa de adopción >= 90% del equipo?', ref:'A.9.1'},
      {id:'D5Q2', texto:'¿El pipeline está configurado en el CRM con etapas y probabilidades?', ref:'A.9.2'},
      {id:'D5Q3', texto:'¿El CRM está integrado con email y calendario?', ref:'A.9.3'},
      {id:'D5Q4', texto:'¿Existe una política de uso de herramientas digitales comerciales documentada?', ref:'A.9.6'}
    ]
  },
  {
    id:'D6', nombre:'Marketing y Presencia Digital', maxPts:8, icon:'📱', color:'#ec4899',
    preguntas:[
      {id:'D6Q1', texto:'¿Cuentan con un manual de identidad visual vigente y aplicado consistentemente?', ref:'A.8.1'},
      {id:'D6Q2', texto:'¿La presencia digital está activa, alineada a la marca y con actualización regular?', ref:'A.8.3'},
      {id:'D6Q3', texto:'¿Existe un proceso de aprobación de materiales de comunicación comercial?', ref:'A.8.4'},
      {id:'D6Q4', texto:'¿Hay gestión activa de reputación online con monitoreo y protocolo de respuesta?', ref:'A.8.5'}
    ]
  },
  {
    id:'D7', nombre:'Canales de Venta', maxPts:0, icon:'🚀', color:'#06b6d4', esCanales:true,
    preguntas:[
      {id:'D7Q1', texto:'¿Cuál canal de ventas sentís que NO estás potenciando lo suficiente?', tipo:'seleccion_canal', ref:'A.7.5'},
      {id:'D7Q2', texto:'¿Cuál canal de ventas sentís que SÍ estás potenciando al máximo?', tipo:'seleccion_canal', ref:'A.7.5'}
    ]
  },
  {
    id:'D8', nombre:'Visión, Liderazgo y Aprendizajes del Dueño', maxPts:0, icon:'💡', color:'#f59e0b', esReflexiva:true,
    preguntas:[
      {id:'D8Q1', texto:'Cuando abriste la empresa, ¿te imaginabas que ibas a vender como vendés hoy? ¿Qué cambió en el camino — para bien y para mal?', tipo:'reflexiva', ref:'A.5.8'},
      {id:'D8Q2', texto:'Si dejáramos de lado el contexto económico que estás viviendo hoy, y te enfocás solo en tu empresa: ¿qué es lo primero que sumarías al área comercial? ¿Y qué sacarías sin dudarlo?', tipo:'reflexiva', ref:'A.5.9'},
      {id:'D8Q3', texto:'¿En qué aspectos de la gestión comercial sentís que no estás del todo formado o que te falta apoyo? Puede ser estrategia, ventas, marketing, tecnología, liderazgo de equipos, finanzas comerciales u otro.', tipo:'reflexiva', ref:'A.5.10'},
      {id:'D8Q4', texto:'¿Cuánto tiempo dedicás por semana a pensar en el área comercial — no a apagar incendios, sino a pensar en serio cómo mejorarla? ¿Te alcanza ese tiempo?', tipo:'reflexiva', ref:'A.5.11'},
      {id:'D8Q5', texto:'Si tuvieras que elegir una sola brecha — algo que, si lo resolvieras, haría crecer tu empresa comercialmente de manera significativa — ¿cuál sería?', tipo:'reflexiva', ref:'A.5.12'},
      {id:'D8Q6', texto:'¿Recordás alguna oportunidad de venta importante que se haya perdido? ¿Qué falló — una persona, un proceso, una herramienta, el timing?', tipo:'reflexiva', ref:'A.8.1'},
      {id:'D8Q7', texto:'¿Cómo describirías el nivel de compromiso real de tu equipo comercial con los resultados de la empresa? ¿Sienten que es su empresa también, o que es un trabajo más?', tipo:'reflexiva', ref:'A.6.6'},
      {id:'D8Q8', texto:'¿Qué tan abiertos creés que están tus clientes a que automatices partes del proceso comercial — seguimientos, recordatorios, propuestas? ¿Lo verían como algo positivo o como pérdida del trato personal?', tipo:'reflexiva', ref:'A.9.7'},
      {id:'D8Q9', texto:'Si pudieras hablar con la versión de vos mismo de hace 5 años, ¿qué le dirías sobre cómo gestionar el área comercial de una empresa como la tuya?', tipo:'reflexiva', ref:'A.5.13'}
    ]
  }
];

const BPC_NIVELES = [
  {min:80, max:100, nombre:'Excelencia Comercial', color:'#c8a84a', icon:'🏆', desc:'Sistema comercial maduro, integrado y en mejora continua. Referente del sector.'},
  {min:62, max:79,  nombre:'Madurez Avanzada',     color:'#c8a84a', icon:'🌟', desc:'Sistema comercial sólido con oportunidades puntuales de optimización.'},
  {min:44, max:61,  nombre:'Madurez Intermedia',   color:'#f59e0b', icon:'📈', desc:'Bases establecidas con áreas significativas de mejora en procesos y sistemas.'},
  {min:25, max:43,  nombre:'En Desarrollo',         color:'#f97316', icon:'🔧', desc:'Procesos comerciales en construcción. Requiere trabajo estructural urgente.'},
  {min:0,  max:24,  nombre:'Etapa Inicial',         color:'#ef4444', icon:'🚨', desc:'Sistema comercial incipiente. Necesita intervención integral inmediata.'}
];

function getBPCNivel(score){
  return BPC_NIVELES.find(n=>score>=n.min&&score<=n.max)||BPC_NIVELES[4];
}

// --- Magic Link ---
function generarMagicKey(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let key='';for(let i=0;i<24;i++)key+=chars[Math.floor(Math.random()*chars.length)];
  return key;
}

// ── Plantilla HTML premium para todos los mails del agente ──────────────────
function emailTemplate({ nombreAgente, emailAgente, saludo, bloques, ctaUrl, ctaLabel }){
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>MetoGroup</title></head>
<body style="margin:0;padding:0;background:#f2f1ed;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f2f1ed;padding:40px 20px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

  <!-- HEADER -->
  <tr><td style="background:#0f1923;border-radius:14px 14px 0 0;padding:32px 40px 28px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <div style="font-family:Arial,sans-serif;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:1.5px">METOGROUP</div>
          <div style="font-family:Arial,sans-serif;font-size:9px;color:rgba(255,255,255,0.4);letter-spacing:3px;text-transform:uppercase;margin-top:4px">Auditoría BPC:2026</div>
        </td>
        <td align="right">
          <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#c8a84a,#8a6e2a);display:inline-flex;align-items:center;justify-content:center;font-size:16px">✦</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- SALUDO -->
  <tr><td style="background:#ffffff;padding:40px 40px 0">
    <div style="font-family:Arial,sans-serif;font-size:11px;color:#c8a84a;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px">Mensaje personal</div>
    <div style="font-size:26px;font-weight:400;color:#0f1923;line-height:1.3;margin-bottom:0">${saludo}</div>
    <div style="height:1px;background:linear-gradient(90deg,#c8a84a,transparent);margin:24px 0"></div>
  </td></tr>

  <!-- BLOQUES DE CONTENIDO -->
  ${bloques.map(b => {
    if(b.tipo === 'texto') return `
  <tr><td style="background:#ffffff;padding:0 40px 20px">
    <p style="font-size:15px;line-height:1.9;color:#333;margin:0 0 16px 0">${b.contenido}</p>
  </td></tr>`;

    if(b.tipo === 'destacado') return `
  <tr><td style="background:#ffffff;padding:0 40px 20px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="background:#fefcf3;border-left:3px solid #c8a84a;border-radius:0 8px 8px 0;padding:20px 24px">
        ${b.titulo?`<div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#92770a;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">${b.titulo}</div>`:''}
        <p style="font-size:14px;line-height:1.85;color:#444;margin:0">${b.contenido}</p>
      </td></tr>
    </table>
  </td></tr>`;

    if(b.tipo === 'credenciales') return `
  <tr><td style="background:#ffffff;padding:0 40px 20px">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7f2;border:1px solid #e5dfc0;border-radius:10px;overflow:hidden">
      <tr><td style="padding:18px 24px 14px">
        <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#92770a;letter-spacing:2px;text-transform:uppercase;margin-bottom:16px">Sus datos de acceso</div>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${b.filas.map(f => `<tr>
            <td style="padding:8px 0;font-family:Arial,sans-serif;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px;width:100px;vertical-align:middle">${f.label}</td>
            <td style="padding:8px 0 8px 12px;border-left:1px solid #e5dfc0">
              ${f.href
                ? `<a href="${f.href}" style="font-family:Arial,sans-serif;font-size:13px;color:#c8a84a;font-weight:600;text-decoration:none">${f.valor}</a>`
                : f.grande
                  ? `<span style="font-family:'Courier New',monospace;font-size:22px;font-weight:700;letter-spacing:4px;color:#0f1923">${f.valor}</span>`
                  : `<span style="font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:#0f1923">${f.valor}</span>`
              }
            </td>
          </tr>`).join('')}
        </table>
      </td></tr>
    </table>
  </td></tr>`;

    if(b.tipo === 'divisor') return `
  <tr><td style="background:#ffffff;padding:8px 40px">
    <div style="height:1px;background:#f0ece4"></div>
  </td></tr>`;

    return '';
  }).join('')}

  <!-- CTA -->
  ${ctaUrl ? `
  <tr><td style="background:#ffffff;padding:8px 40px 36px;text-align:center">
    <a href="${ctaUrl}" style="display:inline-block;background:#0f1923;color:#c8a84a;padding:16px 44px;border-radius:8px;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase">${ctaLabel||'Ingresar'}</a>
  </td></tr>` : ''}

  <!-- FIRMA -->
  <tr><td style="background:#ffffff;border-top:1px solid #f0ece4;padding:24px 40px 32px">
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="width:44px;vertical-align:top;padding-right:14px">
          <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#c8a84a,#8a6e2a);display:flex;align-items:center;justify-content:center;font-size:16px;color:#fff;font-weight:700;font-family:Arial,sans-serif">${(nombreAgente||'H').charAt(0)}</div>
        </td>
        <td style="vertical-align:top">
          <div style="font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#0f1923;margin-bottom:2px">${nombreAgente||''}</div>
          <div style="font-family:Arial,sans-serif;font-size:11px;color:#999;margin-bottom:4px">MetoGroup Latam S.A.</div>
          <a href="mailto:${emailAgente||''}" style="font-family:Arial,sans-serif;font-size:11px;color:#c8a84a;text-decoration:none">${emailAgente||''}</a>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#0f1923;border-radius:0 0 14px 14px;padding:20px 40px;text-align:center">
    <div style="font-family:Arial,sans-serif;font-size:10px;color:rgba(255,255,255,0.3);letter-spacing:1px">
      © ${year} MetoGroup Latam S.A. · Este mensaje es confidencial.
    </div>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

async function agenteEnviarBienvenidaCliente(auditoriaId){
  const aud = (S.get('auditorias')||[]).find(x=>x.id===auditoriaId);
  if(!aud) return;
  const cliente = (S.get('clientes')||[]).find(c=>String(c.id)===String(aud.clienteId));
  if(!cliente?.email){
    await agenteAlerta('Bienvenida sin email de cliente','No se pudo enviar el email de bienvenida para la auditoria '+auditoriaId+' — el cliente no tiene email registrado.');
    return;
  }
  const emailCfg = (S.get('email_config')||[])[0]||{};
  if(!emailCfg.smtp_user) return;

  // Crear o actualizar usuario cliente en el sistema
  const usuarios = S.get('usuarios')||[];
  let usuarioCli = usuarios.find(u=>u.email===cliente.email);
  const letras = (cliente.nombre||'cli').replace(/[^a-zA-Z]/g,'').substring(0,3).toLowerCase();
  const nums = String(Math.floor(1000+Math.random()*9000));
  const passGenerada = letras + nums;
  if(!usuarioCli){
    usuarioCli = {
      id: S.nextId('usuarios'),
      nombre: cliente.contacto || cliente.nombre,
      usuario: cliente.email,
      email: cliente.email,
      password: passGenerada,
      rol: 'cliente',
      roles: ['cliente'],
      activo: true,
      clienteId: cliente.id,
      consultor_vinculado: ''
    };
    usuarios.push(usuarioCli);
  } else {
    const idx2 = usuarios.findIndex(u=>u.id===usuarioCli.id);
    if(idx2>-1){ usuarios[idx2].password = passGenerada; usuarios[idx2].rol='cliente'; usuarios[idx2].roles=['cliente']; }
  }
  S.set('usuarios', usuarios);

  const contacto = cliente.contacto || cliente.nombre;
  const agenteNombre = AGENTE.EMAIL_AGENTE_NOMBRE || 'Hernan Quiroz';
  const agenteEmail  = AGENTE.EMAIL_AGENTE || emailCfg.smtp_user;
  const urlSistema = window.location.origin + window.location.pathname;

  const html = emailTemplate({
    nombreAgente: agenteNombre,
    emailAgente: agenteEmail,
    saludo: contacto + ', buen día.',
    ctaUrl: urlSistema,
    ctaLabel: 'Ingresar a la plataforma',
    bloques: [
      { tipo:'texto', contenido:'Mi nombre es Hernán Quiroz, soy parte del equipo de MetoGroup y voy a estar acompañándolo/a durante todo este proceso. Quería escribirle personalmente para contarle de qué se trata lo que arrancamos.' },
      { tipo:'texto', contenido:'Con <strong>'+cliente.nombre+'</strong> iniciamos una <strong>Auditoría BPC:2026</strong> — una evaluación del grado de madurez comercial de la empresa. Vamos a analizar el equipo de ventas, los procesos, la comunicación y el liderazgo comercial. El resultado: un informe concreto con BPC Score y plan de acción real, diseñado específicamente para su empresa.' },
      { tipo:'texto', contenido:'El primer paso es el <strong>Diagnóstico Inicial</strong>. Antes de ingresar, quería pedirle algo puntual.' },
      { tipo:'destacado', titulo:'Un momento para vos', contenido:'Este diagnóstico <strong>no es un trámite</strong>. Es el momento en que el proceso empieza a tomar forma real. De las respuestas que dé acá van a salir todos los documentos, el plan de acción y el informe final.<br><br>Hágalo <strong>tranquilo/a, sin interrupciones</strong> — en la oficina o en casa, donde pueda estar con la cabeza despejada. No hay respuestas correctas ni incorrectas. Hay respuestas honestas, y esas son las únicas que nos sirven.' },
      { tipo:'texto', contenido:'<em style="color:#888">Nuestro equipo va a leer cada respuesta con atención antes de arrancar con el resto del proceso.</em>' },
      { tipo:'divisor' },
      { tipo:'credenciales', filas:[ {label:'Plataforma',valor:urlSistema,href:urlSistema}, {label:'Usuario',valor:cliente.email}, {label:'Contraseña',valor:passGenerada,grande:true} ] },
      { tipo:'texto', contenido:'Ante cualquier duda o inconveniente para ingresar, responda este email y lo resolvemos enseguida. Quedo a su disposición.' }
    ]
  });

    // Encolar para aprobación manual — NO envía todavía
  await agenteEncolarAccion('Email de bienvenida — '+cliente.nombre, {
    destinatario: cliente.email,
    clienteNombre: cliente.nombre,
    auditoriaId,
    tipo: 'email',
    detalle: 'Mail de bienvenida con credenciales de acceso. Usuario: '+cliente.email+' · Contraseña: '+passGenerada,
    html_preview: 'Para: '+cliente.email+' · Asunto: Bienvenido/a — Auditoría BPC:2026 | '+cliente.nombre,
    _payload: {
      from_name: agenteNombre,
      to: cliente.email,
      subject: 'Bienvenido/a — Auditoria BPC:2026 | '+cliente.nombre,
      html,
      text: 'Hola '+contacto+', mi nombre es Hernan Quiroz de MetoGroup. Iniciamos la Auditoria BPC:2026 con '+cliente.nombre+'. Sus accesos: Usuario: '+cliente.email+' | Contrasena: '+passGenerada+' | Plataforma: '+urlSistema
    }
  });
}
async function agentePedirEncargado(auditoriaId){
  const aud = (S.get('auditorias')||[]).find(x=>x.id===auditoriaId);
  if(!aud) return;
  const cliente = (S.get('clientes')||[]).find(c=>String(c.id)===String(aud.clienteId));
  if(!cliente?.email){
    await agenteAlerta('Pedir encargado: cliente sin email','No se pudo solicitar el encargado de proceso para la auditoría <strong>'+auditoriaId+'</strong> ('+aud.clienteNombre+') — el cliente no tiene email registrado.');
    return;
  }
  const emailCfg = (S.get('email_config')||[])[0]||{};
  if(!emailCfg.smtp_user) return;

  const contacto = cliente.contacto || cliente.nombre;
  const fromName = AGENTE.EMAIL_AGENTE_NOMBRE || 'MetoGroup';
  const fromEmail = AGENTE.EMAIL_AGENTE || emailCfg.smtp_user;

  const html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#ffffff">'
    +'<div style="font-size:22px;font-weight:700;margin-bottom:4px;color:#1a1a1a">MetoGroup</div>'
    +'<div style="font-size:10px;letter-spacing:2px;color:#888;text-transform:uppercase;margin-bottom:28px">Auditoría BPC:2026</div>'
    +'<p style="font-size:15px;color:#1a1a1a;margin-bottom:16px">Estimado/a <strong>'+contacto+'</strong>,</p>'
    +'<p style="font-size:13px;color:#444;line-height:1.7;margin-bottom:16px">'
    +'El proceso de auditoría BPC:2026 de <strong>'+cliente.nombre+'</strong> ya está en marcha. '
    +'Para poder avanzar sin interrumpirle a usted, necesitamos que designe una persona de su equipo como <strong>encargado/a de proceso</strong>.</p>'
    +'<div style="background:#fffbea;border-left:4px solid #c8a84a;padding:18px 20px;border-radius:0 8px 8px 0;margin-bottom:24px">'
    +'<div style="font-weight:700;font-size:13px;color:#92770a;margin-bottom:8px">¿Qué hace el encargado/a?</div>'
    +'<ul style="font-size:13px;color:#555;line-height:1.8;margin:0;padding-left:18px">'
    +'<li>Recopilar y enviar la documentación requerida</li>'
    +'<li>Facilitar los accesos digitales al equipo auditor</li>'
    +'<li>Coordinar los emails y tiempos del equipo</li>'
    +'<li>Ser el punto de contacto durante todo el proceso</li>'
    +'</ul>'
    +'<p style="font-size:12px;color:#888;margin:12px 0 0">A partir de la designación, usted no será contactado hasta la <strong>reunión de entrega de informe</strong>.</p>'
    +'</div>'
    +'<p style="font-size:13px;color:#444;line-height:1.7;margin-bottom:8px">'
    +'Por favor, responda este email con los datos de la persona designada:</p>'
    +'<div style="background:#f8f8f8;border-radius:8px;padding:14px 18px;font-size:13px;color:#333;margin-bottom:24px">'
    +'<strong>Nombre completo:</strong><br>'
    +'<strong>Cargo:</strong><br>'
    +'<strong>Email:</strong><br>'
    +'<strong>Teléfono / WhatsApp:</strong>'
    +'</div>'
    +'<div style="border-top:1px solid #eee;padding-top:20px;font-size:11px;color:#888;line-height:1.8">'
    +fromName+'<br>'
    +'<a href="mailto:'+fromEmail+'" style="color:#c8a84a">'+fromEmail+'</a><br>'
    +'MetoGroup Latam S.A.'
    +'</div></div>';

  try {
    await fetch('/.netlify/functions/send-email',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        from_email: emailCfg.smtp_user,
        from_password: emailCfg.smtp_pass,
        from_name: fromName,
        to: cliente.email,
        subject: 'Designación de encargado/a de proceso — Auditoría BPC:2026 | '+cliente.nombre,
        html,
        text: 'Para avanzar con la auditoría BPC:2026, necesitamos que designe un encargado/a de proceso. Responda este email con: Nombre, Cargo, Email y Teléfono de la persona designada.'
      })
    });
    // Marcar que ya se pidió el encargado
    const auds = S.get('auditorias');
    const idx = auds.findIndex(x=>x.id===auditoriaId);
    if(idx>-1){ auds[idx].encargado_solicitado = true; S.set('auditorias', auds); }
    console.log('🤖 Agente: Email encargado enviado a '+cliente.email);
  } catch(e){
    console.error('Agente: error pidiendo encargado', e);
  }
}

// ─── AGENTE: Coordinar exámenes D+7 del diagnóstico ────────────────
// ─── AGENTE: Email de avance durante Fase 3 ────────────────────────
async function agenteEnviarAvanceProceso(auditoriaId){
  const aud = (S.get('auditorias')||[]).find(x=>x.id===auditoriaId);
  if(!aud) return;
  const cliente = (S.get('clientes')||[]).find(c=>String(c.id)===String(aud.clienteId));
  if(!cliente) return;

  const emailCfg = (S.get('email_config')||[])[0]||{};
  if(!emailCfg.smtp_user) return;

  const destinatario = cliente.encargado_email || cliente.email;
  const nombreDest   = cliente.encargado_nombre || cliente.contacto || cliente.nombre;
  if(!destinatario){
    await agenteAlerta('Avance de proceso sin destinatario','No hay email del encargado ni del dueño para la auditoría <strong>'+auditoriaId+'</strong> ('+aud.clienteNombre+'). El email de avance no fue enviado.');
    return;
  }

  const fmtFecha = f => { if(!f) return '—'; const [y,m,d]=f.split('-'); return d+'/'+m+'/'+y; };
  const hoy = todayStr();
  const fromName  = AGENTE.EMAIL_AGENTE_NOMBRE || 'MetoGroup';
  const fromEmail = AGENTE.EMAIL_AGENTE || emailCfg.smtp_user;

  // Calcular pasos completados
  const portal = (S.get('portal_clientes')||[]).find(p=>String(p.clienteId)===String(aud.clienteId));
  const examResultados = JSON.parse(localStorage.getItem('METO_exam_resultados')||'[]');
  const examsAud = examResultados.filter(r=>r.auditoria_id===auditoriaId||r.codigoId?.toString().includes(auditoriaId));

  const pasos = [
    {label:'Diagnóstico BPC', ok: portal?.diagnosticoCompleto||aud.diagnostico_ok},
    {label:'Exámenes del equipo', ok: aud.codigos_enviados && examsAud.length>0},
    {label:'Documentación preparada', ok: aud.fDoc && aud.fDoc <= hoy},
    {label:'Auditoría documental', ok: aud.fDoc && aud.fDoc < hoy},
    {label:'Auditoría in situ', ok: aud.fInsitu && aud.fInsitu < hoy},
    {label:'Auditoría comunicaciones', ok: aud.fExterna && aud.fExterna < hoy},
  ];
  const completados = pasos.filter(p=>p.ok).length;
  const pct = Math.round(completados / pasos.length * 100);

  const html = emailTemplate({
    nombreAgente: fromName,
    emailAgente: fromEmail,
    saludo: contacto+', buen día.',
    ctaUrl: null, ctaLabel: null,
    bloques: [
      { tipo:'texto', contenido:'Le escribo porque en <strong>'+cliente.nombre+'</strong> estamos próximos a iniciar la etapa de exámenes del proceso de Auditoría BPC:2026.' },
      { tipo:'texto', contenido:'Para coordinar bien los próximos pasos, necesitamos que nos indique quién va a ser el <strong>encargado/a de proceso</strong> dentro de la empresa — la persona de contacto para organizar los cuestionarios del equipo comercial.' },
      { tipo:'destacado', titulo:'¿Qué necesitamos?', contenido:'Nombre completo, email y cargo de la persona designada. Con esos datos, le enviamos directamente las instrucciones al equipo.<br><br>Puede responder este email con esa información.' },
      { tipo:'texto', contenido:'Quedo a disposición para cualquier consulta.' }
    ]
  });

    // Encolar — NO envía hasta que admin apruebe
  await agenteEncolarAccion('Solicitar encargado de proceso — '+cliente.nombre, {
    destinatario: cliente.email,
    clienteNombre: cliente.nombre,
    auditoriaId,
    tipo: 'email',
    detalle: 'Solicitar que '+cliente.nombre+' designe un encargado/a para coordinar los exámenes del equipo.',
    html_preview: 'Para: '+cliente.email+' · Asunto: Designación de encargado/a — Auditoría BPC:2026',
    _payload: {
      from_name: fromName,
      to: cliente.email,
      subject: 'Designación de encargado/a de proceso — Auditoría BPC:2026 | '+cliente.nombre,
      html: html,
      text: texto
    }
  });}

async function agenteCoordinarExamenes(auditoriaId){
  const aud = (S.get('auditorias')||[]).find(x=>x.id===auditoriaId);
  if(!aud) return;
  const cliente = (S.get('clientes')||[]).find(c=>String(c.id)===String(aud.clienteId));
  if(!cliente) return;

  const emailCfg = (S.get('email_config')||[])[0]||{};
  if(!emailCfg.smtp_user) return;

  const encargadoEmail = cliente.encargado_email;
  const encargadoNombre = cliente.encargado_nombre || 'Encargado/a de proceso';
  if(!encargadoEmail){
    await agenteAlerta('Sin encargado de proceso','No se pudo coordinar los exámenes para la auditoría <strong>'+auditoriaId+'</strong> ('+aud.clienteNombre+') — no hay email del encargado registrado. El dueño debe designar un encargado primero.', emailCfg);
    return;
  }

  // Calcular fecha estimada de exámenes (D+7 del diagnóstico)
  const portal = (S.get('portal_clientes')||[]).find(p=>String(p.clienteId)===String(aud.clienteId));
  const fechaDiag = portal?.fechaDiagnostico || aud.fInicio || todayStr();
  const fechaExamDate = new Date(fechaDiag+'T12:00:00');
  fechaExamDate.setDate(fechaExamDate.getDate()+7);
  const fechaExam = fechaExamDate.toISOString().split('T')[0];
  const fechaExamFmt = fechaExam.split('-').reverse().join('/');

  const fromName = AGENTE.EMAIL_AGENTE_NOMBRE || 'MetoGroup';
  const fromEmail = AGENTE.EMAIL_AGENTE || emailCfg.smtp_user;

  const html = emailTemplate({
    nombreAgente: agenteNombre,
    emailAgente: AGENTE.EMAIL_AGENTE || emailCfg.smtp_user,
    saludo: (encargadoNombre||'Estimado/a')+', buen día.',
    ctaUrl: null, ctaLabel: null,
    bloques: [
      { tipo:'texto', contenido:'Le escribo en nombre de MetoGroup. Somos el equipo que está realizando la <strong>Auditoría BPC:2026</strong> en <strong>'+cliente.nombre+'</strong>.' },
      { tipo:'texto', contenido:'El próximo paso es la aplicación de los cuestionarios al equipo comercial. Necesitamos que nos comparta los datos de las personas que van a participar — nombre completo, email y rol (vendedor/a, gerente comercial, etc.).' },
      { tipo:'destacado', titulo:'Fecha estimada', contenido:'Tenemos previsto enviarles los cuestionarios el <strong>'+fechaExamFmt+'</strong>. Cada persona lo completa individualmente, a su ritmo, desde cualquier dispositivo.<br><br>Responda este email con el listado del equipo y coordinamos los detalles.' },
      { tipo:'texto', contenido:'Ante cualquier consulta, quedo a disposición.' }
    ]
  });

    // Encolar — NO envía hasta que admin apruebe
  await agenteEncolarAccion('Coordinar exámenes con encargado — '+cliente.nombre, {
    destinatario: encargadoEmail,
    clienteNombre: cliente.nombre,
    auditoriaId,
    tipo: 'email',
    detalle: 'Solicitar a '+encargadoEmail+' los datos del equipo para coordinar los exámenes BPC:2026. Fecha estimada: '+fechaExamFmt+'.',
    html_preview: 'Para: '+encargadoEmail+' · Asunto: Coordinación de exámenes BPC:2026 | '+cliente.nombre,
    _payload: {
      from_name: agenteNombre,
      to: encargadoEmail,
      subject: 'Coordinación de exámenes — Auditoría BPC:2026 | '+cliente.nombre,
      html: html,
      text: texto
    }
  });}


// ─── AGENTE: Generar y enviar códigos de examen al equipo ─────────
async function agenteEnviarCodigosExamen(auditoriaId, equipo){
  // equipo = [{nombre, email, rol}] donde rol = 'vendedor' | 'gerente' | 'dueno'
  const aud = (S.get('auditorias')||[]).find(x=>x.id===auditoriaId);
  if(!aud) return;
  const cliente = (S.get('clientes')||[]).find(c=>String(c.id)===String(aud.clienteId));
  if(!cliente) return;

  const emailCfg = (S.get('email_config')||[])[0]||{};
  if(!emailCfg.smtp_user) return;

  const fromName  = AGENTE.EMAIL_AGENTE_NOMBRE || 'MetoGroup';
  const fromEmail = AGENTE.EMAIL_AGENTE || emailCfg.smtp_user;
  const baseUrl   = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const genCodigo = () => { let c=''; for(let i=0;i<6;i++) c+=chars[Math.floor(Math.random()*chars.length)]; return c; };

  const codigosGuardados = JSON.parse(localStorage.getItem('bpc_exam_codigos')||'[]');
  const codigosNuevos = [];
  const enviados = [];

  for(const persona of equipo){
    if(!persona.email || !persona.nombre) continue;

    const codigo = genCodigo();
    const rolTipo = persona.rol === 'gerente' ? 'diagnostico_gerente'
                  : persona.rol === 'dueno'   ? 'diagnostico_dueno'
                  : 'auditoria';
    // URL siempre apunta al sistema en Netlify
    const _baseUrl = 'https://taupe-raindrop-c74337.netlify.app/';
    const examUrl = _baseUrl + '?bpc_token=' + codigo + '&tipo=' + rolTipo;

    // Guardar código en Supabase PRIMERO — si falla, no mandar el mail
    const codigoItem = {
      // sin id — Supabase lo genera automático (BIGSERIAL)
      codigo, nombre: persona.nombre, empresa: cliente.nombre,
      email: persona.email,
      activo: true, usado: false,
      tipo: rolTipo,
      auditoriaId: Number(auditoriaId)||null,
      fechaCreacion: new Date().toLocaleDateString('es-AR')
    };
    let _guardadoOk = false;
    try{
      const _sbRes = await fetch(SUPABASE_URL+'/rest/v1/examen_codigos', {
        method:'POST',
        headers:{..._sbH, 'Prefer':'return=minimal'},
        body: JSON.stringify(codigoItem)
      });
      _guardadoOk = _sbRes.ok || _sbRes.status === 201;
      if(!_guardadoOk){
        const err = await _sbRes.text().catch(()=>'');
        console.error('Error guardando código:', _sbRes.status, err);
      }
    }catch(e){ console.error('Error guardando código en Supabase:', e); }
    if(!_guardadoOk){
      errors.push(persona.nombre + ' (error Supabase — mail no enviado)');
      continue;
    }
    codigosNuevos.push(codigoItem);

    const rolLabel = persona.rol === 'gerente' ? 'Diagnóstico Gerencial'
                   : persona.rol === 'dueno'   ? 'Diagnóstico Dueño/Director'
                   : 'Examen de Competencias BPC:2026';

    const duracion = persona.rol === 'vendedor' ? '20–25 minutos' : '15–20 minutos';

    const html = emailTemplate({
      nombreAgente: fromName,
      emailAgente: fromEmail,
      saludo: persona.nombre.split(' ')[0]+', buen día.',
      ctaUrl: examenUrl+'?code='+codigo,
      ctaLabel: 'Completar mi cuestionario',
      bloques: [
        { tipo:'texto', contenido:'Somos el equipo de MetoGroup y estamos realizando la <strong>Auditoría de Buenas Prácticas Comerciales BPC:2026</strong> en <strong>'+cliente.nombre+'</strong>.' },
        { tipo:'texto', contenido:'Te escribimos porque sos parte del equipo comercial que va a participar en esta etapa. El cuestionario es individual, confidencial y te lleva entre 20 y 30 minutos completarlo.' },
        { tipo:'destacado', titulo:'Tu código personal', contenido:'Tu código de acceso es: <strong style="font-family:monospace;font-size:18px;letter-spacing:3px">'+codigo+'</strong><br><br>Hacé click en el botón de abajo o ingresá directamente al link e ingresá tu código cuando te lo pidan.' },
        { tipo:'texto', contenido:'No hay respuestas correctas ni incorrectas. Respondé con honestidad — eso es lo que hace útil este proceso.' },
        { tipo:'texto', contenido:'<em style="color:#888">Ante cualquier duda, respondé este email y te ayudamos.</em>' }
      ]
    });

        // Encolar cada mail individual — NO envía hasta aprobación
    await agenteEncolarAccion('Enviar cuestionario a '+persona.nombre+' — '+cliente.nombre, {
      destinatario: persona.email,
      clienteNombre: cliente.nombre,
      auditoriaId: Number(auditoriaId),
      tipo: 'email',
      detalle: 'Cuestionario BPC:2026 · Rol: '+(persona.rol||'—')+' · Código: '+codigo,
      html_preview: 'Para: '+persona.email+' · '+persona.nombre+' · Código: '+codigo,
      _payload: {
        from_name: fromName,
        to: persona.email,
        subject: '🎯 Tu cuestionario BPC:2026 — Código: '+codigo+' | '+cliente.nombre,
        html: html,
        text: persona.nombre+', tu código es: '+codigo+'. Ingresá en: '+examenUrl
      }
    });
    enviados.push(persona.nombre);
  }

  // Guardar todos los códigos nuevos
  localStorage.setItem('bpc_exam_codigos', JSON.stringify([...codigosGuardados, ...codigosNuevos]));

  // Códigos ya guardados en Supabase dentro del loop principal — no reinsertar

  // Marcar en la auditoría
  if(enviados.length > 0){
    const auds = S.get('auditorias');
    const idx = auds.findIndex(x=>x.id===auditoriaId);
    if(idx>-1){
      auds[idx].codigos_enviados = true;
      auds[idx].codigos_equipo = equipo.map(p=>p.nombre).join(', ');
      auds[idx].codigos_fecha = todayStr();
      S.set('auditorias', auds);
    }
    console.log('🤖 Agente: Códigos enviados a: '+enviados.join(', '));
    toast('✅ Agente: Códigos BPC enviados a '+enviados.length+' personas');
  }
}

// ─── AGENTE: Aprobar equipo y enviar mails de presentación ──────────────────
async function agenteAprobarEquipoYEnviarPresentacion(auditoriaId){
  const aud = (S.get('auditorias')||[]).find(x=>x.id===Number(auditoriaId));
  if(!aud){ toast('❌ Auditoría no encontrada'); return; }
  const cliente = (S.get('clientes')||[]).find(c=>String(c.id)===String(aud.clienteId));
  if(!cliente){ toast('❌ Cliente no encontrado'); return; }

  // Obtener equipo cargado por administración
  const equipo = (S.get('admin_empresa_equipo')||[]).filter(e=>String(e.clienteId)===String(aud.clienteId));
  if(!equipo.length){ toast('⚠️ No hay equipo cargado para este cliente'); return; }

  const emailCfg = getSmtpFor(AGENTE.EMAIL_AGENTE);
  if(!emailCfg.smtp_user){ toast('❌ SMTP no configurado'); return; }

  const fromName  = AGENTE.EMAIL_AGENTE_NOMBRE || 'Hernán Quiroz | MetoGroup';
  const fromEmail = AGENTE.EMAIL_AGENTE || emailCfg.smtp_user;

  // Buscar Calendly del auditor asignado
  const auditorUsuario = (S.get('usuarios')||[]).find(u=>
    u.nombre === aud.auditor || (u.nombre||'').toLowerCase().includes((aud.auditor||'').toLowerCase().split(' ')[0])
  );
  const calendlyLink = auditorUsuario?.calendly || auditorUsuario?.calendly2 || null;

  let enviados = 0;
  const errors = [];

  for(const persona of equipo){
    if(!persona.email || !persona.nombre) continue;

    const rolLabel = (persona.puesto||'').toLowerCase().includes('gerente') ? 'gerente'
                   : (persona.puesto||'').toLowerCase().includes('dueño') || (persona.puesto||'').toLowerCase().includes('dueno') || (persona.puesto||'').toLowerCase().includes('director') ? 'dueño'
                   : 'vendedor';

    const html = emailTemplate({
      nombreAgente: fromName,
      emailAgente: fromEmail,
      saludo: persona.nombre.split(' ')[0]+', buen día.',
      ctaUrl: calendlyLink||null,
      ctaLabel: calendlyLink?'Agendar reunión de presentación':null,
      bloques: [
        { tipo:'texto', contenido:'Me comunico desde MetoGroup para informarle que damos inicio al proceso de <strong>Auditoría BPC:2026</strong> en <strong>'+cliente.nombre+'</strong>.' },
        { tipo:'texto', contenido:'En los próximos días le haremos llegar un cuestionario individual que forma parte de la etapa de diagnóstico. El mismo es breve, confidencial y se completa desde cualquier dispositivo.' },
        { tipo:'destacado', titulo:'¿Qué es BPC:2026?', contenido:'Es un estándar de evaluación de madurez comercial que analiza procesos, equipo, comunicación y liderazgo. El objetivo no es calificar a las personas sino entender cómo funciona el sistema comercial como conjunto.<br><br>Los resultados generan un informe con puntaje BPC Score y un plan de mejora concreto.' },
        { tipo:'texto', contenido:'Ante cualquier consulta, responda este email. Estamos a disposición.' }
      ]
    });

        // Encolar presentación individual — NO envía hasta aprobación
    await agenteEncolarAccion('Enviar presentación del proceso a '+persona.nombre+' — '+cliente.nombre, {
      destinatario: persona.email,
      clienteNombre: cliente.nombre,
      auditoriaId: Number(auditoriaId),
      tipo: 'email',
      detalle: 'Presentación del proceso BPC:2026 · Rol: '+(persona.rol||'—')+' · '+persona.email,
      html_preview: 'Para: '+persona.email+' · '+persona.nombre,
      _payload: {
        from_name: fromName,
        to: persona.email,
        subject: asunto,
        html: html,
        text: persona.nombre+', te presentamos el proceso de Auditoría BPC:2026 que estamos realizando en '+cliente.nombre+'.'
      }
    });
    enviados++;
    await new Promise(r=>setTimeout(r,1200));
  }

  // Marcar auditoría como equipo aprobado
  const auds = S.get('auditorias');
  const idx = auds.findIndex(x=>x.id===Number(auditoriaId));
  if(idx>-1){
    auds[idx].equipo_aprobado = true;
    auds[idx].equipo_aprobado_fecha = todayStr();
    S.set('auditorias', auds);
  }

  const msg = '✅ '+enviados+' mails de presentación enviados para '+cliente.nombre+(errors.length?' · ❌ Errores: '+errors.join(', '):'');
  toast(msg);
  agenteAlerta('✅ Equipo aprobado — '+cliente.nombre, msg+' · Auditoría: '+auditoriaId);

  // ── Mail de cuestionario 24hs después ──
  if(enviados > 0){
    const _equipoParaCuestionario = equipo.filter(e=>e.email&&e.nombre).map(e=>({
      nombre: e.nombre+' '+(e.apellido||''),
      email: e.email,
      rol: (e.puesto||'').toLowerCase().includes('gerente') ? 'gerente'
         : (e.puesto||'').toLowerCase().includes('dueño')||(e.puesto||'').toLowerCase().includes('dueno')||(e.puesto||'').toLowerCase().includes('director') ? 'dueno'
         : 'vendedor'
    }));
    setTimeout(async ()=>{
      toast('🤖 Enviando cuestionarios al equipo de '+cliente.nombre+'...');
      await agenteEnviarCodigosExamen(Number(auditoriaId), _equipoParaCuestionario);
    }, 24 * 60 * 60 * 1000); // 24 horas
    console.log('⏰ Cuestionarios programados para 24hs — '+_equipoParaCuestionario.length+' personas');
  }
}

function portalGenerarAcceso(clienteId){
  const clientes=S.get('clientes');
  const cliente=clientes.find(c=>c.id===clienteId);
  if(!cliente){toast('❌ Cliente no encontrado');return;}
  const portal=S.get('portal_clientes')||[];
  let acceso=portal.find(p=>p.clienteId===clienteId);
  if(!acceso){
    acceso={id:S.nextId('portal_clientes'),clienteId,magicKey:generarMagicKey(),activo:true,fechaCreacion:todayStr(),diagnosticoCompleto:false,score:null};
    portal.push(acceso);
  }else{
    acceso.magicKey=generarMagicKey();
    acceso.activo=true;
  }
  S.set('portal_clientes',portal);
  const url=window.location.origin+window.location.pathname+'?mk='+acceso.magicKey;
  prompt('🔗 Link de acceso para '+cliente.nombre+':\n\nCopiá y envialo al cliente:',url);
  toast('✅ Magic link generado para '+cliente.nombre);
}

function checkMagicLogin(){
  const params=new URLSearchParams(window.location.search);

  // ── Magic link admin empresa (?mka=) ──
  const mka=params.get('mka');
  if(mka){
    sessionStorage.removeItem('mg_session');
    currentUser=null;
    const accesos=S.get('admin_empresa_acceso')||[];
    const acc=accesos.find(a=>a.magicKey===mka&&a.activo);
    if(!acc){ toast('❌ Link inválido o expirado'); return false; }
    const cli=(S.get('clientes')||[]).find(c=>String(c.id)===String(acc.clienteId));
    if(!cli) return false;
    currentUser={id:'adm_'+acc.clienteId,nombre:cli.encargado_nombre||cli.contacto||cli.nombre,rol:'admin_empresa',roles:['admin_empresa'],clienteId:acc.clienteId,adminAccesoId:acc.id};
    sessionStorage.setItem('mg_session',JSON.stringify(currentUser));
    window.history.replaceState({},'',window.location.pathname);
    return true;
  }

  const mk=params.get('mk');
  if(!mk)return false;
  // Limpiar sesión existente — el magic link siempre reemplaza quien está logueado
  sessionStorage.removeItem('mg_session');
  currentUser=null;
  const portal=S.get('portal_clientes')||[];
  const acceso=portal.find(p=>p.magicKey===mk&&p.activo);
  if(!acceso){
    toast('❌ Link inválido o expirado');
    return false;
  }
  const clientes=S.get('clientes');
  const cliente=clientes.find(c=>c.id===acceso.clienteId);
  if(!cliente)return false;
  // Login como cliente
  currentUser={id:'cli_'+acceso.clienteId,nombre:cliente.nombre,rol:'cliente',roles:['cliente'],clienteId:acceso.clienteId,portalId:acceso.id};
  sessionStorage.setItem('mg_session',JSON.stringify(currentUser));
  // Limpiar URL
  window.history.replaceState({},'',window.location.pathname);
  return true;
}

// --- Portal Dashboard del Cliente ---
function renderPortalDashboard(){
  const el=document.getElementById('page-content');
  const acceso=getPortalAcceso();
  const cliente=S.get('clientes').find(c=>c.id===currentUser.clienteId);
  const aud=S.get('auditorias').find(a=>a.clienteId===currentUser.clienteId);
  const diag=getPortalDiagnostico();
  
  // AUTO-REDIRECT según estado del proceso — SIN showPage para evitar loop
  if(!diag || !diag.completo){
    // Actualizar nav sin re-triggerear showPage
    document.querySelectorAll('#nav-main .nav-item').forEach(el=>el.classList.toggle('active',el.getAttribute('onclick')?.includes("'portal_diagnostico'")));
    document.getElementById('pageTitle').textContent=getPageTitle('portal_diagnostico');
    renderPortalDiagnostico();
    return;
  }
  // Diagnóstico completo: verificar si el tablero fue aprobado
  const _approvals=S.get('bpc_tablero_approvals')||[];
  const _myApproval=_approvals.find(a=>a.clienteId===currentUser.clienteId);
  if(_myApproval && _myApproval.aprobado){
    showPage('portal_auditoria');
    return;
  }
  // Tablero pendiente de aprobación — mostrar pantalla de espera
  if(diag && diag.completo && (!_myApproval || !_myApproval.aprobado)){
    const hoursAgo=_myApproval?Math.round((Date.now()-new Date(_myApproval.fechaDiag).getTime())/3600000):0;
    const _estDate=new Date(_myApproval?new Date(_myApproval.fechaDiag).getTime()+48*3600000:Date.now()+48*3600000);
    const _meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const _dias=['domingo','lunes','martes','mi\u00e9rcoles','jueves','viernes','s\u00e1bado'];
    const _estStr=_dias[_estDate.getDay()]+' '+_estDate.getDate()+' de '+_meses[_estDate.getMonth()];
    const _horaStr=_estDate.getHours()+':'+String(_estDate.getMinutes()).padStart(2,'0')+'h';
    el.innerHTML='<div style="max-width:550px;margin:60px auto;text-align:center">'+
      '<div style="font-size:48px;margin-bottom:16px;opacity:0.3">&#9672;</div>'+
      '<div style="font-family:Syne,sans-serif;font-size:24px;font-weight:800;margin-bottom:10px">Tu tablero se est\u00e1 preparando</div>'+
      '<div style="font-family:Syne,sans-serif;font-size:42px;font-weight:800;color:var(--accent3);margin-bottom:10px">'+diag.score+'/100</div>'+
      '<div style="font-size:13px;color:var(--muted);line-height:1.8;margin-bottom:24px">'+
      'Tu diagn\u00f3stico fue enviado exitosamente. Nuestro equipo t\u00e9cnico est\u00e1 preparando tu <strong style=\"color:var(--text)\">Tablero de Auditor\u00eda personalizado</strong> con base en tus respuestas.</div>'+
      '<div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:22px 28px;margin-bottom:16px;text-align:center">'+
      '<div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Fecha estimada de habilitaci\u00f3n</div>'+
      '<div style="font-family:Syne,sans-serif;font-size:22px;font-weight:800;color:var(--text);margin-bottom:4px">'+_estStr+'</div>'+
      '<div style="font-size:12px;color:var(--accent)">aproximadamente a las '+_horaStr+'</div>'+
      '</div>'+
      '<div style="display:inline-flex;align-items:center;gap:10px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 18px">'+
      '<div style="width:8px;height:8px;border-radius:50%;background:var(--warn);animation:mclPulse 2s infinite"></div>'+
      '<span style="font-size:12px;color:var(--warn)">En preparaci\u00f3n'+(hoursAgo>0?' \u00b7 hace '+hoursAgo+'h':'')+'</span></div>'+
      '<div style="margin-top:20px;font-size:11px;color:var(--muted)">Si ten\u00e9s alguna consulta, us\u00e1 el asistente MetoAssist &#9672;</div></div>';
    return;
  }
  const score=diag?calcBPCScore(diag):null;
  const nivel=score!==null?getBPCNivel(score):null;
  const docs=(S.get('portal_documentos')||[]).filter(d=>d.clienteId===currentUser.clienteId);
  const pac=(S.get('portal_plan_accion')||[]).filter(p=>p.clienteId===currentUser.clienteId);
  const hitos=(S.get('portal_hitos')||[]).filter(h=>h.clienteId===currentUser.clienteId);

  // Progress calculation
  let etapas=[
    {id:'diagnostico',nombre:'Diagnóstico',icon:'📋',completa:!!diag},
    {id:'documentacion',nombre:'Documentación',icon:'📁',completa:docs.filter(d=>d.estado==='Aprobado').length>=3},
    {id:'auditoria',nombre:'Auditoría',icon:'🔍',completa:aud&&['Auditoría In-Situ','Preparando Informe','Informe Entregado','Completada'].includes(aud.estado)},
    {id:'informe',nombre:'Informe',icon:'📊',completa:aud&&['Informe Entregado','Completada'].includes(aud.estado)},
    {id:'pac',nombre:'Plan de Acción',icon:'📝',completa:pac.filter(p=>p.estado==='CERRADO').length===pac.length&&pac.length>0},
    {id:'certificado',nombre:'Certificado',icon:'🏆',completa:aud&&aud.estado==='Completada'}
  ];
  const progreso=Math.round(etapas.filter(e=>e.completa).length/etapas.length*100);

  el.innerHTML=`
  <div style="max-width:900px;margin:0 auto">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,rgba(212,175,55,0.08),rgba(184,146,46,0.05));border:1px solid rgba(212,175,55,0.15);border-radius:20px;padding:28px 32px;margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#b8922e,#f5d060);display:flex;align-items:center;justify-content:center;font-size:24px;color:#fff;font-weight:800;flex-shrink:0">${(cliente?.nombre||'C').charAt(0)}</div>
        <div style="flex:1">
          <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800">${cliente?.nombre||'Cliente'}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">Auditoría BPC:2026 — Buenas Prácticas Comerciales y Éticas</div>
        </div>
        <div style="text-align:center">
          <div style="font-family:'Syne',sans-serif;font-size:36px;font-weight:800;color:${nivel?nivel.color:'var(--muted)'}">${score!==null?score:'—'}</div>
          <div style="font-size:10px;color:var(--muted)">SCORE / 100</div>
        </div>
      </div>
    </div>

    <!-- Progress Bar -->
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px 24px;margin-bottom:24px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700">Tu Proceso</div>
        <div style="font-size:12px;color:var(--accent);font-weight:700">${progreso}% completado</div>
      </div>
      <div style="display:flex;gap:4px;margin-bottom:16px">
        ${etapas.map(e=>`<div style="flex:1;height:8px;border-radius:4px;background:${e.completa?'var(--accent3)':'var(--surface2)'};transition:all 0.3s"></div>`).join('')}
      </div>
      <div style="display:flex;justify-content:space-between">
        ${etapas.map(e=>`<div style="text-align:center;flex:1">
          <div style="font-size:18px;margin-bottom:2px;${e.completa?'':'opacity:0.4'}">${e.icon}</div>
          <div style="font-size:9px;color:${e.completa?'var(--accent3)':'var(--muted)'};font-weight:${e.completa?700:400}">${e.nombre}</div>
        </div>`).join('')}
      </div>
    </div>

    ${score!==null?`
    <!-- Score card -->
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px 24px;margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
        <div style="font-size:28px">${nivel.icon}</div>
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:${nivel.color}">${nivel.nombre}</div>
          <div style="font-size:11px;color:var(--muted)">${nivel.desc}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
        ${BPC_DIMENSIONES.map(d=>{
          const ds=calcDimScore(diag,d);
          const pct=d.maxPts>0?Math.round(ds/d.maxPts*100):0;
          return`<div style="background:var(--surface2);border-radius:10px;padding:12px;text-align:center">
            <div style="font-size:16px;margin-bottom:4px">${d.icon}</div>
            <div style="font-size:10px;color:var(--muted);margin-bottom:4px">${d.nombre}</div>
            <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:${d.color}">${ds}/${d.maxPts}</div>
          </div>`;
        }).join('')}
      </div>
      <div style="text-align:center;margin-top:14px">
        <button class="btn btn-primary" onclick="showPage('portal_resultados')">📊 Ver Resultados Completos</button>
      </div>
    </div>
    `:`
    <!-- CTA Diagnóstico -->
    <div style="background:linear-gradient(135deg,rgba(245,158,11,0.08),rgba(245,158,11,0.03));border:1px solid rgba(245,158,11,0.2);border-radius:16px;padding:28px;text-align:center;margin-bottom:24px">
      <div style="font-size:40px;margin-bottom:10px">📋</div>
      <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700;margin-bottom:6px">Comenzá tu Diagnóstico</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:16px">Completá el cuestionario de las 6 dimensiones para obtener tu Score de Madurez Comercial BPC:2026</div>
      <button class="btn btn-primary" onclick="showPage('portal_diagnostico')" style="font-size:14px;padding:12px 28px">🚀 Iniciar Diagnóstico</button>
    </div>
    `}

    <!-- Quick actions -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px">
      ${[
        ['📋','Diagnóstico','portal_diagnostico',diag?'Completado':'Pendiente',diag?'var(--accent3)':'var(--warn)'],
        ['📁','Documentos','portal_documentos',docs.length+' archivos','var(--accent)'],
        ['💬','Mi Consultor','portal_chat','Chat directo','var(--accent2)'],
        ['📝','Plan de Acción','portal_pac',pac.length?pac.filter(p=>p.estado==='CERRADO').length+'/'+pac.length+' cerradas':'Sin plan aún','var(--accent)'],
        ['📅','Calendario','portal_calendario',hitos.length+' hitos','#c8a84a'],
        ['🏆','Certificado','portal_certificado',aud?.estado==='Completada'?'Disponible':'En proceso','var(--accent3)']
      ].map(([ic,lb,pg,st,cl])=>`
        <div onclick="showPage('${pg}')" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px;cursor:pointer;transition:all 0.15s" onmouseover="this.style.borderColor='${cl}'" onmouseout="this.style.borderColor='var(--border)'">
          <div style="font-size:24px;margin-bottom:8px">${ic}</div>
          <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700">${lb}</div>
          <div style="font-size:10px;color:${cl};margin-top:4px">${st}</div>
        </div>
      `).join('')}
    </div>
  </div>`;
}

function getPortalAcceso(){
  if(!currentUser?.clienteId) return null;
  return (S.get('portal_clientes')||[]).find(p=>p.clienteId===currentUser.clienteId);
}

// ═══════════════════════════════════════════════════════════
// PORTAL CLIENTE — usa el calibre __bpc_portal__ existente
// ═══════════════════════════════════════════════════════════
let _portalDimActual = 0;
let _portalPregActual = 0;  // pregunta actual dentro de la dimensión
let _portalFase = 'intro';  // 'intro' | 'preguntas' | 'cierre'

function _portalToggleTema(){
  const portal = document.getElementById('__bpc_portal_main__');
  const btn    = document.getElementById('portal-btn-tema');
  if(!portal) return;

  const isLight = portal.dataset.tema === 'light';

  if(isLight){
    // → OSCURO: el selector [data-tema="dark"] activa las variables oscuras
    portal.dataset.tema = 'dark';
    portal.style.background = '#0a0b0c';
    if(btn){ btn.textContent = '🌙'; }
  } else {
    // → CLARO: el selector [data-tema="light"] activa las variables claras
    portal.dataset.tema = 'light';
    portal.style.background = '#2a2a2a';
    if(btn){ btn.textContent = '🌤'; }
  }

  // Re-renderizar la pantalla actual para aplicar el tema a los estilos inline
  const scene = portal.querySelector('#s-cliente-diag');
  if(scene && scene.classList.contains('on')){
    const diagNow = getPortalDiagnostico();
    if(diagNow && diagNow.completo) _portalRenderAgradecimiento(scene, diagNow);
    else if(_portalFase === 'intro') _portalRenderIntro(scene);
    else if(_portalFase === 'cierre') _portalRenderCierre(scene);
    else if(_portalFase === 'preguntas') _portalRenderPregunta(scene);
  }
  // Re-renderizar cuestionario BPC si está activo (tiene estilos inline dependientes del tema)
  const pageContent = document.getElementById('page-content');
  if(pageContent && document.getElementById('page-portal_dashboard')?.classList.contains('active')){
    const bpcDim = document.querySelector('.bpc-dim-header');
    if(bpcDim) renderBPCCuestionario(false);
  }
}





function _portalLogout(){
  if(!confirm('¿Cerrar sesión?')) return;
  // Marcar que el portal está siendo cerrado para que callbacks async se detengan
  window._portalCerrado = true;
  currentUser = null;
  sessionStorage.removeItem('mg_session');
  // Mostrar pantalla de sesión cerrada dentro del portal
  const portal = document.getElementById('__bpc_portal_main__');
  const isLight = portal?.dataset.tema === 'light';
  const bg   = isLight ? '#2a2a2a' : '#0a0b0c';
  const txt  = isLight ? 'rgba(20,12,0,0.7)' : 'rgba(255,255,255,0.5)';
  if(portal){
    portal.innerHTML = `<div style="height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:${bg}">
      <div style="font-size:32px;opacity:0.4">⏻</div>
      <div style="font-family:'Space Mono',monospace;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${txt}">Sesión cerrada</div>
      <div style="font-size:12px;color:${txt};opacity:0.6">Podés cerrar esta ventana.</div>
    </div>`;
  }
}

// ════════════════════════════════════════════════════════════
// PORTAL ADMINISTRACIÓN EMPRESA — Carga de equipo comercial
// ════════════════════════════════════════════════════════════

function _lanzarPortalAdminEmpresa(){
  // Limpiar body y mostrar portal verde
  document.body.innerHTML = '';
  document.body.style.cssText ="margin:0;padding:0;background:#f0faf4;min-height:100vh;font-family:'Cormorant Garamond',Georgia,serif";

  const app = document.createElement('div');
  app.id = '__admin_empresa_portal__';
  app.style.cssText = 'min-height:100vh;background:#f0faf4';
  document.body.appendChild(app);

  renderPortalAdminEmpresa();
}

function renderPortalAdminEmpresa(){
  const app = document.getElementById('__admin_empresa_portal__');
  if(!app) return;

  const cli = (S.get('clientes')||[]).find(c=>String(c.id)===String(currentUser.clienteId));
  const acceso = (S.get('admin_empresa_acceso')||[]).find(a=>String(a.clienteId)===String(currentUser.clienteId));
  const equipo = (S.get('admin_empresa_equipo')||[]).filter(e=>String(e.clienteId)===String(currentUser.clienteId));
  const empresa = cli?.nombre || 'su empresa';

  if(acceso?.equipoCompleto){
    _renderAdminEmpresaGracias(app, empresa, equipo.length);
    return;
  }

  // Cargar miembros guardados
  const miembros = equipo.length > 0 ? equipo : [{id:'new_0',nombre:'',apellido:'',puesto:'',antiguedad:'',telefono:'',email:''}];

  app.innerHTML = `
  <div style="max-width:680px;margin:0 auto;padding:clamp(24px,4vh,56px) 20px">

    <!-- Header verde -->
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:40px;padding:18px 22px;background:#fff;border-radius:14px;border:1.5px solid #bbf7d0;box-shadow:0 2px 12px rgba(22,163,74,0.08)">
      <div style="width:44px;height:44px;border-radius:50%;background:#16a34a;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">✦</div>
      <div>
        <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:800;color:#15803d;letter-spacing:0.02em">MetoGroup — Área Comercial</div>
        <div style="font-size:11px;color:#6b7280;margin-top:1px;letter-spacing:0.06em;text-transform:uppercase">Carga de equipo</div>
      </div>
    </div>

    <!-- Título -->
    <div style="margin-bottom:28px">
      <div style="font-family:'Syne',sans-serif;font-size:clamp(22px,3.5vw,30px);font-weight:800;color:#111;line-height:1.2;margin-bottom:10px">
        Equipo comercial de<br><span style="color:#16a34a">${empresa}</span>
      </div>
      <div style="width:40px;height:3px;background:#16a34a;border-radius:2px;margin-bottom:14px"></div>
      <p style="font-size:14px;color:#374151;line-height:1.75;margin:0">
        Cargue los datos de cada persona que integra el área comercial de la empresa. 
        Incluya vendedores, supervisores, gerentes y cualquier rol vinculado a ventas o atención al cliente.
      </p>
    </div>

    <!-- Formulario dinámico -->
    <div id="adm-equipo-lista">
      ${miembros.map((m,i) => _adminEmpresaRowHTML(m, i)).join('')}
    </div>

    <!-- Agregar persona -->
    <button onclick="_adminEmpresaAgregarFila()" style="width:100%;padding:12px;background:transparent;border:2px dashed #86efac;border-radius:10px;color:#16a34a;font-family:'Syne',sans-serif;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:32px;transition:all 0.2s"
      onmouseover="this.style.background='#f0fdf4'" onmouseout="this.style.background='transparent'">
      + Agregar persona
    </button>

    <!-- Finalizar -->
    <button onclick="_adminEmpresaFinalizar()" style="width:100%;padding:18px;background:#16a34a;color:#fff;border:none;border-radius:12px;font-family:'Syne',sans-serif;font-size:16px;font-weight:700;cursor:pointer;letter-spacing:0.04em;box-shadow:0 4px 20px rgba(22,163,74,0.3);transition:all 0.2s"
      onmouseover="this.style.background='#15803d'" onmouseout="this.style.background='#16a34a'">
      Finalizar y enviar →
    </button>
    <div style="text-align:center;margin-top:10px;font-size:11px;color:#9ca3af">Los datos se guardan automáticamente mientras carga el formulario.</div>
  </div>`;
}

function _adminEmpresaRowHTML(m, i){
  const id = m.id || ('new_'+i);
  return `<div id="adm-row-${id}" style="background:#fff;border:1.5px solid #dcfce7;border-radius:12px;padding:20px 22px;margin-bottom:14px;position:relative">
    <div style="font-family:'Syne',sans-serif;font-size:11px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:14px">Persona ${i+1}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <div>
        <label style="font-size:10px;color:#6b7280;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.08em">Nombre *</label>
        <input id="adm-nombre-${id}" value="${m.nombre||''}" placeholder="Juan" oninput="_adminEmpresaGuardar('${id}')"
          style="width:100%;padding:9px 12px;border:1.5px solid #d1fae5;border-radius:8px;font-size:14px;color:#111;background:#fafffe;outline:none;box-sizing:border-box;transition:border-color 0.2s"
          onfocus="this.style.borderColor='#16a34a'" onblur="this.style.borderColor='#d1fae5'">
      </div>
      <div>
        <label style="font-size:10px;color:#6b7280;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.08em">Apellido *</label>
        <input id="adm-apellido-${id}" value="${m.apellido||''}" placeholder="García" oninput="_adminEmpresaGuardar('${id}')"
          style="width:100%;padding:9px 12px;border:1.5px solid #d1fae5;border-radius:8px;font-size:14px;color:#111;background:#fafffe;outline:none;box-sizing:border-box;transition:border-color 0.2s"
          onfocus="this.style.borderColor='#16a34a'" onblur="this.style.borderColor='#d1fae5'">
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <div>
        <label style="font-size:10px;color:#6b7280;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.08em">Puesto *</label>
        <input id="adm-puesto-${id}" value="${m.puesto||''}" placeholder="Vendedor / Gerente comercial..." oninput="_adminEmpresaGuardar('${id}')"
          style="width:100%;padding:9px 12px;border:1.5px solid #d1fae5;border-radius:8px;font-size:14px;color:#111;background:#fafffe;outline:none;box-sizing:border-box;transition:border-color 0.2s"
          onfocus="this.style.borderColor='#16a34a'" onblur="this.style.borderColor='#d1fae5'">
      </div>
      <div>
        <label style="font-size:10px;color:#6b7280;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.08em">Antigüedad</label>
        <input id="adm-antiguedad-${id}" value="${m.antiguedad||''}" placeholder="2 años" oninput="_adminEmpresaGuardar('${id}')"
          style="width:100%;padding:9px 12px;border:1.5px solid #d1fae5;border-radius:8px;font-size:14px;color:#111;background:#fafffe;outline:none;box-sizing:border-box;transition:border-color 0.2s"
          onfocus="this.style.borderColor='#16a34a'" onblur="this.style.borderColor='#d1fae5'">
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div>
        <label style="font-size:10px;color:#6b7280;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.08em">Teléfono / WhatsApp</label>
        <input id="adm-telefono-${id}" value="${m.telefono||''}" placeholder="+54 9 11..." oninput="_adminEmpresaGuardar('${id}')"
          style="width:100%;padding:9px 12px;border:1.5px solid #d1fae5;border-radius:8px;font-size:14px;color:#111;background:#fafffe;outline:none;box-sizing:border-box;transition:border-color 0.2s"
          onfocus="this.style.borderColor='#16a34a'" onblur="this.style.borderColor='#d1fae5'">
      </div>
      <div>
        <label style="font-size:10px;color:#6b7280;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.08em">Email *</label>
        <input id="adm-email-${id}" value="${m.email||''}" placeholder="juan@empresa.com" oninput="_adminEmpresaGuardar('${id}')"
          style="width:100%;padding:9px 12px;border:1.5px solid #d1fae5;border-radius:8px;font-size:14px;color:#111;background:#fafffe;outline:none;box-sizing:border-box;transition:border-color 0.2s"
          onfocus="this.style.borderColor='#16a34a'" onblur="this.style.borderColor='#d1fae5'">
      </div>
    </div>
    <button onclick="_adminEmpresaEliminarFila('${id}')" style="position:absolute;top:12px;right:14px;background:transparent;border:none;color:#d1d5db;font-size:16px;cursor:pointer;line-height:1"
      onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#d1d5db'">✕</button>
  </div>`;
}

let _adminEmpresaFilas = [];

function _adminEmpresaGuardar(rowId){
  const nombre    = document.getElementById('adm-nombre-'+rowId)?.value.trim()||'';
  const apellido  = document.getElementById('adm-apellido-'+rowId)?.value.trim()||'';
  const puesto    = document.getElementById('adm-puesto-'+rowId)?.value.trim()||'';
  const antiguedad= document.getElementById('adm-antiguedad-'+rowId)?.value.trim()||'';
  const telefono  = document.getElementById('adm-telefono-'+rowId)?.value.trim()||'';
  const email     = document.getElementById('adm-email-'+rowId)?.value.trim()||'';

  const equipo = S.get('admin_empresa_equipo')||[];
  const idx = equipo.findIndex(e=>String(e.id)===String(rowId));
  const item = {id:rowId,clienteId:currentUser.clienteId,nombre,apellido,puesto,antiguedad,telefono,email,fechaCarga:todayStr()};
  if(idx>-1) equipo[idx]=item; else equipo.push(item);
  S.set('admin_empresa_equipo', equipo);
}

function _adminEmpresaAgregarFila(){
  const equipo = S.get('admin_empresa_equipo')||[];
  const newId = 'new_'+Date.now();
  const newItem = {id:newId,clienteId:currentUser.clienteId,nombre:'',apellido:'',puesto:'',antiguedad:'',telefono:'',email:'',fechaCarga:todayStr()};
  equipo.push(newItem);
  S.set('admin_empresa_equipo', equipo);
  const lista = document.getElementById('adm-equipo-lista');
  if(lista){
    const div = document.createElement('div');
    div.innerHTML = _adminEmpresaRowHTML(newItem, equipo.filter(e=>String(e.clienteId)===String(currentUser.clienteId)).length-1);
    lista.appendChild(div.firstElementChild);
  }
}

function _adminEmpresaEliminarFila(rowId){
  const equipo = (S.get('admin_empresa_equipo')||[]).filter(e=>String(e.id)!==String(rowId));
  S.set('admin_empresa_equipo', equipo);
  document.getElementById('adm-row-'+rowId)?.remove();
}

function _adminEmpresaFinalizar(){
  // Guardar todos los campos antes de validar
  const equipo = S.get('admin_empresa_equipo')||[];
  const delCliente = equipo.filter(e=>String(e.clienteId)===String(currentUser.clienteId));

  // Validar mínimo 1 persona con nombre, apellido y email
  const validos = delCliente.filter(e=>e.nombre && e.apellido && e.email);
  if(validos.length === 0){
    alert('Por favor completá al menos el nombre, apellido y email de una persona.');
    return;
  }

  // Marcar acceso como completado
  const accesos = S.get('admin_empresa_acceso')||[];
  const idx = accesos.findIndex(a=>String(a.clienteId)===String(currentUser.clienteId));
  if(idx>-1){ accesos[idx].equipoCompleto=true; S.set('admin_empresa_acceso', accesos); }

  // Alerta interna MetoGroup
  const cli = (S.get('clientes')||[]).find(c=>String(c.id)===String(currentUser.clienteId));
  agenteAlerta(
    '✅ Equipo comercial cargado — '+( cli?.nombre||'Cliente'),
    validos.length+' personas cargadas:\n'+validos.map(e=>e.nombre+' '+e.apellido+' ('+e.puesto+') — '+e.email).join('\n')
  );

  const app = document.getElementById('__admin_empresa_portal__');
  _renderAdminEmpresaGracias(app, cli?.nombre||'su empresa', validos.length);
  // Mostrar countdown 24hs después del agradecimiento
  setTimeout(()=>{ if(app) _renderCountdown24h(app); }, 4000);
}

function _renderAdminEmpresaGracias(container, empresa, total){
  container.innerHTML = `
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px">
    <div style="max-width:540px;width:100%;text-align:center">

      <!-- Check animado -->
      <div style="width:80px;height:80px;border-radius:50%;background:#dcfce7;display:flex;align-items:center;justify-content:center;margin:0 auto 28px;font-size:36px">✓</div>

      <!-- Header MetoGroup -->
      <div style="display:inline-flex;align-items:center;gap:10px;background:#fff;border:1.5px solid #bbf7d0;border-radius:10px;padding:10px 18px;margin-bottom:32px">
        <div style="width:28px;height:28px;border-radius:50%;background:#16a34a;display:flex;align-items:center;justify-content:center;font-size:13px;color:#fff">✦</div>
        <div style="font-family:'Syne',sans-serif;font-size:12px;font-weight:700;color:#15803d">MetoGroup — Área Comercial</div>
      </div>

      <div style="font-family:'Syne',sans-serif;font-size:clamp(26px,4vw,34px);font-weight:800;color:#111;line-height:1.2;margin-bottom:16px">
        Información recibida.<br><span style="color:#16a34a">Gracias.</span>
      </div>

      <div style="background:#fff;border:1.5px solid #dcfce7;border-radius:14px;padding:22px 28px;margin-bottom:28px;text-align:left">
        <div style="font-size:14px;color:#374151;line-height:1.8;margin-bottom:12px">
          Recibimos los datos de <strong>${total} persona${total!==1?'s':''}</strong> del equipo comercial de <strong>${empresa}</strong>.
        </div>
        <div style="font-size:14px;color:#374151;line-height:1.8">
          Nuestro equipo va a revisar la información y se va a poner en contacto con cada persona para coordinar los siguientes pasos del proceso de auditoría BPC:2026.
        </div>
      </div>

      <div style="font-size:13px;color:#6b7280;line-height:1.7">
        Si necesitás agregar o modificar algún dato, respondé el email que recibiste con la solicitud y lo actualizamos.
      </div>
    </div>
  </div>`;
}

function _renderCountdown24h(container){
  const ENCENDIDO=10, TOTAL=24*60*60;
  let elapsed=0, lastTs=null, dotPhase=0;
  container.innerHTML=`
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:0;margin:0;background:#000;overflow:hidden;position:relative">
    <canvas id="cnt-bg" style="position:absolute;inset:0;width:100%;height:100%"></canvas>
    <div style="position:relative;z-index:2;text-align:center;padding:48px 32px;max-width:540px;width:100%">
      <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(255,255,255,0.22);margin-bottom:52px">MetoGroup · BPC:2026</div>
      <div style="position:relative;width:200px;height:200px;margin:0 auto 44px">
        <canvas id="cnt-clock" width="200" height="200"></canvas>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <div id="cnt-hrs" style="font-family:'Cormorant Garamond',Georgia,serif;font-size:58px;font-weight:300;line-height:1;color:#fff;letter-spacing:-0.02em">24</div>
          <div id="cnt-ms" style="font-family:'Cormorant Garamond',Georgia,serif;font-size:15px;font-weight:300;color:rgba(255,255,255,0.3);margin-top:3px;letter-spacing:0.12em">00:00</div>
          <div style="font-size:8px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(255,255,255,0.15);margin-top:8px">horas</div>
        </div>
      </div>
      <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:clamp(19px,2.8vw,24px);font-weight:300;color:#fff;line-height:1.5;margin-bottom:12px">
        En 24 horas, su área comercial<br>comienza a cambiar.
      </div>
      <div style="font-size:12px;color:rgba(255,255,255,0.22);line-height:1.85;max-width:320px;margin:0 auto 48px">
        Nuestro equipo está trabajando con la información<br>que nos acaba de compartir.
      </div>
      <div style="display:flex;justify-content:center;gap:22px">
        <div style="text-align:center">
          <div style="width:26px;height:26px;border-radius:50%;border:1px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;margin:0 auto 7px;font-size:10px;color:rgba(255,255,255,0.45)">✓</div>
          <div style="font-size:8px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.18)">Diagnóstico</div>
        </div>
        <div style="text-align:center">
          <div style="width:26px;height:26px;border-radius:50%;border:1px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;margin:0 auto 7px;font-size:10px;color:rgba(255,255,255,0.45)">✓</div>
          <div style="font-size:8px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.18)">Equipo</div>
        </div>
        <div style="text-align:center">
          <div id="cnt-dot" style="width:26px;height:26px;border-radius:50%;border:1px solid rgba(212,175,55,0.5);display:flex;align-items:center;justify-content:center;margin:0 auto 7px;font-size:11px;color:rgba(212,175,55,0.7)">·</div>
          <div style="font-size:8px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(212,175,55,0.35)">Análisis</div>
        </div>
        <div style="text-align:center">
          <div style="width:26px;height:26px;border-radius:50%;border:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:center;margin:0 auto 7px;font-size:10px;color:rgba(255,255,255,0.1)">○</div>
          <div style="font-size:8px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.08)">Calibre</div>
        </div>
      </div>
    </div>
  </div>`;

  function _cntBg(intensity){
    const cv=document.getElementById('cnt-bg'); if(!cv)return;
    const W=cv.offsetWidth||640, H=cv.offsetHeight||520;
    cv.width=W; cv.height=H;
    const ctx=cv.getContext('2d'); ctx.clearRect(0,0,W,H);
    const cx=W/2, cy=H/2;
    [[0.9,[[0,intensity*0.10],[0.3,intensity*0.05],[0.7,intensity*0.02],[1,0]]],
     [0.52,[[0,intensity*0.72],[0.12,intensity*0.48],[0.3,intensity*0.20],[0.55,intensity*0.06],[1,0]]],
     [0.09,[[0,intensity*1.0],[0.4,intensity*0.75],[0.8,intensity*0.3],[1,0]]]
    ].forEach(([r,stops])=>{
      const g=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(W,H)*r);
      stops.forEach(([s,a])=>g.addColorStop(s,`rgba(255,255,255,${a})`));
      ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    });
  }

  function _cntClock(pct){
    const cv=document.getElementById('cnt-clock'); if(!cv)return;
    const ctx=cv.getContext('2d'), cx=100, cy=100, R=88;
    ctx.clearRect(0,0,200,200);
    ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.strokeStyle='rgba(255,255,255,0.07)';ctx.lineWidth=1;ctx.stroke();
    const s=-Math.PI/2, e=s+Math.PI*2*pct;
    if(pct>0){
      ctx.beginPath();ctx.arc(cx,cy,R,s,e);ctx.strokeStyle='rgba(212,175,55,0.85)';ctx.lineWidth=1.5;ctx.lineCap='round';ctx.stroke();
      ctx.beginPath();ctx.arc(cx+R*Math.cos(e),cy+R*Math.sin(e),2.5,0,Math.PI*2);ctx.fillStyle='rgba(255,240,160,1)';ctx.fill();
    }
    for(let i=0;i<48;i++){
      const a=s+(i/48)*Math.PI*2, mj=i%8===0;
      ctx.beginPath();ctx.moveTo(cx+(mj?R-8:R-4)*Math.cos(a),cy+(mj?R-8:R-4)*Math.sin(a));
      ctx.lineTo(cx+(R-0.5)*Math.cos(a),cy+(R-0.5)*Math.sin(a));
      ctx.strokeStyle=`rgba(255,255,255,${mj?0.14:0.05})`;ctx.lineWidth=mj?1:0.5;ctx.stroke();
    }
  }

  function _cntLoop(ts){
    if(!lastTs)lastTs=ts;
    const dt=(ts-lastTs)/1000; lastTs=ts;
    elapsed=Math.min(elapsed+dt,TOTAL); dotPhase+=dt;
    const t=Math.min(elapsed/ENCENDIDO,1);
    const intensity=1-Math.pow(1-t,3);
    const rem=Math.round(TOTAL-elapsed);
    const h=Math.floor(rem/3600), m=Math.floor((rem%3600)/60), sc=Math.floor(rem%60);
    const pad=n=>String(n).padStart(2,'0');
    const eh=document.getElementById('cnt-hrs'), em=document.getElementById('cnt-ms'), ed=document.getElementById('cnt-dot');
    if(eh)eh.textContent=pad(h);
    if(em)em.textContent=pad(m)+':'+pad(sc);
    if(ed)ed.textContent=['.','··','···'][Math.floor(dotPhase*1.2)%3];
    _cntBg(intensity);
    _cntClock(elapsed/TOTAL);
    if(document.getElementById('cnt-bg')) requestAnimationFrame(_cntLoop);
  }
  requestAnimationFrame(_cntLoop);
}

function adminEmpresaGenerarAcceso(clienteId){
  const clientes = S.get('clientes');
  const cli = clientes.find(c=>c.id===clienteId);
  if(!cli){ return null; }
  const accesos = S.get('admin_empresa_acceso')||[];
  let acc = accesos.find(a=>String(a.clienteId)===String(clienteId));
  if(!acc){
    acc = {id:S.nextId('admin_empresa_acceso'),clienteId,magicKey:generarMagicKey(),activo:true,fechaCreacion:todayStr(),equipoCompleto:false};
    accesos.push(acc);
  } else {
    acc.magicKey = generarMagicKey();
    acc.activo = true;
  }
  S.set('admin_empresa_acceso', accesos);
  return window.location.origin+window.location.pathname+'?mka='+acc.magicKey;
}

function _lanzarPortalCliente(){
  window._portalCerrado = false;
  // Mostrar el container BPC y ocultar el sistema
  const portal = document.getElementById('__bpc_portal_main__');
  if(!portal) return;
  portal.style.display = 'block';
  portal.style.zIndex = '99999';
  document.getElementById('main-app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'none';

  // Ocultar todas las scenes del portal externo
  portal.querySelectorAll('.scene').forEach(s=>s.classList.remove('on'));

  // Actualizar chrome con nombre del cliente
  const cli = (S.get('clientes')||[]).find(c=>c.id===currentUser?.clienteId);
  const chromeOrg = portal.querySelector('#c-o');
  if(chromeOrg) chromeOrg.textContent = cli?.nombre || currentUser?.nombre || '';

  // Agregar toggle de tema al chrome si no existe
  const chromeRight = portal.querySelector('.chrome-right');
  if(chromeRight && !chromeRight.querySelector('#portal-tema-toggle')){
    const toggle = document.createElement('div');
    toggle.id = 'portal-tema-toggle';
    toggle.style.cssText = 'display:flex;gap:4px;margin-left:12px;';
    toggle.innerHTML = `
      <button onclick="_portalToggleTema()" title="Cambiar tema"
        id="portal-btn-tema"
        style="width:26px;height:26px;border-radius:5px;background:rgba(255,255,255,0.05);border:1px solid rgba(212,175,55,0.2);cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;transition:all 0.2s">🌙</button>
      <button onclick="_portalLogout()" title="Cerrar sesión"
        style="width:26px;height:26px;border-radius:5px;background:rgba(255,255,255,0.04);border:1px solid rgba(212,175,55,0.1);cursor:pointer;font-size:10px;color:rgba(212,175,55,0.5);display:flex;align-items:center;justify-content:center;font-family:Manrope,sans-serif;letter-spacing:0.05em" title="Cerrar sesión">⏻</button>
    `;
    chromeRight.appendChild(toggle);
  }

  // Reusar o crear la scene del diagnóstico del cliente
  let scene = portal.querySelector('#s-cliente-diag');
  if(!scene){
    const _vp = portal.querySelector('.viewport');
    if(!_vp) return;
    scene = document.createElement('div');
    scene.id = 's-cliente-diag';
    scene.className = 'scene';
    _vp.appendChild(scene);
  }

  // Agregar botón de ayuda dentro del chrome del portal (no fuera, para no solaparse)
  const chromeRight2 = portal.querySelector('.chrome-right');
  if(chromeRight2 && !chromeRight2.querySelector('#portal-chat-btn')){
    const chatBtn = document.createElement('div');
    chatBtn.id = 'portal-chat-btn';
    chatBtn.style.cssText = 'width:32px;height:32px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffd700,#ffaa00,#e89200);display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;box-shadow:0 0 12px rgba(255,195,0,0.3);border:1.5px solid rgba(255,215,0,0.4);transition:transform 0.2s;margin-left:8px;flex-shrink:0';
    chatBtn.innerHTML = '✦';
    chatBtn.title = 'MetoAsist — Escribinos';
    chatBtn.onmouseover = ()=>chatBtn.style.transform='scale(1.1)';
    chatBtn.onmouseout = ()=>chatBtn.style.transform='';
    chatBtn.onclick = ()=>_portalAbrirChat();
    chromeRight2.appendChild(chatBtn);
  }

  _portalDimActual = 0;
  _portalPregActual = 0;
  _portalFase = 'intro';

  // Mostrar splash de bienvenida MetoAsist solo la primera vez por sesión
  const splashKey = 'mg_portal_splash_' + (currentUser?.clienteId||'x');
  const yaMostrado = sessionStorage.getItem(splashKey);
  const diag = getPortalDiagnostico();
  const diagCompleto = diag && diag.completo;

  if(!yaMostrado && !diagCompleto){
    sessionStorage.setItem(splashKey, '1');
    _portalMostrarSplash(cli, scene);
  } else {
    _portalClienteRender();
  }
}

function _portalMostrarSplash(cli, scene){
  if(!scene || !scene.isConnected) return;
  const portal = document.getElementById('__bpc_portal_main__');
  if(!portal) return;
  portal.querySelectorAll('.scene').forEach(s=>s.classList.remove('on'));
  scene.classList.add('on');

  const hr = new Date().getHours();
  const saludo = hr<12?'Buenos días':hr<18?'Buenas tardes':'Buenas noches';
  const contacto = cli?.contacto || currentUser?.nombre || '';
  const empresa  = cli?.nombre || '';
  const primerNombre = contacto.split(' ')[0] || contacto;

  if(!document.getElementById('_splash_css')){
    const st = document.createElement('style');
    st.id = '_splash_css';
    st.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=Space+Mono:wght@400;700&display=swap');

      /* Splash siempre oscuro — es la primera impresión */
      ._sw { width:100%;max-width:620px;padding:clamp(48px,8vh,88px) clamp(24px,5vw,52px);display:flex;flex-direction:column;animation:_swIn 0.85s cubic-bezier(0.16,1,0.3,1) both; }
      @keyframes _swIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }

      ._sw-agent { display:flex;align-items:center;gap:14px;margin-bottom:40px; }
      ._sw-orb { width:46px;height:46px;border-radius:50%;flex-shrink:0;background:radial-gradient(circle at 35% 30%,#f5d060,#d4af37 50%,#8a6a1a);display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 28px rgba(212,175,55,0.28),0 0 0 1px rgba(212,175,55,0.15);animation:orbPulse 3s ease-in-out infinite; }
      ._sw-info { flex:1; }
      ._sw-name { font-family:'Space Mono',monospace;font-size:12px;font-weight:700;color:#d4af37;letter-spacing:0.05em; }
      ._sw-role { font-family:'Space Mono',monospace;font-size:7px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.25);margin-top:3px; }
      ._sw-online { display:flex;align-items:center;gap:6px; }
      ._sw-dot { width:5px;height:5px;border-radius:50%;background:#d4af37;box-shadow:0 0 6px #d4af37;animation:glow-pulse 2s ease-in-out infinite; }
      ._sw-online-txt { font-family:'Space Mono',monospace;font-size:7px;letter-spacing:0.15em;color:rgba(212,175,55,0.45);text-transform:uppercase; }

      ._sw-rule { height:1px;background:linear-gradient(90deg,rgba(212,175,55,0.3),transparent);margin-bottom:40px; }

      ._sw-sal { font-family:'Space Mono',monospace;font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.22);margin-bottom:10px; }
      ._sw-nombre { font-family:'Cormorant Garamond',serif;font-size:clamp(42px,6.5vw,70px);font-weight:300;line-height:0.95;letter-spacing:-0.03em;color:rgba(255,255,255,0.92);margin-bottom:10px; }
      ._sw-empresa { font-family:'Space Mono',monospace;font-size:9px;letter-spacing:0.15em;color:rgba(255,255,255,0.22);text-transform:uppercase; }

      ._sw-msg { border-left:2px solid rgba(212,175,55,0.25);padding-left:22px;display:flex;flex-direction:column;gap:18px;margin-top:40px;margin-bottom:52px; }
      ._sw-p1 { font-family:'Cormorant Garamond',serif;font-size:clamp(17px,2.3vw,21px);font-weight:300;font-style:italic;line-height:1.7;color:rgba(255,255,255,0.55); }
      ._sw-p2 { font-family:'Cormorant Garamond',serif;font-size:15px;font-weight:300;line-height:1.8;color:rgba(255,255,255,0.32); }
      ._sw-p2 strong { font-weight:600;color:rgba(212,175,55,0.65);font-style:italic; }
      ._sw-p3 { font-family:'Space Mono',monospace;font-size:8px;letter-spacing:0.08em;line-height:1.9;color:rgba(255,255,255,0.18); }

      ._sw-cta { all:unset;box-sizing:border-box;display:inline-flex;align-items:center;gap:12px;padding:17px 40px;background:linear-gradient(135deg,#c8a84a,#d4af37,#b8922e);border-radius:2px;font-family:'Space Mono',monospace;font-size:9px;font-weight:700;letter-spacing:0.25em;text-transform:uppercase;color:#0a0800;cursor:pointer;box-shadow:0 4px 28px rgba(212,175,55,0.22),inset 0 1px 0 rgba(255,255,255,0.16);transition:box-shadow 0.2s,transform 0.15s;touch-action:manipulation;-webkit-tap-highlight-color:transparent; }
      ._sw-cta:hover { box-shadow:0 10px 40px rgba(212,175,55,0.32);transform:translateY(-1px); }
      ._sw-cta:active { transform:translateY(0); }
      ._sw-cta svg { pointer-events:none; }
    `;
    document.head.appendChild(st);
  }

  scene.innerHTML =
    '<div class="_sw">'
      // Logo MetoGroup
      +'<div style="display:flex;align-items:center;gap:12px;margin-bottom:36px">'        +'<div style="font-family:\'Syne\',sans-serif;font-size:22px;font-weight:800;letter-spacing:-0.5px;color:rgba(255,255,255,0.9)">MetoGroup</div>'        +'<div style="width:1px;height:20px;background:rgba(212,175,55,0.3)"></div>'        +'<div style="font-family:\'Space Mono\',monospace;font-size:8px;font-weight:700;letter-spacing:0.25em;text-transform:uppercase;color:rgba(212,175,55,0.6)">BPC 72001</div>'      +'</div>'
      // MetoAsist header
      +'<div class="_sw-agent">'        +'<div class="_sw-orb">✦</div>'        +'<div class="_sw-info"><div class="_sw-name">MetoAsist</div><div class="_sw-role">Asistente de proceso · BPC:2026</div></div>'        +'<div class="_sw-online"><div class="_sw-dot"></div><span class="_sw-online-txt">En línea</span></div>'      +'</div>'      +'<div class="_sw-rule"></div>'
      +'<div class="_sw-sal">'+saludo+'</div>'      +'<div class="_sw-nombre">'+primerNombre+'.</div>'      +(empresa?'<div class="_sw-empresa">'+empresa+'</div>':'')
      +'<div class="_sw-msg">'        +'<p class="_sw-p1">Bienvenido al proceso de auditoría <strong>BPC:2026</strong>. Soy MetoAsist y voy a guiarte en cada etapa dentro del sistema.</p>'        +'<p class="_sw-p2">El proceso dura aproximadamente <strong>30 días</strong>. Van a intervenir auditores, consultores y el equipo técnico de MetoGroup. Yo voy a estar disponible en todo momento para orientarte.</p>'        +'<p class="_sw-p2">Para que el resultado tenga valor real, necesitamos <strong>100% de sinceridad</strong> en cada respuesta. No hay respuestas correctas ni incorrectas — solo buscamos entender el punto de partida real de tu organización para ayudarte a mejorar.</p>'        +'<p class="_sw-p3">Empezamos con un diagnóstico de 10 a 15 minutos. Cualquier consulta durante el proceso, usá el ícono ✦ en la barra superior.</p>'      +'</div>'
      +'<div>'        +'<button type="button" class="_sw-cta" onclick="_portalClienteRender()">'          +'Comenzar diagnóstico'          +'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>'        +'</button>'      +'</div>'    +'</div>';
}

function _portalAbrirChat(){
  // Panel de chat simple para el cliente
  let panel = document.getElementById('metoasist-cliente-panel');
  if(!panel){
    const portalEl = document.getElementById('__bpc_portal_main__');
    const esClaro  = portalEl?.dataset.tema === 'light';
    const panelBg  = esClaro ? '#2a2a2a' : '#0e0f10';
    const panelBdr = esClaro ? 'rgba(130,95,15,0.25)' : 'rgba(212,175,55,0.2)';
    const panelSh  = esClaro ? '0 20px 60px rgba(0,0,0,0.12)' : '0 20px 60px rgba(0,0,0,0.6),0 0 40px rgba(212,175,55,0.06)';
    panel = document.createElement('div');
    panel.id = 'metoasist-cliente-panel';
    panel.style.cssText = `position:fixed;bottom:88px;right:24px;z-index:99999;width:340px;max-width:92vw;background:${panelBg};border:1px solid ${panelBdr};border-radius:12px;box-shadow:${panelSh};display:flex;flex-direction:column;overflow:hidden;animation:orbPanelIn 0.3s ease-out`;
    panel.innerHTML = `
      <div style="padding:14px 16px;border-bottom:1px solid rgba(212,175,55,0.12);display:flex;align-items:center;gap:10px;background:linear-gradient(135deg,rgba(212,175,55,0.08),transparent)">
        <div style="width:34px;height:34px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffd700,#ffaa00,#e89200);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0">✦</div>
        <div>
          <div style="font-size:13px;font-weight:700;background:linear-gradient(135deg,#ffd700,#ffaa00);-webkit-background-clip:text;-webkit-text-fill-color:transparent">MetoAsist</div>
          <div style="font-size:9px;color:var(--pt3,rgba(100,80,20,0.5));letter-spacing:0.05em">Asistente del proceso BPC:2026</div>
        </div>
        <button onclick="document.getElementById('metoasist-cliente-panel').remove()" style="margin-left:auto;width:26px;height:26px;border-radius:6px;background:rgba(128,100,0,0.06);border:1px solid rgba(212,175,55,0.2);color:rgba(150,120,20,0.7);cursor:pointer;font-size:13px">✕</button>
      </div>
      <div id="metoasist-cliente-msgs" style="padding:16px;display:flex;flex-direction:column;gap:10px;min-height:120px;max-height:260px;overflow-y:auto">
        <div style="background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.18);border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.7;color:var(--pt,rgba(20,12,0,0.8))">
          Hola, soy MetoAsist. Cualquier consulta sobre el proceso de diagnóstico o la auditoría BPC:2026, escribime acá — el equipo de MetoGroup te responde a la brevedad.
        </div>
      </div>
      <div style="padding:10px 12px;border-top:1px solid rgba(212,175,55,0.08);display:flex;gap:8px">
        <textarea id="metoasist-cliente-input" placeholder="Escribí tu consulta..." rows="1" style="flex:1;background:rgba(212,175,55,0.05);border:1px solid rgba(212,175,55,0.2);border-radius:8px;padding:9px 12px;color:var(--pt,rgba(20,12,0,0.85));font-size:13px;resize:none;font-family:'Manrope',sans-serif;outline:none" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();_portalEnviarMensaje()}"></textarea>
        <button onclick="_portalEnviarMensaje()" style="width:38px;height:38px;border-radius:8px;background:radial-gradient(circle at 35% 35%,#ffd700,#e89200);border:none;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0">→</button>
      </div>
    `;
    document.body.appendChild(panel);
  } else {
    panel.remove();
  }
}

async function _portalEnviarMensaje(){
  const input = document.getElementById('metoasist-cliente-input');
  const msgs = document.getElementById('metoasist-cliente-msgs');
  if(!input||!msgs) return;
  const texto = input.value.trim();
  if(!texto) return;

  // Mostrar mensaje del usuario
  const msgUser = document.createElement('div');
  msgUser.style.cssText = 'background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.2);border-radius:8px;padding:10px 12px;font-size:12px;color:var(--pt,rgba(20,12,0,0.8));align-self:flex-end;max-width:85%;margin-left:auto;text-align:right';
  msgUser.textContent = texto;
  msgs.appendChild(msgUser);
  input.value = '';
  msgs.scrollTop = msgs.scrollHeight;

  // Guardar consulta en el sistema para que el equipo la vea
  const cli = (S.get('clientes')||[]).find(c=>c.id===currentUser?.clienteId);
  const mensajes = JSON.parse(localStorage.getItem('mg_portal_chat_'+(currentUser?.clienteId||'x'))||'[]');
  mensajes.push({fecha:new Date().toISOString(), de: cli?.contacto||currentUser?.nombre||'Cliente', texto});
  localStorage.setItem('mg_portal_chat_'+(currentUser?.clienteId||'x'), JSON.stringify(mensajes));

  // Registro central (también actualiza admin_ventas_pendientes via agenteAlerta)
  _portalRegistrarAccion('mensaje_consultor', {
    label: 'Mensaje del cliente en portal',
    detalle: '"'+texto.substring(0,200)+'"',
    pasoMapa: 'Comunicación con consultor',
    accion: 'Responder al cliente en el portal o por email a la brevedad.',
  });

  // Mantener también en admin_ventas_pendientes para badge
  const alertas = S.get('admin_ventas_pendientes')||[];
  alertas.unshift({
    id: Date.now(),
    tipo: 'mensaje_cliente_portal',
    empresa: cli?.nombre||'Cliente',
    asunto: texto.substring(0,80),
    fecha: new Date().toLocaleString('es-AR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}),
    estado: 'pendiente'
  });
  S.set('admin_ventas_pendientes', alertas.slice(0,100));
  updateCobrosAlert();

  // Respuesta con IA
  const _typingEl = document.createElement('div');
  _typingEl.style.cssText = 'background:rgba(212,175,55,0.07);border:1px solid rgba(212,175,55,0.15);border-radius:8px;padding:10px 12px;font-size:12px;line-height:1.7;color:var(--pt2,rgba(100,80,20,0.6));font-style:italic';
  _typingEl.textContent = 'MetoAsist está escribiendo...';
  msgs.appendChild(_typingEl);
  msgs.scrollTop = msgs.scrollHeight;

  const _cli2  = (S.get('clientes')||[]).find(c=>c.id===currentUser?.clienteId);
  const _diag2 = getPortalDiagnostico();
  const _score2 = _diag2?.score ?? null;
  const _nivel2 = _score2 !== null ? (getBPCNivel(_score2)||{}).nombre : null;

  const _sysPrompt = `Sos MetoAsist, el asistente de proceso de MetoGroup Latam S.A. para la norma BPC:2026 (Buenas Prácticas Comerciales y Éticas).
Estás hablando con ${_cli2?.contacto||currentUser?.nombre||'el/la cliente'} de la empresa ${_cli2?.nombre||''}.
${_score2 !== null ? `Su diagnóstico BPC:2026 arroja un score de ${_score2}/100 — nivel: ${_nivel2||''}.` : 'Todavía no completó el diagnóstico BPC:2026.'}
Tu rol es orientar, explicar y acompañar durante el proceso de auditoría. Respondé en español rioplatense, de forma cálida, profesional y concisa (máximo 3 párrafos). No inventés fechas ni datos concretos que no tengas. Si la pregunta escapa a tu conocimiento del proceso BPC, derivá cortésmente al equipo.`;

  try {
    const _apiKey2 = localStorage.getItem('METO_anthropic_key') || ANTHROPIC_API_KEY;
    const _resp = await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'x-api-key': _apiKey2,
        'anthropic-version':'2023-06-01',
        'anthropic-dangerous-direct-browser-access':'true'
      },
      body: JSON.stringify({
        model:'claude-sonnet-4-20250514',
        max_tokens:400,
        system: _sysPrompt,
        messages:[{role:'user',content:texto}]
      })
    });
    const _data = await _resp.json();
    const _reply = (_data.content||[]).find(b=>b.type==='text')?.text || 'No pude procesar tu consulta. El equipo de MetoGroup te responde a la brevedad.';
    _typingEl.style.cssText = 'background:rgba(212,175,55,0.07);border:1px solid rgba(212,175,55,0.15);border-radius:8px;padding:10px 12px;font-size:12px;line-height:1.7;color:var(--pt,rgba(20,12,0,0.8))';
    _typingEl.style.fontStyle = 'normal';
    _typingEl.textContent = _reply;
  } catch(_e) {
    _typingEl.textContent = 'En este momento no puedo responder automáticamente. El equipo de MetoGroup te va a contactar a la brevedad.';
  }
  msgs.scrollTop = msgs.scrollHeight;
}


// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║         REGLA ARQUITECTÓNICA — PORTAL CLIENTE — LEER SIEMPRE            ║
// ╠═══════════════════════════════════════════════════════════════════════════╣
// ║                                                                           ║
// ║  TODA acción que el cliente realice en su módulo portal DEBE:             ║
// ║                                                                           ║
// ║  1. LLAMAR a _portalRegistrarAccion(tipo, datos)                          ║
// ║     → Registra en portal_hitos (historial permanente)                    ║
// ║     → Actualiza el campo correspondiente en la auditoría vinculada        ║
// ║     → Dispara agenteAlerta() al tablero de administración                 ║
// ║                                                                           ║
// ║  2. ACTUALIZAR el campo en la auditoría (auditoriaField en datos{})       ║
// ║     → El mapa de procesos lee esos campos y cambia de color               ║
// ║     → Sin esta actualización el mapa queda estático                       ║
// ║                                                                           ║
// ║  3. EMITIR alerta legible para el equipo con:                             ║
// ║     → Nombre del cliente + empresa                                        ║
// ║     → Qué hizo exactamente                                                ║
// ║     → Fecha y hora                                                        ║
// ║     → Acción requerida por el equipo MetoGroup                            ║
// ║                                                                           ║
// ║  FLUJO DE APROBACIÓN FINAL:                                               ║
// ║  El diagnóstico/proceso NO se marca como completado en la auditoría       ║
// ║  hasta que el CONSULTOR ASIGNADO lo apruebe explícitamente.               ║
// ║  El cliente ve "En revisión" hasta que el consultor aprueba.              ║
// ║  Solo la aprobación del consultor activa el siguiente paso del mapa.      ║
// ║                                                                           ║
// ║  TIPOS DE ACCIÓN VÁLIDOS:                                                 ║
// ║  'diagnostico_completo' → finaliza cuestionario BPC                       ║
// ║  'documento_subido'     → sube o marca un documento como enviado          ║
// ║  'mensaje_consultor'    → escribe en el chat del portal                   ║
// ║  'pac_actualizado'      → modifica su plan de acción correctivo           ║
// ║  'hito_completado'      → confirma un hito del calendario                 ║
// ║  (agregar nuevos tipos acá cuando se expanda el módulo)                   ║
// ║                                                                           ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════════════════════════
// REGISTRO CENTRAL DE ACCIONES DEL PORTAL CLIENTE
// Cada acción del cliente que tenga impacto debe llamar a esta función.
// Registra en: portal_hitos · auditoría · alerta admin · mapa de procesos
// ═══════════════════════════════════════════════════════════════════════════

function _portalRegistrarAccion(tipo, datos){
  // tipo: 'diagnostico_completo' | 'documento_subido' | 'mensaje_consultor'
  //       | 'pac_actualizado' | 'hito_completado'
  // datos: { label, detalle, pasoMapa, auditoriaField }

  const clienteId = currentUser?.clienteId;
  if(!clienteId) return;

  const cli = (S.get('clientes')||[]).find(c=>String(c.id)===String(clienteId));
  const empresa = cli?.nombre || 'Cliente';
  const ahora = new Date();
  const fechaStr = ahora.toISOString().split('T')[0];
  const horaStr  = ahora.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});

  // ── 1. Registrar en portal_hitos ──
  const hitos = S.get('portal_hitos')||[];
  hitos.unshift({
    id: Date.now(),
    clienteId,
    nombre: datos.label,
    fecha: fechaStr,
    hora: horaStr,
    estado: 'completado',
    tipo,
    notas: datos.detalle||'',
  });
  S.set('portal_hitos', hitos.slice(0, 200));

  // ── 2. Actualizar campo en la auditoría vinculada ──
  if(datos.auditoriaField){
    const auds = S.get('auditorias')||[];
    const aud = auds.find(a=>String(a.clienteId)===String(clienteId));
    if(aud){
      aud[datos.auditoriaField] = true;
      aud[datos.auditoriaField+'_fecha'] = fechaStr;
      if(datos.avanzarEstado && (aud.estado==='Pendiente'||aud.estado==='Iniciada')){
        aud.estado = 'En proceso';
      }
      // Actualizar caché local
      const _ai = auds.findIndex(a=>a.id===aud.id);
      if(_ai>-1) auds[_ai]=aud;
      _sbCache['auditorias'] = JSON.parse(JSON.stringify(auds));
      try{ localStorage.setItem('METO_auditorias', JSON.stringify(auds)); }catch(e){}
      // PATCH directo a Supabase
      const _patch = {[datos.auditoriaField]: true, [datos.auditoriaField+'_fecha']: fechaStr};
      if(datos.avanzarEstado) _patch.estado = aud.estado;
      sbFetch('auditorias','PATCH',_patch,'?id=eq.'+aud.id).catch(e=>console.error('sbPatch auditorias error:',e));
    }
  }

  // ── 3. Alerta al equipo MetoGroup ──
  const iconos = {
    diagnostico_completo: '✅',
    documento_subido:     '📎',
    mensaje_consultor:    '💬',
    pac_actualizado:      '📋',
    hito_completado:      '🏁',
  };
  const icono = iconos[tipo]||'🔔';

  agenteAlerta(
    icono+' '+datos.label+' — '+empresa,
    datos.detalle
    + '\nCliente: '+empresa
    + '\nFecha: '+fechaStr+' '+horaStr
    + (datos.pasoMapa ? '\nPaso en mapa: '+datos.pasoMapa : '')
    + '\n\nAcción requerida: '+( datos.accion || 'Revisar en el panel de administración.' )
  );
}


function _portalClienteRender(){
  const portal = document.getElementById('__bpc_portal_main__');
  if(!portal) return;
  portal.querySelectorAll('.scene').forEach(s=>s.classList.remove('on'));
  const scene = portal.querySelector('#s-cliente-diag');
  if(!scene) return;
  scene.classList.add('on');

  // Si el diagnóstico ya está completo, mostrar agradecimiento — nunca volver al intro
  const diagCheck = getPortalDiagnostico();
  if(diagCheck && diagCheck.completo){
    _portalRenderAgradecimiento(scene, diagCheck);
    return;
  }

  if(_portalFase === 'intro'){
    _portalRenderIntro(scene);
  } else if(_portalFase === 'cierre'){
    _portalRenderCierre(scene);
  } else if(_portalFase === 'perfil'){
    _portalRenderPerfil(scene);
  } else {
    _portalRenderPregunta(scene);
  }
}

// ── Calcular índice global de pregunta ──
function _portalGetPregGlobal(){
  let total = 0;
  for(let d = 0; d < _portalDimActual; d++){
    total += BPC_DIMENSIONES[d].preguntas.length;
  }
  return total + _portalPregActual;
}

function _portalGetTotalPregs(){
  return BPC_DIMENSIONES.reduce((s,d)=>s+d.preguntas.length, 0);
}

// ── Pantalla de intro (pregunta de calibración 1-10) ──
function _portalRenderIntro(scene){
  if(!scene || !scene.isConnected) return;
  const cli    = (S.get('clientes')||[]).find(c=>c.id===currentUser?.clienteId);
  const nombre = cli?.contacto?.split(' ')[0] || currentUser?.nombre?.split(' ')[0] || '';
  const diag   = getPortalDiagnostico();
  const sel    = diag?.introScore || null;
  const portal = document.getElementById('__bpc_portal_main__');
  const isLight = portal?.dataset.tema === 'light';

  // CSS con variables — se inserta una sola vez y funciona en ambos temas
  if(!document.getElementById('_intro_css')){
    const st = document.createElement('style');
    st.id = '_intro_css';
    st.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=Space+Mono:wght@400;700&display=swap');

      /* Variables de tema — se sobreescriben en modo claro */
      #__bpc_portal_main__[data-tema="light"] { --pt: rgba(255,255,255,0.92); --pt2: rgba(255,255,255,0.65); --pt3: rgba(255,255,255,0.38); --pk-bg: linear-gradient(180deg,#333333,#2e2e2e,#282828); --pk-bdr: rgba(255,255,255,0.1); --pk-bdrb: rgba(0,0,0,0.4); --pk-sh: 0 3px 6px rgba(0,0,0,0.1),0 1px 2px rgba(0,0,0,0.06); --pk-num: rgba(20,12,0,0.52); --pk-lbl: rgba(20,12,0,0.22); --pk-on-bg: rgba(212,175,55,0.12); --pk-on-bdr: #d4af37; --pk-on-num: #d4af37; --pk-on-lbl: rgba(212,175,55,0.8); --pk-on-sh: 0 3px 6px rgba(0,0,0,0.1),0 0 18px rgba(150,110,0,0.18); --pn-bdr: rgba(130,95,15,0.2); --pn-h: rgba(130,95,15,0.45); --pn-hb: rgba(130,95,15,0.08); --pn-ta: rgba(20,12,0,0.55); --pe: rgba(20,12,0,0.2); }
      #__bpc_portal_main__[data-tema="dark"],  #__bpc_portal_main__:not([data-tema]) { --pt: rgba(255,255,255,0.88); --pt2: rgba(255,255,255,0.4); --pt3: rgba(255,255,255,0.18); --pk-bg: linear-gradient(180deg,#1a1a18,#111110,#0e0e0c); --pk-bdr: rgba(255,255,255,0.07); --pk-bdrb: rgba(0,0,0,0.55); --pk-sh: 0 4px 8px rgba(0,0,0,0.5),0 1px 3px rgba(0,0,0,0.8); --pk-num: rgba(255,255,255,0.55); --pk-lbl: rgba(255,255,255,0.2); --pk-on-bg: rgba(212,175,55,0.1); --pk-on-bdr: #d4af37; --pk-on-num: #d4af37; --pk-on-lbl: rgba(212,175,55,0.75); --pk-on-sh: 0 4px 8px rgba(0,0,0,0.5),0 0 22px rgba(212,175,55,0.18); --pn-bdr: rgba(212,175,55,0.15); --pn-h: rgba(212,175,55,0.4); --pn-hb: rgba(212,175,55,0.07); --pn-ta: rgba(255,255,255,0.5); --pe: rgba(255,255,255,0.18); }

      ._iw { width:100%;max-width:660px;padding:clamp(36px,6vh,72px) clamp(24px,5vw,52px);display:flex;flex-direction:column; }
      ._iw-badge { display:flex;align-items:center;gap:10px;margin-bottom:clamp(32px,5vh,56px); }
      ._iw-badge-line { width:28px;height:1px;background:linear-gradient(90deg,#b8922e,transparent);flex-shrink:0; }
      ._iw-badge-txt { font-family:'Space Mono',monospace;font-size:8px;letter-spacing:0.32em;text-transform:uppercase;color:rgba(185,146,46,0.6); }
      ._iw-q { margin-bottom:clamp(36px,5vh,60px); }
      ._iw-q-l1 { font-family:'Cormorant Garamond',serif;font-size:clamp(30px,5vw,52px);font-weight:300;font-style:italic;line-height:1.15;letter-spacing:-0.025em;color:var(--pt); }
      ._iw-q-l2 { font-family:'Cormorant Garamond',serif;font-size:clamp(30px,5vw,52px);font-weight:300;line-height:1.2;letter-spacing:-0.025em;margin-top:4px;color:var(--pt2); }
      ._iw-accent { font-weight:600;font-style:italic;background:linear-gradient(135deg,#d4af37,#f5d060,#b8922e);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text; }
      ._iw-keys { display:flex;gap:5px;margin-bottom:10px; }
      ._ik { all:unset;box-sizing:border-box;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px 2px 14px;cursor:pointer;border-radius:4px 4px 5px 5px;position:relative;transition:transform 0.07s,box-shadow 0.1s,background 0.12s,border-color 0.12s;touch-action:manipulation;-webkit-tap-highlight-color:transparent;user-select:none;min-height:70px;background:var(--pk-bg);border:1.5px solid var(--pk-bdr);border-bottom:3px solid var(--pk-bdrb);box-shadow:var(--pk-sh); }
      ._ik._ik-on { background:var(--pk-on-bg) !important;border-color:var(--pk-on-bdr) !important;border-bottom-color:var(--pk-on-bdr) !important;box-shadow:var(--pk-on-sh) !important; }
      ._ik:active { transform:translateY(2px);border-bottom-width:1px; }
      ._ik-num { font-family:'Cormorant Garamond',serif;font-size:clamp(20px,2.8vw,30px);line-height:1;pointer-events:none;transition:color 0.1s;color:var(--pk-num); }
      ._ik._ik-on ._ik-num { color:var(--pk-on-num); }
      ._ik-lbl { font-family:'Space Mono',monospace;font-size:6px;letter-spacing:0.1em;text-transform:uppercase;pointer-events:none;margin-top:5px;transition:color 0.1s;min-height:8px;color:var(--pk-lbl); }
      ._ik._ik-on ._ik-lbl { color:var(--pk-on-lbl); }
      ._iw-extremos { display:flex;justify-content:space-between;margin-bottom:clamp(28px,4vh,48px); }
      ._iw-ext-lbl { font-family:'Space Mono',monospace;font-size:8px;letter-spacing:0.1em;text-transform:uppercase;color:var(--pe); }
      ._iw-notes { margin-bottom:clamp(32px,5vh,52px);border-radius:3px;overflow:hidden;border:1px solid var(--pn-bdr);background:rgba(128,96,0,0.02); }
      ._iw-notes-h { padding:8px 16px;font-family:'Space Mono',monospace;font-size:7px;letter-spacing:0.28em;text-transform:uppercase;color:var(--pn-h);border-bottom:1px solid var(--pn-hb); }
      ._iw-notes-ta { width:100%;background:transparent;border:none;padding:14px 16px;font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:300;font-style:italic;resize:none;outline:none;line-height:1.65;box-sizing:border-box;color:var(--pn-ta); }
      ._iw-notes-ta::placeholder { color:var(--pt3); }
      ._iw-cta-row { display:flex;justify-content:flex-end; }
      ._iw-cta { all:unset;box-sizing:border-box;display:inline-flex;align-items:center;gap:12px;padding:16px 38px;background:linear-gradient(135deg,#c8a84a,#d4af37,#b8922e);border-radius:2px;font-family:'Space Mono',monospace;font-size:9px;font-weight:700;letter-spacing:0.25em;text-transform:uppercase;color:#0a0800;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;box-shadow:0 4px 24px rgba(212,175,55,0.22),inset 0 1px 0 rgba(255,255,255,0.18);transition:box-shadow 0.2s,transform 0.15s; }
      ._iw-cta:hover { box-shadow:0 8px 40px rgba(212,175,55,0.35),inset 0 1px 0 rgba(255,255,255,0.2);transform:translateY(-1px); }
      ._iw-cta:active { transform:translateY(0);box-shadow:0 2px 12px rgba(212,175,55,0.2); }
      ._iw-cta svg { pointer-events:none; }
    `;
    document.head.appendChild(st);
  }

  const LABELS = {1:'Bajo',5:'Medio',10:'Alto'};
  let keys = '';
  for(let n = 1; n <= 10; n++){
    keys +=
      '<button type="button" class="_ik'+(sel===n?' _ik-on':'')
      +'" data-n="'+n+'" onclick="_portalSetIntro('+n+',this)">'
      +'<span class="_ik-num">'+n+'</span>'
      +'<span class="_ik-lbl">'+(LABELS[n]||'')+'</span>'
      +'</button>';
  }

  scene.innerHTML =
    '<div class="_iw">'
    +'<div class="_iw-badge"><div class="_iw-badge-line"></div><span class="_iw-badge-txt">BPC 72001 · Diagnóstico inicial</span></div>'
    +'<div class="_iw-q">'
      +'<div class="_iw-q-l1">'+(nombre?nombre+', antes de comenzar —':'Antes de comenzar —')+'</div>'
      +'<div class="_iw-q-l2">del 1 al 10, ¿qué tan ordenado y gestionado está <span class="_iw-accent">tu sistema comercial</span> hoy?</div>'
    +'</div>'
    +'<div class="_iw-keys" id="intro-num-grid">'+keys+'</div>'
    +'<div class="_iw-extremos">'
      +'<span class="_iw-ext-lbl">Sin estructura formal</span>'
      +'<span class="_iw-ext-lbl">Sistema de excelencia</span>'
    +'</div>'
    +'<div class="_iw-notes">'
      +'<div class="_iw-notes-h">Notas opcionales</div>'
      +'<textarea class="_iw-notes-ta" id="portal-intro-notas" rows="3" placeholder="¿Por qué ese número? ¿Qué área sentís más desorganizada?">'+(diag?.introNotas||'')+'</textarea>'
    +'</div>'
    +'<div class="_iw-cta-row">'
      +'<button type="button" class="_iw-cta" onclick="_portalAvanzarDesdeIntro()">'
        +'Comenzar diagnóstico'
        +'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>'
      +'</button>'
    +'</div>'
    +'</div>';
}

function _portalSetIntro(n, el){
  // Guardar
  let diag = getPortalDiagnostico();
  const pd = S.get('portal_diagnostico')||[];
  if(!diag){
    diag = {id:S.nextId('portal_diagnostico'),clienteId:currentUser.clienteId,respuestas:{},completo:false,fechaInicio:todayStr()};
    pd.push(diag);
  }
  diag.introScore = n;
  const idx = pd.findIndex(d=>d.clienteId===currentUser.clienteId);
  if(idx>-1) pd[idx]=diag; else pd.push(diag);
  S.set('portal_diagnostico', pd);

  // Visual — solo toggle de clase, CSS variables hacen el trabajo
  const grid = document.getElementById('intro-num-grid');
  if(!grid) return;
  grid.querySelectorAll('button[data-n]').forEach(btn=>{
    btn.classList.toggle('_ik-on', parseInt(btn.getAttribute('data-n'))===n);
  });
}

function _portalAvanzarDesdeIntro(){
  // Guardar notas del intro
  const notasEl = document.getElementById('portal-intro-notas');
  if(notasEl){
    let diag = getPortalDiagnostico();
    const portal = S.get('portal_diagnostico')||[];
    if(!diag){ diag = {id:S.nextId('portal_diagnostico'),clienteId:currentUser.clienteId,respuestas:{},completo:false,fechaInicio:todayStr()}; portal.push(diag); }
    diag.introNotas = notasEl.value;
    const idx = portal.findIndex(d=>d.clienteId===currentUser.clienteId);
    if(idx>-1) portal[idx]=diag; else portal.push(diag);
    S.set('portal_diagnostico', portal);
  }
  _portalFase = 'preguntas';
  _portalDimActual = 0;
  _portalPregActual = 0;
  _portalClienteRender();
}

// ── Pantalla de cierre (repite pregunta 1-10) ──
function _portalRenderCierre(scene){
  if(!scene || !scene.isConnected) return;
  const diag = getPortalDiagnostico();
  const cierreVal = diag?.cierreScore || null;
  const introVal = diag?.introScore || null;

  scene.innerHTML = `
    <div class="q-stage" style="max-width:580px;width:100%;padding:0 clamp(16px,4vw,32px)">
      <div class="fl" style="margin-bottom:8px">
        <div class="q-dim">Reflexión final</div>
      </div>
      <div class="fl q-bar" style="margin-bottom:clamp(20px,4vh,40px)">
        <div class="q-bar-fill" style="width:100%"></div>
      </div>
      <div class="fl" style="margin-bottom:clamp(16px,3vh,28px)">
        <div class="q-text" style="font-size:clamp(20px,3vw,30px)">
          Terminaste el diagnóstico. Ahora que respondiste sobre cada dimensión — ¿cómo calificarías del 1 al 10 <strong style="color:rgba(212,175,55,0.8)">el nivel de orden y madurez</strong> de tu sistema comercial?
        </div>
        ${introVal ? `<div style="font-size:12px;color:rgba(212,175,55,0.4);margin-top:8px;font-family:'DM Mono',monospace">Tu respuesta inicial fue: ${introVal}/10</div>` : ''}
      </div>
      <div class="fl" style="display:flex;gap:clamp(4px,1vw,8px);flex-wrap:wrap;margin-bottom:clamp(20px,4vh,36px)">
        ${Array.from({length:10},(_,i)=>i+1).map(n=>`
          <div class="_cierre-n ${cierreVal===n?'on':''}" onclick="_portalSetCierre(${n},this)"
            style="flex:1;min-width:42px;padding:clamp(12px,2vh,20px) 4px;text-align:center;cursor:pointer;border-radius:10px;position:relative;transition:all 0.2s">
            <div style="position:absolute;inset:0;border-radius:10px;border:1.5px solid ${cierreVal===n?'#d4af37':'rgba(212,175,55,0.15)'};background:${cierreVal===n?'rgba(212,175,55,0.08)':'rgba(255,255,255,0.03)'};transition:all 0.2s"></div>
            <span style="position:relative;z-index:1;font-family:'Instrument Serif',serif;font-size:clamp(18px,2.5vw,28px);display:block;color:${cierreVal===n?'rgba(212,175,55,0.8)':'#f0f1f4'}">${n}</span>
            <span style="position:relative;z-index:1;font-size:9px;color:${cierreVal===n?'#d4af37':'#6a6d78'};font-weight:600">${n===1?'Bajo':n===5?'Medio':n===10?'Alto':''}</span>
          </div>
        `).join('')}
      </div>
      <div class="fl" style="margin-bottom:clamp(20px,4vh,32px)">
        <div style="border:1px solid rgba(212,175,55,0.15);border-radius:6px;overflow:hidden">
          <div style="padding:8px 14px;font-size:8px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(212,175,55,0.4);border-bottom:1px solid rgba(212,175,55,0.08);font-family:'DM Mono',monospace">Comentario final</div>
          <textarea id="portal-cierre-notas" placeholder="¿Cambió tu percepción después de responder? ¿Qué área sentís que necesita más atención?" rows="3"
            style="width:100%;background:transparent;border:none;padding:12px 14px;color:rgba(255,255,255,0.6);font-size:13px;font-family:'Manrope',sans-serif;resize:none;outline:none;line-height:1.6">${diag?.cierreNotas||''}</textarea>
        </div>
      </div>
      <div class="fl q-nav">
        <button class="btn" onclick="_portalVolverUltimaPregunta()">← Volver</button>
        <button class="btn btn-c" onclick="_portalCompletarCierre()">Ver mis resultados →</button>
      </div>
    </div>`;

  requestAnimationFrame(()=>scene.querySelectorAll('.fl').forEach((el,i)=>setTimeout(()=>el.classList.add('in'),80+i*80)));
}

function _portalSetCierre(n, el){
  let diag = getPortalDiagnostico();
  const portal = S.get('portal_diagnostico')||[];
  if(!diag){ diag={id:S.nextId('portal_diagnostico'),clienteId:currentUser.clienteId,respuestas:{},completo:false,fechaInicio:todayStr()}; portal.push(diag); }
  diag.cierreScore = n;
  const idx = portal.findIndex(d=>d.clienteId===currentUser.clienteId);
  if(idx>-1) portal[idx]=diag; else portal.push(diag);
  S.set('portal_diagnostico', portal);
  const scene = document.getElementById('s-cliente-diag');
  if(scene) scene.querySelectorAll('._cierre-n').forEach(item=>{
    const isOn = item===el;
    const bg=item.querySelector('div'); const num=item.querySelectorAll('span')[0]; const lbl=item.querySelectorAll('span')[1];
    if(bg){bg.style.borderColor=isOn?'#d4af37':'rgba(212,175,55,0.15)';bg.style.background=isOn?'rgba(212,175,55,0.08)':'rgba(255,255,255,0.03)';}
    if(num){num.style.color=isOn?'rgba(212,175,55,0.8)':'#f0f1f4';}
    if(lbl){lbl.style.color=isOn?'#d4af37':'#6a6d78';}
  });
}

function _portalVolverUltimaPregunta(){
  _portalFase = 'preguntas';
  const lastDim = BPC_DIMENSIONES.length - 1;
  _portalDimActual = lastDim;
  _portalPregActual = BPC_DIMENSIONES[lastDim].preguntas.length - 1;
  _portalClienteRender();
}

function _portalCompletarCierre(){
  // Guardar notas del cierre
  const notasEl = document.getElementById('portal-cierre-notas');
  if(notasEl){
    let diag = getPortalDiagnostico();
    const portal = S.get('portal_diagnostico')||[];
    if(!diag){ diag={id:S.nextId('portal_diagnostico'),clienteId:currentUser.clienteId,respuestas:{},completo:false,fechaInicio:todayStr()}; portal.push(diag); }
    diag.cierreNotas = notasEl.value;
    const idx = portal.findIndex(d=>d.clienteId===currentUser.clienteId);
    if(idx>-1) portal[idx]=diag; else portal.push(diag);
    S.set('portal_diagnostico', portal);
  }
  // Ir al módulo de perfil situacional antes de finalizar
  _portalFase = 'perfil';
  _portalPerfilPregActual = 0;
  _portalClienteRender();
}

// ── Render de UNA pregunta a la vez ──
function _portalRenderPregunta(scene){
  if(!scene || !scene.isConnected) return;
  const dim = BPC_DIMENSIONES[_portalDimActual];
  if(!dim){ _portalFase='cierre'; _portalClienteRender(); return; }

  const p = dim.preguntas[_portalPregActual];
  if(!p){ 
    // Fin de dimensión → siguiente
    _portalDimActual++;
    _portalPregActual = 0;
    if(_portalDimActual >= BPC_DIMENSIONES.length){ _portalFase='cierre'; _portalClienteRender(); return; }
    _portalRenderPregunta(scene);
    return;
  }

  const diag = getPortalDiagnostico();
  const resps = (diag&&diag.respuestas)||{};
  const notas = (diag&&diag.notasPreguntas)||{};
  const pregGlobal = _portalGetPregGlobal();
  const totalPregs = _portalGetTotalPregs();
  const pct = Math.round(pregGlobal / totalPregs * 100);
  const isFirst = pregGlobal === 0;
  const isLast = pregGlobal === totalPregs - 1;

  const escala = [
    {v:1,n:'1',l:'Nunca'},
    {v:2,n:'2',l:'Casi nunca'},
    {v:3,n:'3',l:'A veces'},
    {v:4,n:'4',l:'Casi siempre'},
    {v:5,n:'5',l:'Siempre'},
  ];

  // Para dimensión de canales o reflexiva
  const isCanal = dim.esCanales;
  const isReflexiva = dim.esReflexiva;
  const canales = [
    ['🏬','Venta directa'],['📞','Teléfono outbound'],['📧','Email marketing'],
    ['💼','Distribuidores'],['🌐','Web / e-commerce'],['📱','Redes sociales'],
    ['🤝','Referidos'],['🏪','Punto de venta'],['🤖','WhatsApp'],['📣','Publicidad paga'],
  ];

  const respActual = resps[p.id]||null;
  const notaActual = notas[p.id]||'';

  scene.innerHTML = `
    <div class="q-stage" style="max-width:580px;width:100%;padding:0 clamp(16px,4vw,32px)">
      <!-- Progreso -->
      <div class="fl" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div class="q-dim" style="margin:0">${dim.nombre} · Pregunta ${_portalPregActual+1}/${dim.preguntas.length}</div>
        <div style="font-size:9px;color:rgba(212,175,55,0.5);font-family:'DM Mono',monospace">${pct}%</div>
      </div>
      <div class="fl q-bar" style="margin-bottom:clamp(20px,4vh,40px)">
        <div class="q-bar-fill" style="width:${pct}%"></div>
      </div>

      <!-- Pregunta -->
      <div class="fl" style="margin-bottom:clamp(16px,3vh,28px);position:relative">
        <div style="font-size:8px;color:rgba(212,175,55,0.35);font-family:'DM Mono',monospace;margin-bottom:8px;letter-spacing:0.1em">Ref. ${p.ref||''}</div>
        <div class="q-text">${p.texto}</div>
        ${_portalGetAclaracion(p.id) ? `<div style="margin-top:12px;padding:10px 14px;background:rgba(212,175,55,0.04);border-left:2px solid rgba(212,175,55,0.2);border-radius:0 4px 4px 0;font-size:12px;font-style:italic;color:rgba(255,255,255,0.35);line-height:1.7;font-family:'Manrope',sans-serif">${_portalGetAclaracion(p.id)}</div>` : ''}
      </div>

      <!-- Opciones de escala, canales o reflexiva -->
      <div class="fl" style="margin-bottom:clamp(16px,3vh,28px)">
        ${isReflexiva ? `
          <div style="border:1px solid rgba(212,175,55,0.2);border-radius:6px;overflow:hidden;background:rgba(212,175,55,0.02)">
            <div style="padding:8px 14px;font-size:8px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(212,175,55,0.5);border-bottom:1px solid rgba(212,175,55,0.1);font-family:'DM Mono',monospace">Tu respuesta</div>
            <textarea id="portal-resp-${p.id}" placeholder="Contanos con libertad, no hay respuestas correctas o incorrectas..." rows="5"
              style="width:100%;background:transparent;border:none;padding:14px;color:rgba(255,255,255,0.7);font-size:13px;font-family:'Manrope',sans-serif;resize:none;outline:none;line-height:1.75"
              oninput="_portalGuardarRespReflexiva('${p.id}',this.value)">${respActual||''}</textarea>
          </div>
        ` : isCanal ? `
          <div class="ch-grid">
            ${canales.map(([icon,nombre])=>`
              <div class="ch-item ${respActual===nombre?'on':''}" onclick="_portalSelPregunta('${p.id}','${nombre}',this)">
                <span>${icon} ${nombre}</span>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="q-opts">
            ${escala.map(e=>`
              <div class="q-o ${respActual===e.v?'on':''}" onclick="_portalSelPregunta('${p.id}',${e.v},this)">
                <span class="q-o-n">${e.n}</span>
                <span class="q-o-l">${e.l}</span>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- Campo de notas (solo si no es reflexiva — las reflexivas ya tienen textarea) -->
      ${!isReflexiva ? `
      <div class="fl" style="margin-bottom:clamp(20px,4vh,32px)">
        <div style="border:1px solid rgba(212,175,55,0.12);border-radius:6px;overflow:hidden">
          <div style="padding:7px 14px;font-size:8px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(212,175,55,0.35);border-bottom:1px solid rgba(212,175,55,0.08);font-family:'DM Mono',monospace">Nota o aclaración (opcional)</div>
          <textarea id="portal-nota-${p.id}" placeholder="Contexto, excepción o detalle que quieras agregar..." rows="2"
            style="width:100%;background:transparent;border:none;padding:10px 14px;color:rgba(255,255,255,0.5);font-size:12px;font-family:'Manrope',sans-serif;resize:none;outline:none;line-height:1.6"
            oninput="_portalGuardarNota('${p.id}',this.value)">${notaActual}</textarea>
        </div>
      </div>` : ''}

      <!-- Navegación -->
      <div class="fl q-nav">
        <button class="btn" onclick="_portalPregAnterior()" ${isFirst?'style="opacity:0.25;pointer-events:none"':''}>← Anterior</button>
        <div style="font-size:9px;color:rgba(255,255,255,0.15);font-family:'DM Mono',monospace">${pregGlobal+1} / ${totalPregs}</div>
        ${isLast
          ? `<button class="btn btn-c" onclick="_portalPregSiguiente()">Finalizar →</button>`
          : `<button class="btn btn-c" onclick="_portalPregSiguiente()">Siguiente →</button>`
        }
      </div>
    </div>`;

  requestAnimationFrame(()=>scene.querySelectorAll('.fl').forEach((el,i)=>setTimeout(()=>el.classList.add('in'),60+i*60)));
}

function _portalGetAclaracion(pregId){
  const A = {
  'D1Q1':'Un plan comercial documentado incluye objetivos anuales de venta, indicadores de seguimiento (KPIs) y responsables definidos. No alcanza con tenerlo en la cabeza.',
  'D1Q2':'Una estructura clara implica que cada persona del equipo sabe exactamente qué hace, a quién reporta y qué se espera de ella. Ayuda a escalar sin caos.',
  'D1Q3':'Se refiere a si existe una persona con rol formal de gestión comercial — puede ser el dueño, un gerente o un coordinador — con responsabilidades escritas.',
  'D1Q4':'El proceso de ventas documenta cada paso desde el primer contacto hasta el cierre: etapas, criterios para avanzar y quién hace qué. Evita que cada vendedor haga las cosas a su manera.',
  'D1Q5':'Una revisión de pipeline es una reunión donde el equipo revisa el estado de cada oportunidad activa. Lo ideal es hacerlo al menos una vez por semana.',
  'D1Q6':'Gestionar los canales de venta significa saber cuánto vende cada canal (presencial, digital, referidos, etc.) y tomar decisiones basadas en esos datos.',
  'D2Q1':'La misión es el por qué de la empresa, la visión es hacia dónde va, y los valores son los principios que guían las decisiones. Si el equipo no los conoce, no pueden aplicarlos.',
  'D2Q2':'La revisión estratégica anual es un espacio formal donde la dirección evalúa resultados del año, ajusta la estrategia y define prioridades. Debe quedar documentada.',
  'D2Q3':'El presupuesto comercial es la proyección de ingresos, gastos de ventas y marketing del período. Monitorearlo implica comparar lo planeado con lo ejecutado regularmente.',
  'D2Q4':'El código de conducta comercial establece qué está y qué no está permitido en la relación con clientes: descuentos, promesas, negociaciones, etc.',
  'D2Q5':'Los materiales comerciales (cotizaciones, folletos, presentaciones) deben reflejar exactamente lo que la empresa puede cumplir. Prometer más de lo que se entrega daña la reputación.',
  'D3Q1':'El perfil de cargo describe las responsabilidades, conocimientos y competencias que se esperan de cada puesto. Debe estar actualizado, no ser un documento de hace 5 años.',
  'D3Q2':'Un proceso de selección con criterios definidos reduce la chance de contratar a alguien que no encaja. Incluye preguntas técnicas, situacionales y evaluación de valores.',
  'D3Q3':'La inducción es el período de incorporación de un vendedor nuevo. Si está documentada y tiene verificación de comprensión, el vendedor llega antes a su velocidad de crucero.',
  'D3Q4':'El plan de capacitación define qué va a aprender el equipo durante el año (productos, técnicas de venta, herramientas) y cómo se va a medir el aprendizaje.',
  'D3Q5':'Evaluar el desempeño solo por resultados (ventas cerradas) no alcanza. También importa cómo se hacen las cosas: seguimiento, registro en CRM, calidad de la relación con el cliente.',
  'D4Q1':'La propuesta de valor explica por qué un cliente debería elegirte a vos en lugar de la competencia. Si el equipo la conoce, la puede comunicar de manera consistente.',
  'D4Q2':'Los materiales de apoyo (presentaciones, casos de éxito, brochures) deben estar actualizados y alineados con lo que la empresa ofrece hoy, no con lo que ofrecía hace dos años.',
  'D4Q3':'El onboarding de clientes nuevos es el proceso que ocurre después de cerrar una venta: presentaciones, definición de expectativas, primeros pasos. Un buen onboarding retiene clientes.',
  'D4Q4':'Un proceso de reclamos con registro y trazabilidad permite saber cuántos reclamos hay, de qué tipo, cuánto tardan en resolverse y si los problemas se repiten.',
  'D4Q5':'El seguimiento post-venta es el contacto que se mantiene con el cliente después de que la venta cerró. Ayuda a detectar problemas, generar referidos y preparar la renovación.',
  'D5Q1':'El CRM (Customer Relationship Management) es el sistema donde se registran los clientes, contactos, oportunidades y actividades comerciales. Si no lo usa el 90% del equipo, no sirve.',
  'D5Q2':'El pipeline en el CRM muestra en qué etapa está cada oportunidad de venta y qué probabilidad tiene de cerrarse. Es la base para hacer proyecciones de ventas.',
  'D5Q3':'Cuando el CRM está integrado con email y calendario, las actividades de ventas se registran automáticamente. Reduce el trabajo manual y mejora la calidad del dato.',
  'D5Q4':'La política de uso de herramientas digitales define qué sistemas usa el equipo, cómo los usa y qué información se carga en cada uno. Evita que cada persona trabaje a su manera.',
  'D6Q1':'El manual de identidad visual define los colores, tipografías y estilo de la marca. Si no existe o no se aplica, la empresa aparece distinta en cada medio y pierde profesionalismo.',
  'D6Q2':'La presencia digital activa implica que el sitio web está actualizado, las redes sociales tienen actividad regular y el contenido es coherente con la marca.',
  'D6Q3':'El proceso de aprobación de materiales evita que salgan comunicaciones con errores, precios incorrectos o mensajes que no representan a la empresa.',
  'D6Q4':'La gestión de reputación online implica monitorear lo que se dice de la empresa en Google, redes sociales y plataformas de reseñas, y tener un protocolo de respuesta.'
  };
  return A[pregId] || '';
}


function _portalSelPregunta(pregId, valor, el){
  let diag = getPortalDiagnostico();
  const portal = S.get('portal_diagnostico')||[];
  if(!diag){ diag={id:S.nextId('portal_diagnostico'),clienteId:currentUser.clienteId,respuestas:{},completo:false,fechaInicio:todayStr()}; portal.push(diag); }
  diag.respuestas[pregId] = valor;
  const idx = portal.findIndex(d=>d.clienteId===currentUser.clienteId);
  if(idx>-1) portal[idx]=diag; else portal.push(diag);
  S.set('portal_diagnostico', portal);

  // Visual
  const isCanal = typeof valor === 'string';
  const container = el.parentElement;
  if(isCanal){
    container.querySelectorAll('.ch-item').forEach(c=>c.classList.remove('on'));
    el.classList.add('on');
  } else {
    container.querySelectorAll('.q-o').forEach(o=>{
      const n = parseInt(o.querySelector('.q-o-n')?.textContent);
      o.classList.toggle('on', n===valor);
    });
  }
}

function _portalGuardarRespReflexiva(pregId, texto){
  // Guarda respuesta de pregunta reflexiva directamente en respuestas
  let diag = getPortalDiagnostico();
  const portal = S.get('portal_diagnostico')||[];
  if(!diag){ diag={id:S.nextId('portal_diagnostico'),clienteId:currentUser.clienteId,respuestas:{},completo:false,fechaInicio:todayStr()}; portal.push(diag); }
  diag.respuestas[pregId] = texto;
  const idx = portal.findIndex(d=>d.clienteId===currentUser.clienteId);
  if(idx>-1) portal[idx]=diag; else portal.push(diag);
  S.set('portal_diagnostico', portal);
}

function _portalGuardarNota(pregId, texto){
  let diag = getPortalDiagnostico();
  const portal = S.get('portal_diagnostico')||[];
  if(!diag){ diag={id:S.nextId('portal_diagnostico'),clienteId:currentUser.clienteId,respuestas:{},completo:false,fechaInicio:todayStr()}; portal.push(diag); }
  if(!diag.notasPreguntas) diag.notasPreguntas = {};
  diag.notasPreguntas[pregId] = texto;
  const idx = portal.findIndex(d=>d.clienteId===currentUser.clienteId);
  if(idx>-1) portal[idx]=diag; else portal.push(diag);
  S.set('portal_diagnostico', portal);
}

function _portalPregAnterior(){
  if(_portalPregActual > 0){
    _portalPregActual--;
  } else if(_portalDimActual > 0){
    _portalDimActual--;
    _portalPregActual = BPC_DIMENSIONES[_portalDimActual].preguntas.length - 1;
  } else {
    _portalFase = 'intro';
  }
  _portalClienteRender();
}

function _portalPregSiguiente(){
  const scene = document.getElementById('s-cliente-diag');
  if(scene){
    const notaEl = scene.querySelector(`#portal-nota-${BPC_DIMENSIONES[_portalDimActual].preguntas[_portalPregActual]?.id}`);
    if(notaEl && notaEl.value) _portalGuardarNota(BPC_DIMENSIONES[_portalDimActual].preguntas[_portalPregActual].id, notaEl.value);
  }
  const dim = BPC_DIMENSIONES[_portalDimActual];
  if(_portalPregActual < dim.preguntas.length - 1){
    _portalPregActual++;
  } else {
    _portalDimActual++;
    _portalPregActual = 0;
    if(_portalDimActual >= BPC_DIMENSIONES.length){
      _portalFase = 'cierre';
    }
  }
  _portalClienteRender();
}






// ════════════════════════════════════════════════════════════════════════════════
// MÓDULO DE PERFIL SITUACIONAL — 13 PREGUNTAS
// El momento real de la empresa. Diseño tope de gama.
// ════════════════════════════════════════════════════════════════════════════════

const PERFIL_BLOQUES = [
  {
    id: 'pulso',
    titulo: 'El pulso actual',
    subtitulo: 'Ventas, momentum y energía del negocio',
    numero: 'I',
    preguntas: [
      {
        id: 'P1',
        texto: '¿Cómo describirías la trayectoria de ventas de los últimos seis meses?',
        opciones: [
          { v: 'crecimiento', l: 'Creciendo', d: 'Los resultados mejoran mes a mes de forma sostenida' },
          { v: 'estable_alto', l: 'Estables en buen nivel', d: 'Buenos resultados, sin variación significativa' },
          { v: 'estable_bajo', l: 'Estables pero bajos', d: 'Sin caída pero lejos de lo esperado' },
          { v: 'caida', l: 'En descenso', d: 'Los resultados son menores que hace seis meses' },
        ]
      },
      {
        id: 'P2',
        texto: '¿Cuál es la sensación dominante en el equipo comercial en este momento?',
        opciones: [
          { v: 'motivado', l: 'Motivado y enfocado', d: 'El equipo está comprometido y con energía' },
          { v: 'cansado', l: 'Cansado o saturado', d: 'Hay desgaste visible, mucha presión acumulada' },
          { v: 'desmotivado', l: 'Desmotivado o indiferente', d: 'Falta de compromiso o entusiasmo notorio' },
          { v: 'inestable', l: 'Inestable o en transición', d: 'Cambios recientes afectaron la dinámica del grupo' },
        ]
      },
      {
        id: 'P3',
        texto: '¿Con qué frecuencia aparecen oportunidades de venta genuinas — sin que el equipo las salga a buscar activamente?',
        opciones: [
          { v: 'muy_frecuente', l: 'Con mucha frecuencia', d: 'Referidos, inbound y recomendaciones son constantes' },
          { v: 'moderado', l: 'Con cierta regularidad', d: 'Aparecen, pero no es la fuente principal' },
          { v: 'poco', l: 'Muy pocas veces', d: 'Casi todo depende de la prospección activa del equipo' },
          { v: 'nunca', l: 'No ocurre', d: 'Toda oportunidad requiere esfuerzo proactivo del equipo' },
        ]
      },
    ]
  },
  {
    id: 'liderazgo',
    titulo: 'El liderazgo comercial',
    subtitulo: 'La dirección, el foco y la capacidad de delegar',
    numero: 'II',
    preguntas: [
      {
        id: 'P4',
        texto: '¿Cuánto tiempo dedica usted personalmente a la gestión comercial del negocio cada semana?',
        opciones: [
          { v: 'mucho', l: 'La mayor parte de mi tiempo', d: 'El área comercial es mi principal foco hoy' },
          { v: 'moderado', l: 'Tiempo moderado y balanceado', d: 'Me involucro sin que sea lo único que hago' },
          { v: 'poco', l: 'Muy poco — hay demasiadas otras cosas', d: 'La operación me consume y lo comercial queda relegado' },
          { v: 'delegado', l: 'Lo tengo delegado en otro', d: 'Hay alguien a cargo y confío en esa persona' },
        ]
      },
      {
        id: 'P5',
        texto: '¿Cómo se toman hoy las decisiones comerciales importantes — precios, descuentos, propuestas, condiciones?',
        opciones: [
          { v: 'proceso', l: 'Hay un proceso claro y criterios definidos', d: 'El equipo sabe cómo proceder sin consultar siempre' },
          { v: 'yo_siempre', l: 'Las tomo yo en todos los casos', d: 'Paso por mí o no avanzan' },
          { v: 'caso_a_caso', l: 'Caso por caso, sin criterio uniforme', d: 'Cada situación se resuelve de forma diferente' },
          { v: 'caos', l: 'Con poca coordinación — cada uno hace lo suyo', d: 'Falta alineación entre quienes toman decisiones' },
        ]
      },
      {
        id: 'P6',
        texto: '¿Cuál de estas frases describe mejor dónde está usted hoy como líder del área comercial?',
        opciones: [
          { v: 'estrategia', l: 'Trabajando en la estrategia, no en la operación', d: 'Puedo pensar el negocio con perspectiva' },
          { v: 'apagar_fuegos', l: 'Apagando fuegos y resolviendo urgencias', d: 'Poco tiempo para pensar — mucho para reaccionar' },
          { v: 'vendiendo', l: 'Vendiendo yo mismo porque el equipo no alcanza', d: 'Sigo siendo el principal generador de ingresos' },
          { v: 'perdido', l: 'Buscando el camino — muchas dudas', d: 'El rumbo no está del todo claro en este momento' },
        ]
      },
    ]
  },
  {
    id: 'equipo',
    titulo: 'El equipo',
    subtitulo: 'Composición, estabilidad y desempeño del equipo comercial',
    numero: 'III',
    preguntas: [
      {
        id: 'P7',
        texto: '¿Cómo fue la rotación de vendedores en el último año?',
        opciones: [
          { v: 'estable', l: 'Muy baja — el equipo es estable', d: 'Casi sin salidas ni incorporaciones recientes' },
          { v: 'normal', l: 'Normal — algún movimiento esperado', d: 'Una o dos incorporaciones o salidas sin impacto importante' },
          { v: 'alta', l: 'Alta — hubo varios cambios', d: 'El equipo tuvo transformaciones significativas' },
          { v: 'caos_rrhh', l: 'Muy alta — el equipo está en construcción', d: 'Estamos armando el equipo prácticamente desde cero' },
        ]
      },
      {
        id: 'P8',
        texto: '¿Cuántos integrantes del equipo comercial considera que están en su mejor nivel de desempeño?',
        opciones: [
          { v: 'todos', l: 'La mayoría o todos', d: 'El equipo está rindiendo bien en términos generales' },
          { v: 'mitad', l: 'La mitad aproximadamente', d: 'Algunos están bien, otros claramente no' },
          { v: 'pocos', l: 'Solo uno o dos', d: 'Hay dependencia en personas muy puntuales' },
          { v: 'ninguno', l: 'Ninguno está en su nivel', d: 'El desempeño general está por debajo de las expectativas' },
        ]
      },
      {
        id: 'P9',
        texto: '¿El equipo comercial tiene claridad sobre qué se espera de ellos en términos de resultados y comportamiento?',
        opciones: [
          { v: 'total', l: 'Total claridad — hay objetivos y criterios definidos', d: 'Saben exactamente qué se mide y qué se espera' },
          { v: 'parcial', l: 'Parcial — algunos entienden, otros no', d: 'La comunicación de expectativas no es uniforme' },
          { v: 'vaga', l: 'Expectativas vagas o no comunicadas formalmente', d: 'Se asume que lo saben, pero no se explicita' },
          { v: 'ninguna', l: 'Sin claridad — cada uno interpreta a su manera', d: 'Falta definición y comunicación de estándares' },
        ]
      },
    ]
  },
  {
    id: 'vision',
    titulo: 'La visión',
    subtitulo: 'El horizonte, las prioridades y la claridad estratégica',
    numero: 'IV',
    preguntas: [
      {
        id: 'P10',
        texto: '¿Cómo describiría el momento de la empresa en términos de estructura organizacional?',
        opciones: [
          { v: 'ordenada', l: 'Estructurada y con roles claros', d: 'Cada función está definida y hay procesos establecidos' },
          { v: 'creciendo', l: 'Creciendo y adaptando la estructura', d: 'Hay cambios en curso, se está profesionalizando' },
          { v: 'informal', l: 'Informal — todo depende de las personas', d: 'Funciona por la experiencia de cada uno, no por procesos' },
          { v: 'reestructurando', l: 'En reestructuración o cambio profundo', d: 'Hay un proceso de reorganización en marcha' },
        ]
      },
      {
        id: 'P11',
        texto: '¿Cuál es la principal preocupación comercial que ocupa su cabeza en este momento?',
        opciones: [
          { v: 'volumen', l: 'No generar suficiente volumen de ventas', d: 'El número de oportunidades o cierres es insuficiente' },
          { v: 'rentabilidad', l: 'Vender sin margen — precios bajos o descuentos excesivos', d: 'Se vende pero la rentabilidad no acompaña' },
          { v: 'gente', l: 'La calidad o estabilidad del equipo', d: 'El factor humano es el principal riesgo hoy' },
          { v: 'procesos', l: 'La falta de procesos y organización interna', d: 'El desorden interno limita el crecimiento' },
        ]
      },
      {
        id: 'P12',
        texto: '¿Cuándo piensa en los próximos 12 meses de su empresa, cuál es el sentimiento predominante?',
        opciones: [
          { v: 'optimismo', l: 'Optimismo claro — hay un plan y confianza en él', d: 'Sé hacia dónde voy y cómo llegar' },
          { v: 'esperanza', l: 'Esperanza con incertidumbre', d: 'Quiero que mejore, pero no tengo todo claro' },
          { v: 'preocupacion', l: 'Preocupación real — hay cosas que resolver urgente', d: 'Hay problemas que me generan tensión genuina' },
          { v: 'bloqueo', l: 'Sensación de estar trabado sin saber por dónde empezar', d: 'Hay voluntad de cambiar pero no claridad de cómo' },
        ]
      },
      {
        id: 'P13',
        texto: '¿Qué lo llevó a iniciar este proceso de auditoría BPC:2026 en este momento?',
        opciones: [
          { v: 'crecer', l: 'Quiero crecer y necesito una base sólida', d: 'El negocio va bien y quiero ir al siguiente nivel' },
          { v: 'ordenar', l: 'Necesito ordenar lo que ya tenemos', d: 'Hay crecimiento pero también desorden que hay que resolver' },
          { v: 'revertir', l: 'Los resultados cayeron y necesito entender por qué', d: 'Hubo un deterioro que quiero diagnosticar y revertir' },
          { v: 'cambiar', l: 'Quiero cambiar el rumbo — lo que hacíamos no funciona', d: 'Es momento de replantear el modelo o el equipo comercial' },
        ]
      },
    ]
  },
];

// Lógica de recomendación de examen basada en respuestas del perfil
function _perfilRecomendarExamen(resps){
  let scores = { vendedor:0, gerente:0, dueno:0, dueno_comercial:0, recuperacion:0 };

  // P1 — trayectoria ventas
  if(resps.P1==='crecimiento') scores.dueno+=2;
  if(resps.P1==='estable_alto') { scores.dueno+=1; scores.gerente+=1; }
  if(resps.P1==='estable_bajo') { scores.dueno_comercial+=2; scores.recuperacion+=1; }
  if(resps.P1==='caida') { scores.recuperacion+=3; scores.dueno_comercial+=1; }

  // P2 — sensación equipo
  if(resps.P2==='motivado') scores.vendedor+=2;
  if(resps.P2==='cansado') { scores.dueno_comercial+=2; scores.recuperacion+=1; }
  if(resps.P2==='desmotivado') { scores.recuperacion+=3; scores.dueno_comercial+=1; }
  if(resps.P2==='inestable') { scores.gerente+=2; scores.dueno+=1; }

  // P3 — oportunidades inbound
  if(resps.P3==='muy_frecuente') scores.dueno+=1;
  if(resps.P3==='poco'||resps.P3==='nunca') { scores.vendedor+=2; scores.dueno_comercial+=1; }

  // P4 — tiempo dedicado
  if(resps.P4==='mucho'||resps.P4==='vendiendo') { scores.dueno_comercial+=2; scores.recuperacion+=1; }
  if(resps.P4==='moderado') scores.dueno+=2;
  if(resps.P4==='poco') { scores.recuperacion+=2; scores.dueno_comercial+=1; }
  if(resps.P4==='delegado') { scores.gerente+=3; scores.dueno+=1; }

  // P5 — decisiones comerciales
  if(resps.P5==='proceso') { scores.gerente+=2; scores.dueno+=1; }
  if(resps.P5==='yo_siempre') { scores.dueno_comercial+=2; scores.recuperacion+=1; }
  if(resps.P5==='caso_a_caso'||resps.P5==='caos') { scores.recuperacion+=2; scores.gerente+=1; }

  // P6 — rol del líder
  if(resps.P6==='estrategia') { scores.dueno+=3; scores.gerente+=1; }
  if(resps.P6==='apagar_fuegos') { scores.recuperacion+=2; scores.dueno_comercial+=2; }
  if(resps.P6==='vendiendo') { scores.dueno_comercial+=3; }
  if(resps.P6==='perdido') { scores.recuperacion+=3; }

  // P7 — rotación
  if(resps.P7==='estable') scores.vendedor+=2;
  if(resps.P7==='alta'||resps.P7==='caos_rrhh') { scores.gerente+=2; scores.dueno+=1; }

  // P8 — desempeño equipo
  if(resps.P8==='todos') scores.vendedor+=2;
  if(resps.P8==='pocos'||resps.P8==='ninguno') { scores.recuperacion+=2; scores.dueno_comercial+=1; }

  // P9 — claridad de expectativas
  if(resps.P9==='total') { scores.vendedor+=1; scores.gerente+=1; }
  if(resps.P9==='ninguna'||resps.P9==='vaga') { scores.gerente+=2; scores.recuperacion+=1; }

  // P10 — estructura
  if(resps.P10==='ordenada') { scores.dueno+=2; scores.gerente+=1; }
  if(resps.P10==='reestructurando') { scores.gerente+=3; scores.dueno+=1; }
  if(resps.P10==='informal') { scores.dueno_comercial+=2; scores.recuperacion+=1; }

  // P11 — preocupación principal
  if(resps.P11==='volumen') { scores.vendedor+=2; scores.dueno_comercial+=2; }
  if(resps.P11==='rentabilidad') { scores.dueno+=2; scores.dueno_comercial+=1; }
  if(resps.P11==='gente') { scores.gerente+=3; }
  if(resps.P11==='procesos') { scores.recuperacion+=2; scores.gerente+=1; }

  // P12 — visión próximos 12 meses
  if(resps.P12==='optimismo') { scores.dueno+=2; scores.gerente+=1; }
  if(resps.P12==='esperanza') { scores.dueno_comercial+=2; }
  if(resps.P12==='preocupacion') { scores.recuperacion+=2; scores.dueno_comercial+=1; }
  if(resps.P12==='bloqueo') { scores.recuperacion+=3; }

  // P13 — motivación para iniciar
  if(resps.P13==='crecer') { scores.dueno+=3; }
  if(resps.P13==='ordenar') { scores.gerente+=2; scores.dueno+=1; }
  if(resps.P13==='revertir') { scores.recuperacion+=3; scores.dueno_comercial+=1; }
  if(resps.P13==='cambiar') { scores.dueno_comercial+=2; scores.recuperacion+=2; }

  // Determinar el examen recomendado
  const max = Object.entries(scores).sort((a,b)=>b[1]-a[1])[0][0];
  const examenMap = Object.fromEntries(EXAMENES_CATALOG.map(e=>[e.id,e]));
  return { scores, examen: examenMap[max], situacion: max };
}

// Descripción de la situación detectada
function _perfilDescribirSituacion(situacion, resps){
  const sitMap = {
    crecimiento: {
      titulo: 'Empresa en crecimiento',
      icono: '🚀',
      color: '#4ade80',
      descripcion: 'Los indicadores apuntan a una empresa con momentum positivo. El desafío en esta etapa no es vender más — es construir la estructura que soporte el crecimiento sin que la calidad se deteriore.',
    },
    gerente: {
      titulo: 'Empresa con desafíos de liderazgo intermedio',
      icono: '🔄',
      color: '#60a5fa',
      descripcion: 'El negocio tiene bases pero la gestión del equipo y los procesos de decisión necesitan profesionalizarse. El foco debe estar en el liderazgo comercial y la estructura de gestión.',
    },
    dueno: {
      titulo: 'Empresa con foco en la dirección estratégica',
      icono: '🎯',
      color: '#c8a84a',
      descripcion: 'El negocio está estable y el dueño puede pensar con perspectiva. Es el momento de construir un sistema comercial que funcione con menos dependencia personal.',
    },
    dueno_comercial: {
      titulo: 'Dueño con alta dependencia operativa',
      icono: '⚡',
      color: '#f59e0b',
      descripcion: 'El dueño es el motor comercial del negocio. Esto limita el crecimiento y genera riesgo de desgaste. La prioridad es entender esa dependencia y construir el camino hacia la delegación.',
    },
    recuperacion: {
      titulo: 'Empresa en proceso de recuperación',
      icono: '🌊',
      color: '#ef4444',
      descripcion: 'Los indicadores sugieren una empresa que atravesó o atraviesa un período difícil. El diagnóstico profundo es el primer paso para identificar causas reales y construir un plan de recuperación con base en evidencia.',
    },
  };
  return sitMap[situacion] || sitMap['dueno'];
}

// ── RENDER DEL MÓDULO DE PERFIL ──────────────────────────────────────────────
function _portalRenderPerfil(scene){
  if(!scene || !scene.isConnected) return;

  const portal = document.getElementById('__bpc_portal_main__');
  const tema = portal?.dataset.tema || 'dark';
  const isDark = tema !== 'light' && tema !== 'warm';
  const isWarm = tema === 'warm';

  // CSS del módulo perfil — insertar una sola vez
  if(!document.getElementById('_perfil_css')){
    const st = document.createElement('style');
    st.id = '_perfil_css';
    st.textContent = `
      /* ── Variables por tema ── */
      #__bpc_portal_main__[data-tema="dark"]  .pf, #__bpc_portal_main__:not([data-tema]) .pf {
        --pf-bg: #0a0b0c; --pf-card: #111213; --pf-card-bdr: rgba(255,255,255,0.07);
        --pf-card-hover: rgba(255,255,255,0.04); --pf-text: rgba(255,255,255,0.92);
        --pf-text2: rgba(255,255,255,0.5); --pf-text3: rgba(255,255,255,0.25);
        --pf-gold: #d4af37; --pf-gold2: rgba(212,175,55,0.6); --pf-gold3: rgba(212,175,55,0.15);
        --pf-sel-bg: rgba(212,175,55,0.08); --pf-sel-bdr: #d4af37; --pf-sel-dot: #d4af37;
        --pf-bar: rgba(255,255,255,0.06); --pf-bar-fill: linear-gradient(90deg,#b8922e,#d4af37);
        --pf-btn: rgba(255,255,255,0.06); --pf-btn-bdr: rgba(255,255,255,0.1);
        --pf-btn-txt: rgba(255,255,255,0.7); --pf-bloque-num: rgba(212,175,55,0.15);
        --pf-opt-desc: rgba(255,255,255,0.35); --pf-divider: rgba(255,255,255,0.06);
      }
      #__bpc_portal_main__[data-tema="light"] .pf {
        --pf-bg: #f4f1eb; --pf-card: #ffffff; --pf-card-bdr: rgba(0,0,0,0.08);
        --pf-card-hover: rgba(0,0,0,0.02); --pf-text: rgba(15,10,0,0.92);
        --pf-text2: rgba(15,10,0,0.55); --pf-text3: rgba(15,10,0,0.3);
        --pf-gold: #8a6820; --pf-gold2: rgba(138,104,32,0.7); --pf-gold3: rgba(138,104,32,0.12);
        --pf-sel-bg: rgba(138,104,32,0.07); --pf-sel-bdr: #8a6820; --pf-sel-dot: #8a6820;
        --pf-bar: rgba(0,0,0,0.06); --pf-bar-fill: linear-gradient(90deg,#8a6820,#c8a84a);
        --pf-btn: rgba(0,0,0,0.04); --pf-btn-bdr: rgba(0,0,0,0.12);
        --pf-btn-txt: rgba(15,10,0,0.6); --pf-bloque-num: rgba(138,104,32,0.08);
        --pf-opt-desc: rgba(15,10,0,0.45); --pf-divider: rgba(0,0,0,0.06);
      }
      #__bpc_portal_main__[data-tema="warm"] .pf {
        --pf-bg: #1a1208; --pf-card: #221a08; --pf-card-bdr: rgba(212,175,55,0.1);
        --pf-card-hover: rgba(212,175,55,0.04); --pf-text: rgba(255,245,220,0.95);
        --pf-text2: rgba(255,245,220,0.55); --pf-text3: rgba(255,245,220,0.28);
        --pf-gold: #e8c84a; --pf-gold2: rgba(232,200,74,0.65); --pf-gold3: rgba(232,200,74,0.15);
        --pf-sel-bg: rgba(232,200,74,0.1); --pf-sel-bdr: #e8c84a; --pf-sel-dot: #e8c84a;
        --pf-bar: rgba(212,175,55,0.08); --pf-bar-fill: linear-gradient(90deg,#b8922e,#e8c84a);
        --pf-btn: rgba(212,175,55,0.06); --pf-btn-bdr: rgba(212,175,55,0.15);
        --pf-btn-txt: rgba(255,245,220,0.65); --pf-bloque-num: rgba(232,200,74,0.08);
        --pf-opt-desc: rgba(255,245,220,0.4); --pf-divider: rgba(212,175,55,0.08);
      }

      /* ── Contenedor principal ── */
      .pf { width:100%;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:0;font-family:'Cormorant Garamond',Georgia,serif; }
      .pf-inner { width:100%;max-width:680px;padding:clamp(40px,6vh,80px) clamp(24px,5vw,52px) 80px; }

      /* ── Header del bloque ── */
      .pf-bloque-header { display:flex;align-items:flex-start;gap:24px;margin-bottom:clamp(40px,5vh,64px); }
      .pf-bloque-num { font-family:'Cormorant Garamond',serif;font-size:clamp(56px,8vw,96px);font-weight:300;font-style:italic;line-height:1;color:var(--pf-text3);flex-shrink:0;margin-top:-8px; }
      .pf-bloque-info { flex:1; }
      .pf-bloque-badge { font-family:'Space Mono',monospace;font-size:9px;letter-spacing:0.3em;text-transform:uppercase;color:var(--pf-gold2);margin-bottom:10px; }
      .pf-bloque-titulo { font-family:'Cormorant Garamond',serif;font-size:clamp(28px,4vw,44px);font-weight:300;line-height:1.15;color:var(--pf-text);letter-spacing:-0.02em; }
      .pf-bloque-sub { font-family:'Cormorant Garamond',serif;font-size:clamp(15px,2vw,19px);color:var(--pf-text2);margin-top:6px;font-style:italic; }

      /* ── Barra de progreso ── */
      .pf-progress { margin-bottom:clamp(48px,6vh,72px); }
      .pf-progress-top { display:flex;justify-content:space-between;align-items:center;margin-bottom:10px; }
      .pf-progress-label { font-family:'Space Mono',monospace;font-size:9px;letter-spacing:0.15em;text-transform:uppercase;color:var(--pf-text3); }
      .pf-progress-pct { font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:300;color:var(--pf-gold2); }
      .pf-progress-bar { height:1px;background:var(--pf-bar);position:relative;overflow:hidden; }
      .pf-progress-fill { position:absolute;left:0;top:0;height:100%;background:var(--pf-bar-fill);transition:width 0.5s cubic-bezier(0.4,0,0.2,1); }

      /* ── Pregunta ── */
      .pf-pregunta { margin-bottom:clamp(36px,5vh,56px); }
      .pf-preg-num { font-family:'Space Mono',monospace;font-size:9px;letter-spacing:0.25em;text-transform:uppercase;color:var(--pf-gold2);margin-bottom:16px; }
      .pf-preg-texto { font-family:'Cormorant Garamond',serif;font-size:clamp(22px,3.5vw,34px);font-weight:300;line-height:1.35;color:var(--pf-text);letter-spacing:-0.01em; }

      /* ── Opciones ── */
      .pf-opciones { display:flex;flex-direction:column;gap:10px;margin-bottom:clamp(36px,5vh,56px); }
      .pf-opcion { display:flex;align-items:flex-start;gap:18px;padding:20px 24px;border:1px solid var(--pf-card-bdr);border-radius:6px;cursor:pointer;background:var(--pf-card);transition:all 0.2s cubic-bezier(0.4,0,0.2,1);-webkit-tap-highlight-color:transparent;user-select:none; }
      .pf-opcion:hover { border-color:var(--pf-gold3);background:var(--pf-card-hover); }
      .pf-opcion.sel { border-color:var(--pf-sel-bdr);background:var(--pf-sel-bg); }
      .pf-opcion-dot { width:20px;height:20px;border-radius:50%;border:1.5px solid var(--pf-card-bdr);flex-shrink:0;margin-top:3px;transition:all 0.2s;display:flex;align-items:center;justify-content:center; }
      .pf-opcion.sel .pf-opcion-dot { border-color:var(--pf-sel-dot);background:var(--pf-sel-dot); }
      .pf-opcion.sel .pf-opcion-dot::after { content:'';width:6px;height:6px;border-radius:50%;background:#fff; display:block; }
      .pf-opcion-content { flex:1; }
      .pf-opcion-label { font-family:'Cormorant Garamond',serif;font-size:clamp(17px,2.2vw,22px);font-weight:600;color:var(--pf-text);line-height:1.2;margin-bottom:5px;transition:color 0.2s; }
      .pf-opcion.sel .pf-opcion-label { color:var(--pf-gold); }
      .pf-opcion-desc { font-family:'Cormorant Garamond',serif;font-size:clamp(13px,1.8vw,16px);font-style:italic;color:var(--pf-opt-desc);line-height:1.5;transition:color 0.2s; }
      .pf-opcion.sel .pf-opcion-desc { color:var(--pf-gold2); }

      /* ── Navegación ── */
      .pf-nav { display:flex;justify-content:space-between;align-items:center;padding-top:clamp(20px,3vh,32px);border-top:1px solid var(--pf-divider); }
      .pf-btn-back { font-family:'Space Mono',monospace;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:var(--pf-btn-txt);background:var(--pf-btn);border:1px solid var(--pf-btn-bdr);border-radius:3px;padding:14px 24px;cursor:pointer;transition:all 0.2s; }
      .pf-btn-back:hover { color:var(--pf-text);border-color:var(--pf-card-bdr); }
      .pf-btn-next { font-family:'Space Mono',monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#0a0800;background:linear-gradient(135deg,#c8a84a,#d4af37,#b8922e);border:none;border-radius:3px;padding:16px 36px;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 20px rgba(212,175,55,0.2); }
      .pf-btn-next:hover { box-shadow:0 6px 32px rgba(212,175,55,0.35);transform:translateY(-1px); }
      .pf-btn-next:active { transform:translateY(0); }
      .pf-btn-next:disabled { opacity:0.35;cursor:not-allowed;transform:none;box-shadow:none; }
      .pf-counter { font-family:'Cormorant Garamond',serif;font-size:18px;color:var(--pf-text3);font-style:italic; }

      /* ── Transición de entrada ── */
      @keyframes pfIn { from { opacity:0;transform:translateY(20px); } to { opacity:1;transform:translateY(0); } }
      .pf-anim { animation:pfIn 0.45s cubic-bezier(0.4,0,0.2,1) both; }
      .pf-anim-2 { animation:pfIn 0.45s 0.1s cubic-bezier(0.4,0,0.2,1) both; }
      .pf-anim-3 { animation:pfIn 0.45s 0.2s cubic-bezier(0.4,0,0.2,1) both; }
      .pf-anim-4 { animation:pfIn 0.45s 0.28s cubic-bezier(0.4,0,0.2,1) both; }

      /* ── Pantalla de resultado del perfil ── */
      .pf-resultado { text-align:center;padding:clamp(40px,6vh,72px) clamp(24px,5vw,52px); }
      .pf-res-icono { font-size:clamp(48px,8vw,72px);margin-bottom:24px;animation:pfIn 0.5s both; }
      .pf-res-situacion { font-family:'Space Mono',monospace;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;margin-bottom:20px;animation:pfIn 0.5s 0.1s both; }
      .pf-res-titulo { font-family:'Cormorant Garamond',serif;font-size:clamp(30px,5vw,52px);font-weight:300;line-height:1.2;margin-bottom:20px;color:var(--pf-text);animation:pfIn 0.5s 0.15s both; }
      .pf-res-desc { font-family:'Cormorant Garamond',serif;font-size:clamp(16px,2.2vw,22px);font-style:italic;color:var(--pf-text2);line-height:1.7;max-width:520px;margin:0 auto 40px;animation:pfIn 0.5s 0.2s both; }
      .pf-res-examen { background:var(--pf-card);border:1px solid var(--pf-gold3);border-radius:8px;padding:28px 32px;max-width:520px;margin:0 auto 40px;text-align:left;animation:pfIn 0.5s 0.28s both; }
      .pf-res-examen-label { font-family:'Space Mono',monospace;font-size:9px;letter-spacing:0.25em;text-transform:uppercase;color:var(--pf-gold2);margin-bottom:12px; }
      .pf-res-examen-nombre { font-family:'Cormorant Garamond',serif;font-size:clamp(18px,2.5vw,26px);font-weight:600;color:var(--pf-gold);margin-bottom:8px; }
      .pf-res-examen-desc { font-family:'Cormorant Garamond',serif;font-size:clamp(14px,1.8vw,17px);font-style:italic;color:var(--pf-text2);line-height:1.6; }
      .pf-res-nota { background:var(--pf-gold3);border-radius:6px;padding:20px 24px;max-width:520px;margin:0 auto 40px;font-family:'Cormorant Garamond',serif;font-size:clamp(14px,1.8vw,17px);font-style:italic;color:var(--pf-gold);line-height:1.7;animation:pfIn 0.5s 0.35s both; }
      .pf-res-cta { animation:pfIn 0.5s 0.42s both; }
      .pf-res-cta-btn { font-family:'Space Mono',monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#0a0800;background:linear-gradient(135deg,#c8a84a,#d4af37,#b8922e);border:none;border-radius:3px;padding:18px 44px;cursor:pointer;box-shadow:0 4px 24px rgba(212,175,55,0.25);transition:all 0.2s; }
      .pf-res-cta-btn:hover { box-shadow:0 8px 40px rgba(212,175,55,0.4);transform:translateY(-2px); }

      /* ── Selector de tema ── */
      .pf-tema-selector { position:fixed;top:20px;right:20px;display:flex;gap:8px;z-index:100; }
      .pf-tema-btn { width:32px;height:32px;border-radius:50%;border:2px solid transparent;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;font-size:14px; }
      .pf-tema-btn.activo { border-color:var(--pf-gold); }
      .pf-tema-dark { background:#0a0b0c;box-shadow:0 2px 8px rgba(0,0,0,0.4); }
      .pf-tema-light { background:#f4f1eb;box-shadow:0 2px 8px rgba(0,0,0,0.15); }
      .pf-tema-warm { background:#1a1208;box-shadow:0 2px 8px rgba(0,0,0,0.3); }
    `;
    document.head.appendChild(st);
  }

  // Calcular pregunta global (BPC ya completado = todas sus preguntas)
  const totalBPC = _portalGetTotalPregs();
  const totalPerfil = PERFIL_BLOQUES.reduce((s,b)=>s+b.preguntas.length,0);
  const totalGlobal = totalBPC + totalPerfil;
  const pregGlobalPerfil = totalBPC + _portalPerfilPregActual;
  const pct = Math.round(pregGlobalPerfil / totalGlobal * 100);

  // Encontrar bloque y pregunta actual
  let pregIdx = _portalPerfilPregActual;
  let bloqueActual = null;
  let pregActual = null;
  for(const bloque of PERFIL_BLOQUES){
    if(pregIdx < bloque.preguntas.length){
      bloqueActual = bloque;
      pregActual = bloque.preguntas[pregIdx];
      break;
    }
    pregIdx -= bloque.preguntas.length;
  }

  if(!pregActual){
    // Todas respondidas → mostrar resultado
    _portalRenderPerfilResultado(scene);
    return;
  }

  // Cargar respuesta guardada
  const diag = getPortalDiagnostico();
  const perfilResps = diag?.perfilRespuestas || {};
  const respActual = perfilResps[pregActual.id] || null;
  const esFirst = _portalPerfilPregActual === 0;

  const temaActual = document.getElementById('__bpc_portal_main__')?.dataset.tema || 'dark';

  scene.innerHTML = `
  <div class="pf">
    <!-- Selector de tema -->
    <div class="pf-tema-selector">
      <button class="pf-tema-btn pf-tema-dark ${temaActual==='dark'?'activo':''}"
        onclick="_portalCambiarTema('dark')" title="Tema oscuro">🌑</button>
      <button class="pf-tema-btn pf-tema-warm ${temaActual==='warm'?'activo':''}"
        onclick="_portalCambiarTema('warm')" title="Tema cálido">🔆</button>
      <button class="pf-tema-btn pf-tema-light ${temaActual==='light'?'activo':''}"
        onclick="_portalCambiarTema('light')" title="Tema claro">☀️</button>
    </div>

    <div class="pf-inner">

      <!-- Progreso global -->
      <div class="pf-progress pf-anim">
        <div class="pf-progress-top">
          <span class="pf-progress-label">BPC:2026 — Diagnóstico completo · Perfil situacional</span>
          <span class="pf-progress-pct">${pct}%</span>
        </div>
        <div class="pf-progress-bar">
          <div class="pf-progress-fill" style="width:${pct}%"></div>
        </div>
      </div>

      <!-- Header del bloque -->
      <div class="pf-bloque-header pf-anim-2">
        <div class="pf-bloque-num">${bloqueActual.numero}</div>
        <div class="pf-bloque-info">
          <div class="pf-bloque-badge">${bloqueActual.subtitulo}</div>
          <div class="pf-bloque-titulo">${bloqueActual.titulo}</div>
        </div>
      </div>

      <!-- Pregunta -->
      <div class="pf-pregunta pf-anim-3">
        <div class="pf-preg-num">Pregunta ${_portalPerfilPregActual + 1} de ${totalPerfil}</div>
        <div class="pf-preg-texto">${pregActual.texto}</div>
      </div>

      <!-- Opciones -->
      <div class="pf-opciones pf-anim-4">
        ${pregActual.opciones.map(op=>`
          <div class="pf-opcion ${respActual===op.v?'sel':''}"
            onclick="_portalSelPerfil('${pregActual.id}','${op.v}',this)">
            <div class="pf-opcion-dot"></div>
            <div class="pf-opcion-content">
              <div class="pf-opcion-label">${op.l}</div>
              <div class="pf-opcion-desc">${op.d}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Navegación -->
      <div class="pf-nav pf-anim-4">
        <button class="pf-btn-back" onclick="_portalPerfilAnterior()"
          ${esFirst?'style="opacity:0.3;pointer-events:none"':''}>← Anterior</button>
        <span class="pf-counter">${_portalPerfilPregActual + 1} / ${totalPerfil}</span>
        <button class="pf-btn-next" id="pf-btn-sig"
          onclick="_portalPerfilSiguiente()"
          ${!respActual?'disabled':''}>
          ${_portalPerfilPregActual === totalPerfil - 1 ? 'Ver mi diagnóstico →' : 'Siguiente →'}
        </button>
      </div>

    </div>
  </div>`;
}

// Seleccionar opción en el perfil
function _portalSelPerfil(pregId, valor, el){
  // Guardar
  let diag = getPortalDiagnostico();
  const pd = S.get('portal_diagnostico')||[];
  if(!diag){ diag={id:S.nextId('portal_diagnostico'),clienteId:currentUser.clienteId,respuestas:{},completo:false,fechaInicio:todayStr()}; pd.push(diag); }
  if(!diag.perfilRespuestas) diag.perfilRespuestas = {};
  diag.perfilRespuestas[pregId] = valor;
  const idx = pd.findIndex(d=>d.clienteId===currentUser.clienteId);
  if(idx>-1) pd[idx]=diag; else pd.push(diag);
  S.set('portal_diagnostico', pd);

  // UI — marcar seleccionada
  el.closest('.pf-opciones').querySelectorAll('.pf-opcion').forEach(o=>o.classList.remove('sel'));
  el.classList.add('sel');

  // Habilitar botón siguiente
  const btn = document.getElementById('pf-btn-sig');
  if(btn) btn.removeAttribute('disabled');
}

function _portalPerfilSiguiente(){
  const totalPerfil = PERFIL_BLOQUES.reduce((s,b)=>s+b.preguntas.length,0);
  _portalPerfilPregActual++;
  if(_portalPerfilPregActual >= totalPerfil){
    const scene = document.getElementById('s-cliente-diag');
    _portalRenderPerfilResultado(scene);
  } else {
    _portalClienteRender();
  }
}

function _portalPerfilAnterior(){
  if(_portalPerfilPregActual === 0){
    // Volver al cierre del BPC
    _portalFase = 'cierre';
    _portalClienteRender();
  } else {
    _portalPerfilPregActual--;
    _portalClienteRender();
  }
}

// Cambiar tema desde el módulo perfil
function _portalCambiarTema(tema){
  const portal = document.getElementById('__bpc_portal_main__');
  if(!portal) return;
  portal.dataset.tema = tema;
  const bgMap = { dark:'#0a0b0c', light:'#f4f1eb', warm:'#1a1208' };
  portal.style.background = bgMap[tema] || '#0a0b0c';
  // Re-renderizar
  const scene = document.getElementById('s-cliente-diag');
  if(scene && scene.classList.contains('on')){
    if(_portalFase==='perfil') _portalRenderPerfil(scene);
    else _portalClienteRender();
  }
}

// Pantalla de resultado del perfil situacional
function _portalRenderPerfilResultado(scene){
  if(!scene) return;
  const diag = getPortalDiagnostico();
  const resps = diag?.perfilRespuestas || {};
  const { scores, examen, situacion } = _perfilRecomendarExamen(resps);
  const sit = _perfilDescribirSituacion(situacion, resps);

  // Guardar recomendación en el diagnóstico
  const pd = S.get('portal_diagnostico')||[];
  if(diag){
    diag.perfilSituacion = situacion;
    diag.perfilExamenRecomendado = examen?.id || '';
    const idx = pd.findIndex(d=>d.clienteId===currentUser.clienteId);
    if(idx>-1) pd[idx]=diag; else pd.push(diag);
    S.set('portal_diagnostico', pd);
    sbFetch('portal_diagnostico','PATCH',{
      perfilSituacion: situacion,
      perfilExamenRecomendado: examen?.id||''
    },'?clienteId=eq.'+currentUser.clienteId).catch(()=>{});
  }

  // Notificar al sistema para que Leandro apruebe el examen
  _portalRegistrarAccion('perfil_completado', {
    label: 'Módulo de perfil situacional completado',
    detalle: 'Situación detectada: '+sit.titulo+'\nExamen recomendado: '+examen?.label+'\nPendiente de aprobación antes de enviar.',
    pasoMapa: 'Perfil Situacional',
  });

  // Crear acción del agente pendiente de aprobación
  const cli = (S.get('clientes')||[]).find(c=>String(c.id)===String(currentUser?.clienteId));
  if(cli){
    const audActiva = (S.get('auditorias')||[]).find(a=>String(a.clienteId)===String(currentUser?.clienteId));
    agenteEncolarAccion('Examen recomendado para '+cli.nombre+' — aprobación requerida', {
      destinatario: 'leandro@metogroup.com.ar',
      clienteNombre: cli.nombre,
      auditoriaId: audActiva?.id||null,
      tipo: 'decision',
      detalle: 'Situación detectada: '+sit.titulo+'. Examen recomendado: '+examen?.label+'. Pendiente tu aprobación para enviar el link al cliente.',
      html_preview: 'Perfil completado — '+cli.nombre+' · Situación: '+sit.titulo,
      _payload: {
        from_name: 'Hernán Quiroz',
        to: cli.email||'',
        subject: '📋 Examen recomendado para '+cli.nombre,
        html: '',
        text: 'Situación: '+sit.titulo+'. Examen: '+examen?.label
      }
    }).catch(()=>{});
  }

  const temaActual = document.getElementById('__bpc_portal_main__')?.dataset.tema || 'dark';

  scene.innerHTML = `
  <div class="pf">
    <div class="pf-tema-selector">
      <button class="pf-tema-btn pf-tema-dark ${temaActual==='dark'?'activo':''}"
        onclick="_portalCambiarTema('dark')" title="Tema oscuro">🌑</button>
      <button class="pf-tema-btn pf-tema-warm ${temaActual==='warm'?'activo':''}"
        onclick="_portalCambiarTema('warm')" title="Tema cálido">🔆</button>
      <button class="pf-tema-btn pf-tema-light ${temaActual==='light'?'activo':''}"
        onclick="_portalCambiarTema('light')" title="Tema claro">☀️</button>
    </div>

    <div class="pf-inner pf-resultado">

      <div class="pf-res-icono">${sit.icono}</div>

      <div class="pf-res-situacion" style="color:${sit.color}">${sit.titulo}</div>

      <div class="pf-res-titulo">
        Su diagnóstico está completo.
      </div>

      <div class="pf-res-desc">
        ${sit.descripcion}
      </div>

      <div class="pf-res-examen">
        <div class="pf-res-examen-label">Próximo paso sugerido</div>
        <div class="pf-res-examen-nombre">${examen?.label || '—'}</div>
        <div class="pf-res-examen-desc">${examen?.desc || ''}</div>
      </div>

      <div class="pf-res-nota">
        ✦ &nbsp; Su proceso continúa. El equipo de MetoGroup va a revisar este perfil y le enviará el cuestionario correspondiente en las próximas horas.
      </div>

      <div class="pf-res-cta">
        <button class="pf-res-cta-btn" onclick="_portalFinalizar()">
          Finalizar y cerrar →
        </button>
      </div>

    </div>
  </div>`;
}

function _portalFinalizar(){
  const diag = getPortalDiagnostico();
  if(!diag){ toast('Error: no hay diagnóstico'); return; }
  diag.completo = true;
  diag.fechaFin = todayStr();
  diag.score = calcBPCScore(diag);

  // Guardar diagnóstico completo en caché + Supabase
  const portal = S.get('portal_diagnostico')||[];
  const idx = portal.findIndex(d=>String(d.clienteId)===String(currentUser.clienteId));
  if(idx>-1) portal[idx]=diag; else portal.push(diag);
  S.set('portal_diagnostico', portal);
  sbFetch('portal_diagnostico','PATCH',{completo:true,score:diag.score,fechaFin:diag.fechaFin},'?clienteId=eq.'+currentUser.clienteId)
    .then(r=>{ if(!r||!r.length) sbFetch('portal_diagnostico','POST',{id:diag.id,clienteId:currentUser.clienteId,completo:true,score:diag.score,fechaFin:diag.fechaFin,respuestas:JSON.stringify(diag.respuestas||{})},''); })
    .catch(e=>console.error('portal_diagnostico sync:', e));

  // Actualizar portal_clientes + Supabase
  const pc = S.get('portal_clientes')||[];
  const acc = pc.find(p=>String(p.clienteId)===String(currentUser.clienteId));
  if(acc){
    acc.diagnosticoCompleto=true; acc.score=diag.score;
    S.set('portal_clientes',pc);
    sbFetch('portal_clientes','PATCH',{diagnosticoCompleto:true,score:diag.score},'?clienteId=eq.'+currentUser.clienteId).catch(()=>{});
  }

  // ── Actualizar la auditoría vinculada + Supabase ──
  const auds = S.get('auditorias')||[];
  const aud = auds.find(a=>String(a.clienteId)===String(currentUser.clienteId));
  if(aud){
    aud.diagnostico_ok = true;
    aud.diagnostico_score = diag.score;
    aud.diagnostico_fecha = todayStr();
    if(aud.estado === 'Pendiente' || aud.estado === 'Iniciada') aud.estado = 'En proceso';
    const ai = auds.findIndex(a=>a.id===aud.id);
    if(ai>-1) auds[ai]=aud;
    _sbCache['auditorias'] = JSON.parse(JSON.stringify(auds));
    try{ localStorage.setItem('METO_auditorias', JSON.stringify(auds)); }catch(e){}
    sbFetch('auditorias','PATCH',{diagnostico_ok:true,diagnostico_score:diag.score,diagnostico_fecha:todayStr(),estado:aud.estado},'?id=eq.'+aud.id)
      .catch(e=>console.error('auditorias PATCH:', e));
  } else {
    sbFetch('auditorias','GET',null,'?clienteId=eq.'+currentUser.clienteId+'&select=id,estado').then(rows=>{
      if(rows&&rows.length) sbFetch('auditorias','PATCH',{diagnostico_ok:true,diagnostico_score:diag.score,diagnostico_fecha:todayStr()},'?id=eq.'+rows[0].id);
    });
  }

  // ── Registro central + alerta automática ──
  const nivel = getBPCNivel(diag.score);
  _portalRegistrarAccion('diagnostico_completo', {
    label: 'Diagnóstico BPC:2026 completado',
    detalle: `Score obtenido: ${diag.score}/100 — ${nivel?.nombre||''}\nIntro score: ${diag.introScore||'—'}/10 · Cierre score: ${diag.cierreScore||'—'}/10`,
    pasoMapa: 'Diagnóstico BPC (Fase 1)',
    auditoriaField: 'diagnostico_ok',
    avanzarEstado: true,
    accion: 'Configurar el dashboard del cliente en las próximas 24 horas.',
  });

  _portalClienteRender();
}

function _portalRenderAgradecimiento(scene, diag){
  if(!scene || !scene.isConnected) return;
  const cli    = (S.get('clientes')||[]).find(c=>c.id===currentUser?.clienteId);
  const nombre = cli?.contacto?.split(' ')[0] || currentUser?.nombre?.split(' ')[0] || '';
  const portal = document.getElementById('__bpc_portal_main__');
  const tema   = portal?.dataset.tema || 'dark';

  const T = {
    dark: { txt:'rgba(255,255,255,0.92)', txt2:'rgba(255,255,255,0.60)', txt3:'rgba(255,255,255,0.30)', gold:'#d4af37', gold2:'rgba(212,175,55,0.55)', line:'rgba(212,175,55,0.20)' },
    warm: { txt:'rgba(255,245,220,0.95)', txt2:'rgba(255,245,220,0.62)', txt3:'rgba(255,245,220,0.32)', gold:'#e8c84a', gold2:'rgba(232,200,74,0.55)', line:'rgba(232,200,74,0.22)' },
    light:{ txt:'rgba(15,10,0,0.92)',     txt2:'rgba(15,10,0,0.60)',     txt3:'rgba(15,10,0,0.38)',     gold:'#8a6820', gold2:'rgba(138,104,32,0.60)', line:'rgba(138,104,32,0.20)' },
  };
  const C = T[tema] || T.dark;

  scene.innerHTML = `
  <div style="width:100%;max-width:600px;padding:clamp(56px,9vh,100px) clamp(28px,6vw,60px);display:flex;flex-direction:column;animation:_swIn 0.85s cubic-bezier(0.16,1,0.3,1) both">

    <div style="display:flex;align-items:center;gap:14px;margin-bottom:clamp(40px,6vh,64px)">
      <div style="width:50px;height:50px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f5d060,#d4af37 50%,#8a6a1a);display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 0 32px rgba(212,175,55,0.25);flex-shrink:0">✦</div>
      <div>
        <div style="font-family:'Space Mono',monospace;font-size:12px;font-weight:700;color:${C.gold};letter-spacing:0.06em">MetoGroup</div>
        <div style="font-family:'Space Mono',monospace;font-size:8px;letter-spacing:0.22em;text-transform:uppercase;color:${C.txt3};margin-top:3px">Auditoría BPC:2026</div>
      </div>
    </div>

    <div style="height:1px;background:linear-gradient(90deg,${C.line},transparent);margin-bottom:clamp(44px,6vh,68px)"></div>

    <div style="font-family:'Space Mono',monospace;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:${C.gold2};margin-bottom:14px">Para ${nombre||'usted'}</div>
    <div style="font-family:'Cormorant Garamond',serif;font-size:clamp(44px,7vw,72px);font-weight:300;line-height:0.92;letter-spacing:-0.03em;color:${C.txt};margin-bottom:clamp(40px,6vh,60px)">Gracias.</div>

    <div style="display:flex;flex-direction:column;gap:22px;margin-bottom:clamp(48px,7vh,72px)">
      <p style="font-family:'Cormorant Garamond',serif;font-size:clamp(19px,2.6vw,26px);font-weight:300;font-style:italic;line-height:1.70;color:${C.txt2};margin:0">
        Tomarse el tiempo para responder con honestidad no es algo menor. Lo que acaba de completar es la base sobre la que se construirá todo el trabajo que viene.
      </p>
      <div style="width:32px;height:1px;background:${C.line}"></div>
      <p style="font-family:'Cormorant Garamond',serif;font-size:clamp(16px,2vw,20px);font-weight:300;line-height:1.80;color:${C.txt2};margin:0">
        El equipo de MetoGroup va a revisar cada respuesta con atención. En las próximas horas le vamos a hacer llegar el siguiente paso — diseñado específicamente para la situación de su empresa.
      </p>
      <p style="font-family:'Cormorant Garamond',serif;font-size:clamp(14px,1.7vw,17px);font-weight:300;font-style:italic;line-height:1.85;color:${C.txt3};margin:0">
        No hay nada más que hacer por ahora. Puede cerrar esta ventana con tranquilidad.
      </p>
    </div>

    <div style="display:flex;align-items:center;gap:16px;padding-top:clamp(24px,3vh,36px);border-top:1px solid ${C.line}">
      <div style="flex:1">
        <div style="font-family:'Cormorant Garamond',serif;font-size:clamp(15px,1.8vw,18px);font-weight:600;color:${C.txt}">Hernán Quiroz</div>
        <div style="font-family:'Space Mono',monospace;font-size:8px;letter-spacing:0.12em;color:${C.txt3};margin-top:4px;text-transform:uppercase">MetoGroup Latam S.A.</div>
      </div>
      <div style="font-family:'Space Mono',monospace;font-size:8px;letter-spacing:0.18em;color:${C.gold2};text-transform:uppercase">BPC:2026</div>
    </div>

  </div>`;
}


function _portalRenderResultado(scene, diag){
  if(!scene || !scene.isConnected) return;
  const score = calcBPCScore(diag);
  const nivel = getBPCNivel(score);
  const canalesNoPotencia = diag.respuestas['D7Q1'] || '—';
  const canalesPotencia = diag.respuestas['D7Q2'] || '—';

  scene.innerHTML = `
    <div class="q-stage" style="max-width:600px;width:100%;text-align:center;overflow-y:auto;max-height:calc(100vh - 100px);padding:0 clamp(16px,4vw,40px)">
      <div class="fl" style="margin-bottom:24px">
        <div style="width:90px;height:90px;margin:0 auto 20px;border-radius:50%;
          border:1px solid rgba(212,175,55,0.3);display:flex;align-items:center;justify-content:center;
          font-size:38px;background:radial-gradient(circle at 35% 35%,rgba(212,175,55,0.1),transparent 70%);
          box-shadow:0 0 40px rgba(212,175,55,0.08)">${nivel.icon}</div>
        <div class="display glow" style="font-size:clamp(60px,12vw,90px);line-height:1">${score}</div>
        <div style="font-size:9px;letter-spacing:0.3em;text-transform:uppercase;color:var(--grey);margin:6px 0 4px">BPC Score</div>
        <div class="serif" style="font-size:22px;color:var(--ink2)">${nivel.nombre}</div>
      </div>
      <div class="glow-line fl"></div>
      <div class="fl" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;text-align:left">
        ${BPC_DIMENSIONES.filter(d=>!d.esCanales).map(d=>{
          const ds=calcDimScore(diag,d);
          const pct=Math.round(ds/d.maxPts*100);
          return`<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(212,175,55,0.1);border-radius:8px;padding:14px">
            <div style="font-size:11px;color:var(--grey);margin-bottom:8px">${d.icon} ${d.nombre}</div>
            <div class="q-bar" style="margin-bottom:6px"><div class="q-bar-fill" style="width:${pct}%;background:${d.color}"></div></div>
            <div class="serif" style="font-size:20px;color:${d.color}">${ds}<span style="font-size:10px;color:var(--grey)">/${d.maxPts}</span></div>
          </div>`;
        }).join('')}
      </div>
      <div class="fl" style="background:rgba(212,175,55,0.04);border:1px solid rgba(212,175,55,0.15);border-radius:8px;padding:18px 22px;margin-bottom:24px;text-align:left">
        <div class="q-dim" style="margin-bottom:12px">Sus canales de venta</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div><div style="font-size:9px;color:var(--grey);margin-bottom:4px;letter-spacing:0.1em">SUBAPROVECHADO</div><div style="font-size:13px;color:var(--ink2)">${canalesNoPotencia}</div></div>
          <div><div style="font-size:9px;color:var(--grey);margin-bottom:4px;letter-spacing:0.1em">MÁS POTENCIADO</div><div style="font-size:13px;color:var(--ink2)">${canalesPotencia}</div></div>
        </div>
      </div>
      <div class="fl" style="font-size:12px;color:var(--grey);line-height:1.9;margin-bottom:20px">
        El equipo de MetoGroup va a analizar estos resultados<br>y se pondrán en contacto para definir los próximos pasos.
      </div>
      <div class="glow-line fl"></div>
      <div class="fl" style="font-size:9px;letter-spacing:0.15em;color:var(--grey);padding-bottom:24px">MetoGroup Latam S.A. · BPC:2026</div>
    </div>`;

  requestAnimationFrame(()=>{
    scene.querySelectorAll('.fl').forEach((el,i)=>setTimeout(()=>el.classList.add('in'),i*70));
  });
}


function getPortalDiagnostico(){
  return (S.get('portal_diagnostico')||[]).find(d=>String(d.clienteId)===String(currentUser.clienteId));
}

function calcDimScore(diag,dim){
  if(!diag||!diag.respuestas)return 0;
  if(!dim.preguntas.length||!dim.maxPts)return 0;
  // Escala no lineal: "A veces" (3/5) da solo 40% del punto
  // 1→0%, 2→15%, 3→40%, 4→70%, 5→100%
  const ESCALA = [0, 0, 0.15, 0.40, 0.70, 1.00];
  const resps = dim.preguntas.map(p=>Number(diag.respuestas[p.id])||0);
  const maxPosible = dim.preguntas.length; // cada pregunta vale 1 punto normalizado
  const rawScore = resps.reduce((s,v)=>s+(ESCALA[v]||0), 0);
  return Math.round(rawScore/maxPosible*dim.maxPts);
}

function calcBPCScore(diag){
  if(!diag||!diag.respuestas)return 0;
  return BPC_DIMENSIONES.filter(d=>!d.esCanales&&!d.esReflexiva).reduce((s,d)=>s+calcDimScore(diag,d),0);
}

// --- Cuestionario Diagnóstico ---
let _bpcCurrentDim=0;

function renderPortalDiagnostico(){
  const el=document.getElementById('page-content');
  const diag=getPortalDiagnostico();
  
  if(diag&&diag.completo){
    // Ya completado — mostrar resumen
    const score=calcBPCScore(diag);
    const nivel=getBPCNivel(score);
    el.innerHTML=`
    <div style="max-width:700px;margin:0 auto;text-align:center">
      <div style="font-size:48px;margin-bottom:12px">${nivel.icon}</div>
      <div style="font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:${nivel.color}">${score}/100</div>
      <div style="font-size:16px;color:${nivel.color};margin-top:4px;margin-bottom:8px">${nivel.nombre}</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:24px">${nivel.desc}</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;text-align:left;margin-bottom:24px">
        ${BPC_DIMENSIONES.map(d=>{
          const ds=calcDimScore(diag,d);
          const pct=Math.round(ds/d.maxPts*100);
          return`<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <span style="font-size:16px">${d.icon}</span>
              <span style="font-size:12px;font-weight:700">${d.nombre}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <div style="flex:1;height:6px;background:var(--surface2);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:${d.color};border-radius:3px"></div>
              </div>
              <span style="font-family:'Syne',sans-serif;font-size:14px;font-weight:800;color:${d.color}">${ds}/${d.maxPts}</span>
            </div>
          </div>`;
        }).join('')}
      </div>
      <button class="btn btn-secondary" onclick="_bpcCurrentDim=0;renderBPCCuestionario(true)" style="margin-right:8px">🔄 Rehacer Diagnóstico</button>
      <button class="btn btn-primary" onclick="showPage('portal_resultados')">📊 Ver Resultados Completos</button>
    </div>`;
    return;
  }

  // Mostrar bienvenida de MetoAsist antes del cuestionario
  const _yaVioBienvenida = sessionStorage.getItem('bpc_bienvenida_vista_'+currentUser.clienteId);
  if(!_yaVioBienvenida){
    _renderBPCBienvenida();
    return;
  }
  // Iniciar cuestionario
  _bpcCurrentDim=0;
  renderBPCCuestionario(false);
}

function _renderBPCBienvenida(){
  const el = document.getElementById('page-content');
  if(!el) return;
  const cli = (S.get('clientes')||[]).find(c=>String(c.id)===String(currentUser?.clienteId));
  const nombre = cli?.contacto?.split(' ')[0] || currentUser?.nombre?.split(' ')[0] || '';
  el.innerHTML = `
  <div style="max-width:640px;margin:0 auto;padding:clamp(32px,5vh,64px) 24px">

    <!-- MetoAsist header -->
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:40px;padding:20px 24px;background:#fff;border-radius:16px;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
      <div style="width:52px;height:52px;border-radius:50%;flex-shrink:0;background:#000;display:flex;align-items:center;justify-content:center;font-size:22px">✦</div>
      <div>
        <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:800;color:#000;letter-spacing:0.02em">MetoAsist</div>
        <div style="font-size:11px;color:#666;margin-top:2px;letter-spacing:0.08em;text-transform:uppercase">Asistente de MetoGroup</div>
      </div>
      <div style="margin-left:auto;display:flex;align-items:center;gap:6px">
        <div style="width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 6px #22c55e"></div>
        <span style="font-size:11px;color:#22c55e;font-weight:600">En línea</span>
      </div>
    </div>

    <!-- Saludo -->
    <div style="margin-bottom:32px">
      <div style="font-family:'Syne',sans-serif;font-size:clamp(26px,4vw,36px);font-weight:800;color:#111;line-height:1.15;margin-bottom:12px">
        ${nombre ? `Hola, ${nombre}.` : 'Hola.'}<br>
        <span style="color:#d4af37">Bienvenido a su diagnóstico BPC:2026.</span>
      </div>
      <div style="width:48px;height:3px;background:#d4af37;border-radius:2px"></div>
    </div>

    <!-- Mensaje principal -->
    <div style="background:#fff;border-radius:16px;padding:28px 32px;box-shadow:0 2px 16px rgba(0,0,0,0.06);margin-bottom:24px;border-left:4px solid #d4af37">
      <p style="font-size:15px;line-height:1.85;color:#222;margin:0 0 16px">
        Este diagnóstico es el <strong>primer paso formal de su proceso de auditoría BPC:2026</strong> con MetoGroup. Va a tomar entre 20 y 30 minutos, y es la base sobre la que vamos a construir todo el trabajo de los próximos <strong>30 días juntos</strong>.
      </p>
      <p style="font-size:15px;line-height:1.85;color:#222;margin:0 0 16px">
        Detrás de este sistema hay un <strong>equipo real de personas</strong> — auditores, consultores y analistas — que van a revisar cada respuesta. La IA me permite asistirlo en tiempo real, pero las decisiones y el acompañamiento son siempre humanos.
      </p>
      <p style="font-size:15px;line-height:1.85;color:#222;margin:0">
        Para que el diagnóstico tenga valor real, necesitamos que sea <strong>100% honesto</strong>. No hay respuestas correctas ni incorrectas. Cuanto más fiel a la realidad sea, mejor vamos a poder ayudarlo.
      </p>
    </div>

    <!-- Puntos clave -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:32px">
      ${[
        ['🕐','30 días de proceso','Equipo dedicado a su empresa'],
        ['🤝','Equipo humano + IA','Auditores reales, asistencia inteligente'],
        ['🔒','100% confidencial','Sus respuestas son solo nuestras'],
        ['💬','MetoAsist disponible','Consulte lo que necesite, cuando quiera'],
      ].map(([ic,t,s])=>`
        <div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 8px rgba(0,0,0,0.06);display:flex;align-items:flex-start;gap:12px">
          <span style="font-size:20px;flex-shrink:0">${ic}</span>
          <div>
            <div style="font-size:13px;font-weight:700;color:#111;margin-bottom:2px">${t}</div>
            <div style="font-size:11px;color:#666;line-height:1.5">${s}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- CTA -->
    <button onclick="sessionStorage.setItem('bpc_bienvenida_vista_${currentUser.clienteId}','1');_bpcCurrentDim=0;renderBPCCuestionario(false);"
      style="width:100%;padding:18px 32px;background:#000;color:#fff;border:none;border-radius:12px;font-family:'Syne',sans-serif;font-size:16px;font-weight:700;cursor:pointer;letter-spacing:0.04em;transition:all 0.2s;box-shadow:0 4px 20px rgba(0,0,0,0.2)"
      onmouseover="this.style.background='#d4af37';this.style.color='#000'"
      onmouseout="this.style.background='#000';this.style.color='#fff'">
      Comenzar diagnóstico →
    </button>
    <div style="text-align:center;margin-top:12px;font-size:11px;color:#999">Puede pausar y retomar cuando quiera. Sus respuestas se guardan automáticamente.</div>
  </div>`;
}

function renderBPCCuestionario(rehacer){
  const el=document.getElementById('page-content');
  if(!el) return;
  const dim=BPC_DIMENSIONES[_bpcCurrentDim];
  const diag=getPortalDiagnostico();
  const resps=(diag&&diag.respuestas)||{};
  const totalDims=BPC_DIMENSIONES.length;

  // Barra de progreso global (basada en dimensiones, no preguntas)
  const pct=Math.round(_bpcCurrentDim/totalDims*100);

  // ── Dimensión de canales — render especial ──────────────────────
  if(dim.esCanales){
    const canales=[
      ['🏬','Venta directa / presencial'],
      ['📞','Teléfono / llamadas outbound'],
      ['📧','Email marketing'],
      ['💼','Red de distribuidores'],
      ['🌐','Web / e-commerce'],
      ['📱','Redes sociales'],
      ['🤝','Referidos / boca a boca'],
      ['🏪','Punto de venta / local'],
      ['🤖','WhatsApp / mensajería'],
      ['📣','Publicidad paga (Google/Meta)'],
    ];
    const renderCanalesQ = (p, titulo, subtitulo) => {
      const selRaw = resps[p.id]||'';
      const selArr = selRaw ? selRaw.split(',') : [];
      return `<div class="bpc-q-card" style="margin-bottom:28px">
        <div class="bpc-q-num">${subtitulo}</div>
        <div class="bpc-q-texto">${titulo}</div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:10px;letter-spacing:0.05em">Podés seleccionar más de uno</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
          ${canales.map(([icon,nombre])=>`
            <div class="canal-chip ${selArr.includes(nombre)?'selected':''}" onclick="bpcSeleccionarCanal('${p.id}','${nombre}',this)">
              <span style="font-size:16px">${icon}</span>
              <span>${nombre}</span>
            </div>
          `).join('')}
        </div>
      </div>`;
    };

    el.innerHTML=`<div style="max-width:680px;margin:0 auto">
      <div class="bpc-progreso-bar"><div class="bpc-progreso-fill" style="width:${pct}%"></div></div>
      <div class="bpc-dim-header">
        <div class="bpc-dim-tag">Dimensión ${_bpcCurrentDim+1} de ${totalDims} — Canales de Venta</div>
        <div class="bpc-dim-titulo">Sus canales comerciales</div>
        <div class="bpc-dim-subtitulo">Dos preguntas clave sobre cómo llegan a sus clientes hoy.</div>
      </div>
      ${renderCanalesQ(dim.preguntas[0], 'En su criterio personal, ¿cuál es el canal de ventas que su empresa no está potenciando lo suficiente?', 'Canal subaprovechado')}
      ${renderCanalesQ(dim.preguntas[1], '¿Y cuál es el canal que siente que está aprovechando al máximo?', 'Canal más potenciado')}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:36px;padding-top:24px;border-top:1px solid var(--portal-gold-border)">
        <button class="btn bpc-nav-btn bpc-nav-btn-secondary" onclick="bpcDimAnterior()">← Anterior</button>
        <button class="btn bpc-nav-btn bpc-nav-btn-primary" onclick="bpcFinalizar()">Finalizar Diagnóstico</button>
      </div>
    </div>`;
    return;
  }

  // ── Render normal — escala 1-5 ──────────────────────────────────
  const escala=[
    ['1','Nunca — no existe'],
    ['2','Casi nunca — informal'],
    ['3','A veces — parcial'],
    ['4','Casi siempre — documentado'],
    ['5','Siempre — sistematizado'],
  ];

  const preguntasHTML = dim.preguntas.map((p,i)=>`
    <div class="bpc-q-card">
      <div class="bpc-q-num">Pregunta ${i+1} de ${dim.preguntas.length} — Ref. ${p.ref||''}</div>
      <div class="bpc-q-texto">${p.texto}</div>
      <div>
        ${escala.map(([v,lbl])=>{
          const sel=(resps[p.id]||0)===Number(v);
          return `<div class="bpc-escala-item ${sel?'selected':''}" onclick="bpcSeleccionar('${p.id}',${v},this,'${dim.color}')">
            <div class="bpc-escala-num">${v}</div>
            <div style="font-size:12px">${lbl}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
  `).join('');

  el.innerHTML=`<div style="max-width:680px;margin:0 auto">
    <div class="bpc-progreso-bar"><div class="bpc-progreso-fill" style="width:${pct}%"></div></div>
    <div class="bpc-dim-header">
      <div class="bpc-dim-tag">Dimensión ${_bpcCurrentDim+1} de ${totalDims}</div>
      <div class="bpc-dim-titulo">${dim.icon} ${dim.nombre}</div>
      <div class="bpc-dim-subtitulo">${dim.preguntas.length} preguntas · máx. ${dim.maxPts} puntos</div>
    </div>
    ${preguntasHTML}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:36px;padding-top:24px;border-top:1px solid var(--portal-gold-border)">
      <button class="btn bpc-nav-btn bpc-nav-btn-secondary" onclick="bpcDimAnterior()" ${_bpcCurrentDim===0?'style="opacity:0.3;pointer-events:none"':''}>← Anterior</button>
      <div style="font-family:var(--portal-sans,sans-serif);font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted)">${dim.nombre}</div>
      ${_bpcCurrentDim<BPC_DIMENSIONES.length-1
        ?`<button class="btn bpc-nav-btn bpc-nav-btn-primary" onclick="bpcDimSiguiente()">Siguiente →</button>`
        :`<button class="btn bpc-nav-btn bpc-nav-btn-primary" onclick="bpcFinalizar()">Finalizar</button>`
      }
    </div>
  </div>`;
}
function bpcSeleccionarCanal(pregId, valor, chipEl){
  let diag=getPortalDiagnostico();
  const portal=S.get('portal_diagnostico')||[];
  if(!diag){
    diag={id:S.nextId('portal_diagnostico'),clienteId:currentUser.clienteId,respuestas:{},completo:false,fechaInicio:todayStr()};
    portal.push(diag);
  }
  // Toggle multi-select: add or remove from comma-separated list
  const current = diag.respuestas[pregId] ? diag.respuestas[pregId].split(',') : [];
  const idx2 = current.indexOf(valor);
  if(idx2 > -1) current.splice(idx2, 1); else current.push(valor);
  diag.respuestas[pregId] = current.join(',');
  const idx=portal.findIndex(d=>d.clienteId===currentUser.clienteId);
  if(idx>-1)portal[idx]=diag; else portal.push(diag);
  S.set('portal_diagnostico',portal);
  // Visual toggle
  chipEl.classList.toggle('selected');
}

function bpcSeleccionar(pregId,valor,labelEl,color){
  // Save in temp storage
  let diag=getPortalDiagnostico();
  const portal=S.get('portal_diagnostico')||[];
  if(!diag){
    diag={id:S.nextId('portal_diagnostico'),clienteId:currentUser.clienteId,respuestas:{},completo:false,fechaInicio:todayStr()};
    portal.push(diag);
  }
  diag.respuestas[pregId]=valor;
  const idx=portal.findIndex(d=>d.clienteId===currentUser.clienteId);
  if(idx>-1)portal[idx]=diag;
  S.set('portal_diagnostico',portal);

  // Visual update — re-render the question's labels
  const container=labelEl.parentElement;
  container.querySelectorAll('label').forEach(lbl=>{
    const v=parseInt(lbl.querySelector('input').value);
    const selected=v===valor;
    lbl.style.background=selected?color+'20':'var(--surface2)';
    lbl.style.borderColor=selected?color:'var(--border)';
    const dot=lbl.querySelector('div>div');
    const circle=lbl.querySelector('div:first-child');
    if(circle){circle.style.borderColor=selected?color:'var(--border)';}
    if(selected&&!dot){
      const inner=document.createElement('div');
      inner.style.cssText=`width:10px;height:10px;border-radius:50%;background:${color}`;
      lbl.querySelector('div').appendChild(inner);
    }else if(!selected&&dot){
      dot.remove();
    }
    lbl.querySelector('span').style.color=selected?'var(--text)':'var(--muted)';
    lbl.querySelector('input').checked=selected;
  });
}

function bpcDimAnterior(){
  bpcGuardarActual();
  if(_bpcCurrentDim>0){_bpcCurrentDim--;renderBPCCuestionario(false);}
}

function bpcDimSiguiente(){
  bpcGuardarActual();
  if(_bpcCurrentDim<BPC_DIMENSIONES.length-1){_bpcCurrentDim++;renderBPCCuestionario(false);}
}

function bpcGuardarActual(){
  // Already saved on each click, just scroll to top
  window.scrollTo({top:0,behavior:'smooth'});
}

// ═══════════════════════════════════════════════════════════════
// ANÁLISIS IA DEL DIAGNÓSTICO — se auto-ejecuta al finalizar
// Genera informe interno, lo guarda en portal_diagnostico y auditorias
// El score del diagnóstico aporta el 20% al informe final
// ═══════════════════════════════════════════════════════════════
async function generarInformeDiagnosticoIA(diag, audId){
  if(window._portalCerrado || !currentUser) return;
  const apiKey = localStorage.getItem('METO_anthropic_key') || ANTHROPIC_API_KEY;
  // Si no hay key en memoria, intentar recargarla antes de fallar
  if(!apiKey || !apiKey.startsWith('sk-')){
    try{
      const cfg = await sbFetch('sueldos_config','GET',null,'?key=eq.anthropic_api_key');
      const sbKey = cfg&&cfg.length&&cfg[0]?.data?.key ? cfg[0].data.key : '';
      if(sbKey && sbKey.startsWith('sk-')){
        ANTHROPIC_API_KEY = sbKey;
        apiKey = sbKey;
        localStorage.setItem('METO_anthropic_key', sbKey);
      }
    }catch(e){}
  }
  if(!apiKey || !apiKey.startsWith('sk-')){
    console.log('⚠️ Sin API key — informe diagnóstico no generado automáticamente');
    return;
  }

  const cliente = (S.get('clientes')||[]).find(c=>String(c.id)===String(currentUser?.clienteId));
  const nivel   = getBPCNivel(diag.score);

  // Construir resumen de respuestas por dimensión
  const dimResumen = BPC_DIMENSIONES.filter(d=>!d.esCanales&&!d.esReflexiva).map(d=>{
    const ds = calcDimScore(diag, d);
    const pct = Math.round(ds/d.maxPts*100);
    const respuestas = d.preguntas.map(p=>{
      const val = Number(diag.respuestas[p.id])||0;
      const etiq = ['','Nunca','Casi nunca','A veces','Casi siempre','Siempre'][val]||'Sin responder';
      return `  - ${p.texto}: ${val}/5 (${etiq})`;
    }).join('\n');
    return `${d.icon} ${d.nombre}: ${ds}/${d.maxPts} pts (${pct}%)\n${respuestas}`;
  }).join('\n\n');

  // Canales
  const canalSub = diag.respuestas['D7Q1'] || '—';
  const canalPot = diag.respuestas['D7Q2'] || '—';

  const prompt = `Sos un auditor senior BPC:2026 de MetoGroup Latam S.A. Analizás diagnósticos de madurez comercial de PyMEs latinoamericanas.\n\nAcabás de recibir el diagnóstico inicial de "${cliente?.nombre||'la empresa'}". Este es un INFORME INTERNO para el equipo MetoGroup — no lo lee el cliente.\n\nDATOS DEL DIAGNÓSTICO:\nEmpresa: ${cliente?.nombre||'—'}\nContacto: ${cliente?.contacto||'—'} · ${cliente?.email||'—'}\nFecha: ${diag.fechaFin||diag.fechaInicio||'—'}\n\nSCORE BPC:2026: ${diag.score}/100 — Nivel: ${nivel?.nombre||'—'}\n${nivel?.desc||''}\n\nDESGLOSE POR DIMENSIÓN:\n${dimResumen}\n\nCANAL SUBAPROVECHADO: ${canalSub}\nCANAL MÁS POTENCIADO: ${canalPot}\n\nGENERÁ el informe con estas secciones EXACTAS:\n\n**SCORE DIAGNÓSTICO: ${diag.score}/100**\n**NIVEL: ${nivel?.nombre||'—'}**\n**APORTE AL INFORME FINAL: 20% (${Math.round(diag.score*0.2)}/20 puntos)**\n\n---\n\n**1. EVALUACIÓN EJECUTIVA**\n[3 párrafos. Estado real de madurez de esta empresa según sus respuestas concretas.]\n\n---\n\n**2. FORTALEZAS DETECTADAS**\n[3-4 fortalezas reales con evidencia de las respuestas. Negrita + 1 oración.]\n\n---\n\n**3. BRECHAS CRÍTICAS**\n[4-5 brechas ordenadas por impacto. Negrita + brecha + impacto en el negocio.]\n\n---\n\n**4. ANÁLISIS POR DIMENSIÓN**\n[Para cada dimensión: score obtenido, qué revela, riesgo principal.]\n\n---\n\n**5. RECOMENDACIONES PARA MetoGroup**\n[5-6 acciones concretas para proponer al cliente. Ordenadas por prioridad.]\n\n---\n\n**6. ESTRATEGIA DE ABORDAJE**\n[Para uso interno: cómo presentar el proceso, qué dolores mencionar, qué objeciones anticipar.]\n\nTONO: técnico, directo, español rioplatense. Sin relleno.`;

  try{
    const resp = await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body: JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:3000,messages:[{role:'user',content:prompt}]})
    });
    const data = await resp.json();
    const texto = data.content?.find(b=>b.type==='text')?.text || '';
    if(!texto) return;

    // Guardar en portal_diagnostico — usar clienteId del diag, no de currentUser
    const portal = S.get('portal_diagnostico')||[];
    const idx = portal.findIndex(d=>String(d.clienteId)===String(diag.clienteId));
    if(idx>-1){
      portal[idx].informeIA = texto;
      portal[idx].informeFecha = todayStr();
      S.set('portal_diagnostico', portal);
    }
    // Sync a Supabase
    sbFetch('portal_diagnostico','PATCH',{informeIA:texto,informeFecha:todayStr()},'?clienteId=eq.'+diag.clienteId).catch(()=>{});

    // Guardar en auditorias — campo informe_diagnostico
    // y sumar el 20% del score diagnóstico al resultado parcial
    if(audId){
      const auds = S.get('auditorias')||[];
      const aud = auds.find(a=>a.id===audId || String(a.clienteId)===String(currentUser.clienteId));
      if(aud){
        aud.informe_diagnostico   = texto;
        aud.informe_diagnostico_fecha = todayStr();
        aud.informe_diagnostico_score = diag.score;
        // El diagnóstico aporta 20% al resultado final
        // Si ya hay resultado parcial, sumamos; si no, inicializamos con el aporte
        const aporteDiag = Math.round(diag.score * 0.20);
        aud.score_diagnostico_aporte = aporteDiag;
        // resultado = suma de aportes de todas las fuentes
        const scoreActual = Number(aud.resultado) || 0;
        if(scoreActual === 0) aud.resultado = aporteDiag;
        S.set('auditorias', auds);
        // Sync informe a Supabase
        sbFetch('auditorias','PATCH',{
          informe_diagnostico: texto,
          informe_diagnostico_fecha: todayStr(),
          informe_diagnostico_score: diag.score,
          score_diagnostico_aporte: aporteDiag
        },'?id=eq.'+aud.id).catch(e=>console.error('PATCH informe_diagnostico error:',e));
        console.log(`✅ Informe diagnóstico IA generado — score ${diag.score}/100 · aporte ${aporteDiag}/20 pts al informe final`);
      }
    }

    // Alerta al equipo
    agenteAlerta(
      `🤖 Informe diagnóstico IA listo — ${cliente?.nombre||'Cliente'}`,
      `Score BPC: ${diag.score}/100 — ${nivel?.nombre||''}\nAporte al informe final: 20% (${Math.round(diag.score*0.2)}/20 pts)\nInforme disponible en el mapa de proceso → paso Diagnóstico BPC.\n\nAcción: Revisar el informe y configurar el dashboard del cliente.`
    );

  } catch(e){
    console.error('Error generando informe diagnóstico IA:', e);
  }
}


function bpcFinalizar(){
  const diag=getPortalDiagnostico();
  if(!diag){toast('❌ Error: no hay diagnóstico');return;}
  // Check all questions answered
  const totalP=BPC_DIMENSIONES.filter(d=>!d.esCanales).reduce((s,d)=>s+d.preguntas.length,0);
  const respondidas=Object.keys(diag.respuestas||{}).filter(k=>!k.startsWith('D7')).length;
  if(respondidas<totalP){
    toast(`⚠️ Faltan ${totalP-respondidas} preguntas por responder`);
    return;
  }
  diag.completo=true;
  diag.fechaFin=todayStr();
  diag.score=calcBPCScore(diag);
  const portal=S.get('portal_diagnostico')||[];
  const idx=portal.findIndex(d=>d.clienteId===currentUser.clienteId);
  if(idx>-1)portal[idx]=diag; else portal.push(diag);
  S.set('portal_diagnostico',portal);
  // Forzar sync inmediato a Supabase
  sbFetch('portal_diagnostico','PATCH',{completo:true,score:diag.score,fechaFin:diag.fechaFin},'?clienteId=eq.'+currentUser.clienteId)
    .then(r=>{ if(!r) sbFetch('portal_diagnostico','POST',{id:diag.id,clienteId:currentUser.clienteId,completo:true,score:diag.score,fechaFin:diag.fechaFin,respuestas:JSON.stringify(diag.respuestas||{})},''); })
    .catch(e=>console.error('portal_diagnostico sync error:',e));

  // Update portal_clientes
  const pc=S.get('portal_clientes')||[];
  const acc=pc.find(p=>p.clienteId===currentUser.clienteId);
  if(acc){
    acc.diagnosticoCompleto=true;
    acc.score=diag.score;
    S.set('portal_clientes',pc);
    // Forzar sync inmediato
    sbFetch('portal_clientes','PATCH',{diagnosticoCompleto:true,score:diag.score},'?clienteId=eq.'+currentUser.clienteId)
      .catch(e=>console.error('portal_clientes sync error:',e));
  }

  // ── Actualizar auditoría vinculada ──
  const _auds = S.get('auditorias')||[];
  const _aud  = _auds.find(a=>String(a.clienteId)===String(currentUser.clienteId));
  if(_aud){
    _aud.diagnostico_ok    = true;
    _aud.diagnostico_score = diag.score;
    _aud.diagnostico_fecha = todayStr();
    if(_aud.estado==='Pendiente'||_aud.estado==='Iniciada') _aud.estado='En proceso';
    const _audIdx = _auds.findIndex(a=>a.id===_aud.id);
    if(_audIdx>-1) _auds[_audIdx] = _aud;
    _sbCache['auditorias'] = JSON.parse(JSON.stringify(_auds));
    try{ localStorage.setItem('METO_auditorias', JSON.stringify(_auds)); }catch(e){}
    // PATCH directo con log de resultado
    sbFetch('auditorias','PATCH',{
      diagnostico_ok: true,
      diagnostico_score: diag.score,
      diagnostico_fecha: todayStr(),
      estado: _aud.estado
    },'?id=eq.'+_aud.id).then(r=>{
      console.log('✅ Auditoría actualizada en Supabase — id:'+_aud.id+' resultado:', r);
    }).catch(e=>console.error('❌ Error PATCH auditoría:', e));
  } else {
    // No hay auditoría en caché — buscar directo en Supabase por clienteId
    console.warn('⚠️ No se encontró auditoría en caché para clienteId='+currentUser.clienteId+'. Buscando en Supabase...');
    sbFetch('auditorias','GET',null,'?clienteId=eq.'+currentUser.clienteId+'&select=id,estado').then(rows=>{
      if(rows && rows.length){
        const _audSB = rows[0];
        console.log('✅ Auditoría encontrada en Supabase:', _audSB);
        sbFetch('auditorias','PATCH',{
          diagnostico_ok: true,
          diagnostico_score: diag.score,
          diagnostico_fecha: todayStr()
        },'?id=eq.'+_audSB.id).then(r2=>console.log('✅ PATCH desde Supabase OK:', r2));
        // Actualizar caché
        const _existing = _sbCache['auditorias']||[];
        const _ei = _existing.findIndex(a=>a.id===_audSB.id);
        if(_ei>-1){ _existing[_ei].diagnostico_ok=true; _existing[_ei].diagnostico_score=diag.score; }
        _sbCache['auditorias'] = _existing;
      } else {
        console.error('❌ No se encontró ninguna auditoría para clienteId='+currentUser.clienteId);
      }
    });
  }
  // ── Registro central + alerta al equipo ──
  _portalRegistrarAccion('diagnostico_completo',{
    label:'Diagnóstico BPC:2026 completado',
    detalle:`Score: ${diag.score}/100 — ${(getBPCNivel(diag.score)||{}).nombre||''}`,
    pasoMapa:'Diagnóstico BPC (Fase 1)',
    auditoriaField:'diagnostico_ok',
    avanzarEstado:true,
    accion:'Configurar el dashboard del cliente en las próximas 24 horas.',
  });

  toast('🎉 Diagnóstico completado — Score: '+diag.score+'/100');
  // Desbloquear menú completo del portal
  ['nav-portal-resultados','nav-portal-documentos','nav-portal-chat','nav-portal-pac','nav-portal-calendario','nav-portal-certificado'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.style.display='';
  });
  
  // Register pending tablero approval
  const approvals=S.get('bpc_tablero_approvals')||[];
  if(!approvals.find(a=>a.clienteId===currentUser.clienteId)){
    approvals.push({
      clienteId:currentUser.clienteId,
      clienteNombre:(S.get('clientes').find(c=>c.id===currentUser.clienteId)||{}).nombre||currentUser.nombre||'Cliente',
      score:diag.score,
      fechaDiag:new Date().toISOString(),
      aprobado:false,
      fechaAprobacion:null
    });
    S.set('bpc_tablero_approvals',approvals);
  }
  // ── Auto-generar informe IA en background ──
  const _audForInforme = (S.get('auditorias')||[]).find(a=>String(a.clienteId)===String(currentUser.clienteId));
  generarInformeDiagnosticoIA(diag, _audForInforme?.id).catch(e=>console.error('Informe IA error:',e));

  // ── Email a administración — con delay 30 min para dar sensación humana ──
  if(_audForInforme){
    setTimeout(()=>{
      agenteMailDiagnosticoCompletado(_audForInforme.id, diag.score)
        .catch(e=>console.error('Email admin empresa error:',e));
    }, 30 * 60 * 1000);
  }

  showPage('portal_dashboard');
}

// ─── AGENTE: Avisa a administración que el diagnóstico fue completado ───
async function agenteMailDiagnosticoCompletado(auditoriaId, score){
  const aud = (S.get('auditorias')||[]).find(x=>x.id===auditoriaId);
  if(!aud) return;
  const cliente = (S.get('clientes')||[]).find(c=>String(c.id)===String(aud.clienteId));
  if(!cliente) return;

  // Si ya se mandó, no mandar de nuevo
  if(aud.mail_diag_completado_enviado) return;

  // Destino: encargado_email si existe, si no email principal
  const destEmail  = cliente.encargado_email || cliente.email;
  const destNombre = cliente.encargado_nombre || cliente.contacto || cliente.nombre;
  if(!destEmail) {
    agenteAlerta('Email diagnóstico: sin destinatario', cliente.nombre+' no tiene encargado_email ni email registrado. El mail de diagnóstico completado no fue enviado.');
    return;
  }

  const emailCfg = (S.get('email_config')||[])[0]||{};
  if(!emailCfg.smtp_user) return;

  const fromName  = AGENTE.EMAIL_AGENTE_NOMBRE || 'Hernán Quiroz | MetoGroup';
  const fromEmail = AGENTE.EMAIL_AGENTE || emailCfg.smtp_user;
  const nivel = getBPCNivel(score);

  // Generar link de acceso admin empresa
  const _linkAdmin = adminEmpresaGenerarAcceso(cliente.id);

  const html = '<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:40px 32px;background:#ffffff;color:#1a1a1a">'
    +'<div style="border-bottom:2px solid #16a34a;padding-bottom:16px;margin-bottom:32px">'
    +'<div style="font-family:Arial,sans-serif;font-size:20px;font-weight:700;color:#1a1a1a;letter-spacing:1px">MetoGroup</div>'
    +'<div style="font-family:Arial,sans-serif;font-size:10px;color:#999;letter-spacing:2px;text-transform:uppercase;margin-top:2px">Auditoría BPC:2026</div>'
    +'</div>'
    +'<p style="font-size:15px;line-height:1.8;margin-bottom:20px">'+destNombre+', buen día.</p>'
    +'<p style="font-size:15px;line-height:1.85;margin-bottom:20px">'
    +'Recibimos el diagnóstico inicial de <strong>'+cliente.nombre+'</strong>. Nuestro equipo lo está revisando y se va a poner en contacto con usted en las próximas horas para coordinar los próximos pasos.</p>'
    +'<p style="font-size:15px;line-height:1.85;margin-bottom:20px">'
    +'Para poder avanzar, necesitamos conocer a las personas que integran el área comercial de la empresa. Le pedimos que complete la siguiente ficha con los datos del equipo:</p>'
    +(_linkAdmin ? '<div style="text-align:center;margin:28px 0"><a href="'+_linkAdmin+'" style="background:#16a34a;color:#ffffff;padding:15px 36px;border-radius:8px;text-decoration:none;font-family:Arial,sans-serif;font-weight:700;font-size:14px;display:inline-block;letter-spacing:0.5px">Completar ficha del equipo →</a></div>' : '')
    +'<div style="background:#fffbea;border-left:4px solid #c8a84a;padding:18px 22px;border-radius:0 8px 8px 0;margin-bottom:28px">'
    +'<div style="font-family:Arial,sans-serif;font-size:11px;color:#92770a;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px">Resultado del diagnóstico</div>'
    +'<div style="font-family:Arial,sans-serif;font-size:28px;font-weight:800;color:#c8a84a;margin-bottom:4px">'+score+'/100</div>'
    +'<div style="font-size:14px;color:#555;font-weight:600">'+nivel.nombre+'</div>'
    +'<div style="font-size:12px;color:#888;margin-top:6px;line-height:1.6">'+nivel.desc+'</div>'
    +'</div>'
    +'<p style="font-size:15px;line-height:1.85;margin-bottom:20px">Nuestro equipo va a estar en contacto con usted en las próximas horas para coordinar los siguientes pasos del proceso.</p>'
    +'<p style="font-size:15px;line-height:1.85;margin-bottom:32px">Si tiene alguna consulta antes de que lo contactemos, puede responder este email directamente.</p>'
    +'<div style="border-top:1px solid #eee;padding-top:24px">'
    +'<p style="font-size:14px;font-weight:700;margin:0 0 4px 0">'+fromName+'</p>'
    +'<p style="font-family:Arial,sans-serif;font-size:12px;color:#888;margin:0 0 2px 0">MetoGroup Latam S.A.</p>'
    +'<a href="mailto:'+fromEmail+'" style="font-family:Arial,sans-serif;font-size:12px;color:#c8a84a;text-decoration:none">'+fromEmail+'</a>'
    +'</div></div>';

  try {
    await fetch('/.netlify/functions/send-email',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        from_email: emailCfg.smtp_user,
        from_password: emailCfg.smtp_pass,
        from_name: fromName,
        to: destEmail,
        subject: 'Diagnóstico completado — Próximos pasos | MetoGroup',
        html,
        text: destNombre+', el diagnóstico BPC:2026 de '+cliente.nombre+' fue completado. Score: '+score+'/100 — '+nivel.nombre+'. Nuestro equipo los contactará en las próximas horas.'
      })
    });
    // Marcar en auditoría para no reenviar
    const auds = S.get('auditorias');
    const idx = auds.findIndex(x=>x.id===auditoriaId);
    if(idx>-1){ auds[idx].mail_diag_completado_enviado = true; S.set('auditorias', auds); }
    console.log('Agente: email diagnóstico completado enviado a '+destEmail);
  } catch(e){
    console.error('Agente: error enviando mail diagnóstico completado', e);
  }
}

// --- Resultados ---
function renderPortalResultados(){
  const el=document.getElementById('page-content');
  const diag=getPortalDiagnostico();
  if(!diag||!diag.completo){
    el.innerHTML='<div style="text-align:center;padding:40px;color:var(--muted)">Completá el diagnóstico primero. <button class="btn btn-primary" onclick="showPage(\'portal_diagnostico\')">Ir al Diagnóstico</button></div>';
    return;
  }
  const score=calcBPCScore(diag);
  const nivel=getBPCNivel(score);

  el.innerHTML=`
  <div style="max-width:800px;margin:0 auto">
    <div style="text-align:center;margin-bottom:28px">
      <div style="font-size:52px;margin-bottom:8px">${nivel.icon}</div>
      <div style="font-family:'Syne',sans-serif;font-size:48px;font-weight:800;color:${nivel.color}">${score}</div>
      <div style="font-size:10px;color:var(--muted);letter-spacing:2px;margin-top:4px">SCORE DE MADUREZ COMERCIAL BPC:2026</div>
      <div style="font-size:18px;font-weight:700;color:${nivel.color};margin-top:8px">${nivel.nombre}</div>
      <div style="font-size:12px;color:var(--muted);margin-top:4px;max-width:500px;margin-left:auto;margin-right:auto">${nivel.desc}</div>
    </div>

    <!-- Scale -->
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px 24px;margin-bottom:24px">
      <div style="height:12px;border-radius:6px;background:linear-gradient(90deg,#ef4444,#f97316,#f59e0b,#c8a84a,#c8a84a);position:relative;margin-bottom:18px">
        <div style="position:absolute;top:-6px;left:${score}%;transform:translateX(-50%);width:24px;height:24px;border-radius:50%;background:${nivel.color};border:3px solid var(--surface);box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--muted)">
        ${BPC_NIVELES.slice().reverse().map(n=>`<span style="color:${n.color}">${n.nombre}</span>`).join('')}
      </div>
    </div>

    <!-- Dimensions detail -->
    <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700;margin-bottom:14px">Resultados por Dimensión</div>
    ${BPC_DIMENSIONES.map(d=>{
      const ds=calcDimScore(diag,d);
      const pct=Math.round(ds/d.maxPts*100);
      const dimNivel=pct>=75?'Alto':pct>=50?'Medio':'Bajo';
      const dimColor=pct>=75?'var(--accent3)':pct>=50?'var(--warn)':'var(--danger)';
      return`
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px 20px;margin-bottom:10px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:20px">${d.icon}</span>
            <div>
              <div style="font-size:13px;font-weight:700">${d.nombre}</div>
              <div style="font-size:10px;color:var(--muted)">${d.preguntas.length} controles evaluados</div>
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:${d.color}">${ds}/${d.maxPts}</div>
            <div style="font-size:10px;color:${dimColor};font-weight:700">${dimNivel}</div>
          </div>
        </div>
        <div style="height:8px;background:var(--surface2);border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${d.color};border-radius:4px;transition:width 0.6s"></div>
        </div>
      </div>`;
    }).join('')}

    <div style="text-align:center;margin-top:20px">
      <button class="btn btn-secondary" onclick="showPage('portal_dashboard')">← Volver al Dashboard</button>
    </div>
  </div>`;
}

// --- Placeholder pages ---
function renderPortalDocumentos(){
  const el=document.getElementById('page-content');
  const clienteId=currentUser?.clienteId;
  
  // BPC Audit documents library — documents the client receives or needs to review
  const BPC_DOCS=[
    {id:'doc_alcance',cat:'Inicio',titulo:'Alcance de la Auditoría BPC 72001',
      desc:'Define qué áreas, procesos y dimensiones de la empresa serán evaluados durante la auditoría de buenas prácticas comerciales.',
      contenido:'Este documento establece el alcance de la auditoría BPC 72001 para la empresa. Incluye: las 6 dimensiones que serán evaluadas (Liderazgo y Estrategia, Capital Humano, Procesos de Venta, Marketing Digital, Tecnología y CRM, Ética y Gobernanza), el período de evaluación, las instalaciones incluidas, los procesos comerciales que se van a auditar, y las exclusiones si las hubiera. También detalla la metodología de puntuación (escala 1-5 por pregunta, ponderada por dimensión) y los criterios para cada nivel de madurez (Inicial, En desarrollo, Definido, Avanzado, Optimizado).',
      estado:'Disponible',fecha:'2026-03-01'},
    {id:'doc_plan',cat:'Inicio',titulo:'Plan de Auditoría',
      desc:'Cronograma detallado con fechas de cada etapa: documentación, auditoría externa, in-situ, informe y seguimiento.',
      contenido:'El plan de auditoría establece el cronograma completo del proceso. Etapas: 1) Diagnóstico inicial (completado por el cliente online). 2) Revisión documental (el auditor revisa evidencia enviada). 3) Auditoría externa (análisis de presencia digital, materiales comerciales, comunicación). 4) Auditoría in-situ (visita a las instalaciones, entrevistas al equipo, observación de procesos). 5) Preparación del informe (el auditor consolida hallazgos). 6) Entrega del informe final con score y observaciones. 7) Plan de acción correctivo (si hay no conformidades). 8) Seguimiento y cierre.',
      estado:'Disponible',fecha:'2026-03-01'},
    {id:'doc_checklist',cat:'Preparación',titulo:'Checklist de Evidencia Requerida',
      desc:'Lista completa de documentos y registros que la empresa debe preparar como evidencia para cada dimensión.',
      contenido:'Para cada dimensión se requiere evidencia documental específica. Dimensión 1 (Liderazgo): Plan estratégico comercial, acta de revisión anual, organigrama del área comercial, presupuesto aprobado, definición de KPIs. Dimensión 2 (Capital Humano): Perfiles de cargo, proceso de selección documentado, programa de inducción, plan de capacitación, evaluaciones de desempeño, esquema de incentivos. Dimensión 3 (Procesos): Proceso de venta documentado, propuesta de valor, materiales de venta, registro de pipeline, procedimiento de onboarding, gestión de reclamos. Dimensión 4 (Marketing): Manual de identidad, calendario editorial, proceso de aprobación, protocolo de crisis, métricas digitales. Dimensión 5 (Tecnología): Evidencia de CRM implementado, reportes de uso, integraciones. Dimensión 6 (Ética): Código de conducta firmado, canal de denuncias, revisión legal de contratos.',
      estado:'Disponible',fecha:'2026-03-05'},
    {id:'doc_metodologia',cat:'Preparación',titulo:'Metodología de Evaluación BPC:2026',
      desc:'Explica cómo se calcula el score, qué peso tiene cada dimensión y qué significan los niveles de madurez.',
      contenido:'La metodología BPC:2026 evalúa 6 dimensiones con un total de 100 puntos distribuidos así: Liderazgo y Estrategia (25 pts), Capital Humano (15 pts), Procesos de Venta (20 pts), Marketing Digital (15 pts), Tecnología y CRM (10 pts), Ética y Gobernanza (15 pts). Cada pregunta se puntúa de 1 a 5 (Nunca, Casi nunca, A veces, Casi siempre, Siempre). Niveles de madurez: Inicial (0-20): sin procesos formales. En desarrollo (21-40): procesos incipientes. Definido (41-60): procesos documentados pero inconsistentes. Avanzado (61-80): procesos maduros con mejora continua. Optimizado (81-100): excelencia comercial demostrable.',
      estado:'Disponible',fecha:'2026-03-05'},
    {id:'doc_glosario',cat:'Preparación',titulo:'Glosario de Términos de Auditoría',
      desc:'Definiciones de los términos técnicos que aparecen durante la auditoría: no conformidad, hallazgo, observación, evidencia objetiva, etc.',
      contenido:'Términos clave: AUDITORÍA: examen sistemático e independiente para determinar si las actividades cumplen los criterios establecidos. EVIDENCIA OBJETIVA: datos que respaldan la existencia o veracidad de algo, puede ser un documento, registro o declaración verificable. NO CONFORMIDAD (NC): incumplimiento de un requisito de la norma BPC 72001; requiere acción correctiva obligatoria con plazo. HALLAZGO: brecha o debilidad detectada que no llega a ser incumplimiento pero representa un riesgo; se recomienda acción. OBSERVACIÓN: oportunidad de mejora que el auditor sugiere pero no es obligatoria. CONFORME: el requisito se cumple satisfactoriamente. ACCIÓN CORRECTIVA: acción para eliminar la causa de una no conformidad. DECLARACIÓN DE APLICABILIDAD: documento que lista todos los controles de la norma e indica cuáles aplican y cuáles no, con justificación.',
      estado:'Disponible',fecha:'2026-03-05'},
    {id:'doc_informe_modelo',cat:'Durante auditoría',titulo:'Modelo de Informe de Auditoría',
      desc:'Estructura tipo del informe que recibirás al final: cómo leerlo, qué secciones tiene y qué significan.',
      contenido:'El informe de auditoría BPC 72001 tiene la siguiente estructura: 1) RESUMEN EJECUTIVO: score global, nivel de madurez, principales fortalezas y debilidades en 1 página. 2) DATOS DE LA AUDITORÍA: empresa, auditor, fechas, alcance. 3) RESULTADOS POR DIMENSIÓN: para cada una de las 6 dimensiones se detalla el puntaje obtenido vs el máximo, las evidencias revisadas, y cada observación clasificada (Conforme, Observación, Hallazgo, No Conformidad). 4) MATRIZ DE HALLAZGOS: tabla resumen con todas las no conformidades y hallazgos, su severidad, y el plazo recomendado para corregirlos. 5) PLAN DE ACCIÓN CORRECTIVO: plantilla para que la empresa documente cómo va a resolver cada no conformidad. 6) CONCLUSIÓN Y RECOMENDACIONES: dictamen del auditor y próximos pasos.',
      estado:'Disponible',fecha:'2026-03-10'},
    {id:'doc_pac_guia',cat:'Post auditoría',titulo:'Guía para el Plan de Acción Correctivo',
      desc:'Cómo completar el plan de acción correctivo cuando el auditor encuentra no conformidades.',
      contenido:'Cuando el auditor identifica una No Conformidad, la empresa debe presentar un Plan de Acción Correctivo (PAC) dentro del plazo establecido (generalmente 30 días). El PAC debe incluir para cada NC: 1) Descripción de la no conformidad tal como la redactó el auditor. 2) Análisis de causa raíz (por qué ocurrió, no solo qué pasó). 3) Acción correctiva específica (qué se va a hacer concretamente). 4) Responsable con nombre y cargo. 5) Fecha de implementación comprometida. 6) Evidencia que se va a presentar para demostrar que se corrigió. El auditor revisará el PAC y la evidencia en la etapa de seguimiento. Si las acciones son adecuadas, la NC se cierra. Si no, se puede pedir una extensión o una re-auditoría parcial.'},
    {id:'doc_derechos',cat:'Post auditoría',titulo:'Derechos y Obligaciones del Cliente',
      desc:'Tus derechos durante la auditoría: confidencialidad, apelación, tiempos de respuesta.',
      contenido:'Como cliente auditado tenés los siguientes derechos: CONFIDENCIALIDAD: toda la información compartida es tratada bajo acuerdo de confidencialidad. Solo el auditor asignado y la dirección técnica de MetoGroup acceden a tus datos. APELACIÓN: si no estás de acuerdo con una observación del auditor, podés presentar una apelación formal dentro de los 10 días hábiles posteriores a la entrega del informe. La apelación es revisada por un comité técnico independiente. TIEMPOS: el auditor debe entregar el informe dentro de los 15 días hábiles posteriores a la auditoría in-situ. ACOMPAÑAMIENTO: tenés derecho a que un representante de tu empresa esté presente durante toda la auditoría in-situ. CONSULTAS: podés hacer consultas ilimitadas a tu consultor asignado y a MetoAssist durante todo el proceso.'}
  ];
  
  const catsBpcDocs=[...new Set(BPC_DOCS.map(d=>d.cat))];
  
  // ── Lista de documentos solicitados según etapa de auditoría ──
  const auditorias = S.get('auditorias')||[];
  const miAud = auditorias.find(a=>a.clienteId==clienteId);
  const etapaAud = miAud?.estado || 'inicio';
  const docsSubidos = (S.get('portal_documentos_subidos')||[]).filter(d=>d.clienteId==clienteId);

  const DOCS_REQUERIDOS = {
    // Fase 1 — apertura
    inicio: [
      {id:'req_acceso_analytics',   cat:'Accesos digitales',   label:'Acceso Google Analytics (Visualizador)',         desc:'Agregá a auditor@metogroup.mx como Visualizador en Google Analytics 4'},
      {id:'req_acceso_search',      cat:'Accesos digitales',   label:'Acceso Google Search Console',                  desc:'Agregá a auditor@metogroup.mx en Search Console con permiso completo'},
      {id:'req_acceso_meta',        cat:'Accesos digitales',   label:'Acceso Meta Business Suite (Analista)',          desc:'Agregá a auditor@metogroup.mx como Analista en Meta Business Suite'},
      {id:'req_captura_ig',         cat:'Capturas digitales',  label:'Capturas Instagram Insights (últimos 30 días)', desc:'Alcance, engagement rate, crecimiento de seguidores, tiempo de respuesta DM'},
      {id:'req_captura_fb',         cat:'Capturas digitales',  label:'Capturas Facebook Page Insights',               desc:'Alcance orgánico, engagement, seguidores, tiempo de respuesta Messenger'},
      {id:'req_captura_tiktok',     cat:'Capturas digitales',  label:'Capturas TikTok Analytics (últimos 30 días)',   desc:'Vistas, seguidores, tasa de completado, engagement rate'},
    ],
    // Fase 3 — auditoría activa
    'En Proceso': [
      {id:'req_captura_ml',         cat:'Mercado Libre',       label:'Captura panel vendedor ML',                     desc:'Reputación, % ventas completadas, % reclamos, tiempo de respuesta'},
      {id:'req_captura_ads',        cat:'Publicidad paga',     label:'Reporte Meta Ads / Google Ads (últimos 30d)',   desc:'Inversión, alcance, CTR, leads generados, ROAS si lo tienen'},
      {id:'req_reporte_agencia',    cat:'Agencia',             label:'Último reporte de la agencia de marketing',     desc:'El reporte mensual que entrega la agencia con métricas'},
      {id:'req_captura_whatsapp',   cat:'Comunicaciones',      label:'Captura historial WhatsApp Business',           desc:'Tiempos de respuesta de los últimos 7 días'},
      {id:'req_captura_crm',        cat:'CRM',                 label:'Captura del pipeline actual en el CRM',         desc:'Estado del pipeline con etapas y cobertura'},
      {id:'req_plan_comercial',     cat:'Documentación',       label:'Plan comercial vigente',                        desc:'El plan con objetivos y metas del período actual'},
      {id:'req_script_ventas',      cat:'Documentación',       label:'Script o guión de ventas (si existe)',          desc:'El guión, presentación o proceso de venta documentado'},
    ],
  };

  const requeridos = DOCS_REQUERIDOS[etapaAud] || DOCS_REQUERIDOS['inicio'];
  const cats = [...new Set(requeridos.map(d=>d.cat))];

  const pendientes = requeridos.filter(d => !docsSubidos.find(s=>s.reqId===d.id));
  const enviados   = requeridos.filter(d =>  docsSubidos.find(s=>s.reqId===d.id));

  el.innerHTML=`<div style="max-width:800px;margin:0 auto">

    <!-- Sección: documentos a enviar -->
    <div style="margin-bottom:28px">
      <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;margin-bottom:6px">Documentos que necesitamos</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:16px">Para completar la auditoría necesitamos que nos enviés los siguientes documentos y capturas de pantalla.</div>

      ${pendientes.length===0 ? `
        <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.25);border-radius:12px;padding:16px;text-align:center;margin-bottom:16px">
          <div style="font-size:20px;margin-bottom:6px">✅</div>
          <div style="font-size:14px;font-weight:600;color:#4ade80">¡Todo enviado!</div>
          <div style="font-size:12px;color:var(--muted);margin-top:4px">Enviaste todos los documentos solicitados. El equipo de MetoGroup los está procesando.</div>
        </div>` : ''}

      ${cats.filter(cat=>requeridos.filter(d=>d.cat===cat && !docsSubidos.find(s=>s.reqId===d.id)).length>0).map(cat=>`
        <div style="margin-bottom:16px">
          <div style="font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--accent);margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--border)">${cat}</div>
          ${requeridos.filter(d=>d.cat===cat && !docsSubidos.find(s=>s.reqId===d.id)).map(doc=>`
            <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:8px">
              <div style="display:flex;align-items:flex-start;gap:12px">
                <div style="width:32px;height:32px;border-radius:50%;background:rgba(239,68,68,0.1);border:1.5px solid rgba(239,68,68,0.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px">⏳</div>
                <div style="flex:1">
                  <div style="font-size:13px;font-weight:600;margin-bottom:3px">${doc.label}</div>
                  <div style="font-size:11px;color:var(--muted);margin-bottom:10px">${doc.desc}</div>
                  <div style="display:flex;gap:8px;flex-wrap:wrap">
                    <label style="cursor:pointer">
                      <input type="file" accept="image/*,.pdf" style="display:none" onchange="subirDocPortal('${doc.id}','${doc.label}',this)">
                      <div class="btn btn-primary btn-sm" style="display:inline-block">📎 Subir archivo o captura</div>
                    </label>
                    <button class="btn btn-secondary btn-sm" onclick="marcarDocPortalSinArchivo('${doc.id}','${doc.label}')">
                      ✉️ Ya lo enviamos por email
                    </button>
                  </div>
                </div>
              </div>
            </div>`).join('')}
        </div>`).join('')}

      ${enviados.length>0?`
        <div style="margin-top:8px">
          <div style="font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--accent3);margin-bottom:8px">✓ Ya enviados</div>
          ${enviados.map(doc=>{
            const sub=docsSubidos.find(s=>s.reqId===doc.id);
            return `<div style="background:rgba(34,197,94,0.05);border:0.5px solid rgba(34,197,94,0.2);border-radius:10px;padding:12px;margin-bottom:6px;display:flex;align-items:center;gap:10px">
              <div style="font-size:16px">✅</div>
              <div style="flex:1">
                <div style="font-size:12px;font-weight:600">${doc.label}</div>
                <div style="font-size:10px;color:var(--muted)">Enviado ${sub?.fecha?new Date(sub.fecha).toLocaleDateString('es-AR'):''} ${sub?.via?' · '+sub.via:''}</div>
              </div>
              <button class="btn btn-sm" style="font-size:10px;color:var(--danger)" onclick="quitarDocPortal('${doc.id}')">✕</button>
            </div>`;}).join('')}
        </div>`:'' }
    </div>

    <div style="border-top:1px solid var(--border);padding-top:20px;margin-bottom:24px">
      <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;margin-bottom:6px">Documentos de tu Auditoría</div>
      <div style="font-size:12px;color:var(--muted)">Todos los documentos relacionados con tu proceso BPC 72001. Podés leerlos y pedirle a MetoAssist que te los explique.</div>
    </div>
    ${catsBpcDocs.map(cat=>`
      <div style="margin-bottom:20px">
        <div style="font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--accent);margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border)">${cat}</div>
        ${BPC_DOCS.filter(d=>d.cat===cat).map(doc=>`
            <div style="display:flex;align-items:center;gap:12px">
              <div style="font-size:22px;opacity:0.4">📄</div>
              <div style="flex:1">
                <div style="font-size:14px;font-weight:600">${doc.titulo}</div>
                <div style="font-size:11px;color:var(--muted);margin-top:2px;line-height:1.5">${doc.desc}</div>
              </div>
              <div style="display:flex;gap:6px;flex-shrink:0">
                <button class="btn btn-sm" onclick="event.stopPropagation();askMetoAssistAboutDoc('${doc.id}')" style="font-size:10px;background:linear-gradient(135deg,rgba(200,168,74,0.1),rgba(6,214,160,0.05));border-color:rgba(200,168,74,0.2);color:var(--accent3)">◈ Explicar</button>
                <span style="font-size:16px;color:var(--muted);transition:transform 0.2s" id="arrow-${doc.id}">▾</span>
              </div>
            </div>
            <div id="bpc-doc-${doc.id}" style="display:none;margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">
              <div style="font-size:13px;color:var(--muted);line-height:1.8">${doc.contenido}</div>
              <div style="margin-top:12px;display:flex;gap:8px">
                <button class="btn btn-sm" onclick="event.stopPropagation();askMetoAssistAboutDoc('${doc.id}')" style="background:linear-gradient(135deg,rgba(200,168,74,0.12),rgba(6,214,160,0.06));border-color:rgba(200,168,74,0.2);color:var(--accent3)">◈ No entiendo, explicame</button>
                <button class="btn btn-sm" onclick="event.stopPropagation();askMetoAssistDocQuestion('${doc.id}')" style="font-size:10px">◈ Tengo una duda</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `).join('')}
  </div>`;
}


// ══════════════════════════════════════════════════════════════
// PORTAL DOCUMENTOS — Subida de archivos del cliente
// ══════════════════════════════════════════════════════════════

function subirDocPortal(reqId, label, inputEl){
  const file = inputEl.files[0];
  if(!file){ return; }
  const maxSize = 5 * 1024 * 1024; // 5MB
  if(file.size > maxSize){ toast('⚠️ El archivo supera 5MB. Comprimí la imagen o el PDF.'); return; }

  const reader = new FileReader();
  reader.onload = function(e){
    const b64 = e.target.result;
    const clienteId = currentUser?.clienteId;
    const docs = S.get('portal_documentos_subidos') || [];
    // Remover si ya existía
    const idx = docs.findIndex(d=>d.reqId===reqId && d.clienteId==clienteId);
    if(idx>-1) docs.splice(idx,1);
    docs.push({
      reqId, clienteId, label,
      nombre: file.name,
      tipo: file.type,
      tamanio: file.size,
      b64,
      fecha: new Date().toISOString(),
      via: 'archivo',
      leido: false,
    });
    S.set('portal_documentos_subidos', docs);

    // Intentar guardar en Supabase también
    _guardarDocSupabase(reqId, label, b64, file.name, file.type, clienteId);

    // Registro central
    _portalRegistrarAccion('documento_subido', {
      label: 'Documento subido: '+label,
      detalle: `Archivo: ${file.name} (${Math.round(file.size/1024)}KB)\nDocumento requerido: ${label}`,
      pasoMapa: 'Documentación requerida',
      auditoriaField: 'docs_recibidos',
      accion: 'Revisar el documento subido por el cliente en el módulo de Documentos.',
    });

    toast('✅ Documento enviado correctamente');
    renderPortalDocumentos();
  };
  reader.readAsDataURL(file);
}

function marcarDocPortalSinArchivo(reqId, label){
  const clienteId = currentUser?.clienteId;
  const docs = S.get('portal_documentos_subidos') || [];
  const idx = docs.findIndex(d=>d.reqId===reqId && d.clienteId==clienteId);
  if(idx>-1) docs.splice(idx,1);
  docs.push({
    reqId, clienteId, label,
    nombre: 'Enviado por email',
    tipo: 'email',
    b64: null,
    fecha: new Date().toISOString(),
    via: 'email',
    leido: false,
  });
  S.set('portal_documentos_subidos', docs);

  // Registro central
  _portalRegistrarAccion('documento_subido', {
    label: 'Documento informado por email: '+label,
    detalle: 'El cliente indicó que envió el documento "'+label+'" por email.',
    pasoMapa: 'Documentación requerida',
    auditoriaField: 'docs_recibidos',
    accion: 'Verificar el email del cliente y confirmar recepción del documento.',
  });

  toast('✅ Marcado como enviado por email');
  renderPortalDocumentos();
}

function quitarDocPortal(reqId){
  const clienteId = currentUser?.clienteId;
  const docs = (S.get('portal_documentos_subidos')||[]).filter(d=>!(d.reqId===reqId && d.clienteId==clienteId));
  S.set('portal_documentos_subidos', docs);
  renderPortalDocumentos();
}

async function _guardarDocSupabase(reqId, label, b64, nombre, tipo, clienteId){
  try {
    await fetch(SUPABASE_URL+'/rest/v1/portal_docs_subidos', {
      method:'POST',
      headers:{...(_sbH),'Prefer':'return=minimal'},
      body: JSON.stringify({
        req_id: reqId, cliente_id: clienteId, label,
        nombre, tipo, b64_preview: b64?.substring(0,500)||'',
        fecha: new Date().toISOString(), leido: false,
      })
    });
  } catch(e){ /* silencioso */ }
}

// Panel del consultor para ver documentos subidos por el cliente
function abrirPanelDocumentosCliente(clienteId, clienteNombre){
  const todos = (S.get('portal_documentos_subidos')||[]).filter(d=>d.clienteId==clienteId);
  const ov = document.createElement('div');
  ov.className = 'modal-overlay open';
  ov.style.cssText = 'z-index:9998';

  const gruposPorCat = {};
  todos.forEach(d=>{
    const cat = d.reqId?.split('_')[1] || 'general';
    if(!gruposPorCat[cat]) gruposPorCat[cat]=[];
    gruposPorCat[cat].push(d);
  });

  ov.innerHTML = `
    <div class="modal" style="max-width:700px;width:100%">
      <div class="modal-head">
        <div>
          <div class="modal-title">📎 Documentos del cliente</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${clienteNombre} · ${todos.length} archivos enviados</div>
        </div>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body" style="max-height:65vh;overflow-y:auto">
        ${todos.length===0 ? `<div style="padding:40px;text-align:center;color:var(--muted)">El cliente aún no envió documentos</div>` : ''}
        ${Object.entries(gruposPorCat).map(([cat,docs])=>`
          <div style="margin-bottom:16px">
            <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--accent);margin-bottom:8px">${cat}</div>
            ${docs.map(d=>`
              <div style="background:var(--surface2);border:0.5px solid var(--border);border-radius:10px;padding:12px;margin-bottom:6px;display:flex;align-items:center;gap:12px">
                <div style="font-size:24px">${d.tipo==='email'?'✉️':d.tipo?.startsWith('image')?'🖼️':'📄'}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:12px;font-weight:600">${d.label}</div>
                  <div style="font-size:10px;color:var(--muted)">${d.nombre} · ${new Date(d.fecha).toLocaleDateString('es-AR')} · ${d.via==='email'?'por email':'archivo subido'}</div>
                </div>
                ${d.b64 ? `<a href="${d.b64}" download="${d.nombre}" class="btn btn-secondary btn-sm">⬇ Descargar</a>` : ''}
                ${d.b64?.startsWith('data:image') ? `<button onclick="verImagenDoc('${d.reqId}',${clienteId})" class="btn btn-sm" style="font-size:10px">👁 Ver</button>` : ''}
              </div>`).join('')}
          </div>`).join('')}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cerrar</button>
        <button class="btn btn-primary" onclick="marcarDocsLeidos(${clienteId});this.closest('.modal-overlay').remove()">✅ Marcar todo como revisado</button>
      </div>
    </div>`;
  ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
  document.body.appendChild(ov);
}

function verImagenDoc(reqId, clienteId){
  const doc = (S.get('portal_documentos_subidos')||[]).find(d=>d.reqId===reqId && d.clienteId==clienteId);
  if(!doc?.b64) return;
  const ov = document.createElement('div');
  ov.className='modal-overlay open';
  ov.style.cssText='z-index:9999;background:rgba(0,0,0,0.9)';
  ov.innerHTML=`<div style="max-width:90vw;max-height:90vh;position:relative">
    <img src="${doc.b64}" style="max-width:90vw;max-height:85vh;object-fit:contain;border-radius:8px">
    <button onclick="this.closest('.modal-overlay').remove()" style="position:fixed;top:20px;right:20px;background:rgba(0,0,0,0.5);border:none;color:white;font-size:24px;cursor:pointer;border-radius:50%;width:40px;height:40px">✕</button>
    <div style="color:white;text-align:center;margin-top:8px;font-size:12px">${doc.label} · ${doc.nombre}</div>
  </div>`;
  ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
  document.body.appendChild(ov);
}

function marcarDocsLeidos(clienteId){
  const docs = S.get('portal_documentos_subidos')||[];
  docs.forEach(d=>{ if(d.clienteId==clienteId) d.leido=true; });
  S.set('portal_documentos_subidos', docs);
  toast('✅ Documentos marcados como revisados');
}

function toggleBPCDoc(id){
  const el=document.getElementById('bpc-doc-'+id);
  const arrow=document.getElementById('arrow-'+id);
  if(!el)return;
  const show=el.style.display==='none';
  el.style.display=show?'block':'none';
  if(arrow)arrow.style.transform=show?'rotate(180deg)':'';
}

// Document data accessible globally for MetoAssist
const BPC_DOCS_DATA={
  doc_alcance:{titulo:'Alcance de la Auditoría',contenido:'Define qué áreas, procesos y dimensiones serán evaluados. Incluye las 6 dimensiones, período de evaluación, instalaciones, procesos comerciales, exclusiones, metodología de puntuación y criterios de madurez.'},
  doc_plan:{titulo:'Plan de Auditoría',contenido:'Cronograma: 1) Diagnóstico online 2) Revisión documental 3) Auditoría externa 4) Auditoría in-situ 5) Preparación informe 6) Entrega informe 7) Plan correctivo 8) Seguimiento y cierre.'},
  doc_checklist:{titulo:'Checklist de Evidencia',contenido:'Lista de documentos requeridos por dimensión: planes estratégicos, perfiles de cargo, procesos documentados, manuales, registros de CRM, código de conducta, etc.'},
  doc_metodologia:{titulo:'Metodología BPC:2026',contenido:'100 puntos en 6 dimensiones: Liderazgo 25pts, RRHH 15pts, Ventas 20pts, Marketing 15pts, Tech 10pts, Ética 15pts. Escala 1-5. Niveles: Inicial, En desarrollo, Definido, Avanzado, Optimizado.'},
  doc_glosario:{titulo:'Glosario',contenido:'NC: incumplimiento que requiere corrección. Hallazgo: brecha con riesgo. Observación: mejora sugerida. Conforme: cumple. Acción correctiva: acción para eliminar causa de NC.'},
  doc_informe_modelo:{titulo:'Modelo de Informe',contenido:'Estructura: resumen ejecutivo, datos auditoría, resultados por dimensión, matriz hallazgos, plan correctivo, conclusiones.'},
  doc_pac_guia:{titulo:'Guía PAC',contenido:'Plan de Acción Correctivo: para cada NC incluir descripción, causa raíz, acción específica, responsable, fecha, evidencia. Plazo 30 días.'},
  doc_derechos:{titulo:'Derechos del Cliente',contenido:'Confidencialidad, apelación en 10 días hábiles, informe en 15 días hábiles, acompañamiento in-situ, consultas ilimitadas.'}
};

function askMetoAssistAboutDoc(docId){
  const doc=BPC_DOCS_DATA[docId];
  if(!doc)return;
  // Open MetoAssist and send the question
  if(!_mclOpen)mclToggle();
  setTimeout(()=>{
    const input=document.getElementById('mcl-input');
    if(input){
      input.value='Necesito que me expliques en palabras simples el documento "'+doc.titulo+'". Dice lo siguiente: '+doc.contenido;
      mclSend();
    }
  },300);
}

function askMetoAssistDocQuestion(docId){
  const doc=BPC_DOCS_DATA[docId];
  if(!doc)return;
  if(!_mclOpen)mclToggle();
  setTimeout(()=>{
    const input=document.getElementById('mcl-input');
    if(input){
      input.value='Estoy leyendo el documento "'+doc.titulo+'" y tengo una duda. El documento dice: '+doc.contenido+'. Mi pregunta es: ';
      input.focus();
      // Put cursor at the end for the user to type their question
    }
  },300);
}

function renderPortalChat(){
  document.getElementById('page-content').innerHTML='<div style="text-align:center;padding:60px;color:var(--muted)"><div style="font-size:48px;margin-bottom:12px">💬</div><div style="font-family:\'Syne\',sans-serif;font-size:18px;font-weight:700;margin-bottom:8px">Chat con tu Consultor</div><div style="font-size:12px">Próximamente — Comunicación directa con el consultor asignado</div></div>';
}
function renderPortalPAC(){
  document.getElementById('page-content').innerHTML='<div style="text-align:center;padding:60px;color:var(--muted)"><div style="font-size:48px;margin-bottom:12px">📝</div><div style="font-family:\'Syne\',sans-serif;font-size:18px;font-weight:700;margin-bottom:8px">Plan de Acciones Correctivas</div><div style="font-size:12px">Próximamente — Seguimiento de no conformidades y acciones</div></div>';
}
function renderPortalCalendario(){
  document.getElementById('page-content').innerHTML='<div style="text-align:center;padding:60px;color:var(--muted)"><div style="font-size:48px;margin-bottom:12px">📅</div><div style="font-family:\'Syne\',sans-serif;font-size:18px;font-weight:700;margin-bottom:8px">Calendario de Hitos</div><div style="font-size:12px">Próximamente — Timeline de tu proceso de auditoría</div></div>';
}
function renderPortalCertificado(){
  document.getElementById('page-content').innerHTML='<div style="text-align:center;padding:60px;color:var(--muted)"><div style="font-size:48px;margin-bottom:12px">🏆</div><div style="font-family:\'Syne\',sans-serif;font-size:18px;font-weight:700;margin-bottom:8px">Certificado BPC:2026</div><div style="font-size:12px">Disponible al completar el proceso de auditoría</div></div>';
}


// ── mg-examenes.js ──


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


