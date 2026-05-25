import { useState, useCallback } from "react";
import {
  Eye, Search, User, Calendar, ChevronRight,
  AlertCircle, CheckCircle2, ImageOff, Loader,
  Clock, RefreshCw, RotateCcw, Info
} from "lucide-react";

const API_URL = "https://web-production-0ec06.up.railway.app";

type SearchRow = {
  id: number;
  prediksi: string;
  normal_pct: number;
  imm_pct: number;
  mat_pct: number;
  confidence: number;
  nama: string | null;
  usia: number | null;
  kelamin: string | null;
  waktu: string;
};

const getLabelColor = (label: string) => {
  if (label === "Normal")
    return { bg: "bg-emerald-900/40", text: "text-emerald-400", dot: "bg-emerald-500", border: "border-emerald-700" };
  if (label === "Immature")
    return { bg: "bg-amber-900/40", text: "text-amber-400", dot: "bg-amber-500", border: "border-amber-700" };
  return { bg: "bg-red-900/40", text: "text-red-400", dot: "bg-red-500", border: "border-red-800" };
};

const getLabelIcon = (label: string) => {
  if (label === "Normal")   return <CheckCircle2 size={14} className="text-emerald-400" />;
  if (label === "Immature") return <AlertCircle size={14} className="text-amber-400" />;
  return <AlertCircle size={14} className="text-red-400" />;
};

const labelDisplay = (label: string) =>
  label === "Normal" ? "Mata Normal" : label === "Immature" ? "Katarak Immature" : "Katarak Mature";

// ── Komponen foto lazy-load ────────────────────────────────
function PhotoCard({ rowId }: { rowId: number }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "empty">("idle");
  const [src, setSrc] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (status !== "idle") return;
    setStatus("loading");
    try {
      const res  = await fetch(`${API_URL}/image/${rowId}`);
      const json = await res.json();
      if (json.image_url) { setSrc(json.image_url); setStatus("done"); }
      else setStatus("empty");
    } catch { setStatus("empty"); }
  }, [rowId, status]);

  // auto-load saat mounted
  useState(() => { load(); });

  return (
    <div
      className="w-full rounded-xl overflow-hidden border border-[#243044] bg-[#0b1120]"
      style={{ aspectRatio: "4/3" }}
    >
      {status === "loading" && (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
          <Loader size={22} className="text-[#34d399] animate-spin" />
          <span className="text-[11px] text-gray-500">Memuat foto...</span>
        </div>
      )}
      {status === "done" && src && (
        <img src={src} alt={`foto #${rowId}`} className="w-full h-full object-cover" />
      )}
      {(status === "empty" || status === "idle") && (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
          <ImageOff size={24} className="text-gray-600" />
          <span className="text-[11px] text-gray-600">Foto tidak tersedia</span>
        </div>
      )}
    </div>
  );
}

// ── Kartu hasil ────────────────────────────────────────────
function ResultCard({ row }: { row: SearchRow }) {
  const [open, setOpen] = useState(false);
  const colors          = getLabelColor(row.prediksi);
  const maxConf         = Math.max(row.normal_pct, row.imm_pct, row.mat_pct);

  return (
    <div className="bg-[#1a2332] rounded-2xl border border-[#243044] overflow-hidden">
      {/* Info pasien */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#111a27] border-b border-[#243044] flex-wrap">
        <span className="text-[11px] text-gray-500 flex items-center gap-1">
          <User size={11} /> {row.nama || "—"}
        </span>
        <span className="text-[11px] text-gray-500 flex items-center gap-1">
          <Calendar size={11} /> {row.usia ? `${row.usia} tahun` : "—"}
        </span>
        <span className="text-[11px] text-gray-500">{row.kelamin || "—"}</span>
        <span className="text-[10px] text-gray-600 ml-auto flex items-center gap-1">
          <Clock size={10} /> {row.waktu}
        </span>
      </div>

      {/* Header hasil */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1e2d40] transition-colors text-left"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors.bg} border ${colors.border}`}>
          {getLabelIcon(row.prediksi)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}
              style={{ fontWeight: 600 }}>
              {row.prediksi}
            </span>
            <span className="text-[11px] text-gray-500">#{row.id}</span>
          </div>
          <p className="text-[11px] text-gray-500">{labelDisplay(row.prediksi)}</p>
        </div>
        <span className={`text-[15px] shrink-0 ${colors.text}`} style={{ fontWeight: 700 }}>
          {maxConf.toFixed(1)}%
        </span>
        <ChevronRight
          size={14}
          className={`text-gray-600 shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
      </button>

      {/* Detail: foto + bar */}
      {open && (
        <div className="px-4 pb-4 pt-1 flex flex-col gap-3">
          <PhotoCard rowId={row.id} />

          {/* Badge klasifikasi */}
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${colors.bg} ${colors.border}`}>
            <span className={`w-3 h-3 rounded-full ${colors.dot}`} />
            {getLabelIcon(row.prediksi)}
            <span className={`text-[14px] ${colors.text}`} style={{ fontWeight: 700 }}>
              {labelDisplay(row.prediksi)}
            </span>
            <span className={`ml-auto text-[13px] ${colors.text}`} style={{ fontWeight: 600 }}>
              {row.confidence.toFixed(1)}%
            </span>
          </div>

          {/* Progress bar */}
          {[
            { label: "Normal",   value: row.normal_pct, color: "bg-emerald-500" },
            { label: "Immature", value: row.imm_pct,    color: "bg-amber-500"   },
            { label: "Mature",   value: row.mat_pct,    color: "bg-red-500"     },
          ].map(item => (
            <div key={item.label}>
              <div className="flex justify-between mb-1">
                <span className="text-[12px] text-gray-400">{item.label}</span>
                <span className="text-[12px] text-gray-300" style={{ fontWeight: 600 }}>
                  {item.value.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-[#111a27] overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.color} transition-all duration-700`}
                  style={{ width: `${item.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage] = useState<"form" | "result">("form");

  // Form state
  const [nama,    setNama]    = useState("");
  const [usia,    setUsia]    = useState("");
  const [kelamin, setKelamin] = useState("");

  // Result state
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchRow[]>([]);
  const [error,   setError]   = useState<string | null>(null);

  const handleSearch = async () => {
    if (!nama.trim() && !usia && !kelamin) {
      setError("Masukkan minimal satu data pencarian.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (nama.trim()) params.append("nama",    nama.trim());
      if (usia)        params.append("usia",    usia);
      if (kelamin)     params.append("kelamin", kelamin);

      const res  = await fetch(`${API_URL}/search?${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setResults(json.data || []);
      setPage("result");
    } catch (e: any) {
      setError(e.message || "Gagal menghubungi server Railway.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPage("form");
    setResults([]);
    setError(null);
    setNama(""); setUsia(""); setKelamin("");
  };

  // ── HALAMAN FORM ─────────────────────────────────────────
  const FormPage = () => (
    <div className="min-h-screen bg-[#0b1120] flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm flex flex-col gap-5">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-2">
          <div className="bg-[#0d2e24] border border-[#1a5c42] px-4 py-2 rounded-full flex items-center gap-2">
            <Eye size={15} className="text-[#34d399]" />
            <span className="text-[11px] text-[#34d399] tracking-widest" style={{ fontWeight: 700 }}>
              KATARAK IoT DETECTOR
            </span>
          </div>
          <h1 className="text-[20px] text-gray-100 text-center" style={{ fontWeight: 700 }}>
            Portal Pasien
          </h1>
          <p className="text-[13px] text-gray-500 text-center">
            Cari data hasil deteksi katarak Anda
          </p>
        </div>

        {/* Form card */}
        <div className="bg-[#1a2332] rounded-2xl border border-[#243044] p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-[#34d399]" />
            <span className="text-[14px] text-gray-200" style={{ fontWeight: 600 }}>
              Data pencarian
            </span>
          </div>

          {/* Nama */}
          <div>
            <label className="text-[12px] text-gray-400 mb-1.5 block">Nama pasien</label>
            <input
              type="text"
              value={nama}
              onChange={e => setNama(e.target.value)}
              placeholder="Masukkan nama..."
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="w-full bg-[#111a27] border border-[#243044] rounded-xl px-3 py-2.5 text-[13px] text-gray-200 placeholder-gray-600 outline-none focus:border-[#34d399] transition-colors"
            />
          </div>

          {/* Usia & Kelamin */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] text-gray-400 mb-1.5 block">Usia</label>
              <input
                type="number"
                value={usia}
                onChange={e => setUsia(e.target.value)}
                placeholder="Tahun"
                min={1} max={120}
                className="w-full bg-[#111a27] border border-[#243044] rounded-xl px-3 py-2.5 text-[13px] text-gray-200 placeholder-gray-600 outline-none focus:border-[#34d399] transition-colors"
              />
            </div>
            <div>
              <label className="text-[12px] text-gray-400 mb-1.5 block">Jenis kelamin</label>
              <select
                value={kelamin}
                onChange={e => setKelamin(e.target.value)}
                className="w-full bg-[#111a27] border border-[#243044] rounded-xl px-3 py-2.5 text-[13px] text-gray-200 outline-none focus:border-[#34d399] transition-colors"
              >
                <option value="">Semua</option>
                <option>Laki-laki</option>
                <option>Perempuan</option>
              </select>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-900/30 border border-red-800 rounded-xl px-3 py-2.5">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <span className="text-[12px] text-red-400">{error}</span>
            </div>
          )}

          {/* Tombol cari */}
          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full bg-[#0d2e24] hover:bg-[#1a5c42] border border-[#1a5c42] rounded-xl py-3 text-[#34d399] text-[14px] flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            style={{ fontWeight: 600 }}
          >
            {loading
              ? <><Loader size={15} className="animate-spin" /> Mencari...</>
              : <><Search size={15} /> Cari hasil deteksi</>
            }
          </button>
        </div>

        {/* Keterangan */}
        <div className="bg-[#1a2332] rounded-2xl border border-[#243044] p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-1">
            <Info size={14} className="text-[#38bdf8]" />
            <span className="text-[13px] text-gray-300" style={{ fontWeight: 600 }}>Keterangan</span>
          </div>
          {[
            { dot: "bg-emerald-500", label: "Normal",   desc: "Lensa mata jernih." },
            { dot: "bg-amber-500",   label: "Immature", desc: "Kekeruhan sebagian." },
            { dot: "bg-red-500",     label: "Mature",   desc: "Perlu tindakan medis." },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-2">
              <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${item.dot}`} />
              <p className="text-[12px] text-gray-500">
                <span className="text-gray-300" style={{ fontWeight: 600 }}>{item.label}:</span>{" "}
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        <p className="text-center text-[11px] text-gray-600 flex items-center justify-center gap-1">
          <Eye size={11} className="text-[#34d399]" /> Deteksi Katarak IoT — ESP32-CAM · 2026
        </p>
      </div>
    </div>
  );

  // ── HALAMAN HASIL ─────────────────────────────────────────
  const ResultPage = () => (
    <div className="min-h-screen bg-[#0b1120] px-4 pt-4 pb-8">
      <div className="max-w-md mx-auto flex flex-col gap-4">

        {/* Header hasil */}
        <div className="bg-[#1a2332] rounded-2xl border border-[#243044] p-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#0d2e24] border border-[#1a5c42] px-3 py-1.5 rounded-full flex items-center gap-2">
              <Eye size={13} className="text-[#34d399]" />
              <span className="text-[10px] text-[#34d399] tracking-widest" style={{ fontWeight: 700 }}>
                KATARAK IoT
              </span>
            </div>
            <div className="flex-1">
              <p className="text-[13px] text-gray-200" style={{ fontWeight: 600 }}>
                Hasil Pencarian
              </p>
              <p className="text-[11px] text-gray-500">{results.length} data ditemukan</p>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111a27] border border-[#243044] text-[12px] text-gray-400 hover:text-gray-200 transition-colors"
            >
              <RotateCcw size={12} /> Cari lagi
            </button>
          </div>

          {/* Ringkasan pencarian */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {nama    && <span className="text-[11px] bg-[#111a27] border border-[#243044] text-gray-400 px-2 py-0.5 rounded-full flex items-center gap-1"><User size={10} /> {nama}</span>}
            {usia    && <span className="text-[11px] bg-[#111a27] border border-[#243044] text-gray-400 px-2 py-0.5 rounded-full flex items-center gap-1"><Calendar size={10} /> {usia} tahun</span>}
            {kelamin && <span className="text-[11px] bg-[#111a27] border border-[#243044] text-gray-400 px-2 py-0.5 rounded-full">{kelamin}</span>}
          </div>
        </div>

        {/* Tidak ada hasil */}
        {results.length === 0 && (
          <div className="bg-[#1a2332] rounded-2xl border border-[#243044] p-8 flex flex-col items-center gap-3">
            <ImageOff size={32} className="text-gray-600" />
            <p className="text-[14px] text-gray-400" style={{ fontWeight: 600 }}>
              Data tidak ditemukan
            </p>
            <p className="text-[12px] text-gray-600 text-center">
              Coba ubah kata kunci atau hubungi petugas untuk memastikan data sudah diinput.
            </p>
            <button
              onClick={handleReset}
              className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0d2e24] border border-[#1a5c42] text-[#34d399] text-[13px] hover:bg-[#1a5c42] transition-colors"
            >
              <RotateCcw size={13} /> Cari ulang
            </button>
          </div>
        )}

        {/* Daftar hasil */}
        {results.map(row => (
          <ResultCard key={row.id} row={row} />
        ))}

        <p className="text-center text-[11px] text-gray-600 flex items-center justify-center gap-1 mt-2">
          <Eye size={11} className="text-[#34d399]" /> Deteksi Katarak IoT — ESP32-CAM · 2026
        </p>
      </div>
    </div>
  );

  return page === "form" ? <FormPage /> : <ResultPage />;
}
