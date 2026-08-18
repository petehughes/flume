import React from "react";
import { fireEvent, render } from "@testing-library/react";
import { NodeEditor } from "../NodeEditor";
import nodesReducer, { NodesActionType } from "../nodesReducer";
import { exampleNodes, nodeTypes, portTypes } from "./nodes";

const node = (id, x, y, connections = {}) => ({
  id,
  type: "number",
  width: 150,
  x,
  y,
  inputData: {},
  connections: {
    inputs: connections.inputs || {},
    outputs: connections.outputs || {}
  }
});

describe("subgraphs", () => {
  test("moves all members without changing connections or unrelated nodes", () => {
    const connections = {
      inputs: { number: [{ nodeId: "outside", portName: "number", portType: "number" }] },
      outputs: {}
    };
    const nodes = {
      first: node("first", 10, 20, connections),
      second: node("second", 40, 50),
      outside: node("outside", 100, 120)
    };

    const result = nodesReducer(
      nodes,
      {
        type: NodesActionType.MOVE_SUBGRAPH,
        nodeIds: ["first", "second"],
        delta: { x: 15, y: -5 }
      },
      { nodeTypes: {}, portTypes: {}, context: {} }
    );

    expect(result.first).toEqual({ ...nodes.first, x: 25, y: 15 });
    expect(result.second).toEqual({ ...nodes.second, x: 55, y: 45 });
    expect(result.outside).toBe(nodes.outside);
  });

  test("creates a subgraph from selected nodes", () => {
    const { container, getByText } = render(
      <NodeEditor
        nodes={exampleNodes}
        nodeTypes={nodeTypes}
        portTypes={portTypes}
      />
    );
    const nodeIds = Object.keys(exampleNodes);
    const firstNode = container.querySelector(`[data-node-id="${nodeIds[0]}"]`);
    const secondNode = container.querySelector(`[data-node-id="${nodeIds[1]}"]`);

    fireEvent.mouseDown(firstNode);
    fireEvent.mouseDown(secondNode, { shiftKey: true });
    fireEvent.contextMenu(secondNode);
    fireEvent.click(getByText("Create Subgraph"));

    expect(container.querySelector('[data-flume-component="subgraph"]')).not.toBeNull();
  });

  test("moves member nodes while dragging a subgraph", () => {
    const onChange = jest.fn();
    const subgraphs = {
      math: {
        id: "math",
        label: "Math",
        nodeIds: ["5nCLb85WDw", "vRPQ06k4nT"],
        x: -220,
        y: -220,
        width: 500,
        height: 400
      }
    };
    const { container } = render(
      <NodeEditor
        nodes={exampleNodes}
        subgraphs={subgraphs}
        nodeTypes={nodeTypes}
        portTypes={portTypes}
        onChange={onChange}
      />
    );
    const header = container.querySelector('[data-flume-component="subgraph"] .header');

    fireEvent.mouseDown(header, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(document, { clientX: 20, clientY: 20 });
    fireEvent.mouseMove(document, { clientX: 40, clientY: 50 });
    fireEvent.mouseUp(document, { clientX: 40, clientY: 50 });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        "5nCLb85WDw": expect.objectContaining({ x: 154.5, y: -60 }),
        "vRPQ06k4nT": expect.objectContaining({ x: -162.5, y: -146 })
      })
    );
  });

  test("expands a subgraph when a member moves outside its bounds", () => {
    const onSubgraphsChange = jest.fn();
    const { container } = render(
      <NodeEditor
        nodes={exampleNodes}
        subgraphs={{
          math: {
            id: "math",
            label: "Math",
            nodeIds: ["5nCLb85WDw"],
            x: 100,
            y: -120,
            width: 200,
            height: 150
          }
        }}
        nodeTypes={nodeTypes}
        portTypes={portTypes}
        onSubgraphsChange={onSubgraphsChange}
      />
    );
    const node = container.querySelector('[data-node-id="5nCLb85WDw"]');

    fireEvent.mouseDown(node, { clientX: 0, clientY: 0 });
    fireEvent.mouseMove(document, { clientX: 300, clientY: 200 });
    fireEvent.mouseUp(document, { clientX: 300, clientY: 200 });

    expect(onSubgraphsChange).toHaveBeenLastCalledWith({
      math: expect.objectContaining({
        width: expect.any(Number),
        height: expect.any(Number)
      })
    });
    const updatedSubgraph = onSubgraphsChange.mock.calls.at(-1)[0].math;
    expect(updatedSubgraph.x + updatedSubgraph.width).toBeGreaterThan(300);
    expect(updatedSubgraph.y + updatedSubgraph.height).toBeGreaterThan(200);
  });

  test("renames a subgraph from its title context menu", () => {
    const onSubgraphsChange = jest.fn();
    const prompt = jest.spyOn(window, "prompt").mockReturnValue("Renamed Math");
    const { container, getByText } = render(
      <NodeEditor
        nodes={exampleNodes}
        subgraphs={{
          math: {
            id: "math",
            label: "Math",
            nodeIds: ["5nCLb85WDw", "vRPQ06k4nT"],
            x: -220,
            y: -220,
            width: 500,
            height: 400
          }
        }}
        nodeTypes={nodeTypes}
        portTypes={portTypes}
        onSubgraphsChange={onSubgraphsChange}
      />
    );

    fireEvent.contextMenu(
      container.querySelector('[data-flume-component="subgraph"] .header')
    );
    fireEvent.click(getByText("Rename"));

    expect(prompt).toHaveBeenCalledWith("Rename subgraph", "Math");
    expect(container.querySelector(".header").textContent).toBe("Renamed Math");
    expect(onSubgraphsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        math: expect.objectContaining({ label: "Renamed Math" })
      })
    );
    prompt.mockRestore();
  });

  test("removes a subgraph while keeping its nodes", () => {
    const onSubgraphsChange = jest.fn();
    const { container, getByText } = render(
      <NodeEditor
        nodes={exampleNodes}
        subgraphs={{
          math: {
            id: "math",
            label: "Math",
            nodeIds: ["5nCLb85WDw", "vRPQ06k4nT"],
            x: -220,
            y: -220,
            width: 500,
            height: 400
          }
        }}
        nodeTypes={nodeTypes}
        portTypes={portTypes}
        onSubgraphsChange={onSubgraphsChange}
      />
    );

    fireEvent.contextMenu(
      container.querySelector('[data-flume-component="subgraph"] .header')
    );
    fireEvent.click(getByText("Remove"));

    expect(container.querySelector('[data-flume-component="subgraph"]')).toBeNull();
    expect(container.querySelector('[data-node-id="5nCLb85WDw"]')).not.toBeNull();
    expect(container.querySelector('[data-node-id="vRPQ06k4nT"]')).not.toBeNull();
    expect(onSubgraphsChange).toHaveBeenCalledWith({});
  });

  test("moves a dragged node between subgraphs", () => {
    const onSubgraphsChange = jest.fn();
    const { container } = render(
      <NodeEditor
        nodes={exampleNodes}
        subgraphs={{
          source: {
            id: "source",
            label: "Source",
            nodeIds: ["5nCLb85WDw"],
            x: 100,
            y: 100,
            width: 200,
            height: 200
          },
          destination: {
            id: "destination",
            label: "Destination",
            nodeIds: ["vRPQ06k4nT"],
            x: 300,
            y: 300,
            width: 120,
            height: 150
          }
        }}
        nodeTypes={nodeTypes}
        portTypes={portTypes}
        onSubgraphsChange={onSubgraphsChange}
      />
    );
    const node = container.querySelector('[data-node-id="5nCLb85WDw"]');

    fireEvent.mouseDown(node, { clientX: 0, clientY: 0 });
    fireEvent.mouseMove(document, { clientX: 320, clientY: 320 });
    fireEvent.mouseUp(document, { clientX: 320, clientY: 320 });

    expect(onSubgraphsChange).toHaveBeenLastCalledWith({
      source: expect.objectContaining({ nodeIds: [] }),
      destination: expect.objectContaining({
        nodeIds: expect.arrayContaining(["5nCLb85WDw", "vRPQ06k4nT"])
      })
    });
    const updatedSubgraphs = onSubgraphsChange.mock.calls.at(-1)[0];
    expect(updatedSubgraphs.destination.width).toBeGreaterThan(120);
    expect(updatedSubgraphs.destination.height).toBeGreaterThan(150);
  });
});