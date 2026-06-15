# urls.py 수정
from django.urls import path
from .views import HomeView, TodoListCreateAPIView, MypageView # 👈 MypageView 추가

urlpatterns = [
    # 1. 메인 홈 화면 (오직 체크리스트만 존재하는 미니멀 피드)
    path('home/', HomeView.as_view(), name='home'),
    
    # 2. 마이페이지 (구글 연동 관리 및 로그아웃)
    path('mypage/', MypageView.as_view(), name='mypage'),
    
    # 3. 데이터 통신 API
    path('api/todos/', TodoListCreateAPIView.as_view(), name='todo-list-create'),
]