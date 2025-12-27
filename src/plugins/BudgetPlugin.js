import { registerPlugin } from "@capacitor/core";

// 두 번째 인자를 완전히 제거해야 Capacitor가 네이티브(Java) 코드를 찾으러 갑니다.
export const BudgetPlugin = registerPlugin("BudgetPlugin");
