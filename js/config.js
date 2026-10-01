/* Configuración. En "prototipo" los datos salen de datos-prototipo.js;
   en "api" se consultan al backend Laravel, que a su vez llama a la API de TI. */
window.UCP = window.UCP || {};
UCP.config = {
  modo: 'prototipo',                 // 'prototipo' | 'api'
  backendBase: '/api/portal',        // rutas del backend Laravel cuando modo = 'api'
  logo: 'https://adistancia.ucontinental.edu.pe/assets/img/logo.svg',
  logoPie: 'https://ucontinental.edu.pe/site/wp-content/themes/salient-child/img/logo.svg',
  iconos: 'https://adistancia.ucontinental.edu.pe/assets/img/',
  fotos: {
    portada: 'https://ucontinental.edu.pe/site/wp-content/themes/salient-child/img/home-img-1.webp',
    estudio: 'https://adistancia.ucontinental.edu.pe/assets/img/ciencias-de-la-computacion-sm.webp',
    cierre: 'https://ucontinental.edu.pe/site/wp-content/themes/salient-child/img/tu-futuro-es-global.webp'
  },
  intranet: 'https://estudiantes.ucontinental.edu.pe/',   // matrícula oficial
  cargaReferencialSemestre: 25                              // carga máxima oficial por semestre, usada en la proyección
};
