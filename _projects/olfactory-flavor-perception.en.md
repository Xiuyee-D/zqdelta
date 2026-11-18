---
published: true
lang: "en"
translation_key: olfactory-flavor-perception
permalink: "/projects/olfactory-flavor-perception/"

title: "Design of an Olfactory Stimulation and Synchronized Acquisition System and Its Application to Food Aroma Perception"
description: "Jointly implemented an olfactory stimulator, independently developed experiment control software, and collected physiological signals, including EEG and ECG, alongside sensory ratings with the research team to study links between physiological signals and food aroma perception."

category: work
project_type: research
period: "2025.09—present"
status: ongoing
organization: "School of Food and Health, Beijing Technology and Business University"

topics: [Multimodal learning, Food sensory science, Physiological signal processing]
tech_stack: [PySide6, NI-DAQmx, pyserial, PyTorch]

translation_source: _projects/olfactory-flavor-perception.zh.md
translation_source_sha256: 757eb5388c61440554dc81e161d97e530a8d9c259910697b0e173e510cd30edb
---

## Research background {#background}

This master's thesis research is conducted in collaboration with the School of Food and Health at Beijing Technology and Business University. It examines **relationships between physiological signals, including EEG and ECG, and food aroma perception**, exploring how physiological information can assist sensory evaluation.

Aroma perception varies across individuals, and ratings may also vary across trials under the same conditions. Physiological recordings provide information about dynamic responses beyond the ratings themselves, supporting the analysis of these differences and perception prediction. Such research requires **controlled odor presentation**, synchronized physiological recording, and associated sensory ratings to provide a consistent experimental basis for comparing perceptual responses across conditions and individuals.

## Main work {#contributions}

### Olfactory stimulation and synchronized acquisition system implementation

Based on the collaborating team's design, jointly implemented a **20-channel olfactory stimulator** and integrated its pneumatic and electrical controls. Channel selection, flow compensation, mixing, delivery, and purging organize stimulus presentation. Control interfaces and event outputs connect the apparatus, control software, and existing physiological acquisition equipment into a system configurable for different experimental tasks.

<figure id="architecture">
  <img src="{{ '/assets/img/projects/olfactory-flavor-perception/olfactory-system-architecture.png' | relative_url }}" alt="Olfactory experimental system: a host computer connects the stimulator and physiological acquisition equipment, a nasal sensor supplies respiratory input, and event outputs associate odor presentation with physiological recording" width="2026" height="1176" loading="lazy" decoding="async">
  <figcaption class="caption">Figure 1. Olfactory stimulation and synchronized acquisition system. The EEG pathway illustrates physiological recording, and nasal respiration input is part of the system design.</figcaption>
</figure>

Developed experiment control software in **PySide6**, separating interface interaction, task scheduling, data recording, and hardware adaptation. NI-DAQmx and serial interfaces connect control devices and mass flow controllers. Task configurations manage channels, flow rates, presentation durations, and trial order, coordinating device execution, continuous sampling, and status displays. Trial identifiers and event markers associate operation logs with physiological recordings. Functional testing and debugging of the apparatus and control software are complete.

### Food aroma experiments and multimodal data construction

Conducted **orthonasal and retronasal aroma experiments** in milk and aqueous model matrices with the collaborating team, jointly collecting EEG, ECG, respiration, and sensory ratings. Each trial comprises condition loading, sample preparation, initiation and marking, stimulus recording, recovery, and rating, linking sample handling, device execution, and participant evaluation to the same trial. The existing experiments use manual initiation and verbal cues, with respiration saved as a continuous recording.

Data are organized by participant, session, and event, linking stimulus conditions, physiological segments, sensory ratings, and quality records while preserving orthonasal–retronasal pairing. Data have been collected from **30 participants**. After quality screening, the EEG–ECG analysis set used in the SPKR study contains **908 valid events and 454 paired records**, providing a common data basis for model comparison and subsequent perception analysis.

### Perception modeling and physiological information analysis

This work examines whether EEG and ECG provide additional perceptual information beyond rating variation explained by stimulus conditions. The completed study uses **SPKR (Stimulus-conditioned Physiological Kernel Regression)** to separate prediction into a stimulus term and a physiological term. The stimulus term provides a baseline prediction, while the physiological term uses conditionally mapped representations and differences from reference states to construct a kernel regression model that adjusts event ratings. Separate models predict **overall odor intensity, pleasantness, and purchase desire on a 0–9 scale**.

<figure>
  <img src="{{ '/assets/img/projects/olfactory-flavor-perception/spkr-method.png' | relative_url }}" alt="SPKR method: stimulus conditions provide a starting prediction; conditionally mapped EEG and ECG states are compared with reference states, and kernel regression produces a physiological term added to the stimulus term" width="1880" height="996" loading="lazy" decoding="async">
  <figcaption class="caption">Figure 2. SPKR prediction for one rating. Stimulus descriptors condition physiological representations; differences between event and reference states construct the kernels. Stimulus and physiological terms jointly predict the sensory rating.</figcaption>
</figure>

Within the same participant panel, five-fold grouped validation keeps orthonasal–retronasal pairs intact and evaluates held-out event predictions using participant-equal mean absolute error (MAE). Overall odor intensity MAE decreases from **1.704 for the stimulus-only baseline to 1.215 for SPKR**. Among the eight models compared in the experiments, SPKR has the lowest observed MAE for all three ratings.

Analysis of mean ratings and predictions across stimulus conditions, together with **the contributions of the stimulus and physiological terms**, examines how the model uses both sources of information to predict ratings. These analyses provide a basis for subsequent research on associations between physiological features and sensory ratings.

## Future research {#future-research}

Further work will quantify flow stability, event synchronization, triggering, and continuous operation, and apply respiratory triggering in experiments. Building on the existing single-target models, further research will combine EEG, ECG, and respiration to investigate **joint prediction** of overall odor intensity, milk-aroma intensity, fatty-aroma intensity, and pleasantness, as well as associations between physiological features and each rating and how they vary across experimental conditions.
