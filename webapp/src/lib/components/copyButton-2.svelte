<!--
SPDX-FileCopyrightText: 2024 The Forkbomb Company

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script lang="ts">
	import { Button, Toast } from 'flowbite-svelte';
	import { ClipboardDocument, CheckCircle } from 'svelte-heros-v2';
	import Icon from '$lib/components/icon.svelte';
	import type { ComponentProps } from 'svelte';
	import { fly, slide } from 'svelte/transition';
	import { m } from '$lib/i18n';

	export let textToCopy: string;
	export let delay = 5000;
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
	<slot />
	{#if !isCopied}
		<Icon src={ClipboardDocument} ml={$$slots.default} size={iconSize}></Icon>
	{:else}
		<Icon src={CheckCircle} ml={$$slots.default} size={iconSize} class="text-green-500" />
	{/if}
</Button>

<Toast
	position="bottom-right"
	divClass="flex items-center !bg-green-50 !border !border-green-500 rounded-lg w-full max-w-xs p-4 text-black shadow gap-3 absolute bottom-5 end-5"
	transition={slide}
	bind:toastStatus={isCopied}
>
	{m.curl_copied_to_clipboard()}
</Toast>
