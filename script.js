const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const levelNumEl = document.getElementById('levelNum');
const scoreEl = document.getElementById('scoreCount');
const messageEl = document.getElementById('message');
const replayBtn = document.getElementById('replayBtn');
const whisperSound = document.getElementById('whisperSound');

let bird = { x: 80, y: 300, vy: 0, radius: 12, gravity: 0.5, jump: -9, wingFrame: 0 };
let pipes = []; let score = 0; let frame = 0; let gameOver = false;
let currentLevel = 1; let levelScore = 0; let particles = [];
const MAX_LEVELS = 5;

// Level configurations
const LEVELS = [
    { name: "Dark Void", gap: 200, speed: 2, pipesPerLevel: 10, color: '#330', bg: '#111' },
    { name: "Bleeding Pipes", gap: 180, speed: 2.5, pipesPerLevel: 12, color: '#660', bg: '#220' },
    { name: "Demon Eyes", gap: 160, speed: 3, pipesPerLevel: 15, color: '#900', bg: '#400' },
    { name: "Abyss Tentacles", gap: 140, speed: 3.5, pipesPerLevel: 18, color: '#a00', bg: '#600' },
    { name: "Final Horror", gap: 120, speed: 4, pipesPerLevel: 25, color: '#f00', bg: '#800' }
];

replayBtn.onclick = () => restartGame();

function restartGame() {
    currentLevel = 1; levelScore = 0; score = 0;
    bird.y = 300; bird.vy = 0; pipes = []; particles = [];
    gameOver = false; replayBtn.style.display = 'none';
    updateUI(); whisperSound.play().catch(() => {});
}

function nextLevel() {
    if (currentLevel >= MAX_LEVELS) {
        gameOver = true; messageEl.textContent = 'You escaped... or did you? 👹';
        replayBtn.style.display = 'block'; return;
    }
    currentLevel++; levelScore = 0; pipes = []; particles = [];
    messageEl.textContent = `Level ${currentLevel}: ${LEVELS[currentLevel-1].name} 🩸`;
    updateUI();
}

// Input handling
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') e.preventDefault();
    if (!gameOver && e.code === 'Space') flap();
});
canvas.addEventListener('click', () => !gameOver && flap());

function flap() {
    bird.vy = bird.jump * (1 + (currentLevel-1) * 0.1);
    bird.wingFrame = 0;
    whisperSound.play().catch(() => {});
}

function addPipe() {
    const level = LEVELS[currentLevel-1];
    const gap = level.gap + Math.sin(frame * 0.01) * 15;
    const topHeight = 80 + Math.random() * 220;
    pipes.push({
        x: 400, topHeight, gapY: topHeight + gap/2, gapSize: gap,
        dripsTop: Array.from({length: 5}, () => ({y: Math.random()*15, dripY: 0})),
        dripsBottom: Array.from({length: 5}, () => ({y: Math.random()*15, dripY: 0})),
        passed: false, level: currentLevel
    });
}

function spawnParticles(x, y, count = 5) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x, y, vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4,
            life: 1, decay: 0.02, size: Math.random()*3+1
        });
    }
}

function checkCollision() {
    if (bird.y + bird.radius > canvas.height || bird.y - bird.radius < 0) {
        spawnParticles(bird.x, bird.y, 15); return true;
    }
    for (let pipe of pipes) {
        if (bird.x + bird.radius > pipe.x && bird.x - bird.radius < pipe.x + 50) {
            if (bird.y - bird.radius < pipe.topHeight || bird.y + bird.radius > pipe.topHeight + pipe.gapSize) {
                spawnParticles(bird.x, bird.y, 12); return true;
            }
        }
    }
    return false;
}

function update() {
    if (gameOver) return;
    
    frame++; bird.wingFrame = (bird.wingFrame + 0.25) % 4;
    
    // Physics
    bird.vy += bird.gravity * (1 + (currentLevel-1)*0.05);
    bird.y += bird.vy;
    
    const level = LEVELS[currentLevel-1];
    const gameSpeed = level.speed + frame * 0.0003;
    
    // Pipes
    if (frame % (90 - currentLevel * 8) === 0) addPipe();
    
    pipes.forEach(pipe => {
        pipe.x -= gameSpeed;
        
        // Animate drips
        pipe.dripsTop.forEach(d => { d.dripY += 2; if (d.dripY > 35) d.dripY = 0; });
        pipe.dripsBottom.forEach(d => { d.dripY += 2; if (d.dripY > 35) d.dripY = 0; });
        
        if (!pipe.passed && pipe.x + 50 < bird.x) {
            pipe.passed = true; score++; levelScore++;
            if (levelScore >= level.pipesPerLevel) nextLevel();
            else messageEl.textContent = `Level ${currentLevel}: ${levelScore}/${level.pipesPerLevel}`;
            updateUI();
        }
    });
    
    pipes = pipes.filter(pipe => pipe.x > -60);
    
    // Particles
    particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.life -= p.decay;
        p.vy += 0.1;
    });
    particles = particles.filter(p => p.life > 0);
    
    if (checkCollision()) {
        gameOver = true; messageEl.textContent = `Died in Level ${currentLevel}... Restart? 💀`;
        replayBtn.style.display = 'block'; whisperSound.pause();
    }
}

function updateUI() {
    levelNumEl.textContent = currentLevel;
    scoreEl.textContent = score;
}

function drawDrips(pipe, x, isTop) {
    const alpha = 0.8 + Math.sin(frame * 0.1 + pipe.x) * 0.2;
    ctx.fillStyle = `rgba(200,0,0,${alpha})`;
    const drips = isTop ? pipe.dripsTop : pipe.dripsBottom;
    drips.forEach((drip, i) => {
        const dripX = x + (isTop ? 10 + i*8 : 15 + i*7);
        const dripY = isTop ? pipe.topHeight - 20 + drip.dripY : pipe.topHeight + pipe.gapSize + drip.dripY;
        ctx.fillRect(dripX, dripY, isTop ? 3 : 2, 10);
    });
}

function render() {
    const level = LEVELS[currentLevel-1];
    
    // Background with level-specific color
    const lightning = Math.sin(frame * 0.3) > 0.85;
    ctx.fillStyle = lightning ? level.bg : '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (lightning) ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(0,0,canvas.width,canvas.height);
    
    // Level-specific effects
    if (currentLevel >= 3) { // Demon eyes
        ctx.fillStyle = `rgba(255,0,0,${Math.sin(frame*0.4)*0.3+0.1})`;
        for (let i = 0; i < 3; i++) {
            const x = (frame*2 + i*100) % 400;
            ctx.beginPath(); ctx.arc(x, 100 + i*50, 8, 0, Math.PI*2); ctx.fill();
        }
    }
    
    // Particles
    particles.forEach(p => {
        ctx.save(); ctx.globalAlpha = p.life;
        ctx.fillStyle = `rgba(255,${100*p.life},0,${p.life})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    });
    
    // Pipes
    pipes.forEach(pipe => {
        ctx.shadowColor = level.color; ctx.shadowBlur = 20;
        ctx.fillStyle = level.color;
        ctx.fillRect(pipe.x, 0, 52, pipe.topHeight);
        ctx.fillRect(pipe.x, pipe.topHeight + pipe.gapSize, 52, canvas.height - (pipe.topHeight + pipe.gapSize));
        ctx.shadowBlur = 0;
        drawDrips(pipe, pipe.x, true); drawDrips(pipe, pipe.x, false);
    });
    
    // Bat with level-based enhancements
    ctx.save(); ctx.translate(bird.x, bird.y); ctx.rotate(bird.vy * 0.05);
    const pulse = Math.sin(frame * 0.4) * 0.3 + 0.7;
    
    // Body glow intensifies per level
    ctx.shadowColor = `hsl(${300 + currentLevel*20}, 100%, 50%)`;
    ctx.shadowBlur = 15 + currentLevel*5;
    ctx.fillStyle = `hsl(${300 + currentLevel*15}, 80%, ${30 + currentLevel*5}%)`;
    ctx.beginPath(); ctx.ellipse(0, 0, bird.radius*pulse, bird.radius*0.6, 0, 0, Math.PI*2); ctx.fill();
    
    // Eyes
    ctx.shadowBlur = 15; ctx.fillStyle = '#ff0';
    ctx.beginPath(); ctx.arc(-6,-4,3,0,Math.PI*2); ctx.arc(6,-4,3,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    
    // Wings
    const wingAngle = [0.3,0.1,0.0,0.1][Math.floor(bird.wingFrame)];
    ctx.fillStyle = `rgba(80,10,10,0.9)`; 
    ctx.beginPath();
    ctx.ellipse(-15, wingAngle*20, 18, 8, 0.3, 0, Math.PI*2);
    ctx.ellipse(15, wingAngle*20, 18, 8, -0.3, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
    
    if (gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0,250,400,120);
        ctx.fillStyle = '#f00'; ctx.shadowColor = '#f00'; ctx.shadowBlur = 30;
        ctx.font = 'bold 28px Courier New'; ctx.textAlign = 'center';
        ctx.fillText(`ABYSS WINS - LEVEL ${currentLevel}`, 200, 280);
        ctx.shadowBlur = 0; ctx.font = '18px Courier New'; ctx.fillStyle = '#fcc';
        ctx.fillText('Click Restart to try again', 200, 315);
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    update(); render(); requestAnimationFrame(gameLoop);
}

// Initialize
restartGame(); gameLoop();
