from django.urls import path
from .views import AISettingsView, ExplainSecurityRiskView, AIModelsView, GenerateAppInfoView, AnalyzeLogView

urlpatterns = [
    path('settings/', AISettingsView.as_view(), name='ai-settings'),
    path('explain-risk/', ExplainSecurityRiskView.as_view(), name='explain-risk'),
    path('explain-security-risk/', ExplainSecurityRiskView.as_view(), name='explain-security-risk'),
    path('models/', AIModelsView.as_view(), name='ai-models'),
    path('generate-app-info/', GenerateAppInfoView.as_view(), name='generate-app-info'),
    path('analyze-logs/', AnalyzeLogView.as_view(), name='analyze-logs'),
]
