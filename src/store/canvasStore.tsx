import { create } from "zustand";
import { addEdge, applyNodeChanges, applyEdgeChanges } from "reactflow";

import type {
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
} from "reactflow";

// Dados iniciais
const initialNodes: Node[] = [
  {
    id: "1",
    position: { x: 0, y: 0 },
    data: { label: "Cidade de Ferro (Local)" },
    type: "input",
  },
  {
    id: "2",
    position: { x: -200, y: 150 },
    type: "character",
    data: {
      name: "Kaelen",
      title: "Guardião da Floresta",
      imageUrl: "https://i.pravatar.cc/150?u=kaelen",
    },
  },
];
const initialEdges: Edge[] = [
  { id: "e1-2", source: "1", target: "2", label: "contém" },
];

type CanvasState = {
  nodes: Node[];
  edges: Edge[];
  isModalOpen: boolean; // Estado para controlar o modal
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (node: Node) => void;
  toggleModal: () => void; // Ação para abrir/fechar o modal
};

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  isModalOpen: false,

  // A CORREÇÃO IMPORTANTE ESTÁ AQUI:
  // Usamos os helpers 'applyNodeChanges' e 'applyEdgeChanges' do react-flow
  // para calcular o próximo estado corretamente.
  onNodesChange: (changes: NodeChange[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  onConnect: (connection: Connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
  },
  addNode: (node) => {
    set({
      nodes: [...get().nodes, node],
    });
  },
  toggleModal: () => {
    set({ isModalOpen: !get().isModalOpen });
  },
}));
