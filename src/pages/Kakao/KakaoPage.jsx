import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/UI/Header";
import { useBudgetDB } from "../../hooks/useBudgetDB";
import { importFromRecords, loadFlow, rememberMerchantCategory, saveFlow } from "../../utils/kakaoIngest";
import * as S from "./KakaoPage.styles";
import { FlowSheet, NotiLogSheet, TxSheet } from "./KakaoSheets";
import PaymentsTab from "./PaymentsTab";
import FlowTab from "./FlowTab";
import AnalysisTab from "./AnalysisTab";

const TABS = [["payments", "결제"], ["flow", "자금 흐름"], ["analysis", "소비 분석"]];

export default function KakaoPage() {
  const navigate = useNavigate();
  const { db, getAll, add, put, deleteItem } = useBudgetDB();
  const [txs, setTxs] = useState([]);
  const [flow, setFlow] = useState(loadFlow);
  const [tab, setTab] = useState("payments");
  const [editing, setEditing] = useState(null); // null | "new" | 거래
  const [flowOpen, setFlowOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  const reload = useCallback(async () => {
    if (!db) return;
    setTxs((await getAll("kakaoTx")).filter((t) => !t.spendOnly).sort((a, b) => b.ts - a.ts));
  }, [db, getAll]);

  useEffect(() => {
    reload();
    window.addEventListener("budget-db-updated", reload);
    // 알림은 백그라운드 동기화로 조용히 들어오므로 화면을 켜 둔 동안 주기적으로 다시 읽는다.
    const timer = setInterval(() => document.visibilityState === "visible" && reload(), 20000);
    return () => {
      window.removeEventListener("budget-db-updated", reload);
      clearInterval(timer);
    };
  }, [reload]);

  const updateFlow = useCallback((next) => {
    setFlow(next);
    saveFlow(next);
  }, []);

  const saveTx = async (fields) => {
    if (editing === "new") {
      await add("kakaoTx", { ...fields, balanceAfter: null, inputMode: "manual", pkg: "" });
    } else {
      if (fields.category !== editing.category) rememberMerchantCategory(fields.merchant, fields.category);
      await put("kakaoTx", { ...editing, ...fields });
    }
    setEditing(null);
  };

  const deleteTx = async () => {
    if (!window.confirm("이 내역을 삭제할까요?")) return;
    await deleteItem("kakaoTx", editing.id);
    setEditing(null);
  };

  const importRecords = async () => {
    const count = await importFromRecords({ getAll, add });
    window.dispatchEvent(new CustomEvent("budget-db-updated"));
    alert(count > 0 ? `${count}건을 가져왔습니다.` : "새로 가져올 내역이 없습니다.");
  };

  const openEdit = useMemo(() => (tx) => setEditing(tx), []);

  return (
    <S.Page>
      <Header title="내 카카오뱅크" onSettings={() => navigate("/settings")} rightButton={<S.AddBtn type="button" onClick={() => setEditing("new")}>＋ 내역 추가</S.AddBtn>} />
      <S.Body>
        <S.Segment role="tablist">
          {TABS.map(([key, label]) => (
            <S.SegmentBtn key={key} type="button" role="tab" aria-selected={tab === key} $active={tab === key} onClick={() => setTab(key)}>{label}</S.SegmentBtn>
          ))}
        </S.Segment>
        {tab === "payments" && <PaymentsTab txs={txs} onEdit={openEdit} />}
        {tab === "flow" && <FlowTab txs={txs} flow={flow} onChangeFlow={updateFlow} onOpenSettings={() => setFlowOpen(true)} onEdit={openEdit} />}
        {tab === "analysis" && <AnalysisTab txs={txs} flow={flow} />}
      </S.Body>
      {editing && <TxSheet tx={editing === "new" ? null : editing} onSave={saveTx} onDelete={deleteTx} onClose={() => setEditing(null)} />}
      {flowOpen && <FlowSheet flow={flow} txs={txs} onChange={updateFlow} onImport={importRecords} onShowLog={() => setLogOpen(true)} onClose={() => setFlowOpen(false)} />}
      {logOpen && <NotiLogSheet onClose={() => setLogOpen(false)} />}
    </S.Page>
  );
}
