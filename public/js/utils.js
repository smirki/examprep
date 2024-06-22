function loadQuestions(examId) {
    return fetch(`/api/questions/${examId}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to load questions');
            return response.json();
        });
}

function saveQuestion(examId, question) {
    return fetch(`/api/questions/${examId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(question)
    }).then(response => {
        if (!response.ok) throw new Error('Failed to save question');
        return response.text();
    });
}

function updateQuestion(examId, updatedQuestion) {
    return fetch(`/api/questions/${examId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedQuestion)
    }).then(response => {
        if (!response.ok) throw new Error('Failed to update question');
        return response.text();
    });
}

function reportQuestion(question) {
    return fetch(`/api/reports`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(question)
    }).then(response => {
        if (!response.ok) throw new Error('Failed to report question');
        return response.text();
    });
}

function evaluateAnswer(userAnswer, correctAnswer) {
    const userWords = userAnswer.toLowerCase().split(' ');
    const correctWords = correctAnswer.toLowerCase().split(' ');
    const commonWords = userWords.filter(word => correctWords.includes(word));
    return (commonWords.length / correctWords.length) >= 0.5;
}


