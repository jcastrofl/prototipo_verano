/* Reglas del simulador (sección "Reglas del simulador" del contrato de API). */
window.UCP = window.UCP || {};
(function () {
  const S = {};
  S.preparar = function ({ malla, historial, oferta, parametros }) {
    const cursos = {}; malla.cursos.forEach((c) => { cursos[c.codigo] = c; });
    const aprob = new Set(), enCurso = new Set(), desap = new Set();
    historial.cursos.forEach((h) => {
      if (h.estado === 'aprobado' || h.estado === 'convalidado') aprob.add(h.codigo);
      else if (h.estado === 'matriculado') enCurso.add(h.codigo);
      else if (h.estado === 'desaprobado') desap.add(h.codigo);
    });
    aprob.forEach((k) => desap.delete(k));
    const credAprob = [...aprob].reduce((s, k) => s + (cursos[k] ? cursos[k].creditos : 0), 0);
    const credEnCurso = [...enCurso].reduce((s, k) => s + (cursos[k] ? cursos[k].creditos : 0), 0);
    return { malla, cursos, oferta, parametros, aprob, enCurso, desap, credAprob, credEnCurso, credFaltan: malla.creditos_totales - credAprob };
  };
  S.estadoCurso = (M, k) => M.aprob.has(k) ? 'aprobado' : M.enCurso.has(k) ? 'en_curso' : M.desap.has(k) ? 'desaprobado' : 'pendiente';
  S.dependientes = function (M, k) {
    const hijos = {}; M.malla.cursos.forEach((c) => (c.prerrequisitos || []).flat().forEach((p) => { (hijos[p] ||= new Set()).add(c.codigo); }));
    const v = new Set(), st = [k]; while (st.length) { const x = st.pop(); (hijos[x] || []).forEach((h) => { if (!v.has(h)) { v.add(h); st.push(h); } }); }
    return v.size;
  };
  // Disponibilidad de un curso de verano: disponible | condicional | bloqueado
  S.disponibilidad = function (M, codigo) {
    const c = M.cursos[codigo]; if (!c) return { tipo: 'bloqueado', faltan: [] };
    const req = (c.prerrequisitos || []).flat();
    const faltan = req.filter((p) => !M.aprob.has(p));
    if (!faltan.length) return { tipo: 'disponible', faltan: [] };
    if (faltan.every((p) => M.enCurso.has(p))) return { tipo: 'condicional', faltan };
    return { tipo: 'bloqueado', faltan };
  };
  S.clasificarOferta = function (M) {
    return M.oferta.cursos.filter((o) => !M.aprob.has(o.codigo) && !M.enCurso.has(o.codigo)).map((o) => {
      const c = M.cursos[o.codigo] || {}, d = S.disponibilidad(M, o.codigo);
      const prioridad = M.desap.has(o.codigo) ? 0 : c.curso_clave ? 1 : 2;
      return Object.assign({}, o, { ciclo: c.ciclo, curso_clave: !!c.curso_clave, recuperacion: M.desap.has(o.codigo), disponibilidad: d, prioridad });
    }).sort((a, b) => a.prioridad - b.prioridad || a.ciclo - b.ciclo || a.nombre.localeCompare(b.nombre));
  };
  const minutos = (h) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
  S.cruces = function (items) {
    const ses = []; items.forEach((i) => (i.sesiones || []).forEach((s) => ses.push({ i, s })));
    const out = [];
    for (let a = 0; a < ses.length; a++) for (let b = a + 1; b < ses.length; b++) {
      const x = ses[a], y = ses[b];
      if (x.i.codigo !== y.i.codigo && x.s.dia === y.s.dia && minutos(x.s.hora_inicio) < minutos(y.s.hora_fin) && minutos(y.s.hora_inicio) < minutos(x.s.hora_fin))
        out.push([x.i.codigo, y.i.codigo, x.s.dia]);
    }
    return out;
  };
  // Agrupa los cruces por par de cursos: [{a, b, dias:[1,3,5]}]
  S.paresCruce = function (cruces) {
    const m = new Map();
    cruces.forEach(([a, b, d]) => { const k = [a, b].sort().join('|'); if (!m.has(k)) m.set(k, { a, b, dias: [] }); if (!m.get(k).dias.includes(d)) m.get(k).dias.push(d); });
    return [...m.values()];
  };
  S.validar = function (M, sel, habilitacion) {
    const items = [...sel.values()];
    const creditos = items.reduce((s, i) => s + i.creditos, 0), max = M.parametros.creditos_max_verano;
    const cruces = S.cruces(items);
    const pares = S.paresCruce(cruces);
    const condicionales = items.filter((i) => i.disponibilidad.tipo === 'condicional');
    const sinHorario = items.filter((i) => !i.seccion);
    const v = [
      { ok: items.length > 0, texto: items.length ? `${items.length} ${items.length === 1 ? 'curso elegido' : 'cursos elegidos'}` : 'Elige al menos un curso', bloquea: !items.length },
      { ok: creditos <= max, texto: `${creditos} de ${max} créditos permitidos en verano`, bloquea: creditos > max },
      { ok: !pares.length, texto: pares.length ? `${pares.length} ${pares.length === 1 ? 'cruce' : 'cruces'} de horario entre cursos` : 'Sin cruces de horario', bloquea: pares.length > 0 },
      { ok: true, aviso: condicionales.length > 0, texto: condicionales.length ? `${condicionales.length} ${condicionales.length === 1 ? 'curso depende' : 'cursos dependen'} de que apruebes lo que llevas ahora` : 'Cumples los prerrequisitos de todos tus cursos' },
      { ok: true, aviso: sinHorario.length > 0, texto: sinHorario.length ? `${sinHorario.length} ${sinHorario.length === 1 ? 'curso aún no tiene' : 'cursos aún no tienen'} horario: se registra como solicitud de apertura` : 'Todos tus cursos tienen sección y horario' },
      { ok: habilitacion.habilitado, texto: habilitacion.habilitado ? 'Estás habilitado para matricularte' : 'Tienes un impedimento de matrícula', bloquea: !habilitacion.habilitado }
    ];
    return { creditos, max, cruces, validaciones: v, puedeEnviar: !v.some((x) => x.bloquea) };
  };
  // Proyección referencial: créditos pendientes tras el ciclo actual, repartidos en semestres de carga referencial
  S.proyeccion = function (M, creditosVerano) {
    const carga = UCP.config.cargaReferencialSemestre;
    const pend = Math.max(0, M.credFaltan - M.credEnCurso);
    const semestres = (c) => Math.ceil(Math.max(0, c) / carga);
    const periodo = (n) => { const a = 2027 + Math.floor((n - 1) / 2); return `${a}-${n % 2 ? 'I' : 'II'}`; };
    const sin = semestres(pend), con = semestres(pend - creditosVerano);
    return { pendientes: pend, sinVerano: sin ? periodo(sin) : 'Al cerrar 2026-II', conVerano: con ? periodo(con) : 'Al terminar el verano 2027', ahorro: sin - con };
  };
  UCP.sim = S;
})();
