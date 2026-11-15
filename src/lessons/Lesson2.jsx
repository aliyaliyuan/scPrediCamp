import LiveLesson from '../LiveLesson.jsx'
import { ATLAS_URL } from '../lessons.js'

const CELLS = 'atlas/cells_Periportal_Hepatocyte_sample.csv'
const GENES = 'atlas/genes_sample.csv'

const STARTER = `import pandas as pd
import preprocess_lite as pre

# One row per cell: metadata columns first, then one count column per gene
cells = pd.read_csv(CELLS)
print(cells.shape)
print(list(cells.columns[:13]))

# Which donor did each cell come from?
print(cells["donor_id"].value_counts())

# Sum each gene's counts over all of a donor's cells
genes = list(pd.read_csv(GENES)["feature_name"])
results = pre.pseudobulk(cells, genes, donor="donor_id")
`

const prepare = () => ({
  files: [CELLS, GENES].map((url) => ({ url, path: `/data/${url}` })),
  globals: { CELLS: `/data/${CELLS}`, GENES: `/data/${GENES}` },
  outName: 'pseudobulk_Periportal_Hepatocyte.tsv',
})

const columns = (rows) => Object.keys(rows[0] || {}).map((key) => ({ key }))

const checkpoint = (rows) => {
  const donor = Object.keys(rows[0]).find((k) => k !== 'gene_name')
  const row = rows.find((r) => r.gene_name === 'A1BG') || rows[0]
  return {
    question: `What is the summed count of ${row.gene_name} for donor ${donor}?`,
    answer: row[donor],
    right: `Correct. Donor ${donor}'s cells add up to ${row[donor]} ${row.gene_name} counts.`,
    hint: `Not quite. Find the ${row.gene_name} row and read the ${donor} column.`,
  }
}

const scripts = [{ label: 'pseudobulk_from_h5ad.py', url: 'scripts/pseudobulk_from_h5ad.py' }]

export default function Lesson2(props) {
  return (
    <LiveLesson {...props} starter={STARTER} prepare={prepare} columns={columns} checkpoint={checkpoint} scripts={scripts}>
      <p>
        Model building starts from a single-cell atlas. The liver models here come from
        the <a href={ATLAS_URL} target="_blank" rel="noreferrer">Human Liver Cell Atlas</a> on
        CELLxGENE, downloaded as one <code>.h5ad</code> file. You can start from any atlas that
        records a cell type and a donor for every cell.
      </p>
      <dl className="io">
        <dt>Script</dt><dd><code>{props.lesson.file}</code></dd>
        <dt>Input</dt><dd>An <code>.h5ad</code> file: counts per cell and gene, a table describing each cell (<code>obs</code>) and a table describing each gene (<code>var</code>)</dd>
        <dt>Output</dt><dd>One table per cell type, with a row per gene and a column per donor</dd>
      </dl>
      <p>
        Single cells are too sparse to model one at a time. Pseudobulking adds up each gene's
        counts across all of one donor's cells of one cell type, giving one expression value
        per donor.
      </p>
      <ol className="steps">
        <li>Press Run and read the column names. These are the atlas's own <code>obs</code> columns.</li>
        <li>Find the two columns the pipeline needs: <code>author_cell_type</code> and <code>donor_id</code>.</li>
        <li>Read the pseudobulk table, then answer the checkpoint.</li>
      </ol>
      <p className="fine">
        Sample data: 250 periportal hepatocytes from 10 donors and 36 genes, cut from the atlas
        and saved as a CSV so you can see every column. The full file has 228,368 cells and
        32,624 genes.
      </p>
    </LiveLesson>
  )
}
