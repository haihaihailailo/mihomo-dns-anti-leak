from pathlib import Path

CONFIG = Path("防DNS泄露.yaml")
text = CONFIG.read_text(encoding="utf-8")
original = text


def insert_after(anchor: str, addition: str, marker: str) -> None:
    global text
    if marker in text:
        return
    if anchor not in text:
        raise RuntimeError(f"Required anchor not found: {anchor!r}")
    text = text.replace(anchor, anchor + addition, 1)


insert_after(
    "  parse-pure-ip: true\n",
    "  # 跳过局域网目标嗅探，避免 NAS、投屏、设备发现等目标被改写\n"
    "  skip-dst-address:\n"
    "    - 10.0.0.0/8\n"
    "    - 172.16.0.0/12\n"
    "    - 192.168.0.0/16\n"
    "    - 100.64.0.0/10\n"
    "    - 169.254.0.0/16\n"
    "    - fc00::/7\n"
    "    - fe80::/10\n",
    "skip-dst-address:\n",
)

insert_after(
    "  strict-route: true\n",
    "  # 局域网地址直接绕过 TUN\n"
    "  route-exclude-address:\n"
    "    - 10.0.0.0/8\n"
    "    - 172.16.0.0/12\n"
    "    - 192.168.0.0/16\n"
    "    - 100.64.0.0/10\n"
    "    - 169.254.0.0/16\n"
    "    - fc00::/7\n"
    "    - fe80::/10\n"
    "  # Android：微信、支付宝完全绕过 TUN，避免小程序、支付和扫码登录异常\n"
    "  exclude-package:\n"
    "    - com.tencent.mm\n"
    "    - com.eg.android.AlipayGphone\n",
    "route-exclude-address:\n",
)

# 删除旧位置的私有网络规则，随后统一移动到 rules: 最前面。
for line in (
    '  - "RULE-SET,private,DIRECT"\n',
    '  - "GEOIP,LAN,DIRECT,no-resolve"\n',
    "  - RULE-SET,private,DIRECT\n",
    "  - GEOIP,LAN,DIRECT,no-resolve\n",
):
    text = text.replace(line, "")

lan_block = (
    "rules:\n"
    "  # --- 私有网络 / 局域网优先直连：必须早于全部 PROCESS-NAME ---\n"
    "  - \"IP-CIDR,127.0.0.0/8,DIRECT,no-resolve\"\n"
    "  - \"IP-CIDR,10.0.0.0/8,DIRECT,no-resolve\"\n"
    "  - \"IP-CIDR,172.16.0.0/12,DIRECT,no-resolve\"\n"
    "  - \"IP-CIDR,192.168.0.0/16,DIRECT,no-resolve\"\n"
    "  - \"IP-CIDR,100.64.0.0/10,DIRECT,no-resolve\"\n"
    "  - \"IP-CIDR,169.254.0.0/16,DIRECT,no-resolve\"\n"
    "  - \"IP-CIDR6,fc00::/7,DIRECT,no-resolve\"\n"
    "  - \"IP-CIDR6,fe80::/10,DIRECT,no-resolve\"\n"
    "  - \"RULE-SET,private,DIRECT\"\n"
    "  - \"GEOIP,LAN,DIRECT,no-resolve\"\n\n"
)
marker = "# --- 私有网络 / 局域网优先直连：必须早于全部 PROCESS-NAME ---"
if marker not in text:
    if "rules:\n" not in text:
        raise RuntimeError("Required rules: anchor not found")
    text = text.replace("rules:\n", lan_block, 1)

text = text.replace(
    "  - PROCESS-NAME,com.heytap.browser,国内服务 # OPPO 浏览器\n",
    "  # - PROCESS-NAME,com.heytap.browser,国内服务 # OPPO 浏览器（混合入口，交给域名规则分流）\n",
)
text = text.replace(
    "  - PROCESS-NAME,com.nearme.instant.platform,国内服务 # 快应用服务框架\n",
    "  # - PROCESS-NAME,com.nearme.instant.platform,国内服务 # 快应用服务框架（混合入口，交给域名规则分流）\n",
)

if text == original:
    print("No changes required.")
else:
    CONFIG.write_text(text, encoding="utf-8")
    print("Updated 防DNS泄露.yaml")
