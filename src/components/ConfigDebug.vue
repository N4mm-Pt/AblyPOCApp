<template>
  <div class="config-debug" v-if="showDebug">
    <div class="debug-panel">
      <h3>🔧 Configuration Debug</h3>
      <div class="debug-item">
        <strong>Ably API Key:</strong> 
        <span :class="apiKeyStatus.class">{{ apiKeyStatus.display }}</span>
      </div>
      <div class="debug-item">
        <strong>API Base URL:</strong> 
        <span>{{ config.api.baseUrl }}</span>
      </div>
      <div class="debug-item">
        <strong>Environment:</strong> 
        <span>{{ isDev ? 'Development' : 'Production' }}</span>
      </div>
      <div class="debug-item" v-if="validationErrors.length > 0">
        <strong>Validation Errors:</strong>
        <ul class="error-list">
          <li v-for="error in validationErrors" :key="error" class="error">{{ error }}</li>
        </ul>
      </div>
      <button @click="showDebug = false" class="close-btn">Close</button>
    </div>
  </div>
  <div class="debug-toggle" @click="showDebug = true" v-else>
    🔧 Debug Config
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import config, { validateConfig } from '../config'

const showDebug = ref(false)
const isDev = import.meta.env.DEV

const validation = validateConfig()
const validationErrors = validation.errors

const apiKeyStatus = computed(() => {
  const apiKey = config.ably.apiKey
  if (!apiKey) {
    return { display: 'Not Set', class: 'error' }
  }
  if (apiKey === 'your-ably-api-key-here') {
    return { display: 'Using Placeholder', class: 'warning' }
  }
  return { 
    display: `${apiKey.substring(0, 12)}...`, 
    class: 'success' 
  }
})
</script>

<style scoped>
.debug-toggle {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  z-index: 9999;
}

.config-debug {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.debug-panel {
  background: white;
  padding: 24px;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.debug-panel h3 {
  margin: 0 0 16px 0;
  color: #1f2937;
}

.debug-item {
  margin-bottom: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #e5e7eb;
}

.debug-item:last-child {
  border-bottom: none;
}

.debug-item strong {
  color: #374151;
  display: inline-block;
  width: 120px;
}

.success {
  color: #10b981;
  font-weight: 600;
}

.warning {
  color: #f59e0b;
  font-weight: 600;
}

.error {
  color: #dc2626;
  font-weight: 600;
}

.error-list {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.error-list li {
  color: #dc2626;
  margin-bottom: 4px;
}

.close-btn {
  margin-top: 16px;
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.close-btn:hover {
  background: #2563eb;
}
</style>
