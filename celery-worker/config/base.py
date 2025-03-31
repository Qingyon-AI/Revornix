import os
from pathlib import Path

base_url = os.environ.get('base_url')

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent