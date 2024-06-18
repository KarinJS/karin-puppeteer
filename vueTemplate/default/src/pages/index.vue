<template>
  <component v-if="widget.remote" :is="widget.remote" :data="widget.data" />
  <v-row v-else no-gutters class="h-screen">
    <v-col class="d-flex align-center justify-center">
      <div class="text-center">
        <h1 class="text-h1">页面不存在</h1>
        <p>
          <small>您渲染的页面不存在</small>
        </p>
      </div>
    </v-col>
  </v-row>
</template>

<script setup>
import Axios from 'axios';
import { loadModule } from "vue3-sfc-loader/dist/vue3-sfc-loader"
import * as Vue from 'vue'
import { useRoute } from 'vue-router';
import { onMounted, defineAsyncComponent, ref } from "vue"

const route = useRoute();
const request = Axios.create();
const widget = ref({});

const load = async () => {
  const query = route.query;
  if (query.id) {
    request.post(`/vue/getTemplate`, { id: query.id }).then(res => {
      if (res.data.status === 'success' && res.data.widget && res.data.name) {
        const options = {
          moduleCache: {
            vue: Vue,
            request: request
          },
          async getFile() {
            return res.data.widget
          },
          addStyle(textContent) {
            const style = Object.assign(document.createElement('style'), { textContent })
            const ref = document.head.getElementsByTagName('style')[0] || null
            document.head.insertBefore(style, ref)
          },
        }
        widget.value = {
          name: res.data.name,
          data: res.data.data,
          remote: defineAsyncComponent(() => loadModule(res.data.name + '.vue', options))
        }
      }
    }).catch(() => {
      
    })
  }
};
onMounted(() => {
  load()
});
</script>
