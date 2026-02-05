// ============================
// REGISTRO DE VISTAS VÁLIDAS
// ============================
// ⚠️ SOLO añade aquí vistas que tengan HTML real en /views

const VALID_VIEWS = [
  'usuario',
  'rutinas',
  'avisos',
  'historial'
];

// ============================
// CONTENEDOR PRINCIPAL
// ============================
const container = document.getElementById('view-container');

if (!container) {
  console.error('No existe #view-container en el HTML');
}

// ============================
// CARGA DE VISTAS
// ============================
function loadView(viewName) {
  // ❌ Vista inexistente o no registrada
  if (!viewName || !VALID_VIEWS.includes(viewName)) {
    load404();
    return;
  }

  fetch(`views/${viewName}.html`)
    .then(res => res.text())
    .then(html => {

      // ⚠️ Si el archivo está vacío, tratamos como 404
      if (!html || !html.trim()) {
        load404();
        return;
      }

      container.innerHTML = html;
    })
    .catch(() => {
      load404();
    });
}

// ============================
// CARGA DE 404 PERSONALIZADO
// ============================
function load404() {
    window.location.href = "404.html";
//   fetch('404.html')
//     .then(res => res.text())
//     .then(html => {
//       container.innerHTML = html;
//     })
//     .catch(() => {
//       // Fallback absoluto (no debería pasar)
//       container.innerHTML = `
//         <section style="padding:2rem;text-align:center">
//           <h1>404</h1>
//           <p>Página no encontrada</p>
//           <a href="index.html">Volver</a>
//         </section>
//       `;
//     });
}

// ============================
// NAVEGACIÓN SIDEBAR
// ============================
document.querySelectorAll('.sidebar nav a').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();

    console.log("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")

    const view = link.dataset.view;

    // Estado activo visual
    document.querySelectorAll('.sidebar nav a')
      .forEach(l => l.classList.remove('active'));
    link.classList.add('active');

    loadView(view);
  });
});

// ============================
// VISTA INICIAL
// ============================
loadView('usuario');