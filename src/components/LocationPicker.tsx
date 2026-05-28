import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, X } from "lucide-react";

type Municipio = {
  id: number;
  nome: string;
  uf: string;
};

// Cache global em memória
let CACHE: Municipio[] | null = null;
let LOADING: Promise<Municipio[]> | null = null;

const UF_FALLBACK: Record<number, string> = {
  12:"AC",27:"AL",16:"AP",13:"AM",29:"BA",23:"CE",53:"DF",32:"ES",52:"GO",
  21:"MA",51:"MT",50:"MS",31:"MG",15:"PA",25:"PB",41:"PR",26:"PE",22:"PI",
  33:"RJ",24:"RN",43:"RS",11:"RO",14:"RR",42:"SC",35:"SP",28:"SE",17:"TO",
};

async function loadMunicipios(): Promise<Municipio[]> {
  if (CACHE) return CACHE;
  if (LOADING) return LOADING;
  LOADING = fetch("https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome")
    .then(r => r.json())
    .then((data: any[]) => {
      const list: Municipio[] = data.map((m) => {
        const ufId = m?.microrregiao?.mesorregiao?.UF?.id;
        const ufSigla = m?.microrregiao?.mesorregiao?.UF?.sigla ?? (ufId ? UF_FALLBACK[ufId] : "");
        return { id: m.id, nome: m.nome, uf: ufSigla };
      });
      CACHE = list;
      return list;
    })
    .catch(() => {
      LOADING = null;
      return [];
    });
  return LOADING;
}

// Remove acentos para busca
const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function LocationPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [query, setQuery] = useState(value ?? "");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [municipios, setMunicipios] = useState<Municipio[]>(CACHE ?? []);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value ?? ""); }, [value]);

  useEffect(() => {
    if (CACHE) return;
    setLoading(true);
    loadMunicipios().then(list => { setMunicipios(list); setLoading(false); });
  }, []);

  // Fecha ao clicar fora
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const suggestions = useMemo(() => {
    const q = norm(query.trim());
    if (!q || q.length < 2) return [];
    const list = municipios.length ? municipios : (CACHE ?? []);
    const out: Municipio[] = [];
    for (const m of list) {
      if (norm(m.nome).startsWith(q) || norm(`${m.nome}/${m.uf}`).startsWith(q)) {
        out.push(m);
        if (out.length >= 50) break;
      }
    }
    if (out.length < 50) {
      for (const m of list) {
        if (out.includes(m)) continue;
        if (norm(m.nome).includes(q)) {
          out.push(m);
          if (out.length >= 50) break;
        }
      }
    }
    return out;
  }, [query, municipios]);

  function select(m: Municipio) {
    const v = `${m.nome}/${m.uf}`;
    setQuery(v);
    onChange(v);
    setOpen(false);
  }

  function clear() {
    setQuery("");
    onChange("");
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(h => Math.min(h + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); select(suggestions[highlight]); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a3e635] pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlight(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={loading ? "Carregando cidades…" : "Digite a cidade (ex: São Paulo)"}
          className="h-12 pl-11 pr-10 rounded-xl border-white/15 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-2 focus-visible:ring-[#a3e635] focus-visible:border-[#a3e635] transition-all"
          autoComplete="off"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 animate-spin" />}
        {!loading && query && (
          <button type="button" onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full grid place-items-center text-white/40 hover:text-white hover:bg-white/10">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute z-50 left-0 right-0 mt-2 max-h-72 overflow-y-auto rounded-xl border border-white/10 bg-[#0a1733]/95 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6),0_0_0_1px_rgba(163,230,53,0.15)]">
          {suggestions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-white/50">
              {loading ? "Carregando cidades…" : "Nenhuma cidade encontrada."}
            </div>
          ) : (
            suggestions.map((m, i) => {
              const active = i === highlight;
              return (
                <button
                  key={m.id}
                  type="button"
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => { e.preventDefault(); select(m); }}
                  className="w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition-colors"
                  style={{
                    background: active ? "rgba(163,230,53,0.12)" : "transparent",
                    borderLeft: active ? "2px solid #a3e635" : "2px solid transparent",
                  }}
                >
                  <span className="text-white text-sm truncate">{m.nome}</span>
                  <span className="text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-md text-[#a3e635] bg-[#a3e635]/10 border border-[#a3e635]/20">
                    {m.uf}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
