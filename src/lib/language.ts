/**
 * The shop opens in the visitor's language the first time: the language of
 * their Telegram app inside the Mini App, otherwise the phone's or browser's.
 * Russian-speaking settings get the Russian shop, everything else stays as
 * the link says (Uzbek by default). Once the visitor picks a language with
 * the switcher, that choice wins on every later visit.
 */

/** The visitor's language: chosen with the switcher, or detected once. */
export const LANGUAGE_KEY = "mm_lang";

export function rememberLanguage(locale: string) {
  try {
    localStorage.setItem(LANGUAGE_KEY, locale);
  } catch {
    // Storage can be blocked (private mode): the address still decides.
  }
}

/**
 * Runs in <head> before anything else, as a string for the inline script.
 * Moves to the other language's address (keeping Telegram's launch data
 * after "#") before the page is painted.
 */
export const languageScript = `(function(){try{var ls=localStorage;if(ls.getItem("${LANGUAGE_KEY}"))return;
var parts=location.pathname.split("/"),current=parts[1];if(current!=="uz"&&current!=="ru")return;
var lang="",data=new URLSearchParams(location.hash.slice(1)).get("tgWebAppData");
if(data){try{lang=JSON.parse(new URLSearchParams(data).get("user")||"{}").language_code||""}catch(e){}}
if(!lang)lang=(navigator.languages&&navigator.languages[0])||navigator.language||"";lang=lang.slice(0,2).toLowerCase();
var want=/^(ru|uk|be|kk|ky|tg)$/.test(lang)?"ru":lang==="uz"?"uz":current;ls.setItem("${LANGUAGE_KEY}",want);
if(want!==current){parts[1]=want;location.replace(parts.join("/")+location.search+location.hash)}}catch(e){}})()`;
