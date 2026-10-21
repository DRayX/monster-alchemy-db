// @ts-check
import { watch } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import { db } from './store.js';
import { HomePage } from './components/HomePage.js';
import { MonsterTable } from './components/MonsterTable.js';
import { MonsterDetail } from './components/MonsterDetail.js';
import { ItemTable } from './components/ItemTable.js';
import { ItemDetail } from './components/ItemDetail.js';
import { RoomDetail } from './components/RoomDetail.js';

/**
 * @typedef {import('vue-router').RouteLocationNormalizedLoaded | import('vue-router').RouteLocationNormalized} RouteLocation
 * @typedef {(route: RouteLocation) => string} RouteTitle
 */

export const BASE_TITLE = 'Monster Alchemy Database';

/** @type {import('vue-router').RouteRecordRaw[]} */
export const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
    meta: {
      /** @type {RouteTitle} */
      title: () => ''
    }
  },
  {
    path: '/monsters',
    name: 'monsters',
    component: MonsterTable,
    meta: {
      /** @type {RouteTitle} */
      title: () => 'Monsters'
    }
  },
  {
    path: '/monsters/:id',
    name: 'monster-detail',
    component: MonsterDetail,
    meta: {
      /** @type {RouteTitle} */
      title(route) {
        const id = /** @type {string} */ (route.params.id);
        const monster = db.monsters.find((m) => m.id === id);
        return monster?.name || id;
      }
    }
  },
  {
    path: '/items',
    name: 'items',
    component: ItemTable,
    meta: {
      /** @type {RouteTitle} */
      title: () => 'Items'
    }
  },
  {
    path: '/items/:id',
    name: 'item-detail',
    component: ItemDetail,
    meta: {
      /** @type {RouteTitle} */
      title(route) {
        const id = /** @type {string} */ (route.params.id);
        const item = db.items.find((i) => i.id === id);
        return item?.name || id;
      }
    }
  },
  {
    path: '/rooms/:id',
    name: 'room-detail',
    component: RoomDetail,
    meta: {
      /** @type {RouteTitle} */
      title(route) {
        const id = /** @type {string} */ (route.params.id);
        const room = db.rooms.find((r) => r.id === id);
        return room?.name || id;
      }
    }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes
});

/**
 * Resolves the document title for a given route using its route definition meta.
 * @param {import('vue-router').RouteLocationNormalizedLoaded | import('vue-router').RouteLocationNormalized} route
 * @returns {string}
 */
export function getPageTitle(route) {
  const titleFn = /** @type {RouteTitle | undefined} */ (route.meta?.title);
  const pageTitle = titleFn ? titleFn(route) : '';
  return pageTitle ? `${pageTitle} | ${BASE_TITLE}` : BASE_TITLE;
}

router.afterEach((to) => {
  document.title = getPageTitle(to);
  document.querySelector('main')?.scrollTo(0, 0);
});

watch(
  () => db.isLoading,
  (loading) => {
    if (!loading) {
      document.title = getPageTitle(router.currentRoute.value);
    }
  }
);
