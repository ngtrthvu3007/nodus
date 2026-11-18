import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, type SortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TabsProps } from "antd";
import { cloneElement, type HTMLAttributes, type ReactElement, type Ref } from "react";

type TabNodeProps = HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> };

type UseSortableTabBarInput = {
  tabIds: string[];
  onMove: (id: string, overId: string) => void;
};

const assignRef = (ref: Ref<HTMLElement> | undefined, element: HTMLElement | null) => {
  if (typeof ref === "function") ref(element);
  else if (ref) ref.current = element;
};

// The other tabs stay where they are while one is dragged: the drop line shows where it would land.
const keepInPlace: SortingStrategy = () => null;

const SortableTabNode = ({ id, node }: { id: string; node: ReactElement<TabNodeProps> }) => {
  const { listeners, setNodeRef, transform, transition, isDragging, isOver, index, activeIndex } = useSortable({ id });
  // Dragging right lands after the tab under the pointer, dragging left lands before it.
  const dropSide = activeIndex < index ? "after" : "before";
  const dropClass = isOver && !isDragging ? `nodus-tab-drop-${dropSide}` : "";

  const setRef = (element: HTMLElement | null) => {
    // antd measures its tabs through this ref, so it is kept next to dnd-kit's.
    assignRef(node.props.ref, element);
    setNodeRef(element);
  };

  return cloneElement(node, {
    ref: setRef,
    className: [node.props.className, dropClass].filter(Boolean).join(" "),
    style: {
      ...node.props.style,
      transform: CSS.Translate.toString(transform),
      // antd gives a tab a 0.3s transition on everything, which makes the dragged tab trail the pointer.
      transition: isDragging ? "none" : transition,
    },
    ...listeners,
  });
};

// Mouse drag only: antd's tabs handle Space, Enter and Delete themselves, so dnd-kit's keyboard sensor never gets a
// turn. The keyboard way to reorder is a shortcut (useTabShortcuts).
export const useSortableTabBar = ({ tabIds, onMove }: UseSortableTabBarInput) => {
  // A drag starts after 8px, so a plain click still selects the tab.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) onMove(String(active.id), String(over.id));
  };

  // antd types the tab node as ReactElement<unknown>; it is a div, so it takes the props of TabNodeProps.
  const renderTabBar: NonNullable<TabsProps["renderTabBar"]> = (barProps, DefaultTabBar) => (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={tabIds} strategy={keepInPlace}>
        <DefaultTabBar {...barProps}>
          {(node) => <SortableTabNode key={node.key} id={String(node.key)} node={node as ReactElement<TabNodeProps>} />}
        </DefaultTabBar>
      </SortableContext>
    </DndContext>
  );

  return renderTabBar;
};
