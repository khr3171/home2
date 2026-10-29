import {compressPhoto} from './photo-compression.js?v=spark-6';
const $ = s => document.querySelector(s);
const config = window.SITE_CONFIG;
const node = (tag, text, className) => { const e = document.createElement(tag); if(text !== undefined)e.textContent = text; if(className)e.className=className; return e; };
let backend = null, user = null, isAdmin = false;
let connectionState = config.firebase.enabled ? 'connecting' : 'demo';
const demo = {photos:[], questions:[]};
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),5000);}
function errorText(e){const c=e?.code||'';if(c==='upload-not-confirmed')return '사진 저장 결과를 확인하지 못했어요. 갤러리에서 목록을 다시 불러와 주세요.';if(c==='connection-timeout')return '연결이 오래 걸려요. 인터넷 연결을 확인하고 다시 연결해 주세요.';if(c.includes('unauthorized-domain'))return '현재 홈페이지 주소의 로그인 설정을 확인해야 해요. 관리자에게 알려 주세요.'; if(c.includes('invalid-credential')||c.includes('wrong-password'))return '이메일과 비밀번호를 다시 확인해 주세요.';if(c.includes('email-already-in-use'))return '이미 가입한 이메일이에요. 로그인해 주세요.';if(c.includes('network'))return '인터넷 연결을 확인하고 다시 시도해 주세요.';if(c.toLowerCase().includes('permission'))return '접근 권한이 없어요. Firebase 규칙과 관리자 설정을 확인해 주세요.';if(c.includes('operation-not-allowed'))return 'Firebase에서 익명 로그인 또는 이메일 로그인을 켜 주세요.';if(c.includes('too-many'))return '잠시 뒤에 다시 시도해 주세요.';return '처리하지 못했어요. 잠시 뒤에 다시 시도해 주세요.';}

function setConnectionState(state,error){
 connectionState=state;
 const ready=state==='ready',demoMode=state==='demo';
 const status=state==='connecting'?'저장 서버에 연결하고 있어요. 잠시 기다려 주세요.':state==='error'?'저장 서버에 연결하지 못했어요. 아직 전송되지 않았어요. '+errorText(error):demoMode?'연습 화면이에요. 실제 전송되지 않으며 새로고침하면 사라져요.':'가입 없이 작성할 수 있어요. 서버에 저장한 뒤 등록 결과를 알려드려요.';
 document.querySelectorAll('.mode-note').forEach(e=>e.textContent=status);
 $('#gallery-mode').hidden=false;$('#gallery-mode').textContent=ready?'사진은 올리면 공개돼요. 최대 100장까지 보관해요.':status;
 $('#account-status').textContent=ready?'서버에 연결했어요. 관리자 로그인 상태를 확인하고 있어요.':status;
 $('#upload-open').disabled=!ready&&!demoMode;
 $('#upload-form button[type="submit"]').disabled=!ready&&!demoMode;
 $('#question-submit').disabled=!ready&&!demoMode;
 $('#question-submit').textContent=demoMode?'연습 문의 남기기 ↗':'문의 남기기 ↗';
 $('#login-open').hidden=!ready;$('#login-open').disabled=!ready;
 $('#connection-retry').hidden=state!=='error';
}
function canSubmit(statusId){
 if(connectionState==='ready'||connectionState==='demo')return true;
 $(statusId).textContent=connectionState==='connecting'?'서버에 연결 중이에요. 연결이 끝나면 다시 눌러 주세요.':'서버 연결을 확인해 주세요. 작성 내용은 전송되지 않았어요.';
 return false;
}
async function withConnectionTimeout(task){
 let timer;
 try{return await Promise.race([task,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(new Error('connection timeout'),{code:'connection-timeout'})),20000);})]);}
 finally{clearTimeout(timer);}
}
$('#connection-retry').onclick=()=>window.location.reload();
function open(id){$(id).showModal();}
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
$('#menu').onclick=()=>{const active=$('#navigation').classList.toggle('open');$('#menu').setAttribute('aria-expanded',active);$('#menu').textContent=active?'메뉴 닫기':'메뉴 열기';};
$('#navigation').querySelectorAll('a').forEach(a=>a.onclick=()=>{$('#navigation').classList.remove('open');$('#menu').setAttribute('aria-expanded','false');$('#menu').textContent='메뉴 열기';});
try{if(localStorage.getItem('large-text')==='true')document.body.classList.add('large');}catch{}
$('#font').setAttribute('aria-pressed',document.body.classList.contains('large'));
$('#font').onclick=()=>{const large=document.body.classList.toggle('large');$('#font').setAttribute('aria-pressed',large);try{localStorage.setItem('large-text',large);}catch{}};
const facts=[['eligibility','누가 신청하나요?'],['fees','비용이 드나요?'],['period','언제 신청하나요?'],['documents','무엇을 준비하나요?'],['location','어디에서 참여하나요?'],['response','신청 뒤에는 어떻게 되나요?']];
config.programs.forEach((p,i)=>{const card=node('article',undefined,'program');card.id=p.id;const top=node('div',undefined,'program-top');top.append(node('span',i?'▤':'✳','program-icon '+(i?'lavender':'peach')),node('span',p.status==='open'&&/^https:\/\//.test(p.url)?'모집 중':p.status==='closed'?'모집 마감':'모집 준비 중','pill'));card.append(top,node('p',p.intro,'eyebrow'),node('h3',p.title),node('p',p.description));const ul=node('ul');p.benefits.forEach(t=>ul.append(node('li',t)));card.append(ul);const dl=node('dl');facts.forEach(([k,label])=>dl.append(node('dt',label),node('dd',p[k])));card.append(dl);if(p.status==='open'&&/^https:\/\//.test(p.url)){const a=node('a','신청 페이지로 가기 ↗ (새 창)','button primary');a.href=p.url;a.target='_blank';a.rel='noopener';card.append(a);}else{const b=node('button',p.status==='closed'?'모집이 마감되었어요':'신청 준비 안내 보기 ↗','button');b.onclick=()=>{if(p.status==='closed'){toast('현재 모집이 마감되었어요. 다음 소식을 기다려 주세요.');}else open('#info-dialog');};card.append(b);}$('#programs').append(card);});
const locals=[
['수영구 · 일 준비','차차스테이션','경계선지능 청년이 직무교육과 사회생활에 필요한 것을 단계별로 배워요.','https://www.mois.go.kr/frt/bbs/type002/commonSelectBoardArticle.do?bbsId=BBSMSTR_000000000205&nttId=114051'],
['금정구 · 함께 배우기','느린학습자 평생교육','성인 느린학습자를 위한 교육과 학습모임 소식을 확인해요.','https://www.geumjeong.go.kr/board/view.geumj?boardId=BBS_0000223&dataSid=977932&menuCd=DOM_000000805001000000'],
['금정구 · 문화와 예술','PNU 미리내대학','성인 느린학습자가 문화·예술 활동으로 일상과 관계를 배워요. 대학 학위 과정은 아니에요.','https://sce.pusan.ac.kr/page?menuCD=000000000000561&mode=DETAIL&seq=2567&typeSeqNo=1'],
['연제구 등 · 농장과 먹거리','매일매일즐거워','채소 기르기와 샐러드 만들기 등을 바탕으로 배움과 일할 기회를 만들어요.','https://bsec.or.kr/board/view/board_book?idx=5754'],
['남구 · 아이와 가족','남구장애인복지관','느린학습 아동의 사회성 활동과 부모 교육을 운영한 곳이에요. 현재 운영은 확인이 필요해요.','https://www.namgurc.or.kr/about/sub3.php'],
['남구 · 상담과 배움','남구 평생교육·상담 지원','경계선지능인과 가족을 위한 검사·상담, 일상에 필요한 배움 소식을 알아봐요.','https://lll.busan.go.kr/lll/index.do?bbsAttrbCode=BBSA03&bbsId=BBS_00029&bbsTyCode=BBST03&menu_id=00003220&menu_link=%2Ficms%2Fbbs%2FselectBoardArticle.do&nttId=5951']];
locals.forEach(([region,title,desc,url])=>{const c=node('article',undefined,'local-card');const a=node('a','안내 보기 ↗ (새 창)');a.href=url;a.target='_blank';a.rel='noopener';c.append(node('span',region,'region'),node('h3',title),node('p',desc),node('small','현재 모집 여부는 기관에 확인해 주세요.'),a);$('#local-list').append(c);});
function photoCard(p){const b=node('button',undefined,'photo-card');const img=node('img');img.src=p.url;img.alt=p.title;img.loading='lazy';b.append(img,node('span',p.title));b.onclick=()=>{$('#large-photo').src=p.url;$('#large-photo').alt=p.title;$('#large-caption').textContent=p.title;open('#image-dialog');};return b;}
function questionCard(q){const c=node('article',undefined,'question');c.append(node('h4',q.title),node('p',q.body),node('span',q.answer?'답변이 왔어요':'답변 기다리는 중','pill'));c.append(node('span',q.visibility==='public'?'공개':'비공개','pill'));if(q.answer)c.append(node('p','관리자 답변: '+q.answer,'answer'));return c;}
function renderQuestions(qs){$('#question-list').replaceChildren();if(!qs.length)$('#question-list').append(node('p','아직 남긴 문의가 없어요.'));qs.forEach(q=>$('#question-list').append(questionCard(q)));}
function renderPublicQuestions(qs){$('#public-question-list').replaceChildren(...(qs.length?qs.map(questionCard):[node('p','아직 공개된 질문이 없어요.')]));}
function renderPhotos(photos){$('#gallery-list').replaceChildren(...(photos.length?photos.map(photoCard):[node('div','첫 번째 추억을 기다려요. 사진을 올리면 이곳에서 볼 수 있어요.','gallery-empty')]));}
let refreshVersion=0, galleryVersion=0, galleryCursor=null, galleryPhotos=[], galleryBusy=false;
function busyGallery(busy){galleryBusy=busy;$('#gallery-more').disabled=busy;}
async function loadGallery(reset=false,expectedPhoto=null){
 if(!backend)return false;if(galleryBusy&&!reset)return false;
 const version=++galleryVersion;busyGallery(true);$('#gallery-status').textContent='사진을 불러오고 있어요.';
 if(reset){galleryCursor=null;galleryPhotos=[];$('#gallery-more').hidden=true;}
 try{const page=await backend.photoPage(galleryCursor);if(version!==galleryVersion)return;
 galleryPhotos=reset?page.photos:[...galleryPhotos,...page.photos.filter(p=>!galleryPhotos.some(old=>old.uploadId===p.uploadId))];galleryCursor=page.cursor;renderPhotos(galleryPhotos);$('#gallery-more').hidden=!page.hasMore;$('#gallery-status').textContent=galleryPhotos.length+'장의 사진을 보고 있어요.';$('#gallery-retry').hidden=true;if(expectedPhoto&&!galleryPhotos.some(p=>p.uploadId===expectedPhoto.uploadId)){$('#gallery-status').textContent='저장한 사진을 목록에서 확인하지 못했어요. 다시 불러오기를 눌러 주세요.';$('#gallery-retry').hidden=false;return false;}return true;
 }catch(e){if(version===galleryVersion){$('#gallery-status').textContent='사진 목록을 불러오지 못했어요. '+errorText(e);$('#gallery-retry').hidden=false;}return false;}finally{if(version===galleryVersion)busyGallery(false);}
}
$('#gallery-retry').onclick=()=>loadGallery(true);
let demoVisible=12;
$('#gallery-more').onclick=()=>{if(backend)return loadGallery(false);demoVisible+=12;renderPhotos(demo.photos.slice(0,demoVisible));$('#gallery-more').hidden=demo.photos.length<=demoVisible;};
async function refresh(){if(!backend)return;const version=++refreshVersion,activeUser=user;try{const [publicQs,myQs]=await Promise.all([backend.publicQuestions(),activeUser?backend.myQuestions(activeUser.uid):Promise.resolve([])]);if(version!==refreshVersion)return;renderPublicQuestions(publicQs);if(activeUser)renderQuestions(myQs);else $('#question-list').replaceChildren(node('p','이 브라우저에서 남긴 문의가 여기에 보여요.'));if(isAdmin)await renderAdmin(version);}catch(e){if(version===refreshVersion){$('#question-list').replaceChildren(node('p','문의 목록을 불러오지 못했어요. '+errorText(e)));if(isAdmin)$('#admin-questions').replaceChildren(node('p','관리자 목록을 불러오지 못했어요. '+errorText(e)));toast(errorText(e));}}}
$('#upload-open').onclick=()=>{if(canSubmit('#upload-status'))open('#upload-dialog');};
$('#upload-form').onsubmit=async e=>{
 e.preventDefault();if(!canSubmit('#upload-status'))return;const file=$('#photo').files[0],title=$('#photo-title').value.trim();if(!title)return;
 const button=e.submitter;button.disabled=true;
 try{if(!file)throw new Error('사진을 골라 주세요.');$('#upload-status').textContent='사진 용량을 줄이고 있어요.';const compressed=await compressPhoto(file);
 if(backend){await backend.ensureUser();$('#upload-status').textContent='압축한 사진을 올리고 있어요.';const saved=await backend.upload(compressed,title);const displayed=await loadGallery(true,saved);await refresh();toast(displayed?'사진을 서버에 저장했어요. 갤러리에서 확인해 주세요.':'사진은 서버에 저장했지만 목록을 불러오지 못했어요. 갤러리의 다시 불러오기를 눌러 주세요.');}
 else{if(demo.photos.length>=100)throw new Error('연습 사진 100장이 찼어요. 새로고침하면 비워져요.');demo.photos.unshift({id:crypto.randomUUID(),title:title+' · 연습 사진',url:URL.createObjectURL(compressed)});demoVisible=12;renderPhotos(demo.photos.slice(0,demoVisible));$('#gallery-more').hidden=demo.photos.length<=demoVisible;toast('100KB 미만으로 압축했어요. 연습 사진은 실제 전송되지 않아요.');}
 $('#upload-form').reset();$('#upload-dialog').close();$('#upload-status').textContent='';
 }catch(err){$('#upload-status').textContent=err.code?errorText(err):(err.message||'사진을 처리하지 못했어요.');}finally{button.disabled=false;}
};
$('#question-form').onsubmit=async e=>{
 e.preventDefault();if(!canSubmit('#question-status'))return;const title=$('#question-title').value.trim(),body=$('#question-body').value.trim(),visibility=$('#question-form').elements.visibility.value||'public';if(!title||!body){$('#question-status').textContent='제목과 내용을 모두 적어 주세요.';return;}const button=e.submitter;button.disabled=true;
 try{if(backend){const visitor=await backend.ensureUser();await backend.ask({title,body,uid:visitor.uid,visibility});$('#question-status').textContent='문의가 등록되었어요. 이 브라우저의 내 문의에서 답변을 확인해 주세요.';await refresh();}
 else{demo.questions.unshift({title,body,answer:'',visibility});renderQuestions(demo.questions);renderPublicQuestions(demo.questions.filter(q=>q.visibility==='public'));$('#question-status').textContent='연습 문의예요. 실제 전달되지 않으며 새로고침하면 사라져요.';}$('#question-form').reset();
 }catch(err){$('#question-status').textContent=errorText(err);}finally{button.disabled=false;}
};
$('#login-open').onclick=()=>{if(canSubmit('#login-status'))open('#login-dialog');};
$('#logout').onclick=async()=>{try{await backend.logout();}catch(e){toast(errorText(e));}};
$('#login-form').onsubmit=async e=>{e.preventDefault();if(!canSubmit('#login-status'))return;const button=e.submitter;button.disabled=true;try{await backend.login($('#email').value,$('#password').value);$('#login-form').reset();$('#login-dialog').close();}catch(err){$('#login-status').textContent=errorText(err);}finally{button.disabled=false;}};
let selectedPhoto=null;
$('#delete-photo-confirm').onclick=async()=>{if(!selectedPhoto||!isAdmin)return;const button=$('#delete-photo-confirm');button.disabled=true;$('#delete-photo-status').textContent='사진을 삭제하고 있어요.';try{await backend.deletePhoto(selectedPhoto);selectedPhoto=null;$('#delete-photo-dialog').close();if($('#image-dialog').open)$('#image-dialog').close();$('#large-photo').removeAttribute('src');await loadGallery(true);await refresh();toast('사진을 삭제했어요.');}catch(e){$('#delete-photo-status').textContent=e.code?errorText(e):e.message;}finally{button.disabled=false;}};
async function renderAdmin(version){const [photos,qs]=await Promise.all([backend.photoMetadata(),backend.allQuestions()]);if(!isAdmin||version!==refreshVersion)return;$('#admin-gallery').replaceChildren(node('h4','공개 사진 관리 ('+photos.length+'/100장)'));for(const p of photos){const c=node('article',undefined,'admin-item');const b=node('button','사진 삭제','button');b.onclick=()=>{selectedPhoto=p;$('#delete-photo-caption').textContent=p.title;$('#delete-photo-status').textContent='';open('#delete-photo-dialog');};const view=node('button','사진 확인','button');view.onclick=async()=>{view.disabled=true;try{const image=await backend.photoImage(p);if(!image){toast('이미 삭제되었거나 바뀐 사진이에요.');return;}$('#large-photo').src=image;$('#large-photo').alt=p.title;$('#large-caption').textContent=p.title;open('#image-dialog');}catch(e){toast(errorText(e));}finally{view.disabled=false;}};c.append(node('p',p.title),view,b);$('#admin-gallery').append(c);}$('#admin-questions').replaceChildren(node('h4','문의 답변'));for(const q of qs){const c=questionCard(q),f=node('form'),label=node('label','답변 내용'),input=node('textarea');input.required=true;input.maxLength=2000;input.value=q.answer||'';label.append(input);const b=node('button','답변 저장','button');f.append(label,b);f.onsubmit=async e=>{e.preventDefault();if(!input.value.trim())return;b.disabled=true;try{await backend.reply(q.id,input.value.trim());await refresh();}catch(e){toast(errorText(e));b.disabled=false;}};c.append(f);$('#admin-questions').append(c);}}
setConnectionState(connectionState);
if(config.firebase.enabled){
 try{backend=await withConnectionTimeout((async()=>{const {connect}=await import('./firebase-service.js?v=spark-9');return connect(config.firebase);})());
 setConnectionState('ready');
 let authVersion=0;
 backend.onUser(async u=>{const version=++authVersion;user=u;isAdmin=false;refreshVersion++;$('#question-list').replaceChildren();$('#admin-gallery').replaceChildren();$('#admin-questions').replaceChildren();$('#admin').hidden=true;selectedPhoto=null;if($('#delete-photo-dialog').open)$('#delete-photo-dialog').close();let role=false;try{role=u?await backend.isAdmin(u):false;}catch(e){toast(errorText(e));}if(version!==authVersion)return;isAdmin=role;
 $('#account-status').textContent=isAdmin?'관리자로 로그인했어요. 사진 관리와 문의 답변을 할 수 있어요.':u&&!u.isAnonymous?'이 계정에 관리자 권한이 없어요. Firebase 관리자 권한 설정을 확인해 주세요.':'가입 없이 이용할 수 있어요. 비공개 문의는 작성한 브라우저에서 다시 확인해 주세요.';
 $('#login-open').hidden=!!u&&!u.isAnonymous;$('#logout').hidden=!u||u.isAnonymous;$('#admin').hidden=!isAdmin;await refresh();});
 await loadGallery(true);
 }catch(e){backend=null;setConnectionState('error',e);toast('연결하지 못했어요. 작성 내용은 전송되지 않았어요.');}
}

