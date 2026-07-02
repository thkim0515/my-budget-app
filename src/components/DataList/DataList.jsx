/* src/components/DataList/DataList.jsx */
import React, { useState, useRef } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { FiGrid, FiCoffee, FiTruck, FiPhone, FiShoppingBag, FiMusic, FiCreditCard, FiRefreshCw, FiChevronDown, FiChevronUp } from "react-icons/fi";
import * as S from "./DataList.styles";
import { formatNumber } from "../../utils/numberFormat";

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

const EMPTY_MSG = {
  income: "수입 내역이 없습니다",
  budget: "예산 항목이 없습니다",
  expense: "지출 내역이 없습니다",
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
  onRefresh,
  enablePullToRefresh = true,
}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const startY = useRef(0);

  const handleTouchStart = (e) => {
    if (!enablePullToRefresh) return;
    if (isDragActive || window.scrollY !== 0) return;
    startY.current = e.touches[0].pageY;
  };

  const handleTouchMove = (e) => {
    if (!enablePullToRefresh) return;
    if (startY.current === 0 || isRefreshing || isDragActive) return;
    const currentY = e.touches[0].pageY;
    const distance = currentY - startY.current;
    if (distance > 0) setPullDistance(distance * 0.4);
  };

  const handleTouchEnd = async () => {
    if (!enablePullToRefresh) return;
    if (pullDistance > 50 && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(50);
      if (onRefresh) await onRefresh();
      setTimeout(() => { setIsRefreshing(false); setPullDistance(0); }, 500);
    } else {
      setPullDistance(0);
    }
    startY.current = 0;
  };

  const handleBeforeDragStart = () => setIsDragActive(true);
  const handleDragEndAction = (result) => { setIsDragActive(false); onDragEnd(result); };

  const renderItems = (list, droppableId, isGrouped, emptyKey) => (
    <Droppable droppableId={droppableId}>
      {(provided) => (
        <S.List ref={provided.innerRef} {...provided.droppableProps}>
          {list.length === 0 && (
            <S.EmptyState>{EMPTY_MSG[emptyKey]}</S.EmptyState>
          )}
          {list.map((r, index) => {
            const CategoryIcon = categoryIconMap[r.category] || FiGrid;
            const isDragDisabled = isGrouped || (r.isAggregated && r.count > 1);
            const tone = r.type === "income" ? "income" : "expense";
            const sign = r.type === "income" ? "+" : "-";
            const excluded = !!r.excludedFromCalc;
            return (
              <Draggable key={r.id} draggableId={String(r.id)} index={index} isDragDisabled={isDragDisabled}>
                {(p, snapshot) => (
                  <S.ListItem
                    ref={p.innerRef}
                    {...p.draggableProps}
                    {...(!isDragDisabled ? p.dragHandleProps : {})}
                    $isDragging={snapshot.isDragging}
                    $isReorderMode={true}
                    id={`record-${r.id}`}
                    style={{
                      ...p.draggableProps.style,
                      margin: snapshot.isDragging ? 0 : "0 0 10px 0",
                    }}
                  >
                    <S.ItemCard
                      onClick={() => !snapshot.isDragging && onEdit(r)}
                      $isEditing={r.id === editId}
                      $isDragging={snapshot.isDragging}
                      $isPaid={r.isPaid}
                      $excluded={excluded}
                    >
                      <S.CardLeft>
                        <S.CategoryIconWrap $tone={tone}>
                          <CategoryIcon />
                        </S.CategoryIconWrap>
                        <S.CardInfo>
                          <S.CardTitle title={r.title}>
                            {r.title}
                            {r.isAggregated && r.count > 1 && (
                              <S.Badge $kind="count">{r.count}건</S.Badge>
                            )}
                          </S.CardTitle>
                          <S.CardMetaRow>
                            <span>{r.category} · {String(r.date || r.createdAt).split("T")[0]}</span>
                            {r.isPaid && <S.PaidBadge>납부완료</S.PaidBadge>}
                            {excluded && <S.Badge $kind="excluded">계산 제외</S.Badge>}
                          </S.CardMetaRow>
                        </S.CardInfo>
                      </S.CardLeft>
                      <S.CardRight>
                        <S.CardAmount $tone={tone} $excluded={excluded}>
                          {sign}{formatNumber(r.amount)}{unit}
                        </S.CardAmount>
                        {r.id === editId && <S.EditingDot title="수정 중" />}
                      </S.CardRight>
                    </S.ItemCard>
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
    <S.PullToRefreshContainer
      onTouchStart={enablePullToRefresh ? handleTouchStart : undefined}
      onTouchMove={enablePullToRefresh ? handleTouchMove : undefined}
      onTouchEnd={enablePullToRefresh ? handleTouchEnd : undefined}
    >
      {enablePullToRefresh && (
        <S.RefreshIndicator $pullDistance={pullDistance} $isRefreshing={isRefreshing}>
          {isRefreshing ? <FiRefreshCw className="spin" /> : pullDistance > 40 ? "놓아서 새로고침" : "아래로 당겨서 새로고침"}
        </S.RefreshIndicator>
      )}

      <S.RefreshContent $pullDistance={enablePullToRefresh ? pullDistance : 0} $isRefreshing={enablePullToRefresh ? isRefreshing : false}>
        <DragDropContext onBeforeDragStart={handleBeforeDragStart} onDragEnd={handleDragEndAction}>
          <S.SectionHeader>
            <h3><S.SectionDot $tone="income" />수입 내역</h3>
            <S.HeaderActions>
              <S.ToggleLabel onClick={onToggleIncomeGroup}>
                <span>모아보기</span>
                <S.ToggleSwitch $isOn={settings.isIncomeGrouped} />
              </S.ToggleLabel>
              <S.CollapseBtn onClick={() => onToggleSection("income")}>
                {collapsedState.income ? <><FiChevronDown /> 펼치기</> : <><FiChevronUp /> 접기</>}
              </S.CollapseBtn>
            </S.HeaderActions>
          </S.SectionHeader>
          {!collapsedState.income && renderItems(incomeList, "incomeList", settings.isIncomeGrouped, "income")}

          <S.SectionHeader>
            <h3><S.SectionDot $tone="primary" />예산 목록 (직접 입력)</h3>
            <S.HeaderActions>
              <S.CollapseBtn onClick={() => onToggleSection("budget")}>
                {collapsedState.budget ? <><FiChevronDown /> 펼치기</> : <><FiChevronUp /> 접기</>}
              </S.CollapseBtn>
            </S.HeaderActions>
          </S.SectionHeader>
          {!collapsedState.budget && renderItems(budgetList, "budgetList", false, "budget")}

          <S.SectionHeader>
            <h3><S.SectionDot $tone="expense" />지출 목록 (자동 기록)</h3>
            <S.HeaderActions>
              <S.ToggleLabel onClick={onToggleExpenseGroup}>
                <span>모아보기</span>
                <S.ToggleSwitch $isOn={settings.isExpenseGrouped} />
              </S.ToggleLabel>
              <S.CollapseBtn onClick={() => onToggleSection("expense")}>
                {collapsedState.expense ? <><FiChevronDown /> 펼치기</> : <><FiChevronUp /> 접기</>}
              </S.CollapseBtn>
            </S.HeaderActions>
          </S.SectionHeader>
          {!collapsedState.expense && renderItems(expenseList, "expenseList", settings.isExpenseGrouped, "expense")}
        </DragDropContext>
      </S.RefreshContent>
    </S.PullToRefreshContainer>
  );
}
