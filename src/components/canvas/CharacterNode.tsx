import { memo } from "react";
import { Handle, Position } from "reactflow";
import type { NodeProps } from "reactflow";

// Os dados que nosso nó de personagem receberá
type CharacterNodeData = {
  name: string;
  title: string;
  imageUrl?: string;
};

// Usamos memo para otimizar a performance, evitando re-renderizações desnecessárias
export const CharacterNode = memo(({ data }: NodeProps<CharacterNodeData>) => {
  return (
    <div className="bg-gray-800 border-2 border-cyan-500 rounded-lg shadow-lg text-white w-48 overflow-hidden">
      {/* Handle são os pontos de conexão para as linhas/arestas */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-16 !bg-teal-500"
      />

      <div className="p-4">
        {data.imageUrl && (
          <img
            src={data.imageUrl}
            alt={data.name}
            className="w-16 h-16 rounded-full mx-auto mb-2 border-2 border-gray-600"
          />
        )}
        <div className="text-center">
          <h3 className="text-lg font-bold text-cyan-400">{data.name}</h3>
          <p className="text-sm text-gray-300">{data.title}</p>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-16 !bg-teal-500"
      />
    </div>
  );
});
