// ====================================================
// recoverPassword.js — Flujo de recuperación en 2 pasos
// ====================================================

const paso1    = document.getElementById('paso-1');
const paso2    = document.getElementById('paso-2');
const form1    = document.getElementById('form-paso1');
const form2    = document.getElementById('form-paso2');
const error1   = document.getElementById('error-paso1');
const exito1   = document.getElementById('exito-paso1');
const error2   = document.getElementById('error-paso2');
const exito2   = document.getElementById('exito-paso2');
const subtitulo = document.getElementById('subtitulo-paso2');
const btnOtroCorreo = document.getElementById('btn-otro-correo');

let correoActual = '';

// ── Paso 1: Solicitar código ─────────────────────────
form1.addEventListener('submit', async e => {
    e.preventDefault();
    clearMessages();

    const correoInput = document.getElementById('correo-recuperar');
    const correo      = correoInput.value.trim();

    if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        showError(correoInput, 'Ingresa un correo válido.');
        return;
    }

    const btn = document.getElementById('btn-enviar');
    btn.disabled    = true;
    btn.textContent = 'Enviando…';

    try {
        const fd = new FormData();
        fd.append('correo', correo);

        const res  = await fetch('php/recover.php', { method: 'POST', body: fd });
        const data = await res.json();

        if (data.ok) {
            correoActual = correo;
            subtitulo.textContent = `Ingresa el código enviado a ${correo}.`;
            paso1.style.display = 'none';
            paso2.style.display = '';
            document.getElementById('codigo').focus();
        } else {
            error1.textContent = data.error || 'No se pudo enviar el código.';
        }
    } catch {
        error1.textContent = 'Error de conexión. Intenta de nuevo.';
    } finally {
        btn.disabled    = false;
        btn.textContent = 'Enviar código';
    }
});

// ── Paso 2: Verificar código y cambiar contraseña ────
form2.addEventListener('submit', async e => {
    e.preventDefault();
    clearMessages();

    const codigoInput    = document.getElementById('codigo');
    const pwInput        = document.getElementById('nueva-password');
    const pwConfInput    = document.getElementById('confirmar-password');

    const codigo         = codigoInput.value.trim();
    const nuevaPassword  = pwInput.value;
    const confirmar      = pwConfInput.value;

    let valid = true;

    if (codigo.length !== 6 || !/^\d{6}$/.test(codigo)) {
        showError(codigoInput, 'El código debe ser de 6 dígitos.');
        valid = false;
    }
    if (nuevaPassword.length < 8) {
        showError(pwInput, 'Mínimo 8 caracteres.');
        valid = false;
    }
    if (nuevaPassword !== confirmar) {
        showError(pwConfInput, 'Las contraseñas no coinciden.');
        valid = false;
    }
    if (!valid) return;

    const btn = document.getElementById('btn-restablecer');
    btn.disabled    = true;
    btn.textContent = 'Guardando…';

    try {
        const fd = new FormData();
        fd.append('correo',         correoActual);
        fd.append('codigo',         codigo);
        fd.append('nueva_password', nuevaPassword);

        const res  = await fetch('php/reset_password.php', { method: 'POST', body: fd });
        const data = await res.json();

        if (data.ok) {
            exito2.textContent = '✓ Contraseña actualizada. Redirigiendo al login…';
            setTimeout(() => { window.location.href = 'login.html'; }, 2000);
        } else {
            error2.textContent = data.error || 'Código inválido o expirado.';
        }
    } catch {
        error2.textContent = 'Error de conexión. Intenta de nuevo.';
    } finally {
        btn.disabled    = false;
        btn.textContent = 'Cambiar contraseña';
    }
});

// ── Volver al paso 1 ─────────────────────────────────
btnOtroCorreo.addEventListener('click', e => {
    e.preventDefault();
    clearMessages();
    paso2.style.display = 'none';
    paso1.style.display = '';
    document.getElementById('correo-recuperar').focus();
});

// ── Helpers ──────────────────────────────────────────
function showError(input, msg) {
    input.classList.add('invalid');
    const small = input.nextElementSibling;
    if (small) small.textContent = msg;
}

function clearMessages() {
    error1.textContent = '';
    exito1.textContent = '';
    error2.textContent = '';
    exito2.textContent = '';
    document.querySelectorAll('.error').forEach(el => el.textContent = '');
    document.querySelectorAll('input').forEach(el => el.classList.remove('invalid'));
}