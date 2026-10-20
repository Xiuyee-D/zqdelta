---
published: true
lang: "en"
translation_key: railway-accident-graph
permalink: "/projects/railway-accident-graph/"

title: "Entity Recognition and Relation Extraction for Railway Maintenance Texts"
description: "Developed domain entity recognition and relation extraction for railway maintenance texts, and collaborated on text classification to support equipment information linking and multi-source data fusion."

category: work
project_type: research
period: "2024.11—2025.01"
sort_date: "2025-01"
organization: "China State Railway Group Co., Ltd."

topics: [Natural language processing, Named entity recognition, Relation extraction]
tech_stack: [PyTorch, Prompt Engineering]

translation_source: _projects/railway-maintenance-text.zh.md
translation_source_sha256: 73d461e04908f6fd9ded6c6f7d8a703215f104c65141b3bdd2068fdff5a1f463
---

## Research background {#background}

In railway technical renovation and major overhaul projects, maintenance texts describe equipment, abnormal conditions, and remedial measures in unstructured language. Entity expressions and business relations depend on context, making direct association with equipment registers difficult. This research uses **entity recognition and relation extraction** to organize business elements, with text classification supplying record-level labels for cross-source information linking.

The work forms part of China State Railway Group Co., Ltd.'s major research project on railway data capability enhancement and representative data-fusion analysis applications.

## Main contributions {#contributions}

### Domain entity recognition and relation extraction

I was primarily responsible for **designing and implementing entity recognition and relation extraction**. To address varied terminology and entity-boundary detection, RoBERTa encodes the text, BIOES structures sequence labels, a CRF models label transitions, and Viterbi decoding determines entity types and boundaries. Original text positions are retained to provide candidate elements for relation extraction.

**Candidate entities, relation-type definitions, and source context** are organized into prompts that request JSON-formatted head–relation–tail triples with supporting text spans. **Output parsing, entity/relation type validation, and source-evidence checks** address ambiguous terms and relations. When the text does not support an extraction, the output remains empty, keeping structured links traceable to the original description.

Related entity recognition patent: A Named Entity Recognition Method for High-Speed Railway Technical Renovation and Major Overhaul Project Texts (publication number: **CN121189315A**).
{: #patent}

### Stacking-BERT text classification

In collaboration with project members, I worked on Stacking-BERT ensemble classification, using **BERT, RoBERTa, and MacBERT** as base learners. Their class probabilities are concatenated as fusion features, and a **Logistic Regression meta-learner** predicts record categories, helping organize maintenance texts with varied category expressions and closely related classes.

Out-of-fold predictions from K-fold cross-validation form the meta-learner's training data, reducing the leakage risk of using base-learner predictions on their own training samples. Classification labels connect to entity and relation results at the record level, providing category information for subsequent data fusion.
