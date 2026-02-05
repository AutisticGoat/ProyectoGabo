const form = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const globalError = document.getElementById("globalError");

// Credenciales permitidas (PROTOTIPO)
const VALID_USER = "Santiago";
const VALID_PASSWORD = "123456";

// Regex
const usernameRegex = /^[a-zA-Z]{3,20}$/;
const passwordRegex = /^\d{6}$/;

form.addEventListener("submit", (e) => {
  e.preventDefault();

  clearErrors();

  let valid = true;

  // Usuario
  if (!usernameRegex.test(usernameInput.value)) {
    showError(
      usernameInput,
      "El usuario debe tener entre 3 y 20 letras."
    );
    valid = false;
  }

  // Contraseña
  if (!passwordRegex.test(passwordInput.value)) {
    showError(
      passwordInput,
      "La contraseña debe ser numérica de 6 dígitos."
    );
    valid = false;
  }

  if (!valid) return;

  // Autenticación simple
  if (
    usernameInput.value === VALID_USER &&
    passwordInput.value === VALID_PASSWORD
  ) {
    // Aquí luego irá la sesión real
    window.location.href = "dashboard.html";
  } else {
    globalError.textContent = "Usuario o contraseña incorrectos.";
  }
});

/* ======================
   FUNCIONES AUXILIARES
   ====================== */

function showError(input, message) {
  input.classList.add("invalid");
  input.nextElementSibling.textContent = message;
}

function clearErrors() {
  document.querySelectorAll(".error").forEach(e => e.textContent = "");
  document.querySelectorAll("input").forEach(i => i.classList.remove("invalid"));
}