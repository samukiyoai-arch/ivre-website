import { createClient } from "@supabase/supabase-js";
export const db = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storageKey: "ivre-company-auth",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
export const money = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(v) || 0);
export const count = (v) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(v) || 0);
export const date = (v) =>
  v
    ? new Date(v.length === 10 ? v + "T12:00:00" : v).toLocaleDateString(
        "en-IN",
        { day: "numeric", month: "short", year: "numeric" },
      )
    : "Not set";
export const initials = (s) =>
  (s || "IV")
    .split(/\s+/)
    .map((x) => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
export const niches = [
  "Fitness",
  "Beauty",
  "Food",
  "Fashion",
  "Lifestyle",
  "Travel",
  "Technology",
  "Finance",
  "Parenting",
];
export const stages = [
  "applied",
  "negotiating",
  "confirmed",
  "content_due",
  "submitted",
  "revision",
  "approved",
  "published",
  "paid",
];
export function formData(form) {
  return Object.fromEntries(new FormData(form));
}
export async function checked(promise) {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return data;
}
export function parseCriteria(prompt) {
  const q = prompt.toLowerCase(),
    out = {};
  const niche = niches.find((n) => q.includes(n.toLowerCase()));
  if (niche) out.niche = niche;
  if (!out.niche && /tech\b/.test(q)) out.niche = "Technology";
  if (!out.niche && /skincare|makeup/.test(q)) out.niche = "Beauty";
  const city = prompt.match(
    /\b(?:in|from|around|based in)\s+([a-z][a-z ]*?)(?=\s+(?:with|under|between|for|who|charging|and|creators|influencers)|[,.;]|$)/i,
  );
  if (city) out.location = city[1].trim();
  const num = (n, u) =>
    Number(n.replaceAll(",", "")) *
    (u?.toLowerCase() === "k" ? 1000 : u?.toLowerCase() === "m" ? 1000000 : 1);
  const range = q.match(
    /([\d,.]+)\s*([km]?)\s*(?:-|–|to|and)\s*([\d,.]+)\s*([km]?)\s*followers/,
  );
  if (range) {
    out.follower_min = num(range[1], range[2]);
    out.follower_max = num(range[3], range[4]);
  }
  const eng = q.match(/([\d.]+)\s*%\s*\+?\s*engagement/);
  if (eng) out.engagement_min = Number(eng[1]);
  const price = q.match(
    /(?:under|budget(?: of| around| under)?|up to|₹|rs\.?|inr)\s*₹?\s*([\d,.]+)\s*([km]?)/,
  );
  if (price) out.budget_max = num(price[1], price[2]);
  return out;
}
export function exportCSV(name, rows) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const escape = (v) =>
    '"' +
    String(v ?? "")
      .replace(/^[=+@-]/, "'")
      .replaceAll('"', '""') +
    '"';
  const blob = new Blob(
    [
      [keys, ...rows.map((r) => keys.map((k) => r[k]))]
        .map((r) => r.map(escape).join(","))
        .join("\n"),
    ],
    { type: "text/csv;charset=utf-8" },
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name + ".csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
