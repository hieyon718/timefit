from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect

def root_redirect(request):
    """
    사용자가 최초 도메인(http://127.0.0.1:8000/)으로 접속했을 때,
    로그인 여부에 따라 홈 화면이나 로그인 페이지로 자동 리다이렉트해주는 헬퍼 뷰입니다.
    """
    if request.user.is_authenticated:
        return redirect('home')  # 로그인 상태면 타임핏 홈 화면으로
    return redirect('/accounts/login/')  # 비로그인이면 올어스 로그인 화면으로

urlpatterns = [
    # 1. 아무 주소도 입력하지 않고 접속했을 때('/')의 리다이렉트 처리를 위로 올립니다.
    path('', root_redirect, name='root_index'),
    
    # 2. 장고 기본 관리자 페이지
    path('admin/', admin.site.urls),
    
    # 3. 구글 소셜 로그인 및 계정 관리를 담당하는 django-allauth URL 구조
    path('accounts/', include('allauth.urls')),
    
    # 4. 앱 내부의 주소들을 연결 (home/, mypage/, api/todos/ 등이 매핑됨)
    path('', include('timefit.urls')),
]