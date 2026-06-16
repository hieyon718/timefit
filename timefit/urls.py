# urls.py 수정
from django.urls import path
from .views import HomeView, TodoListCreateAPIView, TodoDetailAPIView, MypageView, WeeklyAnalysisAPIView, CalendarDataAPIView, HomeTemplateView # 👈 MypageView 추가
from . import views  # 분석 페이지를 보여줄 뷰를 가져옵니다.

urlpatterns = [
    # 메인 홈 화면 (오직 체크리스트만 존재하는 미니멀 피드)
    path('home/', HomeView.as_view(), name='home'),

    # 날짜별 메인 화면
    path('home/<str:date_str>/', HomeTemplateView.as_view(), name='home_with_date'),
    
    # 마이페이지 (구글 연동 관리 및 로그아웃)
    path('mypage/', MypageView.as_view(), name='mypage'),
    
    # 메인 체크리스트 등록
    path('api/todos/', TodoListCreateAPIView.as_view(), name='todo-list-create'),

    # 메인 체크리스트 수정
    path('api/todos/<int:pk>/', TodoDetailAPIView.as_view(), name='todo-detail'),
    
    # 메인 체크리스트 삭제
    path('api/todos/<int:todo_id>/', TodoDetailAPIView.as_view(), name='todo-detail'),

    # 주간 분석 데이터 전용 API
    path('api/analysis/weekly/', WeeklyAnalysisAPIView.as_view(), name='analysis-weekly'),

    # 캘린더 투두 화면
    path('calendar/', views.calendar, name='calendar'),

    # 캘린더 데이터 API
    path('api/calendar/data/', CalendarDataAPIView.as_view(), name='calendar-data'),

    # 분석 페이지 화면
    path('analysis/week/', views.weekly_analysis, name='analysis_weekly'),
    path('analysis/month/', views.monthly_analysis, name='analysis_monthly'),
]