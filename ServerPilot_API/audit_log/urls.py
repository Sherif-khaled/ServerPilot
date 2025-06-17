from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LogViewSet, SystemLogView

router = DefaultRouter()
router.register(r'logs', LogViewSet, basename='log')

urlpatterns = [
    path('', include(router.urls)),
    path('system/', SystemLogView.as_view(), name='system-log'),
]
