import { BUILT } from './built.js'
import { LESSONS, MODE_LABEL, PARTS } from './lessons.js'

function Row({ l, done }) {
  const built = Boolean(BUILT[l.n])
  const inner = (
    <>
      <span className="num">{done ? '✓' : l.n}</span>
      <span className="lt"><strong>{l.title}</strong><code>{l.file}</code></span>
      <span className="meta">
        <span className={`mode ${l.mode}`}>{MODE_LABEL[l.mode]}</span>
        {built ? <span className="pill small">Open</span> : <span className="soon">Coming soon</span>}
      </span>
    </>
  )
  return (
    <li className={done ? 'done' : ''}>
      {built ? <a className="lesson-row" href={`#lesson-${l.n}`}>{inner}</a> : <div className="lesson-row">{inner}</div>}
    </li>
  )
}

export default function Course({ done }) {
  return (
    <main className="wrap course">
      <div>
        <h1>From single-cell data to cell-type TWAS</h1>
        <p className="lead">
          Nine lessons follow the pipeline in order. You can train your own models, use the liver
          atlas models as they are, or skip ahead and run your GWAS.
        </p>
      </div>

      <div className="paths">
        <div className="path">
          <h3>Build your own models</h3>
          <p>Start from single-cell RNA-seq, such as a Human Cell Atlas dataset, and train a model for each cell type.</p>
          <p className="goes">Lessons 1 to 5</p>
        </div>
        <div className="path">
          <h3>Use the liver atlas models</h3>
          <p>Download the 9 trained liver cell-type models and skip training.</p>
          <p className="goes">Model downloads, then lesson 6</p>
        </div>
        <div className="path">
          <h3>Run your GWAS</h3>
          <p>Test your summary statistics against cell-type models and read the results.</p>
          <p className="goes">Lessons 6 to 9</p>
        </div>
      </div>

      <div className="legend">
        <span><b className="mode live">Live</b> real code runs in your browser on sample data</span>
        <span><b className="mode replay">Replay</b> a recorded run of a step that needs a GPU or cluster</span>
        <span><b className="mode read">Read</b> concepts and diagrams</span>
      </div>

      {PARTS.map((p) => (
        <div className="section" key={p.n}>
          <h2>{p.title}</h2>
          <p className="sub">{p.sub}</p>
          <ul className="lessons">
            {LESSONS.filter((l) => l.part === p.n).map((l) => <Row key={l.n} l={l} done={done[l.n]} />)}
          </ul>
        </div>
      ))}
    </main>
  )
}
