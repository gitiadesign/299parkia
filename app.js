const stops=window.TOUR_STOPS;
const $=id=>document.getElementById(id);
const stage=$('stage'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const dossier=$('openingDossier'),dossierAdvance=$('dossierAdvance');
const dossierShadow=$('dossierShadow');
const dossierShadowPreference=matchMedia('(prefers-reduced-motion: reduce)');
function stopDossierShadow(){
  dossier.classList.remove('shadow-playing');
  dossierShadow?.pause?.();
  if(dossierShadow?.getAttribute?.('src')){
    dossierShadow.removeAttribute('src');
    dossierShadow.load?.();
  }
}
function startDossierShadow(){
  if(dossier.hidden||dossierAdvance.disabled||dossierShadowPreference.matches||!dossierShadow?.dataset.source)return;
  dossierShadow.src=dossierShadow.dataset.source;
  dossierShadow.play?.()?.then(()=>{
    if(!dossier.hidden&&!dossierAdvance.disabled&&!dossierShadowPreference.matches)dossier.classList.add('shadow-playing');
    else stopDossierShadow();
  }).catch(stopDossierShadow);
}
dossierShadowPreference.addEventListener?.('change',()=>dossierShadowPreference.matches?stopDossierShadow():startDossierShadow());
dossierShadow?.addEventListener('error',stopDossierShadow);
startDossierShadow();
const dossierApproved=new Promise(resolve=>{
  dossierAdvance.onclick=()=>{
    if(dossierAdvance.disabled)return;
    dossierAdvance.disabled=true;
    resolve();
  };
});
let dossierClosed=false;
function closeOpeningDossier(){
  stopDossierShadow();
  dossier.hidden=true;dossierClosed=true;stage.inert=false;$('tourHeader').inert=false;
}
let landingAnchor=null,opening=true,overviewRevealAt=0,step=0,busy=false,modelReady=false,navigationEpoch=0,pendingDestination=null,selectedDestination=0,notesOpen=false,sheetExpanded=false;
const sketch=new LivingSketch($('livingSketch'),{near:$('contextNear'),far:$('contextFar'),suspended:true});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,reduced?0:ms));
const route=stops.filter(stop=>!stop.isFinal);
// Keep every destination available; show only the relevant chapter or local touchpoints.
const journeyLaterNames=['Stair','Upstairs Bar','Library','Focus','Meeting','Wellbeing','Fitness','Complete Picture'];
const markers=route.map((stop,index)=>({world:stop.target,title:stop.place||stop.title,destination:index+1}));
const chapters=[{title:'Arrival',destination:1,indices:[0,1,2]},{title:'Concierge',destination:4,indices:[3,4,5,6,7]},{title:'Social Club',destination:9,indices:[8,9,10,11]},{title:'Wellbeing',destination:13,indices:[12,13]}];
const overviewAnchors=[
 {destination:1,title:'Arrival',world:[-26,5.011,60],label:[-26,12,60]},
 {destination:4,title:'Concierge',world:[-32,3.8,8],label:[-32,-6,8]},
 {destination:5,title:'Gallery',world:[-44,10.5,-39.9439],label:[-44,12.8,-39.9439]},
 {destination:7,title:'Plaza',world:[-43,6.5,-53.5],label:[-43,12,-53.5]},
 {destination:9,title:'Social Club',world:[-44,21.8,-23.9663],label:[-44,30,-23.9663]},
 {destination:13,title:'Wellbeing',world:[-44,21.8,23.9663],label:[-44,30,23.9663]},
 {destination:2,title:'Dining',world:[-44,10.5,39.9439],label:[-44,12.8,39.9439]}
];
markers.forEach(marker=>{marker.overviewWorld=overviewAnchors.find(anchor=>anchor.destination===marker.destination)?.world});
const localZones=[[0,1,2],[2,3],[4,5,6,7],[8,9],[10,11],[12,13]];
function markerIsRelevant(index){if(step===0)return overviewAnchors.some(anchor=>anchor.destination===index+1);const current=step-1;return localZones.some(zone=>zone.includes(current)&&zone.includes(index))}

// Local Gallery details use model coordinates so they stay attached during camera movement.
const galleryWorld=overviewAnchors.find(anchor=>anchor.title==='Gallery').world;
const galleryDestinations=[5,6,7,8];
const galleryDetails={5:{title:'Coffee',world:[-44.0, 7.6049, -35.67255]},6:{title:'Bar',world:[-44.0, 7.58912, -44.27383]},7:{title:'Plaza',world:[-44.0, 7.32231, -52.96124]},8:{title:'Stair',world:[-44.0, 12.45716, -42.2705]}};
for(const [destination,detail] of Object.entries(galleryDetails))markers[Number(destination)-1].world=detail.world;

sketch.markers=markers;
markers.forEach(item=>{
  const button=document.createElement('button');button.type='button';button.className='touchpoint';button.dataset.destination=item.destination;
  button.setAttribute('aria-label',`${item.destination}. ${item.title}`);button.setAttribute('aria-pressed','false');button.innerHTML='<i class="marker-face" aria-hidden="true"></i>';
  const focusedLabel=route[item.destination-1].journeyLabel||(item.destination>=9&&item.destination<=14?journeyLaterNames[item.destination-8]:null);
  if(focusedLabel){const label=document.createElement('span');label.className='approved-focus-label';label.textContent=focusedLabel;button.append(label)}
  const chapter=overviewAnchors.find(anchor=>anchor.destination===item.destination);
  if(chapter){button.style.setProperty('--ripple-order',String([1,9,5,13,2,4,7].indexOf(item.destination)));button.style.setProperty('--reveal-order',String([1,2,4,5,7,9,13].indexOf(item.destination)));button.classList.add('chapter-anchor');const label=document.createElement('span');label.className='chapter-label';label.textContent=chapter.title;button.overviewLabel=label;button.append(label)}
  if(galleryDetails[item.destination]){const label=document.createElement('span');label.className='local-label';label.textContent=galleryDetails[item.destination].title;button.append(label)}
  const activate=event=>{event?.stopPropagation();button.classList.remove('clicked');void button.offsetWidth;button.classList.add('clicked');clearTimeout(item.pulseTimer);item.pulseTimer=setTimeout(()=>button.classList.remove('clicked'),650);return go(item.destination,{manual:true})};
  // Activate on press so the opening camera cannot move the hit target before release.
  button.onpointerdown=event=>{if(event.button!==0)return;event.preventDefault();return activate(event)};
  button.onclick=event=>{if(!event?.detail)return activate(event)};$('touchpoints').append(button);
});
const galleryPrimary=document.createElement('button');
galleryPrimary.type='button';galleryPrimary.className='touchpoint gallery-primary';galleryPrimary.hidden=true;
galleryPrimary.setAttribute('aria-label','Gallery: explore coffee, bar and stair');
galleryPrimary.innerHTML='<i class="marker-face" aria-hidden="true"></i><span class="gallery-label">Gallery</span>';
galleryPrimary.onclick=()=>go(5,{manual:true});$('touchpoints').append(galleryPrimary);
const compactLayout=()=>window.innerWidth<=700||window.innerHeight<=500;
const readingPanel=event=>Boolean(event.target?.closest?.('#story'))&&((step===1||step===2)||(compactLayout()&&sheetExpanded));
function setSheet(expanded){if(!expanded&&sheetExpanded&&sceneDetailLayer.dataset.sequence==='playing')finishSceneDetails();sheetExpanded=expanded;stage.classList.toggle('sheet-expanded',expanded);$('storyToggle').setAttribute('aria-expanded',String(expanded));$('sheetToggleLabel').textContent=expanded?'Back to drawing':'View story';if(expanded&&!busy)playSceneDetails()}
$('storyToggle').onclick=()=>setSheet(!sheetExpanded);
function controls(){
  $('previous').disabled=!modelReady||busy||step===0;$('next').disabled=!modelReady||busy||opening;
  const atEnd=step>=stops.length;
  if(atEnd){$('next').setAttribute('aria-controls','finaleJourneyMenu');$('next').setAttribute('aria-expanded',String(!$('finaleJourneyMenu').hidden));}
  else{$('next').removeAttribute('aria-controls');$('next').removeAttribute('aria-expanded');}
  $('startJourney').disabled=!modelReady||busy||opening||step!==0;
  stage.classList.toggle('overview-ready',step===0&&!opening&&!busy);
  document.querySelector('header').classList.toggle('at-end',step>=stops.length);
  document.querySelector('header').classList.toggle('intro-waiting',opening);
  $('next').setAttribute('aria-label',step===0?'Begin the journey':step>=stops.length?'Open journey stops':step===stops.length-1?'See the full exterior elevation':'Next moment');
}
function markActive(destination){
  selectedDestination=destination;
  $('indexStops').querySelectorAll('button[data-destination]').forEach(button=>{if(Number(button.dataset.destination)===destination)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current')});
  document.querySelectorAll('.touchpoint').forEach((button,index)=>{const active=index+1===destination;button.setAttribute('aria-pressed',String(active));if(active)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current')});
}
// Preserve real visits, in the designed route order, until returning to the overview.
const journeyHistory=$('journeyBreadcrumb'),journeyTrail=$('journeyBreadcrumbTrail');
const journeyTrailItems=new Map();
function syncJourneyHistory(){
  journeyHistory.hidden=step===0;
  if(!step){
    for(const item of journeyTrailItems.values())item.remove();
    journeyTrailItems.clear();journeyHistory.scrollLeft=0;return;
  }
  let current=journeyTrailItems.get(step);
  if(!current){
    current=document.createElement('li');
    const separator=document.createElement('span');separator.setAttribute('aria-hidden','true');separator.textContent='›';
    const button=document.createElement('button');button.type='button';button.textContent=stops[step-1].journeyLabel||journeyLaterNames[step-8];
    const destination=step;button.onclick=()=>go(destination,{manual:true});current.append(separator,button);
    const later=[...journeyTrailItems.keys()].sort((a,b)=>a-b).find(index=>index>step);
    if(later)journeyTrail.insertBefore(current,journeyTrailItems.get(later));else journeyTrail.append(current);
    journeyTrailItems.set(step,current);
  }
  for(const [index,item] of journeyTrailItems){
    if(index===step)item.lastElementChild.setAttribute('aria-current','step');else item.lastElementChild.removeAttribute('aria-current');
  }
  const view=journeyHistory.getBoundingClientRect(),target=current.getBoundingClientRect();
  if(target.right>view.right)journeyHistory.scrollLeft+=target.right-view.right;
  else if(target.left<view.left)journeyHistory.scrollLeft-=view.left-target.left;
}
function render({keepIntroduction=false}={}){
  const stop=stops[step-1],focused=Boolean(stop)&&!stop.isFinal;
  stage.dataset.step=step;stage.dataset.chapter=stop?.chapter||'overview';stage.classList.toggle('focus',focused);stage.classList.toggle('finale',Boolean(stop?.isFinal));
  document.querySelector('header').classList.toggle('in-journey',focused);
  const breadcrumb=stop?.journeyLabel;
  syncJourneyHistory();
  if(breadcrumb)stage.dataset.approvedScene=String(step);else delete stage.dataset.approvedScene;
  $('closingElevation').setAttribute('aria-hidden',String(!stop?.isFinal));$('story').setAttribute('aria-hidden',String(!focused));$('story').inert=!focused;
  $('closingMessage').setAttribute('aria-hidden',String(!stop?.isFinal));
  showNotes(focused?stop:null);
  renderSceneDetails(focused?stop:null);
  $('introduction').hidden=Boolean(stop?.isFinal)||(step!==0&&!keepIntroduction);$('introduction').classList.toggle('intro-away',step!==0);$('introduction').setAttribute('aria-hidden',String(step!==0));document.querySelector('header').classList.toggle('at-start',step===0);
  if(stop&&!stop.isFinal){
    const title=$('storyTitle');title.textContent=stop.title;
    if(step===13&&stop.title.endsWith(' within reach.')){
      title.textContent=stop.title.slice(0,-' within reach.'.length);
      const tail=document.createElement('span');tail.className='wellbeing-title-tail';
      tail.textContent=' within reach.';title.append(tail);
    }
    const description=$('storyDescription');
    description.textContent=stop.description;
    if(stop.copyLines?.length===2){
      description.textContent=stop.copyLines[0];
      const tail=document.createElement('span');tail.className='story-rag-tail';
      tail.textContent=' '+stop.copyLines[1];description.append(tail);
    }
    $('announcement').textContent=`${step} of ${route.length}. ${stop.description}`;
  }
  else $('announcement').textContent=stop?.isFinal?'A lot goes into nothing getting in your way. Details that anticipate you. The complete exterior concept.':'299 Park Avenue. Begin the journey or choose a chapter.';
  markActive(step);
  controls();sketch.paint();
}
function closeNotes(){notesOpen=false;$('designNotes').hidden=true;$('notePins').hidden=true;$('notePins').replaceChildren();$('designNotes').replaceChildren();$('touchpointLeaders').replaceChildren()}
function showNotes(stop){
  const notes=stop?.details?.length?[]:stop?.notes||[];
  notesOpen=false;$('behindMoment').hidden=!notes.length;$('designNotes').hidden=!notes.length;
  $('designNotes').replaceChildren();$('notePins').hidden=true;$('notePins').replaceChildren();
  for(const note of notes){const label=document.createElement('li');label.className='design-note';label.textContent=note.text;$('designNotes').append(label)}
}
const sceneDetailLayer=document.createElement('figcaption');sceneDetailLayer.className='scene-details';sceneDetailLayer.hidden=true;
document.querySelector('.vignette').append(sceneDetailLayer);
let detailSequenceTimer,detailSequenceCompact;
function finishSceneDetails(){clearTimeout(detailSequenceTimer);delete sceneDetailLayer.dataset.sequence}
function playSceneDetails(){
  if(sceneDetailLayer.hidden||sceneDetailLayer.dataset.sequence!=='pending'||(compactLayout()&&!sheetExpanded))return;
  if(reduced){delete sceneDetailLayer.dataset.sequence;return}
  sceneDetailLayer.dataset.sequence='playing';
  detailSequenceCompact=compactLayout();
  // Each local clip starts with its own bubble, after the collage enters.
  for(const clip of sceneDetailLayer.querySelectorAll?.('video')||[]){
    clip.parentElement.addEventListener('animationstart',event=>{
      if(event.animationName==='journey-bubble-in'&&sceneDetailLayer.dataset.sequence==='playing'&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
        clip.play()?.catch(()=>useClipPoster(clip));
      }
    },{once:true});
  }
  for(const image of sceneDetailLayer.querySelectorAll?.('img[data-gif]')||[]){
    image.parentElement.addEventListener('animationstart',event=>{
      if(event.animationName==='journey-bubble-in'&&sceneDetailLayer.dataset.sequence==='playing'&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
        const poster=image.getAttribute('src');
        image.addEventListener('error',()=>{image.src=poster},{once:true});
        image.dataset.poster=poster;
        image.src=image.dataset.gif;
        delete image.dataset.gif;
      }
    },{once:true});
  }
  detailSequenceTimer=setTimeout(finishSceneDetails,4000);
}
window.addEventListener('resize',()=>{
  const sequence=sceneDetailLayer.dataset.sequence,compact=compactLayout();
  if((!busy&&!compact&&sequence==='pending')||(sequence==='playing'&&compact!==detailSequenceCompact))finishSceneDetails();
});

function useClipPoster(clip){
  const still=document.createElement('img');
  still.src=clip.poster;still.alt=clip.getAttribute('aria-label')||'';
  clip.replaceWith(still);
}
function stopSceneMedia(){
  for(const clip of sceneDetailLayer.querySelectorAll?.('video')||[])clip.pause();
  for(const image of sceneDetailLayer.querySelectorAll?.('img[data-poster]')||[])image.src=image.dataset.poster;
}
function renderSceneDetails(stop){
  const details=stop?.details||[];
  finishSceneDetails();
  if(details.length&&!reduced)sceneDetailLayer.dataset.sequence='pending';
  stopSceneMedia();
  sceneDetailLayer.replaceChildren();sceneDetailLayer.hidden=!details.length;
  document.querySelector('.vignette').classList.toggle('with-details',Boolean(details.length));
  for(const [index,detail] of details.entries()){
    const callout=document.createElement('div');callout.className=`scene-detail scene-detail-${detail.position} scene-detail-order-${index+1}`;
    const caption=document.createElement('span');caption.className='detail-caption';
    const label=document.createElement('span');label.className='detail-caption-text';label.textContent=detail.text;caption.append(label);
    const viewport=document.createElement('div');viewport.className='detail-crop';
    const image=document.createElement(detail.video&&!reduced?'video':'img');
    if(detail.video&&!reduced){
      image.poster=`assets/${detail.image}`;
      image.src=`assets/${detail.video}`;
      image.muted=true;image.loop=true;image.playsInline=true;image.preload='metadata';
      image.setAttribute('aria-label',detail.alt);
      // A decode error must not replace the still image with a black square.
      image.addEventListener('error',()=>useClipPoster(image),{once:true});
    }else{
      image.src=`assets/${detail.image}`;image.alt=detail.alt;image.decoding='async';
      if(detail.gif&&!reduced)image.dataset.gif=`assets/${detail.gif}`;
    }
    viewport.append(image);callout.append(viewport,caption);
    sceneDetailLayer.append(callout);
  }
}
// Decode off-screen, then swap the ready image atomically while the panel is hidden.
const imageLoads=new Map();
function prepareImage(stop){
  if(!stop||stop.isFinal)return Promise.resolve(null);
  if(!imageLoads.has(stop.image))imageLoads.set(stop.image,(async()=>{
    const image=new Image();image.id='vignette';image.alt=stop.alt;image.decoding='async';
    const loaded=new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject});
    image.src=`assets/${stop.imageFile||`${stop.image}.webp`}`;
    await loaded;if(image.decode)await image.decode();return image;
  })().catch(error=>{imageLoads.delete(stop.image);throw error}));
  return imageLoads.get(stop.image);
}
let panelAnimation=null;
async function slidePanel(enter){
  panelAnimation?.cancel();panelAnimation=null;
  const panel=$('story');
  if(reduced||!panel.animate)return;
  const offset=compactLayout()?'translateY(14px)':'translateX(-36px)',exit=compactLayout()?'translateY(14px)':'translateX(36px)';
  const animation=panel.animate(enter?
    [{opacity:0,transform:offset},{opacity:1,transform:'translateX(0)'}]:
    [{opacity:1,transform:'translateX(0)'},{opacity:0,transform:exit}],
    {duration:700,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});
  panelAnimation=animation;try{await animation.finished}catch{/* A new selection takes control. */}
}
async function go(destination,{manual=false}={}){
  destination=Math.max(0,Math.min(stops.length,destination));
  if(!modelReady||opening){if(manual)pendingDestination=destination;return}
  if((busy&&!manual)||(destination===step&&!busy))return;
  const leavingOverview=step===0&&destination>0;

  const epoch=++navigationEpoch;setFinaleMenu(false);finishSceneDetails();stopSceneMedia();closeNotes();setSheet(false);busy=true;markActive(destination);controls();stage.classList.remove('finale','finale-approach','overview-reveal');stage.classList.toggle('overview-preparing',destination===0);$('story').classList.add('changing');
  const stop=stops[destination-1];let image;
  try{[,image]=await Promise.all([slidePanel(false),prepareImage(stop),stop?.isFinal?Promise.all(['closingImage','closingColor','closingPencil'].map(id=>$(id).decode?.().catch(()=>{}))):null])}catch(error){if(epoch!==navigationEpoch)return;panelAnimation?.cancel();panelAnimation=null;busy=false;markActive(step);$('story').classList.remove('changing');$('announcement').textContent='This image could not load. Please select the stop again.';controls();return}
  if(epoch!==navigationEpoch)return;
  if(leavingOverview&&!stop?.isFinal&&!reduced&&sketch.unproject){
    const box=$('introduction').getBoundingClientRect(),x=box.left+box.width/2,y=box.top;
    const world=sketch.unproject(x,y,-120),extent=sketch.unproject(x+100,y,-120),referenceSpan=sketch.pose.span;
    landingAnchor={world,extent,referenceSpan,depth:sketch.projectForeground(world,referenceSpan)[2],x,y,opacity:1};
    stage.classList.add('spatial-title');
  }
  if(stop?.isFinal){
    landingAnchor=null;
    const intro=$('introduction');intro.hidden=true;
    intro.style.setProperty('transform','');intro.style.setProperty('opacity','');
    stage.classList.remove('spatial-title');
  }
  if(stop?.isFinal&&!reduced){
    finaleRegistration=null;
    stage.classList.add('finale-approach');
    syncFinaleHandoff(0);
  }
  sketch.setFocus(stop?.isFinal?null:stop,destination-1,{pullback:Boolean(stop?.isFinal&&!reduced)});
  if(!stop)stage.classList.remove('focus');
  await pause(stop?.isFinal?2750:stop?1500:2800);if(epoch!==navigationEpoch)return;
  if(stop?.isFinal){syncFinaleHandoff(1);stage.classList.remove('finale-approach');}
  step=destination;$('story').classList.add('entering');if(image)$('vignette').replaceWith(image);$('story').classList.remove('changing');render({keepIntroduction:leavingOverview||Boolean(landingAnchor)});
  if(destination===0){await revealOverview(epoch);if(epoch!==navigationEpoch)return}
  playSceneDetails();
  if(!stop?.isFinal)await slidePanel(true);
  if(epoch!==navigationEpoch)return;$('introduction').hidden=Boolean(stop?.isFinal)||(step!==0&&(!landingAnchor||landingAnchor.opacity<.005));$('story').classList.remove('entering');panelAnimation?.cancel();panelAnimation=null;busy=false;controls();playSceneDetails();
}
function setFinaleMenu(open,{returnFocus=false}={}){
  const menu=$('finaleJourneyMenu'),trigger=$('next');
  menu.hidden=!open;
  stage.classList.toggle('finale-menu-open',open);
  if(step>=stops.length)trigger.setAttribute('aria-expanded',String(open));
  if(open)$('finaleJourneyStops').children[0]?.lastElementChild?.focus?.();
  else if(returnFocus)trigger.focus?.();
}
const finaleNames=['Overview',...stops.map((stop,index)=>stop.journeyLabel||journeyLaterNames[index-7])];
finaleNames.forEach((name,destination)=>{
  const row=document.createElement('li'),button=document.createElement('button');
  button.type='button';button.textContent=name;
  if(destination===stops.length)button.setAttribute('aria-current','step');
  button.onclick=()=>{setFinaleMenu(false,{returnFocus:true});if(destination!==step)return go(destination,{manual:true});};
  row.append(button);$('finaleJourneyStops').append(row);
});
function next(){if(step<stops.length)return go(step+1);}
$('next').onclick=()=>step>=stops.length?setFinaleMenu($('finaleJourneyMenu').hidden):next();
document.addEventListener('click',event=>{
  if(!$('finaleJourneyMenu').hidden&&!event.target?.closest?.('#next, #finaleJourneyMenu'))setFinaleMenu(false);
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!$('finaleJourneyMenu').hidden){event.preventDefault();setFinaleMenu(false,{returnFocus:true});}
});$('previous').onclick=()=>go(step-1);
$('home').onclick=()=>{if(!modelReady||opening)return;return go(0,{manual:true})};
// Retain a programmatic start hook; the visible CTA lives in the header.
$('startJourney').onclick=()=>go(1,{manual:true});
const indexDialog=$('journeyIndex'),teamNote=$('teamNote');
$('openTeamNote').onclick=()=>{
  setFinaleMenu(false);
  if(!teamNote.open)teamNote.showModal();
};
$('closeTeamNote').onclick=()=>teamNote.close();
teamNote.addEventListener('close',()=>{if(step===stops.length)$('next').focus?.();});

$('openIndex').onclick=()=>indexDialog.showModal();$('closeIndex').onclick=()=>indexDialog.close();
indexDialog.onclick=event=>{if(event.target===indexDialog)indexDialog.close()};
for(const chapter of chapters){
  const group=document.createElement('section'),heading=document.createElement('h3');heading.textContent=chapter.title;group.append(heading);
  for(const index of chapter.indices){const button=document.createElement('button');button.textContent=route[index].place||route[index].title;button.dataset.destination=index+1;button.onclick=()=>{indexDialog.close();return go(index+1,{manual:true})};group.append(button)}
  $('indexStops').append(group);
}
const complete=document.createElement('button');complete.className='index-complete';complete.textContent='The complete picture →';complete.onclick=()=>{indexDialog.close();return go(stops.length,{manual:true})};$('indexStops').append(complete);
// A gesture advances once. Momentum updates lastAt but cannot trigger another stop.
let wheelLastAt=-Infinity,wheelSum=0,wheelDirection=0,wheelConsumed=false;
function onWheel(event){
  if(!dossierClosed||indexDialog.open||teamNote.open||!$('finaleJourneyMenu').hidden||readingPanel(event)||event.target?.closest?.('#journeyBreadcrumb'))return;
  if(event.ctrlKey||Math.abs(event.deltaX)>Math.abs(event.deltaY))return;
  event.preventDefault();const now=performance.now(),fresh=now-wheelLastAt>280;wheelLastAt=now;
  if(fresh){wheelSum=0;wheelConsumed=false;wheelDirection=0}
  if(busy||wheelConsumed||!modelReady)return;
  const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?window.innerHeight:1),direction=Math.sign(delta);
  if(!direction)return;if(direction!==wheelDirection){wheelSum=0;wheelDirection=direction}
  wheelSum+=delta;if(Math.abs(wheelSum)<58)return;
  wheelConsumed=true;wheelSum=0;go(Math.max(0,Math.min(stops.length,step+direction)));
}
window.addEventListener('wheel',onWheel,{passive:false});
let touchStart=null;
document.addEventListener('pointerdown',event=>{if(!dossierClosed||indexDialog.open||teamNote.open||!$('finaleJourneyMenu').hidden||readingPanel(event)||event.pointerType!=='touch'||event.target.closest('button, #journeyBreadcrumb'))return;touchStart={x:event.clientX,y:event.clientY}});
document.addEventListener('pointerup',event=>{
  if(!touchStart||event.pointerType!=='touch')return;const dx=touchStart.x-event.clientX,dy=touchStart.y-event.clientY;touchStart=null;
  if(!busy&&Math.abs(dy)>55&&Math.abs(dy)>Math.abs(dx)*1.25)go(step+Math.sign(dy));
});
document.addEventListener('pointercancel',()=>{touchStart=null});
// A plain click or tap in the scene is a presentation advance, not a link or drag.
const ownClick='button,a,input,textarea,select,summary,label,dialog,[contenteditable="true"],[role="button"],[role="link"],#finaleJourneyMenu,#journeyBreadcrumb';
let advancePointer=null,advanceDragged=false;
document.addEventListener('pointerdown',event=>{
  if(event.isPrimary===false||event.button!==0)return;
  advanceDragged=false;advancePointer={id:event.pointerId,x:event.clientX,y:event.clientY};
});
document.addEventListener('pointerup',event=>{
  if(advancePointer?.id!==event.pointerId||!advancePointer)return;
  advanceDragged=Math.hypot(event.clientX-advancePointer.x,event.clientY-advancePointer.y)>9;
  advancePointer=null;
});
document.addEventListener('pointercancel',()=>{advancePointer=null;advanceDragged=true});
function onPageAdvance(event){
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey
    ||advanceDragged||event.detail>1||event.target?.closest?.(ownClick)
    ||indexDialog.open||teamNote.open||!$('finaleJourneyMenu').hidden
    ||(window.getSelection?.()?.isCollapsed===false)) return;
  if(!dossierClosed){
    if(!dossierAdvance.disabled&&event.target?.closest?.('#openingDossier'))dossierAdvance.onclick();
    return;
  }
  if(modelReady&&!opening&&!busy&&step<stops.length)return next();
}
document.addEventListener('click',onPageAdvance);

document.addEventListener('keydown',event=>{
  if(!dossierClosed||indexDialog.open||teamNote.open||!$('finaleJourneyMenu').hidden||readingPanel(event)||event.target?.closest?.('#journeyBreadcrumb'))return;
  if(['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName))return;
  if(event.target.tagName==='BUTTON'&&(event.key===' '||event.key==='Enter'))return;
  if(['ArrowRight','ArrowDown','PageDown',' '].includes(event.key)){event.preventDefault();if(!event.repeat)next()}
  else if(['ArrowLeft','ArrowUp','PageUp'].includes(event.key)){event.preventDefault();if(!event.repeat)go(step-1)}
  else if(event.key==='Home'){event.preventDefault();go(0,{manual:true})}
  else if(event.key==='End'){event.preventDefault();go(stops.length,{manual:true})}
});
const markerButtons=Array.from($('touchpoints').children),leaders=$('touchpointLeaders'),overviewLines=new Map();
const galleryLine=document.createElementNS('http://www.w3.org/2000/svg','line');
function detachLine(line){if(line.parentNode===leaders)line.remove()}
function attachLine(line){if(line.parentNode!==leaders)leaders.append(line)}
let finaleRegistration=null;
const finaleEase=(a,b,t)=>{const q=Math.max(0,Math.min(1,(t-a)/(b-a)));return q*q*(3-2*q)};
function syncFinaleHandoff(progress,view){
  const p=Math.max(0,Math.min(1,progress));
  const track=finaleEase(.06,.72,p),mix=finaleEase(.62,.97,p);
  let tx=0,ty=0,sx=1,sy=1;
  if(view&&sketch.project){
    const key=view.width+'x'+view.height;
    if(finaleRegistration?.key!==key){
      const plate=$('closingElevation'),w=plate.offsetWidth,h=plate.offsetHeight;
      if(w>0&&h>0){
        // Locate the building within the contained 16:9 source, not the image box.
        const scale=Math.min(w/1664,h/936),iw=1664*scale,ih=936*scale;
        finaleRegistration={key,left:plate.offsetLeft+(w-iw)/2,top:plate.offsetTop+(h-ih)/2,iw,ih};
      }
    }
    const f=finaleRegistration;
    if(f){
      const roofL=sketch.project([-46.11,82,-49.043]),roofR=sketch.project([-46.11,82,49.043]);
      const baseL=sketch.project([-46.11,1.6,-49.043]),baseR=sketch.project([-46.11,1.6,49.043]);
      const left=(roofL[0]+baseL[0])/2,right=(roofR[0]+baseR[0])/2;
      const top=(roofL[1]+roofR[1])/2,bottom=(baseL[1]+baseR[1])/2;
      // Match left/right piers, roof and plinth in the source render.
      const toLeft=f.left+f.iw*.1925,toTop=f.top+f.ih*.0356;
      if(right-left>4&&bottom-top>4){
        const fitX=f.iw*.598/(right-left),fitY=f.ih*.867/(bottom-top);
        sx=1+(fitX-1)*track;sy=1+(fitY-1)*track;
        tx=(toLeft-fitX*left)*track;ty=(toTop-fitY*top)*track;
      }
    }
  }
  stage.style.setProperty('--finale-track',`translate3d(${tx}px,${ty}px,0) scale(${sx},${sy})`);
  stage.style.setProperty('--finale-crossfade',String(mix));
  stage.style.setProperty('--finale-live-ink',String(1-mix));
  stage.style.setProperty('--finale-mask-expand',`${p*80}%`);
}
sketch.onProject=(items,view)=>{
  if(stage.classList.contains('opening-dissolve')&&!reduced)trackOpeningElevation(view);
  if(stage.classList.contains('finale-approach'))syncFinaleHandoff(view.motionProgress??1,view);
  if(landingAnchor&&sketch.projectForeground){
    const anchor=landingAnchor,[x,y,depth]=sketch.projectForeground(anchor.world,anchor.referenceSpan),edge=sketch.projectForeground(anchor.extent,anchor.referenceSpan);
    const scale=Math.max(.6,Math.min(8,Math.hypot(edge[0]-x,edge[1]-y)/100));
    const remaining=Math.max(0,Math.min(1,(depth/anchor.depth-.18)/.67));
    anchor.opacity=remaining*remaining*(3-2*remaining);
    $('introduction').hidden=step!==0&&anchor.opacity<.005;
    $('introduction').style.setProperty('transform',`translate3d(${x-anchor.x}px,${y-anchor.y}px,0) scale(${scale})`);
    $('introduction').style.setProperty('opacity',String(anchor.opacity));
    if(step===0&&!view.focused&&view.motionProgress===1){
      landingAnchor=null;$('introduction').hidden=false;
      $('introduction').style.setProperty('transform','');$('introduction').style.setProperty('opacity','');stage.classList.remove('spatial-title');
    }
  }

  const buttons=markerButtons,compact=compactLayout();
  const galleryActive=view.focused&&galleryDestinations.includes(selectedDestination||step);
  stage.classList.toggle('gallery-detail',galleryActive);
  // Tie the handoff to camera distance so it also reverses naturally on scroll back.
  const overviewSpan=sketch.overviewPose().span;
  const detailSpan=galleryActive?sketch.viewportPose(stops[(selectedDestination||step)-1]).span:overviewSpan;
  const zoom=galleryActive?Math.max(0,Math.min(1,(overviewSpan-sketch.pose.span)/Math.max(1,overviewSpan-detailSpan))):0;
  const soften=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t)};
  const galleryOpacity=galleryActive?1-soften(zoom/.68):0;
  const detailOpacity=soften((zoom-.28)/.6);

  items.forEach((item,index)=>{
    const button=buttons[index];if(!button)return;const[x,y,z]=item.screen,limit=view.focused?(compact?(view.height<=500?view.width*.5:view.width-22):view.width*(view.width<=1100?.40:.335)):view.width-22;
    const selected=index+1===selectedDestination;
    const localDetail=galleryActive&&Boolean(galleryDetails[index+1]);
    button.style.opacity=localDetail?String(detailOpacity):'';
    button.style.pointerEvents=localDetail&&detailOpacity<.05?'none':'';
    button.inert=localDetail&&detailOpacity<.05;

    // The selected marker follows its world point across the whole viewport during
    // the camera move, even before its destination panel/zone becomes current.
    const inFrame=z>1&&x>=0&&x<=view.width&&y>=0&&y<=view.height;
    const inZone=markerIsRelevant(index)&&x>=22&&x<=limit&&y>(compact?90:125)&&y<(view.focused&&compact&&view.height>500?view.height*.70:view.height-40);
    const visible=!stops[selectedDestination-1]?.isFinal&&inFrame&&(selected||inZone);button.hidden=!visible;if(!visible)return;
    button.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`;
  });
  galleryPrimary.hidden=!galleryActive||galleryOpacity<.005;
  galleryPrimary.style.opacity=String(galleryOpacity);
  galleryPrimary.inert=galleryOpacity<.05;
  if(galleryActive&&sketch.project){
    const [x,y,z]=sketch.project(galleryWorld);
    galleryPrimary.hidden=galleryOpacity<.005||z<=1||x<0||x>view.width||y<0||y>view.height;
    galleryPrimary.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`;
    const line=galleryLine;
    for(const [key,value] of Object.entries({x1:x,x2:x,y1:y-17,y2:y-42}))line.setAttribute(key,value);
    line.style.opacity=String(galleryOpacity);
    if(!galleryPrimary.hidden)attachLine(line);else detachLine(line);
  }else detachLine(galleryLine);

  if(step===0&&!view.focused&&sketch.project){
    overviewAnchors.forEach(anchor=>{
      const button=buttons[anchor.destination-1];let line=overviewLines.get(anchor.destination);
      if(button.hidden){if(line)detachLine(line);return}
      if(!line){line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('pathLength','1');overviewLines.set(anchor.destination,line)}
      const marker=items[anchor.destination-1].screen,point=sketch.project(anchor.label),label=button.overviewLabel;
      const direction=point[1]<marker[1]?-1:1;
      const dotEdge=compact?4:5,tagHalf=compact?7:7.5,minimum=dotEdge+tagHalf+(compact?18:22);
      const distance=Math.max(minimum,Math.abs(point[1]-marker[1])+(compact?2:4)),offset=direction*distance;
      label.style.top=`${22+offset}px`;label.style.transform='translate(-50%,-50%)';
      line.setAttribute('x1',marker[0]);line.setAttribute('x2',marker[0]);
      line.setAttribute('y1',marker[1]+direction*dotEdge);
      line.setAttribute('y2',marker[1]+offset-direction*tagHalf);
      if(stage.classList.contains('overview-reveal')&&!line.classList.contains('overview-leader')){
        line.classList.add('overview-leader');line.style.setProperty('--leader-delay',`${[1,2,4,5,7,9,13].indexOf(anchor.destination)*.45+.3-(performance.now()-overviewRevealAt)/1000}s`);
      }
      if(!stage.classList.contains('overview-reveal'))line.classList.remove('overview-leader');
      attachLine(line);
    });
  }else for(const line of overviewLines.values())detachLine(line);
  if(notesOpen){
    const notes=stops[step-1]?.notes||[],pins=[...$('notePins').children];
    notes.forEach((note,index)=>{
      const pin=pins[index];if(!pin||!sketch.project)return;const[x,y,z]=sketch.project(note.world);
      const limit=compactLayout()?(view.height<=500?view.width*.5:view.width-18):view.width*(view.width<=1100?.40:.335);
      pin.hidden=z<=1||x<18||x>limit||y<90||y>(compactLayout()&&view.height>500?view.height*.70:view.height-30);
      pin.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`;
    });
  }
};
async function revealOverview(epoch=navigationEpoch){
  overviewRevealAt=performance.now();stage.classList.remove('overview-preparing');
  stage.classList.add('overview-reveal');sketch.paint();
  await pause(5400);
  if(epoch!==navigationEpoch)return;
  stage.classList.remove('overview-reveal');sketch.paint();
}
let openingRegistration=null,openingBlendTime=0;
function trackOpeningElevation(view){
  const cover=$('openingElevation');
  if(cover.hidden||!sketch.project)return;
  const key=view.width+'x'+view.height;
  if(openingRegistration?.key!==key){
    const w=cover.offsetWidth,h=cover.offsetHeight,originX=cover.offsetLeft,originY=cover.offsetTop;
    if(!w||!h)return;
    const fit=Math.min(w/2000,h/1125),iw=2000*fit,ih=1125*fit;
    // Actual pier, roof, and plinth bounds in the contained color plate.
    openingRegistration={key,originX,originY,x:originX+(w-iw)/2+.190*iw,
      y:originY+h-ih+.033*ih,w:.605*iw,h:.866*ih};
  }
  const plate=openingRegistration;
  const tl=sketch.project([-46.11,82,-49.043]),tr=sketch.project([-46.11,82,49.043]);
  const bl=sketch.project([-46.11,1.6,-49.043]),br=sketch.project([-46.11,1.6,49.043]);
  const x=(tl[0]+bl[0])/2,y=(tl[1]+tr[1])/2;
  const w=(tr[0]+br[0])/2-x,h=(bl[1]+br[1])/2-y;
  if(w<=1||h<=1)return;
  const t=finaleEase(.12,.91,openingBlendTime);
  const dest={x:plate.x+(x-plate.x)*t,y:plate.y+(y-plate.y)*t,
    w:plate.w+(w-plate.w)*t,h:plate.h+(h-plate.h)*t};
  const transform=(x,y,w,h,originX,originY)=>{
    const sx=dest.w/w,sy=dest.h/h;
    return `translate3d(${dest.x-originX-(x-originX)*sx}px,${dest.y-originY-(y-originY)*sy}px,0) scale(${sx},${sy})`;
  };
  // Both artworks share the same framing; the camera is still free to finish its move.
  stage.style.setProperty('--intro-cover-track',transform(plate.x,plate.y,plate.w,plate.h,plate.originX,plate.originY));
  stage.style.setProperty('--intro-drawing-track',transform(x,y,w,h,0,0));
}
async function playOpening(){
  await Promise.all([dossierApproved,document.fonts?.ready]);
  const cover=$('openingElevation'),coverImage=$('openingElevationImage');
  $('introTitle').textContent='Everything but the Work.';
  // The eager local cover can sharpen under the rising light without blocking the arrow.
  cover.hidden=Boolean(coverImage.complete&&!coverImage.naturalWidth);
  coverImage.addEventListener('error',()=>{cover.hidden=true},{once:true});
  stage.classList.add('dossier-daylight','elevation-present');
  dossier.classList.add('dossier-dissolving');
  dossier.setAttribute('aria-hidden','true');
  // Let the elevation lead, then bring in the title during the tail of the reveal.
  await pause(1640);
  stage.classList.add('intro-fading','elevation-veiled');
  await pause(1060);
  closeOpeningDossier();
  await pause(900);
  stage.classList.add('intro-title-ready');
  stage.classList.remove('intro-fading');

  // Advance one shared clock for the camera and artwork crossfade; the title glides in CSS.
  let settleCamera;
  const cameraSettled=new Promise(resolve=>{settleCamera=resolve});
  const melt=(start,end,time)=>{
    const t=Math.max(0,Math.min(1,(time-start)/(end-start)));
    return t*t*(3-2*t);
  };
  openingRegistration=null;openingBlendTime=0;
  stage.style.setProperty('--opening-color-presence','1');
  stage.style.setProperty('--opening-drawing-presence','0');
  sketch.onOpeningProgress=(progress,time=progress)=>{
    // A single elapsed-time envelope, not the camera's steeper easing,
    // blends both plates while preserving the original camera and title move.
    openingBlendTime=time;
    const color=1-melt(.18,.95,time);
    const drawing=melt(.025,.74,time);
    stage.style.setProperty('--opening-color-presence',String(color));
    stage.style.setProperty('--opening-drawing-presence',String(drawing));
    if(color===0)cover.hidden=true;
    if(progress>=1)settleCamera();
  };
  stage.classList.remove('intro-centered');
  stage.classList.add('intro-linked','drawing-reveal','drawing-persistent','opening-dissolve');
  sketch.suspended=false;
  sketch.restartOpening({inkDelay:420});
  sketch.resize();
  if(reduced){cover.hidden=true;stage.style.setProperty('--opening-drawing-presence','1');sketch.paint();settleCamera()}
  await pause(4500);
  // Begin the label reveal during the last part of the drawing, without waiting
  // an extra full label cycle before enabling the opening controls.
  const overviewRevealing=revealOverview();
  await Promise.race([cameraSettled,pause(1500)]);
  cover.hidden=true;
  sketch.onOpeningProgress=null;
  stage.classList.remove('elevation-present','elevation-veiled','intro-pending','intro-lifting','intro-linked','opening-dissolve');
  stage.classList.add('intro-address-ready');
  opening=false;controls();sketch.paint();
  if(document.activeElement===dossierAdvance||document.activeElement===document.body)$('startJourney').focus?.({preventScroll:true});
  void overviewRevealing;
}
sketch.ready.then(async()=>{modelReady=true;render();await playOpening();if(pendingDestination!==null){const destination=pendingDestination;pendingDestination=null;go(destination,{manual:true})}}).catch(async error=>{
  await dossierApproved;closeOpeningDossier();opening=false;$('openingElevation').hidden=true;stage.classList.remove('intro-pending','intro-centered');console.error('Sketch renderer:',error);const fallback=document.createElement('img');fallback.src='assets/elevation-approved.webp';fallback.alt='299 Park Avenue concept elevation';fallback.className='sketch-fallback';stage.prepend(fallback);modelReady=true;controls();$('announcement').textContent='The animated drawing is unavailable on this device. The story remains available.';
});
render();

// Small compositor-only offsets create depth without moving markers or redrawing ink.
const finePointer=matchMedia('(hover: hover) and (pointer: fine)');
function resetDepth(){stage.style.setProperty('--look-x','0');stage.style.setProperty('--look-y','0')}
window.addEventListener('pointermove',event=>{
  if(reduced||!finePointer.matches||event.pointerType==='touch')return;
  const x=Math.max(-1,Math.min(1,event.clientX/window.innerWidth*2-1)),y=Math.max(-1,Math.min(1,event.clientY/window.innerHeight*2-1));
  stage.style.setProperty('--look-x',String(x));stage.style.setProperty('--look-y',String(y));
},{passive:true});
document.addEventListener('pointerleave',resetDepth);
