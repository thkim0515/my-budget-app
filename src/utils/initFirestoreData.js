// 파베 초기 데이터 밀어넣기

import { db } from "../db/firebase";
import { doc, setDoc } from "firebase/firestore";

const CATEGORY_RULES = [
  { "category": "식비", "keywords": ["식당", "카페", "스타벅스", "투썸", "음식점", "베이커리", "메가커피", "컴포즈", "빽다방"] },
  { "category": "편의점", "keywords": ["gs25", "cu", "세븐일레븐", "미니스톱", "이마트24"] },
  { "category": "쇼핑", "keywords": ["쿠팡", "마켓컬리", "11번가", "네이버페이", "지마켓", "옥션", "다이소", "올리브영"] },
  { "category": "배달", "keywords": ["배민", "요기요", "쿠팡이츠", "배달의민족"] },
  { "category": "교통", "keywords": ["택시", "카카오t", "지하철", "버스", "철도", "코레일", "srt", "하이패스"] },
  { "category": "주유", "keywords": ["주유소", "sk에너지", "gs칼텍스", "에쓰오일", "현대오일", "알뜰주유"] },
  { "category": "생활", "keywords": ["관리비", "도시가스", "전기", "수도", "통신비", "sk텔레콤", "kt", "lgu+"] },
  { "category": "의료", "keywords": ["병원", "의원", "약국", "치과", "내과", "피부과"] },
  { "category": "구독", "keywords": ["넷플릭스", "netflix", "youtube", "스포티파이", "디즈니", "쿠팡와우"] },
  { "category": "취미", "keywords": ["cgv", "롯데시네마", "메가박스", "교보문고", "영화"] },
  { "category": "이체", "keywords": ["이체", "송금", "보내기"] }
];

const bankMap = [
  { key: "삼성", name: "삼성카드" },
  { key: "카카오뱅크", name: "카카오뱅크" },
  { key: "국민", name: "국민카드" },
  { key: "KB", name: "국민카드" },
  { key: "신한", name: "신한카드" },
  { key: "우리", name: "우리은행" },
  { key: "하나", name: "하나카드" },
  { key: "농협", name: "농협은행" },
  { key: "NH", name: "농협은행" },
  { key: "현대", name: "현대카드" },
  { key: "롯데", name: "롯데카드" },
  { key: "토스", name: "토스뱅크" },
  { key: "케이뱅크", name: "케이뱅크" },
  { key: "기업", name: "IBK기업은행" },
  { key: "우체국", name: "우체국" },
  { key: "카카오페이", name: "카카오페이" }
];


export const uploadInitialRules = async () => {
  try {
    await setDoc(doc(db, "config", "parserRules"), {
      CATEGORY_RULES,
      bankMap,
      updatedAt: Date.now()
    });
    console.log("Firestore 초기 데이터 복구 완료!");
    return true;
  } catch (error) {
    console.error("데이터 업로드 중 오류 발생:", error);
    return false;
  }
};