/* Área privada del prototipo. Todo sale de UCP.api (contrato de API) y UCP.sim (reglas). */
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const titulo = (s) => String(s || '').toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());
  const soles = (n) => 'S/ ' + Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const DIAS_C = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const fechaTxt = (iso) => { if (!iso) return 'Por anunciar'; const [y, m, d] = iso.slice(0, 10).split('-'); return `${d}/${m}/${y}`; };
  const PASOS = [['avance', 'Mi avance'], ['malla', 'Mi malla'], ['verano', 'Cursos de verano'], ['horario', 'Mi horario'], ['solicitud', 'Mi solicitud']];
  const ESTADO_OFERTA = { ofertado: ['Oferta confirmada', 'et-verde'], por_confirmar: ['Apertura por confirmar', 'et-gris'], cerrado: ['Cerrado', 'et-rojo'] };

  let D = null, M = null, OF = [], S = { paso: 'avance', filtro: 'disponible', sel: new Map(), mallaSel: null, solicitud: null, editando: false };

  const listaDias = (ds) => { const n = ds.slice().sort().map((d) => DIAS[d].toLowerCase()); return n.length > 1 ? n.slice(0, -1).join(', ') + ' y ' + n.at(-1) : n[0]; };
  const horarioTxt = (ses) => (ses || []).map((s) => `${DIAS_C[s.dia]} ${s.hora_inicio}–${s.hora_fin}`).join(' · ');

  // ---------------- Ingreso ----------------
  function abrirSelector() {
    if (UCP.config.modo !== 'prototipo') { location.href = '/auth/google'; return; }
    $('modal').innerHTML = `<div class="modal-fondo" role="dialog" aria-modal="true" aria-labelledby="m-t"><div class="modal">
      <h2 id="m-t" style="font-size:22px">Ingreso de demostración</h2>
      <p class="intro" style="margin-bottom:6px">En la versión real, aquí se abre el inicio de sesión de Google con tu cuenta @continental.edu.pe. Para el prototipo, elige un estudiante de ejemplo:</p>
      ${UC_PROTO.perfiles.map((p) => `<button type="button" class="perfil-op" data-perfil="${esc(p.clave)}"><b>${esc(titulo(p.perfil.nombres + ' ' + p.perfil.apellidos))}</b><span>${esc(p.titulo)} · ${esc(p.perfil.carrera.nombre)}</span></button>`).join('')}
      <div style="margin-top:16px;text-align:right"><button type="button" class="btn-texto" data-cerrar-modal>Cancelar</button></div></div></div>`;
    const primero = document.querySelector('.perfil-op'); if (primero) primero.focus();
  }

  async function cargar() {
    const [perfil, historial, malla, oferta, parametros, calendario, habilitacion, solicitud] = await Promise.all([
      UCP.api.perfil(), UCP.api.historial(), UCP.api.malla(), UCP.api.oferta(), UCP.api.parametros(), UCP.api.calendario(), UCP.api.habilitacion(), UCP.api.solicitudPrevia()]);
    D = { perfil, historial, malla, oferta, parametros, calendario, habilitacion };
    M = UCP.sim.preparar({ malla, historial, oferta, parametros });
    OF = UCP.sim.clasificarOferta(M);
    S.solicitud = solicitud; S.sel = new Map();
    if (solicitud) solicitud.cursos.forEach((c) => { const o = OF.find((x) => x.codigo === c.codigo); if (o) S.sel.set(c.codigo, itemDe(o, c.seccion)); });
    $('ingreso').classList.add('oculto'); $('app').classList.remove('oculto'); $('usuario').classList.remove('oculto');
    $('avatar').textContent = (perfil.nombres[0] || '') + (perfil.apellidos[0] || '');
    pintarBienvenida(); ir('avance');
  }

  function itemDe(o, seccion) {
    const sec = (o.secciones || []).find((s) => s.seccion === seccion) || null;
    return { codigo: o.codigo, nombre: o.nombre, creditos: o.creditos, ciclo: o.ciclo, seccion: sec ? sec.seccion : null, sesiones: sec ? sec.sesiones : [], disponibilidad: o.disponibilidad, estado: o.estado, recuperacion: o.recuperacion };
  }

  // ---------------- Cabecera ----------------
  function pintarBienvenida() {
    const p = D.perfil, pct = Math.round((M.credAprob / D.malla.creditos_totales) * 100);
    $('bienvenida').innerHTML = `<h1>Hola, ${esc(titulo(p.nombres.split(' ')[0]))}</h1>
      <p>${esc(p.carrera.nombre)} · ${esc(p.plan.nombre)} · ${p.ciclo_relativo}.° ciclo · Periodo ${esc(p.periodo_actual)}</p>
      <div class="kpis">
        <div class="kpi acento"><small>Avance de tu carrera</small><b>${pct}%</b></div>
        <div class="kpi"><small>Créditos aprobados</small><b>${M.credAprob} de ${D.malla.creditos_totales}</b></div>
        <div class="kpi"><small>Te faltan</small><b>${M.credFaltan} créditos</b></div>
        <div class="kpi"><small>Llevas este periodo</small><b>${M.enCurso.size} cursos</b></div>
      </div>
      <div class="barra-avance" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Avance de tu carrera"><i style="width:${pct}%"></i></div>`;
  }

  function ir(paso) {
    S.paso = paso;
    $('pasos-nav').innerHTML = PASOS.map(([id, t], i) => `<button type="button" data-paso="${id}" ${id === paso ? 'aria-current="step"' : ''}><span>${i + 1}</span>${t}</button>`).join('');
    pintarVista(); window.scrollTo({ top: 0 });
  }

  const avisoHabilitacion = () => D.habilitacion.habilitado ? '' : `<p class="aviso aviso-rojo"><b>Tienes un impedimento de matrícula.</b> ${esc(D.habilitacion.mensaje || '')}</p>`;

  function pintarVista() {
    const f = { avance: vAvance, malla: vMalla, verano: vVerano, horario: vHorario, solicitud: vSolicitud }[S.paso];
    const conSel = ['verano', 'horario'].includes(S.paso);
    $('vista').innerHTML = avisoHabilitacion() + (conSel ? `<div class="vista-grid con-seleccion"><div>${f()}</div><aside class="seleccion" aria-label="Mi selección">${vSeleccion()}</aside></div>` : f());
    pintarBarraMovil();
  }

  function pintarBarraMovil() {
    const b = $('barra-movil'), n = S.sel.size;
    if (!n || S.paso === 'solicitud') { b.classList.add('oculto'); return; }
    const cr = [...S.sel.values()].reduce((s, i) => s + i.creditos, 0);
    b.classList.remove('oculto');
    b.innerHTML = `<span><b>${n} ${n === 1 ? 'curso' : 'cursos'}</b> · ${cr} de ${D.parametros.creditos_max_verano} créditos</span><button type="button" class="btn btn-acento btn-chico" data-paso="solicitud">Revisar solicitud</button>`;
  }

  // ---------------- 1. Avance ----------------
  function vAvance() {
    const cont = { aprobado: M.aprob.size, en_curso: M.enCurso.size, desaprobado: M.desap.size };
    const pendientes = D.malla.cursos.filter((c) => UCP.sim.estadoCurso(M, c.codigo) === 'pendiente').length + cont.desaprobado;
    const disp = OF.filter((o) => o.disponibilidad.tipo === 'disponible'), cond = OF.filter((o) => o.disponibilidad.tipo === 'condicional');
    const recup = OF.filter((o) => o.recuperacion && o.disponibilidad.tipo !== 'bloqueado');
    const claves = D.malla.cursos.filter((c) => c.curso_clave && UCP.sim.estadoCurso(M, c.codigo) !== 'aprobado');
    const pr = UCP.sim.proyeccion(M, D.parametros.creditos_max_verano);
    const recs = [];
    recup.forEach((o) => recs.push(`Recupera <b>${esc(o.nombre)}</b> este verano: así no se retrasan los cursos que dependen de él.`));
    claves.forEach((c) => recs.push(`<b>${esc(c.nombre)}</b> es un curso clave: habilita ${UCP.sim.dependientes(M, c.codigo)} asignaturas. No lo postergues.`));
    if (disp.length) recs.push(`Puedes llevar <b>${disp.length} ${disp.length === 1 ? 'curso' : 'cursos'}</b> en el verano 2027${cond.length ? `, y ${cond.length} más si apruebas lo que llevas ahora` : ''}.`);
    return `<h2>Mi avance</h2><p class="intro">Tu situación según tu historial académico al periodo ${esc(D.perfil.periodo_actual)}.</p>
      <div class="rejilla-3">
        <div class="panel"><h3>Tu historial</h3><ul class="lista-check"><li>${cont.aprobado} cursos aprobados</li><li>${cont.en_curso} cursos en curso (${M.credEnCurso} créditos)</li><li>${pendientes} cursos por llevar${cont.desaprobado ? `, ${cont.desaprobado} por recuperar` : ''}</li></ul></div>
        <div class="panel"><h3>Te recomendamos</h3>${recs.length ? `<ul class="lista-pasos">${recs.slice(0, 4).map((r) => `<li>${r}</li>`).join('')}</ul>` : '<p>Sigue con tu plan de estudios.</p>'}</div>
        <div class="panel"><h3>¿Cuándo podrías terminar?</h3><div class="proy"><div><small>Sin verano</small><b>${esc(pr.sinVerano)}</b></div><div><small>Con ${D.parametros.creditos_max_verano} créditos en verano</small><b>${esc(pr.conVerano)}</b></div></div>
          <p class="explica">Referencial: supone que apruebas lo que llevas ahora y hasta 25 créditos por semestre. No es la fecha de titulación.</p></div>
      </div>
      <div class="acciones"><button type="button" class="btn btn-morado" data-paso="verano">Simular mi verano</button><button type="button" class="btn btn-borde" data-paso="malla">Ver mi malla</button></div>`;
  }

  // ---------------- 2. Malla ----------------
  function vMalla() {
    const porCiclo = {}; D.malla.cursos.forEach((c) => { (porCiclo[c.ciclo] ||= []).push(c); });
    const etiqueta = { aprobado: 'Aprobado', en_curso: 'En curso', desaprobado: 'Por recuperar', pendiente: 'Pendiente' };
    let detalle = '<p class="explica">Toca un curso para ver sus prerrequisitos.</p>';
    if (S.mallaSel) {
      const c = M.cursos[S.mallaSel], req = (c.prerrequisitos || []).flat().map((k) => M.cursos[k] ? M.cursos[k].nombre : k);
      const o = OF.find((x) => x.codigo === c.codigo);
      detalle = `<h3>${esc(c.nombre)}</h3><p class="cv-meta">${esc(c.codigo)} · ${c.creditos} créditos · Ciclo ${c.ciclo} · ${etiqueta[UCP.sim.estadoCurso(M, c.codigo)]}</p>
        <p><b>Prerrequisitos:</b> ${req.length ? esc(req.join(', ')) : 'ninguno'}</p>
        <p><b>Habilita:</b> ${UCP.sim.dependientes(M, c.codigo)} asignaturas posteriores${c.curso_clave ? ' · <span class="et et-ambar">Curso clave</span>' : ''}</p>
        <p><b>En verano 2027:</b> ${o ? `${esc(ESTADO_OFERTA[o.estado][0])}` : c.se_dicta_en_verano ? 'No está en la oferta de este verano' : 'No se dicta en verano'}</p>`;
    }
    return `<h2>Mi malla curricular</h2><p class="intro">${esc(D.malla.nombre)} · ${D.malla.ciclos} ciclos · ${D.malla.creditos_totales} créditos.</p>
      <div class="leyenda-malla"><span><i class="e-aprobado"></i>Aprobado</span><span><i class="e-en_curso"></i>En curso</span><span><i class="e-desaprobado"></i>Por recuperar</span><span><i class="e-pendiente"></i>Pendiente</span></div>
      <div class="malla">${Object.keys(porCiclo).sort((a, b) => a - b).map((ci) => `<div class="malla-col"><h4>Ciclo ${ci}</h4>${porCiclo[ci].map((c) => { const e = UCP.sim.estadoCurso(M, c.codigo); return `<button type="button" class="chip-curso e-${e}" data-malla="${esc(c.codigo)}" aria-pressed="${S.mallaSel === c.codigo}">${esc(c.nombre)}<small>${c.creditos} cr. · ${etiqueta[e]}</small></button>`; }).join('')}</div>`).join('')}</div>
      <div class="panel" style="margin-top:16px" aria-live="polite">${detalle}</div>`;
  }

  // ---------------- 3. Cursos de verano ----------------
  function vVerano() {
    const grupos = { disponible: OF.filter((o) => o.disponibilidad.tipo === 'disponible'), condicional: OF.filter((o) => o.disponibilidad.tipo === 'condicional'), bloqueado: OF.filter((o) => o.disponibilidad.tipo === 'bloqueado') };
    const nombres = { disponible: 'Puedes llevarlos', condicional: 'Si apruebas lo que llevas ahora', bloqueado: 'Aún no disponibles' };
    const lista = grupos[S.filtro];
    return `<h2>Cursos de verano 2027</h2><p class="intro">Oferta ${D.oferta.publicacion === 'oficial' ? 'oficial' : 'preliminar'}. Elige una sección por curso: validamos créditos, prerrequisitos y cruces de horario mientras armas tu selección.</p>
      <div class="filtro-verano" role="group" aria-label="Filtrar cursos">${Object.keys(grupos).map((k) => `<button type="button" class="chip" data-filtro="${k}" aria-pressed="${S.filtro === k}">${nombres[k]} (${grupos[k].length})</button>`).join('')}</div>
      ${lista.length ? lista.map(cursoVerano).join('') : '<p class="vacio">No hay cursos en este grupo.</p>'}`;
  }

  function cursoVerano(o) {
    const elegido = S.sel.get(o.codigo), bloqueado = o.disponibilidad.tipo === 'bloqueado';
    const faltan = o.disponibilidad.faltan.map((k) => M.cursos[k] ? M.cursos[k].nombre : k).join(', ');
    const [eTxt, eCls] = ESTADO_OFERTA[o.estado] || ['Por confirmar', 'et-gris'];
    const etq = [`<span class="et ${eCls}">${eTxt}</span>`];
    if (o.recuperacion) etq.push('<span class="et et-rojo">Recuperación</span>');
    if (o.curso_clave) etq.push('<span class="et et-ambar">Curso clave</span>');
    if (o.disponibilidad.tipo === 'condicional') etq.push('<span class="et et-lila">Con condición</span>');
    const secciones = (o.secciones || []).length
      ? `<div class="secciones">${o.secciones.map((s) => { const act = elegido && elegido.seccion === s.seccion; return `<div class="seccion-op ${act ? 'activa' : ''}"><div><b>Sección ${esc(s.seccion)}</b><br><span>${esc(horarioTxt(s.sesiones))} · ${s.vacantes - s.inscritos} vacantes de ${s.vacantes}</span></div>
          ${bloqueado ? '' : act ? `<button type="button" class="btn btn-borde btn-chico" data-quitar="${esc(o.codigo)}">Quitar</button>` : `<button type="button" class="btn btn-morado btn-chico" data-elegir="${esc(o.codigo)}" data-seccion="${esc(s.seccion)}">${elegido ? 'Cambiar a esta' : 'Elegir'}</button>`}</div>`; }).join('')}</div>`
      : `<div class="seccion-op"><div><b>Sin horario todavía</b><br><span>Se abrirá si hay suficientes estudiantes interesados.</span></div>${bloqueado ? '' : elegido ? `<button type="button" class="btn btn-borde btn-chico" data-quitar="${esc(o.codigo)}">Quitar</button>` : `<button type="button" class="btn btn-morado btn-chico" data-elegir="${esc(o.codigo)}" data-seccion="">Solicitar apertura</button>`}</div>`;
    return `<article class="curso-verano ${elegido ? 'elegido' : ''}"><div class="cv-cab"><div><h3>${esc(o.nombre)}</h3><p class="cv-meta">${esc(o.codigo)} · ${o.creditos} créditos · Ciclo ${o.ciclo}</p></div></div>
      <div class="etqs">${etq.join('')}</div>
      ${o.disponibilidad.tipo === 'condicional' ? `<p class="req-cond">Disponible si apruebas ${esc(faltan)} en el periodo actual.</p>` : ''}
      ${bloqueado ? `<p class="req-falta">Te falta aprobar: ${esc(faltan)}.</p>` : ''}
      ${secciones}</article>`;
  }

  // ---------------- Mi selección (panel lateral) ----------------
  function vSeleccion() {
    const items = [...S.sel.values()], v = UCP.sim.validar(M, S.sel, D.habilitacion), pr = UCP.sim.proyeccion(M, v.creditos);
    const enCruce = new Set(v.cruces.flatMap((c) => [c[0], c[1]]));
    return `<div class="panel"><h3>Mi selección</h3>
      ${items.length ? items.map((i) => `<div class="sel-item"><div><b>${esc(i.nombre)}</b><small>${i.creditos} cr. · ${i.seccion ? 'Sección ' + esc(i.seccion) : 'Solicitud de apertura'}${enCruce.has(i.codigo) ? ' · <span style="color:#7A2419;font-weight:700">cruce</span>' : ''}</small></div><button type="button" class="btn-texto" data-quitar="${esc(i.codigo)}" aria-label="Quitar ${esc(i.nombre)}">Quitar</button></div>`).join('') : '<p class="explica">Aún no eliges cursos.</p>'}
      <div class="creditos-barra ${v.creditos > v.max ? 'excede' : ''}"><i style="width:${Math.min(100, (v.creditos / v.max) * 100)}%"></i></div>
      <p class="explica" style="margin:0">${v.creditos} de ${v.max} créditos</p>
      <ul class="valid">${v.validaciones.slice(1).map((x) => `<li><span class="m ${!x.ok ? 'm-no' : x.aviso ? 'm-av' : 'm-ok'}">${!x.ok ? '!' : x.aviso ? 'i' : '✓'}</span>${esc(x.texto)}</li>`).join('')}</ul>
      <div class="proy"><div><small>Terminarías sin verano</small><b>${esc(pr.sinVerano)}</b></div><div><small>Con esta selección</small><b>${esc(pr.conVerano)}</b></div></div>
      <div class="acciones" style="margin-top:8px"><button type="button" class="btn btn-borde btn-chico" data-paso="horario">Ver horario</button><button type="button" class="btn btn-morado btn-chico" data-paso="solicitud" ${items.length ? '' : 'disabled'}>Revisar y enviar</button></div></div>`;
  }

  // ---------------- 4. Horario ----------------
  function vHorario() {
    const items = [...S.sel.values()], cruces = UCP.sim.cruces(items), enCruce = new Set(cruces.flatMap((c) => [c[0], c[1]]));
    const H0 = 7, H1 = 23, alto = 30, min = (h) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
    const horas = []; for (let h = H0; h < H1; h++) horas.push(h);
    const dias = [1, 2, 3, 4, 5, 6];
    const col = (d) => {
      // Carriles: las sesiones que se superponen el mismo día se dibujan lado a lado
      const ses = items.flatMap((i) => (i.sesiones || []).filter((s) => s.dia === d).map((s) => ({ i, s, a: min(s.hora_inicio), b: min(s.hora_fin) }))).sort((x, y) => x.a - y.a);
      ses.forEach((x, k) => { const usados = ses.slice(0, k).filter((y) => y.a < x.b && x.a < y.b).map((y) => y.carril); x.carril = 0; while (usados.includes(x.carril)) x.carril++; });
      ses.forEach((x) => { x.total = 1 + Math.max(...ses.filter((y) => y.a < x.b && x.a < y.b).map((y) => y.carril)); });
      return `<div class="h-dia" style="height:${(H1 - H0) * alto}px;background:repeating-linear-gradient(to bottom,transparent 0,transparent ${alto - 1}px,var(--linea) ${alto - 1}px,var(--linea) ${alto}px)">${ses.map((x) => `<div class="bloque-h ${enCruce.has(x.i.codigo) ? 'cruce' : ''}" style="top:${((x.a - H0 * 60) / 60) * alto}px;height:${((x.b - x.a) / 60) * alto - 2}px;left:calc(${(100 / x.total) * x.carril}% + 3px);right:auto;width:calc(${100 / x.total}% - 6px)"><b>${esc(x.i.nombre)}</b><br>${esc(x.s.hora_inicio)}–${esc(x.s.hora_fin)} · ${esc(x.i.seccion)}</div>`).join('')}</div>`;
    };
    const sinH = items.filter((i) => !i.seccion);
    return `<h2>Mi horario de verano</h2><p class="intro">Así quedaría tu semana con las secciones que elegiste. Los bloques en rojo se cruzan.</p>
      ${cruces.length ? `<p class="aviso aviso-rojo"><b>Hay cruces de horario:</b> ${UCP.sim.paresCruce(cruces).map((p) => `${esc(M.cursos[p.a].nombre)} y ${esc(M.cursos[p.b].nombre)} (${esc(listaDias(p.dias))})`).join('; ')}. Cambia de sección o quita uno de los cursos.</p>` : items.length ? '<p class="aviso aviso-verde">Tu horario no tiene cruces.</p>' : ''}
      ${items.length ? `<div class="horario-scroll"><div class="horario"><div class="h-cab"></div>${dias.map((d) => `<div class="h-cab">${DIAS[d]}</div>`).join('')}
        <div>${horas.map((h) => `<div class="h-hora">${String(h).padStart(2, '0')}:00</div>`).join('')}</div>${dias.map(col).join('')}</div></div>` : '<p class="vacio">Elige cursos en el paso 3 para ver tu horario.</p>'}
      ${sinH.length ? `<p class="aviso aviso-lila" style="margin-top:16px"><b>Sin horario todavía:</b> ${esc(sinH.map((i) => i.nombre).join(', '))}. Se incluyen en tu solicitud como pedido de apertura.</p>` : ''}`;
  }

  // ---------------- 5. Solicitud ----------------
  function vSolicitud() {
    if (S.solicitud && !S.editando) return vConfirmacion();
    const items = [...S.sel.values()], v = UCP.sim.validar(M, S.sel, D.habilitacion), pr = UCP.sim.proyeccion(M, v.creditos);
    const costo = D.parametros.costo_credito_verano_ejemplo;
    if (!items.length) return `<h2>Mi solicitud</h2><p class="vacio">Todavía no elegiste cursos. <button type="button" class="btn-texto" data-paso="verano">Ir a cursos de verano</button></p>`;
    return `<h2>Revisa y envía tu solicitud</h2><p class="intro">Tu solicitud nos ayuda a decidir qué cursos abrir. <b>No es una matrícula:</b> te matriculas después en la intranet, en las fechas oficiales.</p>
      <div class="vista-grid con-seleccion"><div>
        <div class="panel" style="overflow-x:auto"><table class="tabla-sol"><thead><tr><th>Curso</th><th>Créditos</th><th>Sección y horario</th><th>Estado de la oferta</th></tr></thead><tbody>
          ${items.map((i) => `<tr><td><b>${esc(i.nombre)}</b><br><span class="cv-meta">${esc(i.codigo)}${i.recuperacion ? ' · recuperación' : ''}${i.disponibilidad.tipo === 'condicional' ? ' · con condición' : ''}</span></td><td>${i.creditos}</td><td>${i.seccion ? `${esc(i.seccion)}<br><span class="cv-meta">${esc(horarioTxt(i.sesiones))}</span>` : 'Solicitud de apertura'}</td><td>${esc((ESTADO_OFERTA[i.estado] || ['Por confirmar'])[0])}</td></tr>`).join('')}
        </tbody></table></div>
        <div class="panel" style="margin-top:16px"><h3>Validaciones</h3><ul class="valid">${v.validaciones.map((x) => `<li><span class="m ${!x.ok ? 'm-no' : x.aviso ? 'm-av' : 'm-ok'}">${!x.ok ? '!' : x.aviso ? 'i' : '✓'}</span>${esc(x.texto)}</li>`).join('')}</ul></div>
      </div><aside class="seleccion"><div class="panel">
        <h3>Resumen</h3>
        <p><b>${v.creditos} créditos</b> en ${items.length} ${items.length === 1 ? 'curso' : 'cursos'}</p>
        <p>Costo referencial: <b>${soles(v.creditos * costo)}</b><br><span class="explica">Ejemplo a ${soles(costo)} por crédito. El monto real depende de tu escala de pagos.</span></p>
        <div class="proy"><div><small>Sin verano</small><b>${esc(pr.sinVerano)}</b></div><div><small>Con esta solicitud</small><b>${esc(pr.conVerano)}</b></div></div>
        <label class="casilla"><input type="checkbox" id="acepta"> <span>Autorizo el uso de mis datos para registrar mi solicitud y ser contactado sobre la apertura de cursos.</span></label>
        <p class="mensaje error" id="msg-sol" role="status" aria-live="polite">${v.puedeEnviar ? '' : 'Corrige lo marcado con ! para poder enviar.'}</p>
        <button type="button" class="btn btn-morado" id="btn-enviar" ${v.puedeEnviar ? '' : 'disabled'} style="width:100%">${S.solicitud ? 'Actualizar mi solicitud' : 'Enviar mi solicitud'}</button>
        <button type="button" class="btn-texto" data-paso="verano" style="width:100%">Seguir editando</button>
      </div></aside></div>`;
  }

  function vConfirmacion() {
    const s = S.solicitud, ev = (k) => (D.calendario.eventos.find((e) => e.evento === k) || {});
    const mat = ev('matricula'), conf = ev('confirmacion_oferta');
    return `<h2>Tu solicitud está registrada</h2>
      <div class="vista-grid con-seleccion"><div class="confirmacion">
        <p style="margin:0">Número de solicitud</p><p class="numero">${esc(s.id)}</p>
        <p>${s.cursos.length} ${s.cursos.length === 1 ? 'curso' : 'cursos'} · ${s.creditos} créditos · registrada el ${fechaTxt(s.fecha)}</p>
        <h3 style="margin-top:18px">Qué sigue</h3>
        <ol class="lista-pasos">
          <li><b>Confirmación de la oferta</b> (${fechaTxt(conf.inicio)}): te avisaremos qué cursos se abren.</li>
          <li><b>Revisa tus pagos</b> con Acompañamiento al estudiante si tienes algún pendiente.</li>
          <li><b>Matricúlate en la intranet</b> (${fechaTxt(mat.inicio)} al ${fechaTxt(mat.fin)}) con estos cursos y secciones.</li>
        </ol>
        <div class="acciones"><button type="button" class="btn btn-acento" id="btn-pdf">Descargar constancia y horario (PDF)</button><a class="btn btn-borde-claro" href="${esc(UCP.config.intranet)}" target="_blank" rel="noopener">Ir a la intranet</a></div>
      </div><aside class="seleccion"><div class="panel"><h3>Tus cursos</h3>
        ${s.cursos.map((c) => `<div class="sel-item"><div><b>${esc(c.nombre)}</b><small>${c.creditos} cr. · ${c.seccion ? 'Sección ' + esc(c.seccion) : 'Solicitud de apertura'}</small></div></div>`).join('')}
        <button type="button" class="btn btn-borde" id="btn-editar" style="width:100%;margin-top:14px">Modificar mi solicitud</button></div></aside></div>`;
  }

  async function enviar() {
    if (!$('acepta').checked) { $('msg-sol').textContent = 'Marca la autorización para enviar tu solicitud.'; return; }
    const v = UCP.sim.validar(M, S.sel, D.habilitacion); if (!v.puedeEnviar) return;
    $('btn-enviar').disabled = true; $('msg-sol').textContent = 'Enviando…';
    const cursos = [...S.sel.values()].map((i) => ({ codigo: i.codigo, nombre: i.nombre, creditos: i.creditos, seccion: i.seccion, sesiones: i.sesiones, estado: i.estado, condicional: i.disponibilidad.tipo === 'condicional' }));
    const payload = { estudiante_id: D.perfil.id, periodo: D.oferta.periodo, cursos, creditos: v.creditos, autorizacion_datos: true, origen: 'portal-verano' };
    try {
      const r = await UCP.api.enviarSolicitud(payload);
      if (!r.ok) throw new Error();
      S.solicitud = Object.assign({}, payload, { id: r.id, fecha: r.fecha }); S.editando = false; pintarVista();
    } catch (e) { $('btn-enviar').disabled = false; $('msg-sol').textContent = 'No se pudo enviar tu solicitud. Inténtalo de nuevo.'; }
  }

  // ---------------- Eventos ----------------
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button, a[data-paso]'); if (!b) return;
    if (b.id === 'btn-google') abrirSelector();
    else if (b.dataset.perfil) { UCP.api.ingresarDemo(b.dataset.perfil); $('modal').innerHTML = ''; cargar(); }
    else if (b.hasAttribute('data-cerrar-modal')) $('modal').innerHTML = '';
    else if (b.id === 'btn-salir') { UCP.api.salir(); location.reload(); }
    else if (b.dataset.paso) ir(b.dataset.paso);
    else if (b.dataset.filtro) { S.filtro = b.dataset.filtro; pintarVista(); }
    else if (b.dataset.malla) { S.mallaSel = b.dataset.malla; pintarVista(); }
    else if (b.dataset.elegir !== undefined) { const o = OF.find((x) => x.codigo === b.dataset.elegir); S.sel.set(o.codigo, itemDe(o, b.dataset.seccion || null)); pintarVista(); }
    else if (b.dataset.quitar) { S.sel.delete(b.dataset.quitar); pintarVista(); }
    else if (b.id === 'btn-enviar') enviar();
    else if (b.id === 'btn-editar') { S.editando = true; ir('verano'); }
    else if (b.id === 'btn-pdf') UCP.pdfConstancia({ perfil: D.perfil, solicitud: S.solicitud, calendario: D.calendario, parametros: D.parametros, proyeccion: UCP.sim.proyeccion(M, S.solicitud.creditos) });
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('modal').innerHTML) $('modal').innerHTML = ''; });

  UCP.api.sesion().then((s) => { if (s.ok) cargar(); });
})();
