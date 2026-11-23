# scPrediCamp

**Open the course:** https://aliyaliyuan.github.io/scPrediCamp/

An interactive, in-browser course on **scPrediXcan**, the cell-type-specific TWAS framework
(Zhou et al. 2025, Cell Genomics, https://doi.org/10.1016/j.xgen.2025.100875). It walks from
single-cell RNA-seq to cell-type expression models to gene-level associations with GWAS
summary statistics, using liver cell types and UK Biobank plasma-protein GWAS as the example.
Real Python runs in the browser on small sample data, so there is nothing to install.

Want the plain scripts and a written pipeline description instead? See
[PlasmaXcan](https://github.com/aliyaliyuan/PlasmaXcan).

## How to run it locally (on your device)

```bash
npm install
npm run dev        # open the printed URL
```

`npm run build` writes the static site to `dist/`. Every push to `main` builds and publishes
it to GitHub Pages (`.github/workflows/pages.yml`). One-time setup: repo Settings -> Pages ->
Source: GitHub Actions.

Built with React + Vite; Python runs in the browser through Pyodide (loaded from the jsDelivr
CDN; set `VITE_PYODIDE_BASE` at build time to use another copy).

## Layout

| path | what it is |
|---|---|
| `src/lessons/Lesson1.jsx` | How scPrediXcan works: paper and protocol summary, figures, quiz |
| `src/Quiz.jsx` | multiple-choice quiz used by lesson 1 |
| `public/papers/` | the scPrediXcan article and protocol (open access, CC BY 4.0) |
| `public/scripts/ctPred_preprocess.py` | copy of `ctPred/ctPred_preprocess.py` from PlasmaXcan, shown in lesson 3 |
| `src/lessons.js` | the course outline (nine lessons, two parts) |
| `src/built.js` | lessons that are built; add a component here to make its row clickable |
| `src/LiveLesson.jsx` | shared lesson layout: reading pane, editable Python, output, results table, checkpoint |
| `src/lessons/Lesson2.jsx` | Pseudobulk your single-cell data (atlas sample CSV) |
| `src/lessons/Lesson3.jsx` | Add epigenomic features (opens a Geuvadis `.h5` in the browser) |
| `src/lessons/Lesson6.jsx` | Run S-PrediXcan for one protein and one cell type |
| `src/lessons/Lesson7.jsx` | Combine and filter results (port of `02format_output.R`) |
| `src/lessons/Lesson8.jsx` | Label cis and trans associations (port of `03mapping.R`) |
| `src/pyodide.js` | loads Python, numpy, pandas and sqlite3 in the browser |
| `public/py/preprocess_lite.py` | pseudobulk, reading Enformer `.h5` features, ctPred training table (lessons 2 and 3) |
| `public/scripts/pseudobulk_from_h5ad.py` | full-scale script: `.h5ad` atlas to one donor-by-gene table per cell type |
| `public/py/spredixcan_lite.py` | S-PrediXcan association in ~60 lines of pandas (lesson 6) |
| `public/py/postprocess_lite.py` | combine/filter, cis/trans labels and BH FDR (lessons 7 and 8) |
| `public/sample_data/` | small real sample: 36 genes around three loci, 3 cell types, 2 proteins |
| `scripts/make_sample_data.py` | cuts `public/sample_data/` from the full inputs |
| `scripts/make_part1_sample.py` | cuts the atlas, Geuvadis and feature-table samples (needs anndata, h5py) |
| `scripts/make_mapping_sample.R` | gene and protein coordinates (GRCh38) for the sample genes |
| `scripts/check_lite.py` | checks `spredixcan_lite.py` against the full MetaXcan pipeline output |
| `scripts/check_postprocess.py` | runs the lesson 7 and 8 code on the sample and checks BH FDR against R |

## Sample data

Cut from the full inputs by `scripts/make_sample_data.py`:

- `models/<cell>/filtered_db/` trimmed PredictDB model and SNP covariance (same file names as the full models)
- `gwas/` the matching slices of two UKB-PPP GWAS files (A1BG, AAMDC)
- `expected/` the full-genome pipeline's results for the same genes
- `atlas/` 250 periportal hepatocytes from 10 donors as a CSV: every `obs` column of the h5ad, then raw counts for the sample genes; plus the `var` table
- `geuvadis/` Enformer features for 10 Geuvadis individuals, 6 genes each, in the original `.h5` layout
- `epigenomics/` reference-genome Enformer features and the gene-to-region key for the sample genes
- `training/` pseudobulk counts, ctPred predicted expression and log tails for the same genes
- `mapping/` gene start positions and Olink protein positions for the same genes (GRCh38)
- `manifest.json` cell types, proteins and loci, read by the lessons

The atlas is the Human Liver Cell Atlas on CELLxGENE:
https://cellxgene.cziscience.com/collections/059202e1-1f1b-483f-9151-f3a25a380c39

`python scripts/check_lite.py` confirms the in-browser code reproduces the z-scores in `expected/`.

Pyodide is loaded from the jsDelivr CDN. To serve your own copy, build with
`VITE_PYODIDE_BASE=./pyodide/` and put the Pyodide files in `dist/pyodide/`.
