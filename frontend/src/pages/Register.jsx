import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function Register() {
  const navigate = useNavigate()
  const [form,    setForm]    = useState({ nombre: '', correo: '', password: '', confirmar: '' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmar) { setError('Las contraseñas no coinciden'); return }
    if (form.password.length < 8)         { setError('Mínimo 8 caracteres');           return }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('nombre',   form.nombre)
      fd.append('correo',   form.correo)
      fd.append('password', form.password)
      const res  = await fetch('/api/register.php', { method: 'POST', body: fd, credentials: 'include' })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Error al registrar')
      navigate('/login')
    } catch (err) {
      setError(err.message)
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
        <h1 className="auth-title">Crear cuenta</h1>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>Nombre<input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Tu nombre" required /></label>
          <label>Correo<input name="correo" type="email" value={form.correo} onChange={handleChange} placeholder="tu@correo.com" required /></label>
          <label>Contraseña<input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Mínimo 8 caracteres" required /></label>
          <label>Confirmar<input name="confirmar" type="password" value={form.confirmar} onChange={handleChange} placeholder="Repite la contraseña" required /></label>

          {error && <p className="auth-error">{error}</p>}
          <button type="submit" disabled={loading}>{loading ? 'Registrando…' : 'Crear cuenta'}</button>
        </form>

        <div className="auth-links">
          <Link to="/login">¿Ya tienes cuenta? Inicia sesión</Link>
        </div>
      </div>
    </div>
  )
}
