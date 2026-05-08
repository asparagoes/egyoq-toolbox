# Hangman Quiz - Christianity Perspectives

A team-based interactive hangman quiz game for teaching Christianity perspectives about the human person.

## 📁 Project Structure

```
Hangman/
├── index.html              # Main HTML file
├── css/
│   └── styles.css         # All styling
├── js/
│   └── game.js            # All JavaScript logic
├── assets/
│   ├── audio/
│   │   └── background-music.mp3  # Background music file (download required)
│   └── images/            # For future image assets
└── README.md              # This file
```

## 🎵 Setting Up Background Music

The game expects the background music file at: `./assets/audio/background-music.mp3`

### Option 1: Download and Save Locally (Recommended)
1. Download the music from: https://filebin.net/yd2x4a3rx98wygvo/Kevin%20MacLeod%20-%20Rollin%20at%205%20-%20210%20-%20full.mp3
2. Save it in the `assets/audio/` folder
3. Rename it to `background-music.mp3`

This ensures the music works even without internet and provides the best user experience.

### Option 2: Use Remote URL (Not Recommended)
If you want to use the remote URL instead, edit `js/game.js` and change:
```javascript
const BG_MUSIC_SRC = "./assets/audio/background-music.mp3";
```
to:
```javascript
const BG_MUSIC_SRC = "https://filebin.net/yd2x4a3rx98wygvo/Kevin%20MacLeod%20-%20Rollin%20at%205%20-%20210%20-%20full.mp3";
```

## 🎮 How to Play

### Game Flow
1. **Opening Screen** - Click "Begin" to start
2. **Tutorial** - 6-step instruction modal
3. **Roulette Selection** - Randomly picks starting team for Question 1
4. **20 Questions** - Split into 4 rounds:
   - Round 1: Biblical Foundation (5 questions)
   - Round 2: Early Church Thinkers (5 questions)
   - Round 3: Medieval Thinkers (5 questions)
   - Round 4: Christian View of the Person (5 questions)
5. **Team Alternation** - After Q1, teams alternate naturally
6. **Tie-Breaker** - If scores are tied, roulette spins again for final question
7. **Winner Announcement** - Final scores displayed

### Scoring
- **Correct Letter**: +1 point per team member
- **Solve Complete Word**: +5 points
- **Bonus Question**: +3 points (optional, game master decides)

### Lives System
- 6 hearts total
- Each wrong guess removes one heart
- Wrong guess switches turn to other team (within same question)
- Game ends when all hearts are lost or word is revealed

## 🎨 UI Features

### Centered Display
- Main elements are centered on screen with proper spacing
- Non-scrollable layout (no overflow)
- Works perfectly in fullscreen mode
- Responsive design for various screen sizes

### Components
- **Stats Bar**: Round, question number, category, lives, settings
- **Score Strip**: Team scores with turn indicators
- **Main Game Area**: Hangman illustration (left) + clue/word/keyboard (right)
- **Modals**: Help, Bonus, Tie-Breaker, Winner screens
- **Roulette Wheel**: Fixed pointer with rotating wheel

## 🎯 Button Guide

| Button | Function |
|--------|----------|
| **Start** | Begins game flow |
| **Next** | Moves to next question |
| **Reveal** | Shows answer (skips bonus) |
| **Bonus** | Opens bonus question modal |
| **Fullscreen** | Toggles fullscreen mode |
| **How to Play** | Shows tutorial |
| **Reset** | Restarts entire game |

## ⌨️ Keyboard Shortcuts

- **A-Z**: Guess letters
- **Enter**: Proceed to next question (after solved)
- **Escape**: Close all modals
- **Music slider**: Adjust background music volume
- **SFX slider**: Adjust sound effects volume

## 🔧 Customization

### Adding Questions
Edit `js/game.js` and add to the `questions` array:
```javascript
{
  round: 1,
  category: "Your Category",
  answer: "ANSWER TEXT",
  clue: "This is the clue for players.",
  bonus: "Deeper question about the answer."
}
```

### Changing Colors
Edit `css/styles.css` in the `:root` variables:
```css
:root {
  --blue: #3151ff;      /* Primary color */
  --pink: #E9468E;      /* Left team */
  --orange: #F28C28;    /* Right team */
  --yellow: #f2cf4f;    /* Bonus/highlight */
  /* ... more colors ... */
}
```

## 🎵 Audio Features

### Sound Effects
- **Correct Letter**: Double beep
- **Wrong Guess**: Low buzz
- **Reveal Answer**: Sine wave tone
- **Win**: 5-note celebratory chord
- **Roulette**: Ascending pattern

All generated using Web Audio API.

## 📱 Responsive Design

- **Desktop**: Full horizontal layout
- **Tablet**: Stack main sections
- **Mobile**: Single column, compressed buttons
- **Fullscreen**: Optimized for classroom projection

## 🛠️ Technical Stack

- **HTML5**: Semantic markup
- **CSS3**: Responsive design with flexbox/grid
- **JavaScript**: Vanilla ES6+ (no frameworks)
- **Web Audio API**: Sound generation
- **Canvas API**: Hangman figure drawing
- **Google Fonts**: Cause (cursive) + Special Elite (serif)

## 📄 License

This project is designed for educational purposes in a Christian classroom setting.

## 🚀 Deployment / Publishing

This tool includes basic deployment-ready metadata in `index.html`. When publishing to a static host (GitHub Pages, Netlify, Vercel, or similar):

- Ensure the `assets/audio/background-music.mp3` file is present or edit `js/game.js` to use a remote music URL.
- Keep the folder structure intact and upload the entire `hangman/` folder as the site root or as a subpath.
- The `favicon.svg` is included for better browser appearance.

For social previews and better embedding, consider adding Open Graph meta tags to `index.html`:

<meta property="og:title" content="Hangman Quiz — Christianity Perspectives" />
<meta property="og:description" content="Team-based Hangman quiz for classroom teaching about the human person." />
<meta property="og:image" content="/tool/hangman/favicon.svg" />

That's all — the game is ready for classroom deployment.

---

**Enjoy the game!** 🎓✨
