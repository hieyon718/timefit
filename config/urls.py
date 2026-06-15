"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView #임시 화면용

urlpatterns = [
    path('admin/', admin.site.urls),

    # django-allauth가 제공하는 모든 인증 URL을 /accounts/ 경로 아래에 매핑
    # (예: /accounts/login/, /accounts/google/login/ 등 API가 자동 생성됨)
    path('accounts/', include('allauth.urls')),
    
    # 임시 홈 화면 라우팅 (로그인 성공 테스트용)
    path('', TemplateView.as_view(template_name='home.html'), name='home'),

]
