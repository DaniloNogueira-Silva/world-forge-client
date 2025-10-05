import React, { useState } from "react";
import { useCanvasStore } from "../store/canvasStore";
import type { Node } from "reactflow";

export function CreateNodeModal() {
  const { isModalOpen, toggleModal, addNode } = useCanvasStore();
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");

  if (!isModalOpen) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !title) return;

    const newNode: Node = {
      id: `char_${Date.now()}`,
      position: { x: Math.random() * 200, y: Math.random() * 200 },
      type: "character",
      data: {
        name,
        title,
        imageUrl: `https://i.pravatar.cc/150?u=${Date.now()}`,
      },
    };

    addNode(newNode);
    toggleModal(); // Fecha o modal após a criação
    // Limpa o formulário
    setName("");
    setTitle("");
  };

  return (
    // Backdrop
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black bg-opacity-50">
      {/* Modal Panel */}
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">
            Criar Novo Personagem
          </h2>
          <button
            onClick={toggleModal}
            className="text-gray-400 hover:text-white"
          >
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-gray-300 mb-2">
              Nome
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div className="mb-6">
            <label htmlFor="title" className="block text-gray-300 mb-2">
              Título
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
            >
              Criar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
