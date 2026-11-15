"""Compare the tutorial's spredixcan_lite.py with the full MetaXcan pipeline output."""
import glob, os, sys
import pandas as pd
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(here, "..", "public", "py"))
import spredixcan_lite as sp
S = os.path.join(here, "..", "public", "sample_data")
worst = 0
for exp_f in sorted(glob.glob(os.path.join(S, "expected", "*.csv"))):
    _, oid, rest = os.path.basename(exp_f).split("_", 2)
    cell = rest.replace("_predixcan_output.csv", "")
    gw = glob.glob(os.path.join(S, "gwas", f"*_{oid}_*.gz"))[0]
    m = os.path.join(S, "models", cell, "filtered_db", "predict_db_Model_training_filtered")
    got = sp.run(gw, m + ".db", m + ".txt.gz", log=lambda *a: None).set_index("gene")
    exp = pd.read_csv(exp_f).set_index("gene")
    j = exp.join(got, rsuffix="_lite", how="outer")
    dz = (j.zscore - j.zscore_lite).abs().max()
    same_n = (j.n_snps_used == j.n_snps_used_lite).all()
    worst = max(worst, dz if dz == dz else 9)
    print(f"{oid} {cell}: {len(exp)} expected, {len(got)} computed, max |dz| = {dz:.2e}, n_snps_used equal: {same_n}")
sys.exit(0 if worst < 1e-6 else 1)
