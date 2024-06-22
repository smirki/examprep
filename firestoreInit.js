const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Load exams data from JSON file
const examsFilePath = path.join(__dirname, './data/exams.json');
const questionsFilePath = path.join(__dirname, './data/questions.json');

fs.readFile(examsFilePath, 'utf8', async (err, examsData) => {
  if (err) {
    console.error('Error reading exams file:', err);
    return;
  }
  const exams = JSON.parse(examsData);

  // Write exams to Firestore
  for (const exam of exams) {
    await db.collection('exams').doc(exam.id).set({
      name: exam.name
    });
  }

  console.log('Exams data initialized in Firestore.');

  // Load questions data from JSON file
  fs.readFile(questionsFilePath, 'utf8', async (err, questionsData) => {
    if (err) {
      console.error('Error reading questions file:', err);
      return;
    }
    const questions = JSON.parse(questionsData);

    // Write questions to Firestore
    for (const [examId, examQuestions] of Object.entries(questions)) {
      for (const question of examQuestions) {
        await db.collection('questions').add({
          examId: examId,
          question: question.question,
          answer: question.answer,
          upvotes: question.upvotes || 0,
          downvotes: question.downvotes || 0
        });
      }
    }

    console.log('Questions data initialized in Firestore.');
  });
});


