import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, setDoc, collection, addDoc, increment, arrayUnion } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { firebaseConfig } from "./firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let sessionId;
let sessionStartTime;
let correctAnswers = 0;
let totalQuestions = 0;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const examId = urlParams.get('id');
    const userUpvotes = new Set();

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            sessionStartTime = new Date();
            const sessionRef = await addDoc(collection(db, 'users', user.uid, 'sessions'), {
                examId,
                startTime: sessionStartTime,
                endTime: null,
                correctAnswers: 0,
                totalQuestions: 0,
                questions: []
            });
            sessionId = sessionRef.id;
        } else {
            window.location.href = 'login.html';
        }
    });

    document.getElementById('end-exam').addEventListener('click', async () => {
        await endSession();
        window.location.href = 'index.html';
    });

    window.addEventListener('beforeunload', async (event) => {
        event.preventDefault();
        await endSession();
    });

    async function endSession() {
        if (sessionId) {
            const sessionEndTime = new Date();
            await updateDoc(doc(db, 'users', auth.currentUser.uid, 'sessions', sessionId), {
                endTime: sessionEndTime
            });
        }
    }

    loadQuestions(examId).then(questions => {
        let currentQuestionIndex = 0;
        let askAgainQuestions = [];

        async function showQuestion() {
            if (currentQuestionIndex < questions.length) {
                const question = questions[currentQuestionIndex];
                const questionContainer = document.getElementById('question-container');
                const userStats = await getUserQuestionStats(auth.currentUser.uid, question.id);
        
                questionContainer.innerHTML = `
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">Question ${currentQuestionIndex + 1}</h5>
                            <p class="card-text">${question.question}</p>
                            <p class="card-text">${userStats.attempts > 0 ? `${userStats.correct}/${userStats.attempts} attempts succeeded` : 'You have not attempted this question'}</p>
                            <input type="text" id="user-answer" class="form-control" placeholder="Your answer">
                            <button class="btn btn-primary mt-3" id="submit-answer">Submit</button>
                            <button class="btn btn-secondary mt-3" id="ask-again-later">Ask Again Later</button>
                            <div class="mt-3">
                                <button class="btn btn-success" id="upvote">Upvote (${question.upvotes || 0})</button>
                                <button class="btn btn-danger" id="downvote">Downvote (${question.downvotes || 0})</button>
                                <button class="btn btn-warning" id="report">Report</button>
                            </div>
                            <div id="report-reason-container" class="mt-3" style="display: none;">
                                <label for="report-reason">Reason for reporting:</label>
                                <input type="text" id="report-reason" class="form-control">
                                <button class="btn btn-warning mt-2" id="submit-report-reason">Submit Report</button>
                            </div>
                            <div id="feedback-container" class="mt-3" style="display: none;">
                                <p id="feedback-message" class="text-danger"></p>
                                <p id="correct-answer" class="text-success"></p>
                            </div>
                        </div>
                    </div>
                `;
        
                const userAnswerInput = document.getElementById('user-answer');
                userAnswerInput.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter') {
                        submitAnswer();
                    }
                });
        
                document.getElementById('submit-answer').addEventListener('click', submitAnswer);
        
                async function submitAnswer() {
                    const userAnswer = document.getElementById('user-answer').value;
                    const feedbackContainer = document.getElementById('feedback-container');
                    const feedbackMessage = document.getElementById('feedback-message');
                    const correctAnswerDisplay = document.getElementById('correct-answer');
        
                    totalQuestions++;
        
                    const isCorrect = evaluateAnswer(userAnswer, question.answer);
                    if (isCorrect) {
                        feedbackMessage.textContent = 'Correct!';
                        feedbackMessage.classList.remove('text-danger');
                        feedbackMessage.classList.add('text-success');
                        correctAnswerDisplay.textContent = '';
                        correctAnswers++;
                    } else {
                        feedbackMessage.textContent = 'Incorrect. Try again.';
                        feedbackMessage.classList.remove('text-success');
                        feedbackMessage.classList.add('text-danger');
                        correctAnswerDisplay.textContent = `The correct answer is: ${question.answer}`;
                        askAgainQuestions.push(question);
                    }
        
                    await updateUserQuestionStats(auth.currentUser.uid, question.id, isCorrect);
        
                    await updateDoc(doc(db, 'users', auth.currentUser.uid, 'sessions', sessionId), {
                        correctAnswers,
                        totalQuestions,
                        questions: arrayUnion({
                            question: question.question,
                            userAnswer,
                            correct: isCorrect
                        })
                    });
        
                    await updateDoc(doc(db, 'questions', question.id), {
                        attempts: increment(1)
                    });
        
                    feedbackContainer.style.display = 'block';
                    currentQuestionIndex++;
                    setTimeout(() => {
                        feedbackContainer.style.display = 'none';
                        showQuestion();
                    }, 2000);
                }
        
                document.getElementById('ask-again-later').addEventListener('click', () => {
                    askAgainQuestions.push(question);
                    currentQuestionIndex++;
                    showQuestion();
                });
        
                document.getElementById('upvote').addEventListener('click', async () => {
                    if (!userUpvotes.has(question.question)) {
                        question.upvotes = (question.upvotes || 0) + 1;
                        await updateDoc(doc(db, 'questions', question.id), {
                            upvotes: increment(1)
                        });
                        userUpvotes.add(question.question);
                        showQuestion();
                    } else {
                        alert('You can only upvote once.');
                    }
                });
        
                document.getElementById('downvote').addEventListener('click', async () => {
                    question.downvotes = (question.downvotes || 0) + 1;
                    await updateDoc(doc(db, 'questions', question.id), {
                        downvotes: increment(1)
                    });
                    showQuestion();
                });
        
                document.getElementById('report').addEventListener('click', () => {
                    document.getElementById('report-reason-container').style.display = 'block';
                });
        
                document.getElementById('submit-report-reason').addEventListener('click', async () => {
                    const reason = document.getElementById('report-reason').value;
                    if (reason) {
                        await updateDoc(doc(db, 'reports', question.question), {
                            reasons: arrayUnion(reason),
                            count: increment(1)
                        });
                        alert('Question reported.');
                        document.getElementById('report-reason-container').style.display = 'none';
                    } else {
                        alert('Please enter a reason for reporting.');
                    }
                });
            } else if (askAgainQuestions.length > 0) {
                questions = askAgainQuestions;
                askAgainQuestions = [];
                currentQuestionIndex = 0;
                showQuestion();
            } else {
                document.getElementById('question-container').innerHTML = `
                    <h3>All questions completed!</h3>
                    <a href="index.html" class="btn btn-primary">Back to Main Menu</a>
                `;
        
                await endSession();
            }
        }
        showQuestion();
        
    });
});

async function loadQuestions(examId) {
    const questionsSnapshot = await getDocs(collection(db, 'questions'));
    const questions = [];
    questionsSnapshot.forEach(doc => {
        if (doc.data().examId === examId) {
            questions.push({ id: doc.id, ...doc.data() });
        }
    });
    return questions;
}

async function getUserQuestionStats(userId, questionId) {
    const userQuestionStatsRef = doc(db, 'users', userId, 'questionStats', questionId);
    const userQuestionStatsDoc = await getDoc(userQuestionStatsRef);
    if (userQuestionStatsDoc.exists()) {
        return userQuestionStatsDoc.data();
    } else {
        return { attempts: 0, correct: 0, incorrect: 0 };
    }
}

async function updateUserQuestionStats(userId, questionId, isCorrect) {
    const userQuestionStatsRef = doc(db, 'users', userId, 'questionStats', questionId);
    const userQuestionStatsDoc = await getDoc(userQuestionStatsRef);
    if (userQuestionStatsDoc.exists()) {
        const stats = userQuestionStatsDoc.data();
        await updateDoc(userQuestionStatsRef, {
            attempts: increment(1),
            correct: isCorrect ? increment(1) : stats.correct,
            incorrect: isCorrect ? stats.incorrect : increment(1)
        });
    } else {
        await setDoc(userQuestionStatsRef, {
            attempts: 1,
            correct: isCorrect ? 1 : 0,
            incorrect: isCorrect ? 0 : 1
        });
    }
}

function evaluateAnswer(userAnswer, correctAnswer) {
    const userWords = userAnswer.toLowerCase().split(' ');
    const correctWords = correctAnswer.toLowerCase().split(' ');
    const commonWords = userWords.filter(word => correctWords.includes(word));
    return (commonWords.length / correctWords.length) >= 0.5;
}
