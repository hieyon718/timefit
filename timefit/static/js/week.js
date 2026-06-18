// timefit/static/js/week.js

const dayNames = ['月', '火', '水', '木', '金', '土', '日'];

// ====================================================
// 🔑 [글로벌 메모리 고속도로]
// ====================================================
let currentWeekMonday = getMonday(new Date());

// 헬퍼 함수: 어떤 날짜가 주어지면 그 주(Week)의 월요일 오브젝트를 반환
function getMonday(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // 일요일 처리 포함 월요일 구하기
    return new Date(date.setDate(diff));
}

// 날짜를 'YYYY-MM-DD' 규격 문자열로 바꾸는 헬퍼 함수
function formatDateString(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 주간 내비게이터 텍스트 갱신 (월요일 ~ 일요일 범위 표시)
function updateWeekDisplay() {
    const mondayObj = new Date(currentWeekMonday);
    const sundayObj = new Date(currentWeekMonday);
    sundayObj.setDate(mondayObj.getDate() + 6); // 일요일은 월요일 + 6일

    const displayTag = document.getElementById('current-date-display');
    if (displayTag) {
        displayTag.innerText = `${formatDateString(mondayObj)} ~ ${formatDateString(sundayObj)}`;
    }
}

// ====================================================
// 📥 [코어 코넥터] 백엔드 데이터 비동기 로드 엔진
// ====================================================
async function loadWeeklyAnalysis() {
    const startOfWeek = formatDateString(currentWeekMonday);
    
    try {
        const response = await fetch(`/api/analysis/weekly/?start_date=${startOfWeek}`);
        if (!response.ok) throw new Error('API 통신 실패');
        const data = await response.json();
        
        console.group("🔍 [TimeFit 대시보드 디버깅 룸]");
        console.log("현재 주간 기준일:", startOfWeek);
        console.log("백엔드 수신 데이터:", data);
        console.groupEnd();

        // 🚀 데이터를 무사히 받았으면 화면 조립 엔진에게 토스
        renderDashboard(data);
        
    } catch (error) {
        console.error('Error fetching weekly analysis:', error);
    }
}

// ====================================================
// 🎨 [화면 조립 엔진] 백엔드가 준 데이터를 바탕으로 DOM 구조 리렌더링
// ====================================================
function renderDashboard(data) {
    // 🧱 [1번 렌더링] 주간 블록 보드 배치
    const board = document.getElementById('weekly-grid-board');
    if (board) {
        board.innerHTML = ''; 
        for (let i = 0; i < 7; i++) {
            const column = document.createElement('div');
            column.className = 'grid-column';
            
            const header = document.createElement('div');
            header.className = 'day-header';
            header.innerText = dayNames[i];
            column.appendChild(header);

            const dayTodos = (data.weekly_blocks && data.weekly_blocks[i]) || [];
            dayTodos.forEach(todo => {
                const block = document.createElement('div');
                block.className = 'todo-block';
                block.title = todo.content;
                block.innerText = todo.content.length > 8 ? todo.content.substring(0, 8) + '..' : todo.content;

                if (!todo.is_completed) {
                    block.classList.add('block-postponed');
                } else if (todo.estimated_time && todo.actual_time) {
                    const varianceRatio = (todo.actual_time - todo.estimated_time) / todo.estimated_time;
                    if (varianceRatio > 0.1) {
                        block.classList.add('block-underestimated');
                    } else if (Math.abs(varianceRatio) <= 0.1) {
                        block.classList.add('block-success');
                    } else {
                        block.classList.add('block-default');
                    }
                } else {
                    block.classList.add('block-default');
                }
                column.appendChild(block);
            });
            board.appendChild(column);
        }
    }

    // 📊 [2번 렌더링] 카테고리 차트 및 백엔드 코칭 주입
    const statsWrapper = document.getElementById('category-stats-wrapper');
    if (statsWrapper) {
        statsWrapper.innerHTML = ''; 

        if (!data.category_stats || data.category_stats.length === 0) {
            statsWrapper.innerHTML = `<p style="color:#7f8c8d; font-size:14px; padding: 10px 0;">📊 今週の完了タスクおよび時間記録データがありません。</p>`;
        } else {
            let maxTimeVal = 1;
            data.category_stats.forEach(c => {
                if (c.est_total > maxTimeVal) maxTimeVal = c.est_total;
                if (c.act_total > maxTimeVal) maxTimeVal = c.act_total;
            });

            data.category_stats.forEach(c => {
                const row = document.createElement('div');
                row.className = 'category-stat-row';
                const estWidth = (c.est_total / maxTimeVal) * 100;
                const actWidth = (c.act_total / maxTimeVal) * 100;

                row.innerHTML = `
                    <div class="stat-meta">
                        <span>${c.name}</span>
                        <span style="font-size:12px; color:#7f8c8d;">平均誤差: ${c.avg_error > 0 ? '+' + c.avg_error : c.avg_error}分</span>
                    </div>
                    <div class="bar-container" style="margin-bottom:4px;">
                        <div class="bar-fill" style="background:#7f8c8d; width: ${estWidth}%">予想: ${c.est_total}分</div>
                    </div>
                    <div class="bar-container">
                        <div class="bar-fill" style="background:${c.color}; width: ${actWidth}%">実績: ${c.act_total}分</div>
                    </div>
                `;
                statsWrapper.appendChild(row);
            });

            const coachingBox = document.createElement('div');
            coachingBox.className = 'fact-coaching-box';
            coachingBox.innerHTML = data.category_coaching || '';
            statsWrapper.appendChild(coachingBox);
        }
    }

    // 🕳️ [3번 렌더링] 시간 블랙홀 TOP 3 목록화
    const bhWrapper = document.getElementById('blackhole-list-wrapper');
    if (bhWrapper) {
        bhWrapper.innerHTML = '';

        if (!data.top_blackholes || data.top_blackholes.length === 0) {
            bhWrapper.innerHTML = `<p style="color:#7f8c8d; font-size:14px; padding: 10px 0;">💡 今週、計画時間を大きく超過したブラックホールタスクはありません。</p>`;
        } else {
            const bhList = document.createElement('ol');
            bhList.className = 'blackhole-ordered-list';
            
            data.top_blackholes.forEach((task, idx) => {
                const item = document.createElement('li');
                item.className = 'blackhole-item';
                item.innerHTML = `
                    <div class="bh-rank-badge">${idx + 1}</div>
                    <div class="bh-details">
                        <span class="bh-task-title">${task.content}</span>
                        <span class="bh-task-cat">[${task.category_name}]</span>
                    </div>
                    <div class="bh-excess-time">予想より <span class="fact-highlight">+${task.overdue_time}分</span> 超過</div>
                `;
                bhList.appendChild(item);
            });
            bhWrapper.appendChild(bhList);
        }
    }

    // 🎯 [4번 렌더링] 종합 타임핏 스코어 및 도넛 바인딩
    const scoreValueEl = document.getElementById('timefit-score-value');
    const scoreMsgEl = document.getElementById('score-fact-msg');
    
    if (scoreValueEl) {
        const scoreVal = data.timefit_score || 0;
        scoreValueEl.innerText = `${scoreVal}%`;
        
        if (scoreMsgEl) {
            scoreMsgEl.innerHTML = `💡 ${data.score_coaching || ''}`;
        }

        const circle = document.querySelector('.circle-chart');
        if (circle) {
            circle.style.background = `conic-gradient(#9b59b6 0% ${scoreVal}%, #e9ecef ${scoreVal}% 100%)`;
        }
    }
}

// ====================================================
// 🛡️ [메인 스위치] 이벤트 리스너 안전 결합
// ====================================================
document.addEventListener('DOMContentLoaded', () => {
    
    const btnPrevWeek = document.getElementById('btn-prev-week');
    const btnNextWeek = document.getElementById('btn-next-week');

    if (btnPrevWeek && btnNextWeek) {
        // ◀ 이전 주 클릭 시 (참조 왜곡 방지를 위해 아예 새로운 Date 객체 치환)
        btnPrevWeek.addEventListener('click', () => {
            const targetDate = new Date(currentWeekMonday);
            targetDate.setDate(targetDate.getDate() - 7);
            currentWeekMonday = targetDate;
            
            updateWeekDisplay();
            loadWeeklyAnalysis();
        });

        // ▶ 다음 주 클릭 시git 
        btnNextWeek.addEventListener('click', () => {
            const targetDate = new Date(currentWeekMonday);
            targetDate.setDate(targetDate.getDate() + 7);
            currentWeekMonday = targetDate;
            
            updateWeekDisplay();
            loadWeeklyAnalysis();
        });
    }

    // 초기 화면 빌드
    updateWeekDisplay();
    loadWeeklyAnalysis();
});