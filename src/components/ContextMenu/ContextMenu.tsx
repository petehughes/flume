import clamp from "lodash/clamp";
import { nanoid } from "nanoid/non-secure";
import React from "react";
import { createPortal } from "react-dom";
import { SelectOption } from "../../types";
import styles from "./ContextMenu.module.css";

interface ContextMenuProps {
	x: number;
	y: number;
	options: SelectOption[];
	onRequestClose: () => void;
	onOptionSelected: (option: SelectOption) => void;
	label?: string;
	hideHeader?: boolean;
	hideFilter?: boolean;
	emptyText?: string;
}

const ContextMenu = ({
	x,
	y,
	options = [],
	onRequestClose,
	onOptionSelected,
	label,
	hideHeader,
	hideFilter,
	emptyText,
}: ContextMenuProps) => {
	const menuWrapper = React.useRef<HTMLDivElement>(null);
	const menuOptionsWrapper = React.useRef<HTMLDivElement>(null);
	const filterInput = React.useRef<HTMLInputElement>(null);
	const [filter, setFilter] = React.useState("");
	const [menuWidth, setMenuWidth] = React.useState(0);
	const [selectedIndex, setSelectedIndex] = React.useState<number | null>(0);
	const [openGroup, setOpenGroup] = React.useState<string | null>(null);
	const [subSelectedIndex, setSubSelectedIndex] = React.useState<number | null>(
		0,
	);
	const [submenuPosition, setSubmenuPosition] = React.useState<{
		top: number;
		left: number;
	} | null>(null);
	const menuId = React.useRef(nanoid(10));
	const submenuWrapper = React.useRef<HTMLDivElement>(null);

	const handleOptionSelected = (option: SelectOption) => {
		onOptionSelected(option);
		onRequestClose();
	};

	const testClickOutside = React.useCallback(
		(e: MouseEvent) => {
			const target = e.target as Element;
			if (
				menuWrapper.current &&
				!menuWrapper.current.contains(target) &&
				!(submenuWrapper.current && submenuWrapper.current.contains(target))
			) {
				onRequestClose();
				document.removeEventListener("mousedown", testClickOutside, {
					capture: true,
				});
				document.removeEventListener("contextmenu", testClickOutside, {
					capture: true,
				});
			}
		},
		[menuWrapper, onRequestClose],
	);

	const testEscape = React.useCallback(
		(e: KeyboardEvent) => {
			if (e.keyCode === 27) {
				onRequestClose();
				document.removeEventListener("keydown", testEscape, { capture: true });
			}
		},
		[onRequestClose],
	);

	React.useEffect(() => {
		if (filterInput.current) {
			filterInput.current.focus();
		}
		setMenuWidth(menuWrapper.current?.getBoundingClientRect()?.width ?? 0);
		document.addEventListener("keydown", testEscape, { capture: true });
		document.addEventListener("mousedown", testClickOutside, { capture: true });
		document.addEventListener("contextmenu", testClickOutside, {
			capture: true,
		});
		return () => {
			document.removeEventListener("mousedown", testClickOutside, {
				capture: true,
			});
			document.removeEventListener("contextmenu", testClickOutside, {
				capture: true,
			});
			document.removeEventListener("keydown", testEscape, { capture: true });
		};
	}, [testClickOutside, testEscape]);

	const filteredOptions = React.useMemo(() => {
		if (!filter) return options;
		const lowerFilter = filter.toLowerCase();
		return options.filter(
			(opt) =>
				opt.label.toLowerCase().includes(lowerFilter) ||
				(opt.description &&
					opt.description.toLowerCase().includes(lowerFilter)) ||
				(opt.keywords &&
					opt.keywords.some((keyword) =>
						keyword.toLowerCase().includes(lowerFilter),
					)),
		);
	}, [filter, options]);

	type DisplayItem =
		| { type: "option"; option: SelectOption }
		| { type: "group"; group: string; options: SelectOption[] };

	// Options sharing a group name are collapsed into a single submenu entry.
	// Filtering flattens groups so search can match nested options.
	const displayItems: DisplayItem[] = React.useMemo(() => {
		if (filter) {
			return filteredOptions.map((option) => ({ type: "option", option }));
		}
		const items: DisplayItem[] = [];
		const seenGroups = new Set<string>();
		options.forEach((option) => {
			if (option.group) {
				if (!seenGroups.has(option.group)) {
					seenGroups.add(option.group);
					items.push({
						type: "group",
						group: option.group,
						options: options.filter((o) => o.group === option.group),
					});
				}
			} else {
				items.push({ type: "option", option });
			}
		});
		return items;
	}, [filter, filteredOptions, options]);

	// Positioned in a portal (fixed to the viewport) so it isn't clipped by
	// the scrollable options list.
	React.useEffect(() => {
		if (!openGroup) {
			setSubmenuPosition(null);
			return;
		}
		const index = displayItems.findIndex(
			(item) => item.type === "group" && item.group === openGroup,
		);
		const el =
			index !== -1
				? document.getElementById(`${menuId.current}-${index}`)
				: null;
		if (!el) {
			setSubmenuPosition(null);
			return;
		}
		const rect = el.getBoundingClientRect();
		setSubmenuPosition({ top: rect.top, left: rect.right });
	}, [openGroup, displayItems]);

	React.useEffect(() => {
		const optionsEl = menuOptionsWrapper.current;
		if (!optionsEl) return;
		const handleScroll = () => setOpenGroup(null);
		optionsEl.addEventListener("scroll", handleScroll);
		return () => optionsEl.removeEventListener("scroll", handleScroll);
	}, []);

	const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setFilter(value);
		setSelectedIndex(0);
		setOpenGroup(null);
	};

	const handleKeyDown: React.KeyboardEventHandler = (e) => {
		const currentItem =
			selectedIndex !== null ? displayItems[selectedIndex] : null;

		if (
			openGroup &&
			currentItem?.type === "group" &&
			currentItem.group === openGroup
		) {
			const subOptions = currentItem.options;
			// Up pressed
			if (e.which === 38) {
				e.preventDefault();
				setSubSelectedIndex((i) => (i === null ? 0 : Math.max(0, i - 1)));
				return;
			}
			// Down pressed
			if (e.which === 40) {
				e.preventDefault();
				setSubSelectedIndex((i) =>
					i === null ? 0 : Math.min(subOptions.length - 1, i + 1),
				);
				return;
			}
			// Left pressed, close submenu
			if (e.which === 37) {
				e.preventDefault();
				setOpenGroup(null);
				return;
			}
			// Enter pressed
			if (e.which === 13 && subSelectedIndex !== null) {
				const option = subOptions[subSelectedIndex];
				if (option) {
					handleOptionSelected(option);
				}
				return;
			}
		}

		// Up pressed
		if (e.which === 38) {
			e.preventDefault();
			if (selectedIndex === null) {
				setSelectedIndex(0);
			} else if (selectedIndex > 0) {
				setSelectedIndex((i) => (i || 0) - 1);
			}
		}
		// Down pressed
		if (e.which === 40) {
			e.preventDefault();
			if (selectedIndex === null) {
				setSelectedIndex(0);
			} else if (selectedIndex < displayItems.length - 1) {
				setSelectedIndex((i) => (i || 0) + 1);
			}
		}
		// Right pressed, open group submenu
		if (e.which === 39 && currentItem?.type === "group") {
			e.preventDefault();
			setOpenGroup(currentItem.group);
			setSubSelectedIndex(0);
		}
		// Enter pressed
		if (e.which === 13 && currentItem) {
			if (currentItem.type === "group") {
				setOpenGroup(currentItem.group);
				setSubSelectedIndex(0);
			} else {
				handleOptionSelected(currentItem.option);
			}
		}
	};

	React.useEffect(() => {
		if (hideFilter || hideHeader) {
			menuWrapper.current?.focus();
		}
	}, [hideFilter, hideHeader]);

	React.useEffect(() => {
		const menuOption = document.getElementById(
			`${menuId.current}-${selectedIndex}`,
		);
		if (menuOption) {
			const menuRect = menuOptionsWrapper.current?.getBoundingClientRect();
			const optionRect = menuOption.getBoundingClientRect();
			if (
				menuRect &&
				(optionRect.y + optionRect.height > menuRect.y + menuRect.height ||
					optionRect.y < menuRect.y)
			) {
				menuOption.scrollIntoView({ block: "nearest" });
			}
		}
	}, [selectedIndex]);

	const openGroupItem = displayItems.find(
		(item) => item.type === "group" && item.group === openGroup,
	) as Extract<DisplayItem, { type: "group" }> | undefined;

	return (
		<>
			<div
				data-flume-component="ctx-menu"
				className={styles.menuWrapper}
				onMouseDown={(e) => e.stopPropagation()}
				onKeyDown={handleKeyDown}
				style={{
					left: x,
					top: y,
					width: filter ? menuWidth : "auto",
				}}
				ref={menuWrapper}
				tabIndex={0}
				role="menu"
				aria-activedescendant={`${menuId.current}-${selectedIndex}`}
			>
				{!hideHeader && (label ? true : !!options.length) ? (
					<div
						className={styles.menuHeader}
						data-flume-component="ctx-menu-header"
					>
						<label
							className={styles.menuLabel}
							data-flume-component="ctx-menu-title"
						>
							{label}
						</label>
						{!hideFilter && options.length ? (
							<input
								data-flume-component="ctx-menu-input"
								type="text"
								placeholder="Filter options"
								value={filter}
								onChange={handleFilterChange}
								className={styles.menuFilter}
								autoFocus
								ref={filterInput}
							/>
						) : null}
					</div>
				) : null}
				<div
					data-flume-component="ctx-menu-list"
					className={styles.optionsWrapper}
					role="menu"
					ref={menuOptionsWrapper}
					style={{ maxHeight: clamp(window.innerHeight - y - 70, 10, 300) }}
				>
					{displayItems.map((item, i) =>
						item.type === "group" ? (
							<ContextOption
								menuId={menuId.current}
								selected={selectedIndex === i || openGroup === item.group}
								onClick={() =>
									setOpenGroup(openGroup === item.group ? null : item.group)
								}
								onMouseEnter={() => {
									setSelectedIndex(null);
									setOpenGroup(item.group);
									setSubSelectedIndex(0);
								}}
								index={i}
								key={item.group}
								className={styles.optionGroup}
							>
								<div className={styles.groupLabelRow}>
									<label>{item.group}</label>
									<span className={styles.groupArrow}>&#9656;</span>
								</div>
							</ContextOption>
						) : (
							<ContextOption
								menuId={menuId.current}
								selected={selectedIndex === i}
								onClick={() => handleOptionSelected(item.option)}
								onMouseEnter={() => {
									setSelectedIndex(null);
									setOpenGroup(null);
								}}
								index={i}
								key={item.option.value + i}
							>
								<label>{item.option.label}</label>
								{item.option.description ? (
									<p>{item.option.description}</p>
								) : null}
							</ContextOption>
						),
					)}
					{!options.length ? (
						<span
							data-flume-component="ctx-menu-empty"
							className={styles.emptyText}
						>
							{emptyText}
						</span>
					) : null}
				</div>
			</div>
			{openGroupItem && submenuPosition
				? createPortal(
						<div
							ref={submenuWrapper}
							className={styles.submenu}
							data-flume-component="ctx-menu-submenu"
							role="menu"
							onMouseDown={(e) => e.stopPropagation()}
							onMouseEnter={() => setOpenGroup(openGroupItem.group)}
							style={{ top: submenuPosition.top, left: submenuPosition.left }}
						>
							{openGroupItem.options.map((option, si) => (
								<ContextOption
									menuId={`${menuId.current}-sub`}
									selected={subSelectedIndex === si}
									onClick={() => handleOptionSelected(option)}
									onMouseEnter={() => setSubSelectedIndex(si)}
									index={si}
									key={option.value + si}
								>
									<label>{option.label}</label>
									{option.description ? <p>{option.description}</p> : null}
								</ContextOption>
							))}
						</div>,
						document.body,
					)
				: null}
		</>
	);
};

interface ContextOptionProps {
	menuId: string;
	index: number;
	children: React.ReactNode;
	onClick: () => void;
	selected: boolean;
	onMouseEnter: () => void;
	className?: string;
}

const ContextOption = ({
	menuId,
	index,
	children,
	onClick,
	selected,
	onMouseEnter,
	className,
}: ContextOptionProps) => {
	return (
		<div
			data-flume-component="ctx-menu-option"
			className={className ? `${styles.option} ${className}` : styles.option}
			role="menuitem"
			onClick={onClick}
			onMouseEnter={onMouseEnter}
			data-selected={selected}
			id={`${menuId}-${index}`}
		>
			{children}
		</div>
	);
};

export default ContextMenu;
