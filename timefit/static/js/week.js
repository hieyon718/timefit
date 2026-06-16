// 요일 헤더 매핑용 매트릭스 배열
const dayNames = ['月', '火', '水', '木', '金', '土', '日'];

// 🚀 API를 호출하여 주간 블록 데이터를 로드하고 판별하는 함수
async function fetchWeeklyBlockData() {
    try {
        const response = await fetch('/api/analysis/weekly/');
        if (!response.ok) throw new Error('API 통신 실패');
        const data = await response.json();
        console.log("🚀 백엔드가 보내준 리얼 데이터:", data);

        // 1. 주간 고정 날짜 범위 렌더링
        document.getElementById('weekly-range-text').innerText = `📅 期間: ${data.start_date} ~ ${data.end_date}`;

        const board = document.getElementById('weekly-grid-board');
        board.innerHTML = ''; // 초기화

        // 2. 월요일(0)부터 일요일(6)까지 7열 기둥 생성 시작
        for (let i = 0; i < 7; i++) {
            const column = document.createElement('div');
            column.className = 'grid-column';
            
            // 요일 헤더 추가
            const header = document.createElement('div');
            header.className = 'day-header';
            header.innerText = dayNames[i];
            column.appendChild(header);

            // 3. 백엔드에서 내려준 해당 요일의 할 일 주머니 리스트 가져오기
            const dayTodos = data.weekly_blocks[i] || [];

            dayTodos.forEach(todo => {
                const block = document.createElement('div');
                block.className = 'todo-block';
                block.title = todo.content; // 마우스 호버 시 툴팁 기능
                
                // 글자수가 길면 미니멀하게 자르기
                block.innerText = todo.content.length > 8 ? todo.content.substring(0, 8) + '..' : todo.content;

                // ✨ 💡 [핵심 사양] 기획에 따른 조건별 블록 색상 판별 로직 하드코딩
                if (!todo.is_completed) {
                    // ① 미완료 상태 = 이월 블록 (🟡 노란색)
                    block.classList.add('block-postponed');
                } else if (todo.estimated_time && todo.actual_time) {
                    const est = todo.estimated_time;
                    const act = todo.actual_time;
                    
                    // 오차 비율 계산
                    const varianceRatio = (act - est) / est;

                    if (varianceRatio > 0.1) {
                        // ② 예상 시간보다 실제 시간이 10% 초과된 경우 = 과소평가 블록 (🔴 빨간색)
                        block.classList.add('block-underestimated');
                    } else if (Math.abs(varianceRatio) <= 0.1) {
                        // ③ 예상 시간 대비 실제 소요 시간이 오차 ±10% 이내인 경우 = 예측 성공 블록 (🟢 초록색)
                        block.classList.add('block-success');
                    } else {
                        // 예상 시간보다 훨씬 일찍 끝난 경우 등 기본 그레이 처리
                        block.classList.add('block-default');
                    }
                } else {
                    // 예상 시간이나 실제 시간 기록이 누락된 일반 완료 건 (⚪ 회색)
                    block.classList.add('block-default');
                }

                column.appendChild(block);
            });

            board.appendChild(column);
        }

        // 📊 [2번 렌더링] 카테고리별 가로 그래프 및 Fact 코칭 출력
        const statsWrapper = document.getElementById('category-stats-wrapper');
        statsWrapper.innerHTML = ''; 

        // 🚨 방어막: 이번 주 완료 데이터가 없거나 텅 비어있을 때 안내문 출력 후 안전하게 함수 종료
        if (!data.category_stats || data.category_stats.length === 0) {
            statsWrapper.innerHTML = `<p style="color:#7f8c8d; font-size:14px; padding: 10px 0;">📊 今週の完了タスクおよび時間記録データがありません。</p>`;
            return; // 👈 여기서 멈추지 않고 안전하게 탈출합니다.
        }

        let maxTimeVal = 1; // 그래프 비율 조정을 위한 최댓값 찾기
        data.category_stats.forEach(c => {
            if (c.est_total > maxTimeVal) maxTimeVal = c.est_total;
            if (c.act_total > maxTimeVal) maxTimeVal = c.act_total;
        });

        // 가장 오차가 심한 카테고리를 추적하기 위한 변수
        let worstCategory = null;
        let worstError = 0;

        data.category_stats.forEach(c => {
            const row = document.createElement('div');
            row.className = 'category-stat-row';

            // 백분율 기반의 그래프 길이 계산
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

            // 절대값 기준으로 가장 예측 오차(실제-예상)가 큰 카테고리 판별
            if (Math.abs(c.avg_error) > Math.abs(worstError)) {
                worstError = c.avg_error;
                worstCategory = c;
            }
        });

        // 💡 [핵심 사양] 객관적 데이터 기반 1줄 코칭 피드백 하드코딩 주입
        const coachingBox = document.createElement('div');
        coachingBox.className = 'fact-coaching-box';

        if (worstCategory && Math.abs(worstError) >= 15) {
            // 특정 카테고리 오차가 15분 이상 차이 날 때 (팩트 경고)
            if (worstError > 0) {
                coachingBox.innerHTML = `💡 今週、<span class="fact-highlight">「${worstCategory.name}」</span>カテゴリは予想より実際の所要時間が平均<span class="fact-highlight">${worstError}分</span>長くかかっています。`;
            } else {
                coachingBox.innerHTML = `💡 今週、<span class="fact-success">「${worstCategory.name}」</span>カテゴリは予想より平均<span class="fact-success">${Math.abs(worstError)}分</span>早く終了しています。`;
            }
        } else {
            // 전체적으로 오차가 크지 않고 훌륭하게 통제 중일 때
            coachingBox.innerHTML = `💡 すべてのカテゴリにおいて、計画と実績の誤差が非常に少なく、<span class="fact-success">安定した自己ペース</span>を維持しています。`;
        }

        statsWrapper.appendChild(coachingBox);


    } catch (error) {
        console.error('Error rendering weekly blocks:', error);
    }
}

// 문서 로드 즉시 실행
document.addEventListener('DOMContentLoaded', fetchWeeklyBlockData);