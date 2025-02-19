<!--
SPDX-FileCopyrightText: 2024 The Forkbomb Company

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script lang="ts">
	import { Heading } from 'flowbite-svelte';
	import { m } from '$lib/i18n';

	export let data;
	$: did = JSON.stringify(data.did, null, 2);
</script>

<div class="space-y-4 p-4">
	<Heading tag="h3">{m.Your_DID()}</Heading>
	<pre class="rounded-lg border border-slate-200 bg-white p-4">{did}</pre>
</div>
