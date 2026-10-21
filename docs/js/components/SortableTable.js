// @ts-check
import { ref, computed, defineComponent } from 'vue';

/**
 * @typedef {Record<string, any>} TableRow
 */

/**
 * Column definition for the shared SortableTable component.
 * @template {TableRow} [T=TableRow]
 * @typedef {Object} TableColumn
 * @property {keyof T & string} key - Property key on the row object
 * @property {string} [label] - Optional column header text
 * @property {string} [title] - Optional column header title/tooltip
 * @property {string} [icon] - Optional column icon URL
 * @property {boolean} [sortable] - Whether clicking the header sorts by this column (defaults to true)
 * @property {'left' | 'right' | 'center'} [align] - Text alignment (defaults to 'left')
 * @property {(a: T, b: T) => number} [compare] - Optional custom comparator function
 */

const TEMPLATE = /* html */ `
  <div class="bg-dark-gray br3 table-card-wrapper overflow-visible-l overflow-x-auto">
    <table class="w-100 collapse tl f6">
      <thead>
        <tr class="bg-near-black silver f7 ttu tracked bb b--white-10">
          <th
            v-for="col in columns"
            :key="col.key"
            @click="toggleSort(col)"
            :class="[headerClass(col), 'table-sticky-header']"
          >
            <span class="inline-flex items-center">
              <img
                v-if="col.icon"
                :src="col.icon"
                :alt="col.title || col.label || ''"
                :title="col.title || col.label || ''"
                :class="[col.label ? 'mr1' : '', 'flex-shrink-0 pixelated icon-14']"
              />
              <span v-if="col.label">{{ col.label }}</span>
              <span v-if="col.sortable !== false" class="ml1">{{ sortIndicator(col) }}</span>
            </span>
          </th>
        </tr>
      </thead>
      <tbody class="lh-copy">
        <tr
          v-for="row in sortedRows"
          :key="String(getCellValue(row, rowKey))"
          class="bb b--white-10 hover-bg-black-30"
        >
          <slot name="row" :row="row" />
        </tr>
        <tr v-if="sortedRows.length === 0">
          <td :colspan="columns.length" class="pa4 tc silver">
            {{ emptyMessage }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
`;

export const SortableTable = defineComponent({
  name: 'SortableTable',
  template: TEMPLATE,
  props: {
    rows: {
      /** @type {import('vue').PropType<TableRow[]>} */
      type: Array,
      required: true
    },
    columns: {
      /** @type {import('vue').PropType<TableColumn[]>} */
      type: Array,
      required: true
    },
    defaultSortKey: {
      type: String,
      default: ''
    },
    defaultSortOrder: {
      type: /** @type {import('vue').PropType<'asc' | 'desc'>} */ (String),
      default: 'asc'
    },
    rowKey: {
      type: String,
      default: 'id'
    },
    emptyMessage: {
      type: String,
      default: 'No records match your current filter criteria.'
    }
  },
  setup(props) {
    const sortKey = ref(props.defaultSortKey);
    /** @type {import('vue').Ref<'asc' | 'desc'>} */
    const sortOrder = ref(props.defaultSortOrder);

    /**
     * Reads a property from a TableRow by string key.
     * @param {TableRow} row
     * @param {string} key
     * @returns {any}
     */
    function getCellValue(row, key) {
      return row[key];
    }

    const sortedRows = computed(() => {
      const key = sortKey.value;
      if (!key) {
        return props.rows;
      }
      const factor = sortOrder.value === 'asc' ? 1 : -1;
      const col = props.columns.find((c) => c.key === key);

      return [...props.rows].sort((a, b) => {
        if (col?.compare) {
          return col.compare(a, b) * factor;
        }
        const valA = getCellValue(a, key);
        const valB = getCellValue(b, key);
        if (typeof valA === 'number' && typeof valB === 'number') {
          return (valA - valB) * factor;
        }
        return String(valA ?? '').localeCompare(String(valB ?? '')) * factor;
      });
    });

    /**
     * @param {TableColumn} col
     */
    function toggleSort(col) {
      if (col.sortable === false) return;
      if (sortKey.value === col.key) {
        if (sortOrder.value === 'asc') {
          sortOrder.value = 'desc';
        } else {
          sortKey.value = '';
        }
      } else {
        sortKey.value = col.key;
        sortOrder.value = 'asc';
      }
    }

    /**
     * @param {TableColumn} col
     * @returns {string}
     */
    function sortIndicator(col) {
      if (col.sortable === false) return '';
      if (sortKey.value !== col.key) return '↕';
      return sortOrder.value === 'asc' ? '↑' : '↓';
    }

    /**
     * @param {TableColumn} col
     * @returns {string}
     */
    function headerClass(col) {
      const align =
        col.align === 'right' ? 'tr' : col.align === 'center' ? 'tc' : 'tl';
      const interactive =
        col.sortable === false ? '' : 'pointer hover-white';
      return `pa3 nowrap ${align} ${interactive}`;
    }

    return {
      sortedRows,
      getCellValue,
      toggleSort,
      sortIndicator,
      headerClass
    };
  }
});
