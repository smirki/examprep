document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/exams')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load exams');
            return response.json();
        })
        .then(exams => {
            const examCardsContainer = document.getElementById('exam-cards');
            exams.forEach(exam => {
                const card = document.createElement('div');
                card.classList.add('col-md-4');
                card.innerHTML = `
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">${exam.name}</h5>
                            <p>Questions: ${exam.questionCount}</p>
                            <a href="exam.html?id=${exam.id}" class="btn btn-primary">Open</a>
                        </div>
                    </div>
                `;
                examCardsContainer.appendChild(card);
            });
        })
        .catch(error => {
            console.error('Error loading exams:', error);
        });
});
