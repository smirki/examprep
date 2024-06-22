import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, setDoc, collection, addDoc, increment } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
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
            const sessionRef = await addDoc(collection(db, 'sessions'), {
                userId: user.uid,
                examId,
                startTime: sessionStartTime,
                endTime: null,
                correctAnswers: 0,
                totalQuestions: 0
            });
            sessionId = sessionRef.id;
        } else {
            window.location.href = 'login.html';
        }
    });

    document.getElementById('end-exam').addEventListener('click', async () => {
        const sessionEndTime = new Date();
        await updateDoc(doc(db, 'sessions', sessionId), {
            endTime: sessionEndTime
        });
        const sessionData = {
            userId: auth.currentUser.uid,
            session: {
                examId,
                startTime: sessionStartTime,
                endTime: sessionEndTime,
                correctAnswers,
                totalQuestions
            }
        };
        await fetch('/api/session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sessionData)
        });
        window.location.href = 'index.html';
    });

    window.addEventListener('beforeunload', async (event) => {
        event.preventDefault();
        if (sessionId) {
            const sessionEndTime = new Date();
            await updateDoc(doc(db, 'sessions', sessionId), {
                endTime: sessionEndTime
            });
            const sessionData = {
                userId: auth.currentUser.uid,
                session: {
                    examId,
                    startTime: sessionStartTime,
                    endTime: sessionEndTime,
                    correctAnswers,
                    totalQuestions
                }
            };
            await fetch('/api/session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(sessionData)
            });
        }
    });
    
    

    loadQuestions(examId).then(questions => {
        let currentQuestionIndex = 0;
        let askAgainQuestions = [];

        async function showQuestion() {
            if (currentQuestionIndex < questions.length) {
                const question = questions[currentQuestionIndex];
                const questionContainer = document.getElementById('question-container');
                questionContainer.innerHTML = `
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">Question ${currentQuestionIndex + 1}</h5>
                            <p class="card-text">${question.question}</p>
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

                    if (evaluateAnswer(userAnswer, question.answer)) {
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

                    await updateDoc(doc(db, 'sessions', sessionId), {
                        correctAnswers,
                        totalQuestions,
                        [`questions.${currentQuestionIndex}`]: {
                            question: question.question,
                            correct: evaluateAnswer(userAnswer, question.answer)
                        }
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

                const sessionEndTime = new Date();
                await updateDoc(doc(db, 'sessions', sessionId), {
                    endTime: sessionEndTime
                });
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

function evaluateAnswer(userAnswer, correctAnswer) {
    const userWords = userAnswer.toLowerCase().split(' ');
    const correctWords = correctAnswer.toLowerCase().split(' ');
    const commonWords = userWords.filter(word => correctWords.includes(word));
    return (commonWords.length / correctWords.length) >= 0.5;
}


