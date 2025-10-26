// index.js
// Simple Node.js server that serves a Web MIDI "Piano Notes Guess" trainer.
// Run: 1) npm init -y
//      2) npm i express
//      3) node index.js
// Then open http://localhost:3000

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static('public'));

// Serve the HTML file
app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🎹 Piano Notes Guess is running at http://localhost:${PORT}`);
});