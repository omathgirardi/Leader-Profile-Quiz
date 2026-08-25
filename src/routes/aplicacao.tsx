import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Calendar, Check, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/aplicacao")({
  head: () => ({
    meta: [
      { title: "Aplicação — Diagnóstico Estratégico com Natal Pinto" },
      {
        name: "description",
        content:
          "Aplique para uma sessão gratuita de Diagnóstico Estratégico com a equipe do Natal Pinto. Vagas limitadas.",
      },
      { property: "og:title", content: "Aplicação — Diagnóstico Estratégico" },
      {
        property: "og:description",
        content: "Sessão gratuita de diagnóstico para empresários selecionados.",
      },
    ],
  }),
  component: Application,
});

function Application() {
  return (
    <main className="min-h-screen bg-hero text-foreground">
      <div className="max-w-2xl mx-auto px-5 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link to="/" className="text-xs text-muted-foreground tracking-widest uppercase">
            ← Voltar ao quiz
          </Link>
          <p className="mt-8 text-gold text-xs uppercase tracking-[0.3em]">
            Diagnóstico Estratégico
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-medium leading-tight mt-3">
            Uma conversa que decide os <span className="text-gold">próximos 12 meses</span> da sua empresa.
          </h1>
          <p className="text-muted-foreground mt-5 text-base sm:text-lg leading-relaxed">
            Em 45 minutos, um especialista do método N5 mapeia seus gargalos, valida seu nível atual e
            mostra o caminho concreto para o próximo nível de liderança.
          </p>
        </motion.div>

        <motion.ul
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          className="mt-10 space-y-3"
        >
          {[
            "Análise dos seus indicadores de centralização",
            "Plano de delegação adaptado ao seu nível",
            "Mapa dos próximos 3 movimentos estratégicos",
            "Sem venda agressiva. Sessão real, com método.",
          ].map((t) => (
            <motion.li
              key={t}
              variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}
              className="flex items-start gap-3"
            >
              <span className="mt-0.5 w-5 h-5 rounded-full bg-gold-gradient text-primary-foreground flex items-center justify-center shrink-0">
                <Check className="w-3 h-3" strokeWidth={3} />
              </span>
              <span className="text-foreground/90">{t}</span>
            </motion.li>
          ))}
        </motion.ul>

        <motion.a
          href="#agendar"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 w-full inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gold-gradient text-primary-foreground font-semibold shadow-gold hover:brightness-105 transition"
        >
          <Calendar className="w-4 h-4" />
          Quero agendar minha sessão
          <ArrowRight className="w-4 h-4" />
        </motion.a>

        <p id="agendar" className="text-center text-xs text-muted-foreground mt-6">
          Nossa equipe entra em contato em até 24h pelo WhatsApp informado.
        </p>

        <div className="mt-16 border-t border-border pt-8 text-center">
          <p className="text-gold font-display font-bold tracking-[0.4em] text-sm">N5</p>
          <p className="text-xs text-muted-foreground mt-2">Natal Pinto · Mentoria para empresários</p>
        </div>
      </div>
    </main>
  );
}
