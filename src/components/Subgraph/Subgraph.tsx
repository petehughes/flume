import React from "react";
import { Portal } from "react-portal";
import {
	Coordinate,
	FlumeSubgraph,
	SelectOption,
	StageState,
} from "../../types";
import ContextMenu from "../ContextMenu/ContextMenu";
import Draggable from "../Draggable/Draggable";
import styles from "./Subgraph.module.css";

interface SubgraphProps {
	subgraph: FlumeSubgraph;
	stageState: StageState;
	stageRect: React.MutableRefObject<DOMRect | undefined>;
	onMove: (delta: Coordinate) => void;
	onRename: (label: string) => void;
	onRemove: () => void;
}

const Subgraph = ({
	subgraph,
	stageState,
	stageRect,
	onMove,
	onRename,
	onRemove,
}: SubgraphProps) => {
	const previousCoordinates = React.useRef<Coordinate>();
	const [menuOpen, setMenuOpen] = React.useState(false);
	const [menuCoordinates, setMenuCoordinates] = React.useState({ x: 0, y: 0 });

	const handleDrag = (coordinates: Coordinate) => {
		if (previousCoordinates.current) {
			onMove({
				x: coordinates.x - previousCoordinates.current.x,
				y: coordinates.y - previousCoordinates.current.y,
			});
		}
		previousCoordinates.current = coordinates;
	};

	const handleRename = () => {
		const label = window.prompt("Rename subgraph", subgraph.label);
		if (label?.trim()) onRename(label.trim());
	};

	const handleMenuOption = ({ value }: SelectOption) => {
		if (value === "renameSubgraph") handleRename();
		if (value === "removeSubgraph") onRemove();
	};

	const handleHeaderContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setMenuCoordinates({ x: event.clientX, y: event.clientY });
		setMenuOpen(true);
	};

	return (
		<Draggable
			className={styles.wrapper}
			style={{
				width: subgraph.width,
				height: subgraph.height,
				transform: `translate(${subgraph.x}px, ${subgraph.y}px)`,
			}}
			stageState={stageState}
			stageRect={stageRect}
			onDragStart={() => {
				previousCoordinates.current = undefined;
			}}
			onDrag={handleDrag}
			data-subgraph-id={subgraph.id}
			data-flume-component="subgraph"
		>
			<div className={styles.header} onContextMenu={handleHeaderContextMenu}>
				{subgraph.label}
			</div>
			{menuOpen ? (
				<Portal>
					<ContextMenu
						x={menuCoordinates.x}
						y={menuCoordinates.y}
						options={[
							{
								label: "Rename",
								value: "renameSubgraph",
								description: "Change the subgraph title.",
							},
							{
								label: "Remove",
								value: "removeSubgraph",
								description: "Remove the subgraph and keep its nodes.",
							},
						]}
						onRequestClose={() => setMenuOpen(false)}
						onOptionSelected={handleMenuOption}
						hideFilter
						label="Subgraph Options"
					/>
				</Portal>
			) : null}
		</Draggable>
	);
};

export default Subgraph;
