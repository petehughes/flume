import React from "react";

import { Controls, FlumeConfig, NodeEditor, NodeMap, NodeResolver, PortResolver, RootEngine } from "node-editor";


const exampleNodes ={"wNN1DKOGfV":{"x":400,"y":-200,"type":"mathResult","label":"Math Result","width":130,"connections":{"inputs":{"number":[{"nodeId":"r1Al-l6JCx","portName":"result","portType":"number"}]},"outputs":{}},"inputData":{"number":{"number":0}},"root":true,"id":"wNN1DKOGfV"},"r1Al-l6JCx":{"id":"r1Al-l6JCx","x":148.58823529411765,"y":-161.831371531767,"type":"addNumbers","label":"Add Numbers","width":150,"connections":{"inputs":{"num2":[{"nodeId":"bWsPSXdFr9","portName":"result","portType":"number"}],"num1":[{"nodeId":"rWxYuJ0DqS","portName":"number","portType":"number"}]},"outputs":{"result":[{"nodeId":"wNN1DKOGfV","portName":"number","portType":"number"}]}},"inputData":{"num1":{"number":0},"num2":{"number":0}}},"yVdHSq5evB":{"id":"yVdHSq5evB","x":-575.6470588235295,"y":-241.831371531767,"type":"number","label":"number","width":150,"connections":{"inputs":{},"outputs":{"number":[{"nodeId":"bWsPSXdFr9","portName":"num2","portType":"number"}]}},"inputData":{"number":{"number":0}}},"bWsPSXdFr9":{"id":"bWsPSXdFr9","x":-337.6470588235295,"y":-152.831371531767,"type":"addNumbers","label":"Add Numbers","width":150,"connections":{"inputs":{"num2":[{"nodeId":"yVdHSq5evB","portName":"number","portType":"number"}],"num1":[{"nodeId":"0eZW9kdSUW","portName":"number","portType":"number"}]},"outputs":{"result":[{"nodeId":"r1Al-l6JCx","portName":"num2","portType":"number"}]}},"inputData":{"num1":{"number":0},"num2":{"number":0}}},"0eZW9kdSUW":{"id":"0eZW9kdSUW","x":-594.6470588235295,"y":-419.831371531767,"type":"number","label":"num1","width":150,"connections":{"inputs":{},"outputs":{"number":[{"nodeId":"bWsPSXdFr9","portName":"num1","portType":"number"}]}},"inputData":{"number":{"number":0}}},"rWxYuJ0DqS":{"id":"rWxYuJ0DqS","x":-54.7058751723346,"y":-347.18431629854103,"type":"number","label":"num2","width":150,"connections":{"inputs":{},"outputs":{"number":[{"nodeId":"r1Al-l6JCx","portName":"num1","portType":"number"}]}},"inputData":{"number":{"number":0}}}}

const Log = console.log;

const config = new FlumeConfig()
	.addPortType({
		type: "number",
		name: "number",
		label: "Number",
		controls: [
			Controls.number({
				name: "number",
			}),
		],
	})
	.addNodeType({
		type: "number",
		label: "Number",
		initialWidth: 150,
		inputs: (ports) => [ports.number()],
		outputs: (ports) => [ports.number()],
	})
	.addNodeType({
		type: "addNumbers",
		label: "Add Numbers",
		initialWidth: 150,
		inputs: (ports) => [
			ports.number({
				name: "num1",
			}),
			ports.number({
				name: "num2",
			}),
		],
		outputs: (ports) => [
			ports.number({
				name: "result",
			}),
		],
	})
	.addRootNodeType({
		type: "mathResult",
		label: "Math Result",
		description: "Calculates a math result",
		initialWidth: 130,
		inputs: (ports) => [ports.number()],
	});

const resolvePorts: PortResolver = (portType, data) => {
  switch (portType) {
    case 'string':
      return data.string
    case 'boolean':
      return data.boolean
    case 'number':
      return data.number
    default:
      return data
  }
}

const resolveNodes : NodeResolver= (node, inputValues, nodeType, context) => {
  switch (node.type) {
    case 'number':
		if(node.label && Object.hasOwn(context, node.label)) {
			return {number: context[node.label]}
		}
	
		return { number: inputValues.number }
    case 'addNumbers':
		const num1: number = (inputValues.num1 as unknown as number) || 0;
		const num2: number = (inputValues.num2 as unknown as number) || 0;

      return {result: num1 + num2}
	default:
      return inputValues
  }
}


const engine = new RootEngine(config, resolvePorts, resolveNodes)

const context= { num1:1, num2:2, number:99 };

export const useInfiniteEngine = <T extends { [inputName: string]: any }>(
  nodes: NodeMap,
  context: any = {},
  options = {}
): T =>
  Object.keys(nodes).length
    ? engine.resolveRootNode<T>(nodes, { context, ...options })
    : ({} as T);


export const Example2 = () => {
	const [output, setOutput] = React.useState<string | undefined>();
	const [nodes, setNodes] = React.useState<NodeMap>(exampleNodes);
	const [comments, setComments] = React.useState({});

	const updateNodes = React.useCallback((nodes:NodeMap)=>{
		setNodes(nodes)
	}, [])

	React.useEffect(() => {
		const newOutput = engine.resolveRootNode(nodes, { context})
		setOutput(JSON.stringify(newOutput));

	}, [nodes]);
	return (
		<div className="wrapper example2" style={{ width: 800, height: 600 }}>
			<NodeEditor
				portTypes={config.portTypes}
				nodeTypes={config.nodeTypes}
				nodes={nodes}
				comments={comments}
				onChange={updateNodes}
				onCommentsChange={setComments}
				defaultNodes={[
					{
						type: "mathResult",
						x: 400,
						y: -200,
					},
				]}
				debug
			/>
			<div className="container">
			<div id="INPUT">
				<h3>input</h3>
				<pre>
					{JSON.stringify(context)}
				</pre>
			</div>
			<div id="OUTPUT">
				<h3>output</h3>
				<pre>
					{output}
				</pre>
			</div>
			</div>
		</div>
	);
};


