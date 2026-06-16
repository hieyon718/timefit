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
from rest_framework.generics import get_object_or_404
from datetime import timedelta
from .models import Todo
from .serializers import TodoSerializer
from django.utils.dateparse import parse_date
import calendar as cal
from django.views.generic import TemplateView
from .models import Category, Todo

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
        # 🔑 1. [이월 엔진 기동] 유저가 홈 화면에 발을 들이는 순간 과거 미완료 투두 일괄 갱신
        # LoginRequiredMixin 덕분에 request.user는 무조건 로그인된 유저임이 보장됩니다.
        Todo.migrate_incomplete_todos(request.user)
        # 셀렉트박스에 바인딩할 카테고리 목록만 템플릿에 전달
        categories = Category.objects.filter(user=request.user)
        return render(request, 'timefit/home.html', {'categories': categories})

# ==========================================
# 1.2. 날짜 값 있는 화면  뷰 (Pure Django View)
# ==========================================
class HomeTemplateView(TemplateView):
    template_name = 'timefit/home.html'

    # 장고 템플릿으로 데이터를 넘겨주는 메서드를 오버라이딩합니다
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # urls.py에서 <str:date_str> 규칙을 통해 주소창에서 숫자를 빼내왔는지 검사합니다
        url_date = self.kwargs.get('date_str', '')
        
        # HTML 코드가 읽을 수 있도록 'init_date'라는 이름의 주머니에 넣어 전달합니다
        context['init_date'] = url_date
        return context

# ==========================================
# 2. 투두 CR 뷰 (DRF APIView) -> 웹 비동기 & 추후 모바일 앱 공용
# ==========================================
class TodoListCreateAPIView(APIView):
    """
    오늘 날짜의 투두리스트를 조회(Read)하고 등록(Create)하는 순수 데이터 엔드포인트입니다.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """프론트엔드의 날짜 파라미터를 읽고, 기본값을 오늘로"""
        date_str = request.query_params.get('date')
        if date_str:
            target_date = parse_date(date_str)
        else:
            target_date = timezone.localdate()

        # 해당 유저의 '선택한 날짜' 투두만 정밀 필터링
        todos = Todo.objects.filter(user=request.user, target_date=target_date).order_by('created_at')
        serializer = TodoSerializer(todos, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        """
        새로운 투두 생성 (Create)
        프론트에서 날짜를 파라미터로 받아오기
        """
        date_str = request.data.get('target_date')
        if date_str:
            target_date = parse_date(date_str)
        else:
            target_date = timezone.localdate()

        serializer = TodoSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            # 저장 시점에 유저 정보와 선택된 날짜(target_date)를 함께 하드코딩으로 밀어 넣습니다
            serializer.save(user=request.user, target_date=target_date)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ==========================================
# 2. 투두 UD 뷰 (DRF APIView) -> 웹 비동기 & 추후 모바일 앱 공용
# ==========================================
class TodoDetailAPIView(APIView):
    """
    특정 할 일의 완료 상태 및 실제 소요 시간을 업데이트(Update)하는 API입니다.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        """
        체크박스 선택 시 is_completed와 actual_time을 부분 업데이트합니다.
        """
        # 현재 유저가 소유한 투두인지 정확하게 검증하며 가져오기
        todo = get_object_or_404(Todo, pk=pk, user=request.user)
        
        # partial=True를 주어 필요한 필드만 넘어와도 유효성 검사를 통과!!
        serializer = TodoSerializer(todo, data=request.data, partial=True, context={'request': request})
        
        if serializer.is_valid():
            serializer.save() #넘겨받은 데이터를 알아서 반영저장
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, pk):
        # 현재 로그인한 유저의 투두 중에서 해당 ID의 투두를 정확히 저격하여 가져옵니다 (보안 방어)
        todo = get_object_or_404(Todo, id=pk, user=request.user)
        
        # 💥 데이터베이스에서 즉시 삭제
        todo.delete()
        
        # 204 No Content 상태 코드로 프론트엔드에 "삭제 성공했다"고 신호를 반환합니다
        return Response(status=status.HTTP_204_NO_CONTENT)
    
def calendar(request):
    # 캘린터 투두
    return render(request, 'timefit/calendar.html') 

# ==========================================
# 2. 투두 캘린더 뷰 (DRF APIView) -> 웹 비동기 & 추후 모바일 앱 공용
# ==========================================
class CalendarDataAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        # 쿼리 파라미터로 연/월이 안 넘어오면 이번 달을 기본값으로 지정
        year = int(request.query_params.get('year', today.year))
        month = int(request.query_params.get('month', today.month))

        # 해당 월의 시작일과 마지막일 계산
        _, last_day = cal.monthrange(year, month)
        start_date = timezone.datetime(year, month, 1).date()
        end_date = timezone.datetime(year, month, last_day).date()

        # 데이터베이스에서 유저의 한 달 치 투두 싹 긁어오기
        todos = Todo.objects.filter(
            user=request.user,
            target_date__range=[start_date, end_date]
        ).order_by('created_at')

        # 날짜별로 그루핑할 주머니 생성
        calendar_data = {}
        for todo in todos:
            date_str = todo.target_date.strftime('%Y-%m-%d')
            if date_str not in calendar_data:
                calendar_data[date_str] = []
            
            calendar_data[date_str].append({
                "id": todo.id,
                "content": todo.content,
                "is_completed": todo.is_completed,
                # 🎨 카테고리 고유 컬러 코드를 프론트엔드로 함께 전송 (없으면 기본 회색 #bdc3c7)
                "category_color": todo.category_color if hasattr(todo, 'category_color') else (todo.category.color if todo.category else '#bdc3c7')
            })

        return Response({
            "year": year,
            "month": month,
            "todos_by_date": calendar_data
        }, status=status.HTTP_200_OK)
    
# ⚙️ [1] 카테고리 설정 페이지 이동 뷰 (GET)
class CategorySettingView(View):
    def get(self, request):
        # 단순히 만들어둔 templates/category-setting.html 파일을 렌더링하여 화면을 띄웁니다.
        return render(request, 'timefit/category.html')
    
# 📊 [2] 카테고리 데이터 가공 및 CRUD 처리 API 뷰
class CategoryListAPIView(APIView):
    permission_classes = [IsAuthenticated] # 로그인한 회원만 데이터 접근 허용

    # 📥 현재 보관 중인 카테고리 목록 조회 (Read)
    def get(self, request):
        # 현재 로그인한 유저의 카테고리만 필터링하여 가져옵니다.
        categories = Category.objects.filter(user=request.user).order_by('id')
        
        # 스크립트(JS)가 바로 읽을 수 있도록 JSON 배열 형태로 가공합니다.
        data = [
            {
                "id": cat.id,
                "name": cat.name,
                "color": cat.color
            } for cat in categories
        ]
        return Response(data, status=status.HTTP_200_OK)

    # 📤 새로운 카테고리 추가 생성 (Create)
    def post(self, request):
        name = request.data.get('name')
        color = request.data.get('color')

        if not name or not color:
            return Response({"error": "名前とカラーは必須です。"}, status=status.HTTP_400_BAD_REQUEST)

        # 데이터베이스에 새 카테고리 개체 결성
        new_cat = Category.objects.create(
            user=request.user,
            name=name,
            color=color
        )
        return Response({"message": "成功", "id": new_cat.id}, status=status.HTTP_201_CREATED)


# 🛠️ [3] 개별 카테고리 수정 및 삭제 API 뷰
class CategoryDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    # ✏️ 기존 카테고리 내용 수정 (Update / PATCH)
    def patch(self, request, category_id):
        try:
            # 타인 계정의 카테고리를 위조 수정하지 못하도록 user 조건 검증 필수
            category = Category.objects.get(id=category_id, user=request.user)
        except Category.DoesNotExist:
            return Response({"error": "該当カテゴリが見つかりません。"}, status=status.HTTP_404_NOT_FOUND)

        # 넘어온 데이터가 있을 때만 필드 업데이트
        if 'name' in request.data:
            category.name = request.data['name']
        if 'color' in request.data:
            category.color = request.data['color']
            
        category.save()
        return Response({"message": "修正完了"}, status=status.HTTP_200_OK)

    # 🗑️ 카테고리 제거 (Delete)
    def delete(self, request, category_id):
        try:
            category = Category.objects.get(id=category_id, user=request.user)
        except Category.DoesNotExist:
            return Response({"error": "該当カテゴリが見つかりません。"}, status=status.HTTP_404_NOT_FOUND)

        # 💡 [자동 연동 장치]: 장고의 ForeignKey 구조상 
        # Todo 모델의 category 필드가 'on_delete=models.SET_NULL'로 설정되어 있다면
        # 여기서 카테고리를 지우는 즉시 해당 카테고리가 엮여있던 할 일들은 
        # 자동으로 '카테고리 미설정(Null)' 상태로 안전하게 전환됩니다.
        category.delete()
        return Response({"message": "削除完了"}, status=status.HTTP_204_NO_CONTENT)
    
class UserResetTimeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        new_time = request.data.get('reset_time') # 예: "02:00" 형태로 들어옴
        if not new_time:
            return Response({"error": "時間が指定されていません。"}, status=status.HTTP_400_BAD_REQUEST)
        
        # 현재 로그인된 커스텀 유저 인스턴스의 필드 교체 후 데이터베이스 저장
        user = request.user
        user.reset_time = new_time
        user.save()
        
        return Response({"status": "success"}, status=status.HTTP_200_OK)

def weekly_analysis(request):
    # 주간 분석에 필요한 데이터 처리가 있다면 여기에 작성
    return render(request, 'timefit/week.html')

def monthly_analysis(request):
    # 월간 분석에 필요한 데이터 처리가 있다면 여기에 작성
    return render(request, 'timefit/monthly.html')
   
class WeeklyAnalysisAPIView(APIView):
    """
    고정 주간 방식(월요일 리셋)의 분석 데이터를 제공하는 API입니다.
    첫 번째 단계로 7열 그리드 차트용 요일별 블록 데이터를 리턴합니다.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        
        # 📅 1. 이번 주 월요일 날짜 계산하기
        # today.weekday()는 월요일(0) ~ 일요일(6)을 반환합니다.
        start_of_week = today - timedelta(days=today.weekday())
        end_of_week = start_of_week + timedelta(days=6)

        # 2. 이번 주 월요일부터 일요일까지의 현재 유저 투두 필터링
        weekly_todos = Todo.objects.filter(
            user=request.user,
            target_date__range=[start_of_week, end_of_week]
        ).order_by('created_at')

        # 3. 요일별(0~6)로 블록 데이터를 분류할 주머니(딕셔너리) 준비
        # 월(0), 화(1), 수(2), 목(3), 금(4), 토(5), 일(6)
        weekly_blocks = {i: [] for i in range(7)}

        # [2번 리포트] 카테고리별 통계 주머니
        category_stats = {}

        # 4. 조회된 투두들을 각 요일 주머니에 직렬화(JSON화)해서 적재
        for todo in weekly_todos:
            # 주간 차트에서는 날짜 전체보다 요일 인덱스가 핵심 기준이 됩니다.
            weekday_index = todo.target_date.weekday() 
            
            # 시리얼라이저를 통과시켜 카테고리명, 컬러 등이 포함된 정제된 데이터 추출
            serializer = TodoSerializer(todo, context={'request': request})
            weekly_blocks[weekday_index].append(serializer.data)

            # 2번 기능 연산: 완료되었고 예상 시간과 실제 시간이 모두 존재하는 경우만 집계
            if todo.is_completed and todo.estimated_time is not None and todo.actual_time is not None:
                cat_id = todo.category.id if todo.category else 0 # 미분류는 id=0 처리
                cat_name = todo.category.name if todo.category else "未分類"
                cat_color = todo.category.color if todo.category else "#bdc3c7"

                if cat_id not in category_stats:
                    category_stats[cat_id] = {
                        "name": cat_name,
                        "color": cat_color,
                        "est_total": 0,
                        "act_total": 0,
                        "total_diff": 0,       # 오차 합산용 (실제 - 예상)
                        "completed_count": 0   # 평균을 내기 위한 완료 타스크 수
                    }
                category_stats[cat_id]["est_total"] += todo.estimated_time
                category_stats[cat_id]["act_total"] += todo.actual_time
                category_stats[cat_id]["total_diff"] += (todo.actual_time - todo.estimated_time)
                category_stats[cat_id]["completed_count"] += 1

        # 카테고리별 최종 평균 오차(Fact) 가공
        category_list = []
        for cat_id, stats in category_stats.items():
            avg_error = 0
            if stats["completed_count"] > 0:
                # 해당 카테고리의 한 타스크당 평균 오차 분(Minute) 계산
                avg_error = round(stats["total_diff"] / stats["completed_count"])

            category_list.append({
                "id": cat_id,
                "name": stats["name"],
                "color": stats["color"],
                "est_total": stats["est_total"],
                "act_total": stats["act_total"],
                "avg_error": avg_error # 예: +23(23분 초과) 또는 -5(5분 조기단축)
            })

        # 5. 최종 가공된 주간 요일별 데이터 리턴
        return Response({
            "start_date": start_of_week,
            "end_date": end_of_week,
            "weekly_blocks": weekly_blocks,
            "category_stats": category_list #가로 막대그래프 데이터
        }, status=status.HTTP_200_OK)