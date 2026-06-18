from datetime import datetime, timedelta
import calendar as cal

from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.views import View
from django.views.generic import TemplateView

from rest_framework import status
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

# 모델 및 시리얼라이저 일괄 임포트 (중복 제거)
from .models import Category, Todo
from .serializers import TodoSerializer


# ==========================================
# 0. 마이 페이지 뷰 (Pure Django View)
# ==========================================
class MypageView(LoginRequiredMixin, View):
    """
    구글 계정 연동 상태 확인 및 로그아웃 등 개인 계정 설정을 관리하는 마이 페이지
    """
    def get(self, request):
        return render(request, 'timefit/mypage.html', {'user': request.user})


# ==========================================
# 1. 화면 서빙용 뷰 (Pure Django View)
# ==========================================
class HomeView(LoginRequiredMixin, View):
    """
    웹 브라우저 접속 시 미니멀한 HTML 홈 화면 프레임만 리턴합니다.
    """
    def get(self, request):
        # 🔑 유저가 홈 화면에 발을 들이는 순간 과거 미완료 투두 일괄 이월 갱신
        Todo.migrate_incomplete_todos(request.user)
        categories = Category.objects.filter(user=request.user)
        return render(request, 'timefit/home.html', {'categories': categories})


# ==========================================
# 1.2. 날짜 값 있는 화면 뷰 (Pure Django View)
# ==========================================
class HomeTemplateView(LoginRequiredMixin, TemplateView): # 👈 LoginRequiredMixin 추가하여 보안 강화
    template_name = 'timefit/home.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # 🔑 특정 날짜 주소로 들어올 때도 미완료 투두 이월 엔진 안전 기동
        Todo.migrate_incomplete_todos(self.request.user)
        
        url_date = self.kwargs.get('date_str', '')
        context['init_date'] = url_date
        
        # 셀렉트박스 카테고리 누락 방지용 추가 바인딩
        context['categories'] = Category.objects.filter(user=self.request.user)
        return context


# ==========================================
# 1.3. 분석 리포트 화면 서빙 뷰 (클래스형 변환)
# ==========================================
class WeeklyAnalysisView(LoginRequiredMixin, View):
    """주간 분석 대시보드 프레임 바인딩"""
    def get(self, request):
        return render(request, 'timefit/week.html')


class MonthlyAnalysisView(LoginRequiredMixin, View):
    """월간 분석 대시보드 프레임 바인딩"""
    def get(self, request):
        return render(request, 'timefit/monthly.html')


# ==========================================
# 2. 투두 CR 뷰 (DRF APIView)
# ==========================================
class TodoListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_str = request.query_params.get('date')
        if date_str:
            target_date = parse_date(date_str)
        else:
            target_date = timezone.localdate()

        todos = Todo.objects.filter(user=request.user, target_date=target_date).order_by('created_at')
        serializer = TodoSerializer(todos, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        date_str = request.data.get('target_date')
        if date_str:
            target_date = parse_date(date_str)
        else:
            target_date = timezone.localdate()

        serializer = TodoSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(user=request.user, target_date=target_date)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==========================================
# 2. 투두 UD 뷰 (DRF APIView)
# ==========================================
class TodoDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        todo = get_object_or_404(Todo, pk=pk, user=request.user)
        serializer = TodoSerializer(todo, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, pk):
        todo = get_object_or_404(Todo, id=pk, user=request.user)
        todo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ==========================================
# 3. 캘린더 관련 뷰 및 API
# ==========================================
@login_required # 함수형 뷰도 로그인 방어 추가
def calendar(request):
    return render(request, 'timefit/calendar.html') 


class CalendarDataAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        year = int(request.query_params.get('year', today.year))
        month = int(request.query_params.get('month', today.month))

        _, last_day = cal.monthrange(year, month)
        start_date = timezone.datetime(year, month, 1).date()
        end_date = timezone.datetime(year, month, last_day).date()

        todos = Todo.objects.filter(
            user=request.user,
            target_date__range=[start_date, end_date]
        ).order_by('created_at')

        calendar_data = {}
        for todo in todos:
            date_str = todo.target_date.strftime('%Y-%m-%d')
            if date_str not in calendar_data:
                calendar_data[date_str] = []
            
            calendar_data[date_str].append({
                "id": todo.id,
                "content": todo.content,
                "is_completed": todo.is_completed,
                "category_color": todo.category_color if hasattr(todo, 'category_color') else (todo.category.color if todo.category else '#bdc3c7')
            })

        return Response({
            "year": year,
            "month": month,
            "todos_by_date": calendar_data
        }, status=status.HTTP_200_OK)


# ==========================================
# 4. 카테고리 관리 뷰 및 API
# ==========================================
class CategorySettingView(LoginRequiredMixin, View): # 👈 로그인 방어 레이어 추가
    def get(self, request):
        return render(request, 'timefit/category.html')
    

class CategoryListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        categories = Category.objects.filter(user=request.user).order_by('id')
        data = [{"id": cat.id, "name": cat.name, "color": cat.color} for cat in categories]
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        name = request.data.get('name')
        color = request.data.get('color')

        if not name or not color:
            return Response({"error": "名前とカラーは必須です。"}, status=status.HTTP_400_BAD_REQUEST)

        new_cat = Category.objects.create(user=request.user, name=name, color=color)
        return Response({"message": "成功", "id": new_cat.id}, status=status.HTTP_201_CREATED)


class CategoryDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, category_id):
        try:
            category = Category.objects.get(id=category_id, user=request.user)
        except Category.DoesNotExist:
            return Response({"error": "該当カテゴリが見つかりません。"}, status=status.HTTP_404_NOT_FOUND)

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

        category.delete()
        return Response({"message": "削除完了"}, status=status.HTTP_204_NO_CONTENT)


# ==========================================
# 5. 유저 환경 설정 API
# ==========================================
class UserResetTimeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        new_time = request.data.get('reset_time')
        if not new_time:
            return Response({"error": "時間が指定されていません。"}, status=status.HTTP_400_BAD_REQUEST)
        
        user = request.user
        user.reset_time = new_time
        user.save()
        return Response({"status": "success"}, status=status.HTTP_200_OK)
    
class WeeklyAnalysisView(LoginRequiredMixin, View):
    """
    주간 분석 대시보드 템플릿(week.html) 화면을 안전하게 서빙합니다.
    """
    def get(self, request):
        return render(request, 'timefit/weekly.html')
   
class WeeklyAnalysisAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 📅 1. 기준 날짜 타겟팅 및 안전한 현지 시간대 파싱
        start_date_str = request.query_params.get('start_date', None)
        
        if start_date_str:
            try:
                # 프론트가 준 날짜 문자열 파싱
                start_of_week = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            except (ValueError, TypeError):
                # 포맷이 깨져서 오면 장고 서버 기준 이번 주 월요일로 롤백
                today = timezone.localdate()
                start_of_week = today - timedelta(days=today.weekday())
        else:
            # 첫 진입으로 파라미터가 없으면 이번 주 월요일 자동 세팅
            today = timezone.localdate()
            start_of_week = today - timedelta(days=today.weekday())

        # 해당 주의 일요일 계산
        end_of_week = start_of_week + timedelta(days=6)

        # 🚀 [🔑 누락 오류 해결]: 이번 주에 해당하는 로그인 유저의 투두 데이터셋 명시적 정의
        # select_related('category')를 붙여주어야 반복문 내 오류 및 속도 저하를 완벽 방어합니다.
        weekly_todos = Todo.objects.filter(
            user=request.user,
            target_date__range=[start_of_week, end_of_week]
        ).select_related('category')

        # 🧱 1번 : 요일별 데이터 공간
        weekly_blocks = {i: [] for i in range(7)}
        # ⏱️ 2번 : 카테고리별 시간 분석 공간
        category_stats = {}
        # 🕳️ 3번 : 블랙홀 top3 공간
        blackhole_candidates = []
        # 🎯 4번 : 종합 평가 공간
        total_completed_with_time = 0
        success_prediction_count = 0

        for todo in weekly_todos:
            weekday_index = todo.target_date.weekday() 
            
            # 1번 요일별 쪼개기용 직렬화
            serializer = TodoSerializer(todo, context={'request': request})
            weekly_blocks[weekday_index].append(serializer.data)

            # 2, 3, 4번 집계를 위한 조건 판별
            if todo.is_completed and todo.estimated_time is not None and todo.actual_time is not None:
                cat_id = todo.category.id if todo.category else 0
                cat_name = todo.category.name if todo.category else "未分類"
                cat_color = todo.category.color if todo.category else "#bdc3c7"

                # 2번 카테고리 누적
                if cat_id not in category_stats:
                    category_stats[cat_id] = {
                        "name": cat_name,
                        "color": cat_color,
                        "est_total": 0,
                        "act_total": 0,
                        "total_diff": 0,
                        "completed_count": 0
                    }
                category_stats[cat_id]["est_total"] += todo.estimated_time
                category_stats[cat_id]["act_total"] += todo.actual_time
                category_stats[cat_id]["total_diff"] += (todo.actual_time - todo.estimated_time)
                category_stats[cat_id]["completed_count"] += 1

                # 3번 블랙홀 후보 누적
                overdue_time = todo.actual_time - todo.estimated_time
                if overdue_time > 0:
                    blackhole_candidates.append({
                        "content": todo.content,
                        "category_name": cat_name,
                        "overdue_time": overdue_time
                    })

                # 4번 스코어 카운팅
                total_completed_with_time += 1
                variance_ratio = overdue_time / todo.estimated_time if todo.estimated_time > 0 else 0
                if abs(variance_ratio) <= 0.1:
                    success_prediction_count += 1

        # ⏱️ 2번 카테고리 최종 정제 및 팩트 메시지 수립
        category_list = []
        worst_category_name = None
        worst_error_value = 0

        for cat_id, stats in category_stats.items():
            avg_error = round(stats["total_diff"] / stats["completed_count"]) if stats["completed_count"] > 0 else 0
            category_list.append({
                "id": cat_id,
                "name": stats["name"],
                "color": stats["color"],
                "est_total": stats["est_total"],
                "act_total": stats["act_total"],
                "avg_error": avg_error
            })

            if abs(avg_error) > abs(worst_error_value):
                worst_error_value = avg_error
                worst_category_name = stats["name"]

        category_fact_msg = ""
        if not category_list:
            category_fact_msg = "📊 今週の完了タスクおよび時間記録データがありません。"
        elif worst_category_name and abs(worst_error_value) >= 15:
            if worst_error_value > 0:
                category_fact_msg = f"💡 今週、<span class='fact-highlight'>「{worst_category_name}」</span>カテゴリは予想より実際の所要時間が平均<span class='fact-highlight'>{worst_error_value}分</span>長くかかっています。"
            else:
                category_fact_msg = f"💡 今週、<span class='fact-success'>「{worst_category_name}」</span>カテゴリは予想より平均<span class='fact-success'>{abs(worst_error_value)}分</span>早く終了しています。"
        else:
            category_fact_msg = "💡 すべてのカテゴリにおいて、計画と実績の誤差が非常に少なく、<span class='fact-success'>安定した自己ペース</span>を維持しています。"

        # 🕳️ 3번 블랙홀 정렬 (상위 3개)
        blackhole_candidates.sort(key=lambda x: x['overdue_time'], reverse=True)
        top_three_blackholes = blackhole_candidates[:3]

        # 🎯 4번 스코어 계산 및 코칭 팩트 수립
        timefit_score = 0
        if total_completed_with_time > 0:
            timefit_score = round((success_prediction_count / total_completed_with_time) * 100)

        score_fact_msg = ""
        if total_completed_with_time == 0:
            score_fact_msg = "今週は時間予測の評価基準となるタスクがまだありません。"
        elif timefit_score >= 80:
            score_fact_msg = f"今週の予測正確度は<span class='bold-black'>{timefit_score}%</span>で非常に高い水準です。時間主導権を完全に握っています。"
        elif timefit_score >= 50:
            score_fact_msg = f"今週の予測正確度は<span class='bold-black'>{timefit_score}%</span>です。いくつかの特定のタスクが全体の予測バランスに影響を与えています。"
        else:
            score_fact_msg = f"今週의 예측 정확도는 <span class='bold-black'>{timefit_score}%</span>입니다. 계획할 때 예측 시간을 지금보다 1.5배 정도 여유 있게 잡아 보세요."

        return Response({
            "start_date": start_of_week.strftime('%Y-%m-%d'),
            "end_date": end_of_week.strftime('%Y-%m-%d'),
            "weekly_blocks": weekly_blocks,     
            "category_stats": category_list,     
            "category_coaching": category_fact_msg,
            "top_blackholes": top_three_blackholes,
            "timefit_score": timefit_score,
            "score_coaching": score_fact_msg
        }, status=status.HTTP_200_OK)
    
    