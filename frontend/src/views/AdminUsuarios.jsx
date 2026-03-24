import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../api/apiFetch'

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [roles,    setRoles]    = useState([])
  const [buscar,   setBuscar]   = useState('')
  const [toast,    setToast]    = useState('')

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const cargar = useCallback(() => {
    apiFetch('/admin.php').then(r => r.json()).then(d => {
      if (d.ok) { setUsuarios(d.usuarios); setRoles(d.roles) }
    }).catch(() => {})
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const cambiar = async (id_usuario, payload) => {
    const res  = await apiFetch('/admin.php', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id_usuario, ...payload }) })
    const data = await res.json()
    data.ok ? showToast('Cambio guardado.') : showToast(data.error || 'Error.')
    cargar()
  }

  const eliminar = async (id_usuario, nombre) => {
    if (!confirm(`¿Eliminar la cuenta de "${nombre}"?`)) return
    const res  = await apiFetch(`/admin.php?id=${id_usuario}`, { method: 'DELETE' })
    const data = await res.json()
    data.ok ? showToast('Usuario eliminado.') : showToast(data.error || 'Error.')
    cargar()
  }

  const colores = { 1: 'badge-superadmin', 2: 'badge-admin', 3: 'badge-editor', 4: 'badge-usuario' }

  const lista = usuarios.filter(u =>
    !buscar || u.nombre.toLowerCase().includes(buscar.toLowerCase()) || u.correo.toLowerCase().includes(buscar.toLowerCase())
  )

  return (
    <section className="card">
      <h2>Gestión de usuarios</h2>
      <div className="search-bar">
        <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar por nombre o correo…" />
        <button onClick={() => setBuscar('')} className="btn-neutral">Ver todos</button>
      </div>

      {toast && <div className="admin-toast show">{toast}</div>}

      <div className="table-wrapper">
        <table className="tabla-usuarios">
          <thead><tr><th>#</th><th>Nombre</th><th>Correo</th><th>Estado</th><th>Rol actual</th><th>Asignar rol</th><th>Acciones</th></tr></thead>
          <tbody>
            {lista.map(u => (
              <tr key={u.id_usuario}>
                <td>{u.id_usuario}</td>
                <td>{u.nombre}</td>
                <td>{u.correo}</td>
                <td><span className={`badge ${u.estado === 'activo' ? 'badge-activo' : 'badge-inactivo'}`}>{u.estado}</span></td>
                <td><span className={`badge ${colores[u.nivel_rol] || 'badge-usuario'}`}>{u.nombre_rol}</span></td>
                <td>
                  <select
                    className="select-rol-usuario"
                    value={u.id_rol}
                    onChange={e => {
                      const id_rol = parseInt(e.target.value)
                      const nombre = roles.find(r => r.id_rol === id_rol)?.nombre || ''
                      if (confirm(`¿Cambiar rol a "${nombre}"? Se cerrarán todas sus sesiones.`)) cambiar(u.id_usuario, { id_rol })
                      else cargar()
                    }}
                  >
                    {roles.map(r => <option key={r.id_rol} value={r.id_rol}>{r.nombre}</option>)}
                  </select>
                </td>
                <td>
                  <div className="actions">
                    <button className={`btn-sm ${u.estado === 'activo' ? 'btn-warning' : 'btn-neutral'}`}
                      onClick={() => cambiar(u.id_usuario, { estado: u.estado === 'activo' ? 'inactivo' : 'activo' })}>
                      {u.estado === 'activo' ? 'Desactivar' : 'Activar'}
                    </button>
                    <button className="btn-sm btn-danger" onClick={() => eliminar(u.id_usuario, u.nombre)}>Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
