/**
 * 안드로이드 하드웨어 뒤로가기 우선순위 스택.
 * 모달/바텀시트가 열려 있으면 뒤로가기가 페이지를 빠져나가는 대신
 * 가장 최근에 등록된 핸들러(보통 "시트 닫기")를 먼저 소비하도록 한다.
 */
const stack = [];

// 핸들러 등록. 반환된 함수를 호출하면 등록 해제된다.
export const pushBackHandler = (fn) => {
  stack.push(fn);
  return () => {
    const idx = stack.indexOf(fn);
    if (idx !== -1) stack.splice(idx, 1);
  };
};

// 뒤로가기를 소비한 경우 true 반환 (이때 페이지 네비게이션을 막아야 함).
export const consumeBack = () => {
  const fn = stack[stack.length - 1];
  if (fn) {
    fn();
    return true;
  }
  return false;
};
