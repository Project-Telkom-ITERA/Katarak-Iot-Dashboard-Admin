import { useState, useEffect, useCallback } from "react";
import {
  Eye, Wifi, WifiOff, Clock, Camera, RefreshCw, ChevronRight,
  Activity, Cpu, BarChart2, AlertCircle, CheckCircle2, Info,
  ImageOff, Zap, Loader, User, Save
} from "lucide-react";

const API_URL = "https://web-production-0ec06.up.railway.app";

type HistoryRow = {
  id: number;
  prediksi: string;
  normal_pct: number;
  imm_pct: number;
  mat_pct: number;
  confidence: number;
  waktu: string;
  nama?: string | null;
  usia?: number | null;
  kelamin?: string | null;
  image_url?: string | null;
};

type StatsData = { Normal: number; Immature: number; Mature: number; total: number };

type LatestCapture = {
  id: number; prediksi: string; label: string;
  confidence: number; normal: number; immature: number; mature: number;
  waktu: string; image_url?: string | null; image_base64?: string;
};

const getLabelColor = (label: string) => {
  if (label === "Normal")   return { bg: "bg-emerald-900/40", text: "text-emerald-400", dot: "bg-emerald-500", border: "border-emerald-700" };
  if (label === "Immature") return { bg: "bg-amber-900/40",   text: "text-amber-400",   dot: "bg-amber-500",   border: "border-amber-700"   };
  if (label === "Mature")   return { bg: "bg-red-900/40",     text: "text-red-400",     dot: "bg-red-500",     border: "border-red-800"     };
  return { bg: "bg-gray-800", text: "text-gray-400", dot: "bg-gray-500", border: "border-gray-700" };
};
const getLabelIcon = (label: string) => {
  if (label === "Normal")   return <CheckCircle2 size={14} className="text-emerald-400" />;
  if (label === "Immature") return <AlertCircle  size={14} className="text-amber-400"   />;
  if (label === "Mature")   return <AlertCircle  size={14} className="text-red-400"     />;
  return <Info size={14} />;
};
const labelDisplay = (label: string) =>
  label === "Normal" ? "Mata Normal" : label === "Immature" ? "Katarak Immature" : "Katarak Mature";

function useCurrentTime() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  return time;
}

const ThumbIcon = ({ label }: { label: string }) => {
  const c = getLabelColor(label);
  return (
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${c.bg} border ${c.border}`}>
      {getLabelIcon(label)}
    </div>
  );
};

const DetailPhoto = ({ imageUrl, loading }: { imageUrl: string | null; loading: boolean }) => {
  if (loading) return (
    <div className="w-full rounded-xl bg-[#0b1120] border border-[#243044] flex items-center justify-center gap-2 py-10">
      <Loader size={18} className="text-[#34d399] animate-spin" />
      <span className="text-[12px] text-gray-500">Memuat foto...</span>
    </div>
  );
  if (!imageUrl) return (
    <div className="w-full rounded-xl bg-[#0b1120] border border-[#243044] flex flex-col items-center justify-center gap-2 py-10">
      <ImageOff size={22} className="text-gray-600" />
      <span className="text-[11px] text-gray-600">Foto tidak tersimpan di server</span>
    </div>
  );
  return (
    <div className="w-full rounded-xl overflow-hidden border border-[#243044] bg-[#0b1120]" style={{ aspectRatio: "4/3" }}>
      <img src={imageUrl} alt="tangkapan" className="w-full h-full object-cover" />
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab]   = useState<"latest" | "history" | "stats">("latest");
  const [connected, setConnected]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const now = useCurrentTime();

  const [latestCapture, setLatestCapture]   = useState<LatestCapture | null>(null);
  const [captureLoading, setCaptureLoading] = useState(false);
  const [captureError, setCaptureError]     = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh]       = useState(false);
  const [lastFetched, setLastFetched]       = useState<Date | null>(null);

  const [formNama,    setFormNama]    = useState("");
  const [formUsia,    setFormUsia]    = useState("");
  const [formKelamin, setFormKelamin] = useState("");
  const [formSaving,  setFormSaving]  = useState(false);
  const [formMsg,     setFormMsg]     = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [savedId,     setSavedId]     = useState<number | null>(null);

  const [history, setHistory]                     = useState<HistoryRow[]>([]);
  const [histLoading, setHistLoading]             = useState(false);
  const [selectedRow, setSelectedRow]             = useState<HistoryRow | null>(null);
  const [detailImageUrl, setDetailImageUrl]       = useState<string | null>(null);
  const [detailImgLoading, setDetailImgLoading]   = useState(false);
  const [statsData, setStatsData]                 = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading]           = useState(false);

  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("id-ID",  { day: "2-digit", month: "long", year: "numeric" });

  useEffect(() => {
    fetch(`${API_URL}/`).then(r => { if (r.ok) setConnected(true); }).catch(() => setConnected(false));
  }, []);

  const fetchLatestCapture = useCallback(async () => {
    setCaptureLoading(true); setCaptureError(null);
    try {
      let data: LatestCapture | null = null;
      try { const r = await fetch(`${API_URL}/latest`); if (r.ok) data = await r.json(); } catch {}
      if (!data) {
        const r = await fetch(`${API_URL}/history?limit=1`);
        if (!r.ok) throw new Error("HTTP " + r.status);
        const j = await r.json();
        const rows: HistoryRow[] = j.data ?? [];
        if (rows.length > 0) {
          const row = rows[0];
          data = { id: row.id, prediksi: row.prediksi, label: row.prediksi, confidence: row.confidence, normal: row.normal_pct, immature: row.imm_pct, mature: row.mat_pct, waktu: row.waktu, image_url: row.image_url };
        }
      }
      if (data) {
        setSavedId(prev => { if (prev !== data!.id) { setFormNama(""); setFormUsia(""); setFormKelamin(""); setFormMsg(null); } return prev; });
        setLatestCapture(data); setConnected(true); setLastFetched(new Date());
      } else setCaptureError("Belum ada data tangkapan di database.");
    } catch { setCaptureError("Gagal mengambil data dari API Railway."); setConnected(false); }
    finally { setCaptureLoading(false); }
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const res = await fetch(`${API_URL}/history?limit=50`);
      const data = await res.json();
      setHistory(data.data ?? []);
    } catch {} finally { setHistLoading(false); }
  }, []);

  const fetchDetailImage = useCallback(async (id: number) => {
    setDetailImgLoading(true); setDetailImageUrl(null);
    try {
      const res = await fetch(`${API_URL}/image/${id}`);
      if (res.ok) { const data = await res.json(); setDetailImageUrl(data.image_url ?? null); }
    } catch {} finally { setDetailImgLoading(false); }
  }, []);

  const handleSelectRow = (row: HistoryRow) => {
    if (selectedRow?.id === row.id) { setSelectedRow(null); setDetailImageUrl(null); return; }
    setSelectedRow(row); fetchDetailImage(row.id);
  };

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try { const r = await fetch(`${API_URL}/stats`); setStatsData(await r.json()); }
    catch {} finally { setStatsLoading(false); }
  }, []);

  useEffect(() => { fetchLatestCapture(); fetchHistory(); fetchStats(); }, [fetchLatestCapture, fetchHistory, fetchStats]);

  useEffect(() => {
    if (!autoRefresh) return;
    const iv = setInterval(() => { fetchLatestCapture(); fetchStats(); }, 5000);
    return () => clearInterval(iv);
  }, [autoRefresh, fetchLatestCapture, fetchStats]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLatestCapture(); fetchHistory(); fetchStats();
    setTimeout(() => setRefreshing(false), 1200);
  };

  const handleSimpan = async () => {
    if (!latestCapture) return;
    if (!formNama.trim() || !formUsia || !formKelamin) {
      setFormMsg({ type: "err", text: "Nama, usia, dan jenis kelamin wajib diisi." }); return;
    }
    setFormSaving(true); setFormMsg(null);
    try {
      const res = await fetch(`${API_URL}/patient`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: latestCapture.id, nama: formNama.trim(), usia: parseInt(formUsia), kelamin: formKelamin }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      setFormMsg({ type: "ok", text: `Data pasien "${formNama.trim()}" berhasil disimpan (ID #${latestCapture.id})` });
      setSavedId(latestCapture.id);
      fetchHistory();
    } catch { setFormMsg({ type: "err", text: "Gagal menyimpan ke MySQL. Coba lagi." }); }
    finally { setFormSaving(false); }
  };

  const captureColors = latestCapture ? getLabelColor(latestCapture.label) : null;
  const rowColors     = selectedRow   ? getLabelColor(selectedRow.prediksi) : null;
  const latestImgSrc  = latestCapture?.image_url ?? (latestCapture?.image_base64 ? `data:image/jpeg;base64,${latestCapture.image_base64}` : null);
  const alreadySaved  = latestCapture ? savedId === latestCapture.id : false;

  const KeteranganCard = () => (
    <div className="bg-[#1a2332] rounded-2xl shadow-lg p-4 border border-[#243044]">
      <div className="flex items-center gap-2 mb-3">
        <Info size={15} className="text-[#38bdf8]" />
        <h3 className="text-[14px] text-gray-300">Keterangan Klasifikasi</h3>
      </div>
      {[
        { label: "Normal",   desc: "Lensa mata jernih, tidak ditemukan kekeruhan.",      color: "bg-emerald-500" },
        { label: "Immature", desc: "Kekeruhan sebagian, lensa belum sepenuhnya keruh.",  color: "bg-amber-500"   },
        { label: "Mature",   desc: "Lensa mata sepenuhnya keruh, perlu tindakan medis.", color: "bg-red-500"     },
      ].map(item => (
        <div key={item.label} className="flex items-start gap-2.5 mb-2">
          <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${item.color}`}></span>
          <div>
            <span className="text-[12px] text-gray-200 font-semibold">{item.label}:</span>
            <span className="text-[12px] text-gray-500"> {item.desc}</span>
          </div>
        </div>
      ))}
    </div>
  );

  const FormPasienCard = () => (
    <div className="bg-[#1a2332] rounded-2xl shadow-lg border border-[#243044] overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-[#243044] flex items-center gap-2">
        <User size={15} className="text-[#34d399]" />
        <h3 className="text-[14px] text-gray-200">Data Pasien</h3>
        {alreadySaved && (
          <span className="ml-auto text-[10px] bg-emerald-900/40 border border-emerald-700 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 size={10} /> Tersimpan
          </span>
        )}
        {!latestCapture && (
          <span className="ml-auto text-[10px] text-gray-600">Menunggu foto dari ESP32...</span>
        )}
      </div>
      <div className="p-5 flex flex-col gap-3">
        {latestCapture && !alreadySaved && (
          <div className="bg-amber-900/20 border border-amber-800/50 rounded-xl px-3 py-2 flex items-center gap-2">
            <AlertCircle size={12} className="text-amber-400 shrink-0" />
            <span className="text-[11px] text-amber-400">Foto #{latestCapture.id} belum memiliki data pasien. Isi dan simpan.</span>
          </div>
        )}
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1.5">Nama Lengkap Pasien</label>
            <input
              type="text" value={formNama} onChange={e => setFormNama(e.target.value)}
              placeholder="Contoh: Ahmad Budi Santoso"
              disabled={alreadySaved || !latestCapture}
              className="w-full bg-[#111a27] border border-[#243044] focus:border-[#34d399] rounded-xl px-3 py-2.5 text-[13px] text-gray-200 outline-none placeholder-gray-600 disabled:opacity-50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1.5">Usia (tahun)</label>
              <input
                type="number" value={formUsia} onChange={e => setFormUsia(e.target.value)}
                placeholder="Contoh: 55" min="1" max="120"
                disabled={alreadySaved || !latestCapture}
                className="w-full bg-[#111a27] border border-[#243044] focus:border-[#34d399] rounded-xl px-3 py-2.5 text-[13px] text-gray-200 outline-none placeholder-gray-600 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1.5">Jenis Kelamin</label>
              <select
                value={formKelamin} onChange={e => setFormKelamin(e.target.value)}
                disabled={alreadySaved || !latestCapture}
                className="w-full bg-[#111a27] border border-[#243044] focus:border-[#34d399] rounded-xl px-3 py-2.5 text-[13px] text-gray-200 outline-none disabled:opacity-50"
              >
                <option value="">-- Pilih --</option>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
          </div>
        </div>

        {formMsg && (
          <div className={`rounded-xl px-3 py-2 flex items-start gap-2 text-[12px] ${formMsg.type === "ok" ? "bg-emerald-900/30 border border-emerald-800 text-emerald-400" : "bg-red-900/30 border border-red-800 text-red-400"}`}>
            {formMsg.type === "ok" ? <CheckCircle2 size={13} className="shrink-0 mt-0.5" /> : <AlertCircle size={13} className="shrink-0 mt-0.5" />}
            {formMsg.text}
          </div>
        )}

        <button
          onClick={handleSimpan}
          disabled={formSaving || alreadySaved || !latestCapture}
          className="w-full bg-[#0d2e24] hover:bg-[#1a5c42] border border-[#1a5c42] rounded-xl py-2.5 text-[13px] text-[#34d399] font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {formSaving
            ? <><div className="w-3.5 h-3.5 border-2 border-[#34d399] border-t-transparent rounded-full animate-spin" /> Menyimpan...</>
            : alreadySaved
            ? <><CheckCircle2 size={14} /> Data Sudah Tersimpan</>
            : <><Save size={14} /> Simpan Data Pasien ke MySQL</>
          }
        </button>
      </div>
    </div>
  );

  const LatestCaptureCard = () => (
    <div className="bg-[#1a2332] rounded-2xl shadow-lg overflow-hidden border border-[#243044]">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera size={18} className="text-[#34d399]" />
          <h2 className="text-[15px] text-gray-200">Tangkapan Terbaru</h2>
          {captureLoading && <div className="w-3.5 h-3.5 border-2 border-[#34d399] border-t-transparent rounded-full animate-spin" />}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAutoRefresh(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] transition-all ${autoRefresh ? "bg-[#0d2e24] border-[#34d399] text-[#34d399]" : "bg-[#111a27] border-[#243044] text-gray-500 hover:text-gray-300"}`}>
            <Zap size={10} className={autoRefresh ? "animate-pulse" : ""} />
            {autoRefresh ? "Live" : "Auto"}
          </button>
          <button onClick={fetchLatestCapture} className="w-7 h-7 rounded-full bg-[#0d2e24] flex items-center justify-center hover:bg-[#1a5c42] transition-colors">
            <RefreshCw size={12} className={`text-[#34d399] ${captureLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
      <div className="mx-5 mb-3">
        <div className="rounded-xl overflow-hidden bg-[#0b1120] border border-[#243044]" style={{ aspectRatio: "4/3" }}>
          {captureLoading && !latestCapture ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-[#34d399] border-t-transparent rounded-full animate-spin" />
              <span className="text-[12px] text-gray-500">Mengambil foto dari ESP32-CAM...</span>
            </div>
          ) : captureError && !latestCapture ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 px-4 text-center">
              <ImageOff size={28} className="text-gray-600" />
              <span className="text-[12px] text-gray-500">{captureError}</span>
            </div>
          ) : latestImgSrc ? (
            <img src={latestImgSrc} alt={`Tangkapan #${latestCapture?.id}`} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 px-4 text-center">
              <div className="w-14 h-14 rounded-full bg-[#111a27] border border-[#243044] flex items-center justify-center">
                <Eye size={22} className="text-[#34d399]" />
              </div>
              <p className="text-[12px] text-gray-400 font-semibold">{latestCapture ? `Tangkapan #${latestCapture.id}` : "Belum ada data"}</p>
              <p className="text-[11px] text-gray-600">Foto belum tersimpan di server</p>
            </div>
          )}
        </div>
        {latestCapture && (
          <div className="flex items-center justify-between mt-2 px-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-600 bg-[#111a27] border border-[#243044] px-2 py-0.5 rounded-full">#{latestCapture.id}</span>
              {autoRefresh && <span className="text-[10px] text-[#34d399] bg-[#0d2e24] border border-[#1a5c42] px-2 py-0.5 rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse"></span>LIVE</span>}
            </div>
            <span className="text-[10px] text-gray-600 flex items-center gap-1"><Clock size={9} /> {latestCapture.waktu}</span>
          </div>
        )}
      </div>
      {latestCapture && captureColors && (
        <div className="mx-5 mb-5">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Hasil Klasifikasi ML</p>
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${captureColors.bg} ${captureColors.border} mb-3`}>
            <span className={`w-3 h-3 rounded-full ${captureColors.dot}`}></span>
            {getLabelIcon(latestCapture.label)}
            <span className={`text-[14px] ${captureColors.text} font-bold`}>{labelDisplay(latestCapture.label)}</span>
            <span className={`ml-auto text-[13px] ${captureColors.text} font-semibold`}>{latestCapture.confidence.toFixed(1)}%</span>
          </div>
          {[
            { key: "normal",   label: "Normal",   value: latestCapture.normal,   color: "bg-emerald-500" },
            { key: "immature", label: "Immature", value: latestCapture.immature, color: "bg-amber-500"   },
            { key: "mature",   label: "Mature",   value: latestCapture.mature,   color: "bg-red-500"     },
          ].map(item => (
            <div key={item.key} className="mb-2">
              <div className="flex justify-between mb-1">
                <span className="text-[12px] text-gray-400">{item.label}</span>
                <span className="text-[12px] text-gray-300 font-semibold">{item.value.toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full bg-[#111a27] overflow-hidden">
                <div className={`h-full rounded-full ${item.color} transition-all duration-700`} style={{ width: `${item.value}%` }} />
              </div>
            </div>
          ))}
          {lastFetched && <p className="text-[10px] text-gray-600 mt-2 flex items-center gap-1"><RefreshCw size={9} /> Diperbarui: {lastFetched.toLocaleTimeString("id-ID")}</p>}
        </div>
      )}
    </div>
  );

  const TangkapanContent = () => (
    <div className="flex flex-col gap-4">
      <LatestCaptureCard />
      <FormPasienCard />
      <KeteranganCard />
    </div>
  );

  const RiwayatContent = () => (
    <div className="flex flex-col gap-4">
      <div className="bg-[#1a2332] rounded-2xl shadow-lg overflow-hidden border border-[#243044]">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw size={16} className="text-[#34d399]" />
            <h2 className="text-[15px] text-gray-200">Riwayat Deteksi</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-500 bg-[#111a27] border border-[#243044] px-2 py-0.5 rounded-full">{history.length} data</span>
            <button onClick={fetchHistory} className="w-7 h-7 rounded-full bg-[#0d2e24] flex items-center justify-center">
              <RefreshCw size={12} className={`text-[#34d399] ${histLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
        {histLoading && <div className="flex items-center justify-center py-8 gap-2"><div className="w-4 h-4 border-2 border-[#34d399] border-t-transparent rounded-full animate-spin"></div><span className="text-[12px] text-gray-500">Memuat dari MySQL...</span></div>}
        {!histLoading && history.length === 0 && <div className="text-center py-8 text-gray-500 text-[13px]">Belum ada data riwayat.</div>}
        <div className="divide-y divide-[#1e2d40]">
          {history.map(row => {
            const colors  = getLabelColor(row.prediksi);
            const maxConf = Math.max(row.normal_pct, row.imm_pct, row.mat_pct);
            const isSel   = selectedRow?.id === row.id;
            return (
              <button key={row.id} onClick={() => handleSelectRow(row)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1e2d40] transition-colors text-left ${isSel ? "bg-[#1e2d40]" : ""}`}>
                <ThumbIcon label={row.prediksi} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border} font-semibold`}>{row.prediksi}</span>
                    <span className="text-[11px] text-gray-500">#{row.id}</span>
                    {row.nama && <span className="text-[11px] text-gray-400 truncate">{row.nama}</span>}
                  </div>
                  <p className="text-[11px] text-gray-500 flex items-center gap-1"><Clock size={10} className="shrink-0" /> {row.waktu}</p>
                </div>
                <span className={`text-[13px] ${colors.text} shrink-0 font-semibold`}>{maxConf.toFixed(1)}%</span>
                <ChevronRight size={14} className={`text-gray-600 shrink-0 transition-transform ${isSel ? "rotate-90" : ""}`} />
              </button>
            );
          })}
        </div>
        {selectedRow && rowColors && (
          <div className="mx-4 mb-4 mt-1 p-4 bg-[#111a27] rounded-xl border border-[#243044]">
            <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-3">Detail #{selectedRow.id}</p>
            <DetailPhoto imageUrl={detailImageUrl} loading={detailImgLoading} />
            {selectedRow.nama && (
              <div className="mt-3 grid grid-cols-3 gap-2 text-[12px]">
                <div className="bg-[#1a2332] rounded-xl p-2 border border-[#243044]">
                  <p className="text-gray-500 text-[10px] mb-0.5">Nama</p>
                  <p className="text-gray-200 font-medium truncate">{selectedRow.nama}</p>
                </div>
                <div className="bg-[#1a2332] rounded-xl p-2 border border-[#243044]">
                  <p className="text-gray-500 text-[10px] mb-0.5">Usia</p>
                  <p className="text-gray-200 font-medium">{selectedRow.usia} thn</p>
                </div>
                <div className="bg-[#1a2332] rounded-xl p-2 border border-[#243044]">
                  <p className="text-gray-500 text-[10px] mb-0.5">Kelamin</p>
                  <p className="text-gray-200 font-medium">{selectedRow.kelamin}</p>
                </div>
              </div>
            )}
            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${rowColors.bg} ${rowColors.border} mt-3 mb-3`}>
              <span className={`w-3 h-3 rounded-full ${rowColors.dot}`}></span>
              {getLabelIcon(selectedRow.prediksi)}
              <span className={`text-[14px] ${rowColors.text} font-bold`}>{labelDisplay(selectedRow.prediksi)}</span>
              <span className={`ml-auto text-[13px] ${rowColors.text} font-semibold`}>{selectedRow.confidence.toFixed(1)}%</span>
            </div>
            {[
              { label: "Normal",   value: selectedRow.normal_pct, color: "bg-emerald-500" },
              { label: "Immature", value: selectedRow.imm_pct,    color: "bg-amber-500"   },
              { label: "Mature",   value: selectedRow.mat_pct,    color: "bg-red-500"     },
            ].map(item => (
              <div key={item.label} className="mb-2">
                <div className="flex justify-between mb-1">
                  <span className="text-[12px] text-gray-400">{item.label}</span>
                  <span className="text-[12px] text-gray-300 font-semibold">{item.value.toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full bg-[#1a2332] overflow-hidden">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
            <p className="text-[10px] text-gray-600 mt-2 flex items-center gap-1"><Clock size={9} /> {selectedRow.waktu}</p>
          </div>
        )}
        <div className="px-4 py-3 bg-[#111a27] border-t border-[#243044] flex items-center gap-2">
          <Clock size={12} className="text-gray-600" />
          <span className="text-[11px] text-gray-500">Diperbarui: {dateStr}, {timeStr}</span>
        </div>
      </div>
    </div>
  );

  const StatistikContent = () => {
    const total = statsData?.total ?? 0;
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Total Scan", value: total,                    color: "text-[#34d399]"   },
            { label: "Normal",     value: statsData?.Normal   ?? 0, color: "text-emerald-400" },
            { label: "Immature",   value: statsData?.Immature ?? 0, color: "text-amber-400"   },
            { label: "Mature",     value: statsData?.Mature   ?? 0, color: "text-red-400"     },
          ].map(s => (
            <div key={s.label} className="bg-[#1a2332] rounded-2xl p-3 border border-[#243044]">
              <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">{s.label}</p>
              {statsLoading ? <div className="w-8 h-7 bg-[#243044] rounded animate-pulse"></div>
                : <p className={`text-[28px] ${s.color} font-bold`}>{s.value}</p>}
            </div>
          ))}
        </div>
        <div className="bg-[#1a2332] rounded-2xl p-4 border border-[#243044]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><BarChart2 size={16} className="text-[#34d399]" /><h3 className="text-[14px] text-gray-300">Proporsi Klasifikasi</h3></div>
            <button onClick={fetchStats} className="w-7 h-7 rounded-full bg-[#0d2e24] flex items-center justify-center">
              <RefreshCw size={12} className={`text-[#34d399] ${statsLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
          {[
            { label: "Normal",   count: statsData?.Normal   ?? 0, color: "bg-emerald-500", text: "text-emerald-400" },
            { label: "Immature", count: statsData?.Immature ?? 0, color: "bg-amber-400",   text: "text-amber-400"   },
            { label: "Mature",   count: statsData?.Mature   ?? 0, color: "bg-red-500",     text: "text-red-400"     },
          ].map(item => (
            <div key={item.label} className="mb-3">
              <div className="flex justify-between mb-1">
                <span className="text-[13px] text-gray-400">{item.label}</span>
                <div className="flex items-center gap-1">
                  <span className={`text-[13px] ${item.text} font-semibold`}>{item.count}</span>
                  <span className="text-[11px] text-gray-600">({total > 0 ? ((item.count / total) * 100).toFixed(0) : 0}%)</span>
                </div>
              </div>
              <div className="h-3 rounded-full bg-[#111a27] overflow-hidden">
                <div className={`h-full rounded-full ${item.color} transition-all duration-700`} style={{ width: `${total > 0 ? (item.count / total) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="bg-[#1a2332] rounded-2xl p-4 border border-[#243044]">
          <div className="flex items-center gap-2 mb-3"><Cpu size={15} className="text-[#34d399]" /><h3 className="text-[14px] text-gray-300">Informasi Sistem</h3></div>
          {[
            { label: "Mikrokontroler",     value: "ESP32-CAM"              },
            { label: "Modul Kamera",       value: "OV3660 (3MP)"           },
            { label: "Metode Klasifikasi", value: "CNN (TensorFlow/Keras)" },
            { label: "Database",           value: "MySQL (Railway)"        },
            { label: "Penyimpanan Foto",   value: "Base64 di MySQL"        },
            { label: "Tanggal",            value: dateStr                  },
            { label: "Versi Sistem",       value: "v2.1.0"                 },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-[#243044] last:border-0">
              <span className="text-[12px] text-gray-500">{item.label}</span>
              <span className="text-[12px] text-gray-300" style={{ fontWeight: 500 }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const Header = () => (
    <div className="bg-[#1a2332] rounded-2xl p-4 border border-[#243044]">
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-[#0d2e24] px-3 py-1 rounded-full flex items-center gap-1.5 border border-[#1a5c42]">
          <Eye size={13} className="text-[#34d399]" />
          <span className="text-[11px] text-[#34d399] tracking-widest font-bold">KATARAK IoT DETECTOR</span>
        </div>
      </div>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-[#243044] bg-[#111a27] flex items-center justify-center">
          <Eye size={24} className="text-[#34d399]" />
        </div>
        <div>
          <h1 className="text-[17px] leading-snug text-gray-100">Rancang Bangun Alat Deteksi Tingkat Kekeruhan Lensa Mata</h1>
          <p className="text-[12px] text-gray-500 mt-0.5">Berbasis IoT — ESP32-CAM · Dashboard</p>
        </div>
      </div>
      <div className="flex gap-2">
        <div className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border ${connected ? "border-emerald-800 bg-emerald-900/30" : "border-red-800 bg-red-900/30"}`}>
          <span className={`w-2.5 h-2.5 rounded-full ${connected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></span>
          <div className="text-left">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Status API Railway</p>
            <p className={`text-[13px] ${connected ? "text-emerald-400" : "text-red-400"} font-semibold`}>{connected ? "Terhubung" : "Terputus"}</p>
          </div>
          {connected ? <Wifi size={16} className="ml-auto text-emerald-500" /> : <WifiOff size={16} className="ml-auto text-red-400" />}
        </div>
        <div className="bg-[#111a27] border border-[#243044] rounded-xl px-3 py-2.5 flex items-center gap-2 min-w-[105px]">
          <Clock size={14} className="text-[#34d399] shrink-0" />
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Waktu</p>
            <p className="text-[13px] text-gray-200 font-semibold">{timeStr}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const Tabs = () => (
    <div className="flex bg-[#111a27] rounded-2xl p-1 gap-1 border border-[#243044]">
      {[
        { key: "latest",  label: "Tangkapan", icon: <Camera size={13} />    },
        { key: "history", label: "Riwayat",   icon: <RefreshCw size={13} /> },
        { key: "stats",   label: "Statistik", icon: <BarChart2 size={13} /> },
      ].map(tab => (
        <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] transition-all ${activeTab === tab.key ? "bg-[#1a5c42] text-[#34d399] shadow" : "text-gray-500 hover:bg-[#1a2332] hover:text-gray-300"}`}>
          {tab.icon}
          <span style={{ fontWeight: activeTab === tab.key ? 600 : 400 }}>{tab.label}</span>
        </button>
      ))}
    </div>
  );

  const DesktopNav = () => (
    <>
      <div className="bg-[#0f1929] border-b border-[#1e2d40] px-8 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0d2e24] border border-[#1a5c42] flex items-center justify-center">
            <Eye size={16} className="text-[#34d399]" />
          </div>
          <div className="bg-[#0d2e24] px-3 py-1 rounded-full flex items-center gap-1.5 border border-[#1a5c42]">
            <Eye size={13} className="text-[#34d399]" />
            <span className="text-[11px] text-[#34d399] tracking-widest font-bold">KATARAK IoT DETECTOR</span>
          </div>
        </div>
        <div className="flex-1">
          <span className="text-[14px] text-gray-200 font-semibold">Deteksi Tingkat Kekeruhan Lensa Mata</span>
          <span className="text-[13px] text-gray-500 ml-2">— Berbasis IoT · ESP32-CAM</span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[12px] ${connected ? "border-emerald-800 bg-emerald-900/30 text-emerald-400" : "border-red-800 bg-red-900/30 text-red-400"}`}>
            <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></span>
            {connected ? "API Terhubung" : "API Terputus"}
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
          </div>
          <button onClick={handleRefresh} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#243044] bg-[#1a2332] text-[12px] text-gray-400 ${refreshing ? "opacity-60" : ""}`}>
            <RefreshCw size={13} className={refreshing ? "animate-spin text-[#34d399]" : ""} /> Refresh
          </button>
          <div className="flex items-center gap-1.5">
            <Clock size={14} className="text-[#34d399]" />
            <span className="text-[13px] text-gray-200 font-semibold">{timeStr}</span>
            <span className="text-[12px] text-gray-500">· {dateStr}</span>
          </div>
        </div>
      </div>
      <div className="bg-[#0f1929] border-b border-[#1e2d40] px-8 flex gap-1 pt-2">
        {[
          { key: "latest",  label: "Tangkapan Foto", icon: <Camera size={14} />    },
          { key: "history", label: "Riwayat",        icon: <RefreshCw size={14} /> },
          { key: "stats",   label: "Statistik",      icon: <BarChart2 size={14} /> },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-[13px] border-b-2 transition-all ${activeTab === tab.key ? "border-[#34d399] text-[#34d399] bg-[#0d2e24]/50" : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-[#1a2332]"}`}>
            {tab.icon}
            <span style={{ fontWeight: activeTab === tab.key ? 600 : 400 }}>{tab.label}</span>
          </button>
        ))}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#0b1120]">
      {/* MOBILE */}
      <div className="lg:hidden flex justify-center">
        <div className="w-full max-w-md min-h-screen flex flex-col pb-6 px-3 pt-4 gap-3">
          <Header /><Tabs />
          {activeTab === "latest"  && <TangkapanContent />}
          {activeTab === "history" && <RiwayatContent />}
          {activeTab === "stats"   && <StatistikContent />}
          <div className="mt-2 flex items-center justify-center gap-1.5">
            <Eye size={12} className="text-[#34d399]" />
            <p className="text-[11px] text-gray-600">Deteksi Katarak IoT · 2026</p>
          </div>
        </div>
      </div>

      {/* DESKTOP */}
      <div className="hidden lg:flex flex-col min-h-screen">
        <DesktopNav />
        <div className="flex-1 px-8 py-6 overflow-auto">
          {activeTab === "latest" && (
            <div className="grid grid-cols-2 gap-6 max-w-6xl mx-auto">
              <div className="flex flex-col gap-5"><LatestCaptureCard /></div>
              <div className="flex flex-col gap-5">
                <FormPasienCard />
                <KeteranganCard />
                <div className="bg-[#1a2332] rounded-2xl p-5 border border-[#243044]">
                  <div className="flex items-center gap-2 mb-3"><Cpu size={15} className="text-[#34d399]" /><h3 className="text-[14px] text-gray-300">Informasi Perangkat</h3></div>
                  {[
                    { label: "Device",           value: "ESP32-CAM"          },
                    { label: "Resolusi Kamera",  value: "OV3660 — 2048x1536" },
                    { label: "Total Deteksi DB", value: `${statsData?.total ?? 0} data` },
                    { label: "Tangkapan #",      value: latestCapture ? `#${latestCapture.id}` : "—" },
                    { label: "Status MySQL",     value: connected ? "Terhubung ✓" : "Belum terhubung" },
                    { label: "Auto-Refresh",     value: autoRefresh ? "Aktif (5 detik)" : "Nonaktif" },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-[#243044] last:border-0">
                      <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#34d399]" /><span className="text-[12px] text-gray-500">{item.label}</span></div>
                      <span className="text-[12px] text-gray-300" style={{ fontWeight: 500 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {activeTab === "history" && (
            <div className="max-w-6xl mx-auto">
              <div className="bg-[#1a2332] rounded-2xl overflow-hidden border border-[#243044]">
                <div className="px-6 pt-5 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2"><RefreshCw size={16} className="text-[#34d399]" /><h2 className="text-[15px] text-gray-200">Riwayat Deteksi (MySQL)</h2></div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500 bg-[#111a27] border border-[#243044] px-2 py-0.5 rounded-full">{history.length} data</span>
                    <button onClick={fetchHistory} className="w-7 h-7 rounded-full bg-[#0d2e24] flex items-center justify-center">
                      <RefreshCw size={12} className={`text-[#34d399] ${histLoading ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>
                {histLoading && <div className="flex items-center justify-center py-10 gap-2"><div className="w-5 h-5 border-2 border-[#34d399] border-t-transparent rounded-full animate-spin"></div><span className="text-[13px] text-gray-500">Memuat dari MySQL...</span></div>}
                {!histLoading && history.length === 0 && <div className="text-center py-10 text-gray-500">Belum ada data riwayat.</div>}
                <div className="grid grid-cols-2 divide-x divide-[#1e2d40]">
                  {history.map(row => {
                    const colors  = getLabelColor(row.prediksi);
                    const maxConf = Math.max(row.normal_pct, row.imm_pct, row.mat_pct);
                    const isSel   = selectedRow?.id === row.id;
                    return (
                      <button key={row.id} onClick={() => handleSelectRow(row)}
                        className={`flex items-center gap-3 px-6 py-4 hover:bg-[#1e2d40] transition-colors text-left border-b border-[#1e2d40] ${isSel ? "bg-[#1e2d40]" : ""}`}>
                        <ThumbIcon label={row.prediksi} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border} font-semibold`}>{row.prediksi}</span>
                            <span className="text-[11px] text-gray-500">#{row.id}</span>
                          </div>
                          {row.nama && <p className="text-[11px] text-gray-300">{row.nama} · {row.usia} thn · {row.kelamin}</p>}
                          <p className="text-[11px] text-gray-500 flex items-center gap-1"><Clock size={10} className="shrink-0" /> {row.waktu}</p>
                        </div>
                        <span className={`text-[13px] ${colors.text} shrink-0 font-semibold`}>{maxConf.toFixed(1)}%</span>
                        <ChevronRight size={14} className={`text-gray-600 shrink-0 transition-transform ${isSel ? "rotate-90" : ""}`} />
                      </button>
                    );
                  })}
                </div>
                {selectedRow && rowColors && (
                  <div className="mx-6 my-4 p-5 bg-[#111a27] rounded-xl border border-[#243044]">
                    <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-4">Detail #{selectedRow.id}</p>
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <DetailPhoto imageUrl={detailImageUrl} loading={detailImgLoading} />
                        <p className="text-[10px] text-gray-600 mt-2 flex items-center gap-1"><Clock size={9} /> {selectedRow.waktu}</p>
                      </div>
                      <div className="flex flex-col justify-center gap-3">
                        {selectedRow.nama && (
                          <div className="grid grid-cols-3 gap-2 text-[12px]">
                            <div className="bg-[#1a2332] rounded-xl p-2.5 border border-[#243044]">
                              <p className="text-gray-500 text-[10px] mb-0.5">Nama</p>
                              <p className="text-gray-200 font-medium truncate">{selectedRow.nama}</p>
                            </div>
                            <div className="bg-[#1a2332] rounded-xl p-2.5 border border-[#243044]">
                              <p className="text-gray-500 text-[10px] mb-0.5">Usia</p>
                              <p className="text-gray-200 font-medium">{selectedRow.usia} thn</p>
                            </div>
                            <div className="bg-[#1a2332] rounded-xl p-2.5 border border-[#243044]">
                              <p className="text-gray-500 text-[10px] mb-0.5">Kelamin</p>
                              <p className="text-gray-200 font-medium">{selectedRow.kelamin}</p>
                            </div>
                          </div>
                        )}
                        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${rowColors.bg} ${rowColors.border}`}>
                          <span className={`w-3 h-3 rounded-full ${rowColors.dot}`}></span>
                          {getLabelIcon(selectedRow.prediksi)}
                          <span className={`text-[14px] ${rowColors.text} font-bold`}>{labelDisplay(selectedRow.prediksi)}</span>
                          <span className={`ml-auto text-[13px] ${rowColors.text} font-semibold`}>{selectedRow.confidence.toFixed(1)}%</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: "Normal",   value: selectedRow.normal_pct, color: "bg-emerald-500", text: "text-emerald-400" },
                            { label: "Immature", value: selectedRow.imm_pct,    color: "bg-amber-500",   text: "text-amber-400"   },
                            { label: "Mature",   value: selectedRow.mat_pct,    color: "bg-red-500",     text: "text-red-400"     },
                          ].map(item => (
                            <div key={item.label} className="bg-[#1a2332] p-3 rounded-xl border border-[#243044]">
                              <p className="text-[10px] text-gray-500 mb-1">{item.label}</p>
                              <p className={`text-[18px] ${item.text} font-bold`}>{item.value.toFixed(1)}%</p>
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
                <div className="px-6 py-3 bg-[#111a27] border-t border-[#243044] flex items-center gap-2">
                  <Clock size={12} className="text-gray-600" />
                  <span className="text-[11px] text-gray-500">Diperbarui: {dateStr}, {timeStr}</span>
                </div>
              </div>
            </div>
          )}
          {activeTab === "stats" && (
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Total Scan",  value: statsData?.total    ?? 0, sub: "Dari MySQL",     color: "text-[#34d399]",   border: "border-[#34d399]"   },
                  { label: "Normal",      value: statsData?.Normal   ?? 0, sub: "Mata Sehat",     color: "text-emerald-400", border: "border-emerald-500" },
                  { label: "Immature",    value: statsData?.Immature ?? 0, sub: "Katarak Awal",   color: "text-amber-400",   border: "border-amber-500"   },
                  { label: "Mature",      value: statsData?.Mature   ?? 0, sub: "Katarak Lanjut", color: "text-red-400",     border: "border-red-500"     },
                ].map(s => (
                  <div key={s.label} className={`bg-[#1a2332] rounded-2xl p-5 border-t-4 ${s.border} border-x border-b border-[#243044]`}>
                    <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">{s.label}</p>
                    {statsLoading ? <div className="w-12 h-9 bg-[#243044] rounded animate-pulse my-1"></div>
                      : <p className={`text-[36px] ${s.color} font-bold`}>{s.value}</p>}
                    <p className="text-[12px] text-gray-500">{s.sub}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="bg-[#1a2332] rounded-2xl p-5 border border-[#243044]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2"><BarChart2 size={16} className="text-[#34d399]" /><h3 className="text-[14px] text-gray-300">Proporsi Klasifikasi</h3></div>
                    <button onClick={fetchStats} className="w-7 h-7 rounded-full bg-[#0d2e24] flex items-center justify-center">
                      <RefreshCw size={12} className={`text-[#34d399] ${statsLoading ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                  {[
                    { label: "Normal",   count: statsData?.Normal   ?? 0, color: "bg-emerald-500", text: "text-emerald-400" },
                    { label: "Immature", count: statsData?.Immature ?? 0, color: "bg-amber-400",   text: "text-amber-400"   },
                    { label: "Mature",   count: statsData?.Mature   ?? 0, color: "bg-red-500",     text: "text-red-400"     },
                  ].map(item => {
                    const total = statsData?.total ?? 0;
                    return (
                      <div key={item.label} className="mb-4">
                        <div className="flex justify-between mb-1">
                          <span className="text-[13px] text-gray-400">{item.label}</span>
                          <div className="flex items-center gap-1">
                            <span className={`text-[13px] ${item.text} font-semibold`}>{item.count}</span>
                            <span className="text-[11px] text-gray-600">({total > 0 ? ((item.count / total) * 100).toFixed(0) : 0}%)</span>
                          </div>
                        </div>
                        <div className="h-4 rounded-full bg-[#111a27] overflow-hidden">
                          <div className={`h-full rounded-full ${item.color} transition-all duration-700`} style={{ width: `${total > 0 ? (item.count / total) * 100 : 0}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="bg-[#1a2332] rounded-2xl p-5 border border-[#243044]">
                  <div className="flex items-center gap-2 mb-4"><Cpu size={15} className="text-[#34d399]" /><h3 className="text-[14px] text-gray-300">Informasi Sistem</h3></div>
                  {[
                    { label: "Mikrokontroler",     value: "ESP32-CAM"              },
                    { label: "Modul Kamera",       value: "OV3660 (3MP)"           },
                    { label: "Metode Klasifikasi", value: "CNN (TensorFlow/Keras)" },
                    { label: "Database",           value: "MySQL (Railway)"        },
                    { label: "Penyimpanan Foto",   value: "Base64 → MySQL"         },
                    { label: "Tanggal",            value: dateStr                  },
                    { label: "Versi Sistem",       value: "v2.1.0"                 },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-2 border-b border-[#243044] last:border-0">
                      <span className="text-[12px] text-gray-500">{item.label}</span>
                      <span className="text-[13px] text-gray-300" style={{ fontWeight: 500 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="mt-6 flex items-center justify-center gap-1.5 max-w-6xl mx-auto">
            <Eye size={12} className="text-[#34d399]" />
            <p className="text-[11px] text-gray-600">Deteksi Katarak IoT · Dashboard · 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
}
