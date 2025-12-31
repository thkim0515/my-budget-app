import * as S from "../pages/Main/DetailPage.styles";
import { formatNumber, unformatNumber } from "../utils/numberFormat";

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
}) {
  const handleAmountChange = (e) => {
    const v = e.target.value.replace(/[^0-9.]/g, "");
    const fixed = v.replace(/(\..*)\./g, "$1");
    setAmount(fixed);
  };

  const applyUnit = (value) => {
    const raw = unformatNumber(amount);
    if (!raw && raw !== 0) return;
    setAmount(formatNumber(Math.round(raw * value)));
  };

  return (
    <>
      <h2 style={{ margin: "20px 0" }}>{isEditing ? "내역 수정" : "입력"}</h2>
      <S.InputBox type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} />
      <S.SelectBox value={category} onChange={(e) => setCategory(e.target.value)}>
        {categories.map((cat) => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </S.SelectBox>
      <S.InputBox placeholder="항목명" value={title} onChange={(e) => setTitle(e.target.value)} />
      <S.AmountInputWrap>
        <S.InputBox
          placeholder="금액"
          value={amount}
          onChange={handleAmountChange}
          style={{ paddingRight: "40px" }}
        />
        {unformatNumber(amount) > 0 && <S.ClearBtn onClick={() => setAmount("")}>×</S.ClearBtn>}
      </S.AmountInputWrap>

      <S.UnitBtnRow>
        <S.UnitBtn onClick={() => applyUnit(10000)}>만</S.UnitBtn>
        <S.UnitBtn onClick={() => applyUnit(100000)}>십만</S.UnitBtn>
        <S.UnitBtn onClick={() => applyUnit(1000000)}>백만</S.UnitBtn>
      </S.UnitBtnRow>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        {isEditing ? (
          <>
            <S.ActionBtn $variant="confirm" onClick={() => onSave(editType)}>수정 완료</S.ActionBtn>
            <S.ActionBtn $variant="toggle" onClick={onTogglePaid}>
              {editRecord?.isPaid ? "납부 취소" : "납부 완료"}
            </S.ActionBtn>
            <S.ActionBtn $variant="cancel" $flex={0.5} onClick={onCancel}>취소</S.ActionBtn>
          </>
        ) : (
          <>
            <S.ActionBtn $variant="income" onClick={() => onSave("income")}>수입</S.ActionBtn>
            <S.ActionBtn $variant="expense" onClick={() => onSave("expense")}>지출</S.ActionBtn>
          </>
        )}
      </div>
    </>
  );
}