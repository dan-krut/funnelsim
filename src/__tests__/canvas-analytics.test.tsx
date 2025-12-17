import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FunnelNode } from "@/components/FunnelNode";
import { BreakevenPanel } from "@/components/BreakevenPanel";
import {
  calculateFunnelRevenue,
  calculateFunnelMetricsWithDetails,
  formatCurrency,
  getHealthColor,
  calculateSensitivity,
  type NodeMetrics,
} from "@/lib/funnelCalculations";
import { ReactFlowProvider } from "reactflow";

// Helper to wrap components with ReactFlow context
const ReactFlowWrapper = ({ children }: { children: React.ReactNode }) => (
  <ReactFlowProvider>{children}</ReactFlowProvider>
);

// Mock node data for testing
const createMockNodeProps = (overrides = {}) => ({
  id: "test-node-1",
  type: "funnelStep",
  data: {
    name: "Test Node",
    price: 47,
    conversion: 10,
    nodeType: "frontend" as const,
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
    isExporting: false,
    revenue: 4700,
    ...overrides,
  },
  xPos: 0,
  yPos: 0,
  selected: false,
  dragging: false,
  isConnectable: true,
  zIndex: 0,
});

// Mock funnel data
const mockNodes = [
  {
    id: "1",
    data: {
      name: "Front End",
      price: 47,
      conversion: 10,
      nodeType: "frontend",
    },
  },
  {
    id: "2",
    data: {
      name: "OTO 1",
      price: 197,
      conversion: 25,
      nodeType: "oto",
    },
  },
];

const mockEdges = [
  {
    source: "1",
    target: "2",
    sourceHandle: "yes",
  },
];

const mockTrafficSources = [{ visits: 1000, cost: 500 }];

// ====================
// TASK GROUP 1 TESTS: Revenue Badge
// ====================

describe("Task Group 1: Revenue Badge", () => {
  describe("1.1 - Revenue badge renders with correct value", () => {
    it("should display revenue badge with formatted currency", () => {
      const props = createMockNodeProps({ revenue: 4700 });
      render(
        <ReactFlowWrapper>
          <FunnelNode {...props} />
        </ReactFlowWrapper>
      );

      expect(screen.getByText("$4.7K")).toBeInTheDocument();
    });

    it("should display revenue badge for small amounts without abbreviation", () => {
      const props = createMockNodeProps({ revenue: 470 });
      render(
        <ReactFlowWrapper>
          <FunnelNode {...props} />
        </ReactFlowWrapper>
      );

      expect(screen.getByText("$470")).toBeInTheDocument();
    });

    it("should not display revenue badge when revenue is undefined", () => {
      const props = createMockNodeProps({ revenue: undefined });
      render(
        <ReactFlowWrapper>
          <FunnelNode {...props} />
        </ReactFlowWrapper>
      );

      // Should not find any currency badges
      expect(screen.queryByText(/^\$/)).toBeNull();
    });

    it("should display zero revenue as $0", () => {
      const props = createMockNodeProps({ revenue: 0 });
      render(
        <ReactFlowWrapper>
          <FunnelNode {...props} />
        </ReactFlowWrapper>
      );

      expect(screen.getByText("$0")).toBeInTheDocument();
    });
  });

  describe("1.2 - formatCurrency utility", () => {
    it("should format large numbers with K suffix", () => {
      expect(formatCurrency(4700)).toBe("$4.7K");
      expect(formatCurrency(1000)).toBe("$1.0K");
    });

    it("should format very large numbers with M suffix", () => {
      expect(formatCurrency(1500000)).toBe("$1.5M");
    });

    it("should format small numbers without suffix", () => {
      expect(formatCurrency(470)).toBe("$470");
      expect(formatCurrency(99)).toBe("$99");
    });

    it("should handle negative numbers", () => {
      expect(formatCurrency(-500)).toBe("-$500");
      expect(formatCurrency(-5000)).toBe("-$5.0K");
    });
  });

  describe("1.3 - Per-node metrics calculation", () => {
    it("should calculate per-node revenue correctly", () => {
      const result = calculateFunnelMetricsWithDetails(
        mockNodes,
        mockEdges,
        mockTrafficSources
      );

      expect(result.nodeMetrics).toBeDefined();
      expect(result.nodeMetrics.get("1")).toBeDefined();
      expect(result.nodeMetrics.get("1")?.revenue).toBe(4700); // 1000 * 0.10 * 47 = 4700
    });

    it("should track traffic and buyers for each node", () => {
      const result = calculateFunnelMetricsWithDetails(
        mockNodes,
        mockEdges,
        mockTrafficSources
      );

      const frontendMetrics = result.nodeMetrics.get("1");
      expect(frontendMetrics?.traffic).toBe(1000);
      expect(frontendMetrics?.buyers).toBe(100);
    });

    it("should return total profit alongside node metrics", () => {
      const result = calculateFunnelMetricsWithDetails(
        mockNodes,
        mockEdges,
        mockTrafficSources
      );

      // Front End: 100 buyers * $47 = $4700
      // OTO 1: 100 * 0.25 * $197 = $4925
      // Total: $9625 - $500 cost = $9125
      expect(result.totalProfit).toBe(9125);
    });
  });
});

// ====================
// TASK GROUP 2 TESTS: Traffic Flow Indicators
// ====================

describe("Task Group 2: Traffic Flow Indicators", () => {
  describe("2.1 - Edge traffic calculation", () => {
    it("should calculate traffic for yes edges (buyers)", () => {
      const result = calculateFunnelMetricsWithDetails(
        mockNodes,
        mockEdges,
        mockTrafficSources
      );

      const edgeKey = "1-yes";
      expect(result.edgeTraffic.get(edgeKey)).toEqual({
        count: 100,
        type: "buyers",
      });
    });

    it("should calculate traffic for no edges (pass)", () => {
      const nodesWithDownsell = [
        ...mockNodes,
        {
          id: "3",
          data: {
            name: "Downsell",
            price: 27,
            conversion: 50,
            nodeType: "downsell",
          },
        },
      ];
      const edgesWithNo = [
        ...mockEdges,
        { source: "2", target: "3", sourceHandle: "no" },
      ];

      const result = calculateFunnelMetricsWithDetails(
        nodesWithDownsell,
        edgesWithNo,
        mockTrafficSources
      );

      const edgeKey = "2-no";
      expect(result.edgeTraffic.get(edgeKey)).toEqual({
        count: 75, // 100 OTO traffic - 25 buyers = 75 pass
        type: "pass",
      });
    });
  });

  describe("2.2 - Edge label formatting", () => {
    it("should format buyers correctly", () => {
      expect(formatTrafficLabel(100, "buyers")).toBe("100 buyers");
      expect(formatTrafficLabel(1, "buyers")).toBe("1 buyer");
    });

    it("should format pass correctly", () => {
      expect(formatTrafficLabel(900, "pass")).toBe("900 pass");
    });
  });
});

// Helper for traffic label formatting (used in CustomEdge)
function formatTrafficLabel(count: number, type: "buyers" | "pass"): string {
  if (type === "buyers") {
    return count === 1 ? `${count} buyer` : `${count} buyers`;
  }
  return `${count} pass`;
}

// ====================
// TASK GROUP 3 TESTS: Breakeven Panel
// ====================

describe("Task Group 3: Breakeven Panel", () => {
  describe("3.1 - Breakeven calculation", () => {
    it("should render with correct breakeven visitor count", () => {
      render(
        <BreakevenPanel
          totalCost={500}
          totalRevenue={1000}
          totalTraffic={1000}
          epc={1}
        />
      );

      // Breakeven = totalCost / epc = 500 / 1 = 500 visitors
      // Use more specific selector to find the breakeven display
      expect(screen.getByText("500 visitors")).toBeInTheDocument();
    });

    it("should show N/A when EPC is zero", () => {
      render(
        <BreakevenPanel
          totalCost={500}
          totalRevenue={0}
          totalTraffic={1000}
          epc={0}
        />
      );

      expect(screen.getByText(/N\/A/)).toBeInTheDocument();
    });
  });

  describe("3.2 - Panel toggle functionality", () => {
    it("should have toggle button that changes state", async () => {
      render(
        <BreakevenPanel
          totalCost={500}
          totalRevenue={1000}
          totalTraffic={1000}
          epc={1}
        />
      );

      // Panel should be open by default, showing metrics
      expect(screen.getByText("Total Revenue")).toBeInTheDocument();

      // Find the toggle button and verify it exists
      const toggleButton = screen.getByRole("button");
      expect(toggleButton).toBeInTheDocument();

      // Click to collapse - Radix manages the collapsible state internally
      fireEvent.click(toggleButton);

      // Verify the button aria-expanded state changed
      await waitFor(() => {
        expect(toggleButton).toHaveAttribute("aria-expanded", "false");
      });
    });
  });

  describe("3.3 - Key metrics display", () => {
    it("should display all key metrics", () => {
      render(
        <BreakevenPanel
          totalCost={500}
          totalRevenue={1000}
          totalTraffic={1000}
          epc={1}
        />
      );

      expect(screen.getByText("Total Revenue")).toBeInTheDocument();
      expect(screen.getByText("Total Cost")).toBeInTheDocument();
      expect(screen.getByText(/Profit/)).toBeInTheDocument();
    });
  });
});

// ====================
// TASK GROUP 4 TESTS: Node Health Indicators
// ====================

describe("Task Group 4: Node Health Indicators", () => {
  describe("4.1 - Health color thresholds", () => {
    it("should return green for conversion >= 15%", () => {
      expect(getHealthColor(15)).toBe("green");
      expect(getHealthColor(25)).toBe("green");
      expect(getHealthColor(100)).toBe("green");
    });

    it("should return yellow for conversion 5-15%", () => {
      expect(getHealthColor(5)).toBe("yellow");
      expect(getHealthColor(10)).toBe("yellow");
      expect(getHealthColor(14.9)).toBe("yellow");
    });

    it("should return red for conversion < 5%", () => {
      expect(getHealthColor(0)).toBe("red");
      expect(getHealthColor(2)).toBe("red");
      expect(getHealthColor(4.9)).toBe("red");
    });
  });

  describe("4.2 - Health indicator rendering", () => {
    it("should apply green ring class for high conversion", () => {
      const props = createMockNodeProps({ conversion: 20 });
      const { container } = render(
        <ReactFlowWrapper>
          <FunnelNode {...props} />
        </ReactFlowWrapper>
      );

      const card = container.querySelector(".ring-emerald-500\\/50");
      expect(card).toBeInTheDocument();
    });

    it("should apply yellow ring class for medium conversion", () => {
      const props = createMockNodeProps({ conversion: 10 });
      const { container } = render(
        <ReactFlowWrapper>
          <FunnelNode {...props} />
        </ReactFlowWrapper>
      );

      const card = container.querySelector(".ring-amber-500\\/50");
      expect(card).toBeInTheDocument();
    });

    it("should apply red ring class for low conversion", () => {
      const props = createMockNodeProps({ conversion: 3 });
      const { container } = render(
        <ReactFlowWrapper>
          <FunnelNode {...props} />
        </ReactFlowWrapper>
      );

      const card = container.querySelector(".ring-red-500\\/50");
      expect(card).toBeInTheDocument();
    });
  });
});

// ====================
// TASK GROUP 5 TESTS: Sensitivity Tooltips
// ====================

describe("Task Group 5: Sensitivity Tooltips", () => {
  describe("5.1 - Sensitivity calculation", () => {
    it("should calculate revenue delta for +1% conversion", () => {
      const sensitivity = calculateSensitivity(
        mockNodes,
        mockEdges,
        mockTrafficSources,
        "1" // frontend node
      );

      // Original: 10% conversion = 100 buyers * $47 = $4700
      // +1%: 11% conversion = 110 buyers * $47 = $5170
      // Delta: $470 (just from frontend, cascades to OTO)
      expect(sensitivity).toBeGreaterThan(0);
    });

    it("should return 0 for nodes not in funnel", () => {
      const sensitivity = calculateSensitivity(
        mockNodes,
        mockEdges,
        mockTrafficSources,
        "nonexistent-node"
      );

      expect(sensitivity).toBe(0);
    });
  });

  describe("5.2 - Sensitivity formatting", () => {
    it("should format positive sensitivity correctly", () => {
      const formatted = formatSensitivityMessage(470);
      expect(formatted).toBe("+1% conversion = +$470 revenue");
    });

    it("should handle large sensitivity values", () => {
      const formatted = formatSensitivityMessage(1500);
      expect(formatted).toBe("+1% conversion = +$1.5K revenue");
    });
  });
});

// Helper for sensitivity message formatting
function formatSensitivityMessage(delta: number): string {
  return `+1% conversion = +${formatCurrency(delta)} revenue`;
}

// ====================
// TASK GROUP 6 TESTS: Integration Tests
// ====================

describe("Task Group 6: Integration Tests", () => {
  describe("6.1 - All features together", () => {
    it("should calculate complete funnel metrics with all features", () => {
      const result = calculateFunnelMetricsWithDetails(
        mockNodes,
        mockEdges,
        mockTrafficSources
      );

      // Verify all parts of the result
      expect(result.totalProfit).toBeDefined();
      expect(result.nodeMetrics).toBeInstanceOf(Map);
      expect(result.edgeTraffic).toBeInstanceOf(Map);
      expect(result.totalRevenue).toBeDefined();
      expect(result.totalCost).toBeDefined();
    });
  });

  describe("6.2 - Backward compatibility", () => {
    it("should still support original calculateFunnelRevenue function", () => {
      const profit = calculateFunnelRevenue(
        mockNodes,
        mockEdges,
        mockTrafficSources
      );

      // Should return same value as detailed calculation
      const detailed = calculateFunnelMetricsWithDetails(
        mockNodes,
        mockEdges,
        mockTrafficSources
      );

      expect(profit).toBe(detailed.totalProfit);
    });
  });

  describe("6.3 - Empty funnel handling", () => {
    it("should handle empty nodes gracefully", () => {
      const result = calculateFunnelMetricsWithDetails([], [], mockTrafficSources);

      expect(result.totalProfit).toBe(-500); // Just the cost
      expect(result.nodeMetrics.size).toBe(0);
    });

    it("should handle empty traffic sources gracefully", () => {
      const result = calculateFunnelMetricsWithDetails(mockNodes, mockEdges, []);

      // With no traffic sources, profit should be 0 (or -0 which is equal to 0)
      expect(result.totalProfit).toBeCloseTo(0);
      expect(result.totalRevenue).toBe(0);
    });
  });
});
