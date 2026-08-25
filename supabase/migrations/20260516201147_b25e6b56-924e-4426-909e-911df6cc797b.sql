
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  instagram TEXT,
  faturamento_quiz TEXT,
  tamanho_time_quiz TEXT,
  faturamento_lead TEXT,
  colaboradores_lead TEXT,
  resposta_1 INT,
  resposta_2 INT,
  resposta_3 INT,
  resposta_4 INT,
  resposta_5 INT,
  resposta_6 INT,
  resposta_7 INT,
  pontuacao_total INT,
  nivel_classificado INT,
  nome_perfil TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  fbclid TEXT,
  gclid TEXT,
  user_agent TEXT,
  referrer TEXT
);

CREATE TABLE public.cta_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  cta_type TEXT NOT NULL
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cta_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_insert_leads" ON public.leads
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "anyone_can_insert_cta_clicks" ON public.cta_clicks
  FOR INSERT TO anon, authenticated WITH CHECK (true);
