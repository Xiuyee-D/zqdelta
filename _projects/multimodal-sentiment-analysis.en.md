---
published: true
lang: "en"
translation_key: multimodal-sentiment-analysis
permalink: "/projects/multimodal-sentiment-analysis/"

title: "Dual-Path Score Revision for Multimodal Sentiment Analysis"
description: "Designed DPSR, a dual-path score revision model that uses audio and visual information to reinforce or correct textual judgments and predict utterance-level sentiment intensity."

category: work
project_type: research
period: "2026.03—2026.07"
sort_date: "2026-07"

topics: [Multimodal learning, Affective computing]
tech_stack: [PyTorch]

translation_source: _projects/multimodal-sentiment-analysis.zh.md
translation_source_sha256: 828bbcbba533bad4ec745ff17855b2fb1b88750f1bbbd9bde91ed964506c933e
---

## Research background {#background}

Multimodal sentiment analysis (MSA) combines text, audio, and visual information to predict sentiment polarity and intensity in an utterance. When text provides strong semantic cues, intonation, pauses, and facial behavior may support the textual judgment or suggest a correction beyond the literal wording. Directly mixing modality features makes it difficult to distinguish whether nonverbal information should **reinforce the textual judgment or correct its bias**, and may interfere with predictions that are already reliable.

To address this problem, **DPSR (Dual Path Score Revision)** organizes multimodal fusion as bounded updates to textual sentiment predictions.

<figure>
  <img src="{{ '/assets/img/projects/multimodal-sentiment-analysis/dpsr-architecture.png' | relative_url }}" alt="DPSR architecture: text queries retrieve nonverbal contexts, context and discrepancy paths generate updates, and a shared budget scales their combination to revise the textual sentiment estimate" width="1960" height="1064" loading="lazy" decoding="async">
  <figcaption class="caption">Figure 1. DPSR architecture. The textual branch provides a starting score and revision budget. Two paths use retrieved contexts and learned difference features to generate updates, which are combined in score space to revise the textual estimate. Dashed arrows indicate training supervision.</figcaption>
</figure>

## Main work {#contributions}

### Text anchoring and score-space fusion

From the textual representation, the model predicts a starting sentiment score and learns a positive scale that controls revision magnitude. Textual prediction error regularizes this scale, which is then mapped to a **shared update budget** for the two paths. Fusion takes place directly in sentiment score space, giving the textual baseline and nonverbal updates distinct roles at the output level.

### Text-guided evidence retrieval and revision supervision

**Cross-modal attention** uses the text sequence as queries and the audio and visual sequences from the same utterance as keys and values to retrieve text-relevant nonverbal contexts. The context path combines textual representations with the retrieved contexts. The discrepancy path uses learned difference features formed by subtracting each retrieved context from its corresponding nonverbal summary. Each path estimates a signed update and a gate, and the shared budget scales their combination to revise the textual prediction.

Internal sentiment heads estimate audio and visual sentiment, and their polarity and score differences from the textual prediction select training samples for guidance. Predictions used for selection and the error reference are detached. **Magnitude and direction supervision** on selected samples encourages the discrepancy update to exceed the context update in absolute value and follow the direction indicated by the textual prediction error.

### Benchmark evaluation and model behavior analysis

Experiments use **CMU-MOSI and CMU-MOSEI** with unaligned features to predict **sentiment intensity scores in [−3, 3]**. Evaluation includes mean absolute error (MAE), correlation, seven-class accuracy, and binary classification metrics. The main experiments report mean results over three random seeds.

Under the manuscript's evaluation settings, the model achieves **0.682 MAE and 49.85% seven-class accuracy** on CMU-MOSI, and **0.523 MAE and 55.10% seven-class accuracy** on CMU-MOSEI. Relative to the compared methods, its main advantages are in continuous and fine-grained sentiment intensity prediction.

Comparisons under matched supervision and ablations of architecture, modalities, and training objectives examine the roles of the context path, discrepancy path, and shared update budget. Independently trained unimodal diagnostic models define prediction-disagreement subsets. Loss curves, individual predictions, and confusion matrices help identify confusion between adjacent intensity levels and underestimation of strongly positive sentiment.
