
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
  document.getElementById('metoasist-orb').style.display='flex';
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
