import { useState, useEffect, useRef } from 'react'

const CIRCUMFERENCE = 213.6

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const beeps = [{start:0,duration:.12,freq:880},{start:.18,duration:.12,freq:880},{start:.36,duration:.35,freq:1046}]
    beeps.forEach(({start,duration,freq}) => {
      const osc=ctx.createOscillator(), gain=ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type='sine'; osc.frequency.value=freq
      gain.gain.setValueAtTime(0,ctx.currentTime+start)
      gain.gain.linearRampToValueAtTime(.4,ctx.currentTime+start+.02)
      gain.gain.linearRampToValueAtTime(0,ctx.currentTime+start+duration)
      osc.start(ctx.currentTime+start); osc.stop(ctx.currentTime+start+duration+.05)
    })
    setTimeout(()=>ctx.close(),1200)
  } catch(_){}
}

// Props:
//   suffix     — identificador único ('rutinas' | 'avisos')
//   label      — texto del timer (opcional, si autoStart)
//   minutes    — minutos iniciales (si autoStart)
//   autoStart  — iniciar automáticamente
//   onFinish   — callback al terminar
export default function Timer({ suffix, label: labelProp, minutes: minutesProp, autoStart = false, onFinish, onCancel }) {
  const [activo,    setActivo]    = useState(autoStart)
  const [pausado,   setPausado]   = useState(false)
  const [remaining, setRemaining] = useState((minutesProp || 25) * 60)
  const [total,     setTotal]     = useState((minutesProp || 25) * 60)
  const [label,     setLabel]     = useState(labelProp || '')
  const [presetMin, setPresetMin] = useState(25)
  const [inputMin,  setInputMin]  = useState(25)
  const [modal,     setModal]     = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (autoStart && minutesProp) iniciar(labelProp || '', minutesProp)
  }, [autoStart])

  useEffect(() => {
    if (!activo || pausado) return
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current)
          playBeep()
          setModal(true)
          setActivo(false)
          if (onFinish) onFinish()
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [activo, pausado])

  const iniciar = (lbl, mins) => {
    const secs = Math.max(1, mins) * 60
    setLabel(lbl)
    setTotal(secs)
    setRemaining(secs)
    setPausado(false)
    setActivo(true)
  }

  const cancelar = () => {
    clearInterval(intervalRef.current)
    setActivo(false)
    setPausado(false)
    if (onCancel) onCancel()
  }

  const format = s => {
    const m = Math.floor(Math.max(0,s)/60), sec = Math.max(0,s)%60
    return String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0')
  }

  const progress = total > 0 ? remaining / total : 0
  const offset   = CIRCUMFERENCE * (1 - progress)
  const urgent   = !pausado && remaining <= 30

  if (activo) return (
    <>
      {modal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000 }}>
          <div style={{ background:'#fff',borderRadius:20,padding:'2rem 2.5rem',maxWidth:340,width:'90%',textAlign:'center',boxShadow:'0 24px 60px rgba(0,0,0,.2)' }}>
            <div style={{ fontSize:'2.5rem',marginBottom:'.75rem' }}>⏰</div>
            <h2 style={{ fontSize:'1.1rem',fontWeight:700,marginBottom:'.5rem' }}>¡Tiempo completado!</h2>
            <p style={{ fontSize:'.875rem',color:'#5f6773',marginBottom:'1.5rem' }}>{label ? `"${label}" ha terminado.` : 'Tu temporizador ha terminado.'}</p>
            <button onClick={() => setModal(false)} style={{ padding:'.6rem 1.75rem',border:'none',borderRadius:10,cursor:'pointer',background:'linear-gradient(180deg,#0d9488 0%,#0f766e 100%)',color:'#fff',fontSize:'.875rem',fontWeight:600 }}>Entendido</button>
          </div>
        </div>
      )}
      <section className="card timer-display">
        <div className="timer-ring-wrap">
          <svg className="timer-ring" viewBox="0 0 80 80">
            <circle className="timer-ring__track" cx="40" cy="40" r="34" />
            <circle className={`timer-ring__fill${pausado ? ' timer-paused' : ''}${urgent ? ' timer-urgent' : ''}`}
              cx="40" cy="40" r="34"
              style={{ strokeDashoffset: offset, transition:'stroke-dashoffset 1s linear,stroke .4s' }} />
          </svg>
          <span className="timer-digits">{format(remaining)}</span>
        </div>
        {label && <p className="timer-label">{label}</p>}
        <div className="timer-actions">
          <button type="button" id={`btn-timer-pause-${suffix}`} onClick={() => setPausado(p => !p)}>
            {pausado ? 'Reanudar' : 'Pausar'}
          </button>
          <button type="button" className="btn-timer-cancel" onClick={cancelar}>Cancelar</button>
        </div>
      </section>
    </>
  )

  // Setup (solo visible en Rutinas, Avisos usa autoStart)
  if (autoStart) return null  // setup form not shown in autoStart mode — parent controls visibility

  return (
    <section className="card" id={`timer-setup-${suffix}`}>
      <h2>Temporizador de enfoque</h2>
      <div className="timer-presets">
        <span className="timer-preset-label">Presets:</span>
        {[5,25,50].map(m => (
          <button key={m} type="button"
            className={'btn-preset' + (presetMin === m ? ' active' : '')}
            onClick={() => { setPresetMin(m); setInputMin(m) }}>
            {m} min
          </button>
        ))}
      </div>
      <label>Etiqueta (opcional)
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Ej: Lectura" />
      </label>
      <label>Minutos
        <input type="number" value={inputMin} min={1} max={180}
          onChange={e => setInputMin(parseInt(e.target.value) || 25)} />
      </label>
      <button type="button" onClick={() => iniciar(label, inputMin)}>Iniciar temporizador</button>
    </section>
  )
}