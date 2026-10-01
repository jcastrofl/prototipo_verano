/* Constancia de solicitud (A4): página 1 con los datos y los cursos; página 2 horizontal con el horario semanal. */
window.UCP = window.UCP || {};
UCP.pdfConstancia = function ({ perfil, solicitud, calendario, parametros, proyeccion }) {
  if (!window.jspdf || !window.jspdf.jsPDF) { alert('No se pudo cargar el generador de PDF. Revisa tu conexión.'); return; }
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
  const MX = 16, DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const t = (s) => String(s || '').toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());
  const f = (iso) => { if (!iso) return 'por anunciar'; const [y, m, d] = iso.slice(0, 10).split('-'); return `${d}/${m}/${y}`; };
  const ev = (k) => (calendario.eventos.find((e) => e.evento === k) || {});
  const prototipo = UCP.config.modo === 'prototipo';

  function marco(ancho, alto, titulo) {
    doc.setFillColor(18, 12, 28); doc.rect(0, 0, ancho, 30, 'F');
    doc.setFillColor(106, 0, 190); doc.rect(0, 30, ancho, 1.6, 'F');
    doc.setTextColor(217, 194, 240); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text('Universidad Continental · Modalidad A Distancia', MX, 10);
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text(titulo, MX, 20);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(242, 169, 0);
    doc.text(`Solicitud ${solicitud.id}`, ancho - MX, 20, { align: 'right' });
    if (prototipo) {
      doc.setFillColor(253, 226, 253); doc.rect(0, alto - 20, ancho, 7, 'F');
      doc.setTextColor(90, 12, 90); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
      doc.text('PROTOTIPO: datos de demostración. No es una solicitud real ni una matrícula.', ancho / 2, alto - 15.4, { align: 'center' });
    }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120, 112, 138);
    doc.text('Esta constancia registra tu interés. No reserva vacante ni confirma tu matrícula.', MX, alto - 7);
  }

  // ---------- Página 1 ----------
  marco(210, 297, 'Constancia de solicitud · Cursos de verano');
  let y = 42;
  const linea = (a, b) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(40, 36, 52); doc.text(a, MX, y); doc.setFont('helvetica', 'normal'); doc.text(String(b), MX + 40, y); y += 5.6; };
  linea('Estudiante', t(`${perfil.nombres} ${perfil.apellidos}`));
  linea('Correo', perfil.correo);
  linea('Carrera', perfil.carrera.nombre);
  linea('Plan', perfil.plan.nombre);
  linea('Periodo', `${solicitud.periodo} (verano)`);
  linea('Registrada', f(solicitud.fecha));
  y += 4;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(75, 0, 135); doc.text('Cursos solicitados', MX, y); y += 6;
  doc.setFillColor(106, 0, 190); doc.rect(MX, y - 4.2, 178, 6.5, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(8.5);
  [['Curso', MX + 2], ['Cr.', MX + 86], ['Sección', MX + 96], ['Horario', MX + 114]].forEach(([h, x]) => doc.text(h, x, y));
  y += 6;
  solicitud.cursos.forEach((c, i) => {
    if (i % 2) { doc.setFillColor(246, 242, 250); doc.rect(MX, y - 4.2, 178, 10, 'F'); }
    doc.setTextColor(40, 36, 52); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(doc.splitTextToSize(c.nombre, 82)[0], MX + 2, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90, 81, 112);
    doc.text(`${c.codigo}${c.condicional ? ' · si apruebas su prerrequisito' : ''}${c.estado === 'ofertado' ? ' · oferta confirmada' : ' · apertura por confirmar'}`, MX + 2, y + 4);
    doc.setFontSize(9); doc.setTextColor(40, 36, 52);
    doc.text(String(c.creditos), MX + 86, y);
    doc.text(c.seccion || 'Apertura', MX + 96, y);
    const hor = (c.sesiones || []).map((s) => `${DIAS[s.dia].slice(0, 3)} ${s.hora_inicio}-${s.hora_fin}`).join('  ');
    doc.text(doc.splitTextToSize(hor || 'Sin horario todavía', 62), MX + 114, y);
    y += 10;
  });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(40, 36, 52);
  doc.text(`Total: ${solicitud.creditos} de ${parametros.creditos_max_verano} créditos permitidos en verano`, MX, y + 2); y += 12;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(75, 0, 135); doc.text('Tu avance estimado', MX, y); y += 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(40, 36, 52);
  doc.text(`Sin verano: ${proyeccion.sinVerano}  ·  Con esta solicitud: ${proyeccion.conVerano}`, MX, y); y += 5;
  doc.setFontSize(8.5); doc.setTextColor(90, 81, 112);
  doc.text('Referencial: supone que apruebas lo que llevas ahora y hasta 25 créditos por semestre.', MX, y); y += 11;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(75, 0, 135); doc.text('Qué sigue', MX, y); y += 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(40, 36, 52);
  [`1. Confirmación de la oferta (${f(ev('confirmacion_oferta').inicio)}): te avisaremos qué cursos se abren.`,
   '2. Si tienes pagos pendientes, regularízalos con Acompañamiento al estudiante.',
   `3. Matricúlate en la intranet del ${f(ev('matricula').inicio)} al ${f(ev('matricula').fin)} con estos cursos y secciones.`,
   '4. Si un curso no se abre, podrás elegir otro en la matrícula o llevarlo en el semestre regular.'].forEach((l) => {
    doc.splitTextToSize(l, 178).forEach((p) => { doc.text(p, MX, y); y += 5; });
  });

  // ---------- Página 2: horario ----------
  doc.addPage('a4', 'l');
  marco(297, 210, 'Mi horario de verano');
  const x0 = MX + 12, y0 = 44, w = (297 - x0 - MX) / 6, H0 = 7, H1 = 23, alto = (210 - y0 - 28) / (H1 - H0);
  doc.setFontSize(8.5);
  for (let d = 1; d <= 6; d++) {
    doc.setFillColor(106, 0, 190); doc.rect(x0 + (d - 1) * w, y0 - 7, w, 7, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.text(DIAS[d], x0 + (d - 1) * w + w / 2, y0 - 2.2, { align: 'center' });
  }
  doc.setDrawColor(229, 226, 235); doc.setLineWidth(0.2);
  for (let h = H0; h <= H1; h++) {
    const yy = y0 + (h - H0) * alto; doc.line(x0, yy, x0 + 6 * w, yy);
    if (h < H1) { doc.setTextColor(120, 112, 138); doc.setFont('helvetica', 'normal'); doc.text(`${String(h).padStart(2, '0')}:00`, x0 - 2, yy + 3, { align: 'right' }); }
  }
  for (let d = 0; d <= 6; d++) doc.line(x0 + d * w, y0, x0 + d * w, y0 + (H1 - H0) * alto);
  const min = (s) => { const [a, b] = s.split(':').map(Number); return a + b / 60; };
  solicitud.cursos.forEach((c) => (c.sesiones || []).forEach((s) => {
    const bx = x0 + (s.dia - 1) * w + 0.8, by = y0 + (min(s.hora_inicio) - H0) * alto + 0.4, bh = (min(s.hora_fin) - min(s.hora_inicio)) * alto - 0.8;
    doc.setFillColor(106, 0, 190); doc.roundedRect(bx, by, w - 1.6, bh, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
    doc.text(doc.splitTextToSize(c.nombre, w - 5).slice(0, 2), bx + 1.8, by + 3.6);
    doc.setFont('helvetica', 'normal'); doc.text(`${s.hora_inicio}-${s.hora_fin} · ${c.seccion}`, bx + 1.8, by + bh - 2);
  }));
  const sinH = solicitud.cursos.filter((c) => !c.seccion);
  if (sinH.length) { doc.setTextColor(40, 36, 52); doc.setFontSize(9); doc.text('Solicitud de apertura, sin horario todavía: ' + sinH.map((c) => c.nombre).join(', '), MX, 210 - 24); }

  doc.save(`${prototipo ? 'PROTOTIPO-' : ''}constancia-verano-${solicitud.id}.pdf`);
};
