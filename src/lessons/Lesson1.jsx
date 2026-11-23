import Quiz from '../Quiz.jsx'
import { ATLAS_URL } from '../lessons.js'

// Both articles are open access under CC BY 4.0, so local copies ship with the site.
const PAPER = { pdf: 'papers/Zhou2025_scPrediXcan_CellGenomics.pdf', doi: 'https://doi.org/10.1016/j.xgen.2025.100875' }
const PROTOCOL = { pdf: 'papers/Zhou2026_scPrediXcan_STARProtocols.pdf', doi: 'https://doi.org/10.1016/j.xpro.2025.104306' }

const Cite = ({ n }) => <a className="cite" href={`#ref-${n}`} onClick={(e) => { e.preventDefault(); document.getElementById(`ref-${n}`)?.scrollIntoView({ behavior: 'smooth' }) }}>[{n}]</a>

/* ---------- Figure 1: the pipeline ---------- */
const STEPS = [
  { k: 'Prep', t: 'Pseudobulk + features', d: 'Sum single-cell counts per donor and cell type. Pair each gene with its 5,313 Enformer features.', l: 'Lessons 2 and 3' },
  { k: 'Step 1', t: 'Train ctPred', d: 'A small neural network learns to predict a gene’s expression level in one cell type from its epigenomic features.', l: 'Lesson 4' },
  { k: 'Step 2', t: 'Linearize to ℓ-ctPred', d: 'Predict expression for 448 genotyped people, then fit SNP weights with elastic net (PredictDB).', l: 'Lesson 5' },
  { k: 'Step 3', t: 'S-PrediXcan', d: 'Combine the SNP weights with GWAS summary statistics to test each gene against the trait.', l: 'Lessons 6 to 9' },
]
function PipelineFigure() {
  return (
    <figure className="fig">
      <ol className="flow">
        {STEPS.map((s) => (
          <li key={s.k} className="flow-step">
            <span className="flow-k">{s.k}</span>
            <strong>{s.t}</strong>
            <span>{s.d}</span>
            <span className="flow-l">{s.l}</span>
          </li>
        ))}
      </ol>
      <figcaption>Figure 1. The three steps of scPrediXcan, plus the data preparation before them, and where each is covered in this course. Redrawn from Zhou et al. 2025, Figure 1 <Cite n={1} />, and the protocol workflow <Cite n={2} />.</figcaption>
    </figure>
  )
}

/* ---------- Figure 2: from DNA to a ctPred prediction ---------- */
function BinStrip() {
  // 896 Enformer bins drawn as 56 cells; the centre four bins (447 to 450) are a sliver in the middle.
  const cells = 56
  return (
    <svg className="bins" viewBox="0 0 280 28" role="img" aria-label="896 bins of 128 base pairs; only the four bins at the centre, around the transcription start site, are kept">
      {Array.from({ length: cells }, (_, i) => (
        <rect key={i} x={i * 5} y="4" width="4" height="20" rx="1" fill="var(--line)" />
      ))}
      <rect x="138" y="0" width="4" height="28" rx="1" fill="var(--cyan)" />
    </svg>
  )
}
function EnformerFigure() {
  return (
    <figure className="fig">
      <ol className="chain">
        <li><b>196,608 bp</b><span>of DNA centred on the gene’s transcription start site</span></li>
        <li><b>Enformer</b><span>pre-trained sequence-to-epigenome model <Cite n={3} /></span></li>
        <li><b>896 × 5,313</b><span>bins of 128 bp × tracks (TF binding, histone marks, DNase/ATAC, CAGE)</span><BinStrip /></li>
        <li><b>1 × 5,313</b><span>average of the 4 centre bins, around the start site</span></li>
        <li><b>ctPred</b><span>5,313 → 64 → 64 → 64 → 1, ReLU and dropout, about 0.4 M parameters</span></li>
        <li><b>percentile</b><span>predicted expression rank of the gene in this cell type, 0 to 1</span></li>
      </ol>
      <figcaption>Figure 2. How one gene becomes one ctPred input and output. Numbers from the STAR Methods of Zhou et al. 2025 <Cite n={1} />.</figcaption>
    </figure>
  )
}

/* ---------- Figure 3: accuracy range per dataset ---------- */
const ACC = [
  { d: 'OneK1K blood', n: '29 cell types', lo: 0.836, hi: 0.892, loL: 'erythrocytes', hiL: 'CD4+ α-β T cells' },
  { d: 'Tabula Sapiens', n: '6 shown', lo: 0.823, hi: 0.885, loL: 'mesenchymal stem cells', hiL: 'B cells' },
  { d: 'T2D islets', n: '11 cell types', lo: 0.753, hi: 0.815, loL: 'epsilon cells', hiL: 'activated stellate cells' },
]
const AX = [0.7, 0.8, 0.9, 1.0]
const pos = (v) => `${((v - 0.7) / 0.3) * 100}%`
function AccuracyFigure() {
  return (
    <figure className="fig">
      <div className="chart" role="img" aria-label="Range of ctPred test-set correlations by dataset: OneK1K 0.836 to 0.892, Tabula Sapiens 0.823 to 0.885, T2D islets 0.753 to 0.815">
        {ACC.map((a) => (
          <div className="crow" key={a.d} title={`${a.d}: r = ${a.lo} (${a.loL}) to ${a.hi} (${a.hiL})`}>
            <span className="clab">{a.d}<small>{a.n}</small></span>
            <span className="ctrack">
              {AX.map((t) => <i key={t} className="grid" style={{ left: pos(t) }} />)}
              <span className="range" style={{ left: pos(a.lo), width: `calc(${pos(a.hi)} - ${pos(a.lo)})` }} />
            </span>
            <span className="cval">{a.lo.toFixed(2)}–{a.hi.toFixed(2)}</span>
          </div>
        ))}
        <div className="crow axis" aria-hidden="true">
          <span />
          <span className="ctrack">{AX.map((t) => <i key={t} className="tick" style={{ left: pos(t) }}>{t.toFixed(1)}</i>)}</span>
          <span />
        </div>
      </div>
      <figcaption>Figure 3. Pearson correlation between ctPred-predicted and observed expression percentiles across held-out genes. Each bar spans the worst to the best cell type in that dataset. Hover a bar for the cell types. Values from Zhou et al. 2025, Figure 2C <Cite n={1} />.</figcaption>
    </figure>
  )
}

/* ---------- Figure 4: candidate genes found ---------- */
const HITS = {
  'Type 2 diabetes': [
    { m: 'scPrediXcan', v: 222, b: 108, c: 'β cells' },
    { m: 'TWAS-bulk', v: 111, b: 64, c: 'GTEx pancreas' },
    { m: 'TWAS-pseudobulk', v: 12, b: 11, c: 'β cells' },
  ],
  'Lupus (SLE)': [
    { m: 'scPrediXcan', v: 129, b: 24, c: 'immune cell types' },
    { m: 'TWAS-bulk', v: 54, b: 14, c: 'GTEx whole blood' },
    { m: 'TWAS-pseudobulk', v: 11, b: 8, c: 'immune cell types' },
  ],
}
function HitsFigure() {
  return (
    <figure className="fig">
      <div className="panels">
        {Object.entries(HITS).map(([trait, rows]) => {
          const max = Math.max(...rows.map((r) => r.v))
          return (
            <div key={trait} className="chart" role="img" aria-label={`${trait}: ${rows.map((r) => `${r.m} ${r.v} genes`).join(', ')}`}>
              <h3 className="ctitle">{trait}</h3>
              {rows.map((r) => (
                <div className="crow" key={r.m} title={`${r.m} (${r.c}): ${r.v} genes across ${r.b} LD blocks`}>
                  <span className="clab">{r.m}</span>
                  <span className="ctrack"><span className={`hbar${r.m === 'scPrediXcan' ? ' me' : ''}`} style={{ width: `${(r.v / max) * 100}%` }} /></span>
                  <span className="cval">{r.v}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
      <details className="tableview">
        <summary>Show as a table</summary>
        <table>
          <thead><tr><th className="text">Trait</th><th className="text">Method</th><th className="text">Expression data</th><th>Candidate genes</th><th>LD blocks</th></tr></thead>
          <tbody>
            {Object.entries(HITS).flatMap(([trait, rows]) => rows.map((r) => (
              <tr key={trait + r.m}><td className="text">{trait}</td><td className="text">{r.m}</td><td className="text">{r.c}</td><td>{r.v}</td><td>{r.b}</td></tr>
            )))}
          </tbody>
        </table>
      </details>
      <figcaption>Figure 4. Candidate causal genes (Bonferroni significant) found by each framework. TWAS-pseudobulk uses the same single-cell data as scPrediXcan but fits SNP models directly to observed expression; TWAS-bulk uses GTEx tissue models. Values from Zhou et al. 2025, Results <Cite n={1} />.</figcaption>
    </figure>
  )
}

/* ---------- Quiz ---------- */
const QUESTIONS = [
  {
    q: 'Why does ctPred learn from Enformer’s epigenomic features instead of learning directly from single-cell expression?',
    options: [
      'Single-cell data are too sparse, and cover too few people, to learn regulatory grammar from scratch',
      'Enformer measures expression in each cell type directly',
      'Single-cell data have no gene names',
      'Enformer replaces the need for any expression data',
    ],
    answer: 0,
    why: 'Enformer has already learned how DNA sequence drives regulatory activity, so ctPred only needs to map those 5,313 features to expression in one cell type.',
  },
  {
    q: 'What is ctPred trained to predict for each gene?',
    options: [
      'The SNP weights for the gene',
      'The gene’s mean pseudobulk expression across donors, as a percentile among all genes in that cell type',
      'Each donor’s raw UMI count',
      'The GWAS p-value of the gene',
    ],
    answer: 1,
    why: 'Counts are averaged across donors, ranked across genes and turned into percentiles from 0 to 1. Percentiles stabilise training because raw counts are very skewed.',
  },
  {
    q: 'Why is ctPred turned into a linear SNP model (ℓ-ctPred) before the association test?',
    options: [
      'Linear models are always more accurate than neural networks',
      'Enformer cannot read genotype files',
      'S-PrediXcan needs linear SNP weights, and running Enformer and ctPred on a whole GWAS cohort would take thousands of GPU-hours and individual-level data',
      'To remove cell-type specificity',
    ],
    answer: 2,
    why: 'The authors estimate about 2,700 GPU-hours for 500 people × 20,000 genes. SNP weights let anyone test genes using only summary statistics.',
  },
  {
    q: 'Which inputs does the S-PrediXcan step need?',
    options: [
      'Individual genotypes and phenotypes from every GWAS participant',
      'The single-cell count matrix',
      'GWAS summary statistics, the ℓ-ctPred weight database (.db) and its SNP covariance file',
      'The trained ctPred .pt file',
    ],
    answer: 2,
    why: 'z_g = Σ w_l (σ_l / σ_g) z_l uses only SNP weights, SNP variances from the covariance file, and GWAS z-scores. You will run this in lesson 6.',
  },
  {
    q: 'According to the authors, how should you read the sign of a scPrediXcan z-score?',
    options: [
      'Positive always means higher expression raises the trait',
      'With caution: Enformer-based predictions can correlate negatively with observed expression, so the papers rely on p-values rather than direction',
      'The sign is always negative for causal genes',
      'The sign shows whether the effect is cis or trans',
    ],
    answer: 1,
    why: 'This is a stated limitation in both the paper and the protocol: direction of effect is not yet reliable, which matters for drug-target work.',
  },
]

/* ---------- References ---------- */
const REFS = [
  { n: 1, text: 'Zhou Y, Adeluwa T, Zhu L, Salazar-Magaña S, Sumner S, Kim H, Gona S, Nyasimi F, Kulkarni R, Powell JE, Madduri R, Liu B, Chen M, Im HK. (2025). scPrediXcan integrates deep learning methods and single-cell data into a cell-type-specific transcriptome-wide association study framework. Cell Genomics 5, 100875.', doi: PAPER.doi, pdf: PAPER.pdf },
  { n: 2, text: 'Zhou Y, Sumner S, Adeluwa T, Zhu L, Salazar-Magaña S, Kim H, Gona S, Nyasimi F, Kulkarni R, Powell J, Madduri R, Liu B, Chen M, Im HK. (2026). Protocol to perform cell-type-specific transcriptome-wide association study using scPrediXcan framework. STAR Protocols 7, 104306.', doi: PROTOCOL.doi, pdf: PROTOCOL.pdf },
  { n: 3, text: 'Avsec Ž, Agarwal V, Visentin D, Ledsam JR, Grabska-Barwinska A, Taylor KR, Assael Y, Jumper J, Kohli P, Kelley DR. (2021). Effective gene expression prediction from sequence by integrating long-range interactions. Nature Methods 18, 1196–1203.', doi: 'https://doi.org/10.1038/s41592-021-01252-x' },
  { n: 4, text: 'Gamazon ER, Wheeler HE, Shah KP, et al.; GTEx Consortium; Nicolae DL, Cox NJ, Im HK. (2015). A gene-based association method for mapping traits using reference transcriptome data. Nature Genetics 47, 1091–1098.', doi: 'https://doi.org/10.1038/ng.3367' },
  { n: 5, text: 'Barbeira AN, Dickinson SP, Bonazzola R, et al. (2018). Exploring the phenotypic consequences of tissue specific gene expression variation inferred from GWAS summary statistics. Nature Communications 9, 1825.', doi: 'https://doi.org/10.1038/s41467-018-03621-1' },
  { n: 6, text: 'Lappalainen T, Sammeth M, Friedländer MR, et al. (2013). Transcriptome and genome sequencing uncovers functional variation in humans. Nature 501, 506–511.', doi: 'https://doi.org/10.1038/nature12531' },
  { n: 7, text: 'Sun BB, Chiou J, Traylor M, et al. (2023). Plasma proteomic associations with genetics and health in the UK Biobank. Nature 622, 329–338.', doi: 'https://doi.org/10.1038/s41586-023-06592-6' },
]

export default function Lesson1({ lesson, onComplete }) {
  return (
    <main className="wrap lesson">
      <p className="crumbs">Part {lesson.part} · Lesson {lesson.n} of 9</p>
      <article className="article">
        <header className="article-head">
          <h1>{lesson.title}</h1>
          <p className="lead">
            A summary of the scPrediXcan paper <Cite n={1} /> and its step-by-step protocol <Cite n={2} />,
            the two papers this pipeline is built on. About 10 minutes, then a 5-question quiz.
          </p>
          <div className="papers">
            <div className="paper">
              <span className="soon">Research article · Cell Genomics, 2025</span>
              <strong>scPrediXcan integrates deep learning methods and single-cell data into a cell-type-specific TWAS framework</strong>
              <span className="paper-links"><a href={PAPER.pdf} target="_blank" rel="noreferrer">Read the PDF</a><a href={PAPER.doi} target="_blank" rel="noreferrer">DOI</a></span>
            </div>
            <div className="paper">
              <span className="soon">Protocol · STAR Protocols, 2026</span>
              <strong>Protocol to perform cell-type-specific TWAS using the scPrediXcan framework</strong>
              <span className="paper-links"><a href={PROTOCOL.pdf} target="_blank" rel="noreferrer">Read the PDF</a><a href={PROTOCOL.doi} target="_blank" rel="noreferrer">DOI</a></span>
            </div>
          </div>
        </header>

        <section>
          <h2>The problem</h2>
          <p>
            A genome-wide association study (GWAS) finds DNA variants linked to a trait, but most of them sit
            outside genes and do not say which gene they act through. A transcriptome-wide association study
            (TWAS) bridges that gap: it predicts each person’s gene expression from their genotype, then tests
            whether predicted expression is associated with the trait. PrediXcan <Cite n={4} /> and its
            summary-statistics version S-PrediXcan <Cite n={5} /> are standard ways to do this.
          </p>
          <p>
            Classic TWAS models are trained on bulk tissue from at least about 100 people, such as GTEx. Disease
            often acts in one cell type, which bulk tissue averages away. Single-cell RNA-seq resolves cell
            types, but it is sparse and rarely available for hundreds of genotyped people. When the authors fitted
            classic SNP models to single-cell pseudobulk directly (“PEN”), the models converged for only about
            3.5% of expressed genes.
          </p>
        </section>

        <section>
          <h2>The idea</h2>
          <p>
            Instead of learning how DNA controls expression from scratch, scPrediXcan borrows that knowledge
            from <strong>Enformer</strong> <Cite n={3} />, a deep learning model trained on the reference genome to
            predict 5,313 epigenomic tracks from DNA sequence. A small network, <strong>ctPred</strong>, then
            learns only the last step: from those features to expression in one cell type. Because it learns
            across genes rather than across people, it can be trained from pseudobulk averaged over donors.
          </p>
          <PipelineFigure />
        </section>

        <section>
          <h2>Step 1. ctPred: features to cell-type expression</h2>
          <p>
            For each gene, Enformer reads 196,608 bp of DNA centred on the transcription start site. The
            four centre bins are averaged into one vector of 5,313 features. The training target is the gene’s
            mean pseudobulk count across donors, ranked among all genes and turned into a percentile. Genes are
            split into training, validation and test sets by chromosome, so overlapping DNA cannot leak between
            sets. Each cell type gets its own model, which trains in 5 to 8 minutes without a GPU <Cite n={2} />.
          </p>
          <EnformerFigure />
          <p>
            On held-out chromosomes, ctPred’s predictions correlated with observed expression at r = 0.75 to 0.89
            across 46 cell types in three datasets. It also outperformed emb2cell, a model about 150 times larger
            (r = 0.787 vs 0.666 in CD4+ T cells). Accuracy rose with the number of cells per cell type; the
            smallest cell type used had 125 cells.
          </p>
          <AccuracyFigure />
        </section>

        <section>
          <h2>Step 2. ℓ-ctPred: a linear version for GWAS</h2>
          <p>
            S-PrediXcan needs a linear model: one weight per SNP. Running Enformer and ctPred for every person in
            a GWAS would also be impractical (about 2,700 GPU-hours for 500 people and 20,000 genes), and
            individual-level GWAS data are often unavailable. So the authors run Enformer and ctPred on the
            personal genomes of a few hundred reference people, creating an <em>in silico</em> expression panel,
            and fit elastic-net SNP weights to it with the PredictDB pipeline. The result, <strong>ℓ-ctPred</strong>,
            is stored as an SQLite <code>.db</code> file plus a SNP covariance file.
          </p>
          <div className="stats">
            <div className="stat"><b>16,892</b><span>genes with a working ℓ-ctPred model in memory B cells, from 462 genotypes alone</span></div>
            <div className="stat"><b>340</b><span>genes for a classic SNP model fitted to observed single-cell data from 800 people</span></div>
            <div className="stat"><b>&gt; 0.83</b><span>median Spearman correlation between ℓ-ctPred and ctPred, in every cell type tested</span></div>
          </div>
          <p>
            The in silico panel holds only the genetic part of expression, without environmental and
            measurement noise. That is why many more genes converge than with observed single-cell data.
          </p>
        </section>

        <section>
          <h2>Step 3. S-PrediXcan: test genes against the trait</h2>
          <p>
            For each gene <i>g</i>, S-PrediXcan combines the ℓ-ctPred weights <i>w</i> with the GWAS z-scores of
            the same SNPs:
          </p>
          <p className="formula">z<sub>g</sub> = Σ<sub>l</sub> w<sub>l</sub> (σ<sub>l</sub> / σ<sub>g</sub>) z<sub>l</sub></p>
          <p>
            Here σ<sub>l</sub> is the SNP’s standard deviation and σ<sub>g</sub> the predicted gene’s,
            both computed from the covariance file. Only summary statistics are needed. The GWAS must report
            effect sizes as betas, not odds ratios, and use the same genome build (GRCh38) as the model <Cite n={2} />.
          </p>
          <p>
            Applied to type 2 diabetes and lupus, scPrediXcan found more candidate genes across more
            independent loci than either classic approach. In T2D it had the second-highest recall (0.439) of
            eight gene-prioritization methods for known T2D genes. It also surfaced genes significant in only
            one cell type, such as <i>LPL</i> in quiescent stellate cells and <i>CFB</i> in T cells.
          </p>
          <HitsFigure />
        </section>

        <section>
          <h2>Limitations to keep in mind</h2>
          <ul className="steps">
            <li><strong>Direction of effect.</strong> Enformer-based predictions can correlate negatively with real expression, so the papers rely on p-values; treat the sign of a z-score with caution.</li>
            <li><strong>Promoter-centred.</strong> Enformer mostly captures promoter signals and misses many distal, cell-type-specific enhancers.</li>
            <li><strong>Cis only.</strong> Models use nearby SNPs. Linkage disequilibrium can make neighbouring genes look significant together.</li>
            <li><strong>Ancestry.</strong> Reference panels and GWAS are mostly European; ancestry-matched retraining is recommended.</li>
            <li><strong>Unexpressed genes.</strong> ctPred can give a prediction for a gene the cell type does not express. Filter these before reporting.</li>
          </ul>
        </section>

        <section>
          <h2>How this course applies it</h2>
          <p>
            This tutorial follows the protocol with liver data and plasma proteins as the traits:
          </p>
          <dl className="io">
            <dt>Single-cell data</dt><dd>The <a href={ATLAS_URL} target="_blank" rel="noreferrer">Human Liver Cell Atlas</a> on CELLxGENE, pseudobulked per donor (lesson 2)</dd>
            <dt>Features</dt><dd>Enformer features for the reference genome and for each person (lesson 3)</dd>
            <dt>Models</dt><dd>ctPred and ℓ-ctPred for 9 liver cell types, linearized with 448 Geuvadis genotypes <Cite n={6} /> (lessons 4 and 5)</dd>
            <dt>Traits</dt><dd>UK Biobank Pharma Proteomics Project GWAS of 2,896 plasma proteins <Cite n={7} /> (lessons 6 to 9)</dd>
          </dl>
          <p>
            Because each trait is a protein encoded by a known gene, lesson 8 adds a step the papers do not:
            labelling each gene–protein association as <em>cis</em> (the gene sits near the protein’s own gene) or <em>trans</em>.
          </p>
        </section>

        <Quiz questions={QUESTIONS} onComplete={onComplete} />

        <section className="refs">
          <h2>References</h2>
          <ol>
            {REFS.map((r) => (
              <li key={r.n} id={`ref-${r.n}`}>
                {r.text}{' '}<a href={r.doi} target="_blank" rel="noreferrer">{r.doi.replace('https://', '')}</a>
                {r.pdf && <>{' · '}<a href={r.pdf} target="_blank" rel="noreferrer">PDF</a></>}
              </li>
            ))}
          </ol>
          <p className="fine">
            Figures on this page are redrawn from the numbers reported in [1] and [2]. Both articles are open
            access under CC BY 4.0, and copies are included with this tutorial.
          </p>
        </section>
      </article>
      <div className="nav">
        <a className="pill ghost small" href="#course">Back to all lessons</a>
        <a className="pill small" href="#lesson-2">Next: Lesson 2</a>
      </div>
    </main>
  )
}
