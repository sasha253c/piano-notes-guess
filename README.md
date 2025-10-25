# Piano Notes Guess

A Web MIDI piano notes guessing trainer that helps you learn to read sheet music by connecting your digital piano via MIDI.

## Features

- 🎹 Connect your digital piano via Web MIDI
- 🎼 Practice reading notes on treble and bass clefs
- 🎵 Support for sharps and different difficulty ranges
- 📱 Responsive design that works on desktop and mobile
- 🎨 Beautiful staff rendering with VexFlow

## Quick Start with Docker

### Using Docker Compose (Recommended)

1. **Clone and navigate to the project:**
   ```bash
   git clone <repository-url>
   cd piano_notes_guess
   ```

2. **Start the application:**
   ```bash
   docker-compose up -d
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

4. **Stop the application:**
   ```bash
   docker-compose down
   ```

### Using Docker directly

1. **Build the image:**
   ```bash
   docker build -t piano-notes-guess .
   ```

2. **Run the container:**
   ```bash
   docker run -p 3000:3000 piano-notes-guess
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

## Manual Setup (without Docker)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   # or
   node index.js
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

## How to Use

1. **Connect MIDI:** Click "Connect MIDI" and select your digital piano
2. **Choose settings:** Select clefs, difficulty range, and whether to include sharps
3. **Play notes:** Play the note shown on the staff to advance to the next one
4. **Track progress:** Your score is displayed in the sidebar

## Requirements

- A digital piano or MIDI keyboard
- A modern web browser that supports Web MIDI API
- HTTPS connection (required for Web MIDI in most browsers)

## Browser Compatibility

- Chrome/Chromium (recommended)
- Edge
- Firefox (with experimental Web MIDI support)
- Safari (limited support)

## Docker Configuration

The application includes:
- **Dockerfile**: Multi-stage build with Node.js 18 Alpine
- **docker-compose.yml**: Easy orchestration with health checks
- **.dockerignore**: Optimized build context

## Development

For development with hot reload, you can mount the source code:

```bash
docker-compose -f docker-compose.dev.yml up
```

## License

ISC
