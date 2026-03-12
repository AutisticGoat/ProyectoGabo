const form        = document.getElementById("loginForm");
const emailInput  = document.getElementById("email");
const passwordInput = document.getElementById("password");
const globalError = document.getElementById("globalError");

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors();

  let valid = true;

  if (!emailRegex.test(emailInput.value.trim())) {
    showError(emailInput, "Introduce un correo válido.");
    valid = false;
  }

  if (passwordInput.value.length < 1) {
    showError(passwordInput, "La contraseña es obligatoria.");
    valid = false;
  }

  if (!valid) return;

  try {
    const formData = new FormData(form);

    // Detectar zona horaria del navegador automáticamente
    // Ej: "America/Hermosillo", "America/Merida", "America/Santiago"
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    formData.append("timezone", timezone);

    const res  = await fetch("php/login.php", { method: "POST", body: formData, credentials: "include" });
    const data = await res.json();

    if (data.ok && data.redirect) {
      window.location.href = data.redirect;
      return;
    }

    globalError.textContent = data.error || "Usuario o contraseña incorrectos.";
  } catch (err) {
    globalError.textContent = "Error de conexión. Intenta de nuevo.";
  }
});

function showError(input, message) {
  input.classList.add("invalid");
  const next = input.nextElementSibling;
  if (next) next.textContent = message;
}

function clearErrors() {
  document.querySelectorAll(".error").forEach((e) => (e.textContent = ""));
  document.querySelectorAll("input").forEach((i) => i.classList.remove("invalid"));
}