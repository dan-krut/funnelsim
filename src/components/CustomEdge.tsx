import { memo } from "react";
import { EdgeProps, getBezierPath, EdgeLabelRenderer, BaseEdge } from "reactflow";
import { X } from "lucide-react";

interface CustomEdgeData {
  onDelete?: (edgeId: string) => void;
}

export const CustomEdge = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    label,
    data,
  }: EdgeProps<CustomEdgeData>) => {
    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });

    const { onDelete } = data || {};

    return (
      <>
        <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
        <EdgeLabelRenderer>
          {/* Delete button only (at midpoint) */}
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(id);
              }}
              className="bg-white dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900 border border-border shadow-sm rounded p-1"
              title="Delete connection"
            >
              <X className="h-3 w-3 text-destructive" />
            </button>
          </div>
        </EdgeLabelRenderer>
      </>
    );
  }
);

CustomEdge.displayName = "CustomEdge";
