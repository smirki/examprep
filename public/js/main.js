import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { firebaseConfig } from "./firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
    const authLinks = document.getElementById('auth-links');
    const userEmailContainer = document.getElementById('user-email');
    const logoutButton = document.getElementById('logout-button');

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            authLinks.classList.add('d-none');
            userEmailContainer.textContent = user.email;
            userEmailContainer.classList.remove('d-none');
            logoutButton.classList.remove('d-none');
            await fetchUserStats(user);
        } else {
            authLinks.classList.remove('d-none');
            userEmailContainer.classList.add('d-none');
            logoutButton.classList.add('d-none');
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

    fetchExams();
    fetchUpdates();
});

async function fetchExams() {
    const examsCol = collection(db, 'exams');
    const examSnapshot = await getDocs(examsCol);
    const exams = examSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const examCardsContainer = document.getElementById('exam-cards');
    examCardsContainer.innerHTML = '';
    for (const exam of exams) {
        const questionsSnapshot = await getDocs(query(collection(db, 'questions'), where('examId', '==', exam.id)));
        const questionCount = questionsSnapshot.size;
        const card = document.createElement('div');
        card.classList.add('col-md-4');
        card.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">${exam.name}</h5>
                    <p>Questions: ${questionCount}</p>
                    <a href="exam.html?id=${exam.id}" class="btn btn-primary">Open</a>
                </div>
            </div>
        `;
        card.querySelector('.btn-primary').addEventListener('click', (e) => {
            if (!auth.currentUser) {
                e.preventDefault();
                window.location.href = 'login.html';
            }
        });
        examCardsContainer.appendChild(card);
    }
}

async function fetchUpdates() {
    const updatesCol = collection(db, 'updates');
    const updatesSnapshot = await getDocs(updatesCol);
    const updatesList = document.getElementById('updates-list');
    updatesList.innerHTML = '';
    updatesSnapshot.forEach(doc => {
        const update = doc.data();
        const li = document.createElement('li');
        li.textContent = `${update.date}: ${update.description}`;
        updatesList.appendChild(li);
    });
}

async function fetchUserStats(user) {
    const userStatsRef = collection(db, 'userStats');
    const userStatsSnapshot = await getDocs(query(userStatsRef, where('userId', '==', user.uid)));
    userStatsSnapshot.forEach(doc => {
        const stats = doc.data();
        console.log('User Stats:', stats); // Display stats or integrate into UI as needed
    });
}


