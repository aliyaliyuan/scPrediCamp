#!/usr/bin/env python3
"""Pseudobulk a single-cell atlas (.h5ad): one donor-by-gene count table per cell type.

For each cell type, counts are summed over all of a donor's cells. The output has one row
per gene and one column per donor, which is what ctPred_preprocess.py expects.

Filters (same as the Seurat version, preprocess.R):
  - keep cells with more than --min-features genes detected
  - keep genes detected in at least --min-cells cells
  - optionally keep only genes that have Enformer features (--enformer-metadata)

Example, for the Human Liver Cell Atlas from CELLxGENE:
  python pseudobulk_from_h5ad.py --h5ad hlica.h5ad --out pseudobulk/ \\
      --cell-type-col author_cell_type --donor-col donor_id \\
      --enformer-metadata metadata.csv

Needs: anndata, numpy, pandas, scipy.
"""
import argparse
import os

import anndata as ad
import numpy as np
import pandas as pd
import scipy.sparse as sp


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--h5ad", required=True)
    p.add_argument("--out", required=True, help="output directory")
    p.add_argument("--cell-type-col", default="author_cell_type", help="obs column holding the cell type")
    p.add_argument("--donor-col", default="donor_id", help="obs column holding the donor")
    p.add_argument("--gene-name-col", default="feature_name", help="var column holding gene symbols")
    p.add_argument("--cell-types", nargs="*", help="only these cell types (default: all)")
    p.add_argument("--min-features", type=int, default=200)
    p.add_argument("--min-cells", type=int, default=3)
    p.add_argument("--enformer-metadata", help="metadata.csv with an external_gene_name column")
    args = p.parse_args()

    a = ad.read_h5ad(args.h5ad, backed="r")
    src = a.raw if a.raw is not None else a        # raw counts when the file keeps them
    print(f"{a.n_obs:,} cells x {src.n_vars:,} genes; using {'raw counts' if a.raw is not None else 'X'}")
    names = src.var[args.gene_name_col].astype(str).to_numpy() if args.gene_name_col in src.var else src.var_names.to_numpy()

    keep_gene = np.ones(len(names), bool)
    if args.enformer_metadata:
        enformer = set(pd.read_csv(args.enformer_metadata)["external_gene_name"])
        keep_gene = np.isin(names, list(enformer))
        print(f"{keep_gene.sum():,} genes have Enformer features")

    os.makedirs(args.out, exist_ok=True)
    cell_types = args.cell_types or sorted(a.obs[args.cell_type_col].unique())
    for ct in cell_types:
        idx = np.where(a.obs[args.cell_type_col].to_numpy() == ct)[0]
        if len(idx) == 0:
            print(f"{ct}: no cells, skipped")
            continue
        X = sp.csr_matrix(src.X[idx])
        cells_ok = np.asarray((X > 0).sum(axis=1)).ravel() > args.min_features
        X, donors = X[cells_ok], a.obs[args.donor_col].to_numpy()[idx][cells_ok]
        genes_ok = keep_gene & (np.asarray((X > 0).sum(axis=0)).ravel() >= args.min_cells)

        ids = pd.unique(donors)
        # donor-by-cell indicator matrix, so (indicator @ X) sums each donor's cells
        indicator = sp.csr_matrix((np.ones(len(donors)), (pd.Categorical(donors, ids).codes, np.arange(len(donors)))),
                                  shape=(len(ids), len(donors)))
        summed = np.asarray((indicator @ X)[:, genes_ok].todense()).T
        table = pd.DataFrame(summed, columns=[str(d) for d in ids])
        table.insert(0, "gene_name", names[genes_ok])
        table = table.groupby("gene_name", as_index=False, sort=False).sum()   # merge duplicate symbols
        out = os.path.join(args.out, f"pseudobulk_{str(ct).replace(' ', '_').replace('+', '_')}.tsv")
        table.to_csv(out, sep="\t", index=False)
        print(f"{ct}: {cells_ok.sum():,} cells, {len(ids)} donors, {len(table):,} genes -> {out}")


if __name__ == "__main__":
    main()
