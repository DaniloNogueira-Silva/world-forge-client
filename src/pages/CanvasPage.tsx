import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useAuth } from "../context/AuthContext";
import {
  createEntity,
  createEntityRelation,
  fetchEntities,
  fetchWorld,
  ENTITY_RELATION_TYPES,
  updateEntity,
  updateEntityAttributes,
  type Entity,
  type EntityPayload,
  type EntityRelationPayload,
  type EntityRelationType,
  type World,
} from "../api/worlds";
import { useRouteParams } from "../router/RouteParamsContext";
import { useRouter } from "../router/RouterProvider";
import { Modal } from "../components/Modal";
import { IconButton } from "../components/IconButton";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationNodeDatum,
} from "d3-force";

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

const ENTITY_TYPE_COLORS: Record<string, string> = {
  CHARACTER: "#38bdf8",
  LOCATION: "#4ade80",
  ITEM: "#fbbf24",
  ORGANIZATION: "#a855f7",
  OTHER: "#f97316",
};

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function PlusIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M9 10v7" />
      <path d="M15 10v7" />
      <path d="M5 6l1 14h12l1-14" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg {...iconProps}>
      <path d="M5 12h14" />
      <path d="M10 7l-5 5 5 5" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg {...iconProps}>
      <path d="M5 12h14" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg {...iconProps}>
      <path d="M20 11a8.1 8.1 0 0 0-15.5-2" />
      <path d="M4 11V5" />
      <path d="M4 5h6" />
      <path d="M4 13a8.1 8.1 0 0 0 15.5 2" />
      <path d="M20 19v-6" />
      <path d="M14 19h6" />
    </svg>
  );
}

type CSSVarProperties = CSSProperties & Record<`--${string}`, string | number>;

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;

  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const CARD_WIDTH = 260;
const CARD_HEIGHT = 180;
const CARD_SPACING = 48;

const LONG_ATTRIBUTE_THRESHOLD = 80;

const createAttributeField = (key = "", value = ""): AttributeField => ({
  id: createId(),
  key,
  value,
});

const mapAttributesToFields = (
  attributes: Record<string, string> | undefined
): AttributeField[] =>
  Object.entries(attributes ?? {}).map(([key, value]) =>
    createAttributeField(key, value)
  );

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

interface SimulationNode extends SimulationNodeDatum {
  id: string;
}

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

function calculateForceDirectedLayout(
  entities: Entity[],
  width: number,
  height: number
): Record<string, CanvasPosition> {
  if (entities.length === 0) {
    return {};
  }

  const nodes: SimulationNode[] = entities.map((e) => ({ id: e.id }));
  const links: { source: string; target: string }[] = [];
  entities.forEach((sourceEntity) => {
    Object.values(sourceEntity.relations ?? {}).forEach((targetIds) => {
      if (Array.isArray(targetIds)) {
        targetIds.forEach((targetId) => {
          if (entities.some((e) => e.id === targetId)) {
            links.push({ source: sourceEntity.id, target: targetId });
          }
        });
      }
    });
  });

  const simulation = forceSimulation(nodes)
    .force(
      "link",
      forceLink(links)
        .id((d: any) => d.id)
        .distance(CARD_WIDTH + 50)
    )
    .force("charge", forceManyBody().strength(-CARD_WIDTH * 2))
    .force(
      "collide",
      forceCollide(Math.max(CARD_WIDTH, CARD_HEIGHT) / 2 + CARD_SPACING / 2)
    )
    .force("center", forceCenter(width / 2, height / 2))
    .stop();

  simulation.tick(300);

  const finalPositions: Record<string, CanvasPosition> = {};
  simulation.nodes().forEach((node: any) => {
    const clampedX = Math.min(
      Math.max(40, node.x - CARD_WIDTH / 2),
      Math.max(width - CARD_WIDTH - 40, 40)
    );
    const clampedY = Math.min(
      Math.max(40, node.y - CARD_HEIGHT / 2),
      Math.max(height - CARD_HEIGHT - 40, 40)
    );
    finalPositions[node.id] = {
      x: clampedX,
      y: clampedY,
    };
  });

  return finalPositions;
}

function rectanglesOverlap(
  a: CanvasPosition,
  b: CanvasPosition,
  padding: number
) {
  const expandedA = {
    left: a.x - padding,
    right: a.x + CARD_WIDTH + padding,
    top: a.y - padding,
    bottom: a.y + CARD_HEIGHT + padding,
  };
  const expandedB = {
    left: b.x - padding,
    right: b.x + CARD_WIDTH + padding,
    top: b.y - padding,
    bottom: b.y + CARD_HEIGHT + padding,
  };

  return !(
    expandedA.right <= expandedB.left ||
    expandedA.left >= expandedB.right ||
    expandedA.bottom <= expandedB.top ||
    expandedA.top >= expandedB.bottom
  );
}

function findAvailablePosition(
  existingPositions: Record<string, CanvasPosition>,
  width: number,
  height: number
): CanvasPosition {
  const attempts = Math.max(200, Object.keys(existingPositions).length * 10);
  const padding = CARD_SPACING / 2;
  const centerX = Math.max(0, (width - CARD_WIDTH) / 2);
  const centerY = Math.max(0, (height - CARD_HEIGHT) / 2);

  const occupied = Object.values(existingPositions);

  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  const maxX = Math.max(0, width - CARD_WIDTH - padding);
  const maxY = Math.max(0, height - CARD_HEIGHT - padding);

  for (let i = 0; i < attempts; i += 1) {
    const radius = (i / 6) * (CARD_WIDTH + CARD_SPACING);
    const angle = (i % 6) * (Math.PI / 3);
    const candidate = {
      x: clamp(
        centerX + Math.cos(angle) * radius,
        padding,
        maxX
      ),
      y: clamp(
        centerY + Math.sin(angle) * radius,
        padding,
        maxY
      ),
    };

    const overlaps = occupied.some((position) =>
      rectanglesOverlap(candidate, position, padding)
    );

    if (!overlaps) {
      return candidate;
    }
  }

  return {
    x: clamp(Math.random() * (width - CARD_WIDTH), padding, maxX),
    y: clamp(Math.random() * (height - CARD_HEIGHT), padding, maxY),
  };
}

export function CanvasPage() {
  const { token, logout } = useAuth();
  const { navigate, state } = useRouter();
  const params = useRouteParams();
  const worldId = params.worldId;
  const locationState =
    state && typeof state === "object" ? (state as { world?: World }) : null;
  const initialWorld = locationState?.world ?? null;
  const [world, setWorld] = useState<World | null>(initialWorld);
  const [isWorldLoading, setIsWorldLoading] = useState(!initialWorld);
  const [worldError, setWorldError] = useState<string | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<EntityPayload>({
    name: "",
    entity_type: ENTITY_TYPES[0],
    attributes: {},
  });
  const [createAttributeFields, setCreateAttributeFields] = useState<
    AttributeField[]
  >([createAttributeField()]);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [entityEditForm, setEntityEditForm] = useState({
    name: "",
    entity_type: ENTITY_TYPES[0],
  });
  const [editAttributeFields, setEditAttributeFields] = useState<
    AttributeField[]
  >([]);
  const [isUpdatingEntity, setIsUpdatingEntity] = useState(false);
  const [entityUpdateError, setEntityUpdateError] = useState<string | null>(
    null
  );
  const [isUpdatingAttributes, setIsUpdatingAttributes] = useState(false);
  const [attributesUpdateError, setAttributesUpdateError] = useState<
    string | null
  >(null);
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
  const [zoom, setZoom] = useState(1);

  const initialLayoutDone = useRef(false);
  const zoomRef = useRef(1);
  const handleBack = () => navigate("/worlds");
  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.5, prev - 0.1));
  const handleResetZoom = () => setZoom(1);

  useEffect(() => {
    if (!token || !worldId) {
      if (!worldId) {
        setWorldError("Mundo não encontrado.");
        setIsWorldLoading(false);
      }
      return;
    }

    let isCancelled = false;
    const loadWorld = async () => {
      setIsWorldLoading(true);
      setWorldError(null);
      try {
        const response = await fetchWorld(token, worldId);
        if (!isCancelled) {
          setWorld(response);
        }
      } catch (err) {
        if (isCancelled) return;
        if (err instanceof Error) {
          setWorldError(err.message);
        } else {
          setWorldError("Não foi possível carregar este mundo.");
        }
      } finally {
        if (!isCancelled) {
          setIsWorldLoading(false);
        }
      }
    };

    loadWorld();

    return () => {
      isCancelled = true;
    };
  }, [token, worldId]);

  useEffect(() => {
    if (!token || !world) return;
    const loadEntities = async () => {
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
  }, [token, world]);

  useEffect(() => {
    // Roda apenas se tivermos entidades e o layout inicial ainda não foi calculado
    if (entities.length > 0 && !initialLayoutDone.current) {
      const width = canvasRef.current?.clientWidth ?? 1200;
      const height = canvasRef.current?.clientHeight ?? 800;

      // Chama a nova função de layout
      const newPositions = calculateForceDirectedLayout(
        entities,
        width,
        height
      );

      setPositions(newPositions);

      // Marca que o layout inicial foi concluído para não rodar de novo
      initialLayoutDone.current = true;
    }
  }, [entities]);

  const handleFormChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateAttributeChange = (
    id: string,
    field: "key" | "value",
    value: string
  ) => {
    setCreateAttributeFields((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAddCreateAttribute = () => {
    setCreateAttributeFields((prev) => [...prev, createAttributeField()]);
  };

  const handleRemoveCreateAttribute = (id: string) => {
    setCreateAttributeFields((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCreateEntity = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !world) return;
    setIsCreating(true);
    setError(null);
    try {
      const attributes = createAttributeFields.reduce<Record<string, string>>(
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
      setPositions((prev) => {
        const canvas = canvasRef.current;
        const width = canvas?.clientWidth ?? 1200;
        const height = canvas?.clientHeight ?? 800;
        return {
          ...prev,
          [normalizedEntity.id]: findAvailablePosition(prev, width, height),
        };
      });
      setForm({ name: "", entity_type: ENTITY_TYPES[0], attributes: {} });
      setCreateAttributeFields([createAttributeField()]);
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

  const handleEntityEditFormChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setEntityEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEntityUpdate = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!token || !selectedEntity || !world) return;

    setIsUpdatingEntity(true);
    setEntityUpdateError(null);

    try {
      const payload = {
        name: entityEditForm.name.trim(),
        entity_type: entityEditForm.entity_type,
      };
      const updatedEntity = await updateEntity(
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
    } catch (err) {
      if (err instanceof Error) {
        setEntityUpdateError(err.message);
      } else {
        setEntityUpdateError("Não foi possível atualizar a entidade.");
      }
    } finally {
      setIsUpdatingEntity(false);
    }
  };

  const handleEditAttributeChange = (
    id: string,
    field: "key" | "value",
    value: string
  ) => {
    setEditAttributeFields((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAddEditAttribute = () => {
    setEditAttributeFields((prev) => [...prev, createAttributeField()]);
  };

  const handleRemoveEditAttribute = (id: string) => {
    setEditAttributeFields((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAttributesUpdate = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!token || !selectedEntity || !world) return;

    setIsUpdatingAttributes(true);
    setAttributesUpdateError(null);

    try {
      const attributes = editAttributeFields.reduce<Record<string, string>>(
        (acc, { key, value }) => {
          const trimmedKey = key.trim();
          if (trimmedKey) {
            acc[trimmedKey] = value;
          }
          return acc;
        },
        {}
      );

      const updatedEntity = await updateEntityAttributes(
        token,
        world.id,
        selectedEntity.id,
        { attributes }
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
      setEditAttributeFields(
        mapAttributesToFields(normalizedEntity.attributes)
      );
    } catch (err) {
      if (err instanceof Error) {
        setAttributesUpdateError(err.message);
      } else {
        setAttributesUpdateError(
          "Não foi possível atualizar os atributos."
        );
      }
    } finally {
      setIsUpdatingAttributes(false);
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

      orderedEntities.forEach((entity) => {
        existingIds.add(entity.id);
        if (!next[entity.id]) {
          const canvas = canvasRef.current;
          const width = canvas?.clientWidth ?? 1200;
          const height = canvas?.clientHeight ?? 800;
          next[entity.id] = findAvailablePosition(next, width, height);
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
      const scale = zoomRef.current || 1;
      const rawX =
        (event.clientX - rect.left) / scale - dragOffsetRef.current.x;
      const rawY =
        (event.clientY - rect.top) / scale - dragOffsetRef.current.y;
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

  useEffect(() => {
    if (!selectedEntity) {
      setEntityEditForm({ name: "", entity_type: ENTITY_TYPES[0] });
      setEditAttributeFields([]);
      setEntityUpdateError(null);
      setAttributesUpdateError(null);
      return;
    }

    setEntityEditForm({
      name: selectedEntity.name,
      entity_type: selectedEntity.entity_type,
    });
    setEditAttributeFields(mapAttributesToFields(selectedEntity.attributes));
    setEntityUpdateError(null);
    setAttributesUpdateError(null);
  }, [selectedEntity]);

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLElement>,
    entityId: string
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const currentPosition = positions[entityId] ?? { x: 0, y: 0 };
    const scale = zoomRef.current || 1;
    dragOffsetRef.current = {
      x: (event.clientX - rect.left) / scale - currentPosition.x,
      y: (event.clientY - rect.top) / scale - currentPosition.y,
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
    if (!token || !selectedEntity || !world) return;
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

  if (!world && isWorldLoading) {
    return (
      <div className="canvas canvas--fullscreen canvas--feedback">
        <div className="canvas__feedback-card">
          <p className="canvas__status">Carregando mundo...</p>
        </div>
      </div>
    );
  }

  if (!world) {
    return (
      <div className="canvas canvas--fullscreen canvas--feedback">
        <div className="canvas__feedback-card">
          <h1>Não encontramos esse mundo.</h1>
          <p>
            {worldError
              ? worldError
              : "Tente voltar à listagem e selecionar novamente."}
          </p>
          <button type="button" onClick={handleBack}>
            Voltar para mundos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="canvas canvas--fullscreen">
      <header className="canvas__navbar">
        <div className="canvas__navbar-left">
          <button
            className="secondary canvas__nav-button"
            type="button"
            onClick={handleBack}
          >
            <ArrowLeftIcon />
            <span>Voltar para mundos</span>
          </button>
          <div className="canvas__world-info">
            <h1>{world.name}</h1>
            <p>{world.description || "Sem descrição"}</p>
          </div>
        </div>
        <div className="canvas__navbar-actions">
          <div className="canvas__zoom-controls">
            <button
              type="button"
              className="icon-button"
              onClick={handleZoomOut}
              aria-label="Diminuir zoom"
            >
              <MinusIcon />
            </button>
            <span className="canvas__zoom-value">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              className="icon-button"
              onClick={handleZoomIn}
              aria-label="Aumentar zoom"
            >
              <PlusIcon />
            </button>
            <button
              type="button"
              className="icon-button canvas__zoom-reset"
              onClick={handleResetZoom}
              aria-label="Restaurar zoom"
            >
              <RefreshIcon />
            </button>
          </div>
          <button
            type="button"
            className="button-with-icon"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <PlusIcon />
            Nova entidade
          </button>
          <button
            type="button"
            className="secondary canvas__nav-button"
            onClick={handleLogout}
          >
            Sair do SaaS
          </button>
        </div>
      </header>

      <main className="canvas__surface">
        {worldError && <p className="error canvas__world-error">{worldError}</p>}
        {error && <p className="error canvas__world-error">{error}</p>}
        <div className="canvas__board-wrapper">
          <div
            className="canvas__zoom-container"
            style={{
              width: boardDimensions.width * zoom,
              height: boardDimensions.height * zoom,
            }}
          >
            <div
              className="canvas__board"
              ref={canvasRef}
              style={{
                width: boardDimensions.width,
                height: boardDimensions.height,
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
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
                  pointerEvents: "none",
                }}
                width={boardDimensions.width}
                height={boardDimensions.height}
              >
                {relationEdges.map((edge) => {
                  const source = positions[edge.sourceId];
                  const target = positions[edge.targetId];
                  if (!source || !target) return null;

                  const { start, end } = getEdgeCoordinates(source, target);

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
                          paintOrder: "stroke",
                          stroke: "#1f2937",
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
                const entityColor =
                  ENTITY_TYPE_COLORS[entity.entity_type] ??
                  ENTITY_TYPE_COLORS.OTHER;
                const cardStyle: CSSVarProperties = {
                  left: position.x,
                  top: position.y,
                  "--entity-color": entityColor,
                  "--entity-color-soft": hexToRgba(entityColor, 0.22),
                  "--entity-color-strong": hexToRgba(entityColor, 0.45),
                };
                return (
                  <article
                    key={entity.id}
                    className="entity-node"
                    style={cardStyle}
                    onPointerDown={(event) => handlePointerDown(event, entity.id)}
                    onClick={(event) => handleEntityClick(event, entity)}
                  >
                    <header className="entity-node__header">
                      <h3 title={entity.name}>{entity.name}</h3>
                      <span className="entity-type">{entity.entity_type}</span>
                    </header>
                    <ul className="entity-node__attributes">
                      {preview.map(([key, value]) => (
                        <li key={key}>
                          <span className="entity-node__label" title={key}>
                            {key}
                          </span>
                          <span className="entity-node__value" title={value}>
                            {value}
                          </span>
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
              {createAttributeFields.map((field) => (
                <div key={field.id} className="attributes__row">
                  <input
                    placeholder="Chave (ex.: hair)"
                    value={field.key}
                    onChange={(event) =>
                      handleCreateAttributeChange(
                        field.id,
                        "key",
                        event.target.value
                      )
                    }
                  />
                  <input
                    placeholder="Valor (ex.: white)"
                    value={field.value}
                    onChange={(event) =>
                      handleCreateAttributeChange(
                        field.id,
                        "value",
                        event.target.value
                      )
                    }
                  />
                  <IconButton
                    label="Remover atributo"
                    variant="danger"
                    onClick={() => handleRemoveCreateAttribute(field.id)}
                    disabled={createAttributeFields.length === 1}
                    icon={<TrashIcon />}
                  />
                </div>
              ))}
              <button
                type="button"
                className="secondary button-with-icon"
                onClick={handleAddCreateAttribute}
              >
                <PlusIcon />
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
            <form className="entity-edit-form" onSubmit={handleEntityUpdate}>
              <div className="entity-edit-form__grid">
                <label className="field">
                  <span>Nome</span>
                  <input
                    name="name"
                    value={entityEditForm.name}
                    onChange={handleEntityEditFormChange}
                    required
                  />
                </label>
                <label className="field">
                  <span>Tipo</span>
                  <select
                    name="entity_type"
                    value={entityEditForm.entity_type}
                    onChange={handleEntityEditFormChange}
                  >
                    {ENTITY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="entity-edit-form__meta">
                <span className="entity-type entity-edit-form__type-badge">
                  {entityEditForm.entity_type}
                </span>
                <span className="entity-details__date">
                  Criado em {" "}
                  {new Date(selectedEntity.created_at).toLocaleDateString()}
                </span>
              </div>
              {entityUpdateError && (
                <p className="entity-details__error">{entityUpdateError}</p>
              )}
              <div className="entity-edit-form__actions">
                <button type="submit" disabled={isUpdatingEntity}>
                  {isUpdatingEntity
                    ? "Salvando dados..."
                    : "Salvar dados gerais"}
                </button>
              </div>
            </form>

            <form
              className="entity-attributes-form"
              onSubmit={handleAttributesUpdate}
            >
              <div className="entity-attributes-form__header">
                <h3>Atributos</h3>
                <button
                  type="button"
                  className="secondary button-with-icon"
                  onClick={handleAddEditAttribute}
                >
                  <PlusIcon />
                  Adicionar atributo
                </button>
              </div>
              <div className="entity-attributes-form__list">
                {editAttributeFields.length === 0 ? (
                  <p className="entity-details__empty entity-attributes-form__empty">
                    Sem atributos cadastrados.
                  </p>
                ) : (
                  editAttributeFields.map((field) => {
                    const isValueLong =
                      field.value.length > LONG_ATTRIBUTE_THRESHOLD ||
                      field.value.includes("\n");
                    const containerClass = isValueLong
                      ? "attribute-edit-field attribute-edit-field--stacked"
                      : "attribute-edit-field";
                    const valueClass = isValueLong
                      ? "attribute-edit-field__value attribute-edit-field__value--expanded"
                      : "attribute-edit-field__value";
                    return (
                      <div
                        key={field.id}
                        className={containerClass}
                      >
                        <div className="attribute-edit-field__inputs">
                          <label>
                            <span>Nome</span>
                            <input
                              value={field.key}
                              onChange={(event) =>
                                handleEditAttributeChange(
                                  field.id,
                                  "key",
                                  event.target.value
                                )
                              }
                              placeholder="Ex.: background"
                            />
                          </label>
                          <label className={valueClass}>
                            <span>Valor</span>
                            {isValueLong ? (
                              <textarea
                                value={field.value}
                                onChange={(event) =>
                                  handleEditAttributeChange(
                                    field.id,
                                    "value",
                                    event.target.value
                                  )
                                }
                                rows={Math.min(
                                  8,
                                  Math.max(
                                    3,
                                    Math.ceil(field.value.length / 60)
                                  )
                                )}
                                placeholder="Descreva o valor"
                              />
                            ) : (
                              <input
                                value={field.value}
                                onChange={(event) =>
                                  handleEditAttributeChange(
                                    field.id,
                                    "value",
                                    event.target.value
                                  )
                                }
                                placeholder="Valor"
                              />
                            )}
                          </label>
                        </div>
                        <IconButton
                          label="Remover atributo"
                          variant="danger"
                          onClick={() => handleRemoveEditAttribute(field.id)}
                          icon={<TrashIcon />}
                        />
                      </div>
                    );
                  })
                )}
              </div>
              {attributesUpdateError && (
                <p className="entity-details__error">
                  {attributesUpdateError}
                </p>
              )}
              <div className="entity-attributes-form__actions">
                <button type="submit" disabled={isUpdatingAttributes}>
                  {isUpdatingAttributes
                    ? "Salvando atributos..."
                    : "Salvar atributos"}
                </button>
              </div>
            </form>

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
