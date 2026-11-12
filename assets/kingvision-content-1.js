const state={content:null};

async function loadContent(){
  try{const response=await fetch('/content.json');if(!response.ok)throw new Error(`Content request failed: ${response.status}`);state.content=await response.json();renderArchive();}
  catch(error){console.warn('Could not load content.json',error);for(const id of ['media','terminalLinks']){const element=document.getElementById(id);if(element)element.innerHTML='<p class="fine-print">Archive index is temporarily unavailable. Direct records remain in <a href="#access">ACCESS</a>.</p>';}}
}

function renderArchive(){
  const media=document.getElementById('media');if(!media||!state.content)return;
  const published=state.content.media.filter(item=>item.publicationStatus==='public');
  for(const [containerId,cardClass] of [['media','archive-card'],['signalMedia','transmission-card']]){
    const container=document.getElementById(containerId);container.replaceChildren();
    published.forEach((item,index)=>{
      const card=document.createElement('a');card.className=cardClass;card.href=item.link;card.target='_blank';card.rel='noopener noreferrer';
      const image=document.createElement('img');image.src=item.thumbnail;image.alt='';image.loading='lazy';image.width=1280;image.height=720;
      const copy=document.createElement('div');copy.className='record-copy';const code=document.createElement('small');code.textContent=`${String(index+1).padStart(3,'0')} / ${item.category}`;
      const title=document.createElement(containerId==='media'?'h2':'h3');title.textContent=item.title;
      const description=document.createElement('p');description.textContent=item.description;
      const details=document.createElement('span');details.className='record-details';details.textContent=`${item.duration} / ${item.resolution} / MP4`;
      const action=document.createElement('span');action.className='record-action';action.textContent='WATCH FILM';
      copy.append(code,title,description,details,action);card.append(image,copy);container.appendChild(card);
    });
  }
  const links=document.getElementById('terminalLinks');links.replaceChildren();
  published.forEach((item,index)=>{const link=document.createElement('a');link.href=item.link;link.target='_blank';link.rel='noopener noreferrer';link.textContent=`${String(index+1).padStart(3,'0')} / ${item.title}`;links.appendChild(link);});
  document.querySelector('#archive .section-code span:last-child').textContent=`${published.length} RECORDS`;
}

function sectionFromHash(){const id=location.hash.slice(1);return ['signal','archive','access'].includes(id)?id:'signal';}
function showSection(id,{focus=false}={}){document.querySelectorAll('.panel').forEach(panel=>{panel.hidden=panel.id!==id;});document.querySelectorAll('[data-section]').forEach(link=>{if(link.dataset.section===id)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});document.title=`KingVision | ${id[0].toUpperCase()+id.slice(1)}`;if(focus){const target=document.getElementById(id);target?.setAttribute('tabindex','-1');target?.focus({preventScroll:true});target?.removeAttribute('tabindex');window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}}
function setupNavigation(){showSection(sectionFromHash());window.addEventListener('hashchange',()=>showSection(sectionFromHash(),{focus:true}));}
function setupStationId(){const dialog=document.getElementById('stationDialog');const open=document.getElementById('playStationId');const close=document.getElementById('closeStationId');const video=dialog.querySelector('video');open.addEventListener('click',()=>{dialog.showModal();video.play().catch(()=>{});});close.addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{video.pause();video.currentTime=0;});dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});video.addEventListener('ended',()=>dialog.close());}
function setupArchiveTerminal(){
  const dialog=document.getElementById('archiveTerminal');
  const open=document.getElementById('openArchiveTerminal');
  open.addEventListener('click',()=>dialog.showModal());
  document.getElementById('closeArchiveTerminal').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>open.focus({preventScroll:true}));
  dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
  dialog.addEventListener('click',event=>{if(event.target.closest('a[href="#access"]'))dialog.close();});
}
window.addEventListener('DOMContentLoaded',()=>{loadContent();setupNavigation();setupStationId();setupArchiveTerminal();});
