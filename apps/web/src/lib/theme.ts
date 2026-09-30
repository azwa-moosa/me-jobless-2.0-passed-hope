/** Theme preference: 'light' | 'dark' | 'system'. Resolved theme is written to <html data-theme>. */
export type ThemePref = 'light' | 'dark' | 'system';
export const THEME_KEY = 'bml-theme';

/**
 * Runs inline in <head> BEFORE first paint, so there is no light→dark flash and React hydrates
 * against the already-correct attribute. Kept dependency-free and tiny on purpose.
 */
export const THEME_BOOTSTRAP = `(function(){try{var k='${'bml-theme'}';var p=localStorage.getItem(k);if(p!=='light'&&p!=='dark'&&p!=='system'){p='system';}
var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=p==='system'?(m?'dark':'light'):p;
var d=document.documentElement;d.setAttribute('data-theme',t);d.setAttribute('data-theme-pref',p);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;
