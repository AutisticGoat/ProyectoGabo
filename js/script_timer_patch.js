// ====================================================
// PARCHE PARA script.js — Integración de temporizadores
//
// INSTRUCCIONES:
//
// 1. En dashboard.html, añade ANTES de script.js:
//      <script src="js/timer.js"></script>
//
// 2. En dashboard.html, añade DESPUÉS de styles.css:
//      <link rel="stylesheet" href="css/timer.css">
//
// 3. En script.js, reemplaza la función `bindViewEvents`
//    completa con la versión de abajo.
//
// 4. En script.js, reemplaza la función `programarTemporizador`
//    completa con la versión de abajo.
//
// 5. En script.js, en la línea final que dice:
//      applyThemeFromServer().then(() => loadView('usuario'));
//    cámbiala por:
//      applyThemeFromServer().then(() => {
//          TimerManager.requestPermission();
//          loadView('usuario');
//      });
//
// 6. En script.js, en la función `loadAvisos`, reemplaza:
//      const fecha = a.fecha_programada
//          ? new Date(a.fecha_programada).toLocaleString('es') : '';
//    por:
//      const fecha = a.fecha_programada
//          ? new Date(a.fecha_programada.replace(' ', 'T')).toLocaleString('es') : '';
// ====================================================


// ── Helper: formatea un Date a "YYYY-MM-DD HH:MM:SS" en hora LOCAL ──
// Evita el desfase UTC que produce toISOString()
function toLocalDateTimeStr(date) {
    const pad = n => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ` +
           `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}


// ── Helpers del anillo SVG ─────────────────────────
const CIRCUMFERENCE = 213.6; // 2π × r(34)

function updateTimerUI(suffix, remaining, total, paused) {
    const digits = document.getElementById(`timer-digits-${suffix}`);
    const ring   = document.getElementById(`timer-ring-fill-${suffix}`);
    if (!digits || !ring) return;

    digits.textContent = TimerManager.format(remaining);

    const progress = total > 0 ? remaining / total : 0;
    ring.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);

    ring.classList.toggle("timer-paused",  !!paused);
    ring.classList.toggle("timer-urgent",  !paused && remaining <= 30);
}

function showTimerDisplay(suffix, label) {
    const setup   = document.getElementById(`timer-setup-${suffix}`);
    const display = document.getElementById(`timer-display-${suffix}`);
    const lbl     = document.getElementById(`timer-label-${suffix}`);
    if (setup)   setup.style.display   = "none";
    if (display) display.style.display = "";
    if (lbl)     lbl.textContent       = label || "";
}

function showTimerSetup(suffix) {
    const setup   = document.getElementById(`timer-setup-${suffix}`);
    const display = document.getElementById(`timer-display-${suffix}`);
    if (setup)   setup.style.display   = "";
    if (display) display.style.display = "none";
}

// Si ya hay un timer activo al cargar la vista, restaura su UI
function restoreTimerIfActive(suffix) {
    const t = TimerManager.get(suffix);
    if (!t) return;
    showTimerDisplay(suffix, t.label);
    updateTimerUI(suffix, t.remaining, t.total, t.paused);
    // Reasignar onTick para que actualice el DOM recién cargado
    t.onTick = (rem, tot) => updateTimerUI(suffix, rem, tot, t.paused);
    t.onFinish = () => { showTimerSetup(suffix); loadViewData(suffix === "avisos" ? "avisos" : "rutinas"); };
    bindTimerButtons(suffix);
}

function bindTimerButtons(suffix) {
    const btnPause  = document.getElementById(`btn-timer-pause-${suffix}`);
    const btnCancel = document.getElementById(`btn-timer-cancel-${suffix}`);

    if (btnPause) {
        btnPause.onclick = () => {
            const paused = TimerManager.togglePause(suffix);
            btnPause.textContent = paused ? "Reanudar" : "Pausar";
            const t = TimerManager.get(suffix);
            if (t) updateTimerUI(suffix, t.remaining, t.total, paused);
        };
    }

    if (btnCancel) {
        btnCancel.onclick = () => {
            TimerManager.stop(suffix);
            showTimerSetup(suffix);
        };
    }
}

function startTimer(suffix, label, minutes, onFinishCallback) {
    showTimerDisplay(suffix, label);

    TimerManager.start({
        id:       suffix,
        label:    label,
        minutes:  minutes,
        onTick:   (rem, tot) => {
            const t = TimerManager.get(suffix);
            updateTimerUI(suffix, rem, tot, t ? t.paused : false);
        },
        onFinish: () => {
            showTimerSetup(suffix);
            if (onFinishCallback) onFinishCallback();
        },
    });

    bindTimerButtons(suffix);
}


// ====================================================
// REEMPLAZA la función `programarTemporizador` en script.js
// ====================================================
function programarTemporizador(e) {
    e.preventDefault();

    const msg  = document.getElementById("aviso-mensaje");
    const mins = document.getElementById("aviso-minutos");
    const mensaje = (msg && msg.value.trim()) || "";
    const minutos = Math.max(1, parseInt(mins?.value || "5", 10) || 5);

    if (!mensaje) {
        alert("Escribe el mensaje del recordatorio.");
        return;
    }

    // Guardar en BD usando hora LOCAL (no UTC)
    const fechaProgramada = new Date(Date.now() + minutos * 60 * 1000);
    const fechaStr = toLocalDateTimeStr(fechaProgramada);

    apiFetch(`${API_BASE}/avisos.php`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
            mensaje:          mensaje + ` (en ${minutos} min)`,
            tipo:             "personalizado",
            fecha_programada: fechaStr,
        }),
    })
        .then(r => r.json())
        .then(data => {
            if (!data.ok) { alert(data.error || "No se pudo guardar."); return; }

            // Limpiar formulario
            if (msg)  msg.value  = "";
            if (mins) mins.value = "5";

            // Arrancar cuenta regresiva visual
            startTimer("avisos", mensaje, minutos, () => loadViewData("avisos"));
        })
        .catch(() => alert("Error al programar el recordatorio."));
}


// ====================================================
// REEMPLAZA la función `bindViewEvents` en script.js
// ====================================================
function bindViewEvents(viewName) {
    setTimeout(() => {
        switch (viewName) {

            case "usuario":
                const btnLogout = document.getElementById("btn-logout");
                if (btnLogout) btnLogout.addEventListener("click", () => {
                    window.location.href = "php/logout.php";
                });
                const btnPrefs = document.getElementById("btn-guardar-prefs");
                if (btnPrefs) btnPrefs.addEventListener("click", guardarPrefsUsuario);
                break;

            case "rutinas":
                const btnCrear = document.getElementById("btn-crear-rutina");
                if (btnCrear) btnCrear.addEventListener("click", crearRutina);

                // Presets de tiempo
                document.querySelectorAll(".btn-preset").forEach(btn => {
                    btn.addEventListener("click", () => {
                        const input = document.getElementById("rutina-timer-minutos");
                        if (input) input.value = btn.dataset.mins;
                        document.querySelectorAll(".btn-preset").forEach(b => b.classList.remove("active"));
                        btn.classList.add("active");
                    });
                });

                // Botón iniciar enfoque
                const btnIniciar = document.getElementById("btn-iniciar-rutina-timer");
                if (btnIniciar) {
                    btnIniciar.addEventListener("click", () => {
                        const label = (document.getElementById("rutina-timer-label")?.value.trim()) || "Sesión de enfoque";
                        const mins  = Math.max(1, parseInt(document.getElementById("rutina-timer-minutos")?.value || "25", 10) || 25);
                        startTimer("rutinas", label, mins, null);
                    });
                }

                restoreTimerIfActive("rutinas");
                break;

            case "historial":
                break;

            case "avisos":
                const formTemp = document.getElementById("form-temporizador");
                if (formTemp) formTemp.addEventListener("submit", programarTemporizador);
                restoreTimerIfActive("avisos");
                break;

            case "configuraciones":
                const btnConfig = document.getElementById("btn-guardar-config");
                if (btnConfig) btnConfig.addEventListener("click", guardarConfiguracion);
                break;
        }
    }, 0);
}