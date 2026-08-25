import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { Check, ArrowRight, Sparkles, ArrowLeft, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { captureTracking, getTracking } from "@/lib/tracking";
import { fbqTrack } from "@/lib/fpixel";
import { appendLeadToSheet } from "@/lib/sheets.functions";
import { DotmCircular3 } from "@/components/ui/dotm-circular-3";

import heroImage from "@/assets/natal-hero.webp";
import portraitImage from "@/assets/natal-portrait.webp";

type Option = { letter: string; label: string; points: number };
type QuizAnswers = Record<string, number>;
type ContextAnswers = { revenue?: string; team?: string };

const fade = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
};

const QUESTIONS: { id: string; title: string; options: Option[] }[] = [
  {
    id: "q1",
    title: "Quando surge um problema na sua empresa, o que acontece?",
    options: [
      { letter: "A", label: "Só eu consigo resolver de fato", points: 1 },
      { letter: "B", label: "Eu resolvo, mas já tentei delegar algumas vezes", points: 2 },
      {
        letter: "C",
        label: "Meus gerentes resolvem os operacionais, eu pego os grandes",
        points: 3,
      },
      { letter: "D", label: "Minha liderança resolve quase tudo sem precisar de mim", points: 4 },
      {
        letter: "E",
        label: "Meus líderes formam outros líderes que resolvem antes de chegar em mim",
        points: 5,
      },
    ],
  },
  {
    id: "q2",
    title: "Quantos dias seguidos sua empresa funcionaria bem sem você?",
    options: [
      { letter: "A", label: "Menos de 3 dias", points: 1 },
      { letter: "B", label: "Até 1 semana", points: 2 },
      { letter: "C", label: "Cerca de 15 dias", points: 3 },
      { letter: "D", label: "30 dias ou mais, tranquilamente", points: 4 },
      { letter: "E", label: "Indefinidamente, ela não depende da minha presença", points: 5 },
    ],
  },
  {
    id: "q3",
    title: "Como você toma decisões estratégicas?",
    options: [
      { letter: "A", label: "Sozinho, no impulso, conforme o dia exige", points: 1 },
      { letter: "B", label: "Sozinho, mas tento planejar com antecedência", points: 2 },
      { letter: "C", label: "Com base em dados e reuniões com sócios ou gerentes", points: 3 },
      { letter: "D", label: "Junto com minha liderança, baseado em metas claras", points: 4 },
      {
        letter: "E",
        label: "Tenho um sistema de gestão que pauta decisões com clareza estratégica",
        points: 5,
      },
    ],
  },
  {
    id: "q4",
    title: "Sobre contratações na sua empresa",
    options: [
      { letter: "A", label: "Contrato quem aparece, preciso de gente pra ajudar logo", points: 1 },
      { letter: "B", label: "Tenho dificuldade em achar bons profissionais", points: 2 },
      { letter: "C", label: "Já tenho um processo, mas erro mais do que gostaria", points: 3 },
      { letter: "D", label: "Contrato bem, mas demoro a desenvolver as pessoas", points: 4 },
      { letter: "E", label: "Tenho um filtro claro e formo líderes internamente", points: 5 },
    ],
  },
  {
    id: "q5",
    title: "Como você se sente em relação ao seu negócio hoje?",
    options: [
      { letter: "A", label: "Exausto, sinto que carrego tudo sozinho", points: 1 },
      { letter: "B", label: "Cansado, mas começando a montar um time", points: 2 },
      { letter: "C", label: "Mais aliviado, mas ainda sou o cérebro da operação", points: 3 },
      { letter: "D", label: "Confiante, meu papel é estratégia", points: 4 },
      {
        letter: "E",
        label: "Realizado, minha empresa funciona melhor quando estou ausente",
        points: 5,
      },
    ],
  },
  {
    id: "q6",
    title: "Seu time toma iniciativa sem te consultar?",
    options: [
      { letter: "A", label: "Nunca, tudo passa por mim", points: 1 },
      { letter: "B", label: "Raramente, só em coisas pequenas", points: 2 },
      { letter: "C", label: "Em coisas operacionais sim, estratégicas não", points: 3 },
      { letter: "D", label: "Sim, dentro de regras claras", points: 4 },
      {
        letter: "E",
        label: "Sim, e ainda tomam decisões melhores que as minhas em várias áreas",
        points: 5,
      },
    ],
  },
  {
    id: "q7",
    title: "Qual frase mais combina com você hoje?",
    options: [
      { letter: "A", label: "Se eu parar, a empresa quebra", points: 1 },
      { letter: "B", label: "Tô tentando sair da operação, mas é difícil", points: 2 },
      {
        letter: "C",
        label: "Já saí da operação, mas ainda sou o gargalo da estratégia",
        points: 3,
      },
      { letter: "D", label: "Tenho uma liderança forte, falta dar o salto final", points: 4 },
      { letter: "E", label: "Minha empresa é autogerenciável e eu sou livre", points: 5 },
    ],
  },
];

const REVENUE_OPTS = [
  "Até R$ 50 mil",
  "R$ 50 a R$ 200 mil",
  "R$ 200 a R$ 500 mil",
  "R$ 500 mil a R$ 1 milhão",
  "Acima de R$ 1 milhão",
];
const TEAM_OPTS = ["Só eu", "2 a 5", "6 a 15", "16 a 50", "Mais de 50"];

type Screen =
  | { kind: "intro" }
  | { kind: "context"; field: "revenue" | "team"; title: string; options: string[] }
  | { kind: "transition"; key: string }
  | { kind: "question"; index: number }
  | { kind: "lead" }
  | { kind: "result" };

const SCREENS: Screen[] = [
  { kind: "intro" },
  {
    kind: "context",
    field: "revenue",
    title: "Qual o faturamento mensal da sua empresa hoje?",
    options: REVENUE_OPTS,
  },
  { kind: "transition", key: "t1" },
  {
    kind: "context",
    field: "team",
    title: "Quantas pessoas trabalham com você hoje?",
    options: TEAM_OPTS,
  },
  { kind: "transition", key: "t2" },
  { kind: "question", index: 0 },
  { kind: "transition", key: "t3" },
  { kind: "question", index: 1 },
  { kind: "transition", key: "t4" },
  { kind: "question", index: 2 },
  { kind: "transition", key: "t5" },
  { kind: "question", index: 3 },
  { kind: "transition", key: "t6" },
  { kind: "question", index: 4 },
  { kind: "transition", key: "t7" },
  { kind: "question", index: 5 },
  { kind: "transition", key: "t8" },
  { kind: "question", index: 6 },
  { kind: "transition", key: "t9" },
  { kind: "lead" },
  { kind: "result" },
];

const TOTAL_QUESTION_STEPS = 9;

export type LeadData = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  instagram?: string;
  faturamento_lead?: string;
  colaboradores_lead?: string;
};

export function Quiz() {
  const [step, setStep] = useState(0);
  const [context, setContext] = useState<ContextAnswers>({});
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [lead, setLead] = useState<LeadData | null>(null);

  useEffect(() => {
    captureTracking();
  }, []);

  const screen = SCREENS[step];

  const questionStepNumber = useMemo(() => {
    let n = 0;
    if (context.revenue) n++;
    if (context.team) n++;
    n += Object.keys(answers).length;
    return n;
  }, [context, answers]);

  const next = () => setStep((s) => Math.min(s + 1, SCREENS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const currentStepLabel = Math.min(
    questionStepNumber + (screen.kind === "question" || screen.kind === "context" ? 1 : 0),
    TOTAL_QUESTION_STEPS,
  );

  const showTopBar = screen.kind !== "intro" && screen.kind !== "result";

  return (
    <div
      className={`min-h-screen ${screen.kind === "intro" ? "bg-lines" : "bg-quiz-stage"} text-foreground`}
    >
      {showTopBar && (
        <div className="fixed top-0 left-0 right-0 z-40 backdrop-blur-2xl bg-background/78 border-b border-white/[0.06] shadow-[0_16px_50px_-34px_rgba(0,0,0,.9)]">
          {/* Gold ribbon */}
          <div
            className="bg-gold-gradient text-primary-foreground text-center text-[11px] sm:text-xs font-bold uppercase py-2 px-4"
            style={{ letterSpacing: "2px" }}
          >
            Diagnóstico Gratuito · Perfil de Líder
          </div>
          {/* Step row */}
          <div className="max-w-2xl mx-auto px-4 sm:px-5 pt-3 pb-2 grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <button
              onClick={back}
              disabled={step === 0}
              className="inline-flex items-center gap-1 text-foreground/85 text-[13px] sm:text-sm hover:text-gold transition-colors disabled:opacity-30 disabled:hover:text-foreground/85"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <p className="text-center text-[13px] sm:text-sm text-foreground/90 tabular-nums">
              Pergunta <span className="text-gold font-semibold">{currentStepLabel}</span> de{" "}
              {TOTAL_QUESTION_STEPS}
            </p>
            <span className="w-[60px]" aria-hidden />
          </div>
          <div className="max-w-2xl mx-auto px-4 sm:px-5 pb-2">
            <ProgressBar value={(questionStepNumber / TOTAL_QUESTION_STEPS) * 100} />
          </div>
          {/* Rotating social proof */}
          <div className="bg-petrol-deep/70 border-t border-border/40">
            <div className="max-w-2xl mx-auto px-4 sm:px-5 py-2">
              <RotatingProof />
            </div>
          </div>
        </div>
      )}

      {screen.kind === "intro" ? (
        <AnimatePresence mode="wait">
          <Intro key="intro" onStart={next} />
        </AnimatePresence>
      ) : (
        <div
          className={`px-4 sm:px-5 ${screen.kind === "result" ? "pt-10 pb-16 max-w-3xl" : "pt-[150px] sm:pt-[156px] pb-4 max-w-2xl min-h-[100dvh] flex flex-col"} mx-auto w-full`}
        >
          <AnimatePresence mode="wait">
            {screen.kind === "context" && (
              <ContextScreen
                key={`ctx-${screen.field}`}
                title={screen.title}
                options={screen.options}
                onSelect={(v) => {
                  setContext((c) => ({ ...c, [screen.field]: v }));
                  next();
                }}
              />
            )}

            {screen.kind === "transition" && (
              <Transition
                key={screen.key}
                tkey={screen.key}
                answers={answers}
                context={context}
                onContinue={next}
              />
            )}

            {screen.kind === "question" && (
              <QuestionScreen
                key={`q-${screen.index}`}
                q={QUESTIONS[screen.index]}
                onAnswer={(pts) => {
                  setAnswers((a) => ({ ...a, [QUESTIONS[screen.index].id]: pts }));
                  next();
                }}
              />
            )}

            {screen.kind === "lead" && (
              <LeadScreen
                key="lead"
                context={context}
                answers={answers}
                onSubmit={(l) => {
                  setLead(l);
                  next();
                }}
              />
            )}

            {screen.kind === "result" && lead && (
              <Result key="result" answers={answers} context={context} lead={lead} />
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-[2px] w-full bg-border/30">
      <motion.div
        className="h-full bg-gold-gradient"
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    </div>
  );
}

/* ===================== INTRO (NEW) ===================== */
function Intro({ onStart }: { onStart: () => void }) {
  return (
    <section className="relative h-screen h-[100dvh] w-full overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Natal Pinto, mentor de empresários, em ambiente sofisticado"
          className="w-full h-full object-cover object-[78%_center] md:object-right"
        />
        {/* Mobile overlay: heavier */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background md:bg-gradient-to-r md:from-background md:via-background/85 md:to-background/30" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full items-center px-6 py-6 sm:px-10 sm:py-8 md:px-16 lg:px-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-[610px] text-center md:mx-0 md:text-left"
        >
          <p
            className="mb-[clamp(10px,2vh,18px)] font-semibold uppercase text-gold"
            style={{ letterSpacing: "3px", fontSize: "clamp(11px, 1vw, 13px)" }}
          >
            Método Líder Nível 5
          </p>

          <h1
            className="mb-[clamp(14px,2.4vh,24px)] font-display font-semibold leading-[1.04] text-foreground"
            style={{ fontSize: "clamp(30px, min(4.25vw, 6.7vh), 58px)" }}
          >
            Descubra qual dos <span className="text-gold">5 perfis de liderança</span> está travando
            a escala da sua empresa
          </h1>

          <p
            className="mx-auto mb-[clamp(18px,3.5vh,34px)] max-w-[560px] leading-relaxed text-foreground/80 md:mx-0"
            style={{ fontSize: "clamp(14px, min(1.25vw, 2.2vh), 18px)" }}
          >
            Receba uma análise personalizada do seu perfil e os próximos passos para chegar ao Nível
            5.
          </p>

          <motion.button
            whileHover={{ y: -2, boxShadow: "0 16px 50px -10px rgba(242, 229, 140, 0.4)" }}
            whileTap={{ scale: 0.98 }}
            onClick={onStart}
            className="inline-flex max-w-full items-center justify-center rounded-xl bg-gold-gradient px-5 text-center text-[11px] font-bold uppercase leading-tight text-primary-foreground shadow-gold transition sm:px-7 sm:text-[13px]"
            style={{
              letterSpacing: "1.5px",
              minHeight: "clamp(50px, 7vh, 58px)",
            }}
          >
            Iniciar meu diagnóstico agora
          </motion.button>

          <p className="mt-[clamp(10px,2vh,18px)] text-center text-[11px] leading-relaxed text-muted-foreground sm:text-xs md:text-left">
            Leva menos de 2 minutos.
            <br />
            Resultado entregue na hora, sem custo.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

/* ===================== CONTEXT ===================== */
function ContextScreen({
  title,
  options,
  onSelect,
}: {
  title: string;
  options: string[];
  onSelect: (v: string) => void;
}) {
  return (
    <motion.section {...fade} className="flex flex-1 flex-col justify-center py-5 sm:py-7">
      <div className="surface-premium mx-auto w-full max-w-xl rounded-[20px] px-4 py-6 sm:px-6 sm:py-7">
        <h2 className="mx-auto mb-6 max-w-[460px] text-balance text-center font-display text-[23px] font-medium leading-[1.25] sm:text-[27px]">
          {title}
        </h2>
        <div className="space-y-2.5">
          {options.map((opt, i) => (
            <OptionCard key={opt} index={i} onClick={() => onSelect(opt)}>
              {opt}
            </OptionCard>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function QuestionScreen({
  q,
  onAnswer,
}: {
  q: (typeof QUESTIONS)[number];
  onAnswer: (pts: number) => void;
}) {
  return (
    <motion.section {...fade} className="flex flex-1 flex-col justify-center py-5 sm:py-7">
      <div className="surface-premium mx-auto w-full max-w-xl rounded-[20px] px-4 py-6 sm:px-6 sm:py-7">
        <h2 className="mx-auto mb-6 max-w-[470px] text-balance text-center font-display text-[23px] font-medium leading-[1.25] sm:text-[27px]">
          {q.title}
        </h2>
        <div className="space-y-2.5">
          {q.options.map((opt, i) => (
            <OptionCard
              key={opt.letter}
              index={i}
              letter={opt.letter}
              onClick={() => onAnswer(opt.points)}
            >
              {opt.label}
            </OptionCard>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function OptionCard({
  children,
  letter,
  index,
  onClick,
}: {
  children: React.ReactNode;
  letter?: string;
  index: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.06, duration: 0.35 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="group flex min-h-[52px] w-full items-center gap-3 rounded-xl border border-white/[0.075] bg-white/[0.035] px-4 py-2.5 text-left shadow-[0_10px_30px_-24px_rgba(0,0,0,.95)] transition-all duration-300 hover:border-gold/45 hover:bg-white/[0.065]"
    >
      {letter && (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-background/35 text-[11px] font-bold text-muted-foreground transition-all group-hover:border-gold/55 group-hover:text-gold">
          {letter}
        </span>
      )}
      <span className="flex-1 text-pretty text-[15px] leading-snug text-foreground/90 sm:text-base">
        {children}
      </span>
      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-gold transition-colors" />
    </motion.button>
  );
}

/* ===================== TRANSITIONS (unchanged) ===================== */
function Transition({
  tkey,
  answers,
  context,
  onContinue,
}: {
  tkey: string;
  answers: QuizAnswers;
  context: ContextAnswers;
  onContinue: () => void;
}) {
  switch (tkey) {
    case "t1":
      return (
        <AnalyzingScreen
          duration={1000}
          text="Você está entre os empresários que faturam nessa faixa no Brasil. Nessa fase, a maioria enfrenta o mesmo gargalo: o dono ainda é o motor principal da operação."
          onContinue={onContinue}
        />
      );
    case "t2":
      return <CentralizationScreen onContinue={onContinue} />;
    case "t3": {
      const a = answers["q1"] ?? 3;
      const text =
        a <= 2
          ? "Você acabou de dizer que problemas voltam pra sua mesa.\n\nEmpresários nessa situação trabalham, em média, 62 horas por semana e ainda assim sentem que nada anda sem eles.\n\nIsso não é falta de esforço, é falta de estrutura."
          : "Você já delega bem a operação. Apenas 18% dos empresários chegam nesse estágio. Mas atenção: aqui começa o gargalo invisível, quando o dono vira o gargalo estratégico, não mais operacional.";
      return <MirrorScreen text={text} onContinue={onContinue} />;
    }
    case "t4":
      return <ProfileBuildScreen answers={answers} stage={1} onContinue={onContinue} />;
    case "t5":
      return <AuthorityScreen onContinue={onContinue} />;
    case "t6": {
      const a = answers["q4"] ?? 3;
      const text =
        a <= 2
          ? "Você contrata pra tapar buraco. 73% das contratações feitas em modo de urgência são desligadas em menos de 6 meses. O custo médio de cada erro é de 3 a 5 salários do cargo. A boa notícia: existe um filtro que reduz esse erro em 80%."
          : "Você já tem método de contratação. Apenas 12% dos empresários têm um processo replicável. Mas processo bom não basta, o segredo está em quem você forma depois de contratar.";
      return <MirrorScreen text={text} onContinue={onContinue} />;
    }
    case "t7":
      return <EmotionalPauseScreen onContinue={onContinue} />;
    case "t8":
      return <ProfileBuildScreen answers={answers} stage={2} onContinue={onContinue} />;
    case "t9":
      return <FinalProcessingScreen onContinue={onContinue} />;
    default:
      void context;
      return null;
  }
}

function AnalyzingScreen({
  duration,
  text,
  onContinue,
}: {
  duration: number;
  text: string;
  onContinue: () => void;
}) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDone(true), duration);
    return () => clearTimeout(t);
  }, [duration]);

  return (
    <motion.section {...fade} className="pt-10 min-h-[60vh] flex flex-col justify-center">
      <AnimatePresence mode="wait">
        {!done ? (
          <motion.div key="loading" {...fade} className="text-center">
            <DotMatrixLoader label="Analisando respostas" />
            <p className="mt-6 text-muted-foreground tracking-wide">Analisando...</p>
          </motion.div>
        ) : (
          <motion.div key="text" {...fade} className="text-center max-w-xl mx-auto">
            <Paragraphs
              text={text}
              className="font-display text-xl sm:text-2xl leading-relaxed text-foreground/95"
            />
            <DelayedReveal className="mt-10 flex justify-center">
              <PrimaryButton onClick={onContinue}>Continuar</PrimaryButton>
            </DelayedReveal>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function CentralizationScreen({ onContinue }: { onContinue: () => void }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setPhase(1), 1700);
    return () => clearTimeout(t);
  }, []);
  return (
    <motion.section {...fade} className="pt-10 min-h-[60vh] flex flex-col justify-center">
      {phase === 0 ? (
        <div className="max-w-md mx-auto w-full text-center">
          <DotMatrixLoader label="Calculando centralização" size="compact" />
          <p className="text-muted-foreground mb-4 text-sm uppercase tracking-[0.2em]">
            Calculando
          </p>
          <p className="font-display text-lg sm:text-xl mb-6 text-foreground/90">
            Calculando o índice de centralização da sua operação
          </p>
          <div className="h-1.5 bg-border/40 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gold-gradient"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
          </div>
        </div>
      ) : (
        <motion.div {...fade} className="text-center max-w-xl mx-auto">
          <div className="font-display text-[20px] sm:text-2xl leading-relaxed text-balance space-y-4">
            <p>Pronto.</p>
            <p>Agora vamos descobrir se você lidera esse time ou se carrega ele nas costas.</p>
          </div>
          <DelayedReveal className="mt-10 flex justify-center">
            <PrimaryButton onClick={onContinue}>Próxima pergunta</PrimaryButton>
          </DelayedReveal>
        </motion.div>
      )}
    </motion.section>
  );
}

function MirrorScreen({ text, onContinue }: { text: string; onContinue: () => void }) {
  return (
    <motion.section {...fade} className="pt-10 min-h-[60vh] flex flex-col justify-center">
      <div className="max-w-xl mx-auto">
        <div className="h-px w-12 bg-gold mb-6" />
        <Paragraphs
          text={text}
          className="font-display text-xl sm:text-2xl leading-relaxed text-foreground/95"
        />
        <div className="mt-10">
          <PrimaryButton onClick={onContinue}>Continuar</PrimaryButton>
        </div>
      </div>
    </motion.section>
  );
}

function ProfileBuildScreen({
  answers,
  stage,
  onContinue,
}: {
  answers: QuizAnswers;
  stage: 1 | 2;
  onContinue: () => void;
}) {
  const q1 = answers["q1"] ?? 3;
  const q2 = answers["q2"] ?? 3;
  const q3 = answers["q3"];
  const q4 = answers["q4"];
  const q5 = answers["q5"];
  const q6 = answers["q6"];

  const dependence = Math.round(((6 - (q1 + q2) / 2) / 5) * 100);
  const autonomy = Math.round(((q1 + q2) / 2 / 5) * 100);
  const strategy = q3 || q5 ? Math.round((((q3 ?? 3) + (q5 ?? 3)) / 2 / 5) * 100) : null;
  const leadership = q4 || q6 ? Math.round((((q4 ?? 3) + (q6 ?? 3)) / 2 / 5) * 100) : null;

  const bars: { label: string; value: number | null }[] = [
    { label: "Dependência operacional", value: dependence },
    { label: "Autonomia do time", value: autonomy },
    { label: "Clareza estratégica", value: stage === 2 ? strategy : null },
  ];
  if (stage === 2) bars.push({ label: "Formação de líderes", value: leadership });

  return (
    <motion.section {...fade} className="pt-6">
      <h2 className="font-display text-2xl sm:text-3xl font-medium mb-2">
        Seu Perfil de Líder está sendo construído
      </h2>
      <p className="text-muted-foreground text-sm mb-8">
        {stage === 1
          ? "Faltam 5 perguntas para revelar seu nível"
          : "Última pergunta pra revelar seu nível"}
      </p>

      <div className="space-y-7 surface-premium rounded-[22px] p-6 sm:p-8">
        {bars.map((b, i) => (
          <Bar key={b.label} label={b.label} value={b.value} delay={i * 0.15} />
        ))}
      </div>

      <DelayedReveal className="mt-10 flex justify-center">
        <PrimaryButton onClick={onContinue}>Continuar</PrimaryButton>
      </DelayedReveal>
    </motion.section>
  );
}

function Bar({ label, value, delay }: { label: string; value: number | null; delay: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2 text-sm">
        <span className="text-foreground/90">{label}</span>
        {value === null ? (
          <span className="text-muted-foreground italic text-xs">em análise</span>
        ) : (
          <motion.span
            className="text-gold tabular-nums font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.6 }}
          >
            {value}%
          </motion.span>
        )}
      </div>
      <div className="h-2 rounded-full bg-border/40 overflow-hidden">
        {value === null ? (
          <motion.div
            className="h-full w-1/3 bg-muted-foreground/30"
            animate={{ x: ["-50%", "200%"] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
          />
        ) : (
          <motion.div
            className="h-full bg-gold-gradient"
            initial={{ width: 0 }}
            animate={{ width: `${value}%` }}
            transition={{ duration: 1.1, delay, ease: "easeOut" }}
          />
        )}
      </div>
    </div>
  );
}

function AuthorityScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <motion.section {...fade} className="pt-6">
      <div className="grid sm:grid-cols-[140px_1fr] gap-7 items-center surface-premium rounded-[22px] p-6 sm:p-8">
        <div className="w-32 h-32 sm:w-[140px] sm:h-[140px] rounded-2xl overflow-hidden border border-gold/30 mx-auto sm:mx-0">
          <img
            src={portraitImage}
            alt="Natal Pinto"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold mb-2">Sabia disso?</p>
          <div className="font-display text-lg sm:text-xl leading-relaxed space-y-4">
            <p>
              O <span className="text-champagne font-medium">Natal Pinto</span>, ex-coordenador de{" "}
              <span className="text-foreground">Ambev, Coca-Cola e Nestlé</span>, identificou que
              toda empresa autogerenciável passa pelos mesmos 5 níveis de liderança.
            </p>
            <p>Você está prestes a descobrir em qual deles está.</p>
          </div>
        </div>
      </div>
      <div className="mt-10 flex justify-center">
        <PrimaryButton onClick={onContinue}>Próxima pergunta</PrimaryButton>
      </div>
    </motion.section>
  );
}

function EmotionalPauseScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <motion.section
      {...fade}
      className="pt-10 min-h-[70vh] flex flex-col justify-center bg-petrol-deep/60 -mx-5 px-5 rounded-2xl"
    >
      <div className="max-w-xl mx-auto text-center">
        <p className="text-gold text-xs uppercase tracking-[0.3em] mb-6">Uma pausa</p>
        <div className="font-display text-[20px] sm:text-2xl leading-snug text-foreground/95 space-y-5 text-balance">
          <p>Vamos pausar 5 segundos.</p>
          <p>
            Empresários que respondem como você costumam carregar uma sensação que pouca gente fala
            em público, a de estar{" "}
            <span className="text-champagne italic">preso ao próprio sonho</span>.
          </p>
          <p>Isso tem nome e tem solução estruturada.</p>
        </div>
        <div className="mt-10">
          <PrimaryButton onClick={onContinue}>Continuar</PrimaryButton>
        </div>
      </div>
    </motion.section>
  );
}

function FinalProcessingScreen({ onContinue }: { onContinue: () => void }) {
  const items = [
    "Padrão de decisão identificado",
    "Nível de centralização calculado",
    "Perfil de liderança definido",
    "Gerando seu diagnóstico personalizado",
  ];
  const [checked, setChecked] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setChecked((c) => (c < items.length ? c + 1 : c));
    }, 500);
    return () => clearInterval(id);
  }, [items.length]);

  const allDone = checked >= items.length;

  return (
    <motion.section {...fade} className="pt-10 min-h-[60vh] flex flex-col justify-center">
      <div className="max-w-md mx-auto w-full">
        {!allDone && (
          <div className="mb-6 flex justify-center">
            <DotMatrixLoader label="Processando diagnóstico" size="compact" />
          </div>
        )}
        <p className="text-[15px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] text-gold mb-6 text-center font-semibold leading-snug">
          <span className="sm:hidden">
            Cruzando suas respostas
            <br />
            com o método N5
          </span>
          <span className="hidden sm:inline">Cruzando suas respostas com o método N5</span>
        </p>
        <ul className="space-y-4">
          {items.map((item, i) => (
            <li key={item} className="flex items-center gap-3">
              <span
                className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                  i < checked ? "bg-gold border-gold text-primary-foreground" : "border-border"
                }`}
              >
                {i < checked ? (
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                ) : (
                  <motion.span
                    className="w-2 h-2 rounded-full bg-muted-foreground/50"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  />
                )}
              </span>
              <span
                className={`text-sm transition-colors ${i < checked ? "text-foreground" : "text-muted-foreground"}`}
              >
                {item}
              </span>
            </li>
          ))}
        </ul>
        {allDone && (
          <DelayedReveal className="mt-10 flex justify-center">
            <PrimaryButton onClick={onContinue}>Ver meu diagnóstico</PrimaryButton>
          </DelayedReveal>
        )}
      </div>
    </motion.section>
  );
}

/* ===================== LEAD (expanded) ===================== */
function computeLevel(answers: QuizAnswers): { level: number; name: string; score: number } {
  const total = Object.values(answers).reduce((a, b) => a + b, 0);
  const count = Math.max(Object.keys(answers).length, 1);
  const avg = total / count;
  const level = Math.min(5, Math.max(1, Math.round(avg)));
  const names = [
    "Operador-Refém",
    "Líder-Apagador",
    "Líder-Gestor",
    "Líder de Líderes",
    "Líder Nível 5",
  ];
  return { level, name: names[level - 1], score: total };
}

function formatPhoneBR(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function LeadScreen({
  context,
  answers,
  onSubmit,
}: {
  context: ContextAnswers;
  answers: QuizAnswers;
  onSubmit: (l: LeadData) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = "Informe seu nome completo";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "E-mail inválido";
    if (phone.replace(/\D/g, "").length < 10) e.phone = "WhatsApp inválido";
    return e;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    setSubmitting(true);
    const instagramClean = instagram.trim().replace(/^@/, "");
    const { level, name: nivelNome, score } = computeLevel(answers);
    const tracking = getTracking();

    const leadIdGenerated =
      typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : undefined;

    const payload = {
      ...(leadIdGenerated ? { id: leadIdGenerated } : {}),
      nome: name.trim(),
      email: email.trim().toLowerCase(),
      whatsapp: phone.trim(),
      instagram: instagramClean || null,
      faturamento_quiz: context.revenue ?? null,
      tamanho_time_quiz: context.team ?? null,
      faturamento_lead: context.revenue ?? null,
      colaboradores_lead: context.team ?? null,
      resposta_1: answers["q1"] ?? null,
      resposta_2: answers["q2"] ?? null,
      resposta_3: answers["q3"] ?? null,
      resposta_4: answers["q4"] ?? null,
      resposta_5: answers["q5"] ?? null,
      resposta_6: answers["q6"] ?? null,
      resposta_7: answers["q7"] ?? null,
      pontuacao_total: score,
      nivel_classificado: level,
      nome_perfil: nivelNome,
      ...tracking,
    };

    let leadId: string | undefined = leadIdGenerated;
    try {
      // Note: leads denies SELECT to anon, so we must NOT use .select() here —
      // a RETURNING clause would fail and roll back the whole insert.
      const { error } = await supabase.from("leads").insert(payload);
      if (error) {
        console.warn("Lead insert error:", error.message);
        leadId = undefined;
      }
    } catch (err) {
      console.warn("Lead insert exception:", err);
      leadId = undefined;
    }

    try {
      localStorage.setItem(
        "n5_lead",
        JSON.stringify({ name: payload.nome, email: payload.email, id: leadId }),
      );
    } catch {
      // ignore
    }

    setSubmitting(false);
    fbqTrack("Lead", {
      content_name: "Quiz N5 - Lead",
      content_category: "quiz_lead",
    });

    // Fire-and-forget: append lead to Google Sheets
    appendLeadToSheet({
      data: {
        nome: payload.nome,
        email: payload.email,
        whatsapp: payload.whatsapp,
        instagram: instagramClean || null,
        faturamento_lead: context.revenue ?? null,
        colaboradores_lead: context.team ?? null,
        faturamento_quiz: context.revenue ?? null,
        tamanho_time_quiz: context.team ?? null,
        resposta_1: answers["q1"] ?? null,
        resposta_2: answers["q2"] ?? null,
        resposta_3: answers["q3"] ?? null,
        resposta_4: answers["q4"] ?? null,
        resposta_5: answers["q5"] ?? null,
        resposta_6: answers["q6"] ?? null,
        resposta_7: answers["q7"] ?? null,
        pontuacao_total: score,
        nivel_classificado: level,
        utm_source: tracking.utm_source ?? null,
        utm_medium: tracking.utm_medium ?? null,
        utm_campaign: tracking.utm_campaign ?? null,
        utm_content: tracking.utm_content ?? null,
        utm_term: tracking.utm_term ?? null,
      },
    }).catch((err) => console.warn("Sheets append exception:", err));
    onSubmit({
      id: leadId,
      name: payload.nome,
      email: payload.email,
      phone: payload.whatsapp,
      instagram: instagramClean,
      faturamento_lead: context.revenue,
      colaboradores_lead: context.team,
    });
  };

  return (
    <motion.section {...fade} className="pt-6">
      <div className="text-center mb-8">
        <Sparkles className="w-6 h-6 text-gold mx-auto mb-3" />
        <h2 className="font-display text-2xl sm:text-3xl font-medium leading-tight">
          Seu diagnóstico está pronto
        </h2>
        <p className="text-muted-foreground mt-3 text-sm sm:text-base max-w-lg mx-auto">
          Preencha os dados abaixo para receber sua análise personalizada e o convite para o próximo
          passo.
        </p>
      </div>

      <form onSubmit={submit} className="surface-premium rounded-[22px] p-5 sm:p-8 space-y-8">
        {/* Seção 1 */}
        <div>
          <p className="text-gold text-[11px] uppercase tracking-[0.25em] font-semibold mb-5">
            Dados de contato
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <LeadField
              label="Nome completo"
              value={name}
              onChange={setName}
              error={errors.name}
              placeholder="Seu nome"
            />
            <LeadField
              label="E-mail"
              type="email"
              value={email}
              onChange={setEmail}
              error={errors.email}
              placeholder="voce@empresa.com"
            />
            <LeadField
              label="WhatsApp"
              type="tel"
              value={phone}
              onChange={(v) => setPhone(formatPhoneBR(v))}
              error={errors.phone}
              placeholder="(11) 90000-0000"
            />
            <LeadField
              label="Instagram (opcional)"
              value={instagram}
              onChange={setInstagram}
              prefix="@"
              placeholder="seu_usuario"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center bg-gold-gradient text-primary-foreground font-bold uppercase rounded-lg transition shadow-gold hover:brightness-105 active:brightness-95 disabled:opacity-60"
            style={{ letterSpacing: "1.5px", minHeight: "64px", fontSize: "15px" }}
          >
            {submitting ? (
              <span className="inline-flex items-center gap-3">
                <DotmCircular3
                  size={22}
                  dotSize={3}
                  speed={1.8}
                  color="currentColor"
                  ariaLabel="Enviando formulário"
                />
                Enviando...
              </span>
            ) : (
              "Liberar minha análise completa"
            )}
          </button>
          <p className="text-[12px] text-muted-foreground text-center mt-3">
            Seus dados estão protegidos. Não enviamos spam.
          </p>
        </div>
      </form>
    </motion.section>
  );
}

function LeadField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  prefix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
  prefix?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[12px] font-semibold uppercase tracking-[0.15em] text-gold mb-2">
        {label}
      </span>
      <div
        className={`flex items-stretch rounded-xl bg-background/55 border shadow-inner transition-all ${
          error
            ? "border-destructive/60"
            : "border-border/80 hover:border-border focus-within:border-gold/60 focus-within:ring-4 focus-within:ring-gold/10"
        }`}
      >
        {prefix && (
          <span className="flex items-center px-3 text-muted-foreground text-base border-r border-gold/20">
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none px-4 text-foreground placeholder:text-muted-foreground/50"
          style={{ minHeight: "52px", fontSize: "16px" }}
          maxLength={150}
        />
      </div>
      {error && <p className="text-destructive text-[12px] mt-1.5">{error}</p>}
    </label>
  );
}

/* ===================== RESULT (full report) ===================== */
const LEVEL_DETAILS: Record<
  number,
  {
    name: string;
    operates: string[];
    gargalo: string[];
    conquistas: string[];
    tipDays: string;
    tipText: string;
  }
> = {
  1: {
    name: "O Bombeiro",
    operates: [
      "Você apaga incêndios o dia todo, raramente sobra tempo para pensar",
      "Decisões grandes e pequenas passam todas pela sua mesa",
      "Quando você viaja ou tira folga, a operação trava em alguns dias",
      "Você é o principal vendedor, operador e gestor ao mesmo tempo",
    ],
    gargalo: [
      "Falta de processos escritos e padronizados",
      "Time pequeno que ainda não foi treinado para decidir",
      "Sua agenda é refém das urgências, não das prioridades",
    ],
    conquistas: [
      "Você construiu uma empresa que existe e fatura",
      "Você conhece a operação como ninguém, esse é um ativo real",
      "Você já provou que tem coragem para empreender",
    ],
    tipDays: "esta semana",
    tipText:
      "Liste todas as decisões que passaram pela sua mesa nos últimos 7 dias. Marque com X as que só você poderia ter resolvido. Você vai descobrir que pelo menos 60% delas poderiam ter sido delegadas com o protocolo certo.\n\nNos 7 dias seguintes, escolha 3 dessas decisões e escreva o protocolo (passo a passo) que a próxima pessoa precisa seguir para resolver sozinha. Esse é o início da sua saída da operação.",
  },
  2: {
    name: "O Operador-Chefe",
    operates: [
      "Você já delegou tarefas, mas o time ainda volta com perguntas o tempo todo",
      "Você passa boa parte do dia tirando dúvidas e apagando pequenos incêndios",
      "Já fez algumas contratações, mas sente que o time não anda sozinho",
      "Tem uma rotina sufocante, com 12+ horas por dia trabalhando",
    ],
    gargalo: [
      "Falta de critérios claros para o time decidir sem você",
      "Contratações feitas por urgência, sem filtro estruturado",
      "Você delega tarefa, mas não delega responsabilidade",
    ],
    conquistas: [
      "Você já saiu do estágio inicial e tem uma operação rodando",
      "Já tem alguma estrutura de time montada",
      "Aprendeu a confiar em outras pessoas dentro do negócio",
    ],
    tipDays: "esta semana",
    tipText:
      "Escolha a pessoa do seu time que mais te interrompe com perguntas. Marque uma reunião de 30 minutos e crie com ela um documento chamado Critérios de Decisão. Defina exatamente o que ela pode decidir sozinha, o que precisa te avisar e o que precisa de aprovação.\n\nNos próximos 14 dias, sempre que ela te perguntar algo que está nesse documento, devolva a pergunta. Em 30 dias, replique o exercício com cada membro do time.",
  },
  3: {
    name: "O Gestor",
    operates: [
      "Você já tem gestores ou coordenadores que resolvem o operacional",
      "Sua semana é dividida entre reuniões estratégicas e resolver problemas que escalam",
      "Você é o principal cérebro estratégico, quem pensa o próximo passo é você",
      "A empresa funciona razoavelmente bem alguns dias sem você, mas a estratégia para",
    ],
    gargalo: [
      "Liderança que executa bem, mas ainda não pensa estrategicamente",
      "Você é o único ponto de decisão para movimentos novos",
      "Falta um ritual estruturado de gestão estratégica com o time",
    ],
    conquistas: [
      "Você já saiu da operação básica, isso só 18% dos empresários conseguem",
      "Tem um time com alguma autonomia operacional",
      "Construiu uma empresa com previsibilidade financeira mínima",
    ],
    tipDays: "esta semana",
    tipText:
      "Crie um ritual semanal de 90 minutos chamado Reunião de Decisão Estratégica. Convoque seus dois principais gestores. Apresente um problema da semana e exija que eles cheguem com a solução proposta, não com a pergunta.\n\nNa primeira reunião as soluções vão ser ruins, segure a tentação de resolver. Em 30 dias você verá uma mudança brutal na maturidade do time. Em 90 dias, eles começam a antecipar problemas e trazer soluções antes mesmo do ritual.",
  },
  4: {
    name: "O Estrategista",
    operates: [
      "Sua liderança decide bem sem você na maioria das situações",
      "Você atua majoritariamente em visão de longo prazo e novos movimentos",
      "Tem metas claras e indicadores compartilhados com a equipe",
      "A empresa segue funcionando bem por semanas sem sua presença diária",
    ],
    gargalo: [
      "Ainda falta um sistema formal de gestão que torne a empresa independente",
      "Você é referência única em algumas áreas estratégicas",
      "Falta dar o salto final de Líder para Construtor de Negócio",
    ],
    conquistas: [
      "Você já formou líderes que pensam, não só executam",
      "Tem uma empresa com cultura própria",
      "Está entre os 5-7% dos empresários do Brasil",
    ],
    tipDays: "nas próximas 2 semanas",
    tipText:
      "Identifique o seu líder mais maduro. Liste 3 decisões estratégicas que você tomou nos últimos 90 dias e que poderiam ter sido tomadas por ele. Marque uma conversa de 1 hora e pergunte: 'Como você teria decidido?'.\n\nO objetivo não é validar você, é entender se ele tem o critério para decidir sozinho. Se sim, nas próximas 2 semanas delegue formalmente uma dessas três decisões para ele. Esse é o início do seu salto para o Nível 5.",
  },
  5: {
    name: "O Construtor de Negócio",
    operates: [
      "Sua empresa é autogerenciável, funciona indefinidamente sem você",
      "Você atua majoritariamente em novos movimentos e proteção do ativo",
      "Tem sistema de gestão estruturado com indicadores e rituais consolidados",
      "Forma líderes que formam outros líderes",
    ],
    gargalo: [
      "Risco de acomodação, a empresa funciona sem você, mas pode parar de crescer",
      "Concentração de conhecimento estratégico ainda na sua cabeça",
      "Falta um plano de sucessão real e testado",
    ],
    conquistas: [
      "Você é parte dos 5% que chegam ao topo, pouquíssimos empresários atingem isso",
      "Construiu um ativo que vale por si só, independente da sua presença",
      "Tem liberdade real, de tempo, de geografia e de decisão",
    ],
    tipDays: "no próximo mês",
    tipText:
      "Pegue um dos seus líderes mais maduros e dê a ele um projeto de expansão que você nunca tentou, uma nova praça, uma nova linha de produto, um novo canal. Defina apenas o resultado esperado e o orçamento, não o método.\n\nDê a ele 60 a 90 dias e acompanhe semanalmente. Você vai descobrir duas coisas: se ele está pronto para puxar uma nova frente do negócio e se a sua empresa está pronta para escalar para o próximo patamar, virando um grupo, não só uma empresa.",
  },
};

function Result({
  answers,
  context,
  lead,
}: {
  answers: QuizAnswers;
  context: ContextAnswers;
  lead: LeadData;
}) {
  const { level } = computeLevel(answers);
  const details = LEVEL_DETAILS[level];
  const navigate = useNavigate();

  const ctaRef = useRef<HTMLButtonElement | null>(null);
  const ctaClickedRef = useRef(false);

  const handleCTA = async () => {
    ctaClickedRef.current = true;
    try {
      await supabase.from("cta_clicks").insert({
        lead_id: lead.id ?? null,
        cta_type: "diagnostico_estrategico",
      });
    } catch (err) {
      console.warn("CTA click insert error:", err);
    }
    const baseUrl =
      (import.meta.env.VITE_DIAGNOSTICO_URL as string | undefined) ??
      "https://forms.inmerc.com.br/form/lPeAVacK";
    try {
      const tracking = getTracking();
      const url = new URL(baseUrl);
      const utmKeys = [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_content",
        "utm_term",
        "fbclid",
        "gclid",
      ] as const;
      for (const k of utmKeys) {
        const v = (tracking as Record<string, string | undefined>)[k];
        if (v && !url.searchParams.has(k)) url.searchParams.set(k, v);
      }
      window.location.href = url.toString();
    } catch {
      window.location.href = baseUrl;
    }
  };

  // Redireciona para a página de captura caso o lead role até o botão de
  // diagnóstico e não clique em "Agendar diagnóstico" dentro de 10 segundos.
  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;

    let redirectTimer: ReturnType<typeof setTimeout> | null = null;
    let triggered = false;

    const buildRedirectUrl = () => {
      const fallback = "https://inmerc.com.br/metodo-ivl/metodo-ivl-captura-v1/";
      try {
        const tracking = getTracking();
        const url = new URL(fallback);
        const utmKeys = [
          "utm_source",
          "utm_medium",
          "utm_campaign",
          "utm_content",
          "utm_term",
          "fbclid",
          "gclid",
        ] as const;
        for (const k of utmKeys) {
          const v = (tracking as Record<string, string | undefined>)[k];
          if (v && !url.searchParams.has(k)) url.searchParams.set(k, v);
        }
        return url.toString();
      } catch {
        return fallback;
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && !triggered) {
          triggered = true;
          observer.disconnect();
          redirectTimer = setTimeout(() => {
            if (!ctaClickedRef.current) {
              window.location.href = buildRedirectUrl();
            }
          }, 10000);
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, []);

  const firstName = lead.name.split(" ")[0];
  const faturamento = lead.faturamento_lead ?? context.revenue ?? "";
  const colaboradores = lead.colaboradores_lead ?? context.team ?? "";

  // Personalized analysis
  const analysis = buildAnalysis({ faturamento, colaboradores, answers, level });

  return (
    <div className="space-y-10 pb-12">
      {/* Header logo */}
      <div className="flex items-center gap-2 -mt-2">
        <span className="text-gold font-display font-bold tracking-[0.4em] text-sm">N5</span>
        <span className="text-muted-foreground text-xs uppercase tracking-[0.25em]">
          Natal Pinto
        </span>
      </div>

      {/* Bloco 1, Cabeçalho */}
      <Reveal delay={0}>
        <div className="text-center">
          <p
            className="text-gold text-xs uppercase font-semibold mb-4"
            style={{ letterSpacing: "3px" }}
          >
            Seu diagnóstico personalizado
          </p>
          <p className="text-muted-foreground text-base sm:text-lg">
            Olá <span className="text-foreground font-medium">{firstName}</span>, aqui está o que
            descobrimos sobre o seu perfil de liderança.
          </p>
        </div>
      </Reveal>

      {/* Bloco 2, Revelação do nível */}
      <Reveal delay={100}>
        <div className="relative overflow-hidden surface-premium border-gold/25 rounded-[24px] p-8 sm:p-12 text-center before:absolute before:inset-x-12 before:-top-20 before:h-40 before:bg-gold/10 before:blur-3xl">
          <p className="text-muted-foreground text-xs uppercase tracking-[0.3em] mb-4">
            Você está no
          </p>
          <h2 className="font-display text-5xl sm:text-7xl font-semibold mb-3">
            Nível <span className="text-gold">{level}</span>
          </h2>
          <p className="font-display text-2xl sm:text-3xl text-foreground/95 mb-8">
            {details.name}
          </p>
          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full ${
                  n <= level ? "bg-gold-gradient shadow-gold" : "bg-border/60"
                }`}
              />
            ))}
          </div>
        </div>
      </Reveal>

      {/* Bloco 3, Análise geral */}
      <Reveal delay={200}>
        <div className="surface-premium rounded-[22px] p-6 sm:p-8">
          <h3 className="font-display text-xl sm:text-2xl font-medium mb-5">
            Sua análise como líder hoje
          </h3>
          <div className="space-y-4 text-foreground/85 leading-relaxed text-[15px] sm:text-base">
            {analysis.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Bloco 4, Perfil em detalhes */}
      <Reveal delay={300}>
        <div className="surface-premium rounded-[22px] p-6 sm:p-8">
          <h3 className="font-display text-xl sm:text-2xl font-medium mb-6">
            O Perfil {details.name} em detalhes
          </h3>
          <DetailList title="Como você opera hoje" items={details.operates} />
          <DetailList title="Onde está seu maior gargalo" items={details.gargalo} />
          <DetailList title="O que você já conquistou" items={details.conquistas} last />
        </div>
      </Reveal>

      {/* Bloco 5, Dica rápida */}
      <Reveal delay={400}>
        <div className="bg-petrol-deep/80 border-2 border-gold/50 rounded-2xl p-6 sm:p-8">
          <p
            className="text-gold text-xs uppercase font-semibold mb-3"
            style={{ letterSpacing: "2.5px" }}
          >
            Primeira ação prática
          </p>
          <h3 className="font-display text-xl sm:text-2xl font-medium mb-5">
            Como começar a subir de nível ainda {details.tipDays}
          </h3>
          <div className="space-y-4 text-foreground/85 leading-relaxed text-[15px] sm:text-base whitespace-pre-line">
            {details.tipText}
          </div>
        </div>
      </Reveal>

      {/* Bloco 6, Transição estratégica */}
      <Reveal delay={500}>
        <div
          className="rounded-2xl p-6 sm:p-10 border-2 border-gold/50 shadow-card"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.18 0.04 220) 0%, oklch(0.06 0.005 240) 100%)",
          }}
        >
          <p
            className="text-gold text-xs uppercase font-semibold mb-3"
            style={{ letterSpacing: "2.5px" }}
          >
            Próximo passo recomendado
          </p>
          <h3 className="font-display text-2xl sm:text-3xl font-medium mb-5">
            Esta análise é apenas o ponto de partida
          </h3>
          <div className="space-y-4 text-foreground/85 leading-relaxed text-[15px] sm:text-base">
            <p>
              O diagnóstico que você acabou de receber é uma fotografia do seu estágio atual. Subir
              de nível, no entanto, não acontece por leitura, acontece por aplicação. Pessoas que
              chegam ao Nível 5 não fazem isso sozinhas: fazem com método, mentoria e acompanhamento
              estratégico.
            </p>
            <p>
              Por isso, a próxima etapa recomendada é uma sessão de Diagnóstico Estratégico
              individual e gratuita com um especialista do time do Natal Pinto. Nessa conversa de 30
              minutos, vamos mapear os 3 maiores gargalos da sua empresa hoje, desenhar o caminho
              específico do seu Nível atual até o Nível 5 e avaliar se faz sentido você entrar para
              o programa de mentoria.
            </p>
          </div>

          <div className="mt-6 mb-8">
            <p className="text-gold text-[11px] uppercase tracking-[0.2em] font-semibold mb-3">
              O que acontece na sessão
            </p>
            <ul className="space-y-2.5">
              {[
                "Mapeamento dos 3 maiores gargalos atuais",
                "Plano de evolução do seu Nível até o Nível 5",
                "Avaliação se a mentoria faz sentido para o seu momento",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-foreground/90">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-gold-gradient text-primary-foreground flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            ref={ctaRef}
            onClick={handleCTA}
            className="w-full inline-flex items-center justify-center bg-gold-gradient text-primary-foreground font-bold uppercase rounded-lg transition shadow-gold hover:brightness-105 active:brightness-95 gap-2"
            style={{ letterSpacing: "1.5px", minHeight: "64px", fontSize: "15px" }}
          >
            Quero aplicar para o Diagnóstico Estratégico
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-[12px] text-muted-foreground text-center mt-3">
            Vagas limitadas. Aplicação gratuita, sujeita à aprovação do perfil.
          </p>
        </div>
      </Reveal>

      {/* Bloco 7, Mini perfil do Natal */}
      <Reveal delay={600}>
        <div className="surface-premium border-gold/20 rounded-[22px] p-6 sm:p-8">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">
            <img
              src={portraitImage}
              alt="Natal Pinto"
              className="w-40 h-40 rounded-full object-cover border-[3px] border-gold shrink-0"
              loading="lazy"
            />
            <div className="flex-1 text-center md:text-left">
              <p
                className="text-gold text-[11px] uppercase font-semibold mb-2"
                style={{ letterSpacing: "2.5px" }}
              >
                Quem é o Natal Pinto
              </p>
              <h3 className="font-display text-2xl sm:text-[28px] text-foreground mb-1">
                Natal Pinto
              </h3>
              <p className="text-gold text-sm font-semibold mb-4">
                Empresário, Palestrante e Mentor de Negócios
              </p>
              <div className="space-y-3 text-foreground/85 text-[14px] leading-relaxed">
                <p>
                  Ex-coordenador de gigantes como Ambev, Coca-Cola e Nestlé, Natal Pinto fundou a
                  InMerc Escola de Negócios para ajudar empresários brasileiros a construírem
                  negócios autogerenciáveis através da liderança.
                </p>
                <p>
                  Em mais de uma década de atuação, formou mais de 1.000 empresários no método Líder
                  Nível 5, ajudando donos de empresas a saírem da operação, escalarem com
                  previsibilidade e recuperarem a liberdade que o próprio negócio havia tomado
                  deles.
                </p>
                <p>
                  Hoje conduz mentorias, imersões presenciais e a InMerc, sendo referência nacional
                  em desenvolvimento de líderes e construção de empresas que prosperam sem depender
                  do dono.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border/60 grid grid-cols-3 gap-3 text-center">
            {[
              { n: "+1.000", l: "Empresários mentorados" },
              { n: "+10 anos", l: "Como mentor de negócios" },
              { n: "Ex Big Three", l: "Ambev, Coca-Cola, Nestlé" },
            ].map((s) => (
              <div key={s.l}>
                <p className="text-gold font-display text-xl sm:text-2xl font-semibold">{s.n}</p>
                <p className="text-muted-foreground text-[11px] sm:text-xs mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function DetailList({ title, items, last }: { title: string; items: string[]; last?: boolean }) {
  return (
    <div className={last ? "" : "mb-6"}>
      <p
        className="text-gold text-[11px] uppercase font-semibold mb-3"
        style={{ letterSpacing: "2px" }}
      >
        {title}
      </p>
      <ul className="space-y-2.5">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-3 text-foreground/90 text-[15px]">
            <span className="mt-0.5 w-5 h-5 rounded-full border border-gold/60 text-gold flex items-center justify-center shrink-0">
              <Check className="w-3 h-3" strokeWidth={3} />
            </span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function buildAnalysis({
  faturamento,
  colaboradores,
  answers,
  level,
}: {
  faturamento: string;
  colaboradores: string;
  answers: QuizAnswers;
  level: number;
}): string[] {
  const q1 = answers["q1"] ?? 3;
  const q2 = answers["q2"] ?? 3;
  const q4 = answers["q4"] ?? 3;
  const q5 = answers["q5"] ?? 3;

  const intros: Record<number, string> = {
    1: `Você está conduzindo uma empresa com faturamento na faixa de ${faturamento || "indefinido"} e um time de ${colaboradores || "tamanho não informado"}. Esse é o estágio mais desgastante da jornada empresarial: o dono é, simultaneamente, o motor, o cérebro e o último responsável por absolutamente tudo.`,
    2: `Você está conduzindo uma empresa com faturamento na faixa de ${faturamento || "indefinido"} e um time de ${colaboradores || "tamanho não informado"}. Esse é o estágio em que o dono começa a montar estrutura, mas ainda é puxado para baixo pela operação que ele mesmo construiu.`,
    3: `Você está conduzindo uma empresa com faturamento na faixa de ${faturamento || "indefinido"} e um time de ${colaboradores || "tamanho não informado"}. Esse é um ponto crítico de transição, onde o dono já saiu da operação básica, mas ainda é o cérebro estratégico do negócio.`,
    4: `Você está conduzindo uma empresa com faturamento na faixa de ${faturamento || "indefinido"} e um time de ${colaboradores || "tamanho não informado"}. Esse é um estágio raro: você já constrói uma empresa que pensa, e está a um passo de uma empresa que cresce sem você.`,
    5: `Você está conduzindo uma empresa com faturamento na faixa de ${faturamento || "indefinido"} e um time de ${colaboradores || "tamanho não informado"}. Você opera no estágio mais alto da liderança empresarial, algo que menos de 5% dos empresários do Brasil alcançam.`,
  };

  const decision =
    q1 <= 2
      ? "Suas respostas mostram um padrão claro de centralização: problemas voltam para a sua mesa porque ainda não existe um protocolo de decisão fora de você. Isso não é falta de esforço, é falta de estrutura. Empresas nesse estágio raramente escalam, não porque o dono é incompetente, mas porque o sistema obriga ele a ser o gargalo."
      : q1 >= 4
        ? "Suas respostas mostram que você já delegou a operação com sucesso. O time resolve o operacional, e isso libera espaço cognitivo. Mas atenção: nesse estágio, o gargalo deixa de ser operacional e vira estratégico. O risco agora é diferente, mas continua sendo você no centro."
        : "Suas respostas mostram um padrão misto: você já delega parte da operação, mas ainda é puxado para decisões que poderiam ser do time. Existe um padrão claro de centralização parcial, você confia em algumas coisas e em outras não, e o time aprende a esperar você para o que importa.";

  const teamPara =
    q4 <= 2
      ? "Na dimensão de pessoas, sua relação atual com contratações está em modo reativo: você contrata para tapar buraco, sem um filtro claro. Isso explica em parte por que o time não anda sozinho, a base de talentos foi montada na urgência, não na estratégia. E desenvolvimento de líderes ainda não é um processo formal dentro da empresa."
      : "Na dimensão de pessoas, você já tem alguma maturidade de contratação. O time é razoavelmente bem escolhido, mas o desafio agora é diferente: não basta contratar bem, é preciso formar quem pensa, não só quem executa. A formação de líderes precisa virar um sistema, não um esforço individual seu.";

  const emotional =
    q5 <= 2
      ? "No campo emocional, suas respostas indicam exaustão. E essa é uma das partes mais subestimadas do diagnóstico: não importa quanto você fature, se você se sente preso ao próprio negócio, a empresa está te custando mais do que está te entregando. Esse é o sintoma número um de Nível 1 e 2, e o motivo pelo qual a maioria dos empresários quebra antes de chegar ao Nível 5."
      : q5 >= 4
        ? "No campo emocional, você relata estar confiante e operar em modo estratégico. Esse é um marcador importante, significa que o ambiente já é favorável para o salto final. A liberdade interna é o que destrava as decisões corajosas do próximo nível."
        : "No campo emocional, você está em uma zona ambígua: já sente alívio em comparação ao começo, mas ainda carrega o peso de ser o cérebro central. É um sintoma típico do meio da jornada, você não está mais exausto, mas também não está livre.";

  const days = q2 <= 2 ? "menos de uma semana" : q2 === 3 ? "cerca de 15 dias" : "mais de 30 dias";
  const middle = `${decision} ${teamPara}`;
  const closing = `${emotional} Reunindo tudo: você está no Nível ${level}, com uma empresa que funcionaria sem você por ${days}. O próximo nível existe e é alcançável, mas exige um movimento estratégico específico, não esforço genérico.`;

  return [intros[level], middle, closing];
}

/* ===================== Reveal helper ===================== */
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const [visible, setVisible] = useState(false);
  const [ref, setRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          obs.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    obs.observe(ref);
    return () => obs.disconnect();
  }, [ref, delay]);

  return (
    <div
      ref={setRef}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 600ms ease, transform 600ms ease",
      }}
    >
      {children}
    </div>
  );
}

/* ===================== shared ===================== */
function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full sm:w-auto min-h-13 px-8 py-3.5 rounded-xl bg-gold-gradient text-primary-foreground font-bold tracking-wide shadow-gold hover:brightness-105 transition-all inline-flex items-center justify-center gap-2"
    >
      {children}
      <ArrowRight className="w-4 h-4" />
    </motion.button>
  );
}

function DotMatrixLoader({
  label,
  size = "default",
}: {
  label: string;
  size?: "default" | "compact";
}) {
  const compact = size === "compact";

  return (
    <div className="mx-auto flex w-fit items-center justify-center">
      <DotmCircular3
        size={compact ? 42 : 58}
        dotSize={compact ? 4 : 5}
        speed={1.65}
        color="var(--champagne)"
        opacityBase={0.12}
        opacityMid={0.42}
        opacityPeak={1}
        ariaLabel={label}
      />
    </div>
  );
}

/* Splits text into shorter paragraphs for better reading flow on transition screens */
function Paragraphs({ text, className }: { text: string; className?: string }) {
  // Split by explicit paragraph breaks first, else by sentence groups of ~2
  const explicit = text
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  let chunks: string[] = explicit;
  if (chunks.length === 1) {
    const sentences = text.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? [text];
    chunks = [];
    for (let i = 0; i < sentences.length; i += 2) {
      chunks.push(sentences.slice(i, i + 2).join(" "));
    }
  }
  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      {chunks.map((c, i) => (
        <p key={i}>{c}</p>
      ))}
    </div>
  );
}

/* Reveals children after a 2s delay, used to gate CTAs on loading screens */
function DelayedReveal({
  children,
  delay = 2000,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div className={className} aria-hidden={!show}>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Rotating fictional social proof, names update by themselves */
const PROOF_ENTRIES: { name: string; city: string }[] = [
  { name: "Marcos R.", city: "Ribeirão Preto/SP" },
  { name: "Juliana A.", city: "Belo Horizonte/MG" },
  { name: "Rafael M.", city: "Curitiba/PR" },
  { name: "Patrícia L.", city: "Goiânia/GO" },
  { name: "Diego S.", city: "Porto Alegre/RS" },
  { name: "Camila F.", city: "Recife/PE" },
  { name: "Eduardo B.", city: "Florianópolis/SC" },
  { name: "Letícia O.", city: "Campinas/SP" },
  { name: "Bruno C.", city: "Salvador/BA" },
  { name: "Fernanda T.", city: "Brasília/DF" },
  { name: "Gustavo P.", city: "Joinville/SC" },
  { name: "Aline V.", city: "Fortaleza/CE" },
  { name: "Henrique D.", city: "Manaus/AM" },
  { name: "Vanessa G.", city: "Vitória/ES" },
  { name: "Thiago N.", city: "São José do Rio Preto/SP" },
];

function RotatingProof() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * PROOF_ENTRIES.length));
  const [minutes, setMinutes] = useState(() => 1 + Math.floor(Math.random() * 6));

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % PROOF_ENTRIES.length);
      setMinutes(1 + Math.floor(Math.random() * 6));
    }, 4200);
    return () => clearInterval(id);
  }, []);

  const entry = PROOF_ENTRIES[index];

  return (
    <div className="flex items-center justify-center gap-2 text-[11.5px] sm:text-xs text-foreground/75 min-h-[18px] overflow-hidden">
      <User className="w-3 h-3 text-gold shrink-0" />
      <AnimatePresence mode="wait">
        <motion.span
          key={`${entry.name}-${index}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35 }}
          className="truncate"
        >
          <span className="text-foreground/90 font-medium">{entry.name}</span>
          <span className="text-foreground/60">, {entry.city}</span>
          <span className="text-muted-foreground">
            , iniciou o diagnóstico há {minutes} {minutes === 1 ? "minuto" : "minutos"}
          </span>
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
