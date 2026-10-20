---
published: true
lang: "en"
translation_key: integrated-test-control
permalink: "/projects/integrated-test-control/"

title: "Unified Test and Control Software for Multiple Device Models"
description: "Designed the desktop software architecture and multi-protocol device adapters, contributed to module integration and delivery, and supported performance testing, visualization, and reporting for 3 device categories."

category: work
project_type: engineering
period: "2024.08—2025.04"
sort_date: "2025-04"

topics: [Software engineering, Industrial communication]
tech_stack: [PySide2, Qt Designer, GitLab]

translation_source: _projects/integrated-test-control.zh.md
translation_source_sha256: 092b7da4aadbdbab3938e652ae72586cd82d6fcf17f89b484b4bbb9d7abb8ac8
---

## Project background {#background}

This industry-sponsored project brings **performance testing, data acquisition, and result assessment** for multiple device models into a unified desktop platform, integrating device control, test workflows, visualization, and report generation. Device models differ in communication methods, commands, and data formats, while team members develop functional modules in parallel. The system therefore needs extensible device access, consistent interfaces, and stable staged integration.

## Main contributions {#contributions}

### Desktop software architecture and interface conventions

I was responsible for **designing and building the overall desktop software framework** in PySide2, separating interface interaction, test workflows, device communication, and data processing into modules with clear team development boundaries. Shared layout, operation, and status-feedback conventions give independently developed modules consistent interaction patterns and result presentations.

### Unified device interfaces and multi-protocol communication

I designed a **unified device interface** for business operations, encapsulating connection management, command transmission, and response parsing in a device adapter layer, and implemented support for **TCP, UDP, Modbus TCP, and RS-422**. Adding a device involves encapsulating its commands and data parsers; upper-level test workflows and interfaces call the agreed device functions without directly handling differences in messages or protocols.

### Cross-module integration and delivery coordination

I contributed to feature decomposition and interface coordination, integrating team members' work through **GitLab feature branches and Merge Requests (MRs)**. Short integration cycles identified duplicated control logic, parsing implementations, and inconsistent component styles. We consolidated shared modules, aligned interfaces, and resolved differences in module responsibilities and call interfaces.

Later, I coordinated project progress and system integration, including **on-site integration before delivery**. This connected actual device access, data acquisition, visualization, and report generation, alongside organizing test versions and delivery documentation. The delivered software supports unified testing for 3 device categories and includes a user manual.
