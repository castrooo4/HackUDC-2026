import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import InboxCard from "./Inboxcard";

export default function CardGrid({ items, setItems, onOpen, onDelete, onPin }) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    setItems(arrayMove(items, oldIndex, newIndex));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={rectSortingStrategy}>
        <div style={masonryContainerStyle}>
          {items.map((item) => (
            <div key={item.id} style={itemWrapperStyle}>
              <InboxCard
                item={item}
                onOpen={onOpen}
                onDelete={onDelete}
                onPin={onPin}
              />
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

const masonryContainerStyle = {
  columnCount: window.innerWidth > 768 ? "auto" : 1,
  columnWidth: window.innerWidth > 768 ? "320px" : "100%", 
  columnGap: window.innerWidth > 768 ? "25px" : "0px",
  width: "100%",
  padding: window.innerWidth > 768 ? "20px 0" : "10px 0",
};

const itemWrapperStyle = {
  breakInside: "avoid",
  WebkitBreakInside: "avoid",
  marginBottom: "25px",
  display: "block",
  width: "100%",
};