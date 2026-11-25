// 입구: 실제 처리는 src/server.js. 로직은 넣지 않는다.
// - 직접 실행(node server.js · npm start · 테스트): 서버를 켠다
// - Vercel: 서버를 켜지 않고 아래 기본 내보내기 함수만 입구로 씀
import handle, { start } from "./src/server.js";

if (import.meta.main) start();

export default handle;
