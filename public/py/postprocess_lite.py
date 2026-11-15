"""Post-processing for the tutorial, ported from the pipeline's R scripts.

combine()   <- spredixcan/02format_output.R   merge one cell type's outputs, filter by p-value
annotate()  <- spredixcan/03mapping.R         add gene/protein positions, label cis and trans
bh_fdr()    Benjamini-Hochberg FDR (03mapping.R uses Storey q-values from the R qvalue package;
            BH is the simpler, slightly stricter relative)
"""
import glob
import os
import re

import numpy as np
import pandas as pd

KEEP = ["gene", "gene_name", "zscore", "effect_size", "pvalue", "var_g", "pred_perf_r2",
        "pred_perf_pval", "pred_perf_qval", "n_snps_used", "n_snps_in_cov", "n_snps_in_model"]
OUT = ["gene", "gene_name", "olink_id", "gwas_pop", "db_pop", "cell_type"] + KEEP[2:]


def _oid(path):
    return re.search(r"OID\d+(\.\d+)?", os.path.basename(path)).group(0)


def combine(out_base, cell_type, gwas_pop="EUR", db_pop="EUR", log=print):
    """Merge every S-PrediXcan output of one cell type.

    Returns (bonferroni, p05, thresholds): genes passing each file's own Bonferroni
    threshold (0.05 / genes tested in that file), genes with p < 0.05, and the thresholds.
    """
    files = sorted(glob.glob(os.path.join(out_base, f"{cell_type}_cell", "*.csv")))
    log(f"Number of files found: {len(files)}\n")
    if not files:
        raise FileNotFoundError(f"no output files found for {cell_type}")
    bonf, p05, thresholds = [], [], []
    for f in files:
        df = pd.read_csv(f)
        threshold = 0.05 / len(df)
        log(f"Processing: {os.path.basename(f)[:-4]}")
        log(f"  Genes: {len(df)} | Threshold: {threshold:.3e}\n")
        thresholds.append({"OLINK_ID": _oid(f), "GWAS_POP": gwas_pop, "DB_POP": db_pop,
                           "CELL_TYPE": cell_type, "N_GENES": len(df), "THRESHOLD": threshold})
        base = df[KEEP].assign(olink_id=_oid(f), gwas_pop=gwas_pop, db_pop=db_pop, cell_type=cell_type)[OUT]
        bonf.append(base[base["pvalue"] < threshold])
        p05.append(base[base["pvalue"] < 0.05])
    bonf, p05 = pd.concat(bonf, ignore_index=True), pd.concat(p05, ignore_index=True)
    log("========== SUMMARY ==========")
    log(f"Total files processed: {len(files)}")
    log(f"Bonferroni significant genes: {len(bonf)}")
    log(f"P < 0.05 genes: {len(p05)}")
    return bonf, p05, pd.DataFrame(thresholds)


def load_outputs(out_base):
    """Every *_predixcan_output.csv under out_base/<cell>_cell/, stacked into one table."""
    parts = []
    for f in sorted(glob.glob(os.path.join(out_base, "*_cell", "*_predixcan_output.csv"))):
        cell = os.path.basename(os.path.dirname(f))[: -len("_cell")]
        df = pd.read_csv(f)
        parts.append(df.assign(olink_id=_oid(f), cell_type=cell,
                               ensembl_gene_id=df["gene"].str.replace(r"\..*", "", regex=True)))
    return pd.concat(parts, ignore_index=True)


def annotate(results, mapped_genes, mapped_proteins, window=1_000_000):
    """Label each gene-protein association.

    cis   = the gene starts within `window` bases of the gene that encodes the protein
            ("same" if it is that gene, "different" if it is a neighbour)
    trans = anything else
    """
    genes = mapped_genes.rename(columns={"chromosome_name": "gene_chr", "transcription_start_site": "gene_tss",
                                         "transcript_end": "gene_stop"})[["ensembl_gene_id", "gene_chr", "gene_tss", "gene_stop"]]
    prot = mapped_proteins.rename(columns={"OlinkID": "olink_id", "UniProt": "uniprot", "Assay": "cds_name",
                                           "chr": "protein_chr", "gene_start": "protein_tss", "gene_end": "protein_stop"})
    t = results.merge(genes, on="ensembl_gene_id", how="left").merge(
        prot[["olink_id", "uniprot", "cds_name", "protein_chr", "protein_tss", "protein_stop"]], on="olink_id", how="left")
    cis = (t["gene_chr"].astype(str) == t["protein_chr"].astype(str)) & ((t["gene_tss"] - t["protein_tss"]).abs() <= window)
    t["acting"] = np.where(cis, "cis", "trans")
    t["cis_category"] = np.where(~cis, None, np.where(t["gene_name"] == t["cds_name"], "same", "different"))
    return t[["olink_id", "uniprot", "ensembl_gene_id", "gene_name", "cds_name", "gene_chr", "protein_chr", "gene_tss",
              "protein_tss", "zscore", "effect_size", "pvalue", "cell_type", "acting", "cis_category"]].rename(
        columns={"ensembl_gene_id": "ensembl_id"})


def bh_fdr(pvalues):
    """Benjamini-Hochberg adjusted p-values (same as R's p.adjust(method="BH"))."""
    p = np.asarray(pvalues, dtype=float)
    q = np.full(p.shape, np.nan)
    ok = ~np.isnan(p)
    order = np.argsort(p[ok])
    ranked = p[ok][order] * ok.sum() / np.arange(1, ok.sum() + 1)
    adj = np.minimum.accumulate(ranked[::-1])[::-1].clip(max=1)
    out = np.empty(ok.sum()); out[order] = adj
    q[ok] = out
    return q
