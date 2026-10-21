// @ts-check
import { defineComponent } from 'vue';

const TEMPLATE = /* html */ `
  <div class="pa4 bg-dark-gray ba b--white-10 br3 tc">
    <h2 class="f4 near-white mt0 mb2">{{ title }}</h2>
    <p class="silver f6 mb3">
      No {{ entityType }} matches ID <code class="light-purple">{{ id }}</code>.
    </p>
    <RouterLink
      :to="backTo"
      class="link dib ph3 pv2 br2 bg-purple white b f6 dim"
    >
      {{ backLabel }}
    </RouterLink>
  </div>
`;

export const NotFoundCard = defineComponent({
  name: 'NotFoundCard',
  props: {
    title: {
      type: String,
      default: 'Record Not Found'
    },
    id: {
      type: String,
      required: true
    },
    entityType: {
      type: String,
      default: 'record'
    },
    backTo: {
      type: String,
      default: '/'
    },
    backLabel: {
      type: String,
      default: 'Return'
    }
  },
  template: TEMPLATE
});
