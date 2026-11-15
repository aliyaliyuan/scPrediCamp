"""Model-building steps for the tutorial, sized for a browser.

pseudobulk()        <- scripts/pseudobulk_from_h5ad.py (or preprocess.R for Seurat objects)
read_h5_features()  how the Geuvadis Enformer .h5 files are read
ctpred_input()      <- ctPred/ctPred_preprocess.py
"""
import numpy as np
import pandas as pd


def pseudobulk(cells, genes, donor="donor_id", min_features=200, min_cells=3, log=print):
    """Sum each gene's counts over all of a donor's cells.

    cells: one row per cell, with metadata columns and one count column per gene.
    Returns one row per gene and one column per donor.
    """
    kept = cells[cells["nFeature_RNA"] > min_features]
    log(f"cells kept (more than {min_features} genes detected): {len(kept)} of {len(cells)}")
    genes = [g for g in genes if (kept[g] > 0).sum() >= min_cells]
    log(f"genes kept (detected in at least {min_cells} cells): {len(genes)}")
    table = kept.groupby(donor, observed=True)[genes].sum().T
    table.index.name = "gene_name"
    return table.reset_index()


def read_h5_features(path):
    """Enformer features for one individual: one row per gene region, 5,313 feature columns.

    Each region is stored as a 4 x 5313 block. The pipeline averages the 4 rows to get
    one value per feature.
    """
    import h5py
    with h5py.File(path, "r") as f:
        data = {key.replace("_predictions", ""): f[key][:].mean(axis=0) for key in f}
    return pd.DataFrame.from_dict(data, orient="index").add_prefix("feature_")


def ctpred_input(features, pseudobulk_table):
    """The table ctPred trains on: each gene's Enformer features plus its expression percentile.

    features: gene_name, chromo, then one column per feature (0 ... 5312)
    pseudobulk_table: gene_name, then one column per donor
    """
    donors = [c for c in pseudobulk_table.columns if c != "gene_name"]
    mean = pseudobulk_table.assign(mean_expression=pseudobulk_table[donors].mean(axis=1))[["gene_name", "mean_expression"]]
    merged = features.merge(mean, on="gene_name", how="left")
    rank = merged["mean_expression"].rank(method="average")
    n = len(merged)
    merged["percentile"] = (rank - 1) / (n - 1) * 100 if n > 1 else 0
    merged = merged.drop(columns="mean_expression")
    merged = merged.rename(columns={c: f"feature_{c}" for c in merged.columns if str(c).isdigit()})
    feats = sorted((c for c in merged.columns if c.startswith("feature_")), key=lambda c: int(c.split("_")[1]))
    return merged[["gene_name", "chromo"] + feats + ["percentile"]]
