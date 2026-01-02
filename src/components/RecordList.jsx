import React, { useState, useRef } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { FiTrash2, FiGrid, FiCoffee, FiTruck, FiPhone, FiShoppingBag, FiMusic, FiCreditCard, FiRefreshCw, FiChevronDown, FiChevronUp } from "react-icons/fi";
import * as S from "../pages/Main/DetailPage.styles";
import { formatNumber } from "../utils/numberFormat";

const categoryIconMap = {
  식비: FiCoffee,
  교통: FiTruck,
  통신: FiPhone,
  쇼핑: FiShoppingBag,
  문화: FiMusic,
  금융: FiCreditCard,
  카드: FiCreditCard,
  기타: FiGrid,
};

export default function RecordList({
  incomeList = [],
  budgetList = [],
  expenseList = [],
  settings = {},
  editId,
  unit,
  collapsedState = { income: false, budget: false, expense: false },
  onToggleSection = () => {},
  onToggleIncomeGroup,
  onToggleExpenseGroup,
  onDragEnd,
  onEdit,
  onDelete,
  onRefresh,
}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);

  // --- 당겨서 새로고침 로직 ---
  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].pageY;
    }
  };

  const handleTouchMove = (e) => {
    if (startY.current === 0 || isRefreshing) return;
    const currentY = e.touches[0].pageY;
    const distance = currentY - startY.current;
    if (distance > 0) {
      setPullDistance(distance * 0.4);
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 50 && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(50);
      if (onRefresh) {
        await onRefresh();
      }
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 500);
    } else {
      setPullDistance(0);
    }
    startY.current = 0;
  };

  const renderItems = (list, droppableId, isGrouped) => (
    <Droppable droppableId={droppableId}>
      {(provided) => (
        <S.List ref={provided.innerRef} {...provided.droppableProps}>
          {list.map((r, index) => {
            const CategoryIcon = categoryIconMap[r.category] || FiGrid;
            return (
              <Draggable key={r.id} draggableId={String(r.id)} index={index} isDragDisabled={isGrouped || (r.isAggregated && r.count > 1)}>
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
                        <S.CategoryIconWrap>
                          <CategoryIcon />
                        </S.CategoryIconWrap>
                        <span>
                          {r.category} · {String(r.date || r.createdAt).split("T")[0]}
                        </span>
                        {r.isPaid && <S.PaidBadge style={{ marginLeft: "8px" }}>납부완료</S.PaidBadge>}
                        {r.isAggregated && r.count > 1 && <span style={{ color: "#2196F3", fontWeight: 600, marginLeft: 6 }}>[{r.count}건 합산]</span>}
                      </S.CardMetaRow>
                      <S.CardTitle title={r.title}>
                        {r.title}
                      </S.CardTitle>
                    </S.CardInfo>
                    <S.CardRight>
                      <S.CardAmount>
                        {formatNumber(r.amount)}
                        {unit}
                      </S.CardAmount>
                      {(!r.isAggregated || r.count === 1) && (
                        <S.CardAction
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(r.id, false);
                          }}
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
    <S.PullToRefreshContainer onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <S.RefreshIndicator $pullDistance={pullDistance} $isRefreshing={isRefreshing}>
        {isRefreshing ? <FiRefreshCw className="spin" /> : pullDistance > 40 ? "놓아서 새로고침" : "아래로 당겨서 새로고침"}
      </S.RefreshIndicator>

      <S.RefreshContent $pullDistance={pullDistance} $isRefreshing={isRefreshing}>
        <DragDropContext onDragEnd={onDragEnd}>
          {/* 1. 수입 목록 */}
          <S.SectionHeader>
            <h3>수입 내역</h3>
            <S.HeaderActions>
              <S.ToggleLabel onClick={onToggleIncomeGroup}>
                <span>모아보기</span>
                <S.ToggleSwitch $isOn={settings.isIncomeGrouped} />
              </S.ToggleLabel>
              <S.CollapseBtn onClick={() => onToggleSection("income")}>
                {collapsedState.income ? (
                  <>
                    <FiChevronDown /> 펼치기
                  </>
                ) : (
                  <>
                    <FiChevronUp /> 접기
                  </>
                )}
              </S.CollapseBtn>
            </S.HeaderActions>
          </S.SectionHeader>
          {!collapsedState.income && renderItems(incomeList, "incomeList", settings.isIncomeGrouped)}

          {/* 2. 예산 목록 */}
          <S.SectionHeader>
            <h3>예산 목록 (직접 입력)</h3>
            <S.HeaderActions>
              <S.CollapseBtn onClick={() => onToggleSection("budget")}>
                {collapsedState.budget ? (
                  <>
                    <FiChevronDown /> 펼치기
                  </>
                ) : (
                  <>
                    <FiChevronUp /> 접기
                  </>
                )}
              </S.CollapseBtn>
            </S.HeaderActions>
          </S.SectionHeader>
          {!collapsedState.budget && renderItems(budgetList, "budgetList", false)}

          {/* 3. 지출 목록 */}
          <S.SectionHeader>
            <h3>지출 목록 (자동 기록)</h3>
            <S.HeaderActions>
              <S.ToggleLabel onClick={onToggleExpenseGroup}>
                <span>모아보기</span>
                <S.ToggleSwitch $isOn={settings.isExpenseGrouped} />
              </S.ToggleLabel>
              <S.CollapseBtn onClick={() => onToggleSection("expense")}>
                {collapsedState.expense ? (
                  <>
                    <FiChevronDown /> 펼치기
                  </>
                ) : (
                  <>
                    <FiChevronUp /> 접기
                  </>
                )}
              </S.CollapseBtn>
            </S.HeaderActions>
          </S.SectionHeader>
          {!collapsedState.expense && renderItems(expenseList, "expenseList", settings.isExpenseGrouped)}
        </DragDropContext>
      </S.RefreshContent>
    </S.PullToRefreshContainer>
  );
}
