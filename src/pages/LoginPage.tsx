import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "../router/RouterProvider";

type LoginState = {
  from?: string;
};

export function LoginPage() {
  const { login } = useAuth();
  const { navigate, state } = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectPath = useMemo(() => {
    if (state && typeof state === "object") {
      const potentialState = state as LoginState;
      if (potentialState.from) {
        return potentialState.from;
      }
    }
    return "/worlds";
  }, [state]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Não foi possível fazer login. Tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-card">
      <h1 className="title">World Forge</h1>
      <p className="subtitle">Entre para acessar seus mundos.</p>
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span>E-mail</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Senha</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <button
        className="link-button"
        type="button"
        onClick={() => navigate("/register")}
      >
        Criar uma conta
      </button>
    </div>
  );
}
