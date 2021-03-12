<template>
  <div class="toast-container position-absolute p-3 top-0 start-50 translate-middle-x" style="z-index: 999" :id="`toast-${id}`">
    <div class="toast" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="toast-header">        
        <strong class="me-auto">{{ title }}</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">
        {{ content }}
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    props: {
      id: String,
      title: String, 
      content: String
    },
    mounted() {
      //var toastElList = [].slice.call(document.querySelectorAll('.toast'));
      //var toastList = toastElList.map(function (toastEl) {
      //  return new bootstrap.Toast(toastEl, option)
      //});
    }
  }
</script>