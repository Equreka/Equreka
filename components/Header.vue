<template>    
  <header>
    <nav class="navbar navbar-expand-md py-0">
      <div class="container d-flex align-items-center justify-content-between">
        <div class="navbar-navigation">
          <button type="button" class="navbar-toggler collapsed" data-toggle="collapse" data-target="#navbarCollapse" aria-controls="navbarCollapse" aria-expanded="false" aria-label="Toggle navigation">
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
          </button>
          <a class="navbar-brand" href="./">
            <img src="/assets/brand/logo.png" width="65" alt="Ecureka">
          </a>
          <div class="navbar-button">
            <div class="nav-item dropdown">
              <a class="nav-link dropdown-toggle" href="" id="dropdownCategories" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">Categories</a>
              <div class="dropdown-menu" aria-labelledby="dropdownCategories">
                <h6 class="dropdown-header">Categories</h6>
                <a class="dropdown-item" href="#">Mathematics</a>
                <a class="dropdown-item" href="#">Physics</a>
                <a class="dropdown-item" href="#">Chemistry</a>
              </div>
            </div>    
          </div>
        </div>
        <b-form class="form-search">
          <b-form-input id="search" type="text" placeholder="Search..." aria-label="Search" />
        </b-form>
        <div id="navbarCollapse" class="collapse navbar-collapse">
          <ul class="navbar-nav navbar-right justify-content-end">
            <li class="nav-item dropdown">
              <b-dropdown right>
                <template #button-content>
                  <span>EN</span>
                  <i class="bi bi-globe"></i>
                </template>
                <h6 class="dropdown-header">Language</h6>
                <b-dropdown-item href="#">English</b-dropdown-item>
                <b-dropdown-item href="#">Español</b-dropdown-item>
              </b-dropdown>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  </header>
</template>

<script>
export default {
  
}
</script>