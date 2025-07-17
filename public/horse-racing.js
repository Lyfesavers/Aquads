// Horse Racing Game - Modern Animated Version
const NUM_HORSES = 10;
const HOUSE_EDGE = 0.15; // 15% house edge
const API_URL = window.API_URL || (window.location.origin + '/api');

let selectedHorse = null;
let betAmount = 10;
let userPoints = 0;
let odds = [];
let isRacing = false;

const horsesList = document.getElementById('horses-list');
const raceTrack = document.getElementById('race-track');
const resultSection = document.getElementById('result-section');
const startRaceBtn = document.getElementById('start-race-btn');
const betAmountInput = document.getElementById('bet-amount');
const pointsBar = document.getElementById('points-bar');
const potentialPayoutDiv = document.getElementById('potential-payout');

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
  if (!token) return;
  try {
    const res = await fetch(`${API_URL}/points/my-points`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    userPoints = data.points || 0;
    updatePointsDisplay();
  } catch {}
}

function updatePointsDisplay() {
  pointsBar.textContent = `Affiliate Points: ${userPoints}`;
}

function randomizeOdds() {
  // Generate random odds for each horse, sum of 1/odds = 1 - HOUSE_EDGE
  let invTotal = 1 - HOUSE_EDGE;
  let invOdds = [];
  let sum = 0;
  for (let i = 0; i < NUM_HORSES - 1; i++) {
    let min = 0.05, max = 0.18;
    let val = Math.random() * (max - min) + min;
    invOdds.push(val);
    sum += val;
  }
  invOdds.push(Math.max(invTotal - sum, 0.03));
  // Shuffle
  for (let i = invOdds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [invOdds[i], invOdds[j]] = [invOdds[j], invOdds[i]];
  }
  odds = invOdds.map(x => Math.max(1.1, 1 / x)).map(x => Math.round(x * 10) / 10);
}

function renderHorseButtons() {
  horsesList.innerHTML = '';
  for (let i = 1; i <= NUM_HORSES; i++) {
    const btn = document.createElement('button');
    btn.className = 'horse-btn';
    btn.innerHTML = `🐎${i}<span class="horse-odds">${odds[i-1]}x</span>`;
    btn.onclick = () => selectHorse(i);
    if (selectedHorse === i) btn.classList.add('selected');
    horsesList.appendChild(btn);
  }
}

function selectHorse(i) {
  selectedHorse = i;
  renderHorseButtons();
  updatePotentialPayout();
}

function updatePotentialPayout() {
  if (!selectedHorse) {
    potentialPayoutDiv.textContent = '';
    return;
  }
  const payout = Math.floor(betAmount * odds[selectedHorse-1]);
  potentialPayoutDiv.textContent = `Potential payout: ${payout} points (odds: ${odds[selectedHorse-1]}x)`;
}

betAmountInput.addEventListener('input', e => {
  betAmount = Math.max(1, parseInt(e.target.value, 10) || 1);
  updatePotentialPayout();
});

function renderRaceTrack(progresses = null) {
  raceTrack.innerHTML = '';
  for (let i = 1; i <= NUM_HORSES; i++) {
    const row = document.createElement('div');
    row.className = 'horse-row';
    // Horse
    const horse = document.createElement('div');
    horse.className = 'horse';
    horse.textContent = `🐎${i}`;
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

async function startRace() {
  if (isRacing) return;
  if (!selectedHorse) {
    resultSection.textContent = 'Select a horse to bet on!';
    return;
  }
  if (betAmount < 1) {
    resultSection.textContent = 'Enter a valid bet amount.';
    return;
  }
  if (userPoints < betAmount) {
    resultSection.textContent = 'Not enough points!';
    return;
  }
  try {
    await deductPoints(betAmount);
  } catch (err) {
    resultSection.innerHTML = `<span style='color:red;'>${err.message}</span>`;
    return;
  }
  isRacing = true;
  startRaceBtn.disabled = true;
  resultSection.textContent = 'The race is on!';
  let progresses = Array(NUM_HORSES).fill(0);
  renderRaceTrack(progresses);
  // Determine winner by odds
  let weights = odds.map(o => 1/o);
  let total = weights.reduce((a,b) => a+b, 0);
  let r = Math.random() * total;
  let acc = 0, winner = 1;
  for (let i = 0; i < NUM_HORSES; i++) {
    acc += weights[i];
    if (r < acc) { winner = i+1; break; }
  }
  // Animate race
  let finished = false;
  let interval = setInterval(() => {
    for (let i = 0; i < NUM_HORSES; i++) {
      let base = 0.012 + Math.random() * 0.012;
      let bonus = (i+1) === winner ? 0.012 + Math.random() * 0.012 : 0;
      progresses[i] = Math.min(1, progresses[i] + base + bonus);
    }
    renderRaceTrack(progresses);
    if (!finished && progresses[winner - 1] >= 1) {
      finished = true;
      clearInterval(interval);
      showResult(winner);
      isRacing = false;
      startRaceBtn.disabled = false;
    }
  }, 60);
}

async function showResult(winner) {
  if (selectedHorse === winner) {
    const payout = Math.floor(betAmount * odds[winner-1]);
    try {
      await awardPoints(payout);
      resultSection.innerHTML = `<span style='color:lime;'>You win! Horse #${winner} won the race!<br>+${payout} points</span>`;
    } catch (err) {
      resultSection.innerHTML = `<span style='color:red;'>You won, but failed to award points: ${err.message}</span>`;
    }
  } else {
    resultSection.innerHTML = `<span style='color:red;'>You lost! Horse #${winner} won the race.<br>-${betAmount} points</span>`;
  }
  fetchUserPoints();
  randomizeOdds();
  renderHorseButtons();
  updatePotentialPayout();
}

startRaceBtn.onclick = startRace;

// Initial setup
randomizeOdds();
renderHorseButtons();
renderRaceTrack();
fetchUserPoints();
updatePotentialPayout(); 