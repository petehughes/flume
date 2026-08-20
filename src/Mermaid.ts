import { Connections, FlumeConfig, NodeMap } from "./";

const DEFAULT_MERMAID_SHAPE = "rect";

/**
 * Converts a NodeMap into a Mermaid flowchart diagram string.
 *
 * Each node is rendered as `id@{ shape: ..., label: "..." }`, using the
 * shape declared on its NodeType's `mermaidShape` (defaulting to `rect`),
 * followed by a `%% pos` comment encoding its x, y and width. Each
 * connection between an output port and an input port is rendered as an
 * edge, labeled with the source output port name and the target input
 * port name.
 */
export function nodeMapToMermaid(
	nodeMap: NodeMap,
	flumeConfig: FlumeConfig,
): string {
	const lines: string[] = ["flowchart LR"];

	const nodeIds = Object.keys(nodeMap);

	// Declare nodes
	for (const nodeId of nodeIds) {
		const node = nodeMap[nodeId];
		const label = `${node.type}${node.root ? " (root)" : ""}`;
		const id = sanitizeId(nodeId);
		const shape =
			flumeConfig.nodeTypes[node.type]?.mermaidShape ?? DEFAULT_MERMAID_SHAPE;
		lines.push(`  ${id}@{ shape: ${shape}, label: "${escapeLabel(label)}" }`);
		lines.push(`  %% pos ${id} x=${node.x} y=${node.y} width=${node.width}`);
	}

	// Declare edges based on output connections (avoids double-counting
	// input/output pairs since Flume stores connections on both sides)
	for (const nodeId of nodeIds) {
		const node = nodeMap[nodeId];
		const outputs = node.connections?.outputs ?? {};

		for (const portName of Object.keys(outputs)) {
			const targets = outputs[portName];
			for (const target of targets) {
				const edgeLabel = `${portName}->${target.portName}`;
				lines.push(
					`  ${sanitizeId(nodeId)} -->|${escapeLabel(edgeLabel)}| ${sanitizeId(
						target.nodeId,
					)}`,
				);
			}
		}
	}

	return lines.join("\n");
}

/**
 * Parses a Mermaid flowchart diagram (as produced by nodeMapToMermaid)
 * back into a NodeMap. This reconstructs id, type, root flag,
 * connections, and (from the `%% pos` comments) x, y and width;
 * inputData is set to a default since it is not encoded in
 * the diagram.
 */
export function mermaidToNodeMap(mermaid: string): NodeMap {
	const nodeMap: NodeMap = {};

	const lines = mermaid
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0 && !line.startsWith("flowchart"));

	const nodeDeclRegex =
		/^(\S+)@\{\s*shape:\s*([\w-]+)\s*,\s*label:\s*"(.*)"\s*\}$/;
	const posRegex =
		/^%%\s*pos\s+(\S+)\s+x=(-?\d+(?:\.\d+)?)\s+y=(-?\d+(?:\.\d+)?)\s+width=(-?\d+(?:\.\d+)?)$/;
	const edgeRegex = /^(\S+)\s*-->\|(.*)\|\s*(\S+)$/;

	const ensureNode = (nodeId: string) => {
		if (!nodeMap[nodeId]) {
			nodeMap[nodeId] = {
				id: nodeId,
				type: "",
				width: 0,
				x: 0,
				y: 0,
				inputData: {},
				connections: { inputs: {}, outputs: {} },
				root: false,
			};
		}
		return nodeMap[nodeId];
	};

	for (const line of lines) {
		const declMatch = line.match(nodeDeclRegex);
		if (declMatch) {
			const [, rawId, , rawLabel] = declMatch;
			const nodeId = unsanitizeId(rawId);
			const label = unescapeLabel(rawLabel);
			const isRoot = label.endsWith(" (root)");
			const type = isRoot ? label.slice(0, -" (root)".length) : label;

			const node = ensureNode(nodeId);
			node.type = type;
			node.root = isRoot;
			continue;
		}

		const posMatch = line.match(posRegex);
		if (posMatch) {
			const [, rawId, x, y, width] = posMatch;
			const node = ensureNode(unsanitizeId(rawId));
			node.x = parseFloat(x);
			node.y = parseFloat(y);
			node.width = parseFloat(width);
			continue;
		}

		const edgeMatch = line.match(edgeRegex);

		if (edgeMatch) {
			const [, rawSourceId, rawEdgeLabel, rawTargetId] = edgeMatch;
			const sourceId = unsanitizeId(rawSourceId);
			const targetId = unsanitizeId(rawTargetId);
			const edgeLabel = unescapeLabel(rawEdgeLabel);
			const [sourcePortName, targetPortName] = edgeLabel.split("->");

			const sourceNode = ensureNode(sourceId);
			const targetNode = ensureNode(targetId);

			const outputConnections: Connections["outputs"] =
				sourceNode.connections.outputs;
			if (!outputConnections[sourcePortName]) {
				outputConnections[sourcePortName] = [];
			}
			outputConnections[sourcePortName].push({
				nodeId: targetId,
				portName: targetPortName,
				portType: "",
			});

			const inputConnections: Connections["inputs"] =
				targetNode.connections.inputs;
			if (!inputConnections[targetPortName]) {
				inputConnections[targetPortName] = [];
			}
			inputConnections[targetPortName].push({
				nodeId: sourceId,
				portName: sourcePortName,
				portType: "",
			});
		}
	}

	return nodeMap;
}

function sanitizeId(id: string): string {
	return id.replace(/[^a-zA-Z0-9_]/g, "_");
}

function unsanitizeId(id: string): string {
	// Sanitization is lossy for ids containing non-alphanumeric characters,
	// so this simply returns the sanitized id as-is. If your node ids are
	// already alphanumeric (e.g. uuids without dashes), this round-trips
	// correctly.
	return id;
}

function escapeLabel(label: string): string {
	return label.replace(/"/g, "&quot;");
}

function unescapeLabel(label: string): string {
	return label.replace(/&quot;/g, '"');
}
