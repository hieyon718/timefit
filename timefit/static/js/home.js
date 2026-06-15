const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
document.getElementById('current-date').innerText = `📅 ${new Date().toLocaleDateString('ja-JP', options)}`;

// 💡 글로벌 상태 관리 변수 추가
let currentTargetTodoId = null; // 완료 체크 모달용 타겟 ID
let editModeTodoId = null;      // ✏️ 현재 수정 모드인 투두 ID (null 이면 추가 모드)

// 1. Todo 목록 로드 (Read)
async function loadTodos() {
    try {
        const response = await fetch('/api/todos/');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        const todoList = document.getElementById('todo-list');
        todoList.innerHTML = ''; 

        if (data.length === 0) {
            todoList.innerHTML = `<li style="text-align:center; color:#95a5a6; padding:20px;">今日のタスクはすべて完了、または登録されていません。</li>`;
            return;
        }

        data.forEach(todo => {
            const li = document.createElement('li');
            li.className = `todo-item ${todo.is_completed ? 'is-completed' : ''}`;
            
            let timeInfoHtml = '';
            if (todo.estimated_time) {
                timeInfoHtml += `<div>予想: ${todo.estimated_time}分</div>`;
            }
            if (todo.actual_time !== null) {
                timeInfoHtml += `<div style="font-weight:bold; color:#2ecc71;">実績: ${todo.actual_time}分</div>`;
            }

            // 오른쪽 끝에 연필(✏️) 이모지 버튼 배치 및 데이터 하드코딩 바인딩
            li.innerHTML = `
                <input type="checkbox" class="todo-checkbox" data-id="${todo.id}" ${todo.is_completed ? 'checked' : ''}>
                <span class="category-badge" style="background-color: ${todo.category_color || '#bdc3c7'}">
                    ${todo.category_name || '未分類'}
                </span>
                <div class="todo-content">${todo.content}</div>
                <div class="todo-time-info">${timeInfoHtml}</div>
                <button class="edit-trigger-btn" 
                        data-id="${todo.id}" 
                        data-content="${todo.content}" 
                        data-category="${todo.category || ''}" 
                        data-estimated="${todo.estimated_time || ''}">✏️</button>
            `;
            todoList.appendChild(li);
        });

        // 이벤트 바인딩 재설정
        document.querySelectorAll('.todo-checkbox').forEach(cb => {
            cb.addEventListener('change', handleCheckboxChange);
        });

        document.querySelectorAll('.edit-trigger-btn').forEach(btn => {
            btn.addEventListener('click', handleEditTrigger);
        });

    } catch (error) {
        console.error('Error fetching todos:', error);
    }
}

// 2. ✏️ 연필 버튼 클릭 시 -> 상단 입력창을 수정 폼으로 세팅하는 핸들러
function handleEditTrigger(e) {
    const btn = e.currentTarget;
    
    // 데이터 속성 추출
    editModeTodoId = btn.dataset.id;
    const currentContent = btn.dataset.content;
    const currentCategory = btn.dataset.category;
    const currentEstimated = btn.dataset.estimated;

    // 상단 인풋창에 기존 데이터 강제 주입
    document.getElementById('content-input').value = currentContent;
    document.getElementById('category-select').value = currentCategory;
    document.getElementById('time-input').value = currentEstimated;

    // UI 상태 변경 (노란 배경색 도입 + 버튼 텍스트 변경)
    document.getElementById('form-container').classList.add('edit-active');
    const submitBtn = document.getElementById('form-submit-btn');
    submitBtn.innerText = 'タスクを変更';
    submitBtn.classList.add('edit-btn-style');
    
    // 화면을 부드럽게 상단 입력창으로 스크롤 이동
    document.getElementById('form-container').scrollIntoView({ behavior: 'smooth' });
}

// 수정 완료 후 입력창을 원래대로 복구하는 헬퍼 함수
function resetFormToCreateMode() {
    editModeTodoId = null;
    document.getElementById('content-input').value = '';
    document.getElementById('time-input').value = '';
    
    document.getElementById('form-container').classList.remove('edit-active');
    const submitBtn = document.getElementById('form-submit-btn');
    submitBtn.innerText = 'タスクを追加';
    submitBtn.classList.remove('edit-btn-style');
}

// 3. 통합 Form 제출(Submit) 핸들러 [등록(Create) 혹은 수정(Update)]
document.getElementById('todo-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const categoryId = document.getElementById('category-select').value;
    const content = document.getElementById('content-input').value;
    const estimatedTime = document.getElementById('time-input').value;

    const payload = {
        category: categoryId ? parseInt(categoryId) : null,
        content: content,
        estimated_time: estimatedTime ? parseInt(estimatedTime) : null
    };

    let url = '/api/todos/';
    let method = 'POST';

    // 💡 만약 editModeTodoId에 값이 있다면 '수정 모드'로 판별하여 분기
    if (editModeTodoId !== null) {
        url = `/api/todos/${editModeTodoId}/`;
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
            resetFormToCreateMode(); // 폼 원상복구
            loadTodos(); // 리스트 새로고침
        } else {
            alert('処理に失敗しました。');
        }
    } catch (error) {
        console.error('Error handling form submit:', error);
    }
});

// 4. 체크박스 핸들러
function handleCheckboxChange(e) {
    const todoId = e.target.dataset.id;
    const isChecked = e.target.checked;

    if (isChecked) {
        currentTargetTodoId = todoId;
        document.getElementById('actual-time-input').value = '';
        document.getElementById('time-modal').style.display = 'flex';
    } else {
        updateTodoStatus(todoId, false, null);
    }
}

// 5. 체크박스 상태 업데이트 처리 전용 함수
async function updateTodoStatus(todoId, isCompleted, actualTime) {
    const payload = { is_completed: isCompleted, actual_time: actualTime };
    try {
        const response = await fetch(`/api/todos/${todoId}/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            closeModal();
            loadTodos();
        } else {
            alert('ステータスの更新に失敗しました。');
        }
    } catch (error) {
        console.error('Error updating todo status:', error);
    }
}

function closeModal() {
    document.getElementById('time-modal').style.display = 'none';
    currentTargetTodoId = null;
}

document.getElementById('btn-modal-submit').addEventListener('click', () => {
    const actualTimeVal = document.getElementById('actual-time-input').value;
    const actualTime = actualTimeVal !== '' ? parseInt(actualTimeVal) : 0;
    if (currentTargetTodoId) updateTodoStatus(currentTargetTodoId, true, actualTime);
});

document.getElementById('btn-modal-skip').addEventListener('click', () => {
    if (currentTargetTodoId) updateTodoStatus(currentTargetTodoId, true, null);
});

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

loadTodos();