import os
from django.conf import settings
from django.http import HttpResponse, Http404

def index(request):
    """
    Serve the React app's index.html file.
    """
    # Try Vite dist directory first, then fallback to build directory
    dist_path = os.path.join(settings.BASE_DIR, 'frontend/dist', 'index.html')
    build_path = os.path.join(settings.BASE_DIR, 'frontend/build', 'index.html')
    
    try:
        if os.path.exists(dist_path):
            with open(dist_path) as f:
                return HttpResponse(f.read())
        elif os.path.exists(build_path):
            with open(build_path) as f:
                return HttpResponse(f.read())
        else:
            raise Http404("React build not found. Make sure you have built the frontend.")
    except FileNotFoundError:
        raise Http404("React build not found. Make sure you have built the frontend.")
