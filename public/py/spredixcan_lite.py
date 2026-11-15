"""S-PrediXcan for the tutorial: the same maths as MetaXcan's SPrediXcan.py,
written out in ~60 lines of pandas so each step can be read and run in a browser.

For one gene g with model weights w_l over SNPs l:

    z_g = sum_l  w_l * (sigma_l / sigma_g) * z_l
    sigma_g^2 = w' * Gamma * w          (Gamma = SNP covariance in the reference panel)

where z_l = BETA_l / SE_l comes from the GWAS and sigma_l^2 is the diagonal of Gamma.
"""
import gzip
import math
import sqlite3

import numpy as np
import pandas as pd


def reformat_gwas(gwas_path):
    """Step 1 of 01run_predixcan.py: build SNP IDs that match the model (chr1_17641_G_A_b38)."""
    df = pd.read_csv(gwas_path, sep="\t", compression="gzip")
    df["SNP"] = (df["CHROM"].astype(str) + "_" + df["GENPOS"].astype(str) + "_"
                 + df["ALLELE0"] + "_" + df["ALLELE1"] + "_b38")
    return df


def load_model(db_path):
    con = sqlite3.connect(db_path)
    weights = pd.read_sql("select gene, rsid, weight from weights", con)
    extra = pd.read_sql('select gene, genename as gene_name, "pred.perf.R2" as pred_perf_r2, '
                        '"pred.perf.pval" as pred_perf_pval, "pred.perf.qval" as pred_perf_qval from extra', con)
    con.close()
    return weights, extra


def load_covariance(cov_path):
    with gzip.open(cov_path, "rt") as f:
        return pd.read_csv(f, sep=r"\s+")


def associate(gwas, weights, extra, cov, log=print):
    """Gene-level association for every gene in the model."""
    gwas = gwas.dropna(subset=["BETA", "SE"]).drop_duplicates("SNP").set_index("SNP")
    rows = []
    for gene, w in weights.groupby("gene", sort=False):
        c = cov[cov["GENE"] == gene]
        cov_snps = set(c["RSID1"]) | set(c["RSID2"])
        used = [s for s in w["rsid"] if s in gwas.index and s in cov_snps]
        if not used:
            continue
        idx = {s: i for i, s in enumerate(used)}
        c = c[c["RSID1"].isin(idx) & c["RSID2"].isin(idx)]
        G = np.zeros((len(used), len(used)))
        i, j = c["RSID1"].map(idx).to_numpy(), c["RSID2"].map(idx).to_numpy()
        G[i, j] = c["VALUE"].to_numpy()
        G[j, i] = c["VALUE"].to_numpy()

        wv = w.set_index("rsid").loc[used, "weight"].to_numpy()
        beta = gwas.loc[used, "BETA"].to_numpy()
        z = beta / gwas.loc[used, "SE"].to_numpy()
        sigma_l = np.sqrt(np.diag(G))
        var_g = float(wv @ G @ wv)
        if var_g <= 0:
            continue
        zscore = float(np.sum(wv * z * sigma_l) / math.sqrt(var_g))
        rows.append({
            "gene": gene,
            "zscore": zscore,
            "effect_size": float(np.sum(wv * beta * sigma_l ** 2) / var_g),
            "pvalue": math.erfc(abs(zscore) / math.sqrt(2)),
            "var_g": var_g,
            "n_snps_used": len(used),
            "n_snps_in_cov": len(cov_snps),
            "n_snps_in_model": len(w),
        })
    res = pd.DataFrame(rows).merge(extra, on="gene")
    cols = ["gene", "gene_name", "zscore", "effect_size", "pvalue", "var_g", "pred_perf_r2",
            "pred_perf_pval", "pred_perf_qval", "n_snps_used", "n_snps_in_cov", "n_snps_in_model"]
    log(f"{len(res)} genes tested")
    order = res["zscore"].abs().sort_values(ascending=False).index   # strongest first; p underflows to 0 for huge z
    return res.loc[order, cols].reset_index(drop=True)


def run(gwas_path, db_path, cov_path, log=print):
    log("Reformatting SNP IDs to chr_pos_ref_alt_b38 ...")
    gwas = reformat_gwas(gwas_path)
    log(f"  {len(gwas):,} GWAS variants")
    log("Loading model and covariance ...")
    weights, extra = load_model(db_path)
    cov = load_covariance(cov_path)
    log(f"  {weights['gene'].nunique()} genes, {len(weights):,} SNP weights")
    log("Computing gene-level associations ...")
    return associate(gwas, weights, extra, cov, log)
