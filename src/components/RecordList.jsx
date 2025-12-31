import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { FiTrash2, FiGrid, FiCoffee, FiTruck, FiPhone, FiShoppingBag, FiMusic, FiCreditCard } from "react-icons/fi";
import * as S from "../pages/Main/DetailPage.styles";
import { formatNumber } from "../utils/numberFormat";

const categoryIconMap = {
  식비: FiCoffee, 교통: FiTruck, 통신: FiPhone, 쇼핑: FiShoppingBag,
  문화: FiMusic, 금융: FiCreditCard, 카드: FiCreditCard, 기타: FiGrid,
};

export default function RecordList({
  incomeList,
  expenseList,
  settings,
  editId,
  unit,
  onToggleIncomeGroup,
  onToggleExpenseGroup,
  onDragEnd,
  onEdit,
  onDelete,
}) {
  const renderItems = (list, droppableId, isGrouped) => (
    <Droppable droppableId={droppableId}>
      {(provided) => (
        <S.List ref={provided.innerRef} {...provided.droppableProps}>
          {list.map((r, index) => {
            const CategoryIcon = categoryIconMap[r.category] || FiGrid;
            return (
              <Draggable
                key={r.id}
                draggableId={String(r.id)}
                index={index}
                isDragDisabled={isGrouped || (r.isAggregated && r.count > 1)}
              >
                {(p, snapshot) => (
                  <S.ListItem
                    ref={p.innerRef}
                    {...p.draggableProps}
                    {...p.dragHandleProps}
                    onClick={() => onEdit(r)}
                    $isEditing={r.id === editId}
                    $isPaid={r.isPaid}
                    $isAggregated={r.isAggregated && r.count > 1}
                    id={`record-${r.id}`}
                    style={{
                      ...p.draggableProps.style,
                      opacity: snapshot.isDragging ? 0.7 : 1,
                    }}
                  >
                    <S.CardInfo>
                      <S.CardMetaRow>
                        <S.CategoryIconWrap><CategoryIcon /></S.CategoryIconWrap>
                        <span>{r.category} · {String(r.date || r.createdAt).split("T")[0]}</span>
                        {r.isAggregated && r.count > 1 && (
                          <span style={{ color: "#2196F3", fontWeight: 600, marginLeft: 6 }}>
                            [{r.count}건 합산]
                          </span>
                        )}
                      </S.CardMetaRow>
                      <S.CardTitle title={r.title}>{r.title}</S.CardTitle>
                    </S.CardInfo>
                    <S.CardRight>
                      <S.CardAmount>{formatNumber(r.amount)}{unit}</S.CardAmount>
                      {(!r.isAggregated || r.count === 1) && (
                        <S.CardAction
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(r.id, false);
                          }}
                          aria-label="삭제"
                        >
                          <FiTrash2 />
                        </S.CardAction>
                      )}
                    </S.CardRight>
                  </S.ListItem>
                )}
              </Draggable>
            );
          })}
          {provided.placeholder}
        </S.List>
      )}
    </Droppable>
  );

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>수입 목록</h3>
        <S.ToggleLabel onClick={onToggleIncomeGroup}>
          <span>모아보기</span>
          <S.ToggleSwitch $isOn={settings.isIncomeGrouped} />
        </S.ToggleLabel>
      </div>
      {renderItems(incomeList, "incomeList", settings.isIncomeGrouped)}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>지출 목록</h3>
        <S.ToggleLabel onClick={onToggleExpenseGroup}>
          <span>모아보기</span>
          <S.ToggleSwitch $isOn={settings.isExpenseGrouped} />
        </S.ToggleLabel>
      </div>
      {renderItems(expenseList, "expenseList", settings.isExpenseGrouped)}
    </DragDropContext>
  );
}