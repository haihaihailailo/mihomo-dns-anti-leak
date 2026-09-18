"""Bounded Windows probe worker. Credentials arrive on stdin; never written to disk."""
import base64
import ctypes as c
from ctypes import wintypes as w
import ipaddress
import json
import os
import secrets
import socket
import ssl
import struct
import subprocess
import sys
import threading
import time
import urllib.request


def guard():
    # 复用既有 Windows Job Object 方案；在启动子进程前纳入总内存、进程数和退出保护。
    class Basic(c.Structure):
        _fields_ = [('user', c.c_longlong), ('jobuser', c.c_longlong), ('flags', w.DWORD),
                    ('minws', c.c_size_t), ('maxws', c.c_size_t), ('active', w.DWORD),
                    ('affinity', c.c_size_t), ('priority', w.DWORD), ('scheduling', w.DWORD)]
    class IO(c.Structure):
        _fields_ = [(n, c.c_ulonglong) for n in ('r', 'w', 'o', 'rb', 'wb', 'ob')]
    class Extended(c.Structure):
        _fields_ = [('basic', Basic), ('io', IO), ('processmem', c.c_size_t),
                    ('jobmem', c.c_size_t), ('peakprocess', c.c_size_t), ('peakjob', c.c_size_t)]
    kernel = c.WinDLL('kernel32', use_last_error=True)
    kernel.CreateJobObjectW.argtypes = [c.c_void_p, w.LPCWSTR]
    kernel.CreateJobObjectW.restype = w.HANDLE
    kernel.SetInformationJobObject.argtypes = [w.HANDLE, c.c_int, c.c_void_p, w.DWORD]
    kernel.AssignProcessToJobObject.argtypes = [w.HANDLE, w.HANDLE]
    kernel.GetCurrentProcess.restype = w.HANDLE
    job = kernel.CreateJobObjectW(None, None)
    limits = Extended()
    limits.basic.flags = 0x2000 | 0x200 | 0x8  # kill on close, job memory, active process count
    limits.basic.active = 3
    limits.jobmem = 512 * 1024 * 1024
    if not job or not kernel.SetInformationJobObject(job, 9, c.byref(limits), c.sizeof(limits)):
        raise c.WinError(c.get_last_error())
    if not kernel.AssignProcessToJobObject(job, kernel.GetCurrentProcess()):
        raise c.WinError(c.get_last_error())
    timer = threading.Timer(480, lambda: os._exit(124))
    timer.daemon = True
    timer.start()
    return job, timer


def freeport():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


def exact(sock, size):
    result = b''
    while len(result) < size:
        chunk = sock.recv(size - len(result))
        if not chunk:
            raise EOFError('SOCKS peer closed')
        result += chunk
    return result


def address(value):
    parsed = ipaddress.ip_address(value)
    return bytes([1 if parsed.version == 4 else 4]) + parsed.packed


def socks(port, target, command):
    sock = socket.create_connection(('127.0.0.1', port), timeout=4)
    try:
        sock.sendall(b'\x05\x01\x00')
        assert exact(sock, 2) == b'\x05\x00'
        sock.sendall(bytes([5, command, 0]) + address(target[0]) + struct.pack('!H', target[1]))
        head = exact(sock, 4)
        if head[1] != 0:
            raise ConnectionError('SOCKS reply ' + str(head[1]))
        if head[3] == 1:
            host = socket.inet_ntop(socket.AF_INET, exact(sock, 4))
        elif head[3] == 4:
            host = socket.inet_ntop(socket.AF_INET6, exact(sock, 16))
        else:
            host = exact(sock, exact(sock, 1)[0]).decode('ascii')
        remoteport = struct.unpack('!H', exact(sock, 2))[0]
        return sock, (host, remoteport)
    except BaseException:
        sock.close()
        raise


def udp(port, destination):
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as peer:
        peer.bind(('127.0.0.1', 0))
        peer.settimeout(4)
        control, relay = socks(port, peer.getsockname(), 3)
        with control:
            token = secrets.token_bytes(2)
            # 随机名称避免本地 DNS 缓存；只要求匹配问题的合法 NOERROR/NXDOMAIN 响应。
            name = [secrets.token_hex(6).encode(), b'example', b'com']
            question = b''.join(bytes([len(x)]) + x for x in name) + b'\x00\x00\x01\x00\x01'
            packet = token + b'\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00' + question
            prefix = b'\x00\x00\x00' + address(destination) + struct.pack('!H', 53)
            peer.sendto(prefix + packet, relay)
            answer, sender = peer.recvfrom(4096)
            assert sender == relay and answer[:3] == b'\x00\x00\x00'
            assert answer[3:len(prefix)] == prefix[3:], 'Unexpected UDP source'
            data = answer[len(prefix):]
            assert data[:2] == token and data[2] & 128 and (data[3] & 15) in (0, 3)
            assert data[12:12 + len(question)] == question


def tcp(port, destination):
    control, _ = socks(port, (destination, 443), 1)
    with control:
        with ssl.create_default_context().wrap_socket(control, server_hostname='cloudflare-dns.com') as tls:
            tls.sendall(b'GET /dns-query HTTP/1.1\r\nHost: cloudflare-dns.com\r\nConnection: close\r\n\r\n')
            data = tls.recv(4096)
            assert data.startswith(b'HTTP/1.'), 'No validated HTTPS response'


def measured(function, *args):
    start = time.monotonic()
    try:
        function(*args)
        return {'ok': True, 'ms': round((time.monotonic() - start) * 1000)}
    except Exception as error:
        # 不输出异常字符串，避免内核/HTTP 错误意外带出配置内容。
        return {'ok': False, 'ms': round((time.monotonic() - start) * 1000), 'error': type(error).__name__}


def main():
    job, timer = guard()
    sys.stdin.reconfigure(encoding='utf-8')
    subscriptions = json.load(sys.stdin)
    controller, port = freeport(), freeport()
    secret = secrets.token_hex(24)
    base = {'mode': 'rule', 'log-level': 'warning', 'ipv6': True, 'allow-lan': False,
            'bind-address': '127.0.0.1', 'port': 0, 'socks-port': port, 'mixed-port': 0,
            'redir-port': 0, 'tproxy-port': 0, 'external-controller': f'127.0.0.1:{controller}',
            'secret': secret, 'tun': {'enable': False},
            # 系统 DNS 可能是另一代理的 fake-ip；入口解析必须用独立 DoH 得到实际地址。
            'dns': {'enable': True, 'listen': '127.0.0.1:0', 'ipv6': False,
                    'enhanced-mode': 'redir-host', 'respect-rules': False,
                    'nameserver': ['https://223.5.5.5/dns-query'],
                    'proxy-server-nameserver': ['https://223.5.5.5/dns-query']},
            'sniffer': {'enable': False}, 'geo-auto-update': False, 'find-process-mode': 'off',
            'profile': {'store-selected': False, 'store-fake-ip': False}, 'rules': ['MATCH,REJECT']}
    env = {k: v for k, v in os.environ.items() if not k.upper().endswith('_PROXY')}
    env['GOMEMLIMIT'] = '256MiB'
    core = subprocess.Popen([sys.argv[1], '-d', sys.argv[2], '-config',
                             base64.b64encode(json.dumps(base).encode()).decode()],
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                            creationflags=0x08000000, env=env)
    error_kinds = {}
    def drain():
        for line in core.stdout:
            # 仅统计固定错误词，不保留完整日志、地址或凭据。
            for kind in ('timeout', 'refused', 'resolve', 'no such host', 'certificate', 'unreachable', 'EOF'):
                if kind in line.decode('utf-8', errors='replace'):
                    error_kinds[kind] = error_kinds.get(kind, 0) + 1
    threading.Thread(target=drain, daemon=True).start()
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

    def api(method, route, body=None):
        request = urllib.request.Request(f'http://127.0.0.1:{controller}' + route,
                    data=json.dumps(body).encode() if body is not None else None, method=method,
                    headers={'Authorization': 'Bearer ' + secret, 'Content-Type': 'application/json'})
        with opener.open(request, timeout=6) as response:
            value = response.read(4 * 1024 * 1024)
            return json.loads(value) if value else None
    try:
        for _ in range(40):
            try:
                version = api('GET', '/version')
                break
            except Exception:
                if core.poll() is not None:
                    raise RuntimeError('Isolated core exited')
                time.sleep(.1)
        else:
            raise RuntimeError('Isolated controller not ready')
        # 负向控制确认 REJECT 不会产生成功结果；与真实节点测试使用同一 SOCKS 入口。
        negative = measured(udp, port, '1.1.1.1')
        assert not negative['ok'], 'Reject negative control unexpectedly succeeded'
        report = {'version': version, 'utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                  'negativeControl': negative, 'scope': 'cached local subscriptions; sampled nodes; isolated core',
                  'subscriptions': []}
        extensions = os.environ.get('SUBSCRIPTION_PROBE_EXTENSIONS') == '1'
        for subscription in subscriptions:
            group = {k: v for k, v in subscription.items() if k not in ('hosts', 'proxies')}
            group['results'] = []
            for proxy in subscription['proxies']:
                # 每次只载入一个节点；末尾 REJECT 防止不支持 UDP 时退回 DIRECT。
                config = dict(base, hosts=subscription['hosts'], proxies=[dict(proxy, name='probe')],
                              rules=['MATCH,probe', 'MATCH,REJECT'])
                api('DELETE', '/connections')
                api('PUT', '/configs?force=true', {'payload': json.dumps(config)})
                result = {'name': proxy['name'], 'type': proxy['type'], 'network': proxy.get('network', 'default')}
                result['tcp4'] = measured(tcp, port, '1.1.1.1')
                result['udp4'] = measured(udp, port, '1.1.1.1')
                if not result['udp4']['ok']:
                    result['udp4Alternate'] = measured(udp, port, '8.8.8.8')
                if not extensions:
                    result['tcp6'] = measured(tcp, port, '2606:4700:4700::1111')
                    result['udp6'] = measured(udp, port, '2606:4700:4700::1111')
                elif result['tcp4']['ok']:
                    variants = {}
                    if proxy['type'] in ('ss', 'ssr', 'trojan', 'vless'):
                        variants['tfo'] = {'tfo': True}
                    if proxy['type'] in ('ss', 'trojan', 'vless'):
                        variants['smux'] = {'smux': {'enabled': True, 'protocol': 'h2mux', 'padding': False}}
                    if proxy['type'] == 'ss':
                        variants['uot1'] = {'udp-over-tcp': True, 'udp-over-tcp-version': 1}
                        variants['uot2'] = {'udp-over-tcp': True, 'udp-over-tcp-version': 2}
                    result['variants'] = {}
                    for label, changes in variants.items():
                        api('DELETE', '/connections')
                        candidate = dict(config, proxies=[dict(proxy, name='probe', **changes)])
                        try:
                            api('PUT', '/configs?force=true', {'payload': json.dumps(candidate)})
                        except Exception as error:
                            result['variants'][label] = {'accepted': False, 'error': type(error).__name__}
                            continue
                        value = {'accepted': True, 'tcp4': measured(tcp, port, '1.1.1.1')}
                        if label != 'tfo':
                            value['udp4'] = measured(udp, port, '1.1.1.1')
                        result['variants'][label] = value
                    # TFO 接通可能发生普通 TCP 回退；本诊断不声称已协商 TFO 或提升性能。
                group['results'].append(result)
                result['coreErrorKinds'] = dict(error_kinds)
                print(json.dumps(result, ensure_ascii=True), file=sys.stderr, flush=True)
            report['subscriptions'].append(group)
        print(json.dumps(report, ensure_ascii=True), flush=True)
    finally:
        core.terminate()
        core.wait(timeout=8)
        timer.cancel()
    # Job handle intentionally kept until worker exit; Windows closes and kills any remaining descendants.
    assert job


if __name__ == '__main__':
    try:
        main()
    except BaseException as error:
        print(type(error).__name__ + ': private diagnostic failed', file=sys.stderr, flush=True)
        sys.exit(1)
