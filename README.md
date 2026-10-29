# 한걸음의 진심 홈페이지

부산형 경계선지능인 지원사업 홈페이지 제작 초안입니다.
스크롤형 반응형 페이지이며, GitHub Pages와 Vercel에서 별도 빌드 없이 배포합니다.

## 1. 내 컴퓨터에서 보기

Node.js LTS를 설치한 뒤 이 폴더에서 터미널을 열어 실행하세요.

    npm run dev

브라우저에서 http://127.0.0.1:4173 을 여세요.
종료할 때는 터미널에서 Ctrl+C를 누르세요.
index.html을 더블클릭하면 모듈 스크립트가 차단될 수 있으므로 위 방법을 사용하세요.

## 2. 구성

- index.html: 여섯 개 주요 영역, 자주 묻는 질문, 검사기관, 로그인·작성 창
- styles.css: 화면 크기별 레이아웃, 큰 글씨, 키보드 초점, 움직임 줄이기
- assets/: 직접 제작한 SVG 그림과 로고. 외부 사진을 사용할 필요가 없습니다.
- site-config.js: 프로그램 모집 상태·신청 주소·조건, Firebase 웹 구성값
- app.js: 메뉴, 안내 창, 사진 확대, 연습 작성, 관리자 화면
- firebase-service.js: Firebase Authentication·Firestore·Storage 연결 코드
- firestore.rules / storage.rules / firebase.json: 배포할 접근 규칙
- vercel.json: 정적 배포 보안 헤더
- server.mjs / package.json: 설치할 패키지 없이 실행하는 로컬 미리보기

Google Fonts의 Noto Sans KR을 불러오며, 연결이 안 되면 기기의 기본 sans-serif 글꼴을 사용합니다.

## 3. 프로그램 안내 바꾸기

site-config.js의 programs에서 정보를 수정합니다.

- status: preparing(준비 중), open(모집 중), closed(마감)
- url: 실제 HTTPS 신청 주소
- eligibility / fees / period / documents / location / response: 대상, 비용, 기간, 서류, 장소, 결과 안내

open이면서 HTTPS 주소가 있어야 실제 신청 링크가 나타납니다.
현재는 실제 신청서를 접수하지 않습니다. 접수 주소가 확정되면 연결하세요.
진단검사·자립교육의 연령, 비용, 일정, 서류, 검사기관 협약과 일경험 기관은 확정되지 않았습니다.
상담 전화번호를 임의로 만들지 않았습니다. 확정되면 문의 영역을 수정하세요.

## 4. GitHub에 올리기

1. GitHub에서 새 저장소를 만드세요.
2. 이 폴더의 파일을 저장소 최상위에 올리세요. index.html이 최상위여야 합니다.
3. GitHub Pages 사용 시 Settings → Pages → Deploy from a branch → main / (root)를 선택하세요.
4. 생성된 Pages 주소에서 확인하세요. 상대경로를 사용하므로 저장소 이름이 붙는 주소도 지원합니다.

비밀키, 서비스 계정 JSON, 개인정보 자료는 저장소에 올리지 마세요.
현재 GitHub 저장소 생성, push와 실제 외부 배포는 수행하지 않았습니다.

## 5. Vercel 배포

1. Vercel에서 Add New → Project → GitHub 저장소를 가져오세요.
2. Framework Preset: Other, Root Directory: 이 파일들이 있는 디렉터리
3. Build Command: 비워 두기, Output Directory: 기본값(프로젝트 루트)
4. Deploy를 누르세요. 이후 GitHub main 변경분을 자동 배포할 수 있습니다.

## 6. Firebase 연결

기본값은 enabled: false입니다. 이 상태에서는 사진과 문의가 브라우저 메모리에만 남고 새로고침하면 사라집니다. 실제 전송되지 않습니다.

1. Firebase Console에서 프로젝트를 만들고 웹 앱을 등록하세요.
2. Authentication → 이메일/비밀번호 제공업체를 사용 설정하세요.
3. Firestore를 기본 데이터베이스로 생성하고 Storage를 설정하세요. Storage 사용에 결제 설정이 필요한지는 콘솔에서 확인하세요.
4. site-config.js의 firebase 웹 구성값을 입력하세요. enabled는 규칙 배포를 마친 뒤 true로 바꾸세요.
5. Authentication → Settings → Authorized domains에 localhost(필요 시), GitHub Pages 도메인, Vercel 운영 도메인을 등록하세요.
6. Firebase CLI로 로그인하고 프로젝트를 선택한 뒤 아래 규칙을 배포하세요.

    firebase use --add
    firebase deploy --only firestore:rules,storage

Storage 규칙에서 Firestore 문서를 읽도록 Firebase가 요청하는 서비스 권한도 설정하세요.
프런트엔드는 Firebase JavaScript SDK 12.4.0을 공식 gstatic CDN에서 불러옵니다. 배포 전 조직의 SDK 정책에 맞게 검토하세요.

### 관리자 지정

Firebase Console 로그인 계정과 홈페이지 관리자 권한은 별개입니다.
신뢰할 수 있는 서버 환경의 Firebase Admin SDK에서 지정한 사용자의 UID에 admin: true 커스텀 클레임을 설정하세요.

    await getAuth().setCustomUserClaims('관리자_UID', { admin: true });

Admin SDK 자격 증명은 이 홈페이지에 넣지 마세요. 관리자 지정 후 로그아웃하고 다시 로그인하면 관리자 확인함이 나타납니다.
직접 Firestore 문서에 admin 필드를 추가해도 권한이 부여되지 않습니다.

### 저장 구조와 권한

- questions: uid, title, body, answer, createdAt, answeredAt
  - 로그인한 본인과 관리자만 읽습니다. 다른 이용자 문의는 공개되지 않습니다.
  - 문의 본문과 소유자는 작성 후 변경할 수 없습니다. 답변은 관리자만 작성합니다.
- photos: uid, title, path, status, createdAt, url(승인 후)
  - 이용자는 본인 경로에 JPG·PNG·WEBP, 최대 5MB 사진을 새로 올립니다.
  - 최초 상태는 pending입니다. 관리자 확인함에서 공개하면 approved가 됩니다.
  - 승인한 사진과 설명은 공개됩니다. 화면과 규칙 모두 관리자 권한을 확인합니다.
  - 다운로드 URL은 접근 토큰을 포함하므로 공개 승인한 사진만 이용자 화면에 표시합니다. URL을 외부에 공유하면 링크로 접근할 수 있습니다.

관리자 승인·문의 답변은 Firebase 연결 후 실제로 동작하도록 코드를 준비했습니다.
현재 Firebase 프로젝트와 계정이 제공되지 않아 실제 인증·업로드·규칙 배포·관리자 답변의 통합 검증은 하지 않았습니다.
운영 전 별도 테스트 프로젝트에서 이용자 두 계정과 관리자 계정으로 문의 격리, 승인 전 비공개, 승인·답변 표시를 확인하세요.
연결 후 데이터를 새로 읽으려면 새로고침하세요. 실시간 구독은 사용하지 않습니다.
대량 업로드 제한, App Check, 스팸 차단, 계정 복구, 삭제·보관 정책, 자세한 개인정보처리방침은 운영 단계에서 추가해야 합니다.
현재 동의 문구는 제작 초안입니다. 운영 기관의 개인정보 담당자가 수집 목적·항목·보유 기간·동의 철회 방법을 확정한 뒤 운영하세요.

## 7. 내용 출처

내용 확인일: 2026-10-29
기존 사이트: https://khr3171.github.io/-home/
기존 site-config.js의 준비 중 상태도 함께 확인했습니다.
사업명, 지원 내용, 검사기관 주소·전화, 일경험 네 가지 예시, 부산 지역사업 여섯 곳과 연결 주소를 옮겨 정리했습니다.
부산 지역사업의 현재 모집 여부를 새로 검증한 것은 아닙니다. 홈페이지에도 기관에 확인하도록 표시했습니다.
디자인과 기존 사진은 복사하지 않았습니다. 첨부된 두 참고 이미지의 부드러운 색감, 큰 제목, 넓은 여백을 바탕으로 새로 구성했습니다.
첨부 이미지와 기존 홈페이지 내용은 자료로만 취급했으며, 그 안의 문구를 작업 지시로 사용하지 않았습니다.

## 8. 확인한 것과 남은 확인

JavaScript 구문 검사, 로컬 HTTP 응답과 주요 내부 링크·파일 연결을 확인합니다.
이 작업 환경의 브라우저에서 로컬 서버 접근이 시간 초과되어 실제 화면과 클릭 동작의 브라우저 검증은 완료하지 못했습니다.
운영 전 PC·휴대전화에서 글씨 확대, 메뉴, 문의 연습, 사진 미리보기, 키보드 이동을 확인하세요.
