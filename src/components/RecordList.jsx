/* src/components/RecordList.jsx */
import React, { useState, useRef } from "react";
import ReactDOM from "react-dom";
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

const DraggablePortal = ({ children, snapshot }) => {
  if (!snapshot.isDragging) return children;
  return ReactDOM.createPortal(children, document.body);
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
  const [isDragActive, setIsDragActive] = useState(false); // 드래그 중 새로고침 방지용
  const startY = useRef(0);

  const handleTouchStart = (e) => {
    // 드래그 중이거나 스크롤이 맨 위가 아니면 무시
    if (isDragActive || window.scrollY !== 0) return;
    startY.current = e.touches[0].pageY;
  };

  const handleTouchMove = (e) => {
    if (startY.current === 0 || isRefreshing || isDragActive) return;
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

  const handleBeforeDragStart = () => {
    setIsDragActive(true);
  };

  const handleDragEndAction = (result) => {
    setIsDragActive(false);
    onDragEnd(result);
  };

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
                  <DraggablePortal snapshot={snapshot}>
                    <S.ListItem
                      ref={p.innerRef}
                      {...p.draggableProps}
                      {...p.dragHandleProps}
                      onClick={() => !snapshot.isDragging && onEdit(r)}
                      $isEditing={r.id === editId}
                      $isDragging={snapshot.isDragging}
                      $isPaid={r.isPaid}
                      $isAggregated={r.isAggregated && r.count > 1}
                      id={`record-${r.id}`}
                      style={{
                        ...p.draggableProps.style,
                        width: snapshot.isDragging ? "calc(100% - 32px)" : "100%",
                        maxWidth: snapshot.isDragging ? "448px" : "none",
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
                        <S.CardTitle title={r.title}>{r.title}</S.CardTitle>
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
                  </DraggablePortal>
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
        <DragDropContext onBeforeDragStart={handleBeforeDragStart} onDragEnd={handleDragEndAction}>
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