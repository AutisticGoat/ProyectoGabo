import { useState, useEffect, useCallback } from 'react'
import { apiFetch, toUTCDateTimeStr } from '../api/apiFetch'
import Timer from '../components/Timer'

export default function Rutinas() {
  const [rutinas,     setRutinas]     = useState([])
  const [completados, setCompletados] = useState(new Set())
  const [filtro,      setFiltro]      = useState('activa')
  const [ocultar,     setOcultar]     = useState(false)
  const [abiertos,    setAbiertos]    = useState(new Set())
  const [nuevaRutina, setNuevaRutina] = useState({ nombre: '', habito: '', frecuencia: 'diaria' })
  const [nuevoHabito, setNuevoHabito] = useState({})

  const hoy = toUTCDateTimeStr(new Date()).slice(0, 10)

  const cargar = useCallback(() => {
    Promise.all([
      apiFetch('/rutinas.php').then(r => r.json()),
      apiFetch(`/cumplimiento.php?desde=${hoy}&hasta=${hoy}`).then(r => r.json()),
    ]).then(([rut, cumpl]) => {
      if (rut.ok)   setRutinas(rut.rutinas || [])
      if (cumpl.ok) {
        const set = new Set()
        cumpl.cumplimiento?.forEach(c => { if (c.completado) set.add(c.id_habito) })
        setCompletados(set)
      }
    }).catch(() => {})
  }, [hoy])

  useEffect(() => { cargar() }, [cargar])

  const habitosActivos = rutinas.filter(r => r.estado === 'activa').flatMap(r => r.habitos || [])
  const hechoHoy       = habitosActivos.filter(h => completados.has(h.id_habito)).length

  const rutinasFiltradas = filtro === 'todas' ? rutinas : rutinas.filter(r => r.estado === filtro)

  const cambiarEstado = (id, estado) => {
    apiFetch('/rutinas.php', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_rutina: id, estado }) })
      .then(r => r.json()).then(d => { if (d.ok) cargar() }).catch(() => {})
  }

  const eliminarRutina = id => {
    if (!confirm('¿Eliminar esta rutina y todos sus hábitos?')) return
    apiFetch(`/rutinas.php?id_rutina=${id}`, { method: 'DELETE' })
      .then(r => r.json()).then(d => { if (d.ok) cargar() }).catch(() => {})
  }

  const marcarHabito = id => {
    apiFetch('/cumplimiento.php', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_habito: id, fecha: hoy, completado: true }) })
      .then(r => r.json()).then(d => { if (d.ok) cargar() }).catch(() => {})
  }

  const eliminarHabito = id => {
    if (!confirm('¿Eliminar este hábito?')) return
    apiFetch(`/habitos.php?id_habito=${id}`, { method: 'DELETE' })
      .then(r => r.json()).then(d => { if (d.ok) cargar() }).catch(() => {})
  }

  const agregarHabito = idRutina => {
    const h = nuevoHabito[idRutina]
    if (!h?.nombre?.trim()) return
    apiFetch('/habitos.php', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_rutina: idRutina, nombre: h.nombre.trim(), frecuencia: h.frecuencia || 'diaria' }) })
      .then(r => r.json()).then(d => {
        if (d.ok) { setNuevoHabito(p => ({ ...p, [idRutina]: { nombre: '', frecuencia: 'diaria' } })); cargar() }
      }).catch(() => {})
  }

  const crearRutina = () => {
    if (!nuevaRutina.nombre.trim()) return
    apiFetch('/rutinas.php', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nuevaRutina.nombre.trim(), fecha_inicio: hoy }) })
      .then(r => r.json())
      .then(d => {
        if (!d.ok || !d.id_rutina) return
        if (nuevaRutina.habito.trim()) {
          return apiFetch('/habitos.php', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_rutina: d.id_rutina, nombre: nuevaRutina.habito.trim(), frecuencia: nuevaRutina.frecuencia }) })
            .then(r => r.json())
        }
      })
      .then(() => { setNuevaRutina({ nombre: '', habito: '', frecuencia: 'diaria' }); cargar() })
      .catch(() => {})
  }

  const toggleAbierto = id => setAbiertos(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  return (
    <>
      <section className="card">
        <h2>Resumen de hoy</h2>
        <p>Has completado <strong>{hechoHoy} de {habitosActivos.length}</strong> hábitos hoy.</p>
      </section>

      <section className="card">
        <div className="rutinas-header">
          <h2>Mis rutinas</h2>
          <div className="rutinas-filtros">
            {['activa','pausada','todas'].map(f => (
              <button key={f} type="button" className={'btn-filtro' + (filtro === f ? ' active' : '')} onClick={() => setFiltro(f)}>
                {f === 'activa' ? 'Activas' : f === 'pausada' ? 'Pausadas' : 'Todas'}
              </button>
            ))}
          </div>
        </div>

        <label style={{ display:'flex', alignItems:'center', gap:'.5rem', fontSize:'.85rem' }}>
          <input type="checkbox" checked={ocultar} onChange={e => setOcultar(e.target.checked)} />
          Ocultar hábitos completados hoy
        </label>

        {rutinasFiltradas.length === 0
          ? <p className="rutinas-vacio">No hay rutinas {filtro !== 'todas' ? filtro + 's' : ''}.</p>
          : rutinasFiltradas.map(r => {
              const habitos   = r.habitos || []
              const nHechos   = habitos.filter(h => completados.has(h.id_habito)).length
              const esPausada = r.estado === 'pausada'
              const esFinal   = r.estado === 'finalizada'
              const abierta   = abiertos.has(r.id_rutina)
              const nh        = nuevoHabito[r.id_rutina] || { nombre: '', frecuencia: 'diaria' }
              return (
                <div key={r.id_rutina} className={`rutina-card estado-${r.estado}${abierta ? ' abierta' : ''}`}>
                  <div className="rutina-card-header" onClick={() => toggleAbierto(r.id_rutina)}>
                    <div className="rutina-info">
                      <span className="rutina-nombre">{r.nombre}</span>
                      <span className={`badge-estado badge-${r.estado}`}>{r.estado}</span>
                    </div>
                    <div className="rutina-acciones" onClick={e => e.stopPropagation()}>
                      {!esFinal
                        ? <button type="button" className={esPausada ? 'btn-activar' : 'btn-pausar'}
                            onClick={() => cambiarEstado(r.id_rutina, esPausada ? 'activa' : 'pausada')}>
                            {esPausada ? 'Activar' : 'Pausar'}
                          </button>
                        : <button type="button" className="btn-activar" onClick={() => cambiarEstado(r.id_rutina, 'activa')}>Reactivar</button>
                      }
                      <button type="button" className="btn-eliminar" onClick={() => eliminarRutina(r.id_rutina)}>Eliminar</button>
                    </div>
                    <span className="rutina-chevron">▼</span>
                  </div>
                  {abierta && (
                    <div className="rutina-card-body">
                      <div className="rutina-habitos-titulo">Hábitos · {nHechos}/{habitos.length} completados hoy</div>
                      <div className="rutina-habitos-lista">
                        {habitos.length === 0
                          ? <p style={{ fontSize:'.8rem', color:'#94a3b8' }}>Sin hábitos en esta rutina.</p>
                          : habitos.filter(h => ocultar ? !completados.has(h.id_habito) : true).map(h => {
                              const hecho = completados.has(h.id_habito)
                              return (
                                <div key={h.id_habito} className={`habit${hecho ? ' habit-completado' : ''}`}>
                                  <div>
                                    <strong>{h.nombre}</strong>
                                    <div className="meta">{h.frecuencia || 'diaria'}{hecho ? ' · Completado hoy' : ''}</div>
                                  </div>
                                  <div className="habit-acciones">
                                    <button type="button" className="btn-marcar" disabled={hecho} onClick={() => marcarHabito(h.id_habito)}>
                                      {hecho ? 'Hecho' : 'Marcar'}
                                    </button>
                                    <button type="button" className="btn-eliminar-habito" onClick={() => eliminarHabito(h.id_habito)}>✕</button>
                                  </div>
                                </div>
                              )
                            })
                        }
                      </div>
                      <div className="form-agregar-habito">
                        <input className="input-nuevo-habito" placeholder="Nuevo hábito..." value={nh.nombre}
                          onChange={e => setNuevoHabito(p => ({ ...p, [r.id_rutina]: { ...nh, nombre: e.target.value } }))}
                          onKeyDown={e => { if (e.key === 'Enter') agregarHabito(r.id_rutina) }} />
                        <select className="select-frecuencia-habito" value={nh.frecuencia}
                          onChange={e => setNuevoHabito(p => ({ ...p, [r.id_rutina]: { ...nh, frecuencia: e.target.value } }))}>
                          <option value="diaria">Diaria</option>
                          <option value="semanal">Semanal</option>
                          <option value="mensual">Mensual</option>
                        </select>
                        <button type="button" className="btn-agregar-habito" onClick={() => agregarHabito(r.id_rutina)}>+ Agregar</button>
                      </div>
                    </div>
                  )}
                </div>
              )
          })
        }
      </section>

      <section className="card">
        <h2>Nueva rutina</h2>
        <label>Nombre<input value={nuevaRutina.nombre} onChange={e => setNuevaRutina(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Mañanas productivas" /></label>
        <label>Primer hábito (opcional)<input value={nuevaRutina.habito} onChange={e => setNuevaRutina(p => ({ ...p, habito: e.target.value }))} placeholder="Ej: Beber agua" /></label>
        <label>Frecuencia
          <select value={nuevaRutina.frecuencia} onChange={e => setNuevaRutina(p => ({ ...p, frecuencia: e.target.value }))}>
            <option value="diaria">Diaria</option>
            <option value="semanal">Semanal</option>
            <option value="mensual">Mensual</option>
          </select>
        </label>
        <button type="button" onClick={crearRutina}>Crear rutina</button>
      </section>

      <Timer suffix="rutinas" />
    </>
  )
}