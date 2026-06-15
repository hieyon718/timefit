from django import forms
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

# config/settings.py에서 지정한 커스텀 유저 모델(recipes.User)을 안전하게 가져옵니다.
User = get_user_model()

class GoogleUserCreationForm(forms.ModelForm):
    """
    Google 소셜 가입 시 유저명과 필수 정보를 검증하는 Form
    """
    class Meta:
        model = User
        # 화면(Template)단에서 입력받거나 처리할 필드만 지정합니다.
        fields = ['username', 'email', 'google_id', 'profile_image_url']
        
        # 브라우저 HTML에 보여줄 인풋창의 라벨(Label)을 일본어로 하드코딩합니다.
        labels = {
            'username': 'ユーザー名',
            'email': 'メールアドレス',
        }
        
        # 구글 ID와 프로필 이미지 URL은 사용자가 직접 치는 게 아니라 
        # 백엔드 내부에서 숨겨서 처리할 것이므로 HiddenInput 위젯을 적용합니다.
        widgets = {
            'google_id': forms.HiddenInput(),
            'profile_image_url': forms.HiddenInput(),
        }

    def clean_username(self):
        """
        ユーザー名(username)의 유효성 검사 및 중복 체크 로직
        """
        # 사용자가 폼에 입력한 유저명을 가져옵니다.
        username = self.cleaned_data.get('username')
        
        # 1. 길이 검증 (예: 일본어 서비스 특성상 너무 짧은 아이디 제한)
        if len(username) < 2:
            raise ValidationError("ユーザー名は2文字以上で 입력해 주세요.") # 실제 출력은 완전한 일본어로 채우시면 됩니다.
            
        # 2. MySQL 데이터베이스에 이미 존재하는 유저명인지 중복 확인
        if User.objects.filter(username=username).exists():
            # 사용자 화면에 띄워줄 에러 메시지를 일본어로 하드코딩합니다.
            raise ValidationError("このユーザー名はすでに 사용されています。")
            
        # 모든 검증을 통과한 '깨끗한 데이터'를 반환합니다. 이 값이 cleaned_data에 들어갑니다.
        return username

    def clean_email(self):
        """
        メールアドレス(email)의 유효성 검사 및 중복 체크 로직
        """
        # 정제 과정에 있는 이메일 값을 가져옵니다.
        email = self.cleaned_data.get('email')
        
        # 이메일 값이 비어있는지 체크
        if not email:
            raise ValidationError("メールアドレスは必須項目です。")
            
        # 이미 이 이메일로 가입한 유저가 있는지 중복 확인
        if User.objects.filter(email=email).exists():
            raise ValidationError("このメールアドレスはすでに登録されています。")
            
        return email