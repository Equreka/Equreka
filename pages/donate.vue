<template>
  <main role="main" class="donate">
    <div class="container">
      <h2>Donate</h2>
      <p class="lead">Donations will help us to improve, add new features, organize and pay for all the infrastructure needed.</p>
      <p>If you like what we do and the platform you can help us by sharing and if you want you can donate.</p>
      <a href="https://github.com/sponsors/DerianAndre" class="btn btn-dark btn-icon" target="_blank" rel="noopener nofollow">
        <i class="bi bi-github"></i> Be a Github Sponsor
      </a>
      <a href="https://paypal.me/Derianandre" class="btn btn-light btn-icon" target="_blank" rel="noopener nofollow">
        <i class="bi bi-credit-card"></i> Donate via Paypal
      </a>
    </div>
  </main>
</template>

<script>
  export default {
    head() {
      return {
        bodyAttrs: {
          class: `page-donate`
        }
      }
    }
  }
</script>