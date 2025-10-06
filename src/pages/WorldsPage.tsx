import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  createWorld,
  fetchWorlds,
  type World,
  type WorldPayload,
} from "../api/worlds";
import { useRouter } from "../router/RouterProvider";

export function WorldsPage() {
  const { token, logout } = useAuth();
  const { navigate } = useRouter();
  const [worlds, setWorlds] = useState<World[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<WorldPayload>({ name: "", description: "" });
  const [isCreating, setIsCreating] = useState(false);

  const hasWorlds = useMemo(() => worlds.length > 0, [worlds]);

  useEffect(() => {
    const loadWorlds = async () => {
      if (!token) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchWorlds(token);
        setWorlds(response);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Não foi possível carregar os mundos.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadWorlds();
  }, [token]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setIsCreating(true);
    setError(null);
    try {
      const newWorld = await createWorld(token, form);
      setWorlds((prev) => [newWorld, ...prev]);
      setForm({ name: "", description: "" });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Não foi possível criar o mundo.");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const handleOpenWorld = (world: World) => {
    navigate(`/worlds/${world.id}`, { state: { world } });
  };

  return (
    <div className="dashboard">
      <header className="dashboard__header dashboard__header--worlds">
        <div>
          <h1 className="title">Seus Mundos</h1>
          <p className="subtitle">
            Gerencie e crie universos para explorar narrativas únicas.
          </p>
        </div>
        <button className="secondary" type="button" onClick={handleLogout}>
          Sair
        </button>
      </header>

      <section className="card card--highlight">
        <h2 className="section-title">Criar novo mundo</h2>
        <form className="form form--inline" onSubmit={handleCreate}>
          <label className="field">
            <span>Nome</span>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Ex.: Cataclisma"
            />
          </label>
          <label className="field">
            <span>Descrição</span>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Conte um pouco sobre este mundo"
              rows={3}
            />
          </label>
          <button type="submit" disabled={isCreating}>
            {isCreating ? "Criando..." : "Criar mundo"}
          </button>
        </form>
      </section>

      {error && <p className="error">{error}</p>}

      <section className="worlds-grid">
        {isLoading && <p className="loading">Carregando mundos...</p>}
        {!isLoading && !hasWorlds && (
          <p className="empty">
            Nenhum mundo criado ainda. Comece cadastrando um universo incrível!
          </p>
        )}
        {worlds.map((world) => (
          <article key={world.id} className="world-card world-card--accent">
            <header>
              <h3>{world.name}</h3>
              <span className="world-date">
                Criado em {new Date(world.created_at).toLocaleDateString()}
              </span>
            </header>
            <p>{world.description || "Sem descrição"}</p>
            <button type="button" onClick={() => handleOpenWorld(world)}>
              Entrar no mundo
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}
