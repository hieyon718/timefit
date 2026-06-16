/* timefit/static/js/calendar.js */

// 💡 외부 유출 및 충돌을 방지하기 위해 캘린더 전역 변수를 안전하게 선언
let currentCalendarYear = 2026;
let currentCalendarMonth = 6; 

const weekDaysList = ['日', '月', '火', '水', '木', '金', '土'];

// 📅 백엔드 데이터를 가져와 달력을 그리는 핵심 함수
async function renderCalendarDashboard() {
    try {
        // 백엔드 한 달 치 그루핑 API 호출
        const response = await fetch(`/api/calendar/data/?year=${currentCalendarYear}&month=${currentCalendarMonth}`);
        const data = await response.json();

        // 상단 연/월 타이틀 업데이트
        const titleTag = document.getElementById('month-title');
        if (titleTag) {
            titleTag.innerText = `${data.year}年 ${String(data.month).padStart(2, '0')}月`;
        }

        const board = document.getElementById('calendar-board');
        if (!board) return;
        board.innerHTML = '';

        // ① 요일 헤더 행 주입
        weekDaysList.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'day-of-week';
            dayHeader.innerText = day;
            board.appendChild(dayHeader);
        });

        // ② 달력 배치를 위한 빈 칸(Offset) 연산
        const firstDayInstance = new Date(data.year, data.month - 1, 1);
        const startDayOfWeek = firstDayInstance.getDay(); 
        
        const lastDayInstance = new Date(data.year, data.month, 0);
        const totalDays = lastDayInstance.getDate();

        // 시작 전 빈 칸 채우기
        for (let i = 0; i < startDayOfWeek; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-cell cell-empty';
            board.appendChild(emptyCell);
        }

        // ③ 진짜 날짜 칸 생성 및 데이터 렌더링
        for (let day = 1; day <= totalDays; day++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell';
            
            const dateStr = `${data.year}-${String(data.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            // 🔗 클릭 시 해당 날짜 파라미터를 들고 홈화면으로 점프
            cell.addEventListener('click', () => {
                // 뚫어놓은 고정 라우팅 주소 규칙으로 다이렉트 점프!
                window.location.href = `/home/${dateStr}/`;
            });

            // 날짜 숫자 라벨
            const numberLabel = document.createElement('div');
            numberLabel.className = 'cell-number';
            numberLabel.innerText = day;
            cell.appendChild(numberLabel);

            // 해당 날짜에 해당하는 투두 배열 꺼내기
            const dayTodos = data.todos_by_date[dateStr] || [];
            
            dayTodos.forEach(todo => {
    const todoItem = document.createElement('div');
    todoItem.title = todo.content;
    todoItem.innerText = todo.content;
    
    // 1. 기본 카테고리 테마 배경색
    const baseColor = todo.category_color || '#bdc3c7';

    // 2. 글씨는 검은색 통일 ⬛
    todoItem.style.color = '#ffffff'; 

    if (todo.is_completed) {
        // 🔘 [완료 상태]: 원래 색상 위에 반투명 흰색을 얹어 한 단계 "연하고 부드러운 색"으로 변경
        todoItem.className = 'calendar-mini-todo mini-todo-completed';
        todoItem.style.backgroundColor = baseColor; 
        
        /* 💡 핵심 교정: 흰색(255,255,255) 레이어를 55% 두께로 깔아 원래 색을 투명하고 연하게 만듭니다 */
        todoItem.style.backgroundImage = 'linear-gradient(rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0.55))'; 
    } else {
        // ⚪ [미완료 상태]: 원래의 선명한 카테고리 테마 컬러 그대로 유지
        todoItem.className = 'calendar-mini-todo mini-todo-incomplete';
        todoItem.style.backgroundColor = baseColor;
        todoItem.style.backgroundImage = 'none';
    }

    cell.appendChild(todoItem);
});

            board.appendChild(cell);
        }

    } catch (error) {
        console.error('Error rendering calendar:', error);
    }
}


// ==========================================
// 🛡️ [방어 핵심] HTML 조립이 완전히 끝난 직후 버튼들을 깨우는 스위치
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. 오늘 날짜 기준으로 연/월 초기값 강제 세팅
    const todayInstance = new Date();
    currentCalendarYear = todayInstance.getFullYear();
    currentCalendarMonth = todayInstance.getMonth() + 1;

    // 2. ◀ 버튼 이벤트 감지 바인딩
    const prevBtn = document.getElementById('prev-month-btn');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentCalendarMonth--;
            if (currentCalendarMonth < 1) {
                currentCalendarMonth = 12;
                currentCalendarYear--;
            }
            renderCalendarDashboard();
        });
    }

    // 3. ▶ 버튼 이벤트 감지 바인딩
    const nextBtn = document.getElementById('next-month-btn');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentCalendarMonth++;
            if (currentCalendarMonth > 12) {
                currentCalendarMonth = 1;
                currentCalendarYear++;
            }
            renderCalendarDashboard();
        });
    }

    // 4. 모든 준비가 끝났으니 최초 1회 달력 강제 로드!
    renderCalendarDashboard();
});