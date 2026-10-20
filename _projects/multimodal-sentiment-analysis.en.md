---
published: true
lang: "en"
translation_key: multimodal-sentiment-analysis
permalink: "/projects/multimodal-sentiment-analysis/"

title: "Text-Anchored Residual Fusion for Multimodal Sentiment Analysis"
description: "Designed TARF, a text-anchored residual fusion model that uses audio and visual evidence to reinforce or correct text-based predictions of sentiment intensity."

category: work
project_type: research
period: "2026.03—2026.07"
sort_date: "2026-07"

topics: [Multimodal learning, Affective computing]
tech_stack: [PyTorch]

translation_source: _projects/multimodal-sentiment-analysis.zh.md
translation_source_sha256: 27494a7e6204538a425924e8a14b8c2e6cfad4c8d754fc0dc5ec452fe7adfa06
---

## Research background {#background}

Multimodal sentiment analysis (MSA) combines text, audio, and visual information to predict the polarity and intensity of sentiment in an utterance. When text provides strong semantic cues, intonation, pauses, and facial behavior may support its interpretation or suggest a correction beyond the literal wording. Directly mixing modality features makes it difficult to distinguish when nonverbal information should **reinforce the textual judgment or correct its bias**, and may disrupt an otherwise reliable textual prediction.

To address this problem, I designed **TARF (Text-Anchored Residual Fusion)**, which formulates multimodal fusion as a bounded update to a textual sentiment prediction. My work covered method design, model implementation, experimental validation, and result analysis, as well as preparing the initial manuscript and visualizations.

<figure>
  <img src="{{ '/assets/img/projects/multimodal-sentiment-analysis/tarf-architecture.png' | relative_url }}" alt="TARF architecture: encoded text, audio, and visual inputs are fused in sentiment score space through a textual anchor, common reinforcement, and residual correction" width="2400" height="1302" loading="lazy" decoding="async">
  <figcaption class="caption">Figure 1. TARF architecture. The textual anchor provides a baseline prediction and update budget. Text-Conditioned Nonverbal Retrieval (TCNR) organizes common reinforcement and residual correction before fusion in score space. Dashed arrows indicate training supervision.</figcaption>
</figure>

## Main contributions {#contributions}

### Text anchoring and score-space fusion

The model predicts a baseline sentiment score and uncertainty from the textual representation, converting uncertainty into a **bounded update budget** that limits how much audio and visual information can revise the final prediction. Fusion operates directly in sentiment score space, giving the textual baseline and nonverbal updates distinct roles at the output level.

### Text-conditioned evidence retrieval and residual supervision

Using the text sequence as queries and the audio and visual sequences from the same utterance as keys and values, **cross-modal attention** retrieves nonverbal context relevant to the text. The retrieved context supports common reinforcement, while the difference between the overall nonverbal representations and that context supports residual correction. Each path estimates an update direction and gating weight, and the updates revise the textual prediction within the available budget.

Text regression and uncertainty calibration regularize the textual anchor. Lightweight diagnostic heads within the model estimate audio and visual sentiment separately, and their disagreement with the textual prediction selects training samples. Stop-gradient is applied to the predictions used for selection, and **residual-guided supervision** on the selected samples guides the residual branch to correct textual prediction errors.

### Benchmark evaluation and model behavior analysis

Experiments use **CMU-MOSI and CMU-MOSEI** with unaligned features to predict **sentiment intensity scores in [−3, 3]**, evaluated using mean absolute error (MAE), correlation, seven-class accuracy, and binary classification metrics. The main experiments report mean results over three random seeds.

Under the manuscript's evaluation settings, TARF achieves **0.694 MAE and 49.3% seven-class accuracy** on CMU-MOSI, and **0.523 MAE and 54.7% seven-class accuracy** on CMU-MOSEI. Relative to the comparison methods reported in the manuscript, its main advantages concern continuous and fine-grained sentiment intensity prediction.

Architecture, modality, and training-objective ablations examine the roles of common reinforcement, residual correction, and the update budget. Independently trained unimodal diagnostic models define conflict subsets, while loss curves, prediction cases, and confusion matrices help inspect model behavior. Conflict-subset performance and branch update magnitudes provide analysis evidence, alongside remaining issues such as confusion between neighboring intensity levels and compression of extreme scores.
