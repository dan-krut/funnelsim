import { useCallback, useState, useRef, useEffect, useMemo } from "react";
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MarkerType,
  useReactFlow,
  getNodesBounds,
  getViewportForBounds,
  getRectOfNodes,
  getTransformForBounds,
} from "reactflow";
import "reactflow/dist/style.css";
import { toPng } from "html-to-image";
import { FunnelNode } from "./FunnelNode";
import { CustomEdge } from "./CustomEdge";
import { ContextMenu } from "./ContextMenu";
import { TrafficInput } from "./TrafficInput";
import { FunnelMetricsTable } from "./FunnelMetricsTable";
import { BreakevenPanel } from "./BreakevenPanel";
import { ExportMenu } from "./ExportMenu";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { calculateFunnelMetricsWithDetails } from "@/lib/funnelCalculations";

const nodeTypes = {
  funnelStep: FunnelNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

const initialNodes: Node[] = [
  {
    id: "1",
    type: "funnelStep",
    position: { x: 250, y: 50 },
    data: {
      name: "Front End",
      price: 47,
      conversion: 10,
      nodeType: "frontend",
    },
  },
  {
    id: "2",
    type: "funnelStep",
    position: { x: 250, y: 200 },
    data: {
      name: "OTO 2",
      price: 197,
      conversion: 10,
      nodeType: "oto",
    },
  },
  {
    id: "3",
    type: "funnelStep",
    position: { x: 500, y: 350 },
    data: {
      name: "Downsell 5",
      price: 47,
      conversion: 100,
      nodeType: "downsell",
    },
  },
  {
    id: "4",
    type: "funnelStep",
    position: { x: 350, y: 500 },
    data: {
      name: "OTO 3",
      price: 197,
      conversion: 100,
      nodeType: "oto",
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: "e1-2",
    source: "1",
    target: "2",
    sourceHandle: "yes",
    type: "custom",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
    label: "Buy",
    style: { stroke: "#10b981" },
  },
  {
    id: "e2-3",
    source: "2",
    target: "3",
    sourceHandle: "no",
    type: "custom",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
    label: "No Thanks",
    style: { stroke: "#ef4444" },
  },
  {
    id: "e2-4",
    source: "2",
    target: "4",
    sourceHandle: "yes",
    type: "custom",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
    label: "Buy",
    style: { stroke: "#10b981" },
  },
  {
    id: "e3-4-yes",
    source: "3",
    target: "4",
    sourceHandle: "yes",
    type: "custom",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
    label: "Buy",
    style: { stroke: "#10b981" },
  },
  {
    id: "e3-4-no",
    source: "3",
    target: "4",
    sourceHandle: "no",
    type: "custom",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
    label: "No Thanks",
    style: { stroke: "#ef4444" },
  },
];

interface TrafficSource {
  id: string;
  type: string;
  visits: number;
  cost: number;
}

interface FunnelCanvasProps {
  funnelId?: string;
  initialData?: {
    name: string;
    nodes: Node[];
    edges: Edge[];
    traffic_sources: TrafficSource[];
  };
  onNameChange?: (name: string) => void;
  canvasRef?: React.RefObject<HTMLDivElement>;
  addNodeRef?: React.MutableRefObject<((type: "oto" | "downsell") => void) | null>;
  exportFunctionsRef?: React.MutableRefObject<{
    exportToPNG: () => Promise<void>;
    exportToPDF: () => Promise<void>;
  } | null>;
}

export const FunnelCanvas = ({ funnelId, initialData, onNameChange, canvasRef, addNodeRef, exportFunctionsRef }: FunnelCanvasProps) => {
  // Ensure frontend node always exists
  const getInitialNodes = () => {
    if (initialData?.nodes) {
      const hasFrontend = initialData.nodes.some(n => n.data.nodeType === "frontend");
      if (!hasFrontend) {
        // Add frontend node if missing
        return [initialNodes[0], ...initialData.nodes];
      }
      return initialData.nodes;
    }
    return initialNodes;
  };

  const [nodes, setNodes, onNodesChange] = useNodesState(getInitialNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialData ? initialData.edges : initialEdges
  );
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>(
    initialData?.traffic_sources && initialData.traffic_sources.length > 0
      ? initialData.traffic_sources
      : [{ id: "1", type: "Organic", visits: 1000, cost: 0 }]
  );
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; clickPos: { x: number; y: number } } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const localCanvasRef = useRef<HTMLDivElement>(null);
  const reactFlowWrapper = canvasRef || localCanvasRef;
  const metricsTableRef = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  const { screenToFlowPosition } = reactFlowInstance;

  const deleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
      toast.success("Connection deleted");
    },
    [setEdges]
  );

  // Ensure all edges have the delete callback
  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        data: { ...edge.data, onDelete: deleteEdge },
      }))
    );
  }, [deleteEdge, setEdges]);

  // Auto-save functionality
  useEffect(() => {
    if (!funnelId) return;

    const autoSave = setTimeout(() => {
      saveFunnel();
    }, 2000);

    return () => clearTimeout(autoSave);
  }, [nodes, edges, trafficSources, funnelId]);

  const saveFunnel = async () => {
    if (!funnelId) return;

    const { error } = await supabase
      .from("funnels")
      .update({
        nodes: nodes as any,
        edges: edges as any,
        traffic_sources: trafficSources as any,
      })
      .eq("id", funnelId);

    if (error) {
      toast.error("Failed to save funnel");
    }
  };

  const totalVisits = trafficSources.reduce((sum, s) => sum + s.visits, 0);
  const totalCost = trafficSources.reduce((sum, s) => sum + s.cost, 0);

  const onConnect = useCallback(
    (params: Connection) => {
      // Check if source already has a connection from this handle
      const existingConnection = edges.find(
        (e) => e.source === params.source && e.sourceHandle === params.sourceHandle
      );

      if (existingConnection) {
        toast.error("Each output can only connect to one node. Delete the existing connection first.");
        return;
      }

      // Prevent "Buy" connections from going to downsells
      const targetNode = nodes.find((n) => n.id === params.target);
      if (targetNode?.data.nodeType === "downsell" && params.sourceHandle === "yes") {
        toast.error("A 'Buy' cannot connect to a Downsell. Only 'No Thanks' can go to downsells.");
        return;
      }

      const edge = {
        ...params,
        type: "custom",
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
        label: params.sourceHandle === "yes" ? "Buy" : "No Thanks",
        style: { stroke: params.sourceHandle === "yes" ? "#10b981" : "#ef4444" },
        data: { onDelete: deleteEdge },
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges, edges, deleteEdge, nodes]
  );

  const updateNodeData = useCallback(
    (nodeId: string, field: string, value: any) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                [field]: value,
              },
            };
          }
          return node;
        })
      );
    },
    [setNodes]
  );

  const addNode = useCallback((type: "oto" | "downsell", position?: { x: number; y: number }) => {
    const maxY = nodes.reduce((max, node) => Math.max(max, node.position.y), 0);
    const nodePosition = position || { x: 250 + Math.random() * 100, y: maxY + 150 };

    // Count existing nodes of this type to determine the number
    const existingCount = nodes.filter(n => n.data.nodeType === type).length;
    const nodeNumber = existingCount + 1;

    // Generate a unique ID
    const newNodeId = `${type}-${Date.now()}`;

    const newNode: Node = {
      id: newNodeId,
      type: "funnelStep",
      position: nodePosition,
      data: {
        name: type === "oto" ? `OTO ${nodeNumber}` : `Downsell ${nodeNumber}`,
        price: type === "oto" ? 197 : 47,
        conversion: type === "oto" ? 25 : 40,
        nodeType: type,
        traffic: 0,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [nodes, setNodes]);

  // Expose addNode via ref
  useEffect(() => {
    if (addNodeRef) {
      addNodeRef.current = addNode;
    }
  }, [addNode, addNodeRef]);

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    },
    [setNodes, setEdges]
  );

  const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();

    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      clickPos: position,
    });
  }, [screenToFlowPosition]);

  // Calculate metrics based on flow
  const calculateMetrics = () => {
    const nodeMap = new Map(nodes.map((n) => [n.id, { ...n.data, buyers: 0, revenue: 0, trafficIn: 0 }]));

    // Start with front end node
    const frontEndNode = nodes.find((n) => n.data.nodeType === "frontend");
    if (!frontEndNode) return { stepMetrics: [], totalRevenue: 0 };

    const metricsMap = new Map<string, {
      name: string;
      trafficIn: number;
      conversions: number;
      revenue: number;
      order: number;
      nodeId: string;
    }>();

    const processNode = (nodeId: string, incomingTraffic: number, order: number) => {
      const node = nodeMap.get(nodeId);
      if (!node) return;

      const buyers = Math.floor((incomingTraffic * node.conversion) / 100);
      const revenue = buyers * node.price;

      // Aggregate metrics for this node
      const existing = metricsMap.get(nodeId);
      if (existing) {
        existing.trafficIn += incomingTraffic;
        existing.conversions += buyers;
        existing.revenue += revenue;
        // Keep the first order encountered, don't update
      } else {
        metricsMap.set(nodeId, {
          name: node.name,
          trafficIn: incomingTraffic,
          conversions: buyers,
          revenue: revenue,
          order: order,
          nodeId: nodeId,
        });
      }

      // Find outgoing edges - process "no" edge first so downsells appear before next OTOs
      const yesEdge = edges.find((e) => e.source === nodeId && e.sourceHandle === "yes");
      const noEdge = edges.find((e) => e.source === nodeId && e.sourceHandle === "no");

      // Process "no" edge (downsells) before "yes" edge (next OTOs) for better ordering
      if (noEdge) {
        processNode(noEdge.target, incomingTraffic - buyers, order + 1);
      }
      if (yesEdge) {
        processNode(yesEdge.target, buyers, order + 1);
      }

    };

    processNode(frontEndNode.id, totalVisits, 0);

    // Convert map to array and add EPC calculation
    const stepMetrics = Array.from(metricsMap.values()).map(metric => ({
      ...metric,
      epc: metric.trafficIn > 0 ? metric.revenue / metric.trafficIn : 0,
    }));

    // Sort by order to show logical flow
    stepMetrics.sort((a, b) => a.order - b.order);

    const totalRevenue = stepMetrics.reduce((sum, s) => sum + s.revenue, 0);

    return { stepMetrics, totalRevenue };
  };

  const { stepMetrics, totalRevenue } = calculateMetrics();

  // Compute detailed metrics with debounce for analytics display
  const [debouncedAnalytics, setDebouncedAnalytics] = useState<{
    nodeMetrics: Map<string, { revenue: number; traffic: number; buyers: number }>;
    edgeTraffic: Map<string, { count: number; type: "buyers" | "pass" }>;
    epc: number;
  }>({
    nodeMetrics: new Map(),
    edgeTraffic: new Map(),
    epc: 0,
  });

  // Debounced analytics calculation
  useEffect(() => {
    const timer = setTimeout(() => {
      const trafficSourcesForCalc = trafficSources.map((s) => ({
        visits: s.visits,
        cost: s.cost,
      }));

      const detailedMetrics = calculateFunnelMetricsWithDetails(
        nodes.map((n) => ({ id: n.id, data: n.data })),
        edges.map((e) => ({
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
        })),
        trafficSourcesForCalc
      );

      const epc = detailedMetrics.totalTraffic > 0
        ? detailedMetrics.totalRevenue / detailedMetrics.totalTraffic
        : 0;

      setDebouncedAnalytics({
        nodeMetrics: detailedMetrics.nodeMetrics,
        edgeTraffic: detailedMetrics.edgeTraffic,
        epc,
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [nodes, edges, trafficSources]);

  // Update node data with calculated metrics
  const nodesWithMetrics = useMemo(() => {
    return nodes.map((node) => {
      const nodeMetrics = debouncedAnalytics.nodeMetrics.get(node.id);
      // Calculate buyers and pass counts for traffic indicators
      const traffic = nodeMetrics?.traffic || 0;
      const buyers = nodeMetrics?.buyers || 0;
      const passCount = traffic - buyers;

      return {
        ...node,
        data: {
          ...node.data,
          onUpdate: updateNodeData,
          onDelete: deleteNode,
          isExporting,
          revenue: nodeMetrics?.revenue,
          buyersCount: buyers,
          passCount: passCount > 0 ? passCount : undefined,
          // Pass funnel data for sensitivity calculation
          allNodes: nodes.map((n) => ({ id: n.id, data: n.data })),
          allEdges: edges.map((e) => ({
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
          })),
          trafficSources: trafficSources.map((s) => ({
            visits: s.visits,
            cost: s.cost,
          })),
        },
      };
    });
  }, [nodes, edges, trafficSources, debouncedAnalytics.nodeMetrics, updateNodeData, deleteNode, isExporting]);

  // Update edges with delete callback
  const edgesWithCallbacks = useMemo(() => {
    return edges.map((edge) => ({
      ...edge,
      data: {
        ...edge.data,
        onDelete: deleteEdge,
      },
    }));
  }, [edges, deleteEdge]);

  // Helper function to create export HTML
  const createExportHTML = useCallback(() => {
    const exportContainer = document.createElement('div');
    exportContainer.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: 1400px;
      background: white;
      padding: 40px;
      font-family: system-ui, -apple-system, sans-serif;
      z-index: -9999;
      pointer-events: none;
      opacity: 0.01;
    `;

    if (nodes.length === 0) return null;

    // Calculate bounding box of all nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(node => {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + 280); // 280 is approx node width
      maxY = Math.max(maxY, node.position.y + 180); // 180 is approx node height
    });

    const canvasWidth = maxX - minX;
    const canvasHeight = maxY - minY;

    // Scale to fit within 1000px width (leaving room for padding)
    const targetWidth = 1000;
    const scale = Math.min(targetWidth / canvasWidth, 1.2); // Cap at 1.2x for readability
    const scaledHeight = canvasHeight * scale;

    // Helper to scale positions
    const scalePos = (x: number, y: number) => ({
      x: (x - minX) * scale + 80, // Add left margin
      y: (y - minY) * scale + 80,  // Add top margin
    });

    // Helper to render a node card at a specific position
    const renderNode = (node: Node, pos: { x: number, y: number }) => {
      const colors = {
        frontend: '#dbeafe',
        oto: '#d1fae5',
        downsell: '#fed7aa',
      };

      const borderColors = {
        frontend: '#3b82f6',
        oto: '#10b981',
        downsell: '#f97316',
      };

      const nodeWidth = 240 * scale;
      const nodeHeight = 120 * scale;

      return `
        <div style="
          position: absolute;
          left: ${pos.x}px;
          top: ${pos.y}px;
          background: ${colors[node.data.nodeType as keyof typeof colors]};
          border: 2px solid ${borderColors[node.data.nodeType as keyof typeof borderColors]};
          border-radius: 8px;
          padding: ${16 * scale}px;
          width: ${nodeWidth}px;
          box-sizing: border-box;
        ">
          <div style="font-weight: 600; font-size: ${15 * scale}px; margin-bottom: ${12 * scale}px; text-align: center;">
            ${node.data.name}
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: ${12 * scale}px;">
            <div>
              <div style="font-size: ${10 * scale}px; color: #64748b; margin-bottom: ${4 * scale}px;">Price</div>
              <div style="font-weight: 500; font-size: ${14 * scale}px;">$${node.data.price}</div>
            </div>
            <div>
              <div style="font-size: ${10 * scale}px; color: #64748b; margin-bottom: ${4 * scale}px;">Conv %</div>
              <div style="font-weight: 500; font-size: ${14 * scale}px;">${node.data.conversion}%</div>
            </div>
          </div>
        </div>
      `;
    };

    // Build SVG for connections
    const renderEdges = () => {
      return edges.map(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        if (!sourceNode || !targetNode) return '';

        const sourcePos = scalePos(sourceNode.position.x, sourceNode.position.y);
        const targetPos = scalePos(targetNode.position.x, targetNode.position.y);

        const nodeWidth = 240 * scale;
        const nodeHeight = 120 * scale;

        // Calculate connection points
        // Source: bottom center (with offset for yes/no handles)
        let sourceX = sourcePos.x + nodeWidth / 2;
        const sourceY = sourcePos.y + nodeHeight;

        // Offset for yes (left) and no (right) handles
        if (edge.sourceHandle === 'yes') {
          if (sourceNode.data.nodeType === 'frontend') {
            sourceX = sourcePos.x + nodeWidth / 2; // Center for frontend
          } else {
            sourceX = sourcePos.x + nodeWidth * 0.3; // Left for OTO/downsell
          }
        } else if (edge.sourceHandle === 'no') {
          sourceX = sourcePos.x + nodeWidth * 0.7; // Right
        }

        // Target: top center
        const targetX = targetPos.x + nodeWidth / 2;
        const targetY = targetPos.y;

        const color = edge.sourceHandle === 'yes' ? '#10b981' : '#ef4444';
        const strokeWidth = 2;

        // Create curved path
        const midY = (sourceY + targetY) / 2;
        const path = `M ${sourceX} ${sourceY} C ${sourceX} ${midY}, ${targetX} ${midY}, ${targetX} ${targetY}`;

        return `
          <path
            d="${path}"
            stroke="${color}"
            stroke-width="${strokeWidth}"
            stroke-dasharray="5,5"
            fill="none"
            marker-end="url(#arrowhead-${edge.sourceHandle})"
          />
        `;
      }).join('');
    };

    // Generate HTML with positioned nodes and SVG connections
    const totalHeight = scaledHeight + 160;
    let html = `
      <div style="max-width: 1160px;">
        <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 24px; color: #0f172a;">
          Funnel Structure
        </h1>
        <div style="position: relative; height: ${totalHeight}px; margin-bottom: 40px;">
          <svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1;">
            <defs>
              <marker id="arrowhead-yes" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#10b981" />
              </marker>
              <marker id="arrowhead-no" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#ef4444" />
              </marker>
            </defs>
            ${renderEdges()}
          </svg>
          <div style="position: relative; z-index: 2;">
            ${nodes.map(node => {
              const pos = scalePos(node.position.x, node.position.y);
              return renderNode(node, pos);
            }).join('')}
          </div>
        </div>

        <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px; color: #0f172a;">
          Traffic Sources
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 14px;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Type</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">Visits</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">Cost</th>
            </tr>
          </thead>
          <tbody>
            ${trafficSources.map(source => `
              <tr>
                <td style="padding: 12px; border: 1px solid #e2e8f0;">${source.type}</td>
                <td style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">${source.visits.toLocaleString()}</td>
                <td style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">$${source.cost.toLocaleString()}</td>
              </tr>
            `).join('')}
            <tr style="background: #f8fafc; font-weight: 600;">
              <td style="padding: 12px; border: 1px solid #e2e8f0;">Total</td>
              <td style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">${totalVisits.toLocaleString()}</td>
              <td style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">$${totalCost.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px; color: #0f172a;">
          Funnel Metrics
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Step</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">Conversions</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">Revenue</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">EPC</th>
            </tr>
          </thead>
          <tbody>
            ${stepMetrics.map(metric => `
              <tr>
                <td style="padding: 12px; border: 1px solid #e2e8f0;">${metric.name}</td>
                <td style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">${metric.conversions.toLocaleString()}</td>
                <td style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">$${metric.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">$${metric.epc.toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr style="background: #f8fafc; font-weight: 600;">
              <td style="padding: 12px; border: 1px solid #e2e8f0;">Sub Total</td>
              <td style="padding: 12px; border: 1px solid #e2e8f0;"></td>
              <td style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">$${(totalRevenue / totalVisits).toFixed(2)}</td>
            </tr>
            <tr style="color: #dc2626;">
              <td style="padding: 12px; border: 1px solid #e2e8f0;">Costs</td>
              <td style="padding: 12px; border: 1px solid #e2e8f0;"></td>
              <td style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">-$${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style="padding: 12px; border: 1px solid #e2e8f0;"></td>
            </tr>
            <tr style="background: #dcfce7; font-weight: 700; font-size: 16px;">
              <td style="padding: 12px; border: 1px solid #e2e8f0;">Total Profit</td>
              <td style="padding: 12px; border: 1px solid #e2e8f0;"></td>
              <td style="padding: 12px; text-align: right; border: 1px solid #e2e8f0; color: #16a34a;">$${(totalRevenue - totalCost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style="padding: 12px; border: 1px solid #e2e8f0;"></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    exportContainer.innerHTML = html;
    return exportContainer;
  }, [nodes, edges, trafficSources, totalVisits, totalCost, stepMetrics, totalRevenue]);

  // Export functions
  const exportToPNG = useCallback(async () => {
    try {
      setIsExporting(true);

      // Create export HTML
      const exportContainer = createExportHTML();
      if (!exportContainer) {
        throw new Error("Could not create export HTML");
      }

      // Hide the main content temporarily
      const root = document.getElementById('root');
      const originalDisplay = root?.style.display || '';
      if (root) root.style.display = 'none';

      // Show export container on screen
      exportContainer.style.cssText = `
        position: fixed;
        left: 0;
        top: 0;
        width: 1400px;
        background: white;
        padding: 40px;
        font-family: system-ui, -apple-system, sans-serif;
        z-index: 9999;
        pointer-events: none;
      `;

      // Append to body
      document.body.appendChild(exportContainer);

      // Wait for fonts and layout
      await new Promise(resolve => setTimeout(resolve, 300));

      // Capture
      const dataUrl = await toPng(exportContainer, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        cacheBust: true,
      });

      // Remove export container and restore main content
      document.body.removeChild(exportContainer);
      if (root) root.style.display = originalDisplay;

      // Download
      const link = document.createElement("a");
      link.download = `funnel-export-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      toast.success("Funnel exported as image!");
    } catch (error) {
      toast.error("Failed to export image");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  }, [createExportHTML]);

  const exportToPDF = useCallback(async () => {
    try {
      setIsExporting(true);

      // Create export HTML
      const exportContainer = createExportHTML();
      if (!exportContainer) {
        throw new Error("Could not create export HTML");
      }

      // Hide the main content temporarily
      const root = document.getElementById('root');
      const originalDisplay = root?.style.display || '';
      if (root) root.style.display = 'none';

      // Show export container on screen
      exportContainer.style.cssText = `
        position: fixed;
        left: 0;
        top: 0;
        width: 1400px;
        background: white;
        padding: 40px;
        font-family: system-ui, -apple-system, sans-serif;
        z-index: 9999;
        pointer-events: none;
      `;

      // Append to body
      document.body.appendChild(exportContainer);

      // Wait for fonts and layout
      await new Promise(resolve => setTimeout(resolve, 300));

      // Capture
      const dataUrl = await toPng(exportContainer, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        cacheBust: true,
      });

      // Remove export container and restore main content
      document.body.removeChild(exportContainer);
      if (root) root.style.display = originalDisplay;

      // Create PDF - A4 size (595 x 842 points)
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      // Calculate dimensions to fit content
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = dataUrl;
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = img.width;
      const imgHeight = img.height;

      // Scale to fit width
      const ratio = pdfWidth / imgWidth;
      const scaledHeight = imgHeight * ratio;

      // If it fits on one page, add it
      if (scaledHeight <= pdfHeight) {
        pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, scaledHeight);
      } else {
        // Scale to fit height instead
        const heightRatio = pdfHeight / imgHeight;
        const scaledWidth = imgWidth * heightRatio;
        const x = (pdfWidth - scaledWidth) / 2;
        pdf.addImage(dataUrl, "PNG", x, 0, scaledWidth, pdfHeight);
      }

      pdf.save(`funnel-export-${Date.now()}.pdf`);

      toast.success("Funnel exported as PDF!");
    } catch (error) {
      toast.error("Failed to export PDF");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  }, [createExportHTML]);

  // Expose export functions via ref
  useEffect(() => {
    if (exportFunctionsRef) {
      exportFunctionsRef.current = {
        exportToPNG,
        exportToPDF,
      };
    }
  }, [exportToPNG, exportToPDF, exportFunctionsRef]);

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onAddOTO={() => addNode("oto", contextMenu.clickPos)}
          onAddDownsell={() => addNode("downsell", contextMenu.clickPos)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {!funnelId && (
        <div className="p-4">
          <header className="text-center space-y-1">
            <h1 className="text-3xl font-bold text-foreground">Visual Funnel Builder</h1>
            <p className="text-sm text-muted-foreground">
              Drag nodes, connect paths, and model your branching funnel
            </p>
          </header>
        </div>
      )}

      <div className="flex-1 bg-card relative" ref={reactFlowWrapper}>
        <div className={isExporting ? "hidden" : ""}>
          <TrafficInput
            sources={trafficSources}
            onSourcesChange={setTrafficSources}
          />
        </div>

        <div ref={metricsTableRef}>
          <FunnelMetricsTable
            steps={stepMetrics}
            totalTraffic={totalVisits}
            totalRevenue={totalRevenue}
            cost={totalCost}
          />
        </div>

        {/* Breakeven Panel - top right */}
        {!isExporting && (
          <BreakevenPanel
            totalCost={totalCost}
            totalRevenue={totalRevenue}
            totalTraffic={totalVisits}
            epc={debouncedAnalytics.epc}
          />
        )}

        <ReactFlow
          nodes={nodesWithMetrics}
          edges={edgesWithCallbacks}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onPaneContextMenu={onPaneContextMenu}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          minZoom={0.1}
          maxZoom={2}
          defaultViewport={{ x: 400, y: 50, zoom: 1 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          {!isExporting && <Controls position="bottom-right" />}
        </ReactFlow>
      </div>
    </div>
  );
};
