---
published: true
lang: "en"
translation_key: olfactory-flavor-perception
permalink: "/projects/olfactory-flavor-perception/"

title: "Food Flavor Perception from Multimodal Physiological Signals"
description: "Collaboratively implemented an olfactory stimulator, independently developed its control software, and jointly collected EEG, ECG, and sensory ratings to study physiological correlates of perceived milk-aroma intensity."

category: work
project_type: research
period: "2025.09—present"
status: ongoing
organization: "School of Food and Health, Beijing Technology and Business University"

topics: [Multimodal learning, Food sensory science, Physiological signal processing]
tech_stack: [PySide6, NI-DAQmx, pyserial, PyTorch]

translation_source: _projects/olfactory-flavor-perception.zh.md
translation_source_sha256: a50009f36d70044cae5f9d53dec9f49ff614ad2f7eba228a210fd70339b75783
---

## Research background {#background}

This master's thesis project is conducted in collaboration with the School of Food and Health at Beijing Technology and Business University. It examines **the relationship between EEG and ECG signals and perceived milk-aroma intensity**, exploring physiological signals as a basis for food flavor assessment.

The collaborating team supplied the olfactory stimulator design, and we implemented it together. I independently developed the experimental control software, worked on system integration, data analysis, and modeling, and jointly collected multimodal physiological signals and sensory ratings with the collaborating team, connecting experimental control, data preparation, and perception modeling.

## Experimental system architecture {#architecture}

The system comprises **control software, an olfactory stimulator, and physiological acquisition equipment**, which handle workflow scheduling, odor presentation, and signal recording, respectively. Experimental event markers coordinate device execution and recording timelines.

<figure>
  <img src="{{ '/assets/img/projects/olfactory-flavor-perception/system-architecture.png' | relative_url }}" alt="Experimental system architecture: a host computer coordinates the olfactory stimulator and physiological acquisition system, recording odor presentation, experimental events, and participant responses" width="2400" height="1350" loading="lazy" decoding="async">
  <figcaption class="caption">Figure 1. Experimental system architecture. The EEG pathway illustrates the physiological acquisition component.</figcaption>
</figure>

## Main contributions {#contributions}

### Olfactory stimulation system implementation and control software

Following the design supplied by the collaborating team, I helped implement the pneumatic and electrical components of a **20-channel olfactory stimulator** for odor switching and airflow control. Building on this system, I **developed the experimental control software** with PySide6 to configure odor channels, presentation durations, and flow rates, display acquisition signals and device status, and support stimulus pretests and formal experiments.

I separated interface interaction, experimental workflows, data recording, and hardware control into distinct layers. NI devices connect through NI-DAQmx, and mass flow controllers communicate over serial interfaces. A hardware adapter layer encapsulates device operations, while worker threads coordinate continuous sampling and interface updates to support repeatable experimental control.

### Multimodal physiological experiments and dataset construction

Together with the collaborating team, I collected physiological signals and sensory ratings, using equipment including PowerLab and Bio Amp to record EEG and ECG signals alongside participants' ratings after odor presentation.

The dataset used in the current research contains **30 participants and 908 events**. Physiological recordings are stored in EDF format and linked by event to stimulus order, sensory ratings, and participant information, with modality availability and quality-control records retained. Experimental event markers define data windows, organizing continuous recordings into traceable event-level samples.

### Perception modeling

Experimental system deployment, data collection, and event-level sample preparation are complete; **the modeling method remains under exploration**. The next stage will use EEG and ECG signals to predict **milk-aroma intensity on a 1–9 scale**, examine signal quality and the contributions of the two modalities, and evaluate modeling approaches within the existing participant cohort.
