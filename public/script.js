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
const FLAT_BASE = { 1: 'D', 3: 'E', 6: 'G', 8: 'A', 10: 'B' }; // Db, Eb, Gb, Ab, Bb

function nameIsAccidental(m) {
  const idx = m % 12;
  return !NATURAL_IDX.has(idx);
}

// Decide which accidental to use for a target midi note based on UI toggles.
// Returns '#', 'b', or null (for naturals / disabled accidentals). If both enabled, randomize.
function decideAccidentalFor(m) {
  if (!nameIsAccidental(m)) return null;
  const sharpsOn = document.getElementById('accSharps').checked;
  const flatsOn  = document.getElementById('accFlats').checked;
  if (sharpsOn && !flatsOn) return '#';
  if (flatsOn && !sharpsOn) return 'b';
  if (sharpsOn && flatsOn) return Math.random() < 0.5 ? '#' : 'b';
  return null;
}

// Pretty label like C♯4 / E♭4 based on chosen accidental
function midiToPrettyName(m, accOverride = null) {
  const octave = Math.floor(m / 12) - 1;
  const pc = m % 12;
  if (!nameIsAccidental(m)) {
    return NAMES_SHARP[pc] + octave; // naturals identical in both systems
  }
  const acc = accOverride || '#';
  if (acc === '#') {
    return NAMES_SHARP[pc].replace('#','♯') + octave;
  } else {
    const base = FLAT_BASE[pc] || NAMES_SHARP[pc];
    return base + '♭' + octave;
  }
}

// VexFlow base key without accidentals. The letter depends on accidental choice:
// for sharps use the lower letter (C for C#), for flats use the higher letter (D for Db).
function midiToVexKeyBase(m, accOverride = null) {
  const octave = Math.floor(m / 12) - 1;
  const pc = m % 12;
  let letter;
  if (!nameIsAccidental(m)) {
    letter = NAMES_SHARP[pc][0];
  } else {
    const acc = accOverride || '#';
    if (acc === '#') {
      letter = NAMES_SHARP[pc][0];   // e.g., C for C#
    } else {
      letter = (FLAT_BASE[pc] || NAMES_SHARP[pc])[0]; // e.g., D for Db
    }
  }
  return letter.toLowerCase() + '/' + octave;
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
  const includeAcc = document.getElementById('accSharps').checked || document.getElementById('accFlats').checked;
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
    container.innerHTML = '<div style="padding:12px;color:var(--muted)">Note: <strong>' + midiToPrettyName(midi, targetAccidental) + '</strong> (text-only mode)</div>';
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

  // Note (force accidental explicitly to honor flats/sharps choice)
  const key = midiToVexKeyBase(midi, targetAccidental); // e.g. 'd/4' for D♭
  const note = new VF.StaveNote({ keys: [key], duration: 'q', clef });
  if (targetAccidental) {
    note.addModifier(new VF.Accidental(targetAccidental)); // '#' or 'b'
  }

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
let targetAccidental = null; // '#', 'b', or null
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
  accSharps: document.getElementById('accSharps'),
  accFlats: document.getElementById('accFlats'),
};

function setMessage(text, kind = '') {
  els.message.textContent = text || '';
  els.message.className = 'message ' + (kind ? (kind === 'ok' ? 'ok' : 'err') : '');
}

function setTarget(midi) {
  targetMidi = midi;
  targetAccidental = decideAccidentalFor(midi);
  els.targetName.textContent = midiToPrettyName(midi, targetAccidental);
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
    els.playedName.textContent = midiToPrettyName(midiNote, nameIsAccidental(midiNote) ? (targetAccidental || '#') : null);
    if (midiNote === targetMidi) {
      score += 1;
      els.score.textContent = String(score);
      setMessage('✅ Correct! ' + midiToPrettyName(midiNote, targetAccidental), 'ok');
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
els.accSharps.addEventListener('change', nextRandomNote);
els.accFlats.addEventListener('change', nextRandomNote);

// Start with an initial target (before MIDI is connected)
nextRandomNote();

// Resize handling for VexFlow canvas
window.addEventListener('resize', () => {
  if (targetMidi !== null) drawNoteOnStaff(targetMidi);
});
