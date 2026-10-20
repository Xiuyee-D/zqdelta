本文为 [CMU LTI-11776：Multimodal Affective Computing](https://multicomp.cs.cmu.edu/resources/lti-11776-multimodal-affective-computing/) 的学习笔记，按主题整理课程内容。

## 多模态深度学习的核心问题

### 表征

多模态学习的首要问题在于如何对不同模态的数据进行有效*表征*（representation），以充分利用其**互补性与冗余性**。

- **联合表示**（Joint Representation）：将多个模态的输入联合编码为一个表示。例如，Ngiam 等（2011）研究了音视频信息的联合特征学习；Srivastava 和 Salakhutdinov（2012）通过多模态深度玻尔兹曼机对图像与文本进行联合建模；Kim 等（2013）则利用深度玻尔兹曼机完成音视频情感识别。
- **协调表示**（Coordinated Representation）：分别编码各模态，再通过相关性、相似性或其他约束关联它们的表示。典型方法是深度典型相关分析（Deep CCA，Andrew et al., 2013），学习两个模态的非线性变换，使所得表示具有较高线性相关性。

**任务例子**：对同一段视频学习联合情感表示，或分别编码图像与文本，使匹配内容在表示空间中接近。

### 对齐

_对齐_（alignment）的任务是**识别不同模态间的对应关系**，可分为显式与隐式两类。

- **显式对齐**（Explicit Alignment）：直接寻找模态元素之间的对应，例如时间序列的同步，用于处理异步数据、跨模态数据匹配及多源事件重建。
- **隐式对齐**（Implicit Alignment）：依赖于中间潜变量，通过潜在表示学习自动捕捉模态关系，不直接输出对齐，而是服务于下游任务。例如 Karpathy 等（2014）通过隐式映射实现图像与文本的双向匹配。

**任务例子**：定位视频中某句话对应的时间段，或在生成描述时识别词语对应的图像区域。

### 融合

_融合_（fusion）是指**将多个模态的特征或预测结果结合**，以提升任务性能。

- **模型无关方法**：
  - 早期融合（Early Fusion）：在特征层面直接拼接。在面对模态采样率不一致或高维特征空间时，使用起来很困难。
  - 晚期融合（Late Fusion）：分别训练各模态的独立预测器，并通过加权平均、投票机制或元学习方法在输出阶段进行集成。
- **模型驱动方法**：
  - 深度神经网络（如多模态 DNN）
  - 多核学习（Multiple Kernel Learning）
  - 图模型（如多视图 HCRF）。

**任务例子**：联合文本、语音和视觉预测情感，比较特征拼接与预测结果融合的差异。

### 跨模态转换

_跨模态转换_（translation）是跨模态学习的重要挑战，目标是**将数据从一种模态转换为另一种模态**，往往具有开放性与主观性。

- **基于实例**（Example-based）：通过检索或组合完成。
- **基于模型**（Model-driven）：利用语法驱动或编码器–解码器模型实现跨模态生成。

**任务例子**：将图像转换为文本描述，同一图像可以对应多种合理表述。

### 协同学习

_协同学习_（co-learning）强调**模态间的知识迁移与共享**，使得一个模态的知识能够帮助另一模态的学习。

- **并行数据**：常用于共训练（co-training）或迁移学习（transfer learning）。
- **非并行数据**：涉及零样本学习或跨模态概念对齐。
- **混合数据**：结合并行与非并行方式，用于跨域或跨模态迁移。

**任务例子**：训练阶段同时使用音视频信息，帮助仅有音频输入时的模型学习。

## 参考资料

- [Ngiam et al.：Multimodal Deep Learning](https://ai.stanford.edu/~jngiam/papers/NgiamKhoslaKimNamLeeNg2011.pdf)
- [Andrew et al.：Deep Canonical Correlation Analysis](https://proceedings.mlr.press/v28/andrew13.html)
- [Baltrušaitis et al.：Multimodal Machine Learning: A Survey and Taxonomy](https://arxiv.org/abs/1705.09406)
