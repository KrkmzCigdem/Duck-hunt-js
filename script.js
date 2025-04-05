// Encapsulate the game logic in an IIFE to avoid polluting global scope
(() => {
  // DOM elements
  const elements = {
    aim: document.querySelector(".aim"),
    target: document.querySelector(".target"),
    scoreText: document.querySelector(".score"),
    timerText: document.querySelector(".timer"),
    highscoreText: document.querySelector(".highscore"),
    clickToBegin: document.getElementById("ClickToBegin"),
    landingpage: document.querySelector(".landingpage"),
    welcomeSound: document.querySelector(".welcomeSound"),
    gameoverSound: document.querySelector(".gameoverSound"),
    pauseMenu: document.querySelector(".pauseMenu"),
    continueBtn: document.querySelector(".continueBtn"),
    restartBtn: document.querySelector(".restartBtn"),
    shootSound: document.querySelector(".shootSound"),
    livesText: document.querySelector(".lives"),
    projectile: document.querySelector(".projectile"),
    howToPlayModal: document.getElementById("howToPlayModal"),
    howToPlayBtn: document.getElementById("howToPlayBtn"),
    closeModalBtn: document.getElementById("closeModalBtn"),
    closeSpan: document.querySelector(".close"),
  };

  // Game state
  let score, timeLeft, lives, highscore;
  let gamePaused, animationFrameId, timerInterval;
  let aimPosition, targetVelocityX, targetVelocityY;
  let timerStarted, canShoot, isUsingKeyboard;

  const randImg = [
    { src: "images/RedTopLeft.png", points: 1 },
    { src: "images/RedRight.png", points: 1 },
    { src: "images/RedLeft.png", points: 2 },
    { src: "images/DuckTopRight.png", points: 3 },
    { src: "images/DuckLeft.png", points: 5 },
  ];

  const updateText = () => {
    elements.scoreText.innerText = `Score: ${score}`;
    elements.timerText.innerText = `Time: ${timeLeft}s`;
    elements.livesText.innerText = `Lives: ${lives}`;
    elements.highscoreText.innerText = `High Score: ${highscore}`;
  };

  const toggleModal = (show) => {
    elements.howToPlayModal.style.display = show ? "block" : "none";
  };

  elements.howToPlayBtn.addEventListener("click", () => toggleModal(true));
  elements.closeModalBtn.addEventListener("click", () => toggleModal(false));
  elements.closeSpan.addEventListener("click", () => toggleModal(false));
  window.addEventListener("click", (e) => {
    if (e.target === elements.howToPlayModal) toggleModal(false);
  });

  const playWelcomeSound = async () => {
    try {
      elements.welcomeSound.currentTime = 0;
      await elements.welcomeSound.play();
      elements.welcomeSound.addEventListener("ended", () => {
        canShoot = true;
      });
    } catch (err) {
      console.error("Failed to play welcome sound:", err);
    }
  };

  const getRandomTarget = () => {
    const rand = randImg[Math.floor(Math.random() * randImg.length)];
    elements.target.querySelector("img").src = rand.src;
    return rand.points;
  };

  const spawnTarget = () => {
    const top = Math.random() * (window.innerHeight - 200);
    const left = Math.random() * (window.innerWidth - 120);
    elements.target.style.top = `${top}px`;
    elements.target.style.left = `${left}px`;

    targetVelocityX = (Math.random() * 2 + 1) * (Math.random() < 0.5 ? -1 : 1);
    targetVelocityY = (Math.random() * 2 + 1) * (Math.random() < 0.5 ? -1 : 1);

    animateTarget();
  };

  const animateTarget = () => {
    if (!gamePaused) {
      let left = parseFloat(elements.target.style.left);
      let top = parseFloat(elements.target.style.top);

      left += targetVelocityX;
      top += targetVelocityY;

      if (
        left <= 0 ||
        left + elements.target.offsetWidth >= window.innerWidth
      ) {
        targetVelocityX = -targetVelocityX;
      }
      if (
        top <= 0 ||
        top + elements.target.offsetHeight >= window.innerHeight
      ) {
        targetVelocityY = -targetVelocityY;
      }

      elements.target.style.left = `${left}px`;
      elements.target.style.top = `${top}px`;

      animationFrameId = requestAnimationFrame(animateTarget);
    }
  };

  const loseLife = async () => {
    lives--;
    updateText();
    if (lives <= 0) await gameOver("lives");
  };

  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  const moveProjectile = async () => {
    let position = 0;
    const speed = 4;
    elements.projectile.style.display = "block";
    while (position <= window.innerHeight && !gamePaused) {
      await delay(16);
      position += speed;
      elements.projectile.style.top = `${position}px`;

      const projRect = elements.projectile.getBoundingClientRect();
      const aimRect = elements.aim.getBoundingClientRect();
      if (
        projRect.left < aimRect.right &&
        projRect.right > aimRect.left &&
        projRect.top < aimRect.bottom &&
        projRect.bottom > aimRect.top
      ) {
        await loseLife();
        elements.projectile.style.display = "none";
        return;
      }
    }
    elements.projectile.style.display = "none";
  };

  const shootFromTop = async () => {
    elements.projectile.style.left = `${Math.random() * window.innerWidth}px`;
    elements.projectile.style.top = "0px";
    await moveProjectile();
  };

  const startProjectileAttacks = async () => {
    while (!gamePaused) {
      await shootFromTop();
      await delay(3000);
    }
  };

  const playGameOverSound = async () => {
    elements.gameoverSound.currentTime = 0;
    await elements.gameoverSound.play();
  };

  const gameOver = async (reason) => {
    await playGameOverSound();
    const msg = `GAME OVER\nSCORE: ${score}\n${
      reason === "lives" ? "You ran out of lives!" : "Time's up!"
    }`;
    alert(`${msg}\n\nClick OK or press ENTER to play again.`);

    if (score > localStorage.getItem("highscore")) {
      localStorage.setItem("highscore", score);
      highscore = score;
    }
    updateText();
    resetGame();
  };

  const timer = () => {
    if (timerStarted) return;
    timerStarted = true;
    timerInterval = setInterval(() => {
      if (!gamePaused && timeLeft > 0) {
        timeLeft--;
        updateText();
      } else if (timeLeft === 0) {
        clearInterval(timerInterval);
        gameOver("time");
      }
    }, 1000);
  };

  const handleMouseMove = (e) => {
    if (!isUsingKeyboard) {
      aimPosition.x = e.clientX;
      aimPosition.y = e.clientY;
      elements.aim.style.left = `${aimPosition.x}px`;
      elements.aim.style.top = `${aimPosition.y}px`;
    }
  };

  const animateAim = () => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.addEventListener("mousemove", handleMouseMove);

    document.addEventListener("keydown", (e) => {
      isUsingKeyboard = true;
      const step = 10;
      if (e.key === "ArrowUp") aimPosition.y -= step;
      if (e.key === "ArrowDown") aimPosition.y += step;
      if (e.key === "ArrowLeft") aimPosition.x -= step;
      if (e.key === "ArrowRight") aimPosition.x += step;
      if (e.key === " ") shoot();
      elements.aim.style.left = `${aimPosition.x}px`;
      elements.aim.style.top = `${aimPosition.y}px`;
    });
  };

  const shoot = () => {
    if (!canShoot) return;
    elements.shootSound.currentTime = 0;
    elements.shootSound.play();

    const targetRect = elements.target.getBoundingClientRect();
    if (
      aimPosition.x >= targetRect.left &&
      aimPosition.x <= targetRect.right &&
      aimPosition.y >= targetRect.top &&
      aimPosition.y <= targetRect.bottom
    ) {
      score += getRandomTarget();
      updateText();
      spawnTarget();
    }
  };

  document.addEventListener("click", shoot);

  const resetGame = async () => {
    score = 0;
    timeLeft = 30;
    lives = 3;
    timerStarted = false;
    canShoot = false;
    isUsingKeyboard = false;
    aimPosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    elements.aim.style.left = `${aimPosition.x}px`;
    elements.aim.style.top = `${aimPosition.y}px`;

    elements.pauseMenu.style.display = "none";
    gamePaused = false;

    updateText();
    await playWelcomeSound();
    spawnTarget();
    timer();
    startProjectileAttacks();
  };

  const startGame = async () => {
    elements.landingpage.style.display = "none";
    highscore = localStorage.getItem("highscore") || 0;
    resetGame();
    animateAim();
  };

  elements.clickToBegin.addEventListener("click", startGame);
  elements.restartBtn.addEventListener("click", resetGame);

  const togglePauseGame = () => {
    gamePaused = !gamePaused;
    elements.pauseMenu.style.display = gamePaused ? "block" : "none";

    if (gamePaused) {
      clearInterval(timerInterval);
      cancelAnimationFrame(animationFrameId);
      elements.projectile.style.display = "none";
    } else {
      // Re-sync aim UI and re-enable mouse control
      elements.aim.style.left = `${aimPosition.x}px`;
      elements.aim.style.top = `${aimPosition.y}px`;
      isUsingKeyboard = false;

      timer();
      animateTarget();
      moveProjectile();
    }
  };

  elements.continueBtn.addEventListener("click", togglePauseGame);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") togglePauseGame();
  });
})();
