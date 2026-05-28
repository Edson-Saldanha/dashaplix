import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/webhooks/$slug")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const slug = params.slug;
        let bodyText = "";
        let payload: any = {};
        try {
          bodyText = await request.text();
          payload = bodyText ? JSON.parse(bodyText) : {};
        } catch {
          return new Response(JSON.stringify({ error: "invalid JSON" }), { status: 400, headers: { "content-type": "application/json" } });
        }

        // Lookup integration
        const { data: integration } = await supabaseAdmin
          .from("integrations").select("*").eq("webhook_slug", slug).maybeSingle();

        if (!integration) {
          return new Response(JSON.stringify({ error: "integration not found" }), { status: 404, headers: { "content-type": "application/json" } });
        }
        if (!integration.is_active) {
          return new Response(JSON.stringify({ error: "integration disabled" }), { status: 403, headers: { "content-type": "application/json" } });
        }

        // Validate token (header or query param)
        const url = new URL(request.url);
        const token = request.headers.get("x-aplix-token") || url.searchParams.get("token");
        if (token !== integration.security_token) {
          return new Response(JSON.stringify({ error: "invalid token" }), { status: 401, headers: { "content-type": "application/json" } });
        }

        const platform = integration.platform_name;
        const eventType = payload.event || payload.type || payload.webhook_event_type || null;

        // Save raw event
        const { data: ev } = await supabaseAdmin.from("webhook_events").insert({
          integration_id: integration.id,
          platform,
          event_type: eventType,
          payload,
        }).select().single();

        // Try to extract sale fields (Kiwify / Hotmart-friendly)
        try {
          const sale = extractSale(payload, platform);
          if (sale) {
            // Upsert by transaction code if provided
            if (sale.transaction_code) {
              const { data: existing } = await supabaseAdmin
                .from("sales").select("id").eq("transaction_code", sale.transaction_code).maybeSingle();
              if (existing) {
                await supabaseAdmin.from("sales").update(sale).eq("id", existing.id);
                await supabaseAdmin.from("webhook_events").update({ processed: true, sale_id: existing.id }).eq("id", ev!.id);
              } else {
                const { data: inserted } = await supabaseAdmin.from("sales").insert(sale).select().single();
                await supabaseAdmin.from("webhook_events").update({ processed: true, sale_id: inserted?.id }).eq("id", ev!.id);
              }
            } else {
              const { data: inserted } = await supabaseAdmin.from("sales").insert(sale).select().single();
              await supabaseAdmin.from("webhook_events").update({ processed: true, sale_id: inserted?.id }).eq("id", ev!.id);
            }
          } else {
            // Sem venda detectada → tenta extrair como LEAD
            const lead = extractLead(payload, platform);
            if (lead) {
              const { error: leadError } = await supabaseAdmin.from("leads").insert(lead);
              if (leadError) throw leadError;
            }
            await supabaseAdmin.from("webhook_events").update({ processed: true }).eq("id", ev!.id);
          }
        } catch (err: any) {
          await supabaseAdmin.from("webhook_events").update({ processing_error: String(err?.message ?? err) }).eq("id", ev!.id);
        }

        // Update integration counters
        await supabaseAdmin.from("integrations").update({
          last_received_at: new Date().toISOString(),
          events_count: (integration.events_count ?? 0) + 1,
        }).eq("id", integration.id);

        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
      },
    },
  },
});

function n(v: any): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[^\d.,-]/g, "").replace(",", ".");
  const x = Number(s);
  return Number.isFinite(x) ? x : 0;
}

function mapStatus(s: any): string {
  const v = String(s ?? "").toLowerCase();
  if (["paid", "approved", "completed", "aprovado", "aprovada", "efetivado", "efetivada", "pago"].some(k => v.includes(k))) return "aprovada";
  if (["refund", "reembols"].some(k => v.includes(k))) return "reembolsada";
  if (["chargeback"].some(k => v.includes(k))) return "chargeback";
  if (["refused", "denied", "recusad", "declined"].some(k => v.includes(k))) return "recusada";
  return "pendente";
}

function mapPaymentMethod(v: any): string | null {
  const s = String(v ?? "").toLowerCase();
  if (!s) return null;
  if (s.includes("pix")) return "Pix";
  if (s.includes("billet") || s.includes("boleto")) return "Boleto";
  if (s.includes("credit")) return "Cartão de crédito";
  if (s.includes("debit")) return "Cartão de débito";
  return String(v);
}

function toIso(v: any): string {
  if (!v) return new Date().toISOString();
  if (typeof v === "number") return new Date(v).toISOString();
  const num = Number(v);
  if (Number.isFinite(num) && num > 1e10) return new Date(num).toISOString();
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function extractSale(p: any, platform: string): any | null {
  // Detecta TMB (boleto) — campos em português
  const isTMB = /tmb/i.test(platform) || (p && (p.status_pedido !== undefined || p.lancamento !== undefined || p.taxa_administracao !== undefined));
  if (isTMB) {
    const gross = n(p.valor_total ?? p.valor_principal);
    // taxa_administracao na TMB é percentual (ex: 21 = 21%)
    const taxaPct = n(p.taxa_administracao);
    const fee = taxaPct > 0 && taxaPct <= 100 ? +(gross * taxaPct / 100).toFixed(2) : 0;
    const net = Math.max(0, gross - fee);

    const sale = {
      customer_name: p.cliente || "Cliente",
      customer_email: p.email ?? null,
      customer_phone: p.telefone_ativo || p.telefones || null,
      product_name: p.lancamento || p.titulo || "Produto",
      gross_amount: gross,
      net_amount: net,
      platform_fee: fee,
      payment_method: "Boleto",
      status: mapStatus(p.status_pedido ?? p.status_financeiro),
      platform,
      sale_date: toIso(p.data_efetivado || p.criado_em),
      transaction_code: p.code ? String(p.code) : (p.pedido ? String(p.pedido) : null),
      raw_payload: p,
    };
    if (!sale.gross_amount && !sale.transaction_code) return null;
    return sale;
  }

  // Detecta Hotmart (envelope { id, event, data: {...} })
  const isHotmart = !!p?.data?.purchase || /hotmart/i.test(platform);
  if (isHotmart) {
    const d = p.data ?? p;
    const buyer = d.buyer ?? {};
    const product = d.product ?? {};
    const purchase = d.purchase ?? {};
    const commissions: any[] = Array.isArray(d.commissions) ? d.commissions : [];

    const gross = n(purchase.price?.value ?? purchase.full_price?.value ?? purchase.original_offer_price?.value);
    // Comissão do produtor = "net" recebido pelo vendedor
    const producer = commissions.find((c) => /producer|produtor/i.test(String(c?.source ?? ""))) ?? commissions[0];
    const producerNet = n(producer?.value);
    const hotmartFee = Math.abs(n(commissions.find((c) => /hotmart|fee/i.test(String(c?.source ?? "")))?.value));
    // Taxa sempre positiva; líquido nunca maior que o bruto
    const fee = gross && producerNet && producerNet <= gross
      ? Math.max(0, gross - producerNet)
      : hotmartFee;
    const net = Math.max(0, gross - fee);

    const phone = [buyer.checkout_phone_code, buyer.checkout_phone].filter(Boolean).join(" ") || buyer.phone || null;

    const sale = {
      customer_name: buyer.name || [buyer.first_name, buyer.last_name].filter(Boolean).join(" ") || "Cliente",
      customer_email: buyer.email ?? null,
      customer_phone: phone,
      product_name: product.name || "Produto",
      gross_amount: gross,
      net_amount: net,
      platform_fee: fee,
      payment_method: mapPaymentMethod(purchase.payment?.type),
      status: mapStatus(purchase.status ?? p.event),
      platform,
      sale_date: toIso(purchase.approved_date ?? purchase.order_date),
      transaction_code: purchase.transaction ? String(purchase.transaction) : null,
      raw_payload: p,
    };
    if (!sale.gross_amount && !sale.transaction_code) return null;
    return sale;
  }

  // Kiwify-like
  const customer = p.Customer || p.customer || p.buyer || {};
  const product = p.Product || p.product || {};
  const commissions = p.Commissions || p.commissions || {};
  const order = p.order || p;

  // Kiwify envia valores em CENTAVOS (ex.: 155 = R$ 1,55). Dividimos por 100.
  const isKiwifyShape = !!(p.Commissions || p.Product || p.webhook_event_type);
  const toReais = (cents: number) => (isKiwifyShape ? cents / 100 : cents);
  const gross = toReais(n(p.charge?.amount ?? p.amount ?? commissions.charge_amount ?? order.total ?? p.total_value ?? p.price));
  const fee = toReais(n(commissions.kiwify_fee ?? commissions.fee ?? p.fee ?? p.platform_fee));
  const net = toReais(n(commissions.my_commission ?? commissions.net ?? p.net_amount)) || Math.max(0, gross - fee);

  const status = mapStatus(p.order_status ?? p.status ?? p.event ?? p.transaction_status);

  const customer_name = customer.full_name || customer.name || p.customer_name || p.buyer_name || "Cliente";
  const customer_email = customer.email || p.customer_email || p.buyer_email || null;
  const customer_phone = customer.mobile || customer.phone || p.customer_phone || p.buyer_phone || null;
  const product_name = product.product_name || product.name || p.product_name || p.product_title || "Produto";
  const transaction_code = p.order_id || p.transaction_id || p.transaction || p.id || null;
  const payment_method = mapPaymentMethod(p.payment_method || p.payment_type || p.charge?.payment_method);
  const sale_date = toIso(p.created_at || p.approved_date);

  if (!gross && !transaction_code) return null;

  return {
    customer_name, customer_email, customer_phone,
    product_name,
    gross_amount: gross, net_amount: net, platform_fee: fee,
    payment_method, status,
    platform,
    sale_date,
    transaction_code: transaction_code ? String(transaction_code) : null,
    raw_payload: p,
  };
}

function pick(p: any, keys: string[]): any {
  for (const k of keys) {
    const v = k.split(".").reduce((o, kk) => (o == null ? o : o[kk]), p);
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

// Procura pela primeira chave (case-insensitive, sem acento/pontuação) que CONTÉM um dos termos
function fuzzyFind(flat: Record<string, any>, terms: string[]): any {
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  for (const [key, value] of Object.entries(flat)) {
    if (value === null || value === undefined || value === "") continue;
    if (typeof value === "object") continue;
    const nk = norm(key);
    if (terms.some((t) => nk.includes(t))) return value;
  }
  return null;
}

function flattenPayload(value: any, prefix = "", out: Record<string, any> = {}): Record<string, any> {
  if (Array.isArray(value)) {
    value.forEach((item, index) => flattenPayload(item, prefix ? `${prefix}.${index}` : String(index), out));
    return out;
  }

  if (!value || typeof value !== "object") return out;

  Object.entries(value).forEach(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    if (child && typeof child === "object") {
      const label = (child as any).label ?? (child as any).question ?? (child as any).title ?? (child as any).name ?? (child as any).key;
      const answer = (child as any).value ?? (child as any).answer ?? (child as any).text;
      if (label && answer !== undefined && answer !== null && answer !== "") out[String(label)] = answer;
      flattenPayload(child, path, out);
      return;
    }

    if (child !== undefined && child !== null && child !== "") {
      out[path] = child;
      if (out[key] === undefined) out[key] = child;
    }
  });

  return out;
}

function extractLead(p: any, platform: string): any | null {
  // Achata todo o payload para capturar respostas em campos aninhados do formulário.
  const flat = flattenPayload(p);

  // 1) tentativa direta por chaves comuns
  let name = pick(flat, ["name", "nome", "full_name", "fullName", "nome_completo", "first_name"]);
  let email = pick(flat, ["email", "e-mail", "mail"]);
  let phone = pick(flat, ["phone", "telefone", "celular", "whatsapp", "phone_number", "telephone"]);
  let company = pick(flat, ["company", "empresa", "organization"]);
  let message = pick(flat, ["message", "mensagem", "observacao", "observação", "notes", "comentario"]);
  let product_interest = pick(flat, ["product", "produto", "product_interest", "interesse", "nicho"]);
  let current_revenue = pick(flat, ["current_revenue", "faturamento", "revenue"]);
  let main_difficulty = pick(flat, ["main_difficulty", "dificuldade", "maior_dificuldade"]);

  // 2) fallback fuzzy — procura em chaves longas tipo "Qual o seu nome?", "Número do WhatsApp"
  if (!name) name = fuzzyFind(flat, ["nome", "name"]);
  if (!email) email = fuzzyFind(flat, ["email", "mail"]);
  if (!phone) phone = fuzzyFind(flat, ["whatsapp", "telefone", "celular", "phone"]);
  if (!company) company = fuzzyFind(flat, ["empresa", "company", "negocio"]);
  if (!product_interest) product_interest = fuzzyFind(flat, ["nicho", "produto", "interesse"]);
  if (!current_revenue) current_revenue = fuzzyFind(flat, ["faturamento", "revenue"]);
  if (!main_difficulty) main_difficulty = fuzzyFind(flat, ["dificuldade", "difficulty"]);

  // Precisa pelo menos de nome OU email OU telefone para ser um lead válido
  if (!name && !email && !phone) return null;

  return {
    name: String(name ?? email ?? phone ?? "Lead sem nome").slice(0, 200),
    email: email ? String(email) : null,
    phone: phone ? String(phone) : null,
    company: company ? String(company) : null,
    source: platform,
    product_interest: product_interest ? String(product_interest) : null,
    current_revenue: current_revenue ? String(current_revenue) : null,
    main_difficulty: main_difficulty ? String(main_difficulty) : null,
    notes: message ? String(message) : null,
    status: "novo",
  };
}
