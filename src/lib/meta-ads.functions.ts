import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const META_API = "https://graph.facebook.com/v21.0";

function normalizeAccountId(raw: string) {
  const cleaned = raw.trim().replace(/^act_/, "");
  return `act_${cleaned}`;
}

export const syncMetaAds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      adAccountId: z.string().min(3).max(64),
      days: z.number().int().min(1).max(90).optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const token = process.env.META_ACCESS_TOKEN;
    if (!token) {
      return { ok: false, error: "META_ACCESS_TOKEN não configurado" };
    }
    const accountId = normalizeAccountId(data.adAccountId);
    const days = data.days ?? 30;

    // upsert config
    await supabaseAdmin.from("meta_ads_config").upsert(
      { ad_account_id: accountId, is_active: true },
      { onConflict: "ad_account_id" },
    );

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days + 1);
    const until = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const params = new URLSearchParams({
      access_token: token,
      level: "account",
      time_increment: "1",
      fields: "spend,impressions,clicks,reach,account_currency,date_start",
      time_range: JSON.stringify({ since: fmt(since), until: fmt(until) }),
      limit: "500",
    });

    const url = `${META_API}/${accountId}/insights?${params.toString()}`;
    const res = await fetch(url);
    const json: any = await res.json();

    if (!res.ok || json.error) {
      const msg = json?.error?.message ?? `HTTP ${res.status}`;
      await supabaseAdmin
        .from("meta_ads_config")
        .update({ last_sync_error: msg })
        .eq("ad_account_id", accountId);
      return { ok: false, error: msg };
    }

    const rows = (json.data ?? []) as Array<any>;
    const upserts = rows.map((r) => ({
      ad_account_id: accountId,
      spend_date: r.date_start,
      spend: Number(r.spend ?? 0),
      impressions: Number(r.impressions ?? 0),
      clicks: Number(r.clicks ?? 0),
      reach: Number(r.reach ?? 0),
      currency: r.account_currency ?? null,
      synced_at: new Date().toISOString(),
    }));

    if (upserts.length > 0) {
      const { error } = await supabaseAdmin
        .from("meta_ads_spend")
        .upsert(upserts, { onConflict: "ad_account_id,spend_date" });
      if (error) {
        return { ok: false, error: error.message };
      }
    }

    await supabaseAdmin
      .from("meta_ads_config")
      .update({ last_synced_at: new Date().toISOString(), last_sync_error: null })
      .eq("ad_account_id", accountId);

    return { ok: true, days_synced: upserts.length };
  });
