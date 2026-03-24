import { useState, useEffect, useCallback } from 'react'
import { apiFetch, toUTCDateTimeStr, parseDbDate } from '../api/apiFetch'
import Timer from '../components/Timer'

export default function Avisos() {
  const [avisos,      setAvisos]      = useState([])
  const [mensaje,     setMensaje]     = useState('')
  const [minutos,     setMinutos]     = useState(5)
  const [timerActivo, setTimerActivo] = useState(false)
  const [timerLabel,  setTimerLabel]  = useState('')
  const [timerMins,   setTimerMins]   = useState(5)
  const [ultimoId,    setUltimoId]    = useState(null) // id_aviso recién creado

  const cargar = useCallback(() => {
    apiFetch('/avisos.php').then(r => r.json()).then(d => {
      if (d.ok) setAvisos(d.avisos || [])
    }).catch(() => {})
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const handleProgramar = e => {
    e.preventDefault()
    if (!mensaje.trim()) return
    const mins     = Math.max(1, parseInt(minutos) || 5)
    const fechaStr = toUTCDateTimeStr(new Date(Date.now() + mins * 60 * 1000))

    apiFetch('/avisos.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mensaje: `${mensaje} (en ${mins} min)`,
        tipo: 'personalizado',
        fecha_programada: fechaStr,
      }),
    })
      .then(r => r.json())
      .then(d => {
        if (!d.ok) return
        setUltimoId(d.id_aviso)   // guardar id para poder borrarlo si se cancela
        setTimerLabel(mensaje)
        setTimerMins(mins)
        setTimerActivo(true)
        setMensaje('')
        setMinutos(5)
        cargar()
      }).catch(() => {})
  }

  // Al terminar el timer normalmente — solo recargar lista
  const handleFinish = () => {
    setTimerActivo(false)
    setUltimoId(null)
    cargar()
  }

  // Al cancelar el timer — eliminar el aviso recién creado y mostrar formulario
  const handleCancel = () => {
    if (ultimoId) {
      apiFetch(`/avisos.php?id=${ultimoId}`, { method: 'DELETE' })
        .then(r => r.json())
        .then(() => cargar())
        .catch(() => {})
    }
    setTimerActivo(false)
    setUltimoId(null)
  }

  return (
    <>
      <section className="card">
        <h2>Programar recordatorio</h2>

        {/* Formulario — visible solo cuando no hay timer activo */}
        {!timerActivo && (
          <form onSubmit={handleProgramar} style={{ display:'flex', flexDirection:'column', gap:'.75rem' }}>
            <label>Mensaje
              <input value={mensaje} onChange={e => setMensaje(e.target.value)}
                placeholder="Ej: Tomar agua" required />
            </label>
            <label>Tiempo (minutos)
              <input type="number" value={minutos} min={1} max={180}
                onChange={e => setMinutos(e.target.value)} />
            </label>
            <button type="submit">Iniciar recordatorio</button>
          </form>
        )}

        {/* Timer — visible solo cuando está activo */}
        {timerActivo && (
          <Timer
            suffix="avisos"
            label={timerLabel}
            minutes={timerMins}
            autoStart
            onFinish={handleFinish}
            onCancel={handleCancel}
          />
        )}
      </section>

      <section className="card">
        <h2>Avisos activos</h2>
        {avisos.length === 0
          ? <p style={{ color:'#94a3b8', fontSize:'.875rem' }}>No hay avisos.</p>
          : avisos.map(a => {
              const fecha = parseDbDate(a.fecha_programada)?.toLocaleString('es') || ''
              return (
                <div key={a.id_aviso} className={`feedback ${a.tipo === 'personalizado' ? 'positive' : 'neutral'}`}>
                  <span className="aviso-mensaje">{a.mensaje}</span>
                  {fecha && <span className="aviso-fecha">{fecha}</span>}
                </div>
              )
            })
        }
      </section>
    </>
  )
}