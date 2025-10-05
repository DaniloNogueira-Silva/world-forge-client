import { useState } from "react";
import { useAuth } from "../context/AuthContext";

type RegisterPageProps = {
  onGoToLogin: () => void;
  onRegistered: () => void;
};

export function RegisterPage({ onGoToLogin, onRegistered }: RegisterPageProps) {
  const { register } = useAuth();
  const [username, setUsername] = useState("Danilo");
  const [email, setEmail] = useState("danilo.nogueira1802@gmail.com");
  const [password, setPassword] = useState("danilo123");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register(username, email, password);
      onRegistered();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Não foi possível criar a conta. Tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-card">
      <h1 className="title">Criar conta</h1>
      <p className="subtitle">Configure seu acesso ao World Forge.</p>
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Nome de usuário</span>
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </label>
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
          {isSubmitting ? "Criando conta..." : "Registrar"}
        </button>
      </form>
      <button className="link-button" type="button" onClick={onGoToLogin}>
        Já tenho uma conta
      </button>
    </div>
  );
}
