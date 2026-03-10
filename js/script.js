// ============================
// REGISTRO DE VISTAS VÁLIDAS
// ============================
const VALID_VIEWS = [
  'usuario',
  'rutinas',
  'avisos',
  'historial',
  'configuraciones'
];

const API_BASE = 'php';

// ============================
// CONTENEDOR PRINCIPAL
// ============================
const container = document.getElementById('view-container');

if (!container) {
  console.error('No existe #view-container en el HTML');
}

// ============================
// FETCH CON CREDENCIALES Y 401
// ============================
async function apiFetch(url, options = {}) {
  const res = await fetch(url, { credentials: 'include', ...options });
  if (res.status === 401) {
    window.location.href = 'login.html';
    throw new Error('No autorizado');
  }
  return res;
}

// ============================
// CARGA DE VISTAS
// ============================
function loadView(viewName) {
  if (!viewName || !VALID_VIEWS.includes(viewName)) {
    load404();
    return;
  }

  fetch(`views/${viewName}.html`, { credentials: 'include' })
    .then(res => res.text())
    .then(html => {
      if (!html || !html.trim()) {
        load404();
        return;
      }
      container.innerHTML = html;
      const activeLink = document.querySelector('.sidebar-nav .nav-link.active');
      const pageTitleEl = document.getElementById('page-title');
      if (pageTitleEl && activeLink && activeLink.dataset.title) pageTitleEl.textContent = activeLink.dataset.title;
      bindViewEvents(viewName);
      loadViewData(viewName);
    })
    .catch(() => load404());
}

// ============================
// CARGA DE DATOS SEGÚN VISTA
// ============================
function loadViewData(viewName) {
  switch (viewName) {
    case 'usuario':
      loadUsuario();
      loadConfiguracionForUsuario();
      break;
    case 'rutinas':
      loadRutinas();
      break;
    case 'historial':
      loadHistorial();
      break;
    case 'avisos':
      loadAvisos();
      break;
    case 'configuraciones':
      loadConfiguracion();
      break;
  }
}

function loadUsuario() {
  apiFetch(`${API_BASE}/usuario.php`)
    .then(res => res.json())
    .then(data => {
      if (data.ok && data.usuario) {
        const u = data.usuario;
        const elNombre = document.getElementById('perfil-nombre');
        const elEmail = document.getElementById('perfil-email');
        if (elNombre) elNombre.textContent = u.nombre || '—';
        if (elEmail) elEmail.textContent = u.correo || '—';
      }
    })
    .catch(() => {});
}

function loadConfiguracionForUsuario() {
  apiFetch(`${API_BASE}/configuracion.php`)
    .then(res => res.json())
    .then(data => {
      if (data.ok && data.configuracion) {
        const c = data.configuracion;
        const chk = document.getElementById('pref-notificaciones');
        const sel = document.getElementById('pref-tema');
        if (chk) chk.checked = !!c.notificaciones;
        if (sel) sel.value = c.tema || 'claro';
      }
    })
    .catch(() => {});
}

let lastRutinasHabitos = [];
let lastCompletadosHoySet = new Set();

function renderListaHabitos(habitos, completadosSet, ocultarCompletados) {
  const lista = document.getElementById('lista-habitos');
  if (!lista) return;
  const aMostrar = ocultarCompletados
    ? habitos.filter(h => !completadosSet.has(h.id_habito))
    : habitos;
  lista.innerHTML = '';
  aMostrar.forEach(h => {
    const div = document.createElement('div');
    div.className = 'habit' + (completadosSet.has(h.id_habito) ? ' habit-completado' : '');
    div.dataset.idHabito = h.id_habito;
    const freq = h.frecuencia || 'diaria';
    const yaCompletado = completadosSet.has(h.id_habito);
    div.innerHTML = `
      <div>
        <strong>${escapeHtml(h.nombre)}</strong>
        <div class="meta">${freq}${yaCompletado ? ' · Completado hoy' : ''}</div>
      </div>
      <button type="button" class="btn-marcar" data-id-habito="${h.id_habito}" ${yaCompletado ? ' disabled' : ''}>${yaCompletado ? 'Hecho' : 'Marcar'}</button>
    `;
    lista.appendChild(div);
  });
}

function loadRutinas() {
  const hoy = new Date().toISOString().slice(0, 10);
  const lista = document.getElementById('lista-habitos');
  const resumen = document.getElementById('resumen-hoy');
  const chkOcultar = document.getElementById('ocultar-completados');

  apiFetch(`${API_BASE}/rutinas.php`)
    .then(res => res.json())
    .then(data => {
      if (!data.ok) return;
      const rutinas = data.rutinas || [];
      const habitosActivos = [];
      rutinas.filter(r => r.estado === 'activa').forEach(r => {
        (r.habitos || []).forEach(h => {
          habitosActivos.push({ ...h, id_rutina: r.id_rutina });
        });
      });

      return apiFetch(`${API_BASE}/cumplimiento.php?desde=${hoy}&hasta=${hoy}`)
        .then(r => r.json())
        .then(cumplData => {
          const completadosSet = new Set();
          if (cumplData.ok && cumplData.cumplimiento) {
            cumplData.cumplimiento.forEach(c => {
              if (c.completado) completadosSet.add(c.id_habito);
            });
          }
          lastRutinasHabitos = habitosActivos;
          lastCompletadosHoySet = completadosSet;
          const totalHabitos = habitosActivos.length;
          const completadosHoy = completadosSet.size;
          if (resumen) {
            resumen.innerHTML = `Has completado <strong>${completadosHoy} de ${totalHabitos}</strong> hábitos hoy.`;
          }
          const ocultar = chkOcultar ? chkOcultar.checked : false;
          renderListaHabitos(habitosActivos, completadosSet, ocultar);
        });
    })
    .then(() => {
      if (chkOcultar) {
        chkOcultar.onchange = () => {
          renderListaHabitos(lastRutinasHabitos, lastCompletadosHoySet, chkOcultar.checked);
        };
      }
    })
    .catch(() => {});
}

function loadHistorial() {
  const hasta = new Date();
  const desde = new Date();
  desde.setDate(desde.getDate() - 7);
  const desdeStr = desde.toISOString().slice(0, 10);
  const hastaStr = hasta.toISOString().slice(0, 10);

  apiFetch(`${API_BASE}/cumplimiento.php?desde=${desdeStr}&hasta=${hastaStr}`)
    .then(res => res.json())
    .then(data => {
      const tbody = document.getElementById('cuerpo-historial');
      const tabla = document.getElementById('tabla-historial');
      const vacio = document.getElementById('historial-vacio');
      if (!tbody) return;
      tbody.innerHTML = '';
      if (!data.ok || !data.cumplimiento || data.cumplimiento.length === 0) {
        if (tabla) tabla.style.display = 'none';
        if (vacio) { vacio.style.display = 'block'; vacio.textContent = 'No hay registros en este período.'; }
        return;
      }
      if (tabla) tabla.style.display = '';
      if (vacio) vacio.style.display = 'none';
      const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      data.cumplimiento.forEach(row => {
        const tr = document.createElement('tr');
        const dayName = dias[new Date(row.fecha + 'T12:00:00').getDay()];
        tr.innerHTML = `
          <td>${escapeHtml(row.fecha)}</td>
          <td>${escapeHtml(dayName)}</td>
          <td>${escapeHtml(row.nombre_rutina || '—')}</td>
          <td>${escapeHtml(row.nombre_habito || '—')}</td>
          <td><span class="badge ${row.completado ? 'badge-ok' : 'badge-no'}">${row.completado ? 'Sí' : 'No'}</span></td>
        `;
        tbody.appendChild(tr);
      });
    })
    .catch(() => {});
}

function loadAvisos() {
  apiFetch(`${API_BASE}/avisos.php`)
    .then(res => res.json())
    .then(data => {
      const cont = document.getElementById('lista-avisos');
      if (!cont) return;
      cont.innerHTML = '';
      if (!data.ok || !data.avisos || data.avisos.length === 0) {
        cont.innerHTML = '<p class="sin-avisos">No hay avisos.</p>';
        return;
      }
      data.avisos.forEach(a => {
        const div = document.createElement('div');
        let cl = 'feedback neutral';
        if (a.tipo === 'personalizado') cl = 'feedback positive';
        div.className = cl;
        const fecha = a.fecha_programada ? new Date(a.fecha_programada).toLocaleString('es') : '';
        div.innerHTML = `<span class="aviso-mensaje">${escapeHtml(a.mensaje || '')}</span>${fecha ? `<span class="aviso-fecha">${escapeHtml(fecha)}</span>` : ''}`;
        cont.appendChild(div);
      });
    })
    .catch(() => {});
}

function programarTemporizador(e) {
  e.preventDefault();
  const msg = document.getElementById('aviso-mensaje');
  const mins = document.getElementById('aviso-minutos');
  const mensaje = (msg && msg.value.trim()) || '';
  const minutos = Math.max(1, parseInt(mins && mins.value ? mins.value : 30, 10) || 30);
  if (!mensaje) {
    alert('Escribe el mensaje del recordatorio.');
    return;
  }
  const fechaProgramada = new Date(Date.now() + minutos * 60 * 1000);
  const fechaStr = fechaProgramada.toISOString().slice(0, 19).replace('T', ' ');
  apiFetch(`${API_BASE}/avisos.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mensaje: mensaje + ' (en ' + minutos + ' min)',
      tipo: 'personalizado',
      fecha_programada: fechaStr
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.ok) {
        if (msg) msg.value = '';
        if (mins) mins.value = '30';
        loadViewData('avisos');
        alert('Recordatorio programado para dentro de ' + minutos + ' minutos. Revisa la lista de avisos.');
      } else {
        alert(data.error || 'No se pudo programar.');
      }
    })
    .catch(() => alert('Error al programar el recordatorio.'));
}

function loadConfiguracion() {
  apiFetch(`${API_BASE}/configuracion.php`)
    .then(res => res.json())
    .then(data => {
      if (!data.ok || !data.configuracion) return;
      const c = data.configuracion;
      const chk = document.getElementById('config-notificaciones');
      const sel = document.getElementById('config-tema');
      if (chk) chk.checked = !!c.notificaciones;
      if (sel) sel.value = c.tema || 'claro';
    })
    .catch(() => {});
}

// ============================
// EVENTOS POR VISTA
// ============================
function bindViewEvents(viewName) {
  setTimeout(() => {
    switch (viewName) {
      case 'usuario':
        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) btnLogout.addEventListener('click', () => { window.location.href = 'php/logout.php'; });
        const btnPrefs = document.getElementById('btn-guardar-prefs');
        if (btnPrefs) btnPrefs.addEventListener('click', guardarPrefsUsuario);
        break;
      case 'rutinas':
        const btnCrear = document.getElementById('btn-crear-rutina');
        if (btnCrear) btnCrear.addEventListener('click', crearRutina);
        break;
      case 'historial':
        break;
      case 'avisos':
        const formTemp = document.getElementById('form-temporizador');
        if (formTemp) formTemp.addEventListener('submit', programarTemporizador);
        break;
      case 'configuraciones':
        const btnConfig = document.getElementById('btn-guardar-config');
        if (btnConfig) btnConfig.addEventListener('click', guardarConfiguracion);
        break;
    }
  }, 0);
}

function guardarPrefsUsuario() {
  const chk = document.getElementById('pref-notificaciones');
  const sel = document.getElementById('pref-tema');
  const notificaciones = chk ? chk.checked : true;
  const tema = sel ? sel.value : 'claro';
  apiFetch(`${API_BASE}/configuracion.php`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notificaciones, tema })
  })
    .then(res => res.json())
    .then(data => {
      if (data.ok) {
        applyTema(tema);
        alert('Preferencias guardadas.');
      }
    })
    .catch(() => {});
}

function guardarConfiguracion() {
  const chk = document.getElementById('config-notificaciones');
  const sel = document.getElementById('config-tema');
  const notificaciones = chk ? chk.checked : true;
  const tema = sel ? sel.value : 'claro';
  apiFetch(`${API_BASE}/configuracion.php`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notificaciones, tema })
  })
    .then(res => res.json())
    .then(data => {
      if (data.ok) {
        applyTema(tema);
        alert('Configuración guardada.');
      }
    })
    .catch(() => {});
}

function marcarHabito(idHabito) {
  if (!idHabito) return;
  const hoy = new Date().toISOString().slice(0, 10);
  apiFetch(`${API_BASE}/cumplimiento.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_habito: parseInt(idHabito, 10), fecha: hoy, completado: true })
  })
    .then(res => res.json())
    .then(data => { if (data.ok) loadViewData('rutinas'); })
    .catch(() => {});
}

function crearRutina() {
  const nombreRutina = document.getElementById('nueva-rutina-nombre');
  const nombreHabito = document.getElementById('nuevo-habito-nombre');
  const frecuencia = document.getElementById('nueva-rutina-frecuencia');
  const nom = (nombreRutina && nombreRutina.value.trim()) || '';
  if (!nom) {
    alert('Escribe el nombre de la rutina.');
    return;
  }
  const freq = (frecuencia && frecuencia.value) || 'diaria';
  const nomHabito = (nombreHabito && nombreHabito.value.trim()) || '';

  apiFetch(`${API_BASE}/rutinas.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: nom, fecha_inicio: new Date().toISOString().slice(0, 10) })
  })
    .then(res => res.json())
    .then(data => {
      if (!data.ok || !data.id_rutina) {
        alert(data.error || 'Error al crear rutina.');
        return;
      }
      const idRutina = data.id_rutina;
      if (nomHabito) {
        return apiFetch(`${API_BASE}/habitos.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_rutina: idRutina, nombre: nomHabito, frecuencia: freq })
        }).then(r => r.json()).then(() => ({ ok: true }));
      }
      return { ok: true };
    })
    .then(() => {
      if (nombreRutina) nombreRutina.value = '';
      if (nombreHabito) nombreHabito.value = '';
      loadViewData('rutinas');
      alert('Rutina creada.');
    })
    .catch(() => {});
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================
// CARGA DE 404
// ============================
function load404() {
  window.location.href = '404.html';
}

// ============================
// DELEGACIÓN: BOTÓN MARCAR
// ============================
if (container) {
  container.addEventListener('click', e => {
    const btn = e.target.closest('.btn-marcar');
    if (btn && btn.dataset.idHabito) marcarHabito(btn.dataset.idHabito);
  });
}

// ============================
// NAVEGACIÓN SIDEBAR
// ============================
document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const view = link.dataset.view;
    const title = link.dataset.title || view;
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    const pageTitleEl = document.getElementById('page-title');
    if (pageTitleEl) pageTitleEl.textContent = title;
    loadView(view);
  });
});

// ============================
// TEMA (MODO OSCURO)
// ============================
function applyTema(tema) {
  if (tema === 'oscuro') {
    document.documentElement.classList.add('tema-oscuro');
    document.body.classList.add('tema-oscuro');
  } else {
    document.documentElement.classList.remove('tema-oscuro');
    document.body.classList.remove('tema-oscuro');
  }
}

function applyThemeFromServer() {
  return apiFetch(`${API_BASE}/configuracion.php`)
    .then(res => res.json())
    .then(data => {
      if (data.ok && data.configuracion && data.configuracion.tema) {
        applyTema(data.configuracion.tema);
      }
    })
    .catch(() => {});
}

// ============================
// VISTA INICIAL
// ============================
applyThemeFromServer().then(() => loadView('usuario'));
