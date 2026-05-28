import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { CheckCircle2, ArrowRight, ArrowLeft, Star } from "lucide-react";
import aplixLogo from "@/assets/aplix-logo.png";
import { maskPhone, maskCPF, maskCNPJ, maskCpfCnpj, maskCEP, maskCurrencyBRL, maskPercent, PLACEHOLDERS } from "@/lib/masks";
import { LocationPicker } from "@/components/LocationPicker";

export const Route = createFileRoute("/f/$slug")({ component: PublicForm });

const NAVY = "#0a1733";
const NAVY_DEEP = "#050b1f";
const LIME = "#a3e635";
const LIME_BRIGHT = "#bef264";

function PublicForm() {
  const { slug } = Route.useParams();
  const [form, setForm] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [orderIdx, setOrderIdx] = useState(0);
  const [visitedIds, setVisitedIds] = useState<string[]>([]);
  const [history, setHistory] = useState<number[]>([]);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: f } = await supabase.from("aform_forms").select("*").eq("public_slug", slug).eq("status", "active").maybeSingle();
      if (!f) { setLoading(false); return; }
      setForm(f);
      const { data: qs } = await supabase.from("aform_questions").select("*, form_question_options:aform_question_options(*)").eq("form_id", f.id).order("order_index");
      setQuestions((qs ?? []).map(q => ({ ...q, form_question_options: (q.form_question_options ?? []).sort((a:any,b:any)=>a.order_index-b.order_index) })));
      const { data: rs } = await supabase.from("aform_conditional_rules").select("*").eq("form_id", f.id);
      setRules(rs ?? []);
      if (qs?.[0]) setVisitedIds([qs[0].id]);
      setLoading(false);
    })();
  }, [slug]);

  const current = questions[orderIdx];

  function evaluateConditionMatch(rule: any, val: any): boolean {
    const v = String(val ?? "");
    if (rule.condition_value.startsWith(">")) return parseFloat(v) > parseFloat(rule.condition_value.slice(1));
    if (rule.condition_value.startsWith("<")) return parseFloat(v) < parseFloat(rule.condition_value.slice(1));
    if (Array.isArray(val)) return val.includes(rule.condition_value);
    return v === rule.condition_value;
  }

  function next() {
    if (!current) return;
    const val = answers[current.id];
    const empty = val === undefined || val === "" || val === false || (Array.isArray(val) && !val.length);
    if (current.is_required && empty) {
      const msg = current.field_type === "terms" ? "Você precisa aceitar para continuar" : "Esta pergunta é obrigatória";
      setFieldError(msg);
      return;
    }
    if (current.field_type === "email" && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val))) {
      setFieldError("Informe um e-mail válido");
      return;
    }
    setFieldError(null);
    const goto = rules.find(r => r.source_question_id === current.id && r.action_type === "goto" && evaluateConditionMatch(r, val));
    if (goto?.target_question_id) {
      const idx = questions.findIndex(q => q.id === goto.target_question_id);
      if (idx >= 0) { setHistory(h => [...h, orderIdx]); setVisitedIds(v => [...v, questions[idx].id]); setOrderIdx(idx); return; }
    }
    if (orderIdx + 1 < questions.length) {
      setHistory(h => [...h, orderIdx]);
      setVisitedIds(v => [...v, questions[orderIdx + 1].id]);
      setOrderIdx(orderIdx + 1);
    } else { submit(); }
  }

  function back() {
    setFieldError(null);
    if (!history.length) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setVisitedIds(v => v.slice(0, -1));
    setOrderIdx(prev);
  }

  async function submit() {
    if (!form) return;
    setSubmitting(true);
    const nameQ = questions.find(q => /nome/i.test(q.question_text));
    const phoneQ = questions.find(q => q.field_type === "phone");
    const emailQ = questions.find(q => q.field_type === "email");
    let temperature: string | null = null;
    let status = "novo";
    const tags: string[] = [];
    for (const r of rules) {
      const val = answers[r.source_question_id];
      if (val === undefined) continue;
      if (!evaluateConditionMatch(r, val)) continue;
      if (r.action_type === "add_tag" && r.tag_to_add) tags.push(r.tag_to_add);
      if (r.action_type === "set_temperature" && r.temperature_to_set) temperature = r.temperature_to_set;
      if (r.action_type === "set_status" && r.status_to_set) status = r.status_to_set;
    }
    const summary = visitedIds.map(qid => {
      const q = questions.find(x => x.id === qid);
      const a = answers[qid];
      return q && a !== undefined ? `${q.question_text}: ${Array.isArray(a)?a.join(", "):a}` : null;
    }).filter(Boolean).join("\n");

    const { data: lead, error } = await supabase.from("aform_leads").insert({
      form_id: form.id, owner_id: form.owner_id,
      name: nameQ ? answers[nameQ.id] : null,
      phone: phoneQ ? answers[phoneQ.id] : null,
      email: emailQ ? answers[emailQ.id] : null,
      status, temperature, summary,
    }).select().single();

    if (error || !lead) { setSubmitting(false); toast.error(error?.message ?? "Erro"); return; }

    const ansRows = visitedIds.filter(qid => answers[qid] !== undefined)
      .map(qid => ({ lead_id: lead.id, question_id: qid, answer_value: Array.isArray(answers[qid]) ? answers[qid].join(", ") : String(answers[qid]) }));
    if (ansRows.length) await supabase.from("aform_lead_answers").insert(ansRows);
    if (tags.length) await supabase.from("aform_lead_tags").insert(tags.map(t => ({ lead_id: lead.id, tag_name: t })));
    await supabase.from("aform_lead_events").insert({ lead_id: lead.id, event_type: "created", new_value: status });
    setDone(true);
    setSubmitting(false);
  }

  const progress = questions.length ? ((orderIdx + (done ? 1 : 0)) / questions.length) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: NAVY_DEEP }}>
        <div className="flex items-center gap-3 text-white/70">
          <div className="size-2 rounded-full animate-pulse" style={{ background: LIME }} />
          Carregando…
        </div>
      </div>
    );
  }
  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center" style={{ background: NAVY_DEEP }}>
        <div className="text-white">
          <h1 className="text-2xl font-bold">Formulário indisponível</h1>
          <p className="text-sm text-white/60 mt-2">Este formulário não existe ou não está ativo.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden flex items-center justify-center p-6"
      style={{
        background: `radial-gradient(1200px 600px at 15% -10%, ${LIME}22, transparent 60%), radial-gradient(900px 500px at 110% 110%, ${LIME}18, transparent 60%), linear-gradient(180deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)`,
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      {/* decorative grid */}
      <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{ backgroundImage: `linear-gradient(${LIME} 1px, transparent 1px), linear-gradient(90deg, ${LIME} 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />
      {/* floating orbs */}
      <div className="absolute -top-32 -left-32 size-96 rounded-full blur-3xl opacity-30" style={{ background: LIME }} />
      <div className="absolute -bottom-40 -right-32 size-[28rem] rounded-full blur-3xl opacity-20" style={{ background: "#1e3a8a" }} />

      <div className="relative w-full max-w-4xl">
        {/* glow ring */}
        <div className="absolute -inset-px rounded-3xl opacity-60 blur-xl"
          style={{ background: `linear-gradient(135deg, ${LIME}66, transparent 40%, ${LIME}33)` }} />

        <div
          className="relative rounded-3xl border backdrop-blur-xl p-10 md:p-14"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
            borderColor: "rgba(163,230,53,0.25)",
            boxShadow: `0 30px 80px -20px ${NAVY_DEEP}, 0 0 0 1px rgba(255,255,255,0.04) inset`,
          }}
        >
          {/* logo */}
          <div className="flex items-center justify-center mb-8">
            <img src={aplixLogo} alt="Aplix" className="h-12 w-auto object-contain drop-shadow-[0_0_20px_rgba(163,230,53,0.4)]" />
          </div>

          {/* title */}
          <div className="text-center">
            {form.logo_url && <img src={form.logo_url} alt="" className="h-14 mx-auto mb-6 object-contain" />}
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
              <span style={{ color: "#fff" }}>{form.name?.split(" ").slice(0, -1).join(" ") || form.name}</span>{" "}
              <span style={{ color: LIME }}>{form.name?.split(" ").slice(-1)[0]}</span>
            </h1>
            {orderIdx === 0 && !done && form.initial_message && (
              <p className="text-sm md:text-base text-white/70 mt-4 max-w-md mx-auto leading-relaxed">{form.initial_message}</p>
            )}
          </div>

          {/* progress */}
          {!done && questions.length > 0 && (
            <div className="mt-10 mb-2">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-white/50 mb-2">
                <span>Pergunta {orderIdx + 1} de {questions.length}</span>
                <span style={{ color: LIME }}>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${LIME}, ${LIME_BRIGHT})`, boxShadow: `0 0 20px ${LIME}88` }} />
              </div>
            </div>
          )}

          {done ? (
            <div className="py-10 text-center">
              <div className="inline-flex items-center justify-center size-20 rounded-full mb-6"
                style={{ background: `${LIME}1f`, border: `1px solid ${LIME}55` }}>
                <CheckCircle2 className="size-10" style={{ color: LIME }} />
              </div>
              <p className="text-xl md:text-2xl font-semibold text-white">{form.final_message || "Obrigado!"}</p>
              <p className="text-sm text-white/60 mt-2">Recebemos suas respostas com sucesso.</p>
            </div>
          ) : current ? (
            <div className="mt-8 space-y-6" key={current.id}>
              <div className="text-center">
                <Label className="text-xl md:text-2xl font-semibold block text-white leading-snug">
                  {current.question_text}
                  {current.is_required && <span className="ml-1" style={{ color: LIME }}>*</span>}
                </Label>
                {current.question_description && (
                  <p className="text-sm text-white/60 mt-2">{current.question_description}</p>
                )}
              </div>

              <div className="max-w-2xl mx-auto">
                <QuestionInput q={current} value={answers[current.id]} onChange={v => { setFieldError(null); setAnswers(a => ({ ...a, [current.id]: v })); }} hasError={!!fieldError} />
                {fieldError && (
                  <p className="mt-3 text-sm text-center" style={{ color: "#fca5a5" }}>{fieldError}</p>
                )}
              </div>

              <div className="flex justify-center items-center gap-3 pt-4">
                {history.length > 0 && (
                  <button
                    onClick={back}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 font-medium px-5 py-3 rounded-full transition-all hover:bg-white/5 text-white/70 hover:text-white border border-white/15"
                  >
                    <ArrowLeft className="size-4" /> Voltar
                  </button>
                )}
                <button
                  onClick={next}
                  disabled={submitting}
                  className="group relative inline-flex items-center gap-2 font-semibold px-8 py-3.5 rounded-full transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-60"
                  style={{
                    background: `linear-gradient(135deg, ${LIME}, ${LIME_BRIGHT})`,
                    color: NAVY_DEEP,
                    boxShadow: `0 10px 30px -8px ${LIME}aa, 0 0 0 1px ${LIME}66`,
                  }}
                >
                  {orderIdx + 1 === questions.length ? (form.button_text || "Enviar") : "Próxima"}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-sm text-white/60 py-10">Este formulário ainda não tem perguntas.</div>
          )}
        </div>

        <div className="text-center text-xs text-white/40 mt-6 tracking-wider">
          Powered by <span style={{ color: LIME }} className="font-semibold">Aplix FORM</span>
        </div>
      </div>
    </div>
  );
}

function QuestionInput({ q, value, onChange, hasError }: { q: any; value: any; onChange: (v: any) => void; hasError?: boolean }) {
  const errCls = hasError ? " !border-red-400/70 focus-visible:!ring-red-400/60" : "";
  const inputCls = "h-12 rounded-xl border-white/15 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-2 focus-visible:ring-[#a3e635] focus-visible:border-[#a3e635] transition-all" + errCls;
  const taCls = "rounded-xl border-white/15 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-2 focus-visible:ring-[#a3e635] focus-visible:border-[#a3e635]" + errCls;

  switch (q.field_type) {
    case "text_short": return <Input className={inputCls} value={value ?? ""} onChange={e=>onChange(e.target.value)} placeholder="Digite aqui…" />;
    case "text_long": return <Textarea className={taCls} value={value ?? ""} onChange={e=>onChange(e.target.value)} rows={5} placeholder="Digite aqui…" />;
    case "phone": return <Input className={inputCls} type="tel" inputMode="tel" value={value ?? ""} onChange={e=>onChange(maskPhone(e.target.value))} placeholder={PLACEHOLDERS.phone} />;
    case "email": return <Input className={inputCls} type="email" value={value ?? ""} onChange={e=>onChange(e.target.value)} placeholder="voce@email.com" />;
    case "number": return <Input className={inputCls} type="number" value={value ?? ""} onChange={e=>onChange(e.target.value)} placeholder="0" />;
    case "cpf": return <Input className={inputCls} inputMode="numeric" value={value ?? ""} onChange={e=>onChange(maskCPF(e.target.value))} placeholder={PLACEHOLDERS.cpf} />;
    case "cnpj": return <Input className={inputCls} inputMode="numeric" value={value ?? ""} onChange={e=>onChange(maskCNPJ(e.target.value))} placeholder={PLACEHOLDERS.cnpj} />;
    case "cpf_cnpj": return <Input className={inputCls} inputMode="numeric" value={value ?? ""} onChange={e=>onChange(maskCpfCnpj(e.target.value))} placeholder={PLACEHOLDERS.cpf_cnpj} />;
    case "cep": return <Input className={inputCls} inputMode="numeric" value={value ?? ""} onChange={e=>onChange(maskCEP(e.target.value))} placeholder={PLACEHOLDERS.cep} />;
    case "currency": return <Input className={inputCls} inputMode="numeric" value={value ?? ""} onChange={e=>onChange(maskCurrencyBRL(e.target.value))} placeholder={PLACEHOLDERS.currency} />;
    case "percent": return <Input className={inputCls} inputMode="numeric" value={value ?? ""} onChange={e=>onChange(maskPercent(e.target.value))} placeholder={PLACEHOLDERS.percent} />;
    case "location": return <LocationPicker value={value ?? ""} onChange={onChange} />;
    case "date": return <Input className={inputCls + " [color-scheme:dark]"} type="date" value={value ?? ""} onChange={e=>onChange(e.target.value)} />;
    case "single_choice":
      return (
        <RadioGroup value={value ?? ""} onValueChange={onChange} className="space-y-2.5">
          {q.form_question_options.map((o:any) => {
            const active = value === o.option_text;
            return (
              <label key={o.id}
                className="flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all hover:bg-white/[0.07]"
                style={{
                  borderColor: active ? LIME : "rgba(255,255,255,0.12)",
                  background: active ? `${LIME}14` : "rgba(255,255,255,0.04)",
                  boxShadow: active ? `0 0 0 3px ${LIME}26` : "none",
                }}>
                <RadioGroupItem value={o.option_text} id={o.id} className="border-white/40 text-[#a3e635]" />
                <span className="text-white text-sm">{o.option_text}</span>
              </label>
            );
          })}
        </RadioGroup>
      );
    case "multiple_choice":
    case "checkbox": {
      const arr: string[] = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2.5">
          {q.form_question_options.map((o:any) => {
            const active = arr.includes(o.option_text);
            return (
              <label key={o.id}
                className="flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all hover:bg-white/[0.07]"
                style={{
                  borderColor: active ? LIME : "rgba(255,255,255,0.12)",
                  background: active ? `${LIME}14` : "rgba(255,255,255,0.04)",
                  boxShadow: active ? `0 0 0 3px ${LIME}26` : "none",
                }}>
                <Checkbox checked={active} onCheckedChange={chk => onChange(chk ? [...arr, o.option_text] : arr.filter(x => x !== o.option_text))}
                  className="border-white/40 data-[state=checked]:bg-[#a3e635] data-[state=checked]:border-[#a3e635] data-[state=checked]:text-[#050b1f]" />
                <span className="text-white text-sm">{o.option_text}</span>
              </label>
            );
          })}
        </div>
      );
    }
    case "rating": {
      const max = Number(q.max_value) > 0 ? Number(q.max_value) : 5;
      const current = Number(value) || 0;
      return (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: max }).map((_, i) => {
            const n = i + 1;
            const active = n <= current;
            return (
              <button key={n} type="button" onClick={() => onChange(n)}
                className="p-1 transition-transform hover:scale-110 active:scale-95">
                <Star className="size-10" style={{ color: active ? LIME : "rgba(255,255,255,0.25)", fill: active ? LIME : "transparent" }} />
              </button>
            );
          })}
        </div>
      );
    }
    case "slider": {
      const min = Number.isFinite(Number(q.min_value)) ? Number(q.min_value) : 0;
      const max = Number(q.max_value) > min ? Number(q.max_value) : 100;
      const step = Number(q.step_value) > 0 ? Number(q.step_value) : 1;
      const current = value === undefined || value === "" ? min : Number(value);
      return (
        <div className="space-y-4">
          <div className="text-center text-3xl font-bold" style={{ color: LIME }}>{current}</div>
          <input type="range" min={min} max={max} step={step} value={current}
            onChange={e => onChange(Number(e.target.value))}
            className="w-full accent-[#a3e635] h-2" />
          <div className="flex justify-between text-xs text-white/50"><span>{min}</span><span>{max}</span></div>
        </div>
      );
    }
    case "terms": {
      const checked = value === true;
      return (
        <label className={"flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all hover:bg-white/[0.07] " + (hasError ? "border-red-400/60" : "")}
          style={{ borderColor: hasError ? undefined : (checked ? LIME : "rgba(255,255,255,0.15)"), background: checked ? `${LIME}14` : "rgba(255,255,255,0.04)" }}>
          <Checkbox checked={checked} onCheckedChange={chk => onChange(!!chk)}
            className="mt-0.5 border-white/40 data-[state=checked]:bg-[#a3e635] data-[state=checked]:border-[#a3e635] data-[state=checked]:text-[#050b1f]" />
          <span className="text-white/85 text-sm leading-relaxed">
            {q.terms_text || "Li e aceito os termos de uso e a política de privacidade, autorizando o tratamento dos meus dados conforme a LGPD."}
          </span>
        </label>
      );
    }
    default: return <Input className={inputCls} value={value ?? ""} onChange={e=>onChange(e.target.value)} />;
  }
}
