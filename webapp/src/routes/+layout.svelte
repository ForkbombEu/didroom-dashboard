<!--
SPDX-FileCopyrightText: 2024 The Forkbomb Company

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script lang="ts">
	import '@fontsource-variable/inter';
	import '../app.postcss';

	import { ParaglideJS } from '@inlang/paraglide-sveltekit';
	import { i18n } from '$lib/i18n';

	import { version } from '$app/environment';
	console.info(`SAAS version: 🔖 ${version}`);
</script>

<ParaglideJS {i18n}>
	<slot />
	<script>
  (function(d,t) {
    var BASE_URL="https://chatwoot.ss.did.co.im";
    var g=d.createElement(t),s=d.getElementsByTagName(t)[0];
    g.src=BASE_URL+"/packs/js/sdk.js";
    g.defer = true;
    g.async = true;
    s.parentNode.insertBefore(g,s);
    g.onload=function(){
      window.chatwootSDK.run({
        websiteToken: 'Rr6aY328gJ5TnF9Cu2uvucQQ',
        baseUrl: BASE_URL
      })
    }
  })(document,"script");
  </script>
</ParaglideJS>
