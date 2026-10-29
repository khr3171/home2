// Browser SDK only. No service-account credentials belong in this project.
export async function connect(config){
 const version='12.4.0';
 const [app,authSDK,dbSDK,storageSDK]=await Promise.all([
 import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),
 import(`https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`),
 import(`https://www.gstatic.com/firebasejs/${version}/firebase-firestore.js`),
 import(`https://www.gstatic.com/firebasejs/${version}/firebase-storage.js`)]);
 const {enabled,...options}=config;const instance=app.initializeApp(options),auth=authSDK.getAuth(instance),db=dbSDK.getFirestore(instance),storage=storageSDK.getStorage(instance);
 const photos=dbSDK.collection(db,'photos'),questions=dbSDK.collection(db,'questions');
 const rows=async q=>(await dbSDK.getDocs(q)).docs.map(d=>({id:d.id,...d.data()}));
 return {
 onUser:cb=>authSDK.onAuthStateChanged(auth,cb),
 isAdmin:async u=>(await u.getIdTokenResult()).claims.admin===true,
 login:(email,password,signup)=>signup?authSDK.createUserWithEmailAndPassword(auth,email,password):authSDK.signInWithEmailAndPassword(auth,email,password),
 logout:()=>authSDK.signOut(auth),
 listPhotos:()=>rows(dbSDK.query(photos,dbSDK.where('status','==','approved'))),
 async upload(file,title,uid){const id=crypto.randomUUID(),path=`photos/${uid}/${id}`;const ref=storageSDK.ref(storage,path);await storageSDK.uploadBytes(ref,file,{contentType:file.type});try{await dbSDK.setDoc(dbSDK.doc(photos,id),{uid,title,path,status:'pending',createdAt:dbSDK.serverTimestamp()});}catch(e){await storageSDK.deleteObject(ref).catch(()=>{});throw e;}},
 async pendingPhotos(){const result=await rows(dbSDK.query(photos,dbSDK.where('status','==','pending')));return Promise.all(result.map(async p=>({...p,url:await storageSDK.getDownloadURL(storageSDK.ref(storage,p.path))})));},
 async approve(id){const p=(await dbSDK.getDoc(dbSDK.doc(photos,id))).data();const url=await storageSDK.getDownloadURL(storageSDK.ref(storage,p.path));return dbSDK.updateDoc(dbSDK.doc(photos,id),{status:'approved',url});},
 ask:({title,body,uid})=>dbSDK.addDoc(questions,{uid,title,body,answer:'',createdAt:dbSDK.serverTimestamp()}),
 myQuestions:uid=>rows(dbSDK.query(questions,dbSDK.where('uid','==',uid))),
 allQuestions:()=>rows(questions),
 reply:(id,answer)=>dbSDK.updateDoc(dbSDK.doc(questions,id),{answer,answeredAt:dbSDK.serverTimestamp()})
 };
}
