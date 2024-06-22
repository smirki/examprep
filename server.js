const express = require('express');
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const app = express();
const PORT = process.env.PORT || 3008;

app.use(express.static('public'));
app.use(express.json());

// Serve HTML files
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Load exams data and question counts
app.get('/api/exams', async (req, res) => {
    try {
        const examsSnapshot = await db.collection('exams').get();
        const exams = [];
        for (const doc of examsSnapshot.docs) {
            const questionsSnapshot = await db.collection('questions').where('examId', '==', doc.id).get();
            exams.push({
                id: doc.id,
                name: doc.data().name,
                questionCount: questionsSnapshot.size
            });
        }
        res.send(exams);
    } catch (error) {
        console.error('Error fetching exams:', error);
        res.status(500).send('Error fetching exams.');
    }
});

// Load questions for an exam
app.get('/api/questions/:examId', async (req, res) => {
    const examId = req.params.examId;
    try {
        const questionsSnapshot = await db.collection('questions').where('examId', '==', examId).get();
        const questions = [];
        questionsSnapshot.forEach(doc => questions.push({ id: doc.id, ...doc.data() }));
        res.send(questions);
    } catch (error) {
        console.error('Error fetching questions:', error);
        res.status(500).send('Error fetching questions.');
    }
});

// Save a new question
app.post('/api/questions/:examId', async (req, res) => {
    const examId = req.params.examId;
    const newQuestion = req.body;
    newQuestion.examId = examId;
    try {
        await db.collection('questions').add(newQuestion);
        res.status(201).send('Question added successfully.');
    } catch (error) {
        console.error('Error adding question:', error);
        res.status(500).send('Error adding question.');
    }
});

// Update a question
app.put('/api/questions/:examId', async (req, res) => {
    const examId = req.params.examId;
    const updatedQuestion = req.body;
    try {
        const questionsRef = db.collection('questions').where('examId', '==', examId).where('question', '==', updatedQuestion.question);
        const snapshot = await questionsRef.get();
        if (snapshot.empty) {
            return res.status(404).send('Question not found.');
        }
        snapshot.forEach(async doc => {
            await db.collection('questions').doc(doc.id).update(updatedQuestion);
        });
        res.send('Question updated successfully.');
    } catch (error) {
        console.error('Error updating question:', error);
        res.status(500).send('Error updating question.');
    }
});

app.post('/api/profile', async (req, res) => {
    const { userId, profile } = req.body;
    try {
        await db.collection('users').doc(userId).set({ profile });
        res.status(201).send('User profile created successfully.');
    } catch (error) {
        console.error('Error creating user profile:', error);
        res.status(500).send('Error creating user profile.');
    }
});

// Get user profile
app.get('/api/profile/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        const profileDoc = await db.collection('users').doc(userId).get();
        if (!profileDoc.exists) {
            return res.status(404).send('User profile not found.');
        }
        res.send(profileDoc.data());
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).send('Error fetching user profile.');
    }
});

// Save exam session data
app.post('/api/session', async (req, res) => {
    const { userId, session } = req.body;
    try {
        await db.collection('users').doc(userId).collection('sessions').add(session);
        res.status(201).send('Session data saved successfully.');
    } catch (error) {
        console.error('Error saving session data:', error);
        res.status(500).send('Error saving session data.');
    }
});

// Report a question
app.post('/api/reports', async (req, res) => {
    const report = req.body;
    try {
        const reportRef = db.collection('reports').doc(report.question);
        const reportDoc = await reportRef.get();
        if (reportDoc.exists) {
            const existingReport = reportDoc.data();
            existingReport.count++;
            if (report.reason) existingReport.reasons.push(report.reason);
            await reportRef.update(existingReport);
        } else {
            report.count = 1;
            report.reasons = report.reason ? [report.reason] : [];
            await reportRef.set(report);
        }
        res.status(201).send('Report submitted successfully.');
    } catch (error) {
        console.error('Error reporting question:', error);
        res.status(500).send('Error reporting question.');
    }
});

// Fallback for undefined routes
app.use((req, res) => {
    res.status(404).send('Not Found');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


