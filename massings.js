/* Temporary spatial ideas, intentionally expressed as unfilled pen outlines. */
class SketchMassings {
  constructor(sketch){this.sketch=sketch;this.key=null;this.lines=[]}
  build(index){
    const lines=[],line=(...p)=>lines.push(p),ring=(x,y,z,rx,rz)=>line(...Array.from({length:33},(_,i)=>{const a=i*Math.PI/16;return[x+Math.cos(a)*rx,y,z+Math.sin(a)*rz]}));
    const rect=(x,y,z,dx,dz)=>line([x,y,z],[x+dx,y,z],[x+dx,y,z+dz],[x,y,z+dz],[x,y,z]);
    const box=(x,y,z,dx,h,dz)=>{rect(x,y,z,dx,dz);rect(x,y+h,z,dx,dz);for(const a of [0,dx])for(const b of [0,dz])line([x+a,y,z+b],[x+a,y+h,z+b])};
    const chair=(x,y,z,dir=1)=>{rect(x-.4,y+.9,z-.4,.8,.8);for(const a of [-.32,.32])for(const b of [-.32,.32])line([x+a,y+.9,z+b],[x+a,y,z+b]);line([x-.4,y+.9,z+dir*.4],[x-.4,y+1.8,z+dir*.4],[x+.4,y+1.8,z+dir*.4],[x+.4,y+.9,z+dir*.4])};
    const table=(x,y,z,rx=.9,rz=.9)=>{ring(x,y+1.65,z,rx,rz);line([x,y+1.65,z],[x,y+.05,z]);ring(x,y+.05,z,.32,.32)};
    const floor=1.615,upper=18.015;
    if(index===7){
      // Half-height landing at the back of the bay, rather than an implausible
      // single flight stretching to the full second-floor elevation at y=18.
      const x0=-35.5,x1=-21.5,y0=floor,y1=8.8,z0=-45.5,z1=-42.1,skew=0,n=14;
      for(let i=0;i<n;i++){
        const x=x0+(x1-x0)*i/n,next=x0+(x1-x0)*(i+1)/n,y=y0+(y1-y0)*i/n,top=y0+(y1-y0)*(i+1)/n;
        const a=skew*i/n,b=skew*(i+1)/n;line([x,y,z0+a],[x,top,z0+a],[next,top,z0+b]);line([x,y,z1+a],[x,top,z1+a],[next,top,z1+b]);line([x,top,z0+a],[x,top,z1+a]);
      }
      for(const z of [z0,z1]){line([x0,y0+2,z],[x1,y1+2,z+skew]);for(const t of [0,.33,.66,1])line([x0+(x1-x0)*t,y0+(y1-y0)*t,z+skew*t],[x0+(x1-x0)*t,y0+(y1-y0)*t+2,z+skew*t])}
      box(x1,y1-.23,-46.3,6,.23,13.1);
      line([x1,y1+2,-46.3],[x1,y1+2,z0+skew]);line([x1,y1+2,z1+skew],[x1,y1+2,-33.2]);
      for(const z of [-46.3,-44.8,-36,-33.2])line([x1,y1,z],[x1,y1+2,z]);
      for(const z of [-45.5,-34])line([x1+4,y1-.23,z],[x1+4,floor,z]);
    }
    if(index===6){for(const [x,z]of [[-42.5,-55.5],[-34.5,-52.8]]){table(x,floor,z);chair(x,floor,z-1.5,-1);chair(x,floor,z+1.5,1)}}
    if(index===4){
      // Turn the cart into the bay and keep its footprint right of the doorway.
      box(-35.5,floor+.3,-36.5,4.5,1.5,2.2);
      for(const x of [-35,-31.5])for(const z of [-36.5,-34.3])line(...Array.from({length:25},(_,i)=>{const a=i*Math.PI/12;return[x+Math.cos(a)*.2,floor+.2+Math.sin(a)*.2,z]}));
    }
    if(index===5){
      // A bar running into the room, parallel to the left exterior wall.
      box(-36.5,floor,-45.8,8.5,1.9,1.5);box(-36.7,floor+1.9,-46,8.9,.12,1.9);
      for(const x of [-35,-32,-29]){ring(x,floor+1.25,-42.9,.4,.4);line([x,floor,-42.9],[x,floor+1.25,-42.9]);ring(x,floor+.08,-42.9,.28,.28)}
    }
    if(index===8){box(-38,upper,-44,2.3,2,9);for(const z of [-42,-39,-36]){ring(-40,upper+1.25,z,.42,.42);line([-40,upper,z],[-40,upper+1.25,z])}}
    if(index===9){box(-30,upper,-29,1,3.6,8);for(const y of [upper+1.2,upper+2.4])line([-30,y,-29],[-30,y,-21]);box(-39,upper,-28,2.1,1.1,5);box(-37.3,upper+1.1,-28,.4,1,5);table(-41,upper,-25.5,.8,1.1)}
    if(index===10){table(-38,upper,-8,.8,1.15);chair(-38,upper,-9.8,-1);box(-30,upper,-12,.3,4,6)}
    if(index===11){table(-37.5,upper,6,1.8,3);for(const z of [3.8,6,8.2]){chair(-40,upper,z,1);chair(-35,upper,z,-1)}}
    if(index===12){box(-39,upper,21,2,1.8,5);box(-32,upper,20,.2,4.5,8)}
    if(index===13){for(const [x,z]of [[-40,37],[-34.5,40],[-39,43]])rect(x,upper+.025,z,3.3,1.3)}
    return lines;
  }
  draw(ctx,now,reduced){
    const s=this.sketch,key=s.region?s.storyIndex:null;
    if(key!==this.key){this.key=key;this.lines=this.build(key)}
    if(key==null||!this.lines.length)return;
    const progress=reduced?1:Math.max(0,Math.min(1,(now-s.focusStarted-600)/1500));
    ctx.save();ctx.strokeStyle='rgba(91,91,91,.38)';ctx.lineWidth=.75;ctx.lineCap='round';ctx.lineJoin='round';
    this.lines.forEach((points,index)=>{
      const ink=Math.max(0,Math.min(1,(progress-index/this.lines.length*.55)/.45));if(!ink)return;
      ctx.beginPath();let down=false;
      const total=(points.length-1)*ink;
      for(let i=0;i<Math.ceil(total);i++){
        const a=points[i],b=points[i+1],end=Math.min(1,total-i);
        for(let j=0;j<=8;j++){
          const t=j/8*end,q=s.project(a.map((v,k)=>v+(b[k]-v)*t));
          if(q[2]>1&&s.isVisible(...q)){if(down)ctx.lineTo(q[0],q[1]);else ctx.moveTo(q[0],q[1]);down=true}else down=false;
        }
      }
      ctx.stroke();
    });ctx.restore();
  }
}
window.SketchMassings=SketchMassings;
