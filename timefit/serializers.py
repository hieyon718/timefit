from rest_framework import serializers
from .models import Todo, Category

class TodoSerializer(serializers.ModelSerializer):
    # 화면에 카테고리 이름과 고유 컬러를 함께 리턴하기 위한 읽기 전용 필드
    category_name = serializers.ReadOnlyField(source='category.name')
    category_color = serializers.ReadOnlyField(source='category.color')

    class Meta:
        model = Todo
        fields = [
            'id', 'category', 'category_name', 'category_color', 
            'content', 'is_completed', 'estimated_time', 
            'actual_time', 'target_date', 'created_at'
        ]
        # 시스템이 알아서 채워넣을 필드들은 읽기 전용으로 잠금 처리
        read_only_fields = ['id','target_date', 'created_at']

    # DRF가 post의 경우 알아서 이 create를 호출해줌
    def create(self, validated_data):
        """
        ➕ 방어 코드 하드코딩: 
        할 일을 처음 생성(POST)할 때는 프론트에서 무슨 값을 보냈든 상관없이
        무조건 완료 여부는 False, 실제 시간은 None으로 강제 고정하여 저장합니다.
        """
        validated_data['is_completed'] = False
        validated_data['actual_time'] = None
        return super().create(validated_data)

    def validate_category(self, value):
        """
        입력된 카테고리가 실제로 요청한 유저의 소유인지 검증 (보안 하드코딩)
        """
        request = self.context.get('request')
        if request and value and value.user != request.user:
            raise serializers.ValidationError("無効なカテゴリです。")
        return value