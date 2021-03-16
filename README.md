<div align="center">

![Logo](./static/assets/brand/logo.png)


# Equreka 
[![Discord](https://img.shields.io/discord/812053915356364811?style=social&logo=discord&label=Discord&labelColor=f2f2f2)](https://discord.gg/NZypuxvAB6)
[![Twitter Follow](https://img.shields.io/twitter/follow/Equreka?style=social)](https://twitter.com/Equreka)
[![Sponsor](https://img.shields.io/github/sponsors/DerianAndre?style=social)](https://github.com/sponsors/DerianAndre)
[![GitHub](https://img.shields.io/github/license/Equreka/Equreka?color=green&label=License)](https://github.com//Equreka)

### Your free and open-source app for variables, constants, formulas and equations

**Sponsor Equreka** https://github.com/sponsors/DerianAndre

</div>

#####

## Help wanted
Join us at Discord: https://discord.gg/NZypuxvAB6


## Build Setup

```bash
# install dependencies
$ npm install

# serve with hot reload at localhost:3000
$ npm run dev

# build for production and launch server
$ npm run build 
$ npm run start

# generate static project
$ npm run generate
```

For detailed explanation on how things work, check out [Nuxt.js docs](https://nuxtjs.org).

## Android build

```bash
# this will run all scripts needed and open android studio
$ npm run build-android

```
Please check out [Capacitor docs](https://capacitorjs.com/docs/v3/)

## Capacitor not working when launching App in Android Studio

Make sure `/android/app/build.gradle` have `aapOptions` like this:
```
android {
  ...
  defaultConfig {
    ...
    aaptOptions {
      ignoreAssetsPattern '!.svn:!.git:!.ds_store:!*.scc:!CVS:!thumbs.db:!picasa.ini:!*~'
    }
  }
}
```

## To-do

### App
- [ ] Use cappacitor.js to export as an app for iOS and Android (WIP)
### UI
- [ ] Add content for everything
### API
- [ ] Add security layers
- [ ] Add content through post
- [ ] Finish APIs for every model
### Database
- [ ] Add subcategories (?)
- [ ] Improve general structure (?)
- [ ] Improve traductions structure (*)
- [ ] Add Realm for mobile (offlinemode)
- [ ] Sync offline mode db with server (Realm)
### Scripts
- [ ] Improve Hover system for dynamic created elements (MathJax)
- [X] Improve favorites system (working but very basic)
- [ ] Add import/export favorites
- [ ] Save in localStorage language setting
