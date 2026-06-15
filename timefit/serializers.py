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
        read_only_fields = ['id', 'is_completed', 'actual_time', 'target_date', 'created_at']

    def validate_category(self, value):
        """
        입력된 카테고리가 실제로 요청한 유저의 소유인지 검증 (보안 하드코딩)
        """
        request = self.context.get('request')
        if request and value and value.user != request.user:
            raise serializers.ValidationError("無効なカテゴリです。")
        return value