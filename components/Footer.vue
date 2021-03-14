<template>
  <footer>
    <div class="container">
      <div class="row gx-0">
        <div class="col equreka">
          <small>Equreka</small>
        </div>
        <div class="col social">
          <ul class="nav">
            <li class="nav-item">
              <a class="nav-link github" target="_blank" rel="noopener nofollow" href="https://github.com/Equreka" title="Github"><i class="icon bi bi-github"></i></a>
            </li>
            <li class="nav-item">
              <a class="nav-link facebook" target="_blank" rel="noopener nofollow" href="https://fb.me/Equreka" title="Facebook"><i class="icon bi bi-facebook"></i></a>
            </li>
            <li class="nav-item">
              <a class="nav-link twitter" target="_blank" rel="noopener nofollow" href="https://twitter.com/Equreka" title="Twitter"><i class="icon bi bi-twitter"></i></a>
            </li>
            <li class="nav-item">
              <a class="nav-link discord" target="_blank" rel="noopener nofollow" href="https://discord.gg/NZypuxvAB6" title="Discord"><i class="icon bi bi-discord"></i></a>
            </li>
          </ul>
        </div>
        <div class="col links">
          <ul class="nav">
            <li class="nav-item"><NuxtLink class="nav-link" :to="localePath('/about')">{{ $t('About') }}</NuxtLink></li>
            <li class="nav-item"><NuxtLink class="nav-link" :to="localePath('/contact')">{{ $t('Contact') }}</NuxtLink></li>
            <li class="nav-item"><NuxtLink class="nav-link" :to="localePath('/donate')">{{ $t('Donate') }}</NuxtLink></li>
          </ul>
        </div>
        <div class="col logo">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 820 500">
            <title>Equreka</title>
            <path fill="var(--footer-color)" d="M820,250c0,138.07-111.93,250-250,250S320,388.07,320,250,431.93,0,570,0,820,111.93,820,250ZM150,200A150,150,0,1,0,300,350,150,150,0,0,0,150,200ZM92.5,0A92.5,92.5,0,1,0,185,92.5,92.5,92.5,0,0,0,92.5,0ZM250,0a50,50,0,1,0,50,50A50,50,0,0,0,250,0Zm20,125a30,30,0,1,0,30,30A30,30,0,0,0,270,125Zm-57.5,0A12.5,12.5,0,1,0,225,137.5,12.5,12.5,0,0,0,212.5,125Zm0,35A12.5,12.5,0,1,0,225,172.5,12.5,12.5,0,0,0,212.5,160Z"/>
          </svg>        
        </div>
      </div>
    </div>
  </footer>
</template>

<script>
  import { version } from '../package.json'
  export default {
    data () {
      return {
        version: version,
      }
    }
  }
</script>