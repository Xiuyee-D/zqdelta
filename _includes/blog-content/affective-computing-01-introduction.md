本文为 [CMU LTI-11776：Multimodal Affective Computing](https://multicomp.cs.cmu.edu/resources/lti-11776-multimodal-affective-computing/) 的学习笔记，按主题整理课程内容。

## 交流模型

在人际交流模型中，**信息的传递涉及多个关键组成要素：信息源与接收者、交流通道、信息本体、反馈机制、噪音类型（如身体、生理、心理或语义干扰）以及语境（包括物理、时间、社会心理与文化背景）**。这些元素相互作用，共同构成了交流的动态系统，强调了在情境中理解行为的必要性。因此，
_多模态情感计算_（Multimodal Affective Computing）不仅依赖于计算机视觉、语音处理与自然语言处理等技术，更需要融合心理学、语言学与社会学等学科的理论基础，以支持对“情感”这一复杂现象的科学建模与预测。

多模态情感计算是一个**融合了行为科学与人工智能的交叉研究领域**，旨在通过技术手段感知、分析并预测人类在社会情境下的细微情感行为。人类交流本质上是多模态的，涵盖了*语言*（verbal）、_声音_（vocal）和*视觉*（visual）三种主要模态。这些模态在交流过程中相互补充、相互作用，共同传达出复杂的情感与意图。例如，语音的语调、音质和语速常常揭示说话者的情绪状态；而面部表情、眼神交流与肢体语言等非语言行为则构成了关键的视觉信号。此外，词汇使用、句法结构以及语用意图的表达也是理解语言交流的核心要素。

研究者通过细化这些模态，构建出更具解释力的行为-心理对应框架。通过行为到心理的映射，研究者可识别多种心理现象，包括情绪（如挫折、满意）、社会性（如同理心、权威）、病理特征（如自闭、痛苦）、认知状态（如注意力、好奇心）与人格特质（如果断性、可信度）。这些现象可通过**定量特征提取与统计分析（如方差分析、贝叶斯网络、马尔可夫场）** 建模，并进一步用于情感预测与社会信号解码。
<img class="blog-image" src="{{ '/assets/img/blog/affective-computing-01-introduction/communication-model.png' | relative_url }}" alt="多模态情感计算（01）：导论：交流模型" width="778" height="450" loading="lazy" decoding="async">

## 发展历程

多模态情感计算的发展可分为多个技术与理论演进阶段，反映了人类行为理解从认知科学研究走向人工智能模型的跨学科变迁。

早期语言与手势研究中，David McNeill 等学者强调**语言与手势具有认知一体性**，认为手势并非语言的附属，而是思维过程的外显行为。1976 年*麦格克效应*（McGurk Effect）的发现，揭示了视觉与听觉在语音感知中的交互机制，为后续多模态研究奠定了感知融合的基础。

20 世纪 80 年代末至 2000 年被称为*计算阶段*（Computational Era），伴随人机交互和多媒体计算的兴起，研究开始聚焦于**音视频信号的同步建模与自动分析**。代表性成果包括 MIT 开发的 Pfinder 系统，用于实时人体追踪，以及 Informedia 项目，探索了基于语音、图像与自然语言理解的数字视频内容检索。在此基础上，Rosalind Picard 通过 1997 年的《Affective Computing》系统讨论情感计算，标志着**研究开始从感知行为延伸至情绪建模**。

2000 年代被视为*交互阶段*（Interaction Era），研究重心转向**对实际社会交互中多模态行为的建模与分析**。多个大型项目如 AMI、CHIL、CALO 和 SSP 等，致力于构建带有时间同步的音视频语料库，以支持如协作、注意力与社交信号的自动识别。特别是 CALO 项目衍生出苹果公司的 Siri，展示了此类研究在智能代理系统中的应用潜力。

2010 年代以来，随着深度学习技术的快速发展，研究进入*深度学习阶段*（Deep Learning Era），通过构建大规模多模态数据集与端到端模型，研究者实现了对语言、图像与声音的联合建模。关键技术如多模态深度玻尔兹曼机、注意力机制与跨模态对齐模型不断被提出，使得系统能够在不规则、不平衡的信号条件下有效提取高层语义特征，为情绪识别、社交行为预测等任务提供了性能跃迁。

这一发展轨迹展现了**从心理学与语言学起步，逐步融合多媒体技术与现代 AI 方法**的过程，确立了多模态情感计算作为人类行为建模前沿领域的重要地位。

## 情感计算中的核心问题

多模态情感计算涵盖一系列与人类心理状态和社会行为相关的核心研究主题，主要包括**情感状态、认知状态、人格、病理学、社会过程**。研究的出发点是探究这些心理现象如何通过可观察的多模态行为（语言、声音、视觉）表现出来，并进一步理解不同模态对心理状态建模的相对贡献及其交互关系。

常见的研究问题包括：

1. 哪些具体行为与某种心理现象存在必要或充分的关联？
2. 两种心理现象之间的关系是否反映在它们所关联的行为之间的关系中？
3. 当多个模态在对同一心理现象的表达上出现偏差或冲突时，人类是如何进行感知与判断的？
4. 社会关系、文化背景或互动背景是否会影响行为与心理之间的映射关系？

### 情感状态——情绪、心情和感觉

情感状态研究关注体验的类别、强度及其随时间的变化，可使用效价、唤醒度等连续维度或离散情绪标签。具体模型与测量差异见[第 03 篇：理论基础]({{ '/zh/blog/affective-computing-03-theories/' | relative_url }})。

IEMOCAP、AFEW 及 AVEC 相关语料提供不同情境下的情绪任务；MOSI 与 MOUD 更侧重观点表达中的情感倾向。

### 认知状态——思维和信息处理

认知状态包括注意、兴趣、困惑与任务投入等。眼动、面部动作、语音停顿及任务操作是研究这些状态的常见行为指标。

课程笔记中的 Platformer Experience、MMDB 和 COGNIMUSE 等资源，分别涉及交互体验、互动行为或内容显著性等标注对象。

### 人格——行为、情感和思维模式

人格研究关注相对稳定的特质及其在不同情境中的行为表现，包括自评人格与他人感知人格等研究设置。

YouTube Personality、POM、MAPTRAITS 和 SALSA 等是课程笔记讨论的相关资源。其中 POM 还涉及观点表达与说服相关的感知属性。

### 心理病理——症状与行为表现

这一方向分析访谈、语言、声音和视觉行为与心理症状分数之间的联系。DAIC／DAIC-WOZ、AVEC 相关任务及课程中的症状访谈资源提供了相应的建模数据。

以 DAIC-WOZ 为例，公开抑郁任务使用 PHQ-8 标签，详见[官方说明](https://dcapswoz.ict.usc.edu/)。构念与可观测指标如何建立联系，见[第 02 篇：构念测量]({{ '/zh/blog/affective-computing-02-measurement/' | relative_url }})。

### 社会过程——群体、文化和感知

社会过程包括领导、合作、冲突、协调与说服等，常发生在双人或多人互动中。分析对象不仅是单个人的特征，还包括谁对谁发言、如何响应及行为是否同步。

ELEA、AMI、MAHNOB-Mimicry、Tower Game 和 ICT Rapport 等资源可用于讨论团队互动、会议、模仿与关系建立等问题。

## 数据标注与分析工具

以下整理课程提及的工具，覆盖人工标注、自动转写与特征提取。

### 人工标注

- [Transcriber](http://trans.sourceforge.net/en/presentation.php)
- [ANVIL](http://www.anvil-software.de/)
- [ELAN](https://archive.mpi.nl/tla/elan)
- [CARMA](http://carma.jmgirard.com/)

### 自动语音转写

- [CMU Sphinx](http://cmusphinx.sourceforge.net/)
- Hidden Markov Model Toolkit
- [Google Cloud Speech-to-Text](https://cloud.google.com/speech-to-text/)
- [Microsoft Azure Speech-to-Text API](https://azure.microsoft.com/en-us/services/cognitive-services/speech-to-text/)

### 语言分析

- SRI Language Modeling Toolkit (语言模型)
- Parsers by Kenji Sagae (语法分析器)
- [LIWC2015](http://liwc.wpengine.com/) (文本分析)
- [LightSIDE](https://github.com/LightSideWorkbench/LightSide) (文本挖掘, GUI)
- [MALLET](http://mallet.cs.umass.edu/) (文档分类、话题建模)

### 声学特征

- [COVAREP](http://covarep.github.io/covarep/) (特征提取、语音分析)
- [Praat](http://www.fon.hum.uva.nl/praat/) (特征提取、语音分析、分割, GUI)
- [OpenEAR](http://sourceforge.net/projects/openart/) (特征提取、情感分类)
- [OpenSmile](https://www.audeering.com/opensmile/) (特征提取)

### 视觉行为

- [Watson Head Tracker](http://sourceforge.net/projects/watson/) (头部姿势)
- EyeAPI (眼睛位置)
- [OpenFace](https://github.com/TadasBaltrusaitis/OpenFace) (地标、头部姿势、动作单位、凝视)
- [Emotient](https://imotions.com/emotient/) (动作单位、情绪估计)
- [OpenPose](https://github.com/CMU-Perceptual-Computing-Lab/openpose) (身体、脚部、面部、手部追踪)

## 参考资料

- [CMU LTI-11776 课程主题与资源](https://multicomp.cs.cmu.edu/resources/lti-11776-multimodal-affective-computing/)
- [Picard：Affective Computing](https://mitpress.mit.edu/9780262661157/affective-computing/)
- [CMU 多模态数据资源](https://multicomp.cs.cmu.edu/datasets/)
