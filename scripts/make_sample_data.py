#!/usr/bin/env python3
"""Cut a small, real sample out of the full scPrediXcan inputs for the tutorial.

Keeps a handful of genes around three loci, for a few cell types and proteins:
  - trimmed PredictDB model (.db) and SNP covariance (.txt.gz) per cell type
  - the matching slice of each UKB-PPP GWAS file
  - the rows of the full-pipeline S-PrediXcan output for those genes (expected/)

Usage:  python make_sample_data.py [--out ../public/sample_data]
"""
import argparse, glob, gzip, json, os, shutil, sqlite3, subprocess
import pandas as pd

MODEL_DIR = os.environ.get("MODEL_DIR", os.path.expanduser("~/ATLAS/l-ctpred"))
GWAS_DIR = os.environ.get("GWAS_DIR", "/home/claudia/ukbio/euro_amer")
ATLAS = os.environ.get("ATLAS", os.path.expanduser("~/ATLAS"))
FULL_OUT = os.environ.get("OUT_BASE", os.path.expanduser("~/ATLAS/spredixcan/output"))

CELLS = ["Periportal_Hepatocyte", "LSEC", "Keratin"]
OIDS = ["OID30771", "OID30236"]            # A1BG, AAMDC
ANCHORS = ["A1BG", "NRBP1", "AAMDC"]       # chr19 (A1BG cis), chr2 (A1BG trans), chr11 (AAMDC cis)
GENES_PER_LOCUS = 12
DB = "filtered_db/predict_db_Model_training_filtered.db"
COV = "filtered_db/predict_db_Model_training_filtered.txt.gz"


def gene_spans(con, genes=None):
    q = "select gene, rsid from weights"
    if genes is not None:
        q += " where gene in (%s)" % ",".join("'%s'" % g for g in genes)
    w = pd.read_sql(q, con)
    sp = w.rsid.str.split("_", expand=True)
    w["chr"], w["pos"] = sp[0], sp[1].astype(int)
    return w.groupby("gene").agg(chr=("chr", "first"), lo=("pos", "min"), hi=("pos", "max")).reset_index()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "public", "sample_data"))
    out = os.path.abspath(ap.parse_args().out)

    # 1. choose genes: the ones nearest each anchor gene, using the first cell type
    con = sqlite3.connect(os.path.join(MODEL_DIR, CELLS[0], DB))
    spans = gene_spans(con).merge(pd.read_sql("select gene, genename from extra", con))
    spans["mid"] = (spans.lo + spans.hi) / 2
    genes, loci = [], []
    for a in ANCHORS:
        row = spans[spans.genename == a].iloc[0]
        near = spans[spans.chr == row.chr].assign(d=lambda d: (d.mid - row.mid).abs()).nsmallest(GENES_PER_LOCUS, "d")
        genes += near.gene.tolist()
        loci.append({"anchor": a, "chr": row.chr, "genes": near.genename.tolist()})
    con.close()
    genes = sorted(set(genes))
    print(f"{len(genes)} genes selected")

    # 2. trim each cell type's model and covariance
    regions = {}
    for cell in CELLS:
        d = os.path.join(out, "models", cell, "filtered_db")
        os.makedirs(d, exist_ok=True)
        src = sqlite3.connect(os.path.join(MODEL_DIR, cell, DB))
        dst_path = os.path.join(out, "models", cell, DB)
        if os.path.exists(dst_path):
            os.remove(dst_path)
        dst = sqlite3.connect(dst_path)
        inlist = ",".join("'%s'" % g for g in genes)
        for t in ("weights", "extra"):
            pd.read_sql(f"select * from {t} where gene in ({inlist})", src).to_sql(t, dst, index=False)
        for t in ("construction", "sample_info"):
            pd.read_sql(f"select * from {t}", src).to_sql(t, dst, index=False)
        dst.execute("create index weights_gene on weights (gene)")
        dst.commit()
        for r in gene_spans(dst).itertuples():
            lo, hi = regions.get(r.chr, (r.lo, r.hi))
            regions[r.chr] = (min(lo, r.lo), max(hi, r.hi))
        dst.execute("vacuum"); dst.close(); src.close()

        gl = os.path.join(out, "_genes.txt")
        open(gl, "w").write("\n".join(genes) + "\n")
        cov_out = os.path.join(out, "models", cell, COV)
        cmd = (f"zcat {os.path.join(MODEL_DIR, cell, COV)} | "
               f"awk 'NR==FNR{{g[$1];next}} FNR==1 || ($1 in g)' {gl} - | gzip -9 > {cov_out}")
        subprocess.run(cmd, shell=True, check=True)
        os.remove(gl)
        print(cell, "done")

    # 3. slice the GWAS files to the regions the models cover
    os.makedirs(os.path.join(out, "gwas"), exist_ok=True)
    cond = " || ".join(f'($1=="{c}" && $2>={lo} && $2<={hi})' for c, (lo, hi) in regions.items())
    gwas_files = {}
    for oid in OIDS:
        src = sorted(glob.glob(os.path.join(GWAS_DIR, f"*_{oid}_*.gz")))[0]
        name = os.path.basename(src).replace("_combined.gz", "_sample.gz")
        subprocess.run(f"zcat {src} | awk 'NR==1 || {cond}' | gzip -9 > {os.path.join(out, 'gwas', name)}",
                       shell=True, check=True)
        gwas_files[oid] = name
        print(oid, "done")

    # 4. expected results: the same genes from the full-genome pipeline run
    os.makedirs(os.path.join(out, "expected"), exist_ok=True)
    for cell in CELLS:
        for oid in OIDS:
            f = os.path.join(FULL_OUT, f"{cell}_cell", f"ukb_{oid}_{cell}_predixcan_output.csv")
            if os.path.exists(f):
                r = pd.read_csv(f)
                r[r.gene.isin(genes)].to_csv(os.path.join(out, "expected", os.path.basename(f)), index=False)

    # 5. model-building lessons: the same genes from the pseudobulk counts (per donor) and
    #    the ctPred predicted expression (per reference-panel sample), plus the end of each log
    names = set(pd.read_sql("select genename from extra",
                            sqlite3.connect(os.path.join(out, "models", CELLS[0], DB))).genename) | set(genes)
    os.makedirs(os.path.join(out, "training"), exist_ok=True)
    for cell in CELLS:
        pb = pd.read_csv(os.path.join(ATLAS, "pseudobulk", f"pseudobulk_{cell}.tsv"), sep="\t")
        pb[pb.iloc[:, 0].isin(names)].to_csv(os.path.join(out, "training", f"pseudobulk_{cell}.tsv"), sep="\t", index=False)
        ex = pd.read_csv(os.path.join(ATLAS, "exp_csv", f"{cell}_predictions.csv"))
        ex[ex.iloc[:, 0].astype(str).str.split(".").str[0].isin(names)].to_csv(
            os.path.join(out, "training", f"{cell}_predictions.csv"), index=False)
        with open(os.path.join(ATLAS, "exp_csv", f"{cell}_predictions.log"), errors="replace") as f:
            open(os.path.join(out, "training", f"{cell}_predictions.log"), "w").writelines(f.readlines()[-40:])

    json.dump({"cells": CELLS, "oids": gwas_files, "loci": loci,
               "regions": {c: list(v) for c, v in regions.items()}},
              open(os.path.join(out, "manifest.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
