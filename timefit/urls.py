# urls.py
from django.urls import path
from .views import (
    HomeView, 
    HomeTemplateView, 
    MypageView, 
    TodoListCreateAPIView, 
    TodoDetailAPIView, 
    CalendarDataAPIView, 
    CategorySettingView, 
    CategoryListAPIView, 
    CategoryDetailAPIView, 
    UserResetTimeAPIView,
    WeeklyAnalysisView,    
    WeeklyAnalysisAPIView, 
    calendar               
)

urlpatterns = [
    # 🏠 메인 홈 화면 관련
    path('home/', HomeView.as_view(), name='home'),
    path('home/<str:date_str>/', HomeTemplateView.as_view(), name='home_with_date'),
    
    # 👤 마이페이지
    path('mypage/', MypageView.as_view(), name='mypage'),
    
    # 🧱 투두(Todo) CRUD API 엔드포인트
    path('api/todos/', TodoListCreateAPIView.as_view(), name='todo-list-create'),
    path('api/todos/<int:pk>/', TodoDetailAPIView.as_view(), name='todo-detail'),

    # 📊 주간/월간 분석 템플릿 화면 서빙 (클래스형 뷰 바인딩 완료)
    path('analysis/weekly/', WeeklyAnalysisView.as_view(), name='analysis_weekly'),

    # 💾 주간 분석 데이터 제공 비동기 API (WeeklyAnalysisAPIView 클래스 지정 완료)
    path('api/analysis/weekly/', WeeklyAnalysisAPIView.as_view(), name='analysis-weekly'),

    # 📅 캘린더 관련
    path('calendar/', calendar, name='calendar'),
    path('api/calendar/data/', CalendarDataAPIView.as_view(), name='calendar-data'),

    # 🎨 카테고리 설정 관련
    path('category/setting/', CategorySettingView.as_view(), name='category_setting'),
    path('api/categories/', CategoryListAPIView.as_view(), name='category-list-create'),
    path('api/categories/<int:category_id>/', CategoryDetailAPIView.as_view(), name='category-detail'),

    # ⚙️ 유저 커스텀 환경 설정 관련
    path('api/user/update-reset-time/', UserResetTimeAPIView.as_view(), name='user-reset-time-update'),
]