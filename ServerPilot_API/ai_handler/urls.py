from django.urls import path
from .views import AISettingsView, ExplainSecurityRiskView, AIModelsView

urlpatterns = [
    path('settings/', AISettingsView.as_view(), name='ai-settings'),
    path('explain-risk/', ExplainSecurityRiskView.as_view(), name='explain-risk'),
    path('models/', AIModelsView.as_view(), name='ai-models'),
]
