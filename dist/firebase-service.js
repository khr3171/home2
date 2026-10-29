// Firebase Spark only: Authentication + Realtime Database. No Storage SDK.
const MAX_BYTES = 102399; // Safely below 100 KiB, including base64 padding constraints.
export function createRepository(sdk, database, currentUser) {
  const ref = path => sdk.ref(database(), path);
  const rows = snapshot => { const list=[];snapshot.forEach(s=>list.push({...s.val(),id:s.key}));return list.sort((a,b)=>(b.createdAt-a.createdAt)||b.id.localeCompare(a.id)); };
  const read = async q => rows(await sdk.get(q));
  return {
    async photoPage(cursor=null) {
      const constraints=[sdk.orderByChild('createdAt'),sdk.limitToLast(12)];
      if(cursor)constraints.push(sdk.endBefore(cursor.createdAt,cursor.id));
      const list=await read(sdk.query(ref('galleryMeta'),...constraints));
      const photos=await Promise.all(list.map(async p=>{
        const image=(await sdk.get(ref(`galleryImages/${p.id}`))).val();
        if(!image || image.uploadId!==p.uploadId)return null;
        return {...p,url:`data:${image.mime};base64,${image.base64}`};
      }));
      return {photos:photos.filter(Boolean),cursor:list.at(-1)||null,hasMore:list.length===12};
    },
    async photoImage(photo){const image=(await sdk.get(ref(`galleryImages/${photo.id}`))).val();return image&&image.uploadId===photo.uploadId?`data:${image.mime};base64,${image.base64}`:null;},
    photoMetadata:()=>read(ref('galleryMeta')),
    publicQuestions:()=>read(sdk.query(ref('questions'),sdk.orderByChild('visibility'),sdk.equalTo('public'))),
    myQuestions:uid=>read(sdk.query(ref('questions'),sdk.orderByChild('uid'),sdk.equalTo(uid))),
    allQuestions:()=>read(ref('questions')),
    async upload(file,title) {
      const user=currentUser();if(!user)throw new Error('익명 연결을 다시 시도해 주세요.');
      if(!['image/webp','image/jpeg'].includes(file.type)||file.size>MAX_BYTES)throw new Error('압축된 사진은 100KB 미만이어야 해요.');
      const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(const b of bytes)binary+=String.fromCharCode(b);
      const base64=btoa(binary),uploadId=crypto.randomUUID();
      // Metadata is small. Never download existing image data to count photos.
      let occupied=(await sdk.get(ref('galleryMeta'))).val()||{};
      for(let attempt=0;attempt<100;attempt++) {
        const slot=Array.from({length:100},(_,i)=>`p${String(i).padStart(2,'0')}`).find(id=>!occupied[id]);
        if(!slot)throw new Error('사진 100장이 모두 찼어요. 관리자에게 오래된 사진 삭제를 요청해 주세요.');
        const payload={};
        payload[`galleryMeta/${slot}`]={uid:user.uid,title,createdAt:sdk.serverTimestamp(),uploadId};
        payload[`galleryImages/${slot}`]={uid:user.uid,uploadId,mime:file.type,base64};
        try {await sdk.update(ref(''),payload);return;}
        catch(error) {
          if(!String(error.code).toLowerCase().includes('permission'))throw error;
          // Another writer may have won the same slot. Never overwrite that photo.
          const winner=(await sdk.get(ref(`galleryMeta/${slot}`))).val();
          if(!winner)throw error;
          occupied[slot]=winner;
        }
      }
      throw new Error('사진 등록이 몰리고 있어요. 잠시 후 다시 시도해 주세요.');
    },
    async deletePhoto(photo) {
      // Atomic deletion; a reused slot must not delete a different photo.
      const latest=(await sdk.get(ref(`galleryMeta/${photo.id}`))).val();
      if(!latest)return;
      if(latest.uploadId!==photo.uploadId)throw new Error('사진이 바뀌었어요. 목록을 새로고침해 주세요.');
      await sdk.update(ref(''),{[`galleryMeta/${photo.id}`]:null,[`galleryImages/${photo.id}`]:null,[`galleryDeleteTokens/${photo.id}`]:photo.uploadId});
    },
    ask:({title,body,uid,visibility='public'})=>sdk.set(sdk.push(ref('questions')),{uid,title,body,visibility,createdAt:sdk.serverTimestamp()}),
    reply:(id,answer)=>sdk.update(ref(`questions/${id}`),{answer,answeredAt:sdk.serverTimestamp()})
  };
}
export async function connect(config) {
  if(!config.databaseURL||!config.apiKey||!config.projectId)throw new Error('Firebase 웹 앱 구성값을 확인해 주세요.');
  const version='12.4.0';
  const [app,a,d]=await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${version}/firebase-database.js`)
  ]);
  const {enabled,...options}=config;
  const visitorApp=app.initializeApp(options),adminApp=app.initializeApp(options,'admin-session');
  const visitor=a.getAuth(visitorApp),admin=a.getAuth(adminApp);
  // Separate admin session preserves the visitor's anonymous identity and private questions.
  await a.setPersistence(visitor,a.browserLocalPersistence);
  await a.setPersistence(admin,a.inMemoryPersistence);
  await Promise.all([visitor.authStateReady(),admin.authStateReady()]);
  const currentUser=()=>admin.currentUser||visitor.currentUser;
  let connecting=null;
  const ensureUser=async()=>{
    if(currentUser())return currentUser();
    if(!connecting)connecting=a.signInAnonymously(visitor).then(result=>result.user).finally(()=>connecting=null);
    return connecting;
  };
  const repository=createRepository(d,()=>d.getDatabase(admin.currentUser?adminApp:visitorApp),currentUser);
  return {...repository,ensureUser,
    onUser:cb=>{const notify=()=>cb(currentUser());const off1=a.onAuthStateChanged(visitor,notify),off2=a.onAuthStateChanged(admin,notify);return()=>{off1();off2();};},
    isAdmin:async u=>(await u.getIdTokenResult()).claims.admin===true,
    login:(email,password)=>a.signInWithEmailAndPassword(admin,email,password),
    logout:()=>a.signOut(admin)
  };
}
