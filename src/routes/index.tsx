import { createFileRoute } from "@tanstack/react-router";
import { Quiz } from "@/components/quiz/Quiz";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Qual é o seu Perfil de Líder? — Natal Pinto" },
      {
        name: "description",
        content:
          "Diagnóstico em 2 minutos: descubra em qual dos 5 níveis de liderança você está e como destravar o próximo. Método N5 by Natal Pinto.",
      },
      { property: "og:title", content: "Qual é o seu Perfil de Líder? — Natal Pinto" },
      {
        property: "og:description",
        content:
          "Apenas 5% dos empresários chegam ao Nível 5. Em 2 minutos, descubra em qual grupo você está.",
      },
    ],
  }),
  component: () => (
    <main>
      <h1 className="sr-only">Qual é o seu Perfil de Líder? — Quiz Natal Pinto</h1>
      <Quiz />
    </main>
  ),
});
