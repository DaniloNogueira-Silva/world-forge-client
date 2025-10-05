import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
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

type CanvasPosition = {
  x: number;
  y: number;
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

const CARD_WIDTH = 260;
const CARD_HEIGHT = 180;

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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [positions, setPositions] = useState<Record<string, CanvasPosition>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef<CanvasPosition>({ x: 0, y: 0 });
  const dragMovedRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const dragTargetRef = useRef<HTMLElement | null>(null);

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
      setIsCreateModalOpen(false);
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

  useEffect(() => {
    setPositions((prev) => {
      const next = { ...prev };
      let changed = false;
      const existingIds = new Set<string>();

      orderedEntities.forEach((entity, index) => {
        existingIds.add(entity.id);
        if (!next[entity.id]) {
          const column = index % 4;
          const row = Math.floor(index / 4);
          next[entity.id] = {
            x: 120 + column * 280,
            y: 120 + row * 220,
          };
          changed = true;
        }
      });

      Object.keys(next).forEach((id) => {
        if (!existingIds.has(id)) {
          delete next[id];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [orderedEntities]);

  useEffect(() => {
    if (!draggingId) return;

    const handlePointerMove = (event: PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      event.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const rawX = event.clientX - rect.left - dragOffsetRef.current.x;
      const rawY = event.clientY - rect.top - dragOffsetRef.current.y;
      const maxX = Math.max(0, canvas.clientWidth - CARD_WIDTH);
      const maxY = Math.max(0, canvas.clientHeight - CARD_HEIGHT);

      setPositions((prev) => ({
        ...prev,
        [draggingId]: {
          x: Math.min(Math.max(0, rawX), maxX),
          y: Math.min(Math.max(0, rawY), maxY),
        },
      }));

      if (
        !dragMovedRef.current &&
        (Math.abs(event.movementX) > 1 || Math.abs(event.movementY) > 1)
      ) {
        dragMovedRef.current = true;
      }
    };

    const handlePointerUp = () => {
      setDraggingId(null);
      if (pointerIdRef.current !== null && dragTargetRef.current) {
        dragTargetRef.current.releasePointerCapture?.(pointerIdRef.current);
      }
      pointerIdRef.current = null;
      dragTargetRef.current = null;
      setTimeout(() => {
        dragMovedRef.current = false;
      }, 0);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [draggingId]);

  useEffect(() => {
    if (!isCreateModalOpen && !selectedEntity) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedEntity(null);
        setIsCreateModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCreateModalOpen, selectedEntity]);

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLElement>,
    entityId: string
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const currentPosition = positions[entityId] ?? { x: 0, y: 0 };
    dragOffsetRef.current = {
      x: event.clientX - rect.left - currentPosition.x,
      y: event.clientY - rect.top - currentPosition.y,
    };

    dragTargetRef.current = event.currentTarget as HTMLElement;
    pointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragMovedRef.current = false;
    setDraggingId(entityId);
    event.stopPropagation();
    event.preventDefault();
  };

  const handleEntityClick = (
    event: ReactMouseEvent<HTMLElement>,
    entity: Entity
  ) => {
    event.stopPropagation();
    if (dragMovedRef.current) {
      dragMovedRef.current = false;
      return;
    }
    setSelectedEntity(entity);
  };

  return (
    <div className="canvas">
      <header className="canvas__header">
        <div>
          <h1 className="title">{world.name}</h1>
          <p className="subtitle">{world.description || "Sem descrição"}</p>
        </div>
        <div className="canvas__actions">
          <button className="secondary" type="button" onClick={onBack}>
            Voltar
          </button>
          <button type="button" onClick={() => setIsCreateModalOpen(true)}>
            Nova entidade
          </button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}
      <div className="canvas__board-wrapper">
        <div className="canvas-board" ref={canvasRef}>
          {isLoading && (
            <p className="canvas__status">Carregando entidades...</p>
          )}
          {!isLoading && orderedEntities.length === 0 && (
            <p className="canvas__status">Nenhuma entidade criada ainda.</p>
          )}
          {orderedEntities.map((entity) => {
            const position = positions[entity.id] ?? { x: 120, y: 120 };
            const entries = Object.entries(entity.attributes ?? {});
            const preview = entries.slice(0, 2);
            return (
              <article
                key={entity.id}
                className="entity-node"
                style={{ left: position.x, top: position.y }}
                onPointerDown={(event) => handlePointerDown(event, entity.id)}
                onClick={(event) => handleEntityClick(event, entity)}
              >
                <header className="entity-node__header">
                  <h3>{entity.name}</h3>
                  <span className="entity-type">{entity.entity_type}</span>
                </header>
                <ul className="entity-node__attributes">
                  {preview.map(([key, value]) => (
                    <li key={key}>
                      <span className="entity-node__label">{key}</span>
                      <span className="entity-node__value">{value}</span>
                    </li>
                  ))}
                  {entries.length === 0 && (
                    <li className="entity-node__empty">Sem atributos</li>
                  )}
                  {entries.length > preview.length && (
                    <li className="entity-node__more">
                      +{entries.length - preview.length} atributos
                    </li>
                  )}
                </ul>
              </article>
            );
          })}
        </div>
      </div>

      {isCreateModalOpen && (
        <Modal title="Criar nova entidade" onClose={() => setIsCreateModalOpen(false)}>
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
        </Modal>
      )}

      {selectedEntity && (
        <Modal
          title={selectedEntity.name}
          onClose={() => setSelectedEntity(null)}
        >
          <div className="entity-details">
            <span className="entity-type">{selectedEntity.entity_type}</span>
            <span className="entity-details__date">
              Criado em {" "}
              {new Date(selectedEntity.created_at).toLocaleDateString()}
            </span>
            {Object.keys(selectedEntity.attributes ?? {}).length === 0 ? (
              <p className="entity-details__empty">Sem atributos cadastrados.</p>
            ) : (
              <dl className="entity-details__list">
                {Object.entries(selectedEntity.attributes ?? {}).map(
                  ([key, value]) => (
                    <div key={key} className="entity-details__item">
                      <dt>{key}</dt>
                      <dd>{value}</dd>
                    </div>
                  )
                )}
              </dl>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal__content">
        <header className="modal__header">
          <h2>{title}</h2>
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            aria-label="Fechar modal"
          >
            ×
          </button>
        </header>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
