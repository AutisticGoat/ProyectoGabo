// ============================
// PANEL ADMINISTRADOR
// Vistas: admin-estadisticas, admin-usuarios
// ============================

const VALID_ADMIN_VIEWS = ["admin-estadisticas", "admin-usuarios"];
const API = "php";

const container = document.getElementById("view-container");

// ── Fetch con manejo de 401 / 403 ─────────────────
async function apiFetch(url, options = {}) {
    const res = await fetch(url, { credentials: "include", ...options });
    if (res.status === 401) { window.location.href = "login.html"; throw new Error("No autorizado"); }
    if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Acceso denegado");
    }
    return res;
}

// ── Toast ──────────────────────────────────────────
const toast = document.createElement("div");
toast.id = "admin-toast";
document.body.appendChild(toast);

function showToast(msg, tipo = "ok") {
    toast.textContent = msg;
    toast.className = `show toast-${tipo}`;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toast.className = ""; }, 3000);
}

// ── Escape HTML ────────────────────────────────────
function esc(t) {
    const d = document.createElement("div");
    d.textContent = t ?? "";
    return d.innerHTML;
}

// ── Carga de vistas ────────────────────────────────
function loadView(viewName) {
    if (!VALID_ADMIN_VIEWS.includes(viewName)) return;

    fetch(`views/${viewName}.html`, { credentials: "include" })
        .then(r => r.text())
        .then(html => {
            container.innerHTML = html;
            const titleEl = document.getElementById("page-title");
            const link    = document.querySelector(`.nav-link[data-view="${viewName}"]`);
            if (titleEl && link) titleEl.textContent = link.dataset.title || viewName;
            loadViewData(viewName);
        })
        .catch(() => {});
}

function loadViewData(viewName) {
    switch (viewName) {
        case "admin-estadisticas": loadEstadisticas(); break;
        case "admin-usuarios":     loadUsuarios();     break;
    }
}

// ══════════════════════════════════════════════════
// ESTADÍSTICAS
// ══════════════════════════════════════════════════
function loadEstadisticas() {
    apiFetch(`${API}/admin_stats.php`)
        .then(r => r.json())
        .then(data => {
            if (!data.ok) return;
            set("stat-usuarios", data.total_usuarios);
            set("stat-activos",  data.usuarios_activos);
            set("stat-rutinas",  data.total_rutinas);
            set("stat-habitos",  data.total_habitos);
        })
        .catch(() => {});
}

function set(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val ?? "—";
}

// ══════════════════════════════════════════════════
// USUARIOS
// ══════════════════════════════════════════════════
let todosLosUsuarios = [];
let rolesDisponibles = []; // catálogo de roles del servidor

function loadUsuarios(filtro = "") {
    apiFetch(`${API}/admin.php`)
        .then(r => r.json())
        .then(data => {
            if (!data.ok) return;
            todosLosUsuarios = data.usuarios || [];
            renderUsuarios(filtro);
            bindUsuariosEvents();
        })
        .catch(() => {});
}

function renderUsuarios(filtro = "") {
    const tbody = document.getElementById("cuerpo-usuarios");
    if (!tbody) return;

    const q = filtro.trim().toLowerCase();
    const lista = q
        ? todosLosUsuarios.filter(u =>
            u.nombre.toLowerCase().includes(q) ||
            u.correo.toLowerCase().includes(q))
        : todosLosUsuarios;

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--color-text-muted);">
            ${q ? "No se encontraron usuarios." : "No hay usuarios."}</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(u => {
        const estadoBadge = u.estado === "activo"
            ? `<span class="badge badge-activo">Activo</span>`
            : `<span class="badge badge-inactivo">Inactivo</span>`;

        // Badge de rol con color por nivel jerárquico
        const coloresRol = { 1: "badge-superadmin", 2: "badge-admin", 3: "badge-editor", 4: "badge-usuario" };
        const rolBadge = `<span class="badge ${coloresRol[u.nivel_rol] || 'badge-usuario'}">${esc(u.nombre_rol)}</span>`;

        const fecha = u.fecha_creacion
            ? new Date(u.fecha_creacion).toLocaleDateString("es")
            : "—";

        const btnEstado = u.estado === "activo"
            ? `<button class="btn-sm btn-warning"
                       data-action="estado" data-id="${u.id_usuario}" data-valor="inactivo"
                       title="Desactivar">Desactivar</button>`
            : `<button class="btn-sm btn-neutral"
                       data-action="estado" data-id="${u.id_usuario}" data-valor="activo"
                       title="Activar">Activar</button>`;

        // Selector de rol dinámico con los roles que el admin puede asignar
        const opcionesRol = rolesDisponibles.map(r =>
            `<option value="${r.id_rol}" ${r.id_rol == u.id_rol ? "selected" : ""}>${esc(r.nombre)}</option>`
        ).join("");
        const selectRol = `<select class="select-rol-usuario" data-action="rol" data-id="${u.id_usuario}">${opcionesRol}</select>`;

        const btnEliminar = `<button class="btn-sm btn-danger"
                       data-action="eliminar" data-id="${u.id_usuario}" data-nombre="${esc(u.nombre)}"
                       title="Eliminar cuenta">Eliminar</button>`;

        return `
            <tr>
                <td>${esc(String(u.id_usuario))}</td>
                <td>${esc(u.nombre)}</td>
                <td>${esc(u.correo)}</td>
                <td>${estadoBadge}</td>
                <td>${rolBadge}</td>
                <td>${selectRol}</td>
                <td>${esc(fecha)}</td>
                <td><div class="actions">${btnEstado}${btnEliminar}</div></td>
            </tr>`;
    }).join("");
}

function bindUsuariosEvents() {
    // Búsqueda
    const inputBuscar  = document.getElementById("buscar-usuario");
    const btnBuscar    = document.getElementById("btn-buscar");
    const btnVerTodos  = document.getElementById("btn-ver-todos");
    const tbody        = document.getElementById("cuerpo-usuarios");

    if (btnBuscar) {
        btnBuscar.addEventListener("click", () => {
            renderUsuarios(inputBuscar?.value ?? "");
        });
    }

    if (inputBuscar) {
        inputBuscar.addEventListener("keydown", e => {
            if (e.key === "Enter") renderUsuarios(inputBuscar.value);
        });
    }

    if (btnVerTodos) {
        btnVerTodos.addEventListener("click", () => {
            if (inputBuscar) inputBuscar.value = "";
            renderUsuarios("");
        });
    }

    // Delegación de clics en la tabla
    if (tbody) {
        tbody.addEventListener("click", e => {
            const btn = e.target.closest("[data-action]");
            if (!btn || btn.tagName === "SELECT") return;

            const { action, id, valor, nombre } = btn.dataset;

            if (action === "estado") {
                cambiarCampo(parseInt(id), { estado: valor });
            }
            if (action === "eliminar") {
                if (confirm(`¿Eliminar la cuenta de "${nombre}"? Esta acción no se puede deshacer.`)) {
                    eliminarUsuario(parseInt(id));
                }
            }
        });

        // Cambio de rol mediante el select
        tbody.addEventListener("change", e => {
            const sel = e.target.closest(".select-rol-usuario");
            if (!sel) return;
            const id_usuario = parseInt(sel.dataset.id, 10);
            const id_rol     = parseInt(sel.value, 10);
            const rolNombre  = rolesDisponibles.find(r => r.id_rol == id_rol)?.nombre || "";
            if (confirm(`¿Cambiar el rol de este usuario a "${rolNombre}"? Se cerrarán todas sus sesiones activas.`)) {
                cambiarCampo(id_usuario, { id_rol });
            } else {
                // Revertir el select visualmente
                loadUsuarios(document.getElementById("buscar-usuario")?.value ?? "");
            }
        });
    }
}

function cambiarCampo(id_usuario, payload) {
    apiFetch(`${API}/admin.php`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_usuario, ...payload }),
    })
        .then(r => r.json())
        .then(data => {
            if (data.ok) {
                showToast(data.aviso || "Cambio guardado correctamente.", "ok");
                loadUsuarios(document.getElementById("buscar-usuario")?.value ?? "");
            } else {
                showToast(data.error || "Error al guardar.", "error");
                loadUsuarios(document.getElementById("buscar-usuario")?.value ?? "");
            }
        })
        .catch(err => showToast(err.message || "Error de conexión.", "error"));
}

function eliminarUsuario(id_usuario) {
    apiFetch(`${API}/admin.php?id=${id_usuario}`, { method: "DELETE" })
        .then(r => r.json())
        .then(data => {
            if (data.ok) {
                showToast("Usuario eliminado.", "ok");
                loadUsuarios(document.getElementById("buscar-usuario")?.value ?? "");
            } else {
                showToast(data.error || "Error al eliminar.", "error");
            }
        })
        .catch(() => showToast("Error de conexión.", "error"));
}

// ══════════════════════════════════════════════════
// NAVEGACIÓN SIDEBAR
// ══════════════════════════════════════════════════
document.querySelectorAll(".sidebar-nav .nav-link[data-view]").forEach(link => {
    link.addEventListener("click", e => {
        e.preventDefault();
        document.querySelectorAll(".sidebar-nav .nav-link").forEach(l => l.classList.remove("active"));
        link.classList.add("active");
        loadView(link.dataset.view);
    });
});

// ══════════════════════════════════════════════════
// VISTA INICIAL
// ══════════════════════════════════════════════════
loadView("admin-estadisticas");