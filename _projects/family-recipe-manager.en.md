---
published: true
lang: "en"
translation_key: family-recipe-manager
permalink: "/projects/family-recipe-manager/"

title: "Family Recipe and Ingredient Management App"
description: "Independently developed a WeChat Mini Program combining LLM-assisted recipe import, cloud synchronization, and household sharing with meal preparation and post-cooking inventory updates."

category: fun
project_type: personal
period: "2026.02—2026.03"
sort_date: "2026-03"

topics: [Software engineering, Mobile applications]
tech_stack: [JavaScript, Vue 3, Function Compute, Tablestore, OSS]

translation_source: _projects/family-recipe-manager.zh.md
translation_source_sha256: de74183020b24eb4f1b81684a398c3f0cc4e8b74dad3d0ed164eeff3486b96ee
---

## Motivation {#motivation}

Saved recipes often remain as links or long passages of text. Before cooking, users still need to reorganize ingredients and instructions, check inventory, and coordinate plans with family members. This project aims to reduce that repeated work and make collected recipes directly usable for household meal preparation.

Requirements analysis, frontend and backend development, interaction and system design, model-service integration, cloud deployment, and testing are complete. The application is currently a WeChat Mini Program used in family trials.

## Main contributions {#contributions}

### LLM-assisted recipe import

Users can provide **recipe links or shared text**. Cloud functions retrieve webpage context and call the Alibaba Cloud Bailian model API to organize external information into categories, ingredients, seasonings, and steps. Users review, complete, and confirm the model output before saving it. To handle **missing information and interrupted requests**, parsing results are retained as recoverable drafts, with a manual entry option connecting automated organization and user correction in one workflow.

### Cloud storage and synchronization across devices

Separate cloud functions handle model-based parsing and recipe management, with **Alibaba Cloud Tablestore storing recipe records and OSS storing images**. Cloud records are authoritative, and a local cache supports reads. Additions, modifications, and deletions synchronize incrementally to the cache and refresh the interface; **offline access remains read-only**. Asynchronous state handling and failure feedback coordinate image uploads, record saving, and cache refreshes, connecting user actions to clear cloud-side data outcomes.

### Inventory modeling and meal preparation

To accommodate different recording habits for fresh produce, packaged food, and staple seasonings, the inventory model combines quantities and status: ingredients requiring measurement track quantities, while staple seasonings track whether replenishment is needed. Today's recipes are linked to inventory to summarize preparation shortfalls. After cooking, users review and confirm actual consumption; quantity-based items are deducted accordingly, and staples retain reminders, avoiding a requirement to track precise quantities for every ingredient.

### Household permissions and exception handling

The implemented user system organizes data into **household spaces**, with workflows for invitations, space switching, and ownership transfer. **Membership permissions and access checks are enforced on the server**. Exception handling and regression verification cover duplicate submissions, offline access, synchronization failures, and expired sessions, providing defined paths for membership changes and failed operations.

## Reflection {#reflection}

### Define states and failure paths early

Early in development, unclear boundaries between parsing, manual entry, and confirmation caused repeated parsing to stall and loading states to persist. Defining state transitions, separating interface and business orchestration responsibilities, and adding timeout and cancellation paths brought exception scenarios into functional acceptance checks.

### Balance usability and synchronization complexity

Family trials prioritized access during network outages, leaving offline editing and conflict merging for later. This decision reduced the combinations of states arising from writes on both sides and clarified the current data-consistency boundary.

### Validate the real deployment environment earlier

Cloud integration exposed function-event formats, database row structures, and client-interface compatibility issues that required late adaptation. Automated regression checks were combined with manual acceptance testing in the WeChat Mini Program to verify the real read/write flow step by step. Future development should validate the deployment environment and data contracts before expanding features.
