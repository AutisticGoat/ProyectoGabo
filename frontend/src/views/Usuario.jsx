import { useState, useEffect } from 'react'
import { useAuth }   from '../context/AuthContext'
import { apiFetch, parseDbDate }  from '../api/apiFetch'

export default function Usuario() {
  const { user, refreshUser } = useAuth()
  const [editando, setEditando] = useState(false)
  const [form, setForm]         = useState({ nombre: '', correo: '', pwActual: '', pwNueva: '', pwConf: '' })
  const [sesiones, setSesiones] = useState([])
  const [msg, setMsg]           = useState({ text: '', tipo: '' })

  useEffect(() => {
    if (user) setForm(f => ({ ...f, nombre: user.nombre, correo: user.correo }))
    cargarSesiones()
  }, [user])

  const cargarSesiones = () => {
    apiFetch('/sesiones.php').then(r => r.json()).then(d => { if (d.ok) setSesiones(d.sesiones) }).catch(() => {})
  }

  const handleGuardar = async e => {
    e.preventDefault()
    if (form.pwNueva && form.pwNueva !== form.pwConf) { setMsg({ text: 'Las contraseñas no coinciden', tipo: 'error' }); return }
    const body = { nombre: form.nombre, correo: form.correo }
    if (form.pwNueva) { body.password_actual = form.pwActual; body.password_nueva = form.pwNueva }
    try {
      const res  = await apiFetch('/usuario.php', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)
      setMsg({ text: '✓ Perfil actualizado.', tipo: 'ok' })
      setEditando(false)
      refreshUser()
    } catch (err) { setMsg({ text: err.message, tipo: 'error' }) }
  }

  const cerrarSesion = async jti => {
    await apiFetch(`/sesiones.php?jti=${encodeURIComponent(jti)}`, { method: 'DELETE' })
    cargarSesiones()
  }

  const cerrarTodas = async () => {
    if (!confirm('¿Cerrar todas las sesiones?')) return
    await apiFetch('/sesiones.php?todas=1', { method: 'DELETE' })
    window.location.href = '/login'
  }

  return (
    <>
      <section className="card card-perfil">
        <h2>Perfil de Usuario</h2>
        <div className="perfil-info">
          <p><strong>Nombre:</strong> {user?.nombre}</p>
          <p><strong>Email:</strong> {user?.correo}</p>
          <p><strong>Rol:</strong> <span style={{ textTransform: 'capitalize' }}>{user?.rol}</span></p>
        </div>
        {!editando && <button onClick={() => setEditando(true)} className="btn-secondary">Editar perfil</button>}
      </section>

      {editando && (
        <section className="card">
          <h2>Editar perfil</h2>
          <form onSubmit={handleGuardar}>
            <label>Nombre<input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required /></label>
            <label>Correo<input type="email" value={form.correo} onChange={e => setForm(f => ({ ...f, correo: e.target.value }))} required /></label>
            <div className="divider-perfil">Cambiar contraseña <span>(opcional)</span></div>
            <label>Contraseña actual<input type="password" value={form.pwActual} onChange={e => setForm(f => ({ ...f, pwActual: e.target.value }))} /></label>
            <label>Nueva contraseña<input type="password" value={form.pwNueva} onChange={e => setForm(f => ({ ...f, pwNueva: e.target.value }))} /></label>
            <label>Confirmar<input type="password" value={form.pwConf} onChange={e => setForm(f => ({ ...f, pwConf: e.target.value }))} /></label>
            {msg.text && <p style={{ color: msg.tipo === 'ok' ? '#0d9488' : '#dc2626', fontSize: '.8rem' }}>{msg.text}</p>}
            <div style={{ display: 'flex', gap: '.75rem' }}>
              <button type="submit">Guardar cambios</button>
              <button type="button" className="btn-secondary" onClick={() => setEditando(false)}>Cancelar</button>
            </div>
          </form>
        </section>
      )}

      <section className="card card-sesiones">
        <h2>Sesiones activas</h2>
        {sesiones.map(s => (
          <div key={s.jti} className={`sesion-item ${s.es_actual ? 'sesion-actual' : ''}`}>
            <div className="sesion-info">
              <div className="sesion-id">{s.id_corto}… {s.es_actual && <span className="sesion-actual-badge">Esta sesión</span>}</div>
              <div className="sesion-meta">IP: {s.ip} · Inicio: {parseDbDate(s.creado_en)?.toLocaleString('es')}</div>
            </div>
            <button className="btn-cerrar-sesion" disabled={s.es_actual} onClick={() => cerrarSesion(s.jti)}>Cerrar</button>
          </div>
        ))}
        <button className="btn-cerrar-todas" onClick={cerrarTodas}>Cerrar todas las sesiones</button>
      </section>
    </>
  )
}
