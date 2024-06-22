document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const examId = urlParams.get('id');
    const userUpvotes = new Set();

    loadQuestions(examId).then(questions => {
        let currentQuestionIndex = 0;
        let askAgainQuestions = [];

        function showQuestion() {
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
                                <button class="btn btn-success" id="upvote">Upvote (${question.upvotes})</button>
                                <button class="btn btn-danger" id="downvote">Downvote (${question.downvotes})</button>
                                <button class="btn btn-warning" id="report">Report</button>
                            </div>
                            <div id="report-reason-container" class="mt-3" style="display: none;">
                                <label for="report-reason">Reason for reporting:</label>
                                <input type="text" id="report-reason" class="form-control">
                                <button class="btn btn-warning mt-2" id="submit-report-reason">Submit Report</button>
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

                function submitAnswer() {
                    const userAnswer = document.getElementById('user-answer').value;
                    if (evaluateAnswer(userAnswer, question.answer)) {
                        alert('Correct!');
                    } else {
                        alert('Incorrect. Try again.');
                        askAgainQuestions.push(question);
                    }
                    currentQuestionIndex++;
                    showQuestion();
                }

                document.getElementById('ask-again-later').addEventListener('click', () => {
                    askAgainQuestions.push(question);
                    currentQuestionIndex++;
                    showQuestion();
                });

                document.getElementById('upvote').addEventListener('click', () => {
                    if (!userUpvotes.has(question.question)) {
                        question.upvotes++;
                        updateQuestion(examId, question).then(() => {
                            userUpvotes.add(question.question);
                            showQuestion();
                        });
                    } else {
                        alert('You can only upvote once.');
                    }
                });

                document.getElementById('downvote').addEventListener('click', () => {
                    question.downvotes++;
                    updateQuestion(examId, question).then(() => {
                        showQuestion();
                    });
                });

                document.getElementById('report').addEventListener('click', () => {
                    document.getElementById('report-reason-container').style.display = 'block';
                });

                document.getElementById('submit-report-reason').addEventListener('click', () => {
                    const reason = document.getElementById('report-reason').value;
                    if (reason) {
                        reportQuestion({ question: question.question, reason }).then(() => {
                            alert('Question reported.');
                            document.getElementById('report-reason-container').style.display = 'none';
                        });
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
            }
        }
        showQuestion();
    });
});
