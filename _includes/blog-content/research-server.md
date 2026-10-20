## SSH 连接

实验室的两台服务器均支持**SSH 连接**，支持在**实验室 Wi-Fi 内网**环境下连接、在**校园网 BTBU- AUTO**环境下连接。 支持**SFTP 文件传输**。

在 SSH 软件（推荐 Termius ）中填入 IP 地址、端口、用户名、密码即可访问。不同网络环境下，服务器**IP 地址**和**端口号**需要更改。

<div class="blog-table" markdown="1">

| 服务器                   | 实验室内网 IP | BTBU-AUTO 网络 IP | SSH 端口 |
| ------------------------ | ------------- | ----------------- | -------- |
| Lab718（工程服务器）     | 192.168.124.6 | 192.168.55.65     | 222      |
| Lab718EPYC（科研服务器） | 192.168.124.7 | 192.168.55.65     | 22       |

</div>

<img class="blog-image" src="{{ '/assets/img/blog/research-server/ssh-connection-guide.png' | relative_url }}" alt="科研服务器使用笔记：服务器 SSH 教程" width="1616" height="1020" loading="lazy" decoding="async">

## 存储与运行环境

### 用户存储路径

使用**Lab718EPYC 服务器**时，`/home/<username>/Documents/`路径下应有`HDD`文件夹，即`/home/<username>/Documents/HDD`。`HDD`文件夹为软链接，已链接到机械硬盘（4T 容量）。该文件夹设有访问权限，仅限本人访问，**可放心存入个人文件**。

每个用户务必将自己的文件存在自己的用户根目录中，例如 `/home/<username>/Documents/HDD`、`/home/<username>/Documents` 、 `/home/<username>/Desktop`。**不要乱放到系统中**。

### 本地 CUDA Toolkit 切换

每个用户的`/home/<username>/Desktop`中存有三个 shell 脚本文件和一个 cuda 软链接，用来切换 cuda 版本。预装了 cuda11.3、cuda11.8、cuda9.2，可根据使用需求切换 cuda 版本。例如，切换至 cuda11.8，在`/home/<username>/Desktop`路径下运行`./change_cuda_118.sh`即可。切换后可使用`nvcc -V`检查是否切换成功。使用此处提供的脚本切换 cuda 不会影响其他用户，**不要自己安装以免影响其他用户**。

### PyTorch GPU 环境

_CUDA_（Compute Unified Device Architecture）是由 NVIDIA 推出的**并行计算**平台和编程模型，使得开发者可以使用 C、C++ 等编程语言编写并行计算代码来充分利用 GPU 的强大计算能力，而不仅仅是图形渲染。

_cuDNN_（CUDA Deep Neural Network library）是基于 CUDA 的一个**深度神经网络加速库**，提供了一些高度优化的底层函数，专门用于深度学习任务中常见的操作。

**NVIDIA 驱动**负责与 GPU 交互；**本地 CUDA Toolkit** 提供 `nvcc` 等开发工具；PyTorch 的 GPU 安装包及其依赖提供运行所需的 CUDA 库。本地 Toolkit 主要用于编译 CUDA 代码和自定义扩展。

使用 `nvidia-smi` 检查驱动与设备，`nvcc -V` 检查当前 Toolkit，`torch.version.cuda` 检查 PyTorch 构建所用 CUDA 版本。驱动与运行库的对应关系见 [NVIDIA CUDA 兼容性说明](https://docs.nvidia.com/deploy/cuda-compatibility/minor-version-compatibility.html)。

下面以 PyTorch 2.5.1／CUDA 11.8 为例配置环境，安装命令见 [PyTorch 历史版本说明](https://pytorch.org/get-started/previous-versions/)：
<img class="blog-image" src="{{ '/assets/img/blog/research-server/pytorch-cuda-environment.png' | relative_url }}" alt="科研服务器使用笔记：含cudatoolkit的Pytorch安装" width="869" height="799" loading="lazy" decoding="async">

```bash
conda install pytorch==2.5.1 torchvision==0.20.1 torchaudio==2.5.1 pytorch-cuda=11.8 -c pytorch -c nvidia
```

如果下载缓慢，可前往[download.pytorch.org/whl/](http://download.pytorch.org/whl/)下载`.whl`文件，在虚拟环境中执行如下安装命令：

```bash
python -m pip install /absolute/path/to/package.whl
```

安装方式见 [pip 的 wheel 安装说明](https://pip.pypa.io/en/stable/user_guide/#installing-from-wheels)。

在 Python 解释器中检查：

```python
import torch
print(torch.__version__)
print(torch.version.cuda)
print(torch.cuda.is_available())
```

## 任务运行与日志

### 前台运行

```bash
python3 test.py
```

进程占用当前终端，`Ctrl+C` 通常向前台进程发送 `SIGINT`；关闭终端也可能使任务收到挂断信号并退出。

### nohup 与后台运行

`nohup` 使进程忽略挂断信号 `SIGHUP`，配合 `&` 将任务放到后台，重定向输出后通过日志查看运行情况：

```bash
nohup python3 -u test.py > train.log 2>&1 &
task_pid=$!
tail -f train.log
```

`&` 将任务置于后台，`-u` 减少 Python 输出缓冲；`2>&1` 将标准错误并入日志。此时在 `tail` 窗口按 `Ctrl+C` 停止的是日志查看，而不是训练任务。确认目标进程后可用 `kill "$task_pid"` 结束本次启动的任务；重新连接终端后，可先用 `pgrep -af test.py` 核对 PID。

### 指定 GPU

```bash
mkdir -p logs
CUDA_DEVICE_ORDER=PCI_BUS_ID CUDA_VISIBLE_DEVICES=1 nohup python3 -u test.py > logs/train_gpu1.log 2>&1 &
```

这里只向程序暴露序号为 1 的 GPU，该设备在程序内通常重新编号为 `cuda:0`。

## Conda 镜像配置

1. 在用户根目录`/home/<username>/`下创建`.condarc`文件：

   ```bash
   touch ~/.condarc
   ```

2. `conda info`检查现有源：

   <img class="blog-image" src="{{ '/assets/img/blog/research-server/conda-mirror-configuration-01.png' | relative_url }}" alt="科研服务器使用笔记：Conda换源" width="644" height="316" loading="lazy" decoding="async">

3. 用 `vim ~/.condarc` 编辑配置。基础 Conda channel 的配置示例参见 [清华镜像站说明](https://mirrors.tuna.tsinghua.edu.cn/help/anaconda/)：

   ```yaml
   channels:
     - defaults
   show_channel_urls: true
   default_channels:
     - https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/main
     - https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/r
   ```

4. 使用 `conda info` 与 `conda config --show-sources` 检查实际生效的配置：

   <img class="blog-image" src="{{ '/assets/img/blog/research-server/conda-mirror-configuration-02.png' | relative_url }}" alt="科研服务器使用笔记：Conda换源" width="686" height="363" loading="lazy" decoding="async">
