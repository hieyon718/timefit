from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import Category

User = get_user_model()

@receiver(post_save, sender=User)
def create_default_categories(sender, instance, created, **kwargs):
    """
    유저가 새롭게 생성(회원가입/소셜로그인)되면 실행되는 시그널 헬퍼입니다.
    TimeFit의 기본 카테고리인 '会社'와 '個人'을 자동으로 생성합니다.
    """
    # 최초 생성(created=True)일 때만 실행합니다. (정보 수정 시 중복 생성 방지)
    if created:
        # 디폴트 카테고리 데이터 세팅 (일본어 하드코딩 및 요건 반영 컬러)
        default_categories = [
            {"name": "会社", "color": "#3498db"},  # 회사: 신뢰감을 주는 블루 계열
            {"name": "個人", "color": "#e67e22"},  # 개인: 활기찬 오렌지 계열
        ]
        
        for cat_data in default_categories:
            Category.objects.create(
                user=instance,
                name=cat_data["name"],
                color=cat_data["color"],
                is_default=True  # 요건에 명시된 디폴트 플래그 True 설정
            )
        
        # 개발 콘솔 확인용 프린트 (실 운영 시 logger 활용 권장)
        print(f"[TimeFit System] ユーザー「{instance.username}」의 디폴트 카테고리(会社, 個人) 생성이 완료되었습니다.")