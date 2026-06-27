import React, { useState } from "react";
import { Camera, RefreshCw, X, Maximize2 } from "lucide-react";

export function TVSnapshotPanel({ authToken }: { authToken: string }) {
  const [layoutId, setLayoutId] = useState("fCLTltqk");
  const [symbol, setSymbol] = useState("FX:XAUUSD");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshot = async () => {
    if (!layoutId) return;
    setLoading(true);
    setError(null);
    try {
      const url = `/api/tv-snapshot?layout=${encodeURIComponent(layoutId)}&symbol=${encodeURIComponent(symbol)}&auth_token=${encodeURIComponent(authToken)}&t=${Date.now()}`;

      const res = await fetch(url);
      if (!res.ok) {
        let msg = "Lỗi HTTP " + res.status;
        try {
          const json = await res.json();
          if (json.message) msg = json.message;
        } catch (e) {}
        throw new Error(msg);
      }

      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      setImageUrl(objUrl);
    } catch (err: any) {
      setError(err.message || "Lỗi không xác định khi chụp ảnh");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-m3-surface rounded-[24px] p-5 shadow-level1 flex flex-col gap-4 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-m3-on-surface flex items-center gap-2">
          <Camera size={18} className="text-m3-primary" />
          TradingView Snapshot
        </h3>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={layoutId}
          onChange={e => setLayoutId(e.target.value)}
          placeholder="Layout ID (VD: fCLTltqk)"
          className="flex-1 bg-m3-surface-container border border-m3-outline rounded-lg px-3 py-2 text-sm text-m3-on-surface outline-none focus:border-m3-primary transition-colors"
        />
        <input
          type="text"
          value={symbol}
          onChange={e => setSymbol(e.target.value)}
          placeholder="Symbol (VD: FX:XAUUSD)"
          className="flex-1 bg-m3-surface-container border border-m3-outline rounded-lg px-3 py-2 text-sm text-m3-on-surface outline-none focus:border-m3-primary transition-colors"
        />
        <button
          onClick={fetchSnapshot}
          disabled={loading}
          className="bg-m3-primary text-m3-on-primary px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-m3-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? <RefreshCw size={16} className="animate-spin" /> : "Chụp ảnh"}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm">
          {error}
        </div>
      )}

      {imageUrl && (
        <div className="relative rounded-xl border border-m3-outline overflow-hidden bg-m3-surface-container group min-h-[200px] flex items-center justify-center">
          <img src={imageUrl} alt="TradingView Snapshot" className="w-full h-auto" />
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            <a href={imageUrl} target="_blank" rel="noreferrer" className="p-2 bg-black/60 text-white rounded-lg hover:bg-black/80 transition-colors" title="Xem ảnh gốc">
              <Maximize2 size={16} />
            </a>
            <button onClick={() => setImageUrl(null)} className="p-2 bg-black/60 text-white rounded-lg hover:bg-red-500 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
