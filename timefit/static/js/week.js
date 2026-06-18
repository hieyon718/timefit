const dayNames = ['月', '火', '水', '木', '金', '土', '日'];

async function fetchWeeklyBlockData() {
    try {
        const response = await fetch('/api/analysis/weekly/');
        if (!response.ok) throw new Error('API 통신 실패');
        const data = await response.json();
        
        console.group("🔍 [TimeFit 대시보드 디버깅 룸]");
        console.log("1. 백엔드 전체 응답 객체:", data);
        console.groupEnd();

        // [공통] 고정 날짜 바인딩
        if (data.start_date && data.end_date) {
            document.getElementById('weekly-range-text').innerText = `📅 期間: ${data.start_date} ~ ${data.end_date}`;
        }

        // ====================================================
        // 🧱 [1번 렌더링] 주간 블록 보드 배치 (독립 실행)
        // ====================================================
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

        // ====================================================
        // 📊 [2번 렌더링] 카테고리 차트 및 백엔드 코칭 주입 (독립 실행)
        // ====================================================
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

        // ====================================================
        // 🕳️ [3번 렌더링] 시간 블랙홀 TOP 3 목록화 (2번의 간섭에서 완전 이탈)
        // ====================================================
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

        // ====================================================
        // 🎯 [4번 렌더링] 종합 타임핏 스코어 및 도넛 바인딩 (2번의 간섭에서 완전 이탈)
        // ====================================================
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

    } catch (error) {
        console.error('Error rendering weekly blocks:', error);
    }
}

document.addEventListener('DOMContentLoaded', fetchWeeklyBlockData);