import {showResult} from './results.js?v=character-fade-7';
import {bindButtonHaptics} from './telegram.js?v=all-haptics-1';
bindButtonHaptics();
const scenarios={two:{level:6,score:12800,percent:72,combo:54,stars:2},win:{level:12,score:17856,percent:100,combo:123,stars:3},retry:{level:8,score:1839,percent:10,combo:3,stars:0},zero:{level:8,score:0,percent:0,combo:0,stars:0}};
document.querySelector('#menu').hidden=true;
function preview(name){document.querySelector('#game').dataset.state='ended';showResult(scenarios[name]);}
for(const button of document.querySelectorAll('[data-state]'))button.onclick=()=>preview(button.dataset.state);
document.querySelector('#again').onclick=()=>preview('win');
document.querySelector('#home').onclick=()=>location.href='levels.html';
preview('win');
