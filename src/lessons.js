// The course outline. `mode`: live = runs in the browser on sample data,
// replay = recorded run of a GPU/cluster step, read = concepts.
// A lesson becomes clickable once it has a `component` registered in App.jsx.
export const LESSONS = [
  { n: 1, part: 1, title: 'How scPrediXcan works', file: 'the scPrediXcan paper and protocol, with a quiz', mode: 'read', next: 2 },
  { n: 2, part: 1, title: 'Pseudobulk your single-cell data', file: 'pseudobulk_from_h5ad.py', mode: 'live', next: 3 },
  { n: 3, part: 1, title: 'Add epigenomic features from DNA sequence', file: 'ctPred/ctPred_preprocess.py', mode: 'live' },
  { n: 4, part: 1, title: 'Train a ctPred model for each cell type', file: 'ctPred/ctPred.py', mode: 'replay' },
  { n: 5, part: 1, title: 'Turn predictions into TWAS models', file: 'NEXTFLOW/run_batches.sh', mode: 'replay' },
  { n: 6, part: 2, title: 'Run S-PrediXcan for one protein and one cell type', file: 'spredixcan/01run_predixcan.py', mode: 'live', next: 7 },
  { n: 7, part: 2, title: 'Combine and filter results', file: 'combine.sh, 02format_output.R', mode: 'live', next: 8 },
  { n: 8, part: 2, title: 'Label cis and trans associations', file: '03mapping.R', mode: 'live' },
  { n: 9, part: 2, title: 'Look at a locus', file: 'built-in regional plot', mode: 'live' },
]

export const PARTS = [
  { n: 1, title: 'Part 1. Build cell-type models', sub: 'Single-cell counts become a model that predicts expression from DNA sequence.' },
  { n: 2, title: 'Part 2. Run and interpret a TWAS', sub: 'GWAS summary statistics become gene-level associations for each cell type.' },
]

export const MODE_LABEL = { live: 'Live', replay: 'Replay', read: 'Read' }

// The single-cell atlas the liver models were built from (CELLxGENE collection).
export const ATLAS_URL = 'https://cellxgene.cziscience.com/collections/059202e1-1f1b-483f-9151-f3a25a380c39'

// The scripts-only version of the pipeline.
export const PIPELINE_URL = 'https://github.com/aliyaliyuan/PlasmaXcan'
