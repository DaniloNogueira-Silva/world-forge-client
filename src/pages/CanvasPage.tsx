import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  createEntity,
  fetchEntities,
  type Entity,
  type EntityPayload,
  type World,
} from "../api/worlds";

type CanvasPageProps = {
  world: World;
  onBack: () => void;
};

type AttributeField = {
  id: string;
  key: string;
  value: string;
};

const ENTITY_TYPES = [
  "CHARACTER",
  "LOCATION",
  "ITEM",
  "ORGANIZATION",
  "OTHER",
];

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export function CanvasPage({ world, onBack }: CanvasPageProps) {
  const { token } = useAuth();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<EntityPayload>({
    name: "",
    entity_type: ENTITY_TYPES[0],
    attributes: {},
  });
  const [attributeFields, setAttributeFields] = useState<AttributeField[]>([
    { id: createId(), key: "", value: "" },
  ]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const loadEntities = async () => {
      if (!token) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchEntities(token, world.id);
        setEntities(response);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Não foi possível carregar as entidades.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadEntities();
  }, [token, world.id]);

  const handleFormChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAttributeChange = (
    id: string,
    field: "key" | "value",
    value: string
  ) => {
    setAttributeFields((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAddAttribute = () => {
    setAttributeFields((prev) => [...prev, { id: createId(), key: "", value: "" }]);
  };

  const handleRemoveAttribute = (id: string) => {
    setAttributeFields((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCreateEntity = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setIsCreating(true);
    setError(null);
    try {
      const attributes = attributeFields.reduce<Record<string, string>>(
        (acc, { key, value }) => {
          if (key.trim()) {
            acc[key.trim()] = value.trim();
          }
          return acc;
        },
        {}
      );

      const payload: EntityPayload = {
        ...form,
        attributes,
      };

      const newEntity = await createEntity(token, world.id, payload);
      setEntities((prev) => [newEntity, ...prev]);
      setForm({ name: "", entity_type: ENTITY_TYPES[0], attributes: {} });
      setAttributeFields([{ id: createId(), key: "", value: "" }]);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Não foi possível criar a entidade.");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const orderedEntities = useMemo(
    () =>
      [...entities].sort((a, b) =>
        a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0
      ),
    [entities]
  );

  return (
    <div className="canvas">
      <header className="canvas__header">
        <button className="secondary" type="button" onClick={onBack}>
          Voltar
        </button>
        <div>
          <h1 className="title">{world.name}</h1>
          <p className="subtitle">{world.description || "Sem descrição"}</p>
        </div>
      </header>

      <section className="card">
        <h2 className="section-title">Nova entidade</h2>
        <form className="form" onSubmit={handleCreateEntity}>
          <label className="field">
            <span>Nome</span>
            <input
              name="name"
              value={form.name}
              onChange={handleFormChange}
              required
              placeholder="Ex.: Naoyia Satoshi"
            />
          </label>
          <label className="field">
            <span>Tipo</span>
            <select
              name="entity_type"
              value={form.entity_type}
              onChange={handleFormChange}
            >
              {ENTITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <div className="attributes">
            <span className="attributes__title">Atributos</span>
            {attributeFields.map((field) => (
              <div key={field.id} className="attributes__row">
                <input
                  placeholder="Chave (ex.: hair)"
                  value={field.key}
                  onChange={(event) =>
                    handleAttributeChange(field.id, "key", event.target.value)
                  }
                />
                <input
                  placeholder="Valor (ex.: white)"
                  value={field.value}
                  onChange={(event) =>
                    handleAttributeChange(field.id, "value", event.target.value)
                  }
                />
                <button
                  type="button"
                  className="danger"
                  onClick={() => handleRemoveAttribute(field.id)}
                  disabled={attributeFields.length === 1}
                >
                  Remover
                </button>
              </div>
            ))}
            <button
              type="button"
              className="secondary"
              onClick={handleAddAttribute}
            >
              Adicionar atributo
            </button>
          </div>

          <button type="submit" disabled={isCreating}>
            {isCreating ? "Criando..." : "Criar entidade"}
          </button>
        </form>
      </section>

      {error && <p className="error">{error}</p>}

      <section className="entities-grid">
        {isLoading && <p className="loading">Carregando entidades...</p>}
        {!isLoading && orderedEntities.length === 0 && (
          <p className="empty">Nenhuma entidade criada ainda.</p>
        )}
        {orderedEntities.map((entity) => (
          <article key={entity.id} className="entity-card">
            <header>
              <h3>{entity.name}</h3>
              <span className="entity-type">{entity.entity_type}</span>
            </header>
            <dl>
              {Object.entries(entity.attributes ?? {}).map(([key, value]) => (
                <div key={key} className="entity-attribute">
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </section>
    </div>
  );
}
