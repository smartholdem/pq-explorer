import { createApp } from 'vue'
import { vCardTable } from './directives/cardTable'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import './style.css'

createApp(App).directive('card-table', vCardTable).use(createPinia()).use(router).use(i18n).mount('#app')
