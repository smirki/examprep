const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3008;

app.use(express.static('public'));
app.use(express.json());

// Load exams data and question counts
app.get('/api/exams', (req, res) => {
    const examsFilePath = path.join(__dirname, 'data', 'exams.json');
    const questionsFilePath = path.join(__dirname, 'data', 'questions.json');
    
    fs.readFile(examsFilePath, 'utf8', (err, examsData) => {
        if (err) {
            console.error('Error reading exams file:', err);
            return res.status(500).send('Error reading exams file.');
        }
        fs.readFile(questionsFilePath, 'utf8', (err, questionsData) => {
            if (err) {
                console.error('Error reading questions file:', err);
                return res.status(500).send('Error reading questions file.');
            }
            const exams = JSON.parse(examsData);
            const questions = JSON.parse(questionsData);
            exams.forEach(exam => {
                exam.questionCount = questions[exam.id] ? questions[exam.id].length : 0;
            });
            res.send(exams);
        });
    });
});

// Load questions for an exam
app.get('/api/questions/:examId', (req, res) => {
    const examId = req.params.examId;
    const filePath = path.join(__dirname, 'data', 'questions.json');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading questions file:', err);
            return res.status(500).send('Error reading questions file.');
        }
        const questions = JSON.parse(data);
        if (!questions[examId]) return res.status(404).send('Exam not found.');
        res.send(questions[examId]);
    });
});

// Save a new question
app.post('/api/questions/:examId', (req, res) => {
    const examId = req.params.examId;
    const newQuestion = req.body;

    const filePath = path.join(__dirname, 'data', 'questions.json');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading questions file:', err);
            return res.status(500).send('Error reading questions file.');
        }
        const questions = JSON.parse(data);
        if (!questions[examId]) questions[examId] = [];
        questions[examId].push(newQuestion);
        fs.writeFile(filePath, JSON.stringify(questions, null, 2), (err) => {
            if (err) {
                console.error('Error writing questions file:', err);
                return res.status(500).send('Error writing questions file.');
            }
            res.status(201).send('Question added successfully.');
        });
    });
});

// Update a question
app.put('/api/questions/:examId', (req, res) => {
    const examId = req.params.examId;
    const updatedQuestion = req.body;

    const filePath = path.join(__dirname, 'data', 'questions.json');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading questions file:', err);
            return res.status(500).send('Error reading questions file.');
        }
        const questions = JSON.parse(data);
        const index = questions[examId].findIndex(q => q.question === updatedQuestion.question);
        if (index === -1) return res.status(404).send('Question not found.');
        questions[examId][index] = updatedQuestion;
        fs.writeFile(filePath, JSON.stringify(questions, null, 2), (err) => {
            if (err) {
                console.error('Error writing questions file:', err);
                return res.status(500).send('Error writing questions file.');
            }
            res.send('Question updated successfully.');
        });
    });
});

// Report a question
app.post('/api/reports', (req, res) => {
    const report = req.body;
    const filePath = path.join(__dirname, 'data', 'question-reports.json');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading reports file:', err);
            return res.status(500).send('Error reading reports file.');
        }
        const reports = JSON.parse(data) || [];
        const existingReport = reports.find(r => r.question === report.question);
        if (existingReport) {
            existingReport.count++;
            if (report.reason) {
                existingReport.reasons.push(report.reason);
            }
        } else {
            report.count = 1;
            report.reasons = report.reason ? [report.reason] : [];
            reports.push(report);
        }
        fs.writeFile(filePath, JSON.stringify(reports, null, 2), (err) => {
            if (err) {
                console.error('Error writing reports file:', err);
                return res.status(500).send('Error writing reports file.');
            }
            res.status(201).send('Report submitted successfully.');
        });
    });
});

// Fallback for undefined routes
app.use((req, res) => {
    res.status(404).send('Not Found');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
