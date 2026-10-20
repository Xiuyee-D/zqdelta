---
published: true
lang: "en"
translation_key: portable-ai-voice-terminal
permalink: "/projects/portable-ai-voice-terminal/"

title: "Portable AI Voice Terminal Development and Engineering"
description: "Contributed to an ESP32 voice terminal for exhibition guidance and completed prototype assembly and debugging, with responsibility for PCB miniaturization, board validation, cloud voice integration, and trial-production coordination."

category: work
project_type: engineering
period: "2024.12—2025.12"
sort_date: "2025-12"

topics: [Embedded systems, Internet of Things, Prototype development]
tech_stack: [PCB Stack-up, ESP-IDF, DFM/DFT]

translation_source: _projects/portable-ai-voice-terminal.zh.md
translation_source_sha256: 71c47fbfe22cec873341981b44e6e0d5a63ad1109346729f532b3f60c921250a
---

## Project background {#background}

Traditional audio guides mainly play prerecorded content and cannot directly answer visitors' individual questions. Cloud speech recognition and large language models enable a portable terminal to support live voice interaction. However, a compact device must integrate wireless communication, audio capture and playback, a battery, and power-management circuitry while balancing enclosure space, signal quality, battery life, and manufacturing feasibility.

## Main contributions {#contributions}

### PCB miniaturization, layer stack-up design, and board-level validation

Within an enclosure measuring **4 × 3 × 5 cm (length × width × height)**, I contributed to the controller, audio, power, and communication circuits and completed the schematic and **layout, routing, and layer stack-up design of a single PCB**. Component height, RF clearance, and signal routing informed layout adjustments. I coordinated assembly space and interface positions with the colleague responsible for the enclosure, balancing circuit integration and final assembly.

I conducted board-level checks related to power integrity (PI) and signal integrity (SI), focusing on power delivery, startup sequencing, and audio interfaces, and used a multimeter, oscilloscope, and serial logs to locate problems. For example, an audio ADC initialization failure was traced through supply and bias voltage measurements and initialization logs to the controller–ADC startup sequence. Adjusting the startup procedure restored normal initialization.

{% include voice-terminal-viewer.liquid %}

### ESP-IDF firmware and device–cloud voice interaction

Using ESP-IDF, I carried out **firmware development**, implementing audio peripheral drivers and Wi-Fi connectivity, using MQTT for device control and status messages, and integrating cloud LLM services. Device state management covers connectivity, voice capture, request waiting, and playback, including reconnection and state recovery after network interruptions, linking voice input to response playback.

### Trial-production processes and factory coordination

I carried out PCB prototyping and completed **prototype assembly and functional debugging**. Addressing design for manufacturability (DFM) and design for testability (DFT), I refined SMT/post-soldering, board programming, PCBA testing, and final assembly processes, coordinated process and workstation arrangements with the factory, and translated prototype-debugging experience into trial-production procedures. I also wrote standard operating procedures (SOPs) for the factory.
