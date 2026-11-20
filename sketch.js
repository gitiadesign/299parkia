/* Model-space sketching with software depth masking, shared by drawing and touchpoints. */
class LivingSketch {
  constructor(canvas,contextLayers={}){
    this.contextLayers=contextLayers;this.suspended=Boolean(contextLayers.suspended);this.lastPaint=-Infinity;this.canvas=canvas;this.ctx=canvas.getContext('2d');this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.pose={z:0,y:20,span:209,lift:2,turn:0,cx:.5,cy:.595};this.focus=null;this.context=true;this.markers=[];
    this.surface=document.createElement('canvas');this.surfaceCtx=this.surface.getContext('2d');
    this.resize=()=>{
      const r=canvas.getBoundingClientRect();if(r.width<=0||r.height<=0)return;
      const d=Math.min(devicePixelRatio||1,2),width=Math.round(r.width*d),height=Math.round(r.height*d);
      const changed=this.w!==r.width||this.h!==r.height||canvas.width!==width||canvas.height!==height;
      this.w=r.width;this.h=r.height;
      if(changed){
        this.geometryCache=null;
        if(this.currentStop){this.motion=null;this.pose=this.viewportPose(this.currentStop)}else if(this.mesh&&!this.motion){this.pose={...this.pose,...this.overviewPose()}}
        canvas.width=width;canvas.height=height;
      }
      this.paint();
    };
    this.requestResize=()=>{if(this.resizeFrame)return;this.resizeFrame=requestAnimationFrame(()=>{this.resizeFrame=0;this.resize()})};
    // Embedded browsers can change the canvas box without firing window.resize.
    if(typeof ResizeObserver!=='undefined'){this.sizeObserver=new ResizeObserver(this.requestResize);this.sizeObserver.observe(canvas)}
    window.addEventListener('resize',this.requestResize);window.addEventListener('orientationchange',this.requestResize);window.visualViewport?.addEventListener('resize',this.requestResize);
    this.ready=this.load();
  }
  overviewPose(){return{z:0,y:20,span:this.w<=700?140:190,lift:2,turn:0,cx:.5,cy:.595}}
  viewportPose(stop){
    const portrait=this.w<=700&&this.h>500,landscape=this.h<=500,tablet=!portrait&&!landscape&&this.w<=1100;
    const next={...stop.pose,cx:portrait?.5:landscape?.25:tablet?.20:.155,cy:portrait?.37:landscape?.48:.54};
    if(portrait)next.span=Math.max(42,next.span*.42);else if(landscape)next.span*=.70;else if(tablet)next.span*=.85;
    next.z+=(stop.target[2]-stop.pose.z)*.24;next.y+=(stop.target[1]-stop.pose.y)*.12;
    // Align the first two focal targets with the shared story column.
    // Aim at its marker so the drawing and dot share that area's center.
    if(['subway','restaurant'].includes(stop.image)&&!portrait&&!landscape){
      const depthOffset=(stop.target[0]+26)/190;
      next.z=stop.target[2]+next.turn*depthOffset;next.y=stop.target[1]+next.lift*depthOffset;
      next.cx=(this.w<=1100?.46:.40)/2;next.cy=.5;
    }
    return next;
  }
  async load(){const embedded=document.getElementById('localSketchModel');if(!embedded)throw Error('Model could not load');this.prepare(JSON.parse(embedded.textContent));this.started=performance.now();this.revealStarted=this.started;this.resize();const landing=this.overviewPose();this.pose={...landing,span:landing.span*(this.reduced?1:1.1)};this.motion=this.reduced?null:{from:{...this.pose},to:landing,start:this.started,duration:5800,opening:true};this.loop();return this}

  prepare(mesh){
    this.mesh=mesh;const seenEdges=new Set();
    mesh.forEach((f,index)=>{
      f.mid=f.p[0].map((_,k)=>f.p.reduce((sum,p)=>sum+p[k],0)/f.p.length);
      const a=f.p[0],b=f.p[1],c=f.p[2],bx=b[0]-a[0],by=b[1]-a[1],bz=b[2]-a[2],cx=c[0]-a[0],cy=c[1]-a[1],cz=c[2]-a[2];
      const nx=by*cz-bz*cy,ny=bz*cx-bx*cz,nz=bx*cy-by*cx,norm=Math.hypot(nx,ny,nz)||1;
      f.shade=Math.round((2+(1-Math.abs(nx/norm))*8+Math.abs(ny/norm)*5)*(f.mid[1]>26?.13:1));
      // Pigment is attached to architectural faces, not to the page or artwork.
      const t=f.t,side=1-Math.abs(nx/norm);
      f.ink=t.upperPier?[101+9*side,.92]:t.upperMullion?[108+13*side,.89]:
        t.upperSpandrel?[135+12*side,.82]:t.facade?[169+18*side,.83]:
        t.entryFrame||t.cladding||t.louver?[108+15*side,.84]:
        t.ceiling?[138+15*side,.71]:t.floorSlab&&f.mid[1]>5?[165+15*side,.71]:
        t.receptionFacet?[187+17*side,.62]:null;
      // Outline the shell and primary structure; leave infill and furnishings soft.
      f.shell=Boolean(t.facade||t.upperPier||t.cladding||t.secondPerimeter||
        (t.floorSlab&&Math.max(...f.p.map(p=>Math.abs(p[2])))>44));
      f.gridInk=Boolean(t.upperMullion||t.upperSpandrel);
      f.clear=f.o<.9||f.t.storefront||f.t.entryGlass||f.t.transitGlass||f.t.treeCanopy;
      f.kind=f.t.upperMullion||f.t.facade||f.clear?0:1;
      f.delay=Math.min(.78,(f.kind===0?.30:0)+Math.abs(f.mid[2])*.002+Math.max(0,f.mid[1])*.003+(index%17)*.004);
      f.edges=f.p.map((p,i)=>[p,f.p[(i+1)%f.p.length]]);
      if(f.t.storefront&&f.p.length===4){const [a,b,c,d]=f.p,m=f.t.lobbyGlazing?0:(f.t.mullions||4),lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);for(let i=1;i<m;i++){const inset=f.t.jointInset||0,t=inset+(1-2*inset)*i/m;f.edges.push([lerp(a,b,t),lerp(d,c,t)])}if(f.t.transom)f.edges.push([lerp(a,d,f.t.transom),lerp(b,c,f.t.transom)])}
      f.edges=f.edges.filter(([a,b])=>{if(Math.hypot(...a.map((v,k)=>v-b[k]))<=.32)return false;const key=[a.map(v=>v.toFixed(2)).join(','),b.map(v=>v.toFixed(2)).join(',')].sort().join('|');if(seenEdges.has(key))return false;seenEdges.add(key);return true});
    });
  }
  setFocus(stop,index,{pullback=false}={}){
    this.pullbackInk=pullback&&this.focused?{focus:this.focus,region:this.region}:null;
    this.storyIndex=stop?index:null;this.focusStarted=performance.now();
    this.currentStop=stop||null;const next=stop?this.viewportPose(stop):this.overviewPose();
    const now=performance.now(),same=Boolean(stop&&this.region&&JSON.stringify(this.region)===JSON.stringify(stop.region));
    this.preserveInk=same||pullback;
    this.motion={from:{...this.pose},to:next,start:now,duration:this.reduced?0:same?1400:stop?2500:2700};this.region=stop?stop.region:null;this.focus=stop?[-32,next.y,next.z]:null;this.focused=stop?1:0;if(!same)this.revealStarted=now+400;this.loop();
  }
  restartOpening({leadIn=0,inkDelay=0}={}){
    this.storyIndex=null;
    this.pullbackInk=null;
    this.focus=null;this.region=null;this.focused=0;this.preserveInk=false;
    this.currentStop=null;const landing=this.overviewPose();this.pose={...landing,span:landing.span*(this.reduced?1:1.1)};
    const openingStart=performance.now();this.started=openingStart+inkDelay;this.revealStarted=this.started;this.lastPaint=-Infinity;
    this.motion=this.reduced?null:{from:{...this.pose},to:landing,start:openingStart+leadIn,duration:5800,opening:true};this.loop();
  }

  loop(){
    if(this.frame||this.suspended)return;
    const tick=now=>{
      this.frame=0;
      if(this.suspended)return;
      if(this.motion){
        const t=this.motion.duration?Math.max(0,Math.min(1,(now-this.motion.start)/this.motion.duration)):1,e=t*t*t*(t*(t*6-15)+10);
        for(const k of Object.keys(this.pose))this.pose[k]=this.motion.from[k]+(this.motion.to[k]-this.motion.from[k])*e;
        this.motion.progress=e;
        if(this.motion.opening)this.onOpeningProgress?.(e,t);
        if(t>=1)this.motion=null;
      }
      // Preserve 60 Hz timing for CSS camera-linked transitions, but cap the
      // expensive 1,702-face render near 30 Hz. A final frame always settles.
      const active=this.motion||(!this.reduced&&(now-this.started<5500||now-this.revealStarted<4350));
      if(!active||now-this.lastPaint>=31){this.paint(now);this.lastPaint=now}
      if(active)this.frame=requestAnimationFrame(tick);
    };
    this.frame=requestAnimationFrame(tick);
  }
  depthSurface(faces){
    const sw=Math.min(this.motion?190:340,Math.round(this.w*.34)),sh=Math.round(this.h*sw/this.w),scale=sw/this.w;
    if(!this.depth||this.surface.width!==sw||this.surface.height!==sh){this.surface.width=sw;this.surface.height=sh;this.depth=new Float32Array(sw*sh);this.ids=new Int32Array(sw*sh);this.pixels=this.surfaceCtx.createImageData(sw,sh)}
    this.depth.fill(0);this.ids.fill(-1);const depth=this.depth,ids=this.ids;
    for(let fi=0;fi<faces.length;fi++){
      const {f,points}=faces[fi];if(f.clear)continue;
      for(let ti=1;ti<points.length-1;ti++){
        const a=points[0],b=points[ti],c=points[ti+1],ax=a[0]*scale,ay=a[1]*scale,bx=b[0]*scale,by=b[1]*scale,cx=c[0]*scale,cy=c[1]*scale,den=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);if(Math.abs(den)<.01)continue;
        const x0=Math.max(0,Math.floor(Math.min(ax,bx,cx))),x1=Math.min(sw-1,Math.ceil(Math.max(ax,bx,cx))),y0=Math.max(0,Math.floor(Math.min(ay,by,cy))),y1=Math.min(sh-1,Math.ceil(Math.max(ay,by,cy))),ia=1/a[2],ib=1/b[2],ic=1/c[2];
        for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
          const u=((by-cy)*(x+.5-cx)+(cx-bx)*(y+.5-cy))/den,v=((cy-ay)*(x+.5-cx)+(ax-cx)*(y+.5-cy))/den,w=1-u-v;if(u<-.001||v<-.001||w<-.001)continue;
          const z=u*ia+v*ib+w*ic,index=y*sw+x;if(z>depth[index]){depth[index]=z;ids[index]=fi}
        }
      }
    }
    const data=this.pixels.data;data.fill(0);
    for(let i=0;i<ids.length;i++){if(ids[i]<0)continue;const face=faces[ids[i]],shade=face.shade,j=i*4,ink=face.f.ink;data[j]=data[j+1]=data[j+2]=ink?Math.round(ink[0]):247-Math.round(shade*.78);data[j+3]=ink?Math.round(255*ink[1]):219}
    this.surfaceCtx.putImageData(this.pixels,0,0);this.ctx.drawImage(this.surface,0,0,this.w,this.h);this.depthScale=scale;
  }
  paint(now=performance.now()){
    if(this.suspended||!this.mesh||!this.w)return;
    // ResizeObserver and viewport events drive dimensions; do not force layout per frame.
    const ctx=this.ctx,p=this.pose,dpr=this.canvas.width/this.w,dprY=this.canvas.height/this.h;ctx.setTransform(dpr,0,0,dprY,0,0);ctx.clearRect(0,0,this.w,this.h);
    const normalize=a=>{const n=Math.hypot(...a)||1;return a.map(v=>v/n)},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),clamp=n=>Math.max(0,Math.min(1,n));
    const target=[-26,p.y,p.z],eye=[target[0]-190,p.y+p.lift,p.z+p.turn],forward=normalize(target.map((v,i)=>v-eye[i])),right=normalize(cross(forward,[0,1,0])),up=cross(right,forward),focal=190*this.w/p.span;
    const offsetX=this.w*p.cx,offsetY=this.h*p.cy;
    const project=world=>{
      const x=world[0]-eye[0],y=world[1]-eye[1],z=world[2]-eye[2],d=x*forward[0]+y*forward[1]+z*forward[2];
      return[offsetX+(x*right[0]+y*right[1]+z*right[2])*focal/d,offsetY-(x*up[0]+y*up[1]+z*up[2])*focal/d,d];
    };
    this.project=project;
    this.unproject=(x,y,planeX=-44)=>{
      const ray=forward.map((value,i)=>value+right[i]*(x-this.w*p.cx)/focal+up[i]*(this.h*p.cy-y)/focal);
      const length=(planeX-eye[0])/ray[0];return eye.map((value,i)=>value+ray[i]*length);
    };
    // Equivalent perspective dolly for the foreground copy, using the model's
    // zoom span as forward travel so the camera can pass through its plane.
    this.projectForeground=(world,referenceSpan)=>{
      const v=world.map((value,i)=>value-eye[i]),depth=dot(v,forward);
      const remaining=depth-190*(1-p.span/referenceSpan),frontFocal=190*this.w/referenceSpan;
      return[this.w*p.cx+dot(v,right)*frontFocal/Math.max(2,remaining),this.h*p.cy-dot(v,up)*frontFocal/Math.max(2,remaining),remaining];
    };
    const intro=this.reduced?2:Math.max(0,(now-this.started)/5100),reveal=this.reduced?2:Math.max(0,(now-this.revealStarted)/4200);
    ctx.lineJoin='round';ctx.lineCap='round';
    const segment=(a,b)=>{const u=project(a),v=project(b);ctx.beginPath();ctx.moveTo(u[0],u[1]);ctx.lineTo(v[0],v[1]);ctx.stroke()};
    // Minimal adjacent masses, street edges, sidewalks, and Park Avenue median.
    ctx.strokeStyle='rgba(124,124,124,.065)';ctx.lineWidth=.65;
    const contextCanvas=key=>{
      const canvas=this.contextLayers[key];if(!canvas)return ctx;
      if(canvas.width!==this.canvas.width||canvas.height!==this.canvas.height){canvas.width=this.canvas.width;canvas.height=this.canvas.height}
      const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dprY,0,0);c.clearRect(0,0,this.w,this.h);return c;
    };
    const far=contextCanvas('far'),near=contextCanvas('near');
    const ghost=(c,poly,strength)=>{
      const q=poly.map(project),ys=q.map(p=>p[1]),top=Math.min(...ys),bottom=Math.max(...ys);if(bottom-top<1)return;
      const wash=c.createLinearGradient(0,top,0,bottom);wash.addColorStop(0,`rgba(153,153,153,${strength*.18})`);wash.addColorStop(.65,`rgba(138,138,138,${strength*.8})`);wash.addColorStop(1,`rgba(131,131,131,${strength})`);
      c.beginPath();q.forEach((v,i)=>i?c.lineTo(v[0],v[1]):c.moveTo(v[0],v[1]));c.closePath();c.fillStyle=wash;c.fill();
    };
    for(const [z0,z1,x0,x1,height,c,strength]of [[-165,-95,55,125,190,far,.035],[97,170,65,145,210,far,.032],[-160,-87,-5,115,175,near,.085],[88,160,-25,125,185,near,.08]]){
      const end=z0<0?z1:z0;
      ghost(c,[[x1,0,z0],[x1,0,z1],[x1,height,z1],[x1,height,z0]],strength*.4);
      ghost(c,[[x0,height,z0],[x1,height,z0],[x1,height,z1],[x0,height,z1]],strength*.22);
      ghost(c,[[x0,0,z0],[x0,0,z1],[x0,height,z1],[x0,height,z0]],strength);
      ghost(c,[[x0,0,end],[x1,0,end],[x1,height,end],[x0,height,end]],strength*.65);
    }
    for(const x of [-54,-62,-80,-86,-94,-100])segment([x,0,-170],[x,0,170]);
    for(const z of [-66,-70,66,70])segment([-100,0,z],[80,0,z]);
    ctx.fillStyle='rgba(148,148,148,.027)';const median=[[-94,.05,-150],[-86,.05,-150],[-86,.05,150],[-94,.05,150]].map(project);ctx.beginPath();median.forEach((v,i)=>i?ctx.lineTo(v[0],v[1]):ctx.moveTo(v[0],v[1]));ctx.closePath();ctx.fill();
    const cacheKey=JSON.stringify([p,this.w,this.h,!!this.motion]);
    let faces;
    if(this.geometryCache?.key===cacheKey){faces=this.geometryCache.faces;ctx.drawImage(this.surface,0,0,this.w,this.h)}else{
    faces=this.mesh.map(f=>({f,points:f.p.map(project),shade:f.shade}));this.depthSurface(faces);this.geometryCache={key:cacheKey,faces};}
    const sw=this.surface.width,sh=this.surface.height;
    const visible=(x,y,z)=>{const sx=Math.round(x*this.depthScale),sy=Math.round(y*this.depthScale);if(sx<0||sy<0||sx>=sw||sy>=sh)return false;const d=Math.min(this.depth[sy*sw+sx],this.depth[sy*sw+Math.min(sw-1,sx+1)],this.depth[Math.min(sh-1,sy+1)*sw+sx]);return 1/z>=d-.000025};
    this.isVisible=visible;
    // A translucent neutral brush on the visible podium panes leaves their
    // interior linework intact and does not participate in depth occlusion.
    for(const {f,points} of faces){
      if(!f.clear||!(f.t.storefront||f.t.entryGlass))continue;
      const [cx,cy,cz]=project(f.mid);if(!visible(cx,cy,cz))continue;
      const ys=points.map(point=>point[1]),top=Math.min(...ys),bottom=Math.max(...ys);
      if(bottom-top<1)continue;
      const glass=ctx.createLinearGradient(0,top,0,bottom);
      glass.addColorStop(0,'rgba(123,123,123,.26)');glass.addColorStop(.58,'rgba(145,145,145,.15)');glass.addColorStop(1,'rgba(169,169,169,.05)');
      ctx.fillStyle=glass;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();
    }
    const focusWeight=this.pullbackInk?1-(this.motion?.progress??1):(this.focused?1:0);
    let edgeId=0;
    for(const entry of faces){const {f,points}=entry;
      const xs=points.map(v=>v[0]),ys=points.map(v=>v[1]);if(Math.max(...xs)<0||Math.min(...xs)>this.w||Math.max(...ys)<0||Math.min(...ys)>this.h)continue;
      const focus=this.focus||this.pullbackInk?.focus||[0,0,0],distance=Math.hypot((f.mid[0]-focus[0])*.5,(f.mid[1]-focus[1])*1.4,f.mid[2]-focus[2]),near=1-clamp((distance-14)/26),topFade=1-clamp((f.mid[1]-35)/28),developing=this.focused&&near>.25;
      const interiorDepth=f.mid[1]<26?clamp((f.mid[0]+39.63)/60):0;
      const depthInk=1-interiorDepth*.32;
      const shellFade=.58+.42*topFade;
      const alpha=f.shell?(.84+.16*shellFade)*(1-focusWeight*.09*(1-near)):
        f.gridInk?(.54+.18*topFade)*(1-focusWeight*.22*(1-near)):
        depthInk*(f.kind===0?.32:.60)*topFade*(1-focusWeight*.83*(1-near))*(f.t.treeCanopy?.48:1);
      if(alpha<.008)continue;
      const graphite=f.shell?10:f.gridInk?33:f.ink?76:96;
      ctx.strokeStyle=`rgba(${graphite},${graphite},${graphite},${alpha})`;
      ctx.lineWidth=f.shell?1.75+focusWeight*near*.15:f.gridInk?1.04:(f.kind===0?.58:.85)+focusWeight*near*.12;
      if(this.motion&&!this.preserveInk&&this.focused&&f.kind===0&&!f.shell&&!f.gridInk&&!f.t.treeCanopy)continue;
      entry.ink??=[];
      ctx.beginPath();
      for(let i=0;i<f.edges.length;i++){
        const progress=developing?clamp((reveal-f.delay*.55-(i%5)*.045)*2.6):clamp((intro-f.delay-(i%4)*.025)*5);if(!progress)continue;
        let ink=entry.ink[i];
        if(!ink){
          const [a,b]=f.edges[i],u=project(a),v=project(b),length=Math.hypot(v[0]-u[0],v[1]-u[1]);
          if(length<.8){entry.ink[i]={runs:[]};continue}
          const samples=Math.min(380,Math.max(2,Math.ceil(length/(this.motion?8:3)))),runs=[];let run=null;
          for(let k=0;k<=samples;k++){
            const t=k/samples,x=u[0]+(v[0]-u[0])*t,y=u[1]+(v[1]-u[1])*t,depth=1/((1-t)/u[2]+t/v[2]),show=visible(x,y,depth);
            if(show&&run===null)run=t;
            if(run!==null&&(!show||k===samples)){runs.push([run,show?t:(k-1)/samples]);run=null}
          }
          ink=entry.ink[i]={u,v,length,runs,over:.45+((edgeId++*7)%11)*.065};
        }
        if(!ink.u)continue;const{u,v,length,runs,over}=ink,dx=(v[0]-u[0])/length,dy=(v[1]-u[1])/length;
        for(const [start,finish]of runs){if(start>=progress)continue;const end=Math.min(finish,progress),sx=u[0]+(v[0]-u[0])*start,sy=u[1]+(v[1]-u[1])*start,ex=u[0]+(v[0]-u[0])*end,ey=u[1]+(v[1]-u[1])*end;ctx.moveTo(sx-(start===0?dx*over:0),sy-(start===0?dy*over:0));ctx.lineTo(ex+(end===1?dx*over:0),ey+(end===1?dy*over:0))}
      }
      ctx.stroke();
    }
    const paintRegion=this.region||(focusWeight>0&&this.pullbackInk?.region);
    if(paintRegion){
      const r=paintRegion,amount=this.pullbackInk?focusWeight:this.reduced?1:clamp((now-this.revealStarted-300)/1800),z0=r.z-r.w/2,z1=r.z+r.w/2,front=[[r.x,r.y,z0],[r.x,r.y,z1],[r.x,r.y+r.h,z1],[r.x,r.y+r.h,z0]],floor=[[r.x,r.y,z0],[r.x+r.d,r.y,z0],[r.x+r.d,r.y,z1],[r.x,r.y,z1]],back=front.map(p=>[p[0]+r.d,p[1],p[2]]);
      const softSite=this.storyIndex===0||this.storyIndex===6; // Arrival and Plaza have no enclosed room edge.
      const wash=(poly,strength,accent)=>{
        const q=poly.map(project),xs=q.map(p=>p[0]),ys=q.map(p=>p[1]);
        const left=Math.min(...xs),top=Math.min(...ys),w=Math.max(...xs)-left,h=Math.max(...ys)-top;
        if(w<1||h<1)return;
        ctx.save();
        if(!accent||!softSite){ctx.beginPath();q.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.clip()}
        if(accent&&softSite){
          // Draw an ellipse in normalized coordinates; its feather reaches zero before the room boundary.
          ctx.translate(left+w*.50,top+h*.53);
          ctx.scale(w*.47,h*.45);
          const glow=ctx.createRadialGradient(0,0,0,0,0,1),a=strength*amount;
          glow.addColorStop(0,`rgba(57,98,255,${a})`);
          glow.addColorStop(.28,`rgba(53,94,250,${a*.76})`);
          glow.addColorStop(.66,`rgba(42,79,233,${a*.26})`);
          glow.addColorStop(.88,`rgba(38,73,216,${a*.045})`);
          glow.addColorStop(1,'rgba(38,73,216,0)');
          ctx.fillStyle=glow;ctx.fillRect(-1,-1,2,2);
        }else if(accent){
          const radius=Math.max(16,Math.hypot(w,h)*.60);
          const glow=ctx.createRadialGradient(left+w*.49,top+h*.56,0,left+w*.49,top+h*.56,radius);
          glow.addColorStop(0,`rgba(68,106,255,${strength*amount})`);
          glow.addColorStop(.53,`rgba(45,82,231,${strength*.68*amount})`);
          glow.addColorStop(1,'rgba(38,73,216,0)');
          ctx.fillStyle=glow;ctx.fillRect(left-1,top-1,w+2,h+2);
        }else{
          const gray=ctx.createLinearGradient(0,top,0,top+h);
          gray.addColorStop(0,`rgba(133,133,133,${strength*.25*amount})`);
          gray.addColorStop(1,`rgba(133,133,133,${strength*amount})`);
          ctx.fillStyle=gray;ctx.fillRect(left-1,top-1,w+2,h+2);
        }
        ctx.restore();
      };
      ctx.save();ctx.globalCompositeOperation='multiply';wash(back,.08,false);wash([front[0],back[0],back[3],front[3]],.06,false);wash(floor,.075,false);if(this.region){
        let glowFront=front,glowFloor=floor;
        if(this.storyIndex>=8&&this.storyIndex<=13&&this.currentStop?.target){
          // Paired rooms share a camera zone; their light never spills into the other room.
          const firstHalf=this.currentStop.target[2]<r.z;
          const a=firstHalf?z0:r.z+.2,b=firstHalf?r.z-.2:z1;
          glowFront=[[r.x,r.y,a],[r.x,r.y,b],[r.x,r.y+r.h,b],[r.x,r.y+r.h,a]];
          glowFloor=[[r.x,r.y,a],[r.x+r.d,r.y,a],[r.x+r.d,r.y,b],[r.x,r.y,b]];
        }
        ctx.globalCompositeOperation='source-over';wash(glowFront,softSite?.44:.34,true);wash(glowFloor,.085,true);
      };ctx.restore();
    }
    this.onProject?.(this.markers.map(m=>({...m,screen:project(!this.focused&&m.overviewWorld?m.overviewWorld:m.world)})),{width:this.w,height:this.h,focused:!!this.focused,motionProgress:this.motion?(this.motion.progress??0):1});
  }
}
window.LivingSketch=LivingSketch;
