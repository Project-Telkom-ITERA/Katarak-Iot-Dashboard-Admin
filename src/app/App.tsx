import { useState, useEffect, useCallback } from "react";
import {
  Eye, Wifi, WifiOff, Clock, Camera, RefreshCw,
  ChevronRight, Activity, Cpu, BarChart2, AlertCircle,
  CheckCircle2, Info, ImageOff, Zap, Loader, UserPlus,
  Database, Terminal, Copy, Plug, Save, Search,
  User, Calendar, ShieldCheck
} from "lucide-react";

const API_URL = "https://web-production-0ec06.up.railway.app";

// ── Types ──────────────────────────────────────────────────
type HistoryRow = {
  id: number; prediksi: string;
  normal_pct: number; imm_pct: number; mat_pct: number;
  confidence: number; waktu: string;
  nama?: string | null; usia?: number | null; kelamin?: string | null;
};
type StatsData  = { Normal: number; Immature: number; Mature: number; total: number; };
type LatestData = {
  id: number; prediksi: string; label: string;
  confidence: number; normal: number; immature: number; mature: number;
  waktu: string; image_url?: string | null;
  nama?: string | null; usia?: number | null; kelamin?: string | null;
};

// ── Helpers ────────────────────────────────────────────────
const getLabelColor = (label: string) => {
  if (label === "Normal")   return { bg: "bg-emerald-900/40", text: "text-emerald-400", dot: "bg-emerald-500", border: "border-emerald-700" };
  if (label === "Immature") return { bg: "bg-amber-900/40",   text: "text-amber-400",   dot: "bg-amber-500",   border: "border-amber-700"   };
  return                           { bg: "bg-red-900/40",     text: "text-red-400",     dot: "bg-red-500",     border: "border-red-800"     };
};
const getLabelIcon = (label: string) => {
  if (label === "Normal")   return <CheckCircle2 size={13} className="text-emerald-400" />;
  if (label === "Immature") return <AlertCircle  size={13} className="text-amber-400"   />;
  return                           <AlertCircle  size={13} className="text-red-400"     />;
};
const labelDisplay = (l: string) =>
  l === "Normal" ? "Mata Normal" : l === "Immature" ? "Katarak Immature" : "Katarak Mature";

function useTime() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setT(new Date()), 1000); return () => clearInterval(i); }, []);
  return t;
}

// ── Foto lazy-load (untuk riwayat detail) ─────────────────
function DetailPhoto({ id, loading }: { id: number | null; loading: boolean }) {
  const [src, setSrc] = useState<string | null>(null);
  const [imgLoad, setImgLoad] = useState(false);

  useEffect(() => {
    if (!id) { setSrc(null); return; }
    setImgLoad(true); setSrc(null);
    fetch(`${API_URL}/image/${id}`).then(r => r.json())
      .then(j => setSrc(j.image_url || null))
      .catch(() => setSrc(null))
      .finally(() => setImgLoad(false));
  }, [id]);

  const busy = loading || imgLoad;
  return (
    <div className="w-full rounded-xl overflow-hidden border border-[#243044] bg-[#0b1120]" style={{ aspectRatio: "4/3" }}>
      {busy && (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
          <Loader size={20} className="text-[#34d399] animate-spin" />
          <span className="text-[11px] text-gray-500">Memuat foto...</span>
        </div>
      )}
      {!busy && src  && <img src={src} alt="tangkapan" className="w-full h-full object-cover" />}
      {!busy && !src && (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
          <ImageOff size={22} className="text-gray-600" />
          <span className="text-[11px] text-gray-600">Foto tidak tersimpan</span>
        </div>
      )}
    </div>
  );
}

// ── Bar progress ───────────────────────────────────────────
function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between mb-1">
        <span className="text-[12px] text-gray-400">{label}</span>
        <span className="text-[12px] text-gray-300" style={{ fontWeight: 600 }}>{value.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full bg-[#111a27] overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN ADMIN APP
// ═══════════════════════════════════════════════════════════
type Tab = "tangkapan" | "input" | "riwayat" | "statistik" | "settings";

export default function AdminApp() {
  const now     = useTime();
  const timeStr = now.toLocaleTimeString("id-ID",  { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("id-ID",  { day: "2-digit", month: "long", year: "numeric" });

  const [activeTab,  setActiveTab]  = useState<Tab>("tangkapan");
  const [connected,  setConnected]  = useState(false);
  const [autoOn,     setAutoOn]     = useState(false);

  // Tangkapan
  const [latest,      setLatest]      = useState<LatestData | null>(null);
  const [latLoading,  setLatLoading]  = useState(false);

  // Riwayat
  const [history,     setHistory]     = useState<HistoryRow[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [selectedId,  setSelectedId]  = useState<number | null>(null);
  const selectedRow = history.find(r => r.id === selectedId) || null;

  // Statistik
  const [stats,       setStats]       = useState<StatsData | null>(null);
  const [statsLoad,   setStatsLoad]   = useState(false);

  // Form input pasien
  const [fNama,    setFNama]    = useState("");
  const [fUsia,    setFUsia]    = useState("");
  const [fKelamin, setFKelamin] = useState("");
  const [fId,      setFId]      = useState("");
  const [fStatus,  setFStatus]  = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [fLoading, setFLoading] = useState(false);

  // Settings
  const [dbStatus,  setDbStatus]  = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [copied,    setCopied]    = useState(false);

  // ── Fetch ────────────────────────────────────────────────
  const fetchLatest = useCallback(async () => {
    setLatLoading(true);
    try {
      const r = await fetch(`${API_URL}/latest`);
      if (!r.ok) throw new Error();
      const d = await r.json();
      setLatest(d); setConnected(true);
    } catch { setConnected(false); }
    finally { setLatLoading(false); }
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const r = await fetch(`${API_URL}/history?limit=50`);
      const d = await r.json();
      setHistory(d.data || []);
    } catch {} finally { setHistLoading(false); }
  }, []);

  const fetchStats = useCallback(async () => {
    setStatsLoad(true);
    try {
      const r = await fetch(`${API_URL}/stats`);
      setStats(await r.json());
    } catch {} finally { setStatsLoad(false); }
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/`).then(r => { if (r.ok) setConnected(true); }).catch(() => setConnected(false));
    fetchLatest(); fetchHistory(); fetchStats();
  }, [fetchLatest, fetchHistory, fetchStats]);

  // Auto-refresh
  useEffect(() => {
    if (!autoOn) return;
    const iv = setInterval(() => { fetchLatest(); fetchStats(); }, 5000);
    return () => clearInterval(iv);
  }, [autoOn, fetchLatest, fetchStats]);

  // ── Simpan pasien ────────────────────────────────────────
  const savePatient = async () => {
    if (!fNama.trim()) { setFStatus({ type: "err", msg: "Nama wajib diisi." }); return; }
    if (!fUsia)        { setFStatus({ type: "err", msg: "Usia wajib diisi." }); return; }
    if (!fKelamin)     { setFStatus({ type: "err", msg: "Jenis kelamin wajib dipilih." }); return; }
    setFLoading(true); setFStatus(null);
    try {
      const body: any = { nama: fNama.trim(), usia: parseInt(fUsia), kelamin: fKelamin };
      if (fId) body.id = parseInt(fId);
      const r = await fetch(`${API_URL}/patient`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      setFStatus({ type: "ok", msg: `Data berhasil disimpan! ID: ${j.id}` });
      setFNama(""); setFUsia(""); setFKelamin(""); setFId("");
      fetchHistory();
    } catch (e: any) {
      setFStatus({ type: "err", msg: e.message || "Gagal menyimpan. Pastikan endpoint /patient ada di Flask." });
    } finally { setFLoading(false); }
  };

  const testConn = async () => {
    setDbStatus(null);
    try {
      const r = await fetch(`${API_URL}/`);
      if (r.ok) { setDbStatus({ type: "ok",  msg: "Koneksi ke Railway API berhasil! MySQL terhubung ✓" }); setConnected(true); }
      else throw new Error("HTTP " + r.status);
    } catch (e: any) {
      setDbStatus({ type: "err", msg: "Gagal: " + e.message });
      setConnected(false);
    }
  };

  const copySQL = () => {
    const sql = `ALTER TABLE riwayat_deteksi\n  ADD COLUMN nama VARCHAR(100) DEFAULT NULL,\n  ADD COLUMN usia INT DEFAULT NULL,\n  ADD COLUMN kelamin ENUM('Laki-laki','Perempuan') DEFAULT NULL;`;
    navigator.clipboard.writeText(sql).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const captureColors = latest ? getLabelColor(latest.label) : null;
  const rowColors     = selectedRow ? getLabelColor(selectedRow.prediksi) : null;

  // ── Tabs config ──────────────────────────────────────────
  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "tangkapan",  label: "Tangkapan",   icon: <Camera size={14} />   },
    { key: "input",      label: "Input Pasien", icon: <UserPlus size={14} /> },
    { key: "riwayat",    label: "Riwayat",      icon: <RefreshCw size={14} />},
    { key: "statistik",  label: "Statistik",    icon: <BarChart2 size={14} />},
    { key: "settings",   label: "Pengaturan",   icon: <Database size={14} /> },
  ];

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#0b1120] flex flex-col">

      {/* ── TOPBAR ──────────────────────────────────────── */}
      <div className="bg-[#0f1929] border-b border-[#1e2d40] px-4 lg:px-8 py-3 flex items-center gap-3 shadow-md">
        <div className="flex items-center gap-2">
          <div className="bg-[#0d2e24] px-3 py-1 rounded-full flex items-center gap-1.5 border border-[#1a5c42]">
            <Eye size={13} className="text-[#34d399]" />
            <span className="text-[10px] text-[#34d399] tracking-widest hidden sm:block" style={{ fontWeight: 700 }}>
              ADMIN
            </span>
          </div>
          <ShieldCheck size={16} className="text-[#34d399]" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] lg:text-[14px] text-gray-200 truncate block" style={{ fontWeight: 600 }}>
            Dashboard Admin — Katarak IoT Detector
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[12px] ${connected ? "border-emerald-800 bg-emerald-900/30 text-emerald-400" : "border-red-800 bg-red-900/30 text-red-400"}`}>
            <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
            {connected ? "Terhubung" : "Terputus"}
            {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
          </div>
          <div className="flex items-center gap-1.5 bg-[#111a27] border border-[#243044] rounded-xl px-3 py-1.5">
            <Clock size={12} className="text-[#34d399]" />
            <span className="text-[12px] text-gray-200" style={{ fontWeight: 600 }}>{timeStr}</span>
          </div>
        </div>
      </div>

      {/* ── TAB BAR ─────────────────────────────────────── */}
      <div className="bg-[#0f1929] border-b border-[#1e2d40] px-4 lg:px-8 flex gap-0 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 lg:px-5 py-2.5 text-[12px] lg:text-[13px] border-b-2 whitespace-nowrap transition-all shrink-0 ${activeTab === tab.key ? "border-[#34d399] text-[#34d399] bg-[#0d2e24]/50" : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-[#1a2332]"}`}>
            {tab.icon}
            <span style={{ fontWeight: activeTab === tab.key ? 600 : 400 }}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── CONTENT ─────────────────────────────────────── */}
      <div className="flex-1 px-4 lg:px-8 py-5 overflow-auto">

        {/* ══ TAB: TANGKAPAN ══════════════════════════════ */}
        {activeTab === "tangkapan" && (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Kiri: foto tangkapan */}
            <div className="flex flex-col gap-4">
              <div className="bg-[#1a2332] rounded-2xl border border-[#243044] overflow-hidden">
                <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera size={16} className="text-[#34d399]" />
                    <h2 className="text-[14px] text-gray-200" style={{ fontWeight: 600 }}>Tangkapan Terbaru</h2>
                    {latLoading && <Loader size={13} className="text-[#34d399] animate-spin" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setAutoOn(v => !v)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] transition-all ${autoOn ? "bg-[#0d2e24] border-[#34d399] text-[#34d399]" : "bg-[#111a27] border-[#243044] text-gray-500"}`}>
                      <Zap size={10} className={autoOn ? "animate-pulse" : ""} />
                      {autoOn ? "Live" : "Auto"}
                    </button>
                    <button onClick={fetchLatest} className="w-7 h-7 rounded-full bg-[#0d2e24] flex items-center justify-center hover:bg-[#1a5c42] transition-colors">
                      <RefreshCw size={12} className={`text-[#34d399] ${latLoading ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>

                <div className="mx-4 mb-3">
                  <div className="rounded-xl overflow-hidden bg-[#0b1120] border border-[#243044]" style={{ aspectRatio: "4/3" }}>
                    {latLoading && !latest
                      ? <div className="w-full h-full flex flex-col items-center justify-center gap-2"><Loader size={22} className="text-[#34d399] animate-spin" /><span className="text-[12px] text-gray-500">Mengambil dari ESP32-CAM...</span></div>
                      : latest?.image_url
                        ? <img src={latest.image_url} alt="tangkapan" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex flex-col items-center justify-center gap-2"><Eye size={28} className="text-[#34d399]" /><p className="text-[12px] text-gray-500">Belum ada tangkapan</p></div>
                    }
                  </div>
                  {latest && (
                    <div className="flex items-center justify-between mt-2 px-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-600 bg-[#111a27] border border-[#243044] px-2 py-0.5 rounded-full">#{latest.id}</span>
                        {autoOn && <span className="text-[10px] text-[#34d399] bg-[#0d2e24] border border-[#1a5c42] px-2 py-0.5 rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />LIVE</span>}
                      </div>
                      <span className="text-[10px] text-gray-600 flex items-center gap-1"><Clock size={9} /> {latest.waktu}</span>
                    </div>
                  )}
                </div>

                {latest && captureColors && (
                  <div className="mx-4 mb-4">
                    {/* Info pasien di tangkapan */}
                    {(latest.nama || latest.usia || latest.kelamin) && (
                      <div className="flex gap-2 flex-wrap mb-3 pb-3 border-b border-[#243044]">
                        {latest.nama    && <span className="text-[11px] text-gray-400 flex items-center gap-1"><User size={11} className="text-[#34d399]" /> {latest.nama}</span>}
                        {latest.usia    && <span className="text-[11px] text-gray-400 flex items-center gap-1"><Calendar size={11} className="text-[#34d399]" /> {latest.usia} tahun</span>}
                        {latest.kelamin && <span className="text-[11px] text-gray-400">{latest.kelamin}</span>}
                      </div>
                    )}
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Hasil Klasifikasi ML</p>
                    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${captureColors.bg} ${captureColors.border} mb-3`}>
                      <span className={`w-3 h-3 rounded-full ${captureColors.dot}`} />
                      {getLabelIcon(latest.label)}
                      <span className={`text-[14px] ${captureColors.text}`} style={{ fontWeight: 700 }}>{labelDisplay(latest.label)}</span>
                      <span className={`ml-auto text-[13px] ${captureColors.text}`} style={{ fontWeight: 600 }}>{latest.confidence.toFixed(1)}%</span>
                    </div>
                    <Bar label="Normal"   value={latest.normal}   color="bg-emerald-500" />
                    <Bar label="Immature" value={latest.immature} color="bg-amber-500" />
                    <Bar label="Mature"   value={latest.mature}   color="bg-red-500" />
                  </div>
                )}
              </div>
            </div>

            {/* Kanan: keterangan + info device */}
            <div className="flex flex-col gap-4">
              <div className="bg-[#1a2332] rounded-2xl border border-[#243044] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info size={14} className="text-[#38bdf8]" />
                  <h3 className="text-[14px] text-gray-300" style={{ fontWeight: 600 }}>Keterangan Klasifikasi</h3>
                </div>
                {[
                  { dot: "bg-emerald-500", label: "Normal",   desc: "Lensa mata jernih, tidak ditemukan kekeruhan." },
                  { dot: "bg-amber-500",   label: "Immature", desc: "Kekeruhan sebagian, lensa belum sepenuhnya keruh." },
                  { dot: "bg-red-500",     label: "Mature",   desc: "Lensa mata sepenuhnya keruh, perlu tindakan medis." },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-2.5 mb-2">
                    <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${item.dot}`} />
                    <div>
                      <span className="text-[12px] text-gray-200" style={{ fontWeight: 600 }}>{item.label}:</span>
                      <span className="text-[12px] text-gray-500"> {item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-[#1a2332] rounded-2xl border border-[#243044] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Cpu size={14} className="text-[#34d399]" />
                  <h3 className="text-[14px] text-gray-300" style={{ fontWeight: 600 }}>Info Perangkat</h3>
                </div>
                {[
                  { label: "Device",            value: "ESP32-CAM" },
                  { label: "Resolusi Kamera",   value: "OV3660 — 2048×1536" },
                  { label: "Metode ML",         value: "CNN (TensorFlow/Keras)" },
                  { label: "Database",          value: "MySQL (Railway)" },
                  { label: "Total Deteksi",     value: `${stats?.total ?? "—"} data` },
                  { label: "ID Tangkapan",      value: latest ? `#${latest.id}` : "—" },
                  { label: "Auto-Refresh",      value: autoOn ? "Aktif (5 detik)" : "Nonaktif" },
                  { label: "Status MySQL",      value: connected ? "Terhubung ✓" : "Tidak terhubung" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-[#243044] last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
                      <span className="text-[12px] text-gray-500">{item.label}</span>
                    </div>
                    <span className="text-[12px] text-gray-300">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: INPUT PASIEN ═══════════════════════════ */}
        {activeTab === "input" && (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Form */}
            <div className="bg-[#1a2332] rounded-2xl border border-[#243044] p-5">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus size={16} className="text-[#34d399]" />
                <h2 className="text-[15px] text-gray-200" style={{ fontWeight: 600 }}>Input Data Pasien</h2>
              </div>

              {/* Status */}
              {fStatus && (
                <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border mb-4 ${fStatus.type === "ok" ? "bg-emerald-900/30 border-emerald-800 text-emerald-400" : "bg-red-900/30 border-red-800 text-red-400"}`}>
                  {fStatus.type === "ok" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  <span className="text-[12px]">{fStatus.msg}</span>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[12px] text-gray-400 mb-1.5 block">Nama pasien <span className="text-red-400">*</span></label>
                  <input type="text" value={fNama} onChange={e => setFNama(e.target.value)} placeholder="Nama lengkap"
                    className="w-full bg-[#111a27] border border-[#243044] rounded-xl px-3 py-2.5 text-[13px] text-gray-200 placeholder-gray-600 outline-none focus:border-[#34d399] transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px] text-gray-400 mb-1.5 block">Usia <span className="text-red-400">*</span></label>
                    <input type="number" value={fUsia} onChange={e => setFUsia(e.target.value)} placeholder="Tahun" min={1} max={120}
                      className="w-full bg-[#111a27] border border-[#243044] rounded-xl px-3 py-2.5 text-[13px] text-gray-200 placeholder-gray-600 outline-none focus:border-[#34d399] transition-colors" />
                  </div>
                  <div>
                    <label className="text-[12px] text-gray-400 mb-1.5 block">Jenis kelamin <span className="text-red-400">*</span></label>
                    <select value={fKelamin} onChange={e => setFKelamin(e.target.value)}
                      className="w-full bg-[#111a27] border border-[#243044] rounded-xl px-3 py-2.5 text-[13px] text-gray-200 outline-none focus:border-[#34d399] transition-colors">
                      <option value="">Pilih...</option>
                      <option>Laki-laki</option>
                      <option>Perempuan</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[12px] text-gray-400 mb-1.5 block">
                    ID deteksi MySQL
                    <span className="text-gray-600 ml-1">(opsional — untuk update baris existing)</span>
                  </label>
                  <input type="number" value={fId} onChange={e => setFId(e.target.value)} placeholder="Biarkan kosong jika baru"
                    className="w-full bg-[#111a27] border border-[#243044] rounded-xl px-3 py-2.5 text-[13px] text-gray-200 placeholder-gray-600 outline-none focus:border-[#34d399] transition-colors" />
                </div>

                <button onClick={savePatient} disabled={fLoading}
                  className="w-full bg-[#0d2e24] hover:bg-[#1a5c42] border border-[#1a5c42] rounded-xl py-3 text-[#34d399] text-[14px] flex items-center justify-center gap-2 transition-colors disabled:opacity-60 mt-1"
                  style={{ fontWeight: 600 }}>
                  {fLoading ? <><Loader size={15} className="animate-spin" />Menyimpan...</> : <><Save size={15} />Simpan data pasien</>}
                </button>
              </div>
            </div>

            {/* Panduan alur */}
            <div className="flex flex-col gap-4">
              <div className="bg-[#1a2332] rounded-2xl border border-[#243044] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Info size={14} className="text-[#38bdf8]" />
                  <h3 className="text-[14px] text-gray-300" style={{ fontWeight: 600 }}>Panduan Alur Sistem</h3>
                </div>
                <div className="flex flex-col gap-3">
                  {[
                    { n: 1, color: "bg-[#0d2e24] border-[#1a5c42] text-[#34d399]", text: "ESP32-CAM ambil foto & kirim ke API Railway" },
                    { n: 2, color: "bg-[#0d2e24] border-[#1a5c42] text-[#34d399]", text: "Flask + CNN prediksi hasil → simpan ke MySQL" },
                    { n: 3, color: "bg-[#2a2010] border-[#78500a] text-[#f59e0b]", text: "Admin input nama, usia, jenis kelamin di halaman ini" },
                    { n: 4, color: "bg-[#2a2010] border-[#78500a] text-[#f59e0b]", text: "Data tersimpan ke tabel riwayat_deteksi (MySQL)" },
                    { n: 5, color: "bg-[#0d1f35] border-[#1e4a7a] text-[#38bdf8]", text: "Pasien cari data via dashboard user (Vercel)" },
                    { n: 6, color: "bg-[#0d1f35] border-[#1e4a7a] text-[#38bdf8]", text: "Hasil prediksi + foto CNN tampil di halaman user" },
                  ].map(step => (
                    <div key={step.n} className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 text-[12px] ${step.color}`} style={{ fontWeight: 700 }}>
                        {step.n}
                      </div>
                      <p className="text-[13px] text-gray-400">{step.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#1a2332] rounded-2xl border border-[#243044] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Activity size={14} className="text-[#34d399]" />
                  <h3 className="text-[14px] text-gray-300" style={{ fontWeight: 600 }}>Endpoint API yang Dibutuhkan</h3>
                </div>
                {[
                  { method: "POST", path: "/patient",  desc: "Simpan/update data pasien" },
                  { method: "GET",  path: "/search",   desc: "Cari pasien (nama/usia/kelamin)" },
                  { method: "GET",  path: "/image/:id",desc: "Ambil foto base64 by ID" },
                  { method: "GET",  path: "/latest",   desc: "Tangkapan terbaru + foto" },
                  { method: "GET",  path: "/history",  desc: "Riwayat tanpa foto (ringan)" },
                  { method: "GET",  path: "/stats",    desc: "Statistik Normal/Immature/Mature" },
                ].map(ep => (
                  <div key={ep.path} className="flex items-center gap-2 py-1.5 border-b border-[#243044] last:border-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${ep.method === "POST" ? "bg-amber-900/40 text-amber-400" : "bg-emerald-900/40 text-emerald-400"}`}>{ep.method}</span>
                    <span className="text-[12px] text-gray-300 font-mono">{ep.path}</span>
                    <span className="text-[11px] text-gray-600 ml-auto">{ep.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: RIWAYAT ════════════════════════════════ */}
        {activeTab === "riwayat" && (
          <div className="max-w-6xl mx-auto">
            <div className="bg-[#1a2332] rounded-2xl border border-[#243044] overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw size={16} className="text-[#34d399]" />
                  <h2 className="text-[15px] text-gray-200" style={{ fontWeight: 600 }}>Riwayat Deteksi</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-500 bg-[#111a27] border border-[#243044] px-2 py-0.5 rounded-full">{history.length} data</span>
                  <button onClick={fetchHistory} className="w-7 h-7 rounded-full bg-[#0d2e24] flex items-center justify-center hover:bg-[#1a5c42] transition-colors">
                    <RefreshCw size={12} className={`text-[#34d399] ${histLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {histLoading && <div className="flex items-center justify-center py-8 gap-2"><Loader size={16} className="text-[#34d399] animate-spin" /><span className="text-[13px] text-gray-500">Memuat dari MySQL...</span></div>}
              {!histLoading && history.length === 0 && <div className="text-center py-8 text-gray-500 text-[13px]">Belum ada data.</div>}

              {/* Grid riwayat */}
              <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#1e2d40]">
                {history.map(row => {
                  const colors  = getLabelColor(row.prediksi);
                  const maxConf = Math.max(row.normal_pct, row.imm_pct, row.mat_pct);
                  const isSel   = selectedId === row.id;
                  return (
                    <button key={row.id} onClick={() => setSelectedId(isSel ? null : row.id)}
                      className={`flex items-center gap-3 px-5 py-3.5 hover:bg-[#1e2d40] transition-colors text-left border-b border-[#1e2d40] ${isSel ? "bg-[#1e2d40]" : ""}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors.bg} border ${colors.border}`}>
                        {getLabelIcon(row.prediksi)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`} style={{ fontWeight: 600 }}>{row.prediksi}</span>
                          <span className="text-[11px] text-gray-500">#{row.id}</span>
                        </div>
                        <p className="text-[12px] text-gray-400 truncate">{row.nama || "Pasien belum diinput"}</p>
                        <p className="text-[11px] text-gray-600 flex items-center gap-1"><Clock size={10} />{row.waktu}</p>
                      </div>
                      <span className={`text-[13px] shrink-0 ${colors.text}`} style={{ fontWeight: 600 }}>{maxConf.toFixed(1)}%</span>
                      <ChevronRight size={14} className={`text-gray-600 shrink-0 transition-transform ${isSel ? "rotate-90" : ""}`} />
                    </button>
                  );
                })}
              </div>

              {/* Detail panel */}
              {selectedRow && rowColors && (
                <div className="mx-5 my-4 p-5 bg-[#111a27] rounded-xl border border-[#243044]">
                  <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-4">Detail #{selectedRow.id}</p>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div>
                      {/* Info pasien */}
                      {(selectedRow.nama || selectedRow.usia || selectedRow.kelamin) && (
                        <div className="flex gap-3 flex-wrap mb-3 pb-3 border-b border-[#243044]">
                          <span className="text-[12px] text-gray-400 flex items-center gap-1"><User size={12} className="text-[#34d399]" />{selectedRow.nama}</span>
                          {selectedRow.usia    && <span className="text-[12px] text-gray-400 flex items-center gap-1"><Calendar size={12} className="text-[#34d399]" />{selectedRow.usia} tahun</span>}
                          {selectedRow.kelamin && <span className="text-[12px] text-gray-400">{selectedRow.kelamin}</span>}
                        </div>
                      )}
                      <DetailPhoto id={selectedId} loading={false} />
                      <p className="text-[10px] text-gray-600 mt-2 flex items-center gap-1"><Clock size={9} />{selectedRow.waktu}</p>
                    </div>
                    <div className="flex flex-col justify-center gap-3">
                      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${rowColors.bg} ${rowColors.border}`}>
                        <span className={`w-3 h-3 rounded-full ${rowColors.dot}`} />
                        {getLabelIcon(selectedRow.prediksi)}
                        <span className={`text-[14px] ${rowColors.text}`} style={{ fontWeight: 700 }}>{labelDisplay(selectedRow.prediksi)}</span>
                        <span className={`ml-auto text-[13px] ${rowColors.text}`} style={{ fontWeight: 600 }}>{selectedRow.confidence.toFixed(1)}%</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Normal",   value: selectedRow.normal_pct, color: "bg-emerald-500", text: "text-emerald-400" },
                          { label: "Immature", value: selectedRow.imm_pct,    color: "bg-amber-500",   text: "text-amber-400"   },
                          { label: "Mature",   value: selectedRow.mat_pct,    color: "bg-red-500",     text: "text-red-400"     },
                        ].map(item => (
                          <div key={item.label} className="bg-[#1a2332] p-3 rounded-xl border border-[#243044]">
                            <p className="text-[10px] text-gray-500 mb-1">{item.label}</p>
                            <p className={`text-[18px] ${item.text}`} style={{ fontWeight: 700 }}>{item.value.toFixed(1)}%</p>
                            <div className="h-1.5 rounded-full bg-[#243044] mt-2 overflow-hidden">
                              <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="px-5 py-3 bg-[#111a27] border-t border-[#243044] flex items-center gap-2">
                <Clock size={12} className="text-gray-600" />
                <span className="text-[11px] text-gray-500">Diperbarui: {dateStr}, {timeStr}</span>
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: STATISTIK ══════════════════════════════ */}
        {activeTab === "statistik" && (
          <div className="max-w-6xl mx-auto flex flex-col gap-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Total Scan", value: stats?.total    ?? 0, sub: "Dari MySQL",     color: "text-[#34d399]",   border: "border-[#34d399]"   },
                { label: "Normal",     value: stats?.Normal   ?? 0, sub: "Mata sehat",     color: "text-emerald-400", border: "border-emerald-500" },
                { label: "Immature",   value: stats?.Immature ?? 0, sub: "Katarak awal",   color: "text-amber-400",   border: "border-amber-500"   },
                { label: "Mature",     value: stats?.Mature   ?? 0, sub: "Katarak lanjut", color: "text-red-400",     border: "border-red-500"     },
              ].map(s => (
                <div key={s.label} className={`bg-[#1a2332] rounded-2xl shadow-lg p-4 border-t-4 ${s.border} border-x border-b border-[#243044]`}>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">{s.label}</p>
                  {statsLoad ? <div className="w-12 h-9 bg-[#243044] rounded animate-pulse my-1" /> : <p className={`text-[32px] ${s.color}`} style={{ fontWeight: 700 }}>{s.value}</p>}
                  <p className="text-[11px] text-gray-600">{s.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-[#1a2332] rounded-2xl border border-[#243044] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2"><BarChart2 size={15} className="text-[#34d399]" /><h3 className="text-[14px] text-gray-300" style={{ fontWeight: 600 }}>Proporsi Klasifikasi</h3></div>
                  <button onClick={fetchStats} className="w-7 h-7 rounded-full bg-[#0d2e24] flex items-center justify-center hover:bg-[#1a5c42] transition-colors">
                    <RefreshCw size={12} className={`text-[#34d399] ${statsLoad ? "animate-spin" : ""}`} />
                  </button>
                </div>
                {[
                  { label: "Normal",   count: stats?.Normal   ?? 0, color: "bg-emerald-500", text: "text-emerald-400" },
                  { label: "Immature", count: stats?.Immature ?? 0, color: "bg-amber-400",   text: "text-amber-400"   },
                  { label: "Mature",   count: stats?.Mature   ?? 0, color: "bg-red-500",     text: "text-red-400"     },
                ].map(item => {
                  const total = stats?.total ?? 0;
                  const pct   = total > 0 ? (item.count / total) * 100 : 0;
                  return (
                    <div key={item.label} className="mb-4">
                      <div className="flex justify-between mb-1">
                        <span className="text-[13px] text-gray-400">{item.label}</span>
                        <div className="flex items-center gap-1">
                          <span className={`text-[13px] ${item.text}`} style={{ fontWeight: 600 }}>{item.count}</span>
                          <span className="text-[11px] text-gray-600">({pct.toFixed(0)}%)</span>
                        </div>
                      </div>
                      <div className="h-4 rounded-full bg-[#111a27] overflow-hidden">
                        <div className={`h-full rounded-full ${item.color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-[#1a2332] rounded-2xl border border-[#243044] p-5">
                <div className="flex items-center gap-2 mb-4"><Cpu size={15} className="text-[#34d399]" /><h3 className="text-[14px] text-gray-300" style={{ fontWeight: 600 }}>Informasi Sistem</h3></div>
                {[
                  { label: "Mikrokontroler",     value: "ESP32-CAM" },
                  { label: "Modul kamera",       value: "OV3660 (3MP)" },
                  { label: "Metode klasifikasi", value: "CNN (TensorFlow/Keras)" },
                  { label: "Database",           value: "MySQL (Railway)" },
                  { label: "Penyimpanan foto",   value: "Base64 → MySQL" },
                  { label: "Tanggal",            value: dateStr },
                  { label: "Versi sistem",       value: "v2.2.0" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-[#243044] last:border-0">
                    <span className="text-[12px] text-gray-500">{item.label}</span>
                    <span className="text-[12px] text-gray-300">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: SETTINGS ═══════════════════════════════ */}
        {activeTab === "settings" && (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* MySQL config */}
            <div className="bg-[#1a2332] rounded-2xl border border-[#243044] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Database size={15} className="text-[#34d399]" />
                <h2 className="text-[15px] text-gray-200" style={{ fontWeight: 600 }}>Pengaturan MySQL Railway</h2>
              </div>
              <p className="text-[12px] text-gray-500 mb-4 leading-relaxed">
                Variabel ini diset di <span className="text-gray-300">Railway Dashboard → Variables</span>. Tidak perlu diubah manual di sini — pastikan sudah benar di Railway.
              </p>
              {[
                { label: "MYSQLHOST",     placeholder: "containers-us-west-xxx.railway.app", type: "text"     },
                { label: "MYSQLPORT",     placeholder: "3306",                               type: "number"   },
                { label: "MYSQLDATABASE",placeholder: "railway",                             type: "text"     },
                { label: "MYSQLUSER",    placeholder: "root",                                type: "text"     },
                { label: "MYSQLPASSWORD",placeholder: "••••••••",                            type: "password" },
              ].map(f => (
                <div key={f.label} className="mb-3">
                  <label className="text-[12px] text-gray-400 mb-1.5 block font-mono">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder}
                    className="w-full bg-[#111a27] border border-[#243044] rounded-xl px-3 py-2.5 text-[13px] text-gray-200 placeholder-gray-600 outline-none focus:border-[#34d399] transition-colors font-mono" />
                </div>
              ))}

              {dbStatus && (
                <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border mb-3 ${dbStatus.type === "ok" ? "bg-emerald-900/30 border-emerald-800 text-emerald-400" : "bg-red-900/30 border-red-800 text-red-400"}`}>
                  {dbStatus.type === "ok" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  <span className="text-[12px]">{dbStatus.msg}</span>
                </div>
              )}
              <button onClick={testConn}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#0d2e24] hover:bg-[#1a5c42] border border-[#1a5c42] rounded-xl text-[#34d399] text-[13px] transition-colors"
                style={{ fontWeight: 600 }}>
                <Plug size={14} /> Tes koneksi API Railway
              </button>
            </div>

            {/* SQL + endpoint */}
            <div className="flex flex-col gap-4">
              <div className="bg-[#1a2332] rounded-2xl border border-[#243044] p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2"><Terminal size={14} className="text-[#34d399]" /><h3 className="text-[14px] text-gray-300" style={{ fontWeight: 600 }}>SQL Setup — Tambah Kolom Pasien</h3></div>
                  <button onClick={copySQL} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111a27] border border-[#243044] text-[11px] text-gray-400 hover:text-gray-200 transition-colors">
                    <Copy size={12} /> {copied ? "Tersalin!" : "Salin"}
                  </button>
                </div>
                <pre className="bg-[#0b1120] border border-[#243044] rounded-xl p-4 text-[12px] text-gray-300 font-mono leading-relaxed overflow-x-auto">
{`ALTER TABLE riwayat_deteksi
  ADD COLUMN nama VARCHAR(100) DEFAULT NULL,
  ADD COLUMN usia INT DEFAULT NULL,
  ADD COLUMN kelamin ENUM(
    'Laki-laki','Perempuan'
  ) DEFAULT NULL;`}
                </pre>
                <p className="text-[11px] text-gray-600 mt-2">Jalankan di Railway MySQL console atau DBeaver.</p>
              </div>

              <div className="bg-[#1a2332] rounded-2xl border border-[#243044] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Activity size={14} className="text-[#34d399]" />
                  <h3 className="text-[14px] text-gray-300" style={{ fontWeight: 600 }}>Endpoint Flask (app.py)</h3>
                </div>
                <p className="text-[12px] text-gray-500 mb-3">Endpoint baru yang ditambahkan di versi v2.2.0:</p>
                {[
                  { method: "POST", path: "/patient",  desc: "Simpan/update data pasien (nama, usia, kelamin)" },
                  { method: "GET",  path: "/search",   desc: "Cari pasien berdasarkan nama/usia/kelamin"      },
                ].map(ep => (
                  <div key={ep.path} className="flex items-start gap-2 py-2 border-b border-[#243044] last:border-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono shrink-0 mt-0.5 ${ep.method === "POST" ? "bg-amber-900/40 text-amber-400" : "bg-emerald-900/40 text-emerald-400"}`}>
                      {ep.method}
                    </span>
                    <div>
                      <p className="text-[12px] text-gray-300 font-mono">{ep.path}</p>
                      <p className="text-[11px] text-gray-600">{ep.desc}</p>
                    </div>
                  </div>
                ))}
                <div className="mt-3 p-3 bg-[#0b1120] rounded-xl border border-[#243044]">
                  <p className="text-[11px] text-gray-500">Deploy ulang di Railway setelah update <span className="text-gray-300 font-mono">app.py</span> agar endpoint aktif.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex items-center justify-center gap-1.5 max-w-6xl mx-auto">
          <Eye size={12} className="text-[#34d399]" />
          <p className="text-[11px] text-gray-600">Deteksi Katarak IoT — Admin Dashboard · ESP32-CAM · 2026</p>
        </div>
      </div>
    </div>
  );
}
