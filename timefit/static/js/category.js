/* timefit/static/js/category-setting.js */

let editModeCategoryId = null;       // 수정 대상 ID
let currentDeleteCategoryId = null;  // 삭제 대상 ID

// 1. 장고 REST API로부터 카테고리 목록 로드 (Read)
async function loadCategories() {
    try {
        const response = await fetch('/api/categories/');
        const categories = await response.json();

        const listContainer = document.getElementById('category-list');
        if (!listContainer) return;
        listContainer.innerHTML = '';

        if (categories.length === 0) {
            listContainer.innerHTML = `<p style="text-align:center; color:#7f8c8d; font-size:14px; padding:20px 0;">カテゴリ가 없습니다.</p>`;
            return;
        }

        // 홈화면의 할 일 목록 스타일을 벤치마킹한 리스트 컴포넌트 조립
        categories.forEach(cat => {
            const li = document.createElement('li');
            li.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);";
            
            li.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 14px; height: 14px; border-radius: 50%; background-color: ${cat.color}; border: 1px solid rgba(0,0,0,0.05);"></div>
                    <span style="font-weight: bold; color: #2c3e50; font-size: 14px;">${cat.name}</span>
                </div>
                <div style="display: flex; gap: 6px;">
                    <button class="edit-cat-trigger" data-id="${cat.id}" data-name="${cat.name}" data-color="${cat.color}" style="background:none; border:none; cursor:pointer; font-size:15px; padding:4px;">✏️</button>
                    <button class="delete-cat-trigger" data-id="${cat.id}" style="background:none; border:none; cursor:pointer; font-size:15px; padding:4px;">🗑️</button>
                </div>
            `;
            listContainer.appendChild(li);
        });

        // 동적 버튼 리스너 즉시 매핑
        document.querySelectorAll('.edit-cat-trigger').forEach(btn => {
            btn.addEventListener('click', handleEditCategory);
        });
        document.querySelectorAll('.delete-cat-trigger').forEach(btn => {
            btn.addEventListener('click', handleDeleteCategory);
        });

    } catch (error) {
        console.error('Error fetching categories:', error);
    }
}

// 2. [수정 기능] 입력창으로 데이터 가저오기 핸들러
function handleEditCategory(e) {
    const btn = e.currentTarget;
    editModeCategoryId = btn.dataset.id;
    
    // 입력창 및 드롭다운에 기존 정보 채우기
    document.getElementById('category-name-input').value = btn.dataset.name;
    document.getElementById('category-color-select').value = btn.dataset.color;

    // 등록 폼을 수정 활성화 디자인(주황색 계열 느낌)으로 전형 변경
    const submitBtn = document.getElementById('category-submit-btn');
    submitBtn.innerText = 'カテゴリを変更';
    submitBtn.style.backgroundColor = '#e67e22'; // 에디트 모드 메인 컬러
}

// 폼 초기화 헬퍼 함수
function resetCategoryForm() {
    editModeCategoryId = null;
    document.getElementById('category-name-input').value = '';
    document.getElementById('category-color-select').selectedIndex = 0;
    
    const submitBtn = document.getElementById('category-submit-btn');
    submitBtn.innerText = 'カテゴリを追加';
    submitBtn.style.backgroundColor = '#2c3e50';
}

// 3. [삭제 기능] 2차 경고 모달 개방 핸들러
function handleDeleteCategory(e) {
    currentDeleteCategoryId = e.currentTarget.dataset.id;
    document.getElementById('delete-cat-modal').style.display = 'flex';
}

// 진짜 삭제 API 통신 집행
async function executeDeleteCategory() {
    if (!currentDeleteCategoryId) return;

    try {
        const response = await fetch(`/api/categories/${currentDeleteCategoryId}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });

        if (response.ok) {
            closeDeleteModal();
            resetCategoryForm();
            loadCategories(); // 보드 갱신
        } else {
            alert('カテゴリの削除に失敗しました。');
        }
    } catch (error) {
        console.error('Error deleting category:', error);
    }
}

function closeDeleteModal() {
    document.getElementById('delete-cat-modal').style.display = 'none';
    currentDeleteCategoryId = null;
}

// 4. 안전한 통합 이벤트 바인딩
document.addEventListener('DOMContentLoaded', () => {
    
    // 최초 1회 목록 로드
    loadCategories();

    // 폼 등록 및 수정 서브밋 이벤트
    document.getElementById('category-core-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('category-name-input').value;
        const color = document.getElementById('category-color-select').value;
        const payload = { name: name, color: color };

        let url = '/api/categories/';
        let method = 'POST';

        // 수정 모드일 때 라우팅 타겟 전환
        if (editModeCategoryId) {
            url = `/api/categories/${editModeCategoryId}/`;
            method = 'PATCH';
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                resetCategoryForm();
                loadCategories();
            }
        } catch (error) {
            console.error('Error saving category:', error);
        }
    });

    // 모달 버튼 클릭 바인딩
    document.getElementById('btn-modal-delete').addEventListener('click', executeDeleteCategory);
    document.getElementById('btn-modal-cancel').addEventListener('click', closeDeleteModal);
});

// CSRF 쿠키 획득용 유틸리티 함수
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}