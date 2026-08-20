import React, { RefObject } from "react";
import FlumeCache from "./Cache";
import { NodesAction } from "./nodesReducer";
import { NodeTypeMap, PortTypeMap, StageState } from "./types";

export const NodeTypesContext = React.createContext<NodeTypeMap | null>(null);
export const PortTypesContext = React.createContext<PortTypeMap | null>(null);
export const NodeDispatchContext =
	React.createContext<React.Dispatch<NodesAction> | null>(null);
export const ConnectionRecalculateContext = React.createContext<
	(() => void) | null
>(null);
export const ContextContext = React.createContext<any>(null);
export const StageContext = React.createContext<StageState | null>(null);
export const CacheContext = React.createContext<RefObject<FlumeCache> | null>(
	null,
);
export const RecalculateStageRectContext = React.createContext<
	null | (() => void)
>(null);
export const EditorIdContext = React.createContext<string>("");

export interface AddNodeMenuRequest {
	x: number;
	y: number;
	portType: string;
	onCreated: (nodeId: string, portName: string) => void;
}
// Lets a port request the "Add Node" menu (filtered to nodes with a matching input) when a connection is dropped on empty stage space.
export const AddNodeMenuContext = React.createContext<
	((request: AddNodeMenuRequest) => void) | null
>(null);
