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


const App = () => {
  const [isBooting, setIsBooting] = useState(true);
  const [bootLogs, setBootLogs] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [isEngaged, setIsEngaged] = useState(false);

  const [activeSection, setActiveSection] = useState("boot");
  const [modalItem, setModalItem] = useState(null);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const contentRef = useRef(null);

  const [time, setTime] = useState(new Date().toLocaleTimeString());

  // Communication avec Wix pour la hauteur de l'iframe
  useEffect(() => {
    const sendHeight = () => {
        const height = document.documentElement.scrollHeight;
        window.parent.postMessage({ 'frameHeight': height }, '*');
    };
    window.addEventListener('load', sendHeight);
    window.addEventListener('resize', sendHeight);
    const observer = new ResizeObserver(() => sendHeight());
    observer.observe(document.body);
    sendHeight();
    return () => {
        window.removeEventListener('load', sendHeight);
        window.removeEventListener('resize', sendHeight);
        observer.disconnect();
    };
  }, [isBooting, modalItem, activeSection]);

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
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const accentColor = "#10b981"; // Couleur statique (Emerald)

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

  return (
    <>
      {/* --- COUCHE 1 : Fond et Particules (Fixes et stables) --- */}
      <div className="pcb-blueprint"></div>

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
                {contentData?.ui?.boot?.session}
              </span>

              <span className="text-[7px] md:text-[9px] text-emerald-900 w-12 text-right">
                {contentData?.ui?.boot?.version}
              </span>
            </div>

            <div className="p-5 md:p-10">
              {/* Titre BIOS : Taille réduite et tracking normal sur mobile */}
              <div className="text-emerald-500 font-black text-lg md:text-2xl tracking-widest mb-6 uppercase border-b border-emerald-500/10 pb-4 text-center whitespace-nowrap">
                {contentData?.ui?.boot?.bios}
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
                    {contentData?.ui?.boot?.button}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* --- COUCHE 3 : Le contenu qui tremble et défile --- */}
      <div
        className="min-h-screen p-4 md:p-10 flex flex-col items-center relative"
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
                  {contentData?.ui?.header?.status}
                </div>
                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-none mb-2">
                  {contentData?.ui?.header?.firstname} <span style={{ color: accentColor }}>{contentData?.ui?.header?.lastname}</span>
                </h1>
                <p className="text-emerald-400 text-[10px] md:text-xs font-bold flex items-center gap-3 uppercase tracking-[0.2em] opacity-80">
                  <Icon name="cpu" size={14} style={{ color: accentColor }} />{" "}
                  {contentData?.ui?.header?.role}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-emerald-950/50 border border-emerald-800 text-[8px] md:text-[9px] text-emerald-400 font-bold rounded-full uppercase tracking-widest italic">
                  {contentData?.ui?.header?.badge}
                </span>
                <a
                  href="assets/CV.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-emerald-950/50 border border-emerald-600 text-[8px] md:text-[9px] text-emerald-400 font-bold rounded-full uppercase tracking-widest italic hover:bg-emerald-900/50 transition-all"
                  title="Télécharger le CV"
                >
                  {contentData?.ui?.header?.cv}
                </a>
              </div>
            </div>
            <div className="z-10 flex flex-col justify-end items-start md:items-end gap-1 text-[7px] md:text-[8px] text-emerald-800 font-bold font-mono border-l md:border-l-0 md:border-r border-emerald-900/40 pl-4 md:pl-0 md:pr-4">
              <span>{contentData?.ui?.header?.coords}</span>
              <span>{contentData?.ui?.header?.kernel}</span>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12">
            {/* PCB Column */}
            <div className="lg:col-span-5 flex justify-center items-start lg:sticky lg:top-6 order-2 lg:order-1">
              <div className="bg-[#021a14]/80 rounded-[2.5rem] p-6 border border-emerald-900/30 backdrop-blur-md shadow-2xl w-full max-w-[380px] animate-terminal static-glow relative overflow-hidden">
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
                      {contentData?.ui?.pcb?.home}
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
                          {sections[activeSection]?.title || contentData?.ui?.section?.defaultTitle}
                        </h2>
                      </div>
                    </div>
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
                              {contentData?.ui?.card?.view}
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
                            className="p-4 border border-emerald-900/30 bg-black/40 rounded-2xl flex items-center gap-4 group overflow-hidden hover:border-emerald-500 transition-all"
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
                {contentData?.ui?.footer?.status}
              </span>
              <span className="hidden md:inline opacity-20">|</span>
              <button
                onClick={() =>
                  setModalItem({
                    title: contentData?.ui?.legalModal?.title,
                    sub: contentData?.ui?.legalModal?.sub,
                    desc: contentData?.ui?.legalModal?.desc,
                  })
                }
                className="hover:text-emerald-500 transition-colors cursor-pointer"
              >
                {contentData?.ui?.footer?.legal}
              </button>
            </div>
            <span className="opacity-40 tracking-widest">
              {contentData?.ui?.footer?.copyright}
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
              className="absolute top-8 right-8 text-emerald-800 hover:text-emerald-500 transition-colors p-2"
            >
              <Icon name="x" size={24} />
            </button>

            <div className="mb-10 border-b border-emerald-900/40 pb-6">
              <h3 className="text-2xl md:text-3xl font-black text-white mb-2 tracking-tighter leading-tight">
                {modalItem.title || contentData?.ui?.misc?.fallbackTitle}
              </h3>
              {modalItem.sub && (
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.4em]">
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
    </>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
