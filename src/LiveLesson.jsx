import { useEffect, useMemo, useRef, useState } from 'react'
import { getPyodide, putFile } from './pyodide.js'

export const DATA = 'sample_data'
export const fmtP = (p) => (p == null ? '' : p === 0 ? '< 1e-300' : p < 0.001 ? p.toExponential(1) : p.toFixed(3))

/*
 A live lesson: reading pane on the left; on the right, editable Python that runs in the
 browser, its output, a results table and a checkpoint question.

 Props
   lesson      entry from lessons.js
   starter     Python shown in the editor. It must leave a DataFrame called `results`.
   selectors   (manifest) => [{ id, label, options: [{ value, label }] }]   dropdowns above the code
   prepare     (choice, manifest) => { files: [{ url, path }], globals: {NAME: value}, banner, outName, packages? }
               `packages` are extra Pyodide packages to load, for example ['h5py']
   columns     [{ key, label?, fmt?, bar? }]   table columns; `bar` draws a bar scaled to the largest |value|
               or (rows) => [...] when the columns depend on the result
   scripts     [{ label, url }]   full pipeline scripts shown under the reading pane
   isHit       (row, rows) => bool   rows to highlight
   checkpoint  (rows) => { question, answer, right, hint }
   children    the reading pane
*/
function ScriptViewer({ label, url }) {
  const [src, setSrc] = useState(null)
  const load = (e) => {
    if (e.target.open && src === null) {
      fetch(url).then((r) => (r.ok ? r.text() : Promise.reject())).then(setSrc).catch(() => setSrc('Could not load this script.'))
    }
  }
  return (
    <details className="script" onToggle={load}>
      <summary>{label}</summary>
      <pre>{src ?? 'Loading ...'}</pre>
    </details>
  )
}

export default function LiveLesson({ lesson, starter, selectors, prepare, columns: columnsProp, isHit, checkpoint, scripts, onComplete, children }) {
  const [manifest, setManifest] = useState(null)
  const [choice, setChoice] = useState({})
  const [code, setCode] = useState(starter)
  const [log, setLog] = useState('Press Run to start.')
  const [status, setStatus] = useState('Not run yet')
  const [busy, setBusy] = useState(false)
  const [rows, setRows] = useState(null)
  const [outName, setOutName] = useState('')
  const [answer, setAnswer] = useState('')
  const [verdict, setVerdict] = useState(null)
  const logRef = useRef(null)

  const sels = useMemo(() => (manifest && selectors ? selectors(manifest) : []), [manifest, selectors])

  useEffect(() => {
    fetch(`${DATA}/manifest.json`).then((r) => r.json()).then(setManifest)
      .catch(() => setLog('Could not load the sample data list.'))
  }, [])
  useEffect(() => {
    setChoice(Object.fromEntries(sels.map((s) => [s.id, s.options[0].value])))
  }, [sels])
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight }, [log])

  const columns = useMemo(() => (typeof columnsProp === 'function' ? (rows ? columnsProp(rows) : []) : columnsProp), [columnsProp, rows])
  const cp = useMemo(() => (rows && checkpoint ? checkpoint(rows) : null), [rows, checkpoint])
  const barMax = useMemo(() => {
    const m = {}
    if (rows) columns.filter((c) => c.bar).forEach((c) => { m[c.key] = Math.max(...rows.map((r) => Math.abs(r[c.key])), 1e-9) })
    return m
  }, [rows, columns])

  const textCols = useMemo(() => Object.fromEntries(
    columns.map((c) => [c.key, Boolean(rows && rows.some((r) => typeof r[c.key] === 'string'))])), [rows, columns])

  async function run() {
    setBusy(true); setRows(null); setVerdict(null); setAnswer(''); setLog('')
    const say = (line) => setLog((l) => l + line + '\n')
    try {
      const job = prepare(choice, manifest)
      const py = await getPyodide((s) => { setStatus('Starting Python'); say(s) })
      setStatus('Running')
      say('Fetching sample files ...')
      await Promise.all(job.files.map((f) => putFile(py, `${DATA}/${f.url}`, f.path)))
      if (job.packages) await py.loadPackage(job.packages)
      py.setStdout({ batched: say })
      py.setStderr({ batched: say })
      Object.entries(job.globals).forEach(([k, v]) => py.globals.set(k, v))
      if (job.banner) say('\n' + job.banner + '\n')
      py.runPython('import pandas as pd; pd.set_option("display.width", 200); results = None')
      await py.runPythonAsync(code)
      // json.dumps keeps full precision; DataFrame.to_json would round small p-values to 0
      const json = py.runPython(
        'import json; json.dumps(results.astype(object).where(results.notna(), None).to_dict("records")) if results is not None else "null"'
      )
      const out = JSON.parse(json)
      if (!out) throw new Error('Your code finished, but it did not create a table called `results`.')
      setRows(out); setOutName(job.outName)
      say(`\nFinished. ${out.length} rows in results.`)
      setStatus('Finished')
    } catch (e) {
      say('\n' + String(e.message || e).trim().split('\n').slice(-4).join('\n'))
      setStatus('Stopped with an error')
    } finally {
      setBusy(false)
    }
  }

  function check(e) {
    e.preventDefault()
    if (answer === '') return setVerdict({ ok: false, text: 'Enter a number first.' })
    if (Number(answer) === cp.answer) { setVerdict({ ok: true, text: cp.right }); onComplete() }
    else setVerdict({ ok: false, text: cp.hint })
  }

  return (
    <main className="wrap lesson">
      <p className="crumbs">Part {lesson.part} · Lesson {lesson.n} of 9</p>
      <div className="split">
        <div className="read-pane">
          <h1>{lesson.title}</h1>
          {children}
          {scripts && (
            <div className="scripts">
              <p className="fine">Full scripts for running this step on your own data:</p>
              {scripts.map((sc) => <ScriptViewer key={sc.url} {...sc} />)}
            </div>
          )}
        </div>

        <div className="do-pane">
          <div className="box">
            <div className="box-head"><span>Code</span><span className="mode live">Live</span></div>
            <div className="controls">
              {sels.map((s) => (
                <label key={s.id} htmlFor={s.id}>{s.label}
                  <select id={s.id} value={choice[s.id] ?? ''} disabled={busy}
                    onChange={(e) => setChoice((c) => ({ ...c, [s.id]: e.target.value }))}>
                    {s.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
              ))}
              <button className="pill small" type="button" onClick={run} disabled={busy || !manifest}>
                {busy ? 'Running ...' : 'Run'}
              </button>
              <button className="link" type="button" onClick={() => setCode(starter)} disabled={busy || code === starter}>
                Reset code
              </button>
            </div>
            <textarea id="code" className="editor" spellCheck="false" aria-label="Python code"
              rows={starter.split('\n').length} value={code} onChange={(e) => setCode(e.target.value)} />
          </div>

          <div className="box">
            <div className="box-head"><span>Output</span><span role="status">{status}</span></div>
            <pre className="log" ref={logRef}>{log}</pre>
          </div>

          {rows && (
            <div className="box">
              <div className="box-head"><span className="outname">{outName}</span><span>{rows.length} rows</span></div>
              <div className="tablewrap">
                <table>
                  <thead><tr>{columns.map((c) => <th key={c.key} className={textCols[c.key] ? 'text' : ''}>{c.label || c.key}</th>)}</tr></thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className={isHit && isHit(r, rows) ? 'hit' : ''}>
                        {columns.map((c) => (
                          <td key={c.key} className={textCols[c.key] ? 'text' : ''}>
                            {c.fmt ? c.fmt(r[c.key]) : r[c.key] ?? ''}
                            {c.bar && <span className="zbar" style={{ width: `${Math.round((Math.abs(r[c.key]) / barMax[c.key]) * 60)}px` }} />}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {cp && (
            <div className="box">
              <div className="box-head"><span>Checkpoint</span></div>
              <form className="check" onSubmit={check}>
                <p>{cp.question}</p>
                <div className="row">
                  <label htmlFor="answer" className="soon">Your answer</label>
                  <input id="answer" type="number" min="0" inputMode="numeric" value={answer} onChange={(e) => setAnswer(e.target.value)} />
                  <button className="pill small" type="submit">Check</button>
                  {verdict && <span className={verdict.ok ? 'verdict good' : 'verdict bad'} role="status">{verdict.text}</span>}
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
      <div className="nav">
        <a className="pill ghost small" href="#course">Back to all lessons</a>
        {verdict?.ok && (
          <a className="pill small" href={lesson.next ? `#lesson-${lesson.next}` : '#course'}>
            {lesson.next ? 'Lesson complete. Next lesson' : 'Lesson complete. Continue'}
          </a>
        )}
      </div>
    </main>
  )
}

// Shared pieces for lessons that read the per-protein S-PrediXcan outputs.
export const cellOptions = (m) => m.cells.map((c) => ({ value: c, label: c.replaceAll('_', ' ') }))
export const proteinOptions = (m) => Object.entries(m.oids).map(([id, f]) => ({ value: id, label: `${f.split('_')[0]} (${id})` }))
export const outputFiles = (m, cells = m.cells) => cells.flatMap((c) => Object.keys(m.oids).map((oid) => {
  const name = `ukb_${oid}_${c}_predixcan_output.csv`
  return { url: `expected/${name}`, path: `/data/output/${c}_cell/${name}` }
}))
export const num = (d) => (v) => (v == null ? '' : v.toFixed(d))
