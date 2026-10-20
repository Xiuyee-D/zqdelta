## 自注意力机制

### 引入

把一个句子作为输入，每一个词汇可以作为一个向量，句子长度不同，向量集的大小也就不同。词汇可以通过*独热编码*（One-hot Encoding）或者*词嵌入*（Word Embedding）转成向量，后者转成的向量包含语义信息。

把一段声音作为输入，分成多个*帧*（Frame）序列，一帧作为一个向量，每一帧可以通过滑动窗（大小 25ms 每次滑动 10ms）、_梅尔频率倒谱系数_（MFCC）或者*滤波器组*（Filter Bank）转成向量。

模型输出有以下三种情况：
<img class="blog-image" src="{{ '/assets/img/blog/transformer/contextual-sequence-output.png' | relative_url }}" alt="模型输出" width="1082" height="746" loading="lazy" decoding="async">

_序列标注_（Sequence Labeling）是 NLP 中的基础任务之一，旨在为输入序列中的每个元素分配一个标签，以反映其在序列中的特定语义或作用。序列标注依赖于上下文信息，因为每个元素的标签往往与其在整个序列中的位置及其相邻元素密切相关。_全连接网络_（Fully Connected Network）虽然可以通过窗口覆盖来考虑局部上下文信息，但在处理可变长度序列时存在局限。具体而言，尽管通过增加窗口大小可以捕获更广泛的上下文信息，但过大的窗口可能导致全连接网络的参数量急剧上升。

_自注意力机制_（Self-Attention）通过计算序列中每个元素与其他所有元素的关系，生成一个新的表示，从而能够融合整个序列的信息并增强上下文的理解能力。Self-Attention 的工作方式是：输入一组向量（如输入序列中的词向量或某个隐藏层的输出），输出一个与输入向量同样维度的新的向量集。这些输出向量是基于整个序列的全局信息计算得到的，而不仅仅是局部的信息。

Self-Attention 可以与全连接网络交替叠加多次，以构建更为复杂的模型结构。在这种架构中，Self-Attention 层负责处理整个序列的全局信息，而逐位置前馈网络（FFN）对每个位置的特征独立进行非线性变换，并在位置间共享参数。值得注意的是，《Attention is All You Need》这篇论文提出了 Transformer 架构，并将 Self-Attention 作为其核心模块之一。正是基于这一机制，使得模型能够高效处理长序列依赖，成为深度学习中的重要创新。

### 点乘注意力

点乘打分用于衡量 query 与 key 的匹配程度。Transformer 使用**缩放点乘注意力**（Scaled Dot-Product Attention），在内积结果上除以键向量维度的平方根：
$$\text{score}(q, k) = \frac{q^\top k}{\sqrt{d_k}}$$

#### 计算过程

假设 Self-Attention 输入的序列为 $$a_1, a_2, a_3, a_4$$，其输出为 $$b_1, b_2, b_3, b_4$$。以输出向量 $$b_1$$ 为例，需要找出与输入向量 $$a_1$$ 相关的输入向量，每个输入向量与 $$a_1$$ 的关联程度用*注意力分数*（Attention Score） $$\alpha_1$$ 来表示。$$a_1$$ 相关的注意力分数的计算步骤如下：

1. 将 $$a_1$$ 与可训练的矩阵 $$W_q$$ 进行线性变换，得到*查询向量*（Query） $$q_1$$。
2. 将 $$a_1, a_2, a_3, a_4$$ 分别与可训练的矩阵 $$W_k$$ 进行线性变换，得到*键向量*（Key） $$k_1, k_2, k_3, k_4$$。
3. 对查询向量 $$q_1$$ 和键向量 $$k_1, k_2, k_3, k_4$$ 进行*点乘*（Dot Product），计算每一对向量之间的关联程度，得到 attention score $$\alpha_{1,1}, \alpha_{1,2}, \alpha_{1,3}, \alpha_{1,4}$$。
<img class="blog-image" src="{{ '/assets/img/blog/transformer/self-attention-computation-01.png' | relative_url }}" alt="自注意力机制与 Transformer：计算过程" width="1114" height="843" loading="lazy" decoding="async">

<aside class="blog-callout" markdown="1">

**提示**

Query 和 Key 分别通过不同的可学习权重矩阵映射而来，使查询与匹配对象能够采用不同的表示，增强注意力机制对复杂关系的建模能力。

</aside>

输出向量 $$b_1$$ 的计算步骤如下：

1. 对 attention score 缩放并应用 softmax 进行归一化，得到最终的注意力权重 $$\alpha'_{1,1}, \alpha'_{1,2}, \alpha'_{1,3}, \alpha'_{1,4}$$。
2. 将 $$a_1, a_2, a_3, a_4$$ 分别与可训练的矩阵 $$W_v$$ 进行线性变换，得到*值向量*（Value） $$v_1, v_2, v_3, v_4$$。
3. 使用归一化后的注意力权重 $$\alpha'_{1,1}, \alpha'_{1,2}, \alpha'_{1,3}, \alpha'_{1,4}$$ 对值向量进行加权求和，得到输出向量 $$b_1$$。
<img class="blog-image" src="{{ '/assets/img/blog/transformer/self-attention-computation-02.png' | relative_url }}" alt="自注意力机制与 Transformer：计算过程" width="1125" height="773" loading="lazy" decoding="async">

在实际实现中，在计算 attention score 时需处理输入序列中因长度不一而产生的 padding 部分。常用的方法是在 attention matrix 中对 padding 位置进行 mask 操作，即用一个掩码矩阵将无效位置的得分设置为极小值（如$$-\infty$$），在经过 softmax 归一化后，这些位置的注意力权重趋近于零，从而保证模型不会关注到无效的 padding 信息，确保模型学习到的上下文信息准确有效。

<aside class="blog-callout" markdown="1">

**提示**

假设 $$q$$ 与 $$k$$ 的各分量相互独立、均值为 0、方差为 1，则 $$q^\top k = \sum_{i=1}^{d_k}q_i k_i$$ 的均值为 0、方差为 $$d_k$$。随着维度增大，较大的点积可能使 softmax 进入梯度很小的区域；除以 $$\sqrt{d_k}$$ 可将上述点积的方差缩放为 1。

</aside>

从矩阵乘法的角度，输出向量 $$b$$ 的计算步骤如下图所示：
<img class="blog-image" src="{{ '/assets/img/blog/transformer/self-attention-computation-03.png' | relative_url }}" alt="自注意力机制与 Transformer：计算过程" width="1093" height="836" loading="lazy" decoding="async">

#### 位置编码

到目前为止，Self-Attention 并未考虑输入序列的位置信息，而对于某些任务，位置信息至关重要。因此，引入了*位置编码*（Positional Encoding）方法，为每个输入位置分配一个*位置向量*（Positional Vector）$$e_i$$，并将其加到输入向量 $$a_i$$ 中。原始 Transformer 采用正余弦函数生成位置向量，其定义如下：

$$\text{PE}_{(pos,2i)} = \sin\left(\frac{pos}{10000^{2i/d_{\text{model}}}}\right), \quad \text{PE}_{(pos,2i+1)} = \cos\left(\frac{pos}{10000^{2i/d_{\text{model}}}}\right)$$

其中，$$pos$$表示位置，$$i$$表示维度索引。正余弦位置编码具有可推广至长序列的能力，且无需训练参数。然而，它的缺点在于缺乏灵活性，无法根据数据自动学习最优的位置表示。

除了正余弦位置编码，近年来发展出多种位置编码方法，包括：

- 可学习的位置编码：直接为每个位置分配一个可训练向量，能够根据具体任务调整位置表示，灵活性高，但泛化到未见长度的能力较差。
- 相对位置编码：如 Transformer-XL 和 T5 提出的机制，编码位置间的相对距离而非绝对位置，提升了对长距离依赖的建模能力，特别适合处理变长序列。
- 旋转位置编码：通过旋转变换引入位置信息，兼具正余弦编码的平滑性和可扩展性，且支持自然的相对位置推断，代表性方法为 [RoFormer](https://arxiv.org/abs/2104.09864) 中的 RoPE。
- 复数位置编码：利用复数域表示位置，有助于捕捉序列的周期性特征，但目前应用较少，主要停留在理论探索阶段。
  不同位置编码方法在计算复杂度、训练稳定性和推广性等方面各有优劣，实际应用中需根据任务特点和资源条件选择合适的策略。

#### 复杂度推导

- 线性变换（得到$$Q$$、$$K$$、$$V$$）：
  - 输入$$n \times d$$的矩阵，乘以$$d \times d$$的权重矩阵（$$W_Q$$, $$W_K$$, $$W_V$$）各一次，3 次线性变换是：$$O(3nd^2)$$
- attention score 计算（$$QK^T$$）+softmax 归一化：
  - $$Q$$：$$n \times d$$，$$K$$：$$n \times d$$，计算$$QK^T$$：$$O(n^2d)$$
  - $$QK^T$$：$$n \times n$$，每一个元素除以$$\sqrt{d_k}$$后做 Softmax：$$O(2n^2)$$（可以忽略，因为$$n^2$$比$$n^2d$$小很多）
- attention 输出（加权求和值）：
  - attention 权重（$$n \times n$$） 乘以 $$V$$（$$n \times d$$）：$$O(n^2d)$$

点乘注意力总复杂度（忽略常数）：
$$O(nd^2 + n^2d)$$

#### 对比加性注意力

_加性注意力_（Additive Attention）最早由 Bahdanau 等人在 2015 年的论文《Neural Machine Translation by Jointly Learning to Align and Translate》中提出。其核心思想是通过一个小型前馈神经网络来计算 query 和 key 之间的相似性分数：
$$\text{score}(q, k) = v^\top \tanh(W_q q + W_k k)$$

在 attention score 时，Transformer 采用的是点乘而非加法。主要原因在于**点乘注意力可以借助矩阵乘法实现高度并行化**，计算复杂度为$$O(n^2d)$$（$$n$$为序列长度，$$d$$为特征维度）；而加性注意力需逐对计算每一组$$(Q,K)$$的匹配程度，复杂度为$$O(n^2d')$$（$$d'$$为隐层维度，通常$$d' < d$$但差异不大），实现中会产生额外的逐对非线性计算。两者理论复杂度相近，点乘打分更便于利用优化矩阵乘法。

### 变体

Self-Attention 利用 query 搜索相关的 key，但“相关性”的形式可能多种多样，因此需要多个 query 来捕捉不同类型的关系。为此，提出了*多头自注意力机制*（Multi-Head Self-Attention）。以 2 个注意力头为例，其计算过程如下：

1. 对查询向量 $$q_i$$ 进行线性变换，分别得到 $$q_{i,1}$$ 和 $$q_{i,2}$$，键向量 $$k_i$$ 和值向量 $$v_i$$ 也经过类似变换。
2. 每个注意力头独立计算输出向量 $$b_{i,1}$$ 和 $$b_{i,2}$$。
3. 将多个注意力头的输出拼接，并通过一个线性变换得到最终的输出向量 $$b_i$$。
<img class="blog-image" src="{{ '/assets/img/blog/transformer/multi-head-attention.png' | relative_url }}" alt="自注意力机制与 Transformer：变体" width="1125" height="853" loading="lazy" decoding="async">

在 Multi-Head Attention 中，输入先经过可学习的线性投影，得到各头的 Query、Key 和 Value，再分别计算注意力。标准设置中，输入维度为$$d_{\text{model}}$$，头数为$$h$$，每个头的维度为 $$d_{\text{head}} = \frac{d_{\text{model}}}{h}$$。各头的输出拼接后，再通过输出投影形成最终表示。**不同的投影使多个头能够在相同输入上捕捉不同的特征或关系**。

在语音处理任务中，也可以应用 Self-Attention。然而，由于语音序列的向量表示通常较长，Attention 矩阵的规模随着输入序列长度的平方增长，计算成本较高。为此，提出了*截断自注意力机制*（Truncated Self-Attention）。该方法仅计算输入序列的局部依赖关系，而非全局关联，从而减少计算量并提高处理效率。

### 与其他神经网络的比较

在 CNN 中，每个神经元关注局部*感受野*（Receptive Field）内的信息，通过层级堆叠扩大感受范围；Self-Attention 则直接建模序列中各位置之间的关系。

RNN 依赖存储在 Memory 中的历史信息，并且在处理多个输入向量时无法并行计算，而 Self-Attention 仅需计算 Query 与 Key 的关系即可，并且能够并行处理所有输出，极大提升了计算效率。

## Transformer

### 引入

Transformer 是一种典型的*序列到序列*（Sequence-to-Sequence, Seq2Seq）结构，其输出长度由模型动态决定。Seq2Seq 模型广泛应用于 NLP 领域的多种任务，包括*语音识别*（Speech Recognition）、_机器翻译_（Machine Translation）以及*语音翻译*（Speech Translation）（无文字记录的口语语言）。

以语音翻译为例，可以利用如 YouTube 上乡土剧的台语语音及中文字幕构建数据集，在处理噪声、字幕对齐与数据质量后，训练端到端翻译模型。此外，很多 NLP 任务都可看作*问答系统*（Question Answering, QA），QA 任务亦可建模为 Seq2Seq 问题：输入为问题和上下文，输出为对应答案。如下图所示，QA 任务可以自然地映射为一个 Seq2Seq 的生成过程：
<img class="blog-image" src="{{ '/assets/img/blog/transformer/question-answering-seq2seq.png' | relative_url }}" alt="自注意力机制与 Transformer：引入" width="926" height="527" loading="lazy" decoding="async">

即便是传统上不被视为 Seq2Seq 问题的任务，如*句法分析*（Syntactic Parsing），也可以建模为 Seq2Seq 任务，将输入句子映射为对应的树状结构，如下图所示：
<img class="blog-image" src="{{ '/assets/img/blog/transformer/syntactic-parsing-seq2seq.png' | relative_url }}" alt="自注意力机制与 Transformer：引入" width="1078" height="758" loading="lazy" decoding="async">

Transformer 主要由编码器（Encoder）和解码器（Decoder）两部分组成。

### 编码器（Encoder）

Encoder 的任务是将输入向量序列编码成高维表示。Transformer 的 Encoder 由多层堆叠的 Self-Attention 构成。每个 block 内，Self-Attention 的输出结果均使用*残差连接*（Residual Connection）与*层归一化*（Layer Normalization），最后输出给*全连接层*（Fully Connected Network）。引入残差结构的主要目的是缓解深层神经网络训练中的梯度消失问题，并有效支持更深层次模型的构建。Transformer 的 Encoder 内部结构如下图所示：
<img class="blog-image" src="{{ '/assets/img/blog/transformer/transformer-encoder.png' | relative_url }}" alt="自注意力机制与 Transformer：Encoder" width="1138" height="864" loading="lazy" decoding="async">

需要指出的是，Batch Normalization 是对一个 batch 中所有样本同一特征维度进行归一化，对 batch size 敏感，且在序列模型或小批量训练场景下表现不佳。而 Layer Normalization 则是对单一样本的所有特征维度进行归一化，在 Transformer 中通常沿每个 token 的隐藏特征维度归一化，不依赖批内其他样本的统计量。

### 解码器（Decoder）

Decoder 同样由多层堆叠的模块组成。在结构上，除去灰色方框遮住的部分（Cross attention），Decoder 和 Encoder 类似，如下图所示：
<img class="blog-image" src="{{ '/assets/img/blog/transformer/transformer-decoder.png' | relative_url }}" alt="自注意力机制与 Transformer：Decoder" width="932" height="831" loading="lazy" decoding="async">

此外，Decoder 阶段的*掩蔽多头注意力*（Masked Multi-Head Attention），与 Encoder 阶段的 Multi-Head Attention 存在关键差异。Encoder 的自注意力允许每个位置自由关注序列中任意其他位置，实现全局依赖建模；而 Decoder 的自注意力须防止未来信息泄露，通过对未生成的未来位置施加负无穷大掩码，使得在 softmax 归一化后，这些位置的注意力权重为零，即每个输入的 query 只与当前及之前的键值对计算注意力权重。如下图所示，计算$$b^2$$时， $$q^2$$只和$$(k^1,v^1),(k^2,v^2)$$计算注意力权重，而不考虑之后的$$(k^3,v^3),(k^4,v^4)$$：
<img class="blog-image" src="{{ '/assets/img/blog/transformer/causal-attention-mask.png' | relative_url }}" alt="自注意力机制与 Transformer：Decoder" width="1117" height="702" loading="lazy" decoding="async">

原始 Transformer 使用自回归（AR）解码器，后续研究发展出非自回归（NAR）解码方案。两者的序列生成方式如下。

AR Decoder 在生成序列时依赖先前的输出。例如在语音识别任务中，Decoder 首先接收 Encoder 的输出，并输入特殊的起始符号（START Token），经过 Decoder 处理生成下一个 token（如“机”字），该输出随后作为输入递归生成下一个 token（如“器”字），以此类推，如下图所示：
<img class="blog-image" src="{{ '/assets/img/blog/transformer/autoregressive-decoding-01.png' | relative_url }}" alt="自注意力机制与 Transformer：Decoder" width="1122" height="761" loading="lazy" decoding="async">
<img class="blog-image" src="{{ '/assets/img/blog/transformer/autoregressive-decoding-02.png' | relative_url }}" alt="自注意力机制与 Transformer：Decoder" width="1091" height="747" loading="lazy" decoding="async">

NAR Decoder 则一次性生成整个序列，不依赖先前输出，极大提升推理并行性。如何确定生成序列的结束？常见做法包括基于编码器输出预测解码器的输出长度，或通过引入特殊的停止符（END Token），截取其之前的 sequence 作为输出。AR 和 NAR 的结构对比如下：
<img class="blog-image" src="{{ '/assets/img/blog/transformer/autoregressive-vs-nonautoregressive.png' | relative_url }}" alt="自注意力机制与 Transformer：Decoder" width="1030" height="753" loading="lazy" decoding="async">

**自回归推理**逐步生成 token，后一步依赖前面已生成的结果。训练时采用 **Teacher Forcing**，将真实目标序列右移后送入 Decoder，配合因果掩码同时计算各位置的预测与损失。NAR 则在推理阶段并行预测多个位置，减少逐步生成带来的等待。

此外，NAT 在生成过程中可以预测输出序列的长度。例如，在语音合成任务中，可以在 Encoder 输出基础上添加一个 Classifier，预测 Decoder 输出的帧数；在固定声学帧率下，帧数与生成语音时长对应。

### 交叉注意力（Cross-Attention）

Encoder 和 Decoder 之间通过*交叉注意力*（Cross-Attention）建立联系。具体而言，Decoder 的 query 向量与 Encoder 输出的 key、value 向量进行注意力计算，如下图所示：
<img class="blog-image" src="{{ '/assets/img/blog/transformer/cross-attention.png' | relative_url }}" alt="自注意力机制与 Transformer：Cross attention" width="1074" height="842" loading="lazy" decoding="async">

在早期基于 RNN 的 Seq2Seq 模型中，Encoder 和 Decoder 均采用 RNN 结构。Decoder 仅依赖 Encoder 在序列末尾的最终隐藏层输出，这在处理长序列时容易导致信息压缩和遗失。为缓解这一问题，引入了 Cross-Attention，使 Decoder 能根据不同时间步的 Encoder 隐藏层输出动态调整关注范围。Transformer 架构进一步扩展了这一思想，完全基于 Self-Attention 和 Cross-Attention 构建 Encoder-Decoder 架构，替代 RNN，正如其论文标题所言“Attention Is All You Need”。

标准 Transformer 中每层 Decoder 都与 Encoder 的最终输出进行交叉注意力，但也存在基于不同设计的研究和变体，探索性能优化的可能性。

## 序列生成的训练与解码

Transformer 模型的训练目标是最小化 Decoder 输出分布与*真实标签*（Ground Truth）之间的*交叉熵*（Cross-Entropy）损失，实质上是一个多类分类问题。以下介绍序列生成中的复制机制、对齐约束、推理解码，以及训练目标与评估指标。

### 复制机制

在某些任务中，如翻译专有名词（地名、人名）或生成摘要时，直接复制输入文本中的一部分信息是合理的。Copy Mechanism 通过引入复制概率，有效提升了模型在处理此类任务时的性能。

### 对齐引导

在语音识别或语音合成任务中，模型需要准确地对齐输入与输出。以语音合成为例，机器一次说四遍“发财”，说得挺好，还有抑扬顿挫之感；一次说三遍或两遍“发财”也正常；但是一次说一遍“发财”时，只有一个音“财”。

Guided Attention 是一种旨在规范注意力计算顺序的方法。以语音合成为例，随着输入的推进，输出也应依序生成，因此，理想的注意力分布应当自左至右平滑推进，形成接近对角线的注意力矩阵，如图中前三幅所示。如果注意力计算出现无序跳跃，则可能导致模型生成错误的输出，如图中后三幅所示。
<img class="blog-image" src="{{ '/assets/img/blog/transformer/guided-attention.png' | relative_url }}" alt="自注意力机制与 Transformer：Guided Attention" width="1134" height="803" loading="lazy" decoding="async">

为此，研究者提出了 Monotonic Attention 和 Location-Aware Attention 等机制，前者通过约束注意力的累积概率，确保注意力机制在时间上保持单调性；后者则结合当前位置的历史注意力分布，引导模型关注局部邻域，增强注意力的平滑性和连贯性。

需要注意的是，Guided Attention 与 Attention Masking 在机制上有所不同。Attention Masking 主要用于阻止模型在计算注意力权重时访问不应处理的位置，如在 AT 模型中防止模型泄露未来信息（即通过上三角矩阵遮蔽未来时间步），其本质是**信息屏蔽**。而 Guided Attention 更关注于引导注意力矩阵的形状，通过增加特定的正则化项，引导注意力分布沿对角线展开，强化输入输出间的合理对齐关系，其本质是**对齐引导**。两者分别针对不同的问题场景，且在模型训练过程中可结合使用，以提升生成质量和稳定性。

### 束搜索与采样

在序列生成任务中，Decoder 需要逐步生成目标序列的每一个元素。若每一步都贪心地选择当前概率最大的输出，即进行*贪心解码*（Greedy Decoding），可能导致整体序列的概率并非最优，如图中红色路径所示。_束搜索_（Beam Search）在每一步保留概率最高的前 k 个候选，并在此基础上逐步扩展候选路径，近似搜索高概率序列，如图中绿色路径所示。
<img class="blog-image" src="{{ '/assets/img/blog/transformer/beam-search-01.png' | relative_url }}" alt="自注意力机制与 Transformer：Beam Search" width="1069" height="747" loading="lazy" decoding="async">

然而，Beam Search 在一些生成式任务中效果却未必理想，往往容易生成高度重复、缺乏多样性的输出。如图所示，在文本生成任务中，Beam Search 生成的文本存在明显的重复问题，而使用 Pure Sampling 生成的文本则更加自然多样。
<img class="blog-image" src="{{ '/assets/img/blog/transformer/beam-search-02.png' | relative_url }}" alt="自注意力机制与 Transformer：Beam Search" width="1150" height="635" loading="lazy" decoding="async">

对于有明确答案的任务，如语音识别，Beam Search 通常能取得良好效果；但对于需要创造性或多样性的生成任务，如文本生成或语音合成，过于确定性的搜索反而导致结果缺乏自然性。李宏毅老师提到，早期团队在进行语言合成实验时，与 Google 研究人员交流后得知，在测试阶段为 Decoder 添加噪声反而能提升合成语音的自然度。这种方法虽看似违反直觉，但实验证明有效。训练时引入噪声以增强模型鲁棒性已较为常见，而测试时加噪声能防止 Decoder 过度集中于少数模式，从而生成更接近人类语音或文本的结果。

### 训练目标与评估指标

训练过程中，采用 Cross-Entropy 作为损失函数，旨在逐步最小化模型输出分布与 Ground Truth 之间的差异。然而，在验证阶段和最终评估时，模型性能往往通过 BLEU（Bilingual Evaluation Understudy）等序列级指标进行衡量。虽然从直觉上看，直接以 BLEU score 作为训练目标似乎更合理，但由于 BLEU score 是离散且不可导的，无法直接应用标准的梯度下降方法进行优化。

BLEU 基于候选文本与参考文本的 n-gram 匹配及长度惩罚进行评估，与逐词预测准确率存在本质差异，导致*目标函数与评估指标不一致*（Objective-Evaluation Mismatch）的问题。尽管如此，交叉熵最小化通常仍能有效提升 BLEU score 的表现：

- BLEU 本质上依赖于 n-gram 匹配，n-gram 匹配要求序列中局部连续词组正确。而交叉熵最小化提高了单词的预测精度，从而提升短 n-gram 的准确率，间接促使 BLEU score 上升。
- 交叉熵训练使模型输出接近真实数据分布，BLEU 评估也是基于真实样本。因此，从分布一致性角度，交叉熵训练有助于模型生成高质量文本。

为解决此问题，研究者提出了结合*强化学习*（Reinforcement Learning, RL）的方法。通过将 BLEU score 视为强化学习中的 Reward，可以采用 Policy Gradient 等算法，优化模型在完整序列上的表现。

### 暴露偏差

训练阶段，Decoder 接收的输入均为 Ground Truth。然而，在推理阶段，模型需基于自己之前的预测进行生成，若早期预测出错，将可能导致后续输出累积性错误。为缓解*暴露偏差*（Exposure Bias），提出了 Scheduled Sampling 策略：在训练阶段有一定概率用模型自己的预测替代 Ground Truth 作为 Decoder，从而使模型逐步适应推理时可能出现的错误情境。下图展示了 Scheduled Sampling 的基本思路：
<img class="blog-image" src="{{ '/assets/img/blog/transformer/exposure-bias.png' | relative_url }}" alt="自注意力机制与 Transformer：Exposure Bias" width="1048" height="730" loading="lazy" decoding="async">

## 参考资料

- [Vaswani et al.：Attention Is All You Need](https://arxiv.org/abs/1706.03762)
- [Su et al.：RoFormer: Enhanced Transformer with Rotary Position Embedding](https://arxiv.org/abs/2104.09864)
- [李宏毅：机器学习课程资料](https://speech.ee.ntu.edu.tw/~hylee/ml/2021-spring.php)
