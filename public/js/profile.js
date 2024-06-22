import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, query, where, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { firebaseConfig } from "./firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.getElementById('logout-button');

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await fetchUserStats(user);
        } else {
            window.location.href = 'login.html';
        }
    });

    logoutButton.addEventListener('click', () => {
        signOut(auth).then(() => {
            alert('User logged out successfully!');
            window.location.href = 'login.html';
        }).catch((error) => {
            alert(`Error: ${error.message}`);
        });
    });
});

async function fetchUserStats(user) {
    const sessionsRef = collection(db, 'users', user.uid, 'sessions');
    const sessionsSnapshot = await getDocs(query(sessionsRef));
    const userStatsContainer = document.getElementById('user-stats');
    const sessionData = [];
    userStatsContainer.innerHTML = '';
    sessionsSnapshot.forEach(doc => {
        const session = doc.data();
        const sessionDiv = document.createElement('div');
        sessionDiv.classList.add('card', 'mb-3');
        sessionDiv.innerHTML = `
            <div class="card-body">
                <h5 class="card-title">${session.examId}</h5>
                <p class="card-text">Start Time: ${new Date(session.startTime.toDate()).toLocaleString()}</p>
                <p class="card-text">End Time: ${session.endTime ? new Date(session.endTime.toDate()).toLocaleString() : 'In Progress'}</p>
                <p class="card-text">Correct Answers: ${session.correctAnswers}</p>
                <p class="card-text">Total Questions: ${session.totalQuestions}</p>
                <p class="card-text" style="color: ${session.correctAnswers / session.totalQuestions < 0.5 ? 'red' : 'black'};">
                    Score: ${((session.correctAnswers / session.totalQuestions) * 100).toFixed(2)}%
                </p>
            </div>
        `;
        userStatsContainer.appendChild(sessionDiv);
        sessionData.push({
            date: session.startTime.toDate(),
            correctAnswers: session.correctAnswers,
            totalQuestions: session.totalQuestions
        });
    });
    renderChart(sessionData);
}

function renderChart(sessionData) {
    const ctx = document.getElementById('myChart').getContext('2d');
    const dates = sessionData.map(session => session.date);
    const correctAnswers = sessionData.map(session => session.correctAnswers);
    const totalQuestions = sessionData.map(session => session.totalQuestions);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Correct Answers',
                    data: correctAnswers,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Total Questions',
                    data: totalQuestions,
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day'
                    }
                },
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}
