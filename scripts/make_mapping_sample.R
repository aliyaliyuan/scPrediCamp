# Gene and protein coordinates for the tutorial's sample genes (lesson 8).
# Same logic as spredixcan/03mapping.R, limited to the genes in the sample models.
# Coordinates are GRCh38, the build used by the UKB-PPP Olink protein map.
# Run from tutorial/:  Rscript scripts/make_mapping_sample.R
suppressMessages({library(biomaRt); library(dplyr); library(data.table); library(DBI); library(RSQLite)})
out <- "public/sample_data/mapping"
dir.create(out, showWarnings = FALSE, recursive = TRUE)
olink_map <- Sys.getenv("OLINK_MAP", "/home/claudia/ukbio/olink_protein_map_3k_v1.tsv")
oids <- names(jsonlite::fromJSON("public/sample_data/manifest.json")$oids)

dbs <- Sys.glob("public/sample_data/models/*/filtered_db/*.db")
genes <- sort(unique(unlist(lapply(dbs, function(db) {
  con <- dbConnect(SQLite(), db); on.exit(dbDisconnect(con))
  sub("\\..*", "", dbGetQuery(con, "select gene from extra")$gene)
}))))

mart <- useEnsembl(biomart = "genes", dataset = "hsapiens_gene_ensembl")
res <- getBM(attributes = c("ensembl_gene_id", "chromosome_name", "transcription_start_site",
                            "transcript_start", "transcript_end", "external_gene_name"),
             filters = c("ensembl_gene_id", "transcript_gencode_basic"), values = list(genes, TRUE), mart = mart)
res <- res[grepl("^[0-9XY]+$", res$chromosome_name), ]
res$transcription_start_site <- res$transcript_start
mapped <- res %>% mutate(len = transcript_end - transcript_start) %>%
  group_by(ensembl_gene_id) %>% slice_max(len, n = 1, with_ties = FALSE) %>% ungroup() %>%
  select(ensembl_gene_id, chromosome_name, transcription_start_site, transcript_end, external_gene_name) %>%
  arrange(as.integer(chromosome_name), transcription_start_site)
write.table(mapped, file.path(out, "mapped_genes.txt"), quote = FALSE, row.names = FALSE, sep = "\t")

prot <- fread(olink_map) %>% filter(OlinkID %in% oids) %>%
  select(OlinkID, UniProt, Assay, ensembl_id, chr, gene_start, gene_end)
write.table(prot, file.path(out, "mapped_proteins.txt"), quote = FALSE, row.names = FALSE, sep = "\t")
cat(nrow(mapped), "of", length(genes), "genes mapped;", nrow(prot), "proteins\n")
