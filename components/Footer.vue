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
      </div>
    </div>
  </footer>
</template>