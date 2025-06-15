// 系統數據
let vocabulary = JSON.parse(localStorage.getItem("vocabulary")) || [];
let students = JSON.parse(localStorage.getItem("students")) || {};

// DOM元素
const teacherModeBtn = document.getElementById("teacherModeBtn");
const studentModeBtn = document.getElementById("studentModeBtn");
const teacherPanel = document.getElementById("teacherPanel");
const studentPanel = document.getElementById("studentPanel");

// 老師模式元素
const batchWordsInput = document.getElementById("batchWords");
const addBatchBtn = document.getElementById("addBatchBtn");
const wordTableBody = document.getElementById("wordTableBody");
const mistakesContainer = document.getElementById("mistakesContainer");

// 學生模式元素
const studentNameInput = document.getElementById("studentName");
const loginBtn = document.getElementById("loginBtn");
const studentQuiz = document.getElementById("studentQuiz");
const startQuizBtn = document.getElementById("startQuizBtn");
const quizContainer = document.getElementById("quizContainer");
const quizQuestion = document.getElementById("quizQuestion");
const quizAnswer = document.getElementById("quizAnswer");
const submitAnswerBtn = document.getElementById("submitAnswerBtn");
const quizFeedback = document.getElementById("quizFeedback");
const quizResult = document.getElementById("quizResult");
const resultMessage = document.getElementById("resultMessage");
const restartQuizBtn = document.getElementById("restartQuizBtn");
const quizProgress = document.getElementById("quizProgress");

// 當前狀態
let currentStudent = null;
let currentMode = null;
let quizWords = [];
let currentQuizIndex = 0;
let mistakesDuringQuiz = [];

// 初始化
function init() {
  updateVocabularyTable();
  updateMistakesDisplay();

  // 模式切換
  teacherModeBtn.addEventListener("click", () => {
    teacherPanel.classList.add("active");
    studentPanel.classList.remove("active");
  });

  studentModeBtn.addEventListener("click", () => {
    teacherPanel.classList.add("active");
    studentPanel.classList.add("active");
    teacherPanel.classList.remove("active");
  });

  // 老師功能
  addBatchBtn.addEventListener("click", addBatchVocabulary);

  // 學生功能
  loginBtn.addEventListener("click", studentLogin);
  startQuizBtn.addEventListener("click", startQuiz);
  submitAnswerBtn.addEventListener("click", checkAnswer);
  restartQuizBtn.addEventListener("click", restartQuiz);

  // 默認顯示老師模式
  teacherPanel.classList.add("active");
}

// 批量添加單字
function addBatchVocabulary() {
  const batchInput = batchWordsInput.value.trim();

  if (!batchInput) {
    alert("請輸入要添加的單字！");
    return;
  }

  const lines = batchInput.split("\n");
  let addedCount = 0;
  let duplicateCount = 0;
  let invalidCount = 0;

  lines.forEach((line) => {
    // 支持多種分隔符：=、: 或空格
    const parts = line.split(/[=:]/).map((part) => part.trim());
    if (parts.length >= 2) {
      const english = parts[0];
      const chinese = parts[1];

      if (english && chinese) {
        // 檢查是否已存在
        const exists = vocabulary.some(
          (word) =>
            word.english.toLowerCase() === english.toLowerCase() ||
            word.chinese === chinese
        );

        if (!exists) {
          vocabulary.push({ english, chinese });
          addedCount++;
        } else {
          duplicateCount++;
        }
      } else {
        invalidCount++;
      }
    } else {
      invalidCount++;
    }
  });

  if (addedCount > 0) {
    saveData();
    updateVocabularyTable();
  }

  let message = "";
  if (addedCount > 0) message += `成功添加 ${addedCount} 個單字！\n`;
  if (duplicateCount > 0)
    message += `跳過 ${duplicateCount} 個已存在的單字。\n`;
  if (invalidCount > 0) message += `忽略 ${invalidCount} 行無效格式。`;

  alert(message || "沒有有效的單字被添加。");
  batchWordsInput.value = "";
}

// 更新單字表格
function updateVocabularyTable() {
  wordTableBody.innerHTML = "";

  vocabulary.forEach((word, index) => {
    const row = document.createElement("tr");

    const englishCell = document.createElement("td");
    englishCell.textContent = word.english;

    const chineseCell = document.createElement("td");
    chineseCell.textContent = word.chinese;

    const actionCell = document.createElement("td");
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "刪除";
    deleteBtn.classList.add("delete-btn");
    deleteBtn.addEventListener("click", () => deleteWord(index));

    actionCell.appendChild(deleteBtn);

    row.appendChild(englishCell);
    row.appendChild(chineseCell);
    row.appendChild(actionCell);

    wordTableBody.appendChild(row);
  });
}

// 刪除單字
function deleteWord(index) {
  if (confirm("確定要刪除這個單字嗎？")) {
    vocabulary.splice(index, 1);
    saveData();
    updateVocabularyTable();

    // 從所有學生的錯題中移除這個單字
    for (const studentName in students) {
      students[studentName].mistakes = students[studentName].mistakes.filter(
        (i) => i !== index
      );
    }
    saveData();
    updateMistakesDisplay();
  }
}

// 學生登入
function studentLogin() {
  const studentName = studentNameInput.value.trim();

  if (!studentName) {
    alert("請輸入姓名！");
    return;
  }

  currentStudent = studentName;

  // 初始化學生記錄
  if (!students[studentName]) {
    students[studentName] = {
      mistakes: [],
      history: []
    };
    saveData();
  }

  studentNameInput.value = "";
  document.getElementById("studentLogin").classList.add("hidden");
  studentQuiz.classList.remove("hidden");
}

// 開始測驗
function startQuiz() {
  currentMode = document.querySelector('input[name="quizMode"]:checked').value;
  quizWords = [];
  currentQuizIndex = 0;
  mistakesDuringQuiz = [];

  // 先複習錯題
  const mistakeIndices = students[currentStudent].mistakes;
  if (mistakeIndices && mistakeIndices.length > 0) {
    quizWords = mistakeIndices.map((index) => ({
      word: vocabulary[index],
      originalIndex: index
    }));

    alert(`將複習 ${quizWords.length} 個錯題`);
  } else {
    // 沒有錯題，測驗所有單字
    quizWords = vocabulary.map((word, index) => ({
      word,
      originalIndex: index
    }));
  }

  // 隨機排序
  quizWords = shuffleArray(quizWords);

  // 開始測驗
  quizContainer.classList.remove("hidden");
  startQuizBtn.classList.add("hidden");
  showNextQuestion();
}

// 顯示下一個問題
function showNextQuestion() {
  if (currentQuizIndex >= quizWords.length) {
    // 測驗結束
    finishQuiz();
    return;
  }

  const currentWord = quizWords[currentQuizIndex].word;
  const originalIndex = quizWords[currentQuizIndex].originalIndex;

  if (currentMode === "chiToEng") {
    quizQuestion.textContent = currentWord.chinese;
  } else {
    quizQuestion.textContent = currentWord.english;
  }

  quizProgress.textContent = `進度: ${currentQuizIndex + 1}/${
    quizWords.length
  }`;
  quizAnswer.value = "";
  quizFeedback.textContent = "";
  quizAnswer.focus();
}

// 檢查答案
function checkAnswer() {
  const currentWord = quizWords[currentQuizIndex].word;
  const originalIndex = quizWords[currentQuizIndex].originalIndex;
  const userAnswer = quizAnswer.value.trim();

  let correctAnswer, isCorrect;

  if (currentMode === "chiToEng") {
    correctAnswer = currentWord.english;
    isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
  } else {
    correctAnswer = currentWord.chinese;
    isCorrect = userAnswer === correctAnswer;
  }

  if (isCorrect) {
    quizFeedback.textContent = "正確！";
    quizFeedback.style.color = "#2ecc71";

    // 如果是錯題且答對，從錯題中移除
    const mistakeIndex = students[currentStudent].mistakes.indexOf(
      originalIndex
    );
    if (mistakeIndex !== -1) {
      students[currentStudent].mistakes.splice(mistakeIndex, 1);
      saveData();
      updateMistakesDisplay();
    }
  } else {
    quizFeedback.innerHTML = `錯誤！正確答案是: <span class="correct-answer">${correctAnswer}</span>`;
    quizFeedback.style.color = "#e74c3c";

    // 如果是新題且答錯，加入錯題
    if (!students[currentStudent].mistakes.includes(originalIndex)) {
      students[currentStudent].mistakes.push(originalIndex);
      mistakesDuringQuiz.push(currentWord);
      saveData();
      updateMistakesDisplay();
    }
  }

  currentQuizIndex++;
  setTimeout(showNextQuestion, 1500);
}

// 完成測驗
function finishQuiz() {
  quizContainer.classList.add("hidden");
  quizResult.classList.remove("hidden");

  if (mistakesDuringQuiz.length === 0) {
    resultMessage.innerHTML = "<p>恭喜！您已經掌握所有單字！</p>";
  } else {
    resultMessage.innerHTML = `
            <p>測驗完成！您有 ${mistakesDuringQuiz.length} 個單字需要加強：</p>
            <ul>
                ${mistakesDuringQuiz
                  .map(
                    (word) =>
                      `<li><span class="mistake-word">${word.english}</span> - ${word.chinese}</li>`
                  )
                  .join("")}
            </ul>
        `;
  }
}

// 重新測驗
function restartQuiz() {
  quizResult.classList.add("hidden");
  startQuizBtn.classList.remove("hidden");
}

// 更新錯題顯示
function updateMistakesDisplay() {
  mistakesContainer.innerHTML = "";

  for (const studentName in students) {
    if (students[studentName].mistakes.length === 0) continue;

    const studentDiv = document.createElement("div");
    studentDiv.className = "student-mistake-item";

    const title = document.createElement("h4");
    title.textContent = studentName;

    const mistakeList = document.createElement("ul");

    students[studentName].mistakes.forEach((index) => {
      const word = vocabulary[index];
      if (!word) return;

      const item = document.createElement("li");
      item.innerHTML = `
                <span class="mistake-word">${word.english}</span> - ${word.chinese}
            `;
      mistakeList.appendChild(item);
    });

    studentDiv.appendChild(title);
    studentDiv.appendChild(mistakeList);
    mistakesContainer.appendChild(studentDiv);
  }

  if (mistakesContainer.children.length === 0) {
    mistakesContainer.innerHTML = "<p>目前沒有錯題記錄</p>";
  }
}

// 保存數據到localStorage
function saveData() {
  localStorage.setItem("vocabulary", JSON.stringify(vocabulary));
  localStorage.setItem("students", JSON.stringify(students));
}

// 輔助函數：隨機排序數組
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// 初始化應用
init();
