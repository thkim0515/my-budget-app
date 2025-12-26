const { onCall } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { HttpsError } = require("firebase-functions/v2/https");

initializeApp();
const db = getFirestore();

// 7자리 코드 생성
function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 7; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 업로드
exports.uploadSyncData = onCall(
  { region: "asia-northeast3" },
  async (request) => {
    const pairingCode = generateCode();

    await db.collection("sync_codes").doc(pairingCode).set({
      payload: request.data.payload,
      createdAt: FieldValue.serverTimestamp(),
      isUsed: false,
    });

    return { pairingCode };
  }
);

// 다운로드
exports.downloadSyncData = onCall(
  { region: "asia-northeast3" },
  async (request) => {
    const code = request.data.code?.toUpperCase();
    if (!code) {
      throw new HttpsError("invalid-argument", "코드가 필요합니다.");
    }

    const ref = db.collection("sync_codes").doc(code);
    const snap = await ref.get();

    if (!snap.exists) {
      throw new HttpsError("not-found", "유효하지 않은 코드입니다.");
    }

    const doc = snap.data();

    if (doc.isUsed) {
      throw new HttpsError("already-exists", "이미 사용된 코드입니다.");
    }

    const createdAt = doc.createdAt.toMillis();
    const diffMinutes = (Date.now() - createdAt) / (1000 * 60);

    if (diffMinutes > 3) {
      throw new HttpsError("deadline-exceeded", "유효 시간이 만료되었습니다.");
    }

    await ref.update({ isUsed: true });
    return doc.payload;
  }
);
