#!/usr/bin/env python3
"""
最小可运行示例：
1. 确保存在自定义 bridge 网络 redamon（不存在则创建）
2. 启动一个 alpine 容器加入该网络，并验证能解析/访问 webapp:3000
3. 自动清理容器

用法：
    python tests/test_container_create.py
"""
import sys
import time
import docker
from docker.errors import NotFound, APIError

NETWORK_NAME = "redamon"
CONTAINER_IMAGE = "alpine:latest"
CONTAINER_NAME = "redamon-network-test"
WEBAPP_URL = "http://webapp:3000/api/health"

def main() -> None:
    client = docker.from_env()

    # 1. 确保网络存在
    try:
        network = client.networks.get(NETWORK_NAME)
        print(f"[+] 网络 {NETWORK_NAME!r} 已存在，ID: {network.id[:12]}")
    except NotFound:
        print(f"[*] 网络 {NETWORK_NAME!r} 不存在，正在创建...")
        network = client.networks.create(NETWORK_NAME, driver="bridge")
        print(f"[+] 网络已创建，ID: {network.id[:12]}")

    # 2. 启动测试容器
    print(f"[*] 启动测试容器 {CONTAINER_NAME!r}...")
    try:
        client.containers.get(CONTAINER_NAME).remove(force=True)
    except NotFound:
        pass

    container = client.containers.run(
        CONTAINER_IMAGE,
        name=CONTAINER_NAME,
        network=NETWORK_NAME,
        command="sleep 30",  # 30 秒后自动退出
        detach=True,
        remove=True,  # 退出后自动删除
    )
    print(f"[+] 容器已启动，ID: {container.id[:12]}")

    # 3. 验证 DNS 解析
    print(f"[*] 测试 DNS 解析 'webapp'...")
    try:
        exit_code, output = container.exec_run("nslookup webapp", timeout=5)
        if exit_code == 0:
            print(f"[+] DNS 解析成功:\n{output.decode().strip()}")
        else:
            print(f"[!] DNS 解析失败，exit={exit_code}")
    except APIError as e:
        print(f"[!] DNS 测试出错: {e}")

    # 4. 验证 HTTP 连通性
    print(f"[*] 测试 HTTP GET {WEBAPP_URL} ...")
    try:
        exit_code, output = container.exec_run(
            f"wget -q -O - --timeout=5 {WEBAPP_URL}", timeout=10
        )
        if exit_code == 0:
            print(f"[+] HTTP 访问成功，响应:\n{output.decode().strip()}")
        else:
            print(f"[!] HTTP 访问失败，exit={exit_code}, output:\n{output.decode().strip()}")
    except APIError as e:
        print(f"[!] HTTP 测试出错: {e}")

    # 5. 清理（理论上 remove=True 已足够，这里手动再 stop 一次）
    print(f"[*] 停止并删除测试容器...")
    try:
        container.stop(timeout=2)
        container.wait()
    except Exception as e:
        print(f"[!] 停止容器时出错（可能已退出）: {e}")

    print("[+] 测试完成。")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[!] 用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n[!] 未预期错误: {e}")
        sys.exit(2)