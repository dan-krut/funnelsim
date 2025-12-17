// Utility functions for calculating funnel metrics

interface Node {
  id: string;
  data: {
    label?: string;
    name?: string;
    price?: number;
    conversion?: number;
    conversionRate?: number;
    nodeType?: string;
  };
}

interface Edge {
  source: string;
  target: string;
  sourceHandle?: string;
}

interface TrafficSource {
  visits: number;
  cost?: number;
}

// Per-node metrics type
export interface NodeMetrics {
  revenue: number;
  traffic: number;
  buyers: number;
}

// Edge traffic type
export interface EdgeTraffic {
  count: number;
  type: "buyers" | "pass";
}

// Extended result with all metrics
export interface FunnelMetricsResult {
  totalProfit: number;
  totalRevenue: number;
  totalCost: number;
  totalTraffic: number;
  nodeMetrics: Map<string, NodeMetrics>;
  edgeTraffic: Map<string, EdgeTraffic>;
}

// Health indicator color thresholds
export const getHealthColor = (conversion: number): "green" | "yellow" | "red" => {
  if (conversion >= 15) return "green";
  if (conversion >= 5) return "yellow";
  return "red";
};

// Original function - kept for backward compatibility
export const calculateFunnelRevenue = (
  nodes: Node[],
  edges: Edge[],
  trafficSources: TrafficSource[]
): number => {
  const result = calculateFunnelMetricsWithDetails(nodes, edges, trafficSources);
  return result.totalProfit;
};

// Extended function that returns per-node metrics
export const calculateFunnelMetricsWithDetails = (
  nodes: Node[],
  edges: Edge[],
  trafficSources: TrafficSource[]
): FunnelMetricsResult => {
  const nodeMetrics = new Map<string, NodeMetrics>();
  const edgeTraffic = new Map<string, EdgeTraffic>();

  // Calculate total initial traffic and costs
  const totalTraffic = trafficSources.reduce((sum, source) => sum + (source.visits || 0), 0);
  const totalCost = trafficSources.reduce((sum, source) => sum + (source.cost || 0), 0);

  if (!nodes?.length || !trafficSources?.length || totalTraffic === 0) {
    return {
      totalProfit: -totalCost,
      totalRevenue: 0,
      totalCost,
      totalTraffic,
      nodeMetrics,
      edgeTraffic,
    };
  }

  // Find the frontend node (first node)
  const frontEndNode = nodes.find((n) => n.data?.nodeType === "frontend") || nodes[0];
  if (!frontEndNode) {
    return {
      totalProfit: -totalCost,
      totalRevenue: 0,
      totalCost,
      totalTraffic,
      nodeMetrics,
      edgeTraffic,
    };
  }

  // Create a map for quick node lookup
  const nodeMap = new Map(nodes.map((n) => [n.id, n.data]));

  // Recursive function to process nodes following edges
  const processNode = (nodeId: string, incomingTraffic: number) => {
    const nodeData = nodeMap.get(nodeId);
    if (!nodeData || incomingTraffic <= 0) return;

    const conversion = (nodeData.conversion || nodeData.conversionRate || 0) / 100;
    const price = nodeData.price || 0;
    const buyers = Math.floor(incomingTraffic * conversion);
    const revenue = buyers * price;

    // Aggregate metrics for this node
    const existing = nodeMetrics.get(nodeId);
    if (existing) {
      existing.revenue += revenue;
      existing.traffic += incomingTraffic;
      existing.buyers += buyers;
    } else {
      nodeMetrics.set(nodeId, { revenue, traffic: incomingTraffic, buyers });
    }

    // Find outgoing edges
    const yesEdge = edges.find((e) => e.source === nodeId && e.sourceHandle === "yes");
    const noEdge = edges.find((e) => e.source === nodeId && e.sourceHandle === "no");

    // Track edge traffic
    if (yesEdge) {
      const edgeKey = `${nodeId}-yes`;
      const existingEdge = edgeTraffic.get(edgeKey);
      if (existingEdge) {
        existingEdge.count += buyers;
      } else {
        edgeTraffic.set(edgeKey, { count: buyers, type: "buyers" });
      }
    }

    if (noEdge) {
      const nonBuyers = incomingTraffic - buyers;
      const edgeKey = `${nodeId}-no`;
      const existingEdge = edgeTraffic.get(edgeKey);
      if (existingEdge) {
        existingEdge.count += nonBuyers;
      } else {
        edgeTraffic.set(edgeKey, { count: nonBuyers, type: "pass" });
      }
    }

    // Process child nodes
    if (noEdge) {
      processNode(noEdge.target, incomingTraffic - buyers);
    }
    if (yesEdge) {
      processNode(yesEdge.target, buyers);
    }
  };

  // Start processing from the frontend node
  processNode(frontEndNode.id, totalTraffic);

  // Sum up all revenue
  const totalRevenue = Array.from(nodeMetrics.values()).reduce((sum, m) => sum + m.revenue, 0);

  return {
    totalProfit: totalRevenue - totalCost,
    totalRevenue,
    totalCost,
    totalTraffic,
    nodeMetrics,
    edgeTraffic,
  };
};

// Calculate sensitivity: revenue delta when node's conversion increases by 1%
export const calculateSensitivity = (
  nodes: Node[],
  edges: Edge[],
  trafficSources: TrafficSource[],
  nodeId: string
): number => {
  // Check if node exists
  const nodeExists = nodes.find((n) => n.id === nodeId);
  if (!nodeExists) return 0;

  // Calculate baseline revenue
  const baseline = calculateFunnelMetricsWithDetails(nodes, edges, trafficSources);

  // Create modified nodes with +1% conversion for the target node
  const modifiedNodes = nodes.map((node) => {
    if (node.id === nodeId) {
      const currentConversion = node.data.conversion || node.data.conversionRate || 0;
      return {
        ...node,
        data: {
          ...node.data,
          conversion: Math.min(currentConversion + 1, 100), // Cap at 100%
        },
      };
    }
    return node;
  });

  // Calculate modified revenue
  const modified = calculateFunnelMetricsWithDetails(modifiedNodes, edges, trafficSources);

  // Return the difference
  return modified.totalRevenue - baseline.totalRevenue;
};

export const formatCurrency = (amount: number): string => {
  const absAmount = Math.abs(amount);
  const isNegative = amount < 0;
  const prefix = isNegative ? "-$" : "$";

  if (absAmount >= 1000000) {
    return `${prefix}${(absAmount / 1000000).toFixed(1)}M`;
  } else if (absAmount >= 1000) {
    return `${prefix}${(absAmount / 1000).toFixed(1)}K`;
  }
  return `${prefix}${absAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
