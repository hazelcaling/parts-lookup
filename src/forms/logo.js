import htecLogo from "../assets/htecLogo.png";

export { htecLogo };
let cached = null;
// HTEC logo as a data URL for jsPDF (loaded once)
export const loadLogo = () => {
  if (!cached) {
    cached = fetch(htecLogo)
      .then((r) => r.blob())
      .then((b) => new Promise((ok, fail) => {
        const fr = new FileReader();
        fr.onload = () => ok(fr.result);
        fr.onerror = fail;
        fr.readAsDataURL(b);
      }))
      .catch((e) => { cached = null; throw e; });
  }
  return cached;
};
