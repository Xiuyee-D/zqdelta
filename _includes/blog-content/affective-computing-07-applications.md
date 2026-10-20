本文为 [CMU LTI-11776：Multimodal Affective Computing](https://multicomp.cs.cmu.edu/resources/lti-11776-multimodal-affective-computing/) 的学习笔记，按主题整理课程内容。

## 多模态情感分析

**多模态情感分析**（Multimodal Sentiment Analysis）关注表达中的评价倾向与强度，例如对某个对象的正面、负面或中性评价。**情绪识别**（Emotion Recognition）则关注快乐、愤怒、悲伤等情绪类别。

在意见视频中，文本提供评价对象和措辞，语音反映重音、语速与语调，视觉包含表情和动作线索。模态间既可能互补，也可能出现反讽、表达延迟或语义冲突。

典型问题包括：**模态互补**，即如何使用不同来源的信息；**时序对齐**，即如何处理采样频率和表达时间差；以及**交互建模**，即如何表示模态之间的关系。

例如，[CMU-MOSI](https://multicomp.cs.cmu.edu/resources/cmu-mosi-dataset/) 提供观点片段的情感强度标注；[CMU-MOSEI](https://multicomp.cs.cmu.edu/resources/cmu-mosei-dataset/) 则包含情感与情绪相关标签。

## 公共演讲训练与评估

公共演讲可以结合语音、视线、姿态与语言内容进行分析。**Cicero** 是虚拟观众与多模态行为分析相结合的研究平台：通过模拟听众情境，记录演讲者的行为，并探索反馈与训练方式。原研究还使用 Personal Report of Confidence as a Public Speaker（PRCS）等问卷，讨论行为与演讲体验之间的联系。[Cicero 原论文](https://doi.org/10.1007/978-3-642-40415-3_10)

自动评估系统从发言时长、停顿、眼神接触等行为特征出发，预测表达清晰度、焦虑评分等目标，并通过用户研究评价训练效果。

相关视觉分析组件包括 FACET、CLNF 和 Kinect；声学分析工具包括 COVAREP 和 Praat。

## 多模态学习分析

多模态学习分析（Multimodal Learning Analytics）研究学习活动中的语言、语音、姿态和操作行为，尝试理解参与、协作及知识交流过程。在小组任务中，发言轮次、注视与任务操作可以帮助描述不同参与者的活动模式。

角色标签可以来自自评、同伴评价或观察编码。将这些标签与发言、注视和任务操作等行为关联，可以研究领导者、专家等角色的表现。

建模可以比较静态角色分类与时间窗口中的状态变化，分析跨任务、跨小组的行为模式。应用包括提供协作反馈、发现参与失衡及支持教学分析。

## 健康行为信息学

健康相关访谈可以结合语言、声音与非语言行为辅助分析心理状态。**SimSensei** 研究虚拟访谈者与多模态感知的协同，**MultiSense** 提供相关感知能力。

[DAIC-WOZ](https://dcapswoz.ict.usc.edu/) 包含 189 次由虚拟访谈者 Ellie 进行的访谈，其 Wizard-of-Oz 采集由另一房间的人类访谈者控制。公开的抑郁任务使用 **PHQ-8** 分数及相应二分类标签，见[官方数据文档](https://dcapswoz.ict.usc.edu/wp-content/uploads/2022/02/DAICWOZDepression_Documentation.pdf)。

建模关注语言、声音与视觉行为和目标分数之间的联系，并在独立受试者上评价预测表现。

## 其他多模态应用

情感计算以外，图像描述、视觉问答与跨模态检索也展示了联合表示与跨模态交互的不同用途。以下列举经典研究路线，作为理解任务的例子。

**图像描述生成**将图像内容组织为自然语言。Show and Tell 使用图像编码与序列解码；Show, Attend and Tell 进一步引入区域注意力，使生成过程能够参考不同图像位置。[Show and Tell](https://arxiv.org/abs/1411.4555)、[Show, Attend and Tell](https://arxiv.org/abs/1502.03044)

**视觉问答**同时接收图像与问题，再预测或生成答案。它要求分析答案是否依赖图像证据、语言先验或两者的交互；评价还需考虑数据集偏差及不同问题类型。

**跨模态检索**通过联合或协调表示关联不同数据类型，例如用文本查找图片。典型路线包括双塔编码、对比学习与更细粒度的匹配，关注点是相关内容能否在候选集合中被正确召回和排序。
