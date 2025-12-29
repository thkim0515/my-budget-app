const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 7; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

exports.uploadSyncData = onRequest(
  { 
    region: "asia-northeast3", 
    memory: "1GiB", 
    cors: true, // application/json 요청 시 Preflight(OPTIONS) 자동 처리됨
  },
  async (req, res) => {
    try {
      // 1. Content-Type이 application/json이면 req.body는 이미 객체입니다.
      // 혹시 모를 상황(text/plain 등)을 대비해 방어 로직은 유지하되 간소화합니다.
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      // 2. Payload 추출
      // 클라이언트에서 JSON.stringify({ payload: ... }) 로 보냈으므로 body.payload로 접근
      const compressedPayload = body.payload || body.data?.payload;

      if (!compressedPayload) {
        console.error("Missing payload. Received body:", body); // 디버깅용 로그
        return res.status(400).json({ error: "payload is required" });
      }

      const pairingCode = generateCode();

      await db.collection("sync_codes").doc(pairingCode).set({
        payload: compressedPayload,
        createdAt: FieldValue.serverTimestamp(),
        isUsed: false,
      });

      return res.json({ data: { pairingCode } });
    } catch (err) {
      console.error("Function Error:", err);
      return res.status(500).json({ error: err.message });
    }
  }
);

/**
 * 다운로드
 */
exports.downloadSyncData = onRequest(
  { 
    region: "asia-northeast3", 
    memory: "1GiB", 
    cors: true,
  },
  async (req, res) => {
    try {
      // 업로드와 동일하게 처리
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const code = (body.code || body.data?.code)?.toUpperCase();

      if (!code) {
        return res.status(400).json({ error: "code is required" });
      }

      const ref = db.collection("sync_codes").doc(code);
      const snap = await ref.get();

      if (!snap.exists) {
        return res.status(404).json({ error: "유효하지 않은 코드입니다." });
      }

      const doc = snap.data();
      if (doc.isUsed) {
        return res.status(409).json({ error: "이미 사용된 코드입니다." });
      }

      // 3분 만료 체크
      const createdAt = doc.createdAt.toMillis();
      if ((Date.now() - createdAt) / (1000 * 60) > 3) {
        return res.status(410).json({ error: "코드가 만료되었습니다." });
      }

      await ref.update({ isUsed: true });

      return res.json({ data: doc.payload });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  }
);