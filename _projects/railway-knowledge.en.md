---
published: true
lang: "en"
translation_key: railway-knowledge
permalink: "/projects/railway-knowledge/"

title: "Railway Knowledge Base Construction and Retrieval Optimization"
description: "Processed railway-domain corpora, developed a text-cleaning tool, built image-based question-answering samples, and contributed to domain embedding adaptation, hybrid retrieval, and reranking implementations."

category: work
project_type: internship
period: "2024.05—2024.08"
sort_date: "2024-08"
organization: "China Academy of Railway Sciences Corporation Limited"

topics: [Natural language processing, Large language models, Retrieval-augmented generation]
tech_stack: [PySide2, PyTorch]

translation_source: _projects/railway-knowledge.zh.md
translation_source_sha256: b0e54b3adeeb91af89087be9aeeb9d59c9a58133b3796bf6fda66eb48460a4f2
---

## Project background {#background}

Railway knowledge is distributed across books, technical literature, regulations, and internal business documents. Processing challenges include mixed text-based and scanned PDFs and complex clause structures. Dense terminology and similar clauses with different applicability conditions also make retrieval difficult. Built around a domain knowledge base and retrieval-augmented generation, the project aims to make specialist knowledge more usable and retrieve more relevant evidence for question answering.

## Main contributions {#contributions}

### Document processing and text cleaning

I designed and implemented a reusable **PDF → Markdown batch-processing workflow** for railway literature and business documents. Text is extracted directly from text-based PDFs and obtained through OCR for scans, followed by cleaning and structural organization. The knowledge-base design organizes content by chapters and clauses, retaining source documents, chapter identifiers, and relevant neighboring clauses so retrieved passages can be traced to their source and applicability conditions.

I developed a **PySide2 text-cleaning tool**, using regular expressions for general cleaning and railway-regulation-specific rules covering recurring issues such as headers and footers, irregular whitespace and line breaks, and clause numbering. Manual sampling after batch processing checks the consistency of conversion and cleaning results.

My personal processing volumes at this stage were 1,000+ specialist books, 500+ regulations, and 2,000+ papers.

### Domain embeddings and retrieval optimization

Working with the team, I helped complete domain embedding adaptation, hybrid retrieval, and reranking for railway terminology and regulation applicability. Samples are organized as **query–positive clause–negative clause** triples, using a dual encoder and contrastive learning to adapt domain representations. Clauses with similar terminology but different equipment, business conditions, or applicability scopes serve as **hard negatives**. Source checks remove genuinely relevant clauses from candidate negatives before combining the remaining examples with ordinary negatives for training.

The retrieval pipeline uses **parallel BM25 and dense-vector retrieval** to cover exact equipment identifiers and specialist terms alongside semantic matches to natural-language questions. Candidate passages are deduplicated, their ranks are combined with Reciprocal Rank Fusion (RRF), and a **Cross-Encoder** jointly encodes each query and candidate clause to score relevance and rerank results. This produces a retrieval–fusion–reranking pipeline for selecting evidence.

A staged evaluation plan was developed around these implementations, using **Recall@k for retrieval coverage and MRR/nDCG for ranking quality**, alongside completeness of clause applicability conditions. The plan defines comparisons between individual retrieval methods, hybrid retrieval, and reranking to analyze missing candidates, ranking errors, and incomplete evidence conditions.

### Railway image–text sample construction

Alongside the text knowledge base, I completed image–text resource construction for future railway visual question answering, collecting equipment, facilities, and operational-scene images, writing descriptions, and designing question–answer pairs. Samples are organized as **image, scene category, description, question, and answer**, covering equipment recognition, visible components, spatial relations, and scene descriptions.

**Visible image evidence must support each answer**. Samples retain uncertainty for occluded, blurred, or indeterminate content, with checks for image–text consistency, terminology, and answerability. Grouping rules based on shared-source or near-duplicate images were designed for future training and evaluation splits to prevent images from the same group appearing in both sets.
