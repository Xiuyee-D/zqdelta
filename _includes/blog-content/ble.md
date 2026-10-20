## 蓝牙广播（Advertising）

### 蓝牙广播的分类

- 可连接非定向：大部分蓝牙设备常用的广播方式。
- 可连接定向：主要用于已配对设备的快速连接。
- 不可连接非定向：蓝牙信标或蓝牙传感器常用的广播方式。
- 可扫描非定向：在不可连接非定向的基础上，加入了扫描响应的功能，能够通过扫描响应来承载更多的数据。
<img class="blog-image" src="{{ '/assets/img/blog/ble/advertising-types.png' | relative_url }}" alt="蓝牙广播的分类" width="1093" height="561" loading="lazy" decoding="async">

### 蓝牙广播的频段

低功耗蓝牙工作在**2.4GHz 频段**，频率范围为 2402MHz 到 2480MHz，每 2MHz 一个信道，共 40 个信道。其中 37、38、39 是 3 个广播信道，剩余的是数据信道。三个主广播信道分别位于 2402、2426、2480 MHz；它们在频谱上分散分布，有助于降低局部频段干扰对设备发现的影响。
<img class="blog-image" src="{{ '/assets/img/blog/ble/advertising-channels.png' | relative_url }}" alt="蓝牙广播的频段" width="1278" height="531" loading="lazy" decoding="async">

### 蓝牙广播的数据结构

传统非定向广播 PDU 的载荷最多为 37 字节，其中广播设备地址占 6 字节，广播数据最多为 31 字节。这 31 个可用的字节按照一定的格式来组织，被分割为$$n$$个广播数据结构体（AD Structure）。如图所示：
<img class="blog-image" src="{{ '/assets/img/blog/ble/advertising-data-structure.png' | relative_url }}" alt="蓝牙广播的数据结构" width="923" height="462" loading="lazy" decoding="async">

每个 AD Structure 包含三部分，分别是：Length(1 字节)，AD Type(1 字节)，AD Data(n 字节)。其中，Length = AD Type 长度 + AD Data 长度。如下广播数据：

```
0x04,0x09,0x41,0x42,0x43,0x03,0x19,0x80,0x01
```

按照蓝牙的广播数据格式可以解析为 2 个 AD Structure，如图所示：
<img class="blog-image" src="{{ '/assets/img/blog/ble/advertising-data-example.png' | relative_url }}" alt="广播数据解析示例" width="1275" height="410" loading="lazy" decoding="async">

AD Type 由蓝牙组织联盟指定并发布，常用的 AD Type 及其含义如下：
<img class="blog-image" src="{{ '/assets/img/blog/ble/advertising-data-types.png' | relative_url }}" alt="常用的AD Type" width="1353" height="234" loading="lazy" decoding="async">

厂商自定义数据的前两个数据字节为 **Company Identifier**，采用小端字节序，其后为厂商定义的内容。下面使用内部测试标识 `0xFFFF`，以 `APPLE` 为数据内容：

```
0x05,0x09,0x31,0x32,0x33,0x34,0x02,0x0A,0x08,0x08,0xFF,0xFF,0xFF,0x41,0x50,0x50,0x4C,0x45
```

一共可以分割成三个 AD Structure：

- 第一个 AD Structure 的长度为 0x05，类型为 0x09(完整的设备名称)，那么该 AD Structure 余下的数据含义就是完整的设备名称，0x31,0x32,0x33,0x34 按照 UTF-8 编码，就是 1234。
- 第二个 AD Structure 的长度为 0x02，类型为 0x0A(发射功率)，那么后面的数据 0x08 表示的就是发射功率。
- 第三个 AD Structure 的长度为 0x08，类型为 0xFF（厂商自定义数据）。前两个数据字节 0xFF,0xFF 表示 Company Identifier 0xFFFF，后续 0x41,0x50,0x50,0x4C,0x45 为 `APPLE`。

### 蓝牙广播实践

实验使用的是 ESP32 芯片平台，MicroPython 固件，uPyCraft 开发环境，nRF Connect 手机应用。导入蓝牙功能，创建 BLE 实体，打开 BLE，并设置 BLE 的广播参数，示例代码如下：

```python
from machine import Pin
from time import sleep_ms
import ubluetooth   #导入BLE功能模块

ble = ubluetooth.BLE()  #创建BLE设备
ble.active(True)  #打开BLE

#设置BLE广播数据并开始广播
ble.gap_advertise(100_000, adv_data = b'\x02\x01\x06\x03\x09\x41\x42')
```

广播参数主要设置了蓝牙的广播时间间隔为 100 ms（参数单位为微秒，因此传入 `100_000`），广播数据为:

```
0x02,0x01,0x06,0x03,0x09,0x41,0x42
```

AD Type 0x01 表示的是设备标识，其含义如下：
<img class="blog-image" src="{{ '/assets/img/blog/ble/device-address-types.png' | relative_url }}" alt="设备标识含义" width="761" height="389" loading="lazy" decoding="async">
设备只支持 BLE(低功耗蓝牙)，不支持 BR/EDR(经典蓝牙)，一般都将设备设为处于普通发现模式，所以只设置 Bit1 和 Bit2，即 0x06（b00000110）。

蓝牙名称采用的是 UTF-8 编码，在 Python 中，可以使用.encode("UTF-8") 将字符串转换成 UTF-8 编码的数组，一个汉字转换成 UTF-8 编码后，占用 3 个字节，例如：

```python
ble.gap_advertise(100_000, adv_data = b'\x02\x01\x06\x0D\x09' + "我的蓝牙".encode("UTF-8"))
```

### 扫描请求和扫描响应

蓝牙设备除了可以通过上述方式主动发射广播数据外，还可以接受其他设备的扫描请求，从而响应额外的数据，二者区别如下:

- 广播：蓝牙从机设备主动发出的数据。
- 扫描响应：当蓝牙主机收到从机的广播数据后，如果想要进一步了解该从机设备的信息，可以向从机设备发送扫描请求，从机收到扫描请求后，向对应的主机回复扫描响应。
<img class="blog-image" src="{{ '/assets/img/blog/ble/scan-request-response.png' | relative_url }}" alt="扫描请求和扫描响应" width="1004" height="612" loading="lazy" decoding="async">

蓝牙的广播数据最多是 31 个字节，如果广播数据太多，这 31 个字节装不下时，就可以将一部分不太重要的数据放到扫描响应数据里面，来分担广播数据的工作。通过如下方式可以设置蓝牙的扫描响应数据：

```python
ble.gap_advertise(100_000, adv_data = b'\x02\x01\x06\x03\x09\x41\x42', resp_data = b'\x08\xFF\xFF\xFF\x41\x42\x43\x44\x45')
```

扫描响应同样采用 AD Structure 格式，这里的厂商数据由测试标识 `0xFFFF` 和 `ABCDE` 组成。

## 蓝牙状态切换和事件处理

### 蓝牙状态机

蓝牙链路层的状态机有五种状态，分别是就绪态，广播态，链接态，扫描态，发起链接态，各个状态间的转换路径如下图所示：
<img class="blog-image" src="{{ '/assets/img/blog/ble/ble-state-machine.png' | relative_url }}" alt="蓝牙状态机" width="932" height="543" loading="lazy" decoding="async">
以手机连接某个蓝牙模块为例，手机作为主机设备，蓝牙模块作为从机设备，上电之后二者都将处于就绪态。蓝牙模块设置广播数据并开始广播后将转换到广播态，手机扫描附近范围内的蓝牙设备时将转换到扫描态。手机尝试连接某个设备时，手机的蓝牙处于发起态，连接成功后，二者将都处于连接态。断开连接之后，二者将都再回到就绪态。

### 蓝牙事件处理

蓝牙设备通常会有蓝牙连接，断开连接，收到数据等事件，在 MicroPython 中，通过中断程序来处理这些事件，示例代码如下：

```python
from machine import Pin
from time import sleep_ms
import ubluetooth   #导入BLE功能模块

ble = ubluetooth.BLE()  #创建BLE设备
ble.active(True)  #打开BLE（此时设备将处于就绪态）

#设置BLE广播数据并开始广播（开始广播后设备将处于广播态）
ble.gap_advertise(100_000, adv_data = b'\x02\x01\x06\x03\x09\x41\x42')

#定义蓝牙事件中断函数
def ble_irq(event, data): # 蓝牙中断函数
    if event == 1: #蓝牙已连接（此时蓝牙将处于连接态）
      print("BLE 连接成功")

    elif event == 2: #蓝牙已断开（此时蓝牙将从链接态进入就绪态）
      print("BLE 连接断开")
      ble.gap_advertise(100_000, adv_data = b'\x02\x01\x06\x03\x09\x41\x42')#再次启动广播

    elif event == 3: # 收到数据
      print("BLE 收到新消息")

ble.irq(ble_irq) #注册蓝牙中断函数
```

上述代码实现了简单的蓝牙事件处理：

- 当蓝牙连接成功时，将触发事件 ID 为 1 的事件，此时蓝牙设备将从广播态转换成连接态。
- 当主机设备主动断开，或者其他因素断开连接后，将处于事件 ID 为 2 的事件，此时设备将从连接态进入就绪态，要想设备能够继续广播被别的设别发现，需要在蓝牙断开事件中再次启动广播，使设备再次进入广播态。
- 当蓝牙设备收到数据后，将触发事件 ID 为 3 的事件，可在此事件中进行数据处理。

## 蓝牙服务和特性

低功耗蓝牙设备之间的通信，基于服务和特性。一个蓝牙设备中可以包含若干个服务，一个服务中可以包含若干个特性，每一个服务或者特性都有一个 UUID。

### UUID

UUID（Universally Unique Identifier），即通用唯一标识符，是蓝牙组织联盟定义的用于区分蓝牙服务和特性的标识符，总长度为 128 Bit。例如：

```
03B80E5A-EDE8-4B33-A751-6CE34EC4C700
7772E5DB-3868-4112-A1A9-F2669D106BF3
```

对于一些常用的功能，蓝牙组织联盟已经为其定义好了 UUID，在开发产品的时候直接使用即可，例如电池电量特性的 UUID 是 0x2A19。

128Bit 的 UUID 占用 16 个字节，不便于传输。Bluetooth SIG 为已分配的短 UUID 定义了基础 UUID，可将 16 位值扩展为 128 位形式。产品自定义服务和特性使用自生成的 128 位 UUID。UUID 基地址：

```
0x0000xxxx-0000-1000-8000-00805F9B34FB
```

比如 16Bit 的 UUID：0x2A37，转换成 128Bit 的 UUID 为：

```
0x00002A37-0000-1000-8000-00805F9B34FB
```

### 服务和特性的创建

蓝牙设备要在进入广播态之前创建服务和特性，在 MicroPython 中大概分为四步：

- 创建要使用的 UUID；
- 使用 UUID 创建特性并设置特性的读写权限；
- 将创建好的特性添加到服务集合中；
- 将服务集合注册到协议栈中。

例如，创建一个自定义服务，包含可读写的接收特性与可读、可通知的发送特性。分别保存注册返回的属性句柄，后续读写和通知使用这些句柄。以下 UUID 仅作为本例的自定义标识：

```python
from machine import Pin
from time import sleep_ms
import ubluetooth        #导入BLE功能模块

ble = ubluetooth.BLE()   #创建BLE设备
ble.active(True)         #打开BLE

#创建要使用的UUID
SERVER_1_UUID = ubluetooth.UUID("d76a0001-18b8-4c94-97c8-9e66a78d7a01")
CHAR_A_UUID = ubluetooth.UUID("d76a0002-18b8-4c94-97c8-9e66a78d7a01")
CHAR_B_UUID = ubluetooth.UUID("d76a0003-18b8-4c94-97c8-9e66a78d7a01")

#创建特性并设置特性的读写权限
CHAR_A = (CHAR_A_UUID, ubluetooth.FLAG_READ | ubluetooth.FLAG_WRITE, )
CHAR_B = (CHAR_B_UUID, ubluetooth.FLAG_READ | ubluetooth.FLAG_NOTIFY, )

SERVER_1 = (SERVER_1_UUID, (CHAR_A , CHAR_B, ) , ) #把特性A和特性B放入服务1
SERVICES = (SERVER_1, ) #把服务1放入服务集和中
((char_a, char_b), ) = ble.gatts_register_services(SERVICES) #注册服务到gatts

#设置BLE广播数据并开始广播
ble.gap_advertise(100_000, adv_data = b'\x02\x01\x06\x03\x09\x41\x42')
```

### 数据交互

低功耗蓝牙之间的数据交互都是基于特性进行的，数据交互的方式有五种，分别是 Read、Write、Write Without Response、Notify、Indicate。 以手机连接蓝牙模块为例：
<img class="blog-image" src="{{ '/assets/img/blog/ble/connection-data-exchange.png' | relative_url }}" alt="手机连接蓝牙模块时的数据交互" width="996" height="785" loading="lazy" decoding="async">

手机使用 Read 方法读取蓝牙模块的数据，使用 Write 方法发送数据给蓝牙模块，蓝牙模块使用 Notify 方法发送数据到手机，注意手机端需打开 Notify 监听。中断函数中加入数据接收事件，示例代码如下：

下面接续上一节的 `ble`、`char_a` 与 `char_b`，将接收数据原样作为示例响应。连接句柄来自事件；收到 `char_a` 写入后，通过具备 Notify 属性的 `char_b` 通知已订阅的客户端。

```python
from micropython import const

_IRQ_CENTRAL_CONNECT = const(1)
_IRQ_CENTRAL_DISCONNECT = const(2)
_IRQ_GATTS_WRITE = const(3)


def ble_irq(event, data):
    if event == _IRQ_CENTRAL_CONNECT:
        conn_handle, addr_type, addr = data
        print("BLE connected:", conn_handle)
    elif event == _IRQ_CENTRAL_DISCONNECT:
        conn_handle, addr_type, addr = data
        print("BLE disconnected:", conn_handle)
        ble.gap_advertise(100_000)  # 复用上一节设置的广播数据
    elif event == _IRQ_GATTS_WRITE:
        conn_handle, attr_handle = data
        if attr_handle == char_a:
            payload = ble.gatts_read(char_a)
            ble.gatts_write(char_b, payload)
            ble.gatts_notify(conn_handle, char_b, payload)


ble.irq(ble_irq)
```

<img class="blog-image" src="{{ '/assets/img/blog/ble/connection-sequence.png' | relative_url }}" alt="手机连接蓝牙模块流程" width="785" height="786" loading="lazy" decoding="async">

## 参考资料

- [MicroPython BLE 接口与事件参数](https://docs.micropython.org/en/v1.23.0/library/bluetooth.html)
- [Bluetooth SIG：广播数据类型与厂商数据格式](https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/CSS_v14/out/en/core-supplementary-features/data-types-specification.html)
- [Bluetooth SIG：Bluetooth Low Energy 技术概述](https://www.bluetooth.com/learn-about-bluetooth/tech-overview/)
