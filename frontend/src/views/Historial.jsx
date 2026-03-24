import { useState, useEffect, useCallback, useRef } from 'react'
import { apiFetch, toUTCDateTimeStr } from '../api/apiFetch'

const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, h / 2, w / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h)
  ctx.lineTo(x, y + h)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function dibujarGrafica(canvas, labels, totales, hechos) {
  const ctx = canvas.getContext('2d')
  const W   = canvas.offsetWidth  || 400
  const H   = canvas.offsetHeight || 180
  canvas.width  = W
  canvas.height = H
  const padL=28, padR=12, padT=16, padB=40
  const areaW = W-padL-padR, areaH = H-padT-padB
  const n = labels.length
  const maxV = Math.max(...totales, 1)
  const barW = (areaW/n)*0.55, gap = areaW/n
  ctx.clearRect(0,0,W,H)
  ctx.strokeStyle='#e2e8f0'; ctx.lineWidth=1
  for(let i=0;i<=4;i++){const y=padT+areaH-(i/4)*areaH;ctx.beginPath();ctx.moveTo(padL,y);ctx.lineTo(W-padR,y);ctx.stroke()}
  labels.forEach((lbl,i)=>{
    const x=padL+gap*i+(gap-barW)/2
    const hT=totales[i]>0?(totales[i]/maxV)*areaH:0
    const hH=hechos[i]>0?(hechos[i]/maxV)*areaH:0
    if(hT>0){ctx.fillStyle='#e2e8f0';roundRect(ctx,x,padT+areaH-hT,barW,hT,4);ctx.fill()}
    if(hH>0){ctx.fillStyle='#0d9488';roundRect(ctx,x,padT+areaH-hH,barW,hH,4);ctx.fill()}
    ctx.fillStyle='#94a3b8';ctx.font=`${Math.max(9,Math.floor(areaW/n/2.8))}px system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='top'
    ctx.fillText(lbl,x+barW/2,padT+areaH+6)
    if(hechos[i]>0){ctx.fillStyle='#0f766e';ctx.font=`bold ${Math.max(9,Math.floor(areaW/n/2.8))}px system-ui,sans-serif`;ctx.textBaseline='bottom';ctx.fillText(hechos[i],x+barW/2,padT+areaH-hH-2)}
  })
  const ly=H-10
  ctx.fillStyle='#0d9488';ctx.fillRect(padL,ly-8,10,8)
  ctx.fillStyle='#94a3b8';ctx.font='10px system-ui,sans-serif';ctx.textAlign='left';ctx.textBaseline='bottom'
  ctx.fillText('Completados',padL+14,ly)
  ctx.fillStyle='#e2e8f0';ctx.fillRect(padL+100,ly-8,10,8)
  ctx.fillStyle='#94a3b8';ctx.fillText('Total',padL+114,ly)
}

export default function Historial() {
  const [dias,          setDias]          = useState(7)
  const [cumplimiento,  setCumplimiento]  = useState([])
  const [hayDatos,      setHayDatos]      = useState(false)
  const canvasRef = useRef(null)

  const cargar = useCallback(() => {
    const hasta  = new Date()
    const desde  = new Date()
    desde.setDate(desde.getDate() - (dias - 1))
    const desdeStr = toUTCDateTimeStr(desde).slice(0, 10)
    const hastaStr = toUTCDateTimeStr(hasta).slice(0, 10)

    apiFetch(`/cumplimiento.php?desde=${desdeStr}&hasta=${hastaStr}`)
      .then(r => r.json())
      .then(d => { setCumplimiento(d.ok ? d.cumplimiento || [] : []) })
      .catch(() => {})
  }, [dias])

  useEffect(() => { cargar() }, [cargar])

  // Dibujar gráfica cuando cambien los datos
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rango = []
    for (let i = dias-1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate()-i)
      rango.push(toUTCDateTimeStr(d).slice(0,10))
    }

    const porFecha = {}
    rango.forEach(f => { porFecha[f] = { total: 0, completados: 0 } })
    cumplimiento.forEach(r => {
      if (porFecha[r.fecha]) {
        porFecha[r.fecha].total++
        if (r.completado) porFecha[r.fecha].completados++
      }
    })

    const labels  = rango.map(f => DIAS[new Date(f+'T12:00:00').getDay()] + ' ' + f.slice(8))
    const totales = rango.map(f => porFecha[f].total)
    const hechos  = rango.map(f => porFecha[f].completados)
    const tiene   = totales.some(v => v > 0)
    setHayDatos(tiene)
    if (tiene) dibujarGrafica(canvas, labels, totales, hechos)
  }, [cumplimiento, dias])

  return (
    <>
      <section className="card">
        <div className="historial-header">
          <h2>Historial de cumplimiento</h2>
          <div className="historial-rango">
            {[7,14,30].map(d => (
              <button key={d} type="button" className={'btn-rango' + (dias===d ? ' active' : '')} onClick={() => setDias(d)}>
                {d} días
              </button>
            ))}
          </div>
        </div>
        <div className="grafica-wrap">
          {hayDatos
            ? <canvas ref={canvasRef} />
            : <p id="grafica-vacia" style={{ color:'#94a3b8', fontSize:'.875rem', textAlign:'center', padding:'2rem 0' }}>No hay datos para este período.</p>
          }
        </div>
      </section>

      <section className="card card-historial">
        <h2>Detalle por hábito</h2>
        {cumplimiento.length === 0
          ? <p className="historial-vacio">No hay registros en este período.</p>
          : (
            <div className="table-wrapper">
              <table className="tabla-historial" id="tabla-historial">
                <thead>
                  <tr><th>Fecha</th><th>Día</th><th>Rutina</th><th>Hábito</th><th>Completado</th></tr>
                </thead>
                <tbody>
                  {cumplimiento.map((row, i) => (
                    <tr key={i}>
                      <td>{row.fecha}</td>
                      <td>{DIAS[new Date(row.fecha+'T12:00:00').getDay()]}</td>
                      <td>{row.nombre_rutina || '—'}</td>
                      <td>{row.nombre_habito || '—'}</td>
                      <td><span className={`badge ${row.completado ? 'badge-ok' : 'badge-no'}`}>{row.completado ? 'Sí' : 'No'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </section>
    </>
  )
}