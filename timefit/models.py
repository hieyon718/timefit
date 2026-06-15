from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """
    TimeFit 유저 커스텀 모델 (Google 소셜 로그인 및 유저 맞춤 갱신 시간 대응)
    Django 기본 유저 필드(username, password, email)를 베이스로 확장합니다.
    """
    
    # 구글 로그인 유저인지 판별하는 플래그 (화면 라벨: Google連携ユーザー)
    is_google_user = models.BooleanField(
        default=False, 
        verbose_name="Google連携ユーザー"
    )
    
    # 구글 API에서 넘겨주는 유저 고유의 Sub ID (중복 가입 방지용 고유키)
    google_id = models.CharField(
        max_length=255, 
        unique=True, 
        null=True, 
        blank=True, 
        verbose_name="Google固有ID"
    )
    
    # 구글 계정의 프로필 이미지 URL을 그대로 가져와 저장할 필드
    profile_image_url = models.URLField(
        max_length=500, 
        null=True, 
        blank=True, 
        verbose_name="プロフィール画像URL"
    )
    
    # ★ TimeFit 핵심 추가 기능: 오늘의 체크리스트가 자동 이월 및 갱신되는 유저별 설정 시간
    # 기본값은 자정(00:00)이며, 유저가 커스텀하게 변경 가능합니다.
    reset_time = models.TimeField(
        default="00:00",
        verbose_name="更新基準時間"
    )
    
    # 계정이 생성된 날짜와 시간 (자동 생성)
    created_at = models.DateTimeField(
        auto_now_add=True, 
        verbose_name="登録日時"
    )

    class Meta:
        db_table = 'users'                 # MySQL에 생성될 실제 테이블 이름
        verbose_name = 'ユーザー'           # 관리자 페이지 등에서 단수형 표시 이름
        verbose_name_plural = 'ユーザー管理' # 관리자 페이지 사이드바 메뉴 이름

    def __str__(self):
        # Django 시스템이나 GUI 툴에서 유저 객체를 볼 때 username이 노출되도록 설정
        return self.username
    
from django.db import models
from django.conf import settings

class Category(models.Model):
    """
    TimeFit 카테고리 모델 (회사, 개인 등)
    유저별로 커스텀 카테고리를 추가하거나 컬러를 지정할 수 있습니다.
    """
    # 유저와 1:N 관계 (유저가 탈퇴하면 해당 유저의 카테고리도 함께 삭제)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="categories",
        verbose_name="ユーザー"
    )
    
    # 카테고리 이름 (디폴트: 会社, 個人 / 화면 라벨: カテゴリ名)
    name = models.CharField(
        max_length=50,
        verbose_name="カテゴリ名"
    )
    
    # UI용 카테고리별 고유 컬러 (HEX 코드 저장, 예: #FF5733 / 화면 라벨: カラーコード)
    color = models.CharField(
        max_length=7,
        default="#3498db",
        verbose_name="カラーコード"
    )
    
    # 디폴트로 제공된 기본 카테고리(회사/개인)인지 여부를 판별하는 플래그
    is_default = models.BooleanField(
        default=False,
        verbose_name="デフォルト表示"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="作成日時"
    )

    class Meta:
        db_table = 'categories'
        verbose_name = 'カテゴリ'
        verbose_name_plural = 'カテゴリ管理'
        # 한 유저 내에서 카테고리 이름이 중복되지 않도록 유니크 제약 설정
        unique_together = ('user', 'name')

    def __str__(self):
        return f"[{self.user.username}] {self.name}"


class Todo(models.Model):
    """
    TimeFit 체크리스트(태스크) 모델
    오늘의 할 일 관리, 이월 로직, 예상 시간 및 실제 소요 시간 분석을 담당합니다.
    """
    # 유저와 1:N 관계 (화면 라벨: ユーザー)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="todos",
        verbose_name="ユーザー"
    )
    
    # 카테고리와 1:N 관계 (화면 라벨: カテゴリ)
    # 카테고리가 삭제되어도 투두는 유지되거나, '미분류' 처리를 위해 null=True 설정
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="todos",
        verbose_name="カテゴリ"
    )
    
    # 체크리스트 내용 (화면 라벨: タスク内容)
    content = models.CharField(
        max_length=255,
        verbose_name="タスク内容"
    )
    
    # 완료 여부 플래그 (화면 라벨: 完了ステータス)
    is_completed = models.BooleanField(
        default=False,
        verbose_name="完了ステータス"
    )
    
    # 기입한 예상 시간 (선택 입력값, '분' 단위로 저장 / 화면 라벨: 予想時間(分))
    # 예: 20분 -> 20, 1시간 30분 -> 90
    estimated_time = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="予想時間(分)"
    )
    
    # 완료 후 실제 작업 시간 (선택 입력값, '분' 단위로 저장 / 화면 라벨: 実績時間(分))
    actual_time = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="実績時間(分)"
    )
    
    # 해당 업무를 해야 하는 날짜 (기본값: 등록하는 당일 날짜 / 화면 라벨: 実施予定日)
    # 이 필드를 기준으로 다른 화면에서 날짜별 보기가 가능하며, 미완료 시 다음날로 이월됩니다.
    target_date = models.DateField(
        verbose_name="実施予定日"
    )
    
    # 실제 체크박스를 체크하여 완료 처리된 시간 (분석용 / 화면 라벨: 完了日時)
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="完了日時"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="作成日時"
    )

    class Meta:
        db_table = 'todos'
        verbose_name = 'タスク'
        verbose_name_plural = 'タスク管理'
        # 날짜별, 최신순으로 정렬되도록 기본값 세팅
        ordering = ['target_date', '-created_at']

    def __str__(self):
        status = "【完了】" if self.is_completed else "【未完了】"
        return f"{status} {self.content[:20]}"