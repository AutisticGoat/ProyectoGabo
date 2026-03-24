// =====================================================
// recoverPassword.js — Flujo de recuperación en 2 pasos
// Paso 1: Enviar correo → Paso 2: Código + nueva contraseña
// =====================================================

const globalError = document.getElementById("globalError");

// ── Referencias a los dos pasos ───────────────────
const stepEmail    = document.getElementById("stepEmail");
const stepReset    = document.getElementById("stepReset");

// ── Paso 1: formulario de correo ──────────────────
const formEmail    = document.getElementById("formEmail");
const emailInput   = document.getElementById("email");

// ── Paso 2: formulario de código + nueva contraseña
const formReset    = document.getElementById("formReset");
const codigoInput  = document.getElementById("codigo");
const passwordInput = document.getElementById("password");
const correoOculto = document.getElementById("correoOculto"); // campo hidden

// ── Utilidades ────────────────────────────────────
function showError(input, msg) {
  input.classList.add("invalid");
  const next = input.nextElementSibling;
  if (next && next.classList.contains("error")) next.textContent = msg;
}

function clearErrors() {
  document.querySelectorAll(".error").forEach(e => e.textContent = "");
  document.querySelectorAll("input").forEach(i => i.classList.remove("invalid"));
  globalError.textContent = "";
  globalError.style.color = "";
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.textContent = loading ? "Cargando…" : btn.dataset.label;
}

// ── PASO 1: Enviar código ─────────────────────────
formEmail.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors();

  const correo = emailInput.value.trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    showError(emailInput, "Introduce un correo válido.");
    return;
  }

  const btn = formEmail.querySelector("button");
  setLoading(btn, true);

  try {
    const fd = new FormData();
    fd.append("correo", correo);

    const res  = await fetch("php/recover.php", { method: "POST", body: fd, credentials: "include" });
    const data = await res.json();

    if (!data.ok) {
      globalError.textContent = data.error || "Error al enviar el correo.";
      return;
    }

    // Guardar correo y mostrar paso 2
    correoOculto.value = correo;
    document.getElementById("correoInfo").textContent = correo;
    stepEmail.hidden = true;
    stepReset.hidden = false;
    codigoInput.focus();

  } catch {
    globalError.textContent = "Error de conexión. Intenta de nuevo.";
  } finally {
    setLoading(btn, false);
  }
});

// ── PASO 2: Validar código y cambiar contraseña ───
formReset.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors();

  const correo   = correoOculto.value;
  const codigo   = codigoInput.value.trim();
  const password = passwordInput.value;

  let valid = true;

  if (!/^\d{6}$/.test(codigo)) {
    showError(codigoInput, "El código debe tener 6 dígitos.");
    valid = false;
  }

  if (password.length < 6) {
    showError(passwordInput, "La contraseña debe tener al menos 6 caracteres.");
    valid = false;
  }

  if (!valid) return;

  const btn = formReset.querySelector("button");
  setLoading(btn, true);

  try {
    const fd = new FormData();
    fd.append("correo",   correo);
    fd.append("codigo",   codigo);
    fd.append("password", password);

    const res  = await fetch("php/reset_password.php", { method: "POST", body: fd, credentials: "include" });
    const data = await res.json();

    if (!data.ok) {
      globalError.textContent = data.error || "Código incorrecto o expirado.";
      return;
    }

    globalError.style.color = "green";
    globalError.textContent = "¡Contraseña actualizada! Redirigiendo…";
    setTimeout(() => window.location.href = data.redirect || "login.html", 1500);

  } catch {
    globalError.textContent = "Error de conexión. Intenta de nuevo.";
  } finally {
    setLoading(btn, false);
  }
});

// ── Volver al paso 1 ──────────────────────────────
document.getElementById("btnVolver").addEventListener("click", () => {
  clearErrors();
  stepReset.hidden = true;
  stepEmail.hidden = false;
  emailInput.focus();
});