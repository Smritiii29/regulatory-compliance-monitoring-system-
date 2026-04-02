import os
import sys
from mangum import Mangum

# Add current directory to path so 'backend' can be found
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from backend.app import create_app

app = create_app()

# Mangum is an adapter for using ASGI/WSGI apps with AWS Lambda (and Netlify)
handler = Mangum(app)
