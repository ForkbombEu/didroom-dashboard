<!--
SPDX-FileCopyrightText: 2024 The Forkbomb Company

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script lang="ts">
	import { Button, Heading, P } from 'flowbite-svelte';
	import { m } from '$lib/i18n';
	import { z } from 'zod';
	import { Form, Input, FormError, SubmitButton, createForm } from '$lib/forms';
	import { pb } from '$lib/pocketbase';
	import { Collections } from '$lib/pocketbase/types';

	//

	export let data;
	$: ({ token } = data);

	let success = false;

	const schema = z
		.object({
			password: z.string(),
			passwordConfirm: z.string()
		})
		.refine((data) => {
			return data.password == data.passwordConfirm;
		}, m.Passwords_do_not_match());

	const superform = createForm(schema, async ({ form }) => {
		const { data } = form;
		await pb
			.collection(Collections.Users)
			.confirmPasswordReset(token, data.password, data.passwordConfirm);
		success = true;
	});
</script>

{#if !success}
	<Form {superform}>
		<div class="space-y-2">
			<Heading tag="h4">{m.Reset_password()}</Heading>
			<P>{m.Please_enter_here_a_new_password_()}</P>
		</div>

		<Input
			{superform}
			field="password"
			options={{ type: 'password', placeholder: '••••••••••', label: m.New_password() }}
		/>
		<Input
			{superform}
			field="passwordConfirm"
			options={{ type: 'password', placeholder: '••••••••••', label: m.Confirm_password() }}
		/>

		<FormError />

		<div class="flex justify-end">
			<SubmitButton>{m.Reset_password()}</SubmitButton>
		</div>
	</Form>
{:else}
	<div class="space-y-4">
		<Heading tag="h4">{m.Password_reset_successfully()}</Heading>
		<Button href="/login" class="w-full">{m.Go_to_login()}</Button>
	</div>
{/if}
