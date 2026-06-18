let currentTargetTodoId = null; 
let editModeTodoId = null;      
let currentDeleteTodoId = null; // 🗑️ 삭제할 투두 ID 임시 보관함

// 🔑 [완벽 방어 스위치] 서버가 보내준 날짜가 '진짜 유효한 값'일 때만 그 날짜를 쓰고, 아니면 오늘(new Date())을 씁니다.
let currentSelectedDate = new Date(); // 우선 오늘 날짜를 기본 세팅으로 잡아두고

if (window.SERVER_INITIAL_DATE && window.SERVER_INITIAL_DATE.trim() !== "") {
    const parsedDate = new Date(window.SERVER_INITIAL_DATE);
    
    // 이 날짜가 망가진 글자(Invalid Date)가 아닐 때만 글로벌 메모리를 덮어씁니다.
    if (!isNaN(parsedDate.getTime())) {
        currentSelectedDate = parsedDate;
    }
}

// 2. 날짜를 'YYYY-MM-DD' 규격 문자열로 바꾸는 헬퍼 함수
function formatDateString(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 3. 화면 상단에 일본어 날짜 구조로 뿌려주는 렌더링 함수
function updateDateDisplay() {
    const options = { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' };
    const displayTag = document.getElementById('current-date-display');
    if (displayTag) {
        displayTag.innerText = currentSelectedDate.toLocaleDateString('ja-JP', options);
    }
}

// 4. Todo 목록 로드 (Read)
// 4. Todo 목록 로드 (Read)
async function loadTodos() {
    const dateParam = formatDateString(currentSelectedDate);
    try {
        const response = await fetch(`/api/todos/?date=${dateParam}`);
        const todos = await response.json();
        
        const listContainer = document.getElementById('todo-list');
        if (!listContainer) return;
        listContainer.innerHTML = '';

        if (todos.length === 0) {
            listContainer.innerHTML = `<p style="text-align:center; color:#7f8c8d; font-size:14px; padding:20px 0;">この日のタスクはありません。</p>`;
            return;
        }

        // 💡 현재 화면이 가리키는 날짜를 YYYY-MM-DD 문자열로 변환 (비교용)
        const currentTargetDateStr = dateParam; 

        todos.forEach(todo => {
            const li = document.createElement('li');
            
            // 💡 [핵심 조건 분기] 
            // 투두의 예정일이 현재 화면 날짜보다 과거이면서 + 아직 미완료(is_completed가 false)인 경우
            const isPastIncomplete = (todo.target_date < currentTargetDateStr) && !todo.is_completed;
            
            // 과거 미완료 건이면 'past-incomplete' 클래스를 추가로 부여합니다.
            li.className = `todo-item ${todo.is_completed ? 'is-completed' : ''} ${isPastIncomplete ? 'past-incomplete' : ''}`;
            
            let timeInfoHtml = '';
            if (todo.estimated_time) {
                timeInfoHtml += `<div>予想: ${todo.estimated_time}分</div>`;
            }
            if (todo.actual_time !== null) {
                timeInfoHtml += `<div style="font-weight:bold; color:#2ecc71;">実績: ${todo.actual_time}分</div>`;
            }

            // 💡 과거 미완료 상태이면 체크박스나 버튼들에 disabled 속성을 부여해 조작을 차단합니다.
            li.innerHTML = `
                <input type="checkbox" class="todo-checkbox" data-id="${todo.id}" ${todo.is_completed ? 'checked' : ''} ${isPastIncomplete ? 'disabled' : ''}>
                <span class="category-badge" style="background-color: ${todo.category_color || '#bdc3c7'}">
                    ${todo.category_name || '未分類'}
                </span>
                <div class="todo-content">${todo.content}</div>
                <div class="todo-time-info">${timeInfoHtml}</div>
                
                <div class="todo-actions-btns" style="display: flex; gap: 4px;">
                    <button class="edit-trigger-btn" 
                            data-id="${todo.id}" 
                            data-content="${todo.content}" 
                            data-category="${todo.category || ''}" 
                            data-estimated="${todo.estimated_time || ''}"
                            ${isPastIncomplete ? 'style="display:none;"' : ''}>✏️</button>
                    <button class="delete-trigger-btn" data-id="${todo.id}" style="background:none; border:none; cursor:pointer; ${isPastIncomplete ? 'display:none;' : ''}">🗑️</button>
                </div>
            `;
            listContainer.appendChild(li);
        });

        // 리스트 동적 생성 후 이벤트 바인딩 (동일)
        document.querySelectorAll('.todo-checkbox:not([disabled])').forEach(cb => {
            cb.addEventListener('change', handleCheckboxChange);
        });

        document.querySelectorAll('.edit-trigger-btn').forEach(btn => {
            btn.addEventListener('click', handleEditTrigger);
        });

        document.querySelectorAll('.delete-trigger-btn').forEach(btn => {
            btn.addEventListener('click', handleDeleteTrigger);
        });

    } catch (error) {
        console.error('Error fetching todos:', error);
    }
}

// 5. 연필 버튼 핸들러
function handleEditTrigger(e) {
    const btn = e.currentTarget;
    editModeTodoId = btn.dataset.id;
    document.getElementById('content-input').value = btn.dataset.content;
    document.getElementById('category-select').value = btn.dataset.category;
    document.getElementById('time-input').value = btn.dataset.estimated;

    document.getElementById('form-container').classList.add('edit-active');
    const submitBtn = document.getElementById('form-submit-btn');
    submitBtn.innerText = 'タスクを変更';
}

function resetFormToCreateMode() {
    editModeTodoId = null;
    document.getElementById('content-input').value = '';
    document.getElementById('time-input').value = '';
    document.getElementById('form-container').classList.remove('edit-active');
    document.getElementById('form-submit-btn').innerText = 'タスクを追加';
}

// ✏️ 3-1. 휴지통 버튼을 눌렀을 때 삭제 모달을 여는 핸들러
function handleDeleteTrigger(e) {
    const btn = e.currentTarget;
    currentDeleteTodoId = btn.dataset.id; // 삭제 타겟 ID 세팅
    document.getElementById('delete-modal').style.display = 'flex'; // 모달 열기
}

// ✏️ 3-2. 백엔드에 진짜 DELETE 신호를 보내는 함수
async function deleteTodoStatus() {
    if (!currentDeleteTodoId) return;

    try {
        const response = await fetch(`/api/todos/${currentDeleteTodoId}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCookie('csrftoken') // Django CSRF 검증 패스용
            }
        });

        if (response.ok) {
            closeDeleteModal(); // 모달 닫기
            loadTodos();        // 화면 리스트 리로드 (사라짐 효과)
        } else {
            alert('タスクの削除に失敗しました。');
        }
    } catch (error) {
        console.error('Error deleting todo:', error);
    }
}

// ✏️ 3-3. 삭제 모달 청소 및 닫기 헬퍼 함수
function closeDeleteModal() {
    document.getElementById('delete-modal').style.display = 'none';
    currentDeleteTodoId = null;
}

// 6. 체크박스 및 모달 관련 기존 함수들
function handleCheckboxChange(e) {
    const todoId = e.target.dataset.id;
    if (e.target.checked) {
        currentTargetTodoId = todoId;
        document.getElementById('actual-time-input').value = '';
        document.getElementById('time-modal').style.display = 'flex';
    } else {
        updateTodoStatus(todoId, false, null);
    }
}

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
        }
    } catch (error) {
        console.error('Error updating todo status:', error);
    }
}

function closeModal() {
    document.getElementById('time-modal').style.display = 'none';
    currentTargetTodoId = null;
}

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


// ==========================================
// 🛡️ [핵심 교정] 모든 HTML 태그 조립이 끝난 직후 작동할 메인 스위치
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    
    // ① 기존에 에러를 뿜던 하드코딩 구문을 안전하게 변경
    const currentDateTag = document.getElementById('current-date');
    if (currentDateTag) {
        currentDateTag.innerText = "⚡ 今日のタスク";
    }

    // ② 화살표 버튼 이벤트 리스너 바인딩 (이 시점엔 HTML 버튼들이 무조건 존재하므로 100% 성공)
    const btnPrev = document.getElementById('btn-prev-date');
    const btnNext = document.getElementById('btn-next-date');
    
    if (btnPrev && btnNext) {
        btnPrev.addEventListener('click', () => {
            currentSelectedDate.setDate(currentSelectedDate.getDate() - 1);
            updateDateDisplay();
            loadTodos();
        });

        btnNext.addEventListener('click', () => {
            currentSelectedDate.setDate(currentSelectedDate.getDate() + 1);
            updateDateDisplay();
            loadTodos();
        });
    }

    // ③ 통합 등록/수정 폼 이벤트 바인딩
    const todoForm = document.getElementById('todo-form');
    if (todoForm) {
        todoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const categoryId = document.getElementById('category-select').value;
            const content = document.getElementById('content-input').value;
            const estimatedTime = document.getElementById('time-input').value;

            const payload = {
                category: categoryId,
                content: content,
                estimated_time: estimatedTime ? parseInt(estimatedTime) : null,
                target_date: formatDateString(currentSelectedDate)
            };

            let url = '/api/todos/';
            let method = 'POST';
            if (editModeTodoId !== null) {
                url = `/api/todos/${editModeTodoId}/`;
                method = 'PATCH';
            }

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                    },
                    body: JSON.stringify(payload)
                });
                if (response.ok) {
                    resetFormToCreateMode();
                    loadTodos();
                }
            } catch (error) {
                console.error('Error saving todo:', error);
            }
        });
    }

    // ④ 모달 버튼 이벤트 바인딩
    document.getElementById('btn-modal-submit').addEventListener('click', () => {
        const actualTimeVal = document.getElementById('actual-time-input').value;
        const actualTime = actualTimeVal !== '' ? parseInt(actualTimeVal) : 0;
        if (currentTargetTodoId) updateTodoStatus(currentTargetTodoId, true, actualTime);
    });

    document.getElementById('btn-modal-skip').addEventListener('click', () => {
        if (currentTargetTodoId) updateTodoStatus(currentTargetTodoId, true, null);
    });

    // 모달 내부 [삭제하는(削除する)] 버튼 클릭 시
    document.getElementById('btn-delete-submit').addEventListener('click', deleteTodoStatus);

    // 모달 내부 [취소(キャンセル)] 버튼 클릭 시
    document.getElementById('btn-delete-cancel').addEventListener('click', closeDeleteModal);

    // ⑤ 첫 화면 진입 시 날짜 텍스트 업데이트 및 투두 목록 불러오기 실행
    updateDateDisplay();
    loadTodos();

});

window.changeDate = function(offset) {
    // 1. 글로벌 날짜 상태 변경
    currentSelectedDate.setDate(currentSelectedDate.getDate() + offset);
    
    // 2. 상단 텍스트 새로고침
    updateDateDisplay();
    
    // 3. 백엔드 통신 및 리스트 리로드
    loadTodos();
};