# vaportrade
It's lit!

PRs welcome! The CSS is super hacky, the design needs work, I depend on a weird library called packard-belle when I should really be writing these styles myself, there's `<div><div><div></div></div></div>`s everywhere, and it scales terribly on different screen sizes. <3 to anyone who contributes :)

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm run start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

Make sure you're running a cors-anywhere proxy at localhost:8080.

### `npm run build`

Builds the app for production to the `build` folder.


# PRE-LAUNCH TODO:
- [] fix token approval not sticking for IRON Titanium
- [~] p2 trade done UI has get TX hash
- [~] fix weird gas estimation in submission in metamask (tx failed cause of it, does Sequence offer this?)
- [~] fix skyweaver token balance 1/100th??
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
# NICE TO HAVE TODO:
- [] ENS
- [] make trade button flash when new things happen
- [] add drag & drop (partially implemented, but doesn't work hehe)
- [] buggy buggy css, please flexbox wizards, save me
- [] figure out why we re-render at like 60fps.... eeeeeek... ugly ugly smelly react code with effects
- [] correctly close trade req when we lose the peer. eek. sometimes doesn't work
- [x] add sequence support :|
- [x] add timeout expired UI
- [x] rip out 0x, it's huge.. once trader.xyz adds order hashing & polygon we good
- [x] ~~deploy 0x v3 to polygon yeesh~~ done, polygon did it!
- [x] ~~clicking folders in your wallet can show contents of your trading partner's wallet~~ can't repro
- [x] ~~trading partner's offer doesn't load tokenID metadata, just shows parent contract~~