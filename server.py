#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单的 HTTP 服务器，用于测试 Naimo 自动化功能
"""

import http.server
import socketserver
import os
import sys

# 配置
PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """自定义 HTTP 请求处理器"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # 添加 CORS 头，允许跨域访问
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header(
            'Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def log_message(self, format, *args):
        # 自定义日志格式
        print(f"[{self.log_date_time_string()}] {format % args}")


def main():
    """主函数"""
    try:
        with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
            print("=" * 60)
            print(f"🚀 Naimo 自动化测试服务器已启动")
            print(f"📁 服务目录: {DIRECTORY}")
            print(f"🌐 访问地址:")
            print(f"   - 测试页面: http://localhost:{PORT}/test.html")
            print(
                f"   - API 测试: http://localhost:{PORT}/plugins-test/api-test-plugin/index.html")
            print(f"⚠️  按 Ctrl+C 停止服务器")
            print("=" * 60)
            print()

            httpd.serve_forever()

    except KeyboardInterrupt:
        print("\n\n👋 服务器已停止")
        sys.exit(0)
    except OSError as e:
        if e.errno == 48 or e.errno == 98:  # Address already in use
            print(f"\n❌ 错误: 端口 {PORT} 已被占用")
            print(f"💡 请尝试:")
            print(f"   1. 关闭占用端口的程序")
            print(f"   2. 或修改 PORT 变量使用其他端口")
        else:
            print(f"\n❌ 错误: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 未知错误: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
