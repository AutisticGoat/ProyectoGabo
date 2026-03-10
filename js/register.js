const form = document.getElementById("registerForm");
const globalError = document.getElementById("globalError");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  globalError.textContent = "";
  document.querySelectorAll(".error").forEach((el) => (el.textContent = ""));
  document.querySelectorAll("input").forEach((i) => i.classList.remove("invalid"));

  const nombre = form.username.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value;

  if (!nombre) {
    showError(form.username, "El nombre es obligatorio.");
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError(form.email, "Introduce un correo válido.");
    return;
  }
  if (!password) {
    showError(form.password, "La contraseña es obligatoria.");
    return;
  }

  try {
    const formData = new FormData();
    formData.append("username", nombre);
    formData.append("email", email);
    formData.append("password", password);

    const res = await fetch("php/register.php", {
      method: "POST",
      body: formData,
      credentials: "include"
    });
    const data = await res.json();

    if (data.ok) {
      globalError.textContent = data.message || "Registro exitoso. Redirigiendo...";
      globalError.style.color = "green";
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);
      return;
    }

    globalError.textContent = data.error || "Error al registrarse.";
  } catch (err) {
    globalError.textContent = "Error de conexión. Intenta de nuevo.";
  }
});

function showError(input, message) {
  input.classList.add("invalid");
  const next = input.nextElementSibling;
  if (next) next.textContent = message;
}
