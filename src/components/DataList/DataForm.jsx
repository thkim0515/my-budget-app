import { useRef } from "react";
import * as S from "./DataForm.styles"
import { formatNumber, unformatNumber } from "../../utils/numberFormat";

export default function RecordForm({
  isEditing,
  editRecord,
  editType,
  title,
  amount,
  category,
  categories,
  recordDate,
  setTitle,
  setAmount,
  setCategory,
  setRecordDate,
  onSave,
  onCancel,
  onTogglePaid,
  onToggleExclude,
  onCopy,
  onDelete,
}) {
  const handleAmountChange = (e) => {
    const v = e.target.value.replace(/[^0-9.]/g, "");
    const fixed = v.replace(/(\..*)\./g, "$1");
    if (Number(fixed.replace(/,/g, "")) > 1_000_000_000) return;
    setAmount(fixed);
  };

  const amountRef = useRef(null);

  const applyUnit = (value) => {
    const raw = unformatNumber(amount);
    if (!raw && raw !== 0) return;
    setAmount(formatNumber(Math.round(raw * value)));
    // 포커스를 금액 칸에 유지해 키보드가 닫히며 시트가 내려가는 현상을 막는다.
    amountRef.current?.focus({ preventScroll: true });
  };

  const handleDelete = () => {
    if (window.confirm("정말 삭제하시겠습니까?")) {
      onDelete?.();
    }
  };

  // 수입/지출 선택 시 포커스를 해제해 키보드를 닫고, 입력 시트가 아래로 내려가도록 한다.
  const handleTypeSave = (type) => {
    document.activeElement?.blur();
    onSave(type);
  };

  const isExcluded = !!editRecord?.excludedFromCalc;

  return (
    <>
      <S.FormTitle>{isEditing ? "내역 수정" : "새 내역 입력"}</S.FormTitle>

      <S.FieldLabel>날짜</S.FieldLabel>
      <S.InputBox type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} />

      <S.FieldLabel>카테고리</S.FieldLabel>
      <S.SelectBox value={category} onChange={(e) => setCategory(e.target.value)}>
        {categories.map((cat) => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </S.SelectBox>

      <S.FieldLabel>항목명</S.FieldLabel>
      <S.InputBox placeholder="예: 스타벅스, 월급" value={title} onChange={(e) => setTitle(e.target.value)} />

      <S.FieldLabel>금액</S.FieldLabel>
      <S.AmountInputWrap>
        <S.InputBox
          ref={amountRef}
          placeholder="0"
          inputMode="decimal"
          value={amount}
          onChange={handleAmountChange}
          style={{ paddingRight: "44px" }}
        />
        {unformatNumber(amount) > 0 && <S.ClearBtn onClick={() => setAmount("")}>×</S.ClearBtn>}
      </S.AmountInputWrap>

      <S.UnitBtnRow>
        {/* onMouseDown preventDefault: 버튼을 눌러도 금액 입력칸의 포커스(키보드)가 유지되어
            시트가 아래로 내려가지 않고 현재 상태 그대로 배수만 적용된다. */}
        <S.UnitBtn onMouseDown={(e) => e.preventDefault()} onClick={() => applyUnit(10000)}>+만</S.UnitBtn>
        <S.UnitBtn onMouseDown={(e) => e.preventDefault()} onClick={() => applyUnit(100000)}>+십만</S.UnitBtn>
        <S.UnitBtn onMouseDown={(e) => e.preventDefault()} onClick={() => applyUnit(1000000)}>+백만</S.UnitBtn>
      </S.UnitBtnRow>

      {isEditing ? (
        <>
          <S.ActionRow>
            <S.ActionBtn $variant="confirm" onClick={() => onSave(editType)}>수정 완료</S.ActionBtn>
            <S.ActionBtn $variant="toggle" onClick={onTogglePaid}>
              {editRecord?.isPaid ? "납부 취소" : "납부 완료"}
            </S.ActionBtn>
            <S.ActionBtn $variant="cancel" $flex={0.6} onClick={onCancel}>취소</S.ActionBtn>
          </S.ActionRow>
          {(onToggleExclude || onCopy) && (
            <S.SecondaryRow>
              {onToggleExclude && (
                <S.ExcludeToggleBtn type="button" $on={isExcluded} aria-pressed={isExcluded} onClick={onToggleExclude}>
                  {isExcluded ? "계산 제외 해제" : "이 항목 계산에서 제외"}
                </S.ExcludeToggleBtn>
              )}
              {onCopy && (
                <S.CopyBtn type="button" onClick={onCopy}>이 항목 복사하기</S.CopyBtn>
              )}
            </S.SecondaryRow>
          )}
          {onDelete && <S.DeleteBtn onClick={handleDelete}>이 항목 삭제</S.DeleteBtn>}
        </>
      ) : (
        <S.ActionRow>
          <S.ActionBtn $variant="income" onClick={() => handleTypeSave("income")}>＋ 수입</S.ActionBtn>
          <S.ActionBtn $variant="expense" onClick={() => handleTypeSave("expense")}>－ 지출</S.ActionBtn>
        </S.ActionRow>
      )}
    </>
  );
}
