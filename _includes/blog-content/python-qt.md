## 环境配置

### Anaconda 创建虚拟环境

- 创建并激活虚拟环境

```bash
conda create -n gui_pyside python=3.10
conda activate gui_pyside
```

- 安装依赖

```bash
python -m pip install "PySide2==5.15.2.1" requests
```

### PyCharm 外部工具

`File → Settings → Tools → External Tools`

添加 Qt Designer：
Program：designer.exe 的绝对路径，在虚拟环境中的`Scripts`文件夹下
Working directory：designer.exe 的工作路径，设置为`$ProjectFileDir$`，可将生成的 ui 文件保存到当前项目所在目录（根目录）
<img class="blog-image" src="{{ '/assets/img/blog/python-qt/qt-designer-configuration.png' | relative_url }}" alt="Qt Designer添加配置" width="601" height="692" loading="lazy" decoding="async">

添加 PyUic：
Program：pyside2-uic.exe 的绝对路径
Arguments：`$FileName$ -o $FileNameWithoutExtension$.py`
Working directory：pyside2-uic.exe 的工作路径，设置为`$FileDir$`，可将 ui 文件转换的 py 文件保存到当前文件所在目录
<img class="blog-image" src="{{ '/assets/img/blog/python-qt/pyuic-configuration.png' | relative_url }}" alt="PyUIC添加配置" width="601" height="692" loading="lazy" decoding="async">

## 界面设计与加载

在构建 GUI 时，通常从创建`QApplication`实例开始，然后创建`QWidget`或`QMainWindow`作为主窗口，添加各种控件，并使用布局管理器来安排它们。例如，可以在`QMainWindow`的中心区域放置一个`QWidget`，并在其上使用`QVBoxLayout`布局，添加`QPushButton`和`QListWidget`等部件。

- `QApplication` 是所有基于 Qt 的应用程序的主控类，是应用程序的起点，负责初始化 GUI 环境，管理事件循环，处理输入事件，并控制应用程序的生命周期。
- `QWidget` 是所有用户界面对象的基本类，提供了基本的窗口功能（不包括菜单栏、工具栏或状态栏），能接收和响应用户输入。
- `QVBoxLayout` 是一种布局管理器，用于垂直排列窗口部件。布局管理器可以应用于`QWidget`的派生类，负责自动调整部件的位置和大小。
- `QMainWindow`, `QPushButton`, `QListWidget`, `QComboBox`, `QProgressBar` 等都是`QWidget`的子类，它们构成了 GUI 的不同部分。
- `QFileDialog` 和 `QMessageBox` 通常是基于`QDialog`的对话框，用于特定的交互任务。

`Qt Designer`设计的界面，最终以 XML 格式的界面定义保存在一个`.ui`文件中。使用`.ui`文件，可以从`.ui`文件中加载 UI 定义，也可以将`.ui`文件转化为 Python 代码后在主程序中引用定义控件的类：

- 动态加载`.ui`文件：在运行时动态加载`.ui`文件，可以在不重新编译整个应用程序的情况下更新 UI 设计。
- 转化`.ui`文件为 Python 代码：没有需要在运行时解析`.ui`文件的要求，应用程序可以在没有额外工具链的情况下运行。

### 动态加载 .ui 文件

`QUiLoader.load()` 返回从文件创建的窗口，需显示这个返回对象。以下假定 `main.ui` 为主窗口，且含有名为 `folder_button` 的按钮；控件可通过窗口属性或 `findChild()` 获取。

```python
import sys
from PySide2.QtCore import QFile, QIODevice
from PySide2.QtUiTools import QUiLoader
from PySide2.QtWidgets import QApplication, QPushButton

app = QApplication(sys.argv)
ui_file = QFile("main.ui")
if not ui_file.open(QIODevice.ReadOnly):
    raise RuntimeError(ui_file.errorString())
loader = QUiLoader()
window = loader.load(ui_file)
ui_file.close()
if window is None:
    raise RuntimeError(loader.errorString())
button = window.findChild(QPushButton, "folder_button")
if button is not None:
    button.clicked.connect(lambda: print("Choose a folder"))
window.show()
sys.exit(app.exec_())
```

### 转化 .ui 文件为 Python 代码

```bash
pyside2-uic main.ui -o ui_main.py
```

```python
import sys
from PySide2.QtWidgets import QApplication, QMainWindow
from ui_main import Ui_MainWindow


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.ui = Ui_MainWindow()
        self.ui.setupUi(self)
        self.ui.folder_button.clicked.connect(self.browse_folder)

    def browse_folder(self):
        print("Choose a folder")


if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec_())
```

修改 `.ui` 后需重新运行 `pyside2-uic`；业务代码应保留在自己的窗口类中。两种加载方式参见 [Qt for Python 5 官方教程](https://doc.qt.io/archives/qtforpython-5/tutorials/basictutorial/uifiles.html)。

## 界面布局 Layout

常用的 Layout 布局有 4 种，分别是水平布局`QHBoxLayout`、垂直布局`QVBoxLayout`、表格布局`QGridLayout` 、表单布局`QFormLayout`。`QGridLayout`把控件按表格状摆放，有的控件可以占据多个格子。`QFormLayout`可以看作一个只有两列的表格，适合注册表单类型的界面。
<img class="blog-image" src="{{ '/assets/img/blog/python-qt/grid-form-layouts.png' | relative_url }}" alt="表格布局和表单布局" width="643" height="180" loading="lazy" decoding="async">

### 布局使用方法

创建`QWidget`或`QMainWindow`作为主窗口后，在左侧`Layouts`窗口选择一种 Layout 拖入主窗口，添加各种控件，控件将按选择的 Layout 排列。Layout 可以反复嵌套操作，在窗口选中需要的控件或 Layout（红色线框表示），`右键->布局`选择合适的 Layout（建议在`对象查看器`选择）。

使用`Qt Designer`设计界面时，通常采用如下步骤：

1. 首先，在窗口中将所有控件按位置摆放，不使用任何 Layout
2. 然后，从最内层开始进行控件的 Layout 设定，逐步嵌套
3. 最后，调整 Layout 中控件的大小比例，优先使用 Layout 的 layoutStretch 属性来控制

### 调整控件位置和大小

实现所有控件跟随主窗口的大小而缩放，需要为 `QWidget` 或 `QMainWindow` 的中心控件设定 Layout，首先必须先添加一个控件到主窗口，然后才能在右侧`对象查看器`选择最顶层的主窗口，`右键->布局`选择合适的 Layout，这时可以看到主窗口上的红色禁止符消失了。

如果需要保持 Layout 中控件的大小，可以通过设定控件的`sizePolicy`来调整。例如，需要居中显示如下所示的固定大小的按钮：

1. 选中按钮，在右侧`属性编辑器`的`QWidget`类中将`sizePolicy`改为`Fixed`；
2. 在左侧`Layouts`窗口将`Horizontal Layout`拖入主窗口；
3. 将按钮拖入`对象查看器`中的`Horizontal Layout`（直接拖入不含控件的 Layout 较困难）。
<img class="blog-image" src="{{ '/assets/img/blog/python-qt/fixed-button-alignment.png' | relative_url }}" alt="居中显示固定大小按钮" width="305" height="318" loading="lazy" decoding="async">

对于同一个 Layout 的多个控件，可以通过控制`sizePolicy`中的伸展因子，调整控件的大小比例：
<img class="blog-image" src="{{ '/assets/img/blog/python-qt/widget-stretch-factors.png' | relative_url }}" alt="调整控件的大小比例" width="349" height="150" loading="lazy" decoding="async">

控件的间距可以通过添加 Layout，然后控制 Layout 的`Margin`来调整，也可以从左侧`Spacers`窗口添加`Spacer`进行调整。

### Tab 页控件

可以通过`Tab Widget`把界面分为多个页面，如下所示：
<img class="blog-image" src="{{ '/assets/img/blog/python-qt/tab-widget.png' | relative_url }}" alt="Tab 页控件" width="942" height="583" loading="lazy" decoding="async">

Tab 页标题可以通过设定控件的`currentTabText`来修改。为 Tab 页整体设定 Layout，首先必须先在该 Tab 页添加一个控件，然后在右侧`对象查看器`选择上层`TabWidget`进行设定（实际上只设置了该 Tab 页）。

## 常用控件

继承自`QWidget`类的所有控件都支持`setEnabled()`方法，用于控制用户界面中某个控件是否可以被用户交互，基本语法如下：

```python
# 启用
Object.setEnabled(True)
# 禁用
Object.setEnabled(False)
```

<div class="no_toc_section" markdown="1">

### 按钮 PushButton

```python
from PySide2.QtWidgets import QPushButton
from PySide2.QtGui import QIcon

# 设置按钮文本
button.setText("New Text")

# 获取按钮文本
text = button.text()

# 设置按钮的提示信息（鼠标悬停时）
button.setToolTip("This is a tip")

# 设置按钮的图标
button.setIcon(QIcon("path/to/icon.png"))

# 设置按钮样式
button.setStyleSheet("background-color: lightblue; font-size: 18px;")

# 连接按钮点击事件
button.clicked.connect(handleCalc)
```

### 单行文本框 LineEdit

```python
from PySide2.QtWidgets import QLineEdit

# 设置文本框文本
edit.setText("New Text")

# 获取文本框文本
text = edit.text()

# 设置文本框的提示信息（控件为空时）
edit.setPlaceholderText("This is a tip")

# 连接文本修改事件
edit.textChanged.connect(handleTextChange)  # 传入当前内容字符串

# 连接按下回车事件
edit.returnPressed.connect(onLogin)

# 文本拷贝到剪贴板
edit.copy()

# 剪贴板粘贴为文本
edit.paste()

# 清除文本框文本
edit.clear()
```

### 多行文本框 PlainTextEdit

```python
from PySide2.QtWidgets import QPlainTextEdit

# 设置多行文本框文本
edit.setPlainText('''New
Text''')

# 获取多行文本框文本
text = edit.toPlainText()

# 末尾处添加文本
edit.appendPlainText("New Text")  # 自动换行

# 光标处插入文本
edit.insertPlainText("New Text")  # 不会自动换行

# 设置最大行数
edit.document().setMaximumBlockCount(1000)

# 连接文本修改事件
edit.textChanged.connect(handleTextChange)  # 不会传入当前内容字符串

# 连接光标位置改变事件
edit.cursorPositionChanged.connect(handleChanged)

# 获取选中文本
textCursor = edit.textCursor()  # 返回一个QTextCursor对象
selection = textCursor.selectedText()
```

### 文本浏览框 TextBrowser

```python
from PySide2.QtWidgets import QTextBrowser

# 末尾处添加文本并滚动到当前行
textBrowser.append("New Text")
textBrowser.ensureCursorVisible()  # 添加文本后滚动到当前行
```

### 列表 ListWidget

```python
from PySide2.QtWidgets import QListWidget

# 获取当前列表项文本
text = listWidget.currentItem().text()

# 获取指定行列表项文本
text = listWidget.item(0).text()

# 末尾处添加一个列表项
listWidget.addItem("New Text")

# 末尾处添加多个列表项
listWidget.addItems(["New Text 1","New Text 2"])

# 删除指定行列表项
listWidget.takeItem(0)

# 清除所有列表项
listWidget.clear()

# 连接选中选项改变事件
listWidget.itemSelectionChanged.connect(handleSelectionChange)

# 连接选项文本改变事件
listWidget.itemChanged.connect(handleItemTextChange)
```

### 表格 TableWidget

```python
from PySide2.QtWidgets import QTableWidget, QTableWidgetItem
from PySide2.QtCore import Qt

# 获取指定位置单元格内容
text = table.item(row, col).text()

# 插入指定行
table.insertRow(row)

# 删除指定行
table.removeRow(row)

# 设置指定位置单元格内容（未被设置）
table.setItem(row, col, QTableWidgetItem("New Text"))

# 设置指定位置单元格内容（已被设置）
table.item(row, col).setText("New Text")

# 禁止编辑指定单元格，保留选中等其他行为
item = table.item(row, col)
item.setFlags(item.flags() & ~Qt.ItemIsEditable)

# 设置指定位置单元格对齐方式
table.item(row, col).setTextAlignment(Qt.AlignCenter)

# 连接单元格内容改变事件
table.cellChanged.connect(handleCellChanged)  # 槽接收 row、column
```

### 组合选择框 ComboBox

```python
from PySide2.QtWidgets import QComboBox

# 获取当前选项文本
text = cbox.currentText()

# 末尾处添加一个选项
cbox.addItem("New Text")

# 末尾处添加多个选项
cbox.addItems(["New Text 1","New Text 2"])

# 清除所有选项
cbox.clear()

# 连接选项改变事件
cbox.currentIndexChanged.connect(handleSelectionChange)
```

### 单选按钮 RadioButton

同一父控件或 Layout 下的多个单选按钮只能选中一项，建议多组单选按钮指定（选中后右键）到不同按钮组`QButtonGroup`中。

```python
from PySide2.QtWidgets import QRadioButton, QButtonGroup

# 获取选中按钮文本
text = buttongroup.checkedButton().text()

# 连接选中状态改变事件
buttongroup.buttonClicked.connect(handleButtonClicked)
```

### 勾选按钮 CheckBox

可以通过设定`QButtonGroup`的`exclusive`属性来控制是否只能单选一个选项。

```python
from PySide2.QtWidgets import QCheckBox, QButtonGroup

# 获取选中按钮文本
text = buttongroup.checkedButton().text()  # 单选情况

# 连接选中状态改变事件
buttongroup.buttonClicked.connect(handleButtonClicked)
```

### 数字输入框 SpinBox

```python
from PySide2.QtWidgets import QSpinBox

# 获取输入框数字（整数）
number = box.value()

# 设置输入框数字
box.setValue(100)
```

### 日期控件 DateEdit

当用户点击日期时间控件并且选取了日期和时间，可以使用`date()`方法获取。

```python
from PySide2.QtWidgets import QDateEdit

qdate = dateEdit.date()

# 转化为指定格式的字符串
dateStr = dateEdit.date().toString('yyyy-MM-dd')

# 获取年月日对应的数字
year = qdate.year()
month = qdate.month()
day = qdate.day()
```

### 选择文件框 FileDialog

选择目录可以使用`getExistingDirectory()`方法，该方法第一个参数是父窗口对象，第二个参数是选择框显示的标题，返回值为选择目录的路径字符串。

```python
filePath = QFileDialog.getExistingDirectory(self.ui, "选择存储路径")
```

选择单个文件可以使用`getOpenFileName()`方法，返回值是一个元组，第一个元素是文件路径，第二个元素是文件类型。

```python
filePath, _  = QFileDialog.getOpenFileName(
            self.ui,  # 父窗口对象
            "选择你要上传的图片",  # 标题
            r"d:\\data",  # 起始目录
            "图片类型 (*.png *.jpg *.bmp)"  # 选择类型过滤项
        )
```

选择多个文件可以使用 `getOpenFileNames()`，返回 `(文件路径列表, 选中的过滤器)` 元组；下面取出第一个元素作为路径列表。

```python
filePaths, _  = QFileDialog.getOpenFileNames(
            self.ui,  # 父窗口对象
            "选择你要上传的图片",  # 标题
            r"d:\\data",  # 起始目录
            "图片类型 (*.png *.jpg *.bmp)"  # 选择类型过滤项
        )
```

### 进度条 ProgressBar

```python
from PySide2.QtWidgets import QProgressBar

# 设定步骤个数
progressBar.setRange(0, 5)  # setRange(0, 0)显示忙碌指示符

# 指定当前进度
progressBar.setValue(3)

# 进度条清零
progressBar.reset()
```

</div>

## 信号与槽

当一个控件被操作时，如被鼠标拖拽、被点击、被输入文本等，就会发出*信号*（Signal），接收 Signal 并进行处理的函数叫做*槽*（Slot）。

<aside class="blog-callout" markdown="1">

**提示**

注意，当想要将一个方法作为槽函数连接到一个信号时，应该提供该方法的引用而不是调用它。如果方法名后跟括号，那么实际上是在调用该方法并获取其结果，而不是传递方法本身作为槽函数。

</aside>

## 后台任务与界面更新

### 事件循环与线程边界

Qt 的主线程负责事件循环和界面更新。在按钮槽中执行阻塞网络请求，会使界面暂时无法响应。耗时工作可以交给 `QThread` 或 Python 线程，但 **GUI 控件始终由主线程更新**；使用 `QThread` 也不会自动使控件访问安全。

工作线程只负责请求与数据处理，通过信号发送结果和错误；主线程中的槽再更新界面。网络操作还需要超时和异常处理，避免任务永久停留在等待状态。

### 一个完整的请求示例

下面使用 `QThread.run()` 执行单次阻塞请求，通过信号回传状态码和文本。窗口持有任务对象，请求期间禁用按钮，并在完成后释放对象。示例依赖 `requests`，默认地址可替换为自己的测试服务。

```python
import sys
import requests
from PySide2.QtCore import QThread, Signal, Slot
from PySide2.QtWidgets import (
    QApplication, QLineEdit, QPushButton, QTextBrowser, QVBoxLayout, QWidget,
)


class RequestThread(QThread):
    response_ready = Signal(int, str)
    error_occurred = Signal(str)

    def __init__(self, url, parent=None):
        super().__init__(parent)
        self.url = url

    def run(self):
        try:
            with requests.Session() as session:
                with session.get(self.url, timeout=(3, 10)) as response:
                    self.response_ready.emit(response.status_code, response.text)
        except requests.RequestException as exc:
            self.error_occurred.emit(str(exc))


class MainWindow(QWidget):
    def __init__(self):
        super().__init__()
        self.worker = None
        self.url = QLineEdit("http://127.0.0.1:8000/")
        self.button = QPushButton("发送 GET 请求")
        self.output = QTextBrowser()
        layout = QVBoxLayout(self)
        for widget in (self.url, self.button, self.output):
            layout.addWidget(widget)
        self.button.clicked.connect(self.start_request)

    @Slot()
    def start_request(self):
        self.button.setEnabled(False)
        self.output.setPlainText("请求中…")
        self.worker = RequestThread(self.url.text().strip(), self)
        self.worker.response_ready.connect(self.show_response)
        self.worker.error_occurred.connect(self.show_error)
        self.worker.finished.connect(self.request_finished)
        self.worker.start()

    @Slot(int, str)
    def show_response(self, status, text):
        self.output.setPlainText(f"HTTP {status}\n\n{text}")

    @Slot(str)
    def show_error(self, message):
        self.output.setPlainText(f"请求失败：{message}")

    @Slot()
    def request_finished(self):
        self.worker.deleteLater()
        self.worker = None
        self.button.setEnabled(True)

    def closeEvent(self, event):
        if self.worker is not None:
            event.ignore()  # 请求结束后允许关闭窗口
        else:
            super().closeEvent(event)


if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.resize(640, 480)
    window.show()
    sys.exit(app.exec_())
```

持续工作的任务也可以采用 `QObject` worker 配合 `moveToThread()`，在线程的事件循环中处理信号与槽。参见 [Qt 的线程与对象规则](https://doc.qt.io/qt-5/threads-qobject.html)。

## 资源与打包

### 资源文件编译器 PyRcc

PyInstaller 能收集代码与数据文件，但动态访问的资源路径需要显式处理。Qt 资源系统是一种方式：将资源列入 `.qrc`，再用 `pyside2-rcc` 编译成 Python 模块，导入后通过 `:/` 路径访问。另一种方式是用 `--add-data` 或 spec 文件收集外部资源，两者可按实际需要选择。

1. 创建`.qrc`文件，并包含所有资源文件的路径。这里，`prefix="/resources"`定义了资源在虚拟文件系统中的前缀路径，`<file>`标签列出了要包含的文件。

```xml
<RCC>
  <qresource prefix="/resources">
    <file>MyMainWindow.ui</file>
    <file>Textify_logo.ico</file>
  </qresource>
</RCC>
```

2. 使用`PyRcc`（也可在外部工具中配置好直接使用）将`.qrc`文件转换为 Python 模块。

```bash
pyside2-rcc resources/resources.qrc -o resources_rc.py
```

3. 在主程序中，导入`resources_rc`，通过资源前缀和文件名加载资源。

```python
from PySide2.QtCore import QFile, QIODevice
from PySide2.QtGui import QIcon
from PySide2.QtUiTools import QUiLoader
import resources_rc  # 导入时注册 Qt 资源

# 在已有 QApplication 的主线程中加载，显示返回的窗口
ui_file = QFile(":/resources/MyMainWindow.ui")
if not ui_file.open(QIODevice.ReadOnly):
    raise RuntimeError(ui_file.errorString())
window = QUiLoader().load(ui_file)
ui_file.close()
window.setWindowIcon(QIcon(":/resources/Textify_logo.ico"))
window.show()
```

4. 主程序正常导入 `resources_rc` 后，该模块通常会随依赖分析收集，无需再把它当作外部数据重复添加。若仍动态加载未编入 Qt 资源的文件，则显式配置数据收集和运行时路径。

### 可执行文件打包工具 PyInstaller

```bash
python -m pip install pyinstaller
```

```python
import PyInstaller.__main__

PyInstaller.__main__.run([
    'main.py',
    '--clean',
    '--onefile',
    '--noconsole',
    '--name=Textify',
    '--icon=resources/Textify_logo.ico',
])
```

等同于：

```bash
pyinstaller main.py --clean --onefile --noconsole --name "Textify" --icon "resources/Textify_logo.ico"
```

- `--clean` 在构建之前，清理 PyInstaller 缓存并删除临时文件。
- `--onefile` 创建单文件捆绑的可执行文件。
- `--noconsole` 不提供用于标准 i/o 的控制台窗口。建议先忽略该参数，控制台窗口可以显示可执行文件的报错信息。
- `--name NAME` 为捆绑的可执行文件指定的名称。
- `--icon <FILE.ico>` 将图标应用于可执行文件。png 转 ico：[网站 1](https://www.zamzar.com/convert/png-to-ico/)和网站 2。
- `--add-data SOURCE:DEST` 用于收集外部数据，`SOURCE` 为源路径，`DEST` 为打包后的目标目录。

数据收集说明见 [PyInstaller 官方文档](https://pyinstaller.org/en/stable/spec-files.html#adding-data-files)。
