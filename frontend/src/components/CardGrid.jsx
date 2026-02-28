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

export default function CardGrid({ items, setItems, onOpen }) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Exige mover el ratón 5 píxeles para iniciar el arrastre. ¡Esto libera el clic!
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event) {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      // Actualizamos el estado en App.jsx con el nuevo orden
      setItems(arrayMove(items, oldIndex, newIndex));
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={rectSortingStrategy}>
        <div style={masonryContainerStyle}>
          {items.map((item) => (
            /* Envolvemos la card para controlar el espaciado vertical */
            <div key={item.id} style={itemWrapperStyle}>
              <InboxCard item={item} onOpen={onOpen} />
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

const masonryContainerStyle = {
  columnCount: "auto",      // El navegador decide cuántas columnas poner 
  columnWidth: "320px",    // Ancho sugerido de cada columna 
  columnGap: "25px",       // Separación horizontal idéntica 
  width: "100%",
  padding: "20px 0"
};

const itemWrapperStyle = {
  breakInside: "avoid",    // Evita que una tarjeta se parta entre dos columnas 
  marginBottom: "25px",    // Separación vertical idéntica a la horizontal 
  display: "block",
  width: "100%"
};

const gridStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "25px",
  padding: "20px 0",
  justifyContent: "flex-start",
  alignItems: "flex-start"
};