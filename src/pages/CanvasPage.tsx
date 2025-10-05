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
  createEntityRelation,
  fetchEntities,
  ENTITY_RELATION_TYPES,
  type Entity,
  type EntityPayload,
  type EntityRelationPayload,
  type EntityRelationType,
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

const ENTITY_TYPES = ["CHARACTER", "LOCATION", "ITEM", "ORGANIZATION", "OTHER"];

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const CARD_WIDTH = 260;
const CARD_HEIGHT = 180;

const RELATION_COLORS: Record<EntityRelationType, string> = {
  ORIGIN: "#38bdf8",
  FRIEND: "#4ade80",
  ENEMY: "#f87171",
  AFFILIATE: "#facc15",
  WIELDS: "#a855f7",
};

const RELATION_TYPE_SET = new Set<EntityRelationType>(ENTITY_RELATION_TYPES);

type EntityRelationForm = {
  type: EntityRelationType;
  targetEntityId: string;
};

function getEdgeCoordinates(
  sourcePos: CanvasPosition,
  targetPos: CanvasPosition
) {
  // 1. Encontra o centro de cada card
  const sourceCenter = {
    x: sourcePos.x + CARD_WIDTH / 2,
    y: sourcePos.y + CARD_HEIGHT / 2,
  };
  const targetCenter = {
    x: targetPos.x + CARD_WIDTH / 2,
    y: targetPos.y + CARD_HEIGHT / 2,
  };

  // 2. Calcula o vetor da origem para o destino
  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;

  // 3. Calcula os pontos de intersecção para ambos os cards
  const points = { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } };

  // Função interna para calcular o ponto para um único card
  const calculateIntersection = (
    center: { x: number; y: number },
    deltaX: number,
    deltaY: number
  ) => {
    // Evita divisão por zero
    if (deltaX === 0 && deltaY === 0) return center;

    const tan = deltaY / deltaX;
    const width = CARD_WIDTH / 2;
    const height = CARD_HEIGHT / 2;

    // Determina qual borda será interceptada
    if (Math.abs(deltaY) / height < Math.abs(deltaX) / width) {
      // Intercepta a borda esquerda ou direita
      const x = center.x + Math.sign(deltaX) * width;
      const y = center.y + tan * (Math.sign(deltaX) * width);
      return { x, y };
    } else {
      // Intercepta a borda superior ou inferior
      const y = center.y + Math.sign(deltaY) * height;
      const x = center.x + (1 / tan) * (Math.sign(deltaY) * height);
      return { x, y };
    }
  };

  points.start = calculateIntersection(sourceCenter, dx, dy);
  points.end = calculateIntersection(targetCenter, -dx, -dy); // Vetor invertido para o alvo

  return points;
}

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
  const [positions, setPositions] = useState<Record<string, CanvasPosition>>(
    {}
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef<CanvasPosition>({ x: 0, y: 0 });
  const dragMovedRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const dragTargetRef = useRef<HTMLElement | null>(null);
  const [relationForm, setRelationForm] = useState<EntityRelationForm>({
    type: ENTITY_RELATION_TYPES[0],
    targetEntityId: "",
  });
  const [isAddingRelation, setIsAddingRelation] = useState(false);
  const [relationError, setRelationError] = useState<string | null>(null);

  useEffect(() => {
    const loadEntities = async () => {
      if (!token) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchEntities(token, world.id);
        setEntities(
          response.map((entity) => ({
            ...entity,
            relations: entity.relations ?? {},
          }))
        );
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
    setAttributeFields((prev) => [
      ...prev,
      { id: createId(), key: "", value: "" },
    ]);
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
      const normalizedEntity: Entity = {
        ...newEntity,
        relations: newEntity.relations ?? {},
      };
      setEntities((prev) => [normalizedEntity, ...prev]);
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
    if (!selectedEntity) return;
    const latest = entities.find((entity) => entity.id === selectedEntity.id);
    if (latest && latest !== selectedEntity) {
      setSelectedEntity(latest);
    }
  }, [entities, selectedEntity]);

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

  useEffect(() => {
    if (!selectedEntity) return;
    setRelationForm({ type: ENTITY_RELATION_TYPES[0], targetEntityId: "" });
    setRelationError(null);
  }, [selectedEntity]);

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

  const handleRelationFormChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setRelationError(null);
    setRelationForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddRelation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !selectedEntity) return;
    if (!relationForm.targetEntityId) {
      setRelationError("Selecione uma entidade alvo.");
      return;
    }

    setIsAddingRelation(true);
    setRelationError(null);
    try {
      const payload: EntityRelationPayload = {
        type: relationForm.type,
        targetEntityId: relationForm.targetEntityId,
      };
      const updatedEntity = await createEntityRelation(
        token,
        world.id,
        selectedEntity.id,
        payload
      );
      const normalizedEntity: Entity = {
        ...updatedEntity,
        relations: updatedEntity.relations ?? {},
      };
      setEntities((prev) =>
        prev.map((entity) =>
          entity.id === normalizedEntity.id ? normalizedEntity : entity
        )
      );
      setSelectedEntity(normalizedEntity);
      setRelationForm((prev) => ({ ...prev, targetEntityId: "" }));
    } catch (err) {
      if (err instanceof Error) {
        setRelationError(err.message);
      } else {
        setRelationError("Não foi possível criar a relação.");
      }
    } finally {
      setIsAddingRelation(false);
    }
  };

  const entityNameMap = useMemo(() => {
    const map = new Map<string, string>();
    entities.forEach((entity) => {
      map.set(entity.id, entity.name);
    });
    return map;
  }, [entities]);

  const relationEdges = useMemo(() => {
    const edges: Array<{
      id: string;
      sourceId: string;
      targetId: string;
      type: EntityRelationType;
    }> = [];

    entities.forEach((entity) => {
      const relations = entity.relations ?? {};
      Object.entries(relations).forEach(([typeKey, targetIds]) => {
        if (!Array.isArray(targetIds)) return;
        if (!RELATION_TYPE_SET.has(typeKey as EntityRelationType)) return;
        targetIds.forEach((targetId) => {
          if (!positions[entity.id] || !positions[targetId]) return;
          edges.push({
            id: `${entity.id}:${typeKey}:${targetId}`,
            sourceId: entity.id,
            targetId,
            type: typeKey as EntityRelationType,
          });
        });
      });
    });

    return edges;
  }, [entities, positions]);

  const boardDimensions = useMemo(() => {
    const values = Object.values(positions);
    if (values.length === 0) {
      return { width: 1200, height: 800 };
    }

    const maxX = Math.max(...values.map((position) => position.x + CARD_WIDTH));
    const maxY = Math.max(
      ...values.map((position) => position.y + CARD_HEIGHT)
    );

    return {
      width: Math.max(1200, maxX + 160),
      height: Math.max(800, maxY + 160),
    };
  }, [positions]);

  const availableRelationTargets = useMemo(() => {
    if (!selectedEntity) return [] as Entity[];
    return entities.filter((entity) => entity.id !== selectedEntity.id);
  }, [entities, selectedEntity]);

  useEffect(() => {
    if (
      relationForm.targetEntityId &&
      !availableRelationTargets.some(
        (entity) => entity.id === relationForm.targetEntityId
      )
    ) {
      setRelationForm((prev) => ({ ...prev, targetEntityId: "" }));
    }
  }, [availableRelationTargets, relationForm.targetEntityId]);

  const selectedEntityRelations = selectedEntity
    ? Object.entries(selectedEntity.relations ?? {})
        .filter(
          ([typeKey, ids]) =>
            RELATION_TYPE_SET.has(typeKey as EntityRelationType) &&
            Array.isArray(ids) &&
            ids.length > 0
        )
        .map(([typeKey, ids]) => ({
          type: typeKey as EntityRelationType,
          targets: ids,
        }))
    : [];

  return (
    <div className="canvas canvas--fullscreen">
      <aside className="canvas__sidebar">
        <div className="canvas__sidebar-header">
          <button
            className="secondary canvas__sidebar-back"
            type="button"
            onClick={onBack}
          >
            Voltar
          </button>
          <h1 className="title">{world.name}</h1>
          <p className="subtitle">{world.description || "Sem descrição"}</p>
        </div>
        <div className="canvas__sidebar-actions">
          <button type="button" onClick={() => setIsCreateModalOpen(true)}>
            Nova entidade
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </aside>

      <main className="canvas__surface">
        <div
          className="canvas__board"
          ref={canvasRef}
          style={{
            minWidth: boardDimensions.width,
            minHeight: boardDimensions.height,
          }}
        >
          {isLoading && (
            <p className="canvas__status">Carregando entidades...</p>
          )}
          {!isLoading && orderedEntities.length === 0 && (
            <p className="canvas__status">Nenhuma entidade criada ainda.</p>
          )}
          <svg
            className="entity-relations"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              pointerEvents: "none", // Impede que o SVG bloqueie cliques nos cards
            }}
            width={boardDimensions.width}
            height={boardDimensions.height}
          >
            {/* A SEÇÃO <defs> FOI REMOVIDA DAQUI */}

            {relationEdges.map((edge) => {
              const source = positions[edge.sourceId];
              const target = positions[edge.targetId];
              if (!source || !target) return null;

              // 👇 A MUDANÇA PRINCIPAL ACONTECE AQUI
              // Substituímos o cálculo antigo pela nossa nova função
              const { start, end } = getEdgeCoordinates(source, target);

              // Coordenadas para o texto da relação (ainda no meio da linha)
              const labelX = (start.x + end.x) / 2;
              const labelY = (start.y + end.y) / 2;
              const color = RELATION_COLORS[edge.type] ?? "#38bdf8";

              return (
                <g key={edge.id} className="entity-relations__edge">
                  <line
                    className="entity-relations__line"
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke={color}
                    // O ATRIBUTO "markerEnd" FOI REMOVIDO DAQUI
                  />
                  <text
                    className="entity-relations__label"
                    x={labelX}
                    y={labelY}
                    fill={color}
                    style={{
                      dominantBaseline: "middle",
                      textAnchor: "middle",
                      fontSize: "12px",
                      fontWeight: "bold",
                      // Adiciona um contorno sutil para melhorar a legibilidade
                      paintOrder: "stroke",
                      stroke: "#1f2937", // Cor de fundo do canvas
                      strokeWidth: "3px",
                      strokeLinejoin: "round",
                    }}
                  >
                    {edge.type}
                  </text>
                </g>
              );
            })}
          </svg>
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
      </main>

      {isCreateModalOpen && (
        <Modal
          title="Criar nova entidade"
          onClose={() => setIsCreateModalOpen(false)}
        >
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
                      handleAttributeChange(
                        field.id,
                        "value",
                        event.target.value
                      )
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
              Criado em{" "}
              {new Date(selectedEntity.created_at).toLocaleDateString()}
            </span>
            {Object.keys(selectedEntity.attributes ?? {}).length === 0 ? (
              <p className="entity-details__empty">
                Sem atributos cadastrados.
              </p>
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
            <div className="entity-relations-panel">
              <h3>Relações</h3>
              {selectedEntityRelations.length === 0 ? (
                <p className="entity-details__empty">
                  Nenhuma relação cadastrada.
                </p>
              ) : (
                <ul className="entity-relations__list">
                  {selectedEntityRelations.map((relation) => (
                    <li key={relation.type}>
                      <span className="entity-relations__type">
                        {relation.type}
                      </span>
                      <div className="entity-relations__targets">
                        {relation.targets.map((targetId) => (
                          <span
                            key={targetId}
                            className="entity-relations__target"
                          >
                            {entityNameMap.get(targetId) ?? targetId}
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {availableRelationTargets.length === 0 ? (
                <p className="entity-relations__hint">
                  Crie outras entidades para relacioná-las.
                </p>
              ) : (
                <form
                  className="entity-relations__form"
                  onSubmit={handleAddRelation}
                >
                  <label>
                    <span>Tipo</span>
                    <select
                      name="type"
                      value={relationForm.type}
                      onChange={handleRelationFormChange}
                    >
                      {ENTITY_RELATION_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Entidade</span>
                    <select
                      name="targetEntityId"
                      value={relationForm.targetEntityId}
                      onChange={handleRelationFormChange}
                      required
                    >
                      <option value="" disabled>
                        Selecione uma entidade
                      </option>
                      {availableRelationTargets.map((entity) => (
                        <option key={entity.id} value={entity.id}>
                          {entity.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {relationError && (
                    <p className="entity-relations__error">{relationError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={isAddingRelation || !relationForm.targetEntityId}
                  >
                    {isAddingRelation
                      ? "Criando relação..."
                      : "Adicionar relação"}
                  </button>
                </form>
              )}
            </div>
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
