<!--
SPDX-FileCopyrightText: 2024 The Forkbomb Company

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script lang="ts">
	import { Button } from 'flowbite-svelte';
	import { ClipboardDocument } from 'svelte-heros-v2';
	import Icon from '$lib/components/icon.svelte';
	import type { ComponentProps } from 'svelte';

	export let textToCopy: string;
	export let delay = 2000;
	export let buttonProps: ComponentProps<Button> = {};
	export let iconSize = 20;

	let isCopied = false;

	function copyText() {
		navigator.clipboard.writeText(textToCopy);
		isCopied = true;
		setTimeout(() => {
			isCopied = false;
		}, delay);
	}
</script>

<Button on:click={copyText} color="alternative" {...buttonProps}>
	{#if !isCopied}
		<slot />
		<Icon src={ClipboardDocument} ml={$$slots.default} size={iconSize}></Icon>
	{:else}
		<span class="whitespace-nowrap">✅ Copied!</span>
	{/if}
</Button>
