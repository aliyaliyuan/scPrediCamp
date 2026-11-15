import LiveLesson, { fmtP, num, outputFiles } from '../LiveLesson.jsx'

const STARTER = `import pandas as pd
import postprocess_lite as pp

# Every protein x cell type result, in one table
everything = pp.load_outputs(OUT_BASE)

# Where each gene starts, and where the gene encoding each protein is
genes = pd.read_csv(MAPPED_GENES, sep="\\t")
proteins = pd.read_csv(MAPPED_PROTEINS, sep="\\t")

# cis: the gene starts within 1 Mb of the protein's own gene. Otherwise trans.
annotated = pp.annotate(everything, genes, proteins, window=1_000_000)

# Correct for the number of tests across all results
annotated["qvalue"] = pp.bh_fdr(annotated["pvalue"])
significant = annotated[annotated["qvalue"] < 0.05]

print(significant.groupby(["cds_name", "acting"]).size())
results = significant.sort_values("pvalue")
`

const prepare = (_, m) => ({
  files: [
    ...outputFiles(m),
    { url: 'mapping/mapped_genes.txt', path: '/data/mapping/mapped_genes.txt' },
    { url: 'mapping/mapped_proteins.txt', path: '/data/mapping/mapped_proteins.txt' },
  ],
  globals: { OUT_BASE: '/data/output', MAPPED_GENES: '/data/mapping/mapped_genes.txt', MAPPED_PROTEINS: '/data/mapping/mapped_proteins.txt' },
  outName: 'sc_predixcan_results_fdr.txt',
})

const columns = [
  { key: 'cds_name', label: 'protein' },
  { key: 'gene_name' },
  { key: 'acting' },
  { key: 'cis_category' },
  { key: 'cell_type', fmt: (v) => v.replaceAll('_', ' ') },
  { key: 'zscore', fmt: num(2), bar: true },
  { key: 'qvalue', fmt: fmtP },
]

const isHit = (r) => r.cis_category === 'same'

const checkpoint = (rows) => {
  const n = rows.filter(isHit).length
  return {
    question: 'How many rows are cis "same", meaning the gene is the one that encodes the protein?',
    answer: n,
    right: `Correct. ${n} rows link a protein to its own gene.`,
    hint: 'Not quite. Count the rows where cis_category is "same".',
  }
}

export default function Lesson8(props) {
  return (
    <LiveLesson {...props} starter={STARTER} prepare={prepare} columns={columns} isHit={isHit} checkpoint={checkpoint}>
      <p>
        An association says a gene's predicted expression tracks a protein's plasma level. It
        does not say why. Where the gene sits relative to the protein's own gene is the first
        clue.
      </p>
      <dl className="io">
        <dt>Script</dt><dd><code>{props.lesson.file}</code></dd>
        <dt>Inputs</dt><dd>All S-PrediXcan outputs, gene start positions, and the position of the gene encoding each protein</dd>
        <dt>Output</dt><dd>One table of FDR-significant associations, each labelled cis or trans</dd>
      </dl>
      <dl className="terms">
        <dt>cis, same</dt><dd>The gene is the one that encodes the protein. The most direct kind of evidence.</dd>
        <dt>cis, different</dt><dd>A neighbouring gene within 1 Mb. Often it shares the same nearby variants.</dd>
        <dt>trans</dt><dd>A gene elsewhere in the genome. It may regulate the protein from a distance.</dd>
      </dl>
      <ol className="steps">
        <li>Press Run and read the counts printed for each protein.</li>
        <li>Find A1BG in the table. Which of its hits are on another chromosome?</li>
        <li>Try <code>window=250_000</code> and see which cis genes become trans.</li>
      </ol>
      <p className="fine">
        The pipeline uses Storey q-values from the R <code>qvalue</code> package. This lesson uses
        Benjamini-Hochberg FDR, which is simpler and slightly stricter. Positions are GRCh38.
      </p>
    </LiveLesson>
  )
}
