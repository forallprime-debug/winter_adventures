// Rhythm keys do not count as keyboard navigation when dialogs receive focus.
const game=document.documentElement;
window.addEventListener('keydown',event=>{if(event.key==='Tab')game.classList.add('keyboard-navigation')},true);
window.addEventListener('pointerdown',()=>game.classList.remove('keyboard-navigation'),true);
