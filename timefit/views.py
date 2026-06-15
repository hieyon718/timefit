from django.shortcuts import render
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import Todo, Category
from .serializers import TodoSerializer

# ==========================================
# 0. 마이 페이지 뷰 (Pure Django View)
# ==========================================
class MypageView(LoginRequiredMixin, View):
    """
    구글 계정 연동 상태 확인 및 로그아웃 등 
    개인 계정 설정을 관리하는 마이 페이지입니다.
    """
    def get(self, request):
        # 현재 로그인한 유저 정보를 템플릿에 그대로 전달
        return render(request, 'timefit/mypage.html', {'user': request.user})

# ==========================================
# 1. 화면 서빙용 뷰 (Pure Django View)
# ==========================================
class HomeView(LoginRequiredMixin, View):
    """
    웹 브라우저 접속 시 미니멀한 HTML 홈 화면 프레임만 리턴합니다.
    """
    def get(self, request):
        # 셀렉트박스에 바인딩할 카테고리 목록만 템플릿에 전달
        categories = Category.objects.filter(user=request.user)
        return render(request, 'timefit/home.html', {'categories': categories})


# ==========================================
# 2. 데이터 전용 뷰 (DRF APIView) -> 웹 비동기 & 추후 모바일 앱 공용
# ==========================================
class TodoListCreateAPIView(APIView):
    """
    오늘 날짜의 투두리스트를 조회(Read)하고 등록(Create)하는 순수 데이터 엔드포인트입니다.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """오늘 날짜의 투두 데이터 전송 (Read)"""
        today = timezone.localdate()
        todos = Todo.objects.filter(user=request.user, target_date=today)
        
        # serializer에 context로 request를 넘겨주어야 이미지 고유 URL 변환 등이 원활합니다.
        serializer = TodoSerializer(todos, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        """새로운 투두 생성 (Create)"""
        serializer = TodoSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            # 저장할 때 현재 유저와 오늘 날짜를 백엔드에서 강제로 바인딩합니다.
            serializer.save(user=request.user, target_date=timezone.localdate())
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)