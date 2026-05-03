const ADMIN_CONFIG = {
    name: "ahmed",
    number: "246333"
};

let correctAnswers = {};
let questions = [];
let settings = {
    timePerQuestion: 1,
    platformName: "منصة الاختبارات الرقمية"
};

let currentQuestion = 0;
let answeredQuestions = [];
let answers = [];
let timer = 10 * 60;
let interval;
let currentUser = null;

function init() {
    loadQuestions();
    loadSettings();
    document.addEventListener('keydown', handleKeyboard);
    addTouchSupport();
}

function loadQuestions() {
    try {
        const stored = localStorage.getItem('quizQuestions');
        if (stored) questions = JSON.parse(stored);
        else questions = [];
    } catch (e) {
        questions = [];
    }
    updateCorrectAnswers();
}

function loadSettings() {
    try {
        const stored = localStorage.getItem('quizSettings');
        if (stored) settings = JSON.parse(stored);
    } catch (e) {}
}

function getRegisteredStudents() {
    try {
        const stored = localStorage.getItem('registeredStudents');
        if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
}

function saveRegisteredStudent(student) {
    let students = getRegisteredStudents();
    students.push(student);
    localStorage.setItem('registeredStudents', JSON.stringify(students));
}

function isStudentRegistered(number) {
    const students = getRegisteredStudents();
    return students.some(s => s.number === number);
}

function updateCorrectAnswers() {
    correctAnswers = {};
    questions.forEach(q => {
        if (q.correctIndex !== undefined && q.answers && q.answers[q.correctIndex]) {
            correctAnswers[q.name] = q.answers[q.correctIndex];
        }
    });
}

function isValidThreePartName(name) {
    if (!name || typeof name !== 'string') return false;
    const parts = name.trim().split(/\s+/);
    return parts.length >= 3 && parts.every(p => p.length >= 2);
}

function showError(elementId, msg) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = msg;
        el.style.display = 'block';
    }
}

function clearError(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = '';
        el.style.display = 'none';
    }
}

function clearAllErrors() {
    clearError('studentNameError');
    clearError('studentNumberError');
    clearError('adminError');
}

function showPage(pageId) {
    const pages = ['studentLoginPage', 'adminLoginPage', 'registrationPage', 'quizPage', 'adminPage', 'resultPage'];
    pages.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    const target = document.getElementById(pageId);
    if (target) {
        target.style.display = 'block';
        window.scrollTo(0, 0);
    }
    clearAllErrors();
}

function showAdminLogin() {
    showPage('adminLoginPage');
}

function showStudentLogin() {
    showPage('studentLoginPage');
}

function handleStudentLogin() {
    clearAllErrors();

    const nameInput = document.getElementById('student_login_name');
    const numberInput = document.getElementById('student_login_number');

    if (!nameInput || !numberInput) return;

    const name = nameInput.value.trim();
    const number = numberInput.value.trim();

    if (!name) {
        showError('studentNameError', 'الرجاء إدخال الاسم');
        return;
    }

    if (!isValidThreePartName(name)) {
        showError('studentNameError', 'الاسم يجب أن يكون ثلاثي');
        return;
    }

    if (!number) {
        showError('studentNumberError', 'الرجاء إدخال رقم البطاقة');
        return;
    }

    if (isStudentRegistered(number)) {
        showError('studentNumberError', 'هذا الرقم مسجل مسبقاً');
        return;
    }

    const student = {
        name: name,
        number: number,
        registeredAt: new Date().toISOString()
    };
    saveRegisteredStudent(student);

    currentUser = { name: name, number: number, role: 'student' };
    showPage('registrationPage');

    const fullNameInput = document.getElementById('full_name');
    const usernameInput = document.getElementById('username');
    if (fullNameInput) fullNameInput.value = name;
    if (usernameInput) usernameInput.value = number;
}

function handleAdminLogin() {
    clearAllErrors();

    const nameInput = document.getElementById('admin_name');
    const numberInput = document.getElementById('admin_number');

    if (!nameInput || !numberInput) return;

    const name = nameInput.value.trim();
    const number = numberInput.value.trim();

    if (!name || !number) {
        showError('adminError', 'الرجاء إدخال اسم الأدمن والرقم');
        return;
    }

    if (name === ADMIN_CONFIG.name && number === ADMIN_CONFIG.number) {
        currentUser = { name: name, number: number, role: 'admin' };
        showPage('adminPage');
        loadAdminQuestions();
        loadAdminResults();
        updateStats();
        return;
    }

    showError('adminError', 'اسم الأدمن أو الرقم غير صحيح');
}

function logout() {
    currentUser = null;
    clearInterval(interval);
    location.reload();
}

function showAdminSection(section) {
    const sections = ['adminQuestionsSection', 'adminResultsSection', 'adminSettingsSection'];
    sections.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.style.display = 'none';
    });

    const target = document.getElementById('admin' + section.charAt(0).toUpperCase() + section.slice(1) + 'Section');
    if (target) target.style.display = 'block';

    if (section === 'results') loadAdminResults();
    if (section === 'settings') loadSettingsForm();
}

function loadAdminQuestions() {
    const container = document.getElementById('adminQuestionsList');
    if (!container) return;

    container.innerHTML = '';

    if (questions.length === 0) {
        container.innerHTML = '<p class="no-results">لا توجد أسئلة مضافة بعد</p>';
        updateStats();
        return;
    }

    questions.forEach((q, index) => {
        const div = document.createElement('div');
        div.className = 'admin-question-item';

        const typeLabel = q.type === 'multiple' ? 'اختيار من متعدد' : 'صح/خطأ';

        let answersHtml = '';
        q.answers.forEach((ans, ansIndex) => {
            const isChecked = q.correctIndex === ansIndex ? 'checked' : '';
            answersHtml += `
                <div class="admin-answer-row">
                    <input type="radio" name="correct_${index}" ${isChecked} onchange="setCorrectAnswer(${index}, ${ansIndex})">
                    <input type="text" value="${escapeHtml(ans)}" onchange="updateAnswer(${index}, ${ansIndex}, this.value)">
                    <button type="button" onclick="removeAnswer(${index}, ${ansIndex})" class="remove-btn">حذف</button>
                </div>
            `;
        });

        div.innerHTML = `
            <div class="question-header">
                <strong>سؤال ${index + 1}</strong>
                <span class="question-type">${typeLabel}</span>
            </div>
            <input type="text" class="admin-input" value="${escapeHtml(q.question)}" onchange="updateQuestionText(${index}, this.value)">
            <div class="admin-answers">${answersHtml}</div>
            <div class="admin-actions">
                <button type="button" onclick="addAnswer(${index})" class="add-ans-btn">+ إضافة إجابة</button>
                <button type="button" onclick="toggleQuestionType(${index})" class="toggle-btn">تغيير النوع</button>
                <button type="button" onclick="removeQuestion(${index})" class="remove-btn">حذف السؤال</button>
            </div>
        `;
        container.appendChild(div);
    });

    updateStats();
}

function updateQuestionText(index, text) {
    questions[index].question = text;
    saveQuestions();
}

function updateAnswer(qIndex, aIndex, text) {
    questions[qIndex].answers[aIndex] = text;
    saveQuestions();
}

function setCorrectAnswer(qIndex, aIndex) {
    questions[qIndex].correctIndex = aIndex;
    saveQuestions();
}

function removeAnswer(qIndex, aIndex) {
    if (questions[qIndex].answers.length <= 2) {
        alert("يجب أن يكون هناك إجابتان على الأقل");
        return;
    }
    questions[qIndex].answers.splice(aIndex, 1);
    if (questions[qIndex].correctIndex === aIndex) {
        questions[qIndex].correctIndex = 0;
    } else if (questions[qIndex].correctIndex > aIndex) {
        questions[qIndex].correctIndex--;
    }
    saveQuestions();
    loadAdminQuestions();
}

function addAnswer(qIndex) {
    questions[qIndex].answers.push("إجابة جديدة");
    saveQuestions();
    loadAdminQuestions();
}

function toggleQuestionType(index) {
    const q = questions[index];
    if (q.type === 'multiple') {
        q.type = 'truefalse';
        q.answers = ["صح", "خطأ"];
        q.correctIndex = 0;
    } else {
        q.type = 'multiple';
        q.answers = ["أ) إجابة 1", "ب) إجابة 2", "ج) إجابة 3", "د) إجابة 4"];
        q.correctIndex = 0;
    }
    saveQuestions();
    loadAdminQuestions();
}

function removeQuestion(index) {
    if (confirm("هل أنت متأكد من حذف هذا السؤال؟")) {
        questions.splice(index, 1);
        questions.forEach((q, i) => { q.name = `q${i + 1}`; });
        saveQuestions();
        loadAdminQuestions();
    }
}

function addNewQuestion() {
    const newQ = {
        question: "سؤال جديد",
        answers: ["أ) إجابة 1", "ب) إجابة 2", "ج) إجابة 3", "د) إجابة 4"],
        name: `q${questions.length + 1}`,
        type: "multiple",
        correctIndex: 0
    };
    questions.push(newQ);
    saveQuestions();
    loadAdminQuestions();
}

function saveQuestions() {
    try {
        localStorage.setItem('quizQuestions', JSON.stringify(questions));
        updateCorrectAnswers();
    } catch (e) {
        alert("خطأ في حفظ الأسئلة");
    }
}

function loadAdminResults() {
    const container = document.getElementById('adminResultsList');
    if (!container) return;

    let results = [];
    try {
        const stored = localStorage.getItem('quizResults');
        if (stored) results = JSON.parse(stored);
    } catch (e) {}

    if (results.length === 0) {
        container.innerHTML = '<p class="no-results">لا توجد نتائج مسجلة</p>';
        updateStats();
        return;
    }

    container.innerHTML = results.map((r) => `
        <div class="result-item">
            <div class="result-info">
                <strong>${escapeHtml(r.full_name)}</strong>
                <span>(${escapeHtml(r.username)})</span>
            </div>
            <div class="result-score">
                <span class="score">${r.score}</span> / <span>${r.total}</span>
                <span class="percentage">(${r.percentage}%)</span>
            </div>
            <div class="result-date">${r.date}</div>
        </div>
    `).join('');

    updateStats();
}

function updateStats() {
    const qCount = document.getElementById('questionCount');
    if (qCount) qCount.textContent = questions.length;

    let results = [];
    try {
        const stored = localStorage.getItem('quizResults');
        if (stored) results = JSON.parse(stored);
    } catch (e) {}

    const rCount = document.getElementById('resultsCount');
    if (rCount) rCount.textContent = results.length;

    let avg = 0;
    if (results.length > 0) {
        avg = Math.round(results.reduce((sum, r) => sum + (r.percentage || 0), 0) / results.length);
    }

    const avgEl = document.getElementById('avgScore');
    const avgEl2 = document.getElementById('avgScore2');
    if (avgEl) avgEl.textContent = avg + '%';
    if (avgEl2) avgEl2.textContent = avg + '%';
}

function loadSettingsForm() {
    const timeInput = document.getElementById('timePerQuestion');
    const nameInput = document.getElementById('platformName');
    if (timeInput) timeInput.value = settings.timePerQuestion;
    if (nameInput) nameInput.value = settings.platformName;
}

function saveSettings() {
    const timeInput = document.getElementById('timePerQuestion');
    const nameInput = document.getElementById('platformName');

    if (timeInput) settings.timePerQuestion = parseFloat(timeInput.value) || 1;
    if (nameInput) settings.platformName = nameInput.value || "منصة الاختبارات الرقمية";

    try {
        localStorage.setItem('quizSettings', JSON.stringify(settings));
        alert('تم حفظ الإعدادات');
    } catch (e) {
        alert('خطأ في حفظ الإعدادات');
    }
}

function startQuiz() {
    loadQuestions();
    loadSettings();

    if (questions.length === 0) {
        alert("لا توجد أسئلة متاحة");
        return;
    }

    showPage('quizPage');

    answeredQuestions = Array(questions.length).fill(false);
    answers = Array(questions.length).fill(null);
    currentQuestion = 0;
    timer = questions.length * settings.timePerQuestion * 60;

    renderQuestion();
    startTimer();
}

function startTimer() {
    clearInterval(interval);
    interval = setInterval(function() {
        const minutes = Math.floor(timer / 60);
        const seconds = timer % 60;
        const timerEl = document.getElementById('timer');
        if (timerEl) {
            timerEl.innerHTML = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
            if (timer <= 60) timerEl.style.background = '#f8d7da';
        }
        timer--;
        if (timer < 0) {
            clearInterval(interval);
            alert("انتهى الوقت");
            submitExam();
        }
    }, 1000);
}

function renderQuestion() {
    const questionContainer = document.getElementById("questionContainer");
    if (!questionContainer) return;

    const question = questions[currentQuestion];
    if (!question) return;

    let answersHtml = '';
    question.answers.forEach((answer, index) => {
        const isSelected = answers[currentQuestion] === answer;
        const escapedAnswer = answer.replace(/'/g, "\'").replace(/"/g, '&quot;');
        answersHtml += `
            <label class="answer-label ${isSelected ? 'selected' : ''}">
                <input type="radio" name="${question.name}" value="${escapeHtml(answer)}" ${isSelected ? 'checked' : ''} onclick="markAnswered(${currentQuestion}, '${escapedAnswer}')"> 
                <span>${escapeHtml(answer)}</span>
            </label>
        `;
    });

    questionContainer.innerHTML = `
        <div class="question">${escapeHtml(question.question)}</div>
        <div class="answers">${answersHtml}</div>
    `;

    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    if (prevBtn) prevBtn.disabled = currentQuestion === 0;
    if (nextBtn) nextBtn.disabled = currentQuestion === questions.length - 1;

    updateQuestionStatus();
}

function changeQuestion(direction) {
    currentQuestion += direction;
    if (currentQuestion < 0) currentQuestion = 0;
    if (currentQuestion >= questions.length) currentQuestion = questions.length - 1;
    renderQuestion();
}

function markAnswered(questionIndex, selectedAnswer) {
    answeredQuestions[questionIndex] = true;
    answers[questionIndex] = selectedAnswer;
    updateQuestionStatus();
    renderQuestion();
}

function updateQuestionStatus() {
    const questionTable = document.getElementById("questionTable");
    if (!questionTable) return;

    questionTable.innerHTML = '';
    answeredQuestions.forEach((answered, index) => {
        const questionItem = document.createElement('div');
        questionItem.classList.add(answered ? 'answered' : 'not-answered');
        questionItem.textContent = index + 1;
        questionItem.onclick = () => {
            currentQuestion = index;
            renderQuestion();
        };
        questionTable.appendChild(questionItem);
    });

    const submitBtn = document.getElementById("submitBtn");
    if (submitBtn) {
        submitBtn.disabled = !answeredQuestions.every(Boolean);
    }
}

function submitExam() {
    const usernameInput = document.getElementById('username');
    const fullNameInput = document.getElementById('full_name');

    const username = usernameInput ? usernameInput.value : '';
    const full_name = fullNameInput ? fullNameInput.value : '';

    updateCorrectAnswers();

    let score = 0;
    let details = [];

    questions.forEach((q, index) => {
        const userAnswer = answers[index];
        const correctAnswer = correctAnswers[q.name];
        const isCorrect = userAnswer === correctAnswer;
        if (isCorrect) score++;

        details.push({
            question: q.question,
            userAnswer: userAnswer,
            correctAnswer: correctAnswer,
            isCorrect: isCorrect
        });
    });

    const total = questions.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

    let results = [];
    try {
        const stored = localStorage.getItem('quizResults');
        if (stored) results = JSON.parse(stored);
    } catch (e) {}

    results.push({
        username: username,
        full_name: full_name,
        score: score,
        total: total,
        percentage: percentage,
        date: new Date().toLocaleString('ar-EG'),
        answers: answers
    });

    try {
        localStorage.setItem('quizResults', JSON.stringify(results));
    } catch (e) {
        alert('خطأ في حفظ النتيجة');
    }

    showResults(full_name, username, score, total, percentage, details);
}

function showResults(name, number, score, total, percentage, details) {
    clearInterval(interval);
    showPage('resultPage');

    const resultName = document.getElementById('resultName');
    const resultNumber = document.getElementById('resultNumber');
    const resultScore = document.getElementById('resultScore');
    const resultTotal = document.getElementById('resultTotal');
    const resultMessage = document.getElementById('resultMessage');

    if (resultName) resultName.textContent = name;
    if (resultNumber) resultNumber.textContent = number;
    if (resultScore) resultScore.textContent = score;
    if (resultTotal) resultTotal.textContent = total;

    let message = '';
    if (percentage >= 90) message = 'ممتاز! أداء رائع جداً';
    else if (percentage >= 75) message = 'جيد جداً! استمر في التقدم';
    else if (percentage >= 60) message = 'جيد! يمكنك التحسن أكثر';
    else message = 'يحتاج لمزيد من المراجعة';

    if (resultMessage) resultMessage.textContent = message;

    const detailsContainer = document.getElementById('resultDetails');
    if (detailsContainer) {
        detailsContainer.innerHTML = `
            <h3>تفاصيل الإجابات:</h3>
            <div class="details-list">
                ${details.map((d, i) => `
                    <div class="detail-item ${d.isCorrect ? 'correct' : 'wrong'}">
                        <div class="detail-question">${i + 1}. ${escapeHtml(d.question)}</div>
                        <div class="detail-answers">
                            <span class="user-ans">إجابتك: ${d.userAnswer ? escapeHtml(d.userAnswer) : 'لم تجب'}</span>
                            ${!d.isCorrect ? `<span class="correct-ans">الصحيحة: ${escapeHtml(d.correctAnswer)}</span>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

function handleKeyboard(e) {
    const quizPage = document.getElementById('quizPage');
    if (quizPage && quizPage.style.display === 'block') {
        if (e.key === 'ArrowRight') changeQuestion(1);
        if (e.key === 'ArrowLeft') changeQuestion(-1);
    }
}

function addTouchSupport() {
    let touchStartX = 0;

    document.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    document.addEventListener('touchend', e => {
        const touchEndX = e.changedTouches[0].screenX;
        const quizPage = document.getElementById('quizPage');
        if (!quizPage || quizPage.style.display !== 'block') return;

        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 50) {
            if (diff > 0) changeQuestion(1);
            else changeQuestion(-1);
        }
    }, { passive: true });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', init);
