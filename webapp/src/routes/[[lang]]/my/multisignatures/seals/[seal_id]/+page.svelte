<!--
SPDX-FileCopyrightText: 2024 The Forkbomb Company

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script lang="ts">
	import PageCard from '$lib/components/pageCard.svelte';
	import PageContent from '$lib/components/pageContent.svelte';
	import { Button } from 'flowbite-svelte';
	import { saveReflowSignature, signSeal } from './logic';
	import { getKeyringFromLocalStorage } from '$lib/keypairoom/keypair';

	export let data;
	$: ({ seal, issuer, multisignature } = data);

	async function sign() {
		try {
			const keyring = getKeyringFromLocalStorage();
			if (!keyring) return;

			const sealSignature = await signSeal(keyring, issuer, multisignature);
			await saveReflowSignature(seal.id, sealSignature);
		} catch (e) {
			console.log(e);
		}
	}
</script>

<PageContent>
	<Button on:click={sign}>Sign</Button>

	<PageCard>
		<pre>{JSON.stringify(seal, null, 2)}</pre>
		<pre>{JSON.stringify(issuer, null, 2)}</pre>
		<pre>{JSON.stringify(multisignature, null, 2)}</pre>
	</PageCard>
</PageContent>
