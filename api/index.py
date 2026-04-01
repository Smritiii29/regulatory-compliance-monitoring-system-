import os
import sys

# Add the project root to sys.path so 'backend' package can be found
# Root is one level up from this file (api/index.py)
root_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, root_path)

# Import the create_app function from backend/app.py
# Make sure 'backend' can be seen as a module
from backend.app import create_app

# Vercel's Python runtime will look for an 'app' or 'application' object.
app = create_app()

# Health check logic if needed, but 'app' is the important part.
if __name__ == '__main__':
    app.run(debug=True)
