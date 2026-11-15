# scPrediXcan tutorial (web app)

An interactive, in-browser walkthrough of the scPrediXcan pipeline. React + Vite, with
Python running in the browser through Pyodide. No server is needed.

## Run it locally

```bash
cd tutorial
npm install
npm run dev        # open the printed URL
```

`npm run build` writes the static site to `tutorial/dist`. Pushing to the `ui` branch builds
and publishes it to GitHub Pages (`.github/workflows/pages.yml`). One-time setup:
repo Settings -> Pages -> Source: GitHub Actions.

## Layout

| path | what it is |
|---|---|
| `src/lessons.js` | the course outline (nine lessons, two parts) |
| `src/built.js` | lessons that are built; add a component here to make its row clickable |
| `src/lessons/Lesson6.jsx` | Run S-PrediXcan for one protein and one cell type (live) |
| `src/pyodide.js` | loads Python, numpy, pandas and sqlite3 in the browser |
| `public/py/spredixcan_lite.py` | S-PrediXcan association in ~60 lines of pandas, used by the lessons |
| `public/sample_data/` | small real sample: 36 genes around three loci, 3 cell types, 2 proteins |
| `scripts/make_sample_data.py` | cuts `public/sample_data/` from the full inputs |
| `scripts/check_lite.py` | checks `spredixcan_lite.py` against the full MetaXcan pipeline output |

## Sample data

Cut from the full inputs by `scripts/make_sample_data.py`:

- `models/<cell>/filtered_db/` trimmed PredictDB model and SNP covariance (same file names as the full models)
- `gwas/` the matching slices of two UKB-PPP GWAS files (A1BG, AAMDC)
- `expected/` the full-genome pipeline's results for the same genes
- `training/` pseudobulk counts, ctPred predicted expression and log tails for the same genes
- `manifest.json` cell types, proteins and loci, read by the lessons

`python scripts/check_lite.py` confirms the in-browser code reproduces the z-scores in `expected/`.

Pyodide is loaded from the jsDelivr CDN. To serve your own copy, build with
`VITE_PYODIDE_BASE=./pyodide/` and put the Pyodide files in `dist/pyodide/`.
