// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_USERS = [
  { email: "demo1@formly.app", name: "Болд Б." },
  { email: "demo2@formly.app", name: "Сараа С." },
  { email: "demo3@formly.app", name: "Тэмүүлэн Т." },
  { email: "demo4@formly.app", name: "Номин Н." },
  { email: "demo5@formly.app", name: "Энхбаяр Э." },
  { email: "demo6@formly.app", name: "Цэцэг Ц." },
  { email: "demo7@formly.app", name: "Баатар Б." },
  { email: "demo8@formly.app", name: "Анар А." },
  { email: "demo9@formly.app", name: "Мөнхөө М." },
  { email: "demo10@formly.app", name: "Оюун О." },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Caller must be admin
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    const token = auth.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id);
    const isAdmin = (roleRows ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: corsHeaders });

    const created: { email: string; status: string }[] = [];

    for (const u of DEMO_USERS) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: "demo1234",
        email_confirm: true,
        user_metadata: { display_name: u.name },
      });
      if (error) {
        created.push({ email: u.email, status: error.message });
      } else {
        created.push({ email: u.email, status: "created" });
        // Ensure profile name is set (trigger uses email split if metadata missing)
        if (data.user) {
          await supabase.from("profiles").update({ display_name: u.name }).eq("user_id", data.user.id);
        }
      }
    }

    // Seed demo surveys owned by the calling admin
    const adminId = userData.user.id;
    const sampleSurveys = [
      {
        title: "Хэрэглэгчийн сэтгэл ханамж",
        description: "Манай үйлчилгээний талаар таны санаа бодол",
        questions: [
          { type: "rating", label: "Үйлчилгээг хэр үнэлэх вэ?", options: [] },
          { type: "single", label: "Дахин ашиглах уу?", options: ["Тийм", "Үгүй", "Магадгүй"] },
          { type: "text", label: "Нэмэлт санал", options: [] },
        ],
      },
      {
        title: "Брэндийн судалгаа 2026",
        description: "Хэрэглэгчдийн мэдрэмж, brand awareness",
        questions: [
          { type: "single", label: "Та манай брэндийг хэрхэн мэдсэн бэ?", options: ["Зар", "Найз", "Сошиал", "Бусад"] },
          { type: "multi", label: "Аль сувгуудыг ашигладаг вэ?", options: ["Facebook", "Instagram", "TikTok", "YouTube"] },
        ],
      },
      {
        title: "Бүтээгдэхүүний санал хүсэлт",
        description: "Шинэ функцэд санал авах",
        questions: [
          { type: "rating", label: "Одоогийн UI хэр таалагдаж байна?", options: [] },
          { type: "text", label: "Ямар функц нэмэх хүсэлтэй вэ?", options: [] },
        ],
      },
      {
        title: "Ажилтны идэвх",
        description: "Дотоод судалгаа",
        questions: [
          { type: "rating", label: "Ажлын орчин үнэлгээ", options: [] },
          { type: "single", label: "Ахисан түвшний сургалт хүсэх үү?", options: ["Тийм", "Үгүй"] },
        ],
      },
      {
        title: "Маркетингийн сувгийн судалгаа",
        description: "Аль суваг үр дүнтэй вэ?",
        questions: [
          { type: "multi", label: "Сүүлийн сард ашигласан суваг", options: ["Email", "SMS", "Push", "App"] },
          { type: "rating", label: "Контентын чанар", options: [] },
        ],
      },
    ];

    const seededSurveys: string[] = [];
    for (const sv of sampleSurveys) {
      const { data: survey, error: sErr } = await supabase
        .from("surveys")
        .insert({ title: sv.title, description: sv.description, owner_id: adminId, is_published: true })
        .select("id")
        .single();
      if (sErr || !survey) continue;
      seededSurveys.push(survey.id);
      const qRows = sv.questions.map((q, i) => ({
        survey_id: survey.id,
        type: q.type,
        label: q.label,
        options: q.options,
        position: i,
      }));
      await supabase.from("questions").insert(qRows);
    }

    return new Response(JSON.stringify({ users: created, surveys: seededSurveys.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});