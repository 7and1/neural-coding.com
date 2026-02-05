#!/usr/bin/env python3
"""
Health check script for Streamlit applications.
Returns exit code 0 if healthy, 1 if unhealthy.
"""
import sys
import os

try:
    import requests
except ImportError:
    # Fallback if requests is not available
    import urllib.request
    import urllib.error

    def check_health_urllib(url, timeout=5):
        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=timeout) as response:
                return response.status == 200
        except (urllib.error.URLError, urllib.error.HTTPError):
            return False

    # Get port from environment or use default
    port = os.environ.get('STREAMLIT_SERVER_PORT', '8501')
    health_url = f"http://localhost:{port}/_stcore/health"

    if check_health_urllib(health_url):
        sys.exit(0)
    else:
        sys.exit(1)

# Get port from environment or use default
port = os.environ.get('STREAMLIT_SERVER_PORT', '8501')
health_url = f"http://localhost:{port}/_stcore/health"

try:
    response = requests.get(health_url, timeout=5)
    if response.status_code == 200:
        sys.exit(0)
    else:
        print(f"Health check failed with status code: {response.status_code}", file=sys.stderr)
        sys.exit(1)
except requests.exceptions.RequestException as e:
    print(f"Health check failed: {e}", file=sys.stderr)
    sys.exit(1)
