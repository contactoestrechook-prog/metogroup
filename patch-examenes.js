// ═══════════════════════════════════════════════════════════════
//  patch-examenes.js — MetoGroup BPC:2026
//  Agregar UNA línea en index.html antes del </body>:
//  <script src="patch-examenes.js"></script>
//
//  QUÉ HACE:
//  1. Toda generación de código → sync inmediato a Supabase
//  2. verDetalleExamen → muestra informe IA + botón para generarlo
//  3. generarInformeExamenIA → genera informe desde el sistema
// ═══════════════════════════════════════════════════════════════

(function(){

// ── Esperar a que el sistema esté listo ──────────────────────
function whenReady(fn){
  if(document.readyState === 'complete') fn();
  else window.addEventListener('load', fn);
}

whenReady(function(){

  // ── Tomar referencias del sistema principal ──────────────
  const SB_URL = window.SUPABASE_URL || 'https://smcghyecpzzimadtuern.supabase.co';
  const SB_KEY = window.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtY2doeWVjcHp6aW1hZHR1ZXJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzODYwMTksImV4cCI6MjA4Nzk2MjAxOX0.u9OgCRMPFnuNLq4UinR1idpRykVF_VKPwIvFXgttVOw';
  const SB_H   = {'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json','Prefer':'return=minimal'};

  const EXAMEN_URL        = window.EXAMEN_URL        || 'examen-bpc.html';
  const EXAMEN_DUENO_URL  = window.EXAMEN_DUENO_URL  || 'examen-dueno.html';
  const EXAMEN_GERENTE_URL= window.EXAMEN_GERENTE_URL|| 'examen-gerente.html';

  // ── Helper: sync de un código a Supabase ─────────────────
  async function syncCodigoSB(payload){
    try{
      const res = await fetch(SB_URL+'/rest/v1/examen_codigos', {
        method: 'POST',
        headers: SB_H,
        body: JSON.stringify(payload)
      });
      if(!res.ok){
        // Si ya existe (409 conflict) hacer PATCH para actualizar
        if(res.status === 409){
          await fetch(SB_URL+'/rest/v1/examen_codigos?codigo=eq.'+payload.codigo, {
            method: 'PATCH',
            headers: SB_H,
            body: JSON.stringify({activo:true, usado:false})
          });
        }
      }
    }catch(e){
      console.warn('[patch-examenes] sync a Supabase falló para código '+payload.codigo, e);
    }
  }

  // ── Helper: generar código aleatorio ─────────────────────
  function genCodigo(){
    const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let c='';
    for(let i=0;i<6;i++) c+=chars[Math.floor(Math.random()*chars.length)];
    return c;
  }

  // ── Helper: base URL del deploy ──────────────────────────
  function baseURL(){
    return window.location.origin + window.location.pathname.replace(/[^\/]*$/, '');
  }

  // ════════════════════════════════════════════════════════
  //  PATCH 1: examGenerarCodigo (vendedores / reclutamiento)
  // ════════════════════════════════════════════════════════
  window.examGenerarCodigo = async function(tipo){
    const esAud = tipo === 'auditoria';
    const nombre  = (document.getElementById(esAud?'exam-nombre-aud':'exam-nombre-rec')||{}).value?.trim();
    const empresa = (document.getElementById(esAud?'exam-empresa-aud':'exam-empresa-rec')||{}).value?.trim();
    const audId   = esAud ? (document.getElementById('exam-aud-id')||{}).value : '';

    if(!nombre||!empresa){
      if(typeof toast==='function') toast('⚠️ Completá nombre y empresa/referencia');
      return;
    }

    const codigo = genCodigo();

    // 1. localStorage (caché local)
    const key = 'bpc_exam_codigos';
    const cache = JSON.parse(localStorage.getItem(key)||'[]');
    cache.push({id:Date.now(), codigo, nombre, empresa, activo:true, usado:false,
      tipo, auditoriaId:audId||null, fechaCreacion:new Date().toLocaleDateString('es-AR')});
    localStorage.setItem(key, JSON.stringify(cache));

    // 2. Supabase — fuente de verdad
    await syncCodigoSB({
      codigo, nombre, empresa,
      tipo, auditoria_id: audId||null,
      activo: true, usado: false,
      fecha_creacion: new Date().toISOString()
    });

    // 3. URL del examen
    const examUrl = baseURL() + EXAMEN_URL + '?' + new URLSearchParams({tipo, ...(audId?{audId}:{})});
    const msgWA = `Hola ${nombre}! Tu código para el Examen de Competencias BPC:2026 es: *${codigo}*\nIngresá en: ${examUrl}`;

    const resultDiv = document.getElementById('exam-codigo-result-'+(esAud?'aud':'rec'));
    if(resultDiv) resultDiv.innerHTML = _renderCodigoBox(nombre, codigo, msgWA, examUrl);

    if(typeof toast==='function') toast('✅ Código '+codigo+' generado y guardado');
  };

  // ════════════════════════════════════════════════════════
  //  PATCH 2: examGenerarCodigoDiag (dueño / gerente)
  // ════════════════════════════════════════════════════════
  window.examGenerarCodigoDiag = async function(tipo){
    const nombre  = (document.getElementById('exam-nombre-'+tipo)||{}).value?.trim();
    const empresa = (document.getElementById('exam-empresa-'+tipo)||{}).value?.trim();

    if(!nombre||!empresa){
      if(typeof toast==='function') toast('⚠️ Completá nombre y empresa');
      return;
    }

    const codigo   = genCodigo();
    const tipoFull = 'diagnostico_'+tipo;
    const examFile = tipo==='dueno' ? EXAMEN_DUENO_URL : EXAMEN_GERENTE_URL;
    const examUrl  = baseURL() + examFile + '?tipo='+tipoFull;
    const msgWA    = `Hola ${nombre}! Tu código para el diagnóstico MetoGroup es: *${codigo}*\nIngresá en: ${examUrl}`;

    // localStorage
    const key = 'bpc_exam_codigos';
    const cache = JSON.parse(localStorage.getItem(key)||'[]');
    cache.push({id:Date.now(), codigo, nombre, empresa, activo:true, usado:false,
      tipo:tipoFull, fechaCreacion:new Date().toLocaleDateString('es-AR')});
    localStorage.setItem(key, JSON.stringify(cache));

    // Supabase
    await syncCodigoSB({
      codigo, nombre, empresa,
      tipo: tipoFull,
      activo: true, usado: false,
      fecha_creacion: new Date().toISOString()
    });

    const resultDiv = document.getElementById('exam-codigo-result-'+tipo);
    if(resultDiv) resultDiv.innerHTML = _renderCodigoBox(nombre, codigo, msgWA, examUrl);

    if(typeof toast==='function') toast('✅ Código '+codigo+' generado y guardado');
  };

  // ════════════════════════════════════════════════════════
  //  PATCH 3: verDetalleExamen — con informe IA + botón
  // ════════════════════════════════════════════════════════
  window.verDetalleExamen = function(r){
    if(typeof r === 'string') r = JSON.parse(r);
    const areas = typeof r.areas === 'string' ? JSON.parse(r.areas||'{}') : (r.areas||{});
    const esDiag = r.tipo && r.tipo.startsWith('diagnostico');
    const nc = _nivelColor(r.nivel);

    const areaNombres = {
      cierre:'Cierre',objeciones:'Objeciones',etica:'Ética',negociacion:'Negociación',
      comunicacion:'Comunicación',gestion:'Gestión',redes:'Redes Sociales',
      liderazgo:'Liderazgo',metricas:'Métricas',procesos:'Procesos',
      coordinacion:'Coordinación',conflictos:'Conflictos',herramientas:'Herramientas',
      delegacion:'Delegación',timing:'Timing',canales:'Canales',
      decisiones:'Decisiones',rol_comercial:'Rol Comercial',finanzas:'Finanzas'
    };

    const areasHTML = Object.keys(areas).length ? `
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--muted);margin-bottom:10px">
        Resultado por ${esDiag?'dimensión':'área'}
      </div>
      ${Object.entries(areas).map(([k,v])=>{
        const pct = typeof v==='object'?(v.pct||0):v;
        const color = pct>=70?'var(--accent3)':pct>=50?'var(--warn)':'var(--danger)';
        const detalle = typeof v==='object'&&v.correctas!=null?' ('+v.correctas+'/'+v.total+')':'';
        return `<div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:12px">${areaNombres[k]||k}</span>
            <span style="font-size:12px;font-weight:700;color:${color}">${pct}%${detalle}</span>
          </div>
          <div style="height:6px;background:rgba(255,255,255,.06);border-radius:99px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:${color};border-radius:99px"></div>
          </div>
        </div>`;
      }).join('')}` : '';

    const rJSON = JSON.stringify(r).replace(/"/g,'&quot;');

    const informeSection = r.informe_ia
      ? `<div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--accent3);margin-bottom:10px">⬡ Análisis de IA</div>
         <div id="det-informe-content" style="font-size:12px;line-height:1.7;color:rgba(240,232,208,.8)">
           ${_formatInforme(r.informe_ia)}
         </div>`
      : `<div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--accent3);margin-bottom:10px">⬡ Análisis de IA</div>
         <div id="det-informe-placeholder" style="font-size:12px;color:var(--muted);margin-bottom:12px">Sin informe generado todavía.</div>
         <button onclick="generarInformeExamenIA(JSON.parse(this.dataset.r), this)"
           data-r="${rJSON}"
           style="padding:9px 18px;border:1px solid rgba(200,168,74,.35);border-radius:8px;
                  background:linear-gradient(135deg,rgba(200,168,74,.18),rgba(200,168,74,.08));
                  color:var(--accent2);font-size:12px;font-weight:700;cursor:pointer;
                  font-family:'Syne',sans-serif;letter-spacing:.5px">
           ⬡ Generar informe IA
         </button>`;

    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    ov.innerHTML = `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;
                  width:600px;max-width:95vw;max-height:90vh;overflow-y:auto">
        <div style="padding:18px 22px;border-bottom:1px solid var(--border);
                    display:flex;justify-content:space-between;align-items:center">
          <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800">
            📊 ${esDiag?'Diagnóstico':'Resultado del examen'}
          </div>
          <button onclick="this.closest('div[style*=fixed]').remove()"
            style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:18px">✕</button>
        </div>
        <div style="padding:22px">
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
            <div style="width:70px;height:70px;border-radius:50%;
                        background:rgba(212,175,55,0.1);border:3px solid ${nc};
                        display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:900;color:${nc}">
                ${r.score}%
              </div>
            </div>
            <div>
              <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800">${r.nombre}</div>
              <div style="font-size:12px;color:var(--muted)">
                ${r.empresa||'—'} · ${r.fecha?new Date(r.fecha).toLocaleDateString('es-AR'):'—'}
              </div>
              <div style="margin-top:6px;background:rgba(212,175,55,0.1);color:${nc};
                          border-radius:20px;padding:3px 12px;font-size:11px;font-weight:700;
                          display:inline-block">${r.nivel}</div>
            </div>
          </div>

          ${areasHTML}

          <div id="det-informe-wrap"
            style="margin-top:18px;background:rgba(212,175,55,.04);
                   border:1px solid rgba(212,175,55,.12);border-radius:12px;padding:16px">
            ${informeSection}
          </div>

          <div style="margin-top:14px;padding:10px;background:var(--surface2);
                      border-radius:8px;font-size:11px;color:var(--muted)">
            Tipo: ${r.tipo||'—'} · Código: ${r.codigo||'—'} ·
            ${r.correctas!=null?r.correctas+'/'+r.total+' resp. correctas':r.total+' preguntas'}
          </div>
        </div>
      </div>`;

    ov.onclick = e=>{ if(e.target===ov) ov.remove(); };
    document.body.appendChild(ov);
  };

  // ════════════════════════════════════════════════════════
  //  PATCH 4: generarInformeExamenIA — generar desde sistema
  // ════════════════════════════════════════════════════════
  window.generarInformeExamenIA = async function(r, btnEl){
    const apiKey = window.ANTHROPIC_API_KEY || '';
    if(!apiKey || !apiKey.startsWith('sk-')){
      if(typeof toast==='function') toast('❌ Configurá la API key de Claude');
      return;
    }
    if(typeof r === 'string') r = JSON.parse(r);

    if(btnEl){ btnEl.disabled=true; btnEl.textContent='⬡ Generando...'; }

    const wrap = document.getElementById('det-informe-wrap');
    if(wrap){
      wrap.innerHTML = `
        <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--accent3);margin-bottom:10px">⬡ Análisis de IA</div>
        <div style="display:flex;align-items:center;gap:10px;font-size:12px;color:var(--muted)">
          <div style="width:12px;height:12px;border:2px solid rgba(212,175,55,.2);border-top-color:var(--accent);
                      border-radius:50%;animation:spin .8s linear infinite;flex-shrink:0"></div>
          Generando análisis...
        </div>`;
    }

    const areas = typeof r.areas==='string' ? JSON.parse(r.areas||'{}') : (r.areas||{});
    const areaNombres = {
      cierre:'Cierre',objeciones:'Objeciones',etica:'Ética',negociacion:'Negociación',
      comunicacion:'Comunicación',gestion:'Gestión',redes:'Redes Sociales',
      liderazgo:'Liderazgo',metricas:'Métricas',procesos:'Procesos',
      coordinacion:'Coordinación',conflictos:'Conflictos',herramientas:'Herramientas',
      delegacion:'Delegación',timing:'Timing',canales:'Canales',
      decisiones:'Decisiones',rol_comercial:'Rol Comercial',finanzas:'Finanzas'
    };
    const areasTexto = Object.entries(areas).map(([k,v])=>{
      const pct = typeof v==='object'?(v.pct||0):v;
      return `${areaNombres[k]||k}: ${pct}%`;
    }).join('\n');

    const esDueno   = r.tipo==='diagnostico_dueno';
    const esGerente = r.tipo==='diagnostico_gerente';

    let prompt;
    if(esDueno){
      prompt = `Sos consultor senior de MetoGroup Latam. Analizás diagnóstico de liderazgo comercial de un dueño/director.
DATOS: ${r.nombre} / ${r.empresa} / Score: ${r.score}% / Nivel: ${r.nivel}
DIMENSIONES:\n${areasTexto}
Texto plano, sin markdown:
PERFIL DIRECTIVO\n[2 oraciones.]\nDIMENSIONES FUERTES\n[Top 2 con impacto en negocio.]\nBRECHAS CRÍTICAS\n[Bottom 2 con impacto concreto.]\nRECOMENDACIÓN ESTRATÉGICA\n[1 párrafo, 2-3 acciones urgentes.]
Español rioplatense, máx 200 palabras.`;
    } else if(esGerente){
      prompt = `Sos consultor de MetoGroup Latam. Analizás diagnóstico de un gerente comercial.
DATOS: ${r.nombre} / ${r.empresa} / Score: ${r.score}% / Nivel: ${r.nivel}
DIMENSIONES:\n${areasTexto}
Texto plano, sin markdown:
PERFIL DE GESTIÓN\n[2 oraciones.]\nDIMENSIONES DESTACADAS\n[Top 2.]\nÁREAS DE MEJORA CRÍTICAS\n[Bottom 2.]\nRECOMENDACIÓN PARA LA DIRECCIÓN\n[1 párrafo.]
Español rioplatense, máx 200 palabras.`;
    } else {
      prompt = `Sos evaluador de MetoGroup Latam. Analizás examen BPC:2026 de un vendedor. 7 áreas: Cierre, Objeciones, Negociación, Ética, Comunicación, Gestión, Redes Sociales.
DATOS: ${r.nombre} / ${r.empresa} / Score: ${r.score}% / Nivel: ${r.nivel}
ÁREAS:\n${areasTexto}
Texto plano, sin markdown:
EVALUACIÓN GENERAL\n[2 oraciones.]\nFORTALEZAS DETECTADAS\n[Top 2-3. Si Redes Sociales es fuerte, mencionalo.]\nÁREAS DE DESARROLLO PRIORITARIAS\n[Bottom 2-3 con acción concreta. Si Redes es baja, señalá impacto en prospección digital.]\nRECOMENDACIÓN PARA EL EQUIPO\n[1 párrafo para el supervisor.]
Español rioplatense, máx 260 palabras.`;
    }

    try{
      const resp = await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:600,messages:[{role:'user',content:prompt}]})
      });
      const data  = await resp.json();
      const texto = data.content?.[0]?.text || '';

      if(texto && wrap){
        wrap.innerHTML = `
          <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--accent3);margin-bottom:10px">⬡ Análisis de IA</div>
          <div style="font-size:12px;line-height:1.7;color:rgba(240,232,208,.8)">
            ${_formatInforme(texto)}
          </div>`;
      }

      // Guardar en Supabase si tiene id
      if(r.id && texto){
        try{
          await fetch(SB_URL+'/rest/v1/examen_resultados?id=eq.'+r.id,{
            method:'PATCH',
            headers:{...SB_H,'Prefer':'return=minimal'},
            body:JSON.stringify({informe_ia:texto, informe_ia_fecha:new Date().toISOString()})
          });
          if(typeof toast==='function') toast('✅ Informe IA guardado');
        }catch(e){}
      }

    }catch(e){
      console.error('[patch-examenes] error generando informe IA:', e);
      if(wrap) wrap.innerHTML += `<div style="font-size:11px;color:var(--danger);margin-top:8px">❌ Error al generar el informe.</div>`;
      if(typeof toast==='function') toast('❌ Error generando informe IA');
    }
  };

  // ════════════════════════════════════════════════════════
  //  HELPERS INTERNOS
  // ════════════════════════════════════════════════════════
  function _nivelColor(n){
    if(!n) return 'var(--muted)';
    const s = n.toUpperCase();
    if(s==='EXPERTO'||s==='ESTRATÉGICO'||s==='LÍDER COMERCIAL') return '#c8a84a';
    if(s==='COMPETENTE'||s==='GESTIONADO'||s==='GERENTE SÓLIDO') return 'var(--accent3)';
    if(s.includes('DESARROLLO')) return 'var(--warn)';
    return 'var(--danger)';
  }

  function _formatInforme(texto){
    const HEADERS = /^(EVALUACIÓN GENERAL|FORTALEZAS DETECTADAS|ÁREAS DE DESARROLLO|RECOMENDACIÓN PARA EL EQUIPO|PERFIL DIRECTIVO|DIMENSIONES FUERTES|BRECHAS CRÍTICAS|RECOMENDACIÓN ESTRATÉGICA|PERFIL DE GESTIÓN|DIMENSIONES DESTACADAS|ÁREAS DE MEJORA CRÍTICAS|RECOMENDACIÓN PARA LA DIRECCIÓN)/i;
    return texto.split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{
      if(HEADERS.test(l))
        return `<div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--accent3);margin:12px 0 5px;font-weight:700">${l}</div>`;
      return `<div style="margin-bottom:4px">${l}</div>`;
    }).join('');
  }

  function _renderCodigoBox(nombre, codigo, msgWA, examUrl){
    const msgWAesc = msgWA.replace(/'/g,"\\'");
    return `<div style="background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.25);border-radius:10px;padding:14px 16px">
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <div>
          <div style="font-size:10px;color:var(--muted);margin-bottom:4px">
            Código para <strong style="color:var(--text)">${nombre}</strong>
            <span style="margin-left:8px;font-size:9px;color:#4ade80">✓ Guardado en sistema</span>
          </div>
          <div style="font-family:'Syne',sans-serif;font-size:28px;font-weight:900;color:var(--accent);letter-spacing:4px">${codigo}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-left:auto">
          <button onclick="navigator.clipboard.writeText('${msgWAesc}');if(typeof toast==='function')toast('✅ Copiado para WhatsApp')"
            class="btn btn-secondary btn-sm">📱 Copiar para WhatsApp</button>
          <button onclick="navigator.clipboard.writeText('${examUrl}');if(typeof toast==='function')toast('✅ Link copiado')"
            class="btn btn-secondary btn-sm">🔗 Copiar link</button>
          <a href="${examUrl}" target="_blank" class="btn btn-primary btn-sm">Abrir examen ↗</a>
        </div>
      </div>
    </div>`;
  }

  console.log('[patch-examenes] ✅ Cargado — códigos sincronizan a Supabase, informe IA activo');

}); // end whenReady

})(); // end IIFE
