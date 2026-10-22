// @ts-check
import { createApp, defineComponent } from 'vue';
import { db, initDatabase } from './store.js';
import { router } from './router.js';
import { AppNavbar } from './components/AppNavbar.js';

const TEMPLATE = /* html */ `
  <div class="vh-100 overflow-hidden flex flex-row bg-near-black near-white">
    <AppNavbar />

    <!-- Main Content Area -->
    <main class="flex-auto vh-100 overflow-y-auto ph3 pb3 ph4-ns pb4-ns w-100">
      <div class="mw9 center pt3 pt4-ns">
        <div
          v-if="db.isLoading"
          class="pa4 bg-dark-gray ba b--white-10 br3 silver tc"
        >
          Processing Unreal Engine blueprint dumps...
        </div>

        <div
          v-else-if="db.error"
          class="pa4 bg-dark-red ba b--light-red br3 washed-red"
        >
          <strong>Error loading database:</strong> {{ db.error }}
        </div>

        <RouterView v-else />
      </div>
    </main>
  </div>
`;

export const App = defineComponent({
  name: 'App',
  components: { AppNavbar },
  setup() {
    initDatabase();

    return {
      db
    };
  },
  template: TEMPLATE
});

const app = createApp(App);
app.use(router);
app.mount('#app');
