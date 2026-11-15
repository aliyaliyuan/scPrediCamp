import { useEffect, useMemo, useRef, useState } from 'react'
import { getPyodide, putFile } from '../pyodide.js'

const DATA = 'sample_data'
const MODEL = 'filtered_db/predict_db_Model_training_filtered'

const STARTER = `import spredixcan_lite as sp

# 1. Rewrite GWAS SNP IDs to match the model: chr19_58345183_C_T_b38
gwas = sp.reformat_gwas(GWAS_FILE)
print(gwas[["SNP", "BETA", "SE"]].head(3))

# 2. Load the cell-type model: SNP weights per gene, and SNP covariance
weights, extra = sp.load_model(MODEL_DB)
cov = sp.load_covariance(COVARIANCE)

# 3. One association test per gene
results = sp.associate(gwas, weights, extra, cov)
`

const fmtP = (p) => (p === 0 ? '< 1e-300' : p < 0.001 ? p.toExponential(1) : p.toFixed(3))

export default function Lesson6({ lesson, onComplete }) {
  const [manifest, setManifest] = useState(null)
  const [oid, setOid] = useState('')
  const [cell, setCell] = useState('')
  const [code, setCode] = useState(STARTER)
  const [log, setLog] = useState('Press Run to start.')
  const [status, setStatus] = useState('Not run yet')
  const [busy, setBusy] = useState(false)
  const [rows, setRows] = useState(null)
  const [ran, setRan] = useState(null)
  const [answer, setAnswer] = useState('')
  const [verdict, setVerdict] = useState(null)
  const logRef = useRef(null)

  useEffect(() => {
    fetch(`${DATA}/manifest.json`).then((r) => r.json()).then((m) => {
      setManifest(m)
      setOid(Object.keys(m.oids)[0])
      setCell(m.cells[0])
    }).catch(() => setLog('Could not load the sample data list.'))
  }, [])

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight }, [log])

  const files = manifest && oid && {
    gwas: `gwas/${manifest.oids[oid]}`,
    db: `models/${cell}/${MODEL}.db`,
    cov: `models/${cell}/${MODEL}.txt.gz`,
  }

  const threshold = rows ? 0.05 / rows.length : null
  const passing = useMemo(() => (rows ? rows.filter((r) => r.pvalue < threshold).length : 0), [rows, threshold])
  const maxZ = useMemo(() => (rows ? Math.max(...rows.map((r) => Math.abs(r.zscore)), 1) : 1), [rows])

  async function run() {
    setBusy(true); setRows(null); setVerdict(null); setAnswer(''); setLog('')
    const say = (line) => setLog((l) => l + line + '\n')
    try {
      const py = await getPyodide((s) => { setStatus('Starting Python'); say(s) })
      setStatus('Running')
      say('Fetching sample files ...')
      await Promise.all(Object.values(files).map((f) => putFile(py, `${DATA}/${f}`, `/data/${f}`)))
      py.setStdout({ batched: say })
      py.setStderr({ batched: say })
      py.globals.set('GWAS_FILE', `/data/${files.gwas}`)
      py.globals.set('MODEL_DB', `/data/${files.db}`)
      py.globals.set('COVARIANCE', `/data/${files.cov}`)
      say(`\nRunning S-PrediXcan:\n  OlinkID:    ${oid}\n  Cell Type:  ${cell}\n  GWAS file:  ${files.gwas}\n`)
      py.runPython('results = None')
      await py.runPythonAsync(code)
      // json.dumps keeps full precision; DataFrame.to_json would round small p-values to 0
      const json = py.runPython(
        'import json; json.dumps(results.astype(object).where(results.notna(), None).to_dict("records")) if results is not None else "null"'
      )
      const out = JSON.parse(json)
      if (!out) throw new Error('Your code finished, but it did not create a table called `results`.')
      setRows(out); setRan({ oid, cell })
      say('\nS-PrediXcan analysis completed successfully')
      say(`Output file: ukb_${oid}_${cell}_predixcan_output.csv`)
      setStatus('Finished')
    } catch (e) {
      const msg = String(e.message || e).trim().split('\n').slice(-4).join('\n')
      say('\n' + msg)
      setStatus('Stopped with an error')
    } finally {
      setBusy(false)
    }
  }

  function check(e) {
    e.preventDefault()
    if (answer === '') return setVerdict({ ok: false, text: 'Enter a number first.' })
    if (Number(answer) === passing) {
      setVerdict({ ok: true, text: `Correct. ${passing} genes have p below ${threshold.toExponential(1)}.` })
      onComplete()
    } else {
      setVerdict({ ok: false, text: `Not quite. Count the rows with pvalue below ${threshold.toExponential(1)}.` })
    }
  }

  return (
    <main className="wrap lesson">
      <p className="crumbs">Part {lesson.part} · Lesson {lesson.n} of 9</p>
      <div className="split">
        <div className="read-pane">
          <h1>{lesson.title}</h1>
          <p>
            S-PrediXcan asks one question for each gene: is the genetically predicted expression of
            this gene, in this cell type, associated with the trait? Here the trait is the plasma
            level of one protein. It needs only GWAS summary statistics, so no individual genotypes
            are involved.
          </p>
          <dl className="io">
            <dt>Script</dt><dd><code>{lesson.file}</code></dd>
            <dt>Inputs</dt><dd>A GWAS file for one plasma protein, and a cell-type model (<code>.db</code>) with its SNP covariance (<code>.txt.gz</code>)</dd>
            <dt>Output</dt><dd>One CSV with a z-score and p-value per gene</dd>
          </dl>
          <ol className="steps">
            <li>Choose a protein and a cell type.</li>
            <li>Press Run. The code on the right runs in your browser.</li>
            <li>Read the results table, then answer the checkpoint.</li>
          </ol>
          <p>
            The gene score is a weighted sum of GWAS z-scores: each SNP counts by its weight in the
            model, and the SNP covariance corrects for SNPs that are inherited together.
          </p>
          <p>
            The first step rewrites SNP IDs so they match the model. A mismatch here is the most
            common reason a run finds zero SNPs.
          </p>
          <p className="fine">
            Sample data: 36 genes around three loci, cut from the full inputs. On these genes the
            code here gives the same z-scores as the full pipeline.
          </p>
        </div>

        <div className="do-pane">
          <div className="box">
            <div className="box-head"><span>Code</span><span className="mode live">Live</span></div>
            <div className="controls">
              <label htmlFor="oid">Protein
                <select id="oid" value={oid} onChange={(e) => setOid(e.target.value)} disabled={busy}>
                  {manifest && Object.entries(manifest.oids).map(([id, f]) => (
                    <option key={id} value={id}>{f.split('_')[0]} ({id})</option>
                  ))}
                </select>
              </label>
              <label htmlFor="cell">Cell type
                <select id="cell" value={cell} onChange={(e) => setCell(e.target.value)} disabled={busy}>
                  {manifest && manifest.cells.map((c) => <option key={c} value={c}>{c.replaceAll('_', ' ')}</option>)}
                </select>
              </label>
              <button className="pill small" type="button" onClick={run} disabled={busy || !files}>
                {busy ? 'Running ...' : 'Run'}
              </button>
              <button className="link" type="button" onClick={() => setCode(STARTER)} disabled={busy || code === STARTER}>
                Reset code
              </button>
            </div>
            <textarea
              id="code" className="editor" spellCheck="false" aria-label="Python code"
              rows={STARTER.split('\n').length} value={code} onChange={(e) => setCode(e.target.value)}
            />
          </div>

          <div className="box">
            <div className="box-head"><span>Output</span><span role="status">{status}</span></div>
            <pre className="log" ref={logRef}>{log}</pre>
          </div>

          {rows && (
            <div className="box">
              <div className="box-head">
                <span>ukb_{ran.oid}_{ran.cell}_predixcan_output.csv</span>
                <span>{rows.length} genes tested</span>
              </div>
              <div className="tablewrap">
                <table>
                  <thead>
                    <tr><th>gene_name</th><th>zscore</th><th>pvalue</th><th>n_snps_used</th><th>n_snps_in_model</th><th>pred_perf_r2</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.gene} className={r.pvalue < threshold ? 'hit' : ''}>
                        <td>{r.gene_name}</td>
                        <td>
                          {r.zscore.toFixed(2)}
                          <span className="zbar" style={{ width: `${Math.round((Math.abs(r.zscore) / maxZ) * 60)}px` }} />
                        </td>
                        <td>{fmtP(r.pvalue)}</td>
                        <td>{r.n_snps_used}</td>
                        <td>{r.n_snps_in_model}</td>
                        <td>{r.pred_perf_r2 == null ? '' : r.pred_perf_r2.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {rows && (
            <div className="box">
              <div className="box-head"><span>Checkpoint</span></div>
              <form className="check" onSubmit={check}>
                <p>
                  A Bonferroni threshold for {rows.length} genes is 0.05 / {rows.length} = {threshold.toExponential(1)}.
                  How many genes pass it?
                </p>
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
        {verdict?.ok && <a className="pill small" href="#course">Lesson complete. Continue</a>}
      </div>
    </main>
  )
}
