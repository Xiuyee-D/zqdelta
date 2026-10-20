TCP 与 UDP 是传输层协议，Modbus TCP 则是在 TCP 之上定义请求、响应和寄存器语义的应用层协议。下面先比较传输特性，再给出 Python 客户端示例。

<div class="blog-table" markdown="1">

| 比较项     | UDP                              | TCP                                    | Modbus TCP                              |
| ---------- | -------------------------------- | -------------------------------------- | --------------------------------------- |
| 协议层次   | 传输层                           | 传输层                                 | 基于 TCP 的应用层                       |
| 连接方式   | 无连接                           | 面向连接                               | 使用 TCP 连接                           |
| 数据边界   | 保留数据报边界                   | 字节流，不保留业务消息边界             | 通过 MBAP 头部等定义报文边界            |
| 可靠性     | 不保证交付、去重或顺序           | 在连接有效期间提供可靠、有序的字节传输 | 在 TCP 上增加事务标识、功能码和异常响应 |
| 开销与时延 | 无连接握手；可靠性需求由应用处理 | 有握手、拥塞控制和重传开销             | 还受设备处理及请求／响应方式影响        |
| 典型用途   | 实时媒体、发现与广播             | 文件传输、Web、远程连接                | 工业设备控制与寄存器读写                |

</div>

## UDP：按数据报收发

```python
import socket

server_address = ("192.168.1.100", 12345)
try:
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        sock.settimeout(5)
        sock.sendto(b"Test Message", server_address)
        data, sender = sock.recvfrom(4096)
        print("Received from", sender, data)
except socket.timeout:
    print("No response before timeout")
except OSError as exc:
    print("UDP error:", exc)
```

示例发送一个数据报，并等待服务端响应，接收缓冲区为 4096 字节。

## TCP：处理字节流边界

TCP 按字节流传输，**消息边界由应用层协议定义**。`sendall()` 发送全部字节，`recv()` 按当前可用数据返回。下面的客户端与服务端约定使用“4 字节大端长度＋正文”的报文格式，通过 `recv_exact()` 循环读取完整消息。

```python
import socket
import struct


def recv_exact(sock, size):
    data = bytearray()
    while len(data) < size:
        chunk = sock.recv(size - len(data))
        if not chunk:
            raise ConnectionError("Connection closed before a complete message")
        data.extend(chunk)
    return bytes(data)


server_address = ("192.168.1.100", 12345)
try:
    with socket.create_connection(server_address, timeout=5) as sock:
        payload = b"Test Message"
        sock.sendall(struct.pack("!I", len(payload)) + payload)
        size = struct.unpack("!I", recv_exact(sock, 4))[0]
        if size > 1024 * 1024:
            raise ValueError("Unexpected response length")
        print("Received:", recv_exact(sock, size))
except (OSError, ConnectionError, ValueError) as exc:
    print("TCP error:", exc)
```

部分收发和报文边界的说明见 [Python Socket 编程指南](https://docs.python.org/3/howto/sockets.html#using-a-socket)。

## Modbus TCP：读取保持寄存器

以下示例使用 **PyModbus 3.6.9** 的同步接口。

```bash
python -m pip install "pymodbus==3.6.9"
```

```python
from pymodbus.client import ModbusTcpClient
from pymodbus.exceptions import ModbusException

client = ModbusTcpClient("192.168.1.100", port=502, timeout=5)
try:
    if not client.connect():
        raise ConnectionError("Unable to connect to the Modbus server")
    response = client.read_holding_registers(address=0, count=2, slave=1)
    if response.isError():
        print("Modbus exception:", response)
    else:
        print("Register values:", response.registers)
except (OSError, ConnectionError, ModbusException) as exc:
    print("Modbus error:", exc)
finally:
    client.close()
```

`address=0` 表示从偏移 0 开始读取，`count=2` 表示读取两个保持寄存器，`slave=1` 为设备标识。寄存器地址、数据类型和字节序由设备的寄存器映射定义。接口说明见 [PyModbus 3.6.9 文档](https://pymodbus.readthedocs.io/en/v3.6.9/source/client.html)。
