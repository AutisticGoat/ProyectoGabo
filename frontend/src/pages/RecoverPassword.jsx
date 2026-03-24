import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function RecoverPassword() {
  const [paso,    setPaso]    = useState(1)  // 1: pedir correo, 2: ingresar código
  const [correo,  setCorreo]  = useState('')
  const [codigo,  setCodigo]  = useState('')
  const [pw1,     setPw1]     = useState('')
  const [pw2,     setPw2]     = useState('')
  const [msg,     setMsg]     = useState({ text: '', tipo: '' })
  const [loading, setLoading] = useState(false)

  const mostrar = (text, tipo = 'error') => setMsg({ text, tipo })

  // Paso 1: solicitar código
  const handleSolicitarCodigo = async e => {
    e.preventDefault()
    setLoading(true)
    setMsg({ text: '', tipo: '' })
    try {
      const fd = new FormData()
      fd.append('correo', correo)
      const res  = await fetch('/api/recover.php', { method: 'POST', body: fd })
      const data = await res.json()
      mostrar(data.message || 'Si el correo existe recibirás un código.', 'ok')
      if (data.ok) setPaso(2)
    } catch {
      mostrar('Error de conexión.')
    } finally {
      setLoading(false)
    }
  }

  // Paso 2: resetear contraseña
  const handleResetPassword = async e => {
    e.preventDefault()
    if (pw1 !== pw2)          { mostrar('Las contraseñas no coinciden'); return }
    if (pw1.length < 8)       { mostrar('Mínimo 8 caracteres');          return }
    setLoading(true)
    setMsg({ text: '', tipo: '' })
    try {
      const fd = new FormData()
      fd.append('correo',           correo)
      fd.append('codigo',           codigo)
      fd.append('nueva_password',   pw1)
      const res  = await fetch('/api/reset_password.php', { method: 'POST', body: fd })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Error al restablecer')
      mostrar('Contraseña actualizada. Redirigiendo…', 'ok')
      setTimeout(() => window.location.href = '/login', 2000)
    } catch (err) {
      mostrar(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-icon">◇</span>
          <span className="brand-text">Hábitos</span>
        </div>
        <h1 className="auth-title">Recuperar contraseña</h1>

        {paso === 1 ? (
          <form onSubmit={handleSolicitarCodigo} className="auth-form">
            <label>
              Correo electrónico
              <input type="email" value={correo} onChange={e => setCorreo(e.target.value)}
                placeholder="tu@correo.com" required autoFocus />
            </label>
            {msg.text && <p className={msg.tipo === 'ok' ? 'auth-success' : 'auth-error'}>{msg.text}</p>}
            <button type="submit" disabled={loading}>{loading ? 'Enviando…' : 'Enviar código'}</button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="auth-form">
            <p style={{ fontSize: '.85rem', color: '#64748b', marginBottom: '.5rem' }}>
              Ingresa el código enviado a <strong>{correo}</strong>
            </p>
            <label>Código<input value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="6 dígitos" required maxLength={6} /></label>
            <label>Nueva contraseña<input type="password" value={pw1} onChange={e => setPw1(e.target.value)} placeholder="Mínimo 8 caracteres" required /></label>
            <label>Confirmar<input type="password" value={pw2} onChange={e => setPw2(e.target.value)} placeholder="Repite la contraseña" required /></label>
            {msg.text && <p className={msg.tipo === 'ok' ? 'auth-success' : 'auth-error'}>{msg.text}</p>}
            <button type="submit" disabled={loading}>{loading ? 'Guardando…' : 'Cambiar contraseña'}</button>
            <button type="button" onClick={() => { setPaso(1); setMsg({ text: '', tipo: '' }) }}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '.85rem', marginTop: '.25rem' }}>
              ← Usar otro correo
            </button>
          </form>
        )}

        <div className="auth-links">
          <Link to="/login">Volver al inicio de sesión</Link>
        </div>
      </div>
    </div>
  )
}
