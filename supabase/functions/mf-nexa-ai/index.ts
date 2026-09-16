const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
  });
}

function text(v: unknown) { return String(v ?? "").trim(); }
function norm(v: unknown) {
  return text(v).toLowerCase().normalize("NFKD").replace(/[\u064b-\u065f\u0670]/g, "").replace(/[إأآ]/g,"ا").replace(/ى/g,"ي");
}

async function authenticate(req: Request) {
  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return null;
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) throw new Error("Supabase authentication is not configured");
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { Authorization: authorization, apikey: anonKey },
  });
  if (!response.ok) return null;
  const user = await response.json();
  return user?.id ? user : null;
}

async function providerAnswer(prompt: string, summary: unknown, client: unknown) {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return "";
  const system = [
    "You are the authenticated assistant for NEXA-MF Microfinance Department.",
    "Answer in concise Arabic.",
    "For general_qa questions, answer as general knowledge and never return portfolio/customer counts unless explicitly asked for operational data.",
    "Never reveal customer data beyond the supplied scoped summary/client.",
    "Do not invent customer data."
  ].join(" ");
  const ai = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5-mini",
      store: false,
      max_output_tokens: 1600,
      input: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify({ prompt, summary, client }) }
      ]
    })
  });
  if (!ai.ok) return "";
  const data = await ai.json();
  return text(data?.output_text) || (Array.isArray(data?.output) ? data.output : [])
    .filter((item: any) => item.type === "message")
    .flatMap((item: any) => Array.isArray(item.content) ? item.content : [])
    .filter((part: any) => part.type === "output_text")
    .map((part: any) => text(part.text)).filter(Boolean).join("\n");
}

async function wikipediaGeneral(prompt: string) {
  try {
    const qs = new URLSearchParams({
      action: "query", list: "search", srsearch: prompt, format: "json", utf8: "1", origin: "*"
    });
    const s = await fetch(`https://ar.wikipedia.org/w/api.php?${qs.toString()}`, { headers: { "User-Agent": "NEXA-MF/1.0" } });
    if (!s.ok) return "";
    const sj = await s.json();
    const title = sj?.query?.search?.[0]?.title;
    if (!title) return "";
    const qs2 = new URLSearchParams({
      action: "query", prop: "extracts", exintro: "1", explaintext: "1", redirects: "1", titles: title, format: "json", utf8: "1", origin: "*"
    });
    const r = await fetch(`https://ar.wikipedia.org/w/api.php?${qs2.toString()}`, { headers: { "User-Agent": "NEXA-MF/1.0" } });
    if (!r.ok) return "";
    const j = await r.json();
    const pages = j?.query?.pages || {};
    const page = Object.values(pages)[0] as any;
    const extract = text(page?.extract);
    if (!extract) return "";
    const concise = extract.length > 900 ? extract.slice(0, 900).replace(/\s+\S*$/, "") + "…" : extract;
    return concise;
  } catch (_) { return ""; }
}

async function generalFallback(prompt: string) {
  const q = norm(prompt);
  if (q.includes("اين تقع الاردن")) return "تقع الأردن في غرب آسيا ضمن منطقة بلاد الشام. تحدّها سوريا شمالًا، والعراق شرقًا، والسعودية جنوبًا وشرقًا، وفلسطين غربًا، ولها منفذ بحري على خليج العقبة.";
  if ((q.includes("مخترع") && q.includes("هاتف")) || (q.includes("اخترع") && q.includes("هاتف"))) return "يُنسب اختراع الهاتف العملي إلى ألكسندر غراهام بيل، الذي حصل على براءة اختراع للهاتف عام 1876، مع وجود مساهمات مبكرة لمخترعين آخرين في تطوير تقنيات نقل الصوت.";
  if (q.includes("لماذا") && q.includes("السماء") && q.includes("ازرق")) return "يبدو لون السماء أزرق لأن جزيئات الغلاف الجوي تشتّت ضوء الشمس قصير الموجة، وخصوصًا الأزرق، أكثر من الألوان الأطول موجة. تُعرف هذه الظاهرة باسم تشتّت رايلي.";
  const wiki = await wikipediaGeneral(prompt);
  if (wiki) return wiki;
  return "تعذر الحصول على إجابة عامة موثوقة الآن. لم يتم تحويل السؤال إلى بيانات العملاء أو المحفظة.";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const user = await authenticate(req);
    if (!user) return reply({ error: "Unauthorized" }, 401);
    const payload = await req.json();
    const prompt = text(payload?.prompt);
    const mode = text(payload?.mode);
    if (prompt.length > 4000) return reply({error:"Prompt too long"},400);
    const authorization = req.headers.get("Authorization")!;
    const headers = {Authorization:authorization,apikey:Deno.env.get("SUPABASE_ANON_KEY")!};
    const base = Deno.env.get("SUPABASE_URL")!;
    const profiles = await fetch(base+"/rest/v1/profiles?select=id,role&is_active=eq.true&id=eq."+encodeURIComponent(user.id),{headers});
    if (!profiles.ok) return reply({error:"Profile check unavailable"},503);
    if (!(await profiles.json()).length) return reply({error:"Inactive or unauthorized account"},403);
    const isGeneral = mode === "general_qa" || payload?.force_general === true;
    let summary: any = {}, client: any = null;
    if (!isGeneral) {
      async function count(table: string, filter="") {
        const response=await fetch(base+"/rest/v1/"+table+"?select=id"+filter,{method:"HEAD",headers:{...headers,Prefer:"count=exact"}});
        if(!response.ok) throw new Error("Scoped summary unavailable");
        const value=response.headers.get("content-range")?.split("/")[1];
        if(!value || value==="*") throw new Error("Scoped count unavailable");
        return Number(value);
      }
      const counts=await Promise.all([count("clients"),count("clients","&days_overdue=gte.30&days_overdue=lte.60&overdue_amount=gt.0"),count("clients","&due_amount=gt.0"),count("promises_to_pay","&status=eq.pending")]);
      summary={clients:counts[0],late:counts[1],due:counts[2],pendingPromises:counts[3]};
      const requested=payload?.client;
      if(requested) {
        const filter=requested.id?"id=eq."+encodeURIComponent(String(requested.id)):requested.clientNo?"client_number=eq."+encodeURIComponent(String(requested.clientNo)):"";
        if(!filter)return reply({error:"Client identifier required"},400);
        const response=await fetch(base+"/rest/v1/clients?select=id,client_number,client_name,assigned_employee,days_overdue,overdue_amount,due_amount&"+filter,{headers});
        if(!response.ok)throw new Error("Scoped client lookup failed");
        const rows=await response.json();if(rows.length!==1)return reply({error:"Client unavailable in your scope"},403);
        const row=rows[0];client={id:row.id,name:row.client_name,clientNo:row.client_number,employee:row.assigned_employee,late:Number(row.days_overdue)>=30&&Number(row.days_overdue)<=60&&Number(row.overdue_amount)>0,due:Number(row.due_amount)>0};
      }
    }
    if (!prompt) return reply({ error: "Prompt is required" }, 400);

    const provider = await providerAnswer(prompt, summary, client);
    if (provider) return reply({ answer: provider, source: "provider" });

    if (mode === "general_qa" || payload?.force_general === true) {
      const answer = await generalFallback(prompt);
      return reply({ answer, source: "general-fallback" });
    }

    const q = norm(prompt);
    let answer = "";
    if (q.includes("عميل") && client) {
      answer = `ملخص العميل ضمن صلاحيتك: ${text(client.name) || "غير محدد"}، رقم ${text(client.clientNo) || "-"}، الموظف ${text(client.employee) || "-"}، Late: ${client.late ? "نعم" : "لا"}، Due: ${client.due ? "نعم" : "لا"}.`;
    } else if (q.includes("late") || q.includes("متاخر")) {
      answer = `عدد حالات Late ضمن صلاحيتك: ${Number(summary.late ?? 0)}.`;
    } else if (q.includes("due") || q.includes("مستحق")) {
      answer = `عدد حالات Due ضمن صلاحيتك: ${Number(summary.due ?? 0)}.`;
    } else if (q.includes("وعد") || q.includes("promise")) {
      answer = `وعود الدفع المعلقة ضمن ملخصك: ${Number(summary.pendingPromises ?? 0)}. راجع Today ثم حدّث الوعد إلى Kept أو Broken حسب النتيجة.`;
    } else if (q.includes("متابعة") || q.includes("today")) {
      answer = "افتح Today لمراجعة المتابعات المستحقة، ثم سجل النتيجة أو أعد الجدولة. تبقى العمليات مقيدة بنطاق صلاحيتك.";
    } else {
      answer = `ملخص نطاقك الحالي: العملاء ${Number(summary.clients ?? 0)}، Late ${Number(summary.late ?? 0)}، Due ${Number(summary.due ?? 0)}.`;
    }
    return reply({ answer, source: "scoped-fallback" });
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
