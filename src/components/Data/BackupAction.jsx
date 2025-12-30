import { useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { useBudgetDB } from "../../hooks/useBudgetDB";
import * as S from "../../pages/Settings/SettingsPage.styles";

export default function BackupAction() {
  const fileInputRef = useRef(null);
  const { db, getAll, clear } = useBudgetDB();

  const requestPermission = async () => {
    const perm = await Filesystem.requestPermissions();
    return perm.publicStorage === "granted";
  };

  const backupData = async () => {
    const chapters = await getAll("chapters");
    const records = await getAll("records");
    const categories = await getAll("categories");

    const data = {
      chapters,
      records,
      categories,
      exportedAt: new Date().toISOString(),
    };

    const fileName = `budget_backup_${new Date()
      .toISOString()
      .slice(0, 10)}.json`;

    // 웹 환경
    if (!Capacitor.isNativePlatform()) {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert("백업 파일이 다운로드되었습니다.");
      return;
    }

    // 모바일 환경
    const granted = await requestPermission();
    if (!granted) {
      alert("파일 저장 권한이 필요합니다.");
      return;
    }

    try {
      await Filesystem.writeFile({
        path: fileName,
        data: JSON.stringify(data, null, 2),
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
      alert("백업 파일이 저장되었습니다.");
    } catch (err) {
      alert("백업 실패: " + err.message);
    }
  };

  const restoreData = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm("기존 데이터가 삭제되고 백업 파일로 대체됩니다.")) {
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);

        if (!data.chapters || !data.records || !data.categories) {
          throw new Error("올바르지 않은 백업 파일 형식입니다.");
        }

        await clear("chapters");
        await clear("records");
        await clear("categories");

        const tx = db.transaction(
          ["chapters", "records", "categories"],
          "readwrite"
        );

        data.chapters.forEach((c) =>
          tx.objectStore("chapters").put(c)
        );
        data.records.forEach((r) =>
          tx.objectStore("records").put(r)
        );
        data.categories.forEach((cat) =>
          tx.objectStore("categories").put(cat)
        );

        await tx.done;
        alert("복구 완료되었습니다.");
      } catch (err) {
        alert("복구 실패: " + err.message);
      }
    };

    reader.readAsText(file);
  };

  return (
    <>
      <S.Row50>
        <S.Btn
          onClick={backupData}
          style={{ background: "#4C6EF5" }}
        >
          데이터 백업 다운로드
        </S.Btn>

        <S.Btn
          onClick={() => fileInputRef.current.click()}
          style={{ background: "#6C757D" }}
        >
          데이터 복구 파일 불러오기
        </S.Btn>
      </S.Row50>

      <input
        type="file"
        accept=".json"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={restoreData}
      />
    </>
  );
}
