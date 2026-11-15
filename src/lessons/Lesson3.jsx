import LiveLesson, { num } from '../LiveLesson.jsx'

const CELLS = 'atlas/cells_Periportal_Hepatocyte_sample.csv'
const GENES = 'atlas/genes_sample.csv'
const EPI = 'epigenomics/Gene_epigenomics_sample.csv'
const INDIVIDUALS = ['NA12830', 'HG00100', 'HG00334', 'NA18923', 'NA11892', 'NA19107', 'HG00150', 'NA18909', 'NA18868', 'NA20813']

const STARTER = `import h5py
import pandas as pd
import preprocess_lite as pre

# 1. Enformer's output for one Geuvadis individual: a block of numbers per gene
h5 = h5py.File(H5_FILE)
region = list(h5)[0]
print(len(h5), "genes in this sample file")
print(region, h5[region].shape)

# Average each block's 4 rows: one row per gene, 5,313 features
person = pre.read_h5_features(H5_FILE)
print(person.iloc[:, :3])

# 2. The same features for the reference genome, for every sample gene
features = pd.read_csv(EPIGENOMICS)

# 3. Observed expression from lesson 2, turned into a percentile per gene
cells = pd.read_csv(CELLS)
genes = list(pd.read_csv(GENES)["feature_name"])
pseudobulk = pre.pseudobulk(cells, genes, log=lambda *a: None)

table = pre.ctpred_input(features, pseudobulk)
print(table.shape)

# Show a few of the 5,316 columns
results = table[["gene_name", "chromo", "feature_0", "feature_1", "feature_5312", "percentile"]]
`

const selectors = () => [{ id: 'ind', label: 'Geuvadis individual', options: INDIVIDUALS.map((v) => ({ value: v, label: v })) }]

const prepare = ({ ind }) => {
  const h5 = `geuvadis/${ind}.h5`
  return {
    packages: ['h5py'],
    files: [CELLS, GENES, EPI, h5].map((url) => ({ url, path: `/data/${url}` })),
    globals: { CELLS: `/data/${CELLS}`, GENES: `/data/${GENES}`, EPIGENOMICS: `/data/${EPI}`, H5_FILE: `/data/${h5}` },
    banner: `Enformer features: ${ind}.h5`,
    outName: 'processed_IbG_pseudobulk_Periportal_Hepatocyte.csv',
  }
}

const columns = [
  { key: 'gene_name' },
  { key: 'chromo' },
  { key: 'feature_0', fmt: num(3) },
  { key: 'feature_1', fmt: num(3) },
  { key: 'feature_5312', fmt: num(3) },
  { key: 'percentile', fmt: num(1), bar: true },
]

const checkpoint = () => ({
  question: 'How many Enformer features describe each gene?',
  answer: 5313,
  right: 'Correct. Each gene gets 5,313 features, feature_0 to feature_5312.',
  hint: 'Not quite. Look at the shape printed for one region: 4 rows by how many columns?',
})

const scripts = [{ label: 'ctPred_preprocess.py', url: 'scripts/ctPred_preprocess.py' }]

export default function Lesson3(props) {
  return (
    <LiveLesson {...props} starter={STARTER} selectors={selectors} prepare={prepare} columns={columns} checkpoint={checkpoint} scripts={scripts}>
      <p>
        ctPred learns to predict a gene's expression in one cell type from what the DNA around
        the gene looks like. That description comes from Enformer, a deep learning model that
        reads DNA sequence and predicts 5,313 epigenomic signals, such as open chromatin and
        histone marks.
      </p>
      <dl className="io">
        <dt>Script</dt><dd><code>{props.lesson.file}</code></dd>
        <dt>Inputs</dt><dd>The pseudobulk table from lesson 2, and Enformer features for each gene</dd>
        <dt>Output</dt><dd>One training table per cell type: 5,313 features and an expression percentile per gene</dd>
      </dl>
      <dl className="terms">
        <dt>Reference features</dt><dd>Enformer run on the reference genome. Used here, to train the model.</dd>
        <dt>Geuvadis <code>.h5</code> files</dt><dd>Enformer run on each of 448 people's own DNA. Used later, to predict each person's expression.</dd>
      </dl>
      <ol className="steps">
        <li>Press Run. The first lines open one person's <code>.h5</code> file.</li>
        <li>Choose another individual and run again. The features change slightly, because their DNA differs.</li>
        <li>Read the training table: the features are the inputs, and the percentile is what ctPred learns to predict.</li>
      </ol>
      <p>
        Expression is converted to a rank-based percentile, so the model learns which genes are
        high or low in this cell type instead of raw counts.
      </p>
      <p className="fine">
        Sample data: 6 genes for each of 10 Geuvadis individuals, and reference features for 35
        genes. A full <code>.h5</code> file holds 19,563 genes and is about 1.7 GB. A gene shows
        no percentile when it was filtered out in lesson 2.
      </p>
    </LiveLesson>
  )
}
