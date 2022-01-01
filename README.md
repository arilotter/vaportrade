# https://vaportrade.net/

PRs welcome! The CSS is pretty hacky, I depend on a component library called packard-belle & inline a bunch of stuff when I should really be writing these styles myself, there's `<div><div><div></div></div></div>`s everywhere, and it scales terribly on different screen sizes. <3 to anyone who contributes, PRs, bugs, and suggestions welcome! :)

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm run start`

Runs the app in the development mode.
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.
You will also see any lint errors in the console.

Make sure you're running a cors-anywhere proxy at localhost:8080.

### `npm run build`

Builds the app for production to the `build` folder.

# NICE TO HAVE TODO:
- [ ] fix partially reverted TXs showing "trade successful"
- [ ] get Sequence indexer without hack, so we don't have to use a random wallet using a hardcoded key
- [ ] other chains support
- [ ] monitor for order success on taker side as well, in case wallet UX is weird and buggy.
- [ ] ENS, unstoppable domains?
- [ ] why does Sequence logout feel so buggy, how do I deauth?
- [ ] add "kill" button that you can race your trading partner to, lol
- [ ] make trade button flash when new things happen
- [ ] buggy buggy css, please flexbox wizards, save me
- [ ] correctly close trade req when we lose the peer. eek. sometimes doesn't work
- [x] sexy rightclick menu
- [x] add drag & drop (partially implemented, but doesn't work hehe)
- [x] verified contracts :)
- [x] figure out why we re-render at like 60fps.... eeeeeek... ugly ugly smelly react code with effects (it was sending lockin back and forth 1000 times lol)
- [x] add sequence support :|
- [x] add timeout expired UI
- [x] rip out 0x, it's huge.. once trader.xyz adds order hashing & polygon we good
- [x] ~~deploy 0x v3 to polygon yeesh~~ done, polygon did it!
- [x] ~~clicking folders in your wallet can show contents of your trading partner's wallet~~ can't repro
- [x] ~~trading partner's offer doesn't load tokenID metadata, just shows parent contract~~

# PRE-LAUNCH TODO:
- [x] fix weird gas estimation all over the place - perhaps add buffer?
- [x] add verified tokens list!
- [x] why doesn't closing a trade work?
- [x] p2 trade done UI has get TX hash
- [x] keep listeners for all not-yet-filled signed orders around, and fire trade success if we hit one!
- [x] test with erc721s - instant add-remove without amount UI, and instant drag/drop.
- [x] fix skyweaver token balance 1/100th??
- [x] what happens if p1 signs, p2 changes order.. how do we invalidate p1's order without paying? :| e.g. what happens if they do a new trade req, then p2 is allowed to fill the first order still if it happened fast enough? solution: cache not-yet-filled orders :)
- [x] fix trade complete css on small screens vertically
- [x] fix trades not clearing correctly after trade submit
- [x] let you pick who pays for trade
- [x] donate link
- [x] remove ghost tokenid 0
- [x] fix dogshit css overflows
- [x] add better in-progress states when the wallet is open (fullscreen modal?)
- [x] add error handling (tons are completely unhandled)
- [x] add timeout for orders
- [x] use hashing of orders to verify integrity of trades
- [x] make taskbar flash when new things happen ( just need css )
- [x] make trading work, lol (signature error??)
