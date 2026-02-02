const { useState, useEffect, useRef } = React;

const Icon = ({ name, size = 20, className = "", style = {} }) => {
  useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  }, [name]);
  return (
    <span
      className={`flex items-center justify-center leading-none ${className}`}
      style={{
        color: style.color,
        width: size,
        height: size,
        minWidth: size, // Évite l'écrasement
        minHeight: size,
      }}
    >
      <i data-lucide={name} style={{ width: size, height: size }}></i>
    </span>
  );
};

const PongGame = ({ accentColor = "#00ff00", onGameStateChange, isLowQuality }) => {
  const canvasRef = useRef(null);
  const mouseYRef = useRef(0);
  const trailRef = useRef([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(parseInt(localStorage.getItem("pong_highscore") || "0"));
  const keysPressed = useRef({});
  
  // Ref pour accès immédiat dans la boucle de jeu sans redémarrage
  const isLowQualityRef = useRef(isLowQuality);
  useEffect(() => { 
    isLowQualityRef.current = isLowQuality;
    if (isLowQuality) {
        trailRef.current = []; // Nettoyage immédiat
    }
  }, [isLowQuality]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem("pong_highscore", score);
    }
  }, [score]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      keysPressed.current[e.key] = true;
      if(["ArrowUp", "ArrowDown"].includes(e.key)) e.preventDefault();
    };
    const handleKeyUp = (e) => {
      keysPressed.current[e.key] = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const handleLockChange = () => {
      if (document.pointerLockElement === null && gameStarted) {
        setGameStarted(false);
      }
    };
    document.addEventListener("pointerlockchange", handleLockChange);
    return () => document.removeEventListener("pointerlockchange", handleLockChange);
  }, [gameStarted]);

  useEffect(() => {
    if (onGameStateChange) onGameStateChange(gameStarted);
  }, [gameStarted, onGameStateChange]);

  const gameParamsRef = useRef({
    playerY: 150,
    aiY: 150,
    ballX: 400,
    ballY: 150,
    ballVelX: 5.0,
    ballVelY: 3.0,
    playerScore: 0,
    aiScore: 0,
  });

  // Forcer le vert fluo (#00ff00)
  const pongColor = "#00ff00";
  const firstMoveRef = useRef(true);

  useEffect(() => {
    if (gameStarted) {
      mouseYRef.current = 150;
      firstMoveRef.current = true;
    }
  }, [gameStarted]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (gameStarted && canvasRef.current) {
        if (document.pointerLockElement === canvasRef.current) {
          mouseYRef.current += e.movementY;
          mouseYRef.current = Math.max(0, Math.min(300, mouseYRef.current));
        } else {
          // Ignorer le premier mouvement après le démarrage
          if (firstMoveRef.current) {
            firstMoveRef.current = false;
            return;
          }
          
          const rect = canvasRef.current.getBoundingClientRect();
          mouseYRef.current = e.clientY - rect.top;
        }
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [gameStarted]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const params = gameParamsRef.current;
    const PADDLE_HEIGHT = 80;
    const PADDLE_WIDTH = 10;
    const BALL_SIZE = 6;
    const CANVAS_WIDTH = canvas.width;
    const CANVAS_HEIGHT = canvas.height;

    let lastTime = performance.now();
    let animationId;

    const update = (timeScale) => {
      // Contrôle Clavier
      if (gameStarted) {
        if (keysPressed.current["ArrowUp"]) {
          mouseYRef.current = Math.max(0, mouseYRef.current - 10 * timeScale);
        }
        if (keysPressed.current["ArrowDown"]) {
          mouseYRef.current = Math.min(CANVAS_HEIGHT, mouseYRef.current + 10 * timeScale);
        }
      }

      // Contrôle du joueur avec la souris
      const targetY = mouseYRef.current - PADDLE_HEIGHT / 2;
      params.playerY = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, targetY));

      // IA (suit la balle avec difficulté)
      const aiCenter = params.aiY + PADDLE_HEIGHT / 2;
      const ballCenter = params.ballY;
      const aiSpeed = 6.0 * timeScale;

      if (aiCenter < ballCenter - 20) {
        params.aiY = Math.min(
          CANVAS_HEIGHT - PADDLE_HEIGHT,
          params.aiY + aiSpeed
        );
      } else if (aiCenter > ballCenter + 20) {
        params.aiY = Math.max(0, params.aiY - aiSpeed);
      }

      // Mouvement de la balle
      params.ballX += params.ballVelX * timeScale;
      params.ballY += params.ballVelY * timeScale;

      // Ajouter à la trace (trail)
      if (!isLowQualityRef.current) {
        trailRef.current.push({
          x: params.ballX,
          y: params.ballY,
          life: 1,
        });

        // Garder seulement les derniers points de la trace
        if (trailRef.current.length > 15) {
          trailRef.current.shift();
        }
      } else {
        trailRef.current = [];
      }

      // Rebond haut/bas
      if (params.ballY <= 0 || params.ballY >= CANVAS_HEIGHT - BALL_SIZE) {
        params.ballVelY *= -1;
        params.ballY = Math.max(0, Math.min(CANVAS_HEIGHT - BALL_SIZE, params.ballY));
      }

      // Collision avec raquette joueur
      if (
        params.ballX <= PADDLE_WIDTH &&
        params.ballY + BALL_SIZE >= params.playerY &&
        params.ballY <= params.playerY + PADDLE_HEIGHT
      ) {
        params.ballVelX *= -1;
        params.ballX = PADDLE_WIDTH;
        const hitPos = (params.ballY - params.playerY) / PADDLE_HEIGHT - 0.5;
        params.ballVelY += hitPos * 3;
      }

      // Collision avec raquette IA
      if (
        params.ballX >= CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE &&
        params.ballY + BALL_SIZE >= params.aiY &&
        params.ballY <= params.aiY + PADDLE_HEIGHT
      ) {
        params.ballVelX *= -1;
        params.ballX = CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE;
        const hitPos = (params.ballY - params.aiY) / PADDLE_HEIGHT - 0.5;
        params.ballVelY += hitPos * 3;
      }

      // Balle sort du terrain
      if (params.ballX < 0) {
        params.aiScore++;
        setScore(s => Math.max(0, s - 50));
        params.ballX = CANVAS_WIDTH / 2;
        params.ballY = CANVAS_HEIGHT / 2;
        params.ballVelX = 5.0;
        params.ballVelY = 3.0;
      } else if (params.ballX > CANVAS_WIDTH) {
        params.playerScore++;
        setScore(s => s + 50);
        params.ballX = CANVAS_WIDTH / 2;
        params.ballY = CANVAS_HEIGHT / 2;
        params.ballVelX = -5.0;
        params.ballVelY = 3.0;
      }
    };

    const draw = (fps = 0) => {
      // Fond noir de CRT
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Grille simplifiée (Optimisation majeure)
      ctx.strokeStyle = pongColor;
      ctx.globalAlpha = 0.1;
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.globalAlpha = 1;

      // Trace de la balle (trail)
      if (!isLowQualityRef.current) {
        trailRef.current.forEach((point, index) => {
          const opacity = (index / trailRef.current.length) * 0.3;
          ctx.fillStyle = pongColor;
          ctx.globalAlpha = opacity;
          ctx.beginPath();
          ctx.arc(point.x, point.y, BALL_SIZE / 3, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      }

      // Raquettes avec glow oscilloscope
      ctx.fillStyle = pongColor;
      ctx.fillRect(0, params.playerY, PADDLE_WIDTH, PADDLE_HEIGHT);
      ctx.fillRect(
        CANVAS_WIDTH - PADDLE_WIDTH,
        params.aiY,
        PADDLE_WIDTH,
        PADDLE_HEIGHT
      );

      // Balle avec glow
      ctx.beginPath();
      ctx.arc(params.ballX, params.ballY, BALL_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();

      // Ligne du milieu
      ctx.strokeStyle = pongColor;
      ctx.globalAlpha = 0.3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH / 2, 0);
      ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // Score
      ctx.fillStyle = pongColor;
      ctx.font = "bold 24px 'JetBrains Mono'";
      ctx.textAlign = "center";
      ctx.fillText(params.playerScore, CANVAS_WIDTH / 4, 40);
      ctx.fillText(params.aiScore, (CANVAS_WIDTH * 3) / 4, 40);

      // FPS
      ctx.font = "10px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`FPS: ${Math.round(fps)}`, CANVAS_WIDTH - 10, CANVAS_HEIGHT - 10);
    };

    const gameLoop = (timestamp) => {
      const deltaTime = timestamp - lastTime;
      lastTime = timestamp;

      const safeDelta = Math.min(deltaTime, 100); // Évite les sauts énormes si tab inactif
      const timeScale = safeDelta / 16.67; // Normalisation base 60fps
      const fps = safeDelta > 0 ? 1000 / safeDelta : 60;

      if (gameStarted) update(timeScale);
      draw(fps);
      
      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);

    return () => cancelAnimationFrame(animationId);
  }, [accentColor, gameStarted]);

  return (
    <div className="w-full flex flex-col bg-black" style={{ cursor: gameStarted ? "none" : "auto" }}>
        {/* Header CRT */}
        <div
          className="px-6 py-2 font-bold text-xs tracking-widest uppercase flex justify-between"
          style={{ backgroundColor: "#000000", color: "#00ff00", borderBottom: `2px solid #00ff00` }}
        >
          <span>PONG_OSCILLOSCOPE_V1.0</span>
          <div className="flex gap-4">
            <span>HI: {highScore}</span>
            <span>SCORE: {score}</span>
          </div>
        </div>

        {/* Canvas */}
        <div 
          className="relative w-full" 
          style={{ position: "relative", aspectRatio: "800/300" }}
          onClick={() => {
            if (gameStarted) canvasRef.current?.requestPointerLock();
          }}
        >
          <canvas
            ref={canvasRef}
            width={800}
            height={300}
            className="w-full block"
            style={{ backgroundColor: "#000000", display: "block" }}
          />
          
          {/* Écran de lancement */}
          {!gameStarted && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10"
              style={{ backgroundColor: "#000000" }}
            >
              <div className="text-center">
                <div className="text-4xl font-bold mb-6" style={{ color: "#00ff00", textShadow: "0 0 20px #00ff00" }}>
                  PONG
                </div>
                <button
                  onClick={() => {
                    setGameStarted(true);
                    canvasRef.current?.requestPointerLock();
                  }}
                  className="px-8 py-3 font-bold text-lg border-2 rounded-lg hover:opacity-75 transition-all"
                  style={{
                    color: "#00ff00",
                    borderColor: "#00ff00",
                    backgroundColor: "transparent",
                    textShadow: "0 0 10px #00ff00",
                    boxShadow: "0 0 20px rgba(0, 255, 0, 0.3)",
                  }}
                >
                  ▶ JOUER
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div
          className="px-6 py-3 text-xs font-mono text-center"
          style={{ backgroundColor: "#000000", color: "#00ff00", borderTop: `2px solid #00ff00` }}
        >
          <p className="text-sm">SOURIS ou FLÈCHES pour contrôler | ESC pour quitter</p>
        </div>
    </div>
  );
};

const SnakeGame = ({ accentColor, onGameStateChange, controlMode, setControlMode }) => {
  const canvasRef = useRef(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(parseInt(localStorage.getItem("snake_highscore") || "0"));

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem("snake_highscore", score);
    }
  }, [score]);

  // Refs pour la logique de jeu (évite les re-renders)
  const snakeRef = useRef([]);
  const prevSnakeRef = useRef([]);
  const directionRef = useRef({ x: 1, y: 0 });
  const directionQueueRef = useRef([]); // Buffer pour les inputs
  const foodRef = useRef({ x: 0, y: 0 });
  const obstaclesRef = useRef([]);
  const isDyingRef = useRef(false);
  const isEatingRef = useRef(false);
  const eatenFoodRef = useRef({ x: 0, y: 0 });
  const lastUpdateRef = useRef(0);
  const lastFrameRef = useRef(performance.now());
  const animationRef = useRef(null);

  // Constantes
  const GRID_SIZE = 40;
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 300;
  const COLS = Math.floor(CANVAS_WIDTH / GRID_SIZE);
  const ROWS = Math.floor(CANVAS_HEIGHT / GRID_SIZE);
  const OFFSET_Y = (CANVAS_HEIGHT - ROWS * GRID_SIZE) / 2;
  const SPEED = 150; // ms entre chaque mouvement

  // Initialisation
  const initGame = () => {
    snakeRef.current = [
      { x: 5, y: 3 },
      { x: 4, y: 3 },
      { x: 3, y: 3 },
    ];
    obstaclesRef.current = [];
    prevSnakeRef.current = [...snakeRef.current];
    directionRef.current = { x: 1, y: 0 };
    directionQueueRef.current = []; // Reset buffer
    isDyingRef.current = false;
    isEatingRef.current = false;
    spawnFood();
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    lastUpdateRef.current = performance.now();
  };

  const spawnFood = () => {
    let newFood;
    let isOnSnake;
    let isOnObstacle;
    do {
      newFood = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS),
      };
      isOnSnake = snakeRef.current.some(
        (segment) => segment.x === newFood.x && segment.y === newFood.y
      );
      isOnObstacle = obstaclesRef.current.some(
        (obs) => obs.x === newFood.x && obs.y === newFood.y
      );
    } while (isOnSnake || isOnObstacle);
    foodRef.current = newFood;
  };

  useEffect(() => {
    if (onGameStateChange) onGameStateChange(gameStarted);
  }, [gameStarted, onGameStateChange]);

  // Gestion des contrôles
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Empêcher le scroll par défaut avec les flèches
      if(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key) || 
         ["z", "q", "s", "d", "w", "a"].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }

      if (e.key === "Escape") {
        if (gameStarted) {
            setGameStarted(false);
        }
        return;
      }

      const key = e.key.toLowerCase();
      let newDir = null;

      // Mapping des touches selon le mode
      const upKeys = controlMode === "ZQSD" ? ["arrowup", "z"] : ["arrowup", "w"];
      const leftKeys = controlMode === "ZQSD" ? ["arrowleft", "q"] : ["arrowleft", "a"];
      const downKeys = controlMode === "ZQSD" ? ["arrowdown", "s"] : ["arrowdown", "s"];
      const rightKeys = controlMode === "ZQSD" ? ["arrowright", "d"] : ["arrowright", "d"];

      if (upKeys.includes(key)) newDir = { x: 0, y: -1 };
      else if (downKeys.includes(key)) newDir = { x: 0, y: 1 };
      else if (leftKeys.includes(key)) newDir = { x: -1, y: 0 };
      else if (rightKeys.includes(key)) newDir = { x: 1, y: 0 };

      // Démarrage rapide avec une touche de direction
      if (!gameStarted && newDir) {
        initGame();
        return;
      }

      if (!gameStarted || !newDir) return;
      
      // Logique du Buffer : on regarde la dernière direction planifiée
      const lastScheduledDir = directionQueueRef.current.length > 0 
        ? directionQueueRef.current[directionQueueRef.current.length - 1] 
        : directionRef.current;

      // Empêcher le demi-tour immédiat sur la dernière direction planifiée
      if (newDir.x !== -lastScheduledDir.x || newDir.y !== -lastScheduledDir.y) {
        // On évite aussi d'empiler la même direction inutilement
        if (newDir.x !== lastScheduledDir.x || newDir.y !== lastScheduledDir.y) {
             // Limite la taille du buffer à 2 pour éviter trop de latence si on bourrine
            if (directionQueueRef.current.length < 2) {
                directionQueueRef.current.push(newDir);
            }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameStarted, controlMode]);

  // Boucle de jeu
  useEffect(() => {
    if (!gameStarted || gameOver) {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        return;
    }

    const loop = (timestamp) => {
      const deltaTime = timestamp - lastFrameRef.current;
      lastFrameRef.current = timestamp;
      const fps = deltaTime > 0 ? 1000 / deltaTime : 60;

      if (!isDyingRef.current && timestamp - lastUpdateRef.current > SPEED) {
        update();
        lastUpdateRef.current = timestamp;
      }
      draw(timestamp, fps);
      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [gameStarted, gameOver]);

  const update = () => {
    if (isDyingRef.current) return;

    prevSnakeRef.current = [...snakeRef.current];
    // Consommer le buffer
    if (directionQueueRef.current.length > 0) {
        directionRef.current = directionQueueRef.current.shift();
    }

    const head = { ...snakeRef.current[0] };
    head.x += directionRef.current.x;
    head.y += directionRef.current.y;

    // Collision Murs
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
      isDyingRef.current = true;
      snakeRef.current.unshift(head);
      snakeRef.current.pop();
      return;
    }

    // Collision Obstacles
    if (obstaclesRef.current.some((obs) => obs.x === head.x && obs.y === head.y)) {
      isDyingRef.current = true;
      snakeRef.current.unshift(head);
      snakeRef.current.pop();
      return;
    }

    // Collision Soi-même
    // On exclut la queue car elle va bouger (sauf si on mange, mais la nourriture n'est pas sur le corps)
    if (snakeRef.current.slice(0, -1).some((segment) => segment.x === head.x && segment.y === head.y)) {
      isDyingRef.current = true;
      snakeRef.current.unshift(head);
      snakeRef.current.pop();
      return;
    }

    snakeRef.current.unshift(head);

    // Manger la nourriture
    if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      isEatingRef.current = true;
      eatenFoodRef.current = { ...foodRef.current };
      setScore((s) => s + 10);
      spawnFood();
      // Pas de pop(), le serpent grandit
      
      // Apparition d'un obstacle tous les 5 fruits mangés
      const eatenCount = snakeRef.current.length - 3;
      if (Math.floor(eatenCount / 5) > obstaclesRef.current.length) {
        let obs;
        do {
          obs = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
        } while (
          snakeRef.current.some((s) => s.x === obs.x && s.y === obs.y) ||
          (foodRef.current.x === obs.x && foodRef.current.y === obs.y) ||
          (head.x === obs.x && head.y === obs.y) ||
          obstaclesRef.current.some((o) => o.x === obs.x && o.y === obs.y)
        );
        obstaclesRef.current.push(obs);
      }
    } else {
      isEatingRef.current = false;
      snakeRef.current.pop();
    }
  };

  const draw = (timestamp = performance.now(), fps = 0) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const progress = Math.min((timestamp - lastUpdateRef.current) / SPEED, 1);

    if (isDyingRef.current && progress >= 1) {
      setGameOver(true);
      return;
    }

    // Fond
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    ctx.translate(0, OFFSET_Y);

    // Grille
    ctx.strokeStyle = "#003300";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ROWS * GRID_SIZE);
    }
    for (let y = 0; y <= ROWS * GRID_SIZE; y += GRID_SIZE) {
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
    }
    ctx.stroke();

    // Obstacles (Boule Rouge)
    ctx.fillStyle = "#ef4444";
    obstaclesRef.current.forEach((obs) => {
      const x = obs.x * GRID_SIZE + GRID_SIZE / 2;
      const y = obs.y * GRID_SIZE + GRID_SIZE / 2;
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();
    });

    // Serpent (Style Signal avec interpolation)
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    // Dessin du serpent avec angles droits (Logique Grid-Based)
    ctx.beginPath();
    if (snakeRef.current.length > 0) {
        const snake = snakeRef.current;
        const prevSnake = prevSnakeRef.current;
        const didEat = snake.length > prevSnake.length;

        // 1. Tête interpolée (Extension fluide)
        let headX, headY;
        if (snake.length > 1) {
             const p1 = snake[1]; // Ancienne tête
             const p0 = snake[0]; // Nouvelle tête
             headX = p1.x + (p0.x - p1.x) * progress;
             headY = p1.y + (p0.y - p1.y) * progress;
        } else {
             headX = snake[0].x;
             headY = snake[0].y;
        }
        
        ctx.moveTo(headX * GRID_SIZE + GRID_SIZE/2, headY * GRID_SIZE + GRID_SIZE/2);
        
        // 2. Corps statique (Angles droits parfaits sur la grille)
        for (let i = 1; i < snake.length; i++) {
            ctx.lineTo(snake[i].x * GRID_SIZE + GRID_SIZE/2, snake[i].y * GRID_SIZE + GRID_SIZE/2);
        }
        
        // 3. Queue interpolée (Rétraction fluide)
        if (!didEat && prevSnake.length > 0) {
            const currentTail = snake[snake.length - 1];
            const oldTail = prevSnake[prevSnake.length - 1];
            
            const tailX = oldTail.x + (currentTail.x - oldTail.x) * progress;
            const tailY = oldTail.y + (currentTail.y - oldTail.y) * progress;
            
            ctx.lineTo(tailX * GRID_SIZE + GRID_SIZE/2, tailY * GRID_SIZE + GRID_SIZE/2);
        }
    }
    ctx.stroke();
    
    // Tête (Point brillant) - Suit la position interpolée calculée plus haut
    if (snakeRef.current.length > 0) {
        // Recalcul rapide pour le point blanc
        let hX, hY;
        if (snakeRef.current.length > 1) {
             const p1 = snakeRef.current[1];
             const p0 = snakeRef.current[0];
             hX = p1.x + (p0.x - p1.x) * progress;
             hY = p1.y + (p0.y - p1.y) * progress;
        } else {
             hX = snakeRef.current[0].x;
             hY = snakeRef.current[0].y;
        }
        
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(hX * GRID_SIZE + GRID_SIZE/2, hY * GRID_SIZE + GRID_SIZE/2, 12, 0, Math.PI * 2);
        ctx.fill();
    }

    // Nourriture mangée (reste affichée pendant la transition)
    if (isEatingRef.current) {
        const ex = eatenFoodRef.current.x * GRID_SIZE + GRID_SIZE / 2;
        const ey = eatenFoodRef.current.y * GRID_SIZE + GRID_SIZE / 2;
        
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.moveTo(ex, ey - 12);
        ctx.lineTo(ex + 12, ey);
        ctx.lineTo(ex, ey + 12);
        ctx.lineTo(ex - 12, ey);
        ctx.closePath();
        ctx.fill();
    }

    // Nourriture (Glitch)
    if (!isEatingRef.current) {
      const foodX = foodRef.current.x * GRID_SIZE + GRID_SIZE / 2;
      const foodY = foodRef.current.y * GRID_SIZE + GRID_SIZE / 2;
      
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      // Forme de losange pour le glitch
      ctx.moveTo(foodX, foodY - 12);
      ctx.lineTo(foodX + 12, foodY);
      ctx.lineTo(foodX, foodY + 12);
      ctx.lineTo(foodX - 12, foodY);
      ctx.closePath();
      ctx.fill();
      
    }

    // FPS
    ctx.fillStyle = accentColor;
    ctx.font = "10px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`FPS: ${Math.round(fps)}`, CANVAS_WIDTH - 10, CANVAS_HEIGHT - 10);

    ctx.restore();
  };

  // Rendu initial (écran titre ou game over)
  useEffect(() => {
    if (!gameStarted || gameOver) {
        draw(); // Dessiner au moins une frame (grille etc)
    }
  }, [gameStarted, gameOver]);

  return (
    <div className="w-full flex flex-col bg-black h-full">
        <div
          className="px-6 py-2 font-bold text-xs tracking-widest uppercase flex justify-between"
          style={{ backgroundColor: "#000000", color: accentColor, borderBottom: `2px solid ${accentColor}` }}
        >
          <span>SNAKE_SIGNAL_V1.0</span>
          <div className="flex gap-4">
            <span>HI: {highScore}</span>
            <span>SCORE: {score}</span>
          </div>
        </div>
        <div className="relative w-full" style={{ position: "relative", aspectRatio: "800/300" }}>
            <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="block w-full"
                style={{ backgroundColor: "#000000", display: "block" }}
            />
            
            {/* Overlay Start / Game Over */}
            {(!gameStarted || gameOver) && (
                <div 
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10"
                  style={{ backgroundColor: "#000000" }}
                >
                    <div className="text-center">
                        <div className="text-4xl font-bold mb-6" style={{ color: accentColor, textShadow: `0 0 20px ${accentColor}` }}>
                            {gameOver ? "SIGNAL LOST" : "SNAKE"}
                        </div>
                        {gameOver && <div className="text-white mb-6 font-mono">SCORE FINAL: {score}</div>}
                        
                        <button
                            onClick={initGame}
                            className="px-8 py-3 font-bold text-lg border-2 rounded-lg hover:opacity-75 transition-all"
                            style={{ 
                              color: accentColor, 
                              borderColor: accentColor,
                              backgroundColor: "transparent",
                              textShadow: `0 0 10px ${accentColor}`,
                              boxShadow: `0 0 20px ${accentColor}40`,
                            }}
                        >
                            {gameOver ? "RETRY_CONNECTION" : "▶ JOUER"}
                        </button>
                    </div>
                </div>
            )}
        </div>
        <div
          className="relative px-6 py-3 text-xs font-mono text-center"
          style={{ backgroundColor: "#000000", color: accentColor, borderTop: `2px solid ${accentColor}` }}
        >
          <p className="text-sm">FLÈCHES ou {controlMode} pour contrôler | ESC pour quitter</p>
          <button 
            onClick={() => setControlMode(m => m === "ZQSD" ? "WASD" : "ZQSD")}
            className="absolute right-6 top-1/2 -translate-y-1/2 px-2 py-1 border rounded hover:bg-white/10 transition-colors text-[10px] font-bold"
            style={{ borderColor: accentColor, color: accentColor }}
          >
            MODE: {controlMode}
          </button>
        </div>
    </div>
  );
};

const LunarLanderGame = ({ accentColor, onGameStateChange, controlMode, setControlMode, isLowQuality }) => {
  const canvasRef = useRef(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(parseInt(localStorage.getItem("lunar_highscore") || "0"));
  const waitingForInputRef = useRef(false);

  // Ref pour accès immédiat dans la boucle de jeu
  const isLowQualityRef = useRef(isLowQuality);
  useEffect(() => { 
    isLowQualityRef.current = isLowQuality;
    if (isLowQuality) {
        particlesRef.current = []; // Nettoyage immédiat
    }
  }, [isLowQuality]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem("lunar_highscore", score);
    }
  }, [score]);

  const landerRef = useRef({
    x: 400, y: 50,
    vx: 0, vy: 0,
    angle: -Math.PI / 2, // Pointe vers le haut (-90deg)
    thrusting: false
  });
  const keysRef = useRef({});
  const terrainRef = useRef([]);
  const padRef = useRef({ x: 0, width: 0, y: 0 });
  const particlesRef = useRef([]);
  const fuelRef = useRef(100);
  const animationRef = useRef(null);

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 300;
  const GRAVITY = 0.025;
  const THRUST_POWER = 0.05;
  const ROTATION_SPEED = 0.02;

  useEffect(() => {
    if (onGameStateChange) onGameStateChange(gameStarted);
  }, [gameStarted, onGameStateChange]);

  const initGame = (keepScore = false) => {
    const points = [];
    const segments = 60;
    const segmentWidth = CANVAS_WIDTH / segments;
    let padSegment = Math.floor(Math.random() * (segments - 25)) + 15;
    
    const baseHeight = CANVAS_HEIGHT - 20;

    for (let i = 0; i <= segments; i++) {
        let h;
        if (i >= padSegment && i <= padSegment + 4) {
            h = baseHeight - 50; 
        } else {
            const noise = Math.sin(i * 0.3) * 30 + Math.sin(i * 0.8) * 15 + Math.random() * 10;
            h = baseHeight - 30 - noise;
        }
        points.push({ x: i * segmentWidth, y: h });
    }
    
    // Calcul de la taille de la plateforme selon le score
    // Départ : 6 segments (plus grand). Fin : 1.6 segments (2.5x plus petit que 4).
    const currentScore = keepScore ? score : 0;
    const maxScore = 1000;
    const startWidth = 6;
    const minWidth = 1.6;
    const difficulty = Math.min(currentScore / maxScore, 1);
    const widthSegments = startWidth - (startWidth - minWidth) * difficulty;

    const padY = points[padSegment].y;
    for(let i = 0; i <= Math.ceil(widthSegments); i++) {
        points[padSegment + i].y = padY;
    }

    terrainRef.current = points;
    padRef.current = {
        x: points[padSegment].x,
        width: segmentWidth * widthSegments,
        y: padY
    };
    
    landerRef.current = {
        x: 50, y: 50,
        vx: 0.5, vy: 0,
        angle: -Math.PI / 2,
        thrusting: false
    };
    
    particlesRef.current = [];

    fuelRef.current = 100;
    setVictory(false);
    setGameOver(false);
    setGameStarted(true);
    waitingForInputRef.current = true;
    if (!keepScore) setScore(0);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if(["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "z", "q", "s", "d", "w", "a"].includes(key)) {
        e.preventDefault();
      }
      keysRef.current[key] = true;
      keysRef.current[e.key] = true; // Garder la compatibilité

      if (gameStarted && waitingForInputRef.current) {
        if (["arrowup", "arrowleft", "arrowright", " ", "z", "q", "s", "d", "w", "a"].includes(key)) {
            waitingForInputRef.current = false;
        }
      }

      if (e.key === "Escape") {
        if (gameStarted) setGameStarted(false);
      }
      
      if (!gameStarted && ["arrowup", "arrowleft", "arrowright", " ", "z", "q", "s", "d", "w", "a"].includes(key)) {
        initGame(victory);
      }
    };
    
    const handleKeyUp = (e) => {
      keysRef.current[e.key.toLowerCase()] = false;
      keysRef.current[e.key] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameStarted, victory]);

  // Optimisation FPS Lunar Lander
  const lastTimeRef = useRef(performance.now());

  useEffect(() => {
    if (!gameStarted || gameOver || victory) {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        if (canvasRef.current) draw();
        return;
    }

    const loop = (timestamp) => {
        const deltaTime = timestamp - lastTimeRef.current;
        lastTimeRef.current = timestamp;

        const safeDelta = Math.min(deltaTime, 100);
        const timeScale = safeDelta / 16.67;
        const fps = safeDelta > 0 ? 1000 / safeDelta : 60;

        update(timeScale);
        draw(fps);
        
        animationRef.current = requestAnimationFrame(loop);
    };
    animationRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [gameStarted, gameOver, victory]);

  const update = (timeScale) => {
    if (waitingForInputRef.current) return;
    const lander = landerRef.current;
    const k = keysRef.current;
    
    const upKeys = controlMode === "ZQSD" ? ["arrowup", " ", "z"] : ["arrowup", " ", "w"];
    const leftKeys = controlMode === "ZQSD" ? ["arrowleft", "q"] : ["arrowleft", "a"];
    const rightKeys = controlMode === "ZQSD" ? ["arrowright", "d"] : ["arrowright", "d"];

    lander.thrusting = upKeys.some(key => k[key]) && fuelRef.current > 0;

    // Rotation (ajoutée pour jouabilité)
    if (leftKeys.some(key => k[key])) lander.angle -= ROTATION_SPEED * timeScale;
    if (rightKeys.some(key => k[key])) lander.angle += ROTATION_SPEED * timeScale;

    if (lander.thrusting) {
        lander.vx += Math.cos(lander.angle) * THRUST_POWER * timeScale;
        lander.vy += Math.sin(lander.angle) * THRUST_POWER * timeScale;
        fuelRef.current = Math.max(0, fuelRef.current - (0.2 / 1.5) * timeScale);
        
        if (!isLowQualityRef.current) {
            for(let i=0; i<1; i++) { // Réduction particules (3 -> 1)
                particlesRef.current.push({
                    x: lander.x - Math.cos(lander.angle) * 8,
                    y: lander.y - Math.sin(lander.angle) * 8,
                    vx: lander.vx - Math.cos(lander.angle) * 3 + (Math.random()-0.5),
                    vy: lander.vy - Math.sin(lander.angle) * 3 + (Math.random()-0.5),
                    life: 1.0
                });
            }
        }
    }

    lander.vy += GRAVITY * timeScale;
    lander.x += lander.vx * timeScale;
    lander.y += lander.vy * timeScale;

    particlesRef.current.forEach(p => {
        p.x += p.vx * timeScale;
        p.y += p.vy * timeScale;
        p.life -= 0.05 * timeScale;
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

    if (lander.x < 0 || lander.x > CANVAS_WIDTH || lander.y < 0) {
        setGameOver(true);
    }

    const segmentCount = terrainRef.current.length - 1;
    const segmentW = CANVAS_WIDTH / segmentCount;
    const idx = Math.floor(lander.x / segmentW);
    
    if (idx >= 0 && idx < segmentCount) {
        const p1 = terrainRef.current[idx];
        const p2 = terrainRef.current[idx+1];
        const ratio = (lander.x - p1.x) / segmentW;
        const groundY = p1.y + (p2.y - p1.y) * ratio;
        
        if (lander.y + 6 >= groundY) {
            const isOnPad = lander.x >= padRef.current.x && lander.x <= padRef.current.x + padRef.current.width;
            const isSlow = Math.abs(lander.vy) < 2.5 && Math.abs(lander.vx) < 2.5;
            
            let normAngle = Math.atan2(Math.sin(lander.angle), Math.cos(lander.angle));
            const isUpright = Math.abs(normAngle - (-Math.PI/2)) < 0.5;
            
            if (isOnPad && isSlow && isUpright) {
                setVictory(true);
                setScore(s => s + 100 + Math.floor(fuelRef.current));
            } else {
                setGameOver(true);
            }
        }
    }
  };

  const draw = (fps = 0) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const lander = landerRef.current;

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Terrain
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (terrainRef.current.length > 0) {
        ctx.moveTo(terrainRef.current[0].x, terrainRef.current[0].y);
        for (let i = 1; i < terrainRef.current.length; i++) {
            ctx.lineTo(terrainRef.current[i].x, terrainRef.current[i].y);
        }
    }
    ctx.stroke();
    
    // Pad Highlight
    if (padRef.current.width > 0) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(padRef.current.x, padRef.current.y);
        ctx.lineTo(padRef.current.x + padRef.current.width, padRef.current.y);
        ctx.stroke();
        
        ctx.fillStyle = "#ffffff";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("LZ", padRef.current.x + padRef.current.width/2, padRef.current.y + 15);
    }

    // Lander
    ctx.save();
    ctx.translate(lander.x, lander.y);
    ctx.rotate(lander.angle);
    
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.fillStyle = "#000000";
    
    // Triangle shape
    ctx.beginPath();
    ctx.moveTo(10, 0); // Nose
    ctx.lineTo(-8, 6);
    ctx.lineTo(-4, 0); // Engine recess
    ctx.lineTo(-8, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Flame
    if (lander.thrusting) {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(-15 - Math.random()*10, 0);
        ctx.lineTo(-6, 2);
        ctx.fill();
    }
    
    ctx.restore();

    // Particles
    if (!isLowQualityRef.current) {
        particlesRef.current.forEach(p => {
            ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1, 0, Math.PI*2);
            ctx.fill();
        });
    }
    
    // HUD
    ctx.fillStyle = accentColor;
    ctx.font = "10px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`FUEL: ${Math.floor(fuelRef.current)}%`, 10, 20);
    ctx.fillText(`ALT: ${Math.max(0, Math.floor(CANVAS_HEIGHT - lander.y - 20))}`, 10, 35);
    ctx.fillText(`VX: ${lander.vx.toFixed(1)}`, 10, 50);
    ctx.fillText(`VY: ${lander.vy.toFixed(1)}`, 10, 65);
    ctx.fillText(`FPS: ${Math.round(fps)}`, 10, 80);

    if (waitingForInputRef.current) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px monospace";
        ctx.textAlign = "center";
        ctx.fillText("APPUYEZ SUR UNE TOUCHE", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 50);
    }
  };

  return (
    <div className="w-full flex flex-col bg-black h-full">
        <div
          className="px-6 py-2 font-bold text-xs tracking-widest uppercase flex justify-between"
          style={{ backgroundColor: "#000000", color: accentColor, borderBottom: `2px solid ${accentColor}` }}
        >
          <span>LUNAR_LANDER_V0.5</span>
          <div className="flex gap-4">
            <span>HI: {highScore}</span>
            <span>SCORE: {score}</span>
          </div>
        </div>
        <div className="relative w-full bg-black flex flex-col items-center justify-center" style={{ aspectRatio: "800/300" }}>
            <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="block w-full"
                style={{ backgroundColor: "#000000", display: "block" }}
            />
            
            {/* Overlay Start / Game Over */}
            {(!gameStarted || gameOver || victory) && (
                <div 
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10"
                  style={{ backgroundColor: "#000000" }}
                >
                    <div className="text-center">
                        <div className="text-4xl font-bold mb-6" style={{ color: accentColor, textShadow: `0 0 20px ${accentColor}` }}>
                            {victory ? "LANDING SUCCESS" : (gameOver ? "CRITICAL FAILURE" : "LUNAR LANDER")}
                        </div>
                        {(gameOver || victory) && <div className="text-white mb-6 font-mono">SCORE: {score}</div>}
                        
                        <button
                            onClick={() => initGame(victory)}
                            className="px-8 py-3 font-bold text-lg border-2 rounded-lg hover:opacity-75 transition-all"
                            style={{ 
                              color: accentColor, 
                              borderColor: accentColor,
                              backgroundColor: "transparent",
                              textShadow: `0 0 10px ${accentColor}`,
                              boxShadow: `0 0 20px ${accentColor}40`,
                            }}
                        >
                            {victory ? "CONTINUE" : (gameOver ? "RETRY" : "▶ JOUER")}
                        </button>
                    </div>
                </div>
            )}
        </div>
        <div
          className="relative px-6 py-3 text-xs font-mono text-center"
          style={{ backgroundColor: "#000000", color: accentColor, borderTop: `2px solid ${accentColor}` }}
        >
          <p className="text-sm">
            HAUT/{controlMode === "ZQSD" ? "Z" : "W"} pour propulser | GAUCHE/DROITE ou {controlMode === "ZQSD" ? "Q/D" : "A/D"} pour tourner | ESC pour quitter
          </p>
          <button 
            onClick={() => setControlMode(m => m === "ZQSD" ? "WASD" : "ZQSD")}
            className="absolute right-6 top-1/2 -translate-y-1/2 px-2 py-1 border rounded hover:bg-white/10 transition-colors text-[10px] font-bold"
            style={{ borderColor: accentColor, color: accentColor }}
          >
            MODE: {controlMode}
          </button>
        </div>
    </div>
  );
};

const ArcadeModal = ({ onClose, accentColor = "#00ff00", isLowQuality }) => {
  const [gameIndex, setGameIndex] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [controlMode, setControlMode] = useState("ZQSD");

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  // Gestion du scroll global pour la modale Arcade
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Navigation au clavier
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameActive) return; // On ne change pas de jeu si une partie est en cours
      
      if (e.key === "ArrowLeft") prevGame(e);
      if (e.key === "ArrowRight") nextGame(e);
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameActive, onClose, gameIndex]); // Dépendances mises à jour

  const games = [
    { id: 'pong', component: PongGame },
    { id: 'snake', component: SnakeGame },
    { id: 'lunar', component: LunarLanderGame },
  ];

  const CurrentGame = games[gameIndex].component;

  const nextGame = (e) => { 
    if (e) e.stopPropagation();
    setGameActive(false);
    setGameIndex((prev) => (prev + 1) % games.length);
  };
  
  const prevGame = (e) => {
    if (e) e.stopPropagation();
    setGameActive(false);
    setGameIndex((prev) => (prev - 1 + games.length) % games.length);
  };

  return (
    <div 
        className="fixed inset-0 z-[101] modal-overlay flex items-center justify-center p-4"
        onClick={handleClose}
    >
        <div className={`relative w-full max-w-5xl flex items-center justify-center gap-4 md:gap-8 ${isClosing ? "animate-modal-close" : "animate-modal-content"}`}>
            {!gameActive && (
                <button 
                    onClick={prevGame} 
                    className="p-2 text-emerald-500 hover:text-yellow-400 transition-colors z-20 bg-transparent rounded-full"
                    style={{ filter: "drop-shadow(0 0 8px rgba(16, 185, 129, 0.8))" }}
                >
                    <Icon name="chevron-left" size={48} />
                </button>
            )}

            <div
                className="relative w-full max-w-4xl rounded-3xl overflow-hidden border-2 shadow-2xl"
                style={{ borderColor: accentColor, backgroundColor: "#000000", boxShadow: isLowQuality ? "none" : `0 0 30px ${accentColor}20` }}
                onClick={(e) => e.stopPropagation()}
            >
                {isLowQuality && (
                    <div className="absolute top-3 left-3 z-50 px-2 py-1 bg-red-900/90 border border-red-500 text-red-500 text-[10px] font-bold font-mono rounded pointer-events-none animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                        ⚠ LOW PERF
                    </div>
                )}
                <CurrentGame 
                    onClose={handleClose} 
                    accentColor={accentColor} 
                    onGameStateChange={setGameActive}
                    controlMode={controlMode}
                    setControlMode={setControlMode}
                    isLowQuality={isLowQuality}
                />
            </div>

            {!gameActive && (
                <button 
                    onClick={nextGame} 
                    className="p-2 text-emerald-500 hover:text-yellow-400 transition-colors z-20 bg-transparent rounded-full"
                    style={{ filter: "drop-shadow(0 0 8px rgba(16, 185, 129, 0.8))" }}
                >
                    <Icon name="chevron-right" size={48} />
                </button>
            )}
        </div>
    </div>
  );
};

const Oscilloscope = ({ temp = 32, accentColor = "#fbbf24", onClick }) => {
  const wavePath =
    "M0 25 Q 12.5 5, 25 25 T 50 25 T 75 25 T 100 25 T 125 25 T 150 25 T 175 25 T 200 25";
  
  const pathRef = useRef(null);
  const distanceRef = useRef(0);
  const animationSpeedRef = useRef(4);
  
  const animationSpeed = 4 - ((temp - 32) / 38) * 3.5;
  
  useEffect(() => {
    animationSpeedRef.current = animationSpeed;
  }, [animationSpeed]);
  
  useEffect(() => {
    let animationFrame;
    let lastTime = Date.now();
    
    const animate = () => {
      const now = Date.now();
      const deltaTime = (now - lastTime) / 1000;
      lastTime = now;
      
      const deltaDistance = (deltaTime / animationSpeedRef.current) * 200;
      distanceRef.current += deltaDistance;
      
      if (pathRef.current) {
        pathRef.current.style.strokeDashoffset = -distanceRef.current;
      }
      
      animationFrame = requestAnimationFrame(animate);
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, []);
  
  return (
    <div 
      className="scope-container rounded-xl overflow-hidden w-24 h-12 md:w-32 md:h-16 relative hidden sm:block opacity-80 shadow-lg cursor-pointer hover:opacity-100 transition-opacity"
      onClick={onClick}
      title="Cliquez pour jouer à PONG!"
    >
      <svg
        viewBox="0 0 100 50"
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        <g className="scope-grid">
          <line x1="0" y1="25" x2="100" y2="25" />
          <line x1="50" y1="0" x2="50" y2="50" />
        </g>
        <path 
          ref={pathRef}
          d={wavePath} 
          style={{
            stroke: accentColor,
            fill: "none",
            strokeWidth: 1.5,
            strokeLinecap: "round",
            filter: `drop-shadow(0 0 4px ${accentColor})`,
            strokeDasharray: 200
          }} 
        />
        <rect
          width="100%"
          height="100%"
          fill="url(#scan-pattern)"
          opacity="0.1"
        />
        <defs>
          <pattern
            id="scan-pattern"
            width="100%"
            height="2"
            patternUnits="userSpaceOnUse"
          >
            <line
              x1="0"
              y1="1"
              x2="100"
              y2="1"
              stroke="#000"
              strokeWidth="1"
              opacity="0.5"
            />
          </pattern>
        </defs>
      </svg>
      <div className="absolute top-1 right-1 text-[5px] font-mono text-emerald-500 uppercase tracking-tighter">
        CH1: 5V/div
      </div>
    </div>
  );
};

const ParticleBackground = React.memo(({ brightness, isLowQuality }) => {
  const canvasRef = useRef(null);
  // 1. Créer une référence pour stocker la luminosité sans reset l'effet
  const brightnessRef = useRef(brightness);
  const isLowQualityRef = useRef(isLowQuality);
  useEffect(() => { isLowQualityRef.current = isLowQuality; }, [isLowQuality]);

  // 2. Mettre à jour la référence quand la prop change (ne déclenche pas de re-render)
  useEffect(() => {
    brightnessRef.current = brightness;
  }, [brightness]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let particles = [];
    let mouse = { x: null, y: null };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("mousemove", (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });
    window.addEventListener("resize", resize);
    resize();

    // Initialisation unique des 40 particules
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: Math.random() * 0.5 - 0.25,
        speedY: Math.random() * 0.5 - 0.25,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 3. Utiliser la valeur de la REF ici pour la couleur
      ctx.fillStyle = `rgba(16, 185, 129, ${brightnessRef.current / 60})`;

      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;

        // Désactiver l'interaction souris en mode basse performance
        if (!isLowQualityRef.current && mouse.x) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            p.x += dx / 20;
            p.y += dy / 20;
          }
        }

        if (p.x > canvas.width) p.x = 0;
        if (p.x < 0) p.x = canvas.width;
        if (p.y > canvas.height) p.y = 0;
        if (p.y < 0) p.y = canvas.height;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(animate);
    };
    animate();

    // Cleanup
    return () => {
      window.removeEventListener("resize", resize);
      // On ne retire pas mousemove car il est sur window,
      // mais idéalement il faudrait une fonction de nettoyage propre ici.
    };
  }, []); // 4. LA DÉPENDANCE EST VIDE [] : On ne reset jamais les particules.

  return (
    <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />
  );
});

const App = () => {
  const [seconds, setSeconds] = useState(Math.floor(Math.random() * 5000000));
  const pcbRef = useRef(null);
  const tempValueRef = useRef(32.4);
  const [temp, setTemp] = useState(32.4); // Température actuelle

  const [isBooting, setIsBooting] = useState(true);
  const [bootLogs, setBootLogs] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [isEngaged, setIsEngaged] = useState(false);

  const [activeSection, setActiveSection] = useState("boot");
  const [modalItem, setModalItem] = useState(null);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [showPongGame, setShowPongGame] = useState(false);
  const contentRef = useRef(null);

  const [brightness, setBrightness] = useState(15);
  const [voltage, setVoltage] = useState(0);
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  // Détection automatique des performances (Globale)
  const [isLowQuality, setIsLowQuality] = useState(false);

  useEffect(() => {
    if (isLowQuality) return; // Si déjà en mode éco, on arrête de surveiller

    let lastTime = performance.now();
    let badFrames = 0;
    let rafId;

    const checkPerformance = () => {
      const now = performance.now();
      const delta = now - lastTime;
      lastTime = now;

      // Si FPS < 45 (delta > 22ms)
      if (delta > 22) badFrames++;
      else badFrames = Math.max(0, badFrames - 1);

      // Trigger plus rapide : 20 frames mauvaises (~300ms de lag continu)
      if (badFrames > 20) setIsLowQuality(true);
      else rafId = requestAnimationFrame(checkPerformance);
    };
    
    rafId = requestAnimationFrame(checkPerformance);
    return () => cancelAnimationFrame(rafId);
  }, [isLowQuality]);

  // Calcul de la tension en fonction du slider : 3.3V à 0%, 5V à 50%, 6.7V à 100%
  const calculatedVolt = (3.3 + (voltage / 100) * 3.4).toFixed(2);
  
  // Température cible basée sur la tension : augmente avec la tension
  // À 3.3V : 32°C, À 6.7V : 70°C
  const targetTemp = 32 + ((voltage / 100) * 38);

  // Calcul du tremblement basé sur la température : commence après 40°C, réduit de moitié
  const tempShakeIntensity = temp > 40 ? (temp - 40) / 60 : 0;
  
  // Tremblement combiné : dépend principalement de la température (intensité réduite)
  const shakeIntensity = tempShakeIntensity;

  const blinkSpeed = voltage > 50 ? `${3 - (voltage - 50) * 0.048}s` : "0s";

  const [ledIntensity, setLedIntensity] = useState(0);

  useEffect(() => {
    // LED intensité fixe basée sur la température
    if (temp > 40) {
      const intensity = Math.min(1, (temp - 40) / 30);
      setLedIntensity(intensity);
    } else {
      setLedIntensity(0);
    }
  }, [temp]);

  useEffect(() => {
    if (isBooting || modalItem) {
      document.body.style.overflow = "hidden";
      // On s'assure de remonter en haut de page au cas où
      if (isBooting) window.scrollTo(0, 0);
    } else {
      document.body.style.overflow = "auto";
    }

    // Nettoyage si le composant est démonté
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isBooting, modalItem]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && showPongGame) {
        // La fermeture est gérée par le composant ArcadeModal via pointerLock ou bouton
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown); // Le listener est maintenant dans ArcadeModal/PongGame
  }, [showPongGame]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getTrackColor = (isActive) => {
    // Basé sur la température : jaune (32°C) → rouge (60°C)
    const tempRatio = Math.min(1, Math.max(0, (temp - 32) / 28));
    if (!isActive)
      return `rgb(${6 + tempRatio * 120}, ${45 - tempRatio * 20}, ${36 - tempRatio * 20})`;
    return `rgb(${251 - tempRatio * 100}, ${191 - tempRatio * 150}, ${36 - tempRatio * 36})`;
  };

  const getLcdVoltageColor = () => {
    // Tension : 3.3V-5V vert, 5V-6V orange, 6V-6.7V rouge
    const voltRatio = (calculatedVolt - 3.3) / 3.4; // 0 à 1
    let r = 0, g = 150, b = 0;
    
    if (voltRatio < (5 - 3.3) / 3.4) {
      // Vert (3.3V à 5V)
      r = 0;
      g = 150;
      b = 0;
    } else if (voltRatio < (6 - 3.3) / 3.4) {
      // Vert à orange (5V à 6V)
      const localRatio = (voltRatio - (5 - 3.3) / 3.4) / ((6 - 5) / 3.4);
      r = localRatio * 200;
      g = 150;
      b = 0;
    } else {
      // Orange à rouge (6V à 6.7V)
      const localRatio = (voltRatio - (6 - 3.3) / 3.4) / ((6.7 - 6) / 3.4);
      r = 200 + localRatio * 55;
      g = 150 * (1 - localRatio);
      b = 0;
    }

    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  };

  const getLcdTempColor = () => {
    // Température : 30-40°C vert, 40-50°C orange, 50-60°C rouge
    let r = 0, g = 150, b = 0;
    
    if (temp < 40) {
      // Vert (30-40°C)
      r = 0;
      g = 150;
      b = 0;
    } else if (temp < 50) {
      // Vert à orange (40-50°C)
      const localRatio = (temp - 40) / 10;
      r = localRatio * 200;
      g = 150;
      b = 0;
    } else {
      // Orange à rouge (50-60°C)
      const localRatio = Math.min(1, (temp - 50) / 10);
      r = 200 + localRatio * 55;
      g = 150 * (1 - localRatio);
      b = 0;
    }

    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  };

  const accentColor = getTrackColor(true); // Cette variable contient le Jaune -> Rouge dynamique basé sur la température

  useEffect(() => {
    let animationFrame;
    const updateLoop = () => {
      const diff = targetTemp - tempValueRef.current;
      // Transition plus douce
      const change = Math.max(-0.005, Math.min(0.005, diff * 0.0025));
      
      if (Math.abs(change) > 0.00025) {
          tempValueRef.current += change;
          
          // Mise à jour directe du DOM pour la couleur de fond (Fluide 60fps)
          if (pcbRef.current) {
            const ratio = Math.max(0, Math.min(1, (tempValueRef.current - 32) / 38));
            pcbRef.current.style.setProperty('--temp-ratio', ratio);
          }
          
          // Mise à jour de React uniquement si changement significatif (Optimisation)
          setTemp(prev => {
            if (Math.abs(prev - tempValueRef.current) > 0.2) {
                return parseFloat(tempValueRef.current.toFixed(1));
            }
            return prev;
          });
      }
      animationFrame = requestAnimationFrame(updateLoop);
    };
    animationFrame = requestAnimationFrame(updateLoop);

    return () => cancelAnimationFrame(animationFrame);
  }, [targetTemp]);

  const [contentData, setContentData] = useState(null);

  useEffect(() => {
    fetch("content.json")
      .then((res) => res.json())
      .then((data) => setContentData(data))
      .catch((err) => console.error("Erreur chargement content.json:", err));
  }, []);

  useEffect(() => {
    if (!contentData) return;

    const logs = contentData.bootSequence;

    const runBootSequence = async () => {
      for (let i = 0; i < logs.length; i++) {
        const baseText = `> ${logs[i]}`;
        setBootLogs((prev) => [...prev, baseText]);

        for (let dots = 1; dots <= 3; dots++) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          setBootLogs((prev) => {
            const newLogs = [...prev];
            newLogs[i] = baseText + ".".repeat(dots);
            return newLogs;
          });
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      setIsReady(true);
    };

    runBootSequence();
  }, [contentData]);

  const formatUptime = (totalSeconds) => {
    const d = Math.floor(totalSeconds / (3600 * 24));
    const h = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${d}:${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const tracks = contentData?.tracks ? contentData.tracks.filter(t => t && t.id && t.d && t.x && t.y && t.label) : [];
  const sections = contentData?.sections ? contentData.sections : {};

  const handleSectionChange = (id) => {
    setActiveSection(id);
    if (window.innerWidth < 1024) {
      setTimeout(() => {
        contentRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 150);
    }
  };

  // Calcul de l'opacité du background basée sur la température (pour la couleur rouge) - arrive plus vite
  const bgOpacity = (brightness / 300) + ((temp - 32) / 28) * 0.4;

  return (
    <>
      {/* --- COUCHE 1 : Fond et Particules (Fixes et stables) --- */}
      {!showPongGame && (
        <>
          <div
            ref={pcbRef}
            className="pcb-blueprint"
            style={{ 
              "--bg-opacity": bgOpacity,
            }}
          ></div>
          <ParticleBackground brightness={brightness} isLowQuality={isLowQuality} />
        </>
      )}

      {/* --- COUCHE 2 : L'écran de boot (Indépendant) --- */}
      {isBooting && (
        <div className={`boot-screen ${isEngaged ? "boot-exit" : ""}`}>
          <div className="terminal-window rounded-lg w-[95%] max-w-xl">
            {/* Barre de titre avec texte centré */}
            <div className="terminal-bar flex items-center justify-between px-4 py-2">
              <div className="flex gap-1.5 w-12">
                {" "}
                {/* Largeur fixe pour l'équilibre */}
                <div className="w-2 h-2 rounded-full bg-red-900/50"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-900/50"></div>
                <div className="w-2 h-2 rounded-full bg-green-900/50"></div>
              </div>

              <span className="text-[7px] md:text-[9px] font-bold text-emerald-800 tracking-[0.2em] uppercase flex-1 text-center">
                Console_Session: Ilan_Teppe
              </span>

              <span className="text-[7px] md:text-[9px] text-emerald-900 w-12 text-right">
                v2.3.9
              </span>
            </div>

            <div className="p-5 md:p-10">
              {/* Titre BIOS : Taille réduite et tracking normal sur mobile */}
              <div className="text-yellow-500 font-black text-lg md:text-2xl tracking-widest mb-6 uppercase border-b border-yellow-500/10 pb-4 text-center whitespace-nowrap">
                GEII_BIOS_V2.3
              </div>

              {/* Logs : Police uniforme et interdiction de retour à la ligne */}
              <div className="space-y-1.5 font-mono text-[9px] md:text-xs">
                {bootLogs.map((log, index) => (
                  <div
                    key={index}
                    className="flex gap-2 whitespace-nowrap overflow-hidden"
                  >
                    <span className="text-emerald-900 shrink-0">
                      [{index.toString().padStart(2, "0")}]
                    </span>
                    <span className="text-emerald-400 truncate">{log}</span>
                  </div>
                ))}
              </div>

              {/* Bouton centré et contenu sur une ligne */}
              <div className="mt-4 flex justify-center">
                {isReady && (
                  <button
                    onClick={() => {
                      setIsEngaged(true);
                      setTimeout(() => setIsBooting(false), 1200);
                    }}
                    className="start-btn animate-btn"
                  >
                    {"> EXECUTE_INTERFACE"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* --- COUCHE 3 : Le contenu qui tremble et défile --- */}
      <div
        className="min-h-screen p-4 md:p-10 flex flex-col items-center relative voltage-shake"
        style={{
          "--dynamic-accent": accentColor,
          "--shake-val": shakeIntensity,
          "--blink-speed": blinkSpeed,
        }}
      >
        {/* CONTENU DU SITE */}
        <div className="max-w-6xl w-full relative z-10">
          {/* Header Identity - Bord inférieur remonté (Padding vertical réduit à pb-4) */}
          <header className="mb-6 bg-[#021a14]/80 border border-emerald-900/40 backdrop-blur-xl px-6 pt-6 pb-4 md:px-8 md:pt-8 md:pb-5 rounded-[2rem] shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-end gap-4 relative overflow-hidden header-glow">
            <div className="absolute top-0 right-0 w-60 h-60 bg-emerald-500/5 rounded-full -mr-30 -mt-30 blur-3xl"></div>

            <div className="z-10 flex flex-col gap-4">
              <div>
                <div
                  className="flex items-center gap-2 mb-3 font-bold text-[8px] tracking-[0.5em] uppercase"
                  style={{ color: accentColor }}
                >
                  <span
                    className="h-1 w-1 rounded-full animate-pulse"
                    style={{
                      backgroundColor: accentColor,
                      boxShadow: `0 0 8px ${accentColor}`,
                    }}
                  ></span>
                  SYSTEM_CONNECTED
                </div>
                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-none mb-2">
                  ILAN <span style={{ color: accentColor }}>TEPPE</span>
                </h1>
                <p className="text-emerald-400 text-[10px] md:text-xs font-bold flex items-center gap-3 uppercase tracking-[0.2em] opacity-80">
                  <Icon name="cpu" size={14} style={{ color: accentColor }} />{" "}
                  ÉTUDIANT BUT GEII
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-emerald-950/50 border border-emerald-800 text-[8px] md:text-[9px] text-emerald-400 font-bold rounded-full uppercase tracking-widest italic">
                  READY_FOR_PROJECTS
                </span>
                <a
                  href="assets/CV.pdf"
                  download
                  className="px-3 py-1 bg-emerald-950/50 border border-emerald-600 text-[8px] md:text-[9px] text-emerald-400 font-bold rounded-full uppercase tracking-widest italic hover:bg-emerald-900/50 transition-all"
                  title="Télécharger le CV"
                >
                  📥 DOWNLOAD_CV
                </a>
              </div>
            </div>
            <div className="z-10 flex flex-col justify-end items-start md:items-end gap-1 text-[7px] md:text-[8px] text-emerald-800 font-bold font-mono border-l md:border-l-0 md:border-r border-emerald-900/40 pl-4 md:pl-0 md:pr-4">
              <span>COORD: 45.1885° N, 5.7245° E</span>
              <span>UPTIME: {formatUptime(seconds)}</span>
              <span>
                TEMP: {temp.toFixed(1)}°C | VOLTAGE: {calculatedVolt}V
              </span>
              <span>KERNEL: GEII_OS_v2.3</span>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12">
            {/* PCB Column */}
            <div className="lg:col-span-5 flex justify-center items-start lg:sticky lg:top-6 order-2 lg:order-1">
              <div className="bg-[#011a14]/80 rounded-[2.5rem] p-6 border border-emerald-900/30 backdrop-blur-md shadow-2xl w-full max-w-[380px] animate-terminal scanline relative overflow-hidden">
                <svg
                  viewBox="0 -5 100 210"
                  className="w-full h-auto"
                  shapeRendering="geometricPrecision"
                >
                  <defs>
                    <filter
                      id="glow-track"
                      x="-50%"
                      y="-50%"
                      width="200%"
                      height="200%"
                    >
                      <feGaussianBlur stdDeviation="1.5" result="blur" />
                      <feComposite
                        in="SourceGraphic"
                        in2="blur"
                        operator="over"
                      />
                    </filter>

                    {/* ÉCRAN LCD - Affichage Heure */}
                    <rect
                      x="70"
                      y="140"
                      width="25"
                      height="10"
                      rx="1"
                      className="lcd-screen"
                    />
                    <text
                      x="82.5"
                      y="146.5"
                      textAnchor="middle"
                      className="lcd-text"
                    >
                      {time}
                    </text>

                    {/* Symbole : Micro-processeur complexe */}
                    <symbol id="ic-complex" viewBox="0 0 40 40">
                      <rect
                        x="8"
                        y="8"
                        width="24"
                        height="24"
                        fill="#021a14"
                        stroke="#0a4d3c"
                        strokeWidth="0.5"
                      />
                      <circle
                        cx="20"
                        cy="20"
                        r="6"
                        fill="none"
                        stroke="#064e3b"
                        strokeWidth="0.2"
                      />
                      {[...Array(8)].map((_, i) => (
                        <React.Fragment key={i}>
                          <rect
                            x="4"
                            y={10 + i * 3}
                            width="4"
                            height="0.6"
                            fill="#0a4d3c"
                          />
                          <rect
                            x="32"
                            y={10 + i * 3}
                            width="4"
                            height="0.6"
                            fill="#0a4d3c"
                          />
                          <rect
                            x={10 + i * 3}
                            y="4"
                            width="0.6"
                            height="4"
                            fill="#0a4d3c"
                          />
                          <rect
                            x={10 + i * 3}
                            y="32"
                            width="0.6"
                            height="4"
                            fill="#0a4d3c"
                          />
                        </React.Fragment>
                      ))}
                    </symbol>

                    {/* Symbole : Petit composant CMS (Résistance/Condensateur) */}
                    <symbol id="smd-comp" viewBox="0 0 10 6">
                      <rect x="0" y="1" width="2" height="4" fill="#0a4d3c" />{" "}
                      {/* Pad 1 */}
                      <rect
                        x="8"
                        y="1"
                        width="2"
                        height="4"
                        fill="#0a4d3c"
                      />{" "}
                      {/* Pad 2 */}
                      <rect
                        x="2"
                        y="1.5"
                        width="6"
                        height="3"
                        fill="#042c22"
                        stroke="#0a4d3c"
                        strokeWidth="0.2"
                      />{" "}
                      {/* Corps */}
                    </symbol>

                    {/* Symbole : Puce 8 broches (SOIC-8) */}
                    <symbol id="ic-small" viewBox="0 0 20 20">
                      <rect
                        x="5"
                        y="4"
                        width="10"
                        height="12"
                        fill="#021a14"
                        stroke="#0a4d3c"
                        strokeWidth="0.5"
                      />
                      {[...Array(4)].map((_, i) => (
                        <React.Fragment key={i}>
                          <rect
                            x="1"
                            y={5.5 + i * 3}
                            width="4"
                            height="0.8"
                            fill="#0a4d3c"
                          />
                          <rect
                            x="15"
                            y={5.5 + i * 3}
                            width="4"
                            height="0.8"
                            fill="#0a4d3c"
                          />
                        </React.Fragment>
                      ))}
                      <circle cx="7" cy="6" r="0.8" fill="#0a4d3c" />{" "}
                      {/* Pin 1 marker */}
                    </symbol>
                  </defs>

                  {/* Décoration PCB : Composants et Sérigraphie */}
                  <g opacity="0.25">
                    {/* Composants principaux */}
                    <use
                      href="#ic-complex"
                      x="30"
                      y="40"
                      width="40"
                      height="40"
                    />
                    <use
                      href="#ic-small"
                      x="40"
                      y="140"
                      width="15"
                      height="15"
                    />
                    <use
                      href="#ic-small"
                      x="10"
                      y="105"
                      width="15"
                      height="15"
                    />

                    {/* Petits composants parsemés */}
                    <use href="#smd-comp" x="15" y="45" width="8" height="5" />
                    <use href="#smd-comp" x="15" y="52" width="8" height="5" />
                    <use href="#smd-comp" x="78" y="108" width="8" height="5" />
                    <use href="#smd-comp" x="42" y="130" width="8" height="5" />

                    {/* Vias (Trous d'interconnexion) */}
                    <circle
                      cx="45"
                      cy="80"
                      r="1.5"
                      fill="none"
                      stroke="#0a4d3c"
                      strokeWidth="0.5"
                    />
                    <circle
                      cx="55"
                      cy="80"
                      r="1.5"
                      fill="none"
                      stroke="#0a4d3c"
                      strokeWidth="0.5"
                    />
                    <circle cx="10" cy="180" r="1.2" fill="#0a4d3c" />
                    <circle cx="90" cy="180" r="1.2" fill="#0a4d3c" />
                  </g>
                  {/* Tracés Statiques */}
                  {tracks.map((track) => (
                    <path
                      key={`bg-${track.id}`}
                      d={track.d}
                      fill="none"
                      stroke="#062d24"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  ))}

                  {/* Piste active fixe */}
                  {tracks.map(
                    (track) =>
                      track.id === activeSection && (
                        <path
                          key={`active-${track.id}`}
                          d={track.d}
                          fill="none"
                          stroke={accentColor}
                          strokeWidth="4.5"
                          strokeLinecap="round"
                          filter="url(#glow-track)"
                          style={{ strokeOpacity: 1 }}
                        />
                      ),
                  )}

                  {/* Pads de navigation */}
                  {tracks.map((node) => (
                    <g
                      key={node.id}
                      className="cursor-pointer"
                      onClick={() => handleSectionChange(node.id)}
                    >
                      {/* Cercle externe (respiration uniquement) */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="8"
                        fill="none"
                        stroke={accentColor}
                        strokeWidth="0.8"
                        className="ring-passive"
                      />

                      {/* Pastille centrale (statique) */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="7.5"
                        fill={
                          activeSection === node.id ? accentColor : "#012a20"
                        }
                        stroke={accentColor}
                        strokeWidth="1.5"
                      />

                      <text
                        x={node.x}
                        y={node.y + 16}
                        textAnchor="middle"
                        fill={
                          activeSection === node.id ? accentColor : "#4ade80"
                        }
                        className="text-[5px] font-black uppercase tracking-tighter"
                      >
                        {node.label}
                      </text>
                    </g>
                  ))}

                  {/* ÉCRAN LCD ET LEDS */}
                  <g>
                    {/* Boitier LCD Temps (Positionné en haut à gauche) */}
                    <rect
                      x="1"
                      y="-5.5"
                      width="28"
                      height="12"
                      rx="1"
                      className="lcd-screen"
                    />
                    <text
                      x="15"
                      y="2"
                      textAnchor="middle"
                      className="lcd-text"
                      style={{ fontSize: "4px" }}
                    >
                      {time}
                    </text>

                    {/* Boitier LCD Tension/Température (Nouveau - en haut à droite) */}
                    <rect
                      x="72"
                      y="-5.5"
                      width="28"
                      height="12"
                      rx="1"
                      className="lcd-screen"
                    />
                    <text
                      x="86"
                      y="-0.5"
                      textAnchor="middle"
                      className="lcd-text"
                      style={{ fontSize: "3px", fill: getLcdVoltageColor() }}
                    >
                      {calculatedVolt}V
                    </text>
                    <text
                      x="86"
                      y="4"
                      textAnchor="middle"
                      className="lcd-text"
                      style={{ fontSize: "3px", fill: getLcdTempColor() }}
                    >
                      {temp.toFixed(1)}°C
                    </text>

                    {/* LED Rouge : Dynamique selon TEMPÉRATURE */}
                    <circle
                      cx="10"
                      cy="30"
                      r="2"
                      fill={`rgb(${Math.floor(ledIntensity * 255)}, 0, 0)`}
                      style={{
                        filter:
                          ledIntensity > 0.5
                            ? `drop-shadow(0 0 ${ledIntensity * 5}px #ff0000)`
                            : "none",
                        transition: "fill 0.1s linear",
                      }}
                    />

                    {/* LED Verte : Fixe et bien brillante */}
                    <circle
                      cx="10"
                      cy="36"
                      r="2"
                      fill="#00ff00"
                      style={{ filter: "drop-shadow(0 0 3px #00ff00)" }}
                    />
                  </g>

                  {/* Source Power / Accueil */}
                  <g
                    className="cursor-pointer group"
                    onClick={() => handleSectionChange("boot")}
                  >
                    <circle
                      cx="50"
                      cy="15"
                      r="11"
                      fill={activeSection === "boot" ? accentColor : "#042c22"}
                      stroke={accentColor}
                    />
                    <circle cx="50" cy="15" r="5" fill="#000" />
                    <text
                      x="50"
                      y="-3"
                      textAnchor="middle"
                      fill={accentColor}
                      className="text-[5px] font-black tracking-widest uppercase"
                    >
                      ACCUEIL
                    </text>
                  </g>
                  {/* GROUPE POTENTIOMÈTRES */}
                  <g>
                    {/* Potentiomètre Luminosité */}
                    <foreignObject x="82" y="7" width="20" height="40">
                      <div className="w-full h-full flex items-center justify-center bg-transparent">
                        <input
                          type="range"
                          min="5"
                          max="60"
                          value={brightness}
                          onChange={(e) =>
                            setBrightness(Number(e.target.value))
                          }
                          className="pot-slider"
                          style={{
                            transform: "rotate(-90deg)",
                            width: "35px",
                            color: accentColor,
                            background: "transparent",
                          }}
                        />
                      </div>
                    </foreignObject>
                    <text
                      x="92"
                      y="49"
                      textAnchor="middle"
                      className="pot-label"
                    >
                      LUM
                    </text>

                    {/* Potentiomètre Voltage */}
                    <foreignObject x="68" y="7" width="20" height="40">
                      <div className="w-full h-full flex items-center justify-center bg-transparent">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={voltage}
                          onChange={(e) => setVoltage(e.target.value)}
                          className="pot-slider"
                          style={{
                            transform: "rotate(-90deg)",
                            width: "35px",
                            color: accentColor,
                            background: "transparent",
                          }}
                        />
                      </div>
                    </foreignObject>
                    <text
                      x="78"
                      y="49"
                      textAnchor="middle"
                      className="pot-label"
                    >
                      VOLT
                    </text>
                  </g>
                </svg>
              </div>
            </div>

            {/* DROITE : Terminal de Contenu */}
            <div
              className="lg:col-span-7 w-full order-1 lg:order-2 scroll-mt-24"
              ref={contentRef}
            >
              <div className="bg-[#021a14]/90 border-2 border-emerald-900/40 rounded-[2.5rem] p-6 md:p-10 backdrop-blur-3xl min-h-[500px] shadow-2xl relative border-t-emerald-500/20 static-glow overflow-hidden">
                <div key={activeSection} className="animate-section">
                  <div className="flex items-center justify-between mb-8 border-b border-emerald-900/40 pb-6 relative z-10">
                    <div className="flex items-center gap-4">
                      <div
                        className="flex items-center justify-center p-4 rounded-2xl border shadow-inner w-14 h-14 md:w-16 md:h-16"
                        style={{
                          backgroundColor: `${accentColor}10`,
                          color: accentColor,
                          borderColor: `${accentColor}40`,
                        }}
                      >
                        <Icon
                          name={sections[activeSection]?.icon || "zap"}
                          size={24}
                        />
                      </div>
                      <div>
                        <h2 className="text-xl md:text-2xl font-black uppercase text-white tracking-widest leading-none">
                          {sections[activeSection]?.title || "Système"}
                        </h2>
                        <p className="text-[9px] text-emerald-800 font-bold uppercase tracking-[0.5em] mt-2">
                          BUS_ADDR: {activeSection.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <Oscilloscope temp={temp} accentColor={accentColor} onClick={() => setShowPongGame(true)} />
                  </div>

                  <div className="space-y-6 relative z-10">
                    {/* Description de la section */}
                    {sections[activeSection]?.content && (
                      <p
                        className="text-emerald-50 leading-relaxed italic border-l-4 pl-6 text-xs md:text-sm mb-8 opacity-90"
                        style={{
                          borderColor: accentColor,
                        }} /* La couleur dynamique ici */
                      >
                        {sections[activeSection].content}
                      </p>
                    )}

                    {/* Grille des détails (Projets, Études, Compétences) */}
                    <div className="grid grid-cols-1 gap-4">
                      {sections[activeSection]?.details?.filter(item => item && item.id && item.title)?.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setModalItem(item)}
                          className="item-card p-4 border border-emerald-900/30 bg-black/40 rounded-2xl cursor-pointer group flex justify-between items-center hover:border-emerald-500/50"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className="h-2 w-2 rounded-full transition-all bg-emerald-900 group-hover:bg-current"
                              style={{ color: accentColor }}
                            ></div>
                            <div>
                              {/* CORRECTION CI-DESSOUS : style sorti de className */}
                              <h3
                                className="text-white font-bold transition-colors text-sm"
                                style={{
                                  color:
                                    activeSection === item.id
                                      ? accentColor
                                      : "",
                                }}
                              >
                                {item.title}
                              </h3>
                              <p className="text-[8px] text-emerald-800 font-bold uppercase tracking-widest">
                                {item.sub}
                              </p>
                            </div>
                          </div>
                          <div
                            className="flex items-center gap-2 text-emerald-900 transition-all opacity-40 group-hover:opacity-100"
                            style={{
                              color:
                                activeSection === item.id ? accentColor : "",
                            }}
                          >
                            <span className="text-[8px] font-bold tracking-widest uppercase">
                              Voir
                            </span>
                            <Icon name="maximize-2" size={12} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Section spécifique au CONTACT */}
                    {activeSection === "contact" && sections.contact?.info && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          {
                            icon: "mail",
                            label: "Email",
                            val: sections.contact.info.email,
                          },
                          {
                            icon: "phone",
                            label: "Tel",
                            val: sections.contact.info.tel,
                          },
                          {
                            icon: "linkedin",
                            label: "LinkedIn",
                            val: sections.contact.info.linkedin,
                          },
                          {
                            icon: "map-pin",
                            label: "Loc",
                            val: sections.contact.info.location,
                          },
                        ].filter(item => item.val).map((item, i) => (
                          <div
                            key={i}
                            className="p-4 border border-emerald-900/30 bg-black/40 rounded-2xl flex items-center gap-4 group overflow-hidden hover:border-yellow-500 transition-all"
                          >
                            {/* CORRECTION CI-DESSOUS */}
                            <Icon
                              name={item.icon}
                              size={18}
                              className="transition-all"
                              style={{ color: accentColor }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[8px] text-emerald-800 uppercase font-black mb-0.5 tracking-widest">
                                {item.label}
                              </p>
                              <p className="text-sm text-white font-bold break-all">
                                {item.val}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <footer className="mt-12 border-t border-emerald-900/30 pt-8 text-[9px] text-emerald-900 font-black flex flex-col md:flex-row justify-between items-center gap-6 uppercase tracking-[0.4em]">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2">
                <span className="h-1 w-1 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></span>
                SIGNAL: OPTIMAL
              </span>
              <span className="hidden md:inline opacity-20">|</span>
              <button
                onClick={() =>
                  setModalItem({
                    title: "MENTIONS LÉGALES",
                    sub: "LEGAL_PROTOCOLS_V1.0",
                    desc: "ÉDITEUR : Ilan Teppe.\nHÉBERGEUR : GitHub Inc.\nPROPRIÉTÉ : Tous les contenus présents sur ce site sont la propriété exclusive de Ilan Teppe. Les visuels d'illustration proviennent de sources libres de droits.",
                  })
                }
                className="hover:text-yellow-500 transition-colors cursor-pointer"
              >
                LEGAL_PROTOCOLS
              </button>
            </div>
            <span className="opacity-40 tracking-widest">
              Ilan Teppe © 2026
            </span>
          </footer>
        </div>
      </div>
      {/* --- COUCHE 4 : POP UP : La Modale (Toujours au-dessus de tout et centrée) --- */}
      {modalItem && (
        <div
          className="fixed inset-0 z-[100] modal-overlay flex items-center justify-center p-4 md:p-12 animate-in"
          onClick={() => {
            setIsClosingModal(true);
            setTimeout(() => {
              setModalItem(null);
              setIsClosingModal(false);
            }, 200);
          }}
        >
          <div
            className={`bg-[#01130f] border-2 border-emerald-500/10 w-full max-w-3xl rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-y-auto max-h-[90vh] ${isClosingModal ? "animate-modal-close" : "animate-modal-content"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setIsClosingModal(true);
                setTimeout(() => {
                  setModalItem(null);
                  setIsClosingModal(false);
                }, 200);
              }}
              className="absolute top-8 right-8 text-emerald-800 hover:text-yellow-500 transition-colors p-2"
            >
              <Icon name="x" size={24} />
            </button>

            <div className="mb-10 border-b border-emerald-900/40 pb-6">
              <h3 className="text-2xl md:text-3xl font-black text-white mb-2 tracking-tighter leading-tight">
                {modalItem.title || "Titre indisponible"}
              </h3>
              {modalItem.sub && (
                <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-[0.4em]">
                  {modalItem.sub}
                </p>
              )}
            </div>

            {modalItem.desc && (
              <p className="text-emerald-50/90 leading-relaxed mb-8 text-sm md:text-base border-l-2 border-emerald-900 pl-6 italic whitespace-pre-line">
                {modalItem.desc}
              </p>
            )}

            {modalItem.image && (
              <div className="rounded-[2rem] overflow-hidden border border-emerald-900/30 bg-black aspect-video relative shadow-2xl">
                <img
                  src={modalItem.image}
                  alt={modalItem.title}
                  className="w-full h-full object-cover opacity-100"
                  loading="lazy"
                />
                <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.6)] pointer-events-none"></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Jeu Pong Easter Egg */}
      {showPongGame && (
        <ArcadeModal onClose={() => setShowPongGame(false)} accentColor="#00ff00" isLowQuality={isLowQuality} />
      )}
    </>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
