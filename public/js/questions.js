document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const examId = urlParams.get('id');

    document.getElementById('add-question').addEventListener('click', () => {
        window.location.href = `add-question.html?id=${examId}`;
    });

    document.getElementById('practice').addEventListener('click', () => {
        window.location.href = `practice.html?id=${examId}`;
    });
});


