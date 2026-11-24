# Sunspots: web release package (free version)

> **For your builder:** this folder is the whole game. Copy everything in `release/sunspots/` to the website as-is (keep the folder structure), e.g. so it lives at etherealentertainmentsystems.com/sunspots/.
> Play it here: https://jonasscott-bit.github.io/sunspots-test/release/sunspots/
> Folder: https://github.com/jonasscott-bit/sunspots-test/tree/main/release/sunspots
> Download: on the repo page use Code → Download ZIP (whole repo; the game is the release/sunspots folder inside), or download just this folder with https://download-directory.github.io/?url=https://github.com/jonasscott-bit/sunspots-test/tree/main/release/sunspots

Made Nov 23, 2026 from the latest build (version bfc88ca, "2026-11-23 release-pass").

## What this is

The whole game Sunspots, ready to put on a website. It runs in any phone or computer browser, and people can add it to their phone home screen like an app (icon included). **It is free:** all seven Nights, no paywall, no ads. A Support button opens your Stripe support link.

## What's in it

- **sunspots/** is the game. It has 909 files (273 MB): index.html, the game code, models, audio, video, the manual and icons. All the links inside are relative, so the folder works at any web address. For example etherealentertainmentsystems.com/sunspots/ or a subdomain like sunspots.etherealentertainmentsystems.com.
- **sunspots/legal/privacy.html and terms.html** are DRAFT legal pages, linked in the game's Settings and Credits. **You need to fill in your business details first:** a support email, a mailing address, the dates, and ideally get a quick lawyer check.

The complete package is in the GitHub repo jonasscott-bit/sunspots-test, folder release/sunspots/.

## How to put it on your website

Your company site, etherealentertainmentsystems.com, is registered at Porkbun and runs on Vercel (project "ees-hub"). It already has a Sunspots card.

- **Your homepage (your plan): say OK and Sol does it.** Sol adds the sunspots folder to your homepage project on Vercel (ees-hub), so the game plays at etherealentertainmentsystems.com/sunspots/. Then Sol points the Sunspots card's Play button at it. It costs nothing. Sol won't change your live site until you say yes.
- **Free alternative:** GitHub Pages, where the test build already lives. You'd get a "make it public" link to share.
- **Doing it yourself:** upload the whole sunspots folder to any web host and keep the folders exactly as they are. Then open yoursite/sunspots/.

## Free, with a Support button

Sunspots is free. The title screen has a **♥ SUPPORT** button beside MANUAL, and both Credits screens have a **♥ SUPPORT SUNSPOTS** link. They open your existing Sunspots support link from your homepage in a new tab: https://donate.stripe.com/00w4gz4hj3KD3A4dZed7q02 (the "sunspots" link your site already uses). No new Stripe links were made.

To change or remove it, edit one line near the top of sunspots/index.html: supportUrl: "..." (leave it empty to hide the buttons).

**Later, if you ever want to charge:** the Night 1 demo with a CA$7.99 unlock is still built in and switched off. The unlock page is kept off this folder on purpose (ask Sol), and it's honor-system protection only. itch.io "pay what you want" is another easy option. You're not GST-registered and you're under the CA$30,000 small-supplier limit, so tips and sales don't need GST yet.

## Known issues (honest)

- On real phones, cars can glitch or vanish in the town.
- Character voices only play in the opening scene. Music works throughout.
- The first load downloads about 14 MB and takes a few seconds. Later visits are faster.
- Saves live in the player's browser. Safari can clear them if the game isn't opened for a long time, unless it was added to the home screen.
- Computer play: see "Computer" below.
- No more development is planned. This is the game as it stands.

## Computer

It loads and plays in a computer browser (tested at 1280x800 with keyboard and mouse):
- Mouse clicks work for all the menus.
- Arrow keys or WASD walk the Wolf.
- E gets in Moth's cab. W/S or the arrow keys drive and brake, A/D steer, H honks.
- Holding Enter (or Esc) skips a cutscene. Esc on its own pauses.

What's missing on computer:
- The on-screen hints still say "drag to walk" or "tap", and the phone touch buttons (GAS, BRAKE, arrows) still show. They can be clicked with the mouse but look phone-like.
- There's no keyboard help screen.
- Speed on a real computer couldn't be judged in Sol's test browser, which has no graphics card, so it was very slow there.
