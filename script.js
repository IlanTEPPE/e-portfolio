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

const PongGame = ({ onClose, accentColor = "#00ff00", isClosing = false }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const mouseYRef = useRef(0);
  const trailRef = useRef([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [localIsClosing, setLocalIsClosing] = useState(false);
  
  useEffect(() => {
    if (isClosing) {
      setLocalIsClosing(true);
    }
  }, [isClosing]);
  const [gameState, setGameState] = useState({
    playerY: 150,
    aiY: 150,
    ballX: 400,
    ballY: 150,
    ballVelX: 1.5,
    ballVelY: 1.5,
    playerScore: 0,
    aiScore: 0,
    gameOver: false,
  });

  const gameParamsRef = useRef({
    playerY: 150,
    aiY: 150,
    ballX: 400,
    ballY: 150,
    ballVelX: 1.5,
    ballVelY: 1.5,
    playerScore: 0,
    aiScore: 0,
  });

  // Forcer le vert fluo (#00ff00)
  const pongColor = "#00ff00";
  const firstMoveRef = useRef(true);

  useEffect(() => {
    if (gameStarted) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [gameStarted]);

  useEffect(() => {
    // Restaurer le scroll quand le composant se démonte
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (gameStarted) {
      mouseYRef.current = 150;
      firstMoveRef.current = true;
    }
  }, [gameStarted]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (gameStarted && canvasRef.current) {
        // Ignorer le premier mouvement après le démarrage
        if (firstMoveRef.current) {
          firstMoveRef.current = false;
          return;
        }
        
        const rect = canvasRef.current.getBoundingClientRect();
        mouseYRef.current = e.clientY - rect.top;
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

    let animationId;

    const update = () => {
      // Contrôle du joueur avec la souris
      const targetY = mouseYRef.current - PADDLE_HEIGHT / 2;
      params.playerY = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, targetY));

      // IA (suit la balle avec difficulté)
      const aiCenter = params.aiY + PADDLE_HEIGHT / 2;
      const ballCenter = params.ballY;
      const aiSpeed = 1.2;

      if (aiCenter < ballCenter - 20) {
        params.aiY = Math.min(
          CANVAS_HEIGHT - PADDLE_HEIGHT,
          params.aiY + aiSpeed
        );
      } else if (aiCenter > ballCenter + 20) {
        params.aiY = Math.max(0, params.aiY - aiSpeed);
      }

      // Mouvement de la balle
      params.ballX += params.ballVelX;
      params.ballY += params.ballVelY;

      // Ajouter à la trace (trail)
      trailRef.current.push({
        x: params.ballX,
        y: params.ballY,
        life: 1,
      });

      // Garder seulement les derniers points de la trace
      if (trailRef.current.length > 30) {
        trailRef.current.shift();
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
        params.ballX = CANVAS_WIDTH / 2;
        params.ballY = CANVAS_HEIGHT / 2;
        params.ballVelX = 1.5;
        params.ballVelY = 1;
      } else if (params.ballX > CANVAS_WIDTH) {
        params.playerScore++;
        params.ballX = CANVAS_WIDTH / 2;
        params.ballY = CANVAS_HEIGHT / 2;
        params.ballVelX = -1.5;
        params.ballVelY = 1;
      }

      setGameState({ ...params, gameOver: false });
    };

    const draw = () => {
      // Fond noir de CRT
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Grille oscilloscope avec effet retro augmenté
      ctx.strokeStyle = pongColor;
      ctx.globalAlpha = 0.15;
      for (let i = 0; i < CANVAS_WIDTH; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let i = 0; i < CANVAS_HEIGHT; i += 20) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(CANVAS_WIDTH, i);
        ctx.stroke();
      }
      
      // Lignes de scan CRT (scanlines effect)
      ctx.strokeStyle = pongColor;
      ctx.globalAlpha = 0.08;
      for (let i = 0; i < CANVAS_HEIGHT; i += 2) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(CANVAS_WIDTH, i);
        ctx.stroke();
      }
      
      ctx.globalAlpha = 1;

      // Trace de la balle (trail)
      trailRef.current.forEach((point, index) => {
        const opacity = (index / trailRef.current.length) * 0.3;
        ctx.fillStyle = pongColor;
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(point.x, point.y, BALL_SIZE / 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Raquettes avec glow oscilloscope
      ctx.fillStyle = pongColor;
      ctx.shadowBlur = 20;
      ctx.shadowColor = pongColor;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillRect(0, params.playerY, PADDLE_WIDTH, PADDLE_HEIGHT);
      ctx.fillRect(
        CANVAS_WIDTH - PADDLE_WIDTH,
        params.aiY,
        PADDLE_WIDTH,
        PADDLE_HEIGHT
      );

      // Balle avec glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = pongColor;
      ctx.beginPath();
      ctx.arc(params.ballX, params.ballY, BALL_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

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
      ctx.shadowBlur = 10;
      ctx.shadowColor = pongColor;
      ctx.fillText(params.playerScore, CANVAS_WIDTH / 4, 40);
      ctx.fillText(params.aiScore, (CANVAS_WIDTH * 3) / 4, 40);
      ctx.shadowBlur = 0;
    };

    const gameLoop = () => {
      if (gameStarted) {
        update();
      }
      draw();
      animationId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => cancelAnimationFrame(animationId);
  }, [accentColor, gameStarted]);

  return (
    <div
      className="fixed inset-0 z-[101] modal-overlay flex items-center justify-center p-4 animate-in"
      style={{ cursor: gameStarted ? "none" : "auto" }}
      onClick={() => {
        setLocalIsClosing(true);
        setTimeout(onClose, 300);
      }}
    >
      <div
        ref={containerRef}
        className={`relative w-full max-w-4xl rounded-3xl overflow-hidden border-2 ${localIsClosing ? "animate-modal-close" : "animate-modal-content"}`}
        style={{ borderColor: "#00ff00", backgroundColor: "#000000" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header CRT */}
        <div
          className="px-6 py-2 font-bold text-xs tracking-widest uppercase"
          style={{ backgroundColor: "#000000", color: "#00ff00", borderBottom: `2px solid #00ff00` }}
        >
          PONG_OSCILLOSCOPE_V1.0
        </div>

        {/* Canvas */}
        <div className="relative w-full" style={{ position: "relative" }}>
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
              className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm"
              style={{ backgroundColor: "rgba(0, 0, 0, 0.75)" }}
            >
              <div className="text-center">
                <div className="text-4xl font-bold mb-6" style={{ color: "#00ff00", textShadow: "0 0 20px #00ff00" }}>
                  PONG
                </div>
                <button
                  onClick={() => setGameStarted(true)}
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
          <p className="text-sm">Déplacez la souris pour contrôler | ESC pour quitter</p>
        </div>
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

const ParticleBackground = ({ brightness }) => {
  const canvasRef = useRef(null);
  // 1. Créer une référence pour stocker la luminosité sans reset l'effet
  const brightnessRef = useRef(brightness);

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

        if (mouse.x) {
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
};

const App = () => {
  const [seconds, setSeconds] = useState(Math.floor(Math.random() * 5000000));
  const [temp, setTemp] = useState(32.4); // Température actuelle
  const [volt, setVolt] = useState("3.30");

  const [isBooting, setIsBooting] = useState(true);
  const [bootLogs, setBootLogs] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [isEngaged, setIsEngaged] = useState(false);

  const [activeSection, setActiveSection] = useState("boot");
  const [modalItem, setModalItem] = useState(null);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [showPongGame, setShowPongGame] = useState(false);
  const [closingPong, setClosingPong] = useState(false);
  const contentRef = useRef(null);

  const [brightness, setBrightness] = useState(15);
  const [voltage, setVoltage] = useState(0);
  const [time, setTime] = useState(new Date().toLocaleTimeString());

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
    if (isBooting) {
      document.body.style.overflow = "hidden";
      // On s'assure de remonter en haut de page au cas où
      window.scrollTo(0, 0);
    } else {
      document.body.style.overflow = "auto";
    }

    // Nettoyage si le composant est démonté
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isBooting]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && showPongGame) {
        setClosingPong(true);
        setTimeout(() => {
          setShowPongGame(false);
          setClosingPong(false);
        }, 300);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showPongGame]);

  useEffect(() => {
    const timer = setInterval(
      () => setTime(new Date().toLocaleTimeString()),
      1000,
    );
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
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);

      setTemp((prevTemp) => {
        const diff = targetTemp - prevTemp;
        const change = Math.max(-0.3, Math.min(0.3, diff * 0.08));
        return parseFloat((prevTemp + change).toFixed(2));
      });
    }, 100);

    return () => clearInterval(interval);
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
          await new Promise((resolve) => setTimeout(resolve, 150));
          setBootLogs((prev) => {
            const newLogs = [...prev];
            newLogs[i] = baseText + ".".repeat(dots);
            return newLogs;
          });
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
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
      <div
        className="pcb-blueprint"
        style={{ 
          "--bg-opacity": bgOpacity,
          "--temp-ratio": (temp - 32) / 38 // Ratio 0-1 basé sur la température
        }}
      ></div>
      <ParticleBackground brightness={brightness} />

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
        <PongGame onClose={() => setShowPongGame(false)} accentColor={accentColor} isClosing={closingPong} />
      )}
    </>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
