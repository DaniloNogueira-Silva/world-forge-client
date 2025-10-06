import { useAuth } from "../context/AuthContext";
import { useRouter } from "../router/RouterProvider";

export function LandingPage() {
  const { isAuthenticated } = useAuth();
  const { navigate } = useRouter();

  const handlePrimaryAction = () => {
    navigate(isAuthenticated ? "/worlds" : "/login");
  };

  return (
    <div className="landing">
      <header className="landing__header">
        <span className="landing__badge">World Forge</span>
        <h1>Organize histórias e universos de forma visual</h1>
        <p>
          Crie mundos, conecte personagens, itens e organizações com um quadro
          visual poderoso. Explore relações, documente detalhes e mantenha todo
          o seu universo em um só lugar.
        </p>
      </header>

      <div className="landing__actions">
        <button type="button" onClick={handlePrimaryAction}>
          {isAuthenticated ? "Ir para meus mundos" : "Entrar"}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => navigate("/register")}
        >
          Criar conta gratuita
        </button>
      </div>

      <section className="landing__highlights">
        <article>
          <h2>Construa universos conectados</h2>
          <p>
            Cadastre entidades com atributos ricos e visualize as conexões entre
            elas em tempo real.
          </p>
        </article>
        <article>
          <h2>Controle total das relações</h2>
          <p>
            Defina origens, alianças, rivalidades e muito mais com alguns cliques
            em um ambiente intuitivo.
          </p>
        </article>
        <article>
          <h2>Foque no que importa</h2>
          <p>
            Um visual moderno e minimalista ajuda você a navegar pelos detalhes
            sem perder o contexto do seu mundo.
          </p>
        </article>
      </section>
    </div>
  );
}
