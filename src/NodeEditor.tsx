import React from "react";
import { useId } from "@reach/auto-id";
import { nanoid } from "nanoid/non-secure";
import Stage from "./components/Stage/Stage";
import Node from "./components/Node/Node";
import Subgraph from "./components/Subgraph/Subgraph";
import Comment from "./components/Comment/Comment";
import Toaster from "./components/Toaster/Toaster";
import Connections from "./components/Connections/Connections";
import {
  NodeTypesContext,
  PortTypesContext,
  NodeDispatchContext,
  ConnectionRecalculateContext,
  RecalculateStageRectContext,
  ContextContext,
  StageContext,
  CacheContext,
  EditorIdContext
} from "./context";
import { createConnections } from "./connectionCalculator";
import nodesReducer, {
  connectNodesReducer,
  getInitialNodes,
  NodesActionType
} from "./nodesReducer";
import commentsReducer from "./commentsReducer";
import toastsReducer, { ToastAction } from "./toastsReducer";
import stageReducer from "./stageReducer";
import usePrevious from "./hooks/usePrevious";
import clamp from "lodash/clamp";
import Cache from "./Cache";
import { STAGE_ID, DRAG_CONNECTION_ID } from "./constants";
import styles from "./styles.module.css";
import {
  CircularBehavior,
  DefaultNode,
  FlumeCommentMap,
  NodeHeaderRenderCallback,
  NodeMap,
  NodeTypeMap,
  PortTypeMap,
  SubgraphMap,
  Coordinate,
} from "./types";

const defaultContext = {};

interface NodeEditorProps {
  comments?: FlumeCommentMap;
  nodes?: NodeMap;
  subgraphs?: SubgraphMap;
  onSubgraphsChange?: (subgraphs: SubgraphMap) => void;
  nodeTypes: NodeTypeMap;
  portTypes: PortTypeMap;
  defaultNodes?: DefaultNode[];
  context?: any;
  onChange?: (nodes: NodeMap) => void;
  onCommentsChange?: (comments: FlumeCommentMap) => void;
  initialScale?: number;
  spaceToPan?: boolean;
  hideComments?: boolean;
  disableComments?: boolean;
  disableZoom?: boolean;
  disablePan?: boolean;
  disableFocusCapture?: boolean;
  circularBehavior?: CircularBehavior;
  renderNodeHeader?: NodeHeaderRenderCallback;
  debug?: boolean;
}

export let NodeEditor = React.forwardRef(
  (
    {
      comments: initialComments,
      nodes: initialNodes,
      subgraphs: initialSubgraphs,
      onSubgraphsChange,
      nodeTypes = {},
      portTypes = {},
      defaultNodes = [],
      context = defaultContext,
      onChange,
      onCommentsChange,
      initialScale,
      spaceToPan = false,
      hideComments = false,
      disableComments = false,
      disableZoom = false,
      disablePan = false,
      disableFocusCapture = false,
      circularBehavior,
      renderNodeHeader,
      debug
    }: NodeEditorProps,
    ref
  ) => {
    const editorId = useId() ?? "";
    const cache = React.useRef(new Cache());
    const stage = React.useRef<DOMRect | undefined>();
    const [sideEffectToasts, setSideEffectToasts] = React.useState<
      ToastAction
    >();
    const [toasts, dispatchToasts] = React.useReducer(toastsReducer, []);
    const [nodes, dispatchNodes] = React.useReducer(
      connectNodesReducer(
        nodesReducer,
        { nodeTypes, portTypes, cache, circularBehavior, context },
        setSideEffectToasts
      ),
      {},
      () =>
        getInitialNodes(
          initialNodes,
          defaultNodes,
          nodeTypes,
          portTypes,
          context
        )
    );
    const [subgraphs, setSubgraphs] = React.useState<SubgraphMap>(
      initialSubgraphs || {}
    );
    const [selectedNodeIds, setSelectedNodeIds] = React.useState<string[]>([]);

    const [comments, dispatchComments] = React.useReducer(
      commentsReducer,
      initialComments || {}
    );

    React.useEffect(() => {
      dispatchNodes({ type: NodesActionType.HYDRATE_DEFAULT_NODES });
    }, []);

    const previousSubgraphs = usePrevious(subgraphs);

    React.useEffect(() => {
      if (previousSubgraphs && onSubgraphsChange && subgraphs !== previousSubgraphs) {
        onSubgraphsChange(subgraphs);
      }
    }, [subgraphs, previousSubgraphs, onSubgraphsChange]);

    const selectNode = React.useCallback((nodeId: string, event: React.MouseEvent) => {
      const additive = event.shiftKey || event.ctrlKey || event.metaKey;
      setSelectedNodeIds(current =>
        additive
          ? current.includes(nodeId)
            ? current.filter(id => id !== nodeId)
            : [...current, nodeId]
          : [nodeId]
      );
    }, []);

    const createSubgraph = React.useCallback(() => {
      const selectedNodes = selectedNodeIds
        .map(nodeId => nodes[nodeId])
        .filter(Boolean);
      if (selectedNodes.length < 2) return;

      const padding = 24;
      const headerHeight = 24;
      const minX = Math.min(...selectedNodes.map(node => node.x)) - padding;
      const minY = Math.min(...selectedNodes.map(node => node.y)) - padding - headerHeight;
      const maxX = Math.max(...selectedNodes.map(node => node.x + node.width)) + padding;
      const maxY = Math.max(...selectedNodes.map(node => node.y + 180)) + padding;
      const id = `subgraph-${nanoid(6)}`;
      setSubgraphs(current => ({
        ...current,
        [id]: {
          id,
          label: "Subgraph",
          nodeIds: selectedNodes.map(node => node.id),
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY
        }
      }));
      setSelectedNodeIds([]);
    }, [nodes, selectedNodeIds]);

    const [
      shouldRecalculateConnections,
      setShouldRecalculateConnections
    ] = React.useState(true);

    const [stageState, dispatchStageState] = React.useReducer(stageReducer, {
      scale: typeof initialScale === "number" ? clamp(initialScale, 0.1, 7) : 1,
      translate: { x: 0, y: 0 }
    });

    const recalculateConnections = React.useCallback(() => {
      createConnections(nodes, stageState, editorId);
    }, [nodes, editorId, stageState]);

    const recalculateStageRect = React.useCallback(() => {
      stage.current = document
        .getElementById(`${STAGE_ID}${editorId}`)
        ?.getBoundingClientRect();
    }, [editorId]);

    React.useLayoutEffect(() => {
      if (shouldRecalculateConnections) {
        recalculateConnections();
        setShouldRecalculateConnections(false);
      }
    }, [shouldRecalculateConnections, recalculateConnections]);

    const triggerRecalculation = React.useCallback(() => {
      setShouldRecalculateConnections(true);
    }, []);

    const moveSubgraph = React.useCallback(
      (subgraphId: string, delta: Coordinate) => {
        const subgraph = subgraphs[subgraphId];
        if (!subgraph) return;
        dispatchNodes({
          type: NodesActionType.MOVE_SUBGRAPH,
          nodeIds: subgraph.nodeIds,
          delta
        });
        setSubgraphs(current => {
          const currentSubgraph = current[subgraphId];
          if (!currentSubgraph) return current;
          return {
            ...current,
            [subgraphId]: {
              ...currentSubgraph,
              x: currentSubgraph.x + delta.x,
              y: currentSubgraph.y + delta.y
            }
          };
        });
        triggerRecalculation();
      },
      [subgraphs, triggerRecalculation]
    );

    const renameSubgraph = React.useCallback((subgraphId: string, label: string) => {
      setSubgraphs(current => {
        const subgraph = current[subgraphId];
        if (!subgraph) return current;
        return {
          ...current,
          [subgraphId]: { ...subgraph, label }
        };
      });
    }, []);

    const removeSubgraph = React.useCallback((subgraphId: string) => {
      setSubgraphs(current => {
        if (!current[subgraphId]) return current;
        const { [subgraphId]: removedSubgraph, ...remaining } = current;
        return remaining;
      });
    }, []);

    const expandSubgraphToNodes = React.useCallback(
      (
        subgraph: SubgraphMap[string],
        nodePositions: { [nodeId: string]: Coordinate } = {}
      ) => {
        const padding = 24;
        const headerHeight = 24;
        const memberNodes = subgraph.nodeIds
          .map(nodeId => nodes[nodeId])
          .filter(Boolean);
        if (!memberNodes.length) return subgraph;

        const getPosition = (nodeId: string) =>
          nodePositions[nodeId] || nodes[nodeId];
        const minX = Math.min(
          subgraph.x,
          ...memberNodes.map(node => getPosition(node.id).x - padding)
        );
        const minY = Math.min(
          subgraph.y,
          ...memberNodes.map(node => getPosition(node.id).y - padding - headerHeight)
        );
        const maxX = Math.max(
          subgraph.x + subgraph.width,
          ...memberNodes.map(node => getPosition(node.id).x + node.width + padding)
        );
        const maxY = Math.max(
          subgraph.y + subgraph.height,
          ...memberNodes.map(node => getPosition(node.id).y + 180 + padding)
        );

        return {
          ...subgraph,
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY
        };
      },
      [nodes]
    );

    const updateNodeSubgraph = React.useCallback(
      (nodeId: string, coordinates: Coordinate) => {
        const node = nodes[nodeId];
        if (!node) return;

        const nodeCenter = {
          x: coordinates.x + node.width / 2,
          y: coordinates.y + 90
        };
        const destination = Object.values(subgraphs).find(subgraph =>
          nodeCenter.x >= subgraph.x &&
          nodeCenter.x <= subgraph.x + subgraph.width &&
          nodeCenter.y >= subgraph.y &&
          nodeCenter.y <= subgraph.y + subgraph.height
        );
        const currentSubgraph = Object.values(subgraphs).find(subgraph =>
          subgraph.nodeIds.includes(nodeId)
        );
        const targetSubgraph = destination || currentSubgraph;
        if (!targetSubgraph) return;

        setSubgraphs(current =>
          Object.values(current).reduce<SubgraphMap>((updated, subgraph) => {
            const nodeIds = subgraph.nodeIds.filter(id => id !== nodeId);
            const updatedSubgraph = {
              ...subgraph,
              nodeIds:
                subgraph.id === targetSubgraph.id
                  ? [...nodeIds, nodeId]
                  : nodeIds
            };
            updated[subgraph.id] =
              subgraph.id === targetSubgraph.id
                ? expandSubgraphToNodes(updatedSubgraph, {
                  [nodeId]: coordinates
                })
                : updatedSubgraph;
            return updated;
          }, {})
        );
      },
      [expandSubgraphToNodes, nodes, subgraphs]
    );

    React.useImperativeHandle(ref, () => ({
      getNodes: () => {
        return nodes;
      },
      getComments: () => {
        return comments;
      }
    }));

    const previousNodes = usePrevious(nodes);

    React.useEffect(() => {
      if (previousNodes && onChange && nodes !== previousNodes) {
        onChange(nodes);
      }
    }, [nodes, previousNodes, onChange]);

    const previousComments = usePrevious(comments);

    React.useEffect(() => {
      if (
        previousComments &&
        onCommentsChange &&
        comments !== previousComments
      ) {
        onCommentsChange(comments);
      }
    }, [comments, previousComments, onCommentsChange]);

    React.useEffect(() => {
      if (sideEffectToasts) {
        dispatchToasts(sideEffectToasts);
        setSideEffectToasts(undefined);
      }
    }, [sideEffectToasts]);

    return (
      <PortTypesContext.Provider value={portTypes}>
        <NodeTypesContext.Provider value={nodeTypes}>
          <NodeDispatchContext.Provider value={dispatchNodes}>
            <ConnectionRecalculateContext.Provider value={triggerRecalculation}>
              <ContextContext.Provider value={context}>
                <StageContext.Provider value={stageState}>
                  <CacheContext.Provider value={cache}>
                    <EditorIdContext.Provider value={editorId}>
                      <RecalculateStageRectContext.Provider
                        value={recalculateStageRect}
                      >
                        <Stage
                          editorId={editorId}
                          scale={stageState.scale}
                          translate={stageState.translate}
                          spaceToPan={spaceToPan}
                          disablePan={disablePan}
                          disableZoom={disableZoom}
                          dispatchStageState={dispatchStageState}
                          dispatchComments={dispatchComments}
                          disableComments={disableComments || hideComments}
                          disableFocusCapture={disableFocusCapture}
                          stageRef={stage}
                          numNodes={Object.keys(nodes).length}
                          outerStageChildren={
                            <React.Fragment>
                              {debug && (
                                <div className={styles.debugWrapper}>
                                  <button
                                    className={styles.debugButton}
                                    onClick={() => console.log(nodes)}
                                  >
                                    Log Nodes
                                  </button>
                                  <button
                                    className={styles.debugButton}
                                    onClick={() =>
                                      console.log(JSON.stringify(nodes))
                                    }
                                  >
                                    Export Nodes
                                  </button>
                                  <button
                                    className={styles.debugButton}
                                    onClick={() => console.log(comments)}
                                  >
                                    Log Comments
                                  </button>
                                </div>
                              )}
                              <Toaster
                                toasts={toasts}
                                dispatchToasts={dispatchToasts}
                              />
                            </React.Fragment>
                          }
                        >
                          {Object.values(subgraphs).map(subgraph => (
                            <Subgraph
                              key={subgraph.id}
                              subgraph={subgraph}
                              stageState={stageState}
                              stageRect={stage}
                              onMove={delta => moveSubgraph(subgraph.id, delta)}
                              onRename={label => renameSubgraph(subgraph.id, label)}
                              onRemove={() => removeSubgraph(subgraph.id)}
                            />
                          ))}
                          {!hideComments &&
                            Object.values(comments).map(comment => (
                              <Comment
                                {...comment}
                                stageRect={stage}
                                dispatch={dispatchComments}
                                onDragStart={recalculateStageRect}
                                key={comment.id}
                              />
                            ))}
                          {Object.values(nodes).map(node => (
                            <Node
                              {...node}
                              stageRect={stage}
                              onDragStart={recalculateStageRect}
                              onDragEnd={coordinates =>
                                updateNodeSubgraph(node.id, coordinates)
                              }
                              renderNodeHeader={renderNodeHeader}
                              selected={selectedNodeIds.includes(node.id)}
                              onSelect={event => selectNode(node.id, event)}
                              onCreateSubgraph={
                                selectedNodeIds.length > 1 &&
                                  selectedNodeIds.includes(node.id)
                                  ? createSubgraph
                                  : undefined
                              }
                              key={node.id}
                            />
                          ))}
                          <Connections editorId={editorId} />
                          <div
                            className={styles.dragWrapper}
                            id={`${DRAG_CONNECTION_ID}${editorId}`}
                          ></div>
                        </Stage>
                      </RecalculateStageRectContext.Provider>
                    </EditorIdContext.Provider>
                  </CacheContext.Provider>
                </StageContext.Provider>
              </ContextContext.Provider>
            </ConnectionRecalculateContext.Provider>
          </NodeDispatchContext.Provider>
        </NodeTypesContext.Provider>
      </PortTypesContext.Provider>
    );
  }
);
