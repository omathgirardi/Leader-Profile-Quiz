import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SPREADSHEET_ID = "10iadrjSmNLh5taEjgA44uxMajsgw4JvBjFmkGfwQ72M";
const SHEET_NAME = "Leads Diagnóstico N5";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";

const LeadRowSchema = z.object({
  nome: z.string().max(255),
  email: z.string().max(255),
  whatsapp: z.string().max(50),
  instagram: z.string().max(255).nullable().optional(),
  faturamento_lead: z.string().max(100).nullable().optional(),
  colaboradores_lead: z.string().max(100).nullable().optional(),
  faturamento_quiz: z.string().max(100).nullable().optional(),
  tamanho_time_quiz: z.string().max(100).nullable().optional(),
  resposta_1: z.number().int().nullable().optional(),
  resposta_2: z.number().int().nullable().optional(),
  resposta_3: z.number().int().nullable().optional(),
  resposta_4: z.number().int().nullable().optional(),
  resposta_5: z.number().int().nullable().optional(),
  resposta_6: z.number().int().nullable().optional(),
  resposta_7: z.number().int().nullable().optional(),
  pontuacao_total: z.number().int().nullable().optional(),
  nivel_classificado: z.number().int().nullable().optional(),
  utm_source: z.string().max(255).nullable().optional(),
  utm_medium: z.string().max(255).nullable().optional(),
  utm_campaign: z.string().max(255).nullable().optional(),
  utm_content: z.string().max(255).nullable().optional(),
  utm_term: z.string().max(255).nullable().optional(),
});

function nowSaoPaulo(): { data: string; hora: string } {
  const tz = "America/Sao_Paulo";
  const d = new Date();
  const dateFmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeFmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return { data: dateFmt.format(d), hora: timeFmt.format(d) };
}

export const appendLeadToSheet = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => LeadRowSchema.parse(input))
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    const GOOGLE_SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
    if (!GOOGLE_SHEETS_API_KEY) throw new Error("GOOGLE_SHEETS_API_KEY is not configured");

    const { data: dataStr, hora } = nowSaoPaulo();
    const whatsappDigits = data.whatsapp.replace(/\D/g, "");
    const whatsappLink = whatsappDigits ? `wa.me/${whatsappDigits}` : "";
    const num = (v: number | null | undefined) => (v === null || v === undefined ? "" : v);

    const row = [
      dataStr, // A: Data
      hora, // B: Hora
      data.nome, // C: Nome
      data.email, // D: Email
      data.whatsapp, // E: Whatsapp
      whatsappLink, // F: Link WhatsApp (wa.me/)
      data.instagram ?? "", // G: Instagram
      data.faturamento_lead ?? "", // H: Faturamento
      data.colaboradores_lead ?? "", // I: Colaboradores
      data.tamanho_time_quiz ?? "", // J: Tamanho do time
      num(data.resposta_1), // K: Resposta 1
      num(data.resposta_2), // L: Resposta 2
      num(data.resposta_3), // M: Resposta 3
      num(data.resposta_4), // N: Resposta 4
      num(data.resposta_5), // O: Resposta 5
      num(data.resposta_6), // P: Resposta 6
      num(data.resposta_7), // Q: Resposta 7
      num(data.pontuacao_total), // R: Pontuação total
      num(data.nivel_classificado), // S: Nível
      data.utm_source ?? "", // T: Utm source
      data.utm_medium ?? "", // U: Utm medium
      data.utm_campaign ?? "", // V: Utm campaign
      data.utm_content ?? "", // W: Utm content
      data.utm_term ?? "", // X: Utm term
    ];

    const range = `'${SHEET_NAME}'!A:X`;
    // Encode the range (sheet name has spaces + accents) but keep the ":" so the
    // Sheets API can still parse the A:X column span (do NOT double-encode the colon).
    const encodedRange = encodeURIComponent(range).replace(/%3A/g, ":");
    const url = `${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}/values/${encodedRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_SHEETS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [row] }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[Sheets] Append failed [${res.status}]: ${text}`);
      return { ok: false as const, error: `Sheets append failed (${res.status})` };
    }

    return { ok: true as const };
  });
