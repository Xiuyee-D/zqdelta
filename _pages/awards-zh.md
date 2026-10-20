---
layout: page
lang: zh-CN
translation_key: awards
title: 获奖
permalink: /zh/awards/
description: 奖项、荣誉与学术认可。
nav: true
nav_order: 4
awards:
  - name: “挑战杯”首都大学生创业计划竞赛
    distinction: 特等奖
    year: "2026"
  - name: 蓝桥杯全国大学生软件和信息技术大赛北京赛区（Python 程序设计研究生组）
    distinction: 二等奖
    year: "2026"
  - name: “挑战杯”全国大学生课外学术科技作品竞赛
    distinction: 三等奖
    year: "2025"
  - name: “挑战杯”首都大学生课外学术科技作品竞赛
    distinction: 一等奖
    year: "2025"
  - name: 中国研究生电子设计竞赛
    distinction: 二等奖
    year: "2025"
  - name: 中国机器人大赛暨 RoboCup 机器人世界杯中国赛（武术擂台赛·人机协同攻防赛）
    distinction: 一等奖
    year: "2022"
  - name: 国际水中机器人大赛
    distinction: 三等奖
    year: "2021"
  - name: 华北五省（市、自治区）大学生机器人大赛
    distinction: 二等奖
    year: "2021"
  - name: 中国机器人技能大赛
    distinction: 三等奖
    year: "2021"
  - name: 中国机器人大赛暨 RoboCup 机器人世界杯中国赛（武术擂台赛·自主仿人散打项目）
    distinction: 二等奖
    year: "2021"
  - name: 中国机器人大赛暨 RoboCup 机器人世界杯中国赛（武术擂台赛·自主仿人散打项目）
    distinction: 二等奖
    year: "2020"
  - name: 蓝桥杯全国软件和信息技术专业人才大赛北京赛区（C/C++ 程序设计大学组）
    distinction: 一等奖
    year: "2020"
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
