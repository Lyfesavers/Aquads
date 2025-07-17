// Horse Racing Game Logic
const NUM_HORSES = 10;
const HOUSE_WIN_PROB = 0.62; // House wins (user loses) 62% of the time
const USER_WIN_PROB = 1 - HOUSE_WIN_PROB; // User wins 38% of the time
const PAYOUT_MULTIPLIER = 8; // 8x payout for win (less than true odds)

let selectedHorse = null;
let isRacing = false;

const horsesList = document.getElementById('horses-list');
const raceTrack = document.getElementById('race-track');
const resultSection = document.getElementById('result-section');
const startRaceBtn = document.getElementById('start-race-btn');
const betAmountInput = document.getElementById('bet-amount');

const API_URL = window.API_URL || (window.location.origin + '/api');
let userPoints = 0;

function getToken() {
    try {
        const user = JSON.parse(localStorage.getItem('currentUser'));
        return user?.token || null;
    } catch {
        return null;
    }
}

async function fetchUserPoints() {
    const token = getToken();
    if (!token) return 0;
    try {
        const res = await fetch(`${API_URL}/points/my-points`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return 0;
        const data = await res.json();
        userPoints = data.points || 0;
        updatePointsDisplay();
        return userPoints;
    } catch {
        return 0;
    }
}

function updatePointsDisplay() {
    let el = document.getElementById('points-balance');
    if (!el) {
        el = document.createElement('div');
        el.id = 'points-balance';
        el.style.textAlign = 'right';
        el.style.marginBottom = '8px';
        el.style.fontWeight = 'bold';
        el.style.color = '#1976d2';
        document.querySelector('.container').insertBefore(el, document.querySelector('.bet-section'));
    }
    el.textContent = `Affiliate Points: ${userPoints}`;
}

async function deductPoints(bet) {
    const token = getToken();
    if (!token) throw new Error('You must be logged in to play.');
    const res = await fetch(`${API_URL}/points/horse-race/bet`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ betAmount: bet })
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to place bet.');
    }
    const data = await res.json();
    userPoints = data.points;
    updatePointsDisplay();
}

async function awardPoints(amount) {
    const token = getToken();
    if (!token) throw new Error('You must be logged in to play.');
    const res = await fetch(`${API_URL}/points/horse-race/payout`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ payoutAmount: amount })
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to award points.');
    }
    const data = await res.json();
    userPoints = data.points;
    updatePointsDisplay();
}

// Render horse selection buttons
function renderHorseButtons() {
    horsesList.innerHTML = '';
    for (let i = 1; i <= NUM_HORSES; i++) {
        const btn = document.createElement('button');
        btn.className = 'horse-btn';
        btn.textContent = `#${i}`;
        btn.onclick = () => selectHorse(i);
        if (selectedHorse === i) btn.classList.add('selected');
        horsesList.appendChild(btn);
    }
}

function selectHorse(i) {
    selectedHorse = i;
    renderHorseButtons();
}

// Render race track with horses at start
function renderRaceTrack(progresses = null) {
    raceTrack.innerHTML = '';
    for (let i = 1; i <= NUM_HORSES; i++) {
        const row = document.createElement('div');
        row.className = 'horse-row';
        // Horse
        const horse = document.createElement('div');
        horse.className = 'horse';
        horse.textContent = `🐎${i}`;
        // Position
        let left = 0;
        if (progresses) left = progresses[i - 1];
        horse.style.left = `calc(${left * 100}% - 0px)`;
        row.appendChild(horse);
        // Finish line
        if (i === 1) {
            const finish = document.createElement('div');
            finish.className = 'finish-line';
            row.appendChild(finish);
        }
        raceTrack.appendChild(row);
    }
}

// Start race logic
async function startRace() {
    if (isRacing) return;
    const bet = parseInt(betAmountInput.value, 10);
    if (!selectedHorse || isNaN(bet) || bet < 1) {
        resultSection.textContent = 'Select a horse and enter a valid bet amount.';
        return;
    }
    try {
        await deductPoints(bet);
    } catch (err) {
        resultSection.innerHTML = `<span style='color:red;'>${err.message}</span>`;
        return;
    }
    isRacing = true;
    startRaceBtn.disabled = true;
    resultSection.textContent = 'The race is on!';
    // Initialize progress
    let progresses = Array(NUM_HORSES).fill(0);
    renderRaceTrack(progresses);
    // Randomly determine winner with house edge
    let userWins = Math.random() < USER_WIN_PROB;
    let winner;
    if (userWins) {
        winner = selectedHorse;
    } else {
        // Pick a random horse that is NOT the user's
        let others = [];
        for (let i = 1; i <= NUM_HORSES; i++) if (i !== selectedHorse) others.push(i);
        winner = others[Math.floor(Math.random() * others.length)];
    }
    // Animate race
    let finished = false;
    let interval = setInterval(() => {
        for (let i = 0; i < NUM_HORSES; i++) {
            // Winner moves fastest
            let speed = (i + 1) === winner ? 0.04 + Math.random() * 0.03 : 0.02 + Math.random() * 0.02;
            progresses[i] = Math.min(1, progresses[i] + speed);
        }
        renderRaceTrack(progresses);
        if (!finished && progresses[winner - 1] >= 1) {
            finished = true;
            clearInterval(interval);
            showResult(winner, userWins, bet);
            isRacing = false;
            startRaceBtn.disabled = false;
        }
    }, 60);
}

async function showResult(winner, userWins, bet) {
    if (userWins) {
        try {
            await awardPoints(bet * PAYOUT_MULTIPLIER);
            resultSection.innerHTML = `<span style='color:green;'>You win! Horse #${winner} won the race!<br>+${bet * PAYOUT_MULTIPLIER} points</span>`;
        } catch (err) {
            resultSection.innerHTML = `<span style='color:red;'>You won, but failed to award points: ${err.message}</span>`;
        }
    } else {
        resultSection.innerHTML = `<span style='color:red;'>You lost! Horse #${winner} won the race.<br>-${bet} points</span>`;
    }
}

startRaceBtn.onclick = startRace;
renderHorseButtons();
renderRaceTrack();
fetchUserPoints(); 