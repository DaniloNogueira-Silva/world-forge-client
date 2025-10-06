import { useAuth } from "../context/AuthContext";
import { useRouter } from "../router/RouterProvider";

const features = [
  {
    title: "Visualize seu universo",
    description:
      "Explore uma visão panorâmica dos seus mundos com painéis conectados, relações dinâmicas e filtros intuitivos.",
    icon: "🪐",
  },
  {
    title: "Crie linhas do tempo épicas",
    description:
      "Planeje eventos, arcos narrativos e jornadas de personagens lado a lado para nunca perder o ritmo da história.",
    icon: "⏳",
  },
  {
    title: "Estruture narrativas complexas",
    description:
      "Organize capítulos, facções e locais em um só lugar, com notas rápidas e referências sempre ao alcance.",
    icon: "📚",
  },
  {
    title: "Dê vida ao seu mundo",
    description:
      "Anexe imagens, mapas e símbolos para tornar cada entidade memorável e inspirar sua criação.",
    icon: "✨",
  },
];

const plans = [
  {
    name: "Aprendiz",
    price: "R$0",
    description: "Perfeito para começar a forjar universos.",
    features: [
      "1 mundo",
      "50 entidades",
      "Recursos essenciais",
      "Suporte comunitário",
    ],
    cta: "Começar",
  },
  {
    name: "Tecelão Mestre",
    price: "R$59",
    description: "Tudo o que você precisa para mundos ilimitados.",
    features: [
      "Mundos ilimitados",
      "Entidades ilimitadas",
      "Upload de imagens",
      "Recursos avançados",
      "Prioridade no suporte",
    ],
    cta: "Escolher plano",
    highlight: true,
    tag: "Mais popular",
  },
  {
    name: "O Cronista",
    price: "R$129",
    description: "Para equipes e campanhas colaborativas.",
    features: [
      "Tudo do Tecelão Mestre",
      "Edição colaborativa",
      "Permissões avançadas",
      "Controle de versões",
      "Suporte dedicado",
    ],
    cta: "Assinar",
  },
];

const testimonials = [
  {
    quote:
      "WorldForge transformou a minha organização narrativa. Nunca mais perdi detalhes importantes!",
    author: "Sarah Chen",
    role: "Autora de fantasia",
  },
  {
    quote:
      "Como mestre de RPG com várias campanhas, manter tudo sincronizado ficou muito mais fácil.",
    author: "Marcus Rodrigues",
    role: "Game Master",
  },
  {
    quote:
      "A linha do tempo visual é um divisor de águas. Consigo revisar arcos inteiros em minutos.",
    author: "Emma Thompson",
    role: "Designer narrativo",
  },
];

export function LandingPage() {
  const { isAuthenticated } = useAuth();
  const { navigate } = useRouter();

  const handlePrimaryAction = () => {
    navigate(isAuthenticated ? "/worlds" : "/login");
  };

  return (
    <div className="landing">
      <div className="landing__hero" id="inicio">
        <nav className="landing__nav">
          <span className="landing__brand">WorldForge</span>
          <div className="landing__nav-links">
            <a href="#features">Recursos</a>
            <a href="#plans">Planos</a>
            <a href="#testimonials">Depoimentos</a>
          </div>
          <div className="landing__nav-actions">
            <button
              type="button"
              className="link-button landing__nav-login"
              onClick={() => navigate(isAuthenticated ? "/worlds" : "/login")}
            >
              {isAuthenticated ? "Meus mundos" : "Entrar"}
            </button>
            <button
              type="button"
              className="landing__nav-cta"
              onClick={() => navigate("/register")}
            >
              Criar conta
            </button>
          </div>
        </nav>

        <header className="landing__hero-content">
          <span className="landing__eyebrow">Para criadores de universos vivos</span>
          <h1>
            Pare de sonhar, <span>comece a construir.</span>
            <br /> Seu universo aguarda.
          </h1>
          <p>
            A WorldForge é a plataforma definitiva para organizar, visualizar e
            dar vida a cada detalhe das suas histórias. De personagens complexos
            a cronologias épicas, transforme ideias em mundos memoráveis.
          </p>
          <div className="landing__actions">
            <button type="button" onClick={handlePrimaryAction}>
              {isAuthenticated ? "Abrir meus mundos" : "Começar agora"}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => navigate("/register")}
            >
              Criar um mundo grátis
            </button>
          </div>
          <p className="landing__note">Sem necessidade de cartão de crédito</p>
        </header>

        <div className="landing__hero-glow" aria-hidden="true" />
      </div>

      <section className="landing__section" id="features">
        <header className="landing__section-header">
          <h2>Todas as ferramentas para forjar uma lenda</h2>
          <p>
            Simplificamos a construção de mundos com recursos poderosos e uma
            estética minimalista para inspirar sua criatividade.
          </p>
        </header>
        <div className="landing__feature-grid">
          {features.map((feature) => (
            <article key={feature.title} className="landing__feature-card">
              <span className="landing__feature-icon" aria-hidden="true">
                {feature.icon}
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing__section" id="plans">
        <header className="landing__section-header">
          <h2>Escolha seu caminho</h2>
          <p>Planos flexíveis para cada etapa da sua jornada criativa.</p>
        </header>
        <div className="landing__plan-grid">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`landing__plan-card${plan.highlight ? " landing__plan-card--highlight" : ""}`}
            >
              {plan.tag && <span className="landing__plan-tag">{plan.tag}</span>}
              <header>
                <h3>{plan.name}</h3>
                <p className="landing__plan-price">
                  <span>{plan.price}</span>
                  <small>/ mês</small>
                </p>
                <p className="landing__plan-description">{plan.description}</p>
              </header>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <button
                type="button"
                className={plan.highlight ? "" : "secondary"}
                onClick={handlePrimaryAction}
              >
                {plan.cta}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="landing__section" id="testimonials">
        <header className="landing__section-header">
          <h2>Amado por criadores no mundo inteiro</h2>
          <p>Junte-se a milhares de narradores que já constroem universos vivos.</p>
        </header>
        <div className="landing__testimonial-grid">
          {testimonials.map((testimonial) => (
            <article key={testimonial.author} className="landing__testimonial-card">
              <div className="landing__stars" aria-hidden="true">
                {"★★★★★"}
              </div>
              <blockquote>{testimonial.quote}</blockquote>
              <footer>
                <strong>{testimonial.author}</strong>
                <span>{testimonial.role}</span>
              </footer>
            </article>
          ))}
        </div>
      </section>

      <section className="landing__cta">
        <div className="landing__cta-content">
          <h2>Pronto para dar vida a um mundo que respira?</h2>
          <p>Construa histórias envolventes com uma plataforma feita para criadores exigentes.</p>
          <button type="button" onClick={handlePrimaryAction}>
            {isAuthenticated ? "Continuar construindo" : "Criar meu primeiro mundo"}
          </button>
        </div>
      </section>

      <footer className="landing__footer">
        <div className="landing__footer-brand">
          <span className="landing__brand">WorldForge</span>
          <p>Construa universos que ganham vida.</p>
        </div>
        <div className="landing__footer-links">
          <div>
            <h4>Produto</h4>
            <a href="#plans">Planos</a>
          </div>
          <div>
            <h4>Empresa</h4>
            <a href="#inicio">Sobre</a>
            <a href="mailto:hello@worldforge.app">Contato</a>
          </div>
          <div>
            <h4>Social</h4>
            <a href="https://twitter.com" target="_blank" rel="noreferrer">
              Twitter
            </a>
            <a href="https://discord.com" target="_blank" rel="noreferrer">
              Discord
            </a>
          </div>
        </div>
        <p className="landing__footer-note">© {new Date().getFullYear()} WorldForge. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
