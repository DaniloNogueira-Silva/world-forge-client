import { useCanvasStore } from "../store/canvasStore";

export function Toolbar() {
  const toggleModal = useCanvasStore((state) => state.toggleModal);

  return (
    <div className="absolute top-4 left-4 z-10 bg-gray-800 p-2 rounded-lg shadow-lg border border-gray-700">
      <button
        onClick={toggleModal} // Apenas abre o modal
        className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
      >
        Adicionar Personagem
      </button>
    </div>
  );
}
