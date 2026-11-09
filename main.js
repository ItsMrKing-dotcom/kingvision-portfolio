const state={content:null};

async function loadContent(){
  try{const response=await fetch('/content.json');if(!response.ok)throw new Error(`Content request failed: ${response.status}`);state.content=await response.json();renderArchive();}
  catch(error){console.warn('Could not load content.json',error);const media=document.getElementById('media');if(media)media.innerHTML='<p class="fine-print">Archive index is temporarily unavailable. Direct records remain in ACCESS.</p>';}
}

function renderArchive(){
  const media=document.getElementById('media');if(!media||!state.content)return;media.innerHTML='';
  state.content.media.forEach((item,index)=>{const card=document.createElement('a');card.className='archive-card';card.href=item.link;card.target='_blank';card.rel='noopener noreferrer';
    const image=document.createElement('img');image.src=item.thumbnail;image.alt='';image.loading='lazy';
    const copy=document.createElement('div');const code=document.createElement('small');code.textContent=`RECORD / ${String(index+1).padStart(3,'0')}`;
    const title=document.createElement('h2');title.textContent=item.title;const description=document.createElement('p');description.textContent=item.description;
    copy.append(code,title,description);card.append(image,copy);media.appendChild(card);});
}

function sectionFromHash(){const id=location.hash.slice(1);return ['signal','archive','access'].includes(id)?id:'signal';}
function showSection(id,{focus=false}={}){document.querySelectorAll('.panel').forEach(panel=>{panel.hidden=panel.id!==id;});document.querySelectorAll('[data-section]').forEach(link=>{if(link.dataset.section===id)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});document.title=`KingVision | ${id[0].toUpperCase()+id.slice(1)}`;if(focus){const target=document.getElementById(id);target?.setAttribute('tabindex','-1');target?.focus({preventScroll:true});target?.removeAttribute('tabindex');window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}}
function setupNavigation(){showSection(sectionFromHash());window.addEventListener('hashchange',()=>showSection(sectionFromHash(),{focus:true}));}
function setupStationId(){const dialog=document.getElementById('stationDialog');const open=document.getElementById('playStationId');const close=document.getElementById('closeStationId');const video=dialog.querySelector('video');open.addEventListener('click',()=>{dialog.showModal();video.play().catch(()=>{});});close.addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{video.pause();video.currentTime=0;});dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});video.addEventListener('ended',()=>dialog.close());}
window.addEventListener('DOMContentLoaded',()=>{loadContent();setupNavigation();setupStationId();});
