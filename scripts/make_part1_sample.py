#!/usr/bin/env python3
"""Sample data for the model-building lessons (Part 1).

  atlas/cells_<cell type>_sample.csv   one row per cell: every obs (metadata) column of the
                                       h5ad, then raw counts for the tutorial's sample genes
  atlas/genes_sample.csv               the h5ad's var (gene annotation) table for those genes
  geuvadis/<individual>.h5             Enformer features for 10 Geuvadis individuals, a few genes
  epigenomics/Gene_epigenomics_sample.csv   reference-genome features for the sample genes
  epigenomics/metadata_sample.csv           gene -> TSS key used in the h5 files

Needs anndata and h5py (the scPrediXcan conda env has both).
Usage:  python make_part1_sample.py
"""
import os, sqlite3, subprocess
import anndata as ad, h5py, numpy as np, pandas as pd

H5AD = os.environ.get("H5AD", os.path.expanduser("~/ATLAS/hlica_eb7c9548.h5ad"))
GEUVADIS = os.environ.get("GEUVADIS", os.path.expanduser("~/Liver/Geuvadis"))
EPI = os.environ.get("EPI", os.path.expanduser("~/Liver/1111/Gene_epigenomics_v0.csv"))
META = os.environ.get("META", os.path.expanduser("~/Liver/metadata.csv"))
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "sample_data")

CELL_TYPE = "Periportal Hepatocyte"       # value of obs["author_cell_type"]
N_DONORS, CELLS_PER_DONOR = 10, 25
H5_GENES = ["A1BG", "ZNF584", "NRBP1", "GCKR", "AAMDC", "RSF1"]   # two per sample locus
N_INDIVIDUALS = 10

con = sqlite3.connect(os.path.join(OUT, "models", "Periportal_Hepatocyte", "filtered_db",
                                   "predict_db_Model_training_filtered.db"))
genes = pd.read_sql("select gene, genename from extra", con)
con.close()

# ---- atlas: a slice of one cell type ----
os.makedirs(os.path.join(OUT, "atlas"), exist_ok=True)
a = ad.read_h5ad(H5AD, backed="r")
obs = a.obs[(a.obs["author_cell_type"] == CELL_TYPE) & (a.obs["nFeature_RNA"] > 200)]
donors = obs["donor_id"].value_counts().index[:N_DONORS]
rng = np.random.default_rng(0)
pick = np.sort(np.concatenate([rng.choice(np.where(a.obs_names.isin(obs.index[obs["donor_id"] == d]))[0],
                                          CELLS_PER_DONOR, replace=False) for d in donors]))
src = a.raw if a.raw is not None else a          # raw counts when the file keeps them
ids = [g for g in genes.gene if g in src.var_names]
rows = src.X[pick]                                # read the chosen cells, then keep the sample genes
rows = rows.tocsc() if hasattr(rows, "tocsc") else np.asarray(rows)
counts = rows[:, src.var_names.get_indexer(ids)]
counts = counts.toarray() if hasattr(counts, "toarray") else counts
name = dict(zip(genes.gene, genes.genename))
cells = a.obs.iloc[pick].copy()
cells.insert(0, "cell_id", cells.index)
counts = pd.DataFrame(counts, columns=[name[g] for g in ids], index=cells.index)
if np.allclose(counts, counts.round()):
    counts = counts.astype(int)
pd.concat([cells, counts], axis=1).to_csv(
    os.path.join(OUT, "atlas", f"cells_{CELL_TYPE.replace(' ', '_')}_sample.csv"), index=False)
var = a.var.loc[ids].copy(); var.insert(0, "gene_id", var.index)
var.to_csv(os.path.join(OUT, "atlas", "genes_sample.csv"), index=False)
print("atlas:", len(cells), "cells,", len(donors), "donors,", len(ids), "genes; raw counts:", a.raw is not None)

# ---- Enformer features ----
os.makedirs(os.path.join(OUT, "epigenomics"), exist_ok=True)
os.makedirs(os.path.join(OUT, "geuvadis"), exist_ok=True)
meta = pd.read_csv(META, index_col=0)
meta[meta.external_gene_name.isin(genes.genename)].to_csv(os.path.join(OUT, "epigenomics", "metadata_sample.csv"), index=False)
gl = os.path.join(OUT, "_g.txt"); open(gl, "w").write("\n".join(genes.genename) + "\n")
subprocess.run(f"awk -F, 'NR==FNR{{g[$1];next}} FNR==1 || ($2 in g)' {gl} {EPI} | cut -d, -f2- > "
               f"{os.path.join(OUT, 'epigenomics', 'Gene_epigenomics_sample.csv')}", shell=True, check=True)
os.remove(gl)

keys = meta.set_index("external_gene_name").loc[H5_GENES, "TSS_enformer_input"] + "_predictions"
individuals = pd.read_csv(os.path.join(OUT, "training", "Periportal_Hepatocyte_predictions.csv"), nrows=0).columns[1:N_INDIVIDUALS + 1]
for ind in individuals:
    with h5py.File(os.path.join(GEUVADIS, f"{ind}.h5")) as src_h5, \
         h5py.File(os.path.join(OUT, "geuvadis", f"{ind}.h5"), "w") as dst:
        for k in keys:
            dst.create_dataset(k, data=src_h5[k][:], compression="gzip", compression_opts=9, shuffle=True)
print("geuvadis:", list(individuals))
