#!/bin/bash

git submodule update --init --remote anythingllm
cp anythingllm/.env.example anythingllm/.env
# 设置权限（与你的 UID:GID 匹配，通常是 1000:1000）
sudo chown -R 1000:1000 anythingllm/storage/
sudo chown -R 1000:1000 anythingllm/.env