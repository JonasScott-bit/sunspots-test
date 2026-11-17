// Credits: one place for the names (the title CREDITS panel and the end-of-game roll both read this).
// Change the creator's name here.
export const CREATOR_NAME = 'Scott Petrowski';
export const STUDIO = 'Ethereal Entertainment Systems';
export const GAME = 'SUNSPOTS';
export const STARRING = ['The Wolf', 'Moth', 'Bear', 'Ram', 'Crow', 'Lynx', 'Heron', 'Banana Squid', 'Larry Byrd', 'Gecko', 'Anteater', 'Officer Fuzz', 'Cake, Shake & Fuzzy Peach', 'TV-Head', 'and the whole town'];
export const CREDIT_ROWS = [
  ['A GAME BY', STUDIO], ['CREATED BY', CREATOR_NAME], ['STARRING', STARRING.join('\n')],
  ['SET IN', 'Same Old One Horse Town'], ['MUSIC', 'Music made with Suno'], ['BUILT WITH', 'three.js (MIT License)\nmeshoptimizer (MIT License)'],
];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
export const creditsHTML = (end = '&#9728;') => `<p class="big">${GAME}</p>` + CREDIT_ROWS.map(([k, v]) => `<p><small>${k}</small>${esc(v).replace(/\n/g, '<br>')}</p>`).join('') + `<p><small>THANK YOU FOR PLAYING</small>${end}</p>`;
