import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', component: () => import('./components/teacher/TeacherPage.vue') },
  { path: '/student', component: () => import('./components/student/StudentPage.vue') }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

createApp(App).use(router).mount('#app')
