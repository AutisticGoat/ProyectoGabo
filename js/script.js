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
// HELPERS DE FECHA
// Estrategia: guardar siempre UTC en la BD,
// convertir a hora local del usuario al mostrar.
// Funciona para cualquier zona horaria sin config.
// ============================

// Convierte un Date a string UTC "YYYY-MM-DD HH:MM:SS" para guardar en BD
function toUTCDateTimeStr(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
         `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

// Parsea "YYYY-MM-DD HH:MM:SS" de la BD (UTC) a Date local.
// Añade "Z" para que el navegador lo interprete como UTC
// y lo convierta automáticamente a la hora local del usuario.
function parseDbDate(str) {
  if (!str) return null;
  return new Date(str.replace(' ', 'T') + 'Z');
}

// Mantener por compatibilidad con loadRutinas/loadHistorial
function toLocalDateTimeStr(date) {
  return toUTCDateTimeStr(date);
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
      if (!html || !html.trim()) { load404(); return; }
      container.innerHTML = html;
      const activeLink = document.querySelector('.sidebar-nav .nav-link.active');
      const pageTitleEl = document.getElementById('page-title');
      if (pageTitleEl && activeLink && activeLink.dataset.title) {
        pageTitleEl.textContent = activeLink.dataset.title;
      }
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
    case 'usuario':        loadUsuario(); loadConfiguracionForUsuario(); break;
    case 'rutinas':        loadRutinas();       break;
    case 'historial':      loadHistorial();     break;
    case 'avisos':         loadAvisos();        break;
    case 'configuraciones': loadConfiguracion(); break;
  }
}

function loadUsuario() {
  apiFetch(`${API_BASE}/usuario.php`)
    .then(res => res.json())
    .then(data => {
      if (data.ok && data.usuario) {
        const u = data.usuario;
        const elNombre = document.getElementById('perfil-nombre');
        const elEmail  = document.getElementById('perfil-email');
        if (elNombre) elNombre.textContent = u.nombre || '—';
        if (elEmail)  elEmail.textContent  = u.correo || '—';
      }
    })
    .catch(() => {});

  // Mostrar enlace al panel de admin si el usuario tiene nivel ≤ 2
  apiFetch(`${API_BASE}/auth_info.php`)
    .then(res => res.json())
    .then(data => {
      const link = document.getElementById('link-panel-admin');
      if (link && data.nivel_rol <= 2) {
        link.style.display = '';
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
        if (sel) sel.value   = c.tema || 'claro';
      }
    })
    .catch(() => {});
}

let lastRutinas        = [];
let lastCompletadosHoySet = new Set();
let filtroActivo       = 'activa';

function renderRutinas() {
  const cont       = document.getElementById('lista-rutinas');
  const chkOcultar = document.getElementById('ocultar-completados');
  const ocultar    = chkOcultar ? chkOcultar.checked : false;
  if (!cont) return;

  const rutinas = filtroActivo === 'todas'
    ? lastRutinas
    : lastRutinas.filter(r => r.estado === filtroActivo);

  if (rutinas.length === 0) {
    cont.innerHTML = `<div class="rutinas-vacio">No hay rutinas ${filtroActivo === 'todas' ? '' : filtroActivo + 's'}.</div>`;
    return;
  }

  cont.innerHTML = '';
  rutinas.forEach(r => {
    const habitos   = r.habitos || [];
    const activos   = habitos.filter(h => !lastCompletadosHoySet.has(h.id_habito));
    const completados = habitos.length - activos.length;

    const card = document.createElement('div');
    card.className = `rutina-card estado-${r.estado}`;
    card.dataset.idRutina = r.id_rutina;

    const esPausada    = r.estado === 'pausada';
    const esFinalizada = r.estado === 'finalizada';

    card.innerHTML = `
      <div class="rutina-card-header">
        <div class="rutina-info">
          <span class="rutina-nombre">${escapeHtml(r.nombre)}</span>
          <span class="badge-estado badge-${r.estado}">${r.estado}</span>
        </div>
        <div class="rutina-acciones" onclick="event.stopPropagation()">
          ${!esFinalizada ? `
            <button type="button" class="${esPausada ? 'btn-activar' : 'btn-pausar'}"
              data-action="${esPausada ? 'activar' : 'pausar'}" data-id="${r.id_rutina}">
              ${esPausada ? 'Activar' : 'Pausar'}
            </button>
          ` : `
            <button type="button" class="btn-activar"
              data-action="activar" data-id="${r.id_rutina}">Reactivar</button>
          `}
          <button type="button" class="btn-eliminar"
            data-action="eliminar" data-id="${r.id_rutina}">Eliminar</button>
        </div>
        <span class="rutina-chevron">▼</span>
      </div>
      <div class="rutina-card-body">
        <div class="rutina-habitos-titulo">
          Hábitos · ${completados}/${habitos.length} completados hoy
        </div>
        <div class="rutina-habitos-lista">
          ${habitos.length === 0
            ? '<p style="font-size:.8rem;color:#94a3b8;">Sin hábitos en esta rutina.</p>'
            : habitos.filter(h => ocultar ? !lastCompletadosHoySet.has(h.id_habito) : true).map(h => {
                const hecho = lastCompletadosHoySet.has(h.id_habito);
                return `<div class="habit${hecho ? ' habit-completado' : ''}" data-id-habito="${h.id_habito}">
                  <div>
                    <strong>${escapeHtml(h.nombre)}</strong>
                    <div class="meta">${h.frecuencia || 'diaria'}${hecho ? ' · Completado hoy' : ''}</div>
                  </div>
                  <div class="habit-acciones">
                    <button type="button" class="btn-marcar" data-id-habito="${h.id_habito}"
                      ${hecho ? 'disabled' : ''}>${hecho ? 'Hecho' : 'Marcar'}</button>
                    <button type="button" class="btn-eliminar-habito" data-id-habito="${h.id_habito}"
                      title="Eliminar hábito">✕</button>
                  </div>
                </div>`;
              }).join('')
          }
        </div>
        <div class="form-agregar-habito">
          <input type="text" class="input-nuevo-habito" placeholder="Nuevo hábito..."
            data-id-rutina="${r.id_rutina}">
          <select class="select-frecuencia-habito">
            <option value="diaria">Diaria</option>
            <option value="semanal">Semanal</option>
            <option value="mensual">Mensual</option>
          </select>
          <button type="button" class="btn-agregar-habito" data-id-rutina="${r.id_rutina}">+ Agregar</button>
        </div>
      </div>
    `;

    // Toggle expandir/colapsar
    card.querySelector('.rutina-card-header').addEventListener('click', () => {
      card.classList.toggle('abierta');
    });

    cont.appendChild(card);
  });
}


function loadSesiones() {
  apiFetch(`${API_BASE}/sesiones.php`)
    .then(r => r.json())
    .then(data => {
      const cont = document.getElementById('lista-sesiones');
      if (!cont) return;
      const sesiones = data.sesiones || [];
      if (sesiones.length === 0) {
        cont.innerHTML = '<p style="font-size:.85rem;color:#94a3b8;">No hay sesiones activas registradas.</p>';
        return;
      }
      cont.innerHTML = sesiones.map(s => {
        const fechaCreado  = parseDbDate(s.creado_en)?.toLocaleString('es') || s.creado_en;
        const fechaExpira  = parseDbDate(s.expira_en)?.toLocaleString('es') || s.expira_en;
        const actualBadge  = s.es_actual ? '<span class="sesion-actual-badge">Esta sesión</span>' : '';
        return `
          <div class="sesion-item ${s.es_actual ? 'sesion-actual' : ''}">
            <div class="sesion-info">
              <div class="sesion-id">${escapeHtml(s.id_corto)}… ${actualBadge}</div>
              <div class="sesion-meta">IP: ${escapeHtml(s.ip)} · Inicio: ${fechaCreado} · Expira: ${fechaExpira}</div>
            </div>
            <button type="button" class="btn-cerrar-sesion"
              data-jti="${escapeHtml(s.jti)}" ${s.es_actual ? 'disabled title="Usa Cerrar sesión para salir"' : ''}>
              Cerrar
            </button>
          </div>`;
      }).join('');
    })
    .catch(() => {});
}

function loadRutinas() {
  const hoy     = toLocalDateTimeStr(new Date()).slice(0, 10);
  const resumen = document.getElementById('resumen-hoy');

  apiFetch(`${API_BASE}/rutinas.php`)
    .then(res => res.json())
    .then(data => {
      if (!data.ok) return;
      lastRutinas = data.rutinas || [];
      const habitosActivos = [];
      lastRutinas.filter(r => r.estado === 'activa').forEach(r => {
        (r.habitos || []).forEach(h => habitosActivos.push(h));
      });

      return apiFetch(`${API_BASE}/cumplimiento.php?desde=${hoy}&hasta=${hoy}`)
        .then(r => r.json())
        .then(cumplData => {
          lastCompletadosHoySet = new Set();
          if (cumplData.ok && cumplData.cumplimiento) {
            cumplData.cumplimiento.forEach(c => { if (c.completado) lastCompletadosHoySet.add(c.id_habito); });
          }
          if (resumen) {
            resumen.innerHTML = `Has completado <strong>${lastCompletadosHoySet.size} de ${habitosActivos.length}</strong> hábitos hoy.`;
          }
          renderRutinas();
        });
    })
    .catch(() => {});
}

function agregarHabito(idRutina, nombre, frecuencia) {
  if (!nombre.trim()) return;
  apiFetch(`${API_BASE}/habitos.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_rutina: idRutina, nombre: nombre.trim(), frecuencia }),
  })
    .then(r => r.json())
    .then(data => { if (data.ok) loadRutinas(); })
    .catch(() => {});
}

function eliminarHabito(idHabito) {
  if (!confirm('¿Eliminar este hábito?')) return;
  apiFetch(`${API_BASE}/habitos.php?id_habito=${idHabito}`, { method: 'DELETE' })
    .then(r => r.json())
    .then(data => { if (data.ok) loadRutinas(); })
    .catch(() => {});
}

function cambiarEstadoRutina(idRutina, nuevoEstado) {
  apiFetch(`${API_BASE}/rutinas.php`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_rutina: idRutina, estado: nuevoEstado }),
  })
    .then(r => r.json())
    .then(data => { if (data.ok) loadRutinas(); })
    .catch(() => {});
}

function eliminarRutina(idRutina) {
  if (!confirm('¿Eliminar esta rutina y todos sus hábitos? Esta acción no se puede deshacer.')) return;
  apiFetch(`${API_BASE}/rutinas.php?id_rutina=${idRutina}`, { method: 'DELETE' })
    .then(r => r.json())
    .then(data => { if (data.ok) loadRutinas(); })
    .catch(() => {});
}

let historialDias = 7;
let graficaChart  = null;

function loadHistorial() {
  const hasta  = new Date();
  const desde  = new Date();
  desde.setDate(desde.getDate() - (historialDias - 1));
  const desdeStr = toLocalDateTimeStr(desde).slice(0, 10);
  const hastaStr = toLocalDateTimeStr(hasta).slice(0, 10);

  apiFetch(`${API_BASE}/cumplimiento.php?desde=${desdeStr}&hasta=${hastaStr}`)
    .then(res => res.json())
    .then(data => {
      const tbody        = document.getElementById('cuerpo-historial');
      const tabla        = document.getElementById('tabla-historial');
      const vacio        = document.getElementById('historial-vacio');
      const graficaVacia = document.getElementById('grafica-vacia');
      const canvas       = document.getElementById('grafica-historial');
      if (!tbody) return;

      tbody.innerHTML = '';
      const cumplimiento = (data.ok && data.cumplimiento) ? data.cumplimiento : [];

      // ── Gráfica de barras ──────────────────────────────
      if (canvas) {
        // Construir rango de fechas completo
        const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const rango = [];
        for (let i = historialDias - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          rango.push(toLocalDateTimeStr(d).slice(0, 10));
        }

        // Agrupar por fecha: total y completados
        const porFecha = {};
        rango.forEach(f => { porFecha[f] = { total: 0, completados: 0 }; });
        cumplimiento.forEach(r => {
          if (porFecha[r.fecha]) {
            porFecha[r.fecha].total++;
            if (r.completado) porFecha[r.fecha].completados++;
          }
        });

        const labels   = rango.map(f => dias[new Date(f + 'T12:00:00').getDay()] + ' ' + f.slice(8));
        const totales  = rango.map(f => porFecha[f].total);
        const hechos   = rango.map(f => porFecha[f].completados);
        const hayDatos = totales.some(v => v > 0);

        if (graficaVacia) graficaVacia.style.display = hayDatos ? 'none' : 'block';
        canvas.style.display = hayDatos ? 'block' : 'none';

        if (hayDatos) {
          if (graficaChart) graficaChart.destroy();
          graficaChart = dibujarGrafica(canvas, labels, totales, hechos);
        }
      }

      // ── Tabla de detalle ───────────────────────────────
      if (cumplimiento.length === 0) {
        if (tabla) tabla.style.display = 'none';
        if (vacio) vacio.style.display = 'block';
        return;
      }
      if (tabla) tabla.style.display = '';
      if (vacio) vacio.style.display = 'none';
      const diasNombre = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      cumplimiento.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${escapeHtml(row.fecha)}</td>
          <td>${escapeHtml(diasNombre[new Date(row.fecha + 'T12:00:00').getDay()])}</td>
          <td>${escapeHtml(row.nombre_rutina || '—')}</td>
          <td>${escapeHtml(row.nombre_habito || '—')}</td>
          <td><span class="badge ${row.completado ? 'badge-ok' : 'badge-no'}">${row.completado ? 'Sí' : 'No'}</span></td>
        `;
        tbody.appendChild(tr);
      });
    })
    .catch(() => {});
}

function dibujarGrafica(canvas, labels, totales, hechos) {
  const ctx  = canvas.getContext('2d');
  const W    = canvas.offsetWidth  || 400;
  const H    = canvas.offsetHeight || 180;
  canvas.width  = W;
  canvas.height = H;

  const padL = 28, padR = 12, padT = 16, padB = 40;
  const areaW = W - padL - padR;
  const areaH = H - padT - padB;
  const n     = labels.length;
  const maxV  = Math.max(...totales, 1);
  const barW  = (areaW / n) * 0.55;
  const gap   = areaW / n;

  ctx.clearRect(0, 0, W, H);

  // Líneas de guía
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth   = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padT + areaH - (i / 4) * areaH;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
  }

  // Barras
  labels.forEach((lbl, i) => {
    const x      = padL + gap * i + (gap - barW) / 2;
    const hTotal = totales[i] > 0 ? (totales[i] / maxV) * areaH : 0;
    const hHecho = hechos[i]  > 0 ? (hechos[i]  / maxV) * areaH : 0;

    // Barra fondo (total)
    if (hTotal > 0) {
      ctx.fillStyle = '#e2e8f0';
      roundRect(ctx, x, padT + areaH - hTotal, barW, hTotal, 4);
      ctx.fill();
    }
    // Barra completados
    if (hHecho > 0) {
      ctx.fillStyle = '#0d9488';
      roundRect(ctx, x, padT + areaH - hHecho, barW, hHecho, 4);
      ctx.fill();
    }

    // Etiqueta eje X
    ctx.fillStyle    = '#94a3b8';
    ctx.font         = `${Math.max(9, Math.floor(areaW / n / 2.8))}px system-ui,sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(lbl, x + barW / 2, padT + areaH + 6);

    // Número encima de la barra completados
    if (hechos[i] > 0) {
      ctx.fillStyle    = '#0f766e';
      ctx.font         = `bold ${Math.max(9, Math.floor(areaW / n / 2.8))}px system-ui,sans-serif`;
      ctx.textBaseline = 'bottom';
      ctx.fillText(hechos[i], x + barW / 2, padT + areaH - hHecho - 2);
    }
  });

  // Leyenda
  const ly = H - 10;
  ctx.fillStyle = '#0d9488'; ctx.fillRect(padL, ly - 8, 10, 8);
  ctx.fillStyle = '#94a3b8'; ctx.font = '10px system-ui,sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  ctx.fillText('Completados', padL + 14, ly);
  ctx.fillStyle = '#e2e8f0'; ctx.fillRect(padL + 100, ly - 8, 10, 8);
  ctx.fillStyle = '#94a3b8'; ctx.fillText('Total', padL + 114, ly);

  return { destroy: () => ctx.clearRect(0, 0, W, H) };
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
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
        div.className = a.tipo === 'personalizado' ? 'feedback positive' : 'feedback neutral';

        // parseDbDate interpreta el string de la BD como UTC y lo convierte a hora local
        const fechaObj = parseDbDate(a.fecha_programada);
        const fecha    = fechaObj ? fechaObj.toLocaleString('es') : '';

        div.innerHTML = `
          <span class="aviso-mensaje">${escapeHtml(a.mensaje || '')}</span>
          ${fecha ? `<span class="aviso-fecha">${escapeHtml(fecha)}</span>` : ''}
        `;
        cont.appendChild(div);
      });
    })
    .catch(() => {});
}

// ============================
// TEMPORIZADOR
// ============================
const CIRCUMFERENCE = 213.6; // 2π × r(34)

function updateTimerUI(suffix, remaining, total, paused) {
  const digits = document.getElementById(`timer-digits-${suffix}`);
  const ring   = document.getElementById(`timer-ring-fill-${suffix}`);
  if (!digits || !ring) return;
  digits.textContent = TimerManager.format(remaining);
  const progress = total > 0 ? remaining / total : 0;
  ring.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);
  ring.classList.toggle('timer-paused', !!paused);
  ring.classList.toggle('timer-urgent', !paused && remaining <= 30);
}

function showTimerDisplay(suffix, label) {
  const setup   = document.getElementById(`timer-setup-${suffix}`);
  const display = document.getElementById(`timer-display-${suffix}`);
  const lbl     = document.getElementById(`timer-label-${suffix}`);
  if (setup)   setup.style.display   = 'none';
  if (display) display.style.display = '';
  if (lbl)     lbl.textContent       = label || '';
}

function showTimerSetup(suffix) {
  const setup   = document.getElementById(`timer-setup-${suffix}`);
  const display = document.getElementById(`timer-display-${suffix}`);
  if (setup)   setup.style.display   = '';
  if (display) display.style.display = 'none';
}

function restoreTimerIfActive(suffix) {
  const t = TimerManager.get(suffix);
  if (!t) return;
  showTimerDisplay(suffix, t.label);
  updateTimerUI(suffix, t.remaining, t.total, t.paused);
  t.onTick   = (rem, tot) => updateTimerUI(suffix, rem, tot, t.paused);
  t.onFinish = () => { showTimerSetup(suffix); loadViewData(suffix === 'avisos' ? 'avisos' : 'rutinas'); };
  bindTimerButtons(suffix);
}

function bindTimerButtons(suffix) {
  const btnPause  = document.getElementById(`btn-timer-pause-${suffix}`);
  const btnCancel = document.getElementById(`btn-timer-cancel-${suffix}`);
  if (btnPause) {
    btnPause.onclick = () => {
      const paused = TimerManager.togglePause(suffix);
      btnPause.textContent = paused ? 'Reanudar' : 'Pausar';
      const t = TimerManager.get(suffix);
      if (t) updateTimerUI(suffix, t.remaining, t.total, paused);
    };
  }
  if (btnCancel) {
    btnCancel.onclick = () => { TimerManager.stop(suffix); showTimerSetup(suffix); };
  }
}

function startTimer(suffix, label, minutes, onFinishCallback) {
  showTimerDisplay(suffix, label);
  TimerManager.start({
    id: suffix, label, minutes,
    onTick:   (rem, tot) => { const t = TimerManager.get(suffix); updateTimerUI(suffix, rem, tot, t ? t.paused : false); },
    onFinish: () => { showTimerSetup(suffix); if (onFinishCallback) onFinishCallback(); },
  });
  bindTimerButtons(suffix);
}

function programarTemporizador(e) {
  e.preventDefault();
  const msg     = document.getElementById('aviso-mensaje');
  const mins    = document.getElementById('aviso-minutos');
  const mensaje = (msg && msg.value.trim()) || '';
  const minutos = Math.max(1, parseInt(mins?.value || '5', 10) || 5);

  if (!mensaje) { alert('Escribe el mensaje del recordatorio.'); return; }

  // Guardar en UTC — el navegador convierte a local al mostrar
  const fechaStr = toUTCDateTimeStr(new Date(Date.now() + minutos * 60 * 1000));

  apiFetch(`${API_BASE}/avisos.php`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ mensaje: `${mensaje} (en ${minutos} min)`, tipo: 'personalizado', fecha_programada: fechaStr }),
  })
    .then(r => r.json())
    .then(data => {
      if (!data.ok) { alert(data.error || 'No se pudo guardar.'); return; }
      if (msg)  msg.value  = '';
      if (mins) mins.value = '5';
      startTimer('avisos', mensaje, minutos, () => loadViewData('avisos'));
    })
    .catch(() => alert('Error al programar el recordatorio.'));
}

function loadConfiguracion() {
  apiFetch(`${API_BASE}/configuracion.php`)
    .then(res => res.json())
    .then(data => {
      if (!data.ok || !data.configuracion) return;
      const c   = data.configuracion;
      const chk = document.getElementById('config-notificaciones');
      const sel = document.getElementById('config-tema');
      if (chk) chk.checked = !!c.notificaciones;
      if (sel) sel.value   = c.tema || 'claro';
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

        // Cargar sesiones activas
        loadSesiones();

        // Cerrar sesión individual
        const listaSesiones = document.getElementById('lista-sesiones');
        if (listaSesiones) {
          listaSesiones.addEventListener('click', e => {
            const btn = e.target.closest('.btn-cerrar-sesion');
            if (!btn || btn.disabled) return;
            const jti = btn.dataset.jti;
            if (!confirm('¿Cerrar esta sesión?')) return;
            apiFetch(`${API_BASE}/sesiones.php?jti=${encodeURIComponent(jti)}`, { method: 'DELETE' })
              .then(r => r.json())
              .then(data => { if (data.ok) loadSesiones(); })
              .catch(() => {});
          });
        }

        // Cerrar todas las sesiones
        const btnCerrarTodas = document.getElementById('btn-cerrar-todas');
        if (btnCerrarTodas) {
          btnCerrarTodas.addEventListener('click', () => {
            if (!confirm('¿Cerrar TODAS las sesiones activas? Tendrás que volver a iniciar sesión.')) return;
            apiFetch(`${API_BASE}/sesiones.php?todas=1`, { method: 'DELETE' })
              .then(r => r.json())
              .then(data => { if (data.ok) window.location.href = 'login.html'; })
              .catch(() => {});
          });
        }

        const btnEditarPerfil  = document.getElementById('btn-editar-perfil');
        const btnCancelarPerfil = document.getElementById('btn-cancelar-perfil');
        const btnGuardarPerfil  = document.getElementById('btn-guardar-perfil');
        const cardEditar        = document.getElementById('card-editar-perfil');

        if (btnEditarPerfil) {
          btnEditarPerfil.addEventListener('click', () => {
            // Pre-rellenar con valores actuales
            document.getElementById('edit-nombre').value = document.getElementById('perfil-nombre').textContent.trim();
            document.getElementById('edit-correo').value = document.getElementById('perfil-email').textContent.trim();
            document.getElementById('edit-password-actual').value    = '';
            document.getElementById('edit-password-nueva').value     = '';
            document.getElementById('edit-password-confirmar').value = '';
            document.getElementById('perfil-error').style.display = 'none';
            document.getElementById('perfil-exito').style.display = 'none';
            cardEditar.style.display = '';
            btnEditarPerfil.style.display = 'none';
          });
        }
        if (btnCancelarPerfil) {
          btnCancelarPerfil.addEventListener('click', () => {
            cardEditar.style.display = 'none';
            btnEditarPerfil.style.display = '';
          });
        }
        if (btnGuardarPerfil) {
          btnGuardarPerfil.addEventListener('click', guardarPerfil);
        }
        break;

      case 'rutinas':
        const btnCrear = document.getElementById('btn-crear-rutina');
        if (btnCrear) btnCrear.addEventListener('click', crearRutina);

        // Filtros de estado
        document.querySelectorAll('.btn-filtro').forEach(btn => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-filtro').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filtroActivo = btn.dataset.filtro;
            renderRutinas();
          });
        });

        // Ocultar completados
        const chkOcultar = document.getElementById('ocultar-completados');
        if (chkOcultar) chkOcultar.onchange = () => renderRutinas();

        // Delegación de acciones en tarjetas (pausar, activar, eliminar)
        const listaRutinas = document.getElementById('lista-rutinas');
        if (listaRutinas) {
          listaRutinas.addEventListener('click', e => {
            // Acciones de rutina (pausar, activar, eliminar)
            const btnAccion = e.target.closest('[data-action]');
            if (btnAccion) {
              const id     = parseInt(btnAccion.dataset.id, 10);
              const action = btnAccion.dataset.action;
              if (action === 'pausar')   cambiarEstadoRutina(id, 'pausada');
              if (action === 'activar')  cambiarEstadoRutina(id, 'activa');
              if (action === 'eliminar') eliminarRutina(id);
              return;
            }
            // Eliminar hábito individual
            const btnElimHabito = e.target.closest('.btn-eliminar-habito');
            if (btnElimHabito) {
              eliminarHabito(parseInt(btnElimHabito.dataset.idHabito, 10));
              return;
            }
            // Agregar hábito
            const btnAgregar = e.target.closest('.btn-agregar-habito');
            if (btnAgregar) {
              const idRutina = parseInt(btnAgregar.dataset.idRutina, 10);
              const card     = btnAgregar.closest('.rutina-card');
              const input    = card.querySelector('.input-nuevo-habito');
              const select   = card.querySelector('.select-frecuencia-habito');
              agregarHabito(idRutina, input.value, select.value);
              return;
            }
          });

          // Enter en el input también agrega el hábito
          listaRutinas.addEventListener('keydown', e => {
            if (e.key !== 'Enter') return;
            const input = e.target.closest('.input-nuevo-habito');
            if (!input) return;
            const idRutina = parseInt(input.dataset.idRutina, 10);
            const card     = input.closest('.rutina-card');
            const select   = card.querySelector('.select-frecuencia-habito');
            agregarHabito(idRutina, input.value, select.value);
          });
        }

        // Presets de temporizador
        document.querySelectorAll('.btn-preset').forEach(btn => {
          btn.addEventListener('click', () => {
            const input = document.getElementById('rutina-timer-minutos');
            if (input) input.value = btn.dataset.mins;
            document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
          });
        });

        const btnIniciar = document.getElementById('btn-iniciar-rutina-timer');
        if (btnIniciar) {
          btnIniciar.addEventListener('click', () => {
            const label = document.getElementById('rutina-timer-label')?.value.trim() || 'Sesión de enfoque';
            const minsV = Math.max(1, parseInt(document.getElementById('rutina-timer-minutos')?.value || '25', 10) || 25);
            startTimer('rutinas', label, minsV, null);
          });
        }
        restoreTimerIfActive('rutinas');
        break;

      case 'historial':
        document.querySelectorAll('.btn-rango').forEach(btn => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-rango').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            historialDias = parseInt(btn.dataset.dias, 10);
            loadHistorial();
          });
        });
        break;

      case 'avisos':
        const formTemp = document.getElementById('form-temporizador');
        if (formTemp) formTemp.addEventListener('submit', programarTemporizador);
        restoreTimerIfActive('avisos');
        break;

      case 'configuraciones':
        const btnConfig = document.getElementById('btn-guardar-config');
        if (btnConfig) btnConfig.addEventListener('click', guardarConfiguracion);
        break;
    }
  }, 0);
}

function guardarPrefsUsuario() {
  const sel  = document.getElementById('pref-tema');
  const tema = sel ? sel.value : 'claro';
  apiFetch(`${API_BASE}/configuracion.php`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tema }),
  })
    .then(res => res.json())
    .then(data => {
      if (data.ok) {
        applyTema(tema);
        const fb = document.getElementById('prefs-feedback');
        if (fb) { fb.style.display = 'block'; setTimeout(() => fb.style.display = 'none', 3000); }
      }
    })
    .catch(() => {});
}

function guardarConfiguracion() {
  const sel  = document.getElementById('config-tema');
  const tema = sel ? sel.value : 'claro';
  apiFetch(`${API_BASE}/configuracion.php`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tema }),
  })
    .then(res => res.json())
    .then(data => {
      if (data.ok) {
        applyTema(tema);
        const fb = document.getElementById('config-feedback');
        if (fb) { fb.style.display = 'block'; setTimeout(() => fb.style.display = 'none', 3000); }
      }
    })
    .catch(() => {});
}

function guardarPerfil() {
  const nombre   = document.getElementById('edit-nombre')?.value.trim() || '';
  const correo   = document.getElementById('edit-correo')?.value.trim() || '';
  const pwActual = document.getElementById('edit-password-actual')?.value || '';
  const pwNueva  = document.getElementById('edit-password-nueva')?.value || '';
  const pwConf   = document.getElementById('edit-password-confirmar')?.value || '';
  const errEl    = document.getElementById('perfil-error');
  const okEl     = document.getElementById('perfil-exito');

  const mostrarError = msg => { if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; } if (okEl) okEl.style.display = 'none'; };

  if (!nombre || !correo) return mostrarError('Nombre y correo son obligatorios.');
  if (pwNueva && pwNueva !== pwConf) return mostrarError('Las contraseñas nuevas no coinciden.');
  if (pwNueva && pwNueva.length < 8)  return mostrarError('La contraseña debe tener al menos 8 caracteres.');

  const body = { nombre, correo };
  if (pwNueva) { body.password_actual = pwActual; body.password_nueva = pwNueva; }

  apiFetch(`${API_BASE}/usuario.php`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
    .then(r => r.json())
    .then(data => {
      if (!data.ok) return mostrarError(data.error || 'No se pudo guardar.');
      // Actualizar vista de perfil
      const elN = document.getElementById('perfil-nombre');
      const elE = document.getElementById('perfil-email');
      if (elN) elN.textContent = nombre;
      if (elE) elE.textContent = correo;
      if (errEl) errEl.style.display = 'none';
      if (okEl)  { okEl.textContent = '✓ Perfil actualizado correctamente.'; okEl.style.display = 'block'; }
      // Limpiar campos de contraseña
      document.getElementById('edit-password-actual').value    = '';
      document.getElementById('edit-password-nueva').value     = '';
      document.getElementById('edit-password-confirmar').value = '';
    })
    .catch(() => mostrarError('Error de conexión.'));
}

function marcarHabito(idHabito) {
  if (!idHabito) return;
  const hoy = toLocalDateTimeStr(new Date()).slice(0, 10);
  apiFetch(`${API_BASE}/cumplimiento.php`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_habito: parseInt(idHabito, 10), fecha: hoy, completado: true }),
  })
    .then(res => res.json())
    .then(data => { if (data.ok) loadViewData('rutinas'); })
    .catch(() => {});
}

function crearRutina() {
  const nombreRutina = document.getElementById('nueva-rutina-nombre');
  const nombreHabito = document.getElementById('nuevo-habito-nombre');
  const frecuencia   = document.getElementById('nueva-rutina-frecuencia');
  const nom          = (nombreRutina && nombreRutina.value.trim()) || '';
  if (!nom) { alert('Escribe el nombre de la rutina.'); return; }
  const freq      = (frecuencia && frecuencia.value) || 'diaria';
  const nomHabito = (nombreHabito && nombreHabito.value.trim()) || '';

  apiFetch(`${API_BASE}/rutinas.php`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: nom, fecha_inicio: toLocalDateTimeStr(new Date()).slice(0, 10) }),
  })
    .then(res => res.json())
    .then(data => {
      if (!data.ok || !data.id_rutina) { alert(data.error || 'Error al crear rutina.'); return; }
      if (nomHabito) {
        return apiFetch(`${API_BASE}/habitos.php`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_rutina: data.id_rutina, nombre: nomHabito, frecuencia: freq }),
        }).then(r => r.json());
      }
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
function load404() { window.location.href = '404.html'; }

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
    const view  = link.dataset.view;
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
    .then(data => { if (data.ok && data.configuracion?.tema) applyTema(data.configuracion.tema); })
    .catch(() => {});
}

// ============================
// VISTA INICIAL
// ============================
applyThemeFromServer().then(() => {
  TimerManager.requestPermission();
  loadView('usuario');
});