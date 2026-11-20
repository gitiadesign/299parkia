/* Lightweight, model-anchored inhabitants. Animation never redraws the building. */
class SketchActivity {
  constructor(sketch,canvas){
    this.sketch=sketch;this.canvas=canvas;this.ctx=canvas.getContext('2d');this.reduced=matchMedia('(prefers-reduced-motion: reduce)');this.lastFrame=-Infinity;this.running=false;this.massings=new SketchMassings(sketch);
    this.tick=now=>{this.frame=0;if(document.hidden||sketch.suspended||document.getElementById('stage').classList.contains('finale'))return;if(now-this.lastFrame>=1000/24){this.draw(now);this.lastFrame=now}if(!this.reduced.matches)this.frame=requestAnimationFrame(this.tick)};
    this.start=()=>{if(!this.frame&&!document.hidden&&!sketch.suspended&&!document.getElementById('stage').classList.contains('finale'))this.frame=requestAnimationFrame(this.tick)};
    document.addEventListener('visibilitychange',this.start);this.reduced.addEventListener('change',()=>{if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;this.start()});
    // Projected camera state changes even when reduced motion is enabled.
    const project=sketch.onProject;sketch.onProject=(...args)=>{project?.(...args);if(this.reduced.matches)this.draw(performance.now());else this.start()};this.start();
  }
  groundHeight(x,z,upper=false){
    // Use actual slab/plaza tops, so figures share the architecture's levels.
    const limit=upper?19:3;let height=0;
    for(const face of this.sketch.mesh||[]){
      if(!(face.t.floorSlab||face.t.exteriorFloor||face.t.plaza))continue;
      const y=face.p[0][1];if(y<height||y>limit||face.p.some(p=>Math.abs(p[1]-y)>.001))continue;
      let inside=false;
      for(let i=0,j=face.p.length-1;i<face.p.length;j=i++){
        const a=face.p[i],b=face.p[j];
        if((a[2]>z)!==(b[2]>z)&&x<(b[0]-a[0])*(z-a[2])/(b[2]-a[2])+a[0])inside=!inside;
      }
      if(inside)height=y;
    }
    return height+.015;
  }
  inhabitants(){
    const r=this.sketch.region;
    if(!r)return [
      {x:-56.5,y:.08,z:-60,range:12,phase:0,walk:true},
      {x:-60,y:.08,z:-68,range:10,phase:2.2,walk:true},
      {x:-57.5,y:.08,z:58,range:11,phase:1.2,walk:true},
      {x:-60.5,y:.08,z:69,range:10,phase:3.4,walk:true}
    ];
    // Keep the Grand Central platform clear; activity stays on the sidewalk.
    if(r.z>50)return[{x:-57,y:0,z:r.z,range:6,phase:0,walk:true}];
    const outside=r.z>50||r.z<-50||r.x<-50,upper=r.y>=18;
    if(outside)return [
      {x:-57,y:0,z:r.z,range:6,phase:0,walk:true},
      {x:r.z>50?-44:-48,y:1.6,z:r.z-1.2,phase:1.7},
      {x:r.z>50?-40.5:-43.5,y:1.6,z:r.z+1.2,phase:3.8}
    ];
    const y=upper?18.15:outside?(r.z<-50?1.8:.1):1.8,x=outside?(r.z>50?-30:-48):-40.8,z=r.z;
    const span=Math.min(8,r.w*.25);
    return [{x,y,z:z-span*.45,range:span,phase:0,walk:true},{x:x+4.2,y,z:z+span*.45,phase:1.7,seated:upper&&Math.abs(z)<17},{x:x+7.4,y,z:z+span*.45+2.3,phase:3.8,seated:upper&&z<0}];
  }
  draw(now){
    const s=this.sketch,c=this.ctx;if(!s.project||!s.isVisible||!s.w)return;
    const dpr=Math.min(devicePixelRatio||1,2),w=Math.round(s.w*dpr),h=Math.round(s.h*dpr);if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h}c.setTransform(this.canvas.width/s.w,0,0,this.canvas.height/s.h,0,0);c.clearRect(0,0,s.w,s.h);
    if(document.getElementById('stage').classList.contains('finale'))return;
    const age=this.reduced.matches?1:Math.max(0,Math.min(1,(now-s.revealStarted-1100)/1000));if(!age)return;
    const t=this.reduced.matches?0:now/1000;
    this.massings.draw(c,now,this.reduced.matches);
    c.lineCap='round';c.lineJoin='round';c.lineWidth=.85;
    for(const person of this.inhabitants()){
      const phase=t*.13+person.phase,z=person.z+(person.walk?Math.sin(phase)*person.range/2:0),direction=Math.cos(phase)>=0?1:-1;
      const speed=person.walk&&!this.reduced.matches?Math.abs(Math.cos(phase)):0,stride=Math.sin(t*2.7+person.phase)*.45*speed;
      const base=[person.x,this.groundHeight(person.x,z,person.y>=18),z],at=(side,height,depth=0)=>[base[0]+depth,base[1]+height,base[2]+side];
      const alpha=age*(s.focused?.43:.25);
      const stroke=points=>{c.strokeStyle=`rgba(91,91,91,${alpha})`;c.beginPath();let pen=false;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];for(let k=0;k<=8;k++){const q=s.project(a.map((v,j)=>v+(b[j]-v)*k/8));if(q[2]>1&&s.isVisible(...q)){if(pen)c.lineTo(q[0],q[1]);else c.moveTo(q[0],q[1]);pen=true}else pen=false}}c.stroke()};
      // Contoured heads, clothing, hands and trouser legs give each figure volume.
      // All outline samples still pass through the model's depth test.
      const seated=person.seated,hip=seated?1.15:1.78,shoulder=hip+1.12,dir=person.walk?direction:Math.sin(person.phase)>0?1:-1;
      const point=(u,v)=>at(u*dir,v),line=points=>stroke(points.map(([u,v])=>point(u,v)));
      const curve=points=>{
        const out=[];
        for(let i=0;i<points.length-1;i++){
          const a=points[Math.max(0,i-1)],b=points[i],d=points[i+1],e=points[Math.min(points.length-1,i+2)];
          for(let j=0;j<5;j++){const t=j/5,t2=t*t,t3=t2*t;out.push(b.map((v,k)=>.5*((2*v)+(-a[k]+d[k])*t+(2*a[k]-5*v+4*d[k]-e[k])*t2+(-a[k]+3*v-3*d[k]+e[k])*t3)))}
        }
        out.push(points.at(-1));line(out);
      };
      // Hairline, forehead, nose, chin and neck in a quiet profile.
      curve([[-.11,shoulder+.02],[-.14,shoulder+.22],[-.25,shoulder+.43],[-.24,shoulder+.65],[-.11,shoulder+.78],[.1,shoulder+.77],[.22,shoulder+.65],[.22,shoulder+.52],[.31,shoulder+.43],[.23,shoulder+.39],[.22,shoulder+.23],[.09,shoulder+.19],[.09,shoulder+.04]]);
      curve([[-.13,shoulder+.04],[-.35,shoulder-.06],[-.38,shoulder-.4],[-.29,hip+.12],[-.31,hip-.02],[.28,hip-.02],[.23,hip+.31],[.29,shoulder-.21],[.1,shoulder+.04]]);
      // Small collar and jacket seam retain the pen-study character.
      line([[-.12,shoulder+.04],[.02,shoulder-.16],[.1,shoulder+.04]]);
      const limb=(a,b,d,width)=>{
        const side=(u,v,w)=>{const len=Math.hypot(v[0]-u[0],v[1]-u[1])||1;return[-(v[1]-u[1])/len*w,(v[0]-u[0])/len*w]};
        const n=side(a,b,width),m=side(b,d,width*.72);
        curve([[a[0]+n[0],a[1]+n[1]],[b[0]+n[0],b[1]+n[1]],[d[0]+m[0],d[1]+m[1]],[d[0]-m[0],d[1]-m[1]],[b[0]-n[0],b[1]-n[1]],[a[0]-n[0],a[1]-n[1]]]);
      };
      const step=person.walk?stride:0;
      const feet=seated?[[.65,.08],[1,.08]]:[[step+.08,.07],[-step-.16,.07]];
      for(let leg=0;leg<2;leg++){
        const foot=feet[leg],knee=seated?[foot[0]-.05,.92]:[foot[0]*.45+(leg?.07:-.07),.87];
        limb([leg?.12:-.12,hip],knee,foot,.12);
        curve([[foot[0]-.1,.12],[foot[0]+.1,.12],[foot[0]+.29,.05],[foot[0]+.28,0],[foot[0]-.12,0],[foot[0]-.1,.12]]);
      }
      const gesture=person.walk?step:Math.sin(t*.6+person.phase)*.06;
      limb([-.24,shoulder-.1],[-.35-gesture,hip+.65],[-.23-gesture,hip+.22],.085);
      const hand=seated?[.78,hip+.25]:person.walk?[.24+gesture,hip+.17]:[.7,hip+.85];
      limb([.22,shoulder-.13],[.37+gesture,hip+.63],hand,.085);
      curve([[hand[0]-.07,hand[1]],[hand[0]-.06,hand[1]-.14],[hand[0]+.05,hand[1]-.17],[hand[0]+.09,hand[1]-.04]]);
    }
  }
}
window.SketchActivity=SketchActivity;
