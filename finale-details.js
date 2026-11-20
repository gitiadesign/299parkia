(() => {
  const roll=document.getElementById('finaleDetailRoll'), button=document.getElementById('pauseFinaleDetails');
  if(!roll||!button)return;
  const details=[
    "I need a minute.", "I need a coffee.", "I need the good table.", "I need somewhere to take this call.",
    "I need the room ready before they get here.", "I need a little air.", "I need to move.", "I need to do absolutely nothing.",
    "I need to see where I’m going.", "I need an easier way in.", "I need a place to wait.", "I need to step out of the rain.",
    "I need to get upstairs.", "I need to find the entrance.", "I need to get there on time.", "I need to know where to go.",
    "I need a hand with the door.", "I need a minute to gather myself.", "I need somewhere to meet my guest.", "I need to get out of the car.",
    "I need to know I’m in the right place.", "I need to get my bearings.", "I need to ask someone.", "I need to look around.",
    "I need to sit down.", "I need a quiet welcome.", "I need to make a quick stop.", "I need to get on with the day.",
    "I need an answer without the runaround.", "I need to say hello.", "I need to find my people.", "I need to leave my coat.",
    "I need coffee before I speak.", "I need to catch my breath.", "I need to warm up.", "I need to look out the window.",
    "I need a seat in the sun.", "I need something to eat.", "I need to take lunch off my desk.", "I need time for the first sip.",
    "I need a glass of wine.", "I need a table for two.", "I need to talk without shouting.", "I need to finish the conversation.",
    "I need to invite them to stay.", "I need one more minute.", "I need a better seat.", "I need to see who’s here.",
    "I need to get outside.", "I need to look up.", "I need to feel the weather.", "I need to take a break.",
    "I need to turn a few pages.", "I need to sit in the shade.", "I need a change of scene.", "I need to think without a screen.",
    "I need to take the stairs.", "I need to see what’s upstairs.", "I need to take the long way.", "I need to pause on the landing.",
    "I need to look back.", "I need to start again.", "I need to find a quieter corner.", "I need to slow down.",
    "I need a cup of tea.", "I need to wait with someone.", "I need to settle in.", "I need to take the weight off.",
    "I need to stay a little longer.", "I need to finish my tea.", "I need a softer seat.", "I need room beside me.",
    "I need to get lost in a book.", "I need a light to read by.", "I need a place to think.", "I need to hear myself think.",
    "I need a moment alone.", "I need to sit near the window.", "I need to read one more page.", "I need to just be here.",
    "I need a desk for an hour.", "I need to jot this down.", "I need to close the laptop.", "I need to open the laptop.",
    "I need to clear my head.", "I need to get one thing done.", "I need to finish this thought.", "I need to see the city.",
    "I need to get everyone in the room.", "I need to make a good first impression.", "I need to hear the person across from me.", "I need a minute before we start.",
    "I need to read the room.", "I need to get to the point.", "I need to take a note.", "I need to leave something on the table.",
    "I need to change gears.", "I need to reset.", "I need to wash my hands.", "I need to loosen my shoulders.",
    "I need to get quiet.", "I need to shut my eyes.", "I need to let something go.", "I need to breathe a little slower.",
    "I need to stretch.", "I need to feel my feet on the floor.", "I need to try that again.", "I need to stand up straight.",
    "I need to cool down.", "I need to make time for myself.", "I need to feel like myself again.", "I need to head out."
  ];
  for(const detail of details){
    const row=document.createElement('div');row.className='finale-detail-row';
    row.textContent=detail;roll.append(row);
  }
  // The repeated first line closes the loop without a blank frame.
  roll.append(roll.firstElementChild.cloneNode(true));
  roll.style.setProperty('--detail-stop',`translateY(-${details.length*1.4}em)`);
  button.addEventListener('click',()=>{
    const paused=roll.classList.toggle('detail-roll-paused');
    button.textContent=paused?'Resume':'Pause';
    button.setAttribute('aria-label',paused?'Resume scrolling details':'Pause scrolling details');
  });
})();
