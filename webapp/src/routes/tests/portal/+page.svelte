<!--
SPDX-FileCopyrightText: 2024 The Forkbomb Company

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script lang="ts">
	import { portal } from '$lib/components/utils/portal';
	import { log } from '$lib/utils/devLog';
	import { Input, Button } from 'flowbite-svelte';
</script>

<form
	class="space-y-2"
	action="post"
	on:submit|preventDefault={(e) => {
		log(e);
	}}
>
	<Input name="name" placeholder="name" required />
	<Input name="surname" placeholder="surname" required />
	<Button id="submit1" type="submit">Submit</Button>
	<form
		use:portal
		class="space-y-2"
		on:submit|preventDefault={(e) => {
			log(e);
		}}
	>
		<Input name="name2" placeholder="name2" required />
		<Input name="surname2" placeholder="surname2" required />
		<Button id="submit2" type="submit">Submit</Button>
	</form>
</form>
