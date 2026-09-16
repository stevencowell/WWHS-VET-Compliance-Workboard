// Confirm the click was received, never claim that a save/copy/network action succeeded.
document.addEventListener('click',event=>{
 const button=event.target.closest?.('button,input[type="button"],input[type="submit"],[role="button"]');
 if(!button||button.disabled||button.getAttribute('aria-disabled')==='true')return;
 clearTimeout(button.feedbackTimer);
 button.classList.remove('button-acknowledged');
 // Restart the acknowledgement when a button is clicked repeatedly.
 void button.offsetWidth;
 button.classList.add('button-acknowledged');
 button.feedbackTimer=setTimeout(()=>button.classList.remove('button-acknowledged'),700);
},true);
