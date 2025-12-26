import { httpsCallable } from "firebase/functions";
import { functions } from "../db/firebase";
import { useBudgetDB } from "./useBudgetDB";

export function useSync() {
  const { getAll, clear, db } = useBudgetDB();

  // 서버로 데이터 업로드 > 코드 발급
  const generateSyncCode = async () => {
    const chapters = await getAll("chapters");
    const records = await getAll("records");
    const categories = await getAll("categories");

    const payload = {
      chapters,
      records,
      categories,
      exportedAt: new Date().toISOString()
    };

    const upload = httpsCallable(functions, "uploadSyncData");
    const result = await upload({ payload });

    return result.data.pairingCode;
  };

  // 코드 입력 > 서버 데이터 수신 > 로컬 덮어쓰기
  const syncFromServer = async (code) => {
    const download = httpsCallable(functions, "downloadSyncData");
    const result = await download({ code });

    const data = result.data;

    await clear("chapters");
    await clear("records");
    await clear("categories");

    const tx = db.transaction(
      ["chapters", "records", "categories"],
      "readwrite"
    );

    data.chapters.forEach(v => tx.objectStore("chapters").put(v));
    data.records.forEach(v => tx.objectStore("records").put(v));
    data.categories.forEach(v => tx.objectStore("categories").put(v));

    await tx.done;
    return true;
  };

  return { generateSyncCode, syncFromServer };
}
