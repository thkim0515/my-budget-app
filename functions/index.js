// functions/index.js
const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

/**
 * 6자리 숫자 랜덤 코드 생성 (기기 이동 및 비로그인 유저용)
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
 * 클라이언트에서 이미 암호화된 payload를 받으므로 password는 저장하지 않습니다.
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
      // 클라이언트의 useSync.js에서 보낸 payload와 uid 추출
      const { payload, uid } = body.payload ? body : (body.data || {});

      if (!payload) {
        return res.status(400).json({ error: "payload가 필요합니다." });
      }

      // 1. 로그인 유저인 경우 계정 전용 공간(users)에 영구 저장
      if (uid) {
        await db.collection("users").doc(uid).set({
          payload: payload, // 암호화된 상태
          updatedAt: FieldValue.serverTimestamp()
        });
      }

      // 2. 공통: 6자리 1회용 코드 생성 및 저장 (기기 이동용)
      const pairingCode = generateCode();
      await db.collection("sync_codes").doc(pairingCode).set({
        payload: payload, // 암호화된 상태
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
 * 로그인 정보(uid)가 있으면 계정에서, 없으면 6자리 코드로 데이터를 찾습니다.
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
      const { code, uid } = body.code || body.uid ? body : (body.data || {});

      let payload = null;

      // 1. UID가 있다면 본인 계정 데이터 우선 조회
      if (uid) {
        const userSnap = await db.collection("users").doc(uid).get();
        if (userSnap.exists) {
          payload = userSnap.data().payload;
        }
      }

      // 2. 계정 데이터가 없거나 코드가 직접 전달된 경우 1회용 코드 조회
      if (!payload && code) {
        const codeSnap = await db.collection("sync_codes").doc(code).get();
        
        if (!codeSnap.exists) {
          return res.status(404).json({ error: "유효하지 않은 코드입니다." });
        }

        const docData = codeSnap.data();

        if (docData.isUsed) {
          return res.status(409).json({ error: "이미 사용된 코드입니다." });
        }

        // 3분 만료 체크
        const createdAt = docData.createdAt.toMillis();
        if ((Date.now() - createdAt) / (1000 * 60) > 3) {
          return res.status(410).json({ error: "코드가 만료되었습니다." });
        }

        payload = docData.payload;
        // 성공 시 코드 사용 처리
        await codeSnap.ref.update({ isUsed: true });
      }

      if (!payload) {
        return res.status(404).json({ error: "데이터를 찾을 수 없습니다." });
      }

      return res.json({ data: payload }); // 복호화는 클라이언트(useSync.js)에서 수행
    } catch (err) {
      console.error("Download Error:", err);
      return res.status(500).json({ error: err.message });
    }
  }
);