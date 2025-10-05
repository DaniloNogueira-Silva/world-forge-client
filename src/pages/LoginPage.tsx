import { useState } from "react";
import { useAuth } from "../context/AuthContext";

type LoginPageProps = {
  onGoToRegister: () => void;
  onSuccess: () => void;
};

export function LoginPage({ onGoToRegister, onSuccess }: LoginPageProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState("danilo.nogueira1802@gmail.com");
  const [password, setPassword] = useState("danilo123");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      onSuccess();
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
      <button className="link-button" type="button" onClick={onGoToRegister}>
        Criar uma conta
      </button>
    </div>
  );
}
