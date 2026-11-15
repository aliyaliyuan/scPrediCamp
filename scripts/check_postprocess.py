"""Run the lesson 7 and 8 code on the sample data outside the browser, and check bh_fdr against R."""
import os, shutil, subprocess, sys, tempfile, glob
import numpy as np, pandas as pd
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(here, "..", "public", "py"))
import postprocess_lite as pp
S = os.path.join(here, "..", "public", "sample_data")
tmp = tempfile.mkdtemp()
for f in glob.glob(os.path.join(S, "expected", "*.csv")):
    cell = os.path.basename(f).split("_", 2)[2].replace("_predixcan_output.csv", "")
    os.makedirs(os.path.join(tmp, cell + "_cell"), exist_ok=True)
    shutil.copy(f, os.path.join(tmp, cell + "_cell"))
for cell in ["Periportal_Hepatocyte", "LSEC", "Keratin"]:
    b, p, t = pp.combine(tmp, cell, log=lambda *a: None)
    print(cell, "bonferroni", len(b), "p05", len(p))
a = pp.annotate(pp.load_outputs(tmp), pd.read_csv(os.path.join(S, "mapping", "mapped_genes.txt"), sep="\t"),
                pd.read_csv(os.path.join(S, "mapping", "mapped_proteins.txt"), sep="\t"))
a["qvalue"] = pp.bh_fdr(a["pvalue"])
sig = a[a.qvalue < 0.05]
print(len(a), "rows;", len(sig), "FDR<0.05")
print(sig.groupby(["cds_name", "acting", "cis_category"], dropna=False).size())
pf = os.path.join(tmp, "p.txt"); a["pvalue"].to_csv(pf, index=False, header=False, float_format="%.17g")
r = subprocess.run(["Rscript", "-e", f'p<-scan("{pf}",quiet=TRUE); cat(format(p.adjust(p,"BH"),digits=15),sep="\\n")'],
                   capture_output=True, text=True).stdout.split()
print("max |BH - R p.adjust| =", np.abs(np.array(r, float) - a["qvalue"].to_numpy()).max())
shutil.rmtree(tmp)
