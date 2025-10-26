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

  if (needsAcc) note.addModifier(new VF.Accidental('#'));

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

