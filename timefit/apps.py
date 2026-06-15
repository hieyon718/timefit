from django.apps import AppConfig

class TimefitConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'timefit'  # 앱 이름

    def ready(self):
        # 서버가 로드될 때 위의 signals.py를 강제로 읽어 들이도록 설정
                        # 디폴트 카테고리 자동 생성
        import timefit.signals