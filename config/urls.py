# config/urls.py
from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect
from django.contrib.auth import views as auth_views # 👈 일반 로그인을 위해 추가

def root_redirect(request):
    """
    사용자가 최초 도메인 접속 시 로그인 상태면 home으로,
    비로그인이면 신규 가입 유도를 위해 회원가입(signup) 화면으로 보냅니다.
    """
    if request.user.is_authenticated:
        return redirect('home')
    return redirect('account_signup')  # 👈 signup 화면으로 강제 이동

urlpatterns = [
    # 1. 최초 접속 처리
    path('', root_redirect, name='root_index'),
    
    # 2. 장고 기본 관리자 페이지
    path('admin/', admin.site.urls),
    
    # 3. 일반 아이디/비밀번호 로그인 및 로그아웃 처리를 장고 내장 뷰로 가로챕니다.
    path('accounts/login/', auth_views.LoginView.as_view(template_name='account/login.html'), name='account_login'),
    path('accounts/logout/', auth_views.LogoutView.as_view(next_page='account_login'), name='account_logout'),
    
    # 4. 회원가입 및 소셜 기능을 담당하는 django-allauth URL 구조
    path('accounts/', include('allauth.urls')),
    
    # 5. 앱 내부 주소 연결
    path('', include('timefit.urls')),
]