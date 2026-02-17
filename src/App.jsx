import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Tooltip } from "react-leaflet";
import { useState, useEffect } from "react";
import "leaflet/dist/leaflet.css";

// 1. Вставляем вашу функцию сюда (вне компонента App, чтобы не пересоздавалась)
const getCurrentRiskScore = (zone) => {
  if (!zone.time_series || !Array.isArray(zone.time_series)) {
    return zone.risk_score; 
  }

  const now = new Date();
  const currentHour = now.getHours();

  const ts = zone.time_series.find(t => parseInt(t.time.split(":")[0]) >= currentHour);
  return ts ? ts.risk_score : zone.risk_score; 
};

function App() {
  const [isFuture, setIsFuture] = useState(false);
  const [zones, setZones] = useState([]);
  const [aiQuery, setAiQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- ЛОГИКА ВРЕМЕНИ ДЛЯ ШАПКИ ---
  const now = new Date();
  const displayTime = new Date(now.getTime());
  if (isFuture) {
    displayTime.setHours(displayTime.getHours() + 1);
  }
  const timeStr = displayTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  // -------------------------------

  useEffect(() => {
    fetch("http://127.0.0.1:8000/zones")
      .then((res) => {
        if (!res.ok) throw new Error("Ошибка сервера");
        return res.json();
      })
      .then((data) => {
        setZones(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Ошибка соединения:", err);
        setError("Нет связи с сервером (Qadam Engine offline)");
        setLoading(false);
      });
  }, []);

  const getDisplayZones = () => {
    return zones.map(zone => {
      const timeBasedScore = getCurrentRiskScore(zone);

      if (!isFuture) {
        return { ...zone, risk_score: timeBasedScore };
      }
      
      let shift = 0;
      if (zone.id === 1) shift = 12;
      if (zone.id === 2 || zone.id === 3) shift = -15;
      if (zone.id === 4) shift = 5;
      
      return {
        ...zone,
        risk_score: Math.max(10, Math.min(95, timeBasedScore + shift))
      };
    });
  };

  const displayZones = getDisplayZones();

  const threats = displayZones
    .filter((z) => z.risk_score >= 50)
    .sort((a, b) => b.risk_score - a.risk_score);

  const safePlaces = displayZones
    .filter((z) => z.risk_score < 50)
    .sort((a, b) => a.risk_score - b.risk_score);

  const getRiskColor = (score) => {
    if (score >= 70) return "#ff1a1a"; 
    if (score >= 50) return "#ffcc00"; 
    return "#00cc66";
  };

  const handleAskAI = (e) => {
    if ((e.key === "Enter" || e.type === "click") && aiQuery.trim()) {
      alert(`Qadam AI: Анализирую ситуацию...\n\nДанные на ${timeStr}. Рекомендую переждать пик в "Green Café".`);
      setAiQuery("");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
           <span style={{ color: "#ff4d4d", fontSize: "28px" }}>Qadam</span>
           <span style={styles.subHeader}>Smart City Risk Engine</span>
        </div>
        
        {/* ВРЕМЯ В ШАПКЕ ТЕКСТОМ */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ fontSize: "18px", color: isFuture ? "#00ccff" : "#fff", fontWeight: "500" }}>
             {isFuture ? "Прогноз на " : "Сейчас: "} {timeStr}
          </div>
          <div style={{ fontSize: "14px", color: "#666" }}>Hackathon Mode: Live 🔴</div>
        </div>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.mapWrapper}>
          <MapContainer
            center={[53.288, 69.385]} 
            zoom={14}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />

            {displayZones.map((zone) => (
              <CircleMarker
                key={`${zone.id}-${isFuture}`}
                center={[zone.lat, zone.lng]}
                pathOptions={{
                  color: getRiskColor(zone.risk_score),
                  fillColor: getRiskColor(zone.risk_score),
                  fillOpacity: 0.6,
                  weight: 2
                }}
                radius={25}
              >
                <Tooltip permanent direction="center" className="custom-tooltip">
                  <span style={{ color: "white", fontWeight: "bold", textShadow: "0px 0px 4px black", fontSize: "12px" }}>
                    {zone.name}
                  </span>
                </Tooltip>

                <Popup>
                  <div style={{ minWidth: "200px", color: "#333" }}>
                    <h3 style={{ margin: "0 0 5px 0" }}>{zone.name}</h3>
                    <strong style={{color: getRiskColor(zone.risk_score)}}>
                        {isFuture ? "Прогноз риска" : "Текущий риск"}: {zone.risk_score}%
                    </strong>
                    <p style={{ fontSize: "13px", margin: "5px 0" }}>{zone.description}</p>
                    <div style={{ background: "#f0f0f0", padding: "8px", borderRadius: "5px" }}>
                      <small> {zone.walk_time_from_nis} от НИШ</small>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>

          <div style={styles.timeToggle}>
            <button 
              onClick={() => setIsFuture(false)}
              style={{ ...styles.toggleBtn, backgroundColor: !isFuture ? "#00ccff" : "transparent", color: !isFuture ? "white" : "#666" }}
            >
              Сейчас 
            </button>
            <button 
              onClick={() => setIsFuture(true)}
              style={{ ...styles.toggleBtn, backgroundColor: isFuture ? "#00ccff" : "transparent", color: isFuture ? "white" : "#666" }}
            >
              Через 1 час 
            </button>
          </div>
          
          {error && <div style={styles.errorOverlay}> {error}</div>}
        </div>

        <div style={styles.sidebar}>
          <div style={styles.scrollableContent}>
            <h3 style={styles.sectionTitle}> {isFuture ? "Predicted Threats" : "High Risk Areas"}</h3>
            {loading && <div style={{color:"#666", padding:"10px"}}>Загрузка данных...</div>}
            
            {threats.map((zone) => (
              <div key={zone.id} style={styles.riskCard}>
                <div style={styles.cardHeader}>
                  <span style={styles.cardTitle}>{zone.name}</span>
                  <span style={styles.scoreBadge}>{zone.risk_score}%</span>
                </div>
                <div style={styles.cardDesc}>{zone.description}</div>
              </div>
            ))}

            <hr style={styles.divider} />

            <h3 style={styles.sectionTitle}> Safe Zones</h3>
            {safePlaces.map((zone) => (
              <div key={zone.id} style={styles.safeCard}>
                <div style={styles.cardHeader}>
                  <span style={styles.cardTitle}>{zone.name}</span>
                  <span style={styles.safeBadge}>Safe</span>
                </div>
                <div style={styles.cardDesc}>{zone.description}</div>
              </div>
            ))}
          </div>

          <div style={styles.aiContainer}>
            <div style={styles.aiLabel}> Qadam AI Assistant</div>
            <div style={styles.inputWrapper}>
              <input
                type="text"
                placeholder="Где будет безопасно?"
                style={styles.input}
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={handleAskAI}
              />
              <button style={styles.sendBtn} onClick={handleAskAI}>➤</button>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        .leaflet-tooltip-pane .custom-tooltip { background: transparent; border: none; box-shadow: none; }
      `}</style>
    </div>
  );
}

const styles = {
  container: { height: "100vh", width: "100vw", display: "flex", flexDirection: "column", overflow: "hidden", background: "#000" },
  header: { height: "65px", background: "#111", display: "flex", alignItems: "center", padding: "0 25px", borderBottom: "1px solid #333", justifyContent: "space-between", color: "white", zIndex: 1001 },
  subHeader: { fontSize: "16px", color: "#888", fontWeight: "normal", marginLeft: "10px" },
  mainContent: { display: "flex", flex: 1, height: "calc(100vh - 65px)" },
  mapWrapper: { flex: 1, position: "relative" },
  sidebar: { width: "380px", backgroundColor: "#121212", display: "flex", flexDirection: "column", borderLeft: "1px solid #333", zIndex: 1000 },
  scrollableContent: { flex: 1, padding: "20px", overflowY: "auto" },
  sectionTitle: { color: "#888", fontSize: "12px", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "1.5px" },
  riskCard: { background: "linear-gradient(90deg, rgba(60,0,0,0.8), #1a1a1a)", borderLeft: "4px solid #ff3333", padding: "15px", borderRadius: "6px", marginBottom: "12px" },
  safeCard: { background: "linear-gradient(90deg, rgba(0,60,0,0.6), #1a1a1a)", borderLeft: "4px solid #00cc66", padding: "15px", borderRadius: "6px", marginBottom: "12px" },
  cardHeader: { display: "flex", justifyContent: "space-between", marginBottom: "8px" },
  cardTitle: { color: "#fff", fontWeight: "bold" },
  cardDesc: { color: "#bbb", fontSize: "13px" },
  scoreBadge: { background: "rgba(255, 51, 51, 0.2)", color: "#ff3333", padding: "4px 8px", borderRadius: "4px", fontWeight: "bold" },
  safeBadge: { background: "rgba(0, 204, 102, 0.2)", color: "#00cc66", padding: "4px 8px", borderRadius: "4px" },
  divider: { border: "0", borderTop: "1px solid #333", margin: "20px 0" },
  timeToggle: { position: "absolute", top: "20px", left: "50%", transform: "translateX(-50%)", zIndex: 1000, display: "flex", gap: "10px", background: "white", padding: "8px", borderRadius: "30px", boxShadow: "0 4px 15px rgba(0,0,0,0.3)" },
  toggleBtn: { padding: "8px 18px", borderRadius: "20px", border: "none", cursor: "pointer", fontWeight: "bold", transition: "0.3s" },
  aiContainer: { padding: "20px", background: "#0a0a0a", borderTop: "1px solid #222" },
  aiLabel: { color: "#00ccff", fontSize: "11px", fontWeight: "bold", marginBottom: "10px" },
  inputWrapper: { display: "flex", gap: "8px" },
  input: { flex: 1, background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "10px", color: "white" },
  sendBtn: { background: "#00ccff", border: "none", borderRadius: "8px", width: "40px", cursor: "pointer" },
  errorOverlay: { position: "absolute", bottom: 20, left: 20, background: "red", color: "white", padding: "10px", zIndex: 2000, borderRadius: "5px" }
};

export default App;