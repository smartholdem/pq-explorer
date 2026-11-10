import { createRouter, createWebHistory } from 'vue-router'

export default createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', name: 'dashboard', component: () => import('@/views/DashboardView.vue') },
    { path: '/blocks', name: 'blocks', component: () => import('@/views/BlocksView.vue') },
    { path: '/block/:id', name: 'block', component: () => import('@/views/BlockView.vue'), props: true },
    { path: '/transactions', name: 'transactions', component: () => import('@/views/TransactionsView.vue') },
    { path: '/mempool', name: 'mempool', component: () => import('@/views/MempoolView.vue') },
    { path: '/tx/:id', name: 'tx', component: () => import('@/views/TransactionView.vue'), props: true },
    { path: '/wallets', name: 'wallets', component: () => import('@/views/WalletsView.vue') },
    { path: '/wallet/:id', name: 'wallet', component: () => import('@/views/WalletView.vue'), props: true },
    { path: '/delegates', name: 'delegates', component: () => import('@/views/DelegatesView.vue') },
    { path: '/delegate/:id', name: 'delegate', component: () => import('@/views/DelegateView.vue'), props: true },
    { path: '/tokens', name: 'tokens', component: () => import('@/views/TokensView.vue') },
    { path: '/token/:id', name: 'token', component: () => import('@/views/TokenView.vue'), props: true },
    { path: '/market', name: 'market', component: () => import('@/views/MarketView.vue') },
    { path: '/order/:id', name: 'order', component: () => import('@/views/OrderView.vue'), props: true },
    { path: '/sobj/:id', name: 'sobj', component: () => import('@/views/SmartObjectView.vue'), props: true },
    { path: '/search', name: 'search', component: () => import('@/views/SearchView.vue') },
    { path: '/:pathMatch(.*)*', name: 'notfound', component: () => import('@/views/NotFoundView.vue') },
  ],
})
