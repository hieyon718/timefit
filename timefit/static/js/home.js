
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
document.getElementById('current-date').innerText = `📅 ${new Date().toLocaleDateString('ja-JP', options)}`;

// 1. APIView 엔드포인트에서 데이터 받아오기 (Read)
async function loadTodos() {
    try {
        const response = await fetch('/api/todos/'); // DRF 데이터 주소 명시
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
            li.className = 'todo-item';
            const estTimeHtml = todo.estimated_time ? `<span class="todo-est-time">⏱️ ${todo.estimated_time}分</span>` : '';
            
            li.innerHTML = `
                <span class="category-badge" style="background-color: ${todo.category_color || '#bdc3c7'}">
                    ${todo.category_name || '未分類'}
                </span>
                <div class="todo-content">${todo.content}</div>
                ${estTimeHtml}
            `;
            todoList.appendChild(li);
        });
    } catch (error) {
        console.error('Error fetching todos:', error);
    }
}

// 2. APIView 엔드포인트로 데이터 전송하기 (Create)
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

    try {
        const response = await fetch('/api/todos/', { // 데이터 전용 POST
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(payload)
        });

        if (response.status === 201) {
            document.getElementById('content-input').value = '';
            document.getElementById('time-input').value = '';
            loadTodos(); 
        } else {
            alert('タスクの追加に失敗しました。');
        }
    } catch (error) {
        console.error('Error creating todo:', error);
    }
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
