// index.js
// Simple Node.js server that serves a Web MIDI "Piano Notes Guess" trainer.
// Run: 1) npm init -y
//      2) npm i express
//      3) node index.js
// Then open http://localhost:3000

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (_req, res) => {
    res.set('Content-Type', 'text/html');
    res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Piano Notes Guess — Web MIDI Trainer</title>
  <style>
    :root {
      --bg: #0f1220;
      --card: #171a2b;
      --ink: #e7e9ff;
      --muted: #9aa3b2;
      --good: #2ecc71;
      --bad: #ff6b6b;
      --accent: #8ab4f8;
      --accent-2: #cfa9ff;
      --border: #27304a;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      height: 100%;
      color: var(--ink);
      background: radial-gradient(1200px 600px at 20% -10%, #1a1f36 0%, var(--bg) 60%);
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
    }
    header {
      padding: 24px 20px 8px;
      text-align: center;
    }
    header h1 {
      margin: 0 0 6px;
      font-size: 24px;
      letter-spacing: .4px;
    }
    header p { margin: 0; color: var(--muted); font-size: 14px; }
    .container {
      max-width: 980px;
      margin: 18px auto 32px;
      padding: 0 16px;
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }
    .row { display: grid; gap: 16px; grid-template-columns: 1fr; }
    @media (min-width: 900px) {
      .row { grid-template-columns: 3fr 2fr; }
    }
    .card {
      background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.00));
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      backdrop-filter: blur(6px);
    }
    .controls {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 10px 14px;
      align-items: center;
    }
    label { font-size: 13px; color: var(--muted); }
    select, button, input[type="checkbox"] {
      font-size: 14px;
    }
    select, button {
      width: 100%;
      padding: 10px 12px;
      color: var(--ink);
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
    }
    button.primary {
      background: linear-gradient(180deg, rgba(138,180,248,.25), rgba(138,180,248,.12));
      border-color: #334b74;
    }
    button:disabled { opacity: .5; cursor: not-allowed; }
    .status {
      display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
      margin-top: 12px;
    }
    .pill {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 8px 12px;
      font-size: 13px;
      color: var(--muted);
    }
    .pill strong { color: var(--ink); }
    .staff-wrap {
      display: grid;
      place-items: center;
      height: 260px;
      background: linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,0));
      border: 1px dashed var(--border);
      border-radius: 12px;
      position: relative;
      overflow: hidden;
    }
    #staffCanvas { width: 100%;
      background-color: #e3e3e3;
  }
    .message {
      margin-top: 12px;
      min-height: 24px;
      font-size: 15px;
    }
    .message.ok { color: var(--good); }
    .message.err { color: var(--bad); }
    .kbd {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace;
      padding: 2px 6px; border: 1px solid var(--border); border-radius: 6px; background: var(--card);
    }
    .footer {
      text-align: center;
      color: var(--muted);
      font-size: 12px;
      padding: 8px 16px 24px;
    }
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <header>
    <h1>Piano Notes Guess</h1>
    <p>Connect your digital piano via MIDI. Play the note you see on the staff — get it right to advance!</p>
  </header>

  <div class="container">
    <div class="row">
      <section class="card">
        <div class="controls" id="controls">
          <div>
            <label for="midiInput">MIDI Input</label>
            <select id="midiInput" aria-label="MIDI Input"></select>
          </div>
          <div>
            <label>Clefs to practice</label>
            <div>
              <label><input type="checkbox" id="clefTreble" checked /> Treble</label>
              &nbsp;&nbsp;
              <label><input type="checkbox" id="clefBass" checked /> Bass</label>
            </div>
          </div>
          <div>
            <label>Accidentals</label>
            <div>
              <label><input type="checkbox" id="accidentals" /> Include sharps ♯</label>
            </div>
          </div>
          <div>
            <label for="difficulty">Range</label>
            <select id="difficulty">
              <option value="beginner">Beginner: C4–C5</option>
              <option value="treble" selected>Treble: C4–B5</option>
              <option value="bass">Bass: C2–B3</option>
              <option value="wide">Wide: C2–C6</option>
            </select>
          </div>
          <div>
            <label>&nbsp;</label>
            <button id="connectBtn" class="primary">Connect MIDI</button>
          </div>
          <div>
            <label>&nbsp;</label>
            <button id="newNoteBtn">New Note</button>
          </div>
        </div>

        <div class="status">
          <div class="pill">Target: <strong id="targetName">—</strong> <span id="targetClef"></span></div>
          <div class="pill">Last played: <strong id="playedName">—</strong></div>
        </div>

        <div class="staff-wrap">
          <div id="staffCanvas"></div>
          <div id="noVexMsg" class="hidden" aria-live="polite">VexFlow not loaded — showing text-only mode.</div>
        </div>

        <div id="message" class="message" aria-live="polite"></div>
      </section>

      <aside class="card">
        <h3 style="margin-top:0">How it works</h3>
        <ol>
          <li>Click <span class="kbd">Connect MIDI</span> and pick your keyboard.</li>
          <li>We show a random note on the selected clef(s).</li>
          <li>Play the matching note on your keyboard. If correct — we show the next note.</li>
        </ol>
        <p><strong>Tips</strong></p>
        <ul>
          <li>Middle C is <span class="kbd">C4</span> (MIDI 60).</li>
          <li>Works on <span class="kbd">https://</span> or <span class="kbd">http://localhost</span>.</li>
        </ul>
        <div class="pill" style="margin-top:8px">Score: <strong id="score">0</strong></div>
      </aside>
    </div>
  </div>

  <div class="footer">Built with Web MIDI. Staff rendering by VexFlow (optional).</div>

  <!-- Try to load VexFlow (global build). If it fails, app continues in text-only mode. -->
  <script src="https://cdn.jsdelivr.net/npm/vexflow@4.2.2/build/cjs/vexflow.js"></script>

  <script>
    // -------------------------------
    // Utility: MIDI -> Note helpers
    // -------------------------------
    const NAMES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    const NATURAL_IDX = new Set([0,2,4,5,7,9,11]); // C D E F G A B

    function midiToName(m) {
      const octave = Math.floor(m / 12) - 1;
      const name = NAMES_SHARP[m % 12];
      return name + octave;
    }
    function midiToVexKey(m) {
      const octave = Math.floor(m / 12) - 1;
      const name = NAMES_SHARP[m % 12];
      const letter = name[0].toLowerCase();
      const accidental = name.length > 1 ? '#' : '';
      return letter + accidental + '/' + octave;
    }
    function nameIsAccidental(m) {
      const idx = m % 12;
      return !NATURAL_IDX.has(idx);
    }

    // Suggested practice ranges (inclusive)
    const RANGES = {
      beginner: [60, 72], // C4..C5
      treble:   [60, 83], // C4..B5
      bass:     [36, 59], // C2..B3
      wide:     [36, 84], // C2..C6
    };

    function chooseClefForMidi(m) {
      // Heuristic: below middle C -> bass, equal/above -> treble
      return m < 60 ? 'bass' : 'treble';
    }

    // Build the pool of candidate MIDI notes based on UI settings
    function buildNotePool() {
      const difficulty = document.getElementById('difficulty').value;
      const includeAcc = document.getElementById('accidentals').checked;
      const wantTreble = document.getElementById('clefTreble').checked;
      const wantBass = document.getElementById('clefBass').checked;

      const [lo, hi] = RANGES[difficulty];
      let pool = [];
      for (let m = lo; m <= hi; m++) {
        const clef = chooseClefForMidi(m);
        if ((clef === 'treble' && !wantTreble) || (clef === 'bass' && !wantBass)) continue;
        if (!includeAcc && nameIsAccidental(m)) continue;
        // Limit to typical piano range
        if (m < 21 || m > 108) continue;
        pool.push(m);
      }
      if (pool.length === 0) {
        // Fallback: ensure at least middle C present
        pool = [60];
      }
      return pool;
    }

    function randFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    // ---------------------------------
    // Staff rendering (VexFlow optional)
    // ---------------------------------
    let hasVex = false;
    let VF = null;
    try {
      hasVex = !!(window.Vex && Vex.Flow);
      if (hasVex) VF = Vex.Flow;
    } catch (e) { hasVex = false; }

    let vfContext = null;
    let stave = null;

    function clearStaff() {
      const el = document.getElementById('staffCanvas');
      el.innerHTML = '';
      vfContext = null;
      stave = null;
    }

    function drawNoteOnStaff(midi) {
      const container = document.getElementById('staffCanvas');
      const noVexMsg = document.getElementById('noVexMsg');
      if (!hasVex) {
        noVexMsg.classList.remove('hidden');
        container.innerHTML = '<div style="padding:12px;color:var(--muted)">Note: <strong>' + midiToName(midi) + '</strong> (text-only mode)</div>';
        return;
      }
      noVexMsg.classList.add('hidden');
      clearStaff();

      const clef = chooseClefForMidi(midi);
      const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
      const width = container.clientWidth || 600;
      const height = 220;
      renderer.resize(width, height);
      const context = renderer.getContext();
      vfContext = context;

      // Stave
      const left = Math.max(10, (width - 500)/2);
      stave = new VF.Stave(left, 20, 500, {left_bar: false, right_bar: false});
      stave.addClef(clef);
      stave.setContext(context).draw();

      // Note
      const key = midiToVexKey(midi); // e.g. 'c#/4'
      const needsAcc = key.includes('#');
      const note = new VF.StaveNote({ keys: [key], duration: 'q', clef });

      if (needsAcc) note.addAccidental(0, new VF.Accidental('#'));

      // Voice + formatter
      const voice = new VF.Voice({num_beats: 1, beat_value: 4});
      voice.addTickables([note]);
      new VF.Formatter().joinVoices([voice]).format([voice], 300);
      voice.draw(context, stave);
    }

    // ---------------
    // App state
    // ---------------
    let midiAccess = null;
    let activeInput = null;
    let pool = [];
    let targetMidi = null;
    let score = 0;

    const els = {
      midiInput: document.getElementById('midiInput'),
      connectBtn: document.getElementById('connectBtn'),
      newNoteBtn: document.getElementById('newNoteBtn'),
      targetName: document.getElementById('targetName'),
      targetClef: document.getElementById('targetClef'),
      playedName: document.getElementById('playedName'),
      message: document.getElementById('message'),
      score: document.getElementById('score'),
      clefTreble: document.getElementById('clefTreble'),
      clefBass: document.getElementById('clefBass'),
      accidentals: document.getElementById('accidentals'),
      difficulty: document.getElementById('difficulty'),
    };

    function setMessage(text, kind = '') {
      els.message.textContent = text || '';
      els.message.className = 'message ' + (kind ? (kind === 'ok' ? 'ok' : 'err') : '');
    }

    function setTarget(midi) {
      targetMidi = midi;
      els.targetName.textContent = midiToName(midi);
      els.targetClef.textContent = ' • ' + chooseClefForMidi(midi) + ' clef';
      drawNoteOnStaff(midi);
      setMessage('');
    }

    function nextRandomNote() {
      pool = buildNotePool();
      const choice = randFrom(pool);
      setTarget(choice);
    }

    function updateInputsDropdown() {
      const select = els.midiInput;
      select.innerHTML = '';
      if (!midiAccess) return;
      const options = [];
      midiAccess.inputs.forEach(input => {
        const opt = document.createElement('option');
        opt.value = input.id;
        opt.textContent = input.name || ('Input ' + input.id);
        options.push(opt);
      });
      if (options.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No MIDI inputs found';
        select.appendChild(opt);
        els.connectBtn.disabled = false;
      } else {
        options.forEach(o => select.appendChild(o));
        els.connectBtn.disabled = false;
      }
    }

    function connectSelectedInput() {
      if (!midiAccess) return;
      const id = els.midiInput.value;
      if (activeInput) {
        try { activeInput.onmidimessage = null; } catch (_) {}
      }
      activeInput = midiAccess.inputs.get(id) || null;
      if (activeInput) {
        activeInput.onmidimessage = handleMIDIMessage;
        setMessage('Connected to ' + (activeInput.name || 'MIDI input') + '.', '');
      } else {
        setMessage('Could not connect to the selected MIDI input.', 'err');
      }
    }

    function handleMIDIMessage(ev) {
      const [status, data1, data2] = ev.data;
      const command = status & 0xF0;
      if ((command === 0x90 && data2 > 0) || command === 0x80) {
        const midiNote = data1;
        els.playedName.textContent = midiToName(midiNote);
        if (midiNote === targetMidi) {
          score += 1;
          els.score.textContent = String(score);
          setMessage('✅ Correct! ' + midiToName(midiNote), 'ok');
          // Brief delay before next note
          setTimeout(nextRandomNote, 500);
        } else {
          const diff = midiNote - targetMidi;
          const direction = diff > 0 ? 'too high' : 'too low';
          setMessage('❌ ' + midiToName(midiNote) + ' is ' + direction + '. Try again!', 'err');
        }
      }
    }

    // ----------------------
    // MIDI setup + listeners
    // ----------------------
    async function requestMIDI() {
      if (!('requestMIDIAccess' in navigator)) {
        setMessage('Web MIDI is not supported in this browser.', 'err');
        return;
      }
      try {
        midiAccess = await navigator.requestMIDIAccess({ sysex: false });
        midiAccess.addEventListener('statechange', updateInputsDropdown);
        updateInputsDropdown();
        // Select the first input by default
        if (els.midiInput.options.length > 0) {
          els.midiInput.selectedIndex = 0;
          connectSelectedInput();
        }
        nextRandomNote();
      } catch (e) {
        setMessage('MIDI access was denied. Please allow access and try again.', 'err');
      }
    }

    // UI events
    els.connectBtn.addEventListener('click', requestMIDI);
    els.midiInput.addEventListener('change', connectSelectedInput);
    els.newNoteBtn.addEventListener('click', nextRandomNote);
    els.clefTreble.addEventListener('change', nextRandomNote);
    els.clefBass.addEventListener('change', nextRandomNote);
    els.accidentals.addEventListener('change', nextRandomNote);
    els.difficulty.addEventListener('change', nextRandomNote);

    // Start with an initial target (before MIDI is connected)
    nextRandomNote();

    // Resize handling for VexFlow canvas
    window.addEventListener('resize', () => {
      if (targetMidi !== null) drawNoteOnStaff(targetMidi);
    });
  </script>
</body>
</html>`);
});

app.listen(PORT, () => {
    console.log(`🎹 Piano Notes Guess is running at http://localhost:${PORT}`);
});