import LiveLesson, { cellOptions, fmtP, num, outputFiles } from '../LiveLesson.jsx'

const STARTER = `import postprocess_lite as pp

# Merge every protein's output for this cell type.
# Each file gets its own Bonferroni threshold: 0.05 / genes tested in that file.
bonferroni, p05, thresholds = pp.combine(OUT_BASE, CELL_TYPE)

print()
print(thresholds[["OLINK_ID", "N_GENES", "THRESHOLD"]])

# Show the strict list. Change this to p05 to see the lenient one.
results = bonferroni
`

const selectors = (m) => [{ id: 'cell', label: 'Cell type', options: cellOptions(m) }]

const prepare = ({ cell }, m) => ({
  files: outputFiles(m, [cell]),
  globals: { OUT_BASE: '/data/output', CELL_TYPE: cell },
  banner: `===== ${cell} =====`,
  outName: `merged_significant_results_bcorr_${cell}.tsv`,
})

const columns = [
  { key: 'gene_name' },
  { key: 'olink_id' },
  { key: 'cell_type' },
  { key: 'zscore', fmt: num(2), bar: true },
  { key: 'pvalue', fmt: fmtP },
  { key: 'n_snps_used' },
]

const checkpoint = (rows) => {
  const oid = rows[0]?.olink_id
  const n = rows.filter((r) => r.olink_id === oid).length
  return {
    question: `How many rows in this table belong to protein ${oid}?`,
    answer: n,
    right: `Correct. ${n} genes are associated with ${oid} in this table.`,
    hint: 'Not quite. Count the rows with that olink_id.',
  }
}

export default function Lesson7(props) {
  return (
    <LiveLesson {...props} starter={STARTER} selectors={selectors} prepare={prepare} columns={columns} checkpoint={checkpoint}>
      <p>
        Lesson 6 made one file per protein. The full run makes 2,896 of them for every cell type.
        This step stacks them into one table per cell type and keeps only the associations worth
        looking at.
      </p>
      <dl className="io">
        <dt>Script</dt><dd><code>spredixcan/combine.sh</code>, which calls <code>02format_output.R</code></dd>
        <dt>Inputs</dt><dd>Every <code>ukb_&lt;OID&gt;_&lt;cell&gt;_predixcan_output.csv</code> for one cell type</dd>
        <dt>Output</dt><dd>Two merged tables (Bonferroni and p &lt; 0.05) and the threshold used for each protein</dd>
      </dl>
      <ol className="steps">
        <li>Choose a cell type and press Run.</li>
        <li>Read the threshold printed for each protein.</li>
        <li>Change the last line to <code>results = p05</code> and run again to compare.</li>
      </ol>
      <p>
        Testing many genes means some look significant by chance. Bonferroni divides 0.05 by the
        number of genes tested in each file, so a gene must clear a much lower p-value.
      </p>
      <p>
        With 36 sample genes the threshold is 0.05 / 36 = 0.0014. In the full run about 18,500
        genes are tested per file, so the threshold is near 2.7e-6 and far fewer genes pass.
      </p>
      <p className="fine">
        The pipeline does this step in R. The lesson runs a Python version of the same logic.
      </p>
    </LiveLesson>
  )
}
