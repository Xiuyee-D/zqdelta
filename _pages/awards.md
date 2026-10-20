---
layout: page
lang: en
translation_key: awards
title: Awards
permalink: /awards/
description: Awards, honors, and academic recognition.
nav: true
nav_order: 4
awards:
  - name: "Challenge Cup Beijing College Student Business Plan Competition"
    distinction: Grand Prize
    year: "2026"
  - name: "Lanqiao Cup National Software and Information Technology Competition, Beijing Division (Python Programming, Postgraduate Group)"
    distinction: Second Prize
    year: "2026"
  - name: "Challenge Cup National College Student Extracurricular Academic Science and Technology Competition"
    distinction: Third Prize
    year: "2025"
  - name: "Challenge Cup Beijing College Student Extracurricular Academic Science and Technology Competition"
    distinction: First Prize
    year: "2025"
  - name: "China Postgraduate Electronics Design Contest"
    distinction: Second Prize
    year: "2025"
  - name: "China Robot Competition and RoboCup China Open (Martial Arts Arena: Human–Robot Cooperative Attack and Defense)"
    distinction: First Prize
    year: "2022"
  - name: "International Underwater Robot Competition"
    distinction: Third Prize
    year: "2021"
  - name: "University Robotics Competition of Five Northern Chinese Regions"
    distinction: Second Prize
    year: "2021"
  - name: "China Robot Skills Competition"
    distinction: Third Prize
    year: "2021"
  - name: "China Robot Competition and RoboCup China Open (Martial Arts Arena: Autonomous Humanoid Sanda)"
    distinction: Second Prize
    year: "2021"
  - name: "China Robot Competition and RoboCup China Open (Martial Arts Arena: Autonomous Humanoid Sanda)"
    distinction: Second Prize
    year: "2020"
  - name: "Lanqiao Cup National Software and Information Technology Competition, Beijing Division (C/C++ Programming, University Group)"
    distinction: First Prize
    year: "2020"
translation_source: _pages/awards-zh.md
translation_source_sha256: 4f27ababfaf74bb32baf8dec3cee0e8cd5a2c8763e9fdf366d81d9c227271a61
---

<ul class="awards-list" role="list">
  {% for award in page.awards %}
    <li class="award-entry">
      <span class="award-name">{{ award.name | escape }}</span>
      <span class="award-meta">
        <span class="award-distinction">{{ award.distinction | escape }}</span>
        <span class="award-meta-separator" aria-hidden="true">·</span>
        <time class="award-year" datetime="{{ award.year }}">{{ award.year }}</time>
      </span>
    </li>
  {% endfor %}
</ul>
