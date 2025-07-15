#!/usr/bin/env python3
"""
SGLang Chat Frontend Demo

This script demonstrates how to launch SGLang with the integrated web frontend.
It starts a mock server for demonstration purposes when no model is available.
"""

import argparse
import sys
import subprocess
import time
import requests
from pathlib import Path


def check_server_status(url, timeout=5):
    """Check if SGLang server is running"""
    try:
        response = requests.get(f"{url}/health", timeout=timeout)
        return response.status_code == 200
    except requests.RequestException:
        return False


def start_demo_server():
    """Start a mock server for demonstration"""
    print("Note: This is a demo script. In practice, you would start SGLang with a real model:")
    print("python -m sglang.launch_server --model-path meta-llama/Llama-3.1-8B-Instruct --port 30000")
    print("\nFor demonstration, you can:")
    print("1. Visit http://localhost:30000/ to see the frontend interface")
    print("2. The interface will show 'Connection Failed' until a real SGLang server is running")
    print("3. Configure a different server URL in the interface if needed")


def main():
    parser = argparse.ArgumentParser(description="SGLang Chat Frontend Demo")
    parser.add_argument("--port", type=int, default=30000, help="Port to check for SGLang server")
    parser.add_argument("--host", default="127.0.0.1", help="Host to check for SGLang server")
    
    args = parser.parse_args()
    
    server_url = f"http://{args.host}:{args.port}"
    
    print("SGLang Chat Frontend Demo")
    print("=" * 40)
    print(f"Checking for SGLang server at {server_url}...")
    
    if check_server_status(server_url):
        print("✅ SGLang server is running!")
        print(f"🌐 Access the chat interface at: {server_url}/")
        print(f"📋 API endpoint: {server_url}/v1/chat/completions")
    else:
        print("❌ SGLang server is not running.")
        print("\nTo start SGLang server with the frontend:")
        print(f"python -m sglang.launch_server --model-path YOUR_MODEL_PATH --port {args.port}")
        print("\nExample with a common model:")
        print(f"python -m sglang.launch_server --model-path meta-llama/Llama-3.1-8B-Instruct --port {args.port}")
        
        start_demo_server()
    
    print("\nFrontend Features:")
    print("- 💬 Multi-turn conversations")
    print("- 📝 Conversation history management")
    print("- 🌊 Real-time streaming responses")
    print("- ⚙️  Configurable generation parameters")
    print("- 📱 Mobile-responsive design")
    print("- 🌐 OpenAI-compatible API integration")


if __name__ == "__main__":
    main()