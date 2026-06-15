from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """
    Rezokuru 유저 커스텀 모델 (Google 소셜 로그인 대응)
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
    
    # 냉장고 앱 유저들의 한줄 자기소개 필드
    bio = models.TextField(
        max_length=500, 
        blank=True, 
        verbose_name="自己紹介"
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