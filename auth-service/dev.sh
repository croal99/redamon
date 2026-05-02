#!/bin/bash

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# 切换到服务根目录
cd "$SCRIPT_DIR"

echo "🚀 正在启动 BlueNet Auth Service 本地开发服务器..."
echo "访问地址: http://127.0.0.1:8100"
echo "API 文档: http://127.0.0.1:8100/docs"
echo "按 Ctrl+C 停止服务"
echo "--------------------------------------------------------"

# 启动带有热重载的 Uvicorn 服务器
uvicorn main:app --host 127.0.0.1 --port 8100 --reload
