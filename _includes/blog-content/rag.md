## RAG 概述

检索增强生成（Retrieval-Augmented Generation, RAG），通过检索外部知识，为 LLM 生成回答提供相关上下文，有助于减少缺乏依据的回答，但不能保证消除幻觉。对于用户提问，先从外部数据库中检索出和问题相关的信息，然后让 LLM 结合这些相关信息来生成结果。基础 RAG 流程可以不重新训练生成模型，适用于引入 LLM 未曾学习的互联网上的新信息、专有业务背景或内部机密文件等。

利用检索来增强 LLM 的输出，其中很重要的一步是运用检索技术从外部数据集中定位相关的信息片段。这些片段随后被融入模型的上下文，作为生成回复时的重要参考。虽然 LLM 的上下文窗口不断扩大，但这并不意味着检索步骤就变得多余，转而倾向于直接在上下文提供尽可能多的信息。[《Lost in the Middle: How Language Models Use Long Contexts》](https://arxiv.org/abs/2307.03172)的实验结果表明，提供少量高度相关的信息，相较于大量未经筛选的数据，LLM 回复的准确性和相关性更高。利用检索技术从大量外部数据中提取与输入问题最相关的信息片段，不仅为 LLM 生成回复提供了参考，也剔除了冗余和无关信息的干扰。

### RAG 和微调的区别

RAG 和微调（Fine-tuning）都是提升预训练模型性能的方法。追求外部知识与决策过程透明度时，首选 **RAG**；若正在使用稳定的标注数据，旨在紧密贴合特定需求，首选**微调**。

<img class="blog-image" src="{{ '/assets/img/blog/rag/rag-vs-fine-tuning.jpg' | relative_url }}" alt="RAG 和微调的区别" width="1051" height="1100" loading="lazy" decoding="async">

- **外部知识需求**：RAG 适用于需要查询外部数据源的场景；微调通过训练调整模型参数以适应任务、领域或输出风格，并不保证精确存储全部训练事实。
- **模型适应性**：RAG 注重信息检索能力；微调适应特定风格或领域。
- **解决幻觉**：RAG 依据检索到的证据抑制无根据信息生成；微调在不熟悉的输入下可能仍会产生幻觉。
- **训练数据需求**：RAG 可利用未标注的外部数据源；监督微调通常依赖高质量示例；其他训练方式所需的数据形式不同。
- **数据动态性**：RAG 可查询最新外部数据源，来反映数据更新；微调需要定期重新训练，来保持模型更新。
- **数据可解释性**：RAG 提供答案来源，提高模型决策的透明度；微调本身不提供可核查的外部证据引用；它也可以与 RAG 结合使用。

### RAG 应用场景

#### 长尾知识

长尾知识，指的是那些分布稀疏、出现频率低的信息，这些知识往往未能被包含在庞大的训练数据集中，导致 LLM 难以全面掌握所有细节。虽然当前 LLM 的训练数据量已经非常庞大，动辄百 GB 级别的数据量，万亿级别的标记数量（Token），模型参数量从数十亿到千亿级别，但让 LLM 用有限的参数记住所有知识是不现实的，训练数据的涵盖范围也是有限的，总会有一些长尾知识在训练数据中不能覆盖到。

直观上，提高训练数据中长尾知识的比例或增加模型参数规模似乎是提升 LLM 对长尾知识学习能力的有效途径。事实上，[《Large Language Models Struggle to Learn Long-Tail Knowledge》](https://arxiv.org/abs/2211.08411)的实验结果也提供了实验数据支撑，但这两种策略是不经济的，因为需要投入巨量的数据和计算资源才能显著提高 LLM 在长尾知识上的表现。相比之下，采用 RAG 技术在 LLM 推理阶段把相关信息作为上下文给出，既能显著提升 LLM 对长尾知识的回复准确性，也是一种比较经济的策略。

#### 私有数据

通用 LLM 预训练阶段主要利用公开数据，不含私有数据，因此 LLM 在处理特定企业内部知识时，往往无法提供准确的答案。在预训练阶段加入私有数据或利用私有数据进行微调虽然理论上可行，但实际上会面临高昂的训练和迭代成本和潜在的隐私泄露风险。[《Extracting Training Data from Large Language Models》](https://arxiv.org/abs/2012.07805)就通过构造的 Query 从 GPT-2 模型中提取出了个人公开的姓名、 邮箱、电话号码和地址信息等，即使这些信息可能只在训练数据中出现一次。

将私有数据作为独立的外部数据库，当用户询问与私有数据相关的问题时，LLM 可以通过检索机制从外部数据库中查找相关信息，然后结合检索到的数据生成回答。这种方法不仅减少了对模型进行昂贵的预训练或微调的需求，并使知识更新和访问控制可以在检索层管理。外部知识仍会进入生成上下文，因此还需要按实际部署边界控制检索权限与模型访问。

#### 数据可解释性

通常情况下，LLM 的输出不会给出其来源，用户难以理解模型是如何得出某一结论或生成特定文本的。通过给 LLM 提供外部数据源，让其基于检索结果生成回复，系统可保留文档标识、片段与引用，将回答关联到检索证据。不过，检索到证据不等于回答忠实使用了证据，仍需检查引用是否真实支持对应结论。

#### 数据新鲜度

由于 LLM 学习的知识依赖于其训练数据集，对于更新频率较高的信息，LLM 在未接受相应新数据训练的情况下，难以提供最新、最准确的反馈。为克服这一局限，可以考虑将频繁更新的知识作为外部数据库。当 LLM 在处理需要最新信息的任务时，无需重新训练整个模型即可保持其信息的新鲜度。

### RAG 性能评估

#### 噪声鲁棒性

所谓噪声文档，是指虽与问题相关，但并未提供解答所需的具体信息的文档。衡量模型在面对包含无关或误导性信息的文档时，是否仍能准确提炼出与问题相关的关键内容。例如，在提问“谁荣获 2022 年诺贝尔文学奖？”时，噪声文档包括有关 2021 年诺贝尔文学奖的报道。

#### 否定拒绝

考察模型在未能从检索文档中找到确切答案时，是否具备表达“信息不足”的能力。否定拒绝测试聚焦于仅有噪声文档的情况，模型预计会发出“信息不足”或其他拒绝信号。

#### 信息整合

检验模型是否能够综合分析多源文档，以解答需要跨文档信息关联的复杂问题。例如，“ChatGPT iOS 应用与 ChatGPT API 分别于何时发布？”这类问题，要求模型不仅需从各自独立的文档中提取具体日期，还须将这些碎片化信息整合成完整答案。信息整合测试聚焦于仅凭单一文档无法作答的问题。

#### 反事实鲁棒性

考察模型在接收到关于检索信息潜在风险的指令后，能否有效识别已知事实偏差。反事实鲁棒性测试聚焦于问题本身可以直接由模型解答，但外部文档可能包含与事实相悖的信息的情况。

## RAG From Scratch 课程笔记

课程 Notebooks：[langchain-ai/rag-from-scratch (github.com)](https://github.com/langchain-ai/rag-from-scratch/tree/main)
课程视频：[RAG From Scratch (youtube.com)](https://www.youtube.com/playlist?list=PLfaIDFEXuae2LXbO1_PKyVJiQ23ZztA0x&feature=shared)
LangChain：[Quickstart | LangChain](https://python.langchain.com/v0.1/docs/use_cases/question_answering/quickstart/)
LangSmith：[Get started with LangSmith](https://docs.smith.langchain.com/)

### 概览与代码范围

本节保留 2024 年课程中 LangChain 0.1／0.2 风格的代码与模块命名，示例之间共享先前定义的模型、检索器和变量。它们是对应 Notebook 的局部片段，不是逐块独立运行的完整脚本；复现时应固定课程仓库提交与依赖，不应将旧导入路径直接视为当前版本 API。

<img class="blog-image" src="{{ '/assets/img/blog/rag/rag-from-scratch-overview.png' | relative_url }}" alt="Rag From Scratch: Overview" width="1203" height="894" loading="lazy" decoding="async">

#### 环境与依赖

1. 依赖

```bash
# 在固定提交的课程仓库内，使用该提交的依赖文件
python -m pip install -r requirements.txt
```

2. LangSmith（可选）

```python
import os
from getpass import getpass

os.environ['LANGCHAIN_TRACING_V2'] = 'true'
os.environ['LANGCHAIN_ENDPOINT'] = 'https://api.smith.langchain.com'
os.environ['LANGCHAIN_API_KEY'] = getpass('LangSmith API key: ')
```

3. 模型服务密钥

```python
os.environ['OPENAI_API_KEY'] = getpass('Model service API key: ')
```

#### 基础问答链

[RAG quickstart](https://python.langchain.com/docs/use_cases/question_answering/quickstart)

```python
import bs4
from langchain import hub
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import WebBaseLoader
from langchain_community.vectorstores import Chroma
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

#### INDEXING ####

# Load Documents
loader = WebBaseLoader(
    web_paths=("https://lilianweng.github.io/posts/2023-06-23-agent/",),
    bs_kwargs=dict(
        parse_only=bs4.SoupStrainer(
            class_=("post-content", "post-title", "post-header")
        )
    ),
)
docs = loader.load()

# Split
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
splits = text_splitter.split_documents(docs)

# Embed
vectorstore = Chroma.from_documents(documents=splits,
                                    embedding=OpenAIEmbeddings())

retriever = vectorstore.as_retriever()

#### RETRIEVAL and GENERATION ####

# Prompt
prompt = hub.pull("rlm/rag-prompt")

# LLM
llm = ChatOpenAI(model_name="gpt-3.5-turbo", temperature=0)

# Post-processing
def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

# Chain
rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

# Question
rag_chain.invoke("What is Task Decomposition?")
```

### 查询转换（Query Translation）

本节方法：[多查询](#multi-query) · [RAG-Fusion](#rag-fusion) · [问题分解](#decomposition) · [Step-back](#step-back) · [HyDE](#hyde)。这些是可选择、可组合的方法，不是每次检索必须顺序执行的步骤。

在课程的查询处理模块中，Query Translation 指查询转换，是一系列针对重写或修改问题以进行检索的方法，目的是把用户描述得比较模糊的 query 变成一种更易于检索的形式。

<img class="blog-image" src="{{ '/assets/img/blog/rag/query-translation.png' | relative_url }}" alt="Query Translation" width="420" height="194" loading="lazy" decoding="async">

要达到这个目的有以下几种方式：

- **Re-written**：用多种方式、从多种角度重写 query
- **Sub-question**：把 query 分解成多个 query
- **Step-back question**：让 query 变得更加抽象、概括

<img class="blog-image" src="{{ '/assets/img/blog/rag/query-transformation-strategies.png' | relative_url }}" alt="General approaches to transform questions" width="1239" height="565" loading="lazy" decoding="async">

#### Multi Query

Multi Query Retriever 使用 LLM 从不同角度为给定的 question 生成多个查询，以改进基于距离的向量数据库检索。通过合并多个查询结果（求并集），它可以扩展候选文档覆盖范围；是否提高相关性仍取决于生成查询与合并结果的质量。

<img class="blog-image" src="{{ '/assets/img/blog/rag/multi-query-retrieval.png' | relative_url }}" alt="Multi Query" width="1678" height="530" loading="lazy" decoding="async">

#### RAG-Fusion

课程示例中与简单合并多查询结果的主要区别是，对多个查询结果应用了倒数排序融合（Reciprocal Rank Fusion, RRF）算法。RRF 的基本思想是对文档在各个查询结果中的排名进行加权融合，得到一个新的综合排名。

<img class="blog-image" src="{{ '/assets/img/blog/rag/rag-fusion.png' | relative_url }}" alt="RAG-Fusion" width="1912" height="542" loading="lazy" decoding="async">

```python
def reciprocal_rank_fusion(results: list[list], k=60):
    from langchain.load import dumps, loads

    fused_scores = {}

    for docs in results:
        for rank, doc in enumerate(docs):
            # 将文档转换为字符串格式以用作密钥（假设文档可以序列化为 JSON 格式）
            doc_str = dumps(doc)
            # 如果文档尚未出现在 fused_scores 字典中，则添加该文档，初始分值为0
            if doc_str not in fused_scores:
                fused_scores[doc_str] = 0
            # 如果有的话，读取文件的当前分数
            previous_score = fused_scores[doc_str]
            # 使用 RRF 公式更新文档得分: 1 / (rank + k)
            fused_scores[doc_str] += 1 / (rank + k)

    # 根据文档的融合得分从高到低排序，得到最终的重新排序结果
    reranked_results = [
        (loads(doc), score)
        for doc, score in sorted(fused_scores.items(), key=lambda x: x[1], reverse=True)
    ]

    # 以元组列表形式返回重排序结果，每个元组包含文档及其融合得分
    return reranked_results
```

RRF 公式用于计算每个文档的得分，公式如下：
$$\mathrm{Score}(d)=\sum_{j:d\in R_j}\frac{1}{k+\mathrm{rank}_j(d)}$$
其中，`rank`是文档在某个查询结果列表中的排名（从 0 开始），`k`是平滑参数。
k：平滑参数，默认值为 60。用于控制名次差异的影响；较大的 k 会减弱头部名次之间的相对差异。公式与示例均采用从 0 开始的排名约定；其他实现可能从 1 开始。

#### Decomposition

该策略将一个 question 拆解成多个 sub-question，主要有两种实现方式：

- 顺序解决（Sequentially Solved）：
  每个 sub-question 的答案可能会影响后续 sub-question 的解答。类似于一个逐步推理的过程，通过前面的答案一步步明确接下来的问题。

<img class="blog-image" src="{{ '/assets/img/blog/rag/sequential-query-decomposition.png' | relative_url }}" alt="Decomposition Sequentially Solved" width="1132" height="386" loading="lazy" decoding="async">

```python
q_a_pairs = ""
for q in questions:

    rag_chain = (
    {"context": itemgetter("question") | retriever,
     "question": itemgetter("question"),
     "q_a_pairs": itemgetter("q_a_pairs")}
    | decomposition_prompt
    | llm
    | StrOutputParser())

    # 通过累积 q_a_pairs，之前的问题和答案不断地加入到背景信息中，使得LLM在处理当前问题时能参考之前问答的内容
    answer = rag_chain.invoke({"question":q,"q_a_pairs":q_a_pairs})
    q_a_pair = format_qa_pair(q,answer)
    q_a_pairs = q_a_pairs + "\n---\n"+  q_a_pair
```

- 独立回答合并结果（Independently Answered Followed by Consolidation）：
  每个 sub-question 的答案不会影响其他 sub-question 的解答。将所有 sub-question 的答案进行合并，从而得出一个全面的答案。

<img class="blog-image" src="{{ '/assets/img/blog/rag/parallel-query-decomposition.png' | relative_url }}" alt="Decomposition Independently Answered Followed by Consolidation" width="1436" height="400" loading="lazy" decoding="async">

```python
def format_qa_pairs(questions, answers):
    """Format Q and A pairs"""

    formatted_string = ""
    for i, (question, answer) in enumerate(zip(questions, answers), start=1):
        formatted_string += f"Question {i}: {question}\nAnswer {i}: {answer}\n\n"
    return formatted_string.strip()

context = format_qa_pairs(questions, answers)
```

#### Step Back

反向推进提示（[Step-back Prompting](https://arxiv.org/abs/2310.06117)），基于思维链推理（Chain-of-thought Reasoning）来进行。从一个具体的问题出发，通过给一些 few-shot 的方式，生成一个更高层次、更抽象的问题，以便于检索到相关文档，这在需要额外背景信息或基本概念理解的情况下尤其有用。例如：

- "Why did the stock price of Company XYZ drop in Q3 2023?"（2023 年第三季度 XYZ 公司股价为何下跌？）通过 Step-back prompting 方法，可以生成一个更高层次的问题：
- "What are the common reasons for a company's stock price to drop?"（公司股价下跌的一般原因是什么？）

#### HyDE

考虑到多数方法都是通过计算 query 和文档的相似度来检索文档的，但实际上 query 和文档是差异较大的文本对象。假设文档嵌入（Hypothetical Document Embeddings, [HyDE](https://arxiv.org/abs/2212.10496)）根据用户输入的 query 生成一些假设的文档，将这些文档转换为向量形式，利用这些向量从一个索引中检索相关的文档。例如：

- query: "What are the health benefits of green tea?"（绿茶的健康益处是什么？）
- HyDE 方法就会生成一个或多个假设文档：一篇关于绿茶中含有的抗氧化剂及其对健康好处的文档；一篇讨论绿茶对心血管健康的影响的文档等。

### 路由（Routing）

Routing 用于在可用的数据源或处理路径中选择适合的路径，目的是将 query 路由到正确的数据源，实际上就是一个分类任务。

<img class="blog-image" src="{{ '/assets/img/blog/rag/query-routing.png' | relative_url }}" alt="Routing" width="420" height="235" loading="lazy" decoding="async">

假设我们有多个索引，一个索引包含了所有与 LangChain 相关的 Python 文档，另一个索引包含了所有与 LangChain 相关的 javaScript 文档。例如：

- query: "如何在 LangChain 中使用 Python 进行文本分析？"
  - 选择包含所有 LangChain Python 文档的索引进行查询。
- query: "LangChain 的 JS 库是否支持 WebSocket？"
  - 选择包含所有 LangChain JavaScript 文档的索引进行查询。

#### Logical routing

<img class="blog-image" src="{{ '/assets/img/blog/rag/logical-routing-01.png' | relative_url }}" alt="Logical routing 1" width="1039" height="528" loading="lazy" decoding="async">

使用 function calling 得到结构化的输出

<img class="blog-image" src="{{ '/assets/img/blog/rag/logical-routing-02.png' | relative_url }}" alt="Logical routing 2" width="1692" height="352" loading="lazy" decoding="async">

#### Semantic routing

通过语义相似度进行路由，query 通过 embeddings 路由到最相关的 prompt。

<img class="blog-image" src="{{ '/assets/img/blog/rag/semantic-routing.png' | relative_url }}" alt="Semantic routing" width="880" height="414" loading="lazy" decoding="async">

```python
def prompt_router(input):
    # Embed question
    query_embedding = embeddings.embed_query(input["query"])
    # Compute similarity
    similarity = cosine_similarity([query_embedding], prompt_embeddings)[0]
    most_similar = prompt_templates[similarity.argmax()]
    # Chosen prompt
    print("Using MATH" if most_similar == math_template else "Using PHYSICS")
    return PromptTemplate.from_template(most_similar)
```

### 查询结构化（Query Construction）

Query Construction 用于构造结构化查询，就是将自然语言形式的 query 转换为结构化语言，以便于进行有效搜索和过滤。

<img class="blog-image" src="{{ '/assets/img/blog/rag/query-construction-overview.png' | relative_url }}" alt="Query Construction 1" width="556" height="162" loading="lazy" decoding="async">

将自然语言形式的 query 输入转化为正确的搜索和过滤参数。这一过程被称为 query structuring。

<img class="blog-image" src="{{ '/assets/img/blog/rag/structured-query-schema.png' | relative_url }}" alt="Query structuring" width="1992" height="388" loading="lazy" decoding="async">

- query: "how to use multi-modal models in an agent, only videos under 5 minutes"
  - content_search: multi-modal models agent
  - title_search: multi-modal models agent
  - max_length_sec: 300

Query Construction 的几个示例：Query Construction (langchain.dev)

<img class="blog-image" src="{{ '/assets/img/blog/rag/query-constructor.png' | relative_url }}" alt="Query Construction 2" width="990" height="431" loading="lazy" decoding="async">

#### Text-to-metadata-filter

配备元数据过滤功能的向量存储可以通过结构化查询来过滤嵌入的非结构化文档。自查询检索器（Self-query Retriever）可通过几个步骤将自然语言 query 转化为结构化 query：

1. **数据源定义**：Self-query Retriever 的核心是明确指定相关元数据文件。例如，在歌曲检索中，元数据可能是艺术家、长度和流派。
2. **用户查询解释**：给定一个自然语言 query，Self-query Retriever 将分离出 query（用于语义检索）和 filter（用于元数据过滤）。
3. **逻辑条件提取**：过滤器是由向量存储定义的比较器和运算符（如 eq、lt）来构建的。
4. **结构化请求形成**：最后，Self-query Retriever 将结构化 query 组装起来，将 query 与 filter 分开，从而简化文档检索流程。

```python
# 生成 prompt 并解析输出
prompt = get_query_constructor_prompt(document_content_description, metadata_field_info)
output_parser = StructuredQueryOutputParser.from_components()
query_constructor = prompt | llm | output_parser

# 使用示例 query 调用 query constructor
query_constructor.invoke({
 "query": "Songs by Taylor Swift or Katy Perry about teenage romance under 3 minutes long in the dance pop genre"
})
```

```json
{
  "query": "teenager love",
  "filter": "and(or(eq(\"artist\", \"Taylor Swift\"), eq(\"artist\", \"Katy Perry\")), lt(\"length\", 180), eq(\"genre\", \"pop\"))"
}
```

#### Text-to-SQL

SQL 是结构化数据的重要来源。将自然语言转化为 SQL 请求存在一些挑战，例如：

- 幻觉现象：LLM 容易对虚构的表或字段产生 "幻觉"，从而产生无效查询。
- 用户错误：需要对用户输入中的拼写错误或其他不规范输入具有鲁棒性。

考虑到这些挑战，已有的一些方法：

- **数据库描述**：一个常见的 text-to-SQL 的 prompt 是给 LLM 提供每个表的 CREATE TABLE 描述（包括列名、类型等），然后在 SELECT 语句中提供三个示例行。
- **少量示例**：在 prompt 中附加标准的静态示例，引导 LLM 根据问题生成查询。
- **错误处理**：可以使用 SQL Agent 等工具从错误中恢复。
- **查找专有名词中的拼写错误**：在查询专有名词（如人名）时，用户可能会出现拼写错误，可以允许 LLM 在向量存储中搜索正确拼写的专有名词。

<img class="blog-image" src="{{ '/assets/img/blog/rag/text-to-sql.png' | relative_url }}" alt="Text-to-SQL" width="1571" height="470" loading="lazy" decoding="async">

#### Text-to-SQL+semantic

既有结构化数据又有非结构化数据的数据存储越来越常见。支持混合检索方法的关键因素是在关系数据库中增加向量支持（例如，PostgreSQL 的开源扩展 pgvector 就结合了 SQL 的表达能力和语义搜索对语义的细致理解）。Pgvector 可以在嵌入向量列上执行相似性搜索（例如，余弦相似度、L2 距离、内积）：

```sql
SELECT *
FROM tracks
ORDER BY "name_embedding" <-> {sadness_embedding}
```

通过上述查询，可以使用 `LIMIT 3` 获取与“悲伤”查询向量最近的 3 条歌曲记录，而非直接证明其情绪强度排名（类似于标准 kNN 中的 top_k）。这种方法解锁了两个新功能：

- **语义搜索**：在同一查询中结合关系字段过滤与向量相似度排序。
- **结构化查询增强**：借助语义操作符，可以实现文本到语义搜索（例如，查找歌名表达特定情感的歌曲）和 SQL 查询（例如，按流派筛选）。

例如，查找专辑名中含有“lovely”、且歌曲名称向量最接近“悲伤”查询向量的 3 条记录：

```sql
SELECT *
FROM tracks
WHERE album_name LIKE '%lovely%'
ORDER BY "name_embedding"<-> {sadness_embedding}
LIMIT 3;
```

#### Text-to-Cypher

向量存储可以轻松处理非结构化数据，但无法了解向量之间的关系。SQL 可以建立关系模型，但模式更改可能会造成破坏。知识图谱可以通过对数据之间的关系建模来应对这些挑战，适用于具有多对多关系或难以用表格形式表示的层次结构的数据。就像关系型数据库通常使用 SQL 一样，图数据库通常使用 Cypher。Cypher 提供了一种可视化的方式来匹配模式和关系，使用 ascii-art 类型的语法描述数据节点和关系，例如：

```cypher
(:Person {name:"Tomaz"})-[:LIVES_IN]->(:Country {name:"Slovenia"})
```

该模式描述了一个标签为 Person、名称为 Tomaz 的节点，该节点与标签为 Country、名称为 Slovenia 的节点有 LIVES_IN 关系。text-to-Cypher 可以将自然语言翻译成 Cypher 查询，使用 GraphCypherQAChain 和 LLM，例如：

```python
from langchain.chains import GraphCypherQAChain

graph.refresh_schema()

cypher_chain = GraphCypherQAChain.from_llm(
    cypher_llm = ChatOpenAI(temperature=0, model_name='gpt-4'),
    qa_llm = ChatOpenAI(temperature=0), graph=graph, verbose=True,
)

cypher_chain.run(
    "How many open tickets there are?"
)
```

### 索引（Indexing）

Indexing 属于离线或增量知识准备流程，文档被分割、压缩为包含语义的向量形式（embedding）来建立索引（Indexing），question 以相同的方式映射到同一向量空间中，然后使用某一方法进行相似性计算，检索（Retrieval）出与 question 相关的 context。

<img class="blog-image" src="{{ '/assets/img/blog/rag/indexing-overview.png' | relative_url }}" alt="Indexing 1" width="750" height="790" loading="lazy" decoding="async">

<img class="blog-image" src="{{ '/assets/img/blog/rag/indexing-pipeline.png' | relative_url }}" alt="Indexing 2" width="758" height="219" loading="lazy" decoding="async">

#### 分块（Chunking）

分块策略的五种常见思路：

- **Character**：按固定字符数分块，不考虑文本内容或结构。
- **Recursive**：使用一组分隔符递归分块，直到达到所需的块大小。
- **Document**：使用特定分隔符进行分块，如 markdown 中的标题符号、 Python 代码中的类和函数等。
- **Semantic**：使用嵌入相似性（embedding），按上下文语义分块。
- **Agentic**：由模型辅助决策的分块方法，用 LLM 做决策将文本分块。

#### Multi-representation Indexing

<img class="blog-image" src="{{ '/assets/img/blog/rag/multi-representation-indexing-01.png' | relative_url }}" alt="Multi-representation Indexing 1" width="1664" height="784" loading="lazy" decoding="async">

<img class="blog-image" src="{{ '/assets/img/blog/rag/multi-representation-indexing-02.png' | relative_url }}" alt="Multi-representation Indexing 2" width="1000" height="510" loading="lazy" decoding="async">

**论文**：[Dense X Retrieval: What Retrieval Granularity Should We Use?](https://arxiv.org/abs/2312.06648)

#### RAPTOR

低级 query，指单一块或文档就可以回答的 query； 高级 query，指需要多个块或文档整合才能回答的 query。对于高级 query，典型的 kNN 检索可能并不适用，因为 kNN 检索只能检索有限数量的块或文档。对文档进行嵌入和聚类，然后对每个聚类进行总结。以递归方式重复，最终得到一个越来越高层次的摘要树。摘要和原始文档一起被索引，覆盖用户 query 的范围。

<img class="blog-image" src="{{ '/assets/img/blog/rag/raptor.png' | relative_url }}" alt="RAPTOR" width="900" height="692" loading="lazy" decoding="async">

#### ColBERT

稠密段落检索（Dense Passage Retrieval, DPR）存在的问题：

- 现成的模型在训练过程中可能会遇到不熟悉的不常用词，如人名、术语等。
- DPR 对分块策略很敏感，如果相关段落被大量无关和冗余信息包围，就不容易被检索到。

ColBERT 是一种使用 BERT 语言模型对段落相关性进行评分的新方法，通过更细粒度的嵌入来解决这些问题。与基于单一向量的 DPR 不同之处在于，它不是将段落转换成单一的“embedding”向量，而是为段落中的每个 token 生成一个与上下文相关的向量。同样，ColBERT 也为 query 中的每个 token 生成向量。然后，每个文档的得分就是 query 嵌入与任意文档嵌入之间最大相似度的总和：

```python
def maxsim(qv, document_embeddings):
    return max(qv @ dv for dv in document_embeddings)

def score(query_embeddings, document_embeddings):
    return sum(maxsim(qv, document_embeddings) for qv in query_embeddings)
```

<img class="blog-image" src="{{ '/assets/img/blog/rag/colbert.png' | relative_url }}" alt="ColBERT" width="1061" height="610" loading="lazy" decoding="async">

为每个文档计算分数的成本很高，使用 DataStax Astra DB 这样的向量数据库可以限制需要计算分数的文档集合的大小。

**论文**：[ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT](https://arxiv.org/abs/2004.12832)

### 检索（Retrieval）

Retrieval 在回答请求时查找相关证据。每个 context 向量都被投影到同一向量空间，其所处向量空间中的位置由该 context 的语义决定，在向量空间中相似的位置包含相似的语义信息，这是检索的基本思想。

```python
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
vectorstore = Chroma.from_documents(documents=splits,
                                    embedding=OpenAIEmbeddings())
retriever = vectorstore.as_retriever(search_kwargs={"k": 1})
```

其中，`k`表示进行检索时需要获取的相似向量的数量。

<img class="blog-image" src="{{ '/assets/img/blog/rag/retrieval-pipeline.png' | relative_url }}" alt="Retrieval" width="368" height="308" loading="lazy" decoding="async">

#### CRAG

Corrective RAG 在生成前评估检索结果的可用性，并按评估结果选择修正路径，例如补充检索或外部搜索。它强调检索失败后的处理逻辑，具体分支以课程 Notebook 为准。

[https://www.youtube.com/watch?v=E2shqsYwxck](https://www.youtube.com/watch?v=E2shqsYwxck)
[langgraph/examples/rag/langgraph_crag.ipynb at main · langchain-ai/langgraph (github.com)](https://github.com/langchain-ai/langgraph/blob/main/examples/rag/langgraph_crag.ipynb)

#### Self-RAG

Self-RAG 将是否检索、证据相关性及生成支持程度等判断纳入生成过程。原方法涉及模型训练与反思标记，课程中的工作流演示不能直接等同于完整复现原论文。

[langgraph/examples/rag at main · langchain-ai/langgraph (github.com)](https://github.com/langchain-ai/langgraph/tree/main/examples/rag)

### 生成（Generation）

Generation 是利用上下文生成回答的环节，即获取检索到的 context 并将其填充到 LLM 上下文窗口。Prompt 可以理解为一个键（key），通过 question 和检索到的 context 构建一个字典，用字典中的值填充 prompt 模板作为 prompt 值（value）传递给 LLM 产生聊天消息，然后将其解析得到答案。

<img class="blog-image" src="{{ '/assets/img/blog/rag/generation-pipeline.png' | relative_url }}" alt="Generation 1" width="1467" height="655" loading="lazy" decoding="async">

<img class="blog-image" src="{{ '/assets/img/blog/rag/generation-strategies.png' | relative_url }}" alt="Generation 2" width="441" height="382" loading="lazy" decoding="async">

#### 长上下文与检索

上下文窗口扩大后，证据的位置、相关性和冗余仍会影响回答。长上下文与检索可以组合：检索控制候选范围，上下文组织再决定证据的排列与压缩方式。

[youtube.com/watch?v=SsHUNfhF32s](https://www.youtube.com/watch?v=SsHUNfhF32s)
[RAG And Long Context LLMs - Google Slides](https://docs.google.com/presentation/d/1mJUiPBdtf58NfuSEQ7pVSEQ2Oqmek7F1i4gBwR6JDss/edit#slide=id.g26c0cb8dc66_0_0)

## 案例：CSDN 问答系统

### 构建知识库

知识库的数据来源:

1. 已采纳的问题: 376140
2. 编程语言的官方手册: 67015
3. 高质量的博客: 4779402

这里`477w`的博客，是没有做结构化（按内容中的小标题拆分）的量，做完结构化后的量是`12959544`，将近 1300w 的数据量。

使用 PostgreSQL 存储知识库：

<img class="blog-image" src="{{ '/assets/img/blog/rag/qa-dataset-schema.png' | relative_url }}" alt="表的结构" width="731" height="158" loading="lazy" decoding="async">

字段说明:

- `id`: 博客 id
- `query`: 博客标题
- `inner_id`: 小标题序号
- `query_vector`: 目标 query 的向量，这里是 query+head_title 的向量化（粗排阶段训练的 SBERT 模型）后的结果。
- `meta`: 主要用于存储小标题及小标题之间的内容

随机取的一条拆分后的博客的数据, 这是其中一个 meta 字段：

```json
{
  "url": "博客链接",
  "tags": "debian,linux,ubuntu,vim,编辑器",
  "content": "xxxxxxxxx",
  "head_title": "安装ctags"
}
```

字段说明:

- tags: 博客标签
- content: 小标题与小标题之间的内容
- head_title: 小标题

运用博客标签作为过滤条件，可将 query 库从全量数据缩小到单个标签数据。这可以缩小候选范围，但过滤错误也可能丢失相关结果。是否提升召回或排序，需要在同一评测集合上比较，不能仅由数据量减少推出。

### 粗排

**目的**：运用检索模型，快速筛除大量低相关性或不相关的回答候选，大幅削减需进一步处理的数据量。
**步骤**：构建训练数据 -> 微调模型

#### 构建训练数据

训练一个无监督的语义相似度模型（如 SimCSE），使用该模型计算两两相似度，筛选相似度比较高的数据。通过 SimCSE 计算相似度后的数据举例：

```
TypeScript生成随机数	jmeter随机数生成	0.89
TypeScript生成随机数	kotlin 生成随机数	0.88
TypeScript生成随机数	Javascript生成随机数	0.88
TypeScript生成随机数	ThreadLocalRandom生成随机数	0.88
TypeScript生成随机数	Java生成随机数SecureRandom	0.86
```

原笔记使用 0.9 附近的相似度阈值筛选候选，阈值应在验证数据上调整。下面只展示待标注的样本形式：

```
python中分割字符串	python字符串分割
python中分割字符串	oracle分割字符串
python中分割字符串	将String字符串分割
python中分割字符串	boost 分割字符串
python中分割字符串	Arduino分割字符串
```

可以看出，这些筛选出来的数据，就是所需的部分文本相同，但语义完全不同的数据。对这部分数据做人工标注，示例如下：

```
利用python发送qq邮件	使用python发送qq邮件	1
利用python发送qq邮件	使用java发送qq邮件	0
利用python发送qq邮件	用Java发送QQ邮件	0
利用python发送qq邮件	使用python发送邮件	1
利用python发送qq邮件	C#利用QQ信箱发送EMAIL	0
```

标签应判断两个问题的意图与适用条件是否一致，不能仅依据某个技术词包含另一个词。例如，下列问题是否等价，需要检查第二个问题的库限制是否符合第一个问题的需求：

```
利用python发送qq邮件
python 利用zmail库发送邮件
```

#### 微调模型

以下用 Sentence-BERT 风格的句对训练说明流程，针对中文示例选择多语言编码器。模型与损失的适配需要单独验证；代码仍沿用该时期 Sentence Transformers 的 `fit()` 风格接口。训练集与验证集应按查询意图或来源分组划分，避免近重复问题跨集合。

```python
import os
from sentence_transformers import SentenceTransformer, SentencesDataset
from sentence_transformers import InputExample, evaluation, losses
from torch.utils.data import DataLoader


class TrainSBert:
    def __init__(self):
        self.model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        self.data_path = "train_pairs.tsv"
        self.dev_path = "dev_pairs.tsv"
        self.model = None
        self.model_base_dir = '模型保存base路径'
        self.model_dir = os.path.join(self.model_base_dir, self.model_name.split("/")[-1])
        if not os.path.exists(self.model_dir):
            os.makedirs(self.model_dir)
        self.evaluate_path = os.path.join(self.model_dir, "result.txt")


    def load(self):
        self.model = SentenceTransformer(self.model_name)


    def load_train_data(self):
        # 两份文件应事先按查询组划分；每行 query、candidate、label，以 Tab 分隔
        train_data_list = []
        dev_sentences1, dev_sentences2, dev_labels = [], [], []
        with open(self.data_path, encoding="utf-8") as file_handle:
            for line in file_handle:
                query, candidate, label = line.rstrip("\n").split("\t")
                train_data_list.append(InputExample(texts=[query, candidate], label=float(label)))
        with open(self.dev_path, encoding="utf-8") as file_handle:
            for line in file_handle:
                query, candidate, label = line.rstrip("\n").split("\t")
                dev_sentences1.append(query)
                dev_sentences2.append(candidate)
                dev_labels.append(float(label))
        train_dataset = SentencesDataset(train_data_list, self.model)
        train_dataloader = DataLoader(train_dataset, shuffle=True, batch_size=32)
        return train_dataloader, dev_sentences1, dev_sentences2, dev_labels

    def train(self):
        self.load()
        train_dataloader, dev_sentences1, dev_sentences2, dev_labels = self.load_train_data()

        train_loss = losses.CosineSimilarityLoss(self.model)
        evaluator = evaluation.EmbeddingSimilarityEvaluator(dev_sentences1, dev_sentences2, dev_labels)
        self.model.fit(train_objectives=[(train_dataloader, train_loss)], epochs=10, warmup_steps=100,
          evaluator=evaluator, evaluation_steps=100, output_path= self.model_dir)
        self.model.evaluate(evaluator, self.evaluate_path)
```

```bash
s1: 二叉树的python实现 与 s2: Ribbon实现负载均衡 相似度为: 0.18773505091667175
s1: 二叉树的python实现 与 s2: 使用openFeign实现负载均衡 相似度为: -0.04088197648525238
s1: 二叉树的python实现 与 s2: Nginx负载均衡实现 相似度为: 0.018543850630521774
s1: 二叉树的python实现 与 s2: python 的二叉树实现 相似度为: 0.965272068977356
s1: 二叉树的python实现 与 s2: 请问下二叉树用python怎么实现, 求求各位大佬了, 小弟实在不会 相似度为: 0.8639361262321472
s1: 二叉树的python实现 与 s2: 二叉树的python实现 相似度为: 1.0
s1: 二叉树的python实现 与 s2: 二叉树的c++实现 相似度为: 0.21337147057056427
```

### 精排

精排可采用“相关性分类后按分数排序”或真正的分组排序学习，两者的目标函数、数据组织与评估指标不同。下面以 **LGBMRanker 分组排序**为例，不再混用二分类的 `binary`／`auc` 配置。

在粗排的基础上，对筛选出的相似的 query 进行更细致的评估。此处采用的排序学习（Learning to Rank, LTR）模型为 LGBMRanker。该模型的核心机制在于，通过学习和理解排序逻辑——即如何将高相关度结果置于低相关度结果之前，以达到优化搜索结果排序的目的。

人工构造特征作为 LTR 模型的输入，以下是所构建的部分特征示例：

```
1、SBERT语义相似度
2、最长公共子序列
3、编辑距离
4、jaccard相似度
5、余弦相似度
6、皮尔逊相关性系数
7、欧式距离
8、KL散度
```

各项统计特征须先定义输入表示与归一化方式；例如 KL 散度用于概率分布，不能直接套用未归一化的任意向量。候选样本还应按查询组织，同一查询的相关性标签用于组内排序。

下面是核心训练调用的示意，`X_train`／`X_valid` 为已经生成的特征，`y_train`／`y_valid` 为非负整数相关性等级；每个查询组的记录连续排列，`train_group_sizes`／`valid_group_sizes` 分别记录各组候选数量，其总和应等于样本数。

```python
from lightgbm import LGBMRanker

ranker = LGBMRanker(
    objective="lambdarank",
    metric="ndcg",
    max_depth=5,
    num_leaves=31,
    learning_rate=0.05,
    n_estimators=100,
    random_state=42,
)
ranker.fit(
    X_train, y_train,
    group=train_group_sizes,
    eval_set=[(X_valid, y_valid)],
    eval_group=[valid_group_sizes],
    eval_at=[5, 10],
)
```

该片段说明排序训练的数据契约，不包含特征生成或实验结果。若实际任务采用相关性二分类，应改用相应分类器与分类指标，再独立评估排序效果。分组要求参见 [LGBMRanker 文档](https://lightgbm.readthedocs.io/en/v4.4.0/pythonapi/lightgbm.LGBMRanker.html)。

### Prompt

```
请依据提供的参考资料回答技术问题，必要时给出步骤与代码。
区分参考资料直接支持的内容与补充解释，不得编造出处。
回答中的关键结论使用 [文档ID] 指向对应证据。
若资料不足或相互冲突，请说明缺少的信息，并提出需要进一步核查的问题。

问题：
{query}

参考资料（含文档ID）：
{blog_content}
```

### 总结

优化的方向：

- 构建知识库的方法更加合理，考虑关联表拆分之类
- 增加 SBERT 微调数据集，可以用 GPT 之类的辅助生成数据集
- 粗排模型的优化
- 精排模型的优化

## 参考资料

- [Lewis et al.：Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401)
- [LangChain：RAG From Scratch 源码与课程](https://github.com/langchain-ai/rag-from-scratch)
- [Sentence Transformers：多语言句向量模型](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2)
