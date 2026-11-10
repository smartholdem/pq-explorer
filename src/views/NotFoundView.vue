<template>
  <div class="max-w-xl mx-auto pt-20 text-center" data-testid="notfound-page">
    <div class="font-display text-7xl font-light text-cyan/70">{{ $t('notFound.title') }}</div>
    <p class="mt-4 text-muted">{{ $t('notFound.text') }}</p>
    <RouterLink to="/" class="btn-primary mt-8">{{ $t('nav.dashboard') }}</RouterLink>
  </div>
</template>
