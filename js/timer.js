// ====================================================
// timer.js — TimerManager global
// Incluir en dashboard.html ANTES de script.js:
//   <script src="js/timer.js"></script>
//
// Notificaciones 100% JavaScript, sin dependencias
// externas ni permisos del navegador. Funciona con
// file://, localhost y cualquier entorno local.
// ====================================================

const TimerManager = (() => {

    // ── Estado interno ─────────────────────────────
    const timers = {};

    // ── No-op: mantenido por compatibilidad ───────
    function requestPermission() {}

    // ── 1. SONIDO — Web Audio API (sin archivos) ──
    function playBeep() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const beeps = [
                { start: 0,    duration: 0.12, freq: 880  },
                { start: 0.18, duration: 0.12, freq: 880  },
                { start: 0.36, duration: 0.35, freq: 1046 },
            ];
            beeps.forEach(({ start, duration, freq }) => {
                const osc  = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = "sine";
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0, ctx.currentTime + start);
                gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + start + 0.02);
                gain.gain.linearRampToValueAtTime(0,   ctx.currentTime + start + duration);
                osc.start(ctx.currentTime + start);
                osc.stop(ctx.currentTime  + start + duration + 0.05);
            });
            setTimeout(() => ctx.close(), 1200);
        } catch (_) {}
    }

    // ── 2. MODAL in-page ──────────────────────────
    function showModal(label) {
        document.getElementById("timer-modal-overlay")?.remove();
        const msg = label ? `"${label}" ha terminado.` : "Tu temporizador ha terminado.";

        const overlay = document.createElement("div");
        overlay.id = "timer-modal-overlay";
        overlay.style.cssText = `
            position:fixed; inset:0; background:rgba(0,0,0,.45);
            display:flex; align-items:center; justify-content:center;
            z-index:2000; animation:timerFadeIn .25s ease;
        `;
        overlay.innerHTML = `
            <div style="
                background:#fff; border-radius:20px; padding:2rem 2.5rem;
                max-width:340px; width:90%; text-align:center;
                box-shadow:0 24px 60px rgba(0,0,0,.2);
                animation:timerSlideUp .3s ease;
                font-family:var(--font-sans,system-ui,sans-serif);
            ">
                <div style="font-size:2.5rem; margin-bottom:.75rem;">&#9200;</div>
                <h2 style="font-size:1.1rem; font-weight:700; color:#1c2026; margin-bottom:.5rem;">
                    &iexcl;Tiempo completado!
                </h2>
                <p style="font-size:.875rem; color:#5f6773; margin-bottom:1.5rem; line-height:1.5;">
                    ${msg}
                </p>
                <button id="timer-modal-close" style="
                    padding:.6rem 1.75rem; border:none; border-radius:10px; cursor:pointer;
                    background:linear-gradient(180deg,#0d9488 0%,#0f766e 100%);
                    color:#fff; font-size:.875rem; font-weight:600;
                    font-family:var(--font-sans,system-ui,sans-serif);
                    box-shadow:0 2px 8px rgba(13,148,136,.35);
                ">Entendido</button>
            </div>
        `;

        if (!document.getElementById("timer-modal-styles")) {
            const style = document.createElement("style");
            style.id = "timer-modal-styles";
            style.textContent = `
                @keyframes timerFadeIn  { from{opacity:0} to{opacity:1} }
                @keyframes timerSlideUp { from{transform:translateY(16px);opacity:0}
                                           to{transform:translateY(0);opacity:1} }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(overlay);
        document.getElementById("timer-modal-close").onclick = () => overlay.remove();
        overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
    }

    // ── 3. TÍTULO PARPADEANTE en la pestaña ───────
    function flashTitle(label) {
        const original = document.title;
        const flash    = "\u23F0 " + (label || "!Tiempo!");
        let   on = true, count = 0;
        const iv = setInterval(() => {
            document.title = on ? flash : original;
            on = !on;
            if (++count >= 10) { clearInterval(iv); document.title = original; }
        }, 500);
        document.addEventListener("visibilitychange", () => {
            clearInterval(iv); document.title = original;
        }, { once: true });
    }

    // ── Orquesta los 3 mecanismos ─────────────────
    function notify(label) {
        playBeep();
        showModal(label);
        flashTitle(label);
    }

    // ── Crear / arrancar un temporizador ──────────
    function start({ id, label, minutes, onTick, onFinish }) {
        stop(id);
        const total = minutes * 60;
        timers[id] = { id, label, total, remaining: total, paused: false, onTick, onFinish, intervalId: null };
        const t = timers[id];
        t.intervalId = setInterval(() => {
            if (t.paused) return;
            t.remaining--;
            if (t.onTick) t.onTick(t.remaining, t.total);
            if (t.remaining <= 0) {
                clearInterval(t.intervalId);
                delete timers[id];
                notify(label);
                if (onFinish) onFinish();
            }
        }, 1000);
        if (t.onTick) t.onTick(t.remaining, t.total);
    }

    // ── Pausar / reanudar ─────────────────────────
    function togglePause(id) {
        const t = timers[id];
        if (!t) return false;
        t.paused = !t.paused;
        return t.paused;
    }

    // ── Cancelar ──────────────────────────────────
    function stop(id) {
        const t = timers[id];
        if (!t) return;
        clearInterval(t.intervalId);
        delete timers[id];
    }

    // ── Consultar estado ──────────────────────────
    function get(id) { return timers[id] ?? null; }

    // ── Formatear segundos → MM:SS ────────────────
    function format(seconds) {
        const m = Math.floor(Math.max(0, seconds) / 60);
        const s = Math.max(0, seconds) % 60;
        return String(m).padStart(2,"0") + ":" + String(s).padStart(2,"0");
    }

    return { start, stop, togglePause, get, format, requestPermission };
})();