const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

/**
 * 6자리 숫자 랜덤 코드 생성
 */
function generateCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

/**
 * 데이터 업로드
 */
exports.uploadSyncData = onRequest(
  { 
    region: "asia-northeast3", 
    memory: "1GiB", 
    cors: true, 
  },
  async (req, res) => {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      // payload와 사용자 지정 암호(password)를 받습니다.
      const compressedPayload = body.payload || body.data?.payload;
      const userPassword = body.password || body.data?.password;

      if (!compressedPayload) {
        return res.status(400).json({ error: "payload가 필요합니다." });
      }
      if (!userPassword) {
        return res.status(400).json({ error: "보안을 위한 암호를 설정해주세요." });
      }

      const pairingCode = generateCode();

      // Firestore에 암호와 함께 저장
      await db.collection("sync_codes").doc(pairingCode).set({
        payload: compressedPayload,
        password: userPassword, // 사용자 지정 암호 저장
        createdAt: FieldValue.serverTimestamp(),
        isUsed: false,
      });

      return res.json({ data: { pairingCode } });
    } catch (err) {
      console.error("Upload Error:", err);
      return res.status(500).json({ error: err.message });
    }
  }
);

/**
 * 데이터 다운로드
 */
exports.downloadSyncData = onRequest(
  { 
    region: "asia-northeast3", 
    memory: "1GiB", 
    cors: true,
  },
  async (req, res) => {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const code = (body.code || body.data?.code);
      const inputPassword = body.password || body.data?.password; // 사용자가 입력한 암호

      if (!code || !inputPassword) {
        return res.status(400).json({ error: "코드와 암호를 모두 입력해주세요." });
      }

      const ref = db.collection("sync_codes").doc(code);
      const snap = await ref.get();

      if (!snap.exists) {
        return res.status(404).json({ error: "유효하지 않은 코드입니다." });
      }

      const doc = snap.data();

      // 1. 사용 여부 체크
      if (doc.isUsed) {
        return res.status(409).json({ error: "이미 사용된 코드입니다." });
      }

      // 2. 암호 일치 여부 체크
      if (doc.password !== inputPassword) {
        return res.status(401).json({ error: "암호가 일치하지 않습니다." });
      }

      // 3. 3분 만료 체크
      const createdAt = doc.createdAt.toMillis();
      if ((Date.now() - createdAt) / (1000 * 60) > 3) {
        return res.status(410).json({ error: "코드가 만료되었습니다." });
      }

      // 성공 시 사용 완료 처리
      await ref.update({ isUsed: true });

      return res.json({ data: doc.payload });
    } catch (err) {
      console.error("Download Error:", err);
      return res.status(500).json({ error: err.message });
    }
  }
);