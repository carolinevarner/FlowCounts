import os
from django.conf import settings
from django.http import HttpResponse, Http404

def index(request):
    """
    Serve the React app's index.html file.
    """
    try:
        with open(os.path.join(settings.BASE_DIR, 'frontend/build', 'index.html')) as f:
            return HttpResponse(f.read())
    except FileNotFoundError:
        raise Http404("React build not found. Make sure you have built the frontend.")
