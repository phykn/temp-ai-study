// Vercel 함수 입구: Vercel은 api/ 폴더의 파일만 서버 함수로 돌린다 (루트 server.js는 정적 파일로 취급됨)
// 실제 처리는 루트 server.js가 내보내는 handle 하나 — 로컬(npm start)과 같은 함수다
export { default } from "../server.js";
