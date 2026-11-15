import LiveLesson, { cellOptions, fmtP, num, proteinOptions } from '../LiveLesson.jsx'

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

const selectors = (m) => [
  { id: 'oid', label: 'Protein', options: proteinOptions(m) },
  { id: 'cell', label: 'Cell type', options: cellOptions(m) },
]

const prepare = ({ oid, cell }, m) => {
  const f = { gwas: `gwas/${m.oids[oid]}`, db: `models/${cell}/${MODEL}.db`, cov: `models/${cell}/${MODEL}.txt.gz` }
  return {
    files: Object.values(f).map((url) => ({ url, path: `/data/${url}` })),
    globals: { GWAS_FILE: `/data/${f.gwas}`, MODEL_DB: `/data/${f.db}`, COVARIANCE: `/data/${f.cov}` },
    banner: `Running S-PrediXcan:\n  OlinkID:    ${oid}\n  Cell Type:  ${cell}\n  GWAS file:  ${f.gwas}`,
    outName: `ukb_${oid}_${cell}_predixcan_output.csv`,
  }
}

const columns = [
  { key: 'gene_name' },
  { key: 'zscore', fmt: num(2), bar: true },
  { key: 'pvalue', fmt: fmtP },
  { key: 'n_snps_used' },
  { key: 'n_snps_in_model' },
  { key: 'pred_perf_r2', fmt: num(2) },
]

const isHit = (r, rows) => r.pvalue < 0.05 / rows.length

const checkpoint = (rows) => {
  const t = (0.05 / rows.length).toExponential(1)
  const n = rows.filter((r) => isHit(r, rows)).length
  return {
    question: `A Bonferroni threshold for ${rows.length} genes is 0.05 / ${rows.length} = ${t}. How many genes pass it?`,
    answer: n,
    right: `Correct. ${n} genes have p below ${t}.`,
    hint: `Not quite. Count the rows with pvalue below ${t}.`,
  }
}

export default function Lesson6(props) {
  return (
    <LiveLesson {...props} starter={STARTER} selectors={selectors} prepare={prepare} columns={columns} isHit={isHit} checkpoint={checkpoint}>
      <p>
        S-PrediXcan asks one question for each gene: is the genetically predicted expression of
        this gene, in this cell type, associated with the trait? Here the trait is the plasma
        level of one protein. It needs only GWAS summary statistics, so no individual genotypes
        are involved.
      </p>
      <dl className="io">
        <dt>Script</dt><dd><code>{props.lesson.file}</code></dd>
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
    </LiveLesson>
  )
}
