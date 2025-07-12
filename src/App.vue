<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()

const navigation = [
  { path: '/', label: 'Teacher Dashboard', icon: '👨‍🏫' },
  { path: '/student', label: 'Student View', icon: '👨‍🎓' }
]

// Get current page title based on route
const currentPageTitle = computed(() => {
  const currentNav = navigation.find(nav => nav.path === route.path)
  return currentNav ? currentNav.label : 'Classroom'
})
</script>

<template>
  <div id="app">
    <nav class="navigation">
      <div class="nav-container">
        <div class="nav-brand">
          <h2>📚 {{ currentPageTitle }}</h2>
        </div>
        <div class="nav-links">
          <router-link 
            v-for="nav in navigation" 
            :key="nav.path"
            :to="nav.path"
            class="nav-link"
            :class="{ active: route.path === nav.path }"
          >
            <span class="nav-icon">{{ nav.icon }}</span>
            <span class="nav-label">{{ nav.label }}</span>
          </router-link>
        </div>
      </div>
    </nav>
    
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
#app {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.navigation {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  z-index: 100;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
}

.nav-brand h2 {
  color: #1f2937;
  font-weight: 700;
  font-size: 1.5rem;
}

.nav-links {
  display: flex;
  gap: 8px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 12px;
  text-decoration: none;
  color: #6b7280;
  font-weight: 500;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.nav-link::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.1), transparent);
  transition: left 0.5s;
}

.nav-link:hover::before {
  left: 100%;
}

.nav-link:hover {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.05);
  transform: translateY(-1px);
}

.nav-link.active {
  color: #3b82f6;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(29, 78, 216, 0.1) 100%);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
}

.nav-icon {
  font-size: 1.2rem;
}

.nav-label {
  font-size: 0.95rem;
}

.main-content {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .nav-container {
    padding: 0 16px;
    flex-direction: column;
    gap: 16px;
    min-height: auto;
    padding-top: 16px;
    padding-bottom: 16px;
  }
  
  .nav-brand h2 {
    font-size: 1.25rem;
  }
  
  .nav-links {
    width: 100%;
    justify-content: center;
  }
  
  .nav-link {
    flex: 1;
    justify-content: center;
    padding: 8px 12px;
  }
  
  .nav-label {
    display: none;
  }
  
  .nav-icon {
    font-size: 1.5rem;
  }
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .navigation {
    background: rgba(30, 41, 59, 0.95);
    border-bottom-color: rgba(148, 163, 184, 0.2);
  }
  
  .nav-brand h2 {
    color: #f1f5f9;
  }
  
  .nav-link {
    color: #94a3b8;
  }
  
  .nav-link:hover {
    color: #60a5fa;
    background: rgba(96, 165, 250, 0.1);
  }
  
  .nav-link.active {
    color: #60a5fa;
    background: linear-gradient(135deg, rgba(96, 165, 250, 0.15) 0%, rgba(37, 99, 235, 0.15) 100%);
  }
}
</style>
